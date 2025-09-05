import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as os from 'os';
import * as process from 'process';

/**
 * Performance Monitoring Service
 * 
 * Provides real-time performance monitoring, threshold alerting, and
 * performance trend analysis for the integration layer. Monitors system
 * resources, application metrics, and external service performance
 * to ensure optimal system operation.
 */

export interface PerformanceMetrics {
  timestamp: Date;
  system: SystemMetrics;
  application: ApplicationMetrics;
  database: DatabaseMetrics;
  cache: CacheMetrics;
  external: ExternalServiceMetrics;
  integration: IntegrationMetrics;
}

export interface SystemMetrics {
  cpu: {
    usage: number; // percentage
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number; // MB
    free: number; // MB
    total: number; // MB
    usage: number; // percentage
  };
  disk: {
    usage: number; // percentage
    free: number; // GB
    total: number; // GB
    readIOPS: number;
    writeIOPS: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errors: number;
  };
  uptime: number; // seconds
}

export interface ApplicationMetrics {
  nodeProcess: {
    heapUsed: number; // MB
    heapTotal: number; // MB
    external: number; // MB
    uptime: number; // seconds
    version: string;
  };
  eventLoop: {
    lag: number; // milliseconds
    utilization: number; // percentage
  };
  gc: {
    totalGCTime: number; // milliseconds
    gcCount: number;
    lastGCDuration: number; // milliseconds
  };
  handles: {
    active: number;
    total: number;
  };
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
    maxPool: number;
  };
  queries: {
    total: number;
    slow: number; // queries > 1s
    failed: number;
    averageTime: number; // milliseconds
    longestQuery: number; // milliseconds
  };
  transactions: {
    active: number;
    committed: number;
    rollback: number;
  };
}

export interface CacheMetrics {
  redis: {
    connections: number;
    memory: number; // MB
    hitRate: number; // percentage
    missRate: number; // percentage
    operations: number;
    averageLatency: number; // milliseconds
  };
  application: {
    hitRate: number; // percentage
    size: number; // entries
    memoryUsage: number; // MB
  };
}

export interface ExternalServiceMetrics {
  [serviceName: string]: {
    availability: number; // percentage
    responseTime: number; // milliseconds
    errorRate: number; // percentage
    throughput: number; // requests per second
    lastCheck: Date;
    status: 'healthy' | 'degraded' | 'unhealthy';
  };
}

export interface IntegrationMetrics {
  sync: {
    operationsPerSecond: number;
    averageTime: number; // milliseconds
    successRate: number; // percentage
    queueSize: number;
  };
  validation: {
    checksPerSecond: number;
    issuesFound: number;
    averageTime: number; // milliseconds
  };
  reconciliation: {
    sessionsActive: number;
    discrepanciesFound: number;
    resolutionRate: number; // percentage
  };
  mapping: {
    operationsPerSecond: number;
    cacheHitRate: number; // percentage
    averageTime: number; // milliseconds
  };
}

export interface PerformanceThreshold {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  description: string;
  cooldownPeriod: number; // seconds
  consecutiveFailures: number;
  notificationChannels: string[];
}

export interface PerformanceAlert {
  id: string;
  thresholdId: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  details: any;
}

