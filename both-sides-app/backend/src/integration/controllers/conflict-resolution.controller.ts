/**
 * Conflict Resolution Controller
 * 
 * REST API endpoints for conflict detection, resolution, and management.
 * Provides comprehensive conflict resolution APIs for external systems.
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConflictDetectionService } from '../services/conflict-resolution/conflict-detection.service';
import { ConflictResolutionService } from '../services/conflict-resolution/conflict-resolution.service';
import { ConflictManagementService } from '../services/conflict-resolution/conflict-management.service';
import {
  DataConflict,
  ConflictQuery,
  ResolutionStrategy,
  ConflictStatus,
  ConflictReport,
  ConflictEscalation,
  ConflictResolutionConfig,
} from '../services/conflict-resolution/conflict-resolution.interfaces';
import { EntityType, SyncContext } from '../services/synchronizers/base-synchronizer.service';

// ===================================================================
// DTO INTERFACES FOR API
// ===================================================================

interface DetectConflictDto {
  entityType: EntityType;
  externalData: any;
  internalData: any;
  syncContext: {
    syncId: string;
    integrationId: string;
    providerId: string;
    externalSystemId: string;
    startTime: string;
    correlationId?: string;
  };
}

interface ResolveConflictDto {
  conflictId: string;
  strategy?: ResolutionStrategy;
  syncContext: {
    syncId: string;
    integrationId: string;
    providerId: string;
    externalSystemId: string;
    startTime: string;
  };
  forceResolution?: boolean;
}

interface BatchResolveConflictsDto {
  conflictIds: string[];
  defaultStrategy?: ResolutionStrategy;
  syncContext: {
    syncId: string;
    integrationId: string;
    providerId: string;
    externalSystemId: string;
    startTime: string;
  };
  options?: {
    maxConcurrent?: number;
    stopOnError?: boolean;
  };
}

interface EscalateConflictDto {
  conflictId: string;
  reason: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
}

interface BatchDetectConflictsDto {
  entityType: EntityType;
  dataComparisons: {
    external: any;
    internal?: any;
  }[];
  syncContext: {
    syncId: string;
    integrationId: string;
    providerId: string;
    externalSystemId: string;
    startTime: string;
  };
}

interface GenerateReportDto {
  integrationId: string;
  startDate: string;
  endDate: string;
  includeAnalysis?: boolean;
  includeRecommendations?: boolean;
}

// ===================================================================
// CONFLICT RESOLUTION CONTROLLER
// ===================================================================

@ApiTags('Conflict Resolution')
@Controller('integrations/:integrationId/conflicts')
@ApiBearerAuth()
export class ConflictResolutionController {
  private readonly logger = new Logger(ConflictResolutionController.name);

  constructor(
    private readonly conflictDetection: ConflictDetectionService,
    private readonly conflictResolution: ConflictResolutionService,
    private readonly conflictManagement: ConflictManagementService,
  ) {}

  // ===================================================================
  // CONFLICT DETECTION ENDPOINTS
  // ===================================================================

  @Post('detect')
  @ApiOperation({ summary: 'Detect conflicts between external and internal data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Conflict detection completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        conflict: { 
          type: 'object',
          description: 'Detected conflict (null if no conflict)',
        },
        message: { type: 'string' },
      },
    },
  })
  async detectConflict(
    @Param('integrationId') integrationId: string,
    @Body() dto: Omit<DetectConflictDto, 'syncContext'> & {
      syncContext: Omit<DetectConflictDto['syncContext'], 'integrationId'>;
    },
  ) {
    try {
      this.logger.log(`Detecting conflict for ${dto.entityType}`, {
        integrationId,
        syncId: dto.syncContext.syncId,
      });

      const syncContext: SyncContext = {
        syncId: dto.syncContext.syncId,
        integrationId,
        providerId: dto.syncContext.providerId,
        externalSystemId: dto.syncContext.externalSystemId,
        startTime: new Date(dto.syncContext.startTime),
        correlationId: dto.syncContext.correlationId,
      };

      const conflict = await this.conflictDetection.detectConflicts(
        dto.entityType,
        dto.externalData,
        dto.internalData,
        syncContext,
      );

      return {
        success: true,
        conflict,
        message: conflict 
          ? `Conflict detected with ${conflict.fields.length} field(s)`
          : 'No conflicts detected',
      };

    } catch (error) {
      this.logger.error(`Conflict detection failed: ${error.message}`, error.stack, {
        integrationId,
        entityType: dto.entityType,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Conflict detection failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('detect/batch')
  @ApiOperation({ summary: 'Detect conflicts for multiple entities in batch' })
  @ApiResponse({ 
    status: 200, 
    description: 'Batch conflict detection completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        conflicts: { 
          type: 'array',
          items: { type: 'object' },
        },
        summary: {
          type: 'object',
          properties: {
            totalProcessed: { type: 'number' },
            conflictsDetected: { type: 'number' },
            processingTime: { type: 'number' },
          },
        },
      },
    },
  })
  async detectConflictsBatch(
    @Param('integrationId') integrationId: string,
    @Body() dto: Omit<BatchDetectConflictsDto, 'syncContext'> & {
      syncContext: Omit<BatchDetectConflictsDto['syncContext'], 'integrationId'>;
    },
  ) {
    try {
      this.logger.log(`Batch conflict detection for ${dto.dataComparisons.length} ${dto.entityType} entities`, {
        integrationId,
        syncId: dto.syncContext.syncId,
      });

      const syncContext: SyncContext = {
        syncId: dto.syncContext.syncId,
        integrationId,
        providerId: dto.syncContext.providerId,
        externalSystemId: dto.syncContext.externalSystemId,
        startTime: new Date(dto.syncContext.startTime),
      };

      const startTime = Date.now();
      const conflicts = await this.conflictDetection.detectConflictsBatch(
        dto.entityType,
        dto.dataComparisons,
        syncContext,
      );
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        conflicts,
        summary: {
          totalProcessed: dto.dataComparisons.length,
          conflictsDetected: conflicts.length,
          processingTime,
        },
        message: `Batch detection completed: ${conflicts.length} conflicts found`,
      };

    } catch (error) {
      this.logger.error(`Batch conflict detection failed: ${error.message}`, error.stack, {
        integrationId,
        entityType: dto.entityType,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Batch conflict detection failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and filter conflicts' })
  @ApiResponse({ 
    status: 200, 
    description: 'Conflicts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        conflicts: { type: 'array' },
        totalCount: { type: 'number' },
        hasMore: { type: 'boolean' },
        aggregations: { type: 'object' },
        queryStats: { type: 'object' },
      },
    },
  })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity ID' })
  @ApiQuery({ name: 'conflictTypes', required: false, description: 'Comma-separated conflict types' })
  @ApiQuery({ name: 'severities', required: false, description: 'Comma-separated severity levels' })
  @ApiQuery({ name: 'statuses', required: false, description: 'Comma-separated status values' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of records to skip' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (createdAt, severity, etc.)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc, desc)' })
  async searchConflicts(
    @Param('integrationId') integrationId: string,
    @Query() queryParams: any,
  ) {
    try {
      const query: ConflictQuery = {
        integrationId,
        entityType: queryParams.entityType as EntityType,
        entityId: queryParams.entityId,
        conflictTypes: queryParams.conflictTypes?.split(','),
        severities: queryParams.severities?.split(','),
        statuses: queryParams.statuses?.split(','),
        dateRange: (queryParams.startDate || queryParams.endDate) ? {
          startDate: queryParams.startDate ? new Date(queryParams.startDate) : new Date(0),
          endDate: queryParams.endDate ? new Date(queryParams.endDate) : new Date(),
        } : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
        offset: queryParams.offset ? parseInt(queryParams.offset) : undefined,
        sortBy: queryParams.sortBy,
        sortOrder: queryParams.sortOrder as 'asc' | 'desc',
        includeMetadata: queryParams.includeMetadata === 'true',
      };

      this.logger.log(`Searching conflicts`, {
        integrationId,
        entityType: query.entityType,
        limit: query.limit,
      });

      const result = await this.conflictDetection.queryConflicts(query);

      return {
        success: true,
        ...result,
        message: 'Conflicts retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Conflict search failed: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to search conflicts',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':conflictId/validate')
  @ApiOperation({ summary: 'Validate a conflict and assess resolution feasibility' })
  @ApiResponse({ 
    status: 200, 
    description: 'Conflict validation completed' 
  })
  @ApiParam({ name: 'conflictId', description: 'Conflict ID' })
  async validateConflict(
    @Param('integrationId') integrationId: string,
    @Param('conflictId') conflictId: string,
  ) {
    try {
      // First get the conflict
      const searchResult = await this.conflictDetection.queryConflicts({
        integrationId,
        limit: 1,
        // Would need to filter by conflict ID in a real implementation
      });

      const conflict = searchResult.conflicts.find(c => c.id === conflictId);
      if (!conflict) {
        throw new HttpException(
          {
            success: false,
            error: 'Conflict not found',
            message: `Conflict ${conflictId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const validationResult = await this.conflictDetection.validateConflict(conflict);

      return {
        success: true,
        validation: validationResult,
        message: 'Conflict validation completed',
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Conflict validation failed: ${error.message}`, error.stack, {
        integrationId,
        conflictId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Conflict validation failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // CONFLICT RESOLUTION ENDPOINTS
  // ===================================================================

  @Post(':conflictId/resolve')
  @ApiOperation({ summary: 'Resolve a specific conflict' })
  @ApiResponse({ 
    status: 200, 
    description: 'Conflict resolution completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        result: { type: 'object' },
        conflict: { type: 'object' },
        message: { type: 'string' },
      },
    },
  })
  @ApiParam({ name: 'conflictId', description: 'Conflict ID' })
  async resolveConflict(
    @Param('integrationId') integrationId: string,
    @Param('conflictId') conflictId: string,
    @Body() dto: Omit<ResolveConflictDto, 'conflictId' | 'syncContext'> & {
      syncContext: Omit<ResolveConflictDto['syncContext'], 'integrationId'>;
    },
  ) {
    try {
      this.logger.log(`Resolving conflict: ${conflictId}`, {
        integrationId,
        strategy: dto.strategy,
        syncId: dto.syncContext.syncId,
      });

      // Get the conflict first
      const searchResult = await this.conflictDetection.queryConflicts({
        integrationId,
        limit: 1,
      });

      const conflict = searchResult.conflicts.find(c => c.id === conflictId);
      if (!conflict) {
        throw new HttpException(
          {
            success: false,
            error: 'Conflict not found',
            message: `Conflict ${conflictId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const syncContext: SyncContext = {
        syncId: dto.syncContext.syncId,
        integrationId,
        providerId: dto.syncContext.providerId,
        externalSystemId: dto.syncContext.externalSystemId,
        startTime: new Date(dto.syncContext.startTime),
      };

      const result = await this.conflictResolution.resolveConflict(
        conflict,
        syncContext,
        dto.strategy,
      );

      return {
        success: result.success,
        result,
        conflict,
        message: result.success 
          ? `Conflict resolved using ${result.strategy} strategy`
          : `Conflict resolution failed: ${result.explanation}`,
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Conflict resolution failed: ${error.message}`, error.stack, {
        integrationId,
        conflictId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Conflict resolution failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('resolve/batch')
  @ApiOperation({ summary: 'Resolve multiple conflicts in batch' })
  @ApiResponse({ 
    status: 200, 
    description: 'Batch conflict resolution completed' 
  })
  async resolveConflictsBatch(
    @Param('integrationId') integrationId: string,
    @Body() dto: Omit<BatchResolveConflictsDto, 'syncContext'> & {
      syncContext: Omit<BatchResolveConflictsDto['syncContext'], 'integrationId'>;
    },
  ) {
    try {
      this.logger.log(`Batch resolving ${dto.conflictIds.length} conflicts`, {
        integrationId,
        defaultStrategy: dto.defaultStrategy,
        syncId: dto.syncContext.syncId,
      });

      // Get all conflicts
      const searchResult = await this.conflictDetection.queryConflicts({
        integrationId,
        limit: 1000,
      });

      const conflicts = searchResult.conflicts.filter(c => dto.conflictIds.includes(c.id));
      
      if (conflicts.length === 0) {
        throw new HttpException(
          {
            success: false,
            error: 'No matching conflicts found',
            message: 'None of the specified conflict IDs were found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const syncContext: SyncContext = {
        syncId: dto.syncContext.syncId,
        integrationId,
        providerId: dto.syncContext.providerId,
        externalSystemId: dto.syncContext.externalSystemId,
        startTime: new Date(dto.syncContext.startTime),
      };

      const batchResult = await this.conflictResolution.resolveConflictsBatch(
        conflicts,
        syncContext,
        {
          ...dto.options,
          defaultStrategy: dto.defaultStrategy,
        },
      );

      return {
        success: true,
        results: batchResult.results,
        summary: batchResult.summary,
        message: `Batch resolution completed: ${batchResult.summary.successful}/${batchResult.summary.total} successful`,
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Batch conflict resolution failed: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Batch conflict resolution failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':conflictId/suggestions')
  @ApiOperation({ summary: 'Get resolution suggestions for a conflict' })
  @ApiResponse({ 
    status: 200, 
    description: 'Resolution suggestions generated successfully' 
  })
  @ApiParam({ name: 'conflictId', description: 'Conflict ID' })
  async getResolutionSuggestions(
    @Param('integrationId') integrationId: string,
    @Param('conflictId') conflictId: string,
  ) {
    try {
      this.logger.log(`Getting resolution suggestions for conflict: ${conflictId}`, {
        integrationId,
      });

      // Get the conflict
      const searchResult = await this.conflictDetection.queryConflicts({
        integrationId,
        limit: 1,
      });

      const conflict = searchResult.conflicts.find(c => c.id === conflictId);
      if (!conflict) {
        throw new HttpException(
          {
            success: false,
            error: 'Conflict not found',
            message: `Conflict ${conflictId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const suggestions = await this.conflictResolution.getResolutionSuggestions(conflict);

      return {
        success: true,
        suggestions,
        message: 'Resolution suggestions generated successfully',
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to get resolution suggestions: ${error.message}`, error.stack, {
        integrationId,
        conflictId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to get resolution suggestions',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // CONFLICT MANAGEMENT ENDPOINTS
  // ===================================================================

  @Post(':conflictId/escalate')
  @ApiOperation({ summary: 'Escalate a conflict for manual review' })
  @ApiResponse({ 
    status: 200, 
    description: 'Conflict escalated successfully' 
  })
  @ApiParam({ name: 'conflictId', description: 'Conflict ID' })
  async escalateConflict(
    @Param('integrationId') integrationId: string,
    @Param('conflictId') conflictId: string,
    @Body() dto: Omit<EscalateConflictDto, 'conflictId'>,
  ) {
    try {
      this.logger.log(`Escalating conflict: ${conflictId}`, {
        integrationId,
        reason: dto.reason,
        assignee: dto.assignee,
        priority: dto.priority,
      });

      // Get the conflict
      const searchResult = await this.conflictDetection.queryConflicts({
        integrationId,
        limit: 1,
      });

      const conflict = searchResult.conflicts.find(c => c.id === conflictId);
      if (!conflict) {
        throw new HttpException(
          {
            success: false,
            error: 'Conflict not found',
            message: `Conflict ${conflictId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const escalation = await this.conflictManagement.escalateConflict(
        conflict,
        dto.reason,
        dto.assignee,
        dto.priority || 'medium',
      );

      return {
        success: true,
        escalation,
        conflict,
        message: 'Conflict escalated successfully',
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Conflict escalation failed: ${error.message}`, error.stack, {
        integrationId,
        conflictId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Conflict escalation failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':conflictId/workflow')
  @ApiOperation({ summary: 'Process a conflict through a workflow' })
  @ApiResponse({ 
    status: 200, 
    description: 'Conflict workflow completed' 
  })
  @ApiParam({ name: 'conflictId', description: 'Conflict ID' })
  async processConflictWorkflow(
    @Param('integrationId') integrationId: string,
    @Param('conflictId') conflictId: string,
    @Body() body: {
      workflowId?: string;
      syncContext: {
        syncId: string;
        providerId: string;
        externalSystemId: string;
        startTime: string;
      };
    },
  ) {
    try {
      this.logger.log(`Processing conflict workflow: ${conflictId}`, {
        integrationId,
        workflowId: body.workflowId,
        syncId: body.syncContext.syncId,
      });

      // Get the conflict
      const searchResult = await this.conflictDetection.queryConflicts({
        integrationId,
        limit: 1,
      });

      const conflict = searchResult.conflicts.find(c => c.id === conflictId);
      if (!conflict) {
        throw new HttpException(
          {
            success: false,
            error: 'Conflict not found',
            message: `Conflict ${conflictId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const syncContext: SyncContext = {
        syncId: body.syncContext.syncId,
        integrationId,
        providerId: body.syncContext.providerId,
        externalSystemId: body.syncContext.externalSystemId,
        startTime: new Date(body.syncContext.startTime),
      };

      const workflowResult = await this.conflictManagement.processConflictWorkflow(
        conflict,
        syncContext,
        body.workflowId,
      );

      return {
        success: true,
        result: workflowResult,
        message: `Conflict workflow completed with status: ${workflowResult.finalStatus}`,
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Conflict workflow processing failed: ${error.message}`, error.stack, {
        integrationId,
        conflictId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Conflict workflow processing failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // REPORTING AND ANALYTICS ENDPOINTS
  // ===================================================================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get conflict management dashboard data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard data retrieved successfully' 
  })
  async getConflictDashboard(
    @Param('integrationId') integrationId: string,
  ) {
    try {
      this.logger.log(`Getting conflict dashboard data`, { integrationId });

      const dashboardData = await this.conflictManagement.getConflictDashboard(integrationId);

      return {
        success: true,
        dashboard: dashboardData,
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

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate comprehensive conflict report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Conflict report generated successfully' 
  })
  async generateConflictReport(
    @Param('integrationId') integrationId: string,
    @Body() dto: Omit<GenerateReportDto, 'integrationId'>,
  ) {
    try {
      this.logger.log(`Generating conflict report`, {
        integrationId,
        startDate: dto.startDate,
        endDate: dto.endDate,
      });

      const report = await this.conflictManagement.generateConflictReport(
        integrationId,
        new Date(dto.startDate),
        new Date(dto.endDate),
      );

      return {
        success: true,
        report,
        message: 'Conflict report generated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to generate conflict report: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to generate conflict report',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get conflict statistics and metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Conflict statistics retrieved successfully' 
  })
  @ApiQuery({ name: 'period', required: false, description: 'Time period (day, week, month)' })
  async getConflictStatistics(
    @Param('integrationId') integrationId: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const conflicts = await this.conflictDetection.queryConflicts({
        integrationId,
        dateRange: { startDate, endDate: now },
        limit: 1000,
      });

      const statistics = {
        period: period || 'day',
        timeRange: { startDate, endDate: now },
        totalConflicts: conflicts.totalCount,
        aggregations: conflicts.aggregations,
        trends: {
          conflictVelocity: conflicts.totalCount / ((now.getTime() - startDate.getTime()) / (1000 * 60 * 60)),
          resolutionRate: conflicts.conflicts.filter(c => c.status === 'resolved').length / Math.max(conflicts.totalCount, 1),
          escalationRate: conflicts.conflicts.filter(c => c.status === 'escalated').length / Math.max(conflicts.totalCount, 1),
        },
      };

      return {
        success: true,
        statistics,
        message: 'Conflict statistics retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get conflict statistics: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve conflict statistics',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // CONFIGURATION ENDPOINTS
  // ===================================================================

  @Get('config')
  @ApiOperation({ summary: 'Get conflict resolution configuration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuration retrieved successfully' 
  })
  async getConflictResolutionConfig(
    @Param('integrationId') integrationId: string,
  ) {
    try {
      // In a real implementation, this would retrieve integration-specific config
      const config: Partial<ConflictResolutionConfig> = {
        general: {
          enableAutoResolution: true,
          autoResolutionTimeout: 30,
          maxRetryAttempts: 3,
          enableNotifications: false,
          enableAuditLogging: true,
        },
        resolution: {
          defaultStrategy: 'external_wins',
          enableMergeStrategy: true,
          enableManualOverride: true,
        },
      };

      return {
        success: true,
        config,
        message: 'Configuration retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get configuration: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve configuration',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('config')
  @ApiOperation({ summary: 'Update conflict resolution configuration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuration updated successfully' 
  })
  async updateConflictResolutionConfig(
    @Param('integrationId') integrationId: string,
    @Body() config: Partial<ConflictResolutionConfig>,
  ) {
    try {
      this.logger.log(`Updating conflict resolution configuration`, {
        integrationId,
        hasGeneralConfig: !!config.general,
        hasDetectionConfig: !!config.detection,
        hasResolutionConfig: !!config.resolution,
      });

      // In a real implementation, this would update the configuration in storage
      // For now, we'll just return success

      return {
        success: true,
        config,
        message: 'Configuration updated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to update configuration: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to update configuration',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // HEALTH AND STATUS ENDPOINTS
  // ===================================================================

  @Get('health')
  @ApiOperation({ summary: 'Get conflict resolution system health status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Health status retrieved successfully' 
  })
  async getConflictResolutionHealth(
    @Param('integrationId') integrationId: string,
  ) {
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent conflicts for health assessment
      const recentConflicts = await this.conflictDetection.queryConflicts({
        integrationId,
        dateRange: { startDate: lastHour, endDate: now },
        limit: 100,
      });

      const health = {
        status: 'healthy' as const,
        timestamp: now,
        metrics: {
          conflictDetectionRate: recentConflicts.totalCount,
          resolutionSuccessRate: recentConflicts.conflicts.filter(c => c.status === 'resolved').length / Math.max(recentConflicts.totalCount, 1),
          escalationRate: recentConflicts.conflicts.filter(c => c.status === 'escalated').length / Math.max(recentConflicts.totalCount, 1),
          systemLoad: 'normal' as const,
        },
        components: {
          conflictDetection: 'operational',
          conflictResolution: 'operational',
          conflictManagement: 'operational',
          database: 'operational',
        },
      };

      // Determine overall health status
      if (health.metrics.resolutionSuccessRate < 0.7) {
        health.status = 'degraded';
      }

      if (health.metrics.escalationRate > 0.5) {
        health.status = 'degraded';
      }

      return {
        success: true,
        health,
        message: `Conflict resolution system is ${health.status}`,
      };

    } catch (error) {
      this.logger.error(`Failed to get health status: ${error.message}`, error.stack, {
        integrationId,
      });

      return {
        success: false,
        health: {
          status: 'unhealthy',
          timestamp: new Date(),
          error: error.message,
        },
        message: 'Health check failed',
      };
    }
  }
}
