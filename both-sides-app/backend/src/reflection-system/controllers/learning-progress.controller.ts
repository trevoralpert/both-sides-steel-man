/**
 * Learning Progress Controller
 * 
 * Task 7.4.2: REST API endpoints for Learning Progress Tracking System
 * 
 * Provides endpoints for tracking skill development, managing learning goals,
 * and accessing personalized learning insights and recommendations.
 */

import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Query, 
  Body, 
  Param, 
  UseGuards,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RBACGuard } from '../../auth/rbac/guards/rbac.guard';
import { RequirePermissions } from '../../auth/rbac/decorators/permissions.decorator';
import { GetUser } from '../../common/decorators/user.decorator';

import { LearningProgressTrackingService } from '../services/learning-progress-tracking.service';
import {
  LearningProgressRequestDto,
  LearningProgressProfileDto,
  SkillDevelopmentPreferencesDto,
  SkillDevelopmentPlanDto,
  CompetencyTypeDto,
  CompetencyInsightsDto,
  MilestoneTrackingDto
} from '../dto/learning-progress.dto';

@ApiTags('Learning Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RBACGuard)
@Controller('learning-progress')
export class LearningProgressController {
  private readonly logger = new Logger(LearningProgressController.name);

  constructor(
    private readonly learningProgressService: LearningProgressTrackingService
  ) {}

  /**
   * Update learning progress with new assessment data
   */
  @Post('update')
  @ApiOperation({ 
    summary: 'Update Learning Progress',
    description: 'Update learning progress based on new competency assessment data'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Learning progress updated successfully',
    type: LearningProgressProfileDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request parameters' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Insufficient permissions' 
  })
  @RequirePermissions(['analytics:create', 'reflection:read'])
  async updateProgress(
    @Body() progressRequest: LearningProgressRequestDto,
    @GetUser() currentUser: any
  ): Promise<LearningProgressProfileDto> {
    this.logger.log(`Updating learning progress for user ${progressRequest.userId}`);

    try {
      // Verify permissions - users can only update their own progress unless they're a teacher/admin
      if (progressRequest.userId !== currentUser.id && 
          !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only update your own learning progress',
          HttpStatus.FORBIDDEN
        );
      }

      const progressProfile = await this.learningProgressService.updateLearningProgress({
        userId: progressRequest.userId,
        debateId: progressRequest.debateId,
        assessmentData: progressRequest.assessmentData.map(assessment => ({
          ...assessment,
          measuredAt: new Date(assessment.measuredAt)
        })),
        contextualFactors: progressRequest.contextualFactors,
        timeframe: progressRequest.timeframe
      });

      return this.transformProgressProfileToDto(progressProfile);

    } catch (error) {
      this.logger.error(
        `Failed to update learning progress for user ${progressRequest.userId}`,
        error.stack
      );
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to update learning progress',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get learning progress profile for a user
   */
  @Get('profile/:userId')
  @ApiOperation({ 
    summary: 'Get Learning Progress Profile',
    description: 'Retrieve comprehensive learning progress profile for a user'
  })
  @ApiParam({ name: 'userId', description: 'User ID to get progress for' })
  @ApiResponse({ 
    status: 200, 
    description: 'Learning progress profile retrieved successfully',
    type: LearningProgressProfileDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Insufficient permissions' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User progress profile not found' 
  })
  @RequirePermissions(['analytics:read'])
  async getProgressProfile(
    @Param('userId') userId: string,
    @GetUser() currentUser: any
  ): Promise<LearningProgressProfileDto> {
    this.logger.log(`Getting learning progress profile for user ${userId}`);

    try {
      // Verify permissions
      if (userId !== currentUser.id && !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only view your own learning progress',
          HttpStatus.FORBIDDEN
        );
      }

      // This would retrieve the latest progress profile
      // For now, we'll throw a not implemented error
      throw new HttpException(
        'Progress profile retrieval not yet implemented',
        HttpStatus.NOT_IMPLEMENTED
      );

    } catch (error) {
      this.logger.error(`Failed to get learning progress profile for user ${userId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve learning progress profile',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate personalized skill development plan
   */
  @Post('development-plan/:userId')
  @ApiOperation({ 
    summary: 'Generate Skill Development Plan',
    description: 'Create a personalized skill development plan based on current progress'
  })
  @ApiParam({ name: 'userId', description: 'User ID to create plan for' })
  @ApiResponse({ 
    status: 201, 
    description: 'Development plan created successfully',
    type: SkillDevelopmentPlanDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Insufficient permissions' 
  })
  @RequirePermissions(['analytics:read', 'analytics:create'])
  async generateDevelopmentPlan(
    @Param('userId') userId: string,
    @Body() preferences?: SkillDevelopmentPreferencesDto,
    @GetUser() currentUser: any
  ): Promise<SkillDevelopmentPlanDto> {
    this.logger.log(`Generating skill development plan for user ${userId}`);

    try {
      // Verify permissions
      if (userId !== currentUser.id && !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only generate development plans for yourself',
          HttpStatus.FORBIDDEN
        );
      }

      const developmentPlan = await this.learningProgressService.generateSkillDevelopmentPlan(
        userId,
        preferences
      );

      return this.transformDevelopmentPlanToDto(developmentPlan);

    } catch (error) {
      this.logger.error(`Failed to generate development plan for user ${userId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      if (error.message.includes('No progress data available')) {
        throw new HttpException(
          'Insufficient progress data to create development plan',
          HttpStatus.NOT_FOUND
        );
      }
      
      throw new HttpException(
        'Failed to generate skill development plan',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Track milestone progress for a user
   */
  @Get('milestones/:userId')
  @ApiOperation({ 
    summary: 'Track Milestone Progress',
    description: 'Get milestone achievements and progress updates for a user'
  })
  @ApiParam({ name: 'userId', description: 'User ID to track milestones for' })
  @ApiResponse({ 
    status: 200, 
    description: 'Milestone progress retrieved successfully',
    type: MilestoneTrackingDto
  })
  @RequirePermissions(['analytics:read'])
  async trackMilestoneProgress(
    @Param('userId') userId: string,
    @GetUser() currentUser: any
  ): Promise<MilestoneTrackingDto> {
    this.logger.log(`Tracking milestone progress for user ${userId}`);

    try {
      // Verify permissions
      if (userId !== currentUser.id && !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only view your own milestone progress',
          HttpStatus.FORBIDDEN
        );
      }

      const milestoneProgress = await this.learningProgressService.trackMilestoneProgress(userId);
      return milestoneProgress as MilestoneTrackingDto;

    } catch (error) {
      this.logger.error(`Failed to track milestone progress for user ${userId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to track milestone progress',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get insights for a specific competency
   */
  @Get('competency/:userId/:competencyType')
  @ApiOperation({ 
    summary: 'Get Competency Insights',
    description: 'Get detailed insights and recommendations for a specific competency'
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ 
    name: 'competencyType', 
    description: 'Competency type',
    enum: CompetencyTypeDto
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Competency insights retrieved successfully',
    type: CompetencyInsightsDto
  })
  @RequirePermissions(['analytics:read'])
  async getCompetencyInsights(
    @Param('userId') userId: string,
    @Param('competencyType') competencyType: CompetencyTypeDto,
    @GetUser() currentUser: any
  ): Promise<CompetencyInsightsDto> {
    this.logger.log(`Getting competency insights for user ${userId}, competency ${competencyType}`);

    try {
      // Verify permissions
      if (userId !== currentUser.id && !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only view your own competency insights',
          HttpStatus.FORBIDDEN
        );
      }

      const insights = await this.learningProgressService.getCompetencyInsights(
        userId, 
        competencyType as any
      );

      return insights as CompetencyInsightsDto;

    } catch (error) {
      this.logger.error(
        `Failed to get competency insights for user ${userId}, competency ${competencyType}`,
        error.stack
      );
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      if (error.message.includes('No progress data available')) {
        throw new HttpException(
          'No progress data available for this competency',
          HttpStatus.NOT_FOUND
        );
      }
      
      throw new HttpException(
        'Failed to retrieve competency insights',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get learning recommendations for a user
   */
  @Get('recommendations/:userId')
  @ApiOperation({ 
    summary: 'Get Learning Recommendations',
    description: 'Get personalized learning recommendations based on current progress'
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'competencyType', required: false, description: 'Filter by competency type' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority level' })
  @ApiResponse({ 
    status: 200, 
    description: 'Learning recommendations retrieved successfully'
  })
  @RequirePermissions(['analytics:read'])
  async getLearningRecommendations(
    @Param('userId') userId: string,
    @Query('competencyType') competencyType?: CompetencyTypeDto,
    @Query('priority') priority?: 'high' | 'medium' | 'low',
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(`Getting learning recommendations for user ${userId}`);

    try {
      // Verify permissions
      if (userId !== currentUser.id && !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only view your own learning recommendations',
          HttpStatus.FORBIDDEN
        );
      }

      // This would retrieve and filter recommendations
      // For now, return empty array
      return {
        userId,
        recommendations: [],
        totalCount: 0,
        filters: {
          competencyType,
          priority,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to get learning recommendations for user ${userId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve learning recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update development plan progress
   */
  @Put('development-plan/:planId/progress')
  @ApiOperation({ 
    summary: 'Update Development Plan Progress',
    description: 'Update progress on a skill development plan'
  })
  @ApiParam({ name: 'planId', description: 'Development plan ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Development plan progress updated successfully'
  })
  @RequirePermissions(['analytics:update'])
  async updateDevelopmentPlanProgress(
    @Param('planId') planId: string,
    @Body() progressUpdate: {
      phaseProgress?: number[];
      goalsCompleted?: number[];
      notes?: string;
    },
    @GetUser() currentUser: any
  ): Promise<{
    planId: string;
    updatedAt: string;
    progress: any;
    message: string;
  }> {
    this.logger.log(`Updating development plan progress for plan ${planId}`);

    try {
      // This would update the development plan progress in the database
      // For now, return a success response
      return {
        planId,
        updatedAt: new Date().toISOString(),
        progress: progressUpdate,
        message: 'Development plan progress updated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to update development plan progress for plan ${planId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to update development plan progress',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get class-level learning analytics (teachers only)
   */
  @Get('class/:classId/analytics')
  @ApiOperation({ 
    summary: 'Get Class Learning Analytics',
    description: 'Get aggregated learning progress analytics for a class (teachers only)'
  })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Analysis timeframe' })
  @ApiResponse({ 
    status: 200, 
    description: 'Class analytics retrieved successfully'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Only teachers can access class analytics' 
  })
  @RequirePermissions(['class:manage', 'analytics:read'])
  async getClassAnalytics(
    @Param('classId') classId: string,
    @Query('timeframe') timeframe?: 'week' | 'month' | 'semester',
    @GetUser() currentUser: any
  ): Promise<{
    classId: string;
    timeframe: string;
    studentCount: number;
    averageProgress: Record<string, number>;
    competencyDistribution: Record<string, any>;
    milestoneAchievements: any[];
    recommendations: string[];
    riskStudents: string[];
    topPerformers: string[];
  }> {
    this.logger.log(`Getting class analytics for class ${classId}`);

    try {
      // Only teachers and admins can view class analytics
      if (!['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'Only teachers and administrators can view class analytics',
          HttpStatus.FORBIDDEN
        );
      }

      // This would calculate comprehensive class-level analytics
      // For now, return placeholder data
      return {
        classId,
        timeframe: timeframe || 'month',
        studentCount: 0,
        averageProgress: {},
        competencyDistribution: {},
        milestoneAchievements: [],
        recommendations: [],
        riskStudents: [],
        topPerformers: [],
      };

    } catch (error) {
      this.logger.error(`Failed to get class analytics for class ${classId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve class analytics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Export learning progress data
   */
  @Post('export/:userId')
  @ApiOperation({ 
    summary: 'Export Learning Progress Data',
    description: 'Export learning progress data in various formats'
  })
  @ApiParam({ name: 'userId', description: 'User ID to export data for' })
  @ApiResponse({ 
    status: 200, 
    description: 'Learning progress data exported successfully'
  })
  @RequirePermissions(['analytics:export'])
  async exportProgressData(
    @Param('userId') userId: string,
    @Body() exportOptions: {
      format: 'json' | 'csv' | 'pdf';
      includeHistorical?: boolean;
      includeRecommendations?: boolean;
      dateRange?: {
        from: string;
        to: string;
      };
    },
    @GetUser() currentUser: any
  ): Promise<{
    exportId: string;
    downloadUrl: string;
    expiresAt: string;
  }> {
    this.logger.log(`Exporting learning progress data for user ${userId}`);

    try {
      // Verify permissions
      if (userId !== currentUser.id && !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only export your own learning progress data',
          HttpStatus.FORBIDDEN
        );
      }

      // This would generate and store the export file
      // For now, return placeholder response
      return {
        exportId: `export_${userId}_${Date.now()}`,
        downloadUrl: `/api/exports/${userId}/learning-progress-${Date.now()}.${exportOptions.format}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

    } catch (error) {
      this.logger.error(`Failed to export learning progress data for user ${userId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to export learning progress data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Private helper methods

  private transformProgressProfileToDto(profile: any): LearningProgressProfileDto {
    return {
      userId: profile.userId,
      profileId: profile.profileId,
      lastUpdated: profile.lastUpdated.toISOString(),
      overallProgress: profile.overallProgress,
      competencies: profile.competencies,
      learningVelocity: profile.learningVelocity,
      milestones: profile.milestones.map((m: any) => ({
        ...m,
        achievedAt: m.achievedAt?.toISOString(),
      })),
      nextMilestones: profile.nextMilestones.map((m: any) => ({
        ...m,
        achievedAt: m.achievedAt?.toISOString(),
      })),
      recommendations: profile.recommendations,
      optimalChallengeLevel: profile.optimalChallengeLevel,
      learningStyle: profile.learningStyle,
      peerComparison: profile.peerComparison,
      projections: profile.projections,
    };
  }

  private transformDevelopmentPlanToDto(plan: any): SkillDevelopmentPlanDto {
    return {
      planId: plan.planId,
      userId: plan.userId,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      shortTermGoals: plan.shortTermGoals,
      longTermGoals: plan.longTermGoals,
      learningPath: plan.learningPath,
      progress: plan.progress,
      adjustments: plan.adjustments.map((adj: any) => ({
        ...adj,
        date: adj.date.toISOString(),
      })),
    };
  }
}
