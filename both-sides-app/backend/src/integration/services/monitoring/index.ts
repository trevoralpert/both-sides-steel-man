/**
 * Monitoring Services Index
 * 
 * Central exports for all sync monitoring, dashboard, alerting, and reporting services.
 * Provides convenient single import point for monitoring functionality.
 */

// ===================================================================
// CORE SERVICES
// ===================================================================

export { SyncMonitoringService } from './sync-monitoring.service';
export { SyncDashboardService } from './sync-dashboard.service';
export { SyncAlertingService } from './sync-alerting.service';
export { SyncReportingService } from './sync-reporting.service';

// ===================================================================
// INTERFACES AND TYPES
// ===================================================================

export type {
  // Core monitoring types
  SyncStatus,
  SyncType,
  AlertSeverity,
  AlertType,
  
  // Session and tracking
  SyncSession,
  SyncError,
  SyncWarning,
  PerformanceIssue,
  PerformanceMetrics,
  
  // Dashboard and health
  SyncDashboardData,
  IntegrationHealth,
  TimeSeriesData,
  
  // Alerting system
  SyncAlert,
  AlertRule,
  
  // Reporting system
  SyncReport,
  ReportSummary,
  ReportSection,
  ChartData,
  TableData,
  
  // Configuration
  MonitoringConfig,
  
  // Query and analytics
  MonitoringQuery,
  MonitoringAnalytics,
  
  // Real-time updates
  RealtimeUpdate,
  WebSocketMessage,
} from './sync-monitoring.interfaces';

// ===================================================================
// UTILITIES AND HELPERS
// ===================================================================

/**
 * Create a monitoring query with sensible defaults
 */