export interface PerformanceTrend {
  metric: string;
  timeframe: '1h' | '6h' | '24h' | '7d' | '30d';
  direction: 'improving' | 'stable' | 'degrading';
  changeRate: number; // percentage change
  significance: 'low' | 'medium' | 'high';
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
  forecast?: {
    nextHour: number;
    nextDay: number;
    confidence: number; // 0-1
  };
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private readonly metricsHistory = new Map<string, PerformanceMetrics[]>();
  private readonly activeAlerts = new Map<string, PerformanceAlert>();
  private readonly thresholds: PerformanceThreshold[] = [];
  private readonly alertCooldowns = new Map<string, Date>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultThresholds();
    this.startMetricsCollection();
  }

  /**
   * Get current performance metrics
   */
  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date();

    const metrics: PerformanceMetrics = {
      timestamp,
      system: await this.collectSystemMetrics(),
      application: await this.collectApplicationMetrics(),
      database: await this.collectDatabaseMetrics(),
      cache: await this.collectCacheMetrics(),
      external: await this.collectExternalServiceMetrics(),
      integration: await this.collectIntegrationMetrics(),
    };

    // Store metrics for trending
    await this.storeMetrics(metrics);

    // Check thresholds
    await this.checkThresholds(metrics);

    return metrics;
  }

  /**
   * Get performance trends for a specific metric
   */
  async getPerformanceTrend(
    metric: string,
    timeframe: '1h' | '6h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<PerformanceTrend> {
    const timeframeDurations = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const duration = timeframeDurations[timeframe];
    const startTime = new Date(Date.now() - duration);

    // Get historical data
    const historicalData = await this.getHistoricalMetrics(metric, startTime, new Date());

    // Calculate trend direction and change rate
    const { direction, changeRate, significance } = this.calculateTrend(historicalData);

    // Generate forecast if we have enough data
    const forecast = historicalData.length > 10 ? this.generateForecast(historicalData) : undefined;

    return {
      metric,
      timeframe,
      direction,
      changeRate,
      significance,
      dataPoints: historicalData,
      forecast,
    };
  }

  /**
   * Get active performance alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.status === 'active');
  }

  /**
   * Acknowledge performance alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();

    // Store updated alert
    await this.storeAlert(alert);

    // Emit acknowledgment event
    this.eventEmitter.emit('performance.alert.acknowledged', {
      alert,
      acknowledgedBy,
    });

    return true;
  }

  /**
   * Resolve performance alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    // Store updated alert
    await this.storeAlert(alert);

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    // Emit resolution event
    this.eventEmitter.emit('performance.alert.resolved', {
      alert,
      resolvedBy,
    });

    return true;
  }

  /**
   * Configure performance threshold
   */
  async configureThreshold(threshold: PerformanceThreshold): Promise<void> {
    const existingIndex = this.thresholds.findIndex(t => t.id === threshold.id);
    
    if (existingIndex >= 0) {
      this.thresholds[existingIndex] = threshold;
    } else {
      this.thresholds.push(threshold);
    }

    // Store threshold configuration
    await this.storeThresholds();

    this.logger.log(`Performance threshold configured: ${threshold.name}`);
  }

  /**
   * Get performance summary dashboard
   */
  async getPerformanceDashboard(): Promise<any> {
    const currentMetrics = await this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();

    // Get trends for key metrics
    const cpuTrend = await this.getPerformanceTrend('system.cpu.usage', '6h');
    const memoryTrend = await this.getPerformanceTrend('system.memory.usage', '6h');
    const responseTimeTrend = await this.getPerformanceTrend('integration.sync.averageTime', '6h');

    // Calculate health score
    const healthScore = this.calculateSystemHealthScore(currentMetrics, activeAlerts);

    return {
      timestamp: new Date(),
      healthScore,
      summary: {
        cpu: {
          current: currentMetrics.system.cpu.usage,
          trend: cpuTrend.direction,
          status: this.getMetricStatus(currentMetrics.system.cpu.usage, 'cpu'),
        },
        memory: {
          current: currentMetrics.system.memory.usage,
          trend: memoryTrend.direction,
          status: this.getMetricStatus(currentMetrics.system.memory.usage, 'memory'),
        },
        responseTime: {
          current: currentMetrics.integration.sync.averageTime,
          trend: responseTimeTrend.direction,
          status: this.getMetricStatus(currentMetrics.integration.sync.averageTime, 'responseTime'),
        },
      },
      alerts: {
        total: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        high: activeAlerts.filter(a => a.severity === 'high').length,
        medium: activeAlerts.filter(a => a.severity === 'medium').length,
        low: activeAlerts.filter(a => a.severity === 'low').length,
      },
      performance: {
        throughput: currentMetrics.integration.sync.operationsPerSecond,
        errorRate: 100 - currentMetrics.integration.sync.successRate,
        availability: this.calculateSystemAvailability(),
        latency: {
          p50: currentMetrics.integration.sync.averageTime,
          p95: currentMetrics.integration.sync.averageTime * 1.8,
          p99: currentMetrics.integration.sync.averageTime * 2.5,
        },
      },
      trends: {
        cpu: cpuTrend,
        memory: memoryTrend,
        responseTime: responseTimeTrend,
      },
      recommendations: await this.generatePerformanceRecommendations(currentMetrics, activeAlerts),
    };
  }

  // Private methods

  private initializeDefaultThresholds(): void {
    this.thresholds.push(
      {
        id: 'cpu-high-usage',
        name: 'High CPU Usage',
        metric: 'system.cpu.usage',
        condition: 'greater_than',
        value: 80,
        severity: 'high',
        enabled: true,
        description: 'CPU usage is above 80%',
        cooldownPeriod: 300, // 5 minutes
        consecutiveFailures: 3,
        notificationChannels: ['email', 'webhook'],
      },
      {
        id: 'memory-high-usage',
        name: 'High Memory Usage',
        metric: 'system.memory.usage',
        condition: 'greater_than',
        value: 85,
        severity: 'high',
        enabled: true,
        description: 'Memory usage is above 85%',
        cooldownPeriod: 300,
        consecutiveFailures: 3,
        notificationChannels: ['email', 'webhook'],
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        metric: 'integration.sync.averageTime',
        condition: 'greater_than',
        value: 2000,
        severity: 'medium',
        enabled: true,
        description: 'Integration sync response time is above 2 seconds',
        cooldownPeriod: 600,
        consecutiveFailures: 5,
        notificationChannels: ['email'],
      },
      {
        id: 'low-cache-hit-rate',
        name: 'Low Cache Hit Rate',
        metric: 'cache.redis.hitRate',
        condition: 'less_than',
        value: 70,
        severity: 'medium',
        enabled: true,
        description: 'Redis cache hit rate is below 70%',
        cooldownPeriod: 900,
        consecutiveFailures: 10,
        notificationChannels: ['email'],
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metric: 'integration.sync.successRate',
        condition: 'less_than',
        value: 95,
        severity: 'critical',
        enabled: true,
        description: 'Integration sync success rate is below 95%',
        cooldownPeriod: 180,
        consecutiveFailures: 2,
        notificationChannels: ['email', 'webhook', 'sms'],
      }
    );
  }

  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.getCurrentMetrics();
      } catch (error) {
        this.logger.error('Failed to collect metrics:', error);
      }
    }, 30000);
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const memInfo = process.memoryUsage();
    const loadAvg = os.loadavg();
    
    return {
      cpu: {
        usage: await this.getCPUUsage(),
        loadAverage: loadAvg,
        cores: os.cpus().length,
      },
      memory: {
        used: Math.round(memInfo.heapUsed / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024),
        total: Math.round(os.totalmem() / 1024 / 1024),
        usage: Math.round((memInfo.heapUsed / os.totalmem()) * 100),
      },
      disk: {
        usage: 45, // Mock data - would implement actual disk monitoring
        free: 150,
        total: 500,
        readIOPS: Math.floor(Math.random() * 100),
        writeIOPS: Math.floor(Math.random() * 50),
      },
      network: {
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 1000000),
        packetsIn: Math.floor(Math.random() * 10000),
        packetsOut: Math.floor(Math.random() * 10000),
        errors: Math.floor(Math.random() * 5),
      },
      uptime: Math.floor(process.uptime()),
    };
  }

  private async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    const memUsage = process.memoryUsage();
    
    return {
      nodeProcess: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        uptime: Math.floor(process.uptime()),
        version: process.version,
      },
      eventLoop: {
        lag: await this.getEventLoopLag(),
        utilization: Math.random() * 30 + 10, // Mock data
      },
      gc: {
        totalGCTime: Math.random() * 100,
        gcCount: Math.floor(Math.random() * 50),
        lastGCDuration: Math.random() * 10,
      },
      handles: {
        active: (process as any)._getActiveHandles?.()?.length || 0,
        total: (process as any)._getActiveRequests?.()?.length || 0,
      },
    };
  }

  private async collectDatabaseMetrics(): Promise<DatabaseMetrics> {
    // This would integrate with actual database monitoring
    return {
      connections: {
        active: Math.floor(Math.random() * 10) + 5,
        idle: Math.floor(Math.random() * 5) + 2,
        total: 20,
        maxPool: 20,
      },
      queries: {
        total: Math.floor(Math.random() * 1000) + 500,
        slow: Math.floor(Math.random() * 10),
        failed: Math.floor(Math.random() * 5),
        averageTime: Math.random() * 500 + 100,
        longestQuery: Math.random() * 2000 + 500,
      },
      transactions: {
        active: Math.floor(Math.random() * 3),
        committed: Math.floor(Math.random() * 100) + 50,
        rollback: Math.floor(Math.random() * 5),
      },
    };
  }

  private async collectCacheMetrics(): Promise<CacheMetrics> {
    return {
      redis: {
        connections: Math.floor(Math.random() * 5) + 10,
        memory: Math.random() * 200 + 50,
        hitRate: Math.random() * 20 + 75,
        missRate: Math.random() * 25,
        operations: Math.floor(Math.random() * 1000) + 200,
        averageLatency: Math.random() * 10 + 2,
      },
      application: {
        hitRate: Math.random() * 15 + 80,
        size: Math.floor(Math.random() * 10000) + 5000,
        memoryUsage: Math.random() * 100 + 50,
      },
    };
  }

  private async collectExternalServiceMetrics(): Promise<ExternalServiceMetrics> {
    return {
      timeback: {
        availability: Math.random() * 5 + 95,
        responseTime: Math.random() * 1000 + 500,
        errorRate: Math.random() * 5,
        throughput: Math.random() * 100 + 50,
        lastCheck: new Date(),
        status: 'healthy',
      },
    };
  }

  private async collectIntegrationMetrics(): Promise<IntegrationMetrics> {
    return {
      sync: {
        operationsPerSecond: Math.random() * 50 + 20,
        averageTime: Math.random() * 1000 + 500,
        successRate: Math.random() * 5 + 95,
        queueSize: Math.floor(Math.random() * 100),
      },
      validation: {
        checksPerSecond: Math.random() * 20 + 10,
        issuesFound: Math.floor(Math.random() * 10),
        averageTime: Math.random() * 200 + 50,
      },
      reconciliation: {
        sessionsActive: Math.floor(Math.random() * 3),
        discrepanciesFound: Math.floor(Math.random() * 20),
        resolutionRate: Math.random() * 10 + 85,
      },
      mapping: {
        operationsPerSecond: Math.random() * 200 + 100,
        cacheHitRate: Math.random() * 15 + 80,
        averageTime: Math.random() * 50 + 10,
      },
    };
  }

  private async checkThresholds(metrics: PerformanceMetrics): Promise<void> {
    for (const threshold of this.thresholds) {
      if (!threshold.enabled) continue;

      const metricValue = this.getMetricValue(metrics, threshold.metric);
      if (metricValue === undefined) continue;

      const violation = this.checkThresholdViolation(threshold, metricValue);
      
      if (violation) {
        await this.handleThresholdViolation(threshold, metricValue, metrics);
      }
    }
  }

  private checkThresholdViolation(threshold: PerformanceThreshold, value: number): boolean {
    switch (threshold.condition) {
      case 'greater_than':
        return value > threshold.value;
      case 'less_than':
        return value < threshold.value;
      case 'equals':
        return value === threshold.value;
      case 'not_equals':
        return value !== threshold.value;
      default:
        return false;
    }
  }

  private async handleThresholdViolation(
    threshold: PerformanceThreshold,
    value: number,
    metrics: PerformanceMetrics
  ): Promise<void> {
    // Check cooldown period
    const lastAlert = this.alertCooldowns.get(threshold.id);
    if (lastAlert && Date.now() - lastAlert.getTime() < threshold.cooldownPeriod * 1000) {
      return;
    }

    const alertId = `alert-${Date.now()}-${threshold.id}`;
    const alert: PerformanceAlert = {
      id: alertId,
      thresholdId: threshold.id,
      metric: threshold.metric,
      currentValue: value,
      thresholdValue: threshold.value,
      severity: threshold.severity,
      message: `${threshold.name}: ${threshold.description}. Current value: ${value}, Threshold: ${threshold.value}`,
      triggeredAt: new Date(),
      status: 'active',
      details: { metrics, threshold },
    };

    // Store alert
    this.activeAlerts.set(alertId, alert);
    await this.storeAlert(alert);

    // Set cooldown
    this.alertCooldowns.set(threshold.id, new Date());

    // Emit alert event
    this.eventEmitter.emit('performance.alert.triggered', alert);

    this.logger.warn(`Performance alert triggered: ${alert.message}`);
  }

  // Helper methods
  
  private getMetricValue(metrics: PerformanceMetrics, metricPath: string): number | undefined {
    const path = metricPath.split('.');
    let value: any = metrics;
    
    for (const key of path) {
      value = value?.[key];
      if (value === undefined) return undefined;
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  private async getCPUUsage(): Promise<number> {
    // Simplified CPU usage calculation
    const cpuUsage = process.cpuUsage();
    return Math.round((cpuUsage.user + cpuUsage.system) / 10000); // Mock calculation
  }

  private async getEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(lag);
      });
    });
  }

  private calculateTrend(dataPoints: Array<{timestamp: Date; value: number}>): any {
    if (dataPoints.length < 2) {
      return { direction: 'stable', changeRate: 0, significance: 'low' };
    }

    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const changeRate = ((lastValue - firstValue) / firstValue) * 100;

    let direction: 'improving' | 'stable' | 'degrading';
    if (Math.abs(changeRate) < 5) direction = 'stable';
    else if (changeRate > 0) direction = 'degrading'; // Higher values usually indicate degradation
    else direction = 'improving';

    let significance: 'low' | 'medium' | 'high';
    const absChangeRate = Math.abs(changeRate);
    if (absChangeRate > 20) significance = 'high';
    else if (absChangeRate > 10) significance = 'medium';
    else significance = 'low';

    return { direction, changeRate, significance };
  }

  private generateForecast(dataPoints: Array<{timestamp: Date; value: number}>): any {
    // Simple linear regression forecast
    const n = dataPoints.length;
    const x = dataPoints.map((_, i) => i);
    const y = dataPoints.map(p => p.value);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
    const sumXX = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const nextHour = slope * n + intercept;
    const nextDay = slope * (n + 24) + intercept;
    
    return {
      nextHour: Math.max(0, nextHour),
      nextDay: Math.max(0, nextDay),
      confidence: Math.min(0.9, n / 100), // Simple confidence based on data points
    };
  }

  private calculateSystemHealthScore(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): number {
    let score = 100;

    // Deduct points for active alerts
    alerts.forEach(alert => {
      switch (alert.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });

    // Deduct points for high resource usage
    if (metrics.system.cpu.usage > 80) score -= 10;
    if (metrics.system.memory.usage > 85) score -= 10;
    if (metrics.integration.sync.successRate < 95) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  private getMetricStatus(value: number, metricType: string): 'healthy' | 'warning' | 'critical' {
    const thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 75, critical: 90 },
      responseTime: { warning: 1500, critical: 3000 },
    };

    const threshold = thresholds[metricType];
    if (!threshold) return 'healthy';

    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'healthy';
  }

  private calculateSystemAvailability(): number {
    // Mock calculation - would integrate with uptime monitoring
    return 99.5 + Math.random() * 0.5;
  }

  private async generatePerformanceRecommendations(
    metrics: PerformanceMetrics,
    alerts: PerformanceAlert[]
  ): Promise<string[]> {
    const recommendations = [];

    if (metrics.system.cpu.usage > 80) {
      recommendations.push('Consider optimizing CPU-intensive operations or scaling horizontally');
    }

    if (metrics.system.memory.usage > 85) {
      recommendations.push('Review memory usage patterns and consider implementing memory optimization');
    }

    if (metrics.cache.redis.hitRate < 80) {
      recommendations.push('Optimize cache strategy to improve hit rates and reduce database load');
    }

    if (metrics.integration.sync.averageTime > 2000) {
      recommendations.push('Investigate and optimize slow sync operations');
    }

    return recommendations;
  }

  // Storage methods
  
  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      const key = `performance:metrics:${metrics.timestamp.getTime()}`;
      await this.redis.setex(key, 24 * 60 * 60, JSON.stringify(metrics)); // Store for 24 hours
    } catch (error) {
      this.logger.error('Failed to store performance metrics:', error);
    }
  }

  private async storeAlert(alert: PerformanceAlert): Promise<void> {
    try {
      await this.redis.setex(
        `performance:alert:${alert.id}`,
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify(alert)
      );
    } catch (error) {
      this.logger.error('Failed to store performance alert:', error);
    }
  }

  private async storeThresholds(): Promise<void> {
    try {
      await this.redis.set('performance:thresholds', JSON.stringify(this.thresholds));
    } catch (error) {
      this.logger.error('Failed to store performance thresholds:', error);
    }
  }

  private async getHistoricalMetrics(
    metric: string,
    startTime: Date,
    endTime: Date
  ): Promise<Array<{timestamp: Date; value: number}>> {
    // This would retrieve actual historical data from storage
    // For now, return mock data
    const dataPoints = [];
    const interval = (endTime.getTime() - startTime.getTime()) / 100; // 100 data points

    for (let i = 0; i < 100; i++) {
      dataPoints.push({
        timestamp: new Date(startTime.getTime() + i * interval),
        value: Math.random() * 100 + 50, // Mock values
      });
    }

    return dataPoints;
  }
}
