import { 
  IsString, 
  IsUUID, 
  IsOptional, 
  IsObject, 
  IsEnum, 
  IsNumber, 
  Min, 
  Max, 
  IsArray, 
  ValidateNested, 
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearningMetricType } from '@prisma/client';

/**
 * Base learning metric DTO
 */
export class BaseLearningMetricDto {
  @ApiProperty({ description: 'Unique metric identifier' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'User ID for whom this metric is tracked' })
  @IsString()
  @IsUUID()
  user_id: string;

  @ApiProperty({ 
    enum: LearningMetricType, 
    description: 'Type of learning metric being tracked' 
  })
  @IsEnum(LearningMetricType)
  metric_type: LearningMetricType;

  @ApiProperty({ description: 'Numeric value of the metric' })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ description: 'Additional context about the measurement' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiProperty({ description: 'When the measurement was taken' })
  @IsDateString()
  measurement_date: string;

  @ApiPropertyOptional({ description: 'Associated debate/conversation ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  debate_id?: string;

  @ApiPropertyOptional({ description: 'Associated class ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional({ description: 'Baseline value for comparison' })
  @IsOptional()
  @IsNumber()
  comparison_baseline?: number;

  @ApiPropertyOptional({ 
    description: 'Percentile rank compared to peers (0-1)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  percentile_rank?: number;

  @ApiPropertyOptional({ description: 'Rate of improvement over time' })
  @IsOptional()
  @IsNumber()
  improvement_rate?: number;

  @ApiPropertyOptional({ description: 'Additional metric-specific data' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'When metric was created' })
  @IsDateString()
  created_at: string;

  @ApiProperty({ description: 'When metric was last updated' })
  @IsDateString()
  updated_at: string;
}

/**
 * Detailed learning metric with analysis insights
 */
export class LearningMetricDto extends BaseLearningMetricDto {
  @ApiPropertyOptional({ description: 'Trend analysis over time' })
  @IsOptional()
  @IsObject()
  trend_analysis?: {
    direction: 'improving' | 'declining' | 'stable';
    change_rate: number;
    confidence: number;
    time_period_days: number;
  };

  @ApiPropertyOptional({ description: 'Comparison to class average' })
  @IsOptional()
  @IsObject()
  class_comparison?: {
    class_average: number;
    relative_position: 'above' | 'below' | 'at';
    percentile: number;
    rank: number;
    total_students: number;
  };

  @ApiPropertyOptional({ description: 'Recommendations for improvement' })
  @IsOptional()
  @IsArray()
  improvement_recommendations?: string[];

  @ApiPropertyOptional({ description: 'Related metrics that influenced this score' })
  @IsOptional()
  @IsArray()
  related_metrics?: string[];
}

/**
 * DTO for creating a new learning metric
 */
export class CreateLearningMetricDto {
  @ApiProperty({ description: 'User ID for whom this metric is tracked' })
  @IsString()
  @IsUUID()
  user_id: string;

  @ApiProperty({ 
    enum: LearningMetricType, 
    description: 'Type of learning metric' 
  })
  @IsEnum(LearningMetricType)
  metric_type: LearningMetricType;

  @ApiProperty({ description: 'Metric value' })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ description: 'Additional context about the measurement' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Associated debate/conversation ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  debate_id?: string;

  @ApiPropertyOptional({ description: 'Associated class ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional({ description: 'Baseline value for comparison' })
  @IsOptional()
  @IsNumber()
  comparison_baseline?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a learning metric
 */
export class UpdateLearningMetricDto {
  @ApiPropertyOptional({ description: 'Updated metric value' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Updated context' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Updated percentile rank' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  percentile_rank?: number;

  @ApiPropertyOptional({ description: 'Updated improvement rate' })
  @IsOptional()
  @IsNumber()
  improvement_rate?: number;

  @ApiPropertyOptional({ description: 'Updated metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for metric aggregation and analysis
 */
export class MetricAggregationDto {
  @ApiProperty({ enum: LearningMetricType, description: 'Type of metric' })
  @IsEnum(LearningMetricType)
  metric_type: LearningMetricType;

  @ApiProperty({ description: 'Average value across all measurements' })
  @IsNumber()
  average_value: number;

  @ApiProperty({ description: 'Minimum value recorded' })
  @IsNumber()
  min_value: number;

  @ApiProperty({ description: 'Maximum value recorded' })
  @IsNumber()
  max_value: number;

  @ApiProperty({ description: 'Standard deviation of values' })
  @IsNumber()
  standard_deviation: number;

  @ApiProperty({ description: 'Total number of measurements' })
  @IsNumber()
  measurement_count: number;

  @ApiProperty({ description: 'Trend over time' })
  @IsObject()
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    slope: number;
    confidence: number;
  };

  @ApiProperty({ description: 'Distribution percentiles' })
  @IsObject()
  percentiles: {
    p25: number;
    p50: number; // median
    p75: number;
    p90: number;
  };
}

/**
 * DTO for metric search and filtering
 */
export class MetricSearchDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Filter by class ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  class_id?: string;

  @ApiPropertyOptional({ description: 'Filter by debate ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  debate_id?: string;

  @ApiPropertyOptional({ 
    enum: LearningMetricType, 
    description: 'Filter by metric type' 
  })
  @IsOptional()
  @IsEnum(LearningMetricType)
  metric_type?: LearningMetricType;

  @ApiPropertyOptional({ description: 'Filter by measurement date range - start' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter by measurement date range - end' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Minimum metric value' })
  @IsOptional()
  @IsNumber()
  min_value?: number;

  @ApiPropertyOptional({ description: 'Maximum metric value' })
  @IsOptional()
  @IsNumber()
  max_value?: number;

  @ApiPropertyOptional({ description: 'Include trend analysis' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  include_trends?: boolean = false;

  @ApiPropertyOptional({ description: 'Include class comparisons' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  include_comparisons?: boolean = false;

  @ApiPropertyOptional({ description: 'Results per page', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Page offset', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sort_by?: string = 'measurement_date';

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc' = 'desc';
}

/**
 * Paginated metrics response
 */
export class PaginatedMetricsDto {
  @ApiProperty({ type: [LearningMetricDto], description: 'Array of learning metrics' })
  metrics: LearningMetricDto[];

  @ApiProperty({ description: 'Total count of metrics' })
  total: number;

  @ApiProperty({ description: 'Results per page' })
  limit: number;

  @ApiProperty({ description: 'Current page offset' })
  offset: number;

  @ApiProperty({ description: 'Whether there are more pages' })
  has_more: boolean;

  @ApiPropertyOptional({ description: 'Aggregation summary if requested' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetricAggregationDto)
  aggregation?: MetricAggregationDto;
}

/**
 * Learning progress overview DTO
 */
export class LearningProgressDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsUUID()
  user_id: string;

  @ApiProperty({ description: 'Progress metrics by type' })
  @IsObject()
  metrics_by_type: Record<string, {
    current_value: number;
    previous_value?: number;
    change: number;
    trend: 'improving' | 'declining' | 'stable';
    percentile_rank: number;
  }>;

  @ApiProperty({ description: 'Overall progress score (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  overall_progress_score: number;

  @ApiProperty({ description: 'Areas of strength' })
  @IsArray()
  strengths: string[];

  @ApiProperty({ description: 'Areas for improvement' })
  @IsArray()
  improvement_areas: string[];

  @ApiProperty({ description: 'Personalized recommendations' })
  @IsArray()
  recommendations: string[];

  @ApiProperty({ description: 'Progress tracking period' })
  @IsObject()
  tracking_period: {
    start_date: string;
    end_date: string;
    total_days: number;
    debates_analyzed: number;
  };

  @ApiProperty({ description: 'When progress was calculated' })
  @IsDateString()
  calculated_at: string;
}

/**
 * Class-level learning analytics DTO
 */
export class ClassLearningAnalyticsDto {
  @ApiProperty({ description: 'Class ID' })
  @IsString()
  @IsUUID()
  class_id: string;

  @ApiProperty({ description: 'Total students in class' })
  @IsNumber()
  total_students: number;

  @ApiProperty({ description: 'Students with metrics data' })
  @IsNumber()
  students_with_data: number;

  @ApiProperty({ description: 'Class averages by metric type' })
  @IsObject()
  class_averages: Record<string, number>;

  @ApiProperty({ description: 'Distribution statistics by metric type' })
  @IsObject()
  distributions: Record<string, {
    mean: number;
    median: number;
    std_dev: number;
    min: number;
    max: number;
    percentiles: Record<string, number>;
  }>;

  @ApiProperty({ description: 'Top performing students by metric' })
  @IsObject()
  top_performers: Record<string, Array<{
    user_id: string;
    value: number;
    rank: number;
  }>>;

  @ApiProperty({ description: 'Students who may need additional support' })
  @IsArray()
  at_risk_students: Array<{
    user_id: string;
    risk_factors: string[];
    recommended_interventions: string[];
  }>;

  @ApiProperty({ description: 'Class trends over time' })
  @IsObject()
  trends: Record<string, {
    direction: 'improving' | 'declining' | 'stable';
    change_rate: number;
    confidence: number;
  }>;

  @ApiProperty({ description: 'When analytics were calculated' })
  @IsDateString()
  calculated_at: string;
}
