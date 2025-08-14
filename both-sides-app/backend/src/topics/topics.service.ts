/**
 * Topics Service
 * 
 * Core service for debate topic management including CRUD operations,
 * search, categorization, and basic analytics. Integrates with difficulty
 * assessment service for comprehensive topic management.
 * 
 * Phase 4 Task 4.1.3: Basic Topic Management System
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../common/services/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import {
  CreateTopicDto,
  UpdateTopicDto,
  TopicSearchDto,
  TopicResponseDto,
  TopicCategory,
  BulkCreateTopicsDto,
  BulkUpdateTopicsDto,
  TopicCategoriesDto,
  TopicStatsDto,
  TopicRecommendationDto,
  RecommendedTopicDto,
  TopicResourceDto
} from './dto/topics.dto';

export interface TopicSearchResult {
  topics: TopicResponseDto[];
  totalCount: number;
  hasMore: boolean;
  searchMetadata: {
    query?: string;
    filters: any;
    processingTime: number;
  };
}

@Injectable()
export class TopicsService {
  private readonly logger = new Logger(TopicsService.name);
  private readonly CACHE_TTL = 1800000; // 30 minutes
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new debate topic
   */
  async createTopic(
    createTopicDto: CreateTopicDto,
    createdBy?: string
  ): Promise<TopicResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Creating new topic: "${createTopicDto.title}"`);

      // Validate topic uniqueness
      await this.validateTopicUniqueness(createTopicDto.title);

      // Create topic in database
      const topic = await this.prismaService.debateTopic.create({
        data: {
          title: createTopicDto.title,
          description: createTopicDto.description,
          category: createTopicDto.category,
          difficulty_level: createTopicDto.difficultyLevel || 5,
          pro_resources: createTopicDto.proResources || [],
          con_resources: createTopicDto.conResources || [],
          is_active: createTopicDto.isActive ?? true,
          created_by: createdBy,
        },
      });

      // Audit log
      if (createdBy) {
        await this.auditService.log({
          entity_type: 'debate_topic',
          entity_id: topic.id,
          action: 'create',
          changes: { created: topic },
          actor_id: createdBy,
          actor_type: 'user',
        });
      }

      // Clear category cache
      await this.clearCategoryCache();

      const result = this.transformToResponseDto(topic);
      
      this.logger.log(
        `Created topic ${topic.id} in ${Date.now() - startTime}ms`
      );
      
      return result;

    } catch (error) {
      this.logger.error(`Failed to create topic: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to create topic: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get topic by ID
   */
  async getTopicById(id: string): Promise<TopicResponseDto> {
    try {
      const cacheKey = `topic:${id}`;
      
      // Check cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const topic = await this.prismaService.debateTopic.findUnique({
        where: { id },
        include: {
          creator: {
            select: { id: true, first_name: true, last_name: true }
          }
        }
      });

      if (!topic) {
        throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
      }

      const result = this.transformToResponseDto(topic);
      
      // Cache the result
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
      
      return result;

    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to get topic ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve topic',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update existing topic
   */
  async updateTopic(
    id: string,
    updateTopicDto: UpdateTopicDto,
    updatedBy?: string
  ): Promise<TopicResponseDto> {
    try {
      this.logger.log(`Updating topic ${id}`);

      // Get existing topic for audit
      const existingTopic = await this.prismaService.debateTopic.findUnique({
        where: { id }
      });

      if (!existingTopic) {
        throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
      }

      // Validate title uniqueness if changed
      if (updateTopicDto.title && updateTopicDto.title !== existingTopic.title) {
        await this.validateTopicUniqueness(updateTopicDto.title, id);
      }

      // Update topic
      const updatedTopic = await this.prismaService.debateTopic.update({
        where: { id },
        data: {
          ...(updateTopicDto.title && { title: updateTopicDto.title }),
          ...(updateTopicDto.description && { description: updateTopicDto.description }),
          ...(updateTopicDto.category && { category: updateTopicDto.category }),
          ...(updateTopicDto.difficultyLevel && { difficulty_level: updateTopicDto.difficultyLevel }),
          ...(updateTopicDto.proResources && { pro_resources: updateTopicDto.proResources }),
          ...(updateTopicDto.conResources && { con_resources: updateTopicDto.conResources }),
          ...(updateTopicDto.isActive !== undefined && { is_active: updateTopicDto.isActive }),
        },
        include: {
          creator: {
            select: { id: true, first_name: true, last_name: true }
          }
        }
      });

      // Audit log
      if (updatedBy) {
        await this.auditService.log({
          entity_type: 'debate_topic',
          entity_id: id,
          action: 'update',
          changes: { 
            old: existingTopic, 
            new: updatedTopic,
            fields_changed: Object.keys(updateTopicDto)
          },
          actor_id: updatedBy,
          actor_type: 'user',
        });
      }

      // Clear caches
      await Promise.all([
        this.cacheService.delete(`topic:${id}`),
        this.clearCategoryCache()
      ]);

      const result = this.transformToResponseDto(updatedTopic);
      
      this.logger.log(`Updated topic ${id} successfully`);
      
      return result;

    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to update topic ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to update topic',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete topic (soft delete by setting inactive)
   */
  async deleteTopic(id: string, deletedBy?: string): Promise<void> {
    try {
      this.logger.log(`Deleting topic ${id}`);

      const existingTopic = await this.prismaService.debateTopic.findUnique({
        where: { id }
      });

      if (!existingTopic) {
        throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
      }

      // Check if topic is currently being used in active matches
      const activeMatches = await this.prismaService.match.count({
        where: {
          topic_id: id,
          status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] }
        }
      });

      if (activeMatches > 0) {
        throw new HttpException(
          'Cannot delete topic that is currently used in active matches',
          HttpStatus.CONFLICT
        );
      }

      // Soft delete by setting inactive
      await this.prismaService.debateTopic.update({
        where: { id },
        data: { is_active: false }
      });

      // Audit log
      if (deletedBy) {
        await this.auditService.log({
          entity_type: 'debate_topic',
          entity_id: id,
          action: 'delete',
          changes: { deactivated: true, reason: 'soft_delete' },
          actor_id: deletedBy,
          actor_type: 'user',
        });
      }

      // Clear caches
      await Promise.all([
        this.cacheService.delete(`topic:${id}`),
        this.clearCategoryCache()
      ]);

      this.logger.log(`Deactivated topic ${id} successfully`);

    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to delete topic ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to delete topic',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Search and filter topics
   */
  async searchTopics(searchDto: TopicSearchDto): Promise<TopicSearchResult> {
    const startTime = Date.now();
    
    try {
      const {
        query,
        category,
        minDifficulty,
        maxDifficulty,
        isActive = true,
        createdBy,
        limit = this.DEFAULT_LIMIT,
        offset = 0,
        sortBy = 'created',
        sortOrder = 'desc'
      } = searchDto;

      // Build where clause
      const whereClause: any = {};
      
      if (isActive !== undefined) {
        whereClause.is_active = isActive;
      }
      
      if (category) {
        whereClause.category = category;
      }
      
      if (minDifficulty || maxDifficulty) {
        whereClause.difficulty_level = {};
        if (minDifficulty) whereClause.difficulty_level.gte = minDifficulty;
        if (maxDifficulty) whereClause.difficulty_level.lte = maxDifficulty;
      }
      
      if (createdBy) {
        whereClause.created_by = createdBy;
      }
      
      if (query) {
        whereClause.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ];
      }

      // Build order by clause
      const orderBy: any = {};
      switch (sortBy) {
        case 'title':
          orderBy.title = sortOrder;
          break;
        case 'difficulty':
          orderBy.difficulty_level = sortOrder;
          break;
        case 'usage':
          orderBy.usage_count = sortOrder;
          break;
        case 'success_rate':
          orderBy.success_rate = sortOrder;
          break;
        default:
          orderBy.created_at = sortOrder;
      }

      // Execute search with pagination
      const [topics, totalCount] = await Promise.all([
        this.prismaService.debateTopic.findMany({
          where: whereClause,
          orderBy,
          take: Math.min(limit, this.MAX_LIMIT),
          skip: offset,
          include: {
            creator: {
              select: { id: true, first_name: true, last_name: true }
            }
          }
        }),
        this.prismaService.debateTopic.count({ where: whereClause })
      ]);

      const results = topics.map(topic => this.transformToResponseDto(topic));
      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Found ${results.length}/${totalCount} topics in ${processingTime}ms`
      );

      return {
        topics: results,
        totalCount,
        hasMore: offset + results.length < totalCount,
        searchMetadata: {
          query,
          filters: { category, minDifficulty, maxDifficulty, isActive, createdBy },
          processingTime
        }
      };

    } catch (error) {
      this.logger.error(`Failed to search topics: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to search topics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get all topic categories with counts
   */
  async getTopicCategories(): Promise<TopicCategoriesDto> {
    try {
      const cacheKey = 'topic_categories';
      
      // Check cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get category distribution
      const categoryCounts = await this.prismaService.debateTopic.groupBy({
        by: ['category'],
        where: { is_active: true },
        _count: { category: true }
      });

      const categories = Object.values(TopicCategory);
      const countMap = categoryCounts.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {} as Record<string, number>);

      const result: TopicCategoriesDto = {
        categories,
        categoryCounts: countMap
      };

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
      
      return result;

    } catch (error) {
      this.logger.error(`Failed to get topic categories: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get topic categories',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get topic statistics
   */
  async getTopicStats(): Promise<TopicStatsDto> {
    try {
      const cacheKey = 'topic_stats';
      
      // Check cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get various statistics
      const [
        totalTopics,
        activeTopics,
        avgDifficulty,
        categoryDist,
        difficultyDist,
        usageStats
      ] = await Promise.all([
        this.prismaService.debateTopic.count(),
        this.prismaService.debateTopic.count({ where: { is_active: true } }),
        this.prismaService.debateTopic.aggregate({
          where: { is_active: true },
          _avg: { difficulty_level: true }
        }),
        this.prismaService.debateTopic.groupBy({
          by: ['category'],
          where: { is_active: true },
          _count: { category: true }
        }),
        this.prismaService.debateTopic.groupBy({
          by: ['difficulty_level'],
          where: { is_active: true },
          _count: { difficulty_level: true }
        }),
        this.prismaService.debateTopic.aggregate({
          where: { is_active: true },
          _avg: { success_rate: true },
          _sum: { usage_count: true }
        })
      ]);

      const categoryDistribution = categoryDist.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {} as Record<string, number>);

      const difficultyDistribution = difficultyDist.reduce((acc, item) => {
        acc[`Level ${item.difficulty_level}`] = item._count.difficulty_level;
        return acc;
      }, {} as Record<string, number>);

      const result: TopicStatsDto = {
        totalTopics,
        activeTopics,
        averageDifficulty: Math.round((avgDifficulty._avg.difficulty_level || 5) * 10) / 10,
        categoryDistribution,
        difficultyDistribution,
        averageSuccessRate: usageStats._avg.success_rate ? 
          Math.round(usageStats._avg.success_rate * 100) / 100 : undefined,
        totalUsage: usageStats._sum.usage_count || 0
      };

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, result, 3600000);
      
      return result;

    } catch (error) {
      this.logger.error(`Failed to get topic stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get topic statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Bulk create topics
   */
  async bulkCreateTopics(
    bulkCreateDto: BulkCreateTopicsDto,
    createdBy?: string
  ): Promise<TopicResponseDto[]> {
    try {
      this.logger.log(`Bulk creating ${bulkCreateDto.topics.length} topics`);

      const createdTopics = [];
      
      // Create topics in transaction
      await this.prismaService.$transaction(async (tx) => {
        for (const topicDto of bulkCreateDto.topics) {
          // Validate uniqueness
          const existing = await tx.debateTopic.findFirst({
            where: { title: { equals: topicDto.title, mode: 'insensitive' } }
          });
          
          if (existing) {
            this.logger.warn(`Skipping duplicate topic: "${topicDto.title}"`);
            continue;
          }

          const topic = await tx.debateTopic.create({
            data: {
              title: topicDto.title,
              description: topicDto.description,
              category: topicDto.category,
              difficulty_level: topicDto.difficultyLevel || 5,
              pro_resources: topicDto.proResources || [],
              con_resources: topicDto.conResources || [],
              is_active: topicDto.isActive ?? true,
              created_by: createdBy,
            }
          });
          
          createdTopics.push(topic);
        }
      });

      // Audit log
      if (createdBy) {
        await this.auditService.log({
          entity_type: 'debate_topic',
          entity_id: 'bulk_create',
          action: 'bulk_create',
          changes: { 
            created_count: createdTopics.length,
            source: bulkCreateDto.source 
          },
          actor_id: createdBy,
          actor_type: 'user',
        });
      }

      // Clear category cache
      await this.clearCategoryCache();

      const results = createdTopics.map(topic => this.transformToResponseDto(topic));
      
      this.logger.log(`Successfully bulk created ${results.length} topics`);
      
      return results;

    } catch (error) {
      this.logger.error(`Failed to bulk create topics: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to bulk create topics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update topic usage count
   */
  async updateTopicUsage(topicId: string, increment: number = 1): Promise<void> {
    try {
      await this.prismaService.debateTopic.update({
        where: { id: topicId },
        data: { usage_count: { increment } }
      });

      // Clear stats cache
      await this.cacheService.delete('topic_stats');

    } catch (error) {
      this.logger.error(`Failed to update topic usage: ${error.message}`);
      // Don't throw error - this is non-critical
    }
  }

  // Private helper methods

  private async validateTopicUniqueness(title: string, excludeId?: string): Promise<void> {
    const whereClause: any = {
      title: { equals: title, mode: 'insensitive' }
    };
    
    if (excludeId) {
      whereClause.id = { not: excludeId };
    }

    const existing = await this.prismaService.debateTopic.findFirst({
      where: whereClause
    });

    if (existing) {
      throw new HttpException(
        'A topic with this title already exists',
        HttpStatus.CONFLICT
      );
    }
  }

  private transformToResponseDto(topic: any): TopicResponseDto {
    return {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      category: topic.category,
      difficultyLevel: topic.difficulty_level,
      complexityScore: topic.complexity_score,
      proResources: topic.pro_resources as TopicResourceDto[],
      conResources: topic.con_resources as TopicResourceDto[],
      isActive: topic.is_active,
      usageCount: topic.usage_count,
      successRate: topic.success_rate,
      createdBy: topic.creator ? 
        `${topic.creator.first_name} ${topic.creator.last_name}`.trim() || topic.created_by : 
        topic.created_by,
      createdAt: topic.created_at.toISOString(),
      updatedAt: topic.updated_at.toISOString()
    };
  }

  private async clearCategoryCache(): Promise<void> {
    await Promise.all([
      this.cacheService.delete('topic_categories'),
      this.cacheService.delete('topic_stats')
    ]);
  }
}
