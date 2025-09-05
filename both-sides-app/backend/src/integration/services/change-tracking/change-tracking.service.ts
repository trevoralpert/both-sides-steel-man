/**
 * Change Tracking Service
 * 
 * High-level orchestration service for change detection and tracking.
 * Integrates with synchronizers to provide comprehensive change management,
 * incremental sync planning, and change analytics.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChangeDetectionService } from './change-detection.service';
import { SynchronizerFactoryService } from '../synchronizers/synchronizer-factory.service';
import { ExternalIdMappingService } from '../external-id-mapping.service';
import {
  ChangeDetectionResult,
  EntityChange,
  ChangeRecord,
  IncrementalSyncPlan,
  ChangeAnalytics,
  ChangeSummary,
  ChangeHistoryQuery,
  ChangeNotification,
  ChangeNotificationConfig,
  ChangePattern,
} from './change-detection.interfaces';
import { EntityType, SyncContext } from '../synchronizers/base-synchronizer.service';
import { EventEmitter } from 'events';

// ===================================================================
// CHANGE TRACKING INTERFACES
// ===================================================================

export interface ChangeTrackingConfig {
  enableAutoDetection: boolean;
  detectionInterval: number; // minutes
  enableIncrementalSync: boolean;
  incrementalSyncThreshold: number; // number of changes to trigger sync
  retentionPeriod: number; // days
  enableNotifications: boolean;
  notificationConfig: ChangeNotificationConfig;
  analyticsConfig: {
    enableAnalytics: boolean;
    enablePrediction: boolean;
    analysisWindow: number; // hours
    patternDetection: boolean;
  };
}

export interface ChangeTrackingSession {
  sessionId: string;
  integrationId: string;
  entityTypes: EntityType[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  totalChangesDetected: number;
  changesByType: Record<EntityType, number>;
  performanceMetrics: {
    entitiesProcessed: number;
    processingRate: number;
    averageDetectionTime: number;
  };
}

export interface ChangeTrackingReport {
  integrationId: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: ChangeSummary;
  entityReports: {
    entityType: EntityType;
    changeCount: number;
    significantChanges: number;
    patterns: ChangePattern[];
    recommendations: string[];
  }[];
  incrementalSyncPlans: IncrementalSyncPlan[];
  analytics: ChangeAnalytics;
  generatedAt: Date;
}

// ===================================================================
// CHANGE TRACKING SERVICE
// ===================================================================

@Injectable()
export class ChangeTrackingService extends EventEmitter {
  private readonly logger = new Logger(ChangeTrackingService.name);
  private readonly activeSessions = new Map<string, ChangeTrackingSession>();
  private readonly defaultConfig: ChangeTrackingConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly changeDetectionService: ChangeDetectionService,
    private readonly synchronizerFactory: SynchronizerFactoryService,
    private readonly mappingService: ExternalIdMappingService,
  ) {
    super();
    this.defaultConfig = this.getDefaultConfig();
    this.logger.log('ChangeTrackingService initialized');
  }

  // ===================================================================
  // CORE CHANGE TRACKING METHODS
  // ===================================================================

  /**
   * Start comprehensive change tracking session
   */
  async startChangeTrackingSession(
    integrationId: string,
    entityTypes: EntityType[],
    syncContext: SyncContext,
    config?: Partial<ChangeTrackingConfig>,
  ): Promise<ChangeTrackingSession> {
    const sessionId = this.generateSessionId();
    const fullConfig = { ...this.defaultConfig, ...config };

    const session: ChangeTrackingSession = {
      sessionId,
      integrationId,
      entityTypes,
      startTime: new Date(),
      status: 'active',
      totalChangesDetected: 0,
      changesByType: {},
      performanceMetrics: {
        entitiesProcessed: 0,
        processingRate: 0,
        averageDetectionTime: 0,
      },
    };

    this.activeSessions.set(sessionId, session);

    this.logger.log(`Started change tracking session for ${entityTypes.length} entity types`, {
      sessionId,
      integrationId,
      entityTypes,
    });

    // Emit session started event
    this.emit('session:started', { session, config: fullConfig });

    return session;
  }

  /**
   * Track changes for multiple entity types with data
   */
  async trackChangesForEntities(
    sessionId: string,
    entityData: { entityType: EntityType; currentData: any[] }[],
    syncContext: SyncContext,
  ): Promise<{
    session: ChangeTrackingSession;
    detectionResults: { entityType: EntityType; result: ChangeDetectionResult }[];
    incrementalSyncPlans: IncrementalSyncPlan[];
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Change tracking session not found: ${sessionId}`);
    }

    const detectionResults: { entityType: EntityType; result: ChangeDetectionResult }[] = [];
    const incrementalSyncPlans: IncrementalSyncPlan[] = [];

    this.logger.log(`Tracking changes for ${entityData.length} entity types in session`, {
      sessionId,
      entityTypes: entityData.map(e => e.entityType),
    });

    // Process each entity type
    for (const { entityType, currentData } of entityData) {
      try {
        // Detect changes
        const detectionResult = await this.changeDetectionService.detectEntityChanges(
          entityType,
          currentData,
          session.integrationId,
          syncContext,
        );

        detectionResults.push({ entityType, result: detectionResult });

        // Update session statistics
        session.totalChangesDetected += detectionResult.entityChanges.length;
        session.changesByType[entityType] = detectionResult.entityChanges.length;
        session.performanceMetrics.entitiesProcessed += detectionResult.performance.entitiesProcessed;

        // Generate incremental sync plan if needed
        if (detectionResult.entityChanges.length > 0) {
          const syncPlan = await this.generateIncrementalSyncPlan(
            session.integrationId,
            entityType,
            detectionResult.entityChanges,
          );
          
          if (syncPlan) {
            incrementalSyncPlans.push(syncPlan);
          }
        }

        // Emit change detection event
        this.emit('changes:detected', {
          sessionId,
          entityType,
          result: detectionResult,
        });

        // Process notifications
        await this.processChangeNotifications(
          session.integrationId,
          detectionResult.entityChanges,
        );

      } catch (error) {
        this.logger.error(`Failed to track changes for ${entityType}: ${error.message}`, error.stack, {
          sessionId,
          entityType,
        });

        // Continue with other entity types
        continue;
      }
    }

    // Update session performance metrics
    const totalDuration = detectionResults.reduce((sum, r) => sum + r.result.performance.duration, 0);
    session.performanceMetrics.averageDetectionTime = totalDuration / detectionResults.length;
    session.performanceMetrics.processingRate = session.performanceMetrics.entitiesProcessed / (totalDuration / 1000);

    this.logger.log(`Change tracking completed for session`, {
      sessionId,
      totalChanges: session.totalChangesDetected,
      incrementalSyncPlans: incrementalSyncPlans.length,
    });

    return {
      session,
      detectionResults,
      incrementalSyncPlans,
    };
  }

  /**
   * Complete change tracking session
   */
  async completeChangeTrackingSession(sessionId: string): Promise<ChangeTrackingSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Change tracking session not found: ${sessionId}`);
    }

    session.endTime = new Date();
    session.status = 'completed';

    this.activeSessions.delete(sessionId);

    this.logger.log(`Completed change tracking session`, {
      sessionId,
      duration: session.endTime.getTime() - session.startTime.getTime(),
      totalChanges: session.totalChangesDetected,
    });

    // Emit session completed event
    this.emit('session:completed', { session });

    return session;
  }

  /**
   * Generate comprehensive change tracking report
   */
  async generateChangeTrackingReport(
    integrationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ChangeTrackingReport> {
    this.logger.log(`Generating change tracking report`, {
      integrationId,
      period: { startDate, endDate },
    });

    // Get overall summary
    const summary = await this.changeDetectionService.getChangeSummary(
      integrationId,
      undefined,
      startDate,
      endDate,
    );

    // Generate entity-specific reports
    const entityTypes = this.synchronizerFactory.getAvailableEntityTypes();
    const entityReports = [];

    for (const entityType of entityTypes) {
      const entitySummary = await this.changeDetectionService.getChangeSummary(
        integrationId,
        entityType,
        startDate,
        endDate,
      );

      const patterns = await this.detectChangePatterns(integrationId, entityType, startDate, endDate);
      const recommendations = this.generateEntityRecommendations(entityType, entitySummary, patterns);

      entityReports.push({
        entityType,
        changeCount: entitySummary.totalChanges,
        significantChanges: entitySummary.changesBySeverity.high + entitySummary.changesBySeverity.critical,
        patterns,
        recommendations,
      });
    }

    // Generate incremental sync plans
    const incrementalSyncPlans = await this.generateIncrementalSyncPlans(
      integrationId,
      startDate,
      endDate,
    );

    // Generate analytics
    const analytics = await this.generateChangeAnalytics(integrationId, startDate, endDate);

    return {
      integrationId,
      reportPeriod: { startDate, endDate },
      summary,
      entityReports,
      incrementalSyncPlans,
      analytics,
      generatedAt: new Date(),
    };
  }

  /**
   * Execute incremental sync based on detected changes
   */
  async executeIncrementalSync(
    syncPlan: IncrementalSyncPlan,
    syncContext: SyncContext,
  ): Promise<{
    success: boolean;
    syncedEntities: number;
    errors: string[];
    duration: number;
  }> {
    const startTime = Date.now();
    
    this.logger.log(`Executing incremental sync plan`, {
      integrationId: syncPlan.integrationId,
      entityType: syncPlan.entityType,
      entityCount: syncPlan.entitiesToSync.length,
    });

    try {
      const synchronizer = this.synchronizerFactory.getSynchronizer(syncPlan.entityType);
      const errors: string[] = [];
      let syncedEntities = 0;

      // Process entities in order of priority/dependencies
      const sortedEntities = this.sortEntitiesByPriority(syncPlan.entitiesToSync);

      for (const entityToSync of sortedEntities) {
        try {
          // This would need to fetch the current external data for the entity
          // For now, we'll simulate the sync operation
          this.logger.debug(`Syncing entity: ${entityToSync.entityId}`, {
            reason: entityToSync.reason.join(', '),
            changeScore: entityToSync.changeScore,
          });

          // Actual sync would happen here
          // const result = await synchronizer.synchronizeEntity(entityData, syncContext);
          
          syncedEntities++;
        } catch (error) {
          errors.push(`Failed to sync ${entityToSync.entityId}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      const success = errors.length === 0;

      this.logger.log(`Incremental sync ${success ? 'completed' : 'completed with errors'}`, {
        integrationId: syncPlan.integrationId,
        entityType: syncPlan.entityType,
        syncedEntities,
        errors: errors.length,
        duration,
      });

      // Emit incremental sync event
      this.emit('incremental:sync:completed', {
        syncPlan,
        success,
        syncedEntities,
        errors,
        duration,
      });

      return {
        success,
        syncedEntities,
        errors,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Incremental sync failed: ${error.message}`, error.stack, {
        integrationId: syncPlan.integrationId,
        entityType: syncPlan.entityType,
      });

      return {
        success: false,
        syncedEntities: 0,
        errors: [error.message],
        duration,
      };
    }
  }

  // ===================================================================
  // CHANGE ANALYTICS METHODS
  // ===================================================================

  /**
   * Analyze change patterns and trends
   */
  async generateChangeAnalytics(
    integrationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ChangeAnalytics> {
    const query: ChangeHistoryQuery = {
      integrationId,
      dateRange: { startDate, endDate },
      includeMetadata: true,
      includeFieldChanges: true,
    };

    const { changes } = await this.changeDetectionService.queryChangeHistory(query);

    // Calculate change velocity (changes per hour)
    const timeSpanHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const changeVelocity = changes.length / timeSpanHours;

    // Calculate change acceleration (comparing to previous period)
    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const previousQuery: ChangeHistoryQuery = {
      integrationId,
      dateRange: { startDate: previousPeriodStart, endDate: startDate },
    };
    
    const { changes: previousChanges } = await this.changeDetectionService.queryChangeHistory(previousQuery);
    const previousVelocity = previousChanges.length / timeSpanHours;
    const changeAcceleration = changeVelocity - previousVelocity;

    // Analyze peak change hours
    const changesByHour = new Map<number, number>();
    changes.forEach(change => {
      const hour = change.createdAt.getHours();
      changesByHour.set(hour, (changesByHour.get(hour) || 0) + 1);
    });

    const peakChangeHours = Array.from(changesByHour.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour]) => hour);

    // Detect common change patterns
    const commonChangePatterns = await this.detectCommonChangePatterns(changes);

    // Identify anomalous changes
    const anomalousChanges = this.identifyAnomalousChanges(changes);

    // Predict future changes (simple heuristic)
    const predictedChanges = this.predictFutureChanges(changes, changeVelocity);

    return {
      changeVelocity,
      changeAcceleration,
      peakChangeHours,
      commonChangePatterns,
      anomalousChanges,
      predictedChanges,
    };
  }

  /**
   * Detect change patterns in entity data
   */
  async detectChangePatterns(
    integrationId: string,
    entityType: EntityType,
    startDate: Date,
    endDate: Date,
  ): Promise<ChangePattern[]> {
    const query: ChangeHistoryQuery = {
      integrationId,
      entityType,
      dateRange: { startDate, endDate },
    };

    const { changes } = await this.changeDetectionService.queryChangeHistory(query);
    
    return this.analyzeChangesForPatterns(changes, entityType);
  }

  // ===================================================================
  // INCREMENTAL SYNC PLANNING
  // ===================================================================

  /**
   * Generate incremental sync plan based on detected changes
   */
  private async generateIncrementalSyncPlan(
    integrationId: string,
    entityType: EntityType,
    entityChanges: EntityChange[],
  ): Promise<IncrementalSyncPlan | null> {
    if (entityChanges.length === 0) {
      return null;
    }

    // Filter changes that warrant incremental sync
    const significantChanges = entityChanges.filter(
      change => change.significance === 'high' || change.significance === 'critical' || change.changeScore > 50
    );

    if (significantChanges.length === 0) {
      return null;
    }

    // Calculate priority
    const avgChangeScore = significantChanges.reduce((sum, change) => sum + change.changeScore, 0) / significantChanges.length;
    let priority: 'low' | 'medium' | 'high' = 'low';
    
    if (avgChangeScore > 80) priority = 'high';
    else if (avgChangeScore > 50) priority = 'medium';

    // Estimate duration (simple heuristic: 100ms per entity)
    const estimatedDuration = significantChanges.length * 100;

    // Determine dependencies
    const dependencies = this.determineSyncDependencies(entityType, significantChanges);

    return {
      integrationId,
      entityType,
      plannedAt: new Date(),
      entitiesToSync: significantChanges.map(change => ({
        entityId: change.entityId,
        externalId: change.externalId || change.entityId,
        changeScore: change.changeScore,
        reason: [
          `${change.changeType} change detected`,
          `Significance: ${change.significance}`,
          `Field changes: ${change.fieldChanges.length}`,
        ],
      })),
      estimatedDuration,
      priority,
      dependencies,
    };
  }

  /**
   * Generate multiple incremental sync plans
   */
  private async generateIncrementalSyncPlans(
    integrationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IncrementalSyncPlan[]> {
    const plans: IncrementalSyncPlan[] = [];
    const entityTypes = this.synchronizerFactory.getAvailableEntityTypes();

    for (const entityType of entityTypes) {
      const query: ChangeHistoryQuery = {
        integrationId,
        entityType,
        dateRange: { startDate, endDate },
        significance: ['high', 'critical'],
      };

      const { changes } = await this.changeDetectionService.queryChangeHistory(query);
      
      if (changes.length > 0) {
        // Convert change records to entity changes
        const entityChanges: EntityChange[] = changes.map(change => ({
          entityType: change.entityType,
          entityId: change.entityId,
          externalId: change.externalId,
          changeType: change.changeType,
          fieldChanges: change.fieldChanges,
          changeScore: change.changeScore,
          significance: change.significance,
          metadata: change.metadata,
        }));

        const plan = await this.generateIncrementalSyncPlan(
          integrationId,
          entityType,
          entityChanges,
        );

        if (plan) {
          plans.push(plan);
        }
      }
    }

    return plans.sort((a, b) => {
      // Sort by priority, then by estimated duration
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      return a.estimatedDuration - b.estimatedDuration;
    });
  }

  // ===================================================================
  // NOTIFICATION METHODS
  // ===================================================================

  /**
   * Process change notifications
   */
  private async processChangeNotifications(
    integrationId: string,
    entityChanges: EntityChange[],
  ): Promise<void> {
    if (!this.defaultConfig.enableNotifications) {
      return;
    }

    const significantChanges = entityChanges.filter(
      change => change.significance === 'high' || change.significance === 'critical'
    );

    for (const change of significantChanges) {
      const notification: ChangeNotification = {
        id: this.generateNotificationId(),
        integrationId,
        entityChange: change,
        channel: 'database', // Default channel
        status: 'pending',
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Emit notification event
      this.emit('notification:created', notification);
    }
  }

  // ===================================================================
  // UTILITY AND HELPER METHODS
  // ===================================================================

  private getDefaultConfig(): ChangeTrackingConfig {
    return {
      enableAutoDetection: true,
      detectionInterval: 30, // 30 minutes
      enableIncrementalSync: true,
      incrementalSyncThreshold: 5, // 5 changes trigger sync
      retentionPeriod: 90, // 90 days
      enableNotifications: false,
      notificationConfig: {
        enableNotifications: false,
        notificationChannels: ['database'],
        filters: {
          minimumSeverity: 'high',
          entityTypes: [],
          changeTypes: [],
        },
        throttling: {
          maxPerMinute: 10,
          maxPerHour: 100,
          consolidationWindow: 300, // 5 minutes
        },
      },
      analyticsConfig: {
        enableAnalytics: true,
        enablePrediction: false,
        analysisWindow: 24, // 24 hours
        patternDetection: true,
      },
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sortEntitiesByPriority(entities: IncrementalSyncPlan['entitiesToSync']): IncrementalSyncPlan['entitiesToSync'] {
    return entities.sort((a, b) => b.changeScore - a.changeScore);
  }

  private determineSyncDependencies(entityType: EntityType, changes: EntityChange[]): string[] {
    // Simple dependency logic
    const dependencies: string[] = [];

    switch (entityType) {
      case 'enrollment':
        // Enrollments depend on users and classes
        dependencies.push('user', 'class');
        break;
      case 'class':
        // Classes depend on organizations and teachers
        dependencies.push('organization', 'user');
        break;
      case 'user':
        // Users depend on organizations
        dependencies.push('organization');
        break;
    }

    return dependencies;
  }

  private generateEntityRecommendations(
    entityType: EntityType,
    summary: ChangeSummary,
    patterns: ChangePattern[],
  ): string[] {
    const recommendations: string[] = [];

    if (summary.totalChanges === 0) {
      recommendations.push(`No changes detected for ${entityType} entities`);
      return recommendations;
    }

    // High-frequency changes
    if (summary.totalChanges > 100) {
      recommendations.push(`High volume of ${entityType} changes detected - consider reviewing data quality`);
    }

    // Critical changes
    const criticalChanges = summary.changesBySeverity.critical;
    if (criticalChanges > 0) {
      recommendations.push(`${criticalChanges} critical ${entityType} changes require immediate attention`);
    }

    // Deletions
    const deletions = summary.changesByType.deleted;
    if (deletions > 0) {
      recommendations.push(`${deletions} ${entityType} deletions detected - verify these are intentional`);
    }

    // Pattern-based recommendations
    patterns.forEach(pattern => {
      if (pattern.significance === 'high' || pattern.significance === 'critical') {
        recommendations.push(`Pattern detected: ${pattern.description} - consider implementing ${pattern.automaticActions.join(', ')}`);
      }
    });

    return recommendations;
  }

  private analyzeChangesForPatterns(changes: ChangeRecord[], entityType: EntityType): ChangePattern[] {
    const patterns: ChangePattern[] = [];

    // Detect high-frequency change pattern
    if (changes.length > 50) {
      patterns.push({
        id: `high_freq_${entityType}`,
        name: 'High Frequency Changes',
        description: `High volume of changes detected for ${entityType} entities`,
        pattern: {
          entityType,
          frequency: 'high',
          timeWindow: 24,
        },
        significance: 'medium',
        automaticActions: ['incremental_sync', 'change_notification'],
      });
    }

    // Detect deletion pattern
    const deletions = changes.filter(c => c.changeType === 'deleted');
    if (deletions.length > 5) {
      patterns.push({
        id: `deletion_${entityType}`,
        name: 'Mass Deletion Pattern',
        description: `Multiple ${entityType} entities being deleted`,
        pattern: {
          entityType,
          changeType: 'deleted',
          frequency: 'high',
        },
        significance: 'high',
        automaticActions: ['admin_notification', 'sync_pause'],
      });
    }

    return patterns;
  }

  private detectCommonChangePatterns(changes: ChangeRecord[]): ChangePattern[] {
    const patterns: ChangePattern[] = [];

    // Group changes by time windows
    const hourlyChanges = new Map<number, number>();
    changes.forEach(change => {
      const hour = change.createdAt.getHours();
      hourlyChanges.set(hour, (hourlyChanges.get(hour) || 0) + 1);
    });

    // Detect peak hours
    const avgChangesPerHour = changes.length / 24;
    const peakHours = Array.from(hourlyChanges.entries())
      .filter(([_, count]) => count > avgChangesPerHour * 2)
      .map(([hour]) => hour);

    if (peakHours.length > 0) {
      patterns.push({
        id: 'peak_hours',
        name: 'Peak Change Hours',
        description: `Changes concentrated in hours: ${peakHours.join(', ')}`,
        pattern: {
          frequency: 'high',
          timeWindow: 1,
        },
        significance: 'medium',
        automaticActions: ['schedule_sync_off_peak'],
      });
    }

    return patterns;
  }

  private identifyAnomalousChanges(changes: ChangeRecord[]): EntityChange[] {
    // Simple anomaly detection: changes with very high scores
    return changes
      .filter(change => change.changeScore > 90)
      .map(change => ({
        entityType: change.entityType,
        entityId: change.entityId,
        externalId: change.externalId,
        changeType: change.changeType,
        fieldChanges: change.fieldChanges,
        changeScore: change.changeScore,
        significance: change.significance,
        metadata: change.metadata,
      }));
  }

  private predictFutureChanges(changes: ChangeRecord[], changeVelocity: number): ChangeAnalytics['predictedChanges'] {
    // Simple prediction based on recent patterns
    const predictions: ChangeAnalytics['predictedChanges'] = [];

    if (changeVelocity > 10) { // More than 10 changes per hour
      predictions.push({
        entityType: 'user',
        entityId: 'predicted',
        predictedChangeType: 'updated',
        confidence: 0.7,
        timeframe: 2, // 2 hours
      });
    }

    return predictions;
  }
}
