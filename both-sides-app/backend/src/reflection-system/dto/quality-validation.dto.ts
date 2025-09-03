/**
 * DTOs for Quality Validation API endpoints
 * Data Transfer Objects for quality scoring, teacher reviews, batch operations,
 * and comprehensive quality control workflows
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
  ArrayMinSize,
  IsUrl
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  QualityScoringOptions,
  ValidationCriterion,
  ValidationStatus,
  QualityValidationMode,
  QualityDimension,
  ImprovementPriority,
  ImprovementRequirement,
  OverallAssessment,
  DimensionReview,
  SpecificFeedback,
  ImprovementResource,
  BatchQualityOptions,
  QualityScore,
  QualityIssueType,
  ReviewerRole,
  CompletionCertificate
} from '../interfaces/quality-validation.interfaces';

// =============================================
// Quality Scoring DTOs
// =============================================

export class QualityScoringOptionsDto {
  @ApiProperty({ description: 'Include detailed dimension breakdown' })
  @IsBoolean()
  includeDimensionBreakdown: boolean;

  @ApiProperty({ description: 'Include scoring evidence' })
  @IsBoolean()
  includeEvidence: boolean;

  @ApiProperty({ description: 'Include improvement suggestions' })
  @IsBoolean()
  includeSuggestions: boolean;

  @ApiProperty({ description: 'Compare to peer performance' })
  @IsBoolean()
  compareToPeers: boolean;

  @ApiProperty({ description: 'Compare to historical performance' })
  @IsBoolean()
  compareToHistory: boolean;

  @ApiProperty({ description: 'Generate completion certificate if qualified' })
  @IsBoolean()
  generateCertificate: boolean;
}

export class ScoreReflectionDto {
  @ApiPropertyOptional({ type: QualityScoringOptionsDto, description: 'Scoring options and preferences' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QualityScoringOptionsDto)
  options?: QualityScoringOptionsDto;
}

export class CriterionRubricLevelDto {
  @ApiProperty({ description: 'Rubric level (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  level: number;

  @ApiProperty({ description: 'Level name (e.g., "Exceptional")' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Level description' })
  @IsString()
  description: string;

  @ApiProperty({ type: [String], description: 'Performance indicators for this level' })
  @IsArray()
  @IsString({ each: true })
  indicators: string[];

  @ApiProperty({ description: 'Score range for this level' })
  @IsObject()
  scoreRange: { min: number; max: number };
}

export class CriterionRubricDto {
  @ApiProperty({ type: [CriterionRubricLevelDto], description: 'Rubric levels' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionRubricLevelDto)
  levels: CriterionRubricLevelDto[];

  @ApiProperty({ description: 'Scoring guide description' })
  @IsString()
  scoringGuide: string;

  @ApiProperty({ type: [Object], description: 'Example responses for each level' })
  @IsArray()
  examples: Array<{
    level: number;
    responseExcerpt: string;
    explanation: string;
  }>;
}

export class ValidationCriterionDto {
  @ApiProperty({ description: 'Criterion ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Criterion name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Criterion description' })
  @IsString()
  @MaxLength(1000)
  description: string;

  @ApiProperty({ 
    enum: ['content', 'structure', 'quality', 'participation', 'timeliness'],
    description: 'Criterion category'
  })
  @IsEnum(['content', 'structure', 'quality', 'participation', 'timeliness'])
  category: string;

  @ApiProperty({ description: 'Weight in overall validation (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number;

  @ApiProperty({ description: 'Minimum score threshold (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold: number;

  @ApiProperty({ description: 'Whether this criterion is mandatory' })
  @IsBoolean()
  mandatory: boolean;

  @ApiPropertyOptional({ type: CriterionRubricDto, description: 'Scoring rubric for this criterion' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CriterionRubricDto)
  rubric?: CriterionRubricDto;
}

export class ValidateCompletionDto {
  @ApiProperty({ type: [ValidationCriterionDto], description: 'Validation criteria to apply' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidationCriterionDto)
  criteria: ValidationCriterionDto[];

  @ApiPropertyOptional({ enum: QualityValidationMode, description: 'Validation mode' })
  @IsOptional()
  @IsEnum(QualityValidationMode)
  validationMode?: QualityValidationMode;

  @ApiPropertyOptional({ description: 'Additional validation options' })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

// =============================================
// Improvement and Feedback DTOs
// =============================================

export class GenerateImprovementSuggestionsDto {
  @ApiPropertyOptional({ type: QualityScoringOptionsDto, description: 'Scoring options for analysis' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QualityScoringOptionsDto)
  scoringOptions?: QualityScoringOptionsDto;

  @ApiPropertyOptional({ description: 'Focus on specific dimensions only' })
  @IsOptional()
  @IsArray()
  @IsEnum(QualityDimension, { each: true })
  focusDimensions?: QualityDimension[];

  @ApiPropertyOptional({ description: 'Maximum number of suggestions to generate', minimum: 1, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxSuggestions?: number;
}

export class DimensionScoreDto {
  @ApiProperty({ description: 'Score for this dimension (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({ description: 'Weight of dimension in overall score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number;

  @ApiProperty({ description: 'Confidence in this score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

export class QualityScoreDto {
  @ApiProperty({ description: 'Overall quality score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  overall: number;

  @ApiProperty({ description: 'Dimension-specific scores' })
  @IsObject()
  dimensions: Record<QualityDimension, DimensionScoreDto>;

  @ApiProperty({ description: 'Overall confidence in scoring (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ enum: ReviewerRole, description: 'Who performed the scoring' })
  @IsEnum(ReviewerRole)
  reviewerRole: ReviewerRole;

  @ApiProperty({ description: 'When the score was generated' })
  @IsDateString()
  timestamp: Date;

  @ApiProperty({ description: 'Scoring algorithm version' })
  @IsString()
  version: string;
}

export class CreateImprovementPlanDto {
  @ApiProperty({ type: [QualityScoreDto], description: 'Historical quality assessments to base plan on' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualityScoreDto)
  assessments: QualityScoreDto[];

  @ApiPropertyOptional({ description: 'Timeline for improvement plan (e.g., "4 weeks")' })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiPropertyOptional({ description: 'Focus on specific priority areas' })
  @IsOptional()
  @IsArray()
  @IsEnum(QualityDimension, { each: true })
  priorityDimensions?: QualityDimension[];

  @ApiPropertyOptional({ description: 'Include personalized resources' })
  @IsOptional()
  @IsBoolean()
  includeResources?: boolean;
}

// =============================================
// Batch Operations DTOs
// =============================================

export class BatchQualityOptionsDto {
  @ApiProperty({ description: 'Enable parallel processing for faster completion' })
  @IsBoolean()
  enableParallelProcessing: boolean;

  @ApiPropertyOptional({ description: 'Maximum concurrent reviews', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxConcurrentReviews?: number;

  @ApiProperty({ description: 'Automatically assign reviewers based on workload' })
  @IsBoolean()
  autoAssignReviewers: boolean;

  @ApiProperty({ description: 'Generate comprehensive reports' })
  @IsBoolean()
  generateReports: boolean;

  @ApiProperty({ description: 'Send notifications upon completion' })
  @IsBoolean()
  notifyOnCompletion: boolean;

  @ApiProperty({ description: 'Include comparative analysis across reflections' })
  @IsBoolean()
  includeComparativeAnalysis: boolean;
}

export class BatchQualityRequestDto {
  @ApiProperty({ type: [String], description: 'Reflection IDs to process', minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  reflectionIds: string[];

  @ApiProperty({ enum: QualityValidationMode, description: 'Validation mode to apply' })
  @IsEnum(QualityValidationMode)
  validationMode: QualityValidationMode;

  @ApiProperty({ enum: ['low', 'medium', 'high'], description: 'Processing priority' })
  @IsEnum(['low', 'medium', 'high'])
  priority: string;

  @ApiPropertyOptional({ description: 'Processing deadline' })
  @IsOptional()
  @IsDateString()
  deadline?: Date;

  @ApiPropertyOptional({ description: 'Assign all reviews to specific teacher' })
  @IsOptional()
  @IsString()
  @IsUUID()
  assignToReviewer?: string;

  @ApiProperty({ type: BatchQualityOptionsDto, description: 'Batch processing options' })
  @ValidateNested()
  @Type(() => BatchQualityOptionsDto)
  options: BatchQualityOptionsDto;
}

export class CompareQualityDto {
  @ApiProperty({ type: [String], description: 'Reflection IDs to compare', minItems: 2, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  reflectionIds: string[];

  @ApiPropertyOptional({ 
    enum: ['peer_group', 'historical', 'cross_class', 'benchmark'],
    description: 'Type of comparison to perform'
  })
  @IsOptional()
  @IsEnum(['peer_group', 'historical', 'cross_class', 'benchmark'])
  comparisonType?: string;

  @ApiPropertyOptional({ description: 'Include detailed insights and recommendations' })
  @IsOptional()
  @IsBoolean()
  includeInsights?: boolean;

  @ApiPropertyOptional({ description: 'Focus comparison on specific dimensions' })
  @IsOptional()
  @IsArray()
  @IsEnum(QualityDimension, { each: true })
  focusDimensions?: QualityDimension[];
}

// =============================================
// Teacher Review DTOs
// =============================================

export class AssignReviewDto {
  @ApiProperty({ description: 'Reflection ID to assign for review' })
  @IsString()
  @IsUUID()
  reflectionId: string;

  @ApiProperty({ description: 'Teacher ID to assign review to' })
  @IsString()
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({ 
    enum: ['low', 'medium', 'high', 'urgent'],
    description: 'Review priority level'
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Optional deadline for review completion' })
  @IsOptional()
  @IsDateString()
  deadline?: Date;

  @ApiPropertyOptional({ description: 'Special instructions for reviewer' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}

export class StartReviewDto {
  @ApiPropertyOptional({ description: 'Expected time to complete review (minutes)' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(180)
  estimatedTime?: number;

  @ApiPropertyOptional({
    enum: ['detailed', 'quick', 'spot_check', 'comprehensive'],
    description: 'Review method to use'
  })
  @IsOptional()
  @IsEnum(['detailed', 'quick', 'spot_check', 'comprehensive'])
  reviewMethod?: string;
}

export class SpecificFeedbackDto {
  @ApiProperty({
    enum: ['praise', 'suggestion', 'concern', 'question'],
    description: 'Type of feedback'
  })
  @IsEnum(['praise', 'suggestion', 'concern', 'question'])
  type: string;

  @ApiProperty({ description: 'Feedback content', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({ description: 'Location in response where feedback applies' })
  @IsOptional()
  @IsObject()
  location?: {
    responseId: string;
    startIndex: number;
    endIndex: number;
    context: string;
  };

  @ApiProperty({ enum: ImprovementPriority, description: 'Priority of this feedback' })
  @IsEnum(ImprovementPriority)
  priority: ImprovementPriority;
}

export class ImprovementResourceDto {
  @ApiProperty({
    enum: ['article', 'video', 'exercise', 'template', 'checklist'],
    description: 'Type of resource'
  })
  @IsEnum(['article', 'video', 'exercise', 'template', 'checklist'])
  type: string;

  @ApiProperty({ description: 'Resource title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Resource description' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ description: 'Resource URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({ description: 'Estimated time to use resource (minutes)', minimum: 1 })
  @IsNumber()
  @Min(1)
  estimatedTime: number;

  @ApiProperty({
    enum: ['beginner', 'intermediate', 'advanced'],
    description: 'Difficulty level'
  })
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  difficulty: string;
}

export class DimensionReviewDto {
  @ApiProperty({ description: 'Dimension score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({
    enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory'],
    description: 'Assessment level'
  })
  @IsEnum(['excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory'])
  assessment: string;

  @ApiProperty({ description: 'General comments for this dimension', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  comments: string;

  @ApiPropertyOptional({ type: [SpecificFeedbackDto], description: 'Specific feedback items' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificFeedbackDto)
  specificFeedback?: SpecificFeedbackDto[];

  @ApiPropertyOptional({ type: [ImprovementResourceDto], description: 'Suggested resources' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImprovementResourceDto)
  suggestedResources?: ImprovementResourceDto[];
}

export class OverallAssessmentDto {
  @ApiProperty({
    enum: ['approve', 'approve_with_suggestions', 'requires_minor_revision', 'requires_major_revision', 'reject'],
    description: 'Review decision'
  })
  @IsEnum(['approve', 'approve_with_suggestions', 'requires_minor_revision', 'requires_major_revision', 'reject'])
  decision: string;

  @ApiProperty({ description: 'Confidence in assessment (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: 'Assessment summary', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  summary: string;

  @ApiProperty({ type: [String], description: 'Identified strengths' })
  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @ApiProperty({ type: [String], description: 'Areas needing improvement' })
  @IsArray()
  @IsString({ each: true })
  areasForImprovement: string[];

  @ApiProperty({ type: [String], description: 'Recommended next steps' })
  @IsArray()
  @IsString({ each: true })
  nextSteps: string[];
}

export class CompleteReviewDto {
  @ApiProperty({ type: OverallAssessmentDto, description: 'Overall assessment of the reflection' })
  @ValidateNested()
  @Type(() => OverallAssessmentDto)
  assessment: OverallAssessmentDto;

  @ApiPropertyOptional({ description: 'Dimension-specific reviews' })
  @IsOptional()
  @IsObject()
  dimensionReviews?: Record<QualityDimension, DimensionReviewDto>;

  @ApiPropertyOptional({ description: 'Public feedback visible to student', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  publicFeedback?: string;

  @ApiPropertyOptional({ description: 'Private notes for teachers only', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  privateFeedback?: string;

  @ApiPropertyOptional({ description: 'Actual time spent reviewing (minutes)', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeSpent?: number;
}

export class ImprovementRequirementDto {
  @ApiProperty({ enum: QualityDimension, description: 'Quality dimension to improve' })
  @IsEnum(QualityDimension)
  dimension: QualityDimension;

  @ApiProperty({ description: 'Current score in this dimension (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  currentScore: number;

  @ApiProperty({ description: 'Required score to meet standards (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  requiredScore: number;

  @ApiProperty({ description: 'Description of what needs improvement', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ type: [Object], description: 'Specific improvement suggestions' })
  @IsOptional()
  @IsArray()
  suggestions?: Array<{
    title: string;
    description: string;
    priority: ImprovementPriority;
  }>;

  @ApiPropertyOptional({ type: [ImprovementResourceDto], description: 'Helpful resources' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImprovementResourceDto)
  resources?: ImprovementResourceDto[];

  @ApiPropertyOptional({ description: 'Timeline for improvement (e.g., "1 week")' })
  @IsOptional()
  @IsString()
  timeline?: string;
}

export class RequestRevisionDto {
  @ApiProperty({ type: [ImprovementRequirementDto], description: 'Specific improvement requirements' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImprovementRequirementDto)
  requirements: ImprovementRequirementDto[];

  @ApiPropertyOptional({ description: 'Additional revision notes', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Deadline for revision submission' })
  @IsOptional()
  @IsDateString()
  revisionDeadline?: Date;
}

export class ApproveReflectionDto {
  @ApiPropertyOptional({ description: 'Generate completion certificate' })
  @IsOptional()
  @IsBoolean()
  generateCertificate?: boolean;

  @ApiPropertyOptional({ description: 'Certificate type if generating' })
  @IsOptional()
  @IsEnum(['participation', 'quality', 'excellence', 'innovation'])
  certificateType?: string;

  @ApiPropertyOptional({ description: 'Special recognition to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialRecognition?: string[];

  @ApiPropertyOptional({ description: 'Approval notes', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Certificate data if pre-generated' })
  @IsOptional()
  @IsObject()
  certificate?: any;
}

export class EscalateReviewDto {
  @ApiProperty({ description: 'Reason for escalation', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({
    enum: ['content_concern', 'quality_issue', 'policy_violation', 'technical_problem', 'other'],
    description: 'Escalation category'
  })
  @IsOptional()
  @IsEnum(['content_concern', 'quality_issue', 'policy_violation', 'technical_problem', 'other'])
  category?: string;

  @ApiPropertyOptional({
    enum: ['low', 'medium', 'high', 'urgent'],
    description: 'Escalation urgency'
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  urgency?: string;

  @ApiPropertyOptional({ description: 'Additional context or evidence' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalContext?: string;
}

// =============================================
// Collaborative Review DTOs
// =============================================

export class AddCollaborativeReviewerDto {
  @ApiProperty({ description: 'Reviewer ID to add as collaborator' })
  @IsString()
  @IsUUID()
  reviewerId: string;

  @ApiPropertyOptional({ description: 'Role of the collaborative reviewer' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Reason for adding collaborator' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class FacilitateDiscussionDto {
  @ApiProperty({ description: 'Discussion message', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    enum: ['comment', 'question', 'suggestion', 'concern', 'agreement', 'disagreement'],
    description: 'Type of message'
  })
  @IsOptional()
  @IsEnum(['comment', 'question', 'suggestion', 'concern', 'agreement', 'disagreement'])
  messageType?: string;

  @ApiPropertyOptional({ description: 'Reference to specific part of reflection' })
  @IsOptional()
  @IsString()
  reference?: string;
}

// =============================================
// Query and Filter DTOs
// =============================================

export class ReviewQueueQueryDto {
  @ApiPropertyOptional({ type: [String], description: 'Filter by priority levels' })
  @IsOptional()
  @IsArray()
  @IsEnum(['low', 'medium', 'high', 'urgent'], { each: true })
  priority?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Filter by review status' })
  @IsOptional()
  @IsArray()
  @IsEnum(ValidationStatus, { each: true })
  status?: ValidationStatus[];

  @ApiPropertyOptional({ description: 'Start date for assigned date range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for assigned date range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: [String], description: 'Filter by specific student IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  studentIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Filter by specific class IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  classIds?: string[];

  @ApiPropertyOptional({
    enum: ['priority', 'assigned_date', 'due_date', 'student_name'],
    description: 'Sort field'
  })
  @IsOptional()
  @IsEnum(['priority', 'assigned_date', 'due_date', 'student_name'])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], description: 'Sort order' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string;

  @ApiPropertyOptional({ description: 'Maximum results to return', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Results offset for pagination', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Time period for analytics (e.g., "30d", "90d", "1y")' })
  @IsOptional()
  @IsString()
  timeframe?: string;

  @ApiPropertyOptional({ description: 'Include detailed breakdowns' })
  @IsOptional()
  @IsBoolean()
  includeDetails?: boolean;

  @ApiPropertyOptional({ description: 'Compare to previous period' })
  @IsOptional()
  @IsBoolean()
  compareToPrevious?: boolean;
}

export class ClassOverviewQueryDto {
  @ApiPropertyOptional({ description: 'Time period for overview data' })
  @IsOptional()
  @IsString()
  timeframe?: string;

  @ApiPropertyOptional({ description: 'Include individual student details' })
  @IsOptional()
  @IsBoolean()
  includeStudentDetails?: boolean;

  @ApiPropertyOptional({ description: 'Include comparative class analysis' })
  @IsOptional()
  @IsBoolean()
  includeComparativeAnalysis?: boolean;

  @ApiPropertyOptional({ description: 'Focus on specific quality dimensions' })
  @IsOptional()
  @IsArray()
  @IsEnum(QualityDimension, { each: true })
  focusDimensions?: QualityDimension[];
}
