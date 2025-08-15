import { Injectable, Logger } from '@nestjs/common';
import { AblyConfigService } from '../ably-config.service';
import { ConnectionManagerService } from '../connection-manager.service';
import { DeliveryConfirmation, MessageDelivery } from '../dto/message-delivery.dto';
import Ably from 'ably';

export interface DeliveryStatusUpdate {
  messageId: string;
  userId: string;
  status: 'pending' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  metadata?: {
    latency?: number;
    deviceInfo?: string;
    errorReason?: string;
  };
}

export interface MessageStatusSummary {
  messageId: string;
  conversationId: string;
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  pendingCount: number;
  failedCount: number;
  lastUpdated: Date;
  recipientStatuses: {
    userId: string;
    status: 'pending' | 'delivered' | 'read' | 'failed';
    timestamp: Date;
    latency?: number;
  }[];
}

@Injectable()
export class MessageDeliveryConfirmationService {
  private readonly logger = new Logger(MessageDeliveryConfirmationService.name);
  private readonly deliveryTracker = new Map<string, MessageDelivery>();
  private readonly statusUpdateHandlers = new Map<string, (update: DeliveryStatusUpdate) => void>();
  
  // Configuration
  private readonly DELIVERY_TIMEOUT_MS = 30000; // 30 seconds
  private readonly READ_RECEIPT_TIMEOUT_MS = 300000; // 5 minutes
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute

  constructor(
    private readonly ablyConfigService: AblyConfigService,
    private readonly connectionManagerService: ConnectionManagerService,
  ) {
    this.startStatusCleanup();
  }

  /**
   * Initialize delivery tracking for a message
   */
  initializeDeliveryTracking(delivery: MessageDelivery): void {
    this.deliveryTracker.set(delivery.messageId, delivery);
    
    // Set up delivery timeout for each recipient
    delivery.recipients.forEach(recipientId => {
      this.setDeliveryTimeout(delivery.messageId, recipientId);
    });

    this.logger.debug(`Initialized delivery tracking for message ${delivery.messageId}`);
  }

  /**
   * Process delivery confirmation from client
   */
  async processDeliveryConfirmation(confirmation: DeliveryConfirmation): Promise<void> {
    const { messageId, userId, deliveryType, timestamp, latency } = confirmation;
    
    this.logger.debug(`Processing ${deliveryType} confirmation for message ${messageId} from user ${userId}`);

    const delivery = this.deliveryTracker.get(messageId);
    if (!delivery) {
      this.logger.warn(`No delivery tracking found for message ${messageId}`);
      return;
    }

    // Update delivery status
    const currentStatus = delivery.deliveryStatus.get(userId);
    if (!currentStatus) {
      this.logger.warn(`User ${userId} not found in recipient list for message ${messageId}`);
      return;
    }

    // Update status based on confirmation type
    if (deliveryType === 'delivered' && (currentStatus === 'pending' || currentStatus === 'delivered')) {
      delivery.deliveryStatus.set(userId, 'delivered');
    } else if (deliveryType === 'read' && currentStatus !== 'pending') {
      delivery.deliveryStatus.set(userId, 'read');
    }

    // Create status update
    const statusUpdate: DeliveryStatusUpdate = {
      messageId,
      userId,
      status: delivery.deliveryStatus.get(userId)!,
      timestamp,
      metadata: { latency },
    };

    // Broadcast status update to conversation participants
    await this.broadcastStatusUpdate(delivery.conversationId, statusUpdate);

    // Call registered status update handlers
    const handler = this.statusUpdateHandlers.get(messageId);
    if (handler) {
      handler(statusUpdate);
    }

    this.logger.debug(`Updated delivery status for message ${messageId}, user ${userId}: ${statusUpdate.status}`);
  }

  /**
   * Mark message delivery as failed for a specific user
   */
  async markDeliveryFailed(messageId: string, userId: string, reason?: string): Promise<void> {
    const delivery = this.deliveryTracker.get(messageId);
    if (!delivery) {
      this.logger.warn(`No delivery tracking found for message ${messageId}`);
      return;
    }

    delivery.deliveryStatus.set(userId, 'failed');

    const statusUpdate: DeliveryStatusUpdate = {
      messageId,
      userId,
      status: 'failed',
      timestamp: new Date(),
      metadata: { errorReason: reason },
    };

    await this.broadcastStatusUpdate(delivery.conversationId, statusUpdate);

    this.logger.warn(`Marked delivery as failed for message ${messageId}, user ${userId}: ${reason}`);
  }

