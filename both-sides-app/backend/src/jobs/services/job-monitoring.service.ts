import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  JobEvent,
  JobListener,
  JobStats,
  QueueStats,
  JobStatus,
  JobType,
  JobQueue,
} from '../interfaces/job.interfaces';
import { QueueManagerService } from './queue-manager.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

/**
 * Interface for job monitoring dashboard data
 */
export interface JobDashboardData {
  overview: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: number;
    avgProcessingTime: number;
  };
  queueStats: QueueStats[];
  recentJobs: Array<{
    id: string;
    name: JobType;
    queue: JobQueue;
    status: JobStatus;
    progress?: number;
    createdAt: Date;
    completedAt?: Date;
    processingTime?: number;
    error?: string;
  }>;
  performanceMetrics: {
    throughput: {
      hourly: number;
      daily: number;
    };
    errorRates: Record<JobType, number>;
    averageWaitTimes: Record<JobQueue, number>;
  };
  systemHealth: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: string[];
  };
}

/**
 * Interface for job alerts and notifications
 */
export interface JobAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  jobId?: string;
  jobType?: JobType;
  queueName?: JobQueue;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Service for monitoring job processing and system health
 */
@Injectable()
export class JobMonitoringService implements JobListener {
  private readonly logger = new Logger(JobMonitoringService.name);
  private readonly MONITORING_KEY_PREFIX = 'job_monitoring';
  private readonly ALERT_RETENTION_HOURS = 24;
  private readonly METRICS_RETENTION_DAYS = 7;

  private alerts: Map<string, JobAlert> = new Map();
  private metricsBuffer: JobEvent[] = [];
  private lastHealthCheck: Date = new Date();

  constructor(
    private readonly queueManager: QueueManagerService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    // Register this service as a job listener
    this.queueManager.registerListener(this);
    
    // Start periodic monitoring tasks
    this.startPeriodicTasks();
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(): Promise<JobDashboardData> {
    const [overview, queueStats, recentJobs, performanceMetrics, systemHealth] = await Promise.all([
      this.getOverviewStats(),
      this.getAllQueueStats(),
      this.getRecentJobs(50),
      this.getPerformanceMetrics(),
      this.getSystemHealth(),
    ]);

    return {
      overview,
      queueStats,
      recentJobs,
      performanceMetrics,
      systemHealth,
    };
  }

  /**
   * Get overview statistics
   */
  private async getOverviewStats() {
    const stats = await this.queueManager.getJobStats('day');
    
    return {
      totalJobs: stats.totalJobs,
      activeJobs: stats.activeJobs,
      completedJobs: stats.completedJobs,
      failedJobs: stats.failedJobs,
      successRate: stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) : 1,
      avgProcessingTime: stats.avgProcessingTime,
    };
  }

