import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

// Auth guards and decorators
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

// Services
import { AnalysisOrchestratorService } from '../services/analysis-orchestrator.service';
import { PrismaService } from '../../prisma/prisma.service';

// Interfaces and types
import {
  ComprehensiveAnalysisRequest,
  SentimentAnalysisRequest,
  TopicAnalysisRequest,
  ArgumentAnalysisRequest,
  LearningInsightsRequest,
  AnalysisJobConfig,
  ANALYSIS_PRESETS,
  DEFAULT_VALIDATION,
} from '../interfaces/analysis.interfaces';

/**
 * DTOs for API requests
 */
class StartAnalysisDto {
  conversationId: string;
  analysisTypes: string[];
  targetUserId?: string;
  preset?: 'basic' | 'detailed' | 'comprehensive';
  options?: {
    cacheResults?: boolean;
    includeConfidence?: boolean;
    detailLevel?: 'basic' | 'detailed' | 'comprehensive';
  };
}

class ScheduleAnalysisDto {
  conversationId: string;
  analysisTypes: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduling?: {
    immediate?: boolean;
    delay?: number;
  };
  notification?: {
    onComplete?: boolean;
    onError?: boolean;
  };
}

class BulkAnalysisDto {
  conversationIds: string[];
  analysisTypes: string[];
  batchSize?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * AI Analysis Controller
 * RESTful API endpoints for AI-powered debate analysis
 */
@ApiTags('AI Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-analysis')
export class AIAnalysisController {
  private readonly logger = new Logger(AIAnalysisController.name);

