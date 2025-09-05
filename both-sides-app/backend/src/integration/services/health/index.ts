/**
 * Health Monitoring Services Index
 * 
 * Central exports for all health monitoring services including health checks,
 * performance monitoring, and dashboard services.
 */

// ===================================================================
// CORE SERVICES
// ===================================================================

export { HealthCheckService } from './health-check.service';
export { ApiPerformanceService } from './api-performance.service';
export { HealthDashboardService } from './health-dashboard.service';

// ===================================================================
// INTERFACES AND TYPES
// ===================================================================

export type {
  // Health check types
  HealthStatus,
  HealthCheckConfig,
  HealthEndpointConfig,
  HealthThresholds,
  NotificationConfig,
  EscalationLevel,
  HealthCheckResult,
  ServiceHealthSummary,
  EndpointHealthSummary,
  HealthIssue,
  HealthTrend,
  HealthMetrics,
} from './health-check.service';

export type {
  // Performance monitoring types
  PerformanceMetrics,
  PerformanceBaseline,
  PerformanceAlert,
  UsageAnalytics,
  PerformanceReport,
} from './api-performance.service';

export type {
  // Dashboard types
  DashboardOverview,
  ServiceDashboard,
  EndpointDashboard,
  DashboardAlert,
  DashboardAction,
  TrendData,
  ChartData,
  ChartSeries,
  ChartDataPoint,
  DashboardWidget,
  DashboardLayout,
} from './health-dashboard.service';

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Create default health check configuration
 */
export function createDefaultHealthCheckConfig(
  serviceName: string,
  endpoints: Array<{
    name: string;
    url: string;
    method?: 'GET' | 'POST' | 'HEAD';
    critical?: boolean;
  }>,
  options?: {
    interval?: number;
    timeout?: number;
    retries?: number;
  },
): import('./health-check.service').HealthCheckConfig {
  return {
    name: serviceName,
    enabled: true,
    interval: options?.interval || 60000, // 1 minute
    timeout: options?.timeout || 30000,   // 30 seconds
    retries: options?.retries || 3,
    retryDelay: 1000, // 1 second
    endpoints: endpoints.map(endpoint => ({
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method || 'GET',
      expectedStatus: [200, 201, 204],
      expectedResponseTime: 5000, // 5 seconds
      criticalEndpoint: endpoint.critical || false,
    })),
    thresholds: {
      responseTime: {
        warning: 2000,  // 2 seconds
        critical: 5000, // 5 seconds
      },
      availability: {
        warning: 95,    // 95%
        critical: 90,   // 90%
      },
      errorRate: {
        warning: 5,     // 5%
        critical: 10,   // 10%
      },
    },
    notifications: {
      enabled: true,
      channels: ['database', 'console'],
      escalation: {
        enabled: false,
        levels: [],
      },
    },
  };
}

/**
 * Create default performance baseline options
 */
export function createDefaultBaselineOptions(): {
  minSampleSize: number;
  lookbackHours: number;
  confidenceLevel: number;
} {
  return {
    minSampleSize: 100,
    lookbackHours: 24,
    confidenceLevel: 0.95,
  };
}

/**
 * Create health endpoint configuration
 */
export function createHealthEndpoint(
  name: string,
  url: string,
  options?: {
    method?: 'GET' | 'POST' | 'HEAD';
    headers?: Record<string, string>;
    expectedStatus?: number[];
    expectedResponseTime?: number;
    critical?: boolean;
    customValidator?: (response: any) => boolean;
  },
): import('./health-check.service').HealthEndpointConfig {
  return {
    name,
    url,
    method: options?.method || 'GET',
    headers: options?.headers,
    expectedStatus: options?.expectedStatus || [200, 201, 204],
    expectedResponseTime: options?.expectedResponseTime || 5000,
    criticalEndpoint: options?.critical || false,
    customValidator: options?.customValidator,
  };
}

/**
 * Create performance thresholds
 */
export function createPerformanceThresholds(): import('./health-check.service').HealthThresholds {
  return {
    responseTime: {
      warning: 2000,  // 2 seconds
      critical: 5000, // 5 seconds
    },
    availability: {
      warning: 95,    // 95%
      critical: 90,   // 90%
    },
    errorRate: {
      warning: 5,     // 5%
      critical: 10,   // 10%
    },
  };
}

