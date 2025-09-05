/**
 * Sync Status Monitoring & Reporting Interfaces
 * 
 * Comprehensive type definitions for sync monitoring, performance tracking,
 * alerting, and dashboard analytics across all integration operations.
 */

import { EntityType } from '../synchronizers/base-synchronizer.service';
import { ResolutionStrategy } from '../conflict-resolution/conflict-resolution.interfaces';

// ===================================================================
// CORE MONITORING TYPES
// ===================================================================

export type SyncStatus = 
  | 'idle'           // No sync in progress
  | 'starting'       // Sync initialization
  | 'running'        // Sync in progress
  | 'paused'         // Temporarily paused
  | 'completing'     // Finalizing sync
  | 'completed'      // Successfully completed
  | 'failed'         // Failed with errors
  | 'cancelled'      // User cancelled
  | 'timeout'        // Timed out
  | 'degraded';      // Completed with issues

export type SyncType = 'full' | 'incremental' | 'manual' | 'scheduled' | 'webhook' | 'retry';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertType = 
  | 'sync_failure'          // Sync operation failed
  | 'performance_degradation' // Performance below threshold
  | 'high_error_rate'       // Error rate above threshold
  | 'integration_down'      // Integration unavailable
  | 'data_quality_issue'    // Data quality problems
  | 'conflict_spike'        // High conflict rate
  | 'resource_exhaustion'   // System resource issues
  | 'authentication_failure' // Auth issues
  | 'rate_limit_exceeded'   // API rate limits hit
  | 'timeout_threshold';    // Operation timeouts

// ===================================================================
// SYNC SESSION TRACKING
// ===================================================================

export interface SyncSession {
  id: string;
  integrationId: string;
  providerId: string;
  syncType: SyncType;
  status: SyncStatus;
  entityTypes: EntityType[];
  
  // Timing information
  startTime: Date;
  endTime?: Date;
  duration?: number;                    // milliseconds
  estimatedCompletion?: Date;
  lastHeartbeat: Date;
  
  // Progress tracking
  progress: {
    currentStage: string;
    stagesCompleted: number;
    totalStages: number;
    percentComplete: number;
    entitiesProcessed: number;
    totalEntities?: number;
    currentEntityType?: EntityType;
  };
  
  // Performance metrics
  performance: {
    averageProcessingRate: number;      // entities per second
    peakProcessingRate: number;
    apiCallsCount: number;
    apiResponseTime: number;            // average milliseconds
    dataTransferred: number;            // bytes
    cacheHitRate: number;               // 0-1
  };
  
  // Results summary
  results?: {
    entitiesCreated: number;
    entitiesUpdated: number;
    entitiesDeleted: number;
    entitiesSkipped: number;
    conflictsDetected: number;
    conflictsResolved: number;
    errorsEncountered: number;
    warningsGenerated: number;
  };
  
  // Error and issue tracking
  issues: {
    errors: SyncError[];
    warnings: SyncWarning[];
    performanceIssues: PerformanceIssue[];
  };
  
  // Configuration and context
  config: {
    batchSize: number;
    timeout: number;
    retryPolicy: {
      maxRetries: number;
      backoffMultiplier: number;
    };
    conflictResolution: {
      strategy: ResolutionStrategy;
      autoResolve: boolean;
    };
  };
  
