/**
 * Reflection Prompt Controller
 * Provides REST API endpoints for generating and managing reflection prompts
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
  Logger,
  HttpStatus,
  HttpException,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReflectionPromptService } from '../services/reflection-prompt.service';
import { PromptTemplateManagerService } from '../services/prompt-template-manager.service';
import { PromptPersonalizationService } from '../services/prompt-personalization.service';
import {
  PromptGenerationContext,
  GeneratedPromptSequence,
  SequencedPrompt,
  PromptTemplate,
  PromptCategory,
  QuestionType,
  PromptDifficulty,
  AgeGroup,
  Language,
  TemplateFilters,
  ABTestConfiguration,
  ABTestResult,
  PromptAnalytics,
  DateRange
} from '../interfaces/prompt.interfaces';
import {
  GeneratePromptSequenceDto,
  GetNextPromptDto,
  AdaptPromptDto,
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
  TemplateFiltersDto,
  ABTestConfigurationDto,
  AnalyticsQueryDto
} from '../dto/prompt-management.dto';

@ApiTags('Reflection Prompts')
@ApiBearerAuth()
@Controller('reflection/prompts')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ReflectionPromptController {
  private readonly logger = new Logger(ReflectionPromptController.name);

  constructor(
    private readonly promptService: ReflectionPromptService,
    private readonly templateManager: PromptTemplateManagerService,
    private readonly personalizationService: PromptPersonalizationService
  ) {}

  // =============================================
  // Prompt Generation Endpoints
  // =============================================

  @Post('generate-sequence')
  @ApiOperation({
    summary: 'Generate personalized prompt sequence',
    description: 'Creates a personalized sequence of reflection prompts based on user context and debate performance'
  })
  @ApiBody({ type: GeneratePromptSequenceDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Prompt sequence generated successfully',
    type: GeneratedPromptSequence
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data' })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async generatePromptSequence(
    @CurrentUser() user: any,
    @Body() generateDto: GeneratePromptSequenceDto
  ): Promise<GeneratedPromptSequence> {
    this.logger.log(`Generating prompt sequence for user ${user.id}, debate ${generateDto.debateId}`);

    try {
      // Build generation context
      const context: PromptGenerationContext = {
        userId: user.id,
        debateId: generateDto.debateId,
        userProfile: generateDto.userProfile || await this.getDefaultUserProfile(user),
        debatePerformance: generateDto.debatePerformance,
        educationalObjectives: generateDto.educationalObjectives || [],
        sessionPreferences: generateDto.sessionPreferences || this.getDefaultSessionPreferences(),
        previousReflections: generateDto.previousReflections || []
      };

      const sequence = await this.promptService.generatePromptSequence(context);

      this.logger.log(`Generated sequence ${sequence.sequenceId} with ${sequence.prompts.length} prompts`);
      return sequence;

    } catch (error) {
      this.logger.error(`Failed to generate prompt sequence: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to generate prompt sequence: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('sequence/:sequenceId/next')
  @ApiOperation({
    summary: 'Get next prompt in sequence',
    description: 'Retrieves the next prompt in an active reflection sequence'
  })
  @ApiParam({ name: 'sequenceId', description: 'Unique sequence identifier' })
  @ApiQuery({ name: 'currentPromptId', required: false, description: 'ID of current prompt (optional)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Next prompt retrieved successfully',
    type: SequencedPrompt
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Sequence not found or expired' })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getNextPrompt(
    @CurrentUser() user: any,
    @Param('sequenceId') sequenceId: string,
    @Query('currentPromptId') currentPromptId?: string
  ): Promise<SequencedPrompt | null> {
    this.logger.log(`Getting next prompt for sequence ${sequenceId}, current: ${currentPromptId || 'start'}`);

    try {
      const nextPrompt = await this.promptService.getNextPrompt(sequenceId, currentPromptId);
      
      if (!nextPrompt) {
        this.logger.warn(`No next prompt found for sequence ${sequenceId}`);
        return null;
      }

      this.logger.log(`Retrieved next prompt ${nextPrompt.id} for sequence ${sequenceId}`);
      return nextPrompt;

    } catch (error) {
      this.logger.error(`Failed to get next prompt: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get next prompt: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('adapt')
  @ApiOperation({
    summary: 'Adapt prompts based on response',
    description: 'Generates adaptive follow-up prompts based on user response'
  })
  @ApiBody({ type: AdaptPromptDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Adaptive prompts generated successfully',
    type: [SequencedPrompt]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async adaptPromptBasedOnResponse(
    @CurrentUser() user: any,
    @Body() adaptDto: AdaptPromptDto
  ): Promise<SequencedPrompt[]> {
    this.logger.log(`Adapting prompts based on response to prompt ${adaptDto.promptId}`);

    try {
      const adaptedPrompts = await this.promptService.adaptPromptBasedOnResponse(
        adaptDto.promptId,
        adaptDto.response
      );

      this.logger.log(`Generated ${adaptedPrompts.length} adaptive prompts`);
      return adaptedPrompts;

    } catch (error) {
      this.logger.error(`Failed to adapt prompts: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to adapt prompts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // =============================================
  // Template Management Endpoints
  // =============================================

  @Get('templates')
  @ApiOperation({
    summary: 'Get prompt templates',
    description: 'Retrieves prompt templates filtered by category and other criteria'
  })
  @ApiQuery({ name: 'category', enum: PromptCategory, description: 'Filter by category' })
  @ApiQuery({ name: 'ageGroup', enum: AgeGroup, required: false, description: 'Filter by age group' })
  @ApiQuery({ name: 'difficulty', enum: PromptDifficulty, required: false, description: 'Filter by difficulty' })
  @ApiQuery({ name: 'questionType', enum: QuestionType, required: false, description: 'Filter by question type' })
  @ApiQuery({ name: 'language', enum: Language, required: false, description: 'Filter by language' })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false, description: 'Filter by active status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
    type: [PromptTemplate]
  })
  @Roles('TEACHER', 'ADMIN')
  async getTemplatesByCategory(
    @Query('category') category: PromptCategory,
    @Query('ageGroup') ageGroup?: AgeGroup,
    @Query('difficulty') difficulty?: PromptDifficulty,
    @Query('questionType') questionType?: QuestionType,
    @Query('language') language?: Language,
    @Query('isActive') isActive?: boolean
  ): Promise<PromptTemplate[]> {
    this.logger.log(`Getting templates for category: ${category}`);

    try {
      const filters: TemplateFilters = {
        ageGroup,
        difficulty,
        questionType,
        language,
        isActive
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      const templates = await this.templateManager.getTemplatesByCategory(category, filters);
      
      this.logger.log(`Retrieved ${templates.length} templates for category ${category}`);
      return templates;

    } catch (error) {
      this.logger.error(`Failed to get templates: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get templates: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('templates')
  @ApiOperation({
    summary: 'Create prompt template',
    description: 'Creates a new prompt template'
  })
  @ApiBody({ type: CreatePromptTemplateDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
    type: PromptTemplate
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid template data' })
  @Roles('TEACHER', 'ADMIN')
  async createTemplate(
    @CurrentUser() user: any,
    @Body() createDto: CreatePromptTemplateDto
  ): Promise<PromptTemplate> {
    this.logger.log(`Creating template for category: ${createDto.templateType}`);

    try {
      const template = await this.templateManager.createTemplate(createDto);
      
      this.logger.log(`Created template with ID: ${template.id}`);
      return template;

    } catch (error) {
      this.logger.error(`Failed to create template: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to create template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('templates/:id')
  @ApiOperation({
    summary: 'Update prompt template',
    description: 'Updates an existing prompt template'
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiBody({ type: UpdatePromptTemplateDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template updated successfully',
    type: PromptTemplate
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Template not found' })
  @Roles('TEACHER', 'ADMIN')
  async updateTemplate(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdatePromptTemplateDto
  ): Promise<PromptTemplate> {
    this.logger.log(`Updating template: ${id}`);

    try {
      const template = await this.templateManager.updateTemplate(id, updateDto);
      
      this.logger.log(`Updated template: ${template.id}`);
      return template;

    } catch (error) {
      this.logger.error(`Failed to update template: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to update template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('templates/:id')
  @ApiOperation({
    summary: 'Delete prompt template',
    description: 'Soft deletes a prompt template (marks as inactive)'
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Template deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Template not found' })
  @Roles('ADMIN')
  async deleteTemplate(
    @CurrentUser() user: any,
    @Param('id') id: string
  ): Promise<void> {
    this.logger.log(`Deleting template: ${id}`);

    try {
      await this.templateManager.deleteTemplate(id);
      this.logger.log(`Deleted template: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to delete template: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to delete template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('templates/:id/versions')
  @ApiOperation({
    summary: 'Get template versions',
    description: 'Retrieves all versions of a specific template'
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template versions retrieved successfully',
    type: [PromptTemplate]
  })
  @Roles('TEACHER', 'ADMIN')
  async getTemplateVersions(
    @Param('id') id: string
  ): Promise<PromptTemplate[]> {
    this.logger.log(`Getting versions for template: ${id}`);

    try {
      const versions = await this.templateManager.getTemplateVersions(id);
      
      this.logger.log(`Retrieved ${versions.length} versions for template ${id}`);
      return versions;

    } catch (error) {
      this.logger.error(`Failed to get template versions: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get template versions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('templates/:id/activate')
  @ApiOperation({
    summary: 'Activate template version',
    description: 'Activates a specific version of a template'
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiQuery({ name: 'version', required: false, description: 'Version to activate (latest if not specified)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template activated successfully',
    type: PromptTemplate
  })
  @Roles('TEACHER', 'ADMIN')
  async activateTemplate(
    @Param('id') id: string,
    @Query('version') version?: string
  ): Promise<PromptTemplate> {
    this.logger.log(`Activating template: ${id}, version: ${version || 'latest'}`);

    try {
      const template = await this.templateManager.activateTemplate(id, version);
      
      this.logger.log(`Activated template: ${template.id}`);
      return template;

    } catch (error) {
      this.logger.error(`Failed to activate template: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to activate template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // =============================================
  // A/B Testing Endpoints
  // =============================================

  @Post('ab-tests')
  @ApiOperation({
    summary: 'Start A/B test',
    description: 'Starts a new A/B test for prompt templates'
  })
  @ApiBody({ type: ABTestConfigurationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'A/B test started successfully',
    type: ABTestResult
  })
  @Roles('ADMIN')
  async startABTest(
    @CurrentUser() user: any,
    @Body() testConfig: ABTestConfigurationDto
  ): Promise<ABTestResult> {
    this.logger.log(`Starting A/B test: ${testConfig.testName}`);

    try {
      const result = await this.templateManager.runABTest(testConfig);
      
      this.logger.log(`Started A/B test: ${testConfig.testName}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to start A/B test: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to start A/B test: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('ab-tests/:testName/results')
  @ApiOperation({
    summary: 'Get A/B test results',
    description: 'Retrieves results and analysis for an A/B test'
  })
  @ApiParam({ name: 'testName', description: 'A/B test name' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'A/B test results retrieved successfully',
    type: ABTestResult
  })
  @Roles('ADMIN')
  async getABTestResults(
    @Param('testName') testName: string
  ): Promise<ABTestResult> {
    this.logger.log(`Getting A/B test results: ${testName}`);

    try {
      const result = await this.templateManager.getABTestResults(testName);
      
      this.logger.log(`Retrieved A/B test results: ${testName}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to get A/B test results: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get A/B test results: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // =============================================
  // Analytics Endpoints
  // =============================================

  @Get('templates/:id/analytics')
  @ApiOperation({
    summary: 'Get template analytics',
    description: 'Retrieves analytics and insights for a specific template'
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiQuery({ name: 'startDate', description: 'Start date for analytics period (ISO string)' })
  @ApiQuery({ name: 'endDate', description: 'End date for analytics period (ISO string)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template analytics retrieved successfully',
    type: PromptAnalytics
  })
  @Roles('TEACHER', 'ADMIN')
  async getTemplateAnalytics(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<PromptAnalytics> {
    this.logger.log(`Getting analytics for template: ${id}`);

    try {
      const period: DateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };

      const analytics = await this.templateManager.getTemplateAnalytics(id, period);
      
      this.logger.log(`Retrieved analytics for template: ${id}`);
      return analytics;

    } catch (error) {
      this.logger.error(`Failed to get template analytics: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get template analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // =============================================
  // Personalization Endpoints
  // =============================================

  @Post('personalize/:templateId')
  @ApiOperation({
    summary: 'Preview personalized prompt',
    description: 'Generates a personalized version of a template for preview purposes'
  })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiBody({ type: GeneratePromptSequenceDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Personalized prompt generated successfully'
  })
  @Roles('TEACHER', 'ADMIN')
  async previewPersonalizedPrompt(
    @Param('templateId') templateId: string,
    @Body() contextDto: GeneratePromptSequenceDto
  ): Promise<{ personalizedText: string; personalizationScore: number }> {
    this.logger.log(`Previewing personalized prompt for template: ${templateId}`);

    try {
      // Get template (simulate for now)
      const template: PromptTemplate = {
        id: templateId,
        templateType: PromptCategory.GENERAL_REFLECTION,
        questionType: QuestionType.OPEN_ENDED,
        promptText: 'How do you feel about {{DEBATE_TOPIC}}? What {{STRONGEST_MOMENT}} stood out to you?',
        targetAudience: AgeGroup.MIDDLE_SCHOOL,
        difficultyLevel: PromptDifficulty.INTERMEDIATE,
        isActive: true,
        version: '1.0.0',
        metadata: { estimatedTimeMinutes: 5, skillFocus: [] },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context: PromptGenerationContext = {
        userId: 'preview',
        debateId: contextDto.debateId,
        userProfile: contextDto.userProfile,
        debatePerformance: contextDto.debatePerformance,
        educationalObjectives: contextDto.educationalObjectives || [],
        sessionPreferences: contextDto.sessionPreferences || this.getDefaultSessionPreferences(),
        previousReflections: contextDto.previousReflections || []
      };

      const { personalizedText } = await this.personalizationService.personalizePrompt(template, context);
      const personalizationScore = await this.personalizationService.calculatePersonalizationScore(template, context);

      return { personalizedText, personalizationScore };

    } catch (error) {
      this.logger.error(`Failed to preview personalized prompt: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to preview personalized prompt: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // =============================================
  // Private Helper Methods
  // =============================================

  private async getDefaultUserProfile(user: any): Promise<any> {
    // TODO: Fetch actual user profile from database
    return {
      ageGroup: AgeGroup.MIDDLE_SCHOOL,
      experienceLevel: PromptDifficulty.BEGINNER,
      preferredLanguage: Language.ENGLISH,
      beliefProfile: {
        ideologyScores: {},
        plasticityScore: 0.5,
        confidenceLevel: 0.5
      },
      learningGoals: [],
      accessibilityNeeds: []
    };
  }

  private getDefaultSessionPreferences(): any {
    return {
      maxQuestions: 10,
      estimatedTimeMinutes: 30,
      preferredQuestionTypes: [QuestionType.OPEN_ENDED, QuestionType.RATING_SCALE],
      avoidCategories: [],
      includeGameification: true,
      allowSkipping: false
    };
  }
}
