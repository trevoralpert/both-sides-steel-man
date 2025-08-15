/**
 * Analytics DTOs
 * 
 * Data structures for debate analytics and performance monitoring
 * Task 5.3.5: Analytics & Performance Monitoring
 */

import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsArray, IsDate, ValidateNested, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum DebatePhase {
  PREPARATION = 'preparation',
  OPENING = 'opening',
  DISCUSSION = 'discussion',
  REBUTTAL = 'rebuttal',
  CLOSING = 'closing',
  REFLECTION = 'reflection'
}

export enum AnalyticsTimeframe {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  XLSX = 'xlsx'
}

export class ParticipantEngagement {
  @IsString()
  userId: string;

  @IsString()
  userName?: string;

  @IsNumber()
  @Min(0)
  messageCount: number;

  @IsNumber()
  @Min(0)
  averageResponseTime: number; // in seconds

  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(1, { each: true })
  qualityScores: number[]; // Array of quality scores (0-1)

  @IsNumber()
  @Min(0)
  @Max(1)
  engagementLevel: number; // Overall engagement score (0-1)

  @IsNumber()
  @Min(0)
  @Max(1)
  respectfulnessScore: number; // Average respectfulness (0-1)

  @IsNumber()
  @Min(0)
  @Max(1)
  argumentStrength: number; // Average argument quality (0-1)

  @IsNumber()
  @Min(0)
  @Max(1)
  evidenceUsage: number; // How well they use evidence (0-1)

  @IsOptional()
  @IsNumber()
  totalWordsWritten?: number;

  @IsOptional()
  @IsNumber()
  averageMessageLength?: number;
}

export class PhaseAnalysis {
  @IsEnum(DebatePhase)
  phase: DebatePhase;

  @IsNumber()
  @Min(0)
  duration: number; // Duration in seconds

  @IsNumber()
  @Min(0)
  messageCount: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  messageQuality: number; // Average quality score for phase

  @IsNumber()
  @Min(0)
  @Max(1)
  participantBalance: number; // How balanced participation was (0-1)

  @IsNumber()
  @Min(0)
  @Max(1)
  phaseCompletionRate: number; // How well the phase objectives were met

  @IsOptional()
  @IsNumber()
  averageResponseTime?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyTopics?: string[]; // Main topics discussed in this phase
}

export class DebateOutcomes {
  @IsBoolean()
  learningAchieved: boolean;

  @IsBoolean()
  respectfulInteraction: boolean;

  @IsNumber()
  @Min(0)
  @Max(1)
  educationalValue: number; // Overall educational value score

  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  satisfactionScores: number[]; // User satisfaction ratings (1-5)

  @IsBoolean()
  debateCompleted: boolean;

  @IsNumber()
  @Min(0)
  @Max(1)
  goalAchievement: number; // How well learning objectives were met

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectivesMet?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  improvementAreas?: string[];
}

export class DebateAnalytics {
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  topicTitle?: string;

  @IsNumber()
  @Min(0)
  duration: number; // Total duration in seconds

  @IsNumber()
  @Min(0)
  messageCount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantEngagement)
  participantEngagement: ParticipantEngagement[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseAnalysis)
  phaseAnalysis: PhaseAnalysis[];

  @ValidateNested()
  @Type(() => DebateOutcomes)
  outcomes: DebateOutcomes;

  @Type(() => Date)
  @IsDate()
  startedAt: Date;

  @Type(() => Date)
  @IsDate()
  endedAt: Date;

  @Type(() => Date)
  @IsDate()
  analyzedAt: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  overallQualityScore?: number;

  @IsOptional()
  metadata?: {
    classId?: string;
    teacherId?: string;
    debateType?: string;
    aiCoachingUsed?: boolean;
    moderationActions?: number;
  };
}

export class ModerationMetrics {
  @Type(() => Date)
  @IsDate()
  reportPeriod: Date;

  @IsNumber()
  @Min(0)
  totalMessages: number;

  @IsNumber()
  @Min(0)
  messagesAnalyzed: number;

  @IsNumber()
  @Min(0)
  actionsExecuted: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  accuracy: number; // Moderation accuracy rate

  @IsNumber()
  @Min(0)
  @Max(1)
  falsePositiveRate: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  falseNegativeRate: number;

  @IsNumber()
  @Min(0)
  averageResponseTime: number; // Average time to analyze in seconds

  actionBreakdown: {
    approve: number;
    warn: number;
    block: number;
    review: number;
    escalate: number;
    suspend: number;
  };

  @IsNumber()
  @Min(0)
  appealCount: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  appealSuccessRate: number;

  @IsOptional()
  categoryBreakdown?: {
    toxicity: number;
    quality: number;
    educational: number;
    safety: number;
  };
}

export class EducationalAnalytics {
  @IsString()
  classId: string;

  @IsOptional()
  @IsString()
  className?: string;

