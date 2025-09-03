import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Job, Worker, QueueEvents } from 'bullmq';
import { 
  JobType, 
  JobQueue, 
  JobPriority, 
  JobStatus, 
  JobConfig,
  QueueConfig,
  BaseJobData,
  JobResult,
  JobProgress,
  JobScheduler,
  JobMonitor,
  QueueStats,
  JobStats,
  JobEvent,
  JobListener,
  JobProcessor
} from '../interfaces/job.interfaces';
import { RedisService } from '../../redis/redis.service';

/**
 * Central queue management service for background job processing
 */
@Injectable()
export class QueueManagerService implements JobScheduler, JobMonitor, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueManagerService.name);
  
  private queues = new Map<JobQueue, Queue>();
  private workers = new Map<JobQueue, Worker>();
  private queueEvents = new Map<JobQueue, QueueEvents>();
  private processors = new Map<JobType, JobProcessor>();
  private listeners: JobListener[] = [];
  private initialized = false;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    await this.initializeQueues();
    this.initialized = true;
    this.logger.log('Queue manager initialized successfully');
  }

  async onModuleDestroy() {
    await this.shutdown();
    this.logger.log('Queue manager shut down');
  }

  /**
   * Initialize all job queues
   */
  private async initializeQueues() {
    const queueConfigs = this.getQueueConfigurations();
    
    for (const config of queueConfigs) {
      await this.createQueue(config);
    }

    // Start processing jobs
    await this.startWorkers();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Get queue configurations for all supported queues
   */
  private getQueueConfigurations(): QueueConfig[] {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    };

    return [
      {
        name: JobQueue.AI_ANALYSIS,
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          delay: 0,
        },
        settings: {
          stalledInterval: 30000,
          maxStalledCount: 1,
        },
      },
      {
        name: JobQueue.DATA_PROCESSING,
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      },
      {
        name: JobQueue.NOTIFICATIONS,
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 100,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 500,
          },
        },
      },
      {
        name: JobQueue.EXPORTS,
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 10,
          attempts: 2,
          timeout: 300000, // 5 minutes
        },
      },
      {
        name: JobQueue.MAINTENANCE,
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 20,
          attempts: 1,
        },
      },
    ];
  }

  /**
   * Create a queue with given configuration
   */
  private async createQueue(config: QueueConfig) {
    try {
      const queue = new Queue(config.name, {
        connection: config.connection,
        defaultJobOptions: config.defaultJobOptions,
        settings: config.settings,
      });

      const queueEvents = new QueueEvents(config.name, {
        connection: config.connection,
      });

      this.queues.set(config.name as JobQueue, queue);
      this.queueEvents.set(config.name as JobQueue, queueEvents);

      this.logger.debug(`Created queue: ${config.name}`);
    } catch (error) {
      this.logger.error(`Failed to create queue ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Start workers for all queues
   */
  private async startWorkers() {
    for (const [queueName, queue] of this.queues) {
      const worker = new Worker(
        queueName,
        async (job: Job) => this.processJob(job),
        {
          connection: queue.opts.connection,
          concurrency: this.getWorkerConcurrency(queueName),
          limiter: this.getWorkerLimiter(queueName),
        }
      );

      worker.on('completed', async (job: Job, result: any) => {
        await this.handleJobCompleted(job, result);
      });

      worker.on('failed', async (job: Job, error: Error) => {
        await this.handleJobFailed(job, error);
      });

      worker.on('progress', async (job: Job, progress: JobProgress) => {
        await this.handleJobProgress(job, progress);
      });

      worker.on('stalled', async (job: Job) => {
        await this.handleJobStalled(job);
      });

      worker.on('active', async (job: Job) => {
        await this.handleJobActive(job);
      });

      this.workers.set(queueName, worker);
      this.logger.debug(`Started worker for queue: ${queueName}`);
    }
  }

  /**
   * Get worker concurrency for different queue types
   */
  private getWorkerConcurrency(queueName: JobQueue): number {
    const concurrencyMap = {
      [JobQueue.AI_ANALYSIS]: 3,
      [JobQueue.DATA_PROCESSING]: 5,
      [JobQueue.NOTIFICATIONS]: 10,
      [JobQueue.EXPORTS]: 2,
      [JobQueue.MAINTENANCE]: 1,
    };

    return concurrencyMap[queueName] || 3;
  }

  /**
   * Get worker rate limiter configuration
   */
  private getWorkerLimiter(queueName: JobQueue) {
    const limiterMap = {
      [JobQueue.AI_ANALYSIS]: { max: 10, duration: 60000 }, // 10 jobs per minute
      [JobQueue.DATA_PROCESSING]: { max: 20, duration: 60000 }, // 20 jobs per minute
      [JobQueue.NOTIFICATIONS]: { max: 100, duration: 60000 }, // 100 jobs per minute
      [JobQueue.EXPORTS]: { max: 5, duration: 60000 }, // 5 jobs per minute
      [JobQueue.MAINTENANCE]: { max: 10, duration: 60000 }, // 10 jobs per minute
    };

    return limiterMap[queueName];
  }

  /**
   * Process a job using registered processors
   */
  private async processJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    const jobType = job.name as JobType;
    
    this.logger.debug(`Processing job: ${job.id} (${jobType})`);

    try {
      const processor = this.processors.get(jobType);
      if (!processor) {
        throw new Error(`No processor registered for job type: ${jobType}`);
      }

      // Update job progress
      await job.updateProgress({
        percentage: 0,
        current: 0,
        total: 1,
        stage: 'starting',
        message: 'Job processing started',
      });

      const result = await processor.process(job);

      // Update final progress
      await job.updateProgress({
        percentage: 100,
        current: 1,
        total: 1,
        stage: 'completed',
        message: 'Job processing completed',
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(`Job ${job.id} completed in ${processingTime}ms`);

      return {
        ...result,
        metadata: {
          ...result.metadata,
          processingTime,
        },
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Job ${job.id} failed after ${processingTime}ms:`, error);

      return {
        success: false,
        error: {
          code: error.code || 'PROCESSING_ERROR',
          message: error.message,
          stack: error.stack,
          retryable: this.isRetryableError(error),
        },
        metadata: {
          processingTime,
        },
      };
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'TEMPORARY_FAILURE',
      'RATE_LIMIT',
      'SERVICE_UNAVAILABLE',
    ];

    return retryableErrors.some(retryable => 
      error.message.includes(retryable) || 
      error.code === retryable
    );
  }

  /**
   * Register a job processor
   */
  registerProcessor<T extends BaseJobData>(jobType: JobType, processor: JobProcessor<T>) {
    this.processors.set(jobType, processor);
    this.logger.debug(`Registered processor for job type: ${jobType}`);
  }

  /**
   * Register a job listener
   */
  registerListener(listener: JobListener) {
    this.listeners.push(listener);
    this.logger.debug('Registered job listener');
  }

  /**
   * Get the appropriate queue for a job type
   */
  private getQueueForJobType(jobType: JobType): JobQueue {
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
  }

  // JobScheduler implementation

  async schedule<T extends BaseJobData>(
    jobType: JobType,
    data: T,
    options: JobConfig = {}
  ): Promise<Job<T>> {
    const queueName = this.getQueueForJobType(jobType);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const jobOptions = {
      priority: options.priority || JobPriority.NORMAL,
      delay: options.delay || 0,
      attempts: options.attempts,
      backoff: options.backoff,
      repeat: options.repeat,
      removeOnComplete: options.removeOnComplete,
      removeOnFail: options.removeOnFail,
      jobId: data.requestId,
    };

    const job = await queue.add(jobType, data, jobOptions);
    this.logger.debug(`Scheduled job: ${job.id} (${jobType}) in queue: ${queueName}`);

    return job as Job<T>;
  }

  async scheduleDelayed<T extends BaseJobData>(
    jobType: JobType,
    data: T,
    delay: number,
    options: JobConfig = {}
  ): Promise<Job<T>> {
    return this.schedule(jobType, data, { ...options, delay });
  }

  async scheduleRepeating<T extends BaseJobData>(
    jobType: JobType,
    data: T,
    repeatOptions: any,
    options: JobConfig = {}
  ): Promise<Job<T>> {
    return this.schedule(jobType, data, { ...options, repeat: repeatOptions });
  }

  async cancelJob(jobId: string): Promise<void> {
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.debug(`Cancelled job: ${jobId}`);
        return;
      }
    }
    throw new Error(`Job not found: ${jobId}`);
  }

  async retryJob(jobId: string): Promise<void> {
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job && job.failedReason) {
        await job.retry();
        this.logger.debug(`Retried job: ${jobId}`);
        return;
      }
    }
    throw new Error(`Job not found or not failed: ${jobId}`);
  }

  async getJob(jobId: string): Promise<Job | null> {
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        return job;
      }
    }
    return null;
  }

  async getJobs(status: JobStatus[], queueName?: JobQueue): Promise<Job[]> {
    const queuesToCheck = queueName 
      ? [this.queues.get(queueName)].filter(Boolean) 
      : Array.from(this.queues.values());

    const jobs: Job[] = [];
    
    for (const queue of queuesToCheck) {
      for (const jobStatus of status) {
        const queueJobs = await queue.getJobs([jobStatus as any]);
        jobs.push(...queueJobs);
      }
    }

    return jobs;
  }

  // JobMonitor implementation

  async getQueueStats(queueName: string): Promise<QueueStats> {
    const queue = this.queues.get(queueName as JobQueue);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    const isPaused = await queue.isPaused();

    // Calculate throughput and other metrics
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);

    const recentCompleted = completed.filter(job => job.finishedOn && job.finishedOn > hourAgo);
    const dayCompleted = completed.filter(job => job.finishedOn && job.finishedOn > dayAgo);

    const avgProcessingTime = recentCompleted.length > 0
      ? recentCompleted.reduce((sum, job) => sum + (job.finishedOn! - job.processedOn!), 0) / recentCompleted.length
      : 0;

    const failureRate = (completed.length + failed.length) > 0
      ? failed.length / (completed.length + failed.length)
      : 0;

    return {
      queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: isPaused,
      throughput: {
        hour: recentCompleted.length,
        day: dayCompleted.length,
      },
      avgProcessingTime,
      failureRate,
    };
  }

  async getJobStats(timeframe: 'hour' | 'day' | 'week'): Promise<JobStats> {
    const now = Date.now();
    const timeframes = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const startTime = now - timeframes[timeframe];
    const allJobs: Job[] = [];

    // Collect jobs from all queues
    for (const queue of this.queues.values()) {
      const [completed, failed, active, waiting] = await Promise.all([
        queue.getCompleted(),
        queue.getFailed(),
        queue.getActive(),
        queue.getWaiting(),
      ]);

      allJobs.push(...completed, ...failed, ...active, ...waiting);
    }

    // Filter jobs by timeframe
    const timeframeJobs = allJobs.filter(job => 
      job.timestamp >= startTime
    );

    const completedJobs = timeframeJobs.filter(job => job.finishedOn);
    const failedJobs = timeframeJobs.filter(job => job.failedReason);
    const activeJobs = timeframeJobs.filter(job => job.processedOn && !job.finishedOn);
    const waitingJobs = timeframeJobs.filter(job => !job.processedOn);

    const avgProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => sum + (job.finishedOn! - job.processedOn!), 0) / completedJobs.length
      : 0;

    const throughput = completedJobs.length / (timeframes[timeframe] / (60 * 60 * 1000)); // jobs per hour
    const failureRate = (completedJobs.length + failedJobs.length) > 0
      ? failedJobs.length / (completedJobs.length + failedJobs.length)
      : 0;

    // Aggregate by type and queue
    const byType: Record<string, any> = {};
    const byQueue: Record<string, any> = {};

    for (const job of timeframeJobs) {
      const jobType = job.name;
      const queueName = job.queue.name;

      if (!byType[jobType]) {
        byType[jobType] = { count: 0, completed: 0, failed: 0, totalProcessingTime: 0 };
      }
      if (!byQueue[queueName]) {
        byQueue[queueName] = { count: 0, completed: 0, failed: 0, totalProcessingTime: 0 };
      }

      byType[jobType].count++;
      byQueue[queueName].count++;

      if (job.finishedOn) {
        byType[jobType].completed++;
        byQueue[queueName].completed++;
        byType[jobType].totalProcessingTime += (job.finishedOn - job.processedOn!);
        byQueue[queueName].totalProcessingTime += (job.finishedOn - job.processedOn!);
      } else if (job.failedReason) {
        byType[jobType].failed++;
        byQueue[queueName].failed++;
      }
    }

    // Calculate success rates and average processing times
    Object.keys(byType).forEach(type => {
      const stats = byType[type];
      stats.successRate = stats.count > 0 ? stats.completed / stats.count : 0;
      stats.avgProcessingTime = stats.completed > 0 ? stats.totalProcessingTime / stats.completed : 0;
      delete stats.totalProcessingTime;
    });

    Object.keys(byQueue).forEach(queue => {
      const stats = byQueue[queue];
      stats.successRate = stats.count > 0 ? stats.completed / stats.count : 0;
      stats.avgProcessingTime = stats.completed > 0 ? stats.totalProcessingTime / stats.completed : 0;
      delete stats.totalProcessingTime;
    });

    return {
      timeframe,
      totalJobs: timeframeJobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      activeJobs: activeJobs.length,
      waitingJobs: waitingJobs.length,
      avgProcessingTime,
      throughput,
      failureRate,
      byType,
      byQueue,
    };
  }

  async getFailedJobs(limit = 50): Promise<Job[]> {
    const failedJobs: Job[] = [];
    
    for (const queue of this.queues.values()) {
      const jobs = await queue.getFailed(0, limit);
      failedJobs.push(...jobs);
    }

    return failedJobs
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit);
  }

  async getActiveJobs(limit = 50): Promise<Job[]> {
    const activeJobs: Job[] = [];
    
    for (const queue of this.queues.values()) {
      const jobs = await queue.getActive(0, limit);
      activeJobs.push(...jobs);
    }

    return activeJobs
      .sort((a, b) => (b.processedOn || 0) - (a.processedOn || 0))
      .slice(0, limit);
  }

  async getWaitingJobs(limit = 50): Promise<Job[]> {
    const waitingJobs: Job[] = [];
    
    for (const queue of this.queues.values()) {
      const jobs = await queue.getWaiting(0, limit);
      waitingJobs.push(...jobs);
    }

    return waitingJobs
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit);
  }

  async cleanQueue(queueName: string, grace: number, status: JobStatus): Promise<number> {
    const queue = this.queues.get(queueName as JobQueue);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const cleaned = await queue.clean(grace, 0, status as any);
    this.logger.log(`Cleaned ${cleaned.length} jobs from queue: ${queueName}`);
    
    return cleaned.length;
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName as JobQueue);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.pause();
    this.logger.log(`Paused queue: ${queueName}`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName as JobQueue);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.resume();
    this.logger.log(`Resumed queue: ${queueName}`);
  }

  // Event handling

  private setupEventListeners() {
    for (const [queueName, queueEvents] of this.queueEvents) {
      queueEvents.on('completed', async (args) => {
        const event: JobEvent = {
          type: 'completed',
          jobId: args.jobId,
          jobType: args.name as JobType,
          queueName,
          timestamp: new Date(),
          result: args.returnvalue,
        };
        await this.notifyListeners('onJobCompleted', event);
      });

      queueEvents.on('failed', async (args) => {
        const event: JobEvent = {
          type: 'failed',
          jobId: args.jobId,
          jobType: args.name as JobType,
          queueName,
          timestamp: new Date(),
          error: new Error(args.failedReason),
        };
        await this.notifyListeners('onJobFailed', event);
      });

      queueEvents.on('progress', async (args) => {
        const event: JobEvent = {
          type: 'progress',
          jobId: args.jobId,
          jobType: args.name as JobType,
          queueName,
          timestamp: new Date(),
          progress: args.data as JobProgress,
        };
        await this.notifyListeners('onJobProgress', event);
      });

      queueEvents.on('stalled', async (args) => {
        const event: JobEvent = {
          type: 'stalled',
          jobId: args.jobId,
          jobType: args.name as JobType,
          queueName,
          timestamp: new Date(),
        };
        await this.notifyListeners('onJobStalled', event);
      });

      queueEvents.on('active', async (args) => {
        const event: JobEvent = {
          type: 'active',
          jobId: args.jobId,
          jobType: args.name as JobType,
          queueName,
          timestamp: new Date(),
        };
        await this.notifyListeners('onJobActive', event);
      });

      queueEvents.on('waiting', async (args) => {
        const event: JobEvent = {
          type: 'waiting',
          jobId: args.jobId,
          jobType: args.name as JobType,
          queueName,
          timestamp: new Date(),
        };
        await this.notifyListeners('onJobWaiting', event);
      });
    }
  }

  private async notifyListeners(method: keyof JobListener, event: JobEvent) {
    for (const listener of this.listeners) {
      try {
        const handler = listener[method];
        if (handler) {
          await handler.call(listener, event);
        }
      } catch (error) {
        this.logger.error(`Error in job listener ${method}:`, error);
      }
    }
  }

  // Event handlers for processors

  private async handleJobCompleted(job: Job, result: JobResult) {
    const processor = this.processors.get(job.name as JobType);
    if (processor && processor.onCompleted) {
      try {
        await processor.onCompleted(job, result);
      } catch (error) {
        this.logger.error(`Error in processor onCompleted for job ${job.id}:`, error);
      }
    }
  }

  private async handleJobFailed(job: Job, error: Error) {
    const processor = this.processors.get(job.name as JobType);
    if (processor && processor.onFailed) {
      try {
        await processor.onFailed(job, error);
      } catch (processorError) {
        this.logger.error(`Error in processor onFailed for job ${job.id}:`, processorError);
      }
    }
  }

  private async handleJobProgress(job: Job, progress: JobProgress) {
    const processor = this.processors.get(job.name as JobType);
    if (processor && processor.onProgress) {
      try {
        await processor.onProgress(job, progress);
      } catch (error) {
        this.logger.error(`Error in processor onProgress for job ${job.id}:`, error);
      }
    }
  }

  private async handleJobStalled(job: Job) {
    const processor = this.processors.get(job.name as JobType);
    if (processor && processor.onStalled) {
      try {
        await processor.onStalled(job);
      } catch (error) {
        this.logger.error(`Error in processor onStalled for job ${job.id}:`, error);
      }
    }
  }

  private async handleJobActive(job: Job) {
    const processor = this.processors.get(job.name as JobType);
    if (processor && processor.onActive) {
      try {
        await processor.onActive(job);
      } catch (error) {
        this.logger.error(`Error in processor onActive for job ${job.id}:`, error);
      }
    }
  }

  /**
   * Graceful shutdown
   */
  private async shutdown() {
    this.logger.log('Shutting down queue manager...');

    // Close workers first
    const workerShutdownPromises = Array.from(this.workers.values()).map(async worker => {
      try {
        await worker.close();
      } catch (error) {
        this.logger.error('Error closing worker:', error);
      }
    });

    await Promise.allSettled(workerShutdownPromises);

    // Close queue events
    const eventShutdownPromises = Array.from(this.queueEvents.values()).map(async queueEvents => {
      try {
        await queueEvents.close();
      } catch (error) {
        this.logger.error('Error closing queue events:', error);
      }
    });

    await Promise.allSettled(eventShutdownPromises);

    // Close queues
    const queueShutdownPromises = Array.from(this.queues.values()).map(async queue => {
      try {
        await queue.close();
      } catch (error) {
        this.logger.error('Error closing queue:', error);
      }
    });

    await Promise.allSettled(queueShutdownPromises);

    // Clear all maps
    this.queues.clear();
    this.workers.clear();
    this.queueEvents.clear();
    this.processors.clear();
    this.listeners.length = 0;
  }

  /**
   * Health check for the queue system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {
      initialized: this.initialized,
      queues: {},
      workers: {},
      totalJobs: 0,
    };

    let healthyQueues = 0;
    let totalQueues = this.queues.size;

    for (const [queueName, queue] of this.queues) {
      try {
        const [waiting, active, failed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getFailed(),
        ]);

        const worker = this.workers.get(queueName);
        const isWorkerRunning = worker && !worker.closing;

        details.queues[queueName] = {
          waiting: waiting.length,
          active: active.length,
          failed: failed.length,
          workerRunning: isWorkerRunning,
        };

        details.totalJobs += waiting.length + active.length;

        if (isWorkerRunning && failed.length < 100) { // Arbitrary threshold
          healthyQueues++;
        }
      } catch (error) {
        details.queues[queueName] = {
          error: error.message,
        };
      }
    }

    const healthRatio = totalQueues > 0 ? healthyQueues / totalQueues : 0;
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (healthRatio >= 1) {
      status = 'healthy';
    } else if (healthRatio >= 0.5) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, details };
  }
}
