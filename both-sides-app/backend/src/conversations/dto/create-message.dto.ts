import { IsString, IsOptional, IsEnum, IsNotEmpty, MaxLength, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageContentType } from '@prisma/client';
import { FormattingOptionsDto, AttachmentDto, LinkPreviewDto } from './rich-content.dto';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsEnum(MessageContentType)
  @IsOptional()
  contentType?: MessageContentType = MessageContentType.TEXT;

  @IsString()
  @IsOptional()
  replyToId?: string;

  @IsOptional()
  richContent?: RichMessageContentDto;
}

export class RichMessageContentDto {
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
  mentions?: string[]; // Usernames or user IDs of mentioned participants

  @IsOptional()
  @IsString()
  debatePhase?: string;

  @IsOptional()
  @IsString()
  htmlContent?: string; // Parsed HTML version of markdown

  @IsOptional()
  @IsString()
  plainTextContent?: string; // Plain text version without formatting

  @IsOptional()
  metadata?: {
    wordCount?: number;
    characterCount?: number;
    linkCount?: number;
    attachmentCount?: number;
    estimatedReadTime?: number; // in seconds
    contentQualityScore?: number; // 0-1 score for argument quality
  };
}
