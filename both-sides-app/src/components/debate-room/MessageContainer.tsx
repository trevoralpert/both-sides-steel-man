'use client';

/**
 * Phase 6 Task 6.1.4: MessageContainer Component
 * 
 * Main scrollable message container with virtual scrolling, auto-scroll,
 * and message history loading. Handles 1000+ messages efficiently.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { Message, DebatePhase } from '@/types/debate';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ErrorBoundary, MessageErrorFallback } from '@/components/error';
import { SkeletonMessageContainer } from '@/components/loading';
import { EmptyMessages, NetworkOffline } from '@/components/fallback';
import { useRealtimeMessages } from '@/lib/hooks/useRealtimeMessages';
import { 
  ArrowDown, 
  Loader2, 
  MessageSquare,
  RefreshCw,
  AlertCircle,
  ChevronDown
} from 'lucide-react';

import { MessageGroup } from './MessageGroup';

export interface MessageContainerProps {
  conversationId?: string;
  currentUserId: string;
  messages?: Message[];
  participantMap: Record<string, {
    name: string;
    avatar?: string;
    position?: 'PRO' | 'CON';
  }>;
  initialMessages?: Message[];
  currentPhase?: DebatePhase;
  autoScrollEnabled?: boolean;
  showTimestamps?: boolean;
  showAvatars?: boolean;
  className?: string;
  onLoadMore?: () => void;
  isLoading?: boolean;
  
  // Real-time event handlers
  onMessageSent?: (message: Message) => void;
  onMessageReceived?: (message: Message) => void;
  onReactionAdded?: (messageId: string, emoji: string, userId: string) => void;
  onReply?: (messageId: string, content?: string) => void;
}

interface VirtualScrollState {
  scrollTop: number;
  containerHeight: number;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
}

const MESSAGE_HEIGHT = 80; // Approximate height per message for virtualization
const BUFFER_SIZE = 10; // Extra messages to render outside viewport
const SCROLL_THRESHOLD = 100; // Distance from bottom to show scroll-to-bottom button

export function MessageContainer({
  conversationId,
  currentUserId,
  participantMap,
  initialMessages = [],
  currentPhase = 'DISCUSSION',
  autoScrollEnabled = true,
  showTimestamps = true,
  showAvatars = true,
  className,
  onMessageSent,
  onMessageReceived,
  onReactionAdded,
  onReply
}: MessageContainerProps) {
  // Real-time messages hook
  const realtimeMessages = useRealtimeMessages({
    conversationId: conversationId || 'default',
    userId: currentUserId,
    initialMessages
  });

  // UI state
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Extract from real-time hook
  const { 
    messages, 
    isLoading, 
    error,
    sendMessage,
    replyToMessage,
    reactToMessage,
    flagMessage,
    retryMessage,
    loadMoreMessages,
    hasMoreMessages
  } = realtimeMessages;
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Virtual scrolling state
  const [virtualState, setVirtualState] = useState<VirtualScrollState>({
    scrollTop: 0,
    containerHeight: 600,
    totalHeight: 0,
    startIndex: 0,
    endIndex: 0
  });

  // Calculate visible message indices for virtual scrolling
  const { visibleMessages, startIndex, endIndex } = useMemo(() => {
    if (messages.length === 0) {
      return { visibleMessages: [], startIndex: 0, endIndex: 0 };
    }

    const containerHeight = virtualState.containerHeight;
    const scrollTop = virtualState.scrollTop;

    const startIdx = Math.floor(scrollTop / MESSAGE_HEIGHT);
    const endIdx = Math.min(
      messages.length,
      Math.ceil((scrollTop + containerHeight) / MESSAGE_HEIGHT) + BUFFER_SIZE
    );

    const actualStartIdx = Math.max(0, startIdx - BUFFER_SIZE);
    const visibleMessages = messages.slice(actualStartIdx, endIdx);

    return {
      visibleMessages,
      startIndex: actualStartIdx,
      endIndex: endIdx
    };
  }, [messages, virtualState]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback((force = false) => {
    if (!messagesEndRef.current) return;

    if (force || (autoScrollEnabled && isNearBottom && !isUserScrolling)) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: force ? 'auto' : 'smooth',
        block: 'end' 
      });
      setShowScrollToBottom(false);
    }
  }, [autoScrollEnabled, isNearBottom, isUserScrolling]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Update virtual scroll state
    setVirtualState(prev => ({
      ...prev,
      scrollTop,
      containerHeight: clientHeight,
      totalHeight: scrollHeight
    }));

    // Determine if user is near bottom
    const nearBottom = distanceFromBottom < SCROLL_THRESHOLD;
    setIsNearBottom(nearBottom);
    setShowScrollToBottom(!nearBottom && messages.length > 0);

    // Set user scrolling flag
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 150);

    // Load more messages when scrolled to top
    if (scrollTop === 0 && hasMoreMessages && loadMoreMessages && !isLoading) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, loadMoreMessages, isLoading, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial scroll state
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Handle forced scroll to bottom
  const handleScrollToBottom = () => {
    scrollToBottom(true);
  };

  // Retry loading on error
  const handleLoadRetry = () => {
    if (loadMoreMessages) {
      loadMoreMessages();
    }
  };

  // Loading more indicator at top
  const LoadingMoreIndicator = () => (
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading previous messages...</span>
      </div>
    </div>
  );

  // Message action handlers
  const handleReply = useCallback((messageId: string, content?: string) => {
    onReply?.(messageId, content);
  }, [onReply]);

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    try {
      await reactToMessage(messageId, emoji);
      onReactionAdded?.(messageId, emoji, currentUserId);
    } catch (err) {
      console.error('Failed to react to message:', err);
    }
  }, [reactToMessage, onReactionAdded, currentUserId]);

  const handleFlag = useCallback(async (messageId: string) => {
    try {
      await flagMessage(messageId);
    } catch (err) {
      console.error('Failed to flag message:', err);
    }
  }, [flagMessage]);

  const handleRetry = useCallback(async (messageId: string) => {
    try {
      await retryMessage(messageId);
    } catch (err) {
      console.error('Failed to retry message:', err);
    }
  }, [retryMessage]);

  // Handle load more messages
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreMessages) {
      loadMoreMessages();
    }
  }, [isLoading, hasMoreMessages, loadMoreMessages]);

  // Error state
  if (error) {
    const isNetworkError = error.toLowerCase().includes('network') || error.toLowerCase().includes('connection');
    
    return (
      <div className={cn("flex-1 flex flex-col", className)}>
        {isNetworkError ? (
          <NetworkOffline onRetry={() => window.location.reload()} />
        ) : (
          <MessageErrorFallback
            error={new Error(error)}
            errorInfo={null}
            resetError={() => window.location.reload()}
            retryCount={0}
            context="message"
            level="component"
            errorId={`msg-error-${Date.now()}`}
          />
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading && messages.length === 0) {
    return (
      <div className={cn("flex-1 flex flex-col", className)}>
        <SkeletonMessageContainer messageCount={8} animate={true} />
      </div>
    );
  }

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className={cn("flex-1 flex flex-col", className)}>
        <EmptyMessages />
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={MessageErrorFallback}
      context="message"
      level="component"
      onError={(error, errorInfo, errorId) => {
        console.error('MessageContainer error:', { error, errorInfo, errorId });
      }}
    >
      <div className={cn("flex-1 flex flex-col relative", className)}>
        
        {/* Message Container */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto scroll-smooth px-4 py-2"
          style={{ height: '100%' }}
        >
          {/* Loading more indicator */}
          {isLoading && hasMoreMessages && (
            <LoadingMoreIndicator />
          )}

          {/* Virtual scrolling spacer (top) */}
          {startIndex > 0 && (
            <div style={{ height: startIndex * MESSAGE_HEIGHT }} />
          )}

          {/* Visible messages */}
          <MessageGroup
            messages={visibleMessages}
            currentUserId={currentUserId}
            participantMap={participantMap}
            showTimestamps={showTimestamps}
            showAvatars={showAvatars}
            onReply={handleReply}
            onReact={handleReact}
            onFlag={handleFlag}
            onRetry={handleRetry}
          />

          {/* Virtual scrolling spacer (bottom) */}
          {endIndex < messages.length && (
            <div style={{ height: (messages.length - endIndex) * MESSAGE_HEIGHT }} />
          )}

          {/* Bottom anchor for auto-scroll */}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <div className="absolute bottom-4 right-4">
            <Button
              onClick={handleScrollToBottom}
              size="sm"
              className="rounded-full shadow-lg"
              title="Scroll to bottom"
            >
              <ChevronDown className="h-4 w-4" />
              {messages.length > 0 && (
                <Badge className="ml-1 bg-white text-primary">
                  {messages.length}
                </Badge>
              )}
            </Button>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !hasMoreMessages && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading messages...</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default MessageContainer;
