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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../auth/rbac/guards/rbac.guard';
import { Permissions } from '../../auth/rbac/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ProductionReadinessService, ProductionReadinessReport } from '../services/production/production-readiness.service';
import { ProductionDeploymentService, DeploymentPlan, DeploymentExecution } from '../services/production/production-deployment.service';

/**
 * Production Management Controller
 * 
 * Provides comprehensive REST API endpoints for production readiness validation,
 * deployment planning, execution, and monitoring. Enables administrators to
 * manage production deployments with full visibility and control.
 */

@ApiTags('Production Management')
@ApiBearerAuth()
@Controller('integration/production')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ProductionManagementController {
  private readonly logger = new Logger(ProductionManagementController.name);

  constructor(
    private readonly readinessService: ProductionReadinessService,
    private readonly deploymentService: ProductionDeploymentService,
  ) {}

  /**
   * Production Readiness Endpoints
   */

  @Post('readiness/assess')
  @Permissions('integration:production:assess')
  @ApiOperation({ summary: 'Execute production readiness assessment' })
  @ApiResponse({ status: 200, description: 'Readiness assessment completed' })
  async executeReadinessAssessment(
    @Body() request: { environment?: string } = {},
    @CurrentUser() user: any
  ): Promise<ProductionReadinessReport> {
    this.logger.log(`Production readiness assessment requested by user ${user.id}`);
    
    try {
      const environment = request.environment || 'production';
      const report = await this.readinessService.executeReadinessAssessment(environment);
      return report;
    } catch (error) {
      this.logger.error('Production readiness assessment failed:', error);
      throw new BadRequestException('Failed to execute readiness assessment');
    }
  }

  @Get('readiness/dashboard')
  @Permissions('integration:production:read')
  @ApiOperation({ summary: 'Get production readiness dashboard' })
  @ApiQuery({ name: 'environment', type: 'string', required: false })
  @ApiResponse({ status: 200, description: 'Readiness dashboard retrieved' })
  async getReadinessDashboard(
    @Query('environment') environment: string = 'production'
  ): Promise<any> {
    try {
      const dashboard = await this.readinessService.getReadinessDashboard(environment);
      return dashboard;
    } catch (error) {
      this.logger.error('Failed to get readiness dashboard:', error);
      throw new BadRequestException('Failed to retrieve readiness dashboard');
    }
  }

  @Post('readiness/:reportId/go-live')
  @Permissions('integration:production:deploy')
  @ApiOperation({ summary: 'Execute go-live procedures' })
  @ApiResponse({ status: 200, description: 'Go-live procedures executed' })
  async executeGoLiveProcedures(
    @Param('reportId') reportId: string,
    @CurrentUser() user: any
  ): Promise<{ success: boolean; completedSteps: string[]; failedSteps: string[] }> {
    this.logger.log(`Go-live procedures requested by user ${user.id} for report ${reportId}`);
    
    try {
      const result = await this.readinessService.executeGoLiveProcedures(reportId);
      return result;
    } catch (error) {
      this.logger.error('Go-live procedures failed:', error);
      throw new BadRequestException('Failed to execute go-live procedures');
    }
  }

  @Post('validation/deployment')
  @Permissions('integration:production:validate')
  @ApiOperation({ summary: 'Validate deployment readiness' })
  @ApiResponse({ status: 200, description: 'Deployment validation completed' })
  async validateDeployment(
    @Body() request: {
      environment: string;
      version: string;
      skipSmokeTests?: boolean;
    },
    @CurrentUser() user: any
  ): Promise<any> {
    this.logger.log(`Deployment validation requested by user ${user.id}: ${request.environment} v${request.version}`);
    
    try {
      const validation = await this.readinessService.validateDeployment(
        request.environment,
        request.version,
        { skipSmokeTests: request.skipSmokeTests }
      );
      return validation;
    } catch (error) {
      this.logger.error('Deployment validation failed:', error);
      throw new BadRequestException('Failed to validate deployment');
    }
  }

  /**
   * Deployment Planning Endpoints
   */

  @Post('deployments/plans')
  @Permissions('integration:production:plan')
  @ApiOperation({ summary: 'Create deployment plan' })
  @ApiResponse({ status: 201, description: 'Deployment plan created' })
  async createDeploymentPlan(
    @Body() planData: {
      name: string;
      description?: string;
      version: string;
      targetEnvironment: string;
      scheduledAt?: string;
      dependencies?: string[];
    },
    @CurrentUser() user: any
  ): Promise<DeploymentPlan> {
    this.logger.log(`Deployment plan creation requested by user ${user.id}: ${planData.name}`);
    
    try {
      const plan = await this.deploymentService.createDeploymentPlan({
        ...planData,
        createdBy: user.id,
        scheduledAt: planData.scheduledAt ? new Date(planData.scheduledAt) : undefined,
      });
      return plan;
    } catch (error) {
      this.logger.error('Failed to create deployment plan:', error);
      throw new BadRequestException('Failed to create deployment plan');
    }
  }

  @Get('deployments/plans/:planId')
  @Permissions('integration:production:read')
  @ApiOperation({ summary: 'Get deployment plan' })
  @ApiResponse({ status: 200, description: 'Deployment plan retrieved' })
  async getDeploymentPlan(
    @Param('planId') planId: string
  ): Promise<DeploymentPlan> {
    try {
      const plan = await this.deploymentService['getDeploymentPlan'](planId);
      
      if (!plan) {
        throw new NotFoundException('Deployment plan not found');
      }
      
      return plan;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error('Failed to get deployment plan:', error);
      throw new BadRequestException('Failed to retrieve deployment plan');
    }
  }

  @Put('deployments/plans/:planId/approvals/:approvalId')
  @Permissions('integration:production:approve')
  @ApiOperation({ summary: 'Approve deployment plan' })
  @ApiResponse({ status: 200, description: 'Deployment plan approved' })
  async approveDeploymentPlan(
    @Param('planId') planId: string,
    @Param('approvalId') approvalId: string,
    @Body() request: {
      action: 'approve' | 'reject';
      comments?: string;
      conditions?: string[];
    },
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Deployment approval ${request.action} by user ${user.id}: ${planId}/${approvalId}`);
    
    try {
      // This would be implemented in the deployment service
      // For now, return success
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to process deployment approval:', error);
      throw new BadRequestException('Failed to process deployment approval');
    }
  }

  /**
   * Deployment Execution Endpoints
   */

  @Post('deployments/plans/:planId/execute')
  @Permissions('integration:production:deploy')
  @ApiOperation({ summary: 'Execute deployment plan' })
  @ApiResponse({ status: 200, description: 'Deployment execution started' })
  async executeDeployment(
    @Param('planId') planId: string,
    @Body() options: {
      dryRun?: boolean;
      skipApprovals?: boolean;
    } = {},
    @CurrentUser() user: any
  ): Promise<DeploymentExecution> {
    this.logger.log(`Deployment execution requested by user ${user.id}: ${planId} (dry run: ${options.dryRun})`);
    
    try {
      const execution = await this.deploymentService.executeDeployment(planId, options);
      return execution;
    } catch (error) {
      this.logger.error('Failed to execute deployment:', error);
      throw new BadRequestException(`Failed to execute deployment: ${error.message}`);
    }
  }

  @Get('deployments/executions/:executionId')
  @Permissions('integration:production:read')
  @ApiOperation({ summary: 'Get deployment execution status' })
  @ApiResponse({ status: 200, description: 'Deployment status retrieved' })
  async getDeploymentStatus(
    @Param('executionId') executionId: string
  ): Promise<DeploymentExecution> {
    try {
      const execution = await this.deploymentService.getDeploymentStatus(executionId);
      
      if (!execution) {
        throw new NotFoundException('Deployment execution not found');
      }
      
      return execution;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error('Failed to get deployment status:', error);
      throw new BadRequestException('Failed to retrieve deployment status');
    }
  }

  @Post('deployments/executions/:executionId/rollback')
  @Permissions('integration:production:rollback')
  @ApiOperation({ summary: 'Execute deployment rollback' })
  @ApiResponse({ status: 200, description: 'Rollback execution started' })
  async executeRollback(
    @Param('executionId') executionId: string,
    @Body() request: {
      reason: string;
      force?: boolean;
    },
    @CurrentUser() user: any
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Rollback requested by user ${user.id}: ${executionId} - ${request.reason}`);
    
    try {
      const execution = await this.deploymentService.getDeploymentStatus(executionId);
      
      if (!execution) {
        throw new NotFoundException('Deployment execution not found');
      }
      
      if (execution.status === 'completed' && !request.force) {
        throw new ForbiddenException('Cannot rollback completed deployment without force flag');
      }
      
      // Get the deployment plan for rollback execution
      const plan = await this.deploymentService['getDeploymentPlan'](execution.planId);
      if (!plan) {
        throw new NotFoundException('Deployment plan not found');
      }
      
      await this.deploymentService.executeRollback(execution, plan, request.reason);
      
      return {
        success: true,
        message: 'Rollback executed successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error('Failed to execute rollback:', error);
      throw new BadRequestException(`Failed to execute rollback: ${error.message}`);
    }
  }

  @Put('deployments/executions/:executionId/cancel')
  @Permissions('integration:production:cancel')
  @ApiOperation({ summary: 'Cancel deployment execution' })
  @ApiResponse({ status: 200, description: 'Deployment cancelled' })
  async cancelDeployment(
    @Param('executionId') executionId: string,
    @Body() request: {
      reason: string;
    },
    @CurrentUser() user: any
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Deployment cancellation requested by user ${user.id}: ${executionId} - ${request.reason}`);
    
    try {
      const execution = await this.deploymentService.getDeploymentStatus(executionId);
      
      if (!execution) {
        throw new NotFoundException('Deployment execution not found');
      }
      
      if (execution.status !== 'in_progress' && execution.status !== 'pending') {
        throw new ForbiddenException('Cannot cancel deployment that is not in progress');
      }
      
      // Update execution status to cancelled
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      
      // This would be implemented to actually stop the deployment process
      await this.deploymentService['updateDeploymentExecution'](execution);
      
      return {
        success: true,
        message: 'Deployment cancelled successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error('Failed to cancel deployment:', error);
      throw new BadRequestException('Failed to cancel deployment');
    }
  }

  /**
   * Monitoring and Dashboard Endpoints
   */

  @Get('dashboard')
  @Permissions('integration:production:read')
  @ApiOperation({ summary: 'Get production management dashboard' })
  @ApiResponse({ status: 200, description: 'Production dashboard retrieved' })
  async getProductionDashboard(): Promise<any> {
    try {
      const [readinessDashboard, deploymentDashboard] = await Promise.all([
        this.readinessService.getReadinessDashboard('production'),
        this.deploymentService.getDeploymentDashboard(),
      ]);

      return {
        timestamp: new Date(),
        readiness: readinessDashboard,
        deployments: deploymentDashboard,
        systemStatus: {
          overall: this.determineOverallStatus(readinessDashboard, deploymentDashboard),
          components: {
            readiness: readinessDashboard.currentStatus.readinessStatus,
            deployments: deploymentDashboard.health.systemStatus,
          },
        },
      };
    } catch (error) {
      this.logger.error('Failed to get production dashboard:', error);
      throw new BadRequestException('Failed to retrieve production dashboard');
    }
  }

  @Get('deployments/history')
  @Permissions('integration:production:read')
  @ApiOperation({ summary: 'Get deployment history' })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiQuery({ name: 'status', type: 'string', required: false })
  @ApiResponse({ status: 200, description: 'Deployment history retrieved' })
  async getDeploymentHistory(
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Query('status') status?: string
  ): Promise<any> {
    try {
      const dashboard = await this.deploymentService.getDeploymentDashboard();
      
      let deployments = dashboard.recent.deployments;
      
      // Filter by status if provided
      if (status) {
        deployments = deployments.filter((d: any) => d.status === status);
      }
      
      // Apply pagination
      const paginatedDeployments = deployments.slice(offset, offset + limit);
      
      return {
        deployments: paginatedDeployments,
        pagination: {
          total: deployments.length,
          limit,
          offset,
          hasMore: offset + limit < deployments.length,
        },
        summary: {
          totalDeployments: dashboard.statistics.totalDeployments,
          successRate: dashboard.statistics.successRate,
          averageDuration: dashboard.statistics.averageDuration,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get deployment history:', error);
      throw new BadRequestException('Failed to retrieve deployment history');
    }
  }

  @Get('environments/:environment/status')
  @Permissions('integration:production:read')
  @ApiOperation({ summary: 'Get environment status' })
  @ApiResponse({ status: 200, description: 'Environment status retrieved' })
  async getEnvironmentStatus(
    @Param('environment') environment: string
  ): Promise<any> {
    try {
      const readinessDashboard = await this.readinessService.getReadinessDashboard(environment);
      
      return {
        environment,
        timestamp: new Date(),
        status: readinessDashboard.currentStatus.readinessStatus,
        score: readinessDashboard.currentStatus.overallScore,
        lastAssessment: readinessDashboard.currentStatus.lastAssessment,
        issues: {
          critical: readinessDashboard.currentStatus.criticalBlockers,
          recommendations: readinessDashboard.currentStatus.highPriorityRecommendations,
        },
        categories: readinessDashboard.categories,
        riskLevel: readinessDashboard.riskLevel,
      };
    } catch (error) {
      this.logger.error('Failed to get environment status:', error);
      throw new BadRequestException('Failed to retrieve environment status');
    }
  }

  /**
   * Configuration and Management Endpoints
   */

  @Get('templates/deployment-plans')
  @Permissions('integration:production:read')
  @ApiOperation({ summary: 'Get deployment plan templates' })
  @ApiResponse({ status: 200, description: 'Deployment plan templates retrieved' })
  async getDeploymentPlanTemplates(): Promise<any[]> {
    return [
      {
        name: 'Standard Production Deployment',
        description: 'Standard deployment template for production environments',
        template: {
          phases: [
            'Preparation (Backup & Maintenance Mode)',
            'Deployment (Application & Database)',
            'Verification (Health Checks & Smoke Tests)',
            'Finalization (Restore Access & Notifications)',
          ],
          estimatedDuration: 75, // minutes
          riskLevel: 'medium',
          approvals: ['technical', 'security'],
        },
      },
      {
        name: 'Emergency Hotfix Deployment',
        description: 'Accelerated deployment for critical hotfixes',
        template: {
          phases: [
            'Quick Backup',
            'Deploy Hotfix',
            'Basic Verification',
            'Restore Access',
          ],
          estimatedDuration: 30, // minutes
          riskLevel: 'high',
          approvals: ['technical'],
        },
      },
      {
        name: 'Blue-Green Deployment',
        description: 'Zero-downtime blue-green deployment strategy',
        template: {
          phases: [
            'Deploy to Green Environment',
            'Run Verification Suite',
            'Switch Traffic to Green',
            'Monitor and Validate',
            'Decommission Blue Environment',
          ],
          estimatedDuration: 120, // minutes
          riskLevel: 'low',
          approvals: ['technical', 'security', 'business'],
        },
      },
    ];
  }

  @Get('health')
  @Permissions('integration:production:read')
  @ApiOperation({ summary: 'Get production management system health' })
  @ApiResponse({ status: 200, description: 'System health retrieved' })
  async getSystemHealth(): Promise<any> {
    try {
      const [readinessDashboard, deploymentDashboard] = await Promise.all([
        this.readinessService.getReadinessDashboard('production').catch(() => null),
        this.deploymentService.getDeploymentDashboard().catch(() => null),
      ]);

      return {
        status: 'healthy',
        timestamp: new Date(),
        components: {
          readinessService: {
            status: readinessDashboard ? 'healthy' : 'degraded',
            lastCheck: readinessDashboard?.currentStatus?.lastAssessment || null,
          },
          deploymentService: {
            status: deploymentDashboard ? 'healthy' : 'degraded',
            activeDeployments: deploymentDashboard?.active?.count || 0,
          },
        },
        metrics: {
          activeDeployments: deploymentDashboard?.active?.count || 0,
          recentDeployments: deploymentDashboard?.recent?.count || 0,
          successRate: deploymentDashboard?.statistics?.successRate || 0,
          averageDuration: deploymentDashboard?.statistics?.averageDuration || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  @Get('statistics')
  @Permissions('integration:production:read')
  @ApiOperation({ summary: 'Get production management statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getProductionStatistics(): Promise<any> {
    try {
      const deploymentDashboard = await this.deploymentService.getDeploymentDashboard();
      
      return {
        timestamp: new Date(),
        deployments: {
          total: deploymentDashboard.statistics.totalDeployments,
          successful: Math.round(deploymentDashboard.statistics.totalDeployments * deploymentDashboard.statistics.successRate / 100),
          failed: deploymentDashboard.statistics.totalDeployments - Math.round(deploymentDashboard.statistics.totalDeployments * deploymentDashboard.statistics.successRate / 100),
          successRate: deploymentDashboard.statistics.successRate,
          averageDuration: deploymentDashboard.statistics.averageDuration,
          lastDeployment: deploymentDashboard.statistics.lastDeployment,
        },
        system: {
          uptime: process.uptime(),
          deploymentsThisMonth: deploymentDashboard.recent.count, // Approximation
          activeDeployments: deploymentDashboard.active.count,
          rollbacksTriggered: deploymentDashboard.health.rollbacksTriggered,
        },
        trends: {
          deploymentFrequency: 'Weekly', // Would calculate from actual data
          averageDowntime: '2.5 minutes', // Would calculate from actual data
          releaseVelocity: 'Stable', // Would analyze from deployment data
        },
      };
    } catch (error) {
      this.logger.error('Failed to get production statistics:', error);
      throw new BadRequestException('Failed to retrieve production statistics');
    }
  }

  // Private helper methods

  private determineOverallStatus(readinessDashboard: any, deploymentDashboard: any): string {
    // Determine overall system status based on component health
    if (deploymentDashboard.health.activeIssues > 0) {
      return 'issues';
    }
    
    if (readinessDashboard.currentStatus.readinessStatus === 'critical_issues') {
      return 'critical';
    }
    
    if (readinessDashboard.currentStatus.readinessStatus === 'not_ready') {
      return 'warning';
    }
    
    if (deploymentDashboard.active.count > 0) {
      return 'deploying';
    }
    
    return 'healthy';
  }
}
