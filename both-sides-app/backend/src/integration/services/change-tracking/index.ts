/**
 * Change Tracking Module Index
 * 
 * Central exports for all change detection, tracking, and history services.
 * Provides convenient single import point for change tracking functionality.
 */

// ===================================================================
// CORE SERVICES
// ===================================================================

export { ChangeDetectionService } from './change-detection.service';
export { ChangeTrackingService } from './change-tracking.service';
export { ChangeHistoryService } from './change-history.service';

// ===================================================================
// INTERFACES AND TYPES
// ===================================================================

export type {
  // Core change detection types
  ChangeType,
  ChangeScope,
  ChangeSeverity,
  ChangeMetadata,
  
  // Field-level change detection
  FieldChange,
  FieldChangeRule,
  
  // Entity-level change detection
  EntityChange,
  RelationshipChange,
  
  // Configuration
  ChangeDetectionConfig,
  GlobalChangeDetectionConfig,
  
  // Change history and tracking
  ChangeRecord,
  ChangeHistoryQuery,
  ChangeSummary,
  
  // Delta calculation
  DeltaCalculationOptions,
  EntityDelta,
  FieldDelta,
  BatchDelta,
  
  // Results and analysis
  ChangeDetectionResult,
  IncrementalSyncPlan,
  ChangeAnalytics,
  ChangePattern,
  
  // Notifications
  ChangeNotificationConfig,
  ChangeNotification,
  
  // Validation
  ChangeValidationResult,
} from './change-detection.interfaces';

export type {
  // Change history specific types
  ChangeHistoryConfig,
  ChangeHistoryStats,
  ChangeHistoryCleanupResult,
  CompressedChangeRecord,
} from './change-history.service';

export type {
  // Change tracking specific types
  ChangeTrackingConfig,
  ChangeTrackingSession,
  ChangeTrackingReport,
} from './change-tracking.service';

// ===================================================================
// UTILITIES AND HELPERS
// ===================================================================

/**
 * Utility function to create a basic change detection config
 */
export function createChangeDetectionConfig(
  entityType: string,
  options?: {
    ignoreFields?: string[];
    significanceThreshold?: number;
    confidenceThreshold?: number;
    monitorRelationships?: boolean;
  }
): Partial<import('./change-detection.interfaces').ChangeDetectionConfig> {
  return {
    entityType,
    enabledChangeTypes: ['created', 'updated', 'deleted'],
    significanceThreshold: options?.significanceThreshold || 20,
    confidenceThreshold: options?.confidenceThreshold || 0.7,
    ignoreFields: options?.ignoreFields || ['id', 'created_at', 'updated_at', 'last_sync_at', 'sync_version'],
    monitorRelationships: options?.monitorRelationships ?? true,
    batchChangeDetection: true,
    historicalComparison: true,
    maxHistoryDepth: 10,
    fieldRules: {},
  };
}

/**
 * Utility function to create a basic change history query
 */
export function createChangeHistoryQuery(
  integrationId: string,
  options?: {
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
): import('./change-detection.interfaces').ChangeHistoryQuery {
  return {
    integrationId,
    entityType: options?.entityType,
    entityId: options?.entityId,
    dateRange: (options?.startDate || options?.endDate) ? {
      startDate: options?.startDate || new Date(0),
      endDate: options?.endDate || new Date(),
    } : undefined,
    limit: options?.limit || 50,
    offset: options?.offset || 0,
    includeMetadata: true,
    includeFieldChanges: true,
  };
}

/**
 * Utility function to determine change significance based on field changes
 */
export function calculateChangeSignificance(
  fieldChanges: import('./change-detection.interfaces').FieldChange[]
): import('./change-detection.interfaces').ChangeSeverity {
  if (fieldChanges.length === 0) return 'low';

  const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
  const maxSeverity = Math.max(...fieldChanges.map(c => severityScores[c.severity]));

  if (maxSeverity >= 4) return 'critical';
  if (maxSeverity >= 3) return 'high';
  if (maxSeverity >= 2) return 'medium';
  return 'low';
}

/**
 * Utility function to generate change type from field changes
 */
export function determineChangeType(
  previousEntity: any,
  currentEntity: any
): import('./change-detection.interfaces').ChangeType {
  if (!previousEntity && currentEntity) return 'created';
  if (previousEntity && !currentEntity) return 'deleted';
  if (previousEntity && currentEntity) return 'updated';
  return 'updated';
}

/**
 * Utility function to create a sync context
 */
export function createSyncContext(
  integrationId: string,
  providerId: string,
  options?: {
    syncId?: string;
    externalSystemId?: string;
    userId?: string;
    correlationId?: string;
  }
): import('../synchronizers/base-synchronizer.service').SyncContext {
  return {
    syncId: options?.syncId || `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    integrationId,
    providerId,
    externalSystemId: options?.externalSystemId || providerId,
    startTime: new Date(),
    userId: options?.userId,
    correlationId: options?.correlationId,
  };
}

/**
 * Utility function to validate change tracking configuration
 */
export function validateChangeTrackingConfig(
  config: Partial<import('./change-tracking.service').ChangeTrackingConfig>
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.detectionInterval && config.detectionInterval < 1) {
    errors.push('Detection interval must be at least 1 minute');
  }

  if (config.incrementalSyncThreshold && config.incrementalSyncThreshold < 1) {
    errors.push('Incremental sync threshold must be at least 1');
  }

  if (config.retentionPeriod && config.retentionPeriod < 1) {
    errors.push('Retention period must be at least 1 day');
  }

  if (config.detectionInterval && config.detectionInterval > 1440) {
    warnings.push('Detection interval over 24 hours may result in missed changes');
  }

  if (config.retentionPeriod && config.retentionPeriod < 7) {
    warnings.push('Retention period less than 7 days may result in insufficient audit trail');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ===================================================================
// CONSTANTS
// ===================================================================

export const CHANGE_TRACKING_CONSTANTS = {
  DEFAULT_BATCH_SIZE: 100,
  DEFAULT_RETENTION_PERIOD: 90, // days
  DEFAULT_COMPRESSION_THRESHOLD: 30, // days
  DEFAULT_DETECTION_INTERVAL: 30, // minutes
  DEFAULT_INCREMENTAL_SYNC_THRESHOLD: 5, // changes
  MAX_RECORDS_PER_QUERY: 1000,
  MAX_FIELD_CHANGES_PER_ENTITY: 50,
  DEFAULT_CONFIDENCE_THRESHOLD: 0.7,
  DEFAULT_SIGNIFICANCE_THRESHOLD: 20,
} as const;

export const SUPPORTED_CHANGE_TYPES: readonly import('./change-detection.interfaces').ChangeType[] = [
  'created',
  'updated',
  'deleted',
  'moved',
  'merged',
  'split',
] as const;

export const SUPPORTED_CHANGE_SEVERITIES: readonly import('./change-detection.interfaces').ChangeSeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
] as const;

export const IGNORED_FIELDS_BY_ENTITY = {
  user: ['id', 'created_at', 'updated_at', 'last_sync_at', 'sync_version', 'password_hash'],
  class: ['id', 'created_at', 'updated_at', 'last_sync_at', 'sync_version'],
  organization: ['id', 'created_at', 'updated_at', 'last_sync_at', 'sync_version'],
  enrollment: ['id', 'created_at', 'updated_at', 'last_sync_at', 'sync_version'],
} as const;
