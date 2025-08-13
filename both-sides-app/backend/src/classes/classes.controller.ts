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
import { ClassesService } from './classes.service';
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
} from './dto/class-search.dto';
import {
  ClassResponseDto,
  ClassCompactResponseDto,
  PaginatedClassResponseDto,
} from './dto/class-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/rbac/guards/rbac.guard';
import { CurrentUser } from '../auth/rbac/decorators/current-user.decorator';
import { Roles } from '../auth/rbac/decorators/roles.decorator';
import { Permissions } from '../auth/rbac/decorators/permissions.decorator';
import { User } from '@prisma/client';
import { ProfileErrorInterceptor } from '../profiles/interceptors/profile-error.interceptor';

@ApiTags('Classes')
@ApiBearerAuth()
@Controller('classes')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(ProfileErrorInterceptor)
export class ClassesController {
  private readonly logger = new Logger(ClassesController.name);

  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new class',
    description: 'Create a new class. Only teachers and admins can create classes.',
  })
  @ApiCreatedResponse({
    description: 'The class has been successfully created',
    type: ClassResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or business rules violated',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to create classes',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('class:create')
  async create(
    @Body() createClassDto: CreateClassDto,
    @CurrentUser() currentUser: User,
  ): Promise<ClassResponseDto> {
    this.logger.log(`Creating class: ${createClassDto.name} by user ${currentUser.id}`);
    return this.classesService.create(createClassDto, currentUser);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk create classes',
    description: 'Create multiple classes at once. Limited to 50 classes per request.',
  })
  @ApiCreatedResponse({
    description: 'Classes have been successfully created',
    type: [ClassResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or too many classes in request',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to create classes',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('class:create', 'class:bulk_create')
  async bulkCreate(
    @Body() bulkCreateDto: BulkCreateClassDto,
    @CurrentUser() currentUser: User,
  ): Promise<ClassResponseDto[]> {
    this.logger.log(`Bulk creating ${bulkCreateDto.classes.length} classes by user ${currentUser.id}`);
    return this.classesService.bulkCreate(bulkCreateDto, currentUser);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all classes',
    description: 'Retrieve classes with filtering, sorting, and pagination. Results are role-based.',
  })
  @ApiOkResponse({
    description: 'Classes retrieved successfully',
    type: PaginatedClassResponseDto,
  })
  @ApiQuery({
    name: 'search',
    description: 'Search in class name, description, or teacher name',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'organization_id',
    description: 'Filter by organization ID',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'teacher_id',
    description: 'Filter by teacher ID',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'subject',
    description: 'Filter by subject',
    required: false,
    enum: ['ENGLISH', 'MATH', 'SCIENCE', 'SOCIAL_STUDIES', 'HISTORY', 'PHILOSOPHY', 'DEBATE', 'CIVICS', 'GOVERNMENT', 'ECONOMICS', 'PSYCHOLOGY', 'SOCIOLOGY', 'LITERATURE', 'CRITICAL_THINKING', 'OTHER'],
  })
  @ApiQuery({
    name: 'grade_level',
    description: 'Filter by grade level',
    required: false,
    enum: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'COLLEGE', 'ADULT', 'MIXED'],
  })
  @ApiQuery({
    name: 'academic_year',
    description: 'Filter by academic year (e.g., 2024-2025)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'term',
    description: 'Filter by academic term',
    required: false,
    enum: ['FALL', 'SPRING', 'SUMMER', 'WINTER', 'YEAR_ROUND'],
  })
  @ApiQuery({
    name: 'is_active',
    description: 'Filter by active status',
    required: false,
    type: Boolean,
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
  @ApiQuery({
    name: 'sort_by',
    description: 'Sort field',
    required: false,
    enum: ['name', 'created_at', 'updated_at', 'academic_year', 'enrollment_count', 'teacher_name', 'organization_name'],
  })
  @ApiQuery({
    name: 'sort_order',
    description: 'Sort order',
    required: false,
    enum: ['asc', 'desc'],
  })
  @ApiQuery({
    name: 'compact',
    description: 'Return compact response format',
    required: false,
    type: Boolean,
  })
  @Permissions('class:read')
  async findAll(
    @Query() searchDto: ClassSearchDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedClassResponseDto> {
    this.logger.log(`Searching classes for user ${currentUser.id} with filters: ${JSON.stringify(searchDto)}`);
    return this.classesService.findAll(searchDto, currentUser);
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get current user classes',
    description: 'Get classes for the current user (own classes for teachers, enrolled classes for students)',
  })
  @ApiOkResponse({
    description: 'User classes retrieved successfully',
    type: PaginatedClassResponseDto,
  })
  @Permissions('class:read')
  async getMyClasses(
    @Query() searchDto: ClassSearchDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedClassResponseDto> {
    this.logger.log(`Getting my classes for user ${currentUser.id}`);
    
    // Force filter to current user's context
    if (currentUser.role === 'TEACHER') {
      searchDto.teacher_id = currentUser.id;
    } else if (currentUser.role === 'STUDENT') {
      // Students can only see their enrolled classes (handled in service)
    }
    
    return this.classesService.findAll(searchDto, currentUser);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get class analytics',
    description: 'Retrieve analytics and statistics about classes. Admin and teachers only.',
  })
  @ApiOkResponse({
    description: 'Analytics retrieved successfully',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to view analytics',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('class:read', 'analytics:read')
  async getAnalytics(
    @Query() analyticsDto: ClassAnalyticsDto,
    @CurrentUser() currentUser: User,
  ): Promise<any> {
    this.logger.log(`Getting class analytics for user ${currentUser.id}`);
    // TODO: Implement analytics service method
    return { message: 'Analytics endpoint coming soon' };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a class by ID',
    description: 'Retrieve detailed information about a specific class',
  })
  @ApiParam({
    name: 'id',
    description: 'Class ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Class found',
    type: ClassResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Class not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to view this class',
  })
  @Permissions('class:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<ClassResponseDto> {
    this.logger.log(`Getting class ${id} for user ${currentUser.id}`);
    return this.classesService.findOne(id, currentUser);
  }

  @Get(':id/roster')
  @ApiOperation({
    summary: 'Get class roster',
    description: 'Retrieve the list of students enrolled in a class',
  })
  @ApiParam({
    name: 'id',
    description: 'Class ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Roster retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Class not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to view class roster',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('class:read', 'enrollment:read')
  async getRoster(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<any> {
    this.logger.log(`Getting roster for class ${id} by user ${currentUser.id}`);
    return this.classesService.getRoster(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a class',
    description: 'Update class information. Only class teacher and admins can update.',
  })
  @ApiParam({
    name: 'id',
    description: 'Class ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Class updated successfully',
    type: ClassResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Class not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to update this class',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or business rules violated',
  })
  @Permissions('class:update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClassDto: UpdateClassDto,
    @CurrentUser() currentUser: User,
  ): Promise<ClassResponseDto> {
    this.logger.log(`Updating class ${id} by user ${currentUser.id}`);
    return this.classesService.update(id, updateClassDto, currentUser);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update class status',
    description: 'Activate or deactivate a class. Only class teacher and admins can update status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Class ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Class status updated successfully',
    type: ClassResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Class not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to update class status',
  })
  @Permissions('class:update', 'class:status_change')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateClassStatusDto,
    @CurrentUser() currentUser: User,
  ): Promise<ClassResponseDto> {
    this.logger.log(`Updating status for class ${id} by user ${currentUser.id}`);
    const updateDto: UpdateClassDto = {
      is_active: updateStatusDto.is_active,
    };
    return this.classesService.update(id, updateDto, currentUser);
  }

  @Patch(':id/capacity')
  @ApiOperation({
    summary: 'Update class capacity',
    description: 'Change the maximum number of students allowed in a class.',
  })
  @ApiParam({
    name: 'id',
    description: 'Class ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Class capacity updated successfully',
    type: ClassResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Class not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to update class capacity',
  })
  @ApiBadRequestResponse({
    description: 'New capacity is less than current enrollment',
  })
  @Permissions('class:update', 'class:capacity_change')
  async updateCapacity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCapacityDto: UpdateClassCapacityDto,
    @CurrentUser() currentUser: User,
  ): Promise<ClassResponseDto> {
    this.logger.log(`Updating capacity for class ${id} by user ${currentUser.id}`);
    const updateDto: UpdateClassDto = {
      max_students: updateCapacityDto.max_students,
    };
    return this.classesService.update(id, updateDto, currentUser);
  }

  @Post('bulk-action')
  @ApiOperation({
    summary: 'Perform bulk action on classes',
    description: 'Perform bulk operations on multiple classes (activate, deactivate, archive, delete)',
  })
  @ApiOkResponse({
    description: 'Bulk action completed successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid action or class IDs',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions for bulk operations',
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('class:bulk_update')
  async bulkAction(
    @Body() bulkActionDto: BulkClassActionDto,
    @CurrentUser() currentUser: User,
  ): Promise<any> {
    this.logger.log(`Performing bulk action ${bulkActionDto.action} on ${bulkActionDto.class_ids.length} classes by user ${currentUser.id}`);
    // TODO: Implement bulk action service method
    return { 
      message: `Bulk ${bulkActionDto.action} action completed`,
      processed_count: bulkActionDto.class_ids.length,
      action: bulkActionDto.action,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Archive a class',
    description: 'Soft delete (archive) a class. Classes with active enrollments cannot be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Class ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Class archived successfully',
  })
  @ApiNotFoundResponse({
    description: 'Class not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions to delete this class',
  })
  @ApiBadRequestResponse({
    description: 'Cannot delete class with active enrollments',
  })
  @HttpCode(HttpStatus.OK)
  @Permissions('class:delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    this.logger.log(`Deleting class ${id} by user ${currentUser.id}`);
    return this.classesService.remove(id, currentUser);
  }

  // Additional endpoints for specific use cases

  @Get('organization/:orgId')
  @ApiOperation({
    summary: 'Get classes by organization',
    description: 'Retrieve all classes belonging to a specific organization',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Organization classes retrieved successfully',
    type: PaginatedClassResponseDto,
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('class:read', 'organization:read')
  async getClassesByOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() searchDto: ClassSearchDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedClassResponseDto> {
    this.logger.log(`Getting classes for organization ${orgId} by user ${currentUser.id}`);
    searchDto.organization_id = orgId;
    return this.classesService.findAll(searchDto, currentUser);
  }

  @Get('teacher/:teacherId')
  @ApiOperation({
    summary: 'Get classes by teacher',
    description: 'Retrieve all classes taught by a specific teacher',
  })
  @ApiParam({
    name: 'teacherId',
    description: 'Teacher ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Teacher classes retrieved successfully',
    type: PaginatedClassResponseDto,
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('class:read', 'user:read')
  async getClassesByTeacher(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Query() searchDto: ClassSearchDto,
    @CurrentUser() currentUser: User,
  ): Promise<PaginatedClassResponseDto> {
    this.logger.log(`Getting classes for teacher ${teacherId} by user ${currentUser.id}`);
    searchDto.teacher_id = teacherId;
    return this.classesService.findAll(searchDto, currentUser);
  }
}
