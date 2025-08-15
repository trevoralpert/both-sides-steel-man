import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/rbac/decorators/current-user.decorator';
import { AttachmentService } from './services/attachment.service';
import { LinkPreviewService } from './services/link-preview.service';
import { ContentFormattingService } from './services/content-formatting.service';
import { 
  AttachmentUploadDto, 
  AttachmentUploadResponseDto,
  LinkPreviewDto,
  FormattedContentDto,
  AttachmentType,
} from './dto/rich-content.dto';

@Controller('conversations/rich-content')
@UseGuards(JwtAuthGuard)
export class RichContentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly linkPreviewService: LinkPreviewService,
    private readonly contentFormattingService: ContentFormattingService,
  ) {}

  // =============================================================================
  // ATTACHMENT ENDPOINTS
  // =============================================================================

  /**
   * Generate pre-signed URL for attachment upload
   */
  @Post('attachments/:conversationId/upload-url')
  async generateAttachmentUploadUrl(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: any,
    @Body() uploadDto: AttachmentUploadDto,
  ): Promise<AttachmentUploadResponseDto> {
    return this.attachmentService.generateUploadUrl(user.id, conversationId, uploadDto);
  }

  /**
   * Confirm attachment upload completion
   */
  @Post('attachments/:attachmentId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmAttachmentUpload(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: any,
  ) {
    return this.attachmentService.confirmUpload(attachmentId, user.id);
  }

  /**
   * Get attachment details
   */
  @Get('attachments/:attachmentId')
  async getAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: any,
  ) {
    return this.attachmentService.getAttachment(attachmentId, user.id);
  }

  /**
   * Delete an attachment
   */
  @Delete('attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: any,
  ) {
    await this.attachmentService.deleteAttachment(attachmentId, user.id);
  }

  /**
   * Get all attachments for a conversation
   */
  @Get('conversations/:conversationId/attachments')
  async getConversationAttachments(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: any,
    @Query('type') type?: string,
  ) {
    const attachmentType = type ? (type as AttachmentType) : undefined;
    return this.attachmentService.getConversationAttachments(conversationId, user.id, attachmentType);
  }

  // =============================================================================
  // LINK PREVIEW ENDPOINTS
  // =============================================================================

  /**
   * Generate link preview for a single URL
   */
  @Post('link-preview')
  async generateLinkPreview(
    @Body('url') url: string,
  ): Promise<LinkPreviewDto> {
    if (!url) {
      throw new BadRequestException('URL is required');
    }

    return this.linkPreviewService.generateLinkPreview(url);
  }

  /**
   * Generate link previews for multiple URLs
   */
  @Post('link-previews')
  async generateLinkPreviews(
    @Body('urls') urls: string[],
  ): Promise<LinkPreviewDto[]> {
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new BadRequestException('URLs array is required');
    }

    if (urls.length > 10) {
      throw new BadRequestException('Maximum 10 URLs allowed per request');
    }

    return this.linkPreviewService.generateLinkPreviews(urls);
  }

  /**
   * Validate educational value of URLs
   */
  @Post('link-previews/validate-educational')
  async validateEducationalSources(
    @Body('urls') urls: string[],
  ) {
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new BadRequestException('URLs array is required');
    }

    return this.linkPreviewService.validateEducationalSources(urls);
  }

  // =============================================================================
  // CONTENT FORMATTING ENDPOINTS
  // =============================================================================

  /**
   * Parse markdown content and generate formatted output
   */
  @Post('format-content')
  async formatContent(
    @Body('content') content: string,
  ): Promise<FormattedContentDto> {
    if (!content) {
      throw new BadRequestException('Content is required');
    }

    return this.contentFormattingService.parseMarkdown(content);
  }

  /**
   * Sanitize content for safety
   */
  @Post('sanitize-content')
  async sanitizeContent(
    @Body('content') content: string,
  ): Promise<{ sanitizedContent: string }> {
    if (!content) {
      throw new BadRequestException('Content is required');
    }

    const sanitized = this.contentFormattingService.sanitizeContent(content);
    return { sanitizedContent: sanitized };
  }

  /**
   * Extract mentions from content
   */
  @Post('extract-mentions')
  async extractMentions(
    @Body('content') content: string,
  ): Promise<{ mentions: string[] }> {
    if (!content) {
      throw new BadRequestException('Content is required');
    }

    const mentions = this.contentFormattingService.extractMentions(content);
    return { mentions };
  }

  /**
   * Extract links from content
   */
  @Post('extract-links')
  async extractLinks(
    @Body('content') content: string,
  ): Promise<{ links: string[] }> {
    if (!content) {
      throw new BadRequestException('Content is required');
    }

    const links = this.contentFormattingService.extractLinks(content);
    return { links };
  }

  /**
   * Validate content for debate appropriateness
   */
  @Post('validate-debate-content')
  async validateDebateContent(
    @Body('content') content: FormattedContentDto,
  ): Promise<{ isValid: boolean; warnings: string[] }> {
    if (!content) {
      throw new BadRequestException('Content is required');
    }

    return this.contentFormattingService.validateDebateContent(content);
  }

  /**
   * Generate content summary for notifications
   */
  @Post('generate-summary')
  async generateContentSummary(
    @Body('content') content: FormattedContentDto,
    @Body('maxLength') maxLength?: number,
  ): Promise<{ summary: string }> {
    if (!content) {
      throw new BadRequestException('Content is required');
    }

    const summary = this.contentFormattingService.generateContentSummary(
      content, 
      maxLength || 150
    );
    return { summary };
  }

  // =============================================================================
  // UTILITY ENDPOINTS
  // =============================================================================

  /**
   * Get supported attachment types and limits
   */
  @Get('attachment-config')
  getAttachmentConfig() {
    return {
      maxFileSizes: {
        image: 10 * 1024 * 1024, // 10MB
        file: 50 * 1024 * 1024,  // 50MB
      },
      allowedMimeTypes: {
        image: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
        ],
        file: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
          'text/rtf',
        ],
      },
      supportedFormatting: [
        'bold', 'italic', 'underline', 'strikethrough',
        'code', 'codeBlock', 'quote', 'bulleted-list', 'numbered-list'
      ],
    };
  }

  /**
   * Health check for rich content services
   */
  @Get('_health')
  getRichContentHealth() {
    return {
      service: 'Rich Content API',
      status: 'operational',
      timestamp: new Date().toISOString(),
      capabilities: [
        'attachment-upload',
        'link-preview-generation',
        'markdown-parsing',
        'content-sanitization',
        'mention-extraction',
        'educational-source-validation',
      ],
      version: 'Phase 5.2.3',
    };
  }
}
