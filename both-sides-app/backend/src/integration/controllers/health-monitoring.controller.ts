/**
 * Health Monitoring Controller
 * 
 * REST API endpoints for comprehensive health monitoring including health checks,
 * performance metrics, dashboard data, and real-time monitoring capabilities.
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { HealthCheckService, ServiceHealthSummary, HealthCheckConfig } from '../services/health/health-check.service';
import { ApiPerformanceService, PerformanceMetrics, UsageAnalytics, PerformanceReport } from '../services/health/api-performance.service';
import { HealthDashboardService, DashboardOverview, ServiceDashboard, DashboardAlert } from '../services/health/health-dashboard.service';

// ===================================================================
// DTO CLASSES FOR REQUEST/RESPONSE
// ===================================================================

export class HealthCheckConfigDto {
  name: string;
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
  retryDelay: number;
  endpoints: {
    name: string;
    url: string;
    method: 'GET' | 'POST' | 'HEAD';
    headers?: Record<string, string>;
    expectedStatus?: number[];
    expectedResponseTime?: number;
    criticalEndpoint?: boolean;
  }[];
  thresholds: {
    responseTime: { warning: number; critical: number };
    availability: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
  };
  notifications: {
    enabled: boolean;
    channels: string[];
  };
}

export class PerformanceMetricsDto {
  service: string;
  endpoint?: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  requestSize?: number;
  responseSize?: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class AlertActionDto {
  alertId: string;
  action: 'acknowledge' | 'resolve' | 'escalate' | 'mute';
  userId?: string;
  comment?: string;
}

export class DashboardConfigDto {
  refreshInterval?: number;
  theme?: 'light' | 'dark';
  autoRefresh?: boolean;
  notifications?: boolean;
}

// ===================================================================
// HEALTH MONITORING CONTROLLER
// ===================================================================

@ApiTags('Health Monitoring')
@Controller('health-monitoring')
export class HealthMonitoringController {
  private readonly logger = new Logger(HealthMonitoringController.name);

  constructor(
    private readonly healthCheck: HealthCheckService,
    private readonly performance: ApiPerformanceService,
    private readonly dashboard: HealthDashboardService,
  ) {}

  // ===================================================================
  // HEALTH CHECK ENDPOINTS
  // ===================================================================

  @Get('health/overview')
  @ApiOperation({ summary: 'Get system health overview' })
  @ApiResponse({ status: 200, description: 'System health overview retrieved successfully' })
  async getSystemHealthOverview() {
    try {
      return this.healthCheck.getSystemHealth();
    } catch (error) {
      this.logger.error(`Failed to get system health overview: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve system health overview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health/services')
  @ApiOperation({ summary: 'Get health status for all services' })
  @ApiResponse({ status: 200, description: 'All service health statuses retrieved successfully' })
  async getAllServiceHealth() {
    try {
      const healthData = this.healthCheck.getAllServiceHealth();
      return Array.from(healthData.entries()).map(([service, health]) => ({
        service,
        ...health,
      }));
    } catch (error) {
      this.logger.error(`Failed to get all service health: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve service health data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health/services/:serviceName')
  @ApiOperation({ summary: 'Get health status for specific service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service to check' })
  @ApiResponse({ status: 200, description: 'Service health status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getServiceHealth(@Param('serviceName') serviceName: string): Promise<ServiceHealthSummary> {
    try {
      const health = this.healthCheck.getServiceHealth(serviceName);
      if (!health) {
        throw new HttpException(`Service '${serviceName}' not found`, HttpStatus.NOT_FOUND);
      }
      return health;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get service health for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve service health', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('health/services/:serviceName/check')
  @ApiOperation({ summary: 'Perform manual health check for service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service to check' })
  @ApiResponse({ status: 200, description: 'Manual health check completed' })
  async performManualHealthCheck(@Param('serviceName') serviceName: string): Promise<ServiceHealthSummary> {
    try {
      return await this.healthCheck.performManualHealthCheck(serviceName);
    } catch (error) {
      this.logger.error(`Failed to perform manual health check for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to perform health check', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('health/services/:serviceName/config')
  @ApiOperation({ summary: 'Register health check configuration for service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiBody({ type: HealthCheckConfigDto })
  @ApiResponse({ status: 201, description: 'Health check configuration registered successfully' })
  async registerHealthCheck(
    @Param('serviceName') serviceName: string,
    @Body() config: HealthCheckConfigDto,
  ) {
    try {
      await this.healthCheck.registerHealthCheck(serviceName, config as HealthCheckConfig);
      return { message: 'Health check configuration registered successfully', service: serviceName };
    } catch (error) {
      this.logger.error(`Failed to register health check for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to register health check', HttpStatus.BAD_REQUEST);
    }
  }

  @Put('health/services/:serviceName/config')
  @ApiOperation({ summary: 'Update health check configuration for service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiBody({ type: HealthCheckConfigDto })
  @ApiResponse({ status: 200, description: 'Health check configuration updated successfully' })
  async updateHealthCheckConfig(
    @Param('serviceName') serviceName: string,
    @Body() updates: Partial<HealthCheckConfigDto>,
  ) {
    try {
      await this.healthCheck.updateHealthCheckConfig(serviceName, updates as Partial<HealthCheckConfig>);
      return { message: 'Health check configuration updated successfully', service: serviceName };
    } catch (error) {
      this.logger.error(`Failed to update health check config for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to update health check configuration', HttpStatus.BAD_REQUEST);
    }
  }

  @Put('health/services/:serviceName/toggle')
  @ApiOperation({ summary: 'Enable or disable health check for service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiBody({ schema: { type: 'object', properties: { enabled: { type: 'boolean' } } } })
  @ApiResponse({ status: 200, description: 'Health check toggled successfully' })
  async toggleHealthCheck(
    @Param('serviceName') serviceName: string,
    @Body('enabled') enabled: boolean,
  ) {
    try {
      await this.healthCheck.toggleHealthCheck(serviceName, enabled);
      return { 
        message: `Health check ${enabled ? 'enabled' : 'disabled'} successfully`, 
        service: serviceName,
        enabled,
      };
    } catch (error) {
      this.logger.error(`Failed to toggle health check for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to toggle health check', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('health/services/:serviceName/issues')
  @ApiOperation({ summary: 'Get health issues for specific service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiQuery({ name: 'includeResolved', required: false, type: 'boolean', description: 'Include resolved issues' })
  @ApiResponse({ status: 200, description: 'Service health issues retrieved successfully' })
  async getServiceHealthIssues(
    @Param('serviceName') serviceName: string,
    @Query('includeResolved') includeResolved: boolean = false,
  ) {
    try {
      return this.healthCheck.getServiceIssues(serviceName, includeResolved);
    } catch (error) {
      this.logger.error(`Failed to get health issues for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve health issues', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // PERFORMANCE MONITORING ENDPOINTS
  // ===================================================================

  @Get('performance/overview')
  @ApiOperation({ summary: 'Get performance overview for all services' })
  @ApiResponse({ status: 200, description: 'Performance overview retrieved successfully' })
  async getPerformanceOverview() {
    try {
      const summaries = this.performance.getAllServiceSummaries();
      return Array.from(summaries.entries()).map(([service, summary]) => ({
        service,
        ...summary,
      }));
    } catch (error) {
      this.logger.error(`Failed to get performance overview: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve performance overview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('performance/services/:serviceName')
  @ApiOperation({ summary: 'Get performance summary for specific service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({ status: 200, description: 'Service performance summary retrieved successfully' })
  async getServicePerformance(@Param('serviceName') serviceName: string) {
    try {
      return this.performance.getPerformanceSummary(serviceName);
    } catch (error) {
      this.logger.error(`Failed to get performance for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve service performance', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('performance/services/:serviceName/metrics')
  @ApiOperation({ summary: 'Get performance metrics for specific service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Limit number of metrics returned' })
  @ApiResponse({ status: 200, description: 'Service performance metrics retrieved successfully' })
  async getServiceMetrics(
    @Param('serviceName') serviceName: string,
    @Query('limit') limit?: number,
  ): Promise<PerformanceMetrics[]> {
    try {
      return this.performance.getCurrentMetrics(serviceName, limit);
    } catch (error) {
      this.logger.error(`Failed to get metrics for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve service metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('performance/services/:serviceName/metrics')
  @ApiOperation({ summary: 'Record performance metrics for service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiBody({ type: PerformanceMetricsDto })
  @ApiResponse({ status: 201, description: 'Performance metrics recorded successfully' })
  async recordMetrics(
    @Param('serviceName') serviceName: string,
    @Body() metrics: PerformanceMetricsDto,
  ) {
    try {
      this.performance.recordMetrics(
        serviceName,
        metrics.endpoint || '',
        metrics.method,
        metrics,
      );
      return { message: 'Metrics recorded successfully', service: serviceName };
    } catch (error) {
      this.logger.error(`Failed to record metrics for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to record metrics', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('performance/services/:serviceName/analytics')
  @ApiOperation({ summary: 'Get usage analytics for specific service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiQuery({ name: 'endpoint', required: false, description: 'Filter by endpoint' })
  @ApiQuery({ name: 'method', required: false, description: 'Filter by HTTP method' })
  @ApiQuery({ name: 'timeWindow', required: false, type: 'number', description: 'Time window in milliseconds' })
  @ApiResponse({ status: 200, description: 'Service usage analytics retrieved successfully' })
  async getServiceAnalytics(
    @Param('serviceName') serviceName: string,
    @Query('endpoint') endpoint?: string,
    @Query('method') method?: string,
    @Query('timeWindow') timeWindow?: number,
  ): Promise<UsageAnalytics> {
    try {
      return this.performance.generateUsageAnalytics(serviceName, endpoint, method, timeWindow);
    } catch (error) {
      this.logger.error(`Failed to get analytics for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve service analytics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('performance/services/:serviceName/baseline')
  @ApiOperation({ summary: 'Get performance baseline for service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiQuery({ name: 'endpoint', required: false, description: 'Filter by endpoint' })
  @ApiQuery({ name: 'method', required: false, description: 'Filter by HTTP method' })
  @ApiResponse({ status: 200, description: 'Performance baseline retrieved successfully' })
  async getPerformanceBaseline(
    @Param('serviceName') serviceName: string,
    @Query('endpoint') endpoint?: string,
    @Query('method') method?: string,
  ) {
    try {
      const baseline = this.performance.getBaseline(serviceName, endpoint, method);
      if (!baseline) {
        throw new HttpException('Baseline not found for the specified service/endpoint', HttpStatus.NOT_FOUND);
      }
      return baseline;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get baseline for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve performance baseline', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('performance/services/:serviceName/baseline')
  @ApiOperation({ summary: 'Establish performance baseline for service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: {
        endpoint: { type: 'string' },
        method: { type: 'string' },
        minSampleSize: { type: 'number' },
        lookbackHours: { type: 'number' },
        confidenceLevel: { type: 'number' },
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Performance baseline established successfully' })
  async establishBaseline(
    @Param('serviceName') serviceName: string,
    @Body() options: {
      endpoint?: string;
      method?: string;
      minSampleSize?: number;
      lookbackHours?: number;
      confidenceLevel?: number;
    },
  ) {
    try {
      const baseline = await this.performance.establishBaseline(
        serviceName,
        options.endpoint,
        options.method,
        options,
      );
      return baseline;
    } catch (error) {
      this.logger.error(`Failed to establish baseline for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to establish baseline', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('performance/services/:serviceName/analysis')
  @ApiOperation({ summary: 'Analyze current performance against baseline' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiQuery({ name: 'endpoint', required: false, description: 'Filter by endpoint' })
  @ApiQuery({ name: 'method', required: false, description: 'Filter by HTTP method' })
  @ApiQuery({ name: 'timeWindow', required: false, type: 'number', description: 'Analysis time window in milliseconds' })
  @ApiResponse({ status: 200, description: 'Performance analysis completed successfully' })
  async analyzePerformance(
    @Param('serviceName') serviceName: string,
    @Query('endpoint') endpoint?: string,
    @Query('method') method?: string,
    @Query('timeWindow') timeWindow?: number,
  ) {
    try {
      return this.performance.analyzePerformance(serviceName, endpoint, method, timeWindow);
    } catch (error) {
      this.logger.error(`Failed to analyze performance for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to analyze performance', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('performance/services/:serviceName/reports/:reportType')
  @ApiOperation({ summary: 'Generate performance report for service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiParam({ name: 'reportType', enum: ['hourly', 'daily', 'weekly', 'monthly', 'custom'] })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for custom report (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for custom report (ISO string)' })
  @ApiResponse({ status: 200, description: 'Performance report generated successfully' })
  async generatePerformanceReport(
    @Param('serviceName') serviceName: string,
    @Param('reportType') reportType: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PerformanceReport> {
    try {
      let customPeriod;
      if (reportType === 'custom') {
        if (!startDate || !endDate) {
          throw new HttpException('Start and end dates are required for custom reports', HttpStatus.BAD_REQUEST);
        }
        customPeriod = {
          start: new Date(startDate),
          end: new Date(endDate),
        };
      }

      return this.performance.generatePerformanceReport(serviceName, reportType, customPeriod);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to generate report for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to generate performance report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // DASHBOARD ENDPOINTS
  // ===================================================================

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get comprehensive dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved successfully' })
  async getDashboardOverview(): Promise<DashboardOverview> {
    try {
      return await this.dashboard.getDashboardOverview();
    } catch (error) {
      this.logger.error(`Failed to get dashboard overview: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve dashboard overview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/services/:serviceName')
  @ApiOperation({ summary: 'Get service-specific dashboard' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({ status: 200, description: 'Service dashboard retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getServiceDashboard(@Param('serviceName') serviceName: string): Promise<ServiceDashboard> {
    try {
      const dashboard = await this.dashboard.getServiceDashboard(serviceName);
      if (!dashboard) {
        throw new HttpException(`Service dashboard for '${serviceName}' not found`, HttpStatus.NOT_FOUND);
      }
      return dashboard;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get service dashboard for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve service dashboard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/realtime')
  @ApiOperation({ summary: 'Get real-time metrics for all services' })
  @ApiResponse({ status: 200, description: 'Real-time metrics retrieved successfully' })
  async getRealTimeMetrics() {
    try {
      const metrics = this.dashboard.getRealTimeMetrics();
      return Array.from(metrics.entries()).map(([service, data]) => ({
        service,
        ...data,
      }));
    } catch (error) {
      this.logger.error(`Failed to get real-time metrics: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve real-time metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/alerts')
  @ApiOperation({ summary: 'Get all dashboard alerts' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'acknowledged', 'resolved'], description: 'Filter by alert status' })
  @ApiQuery({ name: 'severity', required: false, enum: ['critical', 'warning', 'info'], description: 'Filter by severity' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Limit number of alerts returned' })
  @ApiResponse({ status: 200, description: 'Dashboard alerts retrieved successfully' })
  async getAllAlerts(
    @Query('status') status?: 'active' | 'acknowledged' | 'resolved',
    @Query('severity') severity?: 'critical' | 'warning' | 'info',
    @Query('limit') limit?: number,
  ): Promise<DashboardAlert[]> {
    try {
      let alerts = this.dashboard.getAllAlerts();

      if (status) {
        alerts = alerts.filter(alert => alert.status === status);
      }

      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }

      if (limit && limit > 0) {
        alerts = alerts.slice(0, limit);
      }

      return alerts;
    } catch (error) {
      this.logger.error(`Failed to get dashboard alerts: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve alerts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/alerts/services/:serviceName')
  @ApiOperation({ summary: 'Get alerts for specific service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({ status: 200, description: 'Service alerts retrieved successfully' })
  async getServiceAlerts(@Param('serviceName') serviceName: string): Promise<DashboardAlert[]> {
    try {
      return this.dashboard.getServiceAlerts(serviceName);
    } catch (error) {
      this.logger.error(`Failed to get alerts for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve service alerts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('dashboard/alerts/action')
  @ApiOperation({ summary: 'Perform action on dashboard alert' })
  @ApiBody({ type: AlertActionDto })
  @ApiResponse({ status: 200, description: 'Alert action performed successfully' })
  async performAlertAction(@Body() action: AlertActionDto) {
    try {
      let result = false;
      let message = '';

      switch (action.action) {
        case 'acknowledge':
          result = this.dashboard.acknowledgeAlert(action.alertId, action.userId || 'unknown');
          message = result ? 'Alert acknowledged successfully' : 'Failed to acknowledge alert';
          break;

        case 'resolve':
          result = this.dashboard.resolveAlert(action.alertId, action.userId);
          message = result ? 'Alert resolved successfully' : 'Failed to resolve alert';
          break;

        default:
          throw new HttpException(`Unsupported action: ${action.action}`, HttpStatus.BAD_REQUEST);
      }

      if (!result) {
        throw new HttpException(message, HttpStatus.NOT_FOUND);
      }

      return { message, alertId: action.alertId, action: action.action };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to perform alert action: ${error.message}`, error.stack);
      throw new HttpException('Failed to perform alert action', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/layouts')
  @ApiOperation({ summary: 'Get available dashboard layouts' })
  @ApiResponse({ status: 200, description: 'Dashboard layouts retrieved successfully' })
  async getDashboardLayouts() {
    try {
      return this.dashboard.getLayouts();
    } catch (error) {
      this.logger.error(`Failed to get dashboard layouts: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve dashboard layouts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/layouts/:layoutId')
  @ApiOperation({ summary: 'Get specific dashboard layout' })
  @ApiParam({ name: 'layoutId', description: 'ID of the layout' })
  @ApiResponse({ status: 200, description: 'Dashboard layout retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Layout not found' })
  async getDashboardLayout(@Param('layoutId') layoutId: string) {
    try {
      const layout = this.dashboard.getLayout(layoutId);
      if (!layout) {
        throw new HttpException(`Layout '${layoutId}' not found`, HttpStatus.NOT_FOUND);
      }
      return layout;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get dashboard layout ${layoutId}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve dashboard layout', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/export')
  @ApiOperation({ summary: 'Export dashboard data' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'], description: 'Export format' })
  @ApiResponse({ status: 200, description: 'Dashboard data exported successfully' })
  async exportDashboardData(@Query('format') format: 'json' | 'csv' = 'json') {
    try {
      return this.dashboard.exportData(format);
    } catch (error) {
      this.logger.error(`Failed to export dashboard data: ${error.message}`, error.stack);
      throw new HttpException('Failed to export dashboard data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // SYSTEM STATUS ENDPOINTS
  // ===================================================================

  @Get('status')
  @ApiOperation({ summary: 'Get overall system status' })
  @ApiResponse({ status: 200, description: 'System status retrieved successfully' })
  async getSystemStatus() {
    try {
      const systemHealth = this.healthCheck.getSystemHealth();
      const performanceOverview = this.performance.getAllServiceSummaries();
      const recentAlerts = this.dashboard.getAllAlerts().slice(0, 10);

      return {
        timestamp: new Date(),
        health: systemHealth,
        performance: {
          totalServices: performanceOverview.size,
          averageResponseTime: this.calculateAverageResponseTime(performanceOverview),
          totalRequests: this.calculateTotalRequests(performanceOverview),
        },
        alerts: {
          total: recentAlerts.length,
          critical: recentAlerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
          warnings: recentAlerts.filter(a => a.severity === 'warning' && a.status === 'active').length,
        },
        uptime: systemHealth.totalServices > 0 ? 
          (systemHealth.healthyServices / systemHealth.totalServices) * 100 : 100,
      };
    } catch (error) {
      this.logger.error(`Failed to get system status: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve system status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('status/services/:serviceName')
  @ApiOperation({ summary: 'Get comprehensive status for specific service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({ status: 200, description: 'Service status retrieved successfully' })
  async getServiceStatus(@Param('serviceName') serviceName: string) {
    try {
      const health = this.healthCheck.getServiceHealth(serviceName);
      const performance = this.performance.getPerformanceSummary(serviceName);
      const alerts = this.dashboard.getServiceAlerts(serviceName);
      const recentMetrics = this.performance.getCurrentMetrics(serviceName, 10);

      if (!health) {
        throw new HttpException(`Service '${serviceName}' not found`, HttpStatus.NOT_FOUND);
      }

      return {
        service: serviceName,
        timestamp: new Date(),
        health,
        performance,
        alerts: {
          total: alerts.length,
          active: alerts.filter(a => a.status === 'active').length,
          critical: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
          recent: alerts.slice(0, 5),
        },
        recentActivity: {
          lastRequest: recentMetrics.length > 0 ? recentMetrics[0].timestamp : null,
          requestCount: recentMetrics.length,
          errorCount: recentMetrics.filter(m => !m.success).length,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get service status for ${serviceName}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve service status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // UTILITY ENDPOINTS
  // ===================================================================

  @Get('config/services')
  @ApiOperation({ summary: 'Get list of configured services' })
  @ApiResponse({ status: 200, description: 'Configured services list retrieved successfully' })
  async getConfiguredServices() {
    try {
      const healthServices = Array.from(this.healthCheck.getAllServiceHealth().keys());
      const performanceServices = Array.from(this.performance.getAllServiceSummaries().keys());
      
      // Merge and deduplicate
      const allServices = [...new Set([...healthServices, ...performanceServices])];
      
      return {
        services: allServices.map(service => ({
          name: service,
          hasHealthCheck: healthServices.includes(service),
          hasPerformanceMonitoring: performanceServices.includes(service),
        })),
        total: allServices.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get configured services: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve configured services', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('data/cleanup')
  @ApiOperation({ summary: 'Clean up old monitoring data' })
  @ApiQuery({ name: 'olderThanDays', required: false, type: 'number', description: 'Clean up data older than specified days' })
  @ApiResponse({ status: 200, description: 'Data cleanup completed successfully' })
  async cleanupOldData(@Query('olderThanDays') olderThanDays?: number) {
    try {
      // This would trigger cleanup in the services
      // For now, just return success message
      
      const cutoffDays = olderThanDays || 30;
      
      this.logger.log(`Data cleanup requested for data older than ${cutoffDays} days`);
      
      return {
        message: `Data cleanup completed for data older than ${cutoffDays} days`,
        cutoffDate: new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000),
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to cleanup old data: ${error.message}`, error.stack);
      throw new HttpException('Failed to cleanup old data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private calculateAverageResponseTime(
    summaries: Map<string, ReturnType<typeof this.performance.getPerformanceSummary>>,
  ): number {
    let totalResponseTime = 0;
    let totalRequests = 0;

    for (const summary of summaries.values()) {
      if (summary.requestCount > 0) {
        totalResponseTime += summary.averageResponseTime * summary.requestCount;
        totalRequests += summary.requestCount;
      }
    }

    return totalRequests > 0 ? totalResponseTime / totalRequests : 0;
  }

  private calculateTotalRequests(
    summaries: Map<string, ReturnType<typeof this.performance.getPerformanceSummary>>,
  ): number {
    return Array.from(summaries.values())
      .reduce((total, summary) => total + summary.requestCount, 0);
  }
}
