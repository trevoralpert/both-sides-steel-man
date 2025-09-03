import { plainToInstance, instanceToPlain, Transform, Type, ClassConstructor } from 'class-transformer';
import { Logger } from '@nestjs/common';
import { 
  ReflectionResponseDto, 
  CreateReflectionDto, 
  UpdateReflectionDto 
} from './reflection-response.dto';
import { 
  LearningMetricDto, 
  CreateLearningMetricDto,
  LearningProgressDto 
} from './learning-metric.dto';
import { 
  ReflectionTemplateDto, 
  CreateReflectionTemplateDto 
} from './reflection-template.dto';
import { 
  DebateTranscriptDto, 
  ParticipantAnalysisDto, 
  LearningInsightDto,
  AnalysisResultDto 
} from './debate-analysis.dto';

/**
 * Serialization configuration interface
 */
export interface SerializationConfig {
  excludeExtraneousValues?: boolean;
  enableImplicitConversion?: boolean;
  groups?: string[];
  excludeKeys?: string[];
  includeKeys?: string[];
  maxNestingDepth?: number;
}

/**
 * Transformation result interface
 */
export interface TransformationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

/**
 * Default serialization configuration
 */
const DEFAULT_CONFIG: SerializationConfig = {
  excludeExtraneousValues: true,
  enableImplicitConversion: true,
  maxNestingDepth: 10,
};

/**
 * Utility class for safe serialization and deserialization of reflection system DTOs
 */
export class SerializationUtils {
  private static readonly logger = new Logger(SerializationUtils.name);

  /**
   * Safely transform plain object to DTO instance
   */
  static toDTO<T>(
    cls: ClassConstructor<T>,
    plain: any,
    config: SerializationConfig = DEFAULT_CONFIG
  ): TransformationResult<T> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate input
      if (plain === null || plain === undefined) {
        return {
          success: false,
          errors: ['Input data is null or undefined'],
          warnings,
        };
      }

      // Pre-process data
      const sanitized = this.sanitizeInput(plain, config);
      
      if (sanitized.warnings.length > 0) {
        warnings.push(...sanitized.warnings);
      }

      // Transform to DTO
      const instance = plainToInstance(cls, sanitized.data, {
        excludeExtraneousValues: config.excludeExtraneousValues,
        enableImplicitConversion: config.enableImplicitConversion,
        groups: config.groups,
      });

