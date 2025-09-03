import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

import { QueueManagerService } from '../services/queue-manager.service';
import {
  JobType,
  JobPriority,
  TranscriptAnalysisJobData,
  BatchAnalysisJobData,
  LearningInsightsJobData,
  ReflectionProcessingJobData,
  CacheWarmupJobData,
  DataCleanupJobData,
  NotificationJobData,
} from '../interfaces/job.interfaces';

/**
 * DTOs for job management API
 */
class ScheduleJobDto {
  jobType: JobType;
  data: any;
  priority?: JobPriority;
  delay?: number;
}

class ScheduleAnalysisDto {
  conversationId: string;
  analysisTypes: string[];
  priority?: JobPriority;
  config?: {
    includeDetailed?: boolean;
    languageModel?: string;
    customPrompts?: Record<string, string>;
  };
}

class ScheduleBatchAnalysisDto {
  conversationIds: string[];
  analysisTypes: string[];
  priority?: JobPriority;
  batchConfig?: {
    parallelLimit?: number;
    failureTolerance?: number;
    progressUpdateInterval?: number;
  };
}

class ScheduleLearningInsightsDto {
  conversationId: string;
  userId: string;
  insightTypes: string[];
  priority?: JobPriority;
  config?: {
    personalizationLevel?: 'basic' | 'detailed' | 'advanced';
    includeRecommendations?: boolean;
    compareToClass?: boolean;
  };
}

/**
 * Controller for job management operations
 */
