/**
 * API Performance Monitoring Service
 * 
 * Advanced performance tracking for external APIs including request latency analysis,
 * error rate monitoring, usage analytics, baseline establishment, and trend analysis.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'events';
import { ApiResponse, ApiError } from '../../clients/base-api-client';

// ===================================================================
// PERFORMANCE MONITORING TYPES AND INTERFACES
// ===================================================================

export interface PerformanceMetrics {
  timestamp: Date;
  service: string;
  endpoint?: string;
  method: string;
  
  // Response time metrics
  responseTime: number;
  dnsLookup?: number;
  tcpConnection?: number;
  tlsHandshake?: number;
  serverProcessing: number;
  contentTransfer: number;
  
  // Request/response details
  requestSize: number;
  responseSize: number;
  statusCode: number;
  success: boolean;
  
  // Error details
  errorType?: string;
  errorMessage?: string;
  retryCount?: number;
  
  // Context
  requestId: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceBaseline {
  service: string;
  endpoint?: string;
  method: string;
  
  // Response time baselines (in milliseconds)
  responseTime: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    p99_9: number;
    min: number;
    max: number;
    stdDev: number;
  };
  
  // Throughput baselines
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  
  // Error rate baselines
  errorRate: {
    overall: number;
    by4xx: number;
    by5xx: number;
    byTimeout: number;
    byNetwork: number;
  };
  
  // Establishment details
  establishedAt: Date;
  sampleSize: number;
  confidenceLevel: number;
  validUntil: Date;
}

export interface PerformanceAlert {
  id: string;
  service: string;
  endpoint?: string;
  alertType: 'response_time' | 'error_rate' | 'throughput' | 'availability';
  severity: 'info' | 'warning' | 'critical';
  
  title: string;
  description: string;
  
  // Threshold information
  threshold: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
    value: number;
    unit: string;
  };
  
  // Current state
  currentValue: number;
  deviation: number;        // Percentage deviation from baseline
  
  // Timing
  triggeredAt: Date;
  resolvedAt?: Date;
  duration?: number;
  
  // Context
  context: {
    baseline?: number;
    sampleSize: number;
    timeWindow: string;
    relatedMetrics?: Record<string, number>;
  };
}

export interface UsageAnalytics {
  service: string;
  timeWindow: {
    start: Date;
    end: Date;
    duration: number;      // in milliseconds
  };
  
  // Request volume
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;          // requests per second
  };
  
  // Response times
  responseTime: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    distribution: { bucket: string; count: number }[];
  };
  
  // Status codes
  statusCodes: Record<string, number>;
  
  // Errors
  errors: {
    total: number;
    rate: number;          // errors per second
    byType: Record<string, number>;
    topErrors: { error: string; count: number; percentage: number }[];
  };
  
  // Endpoints
  endpoints: {
    name: string;
    requests: number;
    averageResponseTime: number;
    errorRate: number;
  }[];
  
  // Users (if available)
  users: {
    total: number;
    active: number;
    requestsPerUser: number;
  };
  
  // Trends
  trends: {
    requestVolume: 'increasing' | 'decreasing' | 'stable';
    responseTime: 'improving' | 'degrading' | 'stable';
    errorRate: 'improving' | 'degrading' | 'stable';
    confidence: number;
  };
}

export interface PerformanceReport {
  id: string;
  service: string;
  reportType: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  
  // Executive summary
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    availability: number;
    sla: {
      target: number;
      actual: number;
      met: boolean;
    };
  };
  
  // Detailed analytics
  analytics: UsageAnalytics;
  
  // Baselines comparison
  baselineComparison: {
    responseTime: {
      current: number;
      baseline: number;
      change: number;
      status: 'improved' | 'degraded' | 'stable';
    };
    errorRate: {
      current: number;
      baseline: number;
      change: number;
      status: 'improved' | 'degraded' | 'stable';
    };
    throughput: {
      current: number;
      baseline: number;
      change: number;
      status: 'improved' | 'degraded' | 'stable';
    };
  };
  
  // Incidents and issues
  incidents: PerformanceAlert[];
  
  // Recommendations
  recommendations: {
    category: 'performance' | 'reliability' | 'capacity';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    impact: string;
  }[];
  
  generatedAt: Date;
  generatedBy: string;
}

// ===================================================================
// API PERFORMANCE MONITORING SERVICE
// ===================================================================

@Injectable()
export class ApiPerformanceService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(ApiPerformanceService.name);
  
  // Storage for performance data
  private readonly metrics = new Map<string, PerformanceMetrics[]>();
  private readonly baselines = new Map<string, PerformanceBaseline>();
  private readonly alerts = new Map<string, PerformanceAlert[]>();
  private readonly reports = new Map<string, PerformanceReport[]>();
  
  // Configuration
  private readonly maxMetricsPerService = 10000;
  private readonly baselineUpdateInterval = 60 * 60 * 1000; // 1 hour
  private readonly alertCheckInterval = 30 * 1000;          // 30 seconds
  private readonly dataRetentionDays = 30;
  
  // Cleanup and maintenance
  private cleanupInterval: NodeJS.Timeout;
  private baselineUpdateTimer: NodeJS.Timeout;
  private alertCheckTimer: NodeJS.Timeout;

  constructor() {
    super();
  }

  async onModuleInit() {
    this.startMaintenanceProcesses();
    this.logger.log('API Performance Service initialized');
  }

  // ===================================================================
  // PERFORMANCE METRICS COLLECTION
  // ===================================================================

  /**
   * Record performance metrics for an API request
   */
  recordMetrics(
    service: string,
    endpoint: string,
    method: string,
    metrics: Partial<PerformanceMetrics>,
  ): void {
    const completeMetrics: PerformanceMetrics = {
      timestamp: new Date(),
      service,
      endpoint,
      method: method.toUpperCase(),
      responseTime: metrics.responseTime || 0,
      serverProcessing: metrics.serverProcessing || metrics.responseTime || 0,
      contentTransfer: metrics.contentTransfer || 0,
      requestSize: metrics.requestSize || 0,
      responseSize: metrics.responseSize || 0,
      statusCode: metrics.statusCode || 200,
      success: metrics.success !== undefined ? metrics.success : (metrics.statusCode || 200) < 400,
      requestId: metrics.requestId || this.generateRequestId(),
      userId: metrics.userId,
      sessionId: metrics.sessionId,
      errorType: metrics.errorType,
      errorMessage: metrics.errorMessage,
      retryCount: metrics.retryCount || 0,
      metadata: metrics.metadata || {},
      ...metrics,
    };

    // Store metrics
    let serviceMetrics = this.metrics.get(service) || [];
    serviceMetrics.push(completeMetrics);
    
    // Limit storage size
    if (serviceMetrics.length > this.maxMetricsPerService) {
      serviceMetrics = serviceMetrics.slice(-this.maxMetricsPerService / 2);
    }
    
    this.metrics.set(service, serviceMetrics);

    // Emit event for real-time processing
    this.emit('metrics:recorded', {
      service,
      endpoint,
      method,
      metrics: completeMetrics,
    });

    this.logger.debug(`Performance metrics recorded for ${service}/${endpoint}`, {
      responseTime: completeMetrics.responseTime,
      statusCode: completeMetrics.statusCode,
      success: completeMetrics.success,
    });
  }

  /**
   * Record metrics from API response
   */
  recordFromApiResponse(
    service: string,
    endpoint: string,
    method: string,
    response: ApiResponse<any>,
    startTime: number,
  ): void {
    const responseTime = Date.now() - startTime;
    
    this.recordMetrics(service, endpoint, method, {
      responseTime,
      statusCode: response.status,
      success: response.status < 400,
      requestId: response.requestId,
      serverProcessing: responseTime,
      responseSize: this.estimateResponseSize(response.data),
      metadata: {
        cached: response.cached,
        headers: response.headers,
      },
    });
  }

  /**
   * Record metrics from API error
   */
  recordFromApiError(
    service: string,
    endpoint: string,
    method: string,
    error: ApiError,
    startTime: number,
  ): void {
    const responseTime = Date.now() - startTime;
    
    this.recordMetrics(service, endpoint, method, {
      responseTime,
      statusCode: error.status || 0,
      success: false,
      requestId: error.requestId,
      errorType: this.categorizeError(error),
      errorMessage: error.message,
      retryCount: error.retryCount || 0,
      serverProcessing: responseTime,
      metadata: {
        isRetryable: error.isRetryable,
        code: error.code,
      },
    });
  }

  // ===================================================================
  // BASELINE ESTABLISHMENT AND MANAGEMENT
  // ===================================================================

  /**
   * Establish performance baseline for a service
   */
  async establishBaseline(
    service: string,
    endpoint?: string,
    method?: string,
    options?: {
      minSampleSize?: number;
      lookbackHours?: number;
      confidenceLevel?: number;
    },
  ): Promise<PerformanceBaseline> {
    const opts = {
      minSampleSize: 100,
      lookbackHours: 24,
      confidenceLevel: 0.95,
      ...options,
    };

    const metrics = this.getFilteredMetrics(service, endpoint, method, opts.lookbackHours);
    
    if (metrics.length < opts.minSampleSize) {
      throw new Error(`Insufficient data for baseline (${metrics.length} samples, need ${opts.minSampleSize})`);
    }

    const baseline = this.calculateBaseline(service, endpoint, method, metrics, opts.confidenceLevel);
    
    // Store baseline
    const key = this.getBaselineKey(service, endpoint, method);
    this.baselines.set(key, baseline);

    this.logger.log(`Performance baseline established for ${key}`, {
      sampleSize: baseline.sampleSize,
      meanResponseTime: baseline.responseTime.mean,
      p95ResponseTime: baseline.responseTime.p95,
      errorRate: baseline.errorRate.overall,
    });

    this.emit('baseline:established', {
      service,
      endpoint,
      method,
      baseline,
    });

    return baseline;
  }

  /**
   * Get performance baseline
   */
  getBaseline(service: string, endpoint?: string, method?: string): PerformanceBaseline | null {
    const key = this.getBaselineKey(service, endpoint, method);
    return this.baselines.get(key) || null;
  }

  /**
   * Update all baselines
   */
  async updateBaselines(): Promise<void> {
    this.logger.debug('Updating performance baselines');

    const services = new Set(Array.from(this.metrics.keys()));
    
    for (const service of services) {
      try {
        // Update service-level baseline
        await this.establishBaseline(service);
        
        // Update endpoint-specific baselines
        const serviceMetrics = this.metrics.get(service) || [];
        const endpoints = new Set(
          serviceMetrics
            .filter(m => m.endpoint)
            .map(m => `${m.endpoint}:${m.method}`)
        );

        for (const endpointMethod of endpoints) {
          const [endpoint, method] = endpointMethod.split(':');
          try {
            await this.establishBaseline(service, endpoint, method);
          } catch (error) {
            this.logger.debug(`Skipped baseline update for ${service}/${endpoint}:${method}: ${error.message}`);
          }
        }

      } catch (error) {
        this.logger.warn(`Failed to update baseline for ${service}: ${error.message}`);
      }
    }

    this.logger.debug('Baseline update completed');
  }

  // ===================================================================
  // PERFORMANCE ANALYSIS
  // ===================================================================

  /**
   * Analyze current performance against baseline
   */
  analyzePerformance(
    service: string,
    endpoint?: string,
    method?: string,
    timeWindow?: number,
  ): {
    current: UsageAnalytics;
    baseline?: PerformanceBaseline;
    comparison: {
      responseTime: { status: 'improved' | 'degraded' | 'stable'; change: number };
      errorRate: { status: 'improved' | 'degraded' | 'stable'; change: number };
      throughput: { status: 'improved' | 'degraded' | 'stable'; change: number };
    };
    alerts: PerformanceAlert[];
  } {
    const windowMs = timeWindow || 60 * 60 * 1000; // Default 1 hour
    const current = this.generateUsageAnalytics(service, endpoint, method, windowMs);
    const baseline = this.getBaseline(service, endpoint, method);
    
    let comparison = {
      responseTime: { status: 'stable' as const, change: 0 },
      errorRate: { status: 'stable' as const, change: 0 },
      throughput: { status: 'stable' as const, change: 0 },
    };

    if (baseline) {
      // Response time comparison
      const responseTimeChange = ((current.responseTime.mean - baseline.responseTime.mean) / baseline.responseTime.mean) * 100;
      comparison.responseTime = {
        status: responseTimeChange > 10 ? 'degraded' : responseTimeChange < -10 ? 'improved' : 'stable',
        change: responseTimeChange,
      };

      // Error rate comparison
      const errorRateChange = ((current.errors.rate - baseline.errorRate.overall) / baseline.errorRate.overall) * 100;
      comparison.errorRate = {
        status: errorRateChange > 10 ? 'degraded' : errorRateChange < -10 ? 'improved' : 'stable',
        change: errorRateChange,
      };

      // Throughput comparison
      const throughputChange = ((current.requests.rate - baseline.throughput.requestsPerSecond) / baseline.throughput.requestsPerSecond) * 100;
      comparison.throughput = {
        status: throughputChange < -10 ? 'degraded' : throughputChange > 10 ? 'improved' : 'stable',
        change: throughputChange,
      };
    }

    const alerts = this.checkPerformanceAlerts(service, endpoint, method, current, baseline);

    return {
      current,
      baseline,
      comparison,
      alerts,
    };
  }

  /**
   * Generate usage analytics
   */
  generateUsageAnalytics(
    service: string,
    endpoint?: string,
    method?: string,
    timeWindowMs?: number,
  ): UsageAnalytics {
    const windowMs = timeWindowMs || 60 * 60 * 1000; // Default 1 hour
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - windowMs);

    const metrics = this.getFilteredMetrics(service, endpoint, method, windowMs / (60 * 60 * 1000));
    
    if (metrics.length === 0) {
      return this.createEmptyAnalytics(service, startTime, endTime);
    }

    const successfulRequests = metrics.filter(m => m.success);
    const failedRequests = metrics.filter(m => !m.success);
    
    const responseTimes = metrics.map(m => m.responseTime).filter(rt => rt > 0);
    
    // Status code distribution
    const statusCodes: Record<string, number> = {};
    metrics.forEach(m => {
      const code = m.statusCode.toString();
      statusCodes[code] = (statusCodes[code] || 0) + 1;
    });

    // Error analysis
    const errorsByType: Record<string, number> = {};
    failedRequests.forEach(m => {
      if (m.errorType) {
        errorsByType[m.errorType] = (errorsByType[m.errorType] || 0) + 1;
      }
    });

    const topErrors = Object.entries(errorsByType)
      .map(([error, count]) => ({
        error,
        count,
        percentage: (count / failedRequests.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Response time distribution
    const distribution = this.calculateResponseTimeDistribution(responseTimes);

    // Endpoint analysis
    const endpointStats = new Map<string, { requests: number; totalTime: number; errors: number }>();
    metrics.forEach(m => {
      if (m.endpoint) {
        const key = `${m.endpoint}:${m.method}`;
        const stat = endpointStats.get(key) || { requests: 0, totalTime: 0, errors: 0 };
        stat.requests++;
        stat.totalTime += m.responseTime;
        if (!m.success) stat.errors++;
        endpointStats.set(key, stat);
      }
    });

    const endpoints = Array.from(endpointStats.entries()).map(([key, stat]) => {
      const [endpointName] = key.split(':');
      return {
        name: endpointName,
        requests: stat.requests,
        averageResponseTime: stat.totalTime / stat.requests,
        errorRate: (stat.errors / stat.requests) * 100,
      };
    });

    // User analysis
    const uniqueUsers = new Set(metrics.filter(m => m.userId).map(m => m.userId)).size;
    const uniqueSessions = new Set(metrics.filter(m => m.sessionId).map(m => m.sessionId)).size;

    return {
      service,
      timeWindow: {
        start: startTime,
        end: endTime,
        duration: windowMs,
      },
      requests: {
        total: metrics.length,
        successful: successfulRequests.length,
        failed: failedRequests.length,
        rate: metrics.length / (windowMs / 1000),
      },
      responseTime: {
        mean: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
        median: this.calculatePercentile(responseTimes, 0.5),
        p95: this.calculatePercentile(responseTimes, 0.95),
        p99: this.calculatePercentile(responseTimes, 0.99),
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        distribution,
      },
      statusCodes,
      errors: {
        total: failedRequests.length,
        rate: failedRequests.length / (windowMs / 1000),
        byType: errorsByType,
        topErrors,
      },
      endpoints,
      users: {
        total: uniqueUsers,
        active: uniqueSessions,
        requestsPerUser: uniqueUsers > 0 ? metrics.length / uniqueUsers : 0,
      },
      trends: this.calculateTrends(service, endpoint, method),
    };
  }

  // ===================================================================
  // PERFORMANCE ALERTING
  // ===================================================================

  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts(
    service: string,
    endpoint?: string,
    method?: string,
    current?: UsageAnalytics,
    baseline?: PerformanceBaseline,
  ): PerformanceAlert[] {
    const analytics = current || this.generateUsageAnalytics(service, endpoint, method);
    const alerts: PerformanceAlert[] = [];

    // Response time alerts
    if (baseline && analytics.responseTime.p95 > baseline.responseTime.p95 * 1.5) {
      alerts.push({
        id: this.generateAlertId(),
        service,
        endpoint,
        alertType: 'response_time',
        severity: 'warning',
        title: 'Elevated Response Time',
        description: `P95 response time (${analytics.responseTime.p95.toFixed(2)}ms) is 50% above baseline (${baseline.responseTime.p95.toFixed(2)}ms)`,
        threshold: {
          metric: 'p95_response_time',
          operator: '<',
          value: baseline.responseTime.p95 * 1.5,
          unit: 'ms',
        },
        currentValue: analytics.responseTime.p95,
        deviation: ((analytics.responseTime.p95 - baseline.responseTime.p95) / baseline.responseTime.p95) * 100,
        triggeredAt: new Date(),
        context: {
          baseline: baseline.responseTime.p95,
          sampleSize: analytics.requests.total,
          timeWindow: '1 hour',
        },
      });
    }

    // Error rate alerts
    if (analytics.errors.rate > 0.1) { // More than 0.1 errors per second
      const severity = analytics.errors.rate > 1 ? 'critical' : 'warning';
      alerts.push({
        id: this.generateAlertId(),
        service,
        endpoint,
        alertType: 'error_rate',
        severity,
        title: 'High Error Rate',
        description: `Error rate (${analytics.errors.rate.toFixed(3)}/sec) is elevated`,
        threshold: {
          metric: 'error_rate',
          operator: '<',
          value: 0.1,
          unit: 'errors/sec',
        },
        currentValue: analytics.errors.rate,
        deviation: baseline ? ((analytics.errors.rate - baseline.errorRate.overall) / baseline.errorRate.overall) * 100 : 0,
        triggeredAt: new Date(),
        context: {
          baseline: baseline?.errorRate.overall,
          sampleSize: analytics.requests.total,
          timeWindow: '1 hour',
        },
      });
    }

    // Throughput alerts
    if (baseline && analytics.requests.rate < baseline.throughput.requestsPerSecond * 0.5) {
      alerts.push({
        id: this.generateAlertId(),
        service,
        endpoint,
        alertType: 'throughput',
        severity: 'warning',
        title: 'Low Throughput',
        description: `Request rate (${analytics.requests.rate.toFixed(3)}/sec) is 50% below baseline (${baseline.throughput.requestsPerSecond.toFixed(3)}/sec)`,
        threshold: {
          metric: 'throughput',
          operator: '>',
          value: baseline.throughput.requestsPerSecond * 0.5,
          unit: 'req/sec',
        },
        currentValue: analytics.requests.rate,
        deviation: ((analytics.requests.rate - baseline.throughput.requestsPerSecond) / baseline.throughput.requestsPerSecond) * 100,
        triggeredAt: new Date(),
        context: {
          baseline: baseline.throughput.requestsPerSecond,
          sampleSize: analytics.requests.total,
          timeWindow: '1 hour',
        },
      });
    }

    // Store alerts
    if (alerts.length > 0) {
      const key = this.getBaselineKey(service, endpoint, method);
      let serviceAlerts = this.alerts.get(key) || [];
      serviceAlerts.push(...alerts);
      this.alerts.set(key, serviceAlerts);

      // Emit alert events
      alerts.forEach(alert => {
        this.emit('performance:alert', {
          service,
          endpoint,
          method,
          alert,
        });

        this.logger.warn(`[PERFORMANCE ALERT] ${alert.title}`, {
          service,
          endpoint,
          severity: alert.severity,
          currentValue: alert.currentValue,
          threshold: alert.threshold.value,
        });
      });
    }

    return alerts;
  }

  // ===================================================================
  // REPORTING
  // ===================================================================

  /**
   * Generate performance report
   */
  generatePerformanceReport(
    service: string,
    reportType: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily',
    customPeriod?: { start: Date; end: Date },
  ): PerformanceReport {
    const period = this.calculateReportPeriod(reportType, customPeriod);
    const analytics = this.generateUsageAnalytics(
      service,
      undefined,
      undefined,
      period.end.getTime() - period.start.getTime(),
    );
    
    const baseline = this.getBaseline(service);
    const incidents = this.getAlertsInPeriod(service, period.start, period.end);
    
    const report: PerformanceReport = {
      id: this.generateReportId(),
      service,
      reportType,
      period,
      summary: {
        totalRequests: analytics.requests.total,
        averageResponseTime: analytics.responseTime.mean,
        errorRate: (analytics.errors.total / analytics.requests.total) * 100,
        availability: ((analytics.requests.successful / analytics.requests.total) * 100) || 100,
        sla: {
          target: 99.9, // Default SLA target
          actual: ((analytics.requests.successful / analytics.requests.total) * 100) || 100,
          met: ((analytics.requests.successful / analytics.requests.total) * 100) >= 99.9,
        },
      },
      analytics,
      baselineComparison: this.calculateBaselineComparison(analytics, baseline),
      incidents,
      recommendations: this.generateRecommendations(analytics, baseline, incidents),
      generatedAt: new Date(),
      generatedBy: 'ApiPerformanceService',
    };

    // Store report
    let serviceReports = this.reports.get(service) || [];
    serviceReports.push(report);
    serviceReports = serviceReports.slice(-100); // Keep last 100 reports
    this.reports.set(service, serviceReports);

    this.emit('report:generated', {
      service,
      reportType,
      report,
    });

    return report;
  }

  // ===================================================================
  // PUBLIC API METHODS
  // ===================================================================

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(service: string, limit?: number): PerformanceMetrics[] {
    const metrics = this.metrics.get(service) || [];
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(service: string): {
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
    lastActivity: Date;
    status: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const metrics = this.getCurrentMetrics(service, 100);
    
    if (metrics.length === 0) {
      return {
        requestCount: 0,
        averageResponseTime: 0,
        errorRate: 0,
        lastActivity: new Date(0),
        status: 'healthy',
      };
    }

    const successfulRequests = metrics.filter(m => m.success);
    const responseTimes = metrics.filter(m => m.responseTime > 0).map(m => m.responseTime);
    const errorRate = ((metrics.length - successfulRequests.length) / metrics.length) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errorRate > 10) {
      status = 'unhealthy';
    } else if (errorRate > 5 || (responseTimes.length > 0 && responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length > 2000)) {
      status = 'degraded';
    }

    return {
      requestCount: metrics.length,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length : 0,
      errorRate,
      lastActivity: new Date(Math.max(...metrics.map(m => m.timestamp.getTime()))),
      status,
    };
  }

  /**
   * Get all service summaries
   */
  getAllServiceSummaries(): Map<string, ReturnType<typeof this.getPerformanceSummary>> {
    const summaries = new Map();
    
    for (const service of this.metrics.keys()) {
      summaries.set(service, this.getPerformanceSummary(service));
    }
    
    return summaries;
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private getFilteredMetrics(
    service: string,
    endpoint?: string,
    method?: string,
    lookbackHours = 24,
  ): PerformanceMetrics[] {
    const cutoffTime = Date.now() - (lookbackHours * 60 * 60 * 1000);
    let metrics = (this.metrics.get(service) || [])
      .filter(m => m.timestamp.getTime() >= cutoffTime);

    if (endpoint) {
      metrics = metrics.filter(m => m.endpoint === endpoint);
    }

    if (method) {
      metrics = metrics.filter(m => m.method === method.toUpperCase());
    }

    return metrics;
  }

  private calculateBaseline(
    service: string,
    endpoint: string | undefined,
    method: string | undefined,
    metrics: PerformanceMetrics[],
    confidenceLevel: number,
  ): PerformanceBaseline {
    const responseTimes = metrics.map(m => m.responseTime).filter(rt => rt > 0);
    const successfulRequests = metrics.filter(m => m.success);
    const failedRequests = metrics.filter(m => !m.success);
    
    const errors4xx = metrics.filter(m => m.statusCode >= 400 && m.statusCode < 500);
    const errors5xx = metrics.filter(m => m.statusCode >= 500);
    const errorTimeouts = metrics.filter(m => m.errorType === 'timeout');
    const errorNetwork = metrics.filter(m => m.errorType === 'network');

    // Calculate time window
    const timestamps = metrics.map(m => m.timestamp.getTime());
    const timeWindowMs = Math.max(...timestamps) - Math.min(...timestamps);
    const timeWindowSeconds = timeWindowMs / 1000;

    return {
      service,
      endpoint,
      method,
      responseTime: {
        mean: this.calculateMean(responseTimes),
        median: this.calculatePercentile(responseTimes, 0.5),
        p95: this.calculatePercentile(responseTimes, 0.95),
        p99: this.calculatePercentile(responseTimes, 0.99),
        p99_9: this.calculatePercentile(responseTimes, 0.999),
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        stdDev: this.calculateStandardDeviation(responseTimes),
      },
      throughput: {
        requestsPerSecond: metrics.length / timeWindowSeconds,
        requestsPerMinute: (metrics.length / timeWindowSeconds) * 60,
        requestsPerHour: (metrics.length / timeWindowSeconds) * 3600,
      },
      errorRate: {
        overall: (failedRequests.length / metrics.length) * 100,
        by4xx: (errors4xx.length / metrics.length) * 100,
        by5xx: (errors5xx.length / metrics.length) * 100,
        byTimeout: (errorTimeouts.length / metrics.length) * 100,
        byNetwork: (errorNetwork.length / metrics.length) * 100,
      },
      establishedAt: new Date(),
      sampleSize: metrics.length,
      confidenceLevel,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
  }

  private calculateResponseTimeDistribution(responseTimes: number[]): { bucket: string; count: number }[] {
    const buckets = [
      { min: 0, max: 100, label: '0-100ms' },
      { min: 100, max: 500, label: '100-500ms' },
      { min: 500, max: 1000, label: '500ms-1s' },
      { min: 1000, max: 2000, label: '1-2s' },
      { min: 2000, max: 5000, label: '2-5s' },
      { min: 5000, max: Infinity, label: '5s+' },
    ];

    return buckets.map(bucket => ({
      bucket: bucket.label,
      count: responseTimes.filter(rt => rt >= bucket.min && rt < bucket.max).length,
    }));
  }

  private calculateTrends(
    service: string,
    endpoint?: string,
    method?: string,
  ): UsageAnalytics['trends'] {
    // Compare last hour with previous hour
    const recentMetrics = this.getFilteredMetrics(service, endpoint, method, 1);
    const previousMetrics = this.getFilteredMetrics(service, endpoint, method, 2)
      .filter(m => m.timestamp.getTime() < Date.now() - 60 * 60 * 1000);

    if (recentMetrics.length < 10 || previousMetrics.length < 10) {
      return {
        requestVolume: 'stable',
        responseTime: 'stable',
        errorRate: 'stable',
        confidence: 0.1,
      };
    }

    // Request volume trend
    const volumeChange = (recentMetrics.length - previousMetrics.length) / previousMetrics.length;
    const requestVolume = volumeChange > 0.1 ? 'increasing' : volumeChange < -0.1 ? 'decreasing' : 'stable';

    // Response time trend
    const recentAvgRT = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const previousAvgRT = previousMetrics.reduce((sum, m) => sum + m.responseTime, 0) / previousMetrics.length;
    const rtChange = (recentAvgRT - previousAvgRT) / previousAvgRT;
    const responseTime = rtChange > 0.1 ? 'degrading' : rtChange < -0.1 ? 'improving' : 'stable';

    // Error rate trend
    const recentErrors = recentMetrics.filter(m => !m.success).length / recentMetrics.length;
    const previousErrors = previousMetrics.filter(m => !m.success).length / previousMetrics.length;
    const errorChange = previousErrors === 0 ? 0 : (recentErrors - previousErrors) / previousErrors;
    const errorRate = errorChange > 0.1 ? 'degrading' : errorChange < -0.1 ? 'improving' : 'stable';

    const confidence = Math.min(recentMetrics.length / 100, 1); // Higher confidence with more data

    return {
      requestVolume,
      responseTime,
      errorRate,
      confidence,
    };
  }

  private calculateBaselineComparison(
    current: UsageAnalytics,
    baseline?: PerformanceBaseline,
  ): PerformanceReport['baselineComparison'] {
    if (!baseline) {
      return {
        responseTime: { current: current.responseTime.mean, baseline: 0, change: 0, status: 'stable' },
        errorRate: { current: current.errors.rate, baseline: 0, change: 0, status: 'stable' },
        throughput: { current: current.requests.rate, baseline: 0, change: 0, status: 'stable' },
      };
    }

    const responseTimeChange = ((current.responseTime.mean - baseline.responseTime.mean) / baseline.responseTime.mean) * 100;
    const errorRateChange = baseline.errorRate.overall === 0 ? 0 : 
      ((current.errors.rate - baseline.errorRate.overall) / baseline.errorRate.overall) * 100;
    const throughputChange = ((current.requests.rate - baseline.throughput.requestsPerSecond) / baseline.throughput.requestsPerSecond) * 100;

    return {
      responseTime: {
        current: current.responseTime.mean,
        baseline: baseline.responseTime.mean,
        change: responseTimeChange,
        status: responseTimeChange > 10 ? 'degraded' : responseTimeChange < -10 ? 'improved' : 'stable',
      },
      errorRate: {
        current: current.errors.rate,
        baseline: baseline.errorRate.overall,
        change: errorRateChange,
        status: errorRateChange > 10 ? 'degraded' : errorRateChange < -10 ? 'improved' : 'stable',
      },
      throughput: {
        current: current.requests.rate,
        baseline: baseline.throughput.requestsPerSecond,
        change: throughputChange,
        status: throughputChange < -10 ? 'degraded' : throughputChange > 10 ? 'improved' : 'stable',
      },
    };
  }

  private generateRecommendations(
    analytics: UsageAnalytics,
    baseline?: PerformanceBaseline,
    incidents: PerformanceAlert[] = [],
  ): PerformanceReport['recommendations'] {
    const recommendations: PerformanceReport['recommendations'] = [];

    // Performance recommendations
    if (analytics.responseTime.p95 > 2000) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Optimize Response Times',
        description: 'P95 response time exceeds 2 seconds, consider implementing caching or optimizing slow endpoints',
        impact: 'Improved user experience and reduced server load',
      });
    }

    if (analytics.errors.rate > 0.1) {
      recommendations.push({
        category: 'reliability',
        priority: incidents.some(i => i.severity === 'critical') ? 'high' : 'medium',
        title: 'Reduce Error Rate',
        description: `Error rate of ${analytics.errors.rate.toFixed(3)}/sec is elevated, investigate and fix failing requests`,
        impact: 'Improved service reliability and user satisfaction',
      });
    }

    if (baseline && analytics.requests.rate > baseline.throughput.requestsPerSecond * 0.8) {
      recommendations.push({
        category: 'capacity',
        priority: 'medium',
        title: 'Monitor Capacity',
        description: 'Request volume is approaching baseline capacity, consider scaling preparations',
        impact: 'Prevent performance degradation during peak loads',
      });
    }

    return recommendations;
  }

  // ===================================================================
  // STATISTICAL HELPER METHODS
  // ===================================================================

  private calculateMean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = this.calculateMean(values);
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = this.calculateMean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  private categorizeError(error: ApiError): string {
    if (!error.status) {
      if (error.code === 'ETIMEDOUT') return 'timeout';
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') return 'network';
      return 'network';
    }

    if (error.status === 429) return 'rate_limit';
    if (error.status === 408) return 'timeout';
    if (error.status >= 500) return 'server_error';
    if (error.status >= 400) return 'client_error';
    
    return 'unknown';
  }

  private estimateResponseSize(data: any): number {
    if (!data) return 0;
    return JSON.stringify(data).length;
  }

  private createEmptyAnalytics(service: string, start: Date, end: Date): UsageAnalytics {
    return {
      service,
      timeWindow: { start, end, duration: end.getTime() - start.getTime() },
      requests: { total: 0, successful: 0, failed: 0, rate: 0 },
      responseTime: { mean: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0, distribution: [] },
      statusCodes: {},
      errors: { total: 0, rate: 0, byType: {}, topErrors: [] },
      endpoints: [],
      users: { total: 0, active: 0, requestsPerUser: 0 },
      trends: { requestVolume: 'stable', responseTime: 'stable', errorRate: 'stable', confidence: 0 },
    };
  }

  private getBaselineKey(service: string, endpoint?: string, method?: string): string {
    let key = service;
    if (endpoint) key += `/${endpoint}`;
    if (method) key += `:${method.toUpperCase()}`;
    return key;
  }

  private calculateReportPeriod(
    reportType: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom',
    customPeriod?: { start: Date; end: Date },
  ): { start: Date; end: Date; label: string } {
    const now = new Date();
    
    if (reportType === 'custom' && customPeriod) {
      return {
        start: customPeriod.start,
        end: customPeriod.end,
        label: `${customPeriod.start.toISOString().split('T')[0]} to ${customPeriod.end.toISOString().split('T')[0]}`,
      };
    }

    let start: Date;
    let label: string;

    switch (reportType) {
      case 'hourly':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        label = 'Last Hour';
        break;
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        label = 'Last 7 Days';
        break;
      case 'monthly':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        label = 'Last 30 Days';
        break;
      default: // daily
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        label = 'Last 24 Hours';
    }

    return { start, end: now, label };
  }

  private getAlertsInPeriod(service: string, start: Date, end: Date): PerformanceAlert[] {
    const key = this.getBaselineKey(service);
    const alerts = this.alerts.get(key) || [];
    
    return alerts.filter(alert => 
      alert.triggeredAt >= start && alert.triggeredAt <= end
    );
  }

  private startMaintenanceProcesses(): void {
    // Cleanup old data
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Every hour

    // Update baselines
    this.baselineUpdateTimer = setInterval(() => {
      this.updateBaselines();
    }, this.baselineUpdateInterval);

    // Check for alerts
    this.alertCheckTimer = setInterval(() => {
      this.checkAllServiceAlerts();
    }, this.alertCheckInterval);
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (this.dataRetentionDays * 24 * 60 * 60 * 1000);

    // Clean up metrics
    for (const [service, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp.getTime() > cutoffTime);
      this.metrics.set(service, filteredMetrics);
    }

    // Clean up alerts
    for (const [key, alerts] of this.alerts.entries()) {
      const filteredAlerts = alerts.filter(a => a.triggeredAt.getTime() > cutoffTime);
      this.alerts.set(key, filteredAlerts);
    }

    this.logger.debug('Performance data cleanup completed');
  }

  private checkAllServiceAlerts(): void {
    for (const service of this.metrics.keys()) {
      try {
        this.checkPerformanceAlerts(service);
      } catch (error) {
        this.logger.error(`Failed to check alerts for ${service}: ${error.message}`);
      }
    }
  }

  private generateRequestId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===================================================================
  // CLEANUP
  // ===================================================================

  async onModuleDestroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.baselineUpdateTimer) clearInterval(this.baselineUpdateTimer);
    if (this.alertCheckTimer) clearInterval(this.alertCheckTimer);
    
    this.logger.log('API Performance Service destroyed');
  }
}
