/**
 * Change Detection and Tracking Interfaces
 * 
 * Comprehensive type definitions for change detection, tracking, and analysis
 * across all integration synchronization operations.
 */

// ===================================================================
// CORE CHANGE DETECTION TYPES
// ===================================================================

export type ChangeType = 'created' | 'updated' | 'deleted' | 'moved' | 'merged' | 'split';

export type ChangeScope = 'field' | 'record' | 'relationship' | 'collection';

export type ChangeSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ChangeMetadata {
  detectedAt: Date;
  detectionMethod: 'automatic' | 'manual' | 'webhook' | 'scheduled';
  confidence: number; // 0-1 confidence score
  source: string;
  correlationId?: string;
  batchId?: string;
}

// ===================================================================
// FIELD-LEVEL CHANGE DETECTION
// ===================================================================

export interface FieldChange {
  fieldName: string;
  fieldType: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array' | 'object';
  oldValue: any;
  newValue: any;
  changeType: ChangeType;
  confidence: number;
  severity: ChangeSeverity;
  isSignificant: boolean;
  metadata?: Record<string, any>;
}

export interface FieldChangeRule {
  fieldName: string;
  isSignificantChange: (oldValue: any, newValue: any) => boolean;
  calculateSeverity: (oldValue: any, newValue: any) => ChangeSeverity;
  calculateConfidence: (oldValue: any, newValue: any) => number;
  customMetadata?: (oldValue: any, newValue: any) => Record<string, any>;
}

// ===================================================================
// ENTITY-LEVEL CHANGE DETECTION
// ===================================================================

export interface EntityChange {
  entityType: string;
  entityId: string;
  externalId?: string;
  changeType: ChangeType;
  fieldChanges: FieldChange[];
  previousState?: any;
  currentState?: any;
  changeScore: number; // 0-100 composite change score
  significance: ChangeSeverity;
  metadata: ChangeMetadata;
  relationships?: RelationshipChange[];
}

export interface RelationshipChange {
  relationshipType: string;
  relatedEntityType: string;
  relatedEntityId: string;
  changeType: ChangeType;
  previousValue?: any;
  currentValue?: any;
  significance: ChangeSeverity;
}

// ===================================================================
// CHANGE DETECTION CONFIGURATION
// ===================================================================

export interface ChangeDetectionConfig {
  entityType: string;
  enabledChangeTypes: ChangeType[];
  fieldRules: Record<string, FieldChangeRule>;
  significanceThreshold: number; // 0-100
  confidenceThreshold: number; // 0-1
  ignoreFields: string[];
  monitorRelationships: boolean;
  batchChangeDetection: boolean;
  historicalComparison: boolean;
  maxHistoryDepth: number;
}

export interface GlobalChangeDetectionConfig {
  enableChangeTracking: boolean;
  defaultConfidence: number;
  defaultSeverity: ChangeSeverity;
  retentionPeriod: number; // days
  compressionThreshold: number; // days after which to compress old changes
  enableRealTimeDetection: boolean;
  batchSize: number;
  maxConcurrentDetections: number;
  enableNotifications: boolean;
}

// ===================================================================
// CHANGE HISTORY AND TRACKING
// ===================================================================

export interface ChangeRecord {
  id: string;
  integrationId: string;
  entityType: string;
  entityId: string;
  externalId?: string;
  changeType: ChangeType;
  fieldChanges: FieldChange[];
  previousHash?: string;
  currentHash?: string;
  changeScore: number;
  significance: ChangeSeverity;
  metadata: ChangeMetadata;
  syncContext?: {
    syncId: string;
    syncType: 'full' | 'incremental' | 'manual';
    providerId: string;
  };
  createdAt: Date;
  processedAt?: Date;
  isProcessed: boolean;
}

