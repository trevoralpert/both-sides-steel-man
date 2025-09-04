/**
 * Phase 9 Task 9.2.1: External ID Mapping Service
 * 
 * This service provides bidirectional ID translation between internal system IDs
 * and external system IDs. It includes bulk operations, caching, validation,
 * and integrity checking capabilities.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { ExternalSystemMapping, SyncStatus } from '@prisma/client';

/**
 * ID mapping entry for create/update operations
 */
export interface IdMappingEntry {
  integrationId: string;
  entityType: string;
  externalId: string;
  internalId: string;
  syncStatus?: SyncStatus;
  syncVersion?: number;
  externalData?: Record<string, any>;
  internalData?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Bulk mapping operation result
 */
export interface BulkMappingResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{
    mapping: IdMappingEntry;
    error: string;
  }>;
}

/**
 * Mapping validation result
 */
export interface MappingValidation {
  isValid: boolean;
  conflicts: Array<{
    type: 'duplicate_external' | 'duplicate_internal' | 'orphaned_mapping';
    mapping: ExternalSystemMapping;
    conflictWith?: ExternalSystemMapping;
    message: string;
  }>;
  orphanedMappings: ExternalSystemMapping[];
  duplicateExternalIds: string[];
  duplicateInternalIds: string[];
}

/**
 * Cache configuration for mapping service
 */
export interface MappingCacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  keyPrefix: string;
  maxSize: number;
  compressionEnabled: boolean;
}

/**
 * External ID Mapping Service
 * Provides fast, cached bidirectional ID translation between systems
 */
@Injectable()
export class ExternalIdMappingService {
  private readonly logger = new Logger(ExternalIdMappingService.name);
  
  // Cache configuration
  private readonly cacheConfig: MappingCacheConfig = {
    enabled: true,
    ttl: 3600, // 1 hour
    keyPrefix: 'id_mapping',
    maxSize: 50000,
    compressionEnabled: false,
  };
  
  // Performance metrics
  private metrics = {
    totalLookups: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalMappingsCreated: 0,
    totalMappingsUpdated: 0,
    totalMappingsDeleted: 0,
  };

  constructor(
    private prisma: PrismaService,
    @Inject('CacheService') private cache: CacheService
  ) {
    this.logger.log('External ID Mapping Service initialized');
  }

  // ================================================================
  // SINGLE ID MAPPING OPERATIONS
  // ================================================================

  /**
   * Map external ID to internal ID
   */
  async mapExternalToInternal(
    integrationId: string,
    entityType: string,
    externalId: string
  ): Promise<string | null> {
    this.metrics.totalLookups++;
    
    // Try cache first
    if (this.cacheConfig.enabled) {
      const cacheKey = this.getCacheKey('ext_to_int', integrationId, entityType, externalId);
      const cachedResult = await this.cache.get<string>(cacheKey);
      
      if (cachedResult !== null) {
        this.metrics.cacheHits++;
        return cachedResult;
      }
    }
    
    this.metrics.cacheMisses++;
    
    // Query database
    const mapping = await this.prisma.externalSystemMapping.findUnique({
      where: {
        integration_id_entityType_external_id: {
          integration_id: integrationId,
          entity_type: entityType,
          external_id: externalId,
        },
      },
    });
    
    const result = mapping?.internal_id || null;
    
    // Cache the result
    if (this.cacheConfig.enabled && result) {
      const cacheKey = this.getCacheKey('ext_to_int', integrationId, entityType, externalId);
      await this.cache.set(cacheKey, result, this.cacheConfig.ttl);
    }
    
    return result;
  }

  /**
   * Map internal ID to external ID
   */
  async mapInternalToExternal(
    integrationId: string,
    entityType: string,
    internalId: string
  ): Promise<string | null> {
    this.metrics.totalLookups++;
    
    // Try cache first
    if (this.cacheConfig.enabled) {
      const cacheKey = this.getCacheKey('int_to_ext', integrationId, entityType, internalId);
      const cachedResult = await this.cache.get<string>(cacheKey);
      
      if (cachedResult !== null) {
        this.metrics.cacheHits++;
        return cachedResult;
      }
    }
    
    this.metrics.cacheMisses++;
    
    // Query database
    const mapping = await this.prisma.externalSystemMapping.findUnique({
      where: {
        integration_id_entityType_internal_id: {
          integration_id: integrationId,
          entity_type: entityType,
          internal_id: internalId,
        },
      },
    });
    
    const result = mapping?.external_id || null;
    
    // Cache the result
    if (this.cacheConfig.enabled && result) {
      const cacheKey = this.getCacheKey('int_to_ext', integrationId, entityType, internalId);
      await this.cache.set(cacheKey, result, this.cacheConfig.ttl);
    }
    
    return result;
  }

