/**
 * Integration Management Services Index
 * 
 * Central exports for all integration management services including comprehensive
 * provider management, real-time status tracking, and administration capabilities.
 */

// ===================================================================
// CORE MANAGEMENT SERVICES
// ===================================================================

export { IntegrationManagementService } from './integration-management.service';
export { IntegrationStatusService } from './integration-status.service';

// ===================================================================
// TYPES AND INTERFACES
// ===================================================================

export type {
  // Management service types
  IntegrationProvider,
  IntegrationOperation,
  IntegrationAlert,
  IntegrationStatistics,
  IntegrationDashboardData,
} from './integration-management.service';

export type {
  // Status service types
  ProviderStatus,
  StatusEvent,
  StatusSnapshot,
  StatusNotification,
} from './integration-status.service';

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Management utilities and helpers
 */
export const ManagementUtils = {
  /**
   * Create provider status filter function
   */
  createStatusFilter(filters: {
    status?: string[];
    health?: string[];
    type?: string[];
  }) {
    return (provider: any) => {
      if (filters.status && !filters.status.includes(provider.status)) {
        return false;
      }
      if (filters.health && !filters.health.includes(provider.health)) {
        return false;
      }
      if (filters.type && !filters.type.includes(provider.type)) {
        return false;
      }
      return true;
    };
  },

  /**
   * Calculate uptime percentage
   */
  calculateUptime(
    totalTime: number,
    downTime: number
  ): number {
    if (totalTime === 0) return 100;
    return Math.max(0, Math.min(100, ((totalTime - downTime) / totalTime) * 100));
  },

  /**
   * Calculate error rate
   */
  calculateErrorRate(
    totalRequests: number,
    failedRequests: number
  ): number {
    if (totalRequests === 0) return 0;
    return (failedRequests / totalRequests) * 100;
  },

  /**
   * Determine overall health from individual provider health
   */
  calculateOverallHealth(
    providers: Array<{ health: string; status: string }>
  ): 'healthy' | 'degraded' | 'critical' | 'unknown' {
    if (providers.length === 0) return 'unknown';

    const activeProviders = providers.filter(p => p.status === 'active');
    if (activeProviders.length === 0) return 'unknown';

    const healthyCount = activeProviders.filter(p => p.health === 'healthy').length;
    const degradedCount = activeProviders.filter(p => p.health === 'degraded').length;
    const unhealthyCount = activeProviders.filter(p => p.health === 'unhealthy').length;

    if (unhealthyCount > 0) return 'critical';
    if (degradedCount > 0) return 'degraded';
    if (healthyCount === activeProviders.length) return 'healthy';

    return 'degraded'; // Default case
  },

  /**
   * Format duration in milliseconds to human readable format
   */
  formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }

    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  },

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  /**
   * Create alert priority score
   */
  calculateAlertPriority(
    severity: 'low' | 'medium' | 'high' | 'critical',
    type: string,
    age: number // milliseconds
  ): number {
    let priority = 0;

    // Base priority from severity
    switch (severity) {
      case 'critical': priority = 1000; break;
      case 'high': priority = 750; break;
      case 'medium': priority = 500; break;
      case 'low': priority = 250; break;
    }

    // Adjust for alert type
    const typeMultipliers = {
      health: 1.2,
      performance: 1.1,
      error: 1.0,
      configuration: 0.9,
      security: 1.5,
      maintenance: 0.8,
    };

    const multiplier = typeMultipliers[type as keyof typeof typeMultipliers] || 1.0;
    priority *= multiplier;

    // Adjust for age (older alerts get higher priority)
    const ageHours = age / (1000 * 60 * 60);
    priority += ageHours * 10;

    return Math.round(priority);
  },

  /**
   * Generate operation summary
   */
  generateOperationSummary(operations: Array<{
    status: string;
    type: string;
    duration?: number;
    startedAt: Date;
  }>): {
    total: number;
    completed: number;
    failed: number;
    running: number;
    averageDuration: number;
    successRate: number;
  } {
    const total = operations.length;
    const completed = operations.filter(op => op.status === 'completed').length;
    const failed = operations.filter(op => op.status === 'failed').length;
    const running = operations.filter(op => op.status === 'running' || op.status === 'pending').length;

    const completedOperations = operations.filter(op => op.duration);
    const averageDuration = completedOperations.length > 0
      ? completedOperations.reduce((sum, op) => sum + (op.duration || 0), 0) / completedOperations.length
      : 0;

    const successRate = total > 0 ? (completed / (completed + failed)) * 100 : 0;

    return {
      total,
      completed,
      failed,
      running,
      averageDuration,
      successRate,
    };
  },

  /**
   * Create time-based data aggregation
   */
  aggregateTimeSeriesData<T>(
    data: Array<{ timestamp: Date } & T>,
    interval: 'minute' | 'hour' | 'day',
    aggregator: (values: T[]) => T
  ): Array<{ timestamp: Date } & T> {
    if (data.length === 0) return [];

    const groups = new Map<string, Array<{ timestamp: Date } & T>>();

    data.forEach(item => {
      let key: string;
      const date = new Date(item.timestamp);

      switch (interval) {
        case 'minute':
          date.setSeconds(0, 0);
          key = date.toISOString();
          break;
        case 'hour':
          date.setMinutes(0, 0, 0);
          key = date.toISOString();
          break;
        case 'day':
          date.setHours(0, 0, 0, 0);
          key = date.toISOString();
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    return Array.from(groups.entries()).map(([timestamp, items]) => ({
      timestamp: new Date(timestamp),
      ...aggregator(items),
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  },

  /**
   * Create trend analysis
   */
  analyzeTrend(
    values: number[],
    threshold: number = 0.1
  ): 'improving' | 'degrading' | 'stable' {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;

    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'improving' : 'degrading';
  },

  /**
   * Validate provider configuration
   */
  validateProviderConfiguration(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.enabled !== undefined && typeof config.enabled !== 'boolean') {
      errors.push('enabled field must be boolean');
    }

    if (config.healthCheckInterval && (typeof config.healthCheckInterval !== 'number' || config.healthCheckInterval < 1000)) {
      errors.push('healthCheckInterval must be a number >= 1000ms');
    }

    if (config.timeoutMs && (typeof config.timeoutMs !== 'number' || config.timeoutMs < 1000)) {
      errors.push('timeoutMs must be a number >= 1000ms');
    }

    if (config.maxRetries && (typeof config.maxRetries !== 'number' || config.maxRetries < 0)) {
      errors.push('maxRetries must be a non-negative number');
    }

    // Warnings
    if (config.healthCheckInterval && config.healthCheckInterval < 30000) {
      warnings.push('healthCheckInterval less than 30s may cause excessive load');
    }

    if (config.timeoutMs && config.timeoutMs > 60000) {
      warnings.push('timeoutMs greater than 60s may cause poor user experience');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

/**
 * Status mapping constants
 */
export const STATUS_MAPPINGS = {
  PROVIDER_STATUS: {
    INITIALIZING: 'initializing',
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ERROR: 'error',
    MAINTENANCE: 'maintenance',
    DEGRADED: 'degraded',
  },
  
  HEALTH_STATUS: {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy',
    UNKNOWN: 'unknown',
  },
  
  OPERATION_STATUS: {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  },
  
  ALERT_SEVERITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
  
  NOTIFICATION_TYPE: {
    PROVIDER_STATUS: 'provider_status',
    HEALTH_ALERT: 'health_alert',
    PERFORMANCE_ALERT: 'performance_alert',
    SYSTEM_ALERT: 'system_alert',
  },
} as const;

/**
 * Default configuration values
 */
export const MANAGEMENT_DEFAULTS = {
  // Snapshot intervals
  SNAPSHOT_INTERVAL: 60000,      // 1 minute
  METRICS_INTERVAL: 30000,       // 30 seconds
  CLEANUP_INTERVAL: 300000,      // 5 minutes
  
  // Retention periods
  EVENT_RETENTION_HOURS: 72,     // 3 days
  NOTIFICATION_RETENTION_DAYS: 7, // 1 week
  SNAPSHOT_RETENTION_HOURS: 24,  // 1 day
  
  // Performance thresholds
  RESPONSE_TIME_THRESHOLD: 5000,  // 5 seconds
  ERROR_RATE_THRESHOLD: 5,        // 5%
  UPTIME_THRESHOLD: 95,           // 95%
  
  // Operation timeouts
  HEALTH_CHECK_TIMEOUT: 30000,    // 30 seconds
  OPERATION_TIMEOUT: 300000,      // 5 minutes
  
  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
} as const;

/**
 * Error codes for management operations
 */
export const MANAGEMENT_ERROR_CODES = {
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  OPERATION_FAILED: 'OPERATION_FAILED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;
