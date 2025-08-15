import { IsString, IsOptional, IsEnum, IsNumber, IsUrl, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum AttachmentType {
  IMAGE = 'image',
  FILE = 'file', 
  LINK = 'link',
}

export class AttachmentDto {
  @IsString()
  id: string;

  @IsEnum(AttachmentType)
  type: AttachmentType;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100 * 1024 * 1024) // 100MB max
  size?: number;

  @IsOptional()
  metadata?: AttachmentMetadataDto;
}

export class AttachmentMetadataDto {
  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class FormattingOptionsDto {
  @IsOptional()
  bold?: boolean;

  @IsOptional()
  italic?: boolean;

  @IsOptional()
  underline?: boolean;

  @IsOptional()
  strikethrough?: boolean;

  @IsOptional()
  code?: boolean;

  @IsOptional()
  codeBlock?: boolean;

  @IsOptional()
  quote?: boolean;

  @IsOptional()
  @IsEnum(['none', 'bulleted', 'numbered'])
  list?: 'none' | 'bulleted' | 'numbered';
}

export class LinkPreviewDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  image?: string;

  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsString()
  favicon?: string;

  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @IsOptional()
  @IsString()
  error?: string;
}

export class FormattedContentDto {
  @IsString()
  plainText: string;

  @IsString()
  htmlContent: string;

  @IsString()
  markdownContent: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FormattingOptionsDto)
  formatting?: FormattingOptionsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkPreviewDto)
  linkPreviews?: LinkPreviewDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[]; // User IDs of mentioned participants

  @IsOptional()
  metadata?: {
    wordCount?: number;
    characterCount?: number;
    linkCount?: number;
    attachmentCount?: number;
    estimatedReadTime?: number; // in seconds
  };
}

export class AttachmentUploadDto {
  @IsString()
  filename: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB max
  size: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  metadata?: AttachmentMetadataDto;
}

export class AttachmentUploadResponseDto {
  @IsString()
  attachmentId: string;

  @IsUrl()
  uploadUrl: string; // Pre-signed URL for upload

  @IsUrl()
  accessUrl: string; // URL to access the file after upload

  @IsString()
  filename: string;

  @IsNumber()
  maxSizeBytes: number;

  @IsArray()
  @IsString({ each: true })
  allowedMimeTypes: string[];

  @IsString()
  expiresAt: string; // ISO date when upload URL expires
}
