/**
 * Conflict Resolution Framework Interfaces
 * 
 * Comprehensive type definitions for conflict detection, resolution strategies,
 * workflow management, and escalation procedures across all integration operations.
 */

import { EntityType } from '../synchronizers/base-synchronizer.service';
import { ChangeType, ChangeSeverity, FieldChange } from '../change-tracking/change-detection.interfaces';

// ===================================================================
// CORE CONFLICT TYPES
// ===================================================================

export type ConflictType = 
  | 'field_value'      // Different values for the same field
  | 'schema'           // Structure/schema differences  
  | 'relationship'     // Related entity conflicts
  | 'constraint'       // Business rule violations
  | 'temporal'         // Time-based conflicts (outdated data)
  | 'ownership'        // Data ownership disputes
  | 'validation'       // Validation rule conflicts
  | 'dependency';      // Dependency chain conflicts

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical' | 'blocking';

export type ConflictStatus = 
  | 'detected'         // Newly detected conflict
  | 'pending'          // Awaiting resolution
  | 'in_progress'      // Being actively resolved
  | 'resolved'         // Successfully resolved
  | 'escalated'        // Escalated for manual review
  | 'deferred'         // Resolution postponed
  | 'ignored'          // Marked as safe to ignore
  | 'failed';          // Resolution attempt failed

export type ResolutionStrategy = 
  | 'external_wins'    // External data takes precedence
  | 'internal_wins'    // Internal data takes precedence
  | 'merge'            // Intelligent field-level merging
  | 'manual'           // Manual resolution required
  | 'custom'           // Custom resolution logic
  | 'defer'            // Defer resolution to later
  | 'ignore';          // Ignore the conflict

// ===================================================================
// CONFLICT DATA STRUCTURES
// ===================================================================

export interface ConflictField {
  fieldName: string;
  fieldPath: string;                    // JSON path for nested fields
  fieldType: 'scalar' | 'object' | 'array';
  externalValue: any;
  internalValue: any;
  conflictReason: string;
  confidence: number;                   // 0-1 confidence in conflict detection
  significance: ConflictSeverity;
  resolutionHint?: string;
  metadata?: Record<string, any>;
}

export interface ConflictContext {
  integrationId: string;
  entityType: EntityType;
  entityId: string;
  externalId?: string;
  syncId: string;
  providerId: string;
  detectedAt: Date;
  detectedBy: 'system' | 'user' | 'webhook';
  correlationId?: string;
  sessionId?: string;
}

