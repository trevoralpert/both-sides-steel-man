import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Prisma } from '@prisma/client';
import { ValidationError } from 'class-validator';

export interface DetailedValidationError {
  field: string;
  value: any;
  errors: string[];
  suggestions?: string[];
  helpText?: string;
}

export interface EnhancedErrorResponse {
  success: false;
  message: string;
  details?: {
    type: string;
    validationErrors?: DetailedValidationError[];
    helpText?: string;
    suggestions?: string[];
  };
  timestamp: string;
  path: string;
}

@Injectable()
export class ProfileErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ProfileErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const user = request.user;
        const path = request.url;
        
        // Log the error with context
        this.logger.error(
          `Profile operation failed for user ${user?.sub || 'unknown'}: ${error.message}`,
          error.stack
        );

        // Create enhanced error response
        const enhancedError = this.createEnhancedErrorResponse(error, path);

        // Handle specific error types with enhanced responses
        if (error instanceof BadRequestException) {
          const validationError = this.handleValidationError(error);
          return throwError(() => new HttpException(validationError, HttpStatus.BAD_REQUEST));
        }

        if (error instanceof HttpException) {
          // Enhance existing HTTP exceptions with our format
          const enhancedResponse = this.enhanceHttpException(error, path);
          return throwError(() => new HttpException(enhancedResponse, error.getStatus()));
        }

        // Handle Prisma errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          const prismaError = this.handlePrismaError(error, path);
          return throwError(() => prismaError);
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
          const validationError = this.handlePrismaValidationError(error, path);
          return throwError(() => new HttpException(validationError, HttpStatus.BAD_REQUEST));
        }

        // Handle class-validator validation errors
        if (Array.isArray(error) && error[0] instanceof ValidationError) {
          const validationError = this.handleClassValidatorErrors(error, path);
          return throwError(() => new HttpException(validationError, HttpStatus.BAD_REQUEST));
        }

        // Handle custom validation errors
        if (error.name === 'ValidationError' || error.validationErrors) {
          const customValidationError = this.handleCustomValidationError(error, path);
          return throwError(() => new HttpException(customValidationError, HttpStatus.BAD_REQUEST));
        }

        // Generic server error
        const genericError = this.createEnhancedErrorResponse(error, path, 'INTERNAL_SERVER_ERROR');
        return throwError(() => new HttpException(genericError, HttpStatus.INTERNAL_SERVER_ERROR));
      })
    );
  }

  /**
   * Create enhanced error response with detailed information
   */
  private createEnhancedErrorResponse(
    error: any, 
    path: string, 
    type: string = 'VALIDATION_ERROR'
  ): EnhancedErrorResponse {
    return {
      success: false,
      message: error.message || 'An error occurred',
      details: {
        type,
        helpText: this.getHelpTextForError(type),
        suggestions: this.getSuggestionsForError(error, type),
      },
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /**
   * Handle class-validator validation errors with detailed field-level information
   */
  private handleClassValidatorErrors(errors: ValidationError[], path: string): EnhancedErrorResponse {
    const validationErrors: DetailedValidationError[] = [];
    
    const processError = (error: ValidationError, parentPath = '') => {
      const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;
      
      if (error.constraints) {
        const fieldErrors = Object.values(error.constraints);
        validationErrors.push({
          field: fieldPath,
          value: error.value,
          errors: fieldErrors,
          suggestions: this.getFieldSuggestions(fieldPath, error.value, fieldErrors),
          helpText: this.getFieldHelpText(fieldPath)
        });
      }
      
      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        error.children.forEach(child => processError(child, fieldPath));
      }
    };

    errors.forEach(error => processError(error));

    return {
      success: false,
      message: 'Validation failed',
      details: {
        type: 'VALIDATION_ERROR',
        validationErrors,
        helpText: 'Please correct the validation errors below and try again.',
        suggestions: this.getGeneralValidationSuggestions(validationErrors)
      },
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /**
   * Handle Prisma database errors with enhanced information
   */
  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError, path: string): HttpException {
    let message: string;
    let status: HttpStatus;
    let helpText: string;
    let suggestions: string[] = [];

    switch (error.code) {
      case 'P2002':
        const duplicateField = error.meta?.target as string[] | string;
        const fieldName = Array.isArray(duplicateField) ? duplicateField.join(', ') : duplicateField;
        message = `A profile already exists with this ${fieldName || 'information'}`;
        status = HttpStatus.CONFLICT;
        helpText = 'This error occurs when trying to create a duplicate entry.';
        suggestions = [
          'Check if a profile already exists for this user',
          'Use the update endpoint instead of create',
          'Verify the user ID is correct'
        ];
        break;
      
      case 'P2025':
        message = 'Profile not found';
        status = HttpStatus.NOT_FOUND;
        helpText = 'The requested profile does not exist in the database.';
        suggestions = [
          'Verify the profile ID is correct',
          'Check if the profile was recently deleted',
          'Ensure the user has permission to access this profile'
        ];
        break;
      
      case 'P2003':
        message = 'Invalid user reference';
        status = HttpStatus.BAD_REQUEST;
        helpText = 'The referenced user does not exist.';
        suggestions = [
          'Verify the user ID exists',
          'Check if the user was recently deleted',
          'Ensure the user ID format is correct (UUID)'
        ];
        break;
      
      case 'P2021':
        message = 'Database table does not exist';
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        helpText = 'The database schema is not properly configured.';
        suggestions = [
          'Contact system administrator',
          'Check if database migrations have been run'
        ];
        break;
      
      default:
        message = 'Database operation failed';
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        helpText = 'An unexpected database error occurred.';
        suggestions = [
          'Try the operation again',
          'Contact support if the problem persists'
        ];
    }

    const enhancedResponse: EnhancedErrorResponse = {
      success: false,
      message,
      details: {
        type: 'DATABASE_ERROR',
        helpText,
        suggestions
      },
      timestamp: new Date().toISOString(),
      path,
    };

    return new HttpException(enhancedResponse, status);
  }

  /**
   * Handle Prisma validation errors
   */
  private handlePrismaValidationError(error: Prisma.PrismaClientValidationError, path: string): EnhancedErrorResponse {
    return {
      success: false,
      message: 'Invalid data format provided',
      details: {
        type: 'DATA_FORMAT_ERROR',
        helpText: 'The data provided does not match the expected format.',
        suggestions: [
          'Check the data types of all fields',
          'Ensure required fields are included',
          'Verify date formats are correct (ISO 8601)',
          'Check that UUIDs are properly formatted'
        ]
      },
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /**
   * Handle custom validation errors
   */
  private handleCustomValidationError(error: any, path: string): EnhancedErrorResponse {
    return {
      success: false,
      message: error.message || 'Custom validation failed',
      details: {
        type: 'CUSTOM_VALIDATION_ERROR',
        validationErrors: error.validationErrors || [],
        helpText: 'Custom business rules validation failed.',
        suggestions: error.suggestions || []
      },
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /**
   * Handle standard validation errors
   */
  private handleValidationError(error: BadRequestException): EnhancedErrorResponse {
    const response = error.getResponse() as any;
    
    return {
      success: false,
      message: 'Request validation failed',
      details: {
        type: 'REQUEST_VALIDATION_ERROR',
        helpText: 'The request format or content is invalid.',
        suggestions: [
          'Check the request body format',
          'Ensure all required fields are provided',
          'Verify data types match the expected format'
        ]
      },
      timestamp: new Date().toISOString(),
      path: response.path || 'unknown',
    };
  }

  /**
   * Enhance existing HTTP exceptions
   */
  private enhanceHttpException(error: HttpException, path: string): EnhancedErrorResponse {
    const response = error.getResponse() as any;
    
    return {
      success: false,
      message: typeof response === 'string' ? response : response.message || 'Request failed',
      details: {
        type: 'HTTP_ERROR',
        helpText: this.getHelpTextForHttpStatus(error.getStatus()),
        suggestions: this.getSuggestionsForHttpStatus(error.getStatus())
      },
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /**
   * Get field-specific suggestions based on validation errors
   */
  private getFieldSuggestions(fieldPath: string, value: any, errors: string[]): string[] {
    const suggestions: string[] = [];
    
    if (fieldPath.includes('email')) {
      suggestions.push('Use a valid email format (example@domain.com)');
      suggestions.push('Check for typos in the email address');
    }
    
    if (fieldPath.includes('username')) {
      suggestions.push('Username must be 3-50 characters long');
      suggestions.push('Use only letters, numbers, underscores, and hyphens');
      suggestions.push('Choose a unique username');
    }
    
    if (fieldPath.includes('belief_summary')) {
      suggestions.push('Provide a meaningful summary of your beliefs (10-5000 characters)');
      suggestions.push('Avoid repetitive or placeholder content');
    }
    
    if (fieldPath.includes('survey_responses')) {
      suggestions.push('Ensure questions and answers arrays have the same length');
      suggestions.push('Provide at least 5 questions and answers');
      suggestions.push('All answers should be non-empty strings, numbers, or booleans');
    }
    
    if (fieldPath.includes('ideology_scores')) {
      suggestions.push('Provide scores between 0 and 1 for each ideology dimension');
      suggestions.push('Include at least conservative and liberal dimensions');
      suggestions.push('Show some variation in scores to reflect nuanced beliefs');
    }
    
    return suggestions;
  }

  /**
   * Get field-specific help text
   */
  private getFieldHelpText(fieldPath: string): string {
    if (fieldPath.includes('email')) {
      return 'Email addresses must be valid and may need to match your organization domain.';
    }
    
    if (fieldPath.includes('username')) {
      return 'Usernames identify you in the system and must be unique across all users.';
    }
    
    if (fieldPath.includes('belief_summary')) {
      return 'Your belief summary helps others understand your perspective in debates.';
    }
    
    if (fieldPath.includes('survey_responses')) {
      return 'Survey responses are used to analyze your political and ideological positions.';
    }
    
    if (fieldPath.includes('ideology_scores')) {
      return 'Ideology scores represent your position on various political dimensions.';
    }
    
    return 'This field is required for your profile.';
  }

  /**
   * Get general validation suggestions
   */
  private getGeneralValidationSuggestions(validationErrors: DetailedValidationError[]): string[] {
    const suggestions = [
      'Review each field error and make the necessary corrections',
      'Ensure all required fields are provided'
    ];
    
    if (validationErrors.some(e => e.field.includes('email'))) {
      suggestions.push('Double-check email addresses for typos');
    }
    
    if (validationErrors.some(e => e.field.includes('username'))) {
      suggestions.push('Try a different username if yours is taken');
    }
    
    return suggestions;
  }

  /**
   * Get help text for different error types
   */
  private getHelpTextForError(type: string): string {
    switch (type) {
      case 'VALIDATION_ERROR':
        return 'The data provided does not meet the required validation criteria.';
      case 'DATABASE_ERROR':
        return 'An error occurred while accessing or modifying the database.';
      case 'INTERNAL_SERVER_ERROR':
        return 'An unexpected error occurred on the server.';
      default:
        return 'An error occurred while processing your request.';
    }
  }

  /**
   * Get suggestions for different error types
   */
  private getSuggestionsForError(error: any, type: string): string[] {
    switch (type) {
      case 'VALIDATION_ERROR':
        return [
          'Check that all required fields are provided',
          'Verify data formats match the expected types',
          'Review field-specific validation requirements'
        ];
      case 'DATABASE_ERROR':
        return [
          'Try the operation again',
          'Check if related records exist',
          'Contact support if the problem persists'
        ];
      default:
        return ['Try the operation again', 'Contact support if the problem persists'];
    }
  }

  /**
   * Get help text for HTTP status codes
   */
  private getHelpTextForHttpStatus(status: number): string {
    switch (status) {
      case 400:
        return 'The request contains invalid or incomplete data.';
      case 401:
        return 'Authentication is required to access this resource.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'The request conflicts with existing data.';
      case 422:
        return 'The request data is valid but cannot be processed.';
      case 500:
        return 'An internal server error occurred.';
      default:
        return 'An error occurred while processing your request.';
    }
  }

  /**
   * Get suggestions for HTTP status codes
   */
  private getSuggestionsForHttpStatus(status: number): string[] {
    switch (status) {
      case 400:
        return [
          'Check the request format and data types',
          'Ensure all required fields are included',
          'Verify the request body structure'
        ];
      case 401:
        return [
          'Include valid authentication credentials',
          'Check if your token has expired',
          'Sign in again if necessary'
        ];
      case 403:
        return [
          'Contact an administrator for access',
          'Check if you have the required role or permissions',
          'Verify you are accessing your own resources'
        ];
      case 404:
        return [
          'Check the resource ID is correct',
          'Verify the resource exists',
          'Check the URL path'
        ];
      case 409:
        return [
          'Check for existing records with the same data',
          'Use update instead of create if the resource exists',
          'Resolve any conflicting data'
        ];
      default:
        return ['Try the operation again', 'Contact support if the problem persists'];
    }
  }
}
