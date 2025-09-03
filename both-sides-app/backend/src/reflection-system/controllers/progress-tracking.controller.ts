/**
 * Progress Tracking Controller
 * REST API endpoints for progress monitoring, gamification, analytics,
 * and achievement management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
  HttpException,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReflectionProgressService } from '../services/reflection-progress.service';
import { GamificationService } from '../services/gamification.service';
import {
  ReflectionProgress,
  ProgressTrackingConfiguration,
  ProgressEvent,
  ProgressInsight,
  ProgressPrediction,
  PredictiveIntervention,
  ProgressAnalyticsReport,
  Achievement,
  Badge,
  Streak,
  PointsBreakdown,
  PointsSource,
  StudentLevel,
  ProgressSnapshot,
  RecoveryData,
  ProgressTrackingLevel,
  ProgressEventType,
  AchievementCategory
} from '../interfaces/progress-tracking.interfaces';
import {
  InitializeProgressTrackingDto,
  UpdateProgressDto,
  CreateProgressSnapshotDto,
  RecoverProgressDto,
  UpdatePointsDto,
  UpdateStreakDto,
  LeaderboardQueryDto
} from '../dto/progress-tracking.dto';

@ApiTags('Progress Tracking')
@ApiBearerAuth()
@Controller('reflections/progress')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ProgressTrackingController {
  private readonly logger = new Logger(ProgressTrackingController.name);

  constructor(
    private readonly progressService: ReflectionProgressService,
    private readonly gamificationService: GamificationService
  ) {}

  // =============================================
  // Core Progress Tracking Endpoints
  // =============================================

  @Post('initialize/:sessionId')
  @ApiOperation({
    summary: 'Initialize progress tracking',
    description: 'Sets up comprehensive progress tracking for a reflection session'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiBody({ type: InitializeProgressTrackingDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Progress tracking initialized successfully',
    type: ReflectionProgress
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async initializeProgressTracking(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() initDto: InitializeProgressTrackingDto
  ): Promise<ReflectionProgress> {
    this.logger.log(`Initializing progress tracking for session: ${sessionId}`);

    try {
      const progress = await this.progressService.initializeProgressTracking(
        sessionId,
        initDto.configuration
      );

      this.logger.log(`Progress tracking initialized: ${progress.id}`);
      return progress;

    } catch (error) {
      this.logger.error(`Failed to initialize progress tracking: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to initialize progress tracking: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('session/:sessionId')
  @ApiOperation({
    summary: 'Get session progress',
    description: 'Retrieves current progress data for a reflection session'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress retrieved successfully',
    type: ReflectionProgress
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Progress not found' })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getSessionProgress(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<ReflectionProgress> {
    this.logger.log(`Getting progress for session: ${sessionId}`);

    try {
      const progress = await this.progressService.getProgress(sessionId);
      
      if (!progress) {
        throw new HttpException('Progress not found', HttpStatus.NOT_FOUND);
      }

      // Ensure user has access to this session
      if (progress.userId !== user.id && !user.roles.includes('TEACHER') && !user.roles.includes('ADMIN')) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      return progress;

    } catch (error) {
      this.logger.error(`Failed to get session progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('session/:sessionId/update')
  @ApiOperation({
    summary: 'Update progress',
    description: 'Updates progress based on user activity and events'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiBody({ type: UpdateProgressDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress updated successfully',
    type: ReflectionProgress
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async updateProgress(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() updateDto: UpdateProgressDto
  ): Promise<ReflectionProgress> {
    this.logger.debug(`Updating progress for session: ${sessionId}, event: ${updateDto.event.type}`);

    try {
      const progress = await this.progressService.updateProgress(sessionId, updateDto.event);
      return progress;

    } catch (error) {
      this.logger.error(`Failed to update progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Analytics and Insights Endpoints
  // =============================================

  @Get('session/:sessionId/insights')
  @ApiOperation({
    summary: 'Get progress insights',
    description: 'Retrieves AI-generated insights and recommendations for progress'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Insights generated successfully',
    type: [ProgressInsight]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getProgressInsights(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<ProgressInsight[]> {
    this.logger.log(`Getting progress insights for session: ${sessionId}`);

    try {
      const insights = await this.progressService.generateProgressInsights(sessionId);
      return insights;

    } catch (error) {
      this.logger.error(`Failed to get progress insights: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('session/:sessionId/report')
  @ApiOperation({
    summary: 'Generate progress report',
    description: 'Generates comprehensive analytics report with insights and recommendations'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiQuery({ name: 'includeComparisons', type: Boolean, required: false, description: 'Include peer/historical comparisons' })
  @ApiQuery({ name: 'includePredictions', type: Boolean, required: false, description: 'Include predictive analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ProgressAnalyticsReport
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async generateProgressReport(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Query('includeComparisons') includeComparisons?: boolean,
    @Query('includePredictions') includePredictions?: boolean
  ): Promise<ProgressAnalyticsReport> {
    this.logger.log(`Generating progress report for session: ${sessionId}`);

    try {
      const report = await this.progressService.generateProgressReport(sessionId);
      return report;

    } catch (error) {
      this.logger.error(`Failed to generate progress report: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('session/:sessionId/predictions')
  @ApiOperation({
    summary: 'Get progress predictions',
    description: 'Retrieves AI-powered predictions about progress outcomes'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Predictions generated successfully',
    type: [ProgressPrediction]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getProgressPredictions(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<ProgressPrediction[]> {
    this.logger.log(`Getting progress predictions for session: ${sessionId}`);

    try {
      const predictions = await this.progressService.predictOutcomes(sessionId);
      return predictions;

    } catch (error) {
      this.logger.error(`Failed to get progress predictions: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('session/:sessionId/interventions')
  @ApiOperation({
    summary: 'Get intervention suggestions',
    description: 'Retrieves AI-recommended interventions to improve progress'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Interventions generated successfully',
    type: [PredictiveIntervention]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getInterventionSuggestions(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<PredictiveIntervention[]> {
    this.logger.log(`Getting intervention suggestions for session: ${sessionId}`);

    try {
      const interventions = await this.progressService.suggestInterventions(sessionId);
      return interventions;

    } catch (error) {
      this.logger.error(`Failed to get intervention suggestions: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Progress Persistence and Recovery
  // =============================================

  @Post('session/:sessionId/snapshot')
  @ApiOperation({
    summary: 'Create progress snapshot',
    description: 'Creates a snapshot of current progress for recovery purposes'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiBody({ type: CreateProgressSnapshotDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Snapshot created successfully',
    type: ProgressSnapshot
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async createProgressSnapshot(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() snapshotDto: CreateProgressSnapshotDto
  ): Promise<ProgressSnapshot> {
    this.logger.log(`Creating progress snapshot for session: ${sessionId}`);

    try {
      const snapshot = await this.progressService.createProgressSnapshot(
        sessionId,
        snapshotDto.type
      );

      return snapshot;

    } catch (error) {
      this.logger.error(`Failed to create progress snapshot: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('session/:sessionId/recover')
  @ApiOperation({
    summary: 'Recover progress',
    description: 'Recovers progress from a snapshot after interruption'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiBody({ type: RecoverProgressDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress recovered successfully',
    type: RecoveryData
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async recoverProgress(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() recoverDto: RecoverProgressDto
  ): Promise<RecoveryData> {
    this.logger.log(`Recovering progress for session: ${sessionId}`);

    try {
      const recovery = await this.progressService.recoverProgress(
        sessionId,
        recoverDto.snapshotId
      );

      return recovery;

    } catch (error) {
      this.logger.error(`Failed to recover progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Gamification Endpoints
  // =============================================

  @Get('user/achievements')
  @ApiOperation({
    summary: 'Get user achievements',
    description: 'Retrieves all achievements earned by the current user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Achievements retrieved successfully',
    type: [Achievement]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getUserAchievements(@CurrentUser() user: any): Promise<Achievement[]> {
    this.logger.log(`Getting achievements for user: ${user.id}`);

    try {
      const achievements = await this.gamificationService.getUserAchievements(user.id);
      return achievements;

    } catch (error) {
      this.logger.error(`Failed to get user achievements: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('user/achievements/available')
  @ApiOperation({
    summary: 'Get available achievements',
    description: 'Retrieves achievements that can still be earned by the user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available achievements retrieved successfully',
    type: [Achievement]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getAvailableAchievements(@CurrentUser() user: any): Promise<Achievement[]> {
    this.logger.log(`Getting available achievements for user: ${user.id}`);

    try {
      const achievements = await this.gamificationService.getAvailableAchievements(user.id);
      return achievements;

    } catch (error) {
      this.logger.error(`Failed to get available achievements: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('session/:sessionId/check-achievements')
  @ApiOperation({
    summary: 'Check for new achievements',
    description: 'Checks if user has earned any new achievements and awards them'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Achievement check completed',
    type: [Achievement]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async checkAchievements(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<Achievement[]> {
    this.logger.log(`Checking achievements for session: ${sessionId}`);

    try {
      const newAchievements = await this.progressService.checkAchievements(sessionId);
      return newAchievements;

    } catch (error) {
      this.logger.error(`Failed to check achievements: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('user/badges')
  @ApiOperation({
    summary: 'Get user badges',
    description: 'Retrieves all badges earned by the current user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Badges retrieved successfully',
    type: [Badge]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getUserBadges(@CurrentUser() user: any): Promise<Badge[]> {
    this.logger.log(`Getting badges for user: ${user.id}`);

    try {
      const badges = await this.gamificationService.getUserBadges(user.id);
      return badges;

    } catch (error) {
      this.logger.error(`Failed to get user badges: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('user/streaks')
  @ApiOperation({
    summary: 'Get user streaks',
    description: 'Retrieves current streaks for the user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Streaks retrieved successfully',
    type: [Streak]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getUserStreaks(@CurrentUser() user: any): Promise<Streak[]> {
    this.logger.log(`Getting streaks for user: ${user.id}`);

    try {
      const streaks = await this.gamificationService.getUserStreaks(user.id);
      return streaks;

    } catch (error) {
      this.logger.error(`Failed to get user streaks: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put('user/streaks')
  @ApiOperation({
    summary: 'Update streak',
    description: 'Updates user streak based on activity'
  })
  @ApiBody({ type: UpdateStreakDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Streak updated successfully',
    type: [Streak]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async updateStreak(
    @CurrentUser() user: any,
    @Body() streakDto: UpdateStreakDto
  ): Promise<Streak[]> {
    this.logger.log(`Updating streak for user: ${user.id}, activity: ${streakDto.activity}`);

    try {
      const updatedStreaks = await this.gamificationService.updateStreak(
        user.id,
        streakDto.streakType,
        streakDto.activity
      );

      return updatedStreaks;

    } catch (error) {
      this.logger.error(`Failed to update streak: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('user/points')
  @ApiOperation({
    summary: 'Get user points',
    description: 'Retrieves current points breakdown for the user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Points retrieved successfully',
    type: PointsBreakdown
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getUserPoints(@CurrentUser() user: any): Promise<PointsBreakdown> {
    this.logger.log(`Getting points for user: ${user.id}`);

    try {
      const points = await this.gamificationService.getUserPoints(user.id);
      return points;

    } catch (error) {
      this.logger.error(`Failed to get user points: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('session/:sessionId/points')
  @ApiOperation({
    summary: 'Update user points',
    description: 'Awards points to user from a specific source'
  })
  @ApiParam({ name: 'sessionId', description: 'Reflection session ID' })
  @ApiBody({ type: UpdatePointsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Points updated successfully',
    type: PointsBreakdown
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async updatePoints(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() pointsDto: UpdatePointsDto
  ): Promise<PointsBreakdown> {
    this.logger.log(`Updating points for session: ${sessionId}, source: ${pointsDto.source.source}`);

    try {
      const points = await this.progressService.updatePoints(sessionId, pointsDto.source);
      return points;

    } catch (error) {
      this.logger.error(`Failed to update points: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('user/level')
  @ApiOperation({
    summary: 'Get user level',
    description: 'Retrieves current level and progression for the user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Level retrieved successfully',
    type: StudentLevel
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getUserLevel(@CurrentUser() user: any): Promise<StudentLevel> {
    this.logger.log(`Getting level for user: ${user.id}`);

    try {
      const points = await this.gamificationService.getUserPoints(user.id);
      return points.level;

    } catch (error) {
      this.logger.error(`Failed to get user level: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Leaderboard Endpoints
  // =============================================

  @Get('leaderboard')
  @ApiOperation({
    summary: 'Get leaderboard',
    description: 'Retrieves the points leaderboard'
  })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Number of entries to return (max 100)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Leaderboard retrieved successfully'
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getLeaderboard(
    @CurrentUser() user: any,
    @Query('limit') limit: number = 50
  ): Promise<Array<{ userId: string; points: number; level: StudentLevel }>> {
    this.logger.log(`Getting leaderboard with limit: ${limit}`);

    try {
      // Clamp limit to reasonable bounds
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      
      const leaderboard = await this.gamificationService.getLeaderboard(safeLimit);
      
      // Filter out sensitive data if needed
      return leaderboard.map(entry => ({
        userId: entry.userId,
        points: entry.points,
        level: entry.level
      }));

    } catch (error) {
      this.logger.error(`Failed to get leaderboard: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('user/rank')
  @ApiOperation({
    summary: 'Get user leaderboard rank',
    description: 'Retrieves the current user\'s position on the leaderboard'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rank retrieved successfully'
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getUserRank(@CurrentUser() user: any): Promise<{ rank: number; totalUsers: number } | null> {
    this.logger.log(`Getting rank for user: ${user.id}`);

    try {
      const rank = await this.gamificationService.getUserLeaderboardRank(user.id);
      return rank;

    } catch (error) {
      this.logger.error(`Failed to get user rank: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Teacher Analytics Endpoints
  // =============================================

  @Get('class/:classId/overview')
  @ApiOperation({
    summary: 'Get class progress overview',
    description: 'Retrieves progress analytics for an entire class'
  })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Class overview retrieved successfully'
  })
  @Roles('TEACHER', 'ADMIN')
  async getClassProgressOverview(
    @CurrentUser() user: any,
    @Param('classId') classId: string
  ): Promise<any> {
    this.logger.log(`Getting class progress overview for class: ${classId}`);

    try {
      // TODO: Implement class progress overview
      return {
        classId,
        totalStudents: 0,
        averageProgress: 0,
        completionRate: 0,
        engagementLevel: 'moderate',
        topPerformers: [],
        strugglingStudents: [],
        insights: []
      };

    } catch (error) {
      this.logger.error(`Failed to get class progress overview: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('class/:classId/students')
  @ApiOperation({
    summary: 'Get student progress list',
    description: 'Retrieves progress data for all students in a class'
  })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student progress list retrieved successfully'
  })
  @Roles('TEACHER', 'ADMIN')
  async getClassStudentProgress(
    @CurrentUser() user: any,
    @Param('classId') classId: string
  ): Promise<any[]> {
    this.logger.log(`Getting student progress for class: ${classId}`);

    try {
      // TODO: Implement class student progress retrieval
      return [];

    } catch (error) {
      this.logger.error(`Failed to get class student progress: ${error.message}`, error.stack);
      throw error;
    }
  }
}
