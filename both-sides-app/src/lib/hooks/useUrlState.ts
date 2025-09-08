/**
 * Phase 6 Task 6.1.5: useUrlState Hook
 * 
 * URL state management for debate phases, filters, and deep linking
 * Syncs component state with URL parameters for shareable links
 */

import { useCallback, useMemo } from 'react';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DebatePhase } from '@/types/debate';

export interface UrlStateOptions {
  replace?: boolean; // Use router.replace instead of router.push
  shallow?: boolean; // Don't trigger re-render (Next.js App Router doesn't support this but kept for API consistency)
  scroll?: boolean;  // Scroll to top after navigation
}

export interface DebateUrlState {
  phase?: DebatePhase;
  tab?: string;
  filter?: string;
  sort?: string;
  page?: number;
  timestamp?: number;
  messageId?: string;
  sidebarOpen?: boolean;
}

/**
 * Custom hook for managing URL state
 */
export function useUrlState<T extends Record<string, any>>(
  defaultState: Partial<T> = {},
  options: UrlStateOptions = {}
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Parse current URL state
  const currentState = useMemo(() => {
    const state: Partial<T> = { ...defaultState };
    
    for (const [key, value] of searchParams.entries()) {
      // Type conversion based on default values or common patterns
      if (typeof defaultState[key as keyof T] === 'number') {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          (state as any)[key] = numValue;
        }
      } else if (typeof defaultState[key as keyof T] === 'boolean') {
        (state as any)[key] = value === 'true';
      } else if (key === 'timestamp') {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          (state as any)[key] = numValue;
        }
      } else {
        (state as any)[key] = value;
      }
    }
    
    return state as T;
  }, [searchParams, defaultState]);

  // Update URL state
  const updateState = useCallback((
    newState: Partial<T> | ((current: T) => Partial<T>),
    updateOptions: UrlStateOptions = {}
  ) => {
    const finalOptions = { ...options, ...updateOptions };
    
    const stateUpdate = typeof newState === 'function' 
      ? newState(currentState as T)
      : newState;
    
    const updatedState = { ...currentState, ...stateUpdate };
    
    // Build new URL search params
    const newSearchParams = new URLSearchParams();
    
    Object.entries(updatedState).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Skip default values to keep URLs clean
        if (defaultState[key as keyof T] !== undefined && 
            defaultState[key as keyof T] === value) {
          return;
        }
        
        newSearchParams.set(key, String(value));
      }
    });
    
    const newUrl = pathname + (newSearchParams.toString() ? `?${newSearchParams.toString()}` : '');
    
    if (finalOptions.replace) {
      router.replace(newUrl, { scroll: finalOptions.scroll });
    } else {
      router.push(newUrl, { scroll: finalOptions.scroll });
    }
  }, [currentState, pathname, router, options, defaultState]);

  // Clear specific keys from URL state
  const clearState = useCallback((keys?: (keyof T)[]) => {
    if (!keys) {
      // Clear all - go to base pathname
      router.push(pathname, { scroll: options.scroll });
      return;
    }
    
    const clearedState = { ...currentState };
    keys.forEach(key => {
      delete clearedState[key];
    });
    
    updateState(clearedState, { replace: true });
  }, [currentState, pathname, router, updateState, options.scroll]);

  // Reset to default state
  const resetState = useCallback(() => {
    updateState(defaultState, { replace: true });
  }, [defaultState, updateState]);

  return {
    state: currentState,
    updateState,
    clearState,
    resetState,
    hasState: Object.keys(currentState).some(key => 
      currentState[key as keyof T] !== defaultState[key as keyof T]
    )
  };
}

/**
 * Specialized hook for debate room URL state
 */
