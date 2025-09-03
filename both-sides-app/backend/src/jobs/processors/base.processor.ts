import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  JobProcessor,
  BaseJobData,
  JobResult,
  JobProgress,
} from '../interfaces/job.interfaces';

/**
 * Abstract base class for all job processors
 */
export abstract class BaseJobProcessor<T extends BaseJobData = BaseJobData, R = any> 
  implements JobProcessor<T, R> {
  
  protected readonly logger: Logger;
  protected readonly processorName: string;

  constructor(processorName: string) {
    this.processorName = processorName;
    this.logger = new Logger(`${processorName}Processor`);
  }

  /**
   * Abstract method that must be implemented by subclasses
   */
  abstract process(job: Job<T>): Promise<JobResult<R>>;

  /**
   * Validate job data before processing
   */
  protected validateJobData(job: Job<T>): void {
    if (!job.data) {
      throw new Error('Job data is missing');
    }

    // Base validation - subclasses can override
    this.performBaseValidation(job.data);
  }

  /**
   * Perform base validation common to all jobs
   */
  private performBaseValidation(data: T): void {
    // Check for required base fields if needed
    if (data.userId && typeof data.userId !== 'string') {
      throw new Error('Invalid userId format');
    }

    if (data.classId && typeof data.classId !== 'string') {
      throw new Error('Invalid classId format');
    }

    if (data.conversationId && typeof data.conversationId !== 'string') {
      throw new Error('Invalid conversationId format');
    }
  }

  /**
   * Update job progress with standardized format
   */
  protected async updateProgress(
    job: Job<T>,
    percentage: number,
    current: number,
    total: number,
    stage: string,
    message?: string,
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    const progress: JobProgress = {
      percentage: Math.min(100, Math.max(0, percentage)),
      current,
      total,
      stage,
      message,
      estimatedTimeRemaining: this.calculateEstimatedTime(percentage, job.processedOn),
      details: additionalDetails,
    };

    await job.updateProgress(progress);
    this.logger.debug(`Job ${job.id} progress: ${percentage}% - ${stage}`);
  }

  /**
   * Calculate estimated time remaining based on progress
   */
  private calculateEstimatedTime(percentage: number, startTime?: number): number | undefined {
    if (!startTime || percentage <= 0) {
      return undefined;
    }

    const elapsed = Date.now() - startTime;
    const estimatedTotal = (elapsed / percentage) * 100;
    const remaining = estimatedTotal - elapsed;

    return Math.max(0, Math.round(remaining / 1000)); // Return seconds
  }

  /**
   * Create standardized success result
   */
  protected createSuccessResult(
    data: R,
    processingTime?: number,
    warnings?: string[],
    metadata?: Record<string, any>
  ): JobResult<R> {
    return {
      success: true,
      data,
      metadata: {
        processingTime: processingTime || 0,
        warnings: warnings || [],
        ...metadata,
      },
    };
  }

  /**
   * Create standardized error result
   */
  protected createErrorResult(
    error: Error,
    code?: string,
    retryable = false,
    processingTime?: number,
    metadata?: Record<string, any>
  ): JobResult<R> {
    return {
      success: false,
      error: {
        code: code || error.name || 'PROCESSING_ERROR',
        message: error.message,
        stack: error.stack,
        retryable,
      },
      metadata: {
        processingTime: processingTime || 0,
        ...metadata,
      },
    };
  }

  /**
   * Handle timeout scenarios
   */
  protected async withTimeout<K>(
    promise: Promise<K>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
  ): Promise<K> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async retryWithBackoff<K>(
    operation: () => Promise<K>,
    maxAttempts = 3,
    baseDelay = 1000
  ): Promise<K> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Memory usage monitoring
   */
  protected getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }

  /**
   * Log job start
   */
  protected logJobStart(job: Job<T>): void {
    this.logger.log(`Starting job ${job.id} (${job.name}) with priority ${job.opts.priority}`);
  }

  /**
   * Log job completion
   */
  protected logJobCompletion(job: Job<T>, result: JobResult<R>, startTime: number): void {
    const duration = Date.now() - startTime;
    const status = result.success ? 'completed' : 'failed';
    const memoryUsage = this.getMemoryUsage();
    
    this.logger.log(
      `Job ${job.id} ${status} in ${duration}ms (Memory: ${memoryUsage}MB)${
        result.error ? ` - Error: ${result.error.message}` : ''
      }`
    );
  }

  /**
   * Default event handlers (can be overridden)
   */
  async onCompleted?(job: Job<T>, result: JobResult<R>): Promise<void> {
    this.logger.debug(`Job ${job.id} completed successfully`);
  }

  async onFailed?(job: Job<T>, error: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }

  async onProgress?(job: Job<T>, progress: JobProgress): Promise<void> {
    this.logger.debug(`Job ${job.id} progress: ${progress.percentage}% - ${progress.stage}`);
  }

  async onStalled?(job: Job<T>): Promise<void> {
    this.logger.warn(`Job ${job.id} stalled and will be retried`);
  }

  async onActive?(job: Job<T>): Promise<void> {
    this.logger.debug(`Job ${job.id} started processing`);
  }
}