export interface ChangeHistoryQuery {
  integrationId?: string;
  entityType?: string;
  entityId?: string;
  changeTypes?: ChangeType[];
  significance?: ChangeSeverity[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  limit?: number;
  offset?: number;
  includeMetadata?: boolean;
  includeFieldChanges?: boolean;
}

export interface ChangeSummary {
  totalChanges: number;
  changesByType: Record<ChangeType, number>;
  changesBySeverity: Record<ChangeSeverity, number>;
  changesByEntity: Record<string, number>;
  averageChangeScore: number;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  topChangedEntities: {
    entityType: string;
    entityId: string;
    changeCount: number;
    averageScore: number;
  }[];
}

// ===================================================================
// DELTA CALCULATION INTERFACES
// ===================================================================

export interface DeltaCalculationOptions {
  includeUnchanged: boolean;
  significanceThreshold: number;
  ignoreFields: string[];
  deepComparison: boolean;
  normalizeValues: boolean;
  customComparisons: Record<string, (a: any, b: any) => boolean>;
}

export interface EntityDelta {
  entityType: string;
  entityId: string;
  hasChanges: boolean;
  changeScore: number;
  fieldDeltas: FieldDelta[];
  metadata: {
    comparedAt: Date;
    comparisonMethod: string;
    totalFields: number;
    changedFields: number;
    unchangedFields: number;
  };
}

export interface FieldDelta {
  fieldName: string;
  hasChanged: boolean;
  changeType: ChangeType | 'no_change';
  oldValue: any;
  newValue: any;
  significance: ChangeSeverity;
  confidence: number;
  normalizedOldValue?: any;
  normalizedNewValue?: any;
}

export interface BatchDelta {
  batchId: string;
  entityType: string;
  totalEntities: number;
  changedEntities: number;
  unchangedEntities: number;
  entityDeltas: EntityDelta[];
  summary: {
    totalChanges: number;
    significantChanges: number;
    averageChangeScore: number;
    changeDistribution: Record<ChangeType, number>;
  };
  metadata: {
    calculatedAt: Date;
    calculationDuration: number;
    options: DeltaCalculationOptions;
  };
}

// ===================================================================
// CHANGE DETECTION RESULT INTERFACES
// ===================================================================

export interface ChangeDetectionResult {
  success: boolean;
  detectionId: string;
  entityChanges: EntityChange[];
  summary: ChangeSummary;
  performance: {
    startTime: Date;
    endTime: Date;
    duration: number;
    entitiesProcessed: number;
    changesDetected: number;
    processingRate: number; // entities per second
  };
  errors: {
    entityId: string;
    error: string;
    severity: 'warning' | 'error';
  }[];
  recommendations: string[];
}

export interface IncrementalSyncPlan {
  integrationId: string;
  entityType: string;
  plannedAt: Date;
  entitiesToSync: {
    entityId: string;
    externalId: string;
    changeScore: number;
    reason: string[];
  }[];
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high';
  dependencies: string[]; // Entity IDs that should be synced first
}

// ===================================================================
// CHANGE NOTIFICATION INTERFACES
// ===================================================================

export interface ChangeNotificationConfig {
  enableNotifications: boolean;
  notificationChannels: ('email' | 'webhook' | 'database' | 'realtime')[];
  filters: {
    minimumSeverity: ChangeSeverity;
    entityTypes: string[];
    changeTypes: ChangeType[];
  };
  throttling: {
    maxPerMinute: number;
    maxPerHour: number;
    consolidationWindow: number; // seconds
  };
}

export interface ChangeNotification {
  id: string;
  integrationId: string;
  entityChange: EntityChange;
  channel: string;
  status: 'pending' | 'sent' | 'failed' | 'throttled';
  createdAt: Date;
  sentAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

// ===================================================================
// VALIDATION AND UTILITY INTERFACES
// ===================================================================

export interface ChangeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  confidence: number;
}

export interface ChangePattern {
  id: string;
  name: string;
  description: string;
  pattern: {
    entityType?: string;
    fieldName?: string;
    changeType?: ChangeType;
    frequency?: 'high' | 'medium' | 'low';
    timeWindow?: number; // hours
  };
  significance: ChangeSeverity;
  automaticActions: string[];
}

export interface ChangeAnalytics {
  changeVelocity: number; // changes per hour
  changeAcceleration: number; // change in velocity
  peakChangeHours: number[];
  commonChangePatterns: ChangePattern[];
  anomalousChanges: EntityChange[];
  predictedChanges: {
    entityType: string;
    entityId: string;
    predictedChangeType: ChangeType;
    confidence: number;
    timeframe: number; // hours until predicted change
  }[];
}
