import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CacheService } from '../common/services/cache.service';
import {
  EnrollStudentDto,
  BulkEnrollmentDto,
  EnrollByUsernameDto,
  EnrollByEmailDto,
} from './dto/enroll-student.dto';
import {
  UpdateEnrollmentStatusDto,
  CompleteEnrollmentDto,
  DropEnrollmentDto,
  WithdrawEnrollmentDto,
  BulkStatusUpdateDto,
  TransferEnrollmentDto,
  isValidStatusTransition,
  getValidTransitions,
} from './dto/update-enrollment.dto';
import {
  EnrollmentSearchDto,
  EnrollmentAnalyticsDto,
  RosterExportDto,
  EnrollmentStatusFilter,
} from './dto/enrollment-search.dto';
import {
  EnrollmentResponseDto,
  EnrollmentCompactResponseDto,
  PaginatedEnrollmentResponseDto,
  EnrollmentStatsDto,
  ClassRosterResponseDto,
} from './dto/enrollment-response.dto';
import { User, Enrollment, EnrollmentStatus, Class, UserRole } from '@prisma/client';
import { plainToClass } from 'class-transformer';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly MAX_ENROLLMENTS_PER_STUDENT = 10;
  private readonly BULK_OPERATION_LIMIT = 100;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private cacheService: CacheService,
  ) {}

  /**
   * Enroll a student in a class
   */
  async enrollStudent(
    enrollDto: EnrollStudentDto,
    currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Enrolling student ${enrollDto.user_id} in class ${enrollDto.class_id} by user ${currentUser.id}`);

    // Validate enrollment permissions
    await this.validateEnrollmentPermissions(currentUser, enrollDto.user_id, enrollDto.class_id);

    // Check for existing enrollment
    await this.validateNoDuplicateEnrollment(enrollDto.user_id, enrollDto.class_id);

    // Validate class capacity and student limits
    await this.validateEnrollmentCapacity(enrollDto.class_id);
    await this.validateStudentEnrollmentLimit(enrollDto.user_id);

    // Get class and student details
    const [classData, student] = await Promise.all([
      this.prisma.class.findUnique({
        where: { id: enrollDto.class_id },
        include: { teacher: true, organization: true },
      }),
      this.prisma.user.findUnique({
        where: { id: enrollDto.user_id },
        include: { profile: true },
      }),
    ]);

    if (!classData) {
      throw new NotFoundException(`Class with ID "${enrollDto.class_id}" not found`);
    }

    if (!student) {
      throw new NotFoundException(`Student with ID "${enrollDto.user_id}" not found`);
    }

    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('Only students can be enrolled in classes');
    }

    if (!classData.is_active) {
      throw new BadRequestException('Cannot enroll in inactive class');
    }

    try {
      const enrollment = await this.prisma.enrollment.create({
        data: {
          user_id: enrollDto.user_id,
          class_id: enrollDto.class_id,
          enrollment_status: enrollDto.enrollment_status || EnrollmentStatus.PENDING,
        },
        include: {
          user: {
            include: { profile: true },
          },
          class: {
            include: {
              teacher: true,
              organization: true,
            },
          },
        },
      });

      // Log audit event
      await this.auditService.logAction({
        action: 'CREATE',
        entity_type: 'enrollment',
        entity_id: enrollment.id,
        actor_id: currentUser.id,
        metadata: {
          student_id: enrollDto.user_id,
          class_id: enrollDto.class_id,
          initial_status: enrollment.enrollment_status,
          enrollment_reason: enrollDto.enrollment_reason,
        },
      });

      // Clear relevant caches
      await this.clearEnrollmentCaches(enrollDto.user_id, enrollDto.class_id);

      return this.transformToResponseDto(enrollment);
    } catch (error) {
      this.logger.error(`Failed to enroll student: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to enroll student. Please try again.');
    }
  }

  /**
   * Enroll student by username
   */
  async enrollByUsername(
    enrollDto: EnrollByUsernameDto,
    currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Enrolling student by username ${enrollDto.username} by user ${currentUser.id}`);

    const student = await this.prisma.user.findUnique({
      where: { username: enrollDto.username },
    });

    if (!student) {
      throw new NotFoundException(`Student with username "${enrollDto.username}" not found`);
    }

    const enrollStudentDto: EnrollStudentDto = {
      user_id: student.id,
      class_id: enrollDto.class_id,
      enrollment_status: enrollDto.enrollment_status,
      enrollment_reason: enrollDto.enrollment_reason,
    };

    return this.enrollStudent(enrollStudentDto, currentUser);
  }

  /**
   * Enroll student by email
   */
  async enrollByEmail(
    enrollDto: EnrollByEmailDto,
    currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Enrolling student by email ${enrollDto.email} by user ${currentUser.id}`);

    const student = await this.prisma.user.findUnique({
      where: { email: enrollDto.email },
    });

    if (!student) {
      throw new NotFoundException(`Student with email "${enrollDto.email}" not found`);
    }

    const enrollStudentDto: EnrollStudentDto = {
      user_id: student.id,
      class_id: enrollDto.class_id,
      enrollment_status: enrollDto.enrollment_status,
      enrollment_reason: enrollDto.enrollment_reason,
    };

    return this.enrollStudent(enrollStudentDto, currentUser);
  }

  /**
   * Bulk enroll students
   */
  async bulkEnroll(
    bulkDto: BulkEnrollmentDto,
    currentUser: User,
  ): Promise<{ successful: EnrollmentResponseDto[]; failed: { enrollment: EnrollStudentDto; error: string }[] }> {
    this.logger.log(`Bulk enrolling ${bulkDto.enrollments.length} students by user ${currentUser.id}`);

    if (bulkDto.enrollments.length > this.BULK_OPERATION_LIMIT) {
      throw new BadRequestException(`Cannot enroll more than ${this.BULK_OPERATION_LIMIT} students at once`);
    }

    const successful: EnrollmentResponseDto[] = [];
    const failed: { enrollment: EnrollStudentDto; error: string }[] = [];

    // Process enrollments in transaction
    await this.prisma.$transaction(async (tx) => {
      for (const enrollDto of bulkDto.enrollments) {
        try {
          // Skip capacity validation if requested
          if (!bulkDto.skip_capacity_check) {
            await this.validateEnrollmentCapacity(enrollDto.class_id);
          }

          await this.validateEnrollmentPermissions(currentUser, enrollDto.user_id, enrollDto.class_id);
          await this.validateNoDuplicateEnrollment(enrollDto.user_id, enrollDto.class_id);

          const enrollment = await tx.enrollment.create({
            data: {
              user_id: enrollDto.user_id,
              class_id: enrollDto.class_id,
              enrollment_status: enrollDto.enrollment_status || EnrollmentStatus.PENDING,
            },
            include: {
              user: {
                include: { profile: true },
              },
              class: {
                include: {
                  teacher: true,
                  organization: true,
                },
              },
            },
          });

          successful.push(this.transformToResponseDto(enrollment));
        } catch (error) {
          failed.push({
            enrollment: enrollDto,
            error: error.message,
          });
        }
      }
    });

    // Log bulk audit event
    await this.auditService.logAction({
      action: 'BULK_CREATE',
      entity_type: 'enrollment',
      entity_id: 'bulk',
      actor_id: currentUser.id,
      metadata: {
        total_attempted: bulkDto.enrollments.length,
        successful_count: successful.length,
        failed_count: failed.length,
        bulk_reason: bulkDto.bulk_reason,
      },
    });

    return { successful, failed };
  }

  /**
   * Find all enrollments with filtering and pagination
   */
  async findAll(
    searchDto: EnrollmentSearchDto,
    currentUser: User,
  ): Promise<PaginatedEnrollmentResponseDto> {
    this.logger.log(`Searching enrollments for user ${currentUser.id}`);

    const cacheKey = `enrollments:search:${JSON.stringify(searchDto)}:user:${currentUser.id}`;
    const cached = await this.cacheService.get<PaginatedEnrollmentResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    // Build query conditions
    const where = await this.buildWhereConditions(searchDto, currentUser);
    const orderBy = this.buildOrderByConditions(searchDto);

    // Calculate pagination
    const skip = (searchDto.page - 1) * searchDto.limit;

    try {
      const [enrollments, total] = await Promise.all([
        this.prisma.enrollment.findMany({
          where,
          include: {
            user: searchDto.include_student
              ? {
                  include: {
                    profile: searchDto.include_profile,
                  },
                }
              : false,
            class: searchDto.include_class
              ? {
                  include: {
                    teacher: true,
                    organization: true,
                  },
                }
              : false,
          },
          orderBy,
          skip,
          take: searchDto.limit,
        }),
        this.prisma.enrollment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / searchDto.limit);
      const hasNextPage = searchDto.page < totalPages;
      const hasPrevPage = searchDto.page > 1;

      const responseEnrollments = searchDto.compact
        ? enrollments.map(enrollment => this.transformToCompactResponseDto(enrollment))
        : enrollments.map(enrollment => this.transformToResponseDto(enrollment));

      const result: PaginatedEnrollmentResponseDto = {
        enrollments: responseEnrollments as EnrollmentResponseDto[],
        total,
        page: searchDto.page,
        limit: searchDto.limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      };

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error(`Failed to search enrollments: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to search enrollments. Please try again.');
    }
  }

  /**
   * Find a single enrollment by ID
   */
  async findOne(id: string, currentUser: User): Promise<EnrollmentResponseDto> {
    this.logger.log(`Finding enrollment ${id} for user ${currentUser.id}`);

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: {
          include: { profile: true },
        },
        class: {
          include: {
            teacher: true,
            organization: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID "${id}" not found`);
    }

    // Check access permissions
    await this.validateUserCanAccessEnrollment(currentUser, enrollment);

    return this.transformToResponseDto(enrollment);
  }

  /**
   * Update enrollment status
   */
  async updateStatus(
    id: string,
    updateDto: UpdateEnrollmentStatusDto,
    currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Updating enrollment status for ${id} by user ${currentUser.id}`);

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: true,
        class: {
          include: { teacher: true },
        },
      },
    });

    if (!existingEnrollment) {
      throw new NotFoundException(`Enrollment with ID "${id}" not found`);
    }

    // Check update permissions
    await this.validateUserCanModifyEnrollment(currentUser, existingEnrollment);

    // Validate status transition
    if (!updateDto.force_transition) {
      if (!isValidStatusTransition(existingEnrollment.enrollment_status, updateDto.enrollment_status)) {
        const validTransitions = getValidTransitions(existingEnrollment.enrollment_status);
        throw new BadRequestException(
          `Invalid status transition from ${existingEnrollment.enrollment_status} to ${updateDto.enrollment_status}. Valid transitions: ${validTransitions.join(', ')}`,
        );
      }
    }

    try {
      const updatedData: any = {
        enrollment_status: updateDto.enrollment_status,
      };

      // Set completion/drop timestamps based on new status
      if (updateDto.enrollment_status === EnrollmentStatus.COMPLETED) {
        updatedData.completed_at = new Date();
      } else if (updateDto.enrollment_status === EnrollmentStatus.DROPPED) {
        updatedData.dropped_at = new Date();
      } else if (updateDto.enrollment_status === EnrollmentStatus.WITHDRAWN) {
        updatedData.dropped_at = new Date(); // Use dropped_at for withdrawn as well
      }

      const updatedEnrollment = await this.prisma.enrollment.update({
        where: { id },
        data: updatedData,
        include: {
          user: {
            include: { profile: true },
          },
          class: {
            include: {
              teacher: true,
              organization: true,
            },
          },
        },
      });

      // Log audit event
      await this.auditService.logAction({
        action: 'UPDATE',
        entity_type: 'enrollment',
        entity_id: id,
        actor_id: currentUser.id,
        before_value: { enrollment_status: existingEnrollment.enrollment_status },
        after_value: { enrollment_status: updateDto.enrollment_status },
        metadata: {
          reason: updateDto.reason,
          notes: updateDto.notes,
          force_transition: updateDto.force_transition,
        },
      });

      // Clear caches
      await this.clearEnrollmentCaches(
        existingEnrollment.user_id,
        existingEnrollment.class_id,
        id,
      );

      return this.transformToResponseDto(updatedEnrollment);
    } catch (error) {
      this.logger.error(`Failed to update enrollment status: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update enrollment status. Please try again.');
    }
  }

  /**
   * Complete enrollment with final grade
   */
  async completeEnrollment(
    id: string,
    completeDto: CompleteEnrollmentDto,
    currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Completing enrollment ${id} by user ${currentUser.id}`);

    const updateDto: UpdateEnrollmentStatusDto = {
      enrollment_status: EnrollmentStatus.COMPLETED,
      reason: 'Enrollment completed',
      notes: completeDto.completion_notes,
    };

    const enrollment = await this.updateStatus(id, updateDto, currentUser);

    // Update with final grade and completion date
    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id },
      data: {
        final_grade: completeDto.final_grade,
        completed_at: completeDto.completed_at ? new Date(completeDto.completed_at) : new Date(),
      },
      include: {
        user: {
          include: { profile: true },
        },
        class: {
          include: {
            teacher: true,
            organization: true,
          },
        },
      },
    });

    return this.transformToResponseDto(updatedEnrollment);
  }

  /**
   * Drop enrollment
   */
  async dropEnrollment(
    id: string,
    dropDto: DropEnrollmentDto,
    currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Dropping enrollment ${id} by user ${currentUser.id}`);

    const updateDto: UpdateEnrollmentStatusDto = {
      enrollment_status: EnrollmentStatus.DROPPED,
      reason: dropDto.drop_reason,
      notes: dropDto.drop_notes,
    };

    const enrollment = await this.updateStatus(id, updateDto, currentUser);

    // Update with drop date
    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id },
      data: {
        dropped_at: dropDto.dropped_at ? new Date(dropDto.dropped_at) : new Date(),
      },
      include: {
        user: {
          include: { profile: true },
        },
        class: {
          include: {
            teacher: true,
            organization: true,
          },
        },
      },
    });

    return this.transformToResponseDto(updatedEnrollment);
  }

  /**
   * Withdraw enrollment
   */
  async withdrawEnrollment(
    id: string,
    withdrawDto: WithdrawEnrollmentDto,
    currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Withdrawing enrollment ${id} by user ${currentUser.id}`);

    const updateDto: UpdateEnrollmentStatusDto = {
      enrollment_status: EnrollmentStatus.WITHDRAWN,
      reason: withdrawDto.withdrawal_reason,
      notes: withdrawDto.withdrawal_notes,
    };

    return this.updateStatus(id, updateDto, currentUser);
  }

  /**
   * Unenroll student (remove enrollment)
   */
  async unenroll(id: string, currentUser: User): Promise<{ message: string }> {
    this.logger.log(`Unenrolling student ${id} by user ${currentUser.id}`);

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: true,
        class: {
          include: { teacher: true },
        },
      },
    });

    if (!existingEnrollment) {
      throw new NotFoundException(`Enrollment with ID "${id}" not found`);
    }

    // Check delete permissions
    await this.validateUserCanModifyEnrollment(currentUser, existingEnrollment);

    // Prevent deletion of completed enrollments unless admin
    if (existingEnrollment.enrollment_status === EnrollmentStatus.COMPLETED && currentUser.role !== UserRole.ADMIN) {
      throw new BadRequestException('Cannot remove completed enrollments');
    }

    try {
      await this.prisma.enrollment.delete({
        where: { id },
      });

      // Log audit event
      await this.auditService.logAction({
        action: 'DELETE',
        entity_type: 'enrollment',
        entity_id: id,
        actor_id: currentUser.id,
        before_value: existingEnrollment,
        metadata: {
          student_id: existingEnrollment.user_id,
          class_id: existingEnrollment.class_id,
          final_status: existingEnrollment.enrollment_status,
        },
      });

      // Clear caches
      await this.clearEnrollmentCaches(
        existingEnrollment.user_id,
        existingEnrollment.class_id,
        id,
      );

      return { message: `Student successfully unenrolled from class` };
    } catch (error) {
      this.logger.error(`Failed to unenroll student: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to unenroll student. Please try again.');
    }
  }

  /**
   * Get class roster
   */
  async getClassRoster(classId: string, currentUser: User): Promise<ClassRosterResponseDto> {
    this.logger.log(`Getting roster for class ${classId} by user ${currentUser.id}`);

    // Validate class access
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: true,
        organization: true,
      },
    });

    if (!classData) {
      throw new NotFoundException(`Class with ID "${classId}" not found`);
    }

    // Check access permissions
    await this.validateUserCanAccessClass(currentUser, classData);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { class_id: classId },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: [
        { enrollment_status: 'asc' },
        { user: { last_name: 'asc' } },
        { user: { first_name: 'asc' } },
      ],
    });

    const transformedEnrollments = enrollments.map(enrollment => this.transformToResponseDto({
      ...enrollment,
      class: classData,
    }));

    const statistics = this.calculateEnrollmentStats(enrollments);

    const activeCount = enrollments.filter(e => 
      e.enrollment_status === EnrollmentStatus.ACTIVE || 
      e.enrollment_status === EnrollmentStatus.PENDING
    ).length;

    return {
      class: {
        id: classData.id,
        name: classData.name,
        subject: classData.subject,
        grade_level: classData.grade_level,
        academic_year: classData.academic_year,
        term: classData.term,
        teacher_name: `${classData.teacher.first_name || ''} ${classData.teacher.last_name || ''}`.trim() || 
                      classData.teacher.username || 'Unknown Teacher',
        organization_name: classData.organization.name,
      },
      total_enrolled: enrollments.length,
      active_students: activeCount,
      class_capacity: classData.max_students,
      available_spots: Math.max(0, classData.max_students - activeCount),
      enrollment_percentage: classData.max_students > 0 ? (activeCount / classData.max_students) * 100 : 0,
      enrollments: transformedEnrollments,
      statistics,
    };
  }

  // Private helper methods

  private async validateEnrollmentPermissions(
    currentUser: User,
    studentId: string,
    classId: string,
  ): Promise<void> {
    // Admins can enroll anyone
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    // Teachers can enroll students in their own classes
    if (currentUser.role === UserRole.TEACHER) {
      const classData = await this.prisma.class.findUnique({
        where: { id: classId },
      });

      if (!classData) {
        throw new NotFoundException(`Class with ID "${classId}" not found`);
      }

      if (classData.teacher_id === currentUser.id) {
        return;
      }
    }

    // Students can only enroll themselves
    if (currentUser.role === UserRole.STUDENT) {
      if (currentUser.id === studentId) {
        return;
      }
    }

    throw new ForbiddenException('You do not have permission to enroll this student');
  }

  private async validateNoDuplicateEnrollment(studentId: string, classId: string): Promise<void> {
    const existing = await this.prisma.enrollment.findUnique({
      where: {
        user_id_class_id: {
          user_id: studentId,
          class_id: classId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Student is already enrolled in this class');
    }
  }

  private async validateEnrollmentCapacity(classId: string): Promise<void> {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          where: {
            enrollment_status: {
              in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING],
            },
          },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException(`Class with ID "${classId}" not found`);
    }

    const currentEnrollment = classData.enrollments.length;
    if (currentEnrollment >= classData.max_students) {
      throw new BadRequestException(
        `Class is at full capacity (${currentEnrollment}/${classData.max_students})`,
      );
    }
  }

  private async validateStudentEnrollmentLimit(studentId: string): Promise<void> {
    const enrollmentCount = await this.prisma.enrollment.count({
      where: {
        user_id: studentId,
        enrollment_status: {
          in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING],
        },
      },
    });

    if (enrollmentCount >= this.MAX_ENROLLMENTS_PER_STUDENT) {
      throw new BadRequestException(
        `Student has reached maximum enrollment limit (${this.MAX_ENROLLMENTS_PER_STUDENT})`,
      );
    }
  }

  private async validateUserCanAccessEnrollment(currentUser: User, enrollment: any): Promise<void> {
    switch (currentUser.role) {
      case UserRole.ADMIN:
        return; // Admins can access all enrollments

      case UserRole.TEACHER:
        // Teachers can access enrollments in their classes
        if (enrollment.class.teacher_id === currentUser.id) {
          return;
        }
        break;

      case UserRole.STUDENT:
        // Students can access their own enrollments
        if (enrollment.user_id === currentUser.id) {
          return;
        }
        break;
    }

    throw new ForbiddenException('You do not have permission to access this enrollment');
  }

  private async validateUserCanModifyEnrollment(currentUser: User, enrollment: any): Promise<void> {
    if (currentUser.role === UserRole.ADMIN) {
      return; // Admins can modify all enrollments
    }

    if (currentUser.role === UserRole.TEACHER && enrollment.class.teacher_id === currentUser.id) {
      return; // Teachers can modify enrollments in their classes
    }

    throw new ForbiddenException('You do not have permission to modify this enrollment');
  }

  private async validateUserCanAccessClass(currentUser: User, classData: any): Promise<void> {
    switch (currentUser.role) {
      case UserRole.ADMIN:
        return; // Admins can access all classes

      case UserRole.TEACHER:
        if (classData.teacher_id === currentUser.id) {
          return; // Teachers can access their own classes
        }
        break;
    }

    throw new ForbiddenException('You do not have permission to access this class');
  }

  private async buildWhereConditions(searchDto: EnrollmentSearchDto, currentUser: User): Promise<any> {
    const where: any = {};

    // Role-based filtering
    switch (currentUser.role) {
      case UserRole.ADMIN:
        // Admins can see all enrollments
        break;
      case UserRole.TEACHER:
        // Teachers see enrollments in their classes by default
        if (!searchDto.class_id && !searchDto.organization_id) {
          where.class = {
            teacher_id: currentUser.id,
          };
        }
        break;
      case UserRole.STUDENT:
        // Students see only their own enrollments
        where.user_id = currentUser.id;
        break;
    }

    // Apply search filters
    if (searchDto.search) {
      where.OR = [
        { user: { first_name: { contains: searchDto.search, mode: 'insensitive' } } },
        { user: { last_name: { contains: searchDto.search, mode: 'insensitive' } } },
        { user: { username: { contains: searchDto.search, mode: 'insensitive' } } },
        { user: { email: { contains: searchDto.search, mode: 'insensitive' } } },
        { class: { name: { contains: searchDto.search, mode: 'insensitive' } } },
      ];
    }

    if (searchDto.class_id) {
      where.class_id = searchDto.class_id;
    }

    if (searchDto.user_id) {
      where.user_id = searchDto.user_id;
    }

    if (searchDto.teacher_id) {
      where.class = { teacher_id: searchDto.teacher_id };
    }

    if (searchDto.organization_id) {
      where.class = { organization_id: searchDto.organization_id };
    }

    if (searchDto.enrollment_status) {
      where.enrollment_status = searchDto.enrollment_status;
    }

    // Status filter mapping
    if (searchDto.status_filter) {
      switch (searchDto.status_filter) {
        case EnrollmentStatusFilter.ACTIVE:
          where.enrollment_status = EnrollmentStatus.ACTIVE;
          break;
        case EnrollmentStatusFilter.INACTIVE:
          where.enrollment_status = {
            in: [EnrollmentStatus.DROPPED, EnrollmentStatus.WITHDRAWN],
          };
          break;
        case EnrollmentStatusFilter.COMPLETED:
          where.enrollment_status = EnrollmentStatus.COMPLETED;
          break;
        case EnrollmentStatusFilter.IN_PROGRESS:
          where.enrollment_status = {
            in: [EnrollmentStatus.PENDING, EnrollmentStatus.ACTIVE],
          };
          break;
        case EnrollmentStatusFilter.DROPPED_WITHDRAWN:
          where.enrollment_status = {
            in: [EnrollmentStatus.DROPPED, EnrollmentStatus.WITHDRAWN],
          };
          break;
      }
    }

    // Date range filters
    if (searchDto.enrolled_from || searchDto.enrolled_to) {
      where.enrolled_at = {};
      if (searchDto.enrolled_from) {
        where.enrolled_at.gte = new Date(searchDto.enrolled_from);
      }
      if (searchDto.enrolled_to) {
        where.enrolled_at.lte = new Date(searchDto.enrolled_to);
      }
    }

    if (searchDto.completed_from || searchDto.completed_to) {
      where.completed_at = {};
      if (searchDto.completed_from) {
        where.completed_at.gte = new Date(searchDto.completed_from);
      }
      if (searchDto.completed_to) {
        where.completed_at.lte = new Date(searchDto.completed_to);
      }
    }

    // Class-related filters
    if (searchDto.subject || searchDto.grade_level || searchDto.academic_year || searchDto.term) {
      if (!where.class) {
        where.class = {};
      }
      
      if (searchDto.subject) {
        where.class.subject = searchDto.subject;
      }
      if (searchDto.grade_level) {
        where.class.grade_level = searchDto.grade_level;
      }
      if (searchDto.academic_year) {
        where.class.academic_year = searchDto.academic_year;
      }
      if (searchDto.term) {
        where.class.term = searchDto.term;
      }
    }

    if (searchDto.profile_completed_only) {
      where.user = {
        profile: {
          is_completed: true,
        },
      };
    }

    return where;
  }

  private buildOrderByConditions(searchDto: EnrollmentSearchDto): any {
    const orderBy: any = {};

    switch (searchDto.sort_by) {
      case 'enrolled_at':
        orderBy.enrolled_at = searchDto.sort_order;
        break;
      case 'updated_at':
        orderBy.updated_at = searchDto.sort_order;
        break;
      case 'enrollment_status':
        orderBy.enrollment_status = searchDto.sort_order;
        break;
      case 'final_grade':
        orderBy.final_grade = searchDto.sort_order;
        break;
      case 'student_name':
        orderBy.user = { last_name: searchDto.sort_order };
        break;
      case 'class_name':
        orderBy.class = { name: searchDto.sort_order };
        break;
      default:
        orderBy.enrolled_at = 'desc';
    }

    return orderBy;
  }

  private transformToResponseDto(enrollment: any): EnrollmentResponseDto {
    const daysEnrolled = this.calculateDaysEnrolled(enrollment.enrolled_at, enrollment.completed_at || enrollment.dropped_at);
    
    return {
      id: enrollment.id,
      enrollment_status: enrollment.enrollment_status,
      enrolled_at: enrollment.enrolled_at,
      completed_at: enrollment.completed_at,
      dropped_at: enrollment.dropped_at,
      final_grade: enrollment.final_grade,
      created_at: enrollment.created_at,
      updated_at: enrollment.updated_at,
      user_id: enrollment.user_id,
      class_id: enrollment.class_id,
      student: {
        id: enrollment.user.id,
        first_name: enrollment.user.first_name,
        last_name: enrollment.user.last_name,
        username: enrollment.user.username,
        email: enrollment.user.email,
        avatar_url: enrollment.user.avatar_url,
        display_name: `${enrollment.user.first_name || ''} ${enrollment.user.last_name || ''}`.trim() || 
                      enrollment.user.username || 'Unknown Student',
        profile_completed: enrollment.user.profile?.is_completed || false,
      },
      class: {
        id: enrollment.class.id,
        name: enrollment.class.name,
        subject: enrollment.class.subject,
        grade_level: enrollment.class.grade_level,
        academic_year: enrollment.class.academic_year,
        term: enrollment.class.term,
        teacher_name: enrollment.class.teacher ? 
          `${enrollment.class.teacher.first_name || ''} ${enrollment.class.teacher.last_name || ''}`.trim() || 
          enrollment.class.teacher.username || 'Unknown Teacher' : 'Unknown Teacher',
        organization_name: enrollment.class.organization?.name || 'Unknown Organization',
      },
      days_enrolled: daysEnrolled,
      is_active: [EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING].includes(enrollment.enrollment_status),
      status_display: this.getStatusDisplay(enrollment.enrollment_status),
      progress_percentage: this.calculateProgressPercentage(enrollment),
    };
  }

  private transformToCompactResponseDto(enrollment: any): EnrollmentCompactResponseDto {
    const daysEnrolled = this.calculateDaysEnrolled(enrollment.enrolled_at, enrollment.completed_at || enrollment.dropped_at);
    
    return {
      id: enrollment.id,
      student_name: `${enrollment.user.first_name || ''} ${enrollment.user.last_name || ''}`.trim() || 
                    enrollment.user.username || 'Unknown Student',
      class_name: enrollment.class.name,
      enrollment_status: enrollment.enrollment_status,
      enrolled_date: enrollment.enrolled_at.toISOString().split('T')[0],
      final_grade: enrollment.final_grade,
      days_enrolled: daysEnrolled,
      status_display: this.getStatusDisplay(enrollment.enrollment_status),
    };
  }

  private calculateDaysEnrolled(enrolledAt: Date, endDate?: Date): number {
    const end = endDate || new Date();
    const start = enrolledAt;
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  }

  private getStatusDisplay(status: EnrollmentStatus): string {
    const statusMap = {
      [EnrollmentStatus.PENDING]: 'Enrollment Pending',
      [EnrollmentStatus.ACTIVE]: 'Actively Enrolled',
      [EnrollmentStatus.COMPLETED]: 'Completed',
      [EnrollmentStatus.DROPPED]: 'Dropped',
      [EnrollmentStatus.WITHDRAWN]: 'Withdrawn',
    };

    return statusMap[status] || status;
  }

  private calculateProgressPercentage(enrollment: any): number | undefined {
    if (enrollment.enrollment_status !== EnrollmentStatus.ACTIVE) {
      return undefined;
    }

    // Simple progress calculation based on days enrolled vs typical semester length
    const daysEnrolled = this.calculateDaysEnrolled(enrollment.enrolled_at);
    const typicalSemesterDays = 120; // Approximately 4 months
    
    return Math.min(100, (daysEnrolled / typicalSemesterDays) * 100);
  }

  private calculateEnrollmentStats(enrollments: any[]): EnrollmentStatsDto {
    const statusCounts = {
      [EnrollmentStatus.PENDING]: 0,
      [EnrollmentStatus.ACTIVE]: 0,
      [EnrollmentStatus.COMPLETED]: 0,
      [EnrollmentStatus.DROPPED]: 0,
      [EnrollmentStatus.WITHDRAWN]: 0,
    };

    let totalDuration = 0;
    let completedEnrollments = 0;
    let droppedEnrollments = 0;

    enrollments.forEach(enrollment => {
      statusCounts[enrollment.enrollment_status]++;
      
      if (enrollment.enrollment_status === EnrollmentStatus.COMPLETED) {
        completedEnrollments++;
        if (enrollment.completed_at) {
          totalDuration += this.calculateDaysEnrolled(enrollment.enrolled_at, enrollment.completed_at);
        }
      } else if (enrollment.enrollment_status === EnrollmentStatus.DROPPED || 
                 enrollment.enrollment_status === EnrollmentStatus.WITHDRAWN) {
        droppedEnrollments++;
      }
    });

    const totalEnrollments = enrollments.length;
    const averageDuration = completedEnrollments > 0 ? totalDuration / completedEnrollments : 0;
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    const dropRate = totalEnrollments > 0 ? (droppedEnrollments / totalEnrollments) * 100 : 0;

    return {
      total_enrollments: totalEnrollments,
      active_enrollments: statusCounts[EnrollmentStatus.ACTIVE],
      pending_enrollments: statusCounts[EnrollmentStatus.PENDING],
      completed_enrollments: statusCounts[EnrollmentStatus.COMPLETED],
      dropped_enrollments: statusCounts[EnrollmentStatus.DROPPED],
      withdrawn_enrollments: statusCounts[EnrollmentStatus.WITHDRAWN],
      status_breakdown: statusCounts,
      average_duration_days: Math.round(averageDuration * 100) / 100,
      completion_rate: Math.round(completionRate * 100) / 100,
      drop_rate: Math.round(dropRate * 100) / 100,
    };
  }

  private async clearEnrollmentCaches(studentId: string, classId: string, enrollmentId?: string): Promise<void> {
    const patterns = [
      `enrollments:search:*`,
      `enrollments:student:${studentId}:*`,
      `enrollments:class:${classId}:*`,
      `class:${classId}:roster:*`,
    ];

    if (enrollmentId) {
      patterns.push(`enrollment:${enrollmentId}:*`);
    }

    await Promise.all(patterns.map(pattern => this.cacheService.deletePattern(pattern)));
  }

  /**
   * Get enrollment analytics and statistics
   */
  async getEnrollmentAnalytics(
    analyticsDto: any,
    currentUser: User,
  ): Promise<any> {
    try {
      const { 
        organization_id, 
        class_id, 
        teacher_id, 
        academic_year, 
        term, 
        include_status_breakdown, 
        include_grade_distribution, 
        include_trends 
      } = analyticsDto;

      // Build where clause based on filters and user permissions
      const where: any = {};
      
      if (class_id) where.class_id = class_id;
      if (organization_id) {
        where.class = { organization_id };
      }
      if (teacher_id) {
        where.class = { ...where.class, teacher_id };
      }
      if (academic_year) {
        where.class = { ...where.class, academic_year };
      }
      if (term) {
        where.class = { ...where.class, term };
      }

      // Apply role-based filtering
      if (currentUser.role === 'TEACHER') {
        where.class = { ...where.class, teacher_id: currentUser.id };
      }

      // Get basic enrollment statistics
      const [
        totalEnrollments,
        enrollmentsByStatus,
        recentEnrollments,
        completedEnrollments,
        enrollmentsWithDetails
      ] = await Promise.all([
        this.prisma.enrollment.count({ where }),
        include_status_breakdown ? this.prisma.enrollment.groupBy({
          by: ['enrollment_status'],
          where,
          _count: { enrollment_status: true },
        }) : Promise.resolve([]),
        this.prisma.enrollment.count({
          where: {
            ...where,
            enrolled_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        }),
        this.prisma.enrollment.count({
          where: { ...where, enrollment_status: 'COMPLETED' }
        }),
        this.prisma.enrollment.findMany({
          where,
          include: {
            user: true,
            class: {
              include: { organization: true, teacher: true }
            }
          },
          take: 1000 // Limit for performance
        })
      ]);

      // Calculate completion rate
      const completionRate = totalEnrollments > 0 
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

      const analytics = {
        overview: {
          totalEnrollments,
          recentEnrollments,
          completedEnrollments,
          completionRate,
          averageClassSize: enrollmentsWithDetails.length > 0 
            ? Math.round(totalEnrollments / new Set(enrollmentsWithDetails.map(e => e.class_id)).size)
            : 0
        },
        breakdowns: {
          ...(include_status_breakdown && { byStatus: enrollmentsByStatus })
        },
        metadata: {
          generatedAt: new Date(),
          filters: { organization_id, class_id, teacher_id, academic_year, term },
          userRole: currentUser.role
        }
      };

      this.logger.log(`Generated enrollment analytics for user ${currentUser.id}`);
      return analytics;

    } catch (error) {
      this.logger.error(`Failed to generate enrollment analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Export class roster in various formats
   */
  async exportClassRoster(
    classId: string,
    exportDto: any,
    currentUser: User,
  ): Promise<any> {
    try {
      const { export_format = 'CSV', include_contact_info = false, include_grades = false } = exportDto;

      // Get class and validate permissions
      const classData = await this.prisma.class.findUnique({
        where: { id: classId },
        include: {
          teacher: true,
          organization: true,
          enrollments: {
            include: {
              user: true
            },
            orderBy: { user: { last_name: 'asc' } }
          }
        }
      });

      if (!classData) {
        throw new NotFoundException(`Class with ID "${classId}" not found`);
      }

      // Validate user can export this roster
      if (currentUser.role === 'TEACHER' && classData.teacher_id !== currentUser.id) {
        throw new ForbiddenException('You can only export rosters for your own classes');
      }

      // Prepare roster data
      const rosterData = classData.enrollments.map(enrollment => {
        const user = enrollment.user;
        return {
          student_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          enrollment_status: enrollment.enrollment_status,
          enrolled_at: enrollment.enrolled_at.toISOString().split('T')[0],
          ...(include_contact_info && { email: user.email }),
          ...(include_grades && enrollment.final_grade && { final_grade: enrollment.final_grade })
        };
      });

      const exportData = {
        class: {
          id: classData.id,
          name: classData.name,
          teacher: `${classData.teacher.first_name} ${classData.teacher.last_name}`,
          organization: classData.organization.name,
          academic_year: classData.academic_year,
          term: classData.term
        },
        roster: rosterData,
        summary: {
          total_students: rosterData.length,
          active_enrollments: rosterData.filter(r => r.enrollment_status === 'ACTIVE').length,
          pending_enrollments: rosterData.filter(r => r.enrollment_status === 'PENDING').length,
          completed_enrollments: rosterData.filter(r => r.enrollment_status === 'COMPLETED').length,
          export_format,
          exported_at: new Date(),
          exported_by: `${currentUser.first_name} ${currentUser.last_name}`
        }
      };

      // Log audit event
      await this.auditService.logAction({
        action: 'EXPORT',
        entity_type: 'class_roster',
        entity_id: classId,
        actor_id: currentUser.id,
        metadata: {
          export_format,
          include_contact_info,
          include_grades,
          student_count: rosterData.length
        },
      });

      this.logger.log(`Exported roster for class ${classId} by user ${currentUser.id}`);
      return exportData;

    } catch (error) {
      this.logger.error(`Failed to export class roster: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk update enrollment status
   */
  async bulkUpdateStatus(
    bulkUpdateDto: any,
    currentUser: User,
  ): Promise<any> {
    try {
      const { enrollment_ids, new_status, status_change_reason } = bulkUpdateDto;

      if (!enrollment_ids || enrollment_ids.length === 0) {
        throw new BadRequestException('Enrollment IDs array cannot be empty');
      }

      if (enrollment_ids.length > 100) {
        throw new BadRequestException('Cannot update more than 100 enrollments at once');
      }

      // Get enrollments and validate permissions
      const enrollments = await this.prisma.enrollment.findMany({
        where: { id: { in: enrollment_ids } },
        include: {
          user: true,
          class: { include: { teacher: true } }
        }
      });

      if (enrollments.length !== enrollment_ids.length) {
        throw new NotFoundException('Some enrollments were not found');
      }

      // Validate user permissions for all enrollments
      for (const enrollment of enrollments) {
        if (currentUser.role === 'TEACHER' && enrollment.class.teacher_id !== currentUser.id) {
          throw new ForbiddenException('You can only update enrollments in your own classes');
        }
      }

      const results = [];
      const now = new Date();

      // Process each enrollment
      for (const enrollment of enrollments) {
        try {
          // Validate status transition
          await this.validateStatusTransition(enrollment.enrollment_status, new_status);

          const updateData: any = {
            enrollment_status: new_status,
            updated_at: now
          };

          // Set completion/drop dates based on status
          if (new_status === 'COMPLETED') {
            updateData.completed_at = now;
          } else if (new_status === 'DROPPED' || new_status === 'WITHDRAWN') {
            updateData.dropped_at = now;
          }

          const updated = await this.prisma.enrollment.update({
            where: { id: enrollment.id },
            data: updateData
          });

          // Log audit event
          await this.auditService.logAction({
            action: 'BULK_STATUS_UPDATE',
            entity_type: 'enrollment',
            entity_id: enrollment.id,
            actor_id: currentUser.id,
            metadata: {
              student_name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
              class_name: enrollment.class.name,
              previous_status: enrollment.enrollment_status,
              new_status,
              reason: status_change_reason
            },
          });

          results.push({
            enrollment_id: enrollment.id,
            student_name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
            class_name: enrollment.class.name,
            status: 'success',
            previous_status: enrollment.enrollment_status,
            new_status
          });

        } catch (error) {
          results.push({
            enrollment_id: enrollment.id,
            student_name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
            class_name: enrollment.class.name,
            status: 'failed',
            error: error.message
          });
        }
      }

      const summary = {
        total_requested: enrollment_ids.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        new_status,
        reason: status_change_reason,
        results
      };

      this.logger.log(`Completed bulk status update to ${new_status} on ${summary.successful}/${summary.total_requested} enrollments by user ${currentUser.id}`);
      return summary;

    } catch (error) {
      this.logger.error(`Bulk status update failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Transfer enrollment to another class
   */
  async transferEnrollment(
    transferDto: any,
    currentUser: User,
  ): Promise<any> {
    try {
      const { enrollment_id, target_class_id, transfer_reason } = transferDto;

      // Get source enrollment
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { id: enrollment_id },
        include: {
          user: true,
          class: { include: { teacher: true, organization: true } }
        }
      });

      if (!enrollment) {
        throw new NotFoundException(`Enrollment with ID "${enrollment_id}" not found`);
      }

      // Get target class
      const targetClass = await this.prisma.class.findUnique({
        where: { id: target_class_id },
        include: {
          teacher: true,
          organization: true,
          _count: { select: { enrollments: true } }
        }
      });

      if (!targetClass) {
        throw new NotFoundException(`Target class with ID "${target_class_id}" not found`);
      }

      // Validate permissions
      if (currentUser.role === 'TEACHER') {
        if (enrollment.class.teacher_id !== currentUser.id && targetClass.teacher_id !== currentUser.id) {
          throw new ForbiddenException('You can only transfer enrollments between your own classes');
        }
      }

      // Validate target class has capacity
      if (targetClass._count.enrollments >= targetClass.max_students) {
        throw new BadRequestException('Target class is at full capacity');
      }

      // Check for existing enrollment in target class
      const existingEnrollment = await this.prisma.enrollment.findUnique({
        where: {
          user_id_class_id: {
            user_id: enrollment.user_id,
            class_id: target_class_id
          }
        }
      });

      if (existingEnrollment) {
        throw new ConflictException('Student is already enrolled in the target class');
      }

      // Perform transfer as transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create new enrollment in target class
        const newEnrollment = await tx.enrollment.create({
          data: {
            user_id: enrollment.user_id,
            class_id: target_class_id,
            enrollment_status: 'PENDING'
          }
        });

        // Archive old enrollment
        const archivedEnrollment = await tx.enrollment.update({
          where: { id: enrollment_id },
          data: {
            enrollment_status: 'WITHDRAWN',
            dropped_at: new Date()
          }
        });

        return { newEnrollment, archivedEnrollment };
      });

      // Log audit events
      await Promise.all([
        this.auditService.logAction({
          action: 'TRANSFER_OUT',
          entity_type: 'enrollment',
          entity_id: enrollment_id,
          actor_id: currentUser.id,
          metadata: {
            student_name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
            source_class: enrollment.class.name,
            target_class: targetClass.name,
            reason: transfer_reason
          },
        }),
        this.auditService.logAction({
          action: 'TRANSFER_IN',
          entity_type: 'enrollment',
          entity_id: result.newEnrollment.id,
          actor_id: currentUser.id,
          metadata: {
            student_name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
            source_class: enrollment.class.name,
            target_class: targetClass.name,
            reason: transfer_reason
          },
        })
      ]);

      const transferResult = {
        success: true,
        transfer_id: `transfer_${Date.now()}`,
        student: {
          id: enrollment.user.id,
          name: `${enrollment.user.first_name} ${enrollment.user.last_name}`
        },
        source_class: {
          id: enrollment.class.id,
          name: enrollment.class.name
        },
        target_class: {
          id: targetClass.id,
          name: targetClass.name
        },
        new_enrollment_id: result.newEnrollment.id,
        archived_enrollment_id: enrollment_id,
        transfer_reason,
        transferred_at: new Date(),
        transferred_by: `${currentUser.first_name} ${currentUser.last_name}`
      };

      this.logger.log(`Transferred enrollment ${enrollment_id} to class ${target_class_id} by user ${currentUser.id}`);
      return transferResult;

    } catch (error) {
      this.logger.error(`Failed to transfer enrollment: ${error.message}`, error.stack);
      throw error;
    }
  }
}
