/**
 * AI Coaching Service
 * 
 * Real-time AI-powered coaching and debate suggestions
 * Task 5.3.3: AI Coaching & Suggestions
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../common/services/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageAnalysisService } from './message-analysis.service';
import OpenAI from 'openai';
import {
  CoachingSuggestion,
  CoachingSuggestionType,
  CoachingPriority,
  DebateAnalysis,
  EvidenceSuggestion,
  CounterArgumentSuggestion,
  StrategySuggestion,
  GenerateCoachingRequest,
  CoachingSuggestionResponse,
  DebateAnalysisRequest,
  EvidenceSuggestionRequest,
  CounterArgumentRequest,
  StrategySuggestionRequest,
  BatchCoachingRequest,
  BatchCoachingResponse,
  CoachingMetrics,
  CoachingFeedback,
  UserCoachingProfile,
  Resource,
} from '../dto/ai-coaching.dto';

@Injectable()
export class AICoachingService {
  private readonly logger = new Logger(AICoachingService.name);
  private readonly openai: OpenAI;
  private readonly suggestionCache = new Map<string, CoachingSuggestion[]>();
  private readonly CACHE_TTL = 1800000; // 30 minutes

  // Coaching thresholds and settings
  private readonly COACHING_THRESHOLDS = {
    argumentStrengthLow: 0.4,
    evidenceUsageLow: 0.3,
    respectfulnessLow: 0.5,
    clarityLow: 0.4,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
    private readonly messageAnalysisService: MessageAnalysisService,
  ) {
    this.initializeOpenAI();
  }

  /**
   * Initialize OpenAI API client
   */
  private initializeOpenAI(): void {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. AI coaching will be unavailable.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    
    this.logger.log('OpenAI API client initialized for AI coaching');
  }

  /**
   * Generate coaching suggestions for a message
   */
  async generateCoachingSuggestion(request: GenerateCoachingRequest): Promise<CoachingSuggestion[]> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.buildCacheKey(request);
      const cachedSuggestions = await this.getCachedSuggestions(cacheKey);
      
      if (cachedSuggestions) {
        this.logger.log(`Using cached coaching suggestions for message ${request.messageId}`);
        return cachedSuggestions;
      }

      // Get message analysis results
      const analysis = await this.messageAnalysisService.analyzeMessage({
        messageId: request.messageId,
        content: request.messageContent,
        userId: request.userId,
        conversationId: request.conversationId,
        context: {
          conversationId: request.conversationId,
          debatePhase: request.context?.debatePhase || 'discussion',
          previousMessages: request.conversationHistory || [],
          participants: [],
        },
      });

      // Get user coaching profile
      const userProfile = await this.getUserCoachingProfile(request.userId);

      // Generate AI-powered suggestions
      const suggestions = await this.generateAISuggestions(request, analysis.analysisResults, userProfile);

      // Cache results
      await this.cacheSuggestions(cacheKey, suggestions);

      // Store suggestions for tracking
      await this.storeSuggestions(suggestions);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Generated ${suggestions.length} coaching suggestions for message ${request.messageId} in ${processingTime}ms`);

      return suggestions;

    } catch (error) {
      this.logger.error(`Failed to generate coaching suggestions for message ${request.messageId}`, error.stack);
      
      // Return fallback suggestions
      return this.generateFallbackSuggestions(request);
    }
  }

  /**
   * Analyze overall debate performance
   */
  async analyzeDebatePerformance(request: DebateAnalysisRequest): Promise<DebateAnalysis> {
    try {
      // Get conversation messages for analysis
      const messages = await this.getConversationMessages(
        request.conversationId, 
        request.userId,
        request.lookbackMessages || 20
      );

      if (messages.length === 0) {
        return this.createEmptyAnalysis(request.userId, request.conversationId);
      }

      // Analyze messages using OpenAI
      const analysisPrompt = this.buildDebateAnalysisPrompt(messages, request);
      const aiAnalysis = await this.callOpenAIForAnalysis(analysisPrompt);

      // Build comprehensive analysis
      const analysis: DebateAnalysis = {
        userId: request.userId,
        conversationId: request.conversationId,
        strengths: aiAnalysis.strengths || [],
        improvementAreas: aiAnalysis.improvementAreas || [],
        argumentQuality: Math.min(1, Math.max(0, aiAnalysis.argumentQuality || 0.5)),
        evidenceUsage: Math.min(1, Math.max(0, aiAnalysis.evidenceUsage || 0.5)),
        engagementLevel: Math.min(1, Math.max(0, aiAnalysis.engagementLevel || 0.5)),
        respectfulnessScore: Math.min(1, Math.max(0, aiAnalysis.respectfulnessScore || 0.5)),
        strategicThinking: Math.min(1, Math.max(0, aiAnalysis.strategicThinking || 0.5)),
        currentPhase: request.currentPhase || 'discussion',
        phaseFeedback: aiAnalysis.phaseFeedback || [],
      };

      return analysis;

    } catch (error) {
      this.logger.error(`Failed to analyze debate performance for user ${request.userId}`, error.stack);
      return this.createEmptyAnalysis(request.userId, request.conversationId);
    }
  }

  /**
   * Suggest evidence for a claim
   */
  async suggestEvidence(request: EvidenceSuggestionRequest): Promise<EvidenceSuggestion> {
    try {
      const evidencePrompt = this.buildEvidencePrompt(request);
      const aiResponse = await this.callOpenAIForEvidence(evidencePrompt);

      return {
        claim: request.claim,
        supportingEvidence: aiResponse.supportingEvidence || [],
        sources: aiResponse.sources || [],
        searchQueries: aiResponse.searchQueries || [],
        relatedConcepts: aiResponse.relatedConcepts || [],
      };

    } catch (error) {
      this.logger.error(`Failed to suggest evidence for claim: ${request.claim}`, error.stack);
      return this.generateFallbackEvidence(request);
    }
  }

  /**
   * Recommend counter-arguments
   */
  async recommendCounterArguments(request: CounterArgumentRequest): Promise<CounterArgumentSuggestion> {
    try {
      const counterPrompt = this.buildCounterArgumentPrompt(request);
      const aiResponse = await this.callOpenAIForCounterArgs(counterPrompt);

      return {
        originalArgument: request.argument,
        counterPoints: aiResponse.counterPoints || [],
        strategicAdvice: aiResponse.strategicAdvice || [],
        anticipatedResponses: aiResponse.anticipatedResponses || [],
      };

    } catch (error) {
      this.logger.error(`Failed to recommend counter-arguments for: ${request.argument}`, error.stack);
      return this.generateFallbackCounterArgs(request);
    }
  }

  /**
   * Generate debate strategy suggestions
   */
  async generateDebateStrategy(request: StrategySuggestionRequest): Promise<StrategySuggestion> {
    try {
      const strategyPrompt = this.buildStrategyPrompt(request);
      const aiResponse = await this.callOpenAIForStrategy(strategyPrompt);

      return {
        phase: request.phase,
        position: request.position,
        primaryStrategy: aiResponse.primaryStrategy || 'Focus on evidence-based arguments',
        tacticalAdvice: aiResponse.tacticalAdvice || [],
        keyPoints: aiResponse.keyPoints || [],
        timeManagement: {
          remainingTime: request.timeRemainingMinutes || 0,
          recommendedPacing: aiResponse.timeManagement?.recommendedPacing || 'Maintain steady pace',
          priorityActions: aiResponse.timeManagement?.priorityActions || [],
        },
        opponentAnalysis: {
          weaknesses: aiResponse.opponentAnalysis?.weaknesses || [],
          strengths: aiResponse.opponentAnalysis?.strengths || [],
          counterstrategies: aiResponse.opponentAnalysis?.counterstrategies || [],
        },
      };

    } catch (error) {
      this.logger.error(`Failed to generate strategy for user ${request.userId}`, error.stack);
      return this.generateFallbackStrategy(request);
    }
  }

  /**
   * Process batch coaching requests
   */
  async batchProcessCoaching(request: BatchCoachingRequest): Promise<BatchCoachingResponse> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const suggestions: CoachingSuggestionResponse[] = [];
    const errors: string[] = [];
    let suggestionsGenerated = 0;
    const startTime = Date.now();

    this.logger.log(`Processing batch coaching for ${request.requests.length} messages`);

    try {
      // Process in smaller batches
      const batchSize = 5;
      for (let i = 0; i < request.requests.length; i += batchSize) {
        const batch = request.requests.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (coachingRequest) => {
          try {
            const coachingSuggestions = await this.generateCoachingSuggestion(coachingRequest);
            suggestionsGenerated += coachingSuggestions.length;
            
            return coachingSuggestions.map(suggestion => this.convertToResponse(suggestion));
          } catch (error) {
            errors.push(`Message ${coachingRequest.messageId}: ${error.message}`);
            return [];
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            suggestions.push(...result.value);
          }
        });

        // Small delay between batches
        if (i + batchSize < request.requests.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      const processingTime = Date.now() - startTime;
      
      return {
        batchId,
        totalProcessed: request.requests.length,
        suggestionsGenerated,
        errors: errors.length,
        suggestions,
        errorMessages: errors.length > 0 ? errors : undefined,
        processingTime,
      };

    } catch (error) {
      this.logger.error('Batch coaching processing failed', error.stack);
      throw new HttpException(
        'Batch coaching processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get coaching metrics
   */
  async getCoachingMetrics(timeframe?: { from: Date; to: Date }): Promise<CoachingMetrics> {
    try {
      const whereClause: any = {};
      
      if (timeframe) {
        whereClause.createdAt = {
          gte: timeframe.from,
          lte: timeframe.to,
        };
      }

      // This would be implemented to aggregate coaching statistics
      // For now, return mock structure
      return {
        totalSuggestions: 0,
        suggestionsByType: {} as any,
        suggestionsByPriority: {} as any,
        averageResponseTime: 0,
        userEngagement: {
          suggestionsViewed: 0,
          suggestionsActedUpon: 0,
          engagementRate: 0,
        },
        effectiveness: {
          argumentQualityImprovement: 0,
          evidenceUsageIncrease: 0,
          respectfulnessIncrease: 0,
        },
        topicCoverage: [],
      };

    } catch (error) {
      this.logger.error('Failed to get coaching metrics', error.stack);
      throw new HttpException(
        'Failed to get coaching metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Process coaching feedback
   */
  async processFeedback(feedback: CoachingFeedback): Promise<void> {
    try {
      // Store feedback for model improvement
      await this.prismaService.coachingFeedback.create({
        data: {
          id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          suggestionId: feedback.suggestionId,
          userId: feedback.userId,
          rating: feedback.rating,
          comments: feedback.comments,
          wasActedUpon: feedback.wasActedUpon,
          qualityRating: feedback.qualityRating,
          createdAt: new Date(),
        },
      });

      // Update user coaching profile based on feedback
      await this.updateUserCoachingProfile(feedback.userId, feedback);

      this.logger.log(`Processed coaching feedback for suggestion ${feedback.suggestionId}`);

    } catch (error) {
      this.logger.error(`Failed to process coaching feedback`, error.stack);
    }
  }

  /**
   * Generate AI suggestions using OpenAI
   */
  private async generateAISuggestions(
    request: GenerateCoachingRequest,
    analysisResults: any,
    userProfile: UserCoachingProfile,
  ): Promise<CoachingSuggestion[]> {
    const systemPrompt = this.buildCoachingSystemPrompt(userProfile, request.context);
    const userPrompt = this.buildCoachingUserPrompt(request, analysisResults);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Balanced creativity for coaching
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      });

      const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');
      
      return this.parseAISuggestions(aiResponse, request);

    } catch (error) {
      this.logger.error('OpenAI coaching call failed', error.stack);
      throw new HttpException(
        'AI coaching service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Build coaching system prompt
   */
  private buildCoachingSystemPrompt(userProfile: UserCoachingProfile, context?: any): string {
    return `You are an expert debate coach helping students improve their argumentation and critical thinking skills.

