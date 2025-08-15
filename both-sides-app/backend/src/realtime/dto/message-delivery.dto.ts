export interface MessageDelivery {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipients: string[];
  deliveryStatus: Map<string, 'pending' | 'delivered' | 'read'>;
  timestamp: Date;
  retryCount: number;
  metadata?: {
    messageType?: string;
    priority?: 'low' | 'medium' | 'high';
    requiresAcknowledgment?: boolean;
  };
}

export interface BroadcastResult {
  messageId: string;
  deliveryId: string;
  recipients: string[];
  deliveredCount: number;
  pendingCount: number;
  failedRecipients: string[];
  broadcastTime: Date;
}

export interface MessageQueue {
  userId: string;
  conversationId: string;
  messages: QueuedMessage[];
  lastProcessed: Date;
}

export interface QueuedMessage {
  messageId: string;
  content: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
  retryCount: number;
  expiresAt: Date;
}

export interface DeliveryConfirmation {
  messageId: string;
  userId: string;
  deliveryType: 'delivered' | 'read';
  timestamp: Date;
  latency?: number;
}

export interface MessageRoutingOptions {
  requireAcknowledgment: boolean;
  retryAttempts: number;
  timeoutMs: number;
  priority: 'low' | 'medium' | 'high';
  queueOfflineMessages: boolean;
}
