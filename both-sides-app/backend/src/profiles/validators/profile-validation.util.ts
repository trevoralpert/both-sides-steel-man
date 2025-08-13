import { BadRequestException } from '@nestjs/common';
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Utility class for profile-specific validation logic
 */
export class ProfileValidationUtil {
  
  /**
   * Validate ideology scores structure and ranges
   */
  static validateIdeologyScores(scores: any): boolean {
    if (!scores || typeof scores !== 'object') {
      return false;
    }

    const validDimensions = [
      'conservative',
      'liberal', 
      'libertarian',
      'authoritarian',
      'progressive',
      'traditional'
    ];

    const scoreKeys = Object.keys(scores);
    
    // Check if all keys are valid dimensions
    const hasValidKeys = scoreKeys.every(key => 
      validDimensions.includes(key.toLowerCase())
    );
    
    if (!hasValidKeys) {
      return false;
    }

    // Check if all values are valid numbers between 0 and 1
    const hasValidValues = scoreKeys.every(key => {
      const value = scores[key];
      return typeof value === 'number' && value >= 0 && value <= 1;
    });

    return hasValidValues;
  }

  /**
   * Validate survey responses structure
   */
  static validateSurveyResponses(responses: any): boolean {
    if (!responses || typeof responses !== 'object') {
      return false;
    }

    // Must have questions and answers arrays
    if (!responses.questions || !Array.isArray(responses.questions)) {
      return false;
    }

    if (!responses.answers || !Array.isArray(responses.answers)) {
      return false;
    }

    // Questions and answers must have same length
    if (responses.questions.length !== responses.answers.length) {
      return false;
    }

    // Each question should be a non-empty string
    const validQuestions = responses.questions.every(q => 
      typeof q === 'string' && q.trim().length > 0
    );

    // Each answer should be a valid response
    const validAnswers = responses.answers.every(a => 
      a !== null && a !== undefined && 
      (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean')
    );

    return validQuestions && validAnswers;
  }

  /**
   * Validate belief summary content
   */
  static validateBeliefSummary(summary: string): boolean {
    if (!summary || typeof summary !== 'string') {
      return false;
    }

    // Must be between 10 and 5000 characters
    const trimmed = summary.trim();
    if (trimmed.length < 10 || trimmed.length > 5000) {
      return false;
    }

    // Should not contain only repetitive content
    const words = trimmed.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    
    // Must have reasonable word diversity (at least 50% unique words)
    if (uniqueWords.size < words.length * 0.5) {
      return false;
    }

    return true;
  }

  /**
   * Check if profile data is complete enough to mark as completed
   */
  static isProfileComplete(profileData: any): boolean {
    const requiredFields = [
      'survey_responses',
      'belief_summary',
      'ideology_scores'
    ];

    return requiredFields.every(field => {
      const value = profileData[field];
      if (!value) return false;

      switch (field) {
        case 'survey_responses':
          return this.validateSurveyResponses(value);
        case 'belief_summary':
          return this.validateBeliefSummary(value);
        case 'ideology_scores':
          return this.validateIdeologyScores(value);
        default:
          return true;
      }
    });
  }

  /**
   * Sanitize HTML and dangerous content from text fields
   */
  static sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[#\w]+;/g, '') // Remove HTML entities
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
}

/**
 * Custom validator for ideology scores
 */
export function IsValidIdeologyScores(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidIdeologyScores',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return ProfileValidationUtil.validateIdeologyScores(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid ideology scores object with values between 0 and 1`;
        },
      },
    });
  };
}

/**
 * Custom validator for survey responses
 */
export function IsValidSurveyResponses(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidSurveyResponses',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return ProfileValidationUtil.validateSurveyResponses(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid survey responses object with questions and answers arrays`;
        },
      },
    });
  };
}

/**
 * Custom validator for belief summary
 */
export function IsValidBeliefSummary(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidBeliefSummary',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return value ? ProfileValidationUtil.validateBeliefSummary(value) : true; // Optional field
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a meaningful belief summary between 10 and 5000 characters`;
        },
      },
    });
  };
}
