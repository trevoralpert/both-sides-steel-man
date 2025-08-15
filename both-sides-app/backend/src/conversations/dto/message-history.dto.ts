import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageContentType } from '@prisma/client';

export class MessageHistoryRequestDto {
  @IsString()
  conversationId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 50;

  @IsOptional()
  @IsString()
  cursor?: string; // Base64 encoded cursor for pagination

  @IsOptional()
  filters?: MessageFiltersDto;
}

export class MessageFiltersDto {
  @IsOptional()
  @IsString()
  fromUser?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(MessageContentType, { each: true })
  messageTypes?: MessageContentType[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  searchTerm?: string;

  @IsOptional()
  @IsString()
  parentMessageId?: string; // For filtering replies to specific message
}

export class PaginatedMessagesDto {
  messages: MessageResponseDto[];
  pagination: {
    totalCount: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
    pageSize: number;
  };
  filters?: MessageFiltersDto;
  searchMetadata?: {
    query: string;
    resultsCount: number;
    searchTime: number;
    highlights?: { messageId: string; excerpt: string }[];
  };
}

export class MessageSearchRequestDto {
  @IsString()
  conversationId: string;

  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  filters?: MessageFiltersDto;
}

export class ExportRequestDto {
  @IsString()
  conversationId: string;

  @IsEnum(['json', 'txt', 'pdf', 'csv'])
  format: 'json' | 'txt' | 'pdf' | 'csv';

  @IsOptional()
  filters?: MessageFiltersDto;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  includeMetadata?: boolean = true;

  @IsOptional()
  includeDeletedMessages?: boolean = false;
}

export class ExportResultDto {
  downloadUrl: string;
  filename: string;
  format: string;
  size: number;
  expiresAt: Date;
  metadata: {
    messagesCount: number;
    participants: string[];
    dateRange: {
      start: Date;
      end: Date;
    };
    generatedAt: Date;
  };
}

// Import from previous file
import { MessageResponseDto } from './message-response.dto';

export interface CursorData {
  messageId: string;
  createdAt: Date;
  direction: 'forward' | 'backward';
}
