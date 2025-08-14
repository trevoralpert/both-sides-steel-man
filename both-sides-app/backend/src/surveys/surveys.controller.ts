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

  constructor(private readonly surveysService: SurveysService) {}

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
}
