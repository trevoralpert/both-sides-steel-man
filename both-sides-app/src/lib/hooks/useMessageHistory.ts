'use client';

/**
 * Phase 6 Task 6.2.5: Message History & Pagination Hook
 * 
 * Enhanced hook for message history management with infinite scroll,
 * search functionality, and navigation to specific messages.
 * Builds on the existing useRealtimeMessages hook.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { Message, DebatePhase } from '@/types/debate';

import { useRealtimeMessages } from './useRealtimeMessages';

export interface MessageHistoryConfig {
  conversationId: string;
  userId: string;
  initialMessages?: Message[];
  pageSize?: number;
  searchDebounceMs?: number;
  preloadBuffer?: number;
}

export interface MessageHistoryState {
  // Core message management
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  error?: string;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  loadMore: () => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  
  // Search functionality
  searchQuery: string;
  searchResults: Message[];
  isSearching: boolean;
  searchMessage: (query: string) => void;
  clearSearch: () => void;
  
  // Navigation
  jumpToMessage: (messageId: string) => Promise<boolean>;
  jumpToTimestamp: (timestamp: Date) => Promise<boolean>;
  currentMessageIndex?: number;
  
  // Performance metrics
  messageCount: number;
  loadedMessageCount: number;
  
  // Real-time integration
  connection: ReturnType<typeof useRealtimeMessages>['connection'];
  sendMessage: ReturnType<typeof useRealtimeMessages>['sendMessage'];
  replyToMessage: ReturnType<typeof useRealtimeMessages>['replyToMessage'];
}

interface SearchIndex {
  messageId: string;
  content: string;
  authorId: string;
  timestamp: Date;
  searchableText: string; // Processed content for search
}

export function useMessageHistory({
  conversationId,
  userId,
  initialMessages = [],
  pageSize = 50,
  searchDebounceMs = 300,
  preloadBuffer = 10
}: MessageHistoryConfig): MessageHistoryState {
  
  // Base real-time messages hook
  const realtimeMessages = useRealtimeMessages({
    conversationId,
    userId,
    initialMessages
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadedPages, setLoadedPages] = useState(new Set<number>([0]));
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIndex, setSearchIndex] = useState<SearchIndex[]>([]);
  
  // Navigation state
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>();
  const [jumpTargetId, setJumpTargetId] = useState<string>();
  
  // Refs for debouncing and cleanup
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef(false);
  
  // Create search index from messages
  const buildSearchIndex = useCallback((messages: Message[]): SearchIndex[] => {
    return messages.map(message => ({
      messageId: message.id,
      content: message.content,
      authorId: message.authorId,
      timestamp: message.timestamp,
      searchableText: message.content.toLowerCase().trim()
    }));
  }, []);
  
  // Update search index when messages change
  useEffect(() => {
    const index = buildSearchIndex(realtimeMessages.messages);
    setSearchIndex(index);
    
    // Update total pages based on message count
    const calculatedPages = Math.ceil(realtimeMessages.messageCount / pageSize);
    setTotalPages(calculatedPages);
  }, [realtimeMessages.messages, realtimeMessages.messageCount, pageSize, buildSearchIndex]);
  
  // Search functionality with debouncing
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    const lowerQuery = query.toLowerCase().trim();
    
    // Perform search on index
    const matchingMessageIds = searchIndex
      .filter(item => 
        item.searchableText.includes(lowerQuery) ||
        item.content.toLowerCase().includes(lowerQuery)
      )
      .map(item => item.messageId);
    
    // Get full messages for results
    const results = realtimeMessages.messages.filter(message => 
      matchingMessageIds.includes(message.id)
    );
    
    setSearchResults(results);
    setIsSearching(false);
  }, [searchIndex, realtimeMessages.messages]);
  
  const searchMessage = useCallback((query: string) => {
    setSearchQuery(query);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, searchDebounceMs);
  }, [performSearch, searchDebounceMs]);
  
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);
  
  // Load more messages (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !realtimeMessages.hasMoreMessages) {
      return;
    }
    
    loadingRef.current = true;
    
    try {
      await realtimeMessages.loadMoreMessages();
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      setLoadedPages(prev => new Set([...prev, nextPage]));
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [realtimeMessages, currentPage]);
  
  // Load specific page
  const loadPage = useCallback(async (page: number) => {
    if (loadingRef.current || loadedPages.has(page)) {
      setCurrentPage(page);
      return;
    }
    
    loadingRef.current = true;
    
    try {
      // Calculate how many more messages we need to load
      const targetMessageCount = (page + 1) * pageSize;
      const currentMessageCount = realtimeMessages.messages.length;
      
      if (targetMessageCount > currentMessageCount) {
        // Load messages until we have enough for the target page
        let remainingToLoad = targetMessageCount - currentMessageCount;
        
        while (remainingToLoad > 0 && realtimeMessages.hasMoreMessages) {
          await realtimeMessages.loadMoreMessages();
          remainingToLoad -= pageSize;
        }
      }
      
      setCurrentPage(page);
      setLoadedPages(prev => new Set([...prev, page]));
    } catch (error) {
      console.error('Failed to load page:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [realtimeMessages, pageSize, loadedPages]);
  
  // Jump to specific message
  const jumpToMessage = useCallback(async (messageId: string): Promise<boolean> => {
    // First check if message is already loaded
    const messageIndex = realtimeMessages.messages.findIndex(m => m.id === messageId);
    
    if (messageIndex !== -1) {
      setCurrentMessageIndex(messageIndex);
      setJumpTargetId(messageId);
      return true;
    }
    
    // If message not found, we may need to load more history
    // This would require API integration to search for the message in history
    // For now, return false indicating message not found
    console.warn(`Message ${messageId} not found in loaded messages`);
    return false;
  }, [realtimeMessages.messages]);
  
  // Jump to specific timestamp
  const jumpToTimestamp = useCallback(async (timestamp: Date): Promise<boolean> => {
    // Find the closest message to the timestamp
    const targetTime = timestamp.getTime();
    
    let closestMessage: Message | null = null;
    let closestTimeDiff = Infinity;
    let closestIndex = -1;
    
    realtimeMessages.messages.forEach((message, index) => {
      const timeDiff = Math.abs(message.timestamp.getTime() - targetTime);
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestMessage = message;
        closestIndex = index;
      }
    });
    
    if (closestMessage) {
      setCurrentMessageIndex(closestIndex);
      setJumpTargetId(closestMessage.id);
      return true;
    }
    
    return false;
  }, [realtimeMessages.messages]);
  
  // Get messages for current page (for pagination view)
  const currentPageMessages = useMemo(() => {
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return realtimeMessages.messages.slice(startIndex, endIndex);
  }, [realtimeMessages.messages, currentPage, pageSize]);
  
  // Preload next page when approaching end
  useEffect(() => {
    const shouldPreload = 
      realtimeMessages.messages.length > 0 &&
      realtimeMessages.hasMoreMessages &&
      realtimeMessages.messages.length <= (currentPage + 1) * pageSize + preloadBuffer;
      
    if (shouldPreload && !loadingRef.current) {
      loadMore();
    }
  }, [realtimeMessages.messages.length, realtimeMessages.hasMoreMessages, currentPage, pageSize, preloadBuffer, loadMore]);
  
  // Clear jump target after a delay
  useEffect(() => {
    if (jumpTargetId) {
      const timeout = setTimeout(() => {
        setJumpTargetId(undefined);
      }, 2000); // Highlight for 2 seconds
      
      return () => clearTimeout(timeout);
    }
  }, [jumpTargetId]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    // Core message management
    messages: realtimeMessages.messages,
    isLoading: realtimeMessages.isLoading,
    hasMore: realtimeMessages.hasMoreMessages,
    error: realtimeMessages.error,
    
    // Pagination
    currentPage,
    totalPages,
    loadMore,
    loadPage,
    
    // Search functionality
    searchQuery,
    searchResults,
    isSearching,
    searchMessage,
    clearSearch,
    
    // Navigation
    jumpToMessage,
    jumpToTimestamp,
    currentMessageIndex,
    
    // Performance metrics
    messageCount: realtimeMessages.messageCount,
    loadedMessageCount: realtimeMessages.messages.length,
    
    // Real-time integration
    connection: realtimeMessages.connection,
    sendMessage: realtimeMessages.sendMessage,
    replyToMessage: realtimeMessages.replyToMessage
  };
}

export default useMessageHistory;
