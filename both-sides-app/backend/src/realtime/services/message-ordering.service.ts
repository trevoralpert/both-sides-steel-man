import { Injectable, Logger } from '@nestjs/common';

export interface OrderedMessage {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  contentType: 'text' | 'system' | 'moderation' | 'coaching';
  timestamp: Date;
  sequence: number;
  metadata?: any;
}

export interface MessageBuffer {
  conversationId: string;
  messages: Map<number, OrderedMessage>;
  lastProcessedSequence: number;
  nextExpectedSequence: number;
  bufferTimeout: NodeJS.Timeout | null;
  maxBufferTime: number;
}

export interface MessageSequence {
  conversationId: string;
  currentSequence: number;
  lastUpdated: Date;
}

@Injectable()
export class MessageOrderingService {
  private readonly logger = new Logger(MessageOrderingService.name);
  private readonly messageBuffers = new Map<string, MessageBuffer>();
  private readonly conversationSequences = new Map<string, MessageSequence>();
  private readonly deliveredCallbacks = new Map<string, (message: OrderedMessage) => void>();
  
  // Configuration
  private readonly MAX_BUFFER_TIME_MS = 5000; // 5 seconds max buffer time
  private readonly MAX_BUFFER_SIZE = 50; // Maximum messages to buffer per conversation
  private readonly SEQUENCE_CLEANUP_INTERVAL_MS = 300000; // 5 minutes

  constructor() {
    this.startSequenceCleanup();
  }

  /**
   * Initialize message ordering for a conversation
   */
  initializeConversation(conversationId: string): void {
    if (!this.conversationSequences.has(conversationId)) {
      this.conversationSequences.set(conversationId, {
        conversationId,
        currentSequence: 0,
        lastUpdated: new Date(),
      });

      this.logger.debug(`Initialized message ordering for conversation ${conversationId}`);
    }
  }

  /**
   * Generate next sequence number for a message
   */
  getNextSequenceNumber(conversationId: string): number {
    let sequence = this.conversationSequences.get(conversationId);
    
    if (!sequence) {
      this.initializeConversation(conversationId);
      sequence = this.conversationSequences.get(conversationId)!;
    }

    sequence.currentSequence++;
    sequence.lastUpdated = new Date();

    this.logger.debug(`Generated sequence ${sequence.currentSequence} for conversation ${conversationId}`);
    return sequence.currentSequence;
  }

  /**
   * Add message to ordering buffer and process if ready
   */
  async addMessage(message: OrderedMessage): Promise<void> {
    const { conversationId, sequence } = message;
    
    this.logger.debug(`Adding message ${message.id} with sequence ${sequence} to buffer`);

    // Get or create buffer for conversation
    let buffer = this.messageBuffers.get(conversationId);
    if (!buffer) {
      buffer = {
        conversationId,
        messages: new Map(),
        lastProcessedSequence: 0,
        nextExpectedSequence: 1,
        bufferTimeout: null,
        maxBufferTime: this.MAX_BUFFER_TIME_MS,
      };
      this.messageBuffers.set(conversationId, buffer);
    }

    // Check for duplicate messages
    if (buffer.messages.has(sequence)) {
      this.logger.warn(`Duplicate message sequence ${sequence} detected for conversation ${conversationId}`);
      return;
    }

    // Add message to buffer
    buffer.messages.set(sequence, message);

    // Check buffer size limit
    if (buffer.messages.size > this.MAX_BUFFER_SIZE) {
      this.logger.warn(`Buffer size limit exceeded for conversation ${conversationId}, forcing delivery of oldest messages`);
      await this.forceDeliverOldest(conversationId, 10); // Deliver 10 oldest messages
    }

    // Try to deliver messages in order
    await this.tryDeliverMessages(conversationId);

    // Set timeout to prevent messages from being buffered too long
    this.setBufferTimeout(conversationId);
  }

  /**
   * Register callback for when ordered messages are ready for delivery
   */
  registerDeliveryCallback(conversationId: string, callback: (message: OrderedMessage) => void): void {
    this.deliveredCallbacks.set(conversationId, callback);
    this.logger.debug(`Registered delivery callback for conversation ${conversationId}`);
  }

  /**
   * Unregister delivery callback
   */
  unregisterDeliveryCallback(conversationId: string): void {
    this.deliveredCallbacks.delete(conversationId);
    this.logger.debug(`Unregistered delivery callback for conversation ${conversationId}`);
  }

  /**
   * Get current buffer status for monitoring
   */
  getBufferStatus(conversationId: string): {
    bufferedMessages: number;
    nextExpectedSequence: number;
    lastProcessedSequence: number;
    oldestBufferedSequence: number | null;
    newestBufferedSequence: number | null;
  } {
    const buffer = this.messageBuffers.get(conversationId);
    
    if (!buffer) {
      return {
        bufferedMessages: 0,
        nextExpectedSequence: 1,
        lastProcessedSequence: 0,
        oldestBufferedSequence: null,
        newestBufferedSequence: null,
      };
    }

    const sequences = Array.from(buffer.messages.keys()).sort((a, b) => a - b);
    
    return {
      bufferedMessages: buffer.messages.size,
      nextExpectedSequence: buffer.nextExpectedSequence,
      lastProcessedSequence: buffer.lastProcessedSequence,
      oldestBufferedSequence: sequences.length > 0 ? sequences[0] : null,
      newestBufferedSequence: sequences.length > 0 ? sequences[sequences.length - 1] : null,
    };
  }