  /**
   * Get statistics for all queues
   */
  private async getAllQueueStats(): Promise<QueueStats[]> {
    const queueNames = Object.values(JobQueue);
    const queueStatsPromises = queueNames.map(queueName =>
      this.queueManager.getQueueStats(queueName)
    );

    const queueStats = await Promise.allSettled(queueStatsPromises);
    
    return queueStats
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<QueueStats>).value);
  }

  /**
   * Get recent jobs across all queues
   */
  private async getRecentJobs(limit: number) {
    const [activeJobs, completedJobs, failedJobs] = await Promise.all([
      this.queueManager.getActiveJobs(Math.floor(limit / 3)),
      this.queueManager.getJobs([JobStatus.COMPLETED], undefined),
      this.queueManager.getFailedJobs(Math.floor(limit / 3)),
    ]);

    const allJobs = [
      ...activeJobs.map(job => this.mapJobForDashboard(job, 'active')),
      ...completedJobs.slice(0, Math.floor(limit / 3)).map(job => this.mapJobForDashboard(job, 'completed')),
      ...failedJobs.map(job => this.mapJobForDashboard(job, 'failed')),
    ];

    return allJobs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Map job data for dashboard display
   */
  private mapJobForDashboard(job: Job, status: string) {
    const processingTime = job.finishedOn && job.processedOn 
      ? job.finishedOn - job.processedOn 
      : undefined;

    return {
      id: job.id!,
      name: job.name as JobType,
      queue: job.queue.name as JobQueue,
      status: status as JobStatus,
      progress: job.progress ? (job.progress as any).percentage : undefined,
      createdAt: new Date(job.timestamp),
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      processingTime,
      error: job.failedReason || undefined,
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics() {
    const stats = await this.queueManager.getJobStats('day');
    
    // Calculate error rates by job type
    const errorRates: Record<JobType, number> = {} as any;
    Object.entries(stats.byType).forEach(([type, typeStats]) => {
      const totalJobs = typeStats.count;
      const failedJobs = totalJobs - typeStats.completed;
      errorRates[type as JobType] = totalJobs > 0 ? failedJobs / totalJobs : 0;
    });

    // Calculate average wait times by queue
    const averageWaitTimes: Record<JobQueue, number> = {} as any;
    const queueNames = Object.values(JobQueue);
    
    for (const queueName of queueNames) {
      try {
        const waitingJobs = await this.queueManager.getWaitingJobs(10);
        const queueWaitingJobs = waitingJobs.filter(job => job.queue.name === queueName);
        
        if (queueWaitingJobs.length > 0) {
          const avgWaitTime = queueWaitingJobs.reduce((sum, job) => {
            const waitTime = Date.now() - job.timestamp;
            return sum + waitTime;
          }, 0) / queueWaitingJobs.length;
          
          averageWaitTimes[queueName] = avgWaitTime;
        } else {
          averageWaitTimes[queueName] = 0;
        }
      } catch (error) {
        this.logger.warn(`Failed to calculate wait time for queue ${queueName}: ${error.message}`);
        averageWaitTimes[queueName] = 0;
      }
    }

    return {
      throughput: {
        hourly: stats.throughput,
        daily: stats.completedJobs,
      },
      errorRates,
      averageWaitTimes,
    };
  }

  /**
   * Get system health status
   */
  private async getSystemHealth() {
    const queueHealth = await this.queueManager.healthCheck();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check queue health
    if (queueHealth.status === 'unhealthy') {
      issues.push('One or more job queues are unhealthy');
      recommendations.push('Check Redis connection and worker processes');
    } else if (queueHealth.status === 'degraded') {
      issues.push('Some job queues are experiencing issues');
      recommendations.push('Monitor queue performance and consider scaling workers');
    }

    // Check for high failure rates
    const stats = await this.queueManager.getJobStats('hour');
    if (stats.failureRate > 0.1) {
      issues.push(`High failure rate: ${(stats.failureRate * 100).toFixed(1)}%`);
      recommendations.push('Review failed jobs and improve error handling');
    }

    // Check for job backlogs
    const queueStats = await this.getAllQueueStats();
    const backlogQueues = queueStats.filter(queue => queue.waiting > 50);
    if (backlogQueues.length > 0) {
      issues.push(`Job backlog detected in ${backlogQueues.length} queue(s)`);
      recommendations.push('Consider increasing worker concurrency or adding more workers');
    }

    // Check memory usage (if available)
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 512) { // 512MB threshold
      issues.push(`High memory usage: ${memoryUsageMB.toFixed(0)}MB`);
      recommendations.push('Monitor memory leaks and optimize job processing');
    }

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) {
      overallStatus = 'healthy';
    } else if (issues.length <= 2 && !issues.some(issue => issue.includes('unhealthy') || issue.includes('High failure'))) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      issues,
      recommendations,
    };
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<JobAlert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => {
        // Sort by severity and timestamp
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }

  /**
   * Create an alert
   */
  private createAlert(
    type: JobAlert['type'],
    severity: JobAlert['severity'],
    title: string,
    message: string,
    options: {
      jobId?: string;
      jobType?: JobType;
      queueName?: JobQueue;
      metadata?: Record<string, any>;
    } = {}
  ): JobAlert {
    const alert: JobAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      jobId: options.jobId,
      jobType: options.jobType,
      queueName: options.queueName,
      timestamp: new Date(),
      resolved: false,
      metadata: options.metadata,
    };

    this.alerts.set(alert.id, alert);
    this.logger.log(`Created ${severity} alert: ${title}`);

    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.logger.log(`Resolved alert: ${alert.title}`);
    return true;
  }

  /**
   * Store job metrics for analysis
   */
  private async storeJobMetrics(event: JobEvent) {
    try {
      const metricsKey = `${this.MONITORING_KEY_PREFIX}:metrics:${event.type}:${new Date().toISOString().split('T')[0]}`;
      
      const metrics = {
        jobId: event.jobId,
        jobType: event.jobType,
        queueName: event.queueName,
        timestamp: event.timestamp.toISOString(),
        data: event.data,
        error: event.error?.message,
      };

      await this.redis.lpush(metricsKey, JSON.stringify(metrics));
      
      // Set expiration for metrics
      const expireSeconds = this.METRICS_RETENTION_DAYS * 24 * 60 * 60;
      await this.redis.expire(metricsKey, expireSeconds);
      
    } catch (error) {
      this.logger.error(`Failed to store job metrics: ${error.message}`);
    }
  }

  /**
   * Start periodic monitoring tasks
   */
  private startPeriodicTasks() {
    // Health check every 5 minutes
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error(`Health check failed: ${error.message}`);
      }
    }, 5 * 60 * 1000);

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000);

    // Process metrics buffer every minute
    setInterval(async () => {
      await this.processMetricsBuffer();
    }, 60 * 1000);
  }

  /**
   * Perform periodic health check
   */
  private async performHealthCheck() {
    const health = await this.getSystemHealth();
    this.lastHealthCheck = new Date();

    // Create alerts for critical issues
    if (health.status === 'unhealthy') {
      this.createAlert(
        'error',
        'critical',
        'System Health Critical',
        `Job processing system is unhealthy: ${health.issues.join(', ')}`,
        { metadata: { issues: health.issues, recommendations: health.recommendations } }
      );
    } else if (health.status === 'degraded') {
      const existingAlert = Array.from(this.alerts.values()).find(
        alert => !alert.resolved && alert.title === 'System Performance Degraded'
      );
      
      if (!existingAlert) {
        this.createAlert(
          'warning',
          'medium',
          'System Performance Degraded',
          `Job processing performance is degraded: ${health.issues.join(', ')}`,
          { metadata: { issues: health.issues, recommendations: health.recommendations } }
        );
      }
    }
  }

  /**
   * Clean up old alerts
   */
  private cleanupOldAlerts() {
    const cutoffTime = Date.now() - (this.ALERT_RETENTION_HOURS * 60 * 60 * 1000);
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt.getTime() < cutoffTime) {
        this.alerts.delete(alertId);
      } else if (!alert.resolved && alert.timestamp.getTime() < cutoffTime - (24 * 60 * 60 * 1000)) {
        // Auto-resolve very old unresolved alerts
        alert.resolved = true;
        alert.resolvedAt = new Date();
      }
    }
  }

  /**
   * Process buffered metrics
   */
  private async processMetricsBuffer() {
    if (this.metricsBuffer.length === 0) return;

    const events = this.metricsBuffer.splice(0);
    
    for (const event of events) {
      await this.storeJobMetrics(event);
    }
  }

  // JobListener implementation

  async onJobCompleted(event: JobEvent): Promise<void> {
    this.metricsBuffer.push(event);
    this.logger.debug(`Job completed: ${event.jobId} (${event.jobType})`);
  }

  async onJobFailed(event: JobEvent): Promise<void> {
    this.metricsBuffer.push(event);
    
    // Create alert for critical job failures
    if (event.jobType === JobType.BATCH_ANALYSIS || 
        event.jobType === JobType.CLASS_ANALYTICS_UPDATE) {
      this.createAlert(
        'error',
        'high',
        'Critical Job Failed',
        `${event.jobType} job failed: ${event.error?.message || 'Unknown error'}`,
        {
          jobId: event.jobId,
          jobType: event.jobType,
          queueName: event.queueName,
        }
      );
    } else {
      // Check for patterns of failures
      const recentFailures = this.metricsBuffer
        .filter(e => 
          e.type === 'failed' && 
          e.jobType === event.jobType &&
          e.timestamp.getTime() > Date.now() - (60 * 60 * 1000) // Last hour
        );

      if (recentFailures.length >= 5) {
        this.createAlert(
          'warning',
          'medium',
          'High Job Failure Rate',
          `${event.jobType} jobs are failing frequently (${recentFailures.length} failures in the last hour)`,
          {
            jobType: event.jobType,
            queueName: event.queueName,
            metadata: { failureCount: recentFailures.length },
          }
        );
      }
    }

    this.logger.warn(`Job failed: ${event.jobId} (${event.jobType}) - ${event.error?.message}`);
  }

  async onJobProgress(event: JobEvent): Promise<void> {
    // Don't store all progress events, just log them
    if (event.progress && event.progress.percentage % 25 === 0) { // Log every 25%
      this.logger.debug(`Job progress: ${event.jobId} - ${event.progress.percentage}%`);
    }
  }

  async onJobActive(event: JobEvent): Promise<void> {
    this.logger.debug(`Job started: ${event.jobId} (${event.jobType})`);
  }

  async onJobStalled(event: JobEvent): Promise<void> {
    this.createAlert(
      'warning',
      'medium',
      'Job Stalled',
      `Job ${event.jobId} (${event.jobType}) has stalled and will be retried`,
      {
        jobId: event.jobId,
        jobType: event.jobType,
        queueName: event.queueName,
      }
    );

    this.logger.warn(`Job stalled: ${event.jobId} (${event.jobType})`);
  }

  async onJobWaiting(event: JobEvent): Promise<void> {
    // Check for jobs that have been waiting too long
    const job = await this.queueManager.getJob(event.jobId);
    if (job) {
      const waitTime = Date.now() - job.timestamp;
      const maxWaitTime = 15 * 60 * 1000; // 15 minutes

      if (waitTime > maxWaitTime) {
        this.createAlert(
          'warning',
          'low',
          'Long Job Wait Time',
          `Job ${event.jobId} has been waiting for ${Math.round(waitTime / 60000)} minutes`,
          {
            jobId: event.jobId,
            jobType: event.jobType,
            queueName: event.queueName,
            metadata: { waitTime },
          }
        );
      }
    }
  }

  /**
   * Get job performance trends
   */
  async getJobTrends(timeframe: 'hour' | 'day' | 'week'): Promise<{
    completionTrend: Array<{ timestamp: Date; count: number }>;
    failureTrend: Array<{ timestamp: Date; count: number }>;
    processingTimeTrend: Array<{ timestamp: Date; avgTime: number }>;
  }> {
    // Implementation would depend on stored metrics
    // For now, return empty trends
    return {
      completionTrend: [],
      failureTrend: [],
      processingTimeTrend: [],
    };
  }
}
