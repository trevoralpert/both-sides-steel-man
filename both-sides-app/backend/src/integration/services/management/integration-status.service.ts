/**
 * Integration Status Service
 * 
 * Real-time status tracking and monitoring service for integration providers.
 * Provides comprehensive status management, event tracking, and notification
 * capabilities for all integration operations and health monitoring.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntelligentCacheService } from '../caching/intelligent-cache.service';

// ===================================================================
// STATUS TRACKING TYPES
// ===================================================================

export interface ProviderStatus {
  providerId: string;
  providerName: string;
  status: 'initializing' | 'active' | 'inactive' | 'error' | 'maintenance' | 'degraded';
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  
  lastUpdated: Date;
  lastHealthCheck: Date;
  nextHealthCheck: Date;
  
  connectivity: {
    connected: boolean;
    lastConnected?: Date;
    connectionAttempts: number;
    consecutiveFailures: number;
  };
  
  performance: {
    responseTime: number;     // ms
    throughput: number;       // requests/minute
    errorRate: number;        // percentage
    uptime: number;          // percentage over last 24h
  };
  
  resources: {
    cpuUsage?: number;        // percentage
    memoryUsage?: number;     // bytes
    diskUsage?: number;       // bytes
    networkLatency?: number;  // ms
  };
  
  capabilities: {
    available: string[];      // Available operations
    unavailable: string[];    // Unavailable operations
    degraded: string[];       // Degraded operations
  };
  
  statistics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastSyncTime?: Date;
    syncFrequency: number;    // syncs per hour
  };
  
  issues: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
  }>;
}

export interface StatusEvent {
  id: string;
  providerId: string;
  eventType: 'status_change' | 'health_check' | 'connection' | 'performance' | 'error' | 'recovery';
  
  timestamp: Date;
  
  details: {
    previousValue?: any;
    currentValue: any;
    reason?: string;
    context?: Record<string, any>;
  };
  
  metadata: {
    source: 'monitor' | 'manual' | 'external' | 'system';
    userId?: string;
    automated: boolean;
    correlationId?: string;
  };
}

export interface StatusSnapshot {
  timestamp: Date;
  overallHealth: 'healthy' | 'degraded' | 'critical' | 'unknown';
  
  providers: {
    total: number;
    active: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    inactive: number;
  };
  
  performance: {
    averageResponseTime: number;
    overallThroughput: number;
    overallErrorRate: number;
    overallUptime: number;
  };
  
  issues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unresolved: number;
  };
  
  trends: {
    responseTimeTrend: 'improving' | 'degrading' | 'stable';
    errorRateTrend: 'improving' | 'degrading' | 'stable';
    uptimeTrend: 'improving' | 'degrading' | 'stable';
  };
}

export interface StatusNotification {
  id: string;
  type: 'provider_status' | 'health_alert' | 'performance_alert' | 'system_alert';
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  title: string;
  message: string;
  
  providerId?: string;
  providerName?: string;
  
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  
  channels: Array<{
    type: 'email' | 'webhook' | 'dashboard' | 'log';
    delivered: boolean;
    deliveredAt?: Date;
    error?: string;
  }>;
  
  metadata: {
    priority: number;
    category: string;
    tags: string[];
    correlationId?: string;
  };
}

// ===================================================================
// INTEGRATION STATUS SERVICE
// ===================================================================

@Injectable()
export class IntegrationStatusService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegrationStatusService.name);
  
  // Service state
  private isInitialized = false;
  private providerStatuses = new Map<string, ProviderStatus>();
  private statusEvents: StatusEvent[] = [];
  private notifications: StatusNotification[] = [];
  
  // Status history and snapshots
  private statusSnapshots: StatusSnapshot[] = [];
  private lastSnapshot?: StatusSnapshot;
  
  // Configuration
  private readonly config = {
    snapshotInterval: 60000,      // 1 minute
    eventRetentionHours: 72,      // 3 days
    notificationRetentionDays: 7,  // 1 week
    healthCheckTimeout: 30000,     // 30 seconds
    performanceThresholds: {
      responseTime: 5000,          // 5 seconds
      errorRate: 5,                // 5%
      uptime: 95,                  // 95%
    },
  };
  
  // Timers
  private snapshotTimer: NodeJS.Timeout;
  private cleanupTimer: NodeJS.Timeout;
  private notificationTimer: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: IntelligentCacheService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.initialize();
    this.setupEventListeners();
    this.startPeriodicTasks();
    this.logger.log('Integration Status Service initialized');
  }

  async onModuleDestroy() {
    await this.cleanup();
    this.stopPeriodicTasks();
    this.logger.log('Integration Status Service destroyed');
  }

  // ===================================================================
  // INITIALIZATION
  // ===================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.logger.log('Initializing Integration Status Service');

      // Load existing status data from database
      await this.loadStatusFromDatabase();

      // Initialize status snapshots
      await this.createInitialSnapshot();

      this.isInitialized = true;
      this.emit('service:initialized');

      this.logger.log('Integration Status Service initialization completed');

    } catch (error) {
      this.logger.error(`Failed to initialize status service: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===================================================================
  // STATUS MANAGEMENT
  // ===================================================================

  /**
   * Register a new provider for status tracking
   */
  async registerProvider(providerId: string, providerName: string): Promise<ProviderStatus> {
    try {
      if (this.providerStatuses.has(providerId)) {
        this.logger.warn(`Provider ${providerId} is already registered for status tracking`);
        return this.providerStatuses.get(providerId)!;
      }

      const initialStatus: ProviderStatus = {
        providerId,
        providerName,
        status: 'inactive',
        health: 'unknown',
        lastUpdated: new Date(),
        lastHealthCheck: new Date(),
        nextHealthCheck: new Date(Date.now() + 60000), // Next minute
        
        connectivity: {
          connected: false,
          connectionAttempts: 0,
          consecutiveFailures: 0,
        },
        
        performance: {
          responseTime: 0,
          throughput: 0,
          errorRate: 0,
          uptime: 100,
        },
        
        resources: {},
        
        capabilities: {
          available: [],
          unavailable: [],
          degraded: [],
        },
        
        statistics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          syncFrequency: 0,
        },
        
        issues: [],
      };

      this.providerStatuses.set(providerId, initialStatus);
      
      // Persist to database
      await this.saveProviderStatusToDatabase(initialStatus);

      // Create registration event
      await this.recordStatusEvent({
        providerId,
        eventType: 'status_change',
        details: {
          currentValue: 'registered',
          reason: 'Provider registered for status tracking',
        },
        metadata: {
          source: 'system',
          automated: true,
        },
      });

      this.emit('provider:registered', { providerId, providerName });
      this.logger.log(`Provider ${providerName} (${providerId}) registered for status tracking`);

      return initialStatus;

    } catch (error) {
      this.logger.error(`Failed to register provider ${providerId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update provider status
   */
  async updateProviderStatus(
    providerId: string,
    statusUpdate: Partial<ProviderStatus>,
    source: 'monitor' | 'manual' | 'external' | 'system' = 'system',
    userId?: string
  ): Promise<ProviderStatus> {
    try {
      const currentStatus = this.providerStatuses.get(providerId);
      if (!currentStatus) {
        throw new Error(`Provider ${providerId} not found in status tracking`);
      }

      // Capture previous values for event recording
      const previousStatus = currentStatus.status;
      const previousHealth = currentStatus.health;
      const previousConnectivity = { ...currentStatus.connectivity };
      const previousPerformance = { ...currentStatus.performance };

      // Update status
      const updatedStatus: ProviderStatus = {
        ...currentStatus,
        ...statusUpdate,
        lastUpdated: new Date(),
      };

      this.providerStatuses.set(providerId, updatedStatus);

      // Record status change events
      const events: Array<Omit<StatusEvent, 'id' | 'timestamp'>> = [];

      if (statusUpdate.status && statusUpdate.status !== previousStatus) {
        events.push({
          providerId,
          eventType: 'status_change',
          details: {
            previousValue: previousStatus,
            currentValue: statusUpdate.status,
            reason: 'Status updated',
          },
          metadata: { source, automated: source === 'monitor', userId },
        });
      }

      if (statusUpdate.health && statusUpdate.health !== previousHealth) {
        events.push({
          providerId,
          eventType: 'health_check',
          details: {
            previousValue: previousHealth,
            currentValue: statusUpdate.health,
            reason: 'Health status updated',
          },
          metadata: { source, automated: source === 'monitor', userId },
        });
      }

      if (statusUpdate.connectivity && JSON.stringify(statusUpdate.connectivity) !== JSON.stringify(previousConnectivity)) {
        events.push({
          providerId,
          eventType: 'connection',
          details: {
            previousValue: previousConnectivity,
            currentValue: statusUpdate.connectivity,
            reason: 'Connectivity status changed',
          },
          metadata: { source, automated: true, userId },
        });
      }

      if (statusUpdate.performance && JSON.stringify(statusUpdate.performance) !== JSON.stringify(previousPerformance)) {
        events.push({
          providerId,
          eventType: 'performance',
          details: {
            previousValue: previousPerformance,
            currentValue: statusUpdate.performance,
            reason: 'Performance metrics updated',
          },
          metadata: { source, automated: true, userId },
        });
      }

      // Record all events
      for (const eventData of events) {
        await this.recordStatusEvent(eventData);
      }

      // Check for notification triggers
      await this.checkNotificationTriggers(updatedStatus, currentStatus);

      // Persist to database
      await this.saveProviderStatusToDatabase(updatedStatus);

      // Update cache
      await this.updateStatusCache(providerId, updatedStatus);

      this.emit('provider:status-updated', {
        providerId,
        previousStatus: currentStatus,
        currentStatus: updatedStatus,
        source,
        userId,
      });

      return updatedStatus;

    } catch (error) {
      this.logger.error(`Failed to update provider status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Record performance metrics for a provider
   */
  async recordPerformanceMetrics(
    providerId: string,
    metrics: {
      responseTime?: number;
      throughput?: number;
      errorRate?: number;
      totalRequests?: number;
      successfulRequests?: number;
      failedRequests?: number;
    }
  ): Promise<void> {
    try {
      const status = this.providerStatuses.get(providerId);
      if (!status) return;

      // Update performance metrics
      const updatedPerformance = { ...status.performance };
      const updatedStatistics = { ...status.statistics };

      if (metrics.responseTime !== undefined) {
        updatedPerformance.responseTime = metrics.responseTime;
        // Update average response time
        const totalRequests = updatedStatistics.totalRequests || 1;
        updatedStatistics.averageResponseTime = 
          (updatedStatistics.averageResponseTime * (totalRequests - 1) + metrics.responseTime) / totalRequests;
      }

      if (metrics.throughput !== undefined) {
        updatedPerformance.throughput = metrics.throughput;
      }

      if (metrics.errorRate !== undefined) {
        updatedPerformance.errorRate = metrics.errorRate;
      }

      if (metrics.totalRequests !== undefined) {
        updatedStatistics.totalRequests = metrics.totalRequests;
      }

      if (metrics.successfulRequests !== undefined) {
        updatedStatistics.successfulRequests = metrics.successfulRequests;
      }

      if (metrics.failedRequests !== undefined) {
        updatedStatistics.failedRequests = metrics.failedRequests;
      }

      // Update provider status
      await this.updateProviderStatus(providerId, {
        performance: updatedPerformance,
        statistics: updatedStatistics,
      }, 'monitor');

    } catch (error) {
      this.logger.error(`Failed to record performance metrics for provider ${providerId}: ${error.message}`, error.stack);
    }
  }

  /**
   * Report an issue for a provider
   */
  async reportIssue(
    providerId: string,
    issue: {
      type: 'error' | 'warning' | 'info';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      context?: Record<string, any>;
    },
    source: 'monitor' | 'manual' | 'external' | 'system' = 'system',
    userId?: string
  ): Promise<string> {
    try {
      const status = this.providerStatuses.get(providerId);
      if (!status) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const issueId = `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newIssue = {
        id: issueId,
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
        timestamp: new Date(),
        resolved: false,
      };

      status.issues.push(newIssue);

      // Record error event
      await this.recordStatusEvent({
        providerId,
        eventType: 'error',
        details: {
          currentValue: newIssue,
          reason: issue.message,
          context: issue.context,
        },
        metadata: { source, automated: source === 'monitor', userId },
      });

      // Update status based on issue severity
      if (issue.severity === 'critical' || issue.severity === 'high') {
        if (status.health === 'healthy') {
          await this.updateProviderStatus(providerId, { health: 'degraded' }, source, userId);
        }
      }

      // Create notification for critical/high severity issues
      if (issue.severity === 'critical' || issue.severity === 'high') {
        await this.createNotification({
          type: 'health_alert',
          severity: issue.severity === 'critical' ? 'critical' : 'error',
          title: `${issue.severity.toUpperCase()}: ${status.providerName}`,
          message: issue.message,
          providerId,
          providerName: status.providerName,
          channels: [
            { type: 'dashboard', delivered: false },
            { type: 'log', delivered: false },
          ],
          metadata: {
            priority: issue.severity === 'critical' ? 1 : 2,
            category: 'provider_health',
            tags: [issue.type, issue.severity],
          },
        });
      }

      await this.saveProviderStatusToDatabase(status);

      this.emit('provider:issue-reported', {
        providerId,
        issueId,
        issue: newIssue,
        source,
        userId,
      });

      return issueId;

    } catch (error) {
      this.logger.error(`Failed to report issue for provider ${providerId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Resolve an issue
   */
  async resolveIssue(
    providerId: string,
    issueId: string,
    resolvedBy?: string
  ): Promise<void> {
    try {
      const status = this.providerStatuses.get(providerId);
      if (!status) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const issue = status.issues.find(i => i.id === issueId);
      if (!issue) {
        throw new Error(`Issue ${issueId} not found for provider ${providerId}`);
      }

      if (issue.resolved) {
        this.logger.warn(`Issue ${issueId} is already resolved`);
        return;
      }

      issue.resolved = true;
      issue.resolvedAt = new Date();

      // Record recovery event
      await this.recordStatusEvent({
        providerId,
        eventType: 'recovery',
        details: {
          currentValue: issue,
          reason: 'Issue resolved',
        },
        metadata: { source: resolvedBy ? 'manual' : 'system', automated: !resolvedBy, userId: resolvedBy },
      });

      // Check if provider health should be updated
      const unresolvedCriticalIssues = status.issues.filter(i => 
        !i.resolved && (i.severity === 'critical' || i.severity === 'high')
      ).length;

      if (unresolvedCriticalIssues === 0 && status.health === 'degraded') {
        await this.updateProviderStatus(providerId, { health: 'healthy' }, 'system', resolvedBy);
      }

      await this.saveProviderStatusToDatabase(status);

      this.emit('provider:issue-resolved', {
        providerId,
        issueId,
        resolvedBy,
      });

    } catch (error) {
      this.logger.error(`Failed to resolve issue ${issueId} for provider ${providerId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===================================================================
  // STATUS RETRIEVAL
  // ===================================================================

  /**
   * Get status for a specific provider
   */
  getProviderStatus(providerId: string): ProviderStatus | null {
    return this.providerStatuses.get(providerId) || null;
  }

  /**
   * Get status for all providers
   */
  getAllProviderStatuses(): ProviderStatus[] {
    return Array.from(this.providerStatuses.values());
  }

  /**
   * Get current status snapshot
   */
  getCurrentSnapshot(): StatusSnapshot | null {
    return this.lastSnapshot || null;
  }

  /**
   * Get status events for a provider
   */
  getProviderEvents(providerId: string, limit: number = 50): StatusEvent[] {
    return this.statusEvents
      .filter(event => event.providerId === providerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get recent status events
   */
  getRecentEvents(limit: number = 100): StatusEvent[] {
    return this.statusEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get notifications
   */
  getNotifications(options: {
    acknowledged?: boolean;
    severity?: string[];
    type?: string[];
    limit?: number;
  } = {}): StatusNotification[] {
    let notifications = [...this.notifications];

    if (options.acknowledged !== undefined) {
      notifications = notifications.filter(n => n.acknowledged === options.acknowledged);
    }

    if (options.severity) {
      notifications = notifications.filter(n => options.severity!.includes(n.severity));
    }

    if (options.type) {
      notifications = notifications.filter(n => options.type!.includes(n.type));
    }

    return notifications
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, options.limit || 50);
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private async loadStatusFromDatabase(): Promise<void> {
    try {
      // Load provider statuses from database
      // This would query the integration_status table
      this.logger.debug('Loading provider statuses from database (simulated)');
      
    } catch (error) {
      this.logger.error(`Failed to load status from database: ${error.message}`, error.stack);
    }
  }

  private async createInitialSnapshot(): Promise<void> {
    const snapshot = await this.generateSnapshot();
    this.statusSnapshots.push(snapshot);
    this.lastSnapshot = snapshot;
  }

  private setupEventListeners(): void {
    // Set up any additional event listeners
    this.on('provider:status-updated', (data) => {
      this.updateStatusCache(data.providerId, data.currentStatus);
    });
  }

  private startPeriodicTasks(): void {
    // Snapshot creation timer
    this.snapshotTimer = setInterval(async () => {
      await this.createSnapshot();
    }, this.config.snapshotInterval);

    // Cleanup timer
    this.cleanupTimer = setInterval(async () => {
      await this.performCleanup();
    }, 300000); // Every 5 minutes

    // Notification processing timer
    this.notificationTimer = setInterval(async () => {
      await this.processNotifications();
    }, 30000); // Every 30 seconds
  }

  private stopPeriodicTasks(): void {
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.notificationTimer) clearInterval(this.notificationTimer);
  }

  private async createSnapshot(): Promise<void> {
    try {
      const snapshot = await this.generateSnapshot();
      this.statusSnapshots.push(snapshot);
      this.lastSnapshot = snapshot;

      // Keep only recent snapshots
      if (this.statusSnapshots.length > 1440) { // 24 hours of minute snapshots
        this.statusSnapshots.shift();
      }

      this.emit('snapshot:created', snapshot);

    } catch (error) {
      this.logger.error(`Failed to create status snapshot: ${error.message}`, error.stack);
    }
  }

  private async generateSnapshot(): Promise<StatusSnapshot> {
    const providers = Array.from(this.providerStatuses.values());
    
    const providerCounts = {
      total: providers.length,
      active: providers.filter(p => p.status === 'active').length,
      healthy: providers.filter(p => p.health === 'healthy').length,
      degraded: providers.filter(p => p.health === 'degraded').length,
      unhealthy: providers.filter(p => p.health === 'unhealthy').length,
      inactive: providers.filter(p => p.status === 'inactive').length,
    };

    const performance = {
      averageResponseTime: providers.length > 0 
        ? providers.reduce((sum, p) => sum + p.performance.responseTime, 0) / providers.length 
        : 0,
      overallThroughput: providers.reduce((sum, p) => sum + p.performance.throughput, 0),
      overallErrorRate: providers.length > 0 
        ? providers.reduce((sum, p) => sum + p.performance.errorRate, 0) / providers.length 
        : 0,
      overallUptime: providers.length > 0 
        ? providers.reduce((sum, p) => sum + p.performance.uptime, 0) / providers.length 
        : 100,
    };

    const allIssues = providers.flatMap(p => p.issues.filter(i => !i.resolved));
    const issues = {
      critical: allIssues.filter(i => i.severity === 'critical').length,
      high: allIssues.filter(i => i.severity === 'high').length,
      medium: allIssues.filter(i => i.severity === 'medium').length,
      low: allIssues.filter(i => i.severity === 'low').length,
      unresolved: allIssues.length,
    };

    const overallHealth = this.calculateOverallHealth(providerCounts, issues);

    return {
      timestamp: new Date(),
      overallHealth,
      providers: providerCounts,
      performance,
      issues,
      trends: {
        responseTimeTrend: 'stable', // Would calculate from historical data
        errorRateTrend: 'stable',
        uptimeTrend: 'stable',
      },
    };
  }

  private calculateOverallHealth(
    providerCounts: any, 
    issues: any
  ): 'healthy' | 'degraded' | 'critical' | 'unknown' {
    if (providerCounts.total === 0) return 'unknown';
    
    if (issues.critical > 0 || providerCounts.unhealthy > 0) {
      return 'critical';
    }
    
    if (issues.high > 0 || providerCounts.degraded > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private async recordStatusEvent(eventData: Omit<StatusEvent, 'id' | 'timestamp'>): Promise<StatusEvent> {
    const event: StatusEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...eventData,
    };

    this.statusEvents.push(event);
    
    // Emit event
    this.emit('status:event', event);

    return event;
  }

  private async checkNotificationTriggers(
    updatedStatus: ProviderStatus,
    previousStatus: ProviderStatus
  ): Promise<void> {
    // Check for status change notifications
    if (updatedStatus.status !== previousStatus.status) {
      if (updatedStatus.status === 'error' || updatedStatus.status === 'inactive') {
        await this.createNotification({
          type: 'provider_status',
          severity: 'warning',
          title: `Provider ${updatedStatus.providerName} is ${updatedStatus.status}`,
          message: `Provider status changed from ${previousStatus.status} to ${updatedStatus.status}`,
          providerId: updatedStatus.providerId,
          providerName: updatedStatus.providerName,
          channels: [
            { type: 'dashboard', delivered: false },
            { type: 'log', delivered: false },
          ],
          metadata: {
            priority: 2,
            category: 'status_change',
            tags: ['status', updatedStatus.status],
          },
        });
      }
    }

    // Check for performance threshold violations
    const perfThresholds = this.config.performanceThresholds;
    
    if (updatedStatus.performance.responseTime > perfThresholds.responseTime) {
      await this.createNotification({
        type: 'performance_alert',
        severity: 'warning',
        title: `High response time: ${updatedStatus.providerName}`,
        message: `Response time ${updatedStatus.performance.responseTime}ms exceeds threshold of ${perfThresholds.responseTime}ms`,
        providerId: updatedStatus.providerId,
        providerName: updatedStatus.providerName,
        channels: [{ type: 'dashboard', delivered: false }],
        metadata: {
          priority: 3,
          category: 'performance',
          tags: ['response_time', 'threshold'],
        },
      });
    }

    if (updatedStatus.performance.errorRate > perfThresholds.errorRate) {
      await this.createNotification({
        type: 'performance_alert',
        severity: 'error',
        title: `High error rate: ${updatedStatus.providerName}`,
        message: `Error rate ${updatedStatus.performance.errorRate}% exceeds threshold of ${perfThresholds.errorRate}%`,
        providerId: updatedStatus.providerId,
        providerName: updatedStatus.providerName,
        channels: [{ type: 'dashboard', delivered: false }],
        metadata: {
          priority: 2,
          category: 'performance',
          tags: ['error_rate', 'threshold'],
        },
      });
    }
  }

  private async createNotification(
    notificationData: Omit<StatusNotification, 'id' | 'timestamp' | 'acknowledged'>
  ): Promise<StatusNotification> {
    const notification: StatusNotification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
      ...notificationData,
    };

    this.notifications.push(notification);
    
    this.emit('notification:created', notification);

    return notification;
  }

  private async performCleanup(): Promise<void> {
    const now = Date.now();
    const eventRetentionMs = this.config.eventRetentionHours * 60 * 60 * 1000;
    const notificationRetentionMs = this.config.notificationRetentionDays * 24 * 60 * 60 * 1000;

    // Clean up old events
    const oldEventCount = this.statusEvents.length;
    this.statusEvents = this.statusEvents.filter(
      event => now - event.timestamp.getTime() < eventRetentionMs
    );

    // Clean up old notifications
    const oldNotificationCount = this.notifications.length;
    this.notifications = this.notifications.filter(
      notification => now - notification.timestamp.getTime() < notificationRetentionMs
    );

    if (oldEventCount !== this.statusEvents.length || oldNotificationCount !== this.notifications.length) {
      this.logger.debug(`Cleaned up ${oldEventCount - this.statusEvents.length} old events and ${oldNotificationCount - this.notifications.length} old notifications`);
    }
  }

  private async processNotifications(): Promise<void> {
    const undeliveredNotifications = this.notifications.filter(n => 
      n.channels.some(c => !c.delivered)
    );

    for (const notification of undeliveredNotifications) {
      for (const channel of notification.channels) {
        if (!channel.delivered) {
          try {
            await this.deliverNotification(notification, channel);
            channel.delivered = true;
            channel.deliveredAt = new Date();
          } catch (error) {
            channel.error = error.message;
            this.logger.error(`Failed to deliver notification ${notification.id} via ${channel.type}: ${error.message}`);
          }
        }
      }
    }
  }

  private async deliverNotification(
    notification: StatusNotification,
    channel: StatusNotification['channels'][0]
  ): Promise<void> {
    switch (channel.type) {
      case 'dashboard':
        // Dashboard notifications are delivered via event emission
        this.emit('dashboard:notification', notification);
        break;
        
      case 'log':
        this.logger.log(`NOTIFICATION: ${notification.title} - ${notification.message}`, {
          type: notification.type,
          severity: notification.severity,
          providerId: notification.providerId,
        });
        break;
        
      case 'email':
        // Would integrate with email service
        this.logger.debug(`Email notification would be sent: ${notification.title}`);
        break;
        
      case 'webhook':
        // Would send webhook
        this.logger.debug(`Webhook notification would be sent: ${notification.title}`);
        break;
    }
  }

  private async saveProviderStatusToDatabase(status: ProviderStatus): Promise<void> {
    try {
      // Save status to database
      // This would update the integration_status table
      this.logger.debug(`Saving provider status to database: ${status.providerId}`);
      
    } catch (error) {
      this.logger.error(`Failed to save provider status to database: ${error.message}`, error.stack);
    }
  }

  private async updateStatusCache(providerId: string, status: ProviderStatus): Promise<void> {
    try {
      await this.cacheService.set(`status:provider:${providerId}`, status, {
        ttl: 60000, // 1 minute
        tags: ['status', 'provider', providerId],
      });
    } catch (error) {
      this.logger.warn(`Failed to update status cache: ${error.message}`);
    }
  }

  private async cleanup(): Promise<void> {
    this.providerStatuses.clear();
    this.statusEvents.length = 0;
    this.notifications.length = 0;
    this.statusSnapshots.length = 0;
  }

  // ===================================================================
  // PUBLIC API METHODS
  // ===================================================================

  /**
   * Acknowledge a notification
   */
  async acknowledgeNotification(notificationId: string, userId: string): Promise<StatusNotification> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    notification.acknowledged = true;
    notification.acknowledgedAt = new Date();
    notification.acknowledgedBy = userId;

    this.emit('notification:acknowledged', { notificationId, userId });

    return notification;
  }

  /**
   * Get service health status
   */
  getServiceHealth(): {
    initialized: boolean;
    providersTracked: number;
    eventsRecorded: number;
    activeNotifications: number;
    lastSnapshot?: Date;
  } {
    return {
      initialized: this.isInitialized,
      providersTracked: this.providerStatuses.size,
      eventsRecorded: this.statusEvents.length,
      activeNotifications: this.notifications.filter(n => !n.acknowledged).length,
      lastSnapshot: this.lastSnapshot?.timestamp,
    };
  }
}
