/**
 * Phase 3 Task 3.1.3: Survey Response Collection APIs
 * REST endpoints for survey management and response collection
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
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { SurveyValidationService } from './validators/survey-validation.service';
import { SurveyQualityService } from './validators/survey-quality.service';
import { SurveyErrorHandlerService } from './error-handling/survey-error-handler.service';
import { SurveyMonitoringService } from './monitoring/survey-monitoring.service';
import { 
  SurveyResponseDto, 
  BulkSurveyResponseDto, 
  SurveyProgressDto,
  AdaptiveQuestionRequestDto,
  QuestionValidationResultDto 
} from './dto/survey-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/rbac/guards/rbac.guard';
import { CurrentUser } from '../auth/rbac/decorators/current-user.decorator';
import { Roles } from '../auth/rbac/decorators/roles.decorator';
import { Permissions } from '../auth/rbac/decorators/permissions.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Surveys')
@ApiBearerAuth()
@Controller('surveys')
@UseGuards(JwtAuthGuard, RbacGuard)
export class SurveysController {
  private readonly logger = new Logger(SurveysController.name);

  constructor(
    private readonly surveysService: SurveysService,
    private readonly validationService: SurveyValidationService,
    private readonly qualityService: SurveyQualityService,
    private readonly errorHandlerService: SurveyErrorHandlerService,
    private readonly monitoringService: SurveyMonitoringService,
  ) {}

  /**
   * Get active survey with questions
   * GET /api/surveys/active
   */
  @Get('active')
  @ApiOperation({ summary: 'Get active survey with questions' })
  @ApiResponse({ status: 200, description: 'Active survey retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No active survey found' })
  async getActiveSurvey(@CurrentUser() user: User) {
    this.logger.log(`Getting active survey for user: ${user.id}`);
    
    const survey = await this.surveysService.getActiveSurveyWithQuestions(user.id);
    
    return {
      success: true,
      data: survey,
    };
  }

  /**
   * Get adaptive questions for user
   * GET /api/surveys/adaptive
   */
  @Get('adaptive')
  @ApiOperation({ summary: 'Get personalized questions based on user profile' })
  @ApiQuery({ name: 'age', required: false, description: 'User age for filtering' })
  @ApiQuery({ name: 'complexity', required: false, enum: ['basic', 'intermediate', 'advanced'] })
  @ApiQuery({ name: 'maxQuestions', required: false, description: 'Maximum questions per session' })
  @ApiResponse({ status: 200, description: 'Adaptive questions retrieved successfully' })
  async getAdaptiveQuestions(
    @CurrentUser() user: User,
    @Query() query: AdaptiveQuestionRequestDto,
  ) {
    this.logger.log(`Getting adaptive questions for user: ${user.id}`);
    
    const questions = await this.surveysService.getAdaptiveQuestions(
      user.id,
      query.age || 18,
      query.complexity_preference || 'basic'
    );
    
    return {
      success: true,
      data: {
        questions: questions.slice(0, query.max_questions || 20),
        total_available: questions.length,
        personalization_applied: true,
      },
    };
  }

  /**
   * Save a single survey response
   * POST /api/surveys/responses
   */
  @Post('responses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a single survey response' })
  @ApiCreatedResponse({ description: 'Response saved successfully' })
  @ApiBadRequestResponse({ description: 'Invalid response data' })
  @ApiNotFoundResponse({ description: 'Question or user profile not found' })
  async saveResponse(
    @Body(new ValidationPipe({ transform: true })) responseDto: SurveyResponseDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Saving response for user: ${user.id}, question: ${responseDto.question_id}`);
    
    const response = await this.surveysService.saveResponse(user.id, responseDto);
    
    return {
      success: true,
      message: 'Response saved successfully',
      data: response,
    };
  }

  /**
   * Bulk save survey responses
   * POST /api/surveys/responses/bulk
   */
  @Post('responses/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save multiple survey responses in batch' })
  @ApiCreatedResponse({ description: 'Bulk responses processed successfully' })
  @ApiBadRequestResponse({ description: 'Invalid response data in batch' })
  async bulkSaveResponses(
    @Body(new ValidationPipe({ transform: true })) bulkDto: BulkSurveyResponseDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Bulk saving ${bulkDto.responses.length} responses for user: ${user.id}`);
    
    const result = await this.surveysService.bulkSaveResponses(user.id, bulkDto);
    
    return {
      success: true,
      message: `Processed ${result.success_count} responses successfully`,
      data: result,
    };
  }

  /**
   * Get survey progress for current user
   * GET /api/surveys/progress
   */
  @Get('progress')
  @ApiOperation({ summary: 'Get survey completion progress for current user' })
  @ApiOkResponse({ description: 'Progress retrieved successfully' })
  async getSurveyProgress(@CurrentUser() user: User) {
    this.logger.log(`Getting survey progress for user: ${user.id}`);
    
    const progress = await this.surveysService.getProgressSummary(user.id);
    
    return {
      success: true,
      data: progress,
    };
  }

  /**
   * Get user's survey responses
   * GET /api/surveys/responses/me
   */
  @Get('responses/me')
  @ApiOperation({ summary: 'Get current user\'s survey responses' })
  @ApiOkResponse({ description: 'User responses retrieved successfully' })
  async getMyResponses(@CurrentUser() user: User) {
    this.logger.log(`Getting responses for user: ${user.id}`);
    
    const results = await this.surveysService.getSurveyResults(user.id);
    
    return {
      success: true,
      data: results,
    };
  }

  /**
   * Update a specific response
   * PUT /api/surveys/responses/:id
   */
  @Put('responses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing survey response' })
  @ApiParam({ name: 'id', description: 'Response ID to update' })
  @ApiOkResponse({ description: 'Response updated successfully' })
  @ApiNotFoundResponse({ description: 'Response not found or access denied' })
  async updateResponse(
    @Param('id', ParseUUIDPipe) responseId: string,
    @Body(new ValidationPipe({ transform: true })) responseDto: SurveyResponseDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Updating response ${responseId} for user: ${user.id}`);
    
    const updatedResponse = await this.surveysService.updateResponse(user.id, responseId, responseDto);
    
    return {
      success: true,
      message: 'Response updated successfully',
      data: updatedResponse,
    };
  }

  /**
   * Delete a specific response
   * DELETE /api/surveys/responses/:id
   */
  @Delete('responses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a survey response' })
  @ApiParam({ name: 'id', description: 'Response ID to delete' })
  @ApiOkResponse({ description: 'Response deleted successfully' })
  @ApiNotFoundResponse({ description: 'Response not found or access denied' })
  async deleteResponse(
    @Param('id', ParseUUIDPipe) responseId: string,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Deleting response ${responseId} for user: ${user.id}`);
    
    await this.surveysService.deleteResponse(user.id, responseId);
    
    return {
      success: true,
      message: 'Response deleted successfully',
    };
  }

  /**
   * Validate a response before submission
   * POST /api/surveys/responses/validate
   */
  @Post('responses/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a survey response without saving' })
  @ApiOkResponse({ description: 'Response validation completed' })
  async validateResponse(
    @Body(new ValidationPipe({ transform: true })) responseDto: SurveyResponseDto,
  ) {
    this.logger.log(`Validating response for question: ${responseDto.question_id}`);
    
    const validation = await this.surveysService.validateResponseCompliance(responseDto);
    
    return {
      success: true,
      data: validation,
    };
  }

  /**
   * Get survey analytics (Teachers and Admins only)
   * GET /api/surveys/analytics
   */
  @Get('analytics')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get survey response analytics for educators' })
  @ApiQuery({ name: 'surveyId', required: false, description: 'Specific survey ID for analytics' })
  @ApiOkResponse({ description: 'Analytics retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Access denied - requires teacher or admin role' })
  async getSurveyAnalytics(
    @Query('surveyId') surveyId?: string,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Getting survey analytics requested by: ${user.id} (${user.role})`);
    
    const analytics = await this.surveysService.getResponseAnalytics(surveyId);
    
    return {
      success: true,
      data: analytics,
    };
  }

  /**
   * Validate question content (Admins only)
   * GET /api/surveys/questions/:id/validate
   */
  @Get('questions/:id/validate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Validate question content quality and appropriateness' })
  @ApiParam({ name: 'id', description: 'Question ID to validate' })
  @ApiOkResponse({ description: 'Question validation completed' })
  @ApiForbiddenResponse({ description: 'Access denied - requires admin role' })
  async validateQuestion(
    @Param('id', ParseUUIDPipe) questionId: string,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Validating question ${questionId} by admin: ${user.id}`);
    
    const validation = await this.surveysService.validateQuestionContent(questionId);
    
    return {
      success: true,
      data: validation,
    };
  }

  /**
   * Validate entire question set (Admins only)
   * GET /api/surveys/questions/validate-set
   */
  @Get('questions/validate-set')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Validate the entire question set for balance and coverage' })
  @ApiOkResponse({ description: 'Question set validation completed' })
  @ApiForbiddenResponse({ description: 'Access denied - requires admin role' })
  async validateQuestionSet(@CurrentUser() user: User) {
    this.logger.log(`Validating question set by admin: ${user.id}`);
    
    const validation = await this.surveysService.validateQuestionSet();
    
    return {
      success: true,
      data: validation,
    };
  }

  /**
   * Get survey health metrics (Admins only)
   * GET /api/surveys/health
   */
  @Get('health')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get real-time survey system health metrics' })
  @ApiQuery({ name: 'surveyId', required: false, description: 'Specific survey ID' })
  @ApiQuery({ name: 'forceRefresh', required: false, description: 'Force refresh of cached data' })
  @ApiOkResponse({ description: 'Health metrics retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Access denied - requires admin role' })
  async getSurveyHealth(
    @Query('surveyId') surveyId?: string,
    @Query('forceRefresh') forceRefresh?: boolean,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Getting survey health metrics requested by admin: ${user.id}`);
    
    const healthMetrics = await this.monitoringService.getSurveyHealthMetrics(
      surveyId, 
      forceRefresh === true || forceRefresh === 'true'
    );
    
    return {
      success: true,
      data: healthMetrics,
    };
  }

  /**
   * Get flagged responses for review (Admins only)
   * GET /api/surveys/flagged-responses
   */
  @Get('flagged-responses')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get flagged survey responses for admin review' })
  @ApiQuery({ name: 'severity', required: false, enum: ['low', 'medium', 'high'] })
  @ApiQuery({ name: 'reviewed', required: false, description: 'Filter by review status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiOkResponse({ description: 'Flagged responses retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Access denied - requires admin role' })
  async getFlaggedResponses(
    @Query('severity') severity?: 'low' | 'medium' | 'high',
    @Query('reviewed') reviewed?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Getting flagged responses requested by admin: ${user.id}`);
    
    const filters: any = {};
    if (severity) filters.severity = severity;
    if (reviewed !== undefined) filters.reviewed = reviewed === 'true';
    
    const pagination = {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
    };
    
    const result = await this.monitoringService.getFlaggedResponses(filters, pagination);
    
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Review a flagged response (Admins only)
   * PUT /api/surveys/flagged-responses/:id/review
   */
  @Put('flagged-responses/:id/review')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Review and take action on a flagged response' })
  @ApiParam({ name: 'id', description: 'Flagged response ID' })
  @ApiOkResponse({ description: 'Response review completed successfully' })
  @ApiForbiddenResponse({ description: 'Access denied - requires admin role' })
  async reviewFlaggedResponse(
    @Param('id', ParseUUIDPipe) flaggedResponseId: string,
    @Body() reviewData: {
      action: 'approved' | 'rejected' | 'modified';
      notes?: string;
      modifications?: any;
    },
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Reviewing flagged response ${flaggedResponseId} by admin: ${user.id}`);
    
    await this.monitoringService.reviewFlaggedResponse(
      flaggedResponseId,
      user.id,
      reviewData.action,
      reviewData.notes,
      reviewData.modifications,
    );
    
    return {
      success: true,
      message: `Flagged response ${reviewData.action} successfully`,
    };
  }

  /**
   * Get quality metrics for a user (Teachers and Admins only)
   * GET /api/surveys/quality/:userId
   */
  @Get('quality/:userId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get quality metrics for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID to analyze' })
  @ApiQuery({ name: 'surveyId', required: false, description: 'Specific survey ID' })
  @ApiOkResponse({ description: 'Quality metrics retrieved successfully' })
  @ApiForbiddenResponse({ description: 'Access denied - requires teacher or admin role' })
  async getUserQualityMetrics(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('surveyId') surveyId?: string,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Getting quality metrics for user ${userId} by ${user.role}: ${user.id}`);
    
    const qualityMetrics = await this.qualityService.calculateQualityMetrics(userId, surveyId);
    
    return {
      success: true,
      data: qualityMetrics,
    };
  }

  /**
   * Get survey optimization recommendations (Admins only)
   * GET /api/surveys/:id/optimization
   */
  @Get(':id/optimization')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get optimization recommendations for a survey' })
  @ApiParam({ name: 'id', description: 'Survey ID to analyze' })
  @ApiOkResponse({ description: 'Optimization recommendations generated successfully' })
  @ApiForbiddenResponse({ description: 'Access denied - requires admin role' })
  async getSurveyOptimization(
    @Param('id', ParseUUIDPipe) surveyId: string,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Getting optimization recommendations for survey ${surveyId} by admin: ${user.id}`);
    
    const optimizations = await this.monitoringService.generateOptimizationRecommendations(surveyId);
    
    return {
      success: true,
      data: optimizations,
    };
  }

  /**
   * Process offline sync queue (System endpoint - Admins only)
   * POST /api/surveys/sync/offline-queue
   */
  @Post('sync/offline-queue')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process the offline response sync queue' })
  @ApiOkResponse({ description: 'Offline sync queue processed' })
  @ApiForbiddenResponse({ description: 'Access denied - requires admin role' })
  async processOfflineQueue(@CurrentUser() user: User) {
    this.logger.log(`Processing offline sync queue requested by admin: ${user.id}`);
    
    const result = await this.errorHandlerService.processOfflineSyncQueue();
    
    return {
      success: true,
      message: `Processed ${result.processed} responses successfully, ${result.failed} failed`,
      data: result,
    };
  }
}
