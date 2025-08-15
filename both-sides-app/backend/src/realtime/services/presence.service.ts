import { Injectable, Logger } from '@nestjs/common';
import { AblyConfigService } from '../ably-config.service';
import { ConnectionManagerService } from '../connection-manager.service';
import {
  PresenceState,
  TypingState,
  PresenceUpdate,
  ConnectionQualityMetrics,
  PresenceSubscription,
  ActivityEvent,
} from '../dto/presence-state.dto';
import Ably from 'ably';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly presenceStates = new Map<string, PresenceState>();
  private readonly typingStates = new Map<string, TypingState>();
  private readonly connectionQuality = new Map<string, ConnectionQualityMetrics>();
  private readonly subscriptions = new Map<string, PresenceSubscription>();
  
  // Configuration
  private readonly TYPING_TIMEOUT_MS = 3000; // 3 seconds
  private readonly AWAY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly PRESENCE_SYNC_INTERVAL_MS = 30000; // 30 seconds
  private readonly CONNECTION_QUALITY_WINDOW = 10; // Track last 10 measurements
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute

  constructor(
    private readonly ablyConfigService: AblyConfigService,
    private readonly connectionManagerService: ConnectionManagerService,
  ) {
    this.startPresenceSync();
    this.startPresenceCleanup();
  }

  /**
   * Initialize presence for a user in a conversation
   */
  async initializePresence(
    userId: string, 
    conversationId: string,
    deviceInfo?: { type: 'desktop' | 'mobile' | 'tablet'; browser?: string; platform?: string }
  ): Promise<PresenceState> {
    const presenceKey = this.getPresenceKey(userId, conversationId);
    
    const initialState: PresenceState = {
      userId,
      status: 'online',
      isTyping: false,
      lastSeen: new Date(),
      connectionQuality: 'good',
      deviceInfo: deviceInfo || {
        type: 'desktop',
        browser: 'unknown',
        platform: 'unknown',
      },
      metadata: {
        conversationId,
        lastActivity: new Date(),
      },
    };

    this.presenceStates.set(presenceKey, initialState);

    // Initialize connection quality tracking
    this.connectionQuality.set(userId, {
      userId,
      latency: 0,
      reliability: 1.0,
      packetsLost: 0,
      reconnectionCount: 0,
      lastMeasured: new Date(),
    });

    // Set up activity timeout
    this.setActivityTimeout(userId, conversationId);

    // Broadcast initial presence
    await this.broadcastPresenceUpdate(conversationId, {
      userId,
      conversationId,
      previousState: {},
      newState: initialState,
      timestamp: new Date(),
      updateType: 'status',
    });

    this.logger.debug(`Initialized presence for user ${userId} in conversation ${conversationId}`);
    return initialState;
  }

  /**
   * Update user presence state
   */
  async updatePresence(
    userId: string, 
    conversationId: string, 
    updates: Partial<PresenceState>
  ): Promise<void> {
    const presenceKey = this.getPresenceKey(userId, conversationId);
    const currentState = this.presenceStates.get(presenceKey);
    
    if (!currentState) {
      this.logger.warn(`No presence state found for user ${userId} in conversation ${conversationId}`);
      return;
    }

    const previousState = { ...currentState };
    const newState = { 
      ...currentState, 
      ...updates, 
      lastSeen: new Date(),
      metadata: {
        ...currentState.metadata,
        lastActivity: new Date(),
      }
    };

    this.presenceStates.set(presenceKey, newState);

    // Reset activity timeout
    this.setActivityTimeout(userId, conversationId);

    // Broadcast presence update
    await this.broadcastPresenceUpdate(conversationId, {
      userId,
      conversationId,
      previousState,
      newState,
      timestamp: new Date(),
      updateType: 'status',
    });

    this.logger.debug(`Updated presence for user ${userId}: ${JSON.stringify(updates)}`);
  }

  /**
   * Start typing indicator for user
   */
  async startTyping(userId: string, conversationId: string): Promise<void> {
    const typingKey = this.getPresenceKey(userId, conversationId);
    
    // Clear existing typing timeout
    const existingTyping = this.typingStates.get(typingKey);
    if (existingTyping?.timeout) {
      clearTimeout(existingTyping.timeout);
    }

    // Create new typing state
    const typingState: TypingState = {
      userId,
      conversationId,
      isTyping: true,
      startedAt: new Date(),
    };

    // Set typing timeout
    typingState.timeout = setTimeout(() => {
      this.stopTyping(userId, conversationId);
    }, this.TYPING_TIMEOUT_MS);

    this.typingStates.set(typingKey, typingState);

    // Update presence state
    await this.updatePresence(userId, conversationId, { 
      isTyping: true,
      metadata: {
        ...this.presenceStates.get(this.getPresenceKey(userId, conversationId))?.metadata,
        lastActivity: new Date(),
      }
    });

    // Broadcast typing indicator
    await this.broadcastTypingUpdate(conversationId, userId, true);

    this.logger.debug(`User ${userId} started typing in conversation ${conversationId}`);
  }

  /**
   * Stop typing indicator for user
   */
  async stopTyping(userId: string, conversationId: string): Promise<void> {
    const typingKey = this.getPresenceKey(userId, conversationId);
    const typingState = this.typingStates.get(typingKey);
    
    if (!typingState) {
      return;
    }

    // Clear timeout
    if (typingState.timeout) {
      clearTimeout(typingState.timeout);
    }

    // Remove typing state
    this.typingStates.delete(typingKey);

    // Update presence state
    await this.updatePresence(userId, conversationId, { 
      isTyping: false 
    });

    // Broadcast typing stopped
    await this.broadcastTypingUpdate(conversationId, userId, false);

    this.logger.debug(`User ${userId} stopped typing in conversation ${conversationId}`);
  }

  /**
   * Get all presence states for a conversation
   */
  async getPresenceState(conversationId: string): Promise<PresenceState[]> {
    const conversationStates: PresenceState[] = [];
    
    for (const [key, state] of this.presenceStates.entries()) {
      if (state.metadata?.conversationId === conversationId) {
        conversationStates.push(state);
      }
    }

    // Sort by last activity (most recent first)
    conversationStates.sort((a, b) => {
      const aActivity = a.metadata?.lastActivity || a.lastSeen;
      const bActivity = b.metadata?.lastActivity || b.lastSeen;
      return bActivity.getTime() - aActivity.getTime();
    });

    return conversationStates;
  }

  /**
   * Subscribe to presence updates for a conversation
   */
  subscribeToPresence(
    conversationId: string, 
    callback: (states: PresenceState[]) => void,
    filter?: { includeOffline?: boolean; userIds?: string[] }
  ): void {
    const subscription: PresenceSubscription = {
      conversationId,
      callback,
      filter,
    };

    this.subscriptions.set(conversationId, subscription);
    this.logger.debug(`Subscribed to presence updates for conversation ${conversationId}`);
  }

  /**
   * Unsubscribe from presence updates
   */
  unsubscribeFromPresence(conversationId: string): void {
    this.subscriptions.delete(conversationId);
    this.logger.debug(`Unsubscribed from presence updates for conversation ${conversationId}`);
  }

  /**
   * Update connection quality metrics
   */
  updateConnectionQuality(
    userId: string, 
    metrics: { latency: number; reliability?: number; packetsLost?: number }
  ): void {
    let quality = this.connectionQuality.get(userId);
    
    if (!quality) {
      quality = {
        userId,
        latency: metrics.latency,
        reliability: metrics.reliability || 1.0,
        packetsLost: metrics.packetsLost || 0,
        reconnectionCount: 0,
        lastMeasured: new Date(),
      };
    } else {
      quality.latency = metrics.latency;
      quality.reliability = metrics.reliability || quality.reliability;
      quality.packetsLost = (quality.packetsLost + (metrics.packetsLost || 0)) / 2;
      quality.lastMeasured = new Date();
    }

    this.connectionQuality.set(userId, quality);

    // Determine connection quality level
    let connectionQuality: 'excellent' | 'good' | 'poor' = 'excellent';
    
    if (metrics.latency > 1000 || quality.reliability < 0.8) {
      connectionQuality = 'poor';
    } else if (metrics.latency > 500 || quality.reliability < 0.9) {
      connectionQuality = 'good';
    }

    // Update presence states for this user
    for (const [key, state] of this.presenceStates.entries()) {
      if (state.userId === userId && state.connectionQuality !== connectionQuality) {
        this.updatePresence(state.userId, state.metadata?.conversationId || '', {
          connectionQuality,
        });
      }
    }
  }

  /**
   * Record user activity event
   */
  async recordActivity(activity: ActivityEvent): Promise<void> {
    const { userId, conversationId, activityType } = activity;
    
    // Update last activity timestamp
    await this.updatePresence(userId, conversationId, {
      metadata: {
        ...this.presenceStates.get(this.getPresenceKey(userId, conversationId))?.metadata,
        lastActivity: activity.timestamp,
      }
    });

    // Handle specific activity types
    if (activityType === 'typing') {
      await this.startTyping(userId, conversationId);
    }

    this.logger.debug(`Recorded ${activityType} activity for user ${userId} in conversation ${conversationId}`);
  }

  /**
   * Set user as away due to inactivity
   */
  async setUserAway(userId: string, conversationId: string): Promise<void> {
    const presenceKey = this.getPresenceKey(userId, conversationId);
    const currentState = this.presenceStates.get(presenceKey);
    
    if (currentState && currentState.status === 'online') {
      await this.updatePresence(userId, conversationId, { 
        status: 'away' 
      });
      
      this.logger.debug(`User ${userId} set to away due to inactivity`);
    }
  }

  /**
   * Clean up presence for disconnected user
   */
  async cleanupUserPresence(userId: string, conversationId: string): Promise<void> {
    const presenceKey = this.getPresenceKey(userId, conversationId);
    
    // Update to offline status
    await this.updatePresence(userId, conversationId, { 
      status: 'offline',
      isTyping: false,
    });

    // Stop any active typing
    await this.stopTyping(userId, conversationId);

    // Clean up timers
    const presenceState = this.presenceStates.get(presenceKey);
    if (presenceState?.metadata?.activityTimeout) {
      clearTimeout(presenceState.metadata.activityTimeout);
    }
    if (presenceState?.metadata?.typingTimeout) {
      clearTimeout(presenceState.metadata.typingTimeout);
    }

    this.logger.debug(`Cleaned up presence for user ${userId} in conversation ${conversationId}`);
  }

  // Private helper methods

  private getPresenceKey(userId: string, conversationId: string): string {
    return `${userId}:${conversationId}`;
  }

  private async broadcastPresenceUpdate(
    conversationId: string, 
    update: PresenceUpdate
  ): Promise<void> {
    const channel = this.getPresenceChannel(conversationId);
    if (!channel) {
      this.logger.warn(`No presence channel found for conversation ${conversationId}`);
      return;
    }

    try {
      await channel.publish('presence_update', {
        ...update,
        timestamp: update.timestamp.toISOString(),
      });

      // Notify subscribers
      const subscription = this.subscriptions.get(conversationId);
      if (subscription) {
        const states = await this.getPresenceState(conversationId);
        subscription.callback(states);
      }
    } catch (error) {
      this.logger.error(`Failed to broadcast presence update for conversation ${conversationId}:`, error);
    }
  }

  private async broadcastTypingUpdate(
    conversationId: string, 
    userId: string, 
    isTyping: boolean
  ): Promise<void> {
    const channel = this.getPresenceChannel(conversationId);
    if (!channel) {
      return;
    }

    try {
      await channel.publish('typing_update', {
        userId,
        conversationId,
        isTyping,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast typing update:`, error);
    }
  }

  private getPresenceChannel(conversationId: string): Ably.RealtimeChannel | null {
    const ablyClient = this.ablyConfigService.getClient();
    return ablyClient.channels.get(`presence:${conversationId}`);
  }

  private setActivityTimeout(userId: string, conversationId: string): void {
    const presenceKey = this.getPresenceKey(userId, conversationId);
    const currentState = this.presenceStates.get(presenceKey);
    
    if (!currentState) return;

    // Clear existing timeout
    if (currentState.metadata?.activityTimeout) {
      clearTimeout(currentState.metadata.activityTimeout);
    }

    // Set new timeout for away status
    const activityTimeout = setTimeout(() => {
      this.setUserAway(userId, conversationId);
    }, this.AWAY_TIMEOUT_MS);

    // Update metadata
    if (currentState.metadata) {
      currentState.metadata.activityTimeout = activityTimeout;
    }
  }

  private startPresenceSync(): void {
    setInterval(async () => {
      // Sync presence states with Ably presence system
      for (const [conversationId] of this.subscriptions) {
        try {
          const channel = this.getPresenceChannel(conversationId);
          if (channel) {
            const presenceMessages = await channel.presence.get();
            // Process presence messages and sync with local state
            this.syncWithAblyPresence(conversationId, presenceMessages);
          }
        } catch (error) {
          this.logger.warn(`Failed to sync presence for conversation ${conversationId}:`, error);
        }
      }
    }, this.PRESENCE_SYNC_INTERVAL_MS);
  }

  private async syncWithAblyPresence(
    conversationId: string, 
    presenceMessages: Ably.PresenceMessage[]
  ): Promise<void> {
    // Implementation for syncing local presence state with Ably's presence system
    this.logger.debug(`Synced presence for conversation ${conversationId} with ${presenceMessages.length} remote states`);
  }

  private startPresenceCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expireTime = 60 * 60 * 1000; // 1 hour

      // Clean up old presence states
      for (const [key, state] of this.presenceStates.entries()) {
        if (now.getTime() - state.lastSeen.getTime() > expireTime && state.status === 'offline') {
          this.presenceStates.delete(key);
          this.logger.debug(`Cleaned up expired presence state: ${key}`);
        }
      }

      // Clean up old typing states
      for (const [key, typingState] of this.typingStates.entries()) {
        if (now.getTime() - typingState.startedAt.getTime() > this.TYPING_TIMEOUT_MS * 2) {
          if (typingState.timeout) {
            clearTimeout(typingState.timeout);
          }
          this.typingStates.delete(key);
          this.logger.debug(`Cleaned up expired typing state: ${key}`);
        }
      }

      // Clean up connection quality data
      for (const [userId, metrics] of this.connectionQuality.entries()) {
        if (now.getTime() - metrics.lastMeasured.getTime() > expireTime) {
          this.connectionQuality.delete(userId);
          this.logger.debug(`Cleaned up expired connection quality data for user: ${userId}`);
        }
      }
    }, this.CLEANUP_INTERVAL_MS);
  }
}