export interface DataConflict {
  id: string;
  context: ConflictContext;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  status: ConflictStatus;
  title: string;
  description: string;
  fields: ConflictField[];
  externalData: any;
  internalData: any;
  suggestedStrategy: ResolutionStrategy;
  possibleStrategies: ResolutionStrategy[];
  resolutionDeadline?: Date;
  businessImpact: {
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedUsers?: number;
    affectedProcesses?: string[];
  };
  dependencies: string[];              // IDs of related conflicts
  metadata: {
    detectionMethod: string;
    confidenceScore: number;
    changeScore?: number;
    relatedChanges?: string[];         // Change detection IDs
    tags?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}

// ===================================================================
// RESOLUTION STRATEGIES AND POLICIES
// ===================================================================

export interface ResolutionPolicy {
  id: string;
  name: string;
  description: string;
  entityTypes: EntityType[];
  conflictTypes: ConflictType[];
  conditions: {
    fieldPatterns?: string[];          // Regex patterns for field names
    severityThreshold?: ConflictSeverity;
    confidenceThreshold?: number;
    businessRules?: string[];
  };
  strategy: ResolutionStrategy;
  priority: number;                    // Higher number = higher priority
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolutionRule {
  id: string;
  policyId: string;
  entityType: EntityType;
  fieldName: string;
  rule: {
    condition: string;                 // JavaScript-like condition
    action: ResolutionStrategy;
    confidence: number;
    explanation: string;
  };
  examples?: {
    scenario: string;
    externalValue: any;
    internalValue: any;
    expectedOutcome: any;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomResolutionHandler {
  id: string;
  name: string;
  description: string;
  entityTypes: EntityType[];
  conflictTypes: ConflictType[];
  handler: (conflict: DataConflict) => Promise<ResolutionResult>;
  priority: number;
  isActive: boolean;
}

// ===================================================================
// RESOLUTION EXECUTION AND RESULTS
// ===================================================================

export interface ResolutionResult {
  success: boolean;
  strategy: ResolutionStrategy;
  resolvedData?: any;
  appliedChanges: {
    field: string;
    oldValue: any;
    newValue: any;
    source: 'external' | 'internal' | 'merged' | 'custom';
  }[];
  confidence: number;
  explanation: string;
  warnings: string[];
  errors: string[];
  metadata?: Record<string, any>;
  processingTime: number;
  timestamp: Date;
}

export interface ResolutionExecution {
  id: string;
  conflictId: string;
  strategy: ResolutionStrategy;
  executor: 'system' | 'user';
  executorId?: string;
  startedAt: Date;
  completedAt?: Date;
  result?: ResolutionResult;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  error?: string;
  notes?: string;
}

// ===================================================================
// CONFLICT WORKFLOW AND MANAGEMENT
// ===================================================================

export interface ConflictWorkflow {
  id: string;
  name: string;
  description: string;
  triggerConditions: {
    conflictTypes?: ConflictType[];
    severity?: ConflictSeverity[];
    entityTypes?: EntityType[];
    customConditions?: string[];
  };
  steps: ConflictWorkflowStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConflictWorkflowStep {
  id: string;
  name: string;
  type: 'detection' | 'analysis' | 'resolution' | 'escalation' | 'notification' | 'approval';
  configuration: {
    autoExecute: boolean;
    timeout?: number;                  // seconds
    retryPolicy?: {
      maxRetries: number;
      backoffMultiplier: number;
    };
    approvers?: string[];              // User IDs for approval steps
    notifications?: {
      channels: ('email' | 'webhook' | 'database')[];
      recipients: string[];
      template?: string;
    };
  };
  nextSteps: {
    onSuccess?: string;                // Next step ID
    onFailure?: string;
    onTimeout?: string;
  };
}

export interface ConflictEscalation {
  id: string;
  conflictId: string;
  escalatedAt: Date;
  escalatedBy: 'system' | 'user';
  escalatorId?: string;
  reason: string;
  severity: ConflictSeverity;
  assignedTo?: string;                 // User ID
  assignedTeam?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'in_review' | 'resolved' | 'closed';
  resolutionNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// ===================================================================
// CONFLICT ANALYSIS AND REPORTING
// ===================================================================

export interface ConflictAnalysis {
  conflictId: string;
  analysisType: 'automatic' | 'manual' | 'ai_assisted';
  findings: {
    rootCause: string;
    contributingFactors: string[];
    dataQualityIssues: string[];
    systemicPatterns: string[];
    recommendations: string[];
  };
  riskAssessment: {
    businessRisk: 'low' | 'medium' | 'high' | 'critical';
    technicalRisk: 'low' | 'medium' | 'high' | 'critical';
    complianceRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
  };
  resolutionOptions: {
    strategy: ResolutionStrategy;
    pros: string[];
    cons: string[];
    confidence: number;
    estimatedEffort: 'low' | 'medium' | 'high';
    businessImpact: string;
  }[];
  analyzedAt: Date;
  analyzedBy: string;
  confidence: number;
}

export interface ConflictReport {
  integrationId: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalConflicts: number;
    resolvedConflicts: number;
    pendingConflicts: number;
    escalatedConflicts: number;
    averageResolutionTime: number;    // milliseconds
    resolutionSuccessRate: number;    // 0-1
  };
  breakdowns: {
    byEntityType: Record<EntityType, number>;
    byConflictType: Record<ConflictType, number>;
    bySeverity: Record<ConflictSeverity, number>;
    byStrategy: Record<ResolutionStrategy, number>;
    byStatus: Record<ConflictStatus, number>;
  };
  trends: {
    conflictVelocity: number;         // conflicts per hour
    resolutionVelocity: number;       // resolutions per hour
    escalationRate: number;           // escalations per conflict
    patternRecognition: {
      commonPatterns: string[];
      emergingIssues: string[];
      improvementAreas: string[];
    };
  };
  topConflicts: {
    mostFrequent: DataConflict[];
    mostSevere: DataConflict[];
    longestRunning: DataConflict[];
  };
  recommendations: {
    immediateActions: string[];
    preventiveMeasures: string[];
    processImprovements: string[];
    systemEnhancements: string[];
  };
  generatedAt: Date;
  generatedBy: string;
}

// ===================================================================
// CONFIGURATION AND SETTINGS
// ===================================================================

export interface ConflictResolutionConfig {
  general: {
    enableAutoResolution: boolean;
    autoResolutionTimeout: number;    // seconds
    maxRetryAttempts: number;
    escalationTimeout: number;        // seconds
    enableNotifications: boolean;
    enableAuditLogging: boolean;
  };
  detection: {
    enableFieldLevelDetection: boolean;
    enableRelationshipDetection: boolean;
    enableConstraintChecking: boolean;
    confidenceThreshold: number;      // 0-1
    significanceThreshold: ConflictSeverity;
    batchProcessingSize: number;
  };
  resolution: {
    defaultStrategy: ResolutionStrategy;
    enableCustomHandlers: boolean;
    enableMergeStrategy: boolean;
    enableManualOverride: boolean;
    resolutionTimeout: number;        // seconds
  };
  escalation: {
    enableAutoEscalation: boolean;
    escalationCriteria: {
      unresolvedDuration: number;     // seconds
      failureThreshold: number;       // number of failed attempts
      severityThreshold: ConflictSeverity;
    };
    defaultAssignee?: string;
    notificationChannels: ('email' | 'webhook' | 'database')[];
  };
  reporting: {
    enablePeriodicReports: boolean;
    reportFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    reportRecipients: string[];
    enableRealTimeAlerts: boolean;
    alertThresholds: {
      conflictRate: number;           // conflicts per hour
      resolutionFailureRate: number; // 0-1
      escalationRate: number;         // escalations per hour
    };
  };
}

// ===================================================================
// QUERY AND FILTERING INTERFACES
// ===================================================================

export interface ConflictQuery {
  integrationId?: string;
  entityType?: EntityType;
  entityId?: string;
  conflictTypes?: ConflictType[];
  severities?: ConflictSeverity[];
  statuses?: ConflictStatus[];
  strategies?: ResolutionStrategy[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  assignedTo?: string;
  escalated?: boolean;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'severity' | 'priority';
  sortOrder?: 'asc' | 'desc';
  includeResolved?: boolean;
  includeMetadata?: boolean;
}

export interface ConflictSearchResult {
  conflicts: DataConflict[];
  totalCount: number;
  hasMore: boolean;
  aggregations: {
    byType: Record<ConflictType, number>;
    bySeverity: Record<ConflictSeverity, number>;
    byStatus: Record<ConflictStatus, number>;
  };
  queryStats: {
    executionTime: number;
    indexesUsed: string[];
    totalScanned: number;
  };
}

// ===================================================================
// VALIDATION AND UTILITIES
// ===================================================================

export interface ConflictValidationResult {
  isValid: boolean;
  canAutoResolve: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  suggestedActions: string[];
  riskFactors: string[];
  confidence: number;
}

export interface ConflictMetrics {
  detectionRate: number;              // conflicts per sync operation
  resolutionRate: number;             // resolutions per hour
  escalationRate: number;             // escalations per conflict
  averageResolutionTime: number;      // milliseconds
  successRate: number;                // successful resolutions / total attempts
  falsePositiveRate: number;          // incorrectly detected conflicts
  systemicIssueRate: number;          // conflicts indicating broader problems
}

export interface ConflictNotification {
  id: string;
  conflictId: string;
  type: 'detection' | 'escalation' | 'resolution' | 'failure';
  severity: ConflictSeverity;
  title: string;
  message: string;
  recipients: string[];
  channels: ('email' | 'webhook' | 'database' | 'realtime')[];
  status: 'pending' | 'sent' | 'failed' | 'throttled';
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  sentAt?: Date;
  error?: string;
  retryCount: number;
  createdAt: Date;
}

// ===================================================================
// INTEGRATION INTERFACES
// ===================================================================

export interface SynchronizerConflictContext {
  synchronizerId: string;
  entityType: EntityType;
  operation: 'create' | 'update' | 'delete';
  externalData: any;
  internalData?: any;
  syncContext: {
    syncId: string;
    integrationId: string;
    providerId: string;
    startTime: Date;
  };
}

export interface ConflictResolutionHook {
  entityType: EntityType;
  conflictType: ConflictType;
  priority: number;
  handler: (conflict: DataConflict) => Promise<ResolutionResult | null>;
}

export interface ConflictAuditEntry {
  id: string;
  conflictId: string;
  action: 'detected' | 'analyzed' | 'resolved' | 'escalated' | 'updated';
  actor: 'system' | 'user' | 'workflow';
  actorId?: string;
  details: {
    previousState?: any;
    newState?: any;
    changes: string[];
    reason?: string;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
}
