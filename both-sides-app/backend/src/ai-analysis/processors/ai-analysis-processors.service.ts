import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

// Base processor classes from Jobs system
import { BaseJobProcessor, BaseAIProcessor } from '../../jobs/processors/base.processor';

// Job interfaces
import { 
  JobResult,
  TranscriptAnalysisJobData,
  ArgumentAnalysisJobData,
  LearningInsightsJobData,
  BatchAnalysisJobData,
} from '../../jobs/interfaces/job.interfaces';

// AI Analysis services
import { AnalysisOrchestratorService } from '../services/analysis-orchestrator.service';
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';
import { TopicAnalysisService } from '../services/topic-analysis.service';
import { ArgumentAnalysisService } from '../services/argument-analysis.service';
import { LearningInsightsService } from '../services/learning-insights.service';

// Data access
import { PrismaService } from '../../prisma/prisma.service';

// Interfaces
import { 
  ComprehensiveAnalysisRequest,
  SentimentAnalysisRequest,
  TopicAnalysisRequest,
  ArgumentAnalysisRequest,
  LearningInsightsRequest,
} from '../interfaces/analysis.interfaces';

/**
 * AI Analysis Processors Service
 * Integrates AI analysis services with the background job processing system
 * Provides job processors for different types of AI analysis operations
 */
@Injectable()
export class AIAnalysisProcessors {
  private readonly logger = new Logger(AIAnalysisProcessors.name);

