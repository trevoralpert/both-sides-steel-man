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
import { CreateClassDto, BulkCreateClassDto } from './dto/create-class.dto';
import {
  UpdateClassDto,
  BulkUpdateClassDto,
  UpdateClassStatusDto,
  UpdateClassCapacityDto,
} from './dto/update-class.dto';
import {
  ClassSearchDto,
  BulkClassActionDto,
  ClassAnalyticsDto,
  EnrollmentFilter,
} from './dto/class-search.dto';
import {
  ClassResponseDto,
  ClassCompactResponseDto,
  PaginatedClassResponseDto,
  ClassEnrollmentSummaryDto,
} from './dto/class-response.dto';
import { User, Class, Organization, Enrollment, EnrollmentStatus } from '@prisma/client';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly MAX_CLASSES_PER_TEACHER = 20;
  private readonly MIN_ENROLLMENT_THRESHOLD = 0.3; // 30% for low enrollment

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private cacheService: CacheService,
  ) {}

  /**
   * Create a new class
   */
  async create(
    createClassDto: CreateClassDto,
    currentUser: User,
  ): Promise<ClassResponseDto> {
    this.logger.log(`Creating new class: ${createClassDto.name} by user ${currentUser.id}`);

    // Validate teacher permissions
    await this.validateTeacherCanCreateClass(currentUser, createClassDto.organization_id);

    // Check class name uniqueness within organization
    await this.validateClassNameUniqueness(
      createClassDto.name,
      createClassDto.organization_id,
      createClassDto.academic_year,
    );

    // Validate academic year format and future dates
    this.validateAcademicYear(createClassDto.academic_year);

    try {
      const classData = await this.prisma.class.create({
        data: {
          name: createClassDto.name,
          description: createClassDto.description,
          subject: createClassDto.subject,
          grade_level: createClassDto.grade_level,
          academic_year: createClassDto.academic_year,
          term: createClassDto.term,
          max_students: createClassDto.max_students,
          is_active: createClassDto.is_active ?? true,
          organization_id: createClassDto.organization_id,
          teacher_id: currentUser.id,
        },
        include: {
          teacher: true,
          organization: true,
          enrollments: {
            include: {
              user: true,
            },
          },
        },
      });

      // Log audit event
      await this.auditService.logAction({
        action: 'CREATE',
        entity_type: 'class',
        entity_id: classData.id,
        actor_id: currentUser.id,
        metadata: {
          class_name: classData.name,
          organization_id: classData.organization_id,
          academic_year: classData.academic_year,
          max_students: classData.max_students,
        },
      });

      // Clear relevant caches
      await this.clearClassCaches(classData.teacher_id, classData.organization_id);

      return this.transformToResponseDto(classData);
    } catch (error) {
      this.logger.error(`Failed to create class: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create class. Please try again.');
    }
  }

  /**
   * Bulk create classes
   */
  async bulkCreate(
    bulkCreateDto: BulkCreateClassDto,
    currentUser: User,
  ): Promise<ClassResponseDto[]> {
    this.logger.log(`Bulk creating ${bulkCreateDto.classes.length} classes by user ${currentUser.id}`);

    if (bulkCreateDto.classes.length > 50) {
      throw new BadRequestException('Cannot create more than 50 classes at once');
    }

    const results: ClassResponseDto[] = [];
    const errors: string[] = [];

    // Use transaction for bulk operations
    await this.prisma.$transaction(async (tx) => {
      for (const classDto of bulkCreateDto.classes) {
        try {
          // Validate each class
          await this.validateTeacherCanCreateClass(currentUser, classDto.organization_id);
          await this.validateClassNameUniqueness(
            classDto.name,
            classDto.organization_id,
            classDto.academic_year,
          );

          const classData = await tx.class.create({
            data: {
              name: classDto.name,
              description: classDto.description,
              subject: classDto.subject,
              grade_level: classDto.grade_level,
              academic_year: classDto.academic_year,
              term: classDto.term,
              max_students: classDto.max_students,
              is_active: classDto.is_active ?? true,
              organization_id: classDto.organization_id,
              teacher_id: currentUser.id,
            },
            include: {
              teacher: true,
              organization: true,
              enrollments: true,
            },
          });

          results.push(this.transformToResponseDto(classData));
        } catch (error) {
          errors.push(`Failed to create class "${classDto.name}": ${error.message}`);
        }
      }
    });

    if (errors.length > 0 && results.length === 0) {
      throw new BadRequestException(`All classes failed to create: ${errors.join('; ')}`);
    }

    // Log bulk audit event
    await this.auditService.logAction({
      action: 'BULK_CREATE',
      entity_type: 'class',
      entity_id: 'bulk',
      actor_id: currentUser.id,
      metadata: {
        created_count: results.length,
        error_count: errors.length,
        errors: errors.slice(0, 5), // Limit error details
      },
    });

    return results;
  }

  /**
   * Find all classes with filtering and pagination
   */
  async findAll(
    searchDto: ClassSearchDto,
    currentUser: User,
  ): Promise<PaginatedClassResponseDto> {
    this.logger.log(`Searching classes with filters: ${JSON.stringify(searchDto)}`);

    const cacheKey = `classes:search:${JSON.stringify(searchDto)}:user:${currentUser.id}`;
    const cached = await this.cacheService.get<PaginatedClassResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    // Build query conditions
    const where = await this.buildWhereConditions(searchDto, currentUser);
    const orderBy = this.buildOrderByConditions(searchDto);

    // Calculate pagination
    const skip = (searchDto.page - 1) * searchDto.limit;

    try {
      const [classes, total] = await Promise.all([
        this.prisma.class.findMany({
          where,
          include: {
            teacher: searchDto.include_teacher,
            organization: searchDto.include_organization,
            enrollments: searchDto.include_enrollment
              ? {
                  include: {
                    user: true,
                  },
                }
              : false,
          },
          orderBy,
          skip,
          take: searchDto.limit,
        }),
        this.prisma.class.count({ where }),
      ]);

      const totalPages = Math.ceil(total / searchDto.limit);
      const hasNextPage = searchDto.page < totalPages;
      const hasPrevPage = searchDto.page > 1;

      const responseClasses = searchDto.compact
        ? classes.map(cls => this.transformToCompactResponseDto(cls))
        : classes.map(cls => this.transformToResponseDto(cls));

      const result: PaginatedClassResponseDto = {
        classes: responseClasses as ClassResponseDto[],
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
      this.logger.error(`Failed to search classes: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to search classes. Please try again.');
    }
  }

  /**
   * Find a single class by ID
   */
  async findOne(id: string, currentUser: User): Promise<ClassResponseDto> {
    this.logger.log(`Finding class ${id} for user ${currentUser.id}`);

    const cacheKey = `class:${id}:user:${currentUser.id}`;
    const cached = await this.cacheService.get<ClassResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const classData = await this.prisma.class.findUnique({
      where: { id },
      include: {
        teacher: true,
        organization: true,
        enrollments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    // Check access permissions
    await this.validateUserCanAccessClass(currentUser, classData);

    const result = this.transformToResponseDto(classData);

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Update a class
   */
  async update(
    id: string,
    updateClassDto: UpdateClassDto,
    currentUser: User,
  ): Promise<ClassResponseDto> {
    this.logger.log(`Updating class ${id} by user ${currentUser.id}`);

    const existingClass = await this.prisma.class.findUnique({
      where: { id },
      include: {
        teacher: true,
        organization: true,
        enrollments: true,
      },
    });

    if (!existingClass) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    // Check update permissions
    await this.validateUserCanModifyClass(currentUser, existingClass);

    // Validate name uniqueness if changing name
    if (updateClassDto.name && updateClassDto.name !== existingClass.name) {
      await this.validateClassNameUniqueness(
        updateClassDto.name,
        existingClass.organization_id,
        updateClassDto.academic_year || existingClass.academic_year,
        id,
      );
    }

    // Validate capacity changes
    if (updateClassDto.max_students && updateClassDto.max_students < existingClass.enrollments.length) {
      throw new BadRequestException(
        `Cannot reduce capacity to ${updateClassDto.max_students}. Current enrollment is ${existingClass.enrollments.length}`,
      );
    }

    try {
      const updatedClass = await this.prisma.class.update({
        where: { id },
        data: updateClassDto,
        include: {
          teacher: true,
          organization: true,
          enrollments: {
            include: {
              user: true,
            },
          },
        },
      });

      // Log audit event
      await this.auditService.logAction({
        action: 'UPDATE',
        entity_type: 'class',
        entity_id: id,
        actor_id: currentUser.id,
        before_value: existingClass,
        after_value: updatedClass,
        metadata: {
          changes: Object.keys(updateClassDto),
        },
      });

      // Clear caches
      await this.clearClassCaches(updatedClass.teacher_id, updatedClass.organization_id, id);

      return this.transformToResponseDto(updatedClass);
    } catch (error) {
      this.logger.error(`Failed to update class ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update class. Please try again.');
    }
  }

  /**
   * Soft delete a class
   */
  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    this.logger.log(`Removing class ${id} by user ${currentUser.id}`);

    const existingClass = await this.prisma.class.findUnique({
      where: { id },
      include: {
        teacher: true,
        enrollments: {
          where: {
            enrollment_status: {
              in: [EnrollmentStatus.PENDING, EnrollmentStatus.ACTIVE],
            },
          },
        },
      },
    });

    if (!existingClass) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    // Check delete permissions
    await this.validateUserCanModifyClass(currentUser, existingClass);

    // Prevent deletion if there are active enrollments
    if (existingClass.enrollments.length > 0) {
      throw new BadRequestException(
        `Cannot delete class with ${existingClass.enrollments.length} active enrollments. Please remove all students first.`,
      );
    }

    try {
      await this.prisma.class.update({
        where: { id },
        data: { is_active: false },
      });

      // Log audit event
      await this.auditService.logAction({
        action: 'DELETE',
        entity_type: 'class',
        entity_id: id,
        actor_id: currentUser.id,
        before_value: existingClass,
        metadata: {
          class_name: existingClass.name,
          final_enrollment_count: existingClass.enrollments.length,
        },
      });

      // Clear caches
      await this.clearClassCaches(existingClass.teacher_id, existingClass.organization_id, id);

      return { message: `Class "${existingClass.name}" has been successfully archived` };
    } catch (error) {
      this.logger.error(`Failed to delete class ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to delete class. Please try again.');
    }
  }

  /**
   * Get class roster (enrollments)
   */
  async getRoster(id: string, currentUser: User): Promise<any> {
    this.logger.log(`Getting roster for class ${id} by user ${currentUser.id}`);

    const classData = await this.findOne(id, currentUser);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { class_id: id },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: [
        { enrollment_status: 'asc' },
        { user: { last_name: 'asc' } },
        { user: { first_name: 'asc' } },
      ],
    });

    return {
      class: classData,
      enrollments: enrollments.map(enrollment => ({
        id: enrollment.id,
        status: enrollment.enrollment_status,
        enrolled_at: enrollment.enrolled_at,
        completed_at: enrollment.completed_at,
        dropped_at: enrollment.dropped_at,
        final_grade: enrollment.final_grade,
        student: {
          id: enrollment.user.id,
          first_name: enrollment.user.first_name,
          last_name: enrollment.user.last_name,
          username: enrollment.user.username,
          email: enrollment.user.email,
          avatar_url: enrollment.user.avatar_url,
          profile_completed: enrollment.user.profile?.is_completed || false,
        },
      })),
    };
  }

  // Private helper methods

  private async validateTeacherCanCreateClass(user: User, organizationId: string): Promise<void> {
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only teachers and administrators can create classes');
    }

    // Check if teacher has reached maximum class limit
    if (user.role === 'TEACHER') {
      const classCount = await this.prisma.class.count({
        where: {
          teacher_id: user.id,
          is_active: true,
        },
      });

      if (classCount >= this.MAX_CLASSES_PER_TEACHER) {
        throw new BadRequestException(
          `Maximum of ${this.MAX_CLASSES_PER_TEACHER} active classes allowed per teacher`,
        );
      }
    }

    // Verify organization exists and is active
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID "${organizationId}" not found`);
    }

    if (!organization.is_active) {
      throw new BadRequestException('Cannot create classes in inactive organization');
    }
  }

  private async validateClassNameUniqueness(
    name: string,
    organizationId: string,
    academicYear: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.class.findFirst({
      where: {
        name,
        organization_id: organizationId,
        academic_year: academicYear,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });

    if (existing) {
      throw new ConflictException(
        `A class named "${name}" already exists in this organization for ${academicYear}`,
      );
    }
  }

  private validateAcademicYear(academicYear: string): void {
    const currentYear = new Date().getFullYear();
    const yearMatch = academicYear.match(/^(\d{4})(-\d{4})?$/);

    if (!yearMatch) {
      throw new BadRequestException('Academic year must be in YYYY or YYYY-YYYY format');
    }

    const startYear = parseInt(yearMatch[1]);
    if (startYear < currentYear - 5 || startYear > currentYear + 5) {
      throw new BadRequestException('Academic year must be within 5 years of current year');
    }
  }

  private async validateUserCanAccessClass(user: User, classData: any): Promise<void> {
    switch (user.role) {
      case 'ADMIN':
        return; // Admins can access all classes

      case 'TEACHER':
        if (classData.teacher_id === user.id) {
          return; // Teachers can access their own classes
        }
        // Check if teacher is in same organization (for substitutes, etc.)
        const teacherClasses = await this.prisma.class.findFirst({
          where: {
            teacher_id: user.id,
            organization_id: classData.organization_id,
          },
        });
        if (teacherClasses) {
          return;
        }
        break;

      case 'STUDENT':
        // Check if student is enrolled in the class
        const enrollment = await this.prisma.enrollment.findFirst({
          where: {
            user_id: user.id,
            class_id: classData.id,
            enrollment_status: {
              in: [EnrollmentStatus.PENDING, EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
            },
          },
        });
        if (enrollment) {
          return;
        }
        break;
    }

    throw new ForbiddenException('You do not have permission to access this class');
  }

  private async validateUserCanModifyClass(user: User, classData: any): Promise<void> {
    if (user.role === 'ADMIN') {
      return; // Admins can modify all classes
    }

    if (user.role === 'TEACHER' && classData.teacher_id === user.id) {
      return; // Teachers can modify their own classes
    }

    throw new ForbiddenException('You do not have permission to modify this class');
  }

  private async buildWhereConditions(searchDto: ClassSearchDto, currentUser: User): Promise<any> {
    const where: any = {};

    // Role-based filtering
    switch (currentUser.role) {
      case 'ADMIN':
        // Admins can see all classes
        break;
      case 'TEACHER':
        // Teachers see only their classes by default
        if (!searchDto.organization_id) {
          where.teacher_id = currentUser.id;
        }
        break;
      case 'STUDENT':
        // Students see only classes they're enrolled in
        where.enrollments = {
          some: {
            user_id: currentUser.id,
            enrollment_status: {
              in: [EnrollmentStatus.PENDING, EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
            },
          },
        };
        break;
    }

    // Apply search filters
    if (searchDto.search) {
      where.OR = [
        { name: { contains: searchDto.search, mode: 'insensitive' } },
        { description: { contains: searchDto.search, mode: 'insensitive' } },
        { teacher: { first_name: { contains: searchDto.search, mode: 'insensitive' } } },
        { teacher: { last_name: { contains: searchDto.search, mode: 'insensitive' } } },
      ];
    }

    if (searchDto.organization_id) {
      where.organization_id = searchDto.organization_id;
    }

    if (searchDto.teacher_id) {
      where.teacher_id = searchDto.teacher_id;
    }

    if (searchDto.subject) {
      where.subject = searchDto.subject;
    }

    if (searchDto.grade_level) {
      where.grade_level = searchDto.grade_level;
    }

    if (searchDto.academic_year) {
      where.academic_year = searchDto.academic_year;
    }

    if (searchDto.term) {
      where.term = searchDto.term;
    }

    if (searchDto.is_active !== undefined) {
      where.is_active = searchDto.is_active;
    }

    if (searchDto.created_from || searchDto.created_to) {
      where.created_at = {};
      if (searchDto.created_from) {
        where.created_at.gte = searchDto.created_from;
      }
      if (searchDto.created_to) {
        where.created_at.lte = searchDto.created_to;
      }
    }

    // Enrollment-based filters would require subqueries or aggregations
    // For now, we'll handle these in post-processing

    return where;
  }

  private buildOrderByConditions(searchDto: ClassSearchDto): any {
    const orderBy: any = {};

    switch (searchDto.sort_by) {
      case 'name':
        orderBy.name = searchDto.sort_order;
        break;
      case 'created_at':
        orderBy.created_at = searchDto.sort_order;
        break;
      case 'updated_at':
        orderBy.updated_at = searchDto.sort_order;
        break;
      case 'academic_year':
        orderBy.academic_year = searchDto.sort_order;
        break;
      case 'teacher_name':
        orderBy.teacher = { last_name: searchDto.sort_order };
        break;
      case 'organization_name':
        orderBy.organization = { name: searchDto.sort_order };
        break;
      default:
        orderBy.name = 'asc';
    }

    return orderBy;
  }

  private transformToResponseDto(classData: any): ClassResponseDto {
    const enrollmentSummary = this.calculateEnrollmentSummary(classData.enrollments || []);

    return {
      id: classData.id,
      name: classData.name,
      description: classData.description,
      subject: classData.subject,
      grade_level: classData.grade_level,
      academic_year: classData.academic_year,
      term: classData.term,
      max_students: classData.max_students,
      is_active: classData.is_active,
      created_at: classData.created_at,
      updated_at: classData.updated_at,
      organization_id: classData.organization_id,
      teacher_id: classData.teacher_id,
      teacher: classData.teacher ? {
        id: classData.teacher.id,
        first_name: classData.teacher.first_name,
        last_name: classData.teacher.last_name,
        username: classData.teacher.username,
        email: classData.teacher.email,
        avatar_url: classData.teacher.avatar_url,
        display_name: `${classData.teacher.first_name || ''} ${classData.teacher.last_name || ''}`.trim() || 
                     classData.teacher.username || 'Unknown Teacher',
      } : null,
      organization: classData.organization ? {
        id: classData.organization.id,
        name: classData.organization.name,
        slug: classData.organization.slug,
        type: classData.organization.type,
      } : null,
      enrollment_summary: enrollmentSummary,
      timeback_class_id: classData.timeback_class_id,
      timeback_sync_status: classData.timeback_sync_status,
      timeback_synced_at: classData.timeback_synced_at,
    };
  }

  private transformToCompactResponseDto(classData: any): ClassCompactResponseDto {
    const enrollmentSummary = this.calculateEnrollmentSummary(classData.enrollments || []);
    
    return {
      id: classData.id,
      name: classData.name,
      subject: classData.subject,
      grade_level: classData.grade_level,
      academic_year: classData.academic_year,
      term: classData.term,
      is_active: classData.is_active,
      teacher_name: classData.teacher ? 
        `${classData.teacher.first_name || ''} ${classData.teacher.last_name || ''}`.trim() || 
        classData.teacher.username || 'Unknown Teacher' : 'Unknown Teacher',
      organization_name: classData.organization?.name || 'Unknown Organization',
      enrollment_status: `${enrollmentSummary.current_count}/${classData.max_students}`,
      enrollment_percentage: enrollmentSummary.enrollment_percentage,
      is_full: enrollmentSummary.is_full,
    };
  }

  private calculateEnrollmentSummary(enrollments: any[]): ClassEnrollmentSummaryDto {
    const activeEnrollments = enrollments.filter(e => 
      e.enrollment_status === 'ACTIVE' || e.enrollment_status === 'PENDING'
    );

    const statusCounts = {
      PENDING: enrollments.filter(e => e.enrollment_status === 'PENDING').length,
      ACTIVE: enrollments.filter(e => e.enrollment_status === 'ACTIVE').length,
      COMPLETED: enrollments.filter(e => e.enrollment_status === 'COMPLETED').length,
      DROPPED: enrollments.filter(e => e.enrollment_status === 'DROPPED').length,
      WITHDRAWN: enrollments.filter(e => e.enrollment_status === 'WITHDRAWN').length,
    };

    const currentCount = statusCounts.PENDING + statusCounts.ACTIVE;
    const maxStudents = enrollments.length > 0 ? 
      (enrollments[0] as any).class?.max_students || 30 : 30;
    
    const availableSpots = Math.max(0, maxStudents - currentCount);
    const enrollmentPercentage = maxStudents > 0 ? (currentCount / maxStudents) * 100 : 0;
    const isFull = currentCount >= maxStudents;
    const isNearCapacity = enrollmentPercentage > 85;

    return {
      current_count: currentCount,
      max_students: maxStudents,
      available_spots: availableSpots,
      enrollment_percentage: Math.round(enrollmentPercentage * 100) / 100,
      is_full: isFull,
      is_near_capacity: isNearCapacity,
      status_counts: statusCounts,
    };
  }

  private async clearClassCaches(teacherId: string, organizationId: string, classId?: string): Promise<void> {
    const patterns = [
      `classes:search:*:user:${teacherId}`,
      `classes:org:${organizationId}:*`,
      `classes:teacher:${teacherId}:*`,
    ];

    if (classId) {
      patterns.push(`class:${classId}:*`);
    }

    await Promise.all(patterns.map(pattern => this.cacheService.deletePattern(pattern)));
  }
}
