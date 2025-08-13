import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchDto, UserListDto } from './dto/user-search.dto';
import { UpdateUserStatusDto, BulkUserStatusDto, BulkImportUserDto, BulkUpdateUserDto } from './dto/user-status.dto';
import { UserAnalyticsDto, UserEngagementDto } from './dto/user-analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Clerk User Created Webhook
   * Called when a new user is created in Clerk
   */
  @Post('webhooks/clerk/user/created')
  @HttpCode(HttpStatus.OK)
  async handleUserCreated(
    @Body() payload: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    try {
      // Verify webhook signature (implement webhook verification)
      this.verifyWebhookSignature(payload, svixId, svixTimestamp, svixSignature);

      const { data } = payload;
      this.logger.log(`Received user.created webhook for Clerk ID: ${data.id}`);

      // Extract user data from Clerk webhook payload
      const createUserDto: CreateUserDto = {
        clerk_id: data.id,
        email: data.email_addresses?.[0]?.email_address,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        avatar_url: data.profile_image_url,
        // Default to STUDENT role, can be updated later
        role: UserRole.STUDENT,
      };

      const user = await this.usersService.createUser(createUserDto);

      return {
        success: true,
        message: 'User created successfully',
        user_id: user.id,
      };
    } catch (error) {
      this.logger.error(`Failed to handle user.created webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Clerk User Updated Webhook
   * Called when a user is updated in Clerk
   */
  @Post('webhooks/clerk/user/updated')
  @HttpCode(HttpStatus.OK)
  async handleUserUpdated(
    @Body() payload: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    try {
      this.verifyWebhookSignature(payload, svixId, svixTimestamp, svixSignature);

      const { data } = payload;
      this.logger.log(`Received user.updated webhook for Clerk ID: ${data.id}`);

      const updateUserDto: UpdateUserDto = {
        email: data.email_addresses?.[0]?.email_address,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        avatar_url: data.profile_image_url,
      };

      const user = await this.usersService.updateUser(data.id, updateUserDto);

      return {
        success: true,
        message: 'User updated successfully',
        user_id: user.id,
      };
    } catch (error) {
      this.logger.error(`Failed to handle user.updated webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Clerk User Deleted Webhook
   * Called when a user is deleted in Clerk
   */
  @Post('webhooks/clerk/user/deleted')
  @HttpCode(HttpStatus.OK)
  async handleUserDeleted(
    @Body() payload: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    try {
      this.verifyWebhookSignature(payload, svixId, svixTimestamp, svixSignature);

      const { data } = payload;
      this.logger.log(`Received user.deleted webhook for Clerk ID: ${data.id}`);

      const user = await this.usersService.deleteUser(data.id);

      return {
        success: true,
        message: 'User deleted successfully',
        user_id: user.id,
      };
    } catch (error) {
      this.logger.error(`Failed to handle user.deleted webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Get current user profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@User() user: any) {
    return this.usersService.findByClerkId(user.sub);
  }

  /**
   * Update current user's last login
   */
  @Put('me/login')
  @UseGuards(JwtAuthGuard)
  async updateLastLogin(@User() user: any) {
    return this.usersService.updateLastLogin(user.sub);
  }

  /**
   * Get user by Clerk ID (admin only)
   */
  @Get(':clerk_id')
  @UseGuards(JwtAuthGuard)
  async getUserByClerkId(@Param('clerk_id') clerk_id: string) {
    return this.usersService.findByClerkId(clerk_id);
  }

  /**
   * Get all users with pagination and enhanced filtering
   * GET /api/users
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@Query() userListDto: UserListDto) {
    try {
      const { page = 1, limit = 50, role, active, organization_id, sortBy = 'created_at', sortOrder = 'desc' } = userListDto;
      
      const skip = (page - 1) * limit;
      const take = Math.min(limit, 100); // Cap at 100

      const where: any = {};

      if (role) {
        where.role = role;
      }

      if (active !== undefined) {
        where.is_active = active;
      }

      if (organization_id) {
        where.OR = [
          {
            enrollments: {
              some: {
                class: {
                  organization_id,
                },
              },
            },
          },
          {
            created_classes: {
              some: {
                organization_id,
              },
            },
          },
        ];
      }

      const orderBy = { [sortBy]: sortOrder };

      const result = await this.usersService.findAll({
        skip,
        take,
        where,
        orderBy,
      });

      return {
        success: true,
        data: result.users,
        pagination: {
          page,
          limit: take,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasMore,
        },
        message: `Retrieved ${result.users.length} users`,
      };
    } catch (error) {
      this.logger.error(`Failed to get users: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve users');
    }
  }

  /**
   * Advanced user search with multiple criteria
   * GET /api/users/search
   */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchUsers(@Query() searchDto: UserSearchDto) {
    try {
      const result = await this.usersService.searchUsers(searchDto);
      
      return {
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit: searchDto.limit || 50,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasMore,
        },
        searchCriteria: result.searchCriteria,
        message: `Found ${result.users.length} users matching criteria`,
      };
    } catch (error) {
      this.logger.error(`Failed to search users: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to search users');
    }
  }

  /**
   * Verify Clerk webhook signature
   * This is a simplified version - in production, use Clerk's webhook verification library
   */
  private verifyWebhookSignature(
    payload: any,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
  ) {
    // TODO: Implement proper Clerk webhook signature verification
    // For now, we'll just log that we received the webhook
    // In production, use: https://docs.svix.com/receiving/verifying-payloads/how
    
    if (!svixId || !svixTimestamp || !svixSignature) {
      this.logger.warn('Missing webhook signature headers');
      // For development, we'll allow it but log a warning
      // In production, this should throw an error
    }

    this.logger.log(`Webhook signature verification - ID: ${svixId}, Timestamp: ${svixTimestamp}`);
  }

  // =============================================================================
  // USER STATUS MANAGEMENT ENDPOINTS - Task 2.2.6.2
  // =============================================================================

  /**
   * Activate a user
   * PUT /api/users/:id/activate
   */
  @Put(':id/activate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async activateUser(
    @Param('id') userId: string,
    @Body() body: { reason?: string },
    @User() currentUser: any,
  ) {
    try {
      const statusDto: UpdateUserStatusDto = {
        status: 'ACTIVE' as any,
        reason: body.reason || 'Activated by administrator',
      };
      
      const result = await this.usersService.updateUserStatus(userId, statusDto);
      
      return {
        success: true,
        data: result,
        message: 'User activated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to activate user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to activate user');
    }
  }

  /**
   * Deactivate a user
   * PUT /api/users/:id/deactivate
   */
  @Put(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deactivateUser(
    @Param('id') userId: string,
    @Body() body: { reason?: string },
    @User() currentUser: any,
  ) {
    try {
      const statusDto: UpdateUserStatusDto = {
        status: 'DEACTIVATED' as any,
        reason: body.reason || 'Deactivated by administrator',
      };
      
      const result = await this.usersService.updateUserStatus(userId, statusDto);
      
      return {
        success: true,
        data: result,
        message: 'User deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to deactivate user');
    }
  }

  /**
   * Suspend a user
   * PUT /api/users/:id/suspend
   */
  @Put(':id/suspend')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('id') userId: string,
    @Body() body: { reason?: string },
    @User() currentUser: any,
  ) {
    try {
      const statusDto: UpdateUserStatusDto = {
        status: 'SUSPENDED' as any,
        reason: body.reason || 'Suspended by administrator',
      };
      
      const result = await this.usersService.updateUserStatus(userId, statusDto);
      
      return {
        success: true,
        data: result,
        message: 'User suspended successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to suspend user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to suspend user');
    }
  }

  // =============================================================================
  // BULK USER OPERATIONS ENDPOINTS - Task 2.2.6.3
  // =============================================================================

  /**
   * Bulk import users
   * POST /api/users/bulk/import
   */
  @Post('bulk/import')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async bulkImportUsers(
    @Body() importDto: BulkImportUserDto,
    @User() currentUser: any,
  ) {
    try {
      const result = await this.usersService.bulkImportUsers(importDto);
      
      return {
        success: true,
        data: result,
        message: `Bulk import completed: ${result.summary.successful} successful, ${result.summary.failed} failed, ${result.summary.duplicates} duplicates`,
      };
    } catch (error) {
      this.logger.error(`Failed to bulk import users: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to bulk import users');
    }
  }

  /**
   * Bulk update user status
   * PUT /api/users/bulk/status
   */
  @Put('bulk/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async bulkUpdateUserStatus(
    @Body() bulkStatusDto: BulkUserStatusDto,
    @User() currentUser: any,
  ) {
    try {
      const result = await this.usersService.bulkUpdateUserStatus(bulkStatusDto);
      
      return {
        success: true,
        data: result,
        message: `Bulk status update completed: ${result.updatedCount} users updated to ${result.status}`,
      };
    } catch (error) {
      this.logger.error(`Failed to bulk update user status: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to bulk update user status');
    }
  }

  /**
   * Bulk deactivate users
   * DELETE /api/users/bulk/deactivate
   */
  @Delete('bulk/deactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async bulkDeactivateUsers(
    @Body() bulkDto: { user_ids: string[]; reason?: string },
    @User() currentUser: any,
  ) {
    try {
      const bulkStatusDto: BulkUserStatusDto = {
        user_ids: bulkDto.user_ids,
        status: 'DEACTIVATED' as any,
        reason: bulkDto.reason || 'Bulk deactivated by administrator',
      };
      
      const result = await this.usersService.bulkUpdateUserStatus(bulkStatusDto);
      
      return {
        success: true,
        data: result,
        message: `Bulk deactivation completed: ${result.updatedCount} users deactivated`,
      };
    } catch (error) {
      this.logger.error(`Failed to bulk deactivate users: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to bulk deactivate users');
    }
  }

  // =============================================================================
  // USER RELATIONSHIP ENDPOINTS - Task 2.2.6.4
  // =============================================================================

  /**
   * Get user's classes
   * GET /api/users/:id/classes
   */
  @Get(':id/classes')
  @UseGuards(JwtAuthGuard)
  async getUserClasses(@Param('id') userId: string) {
    try {
      const relationships = await this.usersService.getUserRelationships(userId);
      
      const classes = [...relationships.enrollments.map(e => ({
        ...e.class,
        enrollmentStatus: e.enrollment_status,
        enrolledAt: e.enrolled_at,
        type: 'enrolled',
      })), ...relationships.createdClasses.map(c => ({
        ...c,
        type: 'created',
      }))];
      
      return {
        success: true,
        data: {
          classes,
          statistics: {
            totalClasses: classes.length,
            enrolledClasses: relationships.enrollments.length,
            createdClasses: relationships.createdClasses.length,
          },
        },
        message: `Retrieved ${classes.length} classes for user`,
      };
    } catch (error) {
      this.logger.error(`Failed to get user classes: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve user classes');
    }
  }

  /**
   * Get user's enrollments
   * GET /api/users/:id/enrollments
   */
  @Get(':id/enrollments')
  @UseGuards(JwtAuthGuard)
  async getUserEnrollments(@Param('id') userId: string) {
    try {
      const relationships = await this.usersService.getUserRelationships(userId);
      
      return {
        success: true,
        data: {
          enrollments: relationships.enrollments,
          statistics: {
            totalEnrollments: relationships.statistics.totalEnrollments,
            activeEnrollments: relationships.statistics.activeEnrollments,
          },
        },
        message: `Retrieved ${relationships.enrollments.length} enrollments for user`,
      };
    } catch (error) {
      this.logger.error(`Failed to get user enrollments: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve user enrollments');
    }
  }

  /**
   * Get user activity summary
   * GET /api/users/:id/activity
   */
  @Get(':id/activity')
  @UseGuards(JwtAuthGuard)
  async getUserActivity(
    @Param('id') userId: string,
    @Query() query: { days?: string },
  ) {
    try {
      const days = query.days ? parseInt(query.days) : 30;
      const relationships = await this.usersService.getUserRelationships(userId);
      const engagement = await this.usersService.getUserEngagementMetrics({
        userId,
        days,
      });
      
      const activity = {
        user: relationships.user,
        profile: relationships.profile,
        recentActivity: {
          enrollments: relationships.enrollments.filter(e => {
            const enrolledDate = new Date(e.enrolled_at);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            return enrolledDate >= cutoff;
          }),
          createdClasses: relationships.createdClasses.filter(c => {
            const createdDate = new Date(c.created_at);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            return createdDate >= cutoff;
          }),
        },
        engagementMetrics: engagement[0] || null,
        statistics: relationships.statistics,
      };
      
      return {
        success: true,
        data: activity,
        message: `Retrieved activity summary for user (last ${days} days)`,
      };
    } catch (error) {
      this.logger.error(`Failed to get user activity: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve user activity');
    }
  }

  // =============================================================================
  // USER STATISTICS AND ANALYTICS ENDPOINTS - Task 2.2.6.5
  // =============================================================================

  /**
   * Get user statistics
   * GET /api/users/stats
   */
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard)
  async getUserStatistics(@Query() query: UserAnalyticsDto) {
    try {
      const options: any = {};
      
      if (query.startDate) {
        options.startDate = new Date(query.startDate);
      }
      
      if (query.endDate) {
        options.endDate = new Date(query.endDate);
      }
      
      if (query.organization_id) {
        options.organizationId = query.organization_id;
      }
      
      if (query.role) {
        options.role = query.role as UserRole;
      }
      
      const statistics = await this.usersService.getUserStatistics(options);
      
      return {
        success: true,
        data: statistics,
        message: 'User statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get user statistics: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve user statistics');
    }
  }

  /**
   * Get user engagement metrics
   * GET /api/users/engagement
   */
  @Get('engagement/metrics')
  @UseGuards(JwtAuthGuard)
  async getUserEngagementMetrics(@Query() query: UserEngagementDto) {
    try {
      const options: any = {
        days: query.days || 30,
        limit: 50,
      };
      
      if (query.user_id) {
        options.userId = query.user_id;
      }
      
      const metrics = await this.usersService.getUserEngagementMetrics(options);
      
      return {
        success: true,
        data: {
          metrics,
          summary: {
            totalUsers: metrics.length,
            averageEngagementScore: metrics.length > 0 
              ? Math.round(metrics.reduce((sum, m) => sum + m.engagementScore, 0) / metrics.length)
              : 0,
            highEngagementUsers: metrics.filter(m => m.engagementScore >= 80).length,
            lowEngagementUsers: metrics.filter(m => m.engagementScore < 40).length,
          },
        },
        message: `Retrieved engagement metrics for ${metrics.length} users`,
      };
    } catch (error) {
      this.logger.error(`Failed to get user engagement metrics: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve user engagement metrics');
    }
  }

  /**
   * Get user reports (combined analytics)
   * GET /api/users/reports
   */
  @Get('reports/combined')
  @UseGuards(JwtAuthGuard)
  async getUserReports(@Query() query: UserAnalyticsDto) {
    try {
      const options: any = {};
      
      if (query.startDate) {
        options.startDate = new Date(query.startDate);
      }
      
      if (query.endDate) {
        options.endDate = new Date(query.endDate);
      }
      
      if (query.organization_id) {
        options.organizationId = query.organization_id;
      }
      
      if (query.role) {
        options.role = query.role as UserRole;
      }
      
      const [statistics, topEngagedUsers] = await Promise.all([
        this.usersService.getUserStatistics(options),
        this.usersService.getUserEngagementMetrics({ limit: 10, days: 30 }),
      ]);
      
      const report = {
        statistics,
        topEngagedUsers,
        trends: {
          userGrowthRate: statistics.recentRegistrations / Math.max(statistics.totalUsers - statistics.recentRegistrations, 1),
          engagementRate: statistics.engagementMetrics.weeklyActiveUsers / Math.max(statistics.totalUsers, 1),
          profileCompletionTrend: statistics.profileCompletionRate,
        },
        recommendations: [],
      };
      
      // Add recommendations based on data
      if (report.statistics.profileCompletionRate < 70) {
        report.recommendations.push({
          type: 'profile_completion',
          message: 'Consider implementing profile completion incentives - completion rate is below 70%',
          priority: 'high',
        });
      }
      
      if (report.trends.engagementRate < 0.3) {
        report.recommendations.push({
          type: 'engagement',
          message: 'Weekly engagement rate is low - consider user re-engagement campaigns',
          priority: 'medium',
        });
      }
      
      return {
        success: true,
        data: report,
        message: 'User analytics report generated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to generate user reports: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate user reports');
    }
  }
}
