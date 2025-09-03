/**
 * Plasticity Measurement DTOs
 * 
 * Task 7.4.1: Data Transfer Objects for Opinion Plasticity Measurement System
 */

import { IsString, IsArray, IsNumber, IsOptional, IsEnum, IsBoolean, ValidateNested, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BeliefPositionDto {
  @ApiProperty({ description: 'Unique identifier for the topic' })
  @IsString()
  topicId: string;

  @ApiProperty({ description: 'Human-readable topic title' })
  @IsString()
  topicTitle: string;

  @ApiProperty({ description: 'Topic category (e.g., political, social, economic)' })
  @IsString()
  category: string;

  @ApiProperty({ 
    description: 'Position on the topic (-1 to 1 scale)', 
    minimum: -1, 
    maximum: 1 
  })
  @IsNumber()
  @Min(-1)
  @Max(1)
  position: number;

  @ApiProperty({ 
    description: 'Confidence in position (0 to 1 scale)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiPropertyOptional({ description: 'Reasoning for this position' })
  @IsOptional()
  @IsString()
  reasoning?: string;

  @ApiPropertyOptional({ description: 'Evidence sources supporting this position' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceSources?: string[];

  @ApiProperty({ description: 'When this position was recorded' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ 
    enum: ['pre_debate', 'post_debate', 'ai_inferred', 'self_reported'],
    description: 'Source of this position data'
  })
  @IsEnum(['pre_debate', 'post_debate', 'ai_inferred', 'self_reported'])
  source: 'pre_debate' | 'post_debate' | 'ai_inferred' | 'self_reported';

  @ApiPropertyOptional({ description: 'How this position was determined' })
  @IsOptional()
  @IsString()
  provenance?: string;
}

export class ContextualFactorsDto {
  @ApiProperty({ description: 'Topic category (e.g., politics, ethics, technology)' })
  @IsString()
  topicCategory: string;

  @ApiProperty({ 
    description: 'Topic difficulty level (1-10 scale)', 
    minimum: 1, 
    maximum: 10 
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  difficultyLevel: number;

  @ApiPropertyOptional({ 
    description: 'Topic controversy level (0-1 scale)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  controversyLevel?: number;

  @ApiPropertyOptional({ 
    description: 'Peer influence factor (0-1 scale)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  peerInfluence?: number;
}

export class PlasticityMeasurementRequestDto {
  @ApiProperty({ description: 'ID of the user being analyzed' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'ID of the debate that prompted this measurement' })
  @IsString()
  debateId: string;

  @ApiPropertyOptional({ 
    description: 'Pre-debate belief positions',
    type: [BeliefPositionDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BeliefPositionDto)
  preDebatePositions?: BeliefPositionDto[];

  @ApiProperty({ 
    description: 'Post-debate belief positions',
    type: [BeliefPositionDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BeliefPositionDto)
  postDebatePositions: BeliefPositionDto[];

  @ApiPropertyOptional({ description: 'Additional reflection data from the user' })
  @IsOptional()
  reflectionData?: any;

  @ApiPropertyOptional({ 
    description: 'Contextual factors affecting plasticity measurement',
    type: ContextualFactorsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContextualFactorsDto)
  contextualFactors?: ContextualFactorsDto;
}

export class PositionChangeDto {
  @ApiProperty({ description: 'Topic identifier' })
  @IsString()
  topicId: string;

  @ApiProperty({ description: 'Topic title' })
  @IsString()
  topicTitle: string;

  @ApiProperty({ description: 'Topic category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Position before the debate' })
  @IsNumber()
  prePosition: number;

  @ApiProperty({ description: 'Position after the debate' })
  @IsNumber()
  postPosition: number;

  @ApiProperty({ description: 'Change in position (post - pre)' })
  @IsNumber()
  positionDelta: number;

  @ApiProperty({ description: 'Confidence before the debate' })
  @IsNumber()
  preConfidence: number;

  @ApiProperty({ description: 'Confidence after the debate' })
  @IsNumber()
  postConfidence: number;

  @ApiProperty({ description: 'Change in confidence' })
  @IsNumber()
  confidenceDelta: number;

  @ApiProperty({ 
    enum: ['minimal', 'moderate', 'substantial', 'dramatic'],
    description: 'Significance level of the change'
  })
  @IsEnum(['minimal', 'moderate', 'substantial', 'dramatic'])
  significanceLevel: 'minimal' | 'moderate' | 'substantial' | 'dramatic';

  @ApiProperty({ 
    enum: ['no_change', 'strengthening', 'weakening', 'reversal', 'moderation'],
    description: 'Type of position change'
  })
  @IsEnum(['no_change', 'strengthening', 'weakening', 'reversal', 'moderation'])
  changeType: 'no_change' | 'strengthening' | 'weakening' | 'reversal' | 'moderation';

  @ApiPropertyOptional({ description: 'How reasoning evolved during the debate' })
  @IsOptional()
  @IsString()
  reasoningEvolution?: string;
}

export class ContextualPlasticityDto {
  @ApiProperty({ description: 'Plasticity score adjusted for topic difficulty' })
  @IsNumber()
  topicDifficultyAdjusted: number;

  @ApiProperty({ description: 'Plasticity score adjusted for controversy level' })
  @IsNumber()
  controversyAdjusted: number;

  @ApiProperty({ description: 'Plasticity score adjusted for peer influence' })
  @IsNumber()
  peerInfluenceAdjusted: number;
}

export class LongitudinalMetricsDto {
  @ApiProperty({ description: 'Number of previous measurements' })
  @IsNumber()
  previousMeasurements: number;

  @ApiProperty({ 
    enum: ['increasing', 'decreasing', 'stable'],
    description: 'Trend in plasticity over time'
  })
  @IsEnum(['increasing', 'decreasing', 'stable'])
  plasticityTrend: 'increasing' | 'decreasing' | 'stable';

  @ApiProperty({ description: 'Average plasticity across all measurements' })
  @IsNumber()
  cumulativePlasticity: number;

  @ApiProperty({ description: 'Consistency of plasticity patterns (0-1 scale)' })
  @IsNumber()
  consistencyScore: number;
}

export class DataQualityDto {
  @ApiProperty({ description: 'Source of pre-debate position data' })
  @IsString()
  preDebateDataSource: string;

  @ApiProperty({ description: 'Source of post-debate position data' })
  @IsString()
  postDebateDataSource: string;

  @ApiProperty({ description: 'Completeness of the measurement (0-1 scale)' })
  @IsNumber()
  completeness: number;

  @ApiPropertyOptional({ description: 'Time gap between pre and post measurements (ms)' })
  @IsOptional()
  @IsNumber()
  timeGap?: number;
}

export class PlasticityInsightsDto {
  @ApiProperty({ 
    enum: ['low', 'moderate', 'high', 'exceptional'],
    description: 'Overall plasticity level classification'
  })
  @IsEnum(['low', 'moderate', 'high', 'exceptional'])
  plasticityLevel: 'low' | 'moderate' | 'high' | 'exceptional';

  @ApiProperty({ description: 'Positive indicators of plasticity growth' })
  @IsArray()
  @IsString({ each: true })
  growthIndicators: string[];

  @ApiProperty({ description: 'Areas that may need attention' })
  @IsArray()
  @IsString({ each: true })
  concernAreas: string[];

  @ApiProperty({ description: 'Specific recommendations for improvement' })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}

export class PlasticityMeasurementDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Debate ID' })
  @IsString()
  debateId: string;

  @ApiProperty({ description: 'Unique measurement identifier' })
  @IsString()
  measurementId: string;

  @ApiProperty({ description: 'Timestamp of the measurement' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ 
    description: 'Overall plasticity score (0-1 scale)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  overallPlasticityScore: number;

  @ApiProperty({ 
    description: 'Detailed position changes',
    type: [PositionChangeDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PositionChangeDto)
  positionChanges: PositionChangeDto[];

  @ApiProperty({ 
    enum: ['towards_center', 'away_from_center', 'position_swap', 'strengthening', 'mixed'],
    description: 'Overall movement pattern'
  })
  @IsEnum(['towards_center', 'away_from_center', 'position_swap', 'strengthening', 'mixed'])
  movementPattern: 'towards_center' | 'away_from_center' | 'position_swap' | 'strengthening' | 'mixed';

  @ApiProperty({ description: 'Average magnitude of position changes' })
  @IsNumber()
  averageMagnitude: number;

  @ApiProperty({ description: 'Maximum magnitude of any single position change' })
  @IsNumber()
  maxMagnitude: number;

  @ApiProperty({ description: 'Average change in confidence levels' })
  @IsNumber()
  confidenceChange: number;

  @ApiProperty({ 
    enum: ['increasing', 'decreasing', 'mixed', 'stable'],
    description: 'Pattern in confidence changes'
  })
  @IsEnum(['increasing', 'decreasing', 'mixed', 'stable'])
  confidencePattern: 'increasing' | 'decreasing' | 'mixed' | 'stable';

  @ApiProperty({ 
    description: 'Contextually adjusted plasticity scores',
    type: ContextualPlasticityDto
  })
  @ValidateNested()
  @Type(() => ContextualPlasticityDto)
  contextualPlasticity: ContextualPlasticityDto;

  @ApiPropertyOptional({ 
    description: 'Longitudinal analysis metrics',
    type: LongitudinalMetricsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LongitudinalMetricsDto)
  longitudinalMetrics?: LongitudinalMetricsDto;

  @ApiProperty({ 
    description: 'Reliability of this measurement (0-1 scale)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  reliability: number;

  @ApiProperty({ 
    description: 'Data quality assessment',
    type: DataQualityDto
  })
  @ValidateNested()
  @Type(() => DataQualityDto)
  dataQuality: DataQualityDto;

  @ApiProperty({ 
    description: 'Educational insights and recommendations',
    type: PlasticityInsightsDto
  })
  @ValidateNested()
  @Type(() => PlasticityInsightsDto)
  insights: PlasticityInsightsDto;
}

export class LongitudinalPlasticityRequestDto {
  @ApiProperty({ description: 'User ID to analyze' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Start date for analysis (ISO string)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date for analysis (ISO string)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class TimePatternDto {
  @ApiProperty({ description: 'Recent plasticity average' })
  @IsNumber()
  shortTermPlasticity: number;

  @ApiProperty({ description: 'Historical plasticity average' })
  @IsNumber()
  longTermPlasticity: number;

  @ApiProperty({ description: 'Variability in plasticity measurements' })
  @IsNumber()
  plasticityVolatility: number;
}

export class PlasticityTrendsDto {
  @ApiProperty({ 
    enum: ['increasing', 'decreasing', 'stable', 'cyclical'],
    description: 'Overall trend in plasticity over time'
  })
  @IsEnum(['increasing', 'decreasing', 'stable', 'cyclical'])
  overallTrend: 'increasing' | 'decreasing' | 'stable' | 'cyclical';

  @ApiProperty({ 
    description: 'Plasticity trends by topic category',
    example: { 'political': 0.65, 'social': 0.72, 'economic': 0.58 }
  })
  categoryTrends: Record<string, number>;

  @ApiProperty({ 
    description: 'Time-based pattern analysis',
    type: TimePatternDto
  })
  @ValidateNested()
  @Type(() => TimePatternDto)
  timePatterns: TimePatternDto;
}

export class PlasticityPredictionsDto {
  @ApiProperty({ 
    description: 'Predicted future debate engagement (0-1 scale)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  futureEngagement: number;

  @ApiProperty({ 
    description: 'Predicted learning potential (0-1 scale)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  learningPotential: number;

  @ApiProperty({ 
    description: 'Topics likely to generate productive discussions'
  })
  @IsArray()
  @IsString({ each: true })
  optimalTopics: string[];
}

export class LongitudinalPlasticityDataDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ 
    description: 'Historical plasticity measurements',
    type: [PlasticityMeasurementDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlasticityMeasurementDto)
  measurements: PlasticityMeasurementDto[];

  @ApiProperty({ 
    description: 'Trend analysis',
    type: PlasticityTrendsDto
  })
  @ValidateNested()
  @Type(() => PlasticityTrendsDto)
  trends: PlasticityTrendsDto;

  @ApiProperty({ 
    description: 'Predictive insights',
    type: PlasticityPredictionsDto
  })
  @ValidateNested()
  @Type(() => PlasticityPredictionsDto)
  predictions: PlasticityPredictionsDto;
}

export class ComparativePlasticityRequestDto {
  @ApiProperty({ description: 'User IDs to compare' })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiPropertyOptional({ description: 'Class ID for context (optional)' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ description: 'Focus on specific topic category (optional)' })
  @IsOptional()
  @IsString()
  topicCategory?: string;
}

export class UserComparisonDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Average plasticity score across all measurements' })
  @IsNumber()
  averagePlasticity: number;

  @ApiProperty({ description: 'Ranking among compared users' })
  @IsNumber()
  plasticityRank: number;

  @ApiProperty({ description: 'Percentile ranking (0-100)' })
  @IsNumber()
  percentile: number;

  @ApiProperty({ description: 'Identified strengths in plasticity' })
  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @ApiProperty({ description: 'Areas for growth' })
  @IsArray()
  @IsString({ each: true })
  growthAreas: string[];
}

export class ClassMetricsDto {
  @ApiProperty({ description: 'Class average plasticity score' })
  @IsNumber()
  averagePlasticity: number;

  @ApiProperty({ 
    description: 'Distribution of plasticity levels',
    example: { 'high': 5, 'moderate': 12, 'low': 3 }
  })
  plasticityDistribution: Record<string, number>;

  @ApiProperty({ description: 'User IDs of top performers' })
  @IsArray()
  @IsString({ each: true })
  topPerformers: string[];

  @ApiProperty({ description: 'User IDs who may need additional support' })
  @IsArray()
  @IsString({ each: true })
  needsSupport: string[];
}

export class ComparativePlasticityReportDto {
  @ApiProperty({ 
    description: 'Individual user comparisons',
    type: [UserComparisonDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserComparisonDto)
  userComparisons: UserComparisonDto[];

  @ApiPropertyOptional({ 
    description: 'Class-level metrics (if classId provided)',
    type: ClassMetricsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClassMetricsDto)
  classMetrics?: ClassMetricsDto;

  @ApiProperty({ description: 'Comparative insights and observations' })
  @IsArray()
  @IsString({ each: true })
  insights: string[];
}

export class PlasticityVisualizationRequestDto {
  @ApiPropertyOptional({ description: 'User ID for individual visualization' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Class ID for class-level visualization' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty({ 
    enum: ['individual_timeline', 'comparative_radar', 'class_distribution', 'topic_heatmap'],
    description: 'Type of visualization to generate'
  })
  @IsEnum(['individual_timeline', 'comparative_radar', 'class_distribution', 'topic_heatmap'])
  visualizationType: 'individual_timeline' | 'comparative_radar' | 'class_distribution' | 'topic_heatmap';

  @ApiPropertyOptional({ description: 'Start date for time-based visualizations' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date for time-based visualizations' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Additional options for visualization' })
  @IsOptional()
  options?: {
    includeConfidence?: boolean;
    groupByCategory?: boolean;
    showPredictions?: boolean;
  };
}
