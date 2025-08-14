/**
 * Topics Controller
 * 
 * REST API controller for debate topic management system.
 * Provides endpoints for CRUD operations, search, categorization,
 * and difficulty assessment of debate topics.
 * 
 * Phase 4 Task 4.1.3: Basic Topic Management System
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicDifficultyService } from './topic-difficulty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RBACGuard } from '../auth/rbac/guards/rbac.guard';
import { Permissions } from '../auth/rbac/decorators/permissions.decorator';
import { CurrentUser } from '../auth/rbac/decorators/current-user.decorator';
import {
  CreateTopicDto,
  UpdateTopicDto,
  TopicSearchDto,
  TopicResponseDto,
  BulkCreateTopicsDto,
  BulkUpdateTopicsDto,
  TopicCategoriesDto,
  TopicStatsDto,
  AssessTopicDifficultyDto,
  DifficultyAssessmentResponseDto,
  TopicRecommendationDto,
  RecommendedTopicDto
} from './dto/topics.dto';

@Controller('api/topics')
@UseGuards(JwtAuthGuard)
export class TopicsController {
  private readonly logger = new Logger(TopicsController.name);

  constructor(
    private readonly topicsService: TopicsService,
    private readonly difficultyService: TopicDifficultyService,
  ) {}

  /**
   * Create a new debate topic
   * POST /api/topics
   */
  @Post()
  @UseGuards(RBACGuard)
  @Permissions('topic:create')
  async createTopic(
    @Body() createTopicDto: CreateTopicDto,
    @CurrentUser() user: any,
  ): Promise<TopicResponseDto> {
    try {
      this.logger.log(`Creating topic "${createTopicDto.title}" by user ${user.id}`);

      const topic = await this.topicsService.createTopic(createTopicDto, user.id);

      this.logger.log(`Successfully created topic ${topic.id}`);
      
      return topic;

    } catch (error) {
      this.logger.error(`Failed to create topic: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to create topic',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all topics with optional search and filtering
   * GET /api/topics
   */
  @Get()
  @UseGuards(RBACGuard)
  @Permissions('topic:read')
  async getTopics(
    @Query() searchDto: TopicSearchDto,
  ): Promise<{
    topics: TopicResponseDto[];
    totalCount: number;
    hasMore: boolean;
    searchMetadata: any;
  }> {
    try {
      this.logger.log(`Searching topics with filters: ${JSON.stringify(searchDto)}`);

      const result = await this.topicsService.searchTopics(searchDto);

      this.logger.log(`Found ${result.topics.length}/${result.totalCount} topics`);
      
      return result;

    } catch (error) {
      this.logger.error(`Failed to search topics: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to search topics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get topic by ID
   * GET /api/topics/:id
   */
  @Get(':id')
  @UseGuards(RBACGuard)
  @Permissions('topic:read')
  async getTopicById(
    @Param('id') id: string,
  ): Promise<TopicResponseDto> {
    try {
      this.logger.log(`Retrieving topic ${id}`);

      const topic = await this.topicsService.getTopicById(id);

      return topic;

    } catch (error) {
      this.logger.error(`Failed to get topic ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to retrieve topic',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update existing topic
   * PUT /api/topics/:id
   */
  @Put(':id')
  @UseGuards(RBACGuard)
  @Permissions('topic:update')
  async updateTopic(
    @Param('id') id: string,
    @Body() updateTopicDto: UpdateTopicDto,
    @CurrentUser() user: any,
  ): Promise<TopicResponseDto> {
    try {
      this.logger.log(`Updating topic ${id} by user ${user.id}`);

      const topic = await this.topicsService.updateTopic(id, updateTopicDto, user.id);

      this.logger.log(`Successfully updated topic ${id}`);
      
      return topic;

    } catch (error) {
      this.logger.error(`Failed to update topic ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to update topic',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete topic (soft delete)
   * DELETE /api/topics/:id
   */
  @Delete(':id')
  @UseGuards(RBACGuard)
  @Permissions('topic:delete')
  async deleteTopic(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Deleting topic ${id} by user ${user.id}`);

      await this.topicsService.deleteTopic(id, user.id);

      this.logger.log(`Successfully deleted topic ${id}`);
      
      return { message: 'Topic successfully deleted' };

    } catch (error) {
      this.logger.error(`Failed to delete topic ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to delete topic',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all topic categories with counts
   * GET /api/topics/categories
   */
  @Get('meta/categories')
  @UseGuards(RBACGuard)
  @Permissions('topic:read')
  async getTopicCategories(): Promise<TopicCategoriesDto> {
    try {
      this.logger.log('Retrieving topic categories');

      const categories = await this.topicsService.getTopicCategories();

      return categories;

    } catch (error) {
      this.logger.error(`Failed to get topic categories: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get topic categories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get topic statistics
   * GET /api/topics/stats
   */
  @Get('meta/stats')
  @UseGuards(RBACGuard)
  @Permissions('topic:read')
  async getTopicStats(): Promise<TopicStatsDto> {
    try {
      this.logger.log('Retrieving topic statistics');

      const stats = await this.topicsService.getTopicStats();

      return stats;

    } catch (error) {
      this.logger.error(`Failed to get topic stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get topic statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bulk create topics
   * POST /api/topics/bulk
   */
  @Post('bulk/create')
  @UseGuards(RBACGuard)
  @Permissions('topic:create', 'topic:bulk_create')
  async bulkCreateTopics(
    @Body() bulkCreateDto: BulkCreateTopicsDto,
    @CurrentUser() user: any,
  ): Promise<{
    topics: TopicResponseDto[];
    createdCount: number;
    skippedCount: number;
  }> {
    try {
      this.logger.log(`Bulk creating ${bulkCreateDto.topics.length} topics by user ${user.id}`);

      const topics = await this.topicsService.bulkCreateTopics(bulkCreateDto, user.id);
      const createdCount = topics.length;
      const skippedCount = bulkCreateDto.topics.length - createdCount;

      this.logger.log(`Bulk creation complete: ${createdCount} created, ${skippedCount} skipped`);
      
      return {
        topics,
        createdCount,
        skippedCount
      };

    } catch (error) {
      this.logger.error(`Failed bulk topic creation: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to bulk create topics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Assess topic difficulty
   * POST /api/topics/difficulty/assess
   */
  @Post('difficulty/assess')
  @UseGuards(RBACGuard)
  @Permissions('topic:analyze')
  async assessTopicDifficulty(
    @Body() assessDto: AssessTopicDifficultyDto,
    @CurrentUser() user: any,
  ): Promise<DifficultyAssessmentResponseDto> {
    try {
      this.logger.log(`Assessing difficulty for topic ${assessDto.topicId} by user ${user.id}`);

      const assessment = await this.difficultyService.assessTopicDifficulty(assessDto);

      this.logger.log(
        `Assessed topic ${assessDto.topicId}: difficulty=${assessment.assessedDifficulty}`
      );
      
      return assessment;

    } catch (error) {
      this.logger.error(`Failed to assess topic difficulty: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to assess topic difficulty',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Batch assess multiple topics
   * POST /api/topics/difficulty/batch-assess
   */
  @Post('difficulty/batch-assess')
  @UseGuards(RBACGuard)
  @Permissions('topic:analyze')
  async batchAssessTopics(
    @Body() body: { topicIds: string[] },
    @CurrentUser() user: any,
  ): Promise<DifficultyAssessmentResponseDto[]> {
    try {
      const { topicIds } = body;
      
      this.logger.log(`Batch assessing ${topicIds.length} topics by user ${user.id}`);

      const assessments = await this.difficultyService.batchAssessTopics(topicIds);

      this.logger.log(`Completed batch assessment of ${assessments.length} topics`);
      
      return assessments;

    } catch (error) {
      this.logger.error(`Failed batch topic assessment: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed batch topic assessment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get difficulty distribution across all topics
   * GET /api/topics/difficulty/distribution
   */
  @Get('difficulty/distribution')
  @UseGuards(RBACGuard)
  @Permissions('topic:read')
  async getDifficultyDistribution(): Promise<Record<string, number>> {
    try {
      this.logger.log('Retrieving difficulty distribution');

      const distribution = await this.difficultyService.getDifficultyDistribution();

      return distribution;

    } catch (error) {
      this.logger.error(`Failed to get difficulty distribution: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get difficulty distribution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Recommend difficulty level based on user/class characteristics
   * POST /api/topics/difficulty/recommend
   */
  @Post('difficulty/recommend')
  @UseGuards(RBACGuard)
  @Permissions('topic:read')
  async recommendDifficultyLevel(
    @Body() body: { 
      userExperience?: number; 
      classLevel?: 'beginner' | 'intermediate' | 'advanced' 
    },
  ): Promise<{ recommendedDifficulty: number; explanation: string }> {
    try {
      const { userExperience, classLevel } = body;
      
      this.logger.log(`Recommending difficulty level for experience=${userExperience}, class=${classLevel}`);

      const recommendedDifficulty = await this.difficultyService.recommendDifficultyLevel(
        userExperience,
        classLevel
      );

      let explanation = `Recommended difficulty level ${recommendedDifficulty} based on `;
      if (userExperience) explanation += `user experience level ${userExperience}`;
      if (classLevel) explanation += `${userExperience ? ' and ' : ''}class level: ${classLevel}`;
      if (!userExperience && !classLevel) explanation += 'default moderate settings';

      return {
        recommendedDifficulty,
        explanation
      };

    } catch (error) {
      this.logger.error(`Failed to recommend difficulty: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to recommend difficulty level',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update topic usage count (used by matching engine)
   * POST /api/topics/:id/usage
   */
  @Post(':id/usage')
  @UseGuards(RBACGuard)
  @Permissions('topic:update')
  async updateTopicUsage(
    @Param('id') id: string,
    @Body() body: { increment?: number },
  ): Promise<{ message: string }> {
    try {
      const { increment = 1 } = body;
      
      this.logger.log(`Updating usage count for topic ${id} by ${increment}`);

      await this.topicsService.updateTopicUsage(id, increment);

      return { message: 'Topic usage updated successfully' };

    } catch (error) {
      this.logger.error(`Failed to update topic usage: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to update topic usage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get topics by category
   * GET /api/topics/category/:category
   */
  @Get('category/:category')
  @UseGuards(RBACGuard)
  @Permissions('topic:read')
  async getTopicsByCategory(
    @Param('category') category: string,
    @Query('limit') limit?: number,
    @Query('difficulty') difficulty?: number,
  ): Promise<TopicResponseDto[]> {
    try {
      this.logger.log(`Getting topics for category: ${category}`);

      const searchDto: TopicSearchDto = {
        category: category as any,
        limit: limit || 20,
        ...(difficulty && { minDifficulty: difficulty, maxDifficulty: difficulty }),
        isActive: true
      };

      const result = await this.topicsService.searchTopics(searchDto);

      return result.topics;

    } catch (error) {
      this.logger.error(`Failed to get topics by category: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get topics by category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search topics by text query
   * GET /api/topics/search
   */
  @Get('search/:query')
  @UseGuards(RBACGuard)
  @Permissions('topic:read')
  async searchTopicsByQuery(
    @Param('query') query: string,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
  ): Promise<TopicResponseDto[]> {
    try {
      this.logger.log(`Searching topics with query: "${query}"`);

      const searchDto: TopicSearchDto = {
        query,
        limit: limit || 20,
        ...(category && { category: category as any }),
        isActive: true
      };

      const result = await this.topicsService.searchTopics(searchDto);

      return result.topics;

    } catch (error) {
      this.logger.error(`Failed to search topics: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to search topics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
