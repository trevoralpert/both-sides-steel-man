/**
 * Background Job Processing Foundation - Phase 7 Exports
 * 
 * This module provides comprehensive background job processing capabilities
 * for the Both Sides application, including AI analysis, batch processing,
 * monitoring, and queue management.
 */

// Core Services
export { QueueManagerService } from './services/queue-manager.service';
export { JobMonitoringService } from './services/job-monitoring.service';

// Job Processors
export { BaseJobProcessor, BaseAIProcessor } from './processors/base.processor';
export { TranscriptAnalysisProcessor, TranscriptAnalysisResult } from './processors/transcript-analysis.processor';
export { BatchAnalysisProcessor, BatchAnalysisResult } from './processors/batch-analysis.processor';

// Controllers
export { JobsController } from './controllers/jobs.controller';
export { JobMonitoringController } from './controllers/job-monitoring.controller';

// Interfaces and Types
export {
  // Enums
  JobPriority,
  JobStatus,
  JobType,
  JobQueue,
  
  // Core Interfaces
  BaseJobData,
  JobResult,
  JobProgress,
  JobConfig,
  QueueConfig,
  JobProcessor,
  JobScheduler,
  JobMonitor,
  QueueStats,
  JobStats,
  JobEvent,
  JobListener,
  
  // Specific Job Data Interfaces
  TranscriptAnalysisJobData,
  DebateSummaryJobData,
  ArgumentAnalysisJobData,
  LearningInsightsJobData,
  BatchAnalysisJobData,
  ClassAnalyticsJobData,
  ReflectionProcessingJobData,
  CacheWarmupJobData,
  DataCleanupJobData,
  NotificationJobData,
} from './interfaces/job.interfaces';

// Monitoring Interfaces
export {
  JobDashboardData,
  JobAlert,
} from './services/job-monitoring.service';

// Module
export { JobsModule } from './jobs.module';

/**
 * Job Processing System Constants
 */
export const JOB_CONSTANTS = {
  // Priority Levels
  PRIORITY_LEVELS: {
    LOW: 1,
    NORMAL: 5,
    HIGH: 10,
    CRITICAL: 15,
  },
  
  // Timeout Configuration (milliseconds)
  TIMEOUTS: {
    TRANSCRIPT_ANALYSIS: 180000,  // 3 minutes
    BATCH_ANALYSIS: 1800000,      // 30 minutes
    LEARNING_INSIGHTS: 120000,    // 2 minutes
    CACHE_WARMUP: 600000,         // 10 minutes
    DATA_CLEANUP: 3600000,        // 1 hour
  },
  
  // Retry Configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY: 1000,
    EXPONENTIAL_BASE: 2,
    MAX_DELAY: 60000,
  },
  
  // Queue Limits
  QUEUE_LIMITS: {
    MAX_BATCH_SIZE: 100,
    MAX_CONCURRENT_AI_JOBS: 3,
    MAX_CONCURRENT_DATA_JOBS: 5,
    MAX_CONCURRENT_NOTIFICATIONS: 10,
  },
  
  // Monitoring
  MONITORING: {
    HEALTH_CHECK_INTERVAL: 300000,  // 5 minutes
    ALERT_RETENTION_HOURS: 24,
    METRICS_RETENTION_DAYS: 7,
    CLEANUP_INTERVAL: 3600000,      // 1 hour
  },
} as const;

/**
 * Type for job processing constants
 */
export type JobConstants = typeof JOB_CONSTANTS;

/**
 * Utility functions for job management
 */