Your role:
- Provide constructive, actionable coaching suggestions
- Focus on educational growth and skill development
- Maintain appropriate tone for ${userProfile.skillLevel} level students
- Encourage respectful discourse and evidence-based reasoning

Student Profile:
- Skill Level: ${userProfile.skillLevel}
- Strengths: ${userProfile.strengths?.join(', ') || 'None identified yet'}
- Growth Areas: ${userProfile.growthAreas?.join(', ') || 'To be determined'}
- Preferred Coaching: ${userProfile.preferredSuggestionTypes?.join(', ') || 'All types'}

Context:
${context ? `Debate Phase: ${context.debatePhase}` : ''}
${context ? `Position: ${context.position}` : ''}
${context ? `Time Remaining: ${context.timeRemaining} minutes` : ''}

Response Format:
Return a JSON object with an array of suggestions, each containing:
{
  "suggestions": [
    {
      "type": "argument_strength|evidence_needed|counter_argument|structure|respectfulness|clarity|strategy",
      "priority": "high|medium|low",
      "suggestion": "Clear, actionable advice",
      "explanation": "Why this matters and how it helps",
      "examples": ["Example 1", "Example 2"],
      "resources": [{"type": "article", "title": "Title", "description": "Description"}]
    }
  ]
}

Focus on the most impactful 1-3 suggestions that will help this student improve their debate performance.`;
  }

  /**
   * Build coaching user prompt
   */
  private buildCoachingUserPrompt(request: GenerateCoachingRequest, analysisResults: any): string {
    const context = request.conversationHistory?.length > 0 
      ? `Recent conversation:\n${request.conversationHistory.slice(-3).map(m => `${m.userId}: ${m.content}`).join('\n')}\n\n`
      : '';

    return `${context}Current message to coach: "${request.messageContent}"