export function useDebateUrlState(conversationId: string) {
  const defaultState: DebateUrlState = {
    tab: 'topic',
    sidebarOpen: true
  };

  const { state, updateState, clearState, resetState, hasState } = useUrlState(
    defaultState,
    { replace: true } // Use replace for debate state changes to avoid cluttering history
  );

  // Specialized methods for debate functionality
  const setPhase = useCallback((phase: DebatePhase | undefined) => {
    updateState({ phase });
  }, [updateState]);

  const setTab = useCallback((tab: string) => {
    updateState({ tab });
  }, [updateState]);

  const setMessageHighlight = useCallback((messageId: string | undefined, timestamp?: number) => {
    updateState({ 
      messageId, 
      timestamp: messageId && timestamp ? timestamp : undefined 
    });
  }, [updateState]);

  const setSidebarOpen = useCallback((sidebarOpen: boolean) => {
    updateState({ sidebarOpen });
  }, [updateState]);

  const navigateToMessage = useCallback((messageId: string) => {
    updateState({ 
      messageId, 
      timestamp: Date.now()
    });
  }, [updateState]);

  // Generate shareable link
  const getShareableLink = useCallback((includeMessage = false) => {
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${window.location.pathname}`
      : '';
    
    if (!includeMessage) {
      return baseUrl;
    }
    
    const params = new URLSearchParams();
    if (state.phase) params.set('phase', state.phase);
    if (state.messageId) params.set('messageId', state.messageId);
    if (state.timestamp) params.set('timestamp', state.timestamp.toString());
    
    return baseUrl + (params.toString() ? `?${params.toString()}` : '');
  }, [state]);

  return {
    // Current state
    phase: state.phase,
    tab: state.tab || 'topic',
    messageId: state.messageId,
    timestamp: state.timestamp,
    sidebarOpen: state.sidebarOpen ?? true,
    
    // State management
    setPhase,
    setTab,
    setMessageHighlight,
    setSidebarOpen,
    navigateToMessage,
    
    // Utility
    clearState,
    resetState,
    hasState,
    getShareableLink,
    
    // Raw access
    rawState: state,
    updateRawState: updateState
  };
}

/**
 * Hook for managing pagination state in URL
 */
export function usePaginationState(defaultPage = 1, defaultPageSize = 20) {
  const { state, updateState } = useUrlState({
    page: defaultPage,
    pageSize: defaultPageSize
  });

  const setPage = useCallback((page: number) => {
    updateState({ page });
  }, [updateState]);

  const setPageSize = useCallback((pageSize: number) => {
    updateState({ page: 1, pageSize }); // Reset to page 1 when changing page size
  }, [updateState]);

  const nextPage = useCallback(() => {
    setPage((state.page || defaultPage) + 1);
  }, [state.page, defaultPage, setPage]);

  const prevPage = useCallback(() => {
    const currentPage = state.page || defaultPage;
    if (currentPage > 1) {
      setPage(currentPage - 1);
    }
  }, [state.page, defaultPage, setPage]);

  return {
    page: state.page || defaultPage,
    pageSize: state.pageSize || defaultPageSize,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    offset: ((state.page || defaultPage) - 1) * (state.pageSize || defaultPageSize)
  };
}

/**
 * Hook for managing filter and sort state in URL
 */
export function useFilterState<T extends Record<string, any>>(
  defaultFilters: T = {} as T,
  defaultSort?: { field: string; direction: 'asc' | 'desc' }
) {
  const { state, updateState, clearState } = useUrlState({
    ...defaultFilters,
    sortField: defaultSort?.field,
    sortDirection: defaultSort?.direction
  });

  const updateFilter = useCallback((key: keyof T, value: T[keyof T]) => {
    updateState({ [key]: value, page: 1 }); // Reset pagination when filtering
  }, [updateState]);

  const updateFilters = useCallback((filters: Partial<T>) => {
    updateState({ ...filters, page: 1 });
  }, [updateState]);

  const clearFilters = useCallback(() => {
    const keys = Object.keys(defaultFilters) as string[];
    clearState([...keys, 'page']);
  }, [clearState, defaultFilters]);

  const setSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    updateState({ sortField: field, sortDirection: direction });
  }, [updateState]);

  const toggleSort = useCallback((field: string) => {
    const currentDirection = state.sortDirection as 'asc' | 'desc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    setSort(field, newDirection);
  }, [state.sortDirection, setSort]);

  return {
    filters: Object.fromEntries(
      Object.entries(state).filter(([key]) => 
        key !== 'sortField' && key !== 'sortDirection'
      )
    ) as T,
    sort: state.sortField ? {
      field: state.sortField as string,
      direction: (state.sortDirection || 'asc') as 'asc' | 'desc'
    } : undefined,
    updateFilter,
    updateFilters,
    clearFilters,
    setSort,
    toggleSort
  };
}

export default useUrlState;
