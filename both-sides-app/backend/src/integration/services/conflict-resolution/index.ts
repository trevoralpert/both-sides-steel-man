/**
 * Conflict Resolution Module Index
 * 
 * Central exports for all conflict resolution services, interfaces, and utilities.
 * Provides convenient single import point for conflict resolution functionality.
 */

// ===================================================================
// CORE SERVICES
// ===================================================================

export { ConflictDetectionService } from './conflict-detection.service';
export { ConflictResolutionService } from './conflict-resolution.service';
export { ConflictManagementService } from './conflict-management.service';

// ===================================================================
// INTERFACES AND TYPES
// ===================================================================

export type {
  // Core conflict types
  ConflictType,
  ConflictSeverity,
  ConflictStatus,
  ResolutionStrategy,
  
  // Data structures
  ConflictField,
  ConflictContext,
  DataConflict,
  
  // Resolution types
  ResolutionPolicy,
  ResolutionRule,
  ResolutionResult,
  ResolutionExecution,
  CustomResolutionHandler,
  
  // Workflow types
  ConflictWorkflow,
  ConflictWorkflowStep,
  ConflictEscalation,
  
  // Analysis types
  ConflictAnalysis,
  ConflictReport,
  ConflictMetrics,
  ConflictNotification,
  
  // Configuration types
  ConflictResolutionConfig,
  
  // Query types
  ConflictQuery,
  ConflictSearchResult,
  ConflictValidationResult,
  
  // Audit types
  ConflictAuditEntry,
  
  // Integration types
  SynchronizerConflictContext,
  ConflictResolutionHook,
} from './conflict-resolution.interfaces';

// ===================================================================
// UTILITIES AND HELPERS
// ===================================================================

/**
 * Utility function to create a basic conflict query
 */
