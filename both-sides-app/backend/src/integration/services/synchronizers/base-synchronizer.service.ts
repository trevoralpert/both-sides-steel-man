/**
 * Base Synchronizer Service
 * 
 * Provides common synchronization functionality for all entity types.
 * Entity-specific synchronizers extend this base class.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExternalIdMappingService } from '../external-id-mapping.service';
import { IntegrationRegistry } from '../integration-registry.service';
import { SyncStatus } from '@prisma/client';

// ===================================================================
// INTERFACES AND TYPES
// ===================================================================

export interface SyncContext {
  syncId: string;
  integrationId: string;
  providerId: string;
  externalSystemId: string;
  startTime: Date;
  userId?: string;
  correlationId?: string;
}

export interface SyncResult {
  entityId: string;
  entityType: string;
  action: 'created' | 'updated' | 'deleted' | 'skipped' | 'error';
  externalId?: string;
  internalId?: string;
  error?: string;
  metadata?: Record<string, any>;
  processingTime: number;
  timestamp: Date;
}

export interface EntitySyncOptions {
  batchSize?: number;
  concurrency?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  skipConflictResolution?: boolean;
  dryRun?: boolean;
  validateOnly?: boolean;
}

export interface ConflictData {
  field: string;
  externalValue: any;
  internalValue: any;
  lastModified: {
    external: Date;
    internal: Date;
  };
  confidence: number;
}

export interface SyncConflict {
  entityType: string;
  entityId: string;
  externalId: string;
  internalId: string;
  conflicts: ConflictData[];
  resolutionStrategy?: 'external_wins' | 'internal_wins' | 'merge' | 'manual';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ===================================================================
// BASE SYNCHRONIZER SERVICE
// ===================================================================

@Injectable()
export abstract class BaseSynchronizerService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly mappingService: ExternalIdMappingService,
    protected readonly integrationRegistry: IntegrationRegistry,
  ) {}

  // Abstract methods that must be implemented by entity-specific synchronizers
  abstract getEntityType(): string;
  abstract validateExternalData(data: any): ValidationResult;
  abstract transformExternalToInternal(externalData: any, context: SyncContext): any;
  abstract transformInternalToExternal(internalData: any, context: SyncContext): any;
  abstract createEntity(data: any, context: SyncContext): Promise<any>;
  abstract updateEntity(id: string, data: any, context: SyncContext): Promise<any>;
  abstract findEntityByExternalId(externalId: string, context: SyncContext): Promise<any>;
  abstract findEntityByInternalId(internalId: string, context: SyncContext): Promise<any>;

  // ===================================================================
  // CORE SYNCHRONIZATION METHODS
  // ===================================================================

  /**
   * Synchronize a single entity from external system
   */
  async synchronizeEntity(
    externalData: any,
    context: SyncContext,
    options: EntitySyncOptions = {},
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const entityType = this.getEntityType();
    
    try {
      // 1. Validate external data
      const validation = await this.validateExternalData(externalData);
      if (!validation.isValid) {
        return this.createErrorResult(
          externalData.id || 'unknown',
          entityType,
          `Validation failed: ${validation.errors.join(', ')}`,
          startTime,
        );
      }

      // 2. Check for existing mapping
      const externalId = this.extractExternalId(externalData);
      const existingInternalId = await this.mappingService.mapExternalToInternal(
        context.integrationId,
        entityType,
        externalId,
      );

      let result: SyncResult;
      
      if (existingInternalId) {
        // Update existing entity
        result = await this.updateExistingEntity(
          externalData,
          existingInternalId,
          context,
          options,
          startTime,
        );
      } else {
        // Create new entity
        result = await this.createNewEntity(
          externalData,
          context,
          options,
          startTime,
        );
      }

      // 3. Log successful sync
      await this.logSyncActivity(context, result, 'success');
      
      return result;

    } catch (error) {
      this.logger.error(
        `Failed to synchronize ${entityType} entity: ${error.message}`,
        error.stack,
        { 
          context: context.syncId,
          externalData: this.sanitizeForLogging(externalData),
        },
      );

      const errorResult = this.createErrorResult(
        externalData?.id || 'unknown',
        entityType,
        error.message,
        startTime,
      );

      await this.logSyncActivity(context, errorResult, 'error', error);
      return errorResult;
    }
  }

  /**
   * Synchronize multiple entities in batch
   */
  async synchronizeBatch(
    externalDataList: any[],
    context: SyncContext,
    options: EntitySyncOptions = {},
  ): Promise<SyncResult[]> {
    const batchSize = options.batchSize || 10;
    const results: SyncResult[] = [];
    
    this.logger.log(
      `Starting batch sync of ${externalDataList.length} ${this.getEntityType()} entities`,
      { syncId: context.syncId },
    );

    // Process in batches
    for (let i = 0; i < externalDataList.length; i += batchSize) {
      const batch = externalDataList.slice(i, i + batchSize);
      
      const batchPromises = batch.map(data =>
        this.synchronizeEntity(data, context, options),
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const promiseResult of batchResults) {
        if (promiseResult.status === 'fulfilled') {
          results.push(promiseResult.value);
        } else {
          results.push(this.createErrorResult(
            'batch-error',
            this.getEntityType(),
            promiseResult.reason?.message || 'Batch processing error',
            Date.now(),
          ));
        }
      }

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < externalDataList.length) {
        await this.delay(100);
      }
    }

    this.logger.log(
      `Completed batch sync: ${results.filter(r => r.action !== 'error').length}/${results.length} successful`,
      { syncId: context.syncId },
    );

    return results;
  }

  // ===================================================================
  // CONFLICT DETECTION AND RESOLUTION
  // ===================================================================

  /**
   * Detect conflicts between external and internal data
   */
  async detectConflicts(
    externalData: any,
    internalData: any,
    context: SyncContext,
  ): Promise<SyncConflict | null> {
    const conflicts: ConflictData[] = [];
    const entityType = this.getEntityType();
    
    // Compare key fields for conflicts
    const externalTransformed = await this.transformExternalToInternal(externalData, context);
    const conflictableFields = this.getConflictableFields();
    
    for (const field of conflictableFields) {
      if (this.hasFieldConflict(externalTransformed[field], internalData[field])) {
        conflicts.push({
          field,
          externalValue: externalTransformed[field],
          internalValue: internalData[field],
          lastModified: {
            external: new Date(externalData.updated_at || externalData.updatedAt || Date.now()),
            internal: new Date(internalData.updated_at || internalData.updatedAt || Date.now()),
          },
          confidence: this.calculateConflictConfidence(field, externalTransformed[field], internalData[field]),
        });
      }
    }

    if (conflicts.length === 0) {
      return null;
    }

    const externalId = this.extractExternalId(externalData);
    const internalId = this.extractInternalId(internalData);

    return {
      entityType,
      entityId: `${entityType}-${externalId}-${internalId}`,
      externalId,
      internalId,
      conflicts,
      resolutionStrategy: this.determineResolutionStrategy(conflicts),
    };
  }

  /**
   * Resolve conflicts using specified strategy
   */
  async resolveConflicts(
    conflict: SyncConflict,
    strategy?: 'external_wins' | 'internal_wins' | 'merge' | 'manual',
  ): Promise<any> {
    const resolveStrategy = strategy || conflict.resolutionStrategy || 'external_wins';
    
    this.logger.log(`Resolving conflict using strategy: ${resolveStrategy}`, {
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      conflictCount: conflict.conflicts.length,
    });

    switch (resolveStrategy) {
      case 'external_wins':
        return this.resolveExternalWins(conflict);
      case 'internal_wins':
        return this.resolveInternalWins(conflict);
      case 'merge':
        return this.resolveMerge(conflict);
      case 'manual':
        return this.resolveManual(conflict);
      default:
        throw new Error(`Unknown conflict resolution strategy: ${resolveStrategy}`);
    }
  }

  // ===================================================================
  // UTILITY AND HELPER METHODS
  // ===================================================================

  /**
   * Create new entity with proper mapping
   */
  private async createNewEntity(
    externalData: any,
    context: SyncContext,
    options: EntitySyncOptions,
    startTime: number,
  ): Promise<SyncResult> {
    if (options.dryRun) {
      return this.createResult(
        this.extractExternalId(externalData),
        this.getEntityType(),
        'skipped',
        undefined,
        undefined,
        startTime,
        { reason: 'dry run' },
      );
    }

    const transformedData = await this.transformExternalToInternal(externalData, context);
    const createdEntity = await this.createEntity(transformedData, context);
    const internalId = this.extractInternalId(createdEntity);
    const externalId = this.extractExternalId(externalData);

    // Create ID mapping
    await this.mappingService.createMapping(
      context.integrationId,
      this.getEntityType(),
      externalId,
      internalId,
      {
        externalData: this.sanitizeForLogging(externalData),
        internalData: this.sanitizeForLogging(createdEntity),
        syncContext: context.syncId,
      },
    );

    return this.createResult(
      externalId,
      this.getEntityType(),
      'created',
      externalId,
      internalId,
      startTime,
    );
  }

  /**
   * Update existing entity with conflict detection
   */
  private async updateExistingEntity(
    externalData: any,
    internalId: string,
    context: SyncContext,
    options: EntitySyncOptions,
    startTime: number,
  ): Promise<SyncResult> {
    const entityType = this.getEntityType();
    const externalId = this.extractExternalId(externalData);

    // Get current internal entity
    const currentEntity = await this.findEntityByInternalId(internalId, context);
    if (!currentEntity) {
      // Mapping exists but entity doesn't - clean up mapping and create new
      await this.mappingService.deleteMapping(
        context.integrationId,
        entityType,
        externalId,
      );
      
      return this.createNewEntity(externalData, context, options, startTime);
    }

    // Detect conflicts
    if (!options.skipConflictResolution) {
      const conflict = await this.detectConflicts(externalData, currentEntity, context);
      
      if (conflict) {
        this.logger.warn(`Conflict detected for ${entityType} ${externalId}`, {
          conflictCount: conflict.conflicts.length,
          conflicts: conflict.conflicts.map(c => c.field),
        });
        
        // Resolve conflict
        const resolvedData = await this.resolveConflicts(conflict);
        if (!resolvedData) {
          return this.createResult(
            externalId,
            entityType,
            'skipped',
            externalId,
            internalId,
            startTime,
            { reason: 'unresolved conflict' },
          );
        }
        
        externalData = resolvedData;
      }
    }

    if (options.dryRun) {
      return this.createResult(
        externalId,
        entityType,
        'skipped',
        externalId,
        internalId,
        startTime,
        { reason: 'dry run' },
      );
    }

    const transformedData = await this.transformExternalToInternal(externalData, context);
    const updatedEntity = await this.updateEntity(internalId, transformedData, context);

    // Update mapping metadata
    await this.mappingService.updateMapping(
      context.integrationId,
      entityType,
      externalId,
      {
        externalData: this.sanitizeForLogging(externalData),
        internalData: this.sanitizeForLogging(updatedEntity),
        syncContext: context.syncId,
      },
    );

    return this.createResult(
      externalId,
      entityType,
      'updated',
      externalId,
      internalId,
      startTime,
    );
  }

  /**
   * Create sync result object
   */
  protected createResult(
    entityId: string,
    entityType: string,
    action: SyncResult['action'],
    externalId?: string,
    internalId?: string,
    startTime?: number,
    metadata?: Record<string, any>,
  ): SyncResult {
    return {
      entityId,
      entityType,
      action,
      externalId,
      internalId,
      metadata,
      processingTime: startTime ? Date.now() - startTime : 0,
      timestamp: new Date(),
    };
  }

  /**
   * Create error result object
   */
  protected createErrorResult(
    entityId: string,
    entityType: string,
    error: string,
    startTime: number,
  ): SyncResult {
    return this.createResult(entityId, entityType, 'error', undefined, undefined, startTime, { error });
  }

  /**
   * Log synchronization activity
   */
  private async logSyncActivity(
    context: SyncContext,
    result: SyncResult,
    status: 'success' | 'error' | 'warning',
    error?: Error,
  ): Promise<void> {
    try {
      await this.prisma.integrationAuditLog.create({
        data: {
          integration_id: context.integrationId,
          event_type: 'entity_sync',
          event_category: 'synchronization',
          severity: status === 'error' ? 'error' : status === 'warning' ? 'warn' : 'info',
          description: `${result.action} ${result.entityType} entity`,
          details: {
            syncId: context.syncId,
            entityId: result.entityId,
            action: result.action,
            processingTime: result.processingTime,
            metadata: result.metadata,
          },
          entity_type: result.entityType,
          entity_id: result.internalId,
          external_entity_id: result.externalId,
          user_id: context.userId,
          correlation_id: context.correlationId,
          duration_ms: result.processingTime,
          error_message: error?.message,
          stack_trace: error?.stack,
          occurred_at: new Date(),
        },
      });
    } catch (auditError) {
      this.logger.error('Failed to log sync activity', auditError);
    }
  }

  // ===================================================================
  // ABSTRACT HELPER METHODS
  // ===================================================================

  protected abstract getConflictableFields(): string[];
  protected abstract extractExternalId(data: any): string;
  protected abstract extractInternalId(data: any): string;

  protected hasFieldConflict(externalValue: any, internalValue: any): boolean {
    if (externalValue === internalValue) return false;
    if (externalValue == null && internalValue == null) return false;
    if (externalValue == null || internalValue == null) return true;
    
    // Handle string comparison with normalization
    if (typeof externalValue === 'string' && typeof internalValue === 'string') {
      return externalValue.trim().toLowerCase() !== internalValue.trim().toLowerCase();
    }
    
    // Handle date comparison
    if (externalValue instanceof Date && internalValue instanceof Date) {
      return Math.abs(externalValue.getTime() - internalValue.getTime()) > 1000; // 1 second tolerance
    }
    
    return JSON.stringify(externalValue) !== JSON.stringify(internalValue);
  }

  protected calculateConflictConfidence(field: string, externalValue: any, internalValue: any): number {
    // Default confidence calculation - can be overridden by specific synchronizers
    if (externalValue == null && internalValue != null) return 0.3;
    if (externalValue != null && internalValue == null) return 0.7;
    
    return 0.5; // Equal confidence by default
  }

  protected determineResolutionStrategy(conflicts: ConflictData[]): 'external_wins' | 'internal_wins' | 'merge' | 'manual' {
    // Default strategy - can be overridden by specific synchronizers
    const highConfidenceExternalConflicts = conflicts.filter(c => c.confidence > 0.7).length;
    const highConfidenceInternalConflicts = conflicts.filter(c => c.confidence < 0.3).length;
    
    if (highConfidenceExternalConflicts > highConfidenceInternalConflicts) {
      return 'external_wins';
    } else if (highConfidenceInternalConflicts > highConfidenceExternalConflicts) {
      return 'internal_wins';
    }
    
    return 'manual';
  }

  protected async resolveExternalWins(conflict: SyncConflict): Promise<any> {
    // Implementation depends on specific synchronizer
    return null;
  }

  protected async resolveInternalWins(conflict: SyncConflict): Promise<any> {
    // Implementation depends on specific synchronizer
    return null;
  }

  protected async resolveMerge(conflict: SyncConflict): Promise<any> {
    // Implementation depends on specific synchronizer
    return null;
  }

  protected async resolveManual(conflict: SyncConflict): Promise<any> {
    // Manual resolution requires external intervention
    throw new Error('Manual conflict resolution required');
  }

  protected sanitizeForLogging(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
