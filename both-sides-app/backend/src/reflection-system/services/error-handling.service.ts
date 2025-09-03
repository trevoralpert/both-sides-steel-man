import { Injectable, Logger } from '@nestjs/common';
import { ConversationStatus, DebatePhase } from '@prisma/client';

/**
 * Interface for error context information
 */
export interface ErrorContext {
  conversation_id?: string;
  user_id?: string;
  operation: string;
  timestamp: Date;
  additional_data?: Record<string, any>;
}

/**
 * Interface for error resolution suggestion
 */
export interface ErrorResolution {
  action: 'retry' | 'skip' | 'fallback' | 'manual_intervention' | 'abort';
  reason: string;
  suggested_delay_ms?: number;
  fallback_data?: any;
  manual_steps?: string[];
}

/**
 * Interface for debate data issue
 */
export interface DebateDataIssue {
  type: 'missing_data' | 'incomplete_data' | 'invalid_data' | 'access_error' | 'processing_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_components: string[];
  resolution: ErrorResolution;
  metadata?: Record<string, any>;
}

/**
 * Interface for recovery strategy
 */
export interface RecoveryStrategy {
  name: string;
  applicable_issues: string[];
  priority: number; // Higher number = higher priority
  execute: (context: ErrorContext, issue: DebateDataIssue) => Promise<any>;
}

/**
 * Service for handling errors related to missing or incomplete debate data
 */
@Injectable()
export class ErrorHandlingService {
  private readonly logger = new Logger(ErrorHandlingService.name);

  private readonly recoveryStrategies: RecoveryStrategy[] = [];

  constructor() {
    this.initializeRecoveryStrategies();
  }

  /**
   * Handle error and return appropriate resolution
   */
  async handleDebateDataError(
    error: Error,
    context: ErrorContext
  ): Promise<{ issue: DebateDataIssue; resolved: boolean; result?: any }> {
    this.logger.error(
      `Debate data error in ${context.operation}: ${error.message}`,
      error.stack,
      { context }
    );

    // Classify the error and create issue
    const issue = this.classifyError(error, context);

    // Log the issue
    this.logIssue(issue, context);

    // Attempt resolution
    const resolutionResult = await this.attemptResolution(issue, context);

    return resolutionResult;
  }

  /**
   * Handle missing conversation data
   */
  async handleMissingConversation(
    conversationId: string,
    context: ErrorContext
  ): Promise<{ issue: DebateDataIssue; resolved: boolean; result?: any }> {
    const issue: DebateDataIssue = {
      type: 'missing_data',
      severity: 'critical',
      description: `Conversation not found: ${conversationId}`,
      affected_components: ['transcript_service', 'analysis_service'],
      resolution: {
        action: 'abort',
        reason: 'Cannot proceed without conversation data',
      },
      metadata: {
        conversation_id: conversationId,
        error_type: 'conversation_not_found',
      },
    };

    this.logIssue(issue, context);
    return { issue, resolved: false };
  }

  /**
   * Handle incomplete debate data
   */
  async handleIncompleteDebate(
    conversationId: string,
    issues: string[],
    context: ErrorContext
  ): Promise<{ issue: DebateDataIssue; resolved: boolean; result?: any }> {
    const severity = this.calculateIncompleteSeverity(issues);
    
    const issue: DebateDataIssue = {
      type: 'incomplete_data',
      severity,
      description: `Incomplete debate data: ${issues.join(', ')}`,
      affected_components: ['analysis_service', 'reflection_service'],
      resolution: this.getIncompleteDataResolution(issues, severity),
      metadata: {
        conversation_id: conversationId,
        missing_components: issues,
      },
    };

    this.logIssue(issue, context);
    
    const resolutionResult = await this.attemptResolution(issue, context);
    return resolutionResult;
  }

  /**
   * Handle invalid debate data
   */
  async handleInvalidDebateData(
    validationErrors: string[],
    context: ErrorContext
  ): Promise<{ issue: DebateDataIssue; resolved: boolean; result?: any }> {
    const severity = validationErrors.some(error => 
      error.includes('critical') || error.includes('required')
    ) ? 'high' : 'medium';

    const issue: DebateDataIssue = {
      type: 'invalid_data',
      severity,
      description: `Data validation failed: ${validationErrors.join(', ')}`,
      affected_components: ['validation_service', 'analysis_service'],
      resolution: {
        action: severity === 'high' ? 'skip' : 'fallback',
        reason: severity === 'high' 
          ? 'Data quality too low for reliable analysis'
          : 'Continue with available valid data',
        fallback_data: severity === 'medium' ? this.createFallbackData() : undefined,
      },
      metadata: {
        validation_errors: validationErrors,
      },
    };

    this.logIssue(issue, context);
    
    const resolutionResult = await this.attemptResolution(issue, context);
    return resolutionResult;
  }

