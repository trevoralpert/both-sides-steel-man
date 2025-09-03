import { plainToInstance, Transform, Type } from 'class-transformer';
import { validateSync, ValidationError, IsOptional, ValidateNested, IsArray, IsObject } from 'class-validator';

/**
 * Validation error result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any;
}

/**
 * Base validation schema class
 */
export abstract class BaseValidationSchema {
  /**
   * Validate the current instance
   */
  validate(): ValidationResult {
    const errors = validateSync(this, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    return {
      isValid: errors.length === 0,
      errors: this.formatValidationErrors(errors),
      data: errors.length === 0 ? this : undefined,
    };
  }

  /**
   * Format validation errors into readable messages
   */
  private formatValidationErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];

    const extractErrors = (error: ValidationError, path = ''): void => {
      const currentPath = path ? `${path}.${error.property}` : error.property;

      if (error.constraints) {
        Object.values(error.constraints).forEach(constraint => {
          messages.push(`${currentPath}: ${constraint}`);
        });
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach(child => extractErrors(child, currentPath));
      }
    };

    errors.forEach(error => extractErrors(error));
    return messages;
  }

  /**
   * Static method to validate and transform plain object
   */
  static validateAndTransform<T extends BaseValidationSchema>(
    this: new () => T,
    plain: any
  ): ValidationResult {
    try {
      const instance = plainToInstance(this, plain, {
        enableImplicitConversion: true,
        excludeExtraneousValues: true,
      });

      return instance.validate();
    } catch (error) {
      return {
        isValid: false,
        errors: [`Transformation error: ${error.message}`],
      };
    }
  }
}

/**
 * Reflection data validation schema
 */
export class ReflectionDataSchema extends BaseValidationSchema {
  @IsOptional()
  @IsObject()
  responses?: Record<string, {
    question_id: string;
    question_text: string;
    response: string;
    confidence_level?: number;
    time_spent_seconds?: number;
    metadata?: Record<string, any>;
  }>;

  @IsOptional()
  @IsObject()
  self_assessment?: {
    position_change?: {
      before: string;
      after: string;
      certainty_before: number;
      certainty_after: number;
    };
    learning_perception?: {
      new_perspectives: string[];
      changed_views: string[];
      key_takeaways: string[];
    };
    debate_experience?: {
      satisfaction: number;
      difficulty: number;
      engagement: number;
      would_recommend: boolean;
    };
  };

  @IsOptional()
  @IsObject()
  media_attachments?: Array<{
    type: 'text' | 'audio' | 'video' | 'image';
    url?: string;
    content?: string;
    duration_seconds?: number;
    file_size_bytes?: number;
    metadata?: Record<string, any>;
  }>;

  @IsOptional()
  @IsArray()
  follow_up_questions?: Array<{
    question: string;
    response: string;
    generated_by: 'ai' | 'teacher' | 'peer';
    timestamp: string;
  }>;

  @IsOptional()
  @IsObject()
  analysis_consent?: {
    share_anonymously: boolean;
    use_for_research: boolean;
    include_in_class_analytics: boolean;
    data_retention_preference: 'standard' | 'extended' | 'minimal';
  };
}

/**
 * Learning analytics payload validation schema
 */
export class LearningAnalyticsSchema extends BaseValidationSchema {
  @IsOptional()
  @IsObject()
  argument_analysis?: {
    claim_quality: number;
    evidence_strength: number;
    logical_coherence: number;
    counterargument_awareness: number;
    source_credibility: number;
  };

  @IsOptional()
  @IsObject()
  communication_skills?: {
    clarity: number;
    persuasiveness: number;
    respectfulness: number;
    active_listening: number;
    question_quality: number;
  };

  @IsOptional()
  @IsObject()
  critical_thinking?: {
    analysis_depth: number;
    assumption_questioning: number;
    bias_recognition: number;
    multiple_perspectives: number;
    conclusion_validity: number;
  };

  @IsOptional()
  @IsObject()
  engagement_metrics?: {
    participation_consistency: number;
    response_timeliness: number;
    interaction_quality: number;
    topic_adherence: number;
    peer_interaction: number;
  };

  @IsOptional()
  @IsObject()
  learning_progression?: {
    skill_improvement_rate: number;
    knowledge_retention: number;
    application_ability: number;
    metacognitive_awareness: number;
    transfer_capability: number;
  };
}

/**
 * AI analysis result validation schema
 */
export class AIAnalysisResultSchema extends BaseValidationSchema {
  @IsOptional()
  @IsObject()
  transcript_analysis?: {
    sentiment_scores: Record<string, number>;
    topic_coherence: number;
    argument_structure: Record<string, any>;
    linguistic_features: Record<string, any>;
    interaction_patterns: Record<string, any>;
  };

  @IsOptional()
  @IsObject()
  debate_summary?: {
    key_points: string[];
    resolution_attempts: string[];
    common_ground: string[];
    persistent_disagreements: string[];
    debate_quality_score: number;
  };

  @IsOptional()
  @IsObject()
  argument_analysis?: {
    arguments_by_participant: Record<string, Array<{
      claim: string;
      evidence: string[];
      warrants: string[];
      strength_score: number;
      fallacies: string[];
    }>>;
    overall_argument_quality: number;
    evidence_quality_distribution: Record<string, number>;
  };

  @IsOptional()
  @IsObject()
  learning_insights?: {
    personalized_feedback: Record<string, string[]>;
    skill_assessments: Record<string, Record<string, number>>;
    improvement_recommendations: Record<string, Array<{
      category: string;
      suggestion: string;
      priority: string;
      resources: string[];
    }>>;
    learning_objectives_met: Record<string, boolean>;
  };
}

