/**
 * DTOs for Progress Tracking API endpoints
 * Data Transfer Objects for progress monitoring, gamification, and analytics
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  IsNotEmpty,
  IsUUID,
  IsPositive,
  MaxLength,
  MinLength,
  ArrayMinSize
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProgressTrackingConfiguration,
  ProgressTrackingLevel,
  ProgressEvent,
  ProgressEventType,
  EventContext,
  PointsSource,
  AchievementCategory,
  Achievement,
  Badge,
  Streak,
  PointsBreakdown,
  StudentLevel,
  ProgressSnapshot,
  RecoveryData,
  ProgressInsight,
  ProgressPrediction,
  PredictiveIntervention,
  ReflectionProgress,
  CompletionMetrics,
  TimingMetrics,
  EngagementMetrics,
  QualityMetrics,
  EngagementLevel,
  QualityTrend,
  AchievementRarity,
  AchievementType
} from '../interfaces/progress-tracking.interfaces';

// =============================================
// Configuration DTOs
// =============================================

export class ProgressTrackingConfigurationDto {
  @ApiProperty({ enum: ProgressTrackingLevel, description: 'Level of tracking detail' })
  @IsEnum(ProgressTrackingLevel)
  level: ProgressTrackingLevel;

  @ApiProperty({ description: 'Enable gamification features' })
  @IsBoolean()
  enableGamification: boolean;

  @ApiProperty({ description: 'Enable predictive insights' })
  @IsBoolean()
  enablePredictiveInsights: boolean;

  @ApiProperty({ description: 'Enable real-time alerts' })
  @IsBoolean()
  enableRealTimeAlerts: boolean;

  @ApiProperty({ enum: ['question', 'section', 'session'], description: 'Tracking granularity' })
  @IsEnum(['question', 'section', 'session'])
  trackingGranularity: string;

  @ApiProperty({ description: 'Auto-save interval in milliseconds', minimum: 5000, maximum: 300000 })
  @IsNumber()
  @Min(5000)
  @Max(300000)
  autoSaveInterval: number;

  @ApiProperty({ description: 'Progress persistence TTL in hours', minimum: 1, maximum: 720 })
  @IsNumber()
  @Min(1)
  @Max(720)
  progressPersistenceTTL: number;

  @ApiProperty({ description: 'Enable achievement notifications' })
  @IsBoolean()
  achievementNotifications: boolean;

  @ApiProperty({ description: 'Enable anonymous tracking' })
  @IsBoolean()
  anonymousTracking: boolean;
}

export class InitializeProgressTrackingDto {
  @ApiProperty({ type: ProgressTrackingConfigurationDto, description: 'Progress tracking configuration' })
  @ValidateNested()
  @Type(() => ProgressTrackingConfigurationDto)
  configuration: ProgressTrackingConfigurationDto;
}

// =============================================
// Progress Event DTOs
// =============================================

export class EventContextDto {
  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Viewport dimensions' })
  @IsOptional()
  @IsObject()
  viewport?: { width: number; height: number };

  @ApiPropertyOptional({ description: 'Focus time in milliseconds', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  focusTime?: number;

  @ApiPropertyOptional({ description: 'Number of interactions', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interactionCount?: number;

  @ApiPropertyOptional({ description: 'Previous activity description' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  previousActivity?: string;

  @ApiPropertyOptional({ enum: ['beginning', 'middle', 'end'], description: 'Session phase' })
  @IsOptional()
  @IsEnum(['beginning', 'middle', 'end'])
  sessionPhase?: string;
}

export class ProgressEventDto {
  @ApiProperty({ enum: ProgressEventType, description: 'Type of progress event' })
  @IsEnum(ProgressEventType)
  type: ProgressEventType;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  timestamp: Date;

  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Question ID (if applicable)' })
  @IsOptional()
  @IsString()
  @IsUUID()
  questionId?: string;

  @ApiPropertyOptional({ description: 'Additional event data' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ type: EventContextDto, description: 'Event context information' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventContextDto)
  context?: EventContextDto;
}

export class UpdateProgressDto {
  @ApiProperty({ type: ProgressEventDto, description: 'Progress event to process' })
  @ValidateNested()
  @Type(() => ProgressEventDto)
  event: ProgressEventDto;
}

// =============================================
// Snapshot and Recovery DTOs
// =============================================

export class CreateProgressSnapshotDto {
  @ApiProperty({ enum: ['auto', 'manual', 'milestone'], description: 'Type of snapshot' })
  @IsEnum(['auto', 'manual', 'milestone'])
  type: 'auto' | 'manual' | 'milestone';

  @ApiPropertyOptional({ description: 'Reason for creating snapshot' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RecoverProgressDto {
  @ApiPropertyOptional({ description: 'Specific snapshot ID to recover from' })
  @IsOptional()
  @IsString()
  @IsUUID()
  snapshotId?: string;

  @ApiProperty({ description: 'Automatically resolve conflicts if possible' })
  @IsBoolean()
  autoResolve: boolean;
}

// =============================================
// Gamification DTOs
// =============================================

export class PointsSourceDto {
  @ApiProperty({ description: 'Source of the points', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  source: string;

  @ApiProperty({ description: 'Number of points', minimum: -1000, maximum: 10000 })
  @IsNumber()
  @Min(-1000)
  @Max(10000)
  points: number;

  @ApiProperty({ description: 'Timestamp when points were earned' })
  @IsDateString()
  timestamp: Date;

  @ApiProperty({ description: 'Description of why points were awarded', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ enum: AchievementCategory, description: 'Category of the achievement' })
  @IsEnum(AchievementCategory)
  category: AchievementCategory;
}

export class UpdatePointsDto {
  @ApiProperty({ type: PointsSourceDto, description: 'Points source information' })
  @ValidateNested()
  @Type(() => PointsSourceDto)
  source: PointsSourceDto;
}

export class UpdateStreakDto {
  @ApiProperty({ description: 'Type of streak to update' })
  @IsString()
  @IsNotEmpty()
  streakType: string;

  @ApiProperty({ description: 'Activity that should update the streak' })
  @IsString()
  @IsNotEmpty()
  activity: string;
}

export class LeaderboardQueryDto {
  @ApiPropertyOptional({ description: 'Number of entries to return', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Starting offset for pagination', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ enum: ['points', 'level', 'achievements'], description: 'Sort by field' })
  @IsOptional()
  @IsEnum(['points', 'level', 'achievements'])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], description: 'Sort direction' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: string;

  @ApiPropertyOptional({ description: 'Filter by class ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ description: 'Time period for leaderboard (e.g., "weekly", "monthly", "all-time")' })
  @IsOptional()
  @IsString()
  timePeriod?: string;
}

// =============================================
// Response DTOs
// =============================================

export class CompletionMetricsDto {
  @ApiProperty({ description: 'Total number of questions', minimum: 0 })
  @IsNumber()
  @Min(0)
  totalQuestions: number;

  @ApiProperty({ description: 'Number of completed questions', minimum: 0 })
  @IsNumber()
  @Min(0)
  completedQuestions: number;

  @ApiProperty({ description: 'Number of skipped questions', minimum: 0 })
  @IsNumber()
  @Min(0)
  skippedQuestions: number;

  @ApiProperty({ description: 'Number of questions in progress', minimum: 0 })
  @IsNumber()
  @Min(0)
  inProgressQuestions: number;

  @ApiProperty({ description: 'Overall completion percentage', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  completionPercentage: number;

  @ApiProperty({ description: 'Quality completion rate', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  qualityCompletionRate: number;
}

export class TimingMetricsDto {
  @ApiProperty({ description: 'Total time spent in seconds', minimum: 0 })
  @IsNumber()
  @Min(0)
  totalTimeSpent: number;

  @ApiProperty({ description: 'Active time in seconds', minimum: 0 })
  @IsNumber()
  @Min(0)
  activeTime: number;

  @ApiProperty({ description: 'Idle time in seconds', minimum: 0 })
  @IsNumber()
  @Min(0)
  idleTime: number;

  @ApiProperty({ description: 'Average time per question in seconds', minimum: 0 })
  @IsNumber()
  @Min(0)
  averageQuestionTime: number;

  @ApiProperty({ description: 'Time efficiency score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  timeEfficiencyScore: number;

  @ApiProperty({ description: 'Pacing consistency score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  pacingConsistency: number;

  @ApiProperty({ description: 'Estimated time remaining in seconds', minimum: 0 })
  @IsNumber()
  @Min(0)
  estimatedTimeRemaining: number;

  @ApiProperty({ description: 'Estimated completion time' })
  @IsDateString()
  estimatedCompletionTime: Date;
}

export class EngagementMetricsDto {
  @ApiProperty({ enum: EngagementLevel, description: 'Overall engagement level' })
  @IsEnum(EngagementLevel)
  overall: EngagementLevel;

  @ApiProperty({ description: 'Engagement score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({ description: 'Number of mouse movements', minimum: 0 })
  @IsNumber()
  @Min(0)
  mouseMovements: number;

  @ApiProperty({ description: 'Number of keystrokes', minimum: 0 })
  @IsNumber()
  @Min(0)
  keystrokes: number;

  @ApiProperty({ description: 'Number of focus losses', minimum: 0 })
  @IsNumber()
  @Min(0)
  focusLossCount: number;

  @ApiProperty({ description: 'Total focus time in seconds', minimum: 0 })
  @IsNumber()
  @Min(0)
  totalFocusTime: number;

  @ApiProperty({ description: 'Response depth score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  responseDepthScore: number;

  @ApiProperty({ description: 'Number of revisions made', minimum: 0 })
  @IsNumber()
  @Min(0)
  revisionCount: number;

  @ApiProperty({ description: 'Media usage rate', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  mediaUsageRate: number;

  @ApiProperty({ description: 'Hesitation score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  hesitationScore: number;

  @ApiProperty({ description: 'Confidence score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @ApiProperty({ description: 'Attention score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  attentionScore: number;

  @ApiProperty({ enum: ['increasing', 'decreasing', 'stable', 'variable'], description: 'Engagement trend' })
  @IsEnum(['increasing', 'decreasing', 'stable', 'variable'])
  engagementTrend: string;
}

export class QualityMetricsDto {
  @ApiProperty({ description: 'Overall quality score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  overallScore: number;

  @ApiProperty({ enum: QualityTrend, description: 'Quality trend' })
  @IsEnum(QualityTrend)
  trend: QualityTrend;

  @ApiProperty({ description: 'Quality consistency score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  consistency: number;

  @ApiProperty({ description: 'Thoughtfulness score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  thoughtfulnessScore: number;

  @ApiProperty({ description: 'Originality score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  originalityScore: number;

  @ApiProperty({ description: 'Depth score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  depthScore: number;

  @ApiProperty({ description: 'Clarity score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  clarityScore: number;

  @ApiProperty({ description: 'Relevance score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  relevanceScore: number;

  @ApiProperty({ description: 'Improvement rate', minimum: -1, maximum: 1 })
  @IsNumber()
  @Min(-1)
  @Max(1)
  improvementRate: number;
}

export class AchievementRequirementDto {
  @ApiProperty({ enum: ['completion', 'quality', 'time', 'streak', 'custom'], description: 'Requirement type' })
  @IsEnum(['completion', 'quality', 'time', 'streak', 'custom'])
  type: string;

  @ApiProperty({ description: 'Requirement condition' })
  @IsString()
  condition: string;

  @ApiProperty({ description: 'Target value', minimum: 0 })
  @IsNumber()
  @Min(0)
  target: number;

  @ApiProperty({ description: 'Current value', minimum: 0 })
  @IsNumber()
  @Min(0)
  currentValue: number;
}

export class BadgeDto {
  @ApiProperty({ description: 'Badge ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Badge name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Badge description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Badge icon URL' })
  @IsString()
  @IsUrl()
  iconUrl: string;

  @ApiProperty({ description: 'Badge color (hex)' })
  @IsString()
  color: string;

  @ApiProperty({ enum: AchievementRarity, description: 'Badge rarity' })
  @IsEnum(AchievementRarity)
  rarity: AchievementRarity;

  @ApiProperty({ enum: AchievementCategory, description: 'Badge category' })
  @IsEnum(AchievementCategory)
  category: AchievementCategory;

  @ApiProperty({ description: 'Date badge was earned' })
  @IsDateString()
  earnedAt: Date;

  @ApiProperty({ description: 'Display order priority', minimum: 0 })
  @IsNumber()
  @Min(0)
  displayOrder: number;
}

export class AchievementDto {
  @ApiProperty({ description: 'Achievement ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Achievement name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Achievement description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: AchievementCategory, description: 'Achievement category' })
  @IsEnum(AchievementCategory)
  category: AchievementCategory;

  @ApiProperty({ enum: AchievementType, description: 'Achievement type' })
  @IsEnum(AchievementType)
  type: AchievementType;

  @ApiProperty({ type: [AchievementRequirementDto], description: 'Achievement requirements' })
  @ValidateNested({ each: true })
  @Type(() => AchievementRequirementDto)
  requirements: AchievementRequirementDto[];

  @ApiProperty({ description: 'Points awarded', minimum: 0 })
  @IsNumber()
  @Min(0)
  points: number;

  @ApiPropertyOptional({ type: BadgeDto, description: 'Associated badge' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BadgeDto)
  badge?: BadgeDto;

  @ApiProperty({ description: 'Progress towards completion', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  progress: number;

  @ApiProperty({ description: 'Whether achievement is completed' })
  @IsBoolean()
  isCompleted: boolean;

  @ApiPropertyOptional({ description: 'Date completed' })
  @IsOptional()
  @IsDateString()
  completedAt?: Date;

  @ApiProperty({ enum: AchievementRarity, description: 'Achievement rarity' })
  @IsEnum(AchievementRarity)
  rarity: AchievementRarity;

  @ApiProperty({ description: 'Whether achievement is hidden until unlocked' })
  @IsBoolean()
  isHidden: boolean;

  @ApiProperty({ type: [String], description: 'Prerequisite achievement IDs' })
  @IsArray()
  @IsString({ each: true })
  prerequisiteAchievements: string[];
}

export class StreakRewardDto {
  @ApiProperty({ description: 'Streak length required', minimum: 1 })
  @IsNumber()
  @Min(1)
  streakLength: number;

  @ApiProperty({ description: 'Points awarded', minimum: 0 })
  @IsNumber()
  @Min(0)
  points: number;

  @ApiPropertyOptional({ type: BadgeDto, description: 'Badge awarded' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BadgeDto)
  badge?: BadgeDto;

  @ApiPropertyOptional({ description: 'Title awarded' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Reward description' })
  @IsString()
  description: string;
}

export class StreakDto {
  @ApiProperty({ description: 'Streak ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ enum: ['daily', 'weekly', 'quality', 'completion', 'custom'], description: 'Streak type' })
  @IsEnum(['daily', 'weekly', 'quality', 'completion', 'custom'])
  type: string;

  @ApiProperty({ description: 'Streak name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Streak description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Current streak count', minimum: 0 })
  @IsNumber()
  @Min(0)
  currentStreak: number;

  @ApiProperty({ description: 'Maximum streak achieved', minimum: 0 })
  @IsNumber()
  @Min(0)
  maxStreak: number;

  @ApiProperty({ description: 'Target streak length', minimum: 1 })
  @IsNumber()
  @Min(1)
  streakTarget: number;

  @ApiProperty({ description: 'Date streak started' })
  @IsDateString()
  startedAt: Date;

  @ApiProperty({ description: 'Date of last activity' })
  @IsDateString()
  lastActivityAt: Date;

  @ApiPropertyOptional({ description: 'Date streak expires' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiProperty({ type: [StreakRewardDto], description: 'Available streak rewards' })
  @ValidateNested({ each: true })
  @Type(() => StreakRewardDto)
  rewards: StreakRewardDto[];

  @ApiProperty({ description: 'Next reward at streak length', minimum: 1 })
  @IsNumber()
  @Min(1)
  nextRewardAt: number;
}

export class StudentLevelDto {
  @ApiProperty({ description: 'Current level number', minimum: 0 })
  @IsNumber()
  @Min(0)
  currentLevel: number;

  @ApiProperty({ description: 'Current XP in this level', minimum: 0 })
  @IsNumber()
  @Min(0)
  currentXP: number;

  @ApiProperty({ description: 'XP needed for next level', minimum: 0 })
  @IsNumber()
  @Min(0)
  xpForNextLevel: number;

  @ApiProperty({ description: 'Total XP required for next level', minimum: 0 })
  @IsNumber()
  @Min(0)
  totalXPRequired: number;

  @ApiProperty({ description: 'Level name' })
  @IsString()
  levelName: string;

  @ApiProperty({ description: 'Level description' })
  @IsString()
  levelDescription: string;

  @ApiProperty({ type: [String], description: 'Benefits unlocked at this level' })
  @IsArray()
  @IsString({ each: true })
  levelBenefits: string[];
}

export class PointsBreakdownDto {
  @ApiProperty({ description: 'Total points', minimum: 0 })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty({ type: [PointsSourceDto], description: 'Point sources' })
  @ValidateNested({ each: true })
  @Type(() => PointsSourceDto)
  sources: PointsSourceDto[];

  @ApiProperty({ type: StudentLevelDto, description: 'Current level information' })
  @ValidateNested()
  @Type(() => StudentLevelDto)
  level: StudentLevelDto;

  @ApiProperty({ description: 'Points from completion activities', minimum: 0 })
  @IsNumber()
  @Min(0)
  completionPoints: number;

  @ApiProperty({ description: 'Points from quality achievements', minimum: 0 })
  @IsNumber()
  @Min(0)
  qualityPoints: number;

  @ApiProperty({ description: 'Points from engagement', minimum: 0 })
  @IsNumber()
  @Min(0)
  engagementPoints: number;

  @ApiProperty({ description: 'Points from improvement', minimum: 0 })
  @IsNumber()
  @Min(0)
  improvementPoints: number;

  @ApiProperty({ description: 'Points from achievements', minimum: 0 })
  @IsNumber()
  @Min(0)
  achievementPoints: number;

  @ApiProperty({ description: 'Bonus points', minimum: 0 })
  @IsNumber()
  @Min(0)
  bonusPoints: number;
}

// =============================================
// Analytics DTOs
// =============================================

export class ProgressInsightDto {
  @ApiProperty({ description: 'Insight ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ enum: ['strength', 'weakness', 'opportunity', 'risk', 'trend'], description: 'Insight type' })
  @IsEnum(['strength', 'weakness', 'opportunity', 'risk', 'trend'])
  type: string;

  @ApiProperty({ description: 'Insight title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Insight description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Related category' })
  @IsString()
  category: string;

  @ApiProperty({ enum: ['low', 'medium', 'high'], description: 'Impact level' })
  @IsEnum(['low', 'medium', 'high'])
  impact: string;

  @ApiProperty({ description: 'Confidence score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ enum: ['low', 'medium', 'high'], description: 'Urgency level' })
  @IsEnum(['low', 'medium', 'high'])
  urgency: string;

  @ApiProperty({ description: 'Supporting metrics' })
  @IsObject()
  supportingMetrics: Record<string, number>;

  @ApiProperty({ type: [String], description: 'Related pattern IDs' })
  @IsArray()
  @IsString({ each: true })
  relatedPatterns: string[];

  @ApiProperty({ description: 'Creation date' })
  @IsDateString()
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Relevance expiry date' })
  @IsOptional()
  @IsDateString()
  relevantUntil?: Date;

  @ApiProperty({ description: 'Whether insight has been acknowledged' })
  @IsBoolean()
  acknowledged: boolean;
}

export class ProgressPredictionDto {
  @ApiProperty({ enum: ['completion_time', 'quality_outcome', 'engagement_risk', 'performance'], description: 'Prediction type' })
  @IsEnum(['completion_time', 'quality_outcome', 'engagement_risk', 'performance'])
  type: string;

  @ApiProperty({ description: 'Prediction text' })
  @IsString()
  prediction: string;

  @ApiProperty({ description: 'Confidence in prediction', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: 'Timeframe for prediction' })
  @IsString()
  timeframe: string;

  @ApiProperty({ description: 'Model type used' })
  @IsString()
  modelType: string;

  @ApiProperty({ type: [String], description: 'Input features used in model' })
  @IsArray()
  @IsString({ each: true })
  inputFeatures: string[];

  @ApiProperty({ description: 'Last model update' })
  @IsDateString()
  lastUpdated: Date;
}

export class PredictiveInterventionDto {
  @ApiProperty({ description: 'Intervention trigger' })
  @IsString()
  trigger: string;

  @ApiProperty({ description: 'Recommended action' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Expected improvement', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  expectedImprovement: number;

  @ApiProperty({ description: 'Confidence in intervention', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

// =============================================
// Main Progress DTO
// =============================================

export class ReflectionProgressDto {
  @ApiProperty({ description: 'Progress tracking ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Debate ID' })
  @IsString()
  @IsUUID()
  debateId: string;

  @ApiProperty({ enum: ProgressTrackingLevel, description: 'Tracking level' })
  @IsEnum(ProgressTrackingLevel)
  trackingLevel: ProgressTrackingLevel;

  @ApiProperty({ type: CompletionMetricsDto, description: 'Completion metrics' })
  @ValidateNested()
  @Type(() => CompletionMetricsDto)
  completion: CompletionMetricsDto;

  @ApiProperty({ type: TimingMetricsDto, description: 'Timing metrics' })
  @ValidateNested()
  @Type(() => TimingMetricsDto)
  timing: TimingMetricsDto;

  @ApiProperty({ type: EngagementMetricsDto, description: 'Engagement metrics' })
  @ValidateNested()
  @Type(() => EngagementMetricsDto)
  engagement: EngagementMetricsDto;

  @ApiProperty({ type: QualityMetricsDto, description: 'Quality metrics' })
  @ValidateNested()
  @Type(() => QualityMetricsDto)
  quality: QualityMetricsDto;

  @ApiProperty({ type: [ProgressInsightDto], description: 'Progress insights' })
  @ValidateNested({ each: true })
  @Type(() => ProgressInsightDto)
  insights: ProgressInsightDto[];

  @ApiProperty({ type: [ProgressPredictionDto], description: 'Progress predictions' })
  @ValidateNested({ each: true })
  @Type(() => ProgressPredictionDto)
  predictions: ProgressPredictionDto[];

  @ApiProperty({ type: [AchievementDto], description: 'User achievements' })
  @ValidateNested({ each: true })
  @Type(() => AchievementDto)
  achievements: AchievementDto[];

  @ApiProperty({ type: [BadgeDto], description: 'User badges' })
  @ValidateNested({ each: true })
  @Type(() => BadgeDto)
  badges: BadgeDto[];

  @ApiProperty({ type: [StreakDto], description: 'User streaks' })
  @ValidateNested({ each: true })
  @Type(() => StreakDto)
  streaks: StreakDto[];

  @ApiProperty({ type: PointsBreakdownDto, description: 'Points breakdown' })
  @ValidateNested()
  @Type(() => PointsBreakdownDto)
  points: PointsBreakdownDto;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: Date;

  @ApiProperty({ description: 'Last activity timestamp' })
  @IsDateString()
  lastActivityAt: Date;

  @ApiProperty({ type: ProgressTrackingConfigurationDto, description: 'Tracking configuration' })
  @ValidateNested()
  @Type(() => ProgressTrackingConfigurationDto)
  configuration: ProgressTrackingConfigurationDto;
}