  // Metadata
  metadata: {
    triggeredBy: 'user' | 'schedule' | 'webhook' | 'system';
    triggerSource?: string;
    parentSyncId?: string;             // For retry operations
    tags: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncError {
  id: string;
  sessionId: string;
  timestamp: Date;
  severity: 'warning' | 'error' | 'critical';
  category: 'network' | 'authentication' | 'data' | 'business_logic' | 'system' | 'external_api';
  entityType?: EntityType;
  entityId?: string;
  stage: string;
  errorCode: string;
  message: string;
  details: {
    originalError?: any;
    stackTrace?: string;
    retryCount?: number;
    context?: Record<string, any>;
  };
  resolved: boolean;
  resolvedAt?: Date;
  resolutionNote?: string;
}

export interface SyncWarning {
  id: string;
  sessionId: string;
  timestamp: Date;
  category: 'data_quality' | 'performance' | 'configuration' | 'business_rule';
  entityType?: EntityType;
  entityId?: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface PerformanceIssue {
  id: string;
  sessionId: string;
  timestamp: Date;
  issueType: 'slow_processing' | 'high_memory' | 'api_latency' | 'database_slow' | 'timeout_risk';
  severity: 'info' | 'warning' | 'error';
  metrics: {
    threshold: number;
    actual: number;
    unit: string;
  };
  description: string;
  impact: string;
  suggestion: string;
}

// ===================================================================
// INTEGRATION HEALTH MONITORING
// ===================================================================

export interface IntegrationHealth {
  integrationId: string;
  providerId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  lastCheckTime: Date;
  uptime: {
    current: number;                    // seconds
    percentage24h: number;              // 0-100
    percentage7d: number;               // 0-100
    percentage30d: number;              // 0-100
  };
  
  // Health metrics
  metrics: {
    responseTime: {
      current: number;                  // milliseconds
      average24h: number;
      p95_24h: number;
      p99_24h: number;
    };
    errorRate: {
      current: number;                  // 0-1
      average24h: number;
      spike: boolean;
    };
    throughput: {
      current: number;                  // requests per minute
      average24h: number;
      peak24h: number;
    };
    resources: {
      cpuUsage: number;                 // 0-100
      memoryUsage: number;              // 0-100
      connectionPool: number;           // 0-100
      queueDepth: number;
    };
  };
  
  // Connectivity tests
  connectivity: {
    apiEndpoint: {
      status: 'online' | 'offline' | 'degraded';
      responseTime: number;
      lastCheck: Date;
      errorCount24h: number;
    };
    authentication: {
      status: 'valid' | 'expired' | 'invalid' | 'unknown';
      expiresAt?: Date;
      lastRefresh: Date;
      failureCount24h: number;
    };
    database: {
      status: 'connected' | 'disconnected' | 'slow';
      connectionCount: number;
      avgQueryTime: number;
      slowQueryCount24h: number;
    };
  };
  
  // Trend analysis
  trends: {
    direction: 'improving' | 'stable' | 'degrading';
    confidence: number;                 // 0-1
    timeframe: string;
    indicators: {
      responseTime: 'improving' | 'stable' | 'degrading';
      errorRate: 'improving' | 'stable' | 'degrading';
      throughput: 'improving' | 'stable' | 'degrading';
    };
  };
  
  // Recent incidents
  incidents: {
    count24h: number;
    count7d: number;
    lastIncident?: {
      timestamp: Date;
      type: AlertType;
      severity: AlertSeverity;
      resolved: boolean;
      duration?: number;
    };
  };
}

// ===================================================================
// DASHBOARD AND ANALYTICS
// ===================================================================

export interface SyncDashboardData {
  integrationId: string;
  timestamp: Date;
  
  // Overview metrics
  overview: {
    activeSyncs: number;
    completedToday: number;
    failedToday: number;
    avgSyncDuration: number;            // minutes
    dataProcessedToday: number;         // MB
    uptime24h: number;                  // percentage
  };
  
  // Real-time status
  realTimeStatus: {
    currentSyncs: SyncSession[];
    queuedSyncs: number;
    systemLoad: {
      cpu: number;
      memory: number;
      connections: number;
    };
    apiStatus: {
      [providerId: string]: 'online' | 'offline' | 'degraded';
    };
  };
  
  // Performance trends
  trends: {
    syncVelocity: TimeSeriesData[];     // syncs per hour
    successRate: TimeSeriesData[];      // success percentage
    avgDuration: TimeSeriesData[];      // average minutes
    errorRate: TimeSeriesData[];        // errors per hour
    dataVolume: TimeSeriesData[];       // MB processed
  };
  
  // Entity breakdown
  entityMetrics: {
    [entityType in EntityType]: {
      processed24h: number;
      created24h: number;
      updated24h: number;
      conflicts24h: number;
      errors24h: number;
      avgProcessingTime: number;        // seconds per entity
    };
  };
  
  // Recent activities
  recentActivities: {
    syncs: {
      completed: SyncSession[];
      failed: SyncSession[];
      inProgress: SyncSession[];
    };
    alerts: SyncAlert[];
    conflicts: {
      detected: number;
      resolved: number;
      pending: number;
    };
  };
  
  // Health indicators
  healthIndicators: {
    overall: 'healthy' | 'warning' | 'critical';
    integrations: IntegrationHealth[];
    alerts: {
      active: number;
      critical: number;
      unacknowledged: number;
    };
  };
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

// ===================================================================
// REPORTING SYSTEM
// ===================================================================

export interface SyncReport {
  id: string;
  integrationId: string;
  reportType: 'performance' | 'data_quality' | 'usage' | 'compliance' | 'custom';
  title: string;
  description: string;
  
  // Report configuration
  config: {
    timeRange: {
      startDate: Date;
      endDate: Date;
    };
    entityTypes: EntityType[];
    includeDetails: boolean;
    format: 'json' | 'csv' | 'pdf' | 'html';
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
  
  // Report content
  content: {
    summary: ReportSummary;
    sections: ReportSection[];
    charts: ChartData[];
    tables: TableData[];
    recommendations: string[];
  };
  
  // Generation metadata
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    executionTime: number;
    dataPoints: number;
    status: 'generating' | 'completed' | 'failed';
    error?: string;
  };
}

export interface ReportSummary {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageDuration: number;
  totalDataProcessed: number;
  entitiesProcessed: number;
  conflictsResolved: number;
  keyInsights: string[];
  recommendedActions: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'chart' | 'table' | 'text' | 'kpi';
  content: any;
  order: number;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  data: TimeSeriesData[] | { label: string; value: number }[];
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: any[][];
  sortable: boolean;
  filterable: boolean;
  exportable: boolean;
}

// ===================================================================
// ALERTING SYSTEM
// ===================================================================

export interface SyncAlert {
  id: string;
  integrationId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  
  // Trigger information
  trigger: {
    condition: string;
    threshold: any;
    actualValue: any;
    evaluatedAt: Date;
    dataSource: string;
  };
  
  // Context and details
  context: {
    sessionId?: string;
    entityType?: EntityType;
    entityId?: string;
    stage?: string;
    relatedAlerts?: string[];
    metadata: Record<string, any>;
  };
  
  // Lifecycle management
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolutionNote?: string;
  suppressedUntil?: Date;
  
  // Escalation
  escalation: {
    level: number;
    escalatedAt?: Date;
    assignedTo?: string;
    dueAt?: Date;
    escalationRules: string[];
  };
  
  // Notification tracking
  notifications: {
    channels: ('email' | 'webhook' | 'database' | 'realtime')[];
    recipients: string[];
    sent: boolean;
    sentAt?: Date;
    retryCount: number;
    lastAttempt?: Date;
    deliveryStatus: Record<string, 'pending' | 'sent' | 'failed'>;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  
  // Trigger conditions
  condition: {
    metric: string;
    operator: '>' | '<' | '=' | '!=' | 'contains' | 'not_contains';
    value: any;
    duration: number;                   // seconds to maintain condition
    evaluationInterval: number;        // seconds between evaluations
  };
  
  // Filtering
  filters: {
    integrationIds: string[];
    entityTypes: EntityType[];
    syncTypes: SyncType[];
    timeWindows: string[];             // business hours, weekends, etc.
  };
  
  // Alert configuration
  alert: {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
    suppressDuration: number;          // minutes to suppress duplicate alerts
  };
  
  // Notification settings
  notifications: {
    enabled: boolean;
    channels: ('email' | 'webhook' | 'database' | 'realtime')[];
    recipients: string[];
    escalationRules: {
      delayMinutes: number;
      level: number;
      recipients: string[];
    }[];
  };
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

// ===================================================================
// PERFORMANCE MONITORING
// ===================================================================

export interface PerformanceMetrics {
  integrationId: string;
  providerId: string;
  timestamp: Date;
  interval: 'minute' | 'hour' | 'day';
  
  // Core performance indicators
  throughput: {
    syncsPerHour: number;
    entitiesPerSecond: number;
    dataTransferRate: number;          // MB/s
    apiRequestsPerMinute: number;
  };
  
  // Timing metrics
  latency: {
    syncDuration: {
      min: number;
      max: number;
      avg: number;
      p95: number;
      p99: number;
    };
    apiResponseTime: {
      min: number;
      max: number;
      avg: number;
      p95: number;
      p99: number;
    };
    databaseQueryTime: {
      avg: number;
      p95: number;
      slowQueryCount: number;
    };
  };
  
  // Resource utilization
  resources: {
    cpuUsage: number;                  // percentage
    memoryUsage: number;               // percentage
    networkIO: {
      bytesIn: number;
      bytesOut: number;
    };
    diskIO: {
      readsPerSec: number;
      writesPerSec: number;
    };
    connectionPool: {
      active: number;
      idle: number;
      total: number;
      waitQueue: number;
    };
  };
  
  // Error and quality metrics
  quality: {
    errorRate: number;                 // 0-1
    warningRate: number;               // 0-1
    retryRate: number;                 // 0-1
    timeoutRate: number;               // 0-1
    conflictRate: number;              // conflicts per sync
    dataQualityScore: number;          // 0-100
  };
  
  // Cache performance
  cache: {
    hitRate: number;                   // 0-1
    missRate: number;                  // 0-1
    evictionRate: number;              // evictions per minute
    memoryUsage: number;               // MB
  };
}

// ===================================================================
// CONFIGURATION AND SETTINGS
// ===================================================================

export interface MonitoringConfig {
  integrationId: string;
  
  // General monitoring settings
  general: {
    enabled: boolean;
    samplingRate: number;              // 0-1, percentage of operations to monitor
    retentionPeriod: number;           // days to keep monitoring data
    compressionThreshold: number;      // days after which to compress data
  };
  
  // Performance monitoring
  performance: {
    enabled: boolean;
    metricsInterval: number;           // seconds between metric collections
    slowSyncThreshold: number;         // minutes
    highErrorRateThreshold: number;    // 0-1
    resourceAlertThresholds: {
      cpu: number;                     // percentage
      memory: number;                  // percentage
      connections: number;             // count
    };
  };
  
  // Health monitoring
  health: {
    enabled: boolean;
    checkInterval: number;             // seconds
    timeoutThreshold: number;          // seconds
    consecutiveFailureThreshold: number;
    uptimeCalculationWindow: number;   // hours
  };
  
  // Dashboard settings
  dashboard: {
    enabled: boolean;
    refreshInterval: number;           // seconds
    realtimeUpdates: boolean;
    defaultTimeRange: number;          // hours
    maxDataPoints: number;
  };
  
  // Alerting configuration
  alerting: {
    enabled: boolean;
    evaluationInterval: number;       // seconds
    maxAlertsPerHour: number;
    suppressDuplicates: boolean;
    defaultSuppressionWindow: number; // minutes
  };
  
  // Reporting configuration
  reporting: {
    enabled: boolean;
    defaultFormat: 'json' | 'csv' | 'pdf' | 'html';
    maxReportSize: number;             // MB
    retentionPeriod: number;           // days
    scheduledReportsEnabled: boolean;
  };
  
  // Notification settings
  notifications: {
    enabled: boolean;
    channels: {
      email: {
        enabled: boolean;
        smtp: {
          host: string;
          port: number;
          secure: boolean;
          user: string;
        };
        templates: Record<AlertType, string>;
      };
      webhook: {
        enabled: boolean;
        endpoints: {
          url: string;
          headers: Record<string, string>;
          timeout: number;
        }[];
      };
      realtime: {
        enabled: boolean;
        websocketPort?: number;
      };
    };
  };
}

// ===================================================================
// QUERY AND ANALYTICS INTERFACES
// ===================================================================

export interface MonitoringQuery {
  integrationId?: string;
  providerId?: string;
  entityTypes?: EntityType[];
  syncTypes?: SyncType[];
  statuses?: SyncStatus[];
  severities?: AlertSeverity[];
  
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  
  filters?: {
    hasErrors?: boolean;
    hasWarnings?: boolean;
    hasConflicts?: boolean;
    minDuration?: number;              // minutes
    maxDuration?: number;              // minutes
    tags?: string[];
  };
  
  groupBy?: ('hour' | 'day' | 'week' | 'entityType' | 'provider' | 'status')[];
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export interface MonitoringAnalytics {
  query: MonitoringQuery;
  
  // Aggregated metrics
  aggregations: {
    totalSyncs: number;
    uniqueIntegrations: number;
    totalDuration: number;
    avgDuration: number;
    successRate: number;
    errorRate: number;
    conflictRate: number;
  };
  
  // Time series data
  timeSeries: {
    [metric: string]: TimeSeriesData[];
  };
  
  // Breakdowns
  breakdowns: {
    byEntityType: Record<EntityType, any>;
    byProvider: Record<string, any>;
    byStatus: Record<SyncStatus, any>;
    byHour: Record<number, any>;
  };
  
  // Trends and insights
  insights: {
    trends: {
      metric: string;
      direction: 'increasing' | 'decreasing' | 'stable';
      confidence: number;
      significance: 'low' | 'medium' | 'high';
    }[];
    anomalies: {
      timestamp: Date;
      metric: string;
      expectedValue: number;
      actualValue: number;
      severity: 'info' | 'warning' | 'error';
    }[];
    recommendations: string[];
  };
  
  // Query metadata
  metadata: {
    executionTime: number;
    dataPoints: number;
    cacheHit: boolean;
    generatedAt: Date;
  };
}

// ===================================================================
// REAL-TIME UPDATES
// ===================================================================

export interface RealtimeUpdate {
  type: 'sync_status' | 'performance' | 'alert' | 'health' | 'dashboard';
  integrationId: string;
  timestamp: Date;
  data: any;
  
  // Update metadata
  metadata: {
    source: string;
    version: number;
    correlationId?: string;
  };
}

export interface WebSocketMessage {
  event: string;
  data: RealtimeUpdate;
  room?: string;                       // For filtering updates by integration
  timestamp: Date;
}
