/**
 * Cache Management Controller
 * 
 * REST API endpoints for comprehensive cache management including cache operations,
 * performance monitoring, optimization control, and administrative functions.
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { 
  IntelligentCacheService, 
  CacheLevel, 
  CachePattern, 
  CacheStats, 
  CacheMetrics 
} from '../services/caching/intelligent-cache.service';
import { 
  CachePerformanceService, 
  CachePerformanceMetrics, 
  CacheOptimizationReport, 
  CacheBenchmark 
} from '../services/caching/cache-performance.service';
import { 
  ResponseOptimizationService, 
  OptimizationConfig, 
  OptimizationMetrics, 
  OptimizationRecommendation 
} from '../services/caching/response-optimization.service';

// ===================================================================
// DTO CLASSES FOR REQUEST/RESPONSE
// ===================================================================

export class CacheEntryDto {
  key: string;
  value: any;
  ttl?: number;
  tags?: string[];
  priority?: number;
  compression?: boolean;
}

export class CachePatternDto {
  pattern: string;
  type: 'prefix' | 'suffix' | 'contains' | 'regex';
  ttl?: number;
  priority?: number;
  tags?: string[];
  compression?: boolean;
  strategy?: string;
}

export class CacheBatchDto {
  entries: Array<{
    key: string;
    value: any;
    ttl?: number;
    tags?: string[];
    priority?: number;
  }>;
}

export class CacheInvalidationDto {
  strategy: 'tags' | 'pattern' | 'keys';
  targets: string[];
  patternType?: 'prefix' | 'suffix' | 'contains' | 'regex';
}

export class CacheWarmupDto {
  entries: Array<{
    key: string;
    dataFetcher: string; // Function name or endpoint
    ttl?: number;
    tags?: string[];
  }>;
}

export class BenchmarkConfigDto {
  name: string;
  operationType: 'mixed' | 'read_heavy' | 'write_heavy';
  keyCount: number;
  valueSize: number;
  duration: number;
  concurrency?: number;
  baseline?: string;
}

export class OptimizationRequestDto {
  data: any;
  compression?: {
    algorithm?: 'gzip' | 'deflate' | 'br' | 'none';
    level?: number;
  };
  transformation?: {
    minify?: boolean;
    removeNulls?: boolean;
    camelCase?: boolean;
    fieldFilter?: string[];
  };
  batching?: {
    priority?: number;
    timeout?: number;
  };
  mimeType?: string;
  cacheKey?: string;
}

// ===================================================================
// CACHE MANAGEMENT CONTROLLER
// ===================================================================

@ApiTags('Cache Management')
@Controller('cache-management')
export class CacheManagementController {
  private readonly logger = new Logger(CacheManagementController.name);

  constructor(
    private readonly cacheService: IntelligentCacheService,
    private readonly performanceService: CachePerformanceService,
    private readonly optimizationService: ResponseOptimizationService,
  ) {}

  // ===================================================================
  // CACHE OPERATIONS ENDPOINTS
  // ===================================================================

  @Get('cache/:key')
  @ApiOperation({ summary: 'Get cache entry by key' })
  @ApiParam({ name: 'key', description: 'Cache key to retrieve' })
  @ApiQuery({ name: 'levels', required: false, description: 'Cache levels to search (comma-separated)' })
  @ApiResponse({ status: 200, description: 'Cache entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Cache entry not found' })
  async getCacheEntry(
    @Param('key') key: string,
    @Query('levels') levels?: string,
  ) {
    try {
      const searchLevels = levels ? levels.split(',') as CacheLevel[] : undefined;
      
      const value = await this.cacheService.get(key, {
        levels: searchLevels,
        updateAccessTime: true,
      });

      if (value === null) {
        throw new HttpException(`Cache entry not found: ${key}`, HttpStatus.NOT_FOUND);
      }

      const keyInfo = this.cacheService.getCacheKeyInfo(key);

      return {
        key,
        value,
        metadata: keyInfo,
        retrievedAt: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get cache entry ${key}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve cache entry', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('cache')
  @ApiOperation({ summary: 'Set cache entry' })
  @ApiBody({ type: CacheEntryDto })
  @ApiResponse({ status: 201, description: 'Cache entry set successfully' })
  async setCacheEntry(@Body() entry: CacheEntryDto) {
    try {
      const success = await this.cacheService.set(entry.key, entry.value, {
        ttl: entry.ttl,
        tags: entry.tags,
        priority: entry.priority,
        compression: entry.compression,
      });

      if (!success) {
        throw new HttpException('Failed to set cache entry', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return {
        message: 'Cache entry set successfully',
        key: entry.key,
        setAt: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to set cache entry ${entry.key}: ${error.message}`, error.stack);
      throw new HttpException('Failed to set cache entry', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('cache/:key')
  @ApiOperation({ summary: 'Delete cache entry' })
  @ApiParam({ name: 'key', description: 'Cache key to delete' })
  @ApiQuery({ name: 'levels', required: false, description: 'Cache levels to delete from (comma-separated)' })
  @ApiResponse({ status: 200, description: 'Cache entry deleted successfully' })
  async deleteCacheEntry(
    @Param('key') key: string,
    @Query('levels') levels?: string,
  ) {
    try {
      const deleteLevels = levels ? levels.split(',') as CacheLevel[] : undefined;
      
      const deleted = await this.cacheService.delete(key, {
        levels: deleteLevels,
      });

      return {
        message: deleted ? 'Cache entry deleted successfully' : 'Cache entry not found',
        key,
        deleted,
        deletedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to delete cache entry ${key}: ${error.message}`, error.stack);
      throw new HttpException('Failed to delete cache entry', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('cache/batch')
  @ApiOperation({ summary: 'Set multiple cache entries in batch' })
  @ApiBody({ type: CacheBatchDto })
  @ApiResponse({ status: 201, description: 'Batch cache operation completed' })
  async setBatchCacheEntries(@Body() batch: CacheBatchDto) {
    try {
      const result = await this.cacheService.setBatch(batch.entries);

      return {
        message: 'Batch cache operation completed',
        batchId: result.id,
        totalEntries: result.entries.length,
        successful: result.entries.length - result.errors.length,
        failed: result.errors.length,
        errors: result.errors,
        processedAt: result.timestamp,
      };

    } catch (error) {
      this.logger.error(`Failed to process batch cache operation: ${error.message}`, error.stack);
      throw new HttpException('Failed to process batch cache operation', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('cache/:key/info')
  @ApiOperation({ summary: 'Get detailed cache key information' })
  @ApiParam({ name: 'key', description: 'Cache key to inspect' })
  @ApiResponse({ status: 200, description: 'Cache key information retrieved successfully' })
  async getCacheKeyInfo(@Param('key') key: string) {
    try {
      const keyInfo = this.cacheService.getCacheKeyInfo(key);

      if (!keyInfo.exists) {
        throw new HttpException(`Cache key not found: ${key}`, HttpStatus.NOT_FOUND);
      }

      return {
        key,
        ...keyInfo,
        inspectedAt: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get cache key info ${key}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve cache key information', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // CACHE INVALIDATION ENDPOINTS
  // ===================================================================

  @Post('cache/invalidate')
  @ApiOperation({ summary: 'Invalidate cache entries' })
  @ApiBody({ type: CacheInvalidationDto })
  @ApiResponse({ status: 200, description: 'Cache invalidation completed' })
  async invalidateCache(@Body() invalidation: CacheInvalidationDto) {
    try {
      let invalidatedCount = 0;

      switch (invalidation.strategy) {
        case 'tags':
          invalidatedCount = await this.cacheService.invalidateByTags(invalidation.targets);
          break;

        case 'pattern':
          if (!invalidation.patternType) {
            throw new HttpException('Pattern type is required for pattern-based invalidation', HttpStatus.BAD_REQUEST);
          }
          
          for (const pattern of invalidation.targets) {
            const count = await this.cacheService.invalidateByPattern(pattern, invalidation.patternType);
            invalidatedCount += count;
          }
          break;

        case 'keys':
          for (const key of invalidation.targets) {
            const deleted = await this.cacheService.delete(key);
            if (deleted) invalidatedCount++;
          }
          break;

        default:
          throw new HttpException(`Unsupported invalidation strategy: ${invalidation.strategy}`, HttpStatus.BAD_REQUEST);
      }

      return {
        message: 'Cache invalidation completed',
        strategy: invalidation.strategy,
        targets: invalidation.targets,
        invalidatedCount,
        invalidatedAt: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to invalidate cache: ${error.message}`, error.stack);
      throw new HttpException('Failed to invalidate cache', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('cache/clear')
  @ApiOperation({ summary: 'Clear all cache entries' })
  @ApiQuery({ name: 'levels', required: false, description: 'Cache levels to clear (comma-separated)' })
  @ApiQuery({ name: 'confirm', required: true, type: 'boolean', description: 'Confirmation flag (must be true)' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache(
    @Query('levels') levels?: string,
    @Query('confirm') confirm?: boolean,
  ) {
    if (!confirm) {
      throw new HttpException('Cache clear operation requires confirmation', HttpStatus.BAD_REQUEST);
    }

    try {
      const clearLevels = levels ? levels.split(',') as CacheLevel[] : undefined;
      
      const success = await this.cacheService.clear({
        levels: clearLevels,
      });

      if (!success) {
        throw new HttpException('Failed to clear cache', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return {
        message: 'Cache cleared successfully',
        levels: clearLevels || ['all'],
        clearedAt: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to clear cache: ${error.message}`, error.stack);
      throw new HttpException('Failed to clear cache', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // CACHE STATISTICS ENDPOINTS
  // ===================================================================

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get cache statistics overview' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  async getCacheStatsOverview() {
    try {
      const stats = this.cacheService.getCacheStats();
      
      return {
        timestamp: new Date(),
        levels: stats,
        summary: this.calculateStatsSummary(stats as Record<CacheLevel, CacheStats>),
      };

    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve cache statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats/level/:level')
  @ApiOperation({ summary: 'Get statistics for specific cache level' })
  @ApiParam({ name: 'level', enum: ['memory', 'redis', 'database'] })
  @ApiResponse({ status: 200, description: 'Cache level statistics retrieved successfully' })
  async getCacheLevelStats(@Param('level') level: CacheLevel) {
    try {
      const stats = this.cacheService.getCacheStats(level);
      
      if (!stats) {
        throw new HttpException(`Cache level not found: ${level}`, HttpStatus.NOT_FOUND);
      }

      return {
        level,
        stats,
        retrievedAt: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get cache level stats ${level}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve cache level statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats/metrics')
  @ApiOperation({ summary: 'Get comprehensive cache metrics' })
  @ApiResponse({ status: 200, description: 'Cache metrics retrieved successfully' })
  async getCacheMetrics() {
    try {
      const metrics = this.cacheService.getCacheMetrics();
      
      return {
        ...metrics,
        retrievedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get cache metrics: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve cache metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // CACHE PATTERN MANAGEMENT ENDPOINTS
  // ===================================================================

  @Get('patterns')
  @ApiOperation({ summary: 'Get all cache patterns' })
  @ApiResponse({ status: 200, description: 'Cache patterns retrieved successfully' })
  async getCachePatterns() {
    try {
      const patterns = this.cacheService.getCachePatterns();
      
      return {
        patterns,
        total: patterns.length,
        retrievedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get cache patterns: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve cache patterns', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('patterns')
  @ApiOperation({ summary: 'Add cache pattern' })
  @ApiBody({ type: CachePatternDto })
  @ApiResponse({ status: 201, description: 'Cache pattern added successfully' })
  async addCachePattern(@Body() pattern: CachePatternDto) {
    try {
      const cachePattern: CachePattern = {
        pattern: pattern.pattern,
        type: pattern.type,
        ttl: pattern.ttl,
        priority: pattern.priority,
        tags: pattern.tags,
        compression: pattern.compression,
        strategy: pattern.strategy as any,
      };

      this.cacheService.addCachePattern(cachePattern);

      return {
        message: 'Cache pattern added successfully',
        pattern: cachePattern,
        addedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to add cache pattern: ${error.message}`, error.stack);
      throw new HttpException('Failed to add cache pattern', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('patterns/:pattern')
  @ApiOperation({ summary: 'Remove cache pattern' })
  @ApiParam({ name: 'pattern', description: 'Pattern to remove' })
  @ApiResponse({ status: 200, description: 'Cache pattern removed successfully' })
  async removeCachePattern(@Param('pattern') pattern: string) {
    try {
      const removed = this.cacheService.removeCachePattern(pattern);

      if (!removed) {
        throw new HttpException(`Cache pattern not found: ${pattern}`, HttpStatus.NOT_FOUND);
      }

      return {
        message: 'Cache pattern removed successfully',
        pattern,
        removedAt: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to remove cache pattern ${pattern}: ${error.message}`, error.stack);
      throw new HttpException('Failed to remove cache pattern', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // CACHE WARMUP ENDPOINTS
  // ===================================================================

  @Post('warmup')
  @ApiOperation({ summary: 'Warm cache with predefined data' })
  @ApiBody({ type: CacheWarmupDto })
  @ApiResponse({ status: 200, description: 'Cache warmup completed' })
  async warmupCache(@Body() warmup: CacheWarmupDto) {
    try {
      // Convert warmup entries to the expected format
      const warmupEntries = warmup.entries.map(entry => ({
        key: entry.key,
        dataFetcher: async () => {
          // In a real implementation, this would call actual data fetchers
          return `Warmed data for ${entry.key}`;
        },
        ttl: entry.ttl,
        tags: entry.tags,
      }));

      const result = await this.cacheService.warmCache(warmupEntries);

      return {
        message: 'Cache warmup completed',
        totalEntries: warmup.entries.length,
        successful: result.successful,
        failed: result.failed,
        warmupAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to warm cache: ${error.message}`, error.stack);
      throw new HttpException('Failed to warm cache', HttpStatus.BAD_REQUEST);
    }
  }

  // ===================================================================
  // PERFORMANCE MONITORING ENDPOINTS
  // ===================================================================

  @Get('performance/current')
  @ApiOperation({ summary: 'Get current cache performance metrics' })
  @ApiResponse({ status: 200, description: 'Current performance metrics retrieved successfully' })
  async getCurrentPerformance(): Promise<CachePerformanceMetrics> {
    try {
      return await this.performanceService.analyzeCurrentPerformance();
    } catch (error) {
      this.logger.error(`Failed to get current performance: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve current performance metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('performance/history')
  @ApiOperation({ summary: 'Get cache performance history' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Limit number of results' })
  @ApiResponse({ status: 200, description: 'Performance history retrieved successfully' })
  async getPerformanceHistory(@Query('limit') limit?: number): Promise<CachePerformanceMetrics[]> {
    try {
      return this.performanceService.getPerformanceHistory(limit);
    } catch (error) {
      this.logger.error(`Failed to get performance history: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve performance history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('performance/summary')
  @ApiOperation({ summary: 'Get performance summary' })
  @ApiResponse({ status: 200, description: 'Performance summary retrieved successfully' })
  async getPerformanceSummary() {
    try {
      return this.performanceService.getPerformanceSummary();
    } catch (error) {
      this.logger.error(`Failed to get performance summary: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve performance summary', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('performance/analyze')
  @ApiOperation({ summary: 'Force immediate performance analysis' })
  @ApiResponse({ status: 200, description: 'Performance analysis completed' })
  async forcePerformanceAnalysis(): Promise<CachePerformanceMetrics> {
    try {
      return await this.performanceService.forceAnalysis();
    } catch (error) {
      this.logger.error(`Failed to force performance analysis: ${error.message}`, error.stack);
      throw new HttpException('Failed to perform analysis', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // OPTIMIZATION ENDPOINTS
  // ===================================================================

  @Get('optimization/recommendations')
  @ApiOperation({ summary: 'Get optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Optimization recommendations retrieved successfully' })
  async getOptimizationRecommendations() {
    try {
      const cacheRecommendations = this.performanceService.getCurrentRecommendations();
      const optimizationRecommendations = await this.optimizationService.generateRecommendations();

      return {
        cache: cacheRecommendations,
        optimization: optimizationRecommendations,
        total: cacheRecommendations.length + optimizationRecommendations.length,
        generatedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get optimization recommendations: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve optimization recommendations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('optimization/apply/:opportunityId')
  @ApiOperation({ summary: 'Apply optimization recommendation' })
  @ApiParam({ name: 'opportunityId', description: 'ID of the optimization opportunity to apply' })
  @ApiResponse({ status: 200, description: 'Optimization applied successfully' })
  async applyOptimization(@Param('opportunityId') opportunityId: string) {
    try {
      const result = await this.performanceService.applyOptimization(opportunityId);

      return {
        message: result.success ? 'Optimization applied successfully' : 'Optimization application failed',
        opportunityId,
        success: result.success,
        applied: result.applied,
        errors: result.errors,
        appliedAt: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to apply optimization ${opportunityId}: ${error.message}`, error.stack);
      throw new HttpException('Failed to apply optimization', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('optimization/generate-report')
  @ApiOperation({ summary: 'Generate optimization report' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        includeDetailedAnalysis: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Optimization report generated successfully' })
  async generateOptimizationReport(@Body() options?: {
    startDate?: string;
    endDate?: string;
    includeDetailedAnalysis?: boolean;
  }): Promise<CacheOptimizationReport> {
    try {
      const reportOptions = options ? {
        period: options.startDate && options.endDate ? {
          start: new Date(options.startDate),
          end: new Date(options.endDate),
        } : undefined,
        includeDetailedAnalysis: options.includeDetailedAnalysis,
      } : undefined;

      return await this.performanceService.generateOptimizationReport(reportOptions);

    } catch (error) {
      this.logger.error(`Failed to generate optimization report: ${error.message}`, error.stack);
      throw new HttpException('Failed to generate optimization report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // BENCHMARKING ENDPOINTS
  // ===================================================================

  @Post('benchmark/run')
  @ApiOperation({ summary: 'Run cache performance benchmark' })
  @ApiBody({ type: BenchmarkConfigDto })
  @ApiResponse({ status: 200, description: 'Benchmark completed successfully' })
  async runBenchmark(@Body() config: BenchmarkConfigDto): Promise<CacheBenchmark> {
    try {
      return await this.performanceService.runBenchmark(config);
    } catch (error) {
      this.logger.error(`Failed to run benchmark: ${error.message}`, error.stack);
      throw new HttpException('Failed to run benchmark', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('benchmark/history')
  @ApiOperation({ summary: 'Get benchmark history' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Limit number of results' })
  @ApiResponse({ status: 200, description: 'Benchmark history retrieved successfully' })
  async getBenchmarkHistory(@Query('limit') limit?: number): Promise<CacheBenchmark[]> {
    try {
      return this.performanceService.getBenchmarkHistory(limit);
    } catch (error) {
      this.logger.error(`Failed to get benchmark history: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve benchmark history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('benchmark/active')
  @ApiOperation({ summary: 'Get active benchmarks' })
  @ApiResponse({ status: 200, description: 'Active benchmarks retrieved successfully' })
  async getActiveBenchmarks() {
    try {
      return this.performanceService.getActiveBenchmarks();
    } catch (error) {
      this.logger.error(`Failed to get active benchmarks: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve active benchmarks', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // RESPONSE OPTIMIZATION ENDPOINTS
  // ===================================================================

  @Post('optimization/compress')
  @ApiOperation({ summary: 'Compress response data' })
  @ApiBody({ type: OptimizationRequestDto })
  @ApiResponse({ status: 200, description: 'Response compressed successfully' })
  async compressResponse(@Body() request: OptimizationRequestDto) {
    try {
      const result = await this.optimizationService.compressResponse(request.data, {
        algorithm: request.compression?.algorithm,
        level: request.compression?.level,
        mimeType: request.mimeType,
      });

      return {
        message: 'Response compressed successfully',
        original: result.original,
        optimized: {
          size: result.optimized.size,
          compressionRatio: result.optimized.compressionRatio,
          algorithm: result.optimized.algorithm,
        },
        performance: result.performance,
        processedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to compress response: ${error.message}`, error.stack);
      throw new HttpException('Failed to compress response', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('optimization/transform')
  @ApiOperation({ summary: 'Transform response data' })
  @ApiBody({ type: OptimizationRequestDto })
  @ApiResponse({ status: 200, description: 'Response transformed successfully' })
  async transformResponse(@Body() request: OptimizationRequestDto) {
    try {
      const result = await this.optimizationService.transformResponse(request.data, request.transformation);

      return {
        message: 'Response transformed successfully',
        original: result.original,
        optimized: {
          size: result.optimized.size,
          transformations: result.optimized.transformations,
        },
        performance: result.performance,
        processedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to transform response: ${error.message}`, error.stack);
      throw new HttpException('Failed to transform response', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('optimization/comprehensive')
  @ApiOperation({ summary: 'Apply comprehensive response optimization' })
  @ApiBody({ type: OptimizationRequestDto })
  @ApiResponse({ status: 200, description: 'Response optimized successfully' })
  async optimizeResponse(@Body() request: OptimizationRequestDto) {
    try {
      const result = await this.optimizationService.optimizeResponse(request.data, {
        compression: request.compression,
        transformation: request.transformation,
        batching: request.batching,
        mimeType: request.mimeType,
        cacheKey: request.cacheKey,
      });

      return {
        message: 'Response optimized successfully',
        result,
        processedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to optimize response: ${error.message}`, error.stack);
      throw new HttpException('Failed to optimize response', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('optimization/config')
  @ApiOperation({ summary: 'Get optimization configuration' })
  @ApiResponse({ status: 200, description: 'Optimization configuration retrieved successfully' })
  async getOptimizationConfig(): Promise<OptimizationConfig> {
    try {
      return this.optimizationService.getOptimizationConfig();
    } catch (error) {
      this.logger.error(`Failed to get optimization config: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve optimization configuration', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('optimization/config')
  @ApiOperation({ summary: 'Update optimization configuration' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        compression: { type: 'object' },
        batching: { type: 'object' },
        connectionPooling: { type: 'object' },
        responseTransformation: { type: 'object' },
        caching: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Optimization configuration updated successfully' })
  async updateOptimizationConfig(@Body() updates: Partial<OptimizationConfig>) {
    try {
      this.optimizationService.updateOptimizationConfig(updates);

      return {
        message: 'Optimization configuration updated successfully',
        updatedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to update optimization config: ${error.message}`, error.stack);
      throw new HttpException('Failed to update optimization configuration', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('optimization/metrics')
  @ApiOperation({ summary: 'Get optimization metrics' })
  @ApiResponse({ status: 200, description: 'Optimization metrics retrieved successfully' })
  async getOptimizationMetrics(): Promise<OptimizationMetrics> {
    try {
      return this.optimizationService.getOptimizationMetrics();
    } catch (error) {
      this.logger.error(`Failed to get optimization metrics: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve optimization metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('optimization/batching/stats')
  @ApiOperation({ summary: 'Get batching statistics' })
  @ApiResponse({ status: 200, description: 'Batching statistics retrieved successfully' })
  async getBatchingStats() {
    try {
      return this.optimizationService.getBatchingStats();
    } catch (error) {
      this.logger.error(`Failed to get batching stats: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve batching statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('optimization/connection-pools')
  @ApiOperation({ summary: 'Get connection pool statistics' })
  @ApiResponse({ status: 200, description: 'Connection pool statistics retrieved successfully' })
  async getConnectionPoolStats() {
    try {
      return this.optimizationService.getConnectionPoolStats();
    } catch (error) {
      this.logger.error(`Failed to get connection pool stats: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve connection pool statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // MAINTENANCE ENDPOINTS
  // ===================================================================

  @Delete('maintenance/cache')
  @ApiOperation({ summary: 'Clear optimization cache' })
  @ApiResponse({ status: 200, description: 'Optimization cache cleared successfully' })
  async clearOptimizationCache() {
    try {
      this.optimizationService.clearOptimizationCache();

      return {
        message: 'Optimization cache cleared successfully',
        clearedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to clear optimization cache: ${error.message}`, error.stack);
      throw new HttpException('Failed to clear optimization cache', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get cache system health status' })
  @ApiResponse({ status: 200, description: 'Cache system health retrieved successfully' })
  async getSystemHealth() {
    try {
      const cacheStats = this.cacheService.getCacheStats() as Record<CacheLevel, CacheStats>;
      const performanceSummary = this.performanceService.getPerformanceSummary();
      const optimizationMetrics = this.optimizationService.getOptimizationMetrics();

      const overallHealth = this.calculateSystemHealth(cacheStats, performanceSummary, optimizationMetrics);

      return {
        timestamp: new Date(),
        overallHealth,
        cache: {
          levels: Object.keys(cacheStats),
          totalHits: Object.values(cacheStats).reduce((sum, stats) => sum + stats.totalHits, 0),
          totalMisses: Object.values(cacheStats).reduce((sum, stats) => sum + stats.totalMisses, 0),
          hitRate: this.calculateOverallHitRate(cacheStats),
        },
        performance: performanceSummary,
        optimization: {
          enabled: optimizationMetrics.compression.totalRequests > 0,
          compressionRatio: optimizationMetrics.compression.compressionRatio,
          bandwidthSaved: optimizationMetrics.compression.bandwidthSaved,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to get system health: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve system health', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private calculateStatsSummary(stats: Record<CacheLevel, CacheStats>) {
    const totalHits = Object.values(stats).reduce((sum, s) => sum + s.totalHits, 0);
    const totalMisses = Object.values(stats).reduce((sum, s) => sum + s.totalMisses, 0);
    const totalEntries = Object.values(stats).reduce((sum, s) => sum + s.totalEntries, 0);
    const totalSize = Object.values(stats).reduce((sum, s) => sum + s.totalSizeBytes, 0);

    return {
      totalHits,
      totalMisses,
      overallHitRate: totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0,
      totalEntries,
      totalSizeBytes: totalSize,
      averageEntrySize: totalEntries > 0 ? totalSize / totalEntries : 0,
    };
  }

  private calculateSystemHealth(
    cacheStats: Record<CacheLevel, CacheStats>,
    performanceSummary: any,
    optimizationMetrics: OptimizationMetrics
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    const hitRate = this.calculateOverallHitRate(cacheStats);
    const avgResponseTime = performanceSummary.averageResponseTime || 0;
    const compressionEfficiency = optimizationMetrics.compression.compressionRatio;

    if (hitRate >= 90 && avgResponseTime <= 50 && compressionEfficiency >= 0.7) {
      return 'excellent';
    } else if (hitRate >= 75 && avgResponseTime <= 100 && compressionEfficiency >= 0.6) {
      return 'good';
    } else if (hitRate >= 60 && avgResponseTime <= 200) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  private calculateOverallHitRate(cacheStats: Record<CacheLevel, CacheStats>): number {
    const totalHits = Object.values(cacheStats).reduce((sum, stats) => sum + stats.totalHits, 0);
    const totalMisses = Object.values(cacheStats).reduce((sum, stats) => sum + stats.totalMisses, 0);
    const total = totalHits + totalMisses;
    
    return total > 0 ? (totalHits / total) * 100 : 0;
  }
}
