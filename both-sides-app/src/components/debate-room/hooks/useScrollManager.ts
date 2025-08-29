/**
 * Phase 6 Task 6.1.4: useScrollManager Hook
 * 
 * Custom hook for managing scroll behavior, auto-scroll, and scroll position
 * in message containers with advanced features
 */

import { useRef, useCallback, useEffect, useState } from 'react';

export interface ScrollManagerOptions {
  autoScrollEnabled?: boolean;
  scrollThreshold?: number; // Distance from bottom to trigger auto-scroll
  scrollDebounceMs?: number; // Debounce time for scroll events
  loadMoreThreshold?: number; // Distance from top to trigger load more
}

export interface ScrollManagerState {
  isAtBottom: boolean;
  isAtTop: boolean;
  showScrollToBottom: boolean;
  isUserScrolling: boolean;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface ScrollManagerActions {
  scrollToBottom: (force?: boolean) => void;
  scrollToTop: (force?: boolean) => void;
  scrollToPosition: (position: number, smooth?: boolean) => void;
  handleScroll: () => void;
  saveScrollPosition: () => void;
  restoreScrollPosition: () => void;
}

export function useScrollManager(
  containerRef: React.RefObject<HTMLElement>,
  options: ScrollManagerOptions = {}
): ScrollManagerState & ScrollManagerActions {
  const {
    autoScrollEnabled = true,
    scrollThreshold = 100,
    scrollDebounceMs = 150,
    loadMoreThreshold = 50
  } = options;

  const [state, setState] = useState<ScrollManagerState>({
    isAtBottom: true,
    isAtTop: true,
    showScrollToBottom: false,
    isUserScrolling: false,
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0
  });

  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const savedScrollPositionRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);

  // Scroll to bottom
  const scrollToBottom = useCallback((force = false) => {
    const container = containerRef.current;
    if (!container) return;

    const shouldScroll = force || (autoScrollEnabled && state.isAtBottom && !state.isUserScrolling);
    
    if (shouldScroll) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: force ? 'auto' : 'smooth'
      });
      
      setState(prev => ({ ...prev, showScrollToBottom: false }));
    }
  }, [autoScrollEnabled, state.isAtBottom, state.isUserScrolling, containerRef]);

  // Scroll to top
  const scrollToTop = useCallback((force = false) => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: 0,
      behavior: force ? 'auto' : 'smooth'
    });
  }, [containerRef]);

  // Scroll to specific position
  const scrollToPosition = useCallback((position: number, smooth = true) => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: position,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, [containerRef]);

  // Save current scroll position
  const saveScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    savedScrollPositionRef.current = container.scrollTop;
  }, [containerRef]);

  // Restore saved scroll position
  const restoreScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: savedScrollPositionRef.current,
      behavior: 'auto'
    });
  }, [containerRef]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const distanceFromTop = scrollTop;

    // Calculate scroll state
    const isAtBottom = distanceFromBottom <= scrollThreshold;
    const isAtTop = distanceFromTop <= loadMoreThreshold;
    const showScrollToBottom = !isAtBottom && scrollHeight > clientHeight;

    // Detect scroll direction
    const scrollDirection = scrollTop > lastScrollTopRef.current ? 'down' : 'up';
    lastScrollTopRef.current = scrollTop;

    // Update state
    setState(prev => ({
      ...prev,
      isAtBottom,
      isAtTop,
      showScrollToBottom,
      scrollTop,
      scrollHeight,
      clientHeight,
      isUserScrolling: true
    }));

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set user scrolling to false after debounce period
    scrollTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, isUserScrolling: false }));
    }, scrollDebounceMs);

  }, [scrollThreshold, loadMoreThreshold, scrollDebounceMs, containerRef]);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initial state
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, containerRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    isAtBottom: state.isAtBottom,
    isAtTop: state.isAtTop,
    showScrollToBottom: state.showScrollToBottom,
    isUserScrolling: state.isUserScrolling,
    scrollTop: state.scrollTop,
    scrollHeight: state.scrollHeight,
    clientHeight: state.clientHeight,

    // Actions
    scrollToBottom,
    scrollToTop,
    scrollToPosition,
    handleScroll,
    saveScrollPosition,
    restoreScrollPosition
  };
}

export default useScrollManager;