  constructor(
    private readonly analysisOrchestrator: AnalysisOrchestratorService,
    private readonly sentimentService: SentimentAnalysisService,
    private readonly topicService: TopicAnalysisService,
    private readonly argumentService: ArgumentAnalysisService,
    private readonly learningService: LearningInsightsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create comprehensive transcript analysis processor
   */
  createTranscriptAnalysisProcessor(): BaseAIProcessor<TranscriptAnalysisJobData, any> {
    return new (class extends BaseAIProcessor<TranscriptAnalysisJobData, any> {
      constructor(
        private readonly orchestrator: AnalysisOrchestratorService,
        private readonly sentimentSvc: SentimentAnalysisService,
        private readonly topicSvc: TopicAnalysisService,
        private readonly argumentSvc: ArgumentAnalysisService,
        private readonly prismaSvc: PrismaService,
        private readonly logger: Logger,
      ) {
        super('TranscriptAnalysis');
      }

      protected async validateAIPrerequisites(data: TranscriptAnalysisJobData): Promise<void> {
        // Validate that conversation exists and has sufficient content
        const validation = await this.orchestrator.validateTranscriptForAnalysis(data.conversationId);
        
        if (!validation.valid) {
          throw new Error(`Transcript validation failed: ${validation.issues.join(', ')}`);
        }

        // Validate analysis types
        if (!data.analysisTypes || data.analysisTypes.length === 0) {
          throw new Error('No analysis types specified');
        }

        const validTypes = ['sentiment', 'topic', 'argument', 'linguistic', 'interaction', 'quality'];
        const invalidTypes = data.analysisTypes.filter(type => !validTypes.includes(type));
        if (invalidTypes.length > 0) {
          throw new Error(`Invalid analysis types: ${invalidTypes.join(', ')}`);
        }
      }

      protected async performAIAnalysis(job: Job<TranscriptAnalysisJobData>): Promise<any> {
        const { conversationId, analysisTypes, config } = job.data;

        // Get debate transcript
        const transcript = await this.getDebateTranscript(conversationId);

        // Update job progress
        await job.updateProgress({
          percentage: 10,
          current: 0,
          total: analysisTypes.length,
          stage: 'transcript_loaded',
          message: 'Debate transcript loaded successfully',
        });

        // Perform requested analyses
        const results: any = {};
        let completed = 0;

        for (const analysisType of analysisTypes) {
          const startProgress = 20 + (completed * 60) / analysisTypes.length;
          
          await job.updateProgress({
            percentage: startProgress,
            current: completed,
            total: analysisTypes.length,
            stage: `analyzing_${analysisType}`,
            message: `Performing ${analysisType} analysis`,
          });

          try {
            switch (analysisType) {
              case 'sentiment':
                const sentimentRequest: SentimentAnalysisRequest = {
                  conversationId,
                  includeEmotions: config?.includeDetailed || false,
                  trackProgression: config?.includeDetailed || false,
                  analysisOptions: { cacheResults: true },
                };
                results.sentiment = await this.sentimentSvc.analyzeSentiment(transcript, sentimentRequest);
                break;

              case 'topic':
                const topicRequest: TopicAnalysisRequest = {
                  conversationId,
                  detectDrift: true,
                  extractKeywords: true,
                  analyzeFocus: true,
                  analysisOptions: { cacheResults: true },
                };
                results.topic = await this.topicSvc.analyzeTopic(transcript, topicRequest);
                break;

              case 'argument':
                const argumentRequest: ArgumentAnalysisRequest = {
                  conversationId,
                  detectFallacies: true,
                  analyzeEvidence: true,
                  assessQuality: true,
                  includeStrengthsWeaknesses: config?.includeDetailed || false,
                  analysisOptions: { cacheResults: true },
                };
                results.argument = await this.argumentSvc.analyzeArguments(transcript, argumentRequest);
                break;

              default:
                this.logger.warn(`Analysis type ${analysisType} not yet implemented`);
                break;
            }

            completed++;

          } catch (error) {
            this.logger.error(`Failed ${analysisType} analysis for conversation ${conversationId}`, error);
            // Continue with other analyses, but record the error
            results[`${analysisType}_error`] = error.message;
          }
        }

        // Final progress update
        await job.updateProgress({
          percentage: 90,
          current: completed,
          total: analysisTypes.length,
          stage: 'storing_results',
          message: 'Storing analysis results',
        });

        // Store results in database
        await this.storeAnalysisResults(conversationId, results, job.data);

        return {
          conversationId,
          analysisTypes,
          completedAnalyses: Object.keys(results).filter(key => !key.endsWith('_error')),
          failedAnalyses: Object.keys(results).filter(key => key.endsWith('_error')),
          results: this.sanitizeResults(results),
        };
      }

      protected async postProcessResults(result: any, data: TranscriptAnalysisJobData): Promise<any> {
        // Add metadata and perform any post-processing
        return {
          ...result,
          metadata: {
            jobData: this.sanitizeJobData(data),
            processingTimestamp: new Date().toISOString(),
            version: '1.0',
          },
        };
      }

      protected getAIModel(): string {
        return process.env.OPENAI_MODEL || 'gpt-4o-mini';
      }

      private async getDebateTranscript(conversationId: string): Promise<any> {
        // Get conversation data - this would be implemented based on your schema
        const conversation = await this.prismaSvc.conversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: {
              where: { status: { not: 'DELETED' } },
              orderBy: { created_at: 'asc' },
              include: {
                user: { select: { id: true, first_name: true, last_name: true } },
              },
            },
          },
        });

        if (!conversation) {
          throw new Error(`Conversation ${conversationId} not found`);
        }

        // Transform to expected transcript format
        return {
          conversationId: conversation.id,
          participants: this.extractParticipants(conversation.messages),
          messages: this.transformMessages(conversation.messages),
          topic: { title: 'Debate Topic', description: '' },
          metadata: {
            duration: 0,
            messageCount: conversation.messages.length,
            participantCount: new Set(conversation.messages.map((m: any) => m.user_id)).size,
            status: conversation.status,
            startTime: new Date(conversation.created_at),
            endTime: conversation.ended_at ? new Date(conversation.ended_at) : undefined,
          },
        };
      }

      private extractParticipants(messages: any[]): any[] {
        const participantMap = new Map();
        
        messages.forEach(msg => {
          if (!participantMap.has(msg.user_id)) {
            participantMap.set(msg.user_id, {
              id: msg.user_id,
              role: 'participant', // Simplified
              messageCount: 0,
              wordCount: 0,
              avgResponseTime: 30000,
            });
          }
          
          const participant = participantMap.get(msg.user_id);
          participant.messageCount++;
          participant.wordCount += msg.content?.split(/\s+/).length || 0;
        });

        return Array.from(participantMap.values());
      }

      private transformMessages(messages: any[]): any[] {
        return messages.map(msg => ({
          id: msg.id,
          userId: msg.user_id,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          wordCount: msg.content?.split(/\s+/).length || 0,
          messageType: 'argument', // Simplified
          phase: 'discussion', // Simplified
        }));
      }

      private async storeAnalysisResults(conversationId: string, results: any, jobData: any): Promise<void> {
        try {
          // Store results in the appropriate Phase 7 tables
          if (results.sentiment) {
            await this.prismaSvc.transcriptAnalysis.upsert({
              where: { conversation_id: conversationId },
              update: {
                sentiment_data: results.sentiment as any,
                status: 'COMPLETED',
                updated_at: new Date(),
              },
              create: {
                conversation_id: conversationId,
                user_id: jobData.userId || '',
                analysis_version: '1.0',
                sentiment_data: results.sentiment as any,
                status: 'COMPLETED',
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          }

          if (results.argument) {
            await this.prismaSvc.argumentAnalysis.create({
              data: {
                conversation_id: conversationId,
                user_id: jobData.userId || '',
                analysis_version: '1.0',
                arguments_data: results.argument.arguments as any,
                evidence_data: results.argument.qualityMetrics as any,
                reasoning_data: results.argument.participantScores as any,
                fallacy_data: results.argument.fallacies as any,
                status: 'COMPLETED',
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          }

          this.logger.debug(`Stored analysis results for conversation ${conversationId}`);

        } catch (error) {
          this.logger.error(`Failed to store analysis results for conversation ${conversationId}`, error);
          // Don't throw - storage failure shouldn't fail the analysis job
        }
      }

      private sanitizeResults(results: any): any {
        // Remove sensitive data and limit result size
        const sanitized: any = {};
        
        Object.keys(results).forEach(key => {
          if (key.endsWith('_error')) {
            sanitized[key] = results[key];
          } else {
            sanitized[key] = {
              analysisId: results[key]?.analysisId,
              status: results[key]?.status,
              confidence: results[key]?.confidence,
              processingTime: results[key]?.processingTime,
              // Include summary data but not full detailed results
              summary: this.extractSummary(results[key]),
            };
          }
        });

        return sanitized;
      }

      private extractSummary(analysisResult: any): any {
        if (!analysisResult) return null;

        switch (analysisResult.analysisType) {
          case 'sentiment':
            return {
              overallPolarity: analysisResult.overallSentiment?.polarity,
              emotionalStability: analysisResult.participantSentiments ? 
                Object.values(analysisResult.participantSentiments).map((p: any) => p.emotionalStability) : [],
            };
          case 'topic':
            return {
              coherenceScore: analysisResult.topicCoherence?.coherenceScore,
              focusScore: analysisResult.focus?.focusScore,
              mainTopics: analysisResult.mainTopics?.slice(0, 3).map((t: any) => t.topic),
            };
          case 'argument':
            return {
              overallQuality: analysisResult.qualityMetrics?.overallQuality,
              fallacyCount: analysisResult.fallacies?.length || 0,
              argumentCount: analysisResult.arguments?.length || 0,
            };
          default:
            return { analysisType: analysisResult.analysisType };
        }
      }

      private sanitizeJobData(data: any): any {
        return {
          conversationId: data.conversationId,
          analysisTypes: data.analysisTypes,
          requestTimestamp: new Date().toISOString(),
        };
      }

    })(
      this.analysisOrchestrator,
      this.sentimentService,
      this.topicService,
      this.argumentService,
      this.prisma,
      this.logger,
    );
  }

  /**
   * Create learning insights processor
   */
  createLearningInsightsProcessor(): BaseAIProcessor<LearningInsightsJobData, any> {
    return new (class extends BaseAIProcessor<LearningInsightsJobData, any> {
      constructor(
        private readonly learningService: LearningInsightsService,
        private readonly prismaSvc: PrismaService,
        private readonly logger: Logger,
      ) {
        super('LearningInsights');
      }

      protected async validateAIPrerequisites(data: LearningInsightsJobData): Promise<void> {
        if (!data.userId) {
          throw new Error('Target user ID is required for learning insights');
        }

        if (!data.insightTypes || data.insightTypes.length === 0) {
          throw new Error('At least one insight type must be specified');
        }

        // Validate user exists in conversation
        const conversation = await this.prismaSvc.conversation.findFirst({
          where: {
            id: data.conversationId,
            messages: {
              some: { user_id: data.userId },
            },
          },
        });

        if (!conversation) {
          throw new Error(`User ${data.userId} not found in conversation ${data.conversationId}`);
        }
      }

      protected async performAIAnalysis(job: Job<LearningInsightsJobData>): Promise<any> {
        const { conversationId, userId, insightTypes, config } = job.data;

        // Get debate transcript (reuse the method from transcript processor)
        const transcript = await this.getDebateTranscript(conversationId);

        const request: LearningInsightsRequest = {
          conversationId,
          targetUserId: userId,
          insightTypes: insightTypes as any,
          compareToClass: config?.compareToClass ?? false,
          includeRecommendations: config?.includeRecommendations ?? true,
          personalizationLevel: config?.personalizationLevel || 'detailed',
          analysisOptions: { cacheResults: true },
        };

        return await this.learningService.generateLearningInsights(transcript, request);
      }

      protected async postProcessResults(result: any, data: LearningInsightsJobData): Promise<any> {
        // Store learning insights
        await this.storeLearningInsights(result, data);

        return {
          insightId: result.analysisId,
          conversationId: result.conversationId,
          targetUserId: data.userId,
          skillAssessment: result.skillAssessment,
          recommendations: result.recommendations?.slice(0, 5), // Limit recommendations
          insights: result.insights?.slice(0, 3), // Limit insights
          confidence: result.confidence,
        };
      }

      protected getAIModel(): string {
        return process.env.OPENAI_MODEL || 'gpt-4o-mini';
      }

      private async getDebateTranscript(conversationId: string): Promise<any> {
        // Similar implementation to transcript processor
        const conversation = await this.prismaSvc.conversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: {
              where: { status: { not: 'DELETED' } },
              orderBy: { created_at: 'asc' },
            },
          },
        });

        if (!conversation) {
          throw new Error(`Conversation ${conversationId} not found`);
        }

        // Transform to expected format (simplified)
        return {
          conversationId,
          participants: [],
          messages: conversation.messages.map((msg: any) => ({
            id: msg.id,
            userId: msg.user_id,
            content: msg.content,
            timestamp: new Date(msg.created_at),
            wordCount: msg.content?.split(/\s+/).length || 0,
            messageType: 'argument',
            phase: 'discussion',
          })),
          topic: { title: 'Debate Topic' },
          metadata: {
            duration: 0,
            messageCount: conversation.messages.length,
            participantCount: 1,
            status: conversation.status,
            startTime: new Date(conversation.created_at),
          },
        };
      }

      private async storeLearningInsights(result: any, jobData: LearningInsightsJobData): Promise<void> {
        try {
          await this.prismaSvc.learningInsight.create({
            data: {
              debate_id: jobData.conversationId,
              user_id: jobData.userId,
              insight_type: 'comprehensive',
              insight_version: '1.0',
              status: 'COMPLETED',
              payload: result as any,
              actionability_score: 0.8, // Calculate based on recommendations
              relevance_score: result.confidence || 0.7,
              priority_level: 'medium',
              created_at: new Date(),
              updated_at: new Date(),
            },
          });

          this.logger.debug(`Stored learning insights for user ${jobData.userId} in conversation ${jobData.conversationId}`);

        } catch (error) {
          this.logger.error('Failed to store learning insights', error);
        }
      }

    })(this.learningService, this.prisma, this.logger);
  }

  /**
   * Get all available processors for job registration
   */
  getAllProcessors(): { [key: string]: BaseJobProcessor } {
    return {
      transcript_analysis: this.createTranscriptAnalysisProcessor(),
      learning_insights: this.createLearningInsightsProcessor(),
    };
  }

  /**
   * Register all processors with the queue manager
   */
  registerProcessors(queueManager: any): void {
    const processors = this.getAllProcessors();
    
    Object.entries(processors).forEach(([type, processor]) => {
      // Map to job types from jobs system
      let jobType: string;
      switch (type) {
        case 'transcript_analysis':
          jobType = 'TRANSCRIPT_ANALYSIS';
          break;
        case 'learning_insights':
          jobType = 'LEARNING_INSIGHTS';
          break;
        default:
          jobType = type.toUpperCase();
      }

      queueManager.registerProcessor(jobType, processor);
      this.logger.log(`Registered AI analysis processor: ${type} -> ${jobType}`);
    });
  }
}
