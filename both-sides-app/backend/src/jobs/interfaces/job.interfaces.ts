import { Job, JobsOptions, RepeatOptions } from 'bullmq';

/**
 * Job priority levels
 */
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 15,
}

/**
 * Job status enumeration
 */
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
  STALLED = 'stalled',
}

/**
 * Job types for the reflection system
 */
export enum JobType {
  // AI Analysis Jobs
  TRANSCRIPT_ANALYSIS = 'transcript_analysis',
  DEBATE_SUMMARY = 'debate_summary',
  ARGUMENT_ANALYSIS = 'argument_analysis',
  LEARNING_INSIGHTS = 'learning_insights',
  
  // Batch Processing Jobs
  BATCH_ANALYSIS = 'batch_analysis',
  CLASS_ANALYTICS_UPDATE = 'class_analytics_update',
  
  // Reflection Processing Jobs
  REFLECTION_PROCESSING = 'reflection_processing',
  TEMPLATE_OPTIMIZATION = 'template_optimization',
  
  // Data Processing Jobs
  CACHE_WARMUP = 'cache_warmup',
  DATA_CLEANUP = 'data_cleanup',
  METRICS_CALCULATION = 'metrics_calculation',
  
  // Notification Jobs
  SEND_NOTIFICATION = 'send_notification',
  SEND_EMAIL = 'send_email',
  
  // Export Jobs
  DATA_EXPORT = 'data_export',
  REPORT_GENERATION = 'report_generation',
}

/**
 * Job queue names
 */
export enum JobQueue {
  AI_ANALYSIS = 'ai_analysis',
  DATA_PROCESSING = 'data_processing',
  NOTIFICATIONS = 'notifications',
  EXPORTS = 'exports',
  MAINTENANCE = 'maintenance',
}

/**
 * Base job data interface
 */
export interface BaseJobData {
  userId?: string;
  classId?: string;
  conversationId?: string;
  requestId?: string;
  priority?: JobPriority;
  metadata?: Record<string, any>;
}

/**
 * Job result interface
 */
export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    stack?: string;
    retryable?: boolean;
  };
  metadata?: {
    processingTime: number;
    memoryUsage?: number;
    warnings?: string[];
    debugInfo?: Record<string, any>;
  };
}

/**
 * Job progress interface
 */
export interface JobProgress {
  percentage: number;
  current: number;
  total: number;
  stage: string;
  message?: string;
  estimatedTimeRemaining?: number;
  details?: Record<string, any>;
}

/**
 * Job configuration interface
 */
export interface JobConfig {
  priority?: JobPriority;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  repeat?: RepeatOptions;
  removeOnComplete?: number | boolean;
  removeOnFail?: number | boolean;
  timeout?: number;
  maxStalledCount?: number;
}

/**
 * Queue configuration interface
 */
export interface QueueConfig {
  name: string;
  connection: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions: JobsOptions;
  settings?: {
    stalledInterval?: number;
    maxStalledCount?: number;
    retryProcessDelay?: number;
  };
}

/**
 * Processor interface
 */
export interface JobProcessor<T extends BaseJobData = BaseJobData, R = any> {
  process(job: Job<T>): Promise<JobResult<R>>;
  onCompleted?(job: Job<T>, result: JobResult<R>): Promise<void>;
  onFailed?(job: Job<T>, error: Error): Promise<void>;
  onProgress?(job: Job<T>, progress: JobProgress): Promise<void>;
  onStalled?(job: Job<T>): Promise<void>;
  onActive?(job: Job<T>): Promise<void>;
}

/**
 * Job scheduler interface
 */
export interface JobScheduler {
  schedule<T extends BaseJobData>(
    jobType: JobType,
    data: T,
    options?: JobConfig
  ): Promise<Job<T>>;
  
  scheduleDelayed<T extends BaseJobData>(
    jobType: JobType,
    data: T,
    delay: number,
    options?: JobConfig
  ): Promise<Job<T>>;
  
  scheduleRepeating<T extends BaseJobData>(
    jobType: JobType,
    data: T,
    repeatOptions: RepeatOptions,
    options?: JobConfig
  ): Promise<Job<T>>;
  
  cancelJob(jobId: string): Promise<void>;
  retryJob(jobId: string): Promise<void>;
  getJob(jobId: string): Promise<Job | null>;
  getJobs(status: JobStatus[], queue?: JobQueue): Promise<Job[]>;
}

/**
 * Job monitoring interface
 */