/**
 * Template validation schema for dynamic prompts
 */
export class TemplateValidationSchema extends BaseValidationSchema {
  @IsOptional()
  @IsObject()
  prompt_variables?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    default_value?: any;
    description?: string;
    validation_rules?: Record<string, any>;
  }>;

  @IsOptional()
  @IsObject()
  response_format?: {
    expected_type: 'text' | 'structured' | 'multimedia';
    min_length?: number;
    max_length?: number;
    required_fields?: string[];
    validation_schema?: Record<string, any>;
  };

  @IsOptional()
  @IsObject()
  scoring_criteria?: {
    dimension: string;
    weight: number;
    rubric: Array<{
      level: number;
      description: string;
      indicators: string[];
    }>;
  };

  @IsOptional()
  @IsObject()
  adaptive_features?: {
    difficulty_adjustment: boolean;
    personalization_factors: string[];
    context_requirements: string[];
    follow_up_triggers: Record<string, any>;
  };
}

/**
 * Validation utility functions
 */
export class ValidationUtils {
  /**
   * Validate reflection data structure
   */
  static validateReflectionData(data: any): ValidationResult {
    return ReflectionDataSchema.validateAndTransform(data);
  }

  /**
   * Validate learning analytics payload
   */
  static validateLearningAnalytics(data: any): ValidationResult {
    return LearningAnalyticsSchema.validateAndTransform(data);
  }

  /**
   * Validate AI analysis results
   */
  static validateAIAnalysisResult(data: any): ValidationResult {
    return AIAnalysisResultSchema.validateAndTransform(data);
  }

  /**
   * Validate template configuration
   */
  static validateTemplate(data: any): ValidationResult {
    return TemplateValidationSchema.validateAndTransform(data);
  }

  /**
   * Sanitize and validate nested object structures
   */
  static sanitizeNestedObject(obj: any, maxDepth = 5, currentDepth = 0): any {
    if (currentDepth >= maxDepth) {
      return null;
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj
        .slice(0, 100) // Limit array size
        .map(item => this.sanitizeNestedObject(item, maxDepth, currentDepth + 1));
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      const keys = Object.keys(obj).slice(0, 50); // Limit object keys
      
      for (const key of keys) {
        // Skip potentially dangerous keys
        if (this.isSafeKey(key)) {
          sanitized[key] = this.sanitizeNestedObject(obj[key], maxDepth, currentDepth + 1);
        }
      }
      
      return sanitized;
    }

    // Handle primitive types
    if (typeof obj === 'string') {
      return obj.slice(0, 10000); // Limit string length
    }

    return obj;
  }

  /**
   * Check if object key is safe for processing
   */
  private static isSafeKey(key: string): boolean {
    const unsafeKeys = [
      '__proto__',
      'constructor',
      'prototype',
      'eval',
      'function',
      'script',
    ];

    return !unsafeKeys.some(unsafe => key.toLowerCase().includes(unsafe));
  }

  /**
   * Validate JSON schema structure
   */
  static validateJSONSchema(data: any, schema: any): ValidationResult {
    try {
      // Basic structural validation
      if (schema.required) {
        for (const requiredField of schema.required) {
          if (!(requiredField in data)) {
            return {
              isValid: false,
              errors: [`Missing required field: ${requiredField}`],
            };
          }
        }
      }

      if (schema.properties) {
        for (const [key, value] of Object.entries(data)) {
          if (schema.properties[key]) {
            const fieldSchema = schema.properties[key];
            const fieldValidation = this.validateField(value, fieldSchema, key);
            if (!fieldValidation.isValid) {
              return fieldValidation;
            }
          }
        }
      }

      return {
        isValid: true,
        errors: [],
        data: data,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Schema validation error: ${error.message}`],
      };
    }
  }

  /**
   * Validate individual field against schema
   */
  private static validateField(value: any, schema: any, fieldName: string): ValidationResult {
    const errors: string[] = [];

    // Type validation
    if (schema.type) {
      const expectedType = schema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (actualType !== expectedType) {
        errors.push(`${fieldName}: expected ${expectedType}, got ${actualType}`);
      }
    }

    // Range validation for numbers
    if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) {
      errors.push(`${fieldName}: value ${value} is below minimum ${schema.minimum}`);
    }

    if (schema.maximum !== undefined && typeof value === 'number' && value > schema.maximum) {
      errors.push(`${fieldName}: value ${value} exceeds maximum ${schema.maximum}`);
    }

    // Length validation for strings and arrays
    if (schema.minLength !== undefined && (typeof value === 'string' || Array.isArray(value))) {
      if (value.length < schema.minLength) {
        errors.push(`${fieldName}: length ${value.length} is below minimum ${schema.minLength}`);
      }
    }

    if (schema.maxLength !== undefined && (typeof value === 'string' || Array.isArray(value))) {
      if (value.length > schema.maxLength) {
        errors.push(`${fieldName}: length ${value.length} exceeds maximum ${schema.maxLength}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: value,
    };
  }

  /**
   * Deep clone object with validation
   */
  static safeClone<T>(obj: T): T {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      throw new Error(`Failed to clone object: ${error.message}`);
    }
  }

  /**
   * Merge validation results
   */
  static mergeValidationResults(results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(result => result.errors);
    const isValid = results.every(result => result.isValid);

    return {
      isValid,
      errors: allErrors,
      data: isValid ? results.map(result => result.data) : undefined,
    };
  }
}
