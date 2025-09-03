/**
 * Phase 7 Reflection & Learning System - DTO Exports
 * 
 * Comprehensive TypeScript data models and validation schemas for the reflection system.
 * Provides type safety, validation, and serialization utilities for all reflection-related data.
 */

// Reflection Response DTOs
export {
  BaseReflectionDto,
  ReflectionQuestionResponseDto,
  ReflectionResponseDto,
  CreateReflectionDto,
  UpdateReflectionDto,
  SubmitQuestionResponseDto,
  CompleteReflectionDto,
  ReflectionSearchDto,
  PaginatedReflectionsDto,
  ReflectionStatsDto,
} from './reflection-response.dto';

// Learning Metric DTOs
export {
  BaseLearningMetricDto,
  LearningMetricDto,
  CreateLearningMetricDto,
  UpdateLearningMetricDto,
  MetricAggregationDto,
  MetricSearchDto,
  PaginatedMetricsDto,
  LearningProgressDto,
  ClassLearningAnalyticsDto,
} from './learning-metric.dto';

// Reflection Template DTOs
export {
  BaseReflectionTemplateDto,
  ReflectionTemplateDto,
  CreateReflectionTemplateDto,
  UpdateReflectionTemplateDto,
  TemplateSearchDto,
  PaginatedTemplatesDto,
  TemplateAnalyticsDto,
  TemplateRecommendationDto,
} from './reflection-template.dto';

// Debate Analysis DTOs
export {
  DebateParticipantDto,
  DebateMessageDto,
  DebateTopicDto,
  EngagementMetricsDto,
  DebateTranscriptDto,
  ParticipantAnalysisDto,
  LearningInsightDto,
  AnalysisRequestDto,
  AnalysisResultDto,
  BatchAnalysisRequestDto,
  BatchAnalysisStatusDto,
} from './debate-analysis.dto';

// Validation Schemas
export {
  ValidationResult,
  BaseValidationSchema,
  ReflectionDataSchema,
  LearningAnalyticsSchema,
  AIAnalysisResultSchema,
  TemplateValidationSchema,
  ValidationUtils,
} from './validation.schemas';

// Serialization Utilities
export {
  SerializationConfig,
  TransformationResult,
  SerializationUtils,
} from './serialization.utils';

// Type Definitions for enhanced type safety

/**
 * Union type for all reflection-related entity IDs
 */
export type ReflectionEntityId = string;

/**
 * Union type for all reflection statuses
 */
export type ReflectionStatusType = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'INCOMPLETE';

/**
 * Union type for learning metric types
 */
export type LearningMetricTypeEnum = 
  | 'ARGUMENT_QUALITY'
  | 'CRITICAL_THINKING'
  | 'COMMUNICATION_SKILLS'
  | 'EMPATHY'
  | 'ENGAGEMENT'
  | 'KNOWLEDGE_RETENTION'
  | 'POSITION_FLEXIBILITY'
  | 'EVIDENCE_EVALUATION'
  | 'LOGICAL_REASONING'
  | 'ACTIVE_LISTENING';

/**
 * Union type for analysis statuses
 */
export type AnalysisStatusType = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CACHED';

/**
 * Template types for reflection prompts
 */
export type TemplateType = 'post_debate' | 'skill_specific' | 'topic_specific' | 'custom';

/**
 * Question types for reflection templates
 */
export type QuestionType = 'open_ended' | 'rating' | 'multiple_choice' | 'slider' | 'yes_no' | 'ranking';

/**
 * Target audiences for templates
 */
export type TargetAudience = 'student' | 'teacher' | 'mixed';

/**
 * Skill categories for learning analytics
 */
export type SkillCategory = 
  | 'argumentation' 
  | 'evidence' 
  | 'listening' 
  | 'empathy' 
  | 'critical_thinking' 
  | 'communication' 
  | 'reflection';

/**
 * Trend directions for progress analysis
 */
export type TrendDirection = 'improving' | 'declining' | 'stable';

/**
 * Priority levels for recommendations
 */
export type PriorityLevel = 'high' | 'medium' | 'low';

