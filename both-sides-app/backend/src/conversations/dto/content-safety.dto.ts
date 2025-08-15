/**
 * Content Safety DTOs
 * 
 * Data structures for content safety and compliance system
 * Task 5.3.4: Content Safety & Compliance
 */

import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsArray, IsDate, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IncidentType {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  PERSONAL_INFO_DISCLOSURE = 'personal_info_disclosure',
  HARASSMENT = 'harassment',
  BULLYING = 'bullying',
  HATE_SPEECH = 'hate_speech',
  THREAT = 'threat',
  SPAM = 'spam',
  OFF_TOPIC = 'off_topic',
  TECHNICAL_VIOLATION = 'technical_violation',
  PRIVACY_VIOLATION = 'privacy_violation'
}

export enum EscalationLevel {
  AUTO_HANDLED = 'auto_handled',
  MODERATOR_REVIEW = 'moderator_review',
  ADMIN_REVIEW = 'admin_review',
  SCHOOL_NOTIFICATION = 'school_notification',
  PARENT_NOTIFICATION = 'parent_notification',
  LEGAL_REVIEW = 'legal_review'
}

export enum RetentionStatus {
  ACTIVE = 'active',
  SCHEDULED_DELETION = 'scheduled_deletion',
  ANONYMIZED = 'anonymized',
  DELETED = 'deleted',
  ARCHIVED = 'archived'
}

export class SafetyCompliance {
  @ValidateNested()
  @Type(() => ContentRetentionPolicy)
  contentRetention: ContentRetentionPolicy;

  @ValidateNested()
  @Type(() => PrivacyProtection)
  privacyProtection: PrivacyProtection;

  @ValidateNested()
  @Type(() => IncidentReporting)
  incidentReporting: IncidentReporting;
}

export class ContentRetentionPolicy {
  @IsNumber()
  durationDays: number;

  @IsArray()
  @IsString({ each: true })
  anonymizationRules: string[];

  @IsString()
  deletionSchedule: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptions?: string[];
}

export class PrivacyProtection {
  @IsArray()
  @IsString({ each: true })
  minorDataHandling: string[];

  @IsBoolean()
  parentalNotification: boolean;

  @IsArray()
  @IsString({ each: true })
  dataExportRestrictions: string[];

  @IsOptional()
  @IsNumber()
  minimumAge?: number;
}

export class EscalationPath {
  @IsEnum(EscalationLevel)
  level: EscalationLevel;

  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @IsNumber()
  timeoutMinutes: number;

  @IsOptional()
  @IsString()
  template?: string;
}

export class IncidentReporting {
  @IsArray()
  @IsEnum(IncidentSeverity, { each: true })
  severityLevels: IncidentSeverity[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationPath)
  escalationPaths: EscalationPath[];

  @IsOptional()
  responseTimeRequirements?: Record<string, number>;
}

export class ValidateAgeAppropriateRequest {
  @IsString()
  content: string;

  @IsNumber()
  userAge: number;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  messageId?: string;
}

export class SafetyResult {
  @IsBoolean()
  isAppropriate: boolean;

  @IsOptional()
  @IsNumber()
  confidenceScore?: number;

  @IsArray()
  @IsString({ each: true })
  violations: string[];

  @IsArray()
  @IsString({ each: true })
  warnings: string[];

  @IsOptional()
  @IsString()
  recommendedAction?: string;

  @IsOptional()
  suggestedModifications?: string[];
}

export class IncidentDetails {
  @IsEnum(IncidentType)
  type: IncidentType;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  reportedBy?: string;

  @IsOptional()
  evidence?: any;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;
}

export class ReportIncidentRequest {
  @ValidateNested()
  @Type(() => IncidentDetails)
  details: IncidentDetails;

  @IsOptional()
  @IsString()
  additionalContext?: string;

  @IsOptional()
  @IsArray()
  attachedEvidence?: any[];
}

export class IncidentResponse {
  @IsString()
  incidentId: string;

  @IsEnum(IncidentType)
  type: IncidentType;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @Type(() => Date)
  @IsDate()
  reportedAt: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  resolvedAt?: Date;

  @IsOptional()
  @IsString()
  resolution?: string;
}

export class RetentionPolicy {
  @IsString()
  policyId: string;

  @IsString()
  entityType: string;

  @IsNumber()
  retentionDays: number;

  @IsBoolean()
  autoAnonymize: boolean;

  @IsBoolean()
  autoDelete: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptionCriteria?: string[];

  @IsOptional()
  @IsString()
  complianceFramework?: string;
}

export class AnonymizeUserDataRequest {
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsBoolean()
  preserveEducationalValue?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fieldsToPreserve?: string[];
}

export class ContentDeletionRequest {
  @IsString()
  contentId: string;

  @IsString()
  contentType: string;

  @ValidateNested()
  @Type(() => RetentionPolicy)
  policy: RetentionPolicy;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AuditContentAccessRequest {
  @IsString()
  userId: string;

  @IsString()
  contentId: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  metadata?: any;
}

export class ContentSafetyMetrics {
  @IsNumber()
  totalScanned: number;

  @IsNumber()
  violationsDetected: number;

  @IsNumber()
  falsePositives: number;

  @IsNumber()
  incidentsReported: number;

  @IsNumber()
  averageResponseTime: number;

  @IsNumber()
  complianceRate: number;

  @Type(() => Date)
  @IsDate()
  reportPeriod: Date;
}

export class ComplianceReportRequest {
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeMetrics?: string[];

  @IsOptional()
  @IsString()
  format?: 'json' | 'csv' | 'pdf';
}