export function createConflictQuery(
  integrationId: string,
  options?: {
    entityType?: import('../synchronizers/base-synchronizer.service').EntityType;
    entityId?: string;
    conflictTypes?: import('./conflict-resolution.interfaces').ConflictType[];
    severities?: import('./conflict-resolution.interfaces').ConflictSeverity[];
    statuses?: import('./conflict-resolution.interfaces').ConflictStatus[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
): import('./conflict-resolution.interfaces').ConflictQuery {
  return {
    integrationId,
    entityType: options?.entityType,
    entityId: options?.entityId,
    conflictTypes: options?.conflictTypes,
    severities: options?.severities,
    statuses: options?.statuses,
    dateRange: (options?.startDate || options?.endDate) ? {
      startDate: options?.startDate || new Date(0),
      endDate: options?.endDate || new Date(),
    } : undefined,
    limit: options?.limit || 50,
    offset: options?.offset || 0,
    includeMetadata: true,
  };
}

/**
 * Utility function to create a sync context for conflict operations
 */
export function createConflictSyncContext(
  integrationId: string,
  providerId: string,
  options?: {
    syncId?: string;
    externalSystemId?: string;
    correlationId?: string;
  }
): import('../synchronizers/base-synchronizer.service').SyncContext {
  return {
    syncId: options?.syncId || `conflict_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    integrationId,
    providerId,
    externalSystemId: options?.externalSystemId || providerId,
    startTime: new Date(),
    correlationId: options?.correlationId,
  };
}

/**
 * Utility function to determine conflict severity based on field changes
 */
export function calculateConflictSeverity(
  fields: import('./conflict-resolution.interfaces').ConflictField[],
  entityType: import('../synchronizers/base-synchronizer.service').EntityType,
): import('./conflict-resolution.interfaces').ConflictSeverity {
  if (fields.length === 0) return 'low';

  // Check for high-risk fields
  const highRiskFields = {
    user: ['email', 'role', 'is_active'],
    class: ['teacher_id', 'is_active'],
    organization: ['type', 'parent_id'],
    enrollment: ['status', 'user_id', 'class_id'],
  };

  const entityHighRiskFields = highRiskFields[entityType] || [];
  const hasHighRiskFields = fields.some(field => entityHighRiskFields.includes(field.fieldName));

  if (hasHighRiskFields) {
    return fields.length > 2 ? 'critical' : 'high';
  }

  // Check field significance
  const maxSeverity = fields.reduce((max, field) => {
    const severityOrder = ['low', 'medium', 'high', 'critical', 'blocking'];
    const fieldSeverityIndex = severityOrder.indexOf(field.significance);
    const maxSeverityIndex = severityOrder.indexOf(max);
    
    return fieldSeverityIndex > maxSeverityIndex ? field.significance : max;
  }, 'low' as import('./conflict-resolution.interfaces').ConflictSeverity);

  return maxSeverity;
}

/**
 * Utility function to suggest optimal resolution strategy
 */
export function suggestResolutionStrategy(
  conflict: import('./conflict-resolution.interfaces').DataConflict,
): import('./conflict-resolution.interfaces').ResolutionStrategy {
  // Critical conflicts require manual intervention
  if (conflict.severity === 'critical' || conflict.severity === 'blocking') {
    return 'manual';
  }

  // Single field conflicts with high confidence
  if (conflict.fields.length === 1 && conflict.fields[0].confidence > 0.8) {
    return 'external_wins';
  }

  // Multiple low-severity fields can be merged
  if (conflict.fields.every(f => f.significance === 'low' || f.significance === 'medium')) {
    return 'merge';
  }

  // Temporal conflicts can be deferred
  if (conflict.conflictType === 'temporal') {
    return 'defer';
  }

  // Default to manual for safety
  return 'manual';
}

/**
 * Utility function to validate conflict resolution configuration
 */
export function validateConflictResolutionConfig(
  config: Partial<import('./conflict-resolution.interfaces').ConflictResolutionConfig>,
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate general configuration
  if (config.general) {
    if (config.general.autoResolutionTimeout && config.general.autoResolutionTimeout < 1) {
      errors.push('Auto resolution timeout must be at least 1 second');
    }

    if (config.general.maxRetryAttempts && config.general.maxRetryAttempts < 1) {
      errors.push('Max retry attempts must be at least 1');
    }

    if (config.general.escalationTimeout && config.general.escalationTimeout < 60) {
      warnings.push('Escalation timeout less than 60 seconds may be too aggressive');
    }
  }

  // Validate detection configuration
  if (config.detection) {
    if (config.detection.confidenceThreshold !== undefined) {
      if (config.detection.confidenceThreshold < 0 || config.detection.confidenceThreshold > 1) {
        errors.push('Confidence threshold must be between 0 and 1');
      }
      
      if (config.detection.confidenceThreshold < 0.5) {
        warnings.push('Low confidence threshold may result in false positive conflicts');
      }
    }

    if (config.detection.batchProcessingSize && config.detection.batchProcessingSize < 1) {
      errors.push('Batch processing size must be at least 1');
    }

    if (config.detection.batchProcessingSize && config.detection.batchProcessingSize > 1000) {
      warnings.push('Large batch size may impact performance');
    }
  }

  // Validate resolution configuration
  if (config.resolution) {
    if (config.resolution.resolutionTimeout && config.resolution.resolutionTimeout < 1) {
      errors.push('Resolution timeout must be at least 1 second');
    }
  }

  // Validate escalation configuration
  if (config.escalation) {
    if (config.escalation.escalationCriteria) {
      if (config.escalation.escalationCriteria.unresolvedDuration < 60) {
        warnings.push('Very short unresolved duration may cause excessive escalations');
      }

      if (config.escalation.escalationCriteria.failureThreshold < 1) {
        errors.push('Failure threshold must be at least 1');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Utility function to create a conflict field from external and internal values
 */
export function createConflictField(
  fieldName: string,
  externalValue: any,
  internalValue: any,
  options?: {
    fieldPath?: string;
    conflictReason?: string;
    confidence?: number;
    significance?: import('./conflict-resolution.interfaces').ConflictSeverity;
    resolutionHint?: string;
  }
): import('./conflict-resolution.interfaces').ConflictField {
  const fieldType = Array.isArray(externalValue || internalValue) 
    ? 'array' 
    : typeof (externalValue || internalValue) === 'object' && (externalValue || internalValue) !== null 
    ? 'object' 
    : 'scalar';

  return {
    fieldName,
    fieldPath: options?.fieldPath || fieldName,
    fieldType,
    externalValue,
    internalValue,
    conflictReason: options?.conflictReason || `Different values detected for field ${fieldName}`,
    confidence: options?.confidence ?? 0.8,
    significance: options?.significance ?? 'medium',
    resolutionHint: options?.resolutionHint,
    metadata: {
      detectionMethod: 'utility',
      createdAt: new Date(),
    },
  };
}

/**
 * Utility function to check if two values are considered conflicting
 */
export function areValuesConflicting(
  value1: any,
  value2: any,
  options?: {
    caseSensitive?: boolean;
    trimWhitespace?: boolean;
    deepComparison?: boolean;
    tolerance?: number; // for numeric comparisons
  }
): boolean {
  const opts = {
    caseSensitive: true,
    trimWhitespace: true,
    deepComparison: true,
    tolerance: 0,
    ...options,
  };

  if (value1 === value2) return false;
  if (value1 == null && value2 == null) return false;
  if (value1 == null || value2 == null) return true;

  // Handle strings
  if (typeof value1 === 'string' && typeof value2 === 'string') {
    let str1 = opts.trimWhitespace ? value1.trim() : value1;
    let str2 = opts.trimWhitespace ? value2.trim() : value2;
    
    if (!opts.caseSensitive) {
      str1 = str1.toLowerCase();
      str2 = str2.toLowerCase();
    }
    
    return str1 !== str2;
  }

  // Handle numbers
  if (typeof value1 === 'number' && typeof value2 === 'number') {
    return Math.abs(value1 - value2) > opts.tolerance;
  }

  // Handle dates
  if (value1 instanceof Date && value2 instanceof Date) {
    return value1.getTime() !== value2.getTime();
  }

  // Handle objects/arrays
  if (opts.deepComparison && typeof value1 === 'object' && typeof value2 === 'object') {
    try {
      return JSON.stringify(value1) !== JSON.stringify(value2);
    } catch {
      return true; // If serialization fails, consider them different
    }
  }

  return true;
}

/**
 * Utility function to generate a conflict description
 */
export function generateConflictDescription(
  fields: import('./conflict-resolution.interfaces').ConflictField[],
  conflictType: import('./conflict-resolution.interfaces').ConflictType,
): string {
  const fieldNames = fields.map(f => f.fieldName).join(', ');
  const conflictTypeDisplay = conflictType.replace('_', ' ');
  
  if (fields.length === 1) {
    return `${conflictTypeDisplay} in field '${fieldNames}'`;
  } else {
    return `${conflictTypeDisplay} in ${fields.length} fields: ${fieldNames}`;
  }
}

/**
 * Utility function to assess business impact of a conflict
 */
export function assessConflictBusinessImpact(
  conflict: import('./conflict-resolution.interfaces').DataConflict,
): import('./conflict-resolution.interfaces').DataConflict['businessImpact'] {
  const criticalFields = ['email', 'role', 'status', 'is_active', 'teacher_id'];
  const hasCriticalFields = conflict.fields.some(f => criticalFields.includes(f.fieldName));
  
  let severity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low';
  let description = `${conflict.context.entityType} data conflict affecting ${conflict.fields.length} field(s)`;
  let affectedUsers: number | undefined;
  const affectedProcesses: string[] = [];

  // Assess severity based on conflict characteristics
  if (conflict.severity === 'critical' || conflict.severity === 'blocking') {
    severity = 'critical';
    description = `Critical ${description}`;
  } else if (hasCriticalFields) {
    severity = 'high';
    description = `High-impact ${description} including critical fields`;
  } else if (conflict.fields.length > 3) {
    severity = 'medium';
    description = `Multi-field ${description}`;
  }

  // Estimate affected users
  if (conflict.context.entityType === 'user') {
    affectedUsers = 1;
  } else if (conflict.context.entityType === 'class') {
    // Estimate based on typical class size
    affectedUsers = 25;
  } else if (conflict.context.entityType === 'organization') {
    // Could affect all users in the organization
    affectedUsers = 100;
  }

  // Identify affected processes
  if (conflict.fields.some(f => ['role', 'is_active'].includes(f.fieldName))) {
    affectedProcesses.push('authentication', 'authorization');
  }
  
  if (conflict.fields.some(f => f.fieldName === 'email')) {
    affectedProcesses.push('notifications', 'communication');
  }
  
  if (conflict.context.entityType === 'enrollment') {
    affectedProcesses.push('student_access', 'gradebook', 'class_roster');
  }

  return {
    severity,
    description,
    affectedUsers,
    affectedProcesses,
  };
}

// ===================================================================
// CONSTANTS
// ===================================================================

export const CONFLICT_RESOLUTION_CONSTANTS = {
  DEFAULT_CONFIDENCE_THRESHOLD: 0.7,
  DEFAULT_BATCH_SIZE: 50,
  DEFAULT_RESOLUTION_TIMEOUT: 60, // seconds
  DEFAULT_ESCALATION_TIMEOUT: 1800, // 30 minutes
  MAX_RETRY_ATTEMPTS: 3,
  MAX_CONFLICTS_PER_QUERY: 1000,
  DEFAULT_REPORT_RETENTION_DAYS: 90,
} as const;

export const SUPPORTED_CONFLICT_TYPES: readonly import('./conflict-resolution.interfaces').ConflictType[] = [
  'field_value',
  'schema',
  'relationship',
  'constraint',
  'temporal',
  'ownership',
  'validation',
  'dependency',
] as const;

export const SUPPORTED_CONFLICT_SEVERITIES: readonly import('./conflict-resolution.interfaces').ConflictSeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
  'blocking',
] as const;

export const SUPPORTED_RESOLUTION_STRATEGIES: readonly import('./conflict-resolution.interfaces').ResolutionStrategy[] = [
  'external_wins',
  'internal_wins',
  'merge',
  'manual',
  'custom',
  'defer',
  'ignore',
] as const;

export const HIGH_RISK_FIELDS_BY_ENTITY = {
  user: ['email', 'role', 'is_active', 'password', 'permissions'],
  class: ['teacher_id', 'is_active', 'max_students', 'organization_id'],
  organization: ['type', 'parent_id', 'name'],
  enrollment: ['status', 'user_id', 'class_id', 'role'],
} as const;

export const DEFAULT_MERGE_STRATEGIES = {
  // String fields - generally prefer external
  name: 'external',
  email: 'external',
  description: 'longest',
  
  // Timestamps - prefer newest
  updated_at: 'newest',
  last_login: 'newest',
  last_activity: 'newest',
  
  // Security fields - prefer internal for safety
  role: 'internal',
  permissions: 'internal',
  is_active: 'external', // Activity status can be updated externally
  
  // IDs and relationships - generally prefer internal for consistency
  organization_id: 'internal',
  parent_id: 'internal',
  teacher_id: 'internal',
} as const;

// ===================================================================
// ERROR CLASSES
// ===================================================================

export class ConflictResolutionError extends Error {
  constructor(
    message: string,
    public readonly conflictId?: string,
    public readonly strategy?: import('./conflict-resolution.interfaces').ResolutionStrategy,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'ConflictResolutionError';
  }
}

export class ConflictDetectionError extends Error {
  constructor(
    message: string,
    public readonly entityType?: import('../synchronizers/base-synchronizer.service').EntityType,
    public readonly entityId?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'ConflictDetectionError';
  }
}

export class ConflictValidationError extends Error {
  constructor(
    message: string,
    public readonly conflictId?: string,
    public readonly validationErrors?: string[],
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'ConflictValidationError';
  }
}
