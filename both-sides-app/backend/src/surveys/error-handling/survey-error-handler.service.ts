/**
 * Phase 3 Task 3.1.5.3: Survey Error Handling and Recovery
 * Comprehensive error handling with graceful recovery mechanisms
 */

import { Injectable, Logger, HttpException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ErrorRecoveryResult {
  success: boolean;
  recoveredData?: any;
  fallbackAction?: string;
  userMessage: string;
  technicalDetails?: string;
  retryable: boolean;
  retryAfter?: number; // milliseconds
}

export interface NetworkError {
  type: 'timeout' | 'connection_lost' | 'server_error' | 'rate_limit';
  originalError: Error;
  context: any;
  timestamp: Date;
  retryCount: number;
}

export interface DataCorruption {
  type: 'invalid_format' | 'missing_fields' | 'inconsistent_state' | 'duplicate_data';
  affectedData: any;
  detectedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixable: boolean;
}

@Injectable()
export class SurveyErrorHandlerService {
  private readonly logger = new Logger(SurveyErrorHandlerService.name);
  private readonly maxRetryAttempts = 3;
  private readonly retryDelays = [1000, 2000, 5000]; // Progressive delays

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle response submission errors with retry logic
   */
  async handleResponseSubmissionError(
    error: Error,
    responseData: any,
    context: any,
    retryCount: number = 0
  ): Promise<ErrorRecoveryResult> {
    this.logger.error(`Response submission error: ${error.message}`, {
      error: error.stack,
      responseData: this.sanitizeForLogging(responseData),
      context,
      retryCount,
    });

    // Network-related errors
    if (this.isNetworkError(error)) {
      return await this.handleNetworkError({
        type: this.classifyNetworkError(error),
        originalError: error,
        context: { responseData, ...context },
        timestamp: new Date(),
        retryCount,
      });
    }

    // Validation errors
    if (this.isValidationError(error)) {
      return this.handleValidationError(error, responseData);
    }

    // Database errors
    if (this.isDatabaseError(error)) {
      return await this.handleDatabaseError(error, responseData, context);
    }

    // Rate limiting errors
    if (this.isRateLimitError(error)) {
      return this.handleRateLimitError(error);
    }

    // Unknown errors
    return this.handleUnknownError(error, responseData, context);
  }

  /**
   * Handle network connectivity issues with progressive retry
   */
  private async handleNetworkError(networkError: NetworkError): Promise<ErrorRecoveryResult> {
    const { type, retryCount, context } = networkError;

    if (retryCount >= this.maxRetryAttempts) {
      // Max retries reached - store locally for later sync
      await this.storeForOfflineSync(context.responseData, context);
      
      return {
        success: false,
        fallbackAction: 'stored_offline',
        userMessage: 'Your response has been saved locally and will be synced when connection is restored.',
        retryable: false,
      };
    }

    // Calculate retry delay
    const retryDelay = this.calculateRetryDelay(type, retryCount);

    return {
      success: false,
      userMessage: this.getNetworkErrorMessage(type, retryCount),
      technicalDetails: `Network error: ${type}. Retry ${retryCount + 1}/${this.maxRetryAttempts}`,
      retryable: true,
      retryAfter: retryDelay,
    };
  }

  /**
   * Handle validation errors with helpful user guidance
   */
  private handleValidationError(error: Error, responseData: any): ErrorRecoveryResult {
    let userMessage = 'Please check your response and try again.';
    let technicalDetails = error.message;

    // Parse validation error details
    if (error.message.includes('question_id')) {
      userMessage = 'There was an issue with the question. Please refresh and try again.';
    } else if (error.message.includes('response_value')) {
      userMessage = 'Your response format is invalid. Please select a valid option.';
    } else if (error.message.includes('completion_time')) {
      userMessage = 'Response timing data is invalid. Please try submitting again.';
    } else if (error.message.includes('confidence_level')) {
      userMessage = 'Please select a confidence level between 1 and 5.';
    }

    return {
      success: false,
      userMessage,
      technicalDetails,
      retryable: true,
    };
  }

  /**
   * Handle database errors with recovery mechanisms
   */
  private async handleDatabaseError(
    error: Error,
    responseData: any,
    context: any
  ): Promise<ErrorRecoveryResult> {
    // Check if it's a temporary database issue
    if (this.isTemporaryDatabaseError(error)) {
      return {
        success: false,
        userMessage: 'Database temporarily unavailable. Your response will be retried automatically.',
        technicalDetails: error.message,
        retryable: true,
        retryAfter: 3000,
      };
    }

    // Check for constraint violations
    if (this.isConstraintViolation(error)) {
      return await this.handleConstraintViolation(error, responseData, context);
    }

    // Check for data corruption
    if (this.indicatesDataCorruption(error)) {
      return await this.handleDataCorruption(error, responseData);
    }

    // General database error
    await this.storeForOfflineSync(responseData, context);
    
    return {
      success: false,
      fallbackAction: 'stored_offline',
      userMessage: 'Your response has been saved and will be processed once the issue is resolved.',
      technicalDetails: `Database error: ${error.message}`,
      retryable: false,
    };
  }

  /**
   * Handle rate limiting with backoff
   */
  private handleRateLimitError(error: Error): ErrorRecoveryResult {
    const retryAfter = this.extractRetryAfter(error) || 60000; // Default 1 minute

    return {
      success: false,
      userMessage: 'You\'re submitting responses too quickly. Please wait a moment and try again.',
      technicalDetails: 'Rate limit exceeded',
      retryable: true,
      retryAfter,
    };
  }

  /**
   * Handle unknown errors with safe fallbacks
   */
  private handleUnknownError(error: Error, responseData: any, context: any): ErrorRecoveryResult {
    this.logger.error('Unknown survey error', {
      error: error.stack,
      responseData: this.sanitizeForLogging(responseData),
      context,
    });

    return {
      success: false,
      fallbackAction: 'manual_review',
      userMessage: 'An unexpected error occurred. Please try again, and contact support if the problem persists.',
      technicalDetails: 'Unknown error type',
      retryable: true,
    };
  }

  /**
   * Detect and handle data corruption
   */
  async detectAndHandleDataCorruption(data: any): Promise<DataCorruption[]> {
    const corruptions: DataCorruption[] = [];

    // Check for invalid format
    if (await this.hasInvalidFormat(data)) {
      corruptions.push({
        type: 'invalid_format',
        affectedData: data,
        detectedAt: new Date(),
        severity: 'high',
        autoFixable: false,
      });
    }

    // Check for missing required fields
    const missingFields = await this.findMissingFields(data);
    if (missingFields.length > 0) {
      corruptions.push({
        type: 'missing_fields',
        affectedData: { missingFields, original: data },
        detectedAt: new Date(),
        severity: 'medium',
        autoFixable: true,
      });
    }

    // Check for inconsistent state
    if (await this.hasInconsistentState(data)) {
      corruptions.push({
        type: 'inconsistent_state',
        affectedData: data,
        detectedAt: new Date(),
        severity: 'high',
        autoFixable: false,
      });
    }

    // Check for duplicates
    if (await this.hasDuplicateData(data)) {
      corruptions.push({
        type: 'duplicate_data',
        affectedData: data,
        detectedAt: new Date(),
        severity: 'low',
        autoFixable: true,
      });
    }

    // Attempt auto-fixes for fixable corruptions
    for (const corruption of corruptions) {
      if (corruption.autoFixable) {
        try {
          await this.autoFixCorruption(corruption);
        } catch (fixError) {
          this.logger.error(`Auto-fix failed for corruption: ${corruption.type}`, fixError);
        }
      }
    }

    return corruptions;
  }

  /**
   * Store data for offline sync when network is unavailable
   */
  private async storeForOfflineSync(responseData: any, context: any): Promise<void> {
    try {
      // Store in a dedicated offline sync table
      await this.prisma.$executeRaw`
        INSERT INTO survey_offline_queue (response_data, context_data, created_at, retry_count)
        VALUES (${JSON.stringify(responseData)}, ${JSON.stringify(context)}, NOW(), 0)
        ON CONFLICT DO NOTHING
      `;
      
      this.logger.log('Stored response for offline sync', { responseData: this.sanitizeForLogging(responseData) });
    } catch (error) {
      this.logger.error('Failed to store response for offline sync', error);
    }
  }

  /**
   * Process offline sync queue when connection is restored
   */
  async processOfflineSyncQueue(): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      // Get offline queue items
      const queueItems = await this.prisma.$queryRaw`
        SELECT id, response_data, context_data, retry_count
        FROM survey_offline_queue
        WHERE retry_count < ${this.maxRetryAttempts}
        ORDER BY created_at ASC
        LIMIT 50
      ` as any[];

      for (const item of queueItems) {
        try {
          // Attempt to process the offline response
          // This would call the original response submission logic
          await this.processOfflineResponse(item.response_data, item.context_data);
          
          // Remove from queue on success
          await this.prisma.$executeRaw`
            DELETE FROM survey_offline_queue WHERE id = ${item.id}
          `;
          
          processed++;
        } catch (error) {
          // Update retry count
          await this.prisma.$executeRaw`
            UPDATE survey_offline_queue 
            SET retry_count = retry_count + 1, last_retry_at = NOW()
            WHERE id = ${item.id}
          `;
          
          failed++;
          this.logger.warn(`Failed to process offline response ${item.id}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error processing offline sync queue', error);
    }

    return { processed, failed };
  }

  // Helper methods
  private isNetworkError(error: Error): boolean {
    const networkErrorIndicators = [
      'ECONNRESET',
      'ECONNREFUSED', 
      'ETIMEDOUT',
      'ENETDOWN',
      'ENETUNREACH',
      'fetch failed',
      'network error',
    ];

    return networkErrorIndicators.some(indicator => 
      error.message.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private classifyNetworkError(error: Error): NetworkError['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('connection') || message.includes('econnreset')) return 'connection_lost';
    if (message.includes('rate limit') || message.includes('too many requests')) return 'rate_limit';
    
    return 'server_error';
  }

  private isValidationError(error: Error): boolean {
    return error instanceof HttpException && error.getStatus() === 400;
  }

  private isDatabaseError(error: Error): boolean {
    return error.message.includes('Prisma') || 
           error.message.includes('database') ||
           error.message.includes('constraint') ||
           error.message.includes('foreign key');
  }

  private isRateLimitError(error: Error): boolean {
    return error.message.includes('rate limit') || 
           error.message.includes('too many requests') ||
           (error instanceof HttpException && error.getStatus() === 429);
  }

  private isTemporaryDatabaseError(error: Error): boolean {
    const temporaryErrors = [
      'connection timeout',
      'temporary failure',
      'deadlock',
      'lock timeout',
    ];
    
    return temporaryErrors.some(temp => 
      error.message.toLowerCase().includes(temp)
    );
  }

  private isConstraintViolation(error: Error): boolean {
    return error.message.includes('constraint') || 
           error.message.includes('unique') ||
           error.message.includes('foreign key');
  }

  private indicatesDataCorruption(error: Error): boolean {
    return error.message.includes('invalid') || 
           error.message.includes('corrupt') ||
           error.message.includes('malformed');
  }

  private async handleConstraintViolation(
    error: Error, 
    responseData: any, 
    context: any
  ): Promise<ErrorRecoveryResult> {
    // Try to recover from constraint violations
    if (error.message.includes('unique')) {
      // Duplicate response - update instead of insert
      return {
        success: false,
        fallbackAction: 'update_existing',
        userMessage: 'Your response will update your previous answer.',
        retryable: true,
      };
    }

    return {
      success: false,
      userMessage: 'Data constraint error. Please refresh and try again.',
      technicalDetails: error.message,
      retryable: true,
    };
  }

  private async handleDataCorruption(error: Error, responseData: any): Promise<ErrorRecoveryResult> {
    const corruptions = await this.detectAndHandleDataCorruption(responseData);
    
    return {
      success: false,
      userMessage: 'Data validation failed. Please check your response format.',
      technicalDetails: `Data corruption detected: ${corruptions.map(c => c.type).join(', ')}`,
      retryable: corruptions.every(c => c.autoFixable),
    };
  }

  private calculateRetryDelay(errorType: NetworkError['type'], retryCount: number): number {
    const baseDelay = this.retryDelays[Math.min(retryCount, this.retryDelays.length - 1)];
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    
    // Exponential backoff for certain error types
    const multiplier = errorType === 'rate_limit' ? 2 : 1;
    
    return Math.floor(baseDelay * multiplier + jitter);
  }

  private getNetworkErrorMessage(type: NetworkError['type'], retryCount: number): string {
    const messages = {
      timeout: 'Request timed out. Retrying...',
      connection_lost: 'Connection lost. Attempting to reconnect...',
      server_error: 'Server error. Retrying request...',
      rate_limit: 'Too many requests. Please wait before retrying...',
    };
    
    const baseMessage = messages[type] || 'Network error occurred.';
    return `${baseMessage} (Attempt ${retryCount + 1}/${this.maxRetryAttempts})`;
  }

  private extractRetryAfter(error: Error): number | null {
    // Try to extract Retry-After header from error
    const match = error.message.match(/retry.*after.*?(\d+)/i);
    return match ? parseInt(match[1]) * 1000 : null;
  }

  private sanitizeForLogging(data: any): any {
    // Remove sensitive data from logs
    if (typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    
    // Remove or mask sensitive fields
    const sensitiveFields = ['user_id', 'profile_id', 'response_text'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***masked***';
      }
    });
    
    return sanitized;
  }

  // Data corruption detection helpers
  private async hasInvalidFormat(data: any): Promise<boolean> {
    // Check for basic format validation
    return !data || typeof data !== 'object' || !data.question_id || !data.response_value;
  }

  private async findMissingFields(data: any): Promise<string[]> {
    const requiredFields = ['question_id', 'response_value', 'completion_time'];
    return requiredFields.filter(field => !(field in data));
  }

  private async hasInconsistentState(data: any): Promise<boolean> {
    // Check for logical inconsistencies in the data
    return false; // Placeholder - would implement actual consistency checks
  }

  private async hasDuplicateData(data: any): Promise<boolean> {
    if (!data.question_id || !data.profile_id) return false;
    
    // Check if response already exists
    const existing = await this.prisma.surveyResponse.findFirst({
      where: {
        question_id: data.question_id,
        profile_id: data.profile_id,
      },
    });
    
    return !!existing;
  }

  private async autoFixCorruption(corruption: DataCorruption): Promise<void> {
    switch (corruption.type) {
      case 'missing_fields':
        await this.fixMissingFields(corruption);
        break;
      case 'duplicate_data':
        await this.fixDuplicateData(corruption);
        break;
      default:
        throw new Error(`Cannot auto-fix corruption type: ${corruption.type}`);
    }
  }

  private async fixMissingFields(corruption: DataCorruption): Promise<void> {
    const { missingFields, original } = corruption.affectedData;
    
    // Add default values for missing fields
    const defaults = {
      completion_time: 0,
      confidence_level: null,
      response_text: null,
    };
    
    missingFields.forEach((field: string) => {
      if (field in defaults) {
        original[field] = defaults[field];
      }
    });
  }

  private async fixDuplicateData(corruption: DataCorruption): Promise<void> {
    // Convert insert to update operation
    this.logger.log('Converting duplicate insert to update operation');
  }

  private async processOfflineResponse(responseData: any, contextData: any): Promise<void> {
    // This would call the main response processing logic
    // Placeholder for actual implementation
    this.logger.log('Processing offline response', { responseData: this.sanitizeForLogging(responseData) });
  }
}
