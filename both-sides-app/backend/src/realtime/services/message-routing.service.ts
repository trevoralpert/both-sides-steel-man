import { Injectable, Logger } from '@nestjs/common';
import { AblyConfigService } from '../ably-config.service';
import { ConnectionManagerService } from '../connection-manager.service';
import { MessageDeliveryConfirmationService } from './message-delivery-confirmation.service';
import { MessageOrderingService, OrderedMessage } from './message-ordering.service';
import {
  MessageDelivery,
  BroadcastResult,
  MessageQueue,
  QueuedMessage,
  DeliveryConfirmation,
  MessageRoutingOptions,
} from '../dto/message-delivery.dto';
import Ably from 'ably';

interface Message {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  contentType: 'text' | 'system' | 'moderation' | 'coaching';
  timestamp: Date;
  metadata?: any;
}

interface MessageBroadcast {
  message: Message;
  conversationId: string;
  sender: { id: string; name?: string };
  recipients: string[];
  timestamp: Date;
  deliveryOptions: MessageRoutingOptions;
}

@Injectable()
export class MessageRoutingService {
  private readonly logger = new Logger(MessageRoutingService.name);
  private readonly messageQueues = new Map<string, MessageQueue>();
  private readonly deliveryTracking = new Map<string, MessageDelivery>();
  private readonly processedMessageIds = new Set<string>();
  
  // Configuration
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_TIMEOUT_MS = 5000;
  private readonly OFFLINE_QUEUE_RETENTION_HOURS = 24;
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly DUPLICATE_DETECTION_WINDOW_MS = 30000;

  constructor(
    private readonly ablyConfigService: AblyConfigService,
    private readonly connectionManagerService: ConnectionManagerService,
    private readonly deliveryConfirmationService: MessageDeliveryConfirmationService,
    private readonly messageOrderingService: MessageOrderingService,
  ) {
    this.startQueueProcessor();
    this.startDeliveryCleanup();
    this.setupOrderingCallbacks();
  }

  /**
   * Broadcast message to all conversation participants
   */
  async broadcastMessage(broadcast: MessageBroadcast): Promise<BroadcastResult> {
    const { message, conversationId, recipients, deliveryOptions } = broadcast;
    
    this.logger.debug(`Broadcasting message ${message.id} to ${recipients.length} recipients`);

    // Check for duplicate messages
    if (this.isDuplicateMessage(message.id)) {
      this.logger.warn(`Duplicate message detected: ${message.id}`);
      throw new Error('Duplicate message detected');
    }

    // Create delivery tracking
    const delivery = this.createMessageDelivery(message, recipients, deliveryOptions);
    this.deliveryTracking.set(message.id, delivery);
    
    // Initialize delivery confirmation tracking
    this.deliveryConfirmationService.initializeDeliveryTracking(delivery);

    // Initialize message ordering for conversation
    this.messageOrderingService.initializeConversation(conversationId);

    // Get sequence number for ordered delivery
    const sequence = this.messageOrderingService.getNextSequenceNumber(conversationId);

    // Create ordered message
    const orderedMessage: OrderedMessage = {
      ...message,
      sequence,
    };

    // Get conversation channel
    const channel = this.getConversationChannel(conversationId);
    if (!channel) {
      throw new Error(`Conversation channel not found: ${conversationId}`);
    }

    const result: BroadcastResult = {
      messageId: message.id,
      deliveryId: this.generateDeliveryId(),
      recipients: [...recipients],
      deliveredCount: 0,
      pendingCount: recipients.length,
      failedRecipients: [],
      broadcastTime: new Date(),
    };

    try {
      // Add message to ordering service for proper sequencing
      await this.messageOrderingService.addMessage(orderedMessage);

      // Broadcast to real-time channel with sequence information
      await channel.publish('message', {
        ...orderedMessage,
        sender: broadcast.sender,
        deliveryId: result.deliveryId,
        timestamp: broadcast.timestamp.toISOString(),
      });

      // Track delivery status per recipient
      const deliveryPromises = recipients.map(async (recipientId) => {
        try {
          await this.deliverToRecipient(message, recipientId, deliveryOptions);
          delivery.deliveryStatus.set(recipientId, 'delivered');
          result.deliveredCount++;
          result.pendingCount--;
        } catch (error) {
          this.logger.warn(`Failed to deliver to ${recipientId}:`, error);
          
          // Queue for offline delivery if recipient is offline
          if (deliveryOptions.queueOfflineMessages) {
            await this.queueOfflineMessage(message, recipientId);
          } else {
            result.failedRecipients.push(recipientId);
            result.pendingCount--;
          }
        }
      });

      await Promise.allSettled(deliveryPromises);

      // Mark message as processed
      this.markMessageAsProcessed(message.id);

      this.logger.log(
        `Message ${message.id} broadcast complete: ${result.deliveredCount} delivered, ${result.failedRecipients.length} failed`
      );

      return result;

    } catch (error) {
      this.logger.error(`Failed to broadcast message ${message.id}:`, error);
      throw error;
    }
  }

