/**
 * Belief Analysis DTOs
 * 
 * Data transfer objects for belief analysis API endpoints.
 * Handles request validation and response formatting for
 * AI-powered belief profile generation.
 */

import { IsString, IsArray, IsObject, IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SurveyResponseDataDto {
  @IsString()
  questionId: string;

  @IsString()
  questionText: string;

  @IsString()
  questionCategory: string;

  @IsObject()
  responseValue: any;

  @IsOptional()
  @IsString()
  responseText?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  confidenceLevel?: number;

  @IsNumber()
  @Min(0)
  completionTime: number;
}

export enum AnalysisDepth {
  BASIC = 'basic',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive',
}

export enum AnalysisContext {
  EDUCATIONAL = 'educational',
  RESEARCH = 'research',
  MATCHING = 'matching',
}

export class IdeologyAxisDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number;

  @IsString()
  description: string;
}

export class AnalysisParametersDto {
  @IsEnum(AnalysisDepth)
  depth: AnalysisDepth;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IdeologyAxisDto)
  focus: IdeologyAxisDto[];

  @IsEnum(AnalysisContext)
  context: AnalysisContext;
}

export class GenerateBeliefAnalysisDto {
  @IsString()
  profileId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyResponseDataDto)
  surveyResponses: SurveyResponseDataDto[];

  @ValidateNested()
  @Type(() => AnalysisParametersDto)
  analysisParameters: AnalysisParametersDto;
}

export class IdeologyScoresDto {
  @IsNumber()
  @Min(-1)
  @Max(1)
  economic: number;

  @IsNumber()
  @Min(-1)
  @Max(1)
  social: number;

  @IsNumber()
  @Min(-1)
  @Max(1)
  tradition: number;

  @IsNumber()
  @Min(-1)
  @Max(1)
  globalism: number;

  @IsNumber()
  @Min(-1)
  @Max(1)
  environment: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  certainty: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  consistency: number;
}

export class AnalysisMetadataDto {
  @IsString()
  analysisVersion: string;

  @IsString()
  completedAt: string;

  @IsNumber()
  tokensUsed: number;

  @IsNumber()
  processingTime: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  qualityScore: number;
}

export class BeliefAnalysisResponseDto {
  @IsString()
  profileId: string;

  @IsString()
  beliefSummary: string;

  @ValidateNested()
  @Type(() => IdeologyScoresDto)
  ideologyScores: IdeologyScoresDto;

  @IsNumber()
  @Min(0)
  @Max(1)
  opinionPlasticity: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @ValidateNested()
  @Type(() => AnalysisMetadataDto)
  analysisMetadata: AnalysisMetadataDto;
}

export class GenerateEmbeddingDto {
  @IsString()
  profileId: string;

  @IsString()
  beliefSummary: string;

  @IsObject()
  ideologyScores: any;

  @IsOptional()
  @IsObject()
  metadata?: {
    version: string;
    source: 'survey' | 'updated' | 'manual';
  };
}

export class EmbeddingMetadataDto {
  @IsString()
  model: string;

  @IsNumber()
  tokensUsed: number;

  @IsNumber()
  processingTime: number;

  @IsString()
  version: string;
}

// Phase 4 Task 4.1.2: Vector Similarity DTOs

export class SimilaritySearchDto {
  @IsString()
  profileId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeUserIds?: string[];

  @IsOptional()
  @IsBoolean()
  includeDistance?: boolean;

  @IsOptional()
  @IsBoolean()
  useCache?: boolean;
}

export class BatchSimilarityDto {
  @IsString()
  targetId: string;

  @IsArray()
  @IsString({ each: true })
  candidateIds: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxResults?: number;

  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;
}

export class SimilarityScoreDto {
  @IsString()
  profileId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsNumber()
  similarityScore: number;

  @IsNumber()
  distance: number;

  @IsNumber()
  rank: number;

  @IsOptional()
  @IsObject()
  metadata?: {
    calculatedAt: string;
    algorithmVersion: string;
  };
}

export class SimilarityResultDto {
  @IsString()
  targetProfileId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimilarityScoreDto)
  matches: SimilarityScoreDto[];

  @IsNumber()
  threshold: number;

  @IsNumber()
  totalCandidates: number;

  @IsNumber()
  processingTime: number;

  @IsBoolean()
  cacheHit: boolean;
}

export class OptimalMatchesDto {
  @IsString()
  profileId: string;

  @IsString()
  classId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class EmbeddingResponseDto {
  @IsString()
  profileId: string;

  @IsArray()
  @IsNumber({}, { each: true })
  embedding: number[];

  @IsNumber()
  dimension: number;

  @IsNumber()
  magnitude: number;

  @IsString()
  generatedAt: string;

  @ValidateNested()
  @Type(() => EmbeddingMetadataDto)
  metadata: EmbeddingMetadataDto;
}

export class SimilarityFiltersDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  ageRange?: [number, number];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  plasticityRange?: [number, number];

  @IsOptional()
  @IsNumber()
  ideologyDistance?: number;
}

export class FindSimilarProfilesDto {
  @IsArray()
  @IsNumber({}, { each: true })
  targetEmbedding: number[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeProfileIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SimilarityFiltersDto)
  filters?: SimilarityFiltersDto;
}

export class SimilarityMatchDto {
  @IsString()
  profileId: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  similarity: number;

  @IsNumber()
  @Min(0)
  distance: number;

  @IsOptional()
  @IsString()
  beliefSummary?: string;

  @IsOptional()
  @IsObject()
  ideologyScores?: any;
}

export class AnalyzePlasticityDto {
  @IsString()
  profileId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyResponseDataDto)
  surveyResponses: SurveyResponseDataDto[];

  @IsOptional()
  @IsString()
  beliefSummary?: string;

  @IsOptional()
  @IsObject()
  ideologyScores?: any;

  @IsOptional()
  @IsObject()
  previousAnalysis?: any;
}

export class DimensionPlasticityDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  political: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  social: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  economic: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  philosophical: number;
}

export class ChangeIndicatorsDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  uncertaintyLevel: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  qualificationFrequency: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  contradictionTolerance: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  nuanceRecognition: number;
}

export class PlasticityMetadataDto {
  @IsString()
  analysisVersion: string;

  @IsString()
  completedAt: string;

  @IsNumber()
  processingTime: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  reliabilityScore: number;

  @IsNumber()
  dataPoints: number;
}

export class PlasticityAnalysisResponseDto {
  @IsString()
  profileId: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  overallPlasticity: number;

  @ValidateNested()
  @Type(() => DimensionPlasticityDto)
  dimensionPlasticity: DimensionPlasticityDto;

  @ValidateNested()
  @Type(() => ChangeIndicatorsDto)
  changeIndicators: ChangeIndicatorsDto;

  @IsNumber()
  @Min(0)
  @Max(1)
  learningReadiness: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  debateEngagementPotential: number;

  @ValidateNested()
  @Type(() => PlasticityMetadataDto)
  analysisMetadata: PlasticityMetadataDto;
}
