/**
 * AI Coaching Controller
 * 
 * API endpoints for AI-powered coaching and debate suggestions
 * Task 5.3.3: AI Coaching & Suggestions
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/rbac/decorators/current-user.decorator';
import { Permissions } from '../auth/rbac/decorators/permissions.decorator';
import { RbacGuard } from '../auth/rbac/guards/rbac.guard';
import { AICoachingService } from './services/ai-coaching.service';
import {
  GenerateCoachingRequest,
  CoachingSuggestionResponse,
  DebateAnalysisRequest,
  DebateAnalysis,
  EvidenceSuggestionRequest,
  EvidenceSuggestion,
  CounterArgumentRequest,
  CounterArgumentSuggestion,
  StrategySuggestionRequest,
  StrategySuggestion,
  BatchCoachingRequest,
  BatchCoachingResponse,
  CoachingMetrics,
  CoachingFeedback,
} from './dto/ai-coaching.dto';

interface User {
  id: string;
  role: string;
}

@Controller('ai-coaching')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AICoachingController {
  constructor(private readonly aiCoachingService: AICoachingService) {}

  /**
   * Generate coaching suggestions for a message
   */
  @Post('suggestions')
  @HttpCode(HttpStatus.OK)
  @Permissions('coaching.generate')
  async generateCoachingSuggestions(
    @Body() request: Omit<GenerateCoachingRequest, 'userId'>,
    @CurrentUser() user: User,
  ): Promise<{
    suggestions: CoachingSuggestionResponse[];
    totalSuggestions: number;
    processingTime: number;
  }> {
    const coachingRequest: GenerateCoachingRequest = {
      ...request,
      userId: user.id,
    };

    const startTime = Date.now();
    const suggestions = await this.aiCoachingService.generateCoachingSuggestion(coachingRequest);
    const processingTime = Date.now() - startTime;

    return {
      suggestions: suggestions.map(suggestion => this.convertToResponse(suggestion)),
      totalSuggestions: suggestions.length,
      processingTime,
    };
  }

  /**
   * Analyze overall debate performance
   */
  @Post('analysis/debate')
  @HttpCode(HttpStatus.OK)
  @Permissions('coaching.analyze')
  async analyzeDebatePerformance(
    @Body() request: Omit<DebateAnalysisRequest, 'userId'>,
    @CurrentUser() user: User,
  ): Promise<DebateAnalysis> {
    const analysisRequest: DebateAnalysisRequest = {
      ...request,
      userId: user.id,
    };

    return this.aiCoachingService.analyzeDebatePerformance(analysisRequest);
  }

  /**
   * Get evidence suggestions for a claim
   */
  @Post('evidence')
  @HttpCode(HttpStatus.OK)
  @Permissions('coaching.evidence')
  async suggestEvidence(
    @Body() request: EvidenceSuggestionRequest,
    @CurrentUser() user: User,
  ): Promise<EvidenceSuggestion> {
    return this.aiCoachingService.suggestEvidence(request);
  }

  /**
   * Get counter-argument recommendations
   */
  @Post('counter-arguments')
  @HttpCode(HttpStatus.OK)
  @Permissions('coaching.counter_arguments')
  async recommendCounterArguments(
    @Body() request: CounterArgumentRequest,
    @CurrentUser() user: User,
  ): Promise<CounterArgumentSuggestion> {
    return this.aiCoachingService.recommendCounterArguments(request);
  }

  /**
   * Generate debate strategy suggestions
   */
  @Post('strategy')
  @HttpCode(HttpStatus.OK)
  @Permissions('coaching.strategy')
  async generateDebateStrategy(
    @Body() request: Omit<StrategySuggestionRequest, 'userId'>,
    @CurrentUser() user: User,
  ): Promise<StrategySuggestion> {
    const strategyRequest: StrategySuggestionRequest = {
      ...request,
      userId: user.id,
    };

    return this.aiCoachingService.generateDebateStrategy(strategyRequest);
  }

  /**
   * Process batch coaching requests
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @Permissions('coaching.batch')
  async batchProcessCoaching(
    @Body() request: BatchCoachingRequest,
    @CurrentUser() user: User,
  ): Promise<BatchCoachingResponse> {
    // Ensure all requests use the current user's ID
    const requestsWithUserId = request.requests.map(req => ({
      ...req,
      userId: user.id,
    }));

    return this.aiCoachingService.batchProcessCoaching({
      ...request,
      requests: requestsWithUserId,
    });
  }

  /**
   * Provide feedback on coaching suggestions
   */
  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('coaching.feedback')
  async provideFeedback(
    @Body() feedback: Omit<CoachingFeedback, 'userId'>,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    const feedbackWithUser: CoachingFeedback = {
      ...feedback,
      userId: user.id,
    };

    await this.aiCoachingService.processFeedback(feedbackWithUser);

    return {
      success: true,
      message: 'Feedback recorded successfully',
    };
  }

  /**
   * Get coaching metrics and statistics
   */
  @Get('metrics')
  @Permissions('coaching.metrics', 'analytics.read')
  async getCoachingMetrics(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user: User,
  ): Promise<CoachingMetrics> {
    const timeframe = from && to ? {
      from: new Date(from),
      to: new Date(to),
    } : undefined;

    return this.aiCoachingService.getCoachingMetrics(timeframe);
  }

  /**
   * Get coaching suggestions for a conversation
   */
  @Get('conversation/:conversationId/suggestions')
  @Permissions('conversation.read', 'coaching.read')
  async getConversationCoaching(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @CurrentUser() user: User,
  ): Promise<{
    suggestions: CoachingSuggestionResponse[];
    totalSuggestions: number;
  }> {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    // This would fetch coaching suggestions for the conversation
    // For now, return empty structure
    return {
      suggestions: [],
      totalSuggestions: 0,
    };
  }

  /**
   * Get user's coaching history and progress
   */
  @Get('user/history')
  @Permissions('coaching.read')
  async getUserCoachingHistory(
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @CurrentUser() user: User,
  ): Promise<{
    suggestions: CoachingSuggestionResponse[];
    feedback: any[];
    progress: {
      improvementAreas: string[];
      strengths: string[];
      overallProgress: number;
      recentTrends: string;
    };
  }> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    
    // This would fetch user's coaching history and analyze progress
    // For now, return mock structure
    return {
      suggestions: [],
      feedback: [],
      progress: {
        improvementAreas: ['Evidence integration', 'Counter-argument development'],
        strengths: ['Logical structure', 'Respectful tone'],
        overallProgress: 0.65, // 65% improvement
        recentTrends: 'Improving steadily',
      },
    };
  }

  /**
   * Test coaching system with sample content
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @Permissions('coaching.test')
  async testCoaching(
    @Body() body: { 
      messageContent: string;
      conversationId?: string;
      context?: any;
    },
    @CurrentUser() user: User,
  ): Promise<{
    suggestions: CoachingSuggestionResponse[];
    analysis: any;
    processingTime: number;
  }> {
    const testRequest: GenerateCoachingRequest = {
      messageId: `test_${Date.now()}`,
      conversationId: body.conversationId || `test_conversation_${Date.now()}`,
      userId: user.id,
      messageContent: body.messageContent,
      context: body.context,
    };

    const startTime = Date.now();
    const suggestions = await this.aiCoachingService.generateCoachingSuggestion(testRequest);
    const processingTime = Date.now() - startTime;

    return {
      suggestions: suggestions.map(suggestion => this.convertToResponse(suggestion)),
      analysis: {
        suggestionsGenerated: suggestions.length,
        types: suggestions.map(s => s.type),
        priorities: suggestions.map(s => s.priority),
      },
      processingTime,
    };
  }

  /**
   * Get coaching configuration and preferences
   */
  @Get('config')
  @Permissions('coaching.config')
  async getCoachingConfig(
    @CurrentUser() user: User,
  ): Promise<{
    userProfile: any;
    availableTypes: string[];
    priorities: string[];
    settings: any;
  }> {
    return {
      userProfile: {
        skillLevel: 'intermediate',
        preferredTypes: ['argument_strength', 'evidence_needed', 'structure'],
        coachingFrequency: 'medium',
      },
      availableTypes: [
        'argument_strength',
        'evidence_needed',
        'counter_argument',
        'structure',
        'respectfulness',
        'clarity',
        'strategy',
      ],
      priorities: ['low', 'medium', 'high'],
      settings: {
        realTimeEnabled: true,
        maxSuggestionsPerMessage: 3,
        evidenceDetailLevel: 'detailed',
        adaptiveCoaching: true,
      },
    };
  }

  /**
   * Update coaching preferences
   */
  @Post('config')
  @HttpCode(HttpStatus.OK)
  @Permissions('coaching.config')
  async updateCoachingConfig(
    @Body() config: {
      skillLevel?: 'beginner' | 'intermediate' | 'advanced';
      preferredTypes?: string[];
      coachingFrequency?: 'high' | 'medium' | 'low';
      settings?: any;
    },
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    // Implementation would update user coaching preferences
    return {
      success: true,
      message: 'Coaching configuration updated successfully',
    };
  }

  /**
   * Get coaching effectiveness report
   */
  @Get('effectiveness')
  @Permissions('coaching.analytics')
  async getCoachingEffectiveness(
    @Query('conversationId') conversationId?: string,
    @Query('timeframe') timeframe?: string,
    @CurrentUser() user: User,
  ): Promise<{
    overallEffectiveness: number;
    improvementMetrics: {
      argumentQuality: number;
      evidenceUsage: number;
      respectfulness: number;
      strategicThinking: number;
    };
    suggestionImpact: {
      type: string;
      averageRating: number;
      actedUponRate: number;
      improvementCorrelation: number;
    }[];
    recommendations: string[];
  }> {
    // This would analyze the effectiveness of coaching suggestions
    return {
      overallEffectiveness: 0.72, // 72% effectiveness
      improvementMetrics: {
        argumentQuality: 0.15, // 15% improvement
        evidenceUsage: 0.23, // 23% improvement
        respectfulness: 0.08, // 8% improvement
        strategicThinking: 0.12, // 12% improvement
      },
      suggestionImpact: [
        {
          type: 'evidence_needed',
          averageRating: 4.2,
          actedUponRate: 0.68,
          improvementCorrelation: 0.85,
        },
        {
          type: 'argument_strength',
          averageRating: 3.9,
          actedUponRate: 0.55,
          improvementCorrelation: 0.72,
        },
      ],
      recommendations: [
        'Continue focusing on evidence-based suggestions',
        'Increase coaching frequency for structure improvements',
        'Add more strategic timing suggestions',
      ],
    };
  }

  /**
   * Convert internal suggestion format to API response format
   */
  private convertToResponse(suggestion: any): CoachingSuggestionResponse {
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
      createdAt: suggestion.timestamp?.toISOString() || new Date().toISOString(),
      expiresAt: suggestion.expiresAt?.toISOString(),
    };
  }
}
