'use client';

/**
 * Phase 6 Task 6.2.5: Enhanced Message Container with History & Pagination
 * 
 * Enhanced message container with infinite scroll, search integration,
 * jump-to-message functionality, and optimized performance for large conversations
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { Message, DebatePhase } from '@/types/debate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary, MessageErrorFallback } from '@/components/error';
import { SkeletonMessageContainer } from '@/components/loading';
import { EmptyMessages, NetworkOffline } from '@/components/fallback';
import { useMessageHistory } from '@/lib/hooks/useMessageHistory';
import { 
  ArrowDown, 
  Loader2, 
  MessageSquare,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Search,
  Navigation,
  Filter,
  ArrowUp,
  Hash,
  Clock
} from 'lucide-react';

import { JumpToMessage } from './JumpToMessage';
import { MessageSearch } from './MessageSearch';
import { MessageGroup } from './MessageGroup';

interface MessageContainerProps {
  conversationId: string;
  currentUserId: string;
  participantMap: any;
  initialMessages: any[];
  currentPhase: DebatePhase;
  onMessageSent?: (message: any) => void;
  onMessageReceived?: (message: any) => void;
  onReactionAdded?: (messageId: string, emoji: string, userId: string) => void;
  onReply?: any;
}

export interface EnhancedMessageContainerProps extends Omit<MessageContainerProps, 'initialMessages'> {
  // Enhanced functionality
  enableSearch?: boolean;
  enableJumpToMessage?: boolean;
  enableInfiniteScroll?: boolean;
  pageSize?: number;
  autoScrollEnabled?: boolean;
  showTimestamps?: boolean;
  showAvatars?: boolean;
  searchDebounceMs?: number;
  highlightMessageId?: string;
  className?: string;
}

interface VirtualScrollState {
  scrollTop: number;
  containerHeight: number;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
}

const MESSAGE_HEIGHT = 80;
const BUFFER_SIZE = 10;
const SCROLL_THRESHOLD = 100;
const LOAD_MORE_THRESHOLD = 200; // Distance from top to trigger load more

// Loading indicator for infinite scroll
function InfiniteScrollLoader({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;
  
  return (
    <div className="flex items-center justify-center py-4">
      <Card className="px-4 py-2">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading more messages...</span>
        </div>
      </Card>
    </div>
  );
}

// Message highlight overlay
function MessageHighlight({ messageId, isVisible }: { messageId: string; isVisible: boolean }) {
  if (!isVisible) return null;
  
  return (
    <div 
      className="absolute inset-0 bg-yellow-200/20 border-2 border-yellow-400 rounded-lg animate-pulse pointer-events-none"
      style={{ animationDuration: '2s', animationIterationCount: '3' }}
    />
  );
}

export function EnhancedMessageContainer({
  conversationId,
  currentUserId,
  participantMap,
  currentPhase = 'DISCUSSION',
  autoScrollEnabled = true,
  showTimestamps = true,
  showAvatars = true,
  enableSearch = true,
  enableJumpToMessage = true,
  enableInfiniteScroll = true,
  pageSize = 50,
  searchDebounceMs = 300,
  highlightMessageId,
  className,
  onMessageSent,
  onMessageReceived,
  onReactionAdded,
  onReply
}: EnhancedMessageContainerProps) {
  // Message history hook
  const messageHistory = useMessageHistory({
    conversationId,
    userId: currentUserId,
    pageSize,
    searchDebounceMs
  });
  
  // UI state
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isNearTop, setIsNearTop] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'search' | 'navigation'>('search');
  
  // Virtual scrolling state
  const [virtualState, setVirtualState] = useState<VirtualScrollState>({
    scrollTop: 0,
    containerHeight: 600,
    totalHeight: 0,
    startIndex: 0,
    endIndex: 0
  });
  
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Extract data from message history hook
  const { 
    messages, 
    isLoading, 
    hasMore,
    error,
    searchQuery,
    searchResults,
    isSearching,
    searchMessage,
    clearSearch,
    jumpToMessage,
    jumpToTimestamp,
    currentMessageIndex,
    loadMore
  } = messageHistory;
  
  // Calculate visible message indices for virtual scrolling
  const { startIndex, endIndex } = useMemo(() => {
    const containerHeight = virtualState.containerHeight;
    const scrollTop = virtualState.scrollTop;
    
    const startIdx = Math.max(0, Math.floor(scrollTop / MESSAGE_HEIGHT) - BUFFER_SIZE);
    const visibleCount = Math.ceil(containerHeight / MESSAGE_HEIGHT);
    const endIdx = Math.min(messages.length, startIdx + visibleCount + (BUFFER_SIZE * 2));
    
    return { startIndex: startIdx, endIndex: endIdx };
  }, [virtualState.scrollTop, virtualState.containerHeight, messages.length]);
  
  const visibleMessages = messages.slice(startIndex, endIndex);
  
  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    
    // Update virtual scroll state
    setVirtualState(prev => ({
      ...prev,
      scrollTop,
      containerHeight: clientHeight,
      totalHeight: scrollHeight
    }));
    
    // Check scroll position
    const nearBottom = scrollBottom < SCROLL_THRESHOLD;
    const nearTop = scrollTop < SCROLL_THRESHOLD;
    
    setIsNearBottom(nearBottom);
    setIsNearTop(nearTop);
    setShowScrollToBottom(!nearBottom && messages.length > 10);
    setShowScrollToTop(!nearTop && scrollTop > 500);
    
    // Infinite scroll - load more when approaching top
    if (enableInfiniteScroll && nearTop && hasMore && !isLoading) {
      loadMore();
    }
    
    // Update user scrolling state
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 150);
  }, [messages.length, hasMore, isLoading, loadMore, enableInfiniteScroll]);
  
  // Auto-scroll to bottom for new messages
  const scrollToBottom = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant'
    });
  }, []);
  
  // Scroll to top
  const scrollToTop = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;
    
    container.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'instant'
    });
  }, []);
  
  // Auto-scroll logic for new messages
  useEffect(() => {
    if (!autoScrollEnabled || isUserScrolling) return;
    
    const hasNewMessage = messages.length > 0;
    const shouldAutoScroll = isNearBottom && hasNewMessage;
    
    if (shouldAutoScroll) {
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages.length, autoScrollEnabled, isUserScrolling, isNearBottom, scrollToBottom]);
  
  // Scroll to highlighted message
  useEffect(() => {
    if (highlightMessageId && currentMessageIndex !== undefined) {
      const container = containerRef.current;
      if (!container) return;
      
      const messageElement = container.querySelector(`[data-message-id="${highlightMessageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [highlightMessageId, currentMessageIndex]);
  
  // Handle message actions
  const handleReply = useCallback((messageId: string, content?: string) => {
    onReply?.(messageId, content);
  }, [onReply]);
  
  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    try {
      // Integration with message history hook would happen here
      console.log('React to message:', messageId, emoji);
      onReactionAdded?.(messageId, emoji, currentUserId);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, [currentUserId, onReactionAdded]);
  
  const handleFlag = useCallback(async (messageId: string, reason?: string) => {
    try {
      // Integration with message history hook would happen here
      console.log('Flag message:', messageId, reason);
    } catch (error) {
      console.error('Failed to flag message:', error);
    }
  }, []);
  
  const handleRetry = useCallback(async (messageId: string) => {
    try {
      // Integration with message history hook would happen here
      console.log('Retry message:', messageId);
    } catch (error) {
      console.error('Failed to retry message:', error);
    }
  }, []);
  
  // Handle message jump
  const handleJumpToMessage = useCallback(async (messageId: string) => {
    const success = await jumpToMessage(messageId);
    if (success) {
      // Add temporary highlight
      setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const messageElement = container.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
    }
    return success;
  }, [jumpToMessage]);
  
  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
  
  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-6 max-w-md w-full text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Messages</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </Card>
      </div>
    );
  }
  
  // Loading state
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1">
        <SkeletonMessageContainer />
      </div>
    );
  }
  
  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <EmptyMessages />
      </div>
    );
  }
  
  return (
    <ErrorBoundary
      fallback={MessageErrorFallback}
      context="message"
      level="component"
    >
      <div className={cn("flex h-full", className)}>
        
        {/* Main Message Area */}
        <div className="flex-1 flex flex-col relative">
          
          {/* Infinite scroll loader at top */}
          {enableInfiniteScroll && isNearTop && (
            <InfiniteScrollLoader isLoading={isLoading && hasMore} />
          )}
          
          {/* Message Container */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-y-auto scroll-smooth px-4 py-2"
            style={{ height: '100%' }}
          >
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
              highlightMessageId={highlightMessageId}
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
          
          {/* Scroll controls */}
          {showScrollToTop && (
            <div className="absolute top-4 right-4">
              <Button
                onClick={() => scrollToTop()}
                size="sm"
                className="rounded-full shadow-lg"
                title="Scroll to top"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {showScrollToBottom && (
            <div className="absolute bottom-4 right-4">
              <Button
                onClick={() => scrollToBottom()}
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
        </div>
        
        {/* Sidebar with Search and Navigation */}
        {(enableSearch || enableJumpToMessage) && (
          <div className="w-80 border-l bg-muted/30">
            <div className="h-full flex flex-col">
              
              <Tabs value={sidebarTab} onValueChange={(value) => setSidebarTab(value as any)} className="flex-1">
                <div className="border-b p-3">
                  <TabsList className="grid w-full grid-cols-2">
                    {enableSearch && (
                      <TabsTrigger value="search" className="text-xs">
                        <Search className="h-3 w-3 mr-1" />
                        Search
                      </TabsTrigger>
                    )}
                    {enableJumpToMessage && (
                      <TabsTrigger value="navigation" className="text-xs">
                        <Navigation className="h-3 w-3 mr-1" />
                        Navigate
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  {enableSearch && (
                    <TabsContent value="search" className="h-full p-4 mt-0">
                      <MessageSearch
                        searchQuery={searchQuery}
                        searchResults={searchResults}
                        isSearching={isSearching}
                        onSearch={searchMessage}
                        onClear={clearSearch}
                        onJumpToMessage={handleJumpToMessage}
                        participantMap={participantMap}
                      />
                    </TabsContent>
                  )}
                  
                  {enableJumpToMessage && (
                    <TabsContent value="navigation" className="h-full p-4 mt-0">
                      <JumpToMessage
                        messages={messages}
                        currentMessageIndex={currentMessageIndex}
                        onJumpToMessage={handleJumpToMessage}
                        onJumpToTimestamp={jumpToTimestamp}
                        participantMap={participantMap}
                      />
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default EnhancedMessageContainer;
