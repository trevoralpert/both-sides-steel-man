/**
 * Media Service
 * Handles multimedia file uploads, object storage integration,
 * content analysis, and security scanning for reflection responses
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import {
  IMediaService,
  MediaAttachment,
  MediaMetadata,
  MediaAnalysis,
  SignedUploadUrl,
  File,
  MediaType,
  GeolocationData,
  DeviceInfo
} from '../interfaces/reflection-response.interfaces';

// Mock AWS S3 types (in production, use actual AWS SDK)
interface S3UploadParams {
  Bucket: string;
  Key: string;
  Body: Buffer;
  ContentType: string;
  Metadata?: Record<string, string>;
}

interface S3SignedUrlParams {
  Bucket: string;
  Key: string;
  Expires: number;
  ContentType?: string;
}

@Injectable()
export class MediaService implements IMediaService {
  private readonly logger = new Logger(MediaService.name);

  // Configuration
  private readonly BUCKET_NAME: string;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_MIME_TYPES: Record<MediaType, string[]> = {
    [MediaType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    [MediaType.AUDIO]: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm'],
    [MediaType.VIDEO]: ['video/mp4', 'video/webm', 'video/quicktime'],
    [MediaType.DOCUMENT]: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };
  private readonly SIGNED_URL_EXPIRES = 3600; // 1 hour
  private readonly THUMBNAIL_SIZE = { width: 200, height: 200 };

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    this.BUCKET_NAME = this.configService.get<string>('MEDIA_BUCKET_NAME') || 'reflection-media-dev';
  }

  // =============================================
  // Core Media Operations
  // =============================================

  async uploadMedia(file: File, metadata: MediaMetadata): Promise<MediaAttachment> {
    this.logger.log(`Uploading media file: ${file.originalname}`);

    try {
      // Validate file
      await this.validateFile(file);

      // Generate unique identifiers
      const attachmentId = uuidv4();
      const sha256Hash = this.calculateFileHash(file.buffer);
      const fileExtension = this.getFileExtension(file.originalname);
      const storageKey = `reflections/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${attachmentId}${fileExtension}`;

      // Determine media type
      const mediaType = this.determineMediaType(file.mimetype);

      // Upload to object storage
      const uploadUrl = await this.uploadToStorage(file.buffer, storageKey, file.mimetype, metadata);

      // Analyze media content
      const analysis = await this.analyzeMedia(file.buffer, file.mimetype, mediaType);

      // Create media attachment record
      const attachment: MediaAttachment = {
        id: attachmentId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: uploadUrl,
        providerKey: storageKey,
        sha256Hash,
        uploadedAt: new Date(),
        metadata: {
          ...metadata,
          originalName: file.originalname
        },
        analysis
      };

      // Store in database
      await this.storeAttachmentInDatabase(attachment);

      // Generate thumbnail for images/videos
      if (mediaType === MediaType.IMAGE || mediaType === MediaType.VIDEO) {
        try {
          const thumbnailUrl = await this.generateThumbnail(attachmentId);
          attachment.analysis.thumbnailUrl = thumbnailUrl;
          await this.updateAttachmentInDatabase(attachmentId, { analysis: attachment.analysis });
        } catch (error) {
          this.logger.warn(`Failed to generate thumbnail for ${attachmentId}: ${error.message}`);
        }
      }

      this.logger.log(`Successfully uploaded media: ${attachmentId}`);
      return attachment;

    } catch (error) {
      this.logger.error(`Failed to upload media: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSignedUploadUrl(filename: string, mimeType: string, size: number): Promise<SignedUploadUrl> {
    this.logger.log(`Generating signed upload URL for: ${filename}`);

    try {
      // Validate request
      this.validateUploadRequest(filename, mimeType, size);

      // Generate storage key
      const attachmentId = uuidv4();
      const fileExtension = this.getFileExtension(filename);
      const storageKey = `reflections/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${attachmentId}${fileExtension}`;

      // Generate signed URL for direct client upload
      const signedUrl = await this.generateSignedUploadUrl(storageKey, mimeType);

      return {
        url: signedUrl.url,
        fields: signedUrl.fields,
        expiresAt: new Date(Date.now() + this.SIGNED_URL_EXPIRES * 1000),
        maxSize: this.MAX_FILE_SIZE
      };

    } catch (error) {
      this.logger.error(`Failed to generate signed upload URL: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSignedDownloadUrl(attachmentId: string): Promise<string> {
    this.logger.log(`Generating signed download URL for: ${attachmentId}`);

    try {
      // Get attachment from database
      const attachment = await this.getAttachmentFromDatabase(attachmentId);
      if (!attachment) {
        throw new NotFoundException(`Attachment not found: ${attachmentId}`);
      }

      // Generate signed download URL
      const signedUrl = await this.generateSignedDownloadUrl(attachment.providerKey);

      this.logger.log(`Generated signed download URL for: ${attachmentId}`);
      return signedUrl;

    } catch (error) {
      this.logger.error(`Failed to generate signed download URL: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteMedia(attachmentId: string): Promise<void> {
    this.logger.log(`Deleting media: ${attachmentId}`);

    try {
      // Get attachment from database
      const attachment = await this.getAttachmentFromDatabase(attachmentId);
      if (!attachment) {
        throw new NotFoundException(`Attachment not found: ${attachmentId}`);
      }

      // Delete from object storage
      await this.deleteFromStorage(attachment.providerKey);

      // Delete thumbnail if exists
      if (attachment.analysis?.thumbnailUrl) {
        try {
          const thumbnailKey = this.extractStorageKeyFromUrl(attachment.analysis.thumbnailUrl);
          await this.deleteFromStorage(thumbnailKey);
        } catch (error) {
          this.logger.warn(`Failed to delete thumbnail: ${error.message}`);
        }
      }

      // Delete from database
      await this.deleteAttachmentFromDatabase(attachmentId);

      this.logger.log(`Successfully deleted media: ${attachmentId}`);

    } catch (error) {
      this.logger.error(`Failed to delete media: ${error.message}`, error.stack);
      throw error;
    }
  }

  async analyzeMedia(attachmentId: string): Promise<MediaAnalysis> {
    this.logger.log(`Analyzing media: ${attachmentId}`);

    try {
      // Get attachment from database
      const attachment = await this.getAttachmentFromDatabase(attachmentId);
      if (!attachment) {
        throw new NotFoundException(`Attachment not found: ${attachmentId}`);
      }

      // Get file buffer for analysis
      const fileBuffer = await this.downloadFromStorage(attachment.providerKey);
      const mediaType = this.determineMediaType(attachment.mimeType);

      // Perform analysis
      const analysis = await this.analyzeMedia(fileBuffer, attachment.mimeType, mediaType);

      // Update database
      await this.updateAttachmentInDatabase(attachmentId, { analysis });

      this.logger.log(`Completed media analysis for: ${attachmentId}`);
      return analysis;

    } catch (error) {
      this.logger.error(`Failed to analyze media: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateThumbnail(attachmentId: string): Promise<string> {
    this.logger.log(`Generating thumbnail for: ${attachmentId}`);

    try {
      // Get attachment from database
      const attachment = await this.getAttachmentFromDatabase(attachmentId);
      if (!attachment) {
        throw new NotFoundException(`Attachment not found: ${attachmentId}`);
      }

      const mediaType = this.determineMediaType(attachment.mimeType);

      if (mediaType !== MediaType.IMAGE && mediaType !== MediaType.VIDEO) {
        throw new BadRequestException('Thumbnails can only be generated for images and videos');
      }

      // Download original file
      const fileBuffer = await this.downloadFromStorage(attachment.providerKey);

      // Generate thumbnail
      const thumbnailBuffer = await this.createThumbnail(fileBuffer, attachment.mimeType, mediaType);

      // Upload thumbnail
      const thumbnailKey = `thumbnails/${attachmentId}.jpg`;
      const thumbnailUrl = await this.uploadToStorage(thumbnailBuffer, thumbnailKey, 'image/jpeg', {
        originalName: `thumbnail_${attachment.filename}`,
        uploadSource: 'system'
      });

      this.logger.log(`Generated thumbnail for: ${attachmentId}`);
      return thumbnailUrl;

    } catch (error) {
      this.logger.error(`Failed to generate thumbnail: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Private Helper Methods
  // =============================================

  private async validateFile(file: File): Promise<void> {
    // Size validation
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
    }

    // MIME type validation
    const mediaType = this.determineMediaType(file.mimetype);
    const allowedTypes = this.ALLOWED_MIME_TYPES[mediaType];
    
    if (!allowedTypes || !allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    // Content validation (basic magic number check)
    const isValidContent = await this.validateFileContent(file.buffer, file.mimetype);
    if (!isValidContent) {
      throw new BadRequestException('File content does not match declared MIME type');
    }
  }

  private validateUploadRequest(filename: string, mimeType: string, size: number): void {
    if (size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
    }

    const mediaType = this.determineMediaType(mimeType);
    const allowedTypes = this.ALLOWED_MIME_TYPES[mediaType];
    
    if (!allowedTypes || !allowedTypes.includes(mimeType)) {
      throw new BadRequestException(`File type ${mimeType} is not allowed`);
    }

    if (!filename || filename.trim().length === 0) {
      throw new BadRequestException('Filename is required');
    }
  }

  private determineMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('audio/')) return MediaType.AUDIO;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    return MediaType.DOCUMENT;
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }

  private calculateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private async validateFileContent(buffer: Buffer, mimeType: string): Promise<boolean> {
    // Check magic numbers for common file types
    const magicNumbers: Record<string, Buffer[]> = {
      'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
      'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
      'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
    };

    const expectedMagic = magicNumbers[mimeType];
    if (!expectedMagic) {
      return true; // No validation available for this type
    }

    return expectedMagic.some(magic => buffer.subarray(0, magic.length).equals(magic));
  }

  private async analyzeMedia(buffer: Buffer, mimeType: string, mediaType: MediaType): Promise<MediaAnalysis> {
    const analysis: MediaAnalysis = {
      contentType: mediaType,
      safetyScore: 0.9, // Default safe
      isAppropriate: true,
      qualityScore: 0.8
    };

    try {
      // Content safety analysis
      const safetyResult = await this.performSafetyAnalysis(buffer, mediaType);
      analysis.safetyScore = safetyResult.score;
      analysis.isAppropriate = safetyResult.isAppropriate;

      // Media-specific analysis
      switch (mediaType) {
        case MediaType.IMAGE:
          const imageAnalysis = await this.analyzeImage(buffer);
          analysis.detectedObjects = imageAnalysis.objects;
          analysis.textContent = imageAnalysis.text;
          analysis.qualityScore = imageAnalysis.quality;
          break;

        case MediaType.AUDIO:
          const audioAnalysis = await this.analyzeAudio(buffer);
          analysis.textContent = audioAnalysis.transcription;
          analysis.qualityScore = audioAnalysis.quality;
          break;

        case MediaType.VIDEO:
          const videoAnalysis = await this.analyzeVideo(buffer);
          analysis.detectedObjects = videoAnalysis.objects;
          analysis.textContent = videoAnalysis.transcription;
          analysis.qualityScore = videoAnalysis.quality;
          break;

        case MediaType.DOCUMENT:
          const documentAnalysis = await this.analyzeDocument(buffer, mimeType);
          analysis.textContent = documentAnalysis.text;
          analysis.qualityScore = documentAnalysis.quality;
          break;
      }

      return analysis;

    } catch (error) {
      this.logger.warn(`Media analysis failed: ${error.message}`);
      // Return basic analysis on failure
      return analysis;
    }
  }

  private async performSafetyAnalysis(buffer: Buffer, mediaType: MediaType): Promise<{ score: number; isAppropriate: boolean }> {
    // TODO: Integrate with content moderation service (AWS Rekognition, Google Vision, etc.)
    // For now, return safe defaults
    return {
      score: 0.95,
      isAppropriate: true
    };
  }

  private async analyzeImage(buffer: Buffer): Promise<{ objects: string[]; text: string; quality: number }> {
    // TODO: Implement image analysis (object detection, OCR, quality assessment)
    return {
      objects: [],
      text: '',
      quality: 0.8
    };
  }

  private async analyzeAudio(buffer: Buffer): Promise<{ transcription: string; quality: number }> {
    // TODO: Implement audio analysis (speech-to-text, quality assessment)
    return {
      transcription: '',
      quality: 0.8
    };
  }

  private async analyzeVideo(buffer: Buffer): Promise<{ objects: string[]; transcription: string; quality: number }> {
    // TODO: Implement video analysis (object detection, speech-to-text, quality assessment)
    return {
      objects: [],
      transcription: '',
      quality: 0.8
    };
  }

  private async analyzeDocument(buffer: Buffer, mimeType: string): Promise<{ text: string; quality: number }> {
    // TODO: Implement document analysis (text extraction, quality assessment)
    return {
      text: '',
      quality: 0.8
    };
  }

  private async createThumbnail(buffer: Buffer, mimeType: string, mediaType: MediaType): Promise<Buffer> {
    // TODO: Implement thumbnail generation using image processing library
    // For now, return original buffer (in production, use Sharp, FFmpeg, etc.)
    return buffer;
  }

  // =============================================
  // Object Storage Operations (Mock Implementation)
  // =============================================

  private async uploadToStorage(buffer: Buffer, key: string, contentType: string, metadata: Partial<MediaMetadata>): Promise<string> {
    // TODO: Implement actual S3/GCS upload
    this.logger.debug(`Mock upload to storage: ${key}`);
    return `https://${this.BUCKET_NAME}.s3.amazonaws.com/${key}`;
  }

  private async generateSignedUploadUrl(key: string, contentType: string): Promise<{ url: string; fields: Record<string, string> }> {
    // TODO: Implement actual S3 signed URL generation
    this.logger.debug(`Mock signed upload URL generation: ${key}`);
    return {
      url: `https://${this.BUCKET_NAME}.s3.amazonaws.com/`,
      fields: {
        key,
        'Content-Type': contentType,
        'x-amz-algorithm': 'AWS4-HMAC-SHA256'
      }
    };
  }

  private async generateSignedDownloadUrl(key: string): Promise<string> {
    // TODO: Implement actual S3 signed URL generation
    this.logger.debug(`Mock signed download URL generation: ${key}`);
    return `https://${this.BUCKET_NAME}.s3.amazonaws.com/${key}?expires=${Date.now() + this.SIGNED_URL_EXPIRES * 1000}`;
  }

  private async downloadFromStorage(key: string): Promise<Buffer> {
    // TODO: Implement actual S3/GCS download
    this.logger.debug(`Mock download from storage: ${key}`);
    return Buffer.from('mock-file-content');
  }

  private async deleteFromStorage(key: string): Promise<void> {
    // TODO: Implement actual S3/GCS deletion
    this.logger.debug(`Mock delete from storage: ${key}`);
  }

  private extractStorageKeyFromUrl(url: string): string {
    // Extract storage key from full URL
    const urlParts = url.split('/');
    return urlParts.slice(3).join('/'); // Remove protocol and domain
  }

  // =============================================
  // Database Operations
  // =============================================

  private async storeAttachmentInDatabase(attachment: MediaAttachment): Promise<void> {
    // TODO: Store attachment in database
    this.logger.debug(`Storing attachment in database: ${attachment.id}`);
  }

  private async getAttachmentFromDatabase(attachmentId: string): Promise<MediaAttachment | null> {
    // TODO: Retrieve attachment from database
    this.logger.debug(`Retrieving attachment from database: ${attachmentId}`);
    return null;
  }

  private async updateAttachmentInDatabase(attachmentId: string, updates: Partial<MediaAttachment>): Promise<void> {
    // TODO: Update attachment in database
    this.logger.debug(`Updating attachment in database: ${attachmentId}`);
  }

  private async deleteAttachmentFromDatabase(attachmentId: string): Promise<void> {
    // TODO: Delete attachment from database
    this.logger.debug(`Deleting attachment from database: ${attachmentId}`);
  }
}
