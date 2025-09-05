/**
 * Change Detection Service
 * 
 * Core service for detecting, analyzing, and tracking changes between external
 * and internal data states. Provides comprehensive change detection capabilities
 * with configurable rules and intelligent analysis.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ChangeType,
  ChangeScope,
  ChangeSeverity,
  FieldChange,
  EntityChange,
  ChangeRecord,
  ChangeDetectionResult,
  ChangeDetectionConfig,
  GlobalChangeDetectionConfig,
  EntityDelta,
  FieldDelta,
  BatchDelta,
  DeltaCalculationOptions,
  ChangeHistoryQuery,
  ChangeSummary,
  FieldChangeRule,
  ChangeMetadata,
  ChangeValidationResult,
  ChangeAnalytics,
  IncrementalSyncPlan,
} from './change-detection.interfaces';
import * as crypto from 'crypto';

// ===================================================================
// DEFAULT CONFIGURATIONS
// ===================================================================

const DEFAULT_GLOBAL_CONFIG: GlobalChangeDetectionConfig = {
  enableChangeTracking: true,
  defaultConfidence: 0.8,
  defaultSeverity: 'medium',
  retentionPeriod: 90, // 90 days
  compressionThreshold: 30, // 30 days
  enableRealTimeDetection: true,
  batchSize: 100,
  maxConcurrentDetections: 5,
  enableNotifications: false,
};

const DEFAULT_ENTITY_CONFIG: Omit<ChangeDetectionConfig, 'entityType' | 'fieldRules'> = {
  enabledChangeTypes: ['created', 'updated', 'deleted'],
  significanceThreshold: 20, // 0-100
  confidenceThreshold: 0.7, // 0-1
  ignoreFields: ['id', 'created_at', 'updated_at', 'last_sync_at', 'sync_version'],
  monitorRelationships: true,
  batchChangeDetection: true,
  historicalComparison: true,
  maxHistoryDepth: 10,
};

// ===================================================================
// CHANGE DETECTION SERVICE
// ===================================================================

@Injectable()
export class ChangeDetectionService {
  private readonly logger = new Logger(ChangeDetectionService.name);
  private readonly globalConfig: GlobalChangeDetectionConfig;
  private readonly entityConfigs = new Map<string, ChangeDetectionConfig>();
  private readonly changeRules = new Map<string, Map<string, FieldChangeRule>>();

  constructor(
    private readonly prisma: PrismaService,
  ) {
    this.globalConfig = { ...DEFAULT_GLOBAL_CONFIG };
    this.initializeDefaultEntityConfigs();
    this.logger.log('ChangeDetectionService initialized with default configurations');
  }

  // ===================================================================
  // CORE CHANGE DETECTION METHODS
  // ===================================================================

  /**
   * Detect changes between current and previous entity states
   */
  async detectEntityChanges(
    entityType: string,
    currentData: any[],
    integrationId: string,
    syncContext: { syncId: string; providerId: string; syncType: 'full' | 'incremental' | 'manual' },
  ): Promise<ChangeDetectionResult> {
    const startTime = new Date();
    const detectionId = this.generateDetectionId();

    this.logger.log(`Starting change detection for ${currentData.length} ${entityType} entities`, {
      detectionId,
      syncId: syncContext.syncId,
    });

    try {
      // Get configuration for entity type
      const config = this.getEntityConfig(entityType);
      
      // Get previous states from database
      const previousStates = await this.getPreviousEntityStates(entityType, integrationId);
      
      // Detect changes
      const entityChanges: EntityChange[] = [];
      const errors: { entityId: string; error: string; severity: 'warning' | 'error' }[] = [];
      
      for (const currentEntity of currentData) {
        try {
          const entityId = this.extractEntityId(currentEntity);
          const externalId = this.extractExternalId(currentEntity);
          const previousEntity = previousStates.get(externalId || entityId);
          
          const change = await this.detectSingleEntityChange(
            entityType,
            currentEntity,
            previousEntity,
            config,
            {
              detectedAt: new Date(),
              detectionMethod: 'automatic',
              confidence: this.globalConfig.defaultConfidence,
              source: syncContext.providerId,
              correlationId: syncContext.syncId,
            },
          );
          
          if (change) {
            entityChanges.push(change);
            
            // Store change record
            await this.storeChangeRecord({
              id: this.generateChangeId(),
              integrationId,
              entityType,
              entityId: change.entityId,
              externalId: change.externalId,
              changeType: change.changeType,
              fieldChanges: change.fieldChanges,
              previousHash: previousEntity ? this.calculateEntityHash(previousEntity) : undefined,
              currentHash: this.calculateEntityHash(currentEntity),
              changeScore: change.changeScore,
              significance: change.significance,
              metadata: change.metadata,
              syncContext,
              createdAt: new Date(),
              isProcessed: false,
            });
          }
        } catch (error) {
          errors.push({
            entityId: this.extractEntityId(currentEntity) || 'unknown',
            error: error.message,
            severity: 'error',
          });
        }
      }

      // Generate summary
      const summary = this.generateChangeSummary(entityChanges);
      
      // Calculate performance metrics
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const result: ChangeDetectionResult = {
        success: true,
        detectionId,
        entityChanges,
        summary,
        performance: {
          startTime,
          endTime,
          duration,
          entitiesProcessed: currentData.length,
          changesDetected: entityChanges.length,
          processingRate: currentData.length / (duration / 1000),
        },
        errors,
        recommendations: this.generateRecommendations(entityChanges, errors),
      };

      this.logger.log(`Change detection completed: ${entityChanges.length}/${currentData.length} changes detected`, {
        detectionId,
        duration,
        processingRate: result.performance.processingRate.toFixed(2),
      });

      return result;

    } catch (error) {
      this.logger.error(`Change detection failed: ${error.message}`, error.stack, { detectionId });
      
      return {
        success: false,
        detectionId,
        entityChanges: [],
        summary: this.getEmptySummary(),
        performance: {
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
          entitiesProcessed: 0,
          changesDetected: 0,
          processingRate: 0,
        },
        errors: [{ entityId: 'system', error: error.message, severity: 'error' }],
        recommendations: ['Review system logs and retry change detection'],
      };
    }
  }

  /**
   * Calculate delta between two entity states
   */
  async calculateEntityDelta(
    entityType: string,
    previousData: any,
    currentData: any,
    options: Partial<DeltaCalculationOptions> = {},
  ): Promise<EntityDelta> {
    const fullOptions: DeltaCalculationOptions = {
      includeUnchanged: false,
      significanceThreshold: 10,
      ignoreFields: this.getEntityConfig(entityType).ignoreFields,
      deepComparison: true,
      normalizeValues: true,
      customComparisons: {},
      ...options,
    };

    const entityId = this.extractEntityId(currentData) || this.extractEntityId(previousData);
    const fieldDeltas: FieldDelta[] = [];
    let changeScore = 0;
    let hasChanges = false;

    // Get all fields to compare
    const allFields = new Set([
      ...Object.keys(previousData || {}),
      ...Object.keys(currentData || {}),
    ]);

    const fieldsToCompare = Array.from(allFields).filter(
      field => !fullOptions.ignoreFields.includes(field)
    );

    for (const fieldName of fieldsToCompare) {
      const oldValue = previousData?.[fieldName];
      const newValue = currentData?.[fieldName];
      
      const fieldDelta = this.calculateFieldDelta(
        fieldName,
        oldValue,
        newValue,
        fullOptions,
      );

      if (fieldDelta.hasChanged || fullOptions.includeUnchanged) {
        fieldDeltas.push(fieldDelta);
      }

      if (fieldDelta.hasChanged) {
        hasChanges = true;
        changeScore += this.getFieldChangeScore(fieldDelta.significance);
      }
    }

    // Normalize change score (0-100)
    const normalizedScore = Math.min(100, changeScore);

    return {
      entityType,
      entityId,
      hasChanges,
      changeScore: normalizedScore,
      fieldDeltas,
      metadata: {
        comparedAt: new Date(),
        comparisonMethod: 'field-by-field',
        totalFields: fieldsToCompare.length,
        changedFields: fieldDeltas.filter(f => f.hasChanged).length,
        unchangedFields: fieldDeltas.filter(f => !f.hasChanged).length,
      },
    };
  }

  /**
   * Calculate batch delta for multiple entities
   */
  async calculateBatchDelta(
    entityType: string,
    previousEntities: any[],
    currentEntities: any[],
    options: Partial<DeltaCalculationOptions> = {},
  ): Promise<BatchDelta> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();

    // Create maps for efficient lookup
    const previousMap = new Map();
    const currentMap = new Map();

    previousEntities.forEach(entity => {
      const id = this.extractEntityId(entity) || this.extractExternalId(entity);
      if (id) previousMap.set(id, entity);
    });

    currentEntities.forEach(entity => {
      const id = this.extractEntityId(entity) || this.extractExternalId(entity);
      if (id) currentMap.set(id, entity);
    });

    // Calculate deltas
    const entityDeltas: EntityDelta[] = [];
    const allEntityIds = new Set([...previousMap.keys(), ...currentMap.keys()]);

    for (const entityId of allEntityIds) {
      const previousEntity = previousMap.get(entityId);
      const currentEntity = currentMap.get(entityId);

      const delta = await this.calculateEntityDelta(
        entityType,
        previousEntity,
        currentEntity,
        options,
      );

      entityDeltas.push(delta);
    }

    // Calculate summary statistics
    const changedEntities = entityDeltas.filter(d => d.hasChanges).length;
    const unchangedEntities = entityDeltas.length - changedEntities;
    const totalChanges = entityDeltas.reduce((sum, d) => sum + d.fieldDeltas.filter(f => f.hasChanged).length, 0);
    const significantChanges = entityDeltas.filter(d => d.changeScore >= (options.significanceThreshold || 10)).length;
    const averageChangeScore = entityDeltas.reduce((sum, d) => sum + d.changeScore, 0) / entityDeltas.length;

    // Calculate change distribution
    const changeDistribution: Record<ChangeType, number> = {
      created: 0,
      updated: 0,
      deleted: 0,
      moved: 0,
      merged: 0,
      split: 0,
    };

    entityDeltas.forEach(delta => {
      const previousExists = previousMap.has(delta.entityId);
      const currentExists = currentMap.has(delta.entityId);

      if (!previousExists && currentExists) {
        changeDistribution.created++;
      } else if (previousExists && !currentExists) {
        changeDistribution.deleted++;
      } else if (previousExists && currentExists && delta.hasChanges) {
        changeDistribution.updated++;
      }
    });

    return {
      batchId,
      entityType,
      totalEntities: entityDeltas.length,
      changedEntities,
      unchangedEntities,
      entityDeltas,
      summary: {
        totalChanges,
        significantChanges,
        averageChangeScore,
        changeDistribution,
      },
      metadata: {
        calculatedAt: new Date(),
        calculationDuration: Date.now() - startTime,
        options: { ...DEFAULT_ENTITY_CONFIG, ...options } as DeltaCalculationOptions,
      },
    };
  }

  // ===================================================================
  // CHANGE HISTORY METHODS
  // ===================================================================

  /**
   * Query change history with flexible filters
   */
  async queryChangeHistory(query: ChangeHistoryQuery): Promise<{
    changes: ChangeRecord[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const where: any = {};

    if (query.integrationId) where.integration_id = query.integrationId;
    if (query.entityType) where.entity_type = query.entityType;
    if (query.entityId) where.entity_id = query.entityId;
    if (query.changeTypes?.length) where.change_type = { in: query.changeTypes };
    if (query.significance?.length) where.significance = { in: query.significance };
    
    if (query.dateRange) {
      where.created_at = {
        gte: query.dateRange.startDate,
        lte: query.dateRange.endDate,
      };
    }

    const [changes, totalCount] = await Promise.all([
      this.prisma.integrationAuditLog.findMany({
        where,
        orderBy: { occurred_at: 'desc' },
        skip: query.offset || 0,
        take: query.limit || 50,
      }),
      this.prisma.integrationAuditLog.count({ where }),
    ]);

    const limit = query.limit || 50;
    const hasMore = totalCount > (query.offset || 0) + limit;

    // Transform to ChangeRecord format
    const changeRecords: ChangeRecord[] = changes.map(change => ({
      id: change.id,
      integrationId: change.integration_id,
      entityType: change.entity_type || 'unknown',
      entityId: change.entity_id || 'unknown',
      externalId: change.external_entity_id || undefined,
      changeType: (change.event_type as ChangeType) || 'updated',
      fieldChanges: [], // Would need to parse from details
      previousHash: undefined,
      currentHash: undefined,
      changeScore: 50, // Default score
      significance: (change.severity as ChangeSeverity) || 'medium',
      metadata: {
        detectedAt: change.occurred_at,
        detectionMethod: 'automatic',
        confidence: 0.8,
        source: 'system',
        correlationId: change.correlation_id || undefined,
      },
      syncContext: change.correlation_id ? {
        syncId: change.correlation_id,
        syncType: 'full',
        providerId: 'unknown',
      } : undefined,
      createdAt: change.occurred_at,
      processedAt: change.occurred_at,
      isProcessed: true,
    }));

    return {
      changes: changeRecords,
      totalCount,
      hasMore,
    };
  }

  /**
   * Get change summary for a time period
   */
  async getChangeSummary(
    integrationId: string,
    entityType?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ChangeSummary> {
    const where: any = { integration_id: integrationId };
    
    if (entityType) where.entity_type = entityType;
    if (startDate || endDate) {
      where.occurred_at = {};
      if (startDate) where.occurred_at.gte = startDate;
      if (endDate) where.occurred_at.lte = endDate;
    }

    const changes = await this.prisma.integrationAuditLog.findMany({
      where,
      select: {
        entity_type: true,
        entity_id: true,
        event_type: true,
        severity: true,
        occurred_at: true,
      },
    });

    // Calculate statistics
    const totalChanges = changes.length;
    const changesByType: Record<ChangeType, number> = {
      created: 0,
      updated: 0,
      deleted: 0,
      moved: 0,
      merged: 0,
      split: 0,
    };
    const changesBySeverity: Record<ChangeSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const changesByEntity: Record<string, number> = {};

    changes.forEach(change => {
      const changeType = (change.event_type as ChangeType) || 'updated';
      const severity = (change.severity as ChangeSeverity) || 'medium';
      const entityType = change.entity_type || 'unknown';

      changesByType[changeType] = (changesByType[changeType] || 0) + 1;
      changesBySeverity[severity] = (changesBySeverity[severity] || 0) + 1;
      changesByEntity[entityType] = (changesByEntity[entityType] || 0) + 1;
    });

    // Top changed entities
    const entityChangeCounts = new Map<string, { count: number; scores: number[] }>();
    changes.forEach(change => {
      const key = `${change.entity_type}:${change.entity_id}`;
      const existing = entityChangeCounts.get(key) || { count: 0, scores: [] };
      existing.count++;
      existing.scores.push(50); // Default score
      entityChangeCounts.set(key, existing);
    });

    const topChangedEntities = Array.from(entityChangeCounts.entries())
      .map(([key, data]) => {
        const [entityType, entityId] = key.split(':');
        return {
          entityType,
          entityId,
          changeCount: data.count,
          averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
        };
      })
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 10);

    const dates = changes.map(c => c.occurred_at).sort((a, b) => a.getTime() - b.getTime());
    
    return {
      totalChanges,
      changesByType,
      changesBySeverity,
      changesByEntity,
      averageChangeScore: 50, // Would need to calculate from actual change scores
      timeRange: {
        startDate: dates[0] || startDate || new Date(),
        endDate: dates[dates.length - 1] || endDate || new Date(),
      },
      topChangedEntities,
    };
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private async detectSingleEntityChange(
    entityType: string,
    currentEntity: any,
    previousEntity: any,
    config: ChangeDetectionConfig,
    metadata: ChangeMetadata,
  ): Promise<EntityChange | null> {
    const entityId = this.extractEntityId(currentEntity) || this.extractEntityId(previousEntity);
    const externalId = this.extractExternalId(currentEntity) || this.extractExternalId(previousEntity);

    // Determine change type
    let changeType: ChangeType;
    if (!previousEntity && currentEntity) {
      changeType = 'created';
    } else if (previousEntity && !currentEntity) {
      changeType = 'deleted';
    } else if (previousEntity && currentEntity) {
      changeType = 'updated';
    } else {
      return null; // No change detected
    }

    // For deleted entities, create minimal change record
    if (changeType === 'deleted') {
      return {
        entityType,
        entityId,
        externalId,
        changeType,
        fieldChanges: [],
        previousState: previousEntity,
        currentState: null,
        changeScore: 100, // Deletion is always significant
        significance: 'high',
        metadata,
      };
    }

    // For created entities, all fields are "changed"
    if (changeType === 'created') {
      const fieldChanges = this.detectFieldChanges(null, currentEntity, config);
      return {
        entityType,
        entityId,
        externalId,
        changeType,
        fieldChanges,
        previousState: null,
        currentState: currentEntity,
        changeScore: this.calculateChangeScore(fieldChanges),
        significance: this.calculateSignificance(fieldChanges),
        metadata,
      };
    }

    // For updated entities, detect field-level changes
    const fieldChanges = this.detectFieldChanges(previousEntity, currentEntity, config);
    
    if (fieldChanges.length === 0) {
      return null; // No significant changes
    }

    return {
      entityType,
      entityId,
      externalId,
      changeType,
      fieldChanges,
      previousState: previousEntity,
      currentState: currentEntity,
      changeScore: this.calculateChangeScore(fieldChanges),
      significance: this.calculateSignificance(fieldChanges),
      metadata,
    };
  }

  private detectFieldChanges(
    previousEntity: any,
    currentEntity: any,
    config: ChangeDetectionConfig,
  ): FieldChange[] {
    const changes: FieldChange[] = [];
    const allFields = new Set([
      ...Object.keys(previousEntity || {}),
      ...Object.keys(currentEntity || {}),
    ]);

    for (const fieldName of allFields) {
      if (config.ignoreFields.includes(fieldName)) {
        continue;
      }

      const oldValue = previousEntity?.[fieldName];
      const newValue = currentEntity?.[fieldName];

      const fieldChange = this.analyzeFieldChange(
        fieldName,
        oldValue,
        newValue,
        config,
      );

      if (fieldChange && fieldChange.isSignificant) {
        changes.push(fieldChange);
      }
    }

    return changes;
  }

  private analyzeFieldChange(
    fieldName: string,
    oldValue: any,
    newValue: any,
    config: ChangeDetectionConfig,
  ): FieldChange | null {
    // Check if values are actually different
    if (this.areValuesEqual(oldValue, newValue)) {
      return null;
    }

    // Get field-specific rules
    const rule = config.fieldRules[fieldName];
    const fieldType = this.determineFieldType(newValue || oldValue);

    // Determine change type
    let changeType: ChangeType;
    if (oldValue == null && newValue != null) {
      changeType = 'created';
    } else if (oldValue != null && newValue == null) {
      changeType = 'deleted';
    } else {
      changeType = 'updated';
    }

    // Calculate significance and confidence
    const isSignificant = rule?.isSignificantChange(oldValue, newValue) ?? this.isSignificantChange(oldValue, newValue, fieldType);
    const severity = rule?.calculateSeverity(oldValue, newValue) ?? this.calculateFieldSeverity(oldValue, newValue, fieldType);
    const confidence = rule?.calculateConfidence(oldValue, newValue) ?? config.confidenceThreshold;

    if (!isSignificant) {
      return null;
    }

    return {
      fieldName,
      fieldType,
      oldValue,
      newValue,
      changeType,
      confidence,
      severity,
      isSignificant,
      metadata: rule?.customMetadata?.(oldValue, newValue),
    };
  }

  private calculateFieldDelta(
    fieldName: string,
    oldValue: any,
    newValue: any,
    options: DeltaCalculationOptions,
  ): FieldDelta {
    const hasChanged = !this.areValuesEqual(oldValue, newValue);
    
    let changeType: ChangeType | 'no_change';
    if (!hasChanged) {
      changeType = 'no_change';
    } else if (oldValue == null && newValue != null) {
      changeType = 'created';
    } else if (oldValue != null && newValue == null) {
      changeType = 'deleted';
    } else {
      changeType = 'updated';
    }

    // Normalize values if requested
    let normalizedOldValue = oldValue;
    let normalizedNewValue = newValue;
    
    if (options.normalizeValues) {
      normalizedOldValue = this.normalizeValue(oldValue);
      normalizedNewValue = this.normalizeValue(newValue);
    }

    const fieldType = this.determineFieldType(newValue || oldValue);
    const significance = hasChanged ? this.calculateFieldSeverity(oldValue, newValue, fieldType) : 'low';
    const confidence = hasChanged ? 0.9 : 1.0;

    return {
      fieldName,
      hasChanged,
      changeType,
      oldValue,
      newValue,
      significance,
      confidence,
      normalizedOldValue: options.normalizeValues ? normalizedOldValue : undefined,
      normalizedNewValue: options.normalizeValues ? normalizedNewValue : undefined,
    };
  }

  private async getPreviousEntityStates(
    entityType: string,
    integrationId: string,
  ): Promise<Map<string, any>> {
    // This would query the last known state from database
    // For now, return empty map (no previous state)
    return new Map();
  }

  private calculateChangeScore(fieldChanges: FieldChange[]): number {
    if (fieldChanges.length === 0) return 0;

    const totalScore = fieldChanges.reduce((sum, change) => {
      return sum + this.getFieldChangeScore(change.severity) * change.confidence;
    }, 0);

    return Math.min(100, totalScore / fieldChanges.length * 10);
  }

  private calculateSignificance(fieldChanges: FieldChange[]): ChangeSeverity {
    if (fieldChanges.length === 0) return 'low';

    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const maxSeverity = Math.max(...fieldChanges.map(c => severityScores[c.severity]));

    if (maxSeverity >= 4) return 'critical';
    if (maxSeverity >= 3) return 'high';
    if (maxSeverity >= 2) return 'medium';
    return 'low';
  }

  private getFieldChangeScore(severity: ChangeSeverity): number {
    switch (severity) {
      case 'critical': return 25;
      case 'high': return 15;
      case 'medium': return 10;
      case 'low': return 5;
      default: return 5;
    }
  }

  private areValuesEqual(value1: any, value2: any): boolean {
    if (value1 === value2) return true;
    if (value1 == null && value2 == null) return true;
    if (value1 == null || value2 == null) return false;

    // Handle dates
    if (value1 instanceof Date && value2 instanceof Date) {
      return value1.getTime() === value2.getTime();
    }

    // Handle objects/arrays
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      return JSON.stringify(value1) === JSON.stringify(value2);
    }

    // Handle strings (case-insensitive, trimmed)
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.trim().toLowerCase() === value2.trim().toLowerCase();
    }

    return false;
  }

  private isSignificantChange(oldValue: any, newValue: any, fieldType: string): boolean {
    // Default significance rules
    if (oldValue == null && newValue != null) return true;
    if (oldValue != null && newValue == null) return true;
    
    if (fieldType === 'string') {
      const oldStr = (oldValue || '').toString().trim();
      const newStr = (newValue || '').toString().trim();
      return oldStr !== newStr && (newStr.length > 0 || oldStr.length > 0);
    }
    
    return !this.areValuesEqual(oldValue, newValue);
  }

  private calculateFieldSeverity(oldValue: any, newValue: any, fieldType: string): ChangeSeverity {
    // Critical changes
    if (fieldType === 'boolean') return 'high';
    if (oldValue == null && newValue != null) return 'medium';
    if (oldValue != null && newValue == null) return 'high';
    
    // String changes
    if (fieldType === 'string') {
      const oldLen = (oldValue || '').toString().length;
      const newLen = (newValue || '').toString().length;
      const lengthDiff = Math.abs(newLen - oldLen);
      
      if (lengthDiff > 100) return 'high';
      if (lengthDiff > 20) return 'medium';
      return 'low';
    }
    
    return 'medium';
  }

  private determineFieldType(value: any): 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array' | 'object' {
    if (value == null) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  private normalizeValue(value: any): any {
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }
    return value;
  }

  private generateChangeSummary(entityChanges: EntityChange[]): ChangeSummary {
    const totalChanges = entityChanges.length;
    const changesByType: Record<ChangeType, number> = {
      created: 0,
      updated: 0,
      deleted: 0,
      moved: 0,
      merged: 0,
      split: 0,
    };
    const changesBySeverity: Record<ChangeSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const changesByEntity: Record<string, number> = {};

    entityChanges.forEach(change => {
      changesByType[change.changeType]++;
      changesBySeverity[change.significance]++;
      changesByEntity[change.entityType] = (changesByEntity[change.entityType] || 0) + 1;
    });

    const averageChangeScore = entityChanges.length > 0
      ? entityChanges.reduce((sum, change) => sum + change.changeScore, 0) / entityChanges.length
      : 0;

    const topChangedEntities = entityChanges
      .map(change => ({
        entityType: change.entityType,
        entityId: change.entityId,
        changeCount: 1,
        averageScore: change.changeScore,
      }))
      .slice(0, 10);

    return {
      totalChanges,
      changesByType,
      changesBySeverity,
      changesByEntity,
      averageChangeScore,
      timeRange: {
        startDate: new Date(),
        endDate: new Date(),
      },
      topChangedEntities,
    };
  }

  private getEmptySummary(): ChangeSummary {
    return {
      totalChanges: 0,
      changesByType: { created: 0, updated: 0, deleted: 0, moved: 0, merged: 0, split: 0 },
      changesBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      changesByEntity: {},
      averageChangeScore: 0,
      timeRange: { startDate: new Date(), endDate: new Date() },
      topChangedEntities: [],
    };
  }

  private generateRecommendations(entityChanges: EntityChange[], errors: any[]): string[] {
    const recommendations: string[] = [];

    if (errors.length > 0) {
      recommendations.push(`Review ${errors.length} errors that occurred during change detection`);
    }

    const highSeverityChanges = entityChanges.filter(c => c.significance === 'high' || c.significance === 'critical').length;
    if (highSeverityChanges > 0) {
      recommendations.push(`Review ${highSeverityChanges} high-severity changes for potential data issues`);
    }

    const createdCount = entityChanges.filter(c => c.changeType === 'created').length;
    if (createdCount > 0) {
      recommendations.push(`${createdCount} new entities were created - verify they are expected`);
    }

    const deletedCount = entityChanges.filter(c => c.changeType === 'deleted').length;
    if (deletedCount > 0) {
      recommendations.push(`${deletedCount} entities were deleted - confirm this is intentional`);
    }

    return recommendations;
  }

  private async storeChangeRecord(record: ChangeRecord): Promise<void> {
    try {
      await this.prisma.integrationAuditLog.create({
        data: {
          integration_id: record.integrationId,
          event_type: 'change_detected',
          event_category: 'data_change',
          severity: record.significance,
          description: `${record.changeType} change detected for ${record.entityType}`,
          details: {
            changeType: record.changeType,
            fieldChanges: record.fieldChanges,
            changeScore: record.changeScore,
            metadata: record.metadata,
          },
          entity_type: record.entityType,
          entity_id: record.entityId,
          external_entity_id: record.externalId,
          correlation_id: record.syncContext?.syncId,
          duration_ms: 0,
          occurred_at: record.createdAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to store change record: ${error.message}`, error.stack);
    }
  }

  private extractEntityId(entity: any): string | null {
    return entity?.id || entity?.internal_id || null;
  }

  private extractExternalId(entity: any): string | null {
    return entity?.external_id || entity?.externalId || null;
  }

  private calculateEntityHash(entity: any): string {
    const normalized = JSON.stringify(entity, Object.keys(entity).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  private generateDetectionId(): string {
    return `detection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEntityConfig(entityType: string): ChangeDetectionConfig {
    return this.entityConfigs.get(entityType) || {
      ...DEFAULT_ENTITY_CONFIG,
      entityType,
      fieldRules: {},
    };
  }

  private initializeDefaultEntityConfigs(): void {
    // Set up default configurations for each entity type
    const entityTypes = ['user', 'class', 'organization', 'enrollment'];
    
    entityTypes.forEach(entityType => {
      this.entityConfigs.set(entityType, {
        ...DEFAULT_ENTITY_CONFIG,
        entityType,
        fieldRules: this.getDefaultFieldRules(entityType),
      });
    });
  }

  private getDefaultFieldRules(entityType: string): Record<string, FieldChangeRule> {
    const commonRules: Record<string, FieldChangeRule> = {
      email: {
        fieldName: 'email',
        isSignificantChange: (oldValue, newValue) => {
          const old = (oldValue || '').toString().toLowerCase().trim();
          const newVal = (newValue || '').toString().toLowerCase().trim();
          return old !== newVal;
        },
        calculateSeverity: () => 'high', // Email changes are always significant
        calculateConfidence: () => 0.95,
      },
      name: {
        fieldName: 'name',
        isSignificantChange: (oldValue, newValue) => {
          const old = (oldValue || '').toString().trim();
          const newVal = (newValue || '').toString().trim();
          return old !== newVal && (old.length > 0 || newVal.length > 0);
        },
        calculateSeverity: (oldValue, newValue) => {
          const lengthDiff = Math.abs((newValue || '').length - (oldValue || '').length);
          return lengthDiff > 20 ? 'high' : 'medium';
        },
        calculateConfidence: () => 0.9,
      },
      is_active: {
        fieldName: 'is_active',
        isSignificantChange: (oldValue, newValue) => oldValue !== newValue,
        calculateSeverity: () => 'high', // Status changes are critical
        calculateConfidence: () => 0.99,
      },
    };

    return commonRules;
  }
}