export const JobUtils = {
  /**
   * Calculate estimated completion time based on job type
   */
  estimateCompletionTime(jobType: JobType, batchSize = 1): Date {
    const baseTimes: Record<JobType, number> = {
      [JobType.TRANSCRIPT_ANALYSIS]: 120000,     // 2 minutes
      [JobType.DEBATE_SUMMARY]: 60000,          // 1 minute
      [JobType.ARGUMENT_ANALYSIS]: 90000,       // 90 seconds
      [JobType.LEARNING_INSIGHTS]: 90000,       // 90 seconds
      [JobType.BATCH_ANALYSIS]: batchSize * 30000,  // 30 seconds per item
      [JobType.CLASS_ANALYTICS_UPDATE]: 300000, // 5 minutes
      [JobType.REFLECTION_PROCESSING]: 30000,   // 30 seconds
      [JobType.TEMPLATE_OPTIMIZATION]: 180000,  // 3 minutes
      [JobType.CACHE_WARMUP]: 300000,           // 5 minutes
      [JobType.DATA_CLEANUP]: 1800000,          // 30 minutes
      [JobType.METRICS_CALCULATION]: 120000,    // 2 minutes
      [JobType.SEND_NOTIFICATION]: 5000,        // 5 seconds
      [JobType.SEND_EMAIL]: 10000,              // 10 seconds
      [JobType.DATA_EXPORT]: 600000,            // 10 minutes
      [JobType.REPORT_GENERATION]: 300000,      // 5 minutes
    };

    const estimatedTime = baseTimes[jobType] || 60000;
    return new Date(Date.now() + estimatedTime);
  },

  /**
   * Determine appropriate queue for a job type
   */
  getQueueForJobType(jobType: JobType): JobQueue {
    const jobToQueueMap: Record<JobType, JobQueue> = {
      [JobType.TRANSCRIPT_ANALYSIS]: JobQueue.AI_ANALYSIS,
      [JobType.DEBATE_SUMMARY]: JobQueue.AI_ANALYSIS,
      [JobType.ARGUMENT_ANALYSIS]: JobQueue.AI_ANALYSIS,
      [JobType.LEARNING_INSIGHTS]: JobQueue.AI_ANALYSIS,
      [JobType.BATCH_ANALYSIS]: JobQueue.DATA_PROCESSING,
      [JobType.CLASS_ANALYTICS_UPDATE]: JobQueue.DATA_PROCESSING,
      [JobType.REFLECTION_PROCESSING]: JobQueue.DATA_PROCESSING,
      [JobType.TEMPLATE_OPTIMIZATION]: JobQueue.DATA_PROCESSING,
      [JobType.CACHE_WARMUP]: JobQueue.DATA_PROCESSING,
      [JobType.DATA_CLEANUP]: JobQueue.MAINTENANCE,
      [JobType.METRICS_CALCULATION]: JobQueue.DATA_PROCESSING,
      [JobType.SEND_NOTIFICATION]: JobQueue.NOTIFICATIONS,
      [JobType.SEND_EMAIL]: JobQueue.NOTIFICATIONS,
      [JobType.DATA_EXPORT]: JobQueue.EXPORTS,
      [JobType.REPORT_GENERATION]: JobQueue.EXPORTS,
    };

    return jobToQueueMap[jobType] || JobQueue.DATA_PROCESSING;
  },

  /**
   * Check if a job type requires AI processing
   */
  isAIJob(jobType: JobType): boolean {
    const aiJobs = [
      JobType.TRANSCRIPT_ANALYSIS,
      JobType.DEBATE_SUMMARY,
      JobType.ARGUMENT_ANALYSIS,
      JobType.LEARNING_INSIGHTS,
    ];

    return aiJobs.includes(jobType);
  },

  /**
   * Get human-readable job type name
   */
  getJobTypeName(jobType: JobType): string {
    const names: Record<JobType, string> = {
      [JobType.TRANSCRIPT_ANALYSIS]: 'Transcript Analysis',
      [JobType.DEBATE_SUMMARY]: 'Debate Summary',
      [JobType.ARGUMENT_ANALYSIS]: 'Argument Analysis',
      [JobType.LEARNING_INSIGHTS]: 'Learning Insights',
      [JobType.BATCH_ANALYSIS]: 'Batch Analysis',
      [JobType.CLASS_ANALYTICS_UPDATE]: 'Class Analytics Update',
      [JobType.REFLECTION_PROCESSING]: 'Reflection Processing',
      [JobType.TEMPLATE_OPTIMIZATION]: 'Template Optimization',
      [JobType.CACHE_WARMUP]: 'Cache Warmup',
      [JobType.DATA_CLEANUP]: 'Data Cleanup',
      [JobType.METRICS_CALCULATION]: 'Metrics Calculation',
      [JobType.SEND_NOTIFICATION]: 'Send Notification',
      [JobType.SEND_EMAIL]: 'Send Email',
      [JobType.DATA_EXPORT]: 'Data Export',
      [JobType.REPORT_GENERATION]: 'Report Generation',
    };

    return names[jobType] || jobType;
  },

  /**
   * Format job duration in human-readable format
   */
  formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${Math.round(milliseconds / 1000)}s`;
    } else if (milliseconds < 3600000) {
      return `${Math.round(milliseconds / 60000)}m`;
    } else {
      const hours = Math.floor(milliseconds / 3600000);
      const minutes = Math.round((milliseconds % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    }
  },

  /**
   * Calculate success rate percentage
   */
  calculateSuccessRate(completed: number, failed: number): number {
    const total = completed + failed;
    return total > 0 ? (completed / total) * 100 : 0;
  },

  /**
   * Generate job request ID
   */
  generateRequestId(jobType: JobType, userId?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const userSuffix = userId ? `_${userId}` : '';
    return `${jobType}_${timestamp}_${random}${userSuffix}`;
  },
};

/**
 * Re-export commonly used types for convenience
 */
export type {
  JobType as JobTypeName,
  JobQueue as QueueName,
  JobStatus as JobState,
  JobPriority as Priority,
  JobProgress as Progress,
  JobResult as Result,
} from './interfaces/job.interfaces';
