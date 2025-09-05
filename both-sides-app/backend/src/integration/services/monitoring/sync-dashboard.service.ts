/**
 * Sync Dashboard Service
 * 
 * Service for generating real-time dashboard data, aggregating metrics,
 * and providing comprehensive integration health and performance insights.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { SyncMonitoringService } from './sync-monitoring.service';
import {
  SyncDashboardData,
  IntegrationHealth,
  TimeSeriesData,
  SyncSession,
  SyncStatus,
  MonitoringQuery,
} from './sync-monitoring.interfaces';
import { EntityType } from '../synchronizers/base-synchronizer.service';
import { EventEmitter } from 'events';

// ===================================================================
// DASHBOARD CONFIGURATION
// ===================================================================

interface DashboardConfig {
  refreshInterval: number;             // seconds
  dataRetentionHours: number;
  maxTimeSeriesPoints: number;
  enableRealTimeUpdates: boolean;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
}

interface CachedDashboardData {
  data: SyncDashboardData;
  cachedAt: Date;
  ttl: number;
}

// ===================================================================
// SYNC DASHBOARD SERVICE
// ===================================================================

@Injectable()
export class SyncDashboardService extends EventEmitter {
  private readonly logger = new Logger(SyncDashboardService.name);
  private readonly config: DashboardConfig;
  private readonly dashboardCache = new Map<string, CachedDashboardData>();
  private readonly healthCache = new Map<string, IntegrationHealth>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncMonitoring: SyncMonitoringService,
  ) {
    super();
    this.config = this.getDefaultConfig();
    this.startDashboardRefresh();
    this.setupEventListeners();
    this.logger.log('SyncDashboardService initialized');
  }

  // ===================================================================
  // DASHBOARD DATA GENERATION
  // ===================================================================

  /**
   * Get comprehensive dashboard data for an integration
   */
  async getDashboardData(integrationId: string): Promise<SyncDashboardData> {
    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.dashboardCache.get(integrationId);
      if (cached && this.isCacheValid(cached)) {
        this.logger.debug(`Returning cached dashboard data for: ${integrationId}`);
        return cached.data;
      }
    }

    const startTime = Date.now();
    
    this.logger.debug(`Generating dashboard data for: ${integrationId}`);

    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Generate all dashboard sections in parallel
      const [
        overview,
        realTimeStatus,
        trends,
        entityMetrics,
        recentActivities,
        healthIndicators,
      ] = await Promise.all([
        this.generateOverviewMetrics(integrationId, today, now),
        this.generateRealTimeStatus(integrationId),
        this.generateTrends(integrationId, lastWeek, now),
        this.generateEntityMetrics(integrationId, last24Hours, now),
        this.generateRecentActivities(integrationId, last24Hours, now),
        this.generateHealthIndicators(integrationId),
      ]);

      const dashboardData: SyncDashboardData = {
        integrationId,
        timestamp: now,
        overview,
        realTimeStatus,
        trends,
        entityMetrics,
        recentActivities,
        healthIndicators,
      };

      // Cache the result
      if (this.config.cacheEnabled) {
        this.dashboardCache.set(integrationId, {
          data: dashboardData,
          cachedAt: now,
          ttl: this.config.cacheTtlSeconds * 1000,
        });
      }

      const executionTime = Date.now() - startTime;
      this.logger.debug(`Dashboard data generated in ${executionTime}ms for: ${integrationId}`);

      // Emit dashboard updated event
      this.emit('dashboard:updated', {
        integrationId,
        data: dashboardData,
        executionTime,
      });

      return dashboardData;

    } catch (error) {
      this.logger.error(`Failed to generate dashboard data: ${error.message}`, error.stack, {
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Get integration health status
   */
  async getIntegrationHealth(integrationId: string, providerId: string): Promise<IntegrationHealth> {
    const cacheKey = `${integrationId}:${providerId}`;
    
    // Check cache
    const cached = this.healthCache.get(cacheKey);
    if (cached && (Date.now() - cached.lastCheckTime.getTime()) < 60 * 1000) {
      return cached;
    }

    this.logger.debug(`Checking integration health: ${integrationId}:${providerId}`);

    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Query sync sessions to calculate health metrics
      const query: MonitoringQuery = {
        integrationId,
        providerId,
        timeRange: { startDate: last30Days, endDate: now },
        limit: 1000,
      };

      const { sessions } = await this.syncMonitoring.querySyncSessions(query);

      // Calculate uptime and performance metrics
      const health = await this.calculateIntegrationHealth(
        integrationId,
        providerId,
        sessions,
        { now, last24Hours, last7Days, last30Days }
      );

      // Cache the result
      this.healthCache.set(cacheKey, health);

      return health;

    } catch (error) {
      this.logger.error(`Failed to get integration health: ${error.message}`, error.stack);
      
      // Return degraded health status on error
      return {
        integrationId,
        providerId,
        status: 'unhealthy',
        lastCheckTime: new Date(),
        uptime: {
          current: 0,
          percentage24h: 0,
          percentage7d: 0,
          percentage30d: 0,
        },
        metrics: {
          responseTime: { current: 0, average24h: 0, p95_24h: 0, p99_24h: 0 },
          errorRate: { current: 1, average24h: 1, spike: true },
          throughput: { current: 0, average24h: 0, peak24h: 0 },
          resources: { cpuUsage: 0, memoryUsage: 0, connectionPool: 0, queueDepth: 0 },
        },
        connectivity: {
          apiEndpoint: { status: 'offline', responseTime: 0, lastCheck: new Date(), errorCount24h: 0 },
          authentication: { status: 'unknown', lastRefresh: new Date(), failureCount24h: 0 },
          database: { status: 'disconnected', connectionCount: 0, avgQueryTime: 0, slowQueryCount24h: 0 },
        },
        trends: {
          direction: 'degrading',
          confidence: 0.9,
          timeframe: '24h',
          indicators: {
            responseTime: 'degrading',
            errorRate: 'degrading',
            throughput: 'degrading',
          },
        },
        incidents: {
          count24h: 1,
          count7d: 1,
          lastIncident: {
            timestamp: new Date(),
            type: 'integration_down',
            severity: 'critical',
            resolved: false,
          },
        },
      };
    }
  }

  /**
   * Get time series data for specific metrics
   */
  async getTimeSeriesData(
    integrationId: string,
    metric: string,
    startDate: Date,
    endDate: Date,
    interval: 'minute' | 'hour' | 'day' = 'hour',
  ): Promise<TimeSeriesData[]> {
    this.logger.debug(`Getting time series data: ${metric}`, {
      integrationId,
      interval,
      timeRange: { startDate, endDate },
    });

    try {
      return await this.syncMonitoring.getTimeSeriesMetrics(
        integrationId,
        metric,
        startDate,
        endDate,
        interval,
      );
    } catch (error) {
      this.logger.error(`Failed to get time series data: ${error.message}`, error.stack);
      return [];
    }
  }

  // ===================================================================
  // DASHBOARD SECTIONS GENERATION
  // ===================================================================

  private async generateOverviewMetrics(
    integrationId: string,
    startOfDay: Date,
    now: Date,
  ): Promise<SyncDashboardData['overview']> {
    const currentSyncs = this.syncMonitoring.getCurrentSyncSessions(integrationId);
    
    // Query today's completed syncs
    const todayQuery: MonitoringQuery = {
      integrationId,
      timeRange: { startDate: startOfDay, endDate: now },
      statuses: ['completed'],
      limit: 1000,
    };

    const failedQuery: MonitoringQuery = {
      integrationId,
      timeRange: { startDate: startOfDay, endDate: now },
      statuses: ['failed'],
      limit: 1000,
    };

    const [completedResult, failedResult] = await Promise.all([
      this.syncMonitoring.querySyncSessions(todayQuery),
      this.syncMonitoring.querySyncSessions(failedQuery),
    ]);

    const completedSessions = completedResult.sessions;
    const failedSessions = failedResult.sessions;

    // Calculate metrics
    const avgSyncDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length / (1000 * 60)
      : 0;

    const dataProcessedToday = completedSessions.reduce((sum, s) => sum + s.performance.dataTransferred, 0) / (1024 * 1024);

    // Calculate uptime (simplified)
    const totalSessions = completedSessions.length + failedSessions.length;
    const uptime24h = totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 100;

    return {
      activeSyncs: currentSyncs.length,
      completedToday: completedSessions.length,
      failedToday: failedSessions.length,
      avgSyncDuration,
      dataProcessedToday,
      uptime24h,
    };
  }

  private async generateRealTimeStatus(integrationId: string): Promise<SyncDashboardData['realTimeStatus']> {
    const currentSyncs = this.syncMonitoring.getCurrentSyncSessions(integrationId);
    
    // Get queued syncs count (simplified)
    const queuedSyncs = 0; // Would query actual queue

    // System load (simplified)
    const systemLoad = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      connections: Math.random() * 100,
    };

    // API status (simplified)
    const apiStatus: Record<string, 'online' | 'offline' | 'degraded'> = {
      'timeback': 'online',
      'mock-provider': 'online',
    };

    return {
      currentSyncs,
      queuedSyncs,
      systemLoad,
      apiStatus,
    };
  }

  private async generateTrends(
    integrationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SyncDashboardData['trends']> {
    const [
      syncVelocity,
      successRate,
      avgDuration,
      errorRate,
      dataVolume,
    ] = await Promise.all([
      this.getTimeSeriesData(integrationId, 'sync_velocity', startDate, endDate, 'hour'),
      this.getTimeSeriesData(integrationId, 'success_rate', startDate, endDate, 'hour'),
      this.getTimeSeriesData(integrationId, 'avg_duration', startDate, endDate, 'hour'),
      this.getTimeSeriesData(integrationId, 'error_rate', startDate, endDate, 'hour'),
      this.getTimeSeriesData(integrationId, 'data_volume', startDate, endDate, 'hour'),
    ]);

    return {
      syncVelocity,
      successRate,
      avgDuration,
      errorRate,
      dataVolume,
    };
  }

  private async generateEntityMetrics(
    integrationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SyncDashboardData['entityMetrics']> {
    const query: MonitoringQuery = {
      integrationId,
      timeRange: { startDate, endDate },
      limit: 1000,
    };

    const { sessions } = await this.syncMonitoring.querySyncSessions(query);

    const entityMetrics = {
      user: this.calculateEntityMetrics(sessions, 'user'),
      class: this.calculateEntityMetrics(sessions, 'class'),
      organization: this.calculateEntityMetrics(sessions, 'organization'),
      enrollment: this.calculateEntityMetrics(sessions, 'enrollment'),
    };

    return entityMetrics;
  }

  private async generateRecentActivities(
    integrationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SyncDashboardData['recentActivities']> {
    const query: MonitoringQuery = {
      integrationId,
      timeRange: { startDate, endDate },
      limit: 50,
    };

    const { sessions } = await this.syncMonitoring.querySyncSessions(query);

    const completed = sessions.filter(s => s.status === 'completed').slice(0, 10);
    const failed = sessions.filter(s => s.status === 'failed').slice(0, 10);
    const inProgress = sessions.filter(s => 
      ['starting', 'running', 'paused'].includes(s.status)
    ).slice(0, 10);

    // Get recent alerts (simplified)
    const alerts: any[] = [];

    // Calculate conflicts
    const conflicts = {
      detected: sessions.reduce((sum, s) => sum + (s.results?.conflictsDetected || 0), 0),
      resolved: sessions.reduce((sum, s) => sum + (s.results?.conflictsResolved || 0), 0),
      pending: 0,
    };

    return {
      syncs: { completed, failed, inProgress },
      alerts,
      conflicts,
    };
  }

  private async generateHealthIndicators(integrationId: string): Promise<SyncDashboardData['healthIndicators']> {
    // Get integration health (simplified for single provider)
    const integrations: IntegrationHealth[] = [];

    // Calculate overall health
    const overall: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Get active alerts count (simplified)
    const alerts = {
      active: 0,
      critical: 0,
      unacknowledged: 0,
    };

    return {
      overall,
      integrations,
      alerts,
    };
  }

  // ===================================================================
  // CALCULATION HELPERS
  // ===================================================================

  private calculateEntityMetrics(sessions: SyncSession[], entityType: EntityType) {
    const entitySessions = sessions.filter(s => s.entityTypes.includes(entityType));
    
    const processed24h = entitySessions.reduce((sum, s) => 
      sum + (s.results?.entitiesCreated || 0) + (s.results?.entitiesUpdated || 0), 0
    );

    const created24h = entitySessions.reduce((sum, s) => sum + (s.results?.entitiesCreated || 0), 0);
    const updated24h = entitySessions.reduce((sum, s) => sum + (s.results?.entitiesUpdated || 0), 0);
    const conflicts24h = entitySessions.reduce((sum, s) => sum + (s.results?.conflictsDetected || 0), 0);
    const errors24h = entitySessions.reduce((sum, s) => sum + s.issues.errors.length, 0);

    const avgProcessingTime = entitySessions.length > 0
      ? entitySessions.reduce((sum, s) => sum + (s.duration || 0), 0) / entitySessions.length / 1000
      : 0;

    return {
      processed24h,
      created24h,
      updated24h,
      conflicts24h,
      errors24h,
      avgProcessingTime,
    };
  }

  private async calculateIntegrationHealth(
    integrationId: string,
    providerId: string,
    sessions: SyncSession[],
    timeframes: { now: Date; last24Hours: Date; last7Days: Date; last30Days: Date },
  ): Promise<IntegrationHealth> {
    const { now, last24Hours, last7Days, last30Days } = timeframes;

    // Calculate uptime percentages
    const sessions24h = sessions.filter(s => s.startTime >= last24Hours);
    const sessions7d = sessions.filter(s => s.startTime >= last7Days);
    const sessions30d = sessions.filter(s => s.startTime >= last30Days);

    const calculateUptime = (sessionList: SyncSession[]) => {
      if (sessionList.length === 0) return 100;
      const successful = sessionList.filter(s => s.status === 'completed').length;
      return (successful / sessionList.length) * 100;
    };

    const uptime = {
      current: this.syncMonitoring.getCurrentSyncSessions(integrationId).length > 0 ? 100 : 0,
      percentage24h: calculateUptime(sessions24h),
      percentage7d: calculateUptime(sessions7d),
      percentage30d: calculateUptime(sessions30d),
    };

    // Calculate response times
    const completedSessions24h = sessions24h.filter(s => s.status === 'completed' && s.duration);
    const responseTimes = completedSessions24h.map(s => s.performance.apiResponseTime);
    
    const responseTime = {
      current: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
      average24h: responseTimes.length > 0 
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length 
        : 0,
      p95_24h: this.calculatePercentile(responseTimes, 0.95),
      p99_24h: this.calculatePercentile(responseTimes, 0.99),
    };

    // Calculate error rate
    const errorCount24h = sessions24h.filter(s => s.status === 'failed').length;
    const errorRate = {
      current: 0, // Would need real-time calculation
      average24h: sessions24h.length > 0 ? errorCount24h / sessions24h.length : 0,
      spike: errorCount24h > sessions24h.length * 0.1,
    };

    // Calculate throughput
    const throughput = {
      current: 0, // Would need real-time calculation
      average24h: sessions24h.length / 24, // sessions per hour
      peak24h: Math.max(sessions24h.length / 24, 0),
    };

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' | 'offline' = 'healthy';
    if (uptime.percentage24h < 50) status = 'offline';
    else if (uptime.percentage24h < 80 || errorRate.average24h > 0.2) status = 'unhealthy';
    else if (uptime.percentage24h < 95 || errorRate.average24h > 0.1) status = 'degraded';

    // Determine trend direction
    const trend7d = calculateUptime(sessions7d);
    const trend30d = calculateUptime(sessions30d);
    let direction: 'improving' | 'stable' | 'degrading' = 'stable';
    
    if (uptime.percentage24h > trend7d + 5) direction = 'improving';
    else if (uptime.percentage24h < trend7d - 5) direction = 'degrading';

    return {
      integrationId,
      providerId,
      status,
      lastCheckTime: now,
      uptime,
      metrics: {
        responseTime,
        errorRate,
        throughput,
        resources: {
          cpuUsage: Math.random() * 100, // Would get actual metrics
          memoryUsage: Math.random() * 100,
          connectionPool: Math.random() * 100,
          queueDepth: Math.random() * 10,
        },
      },
      connectivity: {
        apiEndpoint: {
          status: status === 'offline' ? 'offline' : 'online',
          responseTime: responseTime.current,
          lastCheck: now,
          errorCount24h: errorCount24h,
        },
        authentication: {
          status: 'valid',
          lastRefresh: now,
          failureCount24h: 0,
        },
        database: {
          status: 'connected',
          connectionCount: 10,
          avgQueryTime: 50,
          slowQueryCount24h: 0,
        },
      },
      trends: {
        direction,
        confidence: 0.8,
        timeframe: '24h',
        indicators: {
          responseTime: direction,
          errorRate: direction === 'improving' ? 'improving' : 'stable',
          throughput: direction,
        },
      },
      incidents: {
        count24h: errorCount24h,
        count7d: sessions7d.filter(s => s.status === 'failed').length,
        lastIncident: sessions24h.find(s => s.status === 'failed') ? {
          timestamp: sessions24h.find(s => s.status === 'failed')!.startTime,
          type: 'sync_failure',
          severity: 'error',
          resolved: true,
        } : undefined,
      },
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  // ===================================================================
  // CACHE MANAGEMENT
  // ===================================================================

  private isCacheValid(cached: CachedDashboardData): boolean {
    const age = Date.now() - cached.cachedAt.getTime();
    return age < cached.ttl;
  }

  @Cron('*/30 * * * * *') // Every 30 seconds
  private async refreshRealTimeDashboards(): Promise<void> {
    if (!this.config.enableRealTimeUpdates) {
      return;
    }

    try {
      // Get all integrations with cached dashboards
      const cachedIntegrations = Array.from(this.dashboardCache.keys());

      for (const integrationId of cachedIntegrations) {
        // Only refresh if cache is getting stale
        const cached = this.dashboardCache.get(integrationId);
        if (cached && this.isCacheValid(cached)) {
          continue;
        }

        try {
          const updatedData = await this.getDashboardData(integrationId);
          
          // Emit real-time update
          this.emit('dashboard:realtime', {
            integrationId,
            data: updatedData,
            type: 'scheduled_refresh',
          });
        } catch (error) {
          this.logger.warn(`Failed to refresh dashboard for ${integrationId}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Dashboard refresh job failed: ${error.message}`, error.stack);
    }
  }

  private startDashboardRefresh(): void {
    // Additional dashboard-specific refresh logic could go here
    this.logger.debug('Dashboard refresh service started');
  }

  private setupEventListeners(): void {
    // Listen for sync monitoring events
    this.syncMonitoring.on('realtime:update', (update) => {
      // Invalidate relevant dashboard caches
      this.dashboardCache.delete(update.integrationId);
      
      // Emit dashboard update
      this.emit('dashboard:invalidated', {
        integrationId: update.integrationId,
        reason: 'sync_update',
        update,
      });
    });
  }

  private getDefaultConfig(): DashboardConfig {
    return {
      refreshInterval: 30, // seconds
      dataRetentionHours: 72, // 3 days
      maxTimeSeriesPoints: 1000,
      enableRealTimeUpdates: true,
      cacheEnabled: true,
      cacheTtlSeconds: 60, // 1 minute
    };
  }

  // ===================================================================
  // PUBLIC UTILITY METHODS
  // ===================================================================

  /**
   * Clear dashboard cache for an integration
   */
  clearCache(integrationId?: string): void {
    if (integrationId) {
      this.dashboardCache.delete(integrationId);
      this.healthCache.clear(); // Clear all health cache as it may be related
      this.logger.debug(`Cleared dashboard cache for: ${integrationId}`);
    } else {
      this.dashboardCache.clear();
      this.healthCache.clear();
      this.logger.debug('Cleared all dashboard caches');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    dashboardCacheSize: number;
    healthCacheSize: number;
    oldestCacheEntry?: Date;
    newestCacheEntry?: Date;
  } {
    const dashboardEntries = Array.from(this.dashboardCache.values());
    const cacheAges = dashboardEntries.map(entry => entry.cachedAt);

    return {
      dashboardCacheSize: this.dashboardCache.size,
      healthCacheSize: this.healthCache.size,
      oldestCacheEntry: cacheAges.length > 0 ? new Date(Math.min(...cacheAges.map(d => d.getTime()))) : undefined,
      newestCacheEntry: cacheAges.length > 0 ? new Date(Math.max(...cacheAges.map(d => d.getTime()))) : undefined,
    };
  }
}
