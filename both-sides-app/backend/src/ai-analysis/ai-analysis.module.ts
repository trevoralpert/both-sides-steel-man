import { Module } from '@nestjs/common';

// Core modules
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CommonModule } from '../common/common.module';
import { JobsModule } from '../jobs/jobs.module';

// AI Analysis Services
import { OpenAIService } from './services/openai.service';
import { SentimentAnalysisService } from './services/sentiment-analysis.service';
import { TopicAnalysisService } from './services/topic-analysis.service';
import { ArgumentAnalysisService } from './services/argument-analysis.service';
import { LearningInsightsService } from './services/learning-insights.service';
import { AnalysisOrchestratorService } from './services/analysis-orchestrator.service';

// Controllers
import { AIAnalysisController } from './controllers/ai-analysis.controller';

// Processors for integration with Jobs system
import { AIAnalysisProcessors } from './processors/ai-analysis-processors.service';

/**
 * AI Analysis Module - Phase 7 Task 7.2
 * 
 * Provides comprehensive AI-powered analysis capabilities for debate transcripts:
 * - Sentiment analysis with emotion tracking
 * - Topic analysis with drift detection and keyword extraction
 * - Argument analysis with fallacy detection and quality assessment
 * - Personalized learning insights generation
 * - Orchestrated comprehensive analysis workflows
 * - Integration with background job processing system
 */
@Module({
  imports: [
    // Core dependencies
    PrismaModule,
    RedisModule,
    CommonModule,
    JobsModule, // For background job processing integration
  ],
  providers: [
    // Core OpenAI service
    OpenAIService,
    
    // Specialized analysis services
    SentimentAnalysisService,
    TopicAnalysisService,
    ArgumentAnalysisService,
    LearningInsightsService,
    
    // Orchestration service
    AnalysisOrchestratorService,
    
    // Job processors for background processing
    AIAnalysisProcessors,
  ],
  controllers: [
    AIAnalysisController,
  ],
  exports: [
    // Export services for use in other modules
    OpenAIService,
    SentimentAnalysisService,
    TopicAnalysisService,
    ArgumentAnalysisService,
    LearningInsightsService,
    AnalysisOrchestratorService,
    
    // Export processors for job system integration
    AIAnalysisProcessors,
  ],
})
export class AIAnalysisModule {
  constructor(
    private readonly orchestratorService: AnalysisOrchestratorService,
  ) {
    // Initialize any module-level configuration
    this.initializeModule();
  }

  /**
   * Initialize module configuration
   */
  private initializeModule(): void {
    // Log module initialization
    console.log('🧠 AI Analysis Engine initialized successfully');
    console.log('   ✅ OpenAI integration ready');
    console.log('   ✅ Sentiment analysis service ready');
    console.log('   ✅ Topic analysis service ready');
    console.log('   ✅ Argument analysis service ready');
    console.log('   ✅ Learning insights service ready');
    console.log('   ✅ Analysis orchestrator ready');
    console.log('   ✅ Background job integration ready');
  }

  /**
   * Get module health status
   */
  async getModuleHealth(): Promise<any> {
    return this.orchestratorService.getSystemHealth();
  }
}
