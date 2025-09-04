/**
 * Phase 9 Task 9.2.1: External ID Mapping REST API Controller
 * 
 * This controller provides REST endpoints for managing external ID mappings,
 * including CRUD operations, bulk operations, validation, and statistics.
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
  HttpStatus,
  HttpException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { 
  ExternalIdMappingService, 
  IdMappingEntry, 
  BulkMappingResult,
  MappingValidation 
} from '../services/external-id-mapping.service';
import { SyncStatus } from '@prisma/client';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../auth/rbac/guards/roles.guard';
import { Roles } from '../../auth/rbac/decorators/roles.decorator';

/**
 * DTO for creating a single ID mapping
 */
export class CreateIdMappingDto {
  integrationId: string;
  entityType: string;
  externalId: string;
  internalId: string;
  syncStatus?: SyncStatus;
  syncVersion?: number;
  externalData?: Record<string, any>;
  internalData?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * DTO for bulk creating ID mappings
 */
export class BulkCreateIdMappingsDto {
  mappings: CreateIdMappingDto[];
}

/**
 * DTO for updating an ID mapping
 */
export class UpdateIdMappingDto {
  internalId?: string;
  syncStatus?: SyncStatus;
  syncVersion?: number;
  externalData?: Record<string, any>;
  internalData?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Query parameters for listing mappings
 */
export class ListMappingsQueryDto {
  limit?: number = 100;
  offset?: number = 0;
  syncStatus?: SyncStatus;
  includeData?: boolean = false;
  entityTypes?: string;
}

/**
 * External ID Mapping REST API Controller
 */
@ApiTags('Integration - ID Mappings')
@Controller('integrations/:integrationId/mappings')
@UseGuards(AuthGuard, RolesGuard)
export class ExternalIdMappingController {
  private readonly logger = new Logger(ExternalIdMappingController.name);

  constructor(private mappingService: ExternalIdMappingService) {}

  // ================================================================
  // SINGLE MAPPING OPERATIONS
  // ================================================================

  /**
   * Get external ID to internal ID mapping
   */
  @Get('external-to-internal/:entityType/:externalId')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Map external ID to internal ID' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiParam({ name: 'entityType', description: 'Entity type (user, class, etc.)' })
  @ApiParam({ name: 'externalId', description: 'External system ID' })
  @ApiResponse({ status: 200, description: 'Internal ID found' })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  async mapExternalToInternal(
    @Param('integrationId') integrationId: string,
    @Param('entityType') entityType: string,
    @Param('externalId') externalId: string
  ) {
    this.logger.log(`Mapping external to internal: ${entityType} ${externalId}`);
    
    const internalId = await this.mappingService.mapExternalToInternal(
      integrationId,
      entityType,
      externalId
    );
    
    if (!internalId) {
      throw new HttpException(
        `Mapping not found for external ID: ${externalId}`,
        HttpStatus.NOT_FOUND
      );
    }
    
    return {
      success: true,
      data: {
        integrationId,
        entityType,
        externalId,
        internalId,
      },
    };
  }

  /**
   * Get internal ID to external ID mapping
   */
  @Get('internal-to-external/:entityType/:internalId')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Map internal ID to external ID' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiParam({ name: 'entityType', description: 'Entity type (user, class, etc.)' })
  @ApiParam({ name: 'internalId', description: 'Internal system ID' })
  @ApiResponse({ status: 200, description: 'External ID found' })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  async mapInternalToExternal(
    @Param('integrationId') integrationId: string,
    @Param('entityType') entityType: string,
    @Param('internalId') internalId: string
  ) {
    this.logger.log(`Mapping internal to external: ${entityType} ${internalId}`);
    
    const externalId = await this.mappingService.mapInternalToExternal(
      integrationId,
      entityType,
      internalId
    );
    
    if (!externalId) {
      throw new HttpException(
        `Mapping not found for internal ID: ${internalId}`,
        HttpStatus.NOT_FOUND
      );
    }
    
    return {
      success: true,
      data: {
        integrationId,
        entityType,
        internalId,
        externalId,
      },
    };
  }

  /**
   * Get complete mapping information
   */
  @Get(':entityType/:externalId')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Get complete mapping information' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiParam({ name: 'entityType', description: 'Entity type (user, class, etc.)' })
  @ApiParam({ name: 'externalId', description: 'External system ID' })
  @ApiResponse({ status: 200, description: 'Mapping found' })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  async getMapping(
    @Param('integrationId') integrationId: string,
    @Param('entityType') entityType: string,
    @Param('externalId') externalId: string
  ) {
    const mapping = await this.mappingService.getMapping(
      integrationId,
      entityType,
      externalId
    );
    
    if (!mapping) {
      throw new HttpException(
        `Mapping not found for external ID: ${externalId}`,
        HttpStatus.NOT_FOUND
      );
    }
    
    return {
      success: true,
      data: mapping,
    };
  }

