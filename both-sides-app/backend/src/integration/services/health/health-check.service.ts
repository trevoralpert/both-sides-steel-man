/**
 * Health Check Service
 * 
 * Performs periodic health checks for external APIs with endpoint-specific monitoring,
 * response time tracking, availability monitoring, and comprehensive health reporting.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { BaseApiClient } from '../../clients/base-api-client';
import { TimeBackApiClient } from '../../clients/timeback-api-client';

// ===================================================================
// HEALTH CHECK TYPES AND INTERFACES
// ===================================================================

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded' | 'unknown';

export interface HealthCheckConfig {
  name: string;
  enabled: boolean;
  interval: number;                  // Check interval in milliseconds
  timeout: number;                   // Individual check timeout in ms
  retries: number;                   // Number of retries on failure
  retryDelay: number;               // Delay between retries in ms
  endpoints: HealthEndpointConfig[];
  thresholds: HealthThresholds;
  notifications: NotificationConfig;
}

export interface HealthEndpointConfig {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  headers?: Record<string, string>;
  body?: any;
  expectedStatus?: number[];         // Expected HTTP status codes
  expectedResponseTime?: number;     // Expected max response time in ms
  criticalEndpoint?: boolean;        // If true, failure affects overall health
  customValidator?: (response: any) => boolean;
}

export interface HealthThresholds {
  responseTime: {
    warning: number;                 // Warning threshold in ms
    critical: number;                // Critical threshold in ms
  };
  availability: {
    warning: number;                 // Warning threshold percentage
    critical: number;                // Critical threshold percentage
  };
  errorRate: {
    warning: number;                 // Warning threshold percentage
    critical: number;                // Critical threshold percentage
  };
}

export interface NotificationConfig {
  enabled: boolean;
  channels: ('email' | 'webhook' | 'database' | 'console')[];
  escalation: {
    enabled: boolean;
    levels: EscalationLevel[];
  };
}

export interface EscalationLevel {
  level: number;
  delay: number;                     // Delay before escalation in ms
  channels: ('email' | 'webhook' | 'database' | 'console')[];
  recipients?: string[];
}

export interface HealthCheckResult {
  id: string;
  timestamp: Date;
  service: string;
  endpoint: string;
  status: HealthStatus;
  responseTime: number;
  statusCode?: number;
  error?: string;
  details?: any;
  metadata: {
    attempt: number;
    totalAttempts: number;
    checkId: string;
  };
}

export interface ServiceHealthSummary {
  name: string;
  status: HealthStatus;
  lastCheck: Date;
  uptime: number;                    // Uptime percentage
  averageResponseTime: number;
  errorRate: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  endpointHealth: EndpointHealthSummary[];
  issues: HealthIssue[];
  trends: HealthTrend[];
}

export interface EndpointHealthSummary {
  name: string;
  url: string;
  status: HealthStatus;
  lastCheck: Date;
  responseTime: number;
  availability: number;              // Percentage
  recentResults: HealthCheckResult[];
}

export interface HealthIssue {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'response_time' | 'availability' | 'error_rate' | 'endpoint_down';
  title: string;
  description: string;
  firstSeen: Date;
  lastSeen: Date;
  count: number;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface HealthTrend {
  metric: 'response_time' | 'availability' | 'error_rate';
  direction: 'improving' | 'degrading' | 'stable';
  change: number;                    // Percentage change
  period: string;                    // Time period
  confidence: number;                // Confidence level (0-1)
}

export interface HealthMetrics {
  timestamp: Date;
  service: string;
  metrics: {
    responseTime: {
      min: number;
      max: number;
      avg: number;
      p95: number;
      p99: number;
    };
    availability: {
      uptime: number;
      downtime: number;
      percentage: number;
    };
    requests: {
      total: number;
      successful: number;
      failed: number;
      errorRate: number;
    };
    endpoints: Record<string, {
      status: HealthStatus;
      responseTime: number;
      availability: number;
      lastError?: string;
    }>;
  };
}

// ===================================================================
// HEALTH CHECK SERVICE
// ===================================================================

@Injectable()
export class HealthCheckService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly healthConfigs = new Map<string, HealthCheckConfig>();
  private readonly apiClients = new Map<string, BaseApiClient>();
  private readonly activeChecks = new Map<string, NodeJS.Timeout>();
  private readonly healthHistory = new Map<string, HealthCheckResult[]>();
  private readonly healthSummaries = new Map<string, ServiceHealthSummary>();
  private readonly healthIssues = new Map<string, HealthIssue[]>();
  private readonly metricsHistory = new Map<string, HealthMetrics[]>();

  constructor(
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.loadDefaultConfigurations();
    this.startCleanupProcess();
    this.logger.log('Health Check Service initialized');
  }

  // ===================================================================
  // CONFIGURATION MANAGEMENT
  // ===================================================================

  /**
   * Register health check configuration for a service
   */
  async registerHealthCheck(
    serviceName: string, 
    config: HealthCheckConfig,
    apiClient?: BaseApiClient,
  ): Promise<void> {
    this.logger.log(`Registering health check for service: ${serviceName}`, {
      endpoints: config.endpoints.length,
      interval: config.interval,
      enabled: config.enabled,
    });

    // Store configuration
    this.healthConfigs.set(serviceName, { ...config, name: serviceName });
    
    // Store API client if provided
    if (apiClient) {
      this.apiClients.set(serviceName, apiClient);
    }

    // Initialize health summary
    this.initializeHealthSummary(serviceName, config);

    // Start health checking if enabled
    if (config.enabled) {
      await this.startHealthCheck(serviceName);
    }

    this.emit('health-check:registered', {
      service: serviceName,
      config: this.sanitizeConfig(config),
    });
  }

  /**
   * Update health check configuration
   */
  async updateHealthCheckConfig(
    serviceName: string,
    updates: Partial<HealthCheckConfig>,
  ): Promise<void> {
    const existing = this.healthConfigs.get(serviceName);
    if (!existing) {
      throw new Error(`Health check configuration not found for service: ${serviceName}`);
    }

    const updated = { ...existing, ...updates };
    this.healthConfigs.set(serviceName, updated);

    // Restart health check with new configuration
    await this.stopHealthCheck(serviceName);
    
    if (updated.enabled) {
      await this.startHealthCheck(serviceName);
    }

    this.logger.log(`Health check configuration updated for: ${serviceName}`);

    this.emit('health-check:config-updated', {
      service: serviceName,
      updates: Object.keys(updates),
    });
  }

  /**
   * Enable/disable health check for a service
   */
  async toggleHealthCheck(serviceName: string, enabled: boolean): Promise<void> {
    const config = this.healthConfigs.get(serviceName);
    if (!config) {
      throw new Error(`Health check configuration not found for service: ${serviceName}`);
    }

    config.enabled = enabled;

    if (enabled) {
      await this.startHealthCheck(serviceName);
      this.logger.log(`Health check enabled for: ${serviceName}`);
    } else {
      await this.stopHealthCheck(serviceName);
      this.logger.log(`Health check disabled for: ${serviceName}`);
    }

    this.emit('health-check:toggled', { service: serviceName, enabled });
  }

  // ===================================================================
  // HEALTH CHECK EXECUTION
  // ===================================================================

  /**
   * Start periodic health checking for a service
   */
  private async startHealthCheck(serviceName: string): Promise<void> {
    const config = this.healthConfigs.get(serviceName);
    if (!config || !config.enabled) {
      return;
    }

    // Clear any existing interval
    await this.stopHealthCheck(serviceName);

    // Perform initial check
    await this.performHealthCheck(serviceName);

    // Schedule periodic checks
    const interval = setInterval(async () => {
      try {
        await this.performHealthCheck(serviceName);
      } catch (error) {
        this.logger.error(`Health check failed for ${serviceName}: ${error.message}`, error.stack);
      }
    }, config.interval);

    this.activeChecks.set(serviceName, interval);

    this.logger.debug(`Health check started for ${serviceName} (interval: ${config.interval}ms)`);
  }

  /**
   * Stop health checking for a service
   */
  private async stopHealthCheck(serviceName: string): Promise<void> {
    const interval = this.activeChecks.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.activeChecks.delete(serviceName);
      this.logger.debug(`Health check stopped for: ${serviceName}`);
    }
  }

  /**
   * Perform health check for all endpoints of a service
   */
  private async performHealthCheck(serviceName: string): Promise<ServiceHealthSummary> {
    const config = this.healthConfigs.get(serviceName);
    if (!config) {
      throw new Error(`Health check configuration not found for service: ${serviceName}`);
    }

    const checkId = this.generateCheckId();
    const startTime = Date.now();

    this.logger.debug(`Starting health check for service: ${serviceName}`, {
      checkId,
      endpoints: config.endpoints.length,
    });

    const endpointResults: HealthCheckResult[] = [];
    const endpointSummaries: EndpointHealthSummary[] = [];

    // Check each endpoint
    for (const endpoint of config.endpoints) {
      try {
        const result = await this.checkEndpoint(serviceName, endpoint, checkId);
        endpointResults.push(result);
        
        // Update endpoint summary
        const endpointSummary = await this.updateEndpointSummary(serviceName, endpoint.name, result);
        endpointSummaries.push(endpointSummary);

      } catch (error) {
        this.logger.error(`Endpoint check failed: ${serviceName}/${endpoint.name}`, {
          error: error.message,
          checkId,
        });

        // Create error result
        const errorResult: HealthCheckResult = {
          id: this.generateResultId(),
          timestamp: new Date(),
          service: serviceName,
          endpoint: endpoint.name,
          status: 'unhealthy',
          responseTime: -1,
          error: error.message,
          metadata: {
            attempt: 1,
            totalAttempts: config.retries + 1,
            checkId,
          },
        };

        endpointResults.push(errorResult);
      }
    }

    // Calculate overall service health
    const serviceHealth = this.calculateServiceHealth(serviceName, endpointResults, config);
    
    // Update service summary
    const serviceSummary = await this.updateServiceSummary(
      serviceName, 
      serviceHealth, 
      endpointResults,
      endpointSummaries,
    );

    // Store results
    this.storeHealthResults(serviceName, endpointResults);

    // Generate metrics
    await this.generateHealthMetrics(serviceName, serviceSummary);

    // Check for issues and alerts
    await this.analyzeHealthIssues(serviceName, serviceSummary);

    const executionTime = Date.now() - startTime;

    this.emit('health-check:completed', {
      service: serviceName,
      checkId,
      status: serviceHealth,
      endpointsChecked: config.endpoints.length,
      executionTime,
      summary: serviceSummary,
    });

    this.logger.debug(`Health check completed for ${serviceName}`, {
      checkId,
      status: serviceHealth,
      executionTime,
      endpointsChecked: config.endpoints.length,
    });

    return serviceSummary;
  }

  /**
   * Check individual endpoint health
   */
  private async checkEndpoint(
    serviceName: string,
    endpoint: HealthEndpointConfig,
    checkId: string,
  ): Promise<HealthCheckResult> {
    const config = this.healthConfigs.get(serviceName);
    if (!config) {
      throw new Error(`Health check configuration not found for service: ${serviceName}`);
    }

    let attempt = 0;
    let lastError: Error;

    // Retry logic
    while (attempt <= config.retries) {
      attempt++;

      try {
        const result = await this.executeEndpointCheck(serviceName, endpoint, checkId, attempt, config.retries + 1);
        
        if (result.status !== 'unhealthy') {
          return result; // Success or degraded
        }
        
        lastError = new Error(result.error || 'Endpoint check failed');
        
        // Wait before retry
        if (attempt <= config.retries) {
          await this.delay(config.retryDelay);
        }

      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= config.retries) {
          await this.delay(config.retryDelay);
        }
      }
    }

    // All retries failed
    throw lastError;
  }

  /**
   * Execute individual endpoint check
   */
  private async executeEndpointCheck(
    serviceName: string,
    endpoint: HealthEndpointConfig,
    checkId: string,
    attempt: number,
    totalAttempts: number,
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const config = this.healthConfigs.get(serviceName);
    
    try {
      // Use API client if available, otherwise use direct HTTP
      const apiClient = this.apiClients.get(serviceName);
      let response: any;
      let statusCode: number;

      if (apiClient) {
        // Use API client
        const apiResponse = await this.executeWithTimeout(
          () => this.callApiClientEndpoint(apiClient, endpoint),
          config!.timeout,
        );
        
        response = apiResponse.data;
        statusCode = apiResponse.status;
      } else {
        // Use direct HTTP call
        const httpResponse = await this.executeWithTimeout(
          () => this.callHttpEndpoint(endpoint),
          config!.timeout,
        );
        
        response = httpResponse.data;
        statusCode = httpResponse.status;
      }

      const responseTime = Date.now() - startTime;

      // Validate response
      const validationResult = this.validateEndpointResponse(
        endpoint,
        statusCode,
        responseTime,
        response,
      );

      return {
        id: this.generateResultId(),
        timestamp: new Date(),
        service: serviceName,
        endpoint: endpoint.name,
        status: validationResult.status,
        responseTime,
        statusCode,
        details: validationResult.details,
        error: validationResult.error,
        metadata: {
          attempt,
          totalAttempts,
          checkId,
        },
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        id: this.generateResultId(),
        timestamp: new Date(),
        service: serviceName,
        endpoint: endpoint.name,
        status: 'unhealthy',
        responseTime,
        error: error.message,
        metadata: {
          attempt,
          totalAttempts,
          checkId,
        },
      };
    }
  }

  /**
   * Validate endpoint response
   */
  private validateEndpointResponse(
    endpoint: HealthEndpointConfig,
    statusCode: number,
    responseTime: number,
    response: any,
  ): { status: HealthStatus; details?: any; error?: string } {
    // Check status code
    if (endpoint.expectedStatus && !endpoint.expectedStatus.includes(statusCode)) {
      return {
        status: 'unhealthy',
        error: `Unexpected status code: ${statusCode}`,
        details: { expectedStatus: endpoint.expectedStatus, actualStatus: statusCode },
      };
    }

    // Check response time
    if (endpoint.expectedResponseTime && responseTime > endpoint.expectedResponseTime) {
      return {
        status: 'degraded',
        error: `Slow response time: ${responseTime}ms`,
        details: { expectedResponseTime: endpoint.expectedResponseTime, actualResponseTime: responseTime },
      };
    }

    // Custom validation
    if (endpoint.customValidator) {
      try {
        const isValid = endpoint.customValidator(response);
        if (!isValid) {
          return {
            status: 'unhealthy',
            error: 'Custom validation failed',
            details: { response },
          };
        }
      } catch (validationError) {
        return {
          status: 'unhealthy',
          error: `Custom validation error: ${validationError.message}`,
          details: { validationError: validationError.message },
        };
      }
    }

    return {
      status: 'healthy',
      details: {
        statusCode,
        responseTime,
        validation: 'passed',
      },
    };
  }

  // ===================================================================
  // API CLIENT AND HTTP INTEGRATION
  // ===================================================================

  private async callApiClientEndpoint(
    apiClient: BaseApiClient,
    endpoint: HealthEndpointConfig,
  ): Promise<{ data: any; status: number }> {
    const url = this.extractPath(endpoint.url);
    
    switch (endpoint.method) {
      case 'GET':
        return await apiClient.get(url, { headers: endpoint.headers });
      case 'POST':
        return await apiClient.post(url, endpoint.body, { headers: endpoint.headers });
      case 'HEAD':
        // Use GET but ignore response body for HEAD requests
        const response = await apiClient.get(url, { headers: endpoint.headers });
        return { data: null, status: response.status };
      default:
        throw new Error(`Unsupported HTTP method: ${endpoint.method}`);
    }
  }

  private async callHttpEndpoint(
    endpoint: HealthEndpointConfig,
  ): Promise<{ data: any; status: number }> {
    const axios = require('axios');
    
    const config = {
      method: endpoint.method,
      url: endpoint.url,
      headers: endpoint.headers,
      data: endpoint.body,
      timeout: 30000, // Default timeout
      validateStatus: () => true, // Don't throw on any status code
    };

    const response = await axios(config);
    return { data: response.data, status: response.status };
  }

  // ===================================================================
  // HEALTH SUMMARY AND METRICS CALCULATION
  // ===================================================================

  private calculateServiceHealth(
    serviceName: string,
    results: HealthCheckResult[],
    config: HealthCheckConfig,
  ): HealthStatus {
    if (results.length === 0) {
      return 'unknown';
    }

    const criticalEndpoints = config.endpoints.filter(e => e.criticalEndpoint);
    const criticalResults = results.filter(r => 
      criticalEndpoints.some(e => e.name === r.endpoint)
    );

    // If any critical endpoint is unhealthy, service is unhealthy
    if (criticalResults.some(r => r.status === 'unhealthy')) {
      return 'unhealthy';
    }

    // If any endpoint is unhealthy, service is degraded
    if (results.some(r => r.status === 'unhealthy')) {
      return 'degraded';
    }

    // If any endpoint is degraded, service is degraded
    if (results.some(r => r.status === 'degraded')) {
      return 'degraded';
    }

    // All endpoints healthy
    if (results.every(r => r.status === 'healthy')) {
      return 'healthy';
    }

    return 'unknown';
  }

  private async updateServiceSummary(
    serviceName: string,
    status: HealthStatus,
    results: HealthCheckResult[],
    endpointSummaries: EndpointHealthSummary[],
  ): Promise<ServiceHealthSummary> {
    let summary = this.healthSummaries.get(serviceName);
    
    if (!summary) {
      summary = {
        name: serviceName,
        status,
        lastCheck: new Date(),
        uptime: 0,
        averageResponseTime: 0,
        errorRate: 0,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        endpointHealth: endpointSummaries,
        issues: [],
        trends: [],
      };
    }

    // Update basic stats
    summary.status = status;
    summary.lastCheck = new Date();
    summary.endpointHealth = endpointSummaries;

    // Calculate metrics from history
    const history = this.healthHistory.get(serviceName) || [];
    const recentHistory = history.slice(-100); // Last 100 checks

    if (recentHistory.length > 0) {
      summary.totalChecks = recentHistory.length;
      summary.successfulChecks = recentHistory.filter(r => r.status === 'healthy').length;
      summary.failedChecks = recentHistory.filter(r => r.status === 'unhealthy').length;
      summary.uptime = (summary.successfulChecks / summary.totalChecks) * 100;
      summary.errorRate = (summary.failedChecks / summary.totalChecks) * 100;
      
      const responseTimes = recentHistory.filter(r => r.responseTime > 0).map(r => r.responseTime);
      summary.averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;
    }

    // Calculate trends
    summary.trends = await this.calculateHealthTrends(serviceName, recentHistory);

    // Update issues (will be done in analyzeHealthIssues)
    this.healthSummaries.set(serviceName, summary);

    return summary;
  }

  private async updateEndpointSummary(
    serviceName: string,
    endpointName: string,
    result: HealthCheckResult,
  ): Promise<EndpointHealthSummary> {
    const history = this.healthHistory.get(serviceName) || [];
    const endpointHistory = history
      .filter(r => r.endpoint === endpointName)
      .slice(-20); // Last 20 checks for this endpoint

    const successfulChecks = endpointHistory.filter(r => r.status === 'healthy').length;
    const availability = endpointHistory.length > 0 
      ? (successfulChecks / endpointHistory.length) * 100 
      : 0;

    const config = this.healthConfigs.get(serviceName);
    const endpointConfig = config?.endpoints.find(e => e.name === endpointName);

    return {
      name: endpointName,
      url: endpointConfig?.url || 'unknown',
      status: result.status,
      lastCheck: result.timestamp,
      responseTime: result.responseTime,
      availability,
      recentResults: endpointHistory.slice(-10), // Last 10 results
    };
  }

  private async calculateHealthTrends(
    serviceName: string,
    history: HealthCheckResult[],
  ): Promise<HealthTrend[]> {
    const trends: HealthTrend[] = [];
    
    if (history.length < 10) {
      return trends; // Need at least 10 data points
    }

    // Calculate response time trend
    const responseTimes = history.filter(r => r.responseTime > 0).map(r => r.responseTime);
    if (responseTimes.length >= 10) {
      const recentAvg = responseTimes.slice(-5).reduce((sum, time) => sum + time, 0) / 5;
      const olderAvg = responseTimes.slice(-10, -5).reduce((sum, time) => sum + time, 0) / 5;
      const change = ((recentAvg - olderAvg) / olderAvg) * 100;

      trends.push({
        metric: 'response_time',
        direction: change > 5 ? 'degrading' : change < -5 ? 'improving' : 'stable',
        change,
        period: '5 checks',
        confidence: Math.min(responseTimes.length / 20, 1), // Higher confidence with more data
      });
    }

    // Calculate availability trend
    const recentAvailability = history.slice(-5).filter(r => r.status === 'healthy').length / 5;
    const olderAvailability = history.slice(-10, -5).filter(r => r.status === 'healthy').length / 5;
    const availabilityChange = ((recentAvailability - olderAvailability) / olderAvailability) * 100;

    trends.push({
      metric: 'availability',
      direction: availabilityChange > 5 ? 'improving' : availabilityChange < -5 ? 'degrading' : 'stable',
      change: availabilityChange,
      period: '5 checks',
      confidence: Math.min(history.length / 20, 1),
    });

    return trends;
  }

  private async generateHealthMetrics(
    serviceName: string,
    summary: ServiceHealthSummary,
  ): Promise<void> {
    const history = this.healthHistory.get(serviceName) || [];
    const recentHistory = history.slice(-100);

    if (recentHistory.length === 0) {
      return;
    }

    const responseTimes = recentHistory.filter(r => r.responseTime > 0).map(r => r.responseTime);
    const successfulChecks = recentHistory.filter(r => r.status === 'healthy').length;
    const failedChecks = recentHistory.filter(r => r.status === 'unhealthy').length;

    const metrics: HealthMetrics = {
      timestamp: new Date(),
      service: serviceName,
      metrics: {
        responseTime: {
          min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
          max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
          avg: responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
          p95: this.calculatePercentile(responseTimes, 0.95),
          p99: this.calculatePercentile(responseTimes, 0.99),
        },
        availability: {
          uptime: summary.uptime,
          downtime: 100 - summary.uptime,
          percentage: summary.uptime,
        },
        requests: {
          total: recentHistory.length,
          successful: successfulChecks,
          failed: failedChecks,
          errorRate: summary.errorRate,
        },
        endpoints: {},
      },
    };

    // Add endpoint-specific metrics
    for (const endpointSummary of summary.endpointHealth) {
      metrics.metrics.endpoints[endpointSummary.name] = {
        status: endpointSummary.status,
        responseTime: endpointSummary.responseTime,
        availability: endpointSummary.availability,
        lastError: endpointSummary.recentResults.find(r => r.error)?.error,
      };
    }

    // Store metrics
    let metricsHistory = this.metricsHistory.get(serviceName) || [];
    metricsHistory.push(metrics);
    
    // Keep only recent metrics (last 1000)
    if (metricsHistory.length > 1000) {
      metricsHistory = metricsHistory.slice(-500);
    }
    
    this.metricsHistory.set(serviceName, metricsHistory);

    this.emit('health-metrics:generated', {
      service: serviceName,
      metrics,
    });
  }

  // ===================================================================
  // HEALTH ISSUE ANALYSIS AND ALERTING
  // ===================================================================

  private async analyzeHealthIssues(
    serviceName: string,
    summary: ServiceHealthSummary,
  ): Promise<void> {
    const config = this.healthConfigs.get(serviceName);
    if (!config) return;

    const issues: HealthIssue[] = [];
    const now = new Date();

    // Check response time issues
    if (summary.averageResponseTime > config.thresholds.responseTime.critical) {
      issues.push({
        id: `${serviceName}-response-time-critical`,
        severity: 'critical',
        type: 'response_time',
        title: 'Critical Response Time',
        description: `Average response time (${summary.averageResponseTime.toFixed(2)}ms) exceeds critical threshold (${config.thresholds.responseTime.critical}ms)`,
        firstSeen: now,
        lastSeen: now,
        count: 1,
        resolved: false,
      });
    } else if (summary.averageResponseTime > config.thresholds.responseTime.warning) {
      issues.push({
        id: `${serviceName}-response-time-warning`,
        severity: 'warning',
        type: 'response_time',
        title: 'Slow Response Time',
        description: `Average response time (${summary.averageResponseTime.toFixed(2)}ms) exceeds warning threshold (${config.thresholds.responseTime.warning}ms)`,
        firstSeen: now,
        lastSeen: now,
        count: 1,
        resolved: false,
      });
    }

    // Check availability issues
    if (summary.uptime < config.thresholds.availability.critical) {
      issues.push({
        id: `${serviceName}-availability-critical`,
        severity: 'critical',
        type: 'availability',
        title: 'Critical Availability',
        description: `Service availability (${summary.uptime.toFixed(2)}%) is below critical threshold (${config.thresholds.availability.critical}%)`,
        firstSeen: now,
        lastSeen: now,
        count: 1,
        resolved: false,
      });
    } else if (summary.uptime < config.thresholds.availability.warning) {
      issues.push({
        id: `${serviceName}-availability-warning`,
        severity: 'warning',
        type: 'availability',
        title: 'Low Availability',
        description: `Service availability (${summary.uptime.toFixed(2)}%) is below warning threshold (${config.thresholds.availability.warning}%)`,
        firstSeen: now,
        lastSeen: now,
        count: 1,
        resolved: false,
      });
    }

    // Check error rate issues
    if (summary.errorRate > config.thresholds.errorRate.critical) {
      issues.push({
        id: `${serviceName}-error-rate-critical`,
        severity: 'critical',
        type: 'error_rate',
        title: 'Critical Error Rate',
        description: `Error rate (${summary.errorRate.toFixed(2)}%) exceeds critical threshold (${config.thresholds.errorRate.critical}%)`,
        firstSeen: now,
        lastSeen: now,
        count: 1,
        resolved: false,
      });
    } else if (summary.errorRate > config.thresholds.errorRate.warning) {
      issues.push({
        id: `${serviceName}-error-rate-warning`,
        severity: 'warning',
        type: 'error_rate',
        title: 'High Error Rate',
        description: `Error rate (${summary.errorRate.toFixed(2)}%) exceeds warning threshold (${config.thresholds.errorRate.warning}%)`,
        firstSeen: now,
        lastSeen: now,
        count: 1,
        resolved: false,
      });
    }

    // Check for endpoint-specific issues
    for (const endpoint of summary.endpointHealth) {
      if (endpoint.status === 'unhealthy') {
        issues.push({
          id: `${serviceName}-${endpoint.name}-down`,
          severity: 'critical',
          type: 'endpoint_down',
          title: 'Endpoint Down',
          description: `Endpoint ${endpoint.name} (${endpoint.url}) is unhealthy`,
          firstSeen: now,
          lastSeen: now,
          count: 1,
          resolved: false,
        });
      }
    }

    // Merge with existing issues
    const existingIssues = this.healthIssues.get(serviceName) || [];
    const mergedIssues = this.mergeHealthIssues(existingIssues, issues);
    
    // Update issues
    this.healthIssues.set(serviceName, mergedIssues);
    summary.issues = mergedIssues.filter(issue => !issue.resolved);

    // Send notifications if needed
    if (config.notifications.enabled && issues.length > 0) {
      await this.sendHealthNotifications(serviceName, issues, summary);
    }

    // Emit events for new issues
    for (const issue of issues) {
      this.emit('health-issue:detected', {
        service: serviceName,
        issue,
        summary,
      });
    }
  }

  private mergeHealthIssues(
    existing: HealthIssue[],
    newIssues: HealthIssue[],
  ): HealthIssue[] {
    const merged = [...existing];
    
    for (const newIssue of newIssues) {
      const existingIssue = merged.find(issue => issue.id === newIssue.id);
      
      if (existingIssue) {
        // Update existing issue
        existingIssue.lastSeen = newIssue.lastSeen;
        existingIssue.count++;
        existingIssue.resolved = false;
        existingIssue.resolvedAt = undefined;
      } else {
        // Add new issue
        merged.push(newIssue);
      }
    }

    // Mark issues as resolved if they're not in new issues
    const newIssueIds = new Set(newIssues.map(issue => issue.id));
    for (const issue of merged) {
      if (!newIssueIds.has(issue.id) && !issue.resolved) {
        issue.resolved = true;
        issue.resolvedAt = new Date();
      }
    }

    return merged;
  }

  private async sendHealthNotifications(
    serviceName: string,
    issues: HealthIssue[],
    summary: ServiceHealthSummary,
  ): Promise<void> {
    // This would integrate with notification systems
    // For now, just log and emit events
    
    for (const issue of issues) {
      if (issue.severity === 'critical') {
        this.logger.error(`[HEALTH ALERT] ${serviceName}: ${issue.title}`, {
          description: issue.description,
          service: serviceName,
          severity: issue.severity,
        });
      } else {
        this.logger.warn(`[HEALTH WARNING] ${serviceName}: ${issue.title}`, {
          description: issue.description,
          service: serviceName,
          severity: issue.severity,
        });
      }

      this.emit('health-notification:sent', {
        service: serviceName,
        issue,
        channels: ['console'], // Would include actual channels
      });
    }
  }

  // ===================================================================
  // PUBLIC API METHODS
  // ===================================================================

  /**
   * Get health status for a service
   */
  getServiceHealth(serviceName: string): ServiceHealthSummary | null {
    return this.healthSummaries.get(serviceName) || null;
  }

  /**
   * Get health status for all services
   */
  getAllServiceHealth(): Map<string, ServiceHealthSummary> {
    return new Map(this.healthSummaries);
  }

  /**
   * Get health metrics for a service
   */
  getServiceMetrics(serviceName: string, limit?: number): HealthMetrics[] {
    const metrics = this.metricsHistory.get(serviceName) || [];
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * Get health issues for a service
   */
  getServiceIssues(serviceName: string, includeResolved = false): HealthIssue[] {
    const issues = this.healthIssues.get(serviceName) || [];
    return includeResolved ? issues : issues.filter(issue => !issue.resolved);
  }

  /**
   * Perform on-demand health check
   */
  async performManualHealthCheck(serviceName: string): Promise<ServiceHealthSummary> {
    return await this.performHealthCheck(serviceName);
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    status: HealthStatus;
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    degradedServices: number;
    lastUpdate: Date;
  } {
    const services = Array.from(this.healthSummaries.values());
    
    if (services.length === 0) {
      return {
        status: 'unknown',
        totalServices: 0,
        healthyServices: 0,
        unhealthyServices: 0,
        degradedServices: 0,
        lastUpdate: new Date(),
      };
    }

    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    let overallStatus: HealthStatus = 'healthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      totalServices: services.length,
      healthyServices: healthyCount,
      unhealthyServices: unhealthyCount,
      degradedServices: degradedCount,
      lastUpdate: new Date(Math.max(...services.map(s => s.lastCheck.getTime()))),
    };
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private async loadDefaultConfigurations(): Promise<void> {
    // Load default health check configurations
    // This would typically load from database or configuration files
    this.logger.debug('Default health check configurations loaded');
  }

  private initializeHealthSummary(serviceName: string, config: HealthCheckConfig): void {
    const summary: ServiceHealthSummary = {
      name: serviceName,
      status: 'unknown',
      lastCheck: new Date(),
      uptime: 0,
      averageResponseTime: 0,
      errorRate: 0,
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      endpointHealth: [],
      issues: [],
      trends: [],
    };

    this.healthSummaries.set(serviceName, summary);
  }

  private storeHealthResults(serviceName: string, results: HealthCheckResult[]): void {
    let history = this.healthHistory.get(serviceName) || [];
    history.push(...results);
    
    // Keep only recent history (last 1000 results)
    if (history.length > 1000) {
      history = history.slice(-500);
    }
    
    this.healthHistory.set(serviceName, history);
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  private extractPath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch {
      return url; // If not a full URL, assume it's already a path
    }
  }

  private sanitizeConfig(config: HealthCheckConfig): any {
    return {
      ...config,
      // Remove sensitive information
      endpoints: config.endpoints.map(endpoint => ({
        ...endpoint,
        headers: endpoint.headers ? Object.keys(endpoint.headers) : undefined,
      })),
    };
  }

  private startCleanupProcess(): void {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    // Clean up health history
    for (const [serviceName, history] of this.healthHistory.entries()) {
      const filteredHistory = history.filter(result => 
        result.timestamp.getTime() > cutoffTime
      );
      this.healthHistory.set(serviceName, filteredHistory);
    }

    // Clean up metrics history  
    for (const [serviceName, metrics] of this.metricsHistory.entries()) {
      const filteredMetrics = metrics.filter(metric => 
        metric.timestamp.getTime() > cutoffTime
      );
      this.metricsHistory.set(serviceName, filteredMetrics);
    }

    this.logger.debug('Old health data cleaned up');
  }

  private generateCheckId(): string {
    return `hc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResultId(): string {
    return `hr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===================================================================
  // CLEANUP
  // ===================================================================

  async onModuleDestroy() {
    // Stop all active health checks
    for (const [serviceName] of this.activeChecks.entries()) {
      await this.stopHealthCheck(serviceName);
    }
    
    this.logger.log('Health Check Service destroyed');
  }
}
