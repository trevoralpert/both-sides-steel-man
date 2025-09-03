/**
 * Performance Analytics Controller
 * 
 * Task 7.4.3: REST API endpoints for Performance Analytics & Benchmarking
 * 
 * Provides endpoints for comprehensive reporting, benchmarking against standards,
 * and competitive performance analysis.
 */

import { 
  Controller, 
  Post, 
  Get, 
  Query, 
  Body, 
  Param, 
  UseGuards,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RBACGuard } from '../../auth/rbac/guards/rbac.guard';
import { RequirePermissions } from '../../auth/rbac/decorators/permissions.decorator';
import { GetUser } from '../../common/decorators/user.decorator';

import { PerformanceAnalyticsService } from '../services/performance-analytics.service';
import { BenchmarkingService } from '../services/benchmarking.service';

@ApiTags('Performance Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RBACGuard)
@Controller('performance-analytics')
export class PerformanceAnalyticsController {
  private readonly logger = new Logger(PerformanceAnalyticsController.name);

  constructor(
    private readonly performanceAnalyticsService: PerformanceAnalyticsService,
    private readonly benchmarkingService: BenchmarkingService
  ) {}

  /**
   * Generate individual performance report
   */
  @Get('individual/:userId')
  @ApiOperation({ 
    summary: 'Generate Individual Performance Report',
    description: 'Generate comprehensive performance report for a specific user'
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'timeframe', enum: ['week', 'month', 'semester', 'year', 'all_time'] })
  @ApiQuery({ name: 'includeComparisons', required: false, type: Boolean })
  @ApiQuery({ name: 'includeProjections', required: false, type: Boolean })
  @ApiQuery({ name: 'granularity', required: false, enum: ['daily', 'weekly', 'monthly'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Individual performance report generated successfully'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Insufficient permissions' 
  })
  @RequirePermissions(['analytics:read'])
  async generateIndividualReport(
    @Param('userId') userId: string,
    @Query('timeframe') timeframe: 'week' | 'month' | 'semester' | 'year' | 'all_time',
    @Query('includeComparisons') includeComparisons?: boolean,
    @Query('includeProjections') includeProjections?: boolean,
    @Query('granularity') granularity?: 'daily' | 'weekly' | 'monthly',
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(`Generating individual performance report for user ${userId}`);

    try {
      // Verify permissions
      if (userId !== currentUser.id && !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only view your own performance reports',
          HttpStatus.FORBIDDEN
        );
      }

      const report = await this.performanceAnalyticsService.generateIndividualReport(userId, {
        userId,
        timeframe,
        includeComparisons: includeComparisons || false,
        includeProjections: includeProjections || false,
        granularity: granularity || 'weekly',
      });

      return report;

    } catch (error) {
      this.logger.error(`Failed to generate individual report for user ${userId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate individual performance report',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate class analytics report
   */
  @Get('class/:classId')
  @ApiOperation({ 
    summary: 'Generate Class Analytics Report',
    description: 'Generate comprehensive analytics report for a class'
  })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({ name: 'timeframe', enum: ['week', 'month', 'semester', 'year', 'all_time'] })
  @ApiQuery({ name: 'includeComparisons', required: false, type: Boolean })
  @ApiQuery({ name: 'granularity', required: false, enum: ['daily', 'weekly', 'monthly'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Class analytics report generated successfully'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Only teachers can access class analytics' 
  })
  @RequirePermissions(['class:manage', 'analytics:read'])
  async generateClassAnalytics(
    @Param('classId') classId: string,
    @Query('timeframe') timeframe: 'week' | 'month' | 'semester' | 'year' | 'all_time',
    @Query('includeComparisons') includeComparisons?: boolean,
    @Query('granularity') granularity?: 'daily' | 'weekly' | 'monthly',
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(`Generating class analytics for class ${classId}`);

    try {
      // Only teachers and admins can view class analytics
      if (!['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'Only teachers and administrators can view class analytics',
          HttpStatus.FORBIDDEN
        );
      }

      const report = await this.performanceAnalyticsService.generateClassAnalytics(classId, {
        classId,
        timeframe,
        includeComparisons: includeComparisons || false,
        granularity: granularity || 'weekly',
      });

      return report;

    } catch (error) {
      this.logger.error(`Failed to generate class analytics for class ${classId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate class analytics report',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate organizational analytics
   */
  @Get('organization/:organizationId')
  @ApiOperation({ 
    summary: 'Generate Organizational Analytics',
    description: 'Generate comprehensive analytics for an organization'
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({ name: 'timeframe', enum: ['week', 'month', 'semester', 'year', 'all_time'] })
  @ApiQuery({ name: 'includeComparisons', required: false, type: Boolean })
  @ApiResponse({ 
    status: 200, 
    description: 'Organizational analytics generated successfully'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Only administrators can access organizational analytics' 
  })
  @RequirePermissions(['organization:manage', 'analytics:read'])
  async generateOrganizationalAnalytics(
    @Param('organizationId') organizationId: string,
    @Query('timeframe') timeframe: 'week' | 'month' | 'semester' | 'year' | 'all_time',
    @Query('includeComparisons') includeComparisons?: boolean,
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(`Generating organizational analytics for organization ${organizationId}`);

    try {
      // Only admins can view organizational analytics
      if (currentUser.role !== 'ADMIN') {
        throw new HttpException(
          'Only administrators can view organizational analytics',
          HttpStatus.FORBIDDEN
        );
      }

      const report = await this.performanceAnalyticsService.generateOrganizationalAnalytics(
        organizationId,
        {
          organizationId,
          timeframe,
          includeComparisons: includeComparisons || false,
        }
      );

      return report;

    } catch (error) {
      this.logger.error(
        `Failed to generate organizational analytics for organization ${organizationId}`,
        error.stack
      );
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate organizational analytics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate benchmark analysis
   */
  @Post('benchmark')
  @ApiOperation({ 
    summary: 'Generate Benchmark Analysis',
    description: 'Compare performance against various benchmarks and standards'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Benchmark analysis generated successfully'
  })
  @RequirePermissions(['analytics:read'])
  async generateBenchmarkAnalysis(
    @Body() benchmarkRequest: {
      entityType: 'student' | 'class' | 'organization';
      entityId: string;
      benchmarkTypes: Array<'national_standards' | 'state_standards' | 'grade_level_peers' | 'similar_demographics' | 'top_performers' | 'historical_self' | 'curriculum_standards'>;
      timeframe: string;
      includeHistorical?: boolean;
      confidenceLevel?: number;
    },
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(`Generating benchmark analysis for ${benchmarkRequest.entityType} ${benchmarkRequest.entityId}`);

    try {
      // Verify permissions based on entity type
      if (benchmarkRequest.entityType === 'student' && 
          benchmarkRequest.entityId !== currentUser.id && 
          !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only benchmark your own performance',
          HttpStatus.FORBIDDEN
        );
      }

      if (benchmarkRequest.entityType === 'class' && !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'Only teachers and administrators can benchmark classes',
          HttpStatus.FORBIDDEN
        );
      }

      if (benchmarkRequest.entityType === 'organization' && currentUser.role !== 'ADMIN') {
        throw new HttpException(
          'Only administrators can benchmark organizations',
          HttpStatus.FORBIDDEN
        );
      }

      const results = await this.benchmarkingService.generateBenchmarkAnalysis({
        entityType: benchmarkRequest.entityType,
        entityId: benchmarkRequest.entityId,
        benchmarkTypes: benchmarkRequest.benchmarkTypes,
        timeframe: benchmarkRequest.timeframe,
        includeHistorical: benchmarkRequest.includeHistorical || false,
        confidenceLevel: benchmarkRequest.confidenceLevel || 0.95,
      });

      return results;

    } catch (error) {
      this.logger.error('Failed to generate benchmark analysis', error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate benchmark analysis',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Compare to national standards
   */
  @Get('benchmark/national-standards/:entityType/:entityId')
  @ApiOperation({ 
    summary: 'Compare to National Standards',
    description: 'Compare performance against national educational standards'
  })
  @ApiParam({ name: 'entityType', enum: ['student', 'class', 'organization'] })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiQuery({ name: 'gradeLevel', description: 'Grade level for standards alignment' })
  @ApiQuery({ name: 'timeframe', enum: ['week', 'month', 'semester', 'year', 'all_time'] })
  @ApiResponse({ 
    status: 200, 
    description: 'National standards comparison completed successfully'
  })
  @RequirePermissions(['analytics:read'])
  async compareToNationalStandards(
    @Param('entityType') entityType: 'student' | 'class' | 'organization',
    @Param('entityId') entityId: string,
    @Query('gradeLevel') gradeLevel: string,
    @Query('timeframe') timeframe: 'week' | 'month' | 'semester' | 'year' | 'all_time',
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(`Comparing ${entityType} ${entityId} to national standards`);

    try {
      // Verify permissions
      if (entityType === 'student' && entityId !== currentUser.id && 
          !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only view your own standards comparison',
          HttpStatus.FORBIDDEN
        );
      }

      const comparison = await this.benchmarkingService.compareToNationalStandards(
        entityType,
        entityId,
        gradeLevel,
        timeframe
      );

      return comparison;

    } catch (error) {
      this.logger.error(
        `Failed to compare ${entityType} ${entityId} to national standards`,
        error.stack
      );
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to compare to national standards',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate peer benchmark
   */
  @Post('benchmark/peer-comparison')
  @ApiOperation({ 
    summary: 'Generate Peer Benchmark',
    description: 'Compare performance against peer groups'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Peer benchmark generated successfully'
  })
  @RequirePermissions(['analytics:read'])
  async generatePeerBenchmark(
    @Body() peerRequest: {
      entityType: 'student' | 'class' | 'organization';
      entityId: string;
      peerCriteria: {
        gradeLevel?: string;
        demographic?: string;
        socioeconomic?: string;
        geographic?: string;
        performanceLevel?: string;
      };
      timeframe: string;
    },
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(`Generating peer benchmark for ${peerRequest.entityType} ${peerRequest.entityId}`);

    try {
      // Verify permissions
      if (peerRequest.entityType === 'student' && 
          peerRequest.entityId !== currentUser.id && 
          !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only benchmark your own performance against peers',
          HttpStatus.FORBIDDEN
        );
      }

      const benchmark = await this.benchmarkingService.generatePeerBenchmark(
        peerRequest.entityType,
        peerRequest.entityId,
        peerRequest.peerCriteria,
        peerRequest.timeframe
      );

      return benchmark;

    } catch (error) {
      this.logger.error('Failed to generate peer benchmark', error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate peer benchmark',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate competitive ranking
   */
  @Get('ranking/:entityType/:entityId')
  @ApiOperation({ 
    summary: 'Generate Competitive Ranking',
    description: 'Generate competitive rankings and standings'
  })
  @ApiParam({ name: 'entityType', enum: ['student', 'class', 'organization'] })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiQuery({ name: 'scope', enum: ['local', 'regional', 'national'] })
  @ApiQuery({ name: 'timeframe', enum: ['week', 'month', 'semester', 'year', 'all_time'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Competitive ranking generated successfully'
  })
  @RequirePermissions(['analytics:read'])
  async generateCompetitiveRanking(
    @Param('entityType') entityType: 'student' | 'class' | 'organization',
    @Param('entityId') entityId: string,
    @Query('scope') scope: 'local' | 'regional' | 'national',
    @Query('timeframe') timeframe: 'week' | 'month' | 'semester' | 'year' | 'all_time',
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(`Generating competitive ranking for ${entityType} ${entityId}`);

    try {
      // Verify permissions
      if (entityType === 'student' && entityId !== currentUser.id && 
          !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only view your own competitive rankings',
          HttpStatus.FORBIDDEN
        );
      }

      const ranking = await this.benchmarkingService.generateCompetitiveRanking(
        entityType,
        entityId,
        scope,
        timeframe
      );

      return ranking;

    } catch (error) {
      this.logger.error(`Failed to generate competitive ranking for ${entityType} ${entityId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate competitive ranking',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate performance recommendations
   */
  @Post('recommendations')
  @ApiOperation({ 
    summary: 'Generate Performance Recommendations',
    description: 'Generate actionable recommendations based on performance analytics'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Performance recommendations generated successfully'
  })
  @RequirePermissions(['analytics:read'])
  async generateRecommendations(
    @Body() recommendationRequest: {
      targetType: 'individual' | 'class' | 'organizational';
      targetId: string;
      focusAreas?: string[];
      timeframe?: string;
    },
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(
      `Generating performance recommendations for ${recommendationRequest.targetType} ${recommendationRequest.targetId}`
    );

    try {
      // Verify permissions
      if (recommendationRequest.targetType === 'individual' && 
          recommendationRequest.targetId !== currentUser.id && 
          !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only get recommendations for your own performance',
          HttpStatus.FORBIDDEN
        );
      }

      // This would integrate with the performance analytics service
      // For now, return placeholder recommendations
      const recommendations = await this.performanceAnalyticsService.generatePerformanceRecommendations(
        recommendationRequest.targetType,
        recommendationRequest.targetId,
        {} // Performance data would be fetched here
      );

      return {
        targetType: recommendationRequest.targetType,
        targetId: recommendationRequest.targetId,
        recommendations,
        generatedAt: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error('Failed to generate performance recommendations', error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate performance recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Calculate improvement targets
   */
  @Post('improvement-targets')
  @ApiOperation({ 
    summary: 'Calculate Improvement Targets',
    description: 'Calculate realistic improvement targets based on benchmarks'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Improvement targets calculated successfully'
  })
  @RequirePermissions(['analytics:read'])
  async calculateImprovementTargets(
    @Body() targetRequest: {
      benchmarkResultIds: string[];
      timeframe: 'semester' | 'year' | 'multi_year';
      ambitionLevel: 'realistic' | 'aspirational' | 'stretch';
    },
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log('Calculating improvement targets');

    try {
      // This would fetch the actual benchmark results
      // For now, return placeholder targets
      const targets = await this.benchmarkingService.calculateImprovementTargets(
        [], // Would fetch actual benchmark results
        targetRequest.timeframe,
        targetRequest.ambitionLevel
      );

      return {
        ...targets,
        calculatedAt: new Date().toISOString(),
        parameters: {
          timeframe: targetRequest.timeframe,
          ambitionLevel: targetRequest.ambitionLevel,
        },
      };

    } catch (error) {
      this.logger.error('Failed to calculate improvement targets', error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to calculate improvement targets',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Export performance data
   */
  @Post('export')
  @ApiOperation({ 
    summary: 'Export Performance Data',
    description: 'Export performance analytics data in various formats'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Performance data export initiated successfully'
  })
  @RequirePermissions(['analytics:export'])
  async exportPerformanceData(
    @Body() exportRequest: {
      userId?: string;
      classId?: string;
      organizationId?: string;
      timeframe: 'week' | 'month' | 'semester' | 'year' | 'all_time';
      format: 'csv' | 'json' | 'xlsx';
      includeRawData?: boolean;
      anonymize?: boolean;
    },
    @GetUser() currentUser: any
  ): Promise<{
    exportId: string;
    downloadUrl: string;
    expiresAt: string;
    format: string;
  }> {
    this.logger.log('Exporting performance data');

    try {
      // Verify permissions
      if (exportRequest.userId && exportRequest.userId !== currentUser.id && 
          !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only export your own performance data',
          HttpStatus.FORBIDDEN
        );
      }

      const exportResult = await this.performanceAnalyticsService.exportPerformanceData({
        ...exportRequest,
        includeComparisons: false,
      });

      return {
        exportId: `export_${Date.now()}`,
        downloadUrl: `/api/downloads/${exportResult.filename}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        format: exportRequest.format,
      };

    } catch (error) {
      this.logger.error('Failed to export performance data', error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to export performance data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate benchmark visualization
   */
  @Get('visualization/benchmark/:benchmarkId')
  @ApiOperation({ 
    summary: 'Generate Benchmark Visualization',
    description: 'Generate visualization data for benchmark results'
  })
  @ApiParam({ name: 'benchmarkId', description: 'Benchmark result ID' })
  @ApiQuery({ name: 'chartType', enum: ['percentile_bands', 'growth_trajectory', 'competency_radar', 'ranking_history'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Benchmark visualization generated successfully'
  })
  @RequirePermissions(['analytics:read'])
  async generateBenchmarkVisualization(
    @Param('benchmarkId') benchmarkId: string,
    @Query('chartType') chartType: 'percentile_bands' | 'growth_trajectory' | 'competency_radar' | 'ranking_history',
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(`Generating ${chartType} visualization for benchmark ${benchmarkId}`);

    try {
      // This would fetch the actual benchmark result
      // For now, return placeholder visualization data
      const visualization = await this.benchmarkingService.generateBenchmarkVisualization(
        {} as any, // Would fetch actual benchmark result
        chartType
      );

      return visualization;

    } catch (error) {
      this.logger.error(`Failed to generate benchmark visualization for ${benchmarkId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate benchmark visualization',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
