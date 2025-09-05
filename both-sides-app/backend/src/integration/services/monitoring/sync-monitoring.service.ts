/**
 * Sync Monitoring Service
 * 
 * Core service for tracking sync operations, performance metrics,
 * and real-time status monitoring across all integration operations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter } from 'events';
import {
  SyncSession,
  SyncStatus,
  SyncType,
  SyncError,
  SyncWarning,
  PerformanceIssue,
  PerformanceMetrics,
  MonitoringQuery,
  MonitoringAnalytics,
  RealtimeUpdate,
  TimeSeriesData,
} from './sync-monitoring.interfaces';
import { EntityType, SyncContext } from '../synchronizers/base-synchronizer.service';

// ===================================================================
// MONITORING CONFIGURATION
// ===================================================================

interface SyncMonitoringConfig {
  retentionPeriod: number;             // days
  metricsInterval: number;             // seconds
  performanceThresholds: {
    slowSync: number;                  // minutes
    highErrorRate: number;             // 0-1
    lowThroughput: number;             // entities per second
    highLatency: number;               // milliseconds
  };
  realTimeUpdates: boolean;
  batchSize: number;
}

// ===================================================================
// SYNC MONITORING SERVICE
// ===================================================================

@Injectable()
export class SyncMonitoringService extends EventEmitter {
  private readonly logger = new Logger(SyncMonitoringService.name);
  private readonly config: SyncMonitoringConfig;
  private readonly activeSessions = new Map<string, SyncSession>();
  private readonly performanceBuffer = new Map<string, PerformanceMetrics[]>();
  private readonly realtimeSubscribers = new Set<(update: RealtimeUpdate) => void>();

  constructor(
    private readonly prisma: PrismaService,
  ) {
    super();
    this.config = this.getDefaultConfig();
    this.startPerformanceCollection();
    this.logger.log('SyncMonitoringService initialized');
  }

  // ===================================================================
  // SYNC SESSION TRACKING
  // ===================================================================

  /**
   * Create a new sync session for monitoring
   */
  async createSyncSession(
    integrationId: string,
    providerId: string,
    syncType: SyncType,
    entityTypes: EntityType[],
    syncContext: SyncContext,
    config: Partial<SyncSession['config']> = {},
  ): Promise<SyncSession> {
    const sessionId = this.generateSessionId();
    
    const session: SyncSession = {
      id: sessionId,
      integrationId,
      providerId,
      syncType,
      status: 'starting',
      entityTypes,
      
      startTime: new Date(),
      lastHeartbeat: new Date(),
      
      progress: {
        currentStage: 'initializing',
        stagesCompleted: 0,
        totalStages: this.calculateTotalStages(entityTypes),
        percentComplete: 0,
        entitiesProcessed: 0,
        totalEntities: undefined,
        currentEntityType: undefined,
      },
      
      performance: {
        averageProcessingRate: 0,
        peakProcessingRate: 0,
        apiCallsCount: 0,
        apiResponseTime: 0,
        dataTransferred: 0,
        cacheHitRate: 0,
      },
      
      issues: {
        errors: [],
        warnings: [],
        performanceIssues: [],
      },
      
      config: {
        batchSize: 50,
        timeout: 300000, // 5 minutes
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
        },
        conflictResolution: {
          strategy: 'external_wins',
          autoResolve: true,
        },
        ...config,
      },
      
      metadata: {
        triggeredBy: this.determineTriggerSource(syncContext),
        triggerSource: syncContext.correlationId,
        tags: [],
        priority: 'medium',
      },
      
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in active sessions
    this.activeSessions.set(sessionId, session);

    // Persist to database
    await this.persistSyncSession(session);

    this.logger.log(`Created sync session: ${sessionId}`, {
      integrationId,
      syncType,
      entityTypes,
    });

    // Emit session created event
    this.emitRealtimeUpdate('sync_status', integrationId, {
      action: 'session_created',
      session,
    });

    return session;
  }

  /**
   * Update sync session progress and status
   */
  async updateSyncSession(
    sessionId: string,
    updates: Partial<Pick<SyncSession, 'status' | 'progress' | 'performance' | 'results'>>,
  ): Promise<SyncSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Sync session not found: ${sessionId}`);
    }

    // Update session data
    Object.assign(session, updates, {
      updatedAt: new Date(),
      lastHeartbeat: new Date(),
    });

    // Update progress calculation
    if (updates.progress) {
      session.progress.percentComplete = Math.round(
        (session.progress.stagesCompleted / session.progress.totalStages) * 100
      );
    }

    // Update duration if completed
    if (updates.status && ['completed', 'failed', 'cancelled', 'timeout'].includes(updates.status)) {
      session.endTime = new Date();
      session.duration = session.endTime.getTime() - session.startTime.getTime();
      
      // Move from active to completed
      this.activeSessions.delete(sessionId);
    }

    // Persist updates
    await this.persistSyncSession(session);

    this.logger.debug(`Updated sync session: ${sessionId}`, {
      status: session.status,
      progress: session.progress.percentComplete,
    });

    // Emit real-time update
    this.emitRealtimeUpdate('sync_status', session.integrationId, {
      action: 'session_updated',
      session,
    });

    return session;
  }

  /**
   * Add error to sync session
   */
  async addSyncError(
    sessionId: string,
    error: Omit<SyncError, 'id' | 'sessionId' | 'timestamp' | 'resolved'>,
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Attempted to add error to non-existent session: ${sessionId}`);
      return;
    }

    const syncError: SyncError = {
      id: this.generateErrorId(),
      sessionId,
      timestamp: new Date(),
      resolved: false,
      ...error,
    };

    session.issues.errors.push(syncError);
    session.updatedAt = new Date();

    // Update session results
    if (!session.results) {
      session.results = {
        entitiesCreated: 0,
        entitiesUpdated: 0,
        entitiesDeleted: 0,
        entitiesSkipped: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        errorsEncountered: 0,
        warningsGenerated: 0,
      };
    }
    session.results.errorsEncountered++;

    await this.persistSyncSession(session);

    this.logger.warn(`Sync error added to session: ${sessionId}`, {
      errorCode: syncError.errorCode,
      severity: syncError.severity,
      category: syncError.category,
    });

    // Emit error event
    this.emitRealtimeUpdate('sync_status', session.integrationId, {
      action: 'error_added',
      session,
      error: syncError,
    });

    // Check if we should trigger alerts
    await this.checkErrorThresholds(session);
  }

  /**
   * Add warning to sync session
   */
  async addSyncWarning(
    sessionId: string,
    warning: Omit<SyncWarning, 'id' | 'sessionId' | 'timestamp' | 'acknowledged'>,
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    const syncWarning: SyncWarning = {
      id: this.generateWarningId(),
      sessionId,
      timestamp: new Date(),
      acknowledged: false,
      ...warning,
    };

    session.issues.warnings.push(syncWarning);
    session.updatedAt = new Date();

    if (session.results) {
      session.results.warningsGenerated++;
    }

    await this.persistSyncSession(session);

    this.logger.debug(`Sync warning added to session: ${sessionId}`, {
      category: syncWarning.category,
      impact: syncWarning.impact,
    });
  }

  /**
   * Add performance issue to sync session
   */
  async addPerformanceIssue(
    sessionId: string,
    issue: Omit<PerformanceIssue, 'id' | 'sessionId' | 'timestamp'>,
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    const performanceIssue: PerformanceIssue = {
      id: this.generateIssueId(),
      sessionId,
      timestamp: new Date(),
      ...issue,
    };

    session.issues.performanceIssues.push(performanceIssue);
    session.updatedAt = new Date();

    await this.persistSyncSession(session);

    this.logger.debug(`Performance issue added to session: ${sessionId}`, {
      issueType: performanceIssue.issueType,
      severity: performanceIssue.severity,
    });

    // Emit performance alert if critical
    if (performanceIssue.severity === 'error') {
      this.emitRealtimeUpdate('performance', session.integrationId, {
        action: 'performance_issue',
        session,
        issue: performanceIssue,
      });
    }
  }

  // ===================================================================
  // PERFORMANCE METRICS COLLECTION
  // ===================================================================

  /**
   * Record performance metrics for an integration
   */
  async recordPerformanceMetrics(
    integrationId: string,
    providerId: string,
    metrics: Omit<PerformanceMetrics, 'integrationId' | 'providerId' | 'timestamp' | 'interval'>,
  ): Promise<void> {
    const performanceMetrics: PerformanceMetrics = {
      integrationId,
      providerId,
      timestamp: new Date(),
      interval: 'minute',
      ...metrics,
    };

    // Buffer metrics for batch processing
    const key = `${integrationId}:${providerId}`;
    if (!this.performanceBuffer.has(key)) {
      this.performanceBuffer.set(key, []);
    }
    
    const buffer = this.performanceBuffer.get(key)!;
    buffer.push(performanceMetrics);

    // Process buffer if it's getting large
    if (buffer.length >= 10) {
      await this.flushPerformanceMetrics(key, buffer);
      this.performanceBuffer.set(key, []);
    }

    // Emit real-time performance update
    this.emitRealtimeUpdate('performance', integrationId, {
      action: 'metrics_updated',
      metrics: performanceMetrics,
    });
  }

  /**
   * Get current sync sessions
   */
  getCurrentSyncSessions(integrationId?: string): SyncSession[] {
    const sessions = Array.from(this.activeSessions.values());
    
    if (integrationId) {
      return sessions.filter(s => s.integrationId === integrationId);
    }
    
    return sessions;
  }

  /**
   * Get sync session by ID
   */
  getSyncSession(sessionId: string): SyncSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  // ===================================================================
  // ANALYTICS AND QUERYING
  // ===================================================================

  /**
   * Query sync sessions with filtering and aggregation
   */
  async querySyncSessions(query: MonitoringQuery): Promise<{
    sessions: SyncSession[];
    totalCount: number;
    analytics: MonitoringAnalytics;
  }> {
    const startTime = Date.now();
    
    this.logger.debug('Executing sync session query', {
      integrationId: query.integrationId,
      timeRange: query.timeRange,
      entityTypes: query.entityTypes,
    });

    try {
      // Build database query
      const where: any = {
        occurred_at: {
          gte: query.timeRange.startDate,
          lte: query.timeRange.endDate,
        },
      };

      if (query.integrationId) {
        where.integration_id = query.integrationId;
      }

      // Query from audit logs (since we store sync sessions there)
      const [records, totalCount] = await Promise.all([
        this.prisma.integrationAuditLog.findMany({
          where: {
            ...where,
            event_type: 'sync_session',
          },
          orderBy: { occurred_at: 'desc' },
          skip: query.offset || 0,
          take: Math.min(query.limit || 100, 1000),
          select: {
            id: true,
            integration_id: true,
            details: true,
            occurred_at: true,
            duration_ms: true,
          },
        }),
        this.prisma.integrationAuditLog.count({
          where: {
            ...where,
            event_type: 'sync_session',
          },
        }),
      ]);

      // Transform records to sync sessions
      const sessions: SyncSession[] = records.map(record => this.transformRecordToSession(record));

      // Generate analytics
      const analytics = await this.generateAnalytics(query, sessions);

      const executionTime = Date.now() - startTime;
      
      this.logger.debug(`Sync session query completed in ${executionTime}ms`, {
        sessionCount: sessions.length,
        totalCount,
      });

      return {
        sessions,
        totalCount,
        analytics,
      };

    } catch (error) {
      this.logger.error(`Sync session query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get time series data for metrics
   */
  async getTimeSeriesMetrics(
    integrationId: string,
    metric: string,
    startDate: Date,
    endDate: Date,
    interval: 'minute' | 'hour' | 'day' = 'hour',
  ): Promise<TimeSeriesData[]> {
    // This would query the performance metrics stored in the database
    // For now, generate sample data
    const dataPoints: TimeSeriesData[] = [];
    const current = new Date(startDate);
    const intervalMs = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    }[interval];

    while (current <= endDate) {
      dataPoints.push({
        timestamp: new Date(current),
        value: Math.random() * 100, // Sample data
        label: metric,
      });
      
      current.setTime(current.getTime() + intervalMs);
    }

    return dataPoints;
  }

  // ===================================================================
  // REAL-TIME UPDATES
  // ===================================================================

  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(callback: (update: RealtimeUpdate) => void): () => void {
    this.realtimeSubscribers.add(callback);
    
    return () => {
      this.realtimeSubscribers.delete(callback);
    };
  }

  /**
   * Emit real-time update to all subscribers
   */
  private emitRealtimeUpdate(
    type: RealtimeUpdate['type'],
    integrationId: string,
    data: any,
  ): void {
    if (!this.config.realTimeUpdates) {
      return;
    }

    const update: RealtimeUpdate = {
      type,
      integrationId,
      timestamp: new Date(),
      data,
      metadata: {
        source: 'sync-monitoring-service',
        version: 1,
      },
    };

    // Emit to event listeners
    this.emit('realtime:update', update);

    // Notify subscribers
    this.realtimeSubscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        this.logger.error(`Real-time update callback failed: ${error.message}`);
      }
    });
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private async persistSyncSession(session: SyncSession): Promise<void> {
    try {
      await this.prisma.integrationAuditLog.upsert({
        where: {
          id: session.id,
        },
        create: {
          id: session.id,
          integration_id: session.integrationId,
          event_type: 'sync_session',
          event_category: 'sync_monitoring',
          severity: this.getSessionSeverity(session),
          description: `${session.syncType} sync session for ${session.entityTypes.join(', ')}`,
          details: session,
          entity_type: session.entityTypes[0] || 'mixed',
          correlation_id: session.metadata.triggerSource,
          duration_ms: session.duration || 0,
          occurred_at: session.startTime,
        },
        update: {
          severity: this.getSessionSeverity(session),
          details: session,
          duration_ms: session.duration || 0,
          updated_at: session.updatedAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist sync session: ${error.message}`, error.stack);
    }
  }

  private async flushPerformanceMetrics(key: string, metrics: PerformanceMetrics[]): Promise<void> {
    try {
      // In a real implementation, would store performance metrics in a time-series database
      // For now, store summarized metrics in audit log
      const summary = this.summarizePerformanceMetrics(metrics);
      
      await this.prisma.integrationAuditLog.create({
        data: {
          integration_id: metrics[0].integrationId,
          event_type: 'performance_metrics',
          event_category: 'monitoring',
          severity: 'info',
          description: `Performance metrics batch: ${metrics.length} data points`,
          details: summary,
          occurred_at: new Date(),
        },
      });

    } catch (error) {
      this.logger.error(`Failed to flush performance metrics: ${error.message}`);
    }
  }

  private summarizePerformanceMetrics(metrics: PerformanceMetrics[]): any {
    if (metrics.length === 0) return {};

    const summary = {
      count: metrics.length,
      timeRange: {
        start: metrics[0].timestamp,
        end: metrics[metrics.length - 1].timestamp,
      },
      throughput: {
        avgSyncsPerHour: metrics.reduce((sum, m) => sum + m.throughput.syncsPerHour, 0) / metrics.length,
        avgEntitiesPerSecond: metrics.reduce((sum, m) => sum + m.throughput.entitiesPerSecond, 0) / metrics.length,
      },
      latency: {
        avgSyncDuration: metrics.reduce((sum, m) => sum + m.latency.syncDuration.avg, 0) / metrics.length,
        avgApiResponseTime: metrics.reduce((sum, m) => sum + m.latency.apiResponseTime.avg, 0) / metrics.length,
      },
      quality: {
        avgErrorRate: metrics.reduce((sum, m) => sum + m.quality.errorRate, 0) / metrics.length,
        avgConflictRate: metrics.reduce((sum, m) => sum + m.quality.conflictRate, 0) / metrics.length,
      },
    };

    return summary;
  }

  private async generateAnalytics(query: MonitoringQuery, sessions: SyncSession[]): Promise<MonitoringAnalytics> {
    const totalSyncs = sessions.length;
    const completedSyncs = sessions.filter(s => s.status === 'completed');
    const failedSyncs = sessions.filter(s => s.status === 'failed');
    
    const totalDuration = sessions
      .filter(s => s.duration)
      .reduce((sum, s) => sum + (s.duration || 0), 0);
    
    const avgDuration = totalDuration / Math.max(completedSyncs.length, 1);
    
    const successRate = totalSyncs > 0 ? completedSyncs.length / totalSyncs : 0;
    const errorRate = totalSyncs > 0 ? failedSyncs.length / totalSyncs : 0;
    
    const conflictRate = sessions
      .filter(s => s.results?.conflictsDetected)
      .reduce((sum, s) => sum + (s.results?.conflictsDetected || 0), 0) / Math.max(totalSyncs, 1);

    const analytics: MonitoringAnalytics = {
      query,
      aggregations: {
        totalSyncs,
        uniqueIntegrations: new Set(sessions.map(s => s.integrationId)).size,
        totalDuration,
        avgDuration,
        successRate,
        errorRate,
        conflictRate,
      },
      timeSeries: {
        // Would generate actual time series data from sessions
      },
      breakdowns: {
        byEntityType: this.generateEntityTypeBreakdown(sessions),
        byProvider: this.generateProviderBreakdown(sessions),
        byStatus: this.generateStatusBreakdown(sessions),
        byHour: this.generateHourlyBreakdown(sessions),
      },
      insights: {
        trends: [],
        anomalies: [],
        recommendations: this.generateRecommendations(sessions),
      },
      metadata: {
        executionTime: 0,
        dataPoints: totalSyncs,
        cacheHit: false,
        generatedAt: new Date(),
      },
    };

    return analytics;
  }

  private generateEntityTypeBreakdown(sessions: SyncSession[]): Record<EntityType, any> {
    const breakdown: Record<EntityType, any> = {
      user: { count: 0, avgDuration: 0, successRate: 0 },
      class: { count: 0, avgDuration: 0, successRate: 0 },
      organization: { count: 0, avgDuration: 0, successRate: 0 },
      enrollment: { count: 0, avgDuration: 0, successRate: 0 },
    };

    sessions.forEach(session => {
      session.entityTypes.forEach(entityType => {
        breakdown[entityType].count++;
        if (session.duration) {
          breakdown[entityType].avgDuration += session.duration;
        }
        if (session.status === 'completed') {
          breakdown[entityType].successRate++;
        }
      });
    });

    // Calculate averages
    Object.keys(breakdown).forEach(entityType => {
      const data = breakdown[entityType as EntityType];
      if (data.count > 0) {
        data.avgDuration = data.avgDuration / data.count;
        data.successRate = data.successRate / data.count;
      }
    });

    return breakdown;
  }

  private generateProviderBreakdown(sessions: SyncSession[]): Record<string, any> {
    const breakdown: Record<string, any> = {};

    sessions.forEach(session => {
      if (!breakdown[session.providerId]) {
        breakdown[session.providerId] = {
          count: 0,
          avgDuration: 0,
          successRate: 0,
          errorCount: 0,
        };
      }

      const provider = breakdown[session.providerId];
      provider.count++;
      
      if (session.duration) {
        provider.avgDuration += session.duration;
      }
      
      if (session.status === 'completed') {
        provider.successRate++;
      }
      
      provider.errorCount += session.issues.errors.length;
    });

    // Calculate averages
    Object.keys(breakdown).forEach(providerId => {
      const data = breakdown[providerId];
      if (data.count > 0) {
        data.avgDuration = data.avgDuration / data.count;
        data.successRate = data.successRate / data.count;
      }
    });

    return breakdown;
  }

  private generateStatusBreakdown(sessions: SyncSession[]): Record<SyncStatus, any> {
    const breakdown: Record<SyncStatus, any> = {};
    
    sessions.forEach(session => {
      if (!breakdown[session.status]) {
        breakdown[session.status] = 0;
      }
      breakdown[session.status]++;
    });

    return breakdown;
  }

  private generateHourlyBreakdown(sessions: SyncSession[]): Record<number, any> {
    const breakdown: Record<number, any> = {};

    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      if (!breakdown[hour]) {
        breakdown[hour] = {
          count: 0,
          avgDuration: 0,
          successCount: 0,
        };
      }

      breakdown[hour].count++;
      if (session.duration) {
        breakdown[hour].avgDuration += session.duration;
      }
      if (session.status === 'completed') {
        breakdown[hour].successCount++;
      }
    });

    // Calculate averages
    Object.keys(breakdown).forEach(hour => {
      const data = breakdown[parseInt(hour)];
      if (data.count > 0) {
        data.avgDuration = data.avgDuration / data.count;
        data.successRate = data.successCount / data.count;
      }
    });

    return breakdown;
  }

  private generateRecommendations(sessions: SyncSession[]): string[] {
    const recommendations: string[] = [];
    
    const failureRate = sessions.filter(s => s.status === 'failed').length / Math.max(sessions.length, 1);
    if (failureRate > 0.1) {
      recommendations.push(`High failure rate (${(failureRate * 100).toFixed(1)}%) - investigate error patterns`);
    }

    const avgDuration = sessions
      .filter(s => s.duration)
      .reduce((sum, s) => sum + (s.duration || 0), 0) / Math.max(sessions.length, 1);
    
    if (avgDuration > 5 * 60 * 1000) { // 5 minutes
      recommendations.push(`Average sync duration is high (${Math.round(avgDuration / 60000)} minutes) - consider optimization`);
    }

    const highErrorSessions = sessions.filter(s => s.issues.errors.length > 5);
    if (highErrorSessions.length > 0) {
      recommendations.push(`${highErrorSessions.length} sessions have high error counts - review error handling`);
    }

    return recommendations;
  }

  private async checkErrorThresholds(session: SyncSession): Promise<void> {
    const errorCount = session.issues.errors.length;
    const criticalErrors = session.issues.errors.filter(e => e.severity === 'critical').length;
    
    if (criticalErrors > 0) {
      this.emitRealtimeUpdate('alert', session.integrationId, {
        action: 'critical_error',
        session,
        errorCount: criticalErrors,
      });
    } else if (errorCount > 10) {
      this.emitRealtimeUpdate('alert', session.integrationId, {
        action: 'high_error_count',
        session,
        errorCount,
      });
    }
  }

  private transformRecordToSession(record: any): SyncSession {
    return record.details as SyncSession || {
      id: record.id,
      integrationId: record.integration_id,
      providerId: 'unknown',
      syncType: 'manual',
      status: 'completed',
      entityTypes: [],
      startTime: record.occurred_at,
      lastHeartbeat: record.occurred_at,
      progress: {
        currentStage: 'completed',
        stagesCompleted: 1,
        totalStages: 1,
        percentComplete: 100,
        entitiesProcessed: 0,
      },
      performance: {
        averageProcessingRate: 0,
        peakProcessingRate: 0,
        apiCallsCount: 0,
        apiResponseTime: 0,
        dataTransferred: 0,
        cacheHitRate: 0,
      },
      issues: {
        errors: [],
        warnings: [],
        performanceIssues: [],
      },
      config: {
        batchSize: 50,
        timeout: 300000,
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2 },
        conflictResolution: { strategy: 'external_wins', autoResolve: true },
      },
      metadata: {
        triggeredBy: 'system',
        tags: [],
        priority: 'medium',
      },
      createdAt: record.occurred_at,
      updatedAt: record.occurred_at,
    };
  }

  private calculateTotalStages(entityTypes: EntityType[]): number {
    // Each entity type has: validate -> fetch -> compare -> resolve -> update
    return entityTypes.length * 5;
  }

  private determineTriggerSource(syncContext: SyncContext): 'user' | 'schedule' | 'webhook' | 'system' {
    if (syncContext.userId) return 'user';
    if (syncContext.correlationId?.includes('webhook')) return 'webhook';
    if (syncContext.correlationId?.includes('schedule')) return 'schedule';
    return 'system';
  }

  private getSessionSeverity(session: SyncSession): string {
    if (session.status === 'failed' || session.issues.errors.some(e => e.severity === 'critical')) {
      return 'error';
    }
    if (session.issues.warnings.length > 0 || session.issues.errors.length > 0) {
      return 'warning';
    }
    return 'info';
  }

  private startPerformanceCollection(): void {
    // Flush performance metrics buffer every minute
    setInterval(async () => {
      for (const [key, metrics] of this.performanceBuffer.entries()) {
        if (metrics.length > 0) {
          await this.flushPerformanceMetrics(key, metrics);
          this.performanceBuffer.set(key, []);
        }
      }
    }, 60 * 1000);
  }

  private generateSessionId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWarningId(): string {
    return `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIssueId(): string {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultConfig(): SyncMonitoringConfig {
    return {
      retentionPeriod: 30, // days
      metricsInterval: 60, // seconds
      performanceThresholds: {
        slowSync: 10, // minutes
        highErrorRate: 0.1, // 10%
        lowThroughput: 0.5, // entities per second
        highLatency: 5000, // 5 seconds
      },
      realTimeUpdates: true,
      batchSize: 100,
    };
  }
}