  /**
   * Queue message for offline user delivery
   */
  async queueOfflineMessage(message: Message, userId: string): Promise<void> {
    const queueKey = `${userId}:${message.conversationId}`;
    
    let queue = this.messageQueues.get(queueKey);
    if (!queue) {
      queue = {
        userId,
        conversationId: message.conversationId,
        messages: [],
        lastProcessed: new Date(),
      };
      this.messageQueues.set(queueKey, queue);
    }

    // Check queue size limit
    if (queue.messages.length >= this.MAX_QUEUE_SIZE) {
      // Remove oldest message
      queue.messages.shift();
      this.logger.warn(`Queue size limit reached for ${queueKey}, removed oldest message`);
    }

    const queuedMessage: QueuedMessage = {
      messageId: message.id,
      content: {
        id: message.id,
        conversationId: message.conversationId,
        userId: message.userId,
        content: message.content,
        contentType: message.contentType,
        timestamp: message.timestamp,
        metadata: message.metadata,
      },
      timestamp: new Date(),
      priority: 'medium',
      retryCount: 0,
      expiresAt: new Date(Date.now() + this.OFFLINE_QUEUE_RETENTION_HOURS * 60 * 60 * 1000),
    };

    queue.messages.push(queuedMessage);
    
    this.logger.debug(`Queued message ${message.id} for offline user ${userId}`);
  }

  /**
   * Confirm message delivery
   */
  async confirmDelivery(messageId: string, userId: string, latency?: number): Promise<void> {
    const confirmation: DeliveryConfirmation = {
      messageId,
      userId,
      deliveryType: 'delivered',
      timestamp: new Date(),
      latency,
    };

    // Process delivery confirmation through the confirmation service
    await this.deliveryConfirmationService.processDeliveryConfirmation(confirmation);

    this.logger.debug(`Delivery confirmed for message ${messageId} by user ${userId}`);
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    const readConfirmation: DeliveryConfirmation = {
      messageId,
      userId,
      deliveryType: 'read',
      timestamp: new Date(),
    };

    // Process read confirmation through the confirmation service
    await this.deliveryConfirmationService.processDeliveryConfirmation(readConfirmation);

    this.logger.debug(`Message ${messageId} marked as read by user ${userId}`);
  }

  /**
   * Get undelivered messages for user when they come online
   */
  async getUndeliveredMessages(userId: string, conversationId: string): Promise<Message[]> {
    const queueKey = `${userId}:${conversationId}`;
    const queue = this.messageQueues.get(queueKey);
    
    if (!queue || queue.messages.length === 0) {
      return [];
    }

    // Filter out expired messages
    const now = new Date();
    const validMessages = queue.messages
      .filter(queuedMsg => queuedMsg.expiresAt > now)
      .map(queuedMsg => queuedMsg.content as Message)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Update queue with only unexpired messages
    queue.messages = queue.messages.filter(queuedMsg => queuedMsg.expiresAt > now);
    queue.lastProcessed = new Date();

    this.logger.log(`Retrieved ${validMessages.length} undelivered messages for user ${userId}`);
    return validMessages;
  }

  /**
   * Process message delivery to specific recipient
   */
  private async deliverToRecipient(
    message: Message, 
    recipientId: string, 
    options: MessageRoutingOptions
  ): Promise<void> {
    const connectionState = this.connectionManagerService.getConnectionState(
      message.conversationId,
      recipientId
    );

    if (!connectionState || connectionState.status !== 'connected') {
      throw new Error(`Recipient ${recipientId} is not connected`);
    }

    // Get recipient-specific coaching channel if it's a coaching message
    let channel: Ably.RealtimeChannel | null;
    
    if (message.contentType === 'coaching') {
      channel = this.connectionManagerService.getChannel(
        message.conversationId,
        recipientId,
        `coaching:${recipientId}:${message.conversationId}`
      );
    } else {
      channel = this.connectionManagerService.getChannel(
        message.conversationId,
        recipientId,
        `conversation:${message.conversationId}`
      );
    }

    if (!channel) {
      throw new Error(`Channel not found for recipient ${recipientId}`);
    }

    // Publish message with delivery tracking
    await channel.publish('direct_message', {
      ...message,
      recipientId,
      deliveryOptions: options,
      timestamp: message.timestamp.toISOString(),
    });
  }

  /**
   * Check if message is duplicate within detection window
   */
  private isDuplicateMessage(messageId: string): boolean {
    if (this.processedMessageIds.has(messageId)) {
      return true;
    }
    return false;
  }

  /**
   * Mark message as processed to prevent duplicates
   */
  private markMessageAsProcessed(messageId: string): void {
    this.processedMessageIds.add(messageId);
    
    // Clean up old message IDs after detection window
    setTimeout(() => {
      this.processedMessageIds.delete(messageId);
    }, this.DUPLICATE_DETECTION_WINDOW_MS);
  }

