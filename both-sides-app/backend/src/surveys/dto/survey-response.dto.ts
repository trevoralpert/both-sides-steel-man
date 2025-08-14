/**
 * Phase 3 Task 3.1.3: Survey Response DTOs and Validation
 * Data Transfer Objects for survey response collection APIs
 */

import { 
  IsUUID, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsInt, 
  IsNumber,
  Min, 
  Max, 
  MaxLength,
  ValidateNested,
  IsArray,
  IsEnum
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SurveyResponseDto {
  @ApiProperty({ description: 'UUID of the survey question' })
  @IsUUID()
  question_id: string;

  @ApiProperty({ description: 'The response value (format depends on question type)' })
  @IsNotEmpty()
  response_value: any;

  @ApiPropertyOptional({ description: 'Text response for open-ended questions', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  response_text?: string;

  @ApiPropertyOptional({ description: 'Confidence level (1-5 scale)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  confidence_level?: number;

  @ApiProperty({ description: 'Time taken to complete question in milliseconds', minimum: 0 })
  @IsInt()
  @Min(0)
  completion_time: number;
}

export class BulkSurveyResponseDto {
  @ApiProperty({ type: [SurveyResponseDto], description: 'Array of survey responses' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyResponseDto)
  responses: SurveyResponseDto[];

  @ApiPropertyOptional({ description: 'Survey session metadata' })
  @IsOptional()
  session_metadata?: {
    session_duration: number;
    fatigue_level: 'low' | 'medium' | 'high';
    completion_quality: number;
  };
}

export class SurveyProgressDto {
  @ApiProperty({ description: 'Number of completed questions' })
  @IsInt()
  @Min(0)
  completed_questions: number;

  @ApiProperty({ description: 'Total number of questions in survey' })
  @IsInt()
  @Min(1)
  total_questions: number;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress_percentage: number;

  @ApiPropertyOptional({ description: 'Current section being completed' })
  @IsOptional()
  @IsString()
  current_section?: string;

  @ApiProperty({ description: 'Number of completed sections' })
  @IsInt()
  @Min(0)
  sections_completed: number;

  @ApiProperty({ description: 'Total number of sections' })
  @IsInt()
  @Min(1)
  total_sections: number;
}

export class AdaptiveQuestionRequestDto {
  @ApiPropertyOptional({ description: 'User age for age-appropriate filtering', minimum: 13, maximum: 25 })
  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(25)
  age?: number;

  @ApiPropertyOptional({ 
    description: 'Preferred question complexity level',
    enum: ['basic', 'intermediate', 'advanced']
  })
  @IsOptional()
  @IsEnum(['basic', 'intermediate', 'advanced'])
  complexity_preference?: 'basic' | 'intermediate' | 'advanced';

  @ApiPropertyOptional({ description: 'Maximum questions per session', minimum: 5, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(50)
  max_questions?: number;
}

export class QuestionValidationResultDto {
  @ApiProperty({ description: 'Whether the question content is valid' })
  is_valid: boolean;

  @ApiProperty({ description: 'Quality score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiPropertyOptional({ description: 'Validation errors', type: [String] })
  errors?: string[];

  @ApiPropertyOptional({ description: 'Validation warnings', type: [String] })
  warnings?: string[];
}

export class SurveySetValidationDto {
  @ApiProperty({ description: 'Whether the question set is balanced' })
  is_balanced: boolean;

  @ApiProperty({ description: 'Question count by category' })
  coverage: Record<string, number>;

  @ApiPropertyOptional({ description: 'Recommendations for improvement', type: [String] })
  recommendations?: string[];
}