export interface JobMonitor {
  getQueueStats(queueName: string): Promise<QueueStats>;
  getJobStats(timeframe: 'hour' | 'day' | 'week'): Promise<JobStats>;
  getFailedJobs(limit?: number): Promise<Job[]>;
  getActiveJobs(limit?: number): Promise<Job[]>;
  getWaitingJobs(limit?: number): Promise<Job[]>;
  cleanQueue(queueName: string, grace: number, status: JobStatus): Promise<number>;
  pauseQueue(queueName: string): Promise<void>;
  resumeQueue(queueName: string): Promise<void>;
}

/**
 * Queue statistics interface
 */
export interface QueueStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  throughput: {
    hour: number;
    day: number;
  };
  avgProcessingTime: number;
  failureRate: number;
}

/**
 * Job statistics interface
 */
export interface JobStats {
  timeframe: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeJobs: number;
  waitingJobs: number;
  avgProcessingTime: number;
  throughput: number;
  failureRate: number;
  byType: Record<string, {
    count: number;
    successRate: number;
    avgProcessingTime: number;
  }>;
  byQueue: Record<string, {
    count: number;
    successRate: number;
    avgProcessingTime: number;
  }>;
}

/**
 * Job event interface
 */
export interface JobEvent {
  type: 'completed' | 'failed' | 'progress' | 'stalled' | 'active' | 'waiting';
  jobId: string;
  jobType: JobType;
  queueName: string;
  timestamp: Date;
  data?: any;
  error?: Error;
  progress?: JobProgress;
  result?: JobResult;
}

/**
 * Job listener interface
 */
export interface JobListener {
  onJobCompleted?(event: JobEvent): Promise<void>;
  onJobFailed?(event: JobEvent): Promise<void>;
  onJobProgress?(event: JobEvent): Promise<void>;
  onJobActive?(event: JobEvent): Promise<void>;
  onJobStalled?(event: JobEvent): Promise<void>;
  onJobWaiting?(event: JobEvent): Promise<void>;
}

/**
 * Specific job data interfaces for different job types
 */

export interface TranscriptAnalysisJobData extends BaseJobData {
  conversationId: string;
  analysisTypes: string[];
  config?: {
    includeDetailed: boolean;
    languageModel?: string;
    customPrompts?: Record<string, string>;
  };
}

export interface DebateSummaryJobData extends BaseJobData {
  conversationId: string;
  summaryType: 'basic' | 'detailed' | 'comprehensive';
  config?: {
    maxLength?: number;
    includeKeyQuotes?: boolean;
    includeMetrics?: boolean;
  };
}

export interface ArgumentAnalysisJobData extends BaseJobData {
  conversationId: string;
  participantIds?: string[];
  config?: {
    detectFallacies: boolean;
    analyzeEvidence: boolean;
    scoreArguments: boolean;
  };
}

export interface LearningInsightsJobData extends BaseJobData {
  conversationId: string;
  userId: string;
  insightTypes: string[];
  config?: {
    personalizationLevel: 'basic' | 'detailed' | 'advanced';
    includeRecommendations: boolean;
    compareToClass: boolean;
  };
}

export interface BatchAnalysisJobData extends BaseJobData {
  conversationIds: string[];
  analysisTypes: string[];
  batchConfig?: {
    parallelLimit: number;
    failureTolerance: number;
    progressUpdateInterval: number;
  };
}

export interface ClassAnalyticsJobData extends BaseJobData {
  classId: string;
  analyticsTypes: string[];
  config?: {
    includeComparisons: boolean;
    generateReports: boolean;
    notifyTeachers: boolean;
  };
}

export interface ReflectionProcessingJobData extends BaseJobData {
  reflectionId: string;
  processingType: 'validate' | 'analyze' | 'score' | 'insights';
  config?: {
    generateInsights: boolean;
    updateMetrics: boolean;
    notifyUser: boolean;
  };
}

export interface CacheWarmupJobData extends BaseJobData {
  cacheType: 'transcripts' | 'analytics' | 'templates' | 'all';
  targetIds?: string[];
  config?: {
    priorityClasses?: string[];
    maxItems?: number;
    forceRefresh?: boolean;
  };
}

export interface DataCleanupJobData extends BaseJobData {
  cleanupType: 'expired_sessions' | 'old_analytics' | 'temp_files' | 'all';
  config?: {
    retentionDays?: number;
    dryRun?: boolean;
    notifyAdmins?: boolean;
  };
}

export interface NotificationJobData extends BaseJobData {
  recipientIds: string[];
  notificationType: string;
  content: {
    title: string;
    message: string;
    data?: Record<string, any>;
  };
  config?: {
    channels: ('email' | 'push' | 'in_app')[];
    priority: 'low' | 'normal' | 'high' | 'urgent';
    scheduleFor?: Date;
  };
}
