/**
 * Message Analysis Service
 * 
 * Real-time AI-powered message analysis for toxicity detection,
 * quality assessment, and educational value scoring.
 * 
 * Task 5.3.1: Real-time Message Analysis Pipeline
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../common/services/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import OpenAI from 'openai';
import {
  MessageAnalysis,
  MessageAnalysisRequest,
  MessageAnalysisResponse,
  Context,
  AnalysisFeedback,
  BatchAnalysisRequest,
  BatchAnalysisResponse,
} from '../dto/message-analysis.dto';

@Injectable()
export class MessageAnalysisService {
  private readonly logger = new Logger(MessageAnalysisService.name);
  private readonly openai: OpenAI;
  private readonly analysisCache = new Map<string, MessageAnalysis>();

  // Analysis thresholds
  private readonly TOXICITY_BLOCK_THRESHOLD = 0.8;
  private readonly TOXICITY_REVIEW_THRESHOLD = 0.6;
  private readonly QUALITY_COACHING_THRESHOLD = 0.4;
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
  ) {
    this.initializeOpenAI();
  }

  /**
   * Initialize OpenAI API client
   */
  private initializeOpenAI(): void {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Message analysis will be unavailable.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    
    this.logger.log('OpenAI API client initialized for message analysis');
  }

  /**
   * Analyze message content for toxicity, quality, and educational value
   */
  async analyzeMessage(request: MessageAnalysisRequest): Promise<MessageAnalysis> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.buildCacheKey(request);
      const cachedResult = await this.getCachedAnalysis(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`Using cached analysis for message ${request.messageId}`);
        return cachedResult;
      }

      // Validate request
      this.validateAnalysisRequest(request);

      // Pre-filter for obvious violations
      const prefilterResult = this.prefilterContent(request.content);
      if (prefilterResult.shouldBlock) {
        return this.createBlockedAnalysis(request.messageId, prefilterResult.reason, startTime);
      }

      // Perform OpenAI analysis
      const analysisResult = await this.performOpenAIAnalysis(request);

      // Calculate processing time
      const processingTime = Date.now() - startTime;
      
      const analysis: MessageAnalysis = {
        messageId: request.messageId,
        analysisResults: analysisResult,
        actionRecommended: this.determineAction(analysisResult),
        processingTime,
      };

      // Cache the result
      await this.cacheAnalysis(cacheKey, analysis);

      // Store analysis in database
      await this.storeAnalysis(analysis, request);

      this.logger.log(`Analyzed message ${request.messageId} in ${processingTime}ms`);
      
      return analysis;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Failed to analyze message ${request.messageId}`, error.stack);
      
      // Return safe fallback analysis
      return this.createFallbackAnalysis(request.messageId, processingTime);
    }
  }

  /**
   * Batch analyze multiple messages efficiently
   */
  async batchAnalyzeMessages(request: BatchAnalysisRequest): Promise<BatchAnalysisResponse> {
    const startTime = Date.now();
    const results: MessageAnalysisResponse[] = [];
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    this.logger.log(`Starting batch analysis for ${request.messages.length} messages`);

    try {
      // Process in batches of 5 for OpenAI rate limiting
      const batchSize = 5;
      
      for (let i = 0; i < request.messages.length; i += batchSize) {
        const batch = request.messages.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (messageRequest) => {
          try {
            const analysis = await this.analyzeMessage(messageRequest);
            successful++;
            return this.convertToResponse(analysis);
          } catch (error) {
            failed++;
            errors.push(`Message ${messageRequest.messageId}: ${error.message}`);
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          }
        });

        // Small delay to avoid rate limiting
        if (i + batchSize < request.messages.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      this.logger.log(`Batch analysis completed: ${successful} successful, ${failed} failed in ${totalProcessingTime}ms`);

      return {
        analyses: results,
        totalProcessingTime,
        successful,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      this.logger.error('Batch analysis failed', error.stack);
      throw new HttpException(
        'Batch message analysis failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get analysis history for a conversation
   */
  async getAnalysisHistory(conversationId: string): Promise<MessageAnalysis[]> {
    try {
      const analyses = await this.prismaService.messageAnalysis.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to recent analyses
      });

      return analyses.map(analysis => ({
        messageId: analysis.messageId,
        analysisResults: analysis.results as any,
        actionRecommended: analysis.actionRecommended as any,
        processingTime: analysis.processingTime,
      }));

    } catch (error) {
      this.logger.error(`Failed to get analysis history for conversation ${conversationId}`, error.stack);
      return [];
    }
  }

  /**
   * Update analysis models with feedback data
   */
  async updateAnalysisModels(feedbackData: AnalysisFeedback[]): Promise<void> {
    this.logger.log(`Processing ${feedbackData.length} feedback items for model improvement`);
    
    try {
      // Store feedback in database for model training
      for (const feedback of feedbackData) {
        await this.prismaService.analysisFeedback.create({
          data: {
            messageId: feedback.messageId,
            analysisId: feedback.analysisId,
            feedbackType: feedback.feedbackType,
            rating: feedback.rating,
            comments: feedback.comments,
            providerId: feedback.providerId,
          },
        });
      }

      // TODO: Implement model fine-tuning based on feedback
      // This could involve collecting feedback data and periodically
      // retraining or adjusting analysis thresholds

      this.logger.log('Feedback data stored for model improvement');

    } catch (error) {
      this.logger.error('Failed to process analysis feedback', error.stack);
    }
  }

  /**
   * Perform OpenAI content analysis
   */
  private async performOpenAIAnalysis(request: MessageAnalysisRequest): Promise<MessageAnalysis['analysisResults']> {
    const systemPrompt = this.buildAnalysisPrompt(request.context);
    const analysisPrompt = this.buildMessagePrompt(request.content, request.context);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent analysis
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const analysisResult = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        toxicity: {
          score: Math.min(1, Math.max(0, analysisResult.toxicity?.score || 0)),
          categories: analysisResult.toxicity?.categories || [],
          confidence: Math.min(1, Math.max(0, analysisResult.toxicity?.confidence || 0.5)),
        },
        quality: {
          argumentStrength: Math.min(1, Math.max(0, analysisResult.quality?.argumentStrength || 0.5)),
          evidenceBased: analysisResult.quality?.evidenceBased || false,
          respectfulness: Math.min(1, Math.max(0, analysisResult.quality?.respectfulness || 0.5)),
          constructiveness: Math.min(1, Math.max(0, analysisResult.quality?.constructiveness || 0.5)),
        },
        educational: {
          criticalThinking: Math.min(1, Math.max(0, analysisResult.educational?.criticalThinking || 0.5)),
          evidenceUsage: Math.min(1, Math.max(0, analysisResult.educational?.evidenceUsage || 0.5)),
          logicalStructure: Math.min(1, Math.max(0, analysisResult.educational?.logicalStructure || 0.5)),
        },
        metadata: {
          wordCount: this.countWords(request.content),
          readabilityScore: this.calculateReadabilityScore(request.content),
          sentiment: Math.min(1, Math.max(-1, analysisResult.metadata?.sentiment || 0)),
        },
      };

    } catch (error) {
      this.logger.error('OpenAI analysis call failed', error.stack);
      throw new HttpException(
        'AI analysis service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Build system prompt for OpenAI analysis
   */
  private buildAnalysisPrompt(context?: Context): string {
    return `You are an AI moderator analyzing messages in an educational debate platform for students. 

