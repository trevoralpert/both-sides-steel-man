import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

// Task 7.1.2: Data Access Services
import { DebateTranscriptService } from './services/debate-transcript.service';
import { DebateAnalysisService } from './services/debate-analysis.service';
import { DataValidationService } from './services/data-validation.service';
import { TranscriptCacheService } from './services/transcript-cache.service';
import { ErrorHandlingService } from './services/error-handling.service';

// Task 7.3.1: Dynamic Prompt Generation Services
import { ReflectionPromptService } from './services/reflection-prompt.service';
import { PromptTemplateManagerService } from './services/prompt-template-manager.service';
import { PromptPersonalizationService } from './services/prompt-personalization.service';

// Task 7.3.2: Response Collection Services
import { ReflectionResponseService } from './services/reflection-response.service';
import { MediaService } from './services/media.service';
import { BatchOperationsService } from './services/batch-operations.service';

// Task 7.3.3: Progress Tracking Services
import { ReflectionProgressService } from './services/reflection-progress.service';
import { GamificationService } from './services/gamification.service';

// Task 7.3.4: Quality Validation Services
import { QualityValidationService } from './services/quality-validation.service';
import { TeacherReviewService } from './services/teacher-review.service';

// Controllers
import { ReflectionPromptController } from './controllers/reflection-prompt.controller';
import { ReflectionController } from './controllers/reflection.controller';
import { ProgressTrackingController } from './controllers/progress-tracking.controller';
import { QualityValidationController } from './controllers/quality-validation.controller';

/**
 * Module for Phase 7: Reflection & Learning System
 * 
 * This module provides services for:
 * - Accessing and processing debate transcripts (Task 7.1.2)
 * - Validating and sanitizing debate data
 * - Caching frequently accessed data
 * - Handling errors in data processing
 * - Dynamic reflection prompt generation (Task 7.3.1)
 * - Prompt template management and versioning
 * - Intelligent prompt personalization
 * - A/B testing for prompt optimization
 * - Reflection session management and response collection (Task 7.3.2)
 * - Media upload and processing with content analysis
 * - Batch operations for teacher tools and analytics
 * - Progress tracking and gamification (Task 7.3.3)
 * - Achievement systems and student levels
 * - Real-time analytics and predictive insights
 * - Quality validation and automated scoring (Task 7.3.4)
 * - Teacher review workflows and collaboration
 * - Completion validation and quality control
 */
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
  ],
  providers: [
    // Task 7.1.2: Core data access services
    DebateTranscriptService,
    DebateAnalysisService,
    DataValidationService,
    TranscriptCacheService,
    ErrorHandlingService,
    
    // Task 7.3.1: Dynamic prompt generation services
    ReflectionPromptService,
    PromptTemplateManagerService,
    PromptPersonalizationService,
    
    // Task 7.3.2: Response collection and management services
    ReflectionResponseService,
    MediaService,
    BatchOperationsService,
    
    // Task 7.3.3: Progress tracking and gamification services
    ReflectionProgressService,
    GamificationService,
    
    // Task 7.3.4: Quality validation and teacher review services
    QualityValidationService,
    TeacherReviewService,
  ],
  controllers: [
    ReflectionPromptController,
    ReflectionController,
    ProgressTrackingController,
    QualityValidationController,
  ],
  exports: [
    // Export data access services for use in other modules
    DebateTranscriptService,
    DebateAnalysisService,
    DataValidationService,
    TranscriptCacheService,
    ErrorHandlingService,
    
    // Export prompt generation services
    ReflectionPromptService,
    PromptTemplateManagerService,
    PromptPersonalizationService,
    
    // Export response collection services
    ReflectionResponseService,
    MediaService,
    BatchOperationsService,
    
    // Export progress tracking and gamification services
    ReflectionProgressService,
    GamificationService,
    
    // Export quality validation and teacher review services
    QualityValidationService,
    TeacherReviewService,
  ],
})
export class ReflectionSystemModule {}
