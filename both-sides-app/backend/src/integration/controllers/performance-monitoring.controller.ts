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
import { PerformanceTestingService, PerformanceTestConfig, PerformanceTestResult } from '../services/performance/performance-testing.service';
import { OptimizationService, OptimizationAnalysis } from '../services/performance/optimization.service';
import { PerformanceMonitoringService, PerformanceMetrics, PerformanceTrend, PerformanceAlert } from '../services/performance/performance-monitoring.service';

/**
 * Performance Monitoring Controller
 * 
 * Provides comprehensive REST API endpoints for performance testing, optimization,
 * and monitoring capabilities. Enables administrators to run performance tests,
 * analyze optimization opportunities, and monitor system performance in real-time.
 */

@ApiTags('Performance Monitoring')
@ApiBearerAuth()
@Controller('integration/performance')
@UseGuards(JwtAuthGuard, RbacGuard)
export class PerformanceMonitoringController {
  private readonly logger = new Logger(PerformanceMonitoringController.name);

  constructor(
    private readonly performanceTestingService: PerformanceTestingService,
    private readonly optimizationService: OptimizationService,
    private readonly performanceMonitoringService: PerformanceMonitoringService,
  ) {}

  /**
   * Performance Testing Endpoints
   */

  @Post('tests/load')
  @Permissions('integration:performance:test')
  @ApiOperation({ summary: 'Execute load test' })
  @ApiResponse({ status: 200, description: 'Load test executed successfully' })
  async executeLoadTest(
    @Body() config: PerformanceTestConfig,
    @CurrentUser() user: any
  ): Promise<PerformanceTestResult> {
    this.logger.log(`Load test requested by user ${user.id}: ${config.testName}`);
    
    try {
      const result = await this.performanceTestingService.executeLoadTest(config);
      return result;
    } catch (error) {
      this.logger.error('Load test execution failed:', error);
      throw new BadRequestException('Failed to execute load test');
    }
  }

  @Post('tests/stress')
  @Permissions('integration:performance:test')
  @ApiOperation({ summary: 'Execute stress test' })
  @ApiResponse({ status: 200, description: 'Stress test executed successfully' })
  async executeStressTest(
    @Body() config: PerformanceTestConfig,
    @CurrentUser() user: any
  ): Promise<PerformanceTestResult[]> {
    this.logger.log(`Stress test requested by user ${user.id}: ${config.testName}`);
    
    try {
      const results = await this.performanceTestingService.executeStressTest(config);
      return results;
    } catch (error) {
      this.logger.error('Stress test execution failed:', error);
      throw new BadRequestException('Failed to execute stress test');
    }
  }

  @Post('tests/endurance')
  @Permissions('integration:performance:test')
  @ApiOperation({ summary: 'Execute endurance test' })
  @ApiResponse({ status: 200, description: 'Endurance test executed successfully' })
  async executeEnduranceTest(
    @Body() config: PerformanceTestConfig,
    @CurrentUser() user: any
  ): Promise<PerformanceTestResult> {
    this.logger.log(`Endurance test requested by user ${user.id}: ${config.testName}`);
    
    try {
      const result = await this.performanceTestingService.executeEnduranceTest(config);
      return result;
    } catch (error) {
      this.logger.error('Endurance test execution failed:', error);
      throw new BadRequestException('Failed to execute endurance test');
    }
  }

  @Post('benchmarks/generate')
  @Permissions('integration:performance:test')
  @ApiOperation({ summary: 'Generate performance benchmarks' })
  @ApiResponse({ status: 200, description: 'Benchmarks generated successfully' })
  async generateBenchmarks(
    @Body() request: { operations?: string[] },
    @CurrentUser() user: any
  ): Promise<any> {
    this.logger.log(`Benchmark generation requested by user ${user.id}`);
    
    try {
      const benchmarks = await this.performanceTestingService.generatePerformanceBenchmarks(
        request.operations
      );
      return benchmarks;
    } catch (error) {
      this.logger.error('Benchmark generation failed:', error);
      throw new BadRequestException('Failed to generate benchmarks');
    }
  }

