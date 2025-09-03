import { 
  IsString, 
  IsUUID, 
  IsOptional, 
  IsObject, 
  IsInt, 
  IsNumber, 
  IsBoolean, 
  Min, 
  Max, 
  IsArray, 
  ValidateNested, 
  IsDateString,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base reflection template DTO
 */
export class BaseReflectionTemplateDto {
  @ApiProperty({ description: 'Unique template identifier' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Template type category' })
  @IsString()
  @IsIn(['post_debate', 'skill_specific', 'topic_specific', 'custom'])
  template_type: string;

  @ApiProperty({ description: 'Human-readable template name' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'The actual question/prompt text' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  prompt_text: string;

  @ApiProperty({ description: 'Target audience for this template' })
  @IsString()
  @IsIn(['student', 'teacher', 'mixed'])
  target_audience: string;

  @ApiProperty({ description: 'Question type' })
  @IsString()
  @IsIn(['open_ended', 'rating', 'multiple_choice', 'slider', 'yes_no', 'ranking'])
  question_type: string;

  @ApiPropertyOptional({ description: 'Options for multiple choice or rating scales' })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;

  @ApiProperty({ description: 'Difficulty level (1-10 scale)', minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  difficulty_level: number;

  @ApiProperty({ description: 'Importance weight for scoring', minimum: 0, maximum: 5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  weight: number;

  @ApiPropertyOptional({ description: 'Category classification' })
  @IsOptional()
  @IsString()
  @IsIn(['argumentation', 'evidence', 'listening', 'empathy', 'critical_thinking', 'communication', 'reflection'])
  category?: string;

  @ApiProperty({ description: 'Whether template needs debate-specific context' })
  @IsBoolean()
  requires_context: boolean;

  @ApiProperty({ description: 'Whether template is currently active' })
  @IsBoolean()
  active_status: boolean;

  @ApiProperty({ description: 'Number of times template has been used' })
  @IsInt()
  @Min(0)
  usage_count: number;

  @ApiPropertyOptional({ 
    description: 'Template effectiveness score (0-1)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  effectiveness_score?: number;

  @ApiPropertyOptional({ description: 'Additional template configuration' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'When template was created' })
  @IsDateString()
  created_at: string;

  @ApiProperty({ description: 'When template was last updated' })
  @IsDateString()
  updated_at: string;

  @ApiPropertyOptional({ description: 'Teacher who created custom template' })
  @IsOptional()
  @IsString()
  @IsUUID()
  created_by?: string;
}

/**
 * Detailed reflection template with usage analytics
 */
export class ReflectionTemplateDto extends BaseReflectionTemplateDto {
  @ApiPropertyOptional({ description: 'Usage analytics and performance metrics' })
  @IsOptional()
  @IsObject()
  usage_analytics?: {
    total_uses: number;
    avg_response_quality: number;
    avg_response_length: number;
    avg_completion_time_seconds: number;
    student_satisfaction_rating: number;
    teacher_effectiveness_rating: number;
    common_response_themes: string[];
  };

  @ApiPropertyOptional({ description: 'Recommendations for template improvement' })
  @IsOptional()
  @IsArray()
  improvement_suggestions?: string[];

  @ApiPropertyOptional({ description: 'Related templates' })
  @IsOptional()
  @IsArray()
  related_templates?: Array<{
    template_id: string;
    template_name: string;
    relationship_type: 'similar' | 'prerequisite' | 'follow_up' | 'alternative';
  }>;

  @ApiPropertyOptional({ description: 'Template creator information' })
  @IsOptional()
  @IsObject()
  creator_info?: {
    user_id: string;
    name: string;
    role: string;
  };
}

/**
 * DTO for creating a new reflection template
 */
export class CreateReflectionTemplateDto {
  @ApiProperty({ description: 'Template type' })
  @IsString()
  @IsIn(['post_debate', 'skill_specific', 'topic_specific', 'custom'])
  template_type: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Question/prompt text' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  prompt_text: string;

  @ApiProperty({ description: 'Target audience' })
  @IsString()
  @IsIn(['student', 'teacher', 'mixed'])
  target_audience: string;

  @ApiProperty({ description: 'Question type' })
  @IsString()
  @IsIn(['open_ended', 'rating', 'multiple_choice', 'slider', 'yes_no', 'ranking'])
  question_type: string;

  @ApiPropertyOptional({ description: 'Question options if applicable' })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Difficulty level (1-10)', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  difficulty_level?: number = 5;

  @ApiPropertyOptional({ description: 'Weight for scoring (0-5)', minimum: 0, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  weight?: number = 1.0;

  @ApiPropertyOptional({ description: 'Category classification' })
  @IsOptional()
  @IsString()
  @IsIn(['argumentation', 'evidence', 'listening', 'empathy', 'critical_thinking', 'communication', 'reflection'])
  category?: string;

  @ApiPropertyOptional({ description: 'Requires debate context' })
  @IsOptional()
  @IsBoolean()
  requires_context?: boolean = false;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a reflection template
 */
export class UpdateReflectionTemplateDto {
  @ApiPropertyOptional({ description: 'Updated template name' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Updated prompt text' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  prompt_text?: string;

  @ApiPropertyOptional({ description: 'Updated target audience' })
  @IsOptional()
  @IsString()
  @IsIn(['student', 'teacher', 'mixed'])
  target_audience?: string;

  @ApiPropertyOptional({ description: 'Updated question type' })
  @IsOptional()
  @IsString()
  @IsIn(['open_ended', 'rating', 'multiple_choice', 'slider', 'yes_no', 'ranking'])
  question_type?: string;

  @ApiPropertyOptional({ description: 'Updated options' })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Updated difficulty level' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  difficulty_level?: number;

  @ApiPropertyOptional({ description: 'Updated weight' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  weight?: number;

  @ApiPropertyOptional({ description: 'Updated category' })
  @IsOptional()
  @IsString()
  @IsIn(['argumentation', 'evidence', 'listening', 'empathy', 'critical_thinking', 'communication', 'reflection'])
  category?: string;

  @ApiPropertyOptional({ description: 'Updated context requirement' })
  @IsOptional()
  @IsBoolean()
  requires_context?: boolean;

  @ApiPropertyOptional({ description: 'Updated active status' })
  @IsOptional()
  @IsBoolean()
  active_status?: boolean;

  @ApiPropertyOptional({ description: 'Updated metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for template search and filtering
 */
export class TemplateSearchDto {
  @ApiPropertyOptional({ description: 'Filter by template type' })
  @IsOptional()
  @IsString()
  @IsIn(['post_debate', 'skill_specific', 'topic_specific', 'custom'])
  template_type?: string;

  @ApiPropertyOptional({ description: 'Filter by target audience' })
  @IsOptional()
  @IsString()
  @IsIn(['student', 'teacher', 'mixed'])
  target_audience?: string;

  @ApiPropertyOptional({ description: 'Filter by question type' })
  @IsOptional()
  @IsString()
  @IsIn(['open_ended', 'rating', 'multiple_choice', 'slider', 'yes_no', 'ranking'])
  question_type?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  @IsIn(['argumentation', 'evidence', 'listening', 'empathy', 'critical_thinking', 'communication', 'reflection'])
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by difficulty level range - minimum' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  min_difficulty?: number;

  @ApiPropertyOptional({ description: 'Filter by difficulty level range - maximum' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  max_difficulty?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  active_only?: boolean = true;

  @ApiPropertyOptional({ description: 'Filter by context requirement' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  requires_context?: boolean;

  @ApiPropertyOptional({ description: 'Filter by minimum effectiveness score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Transform(({ value }) => parseFloat(value))
  min_effectiveness?: number;

  @ApiPropertyOptional({ description: 'Filter by creator (for custom templates)' })
  @IsOptional()
  @IsString()
  @IsUUID()
  created_by?: string;

  @ApiPropertyOptional({ description: 'Search text in name or prompt' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  search_text?: string;

  @ApiPropertyOptional({ description: 'Results per page', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Page offset', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'created_at', 'usage_count', 'effectiveness_score', 'difficulty_level'])
  sort_by?: string = 'name';

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'asc';
}

/**
 * Paginated templates response
 */
export class PaginatedTemplatesDto {
  @ApiProperty({ type: [ReflectionTemplateDto], description: 'Array of templates' })
  templates: ReflectionTemplateDto[];

  @ApiProperty({ description: 'Total count of templates' })
  total: number;

  @ApiProperty({ description: 'Results per page' })
  limit: number;

  @ApiProperty({ description: 'Current page offset' })
  offset: number;

  @ApiProperty({ description: 'Whether there are more pages' })
  has_more: boolean;
}

/**
 * Template usage analytics DTO
 */
export class TemplateAnalyticsDto {
  @ApiProperty({ description: 'Template ID' })
  @IsString()
  @IsUUID()
  template_id: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Total usage count' })
  @IsInt()
  total_uses: number;

  @ApiProperty({ description: 'Average response quality score' })
  @IsNumber()
  avg_response_quality: number;

  @ApiProperty({ description: 'Average response length (words)' })
  @IsNumber()
  avg_response_length: number;

  @ApiProperty({ description: 'Average completion time (seconds)' })
  @IsNumber()
  avg_completion_time: number;

  @ApiProperty({ description: 'Student satisfaction rating (1-5)' })
  @IsNumber()
  student_satisfaction: number;

  @ApiProperty({ description: 'Teacher effectiveness rating (1-5)' })
  @IsNumber()
  teacher_effectiveness: number;

  @ApiProperty({ description: 'Usage trend over time' })
  @IsObject()
  usage_trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    change_rate: number;
    time_period_days: number;
  };

  @ApiProperty({ description: 'Common themes in responses' })
  @IsArray()
  common_themes: string[];

  @ApiProperty({ description: 'Improvement suggestions' })
  @IsArray()
  improvement_suggestions: string[];

  @ApiProperty({ description: 'When analytics were calculated' })
  @IsDateString()
  calculated_at: string;
}

/**
 * Template recommendation DTO
 */
export class TemplateRecommendationDto {
  @ApiProperty({ description: 'Recommended template' })
  @ValidateNested()
  @Type(() => ReflectionTemplateDto)
  template: ReflectionTemplateDto;

  @ApiProperty({ description: 'Recommendation score (0-1)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  recommendation_score: number;

  @ApiProperty({ description: 'Reasons for recommendation' })
  @IsArray()
  reasons: string[];

  @ApiProperty({ description: 'Expected effectiveness for this student' })
  @IsNumber()
  @Min(0)
  @Max(1)
  expected_effectiveness: number;

  @ApiProperty({ description: 'Estimated completion time (minutes)' })
  @IsInt()
  @Min(1)
  estimated_completion_time: number;
}