@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly queueManager: QueueManagerService) {}

  /**
   * Schedule a transcript analysis job
   */
  @Post('analysis/transcript')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Schedule transcript analysis job' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Job scheduled successfully' })
  async scheduleTranscriptAnalysis(
    @Body() dto: ScheduleAnalysisDto,
    @GetUser() user: User,
  ) {
    const jobData: TranscriptAnalysisJobData = {
      conversationId: dto.conversationId,
      analysisTypes: dto.analysisTypes,
      userId: user.id,
      priority: dto.priority || JobPriority.NORMAL,
      config: dto.config,
      requestId: `transcript_${Date.now()}_${user.id}`,
    };

    const job = await this.queueManager.schedule(
      JobType.TRANSCRIPT_ANALYSIS,
      jobData,
      { priority: dto.priority }
    );

    return {
      success: true,
      data: {
        jobId: job.id,
        status: 'scheduled',
        estimatedCompletion: this.estimateCompletionTime(JobType.TRANSCRIPT_ANALYSIS),
      },
      message: 'Transcript analysis job scheduled successfully',
    };
  }

  /**
   * Schedule a batch analysis job
   */
  @Post('analysis/batch')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Schedule batch analysis job' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Batch job scheduled successfully' })
  async scheduleBatchAnalysis(
    @Body() dto: ScheduleBatchAnalysisDto,
    @GetUser() user: User,
  ) {
    if (dto.conversationIds.length > 100) {
      throw new BadRequestException('Maximum 100 conversations per batch');
    }

    const jobData: BatchAnalysisJobData = {
      conversationIds: dto.conversationIds,
      analysisTypes: dto.analysisTypes,
      userId: user.id,
      priority: dto.priority || JobPriority.NORMAL,
      batchConfig: dto.batchConfig,
      requestId: `batch_${Date.now()}_${user.id}`,
    };

    const job = await this.queueManager.schedule(
      JobType.BATCH_ANALYSIS,
      jobData,
      { priority: dto.priority }
    );

    return {
      success: true,
      data: {
        jobId: job.id,
        batchSize: dto.conversationIds.length,
        status: 'scheduled',
        estimatedCompletion: this.estimateCompletionTime(JobType.BATCH_ANALYSIS, dto.conversationIds.length),
      },
      message: 'Batch analysis job scheduled successfully',
    };
  }

  /**
   * Schedule learning insights generation
   */
  @Post('insights')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Schedule learning insights generation' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Insights job scheduled successfully' })
  async scheduleLearningInsights(
    @Body() dto: ScheduleLearningInsightsDto,
    @GetUser() user: User,
  ) {
    const jobData: LearningInsightsJobData = {
      conversationId: dto.conversationId,
      userId: dto.userId,
      insightTypes: dto.insightTypes,
      priority: dto.priority || JobPriority.NORMAL,
      config: dto.config,
      requestId: `insights_${Date.now()}_${user.id}`,
    };

    const job = await this.queueManager.schedule(
      JobType.LEARNING_INSIGHTS,
      jobData,
      { priority: dto.priority }
    );

    return {
      success: true,
      data: {
        jobId: job.id,
        targetUserId: dto.userId,
        status: 'scheduled',
        estimatedCompletion: this.estimateCompletionTime(JobType.LEARNING_INSIGHTS),
      },
      message: 'Learning insights job scheduled successfully',
    };
  }

  /**
   * Schedule cache warmup
   */
  @Post('maintenance/cache-warmup')
  @Roles('admin')
  @ApiOperation({ summary: 'Schedule cache warmup job' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Cache warmup job scheduled successfully' })
  async scheduleCacheWarmup(
    @Body() body: { cacheType: string; targetIds?: string[]; classIds?: string[] },
    @GetUser() user: User,
  ) {
    const jobData: CacheWarmupJobData = {
      cacheType: body.cacheType as any,
      targetIds: body.targetIds,
      userId: user.id,
      priority: JobPriority.LOW,
      config: {
        priorityClasses: body.classIds,
        forceRefresh: false,
      },
      requestId: `cache_warmup_${Date.now()}_${user.id}`,
    };

    const job = await this.queueManager.schedule(
      JobType.CACHE_WARMUP,
      jobData,
      { priority: JobPriority.LOW }
    );

    return {
      success: true,
      data: {
        jobId: job.id,
        cacheType: body.cacheType,
        status: 'scheduled',
      },
      message: 'Cache warmup job scheduled successfully',
    };
  }

  /**
   * Schedule data cleanup
   */
  @Post('maintenance/cleanup')
  @Roles('admin')
  @ApiOperation({ summary: 'Schedule data cleanup job' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Cleanup job scheduled successfully' })
  async scheduleDataCleanup(
    @Body() body: { cleanupType: string; retentionDays?: number; dryRun?: boolean },
    @GetUser() user: User,
  ) {
    const jobData: DataCleanupJobData = {
      cleanupType: body.cleanupType as any,
      userId: user.id,
      priority: JobPriority.LOW,
      config: {
        retentionDays: body.retentionDays || 30,
        dryRun: body.dryRun || false,
        notifyAdmins: true,
      },
      requestId: `cleanup_${Date.now()}_${user.id}`,
    };

    const job = await this.queueManager.schedule(
      JobType.DATA_CLEANUP,
      jobData,
      { priority: JobPriority.LOW }
    );

    return {
      success: true,
      data: {
        jobId: job.id,
        cleanupType: body.cleanupType,
        dryRun: body.dryRun,
        status: 'scheduled',
      },
      message: 'Data cleanup job scheduled successfully',
    };
  }

  /**
   * Get job status
   */
  @Get(':jobId/status')
  @ApiOperation({ summary: 'Get job status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Job status retrieved successfully' })
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.queueManager.getJob(jobId);
    
    if (!job) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    const progress = job.progress as any;
    const processingTime = job.finishedOn && job.processedOn 
      ? job.finishedOn - job.processedOn 
      : undefined;

    return {
      success: true,
      data: {
        jobId: job.id,
        name: job.name,
        queue: job.queue.name,
        status: this.getJobStatus(job),
        progress: progress ? {
          percentage: progress.percentage,
          stage: progress.stage,
          message: progress.message,
          estimatedTimeRemaining: progress.estimatedTimeRemaining,
        } : undefined,
        createdAt: new Date(job.timestamp),
        startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        processingTime,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: job.failedReason ? {
          message: job.failedReason,
          retryable: job.attemptsMade < (job.opts.attempts || 3),
        } : undefined,
      },
    };
  }

  /**
   * Cancel a job
   */
  @Delete(':jobId')
  @ApiOperation({ summary: 'Cancel a job' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Job cancelled successfully' })
  async cancelJob(@Param('jobId') jobId: string, @GetUser() user: User) {
    // Check if user has permission to cancel this job
    const job = await this.queueManager.getJob(jobId);
    
    if (!job) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    // Only allow cancelling own jobs unless admin
    const jobData = job.data as any;
    if (jobData.userId !== user.id && !user.roles?.includes('admin')) {
      throw new BadRequestException('Cannot cancel jobs created by other users');
    }

    await this.queueManager.cancelJob(jobId);

    return {
      success: true,
      message: 'Job cancelled successfully',
    };
  }

  /**
   * Retry a failed job
   */
  @Put(':jobId/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Job retry scheduled successfully' })
  async retryJob(@Param('jobId') jobId: string, @GetUser() user: User) {
    const job = await this.queueManager.getJob(jobId);
    
    if (!job) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    if (!job.failedReason) {
      throw new BadRequestException('Job is not in a failed state');
    }

    // Only allow retrying own jobs unless admin
    const jobData = job.data as any;
    if (jobData.userId !== user.id && !user.roles?.includes('admin')) {
      throw new BadRequestException('Cannot retry jobs created by other users');
    }

    await this.queueManager.retryJob(jobId);

    return {
      success: true,
      message: 'Job retry scheduled successfully',
    };
  }

  /**
   * Get user's jobs
   */
  @Get('my-jobs')
  @ApiOperation({ summary: 'Get current user jobs' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User jobs retrieved successfully' })
  async getMyJobs(
    @GetUser() user: User,
    @Query('status') status?: string,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offsetNum = Math.max(0, parseInt(offset));

    // Get jobs from all queues
    const allJobs = await this.queueManager.getJobs(['waiting', 'active', 'completed', 'failed'] as any);
    
    // Filter by user and status
    const userJobs = allJobs.filter(job => {
      const jobData = job.data as any;
      const matchesUser = jobData.userId === user.id;
      const matchesStatus = !status || this.getJobStatus(job) === status;
      return matchesUser && matchesStatus;
    });

    // Sort by creation date (newest first)
    userJobs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const paginatedJobs = userJobs.slice(offsetNum, offsetNum + limitNum);

    const jobs = paginatedJobs.map(job => {
      const progress = job.progress as any;
      return {
        jobId: job.id,
        name: job.name,
        queue: job.queue.name,
        status: this.getJobStatus(job),
        progress: progress?.percentage || 0,
        createdAt: new Date(job.timestamp),
        completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        error: job.failedReason || undefined,
      };
    });

    return {
      success: true,
      data: jobs,
      pagination: {
        total: userJobs.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < userJobs.length,
      },
    };
  }

  /**
   * Get job types and their descriptions
   */
  @Get('types')
  @ApiOperation({ summary: 'Get available job types' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Job types retrieved successfully' })
  async getJobTypes() {
    const jobTypes = {
      [JobType.TRANSCRIPT_ANALYSIS]: {
        name: 'Transcript Analysis',
        description: 'AI-powered analysis of debate transcripts',
        estimatedDuration: '1-3 minutes',
        permissions: ['teacher', 'admin'],
      },
      [JobType.BATCH_ANALYSIS]: {
        name: 'Batch Analysis',
        description: 'Bulk analysis of multiple debate transcripts',
        estimatedDuration: '5-30 minutes',
        permissions: ['teacher', 'admin'],
      },
      [JobType.LEARNING_INSIGHTS]: {
        name: 'Learning Insights',
        description: 'Personalized learning insights generation',
        estimatedDuration: '30 seconds - 2 minutes',
        permissions: ['teacher', 'admin'],
      },
      [JobType.CACHE_WARMUP]: {
        name: 'Cache Warmup',
        description: 'Preload frequently accessed data into cache',
        estimatedDuration: '1-10 minutes',
        permissions: ['admin'],
      },
      [JobType.DATA_CLEANUP]: {
        name: 'Data Cleanup',
        description: 'Remove old or expired data',
        estimatedDuration: '5-60 minutes',
        permissions: ['admin'],
      },
    };

    return {
      success: true,
      data: jobTypes,
    };
  }

  // Helper methods

  private getJobStatus(job: any): string {
    if (job.finishedOn && !job.failedReason) return 'completed';
    if (job.failedReason) return 'failed';
    if (job.processedOn) return 'active';
    return 'waiting';
  }

  private estimateCompletionTime(jobType: JobType, batchSize?: number): Date {
    const baseTimes = {
      [JobType.TRANSCRIPT_ANALYSIS]: 2 * 60 * 1000, // 2 minutes
      [JobType.BATCH_ANALYSIS]: (batchSize || 1) * 30 * 1000, // 30 seconds per conversation
      [JobType.LEARNING_INSIGHTS]: 90 * 1000, // 90 seconds
      [JobType.CACHE_WARMUP]: 5 * 60 * 1000, // 5 minutes
      [JobType.DATA_CLEANUP]: 30 * 60 * 1000, // 30 minutes
      [JobType.DEBATE_SUMMARY]: 60 * 1000, // 1 minute
      [JobType.ARGUMENT_ANALYSIS]: 90 * 1000, // 90 seconds
    };

    const estimatedTime = baseTimes[jobType] || 60 * 1000;
    return new Date(Date.now() + estimatedTime);
  }
}
