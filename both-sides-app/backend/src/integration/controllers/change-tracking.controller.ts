/**
 * Change Tracking Controller
 * 
 * REST API endpoints for change detection and tracking functionality.
 * Provides comprehensive change management APIs for external integrations.
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
import { ChangeTrackingService } from '../services/change-tracking/change-tracking.service';
import { ChangeDetectionService } from '../services/change-tracking/change-detection.service';
import { ChangeHistoryService } from '../services/change-tracking/change-history.service';
import {
  ChangeDetectionResult,
  ChangeHistoryQuery,
  ChangeSummary,
  ChangeAnalytics,
  IncrementalSyncPlan,
  ChangeTrackingReport,
} from '../services/change-tracking/change-detection.interfaces';
import { EntityType, SyncContext } from '../services/synchronizers/base-synchronizer.service';

// ===================================================================
// DTO INTERFACES FOR API
// ===================================================================

interface StartChangeTrackingDto {
  integrationId: string;
  entityTypes: EntityType[];
  syncContext: {
    syncId: string;
    providerId: string;
    syncType: 'full' | 'incremental' | 'manual';
  };
  config?: {
    enableAutoDetection?: boolean;
    detectionInterval?: number;
    incrementalSyncThreshold?: number;
    enableNotifications?: boolean;
  };
}

interface TrackChangesDto {
  sessionId: string;
  entityData: {
    entityType: EntityType;
    currentData: any[];
  }[];
  syncContext: {
    syncId: string;
    integrationId: string;
    externalSystemId: string;
    startTime: string; // ISO date string
    providerId: string;
  };
}

interface QueryChangeHistoryDto {
  integrationId?: string;
  entityType?: EntityType;
  entityId?: string;
  changeTypes?: string[];
  significance?: string[];
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  limit?: number;
  offset?: number;
  includeMetadata?: boolean;
  includeFieldChanges?: boolean;
}

interface ExecuteIncrementalSyncDto {
  syncContext: {
    syncId: string;
    integrationId: string;
    externalSystemId: string;
    startTime: string; // ISO date string
    providerId: string;
  };
}

interface GenerateReportDto {
  integrationId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

// ===================================================================
// CHANGE TRACKING CONTROLLER
// ===================================================================

@ApiTags('Change Tracking')
@Controller('integrations/:integrationId/change-tracking')
@ApiBearerAuth()
export class ChangeTrackingController {
  private readonly logger = new Logger(ChangeTrackingController.name);

  constructor(
    private readonly changeTrackingService: ChangeTrackingService,
    private readonly changeDetectionService: ChangeDetectionService,
    private readonly changeHistoryService: ChangeHistoryService,
  ) {}

  // ===================================================================
  // CHANGE TRACKING SESSION ENDPOINTS
  // ===================================================================

  @Post('sessions')
  @ApiOperation({ summary: 'Start a new change tracking session' })
  @ApiResponse({ 
    status: 201, 
    description: 'Change tracking session started successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        session: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            integrationId: { type: 'string' },
            entityTypes: { type: 'array', items: { type: 'string' } },
            startTime: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['active', 'completed', 'failed', 'cancelled'] },
          },
        },
      },
    },
  })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  async startChangeTrackingSession(
    @Param('integrationId') integrationId: string,
    @Body() dto: Omit<StartChangeTrackingDto, 'integrationId'>,
  ) {
    try {
      this.logger.log(`Starting change tracking session for integration: ${integrationId}`, {
        entityTypes: dto.entityTypes,
        syncId: dto.syncContext.syncId,
      });

      const syncContext: SyncContext = {
        syncId: dto.syncContext.syncId,
        integrationId,
        externalSystemId: dto.syncContext.providerId,
        startTime: new Date(),
      };

      const session = await this.changeTrackingService.startChangeTrackingSession(
        integrationId,
        dto.entityTypes,
        syncContext,
        dto.config,
      );

      return {
        success: true,
        session,
        message: 'Change tracking session started successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to start change tracking session: ${error.message}`, error.stack, {
        integrationId,
        syncId: dto.syncContext?.syncId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to start change tracking session',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sessions/track-changes')
  @ApiOperation({ summary: 'Track changes for entities in a session' })
  @ApiResponse({ 
    status: 200, 
    description: 'Changes tracked successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        session: { type: 'object' },
        detectionResults: { type: 'array' },
        incrementalSyncPlans: { type: 'array' },
      },
    },
  })
  async trackChangesForEntities(
    @Param('integrationId') integrationId: string,
    @Body() dto: TrackChangesDto,
  ) {
    try {
      this.logger.log(`Tracking changes for session: ${dto.sessionId}`, {
        integrationId,
        entityTypes: dto.entityData.map(e => e.entityType),
        syncId: dto.syncContext.syncId,
      });

      const syncContext: SyncContext = {
        syncId: dto.syncContext.syncId,
        integrationId: dto.syncContext.integrationId,
        externalSystemId: dto.syncContext.externalSystemId,
        startTime: new Date(dto.syncContext.startTime),
      };

      const result = await this.changeTrackingService.trackChangesForEntities(
        dto.sessionId,
        dto.entityData,
        syncContext,
      );

      return {
        success: true,
        ...result,
        message: 'Changes tracked successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to track changes: ${error.message}`, error.stack, {
        integrationId,
        sessionId: dto.sessionId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to track changes',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('sessions/:sessionId/complete')
  @ApiOperation({ summary: 'Complete a change tracking session' })
  @ApiResponse({ 
    status: 200, 
    description: 'Change tracking session completed successfully' 
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async completeChangeTrackingSession(
    @Param('integrationId') integrationId: string,
    @Param('sessionId') sessionId: string,
  ) {
    try {
      this.logger.log(`Completing change tracking session: ${sessionId}`, {
        integrationId,
      });

      const session = await this.changeTrackingService.completeChangeTrackingSession(sessionId);

      return {
        success: true,
        session,
        message: 'Change tracking session completed successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to complete change tracking session: ${error.message}`, error.stack, {
        integrationId,
        sessionId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to complete change tracking session',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // CHANGE DETECTION ENDPOINTS
  // ===================================================================

  @Post('detect/:entityType')
  @ApiOperation({ summary: 'Detect changes for a specific entity type' })
  @ApiResponse({ 
    status: 200, 
    description: 'Change detection completed',
    type: Object,
  })
  @ApiParam({ name: 'entityType', description: 'Entity type (user, class, organization, enrollment)' })
  async detectEntityChanges(
    @Param('integrationId') integrationId: string,
    @Param('entityType') entityType: EntityType,
    @Body() body: {
      currentData: any[];
      syncContext: {
        syncId: string;
        providerId: string;
        syncType: 'full' | 'incremental' | 'manual';
      };
    },
  ) {
    try {
      this.logger.log(`Detecting changes for ${body.currentData.length} ${entityType} entities`, {
        integrationId,
        syncId: body.syncContext.syncId,
      });

      const result = await this.changeDetectionService.detectEntityChanges(
        entityType,
        body.currentData,
        integrationId,
        body.syncContext,
      );

      return {
        success: true,
        result,
        message: `Change detection completed for ${entityType}`,
      };

    } catch (error) {
      this.logger.error(`Change detection failed: ${error.message}`, error.stack, {
        integrationId,
        entityType,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Change detection failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('calculate-delta/:entityType')
  @ApiOperation({ summary: 'Calculate delta between two entity states' })
  @ApiResponse({ 
    status: 200, 
    description: 'Delta calculation completed' 
  })
  @ApiParam({ name: 'entityType', description: 'Entity type' })
  async calculateEntityDelta(
    @Param('integrationId') integrationId: string,
    @Param('entityType') entityType: EntityType,
    @Body() body: {
      previousData: any[];
      currentData: any[];
      options?: {
        includeUnchanged?: boolean;
        significanceThreshold?: number;
        ignoreFields?: string[];
        deepComparison?: boolean;
        normalizeValues?: boolean;
      };
    },
  ) {
    try {
      this.logger.log(`Calculating batch delta for ${entityType}`, {
        integrationId,
        previousCount: body.previousData.length,
        currentCount: body.currentData.length,
      });

      const delta = await this.changeDetectionService.calculateBatchDelta(
        entityType,
        body.previousData,
        body.currentData,
        body.options,
      );

      return {
        success: true,
        delta,
        message: `Delta calculation completed for ${entityType}`,
      };

    } catch (error) {
      this.logger.error(`Delta calculation failed: ${error.message}`, error.stack, {
        integrationId,
        entityType,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Delta calculation failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // CHANGE HISTORY ENDPOINTS
  // ===================================================================

  @Get('history')
  @ApiOperation({ summary: 'Query change history with filters' })
  @ApiResponse({ 
    status: 200, 
    description: 'Change history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        changes: { type: 'array' },
        totalCount: { type: 'number' },
        hasMore: { type: 'boolean' },
        queryStats: { type: 'object' },
      },
    },
  })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity ID' })
  @ApiQuery({ name: 'changeTypes', required: false, description: 'Comma-separated change types' })
  @ApiQuery({ name: 'significance', required: false, description: 'Comma-separated significance levels' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of records to skip' })
  async queryChangeHistory(
    @Param('integrationId') integrationId: string,
    @Query() queryParams: any,
  ) {
    try {
      const query: ChangeHistoryQuery = {
        integrationId,
        entityType: queryParams.entityType,
        entityId: queryParams.entityId,
        changeTypes: queryParams.changeTypes?.split(','),
        significance: queryParams.significance?.split(','),
        dateRange: (queryParams.startDate || queryParams.endDate) ? {
          startDate: queryParams.startDate ? new Date(queryParams.startDate) : new Date(0),
          endDate: queryParams.endDate ? new Date(queryParams.endDate) : new Date(),
        } : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
        offset: queryParams.offset ? parseInt(queryParams.offset) : undefined,
        includeMetadata: queryParams.includeMetadata === 'true',
        includeFieldChanges: queryParams.includeFieldChanges === 'true',
      };

      this.logger.log(`Querying change history`, {
        integrationId,
        entityType: query.entityType,
        dateRange: query.dateRange,
        limit: query.limit,
      });

      const result = await this.changeHistoryService.queryChangeHistory(query);

      return {
        success: true,
        ...result,
        message: 'Change history retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Change history query failed: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve change history',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get change summary statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Change summary retrieved successfully' 
  })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  async getChangeSummary(
    @Param('integrationId') integrationId: string,
    @Query('entityType') entityType?: EntityType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      this.logger.log(`Getting change summary`, {
        integrationId,
        entityType,
        startDate,
        endDate,
      });

      const summary = await this.changeDetectionService.getChangeSummary(
        integrationId,
        entityType,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );

      return {
        success: true,
        summary,
        message: 'Change summary retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get change summary: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve change summary',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // ANALYTICS AND REPORTING ENDPOINTS
  // ===================================================================

  @Get('analytics')
  @ApiOperation({ summary: 'Get change analytics and insights' })
  @ApiResponse({ 
    status: 200, 
    description: 'Change analytics retrieved successfully' 
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO string)' })
  async getChangeAnalytics(
    @Param('integrationId') integrationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      this.logger.log(`Generating change analytics`, {
        integrationId,
        startDate,
        endDate,
      });

      const analytics = await this.changeTrackingService.generateChangeAnalytics(
        integrationId,
        new Date(startDate),
        new Date(endDate),
      );

      return {
        success: true,
        analytics,
        message: 'Change analytics generated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to generate change analytics: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to generate change analytics',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate comprehensive change tracking report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Change tracking report generated successfully' 
  })
  async generateChangeTrackingReport(
    @Param('integrationId') integrationId: string,
    @Body() dto: Omit<GenerateReportDto, 'integrationId'>,
  ) {
    try {
      this.logger.log(`Generating change tracking report`, {
        integrationId,
        startDate: dto.startDate,
        endDate: dto.endDate,
      });

      const report = await this.changeTrackingService.generateChangeTrackingReport(
        integrationId,
        new Date(dto.startDate),
        new Date(dto.endDate),
      );

      return {
        success: true,
        report,
        message: 'Change tracking report generated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to generate change tracking report: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to generate change tracking report',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // INCREMENTAL SYNC ENDPOINTS
  // ===================================================================

  @Get('incremental-sync/plans')
  @ApiOperation({ summary: 'Get available incremental sync plans' })
  @ApiResponse({ 
    status: 200, 
    description: 'Incremental sync plans retrieved successfully' 
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO string)' })
  async getIncrementalSyncPlans(
    @Param('integrationId') integrationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      this.logger.log(`Getting incremental sync plans`, {
        integrationId,
        startDate,
        endDate,
      });

      // This would call a method to get incremental sync plans
      // For now, return empty array
      const plans: IncrementalSyncPlan[] = [];

      return {
        success: true,
        plans,
        message: 'Incremental sync plans retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get incremental sync plans: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve incremental sync plans',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('incremental-sync/execute')
  @ApiOperation({ summary: 'Execute an incremental sync plan' })
  @ApiResponse({ 
    status: 200, 
    description: 'Incremental sync executed successfully' 
  })
  async executeIncrementalSync(
    @Param('integrationId') integrationId: string,
    @Body() body: {
      syncPlan: IncrementalSyncPlan;
      syncContext: ExecuteIncrementalSyncDto['syncContext'];
    },
  ) {
    try {
      this.logger.log(`Executing incremental sync plan`, {
        integrationId,
        entityType: body.syncPlan.entityType,
        entityCount: body.syncPlan.entitiesToSync.length,
      });

      const syncContext: SyncContext = {
        syncId: body.syncContext.syncId,
        integrationId: body.syncContext.integrationId,
        externalSystemId: body.syncContext.externalSystemId,
        startTime: new Date(body.syncContext.startTime),
      };

      const result = await this.changeTrackingService.executeIncrementalSync(
        body.syncPlan,
        syncContext,
      );

      return {
        success: result.success,
        result,
        message: result.success 
          ? 'Incremental sync completed successfully' 
          : 'Incremental sync completed with errors',
      };

    } catch (error) {
      this.logger.error(`Incremental sync execution failed: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to execute incremental sync',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===================================================================
  // SYSTEM STATUS ENDPOINTS
  // ===================================================================

  @Get('status')
  @ApiOperation({ summary: 'Get change tracking system status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Change tracking status retrieved successfully' 
  })
  async getChangeTrackingStatus(
    @Param('integrationId') integrationId: string,
  ) {
    try {
      const stats = await this.changeHistoryService.getChangeHistoryStats();

      return {
        success: true,
        status: {
          integrationId,
          historyStats: stats,
          systemHealth: 'healthy', // Would implement actual health check
          lastCleanup: new Date(), // Would track actual cleanup times
        },
        message: 'Change tracking status retrieved successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to get change tracking status: ${error.message}`, error.stack, {
        integrationId,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to retrieve change tracking status',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('maintenance/cleanup')
  @ApiOperation({ summary: 'Trigger change history cleanup' })
  @ApiResponse({ 
    status: 200, 
    description: 'Change history cleanup completed' 
  })
  async triggerCleanup(
    @Param('integrationId') integrationId: string,
    @Body() body: {
      type: 'retention' | 'compression' | 'optimization';
    },
  ) {
    try {
      this.logger.log(`Triggering change history cleanup: ${body.type}`, {
        integrationId,
      });

      let result;
      switch (body.type) {
        case 'retention':
          result = await this.changeHistoryService.performRetentionCleanup();
          break;
        case 'compression':
          result = await this.changeHistoryService.compressOldRecords();
          break;
        case 'optimization':
          result = await this.changeHistoryService.optimizeIndexes();
          break;
        default:
          throw new Error(`Unknown cleanup type: ${body.type}`);
      }

      return {
        success: result.errors.length === 0,
        result,
        message: `Change history ${body.type} cleanup completed`,
      };

    } catch (error) {
      this.logger.error(`Change history cleanup failed: ${error.message}`, error.stack, {
        integrationId,
        type: body.type,
      });

      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: 'Failed to perform change history cleanup',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
