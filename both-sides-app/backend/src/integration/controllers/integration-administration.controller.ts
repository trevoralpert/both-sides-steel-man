/**
 * Integration Administration Controller
 * 
 * REST API endpoints for integration management dashboard, providing comprehensive
 * management, monitoring, and administrative operations for all integration providers.
 * Supports real-time status updates, configuration management, and operational control.
 */

import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Patch,
  Param, 
  Body, 
  Query,
  HttpStatus,
  HttpException,
  Logger,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { IntegrationManagementService } from '../services/management/integration-management.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/roles.guard';
import { Roles } from '../../../auth/roles.decorator';

// ===================================================================
// REQUEST/RESPONSE DTOs
// ===================================================================

export class ProviderConfigurationUpdateDto {
  enabled?: boolean;
  autoStart?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
  healthCheckInterval?: number;
  timeoutMs?: number;
}

export class ProviderActionDto {
  action: 'start' | 'stop' | 'restart' | 'enable' | 'disable' | 'health_check';
  parameters?: Record<string, any>;
}

export class AlertActionDto {
  action: 'acknowledge' | 'resolve' | 'suppress';
}

export class DashboardFiltersDto {
  providers?: string[];
  status?: string[];
  health?: string[];
  type?: string[];
  timeRange?: '1h' | '24h' | '7d' | '30d';
}

export class OperationFiltersDto {
  providerId?: string;
  type?: string[];
  status?: string[];
  userId?: string;
  limit?: number;
  offset?: number;
}

export class AlertFiltersDto {
  providerId?: string;
  type?: string[];
  severity?: string[];
  status?: string[];
  limit?: number;
  offset?: number;
}

// ===================================================================
// INTEGRATION ADMINISTRATION CONTROLLER
// ===================================================================

