/**
 * AI Analysis Engine - Phase 7 Task 7.2
 * Comprehensive exports for AI-powered debate analysis
 */

// Core Module
export { AIAnalysisModule } from './ai-analysis.module';

// Services
export { OpenAIService } from './services/openai.service';
export { SentimentAnalysisService } from './services/sentiment-analysis.service';
export { TopicAnalysisService } from './services/topic-analysis.service';
export { ArgumentAnalysisService } from './services/argument-analysis.service';
export { LearningInsightsService } from './services/learning-insights.service';
export { AnalysisOrchestratorService } from './services/analysis-orchestrator.service';

// Controllers
export { AIAnalysisController } from './controllers/ai-analysis.controller';

// Processors
export { AIAnalysisProcessors } from './processors/ai-analysis-processors.service';

// Interfaces and Types
export * from './interfaces/analysis.interfaces';

// Re-export commonly used types for convenience
export type {
  DebateTranscript,
  BaseAnalysisRequest,
  BaseAnalysisResult,
  ComprehensiveAnalysisRequest,
  ComprehensiveAnalysisResult,
  SentimentAnalysisRequest,
  SentimentAnalysisResult,
  TopicAnalysisRequest,
  TopicAnalysisResult,
  ArgumentAnalysisRequest,
  ArgumentAnalysisResult,
  LearningInsightsRequest,
  LearningInsightsResult,
  AnalysisJobConfig,
  AnalysisProgress,
} from './interfaces/analysis.interfaces';

// Constants and Presets
export { ANALYSIS_PRESETS, DEFAULT_VALIDATION } from './interfaces/analysis.interfaces';

/**
 * AI Analysis Engine Summary
 * 
 * This module provides comprehensive AI-powered analysis of debate transcripts:
 * 
 * Core Services:
 * - SentimentAnalysisService: Emotional tone and sentiment pattern analysis
 * - TopicAnalysisService: Topic coherence, drift detection, keyword extraction
 * - ArgumentAnalysisService: Argument quality, evidence evaluation, fallacy detection
 * - LearningInsightsService: Personalized learning recommendations and skill assessment
 * - AnalysisOrchestratorService: Workflow coordination and comprehensive analysis
 * 
 * Key Features:
 * - OpenAI GPT-4o-mini integration with intelligent caching
 * - Background job processing with real-time progress tracking
 * - Educational focus with age-appropriate analysis and growth mindset
 * - RESTful API with comprehensive endpoints
 * - Production-ready security with authentication and rate limiting
 * - Comprehensive error handling and recovery mechanisms
 * 
 * Educational Value:
 * - Personalized skill assessment for critical thinking, communication, collaboration
 * - Evidence-based insights with specific improvement recommendations
 * - Teacher analytics for class-wide patterns and individual student progress
 * - Growth-oriented feedback that encourages learning and development
 * 
 * Technical Excellence:
 * - Full TypeScript coverage with comprehensive interfaces
 * - Redis caching for performance optimization
 * - Background processing for scalability
 * - Health monitoring and performance analytics
 * - Secure API design with proper authentication and authorization
 * 
 * Integration:
 * - Phase 7 database integration for result storage
 * - Background job system integration for scalable processing
 * - Existing authentication system compatibility
 * - Real-time progress tracking and notification support
 */