/**
 * Analysis depth levels
 */
export type AnalysisDepth = 'basic' | 'detailed' | 'comprehensive';

/**
 * Batch processing status
 */
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Common interfaces for type safety
 */

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Search criteria interface
 */
export interface SearchCriteria {
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Date range filter interface
 */
export interface DateRangeFilter {
  date_from?: string;
  date_to?: string;
}

/**
 * Score range filter interface
 */
export interface ScoreRangeFilter {
  min_score?: number;
  max_score?: number;
}

/**
 * User context interface
 */
export interface UserContext {
  user_id: string;
  class_id?: string;
  role: 'student' | 'teacher' | 'admin';
}

/**
 * Analysis context interface
 */
export interface AnalysisContext {
  conversation_id: string;
  debate_id?: string;
  class_id?: string;
  analysis_type: string;
  config?: Record<string, any>;
}

/**
 * Processing context interface
 */
export interface ProcessingContext {
  request_id?: string;
  user_context: UserContext;
  analysis_context?: AnalysisContext;
  processing_config?: Record<string, any>;
}

/**
 * Error context interface
 */
export interface ErrorContext {
  operation: string;
  entity_type: string;
  entity_id?: string;
  user_id?: string;
  timestamp: string;
  additional_data?: Record<string, any>;
}

/**
 * Success response interface
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
  };
  metadata?: Record<string, any>;
}

/**
 * API response type union
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Utility types for enhanced type safety
 */

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Extract keys of a type that extend a specific type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Create update type from create type (excludes certain fields)
 */
export type UpdateType<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Create database insert type from DTO (includes database-specific fields)
 */
export type DatabaseInsert<T> = T & {
  created_at?: Date;
  updated_at?: Date;
};

/**
 * Create database model type from DTO (includes all database fields)
 */
export type DatabaseModel<T> = T & BaseEntity;

/**
 * Type guards for runtime type checking
 */

/**
 * Check if response is successful
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Check if response is error
 */
export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
  return response.success === false;
}

/**
 * Check if object is a valid reflection entity
 */
export function isValidReflectionEntity(obj: any): obj is BaseEntity {
  return obj && 
    typeof obj.id === 'string' && 
    typeof obj.created_at === 'string' && 
    typeof obj.updated_at === 'string';
}

/**
 * Check if array is paginated response
 */
export function isPaginatedResponse<T>(obj: any): obj is PaginatedResponse<T> {
  return obj && 
    Array.isArray(obj.data) && 
    typeof obj.total === 'number' && 
    typeof obj.limit === 'number' && 
    typeof obj.offset === 'number' && 
    typeof obj.has_more === 'boolean';
}

/**
 * Constants for default values and limits
 */
export const REFLECTION_CONSTANTS = {
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Validation limits
  MAX_TEMPLATE_NAME_LENGTH: 100,
  MIN_TEMPLATE_NAME_LENGTH: 3,
  MAX_PROMPT_TEXT_LENGTH: 2000,
  MIN_PROMPT_TEXT_LENGTH: 10,
  MAX_RESPONSE_LENGTH: 5000,
  MIN_RESPONSE_LENGTH: 1,
  
  // Scoring ranges
  MIN_QUALITY_SCORE: 0,
  MAX_QUALITY_SCORE: 1,
  MIN_DIFFICULTY_LEVEL: 1,
  MAX_DIFFICULTY_LEVEL: 10,
  MIN_WEIGHT: 0,
  MAX_WEIGHT: 5,
  
  // Time limits
  DEFAULT_CACHE_TTL_SECONDS: 3600,
  MAX_PROCESSING_TIME_MS: 300000, // 5 minutes
  
  // Analysis configuration
  MIN_MESSAGE_COUNT_FOR_ANALYSIS: 4,
  MIN_SUBSTANTIAL_MESSAGE_COUNT: 10,
  MAX_ANALYSIS_BATCH_SIZE: 50,
} as const;

/**
 * Type for reflection system constants
 */
export type ReflectionConstants = typeof REFLECTION_CONSTANTS;