Your task is to analyze message content and return a JSON object with the following structure:

{
  "toxicity": {
    "score": 0.0-1.0,
    "categories": ["harassment", "hate", "violence", "profanity", etc],
    "confidence": 0.0-1.0
  },
  "quality": {
    "argumentStrength": 0.0-1.0,
    "evidenceBased": boolean,
    "respectfulness": 0.0-1.0,
    "constructiveness": 0.0-1.0
  },
  "educational": {
    "criticalThinking": 0.0-1.0,
    "evidenceUsage": 0.0-1.0,
    "logicalStructure": 0.0-1.0
  },
  "metadata": {
    "sentiment": -1.0 to 1.0
  }
}

Context: This is an educational debate platform. Messages should be:
- Respectful and appropriate for students
- Focused on logical argumentation
- Evidence-based when possible
- Constructive to the learning process

${context ? `Debate phase: ${context.debatePhase}` : ''}
${context?.topicId ? `Topic context available` : ''}

Rate toxicity strictly - any harassment, personal attacks, or inappropriate content should score high.
Rate educational value based on critical thinking, evidence use, and logical structure.`;
  }

  /**
   * Build message analysis prompt
   */
  private buildMessagePrompt(content: string, context?: Context): string {
    return `Analyze this message for toxicity, quality, and educational value:

Message: "${content}"

${context?.previousMessages?.length ? 
  `Previous context: ${context.previousMessages.slice(-2).map(m => `User: ${m.content}`).join('\n')}` : ''}