Message Analysis Results:
- Argument Strength: ${Math.round((analysisResults.quality?.argumentStrength || 0.5) * 100)}%
- Evidence Usage: ${analysisResults.quality?.evidenceBased ? 'Yes' : 'No'}
- Respectfulness: ${Math.round((analysisResults.quality?.respectfulness || 0.5) * 100)}%
- Clarity: ${Math.round((analysisResults.educational?.logicalStructure || 0.5) * 100)}%
- Critical Thinking: ${Math.round((analysisResults.educational?.criticalThinking || 0.5) * 100)}%

Provide coaching suggestions to help this student improve their debate contribution.`;
  }

  /**
   * Parse AI suggestions response
   */
  private parseAISuggestions(aiResponse: any, request: GenerateCoachingRequest): CoachingSuggestion[] {
    const suggestions: CoachingSuggestion[] = [];

    if (aiResponse.suggestions && Array.isArray(aiResponse.suggestions)) {
      for (const suggestion of aiResponse.suggestions) {
        suggestions.push({
          type: suggestion.type as CoachingSuggestionType,
          priority: suggestion.priority as CoachingPriority,
          suggestion: suggestion.suggestion || '',
          explanation: suggestion.explanation || '',
          examples: suggestion.examples || [],
          relatedResources: suggestion.resources || [],
          targetUserId: request.userId,
          conversationId: request.conversationId,
          contextMessageId: request.messageId,
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + 3600000), // 1 hour expiration
        });
      }
    }

    return suggestions;
  }

  // Helper methods for data access and caching

  private async getUserCoachingProfile(userId: string): Promise<UserCoachingProfile> {
    try {
      // This would fetch from database - for now return default profile
      return {
        userId,
        skillLevel: 'intermediate',
        preferredSuggestionTypes: [
          CoachingSuggestionType.ARGUMENT_STRENGTH,
          CoachingSuggestionType.EVIDENCE_NEEDED,
          CoachingSuggestionType.STRUCTURE,
        ],
        coachingFrequency: 'medium',
        strengths: ['analytical thinking'],
        growthAreas: ['evidence integration', 'counter-argument development'],
        learningProgress: [],
        adaptiveSettings: {
          suggestionsPerDebate: 3,
          priorityThreshold: CoachingPriority.MEDIUM,
          realTimeEnabled: true,
          evidenceLevel: 'detailed',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get coaching profile for user ${userId}`, error.stack);
      return this.getDefaultCoachingProfile(userId);
    }
  }

  private getDefaultCoachingProfile(userId: string): UserCoachingProfile {
    return {
      userId,
      skillLevel: 'beginner',
      preferredSuggestionTypes: Object.values(CoachingSuggestionType),
      coachingFrequency: 'medium',
      strengths: [],
      growthAreas: [],
      learningProgress: [],
      adaptiveSettings: {
        suggestionsPerDebate: 2,
        priorityThreshold: CoachingPriority.MEDIUM,
        realTimeEnabled: true,
        evidenceLevel: 'basic',
      },
    };
  }

  private async getConversationMessages(conversationId: string, userId: string, limit: number) {
    try {
      return await this.prismaService.message.findMany({
        where: { conversation_id: conversationId },
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          id: true,
          content: true,
          user_id: true,
          created_at: true,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get conversation messages`, error.stack);
      return [];
    }
  }

  private createEmptyAnalysis(userId: string, conversationId: string): DebateAnalysis {
    return {
      userId,
      conversationId,
      strengths: [],
      improvementAreas: [],
      argumentQuality: 0.5,
      evidenceUsage: 0.5,
      engagementLevel: 0.5,
      respectfulnessScore: 0.5,
      strategicThinking: 0.5,
      currentPhase: 'discussion',
      phaseFeedback: [],
    };
  }

  // Cache and storage methods
  private buildCacheKey(request: GenerateCoachingRequest): string {
    const contentHash = this.hashString(request.messageContent);
    const contextHash = request.context ? this.hashString(JSON.stringify(request.context)) : 'no-context';
    return `coaching:${request.userId}:${contentHash}:${contextHash}`;
  }

  private async getCachedSuggestions(cacheKey: string): Promise<CoachingSuggestion[] | null> {
    try {
      return await this.cacheService.get(cacheKey);
    } catch (error) {
      return null;
    }
  }

  private async cacheSuggestions(cacheKey: string, suggestions: CoachingSuggestion[]): Promise<void> {
    try {
      await this.cacheService.set(cacheKey, suggestions, this.CACHE_TTL);
    } catch (error) {
      this.logger.warn('Failed to cache coaching suggestions', error.message);
    }
  }

  private async storeSuggestions(suggestions: CoachingSuggestion[]): Promise<void> {
    // Implementation would store suggestions in database for tracking
    this.logger.log(`Stored ${suggestions.length} coaching suggestions`);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private convertToResponse(suggestion: CoachingSuggestion): CoachingSuggestionResponse {
    return {
      id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: suggestion.type,
      priority: suggestion.priority,
      suggestion: suggestion.suggestion,
      explanation: suggestion.explanation,
      examples: suggestion.examples,
      relatedResources: suggestion.relatedResources,
      targetUserId: suggestion.targetUserId,
      conversationId: suggestion.conversationId,
      contextMessageId: suggestion.contextMessageId,
      createdAt: suggestion.timestamp.toISOString(),
      expiresAt: suggestion.expiresAt?.toISOString(),
    };
  }

  private async updateUserCoachingProfile(userId: string, feedback: CoachingFeedback): Promise<void> {
    // Implementation would update user's coaching preferences based on feedback
    this.logger.log(`Updated coaching profile for user ${userId} based on feedback`);
  }

  // Fallback methods
  private generateFallbackSuggestions(request: GenerateCoachingRequest): CoachingSuggestion[] {
    return [
      {
        type: CoachingSuggestionType.STRUCTURE,
        priority: CoachingPriority.MEDIUM,
        suggestion: 'Consider organizing your argument with a clear claim, evidence, and reasoning structure.',
        explanation: 'Well-structured arguments are more persuasive and easier to follow.',
        examples: ['Claim: X is true. Evidence: Studies show... Reasoning: This means...'],
        relatedResources: [],
        targetUserId: request.userId,
        conversationId: request.conversationId,
        contextMessageId: request.messageId,
        timestamp: new Date(),
      },
    ];
  }

  // Placeholder methods for different AI calls
  private async callOpenAIForAnalysis(prompt: string): Promise<any> {
    // Implementation would make specific OpenAI call for debate analysis
    return {};
  }

  private async callOpenAIForEvidence(prompt: string): Promise<any> {
    // Implementation would make specific OpenAI call for evidence suggestions
    return {};
  }

  private async callOpenAIForCounterArgs(prompt: string): Promise<any> {
    // Implementation would make specific OpenAI call for counter-arguments
    return {};
  }

  private async callOpenAIForStrategy(prompt: string): Promise<any> {
    // Implementation would make specific OpenAI call for strategy
    return {};
  }

  private buildDebateAnalysisPrompt(messages: any[], request: DebateAnalysisRequest): string {
    return `Analyze this user's debate performance based on their recent messages...`;
  }

  private buildEvidencePrompt(request: EvidenceSuggestionRequest): string {
    return `Suggest evidence for the claim: "${request.claim}" from a ${request.position} perspective...`;
  }

  private buildCounterArgumentPrompt(request: CounterArgumentRequest): string {
    return `Generate counter-arguments for: "${request.argument}"...`;
  }

  private buildStrategyPrompt(request: StrategySuggestionRequest): string {
    return `Provide debate strategy for ${request.position} position in ${request.phase} phase...`;
  }

  private generateFallbackEvidence(request: EvidenceSuggestionRequest): EvidenceSuggestion {
    return {
      claim: request.claim,
      supportingEvidence: ['Consider researching academic studies on this topic'],
      sources: [],
      searchQueries: [`"${request.claim}" evidence`, `${request.claim} research`],
      relatedConcepts: [],
    };
  }

  private generateFallbackCounterArgs(request: CounterArgumentRequest): CounterArgumentSuggestion {
    return {
      originalArgument: request.argument,
      counterPoints: [],
      strategicAdvice: ['Look for logical gaps in the argument', 'Consider alternative perspectives'],
      anticipatedResponses: [],
    };
  }

  private generateFallbackStrategy(request: StrategySuggestionRequest): StrategySuggestion {
    return {
      phase: request.phase,
      position: request.position,
      primaryStrategy: 'Focus on evidence-based arguments',
      tacticalAdvice: ['Use credible sources', 'Address counterarguments proactively'],
      keyPoints: [],
      timeManagement: {
        remainingTime: request.timeRemainingMinutes || 0,
        recommendedPacing: 'Maintain steady engagement',
        priorityActions: ['Focus on strongest arguments'],
      },
      opponentAnalysis: {
        weaknesses: [],
        strengths: [],
        counterstrategies: [],
      },
    };
  }
}
