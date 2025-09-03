import { 
  IsString, 
  IsUUID, 
  IsOptional, 
  IsObject, 
  IsEnum, 
  IsInt, 
  IsNumber, 
  IsArray, 
  IsBoolean,
  ValidateNested, 
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus, DebatePhase, AnalysisStatus } from '@prisma/client';

/**
 * Participant information DTO
 */
export class DebateParticipantDto {
  @ApiProperty({ description: 'Participant user ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiProperty({ description: 'Role in debate (student1 or student2)' })
  @IsString()
  role: string;

  @ApiPropertyOptional({ description: 'Debate position (PRO or CON)' })
  @IsOptional()
  @IsString()
  position?: string;
}

/**
 * Debate message DTO with analysis metadata
 */
export class DebateMessageDto {
  @ApiProperty({ description: 'Message ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Content type' })
  @IsString()
  content_type: string;

  @ApiProperty({ description: 'Message creation time' })
  @IsDateString()
  created_at: string;

  @ApiProperty({ description: 'Message update time' })
  @IsDateString()
  updated_at: string;

  @ApiPropertyOptional({ description: 'Last edit time' })
  @IsOptional()
  @IsDateString()
  edited_at?: string;

  @ApiProperty({ description: 'Message status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Moderation status' })
  @IsString()
  moderation_status: string;

  @ApiProperty({ description: 'Message metadata' })
  @IsObject()
  message_metadata: Record<string, any>;

  @ApiProperty({ description: 'Message author' })
  @ValidateNested()
  @Type(() => DebateParticipantDto)
  user: DebateParticipantDto;

  @ApiPropertyOptional({ description: 'Reply to message ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  reply_to_id?: string;

  @ApiPropertyOptional({ description: 'Message being replied to' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DebateMessageDto)
  reply_to?: DebateMessageDto;

  @ApiPropertyOptional({ description: 'Word count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  word_count?: number;

  @ApiPropertyOptional({ description: 'Character count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  character_count?: number;

  @ApiPropertyOptional({ description: 'Reading time in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  reading_time_seconds?: number;
}

/**
 * Debate topic information DTO
 */
export class DebateTopicDto {
  @ApiProperty({ description: 'Topic ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Topic title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Topic description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Topic category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Difficulty level (1-10)' })
  @IsInt()
  @Min(1)
  @Max(10)
  difficulty_level: number;
}

/**
 * Debate engagement metrics DTO
 */
export class EngagementMetricsDto {
  @ApiProperty({ description: 'Average message length in words' })
  @IsNumber()
  avg_message_length: number;

  @ApiProperty({ description: 'Total number of exchanges' })
  @IsInt()
  total_exchanges: number;

  @ApiProperty({ description: 'Average response time in seconds' })
  @IsNumber()
  response_times_avg: number;

  @ApiProperty({ description: 'Participation balance (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  participation_balance: number;

  @ApiProperty({ description: 'Engagement score (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  overall_engagement: number;
}

/**
 * Complete debate transcript DTO
 */
export class DebateTranscriptDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Match ID' })
  @IsString()
  @IsUUID()
  match_id: string;

  @ApiProperty({ enum: ConversationStatus, description: 'Conversation status' })
  @IsEnum(ConversationStatus)
  status: ConversationStatus;

  @ApiProperty({ enum: DebatePhase, description: 'Current debate phase' })
  @IsEnum(DebatePhase)
  debate_phase: DebatePhase;

  @ApiPropertyOptional({ description: 'When debate started' })
  @IsOptional()
  @IsDateString()
  started_at?: string;

  @ApiPropertyOptional({ description: 'When debate ended' })
  @IsOptional()
  @IsDateString()
  ended_at?: string;

  @ApiPropertyOptional({ description: 'Debate duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_minutes?: number;

  @ApiProperty({ type: [DebateParticipantDto], description: 'Debate participants' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebateParticipantDto)
  participants: DebateParticipantDto[];

  @ApiPropertyOptional({ description: 'Debate topic information' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DebateTopicDto)
  topic?: DebateTopicDto;

  @ApiProperty({ type: [DebateMessageDto], description: 'All debate messages' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebateMessageDto)
  messages: DebateMessageDto[];

  @ApiProperty({ description: 'Phase progression history' })
  @IsArray()
  phase_history: any[];

  @ApiProperty({ description: 'Debate metadata and statistics' })
  @IsObject()
  metadata: {
    total_messages: number;
    messages_by_participant: Record<string, number>;
    phase_durations: Record<string, number>;
    engagement_metrics: EngagementMetricsDto;
  };
}

/**
 * Participant-specific analysis DTO
 */
export class ParticipantAnalysisDto {
  @ApiProperty({ description: 'Participant information' })
  @ValidateNested()
  @Type(() => DebateParticipantDto)
  participant: DebateParticipantDto;

  @ApiProperty({ type: [DebateMessageDto], description: 'Participant messages' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebateMessageDto)
  messages: DebateMessageDto[];

  @ApiProperty({ description: 'Participation statistics' })
  @IsObject()
  statistics: {
    total_messages: number;
    avg_message_length: number;
    total_word_count: number;
    first_message_at?: string;
    last_message_at?: string;
    response_times: number[];
    avg_response_time: number;
  };

  @ApiPropertyOptional({ description: 'Argument quality analysis' })
  @IsOptional()
  @IsObject()
  argument_analysis?: {
    argument_strength: number; // 0-1
    evidence_quality: number; // 0-1
    logical_coherence: number; // 0-1
    claim_count: number;
    evidence_count: number;
    fallacy_count: number;
  };

  @ApiPropertyOptional({ description: 'Communication style analysis' })
  @IsOptional()
  @IsObject()
  communication_style?: {
    formality_level: number; // 0-1
    emotional_tone: number; // -1 to 1
    assertiveness: number; // 0-1
    empathy_indicators: number; // 0-1
    question_asking_frequency: number;
  };

  @ApiPropertyOptional({ description: 'Engagement patterns' })
  @IsOptional()
  @IsObject()
  engagement_patterns?: {
    peak_activity_periods: string[];
    response_consistency: number; // 0-1
    topic_adherence: number; // 0-1
    interaction_quality: number; // 0-1
  };
}

/**
 * AI-generated learning insights DTO
 */
export class LearningInsightDto {
  @ApiProperty({ description: 'Insight ID' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Associated debate ID' })
  @IsString()
  @IsUUID()
  debate_id: string;

  @ApiProperty({ description: 'User for whom insight is generated' })
  @IsString()
  @IsUUID()
  user_id: string;

  @ApiProperty({ description: 'Type of insight' })
  @IsString()
  insight_type: string;

  @ApiProperty({ description: 'Insight version' })
  @IsString()
  insight_version: string;

  @ApiProperty({ enum: AnalysisStatus, description: 'Analysis status' })
  @IsEnum(AnalysisStatus)
  status: AnalysisStatus;

  @ApiPropertyOptional({ description: 'Processing time in milliseconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  processing_time_ms?: number;

  @ApiPropertyOptional({ description: 'Error message if processing failed' })
  @IsOptional()
  @IsString()
  error_message?: string;

  @ApiPropertyOptional({ description: 'How actionable the insights are (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  actionability_score?: number;

  @ApiPropertyOptional({ description: 'Relevance to user goals (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  relevance_score?: number;

  @ApiPropertyOptional({ description: 'Priority level' })
  @IsOptional()
  @IsString()
  priority_level?: string;

  @ApiProperty({ description: 'Structured insight content' })
  @IsObject()
  payload: {
    summary: string;
    key_insights: string[];
    strengths: string[];
    improvement_areas: string[];
    specific_recommendations: Array<{
      category: string;
      recommendation: string;
      rationale: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    skill_development: Array<{
      skill: string;
      current_level: number; // 0-1
      target_level: number; // 0-1
      improvement_path: string[];
    }>;
    comparison_to_peers?: {
      percentile_rank: number;
      areas_above_average: string[];
      areas_below_average: string[];
    };
  };

  @ApiPropertyOptional({ description: 'Generation parameters and context' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'When insight was created' })
  @IsDateString()
  created_at: string;

  @ApiProperty({ description: 'When insight was last updated' })
  @IsDateString()
  updated_at: string;
}

/**
 * Analysis request DTO
 */
export class AnalysisRequestDto {
  @ApiProperty({ description: 'Conversation/debate ID to analyze' })
  @IsString()
  @IsUUID()
  conversation_id: string;

  @ApiPropertyOptional({ description: 'Specific user to analyze (for participant analysis)' })
  @IsOptional()
  @IsString()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Types of analysis to perform' })
  @IsOptional()
  @IsArray()
  analysis_types?: string[];

  @ApiPropertyOptional({ description: 'Force reanalysis even if cached results exist' })
  @IsOptional()
  @IsBoolean()
  force_refresh?: boolean = false;

  @ApiPropertyOptional({ description: 'Include detailed breakdowns' })
  @IsOptional()
  @IsBoolean()
  include_details?: boolean = true;

  @ApiPropertyOptional({ description: 'Analysis configuration' })
  @IsOptional()
  @IsObject()
  config?: {
    min_message_count?: number;
    include_deleted_messages?: boolean;
    analysis_depth?: 'basic' | 'detailed' | 'comprehensive';
    language_model?: string;
  };
}

/**
 * Analysis result DTO
 */
export class AnalysisResultDto {
  @ApiProperty({ description: 'Analysis ID' })
  @IsString()
  @IsUUID()
  analysis_id: string;

  @ApiProperty({ description: 'Conversation ID that was analyzed' })
  @IsString()
  @IsUUID()
  conversation_id: string;

  @ApiProperty({ description: 'Analysis type performed' })
  @IsString()
  analysis_type: string;

  @ApiProperty({ enum: AnalysisStatus, description: 'Analysis status' })
  @IsEnum(AnalysisStatus)
  status: AnalysisStatus;

  @ApiProperty({ description: 'Overall confidence in analysis (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence_score: number;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  @IsInt()
  @Min(0)
  processing_time_ms: number;

  @ApiPropertyOptional({ description: 'Error message if analysis failed' })
  @IsOptional()
  @IsString()
  error_message?: string;

  @ApiProperty({ description: 'Analysis results payload' })
  @IsObject()
  results: Record<string, any>;

  @ApiProperty({ description: 'Analysis metadata and parameters' })
  @IsObject()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'When analysis was performed' })
  @IsDateString()
  created_at: string;
}

/**
 * Batch analysis request DTO
 */
export class BatchAnalysisRequestDto {
  @ApiProperty({ description: 'Array of conversation IDs to analyze' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  conversation_ids: string[];

  @ApiProperty({ description: 'Analysis types to perform on each conversation' })
  @IsArray()
  analysis_types: string[];

  @ApiPropertyOptional({ description: 'Class ID for batch processing context' })
  @IsOptional()
  @IsString()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional({ description: 'Priority level for batch processing' })
  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high' = 'normal';

  @ApiPropertyOptional({ description: 'Batch processing configuration' })
  @IsOptional()
  @IsObject()
  config?: {
    parallel_limit?: number;
    retry_attempts?: number;
    analysis_depth?: 'basic' | 'detailed' | 'comprehensive';
  };
}

/**
 * Batch analysis status DTO
 */
export class BatchAnalysisStatusDto {
  @ApiProperty({ description: 'Batch job ID' })
  @IsString()
  @IsUUID()
  batch_id: string;

  @ApiProperty({ description: 'Overall batch status' })
  @IsString()
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

  @ApiProperty({ description: 'Total conversations to analyze' })
  @IsInt()
  @Min(0)
  total_conversations: number;

  @ApiProperty({ description: 'Completed analyses' })
  @IsInt()
  @Min(0)
  completed_count: number;

  @ApiProperty({ description: 'Failed analyses' })
  @IsInt()
  @Min(0)
  failed_count: number;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  progress_percentage: number;

  @ApiPropertyOptional({ description: 'Estimated time remaining in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimated_time_remaining?: number;

  @ApiProperty({ description: 'Individual analysis results' })
  @IsArray()
  results: Array<{
    conversation_id: string;
    status: string;
    error_message?: string;
    completed_at?: string;
  }>;

  @ApiProperty({ description: 'When batch was started' })
  @IsDateString()
  started_at: string;

  @ApiPropertyOptional({ description: 'When batch was completed' })
  @IsOptional()
  @IsDateString()
  completed_at?: string;
}