  /**
   * Create or update an ID mapping
   */
  @Put(':entityType/:externalId')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Create or update an ID mapping' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiParam({ name: 'entityType', description: 'Entity type (user, class, etc.)' })
  @ApiParam({ name: 'externalId', description: 'External system ID' })
  @ApiResponse({ status: 200, description: 'Mapping created/updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createOrUpdateMapping(
    @Param('integrationId') integrationId: string,
    @Param('entityType') entityType: string,
    @Param('externalId') externalId: string,
    @Body() dto: UpdateIdMappingDto
  ) {
    this.logger.log(`Creating/updating mapping: ${entityType} ${externalId}`);
    
    if (!dto.internalId) {
      throw new HttpException(
        'Internal ID is required',
        HttpStatus.BAD_REQUEST
      );
    }
    
    const mappingEntry: IdMappingEntry = {
      integrationId,
      entityType,
      externalId,
      internalId: dto.internalId,
      syncStatus: dto.syncStatus,
      syncVersion: dto.syncVersion,
      externalData: dto.externalData,
      internalData: dto.internalData,
      metadata: dto.metadata,
    };
    
    const mapping = await this.mappingService.createOrUpdateMapping(mappingEntry);
    
    return {
      success: true,
      data: mapping,
      message: 'Mapping created/updated successfully',
    };
  }

  /**
   * Delete an ID mapping
   */
  @Delete(':entityType/:externalId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete an ID mapping' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiParam({ name: 'entityType', description: 'Entity type (user, class, etc.)' })
  @ApiParam({ name: 'externalId', description: 'External system ID' })
  @ApiResponse({ status: 200, description: 'Mapping deleted successfully' })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  async deleteMapping(
    @Param('integrationId') integrationId: string,
    @Param('entityType') entityType: string,
    @Param('externalId') externalId: string
  ) {
    this.logger.log(`Deleting mapping: ${entityType} ${externalId}`);
    
    const success = await this.mappingService.deleteMapping(
      integrationId,
      entityType,
      externalId
    );
    
    if (!success) {
      throw new HttpException(
        `Mapping not found for external ID: ${externalId}`,
        HttpStatus.NOT_FOUND
      );
    }
    
    return {
      success: true,
      message: 'Mapping deleted successfully',
    };
  }

  // ================================================================
  // BULK OPERATIONS
  // ================================================================

  /**
   * Create multiple ID mappings in bulk
   */
  @Post('bulk')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Create multiple ID mappings in bulk' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async bulkCreateMappings(
    @Param('integrationId') integrationId: string,
    @Body() dto: BulkCreateIdMappingsDto
  ): Promise<{ success: boolean; data: BulkMappingResult; message: string }> {
    this.logger.log(`Bulk creating ${dto.mappings.length} mappings for integration ${integrationId}`);
    
    if (!dto.mappings || dto.mappings.length === 0) {
      throw new HttpException(
        'Mappings array is required and cannot be empty',
        HttpStatus.BAD_REQUEST
      );
    }
    
    // Validate that all mappings belong to the same integration
    const invalidMappings = dto.mappings.filter(m => m.integrationId !== integrationId);
    if (invalidMappings.length > 0) {
      throw new HttpException(
        'All mappings must belong to the specified integration',
        HttpStatus.BAD_REQUEST
      );
    }
    
    const result = await this.mappingService.bulkCreateMappings(
      dto.mappings.map(m => ({
        integrationId: m.integrationId,
        entityType: m.entityType,
        externalId: m.externalId,
        internalId: m.internalId,
        syncStatus: m.syncStatus,
        syncVersion: m.syncVersion,
        externalData: m.externalData,
        internalData: m.internalData,
        metadata: m.metadata,
      }))
    );
    
    return {
      success: result.success,
      data: result,
      message: `Bulk operation completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors`,
    };
  }

  // ================================================================
  // LISTING & QUERYING
  // ================================================================

  /**
   * Get mappings by entity type
   */
  @Get('by-entity-type/:entityType')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Get mappings by entity type with pagination' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiParam({ name: 'entityType', description: 'Entity type (user, class, etc.)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to return (default: 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip (default: 0)' })
  @ApiQuery({ name: 'syncStatus', required: false, enum: SyncStatus, description: 'Filter by sync status' })
  @ApiQuery({ name: 'includeData', required: false, type: Boolean, description: 'Include external/internal data (default: false)' })
  @ApiResponse({ status: 200, description: 'Mappings retrieved successfully' })
  async getMappingsByEntityType(
    @Param('integrationId') integrationId: string,
    @Param('entityType') entityType: string,
    @Query() query: ListMappingsQueryDto
  ) {
    const options = {
      limit: Math.min(Number(query.limit) || 100, 1000), // Cap at 1000
      offset: Number(query.offset) || 0,
      syncStatus: query.syncStatus,
      includeData: query.includeData === true || query.includeData === 'true',
    };
    
    const result = await this.mappingService.getMappingsByEntityType(
      integrationId,
      entityType,
      options
    );
    
    return {
      success: true,
      data: result.mappings,
      pagination: {
        total: result.total,
        limit: options.limit,
        offset: options.offset,
        hasMore: result.hasMore,
      },
    };
  }

  /**
   * Get all mappings for an integration
   */
  @Get()
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Get all mappings for an integration' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiQuery({ name: 'entityTypes', required: false, type: String, description: 'Comma-separated entity types to filter' })
  @ApiQuery({ name: 'syncStatus', required: false, enum: SyncStatus, description: 'Filter by sync status' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to return (default: 1000)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip (default: 0)' })
  @ApiResponse({ status: 200, description: 'Mappings retrieved successfully' })
  async getMappingsByIntegration(
    @Param('integrationId') integrationId: string,
    @Query() query: ListMappingsQueryDto
  ) {
    const options = {
      entityTypes: query.entityTypes ? query.entityTypes.split(',').map(t => t.trim()) : undefined,
      syncStatus: query.syncStatus,
      limit: Math.min(Number(query.limit) || 1000, 10000), // Cap at 10k
      offset: Number(query.offset) || 0,
    };
    
    const mappings = await this.mappingService.getMappingsByIntegration(
      integrationId,
      options
    );
    
    return {
      success: true,
      data: mappings,
      count: mappings.length,
    };
  }

  // ================================================================
  // VALIDATION & MAINTENANCE
  // ================================================================

  /**
   * Validate mapping integrity for an integration
   */
  @Post('validate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Validate mapping integrity for an integration' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Validation completed' })
  async validateMappingIntegrity(
    @Param('integrationId') integrationId: string
  ): Promise<{ success: boolean; data: MappingValidation; message: string }> {
    this.logger.log(`Validating mapping integrity for integration: ${integrationId}`);
    
    const validation = await this.mappingService.validateMappingIntegrity(integrationId);
    
    return {
      success: validation.isValid,
      data: validation,
      message: validation.isValid 
        ? 'Mapping integrity is valid' 
        : `Found ${validation.conflicts.length} integrity issues`,
    };
  }

  /**
   * Clean up orphaned mappings for an entity type
   */
  @Post('cleanup-orphaned/:entityType')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Clean up orphaned mappings for an entity type' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiParam({ name: 'entityType', description: 'Entity type to clean up' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupOrphanedMappings(
    @Param('integrationId') integrationId: string,
    @Param('entityType') entityType: string,
    @Body() body: { validInternalIds: string[] }
  ) {
    this.logger.log(`Cleaning up orphaned mappings for ${entityType} in integration ${integrationId}`);
    
    if (!body.validInternalIds || !Array.isArray(body.validInternalIds)) {
      throw new HttpException(
        'validInternalIds array is required',
        HttpStatus.BAD_REQUEST
      );
    }
    
    const cleanedCount = await this.mappingService.cleanupOrphanedMappings(
      integrationId,
      entityType,
      body.validInternalIds
    );
    
    return {
      success: true,
      data: {
        cleanedCount,
        entityType,
      },
      message: `Cleaned up ${cleanedCount} orphaned mappings`,
    };
  }

  /**
   * Clear mapping cache for an integration
   */
  @Post('cache/clear')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Clear mapping cache for an integration' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearMappingCache(
    @Param('integrationId') integrationId: string
  ) {
    this.logger.log(`Clearing mapping cache for integration: ${integrationId}`);
    
    await this.mappingService.clearMappingCache(integrationId);
    
    return {
      success: true,
      message: 'Mapping cache cleared successfully',
    };
  }

  // ================================================================
  // STATISTICS & MONITORING
  // ================================================================

  /**
   * Get mapping statistics for an integration
   */
  @Get('stats')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: 'Get mapping statistics for an integration' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getMappingStats(
    @Param('integrationId') integrationId: string
  ) {
    const stats = await this.mappingService.getMappingStats(integrationId);
    
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get service performance metrics
   */
  @Get('metrics/performance')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get service performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics() {
    const metrics = this.mappingService.getPerformanceMetrics();
    
    return {
      success: true,
      data: metrics,
    };
  }
}