      return {
        success: true,
        data: instance,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Transformation to DTO failed: ${error.message}`, error.stack);
      return {
        success: false,
        errors: [`Transformation error: ${error.message}`],
        warnings,
      };
    }
  }

  /**
   * Safely transform DTO instance to plain object
   */
  static toPlain<T>(
    instance: T,
    config: SerializationConfig = DEFAULT_CONFIG
  ): TransformationResult<any> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (instance === null || instance === undefined) {
        return {
          success: false,
          errors: ['Instance is null or undefined'],
          warnings,
        };
      }

      const plain = instanceToPlain(instance, {
        excludeExtraneousValues: config.excludeExtraneousValues,
        groups: config.groups,
      });

      // Post-process the result
      const sanitized = this.sanitizeOutput(plain, config);
      
      if (sanitized.warnings.length > 0) {
        warnings.push(...sanitized.warnings);
      }

      return {
        success: true,
        data: sanitized.data,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Transformation to plain failed: ${error.message}`, error.stack);
      return {
        success: false,
        errors: [`Transformation error: ${error.message}`],
        warnings,
      };
    }
  }

  /**
   * Transform database model to reflection response DTO
   */
  static toReflectionResponseDTO(dbModel: any): TransformationResult<ReflectionResponseDto> {
    try {
      // Transform reflection_data from JSONB if needed
      const transformedData = {
        ...dbModel,
        reflection_data: typeof dbModel.reflection_data === 'string' 
          ? JSON.parse(dbModel.reflection_data)
          : dbModel.reflection_data,
      };

      return this.toDTO(ReflectionResponseDto, transformedData);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to transform reflection model: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Transform database model to learning metric DTO
   */
  static toLearningMetricDTO(dbModel: any): TransformationResult<LearningMetricDto> {
    try {
      const transformedData = {
        ...dbModel,
        context: typeof dbModel.context === 'string' 
          ? JSON.parse(dbModel.context)
          : dbModel.context,
        metadata: typeof dbModel.metadata === 'string'
          ? JSON.parse(dbModel.metadata)
          : dbModel.metadata,
      };

      return this.toDTO(LearningMetricDto, transformedData);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to transform learning metric model: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Transform database model to reflection template DTO
   */
  static toReflectionTemplateDTO(dbModel: any): TransformationResult<ReflectionTemplateDto> {
    try {
      const transformedData = {
        ...dbModel,
        options: typeof dbModel.options === 'string'
          ? JSON.parse(dbModel.options)
          : dbModel.options,
        metadata: typeof dbModel.metadata === 'string'
          ? JSON.parse(dbModel.metadata)
          : dbModel.metadata,
      };

      return this.toDTO(ReflectionTemplateDto, transformedData);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to transform template model: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Transform database models to debate transcript DTO
   */
  static toDebateTranscriptDTO(dbModel: any): TransformationResult<DebateTranscriptDto> {
    try {
      const transformedData = {
        ...dbModel,
        // Transform dates to ISO strings
        started_at: dbModel.started_at?.toISOString(),
        ended_at: dbModel.ended_at?.toISOString(),
        // Process messages array
        messages: dbModel.messages?.map((msg: any) => ({
          ...msg,
          created_at: msg.created_at?.toISOString(),
          updated_at: msg.updated_at?.toISOString(),
          edited_at: msg.edited_at?.toISOString(),
        })) || [],
      };

      return this.toDTO(DebateTranscriptDto, transformedData);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to transform transcript model: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Transform database model to learning insight DTO
   */
  static toLearningInsightDTO(dbModel: any): TransformationResult<LearningInsightDto> {
    try {
      const transformedData = {
        ...dbModel,
        payload: typeof dbModel.payload === 'string'
          ? JSON.parse(dbModel.payload)
          : dbModel.payload,
        metadata: typeof dbModel.metadata === 'string'
          ? JSON.parse(dbModel.metadata)
          : dbModel.metadata,
        created_at: dbModel.created_at?.toISOString(),
        updated_at: dbModel.updated_at?.toISOString(),
      };

      return this.toDTO(LearningInsightDto, transformedData);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to transform insight model: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Batch transform array of models to DTOs
   */
  static batchTransform<T>(
    cls: ClassConstructor<T>,
    models: any[],
    config: SerializationConfig = DEFAULT_CONFIG
  ): TransformationResult<T[]> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const results: T[] = [];

    for (const [index, model] of models.entries()) {
      const result = this.toDTO(cls, model, config);
      
      if (result.success && result.data) {
        results.push(result.data);
      } else {
        errors.push(...result.errors.map(err => `Item ${index}: ${err}`));
      }
      
      warnings.push(...result.warnings.map(warn => `Item ${index}: ${warn}`));
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? results : undefined,
      errors,
      warnings,
    };
  }

  /**
   * Create learning progress DTO from multiple metrics
   */
  static createLearningProgressDTO(
    userId: string,
    metrics: any[],
    additionalData: any = {}
  ): TransformationResult<LearningProgressDto> {
    try {
      const metricsByType = metrics.reduce((acc, metric) => {
        const type = metric.metric_type;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(metric);
        return acc;
      }, {});

      // Calculate progress for each metric type
      const progressData = Object.entries(metricsByType).reduce((acc, [type, typeMetrics]) => {
        const sortedMetrics = (typeMetrics as any[]).sort((a, b) => 
          new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
        );

        const current = sortedMetrics[sortedMetrics.length - 1];
        const previous = sortedMetrics.length > 1 ? sortedMetrics[sortedMetrics.length - 2] : null;

        acc[type] = {
          current_value: current.value,
          previous_value: previous?.value,
          change: previous ? current.value - previous.value : 0,
          trend: this.calculateTrend(sortedMetrics),
          percentile_rank: current.percentile_rank || 0.5,
        };

        return acc;
      }, {} as Record<string, any>);

      const progressDto = {
        user_id: userId,
        metrics_by_type: progressData,
        overall_progress_score: this.calculateOverallProgress(progressData),
        strengths: this.identifyStrengths(progressData),
        improvement_areas: this.identifyImprovementAreas(progressData),
        recommendations: this.generateRecommendations(progressData),
        tracking_period: {
          start_date: metrics.length > 0 ? 
            new Date(Math.min(...metrics.map(m => new Date(m.measurement_date).getTime()))).toISOString() : 
            new Date().toISOString(),
          end_date: metrics.length > 0 ? 
            new Date(Math.max(...metrics.map(m => new Date(m.measurement_date).getTime()))).toISOString() : 
            new Date().toISOString(),
          total_days: this.calculateDaysBetween(metrics),
          debates_analyzed: new Set(metrics.map(m => m.debate_id).filter(Boolean)).size,
        },
        calculated_at: new Date().toISOString(),
        ...additionalData,
      };

      return this.toDTO(LearningProgressDto, progressDto);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to create progress DTO: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Sanitize input data before transformation
   */
  private static sanitizeInput(data: any, config: SerializationConfig): {
    data: any;
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    try {
      let sanitized = this.deepClone(data);

      // Apply key filtering
      if (config.excludeKeys || config.includeKeys) {
        sanitized = this.filterKeys(sanitized, config.excludeKeys, config.includeKeys);
      }

      // Limit nesting depth
      if (config.maxNestingDepth !== undefined) {
        sanitized = this.limitNestingDepth(sanitized, config.maxNestingDepth);
      }

      // Handle circular references
      sanitized = this.removeCircularReferences(sanitized);

      return { data: sanitized, warnings };
    } catch (error) {
      warnings.push(`Input sanitization warning: ${error.message}`);
      return { data: data, warnings };
    }
  }

  /**
   * Sanitize output data after transformation
   */
  private static sanitizeOutput(data: any, config: SerializationConfig): {
    data: any;
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    try {
      let sanitized = data;

      // Remove undefined values
      sanitized = this.removeUndefinedValues(sanitized);

      // Ensure date strings are properly formatted
      sanitized = this.normalizeDateStrings(sanitized);

      return { data: sanitized, warnings };
    } catch (error) {
      warnings.push(`Output sanitization warning: ${error.message}`);
      return { data: data, warnings };
    }
  }

  // Helper methods

  private static deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  private static filterKeys(
    obj: any, 
    excludeKeys?: string[], 
    includeKeys?: string[]
  ): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.filterKeys(item, excludeKeys, includeKeys));
    }

    const filtered: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const shouldExclude = excludeKeys?.includes(key) || false;
        const shouldInclude = includeKeys ? includeKeys.includes(key) : true;

        if (!shouldExclude && shouldInclude) {
          filtered[key] = this.filterKeys(obj[key], excludeKeys, includeKeys);
        }
      }
    }

    return filtered;
  }

  private static limitNestingDepth(obj: any, maxDepth: number, currentDepth = 0): any {
    if (currentDepth >= maxDepth || typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.limitNestingDepth(item, maxDepth, currentDepth + 1));
    }

    const limited: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        limited[key] = this.limitNestingDepth(obj[key], maxDepth, currentDepth + 1);
      }
    }

    return limited;
  }

  private static removeCircularReferences(obj: any, seen = new WeakSet()): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (seen.has(obj)) {
      return '[Circular Reference]';
    }

    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeCircularReferences(item, seen));
    }

    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = this.removeCircularReferences(obj[key], seen);
      }
    }

    return result;
  }

  private static removeUndefinedValues(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj
        .filter(item => item !== undefined)
        .map(item => this.removeUndefinedValues(item));
    }

    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
        cleaned[key] = this.removeUndefinedValues(obj[key]);
      }
    }

    return cleaned;
  }

  private static normalizeDateStrings(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeDateStrings(item));
    }

    const normalized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        // Check if this looks like a date field and ensure ISO format
        if (typeof value === 'string' && (
          key.includes('_at') || 
          key.includes('date') || 
          key.includes('time')
        )) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              normalized[key] = date.toISOString();
            } else {
              normalized[key] = value;
            }
          } catch {
            normalized[key] = value;
          }
        } else {
          normalized[key] = this.normalizeDateStrings(value);
        }
      }
    }

    return normalized;
  }

  // Analysis helper methods

  private static calculateTrend(metrics: any[]): 'improving' | 'declining' | 'stable' {
    if (metrics.length < 2) return 'stable';

    const values = metrics.map(m => m.value);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private static calculateOverallProgress(progressData: Record<string, any>): number {
    const values = Object.values(progressData).map((data: any) => data.current_value);
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private static identifyStrengths(progressData: Record<string, any>): string[] {
    const strengths: string[] = [];
    
    for (const [type, data] of Object.entries(progressData)) {
      const typedData = data as any;
      if (typedData.percentile_rank > 0.7 || typedData.trend === 'improving') {
        strengths.push(type);
      }
    }

    return strengths;
  }

  private static identifyImprovementAreas(progressData: Record<string, any>): string[] {
    const areas: string[] = [];
    
    for (const [type, data] of Object.entries(progressData)) {
      const typedData = data as any;
      if (typedData.percentile_rank < 0.3 || typedData.trend === 'declining') {
        areas.push(type);
      }
    }

    return areas;
  }

  private static generateRecommendations(progressData: Record<string, any>): string[] {
    const recommendations: string[] = [];
    
    for (const [type, data] of Object.entries(progressData)) {
      const typedData = data as any;
      if (typedData.trend === 'declining') {
        recommendations.push(`Focus on improving ${type} through targeted practice`);
      }
    }

    return recommendations;
  }

  private static calculateDaysBetween(metrics: any[]): number {
    if (metrics.length < 2) return 0;
    
    const dates = metrics.map(m => new Date(m.measurement_date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    
    return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  }
}