  /**
   * Get delivery status summary for a message
   */
  getMessageStatusSummary(messageId: string): MessageStatusSummary | null {
    const delivery = this.deliveryTracker.get(messageId);
    if (!delivery) {
      return null;
    }

    let deliveredCount = 0;
    let readCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    const recipientStatuses = delivery.recipients.map(userId => {
      const status = delivery.deliveryStatus.get(userId) || 'pending';
      
      switch (status) {
        case 'delivered':
          deliveredCount++;
          break;
        case 'read':
          readCount++;
          deliveredCount++; // Read implies delivered
          break;
        case 'pending':
          pendingCount++;
          break;
        case 'failed':
          failedCount++;
          break;
      }

      return {
        userId,
        status,
        timestamp: new Date(), // TODO: Track actual timestamps per user
      };
    });

    return {
      messageId,
      conversationId: delivery.conversationId,
      totalRecipients: delivery.recipients.length,
      deliveredCount,
      readCount,
      pendingCount,
      failedCount,
      lastUpdated: new Date(),
      recipientStatuses,
    };
  }

  /**
   * Register callback for status updates on a specific message
   */
  registerStatusUpdateHandler(messageId: string, handler: (update: DeliveryStatusUpdate) => void): void {
    this.statusUpdateHandlers.set(messageId, handler);
  }

  /**
   * Remove status update handler
   */
  unregisterStatusUpdateHandler(messageId: string): void {
    this.statusUpdateHandlers.delete(messageId);
  }

  /**
   * Get all pending deliveries for monitoring
   */
  getPendingDeliveries(): MessageStatusSummary[] {
    return Array.from(this.deliveryTracker.keys())
      .map(messageId => this.getMessageStatusSummary(messageId))
      .filter((summary): summary is MessageStatusSummary => 
        summary !== null && summary.pendingCount > 0
      );
  }

  /**
   * Force retry delivery for failed messages
   */
  async retryFailedDeliveries(messageId: string): Promise<void> {
    const delivery = this.deliveryTracker.get(messageId);
    if (!delivery) {
      this.logger.warn(`No delivery tracking found for message ${messageId}`);
      return;
    }

    const failedRecipients = delivery.recipients.filter(
      userId => delivery.deliveryStatus.get(userId) === 'failed'
    );

    if (failedRecipients.length === 0) {
      this.logger.debug(`No failed deliveries to retry for message ${messageId}`);
      return;
    }

    this.logger.log(`Retrying delivery for ${failedRecipients.length} recipients of message ${messageId}`);

    // Reset failed recipients to pending and set new timeout
    failedRecipients.forEach(userId => {
      delivery.deliveryStatus.set(userId, 'pending');
      this.setDeliveryTimeout(messageId, userId);
    });

    // Increment retry count
    delivery.retryCount++;

    // Broadcast retry notification
    const channel = this.getConversationChannel(delivery.conversationId);
    if (channel) {
      await channel.publish('delivery_retry', {
        messageId,
        recipients: failedRecipients,
        retryCount: delivery.retryCount,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Broadcast status update to conversation participants
   */
  private async broadcastStatusUpdate(conversationId: string, update: DeliveryStatusUpdate): Promise<void> {
    const channel = this.getConversationChannel(conversationId);
    if (!channel) {
      this.logger.warn(`No conversation channel found for ${conversationId}`);
      return;
    }

    try {
      await channel.publish('message_status_update', {
        ...update,
        timestamp: update.timestamp.toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast status update for message ${update.messageId}:`, error);
    }
  }

  /**
   * Set delivery timeout for a specific recipient
   */
  private setDeliveryTimeout(messageId: string, userId: string): void {
    setTimeout(async () => {
      const delivery = this.deliveryTracker.get(messageId);
      if (!delivery) return;

      const currentStatus = delivery.deliveryStatus.get(userId);
      if (currentStatus === 'pending') {
        this.logger.warn(`Delivery timeout for message ${messageId}, user ${userId}`);
        await this.markDeliveryFailed(
          messageId, 
          userId, 
          'Delivery timeout - recipient may be offline'
        );
      }
    }, this.DELIVERY_TIMEOUT_MS);
  }

  /**
   * Get conversation channel for broadcasting updates
   */
  private getConversationChannel(conversationId: string): Ably.RealtimeChannel | null {
    const ablyClient = this.ablyConfigService.getClient();
    return ablyClient.channels.get(`conversation:${conversationId}`);
  }

  /**
   * Clean up old delivery tracking data
   */
  private startStatusCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expireTime = 60 * 60 * 1000; // 1 hour

      for (const [messageId, delivery] of this.deliveryTracker.entries()) {
        if (now.getTime() - delivery.timestamp.getTime() > expireTime) {
          this.deliveryTracker.delete(messageId);
          this.statusUpdateHandlers.delete(messageId);
          this.logger.debug(`Cleaned up delivery tracking for message ${messageId}`);
        }
      }
    }, this.CLEANUP_INTERVAL_MS);
  }
}
