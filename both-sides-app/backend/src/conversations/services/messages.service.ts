import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageBroadcastService } from './message-broadcast.service';
import { DebatePhaseService } from './debate-phase.service';
import { MessageValidationService } from './message-validation.service';
import { ThreadManagementService } from './thread-management.service';
import { ContentFormattingService } from './content-formatting.service';
import { LinkPreviewService } from './link-preview.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageDto } from '../dto/update-message.dto';
import { MessageResponseDto } from '../dto/message-response.dto';
import { ValidationResult } from '../dto/validation-result.dto';
import { MessageContentType, MessageStatus, ModerationStatus } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBroadcastService: MessageBroadcastService,
    private readonly debatePhaseService: DebatePhaseService,
    private readonly validationService: MessageValidationService,
    private readonly threadService: ThreadManagementService,
    private readonly contentFormattingService: ContentFormattingService,
    private readonly linkPreviewService: LinkPreviewService,
  ) {}

  /**
   * Create a new message in a conversation
   */
  async createMessage(userId: string, createMessageDto: CreateMessageDto): Promise<MessageResponseDto> {
    const { conversationId, content, contentType, replyToId, richContent } = createMessageDto;

    // Verify user has access to the conversation
    await this.verifyConversationAccess(conversationId, userId);

    // Validate message content
    const contentValidation = this.validationService.validateMessageContent(
      content,
      contentType || MessageContentType.TEXT,
    );

    if (!contentValidation.isValid) {
      throw new BadRequestException(`Message validation failed: ${contentValidation.errors.join(', ')}`);
    }

    // Validate reply structure if this is a reply
    if (replyToId) {
      const replyValidation = await this.threadService.validateReplyStructure(
        replyToId,
        conversationId,
        userId,
      );

      if (!replyValidation.isValid) {
        throw new BadRequestException(replyValidation.error);
      }
    }

    // Process rich content if provided
    let processedMetadata = {};
    if (richContent) {
      try {
        // Parse markdown content and generate formatted versions
        const formattedContent = this.contentFormattingService.parseMarkdown(content);
        
        // Generate link previews for any URLs in the content
        const extractedLinks = this.contentFormattingService.extractLinks(content);
        let linkPreviews: any[] = [];
        if (extractedLinks.length > 0) {
          linkPreviews = await this.linkPreviewService.generateLinkPreviews(extractedLinks);
        }

        // Validate debate content appropriateness
        const debateValidation = this.contentFormattingService.validateDebateContent({
          ...formattedContent,
          attachments: richContent.attachments,
          linkPreviews: richContent.linkPreviews || linkPreviews,
        });

        // Add warnings if content has issues
        if (!debateValidation.isValid && debateValidation.warnings.length > 0) {
          console.warn('Content validation warnings:', debateValidation.warnings);
        }

        // Build processed metadata
        processedMetadata = {
          formatting: richContent.formatting,
          attachments: richContent.attachments || [],
          linkPreviews: richContent.linkPreviews || linkPreviews,
          mentions: formattedContent.mentions,
          htmlContent: formattedContent.htmlContent,
          plainTextContent: formattedContent.plainText,
          contentMetrics: formattedContent.metadata,
          debatePhase: richContent.debatePhase,
          ...richContent.metadata,
        };
      } catch (error) {
        console.error('Rich content processing failed:', error);
        // Continue with basic message creation if rich content processing fails
      }
    }

    // Check conversation status and debate phase rules
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if conversation allows new messages
    if (conversation.status === 'COMPLETED' || conversation.status === 'CANCELLED') {
      throw new BadRequestException('Cannot send messages to a completed or cancelled conversation');
    }

    // Validate message against current debate phase rules
    const phaseValidation = await this.debatePhaseService.validateMessageForPhase(
      {
        conversationId,
        userId,
        content,
        contentType: contentType || MessageContentType.TEXT,
      },
      conversationId
    );

    if (!phaseValidation.isValid) {
      throw new BadRequestException(`Phase validation failed: ${phaseValidation.errors.join(', ')}`);
    }

    // Log warnings if any
    if (phaseValidation.warnings.length > 0) {
      console.warn('Phase validation warnings:', phaseValidation.warnings);
    }

    // Create the message
    const message = await this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        user_id: userId,
        content: content.trim(),
        content_type: contentType || MessageContentType.TEXT,
        message_metadata: processedMetadata || {},
        reply_to_id: replyToId,
        status: MessageStatus.SENT,
        moderation_status: ModerationStatus.APPROVED, // Will be updated by moderation pipeline
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
    });

    // Transform to response DTO
    const messageResponse = this.transformToMessageResponseDto(message);
    
    // Get participant IDs for broadcasting
    const participantIds = [conversation.match.student1_id, conversation.match.student2_id];
    
    // Broadcast message to real-time participants
    await this.messageBroadcastService.broadcastMessage(messageResponse, participantIds);

    return messageResponse;
  }

  /**
   * Edit an existing message (within time limit)
   */
  async editMessage(
    messageId: string,
    userId: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    const { content, metadata } = updateMessageDto;

    // Find the message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
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

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user owns the message
    if (message.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Check if message can still be edited (5 minute window)
    const editTimeLimit = 5 * 60 * 1000; // 5 minutes in milliseconds
    const timeSinceCreated = Date.now() - message.created_at.getTime();
    
    if (timeSinceCreated > editTimeLimit) {
      throw new BadRequestException('Message can no longer be edited (5 minute time limit exceeded)');
    }

    // Validate new content
    const contentValidation = this.validationService.validateMessageContent(
      content,
      message.content_type,
    );

    if (!contentValidation.isValid) {
      throw new BadRequestException(`Message validation failed: ${contentValidation.errors.join(', ')}`);
    }

    // Validate metadata
    const metadataValidation = this.validationService.validateMessageMetadata(metadata);
    if (!metadataValidation.isValid) {
      throw new BadRequestException(`Metadata validation failed: ${metadataValidation.errors.join(', ')}`);
    }

    // Update the message
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        message_metadata: {
          ...message.message_metadata,
          ...metadata,
          editHistory: [
            ...(message.message_metadata?.editHistory || []),
            {
              editedAt: new Date(),
              previousContent: message.content,
              editReason: metadata?.editReason,
            },
          ],
        },
        edited_at: new Date(),
        moderation_status: ModerationStatus.APPROVED, // Re-validate with moderation
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
    });

    // Transform to response DTO
    const messageResponse = this.transformToMessageResponseDto(updatedMessage);
    
    // Get participant IDs for broadcasting
    const participantIds = [message.conversation.match.student1_id, message.conversation.match.student2_id];
    
    // Broadcast edit to real-time participants
    await this.messageBroadcastService.broadcastMessageEdit(messageResponse, participantIds);

    return messageResponse;
  }

  /**
   * Soft delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    // Find the message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user owns the message
    if (message.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Check if message can still be deleted (10 minute window)
    const deleteTimeLimit = 10 * 60 * 1000; // 10 minutes in milliseconds
    const timeSinceCreated = Date.now() - message.created_at.getTime();
    
    if (timeSinceCreated > deleteTimeLimit) {
      throw new BadRequestException('Message can no longer be deleted (10 minute time limit exceeded)');
    }

    // Soft delete the message
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.DELETED,
        content: '[This message was deleted]',
        message_metadata: {
          ...message.message_metadata,
          deletedAt: new Date(),
          deletedBy: userId,
        },
      },
    });

    // Get participant IDs for broadcasting
    const participantIds = [message.conversation.match.student1_id, message.conversation.match.student2_id];
    
    // Broadcast deletion to real-time participants
    await this.messageBroadcastService.broadcastMessageDeletion(
      messageId, 
      message.conversation_id,
      userId,
      participantIds
    );
  }

  /**
   * Get message thread
   */
  async getMessageThread(messageId: string, userId: string) {
    return this.threadService.getMessageThread(messageId, userId);
  }

  /**
   * Get a single message by ID
   */
  async getMessageById(messageId: string, userId: string): Promise<MessageResponseDto> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
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
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to this message
    const isParticipant = 
      message.conversation.match.student1_id === userId || 
      message.conversation.match.student2_id === userId;

    if (!isParticipant) {
      throw new ForbiddenException('Access denied: User is not a participant in this conversation');
    }

    return this.transformToMessageResponseDto(message);
  }

  /**
   * React to a message (emoji reaction)
   */
  async reactToMessage(messageId: string, userId: string, emoji: string): Promise<void> {
    // Find the message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to the conversation
    await this.verifyConversationAccess(message.conversation_id, userId);

    // Update message with reaction
    const reactions = message.message_metadata?.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    // Toggle reaction
    const userReactionIndex = reactions[emoji].indexOf(userId);
    if (userReactionIndex > -1) {
      reactions[emoji].splice(userReactionIndex, 1);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji].push(userId);
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        message_metadata: {
          ...message.message_metadata,
          reactions,
        },
      },
    });

    // Get participant IDs for broadcasting
    const participantIds = [message.conversation.match.student1_id, message.conversation.match.student2_id];
    
    // Broadcast reaction to real-time participants
    await this.messageBroadcastService.broadcastMessageReaction(
      messageId,
      message.conversation_id,
      emoji,
      userId,
      participantIds
    );
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
      throw new ForbiddenException('Access denied: User is not a participant in this conversation');
    }
  }

  // Phase validation moved to DebatePhaseService - this method is no longer needed

  /**
   * Send optimistic message for immediate UI feedback
   */
  async sendOptimisticMessage(
    tempId: string,
    userId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<{ tempId: string; timestamp: Date }> {
    const { conversationId, content } = createMessageDto;
    
    // Verify user has access to the conversation
    await this.verifyConversationAccess(conversationId, userId);
    
    // Get conversation details for participants
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const participantIds = [conversation.match.student1_id, conversation.match.student2_id];
    
    // Send optimistic message
    await this.messageBroadcastService.sendOptimisticMessage(
      tempId,
      conversationId,
      userId,
      content,
      participantIds
    );

    return { tempId, timestamp: new Date() };
  }

  /**
   * Confirm optimistic message with actual saved message
   */
  async confirmOptimisticMessage(
    tempId: string,
    actualMessage: MessageResponseDto,
  ): Promise<void> {
    // Get conversation details
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: actualMessage.conversationId },
      include: { match: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const participantIds = [conversation.match.student1_id, conversation.match.student2_id];
    
    await this.messageBroadcastService.confirmOptimisticMessage(
      tempId,
      actualMessage,
      participantIds
    );
  }

  /**
   * Handle message delivery confirmation
   */
  async handleDeliveryConfirmation(messageId: string, userId: string): Promise<void> {
    await this.messageBroadcastService.handleDeliveryConfirmation(messageId, userId);
  }

  /**
   * Handle message read confirmation
   */
  async handleReadConfirmation(messageId: string, userId: string): Promise<void> {
    await this.messageBroadcastService.handleReadConfirmation(messageId, userId);
  }

  /**
   * Sync messages for a user across devices
   */
  async syncMessages(
    userId: string,
    conversationId: string,
    lastSyncTime: Date,
    deviceId: string,
  ): Promise<MessageResponseDto[]> {
    // Verify user has access to the conversation
    await this.verifyConversationAccess(conversationId, userId);
    
    return this.messageBroadcastService.syncMessagesForUser(
      userId,
      conversationId,
      lastSyncTime,
      deviceId
    );
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
    };
  }
}
