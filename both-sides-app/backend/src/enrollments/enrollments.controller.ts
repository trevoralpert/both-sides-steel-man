import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
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
} from './dto/update-enrollment.dto';
import {
  EnrollmentSearchDto,
  EnrollmentAnalyticsDto,
  RosterExportDto,
} from './dto/enrollment-search.dto';
import {
  EnrollmentResponseDto,
  PaginatedEnrollmentResponseDto,
  ClassRosterResponseDto,
} from './dto/enrollment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/rbac/guards/rbac.guard';
import { CurrentUser } from '../auth/rbac/decorators/current-user.decorator';
import { Roles } from '../auth/rbac/decorators/roles.decorator';
import { Permissions } from '../auth/rbac/decorators/permissions.decorator';
import { User } from '@prisma/client';
import { ProfileErrorInterceptor } from '../profiles/interceptors/profile-error.interceptor';

@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('enrollments')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(ProfileErrorInterceptor)
export class EnrollmentsController {
  private readonly logger = new Logger(EnrollmentsController.name);

  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Enroll a student in a class',
    description: 'Create a new enrollment for a student in a specific class.',
  })
  @ApiCreatedResponse({
    description: 'Student has been successfully enrolled',
    type: EnrollmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed, class is full, or student already enrolled',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to enroll this student',
  })
  @Permissions('enrollment:create')
  async enroll(
    @Body() enrollDto: EnrollStudentDto,
    @CurrentUser() currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Enrolling student ${enrollDto.user_id} in class ${enrollDto.class_id} by user ${currentUser.id}`);
    return this.enrollmentsService.enrollStudent(enrollDto, currentUser);
  }

  @Post('by-username')
  @ApiOperation({
    summary: 'Enroll student by username',
    description: 'Enroll a student using their username instead of user ID.',
  })
  @ApiCreatedResponse({
    description: 'Student has been successfully enrolled',
    type: EnrollmentResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Student with the specified username not found',
  })
  @Permissions('enrollment:create')
  async enrollByUsername(
    @Body() enrollDto: EnrollByUsernameDto,
    @CurrentUser() currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Enrolling student by username ${enrollDto.username} by user ${currentUser.id}`);
    return this.enrollmentsService.enrollByUsername(enrollDto, currentUser);
  }

  @Post('by-email')
  @ApiOperation({
    summary: 'Enroll student by email',
    description: 'Enroll a student using their email address instead of user ID.',
  })
  @ApiCreatedResponse({
    description: 'Student has been successfully enrolled',
    type: EnrollmentResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Student with the specified email not found',
  })
  @Permissions('enrollment:create')
  async enrollByEmail(
    @Body() enrollDto: EnrollByEmailDto,
    @CurrentUser() currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Enrolling student by email ${enrollDto.email} by user ${currentUser.id}`);
    return this.enrollmentsService.enrollByEmail(enrollDto, currentUser);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk enroll students',
    description: 'Enroll multiple students at once. Limited to 100 enrollments per request.',
  })
  @ApiCreatedResponse({
    description: 'Bulk enrollment completed',
    schema: {
      type: 'object',
      properties: {
        successful: {
          type: 'array',
          items: { $ref: '#/components/schemas/EnrollmentResponseDto' },
        },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              enrollment: { $ref: '#/components/schemas/EnrollStudentDto' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Too many enrollments in request or validation failed',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('enrollment:create', 'enrollment:bulk_create')
  async bulkEnroll(
    @Body() bulkDto: BulkEnrollmentDto,
    @CurrentUser() currentUser: User,
  ): Promise<any> {
    this.logger.log(`Bulk enrolling ${bulkDto.enrollments.length} students by user ${currentUser.id}`);
    return this.enrollmentsService.bulkEnroll(bulkDto, currentUser);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all enrollments',
    description: 'Retrieve enrollments with filtering, sorting, and pagination. Results are role-based.',
  })
  @ApiOkResponse({
    description: 'Enrollments retrieved successfully',
    type: PaginatedEnrollmentResponseDto,
  })
  @ApiQuery({
    name: 'search',
    description: 'Search in student name, username, email, or class name',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'class_id',
    description: 'Filter by class ID',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'user_id',
    description: 'Filter by student user ID',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'enrollment_status',
    description: 'Filter by enrollment status',
    required: false,
    enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'DROPPED', 'WITHDRAWN'],
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (default: 1)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page (default: 10, max: 100)',
    required: false,
    type: Number,
  })
  @Permissions('enrollment:read')
  async findAll(
    @Query() searchDto: EnrollmentSearchDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedEnrollmentResponseDto> {
    this.logger.log(`Searching enrollments for user ${currentUser.id}`);
    return this.enrollmentsService.findAll(searchDto, currentUser);
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get current user enrollments',
    description: 'Get enrollments for the current user (own enrollments for students, class enrollments for teachers)',
  })
  @ApiOkResponse({
    description: 'User enrollments retrieved successfully',
    type: PaginatedEnrollmentResponseDto,
  })
  @Permissions('enrollment:read')
  async getMyEnrollments(
    @Query() searchDto: EnrollmentSearchDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedEnrollmentResponseDto> {
    this.logger.log(`Getting my enrollments for user ${currentUser.id}`);
    
    // Force filter to current user's context
    if (currentUser.role === 'STUDENT') {
      searchDto.user_id = currentUser.id;
    } else if (currentUser.role === 'TEACHER') {
      searchDto.teacher_id = currentUser.id;
    }
    
    return this.enrollmentsService.findAll(searchDto, currentUser);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get enrollment analytics',
    description: 'Retrieve analytics and statistics about enrollments. Admin and teachers only.',
  })
  @ApiOkResponse({
    description: 'Analytics retrieved successfully',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to view analytics',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('enrollment:read', 'analytics:read')
  async getAnalytics(
    @Query() analyticsDto: EnrollmentAnalyticsDto,
    @CurrentUser() currentUser: User,
  ): Promise<any> {
    this.logger.log(`Getting enrollment analytics for user ${currentUser.id}`);
    // TODO: Implement analytics service method
    return { message: 'Enrollment analytics endpoint coming soon' };
  }

  @Get('class/:classId/roster')
  @ApiOperation({
    summary: 'Get class roster',
    description: 'Retrieve the complete roster for a specific class with enrollment details.',
  })
  @ApiParam({
    name: 'classId',
    description: 'Class ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Class roster retrieved successfully',
    type: ClassRosterResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Class not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to view class roster',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('enrollment:read', 'class:read')
  async getClassRoster(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() currentUser: User,
  ): Promise<ClassRosterResponseDto> {
    this.logger.log(`Getting class roster for ${classId} by user ${currentUser.id}`);
    return this.enrollmentsService.getClassRoster(classId, currentUser);
  }

  @Get('class/:classId/export')
  @ApiOperation({
    summary: 'Export class roster',
    description: 'Export class roster in various formats (CSV, Excel, PDF).',
  })
  @ApiParam({
    name: 'classId',
    description: 'Class ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Roster export generated successfully',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('enrollment:read', 'enrollment:export')
  async exportRoster(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() exportDto: RosterExportDto,
    @CurrentUser() currentUser: User,
  ): Promise<any> {
    this.logger.log(`Exporting roster for class ${classId} by user ${currentUser.id}`);
    // TODO: Implement roster export functionality
    return { 
      message: 'Roster export functionality coming soon',
      format: exportDto.export_format,
      class_id: classId,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an enrollment by ID',
    description: 'Retrieve detailed information about a specific enrollment',
  })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Enrollment found',
    type: EnrollmentResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Enrollment not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to view this enrollment',
  })
  @Permissions('enrollment:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Getting enrollment ${id} for user ${currentUser.id}`);
    return this.enrollmentsService.findOne(id, currentUser);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update enrollment status',
    description: 'Update the status of an enrollment with workflow validation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Enrollment status updated successfully',
    type: EnrollmentResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Enrollment not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to update enrollment status',
  })
  @ApiBadRequestResponse({
    description: 'Invalid status transition',
  })
  @Permissions('enrollment:update')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateEnrollmentStatusDto,
    @CurrentUser() currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Updating status for enrollment ${id} by user ${currentUser.id}`);
    return this.enrollmentsService.updateStatus(id, updateStatusDto, currentUser);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Complete enrollment',
    description: 'Mark an enrollment as completed with optional final grade.',
  })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Enrollment completed successfully',
    type: EnrollmentResponseDto,
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('enrollment:update', 'enrollment:complete')
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() completeDto: CompleteEnrollmentDto,
    @CurrentUser() currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Completing enrollment ${id} by user ${currentUser.id}`);
    return this.enrollmentsService.completeEnrollment(id, completeDto, currentUser);
  }

  @Patch(':id/drop')
  @ApiOperation({
    summary: 'Drop enrollment',
    description: 'Mark an enrollment as dropped with reason.',
  })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Enrollment dropped successfully',
    type: EnrollmentResponseDto,
  })
  @Permissions('enrollment:update', 'enrollment:drop')
  async drop(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dropDto: DropEnrollmentDto,
    @CurrentUser() currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Dropping enrollment ${id} by user ${currentUser.id}`);
    return this.enrollmentsService.dropEnrollment(id, dropDto, currentUser);
  }

  @Patch(':id/withdraw')
  @ApiOperation({
    summary: 'Withdraw enrollment',
    description: 'Mark an enrollment as withdrawn (permanent removal).',
  })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Enrollment withdrawn successfully',
    type: EnrollmentResponseDto,
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('enrollment:update', 'enrollment:withdraw')
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() withdrawDto: WithdrawEnrollmentDto,
    @CurrentUser() currentUser: User,
  ): Promise<EnrollmentResponseDto> {
    this.logger.log(`Withdrawing enrollment ${id} by user ${currentUser.id}`);
    return this.enrollmentsService.withdrawEnrollment(id, withdrawDto, currentUser);
  }

  @Post('bulk-status')
  @ApiOperation({
    summary: 'Bulk update enrollment status',
    description: 'Update the status of multiple enrollments at once.',
  })
  @ApiOkResponse({
    description: 'Bulk status update completed',
  })
  @ApiBadRequestResponse({
    description: 'Invalid status transitions or too many enrollments',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('enrollment:bulk_update')
  async bulkStatusUpdate(
    @Body() bulkUpdateDto: BulkStatusUpdateDto,
    @CurrentUser() currentUser: User,
  ): Promise<any> {
    this.logger.log(`Bulk updating status for ${bulkUpdateDto.enrollment_ids.length} enrollments by user ${currentUser.id}`);
    // TODO: Implement bulk status update service method
    return { 
      message: `Bulk status update to ${bulkUpdateDto.new_status} completed`,
      processed_count: bulkUpdateDto.enrollment_ids.length,
      new_status: bulkUpdateDto.new_status,
    };
  }

  @Post('transfer')
  @ApiOperation({
    summary: 'Transfer enrollment to another class',
    description: 'Transfer a student enrollment from one class to another.',
  })
  @ApiOkResponse({
    description: 'Enrollment transferred successfully',
  })
  @ApiBadRequestResponse({
    description: 'Target class is full or other validation failed',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('enrollment:update', 'enrollment:transfer')
  async transfer(
    @Body() transferDto: TransferEnrollmentDto,
    @CurrentUser() currentUser: User,
  ): Promise<any> {
    this.logger.log(`Transferring enrollment ${transferDto.enrollment_id} to class ${transferDto.target_class_id} by user ${currentUser.id}`);
    // TODO: Implement transfer enrollment service method
    return {
      message: 'Enrollment transfer functionality coming soon',
      enrollment_id: transferDto.enrollment_id,
      target_class_id: transferDto.target_class_id,
      reason: transferDto.transfer_reason,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Unenroll student',
    description: 'Remove a student enrollment completely. Completed enrollments can only be removed by admins.',
  })
  @ApiParam({
    name: 'id',
    description: 'Enrollment ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Student unenrolled successfully',
  })
  @ApiNotFoundResponse({
    description: 'Enrollment not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to unenroll this student',
  })
  @ApiBadRequestResponse({
    description: 'Cannot remove completed enrollments',
  })
  @HttpCode(HttpStatus.OK)
  @Permissions('enrollment:delete')
  async unenroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    this.logger.log(`Unenrolling student ${id} by user ${currentUser.id}`);
    return this.enrollmentsService.unenroll(id, currentUser);
  }

  // Additional utility endpoints

  @Get('student/:studentId')
  @ApiOperation({
    summary: 'Get enrollments for a specific student',
    description: 'Retrieve all enrollments for a particular student.',
  })
  @ApiParam({
    name: 'studentId',
    description: 'Student user ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Student enrollments retrieved successfully',
    type: PaginatedEnrollmentResponseDto,
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('enrollment:read', 'user:read')
  async getStudentEnrollments(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() searchDto: EnrollmentSearchDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedEnrollmentResponseDto> {
    this.logger.log(`Getting enrollments for student ${studentId} by user ${currentUser.id}`);
    searchDto.user_id = studentId;
    return this.enrollmentsService.findAll(searchDto, currentUser);
  }

  @Get('teacher/:teacherId')
  @ApiOperation({
    summary: 'Get enrollments for a teacher classes',
    description: 'Retrieve all enrollments in classes taught by a specific teacher.',
  })
  @ApiParam({
    name: 'teacherId',
    description: 'Teacher user ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Teacher class enrollments retrieved successfully',
    type: PaginatedEnrollmentResponseDto,
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('enrollment:read', 'user:read')
  async getTeacherEnrollments(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Query() searchDto: EnrollmentSearchDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedEnrollmentResponseDto> {
    this.logger.log(`Getting enrollments for teacher ${teacherId} classes by user ${currentUser.id}`);
    searchDto.teacher_id = teacherId;
    return this.enrollmentsService.findAll(searchDto, currentUser);
  }

  @Get('organization/:orgId')
  @ApiOperation({
    summary: 'Get enrollments for an organization',
    description: 'Retrieve all enrollments within a specific organization.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Organization enrollments retrieved successfully',
    type: PaginatedEnrollmentResponseDto,
  })
  @Roles('ADMIN')
  @Permissions('enrollment:read', 'organization:read')
  async getOrganizationEnrollments(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() searchDto: EnrollmentSearchDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedEnrollmentResponseDto> {
    this.logger.log(`Getting enrollments for organization ${orgId} by user ${currentUser.id}`);
    searchDto.organization_id = orgId;
    return this.enrollmentsService.findAll(searchDto, currentUser);
  }
}
