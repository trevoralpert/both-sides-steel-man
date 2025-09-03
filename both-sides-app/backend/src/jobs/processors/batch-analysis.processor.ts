import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobProcessor } from './base.processor';
import { 
  BatchAnalysisJobData,
  JobResult,
  JobType,
} from '../interfaces/job.interfaces';
import { QueueManagerService } from '../services/queue-manager.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Result interface for batch analysis
 */
export interface BatchAnalysisResult {
  batch_id: string;
  total_conversations: number;
  completed_count: number;
  failed_count: number;
  skipped_count: number;
  processing_time_ms: number;
  results: Array<{
    conversation_id: string;
    status: 'completed' | 'failed' | 'skipped';
    job_id?: string;
    error_message?: string;
    completed_at?: Date;
  }>;
  summary: {
    success_rate: number;
    avg_processing_time: number;
    failed_conversations: string[];
    insights: string[];
  };
}

/**
 * Processor for handling batch analysis operations
 */
@Injectable()
export class BatchAnalysisProcessor extends BaseJobProcessor<
  BatchAnalysisJobData,
  BatchAnalysisResult
> {
  
  constructor(
    private readonly queueManager: QueueManagerService,
    private readonly prisma: PrismaService,
  ) {
    super('BatchAnalysis');
  }

  async process(job: Job<BatchAnalysisJobData>): Promise<JobResult<BatchAnalysisResult>> {
    const startTime = Date.now();
    
    try {
      this.validateJobData(job);
      this.logJobStart(job);

      const { conversationIds, analysisTypes, batchConfig } = job.data;
      const batchId = job.id || `batch_${Date.now()}`;

      // Initialize result structure
      const result: BatchAnalysisResult = {
        batch_id: batchId,
        total_conversations: conversationIds.length,
        completed_count: 0,
        failed_count: 0,
        skipped_count: 0,
        processing_time_ms: 0,
        results: [],
        summary: {
          success_rate: 0,
          avg_processing_time: 0,
          failed_conversations: [],
          insights: [],
        },
      };

      await this.updateProgress(
        job, 
        5, 
        0, 
        conversationIds.length, 
        'initializing', 
        'Starting batch analysis'
      );

      // Validate conversations before processing
      const validConversations = await this.validateConversations(conversationIds);
      result.skipped_count = conversationIds.length - validConversations.length;

      if (validConversations.length === 0) {
        throw new Error('No valid conversations found for batch analysis');
      }

      await this.updateProgress(
        job, 
        10, 
        0, 
        validConversations.length, 
        'validated', 
        `${validConversations.length} conversations validated`
      );

      // Process conversations in batches to manage system load
      const parallelLimit = batchConfig?.parallelLimit || 3;
      const failureTolerance = batchConfig?.failureTolerance || 0.2; // 20% failure tolerance
      
      const batches = this.createBatches(validConversations, parallelLimit);
      let processedCount = 0;

      for (const [batchIndex, batch] of batches.entries()) {
        this.logger.debug(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} conversations)`);

        // Process conversations in parallel within the batch
        const batchPromises = batch.map(conversationId =>
          this.processConversation(conversationId, analysisTypes, job.data)
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process batch results
        for (let i = 0; i < batchResults.length; i++) {
          const conversationId = batch[i];
          const batchResult = batchResults[i];
          
          if (batchResult.status === 'fulfilled') {
            result.results.push({
              conversation_id: conversationId,
              status: 'completed',
              job_id: batchResult.value.jobId,
              completed_at: new Date(),
            });
            result.completed_count++;
          } else {
            result.results.push({
              conversation_id: conversationId,
              status: 'failed',
              error_message: batchResult.reason?.message || 'Unknown error',
            });
            result.failed_count++;
            result.summary.failed_conversations.push(conversationId);
          }
          
          processedCount++;
          
          // Update progress
          const progressPercentage = 10 + ((processedCount / validConversations.length) * 80);
          await this.updateProgress(
            job,
            progressPercentage,
            processedCount,
            validConversations.length,
            'processing',
            `Processed ${processedCount}/${validConversations.length} conversations`
          );
        }

        // Check failure tolerance
        const currentFailureRate = result.failed_count / (result.completed_count + result.failed_count);
        if (currentFailureRate > failureTolerance && batchIndex < batches.length - 1) {
          this.logger.warn(`Failure rate ${currentFailureRate.toFixed(2)} exceeds tolerance ${failureTolerance}, stopping batch processing`);
          break;
        }

        // Add delay between batches to prevent overwhelming the system
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Calculate final statistics
      await this.updateProgress(job, 95, processedCount, validConversations.length, 'finalizing', 'Calculating statistics');
      
      result.processing_time_ms = Date.now() - startTime;
      result.summary.success_rate = result.total_conversations > 0 
        ? result.completed_count / result.total_conversations 
        : 0;
      
      result.summary.avg_processing_time = result.completed_count > 0
        ? result.processing_time_ms / result.completed_count
        : 0;

      result.summary.insights = this.generateBatchInsights(result);

      // Store batch analysis record
      await this.storeBatchAnalysisRecord(result, job.data);

      await this.updateProgress(job, 100, processedCount, validConversations.length, 'completed', 'Batch analysis complete');

      const successResult = this.createSuccessResult(
        result,
        result.processing_time_ms,
        result.failed_count > 0 ? [`${result.failed_count} conversations failed`] : undefined,
        {
          memoryUsage: this.getMemoryUsage(),
          batchSize: conversationIds.length,
          parallelLimit,
        }
      );

      this.logJobCompletion(job, successResult, startTime);
      return successResult;

    } catch (error) {
      const errorResult = this.createErrorResult(
        error,
        'BATCH_ANALYSIS_ERROR',
        this.isRetryableBatchError(error),
        Date.now() - startTime
      );

      this.logJobCompletion(job, errorResult, startTime);
      return errorResult;
    }
  }

  private async validateConversations(conversationIds: string[]): Promise<string[]> {
    const validConversations: string[] = [];

    for (const conversationId of conversationIds) {
      try {
        // Check if conversation exists and has sufficient content
        const conversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            _count: {
              select: {
                messages: {
                  where: {
                    status: {
                      not: 'DELETED',
                    },
                  },
                },
              },
            },
          },
        });

        if (conversation && conversation._count.messages >= 4) { // Minimum message requirement
          validConversations.push(conversationId);
        } else {
          this.logger.debug(`Skipping conversation ${conversationId}: insufficient content`);
        }
      } catch (error) {
        this.logger.warn(`Error validating conversation ${conversationId}: ${error.message}`);
      }
    }

    return validConversations;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processConversation(
    conversationId: string,
    analysisTypes: string[],
    jobData: BatchAnalysisJobData
  ): Promise<{ jobId: string }> {
    try {
      // Schedule individual analysis job
      const job = await this.queueManager.schedule(
        JobType.TRANSCRIPT_ANALYSIS,
        {
          conversationId,
          analysisTypes,
          userId: jobData.userId,
          classId: jobData.classId,
          requestId: `${jobData.requestId}_${conversationId}`,
          config: {
            includeDetailed: true,
            languageModel: 'gpt-4o-mini',
          },
        }
      );

      return { jobId: job.id! };
    } catch (error) {
      this.logger.error(`Failed to schedule analysis for conversation ${conversationId}: ${error.message}`);
      throw error;
    }
  }

  private generateBatchInsights(result: BatchAnalysisResult): string[] {
    const insights: string[] = [];

    // Success rate insights
    if (result.summary.success_rate >= 0.95) {
      insights.push('Excellent batch processing success rate');
    } else if (result.summary.success_rate >= 0.8) {
      insights.push('Good batch processing success rate');
    } else {
      insights.push('Consider investigating failed conversations for common issues');
    }

    // Performance insights
    if (result.summary.avg_processing_time < 30000) { // 30 seconds
      insights.push('Fast average processing time per conversation');
    } else if (result.summary.avg_processing_time > 120000) { // 2 minutes
      insights.push('Consider optimizing analysis algorithms for better performance');
    }

    // Scale insights
    if (result.total_conversations >= 50) {
      insights.push('Large batch processing completed successfully');
    }

    // Failure pattern insights
    if (result.failed_count > 0) {
      const failureRate = result.failed_count / result.total_conversations;
      if (failureRate > 0.1) {
        insights.push('High failure rate detected - review conversation quality or system capacity');
      }
    }

    return insights;
  }

  private async storeBatchAnalysisRecord(result: BatchAnalysisResult, jobData: BatchAnalysisJobData): Promise<void> {
    try {
      // Store in a batch_analyses table or similar
      // This would require a new database table for tracking batch operations
      this.logger.debug(`Batch analysis record stored for batch ${result.batch_id}`);
      
      // For now, just log the summary
      this.logger.log(`Batch ${result.batch_id} completed: ${result.completed_count}/${result.total_conversations} successful (${(result.summary.success_rate * 100).toFixed(1)}%)`);
    } catch (error) {
      this.logger.error(`Failed to store batch analysis record: ${error.message}`);
      // Don't throw - storage failure shouldn't fail the entire batch
    }
  }

  private isRetryableBatchError(error: Error): boolean {
    const retryableErrors = [
      'timeout',
      'connection',
      'network',
      'rate limit',
      'service unavailable',
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  protected validateJobData(job: Job<BatchAnalysisJobData>): void {
    super.validateJobData(job);

    const { conversationIds, analysisTypes } = job.data;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      throw new Error('No conversation IDs provided for batch analysis');
    }

    if (conversationIds.length > 100) {
      throw new Error('Batch size too large - maximum 100 conversations per batch');
    }

    if (!analysisTypes || !Array.isArray(analysisTypes) || analysisTypes.length === 0) {
      throw new Error('No analysis types specified');
    }

    // Validate conversation ID format
    for (const conversationId of conversationIds) {
      if (typeof conversationId !== 'string' || conversationId.length === 0) {
        throw new Error(`Invalid conversation ID: ${conversationId}`);
      }
    }

    // Validate analysis types
    const validTypes = ['sentiment', 'topic', 'argument', 'linguistic', 'interaction', 'quality'];
    for (const analysisType of analysisTypes) {
      if (!validTypes.includes(analysisType)) {
        throw new Error(`Invalid analysis type: ${analysisType}`);
      }
    }
  }

  async onCompleted(job: Job<BatchAnalysisJobData>, result: JobResult<BatchAnalysisResult>): Promise<void> {
    if (result.success && result.data) {
      this.logger.log(
        `Batch analysis ${result.data.batch_id} completed: ` +
        `${result.data.completed_count}/${result.data.total_conversations} conversations processed ` +
        `(${(result.data.summary.success_rate * 100).toFixed(1)}% success rate)`
      );

      // Optionally send notifications or trigger follow-up actions
      if (result.data.summary.success_rate < 0.8) {
        this.logger.warn(`Low success rate in batch ${result.data.batch_id}, consider investigation`);
      }
    }
  }

  async onFailed(job: Job<BatchAnalysisJobData>, error: Error): Promise<void> {
    this.logger.error(
      `Batch analysis job ${job.id} failed for ${job.data.conversationIds?.length || 0} conversations: ${error.message}`
    );

    // Optionally implement failure recovery or notification
    if (this.isRetryableBatchError(error) && job.attemptsMade < 2) {
      this.logger.log(`Batch analysis ${job.id} will be retried`);
    }
  }
}
