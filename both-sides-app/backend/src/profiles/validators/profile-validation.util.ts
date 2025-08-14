import { BadRequestException } from '@nestjs/common';
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Comprehensive validation rules and patterns for profile fields
 */
export const PROFILE_VALIDATION_RULES = {
  username: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    forbidden: [
      'admin', 'administrator', 'root', 'system', 'api', 'www', 'mail', 'ftp',
      'test', 'demo', 'guest', 'null', 'undefined', 'unknown', 'anonymous',
      'bothsides', 'debate', 'moderator', 'support', 'help', 'service'
    ],
    reservedPrefixes: ['admin_', 'sys_', 'api_', 'bot_', 'temp_']
  },
  email: {
    maxLength: 255,
    allowedDomains: [] as string[], // Empty means allow all, populated means restrict
    blockedDomains: [
      'tempmail.com', '10minutemail.com', 'guerrillamail.com', 
      'mailinator.com', 'yopmail.com', 'temp-mail.org'
    ],
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  },
  name: {
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z\s\-\'\.àáâãäåçèéêëìíîïñòóôõöùúûüýÿ]+$/u,
    blockedPatterns: [
      /^[0-9]+$/, // Only numbers
      /^[!@#$%^&*()]+$/, // Only special characters
      /(.)\1{4,}/, // More than 4 consecutive identical characters
    ]
  },
  belief_summary: {
    minLength: 10,
    maxLength: 5000,
    minWordCount: 5,
    maxWordDiversity: 0.3, // At least 30% unique words
    blockedPatterns: [
      /^(.{1,50})\1+$/, // Repetitive content
      /lorem ipsum/gi, // Lorem ipsum text
      /test{2,}/gi, // Multiple "test" words
    ]
  },
  ideology_scores: {
    validDimensions: [
      'conservative', 'liberal', 'libertarian', 'authoritarian',
      'progressive', 'traditional', 'populist', 'globalist'
    ],
    scoreRange: { min: 0, max: 1 },
    requiredDimensions: ['conservative', 'liberal'] // Minimum required
  },
  survey_responses: {
    minQuestions: 5,
    maxQuestions: 100,
    minResponseLength: 1,
    maxResponseLength: 1000
  }
};

/**
 * Utility class for profile-specific validation logic
 */
export class ProfileValidationUtil {

