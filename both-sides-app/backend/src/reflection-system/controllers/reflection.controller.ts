/**
 * Reflection Controller
 * REST API endpoints for reflection session management, response collection,
 * media uploads, and batch operations
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
  UseInterceptors,
  UploadedFile,
  Logger,
  HttpStatus,
  HttpException,
  ValidationPipe,
  UsePipes,
  StreamableFile,
  Res
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiProduces
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReflectionResponseService } from '../services/reflection-response.service';
import { MediaService } from '../services/media.service';
import { BatchOperationsService } from '../services/batch-operations.service';
import {
  ReflectionSession,
  SessionResponse,
  ResponseContent,
  ValidationResult,
  MediaAttachment,
  SignedUploadUrl,
  ExportResult,
  BatchAnalysisResult,
  ClassReport,
  ReflectionProgress,
  SessionState
} from '../interfaces/reflection-response.interfaces';
import {
  InitializeSessionDto,
  SaveResponseDto,
  UpdateResponseDto,
  UploadMediaDto,
  ExportReflectionsDto,
  AnalyzeClassDto,
  GenerateReportDto,
  SessionPreferencesDto
} from '../dto/reflection-response.dto';

@ApiTags('Reflection Responses')
@ApiBearerAuth()
@Controller('reflections')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ReflectionController {
  private readonly logger = new Logger(ReflectionController.name);

  constructor(
    private readonly reflectionService: ReflectionResponseService,
    private readonly mediaService: MediaService,
    private readonly batchService: BatchOperationsService
  ) {}

  // =============================================
  // Session Management Endpoints
  // =============================================

  @Post('sessions')
  @ApiOperation({
    summary: 'Initialize reflection session',
    description: 'Creates a new reflection session for a user and debate'
  })
  @ApiBody({ type: InitializeSessionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session initialized successfully',
    type: ReflectionSession
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid session data' })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async initializeSession(
    @CurrentUser() user: any,
    @Body() initDto: InitializeSessionDto
  ): Promise<ReflectionSession> {
    this.logger.log(`Initializing session for user ${user.id}, debate ${initDto.debateId}`);

    try {
      const session = await this.reflectionService.initializeSession(
        user.id,
        initDto.debateId,
        initDto.promptSequenceId,
        initDto.metadata
      );

      this.logger.log(`Session initialized: ${session.id}`);
      return session;

    } catch (error) {
      this.logger.error(`Failed to initialize session: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to initialize session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('sessions/:sessionId')
  @ApiOperation({
    summary: 'Get reflection session',
    description: 'Retrieves a reflection session with current state and responses'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session retrieved successfully',
    type: ReflectionSession
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<ReflectionSession> {
    this.logger.log(`Getting session: ${sessionId} for user ${user.id}`);

    try {
      const session = await this.reflectionService.getSession(sessionId);
      
      if (!session) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }

      // Ensure user has access to this session
      if (session.userId !== user.id && !user.roles.includes('TEACHER') && !user.roles.includes('ADMIN')) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      return session;

    } catch (error) {
      this.logger.error(`Failed to get session: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put('sessions/:sessionId/pause')
  @ApiOperation({
    summary: 'Pause reflection session',
    description: 'Pauses an active reflection session'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session paused successfully',
    type: ReflectionSession
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async pauseSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<ReflectionSession> {
    this.logger.log(`Pausing session: ${sessionId}`);

    try {
      const session = await this.reflectionService.pauseSession(sessionId);
      return session;

    } catch (error) {
      this.logger.error(`Failed to pause session: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put('sessions/:sessionId/resume')
  @ApiOperation({
    summary: 'Resume reflection session',
    description: 'Resumes a paused reflection session'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session resumed successfully',
    type: ReflectionSession
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async resumeSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<ReflectionSession> {
    this.logger.log(`Resuming session: ${sessionId}`);

    try {
      const session = await this.reflectionService.resumeSession(sessionId);
      return session;

    } catch (error) {
      this.logger.error(`Failed to resume session: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('sessions/:sessionId/complete')
  @ApiOperation({
    summary: 'Complete reflection session',
    description: 'Finalizes and completes a reflection session'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session completed successfully',
    type: ReflectionSession
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async completeSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<ReflectionSession> {
    this.logger.log(`Completing session: ${sessionId}`);

    try {
      const session = await this.reflectionService.completeSession(sessionId);
      return session;

    } catch (error) {
      this.logger.error(`Failed to complete session: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Response Management Endpoints
  // =============================================

  @Post('sessions/:sessionId/responses')
  @ApiOperation({
    summary: 'Save response',
    description: 'Saves a response to a specific prompt in a reflection session'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiBody({ type: SaveResponseDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Response saved successfully',
    type: SessionResponse
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async saveResponse(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() saveDto: SaveResponseDto
  ): Promise<SessionResponse> {
    this.logger.log(`Saving response for session ${sessionId}, prompt ${saveDto.promptId}`);

    try {
      const response = await this.reflectionService.saveResponse(
        sessionId,
        saveDto.promptId,
        saveDto.response
      );

      this.logger.log(`Response saved: ${saveDto.promptId}`);
      return response;

    } catch (error) {
      this.logger.error(`Failed to save response: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('sessions/:sessionId/responses')
  @ApiOperation({
    summary: 'Get session responses',
    description: 'Retrieves all responses for a reflection session'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Responses retrieved successfully',
    type: [SessionResponse]
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getResponses(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<SessionResponse[]> {
    this.logger.log(`Getting responses for session: ${sessionId}`);

    try {
      const responses = await this.reflectionService.getResponses(sessionId);
      return responses;

    } catch (error) {
      this.logger.error(`Failed to get responses: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put('sessions/:sessionId/responses/:responseId')
  @ApiOperation({
    summary: 'Update response',
    description: 'Updates an existing response in a reflection session'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'responseId', description: 'Response ID' })
  @ApiBody({ type: UpdateResponseDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response updated successfully',
    type: SessionResponse
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async updateResponse(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Param('responseId') responseId: string,
    @Body() updateDto: UpdateResponseDto
  ): Promise<SessionResponse> {
    this.logger.log(`Updating response ${responseId} in session ${sessionId}`);

    try {
      const response = await this.reflectionService.updateResponse(
        sessionId,
        responseId,
        updateDto.updates
      );

      return response;

    } catch (error) {
      this.logger.error(`Failed to update response: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete('sessions/:sessionId/responses/:responseId')
  @ApiOperation({
    summary: 'Delete response',
    description: 'Deletes a response from a reflection session'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'responseId', description: 'Response ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Response deleted successfully' })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async deleteResponse(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Param('responseId') responseId: string
  ): Promise<void> {
    this.logger.log(`Deleting response ${responseId} from session ${sessionId}`);

    try {
      await this.reflectionService.deleteResponse(sessionId, responseId);

    } catch (error) {
      this.logger.error(`Failed to delete response: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Media Upload Endpoints
  // =============================================

  @Post('media/upload-url')
  @ApiOperation({
    summary: 'Get signed upload URL',
    description: 'Generates a signed URL for direct client-side media upload'
  })
  @ApiBody({ type: UploadMediaDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Signed upload URL generated successfully',
    type: SignedUploadUrl
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getSignedUploadUrl(
    @CurrentUser() user: any,
    @Body() uploadDto: UploadMediaDto
  ): Promise<SignedUploadUrl> {
    this.logger.log(`Generating signed upload URL for: ${uploadDto.filename}`);

    try {
      const signedUrl = await this.mediaService.getSignedUploadUrl(
        uploadDto.filename,
        uploadDto.mimeType,
        uploadDto.size
      );

      return signedUrl;

    } catch (error) {
      this.logger.error(`Failed to generate signed upload URL: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('media/upload')
  @ApiOperation({
    summary: 'Upload media file',
    description: 'Directly uploads a media file to the server'
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Media uploaded successfully',
    type: MediaAttachment
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async uploadMedia(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: any = {}
  ): Promise<MediaAttachment> {
    this.logger.log(`Uploading media file: ${file.originalname}`);

    try {
      if (!file) {
        throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
      }

      const mediaFile = {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };

      const attachment = await this.mediaService.uploadMedia(mediaFile, {
        originalName: file.originalname,
        uploadSource: 'direct',
        ...metadata
      });

      this.logger.log(`Media uploaded: ${attachment.id}`);
      return attachment;

    } catch (error) {
      this.logger.error(`Failed to upload media: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('media/:attachmentId/download')
  @ApiOperation({
    summary: 'Download media file',
    description: 'Downloads a media file with proper authorization'
  })
  @ApiParam({ name: 'attachmentId', description: 'Attachment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Media downloaded successfully' })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async downloadMedia(
    @CurrentUser() user: any,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    this.logger.log(`Downloading media: ${attachmentId}`);

    try {
      const downloadUrl = await this.mediaService.getSignedDownloadUrl(attachmentId);
      
      // In production, this would stream the file content
      // For now, redirect to the signed URL
      res.redirect(downloadUrl);

    } catch (error) {
      this.logger.error(`Failed to download media: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete('media/:attachmentId')
  @ApiOperation({
    summary: 'Delete media file',
    description: 'Deletes a media file and its metadata'
  })
  @ApiParam({ name: 'attachmentId', description: 'Attachment ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Media deleted successfully' })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async deleteMedia(
    @CurrentUser() user: any,
    @Param('attachmentId') attachmentId: string
  ): Promise<void> {
    this.logger.log(`Deleting media: ${attachmentId}`);

    try {
      await this.mediaService.deleteMedia(attachmentId);

    } catch (error) {
      this.logger.error(`Failed to delete media: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Session Recovery and Auto-save
  // =============================================

  @Post('sessions/recover')
  @ApiOperation({
    summary: 'Recover session',
    description: 'Attempts to recover an active session for the user and debate'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        debateId: { type: 'string', description: 'Debate ID to recover session for' }
      },
      required: ['debateId']
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session recovered successfully or no session found',
    type: ReflectionSession,
    nullable: true
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async recoverSession(
    @CurrentUser() user: any,
    @Body('debateId') debateId: string
  ): Promise<ReflectionSession | null> {
    this.logger.log(`Attempting to recover session for user ${user.id}, debate ${debateId}`);

    try {
      const session = await this.reflectionService.recoverSession(user.id, debateId);
      
      if (session) {
        this.logger.log(`Recovered session: ${session.id}`);
      } else {
        this.logger.log('No recoverable session found');
      }

      return session;

    } catch (error) {
      this.logger.error(`Failed to recover session: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('sessions/:sessionId/auto-save')
  @ApiOperation({
    summary: 'Auto-save session data',
    description: 'Saves partial session data for recovery purposes'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'Partial session data to save' }
      },
      required: ['data']
    }
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Auto-save completed successfully' })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async autoSave(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body('data') data: any
  ): Promise<{ success: boolean }> {
    try {
      await this.reflectionService.autoSave(sessionId, data);
      return { success: true };

    } catch (error) {
      this.logger.warn(`Auto-save failed for session ${sessionId}: ${error.message}`);
      return { success: false };
    }
  }

  // =============================================
  // Teacher Batch Operations
  // =============================================

  @Post('export')
  @ApiOperation({
    summary: 'Export reflections',
    description: 'Exports reflection data in various formats for analysis'
  })
  @ApiBody({ type: ExportReflectionsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Export initiated successfully',
    type: ExportResult
  })
  @Roles('TEACHER', 'ADMIN')
  async exportReflections(
    @CurrentUser() user: any,
    @Body() exportDto: ExportReflectionsDto
  ): Promise<ExportResult> {
    this.logger.log(`Starting export for user ${user.id}`);

    try {
      const result = await this.batchService.exportReflections(exportDto);
      
      this.logger.log(`Export completed: ${result.id}`);
      return result;

    } catch (error) {
      this.logger.error(`Export failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('analyze-class')
  @ApiOperation({
    summary: 'Analyze class reflections',
    description: 'Performs comprehensive analysis of class reflection data'
  })
  @ApiBody({ type: AnalyzeClassDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Analysis completed successfully',
    type: BatchAnalysisResult
  })
  @Roles('TEACHER', 'ADMIN')
  async analyzeClass(
    @CurrentUser() user: any,
    @Body() analyzeDto: AnalyzeClassDto
  ): Promise<BatchAnalysisResult> {
    this.logger.log(`Starting class analysis for class ${analyzeDto.classId}`);

    try {
      const result = await this.batchService.analyzeClassReflections(
        analyzeDto.classId,
        analyzeDto.filters || {}
      );

      this.logger.log(`Class analysis completed for: ${analyzeDto.classId}`);
      return result;

    } catch (error) {
      this.logger.error(`Class analysis failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('generate-report')
  @ApiOperation({
    summary: 'Generate class report',
    description: 'Generates a comprehensive class report with analytics and insights'
  })
  @ApiBody({ type: GenerateReportDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report generated successfully',
    type: ClassReport
  })
  @Roles('TEACHER', 'ADMIN')
  async generateReport(
    @CurrentUser() user: any,
    @Body() reportDto: GenerateReportDto
  ): Promise<ClassReport> {
    this.logger.log(`Generating report for class ${reportDto.classId}`);

    try {
      const report = await this.batchService.generateClassReport(
        reportDto.classId,
        reportDto.options
      );

      this.logger.log(`Report generated: ${report.id}`);
      return report;

    } catch (error) {
      this.logger.error(`Report generation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Progress and Analytics Endpoints
  // =============================================

  @Get('sessions/:sessionId/progress')
  @ApiOperation({
    summary: 'Get session progress',
    description: 'Retrieves progress metrics for a reflection session'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress retrieved successfully',
    type: ReflectionProgress
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async getProgress(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<ReflectionProgress> {
    this.logger.log(`Getting progress for session: ${sessionId}`);

    try {
      // TODO: Implement progress calculation
      const progress: ReflectionProgress = {
        sessionId,
        userId: user.id,
        completionPercentage: 0.75,
        currentStep: 8,
        totalSteps: 10,
        timeSpent: 1800, // 30 minutes
        estimatedTimeRemaining: 600, // 10 minutes
        quality: {
          averageResponseQuality: 0.8,
          thoughtfulnessScore: 0.75,
          depthScore: 0.7,
          consistencyScore: 0.85,
          improvementTrend: 'improving'
        },
        engagement: {
          responseRate: 0.9,
          averageResponseTime: 180, // 3 minutes
          skipRate: 0.1,
          revisionCount: 2,
          mediaUsage: 0.3,
          attentionScore: 0.8
        },
        milestones: []
      };

      return progress;

    } catch (error) {
      this.logger.error(`Failed to get progress: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('sessions/:sessionId/validate')
  @ApiOperation({
    summary: 'Validate session responses',
    description: 'Validates all responses in a session and provides improvement suggestions'
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validation completed successfully',
    type: ValidationResult
  })
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  async validateSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string
  ): Promise<ValidationResult> {
    this.logger.log(`Validating session: ${sessionId}`);

    try {
      const session = await this.reflectionService.getSession(sessionId);
      if (!session) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }

      // TODO: Implement comprehensive session validation
      const validationResult: ValidationResult = {
        isValid: true,
        score: 0.8,
        level: 'MODERATE' as any,
        checks: [],
        suggestions: [],
        autoCorrections: []
      };

      return validationResult;

    } catch (error) {
      this.logger.error(`Validation failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