  @IsNumber()
  @Min(0)
  totalDebates: number;

  @IsNumber()
  @Min(0)
  completedDebates: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  completionRate: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  averageEducationalValue: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantEngagement)
  studentEngagement: ParticipantEngagement[];

  learningObjectives: {
    objective: string;
    achievementRate: number; // 0-1
    debatesAddressed: number;
  }[];

  @IsNumber()
  @Min(0)
  @Max(1)
  criticalThinkingImprovement: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  argumentQualityImprovement: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  respectfulnessImprovement: number;

  @Type(() => Date)
  @IsDate()
  reportPeriod: Date;

  @IsOptional()
  teacherFeedback?: {
    satisfactionScore: number; // 1-5
    comments: string;
    recommendedImprovements: string[];
  };
}

export class SystemPerformanceMetrics {
  @Type(() => Date)
  @IsDate()
  reportPeriod: Date;

  @IsNumber()
  @Min(0)
  @Max(1)
  uptime: number; // System uptime percentage

  @IsNumber()
  @Min(0)
  averageLatency: number; // Average response time in ms

  @IsNumber()
  @Min(0)
  peakConcurrentUsers: number;

  @IsNumber()
  @Min(0)
  totalApiRequests: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  successRate: number; // API success rate

  @IsNumber()
  @Min(0)
  errorCount: number;

  messageDelivery: {
    totalMessages: number;
    successfulDeliveries: number;
    averageDeliveryTime: number; // in ms
    failedDeliveries: number;
  };

  realTimePerformance: {
    connectionSuccess: number; // 0-1
    averageConnectionTime: number; // in ms
    reconnectionRate: number; // 0-1
    typingIndicatorLatency: number; // in ms
  };

  aiServices: {
    analysisResponseTime: number; // average in ms
    analysisSuccessRate: number; // 0-1
    coachingResponseTime: number; // average in ms
    coachingSuccessRate: number; // 0-1
  };
}

export class DateRange {
  @Type(() => Date)
  @IsDate()
  from: Date;

  @Type(() => Date)
  @IsDate()
  to: Date;
}

export class AnalyticsFilters {
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRange)
  dateRange?: DateRange;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  debatePhases?: DebatePhase[];

  @IsOptional()
  @IsBoolean()
  completedOnly?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minimumQuality?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class PerformanceReport {
  @IsString()
  reportId: string;

  @ValidateNested()
  @Type(() => DateRange)
  timeframe: DateRange;

  @ValidateNested()
  @Type(() => SystemPerformanceMetrics)
  systemMetrics: SystemPerformanceMetrics;

  @ValidateNested()
  @Type(() => ModerationMetrics)
  moderationMetrics: ModerationMetrics;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebateAnalytics)
  topDebates: DebateAnalytics[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationalAnalytics)
  classPerformance: EducationalAnalytics[];

  summary: {
    totalDebates: number;
    totalUsers: number;
    averageDebateQuality: number;
    systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
    recommendedActions: string[];
  };

  @Type(() => Date)
  @IsDate()
  generatedAt: Date;

  @IsString()
  generatedBy: string;
}

export class ExportAnalyticsRequest {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ValidateNested()
  @Type(() => AnalyticsFilters)
  filters: AnalyticsFilters;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeFields?: string[];

  @IsOptional()
  @IsBoolean()
  anonymizeData?: boolean;

  @IsOptional()
  @IsString()
  reportTitle?: string;
}

export class ExportData {
  @IsString()
  exportId: string;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsString()
  downloadUrl: string;

  @IsNumber()
  @Min(0)
  recordCount: number;

  @IsNumber()
  @Min(0)
  fileSizeBytes: number;

  @Type(() => Date)
  @IsDate()
  expiresAt: Date;

  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @IsString()
  createdBy: string;

  @IsOptional()
  metadata?: {
    filters: AnalyticsFilters;
    includeFields?: string[];
    anonymized?: boolean;
  };
}

export class DashboardMetrics {
  @IsNumber()
  @Min(0)
  activeDebates: number;

  @IsNumber()
  @Min(0)
  totalUsers: number;

  @IsNumber()
  @Min(0)
  debatesToday: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  averageQuality: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  systemHealth: number;

  recentActivity: {
    timestamp: Date;
    activity: string;
    details: string;
  }[];

  alerts: {
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }[];

  @Type(() => Date)
  @IsDate()
  lastUpdated: Date;
}

// Request DTOs
export class GenerateReportRequest {
  @ValidateNested()
  @Type(() => DateRange)
  timeframe: DateRange;

  @IsOptional()
  @ValidateNested()
  @Type(() => AnalyticsFilters)
  filters?: AnalyticsFilters;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeMetrics?: string[];

  @IsOptional()
  @IsString()
  reportTitle?: string;
}

export class TrackConversationRequest {
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeMetrics?: string[];
}
