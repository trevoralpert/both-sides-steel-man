'use client';

/**
 * Phase 6 Task 6.2.1: WebSocket Connection Management
 * 
 * React hooks for managing Ably WebSocket connections with automatic reconnection,
 * connection state management, and error handling. Integrates with existing
 * backend real-time infrastructure from Phase 5.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

// Connection states
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'failed' | 'suspended';

// Connection configuration
export interface ConnectionConfig {
  conversationId: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

// Connection info and methods
export interface RealtimeConnection {
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionId?: string;
  error?: string;
  reconnectAttempt: number;
  lastConnectedAt?: Date;
  latency?: number;
  reconnect: () => void;
  disconnect: () => void;
  sendMessage: (data: any) => Promise<void>;
  subscribe: (eventName: string, callback: (data: any) => void) => () => void;
}

// Mock Ably-like interface for development
// In production, this would be replaced with actual Ably SDK
interface MockChannel {
  subscribe: (event: string, callback: (message: any) => void) => void;
  unsubscribe: (event: string, callback?: (message: any) => void) => void;
  publish: (event: string, data: any) => Promise<void>;
  presence: {
    enter: (data?: any) => Promise<void>;
    leave: (data?: any) => Promise<void>;
    update: (data?: any) => Promise<void>;
    subscribe: (event: 'enter' | 'leave' | 'update', callback: (message: any) => void) => void;
    unsubscribe: (event: 'enter' | 'leave' | 'update', callback?: (message: any) => void) => void;
  };
}

interface MockRealtime {
  connection: {
    state: string;
    id?: string;
    on: (event: string, callback: (stateChange: any) => void) => void;
    off: (event: string, callback?: (stateChange: any) => void) => void;
    ping: () => Promise<number>;
  };
  channels: {
    get: (channelName: string) => MockChannel;
  };
  close: () => void;
}

// Mock implementation for development
class MockAblyConnection implements MockRealtime {
  private _state: ConnectionState = 'connecting';
  private _id?: string;
  private _channels = new Map<string, MockChannel>();
  private _listeners = new Map<string, Function[]>();
  private _reconnectTimer?: NodeJS.Timeout;
  private _heartbeatTimer?: NodeJS.Timeout;
  private _config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this._config = config;
    this._id = `mock-connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate connection process
    setTimeout(() => {
      this._setState('connected');
      this._startHeartbeat();
    }, 1000 + Math.random() * 2000);
  }

  private _setState(newState: ConnectionState) {
    const oldState = this._state;
    this._state = newState;
    
    const listeners = this._listeners.get('connectionStateChange') || [];
    listeners.forEach(callback => {
      callback({
        current: newState,
        previous: oldState,
        event: newState,
        reason: newState === 'failed' ? 'connection_error' : undefined
      });
    });
  }

  private _startHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
    }
    
    this._heartbeatTimer = setInterval(() => {
      // Simulate random disconnections for testing
      if (Math.random() < 0.02) { // 2% chance per heartbeat
        this._setState('disconnected');
        this._attemptReconnection();
      }
    }, this._config.heartbeatInterval || 30000);
  }

  private _attemptReconnection() {
    if (!this._config.autoReconnect) return;
    
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }
    
    this._reconnectTimer = setTimeout(() => {
      this._setState('connecting');
      
      // Simulate reconnection attempt
      setTimeout(() => {
        if (Math.random() > 0.2) { // 80% success rate
          this._setState('connected');
          this._startHeartbeat();
        } else {
          this._setState('failed');
        }
      }, 1000 + Math.random() * 3000);
    }, this._config.reconnectDelay || 3000);
  }

  get connection() {
    return {
      state: this._state,
      id: this._id,
      on: (event: string, callback: (stateChange: any) => void) => {
        const listeners = this._listeners.get(event) || [];
        listeners.push(callback);
        this._listeners.set(event, listeners);
      },
      off: (event: string, callback?: (stateChange: any) => void) => {
        if (!callback) {
          this._listeners.delete(event);
        } else {
          const listeners = this._listeners.get(event) || [];
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
            this._listeners.set(event, listeners);
          }
        }
      },
      ping: async (): Promise<number> => {
        return Promise.resolve(50 + Math.random() * 100); // Mock latency
      }
    };
  }

  get channels() {
    return {
      get: (channelName: string): MockChannel => {
        if (!this._channels.has(channelName)) {
          this._channels.set(channelName, new MockChannelImpl());
        }
        return this._channels.get(channelName)!;
      }
    };
  }

  close() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
    }
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }
    this._setState('disconnected');
  }
}

class MockChannelImpl implements MockChannel {
  private _listeners = new Map<string, Function[]>();
  private _presenceListeners = new Map<string, Function[]>();

  subscribe(event: string, callback: (message: any) => void) {
    const listeners = this._listeners.get(event) || [];
    listeners.push(callback);
    this._listeners.set(event, listeners);
  }

  unsubscribe(event: string, callback?: (message: any) => void) {
    if (!callback) {
      this._listeners.delete(event);
    } else {
      const listeners = this._listeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        this._listeners.set(event, listeners);
      }
    }
  }

  async publish(event: string, data: any): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // In mock mode, echo the message back to simulate real-time behavior
    setTimeout(() => {
      const listeners = this._listeners.get(event) || [];
      const mockMessage = {
        data,
        name: event,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        clientId: 'mock-client'
      };
      
      listeners.forEach(callback => callback(mockMessage));
    }, 500 + Math.random() * 1000); // Simulate message propagation delay
  }

  get presence() {
    return {
      enter: async (data?: any): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const listeners = this._presenceListeners.get('enter') || [];
        listeners.forEach(callback => {
          callback({
            action: 'enter',
            data,
            clientId: 'mock-client',
            timestamp: Date.now()
          });
        });
      },

      leave: async (data?: any): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const listeners = this._presenceListeners.get('leave') || [];
        listeners.forEach(callback => {
          callback({
            action: 'leave',
            data,
            clientId: 'mock-client',
            timestamp: Date.now()
          });
        });
      },

      update: async (data?: any): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const listeners = this._presenceListeners.get('update') || [];
        listeners.forEach(callback => {
          callback({
            action: 'update',
            data,
            clientId: 'mock-client',
            timestamp: Date.now()
          });
        });
      },

      subscribe: (event: 'enter' | 'leave' | 'update', callback: (message: any) => void) => {
        const listeners = this._presenceListeners.get(event) || [];
        listeners.push(callback);
        this._presenceListeners.set(event, listeners);
      },

      unsubscribe: (event: 'enter' | 'leave' | 'update', callback?: (message: any) => void) => {
        if (!callback) {
          this._presenceListeners.delete(event);
        } else {
          const listeners = this._presenceListeners.get(event) || [];
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
            this._presenceListeners.set(event, listeners);
          }
        }
      }
    };
  }
}

// Main hook for real-time connection management
export function useRealtimeConnection(config: ConnectionConfig): RealtimeConnection {
  const { getToken, isLoaded, userId } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string>();
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastConnectedAt, setLastConnectedAt] = useState<Date>();
  const [latency, setLatency] = useState<number>();
  const [connectionId, setConnectionId] = useState<string>();

  const realtimeRef = useRef<MockRealtime>();
  const channelRef = useRef<MockChannel>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Connection establishment
  const connect = useCallback(async () => {
    if (!isLoaded || !userId) {
      setError('Authentication not ready');
      return;
    }

    try {
      setConnectionState('connecting');
      setError(undefined);

      // In production, this would get a real JWT token for Ably
      // const token = await getToken({ template: 'ably_token' });
      
      // For now, use mock connection
      const realtime = new MockAblyConnection({
        ...config,
        autoReconnect: config.autoReconnect !== false,
        maxReconnectAttempts: config.maxReconnectAttempts || 10,
        reconnectDelay: config.reconnectDelay || 3000,
        heartbeatInterval: config.heartbeatInterval || 30000
      });

      realtimeRef.current = realtime;
      setConnectionId(realtime.connection.id);

      // Listen for connection state changes
      realtime.connection.on('connectionStateChange', (stateChange: any) => {
        setConnectionState(stateChange.current);
        
        if (stateChange.current === 'connected') {
          setLastConnectedAt(new Date());
          setReconnectAttempt(0);
          setError(undefined);
          
          // Measure latency
          realtime.connection.ping().then(latency => {
            setLatency(latency);
          });
        } else if (stateChange.current === 'failed') {
          setError(stateChange.reason || 'Connection failed');
          setReconnectAttempt(prev => prev + 1);
        }
      });

      // Get conversation channel
      const channelName = `conversation:${config.conversationId}`;
      const channel = realtime.channels.get(channelName);
      channelRef.current = channel;

      // Enter presence for this user
      await channel.presence.enter({
        userId,
        joinedAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnectionState('failed');
    }
  }, [isLoaded, userId, config, getToken]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (realtimeRef.current) {
      realtimeRef.current.close();
      realtimeRef.current = undefined;
    }
    
    if (channelRef.current) {
      channelRef.current = undefined;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setConnectionState('disconnected');
    setConnectionId(undefined);
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  // Send message
  const sendMessage = useCallback(async (data: any) => {
    if (!channelRef.current) {
      throw new Error('No active channel');
    }
    
    if (connectionState !== 'connected') {
      throw new Error('Connection not established');
    }

    await channelRef.current.publish('message', {
      ...data,
      userId,
      timestamp: new Date().toISOString()
    });
  }, [connectionState, userId]);

  // Subscribe to events
  const subscribe = useCallback((eventName: string, callback: (data: any) => void) => {
    if (!channelRef.current) {
      console.warn('No active channel for subscription');
      return () => {};
    }

    channelRef.current.subscribe(eventName, callback);
    
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe(eventName, callback);
      }
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (isLoaded && userId && connectionState === 'disconnected') {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [isLoaded, userId, connect, disconnect, connectionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    connectionId,
    error,
    reconnectAttempt,
    lastConnectedAt,
    latency,
    reconnect,
    disconnect,
    sendMessage,
    subscribe
  };
}

// Hook for conversation-specific connection
export function useConversationConnection(conversationId: string) {
  return useRealtimeConnection({
    conversationId,
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 3000,
    heartbeatInterval: 30000
  });
}

// Hook for connection status monitoring
export function useConnectionStatus(connection: RealtimeConnection) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastReconnectAt, setLastReconnectAt] = useState<Date>();

  // Monitor browser online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Track reconnection attempts
  useEffect(() => {
    if (connection.reconnectAttempt > 0) {
      setLastReconnectAt(new Date());
    }
  }, [connection.reconnectAttempt]);

  return {
    isOnline,
    isConnected: connection.isConnected,
    connectionState: connection.connectionState,
    error: connection.error,
    latency: connection.latency,
    reconnectAttempt: connection.reconnectAttempt,
    lastReconnectAt,
    canReconnect: isOnline && connection.connectionState !== 'connecting'
  };
}

export default useRealtimeConnection;
