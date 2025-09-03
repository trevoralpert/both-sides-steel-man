/**
 * DTOs for Reflection Response Collection API endpoints
 * Defines request/response data structures for session management,
 * response collection, media uploads, and batch operations
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
  IsUUID,
  IsEmail,
  IsUrl,
  IsPositive,
  MaxLength,
  MinLength,
  IsIn,
  IsJSON
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ResponseType,
  ResponseStatus,
  MediaType,
  SessionState,
  ValidationLevel,
  ResponseContent,
  SessionMetadata,
  SessionPreferences,
  MediaMetadata,
  ExportFilters,
  ReportOptions,
  DateRange,
  TextResponse,
  RatingResponse,
  MultipleChoiceResponse,
  MediaResponse,
  TextFormatting,
  GeolocationData,
  DeviceInfo,
  ValidationResult
} from '../interfaces/reflection-response.interfaces';
import { PromptCategory } from '../interfaces/prompt.interfaces';
import { ReflectionStatus } from '@prisma/client';

// =============================================
// Session Management DTOs
// =============================================

export class SessionPreferencesDto {
  @ApiProperty({ description: 'Enable push notifications' })
  @IsBoolean()
  enableNotifications: boolean;

  @ApiProperty({ description: 'Automatically advance to next question' })
  @IsBoolean()
  autoAdvance: boolean;

  @ApiProperty({ description: 'Show progress indicator' })
  @IsBoolean()
  showProgress: boolean;

  @ApiProperty({ description: 'Allow skipping questions' })
  @IsBoolean()
  allowSkipping: boolean;

  @ApiProperty({ enum: ['small', 'medium', 'large'], description: 'Preferred font size' })
  @IsEnum(['small', 'medium', 'large'])
  preferredFontSize: string;

  @ApiProperty({ description: 'Enable high contrast mode' })
  @IsBoolean()
  highContrast: boolean;

  @ApiProperty({ description: 'Reduce motion and animations' })
  @IsBoolean()
  reducedMotion: boolean;
}

export class SessionMetadataDto {
  @ApiProperty({ description: 'User agent string' })
  @IsString()
  userAgent: string;

  @ApiPropertyOptional({ description: 'Client IP address (server-populated)' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'Client timezone' })
  @IsString()
  timezone: string;

  @ApiProperty({ description: 'UI language code' })
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  language: string;

  @ApiProperty({ enum: ['desktop', 'tablet', 'mobile'], description: 'Device type' })
  @IsEnum(['desktop', 'tablet', 'mobile'])
  deviceType: string;

  @ApiProperty({ description: 'Auto-save enabled' })
  @IsBoolean()
  autoSaveEnabled: boolean;

  @ApiProperty({ enum: ValidationLevel, description: 'Quality validation target' })
  @IsEnum(ValidationLevel)
  qualityTarget: ValidationLevel;

  @ApiProperty({ enum: MediaType, isArray: true, description: 'Allowed media types for uploads' })
  @IsArray()
  @IsEnum(MediaType, { each: true })
  allowedMediaTypes: MediaType[];

  @ApiProperty({ description: 'Maximum file size in bytes', minimum: 1024, maximum: 52428800 })
  @IsNumber()
  @Min(1024)
  @Max(52428800)
  maxFileSize: number;

  @ApiProperty({ type: SessionPreferencesDto, description: 'User session preferences' })
  @ValidateNested()
  @Type(() => SessionPreferencesDto)
  sessionPreferences: SessionPreferencesDto;
}

export class InitializeSessionDto {
  @ApiProperty({ description: 'Debate ID to create reflection session for' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  debateId: string;

  @ApiProperty({ description: 'Prompt sequence ID for this session' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  promptSequenceId: string;

  @ApiPropertyOptional({ type: SessionMetadataDto, description: 'Session metadata and preferences' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SessionMetadataDto)
  metadata?: SessionMetadataDto;
}

// =============================================
// Response Content DTOs
// =============================================

export class TextFormattingDto {
  @ApiPropertyOptional({ type: [[Number]], description: 'Bold text ranges [start, end]' })
  @IsOptional()
  @IsArray()
  bold?: number[][];

  @ApiPropertyOptional({ type: [[Number]], description: 'Italic text ranges [start, end]' })
  @IsOptional()
  @IsArray()
  italic?: number[][];

  @ApiPropertyOptional({ type: [[Number]], description: 'Underlined text ranges [start, end]' })
  @IsOptional()
  @IsArray()
  underline?: number[][];

  @ApiPropertyOptional({ description: 'Hyperlinks with positions and URLs' })
  @IsOptional()
  @IsArray()
  links?: Array<{
    start: number;
    end: number;
    url: string;
    title?: string;
  }>;
}

export class TextResponseDto {
  @ApiProperty({ description: 'Response text content', maxLength: 10000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  text: string;

  @ApiProperty({ description: 'Word count', minimum: 1 })
  @IsNumber()
  @IsPositive()
  wordCount: number;

  @ApiProperty({ description: 'Whether text contains rich formatting' })
  @IsBoolean()
  isRichText: boolean;

  @ApiPropertyOptional({ type: TextFormattingDto, description: 'Rich text formatting information' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TextFormattingDto)
  formatting?: TextFormattingDto;
}

export class RatingResponseDto {
  @ApiProperty({ description: 'Rating value', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  value: number;

  @ApiProperty({ description: 'Rating scale configuration' })
  @IsObject()
  scale: {
    min: number;
    max: number;
    step: number;
  };

  @ApiPropertyOptional({ description: 'Label for this rating' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Confidence in rating (0-1)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class MultipleChoiceResponseDto {
  @ApiProperty({ type: [String], description: 'Selected option IDs', minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selectedOptions: string[];

  @ApiProperty({ description: 'Whether multiple selections are allowed' })
  @IsBoolean()
  allowMultiple: boolean;

  @ApiPropertyOptional({ description: 'Custom response text for "Other" option' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customResponse?: string;

  @ApiPropertyOptional({ type: [Number], description: 'Order in which options were selected' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  selectionOrder?: number[];
}

export class RankingItemDto {
  @ApiProperty({ description: 'Item identifier' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Rank position (1-based)', minimum: 1 })
  @IsNumber()
  @IsPositive()
  rank: number;

  @ApiPropertyOptional({ description: 'Reasoning for this ranking' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasoning?: string;
}

export class RankingResponseDto {
  @ApiProperty({ type: [RankingItemDto], description: 'Item rankings', minItems: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RankingItemDto)
  rankings: RankingItemDto[];

  @ApiPropertyOptional({ description: 'Methodology used for ranking' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  methodology?: string;

  @ApiPropertyOptional({ description: 'Confidence in ranking (0-1)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class MediaAttachmentDto {
  @ApiProperty({ description: 'Attachment ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Original filename' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes', minimum: 1 })
  @IsNumber()
  @IsPositive()
  size: number;

  @ApiPropertyOptional({ description: 'Public URL (if available)' })
  @IsOptional()
  @IsUrl()
  url?: string;
}

export class MediaResponseDto {
  @ApiProperty({ type: [MediaAttachmentDto], description: 'Attached media files', minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  attachments: MediaAttachmentDto[];

  @ApiPropertyOptional({ description: 'Description of the media content' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Transcription for audio/video content' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  transcription?: string;
}

export class ResponseContentDto {
  @ApiProperty({ enum: ResponseType, description: 'Type of response' })
  @IsEnum(ResponseType)
  type: ResponseType;

  @ApiProperty({ description: 'Response data (structure varies by type)' })
  @IsObject()
  data: TextResponseDto | RatingResponseDto | MultipleChoiceResponseDto | RankingResponseDto | MediaResponseDto;

  @ApiPropertyOptional({ description: 'Additional metadata about the response' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// =============================================
// Main Request DTOs
// =============================================

export class SaveResponseDto {
  @ApiProperty({ description: 'Prompt ID this response is for' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  promptId: string;

  @ApiProperty({ type: ResponseContentDto, description: 'Response content and data' })
  @ValidateNested()
  @Type(() => ResponseContentDto)
  response: ResponseContentDto;
}

export class UpdateResponseDto {
  @ApiProperty({ description: 'Partial updates to apply to the response' })
  @IsObject()
  updates: Partial<ResponseContent>;
}

// =============================================
// Media Upload DTOs
// =============================================

export class GeolocationDto {
  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Accuracy in meters', minimum: 0 })
  @IsNumber()
  @Min(0)
  accuracy: number;
}

export class DeviceInfoDto {
  @ApiProperty({ description: 'User agent string' })
  @IsString()
  userAgent: string;

  @ApiProperty({ description: 'Platform/OS information' })
  @IsString()
  platform: string;

  @ApiPropertyOptional({ description: 'Screen resolution' })
  @IsOptional()
  @IsString()
  screenResolution?: string;
}

export class MediaMetadataDto {
  @ApiProperty({ description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({ 
    enum: ['direct', 'drag_drop', 'paste', 'camera', 'microphone'],
    description: 'Source of the upload'
  })
  @IsEnum(['direct', 'drag_drop', 'paste', 'camera', 'microphone'])
  uploadSource: string;

  @ApiPropertyOptional({ description: 'Image/video dimensions' })
  @IsOptional()
  @IsObject()
  dimensions?: {
    width: number;
    height: number;
  };

  @ApiPropertyOptional({ description: 'Audio/video duration in seconds', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ type: GeolocationDto, description: 'Location where media was captured' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeolocationDto)
  location?: GeolocationDto;

  @ApiPropertyOptional({ type: DeviceInfoDto, description: 'Device information' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}

export class UploadMediaDto {
  @ApiProperty({ description: 'File name', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes', minimum: 1, maximum: 52428800 })
  @IsNumber()
  @Min(1)
  @Max(52428800) // 50MB
  size: number;

  @ApiPropertyOptional({ type: MediaMetadataDto, description: 'Additional media metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaMetadataDto)
  metadata?: MediaMetadataDto;
}

// =============================================
// Batch Operations DTOs
// =============================================

export class DateRangeDto {
  @ApiProperty({ description: 'Start date (ISO string)' })
  @IsDateString()
  start: Date;

  @ApiProperty({ description: 'End date (ISO string)' })
  @IsDateString()
  end: Date;
}

export class ExportFiltersDto {
  @ApiPropertyOptional({ enum: PromptCategory, isArray: true, description: 'Filter by prompt categories' })
  @IsOptional()
  @IsArray()
  @IsEnum(PromptCategory, { each: true })
  categories?: PromptCategory[];

  @ApiPropertyOptional({ enum: ReflectionStatus, isArray: true, description: 'Filter by completion status' })
  @IsOptional()
  @IsArray()
  @IsEnum(ReflectionStatus, { each: true })
  completionStatus?: ReflectionStatus[];

  @ApiPropertyOptional({ description: 'Minimum quality threshold (0-1)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  qualityThreshold?: number;

  @ApiPropertyOptional({ enum: ResponseType, isArray: true, description: 'Filter by response types' })
  @IsOptional()
  @IsArray()
  @IsEnum(ResponseType, { each: true })
  responseTypes?: ResponseType[];

  @ApiPropertyOptional({ description: 'Include incomplete reflections' })
  @IsOptional()
  @IsBoolean()
  includeIncomplete?: boolean;
}

export class ExportReflectionsDto {
  @ApiPropertyOptional({ description: 'Filter by class ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ description: 'Filter by debate ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  debateId?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ type: DateRangeDto, description: 'Filter by date range' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiProperty({ enum: ['json', 'csv', 'xlsx', 'pdf'], description: 'Export format' })
  @IsEnum(['json', 'csv', 'xlsx', 'pdf'])
  format: string;

  @ApiProperty({ description: 'Include media files in export' })
  @IsBoolean()
  includeMedia: boolean;

  @ApiProperty({ description: 'Anonymize exported data' })
  @IsBoolean()
  anonymize: boolean;

  @ApiPropertyOptional({ type: ExportFiltersDto, description: 'Additional filters' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExportFiltersDto)
  filters?: ExportFiltersDto;
}

export class AnalyzeClassDto {
  @ApiProperty({ description: 'Class ID to analyze' })
  @IsString()
  @IsUUID()
  classId: string;

  @ApiPropertyOptional({ type: ExportFiltersDto, description: 'Analysis filters' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExportFiltersDto)
  filters?: ExportFiltersDto;
}

export class ReportOptionsDto {
  @ApiProperty({ description: 'Include charts in report' })
  @IsBoolean()
  includeCharts: boolean;

  @ApiProperty({ description: 'Include recommendations' })
  @IsBoolean()
  includeRecommendations: boolean;

  @ApiProperty({ description: 'Anonymize student data' })
  @IsBoolean()
  anonymize: boolean;

  @ApiProperty({ description: 'Report language', default: 'en' })
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  language: string;

  @ApiProperty({ enum: ['pdf', 'html', 'docx'], description: 'Report format' })
  @IsEnum(['pdf', 'html', 'docx'])
  format: string;
}

export class GenerateReportDto {
  @ApiProperty({ description: 'Class ID to generate report for' })
  @IsString()
  @IsUUID()
  classId: string;

  @ApiProperty({ type: ReportOptionsDto, description: 'Report generation options' })
  @ValidateNested()
  @Type(() => ReportOptionsDto)
  options: ReportOptionsDto;
}

// =============================================
// Response DTOs
// =============================================

export class ValidationCheckDto {
  @ApiProperty({ description: 'Type of validation check' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Whether the check passed' })
  @IsBoolean()
  passed: boolean;

  @ApiProperty({ description: 'Check score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({ description: 'Check result message' })
  @IsString()
  message: string;

  @ApiProperty({ enum: ['info', 'warning', 'error', 'critical'], description: 'Severity level' })
  @IsEnum(['info', 'warning', 'error', 'critical'])
  severity: string;

  @ApiPropertyOptional({ description: 'Additional check details' })
  @IsOptional()
  details?: any;
}

export class ValidationSuggestionDto {
  @ApiProperty({ description: 'Type of suggestion' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Suggestion message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Example of improvement' })
  @IsOptional()
  @IsString()
  example?: string;

  @ApiProperty({ enum: ['low', 'medium', 'high'], description: 'Suggestion priority' })
  @IsEnum(['low', 'medium', 'high'])
  priority: string;
}

export class AutoCorrectionDto {
  @ApiProperty({ description: 'Type of correction applied' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Original text' })
  @IsString()
  original: string;

  @ApiProperty({ description: 'Corrected text' })
  @IsString()
  corrected: string;

  @ApiProperty({ description: 'Confidence in correction (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: 'Whether correction was applied' })
  @IsBoolean()
  applied: boolean;
}

export class ValidationResultDto {
  @ApiProperty({ description: 'Overall validation result' })
  @IsBoolean()
  isValid: boolean;

  @ApiProperty({ description: 'Overall validation score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({ enum: ValidationLevel, description: 'Validation level applied' })
  @IsEnum(ValidationLevel)
  level: ValidationLevel;

  @ApiProperty({ type: [ValidationCheckDto], description: 'Individual validation checks' })
  @ValidateNested({ each: true })
  @Type(() => ValidationCheckDto)
  checks: ValidationCheckDto[];

  @ApiProperty({ type: [ValidationSuggestionDto], description: 'Improvement suggestions' })
  @ValidateNested({ each: true })
  @Type(() => ValidationSuggestionDto)
  suggestions: ValidationSuggestionDto[];

  @ApiProperty({ type: [AutoCorrectionDto], description: 'Auto-corrections applied' })
  @ValidateNested({ each: true })
  @Type(() => AutoCorrectionDto)
  autoCorrections: AutoCorrectionDto[];
}

// =============================================
// Progress Tracking DTOs
// =============================================

export class ProgressQualityDto {
  @ApiProperty({ description: 'Average response quality score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  averageResponseQuality: number;

  @ApiProperty({ description: 'Thoughtfulness score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  thoughtfulnessScore: number;

  @ApiProperty({ description: 'Response depth score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  depthScore: number;

  @ApiProperty({ description: 'Consistency score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  consistencyScore: number;

  @ApiProperty({ enum: ['improving', 'stable', 'declining'], description: 'Improvement trend' })
  @IsEnum(['improving', 'stable', 'declining'])
  improvementTrend: string;
}

export class EngagementMetricsDto {
  @ApiProperty({ description: 'Response completion rate (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  responseRate: number;

  @ApiProperty({ description: 'Average response time in seconds', minimum: 0 })
  @IsNumber()
  @Min(0)
  averageResponseTime: number;

  @ApiProperty({ description: 'Skip rate (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  skipRate: number;

  @ApiProperty({ description: 'Number of response revisions', minimum: 0 })
  @IsNumber()
  @Min(0)
  revisionCount: number;

  @ApiProperty({ description: 'Media usage rate (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  mediaUsage: number;

  @ApiProperty({ description: 'Attention score based on interaction patterns (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  attentionScore: number;
}

export class ProgressMilestoneDto {
  @ApiProperty({ description: 'Milestone ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Milestone name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Milestone description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Whether milestone was achieved' })
  @IsBoolean()
  achieved: boolean;

  @ApiPropertyOptional({ description: 'When milestone was achieved' })
  @IsOptional()
  @IsDateString()
  achievedAt?: Date;

  @ApiProperty({ description: 'Milestone value/score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  value: number;
}

export class ReflectionProgressDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Completion percentage (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  completionPercentage: number;

  @ApiProperty({ description: 'Current step number', minimum: 0 })
  @IsNumber()
  @Min(0)
  currentStep: number;

  @ApiProperty({ description: 'Total number of steps', minimum: 1 })
  @IsNumber()
  @Min(1)
  totalSteps: number;

  @ApiProperty({ description: 'Time spent in seconds', minimum: 0 })
  @IsNumber()
  @Min(0)
  timeSpent: number;

  @ApiProperty({ description: 'Estimated time remaining in seconds', minimum: 0 })
  @IsNumber()
  @Min(0)
  estimatedTimeRemaining: number;

  @ApiProperty({ type: ProgressQualityDto, description: 'Quality metrics' })
  @ValidateNested()
  @Type(() => ProgressQualityDto)
  quality: ProgressQualityDto;

  @ApiProperty({ type: EngagementMetricsDto, description: 'Engagement metrics' })
  @ValidateNested()
  @Type(() => EngagementMetricsDto)
  engagement: EngagementMetricsDto;

  @ApiProperty({ type: [ProgressMilestoneDto], description: 'Achievement milestones' })
  @ValidateNested({ each: true })
  @Type(() => ProgressMilestoneDto)
  milestones: ProgressMilestoneDto[];
}