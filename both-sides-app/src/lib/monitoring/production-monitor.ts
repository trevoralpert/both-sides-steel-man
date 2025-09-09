/**
 * Production Monitoring System
 * Comprehensive monitoring, alerting, and performance tracking for production
 */

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  dimensions?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: AlertChannel[];
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
}

export interface PerformanceMetrics {
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  errorRate: {
    percentage: number;
    count: number;
  };
  availability: {
    percentage: number;
    uptime: number;
    downtime: number;
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
  timeRange: string;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'alert' | 'log' | 'table';
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

export class ProductionMonitor {
  private metrics: Map<string, MetricData[]> = new Map();
  private alerts: Map<string, AlertRule> = new Map();
  private dashboards: Map<string, MonitoringDashboard> = new Map();
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    console.log('📊 Initializing Production Monitoring System');
    
    // Set up default alert rules
    this.setupDefaultAlerts();
    
    // Create default dashboards
    this.createDefaultDashboards();
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('📊 Production monitoring active');
  }

  /**
   * Record a metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = 'count',
    tags: Record<string, string> = {},
    dimensions: Record<string, string> = {}
  ): void {
    const metric: MetricData = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        ...tags
      },
      dimensions
    };

    // Store metric
    const metricHistory = this.metrics.get(name) || [];
    metricHistory.push(metric);
    
    // Keep only last 1000 data points per metric
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }
    
    this.metrics.set(name, metricHistory);

    // Check alerts
    this.checkAlerts(metric);

    // Log metric (in production, this would go to a monitoring service)
    console.log(`📈 Metric: ${name}=${value}${unit} ${JSON.stringify(tags)}`);
  }

  /**
   * Record response time
   */
  recordResponseTime(endpoint: string, duration: number, statusCode: number): void {
    this.recordMetric('http_request_duration', duration, 'ms', {
      endpoint,
      status_code: statusCode.toString(),
      status_class: Math.floor(statusCode / 100) + 'xx'
    });

    this.recordMetric('http_requests_total', 1, 'count', {
      endpoint,
      status_code: statusCode.toString(),
      status_class: Math.floor(statusCode / 100) + 'xx'
    });
  }

  /**
   * Record error
   */
  recordError(error: Error, context: Record<string, any> = {}): void {
    this.recordMetric('errors_total', 1, 'count', {
      error_type: error.constructor.name,
      error_message: error.message.substring(0, 100),
      ...context
    });

    console.error('🚨 Error recorded:', error.message, context);
  }

  /**
   * Record business metric
   */
  recordBusinessMetric(
    event: string,
    value: number = 1,
    userId?: string,
    metadata: Record<string, any> = {}
  ): void {
    this.recordMetric(`business_${event}`, value, 'count', {
      user_id: userId || 'anonymous',
      ...metadata
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(timeRange: string = '1h'): PerformanceMetrics {
    const now = new Date();
    const startTime = this.getTimeRangeStart(timeRange, now);

    // Get response time metrics
    const responseTimeMetrics = this.getMetricsInRange('http_request_duration', startTime, now);
    const durations = responseTimeMetrics.map(m => m.value).sort((a, b) => a - b);
    
    // Get request count metrics
    const requestMetrics = this.getMetricsInRange('http_requests_total', startTime, now);
    const totalRequests = requestMetrics.reduce((sum, m) => sum + m.value, 0);
    const errorRequests = requestMetrics
      .filter(m => m.tags.status_class === '4xx' || m.tags.status_class === '5xx')
      .reduce((sum, m) => sum + m.value, 0);

    // Calculate time range in seconds
    const timeRangeSeconds = (now.getTime() - startTime.getTime()) / 1000;

    return {
      responseTime: {
        avg: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        p50: this.percentile(durations, 0.5),
        p95: this.percentile(durations, 0.95),
        p99: this.percentile(durations, 0.99)
      },
      throughput: {
        requestsPerSecond: totalRequests / timeRangeSeconds,
        requestsPerMinute: (totalRequests / timeRangeSeconds) * 60
      },
      errorRate: {
        percentage: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
        count: errorRequests
      },
      availability: {
        percentage: totalRequests > 0 ? ((totalRequests - errorRequests) / totalRequests) * 100 : 100,
        uptime: timeRangeSeconds,
        downtime: 0 // Would be calculated from actual downtime tracking
      },
      resources: {
        cpu: this.getLatestMetricValue('cpu_usage_percent') || 0,
        memory: this.getLatestMetricValue('memory_usage_percent') || 0,
        disk: this.getLatestMetricValue('disk_usage_percent') || 0
      }
    };
  }

  /**
   * Create alert rule
   */
  createAlert(
    name: string,
    metric: string,
    condition: AlertRule['condition'],
    threshold: number,
    duration: number,
    severity: AlertRule['severity'],
    channels: AlertChannel[]
  ): AlertRule {
    const alert: AlertRule = {
      id: this.generateAlertId(),
      name,
      metric,
      condition,
      threshold,
      duration,
      severity,
      channels,
      enabled: true,
      triggerCount: 0
    };

    this.alerts.set(alert.id, alert);
    console.log(`🚨 Created alert rule: ${name}`);
    
    return alert;
  }

  /**
   * Check alerts for a metric
   */
  private checkAlerts(metric: MetricData): void {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled || alert.metric !== metric.name) continue;

      const shouldTrigger = this.evaluateAlertCondition(alert, metric.value);
      
      if (shouldTrigger) {
        this.triggerAlert(alert, metric);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(alert: AlertRule, metric: MetricData): Promise<void> {
    // Check if alert is in cooldown period
    if (alert.lastTriggered) {
      const cooldownPeriod = 300000; // 5 minutes
      const timeSinceLastTrigger = Date.now() - alert.lastTriggered.getTime();
      
      if (timeSinceLastTrigger < cooldownPeriod) {
        return; // Skip triggering during cooldown
      }
    }

    alert.lastTriggered = new Date();
    alert.triggerCount++;

    console.log(`🚨 ALERT TRIGGERED: ${alert.name} - ${metric.name}=${metric.value} (threshold: ${alert.threshold})`);

    // Send notifications through configured channels
    for (const channel of alert.channels) {
      if (channel.enabled) {
        await this.sendAlertNotification(alert, metric, channel);
      }
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(
    alert: AlertRule,
    metric: MetricData,
    channel: AlertChannel
  ): Promise<void> {
    const message = `🚨 ${alert.severity.toUpperCase()} ALERT: ${alert.name}\n` +
                   `Metric: ${metric.name} = ${metric.value}\n` +
                   `Threshold: ${alert.threshold}\n` +
                   `Time: ${metric.timestamp.toISOString()}`;

    switch (channel.type) {
      case 'email':
        await this.sendEmailAlert(message, channel.config);
        break;
      case 'slack':
        await this.sendSlackAlert(message, channel.config);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, metric, channel.config);
        break;
      case 'sms':
        await this.sendSMSAlert(message, channel.config);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(alert, metric, channel.config);
        break;
    }
  }

  /**
   * Create monitoring dashboard
   */
  createDashboard(
    name: string,
    widgets: Omit<DashboardWidget, 'id'>[],
    refreshInterval: number = 30000
  ): MonitoringDashboard {
    const dashboard: MonitoringDashboard = {
      id: this.generateDashboardId(),
      name,
      widgets: widgets.map(widget => ({
        ...widget,
        id: this.generateWidgetId()
      })),
      refreshInterval,
      timeRange: '1h'
    };

    this.dashboards.set(dashboard.id, dashboard);
    console.log(`📊 Created dashboard: ${name}`);
    
    return dashboard;
  }

  /**
   * Get dashboard data
   */
  getDashboardData(dashboardId: string): any {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const data: any = {
      dashboard,
      data: {}
    };

    // Collect data for each widget
    for (const widget of dashboard.widgets) {
      switch (widget.type) {
        case 'metric':
          data.data[widget.id] = this.getMetricWidgetData(widget);
          break;
        case 'chart':
          data.data[widget.id] = this.getChartWidgetData(widget);
          break;
        case 'alert':
          data.data[widget.id] = this.getAlertWidgetData(widget);
          break;
      }
    }

    return data;
  }

  // Helper methods
  private setupDefaultAlerts(): void {
    // High error rate alert
    this.createAlert(
      'High Error Rate',
      'errors_total',
      'greater_than',
      10,
      300,
      'high',
      [
        { type: 'email', config: { to: 'alerts@bothsides.app' }, enabled: true },
        { type: 'slack', config: { channel: '#alerts' }, enabled: true }
      ]
    );

    // Slow response time alert
    this.createAlert(
      'Slow Response Time',
      'http_request_duration',
      'greater_than',
      2000,
      300,
      'medium',
      [
        { type: 'slack', config: { channel: '#performance' }, enabled: true }
      ]
    );

    // High memory usage alert
    this.createAlert(
      'High Memory Usage',
      'memory_usage_percent',
      'greater_than',
      85,
      600,
      'high',
      [
        { type: 'email', config: { to: 'ops@bothsides.app' }, enabled: true }
      ]
    );
  }

  private createDefaultDashboards(): void {
    // System Overview Dashboard
    this.createDashboard('System Overview', [
      {
        type: 'metric',
        title: 'Requests per Minute',
        config: { metric: 'http_requests_total', aggregation: 'rate' },
        position: { x: 0, y: 0, width: 6, height: 3 }
      },
      {
        type: 'metric',
        title: 'Error Rate',
        config: { metric: 'errors_total', aggregation: 'rate' },
        position: { x: 6, y: 0, width: 6, height: 3 }
      },
      {
        type: 'chart',
        title: 'Response Time',
        config: { metric: 'http_request_duration', chartType: 'line' },
        position: { x: 0, y: 3, width: 12, height: 4 }
      }
    ]);

    // Performance Dashboard
    this.createDashboard('Performance', [
      {
        type: 'chart',
        title: 'Response Time Percentiles',
        config: { 
          metrics: ['http_request_duration'],
          percentiles: [50, 95, 99],
          chartType: 'line'
        },
        position: { x: 0, y: 0, width: 12, height: 4 }
      },
      {
        type: 'metric',
        title: 'CPU Usage',
        config: { metric: 'cpu_usage_percent' },
        position: { x: 0, y: 4, width: 4, height: 3 }
      },
      {
        type: 'metric',
        title: 'Memory Usage',
        config: { metric: 'memory_usage_percent' },
        position: { x: 4, y: 4, width: 4, height: 3 }
      },
      {
        type: 'metric',
        title: 'Disk Usage',
        config: { metric: 'disk_usage_percent' },
        position: { x: 8, y: 4, width: 4, height: 3 }
      }
    ]);
  }

  private evaluateAlertCondition(alert: AlertRule, value: number): boolean {
    switch (alert.condition) {
      case 'greater_than':
        return value > alert.threshold;
      case 'less_than':
        return value < alert.threshold;
      case 'equals':
        return value === alert.threshold;
      case 'not_equals':
        return value !== alert.threshold;
      default:
        return false;
    }
  }

  private getMetricsInRange(metricName: string, startTime: Date, endTime: Date): MetricData[] {
    const metrics = this.metrics.get(metricName) || [];
    return metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  private getLatestMetricValue(metricName: string): number | null {
    const metrics = this.metrics.get(metricName) || [];
    return metrics.length > 0 ? metrics[metrics.length - 1].value : null;
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    
    const index = Math.ceil(values.length * p) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  private getTimeRangeStart(timeRange: string, endTime: Date): Date {
    const ranges: Record<string, number> = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const duration = ranges[timeRange] || ranges['1h'];
    return new Date(endTime.getTime() - duration);
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Collect system metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    console.log('📊 Started continuous monitoring');
  }

  private collectSystemMetrics(): void {
    // Collect memory usage
    const memoryUsage = process.memoryUsage();
    this.recordMetric('memory_usage_bytes', memoryUsage.heapUsed, 'bytes');
    this.recordMetric('memory_usage_percent', (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100, 'percent');

    // Collect process uptime
    this.recordMetric('process_uptime_seconds', process.uptime(), 'seconds');

    // Collect event loop lag (simplified)
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      this.recordMetric('event_loop_lag_ms', lag, 'ms');
    });
  }

  // Notification methods (simplified implementations)
  private async sendEmailAlert(message: string, config: any): Promise<void> {
    console.log(`📧 Email Alert: ${message}`);
    // Implementation would use actual email service
  }

  private async sendSlackAlert(message: string, config: any): Promise<void> {
    console.log(`💬 Slack Alert: ${message}`);
    // Implementation would use Slack API
  }

  private async sendWebhookAlert(alert: AlertRule, metric: MetricData, config: any): Promise<void> {
    console.log(`🔗 Webhook Alert: ${alert.name}`);
    // Implementation would make HTTP request to webhook URL
  }

  private async sendSMSAlert(message: string, config: any): Promise<void> {
    console.log(`📱 SMS Alert: ${message}`);
    // Implementation would use SMS service
  }

  private async sendPagerDutyAlert(alert: AlertRule, metric: MetricData, config: any): Promise<void> {
    console.log(`📟 PagerDuty Alert: ${alert.name}`);
    // Implementation would use PagerDuty API
  }

  private getMetricWidgetData(widget: DashboardWidget): any {
    const metricName = widget.config.metric;
    const latest = this.getLatestMetricValue(metricName);
    
    return {
      value: latest,
      unit: widget.config.unit || 'count',
      trend: 'stable' // Would calculate actual trend
    };
  }

  private getChartWidgetData(widget: DashboardWidget): any {
    const metricName = widget.config.metric;
    const timeRange = widget.config.timeRange || '1h';
    const now = new Date();
    const startTime = this.getTimeRangeStart(timeRange, now);
    
    const metrics = this.getMetricsInRange(metricName, startTime, now);
    
    return {
      data: metrics.map(m => ({
        timestamp: m.timestamp,
        value: m.value
      })),
      chartType: widget.config.chartType || 'line'
    };
  }

  private getAlertWidgetData(widget: DashboardWidget): any {
    const activeAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.enabled)
      .map(alert => ({
        id: alert.id,
        name: alert.name,
        severity: alert.severity,
        lastTriggered: alert.lastTriggered,
        triggerCount: alert.triggerCount
      }));

    return { alerts: activeAlerts };
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
}

// Export singleton instance
export const productionMonitor = new ProductionMonitor();

// Middleware for automatic request monitoring
export function monitoringMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const endpoint = req.route?.path || req.path || 'unknown';
      
      productionMonitor.recordResponseTime(endpoint, duration, res.statusCode);
    });
    
    next();
  };
}

export default {
  ProductionMonitor,
  productionMonitor,
  monitoringMiddleware
};
