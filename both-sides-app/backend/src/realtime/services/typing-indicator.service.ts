import { Injectable, Logger } from '@nestjs/common';
import { AblyConfigService } from '../ably-config.service';
import { PresenceService } from './presence.service';
import { TypingState } from '../dto/presence-state.dto';
import Ably from 'ably';

export interface TypingIndicatorEvent {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: Date;
  metadata?: {
    inputLength?: number;
    lastKeystroke?: Date;
    device?: string;
  };
}

export interface ConversationTypingState {
  conversationId: string;
  typingUsers: string[];
  lastUpdate: Date;
}

@Injectable()
export class TypingIndicatorService {
  private readonly logger = new Logger(TypingIndicatorService.name);
  private readonly typingStates = new Map<string, TypingState>();
  private readonly conversationStates = new Map<string, ConversationTypingState>();
  private readonly typingCallbacks = new Map<string, (typingUsers: string[]) => void>();
  
  // Configuration
  private readonly TYPING_TIMEOUT_MS = 3000; // 3 seconds
  private readonly TYPING_DEBOUNCE_MS = 300; // 300ms debounce for rapid keystrokes
  private readonly MAX_TYPING_USERS_DISPLAY = 3; // Limit displayed typing users
  private readonly CLEANUP_INTERVAL_MS = 30000; // 30 seconds

  constructor(
    private readonly ablyConfigService: AblyConfigService,
    private readonly presenceService: PresenceService,
  ) {
    this.startTypingCleanup();
  }

  /**
   * Start typing indicator for a user
   */
  async startTyping(
    userId: string, 
    conversationId: string,
    metadata?: { inputLength?: number; device?: string }
  ): Promise<void> {
    const typingKey = this.getTypingKey(userId, conversationId);
    
    // Get or create typing state
    let typingState = this.typingStates.get(typingKey);
    
    if (typingState) {
      // Clear existing timeout
      if (typingState.timeout) {
        clearTimeout(typingState.timeout);
      }
    } else {
      // Create new typing state
      typingState = {
        userId,
        conversationId,
        isTyping: true,
        startedAt: new Date(),
      };
      this.typingStates.set(typingKey, typingState);
      
      // Update conversation typing state
      await this.updateConversationTypingState(conversationId);
      
      // Broadcast typing started
      await this.broadcastTypingUpdate(conversationId, {
        userId,
        conversationId,
        isTyping: true,
        timestamp: new Date(),
        metadata,
      });
      
      this.logger.debug(`User ${userId} started typing in conversation ${conversationId}`);
    }

    // Set new timeout to automatically stop typing
    typingState.timeout = setTimeout(() => {
      this.stopTyping(userId, conversationId);
    }, this.TYPING_TIMEOUT_MS);

    // Update presence service
    await this.presenceService.startTyping(userId, conversationId);
  }

  /**
   * Stop typing indicator for a user
   */
  async stopTyping(userId: string, conversationId: string): Promise<void> {
    const typingKey = this.getTypingKey(userId, conversationId);
    const typingState = this.typingStates.get(typingKey);
    
    if (!typingState) {
      this.logger.debug(`No typing state found for user ${userId} in conversation ${conversationId}`);
      return;
    }

    // Clear timeout
    if (typingState.timeout) {
      clearTimeout(typingState.timeout);
    }

    // Remove typing state
    this.typingStates.delete(typingKey);

    // Update conversation typing state
    await this.updateConversationTypingState(conversationId);

    // Broadcast typing stopped
    await this.broadcastTypingUpdate(conversationId, {
      userId,
      conversationId,
      isTyping: false,
      timestamp: new Date(),
    });

    // Update presence service
    await this.presenceService.stopTyping(userId, conversationId);

    this.logger.debug(`User ${userId} stopped typing in conversation ${conversationId}`);
  }

  /**
   * Handle typing event with debouncing
   */
  async handleTypingEvent(
    userId: string, 
    conversationId: string,
    metadata?: { inputLength?: number; device?: string }
  ): Promise<void> {
    const typingKey = this.getTypingKey(userId, conversationId);
    const existingState = this.typingStates.get(typingKey);
    
    const now = new Date();
    
    // If not currently typing or debounce period passed, start typing
    if (!existingState || (now.getTime() - existingState.startedAt.getTime() > this.TYPING_DEBOUNCE_MS)) {
      await this.startTyping(userId, conversationId, metadata);
    } else if (existingState.timeout) {
      // Reset timeout for existing typing session
      clearTimeout(existingState.timeout);
      existingState.timeout = setTimeout(() => {
        this.stopTyping(userId, conversationId);
      }, this.TYPING_TIMEOUT_MS);
    }
  }

  /**
   * Get typing users for a conversation
   */
  getTypingUsers(conversationId: string): string[] {
    const conversationState = this.conversationStates.get(conversationId);
    return conversationState?.typingUsers || [];
  }

