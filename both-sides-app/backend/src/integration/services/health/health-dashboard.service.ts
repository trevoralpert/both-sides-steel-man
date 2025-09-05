/**
 * Health Dashboard Service
 * 
 * Real-time health monitoring dashboard providing comprehensive API health visualization,
 * performance metrics, trend analysis, and interactive health status displays.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'events';
import { HealthCheckService, ServiceHealthSummary, HealthStatus } from './health-check.service';
import { ApiPerformanceService, PerformanceMetrics, UsageAnalytics } from './api-performance.service';

// ===================================================================
// DASHBOARD TYPES AND INTERFACES
// ===================================================================

export interface DashboardOverview {
  timestamp: Date;
  systemHealth: {
    status: HealthStatus;
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    degradedServices: number;
    uptime: number;              // Overall system uptime percentage
  };
  
  performanceMetrics: {
    averageResponseTime: number;
    totalRequests: number;
    requestRate: number;         // requests per second
    errorRate: number;           // errors per second
    successRate: number;         // percentage
  };
  
  alerts: {
    critical: number;
    warning: number;
    info: number;
    recentAlerts: DashboardAlert[];
  };
  
  trends: {
    responseTime: TrendData;
    errorRate: TrendData;
    requestVolume: TrendData;
    availability: TrendData;
  };
}

export interface ServiceDashboard {
  service: string;
  timestamp: Date;
  
  healthSummary: ServiceHealthSummary;
  performanceAnalytics: UsageAnalytics;
  
  realTimeMetrics: {
    currentResponseTime: number;
    currentRequestRate: number;
    currentErrorRate: number;
    lastMinuteRequests: number;
    lastMinuteErrors: number;
  };
  
  endpointBreakdown: EndpointDashboard[];
  statusCodeDistribution: { code: string; count: number; percentage: number }[];
  errorBreakdown: { type: string; count: number; message: string }[];
  
  charts: {
    responseTimeChart: ChartData;
    requestVolumeChart: ChartData;
    errorRateChart: ChartData;
    statusCodeChart: ChartData;
  };
  
  slaStatus: {
    target: number;
    current: number;
    met: boolean;
    timeRemaining?: number;      // Time until SLA period end
  };
}

export interface EndpointDashboard {
  name: string;
  url: string;
  method: string;
  status: HealthStatus;
  
  metrics: {
    requests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    availability: number;
    lastCheck: Date;
  };
  
  recentActivity: {
    lastRequest: Date;
    requestsLast5Min: number;
    errorsLast5Min: number;
    slowRequestsLast5Min: number;  // Requests over threshold
  };
  
  issues: {
    active: number;
    resolved: number;
    critical: number;
    warnings: number;
  };
}

export interface DashboardAlert {
  id: string;
  service: string;
  endpoint?: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  triggeredAt: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  actions?: DashboardAction[];
}

export interface DashboardAction {
  id: string;
  type: 'acknowledge' | 'resolve' | 'escalate' | 'mute' | 'restart_service';
  label: string;
  icon: string;
  url?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface TrendData {
  metric: string;
  current: number;
  previous: number;
  change: number;              // Percentage change
  direction: 'up' | 'down' | 'stable';
  status: 'good' | 'bad' | 'neutral';
  confidence: number;          // 0-1
  timeRange: string;
}

export interface ChartData {
  type: 'line' | 'bar' | 'area' | 'pie' | 'gauge';
  title: string;
  subtitle?: string;
  
  xAxis: {
    label: string;
    type: 'time' | 'category' | 'numeric';
  };
  
  yAxis: {
    label: string;
    unit: string;
    min?: number;
    max?: number;
  };
  
  series: ChartSeries[];
  
  config: {
    height?: number;
    width?: number;
    responsive?: boolean;
    showLegend?: boolean;
    showTooltips?: boolean;
    colors?: string[];
  };
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  metadata?: any;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'list' | 'status' | 'table';
  title: string;
  subtitle?: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: { row: number; col: number };
  
  config: {
    refreshInterval?: number;    // seconds
    autoRefresh?: boolean;
    showHeader?: boolean;
    collapsible?: boolean;
  };
  
  data: any;                    // Widget-specific data
  lastUpdated: Date;
  loading?: boolean;
  error?: string;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  
  widgets: DashboardWidget[];
  
  settings: {
    refreshInterval: number;     // Global refresh interval
    theme: 'light' | 'dark';
    autoRefresh: boolean;
    notifications: boolean;
  };
  
  permissions: {
    canEdit: boolean;
    canShare: boolean;
    canExport: boolean;
  };
  
  metadata: {
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    version: string;
  };
}

// ===================================================================
// HEALTH DASHBOARD SERVICE
// ===================================================================

@Injectable()
export class HealthDashboardService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(HealthDashboardService.name);
  
  // Dashboard data storage
  private readonly dashboardCache = new Map<string, any>();
  private readonly alertsCache = new Map<string, DashboardAlert[]>();
  private readonly layoutsCache = new Map<string, DashboardLayout>();
  
  // Update intervals
  private readonly dashboardUpdateInterval = 30 * 1000;    // 30 seconds
  private readonly metricsUpdateInterval = 10 * 1000;      // 10 seconds
  private readonly chartUpdateInterval = 60 * 1000;        // 1 minute
  
  // Timers
  private dashboardUpdateTimer: NodeJS.Timeout;
  private metricsUpdateTimer: NodeJS.Timeout;
  private chartUpdateTimer: NodeJS.Timeout;

  constructor(
    private readonly healthCheck: HealthCheckService,
    private readonly performance: ApiPerformanceService,
  ) {
    super();
  }

  async onModuleInit() {
    this.setupEventListeners();
    this.startUpdateProcesses();
    this.loadDefaultLayouts();
    this.logger.log('Health Dashboard Service initialized');
  }

  // ===================================================================
  // DASHBOARD DATA GENERATION
  // ===================================================================

  /**
   * Get comprehensive dashboard overview
   */
  async getDashboardOverview(): Promise<DashboardOverview> {
    const systemHealth = this.healthCheck.getSystemHealth();
    const allServices = this.healthCheck.getAllServiceHealth();
    const performanceSummaries = this.performance.getAllServiceSummaries();
    
    // Calculate performance metrics
    const performanceMetrics = this.calculateOverallPerformanceMetrics(performanceSummaries);
    
    // Get recent alerts
    const recentAlerts = this.getRecentAlerts(10);
    const alertCounts = this.categorizeAlerts(recentAlerts);
    
    // Calculate trends
    const trends = await this.calculateSystemTrends();

    const overview: DashboardOverview = {
      timestamp: new Date(),
      systemHealth: {
        status: systemHealth.status,
        totalServices: systemHealth.totalServices,
        healthyServices: systemHealth.healthyServices,
        unhealthyServices: systemHealth.unhealthyServices,
        degradedServices: systemHealth.degradedServices,
        uptime: this.calculateSystemUptime(allServices),
      },
      performanceMetrics,
      alerts: {
        critical: alertCounts.critical,
        warning: alertCounts.warning,
        info: alertCounts.info,
        recentAlerts: recentAlerts.slice(0, 5),
      },
      trends,
    };

    this.dashboardCache.set('overview', overview);
    
    this.emit('dashboard:overview-updated', overview);
    
    return overview;
  }

  /**
   * Get service-specific dashboard
   */
  async getServiceDashboard(serviceName: string): Promise<ServiceDashboard | null> {
    const healthSummary = this.healthCheck.getServiceHealth(serviceName);
    if (!healthSummary) {
      return null;
    }

    const performanceAnalytics = this.performance.generateUsageAnalytics(serviceName);
    const performanceSummary = this.performance.getPerformanceSummary(serviceName);
    
    // Real-time metrics (last minute)
    const recentMetrics = this.performance.getCurrentMetrics(serviceName, 60);
    const lastMinuteMetrics = recentMetrics.filter(m => 
      m.timestamp.getTime() > Date.now() - 60 * 1000
    );
    
    const realTimeMetrics = {
      currentResponseTime: performanceSummary.averageResponseTime,
      currentRequestRate: lastMinuteMetrics.length / 60, // per second
      currentErrorRate: lastMinuteMetrics.filter(m => !m.success).length / 60,
      lastMinuteRequests: lastMinuteMetrics.length,
      lastMinuteErrors: lastMinuteMetrics.filter(m => !m.success).length,
    };

    // Endpoint breakdown
    const endpointBreakdown = healthSummary.endpointHealth.map(endpoint => 
      this.createEndpointDashboard(serviceName, endpoint)
    );

    // Status code distribution
    const statusCodes = new Map<string, number>();
    recentMetrics.forEach(m => {
      const code = m.statusCode.toString();
      statusCodes.set(code, (statusCodes.get(code) || 0) + 1);
    });

    const statusCodeDistribution = Array.from(statusCodes.entries())
      .map(([code, count]) => ({
        code,
        count,
        percentage: (count / recentMetrics.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Error breakdown
    const errors = new Map<string, { count: number; messages: string[] }>();
    recentMetrics.filter(m => !m.success).forEach(m => {
      const type = m.errorType || 'unknown';
      const error = errors.get(type) || { count: 0, messages: [] };
      error.count++;
      if (m.errorMessage && !error.messages.includes(m.errorMessage)) {
        error.messages.push(m.errorMessage);
      }
      errors.set(type, error);
    });

    const errorBreakdown = Array.from(errors.entries())
      .map(([type, error]) => ({
        type,
        count: error.count,
        message: error.messages.slice(0, 3).join('; '), // Top 3 messages
      }))
      .sort((a, b) => b.count - a.count);

    // Generate charts
    const charts = {
      responseTimeChart: this.generateResponseTimeChart(serviceName),
      requestVolumeChart: this.generateRequestVolumeChart(serviceName),
      errorRateChart: this.generateErrorRateChart(serviceName),
      statusCodeChart: this.generateStatusCodeChart(statusCodeDistribution),
    };

    // SLA status
    const slaStatus = {
      target: 99.9, // Default SLA target
      current: healthSummary.uptime,
      met: healthSummary.uptime >= 99.9,
    };

    const dashboard: ServiceDashboard = {
      service: serviceName,
      timestamp: new Date(),
      healthSummary,
      performanceAnalytics,
      realTimeMetrics,
      endpointBreakdown,
      statusCodeDistribution,
      errorBreakdown,
      charts,
      slaStatus,
    };

    this.dashboardCache.set(`service:${serviceName}`, dashboard);
    
    this.emit('dashboard:service-updated', { service: serviceName, dashboard });
    
    return dashboard;
  }

  /**
   * Get real-time metrics for all services
   */
  getRealTimeMetrics(): Map<string, {
    status: HealthStatus;
    responseTime: number;
    requestRate: number;
    errorRate: number;
    lastUpdated: Date;
  }> {
    const metrics = new Map();
    const allServices = this.healthCheck.getAllServiceHealth();
    const performanceSummaries = this.performance.getAllServiceSummaries();

    for (const [serviceName, healthSummary] of allServices.entries()) {
      const performanceSummary = performanceSummaries.get(serviceName);
      
      metrics.set(serviceName, {
        status: healthSummary.status,
        responseTime: performanceSummary?.averageResponseTime || 0,
        requestRate: this.calculateCurrentRequestRate(serviceName),
        errorRate: healthSummary.errorRate,
        lastUpdated: healthSummary.lastCheck,
      });
    }

    return metrics;
  }

  // ===================================================================
  // CHART GENERATION
  // ===================================================================

  private generateResponseTimeChart(serviceName: string): ChartData {
    const metrics = this.performance.getCurrentMetrics(serviceName, 60); // Last 60 data points
    const now = new Date();
    
    // Group by minute
    const minutelyData = new Map<string, number[]>();
    
    metrics.forEach(metric => {
      const minute = new Date(metric.timestamp);
      minute.setSeconds(0, 0);
      const key = minute.toISOString();
      
      if (!minutelyData.has(key)) {
        minutelyData.set(key, []);
      }
      minutelyData.get(key)!.push(metric.responseTime);
    });

    // Calculate averages
    const dataPoints: ChartDataPoint[] = Array.from(minutelyData.entries())
      .map(([time, responseTimes]) => ({
        x: new Date(time),
        y: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
        metadata: { count: responseTimes.length },
      }))
      .sort((a, b) => (a.x as Date).getTime() - (b.x as Date).getTime());

    return {
      type: 'line',
      title: 'Response Time',
      subtitle: 'Average response time over time',
      xAxis: { label: 'Time', type: 'time' },
      yAxis: { label: 'Response Time', unit: 'ms', min: 0 },
      series: [{
        name: 'Response Time',
        data: dataPoints,
        color: '#3B82F6',
      }],
      config: {
        height: 300,
        responsive: true,
        showLegend: false,
        showTooltips: true,
      },
    };
  }

  private generateRequestVolumeChart(serviceName: string): ChartData {
    const metrics = this.performance.getCurrentMetrics(serviceName, 60);
    
    // Group by minute and count requests
    const minutelyData = new Map<string, number>();
    
    metrics.forEach(metric => {
      const minute = new Date(metric.timestamp);
      minute.setSeconds(0, 0);
      const key = minute.toISOString();
      
      minutelyData.set(key, (minutelyData.get(key) || 0) + 1);
    });

    const dataPoints: ChartDataPoint[] = Array.from(minutelyData.entries())
      .map(([time, count]) => ({
        x: new Date(time),
        y: count,
      }))
      .sort((a, b) => (a.x as Date).getTime() - (b.x as Date).getTime());

    return {
      type: 'bar',
      title: 'Request Volume',
      subtitle: 'Requests per minute',
      xAxis: { label: 'Time', type: 'time' },
      yAxis: { label: 'Requests', unit: 'req/min', min: 0 },
      series: [{
        name: 'Requests',
        data: dataPoints,
        color: '#10B981',
      }],
      config: {
        height: 300,
        responsive: true,
        showLegend: false,
        showTooltips: true,
      },
    };
  }

  private generateErrorRateChart(serviceName: string): ChartData {
    const metrics = this.performance.getCurrentMetrics(serviceName, 60);
    
    // Group by minute and calculate error rate
    const minutelyData = new Map<string, { total: number; errors: number }>();
    
    metrics.forEach(metric => {
      const minute = new Date(metric.timestamp);
      minute.setSeconds(0, 0);
      const key = minute.toISOString();
      
      const data = minutelyData.get(key) || { total: 0, errors: 0 };
      data.total++;
      if (!metric.success) data.errors++;
      minutelyData.set(key, data);
    });

    const dataPoints: ChartDataPoint[] = Array.from(minutelyData.entries())
      .map(([time, data]) => ({
        x: new Date(time),
        y: data.total > 0 ? (data.errors / data.total) * 100 : 0,
        metadata: { errors: data.errors, total: data.total },
      }))
      .sort((a, b) => (a.x as Date).getTime() - (b.x as Date).getTime());

    return {
      type: 'area',
      title: 'Error Rate',
      subtitle: 'Percentage of failed requests',
      xAxis: { label: 'Time', type: 'time' },
      yAxis: { label: 'Error Rate', unit: '%', min: 0, max: 100 },
      series: [{
        name: 'Error Rate',
        data: dataPoints,
        color: '#EF4444',
      }],
      config: {
        height: 300,
        responsive: true,
        showLegend: false,
        showTooltips: true,
      },
    };
  }

  private generateStatusCodeChart(distribution: { code: string; count: number; percentage: number }[]): ChartData {
    const dataPoints: ChartDataPoint[] = distribution.map(item => ({
      x: item.code,
      y: item.count,
      label: `${item.code} (${item.percentage.toFixed(1)}%)`,
    }));

    const colors = distribution.map(item => {
      const code = parseInt(item.code);
      if (code >= 200 && code < 300) return '#10B981'; // Green for 2xx
      if (code >= 300 && code < 400) return '#F59E0B'; // Yellow for 3xx
      if (code >= 400 && code < 500) return '#EF4444'; // Red for 4xx
      if (code >= 500) return '#DC2626';               // Dark red for 5xx
      return '#6B7280';                                // Gray for others
    });

    return {
      type: 'pie',
      title: 'Status Code Distribution',
      subtitle: 'Response status codes',
      xAxis: { label: 'Status Code', type: 'category' },
      yAxis: { label: 'Count', unit: 'requests' },
      series: [{
        name: 'Status Codes',
        data: dataPoints,
      }],
      config: {
        height: 300,
        responsive: true,
        showLegend: true,
        showTooltips: true,
        colors,
      },
    };
  }

  // ===================================================================
  // WIDGET AND LAYOUT MANAGEMENT
  // ===================================================================

  /**
   * Create custom dashboard widget
   */
  createWidget(
    type: DashboardWidget['type'],
    title: string,
    config: Partial<DashboardWidget>,
  ): DashboardWidget {
    const widget: DashboardWidget = {
      id: this.generateWidgetId(),
      type,
      title,
      subtitle: config.subtitle,
      size: config.size || 'medium',
      position: config.position || { row: 0, col: 0 },
      config: {
        refreshInterval: 30,
        autoRefresh: true,
        showHeader: true,
        collapsible: true,
        ...config.config,
      },
      data: config.data || {},
      lastUpdated: new Date(),
      loading: false,
    };

    this.emit('widget:created', widget);
    
    return widget;
  }

  /**
   * Update widget data
   */
  updateWidget(widgetId: string, data: any): void {
    // This would update widget data and emit events
    // Implementation depends on widget storage mechanism
    
    this.emit('widget:updated', {
      widgetId,
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Create dashboard layout
   */
  createLayout(
    name: string,
    description: string,
    widgets: DashboardWidget[],
    settings?: Partial<DashboardLayout['settings']>,
  ): DashboardLayout {
    const layout: DashboardLayout = {
      id: this.generateLayoutId(),
      name,
      description,
      widgets,
      settings: {
        refreshInterval: 30,
        theme: 'light',
        autoRefresh: true,
        notifications: true,
        ...settings,
      },
      permissions: {
        canEdit: true,
        canShare: true,
        canExport: true,
      },
      metadata: {
        createdAt: new Date(),
        createdBy: 'system',
        updatedAt: new Date(),
        updatedBy: 'system',
        version: '1.0.0',
      },
    };

    this.layoutsCache.set(layout.id, layout);
    
    this.emit('layout:created', layout);
    
    return layout;
  }

  // ===================================================================
  // ALERT MANAGEMENT
  // ===================================================================

  /**
   * Get all dashboard alerts
   */
  getAllAlerts(): DashboardAlert[] {
    const allAlerts: DashboardAlert[] = [];
    
    for (const alerts of this.alertsCache.values()) {
      allAlerts.push(...alerts);
    }
    
    return allAlerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Get alerts for specific service
   */
  getServiceAlerts(serviceName: string): DashboardAlert[] {
    return this.alertsCache.get(serviceName) || [];
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.findAlert(alertId);
    if (!alert) return false;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.emit('alert:acknowledged', alert);
    
    this.logger.log(`Alert acknowledged: ${alertId}`, {
      service: alert.service,
      acknowledgedBy,
    });
    
    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.findAlert(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    this.emit('alert:resolved', alert);
    
    this.logger.log(`Alert resolved: ${alertId}`, {
      service: alert.service,
      resolvedBy,
    });
    
    return true;
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private setupEventListeners(): void {
    // Listen to health check events
    this.healthCheck.on('health-check:completed', (event) => {
      this.handleHealthCheckEvent(event);
    });

    this.healthCheck.on('health-issue:detected', (event) => {
      this.handleHealthIssueEvent(event);
    });

    // Listen to performance events
    this.performance.on('performance:alert', (event) => {
      this.handlePerformanceAlertEvent(event);
    });

    this.performance.on('metrics:recorded', (event) => {
      this.handleMetricsEvent(event);
    });
  }

  private startUpdateProcesses(): void {
    // Update dashboard overview
    this.dashboardUpdateTimer = setInterval(() => {
      this.updateDashboardCache();
    }, this.dashboardUpdateInterval);

    // Update real-time metrics
    this.metricsUpdateTimer = setInterval(() => {
      this.updateMetricsCache();
    }, this.metricsUpdateInterval);

    // Update charts
    this.chartUpdateTimer = setInterval(() => {
      this.updateChartsCache();
    }, this.chartUpdateInterval);
  }

  private loadDefaultLayouts(): void {
    // Create default system overview layout
    const systemOverviewWidgets = [
      this.createWidget('status', 'System Health', {
        size: 'large',
        position: { row: 0, col: 0 },
        data: { type: 'system-health' },
      }),
      this.createWidget('metric', 'Total Requests', {
        size: 'small',
        position: { row: 0, col: 1 },
        data: { metric: 'total-requests' },
      }),
      this.createWidget('metric', 'Average Response Time', {
        size: 'small',
        position: { row: 0, col: 2 },
        data: { metric: 'avg-response-time' },
      }),
      this.createWidget('chart', 'Response Time Trend', {
        size: 'medium',
        position: { row: 1, col: 0 },
        data: { chart: 'system-response-time' },
      }),
      this.createWidget('chart', 'Request Volume', {
        size: 'medium',
        position: { row: 1, col: 1 },
        data: { chart: 'system-request-volume' },
      }),
      this.createWidget('list', 'Recent Alerts', {
        size: 'medium',
        position: { row: 2, col: 0 },
        data: { type: 'recent-alerts', limit: 10 },
      }),
      this.createWidget('table', 'Service Status', {
        size: 'large',
        position: { row: 2, col: 1 },
        data: { type: 'service-status-table' },
      }),
    ];

    this.createLayout(
      'System Overview',
      'Comprehensive system health and performance overview',
      systemOverviewWidgets,
      { refreshInterval: 30 },
    );
  }

  private calculateOverallPerformanceMetrics(
    summaries: Map<string, ReturnType<typeof this.performance.getPerformanceSummary>>,
  ) {
    let totalRequests = 0;
    let totalResponseTime = 0;
    let totalErrors = 0;
    let servicesWithData = 0;

    for (const summary of summaries.values()) {
      if (summary.requestCount > 0) {
        totalRequests += summary.requestCount;
        totalResponseTime += summary.averageResponseTime * summary.requestCount;
        totalErrors += (summary.errorRate / 100) * summary.requestCount;
        servicesWithData++;
      }
    }

    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 100;

    return {
      averageResponseTime,
      totalRequests,
      requestRate: this.calculateSystemRequestRate(),
      errorRate,
      successRate,
    };
  }

  private calculateSystemUptime(services: Map<string, ServiceHealthSummary>): number {
    if (services.size === 0) return 100;

    const uptimes = Array.from(services.values()).map(service => service.uptime);
    return uptimes.reduce((sum, uptime) => sum + uptime, 0) / uptimes.length;
  }

  private async calculateSystemTrends(): Promise<DashboardOverview['trends']> {
    // This would calculate system-wide trends
    // For now, return mock data
    return {
      responseTime: {
        metric: 'Response Time',
        current: 150,
        previous: 180,
        change: -16.7,
        direction: 'down',
        status: 'good',
        confidence: 0.9,
        timeRange: '24h',
      },
      errorRate: {
        metric: 'Error Rate',
        current: 2.1,
        previous: 3.2,
        change: -34.4,
        direction: 'down',
        status: 'good',
        confidence: 0.8,
        timeRange: '24h',
      },
      requestVolume: {
        metric: 'Request Volume',
        current: 1250,
        previous: 980,
        change: 27.6,
        direction: 'up',
        status: 'neutral',
        confidence: 0.95,
        timeRange: '24h',
      },
      availability: {
        metric: 'Availability',
        current: 99.8,
        previous: 99.2,
        change: 0.6,
        direction: 'up',
        status: 'good',
        confidence: 0.85,
        timeRange: '24h',
      },
    };
  }

  private getRecentAlerts(limit: number): DashboardAlert[] {
    const allAlerts = this.getAllAlerts();
    return allAlerts.slice(0, limit);
  }

  private categorizeAlerts(alerts: DashboardAlert[]): { critical: number; warning: number; info: number } {
    return alerts.reduce(
      (counts, alert) => {
        if (alert.status === 'active') {
          counts[alert.severity]++;
        }
        return counts;
      },
      { critical: 0, warning: 0, info: 0 },
    );
  }

  private createEndpointDashboard(
    serviceName: string,
    endpoint: ServiceHealthSummary['endpointHealth'][0],
  ): EndpointDashboard {
    // Get recent metrics for this endpoint
    const recentMetrics = this.performance.getCurrentMetrics(serviceName, 100)
      .filter(m => m.endpoint === endpoint.name);
    
    const last5MinMetrics = recentMetrics.filter(m => 
      m.timestamp.getTime() > Date.now() - 5 * 60 * 1000
    );

    const slowThreshold = 2000; // 2 seconds
    const slowRequests = last5MinMetrics.filter(m => m.responseTime > slowThreshold).length;

    return {
      name: endpoint.name,
      url: endpoint.url,
      method: 'GET', // Would extract from endpoint config
      status: endpoint.status,
      metrics: {
        requests: recentMetrics.length,
        averageResponseTime: endpoint.responseTime,
        p95ResponseTime: 0, // Would calculate from metrics
        errorRate: 100 - endpoint.availability,
        availability: endpoint.availability,
        lastCheck: endpoint.lastCheck,
      },
      recentActivity: {
        lastRequest: recentMetrics.length > 0 
          ? new Date(Math.max(...recentMetrics.map(m => m.timestamp.getTime())))
          : new Date(0),
        requestsLast5Min: last5MinMetrics.length,
        errorsLast5Min: last5MinMetrics.filter(m => !m.success).length,
        slowRequestsLast5Min: slowRequests,
      },
      issues: {
        active: 0, // Would count from health issues
        resolved: 0,
        critical: 0,
        warnings: 0,
      },
    };
  }

  private calculateCurrentRequestRate(serviceName: string): number {
    const metrics = this.performance.getCurrentMetrics(serviceName, 60);
    const lastMinuteMetrics = metrics.filter(m => 
      m.timestamp.getTime() > Date.now() - 60 * 1000
    );
    
    return lastMinuteMetrics.length / 60; // per second
  }

  private calculateSystemRequestRate(): number {
    const allSummaries = this.performance.getAllServiceSummaries();
    let totalRate = 0;
    
    for (const [serviceName] of allSummaries.entries()) {
      totalRate += this.calculateCurrentRequestRate(serviceName);
    }
    
    return totalRate;
  }

  private handleHealthCheckEvent(event: any): void {
    // Update dashboard cache when health check completes
    this.emit('dashboard:health-updated', {
      service: event.service,
      status: event.status,
      timestamp: new Date(),
    });
  }

  private handleHealthIssueEvent(event: any): void {
    // Create dashboard alert from health issue
    const alert: DashboardAlert = {
      id: this.generateAlertId(),
      service: event.service,
      severity: event.issue.severity === 'critical' ? 'critical' : 'warning',
      title: event.issue.title,
      description: event.issue.description,
      triggeredAt: event.issue.firstSeen,
      status: 'active',
      actions: this.generateAlertActions(event.issue.type),
    };

    this.addAlert(event.service, alert);
  }

  private handlePerformanceAlertEvent(event: any): void {
    // Create dashboard alert from performance alert
    const alert: DashboardAlert = {
      id: this.generateAlertId(),
      service: event.service,
      endpoint: event.endpoint,
      severity: event.alert.severity,
      title: event.alert.title,
      description: event.alert.description,
      triggeredAt: event.alert.triggeredAt,
      status: 'active',
      actions: this.generateAlertActions(event.alert.alertType),
    };

    this.addAlert(event.service, alert);
  }

  private handleMetricsEvent(event: any): void {
    // Update real-time metrics cache
    this.emit('dashboard:metrics-updated', {
      service: event.service,
      endpoint: event.endpoint,
      metrics: event.metrics,
    });
  }

  private addAlert(serviceName: string, alert: DashboardAlert): void {
    let serviceAlerts = this.alertsCache.get(serviceName) || [];
    serviceAlerts.push(alert);
    
    // Keep only recent alerts (last 100)
    serviceAlerts = serviceAlerts.slice(-100);
    
    this.alertsCache.set(serviceName, serviceAlerts);

    this.emit('alert:created', alert);
  }

  private findAlert(alertId: string): DashboardAlert | null {
    for (const alerts of this.alertsCache.values()) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) return alert;
    }
    return null;
  }

  private generateAlertActions(type: string): DashboardAction[] {
    const baseActions: DashboardAction[] = [
      {
        id: 'acknowledge',
        type: 'acknowledge',
        label: 'Acknowledge',
        icon: 'check-circle',
      },
      {
        id: 'resolve',
        type: 'resolve',
        label: 'Resolve',
        icon: 'x-circle',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to mark this alert as resolved?',
      },
    ];

    // Add type-specific actions
    if (type === 'endpoint_down' || type === 'availability') {
      baseActions.push({
        id: 'restart',
        type: 'restart_service',
        label: 'Restart Service',
        icon: 'refresh-cw',
        requiresConfirmation: true,
        confirmationMessage: 'This will restart the service. Continue?',
      });
    }

    return baseActions;
  }

  private updateDashboardCache(): void {
    // Update cached dashboard data
    this.getDashboardOverview();
  }

  private updateMetricsCache(): void {
    // Update real-time metrics
    const realTimeMetrics = this.getRealTimeMetrics();
    this.dashboardCache.set('real-time-metrics', realTimeMetrics);
    
    this.emit('dashboard:real-time-updated', realTimeMetrics);
  }

  private updateChartsCache(): void {
    // Update chart data for all services
    const allServices = this.healthCheck.getAllServiceHealth();
    
    for (const serviceName of allServices.keys()) {
      const charts = {
        responseTime: this.generateResponseTimeChart(serviceName),
        requestVolume: this.generateRequestVolumeChart(serviceName),
        errorRate: this.generateErrorRateChart(serviceName),
      };
      
      this.dashboardCache.set(`charts:${serviceName}`, charts);
    }

    this.emit('dashboard:charts-updated', { timestamp: new Date() });
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLayoutId(): string {
    return `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===================================================================
  // PUBLIC API METHODS
  // ===================================================================

  /**
   * Get cached dashboard data
   */
  getCachedData(key: string): any {
    return this.dashboardCache.get(key);
  }

  /**
   * Get available dashboard layouts
   */
  getLayouts(): DashboardLayout[] {
    return Array.from(this.layoutsCache.values());
  }

  /**
   * Get specific layout
   */
  getLayout(layoutId: string): DashboardLayout | null {
    return this.layoutsCache.get(layoutId) || null;
  }

  /**
   * Export dashboard data
   */
  exportData(format: 'json' | 'csv' = 'json'): any {
    const exportData = {
      timestamp: new Date(),
      overview: this.dashboardCache.get('overview'),
      realTimeMetrics: this.dashboardCache.get('real-time-metrics'),
      alerts: this.getAllAlerts(),
      services: {},
    };

    // Add service-specific data
    const allServices = this.healthCheck.getAllServiceHealth();
    for (const serviceName of allServices.keys()) {
      exportData.services[serviceName] = this.dashboardCache.get(`service:${serviceName}`);
    }

    return exportData;
  }

  // ===================================================================
  // CLEANUP
  // ===================================================================

  async onModuleDestroy() {
    if (this.dashboardUpdateTimer) clearInterval(this.dashboardUpdateTimer);
    if (this.metricsUpdateTimer) clearInterval(this.metricsUpdateTimer);
    if (this.chartUpdateTimer) clearInterval(this.chartUpdateTimer);
    
    this.logger.log('Health Dashboard Service destroyed');
  }
}
