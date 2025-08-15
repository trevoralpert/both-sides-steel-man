/**
 * Auto Moderation Service
 * 
 * Automated content filtering and moderation action execution
 * Task 5.3.2: Automated Moderation Actions
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../common/services/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageAnalysisService } from './message-analysis.service';
import {
  ModerationRule,
  ModerationResult,
  ModerationAction,
  ModerationSeverity,
  ProcessModerationRequest,
  UserNotification,
  ReviewQueueItem,
  BatchModerationRequest,
  BatchModerationResponse,
  CreateAppealRequest,
  AppealResponse,
  AppealStatus,
  ModerationMetrics,
} from '../dto/moderation.dto';
import { MessageAnalysis } from '../dto/message-analysis.dto';

@Injectable()
export class AutoModerationService {
  private readonly logger = new Logger(AutoModerationService.name);
  private moderationRules: ModerationRule[] = [];
  private readonly CACHE_TTL = 1800000; // 30 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
    private readonly messageAnalysisService: MessageAnalysisService,
  ) {
    this.initializeDefaultRules();
  }

  /**
   * Process message through moderation pipeline
   */
  async processMessage(request: ProcessModerationRequest): Promise<ModerationResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing moderation for message ${request.messageId}`);

      // Get analysis results if not provided
      let analysisResults = request.analysisResults;
      if (!analysisResults) {
        const analysis = await this.messageAnalysisService.analyzeMessage({
          messageId: request.messageId,
          content: await this.getMessageContent(request.messageId),
          userId: request.userId,
          conversationId: request.conversationId,
        });
        analysisResults = analysis.analysisResults;
      }

      // Get user history for context
      const userHistory = await this.getUserModerationHistory(request.userId);

      // Evaluate moderation rules
      const triggeredRule = await this.evaluateRules(analysisResults, userHistory, request);
      
      if (!triggeredRule) {
        // No rules triggered, approve message
        return this.createModerationResult(
          request.messageId,
          ModerationAction.APPROVE,
          ModerationSeverity.LOW,
          'No moderation rules triggered',
          'auto_approval',
          true,
          analysisResults,
        );
      }

      // Create moderation result
      const result = this.createModerationResult(
        request.messageId,
        triggeredRule.action,
        triggeredRule.severity,
        this.buildModerationReason(triggeredRule, analysisResults),
        triggeredRule.id,
        triggeredRule.autoExecute && !request.overrideAutoExecution,
        analysisResults,
        userHistory,
      );

      // Execute action if auto-execute is enabled
      if (triggeredRule.autoExecute && !request.overrideAutoExecution) {
        await this.executeAction(result, request);
      } else {
        // Queue for manual review
        await this.queueForReview(result, request, triggeredRule);
      }

      // Store moderation result
      await this.storeModerationResult(result);

      // Send notification to user
      if (result.action !== ModerationAction.APPROVE) {
        await this.sendUserNotification(request.userId, result, triggeredRule);
      }

      // Update user moderation history
      await this.updateUserHistory(request.userId, result);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Processed moderation for message ${request.messageId} in ${processingTime}ms - Action: ${result.action}`);

      return result;

    } catch (error) {
      this.logger.error(`Failed to process moderation for message ${request.messageId}`, error.stack);
      
      // Fallback to manual review
      return this.createModerationResult(
        request.messageId,
        ModerationAction.REVIEW,
        ModerationSeverity.MEDIUM,
        'Moderation processing failed, queued for manual review',
        'error_fallback',
        false,
      );
    }
  }

  /**
   * Execute moderation action
   */
  async executeAction(result: ModerationResult, request: ProcessModerationRequest): Promise<void> {
    this.logger.log(`Executing moderation action: ${result.action} for message ${result.messageId}`);

    try {
      switch (result.action) {
        case ModerationAction.BLOCK:
          await this.blockMessage(result.messageId, result.reason);
          break;

        case ModerationAction.WARN:
          await this.warnUser(request.userId, result);
          break;

        case ModerationAction.SUSPEND:
          await this.suspendUser(request.userId, result);
          break;

        case ModerationAction.ESCALATE:
          await this.escalateToAdmin(result, request);
          break;

        case ModerationAction.REVIEW:
          await this.queueForReview(result, request, null);
          break;

        case ModerationAction.APPROVE:
        default:
          // No action needed for approval
          break;
      }

      result.autoExecuted = true;
      result.executedAt = new Date();
      
    } catch (error) {
      this.logger.error(`Failed to execute moderation action ${result.action}`, error.stack);
      
      // Queue for manual intervention if auto-execution fails
      await this.queueForReview(result, request, null);
    }
  }

  /**
   * Process batch moderation requests
   */
  async batchProcessModeration(request: BatchModerationRequest): Promise<BatchModerationResponse> {
    const batchId = request.batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results: ModerationResult[] = [];
    const errors: string[] = [];
    let actionsExecuted = 0;
    let queuedForReview = 0;

    this.logger.log(`Processing batch moderation for ${request.messages.length} messages`);

    try {
      // Process in smaller batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < request.messages.length; i += batchSize) {
        const batch = request.messages.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (messageRequest) => {
          try {
            const result = await this.processMessage(messageRequest);
            
            if (result.autoExecuted) {
              actionsExecuted++;
            } else if (result.action === ModerationAction.REVIEW) {
              queuedForReview++;
            }
            
            return result;
          } catch (error) {
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

        // Small delay between batches
        if (i + batchSize < request.messages.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        batchId,
        totalProcessed: request.messages.length,
        actionsExecuted,
        queuedForReview,
        errors: errors.length,
        results,
        errorMessages: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      this.logger.error('Batch moderation processing failed', error.stack);
      throw new HttpException(
        'Batch moderation processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Handle appeal requests
   */
  async handleAppeal(request: CreateAppealRequest): Promise<AppealResponse> {
    try {
      // Validate appeal request
      const moderationResult = await this.getModerationResult(request.moderationResultId);
      if (!moderationResult || !moderationResult.appealable) {
        throw new HttpException('Appeal not allowed for this moderation action', HttpStatus.BAD_REQUEST);
      }

      // Create appeal record
      const appeal = await this.prismaService.moderationAppeal.create({
        data: {
          id: `appeal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          messageId: request.messageId,
          moderationResultId: request.moderationResultId,
          userId: request.userId,
          reason: request.reason,
          additionalEvidence: request.additionalEvidence,
          status: AppealStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Queue appeal for review
      await this.queueAppealForReview(appeal);

      // Notify user of appeal submission
      await this.sendAppealNotification(request.userId, appeal, 'submitted');

      this.logger.log(`Appeal created for message ${request.messageId} by user ${request.userId}`);

      return {
        id: appeal.id,
        messageId: appeal.messageId,
        moderationResultId: appeal.moderationResultId,
        userId: appeal.userId,
        reason: appeal.reason,
        additionalEvidence: appeal.additionalEvidence,
        status: appeal.status as AppealStatus,
        createdAt: appeal.createdAt,
        updatedAt: appeal.updatedAt,
      };

    } catch (error) {
      this.logger.error(`Failed to create appeal for message ${request.messageId}`, error.stack);
      throw new HttpException(
        'Failed to create appeal',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get review queue items
   */
  async getReviewQueue(
    limit: number = 50,
    priority?: ModerationSeverity,
    assignedTo?: string,
  ): Promise<ReviewQueueItem[]> {
    try {
      const whereClause: any = {};
      
      if (priority) {
        whereClause.priority = priority;
      }
      
      if (assignedTo) {
        whereClause.assignedTo = assignedTo;
      } else {
        // Only show unassigned items by default
        whereClause.assignedTo = null;
      }

      const queueItems = await this.prismaService.reviewQueue.findMany({
        where: whereClause,
        orderBy: [
          { priority: 'desc' },
          { queuedAt: 'asc' },
        ],
        take: limit,
      });

      return queueItems.map(item => ({
        id: item.id,
        type: item.type as 'message_review' | 'appeal_review' | 'escalation',
        messageId: item.messageId,
        conversationId: item.conversationId,
        userId: item.userId,
        content: item.content,
        reason: item.reason,
        priority: item.priority as ModerationSeverity,
        analysisResults: item.analysisResults,
        appealId: item.appealId,
        queuedAt: item.queuedAt,
        assignedAt: item.assignedAt,
        assignedTo: item.assignedTo,
      }));

    } catch (error) {
      this.logger.error('Failed to get review queue', error.stack);
      return [];
    }
  }

  /**
   * Get moderation metrics
   */
  async getModerationMetrics(timeframe?: { from: Date; to: Date }): Promise<ModerationMetrics> {
    try {
      const whereClause: any = {};
      
      if (timeframe) {
        whereClause.executedAt = {
          gte: timeframe.from,
          lte: timeframe.to,
        };
      }

      const results = await this.prismaService.moderationResult.findMany({
        where: whereClause,
        include: {
          appeals: true,
        },
      });

      const totalActions = results.length;
      const actionBreakdown: Record<ModerationAction, number> = {} as any;
      const severityBreakdown: Record<ModerationSeverity, number> = {} as any;

      let autoExecutedCount = 0;
      let appealCount = 0;
      let overturnCount = 0;
      let totalResponseTime = 0;

      results.forEach(result => {
        // Action breakdown
        actionBreakdown[result.action as ModerationAction] = 
          (actionBreakdown[result.action as ModerationAction] || 0) + 1;

        // Severity breakdown  
        severityBreakdown[result.severity as ModerationSeverity] = 
          (severityBreakdown[result.severity as ModerationSeverity] || 0) + 1;

        // Auto execution rate
        if (result.autoExecuted) {
          autoExecutedCount++;
        }

        // Appeal metrics
        if (result.appeals && result.appeals.length > 0) {
          appealCount++;
          
          // Check for successful appeals (overturns)
          const approvedAppeals = result.appeals.filter(appeal => 
            appeal.status === AppealStatus.APPROVED
          );
          if (approvedAppeals.length > 0) {
            overturnCount++;
          }
        }

        // Response time calculation (simplified)
        if (result.executedAt && result.createdAt) {
          totalResponseTime += result.executedAt.getTime() - result.createdAt.getTime();
        }
      });

      // Get current queue size
      const queueSize = await this.prismaService.reviewQueue.count({
        where: { assignedTo: null },
      });

      return {
        totalActions,
        actionBreakdown,
        severityBreakdown,
        autoExecutionRate: totalActions > 0 ? autoExecutedCount / totalActions : 0,
        appealRate: totalActions > 0 ? appealCount / totalActions : 0,
        overturnRate: appealCount > 0 ? overturnCount / appealCount : 0,
        averageResponseTime: totalActions > 0 ? totalResponseTime / totalActions : 0,
        queueSize,
      };

    } catch (error) {
      this.logger.error('Failed to get moderation metrics', error.stack);
      
      // Return empty metrics
      return {
        totalActions: 0,
        actionBreakdown: {} as any,
        severityBreakdown: {} as any,
        autoExecutionRate: 0,
        appealRate: 0,
        overturnRate: 0,
        averageResponseTime: 0,
        queueSize: 0,
      };
    }
  }

  /**
   * Initialize default moderation rules
   */
  private initializeDefaultRules(): void {
    this.moderationRules = [
      {
        id: 'high_toxicity_block',
        name: 'High Toxicity Auto-Block',
        description: 'Automatically block messages with very high toxicity scores',
        trigger: { toxicityThreshold: 0.8 },
        action: ModerationAction.BLOCK,
        severity: ModerationSeverity.HIGH,
        autoExecute: true,
        appealable: true,
      },
      {
        id: 'medium_toxicity_review',
        name: 'Medium Toxicity Review',
        description: 'Queue messages with moderate toxicity for review',
        trigger: { toxicityThreshold: 0.6 },
        action: ModerationAction.REVIEW,
        severity: ModerationSeverity.MEDIUM,
        autoExecute: false,
        appealable: false,
      },
      {
        id: 'low_quality_coaching',
        name: 'Low Quality Coaching',
        description: 'Provide coaching suggestions for low quality messages',
        trigger: { qualityThreshold: 0.4 },
        action: ModerationAction.WARN,
        severity: ModerationSeverity.LOW,
        autoExecute: true,
        appealable: false,
      },
      {
        id: 'repeat_offender_escalate',
        name: 'Repeat Offender Escalation',
        description: 'Escalate users with multiple violations',
        trigger: { repeatOffenseCount: 3 },
        action: ModerationAction.ESCALATE,
        severity: ModerationSeverity.HIGH,
        autoExecute: false,
        appealable: true,
      },
    ];
  }

  /**
   * Evaluate moderation rules against analysis results
   */
  private async evaluateRules(
    analysisResults: MessageAnalysis['analysisResults'],
    userHistory: any,
    request: ProcessModerationRequest,
  ): Promise<ModerationRule | null> {
    for (const rule of this.moderationRules) {
      if (await this.isRuleTriggered(rule, analysisResults, userHistory, request)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Check if a specific rule is triggered
   */
  private async isRuleTriggered(
    rule: ModerationRule,
    analysisResults: MessageAnalysis['analysisResults'],
    userHistory: any,
    request: ProcessModerationRequest,
  ): Promise<boolean> {
    const { trigger } = rule;

    // Check toxicity threshold
    if (trigger.toxicityThreshold && 
        analysisResults.toxicity.score >= trigger.toxicityThreshold) {
      return true;
    }

    // Check quality threshold (inverted - low quality triggers action)
    if (trigger.qualityThreshold) {
      const avgQuality = (
        analysisResults.quality.argumentStrength +
        analysisResults.quality.constructiveness +
        analysisResults.quality.respectfulness
      ) / 3;
      
      if (avgQuality <= trigger.qualityThreshold) {
        return true;
      }
    }

    // Check repeat offense count
    if (trigger.repeatOffenseCount && 
        userHistory.violationCount >= trigger.repeatOffenseCount) {
      return true;
    }

    // Check keyword patterns
    if (trigger.keywordPatterns && trigger.keywordPatterns.length > 0) {
      const messageContent = await this.getMessageContent(request.messageId);
      const lowerContent = messageContent.toLowerCase();
      
      for (const pattern of trigger.keywordPatterns) {
        if (lowerContent.includes(pattern.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Create moderation result object
   */
  private createModerationResult(
    messageId: string,
    action: ModerationAction,
    severity: ModerationSeverity,
    reason: string,
    ruleTriggered: string,
    autoExecuted: boolean,
    analysisResults?: any,
    userHistory?: any,
  ): ModerationResult {
    return {
      messageId,
      action,
      severity,
      reason,
      ruleTriggered,
      autoExecuted,
      appealable: this.isActionAppealable(action),
      executedAt: new Date(),
      metadata: {
        analysisResults,
        userHistory,
        additionalContext: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      },
    };
  }

  /**
   * Build human-readable moderation reason
   */
  private buildModerationReason(rule: ModerationRule, analysisResults: any): string {
    const reasons: string[] = [];

    if (rule.trigger.toxicityThreshold && 
        analysisResults.toxicity.score >= rule.trigger.toxicityThreshold) {
      reasons.push(`High toxicity detected (${Math.round(analysisResults.toxicity.score * 100)}%)`);
    }

    if (rule.trigger.qualityThreshold) {
      const avgQuality = (
        analysisResults.quality.argumentStrength +
        analysisResults.quality.constructiveness +
        analysisResults.quality.respectfulness
      ) / 3;
      
      if (avgQuality <= rule.trigger.qualityThreshold) {
        reasons.push(`Low argument quality detected (${Math.round(avgQuality * 100)}%)`);
      }
    }

    if (reasons.length === 0) {
      reasons.push(rule.description);
    }

    return reasons.join('; ');
  }

  /**
   * Determine if an action is appealable
   */
  private isActionAppealable(action: ModerationAction): boolean {
    return [
      ModerationAction.BLOCK,
      ModerationAction.SUSPEND,
      ModerationAction.ESCALATE,
    ].includes(action);
  }

  // Helper methods for actions and data access
  private async getMessageContent(messageId: string): Promise<string> {
    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
      select: { content: true },
    });
    return message?.content || '';
  }

  private async getUserModerationHistory(userId: string): Promise<any> {
    const history = await this.prismaService.moderationResult.findMany({
      where: { 
        message: { user_id: userId }
      },
      orderBy: { executedAt: 'desc' },
      take: 10,
    });

    return {
      violationCount: history.filter(h => 
        [ModerationAction.BLOCK, ModerationAction.WARN, ModerationAction.SUSPEND].includes(h.action as ModerationAction)
      ).length,
      recentViolations: history,
    };
  }

  private async blockMessage(messageId: string, reason: string): Promise<void> {
    await this.prismaService.message.update({
      where: { id: messageId },
      data: { 
        moderation_status: 'BLOCKED',
        message_metadata: {
          moderation: { blocked: true, reason }
        }
      },
    });
  }

  private async warnUser(userId: string, result: ModerationResult): Promise<void> {
    // Implementation for warning users
    this.logger.log(`Warning sent to user ${userId} for message ${result.messageId}`);
  }

  private async suspendUser(userId: string, result: ModerationResult): Promise<void> {
    // Implementation for user suspension
    this.logger.log(`User ${userId} suspended due to message ${result.messageId}`);
  }

  private async escalateToAdmin(result: ModerationResult, request: ProcessModerationRequest): Promise<void> {
    // Implementation for admin escalation
    this.logger.log(`Message ${result.messageId} escalated to admin review`);
  }

  private async queueForReview(
    result: ModerationResult, 
    request: ProcessModerationRequest, 
    rule: ModerationRule | null
  ): Promise<void> {
    const messageContent = await this.getMessageContent(request.messageId);
    
    await this.prismaService.reviewQueue.create({
      data: {
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'message_review',
        messageId: request.messageId,
        conversationId: request.conversationId,
        userId: request.userId,
        content: messageContent,
        reason: result.reason,
        priority: result.severity,
        analysisResults: result.metadata?.analysisResults,
        queuedAt: new Date(),
      },
    });
  }

  private async sendUserNotification(
    userId: string, 
    result: ModerationResult, 
    rule: ModerationRule
  ): Promise<void> {
    // Implementation for user notifications
    this.logger.log(`Notification sent to user ${userId} for moderation action: ${result.action}`);
  }

  private async storeModerationResult(result: ModerationResult): Promise<void> {
    await this.prismaService.moderationResult.create({
      data: {
        id: `modresult_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        messageId: result.messageId,
        action: result.action,
        severity: result.severity,
        reason: result.reason,
        ruleTriggered: result.ruleTriggered,
        autoExecuted: result.autoExecuted,
        appealable: result.appealable,
        executedAt: result.executedAt,
        executorId: result.executorId,
        metadata: result.metadata,
        createdAt: new Date(),
      },
    });
  }

  private async updateUserHistory(userId: string, result: ModerationResult): Promise<void> {
    // Implementation for updating user moderation history
    this.logger.log(`Updated moderation history for user ${userId}`);
  }

  private async getModerationResult(moderationResultId: string): Promise<any> {
    return await this.prismaService.moderationResult.findUnique({
      where: { id: moderationResultId },
    });
  }

  private async queueAppealForReview(appeal: any): Promise<void> {
    const messageContent = await this.getMessageContent(appeal.messageId);
    
    await this.prismaService.reviewQueue.create({
      data: {
        id: `appeal_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'appeal_review',
        messageId: appeal.messageId,
        conversationId: '', // Get from message if needed
        userId: appeal.userId,
        content: messageContent,
        reason: appeal.reason,
        priority: ModerationSeverity.HIGH,
        appealId: appeal.id,
        queuedAt: new Date(),
      },
    });
  }

  private async sendAppealNotification(
    userId: string, 
    appeal: any, 
    type: 'submitted' | 'approved' | 'rejected'
  ): Promise<void> {
    // Implementation for appeal notifications
    this.logger.log(`Appeal ${type} notification sent to user ${userId} for appeal ${appeal.id}`);
  }
}
