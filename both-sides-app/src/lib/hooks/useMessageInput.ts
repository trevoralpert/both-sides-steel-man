'use client';

/**
 * Phase 6 Task 6.2.3: Message Input Management Hook
 * 
 * Manages message input state, reply context, typing indicators,
 * and integration with real-time messaging system
 */

import { useState, useCallback, useRef } from 'react';

import { Message, DebatePhase, ParticipantInfo } from '@/types/debate';

import { useRealtimeMessages } from './useRealtimeMessages';
import { usePresence } from './usePresence';

export interface ReplyContext {
  id: string;
  content: string;
  authorName: string;
}

export interface MessageInputState {
  // Reply functionality  
  replyToMessage?: ReplyContext;
  setReplyToMessage: (message: ReplyContext | undefined) => void;
  cancelReply: () => void;
  
  // Typing indicators and presence
  isTyping: boolean;
  handleTypingStart: () => void;
  handleTypingStop: () => void;
  presence: ReturnType<typeof usePresence>;
  
  // Message sending
  sendMessage: (content: string, phase?: DebatePhase) => Promise<void>;
  sendReply: (content: string, replyToId: string, replyToContent: string, phase?: DebatePhase) => Promise<void>;
  
  // Integration with real-time messages
  messages: Message[];
  messageCount: number;
  isLoading: boolean;
  error?: string;
  connection: ReturnType<typeof useRealtimeMessages>['connection'];
}

export interface UseMessageInputConfig {
  conversationId: string;
  userId: string;
  initialMessages?: Message[];
  participantMap: Record<string, { name: string; avatar?: string; position?: 'PRO' | 'CON' }>;
  participants: ParticipantInfo[];
  currentPhase?: DebatePhase;
  
  // Typing indicator settings
  typingDebounceMs?: number;
  enableTypingIndicators?: boolean;
}

export function useMessageInput({
  conversationId,
  userId,
  initialMessages = [],
  participantMap,
  participants,
  currentPhase = 'DISCUSSION',
  typingDebounceMs = 1000,
  enableTypingIndicators = true
}: UseMessageInputConfig): MessageInputState {
  
  // Real-time messages integration
  const realtimeMessages = useRealtimeMessages({
    conversationId,
    userId,
    initialMessages
  });
  
  // Presence and typing indicators
  const presence = usePresence({
    conversationId,
    participants,
    typingTimeoutMs: typingDebounceMs
  });
  
  // Reply state
  const [replyToMessage, setReplyToMessage] = useState<ReplyContext | undefined>();
  
  // Handle reply functionality
  const cancelReply = useCallback(() => {
    setReplyToMessage(undefined);
  }, []);
  
  const setReplyContext = useCallback((message: ReplyContext | undefined) => {
    if (message) {
      setReplyToMessage(message);
    } else {
      cancelReply();
    }
  }, [cancelReply]);
  
  // Typing indicator management using presence hook
  const handleTypingStart = useCallback(() => {
    if (!enableTypingIndicators) return;
    presence.updateTyping(true);
  }, [presence, enableTypingIndicators]);
  
  const handleTypingStop = useCallback(() => {
    if (!enableTypingIndicators) return;
    presence.updateTyping(false);
  }, [presence, enableTypingIndicators]);
  
  // Enhanced message sending with reply support
  const sendMessage = useCallback(async (content: string, phase?: DebatePhase) => {
    try {
      if (replyToMessage) {
        // Send as reply
        await realtimeMessages.replyToMessage(
          replyToMessage.id, 
          content, 
          replyToMessage.content
        );
        
        // Clear reply context after sending
        cancelReply();
      } else {
        // Send regular message
        await realtimeMessages.sendMessage(content, phase || currentPhase);
      }
      
      // Stop typing indicator
      handleTypingStop();
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error; // Re-throw to let UI handle the error
    }
  }, [realtimeMessages, replyToMessage, currentPhase, handleTypingStop, cancelReply]);
  
  // Direct reply sending (for programmatic use)
  const sendReply = useCallback(async (
    content: string, 
    replyToId: string, 
    replyToContent: string, 
    phase?: DebatePhase
  ) => {
    try {
      await realtimeMessages.replyToMessage(replyToId, content, replyToContent);
      
      // Stop typing indicator
      handleTypingStop();
    } catch (error) {
      console.error('Failed to send reply:', error);
      throw error;
    }
  }, [realtimeMessages, handleTypingStop]);
  
  // Helper to create reply context from message
  const createReplyContext = useCallback((message: Message): ReplyContext => {
    const participant = participantMap[message.authorId];
    return {
      id: message.id,
      content: message.content,
      authorName: participant?.name || 'Unknown User'
    };
  }, [participantMap]);
  
  // Get current user's typing status
  const isTyping = userId ? presence.getParticipantPresence(userId).isTyping : false;
  
  return {
    // Reply functionality
    replyToMessage,
    setReplyToMessage: setReplyContext,
    cancelReply,
    
    // Typing indicators and presence
    isTyping,
    handleTypingStart,
    handleTypingStop,
    presence,
    
    // Message sending
    sendMessage,
    sendReply,
    
    // Real-time integration
    messages: realtimeMessages.messages,
    messageCount: realtimeMessages.messageCount,
    isLoading: realtimeMessages.isLoading,
    error: realtimeMessages.error,
    connection: realtimeMessages.connection
  };
}

export default useMessageInput;
