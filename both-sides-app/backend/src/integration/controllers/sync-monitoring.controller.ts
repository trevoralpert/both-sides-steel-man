/**
 * Sync Monitoring Controller
 * 
 * REST API endpoints for sync monitoring, dashboard data, alerts, and reporting.
 * Provides comprehensive monitoring capabilities for external systems and UIs.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
  Res,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SyncMonitoringService } from '../services/monitoring/sync-monitoring.service';
import { SyncDashboardService } from '../services/monitoring/sync-dashboard.service';
import { SyncAlertingService } from '../services/monitoring/sync-alerting.service';
import { SyncReportingService } from '../services/monitoring/sync-reporting.service';
import {
  SyncSession,
  SyncDashboardData,
  IntegrationHealth,
  SyncAlert,
  SyncReport,
  MonitoringQuery,
  TimeSeriesData,
  PerformanceMetrics,
  MonitoringConfig,
} from '../services/monitoring/sync-monitoring.interfaces';
import { EntityType, SyncContext } from '../services/synchronizers/base-synchronizer.service';

// ===================================================================
// DTO INTERFACES FOR API
// ===================================================================

interface CreateSyncSessionDto {
  integrationId: string;
  providerId: string;
  syncType: 'full' | 'incremental' | 'manual' | 'scheduled' | 'webhook' | 'retry';
  entityTypes: EntityType[];
  config?: {
    batchSize?: number;
    timeout?: number;
    retryPolicy?: {
      maxRetries: number;
      backoffMultiplier: number;
    };
  };
}

interface UpdateSyncSessionDto {
  status?: 'idle' | 'starting' | 'running' | 'paused' | 'completing' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'degraded';
  progress?: {
    currentStage?: string;
    stagesCompleted?: number;
    totalStages?: number;
    percentComplete?: number;
    entitiesProcessed?: number;
    totalEntities?: number;
    currentEntityType?: EntityType;
  };
  performance?: {
    averageProcessingRate?: number;
    peakProcessingRate?: number;
    apiCallsCount?: number;
    apiResponseTime?: number;
    dataTransferred?: number;
    cacheHitRate?: number;
  };
  results?: {
    entitiesCreated?: number;
    entitiesUpdated?: number;
    entitiesDeleted?: number;
    entitiesSkipped?: number;
    conflictsDetected?: number;
    conflictsResolved?: number;
    errorsEncountered?: number;
    warningsGenerated?: number;
  };
}

interface AddSyncErrorDto {
  severity: 'warning' | 'error' | 'critical';
  category: 'network' | 'authentication' | 'data' | 'business_logic' | 'system' | 'external_api';
  entityType?: EntityType;
  entityId?: string;
  stage: string;
  errorCode: string;
  message: string;
  details?: {
    originalError?: any;
    stackTrace?: string;
    retryCount?: number;
    context?: Record<string, any>;
  };
}

interface GenerateReportDto {
  reportType: 'performance' | 'data_quality' | 'usage' | 'compliance' | 'custom';
  timeRange: {
    startDate: string;
    endDate: string;
  };
  entityTypes?: EntityType[];
  includeDetails?: boolean;
  format?: 'json' | 'csv' | 'pdf' | 'html';
  recipients?: string[];
}

interface AcknowledgeAlertDto {
  acknowledgedBy: string;
  note?: string;
}

interface ResolveAlertDto {
  resolvedBy: string;
  resolutionNote?: string;
}

// ===================================================================
// SYNC MONITORING CONTROLLER
// ===================================================================

@ApiTags('Sync Monitoring')
@Controller('integrations/:integrationId/monitoring')
@ApiBearerAuth()
export class SyncMonitoringController {
  private readonly logger = new Logger(SyncMonitoringController.name);

  constructor(
    private readonly syncMonitoring: SyncMonitoringService,
    private readonly dashboardService: SyncDashboardService,
    private readonly alertingService: SyncAlertingService,
    private readonly reportingService: SyncReportingService,
  ) {}

  // ===================================================================
  // DASHBOARD ENDPOINTS
  // ===================================================================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive dashboard data for an integration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        dashboard: { type: 'object' },
        message: { type: 'string' },
      },
    },
  })
  async getDashboard(
    @Param('integrationId') integrationId: string,
  ) {
    try {
      this.logger.log(`Getting dashboard data for integration: ${integrationId}`);

      const dashboard = await this.dashboardService.getDashboardData(integrationId);

      return {
        success: true,
        dashboard,
        message: 'Dashboard data retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get dashboard data: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve dashboard data',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health/:providerId')
  @ApiOperation({ summary: 'Get integration health status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Integration health retrieved successfully' 
  })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  async getIntegrationHealth(
    @Param('integrationId') integrationId: string,
    @Param('providerId') providerId: string,
  ) {
    try {
      this.logger.log(`Getting health status for integration: ${integrationId}:${providerId}`);

      const health = await this.dashboardService.getIntegrationHealth(integrationId, providerId);

      return {
        success: true,
        health,
        message: 'Integration health retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get integration health: ${error.message}`, error.stack, {
        integrationId,
        providerId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve integration health',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics/:metric')
  @ApiOperation({ summary: 'Get time series data for specific metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Time series data retrieved successfully' 
  })
  @ApiParam({ name: 'metric', description: 'Metric name' })
  @ApiQuery({ name: 'startDate', description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', description: 'End date (ISO string)' })
  @ApiQuery({ name: 'interval', required: false, description: 'Time interval (minute, hour, day)' })
  async getTimeSeriesMetrics(
    @Param('integrationId') integrationId: string,
    @Param('metric') metric: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('interval') interval: 'minute' | 'hour' | 'day' = 'hour',
  ) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new HttpException(
          {
            success: false,
            error: 'Invalid date format',
            message: 'Start date and end date must be valid ISO strings',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`Getting time series data: ${metric}`, {
        integrationId,
        interval,
        timeRange: { startDate: start, endDate: end },
      });

      const data = await this.dashboardService.getTimeSeriesData(
        integrationId,
        metric,
        start,
        end,
        interval,
      );

      return {
        success: true,
        data,
        metric,
        interval,
        timeRange: { startDate: start, endDate: end },
        message: 'Time series data retrieved successfully',
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to get time series data: ${error.message}`, error.stack, {
        integrationId,
        metric,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve time series data',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // SYNC SESSION ENDPOINTS
  // ===================================================================

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new sync session for monitoring' })
  @ApiResponse({ 
    status: 201, 
    description: 'Sync session created successfully' 
  })
  async createSyncSession(
    @Param('integrationId') integrationId: string,
    @Body() dto: Omit<CreateSyncSessionDto, 'integrationId'>,
  ) {
    try {
      this.logger.log(`Creating sync session for integration: ${integrationId}`, {
        providerId: dto.providerId,
        syncType: dto.syncType,
        entityTypes: dto.entityTypes,
      });

      const syncContext: SyncContext = {
        syncId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        integrationId,
        providerId: dto.providerId,
        externalSystemId: dto.providerId,
        startTime: new Date(),
      };

      const session = await this.syncMonitoring.createSyncSession(
        integrationId,
        dto.providerId,
        dto.syncType,
        dto.entityTypes,
        syncContext,
        dto.config,
      );

      return {
        success: true,
        session,
        message: 'Sync session created successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to create sync session: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to create sync session',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get sync sessions with filtering and analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sync sessions retrieved successfully' 
  })
  @ApiQuery({ name: 'entityTypes', required: false, description: 'Comma-separated entity types' })
  @ApiQuery({ name: 'syncTypes', required: false, description: 'Comma-separated sync types' })
  @ApiQuery({ name: 'statuses', required: false, description: 'Comma-separated status values' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of records to skip' })
  async querySyncSessions(
    @Param('integrationId') integrationId: string,
    @Query() queryParams: any,
  ) {
    try {
      const query: MonitoringQuery = {
        integrationId,
        entityTypes: queryParams.entityTypes?.split(',') as EntityType[],
        syncTypes: queryParams.syncTypes?.split(','),
        statuses: queryParams.statuses?.split(','),
        timeRange: (queryParams.startDate || queryParams.endDate) ? {
          startDate: queryParams.startDate ? new Date(queryParams.startDate) : new Date(0),
          endDate: queryParams.endDate ? new Date(queryParams.endDate) : new Date(),
        } : {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
        limit: queryParams.limit ? parseInt(queryParams.limit) : 50,
        offset: queryParams.offset ? parseInt(queryParams.offset) : 0,
      };

      this.logger.log(`Querying sync sessions`, {
        integrationId,
        timeRange: query.timeRange,
        limit: query.limit,
      });

      const result = await this.syncMonitoring.querySyncSessions(query);

      return {
        success: true,
        sessions: result.sessions,
        totalCount: result.totalCount,
        analytics: result.analytics,
        message: 'Sync sessions retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to query sync sessions: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve sync sessions',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sessions/current')
  @ApiOperation({ summary: 'Get currently active sync sessions' })
  @ApiResponse({ 
    status: 200, 
    description: 'Current sync sessions retrieved successfully' 
  })
  async getCurrentSyncSessions(
    @Param('integrationId') integrationId: string,
  ) {
    try {
      const sessions = this.syncMonitoring.getCurrentSyncSessions(integrationId);

      return {
        success: true,
        sessions,
        count: sessions.length,
        message: 'Current sync sessions retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get current sync sessions: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve current sync sessions',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get specific sync session details' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sync session retrieved successfully' 
  })
  @ApiParam({ name: 'sessionId', description: 'Sync session ID' })
  async getSyncSession(
    @Param('integrationId') integrationId: string,
    @Param('sessionId') sessionId: string,
  ) {
    try {
      const session = this.syncMonitoring.getSyncSession(sessionId);

      if (!session) {
        throw new HttpException(
          {
            success: false,
            error: 'Session not found',
            message: `Sync session ${sessionId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (session.integrationId !== integrationId) {
        throw new HttpException(
          {
            success: false,
            error: 'Integration mismatch',
            message: 'Session does not belong to this integration',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      return {
        success: true,
        session,
        message: 'Sync session retrieved successfully',
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to get sync session: ${error.message}`, error.stack, {
        integrationId,
        sessionId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve sync session',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('sessions/:sessionId')
  @ApiOperation({ summary: 'Update sync session status and progress' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sync session updated successfully' 
  })
  @ApiParam({ name: 'sessionId', description: 'Sync session ID' })
  async updateSyncSession(
    @Param('integrationId') integrationId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSyncSessionDto,
  ) {
    try {
      this.logger.log(`Updating sync session: ${sessionId}`, {
        integrationId,
        status: dto.status,
        progress: dto.progress?.percentComplete,
      });

      const session = await this.syncMonitoring.updateSyncSession(sessionId, dto);

      return {
        success: true,
        session,
        message: 'Sync session updated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to update sync session: ${error.message}`, error.stack, {
        integrationId,
        sessionId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to update sync session',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sessions/:sessionId/errors')
  @ApiOperation({ summary: 'Add error to sync session' })
  @ApiResponse({ 
    status: 201, 
    description: 'Error added successfully' 
  })
  @ApiParam({ name: 'sessionId', description: 'Sync session ID' })
  async addSyncError(
    @Param('integrationId') integrationId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: AddSyncErrorDto,
  ) {
    try {
      this.logger.log(`Adding error to sync session: ${sessionId}`, {
        integrationId,
        errorCode: dto.errorCode,
        severity: dto.severity,
        category: dto.category,
      });

      await this.syncMonitoring.addSyncError(sessionId, dto);

      return {
        success: true,
        message: 'Error added to sync session successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to add sync error: ${error.message}`, error.stack, {
        integrationId,
        sessionId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to add error to sync session',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // ALERT ENDPOINTS
  // ===================================================================

  @Get('alerts')
  @ApiOperation({ summary: 'Get active alerts for integration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Alerts retrieved successfully' 
  })
  async getActiveAlerts(
    @Param('integrationId') integrationId: string,
  ) {
    try {
      const alerts = this.alertingService.getActiveAlerts(integrationId);

      return {
        success: true,
        alerts,
        count: alerts.length,
        message: 'Active alerts retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get active alerts: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve active alerts',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('alerts/history')
  @ApiOperation({ summary: 'Get alert history for integration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Alert history retrieved successfully' 
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records' })
  async getAlertHistory(
    @Param('integrationId') integrationId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit) : 50;
      const history = this.alertingService.getAlertHistory(integrationId, limitNum);

      return {
        success: true,
        history,
        count: history.length,
        message: 'Alert history retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get alert history: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve alert history',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiResponse({ 
    status: 200, 
    description: 'Alert acknowledged successfully' 
  })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  async acknowledgeAlert(
    @Param('integrationId') integrationId: string,
    @Param('alertId') alertId: string,
    @Body() dto: AcknowledgeAlertDto,
  ) {
    try {
      this.logger.log(`Acknowledging alert: ${alertId}`, {
        integrationId,
        acknowledgedBy: dto.acknowledgedBy,
      });

      await this.alertingService.acknowledgeAlert(alertId, dto.acknowledgedBy, dto.note);

      return {
        success: true,
        message: 'Alert acknowledged successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to acknowledge alert: ${error.message}`, error.stack, {
        integrationId,
        alertId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to acknowledge alert',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiResponse({ 
    status: 200, 
    description: 'Alert resolved successfully' 
  })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  async resolveAlert(
    @Param('integrationId') integrationId: string,
    @Param('alertId') alertId: string,
    @Body() dto: ResolveAlertDto,
  ) {
    try {
      this.logger.log(`Resolving alert: ${alertId}`, {
        integrationId,
        resolvedBy: dto.resolvedBy,
      });

      await this.alertingService.resolveAlert(alertId, dto.resolvedBy, dto.resolutionNote);

      return {
        success: true,
        message: 'Alert resolved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to resolve alert: ${error.message}`, error.stack, {
        integrationId,
        alertId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to resolve alert',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // REPORTING ENDPOINTS
  // ===================================================================

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a comprehensive sync report' })
  @ApiResponse({ 
    status: 201, 
    description: 'Report generated successfully' 
  })
  async generateReport(
    @Param('integrationId') integrationId: string,
    @Body() dto: GenerateReportDto,
  ) {
    try {
      this.logger.log(`Generating report: ${dto.reportType}`, {
        integrationId,
        timeRange: dto.timeRange,
        format: dto.format,
      });

      const report = await this.reportingService.generateReport(
        integrationId,
        dto.reportType,
        {
          timeRange: {
            startDate: new Date(dto.timeRange.startDate),
            endDate: new Date(dto.timeRange.endDate),
          },
          entityTypes: dto.entityTypes,
          includeDetails: dto.includeDetails,
          format: dto.format,
          recipients: dto.recipients,
        },
      );

      return {
        success: true,
        report,
        message: 'Report generated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to generate report: ${error.message}`, error.stack, {
        integrationId,
        reportType: dto.reportType,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to generate report',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get generated report by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report retrieved successfully' 
  })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  async getReport(
    @Param('integrationId') integrationId: string,
    @Param('reportId') reportId: string,
  ) {
    try {
      // This would retrieve the stored report
      const report = { id: reportId, integrationId, status: 'placeholder' };

      return {
        success: true,
        report,
        message: 'Report retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get report: ${error.message}`, error.stack, {
        integrationId,
        reportId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve report',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('reports/:reportId/export/:format')
  @ApiOperation({ summary: 'Export report in specified format' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report exported successfully' 
  })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiParam({ name: 'format', description: 'Export format (json, csv, html, pdf)' })
  async exportReport(
    @Param('integrationId') integrationId: string,
    @Param('reportId') reportId: string,
    @Param('format') format: 'json' | 'csv' | 'html' | 'pdf',
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Exporting report: ${reportId} as ${format}`, {
        integrationId,
      });

      const exportData = await this.reportingService.exportReport(reportId, format);

      res.setHeader('Content-Type', exportData.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
      
      if (typeof exportData.data === 'string') {
        res.send(exportData.data);
      } else {
        res.send(exportData.data);
      }

    } catch (error) {
      this.logger.error(`Failed to export report: ${error.message}`, error.stack, {
        integrationId,
        reportId,
        format,
      });

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
        message: 'Failed to export report',
      });
    }
  }

  @Post('reports/performance')
  @ApiOperation({ summary: 'Generate performance report' })
  @ApiResponse({ 
    status: 201, 
    description: 'Performance report generated successfully' 
  })
  async generatePerformanceReport(
    @Param('integrationId') integrationId: string,
    @Body() body: { startDate: string; endDate: string },
  ) {
    try {
      const report = await this.reportingService.generatePerformanceReport(
        integrationId,
        new Date(body.startDate),
        new Date(body.endDate),
      );

      return {
        success: true,
        report,
        message: 'Performance report generated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to generate performance report: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to generate performance report',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reports/data-quality')
  @ApiOperation({ summary: 'Generate data quality report' })
  @ApiResponse({ 
    status: 201, 
    description: 'Data quality report generated successfully' 
  })
  async generateDataQualityReport(
    @Param('integrationId') integrationId: string,
    @Body() body: { startDate: string; endDate: string },
  ) {
    try {
      const report = await this.reportingService.generateDataQualityReport(
        integrationId,
        new Date(body.startDate),
        new Date(body.endDate),
      );

      return {
        success: true,
        report,
        message: 'Data quality report generated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to generate data quality report: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to generate data quality report',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // SYSTEM STATUS ENDPOINTS
  // ===================================================================

  @Get('status')
  @ApiOperation({ summary: 'Get monitoring system status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Monitoring system status retrieved successfully' 
  })
  async getMonitoringStatus(
    @Param('integrationId') integrationId: string,
  ) {
    try {
      const status = {
        integrationId,
        monitoringEnabled: true,
        services: {
          syncMonitoring: 'operational',
          dashboard: 'operational',
          alerting: 'operational',
          reporting: 'operational',
        },
        activeSessions: this.syncMonitoring.getCurrentSyncSessions(integrationId).length,
        activeAlerts: this.alertingService.getActiveAlerts(integrationId).length,
        cacheStats: this.dashboardService.getCacheStats(),
        lastHealthCheck: new Date(),
      };

      return {
        success: true,
        status,
        message: 'Monitoring system status retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get monitoring status: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve monitoring system status',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('cache')
  @ApiOperation({ summary: 'Clear monitoring caches' })
  @ApiResponse({ 
    status: 200, 
    description: 'Caches cleared successfully' 
  })
  async clearCaches(
    @Param('integrationId') integrationId: string,
  ) {
    try {
      this.logger.log(`Clearing caches for integration: ${integrationId}`);

      this.dashboardService.clearCache(integrationId);

      return {
        success: true,
        message: 'Monitoring caches cleared successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to clear caches: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to clear caches',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // REAL-TIME UPDATES ENDPOINT
  // ===================================================================

  @Get('realtime/subscribe')
  @ApiOperation({ summary: 'Subscribe to real-time monitoring updates (WebSocket)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Real-time subscription information' 
  })
  async subscribeToRealtimeUpdates(
    @Param('integrationId') integrationId: string,
  ) {
    try {
      // In a real implementation, this would set up WebSocket connection
      const subscriptionInfo = {
        integrationId,
        websocketUrl: `/ws/integrations/${integrationId}/monitoring`,
        supportedEvents: [
          'sync_session_created',
          'sync_session_updated',
          'sync_session_completed',
          'alert_triggered',
          'alert_resolved',
          'dashboard_updated',
          'performance_alert',
        ],
        reconnectionPolicy: {
          maxRetries: 5,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
      };

      return {
        success: true,
        subscription: subscriptionInfo,
        message: 'Real-time subscription information provided',
      };

    } catch (error) {
      this.logger.error(`Failed to get real-time subscription info: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to get real-time subscription information',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
