import {
  Controller,
  Get,
  Put,
  Query,
  Param,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

import { JobMonitoringService } from '../services/job-monitoring.service';
import { QueueManagerService } from '../services/queue-manager.service';
import { JobQueue } from '../interfaces/job.interfaces';

/**
 * Controller for job monitoring and dashboard operations
 */
@ApiTags('Job Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs/monitoring')
export class JobMonitoringController {
  constructor(
    private readonly monitoringService: JobMonitoringService,
    private readonly queueManager: QueueManagerService,
  ) {}

  /**
   * Get comprehensive dashboard data
   */
  @Get('dashboard')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get job monitoring dashboard data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard data retrieved successfully' })
  async getDashboard() {
    const dashboardData = await this.monitoringService.getDashboardData();

    return {
      success: true,
      data: dashboardData,
    };
  }

  /**
   * Get queue statistics
   */
  @Get('queues/stats')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get statistics for all job queues' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queue statistics retrieved successfully' })
  async getQueueStats() {
    const queueNames = Object.values(JobQueue);
    const queueStatsPromises = queueNames.map(async queueName => {
      try {
        return await this.queueManager.getQueueStats(queueName);
      } catch (error) {
        return {
          queueName,
          error: error.message,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: false,
          throughput: { hour: 0, day: 0 },
          avgProcessingTime: 0,
          failureRate: 0,
        };
      }
    });

    const queueStats = await Promise.all(queueStatsPromises);

    return {
      success: true,
      data: queueStats,
    };
  }

  /**
   * Get statistics for a specific queue
   */
  @Get('queues/:queueName/stats')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get statistics for a specific queue' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queue statistics retrieved successfully' })
  async getQueueStatsByName(@Param('queueName') queueName: string) {
    if (!Object.values(JobQueue).includes(queueName as JobQueue)) {
      throw new NotFoundException(`Queue not found: ${queueName}`);
    }

    const stats = await this.queueManager.getQueueStats(queueName);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get job statistics
   */
  @Get('jobs/stats')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get job processing statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Job statistics retrieved successfully' })
  async getJobStats(@Query('timeframe') timeframe: 'hour' | 'day' | 'week' = 'day') {
    const stats = await this.queueManager.getJobStats(timeframe);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get active alerts
   */
  @Get('alerts')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get active monitoring alerts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alerts retrieved successfully' })
  async getActiveAlerts() {
    const alerts = await this.monitoringService.getActiveAlerts();

    return {
      success: true,
      data: alerts,
    };
  }

  /**
   * Resolve an alert
   */
  @Put('alerts/:alertId/resolve')
  @Roles('admin')
  @ApiOperation({ summary: 'Resolve a monitoring alert' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert resolved successfully' })
  async resolveAlert(@Param('alertId') alertId: string) {
    const resolved = await this.monitoringService.resolveAlert(alertId);

    if (!resolved) {
      throw new NotFoundException(`Alert not found: ${alertId}`);
    }

    return {
      success: true,
      message: 'Alert resolved successfully',
    };
  }

  /**
   * Get system health status
   */
  @Get('health')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get job processing system health' })
  @ApiResponse({ status: HttpStatus.OK, description: 'System health retrieved successfully' })
  async getSystemHealth() {
    const queueHealth = await this.queueManager.healthCheck();
    const dashboardData = await this.monitoringService.getDashboardData();

    return {
      success: true,
      data: {
        overall_status: queueHealth.status,
        queue_health: queueHealth,
        system_health: dashboardData.systemHealth,
        checks: {
          queues_operational: queueHealth.status !== 'unhealthy',
          workers_active: Object.values(queueHealth.details.workers || {}).some(worker => worker === true),
          redis_connected: queueHealth.status !== 'unhealthy',
          low_error_rate: dashboardData.overview.successRate > 0.9,
          no_critical_alerts: dashboardData.systemHealth.issues.length === 0,
        },
        recommendations: dashboardData.systemHealth.recommendations,
      },
    };
  }

  /**
   * Get recent failed jobs
   */
  @Get('jobs/failed')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get recent failed jobs' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Failed jobs retrieved successfully' })
  async getFailedJobs(@Query('limit') limit = '20') {
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const failedJobs = await this.queueManager.getFailedJobs(limitNum);

    const jobs = failedJobs.map(job => ({
      jobId: job.id,
      name: job.name,
      queue: job.queue.name,
      error: job.failedReason,
      createdAt: new Date(job.timestamp),
      failedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      data: this.sanitizeJobData(job.data),
    }));

    return {
      success: true,
      data: jobs,
    };
  }

  /**
   * Get active jobs
   */
  @Get('jobs/active')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get currently active jobs' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active jobs retrieved successfully' })
  async getActiveJobs(@Query('limit') limit = '20') {
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const activeJobs = await this.queueManager.getActiveJobs(limitNum);

    const jobs = activeJobs.map(job => {
      const progress = job.progress as any;
      return {
        jobId: job.id,
        name: job.name,
        queue: job.queue.name,
        progress: progress ? {
          percentage: progress.percentage,
          stage: progress.stage,
          message: progress.message,
          estimatedTimeRemaining: progress.estimatedTimeRemaining,
        } : undefined,
        createdAt: new Date(job.timestamp),
        startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        processingTime: job.processedOn ? Date.now() - job.processedOn : 0,
        data: this.sanitizeJobData(job.data),
      };
    });

    return {
      success: true,
      data: jobs,
    };
  }

  /**
   * Get job performance trends
   */
  @Get('trends')
  @Roles('admin')
  @ApiOperation({ summary: 'Get job performance trends' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Performance trends retrieved successfully' })
  async getJobTrends(@Query('timeframe') timeframe: 'hour' | 'day' | 'week' = 'day') {
    const trends = await this.monitoringService.getJobTrends(timeframe);

    return {
      success: true,
      data: trends,
    };
  }

  /**
   * Pause a queue
   */
  @Put('queues/:queueName/pause')
  @Roles('admin')
  @ApiOperation({ summary: 'Pause job processing for a queue' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queue paused successfully' })
  async pauseQueue(@Param('queueName') queueName: string) {
    if (!Object.values(JobQueue).includes(queueName as JobQueue)) {
      throw new NotFoundException(`Queue not found: ${queueName}`);
    }

    await this.queueManager.pauseQueue(queueName);

    return {
      success: true,
      message: `Queue ${queueName} paused successfully`,
    };
  }

  /**
   * Resume a queue
   */
  @Put('queues/:queueName/resume')
  @Roles('admin')
  @ApiOperation({ summary: 'Resume job processing for a queue' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queue resumed successfully' })
  async resumeQueue(@Param('queueName') queueName: string) {
    if (!Object.values(JobQueue).includes(queueName as JobQueue)) {
      throw new NotFoundException(`Queue not found: ${queueName}`);
    }

    await this.queueManager.resumeQueue(queueName);

    return {
      success: true,
      message: `Queue ${queueName} resumed successfully`,
    };
  }

  /**
   * Clean old jobs from a queue
   */
  @Put('queues/:queueName/clean')
  @Roles('admin')
  @ApiOperation({ summary: 'Clean old jobs from a queue' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queue cleaned successfully' })
  async cleanQueue(
    @Param('queueName') queueName: string,
    @Query('grace') grace = '3600000', // 1 hour default
    @Query('status') status = 'completed',
  ) {
    if (!Object.values(JobQueue).includes(queueName as JobQueue)) {
      throw new NotFoundException(`Queue not found: ${queueName}`);
    }

    const graceMs = parseInt(grace);
    const cleanedCount = await this.queueManager.cleanQueue(queueName, graceMs, status as any);

    return {
      success: true,
      data: {
        queueName,
        cleanedCount,
        status,
        graceTime: graceMs,
      },
      message: `Cleaned ${cleanedCount} jobs from queue ${queueName}`,
    };
  }

  /**
   * Get detailed job information
   */
  @Get('jobs/:jobId/details')
  @Roles('admin', 'teacher')
  @ApiOperation({ summary: 'Get detailed information about a specific job' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Job details retrieved successfully' })
  async getJobDetails(@Param('jobId') jobId: string) {
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
          current: progress.current,
          total: progress.total,
          stage: progress.stage,
          message: progress.message,
          estimatedTimeRemaining: progress.estimatedTimeRemaining,
          details: progress.details,
        } : undefined,
        options: {
          priority: job.opts.priority,
          attempts: job.opts.attempts,
          delay: job.opts.delay,
          removeOnComplete: job.opts.removeOnComplete,
          removeOnFail: job.opts.removeOnFail,
        },
        timestamps: {
          createdAt: new Date(job.timestamp),
          startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
          completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
        },
        processingTime,
        attempts: {
          made: job.attemptsMade,
          max: job.opts.attempts || 3,
        },
        result: job.returnvalue ? this.sanitizeJobResult(job.returnvalue) : undefined,
        error: job.failedReason ? {
          message: job.failedReason,
          stack: job.stacktrace,
          retryable: job.attemptsMade < (job.opts.attempts || 3),
        } : undefined,
        data: this.sanitizeJobData(job.data),
      },
    };
  }

  // Helper methods

  private getJobStatus(job: any): string {
    if (job.finishedOn && !job.failedReason) return 'completed';
    if (job.failedReason) return 'failed';
    if (job.processedOn) return 'active';
    return 'waiting';
  }

  private sanitizeJobData(data: any): any {
    if (!data) return null;

    // Remove sensitive information from job data
    const sanitized = { ...data };
    
    // Remove potential sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.apiKey;

    // Truncate large objects
    if (sanitized.config && typeof sanitized.config === 'object') {
      sanitized.config = this.truncateObject(sanitized.config, 5);
    }

    if (sanitized.metadata && typeof sanitized.metadata === 'object') {
      sanitized.metadata = this.truncateObject(sanitized.metadata, 5);
    }

    return sanitized;
  }

  private sanitizeJobResult(result: any): any {
    if (!result) return null;

    // Truncate large results for display
    if (typeof result === 'object') {
      return this.truncateObject(result, 10);
    }

    if (typeof result === 'string' && result.length > 1000) {
      return result.substring(0, 1000) + '...';
    }

    return result;
  }

  private truncateObject(obj: any, maxKeys: number): any {
    if (!obj || typeof obj !== 'object') return obj;

    const keys = Object.keys(obj);
    if (keys.length <= maxKeys) return obj;

    const truncated: any = {};
    for (let i = 0; i < maxKeys; i++) {
      const key = keys[i];
      truncated[key] = obj[key];
    }
    truncated['...'] = `${keys.length - maxKeys} more keys`;

    return truncated;
  }
}