  /**
   * Handle database access errors
   */
  async handleDatabaseError(
    error: Error,
    context: ErrorContext
  ): Promise<{ issue: DebateDataIssue; resolved: boolean; result?: any }> {
    const isConnectionError = error.message.includes('connect') || error.message.includes('timeout');
    const isPermissionError = error.message.includes('permission') || error.message.includes('access');

    const severity = isConnectionError ? 'critical' : isPermissionError ? 'high' : 'medium';

    const issue: DebateDataIssue = {
      type: 'access_error',
      severity,
      description: `Database access error: ${error.message}`,
      affected_components: ['database', 'transcript_service'],
      resolution: {
        action: isConnectionError ? 'retry' : isPermissionError ? 'manual_intervention' : 'fallback',
        reason: isConnectionError 
          ? 'Temporary connection issue, retry may resolve'
          : isPermissionError
          ? 'Permission issue requires manual intervention'
          : 'Use cached data if available',
        suggested_delay_ms: isConnectionError ? 5000 : undefined,
        manual_steps: isPermissionError ? [
          'Check database user permissions',
          'Verify connection configuration',
          'Contact database administrator'
        ] : undefined,
      },
      metadata: {
        error_type: 'database_error',
        original_error: error.message,
      },
    };

    this.logIssue(issue, context);
    
    const resolutionResult = await this.attemptResolution(issue, context);
    return resolutionResult;
  }

  /**
   * Handle processing errors during analysis
   */
  async handleProcessingError(
    error: Error,
    stage: string,
    context: ErrorContext
  ): Promise<{ issue: DebateDataIssue; resolved: boolean; result?: any }> {
    const isMemoryError = error.message.includes('memory') || error.message.includes('heap');
    const isTimeoutError = error.message.includes('timeout');
    
    const severity = isMemoryError || isTimeoutError ? 'high' : 'medium';

    const issue: DebateDataIssue = {
      type: 'processing_error',
      severity,
      description: `Processing error in ${stage}: ${error.message}`,
      affected_components: ['analysis_service', stage],
      resolution: {
        action: isTimeoutError ? 'retry' : isMemoryError ? 'fallback' : 'skip',
        reason: isTimeoutError
          ? 'Timeout may be temporary, retry with smaller data'
          : isMemoryError
          ? 'Memory constraints, use simplified processing'
          : 'Skip this processing step',
        suggested_delay_ms: isTimeoutError ? 2000 : undefined,
        fallback_data: isMemoryError ? this.createSimplifiedProcessingData() : undefined,
      },
      metadata: {
        processing_stage: stage,
        error_type: 'processing_error',
        original_error: error.message,
      },
    };

    this.logIssue(issue, context);
    
    const resolutionResult = await this.attemptResolution(issue, context);
    return resolutionResult;
  }

  /**
   * Create partial analysis results when full analysis fails
   */
  createPartialAnalysisResult(
    conversationId: string,
    availableData: any,
    missingComponents: string[]
  ): any {
    this.logger.warn(`Creating partial analysis for ${conversationId}, missing: ${missingComponents.join(', ')}`);

    return {
      conversation_id: conversationId,
      analysis_status: 'partial',
      completion_percentage: this.calculateCompletionPercentage(availableData, missingComponents),
      available_components: this.getAvailableComponents(availableData),
      missing_components: missingComponents,
      limitations: this.getAnalysisLimitations(missingComponents),
      data: availableData,
      warnings: [
        'This is a partial analysis due to missing or incomplete data',
        'Results may be less accurate than full analysis',
        `Missing components: ${missingComponents.join(', ')}`
      ],
      created_at: new Date(),
    };
  }

  /**
   * Create fallback data for continued processing
   */
  createFallbackData(): any {
    return {
      type: 'fallback',
      messages: [],
      participants: [],
      metadata: {
        quality_score: 0.1,
        confidence_score: 0.1,
        fallback_reason: 'Original data validation failed',
      },
      warnings: ['Using fallback data structure'],
    };
  }

