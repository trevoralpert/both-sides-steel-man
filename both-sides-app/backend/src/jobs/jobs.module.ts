import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

// Core modules
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ReflectionSystemModule } from '../reflection-system/reflection-system.module';

// Services
import { QueueManagerService } from './services/queue-manager.service';
import { JobMonitoringService } from './services/job-monitoring.service';

// Processors
import { TranscriptAnalysisProcessor } from './processors/transcript-analysis.processor';
import { BatchAnalysisProcessor } from './processors/batch-analysis.processor';

// Controllers (will be created later for API endpoints)
import { JobsController } from './controllers/jobs.controller';
import { JobMonitoringController } from './controllers/job-monitoring.controller';

/**
 * Jobs Module - Background Job Processing Foundation
 * 
 * This module provides comprehensive background job processing capabilities
 * including:
 * - Job scheduling and queue management
 * - AI analysis processors
 * - Job monitoring and health tracking
 * - Web-based job dashboard (Bull Board)
 * - RESTful APIs for job management
 */
@Module({
  imports: [
    // Core dependencies
    PrismaModule,
    RedisModule,
    ReflectionSystemModule,

    // Bull Board for job monitoring dashboard
    BullBoardModule.forRoot({
      route: '/jobs/dashboard',
      adapter: ExpressAdapter,
      middleware: {
        cors: false,
        compression: false,
      },
    }),
  ],
  providers: [
    // Core services
    QueueManagerService,
    JobMonitoringService,

    // Job processors
    TranscriptAnalysisProcessor,
    BatchAnalysisProcessor,
  ],
  controllers: [
    JobsController,
    JobMonitoringController,
  ],
  exports: [
    // Export services for use in other modules
    QueueManagerService,
    JobMonitoringService,
    
    // Export processors for direct access if needed
    TranscriptAnalysisProcessor,
    BatchAnalysisProcessor,
  ],
})
export class JobsModule {
  constructor(
    private readonly queueManager: QueueManagerService,
    private readonly transcriptProcessor: TranscriptAnalysisProcessor,
    private readonly batchProcessor: BatchAnalysisProcessor,
  ) {
    // Register all processors with the queue manager
    this.registerProcessors();

    // Configure Bull Board adapters
    this.configureBullBoard();
  }

  /**
   * Register job processors with the queue manager
   */
  private registerProcessors() {
    // Import job types
    const { JobType } = require('./interfaces/job.interfaces');

    // Register AI analysis processors
    this.queueManager.registerProcessor(JobType.TRANSCRIPT_ANALYSIS, this.transcriptProcessor);
    this.queueManager.registerProcessor(JobType.BATCH_ANALYSIS, this.batchProcessor);

    // Additional processors can be registered here as they are created
    // this.queueManager.registerProcessor(JobType.DEBATE_SUMMARY, this.debateSummaryProcessor);
    // this.queueManager.registerProcessor(JobType.ARGUMENT_ANALYSIS, this.argumentAnalysisProcessor);
    // this.queueManager.registerProcessor(JobType.LEARNING_INSIGHTS, this.learningInsightsProcessor);
  }

  /**
   * Configure Bull Board dashboard adapters
   */
  private configureBullBoard() {
    try {
      // This would typically be configured in the BullBoardModule setup
      // The actual queue adapters would be added dynamically based on the queues
      // created by the QueueManagerService
      
      // For now, this is a placeholder for future Bull Board configuration
      // when we have access to the actual Queue instances
    } catch (error) {
      console.warn('Bull Board configuration skipped during module initialization');
    }
  }
}