Return analysis as JSON object following the specified format.`;
  }

  /**
   * Pre-filter content for obvious violations
   */
  private prefilterContent(content: string): { shouldBlock: boolean; reason?: string } {
    const lowerContent = content.toLowerCase();
    
    // Basic profanity and spam detection
    const bannedPhrases = [
      'fucking', 'shit', 'asshole', 'bitch', 'damn you',
      'go kill yourself', 'kys', 'you suck', 'fuck you'
    ];
    
    for (const phrase of bannedPhrases) {
      if (lowerContent.includes(phrase)) {
        return { shouldBlock: true, reason: 'inappropriate_language' };
      }
    }

    // Spam detection
    if (content.length > 5000) {
      return { shouldBlock: true, reason: 'content_too_long' };
    }

    if (content.trim().length < 2) {
      return { shouldBlock: true, reason: 'content_too_short' };
    }

    return { shouldBlock: false };
  }

  /**
   * Determine recommended action based on analysis
   */
  private determineAction(results: MessageAnalysis['analysisResults']): MessageAnalysis['actionRecommended'] {
    const { toxicity, quality, educational } = results;

    // Block high toxicity content
    if (toxicity.score >= this.TOXICITY_BLOCK_THRESHOLD) {
      return 'block';
    }

    // Review moderate toxicity
    if (toxicity.score >= this.TOXICITY_REVIEW_THRESHOLD) {
      return 'review';
    }

    // Coach low quality content
    const avgQuality = (quality.argumentStrength + quality.constructiveness + quality.respectfulness) / 3;
    const avgEducational = (educational.criticalThinking + educational.evidenceUsage + educational.logicalStructure) / 3;
    
    if (avgQuality < this.QUALITY_COACHING_THRESHOLD || avgEducational < this.QUALITY_COACHING_THRESHOLD) {
      return 'coach';
    }

    return 'approve';
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.trim().split(/\s+/).length;
  }

  /**
   * Calculate readability score (Flesch Reading Ease approximation)
   */
  private calculateReadabilityScore(content: string): number {
    const words = this.countWords(content);
    const sentences = content.split(/[.!?]+/).length;
    const syllables = this.estimateSyllables(content);
    
    if (words === 0 || sentences === 0) return 50;
    
    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;
    
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Estimate syllable count
   */
  private estimateSyllables(content: string): number {
    const words = content.toLowerCase().split(/\s+/);
    let syllables = 0;
    
    for (const word of words) {
      const vowelMatches = word.match(/[aeiouy]+/g);
      syllables += vowelMatches ? vowelMatches.length : 1;
    }
    
    return Math.max(1, syllables);
  }

  /**
   * Cache analysis result
   */
  private async cacheAnalysis(cacheKey: string, analysis: MessageAnalysis): Promise<void> {
    try {
      await this.cacheService.set(cacheKey, analysis, this.CACHE_TTL);
      this.analysisCache.set(cacheKey, analysis);
    } catch (error) {
      this.logger.warn('Failed to cache analysis result', error.message);
    }
  }

  /**
   * Get cached analysis
   */
  private async getCachedAnalysis(cacheKey: string): Promise<MessageAnalysis | null> {
    try {
      // Check in-memory cache first
      if (this.analysisCache.has(cacheKey)) {
        return this.analysisCache.get(cacheKey) || null;
      }

      // Check Redis cache
      return await this.cacheService.get(cacheKey);
    } catch (error) {
      this.logger.warn('Failed to retrieve cached analysis', error.message);
      return null;
    }
  }

  /**
   * Build cache key for analysis
   */
  private buildCacheKey(request: MessageAnalysisRequest): string {
    const contentHash = this.hashString(request.content);
    const contextHash = request.context ? this.hashString(JSON.stringify(request.context)) : 'no-context';
    return `message-analysis:${contentHash}:${contextHash}`;
  }

  /**
   * Hash string for caching
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Store analysis in database
   */
  private async storeAnalysis(analysis: MessageAnalysis, request: MessageAnalysisRequest): Promise<void> {
    try {
      await this.prismaService.messageAnalysis.create({
        data: {
          id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          messageId: analysis.messageId,
          conversationId: request.conversationId,
          results: analysis.analysisResults,
          actionRecommended: analysis.actionRecommended,
          processingTime: analysis.processingTime,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn('Failed to store analysis in database', error.message);
    }
  }

  /**
   * Validate analysis request
   */
  private validateAnalysisRequest(request: MessageAnalysisRequest): void {
    if (!request.messageId || !request.content || !request.userId || !request.conversationId) {
      throw new HttpException('Invalid analysis request', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Create blocked analysis result
   */
  private createBlockedAnalysis(messageId: string, reason: string, startTime: number): MessageAnalysis {
    return {
      messageId,
      analysisResults: {
        toxicity: { score: 1.0, categories: [reason], confidence: 1.0 },
        quality: { argumentStrength: 0, evidenceBased: false, respectfulness: 0, constructiveness: 0 },
        educational: { criticalThinking: 0, evidenceUsage: 0, logicalStructure: 0 },
        metadata: { wordCount: 0, readabilityScore: 0, sentiment: -1 },
      },
      actionRecommended: 'block',
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Create fallback analysis result
   */
  private createFallbackAnalysis(messageId: string, processingTime: number): MessageAnalysis {
    return {
      messageId,
      analysisResults: {
        toxicity: { score: 0.5, categories: [], confidence: 0.5 },
        quality: { argumentStrength: 0.5, evidenceBased: false, respectfulness: 0.5, constructiveness: 0.5 },
        educational: { criticalThinking: 0.5, evidenceUsage: 0.5, logicalStructure: 0.5 },
        metadata: { wordCount: 0, readabilityScore: 50, sentiment: 0 },
      },
      actionRecommended: 'review',
      processingTime,
    };
  }

  /**
   * Convert analysis to response format
   */
  private convertToResponse(analysis: MessageAnalysis): MessageAnalysisResponse {
    return {
      messageId: analysis.messageId,
      analysisId: `analysis_${Date.now()}`,
      toxicity: analysis.analysisResults.toxicity,
      quality: analysis.analysisResults.quality,
      educational: analysis.analysisResults.educational,
      metadata: analysis.analysisResults.metadata,
      actionRecommended: analysis.actionRecommended,
      processingTime: analysis.processingTime,
      createdAt: new Date().toISOString(),
    };
  }
}