  @Get('trends/analyze')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Analyze performance trends' })
  @ApiQuery({ name: 'startDate', type: 'string', required: false })
  @ApiQuery({ name: 'endDate', type: 'string', required: false })
  @ApiQuery({ name: 'operations', type: 'string', isArray: true, required: false })
  @ApiResponse({ status: 200, description: 'Performance trends analyzed successfully' })
  async analyzePerformanceTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('operations') operations?: string[]
  ): Promise<any> {
    try {
      const timeRange = {
        start: startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate) : new Date(),
      };

      const trends = await this.performanceTestingService.analyzePerformanceTrends(
        timeRange,
        operations
      );
      return trends;
    } catch (error) {
      this.logger.error('Performance trend analysis failed:', error);
      throw new BadRequestException('Failed to analyze performance trends');
    }
  }

  /**
   * Optimization Endpoints
   */

  @Post('optimization/analyze')
  @Permissions('integration:performance:optimize')
  @ApiOperation({ summary: 'Perform optimization analysis' })
  @ApiResponse({ status: 200, description: 'Optimization analysis completed' })
  async performOptimizationAnalysis(
    @Body() request: { 
      startDate?: string; 
      endDate?: string 
    } = {},
    @CurrentUser() user: any
  ): Promise<OptimizationAnalysis> {
    this.logger.log(`Optimization analysis requested by user ${user.id}`);
    
    try {
      const timeRange = request.startDate && request.endDate ? {
        start: new Date(request.startDate),
        end: new Date(request.endDate),
      } : undefined;

      const analysis = await this.optimizationService.performOptimizationAnalysis(timeRange);
      return analysis;
    } catch (error) {
      this.logger.error('Optimization analysis failed:', error);
      throw new BadRequestException('Failed to perform optimization analysis');
    }
  }

  @Get('optimization/recommendations')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Optimization recommendations retrieved' })
  async getOptimizationRecommendations(): Promise<any> {
    try {
      const analysis = await this.optimizationService.performOptimizationAnalysis();
      return {
        recommendations: analysis.recommendations,
        bottlenecks: analysis.bottlenecks,
        implementationPlan: analysis.implementationPlan,
        expectedImpact: analysis.expectedImpact,
      };
    } catch (error) {
      this.logger.error('Failed to get optimization recommendations:', error);
      throw new BadRequestException('Failed to retrieve optimization recommendations');
    }
  }

  @Get('optimization/capacity-analysis')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get capacity analysis' })
  @ApiResponse({ status: 200, description: 'Capacity analysis retrieved' })
  async getCapacityAnalysis(): Promise<any> {
    try {
      const analysis = await this.optimizationService.performOptimizationAnalysis();
      return analysis.capacityAnalysis;
    } catch (error) {
      this.logger.error('Failed to get capacity analysis:', error);
      throw new BadRequestException('Failed to retrieve capacity analysis');
    }
  }

  @Get('optimization/cost-analysis')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get cost optimization analysis' })
  @ApiResponse({ status: 200, description: 'Cost analysis retrieved' })
  async getCostOptimizationAnalysis(): Promise<any> {
    try {
      const analysis = await this.optimizationService.performOptimizationAnalysis();
      return analysis.costAnalysis;
    } catch (error) {
      this.logger.error('Failed to get cost analysis:', error);
      throw new BadRequestException('Failed to retrieve cost analysis');
    }
  }

  /**
   * Real-time Monitoring Endpoints
   */

  @Get('metrics/current')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get current performance metrics' })
  @ApiResponse({ status: 200, description: 'Current metrics retrieved successfully' })
  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    try {
      const metrics = await this.performanceMonitoringService.getCurrentMetrics();
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get current metrics:', error);
      throw new BadRequestException('Failed to retrieve current metrics');
    }
  }

  @Get('metrics/realtime')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get real-time performance metrics' })
  @ApiResponse({ status: 200, description: 'Real-time metrics retrieved successfully' })
  async getRealtimeMetrics(): Promise<any> {
    try {
      const metrics = await this.performanceTestingService.getRealtimeMetrics();
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get real-time metrics:', error);
      throw new BadRequestException('Failed to retrieve real-time metrics');
    }
  }

  @Get('trends/:metric')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get performance trend for specific metric' })
  @ApiQuery({ name: 'timeframe', enum: ['1h', '6h', '24h', '7d', '30d'], required: false })
  @ApiResponse({ status: 200, description: 'Performance trend retrieved successfully' })
  async getPerformanceTrend(
    @Param('metric') metric: string,
    @Query('timeframe') timeframe: '1h' | '6h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<PerformanceTrend> {
    try {
      const trend = await this.performanceMonitoringService.getPerformanceTrend(metric, timeframe);
      return trend;
    } catch (error) {
      this.logger.error('Failed to get performance trend:', error);
      throw new BadRequestException('Failed to retrieve performance trend');
    }
  }

  @Get('dashboard')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get performance dashboard' })
  @ApiResponse({ status: 200, description: 'Performance dashboard retrieved successfully' })
  async getPerformanceDashboard(): Promise<any> {
    try {
      const dashboard = await this.performanceMonitoringService.getPerformanceDashboard();
      return dashboard;
    } catch (error) {
      this.logger.error('Failed to get performance dashboard:', error);
      throw new BadRequestException('Failed to retrieve performance dashboard');
    }
  }

  /**
   * Alert Management Endpoints
   */

  @Get('alerts')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get active performance alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts retrieved successfully' })
  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    try {
      const alerts = this.performanceMonitoringService.getActiveAlerts();
      return alerts;
    } catch (error) {
      this.logger.error('Failed to get active alerts:', error);
      throw new BadRequestException('Failed to retrieve active alerts');
    }
  }

  @Put('alerts/:alertId/acknowledge')
  @Permissions('integration:performance:manage')
  @ApiOperation({ summary: 'Acknowledge performance alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged successfully' })
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Alert acknowledgment by user ${user.id}: ${alertId}`);
    
    try {
      const success = await this.performanceMonitoringService.acknowledgeAlert(alertId, user.id);
      
      if (!success) {
        throw new NotFoundException('Alert not found or already acknowledged');
      }
      
      return { success };
    } catch (error) {
      this.logger.error('Failed to acknowledge alert:', error);
      throw error instanceof NotFoundException ? error : new BadRequestException('Failed to acknowledge alert');
    }
  }

  @Put('alerts/:alertId/resolve')
  @Permissions('integration:performance:manage')
  @ApiOperation({ summary: 'Resolve performance alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Alert resolution by user ${user.id}: ${alertId}`);
    
    try {
      const success = await this.performanceMonitoringService.resolveAlert(alertId, user.id);
      
      if (!success) {
        throw new NotFoundException('Alert not found');
      }
      
      return { success };
    } catch (error) {
      this.logger.error('Failed to resolve alert:', error);
      throw error instanceof NotFoundException ? error : new BadRequestException('Failed to resolve alert');
    }
  }

  /**
   * Configuration Endpoints
   */

  @Post('thresholds')
  @Permissions('integration:performance:configure')
  @ApiOperation({ summary: 'Configure performance threshold' })
  @ApiResponse({ status: 201, description: 'Threshold configured successfully' })
  async configureThreshold(
    @Body() threshold: any,
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Performance threshold configuration by user ${user.id}: ${threshold.name}`);
    
    try {
      await this.performanceMonitoringService.configureThreshold(threshold);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to configure threshold:', error);
      throw new BadRequestException('Failed to configure threshold');
    }
  }

  /**
   * System Health Endpoints
   */

  @Get('health')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get performance monitoring system health' })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully' })
  async getSystemHealth(): Promise<any> {
    try {
      const metrics = await this.performanceMonitoringService.getCurrentMetrics();
      const alerts = this.performanceMonitoringService.getActiveAlerts();
      
      return {
        status: alerts.filter(a => a.severity === 'critical').length === 0 ? 'healthy' : 'degraded',
        timestamp: new Date(),
        components: {
          performanceTesting: 'healthy',
          optimization: 'healthy',
          monitoring: 'healthy',
        },
        summary: {
          activeAlerts: alerts.length,
          criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
          systemLoad: metrics.system.cpu.usage,
          memoryUsage: metrics.system.memory.usage,
          responseTime: metrics.integration.sync.averageTime,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('statistics')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get performance statistics' })
  @ApiResponse({ status: 200, description: 'Performance statistics retrieved' })
  async getPerformanceStatistics(): Promise<any> {
    try {
      const metrics = await this.performanceMonitoringService.getCurrentMetrics();
      const alerts = this.performanceMonitoringService.getActiveAlerts();
      
      return {
        timestamp: new Date(),
        system: {
          uptime: metrics.system.uptime,
          cpuCores: metrics.system.cpu.cores,
          totalMemory: metrics.system.memory.total,
          diskSpace: metrics.system.disk.total,
        },
        performance: {
          averageResponseTime: metrics.integration.sync.averageTime,
          throughput: metrics.integration.sync.operationsPerSecond,
          successRate: metrics.integration.sync.successRate,
          cacheHitRate: metrics.cache.redis.hitRate,
        },
        monitoring: {
          activeAlerts: alerts.length,
          alertHistory: {
            resolved24h: 0, // Would implement actual counting
            triggered24h: 0,
          },
          metricsCollected: true,
          thresholdsConfigured: 5, // Mock count
        },
        testing: {
          testsExecuted24h: 0, // Would implement actual counting
          averageTestDuration: 0,
          lastTestStatus: 'passed',
        },
      };
    } catch (error) {
      this.logger.error('Failed to get performance statistics:', error);
      throw new BadRequestException('Failed to retrieve performance statistics');
    }
  }

  /**
   * Test Configuration Templates
   */

  @Get('templates/load-test')
  @Permissions('integration:performance:read')
  @ApiOperation({ summary: 'Get load test configuration templates' })
  @ApiResponse({ status: 200, description: 'Load test templates retrieved' })
  async getLoadTestTemplates(): Promise<any[]> {
    return [
      {
        name: 'Light Load Test',
        description: 'Basic load test for regular operations',
        config: {
          testName: 'Light Load Test',
          testType: 'load',
          duration: 300, // 5 minutes
          concurrency: 10,
          rampUpTime: 60,
          operations: [
            { type: 'sync', weight: 50, entityType: 'user', recordCount: 100 },
            { type: 'query', weight: 30, entityType: 'class', recordCount: 50 },
            { type: 'mapping', weight: 20, entityType: 'user', recordCount: 200 },
          ],
          thresholds: {
            maxResponseTime: 2000,
            maxErrorRate: 5,
            minThroughput: 50,
            maxMemoryUsage: 1024,
            maxCpuUsage: 70,
          },
        },
      },
      {
        name: 'Heavy Load Test',
        description: 'Intensive load test for peak conditions',
        config: {
          testName: 'Heavy Load Test',
          testType: 'load',
          duration: 600, // 10 minutes
          concurrency: 50,
          rampUpTime: 120,
          operations: [
            { type: 'sync', weight: 40, entityType: 'user', recordCount: 500 },
            { type: 'validation', weight: 30, entityType: 'class', recordCount: 200 },
            { type: 'reconciliation', weight: 20, entityType: 'enrollment', recordCount: 1000 },
            { type: 'mapping', weight: 10, entityType: 'organization', recordCount: 100 },
          ],
          thresholds: {
            maxResponseTime: 3000,
            maxErrorRate: 2,
            minThroughput: 100,
            maxMemoryUsage: 2048,
            maxCpuUsage: 80,
          },
        },
      },
      {
        name: 'Stress Test',
        description: 'Find system breaking point',
        config: {
          testName: 'System Stress Test',
          testType: 'stress',
          duration: 900, // 15 minutes
          concurrency: 100,
          rampUpTime: 300,
          operations: [
            { type: 'sync', weight: 60, entityType: 'user', recordCount: 1000 },
            { type: 'query', weight: 25, entityType: 'class', recordCount: 500 },
            { type: 'mapping', weight: 15, entityType: 'enrollment', recordCount: 2000 },
          ],
          thresholds: {
            maxResponseTime: 5000,
            maxErrorRate: 10,
            minThroughput: 20,
            maxMemoryUsage: 4096,
            maxCpuUsage: 90,
          },
        },
      },
    ];
  }
}
