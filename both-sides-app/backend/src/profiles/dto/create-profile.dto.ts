import { IsOptional, IsString, IsNumber, IsBoolean, IsUUID, Min, Max, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { 
  IsValidIdeologyScores, 
  IsValidSurveyResponses, 
  IsValidBeliefSummary,
  SanitizeText
} from '../validators/profile-validation.util';

export class CreateProfileDto {
  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsBoolean()
  is_completed?: boolean = false;

  @IsOptional()
  @IsDateString()
  completion_date?: string;

  @IsOptional()
  @IsValidSurveyResponses()
  survey_responses?: any;

  @IsOptional()
  @IsString()
  @IsValidBeliefSummary()
  @SanitizeText({ 
    stripHtml: true, 
    normalizeWhitespace: true, 
    removeJavascript: true, 
    maxLength: 5000 
  })
  belief_summary?: string;

  @IsOptional()
  @IsValidIdeologyScores()
  ideology_scores?: any;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.0, { message: 'Opinion plasticity must be between 0.0 and 1.0' })
  @Max(1.0, { message: 'Opinion plasticity must be between 0.0 and 1.0' })
  opinion_plasticity?: number = 0.5;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'Profile version must be at least 1' })
  profile_version?: number = 1;
}