/**
 * Specialized base class for AI analysis processors
 */
export abstract class BaseAIProcessor<T extends BaseJobData = BaseJobData, R = any> 
  extends BaseJobProcessor<T, R> {

  constructor(processorName: string) {
    super(processorName);
  }

  /**
   * Process job with AI-specific error handling and monitoring
   */
  async process(job: Job<T>): Promise<JobResult<R>> {
    const startTime = Date.now();
    
    try {
      this.validateJobData(job);
      this.logJobStart(job);

      await this.updateProgress(job, 0, 0, 1, 'initializing', 'Preparing AI analysis');

      // Pre-processing validation specific to AI jobs
      await this.validateAIPrerequisites(job.data);

      await this.updateProgress(job, 10, 0, 1, 'validated', 'Prerequisites validated');

      // Perform the actual AI processing
      const result = await this.performAIAnalysis(job);

      await this.updateProgress(job, 90, 0, 1, 'post_processing', 'Processing results');

      // Post-processing and validation
      const finalResult = await this.postProcessResults(result, job.data);

      await this.updateProgress(job, 100, 1, 1, 'completed', 'Analysis complete');

      const successResult = this.createSuccessResult(
        finalResult,
        Date.now() - startTime,
        [],
        {
          memoryUsage: this.getMemoryUsage(),
          aiModel: this.getAIModel(),
        }
      );

      this.logJobCompletion(job, successResult, startTime);
      return successResult;

    } catch (error) {
      const errorResult = this.createErrorResult(
        error,
        this.categorizeAIError(error),
        this.isRetryableAIError(error),
        Date.now() - startTime,
        {
          memoryUsage: this.getMemoryUsage(),
          stage: 'ai_analysis',
        }
      );

      this.logJobCompletion(job, errorResult, startTime);
      return errorResult;
    }
  }

  /**
   * Abstract methods for AI processing
   */
  protected abstract validateAIPrerequisites(data: T): Promise<void>;
  protected abstract performAIAnalysis(job: Job<T>): Promise<R>;
  protected abstract postProcessResults(result: R, data: T): Promise<R>;
  protected abstract getAIModel(): string;

  /**
   * Categorize AI-specific errors
   */
  protected categorizeAIError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('deadline')) {
      return 'AI_TIMEOUT';
    }
    
    if (message.includes('rate limit') || message.includes('quota')) {
      return 'AI_RATE_LIMIT';
    }
    
    if (message.includes('authentication') || message.includes('unauthorized')) {
      return 'AI_AUTH_ERROR';
    }
    
    if (message.includes('model') || message.includes('service unavailable')) {
      return 'AI_SERVICE_ERROR';
    }
    
    if (message.includes('input') || message.includes('validation')) {
      return 'AI_INPUT_ERROR';
    }

    return 'AI_UNKNOWN_ERROR';
  }

  /**
   * Determine if AI error is retryable
   */
  protected isRetryableAIError(error: Error): boolean {
    const retryableErrors = [
      'AI_TIMEOUT',
      'AI_RATE_LIMIT',
      'AI_SERVICE_ERROR',
    ];

    const errorCode = this.categorizeAIError(error);
    return retryableErrors.includes(errorCode);
  }

  /**
   * Handle AI service rate limiting
   */
  protected async handleRateLimit(job: Job<T>): Promise<void> {
    const delay = this.calculateRateLimitDelay(job.attemptsMade);
    this.logger.warn(`Rate limited, waiting ${delay}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Calculate delay for rate limit handling
   */
  private calculateRateLimitDelay(attemptsMade: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute
    
    const exponentialDelay = baseDelay * Math.pow(2, attemptsMade);
    const jitter = Math.random() * 1000; // Up to 1 second of jitter
    
    return Math.min(maxDelay, exponentialDelay + jitter);
  }

  /**
   * Estimate AI processing complexity
   */
  protected estimateComplexity(data: T): 'low' | 'medium' | 'high' {
    // Default implementation - can be overridden by specific processors
    return 'medium';
  }

  /**
   * Get timeout based on complexity
   */
  protected getTimeoutForComplexity(complexity: 'low' | 'medium' | 'high'): number {
    const timeouts = {
      low: 30000,    // 30 seconds
      medium: 120000, // 2 minutes
      high: 300000,   // 5 minutes
    };

    return timeouts[complexity];
  }
}
