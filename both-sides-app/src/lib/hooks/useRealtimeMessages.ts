'use client';

/**
 * Phase 6 Task 6.2.2: Real-time Message Management Hook
 * 
 * Hook for managing real-time message updates, optimistic UI,
 * and WebSocket integration with status tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { Message, MessageAction, DebatePhase } from '@/types/debate';

import { useConversationConnection } from './useRealtimeConnection';

export interface OptimisticMessage extends Message {
  isOptimistic: true;
  tempId: string;
}

export interface RealtimeMessagesConfig {
  conversationId: string;
  userId: string;
  initialMessages?: Message[];
  maxRetries?: number;
  retryDelay?: number;
}

export interface RealtimeMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  error?: string;
  connection: ReturnType<typeof useConversationConnection>;
  
  // Message operations
  sendMessage: (content: string, phase?: DebatePhase, replyToId?: string) => Promise<void>;
  replyToMessage: (messageId: string, content: string, originalContent?: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  flagMessage: (messageId: string, reason?: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  
  // Message history
  loadMoreMessages: () => Promise<void>;
  hasMoreMessages: boolean;
  
  // Real-time status
  lastMessageAt?: Date;
  messageCount: number;
}

export function useRealtimeMessages({
  conversationId,
  userId,
  initialMessages = [],
  maxRetries = 3,
  retryDelay = 2000
}: RealtimeMessagesConfig): RealtimeMessagesReturn {
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [lastMessageAt, setLastMessageAt] = useState<Date>();
  
  // Connection to WebSocket
  const connection = useConversationConnection(conversationId);
  
  // Optimistic message tracking
  const optimisticMessages = useRef<Map<string, OptimisticMessage>>(new Map());
  const retryAttempts = useRef<Map<string, number>>(new Map());
  const retryTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate temporary IDs for optimistic messages
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add optimistic message
  const addOptimisticMessage = useCallback((message: OptimisticMessage) => {
    optimisticMessages.current.set(message.tempId, message);
    setMessages(prev => [...prev, message]);
    
    // Set timeout for automatic failure if no confirmation
    const timeout = setTimeout(() => {
      updateMessageStatus(message.tempId, 'failed');
    }, 10000); // 10 seconds timeout
    
    retryTimers.current.set(message.tempId, timeout);
  }, []);

  // Update message status
  const updateMessageStatus = useCallback((tempId: string, status: Message['status'], realId?: string) => {
    setMessages(prev => prev.map(msg => {
      if ('tempId' in msg && (msg as OptimisticMessage).tempId === tempId) {
        const updated = { ...msg };
        updated.status = status;
        updated.isOptimistic = status === 'sending';
        
        // If we have a real ID, replace the temp ID
        if (realId) {
          updated.id = realId;
          delete (updated as any).tempId;
          delete (updated as any).isOptimistic;
        }
        
        return updated;
      }
      return msg;
    }));

    // Clear retry timer if successful
    if (status === 'sent' || status === 'delivered') {
      const timer = retryTimers.current.get(tempId);
      if (timer) {
        clearTimeout(timer);
        retryTimers.current.delete(tempId);
      }
      optimisticMessages.current.delete(tempId);
    }
  }, []);

  // Remove optimistic message
  const removeOptimisticMessage = useCallback((tempId: string) => {
    optimisticMessages.current.delete(tempId);
    const timer = retryTimers.current.get(tempId);
    if (timer) {
      clearTimeout(timer);
      retryTimers.current.delete(tempId);
    }
    
    setMessages(prev => prev.filter(msg => {
      if ('tempId' in msg) {
        return (msg as OptimisticMessage).tempId !== tempId;
      }
      return true;
    }));
  }, []);

  // Send message with optimistic UI
  const sendMessage = useCallback(async (
    content: string, 
    phase: DebatePhase = 'DISCUSSION',
    replyToId?: string
  ) => {
    if (!connection.isConnected) {
      throw new Error('Not connected to real-time service');
    }

    const tempId = generateTempId();
    const replyToMessage = replyToId ? messages.find(m => m.id === replyToId) : undefined;
    
    // Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      tempId,
      content,
      authorId: userId,
      timestamp: new Date(),
      type: 'USER',
      phase,
      status: 'sending',
      isOptimistic: true,
      replyToMessageId: replyToId,
      replyToContent: replyToMessage?.content
    };

    // Add optimistic message immediately
    addOptimisticMessage(optimisticMessage);
    setLastMessageAt(new Date());

    try {
      // Send via WebSocket
      await connection.sendMessage({
        tempId,
        content,
        type: 'USER',
        phase,
        replyToMessageId: replyToId,
        timestamp: optimisticMessage.timestamp.toISOString()
      });

      // Update status to sent
      updateMessageStatus(tempId, 'sent');
      
      // The real message confirmation will come via WebSocket subscription
      
    } catch (err) {
      console.error('Failed to send message:', err);
      updateMessageStatus(tempId, 'failed');
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [connection, userId, messages, addOptimisticMessage, updateMessageStatus]);

  // Reply to message
  const replyToMessage = useCallback(async (
    messageId: string, 
    content: string, 
    originalContent?: string
  ) => {
    await sendMessage(content, 'DISCUSSION', messageId);
  }, [sendMessage]);

  // React to message
  const reactToMessage = useCallback(async (messageId: string, emoji: string) => {
    if (!connection.isConnected) {
      throw new Error('Not connected to real-time service');
    }

    try {
      await connection.sendMessage({
        type: 'REACTION',
        messageId,
        emoji,
        userId,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to send reaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reaction');
    }
  }, [connection, userId]);

  // Flag message
  const flagMessage = useCallback(async (messageId: string, reason?: string) => {
    if (!connection.isConnected) {
      throw new Error('Not connected to real-time service');
    }

    try {
      await connection.sendMessage({
        type: 'FLAG',
        messageId,
        reason,
        userId,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to flag message:', err);
      setError(err instanceof Error ? err.message : 'Failed to flag message');
    }
  }, [connection, userId]);

  // Retry failed message
  const retryMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.status !== 'failed') return;

    const attempts = retryAttempts.current.get(messageId) || 0;
    if (attempts >= maxRetries) {
      setError('Maximum retry attempts reached');
      return;
    }

    retryAttempts.current.set(messageId, attempts + 1);

    try {
      // Update status to sending
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'sending' as const } : msg
      ));

      await connection.sendMessage({
        content: message.content,
        type: message.type,
        phase: message.phase,
        replyToMessageId: message.replyToMessageId,
        retryAttempt: attempts + 1,
        timestamp: message.timestamp.toISOString()
      });

      // Update status to sent
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'sent' as const } : msg
      ));

    } catch (err) {
      console.error('Failed to retry message:', err);
      
      // Update status back to failed
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'failed' as const } : msg
      ));

      setError(err instanceof Error ? err.message : 'Failed to retry message');
    }
  }, [messages, connection, maxRetries]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoading) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would call a REST API
      // For now, simulate loading more messages
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock: no more messages to load
      setHasMoreMessages(false);
      
    } catch (err) {
      console.error('Failed to load more messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [hasMoreMessages, isLoading]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!connection.isConnected) return;

    const unsubscribeMessage = connection.subscribe('message', (data: any) => {
      if (data.data) {
        const messageData = data.data;
        
        // Check if this is a confirmation of our optimistic message
        if (messageData.tempId) {
          updateMessageStatus(messageData.tempId, 'delivered', messageData.id);
          return;
        }

        // Add new message from other users
        const newMessage: Message = {
          id: messageData.id || data.id,
          content: messageData.content,
          authorId: messageData.userId,
          timestamp: new Date(messageData.timestamp || data.timestamp),
          type: messageData.type || 'USER',
          phase: messageData.phase || 'DISCUSSION',
          status: 'delivered',
          replyToMessageId: messageData.replyToMessageId,
          replyToContent: messageData.replyToContent
        };

        // Avoid duplicates
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          
          return [...prev, newMessage].sort((a, b) => 
            a.timestamp.getTime() - b.timestamp.getTime()
          );
        });

        setLastMessageAt(new Date());
      }
    });

    const unsubscribeReaction = connection.subscribe('reaction', (data: any) => {
      if (data.data) {
        const { messageId, emoji, userId: reactorId } = data.data;
        
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            const reactions = msg.reactions || [];
            
            // Check if user already reacted with this emoji
            const existingReaction = reactions.find(r => r.userId === reactorId && r.emoji === emoji);
            
            if (existingReaction) {
              // Remove reaction if it exists (toggle)
              return {
                ...msg,
                reactions: reactions.filter(r => !(r.userId === reactorId && r.emoji === emoji))
              };
            } else {
              // Add new reaction
              return {
                ...msg,
                reactions: [
                  ...reactions,
                  {
                    id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    emoji,
                    userId: reactorId,
                    timestamp: new Date()
                  }
                ]
              };
            }
          }
          return msg;
        }));
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeReaction();
    };
  }, [connection, updateMessageStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all retry timers
      retryTimers.current.forEach(timer => clearTimeout(timer));
      retryTimers.current.clear();
      optimisticMessages.current.clear();
      retryAttempts.current.clear();
    };
  }, []);

  return {
    messages,
    isLoading,
    error,
    connection,
    sendMessage,
    replyToMessage,
    reactToMessage,
    flagMessage,
    retryMessage,
    loadMoreMessages,
    hasMoreMessages,
    lastMessageAt,
    messageCount: messages.length
  };
}

export default useRealtimeMessages;
