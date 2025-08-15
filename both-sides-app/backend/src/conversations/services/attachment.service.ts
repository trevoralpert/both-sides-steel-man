import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  AttachmentUploadDto, 
  AttachmentUploadResponseDto, 
  AttachmentDto, 
  AttachmentType,
  AttachmentMetadataDto,
} from '../dto/rich-content.dto';
import { ValidationResult } from '../dto/validation-result.dto';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class AttachmentService {
  private readonly maxFileSizes = {
    image: 10 * 1024 * 1024, // 10MB for images
    file: 50 * 1024 * 1024,  // 50MB for documents
  };

  private readonly allowedMimeTypes = {
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
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate attachment upload request
   */
  validateAttachmentUpload(uploadDto: AttachmentUploadDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Determine attachment type based on MIME type
    const attachmentType = this.determineAttachmentType(uploadDto.mimeType);
    
    if (!attachmentType) {
      errors.push(`Unsupported file type: ${uploadDto.mimeType}`);
      return ValidationResult.invalid(errors);
    }

    // Check MIME type is allowed
    const allowedTypes = this.allowedMimeTypes[attachmentType];
    if (!allowedTypes.includes(uploadDto.mimeType)) {
      errors.push(`MIME type ${uploadDto.mimeType} not allowed for ${attachmentType}s`);
    }

    // Check file size
    const maxSize = this.maxFileSizes[attachmentType];
    if (uploadDto.size > maxSize) {
      errors.push(`File size ${this.formatFileSize(uploadDto.size)} exceeds maximum of ${this.formatFileSize(maxSize)}`);
    }

    // Check filename
    if (!this.isValidFilename(uploadDto.filename)) {
      errors.push('Invalid filename. Use only alphanumeric characters, spaces, hyphens, underscores, and periods');
    }

    // Warn about large files
    if (uploadDto.size > maxSize * 0.8) {
      warnings.push(`Large file size may slow down debate experience`);
    }

    // Validate educational content for certain file types
    if (attachmentType === 'image') {
      const imageWarnings = this.validateImageContent(uploadDto);
      warnings.push(...imageWarnings);
    }

    return errors.length === 0 
      ? ValidationResult.valid(warnings) 
      : ValidationResult.invalid(errors, warnings);
  }

  /**
   * Generate pre-signed upload URL for attachment
   */
  async generateUploadUrl(
    userId: string,
    conversationId: string,
    uploadDto: AttachmentUploadDto,
  ): Promise<AttachmentUploadResponseDto> {
    // Validate the upload request
    const validation = this.validateAttachmentUpload(uploadDto);
    if (!validation.isValid) {
      throw new BadRequestException(`Upload validation failed: ${validation.errors.join(', ')}`);
    }

    // Verify user has access to the conversation
    await this.verifyConversationAccess(conversationId, userId);

    // Generate unique attachment ID and paths
    const attachmentId = this.generateAttachmentId();
    const attachmentType = this.determineAttachmentType(uploadDto.mimeType);
    const fileExtension = path.extname(uploadDto.filename);
    const sanitizedFilename = this.sanitizeFilename(uploadDto.filename);
    
    // Generate storage paths
    const storagePath = `conversations/${conversationId}/attachments/${attachmentId}${fileExtension}`;
    const thumbnailPath = this.shouldGenerateThumbnail(uploadDto.mimeType) 
      ? `conversations/${conversationId}/thumbnails/${attachmentId}_thumb.jpg`
      : undefined;

    // In a real implementation, you would:
    // 1. Generate pre-signed URLs for cloud storage (AWS S3, Google Cloud, etc.)
    // 2. Store attachment metadata in database
    // 3. Set up post-upload processing (thumbnail generation, virus scanning, etc.)

    // Mock implementation - generate URLs
    const uploadUrl = `https://storage.example.com/upload/${attachmentId}`;
    const accessUrl = `https://storage.example.com/files/${storagePath}`;

    // Store attachment record in database
    await this.createAttachmentRecord({
      id: attachmentId,
      userId,
      conversationId,
      filename: sanitizedFilename,
      originalFilename: uploadDto.filename,
      mimeType: uploadDto.mimeType,
      size: uploadDto.size,
      storagePath,
      thumbnailPath,
      metadata: uploadDto.metadata,
      status: 'pending_upload',
    });

    return {
      attachmentId,
      uploadUrl,
      accessUrl,
      filename: sanitizedFilename,
      maxSizeBytes: this.maxFileSizes[attachmentType!],
      allowedMimeTypes: this.allowedMimeTypes[attachmentType!],
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    };
  }

  /**
   * Confirm attachment upload completion
   */
  async confirmUpload(attachmentId: string, userId: string): Promise<AttachmentDto> {
    const attachment = await this.getAttachmentRecord(attachmentId);
    
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    // In a real implementation, you would:
    // 1. Verify the file was actually uploaded to storage
    // 2. Run virus scanning
    // 3. Generate thumbnails for images/videos
    // 4. Extract metadata (dimensions, duration, etc.)

    // Update attachment status
    await this.updateAttachmentStatus(attachmentId, 'uploaded');

    // Generate thumbnail for images
    if (this.shouldGenerateThumbnail(attachment.mimeType)) {
      // Mock thumbnail generation
      await this.generateThumbnail(attachmentId, attachment.storagePath);
    }

    return this.transformToAttachmentDto(attachment);
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.getAttachmentRecord(attachmentId);
    
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    // In a real implementation, you would:
    // 1. Delete files from cloud storage
    // 2. Delete thumbnails
    // 3. Update any message references

    // Mark as deleted
    await this.updateAttachmentStatus(attachmentId, 'deleted');
  }

  /**
   * Get attachment details
   */
  async getAttachment(attachmentId: string, userId: string): Promise<AttachmentDto> {
    const attachment = await this.getAttachmentRecord(attachmentId);
    
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Verify user has access to the conversation
    await this.verifyConversationAccess(attachment.conversationId, userId);

    return this.transformToAttachmentDto(attachment);
  }

  /**
   * Get attachments for a conversation
   */
  async getConversationAttachments(
    conversationId: string,
    userId: string,
    attachmentType?: AttachmentType,
  ): Promise<AttachmentDto[]> {
    // Verify user has access to the conversation
    await this.verifyConversationAccess(conversationId, userId);

    // In a real implementation, this would query a dedicated attachments table
    // For now, we'll return a mock implementation
    return [];
  }

  private determineAttachmentType(mimeType: string): AttachmentType | null {
    if (this.allowedMimeTypes.image.includes(mimeType)) {
      return AttachmentType.IMAGE;
    }
    if (this.allowedMimeTypes.file.includes(mimeType)) {
      return AttachmentType.FILE;
    }
    return null;
  }

  private isValidFilename(filename: string): boolean {
    // Allow alphanumeric characters, spaces, hyphens, underscores, periods
    const validPattern = /^[a-zA-Z0-9\s\-_\.]+$/;
    
    // Check pattern and reasonable length
    return validPattern.test(filename) && 
           filename.length >= 1 && 
           filename.length <= 255 &&
           !filename.startsWith('.') &&
           !filename.endsWith('.');
  }

  private sanitizeFilename(filename: string): string {
    // Remove potentially dangerous characters and normalize
    return filename
      .replace(/[^a-zA-Z0-9\s\-_\.]/g, '') // Remove invalid chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .substring(0, 255); // Limit length
  }

  private generateAttachmentId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private shouldGenerateThumbnail(mimeType: string): boolean {
    const thumbnailTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return thumbnailTypes.includes(mimeType);
  }

  private validateImageContent(uploadDto: AttachmentUploadDto): string[] {
    const warnings: string[] = [];
    
    // Check for very large images
    if (uploadDto.size > 5 * 1024 * 1024) {
      warnings.push('Large image size may affect debate performance');
    }

    // Check filename for educational appropriateness
    const filename = uploadDto.filename.toLowerCase();
    const inappropriateKeywords = ['meme', 'joke', 'funny', 'lol'];
    
    for (const keyword of inappropriateKeywords) {
      if (filename.includes(keyword)) {
        warnings.push('Image filename suggests non-educational content');
        break;
      }
    }

    return warnings;
  }

  private async verifyConversationAccess(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId },
      include: {
        match: {
          select: {
            student1_id: true,
            student2_id: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = 
      conversation.match.student1_id === userId || 
      conversation.match.student2_id === userId;

    if (!isParticipant) {
      throw new BadRequestException('Access denied: User is not a participant in this conversation');
    }
  }

  private async createAttachmentRecord(attachmentData: any): Promise<void> {
    // In a real implementation, this would create a record in an attachments table
    // For now, we'll store it in a mock way or extend the existing schema
    // This is a placeholder for the actual database operation
  }

  private async getAttachmentRecord(attachmentId: string): Promise<any> {
    // In a real implementation, this would query the attachments table
    // For now, return null to indicate not found
    return null;
  }

  private async updateAttachmentStatus(attachmentId: string, status: string): Promise<void> {
    // In a real implementation, this would update the attachments table
    // For now, this is a placeholder
  }

  private async generateThumbnail(attachmentId: string, storagePath: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Download the original image
    // 2. Resize to thumbnail size (e.g., 200x200)
    // 3. Upload thumbnail to storage
    // 4. Update attachment record with thumbnail URL
    
    // For now, this is a placeholder
  }

  private transformToAttachmentDto(attachmentRecord: any): AttachmentDto {
    // Transform database record to AttachmentDto
    // This is a placeholder implementation
    return {
      id: attachmentRecord.id,
      type: this.determineAttachmentType(attachmentRecord.mimeType)!,
      url: attachmentRecord.accessUrl || `https://storage.example.com/files/${attachmentRecord.storagePath}`,
      filename: attachmentRecord.filename,
      size: attachmentRecord.size,
      metadata: attachmentRecord.metadata,
    };
  }
}
