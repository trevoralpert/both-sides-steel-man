/**
 * Change History Service
 * 
 * Manages persistent storage and retrieval of change records with efficient
 * querying, indexing, and data lifecycle management capabilities.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ChangeRecord,
  ChangeHistoryQuery,
  ChangeSummary,
  ChangeType,
  ChangeSeverity,
  FieldChange,
  ChangeMetadata,
} from './change-detection.interfaces';
import { EntityType } from '../synchronizers/base-synchronizer.service';
import * as crypto from 'crypto';

// ===================================================================
// CHANGE HISTORY INTERFACES
// ===================================================================

export interface ChangeHistoryConfig {
  retentionPeriod: number; // days
  compressionThreshold: number; // days after which to compress old changes
  enableCompression: boolean;
  maxRecordsPerQuery: number;
  enableIndexOptimization: boolean;
  cleanupInterval: number; // hours
}

export interface ChangeHistoryStats {
  totalRecords: number;
  recordsByIntegration: Record<string, number>;
  recordsByEntityType: Record<string, number>;
  recordsByChangeType: Record<ChangeType, number>;
  recordsBySeverity: Record<ChangeSeverity, number>;
  oldestRecord?: Date;
  newestRecord?: Date;
  storageSize: number; // approximate size in bytes
  indexesCount: number;
}

export interface ChangeHistoryCleanupResult {
  cleanupType: 'retention' | 'compression' | 'optimization';
  recordsProcessed: number;
  recordsDeleted: number;
  recordsCompressed: number;
  storageReclaimed: number; // bytes
  duration: number;
  errors: string[];
}

export interface CompressedChangeRecord {
  id: string;
  integrationId: string;
  entityType: string;
  entityId: string;
  changesSummary: {
    totalChanges: number;
    changeTypes: ChangeType[];
    severityDistribution: Record<ChangeSeverity, number>;
    fieldChangeCounts: Record<string, number>;
  };
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  originalRecordIds: string[];
  compressionRatio: number;
  compressedAt: Date;
}

// ===================================================================
// CHANGE HISTORY SERVICE
// ===================================================================

@Injectable()
export class ChangeHistoryService {
  private readonly logger = new Logger(ChangeHistoryService.name);
  private readonly config: ChangeHistoryConfig;

  constructor(
    private readonly prisma: PrismaService,
  ) {
    this.config = this.getDefaultConfig();
    this.logger.log('ChangeHistoryService initialized with retention period of ' + this.config.retentionPeriod + ' days');
  }

  // ===================================================================
  // CORE CHANGE HISTORY METHODS
  // ===================================================================

  /**
   * Store a change record in the database
   */
  async storeChangeRecord(record: ChangeRecord): Promise<void> {
    try {
      await this.prisma.integrationAuditLog.create({
        data: {
          id: record.id,
          integration_id: record.integrationId,
          event_type: 'change_detected',
          event_category: 'data_synchronization',
          severity: record.significance,
          description: this.generateChangeDescription(record),
          details: {
            changeType: record.changeType,
            fieldChanges: record.fieldChanges,
            changeScore: record.changeScore,
            previousHash: record.previousHash,
            currentHash: record.currentHash,
            metadata: record.metadata,
            syncContext: record.syncContext,
          },
          entity_type: record.entityType,
          entity_id: record.entityId,
          external_entity_id: record.externalId,
          user_id: record.syncContext?.syncId ? `sync_${record.syncContext.syncId}` : null,
          correlation_id: record.syncContext?.syncId,
          duration_ms: 0,
          occurred_at: record.createdAt,
        },
      });

      this.logger.debug(`Stored change record: ${record.id}`, {
        entityType: record.entityType,
        entityId: record.entityId,
        changeType: record.changeType,
        significance: record.significance,
      });

    } catch (error) {
      this.logger.error(`Failed to store change record: ${error.message}`, error.stack, {
        recordId: record.id,
        entityType: record.entityType,
        entityId: record.entityId,
      });
      throw error;
    }
  }

  /**
   * Store multiple change records in batch
   */
  async storeChangeRecordsBatch(records: ChangeRecord[]): Promise<{
    success: boolean;
    storedCount: number;
    errors: string[];
  }> {
    if (records.length === 0) {
      return { success: true, storedCount: 0, errors: [] };
    }

    this.logger.log(`Storing ${records.length} change records in batch`);

    const errors: string[] = [];
    let storedCount = 0;

    // Process in chunks to avoid transaction limits
    const chunkSize = 100;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      
      try {
        const data = chunk.map(record => ({
          id: record.id,
          integration_id: record.integrationId,
          event_type: 'change_detected',
          event_category: 'data_synchronization',
          severity: record.significance,
          description: this.generateChangeDescription(record),
          details: {
            changeType: record.changeType,
            fieldChanges: record.fieldChanges,
            changeScore: record.changeScore,
            previousHash: record.previousHash,
            currentHash: record.currentHash,
            metadata: record.metadata,
            syncContext: record.syncContext,
          },
          entity_type: record.entityType,
          entity_id: record.entityId,
          external_entity_id: record.externalId,
          user_id: record.syncContext?.syncId ? `sync_${record.syncContext.syncId}` : null,
          correlation_id: record.syncContext?.syncId,
          duration_ms: 0,
          occurred_at: record.createdAt,
        }));

        await this.prisma.integrationAuditLog.createMany({
          data,
          skipDuplicates: true,
        });

        storedCount += chunk.length;

      } catch (error) {
        const errorMsg = `Failed to store chunk ${i / chunkSize + 1}: ${error.message}`;
        errors.push(errorMsg);
        this.logger.error(errorMsg, error.stack);
      }
    }

    const success = errors.length === 0;
    
    this.logger.log(`Batch storage completed: ${storedCount}/${records.length} records stored`, {
      success,
      errors: errors.length,
    });

    return {
      success,
      storedCount,
      errors,
    };
  }

  /**
   * Query change history with advanced filtering
   */
  async queryChangeHistory(query: ChangeHistoryQuery): Promise<{
    changes: ChangeRecord[];
    totalCount: number;
    hasMore: boolean;
    queryStats: {
      executionTime: number;
      recordsScanned: number;
      indexesUsed: string[];
    };
  }> {
    const startTime = Date.now();
    
    this.logger.debug('Executing change history query', {
      integrationId: query.integrationId,
      entityType: query.entityType,
      dateRange: query.dateRange,
      limit: query.limit,
    });

    try {
      // Build Prisma where clause
      const where: any = {
        event_type: 'change_detected',
      };

      if (query.integrationId) {
        where.integration_id = query.integrationId;
      }

      if (query.entityType) {
        where.entity_type = query.entityType;
      }

      if (query.entityId) {
        where.entity_id = query.entityId;
      }

      if (query.changeTypes?.length) {
        where.details = {
          path: ['changeType'],
          in: query.changeTypes,
        };
      }

      if (query.significance?.length) {
        where.severity = { in: query.significance };
      }

      if (query.dateRange) {
        where.occurred_at = {
          gte: query.dateRange.startDate,
          lte: query.dateRange.endDate,
        };
      }

      // Execute query with count
      const limit = Math.min(query.limit || 50, this.config.maxRecordsPerQuery);
      const offset = query.offset || 0;

      const [records, totalCount] = await Promise.all([
        this.prisma.integrationAuditLog.findMany({
          where,
          orderBy: { occurred_at: 'desc' },
          skip: offset,
          take: limit,
          select: {
            id: true,
            integration_id: true,
            entity_type: true,
            entity_id: true,
            external_entity_id: true,
            severity: true,
            details: true,
            correlation_id: true,
            occurred_at: true,
          },
        }),
        this.prisma.integrationAuditLog.count({ where }),
      ]);

      // Transform to ChangeRecord format
      const changes: ChangeRecord[] = records.map(record => {
        const details = record.details as any || {};
        
        return {
          id: record.id,
          integrationId: record.integration_id,
          entityType: record.entity_type || 'unknown',
          entityId: record.entity_id || 'unknown',
          externalId: record.external_entity_id || undefined,
          changeType: (details.changeType as ChangeType) || 'updated',
          fieldChanges: details.fieldChanges || [],
          previousHash: details.previousHash,
          currentHash: details.currentHash,
          changeScore: details.changeScore || 50,
          significance: (record.severity as ChangeSeverity) || 'medium',
          metadata: details.metadata || {
            detectedAt: record.occurred_at,
            detectionMethod: 'automatic',
            confidence: 0.8,
            source: 'system',
            correlationId: record.correlation_id,
          },
          syncContext: details.syncContext,
          createdAt: record.occurred_at,
          processedAt: record.occurred_at,
          isProcessed: true,
        };
      });

      const executionTime = Date.now() - startTime;
      const hasMore = totalCount > offset + limit;

      this.logger.debug(`Change history query completed`, {
        recordsReturned: changes.length,
        totalCount,
        hasMore,
        executionTime,
      });

      return {
        changes,
        totalCount,
        hasMore,
        queryStats: {
          executionTime,
          recordsScanned: totalCount,
          indexesUsed: ['occurred_at', 'integration_id', 'entity_type'], // Simplified
        },
      };

    } catch (error) {
      this.logger.error(`Change history query failed: ${error.message}`, error.stack, {
        query,
      });
      throw error;
    }
  }

  /**
   * Get change summary statistics
   */
  async getChangeSummary(
    integrationId?: string,
    entityType?: EntityType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ChangeSummary> {
    this.logger.debug('Generating change summary', {
      integrationId,
      entityType,
      dateRange: startDate && endDate ? { startDate, endDate } : undefined,
    });

    const where: any = {
      event_type: 'change_detected',
    };

    if (integrationId) where.integration_id = integrationId;
    if (entityType) where.entity_type = entityType;
    if (startDate || endDate) {
      where.occurred_at = {};
      if (startDate) where.occurred_at.gte = startDate;
      if (endDate) where.occurred_at.lte = endDate;
    }

    const records = await this.prisma.integrationAuditLog.findMany({
      where,
      select: {
        entity_type: true,
        entity_id: true,
        severity: true,
        details: true,
        occurred_at: true,
      },
      orderBy: { occurred_at: 'asc' },
    });

    // Process records to generate summary
    const totalChanges = records.length;
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

    let totalChangeScore = 0;
    const entityChangeCounts = new Map<string, number>();

    records.forEach(record => {
      const details = record.details as any || {};
      const changeType = (details.changeType as ChangeType) || 'updated';
      const severity = (record.severity as ChangeSeverity) || 'medium';
      const entityType = record.entity_type || 'unknown';
      const changeScore = details.changeScore || 50;

      changesByType[changeType]++;
      changesBySeverity[severity]++;
      changesByEntity[entityType] = (changesByEntity[entityType] || 0) + 1;
      totalChangeScore += changeScore;

      const entityKey = `${entityType}:${record.entity_id}`;
      entityChangeCounts.set(entityKey, (entityChangeCounts.get(entityKey) || 0) + 1);
    });

    // Calculate top changed entities
    const topChangedEntities = Array.from(entityChangeCounts.entries())
      .map(([key, count]) => {
        const [entityType, entityId] = key.split(':');
        return {
          entityType,
          entityId,
          changeCount: count,
          averageScore: 50, // Could calculate actual average from records
        };
      })
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 10);

    // Determine time range
    const dates = records.map(r => r.occurred_at).sort((a, b) => a.getTime() - b.getTime());
    const timeRange = {
      startDate: dates[0] || startDate || new Date(),
      endDate: dates[dates.length - 1] || endDate || new Date(),
    };

    const averageChangeScore = totalChanges > 0 ? totalChangeScore / totalChanges : 0;

    return {
      totalChanges,
      changesByType,
      changesBySeverity,
      changesByEntity,
      averageChangeScore,
      timeRange,
      topChangedEntities,
    };
  }

  /**
   * Get change history statistics
   */
  async getChangeHistoryStats(): Promise<ChangeHistoryStats> {
    this.logger.debug('Gathering change history statistics');

    const [
      totalRecords,
      integrationStats,
      entityTypeStats,
      severityStats,
      timeStats,
    ] = await Promise.all([
      // Total records
      this.prisma.integrationAuditLog.count({
        where: { event_type: 'change_detected' },
      }),

      // Records by integration
      this.prisma.integrationAuditLog.groupBy({
        by: ['integration_id'],
        where: { event_type: 'change_detected' },
        _count: { _all: true },
      }),

      // Records by entity type
      this.prisma.integrationAuditLog.groupBy({
        by: ['entity_type'],
        where: { event_type: 'change_detected' },
        _count: { _all: true },
      }),

      // Records by severity
      this.prisma.integrationAuditLog.groupBy({
        by: ['severity'],
        where: { event_type: 'change_detected' },
        _count: { _all: true },
      }),

      // Time range stats
      this.prisma.integrationAuditLog.aggregate({
        where: { event_type: 'change_detected' },
        _min: { occurred_at: true },
        _max: { occurred_at: true },
      }),
    ]);

    // Process grouped results
    const recordsByIntegration: Record<string, number> = {};
    integrationStats.forEach(stat => {
      recordsByIntegration[stat.integration_id] = stat._count._all;
    });

    const recordsByEntityType: Record<string, number> = {};
    entityTypeStats.forEach(stat => {
      recordsByEntityType[stat.entity_type || 'unknown'] = stat._count._all;
    });

    const recordsBySeverity: Record<ChangeSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    severityStats.forEach(stat => {
      const severity = (stat.severity as ChangeSeverity) || 'medium';
      recordsBySeverity[severity] = stat._count._all;
    });

    // Estimate storage size (rough calculation)
    const averageRecordSize = 1024; // bytes
    const storageSize = totalRecords * averageRecordSize;

    return {
      totalRecords,
      recordsByIntegration,
      recordsByEntityType,
      recordsByChangeType: {
        created: 0,
        updated: 0,
        deleted: 0,
        moved: 0,
        merged: 0,
        split: 0,
      }, // Would need to parse from details
      recordsBySeverity,
      oldestRecord: timeStats._min.occurred_at || undefined,
      newestRecord: timeStats._max.occurred_at || undefined,
      storageSize,
      indexesCount: 5, // Estimated based on typical indexes
    };
  }

  // ===================================================================
  // DATA LIFECYCLE MANAGEMENT
  // ===================================================================

  /**
   * Clean up old change records based on retention policy
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performRetentionCleanup(): Promise<ChangeHistoryCleanupResult> {
    const startTime = Date.now();
    
    this.logger.log(`Starting retention cleanup with ${this.config.retentionPeriod} day retention period`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod);

    try {
      const result = await this.prisma.integrationAuditLog.deleteMany({
        where: {
          event_type: 'change_detected',
          occurred_at: {
            lt: cutoffDate,
          },
        },
      });

      const duration = Date.now() - startTime;

      this.logger.log(`Retention cleanup completed`, {
        recordsDeleted: result.count,
        cutoffDate,
        duration,
      });

      return {
        cleanupType: 'retention',
        recordsProcessed: result.count,
        recordsDeleted: result.count,
        recordsCompressed: 0,
        storageReclaimed: result.count * 1024, // Estimated
        duration,
        errors: [],
      };

    } catch (error) {
      this.logger.error(`Retention cleanup failed: ${error.message}`, error.stack);
      
      return {
        cleanupType: 'retention',
        recordsProcessed: 0,
        recordsDeleted: 0,
        recordsCompressed: 0,
        storageReclaimed: 0,
        duration: Date.now() - startTime,
        errors: [error.message],
      };
    }
  }

  /**
   * Compress old change records to save storage
   */
  async compressOldRecords(): Promise<ChangeHistoryCleanupResult> {
    if (!this.config.enableCompression) {
      this.logger.debug('Change record compression is disabled');
      return {
        cleanupType: 'compression',
        recordsProcessed: 0,
        recordsDeleted: 0,
        recordsCompressed: 0,
        storageReclaimed: 0,
        duration: 0,
        errors: ['Compression disabled'],
      };
    }

    const startTime = Date.now();
    
    this.logger.log(`Starting change record compression for records older than ${this.config.compressionThreshold} days`);

    const compressionDate = new Date();
    compressionDate.setDate(compressionDate.getDate() - this.config.compressionThreshold);

    try {
      // Find records to compress (grouped by entity)
      const recordsToCompress = await this.prisma.integrationAuditLog.findMany({
        where: {
          event_type: 'change_detected',
          occurred_at: {
            lt: compressionDate,
          },
        },
        orderBy: { occurred_at: 'asc' },
      });

      if (recordsToCompress.length === 0) {
        this.logger.log('No records found for compression');
        return {
          cleanupType: 'compression',
          recordsProcessed: 0,
          recordsDeleted: 0,
          recordsCompressed: 0,
          storageReclaimed: 0,
          duration: Date.now() - startTime,
          errors: [],
        };
      }

      // Group records by entity for compression
      const entityGroups = new Map<string, typeof recordsToCompress>();
      recordsToCompress.forEach(record => {
        const key = `${record.integration_id}:${record.entity_type}:${record.entity_id}`;
        if (!entityGroups.has(key)) {
          entityGroups.set(key, []);
        }
        entityGroups.get(key)!.push(record);
      });

      let compressedRecords = 0;
      let deletedRecords = 0;
      const errors: string[] = [];

      // Process each entity group
      for (const [entityKey, records] of entityGroups) {
        try {
          const compressedRecord = this.createCompressedRecord(records);
          
          // Store compressed record (this would be in a separate table)
          // For now, we'll just delete the old records
          
          const deleteResult = await this.prisma.integrationAuditLog.deleteMany({
            where: {
              id: { in: records.map(r => r.id) },
            },
          });

          compressedRecords += 1;
          deletedRecords += deleteResult.count;

        } catch (error) {
          errors.push(`Failed to compress entity ${entityKey}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.log(`Change record compression completed`, {
        recordsProcessed: recordsToCompress.length,
        compressedRecords,
        deletedRecords,
        duration,
        errors: errors.length,
      });

      return {
        cleanupType: 'compression',
        recordsProcessed: recordsToCompress.length,
        recordsDeleted: deletedRecords,
        recordsCompressed: compressedRecords,
        storageReclaimed: deletedRecords * 1024, // Estimated
        duration,
        errors,
      };

    } catch (error) {
      this.logger.error(`Change record compression failed: ${error.message}`, error.stack);
      
      return {
        cleanupType: 'compression',
        recordsProcessed: 0,
        recordsDeleted: 0,
        recordsCompressed: 0,
        storageReclaimed: 0,
        duration: Date.now() - startTime,
        errors: [error.message],
      };
    }
  }

  /**
   * Optimize indexes for better query performance
   */
  async optimizeIndexes(): Promise<ChangeHistoryCleanupResult> {
    if (!this.config.enableIndexOptimization) {
      return {
        cleanupType: 'optimization',
        recordsProcessed: 0,
        recordsDeleted: 0,
        recordsCompressed: 0,
        storageReclaimed: 0,
        duration: 0,
        errors: ['Index optimization disabled'],
      };
    }

    const startTime = Date.now();
    
    this.logger.log('Starting index optimization for change history tables');

    // This would typically involve database-specific optimization commands
    // For PostgreSQL with Prisma, we'd need to use raw SQL
    
    try {
      // Simulated optimization - in real implementation, would run REINDEX or similar
      await new Promise(resolve => setTimeout(resolve, 1000));

      const duration = Date.now() - startTime;

      this.logger.log(`Index optimization completed`, { duration });

      return {
        cleanupType: 'optimization',
        recordsProcessed: 0,
        recordsDeleted: 0,
        recordsCompressed: 0,
        storageReclaimed: 0,
        duration,
        errors: [],
      };

    } catch (error) {
      this.logger.error(`Index optimization failed: ${error.message}`, error.stack);
      
      return {
        cleanupType: 'optimization',
        recordsProcessed: 0,
        recordsDeleted: 0,
        recordsCompressed: 0,
        storageReclaimed: 0,
        duration: Date.now() - startTime,
        errors: [error.message],
      };
    }
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private generateChangeDescription(record: ChangeRecord): string {
    const entityDesc = record.externalId 
      ? `${record.entityType}:${record.externalId}` 
      : `${record.entityType}:${record.entityId}`;
    
    const fieldCount = record.fieldChanges.length;
    const fieldDesc = fieldCount > 0 ? ` (${fieldCount} fields)` : '';
    
    return `${record.changeType} change detected for ${entityDesc}${fieldDesc}`;
  }

  private createCompressedRecord(records: any[]): CompressedChangeRecord {
    const sortedRecords = records.sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime());
    const firstRecord = sortedRecords[0];
    const lastRecord = sortedRecords[sortedRecords.length - 1];

    // Analyze changes
    const changeTypes = new Set<ChangeType>();
    const severityDistribution: Record<ChangeSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const fieldChangeCounts: Record<string, number> = {};

    records.forEach(record => {
      const details = record.details as any || {};
      const changeType = details.changeType as ChangeType;
      if (changeType) changeTypes.add(changeType);
      
      const severity = record.severity as ChangeSeverity;
      if (severity) severityDistribution[severity]++;

      const fieldChanges = details.fieldChanges as FieldChange[] || [];
      fieldChanges.forEach(fc => {
        fieldChangeCounts[fc.fieldName] = (fieldChangeCounts[fc.fieldName] || 0) + 1;
      });
    });

    const originalSize = records.length * 1024; // Estimated
    const compressedSize = 512; // Estimated compressed size
    const compressionRatio = originalSize / compressedSize;

    return {
      id: this.generateCompressedRecordId(),
      integrationId: firstRecord.integration_id,
      entityType: firstRecord.entity_type,
      entityId: firstRecord.entity_id,
      changesSummary: {
        totalChanges: records.length,
        changeTypes: Array.from(changeTypes),
        severityDistribution,
        fieldChangeCounts,
      },
      timeRange: {
        startDate: firstRecord.occurred_at,
        endDate: lastRecord.occurred_at,
      },
      originalRecordIds: records.map(r => r.id),
      compressionRatio,
      compressedAt: new Date(),
    };
  }

  private generateCompressedRecordId(): string {
    return `compressed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultConfig(): ChangeHistoryConfig {
    return {
      retentionPeriod: 90, // 90 days
      compressionThreshold: 30, // 30 days
      enableCompression: false, // Disabled by default
      maxRecordsPerQuery: 1000,
      enableIndexOptimization: false,
      cleanupInterval: 24, // 24 hours
    };
  }
}
