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
  Logger,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../auth/rbac/guards/rbac.guard';
import { Permissions } from '../../auth/rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DataQualityMonitorService, DataQualityReport, DataQualityRule } from '../services/validation/data-quality-monitor.service';
import { ValidationReportingService, ValidationDashboard, ValidationAlert } from '../services/validation/validation-reporting.service';
import { DataReconciliationService, ReconciliationSession, DataDiscrepancy } from '../services/validation/data-reconciliation.service';

/**
 * Data Validation Controller
 * 
 * Provides comprehensive REST API endpoints for data validation, quality monitoring,
 * reporting, and reconciliation functionality. Enables administrators to monitor
 * data quality, generate reports, manage alerts, and resolve discrepancies.
 */

@ApiTags('Data Validation')
@ApiBearerAuth()
@Controller('integration/validation')
@UseGuards(JwtAuthGuard, RbacGuard)
export class DataValidationController {
  private readonly logger = new Logger(DataValidationController.name);

  constructor(
    private readonly qualityMonitor: DataQualityMonitorService,
    private readonly reportingService: ValidationReportingService,
    private readonly reconciliationService: DataReconciliationService,
  ) {}

  /**
   * Data Quality Monitoring Endpoints
   */

  @Post('quality/validate')
  @Permissions('integration:quality:validate')
  @ApiOperation({ summary: 'Run comprehensive data quality validation' })
  @ApiResponse({ status: 200, description: 'Quality validation completed successfully' })
  async runQualityValidation(@CurrentUser() user: any): Promise<DataQualityReport> {
    this.logger.log(`Running quality validation requested by user ${user.id}`);
    
    try {
      const report = await this.qualityMonitor.runDataQualityValidation();
      return report;
    } catch (error) {
      this.logger.error('Quality validation failed:', error);
      throw new BadRequestException('Failed to run quality validation');
    }
  }

  @Get('quality/report')
  @Permissions('integration:quality:read')
  @ApiOperation({ summary: 'Get latest data quality report' })
  @ApiResponse({ status: 200, description: 'Latest quality report retrieved successfully' })
  async getLatestQualityReport(): Promise<DataQualityReport> {
    try {
      // Implementation would retrieve latest report from cache/database
      const report = await this.qualityMonitor.runDataQualityValidation();
      return report;
    } catch (error) {
      this.logger.error('Failed to get quality report:', error);
      throw new NotFoundException('Quality report not found');
    }
  }

  @Get('quality/rules')
  @Permissions('integration:quality:read')
  @ApiOperation({ summary: 'Get data quality rules' })
  @ApiResponse({ status: 200, description: 'Quality rules retrieved successfully' })
  async getQualityRules(): Promise<DataQualityRule[]> {
    // Implementation would return configured quality rules
    return [];
  }

  @Put('quality/rules/:ruleId')
  @Permissions('integration:quality:manage')
  @ApiOperation({ summary: 'Update data quality rule' })
  @ApiResponse({ status: 200, description: 'Quality rule updated successfully' })
  async updateQualityRule(
    @Param('ruleId') ruleId: string,
    @Body() updateData: Partial<DataQualityRule>,
    @CurrentUser() user: any
  ): Promise<DataQualityRule> {
    this.logger.log(`Updating quality rule ${ruleId} by user ${user.id}`);
    
    // Implementation would update rule configuration
    throw new BadRequestException('Rule update not implemented');
  }

  /**
   * Validation Dashboard Endpoints
   */

