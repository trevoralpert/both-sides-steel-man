import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MessageHistoryRequestDto,
  MessageFiltersDto,
  PaginatedMessagesDto,
  MessageSearchRequestDto,
  ExportRequestDto,
  ExportResultDto,
  CursorData,
} from '../dto/message-history.dto';
import { MessageResponseDto } from '../dto/message-response.dto';
import { MessageStatus, MessageContentType, Prisma } from '@prisma/client';

@Injectable()
export class MessageHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated message history for a conversation
   */
  async getMessageHistory(
    userId: string,
    request: MessageHistoryRequestDto,
  ): Promise<PaginatedMessagesDto> {
    const { conversationId, limit, cursor, filters } = request;

    // Verify user has access to the conversation
    await this.verifyConversationAccess(conversationId, userId);

    // Build where clause
    const whereClause = this.buildWhereClause(conversationId, filters);

    // Handle cursor-based pagination
    const cursorCondition = cursor ? this.decodeCursor(cursor) : null;
    
    if (cursorCondition) {
      if (cursorCondition.direction === 'forward') {
        whereClause.created_at = { lt: cursorCondition.createdAt };
      } else {
        whereClause.created_at = { gt: cursorCondition.createdAt };
      }
    }

    // Get total count (for pagination metadata)
    const totalCount = await this.prisma.message.count({
      where: this.buildWhereClause(conversationId, filters),
    });

    // Fetch messages
    const messages = await this.prisma.message.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
          },
        },
        reply_to: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
        replies: {
          where: {
            status: {
              not: MessageStatus.DELETED,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
          take: 5, // Limit replies to prevent large payloads
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit + 1, // Fetch one extra to check if there are more
    });

    // Determine pagination info
    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;

    // Generate cursors
    let nextCursor: string | undefined;
    let prevCursor: string | undefined;

    if (hasMore && messagesToReturn.length > 0) {
      const lastMessage = messagesToReturn[messagesToReturn.length - 1];
      nextCursor = this.encodeCursor({
        messageId: lastMessage.id,
        createdAt: lastMessage.created_at,
        direction: 'forward',
      });
    }

    if (cursorCondition && messagesToReturn.length > 0) {
      const firstMessage = messagesToReturn[0];
      prevCursor = this.encodeCursor({
        messageId: firstMessage.id,
        createdAt: firstMessage.created_at,
        direction: 'backward',
      });
    }

    return {
      messages: messagesToReturn.map(message => this.transformToMessageResponseDto(message)),
      pagination: {
        totalCount,
        hasMore,
        nextCursor,
        prevCursor,
        pageSize: limit,
      },
      filters,
    };
  }

  /**
   * Search messages in a conversation
   */
  async searchMessages(
    userId: string,
    searchRequest: MessageSearchRequestDto,
  ): Promise<PaginatedMessagesDto> {
    const { conversationId, query, limit = 20, cursor, filters } = searchRequest;

    // Verify user has access to the conversation
    await this.verifyConversationAccess(conversationId, userId);

    const startTime = Date.now();

    // Build search conditions
    const whereClause = this.buildWhereClause(conversationId, filters);
    
    // Add text search
    whereClause.content = {
      contains: query,
      mode: Prisma.QueryMode.insensitive,
    };

    // Handle cursor for search pagination
    const cursorCondition = cursor ? this.decodeCursor(cursor) : null;
    if (cursorCondition) {
      whereClause.created_at = { lt: cursorCondition.createdAt };
    }

    // Execute search
    const messages = await this.prisma.message.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
          },
        },
        reply_to: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
      },
      orderBy: [
        { created_at: 'desc' }, // Most recent first for search
      ],
      take: limit + 1,
    });

    // Get total search results count
    const totalCount = await this.prisma.message.count({ where: whereClause });

    // Pagination logic
    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;

    let nextCursor: string | undefined;
    if (hasMore && messagesToReturn.length > 0) {
      const lastMessage = messagesToReturn[messagesToReturn.length - 1];
      nextCursor = this.encodeCursor({
        messageId: lastMessage.id,
        createdAt: lastMessage.created_at,
        direction: 'forward',
      });
    }

    const searchTime = Date.now() - startTime;

    // Generate highlights
    const highlights = messagesToReturn.map(message => {
      const excerpt = this.generateExcerpt(message.content, query, 100);
      return {
        messageId: message.id,
        excerpt,
      };
    });

    return {
      messages: messagesToReturn.map(message => this.transformToMessageResponseDto(message)),
      pagination: {
        totalCount,
        hasMore,
        nextCursor,
        pageSize: limit,
      },
      filters,
      searchMetadata: {
        query,
        resultsCount: totalCount,
        searchTime,
        highlights,
      },
    };
  }

  /**
   * Get message context around a specific message
   */
  async getMessageContext(
    messageId: string,
    userId: string,
    contextSize: number = 10,
  ): Promise<MessageResponseDto[]> {
    // Find the target message
    const targetMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!targetMessage) {
      throw new NotFoundException('Message not found');
    }

    // Verify access
    await this.verifyConversationAccess(targetMessage.conversation_id, userId);

    // Get messages before and after
    const contextBefore = Math.floor(contextSize / 2);
    const contextAfter = contextSize - contextBefore;

    const [messagesBefore, messagesAfter] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          conversation_id: targetMessage.conversation_id,
          created_at: { lt: targetMessage.created_at },
          status: { not: MessageStatus.DELETED },
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: contextBefore,
      }),
      this.prisma.message.findMany({
        where: {
          conversation_id: targetMessage.conversation_id,
          created_at: { gt: targetMessage.created_at },
          status: { not: MessageStatus.DELETED },
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              avatar_url: true,
            },
          },
        },
        orderBy: { created_at: 'asc' },
        take: contextAfter,
      }),
    ]);

    // Get the target message with full details
    const fullTargetMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
          },
        },
      },
    });

    // Combine and sort
    const allMessages = [
      ...messagesBefore.reverse(), // Reverse to get chronological order
      fullTargetMessage!,
      ...messagesAfter,
    ];

    return allMessages.map(message => this.transformToMessageResponseDto(message));
  }

  /**
   * Export conversation messages
   */
  async exportConversation(
    userId: string,
    exportRequest: ExportRequestDto,
  ): Promise<ExportResultDto> {
    const { conversationId, format, filters, filename, includeMetadata, includeDeletedMessages } = exportRequest;

    // Verify access
    await this.verifyConversationAccess(conversationId, userId);

    // Build where clause
    const whereClause = this.buildWhereClause(conversationId, filters);
    
    if (!includeDeletedMessages) {
      whereClause.status = { not: MessageStatus.DELETED };
    }

    // Get all messages for export
    const messages = await this.prisma.message.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
          },
        },
        conversation: {
          include: {
            match: {
              include: {
                topic: true,
                student1: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                  },
                },
                student2: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    if (messages.length === 0) {
      throw new BadRequestException('No messages found to export');
    }

    // Generate export based on format
    let exportData: string;
    let fileExtension: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        exportData = this.generateJSONExport(messages, includeMetadata);
        fileExtension = 'json';
        mimeType = 'application/json';
        break;
      case 'txt':
        exportData = this.generateTextExport(messages, includeMetadata);
        fileExtension = 'txt';
        mimeType = 'text/plain';
        break;
      case 'csv':
        exportData = this.generateCSVExport(messages, includeMetadata);
        fileExtension = 'csv';
        mimeType = 'text/csv';
        break;
      case 'pdf':
        // PDF export would require additional library (like puppeteer)
        throw new BadRequestException('PDF export not yet implemented');
      default:
        throw new BadRequestException('Unsupported export format');
    }

    // In a real implementation, you would:
    // 1. Save the file to cloud storage (S3, Google Cloud, etc.)
    // 2. Generate a signed URL for download
    // 3. Set up cleanup job to delete after expiration

    const generatedFilename = filename || 
      `conversation_${conversationId}_${format}_${Date.now()}.${fileExtension}`;

    // Mock implementation - in production, save to cloud storage
    const downloadUrl = `/api/conversations/exports/${conversationId}/${generatedFilename}`;

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const participants = Array.from(new Set(messages.map(m => 
      `${m.user.first_name} ${m.user.last_name}`.trim()
    )));

    return {
      downloadUrl,
      filename: generatedFilename,
      format,
      size: Buffer.byteLength(exportData, 'utf8'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      metadata: {
        messagesCount: messages.length,
        participants,
        dateRange: {
          start: firstMessage.created_at,
          end: lastMessage.created_at,
        },
        generatedAt: new Date(),
      },
    };
  }

  private buildWhereClause(conversationId: string, filters?: MessageFiltersDto): any {
    const whereClause: any = {
      conversation_id: conversationId,
    };

    if (!filters) {
      return whereClause;
    }

    if (filters.fromUser) {
      whereClause.user_id = filters.fromUser;
    }

    if (filters.messageTypes && filters.messageTypes.length > 0) {
      whereClause.content_type = { in: filters.messageTypes };
    }

    if (filters.startDate || filters.endDate) {
      whereClause.created_at = {};
      if (filters.startDate) {
        whereClause.created_at.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.created_at.lte = new Date(filters.endDate);
      }
    }

    if (filters.parentMessageId) {
      whereClause.reply_to_id = filters.parentMessageId;
    }

    return whereClause;
  }

  private encodeCursor(cursorData: CursorData): string {
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  private decodeCursor(cursor: string): CursorData {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new BadRequestException('Invalid cursor format');
    }
  }

  private generateExcerpt(content: string, searchTerm: string, maxLength: number): string {
    const searchIndex = content.toLowerCase().indexOf(searchTerm.toLowerCase());
    
    if (searchIndex === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    const start = Math.max(0, searchIndex - Math.floor((maxLength - searchTerm.length) / 2));
    const end = Math.min(content.length, start + maxLength);
    
    let excerpt = content.substring(start, end);
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';
    
    return excerpt;
  }

  private generateJSONExport(messages: any[], includeMetadata?: boolean): string {
    const exportData = {
      conversation: {
        id: messages[0]?.conversation_id,
        topic: messages[0]?.conversation.match.topic.title,
        participants: [
          messages[0]?.conversation.match.student1,
          messages[0]?.conversation.match.student2,
        ],
        exportedAt: new Date(),
      },
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        author: `${msg.user.first_name} ${msg.user.last_name}`.trim(),
        timestamp: msg.created_at,
        type: msg.content_type,
        ...(includeMetadata && {
          metadata: msg.message_metadata,
          status: msg.status,
          moderationStatus: msg.moderation_status,
        }),
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  private generateTextExport(messages: any[], includeMetadata?: boolean): string {
    const conversation = messages[0]?.conversation;
    const header = [
      `Debate Conversation Export`,
      `Topic: ${conversation?.match.topic.title}`,
      `Participants: ${conversation?.match.student1.first_name} ${conversation?.match.student1.last_name}, ${conversation?.match.student2.first_name} ${conversation?.match.student2.last_name}`,
      `Exported: ${new Date().toISOString()}`,
      `Messages: ${messages.length}`,
      '',
      '=' + '='.repeat(50),
      '',
    ].join('\n');

    const messagesText = messages.map(msg => {
      const author = `${msg.user.first_name} ${msg.user.last_name}`.trim();
      const timestamp = msg.created_at.toISOString();
      
      let messageText = [
        `[${timestamp}] ${author}:`,
        msg.content,
      ];

      if (includeMetadata && msg.message_metadata) {
        messageText.push(`  (Metadata: ${JSON.stringify(msg.message_metadata)})`);
      }

      return messageText.join('\n') + '\n';
    }).join('\n');

    return header + messagesText;
  }

  private generateCSVExport(messages: any[], includeMetadata?: boolean): string {
    const headers = ['id', 'timestamp', 'author', 'content', 'type'];
    if (includeMetadata) {
      headers.push('status', 'moderationStatus', 'metadata');
    }

    const csvRows = [headers.join(',')];

    messages.forEach(msg => {
      const author = `${msg.user.first_name} ${msg.user.last_name}`.trim();
      const row = [
        msg.id,
        msg.created_at.toISOString(),
        `"${author}"`,
        `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes
        msg.content_type,
      ];

      if (includeMetadata) {
        row.push(
          msg.status,
          msg.moderation_status,
          `"${JSON.stringify(msg.message_metadata).replace(/"/g, '""')}"`,
        );
      }

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
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

  private transformToMessageResponseDto(message: any): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversation_id,
      userId: message.user_id,
      content: message.content,
      contentType: message.content_type,
      messageMetadata: message.message_metadata,
      replyToId: message.reply_to_id,
      status: message.status,
      moderationStatus: message.moderation_status,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
      editedAt: message.edited_at,
      user: message.user ? {
        id: message.user.id,
        firstName: message.user.first_name,
        lastName: message.user.last_name,
        avatarUrl: message.user.avatar_url,
      } : undefined,
      replyTo: message.reply_to ? this.transformToMessageResponseDto(message.reply_to) : undefined,
      replies: message.replies?.map((reply: any) => this.transformToMessageResponseDto(reply)) || [],
    };
  }
}
