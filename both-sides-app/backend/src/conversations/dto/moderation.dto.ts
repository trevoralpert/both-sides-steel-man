/**
 * Moderation DTOs
 * 
 * Data structures for automated moderation actions and workflows
 * Task 5.3.2: Automated Moderation Actions
 */

import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsArray, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ModerationAction {
  APPROVE = 'approve',
  WARN = 'warn',
  BLOCK = 'block',
  REVIEW = 'review',
  ESCALATE = 'escalate',
  SUSPEND = 'suspend'
}

export enum ModerationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum AppealStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  UNDER_REVIEW = 'under_review'
}

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    toxicityThreshold?: number;
    qualityThreshold?: number;
    keywordPatterns?: string[];
    behaviorPatterns?: string[];
    repeatOffenseCount?: number;
  };
  action: ModerationAction;
  severity: ModerationSeverity;
  autoExecute: boolean;
  appealable: boolean;
  notificationTemplate?: string;
  escalationPath?: string[];
}

export interface ModerationResult {
  messageId: string;
  action: ModerationAction;
  severity: ModerationSeverity;
  reason: string;
  ruleTriggered: string;
  autoExecuted: boolean;
  appealable: boolean;
  executedAt: Date;
  executorId?: string; // System or moderator ID
  metadata?: {
    analysisResults?: any;
    userHistory?: any;
    additionalContext?: any;
  };
}

export interface UserNotification {
  userId: string;
  type: 'moderation_action' | 'warning' | 'appeal_result' | 'educational_tip';
  title: string;
  message: string;
  actionDetails: {
    messageId: string;
    action: ModerationAction;
    reason: string;
    appealable: boolean;
    appealDeadline?: Date;
  };
  priority: 'low' | 'medium' | 'high';
  channels: ('in_app' | 'email' | 'real_time')[];
  metadata?: any;
}

export class CreateModerationRuleDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  trigger?: {
    toxicityThreshold?: number;
    qualityThreshold?: number;
    keywordPatterns?: string[];
    behaviorPatterns?: string[];
    repeatOffenseCount?: number;
  };

  @IsEnum(ModerationAction)
  action: ModerationAction;

  @IsEnum(ModerationSeverity)
  severity: ModerationSeverity;

  @IsBoolean()
  autoExecute: boolean;

  @IsBoolean()
  appealable: boolean;

  @IsOptional()
  @IsString()
  notificationTemplate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  escalationPath?: string[];
}

export class ProcessModerationRequest {
  @IsString()
  messageId: string;

  @IsString()
  conversationId: string;

  @IsString()
  userId: string;

  @IsOptional()
  analysisResults?: any;

  @IsOptional()
  @IsBoolean()
  overrideAutoExecution?: boolean;

  @IsOptional()
  @IsString()
  moderatorId?: string;
}

export class CreateAppealRequest {
  @IsString()
  messageId: string;

  @IsString()
  moderationResultId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  additionalEvidence?: string;

  @IsString()
  userId: string;
}

export class AppealResponse {
  @IsString()
  id: string;

  @IsString()
  messageId: string;

  @IsString()
  moderationResultId: string;

  @IsString()
  userId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  additionalEvidence?: string;

  @IsEnum(AppealStatus)
  status: AppealStatus;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  createdAt: Date;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  updatedAt: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  reviewedAt?: Date;
}

export class ReviewQueueItem {
  @IsString()
  id: string;

  @IsString()
  type: 'message_review' | 'appeal_review' | 'escalation';

  @IsString()
  messageId: string;

  @IsString()
  conversationId: string;

  @IsString()
  userId: string;

  @IsString()
  content: string;

  @IsString()
  reason: string;

  @IsEnum(ModerationSeverity)
  priority: ModerationSeverity;

  @IsOptional()
  analysisResults?: any;

  @IsOptional()
  @IsString()
  appealId?: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  queuedAt: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  assignedAt?: Date;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class BatchModerationRequest {
  @IsArray()
  messages: ProcessModerationRequest[];

  @IsOptional()
  @IsString()
  priority?: 'high' | 'medium' | 'low';

  @IsOptional()
  @IsString()
  batchId?: string;
}

export class BatchModerationResponse {
  @IsString()
  batchId: string;

  @IsNumber()
  totalProcessed: number;

  @IsNumber()
  actionsExecuted: number;

  @IsNumber()
  queuedForReview: number;

  @IsNumber()
  errors: number;

  @IsArray()
  results: ModerationResult[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errorMessages?: string[];
}

export interface ModerationMetrics {
  totalActions: number;
  actionBreakdown: Record<ModerationAction, number>;
  severityBreakdown: Record<ModerationSeverity, number>;
  autoExecutionRate: number;
  appealRate: number;
  overturnRate: number;
  averageResponseTime: number;
  queueSize: number;
}
