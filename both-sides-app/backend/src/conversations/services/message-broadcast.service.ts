import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageRoutingService } from '../../realtime/services/message-routing.service';
import { ConnectionManagerService } from '../../realtime/connection-manager.service';
import { MessageStatus } from '@prisma/client';
import { MessageResponseDto } from '../dto/message-response.dto';

interface OptimisticMessage {
  tempId: string;
  conversationId: string;
  userId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'failed';
}

interface MessageBroadcastPayload {
  type: 'message' | 'edit' | 'delete' | 'reaction' | 'status_update';
  messageId: string;
  conversationId: string;
  senderId: string;
  data: any;
  timestamp: Date;
  optimistic?: boolean;
}

interface MessageStatusUpdate {
  messageId: string;
  userId: string;
  status: 'delivered' | 'read';
  timestamp: Date;
}

interface CrossDeviceSync {
  userId: string;
  conversationId: string;
  lastSyncTime: Date;
  deviceId: string;
}

@Injectable()
export class MessageBroadcastService {
  private readonly logger = new Logger(MessageBroadcastService.name);
  
  // In-memory stores for real-time state management
  private readonly optimisticMessages = new Map<string, OptimisticMessage>();
  private readonly messageStatusMap = new Map<string, Map<string, MessageStatus>>();
  private readonly deviceSyncMap = new Map<string, Date>(); // userId -> lastSyncTime
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageRoutingService: MessageRoutingService,
    private readonly connectionManagerService: ConnectionManagerService,
  ) {
    this.startStatusCleanup();
  }

  /**
   * Broadcast new message with optimistic updates
   */
  async broadcastMessage(
    message: MessageResponseDto, 
    participantIds: string[]
  ): Promise<void> {
    const broadcastPayload: MessageBroadcastPayload = {
      type: 'message',
      messageId: message.id,
      conversationId: message.conversationId,
      senderId: message.userId,
      data: {
        message,
        optimistic: false, // This is a confirmed message from DB
      },
      timestamp: new Date(),
      optimistic: false,
    };

    try {
      // Broadcast to all participants via message routing
      await this.messageRoutingService.broadcastMessage({
        message: this.mapToRoutingMessage(message),
        conversationId: message.conversationId,
        senderId: message.userId,
        recipients: participantIds,
        timestamp: new Date(),
        deliveryOptions: {
          requireAcknowledgment: true,
          retryAttempts: 3,
          timeoutMs: 5000,
        },
      });

      // Initialize delivery status tracking
      const statusMap = new Map<string, MessageStatus>();
      participantIds.forEach(userId => {
        statusMap.set(userId, MessageStatus.SENT);
      });
      this.messageStatusMap.set(message.id, statusMap);

      // Send individual delivery confirmations as they come in
      await this.trackDeliveryStatus(message.id, participantIds);

      this.logger.debug(`Message ${message.id} broadcast to ${participantIds.length} participants`);

    } catch (error) {
      this.logger.error(`Failed to broadcast message ${message.id}:`, error);
      
      // Update message status to failed in database
      await this.updateMessageStatus(message.id, MessageStatus.FAILED);
      
      // Broadcast failure status to sender
      await this.broadcastStatusUpdate({
        messageId: message.id,
        userId: message.userId,
        status: 'failed' as any,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle optimistic message updates for immediate UI feedback
   */
  async sendOptimisticMessage(
    tempId: string,
    conversationId: string,
    userId: string,
    content: string,
    participantIds: string[]
  ): Promise<void> {
    const optimisticMessage: OptimisticMessage = {
      tempId,
      conversationId,
      userId,
      content,
      timestamp: new Date(),
      status: 'sending',
    };

    // Store optimistic message
    this.optimisticMessages.set(tempId, optimisticMessage);

    // Broadcast optimistic message immediately to sender
    const optimisticPayload: MessageBroadcastPayload = {
      type: 'message',
      messageId: tempId,
      conversationId,
      senderId: userId,
      data: {
        message: {
          id: tempId,
          conversationId,
          userId,
          content,
          contentType: 'TEXT',
          status: 'SENT',
          createdAt: new Date(),
          optimistic: true,
        },
      },
      timestamp: new Date(),
      optimistic: true,
    };

    // Send optimistic update only to sender's devices
    await this.broadcastToUserDevices(userId, optimisticPayload);
  }

  /**
   * Confirm optimistic message with actual database message
   */
  async confirmOptimisticMessage(
    tempId: string,
    actualMessage: MessageResponseDto,
    participantIds: string[]
  ): Promise<void> {
    const optimisticMsg = this.optimisticMessages.get(tempId);
    
    if (!optimisticMsg) {
      // No optimistic message found, just broadcast normally
      await this.broadcastMessage(actualMessage, participantIds);
      return;
    }

    // Remove optimistic message from store
    this.optimisticMessages.delete(tempId);

    // Update sender with confirmed message
    const confirmationPayload: MessageBroadcastPayload = {
      type: 'message',
      messageId: actualMessage.id,
      conversationId: actualMessage.conversationId,
      senderId: actualMessage.userId,
      data: {
        message: actualMessage,
        replacesTempId: tempId,
        confirmed: true,
      },
      timestamp: new Date(),
    };

    // Send confirmation to sender
    await this.broadcastToUserDevices(actualMessage.userId, confirmationPayload);

    // Broadcast actual message to other participants
    const otherParticipants = participantIds.filter(id => id !== actualMessage.userId);
    if (otherParticipants.length > 0) {
      await this.broadcastMessage(actualMessage, otherParticipants);
    }
  }

  /**
   * Handle optimistic message failure and rollback
   */
  async rollbackOptimisticMessage(tempId: string, error: string): Promise<void> {
    const optimisticMsg = this.optimisticMessages.get(tempId);
    
    if (!optimisticMsg) {
      return;
    }

    // Mark as failed
    optimisticMsg.status = 'failed';

    // Send rollback notification to sender
    const rollbackPayload: MessageBroadcastPayload = {
      type: 'message',
      messageId: tempId,
      conversationId: optimisticMsg.conversationId,
      senderId: optimisticMsg.userId,
      data: {
        tempId,
        failed: true,
        error,
        rollback: true,
      },
      timestamp: new Date(),
    };

    await this.broadcastToUserDevices(optimisticMsg.userId, rollbackPayload);

    // Remove from store after rollback
    setTimeout(() => {
      this.optimisticMessages.delete(tempId);
    }, 5000); // Keep for 5 seconds for any delayed operations
  }

  /**
   * Broadcast message edit
   */
  async broadcastMessageEdit(
    updatedMessage: MessageResponseDto,
    participantIds: string[]
  ): Promise<void> {
    const editPayload: MessageBroadcastPayload = {
      type: 'edit',
      messageId: updatedMessage.id,
      conversationId: updatedMessage.conversationId,
      senderId: updatedMessage.userId,
      data: {
        message: updatedMessage,
        editedAt: updatedMessage.editedAt,
      },
      timestamp: new Date(),
    };

    await this.broadcastToParticipants(participantIds, editPayload);
  }

  /**
   * Broadcast message deletion
   */
  async broadcastMessageDeletion(
    messageId: string,
    conversationId: string,
    userId: string,
    participantIds: string[]
  ): Promise<void> {
    const deletePayload: MessageBroadcastPayload = {
      type: 'delete',
      messageId,
      conversationId,
      senderId: userId,
      data: {
        messageId,
        deletedAt: new Date(),
      },
      timestamp: new Date(),
    };

    await this.broadcastToParticipants(participantIds, deletePayload);
  }

  /**
   * Broadcast message reaction
   */
  async broadcastMessageReaction(
    messageId: string,
    conversationId: string,
    emoji: string,
    userId: string,
    participantIds: string[]
  ): Promise<void> {
    const reactionPayload: MessageBroadcastPayload = {
      type: 'reaction',
      messageId,
      conversationId,
      senderId: userId,
      data: {
        messageId,
        emoji,
        userId,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    await this.broadcastToParticipants(participantIds, reactionPayload);
  }

  /**
   * Handle message delivery confirmation
   */
  async handleDeliveryConfirmation(
    messageId: string,
    userId: string
  ): Promise<void> {
    const statusMap = this.messageStatusMap.get(messageId);
    
    if (statusMap) {
      statusMap.set(userId, MessageStatus.DELIVERED);
      
      // Broadcast delivery status to sender
      const message = await this.getMessageById(messageId);
      if (message) {
        await this.broadcastStatusUpdate({
          messageId,
          userId: message.userId,
          status: 'delivered',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Handle message read confirmation
   */
  async handleReadConfirmation(
    messageId: string,
    userId: string
  ): Promise<void> {
    const statusMap = this.messageStatusMap.get(messageId);
    
    if (statusMap) {
      statusMap.set(userId, MessageStatus.READ);
      
      // Update database
      await this.updateMessageReadStatus(messageId, userId);
      
      // Broadcast read status to sender
      const message = await this.getMessageById(messageId);
      if (message) {
        await this.broadcastStatusUpdate({
          messageId,
          userId: message.userId,
          status: 'read',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Sync messages across devices for a user
   */
  async syncMessagesForUser(
    userId: string,
    conversationId: string,
    lastSyncTime: Date,
    deviceId: string
  ): Promise<MessageResponseDto[]> {
    // Get messages since last sync
    const messages = await this.prisma.message.findMany({
      where: {
        conversation_id: conversationId,
        updated_at: {
          gt: lastSyncTime,
        },
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
      orderBy: {
        created_at: 'asc',
      },
    });

    // Update sync timestamp for this device
    this.deviceSyncMap.set(`${userId}:${deviceId}`, new Date());

    // Transform and return messages
    return messages.map(msg => this.transformToMessageResponseDto(msg));
  }

  /**
   * Get message status for all participants
   */
  getMessageStatus(messageId: string): Map<string, MessageStatus> | undefined {
    return this.messageStatusMap.get(messageId);
  }

  // Private helper methods

  private async broadcastToParticipants(
    participantIds: string[],
    payload: MessageBroadcastPayload
  ): Promise<void> {
    for (const userId of participantIds) {
      await this.broadcastToUserDevices(userId, payload);
    }
  }

  private async broadcastToUserDevices(
    userId: string,
    payload: MessageBroadcastPayload
  ): Promise<void> {
    // Use message routing service to send to user's active connections
    const routingMessage = {
      id: payload.messageId,
      conversationId: payload.conversationId,
      userId: payload.senderId,
      content: JSON.stringify(payload.data),
      contentType: 'system' as const,
      timestamp: payload.timestamp,
    };

    try {
      await this.messageRoutingService.broadcastMessage({
        message: routingMessage,
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        recipients: [userId],
        timestamp: payload.timestamp,
        deliveryOptions: {
          requireAcknowledgment: false,
          retryAttempts: 1,
          timeoutMs: 3000,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast to user ${userId}:`, error);
    }
  }

  private async trackDeliveryStatus(
    messageId: string,
    participantIds: string[]
  ): Promise<void> {
    // This would integrate with the delivery confirmation service
    // For now, simulate delivery tracking
    setTimeout(async () => {
      for (const userId of participantIds) {
        const connectionState = this.connectionManagerService.getConnectionState(
          await this.getConversationId(messageId),
          userId
        );
        
        if (connectionState && connectionState.status === 'connected') {
          await this.handleDeliveryConfirmation(messageId, userId);
        }
      }
    }, 1000);
  }

  private async broadcastStatusUpdate(
    statusUpdate: MessageStatusUpdate
  ): Promise<void> {
    const payload: MessageBroadcastPayload = {
      type: 'status_update',
      messageId: statusUpdate.messageId,
      conversationId: await this.getConversationId(statusUpdate.messageId),
      senderId: statusUpdate.userId,
      data: statusUpdate,
      timestamp: statusUpdate.timestamp,
    };

    await this.broadcastToUserDevices(statusUpdate.userId, payload);
  }

  private async updateMessageStatus(
    messageId: string,
    status: MessageStatus
  ): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { status },
    });
  }

  private async updateMessageReadStatus(
    messageId: string,
    userId: string
  ): Promise<void> {
    // This would typically be stored in a separate read_receipts table
    // For now, we'll add it to message metadata
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (message) {
      const readReceipts = message.message_metadata?.readReceipts || {};
      readReceipts[userId] = new Date();

      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          message_metadata: {
            ...message.message_metadata,
            readReceipts,
          },
        },
      });
    }
  }

  private async getMessageById(messageId: string): Promise<MessageResponseDto | null> {
    const message = await this.prisma.message.findUnique({
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

    return message ? this.transformToMessageResponseDto(message) : null;
  }

  private async getConversationId(messageId: string): Promise<string> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversation_id: true },
    });
    
    return message?.conversation_id || '';
  }

  private mapToRoutingMessage(message: MessageResponseDto): any {
    return {
      id: message.id,
      conversationId: message.conversationId,
      userId: message.userId,
      content: message.content,
      contentType: message.contentType,
      timestamp: message.createdAt,
      metadata: message.messageMetadata,
    };
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

  private startStatusCleanup(): void {
    // Clean up old message status tracking every hour
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      for (const [messageId, statusMap] of this.messageStatusMap.entries()) {
        // Remove tracking for old messages (this is a simplified cleanup)
        // In production, you'd want more sophisticated cleanup logic
      }
      
      // Clean up old optimistic messages
      for (const [tempId, optimisticMsg] of this.optimisticMessages.entries()) {
        if (optimisticMsg.timestamp < oneHourAgo) {
          this.optimisticMessages.delete(tempId);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }
}
