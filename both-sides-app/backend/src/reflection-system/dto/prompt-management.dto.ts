/**
 * DTOs for Prompt Management API endpoints
 * Defines request/response data structures for reflection prompt operations
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
  ArrayMinSize,
  IsUUID
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PromptCategory,
  QuestionType,
  PromptDifficulty,
  AgeGroup,
  Language,
  AccessibilityFeature,
  QuestionOptions,
  EducationalObjective,
  DebatePerformanceContext,
  UserContextProfile,
  SessionPreferences,
  PreviousReflectionSummary,
  PromptMetadata,
  TemplateFilters
} from '../interfaces/prompt.interfaces';

// =============================================
// User Profile DTOs
// =============================================

export class BeliefProfileDto {
  @ApiProperty({ description: 'Ideology scores across different dimensions' })
  @IsObject()
  ideologyScores: Record<string, number>;

  @ApiProperty({ description: 'Opinion plasticity score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  plasticityScore: number;

  @ApiProperty({ description: 'Confidence level (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceLevel: number;
}

export class AccessibilityFeatureDto {
  @ApiProperty({ enum: ['screen_reader', 'large_text', 'simplified_language', 'visual_cues'] })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Whether this feature is enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Additional configuration for the feature' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}

export class UserContextProfileDto {
  @ApiProperty({ enum: AgeGroup, description: 'User age group' })
  @IsEnum(AgeGroup)
  ageGroup: AgeGroup;

  @ApiProperty({ enum: PromptDifficulty, description: 'User experience level' })
  @IsEnum(PromptDifficulty)
  experienceLevel: PromptDifficulty;

  @ApiProperty({ enum: Language, description: 'Preferred language' })
  @IsEnum(Language)
  preferredLanguage: Language;

  @ApiProperty({ type: BeliefProfileDto, description: 'User belief and ideology profile' })
  @ValidateNested()
  @Type(() => BeliefProfileDto)
  beliefProfile: BeliefProfileDto;

  @ApiProperty({ type: [String], description: 'User learning goals' })
  @IsArray()
  @IsString({ each: true })
  learningGoals: string[];

  @ApiProperty({ type: [AccessibilityFeatureDto], description: 'Accessibility requirements' })
  @ValidateNested({ each: true })
  @Type(() => AccessibilityFeatureDto)
  accessibilityNeeds: AccessibilityFeatureDto[];
}

// =============================================
// Debate Performance DTOs
// =============================================

export class DebateKeyMomentDto {
  @ApiProperty({ description: 'Timestamp of the moment' })
  @IsDateString()
  timestamp: Date;

  @ApiProperty({ 
    enum: ['strong_argument', 'weak_argument', 'good_listening', 'emotional_moment', 'perspective_shift'],
    description: 'Type of key moment'
  })
  @IsEnum(['strong_argument', 'weak_argument', 'good_listening', 'emotional_moment', 'perspective_shift'])
  type: string;

  @ApiProperty({ description: 'Description of the moment' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ['positive', 'negative', 'neutral'], description: 'Impact of the moment' })
  @IsEnum(['positive', 'negative', 'neutral'])
  impact: string;
}

export class DebatePerformanceContextDto {
  @ApiProperty({ description: 'Participation score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  participationScore: number;

  @ApiProperty({ description: 'Argument quality score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  argumentQualityScore: number;

  @ApiProperty({ description: 'Listening skill score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  listeningScore: number;

  @ApiProperty({ description: 'Evidence usage score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  evidenceUsageScore: number;

  @ApiProperty({ description: 'Emotional regulation score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  emotionalRegulationScore: number;

  @ApiProperty({ description: 'Perspective taking score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  perspectiveTakingScore: number;

  @ApiProperty({ type: [String], description: 'Identified strengths' })
  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @ApiProperty({ type: [String], description: 'Areas for improvement' })
  @IsArray()
  @IsString({ each: true })
  improvementAreas: string[];

  @ApiProperty({ type: [DebateKeyMomentDto], description: 'Key moments from the debate' })
  @ValidateNested({ each: true })
  @Type(() => DebateKeyMomentDto)
  keyMoments: DebateKeyMomentDto[];
}

// =============================================
// Session and Educational DTOs
// =============================================

export class EducationalObjectiveDto {
  @ApiProperty({ description: 'Unique identifier for the objective' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ enum: PromptCategory, description: 'Category this objective relates to' })
  @IsEnum(PromptCategory)
  category: PromptCategory;

  @ApiProperty({ description: 'Description of the objective' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Target learning metric' })
  @IsString()
  targetMetric: string;

  @ApiProperty({ enum: ['high', 'medium', 'low'], description: 'Priority level' })
  @IsEnum(['high', 'medium', 'low'])
  priority: string;

  @ApiPropertyOptional({ description: 'Deadline for achieving objective' })
  @IsOptional()
  @IsDateString()
  deadline?: Date;
}

export class SessionPreferencesDto {
  @ApiProperty({ description: 'Maximum number of questions', minimum: 1, maximum: 50 })
  @IsNumber()
  @Min(1)
  @Max(50)
  maxQuestions: number;

  @ApiProperty({ description: 'Estimated time in minutes', minimum: 5, maximum: 120 })
  @IsNumber()
  @Min(5)
  @Max(120)
  estimatedTimeMinutes: number;

  @ApiProperty({ enum: QuestionType, isArray: true, description: 'Preferred question types' })
  @IsArray()
  @IsEnum(QuestionType, { each: true })
  preferredQuestionTypes: QuestionType[];

  @ApiPropertyOptional({ enum: PromptCategory, isArray: true, description: 'Categories to avoid' })
  @IsOptional()
  @IsArray()
  @IsEnum(PromptCategory, { each: true })
  avoidCategories?: PromptCategory[];

  @ApiProperty({ description: 'Whether to include gamification elements' })
  @IsBoolean()
  includeGameification: boolean;

  @ApiProperty({ description: 'Whether to allow skipping questions' })
  @IsBoolean()
  allowSkipping: boolean;
}

export class PreviousReflectionSummaryDto {
  @ApiProperty({ description: 'Previous reflection ID' })
  @IsString()
  @IsNotEmpty()
  reflectionId: string;

  @ApiProperty({ description: 'When the reflection was completed' })
  @IsDateString()
  completedAt: Date;

  @ApiProperty({ enum: PromptCategory, isArray: true, description: 'Categories covered' })
  @IsArray()
  @IsEnum(PromptCategory, { each: true })
  categories: PromptCategory[];

  @ApiProperty({ description: 'Engagement score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  engagementScore: number;

  @ApiProperty({ description: 'Quality score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  qualityScore: number;

  @ApiProperty({ description: 'Time spent in minutes', minimum: 0 })
  @IsNumber()
  @Min(0)
  timeSpent: number;

  @ApiProperty({ type: [String], description: 'Identified patterns' })
  @IsArray()
  @IsString({ each: true })
  patterns: string[];
}

// =============================================
// Main Request DTOs
// =============================================

export class GeneratePromptSequenceDto {
  @ApiProperty({ description: 'Debate ID for which to generate prompts' })
  @IsString()
  @IsNotEmpty()
  debateId: string;

  @ApiPropertyOptional({ type: UserContextProfileDto, description: 'User profile context' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserContextProfileDto)
  userProfile?: UserContextProfileDto;

  @ApiProperty({ type: DebatePerformanceContextDto, description: 'Debate performance data' })
  @ValidateNested()
  @Type(() => DebatePerformanceContextDto)
  debatePerformance: DebatePerformanceContextDto;

  @ApiPropertyOptional({ type: [EducationalObjectiveDto], description: 'Educational objectives' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationalObjectiveDto)
  educationalObjectives?: EducationalObjectiveDto[];

  @ApiPropertyOptional({ type: SessionPreferencesDto, description: 'Session preferences' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SessionPreferencesDto)
  sessionPreferences?: SessionPreferencesDto;

  @ApiPropertyOptional({ type: [PreviousReflectionSummaryDto], description: 'Previous reflection history' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviousReflectionSummaryDto)
  previousReflections?: PreviousReflectionSummaryDto[];
}

export class GetNextPromptDto {
  @ApiProperty({ description: 'Prompt sequence ID' })
  @IsString()
  @IsNotEmpty()
  sequenceId: string;

  @ApiPropertyOptional({ description: 'Current prompt ID (if any)' })
  @IsOptional()
  @IsString()
  currentPromptId?: string;
}

export class AdaptPromptDto {
  @ApiProperty({ description: 'ID of the prompt being responded to' })
  @IsString()
  @IsNotEmpty()
  promptId: string;

  @ApiProperty({ description: 'User response to the prompt' })
  @IsObject()
  response: any;
}

// =============================================
// Template Management DTOs
// =============================================

export class QuestionOptionsDto {
  @ApiPropertyOptional({ description: 'Rating scale configuration' })
  @IsOptional()
  @IsObject()
  ratingScale?: {
    min: number;
    max: number;
    labels?: Record<number, string>;
    step?: number;
  };

  @ApiPropertyOptional({ description: 'Multiple choice configuration' })
  @IsOptional()
  @IsObject()
  multipleChoice?: {
    options: Array<{ id: string; text: string; value: string }>;
    allowMultiple: boolean;
    randomizeOrder: boolean;
  };

  @ApiPropertyOptional({ description: 'Open ended question configuration' })
  @IsOptional()
  @IsObject()
  openEnded?: {
    minLength: number;
    maxLength: number;
    placeholder?: string;
    suggestedWordCount?: number;
  };

  @ApiPropertyOptional({ description: 'Likert scale configuration' })
  @IsOptional()
  @IsObject()
  likertScale?: {
    levels: number;
    leftLabel: string;
    rightLabel: string;
    neutralOption?: boolean;
  };
}

export class PromptMetadataDto {
  @ApiProperty({ description: 'Estimated time in minutes', minimum: 1, maximum: 60 })
  @IsNumber()
  @Min(1)
  @Max(60)
  estimatedTimeMinutes: number;

  @ApiProperty({ type: [String], description: 'Skills this prompt focuses on' })
  @IsArray()
  @IsString({ each: true })
  skillFocus: string[];

  @ApiPropertyOptional({ type: [String], description: 'Prerequisites for this prompt' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Suggested follow-up prompts' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  followUpPrompts?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Success metrics to track' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  successMetrics?: string[];

  @ApiPropertyOptional({ type: [AccessibilityFeatureDto], description: 'Accessibility features' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AccessibilityFeatureDto)
  accessibilityFeatures?: AccessibilityFeatureDto[];

  @ApiPropertyOptional({ description: 'A/B test group identifier' })
  @IsOptional()
  @IsString()
  abTestGroup?: string;
}

export class CreatePromptTemplateDto {
  @ApiProperty({ enum: PromptCategory, description: 'Template category' })
  @IsEnum(PromptCategory)
  templateType: PromptCategory;

  @ApiProperty({ enum: QuestionType, description: 'Type of question' })
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ApiProperty({ description: 'Main prompt text', minLength: 10, maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  promptText: string;

  @ApiPropertyOptional({ description: 'Localized versions of prompt text' })
  @IsOptional()
  @IsObject()
  promptTextLocalized?: Record<Language, string>;

  @ApiProperty({ enum: AgeGroup, description: 'Target age group' })
  @IsEnum(AgeGroup)
  targetAudience: AgeGroup;

  @ApiProperty({ enum: PromptDifficulty, description: 'Difficulty level' })
  @IsEnum(PromptDifficulty)
  difficultyLevel: PromptDifficulty;

  @ApiProperty({ description: 'Whether template is active', default: true })
  @IsBoolean()
  isActive: boolean = true;

  @ApiProperty({ description: 'Template version', default: '1.0.0' })
  @IsString()
  version: string = '1.0.0';

  @ApiProperty({ type: PromptMetadataDto, description: 'Template metadata' })
  @ValidateNested()
  @Type(() => PromptMetadataDto)
  metadata: PromptMetadataDto;
}

export class UpdatePromptTemplateDto {
  @ApiPropertyOptional({ enum: PromptCategory })
  @IsOptional()
  @IsEnum(PromptCategory)
  templateType?: PromptCategory;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional({ minLength: 10, maxLength: 2000 })
  @IsOptional()
  @IsString()
  promptText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  promptTextLocalized?: Record<Language, string>;

  @ApiPropertyOptional({ enum: AgeGroup })
  @IsOptional()
  @IsEnum(AgeGroup)
  targetAudience?: AgeGroup;

  @ApiPropertyOptional({ enum: PromptDifficulty })
  @IsOptional()
  @IsEnum(PromptDifficulty)
  difficultyLevel?: PromptDifficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: PromptMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PromptMetadataDto)
  metadata?: PromptMetadataDto;
}

export class TemplateFiltersDto {
  @ApiPropertyOptional({ enum: AgeGroup })
  @IsOptional()
  @IsEnum(AgeGroup)
  ageGroup?: AgeGroup;

  @ApiPropertyOptional({ enum: PromptDifficulty })
  @IsOptional()
  @IsEnum(PromptDifficulty)
  difficulty?: PromptDifficulty;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional({ enum: Language })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abTestGroup?: string;
}

// =============================================
// A/B Testing DTOs
// =============================================

export class ABTestConfigurationDto {
  @ApiProperty({ description: 'Name of the A/B test' })
  @IsString()
  @IsNotEmpty()
  testName: string;

  @ApiProperty({ type: [CreatePromptTemplateDto], description: 'Template variants to test', minItems: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreatePromptTemplateDto)
  variants: CreatePromptTemplateDto[];

  @ApiProperty({ description: 'Traffic split between variants (must sum to 1.0)' })
  @IsObject()
  trafficSplit: Record<string, number>;

  @ApiProperty({ description: 'Primary success metric' })
  @IsString()
  @IsNotEmpty()
  successMetric: string;

  @ApiProperty({ description: 'Test duration in days', minimum: 7, maximum: 90 })
  @IsNumber()
  @Min(7)
  @Max(90)
  duration: number;

  @ApiPropertyOptional({ type: TemplateFiltersDto, description: 'Target audience filters' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateFiltersDto)
  targetAudience?: TemplateFiltersDto;
}

// =============================================
// Analytics DTOs
// =============================================

export class AnalyticsQueryDto {
  @ApiProperty({ description: 'Start date for analytics period' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date for analytics period' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Additional filters' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

// =============================================
// Response DTOs
// =============================================

export class PersonalizationScoreDto {
  @ApiProperty({ description: 'Personalized prompt text' })
  @IsString()
  personalizedText: string;

  @ApiProperty({ description: 'Personalization fit score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  personalizationScore: number;

  @ApiPropertyOptional({ type: [String], description: 'Applied personalizations' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliedPersonalizations?: string[];
}