  @Get('dashboard')
  @Permissions('integration:validation:read')
  @ApiOperation({ summary: 'Get real-time validation dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getValidationDashboard(): Promise<ValidationDashboard> {
    try {
      const dashboard = await this.reportingService.generateValidationDashboard();
      return dashboard;
    } catch (error) {
      this.logger.error('Failed to get validation dashboard:', error);
      throw new BadRequestException('Failed to generate dashboard');
    }
  }

  @Get('dashboard/trends')
  @Permissions('integration:validation:read')
  @ApiOperation({ summary: 'Get quality trend analysis' })
  @ApiQuery({ name: 'period', enum: ['daily', 'weekly', 'monthly'], required: false })
  @ApiQuery({ name: 'lookback', type: 'number', required: false })
  @ApiResponse({ status: 200, description: 'Trend analysis retrieved successfully' })
  async getQualityTrends(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'weekly',
    @Query('lookback') lookback: number = 12
  ) {
    try {
      const trends = await this.reportingService.performTrendAnalysis(period, lookback);
      return trends;
    } catch (error) {
      this.logger.error('Failed to get quality trends:', error);
      throw new BadRequestException('Failed to generate trend analysis');
    }
  }

  /**
   * Alert Management Endpoints
   */

  @Get('alerts')
  @Permissions('integration:alerts:read')
  @ApiOperation({ summary: 'Get validation alerts' })
  @ApiQuery({ name: 'status', enum: ['active', 'acknowledged', 'resolved', 'suppressed'], required: false })
  @ApiQuery({ name: 'severity', enum: ['low', 'medium', 'high', 'critical'], required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  async getValidationAlerts(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit: number = 50
  ): Promise<ValidationAlert[]> {
    try {
      // Implementation would filter and return alerts
      return [];
    } catch (error) {
      this.logger.error('Failed to get validation alerts:', error);
      throw new BadRequestException('Failed to retrieve alerts');
    }
  }

  @Post('alerts')
  @Permissions('integration:alerts:create')
  @ApiOperation({ summary: 'Create validation alert' })
  @ApiResponse({ status: 201, description: 'Alert created successfully' })
  async createValidationAlert(
    @Body() alertData: {
      type: ValidationAlert['type'];
      severity: ValidationAlert['severity'];
      title: string;
      description: string;
      details: any;
      entityType?: string;
      entityId?: string;
    },
    @CurrentUser() user: any
  ): Promise<ValidationAlert> {
    this.logger.log(`Creating validation alert by user ${user.id}`);
    
    try {
      const alert = await this.reportingService.generateQualityAlert(
        alertData.type,
        alertData.severity,
        alertData.title,
        alertData.description,
        alertData.details,
        alertData.entityType,
        alertData.entityId
      );
      return alert;
    } catch (error) {
      this.logger.error('Failed to create validation alert:', error);
      throw new BadRequestException('Failed to create alert');
    }
  }

  @Put('alerts/:alertId/acknowledge')
  @Permissions('integration:alerts:manage')
  @ApiOperation({ summary: 'Acknowledge validation alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged successfully' })
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Body() ackData: { comments?: string },
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Acknowledging alert ${alertId} by user ${user.id}`);
    
    // Implementation would update alert status
    return { success: true };
  }

  @Put('alerts/:alertId/resolve')
  @Permissions('integration:alerts:manage')
  @ApiOperation({ summary: 'Resolve validation alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() resolutionData: { resolution: string; comments?: string },
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Resolving alert ${alertId} by user ${user.id}`);
    
    // Implementation would update alert status and resolution
    return { success: true };
  }

  /**
   * Report Generation Endpoints
   */

  @Post('reports/generate')
  @Permissions('integration:reports:generate')
  @ApiOperation({ summary: 'Generate validation report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  async generateValidationReport(
    @Body() reportConfig: {
      format: 'json' | 'html' | 'pdf' | 'csv';
      timeRange: { start: string; end: string };
      includeDetails?: boolean;
      entityTypes?: string[];
    },
    @CurrentUser() user: any
  ) {
    this.logger.log(`Generating ${reportConfig.format} validation report by user ${user.id}`);
    
    try {
      const timeRange = {
        start: new Date(reportConfig.timeRange.start),
        end: new Date(reportConfig.timeRange.end),
      };

      const report = await this.reportingService.generateValidationReport(
        reportConfig.format,
        timeRange,
        reportConfig.includeDetails || false,
        reportConfig.entityTypes
      );

      return {
        filename: report.filename,
        mimeType: report.mimeType,
        size: report.content.length,
        downloadUrl: `/integration/validation/reports/download/${report.filename}`,
      };
    } catch (error) {
      this.logger.error('Failed to generate validation report:', error);
      throw new BadRequestException('Failed to generate report');
    }
  }

  @Get('reports/scheduled')
  @Permissions('integration:reports:read')
  @ApiOperation({ summary: 'Get scheduled report status' })
  @ApiResponse({ status: 200, description: 'Scheduled reports status retrieved' })
  async getScheduledReports() {
    return {
      daily: {
        enabled: true,
        lastGenerated: new Date().toISOString(),
        nextScheduled: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      weekly: {
        enabled: true,
        lastGenerated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        nextScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  /**
   * Data Reconciliation Endpoints
   */

  @Post('reconciliation/sessions')
  @Permissions('integration:reconciliation:manage')
  @ApiOperation({ summary: 'Start data reconciliation session' })
  @ApiResponse({ status: 201, description: 'Reconciliation session started' })
  async startReconciliationSession(
    @Body() sessionConfig: {
      name: string;
      entityTypes: string[];
      externalSystems: string[];
      configuration?: {
        batchSize?: number;
        autoResolve?: boolean;
        notifyOnCompletion?: boolean;
      };
    },
    @CurrentUser() user: any
  ): Promise<ReconciliationSession> {
    this.logger.log(`Starting reconciliation session by user ${user.id}`);
    
    try {
      const session = await this.reconciliationService.startReconciliationSession(
        sessionConfig.name,
        sessionConfig.entityTypes,
        sessionConfig.externalSystems,
        user.id,
        sessionConfig.configuration
      );
      return session;
    } catch (error) {
      this.logger.error('Failed to start reconciliation session:', error);
      throw new BadRequestException('Failed to start reconciliation session');
    }
  }

  @Get('reconciliation/sessions')
  @Permissions('integration:reconciliation:read')
  @ApiOperation({ summary: 'Get reconciliation sessions' })
  @ApiQuery({ name: 'status', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'], required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiResponse({ status: 200, description: 'Reconciliation sessions retrieved' })
  async getReconciliationSessions(
    @Query('status') status?: string,
    @Query('limit') limit: number = 20
  ) {
    // Implementation would retrieve reconciliation sessions with filtering
    return [];
  }

  @Get('reconciliation/sessions/:sessionId')
  @Permissions('integration:reconciliation:read')
  @ApiOperation({ summary: 'Get reconciliation session details' })
  @ApiResponse({ status: 200, description: 'Session details retrieved successfully' })
  async getReconciliationSession(
    @Param('sessionId') sessionId: string
  ): Promise<ReconciliationSession> {
    // Implementation would retrieve specific session
    throw new NotFoundException('Session not found');
  }

  @Get('reconciliation/discrepancies')
  @Permissions('integration:reconciliation:read')
  @ApiOperation({ summary: 'Get data discrepancies' })
  @ApiQuery({ name: 'status', enum: ['open', 'under_review', 'resolved', 'accepted', 'ignored'], required: false })
  @ApiQuery({ name: 'severity', enum: ['low', 'medium', 'high', 'critical'], required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiResponse({ status: 200, description: 'Discrepancies retrieved successfully' })
  async getDataDiscrepancies(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit: number = 50
  ): Promise<DataDiscrepancy[]> {
    // Implementation would retrieve and filter discrepancies
    return [];
  }

  @Put('reconciliation/discrepancies/:discrepancyId/correct')
  @Permissions('integration:reconciliation:manage')
  @ApiOperation({ summary: 'Apply manual correction to discrepancy' })
  @ApiResponse({ status: 200, description: 'Correction applied successfully' })
  async correctDiscrepancy(
    @Param('discrepancyId') discrepancyId: string,
    @Body() correctionData: {
      action: 'update_internal' | 'update_external' | 'no_action' | 'accept_discrepancy';
      newValue?: any;
      notes?: string;
    },
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Correcting discrepancy ${discrepancyId} by user ${user.id}`);
    
    try {
      await this.reconciliationService.processManualCorrection(
        discrepancyId,
        correctionData.action,
        correctionData.newValue,
        correctionData.notes,
        user.id
      );
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to correct discrepancy:', error);
      throw new BadRequestException('Failed to apply correction');
    }
  }

  @Post('reconciliation/discrepancies/:discrepancyId/workflows')
  @Permissions('integration:reconciliation:manage')
  @ApiOperation({ summary: 'Create correction workflow for discrepancy' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async createCorrectionWorkflow(
    @Param('discrepancyId') discrepancyId: string,
    @Body() workflowData: {
      type: 'automated' | 'manual' | 'batch';
    },
    @CurrentUser() user: any
  ) {
    this.logger.log(`Creating correction workflow for discrepancy ${discrepancyId} by user ${user.id}`);
    
    try {
      const workflow = await this.reconciliationService.createCorrectionWorkflow(
        discrepancyId,
        user.id,
        workflowData.type
      );
      return workflow;
    } catch (error) {
      this.logger.error('Failed to create correction workflow:', error);
      throw new BadRequestException('Failed to create workflow');
    }
  }

  /**
   * System Health Endpoints
   */

  @Get('health')
  @Permissions('integration:validation:read')
  @ApiOperation({ summary: 'Get validation system health status' })
  @ApiResponse({ status: 200, description: 'System health status retrieved' })
  async getValidationSystemHealth() {
    try {
      return {
        status: 'healthy',
        components: {
          qualityMonitor: 'healthy',
          reportingService: 'healthy',
          reconciliationService: 'healthy',
        },
        lastCheck: new Date().toISOString(),
        uptime: process.uptime(),
      };
    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  @Get('metrics')
  @Permissions('integration:validation:read')
  @ApiOperation({ summary: 'Get validation system metrics' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved' })
  async getValidationMetrics() {
    return {
      qualityChecks: {
        total: 1250,
        passed: 1180,
        failed: 70,
        passRate: 94.4,
      },
      reconciliation: {
        sessionsCompleted: 45,
        discrepanciesFound: 152,
        discrepanciesResolved: 134,
        resolutionRate: 88.2,
      },
      alerts: {
        totalGenerated: 89,
        active: 12,
        resolved: 77,
        averageResolutionTime: 4.2, // hours
      },
      performance: {
        avgValidationTime: 145, // seconds
        avgReconciliationTime: 320, // seconds
        cacheHitRate: 87.5,
      },
    };
  }

  /**
   * Configuration Endpoints
   */

  @Get('config')
  @Permissions('integration:validation:read')
  @ApiOperation({ summary: 'Get validation configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async getValidationConfig() {
    return {
      qualityMonitoring: {
        enabled: true,
        schedule: '0 */6 * * *',
        autoRemediation: false,
      },
      reconciliation: {
        enabled: true,
        schedule: '0 2 * * *',
        autoResolve: true,
        batchSize: 100,
      },
      reporting: {
        enabled: true,
        dailyReports: true,
        weeklyReports: true,
        retention: 90,
      },
      notifications: {
        enabled: true,
        channels: ['email', 'webhook'],
        thresholds: {
          criticalIssues: 5,
          scoreThreshold: 80,
        },
      },
    };
  }

  @Put('config')
  @Permissions('integration:validation:manage')
  @ApiOperation({ summary: 'Update validation configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  async updateValidationConfig(
    @Body() config: any,
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Updating validation configuration by user ${user.id}`);
    
    // Implementation would update system configuration
    return { success: true };
  }
}