  /**
   * Check if error is recoverable
   */
  isRecoverableError(error: Error, context: ErrorContext): boolean {
    const recoverablePatterns = [
      /timeout/i,
      /connection/i,
      /temporary/i,
      /retry/i,
      /network/i,
    ];

    const nonRecoverablePatterns = [
      /not found/i,
      /permission denied/i,
      /access denied/i,
      /invalid/i,
      /corrupt/i,
    ];

    const errorMessage = error.message.toLowerCase();

    // Check if explicitly non-recoverable
    if (nonRecoverablePatterns.some(pattern => pattern.test(errorMessage))) {
      return false;
    }

    // Check if explicitly recoverable
    if (recoverablePatterns.some(pattern => pattern.test(errorMessage))) {
      return true;
    }

    // Default based on context
    return context.operation.includes('fetch') || context.operation.includes('load');
  }

  /**
   * Get suggested retry count based on error type
   */
  getSuggestedRetryCount(error: Error): number {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('connection') || errorMessage.includes('network')) {
      return 3;
    }

    if (errorMessage.includes('timeout')) {
      return 2;
    }

    if (errorMessage.includes('memory') || errorMessage.includes('resource')) {
      return 1;
    }

    return 0; // No retry for other errors
  }

  /**
   * Log issue for monitoring and alerting
   */
  private logIssue(issue: DebateDataIssue, context: ErrorContext): void {
    const logLevel = this.getLogLevel(issue.severity);
    
    const logData = {
      issue_type: issue.type,
      severity: issue.severity,
      description: issue.description,
      affected_components: issue.affected_components,
      resolution_action: issue.resolution.action,
      context: {
        conversation_id: context.conversation_id,
        user_id: context.user_id,
        operation: context.operation,
        timestamp: context.timestamp,
      },
      metadata: issue.metadata,
    };

    switch (logLevel) {
      case 'error':
        this.logger.error('Debate data issue detected', logData);
        break;
      case 'warn':
        this.logger.warn('Debate data issue detected', logData);
        break;
      default:
        this.logger.debug('Debate data issue detected', logData);
    }

    // Send alerts for critical issues
    if (issue.severity === 'critical') {
      this.sendCriticalAlert(issue, context);
    }
  }

  /**
   * Classify error into issue type
   */
  private classifyError(error: Error, context: ErrorContext): DebateDataIssue {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('not found')) {
      return {
        type: 'missing_data',
        severity: 'high',
        description: error.message,
        affected_components: [context.operation],
        resolution: {
          action: 'abort',
          reason: 'Required data not found',
        },
      };
    }

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        type: 'invalid_data',
        severity: 'medium',
        description: error.message,
        affected_components: [context.operation],
        resolution: {
          action: 'fallback',
          reason: 'Use validated subset of data',
          fallback_data: this.createFallbackData(),
        },
      };
    }

    if (errorMessage.includes('connection') || errorMessage.includes('network')) {
      return {
        type: 'access_error',
        severity: 'critical',
        description: error.message,
        affected_components: ['database', 'network'],
        resolution: {
          action: 'retry',
          reason: 'Temporary network issue',
          suggested_delay_ms: 5000,
        },
      };
    }

    if (errorMessage.includes('timeout')) {
      return {
        type: 'processing_error',
        severity: 'high',
        description: error.message,
        affected_components: [context.operation],
        resolution: {
          action: 'retry',
          reason: 'Processing timeout, retry with smaller dataset',
          suggested_delay_ms: 2000,
        },
      };
    }

    // Default classification
    return {
      type: 'processing_error',
      severity: 'medium',
      description: error.message,
      affected_components: [context.operation],
      resolution: {
        action: 'skip',
        reason: 'Unknown error, skip this step',
      },
    };
  }

  /**
   * Attempt to resolve the issue using available strategies
   */
  private async attemptResolution(
    issue: DebateDataIssue,
    context: ErrorContext
  ): Promise<{ issue: DebateDataIssue; resolved: boolean; result?: any }> {
    // Find applicable recovery strategies
    const applicableStrategies = this.recoveryStrategies
      .filter(strategy => strategy.applicable_issues.includes(issue.type))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      try {
        this.logger.debug(`Attempting recovery strategy: ${strategy.name}`);
        
        const result = await strategy.execute(context, issue);
        
        if (result !== null && result !== undefined) {
          this.logger.log(`Recovery successful with strategy: ${strategy.name}`);
          return { issue, resolved: true, result };
        }
      } catch (error) {
        this.logger.warn(`Recovery strategy ${strategy.name} failed: ${error.message}`);
      }
    }

    // No recovery strategy succeeded
    this.logger.warn(`No recovery strategy succeeded for issue: ${issue.type}`);
    return { issue, resolved: false };
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Retry strategy for temporary errors
    this.recoveryStrategies.push({
      name: 'retry_with_delay',
      applicable_issues: ['access_error', 'processing_error'],
      priority: 8,
      execute: async (context, issue) => {
        if (issue.resolution.action === 'retry' && issue.resolution.suggested_delay_ms) {
          await new Promise(resolve => setTimeout(resolve, issue.resolution.suggested_delay_ms!));
          // Return null to indicate retry should be handled by caller
          return null;
        }
        return undefined;
      },
    });

    // Fallback data strategy
    this.recoveryStrategies.push({
      name: 'use_fallback_data',
      applicable_issues: ['invalid_data', 'incomplete_data'],
      priority: 6,
      execute: async (context, issue) => {
        if (issue.resolution.fallback_data) {
          return issue.resolution.fallback_data;
        }
        return this.createFallbackData();
      },
    });

    // Partial analysis strategy
    this.recoveryStrategies.push({
      name: 'create_partial_analysis',
      applicable_issues: ['incomplete_data', 'processing_error'],
      priority: 5,
      execute: async (context, issue) => {
        if (context.conversation_id) {
          return this.createPartialAnalysisResult(
            context.conversation_id,
            context.additional_data || {},
            issue.affected_components
          );
        }
        return undefined;
      },
    });
  }

  /**
   * Calculate severity for incomplete data
   */
  private calculateIncompleteSeverity(issues: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalComponents = ['messages', 'participants'];
    const highComponents = ['topic', 'duration'];
    
    const hasCritical = issues.some(issue => criticalComponents.some(comp => issue.includes(comp)));
    const hasHigh = issues.some(issue => highComponents.some(comp => issue.includes(comp)));
    
    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (issues.length > 3) return 'medium';
    return 'low';
  }

  /**
   * Get resolution strategy for incomplete data
   */
  private getIncompleteDataResolution(issues: string[], severity: string): ErrorResolution {
    if (severity === 'critical') {
      return {
        action: 'abort',
        reason: 'Critical data missing, cannot proceed with analysis',
      };
    }

    if (severity === 'high') {
      return {
        action: 'fallback',
        reason: 'Important data missing, use partial analysis',
        fallback_data: this.createPartialAnalysisResult('unknown', {}, issues),
      };
    }

    return {
      action: 'skip',
      reason: 'Non-critical data missing, continue with available data',
    };
  }

  /**
   * Calculate completion percentage for partial analysis
   */
  private calculateCompletionPercentage(availableData: any, missingComponents: string[]): number {
    const totalComponents = ['messages', 'participants', 'topic', 'metadata', 'timing'];
    const availableCount = totalComponents.length - missingComponents.length;
    return Math.max(0, (availableCount / totalComponents.length) * 100);
  }

  /**
   * Get available components for partial analysis
   */
  private getAvailableComponents(availableData: any): string[] {
    const components: string[] = [];
    
    if (availableData.messages && availableData.messages.length > 0) components.push('messages');
    if (availableData.participants && availableData.participants.length > 0) components.push('participants');
    if (availableData.topic) components.push('topic');
    if (availableData.metadata) components.push('metadata');
    if (availableData.started_at || availableData.ended_at) components.push('timing');
    
    return components;
  }

  /**
   * Get analysis limitations based on missing components
   */
  private getAnalysisLimitations(missingComponents: string[]): string[] {
    const limitations: string[] = [];
    
    if (missingComponents.includes('messages')) {
      limitations.push('Cannot analyze conversation content or argument quality');
    }
    
    if (missingComponents.includes('participants')) {
      limitations.push('Cannot assess participant engagement or balance');
    }
    
    if (missingComponents.includes('topic')) {
      limitations.push('Cannot assess topic relevance or coherence');
    }
    
    if (missingComponents.includes('timing')) {
      limitations.push('Cannot analyze conversation flow or pacing');
    }
    
    return limitations;
  }

  /**
   * Create simplified processing data for memory constraints
   */
  private createSimplifiedProcessingData(): any {
    return {
      type: 'simplified',
      processing_mode: 'lightweight',
      batch_size: 10,
      memory_optimization: true,
      reduced_analysis_depth: true,
    };
  }

  /**
   * Get appropriate log level for severity
   */
  private getLogLevel(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      default:
        return 'debug';
    }
  }

  /**
   * Send critical alert (placeholder for actual alerting system)
   */
  private sendCriticalAlert(issue: DebateDataIssue, context: ErrorContext): void {
    // In a real implementation, this would integrate with alerting systems
    // like Slack, PagerDuty, or email notifications
    this.logger.error('CRITICAL ALERT: Debate data issue requires immediate attention', {
      issue_type: issue.type,
      description: issue.description,
      affected_components: issue.affected_components,
      conversation_id: context.conversation_id,
      timestamp: context.timestamp,
    });
  }
}