export function createMonitoringQuery(
  integrationId: string,
  options?: {
    entityTypes?: import('../synchronizers/base-synchronizer.service').EntityType[];
    syncTypes?: import('./sync-monitoring.interfaces').SyncType[];
    statuses?: import('./sync-monitoring.interfaces').SyncStatus[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
): import('./sync-monitoring.interfaces').MonitoringQuery {
  return {
    integrationId,
    entityTypes: options?.entityTypes,
    syncTypes: options?.syncTypes,
    statuses: options?.statuses,
    timeRange: {
      startDate: options?.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      endDate: options?.endDate || new Date(),
    },
    limit: options?.limit || 100,
    offset: options?.offset || 0,
  };
}

/**
 * Generate session ID for sync monitoring
 */
export function generateSyncSessionId(prefix: string = 'sync'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate sync session duration in human readable format
 */
export function formatSyncDuration(startTime: Date, endTime?: Date): string {
  const end = endTime || new Date();
  const durationMs = end.getTime() - startTime.getTime();
  
  if (durationMs < 60 * 1000) {
    return `${Math.round(durationMs / 1000)}s`;
  } else if (durationMs < 60 * 60 * 1000) {
    return `${Math.round(durationMs / (60 * 1000))}m`;
  } else {
    return `${Math.round(durationMs / (60 * 60 * 1000))}h`;
  }
}

/**
 * Calculate success rate from sync sessions
 */
export function calculateSuccessRate(sessions: import('./sync-monitoring.interfaces').SyncSession[]): number {
  if (sessions.length === 0) return 0;
  
  const successful = sessions.filter(s => s.status === 'completed').length;
  return (successful / sessions.length) * 100;
}

/**
 * Calculate average sync duration from sessions
 */
export function calculateAverageDuration(sessions: import('./sync-monitoring.interfaces').SyncSession[]): number {
  const completedSessions = sessions.filter(s => s.status === 'completed' && s.duration);
  
  if (completedSessions.length === 0) return 0;
  
  const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  return totalDuration / completedSessions.length;
}

/**
 * Get sync session status color for UI display
 */
export function getSyncStatusColor(status: import('./sync-monitoring.interfaces').SyncStatus): string {
  const statusColors = {
    idle: '#6B7280',
    starting: '#3B82F6',
    running: '#10B981',
    paused: '#F59E0B',
    completing: '#8B5CF6',
    completed: '#059669',
    failed: '#DC2626',
    cancelled: '#6B7280',
    timeout: '#D97706',
    degraded: '#F59E0B',
  };
  
  return statusColors[status] || '#6B7280';
}

/**
 * Get alert severity color for UI display
 */
export function getAlertSeverityColor(severity: import('./sync-monitoring.interfaces').AlertSeverity): string {
  const severityColors = {
    info: '#3B82F6',
    warning: '#F59E0B',
    error: '#DC2626',
    critical: '#991B1B',
  };
  
  return severityColors[severity] || '#6B7280';
}

/**
 * Format performance metric for display
 */
export function formatPerformanceMetric(value: number, unit: string): string {
  if (unit === 'bytes') {
    if (value >= 1024 * 1024 * 1024) {
      return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (value >= 1024 * 1024) {
      return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    } else if (value >= 1024) {
      return `${(value / 1024).toFixed(2)} KB`;
    } else {
      return `${value} B`;
    }
  } else if (unit === 'milliseconds') {
    if (value >= 60 * 1000) {
      return `${(value / (60 * 1000)).toFixed(1)}m`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}s`;
    } else {
      return `${Math.round(value)}ms`;
    }
  } else if (unit === 'percentage') {
    return `${value.toFixed(1)}%`;
  } else if (unit === 'rate') {
    return `${value.toFixed(2)}/s`;
  }
  
  return `${value} ${unit}`;
}

/**
 * Generate time series data for a given time range
 */
export function generateTimeSeriesTemplate(
  startDate: Date,
  endDate: Date,
  interval: 'minute' | 'hour' | 'day' = 'hour',
): import('./sync-monitoring.interfaces').TimeSeriesData[] {
  const data: import('./sync-monitoring.interfaces').TimeSeriesData[] = [];
  
  const intervalMs = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  }[interval];
  
  let current = new Date(startDate);
  current.setTime(Math.floor(current.getTime() / intervalMs) * intervalMs); // Round to interval
  
  while (current <= endDate) {
    data.push({
      timestamp: new Date(current),
      value: 0,
      label: interval,
    });
    
    current.setTime(current.getTime() + intervalMs);
  }
  
  return data;
}

/**
 * Validate monitoring configuration
 */
export function validateMonitoringConfig(
  config: Partial<import('./sync-monitoring.interfaces').MonitoringConfig>,
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate general settings
  if (config.general) {
    if (config.general.retentionPeriod !== undefined && config.general.retentionPeriod < 1) {
      errors.push('Retention period must be at least 1 day');
    }
    
    if (config.general.retentionPeriod !== undefined && config.general.retentionPeriod > 365) {
      warnings.push('Retention period longer than 1 year may impact performance');
    }
  }
  
  // Validate performance settings
  if (config.performance) {
    if (config.performance.metricsInterval !== undefined && config.performance.metricsInterval < 10) {
      errors.push('Metrics interval must be at least 10 seconds');
    }
    
    if (config.performance.resourceAlertThresholds) {
      const thresholds = config.performance.resourceAlertThresholds;
      
      if (thresholds.cpu !== undefined && (thresholds.cpu < 0 || thresholds.cpu > 100)) {
        errors.push('CPU threshold must be between 0 and 100');
      }
      
      if (thresholds.memory !== undefined && (thresholds.memory < 0 || thresholds.memory > 100)) {
        errors.push('Memory threshold must be between 0 and 100');
      }
    }
  }
  
  // Validate dashboard settings
  if (config.dashboard) {
    if (config.dashboard.refreshInterval !== undefined && config.dashboard.refreshInterval < 5) {
      warnings.push('Very frequent dashboard refresh may impact performance');
    }
    
    if (config.dashboard.maxDataPoints !== undefined && config.dashboard.maxDataPoints > 10000) {
      warnings.push('High data point limit may impact dashboard performance');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create default monitoring configuration
 */
export function createDefaultMonitoringConfig(): import('./sync-monitoring.interfaces').MonitoringConfig {
  return {
    integrationId: '',
    general: {
      enabled: true,
      samplingRate: 1.0,
      retentionPeriod: 30,
      compressionThreshold: 7,
    },
    performance: {
      enabled: true,
      metricsInterval: 60,
      slowSyncThreshold: 10,
      highErrorRateThreshold: 0.1,
      resourceAlertThresholds: {
        cpu: 80,
        memory: 80,
        connections: 90,
      },
    },
    health: {
      enabled: true,
      checkInterval: 300,
      timeoutThreshold: 30,
      consecutiveFailureThreshold: 3,
      uptimeCalculationWindow: 24,
    },
    dashboard: {
      enabled: true,
      refreshInterval: 30,
      realtimeUpdates: true,
      defaultTimeRange: 24,
      maxDataPoints: 1000,
    },
    alerting: {
      enabled: true,
      evaluationInterval: 60,
      maxAlertsPerHour: 50,
      suppressDuplicates: true,
      defaultSuppressionWindow: 15,
    },
    reporting: {
      enabled: true,
      defaultFormat: 'json',
      maxReportSize: 50,
      retentionPeriod: 90,
      scheduledReportsEnabled: false,
    },
    notifications: {
      enabled: false,
      channels: {
        email: {
          enabled: false,
          smtp: {
            host: '',
            port: 587,
            secure: false,
            user: '',
          },
          templates: {
            sync_failure: 'sync_failure_template',
            performance_degradation: 'performance_degradation_template',
            high_error_rate: 'high_error_rate_template',
            integration_down: 'integration_down_template',
            data_quality_issue: 'data_quality_issue_template',
            conflict_spike: 'conflict_spike_template',
            resource_exhaustion: 'resource_exhaustion_template',
            authentication_failure: 'authentication_failure_template',
            rate_limit_exceeded: 'rate_limit_exceeded_template',
            timeout_threshold: 'timeout_threshold_template',
          },
        },
        webhook: {
          enabled: false,
          endpoints: [],
        },
        realtime: {
          enabled: true,
        },
      },
    },
  };
}

// ===================================================================
// CONSTANTS
// ===================================================================

export const MONITORING_CONSTANTS = {
  DEFAULT_RETENTION_DAYS: 30,
  DEFAULT_METRICS_INTERVAL_SECONDS: 60,
  DEFAULT_DASHBOARD_REFRESH_SECONDS: 30,
  DEFAULT_ALERT_EVALUATION_SECONDS: 60,
  MAX_TIME_SERIES_POINTS: 1000,
  MAX_CONCURRENT_REPORTS: 5,
  DEFAULT_REPORT_RETENTION_DAYS: 90,
  MAX_ALERT_SUPPRESSION_MINUTES: 1440, // 24 hours
  
  // Status colors
  STATUS_COLORS: {
    HEALTHY: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#DC2626',
    CRITICAL: '#991B1B',
    OFFLINE: '#6B7280',
  },
  
  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    SLOW_SYNC_MINUTES: 10,
    HIGH_ERROR_RATE: 0.1,
    LOW_THROUGHPUT_ENTITIES_PER_SECOND: 0.1,
    HIGH_LATENCY_MS: 5000,
    HIGH_CPU_PERCENT: 80,
    HIGH_MEMORY_PERCENT: 80,
  },
} as const;

// ===================================================================
// ERROR CLASSES
// ===================================================================

export class MonitoringError extends Error {
  constructor(
    message: string,
    public readonly integrationId?: string,
    public readonly sessionId?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'MonitoringError';
  }
}

export class AlertingError extends Error {
  constructor(
    message: string,
    public readonly alertType?: import('./sync-monitoring.interfaces').AlertType,
    public readonly severity?: import('./sync-monitoring.interfaces').AlertSeverity,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'AlertingError';
  }
}

export class ReportingError extends Error {
  constructor(
    message: string,
    public readonly reportType?: import('./sync-monitoring.interfaces').SyncReport['reportType'],
    public readonly reportId?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'ReportingError';
  }
}

export class DashboardError extends Error {
  constructor(
    message: string,
    public readonly integrationId?: string,
    public readonly dataType?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'DashboardError';
  }
}
