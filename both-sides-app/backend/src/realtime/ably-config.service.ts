import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Ably from 'ably';

interface AblyCapabilities {
  [key: string]: string[];
}

interface ConversationChannelCapabilities {
  conversation: string[];
  presence: string[];
  moderation: string[];
  coaching: string[];
}

@Injectable()
export class AblyConfigService {
  private readonly logger = new Logger(AblyConfigService.name);
  private readonly ablyClient: Ably.Realtime;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ABLY_API_KEY');
    
    if (!apiKey) {
      throw new Error('ABLY_API_KEY is required but not found in environment variables');
    }

    this.ablyClient = new Ably.Realtime({
      key: apiKey,
      clientId: 'both-sides-backend',
      log: {
        level: process.env.NODE_ENV === 'development' ? 2 : 1, // Debug in dev, info in prod
      },
    });

    this.logger.log('Ably client initialized');
  }

  /**
   * Initialize Ably client for a specific user with conversation capabilities
   */
  initializeClient(userId: string, capabilities: string[]): Ably.Realtime {
    const clientOptions: Ably.ClientOptions = {
      key: this.configService.get<string>('ABLY_API_KEY'),
      clientId: userId,
      log: {
        level: process.env.NODE_ENV === 'development' ? 2 : 1,
      },
    };

    return new Ably.Realtime(clientOptions);
  }

  /**
   * Generate token request for client-side Ably connection
   * Includes proper capabilities for conversation access
   */
  async generateTokenRequest(
    userId: string, 
    conversationId: string
  ): Promise<Ably.TokenRequest> {
    const tokenParams: Ably.TokenParams = {
      clientId: userId,
      ttl: 60 * 60 * 1000, // 1 hour TTL
      capability: this.getConversationCapabilities(conversationId),
    };

    return this.ablyClient.auth.createTokenRequest(tokenParams);
  }

  /**
   * Create and configure conversation channel with proper naming
   */
  createConversationChannel(conversationId: string): Ably.RealtimeChannel {
    const channelName = this.getChannelName('conversation', conversationId);
    const channel = this.ablyClient.channels.get(channelName);
    
    this.logger.debug(`Created conversation channel: ${channelName}`);
    return channel;
  }

  /**
   * Create presence channel for conversation participants
   */
  createPresenceChannel(conversationId: string): Ably.RealtimeChannel {
    const channelName = this.getChannelName('presence', conversationId);
    const channel = this.ablyClient.channels.get(channelName);
    
    this.logger.debug(`Created presence channel: ${channelName}`);
    return channel;
  }

  /**
   * Create moderation channel for AI moderation events
   */
  createModerationChannel(conversationId: string): Ably.RealtimeChannel {
    const channelName = this.getChannelName('moderation', conversationId);
    const channel = this.ablyClient.channels.get(channelName);
    
    this.logger.debug(`Created moderation channel: ${channelName}`);
    return channel;
  }

  /**
   * Create coaching channel for individual user coaching
   */
  createCoachingChannel(userId: string, conversationId: string): Ably.RealtimeChannel {
    const channelName = `coaching:${userId}:${conversationId}`;
    const channel = this.ablyClient.channels.get(channelName);
    
    this.logger.debug(`Created coaching channel: ${channelName}`);
    return channel;
  }

  /**
   * Set up channel presence for a user in a conversation
   */
  async setupChannelPresence(
    channel: Ably.RealtimeChannel, 
    userId: string,
    userMetadata?: any
  ): Promise<void> {
    try {
      await channel.presence.enter({
        userId,
        joinedAt: new Date().toISOString(),
        ...userMetadata,
      });
      
      this.logger.debug(`User ${userId} entered presence on channel ${channel.name}`);
    } catch (error) {
      this.logger.error(`Failed to setup presence for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get the main Ably client for server-side operations
   */
  getClient(): Ably.Realtime {
    return this.ablyClient;
  }

  /**
   * Channel naming strategy implementation
   */
  private getChannelName(type: 'conversation' | 'presence' | 'moderation', conversationId: string): string {
    return `${type}:${conversationId}`;
  }

  /**
   * Generate capabilities for conversation access
   */
  private getConversationCapabilities(conversationId: string): AblyCapabilities {
    return {
      [`conversation:${conversationId}`]: ['publish', 'subscribe', 'presence'],
      [`presence:${conversationId}`]: ['publish', 'subscribe', 'presence'],
      [`moderation:${conversationId}`]: ['subscribe'], // Users can only subscribe to moderation
      // Coaching channels are user-specific and added dynamically
    };
  }

  /**
   * Add coaching capabilities for a specific user
   */
  getCoachingCapabilities(userId: string, conversationId: string): AblyCapabilities {
    return {
      [`coaching:${userId}:${conversationId}`]: ['publish', 'subscribe'],
    };
  }

  /**
   * Validate channel access for a user
   */
  canUserAccessChannel(userId: string, channelName: string, conversationId: string): boolean {
    const validChannelPrefixes = [
      `conversation:${conversationId}`,
      `presence:${conversationId}`,
      `moderation:${conversationId}`,
      `coaching:${userId}:${conversationId}`,
    ];

    return validChannelPrefixes.some(prefix => channelName.startsWith(prefix));
  }

  /**
   * Clean up resources and close connection
   */
  async cleanup(): Promise<void> {
    try {
      await this.ablyClient.close();
      this.logger.log('Ably client connection closed');
    } catch (error) {
      this.logger.error('Error closing Ably connection:', error);
    }
  }
}
