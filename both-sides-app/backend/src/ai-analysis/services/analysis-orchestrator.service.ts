import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';

// AI Analysis Services
import { OpenAIService } from './openai.service';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { TopicAnalysisService } from './topic-analysis.service';
import { ArgumentAnalysisService } from './argument-analysis.service';
import { LearningInsightsService } from './learning-insights.service';

// Interfaces
import {
  DebateTranscript,
  BaseAnalysisRequest,
  ComprehensiveAnalysisRequest,
  ComprehensiveAnalysisResult,
  SentimentAnalysisRequest,
  TopicAnalysisRequest,
  ArgumentAnalysisRequest,
  LearningInsightsRequest,
  AnalysisJobConfig,
  AnalysisProgress,
  ANALYSIS_PRESETS,
} from '../interfaces/analysis.interfaces';

// Job Processing
import { QueueManagerService } from '../../jobs/services/queue-manager.service';
import { JobType, JobPriority } from '../../jobs/interfaces/job.interfaces';

/**
 * Analysis Orchestrator Service
 * Coordinates multiple AI analysis services and manages analysis workflows
 */
@Injectable()
export class AnalysisOrchestratorService {
  private readonly logger = new Logger(AnalysisOrchestratorService.name);
  private readonly activeAnalyses = new Map<string, AnalysisProgress>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly queueManager: QueueManagerService,
    private readonly openaiService: OpenAIService,
    private readonly sentimentService: SentimentAnalysisService,
    private readonly topicService: TopicAnalysisService,
    private readonly argumentService: ArgumentAnalysisService,
    private readonly learningInsightsService: LearningInsightsService,
  ) {}

  /**
   * Perform comprehensive analysis including multiple analysis types
   */
  async performComprehensiveAnalysis(
    transcript: DebateTranscript,
    request: ComprehensiveAnalysisRequest
  ): Promise<ComprehensiveAnalysisResult> {
    const startTime = Date.now();
    this.logger.log(`Starting comprehensive analysis for conversation ${transcript.conversationId}`);

    try {
      // Initialize progress tracking
      const progressId = this.initializeProgress(transcript.conversationId, [
        'sentiment',
        'topic', 
        'argument',
        'learning'
      ].filter(type => (request as any)[`include${type.charAt(0).toUpperCase()}${type.slice(1)}`]));

      // Perform individual analyses in parallel where possible
      const analysisPromises: Promise<any>[] = [];
      const analyses: any = {};

      // Sentiment Analysis
      if (request.includeSentiment) {
        this.updateProgress(progressId, 10, 'sentiment_analysis', 'Starting sentiment analysis');
        const sentimentRequest: SentimentAnalysisRequest = {
          conversationId: request.conversationId,
          userId: request.userId,
          classId: request.classId,
          includeEmotions: true,
          trackProgression: true,
          analysisOptions: request.analysisOptions,
        };
        analysisPromises.push(
          this.sentimentService.analyzeSentiment(transcript, sentimentRequest)
            .then(result => {
              analyses.sentiment = result;
              this.updateProgress(progressId, 30, 'sentiment_completed', 'Sentiment analysis completed');
            })
        );
      }

      // Topic Analysis
      if (request.includeTopic) {
        this.updateProgress(progressId, 15, 'topic_analysis', 'Starting topic analysis');
        const topicRequest: TopicAnalysisRequest = {
          conversationId: request.conversationId,
          userId: request.userId,
          classId: request.classId,
          detectDrift: true,
          extractKeywords: true,
          analyzeFocus: true,
          analysisOptions: request.analysisOptions,
        };
        analysisPromises.push(
          this.topicService.analyzeTopic(transcript, topicRequest)
            .then(result => {
              analyses.topic = result;
              this.updateProgress(progressId, 50, 'topic_completed', 'Topic analysis completed');
            })
        );
      }

      // Argument Analysis
      if (request.includeArgument) {
        this.updateProgress(progressId, 20, 'argument_analysis', 'Starting argument analysis');
        const argumentRequest: ArgumentAnalysisRequest = {
          conversationId: request.conversationId,
          userId: request.userId,
          classId: request.classId,
          detectFallacies: true,
          analyzeEvidence: true,
          assessQuality: true,
          includeStrengthsWeaknesses: true,
          analysisOptions: request.analysisOptions,
        };
        analysisPromises.push(
          this.argumentService.analyzeArguments(transcript, argumentRequest)
            .then(result => {
              analyses.argument = result;
              this.updateProgress(progressId, 70, 'argument_completed', 'Argument analysis completed');
            })
        );
      }

      // Wait for all analyses to complete
      await Promise.all(analysisPromises);

      // Learning Insights (depends on other analyses)
      if (request.includeLearning && request.targetUserId) {
        this.updateProgress(progressId, 80, 'learning_insights', 'Generating learning insights');
        const learningRequest: LearningInsightsRequest = {
          conversationId: request.conversationId,
          targetUserId: request.targetUserId,
          userId: request.userId,
          classId: request.classId,
          insightTypes: ['skills', 'knowledge', 'behavior', 'engagement', 'growth'],
          compareToClass: true,
          includeRecommendations: true,
          personalizationLevel: 'advanced',
          analysisOptions: request.analysisOptions,
        };

        analyses.learning = await this.learningInsightsService.generateLearningInsights(
          transcript,
          learningRequest,
          {
            sentiment: analyses.sentiment,
            topic: analyses.topic,
            argument: analyses.argument,
          }
        );
      }

      this.updateProgress(progressId, 90, 'synthesizing', 'Synthesizing results');

      // Create comprehensive result with synthesis
      const result = await this.synthesizeAnalysisResults(
        transcript,
        request,
        analyses,
        startTime
      );

      this.updateProgress(progressId, 100, 'completed', 'Analysis completed successfully');

      // Store results if requested
      if (request.analysisOptions?.cacheResults) {
        await this.storeAnalysisResults(result);
      }

      this.logger.log(
        `Completed comprehensive analysis for conversation ${transcript.conversationId} in ${result.processingTime}ms`
      );

      return result;

    } catch (error) {
      this.logger.error(
        `Comprehensive analysis failed for conversation ${transcript.conversationId}`,
        error.stack
      );

      // Create failed result
      return this.createFailedComprehensiveResult(transcript, request, startTime, error.message);
    } finally {
      // Clean up progress tracking
      this.activeAnalyses.delete(transcript.conversationId);
    }
  }

  /**
   * Schedule analysis job for background processing
   */
  async scheduleAnalysisJob(
    conversationId: string,
    config: AnalysisJobConfig
  ): Promise<{ jobId: string; estimatedCompletion: Date }> {
    try {
      this.logger.log(`Scheduling analysis job for conversation ${conversationId}`);

      // Determine primary analysis type for job scheduling
      const primaryAnalysisType = this.determinePrimaryAnalysisType(config.analysisTypes);
      
      // Map analysis types to job data
      const jobData = {
        conversationId,
        analysisTypes: config.analysisTypes,
        userId: '', // Will be set from conversation data
        priority: this.mapPriority(config.priority),
        config: {
          includeDetailed: true,
          cacheResults: config.storage?.persistResults ?? true,
          notifyOnComplete: config.notification?.onComplete ?? false,
        },
        requestId: `analysis_${conversationId}_${Date.now()}`,
      };

      // Schedule the job
      const job = await this.queueManager.schedule(
        primaryAnalysisType,
        jobData,
        {
          priority: this.mapPriority(config.priority),
          delay: config.scheduling?.delay || 0,
        }
      );

      const estimatedCompletion = this.estimateJobCompletion(config.analysisTypes);

      return {
        jobId: job.id!,
        estimatedCompletion,
      };

    } catch (error) {
      this.logger.error(`Failed to schedule analysis job for conversation ${conversationId}`, error.stack);
      throw error;
    }
  }

  /**
   * Get analysis progress for a conversation
   */
  getAnalysisProgress(conversationId: string): AnalysisProgress | null {
    return this.activeAnalyses.get(conversationId) || null;
  }

  /**
   * Cancel ongoing analysis
   */
  async cancelAnalysis(conversationId: string): Promise<boolean> {
    const progress = this.activeAnalyses.get(conversationId);
    if (!progress) {
      return false;
    }

    try {
      // If there's a job ID, cancel the background job
      if (progress.currentStage.includes('job_')) {
        const jobId = progress.currentStage.replace('job_', '');
        await this.queueManager.cancelJob(jobId);
      }

      // Update progress to cancelled
      progress.status = 'failed';
      progress.errors = [{
        analysisType: 'all',
        error: 'Analysis cancelled by user',
        recoverable: false,
      }];

      this.activeAnalyses.set(conversationId, progress);
      
      this.logger.log(`Cancelled analysis for conversation ${conversationId}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to cancel analysis for conversation ${conversationId}`, error.stack);
      return false;
    }
  }

  /**
   * Get analysis preset configuration
   */
  getAnalysisPreset(presetName: keyof typeof ANALYSIS_PRESETS): any {
    return ANALYSIS_PRESETS[presetName] || ANALYSIS_PRESETS.DETAILED;
  }

  /**
   * Validate transcript data for analysis
   */
  async validateTranscriptForAnalysis(conversationId: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      // Get conversation data
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            where: { status: { not: 'DELETED' } },
            orderBy: { created_at: 'asc' },
          },
          // Add other necessary relations when available
        },
      });

      if (!conversation) {
        return {
          valid: false,
          issues: ['Conversation not found'],
          recommendations: ['Ensure the conversation ID is correct'],
        };
      }

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check message count
      if (conversation.messages.length < 5) {
        issues.push('Insufficient messages for meaningful analysis');
        recommendations.push('Encourage more detailed discussion before analysis');
      }

      // Check content length
      const totalWordCount = conversation.messages.reduce((sum: number, msg: any) => {
        return sum + (msg.content?.split(/\s+/).length || 0);
      }, 0);

      if (totalWordCount < 200) {
        issues.push('Insufficient content for detailed analysis');
        recommendations.push('Encourage longer, more detailed responses');
      }

      // Check participant diversity
      const uniqueParticipants = new Set(conversation.messages.map((msg: any) => msg.user_id));
      if (uniqueParticipants.size < 2) {
        issues.push('Only one participant found');
        recommendations.push('Analysis works best with multiple participants');
      }

      // Check conversation status
      if (conversation.status !== 'COMPLETED') {
        issues.push('Conversation is not yet completed');
        recommendations.push('Wait for conversation completion for best results');
      }

      return {
        valid: issues.length === 0,
        issues,
        recommendations,
      };

    } catch (error) {
      this.logger.error(`Failed to validate transcript for conversation ${conversationId}`, error.stack);
      return {
        valid: false,
        issues: ['Failed to validate transcript'],
        recommendations: ['Check conversation exists and is accessible'],
      };
    }
  }

  /**
   * Get system health for all analysis services
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, any>;
    overall: any;
  }> {
    try {
      const [
        openaiHealth,
        sentimentHealth,
        topicHealth,
        argumentHealth,
        learningHealth,
      ] = await Promise.all([
        this.openaiService.healthCheck(),
        this.sentimentService.getHealthStatus(),
        this.topicService.getHealthStatus(),
        this.argumentService.getHealthStatus(),
        this.learningInsightsService.getHealthStatus(),
      ]);

      const services = {
        openai: openaiHealth,
        sentiment: sentimentHealth,
        topic: topicHealth,
        argument: argumentHealth,
        learning: learningHealth,
      };

      // Determine overall status
      const statuses = Object.values(services).map((service: any) => service.status);
      const healthyCount = statuses.filter(status => status === 'healthy' || status === 'ready').length;
      const totalServices = statuses.length;

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyCount === totalServices) {
        overallStatus = 'healthy';
      } else if (healthyCount >= totalServices * 0.6) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'unhealthy';
      }

      const usageStats = this.openaiService.getUsageStats();

      return {
        status: overallStatus,
        services,
        overall: {
          healthyServices: healthyCount,
          totalServices,
          activeAnalyses: this.activeAnalyses.size,
          usageStats,
          lastCheck: new Date().toISOString(),
        },
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        services: {},
        overall: {
          error: error.message,
          lastCheck: new Date().toISOString(),
        },
      };
    }
  }

  // Private helper methods

  private initializeProgress(conversationId: string, analysisTypes: string[]): string {
    const progressId = conversationId;
    const progress: AnalysisProgress = {
      jobId: progressId,
      conversationId,
      status: 'processing',
      progress: 0,
      currentStage: 'initializing',
      estimatedCompletion: this.estimateJobCompletion(analysisTypes),
      completedAnalyses: [],
      errors: [],
    };

    this.activeAnalyses.set(progressId, progress);
    return progressId;
  }

  private updateProgress(
    progressId: string,
    percentage: number,
    stage: string,
    message?: string
  ): void {
    const progress = this.activeAnalyses.get(progressId);
    if (progress) {
      progress.progress = percentage;
      progress.currentStage = stage;
      if (stage.endsWith('_completed')) {
        const analysisType = stage.replace('_completed', '');
        progress.completedAnalyses.push(analysisType);
      }
      this.activeAnalyses.set(progressId, progress);
    }
  }

  private async synthesizeAnalysisResults(
    transcript: DebateTranscript,
    request: ComprehensiveAnalysisRequest,
    analyses: any,
    startTime: number
  ): Promise<ComprehensiveAnalysisResult> {
    
    // Calculate overall metrics
    const overallQuality = this.calculateOverallQuality(analyses);
    const educationalValue = this.calculateEducationalValue(analyses);
    const engagementLevel = this.calculateEngagementLevel(analyses);

    // Generate synthesis insights
    const synthesis = await this.generateSynthesis(transcript, analyses);

    return {
      analysisId: `comprehensive_${transcript.conversationId}_${Date.now()}`,
      conversationId: transcript.conversationId,
      analysisType: 'comprehensive',
      version: '1.0',
      status: 'completed',
      confidence: this.calculateOverallConfidence(analyses),
      processingTime: Date.now() - startTime,
      tokensUsed: Object.values(analyses).reduce((sum: number, analysis: any) => sum + (analysis?.tokensUsed || 0), 0),
      createdAt: new Date(),
      
      summary: {
        overallQuality,
        educationalValue,
        engagementLevel,
        keyInsights: synthesis.lessons,
      },
      
      sentiment: analyses.sentiment,
      topic: analyses.topic,
      argument: analyses.argument,
      learning: analyses.learning,
      
      synthesis,
    };
  }

  private calculateOverallQuality(analyses: any): number {
    const scores: number[] = [];
    
    if (analyses.argument?.qualityMetrics?.overallQuality) {
      scores.push(analyses.argument.qualityMetrics.overallQuality);
    }
    
    if (analyses.topic?.topicCoherence?.coherenceScore) {
      scores.push(analyses.topic.topicCoherence.coherenceScore);
    }
    
    if (analyses.sentiment?.overallSentiment?.neutrality) {
      // Convert neutrality to positive quality score
      scores.push(1 - Math.abs(analyses.sentiment.overallSentiment.polarity));
    }

    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.7;
  }

  private calculateEducationalValue(analyses: any): number {
    let value = 0.6; // Base value

    if (analyses.argument?.qualityMetrics?.evidenceStrength > 0.6) value += 0.1;
    if (analyses.topic?.topicCoherence?.overall > 0.7) value += 0.1;
    if (analyses.argument?.qualityMetrics?.argumentDiversity > 0.5) value += 0.1;
    if (analyses.learning?.skillAssessment?.criticalThinking?.score > 0.6) value += 0.1;

    return Math.min(1, value);
  }

  private calculateEngagementLevel(analyses: any): number {
    let engagement = 0.5; // Base engagement

    if (analyses.argument?.qualityMetrics?.engagementLevel) {
      engagement = Math.max(engagement, analyses.argument.qualityMetrics.engagementLevel);
    }

    if (analyses.learning?.behaviorInsights?.engagementPatterns?.participationLevel) {
      engagement = Math.max(engagement, analyses.learning.behaviorInsights.engagementPatterns.participationLevel);
    }

    return engagement;
  }

  private calculateOverallConfidence(analyses: any): number {
    const confidences = Object.values(analyses)
      .map((analysis: any) => analysis?.confidence || 0)
      .filter(conf => conf > 0);

    return confidences.length > 0 ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length : 0;
  }

  private async generateSynthesis(transcript: DebateTranscript, analyses: any): Promise<any> {
    // Simple synthesis based on available analyses
    const strengths: string[] = [];
    const improvements: string[] = [];
    const lessons: string[] = [];
    const nextSteps: string[] = [];

    // Extract insights from each analysis
    if (analyses.argument) {
      strengths.push(...(analyses.argument.insights || []).filter((insight: string) => 
        insight.toLowerCase().includes('strength') || insight.toLowerCase().includes('effective')
      ));
    }

    if (analyses.topic) {
      if (analyses.topic.topicCoherence?.overall > 0.7) {
        strengths.push('Maintained good focus on the debate topic');
      }
    }

    if (analyses.sentiment) {
      if (analyses.sentiment.overallSentiment?.polarity > -0.3) {
        strengths.push('Maintained constructive tone throughout the debate');
      }
    }

    // Generate improvement suggestions
    if (analyses.argument?.qualityMetrics?.evidenceStrength < 0.5) {
      improvements.push('Strengthen arguments with more credible evidence');
    }

    if (analyses.topic?.focus?.focusScore < 0.6) {
      improvements.push('Stay more focused on the main debate topic');
    }

    // Generate learning lessons
    lessons.push('Structured debate improves critical thinking skills');
    if (analyses.learning) {
      lessons.push('Active participation enhances learning outcomes');
    }

    // Generate next steps
    nextSteps.push('Continue practicing argumentation skills');
    nextSteps.push('Focus on evidence-based reasoning in future debates');

    return {
      strengths: strengths.slice(0, 5),
      improvements: improvements.slice(0, 5),
      lessons: lessons.slice(0, 5),
      nextSteps: nextSteps.slice(0, 5),
    };
  }

  private createFailedComprehensiveResult(
    transcript: DebateTranscript,
    request: ComprehensiveAnalysisRequest,
    startTime: number,
    errorMessage: string
  ): ComprehensiveAnalysisResult {
    return {
      analysisId: `comprehensive_failed_${transcript.conversationId}_${Date.now()}`,
      conversationId: transcript.conversationId,
      analysisType: 'comprehensive',
      version: '1.0',
      status: 'failed',
      confidence: 0,
      processingTime: Date.now() - startTime,
      tokensUsed: 0,
      createdAt: new Date(),
      summary: {
        overallQuality: 0,
        educationalValue: 0,
        engagementLevel: 0,
        keyInsights: [`Analysis failed: ${errorMessage}`],
      },
      synthesis: {
        strengths: [],
        improvements: [],
        lessons: [`Analysis failed: ${errorMessage}`],
        nextSteps: ['Retry analysis when system is available'],
      },
    };
  }

  private determinePrimaryAnalysisType(analysisTypes: string[]): JobType {
    if (analysisTypes.includes('comprehensive')) return JobType.BATCH_ANALYSIS;
    if (analysisTypes.includes('argument')) return JobType.ARGUMENT_ANALYSIS;
    if (analysisTypes.includes('transcript')) return JobType.TRANSCRIPT_ANALYSIS;
    if (analysisTypes.includes('learning')) return JobType.LEARNING_INSIGHTS;
    return JobType.TRANSCRIPT_ANALYSIS;
  }

  private mapPriority(priority: 'low' | 'normal' | 'high' | 'urgent'): JobPriority {
    const priorityMap = {
      low: JobPriority.LOW,
      normal: JobPriority.NORMAL,
      high: JobPriority.HIGH,
      urgent: JobPriority.CRITICAL,
    };
    return priorityMap[priority] || JobPriority.NORMAL;
  }

  private estimateJobCompletion(analysisTypes: string[]): Date {
    const baseTime = 120000; // 2 minutes
    const perTypeTime = 60000; // 1 minute per analysis type
    const totalTime = baseTime + (analysisTypes.length * perTypeTime);
    
    return new Date(Date.now() + totalTime);
  }

  private async storeAnalysisResults(result: ComprehensiveAnalysisResult): Promise<void> {
    try {
      // Store in database (implementation would depend on final schema)
      this.logger.debug(`Storing analysis results for conversation ${result.conversationId}`);
      
      // Also cache results
      const cacheKey = `analysis:comprehensive:${result.conversationId}`;
      await this.cacheService.set(cacheKey, result, 86400000); // 24 hours

    } catch (error) {
      this.logger.error('Failed to store analysis results', error.stack);
      // Don't throw - storage failure shouldn't fail the analysis
    }
  }
}
