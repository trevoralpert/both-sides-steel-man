/**
 * Topics DTOs
 * 
 * Data transfer objects for topic management API endpoints.
 * Handles request validation and response formatting for
 * debate topic CRUD operations and difficulty assessment.
 * 
 * Phase 4 Task 4.1.3: Basic Topic Management System
 */

import { 
  IsString, 
  IsArray, 
  IsObject, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsEnum,
  Min, 
  Max, 
  MinLength,
  MaxLength,
  ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';

// Topic Categories
export enum TopicCategory {
  POLITICS = 'Politics',
  ETHICS = 'Ethics',
  TECHNOLOGY = 'Technology',
  ENVIRONMENT = 'Environment',
  ECONOMICS = 'Economics',
  EDUCATION = 'Education',
  HEALTHCARE = 'Healthcare',
  SOCIAL_ISSUES = 'Social Issues',
  PHILOSOPHY = 'Philosophy',
  SCIENCE = 'Science',
  CURRENT_EVENTS = 'Current Events',
  OTHER = 'Other'
}

// Difficulty Levels
export enum DifficultyLevel {
  BEGINNER = 1,
  EASY = 2,
  NOVICE = 3,
  INTERMEDIATE = 4,
  MODERATE = 5,
  CHALLENGING = 6,
  ADVANCED = 7,
  DIFFICULT = 8,
  EXPERT = 9,
  MASTER = 10
}

// Topic Resource Structure
export class TopicResourceDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  url: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsNumber()
  credibilityScore?: number;
}

// Create Topic DTO
export class CreateTopicDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description: string;

  @IsEnum(TopicCategory)
  category: TopicCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  difficultyLevel?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicResourceDto)
  proResources?: TopicResourceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicResourceDto)
  conResources?: TopicResourceDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Update Topic DTO
export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(TopicCategory)
  category?: TopicCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  difficultyLevel?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicResourceDto)
  proResources?: TopicResourceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicResourceDto)
  conResources?: TopicResourceDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Topic Search/Filter DTO
export class TopicSearchDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  query?: string;

  @IsOptional()
  @IsEnum(TopicCategory)
  category?: TopicCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  minDifficulty?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxDifficulty?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  sortBy?: 'title' | 'difficulty' | 'usage' | 'created' | 'success_rate';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// Topic Response DTO
export class TopicResponseDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(TopicCategory)
  category: TopicCategory;

  @IsNumber()
  difficultyLevel: number;

  @IsOptional()
  @IsNumber()
  complexityScore?: number;

  @IsOptional()
  @IsArray()
  proResources?: TopicResourceDto[];

  @IsOptional()
  @IsArray()
  conResources?: TopicResourceDto[];

  @IsBoolean()
  isActive: boolean;

  @IsNumber()
  usageCount: number;

  @IsOptional()
  @IsNumber()
  successRate?: number;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsString()
  createdAt: string;

  @IsString()
  updatedAt: string;
}

// Bulk Topic Operations
export class BulkCreateTopicsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTopicDto)
  topics: CreateTopicDto[];

  @IsOptional()
  @IsString()
  source?: string; // Where these topics came from
}

export class BulkUpdateTopicsDto {
  @IsArray()
  @IsString({ each: true })
  topicIds: string[];

  @IsOptional()
  @IsEnum(TopicCategory)
  category?: TopicCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  difficultyLevel?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Topic Categories Response
export class TopicCategoriesDto {
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @IsObject()
  categoryCounts: Record<string, number>;
}

// Topic Statistics DTO
export class TopicStatsDto {
  @IsNumber()
  totalTopics: number;

  @IsNumber()
  activeTopics: number;

  @IsNumber()
  averageDifficulty: number;

  @IsObject()
  categoryDistribution: Record<string, number>;

  @IsObject()
  difficultyDistribution: Record<string, number>;

  @IsOptional()
  @IsNumber()
  averageSuccessRate?: number;

  @IsOptional()
  @IsNumber()
  totalUsage?: number;
}

// Difficulty Assessment DTOs
export class AssessTopicDifficultyDto {
  @IsString()
  topicId: string;

  @IsOptional()
  @IsBoolean()
  recalculate?: boolean; // Force recalculation
}

export class DifficultyAssessmentResponseDto {
  @IsString()
  topicId: string;

  @IsNumber()
  assessedDifficulty: number;

  @IsNumber()
  complexityScore: number;

  @IsObject()
  assessmentFactors: {
    vocabularyComplexity: number;
    conceptualDepth: number;
    controversialityLevel: number;
    evidenceRequirement: number;
    argumentStructureComplexity: number;
  };

  @IsString()
  assessmentVersion: string;

  @IsString()
  assessedAt: string;
}

// Topic Recommendation DTOs
export class TopicRecommendationDto {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  targetDifficulty?: number;

  @IsOptional()
  @IsEnum(TopicCategory)
  preferredCategory?: TopicCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class RecommendedTopicDto extends TopicResponseDto {
  @IsNumber()
  recommendationScore: number;

  @IsString()
  recommendationReason: string;

  @IsOptional()
  @IsObject()
  suitabilityFactors?: {
    difficultyMatch: number;
    categoryPreference: number;
    novelty: number;
    successLikelihood: number;
  };
}
