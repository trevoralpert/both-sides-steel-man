/**
 * Plasticity Measurement Controller
 * 
 * Task 7.4.1: REST API endpoints for Opinion Plasticity Measurement System
 * 
 * Provides endpoints for measuring, tracking, and analyzing opinion plasticity
 * across debates and time periods.
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

import { PlasticityMeasurementService } from '../services/plasticity-measurement.service';
import {
  PlasticityMeasurementRequestDto,
  PlasticityMeasurementDto,
  LongitudinalPlasticityRequestDto,
  LongitudinalPlasticityDataDto,
  ComparativePlasticityRequestDto,
  ComparativePlasticityReportDto,
  PlasticityVisualizationRequestDto
} from '../dto/plasticity-measurement.dto';

@ApiTags('Plasticity Measurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RBACGuard)
@Controller('plasticity-measurement')
export class PlasticityMeasurementController {
  private readonly logger = new Logger(PlasticityMeasurementController.name);

  constructor(
    private readonly plasticityMeasurementService: PlasticityMeasurementService
  ) {}

  /**
   * Measure opinion plasticity for a specific debate
   */
  @Post('measure')
  @ApiOperation({ 
    summary: 'Measure Opinion Plasticity',
    description: 'Analyze opinion plasticity by comparing pre and post-debate positions'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Plasticity measurement completed successfully',
    type: PlasticityMeasurementDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request parameters' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Insufficient permissions' 
  })
  @RequirePermissions(['reflection:read', 'analytics:create'])
  async measurePlasticity(
    @Body() measurementRequest: PlasticityMeasurementRequestDto,
    @GetUser() currentUser: any
  ): Promise<PlasticityMeasurementDto> {
    this.logger.log(
      `Measuring plasticity for user ${measurementRequest.userId}, debate ${measurementRequest.debateId}`
    );

    try {
      // Verify permissions - users can only measure their own plasticity unless they're a teacher/admin
      if (measurementRequest.userId !== currentUser.id && 
          !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only measure your own plasticity',
          HttpStatus.FORBIDDEN
        );
      }

      const measurement = await this.plasticityMeasurementService.measureOpinionPlasticity({
        userId: measurementRequest.userId,
        debateId: measurementRequest.debateId,
        preDebatePositions: measurementRequest.preDebatePositions?.map(pos => ({
          ...pos,
          timestamp: new Date(pos.timestamp)
        })),
        postDebatePositions: measurementRequest.postDebatePositions.map(pos => ({
          ...pos,
          timestamp: new Date(pos.timestamp)
        })),
        reflectionData: measurementRequest.reflectionData,
        contextualFactors: measurementRequest.contextualFactors
      });

      return this.transformMeasurementToDto(measurement);

    } catch (error) {
      this.logger.error(
        `Failed to measure plasticity for user ${measurementRequest.userId}`,
        error.stack
      );
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to measure opinion plasticity',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get longitudinal plasticity analysis for a user
   */
  @Get('longitudinal/:userId')
  @ApiOperation({ 
    summary: 'Get Longitudinal Plasticity Profile',
    description: 'Analyze plasticity trends over time for a specific user'
  })
  @ApiParam({ name: 'userId', description: 'User ID to analyze' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'End date (ISO string)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Longitudinal plasticity data retrieved successfully',
    type: LongitudinalPlasticityDataDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Insufficient permissions' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found or insufficient data' 
  })
  @RequirePermissions(['analytics:read'])
  async getLongitudinalPlasticity(
    @Param('userId') userId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @GetUser() currentUser: any
  ): Promise<LongitudinalPlasticityDataDto> {
    this.logger.log(`Getting longitudinal plasticity for user ${userId}`);

    try {
      // Verify permissions
      if (userId !== currentUser.id && !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only view your own plasticity data',
          HttpStatus.FORBIDDEN
        );
      }

      const timeRange = (fromDate && toDate) ? {
        from: new Date(fromDate),
        to: new Date(toDate)
      } : undefined;

      const longitudinalData = await this.plasticityMeasurementService.buildLongitudinalPlasticityProfile(
        userId,
        timeRange
      );

      return this.transformLongitudinalDataToDto(longitudinalData);

    } catch (error) {
      this.logger.error(`Failed to get longitudinal plasticity for user ${userId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      if (error.message.includes('Insufficient historical data')) {
        throw new HttpException(
          'Not enough historical data for longitudinal analysis',
          HttpStatus.NOT_FOUND
        );
      }
      
      throw new HttpException(
        'Failed to retrieve longitudinal plasticity data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate comparative plasticity report for multiple users
   */
  @Post('comparative-report')
  @ApiOperation({ 
    summary: 'Generate Comparative Plasticity Report',
    description: 'Compare plasticity metrics across multiple users'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Comparative report generated successfully',
    type: ComparativePlasticityReportDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Insufficient permissions - requires teacher or admin role' 
  })
  @RequirePermissions(['analytics:read', 'class:manage'])
  async generateComparativeReport(
    @Body() reportRequest: ComparativePlasticityRequestDto,
    @GetUser() currentUser: any
  ): Promise<ComparativePlasticityReportDto> {
    this.logger.log(`Generating comparative plasticity report for ${reportRequest.userIds.length} users`);

    try {
      // Only teachers and admins can generate comparative reports
      if (!['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'Only teachers and administrators can generate comparative reports',
          HttpStatus.FORBIDDEN
        );
      }

      const report = await this.plasticityMeasurementService.generateComparativePlasticityReport(
        reportRequest.userIds,
        reportRequest.classId,
        reportRequest.topicCategory
      );

      return report;

    } catch (error) {
      this.logger.error('Failed to generate comparative plasticity report', error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate comparative report',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get plasticity measurement by ID
   */
  @Get('measurement/:measurementId')
  @ApiOperation({ 
    summary: 'Get Plasticity Measurement',
    description: 'Retrieve a specific plasticity measurement by ID'
  })
  @ApiParam({ name: 'measurementId', description: 'Measurement ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Measurement retrieved successfully',
    type: PlasticityMeasurementDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Measurement not found' 
  })
  @RequirePermissions(['analytics:read'])
  async getMeasurement(
    @Param('measurementId') measurementId: string,
    @GetUser() currentUser: any
  ): Promise<PlasticityMeasurementDto> {
    this.logger.log(`Retrieving plasticity measurement ${measurementId}`);

    try {
      // This would retrieve a specific measurement from the database
      // For now, we'll implement a placeholder
      throw new HttpException(
        'Measurement retrieval not yet implemented',
        HttpStatus.NOT_IMPLEMENTED
      );

    } catch (error) {
      this.logger.error(`Failed to retrieve measurement ${measurementId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve measurement',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get all plasticity measurements for a user
   */
  @Get('user/:userId/measurements')
  @ApiOperation({ 
    summary: 'Get User Plasticity Measurements',
    description: 'Retrieve all plasticity measurements for a specific user'
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of measurements to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of measurements to skip' })
  @ApiResponse({ 
    status: 200, 
    description: 'Measurements retrieved successfully',
    type: [PlasticityMeasurementDto]
  })
  @RequirePermissions(['analytics:read'])
  async getUserMeasurements(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @GetUser() currentUser: any
  ): Promise<PlasticityMeasurementDto[]> {
    this.logger.log(`Retrieving plasticity measurements for user ${userId}`);

    try {
      // Verify permissions
      if (userId !== currentUser.id && !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only view your own measurements',
          HttpStatus.FORBIDDEN
        );
      }

      // This would retrieve measurements from the database with pagination
      // For now, we'll implement a placeholder
      return [];

    } catch (error) {
      this.logger.error(`Failed to retrieve measurements for user ${userId}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve user measurements',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get plasticity summary statistics
   */
  @Get('summary')
  @ApiOperation({ 
    summary: 'Get Plasticity Summary Statistics',
    description: 'Get aggregate statistics about plasticity measurements'
  })
  @ApiQuery({ name: 'classId', required: false, description: 'Filter by class ID' })
  @ApiQuery({ name: 'topicCategory', required: false, description: 'Filter by topic category' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Time frame (week, month, semester)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Summary statistics retrieved successfully'
  })
  @RequirePermissions(['analytics:read'])
  async getPlasticitySummary(
    @Query('classId') classId?: string,
    @Query('topicCategory') topicCategory?: string,
    @Query('timeframe') timeframe?: string,
    @GetUser() currentUser: any
  ): Promise<{
    totalMeasurements: number;
    averagePlasticity: number;
    plasticityDistribution: Record<string, number>;
    topCategories: Array<{ category: string; averagePlasticity: number }>;
    timeframeSummary?: any;
  }> {
    this.logger.log(`Retrieving plasticity summary statistics`);

    try {
      // Only teachers and admins can view aggregate statistics
      if (!['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'Only teachers and administrators can view summary statistics',
          HttpStatus.FORBIDDEN
        );
      }

      // This would calculate summary statistics from the database
      // For now, we'll return placeholder data
      return {
        totalMeasurements: 0,
        averagePlasticity: 0,
        plasticityDistribution: {},
        topCategories: [],
      };

    } catch (error) {
      this.logger.error('Failed to retrieve plasticity summary', error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve summary statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Request plasticity visualization data
   */
  @Post('visualization')
  @ApiOperation({ 
    summary: 'Generate Plasticity Visualization Data',
    description: 'Generate data for various plasticity visualizations'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Visualization data generated successfully'
  })
  @RequirePermissions(['analytics:read'])
  async generateVisualizationData(
    @Body() visualizationRequest: PlasticityVisualizationRequestDto,
    @GetUser() currentUser: any
  ): Promise<any> {
    this.logger.log(`Generating ${visualizationRequest.visualizationType} visualization`);

    try {
      // Verify permissions based on visualization type
      if (visualizationRequest.userId && 
          visualizationRequest.userId !== currentUser.id && 
          !['TEACHER', 'ADMIN'].includes(currentUser.role)) {
        throw new HttpException(
          'You can only generate visualizations for your own data',
          HttpStatus.FORBIDDEN
        );
      }

      // This would generate visualization data based on the request type
      // For now, we'll return placeholder data
      return {
        visualizationType: visualizationRequest.visualizationType,
        data: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          userId: visualizationRequest.userId,
          classId: visualizationRequest.classId,
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate visualization data', error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate visualization data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Private helper methods

  private transformMeasurementToDto(measurement: any): PlasticityMeasurementDto {
    return {
      userId: measurement.userId,
      debateId: measurement.debateId,
      measurementId: measurement.measurementId,
      timestamp: measurement.timestamp.toISOString(),
      overallPlasticityScore: measurement.overallPlasticityScore,
      positionChanges: measurement.positionChanges,
      movementPattern: measurement.movementPattern,
      averageMagnitude: measurement.averageMagnitude,
      maxMagnitude: measurement.maxMagnitude,
      confidenceChange: measurement.confidenceChange,
      confidencePattern: measurement.confidencePattern,
      contextualPlasticity: measurement.contextualPlasticity,
      longitudinalMetrics: measurement.longitudinalMetrics,
      reliability: measurement.reliability,
      dataQuality: measurement.dataQuality,
      insights: measurement.insights,
    };
  }

  private transformLongitudinalDataToDto(longitudinalData: any): LongitudinalPlasticityDataDto {
    return {
      userId: longitudinalData.userId,
      measurements: longitudinalData.measurements.map((m: any) => this.transformMeasurementToDto(m)),
      trends: {
        overallTrend: longitudinalData.trends.overallTrend,
        categoryTrends: longitudinalData.trends.categoryTrends,
        timePatterns: longitudinalData.trends.timePatterns,
      },
      predictions: longitudinalData.predictions,
    };
  }
}
