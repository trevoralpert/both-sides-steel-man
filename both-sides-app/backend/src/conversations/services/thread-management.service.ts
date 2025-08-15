import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Message } from '@prisma/client';
import { MessageResponseDto, MessageThreadResponseDto } from '../dto/message-response.dto';

@Injectable()
export class ThreadManagementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get message thread (parent message with all replies)
   */
  async getMessageThread(messageId: string, userId: string): Promise<MessageThreadResponseDto> {
    // First, find the root message
    const targetMessage = await this.prisma.message.findFirst({
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
        conversation: {
          include: {
            match: {
              select: {
                student1_id: true,
                student2_id: true,
              },
            },
          },
        },
      },
    });

    if (!targetMessage) {
      throw new NotFoundException('Message not found');
    }

    // Check if user has access to this conversation
    await this.verifyConversationAccess(targetMessage.conversation_id, userId);

    // Get the root message (if this is a reply, find the parent)
    const rootMessage = targetMessage.reply_to_id 
      ? await this.findRootMessage(targetMessage.reply_to_id)
      : targetMessage;

    // Get all replies to the root message
    const replies = await this.prisma.message.findMany({
      where: {
        reply_to_id: rootMessage.id,
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
        replies: {
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
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return {
      parentMessage: this.transformToMessageResponseDto(rootMessage),
      replies: replies.map(reply => this.transformToMessageResponseDto(reply)),
      totalReplies: replies.length,
    };
  }

  /**
   * Validate reply structure and depth
   */
  async validateReplyStructure(
    replyToId: string,
    conversationId: string,
    userId: string,
  ): Promise<{ isValid: boolean; error?: string; depth: number }> {
    // Check if the parent message exists and is in the same conversation
    const parentMessage = await this.prisma.message.findFirst({
      where: {
        id: replyToId,
        conversation_id: conversationId,
      },
    });

    if (!parentMessage) {
      return {
        isValid: false,
        error: 'Parent message not found or not in the same conversation',
        depth: 0,
      };
    }

    // Calculate reply depth
    const depth = await this.calculateReplyDepth(replyToId);

    // Check if depth exceeds maximum (e.g., 3 levels deep)
    const maxDepth = 3;
    if (depth >= maxDepth) {
      return {
        isValid: false,
        error: `Reply depth exceeds maximum of ${maxDepth} levels`,
        depth,
      };
    }

    // Verify user has access to the conversation
    await this.verifyConversationAccess(conversationId, userId);

    return {
      isValid: true,
      depth,
    };
  }

  /**
   * Get reply context for a message (parent and immediate replies)
   */
  async getReplyContext(messageId: string, contextSize: number = 5): Promise<MessageResponseDto[]> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const context: Message[] = [];

    // Get parent message if this is a reply
    if (message.reply_to_id) {
      const parent = await this.prisma.message.findUnique({
        where: { id: message.reply_to_id },
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
      if (parent) {
        context.push(parent);
      }
    }

    // Add the message itself
    const fullMessage = await this.prisma.message.findUnique({
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
    if (fullMessage) {
      context.push(fullMessage);
    }

    // Get immediate replies (limited by contextSize)
    const replies = await this.prisma.message.findMany({
      where: { reply_to_id: messageId },
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
      take: contextSize - context.length,
    });

    context.push(...replies);

    return context.map(msg => this.transformToMessageResponseDto(msg));
  }

  /**
   * Get threaded messages for a conversation with proper nesting
   */
  async getThreadedMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
  ): Promise<MessageResponseDto[]> {
    // Verify access
    await this.verifyConversationAccess(conversationId, userId);

    // Get all messages for the conversation
    const messages = await this.prisma.message.findMany({
      where: { conversation_id: conversationId },
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
      take: limit,
    });

    // Build threaded structure
    const messageMap = new Map<string, MessageResponseDto>();
    const rootMessages: MessageResponseDto[] = [];

    // First pass: create all message objects
    messages.forEach(msg => {
      const responseDto = this.transformToMessageResponseDto(msg);
      responseDto.replies = [];
      messageMap.set(msg.id, responseDto);
    });

    // Second pass: build thread structure
    messages.forEach(msg => {
      const responseDto = messageMap.get(msg.id)!;
      
      if (msg.reply_to_id) {
        const parent = messageMap.get(msg.reply_to_id);
        if (parent) {
          parent.replies!.push(responseDto);
        } else {
          // Parent not in current result set, treat as root
          rootMessages.push(responseDto);
        }
      } else {
        rootMessages.push(responseDto);
      }
    });

    return rootMessages;
  }

  private async findRootMessage(messageId: string): Promise<any> {
    let currentMessage = await this.prisma.message.findUnique({
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

    if (!currentMessage) {
      throw new NotFoundException('Message not found');
    }

    // Walk up the chain to find root
    while (currentMessage.reply_to_id) {
      const parentMessage = await this.prisma.message.findUnique({
        where: { id: currentMessage.reply_to_id },
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

      if (!parentMessage) break;
      currentMessage = parentMessage;
    }

    return currentMessage;
  }

  private async calculateReplyDepth(messageId: string): Promise<number> {
    let depth = 0;
    let currentMessageId = messageId;

    while (currentMessageId) {
      const message = await this.prisma.message.findUnique({
        where: { id: currentMessageId },
        select: { reply_to_id: true },
      });

      if (!message || !message.reply_to_id) break;
      
      depth++;
      currentMessageId = message.reply_to_id;

      // Safety check to prevent infinite loops
      if (depth > 10) break;
    }

    return depth;
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
      replies: message.replies?.map((reply: any) => this.transformToMessageResponseDto(reply)) || [],
    };
  }
}