/**
 * Health status utility functions
 */
export const HealthStatusUtils = {
  /**
   * Check if health status is healthy
   */
  isHealthy(status: import('./health-check.service').HealthStatus): boolean {
    return status === 'healthy';
  },

  /**
   * Check if health status indicates issues
   */
  hasIssues(status: import('./health-check.service').HealthStatus): boolean {
    return status === 'unhealthy' || status === 'degraded';
  },

  /**
   * Get status priority (for sorting)
   */
  getStatusPriority(status: import('./health-check.service').HealthStatus): number {
    switch (status) {
      case 'unhealthy': return 0;
      case 'degraded': return 1;
      case 'healthy': return 2;
      case 'unknown': return 3;
      default: return 4;
    }
  },

  /**
   * Compare two health statuses
   */
  compareStatus(
    a: import('./health-check.service').HealthStatus, 
    b: import('./health-check.service').HealthStatus,
  ): number {
    return this.getStatusPriority(a) - this.getStatusPriority(b);
  },

  /**
   * Get status color for UI
   */
  getStatusColor(status: import('./health-check.service').HealthStatus): string {
    switch (status) {
      case 'healthy': return '#10B981';   // Green
      case 'degraded': return '#F59E0B';  // Yellow
      case 'unhealthy': return '#EF4444'; // Red
      case 'unknown': return '#6B7280';   // Gray
      default: return '#6B7280';
    }
  },

  /**
   * Get status icon for UI
   */
  getStatusIcon(status: import('./health-check.service').HealthStatus): string {
    switch (status) {
      case 'healthy': return 'check-circle';
      case 'degraded': return 'alert-triangle';
      case 'unhealthy': return 'x-circle';
      case 'unknown': return 'help-circle';
      default: return 'help-circle';
    }
  },
};

/**
 * Performance metrics utility functions
 */
export const PerformanceUtils = {
  /**
   * Calculate percentile from array of numbers
   */
  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  },

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  },

  /**
   * Format response time for display
   */
  formatResponseTime(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      return `${(ms / 60000).toFixed(1)}m`;
    }
  },

  /**
   * Format throughput for display
   */
  formatThroughput(requestsPerSecond: number): string {
    if (requestsPerSecond < 1) {
      return `${(requestsPerSecond * 60).toFixed(1)} req/min`;
    } else if (requestsPerSecond < 100) {
      return `${requestsPerSecond.toFixed(1)} req/s`;
    } else {
      return `${(requestsPerSecond / 1000).toFixed(1)}k req/s`;
    }
  },

  /**
   * Format error rate for display
   */
  formatErrorRate(percentage: number): string {
    return `${percentage.toFixed(2)}%`;
  },

  /**
   * Categorize response time
   */
  categorizeResponseTime(ms: number): 'excellent' | 'good' | 'acceptable' | 'slow' | 'critical' {
    if (ms < 200) return 'excellent';
    if (ms < 500) return 'good';
    if (ms < 1000) return 'acceptable';
    if (ms < 3000) return 'slow';
    return 'critical';
  },

  /**
   * Get response time color for UI
   */
  getResponseTimeColor(ms: number): string {
    const category = this.categorizeResponseTime(ms);
    switch (category) {
      case 'excellent': return '#10B981'; // Green
      case 'good': return '#84CC16';      // Light Green
      case 'acceptable': return '#F59E0B'; // Yellow
      case 'slow': return '#F97316';      // Orange
      case 'critical': return '#EF4444';  // Red
      default: return '#6B7280';          // Gray
    }
  },
};

/**
 * Dashboard utility functions
 */
