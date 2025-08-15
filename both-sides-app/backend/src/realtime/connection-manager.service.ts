import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AblyConfigService } from './ably-config.service';
import Ably from 'ably';

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  lastConnected: Date | null;
  reconnectAttempts: number;
  latency: number;
  conversationId: string;
  userId: string;
  connectionId?: string;
  clientId?: string;
}

interface ConnectionInfo {
  client: Ably.Realtime;
  channels: Map<string, Ably.RealtimeChannel>;
  state: ConnectionState;
  reconnectTimer?: NodeJS.Timeout;
  monitoringInterval?: NodeJS.Timeout;
}

@Injectable()
export class ConnectionManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(ConnectionManagerService.name);
  private connections = new Map<string, ConnectionInfo>();
  
  // Connection configuration
  private readonly RECONNECT_INTERVALS = [1000, 2000, 4000, 8000, 16000, 30000]; // Progressive backoff
  private readonly MAX_RECONNECT_ATTEMPTS = 6;
  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly MAX_LATENCY_THRESHOLD = 5000; // 5 seconds

  constructor(private readonly ablyConfigService: AblyConfigService) {}

  /**
   * Establish connection to Ably for a conversation
   */
  async connect(conversationId: string, userId: string): Promise<ConnectionState> {
    const connectionKey = this.getConnectionKey(conversationId, userId);
    
    this.logger.debug(`Initiating connection for ${connectionKey}`);

    // Check if already connected
    const existing = this.connections.get(connectionKey);
    if (existing && existing.state.status === 'connected') {
      this.logger.debug(`Connection already established for ${connectionKey}`);
      return existing.state;
    }

    // Create initial connection state
    const connectionState: ConnectionState = {
      status: 'connecting',
      lastConnected: null,
      reconnectAttempts: 0,
      latency: 0,
      conversationId,
      userId,
    };

    try {
      // Initialize Ably client
      const client = this.ablyConfigService.initializeClient(userId, [
        'conversation:*',
        'presence:*',
        'coaching:*',
      ]);

      // Set up connection event handlers
      this.setupConnectionEventHandlers(client, connectionState, connectionKey);

      // Create connection info
      const connectionInfo: ConnectionInfo = {
        client,
        channels: new Map(),
        state: connectionState,
      };

      this.connections.set(connectionKey, connectionInfo);

      // Wait for connection to establish
      await this.waitForConnection(client);
      
      connectionState.status = 'connected';
      connectionState.lastConnected = new Date();
      connectionState.connectionId = client.connection.id;
      connectionState.clientId = client.clientId;

      // Start monitoring connection health
      this.startConnectionMonitoring(connectionKey);

      // Set up essential channels
      await this.setupEssentialChannels(connectionKey, conversationId);

      this.logger.log(`Connection established successfully for ${connectionKey}`);
      
      return connectionState;

    } catch (error) {
      connectionState.status = 'failed';
      this.logger.error(`Failed to connect for ${connectionKey}:`, error);
      throw error;
    }
  }

  /**
   * Gracefully disconnect from conversation
   */
  async disconnect(conversationId: string, userId?: string): Promise<void> {
    const connectionKey = userId 
      ? this.getConnectionKey(conversationId, userId)
      : this.findConnectionByConversation(conversationId);

    if (!connectionKey) {
      this.logger.warn(`No connection found for conversation ${conversationId}`);
      return;
    }

    const connection = this.connections.get(connectionKey);
    if (!connection) {
      return;
    }

    this.logger.debug(`Disconnecting ${connectionKey}`);

    try {
      // Clean up timers
      if (connection.reconnectTimer) {
        clearTimeout(connection.reconnectTimer);
      }
      if (connection.monitoringInterval) {
        clearInterval(connection.monitoringInterval);
      }

      // Leave presence on all channels
      for (const [channelName, channel] of connection.channels) {
        try {
          await channel.presence.leave();
          this.logger.debug(`Left presence on channel: ${channelName}`);
        } catch (error) {
          this.logger.warn(`Error leaving presence on ${channelName}:`, error);
        }
      }

      // Close Ably connection
      await connection.client.close();
      
      connection.state.status = 'disconnected';
      this.connections.delete(connectionKey);

      this.logger.log(`Disconnected successfully: ${connectionKey}`);

    } catch (error) {
      this.logger.error(`Error during disconnect for ${connectionKey}:`, error);
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  async handleReconnection(connectionKey: string): Promise<void> {
    const connection = this.connections.get(connectionKey);
    if (!connection) {
      this.logger.warn(`Attempting to reconnect non-existent connection: ${connectionKey}`);
      return;
    }

    const { state } = connection;
    
    if (state.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(`Max reconnection attempts reached for ${connectionKey}`);
      state.status = 'failed';
      return;
    }

    const backoffDelay = this.RECONNECT_INTERVALS[
      Math.min(state.reconnectAttempts, this.RECONNECT_INTERVALS.length - 1)
    ];

    state.reconnectAttempts++;
    this.logger.debug(`Reconnection attempt ${state.reconnectAttempts} for ${connectionKey} in ${backoffDelay}ms`);

    connection.reconnectTimer = setTimeout(async () => {
      try {
        state.status = 'connecting';
        
        // Close existing client if still open
        if (connection.client.connection.state === 'connected') {
          await connection.client.close();
        }

        // Create new client
        connection.client = this.ablyConfigService.initializeClient(state.userId, [
          'conversation:*',
          'presence:*',
          'coaching:*',
        ]);

        // Set up event handlers for new client
        this.setupConnectionEventHandlers(connection.client, state, connectionKey);

        // Wait for connection
        await this.waitForConnection(connection.client);

        state.status = 'connected';
        state.lastConnected = new Date();
        state.reconnectAttempts = 0; // Reset on successful reconnection
        
        // Restore channels and presence
        await this.restoreConnectionState(connectionKey);
        
        this.logger.log(`Reconnection successful for ${connectionKey}`);

      } catch (error) {
        this.logger.error(`Reconnection failed for ${connectionKey}:`, error);
        // Schedule next attempt
        await this.handleReconnection(connectionKey);
      }
    }, backoffDelay);
  }

  /**
   * Synchronize connection state after reconnection
   */
  async syncState(connectionKey: string): Promise<void> {
    const connection = this.connections.get(connectionKey);
    if (!connection || connection.state.status !== 'connected') {
      return;
    }

    this.logger.debug(`Syncing state for ${connectionKey}`);

    try {
      // Re-enter presence on all channels
      for (const [channelName, channel] of connection.channels) {
        await this.ablyConfigService.setupChannelPresence(
          channel, 
          connection.state.userId,
          {
            reconnected: true,
            reconnectedAt: new Date().toISOString(),
          }
        );
      }

      this.logger.debug(`State synchronized for ${connectionKey}`);

    } catch (error) {
      this.logger.error(`Error syncing state for ${connectionKey}:`, error);
    }
  }

  /**
   * Get connection state for monitoring
   */
  getConnectionState(conversationId: string, userId: string): ConnectionState | null {
    const connectionKey = this.getConnectionKey(conversationId, userId);
    const connection = this.connections.get(connectionKey);
    return connection?.state || null;
  }

  /**
   * Get Ably client for advanced operations
   */
  getAblyClient(conversationId: string, userId: string): Ably.Realtime | null {
    const connectionKey = this.getConnectionKey(conversationId, userId);
    const connection = this.connections.get(connectionKey);
    return connection?.client || null;
  }

  /**
   * Get channel from active connection
   */
  getChannel(conversationId: string, userId: string, channelName: string): Ably.RealtimeChannel | null {
    const connectionKey = this.getConnectionKey(conversationId, userId);
    const connection = this.connections.get(connectionKey);
    return connection?.channels.get(channelName) || null;
  }

  /**
   * Add channel to connection
   */
  addChannel(conversationId: string, userId: string, channelName: string): Ably.RealtimeChannel | null {
    const connectionKey = this.getConnectionKey(conversationId, userId);
    const connection = this.connections.get(connectionKey);
    
    if (!connection) {
      this.logger.warn(`Cannot add channel ${channelName}: connection not found for ${connectionKey}`);
      return null;
    }

    const channel = connection.client.channels.get(channelName);
    connection.channels.set(channelName, channel);
    
    this.logger.debug(`Added channel ${channelName} to connection ${connectionKey}`);
    return channel;
  }

  /**
   * Module cleanup
   */
  async onModuleDestroy() {
    this.logger.log('Cleaning up all connections...');
    
    const cleanupPromises = Array.from(this.connections.keys()).map(connectionKey => {
      const [conversationId, userId] = connectionKey.split(':');
      return this.disconnect(conversationId, userId);
    });

    await Promise.allSettled(cleanupPromises);
    this.logger.log('Connection cleanup complete');
  }

  // Private helper methods

  private getConnectionKey(conversationId: string, userId: string): string {
    return `${conversationId}:${userId}`;
  }

  private findConnectionByConversation(conversationId: string): string | null {
    for (const key of this.connections.keys()) {
      if (key.startsWith(`${conversationId}:`)) {
        return key;
      }
    }
    return null;
  }

  private setupConnectionEventHandlers(
    client: Ably.Realtime, 
    state: ConnectionState, 
    connectionKey: string
  ): void {
    client.connection.on('connected', () => {
      state.status = 'connected';
      state.lastConnected = new Date();
      state.reconnectAttempts = 0;
      this.logger.debug(`Connection established: ${connectionKey}`);
    });

    client.connection.on('disconnected', () => {
      state.status = 'disconnected';
      this.logger.warn(`Connection lost: ${connectionKey}`);
      // Automatic reconnection will be handled
      this.handleReconnection(connectionKey);
    });

    client.connection.on('failed', (error) => {
      state.status = 'failed';
      this.logger.error(`Connection failed: ${connectionKey}`, error);
    });

    client.connection.on('suspended', () => {
      state.status = 'disconnected';
      this.logger.warn(`Connection suspended: ${connectionKey}`);
    });
  }

  private async waitForConnection(client: Ably.Realtime): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.CONNECTION_TIMEOUT);

      if (client.connection.state === 'connected') {
        clearTimeout(timeout);
        resolve();
        return;
      }

      client.connection.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.connection.once(['failed', 'suspended'], (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private startConnectionMonitoring(connectionKey: string): void {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    connection.monitoringInterval = setInterval(async () => {
      await this.monitorConnection(connectionKey);
    }, this.PING_INTERVAL);
  }

  private async monitorConnection(connectionKey: string): Promise<void> {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    try {
      const startTime = Date.now();
      
      // Simple ping to measure latency
      await connection.client.stats();
      
      const latency = Date.now() - startTime;
      connection.state.latency = latency;

      // Log connection quality issues
      if (latency > this.MAX_LATENCY_THRESHOLD) {
        this.logger.warn(`High latency detected for ${connectionKey}: ${latency}ms`);
      }

      // Check if connection is actually alive
      if (connection.client.connection.state === 'disconnected') {
        this.logger.warn(`Connection monitor detected disconnect: ${connectionKey}`);
        await this.handleReconnection(connectionKey);
      }

    } catch (error) {
      this.logger.warn(`Connection monitoring failed for ${connectionKey}:`, error);
    }
  }

  private async setupEssentialChannels(connectionKey: string, conversationId: string): Promise<void> {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    const channelNames = [
      `conversation:${conversationId}`,
      `presence:${conversationId}`,
      `moderation:${conversationId}`,
      `coaching:${connection.state.userId}:${conversationId}`,
    ];

    for (const channelName of channelNames) {
      const channel = connection.client.channels.get(channelName);
      connection.channels.set(channelName, channel);
      
      // Enter presence for user-specific channels
      if (channelName.includes('conversation') || channelName.includes('presence')) {
        await this.ablyConfigService.setupChannelPresence(
          channel,
          connection.state.userId,
          {
            joinedAt: new Date().toISOString(),
            conversationId,
          }
        );
      }
    }
  }

  private async restoreConnectionState(connectionKey: string): Promise<void> {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    // Re-establish channels
    const channelNames = Array.from(connection.channels.keys());
    connection.channels.clear();

    for (const channelName of channelNames) {
      const channel = connection.client.channels.get(channelName);
      connection.channels.set(channelName, channel);
    }

    // Sync state
    await this.syncState(connectionKey);
  }
}