  constructor(
    private readonly analysisOrchestrator: AnalysisOrchestratorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Start comprehensive AI analysis for a debate
   */
  @Post('analyze')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Start comprehensive AI analysis for a debate' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Analysis started successfully' })
  async startAnalysis(
    @Body() dto: StartAnalysisDto,
    @GetUser() user: User,
  ) {
    try {
      this.logger.log(`Starting analysis for conversation ${dto.conversationId} by user ${user.id}`);

      // Validate conversation access
      await this.validateConversationAccess(dto.conversationId, user);

      // Get debate transcript data
      const transcript = await this.getDebateTranscript(dto.conversationId);

      // Apply preset configuration if specified
      let analysisOptions = dto.options || {};
      if (dto.preset) {
        const presetConfig = this.analysisOrchestrator.getAnalysisPreset(dto.preset);
        analysisOptions = { ...presetConfig, ...analysisOptions };
      }

      // Build comprehensive analysis request
      const request: ComprehensiveAnalysisRequest = {
        conversationId: dto.conversationId,
        userId: user.id,
        targetUserId: dto.targetUserId,
        includeSentiment: dto.analysisTypes.includes('sentiment'),
        includeTopic: dto.analysisTypes.includes('topic'),
        includeArgument: dto.analysisTypes.includes('argument'),
        includeLearning: dto.analysisTypes.includes('learning') && !!dto.targetUserId,
        analysisOptions,
      };

      // Perform analysis
      const result = await this.analysisOrchestrator.performComprehensiveAnalysis(
        transcript,
        request
      );

      return {
        success: true,
        data: {
          analysisId: result.analysisId,
          conversationId: result.conversationId,
          status: result.status,
          confidence: result.confidence,
          processingTime: result.processingTime,
          tokensUsed: result.tokensUsed,
          summary: result.summary,
          availableResults: {
            sentiment: !!result.sentiment,
            topic: !!result.topic,
            argument: !!result.argument,
            learning: !!result.learning,
          },
        },
        message: 'AI analysis completed successfully',
      };

    } catch (error) {
      this.logger.error(`Analysis failed for conversation ${dto.conversationId}`, error.stack);
      throw new BadRequestException(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Schedule analysis for background processing
   */
  @Post('schedule')
  @Roles('teacher', 'admin')
  @ApiOperation({ summary: 'Schedule AI analysis for background processing' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Analysis scheduled successfully' })
  async scheduleAnalysis(
    @Body() dto: ScheduleAnalysisDto,
    @GetUser() user: User,
  ) {
    try {
      // Validate conversation access
      await this.validateConversationAccess(dto.conversationId, user);

      // Build job configuration
      const config: AnalysisJobConfig = {
        analysisTypes: dto.analysisTypes,
        priority: dto.priority || 'normal',
        scheduling: {
          immediate: dto.scheduling?.immediate ?? true,
          delay: dto.scheduling?.delay || 0,
        },
        notification: {
          onComplete: dto.notification?.onComplete ?? true,
          onError: dto.notification?.onError ?? true,
          recipients: [user.id],
        },
        storage: {
          persistResults: true,
          cacheResults: true,
          retentionDays: 30,
        },
      };

      // Schedule the analysis job
      const { jobId, estimatedCompletion } = await this.analysisOrchestrator.scheduleAnalysisJob(
        dto.conversationId,
        config
      );

      return {
        success: true,
        data: {
          jobId,
          conversationId: dto.conversationId,
          analysisTypes: dto.analysisTypes,
          priority: dto.priority,
          estimatedCompletion,
          status: 'scheduled',
        },
        message: 'Analysis scheduled for background processing',
      };

    } catch (error) {
      this.logger.error(`Failed to schedule analysis for conversation ${dto.conversationId}`, error.stack);
      throw new BadRequestException(`Scheduling failed: ${error.message}`);
    }
  }

  /**
   * Schedule bulk analysis for multiple conversations
   */
  @Post('bulk-analyze')
  @Roles('admin')
  @ApiOperation({ summary: 'Schedule bulk analysis for multiple conversations' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bulk analysis scheduled successfully' })
  async scheduleBulkAnalysis(
    @Body() dto: BulkAnalysisDto,
    @GetUser() user: User,
  ) {
    try {
      if (dto.conversationIds.length > 50) {
        throw new BadRequestException('Maximum 50 conversations allowed per bulk analysis');
      }

      const results = [];
      const batchSize = dto.batchSize || 5;

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < dto.conversationIds.length; i += batchSize) {
        const batch = dto.conversationIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (conversationId) => {
          try {
            // Validate access for each conversation
            await this.validateConversationAccess(conversationId, user);

            const config: AnalysisJobConfig = {
              analysisTypes: dto.analysisTypes,
              priority: dto.priority || 'low',
              scheduling: { immediate: false, delay: i * 1000 }, // Stagger jobs
              notification: { onComplete: false, onError: true, recipients: [user.id] },
              storage: { persistResults: true, cacheResults: true },
            };

            const { jobId, estimatedCompletion } = await this.analysisOrchestrator.scheduleAnalysisJob(
              conversationId,
              config
            );

            return {
              conversationId,
              jobId,
              estimatedCompletion,
              status: 'scheduled',
            };

          } catch (error) {
            return {
              conversationId,
              status: 'failed',
              error: error.message,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches
        if (i + batchSize < dto.conversationIds.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const successCount = results.filter(r => r.status === 'scheduled').length;
      const failCount = results.filter(r => r.status === 'failed').length;

      return {
        success: true,
        data: {
          totalConversations: dto.conversationIds.length,
          successfullyScheduled: successCount,
          failed: failCount,
          analysisTypes: dto.analysisTypes,
          results,
        },
        message: `Bulk analysis scheduled: ${successCount} successful, ${failCount} failed`,
      };

    } catch (error) {
      this.logger.error('Bulk analysis scheduling failed', error.stack);
      throw new BadRequestException(`Bulk scheduling failed: ${error.message}`);
    }
  }

  /**
   * Get analysis progress for a conversation
   */
  @Get('progress/:conversationId')
  @ApiOperation({ summary: 'Get analysis progress for a conversation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Progress retrieved successfully' })
  async getAnalysisProgress(
    @Param('conversationId') conversationId: string,
    @GetUser() user: User,
  ) {
    try {
      // Validate conversation access
      await this.validateConversationAccess(conversationId, user);

      const progress = this.analysisOrchestrator.getAnalysisProgress(conversationId);
      
      if (!progress) {
        throw new NotFoundException('No active analysis found for this conversation');
      }

      return {
        success: true,
        data: {
          conversationId: progress.conversationId,
          status: progress.status,
          progress: progress.progress,
          currentStage: progress.currentStage,
          estimatedCompletion: progress.estimatedCompletion,
          completedAnalyses: progress.completedAnalyses,
          errors: progress.errors,
        },
      };

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to get progress: ${error.message}`);
    }
  }

  /**
   * Cancel ongoing analysis
   */
  @Post('cancel/:conversationId')
  @ApiOperation({ summary: 'Cancel ongoing analysis for a conversation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Analysis cancelled successfully' })
  async cancelAnalysis(
    @Param('conversationId') conversationId: string,
    @GetUser() user: User,
  ) {
    try {
      // Validate conversation access
      await this.validateConversationAccess(conversationId, user);

      const cancelled = await this.analysisOrchestrator.cancelAnalysis(conversationId);
      
      if (!cancelled) {
        throw new NotFoundException('No active analysis found to cancel');
      }

      return {
        success: true,
        message: 'Analysis cancelled successfully',
      };

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to cancel analysis: ${error.message}`);
    }
  }

  /**
   * Validate conversation for analysis
   */
  @Get('validate/:conversationId')
  @ApiOperation({ summary: 'Validate conversation readiness for AI analysis' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Validation completed' })
  async validateConversation(
    @Param('conversationId') conversationId: string,
    @GetUser() user: User,
  ) {
    try {
      // Validate conversation access
      await this.validateConversationAccess(conversationId, user);

      const validation = await this.analysisOrchestrator.validateTranscriptForAnalysis(conversationId);

      return {
        success: true,
        data: {
          conversationId,
          valid: validation.valid,
          issues: validation.issues,
          recommendations: validation.recommendations,
          requirements: DEFAULT_VALIDATION,
        },
      };

    } catch (error) {
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
  }

  /**
   * Get available analysis presets
   */
  @Get('presets')
  @ApiOperation({ summary: 'Get available analysis preset configurations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Presets retrieved successfully' })
  async getAnalysisPresets() {
    const presets = {
      basic: {
        ...this.analysisOrchestrator.getAnalysisPreset('BASIC'),
        description: 'Basic analysis suitable for quick insights',
        estimatedTime: '1-2 minutes',
        recommendedFor: 'Quick feedback and basic assessment',
      },
      detailed: {
        ...this.analysisOrchestrator.getAnalysisPreset('DETAILED'),
        description: 'Comprehensive analysis with detailed insights',
        estimatedTime: '3-5 minutes',
        recommendedFor: 'Thorough assessment and detailed feedback',
      },
      comprehensive: {
        ...this.analysisOrchestrator.getAnalysisPreset('COMPREHENSIVE'),
        description: 'Complete analysis with all features enabled',
        estimatedTime: '5-10 minutes',
        recommendedFor: 'Research, detailed evaluation, and personalized insights',
      },
    };

    return {
      success: true,
      data: presets,
    };
  }

  /**
   * Get system health status
   */
  @Get('health')
  @Roles('admin')
  @ApiOperation({ summary: 'Get AI analysis system health status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Health status retrieved successfully' })
  async getSystemHealth() {
    const health = await this.analysisOrchestrator.getSystemHealth();

    return {
      success: true,
      data: health,
    };
  }

  /**
   * Get analysis capabilities and limits
   */
  @Get('capabilities')
  @ApiOperation({ summary: 'Get AI analysis capabilities and current limits' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Capabilities retrieved successfully' })
  async getCapabilities() {
    // Get current usage stats and limits
    const health = await this.analysisOrchestrator.getSystemHealth();

    return {
      success: true,
      data: {
        availableAnalysisTypes: {
          sentiment: {
            name: 'Sentiment Analysis',
            description: 'Analyze emotional tone and sentiment patterns',
            features: ['emotion_detection', 'progression_tracking', 'participant_comparison'],
          },
          topic: {
            name: 'Topic Analysis',
            description: 'Evaluate topic coherence and focus',
            features: ['drift_detection', 'keyword_extraction', 'focus_assessment'],
          },
          argument: {
            name: 'Argument Analysis',
            description: 'Assess argument quality and structure',
            features: ['fallacy_detection', 'evidence_evaluation', 'quality_scoring'],
          },
          learning: {
            name: 'Learning Insights',
            description: 'Generate personalized learning recommendations',
            features: ['skill_assessment', 'growth_tracking', 'personalized_feedback'],
          },
        },
        limits: {
          maxConversationsPerBatch: 50,
          maxAnalysisTypesPerRequest: 4,
          dailyAnalysisLimit: health.overall?.usageStats?.limit || 100,
          currentUsage: health.overall?.usageStats?.today || 0,
          remainingToday: health.overall?.usageStats?.remaining || 100,
        },
        requirements: DEFAULT_VALIDATION,
        presets: Object.keys(ANALYSIS_PRESETS),
      },
    };
  }

  // Private helper methods

  private async validateConversationAccess(conversationId: string, user: User): Promise<void> {
    // Check if conversation exists and user has access
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        // Add access control logic based on your schema
        // For now, allow all authenticated users
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found or access denied`);
    }
  }

  private async getDebateTranscript(conversationId: string): Promise<any> {
    // Get conversation data with messages and participants
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          where: { status: { not: 'DELETED' } },
          orderBy: { created_at: 'asc' },
          include: {
            user: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
        // Add other necessary relations when available
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Transform to expected transcript format
    // This is a simplified transformation - adjust based on your actual schema
    return {
      conversationId: conversation.id,
      participants: [
        // Extract participants from messages
        // This is simplified - adjust based on your actual data structure
      ],
      messages: conversation.messages.map((msg: any) => ({
        id: msg.id,
        userId: msg.user_id || msg.userId,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        wordCount: msg.content?.split(/\s+/).length || 0,
        messageType: 'argument', // Simplified - add logic to determine type
        phase: 'discussion', // Simplified - add logic to determine phase
      })),
      topic: {
        title: 'Debate Topic', // Extract from conversation or match data
        description: '',
      },
      metadata: {
        duration: 0, // Calculate from start/end times
        messageCount: conversation.messages.length,
        participantCount: new Set(conversation.messages.map((m: any) => m.user_id)).size,
        status: conversation.status,
        startTime: new Date(conversation.created_at),
        endTime: conversation.ended_at ? new Date(conversation.ended_at) : undefined,
      },
    };
  }
}