export const DashboardUtils = {
  /**
   * Create chart data point
   */
  createDataPoint(
    x: string | number | Date,
    y: number,
    label?: string,
    metadata?: any,
  ): import('./health-dashboard.service').ChartDataPoint {
    return { x, y, label, metadata };
  },

  /**
   * Create chart series
   */
  createChartSeries(
    name: string,
    data: import('./health-dashboard.service').ChartDataPoint[],
    options?: {
      color?: string;
      type?: 'line' | 'bar' | 'area';
    },
  ): import('./health-dashboard.service').ChartSeries {
    return {
      name,
      data,
      color: options?.color,
      type: options?.type,
    };
  },

  /**
   * Calculate trend direction
   */
  calculateTrendDirection(current: number, previous: number, threshold = 5): 'up' | 'down' | 'stable' {
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'up' : 'down';
  },

  /**
   * Format percentage change for display
   */
  formatPercentageChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  },

  /**
   * Get trend status (good/bad/neutral) based on metric type and direction
   */
  getTrendStatus(
    metricType: 'response_time' | 'error_rate' | 'throughput' | 'availability',
    direction: 'up' | 'down' | 'stable',
  ): 'good' | 'bad' | 'neutral' {
    if (direction === 'stable') return 'neutral';

    switch (metricType) {
      case 'response_time':
      case 'error_rate':
        return direction === 'down' ? 'good' : 'bad';
      case 'throughput':
      case 'availability':
        return direction === 'up' ? 'good' : 'bad';
      default:
        return 'neutral';
    }
  },

  /**
   * Get severity color for alerts
   */
  getSeverityColor(severity: 'critical' | 'warning' | 'info'): string {
    switch (severity) {
      case 'critical': return '#EF4444'; // Red
      case 'warning': return '#F59E0B';  // Yellow
      case 'info': return '#3B82F6';     // Blue
      default: return '#6B7280';         // Gray
    }
  },

  /**
   * Get severity icon for alerts
   */
  getSeverityIcon(severity: 'critical' | 'warning' | 'info'): string {
    switch (severity) {
      case 'critical': return 'alert-circle';
      case 'warning': return 'alert-triangle';
      case 'info': return 'info';
      default: return 'help-circle';
    }
  },
};

/**
 * Time range utility functions
 */
export const TimeRangeUtils = {
  /**
   * Get predefined time ranges
   */
  getTimeRanges(): Array<{
    label: string;
    value: number;
    unit: string;
  }> {
    return [
      { label: 'Last 5 minutes', value: 5 * 60 * 1000, unit: '5m' },
      { label: 'Last 15 minutes', value: 15 * 60 * 1000, unit: '15m' },
      { label: 'Last 30 minutes', value: 30 * 60 * 1000, unit: '30m' },
      { label: 'Last hour', value: 60 * 60 * 1000, unit: '1h' },
      { label: 'Last 3 hours', value: 3 * 60 * 60 * 1000, unit: '3h' },
      { label: 'Last 6 hours', value: 6 * 60 * 60 * 1000, unit: '6h' },
      { label: 'Last 12 hours', value: 12 * 60 * 60 * 1000, unit: '12h' },
      { label: 'Last 24 hours', value: 24 * 60 * 60 * 1000, unit: '24h' },
      { label: 'Last 7 days', value: 7 * 24 * 60 * 60 * 1000, unit: '7d' },
      { label: 'Last 30 days', value: 30 * 24 * 60 * 60 * 1000, unit: '30d' },
    ];
  },

  /**
   * Format time range for display
   */
  formatTimeRange(milliseconds: number): string {
    const seconds = milliseconds / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;

    if (days >= 1) {
      return `${Math.round(days)}d`;
    } else if (hours >= 1) {
      return `${Math.round(hours)}h`;
    } else if (minutes >= 1) {
      return `${Math.round(minutes)}m`;
    } else {
      return `${Math.round(seconds)}s`;
    }
  },

  /**
   * Get time buckets for aggregation
   */
  getTimeBuckets(totalDuration: number, targetBuckets: number = 50): number {
    const bucketSize = totalDuration / targetBuckets;
    
    // Round to sensible intervals
    if (bucketSize <= 1000) return 1000;        // 1 second
    if (bucketSize <= 5000) return 5000;        // 5 seconds
    if (bucketSize <= 10000) return 10000;      // 10 seconds
    if (bucketSize <= 30000) return 30000;      // 30 seconds
    if (bucketSize <= 60000) return 60000;      // 1 minute
    if (bucketSize <= 300000) return 300000;    // 5 minutes
    if (bucketSize <= 900000) return 900000;    // 15 minutes
    if (bucketSize <= 1800000) return 1800000;  // 30 minutes
    if (bucketSize <= 3600000) return 3600000;  // 1 hour
    
    return Math.ceil(bucketSize / 3600000) * 3600000; // Multiple of 1 hour
  },
};