  /**
   * Get complete mapping information
   */
  async getMapping(
    integrationId: string,
    entityType: string,
    externalId: string
  ): Promise<ExternalSystemMapping | null> {
    return await this.prisma.externalSystemMapping.findUnique({
      where: {
        integration_id_entityType_external_id: {
          integration_id: integrationId,
          entity_type: entityType,
          external_id: externalId,
        },
      },
    });
  }

  /**
   * Create or update an ID mapping
   */
  async createOrUpdateMapping(mapping: IdMappingEntry): Promise<ExternalSystemMapping> {
    const now = new Date();
    
    try {
      const result = await this.prisma.externalSystemMapping.upsert({
        where: {
          integration_id_entityType_external_id: {
            integration_id: mapping.integrationId,
            entity_type: mapping.entityType,
            external_id: mapping.externalId,
          },
        },
        update: {
          internal_id: mapping.internalId,
          sync_status: mapping.syncStatus || SyncStatus.SYNCED,
          sync_version: mapping.syncVersion || 1,
          external_data: mapping.externalData,
          internal_data: mapping.internalData,
          last_sync_at: now,
          updated_at: now,
        },
        create: {
          integration_id: mapping.integrationId,
          entity_type: mapping.entityType,
          external_id: mapping.externalId,
          internal_id: mapping.internalId,
          sync_status: mapping.syncStatus || SyncStatus.SYNCED,
          sync_version: mapping.syncVersion || 1,
          external_data: mapping.externalData,
          internal_data: mapping.internalData,
          last_sync_at: now,
        },
      });
      
      // Update metrics
      if (result.created_at === result.updated_at) {
        this.metrics.totalMappingsCreated++;
      } else {
        this.metrics.totalMappingsUpdated++;
      }
      
      // Invalidate cache
      await this.invalidateMappingCache(mapping.integrationId, mapping.entityType, mapping.externalId, mapping.internalId);
      
      this.logger.debug(`Created/updated mapping: ${mapping.entityType} ${mapping.externalId} <-> ${mapping.internalId}`);
      return result;
      
    } catch (error) {
      this.logger.error(`Failed to create/update mapping for ${mapping.entityType} ${mapping.externalId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an ID mapping
   */
  async deleteMapping(
    integrationId: string,
    entityType: string,
    externalId: string
  ): Promise<boolean> {
    try {
      // Get the mapping first to get internal ID for cache invalidation
      const mapping = await this.getMapping(integrationId, entityType, externalId);
      
      if (!mapping) {
        return false;
      }
      
      await this.prisma.externalSystemMapping.delete({
        where: {
          integration_id_entityType_external_id: {
            integration_id: integrationId,
            entity_type: entityType,
            external_id: externalId,
          },
        },
      });
      
      // Update metrics
      this.metrics.totalMappingsDeleted++;
      
      // Invalidate cache
      await this.invalidateMappingCache(integrationId, entityType, externalId, mapping.internal_id);
      
      this.logger.debug(`Deleted mapping: ${entityType} ${externalId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to delete mapping for ${entityType} ${externalId}:`, error);
      return false;
    }
  }

  // ================================================================
  // BULK OPERATIONS
  // ================================================================

  /**
   * Create multiple ID mappings in a single transaction
   */
  async bulkCreateMappings(mappings: IdMappingEntry[]): Promise<BulkMappingResult> {
    const result: BulkMappingResult = {
      success: true,
      totalProcessed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };
    
    if (mappings.length === 0) {
      return result;
    }
    
    this.logger.log(`Starting bulk creation of ${mappings.length} mappings`);
    
    // Process in batches for better performance
    const batchSize = 100;
    const batches = this.chunkArray(mappings, batchSize);
    
    for (const batch of batches) {
      await this.processBatch(batch, result);
    }
    
    result.success = result.errors === 0;
    
    this.logger.log(`Bulk creation completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors`);
    return result;
  }

  /**
   * Get mappings by entity type with pagination
   */
  async getMappingsByEntityType(
    integrationId: string,
    entityType: string,
    options: {
      limit?: number;
      offset?: number;
      syncStatus?: SyncStatus;
      includeData?: boolean;
    } = {}
  ): Promise<{
    mappings: ExternalSystemMapping[];
    total: number;
    hasMore: boolean;
  }> {
    const { limit = 100, offset = 0, syncStatus, includeData = false } = options;
    
    const where = {
      integration_id: integrationId,
      entity_type: entityType,
      ...(syncStatus && { sync_status: syncStatus }),
    };
    
    const select = {
      id: true,
      integration_id: true,
      entity_type: true,
      external_id: true,
      internal_id: true,
      sync_status: true,
      sync_version: true,
      last_sync_at: true,
      created_at: true,
      updated_at: true,
      ...(includeData && {
        external_data: true,
        internal_data: true,
        conflict_data: true,
      }),
    };
    
    const [mappings, total] = await Promise.all([
      this.prisma.externalSystemMapping.findMany({
        where,
        select,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.externalSystemMapping.count({ where }),
    ]);
    
    return {
      mappings,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get all mappings for a specific integration
   */
  async getMappingsByIntegration(
    integrationId: string,
    options: {
      entityTypes?: string[];
      syncStatus?: SyncStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ExternalSystemMapping[]> {
    const { entityTypes, syncStatus, limit = 1000, offset = 0 } = options;
    
    const where = {
      integration_id: integrationId,
      ...(entityTypes && { entity_type: { in: entityTypes } }),
      ...(syncStatus && { sync_status: syncStatus }),
    };
    
    return await this.prisma.externalSystemMapping.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { created_at: 'desc' },
    });
  }

  // ================================================================
  // VALIDATION & INTEGRITY CHECKS
  // ================================================================

  /**
   * Validate mapping integrity for an integration
   */
  async validateMappingIntegrity(integrationId: string): Promise<MappingValidation> {
    this.logger.log(`Validating mapping integrity for integration: ${integrationId}`);
    
    const mappings = await this.getMappingsByIntegration(integrationId);
    
    const validation: MappingValidation = {
      isValid: true,
      conflicts: [],
      orphanedMappings: [],
      duplicateExternalIds: [],
      duplicateInternalIds: [],
    };
    
    // Check for duplicate external IDs within entity types
    const externalIdGroups = this.groupBy(mappings, m => `${m.entity_type}:${m.external_id}`);
    for (const [key, group] of Object.entries(externalIdGroups)) {
      if (group.length > 1) {
        const [entityType, externalId] = key.split(':');
        validation.duplicateExternalIds.push(externalId);
        validation.conflicts.push({
          type: 'duplicate_external',
          mapping: group[0],
          conflictWith: group[1],
          message: `Duplicate external ID ${externalId} for entity type ${entityType}`,
        });
        validation.isValid = false;
      }
    }
    
    // Check for duplicate internal IDs within entity types
    const internalIdGroups = this.groupBy(mappings, m => `${m.entity_type}:${m.internal_id}`);
    for (const [key, group] of Object.entries(internalIdGroups)) {
      if (group.length > 1) {
        const [entityType, internalId] = key.split(':');
        validation.duplicateInternalIds.push(internalId);
        validation.conflicts.push({
          type: 'duplicate_internal',
          mapping: group[0],
          conflictWith: group[1],
          message: `Duplicate internal ID ${internalId} for entity type ${entityType}`,
        });
        validation.isValid = false;
      }
    }
    
    // TODO: Check for orphaned mappings (mappings where the internal entity no longer exists)
    // This would require checking against the actual entity tables
    
    this.logger.log(`Mapping validation completed: ${validation.isValid ? 'VALID' : 'INVALID'} (${validation.conflicts.length} conflicts)`);
    return validation;
  }

  /**
   * Clean up orphaned mappings
   */
  async cleanupOrphanedMappings(
    integrationId: string,
    entityType: string,
    validInternalIds: string[]
  ): Promise<number> {
    const mappings = await this.getMappingsByEntityType(integrationId, entityType);
    const orphanedMappings = mappings.mappings.filter(
      m => !validInternalIds.includes(m.internal_id)
    );
    
    if (orphanedMappings.length === 0) {
      return 0;
    }
    
    this.logger.log(`Cleaning up ${orphanedMappings.length} orphaned mappings for ${entityType}`);
    
    const orphanedIds = orphanedMappings.map(m => m.id);
    
    await this.prisma.externalSystemMapping.deleteMany({
      where: {
        id: { in: orphanedIds },
      },
    });
    
    // Invalidate cache for deleted mappings
    for (const mapping of orphanedMappings) {
      await this.invalidateMappingCache(
        mapping.integration_id,
        mapping.entity_type,
        mapping.external_id,
        mapping.internal_id
      );
    }
    
    this.metrics.totalMappingsDeleted += orphanedMappings.length;
    
    this.logger.log(`Cleaned up ${orphanedMappings.length} orphaned mappings`);
    return orphanedMappings.length;
  }

  // ================================================================
  // CACHE MANAGEMENT
  // ================================================================

  /**
   * Invalidate cache for a specific mapping
   */
  private async invalidateMappingCache(
    integrationId: string,
    entityType: string,
    externalId: string,
    internalId: string
  ): Promise<void> {
    if (!this.cacheConfig.enabled) {
      return;
    }
    
    const keys = [
      this.getCacheKey('ext_to_int', integrationId, entityType, externalId),
      this.getCacheKey('int_to_ext', integrationId, entityType, internalId),
    ];
    
    await Promise.all(keys.map(key => this.cache.del(key)));
  }

  /**
   * Clear all mapping cache for an integration
   */
  async clearMappingCache(integrationId: string): Promise<void> {
    if (!this.cacheConfig.enabled) {
      return;
    }
    
    const pattern = `${this.cacheConfig.keyPrefix}:*:${integrationId}:*`;
    await this.cache.delPattern(pattern);
    
    this.logger.log(`Cleared mapping cache for integration: ${integrationId}`);
  }

  /**
   * Get cache key for mapping lookup
   */
  private getCacheKey(
    direction: 'ext_to_int' | 'int_to_ext',
    integrationId: string,
    entityType: string,
    id: string
  ): string {
    return `${this.cacheConfig.keyPrefix}:${direction}:${integrationId}:${entityType}:${id}`;
  }

  // ================================================================
  // STATISTICS & MONITORING
  // ================================================================

  /**
   * Get mapping statistics for an integration
   */
  async getMappingStats(integrationId: string): Promise<{
    totalMappings: number;
    mappingsByEntityType: Record<string, number>;
    mappingsBySyncStatus: Record<SyncStatus, number>;
    oldestMapping: Date | null;
    newestMapping: Date | null;
    averageAge: number; // in days
  }> {
    const mappings = await this.getMappingsByIntegration(integrationId, { limit: 10000 });
    
    const now = new Date();
    const stats = {
      totalMappings: mappings.length,
      mappingsByEntityType: {} as Record<string, number>,
      mappingsBySyncStatus: {} as Record<SyncStatus, number>,
      oldestMapping: null as Date | null,
      newestMapping: null as Date | null,
      averageAge: 0,
    };
    
    if (mappings.length === 0) {
      return stats;
    }
    
    // Calculate statistics
    let totalAge = 0;
    let oldestDate = mappings[0].created_at;
    let newestDate = mappings[0].created_at;
    
    for (const mapping of mappings) {
      // Entity type counts
      stats.mappingsByEntityType[mapping.entity_type] = 
        (stats.mappingsByEntityType[mapping.entity_type] || 0) + 1;
      
      // Sync status counts
      stats.mappingsBySyncStatus[mapping.sync_status] = 
        (stats.mappingsBySyncStatus[mapping.sync_status] || 0) + 1;
      
      // Age calculations
      const age = now.getTime() - mapping.created_at.getTime();
      totalAge += age;
      
      if (mapping.created_at < oldestDate) {
        oldestDate = mapping.created_at;
      }
      
      if (mapping.created_at > newestDate) {
        newestDate = mapping.created_at;
      }
    }
    
    stats.oldestMapping = oldestDate;
    stats.newestMapping = newestDate;
    stats.averageAge = totalAge / mappings.length / (1000 * 60 * 60 * 24); // Convert to days
    
    return stats;
  }

  /**
   * Get service performance metrics
   */
  getPerformanceMetrics(): typeof this.metrics & {
    cacheHitRate: number;
    cacheMissRate: number;
  } {
    const cacheHitRate = this.metrics.totalLookups > 0 ? 
      (this.metrics.cacheHits / this.metrics.totalLookups) * 100 : 0;
    
    const cacheMissRate = this.metrics.totalLookups > 0 ? 
      (this.metrics.cacheMisses / this.metrics.totalLookups) * 100 : 0;
    
    return {
      ...this.metrics,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      cacheMissRate: Math.round(cacheMissRate * 100) / 100,
    };
  }

  // ================================================================
  // PRIVATE HELPER METHODS
  // ================================================================

  /**
   * Process a batch of mappings
   */
  private async processBatch(
    batch: IdMappingEntry[],
    result: BulkMappingResult
  ): Promise<void> {
    for (const mapping of batch) {
      try {
        result.totalProcessed++;
        
        const existingMapping = await this.getMapping(
          mapping.integrationId,
          mapping.entityType,
          mapping.externalId
        );
        
        await this.createOrUpdateMapping(mapping);
        
        if (existingMapping) {
          result.updated++;
        } else {
          result.created++;
        }
        
      } catch (error) {
        result.errors++;
        result.errorDetails.push({
          mapping,
          error: error.message || 'Unknown error',
        });
        
        this.logger.error(`Failed to process mapping ${mapping.entityType} ${mapping.externalId}:`, error);
      }
    }
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Group array by key function
   */
  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}