  /**
   * Force delivery of all buffered messages (useful for cleanup or emergency delivery)
   */
  async forceDeliverAll(conversationId: string): Promise<number> {
    const buffer = this.messageBuffers.get(conversationId);
    if (!buffer || buffer.messages.size === 0) {
      return 0;
    }

    const sequences = Array.from(buffer.messages.keys()).sort((a, b) => a - b);
    let deliveredCount = 0;

    for (const sequence of sequences) {
      const message = buffer.messages.get(sequence);
      if (message) {
        await this.deliverMessage(message);
        buffer.messages.delete(sequence);
        buffer.lastProcessedSequence = Math.max(buffer.lastProcessedSequence, sequence);
        deliveredCount++;
      }
    }

    // Update next expected sequence
    if (sequences.length > 0) {
      buffer.nextExpectedSequence = Math.max(buffer.nextExpectedSequence, sequences[sequences.length - 1] + 1);
    }

    this.logger.warn(`Force delivered ${deliveredCount} messages for conversation ${conversationId}`);
    return deliveredCount;
  }

  /**
   * Clean up conversation data (call when conversation ends)
   */
  cleanupConversation(conversationId: string): void {
    const buffer = this.messageBuffers.get(conversationId);
    if (buffer) {
      if (buffer.bufferTimeout) {
        clearTimeout(buffer.bufferTimeout);
      }
      this.messageBuffers.delete(conversationId);
    }

    this.conversationSequences.delete(conversationId);
    this.deliveredCallbacks.delete(conversationId);
    
    this.logger.debug(`Cleaned up message ordering data for conversation ${conversationId}`);
  }

  /**
   * Try to deliver messages in sequence order
   */
  private async tryDeliverMessages(conversationId: string): Promise<void> {
    const buffer = this.messageBuffers.get(conversationId);
    if (!buffer) return;

    let delivered = 0;
    
    // Deliver messages in sequence starting from next expected
    while (buffer.messages.has(buffer.nextExpectedSequence)) {
      const message = buffer.messages.get(buffer.nextExpectedSequence);
      if (!message) break;

      await this.deliverMessage(message);
      buffer.messages.delete(buffer.nextExpectedSequence);
      buffer.lastProcessedSequence = buffer.nextExpectedSequence;
      buffer.nextExpectedSequence++;
      delivered++;

      this.logger.debug(`Delivered message ${message.id} with sequence ${message.sequence}`);
    }

    if (delivered > 0) {
      this.logger.debug(`Delivered ${delivered} messages in order for conversation ${conversationId}`);
    }
  }

  /**
   * Deliver oldest messages when buffer is full
   */
  private async forceDeliverOldest(conversationId: string, count: number): Promise<void> {
    const buffer = this.messageBuffers.get(conversationId);
    if (!buffer) return;

    const sequences = Array.from(buffer.messages.keys()).sort((a, b) => a - b);
    const toDeliver = sequences.slice(0, count);

    for (const sequence of toDeliver) {
      const message = buffer.messages.get(sequence);
      if (message) {
        await this.deliverMessage(message);
        buffer.messages.delete(sequence);
        buffer.lastProcessedSequence = Math.max(buffer.lastProcessedSequence, sequence);
        
        // Update next expected if we delivered the expected message
        if (sequence === buffer.nextExpectedSequence) {
          buffer.nextExpectedSequence = sequence + 1;
        }
      }
    }
  }

  /**
   * Deliver message to registered callback
   */
  private async deliverMessage(message: OrderedMessage): Promise<void> {
    const callback = this.deliveredCallbacks.get(message.conversationId);
    if (callback) {
      try {
        callback(message);
      } catch (error) {
        this.logger.error(`Error in delivery callback for message ${message.id}:`, error);
      }
    } else {
      this.logger.warn(`No delivery callback registered for conversation ${message.conversationId}`);
    }
  }

  /**
   * Set timeout to prevent messages from being buffered too long
   */
  private setBufferTimeout(conversationId: string): void {
    const buffer = this.messageBuffers.get(conversationId);
    if (!buffer) return;

    // Clear existing timeout
    if (buffer.bufferTimeout) {
      clearTimeout(buffer.bufferTimeout);
    }

    // Set new timeout
    buffer.bufferTimeout = setTimeout(async () => {
      if (buffer.messages.size > 0) {
        this.logger.warn(`Buffer timeout reached for conversation ${conversationId}, force delivering ${buffer.messages.size} messages`);
        await this.forceDeliverAll(conversationId);
      }
    }, buffer.maxBufferTime);
  }

  /**
   * Clean up old sequence data
   */
  private startSequenceCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expireTime = 60 * 60 * 1000; // 1 hour

      for (const [conversationId, sequence] of this.conversationSequences.entries()) {
        if (now.getTime() - sequence.lastUpdated.getTime() > expireTime) {
          this.cleanupConversation(conversationId);
          this.logger.debug(`Cleaned up expired sequence data for conversation ${conversationId}`);
        }
      }
    }, this.SEQUENCE_CLEANUP_INTERVAL_MS);
  }
}