// ===================================================================
// CONSTANTS
// ===================================================================

export const HEALTH_MONITORING_CONSTANTS = {
  // Default intervals
  DEFAULT_HEALTH_CHECK_INTERVAL: 60000,     // 1 minute
  DEFAULT_PERFORMANCE_BASELINE_INTERVAL: 3600000, // 1 hour
  DEFAULT_DASHBOARD_REFRESH_INTERVAL: 30000, // 30 seconds
  
  // Default timeouts
  DEFAULT_HEALTH_CHECK_TIMEOUT: 30000,      // 30 seconds
  DEFAULT_PERFORMANCE_TIMEOUT: 60000,       // 1 minute
  
  // Default thresholds
  DEFAULT_RESPONSE_TIME_WARNING: 2000,      // 2 seconds
  DEFAULT_RESPONSE_TIME_CRITICAL: 5000,     // 5 seconds
  DEFAULT_AVAILABILITY_WARNING: 95,         // 95%
  DEFAULT_AVAILABILITY_CRITICAL: 90,        // 90%
  DEFAULT_ERROR_RATE_WARNING: 5,            // 5%
  DEFAULT_ERROR_RATE_CRITICAL: 10,          // 10%
  
  // Data retention
  DEFAULT_METRICS_RETENTION_DAYS: 30,
  DEFAULT_ALERTS_RETENTION_DAYS: 90,
  DEFAULT_REPORTS_RETENTION_DAYS: 365,
  
  // Baseline requirements
  MINIMUM_SAMPLE_SIZE_FOR_BASELINE: 100,
  DEFAULT_CONFIDENCE_LEVEL: 0.95,
  
  // Chart defaults
  DEFAULT_CHART_HEIGHT: 300,
  DEFAULT_CHART_POINTS: 100,
  
  // Alert limits
  MAX_ALERTS_PER_SERVICE: 100,
  MAX_DASHBOARD_WIDGETS: 50,
  
  // Status priorities
  STATUS_PRIORITY: {
    unhealthy: 0,
    degraded: 1,
    healthy: 2,
    unknown: 3,
  } as const,
  
  // Colors
  COLORS: {
    HEALTHY: '#10B981',
    DEGRADED: '#F59E0B',
    UNHEALTHY: '#EF4444',
    UNKNOWN: '#6B7280',
    
    CRITICAL: '#EF4444',
    WARNING: '#F59E0B',
    INFO: '#3B82F6',
    
    SUCCESS: '#10B981',
    ERROR: '#EF4444',
    NEUTRAL: '#6B7280',
  } as const,
  
  // Icons
  ICONS: {
    HEALTHY: 'check-circle',
    DEGRADED: 'alert-triangle',
    UNHEALTHY: 'x-circle',
    UNKNOWN: 'help-circle',
    
    CRITICAL: 'alert-circle',
    WARNING: 'alert-triangle',
    INFO: 'info',
    
    RESPONSE_TIME: 'clock',
    ERROR_RATE: 'alert-circle',
    THROUGHPUT: 'activity',
    AVAILABILITY: 'shield-check',
  } as const,
} as const;

// ===================================================================
// ERROR CLASSES
// ===================================================================

export class HealthMonitoringError extends Error {
  constructor(
    message: string,
    public readonly service?: string,
    public readonly component?: 'health-check' | 'performance' | 'dashboard',
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'HealthMonitoringError';
  }
}

export class HealthCheckError extends HealthMonitoringError {
  constructor(
    message: string,
    public readonly service: string,
    public readonly endpoint?: string,
    originalError?: Error,
  ) {
    super(message, service, 'health-check', originalError);
    this.name = 'HealthCheckError';
  }
}

export class PerformanceMonitoringError extends HealthMonitoringError {
  constructor(
    message: string,
    public readonly service: string,
    public readonly metricType?: string,
    originalError?: Error,
  ) {
    super(message, service, 'performance', originalError);
    this.name = 'PerformanceMonitoringError';
  }
}

export class DashboardError extends HealthMonitoringError {
  constructor(
    message: string,
    public readonly dashboardType?: string,
    originalError?: Error,
  ) {
    super(message, undefined, 'dashboard', originalError);
    this.name = 'DashboardError';
  }
}