  /**
   * Comprehensive username validation with advanced rules
   */
  static validateUsername(username: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rules = PROFILE_VALIDATION_RULES.username;

    if (!username || typeof username !== 'string') {
      errors.push('Username is required and must be a string');
      return { isValid: false, errors };
    }

    const trimmed = username.trim().toLowerCase();

    // Length validation
    if (trimmed.length < rules.minLength) {
      errors.push(`Username must be at least ${rules.minLength} characters long`);
    }
    if (trimmed.length > rules.maxLength) {
      errors.push(`Username cannot exceed ${rules.maxLength} characters`);
    }

    // Pattern validation
    if (!rules.pattern.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Forbidden usernames
    if (rules.forbidden.includes(trimmed)) {
      errors.push('This username is reserved and cannot be used');
    }

    // Reserved prefixes
    const hasReservedPrefix = rules.reservedPrefixes.some(prefix => 
      trimmed.startsWith(prefix)
    );
    if (hasReservedPrefix) {
      errors.push('Username cannot start with reserved prefixes (admin_, sys_, api_, bot_, temp_)');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Comprehensive email validation with domain checking
   */
  static validateEmail(email: string, organizationDomain?: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rules = PROFILE_VALIDATION_RULES.email;

    if (!email || typeof email !== 'string') {
      errors.push('Email is required and must be a string');
      return { isValid: false, errors };
    }

    const trimmed = email.trim().toLowerCase();

    // Length validation
    if (trimmed.length > rules.maxLength) {
      errors.push(`Email cannot exceed ${rules.maxLength} characters`);
    }

    // Pattern validation
    if (!rules.pattern.test(trimmed)) {
      errors.push('Email format is invalid');
    }

    const domain = trimmed.split('@')[1];
    if (domain) {
      // Check blocked domains
      if (rules.blockedDomains.includes(domain)) {
        errors.push('Temporary email addresses are not allowed');
      }

      // Check allowed domains (if specified)
      if (rules.allowedDomains.length > 0 && !rules.allowedDomains.includes(domain)) {
        errors.push('Email domain is not allowed for this organization');
      }

      // Check organization domain match (if provided)
      if (organizationDomain && domain !== organizationDomain) {
        errors.push(`Email must use organization domain: ${organizationDomain}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Comprehensive name validation (first/last name)
   */
  static validateName(name: string, fieldName: string = 'Name'): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rules = PROFILE_VALIDATION_RULES.name;

    if (!name || typeof name !== 'string') {
      return { isValid: true, errors: [] }; // Names are optional
    }

    const trimmed = name.trim();

    // Length validation
    if (trimmed.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} character long`);
    }
    if (trimmed.length > rules.maxLength) {
      errors.push(`${fieldName} cannot exceed ${rules.maxLength} characters`);
    }

    // Pattern validation (supports international characters)
    if (!rules.pattern.test(trimmed)) {
      errors.push(`${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`);
    }

    // Check blocked patterns
    const hasBlockedPattern = rules.blockedPatterns.some(pattern => 
      pattern.test(trimmed)
    );
    if (hasBlockedPattern) {
      errors.push(`${fieldName} contains invalid patterns`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Enhanced ideology scores validation
   */
  static validateIdeologyScoresDetailed(scores: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rules = PROFILE_VALIDATION_RULES.ideology_scores;

    if (!scores || typeof scores !== 'object') {
      errors.push('Ideology scores must be an object');
      return { isValid: false, errors };
    }

    const scoreKeys = Object.keys(scores);
    
    // Check if required dimensions are present
    const missingRequired = rules.requiredDimensions.filter(dim => 
      !scoreKeys.includes(dim)
    );
    if (missingRequired.length > 0) {
      errors.push(`Required ideology dimensions missing: ${missingRequired.join(', ')}`);
    }

    // Check if all keys are valid dimensions
    const invalidKeys = scoreKeys.filter(key => 
      !rules.validDimensions.includes(key.toLowerCase())
    );
    if (invalidKeys.length > 0) {
      errors.push(`Invalid ideology dimensions: ${invalidKeys.join(', ')}`);
    }

    // Check if all values are valid numbers in range
    const invalidValues = scoreKeys.filter(key => {
      const value = scores[key];
      return typeof value !== 'number' || 
             value < rules.scoreRange.min || 
             value > rules.scoreRange.max;
    });
    if (invalidValues.length > 0) {
      errors.push(`Ideology scores must be numbers between ${rules.scoreRange.min} and ${rules.scoreRange.max}`);
    }

    // Check for reasonable score distribution (shouldn't be all 0s or all 1s)
    const values = scoreKeys.map(key => scores[key]).filter(v => typeof v === 'number');
    if (values.length > 0) {
      const allSame = values.every(v => v === values[0]);
      if (allSame && (values[0] === 0 || values[0] === 1)) {
        errors.push('Ideology scores should show some variation in beliefs');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Enhanced survey responses validation
   */
  static validateSurveyResponsesDetailed(responses: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rules = PROFILE_VALIDATION_RULES.survey_responses;

    if (!responses || typeof responses !== 'object') {
      errors.push('Survey responses must be an object');
      return { isValid: false, errors };
    }

    // Must have questions and answers arrays
    if (!responses.questions || !Array.isArray(responses.questions)) {
      errors.push('Survey responses must include a questions array');
    }

    if (!responses.answers || !Array.isArray(responses.answers)) {
      errors.push('Survey responses must include an answers array');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Questions and answers must have same length
    if (responses.questions.length !== responses.answers.length) {
      errors.push('Questions and answers arrays must have the same length');
    }

    // Check question count limits
    if (responses.questions.length < rules.minQuestions) {
      errors.push(`Survey must have at least ${rules.minQuestions} questions`);
    }
    if (responses.questions.length > rules.maxQuestions) {
      errors.push(`Survey cannot have more than ${rules.maxQuestions} questions`);
    }

    // Each question should be a non-empty string
    const invalidQuestions = responses.questions.filter((q, index) => 
      !q || typeof q !== 'string' || q.trim().length === 0
    );
    if (invalidQuestions.length > 0) {
      errors.push('All questions must be non-empty strings');
    }

    // Each answer should be a valid response with appropriate length
    const invalidAnswers = responses.answers.filter((a, index) => {
      if (a === null || a === undefined) {
        return true;
      }
      if (typeof a === 'string') {
        return a.length < rules.minResponseLength || a.length > rules.maxResponseLength;
      }
      return !(typeof a === 'number' || typeof a === 'boolean');
    });
    if (invalidAnswers.length > 0) {
      errors.push('All answers must be valid responses (string, number, or boolean) with appropriate length');
    }

    // Check for response diversity (shouldn't all be the same)
    if (responses.answers.length > 5) {
      const stringAnswers = responses.answers.filter(a => typeof a === 'string');
      if (stringAnswers.length > 0) {
        const uniqueAnswers = new Set(stringAnswers);
        if (uniqueAnswers.size === 1) {
          errors.push('Survey responses should show some variety, not all identical answers');
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Enhanced belief summary validation
   */
  static validateBeliefSummaryDetailed(summary: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rules = PROFILE_VALIDATION_RULES.belief_summary;

    if (!summary || typeof summary !== 'string') {
      return { isValid: true, errors: [] }; // Belief summary is optional
    }

    const trimmed = summary.trim();

    // Length validation
    if (trimmed.length < rules.minLength) {
      errors.push(`Belief summary must be at least ${rules.minLength} characters long`);
    }
    if (trimmed.length > rules.maxLength) {
      errors.push(`Belief summary cannot exceed ${rules.maxLength} characters`);
    }

    if (trimmed.length === 0) {
      return { isValid: errors.length === 0, errors };
    }

    // Word count validation
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    if (words.length < rules.minWordCount) {
      errors.push(`Belief summary must contain at least ${rules.minWordCount} words`);
    }

    // Check word diversity
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const diversity = uniqueWords.size / words.length;
    if (diversity < rules.maxWordDiversity) {
      errors.push('Belief summary should contain more diverse vocabulary');
    }

    // Check for blocked patterns
    const hasBlockedPattern = rules.blockedPatterns.some(pattern => 
      pattern.test(trimmed)
    );
    if (hasBlockedPattern) {
      errors.push('Belief summary contains inappropriate or placeholder content');
    }

    // Check for meaningful content (not just repeated characters or words)
    const singleCharRepeated = /^(.)\1+$/.test(trimmed);
    if (singleCharRepeated) {
      errors.push('Belief summary must contain meaningful content');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Enhanced profile completeness validation with role-based requirements
   */
  static validateProfileCompleteness(profileData: any, userRole?: string): { 
    isComplete: boolean; 
    completionPercentage: number; 
    missingFields: string[];
    errors: string[] 
  } {
    const errors: string[] = [];
    const missingFields: string[] = [];
    const totalFields = 3; // survey_responses, belief_summary, ideology_scores
    let completedFields = 0;

    // Define role-based requirements
    const roleRequirements = {
      'STUDENT': ['survey_responses', 'ideology_scores'],
      'TEACHER': ['survey_responses', 'belief_summary', 'ideology_scores'],
      'ADMIN': ['survey_responses', 'ideology_scores']
    };

    const requiredFields = roleRequirements[userRole || 'STUDENT'] || roleRequirements['STUDENT'];

    // Check each required field
    for (const field of requiredFields) {
      const value = profileData[field];
      
      if (!value) {
        missingFields.push(field);
        continue;
      }

      let fieldValid = false;
      switch (field) {
        case 'survey_responses':
          const surveyResult = this.validateSurveyResponsesDetailed(value);
          fieldValid = surveyResult.isValid;
          if (!fieldValid) {
            errors.push(...surveyResult.errors);
          }
          break;
        case 'belief_summary':
          const summaryResult = this.validateBeliefSummaryDetailed(value);
          fieldValid = summaryResult.isValid;
          if (!fieldValid) {
            errors.push(...summaryResult.errors);
          }
          break;
        case 'ideology_scores':
          const scoresResult = this.validateIdeologyScoresDetailed(value);
          fieldValid = scoresResult.isValid;
          if (!fieldValid) {
            errors.push(...scoresResult.errors);
          }
          break;
      }

      if (fieldValid) {
        completedFields++;
      } else {
        missingFields.push(field);
      }
    }

    const completionPercentage = (completedFields / totalFields) * 100;
    const isComplete = missingFields.length === 0 && errors.length === 0;

    return { isComplete, completionPercentage, missingFields, errors };
  }

  /**
   * Enhanced data sanitization pipeline with comprehensive cleaning
   */
  static sanitizeText(text: string, options: { 
    stripHtml?: boolean; 
    normalizeWhitespace?: boolean; 
    removeJavascript?: boolean; 
    maxLength?: number 
  } = {}): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const {
      stripHtml = true,
      normalizeWhitespace = true,
      removeJavascript = true,
      maxLength
    } = options;

    let sanitized = text;

    // Remove HTML tags if enabled
    if (stripHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
      sanitized = sanitized.replace(/&[#\w]+;/g, ''); // Remove HTML entities
    }

    // Remove JavaScript and dangerous content
    if (removeJavascript) {
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/on\w+\s*=/gi, '');
      sanitized = sanitized.replace(/expression\s*\(/gi, '');
      sanitized = sanitized.replace(/vbscript:/gi, '');
      sanitized = sanitized.replace(/data:text\/html/gi, '');
    }

    // Normalize whitespace
    if (normalizeWhitespace) {
      sanitized = sanitized.replace(/\s+/g, ' '); // Multiple spaces to single space
      sanitized = sanitized.replace(/\n\s*\n/g, '\n'); // Multiple newlines to single
      sanitized = sanitized.trim();
    }

    // Apply length limit
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Sanitize URL fields with validation
   */
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    const trimmed = url.trim();
    
    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = trimmed.toLowerCase();
    
    if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      return '';
    }

    // Ensure valid URL format
    try {
      const urlObj = new URL(trimmed);
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return '';
      }
      return urlObj.toString();
    } catch {
      return '';
    }
  }

  /**
   * Cross-field validation logic for profile consistency
   */
  static validateCrossFieldConsistency(profileData: any, userData?: any): { 
    isValid: boolean; 
    errors: string[] 
  } {
    const errors: string[] = [];

    // Validate email domain against organization (if provided)
    if (userData?.email && userData?.organization) {
      const emailResult = this.validateEmail(userData.email, userData.organization.domain);
      if (!emailResult.isValid) {
        errors.push(...emailResult.errors);
      }
    }

    // Check ideology scores consistency with belief summary
    if (profileData.ideology_scores && profileData.belief_summary) {
      // This could be enhanced with NLP analysis in the future
      const summary = profileData.belief_summary.toLowerCase();
      const scores = profileData.ideology_scores;
      
      // Basic consistency checks
      if (scores.conservative > 0.8 && summary.includes('progressive')) {
        errors.push('Ideology scores and belief summary show potential inconsistency');
      }
      if (scores.liberal > 0.8 && summary.includes('conservative')) {
        errors.push('Ideology scores and belief summary show potential inconsistency');
      }
    }

    // Validate survey responses consistency with ideology scores
    if (profileData.survey_responses && profileData.ideology_scores) {
      // This would require more sophisticated analysis based on survey content
      // For now, just check that both exist and are valid
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check username availability (placeholder for database integration)
   */
  static async checkUsernameAvailability(username: string, currentUserId?: string): Promise<{
    isAvailable: boolean;
    suggestions?: string[]
  }> {
    // This would integrate with the database service
    // For now, return basic validation
    const validation = this.validateUsername(username);
    
    if (!validation.isValid) {
      return { isAvailable: false };
    }

    // Placeholder logic - in real implementation, would check database
    const taken = ['admin', 'test', 'demo'];
    const isAvailable = !taken.includes(username.toLowerCase());

    const suggestions = isAvailable ? undefined : [
      `${username}${Math.floor(Math.random() * 100)}`,
      `${username}_user`,
      `${username}2024`
    ];

    return { isAvailable, suggestions };
  }

  // Keep backward compatibility for existing validators (renamed internal methods)
  static validateIdeologyScores(scores: any): boolean {
    const result = this.validateIdeologyScoresDetailed(scores);
    return result.isValid;
  }

  static validateSurveyResponses(responses: any): boolean {
    const result = this.validateSurveyResponsesDetailed(responses);
    return result.isValid;
  }

  static validateBeliefSummary(summary: string): boolean {
    const result = this.validateBeliefSummaryDetailed(summary);
    return result.isValid;
  }

  /**
   * Legacy profile completeness check for backward compatibility
   */
  static isProfileComplete(profileData: any): boolean {
    const result = this.validateProfileCompleteness(profileData);
    return result.isComplete;
  }
}

/**
 * Enhanced custom validator for ideology scores with detailed errors
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
          const result = ProfileValidationUtil.validateIdeologyScoresDetailed(args.value);
          return result.errors.length > 0 ? result.errors.join('; ') : 
            `${args.property} must be a valid ideology scores object with values between 0 and 1`;
        },
      },
    });
  };
}

/**
 * Custom validator for comprehensive username validation
 */
export function IsValidUsername(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidUsername',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Optional field
          const result = ProfileValidationUtil.validateUsername(value);
          return result.isValid;
        },
        defaultMessage(args: ValidationArguments) {
          const result = ProfileValidationUtil.validateUsername(args.value || '');
          return result.errors.length > 0 ? result.errors.join('; ') : 
            `${args.property} must be a valid username`;
        },
      },
    });
  };
}

/**
 * Custom validator for comprehensive email validation
 */
export function IsValidEmailDetailed(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidEmailDetailed',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Optional field
          const result = ProfileValidationUtil.validateEmail(value);
          return result.isValid;
        },
        defaultMessage(args: ValidationArguments) {
          const result = ProfileValidationUtil.validateEmail(args.value || '');
          return result.errors.length > 0 ? result.errors.join('; ') : 
            `${args.property} must be a valid email address`;
        },
      },
    });
  };
}

/**
 * Custom validator for name fields
 */
export function IsValidName(fieldName: string = 'Name', validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const result = ProfileValidationUtil.validateName(value, fieldName);
          return result.isValid;
        },
        defaultMessage(args: ValidationArguments) {
          const result = ProfileValidationUtil.validateName(args.value || '', fieldName);
          return result.errors.length > 0 ? result.errors.join('; ') : 
            `${fieldName} must be valid`;
        },
      },
    });
  };
}

/**
 * Data sanitization transformer for text fields
 */
export function SanitizeText(options: { 
  stripHtml?: boolean; 
  normalizeWhitespace?: boolean; 
  removeJavascript?: boolean; 
  maxLength?: number 
} = {}) {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return ProfileValidationUtil.sanitizeText(value, options);
    }
    return value;
  });
}

/**
 * URL sanitization transformer
 */
export function SanitizeUrl() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return ProfileValidationUtil.sanitizeUrl(value);
    }
    return value;
  });
}

/**
 * Enhanced custom validator for survey responses
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
          const result = ProfileValidationUtil.validateSurveyResponsesDetailed(args.value);
          return result.errors.length > 0 ? result.errors.join('; ') : 
            `${args.property} must be a valid survey responses object with questions and answers arrays`;
        },
      },
    });
  };
}

/**
 * Enhanced custom validator for belief summary
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
          if (!args.value) return `${args.property} is optional`;
          const result = ProfileValidationUtil.validateBeliefSummaryDetailed(args.value);
          return result.errors.length > 0 ? result.errors.join('; ') : 
            `${args.property} must be a meaningful belief summary between 10 and 5000 characters`;
        },
      },
    });
  };
}