@ApiTags('Integration Administration')
@Controller('api/integration/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationAdministrationController {
  private readonly logger = new Logger(IntegrationAdministrationController.name);

  constructor(
    private readonly managementService: IntegrationManagementService,
  ) {}

  // ===================================================================
  // DASHBOARD ENDPOINTS
  // ===================================================================

  @Get('dashboard')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get integration management dashboard data',
    description: 'Retrieve comprehensive dashboard data including statistics, provider status, recent operations, and alerts'
  })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiQuery({ name: 'refresh', required: false, description: 'Force refresh data from providers' })
  async getDashboard(
    @Query('refresh') refresh?: boolean
  ) {
    try {
      this.logger.log('Retrieving dashboard data', { refresh });
      
      const dashboardData = await this.managementService.getDashboardData();
      
      return {
        success: true,
        data: dashboardData,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get dashboard data: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve dashboard data',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('statistics')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get integration statistics',
    description: 'Retrieve current integration statistics and performance metrics'
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiQuery({ name: 'historical', required: false, description: 'Include historical data (hours)' })
  async getStatistics(
    @Query('historical') historicalHours?: number
  ) {
    try {
      const statistics = this.managementService.getStatistics();
      
      let historical;
      if (historicalHours) {
        historical = this.managementService.getHistoricalMetrics(historicalHours);
      }
      
      return {
        success: true,
        data: {
          current: statistics,
          historical,
        },
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve statistics',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get system health overview',
    description: 'Retrieve overall system health and component status'
  })
  @ApiResponse({ status: 200, description: 'Health data retrieved successfully' })
  async getSystemHealth() {
    try {
      const serviceStatus = this.managementService.getServiceStatus();
      const statistics = this.managementService.getStatistics();
      
      return {
        success: true,
        data: {
          overallHealth: statistics.overallHealth,
          serviceStatus,
          providers: {
            total: statistics.totalProviders,
            active: statistics.activeProviders,
            healthy: statistics.healthyProviders,
          },
          operations: {
            active: serviceStatus.activeOperations,
          },
          alerts: {
            active: serviceStatus.activeAlerts,
            critical: statistics.alerts.criticalAlerts,
          },
        },
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get health data: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve health data',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // PROVIDER MANAGEMENT ENDPOINTS
  // ===================================================================

  @Get('providers')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get all integration providers',
    description: 'Retrieve list of all registered integration providers with their status and configuration'
  })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by provider status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by provider type' })
  @ApiQuery({ name: 'health', required: false, description: 'Filter by provider health' })
  async getProviders(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('health') health?: string
  ) {
    try {
      let providers = this.managementService.getProviders();
      
      // Apply filters
      if (status) {
        providers = providers.filter(p => p.status === status);
      }
      if (type) {
        providers = providers.filter(p => p.type === type);
      }
      if (health) {
        providers = providers.filter(p => p.health === health);
      }
      
      return {
        success: true,
        data: providers,
        count: providers.length,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get providers: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve providers',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('providers/:providerId')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get provider details',
    description: 'Retrieve detailed information about a specific integration provider'
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiResponse({ status: 200, description: 'Provider details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProvider(
    @Param('providerId') providerId: string
  ) {
    try {
      const provider = this.managementService.getProvider(providerId);
      
      if (!provider) {
        throw new HttpException({
          success: false,
          error: 'Provider not found',
          providerId,
        }, HttpStatus.NOT_FOUND);
      }

      // Get recent operations for this provider
      const recentOperations = this.managementService.getProviderOperations(providerId, 10);
      
      // Get alerts for this provider
      const alerts = this.managementService.getProviderAlerts(providerId);
      
      return {
        success: true,
        data: {
          provider,
          recentOperations,
          alerts: alerts.slice(0, 5), // Latest 5 alerts
        },
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to get provider ${providerId}: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve provider',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('providers/:providerId/configuration')
  @Roles('admin')
  @ApiOperation({ 
    summary: 'Update provider configuration',
    description: 'Update configuration settings for an integration provider'
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiBody({ type: ProviderConfigurationUpdateDto })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateProviderConfiguration(
    @Param('providerId') providerId: string,
    @Body() configUpdate: ProviderConfigurationUpdateDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;
      
      this.logger.log(`Updating provider ${providerId} configuration`, { userId, configUpdate });
      
      const updatedProvider = await this.managementService.updateProviderConfiguration(
        providerId,
        configUpdate,
        userId
      );
      
      return {
        success: true,
        data: updatedProvider,
        message: 'Provider configuration updated successfully',
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to update provider configuration: ${error.message}`, error.stack);
      
      if (error.message.includes('not found')) {
        throw new HttpException({
          success: false,
          error: 'Provider not found',
          providerId,
        }, HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException({
        success: false,
        error: 'Failed to update provider configuration',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('providers/:providerId/actions')
  @Roles('admin')
  @ApiOperation({ 
    summary: 'Execute provider action',
    description: 'Execute an administrative action on an integration provider (start, stop, restart, etc.)'
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiBody({ type: ProviderActionDto })
  @ApiResponse({ status: 200, description: 'Action executed successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 400, description: 'Invalid action' })
  async executeProviderAction(
    @Param('providerId') providerId: string,
    @Body() actionDto: ProviderActionDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;
      
      this.logger.log(`Executing action ${actionDto.action} on provider ${providerId}`, { userId });
      
      let result;
      
      switch (actionDto.action) {
        case 'start':
          result = await this.managementService.startProvider(providerId, userId);
          break;
          
        case 'stop':
          result = await this.managementService.stopProvider(providerId, userId);
          break;
          
        case 'restart':
          result = await this.managementService.restartProvider(providerId, userId);
          break;
          
        case 'health_check':
          result = await this.managementService.checkProviderHealth(providerId);
          break;
          
        default:
          throw new HttpException({
            success: false,
            error: 'Invalid action',
            action: actionDto.action,
          }, HttpStatus.BAD_REQUEST);
      }
      
      return {
        success: true,
        data: result,
        message: `Action ${actionDto.action} executed successfully`,
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to execute provider action: ${error.message}`, error.stack);
      
      if (error.message.includes('not found')) {
        throw new HttpException({
          success: false,
          error: 'Provider not found',
          providerId,
        }, HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException({
        success: false,
        error: 'Failed to execute provider action',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // OPERATION MANAGEMENT ENDPOINTS
  // ===================================================================

  @Get('operations')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get operations history',
    description: 'Retrieve history of integration operations with filtering and pagination'
  })
  @ApiResponse({ status: 200, description: 'Operations retrieved successfully' })
  @ApiQuery({ name: 'providerId', required: false, description: 'Filter by provider ID' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by operation type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by operation status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  async getOperations(
    @Query('providerId') providerId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const offsetNum = offset ? parseInt(offset, 10) : 0;
      
      let operations = providerId 
        ? this.managementService.getProviderOperations(providerId, 1000) // Get all, then filter
        : this.managementService.getRecentOperations(1000);
      
      // Apply filters
      if (type) {
        operations = operations.filter(op => op.type === type);
      }
      if (status) {
        operations = operations.filter(op => op.status === status);
      }
      
      // Apply pagination
      const total = operations.length;
      const paginatedOperations = operations.slice(offsetNum, offsetNum + limitNum);
      
      return {
        success: true,
        data: paginatedOperations,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < total,
        },
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get operations: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve operations',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('operations/:operationId')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get operation details',
    description: 'Retrieve detailed information about a specific operation'
  })
  @ApiParam({ name: 'operationId', description: 'Operation identifier' })
  @ApiResponse({ status: 200, description: 'Operation details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Operation not found' })
  async getOperation(
    @Param('operationId') operationId: string
  ) {
    try {
      const operation = this.managementService.getOperation(operationId);
      
      if (!operation) {
        throw new HttpException({
          success: false,
          error: 'Operation not found',
          operationId,
        }, HttpStatus.NOT_FOUND);
      }
      
      return {
        success: true,
        data: operation,
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to get operation ${operationId}: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve operation',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // ALERT MANAGEMENT ENDPOINTS
  // ===================================================================

  @Get('alerts')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get integration alerts',
    description: 'Retrieve integration alerts with filtering and pagination'
  })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  @ApiQuery({ name: 'providerId', required: false, description: 'Filter by provider ID' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by alert severity' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by alert status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  async getAlerts(
    @Query('providerId') providerId?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      
      let alerts = providerId 
        ? this.managementService.getProviderAlerts(providerId)
        : this.managementService.getActiveAlerts();
      
      // Apply filters
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }
      if (status) {
        alerts = alerts.filter(alert => alert.status === status);
      }
      
      // Apply limit
      alerts = alerts.slice(0, limitNum);
      
      return {
        success: true,
        data: alerts,
        count: alerts.length,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get alerts: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve alerts',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('alerts/:alertId/actions')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Execute alert action',
    description: 'Execute an action on an alert (acknowledge, resolve, suppress)'
  })
  @ApiParam({ name: 'alertId', description: 'Alert identifier' })
  @ApiBody({ type: AlertActionDto })
  @ApiResponse({ status: 200, description: 'Alert action executed successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 400, description: 'Invalid action' })
  async executeAlertAction(
    @Param('alertId') alertId: string,
    @Body() actionDto: AlertActionDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;
      
      this.logger.log(`Executing alert action ${actionDto.action} on alert ${alertId}`, { userId });
      
      let result;
      
      switch (actionDto.action) {
        case 'acknowledge':
          result = await this.managementService.acknowledgeAlert(alertId, userId);
          break;
          
        case 'resolve':
          result = await this.managementService.resolveAlert(alertId, userId);
          break;
          
        default:
          throw new HttpException({
            success: false,
            error: 'Invalid alert action',
            action: actionDto.action,
          }, HttpStatus.BAD_REQUEST);
      }
      
      return {
        success: true,
        data: result,
        message: `Alert ${actionDto.action} executed successfully`,
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to execute alert action: ${error.message}`, error.stack);
      
      if (error.message.includes('not found')) {
        throw new HttpException({
          success: false,
          error: 'Alert not found',
          alertId,
        }, HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException({
        success: false,
        error: 'Failed to execute alert action',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // MONITORING & ANALYTICS ENDPOINTS
  // ===================================================================

  @Get('metrics/performance')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get performance metrics',
    description: 'Retrieve detailed performance metrics for integration providers'
  })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for metrics (1h, 24h, 7d, 30d)' })
  @ApiQuery({ name: 'providers', required: false, description: 'Comma-separated list of provider IDs' })
  async getPerformanceMetrics(
    @Query('timeRange') timeRange: string = '24h',
    @Query('providers') providers?: string
  ) {
    try {
      const hours = this.parseTimeRange(timeRange);
      const historicalMetrics = this.managementService.getHistoricalMetrics(hours);
      
      let providerFilter: string[] = [];
      if (providers) {
        providerFilter = providers.split(',');
      }
      
      // Process metrics for requested providers
      const processedMetrics = this.processPerformanceMetrics(historicalMetrics, providerFilter);
      
      return {
        success: true,
        data: processedMetrics,
        timeRange,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get performance metrics: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve performance metrics',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('metrics/trends')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get trend analysis',
    description: 'Retrieve trend analysis data for integration performance and health'
  })
  @ApiResponse({ status: 200, description: 'Trend analysis retrieved successfully' })
  @ApiQuery({ name: 'metrics', required: false, description: 'Comma-separated list of metrics to analyze' })
  async getTrends(
    @Query('metrics') metrics: string = 'errorRate,responseTime,throughput'
  ) {
    try {
      const dashboardData = await this.managementService.getDashboardData();
      const requestedMetrics = metrics.split(',');
      
      const trends = Object.keys(dashboardData.trends)
        .filter(key => requestedMetrics.includes(key))
        .reduce((obj, key) => {
          obj[key] = dashboardData.trends[key];
          return obj;
        }, {} as any);
      
      return {
        success: true,
        data: trends,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get trends: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve trends',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // SYSTEM ENDPOINTS
  // ===================================================================

  @Get('status')
  @Roles('admin', 'teacher')
  @ApiOperation({ 
    summary: 'Get service status',
    description: 'Get the current status of the integration management service'
  })
  @ApiResponse({ status: 200, description: 'Service status retrieved successfully' })
  async getServiceStatus() {
    try {
      const serviceStatus = this.managementService.getServiceStatus();
      
      return {
        success: true,
        data: serviceStatus,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get service status: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve service status',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private parseTimeRange(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 1;
      case '24h': return 24;
      case '7d': return 24 * 7;
      case '30d': return 24 * 30;
      default: return 24;
    }
  }

  private processPerformanceMetrics(
    historicalMetrics: Array<{ timestamp: Date; metrics: any }>,
    providerFilter: string[]
  ): any {
    // Process and aggregate performance metrics
    const processed = {
      overallPerformance: {
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0,
        uptime: 0,
      },
      providerPerformance: [] as any[],
      timeSeriesData: historicalMetrics.map(entry => ({
        timestamp: entry.timestamp,
        responseTime: entry.metrics.performance.averageResponseTime,
        errorRate: entry.metrics.performance.errorRate,
        throughput: entry.metrics.performance.throughput,
      })),
    };

    if (historicalMetrics.length > 0) {
      const latest = historicalMetrics[historicalMetrics.length - 1].metrics;
      processed.overallPerformance = {
        averageResponseTime: latest.performance.averageResponseTime,
        errorRate: latest.performance.errorRate,
        throughput: latest.performance.throughput,
        uptime: 99.5, // Would calculate from uptime data
      };

      // Filter and process provider-specific metrics
      if (providerFilter.length > 0) {
        processed.providerPerformance = latest.providersStats.filter((p: any) =>
          providerFilter.includes(p.providerId)
        );
      } else {
        processed.providerPerformance = latest.providersStats;
      }
    }

    return processed;
  }
}
