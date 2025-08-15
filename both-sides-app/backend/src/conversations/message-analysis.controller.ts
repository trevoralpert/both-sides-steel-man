/**
 * Message Analysis Controller
 * 
 * API endpoints for real-time message analysis and moderation
 * Task 5.3.1: Real-time Message Analysis Pipeline
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
import { MessageAnalysisService } from './services/message-analysis.service';
import {
  MessageAnalysisRequest,
  MessageAnalysisResponse,
  BatchAnalysisRequest,
  BatchAnalysisResponse,
  AnalysisFeedback,
} from './dto/message-analysis.dto';

interface User {
  id: string;
  role: string;
}

@Controller('message-analysis')
@UseGuards(JwtAuthGuard, RbacGuard)
export class MessageAnalysisController {
  constructor(private readonly messageAnalysisService: MessageAnalysisService) {}

  /**
   * Analyze a single message for toxicity, quality, and educational value
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @Permissions('message.analyze')
  async analyzeMessage(
    @Body() request: MessageAnalysisRequest,
    @CurrentUser() user: User,
  ): Promise<MessageAnalysisResponse> {
    const analysis = await this.messageAnalysisService.analyzeMessage(request);
    return this.convertToResponse(analysis);
  }

  /**
   * Batch analyze multiple messages
   */
  @Post('batch-analyze')
  @HttpCode(HttpStatus.OK)
  @Permissions('message.analyze')
  async batchAnalyzeMessages(
    @Body() request: BatchAnalysisRequest,
    @CurrentUser() user: User,
  ): Promise<BatchAnalysisResponse> {
    return this.messageAnalysisService.batchAnalyzeMessages(request);
  }

  /**
   * Get analysis history for a conversation
   */
  @Get('conversation/:conversationId/history')
  @Permissions('conversation.read', 'analysis.read')
  async getAnalysisHistory(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @CurrentUser() user: User,
  ): Promise<{ analyses: MessageAnalysisResponse[]; total: number }> {
    const analyses = await this.messageAnalysisService.getAnalysisHistory(conversationId);
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const limited = analyses.slice(0, limitNum);
    
    return {
      analyses: limited.map(analysis => this.convertToResponse(analysis)),
      total: analyses.length,
    };
  }

  /**
   * Provide feedback on analysis accuracy (for teachers/moderators)
   */
  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('analysis.feedback')
  async provideFeedback(
    @Body() feedback: Omit<AnalysisFeedback, 'providerId'>,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    const feedbackWithProvider: AnalysisFeedback = {
      ...feedback,
      providerId: user.id,
    };
    
    await this.messageAnalysisService.updateAnalysisModels([feedbackWithProvider]);
    
    return {
      success: true,
      message: 'Feedback recorded successfully',
    };
  }

  /**
   * Get analysis statistics for a conversation or user
   */
  @Get('stats')
  @Permissions('analysis.read', 'analytics.read')
  async getAnalysisStats(
    @Query('conversationId') conversationId?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @CurrentUser() user: User,
  ): Promise<{
    totalAnalyses: number;
    averageScores: {
      toxicity: number;
      quality: number;
      educational: number;
    };
    actionDistribution: Record<string, number>;
    processingMetrics: {
      averageTime: number;
      maxTime: number;
      minTime: number;
    };
  }> {
    // This would be implemented to aggregate analysis statistics
    // For now, return mock data structure
    return {
      totalAnalyses: 0,
      averageScores: {
        toxicity: 0,
        quality: 0,
        educational: 0,
      },
      actionDistribution: {
        approve: 0,
        review: 0,
        block: 0,
        coach: 0,
      },
      processingMetrics: {
        averageTime: 0,
        maxTime: 0,
        minTime: 0,
      },
    };
  }

  /**
   * Test analysis pipeline with sample content
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @Permissions('analysis.test')
  async testAnalysis(
    @Body() body: { content: string; context?: any },
    @CurrentUser() user: User,
  ): Promise<MessageAnalysisResponse> {
    const testRequest: MessageAnalysisRequest = {
      messageId: `test_${Date.now()}`,
      content: body.content,
      userId: user.id,
      conversationId: `test_conversation_${Date.now()}`,
      context: body.context,
    };

    const analysis = await this.messageAnalysisService.analyzeMessage(testRequest);
    return this.convertToResponse(analysis);
  }

  /**
   * Convert internal analysis format to API response format
   */
  private convertToResponse(analysis: any): MessageAnalysisResponse {
    return {
      messageId: analysis.messageId,
      analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