  /**
   * Create message delivery tracking object
   */
  private createMessageDelivery(
    message: Message, 
    recipients: string[], 
    options: MessageRoutingOptions
  ): MessageDelivery {
    const deliveryStatus = new Map<string, 'pending' | 'delivered' | 'read'>();
    recipients.forEach(recipientId => {
      deliveryStatus.set(recipientId, 'pending');
    });

    return {
      messageId: message.id,
      conversationId: message.conversationId,
      senderId: message.userId,
      recipients: [...recipients],
      deliveryStatus,
      timestamp: new Date(),
      retryCount: 0,
      metadata: {
        messageType: message.contentType,
        priority: options.priority,
        requiresAcknowledgment: options.requireAcknowledgment,
      },
    };
  }

  /**
   * Get conversation channel for broadcasting
   */
  private getConversationChannel(conversationId: string): Ably.RealtimeChannel | null {
    const ablyClient = this.ablyConfigService.getClient();
    return ablyClient.channels.get(`conversation:${conversationId}`);
  }

  /**
   * Get message tracking channel
   */
  private getTrackingChannel(messageId: string): Ably.RealtimeChannel | null {
    const ablyClient = this.ablyConfigService.getClient();
    return ablyClient.channels.get(`tracking:${messageId}`);
  }

  /**
   * Generate unique delivery ID
   */
  private generateDeliveryId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start background processor for queued messages
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      await this.processQueuedMessages();
    }, 30000); // Process every 30 seconds
  }

  /**
   * Process queued messages for users who come online
   */
  private async processQueuedMessages(): Promise<void> {
    for (const [queueKey, queue] of this.messageQueues.entries()) {
      const [userId, conversationId] = queueKey.split(':');
      
      const connectionState = this.connectionManagerService.getConnectionState(conversationId, userId);
      
      if (connectionState && connectionState.status === 'connected' && queue.messages.length > 0) {
        this.logger.debug(`Processing ${queue.messages.length} queued messages for online user ${userId}`);
        
        const messagesToDeliver = queue.messages.splice(0, 10); // Deliver up to 10 messages at a time
        
        for (const queuedMessage of messagesToDeliver) {
          try {
            await this.deliverToRecipient(
              queuedMessage.content as Message,
              userId,
              {
                requireAcknowledgment: false,
                retryAttempts: 1,
                timeoutMs: this.DEFAULT_TIMEOUT_MS,
                priority: queuedMessage.priority,
                queueOfflineMessages: false,
              }
            );
            
            this.logger.debug(`Delivered queued message ${queuedMessage.messageId} to ${userId}`);
          } catch (error) {
            this.logger.warn(`Failed to deliver queued message ${queuedMessage.messageId}:`, error);
            
            // Re-queue with incremented retry count if under limit
            if (queuedMessage.retryCount < this.DEFAULT_RETRY_ATTEMPTS) {
              queuedMessage.retryCount++;
              queue.messages.unshift(queuedMessage);
            }
          }
        }
        
        queue.lastProcessed = new Date();
      }
    }
  }

  /**
   * Clean up expired delivery tracking data
   */
  private startDeliveryCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expireTime = 60 * 60 * 1000; // 1 hour
      
      for (const [messageId, delivery] of this.deliveryTracking.entries()) {
        if (now.getTime() - delivery.timestamp.getTime() > expireTime) {
          this.deliveryTracking.delete(messageId);
        }
      }
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Set up callbacks for ordered message delivery
   */
  private setupOrderingCallbacks(): void {
    // This would be set up for each active conversation
    // For now, we register a default callback that logs ordered delivery
    // In practice, this would be registered per conversation when participants join
    
    this.logger.debug('Message ordering callbacks initialized');
  }

  /**
   * Register ordering callback for a specific conversation
   */
  registerOrderingCallback(conversationId: string): void {
    this.messageOrderingService.registerDeliveryCallback(conversationId, (orderedMessage: OrderedMessage) => {
      this.logger.debug(`Delivering ordered message ${orderedMessage.id} with sequence ${orderedMessage.sequence}`);
      
      // The ordered message is now ready for final delivery to clients
      // This is where we would trigger the final real-time delivery
      this.finalizeMessageDelivery(orderedMessage);
    });
  }

  /**
   * Finalize delivery of an ordered message
   */
  private async finalizeMessageDelivery(orderedMessage: OrderedMessage): Promise<void> {
    const channel = this.getConversationChannel(orderedMessage.conversationId);
    if (channel) {
      await channel.publish('ordered_message', {
        ...orderedMessage,
        timestamp: orderedMessage.timestamp.toISOString(),
        finalDelivery: true,
      });
    }
  }

  /**
   * Clean up ordering for ended conversation
   */
  cleanupConversationOrdering(conversationId: string): void {
    this.messageOrderingService.cleanupConversation(conversationId);
    this.logger.debug(`Cleaned up message ordering for conversation ${conversationId}`);
  }
}
