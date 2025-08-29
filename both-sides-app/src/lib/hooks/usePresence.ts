'use client';

/**
 * Phase 6 Task 6.2.4: Real-time Presence Management Hook
 * 
 * Manages participant presence state, typing indicators, and real-time
 * synchronization via WebSocket channels. Integrates with existing
 * Ably connection infrastructure from Phase 5.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useConversationConnection } from './useRealtimeConnection';
import { ParticipantInfo } from '@/types/debate';

export interface PresenceState {
  participants: {
    [userId: string]: {
      isOnline: boolean;
      isTyping: boolean;
      lastSeen: Date;
    };
  };
  updateTyping: (isTyping: boolean) => void;
  updatePresence: (isOnline: boolean) => void;
  getParticipantPresence: (userId: string) => {
    isOnline: boolean;
    isTyping: boolean;
    lastSeen?: Date;
  };
  getTypingUsers: () => string[];
  isConnected: boolean;
}

export interface UsePresenceConfig {
  conversationId: string;
  participants: ParticipantInfo[];
  typingTimeoutMs?: number;
  presenceHeartbeatMs?: number;
}

export function usePresence({
  conversationId,
  participants,
  typingTimeoutMs = 3000,
  presenceHeartbeatMs = 30000
}: UsePresenceConfig): PresenceState {
  const { userId } = useAuth();
  const connection = useConversationConnection(conversationId);
  
  // Presence state for all participants
  const [presenceState, setPresenceState] = useState<{
    [userId: string]: {
      isOnline: boolean;
      isTyping: boolean;
      lastSeen: Date;
    };
  }>({});
  
  // Current user's typing state
  const [isCurrentUserTyping, setIsCurrentUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const presenceHeartbeatRef = useRef<NodeJS.Timeout>();
  
  // Initialize presence state for all participants
  useEffect(() => {
    const initialState: typeof presenceState = {};
    participants.forEach(participant => {
      initialState[participant.id] = {
        isOnline: participant.isOnline,
        isTyping: participant.isTyping,
        lastSeen: participant.lastSeen || new Date()
      };
    });
    setPresenceState(initialState);
  }, [participants]);
  
  // Send presence update to WebSocket
  const sendPresenceUpdate = useCallback(async (update: {
    type: 'presence' | 'typing';
    isOnline?: boolean;
    isTyping?: boolean;
  }) => {
    if (!connection.isConnected || !userId) return;
    
    try {
      await connection.sendMessage({
        type: 'PRESENCE_UPDATE',
        userId,
        conversationId,
        timestamp: new Date().toISOString(),
        ...update
      });
    } catch (error) {
      console.error('Failed to send presence update:', error);
    }
  }, [connection, userId, conversationId]);
  
  // Update typing indicator
  const updateTyping = useCallback(async (isTyping: boolean) => {
    if (!userId) return;
    
    setIsCurrentUserTyping(isTyping);
    
    // Update local state immediately for current user
    setPresenceState(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        isTyping,
        isOnline: true,
        lastSeen: new Date()
      }
    }));
    
    // Send to WebSocket
    await sendPresenceUpdate({
      type: 'typing',
      isTyping
    });
    
    // Set timeout to automatically stop typing indicator
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        updateTyping(false);
      }, typingTimeoutMs);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
    }
  }, [userId, sendPresenceUpdate, typingTimeoutMs]);
  
  // Update general presence (online/offline)
  const updatePresence = useCallback(async (isOnline: boolean) => {
    if (!userId) return;
    
    setPresenceState(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        isOnline,
        lastSeen: new Date(),
        // Stop typing if going offline
        isTyping: isOnline ? prev[userId]?.isTyping ?? false : false
      }
    }));
    
    await sendPresenceUpdate({
      type: 'presence',
      isOnline
    });
  }, [userId, sendPresenceUpdate]);
  
  // Listen for presence updates from WebSocket
  useEffect(() => {
    if (!connection.isConnected) return;
    
    const handlePresenceUpdate = (data: any) => {
      if (data.type === 'PRESENCE_UPDATE' && data.userId && data.userId !== userId) {
        setPresenceState(prev => ({
          ...prev,
          [data.userId]: {
            isOnline: data.isOnline ?? prev[data.userId]?.isOnline ?? true,
            isTyping: data.isTyping ?? prev[data.userId]?.isTyping ?? false,
            lastSeen: data.timestamp ? new Date(data.timestamp) : new Date()
          }
        }));
      }
    };
    
    // Subscribe to presence updates
    const unsubscribe = connection.subscribe('presence', handlePresenceUpdate);
    
    return unsubscribe;
  }, [connection, userId]);
  
  // Send periodic heartbeat to maintain presence
  useEffect(() => {
    if (!connection.isConnected || !userId) return;
    
    const sendHeartbeat = () => {
      updatePresence(true);
    };
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Set up periodic heartbeat
    presenceHeartbeatRef.current = setInterval(sendHeartbeat, presenceHeartbeatMs);
    
    return () => {
      if (presenceHeartbeatRef.current) {
        clearInterval(presenceHeartbeatRef.current);
      }
    };
  }, [connection.isConnected, userId, updatePresence, presenceHeartbeatMs]);
  
  // Handle connection state changes
  useEffect(() => {
    if (connection.connectionState === 'connected') {
      // Send presence when reconnecting
      updatePresence(true);
    } else if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed') {
      // Mark current user as offline locally
      if (userId) {
        setPresenceState(prev => ({
          ...prev,
          [userId]: {
            ...prev[userId],
            isOnline: false,
            isTyping: false,
            lastSeen: new Date()
          }
        }));
      }
    }
  }, [connection.connectionState, updatePresence, userId]);
  
  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      updatePresence(isVisible);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updatePresence]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (presenceHeartbeatRef.current) {
        clearInterval(presenceHeartbeatRef.current);
      }
      
      // Send offline status on unmount
      if (userId && connection.isConnected) {
        updatePresence(false);
      }
    };
  }, [userId, connection.isConnected, updatePresence]);
  
  // Helper functions
  const getParticipantPresence = useCallback((participantUserId: string) => {
    const presence = presenceState[participantUserId];
    return {
      isOnline: presence?.isOnline ?? false,
      isTyping: presence?.isTyping ?? false,
      lastSeen: presence?.lastSeen
    };
  }, [presenceState]);
  
  const getTypingUsers = useCallback(() => {
    return Object.entries(presenceState)
      .filter(([id, presence]) => presence.isTyping && id !== userId)
      .map(([id]) => {
        const participant = participants.find(p => p.id === id);
        return participant?.name || 'Unknown User';
      });
  }, [presenceState, userId, participants]);
  
  return {
    participants: presenceState,
    updateTyping,
    updatePresence,
    getParticipantPresence,
    getTypingUsers,
    isConnected: connection.isConnected
  };
}

export default usePresence;
