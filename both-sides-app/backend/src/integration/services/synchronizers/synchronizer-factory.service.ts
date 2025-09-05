/**
 * Synchronizer Factory Service
 * 
 * Central factory for creating and managing entity-specific synchronizers.
 * Provides typed access to synchronizers and manages their lifecycle.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExternalIdMappingService } from '../external-id-mapping.service';
import { IntegrationRegistry } from '../integration-registry.service';
import { BaseSynchronizerService, SyncContext } from './base-synchronizer.service';
import { UserSynchronizerService } from './user-synchronizer.service';
import { ClassSynchronizerService } from './class-synchronizer.service';
import { OrganizationSynchronizerService } from './organization-synchronizer.service';
import { EnrollmentSynchronizerService } from './enrollment-synchronizer.service';

// ===================================================================
// SYNCHRONIZER FACTORY INTERFACES
// ===================================================================

export type EntityType = 'user' | 'class' | 'organization' | 'enrollment';

export interface SynchronizerFactory {
  getUserSynchronizer(): UserSynchronizerService;
  getClassSynchronizer(): ClassSynchronizerService;
  getOrganizationSynchronizer(): OrganizationSynchronizerService;
  getEnrollmentSynchronizer(): EnrollmentSynchronizerService;
  getSynchronizer(entityType: EntityType): BaseSynchronizerService;
}

export interface SynchronizerMetrics {
  entityType: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageProcessingTime: number;
  lastSyncAt: Date;
}

export interface SynchronizerHealthCheck {
  entityType: string;
  isHealthy: boolean;
  lastCheckAt: Date;
  errorCount: number;
  avgResponseTime: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

// ===================================================================
// SYNCHRONIZER FACTORY SERVICE
// ===================================================================

@Injectable()
export class SynchronizerFactoryService implements SynchronizerFactory {
  private readonly logger = new Logger(SynchronizerFactoryService.name);
  
  private readonly synchronizers = new Map<EntityType, BaseSynchronizerService>();
  private readonly metrics = new Map<EntityType, SynchronizerMetrics>();
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly mappingService: ExternalIdMappingService,
    private readonly integrationRegistry: IntegrationRegistry,
  ) {
    this.initializeSynchronizers();
    this.logger.log('SynchronizerFactory initialized with all entity synchronizers');
  }

  // ===================================================================
  // SYNCHRONIZER ACCESS METHODS
  // ===================================================================

  getUserSynchronizer(): UserSynchronizerService {
    return this.synchronizers.get('user') as UserSynchronizerService;
  }

  getClassSynchronizer(): ClassSynchronizerService {
    return this.synchronizers.get('class') as ClassSynchronizerService;
  }

  getOrganizationSynchronizer(): OrganizationSynchronizerService {
    return this.synchronizers.get('organization') as OrganizationSynchronizerService;
  }

  getEnrollmentSynchronizer(): EnrollmentSynchronizerService {
    return this.synchronizers.get('enrollment') as EnrollmentSynchronizerService;
  }

  getSynchronizer(entityType: EntityType): BaseSynchronizerService {
    const synchronizer = this.synchronizers.get(entityType);
    
    if (!synchronizer) {
      throw new Error(`No synchronizer found for entity type: ${entityType}`);
    }
    
    return synchronizer;
  }

  // ===================================================================
  // FACTORY MANAGEMENT METHODS
  // ===================================================================

  /**
   * Get all available entity types
   */
  getAvailableEntityTypes(): EntityType[] {
    return Array.from(this.synchronizers.keys());
  }

  /**
   * Synchronize multiple entities across types
   */
  async synchronizeMultipleEntities(
    entityData: { entityType: EntityType; data: any[] }[],
    context: SyncContext,
  ): Promise<{ entityType: EntityType; results: any[] }[]> {
    this.logger.log(`Synchronizing ${entityData.length} entity types`, {
      syncId: context.syncId,
      entityTypes: entityData.map(e => e.entityType),
    });

    const results = [];
    
    // Process in order: organizations -> users -> classes -> enrollments
    const orderedEntityTypes: EntityType[] = ['organization', 'user', 'class', 'enrollment'];
    
    for (const entityType of orderedEntityTypes) {
      const entityInput = entityData.find(e => e.entityType === entityType);
      
      if (entityInput) {
        this.logger.log(`Synchronizing ${entityInput.data.length} ${entityType} entities`, {
          syncId: context.syncId,
        });
        
        const synchronizer = this.getSynchronizer(entityType);
        const entityResults = await synchronizer.synchronizeBatch(
          entityInput.data,
          context,
          { batchSize: this.getBatchSizeForEntityType(entityType) },
        );
        
        results.push({
          entityType,
          results: entityResults,
        });

        // Update metrics
        this.updateMetrics(entityType, entityResults);
        
        // Small delay between entity types
        await this.delay(200);
      }
    }

    return results;
  }

  /**
   * Perform full sync across all entity types
   */
  async performFullSync(
    externalData: {
      organizations?: any[];
      users?: any[];
      classes?: any[];
      enrollments?: any[];
    },
    context: SyncContext,
  ): Promise<{
    summary: {
      totalProcessed: number;
      successCount: number;
      errorCount: number;
      processingTime: number;
    };
    results: { entityType: EntityType; results: any[] }[];
  }> {
    const startTime = Date.now();
    
    this.logger.log('Starting full sync across all entity types', {
      syncId: context.syncId,
      organizationCount: externalData.organizations?.length || 0,
      userCount: externalData.users?.length || 0,
      classCount: externalData.classes?.length || 0,
      enrollmentCount: externalData.enrollments?.length || 0,
    });

    const entityData: { entityType: EntityType; data: any[] }[] = [];
    
    if (externalData.organizations?.length) {
      entityData.push({ entityType: 'organization', data: externalData.organizations });
    }
    
    if (externalData.users?.length) {
      entityData.push({ entityType: 'user', data: externalData.users });
    }
    
    if (externalData.classes?.length) {
      entityData.push({ entityType: 'class', data: externalData.classes });
    }
    
    if (externalData.enrollments?.length) {
      entityData.push({ entityType: 'enrollment', data: externalData.enrollments });
    }

    const results = await this.synchronizeMultipleEntities(entityData, context);
    
    // Calculate summary statistics
    const allResults = results.flatMap(r => r.results);
    const summary = {
      totalProcessed: allResults.length,
      successCount: allResults.filter(r => ['created', 'updated'].includes(r.action)).length,
      errorCount: allResults.filter(r => r.action === 'error').length,
      processingTime: Date.now() - startTime,
    };

    this.logger.log('Full sync completed', {
      syncId: context.syncId,
      ...summary,
      entityTypeCount: results.length,
    });

    return {
      summary,
      results,
    };
  }

  /**
   * Get synchronizer health status
   */
  async getSynchronizerHealthStatus(): Promise<SynchronizerHealthCheck[]> {
    const healthChecks: SynchronizerHealthCheck[] = [];
    
    for (const [entityType, synchronizer] of this.synchronizers.entries()) {
      const metrics = this.metrics.get(entityType);
      
      const errorRate = metrics ? metrics.failedSyncs / Math.max(metrics.totalSyncs, 1) : 0;
      const avgResponseTime = metrics?.averageProcessingTime || 0;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (errorRate > 0.5 || avgResponseTime > 10000) {
        status = 'unhealthy';
      } else if (errorRate > 0.2 || avgResponseTime > 5000) {
        status = 'degraded';
      }
      
      healthChecks.push({
        entityType,
        isHealthy: status === 'healthy',
        lastCheckAt: new Date(),
        errorCount: metrics?.failedSyncs || 0,
        avgResponseTime,
        status,
      });
    }
    
    return healthChecks;
  }

  /**
   * Get comprehensive synchronizer metrics
   */
  getSynchronizerMetrics(): SynchronizerMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Reset synchronizer metrics
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.initializeMetrics();
    this.logger.log('Synchronizer metrics reset');
  }

  /**
   * Get factory statistics
   */
  getFactoryStatistics(): {
    totalSynchronizers: number;
    availableEntityTypes: EntityType[];
    totalSyncsProcessed: number;
    overallSuccessRate: number;
    averageProcessingTime: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const totalSyncs = allMetrics.reduce((sum, m) => sum + m.totalSyncs, 0);
    const totalSuccesses = allMetrics.reduce((sum, m) => sum + m.successfulSyncs, 0);
    const totalProcessingTime = allMetrics.reduce((sum, m) => sum + (m.averageProcessingTime * m.totalSyncs), 0);

    return {
      totalSynchronizers: this.synchronizers.size,
      availableEntityTypes: this.getAvailableEntityTypes(),
      totalSyncsProcessed: totalSyncs,
      overallSuccessRate: totalSyncs > 0 ? totalSuccesses / totalSyncs : 0,
      averageProcessingTime: totalSyncs > 0 ? totalProcessingTime / totalSyncs : 0,
    };
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private initializeSynchronizers(): void {
    this.synchronizers.set('user', new UserSynchronizerService(
      this.prisma,
      this.mappingService,
      this.integrationRegistry,
    ));

    this.synchronizers.set('class', new ClassSynchronizerService(
      this.prisma,
      this.mappingService,
      this.integrationRegistry,
    ));

    this.synchronizers.set('organization', new OrganizationSynchronizerService(
      this.prisma,
      this.mappingService,
      this.integrationRegistry,
    ));

    this.synchronizers.set('enrollment', new EnrollmentSynchronizerService(
      this.prisma,
      this.mappingService,
      this.integrationRegistry,
    ));

    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    for (const entityType of this.synchronizers.keys()) {
      this.metrics.set(entityType, {
        entityType,
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageProcessingTime: 0,
        lastSyncAt: new Date(),
      });
    }
  }

  private updateMetrics(entityType: EntityType, results: any[]): void {
    const currentMetrics = this.metrics.get(entityType);
    if (!currentMetrics) return;

    const successful = results.filter(r => ['created', 'updated', 'skipped'].includes(r.action)).length;
    const failed = results.filter(r => r.action === 'error').length;
    const totalProcessingTime = results.reduce((sum, r) => sum + (r.processingTime || 0), 0);

    const newTotalSyncs = currentMetrics.totalSyncs + results.length;
    const newSuccessfulSyncs = currentMetrics.successfulSyncs + successful;
    const newFailedSyncs = currentMetrics.failedSyncs + failed;

    // Calculate weighted average processing time
    const currentTotalTime = currentMetrics.averageProcessingTime * currentMetrics.totalSyncs;
    const newAverageProcessingTime = (currentTotalTime + totalProcessingTime) / newTotalSyncs;

    this.metrics.set(entityType, {
      ...currentMetrics,
      totalSyncs: newTotalSyncs,
      successfulSyncs: newSuccessfulSyncs,
      failedSyncs: newFailedSyncs,
      averageProcessingTime: newAverageProcessingTime,
      lastSyncAt: new Date(),
    });
  }

  private getBatchSizeForEntityType(entityType: EntityType): number {
    switch (entityType) {
      case 'organization':
        return 5;  // Smaller batches for hierarchical data
      case 'user':
        return 15; // Medium batches for users
      case 'class':
        return 10; // Medium batches for classes
      case 'enrollment':
        return 20; // Larger batches for simple relationships
      default:
        return 10;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