  /**
   * Get typing state summary for a conversation
   */
  getConversationTypingState(conversationId: string): ConversationTypingState | null {
    return this.conversationStates.get(conversationId) || null;
  }

  /**
   * Subscribe to typing updates for a conversation
   */
  subscribeToTypingUpdates(
    conversationId: string, 
    callback: (typingUsers: string[]) => void
  ): void {
    this.typingCallbacks.set(conversationId, callback);
    
    // Immediately call with current state
    const typingUsers = this.getTypingUsers(conversationId);
    callback(typingUsers);
    
    this.logger.debug(`Subscribed to typing updates for conversation ${conversationId}`);
  }

  /**
   * Unsubscribe from typing updates
   */
  unsubscribeFromTypingUpdates(conversationId: string): void {
    this.typingCallbacks.delete(conversationId);
    this.logger.debug(`Unsubscribed from typing updates for conversation ${conversationId}`);
  }

  /**
   * Force stop typing for user (e.g., when they disconnect)
   */
  async forceStopTyping(userId: string, conversationId?: string): Promise<void> {
    if (conversationId) {
      // Stop typing for specific conversation
      await this.stopTyping(userId, conversationId);
    } else {
      // Stop typing for all conversations for this user
      const userTypingStates = Array.from(this.typingStates.entries())
        .filter(([key, state]) => state.userId === userId);
      
      for (const [key, state] of userTypingStates) {
        await this.stopTyping(state.userId, state.conversationId);
      }
    }
  }

  /**
   * Get typing statistics for monitoring
   */
  getTypingStatistics(): {
    activeTypingUsers: number;
    conversationsWithTyping: number;
    totalTypingStates: number;
  } {
    const activeTypingUsers = new Set();
    const conversationsWithTyping = new Set();
    
    for (const state of this.typingStates.values()) {
      activeTypingUsers.add(state.userId);
      conversationsWithTyping.add(state.conversationId);
    }
    
    return {
      activeTypingUsers: activeTypingUsers.size,
      conversationsWithTyping: conversationsWithTyping.size,
      totalTypingStates: this.typingStates.size,
    };
  }

  // Private helper methods

  private getTypingKey(userId: string, conversationId: string): string {
    return `${userId}:${conversationId}`;
  }

  private async updateConversationTypingState(conversationId: string): Promise<void> {
    const typingUsers: string[] = [];
    
    // Find all users typing in this conversation
    for (const [key, state] of this.typingStates.entries()) {
      if (state.conversationId === conversationId && state.isTyping) {
        typingUsers.push(state.userId);
      }
    }

    // Limit displayed typing users
    const displayUsers = typingUsers.slice(0, this.MAX_TYPING_USERS_DISPLAY);

    const conversationState: ConversationTypingState = {
      conversationId,
      typingUsers: displayUsers,
      lastUpdate: new Date(),
    };

    this.conversationStates.set(conversationId, conversationState);

    // Notify callbacks
    const callback = this.typingCallbacks.get(conversationId);
    if (callback) {
      callback(displayUsers);
    }
  }

  private async broadcastTypingUpdate(
    conversationId: string, 
    event: TypingIndicatorEvent
  ): Promise<void> {
    const channel = this.getTypingChannel(conversationId);
    if (!channel) {
      this.logger.warn(`No typing channel found for conversation ${conversationId}`);
      return;
    }

    try {
      await channel.publish('typing_indicator', {
        ...event,
        timestamp: event.timestamp.toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast typing update for conversation ${conversationId}:`, error);
    }
  }

  private getTypingChannel(conversationId: string): Ably.RealtimeChannel | null {
    const ablyClient = this.ablyConfigService.getClient();
    return ablyClient.channels.get(`typing:${conversationId}`);
  }

  /**
   * Clean up expired typing states and conversation states
   */
  private startTypingCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expiredStates: string[] = [];
      
      // Find expired typing states
      for (const [key, state] of this.typingStates.entries()) {
        if (now.getTime() - state.startedAt.getTime() > this.TYPING_TIMEOUT_MS * 2) {
          expiredStates.push(key);
          
          // Clear timeout if exists
          if (state.timeout) {
            clearTimeout(state.timeout);
          }
        }
      }

      // Remove expired states
      for (const key of expiredStates) {
        const state = this.typingStates.get(key);
        if (state) {
          this.typingStates.delete(key);
          this.logger.debug(`Cleaned up expired typing state: ${key}`);
          
          // Update conversation state
          this.updateConversationTypingState(state.conversationId);
        }
      }

      // Clean up empty conversation states
      for (const [conversationId, conversationState] of this.conversationStates.entries()) {
        if (conversationState.typingUsers.length === 0 && 
            now.getTime() - conversationState.lastUpdate.getTime() > this.CLEANUP_INTERVAL_MS) {
          this.conversationStates.delete(conversationId);
          this.logger.debug(`Cleaned up empty conversation typing state: ${conversationId}`);
        }
      }
    }, this.CLEANUP_INTERVAL_MS);
  }
}
