import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsValidIdeologyScores, IsValidSurveyResponses, IsValidBeliefSummary } from '../validators/profile-validation.util';

export class UpdateProfileDto {
  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;

  @IsOptional()
  @IsDateString()
  completion_date?: string;

  @IsOptional()
  @IsValidSurveyResponses()
  survey_responses?: any;

  @IsOptional()
  @IsString()
  @IsValidBeliefSummary()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  belief_summary?: string;

  @IsOptional()
  @IsValidIdeologyScores()
  ideology_scores?: any;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.0, { message: 'Opinion plasticity must be between 0.0 and 1.0' })
  @Max(1.0, { message: 'Opinion plasticity must be between 0.0 and 1.0' })
  opinion_plasticity?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'Profile version must be at least 1' })
  profile_version?: number;
}
