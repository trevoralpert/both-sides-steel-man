/**
 * Phase 3 Task 3.3.4: Completion Tracking Controller
 * REST endpoints for onboarding completion tracking and analytics
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../auth/rbac/guards/rbac.guard';
import { Roles } from '../../auth/rbac/decorators/roles.decorator';
import { Permissions } from '../../auth/rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/rbac/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { CompletionTrackingService } from '../services/completion-tracking.service';
import {
  RecordMilestoneDto,
  ClassCompletionAnalyticsDto,
  ClassCompletionStatsResponseDto,
  CreateNotificationDto,
  MilestoneResponseDto,
  NotificationResponseDto,
  CompletionAnalyticsFilterDto,
  BulkClassCompletionDto,
  NotificationStatus,
} from '../dto/completion-tracking.dto';

@ApiTags('Completion Tracking')
@ApiBearerAuth()
@Controller('surveys/completion')
@UseGuards(JwtAuthGuard, RbacGuard)
export class CompletionTrackingController {
  private readonly logger = new Logger(CompletionTrackingController.name);

  constructor(
    private readonly completionTrackingService: CompletionTrackingService,
  ) {}

  // ====== MILESTONE TRACKING ENDPOINTS ======

  /**
   * Record a milestone achievement for current user
   * POST /api/surveys/completion/milestones
   */
  @Post('milestones')
  @ApiOperation({
    summary: 'Record completion milestone',
    description: 'Record a survey completion milestone achievement for the current user',
  })
  @ApiCreatedResponse({
    description: 'Milestone recorded successfully',
    type: MilestoneResponseDto,
  })
  @ApiBody({ type: RecordMilestoneDto })
  @Permissions('survey:write', 'profile:update')
  async recordMilestone(
    @Body(new ValidationPipe({ transform: true })) milestoneDto: RecordMilestoneDto,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: MilestoneResponseDto; message: string }> {
    this.logger.log(`Recording milestone ${milestoneDto.milestone_type} for user ${user.id}`);

    // Get user's profile ID
    const profile = await this.getUserProfile(user.id);
    const milestone = await this.completionTrackingService.recordMilestone(
      profile.id,
      milestoneDto
    );

    return {
      success: true,
      data: milestone,
      message: 'Milestone recorded successfully',
    };
  }

  /**
   * Get milestones for current user
   * GET /api/surveys/completion/milestones/me
   */
  @Get('milestones/me')
  @ApiOperation({
    summary: 'Get user milestones',
    description: 'Get all completion milestones for the current user',
  })
  @ApiOkResponse({
    description: 'Milestones retrieved successfully',
    type: [MilestoneResponseDto],
  })
  @Permissions('survey:read', 'profile:read')
  async getUserMilestones(
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: MilestoneResponseDto[]; message: string }> {
    this.logger.log(`Getting milestones for user ${user.id}`);

    const profile = await this.getUserProfile(user.id);
    const milestones = await this.completionTrackingService.getProfileMilestones(profile.id);

    return {
      success: true,
      data: milestones,
      message: 'Milestones retrieved successfully',
    };
  }

  /**
   * Get milestones for a specific student (teachers/admins only)
   * GET /api/surveys/completion/milestones/student/:studentId
   */
  @Get('milestones/student/:studentId')
  @ApiOperation({
    summary: 'Get student milestones',
    description: 'Get all completion milestones for a specific student',
  })
  @ApiParam({
    name: 'studentId',
    description: 'Student user ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Student milestones retrieved successfully',
    type: [MilestoneResponseDto],
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('survey:read', 'user:read')
  async getStudentMilestones(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: MilestoneResponseDto[]; message: string }> {
    this.logger.log(`Getting milestones for student ${studentId} by user ${user.id}`);

    const studentProfile = await this.getUserProfile(studentId);
    const milestones = await this.completionTrackingService.getProfileMilestones(
      studentProfile.id
    );

    return {
      success: true,
      data: milestones,
      message: 'Student milestones retrieved successfully',
    };
  }

  // ====== CLASS ANALYTICS ENDPOINTS ======

  /**
   * Get completion analytics for a class
   * GET /api/surveys/completion/analytics/class/:classId
   */
  @Get('analytics/class/:classId')
  @ApiOperation({
    summary: 'Get class completion analytics',
    description: 'Get comprehensive completion analytics for a specific class',
  })
  @ApiParam({
    name: 'classId',
    description: 'Class ID',
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'surveyId',
    description: 'Survey ID to filter by',
    required: false,
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'includeSections',
    description: 'Include section-level breakdown',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeStudents',
    description: 'Include individual student details',
    required: false,
    type: Boolean,
  })
  @ApiOkResponse({
    description: 'Class completion analytics retrieved successfully',
    type: ClassCompletionStatsResponseDto,
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('class:read', 'survey:read', 'analytics:read')
  async getClassCompletionAnalytics(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query('surveyId') surveyId?: string,
    @Query('includeSections') includeSections?: boolean,
    @Query('includeStudents') includeStudents?: boolean,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: ClassCompletionStatsResponseDto; message: string }> {
    this.logger.log(`Getting completion analytics for class ${classId} by user ${user.id}`);

    const analyticsDto: ClassCompletionAnalyticsDto = {
      class_id: classId,
      survey_id: surveyId,
      include_sections: includeSections || false,
      include_students: includeStudents || false,
    };

    const analytics = await this.completionTrackingService.getClassCompletionAnalytics(
      analyticsDto
    );

    return {
      success: true,
      data: analytics,
      message: 'Class completion analytics retrieved successfully',
    };
  }

  /**
   * Get completion analytics for multiple classes
   * POST /api/surveys/completion/analytics/bulk
   */
  @Post('analytics/bulk')
  @ApiOperation({
    summary: 'Get bulk class completion analytics',
    description: 'Get completion analytics for multiple classes at once',
  })
  @ApiCreatedResponse({
    description: 'Bulk completion analytics retrieved successfully',
    type: [ClassCompletionStatsResponseDto],
  })
  @ApiBody({ type: BulkClassCompletionDto })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('class:read', 'survey:read', 'analytics:read')
  async getBulkClassCompletionAnalytics(
    @Body(new ValidationPipe({ transform: true })) bulkDto: BulkClassCompletionDto,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: ClassCompletionStatsResponseDto[]; message: string }> {
    this.logger.log(
      `Getting bulk completion analytics for ${bulkDto.class_ids.length} classes by user ${user.id}`
    );

    const analytics = await this.completionTrackingService.getBulkClassCompletionStats(bulkDto);

    return {
      success: true,
      data: analytics,
      message: 'Bulk completion analytics retrieved successfully',
    };
  }

  /**
   * Get completion analytics for teacher's classes
   * GET /api/surveys/completion/analytics/teacher/me
   */
  @Get('analytics/teacher/me')
  @ApiOperation({
    summary: 'Get teacher completion analytics',
    description: 'Get completion analytics for all classes taught by the current teacher',
  })
  @ApiQuery({
    name: 'surveyId',
    description: 'Survey ID to filter by',
    required: false,
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Teacher completion analytics retrieved successfully',
    type: [ClassCompletionStatsResponseDto],
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('class:read', 'survey:read', 'analytics:read')
  async getTeacherCompletionAnalytics(
    @Query('surveyId') surveyId?: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: ClassCompletionStatsResponseDto[]; message: string }> {
    this.logger.log(`Getting completion analytics for teacher ${user.id}`);

    // Get teacher's classes
    const teacherClasses = await this.getTeacherClasses(user.id);
    const classIds = teacherClasses.map(c => c.id);

    if (classIds.length === 0) {
      return {
        success: true,
        data: [],
        message: 'No classes found for teacher',
      };
    }

    const analytics = await this.completionTrackingService.getBulkClassCompletionStats({
      class_ids: classIds,
      survey_id: surveyId,
    });

    return {
      success: true,
      data: analytics,
      message: 'Teacher completion analytics retrieved successfully',
    };
  }

  // ====== NOTIFICATION ENDPOINTS ======

  /**
   * Create a completion notification
   * POST /api/surveys/completion/notifications
   */
  @Post('notifications')
  @ApiOperation({
    summary: 'Create completion notification',
    description: 'Create a completion-related notification',
  })
  @ApiCreatedResponse({
    description: 'Notification created successfully',
    type: NotificationResponseDto,
  })
  @ApiBody({ type: CreateNotificationDto })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('notification:create')
  async createNotification(
    @Body(new ValidationPipe({ transform: true })) notificationDto: CreateNotificationDto,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: NotificationResponseDto; message: string }> {
    this.logger.log(`Creating notification by user ${user.id}`);

    const notification = await this.completionTrackingService.createNotification(
      notificationDto
    );

    return {
      success: true,
      data: notification,
      message: 'Notification created successfully',
    };
  }

  /**
   * Get notifications for current user
   * GET /api/surveys/completion/notifications/me
   */
  @Get('notifications/me')
  @ApiOperation({
    summary: 'Get user notifications',
    description: 'Get completion notifications for the current user',
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by notification status',
    required: false,
    enum: NotificationStatus,
  })
  @ApiOkResponse({
    description: 'Notifications retrieved successfully',
    type: [NotificationResponseDto],
  })
  @Permissions('notification:read')
  async getUserNotifications(
    @Query('status') status?: NotificationStatus,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: NotificationResponseDto[]; message: string }> {
    this.logger.log(`Getting notifications for user ${user.id}`);

    const profile = await this.getUserProfile(user.id);
    const notifications = await this.completionTrackingService.getNotifications(
      profile.id,
      undefined,
      status
    );

    return {
      success: true,
      data: notifications,
      message: 'Notifications retrieved successfully',
    };
  }

  /**
   * Get notifications for teacher
   * GET /api/surveys/completion/notifications/teacher
   */
  @Get('notifications/teacher')
  @ApiOperation({
    summary: 'Get teacher notifications',
    description: 'Get completion notifications for the current teacher',
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by notification status',
    required: false,
    enum: NotificationStatus,
  })
  @ApiOkResponse({
    description: 'Teacher notifications retrieved successfully',
    type: [NotificationResponseDto],
  })
  @Roles('TEACHER', 'ADMIN')
  @Permissions('notification:read')
  async getTeacherNotifications(
    @Query('status') status?: NotificationStatus,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: NotificationResponseDto[]; message: string }> {
    this.logger.log(`Getting teacher notifications for user ${user.id}`);

    const notifications = await this.completionTrackingService.getNotifications(
      undefined,
      user.id,
      status
    );

    return {
      success: true,
      data: notifications,
      message: 'Teacher notifications retrieved successfully',
    };
  }

  /**
   * Process pending notifications (system endpoint)
   * POST /api/surveys/completion/notifications/process
   */
  @Post('notifications/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process pending notifications',
    description: 'Process and send all pending completion notifications (system use)',
  })
  @ApiOkResponse({
    description: 'Pending notifications processed successfully',
  })
  @Roles('ADMIN')
  @Permissions('system:admin')
  async processPendingNotifications(
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Processing pending notifications triggered by user ${user.id}`);

    await this.completionTrackingService.processPendingNotifications();

    return {
      success: true,
      message: 'Pending notifications processed successfully',
    };
  }

  // ====== HELPER METHODS ======

  private async getUserProfile(userId: string): Promise<any> {
    const { PrismaService } = await import('../../prisma/prisma.service');
    const prisma = new PrismaService();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user?.profile) {
      throw new Error('User profile not found');
    }

    return user.profile;
  }

  private async getTeacherClasses(teacherId: string): Promise<any[]> {
    const { PrismaService } = await import('../../prisma/prisma.service');
    const prisma = new PrismaService();
    
    return await prisma.class.findMany({
      where: { 
        teacher_id: teacherId,
        is_active: true 
      },
      select: {
        id: true,
        name: true,
      },
    });
  }
}
