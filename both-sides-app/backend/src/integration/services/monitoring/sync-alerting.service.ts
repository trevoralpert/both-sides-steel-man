/**
 * Sync Alerting Service
 * 
 * Comprehensive alerting system for sync operations with configurable rules,
 * multi-channel notifications, escalation management, and alert correlation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter } from 'events';
import {
  SyncAlert,
  AlertRule,
  AlertType,
  AlertSeverity,
  SyncSession,
  PerformanceMetrics,
  IntegrationHealth,
} from './sync-monitoring.interfaces';
import { EntityType } from '../synchronizers/base-synchronizer.service';

// ===================================================================
// ALERTING CONFIGURATION
// ===================================================================

interface AlertingConfig {
  enabled: boolean;
  evaluationInterval: number;        // seconds
  maxAlertsPerHour: number;
  suppressDuplicates: boolean;
  defaultSuppressionWindow: number;  // minutes
  escalationEnabled: boolean;
  notificationRetries: number;
  batchNotifications: boolean;
}

interface NotificationChannel {
  type: 'email' | 'webhook' | 'database' | 'realtime';
  config: any;
  enabled: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    timeoutMs: number;
  };
}

interface AlertContext {
  integrationId: string;
  sessionId?: string;
  entityType?: EntityType;
  entityId?: string;
  providerId?: string;
  metadata: Record<string, any>;
}

// ===================================================================
// SYNC ALERTING SERVICE
// ===================================================================

@Injectable()
export class SyncAlertingService extends EventEmitter {
  private readonly logger = new Logger(SyncAlertingService.name);
  private readonly config: AlertingConfig;
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly activeAlerts = new Map<string, SyncAlert>();
  private readonly alertHistory = new Map<string, SyncAlert[]>();
  private readonly suppressedAlerts = new Set<string>();
  private readonly notificationChannels = new Map<string, NotificationChannel>();

  // Alert counters for rate limiting
  private readonly hourlyAlertCounts = new Map<string, { count: number; resetTime: Date }>();

  constructor(
    private readonly prisma: PrismaService,
  ) {
    super();
    this.config = this.getDefaultConfig();
    this.initializeDefaultRules();
    this.initializeNotificationChannels();
    this.startAlertEvaluation();
    this.logger.log('SyncAlertingService initialized');
  }

  // ===================================================================
  // CORE ALERTING METHODS
  // ===================================================================

  /**
   * Evaluate and potentially trigger an alert
   */
  async evaluateAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    description: string,
    context: AlertContext,
    trigger: {
      condition: string;
      threshold: any;
      actualValue: any;
      dataSource: string;
    },
  ): Promise<SyncAlert | null> {
    if (!this.config.enabled) {
      return null;
    }

    // Check rate limiting
    if (!this.canTriggerAlert(context.integrationId)) {
      this.logger.warn(`Alert rate limit exceeded for integration: ${context.integrationId}`);
      return null;
    }

    // Check if alert should be suppressed
    const suppressionKey = this.generateSuppressionKey(type, context);
    if (this.suppressedAlerts.has(suppressionKey)) {
      this.logger.debug(`Alert suppressed: ${suppressionKey}`);
      return null;
    }

    // Create alert
    const alert = await this.createAlert(type, severity, title, description, context, trigger);

    // Check for duplicate suppression
    if (this.config.suppressDuplicates && this.isDuplicateAlert(alert)) {
      this.logger.debug(`Duplicate alert suppressed: ${alert.id}`);
      return null;
    }

    // Store and process alert
    await this.processAlert(alert);

    this.logger.log(`Alert triggered: ${alert.type} (${alert.severity})`, {
      alertId: alert.id,
      integrationId: alert.integrationId,
      title: alert.title,
    });

    return alert;
  }

  /**
   * Process sync session for potential alerts
   */
  async evaluateSyncSessionAlerts(session: SyncSession): Promise<SyncAlert[]> {
    const alerts: SyncAlert[] = [];
    const context: AlertContext = {
      integrationId: session.integrationId,
      sessionId: session.id,
      providerId: session.providerId,
      metadata: {
        syncType: session.syncType,
        status: session.status,
        entityTypes: session.entityTypes,
      },
    };

    // Check for sync failure
    if (session.status === 'failed') {
      const alert = await this.evaluateAlert(
        'sync_failure',
        'error',
        'Sync Operation Failed',
        `Sync session ${session.id} failed with ${session.issues.errors.length} errors`,
        context,
        {
          condition: 'status = failed',
          threshold: 'success',
          actualValue: session.status,
          dataSource: 'sync_session',
        },
      );
      if (alert) alerts.push(alert);
    }

    // Check for timeout
    if (session.status === 'timeout') {
      const alert = await this.evaluateAlert(
        'timeout_threshold',
        'warning',
        'Sync Operation Timed Out',
        `Sync session ${session.id} exceeded timeout threshold`,
        context,
        {
          condition: 'duration > timeout',
          threshold: session.config.timeout,
          actualValue: session.duration || 0,
          dataSource: 'sync_session',
        },
      );
      if (alert) alerts.push(alert);
    }

    // Check for high error rate
    const errorRate = session.issues.errors.length / Math.max(session.progress.entitiesProcessed, 1);
    if (errorRate > 0.1) { // 10% error rate threshold
      const alert = await this.evaluateAlert(
        'high_error_rate',
        errorRate > 0.3 ? 'critical' : 'warning',
        'High Error Rate Detected',
        `Sync session has ${(errorRate * 100).toFixed(1)}% error rate`,
        context,
        {
          condition: 'error_rate > threshold',
          threshold: 0.1,
          actualValue: errorRate,
          dataSource: 'sync_session',
        },
      );
      if (alert) alerts.push(alert);
    }

    // Check for performance degradation
    if (session.duration && session.duration > session.config.timeout * 0.8) {
      const alert = await this.evaluateAlert(
        'performance_degradation',
        'warning',
        'Sync Performance Degraded',
        `Sync session taking longer than expected: ${Math.round(session.duration / 60000)} minutes`,
        context,
        {
          condition: 'duration > 80% of timeout',
          threshold: session.config.timeout * 0.8,
          actualValue: session.duration,
          dataSource: 'sync_session',
        },
      );
      if (alert) alerts.push(alert);
    }

    // Check for resource exhaustion
    const memoryUsage = session.performance.dataTransferred / (1024 * 1024 * 1024); // GB
    if (memoryUsage > 1) { // 1GB threshold
      const alert = await this.evaluateAlert(
        'resource_exhaustion',
        'warning',
        'High Memory Usage',
        `Sync session using ${memoryUsage.toFixed(2)}GB of memory`,
        context,
        {
          condition: 'memory_usage > threshold',
          threshold: 1,
          actualValue: memoryUsage,
          dataSource: 'sync_session',
        },
      );
      if (alert) alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Process performance metrics for alerts
   */
  async evaluatePerformanceAlerts(metrics: PerformanceMetrics): Promise<SyncAlert[]> {
    const alerts: SyncAlert[] = [];
    const context: AlertContext = {
      integrationId: metrics.integrationId,
      providerId: metrics.providerId,
      metadata: {
        timestamp: metrics.timestamp,
        interval: metrics.interval,
      },
    };

    // High error rate
    if (metrics.quality.errorRate > 0.2) {
      const alert = await this.evaluateAlert(
        'high_error_rate',
        metrics.quality.errorRate > 0.5 ? 'critical' : 'error',
        'High Error Rate Alert',
        `Error rate at ${(metrics.quality.errorRate * 100).toFixed(1)}%`,
        context,
        {
          condition: 'error_rate > threshold',
          threshold: 0.2,
          actualValue: metrics.quality.errorRate,
          dataSource: 'performance_metrics',
        },
      );
      if (alert) alerts.push(alert);
    }

    // High latency
    if (metrics.latency.apiResponseTime.avg > 5000) { // 5 seconds
      const alert = await this.evaluateAlert(
        'performance_degradation',
        'warning',
        'High API Latency',
        `API response time: ${metrics.latency.apiResponseTime.avg.toFixed(0)}ms`,
        context,
        {
          condition: 'api_response_time > threshold',
          threshold: 5000,
          actualValue: metrics.latency.apiResponseTime.avg,
          dataSource: 'performance_metrics',
        },
      );
      if (alert) alerts.push(alert);
    }

    // Resource utilization
    if (metrics.resources.cpuUsage > 80) {
      const alert = await this.evaluateAlert(
        'resource_exhaustion',
        metrics.resources.cpuUsage > 95 ? 'critical' : 'warning',
        'High CPU Usage',
        `CPU usage at ${metrics.resources.cpuUsage.toFixed(1)}%`,
        context,
        {
          condition: 'cpu_usage > threshold',
          threshold: 80,
          actualValue: metrics.resources.cpuUsage,
          dataSource: 'performance_metrics',
        },
      );
      if (alert) alerts.push(alert);
    }

    if (metrics.resources.memoryUsage > 80) {
      const alert = await this.evaluateAlert(
        'resource_exhaustion',
        metrics.resources.memoryUsage > 95 ? 'critical' : 'warning',
        'High Memory Usage',
        `Memory usage at ${metrics.resources.memoryUsage.toFixed(1)}%`,
        context,
        {
          condition: 'memory_usage > threshold',
          threshold: 80,
          actualValue: metrics.resources.memoryUsage,
          dataSource: 'performance_metrics',
        },
      );
      if (alert) alerts.push(alert);
    }

    // Low throughput
    if (metrics.throughput.entitiesPerSecond < 0.1) {
      const alert = await this.evaluateAlert(
        'performance_degradation',
        'warning',
        'Low Processing Throughput',
        `Processing rate: ${metrics.throughput.entitiesPerSecond.toFixed(2)} entities/sec`,
        context,
        {
          condition: 'throughput < threshold',
          threshold: 0.1,
          actualValue: metrics.throughput.entitiesPerSecond,
          dataSource: 'performance_metrics',
        },
      );
      if (alert) alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Process integration health for alerts
   */
  async evaluateHealthAlerts(health: IntegrationHealth): Promise<SyncAlert[]> {
    const alerts: SyncAlert[] = [];
    const context: AlertContext = {
      integrationId: health.integrationId,
      providerId: health.providerId,
      metadata: {
        lastCheckTime: health.lastCheckTime,
        status: health.status,
      },
    };

    // Integration down
    if (health.status === 'offline') {
      const alert = await this.evaluateAlert(
        'integration_down',
        'critical',
        'Integration Offline',
        `Integration ${health.providerId} is offline`,
        context,
        {
          condition: 'status = offline',
          threshold: 'online',
          actualValue: health.status,
          dataSource: 'health_check',
        },
      );
      if (alert) alerts.push(alert);
    }

    // Low uptime
    if (health.uptime.percentage24h < 80) {
      const alert = await this.evaluateAlert(
        'performance_degradation',
        health.uptime.percentage24h < 50 ? 'critical' : 'error',
        'Low Uptime Alert',
        `Uptime in last 24h: ${health.uptime.percentage24h.toFixed(1)}%`,
        context,
        {
          condition: 'uptime_24h < threshold',
          threshold: 80,
          actualValue: health.uptime.percentage24h,
          dataSource: 'health_check',
        },
      );
      if (alert) alerts.push(alert);
    }

    // Authentication failure
    if (health.connectivity.authentication.status === 'expired' ||
        health.connectivity.authentication.status === 'invalid') {
      const alert = await this.evaluateAlert(
        'authentication_failure',
        'error',
        'Authentication Issue',
        `Authentication status: ${health.connectivity.authentication.status}`,
        context,
        {
          condition: 'auth_status != valid',
          threshold: 'valid',
          actualValue: health.connectivity.authentication.status,
          dataSource: 'health_check',
        },
      );
      if (alert) alerts.push(alert);
    }

    // API endpoint issues
    if (health.connectivity.apiEndpoint.status === 'offline') {
      const alert = await this.evaluateAlert(
        'integration_down',
        'critical',
        'API Endpoint Unavailable',
        `API endpoint is offline for ${health.providerId}`,
        context,
        {
          condition: 'api_status = offline',
          threshold: 'online',
          actualValue: health.connectivity.apiEndpoint.status,
          dataSource: 'health_check',
        },
      );
      if (alert) alerts.push(alert);
    }

    return alerts;
  }

  // ===================================================================
  // ALERT MANAGEMENT
  // ===================================================================

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string, note?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    if (note) {
      alert.resolutionNote = note;
    }

    await this.persistAlert(alert);

    this.logger.log(`Alert acknowledged: ${alertId}`, {
      acknowledgedBy,
      alertType: alert.type,
      severity: alert.severity,
    });

    // Emit alert acknowledged event
    this.emit('alert:acknowledged', {
      alert,
      acknowledgedBy,
      note,
    });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolutionNote?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolutionNote = resolutionNote || alert.resolutionNote;

    // Move from active to history
    this.activeAlerts.delete(alertId);
    this.addToHistory(alert);

    await this.persistAlert(alert);

    this.logger.log(`Alert resolved: ${alertId}`, {
      resolvedBy,
      alertType: alert.type,
      duration: alert.resolvedAt.getTime() - alert.createdAt.getTime(),
    });

    // Emit alert resolved event
    this.emit('alert:resolved', {
      alert,
      resolvedBy,
      resolutionNote,
    });
  }

  /**
   * Suppress an alert for a specified duration
   */
  async suppressAlert(alertId: string, suppressedUntil: Date, reason?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'suppressed';
    alert.suppressedUntil = suppressedUntil;

    const suppressionKey = this.generateSuppressionKey(alert.type, {
      integrationId: alert.integrationId,
      sessionId: alert.context.sessionId,
      entityType: alert.context.entityType,
      providerId: alert.context.metadata?.providerId,
      metadata: alert.context.metadata,
    });

    this.suppressedAlerts.add(suppressionKey);

    // Schedule suppression removal
    setTimeout(() => {
      this.suppressedAlerts.delete(suppressionKey);
      this.logger.debug(`Alert suppression expired: ${alertId}`);
    }, suppressedUntil.getTime() - Date.now());

    await this.persistAlert(alert);

    this.logger.log(`Alert suppressed until ${suppressedUntil.toISOString()}: ${alertId}`, {
      reason,
      alertType: alert.type,
    });
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(integrationId?: string): SyncAlert[] {
    const alerts = Array.from(this.activeAlerts.values());
    
    if (integrationId) {
      return alerts.filter(alert => alert.integrationId === integrationId);
    }
    
    return alerts;
  }

  /**
   * Get alert history
   */
  getAlertHistory(integrationId: string, limit: number = 50): SyncAlert[] {
    const history = this.alertHistory.get(integrationId) || [];
    return history
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ===================================================================
  // NOTIFICATION SYSTEM
  // ===================================================================

  /**
   * Send alert notifications through configured channels
   */
  private async sendNotifications(alert: SyncAlert): Promise<void> {
    if (!alert.notifications.channels.length) {
      return;
    }

    const promises = alert.notifications.channels.map(async (channelType) => {
      const channel = this.notificationChannels.get(channelType);
      if (!channel || !channel.enabled) {
        return { channel: channelType, status: 'disabled' };
      }

      try {
        await this.sendNotification(alert, channel);
        return { channel: channelType, status: 'sent' };
      } catch (error) {
        this.logger.error(`Failed to send notification via ${channelType}: ${error.message}`, {
          alertId: alert.id,
          error: error.stack,
        });
        return { channel: channelType, status: 'failed', error: error.message };
      }
    });

    const results = await Promise.all(promises);
    
    // Update alert notification status
    results.forEach(result => {
      alert.notifications.deliveryStatus[result.channel] = result.status as any;
    });

    alert.notifications.sent = results.some(r => r.status === 'sent');
    alert.notifications.sentAt = new Date();
  }

  private async sendNotification(alert: SyncAlert, channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case 'database':
        await this.sendDatabaseNotification(alert, channel);
        break;
      case 'email':
        await this.sendEmailNotification(alert, channel);
        break;
      case 'webhook':
        await this.sendWebhookNotification(alert, channel);
        break;
      case 'realtime':
        await this.sendRealtimeNotification(alert, channel);
        break;
      default:
        throw new Error(`Unsupported notification channel: ${channel.type}`);
    }
  }

  private async sendDatabaseNotification(alert: SyncAlert, channel: NotificationChannel): Promise<void> {
    // Store notification in database
    await this.prisma.integrationAuditLog.create({
      data: {
        integration_id: alert.integrationId,
        event_type: 'alert_notification',
        event_category: 'monitoring',
        severity: alert.severity,
        description: alert.title,
        details: {
          alertId: alert.id,
          alertType: alert.type,
          description: alert.description,
          trigger: alert.trigger,
          context: alert.context,
        },
        occurred_at: new Date(),
      },
    });
  }

  private async sendEmailNotification(alert: SyncAlert, channel: NotificationChannel): Promise<void> {
    // Email notification implementation would go here
    // For now, just log
    this.logger.log(`Email notification would be sent for alert: ${alert.id}`, {
      recipients: alert.notifications.recipients,
      subject: alert.title,
    });
  }

  private async sendWebhookNotification(alert: SyncAlert, channel: NotificationChannel): Promise<void> {
    // Webhook notification implementation would go here
    // For now, just log
    this.logger.log(`Webhook notification would be sent for alert: ${alert.id}`, {
      webhookUrl: channel.config?.url,
      alertType: alert.type,
    });
  }

  private async sendRealtimeNotification(alert: SyncAlert, channel: NotificationChannel): Promise<void> {
    // Emit real-time notification
    this.emit('alert:notification', {
      type: 'realtime',
      alert,
      timestamp: new Date(),
    });
  }

  // ===================================================================
  // ESCALATION MANAGEMENT
  // ===================================================================

  @Cron('*/5 * * * *') // Every 5 minutes
  private async processEscalations(): Promise<void> {
    if (!this.config.escalationEnabled) {
      return;
    }

    try {
      const now = new Date();
      const alerts = Array.from(this.activeAlerts.values());

      for (const alert of alerts) {
        if (alert.status !== 'active') {
          continue;
        }

        // Check if alert should be escalated
        const shouldEscalate = this.shouldEscalateAlert(alert, now);
        if (shouldEscalate) {
          await this.escalateAlert(alert);
        }
      }
    } catch (error) {
      this.logger.error(`Escalation processing failed: ${error.message}`, error.stack);
    }
  }

  private shouldEscalateAlert(alert: SyncAlert, now: Date): boolean {
    // Don't escalate if already escalated recently
    if (alert.escalation.escalatedAt && 
        (now.getTime() - alert.escalation.escalatedAt.getTime()) < 60 * 60 * 1000) { // 1 hour
      return false;
    }

    // Escalate critical alerts immediately if not acknowledged
    if (alert.severity === 'critical' && !alert.acknowledgedAt) {
      const ageMinutes = (now.getTime() - alert.createdAt.getTime()) / (1000 * 60);
      return ageMinutes > 15; // 15 minutes
    }

    // Escalate error alerts after 1 hour
    if (alert.severity === 'error' && !alert.acknowledgedAt) {
      const ageMinutes = (now.getTime() - alert.createdAt.getTime()) / (1000 * 60);
      return ageMinutes > 60; // 1 hour
    }

    return false;
  }

  private async escalateAlert(alert: SyncAlert): Promise<void> {
    alert.escalation.level++;
    alert.escalation.escalatedAt = new Date();

    // Set due date based on severity
    const dueInMinutes = alert.severity === 'critical' ? 60 : 240; // 1 hour or 4 hours
    alert.escalation.dueAt = new Date(Date.now() + dueInMinutes * 60 * 1000);

    await this.persistAlert(alert);

    this.logger.warn(`Alert escalated to level ${alert.escalation.level}: ${alert.id}`, {
      alertType: alert.type,
      severity: alert.severity,
      age: Date.now() - alert.createdAt.getTime(),
    });

    // Send escalation notifications
    await this.sendEscalationNotifications(alert);

    // Emit escalation event
    this.emit('alert:escalated', {
      alert,
      escalationLevel: alert.escalation.level,
    });
  }

  private async sendEscalationNotifications(alert: SyncAlert): Promise<void> {
    // Send to escalation recipients
    const escalationChannels = ['email', 'webhook']; // More urgent channels
    
    const escalationAlert = {
      ...alert,
      title: `[ESCALATED] ${alert.title}`,
      description: `${alert.description}\n\nThis alert has been escalated to level ${alert.escalation.level}.`,
      notifications: {
        ...alert.notifications,
        channels: escalationChannels,
      },
    } as SyncAlert;

    await this.sendNotifications(escalationAlert);
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    description: string,
    context: AlertContext,
    trigger: SyncAlert['trigger'],
  ): Promise<SyncAlert> {
    const alertId = this.generateAlertId();
    
    const alert: SyncAlert = {
      id: alertId,
      integrationId: context.integrationId,
      type,
      severity,
      title,
      description,
      trigger: {
        ...trigger,
        evaluatedAt: new Date(),
      },
      context: {
        sessionId: context.sessionId,
        entityType: context.entityType,
        entityId: context.entityId,
        relatedAlerts: [],
        metadata: context.metadata,
      },
      status: 'active',
      escalation: {
        level: 0,
        escalationRules: this.getEscalationRules(type, severity),
      },
      notifications: {
        channels: this.getNotificationChannels(type, severity),
        recipients: this.getNotificationRecipients(type, severity),
        sent: false,
        retryCount: 0,
        deliveryStatus: {},
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return alert;
  }

  private async processAlert(alert: SyncAlert): Promise<void> {
    // Store in active alerts
    this.activeAlerts.set(alert.id, alert);

    // Persist to database
    await this.persistAlert(alert);

    // Send notifications
    await this.sendNotifications(alert);

    // Update rate limiting counters
    this.updateAlertCounter(alert.integrationId);

    // Emit alert created event
    this.emit('alert:created', { alert });
  }

  private async persistAlert(alert: SyncAlert): Promise<void> {
    try {
      await this.prisma.integrationAuditLog.upsert({
        where: { id: alert.id },
        create: {
          id: alert.id,
          integration_id: alert.integrationId,
          event_type: 'sync_alert',
          event_category: 'monitoring',
          severity: alert.severity,
          description: alert.title,
          details: alert,
          entity_type: alert.context.entityType,
          entity_id: alert.context.entityId,
          correlation_id: alert.context.sessionId,
          occurred_at: alert.createdAt,
        },
        update: {
          severity: alert.severity,
          details: alert,
          updated_at: alert.updatedAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist alert: ${error.message}`, error.stack);
    }
  }

  private isDuplicateAlert(alert: SyncAlert): boolean {
    const now = new Date();
    const suppressionWindow = this.config.defaultSuppressionWindow * 60 * 1000; // minutes to ms
    
    return Array.from(this.activeAlerts.values()).some(existingAlert => 
      existingAlert.type === alert.type &&
      existingAlert.integrationId === alert.integrationId &&
      existingAlert.context.sessionId === alert.context.sessionId &&
      (now.getTime() - existingAlert.createdAt.getTime()) < suppressionWindow
    );
  }

  private canTriggerAlert(integrationId: string): boolean {
    const now = new Date();
    const counter = this.hourlyAlertCounts.get(integrationId);

    if (!counter || now > counter.resetTime) {
      // Reset counter
      this.hourlyAlertCounts.set(integrationId, {
        count: 0,
        resetTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
      });
      return true;
    }

    return counter.count < this.config.maxAlertsPerHour;
  }

  private updateAlertCounter(integrationId: string): void {
    const counter = this.hourlyAlertCounts.get(integrationId);
    if (counter) {
      counter.count++;
    }
  }

  private generateSuppressionKey(type: AlertType, context: AlertContext): string {
    return `${type}:${context.integrationId}:${context.sessionId || 'global'}`;
  }

  private addToHistory(alert: SyncAlert): void {
    if (!this.alertHistory.has(alert.integrationId)) {
      this.alertHistory.set(alert.integrationId, []);
    }
    
    const history = this.alertHistory.get(alert.integrationId)!;
    history.push(alert);
    
    // Keep only last 100 alerts
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private getNotificationChannels(type: AlertType, severity: AlertSeverity): ('email' | 'webhook' | 'database' | 'realtime')[] {
    const channels: ('email' | 'webhook' | 'database' | 'realtime')[] = ['database', 'realtime'];
    
    if (severity === 'critical') {
      channels.push('email', 'webhook');
    } else if (severity === 'error') {
      channels.push('email');
    }
    
    return channels;
  }

  private getNotificationRecipients(type: AlertType, severity: AlertSeverity): string[] {
    // This would be configurable in a real implementation
    return ['admin@example.com'];
  }

  private getEscalationRules(type: AlertType, severity: AlertSeverity): string[] {
    return [`${severity}_${type}_escalation`];
  }

  private initializeDefaultRules(): void {
    // This would load rules from configuration or database
    this.logger.debug('Default alert rules initialized');
  }

  private initializeNotificationChannels(): void {
    // Database notifications
    this.notificationChannels.set('database', {
      type: 'database',
      config: {},
      enabled: true,
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        timeoutMs: 5000,
      },
    });

    // Real-time notifications
    this.notificationChannels.set('realtime', {
      type: 'realtime',
      config: {},
      enabled: true,
      retryPolicy: {
        maxRetries: 1,
        backoffMultiplier: 1,
        timeoutMs: 1000,
      },
    });
  }

  private startAlertEvaluation(): void {
    // Alert evaluation would be triggered by external events
    this.logger.debug('Alert evaluation service started');
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultConfig(): AlertingConfig {
    return {
      enabled: true,
      evaluationInterval: 60, // seconds
      maxAlertsPerHour: 50,
      suppressDuplicates: true,
      defaultSuppressionWindow: 15, // minutes
      escalationEnabled: true,
      notificationRetries: 3,
      batchNotifications: false,
    };
  }
}
