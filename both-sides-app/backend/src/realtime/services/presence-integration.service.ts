import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConnectionManagerService } from '../connection-manager.service';
import { PresenceService } from './presence.service';
import { TypingIndicatorService } from './typing-indicator.service';
import { ConnectionQualityService } from './connection-quality.service';
import { PresenceState, ActivityEvent } from '../dto/presence-state.dto';

export interface PresenceIntegrationConfig {
  autoInitializePresence: boolean;
  monitorConnectionQuality: boolean;
  syncTypingWithPresence: boolean;
  cleanupOnDisconnect: boolean;
}

@Injectable()
export class PresenceIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(PresenceIntegrationService.name);
  private readonly activeUsers = new Map<string, { conversationId: string; lastActivity: Date }>();
  
  private readonly config: PresenceIntegrationConfig = {
    autoInitializePresence: true,
    monitorConnectionQuality: true,
    syncTypingWithPresence: true,
    cleanupOnDisconnect: true,
  };

  constructor(
    private readonly connectionManagerService: ConnectionManagerService,
    private readonly presenceService: PresenceService,
    private readonly typingIndicatorService: TypingIndicatorService,
    private readonly connectionQualityService: ConnectionQualityService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing presence integration...');
    this.setupEventHandlers();
  }

  /**
   * Handle user joining a conversation
   */
  async handleUserJoinedConversation(
    userId: string, 
    conversationId: string,
    deviceInfo?: { type: 'desktop' | 'mobile' | 'tablet'; browser?: string; platform?: string }
  ): Promise<void> {
    try {
      // Initialize presence
      if (this.config.autoInitializePresence) {
        await this.presenceService.initializePresence(userId, conversationId, deviceInfo);
      }

      // Track active user
      this.activeUsers.set(userId, {
        conversationId,
        lastActivity: new Date(),
      });

      // Set up typing indicator subscription
      if (this.config.syncTypingWithPresence) {
        this.typingIndicatorService.subscribeToTypingUpdates(conversationId, (typingUsers) => {
          this.logger.debug(`Typing update for conversation ${conversationId}: ${typingUsers.length} users typing`);
        });
      }

      // Start connection quality monitoring
      if (this.config.monitorConnectionQuality) {
        this.connectionQualityService.subscribeToQualityChanges(userId, (quality) => {
          this.logger.debug(`Connection quality changed for user ${userId}: ${quality}`);
        });
      }

      this.logger.debug(`User ${userId} joined conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to handle user joined conversation:`, error);
    }
  }

  /**
   * Handle user leaving a conversation
   */
  async handleUserLeftConversation(userId: string, conversationId: string): Promise<void> {
    try {
      // Stop typing indicator
      await this.typingIndicatorService.forceStopTyping(userId, conversationId);

      // Cleanup presence
      if (this.config.cleanupOnDisconnect) {
        await this.presenceService.cleanupUserPresence(userId, conversationId);
      }

      // Remove from active users
      this.activeUsers.delete(userId);

      // Unsubscribe from services
      this.typingIndicatorService.unsubscribeFromTypingUpdates(conversationId);
      this.connectionQualityService.unsubscribeFromQualityChanges(userId);

      this.logger.debug(`User ${userId} left conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to handle user left conversation:`, error);
    }
  }

  /**
   * Handle user activity (typing, mouse movement, etc.)
   */
  async handleUserActivity(activity: ActivityEvent): Promise<void> {
    const { userId, conversationId, activityType } = activity;

    try {
      // Update last activity
      const activeUser = this.activeUsers.get(userId);
      if (activeUser) {
        activeUser.lastActivity = activity.timestamp;
      }

      // Record activity with presence service
      await this.presenceService.recordActivity(activity);

      // Handle typing specifically
      if (activityType === 'typing') {
        await this.typingIndicatorService.handleTypingEvent(
          userId, 
          conversationId, 
          activity.metadata
        );
      }

      this.logger.debug(`Recorded ${activityType} activity for user ${userId} in conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to handle user activity:`, error);
    }
  }

  /**
   * Handle connection quality measurement
   */
  async handleConnectionQualityUpdate(
    userId: string, 
    metrics: { latency: number; reliability?: number; packetsLost?: number }
  ): Promise<void> {
    try {
      // Record with connection quality service
      this.connectionQualityService.recordMeasurement({
        userId,
        timestamp: new Date(),
        latency: metrics.latency,
        reliability: metrics.reliability || 1.0,
        packetsLost: metrics.packetsLost || 0,
      });

      this.logger.debug(`Updated connection quality for user ${userId}: latency ${metrics.latency}ms`);
    } catch (error) {
      this.logger.error(`Failed to handle connection quality update:`, error);
    }
  }

  /**
   * Get comprehensive presence status for a conversation
   */
  async getConversationPresenceStatus(conversationId: string): Promise<{
    presenceStates: PresenceState[];
    typingUsers: string[];
    connectionQualities: Record<string, string>;
    totalUsers: number;
    onlineUsers: number;
  }> {
    try {
      // Get presence states
      const presenceStates = await this.presenceService.getPresenceState(conversationId);
      
      // Get typing users
      const typingUsers = this.typingIndicatorService.getTypingUsers(conversationId);
      
      // Get connection qualities
      const connectionQualities: Record<string, string> = {};
      for (const state of presenceStates) {
        connectionQualities[state.userId] = state.connectionQuality;
      }
      
      // Calculate statistics
      const totalUsers = presenceStates.length;
      const onlineUsers = presenceStates.filter(state => state.status === 'online').length;

      return {
        presenceStates,
        typingUsers,
        connectionQualities,
        totalUsers,
        onlineUsers,
      };
    } catch (error) {
      this.logger.error(`Failed to get conversation presence status:`, error);
      return {
        presenceStates: [],
        typingUsers: [],
        connectionQualities: {},
        totalUsers: 0,
        onlineUsers: 0,
      };
    }
  }

  /**
   * Force sync all presence states (useful for recovery)
   */
  async forceSyncPresenceStates(conversationId: string): Promise<void> {
    try {
      // Get all active connections for the conversation
      // This would normally query the connection manager for active connections
      const activeUsers = Array.from(this.activeUsers.keys());
      
      this.logger.log(`Force syncing presence states for ${activeUsers.length} users in conversation ${conversationId}`);
      
      for (const userId of activeUsers) {
        const userInfo = this.activeUsers.get(userId);
        if (userInfo && userInfo.conversationId === conversationId) {
          try {
            // Re-initialize presence
            await this.presenceService.initializePresence(userId, conversationId);
            
            // Perform quality test
            await this.connectionQualityService.performQualityTest(userId);
            
            this.logger.debug(`Synced presence for user ${userId}`);
          } catch (error) {
            this.logger.warn(`Failed to sync presence for user ${userId}:`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to force sync presence states:`, error);
    }
  }

  /**
   * Get system-wide presence statistics
   */
  getPresenceStatistics(): {
    activeUsers: number;
    totalConnections: number;
    typingUsers: number;
    averageConnectionQuality: string;
  } {
    const activeUsers = this.activeUsers.size;
    const typingStats = this.typingIndicatorService.getTypingStatistics();
    const qualityMetrics = this.connectionQualityService.getAllQualityMetrics();
    
    // Calculate average connection quality
    let qualitySum = 0;
    let qualityCount = 0;
    
    for (const metrics of qualityMetrics.values()) {
      if (metrics.reliability > 0.95) qualitySum += 3; // excellent
      else if (metrics.reliability > 0.85) qualitySum += 2; // good
      else qualitySum += 1; // poor
      qualityCount++;
    }
    
    const averageQuality = qualityCount > 0 ? qualitySum / qualityCount : 0;
    let averageConnectionQuality = 'unknown';
    if (averageQuality >= 2.5) averageConnectionQuality = 'excellent';
    else if (averageQuality >= 1.5) averageConnectionQuality = 'good';
    else if (averageQuality > 0) averageConnectionQuality = 'poor';

    return {
      activeUsers,
      totalConnections: qualityMetrics.size,
      typingUsers: typingStats.activeTypingUsers,
      averageConnectionQuality,
    };
  }

  /**
   * Clean up inactive users
   */
  async cleanupInactiveUsers(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 60 * 60 * 1000; // 1 hour
    const inactiveUsers: string[] = [];
    
    for (const [userId, userInfo] of this.activeUsers.entries()) {
      if (now.getTime() - userInfo.lastActivity.getTime() > inactiveThreshold) {
        inactiveUsers.push(userId);
      }
    }
    
    for (const userId of inactiveUsers) {
      const userInfo = this.activeUsers.get(userId);
      if (userInfo) {
        await this.handleUserLeftConversation(userId, userInfo.conversationId);
      }
    }
    
    if (inactiveUsers.length > 0) {
      this.logger.log(`Cleaned up ${inactiveUsers.length} inactive users`);
    }
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    this.logger.debug('Presence integration event handlers set up');
  }
}
