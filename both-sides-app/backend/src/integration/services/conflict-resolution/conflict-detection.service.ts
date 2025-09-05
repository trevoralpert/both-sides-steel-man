/**
 * Conflict Detection Service
 * 
 * Advanced conflict detection system that analyzes data inconsistencies,
 * relationship conflicts, and constraint violations across entity synchronization.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExternalIdMappingService } from '../external-id-mapping.service';
import {
  DataConflict,
  ConflictType,
  ConflictSeverity,
  ConflictStatus,
  ConflictField,
  ConflictContext,
  ResolutionStrategy,
  ConflictValidationResult,
  ConflictQuery,
  ConflictSearchResult,
} from './conflict-resolution.interfaces';
import { EntityType, SyncContext } from '../synchronizers/base-synchronizer.service';
import { ChangeDetectionService } from '../change-tracking/change-detection.service';
import { FieldChange } from '../change-tracking/change-detection.interfaces';
import * as crypto from 'crypto';

// ===================================================================
// CONFLICT DETECTION CONFIGURATION
// ===================================================================

interface FieldConflictRule {
  fieldName: string;
  conflictTypes: ConflictType[];
  severityCalculator: (external: any, internal: any) => ConflictSeverity;
  resolutionHint: (external: any, internal: any) => string;
  confidenceCalculator: (external: any, internal: any) => number;
}

interface EntityConflictRules {
  entityType: EntityType;
  fieldRules: Record<string, FieldConflictRule>;
  relationshipRules: {
    fieldName: string;
    relatedEntityType: EntityType;
    conflictDetector: (external: any, internal: any) => ConflictField | null;
  }[];
  constraintRules: {
    name: string;
    validator: (data: any) => { isValid: boolean; message: string };
    conflictType: ConflictType;
    severity: ConflictSeverity;
  }[];
}

// ===================================================================
// CONFLICT DETECTION SERVICE
// ===================================================================

@Injectable()
export class ConflictDetectionService {
  private readonly logger = new Logger(ConflictDetectionService.name);
  private readonly entityRules = new Map<EntityType, EntityConflictRules>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mappingService: ExternalIdMappingService,
    private readonly changeDetectionService: ChangeDetectionService,
  ) {
    this.initializeConflictRules();
    this.logger.log('ConflictDetectionService initialized');
  }

  // ===================================================================
  // CORE CONFLICT DETECTION METHODS
  // ===================================================================

  /**
   * Detect conflicts between external and internal data
   */
  async detectConflicts(
    entityType: EntityType,
    externalData: any,
    internalData: any,
    syncContext: SyncContext,
  ): Promise<DataConflict | null> {
    const startTime = Date.now();
    
    try {
      // Get entity-specific rules
      const rules = this.entityRules.get(entityType);
      if (!rules) {
        this.logger.warn(`No conflict rules found for entity type: ${entityType}`);
        return null;
      }

      const conflictFields: ConflictField[] = [];
      const context: ConflictContext = {
        integrationId: syncContext.integrationId,
        entityType,
        entityId: this.extractEntityId(internalData) || this.extractExternalId(externalData),
        externalId: this.extractExternalId(externalData),
        syncId: syncContext.syncId,
        providerId: syncContext.providerId || 'unknown',
        detectedAt: new Date(),
        detectedBy: 'system',
        correlationId: syncContext.correlationId,
      };

      // 1. Field-level conflict detection
      const fieldConflicts = await this.detectFieldConflicts(
        externalData,
        internalData,
        rules.fieldRules,
      );
      conflictFields.push(...fieldConflicts);

      // 2. Relationship conflict detection
      const relationshipConflicts = await this.detectRelationshipConflicts(
        externalData,
        internalData,
        rules.relationshipRules,
        syncContext,
      );
      conflictFields.push(...relationshipConflicts);

      // 3. Constraint validation conflicts
      const constraintConflicts = await this.detectConstraintConflicts(
        externalData,
        internalData,
        rules.constraintRules,
      );
      conflictFields.push(...constraintConflicts);

      // 4. Temporal conflicts (outdated data)
      const temporalConflicts = await this.detectTemporalConflicts(
        externalData,
        internalData,
        syncContext,
      );
      conflictFields.push(...temporalConflicts);

      if (conflictFields.length === 0) {
        return null; // No conflicts detected
      }

      // Create conflict record
      const conflict = await this.createConflictRecord(
        context,
        conflictFields,
        externalData,
        internalData,
      );

      this.logger.log(`Conflict detected for ${entityType}:${context.entityId}`, {
        conflictId: conflict.id,
        fieldConflicts: conflictFields.length,
        severity: conflict.severity,
        processingTime: Date.now() - startTime,
      });

      return conflict;

    } catch (error) {
      this.logger.error(`Conflict detection failed: ${error.message}`, error.stack, {
        entityType,
        syncId: syncContext.syncId,
      });
      throw error;
    }
  }

  /**
   * Detect conflicts in batch for multiple entities
   */
  async detectConflictsBatch(
    entityType: EntityType,
    dataComparisons: { external: any; internal?: any }[],
    syncContext: SyncContext,
  ): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];
    const batchSize = 50; // Process in batches to avoid memory issues

    this.logger.log(`Detecting conflicts for ${dataComparisons.length} ${entityType} entities`, {
      syncId: syncContext.syncId,
    });

    for (let i = 0; i < dataComparisons.length; i += batchSize) {
      const batch = dataComparisons.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({ external, internal }) => {
        try {
          if (!internal) {
            // No internal data means it's a new entity - no conflict
            return null;
          }
          
          return await this.detectConflicts(entityType, external, internal, syncContext);
        } catch (error) {
          this.logger.error(`Failed to detect conflict for entity: ${error.message}`, {
            externalId: this.extractExternalId(external),
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Filter out nulls and add to results
      conflicts.push(...batchResults.filter(conflict => conflict !== null) as DataConflict[]);
    }

    this.logger.log(`Batch conflict detection completed: ${conflicts.length} conflicts found`, {
      syncId: syncContext.syncId,
      entityType,
    });

    return conflicts;
  }

  /**
   * Validate conflict data and assess resolution feasibility
   */
  async validateConflict(conflict: DataConflict): Promise<ConflictValidationResult> {
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];
    const suggestedActions: string[] = [];
    const riskFactors: string[] = [];

    try {
      // 1. Validate conflict structure
      if (!conflict.id || !conflict.context || !conflict.fields) {
        validationErrors.push('Invalid conflict structure');
      }

      // 2. Validate field conflicts
      for (const field of conflict.fields) {
        if (!field.fieldName || field.externalValue === undefined || field.internalValue === undefined) {
          validationWarnings.push(`Incomplete field conflict data for: ${field.fieldName}`);
        }

        // Check for high-risk changes
        if (this.isHighRiskField(conflict.context.entityType, field.fieldName)) {
          riskFactors.push(`High-risk field modification: ${field.fieldName}`);
        }
      }

      // 3. Assess auto-resolution feasibility
      const canAutoResolve = this.assessAutoResolutionFeasibility(conflict);
      
      // 4. Generate suggestions
      if (conflict.fields.length === 1) {
        suggestedActions.push('Consider field-level resolution strategy');
      } else {
        suggestedActions.push('Multiple field conflicts - review carefully');
      }

      if (conflict.severity === 'critical' || conflict.severity === 'blocking') {
        suggestedActions.push('Immediate manual review recommended');
        riskFactors.push('Critical severity conflict');
      }

      // 5. Calculate overall confidence
      const avgConfidence = conflict.fields.reduce((sum, field) => sum + field.confidence, 0) / conflict.fields.length;

      return {
        isValid: validationErrors.length === 0,
        canAutoResolve,
        validationErrors,
        validationWarnings,
        suggestedActions,
        riskFactors,
        confidence: avgConfidence,
      };

    } catch (error) {
      this.logger.error(`Conflict validation failed: ${error.message}`, error.stack, {
        conflictId: conflict.id,
      });

      return {
        isValid: false,
        canAutoResolve: false,
        validationErrors: [error.message],
        validationWarnings: [],
        suggestedActions: ['Manual review required'],
        riskFactors: ['Validation failure'],
        confidence: 0,
      };
    }
  }

  /**
   * Query conflicts with advanced filtering
   */
  async queryConflicts(query: ConflictQuery): Promise<ConflictSearchResult> {
    const startTime = Date.now();

    try {
      // Build Prisma query
      const where: any = {
        event_type: 'conflict_detected',
      };

      if (query.integrationId) where.integration_id = query.integrationId;
      if (query.entityType) where.entity_type = query.entityType;
      if (query.entityId) where.entity_id = query.entityId;

      if (query.dateRange) {
        where.occurred_at = {
          gte: query.dateRange.startDate,
          lte: query.dateRange.endDate,
        };
      }

      // Execute query
      const [records, totalCount] = await Promise.all([
        this.prisma.integrationAuditLog.findMany({
          where,
          orderBy: query.sortBy ? { [this.mapSortField(query.sortBy)]: query.sortOrder || 'desc' } : { occurred_at: 'desc' },
          skip: query.offset || 0,
          take: Math.min(query.limit || 50, 1000),
          select: {
            id: true,
            integration_id: true,
            entity_type: true,
            entity_id: true,
            external_entity_id: true,
            severity: true,
            details: true,
            occurred_at: true,
            updated_at: true,
          },
        }),
        this.prisma.integrationAuditLog.count({ where }),
      ]);

      // Transform to conflict format
      const conflicts: DataConflict[] = records.map(record => this.transformRecordToConflict(record));

      // Filter by additional criteria (that can't be done in SQL)
      const filteredConflicts = this.applyAdvancedFilters(conflicts, query);

      // Generate aggregations
      const aggregations = this.generateAggregations(filteredConflicts);

      const executionTime = Date.now() - startTime;

      return {
        conflicts: filteredConflicts,
        totalCount,
        hasMore: totalCount > (query.offset || 0) + filteredConflicts.length,
        aggregations,
        queryStats: {
          executionTime,
          indexesUsed: ['occurred_at', 'integration_id', 'entity_type'],
          totalScanned: totalCount,
        },
      };

    } catch (error) {
      this.logger.error(`Conflict query failed: ${error.message}`, error.stack, { query });
      throw error;
    }
  }

  // ===================================================================
  // FIELD-LEVEL CONFLICT DETECTION
  // ===================================================================

  private async detectFieldConflicts(
    externalData: any,
    internalData: any,
    fieldRules: Record<string, FieldConflictRule>,
  ): Promise<ConflictField[]> {
    const conflicts: ConflictField[] = [];

    for (const [fieldName, rule] of Object.entries(fieldRules)) {
      const externalValue = this.getNestedValue(externalData, fieldName);
      const internalValue = this.getNestedValue(internalData, fieldName);

      // Skip if values are the same
      if (this.areValuesEqual(externalValue, internalValue)) {
        continue;
      }

      // Check if this constitutes a conflict based on rule
      const severity = rule.severityCalculator(externalValue, internalValue);
      const confidence = rule.confidenceCalculator(externalValue, internalValue);

      if (confidence >= 0.5) { // Threshold for considering it a real conflict
        conflicts.push({
          fieldName,
          fieldPath: fieldName,
          fieldType: this.determineFieldType(externalValue || internalValue),
          externalValue,
          internalValue,
          conflictReason: `Different values detected for field ${fieldName}`,
          confidence,
          significance: severity,
          resolutionHint: rule.resolutionHint(externalValue, internalValue),
          metadata: {
            fieldRule: rule.conflictTypes,
            detectionMethod: 'rule-based',
          },
        });
      }
    }

    return conflicts;
  }

  // ===================================================================
  // RELATIONSHIP CONFLICT DETECTION
  // ===================================================================

  private async detectRelationshipConflicts(
    externalData: any,
    internalData: any,
    relationshipRules: EntityConflictRules['relationshipRules'],
    syncContext: SyncContext,
  ): Promise<ConflictField[]> {
    const conflicts: ConflictField[] = [];

    for (const rule of relationshipRules) {
      try {
        const conflict = await rule.conflictDetector(externalData, internalData);
        if (conflict) {
          conflicts.push(conflict);
        }
      } catch (error) {
        this.logger.warn(`Relationship conflict detection failed for ${rule.fieldName}: ${error.message}`);
      }
    }

    return conflicts;
  }

  // ===================================================================
  // CONSTRAINT CONFLICT DETECTION
  // ===================================================================

  private async detectConstraintConflicts(
    externalData: any,
    internalData: any,
    constraintRules: EntityConflictRules['constraintRules'],
  ): Promise<ConflictField[]> {
    const conflicts: ConflictField[] = [];

    for (const rule of constraintRules) {
      // Validate external data against constraint
      const externalValidation = rule.validator(externalData);
      const internalValidation = rule.validator(internalData);

      if (!externalValidation.isValid && internalValidation.isValid) {
        // External data violates constraint but internal data is valid
        conflicts.push({
          fieldName: rule.name,
          fieldPath: rule.name,
          fieldType: 'scalar',
          externalValue: externalData,
          internalValue: internalData,
          conflictReason: `Constraint violation: ${externalValidation.message}`,
          confidence: 0.9,
          significance: rule.severity,
          resolutionHint: 'Consider rejecting external data or applying transformation',
          metadata: {
            constraintType: rule.conflictType,
            constraintName: rule.name,
            validationMessage: externalValidation.message,
          },
        });
      }
    }

    return conflicts;
  }

  // ===================================================================
  // TEMPORAL CONFLICT DETECTION
  // ===================================================================

  private async detectTemporalConflicts(
    externalData: any,
    internalData: any,
    syncContext: SyncContext,
  ): Promise<ConflictField[]> {
    const conflicts: ConflictField[] = [];

    // Check for outdated external data
    const externalTimestamp = this.extractTimestamp(externalData);
    const internalTimestamp = this.extractTimestamp(internalData);

    if (externalTimestamp && internalTimestamp) {
      const timeDiff = internalTimestamp.getTime() - externalTimestamp.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff > 24) { // External data is more than 24 hours old
        conflicts.push({
          fieldName: 'timestamp',
          fieldPath: 'updated_at',
          fieldType: 'scalar',
          externalValue: externalTimestamp,
          internalValue: internalTimestamp,
          conflictReason: `External data is outdated by ${Math.round(hoursDiff)} hours`,
          confidence: 0.8,
          significance: hoursDiff > 168 ? 'high' : 'medium', // 168 hours = 1 week
          resolutionHint: 'Consider whether outdated external data should override newer internal data',
          metadata: {
            hoursDifference: hoursDiff,
            isOutdated: true,
          },
        });
      }
    }

    return conflicts;
  }

  // ===================================================================
  // CONFLICT RECORD CREATION
  // ===================================================================

  private async createConflictRecord(
    context: ConflictContext,
    fields: ConflictField[],
    externalData: any,
    internalData: any,
  ): Promise<DataConflict> {
    const conflictId = this.generateConflictId();
    
    // Determine primary conflict type
    const conflictTypes = fields.map(f => this.inferConflictType(f));
    const primaryType = this.determinePrimaryConflictType(conflictTypes);
    
    // Calculate overall severity
    const severity = this.calculateOverallSeverity(fields);
    
    // Suggest resolution strategy
    const suggestedStrategy = this.suggestResolutionStrategy(fields, severity);
    
    // Generate possible strategies
    const possibleStrategies = this.generatePossibleStrategies(fields, primaryType);

    const conflict: DataConflict = {
      id: conflictId,
      context,
      conflictType: primaryType,
      severity,
      status: 'detected',
      title: this.generateConflictTitle(context.entityType, primaryType, fields.length),
      description: this.generateConflictDescription(fields, primaryType),
      fields,
      externalData: this.sanitizeDataForStorage(externalData),
      internalData: this.sanitizeDataForStorage(internalData),
      suggestedStrategy,
      possibleStrategies,
      businessImpact: this.assessBusinessImpact(context, fields, severity),
      dependencies: [], // Would be populated based on relationship analysis
      metadata: {
        detectionMethod: 'advanced_analysis',
        confidenceScore: this.calculateAverageConfidence(fields),
        changeScore: 0, // Would be populated from change detection if available
        tags: this.generateConflictTags(context, fields),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store conflict record
    await this.storeConflictRecord(conflict);

    return conflict;
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private initializeConflictRules(): void {
    // Initialize rules for each entity type
    this.entityRules.set('user', this.createUserConflictRules());
    this.entityRules.set('class', this.createClassConflictRules());
    this.entityRules.set('organization', this.createOrganizationConflictRules());
    this.entityRules.set('enrollment', this.createEnrollmentConflictRules());
  }

  private createUserConflictRules(): EntityConflictRules {
    return {
      entityType: 'user',
      fieldRules: {
        email: {
          fieldName: 'email',
          conflictTypes: ['field_value'],
          severityCalculator: (ext, int) => ext !== int ? 'high' : 'low',
          resolutionHint: (ext, int) => 'Email changes are significant - verify before applying',
          confidenceCalculator: (ext, int) => ext !== int ? 0.95 : 0.1,
        },
        first_name: {
          fieldName: 'first_name',
          conflictTypes: ['field_value'],
          severityCalculator: () => 'medium',
          resolutionHint: () => 'Name changes may be legitimate user updates',
          confidenceCalculator: (ext, int) => ext !== int ? 0.8 : 0.1,
        },
        role: {
          fieldName: 'role',
          conflictTypes: ['field_value', 'constraint'],
          severityCalculator: () => 'high',
          resolutionHint: () => 'Role changes affect permissions - require manual review',
          confidenceCalculator: (ext, int) => ext !== int ? 0.9 : 0.1,
        },
        is_active: {
          fieldName: 'is_active',
          conflictTypes: ['field_value'],
          severityCalculator: () => 'high',
          resolutionHint: () => 'Active status changes affect user access',
          confidenceCalculator: (ext, int) => ext !== int ? 0.95 : 0.1,
        },
      },
      relationshipRules: [],
      constraintRules: [
        {
          name: 'valid_email_format',
          validator: (data) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValid = emailRegex.test(data.email || '');
            return {
              isValid,
              message: isValid ? '' : 'Invalid email format',
            };
          },
          conflictType: 'validation',
          severity: 'medium',
        },
        {
          name: 'valid_role',
          validator: (data) => {
            const validRoles = ['STUDENT', 'TEACHER', 'ADMIN'];
            const isValid = validRoles.includes(data.role);
            return {
              isValid,
              message: isValid ? '' : 'Invalid user role',
            };
          },
          conflictType: 'constraint',
          severity: 'high',
        },
      ],
    };
  }

  private createClassConflictRules(): EntityConflictRules {
    return {
      entityType: 'class',
      fieldRules: {
        name: {
          fieldName: 'name',
          conflictTypes: ['field_value'],
          severityCalculator: () => 'medium',
          resolutionHint: () => 'Class name changes may affect student identification',
          confidenceCalculator: (ext, int) => ext !== int ? 0.8 : 0.1,
        },
        teacher_id: {
          fieldName: 'teacher_id',
          conflictTypes: ['relationship'],
          severityCalculator: () => 'high',
          resolutionHint: () => 'Teacher assignment changes require verification',
          confidenceCalculator: (ext, int) => ext !== int ? 0.9 : 0.1,
        },
        max_students: {
          fieldName: 'max_students',
          conflictTypes: ['field_value', 'constraint'],
          severityCalculator: () => 'medium',
          resolutionHint: () => 'Capacity changes may affect enrollment',
          confidenceCalculator: (ext, int) => ext !== int ? 0.7 : 0.1,
        },
      },
      relationshipRules: [],
      constraintRules: [],
    };
  }

  private createOrganizationConflictRules(): EntityConflictRules {
    return {
      entityType: 'organization',
      fieldRules: {
        name: {
          fieldName: 'name',
          conflictTypes: ['field_value'],
          severityCalculator: () => 'high',
          resolutionHint: () => 'Organization name changes are significant',
          confidenceCalculator: (ext, int) => ext !== int ? 0.9 : 0.1,
        },
        type: {
          fieldName: 'type',
          conflictTypes: ['field_value', 'constraint'],
          severityCalculator: () => 'high',
          resolutionHint: () => 'Organization type changes affect hierarchy',
          confidenceCalculator: (ext, int) => ext !== int ? 0.95 : 0.1,
        },
      },
      relationshipRules: [],
      constraintRules: [],
    };
  }

  private createEnrollmentConflictRules(): EntityConflictRules {
    return {
      entityType: 'enrollment',
      fieldRules: {
        status: {
          fieldName: 'status',
          conflictTypes: ['field_value'],
          severityCalculator: () => 'high',
          resolutionHint: () => 'Enrollment status changes affect student access',
          confidenceCalculator: (ext, int) => ext !== int ? 0.9 : 0.1,
        },
        enrolled_at: {
          fieldName: 'enrolled_at',
          conflictTypes: ['temporal'],
          severityCalculator: () => 'medium',
          resolutionHint: () => 'Enrollment date conflicts may indicate data quality issues',
          confidenceCalculator: (ext, int) => ext !== int ? 0.7 : 0.1,
        },
      },
      relationshipRules: [],
      constraintRules: [],
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private areValuesEqual(value1: any, value2: any): boolean {
    if (value1 === value2) return true;
    if (value1 == null && value2 == null) return true;
    if (value1 == null || value2 == null) return false;

    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.trim().toLowerCase() === value2.trim().toLowerCase();
    }

    if (value1 instanceof Date && value2 instanceof Date) {
      return value1.getTime() === value2.getTime();
    }

    if (typeof value1 === 'object' && typeof value2 === 'object') {
      return JSON.stringify(value1) === JSON.stringify(value2);
    }

    return false;
  }

  private determineFieldType(value: any): 'scalar' | 'object' | 'array' {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'scalar';
  }

  private extractEntityId(data: any): string | undefined {
    return data?.id || data?.internal_id;
  }

  private extractExternalId(data: any): string | undefined {
    return data?.external_id || data?.externalId || data?.id;
  }

  private extractTimestamp(data: any): Date | null {
    const timestamp = data?.updated_at || data?.updatedAt || data?.modified_at || data?.modifiedAt;
    return timestamp ? new Date(timestamp) : null;
  }

  private inferConflictType(field: ConflictField): ConflictType {
    if (field.fieldName.includes('_id') || field.fieldName.includes('Id')) {
      return 'relationship';
    }
    if (field.fieldName.includes('timestamp') || field.fieldName.includes('_at')) {
      return 'temporal';
    }
    return 'field_value';
  }

  private determinePrimaryConflictType(types: ConflictType[]): ConflictType {
    const priority = ['blocking', 'constraint', 'relationship', 'temporal', 'field_value'];
    for (const type of priority) {
      if (types.includes(type as ConflictType)) {
        return type as ConflictType;
      }
    }
    return 'field_value';
  }

  private calculateOverallSeverity(fields: ConflictField[]): ConflictSeverity {
    const severityOrder: ConflictSeverity[] = ['low', 'medium', 'high', 'critical', 'blocking'];
    let maxSeverity: ConflictSeverity = 'low';

    for (const field of fields) {
      const currentIndex = severityOrder.indexOf(field.significance);
      const maxIndex = severityOrder.indexOf(maxSeverity);
      
      if (currentIndex > maxIndex) {
        maxSeverity = field.significance;
      }
    }

    return maxSeverity;
  }

  private suggestResolutionStrategy(fields: ConflictField[], severity: ConflictSeverity): ResolutionStrategy {
    if (severity === 'blocking' || severity === 'critical') {
      return 'manual';
    }

    if (fields.length === 1 && fields[0].confidence > 0.8) {
      return 'external_wins'; // High confidence single field conflict
    }

    if (fields.every(f => f.significance === 'low')) {
      return 'merge';
    }

    return 'manual';
  }

  private generatePossibleStrategies(fields: ConflictField[], conflictType: ConflictType): ResolutionStrategy[] {
    const strategies: ResolutionStrategy[] = ['external_wins', 'internal_wins', 'manual'];

    if (fields.every(f => f.fieldType === 'scalar')) {
      strategies.push('merge');
    }

    if (conflictType === 'temporal' || conflictType === 'field_value') {
      strategies.push('defer');
    }

    return strategies;
  }

  private generateConflictTitle(entityType: EntityType, conflictType: ConflictType, fieldCount: number): string {
    return `${conflictType.replace('_', ' ')} conflict in ${entityType} (${fieldCount} fields)`;
  }

  private generateConflictDescription(fields: ConflictField[], conflictType: ConflictType): string {
    const fieldNames = fields.map(f => f.fieldName).join(', ');
    return `${conflictType} detected in fields: ${fieldNames}`;
  }

  private assessBusinessImpact(
    context: ConflictContext,
    fields: ConflictField[],
    severity: ConflictSeverity,
  ): DataConflict['businessImpact'] {
    const highRiskFields = ['email', 'role', 'status', 'is_active'];
    const hasHighRiskFields = fields.some(f => highRiskFields.includes(f.fieldName));

    return {
      severity: hasHighRiskFields ? 'high' : severity === 'critical' ? 'high' : 'medium',
      description: `${context.entityType} data conflict affecting ${fields.length} fields`,
      affectedUsers: context.entityType === 'user' ? 1 : undefined,
      affectedProcesses: this.getAffectedProcesses(context.entityType, fields),
    };
  }

  private getAffectedProcesses(entityType: EntityType, fields: ConflictField[]): string[] {
    const processes: string[] = [];
    
    if (entityType === 'user' && fields.some(f => f.fieldName === 'role')) {
      processes.push('authorization', 'access_control');
    }
    
    if (entityType === 'enrollment' && fields.some(f => f.fieldName === 'status')) {
      processes.push('student_access', 'gradebook');
    }

    return processes;
  }

  private calculateAverageConfidence(fields: ConflictField[]): number {
    return fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length;
  }

  private generateConflictTags(context: ConflictContext, fields: ConflictField[]): string[] {
    const tags: string[] = [context.entityType];
    
    if (fields.some(f => f.significance === 'critical')) {
      tags.push('critical');
    }
    
    if (fields.some(f => f.fieldName.includes('_id'))) {
      tags.push('relationship');
    }

    return tags;
  }

  private sanitizeDataForStorage(data: any): any {
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeConflictRecord(conflict: DataConflict): Promise<void> {
    try {
      await this.prisma.integrationAuditLog.create({
        data: {
          integration_id: conflict.context.integrationId,
          event_type: 'conflict_detected',
          event_category: 'data_synchronization',
          severity: conflict.severity,
          description: conflict.title,
          details: {
            conflictId: conflict.id,
            conflictType: conflict.conflictType,
            fields: conflict.fields,
            externalData: conflict.externalData,
            internalData: conflict.internalData,
            suggestedStrategy: conflict.suggestedStrategy,
            businessImpact: conflict.businessImpact,
            metadata: conflict.metadata,
          },
          entity_type: conflict.context.entityType,
          entity_id: conflict.context.entityId,
          external_entity_id: conflict.context.externalId,
          correlation_id: conflict.context.syncId,
          occurred_at: conflict.createdAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to store conflict record: ${error.message}`, error.stack);
    }
  }

  private isHighRiskField(entityType: EntityType, fieldName: string): boolean {
    const highRiskFields = {
      user: ['email', 'role', 'is_active'],
      class: ['teacher_id', 'is_active'],
      organization: ['type', 'parent_id'],
      enrollment: ['status', 'user_id', 'class_id'],
    };

    return highRiskFields[entityType]?.includes(fieldName) || false;
  }

  private assessAutoResolutionFeasibility(conflict: DataConflict): boolean {
    // Auto-resolution not feasible if:
    // - Critical or blocking severity
    // - Multiple high-risk fields
    // - Low confidence scores
    // - Constraint violations

    if (conflict.severity === 'critical' || conflict.severity === 'blocking') {
      return false;
    }

    const highRiskFieldCount = conflict.fields.filter(f => 
      this.isHighRiskField(conflict.context.entityType, f.fieldName)
    ).length;

    if (highRiskFieldCount > 1) {
      return false;
    }

    const avgConfidence = this.calculateAverageConfidence(conflict.fields);
    if (avgConfidence < 0.7) {
      return false;
    }

    return true;
  }

  private transformRecordToConflict(record: any): DataConflict {
    const details = record.details || {};
    
    return {
      id: details.conflictId || record.id,
      context: {
        integrationId: record.integration_id,
        entityType: record.entity_type as EntityType,
        entityId: record.entity_id,
        externalId: record.external_entity_id,
        syncId: record.correlation_id,
        providerId: 'unknown',
        detectedAt: record.occurred_at,
        detectedBy: 'system',
      },
      conflictType: details.conflictType || 'field_value',
      severity: record.severity as ConflictSeverity,
      status: 'detected',
      title: record.description || 'Data conflict',
      description: record.description || 'Conflict detected',
      fields: details.fields || [],
      externalData: details.externalData || {},
      internalData: details.internalData || {},
      suggestedStrategy: details.suggestedStrategy || 'manual',
      possibleStrategies: ['manual'],
      businessImpact: details.businessImpact || {
        severity: 'medium',
        description: 'Unknown impact',
      },
      dependencies: [],
      metadata: details.metadata || {},
      createdAt: record.occurred_at,
      updatedAt: record.updated_at || record.occurred_at,
    };
  }

  private applyAdvancedFilters(conflicts: DataConflict[], query: ConflictQuery): DataConflict[] {
    let filtered = conflicts;

    if (query.conflictTypes?.length) {
      filtered = filtered.filter(c => query.conflictTypes!.includes(c.conflictType));
    }

    if (query.severities?.length) {
      filtered = filtered.filter(c => query.severities!.includes(c.severity));
    }

    if (query.statuses?.length) {
      filtered = filtered.filter(c => query.statuses!.includes(c.status));
    }

    if (query.strategies?.length) {
      filtered = filtered.filter(c => query.strategies!.includes(c.suggestedStrategy));
    }

    return filtered;
  }

  private generateAggregations(conflicts: DataConflict[]): ConflictSearchResult['aggregations'] {
    const byType: Record<ConflictType, number> = {
      field_value: 0,
      schema: 0,
      relationship: 0,
      constraint: 0,
      temporal: 0,
      ownership: 0,
      validation: 0,
      dependency: 0,
    };

    const bySeverity: Record<ConflictSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      blocking: 0,
    };

    const byStatus: Record<ConflictStatus, number> = {
      detected: 0,
      pending: 0,
      in_progress: 0,
      resolved: 0,
      escalated: 0,
      deferred: 0,
      ignored: 0,
      failed: 0,
    };

    conflicts.forEach(conflict => {
      byType[conflict.conflictType]++;
      bySeverity[conflict.severity]++;
      byStatus[conflict.status]++;
    });

    return { byType, bySeverity, byStatus };
  }

  private mapSortField(field: string): string {
    const mapping = {
      createdAt: 'occurred_at',
      updatedAt: 'updated_at',
      severity: 'severity',
      priority: 'severity',
    };

    return mapping[field as keyof typeof mapping] || 'occurred_at';
  }
}
