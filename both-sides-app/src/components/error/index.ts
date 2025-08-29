/**
 * Phase 6 Task 6.1.6: Error Components Export
 * 
 * Centralized exports for error handling components
 */

export { 
  ErrorBoundary, 
  DefaultErrorFallback, 
  DebateErrorFallback, 
  MessageErrorFallback,
  withErrorBoundary 
} from './ErrorBoundary';

export type { 
  ErrorBoundaryProps, 
  ErrorBoundaryState, 
  ErrorFallbackProps 
} from './ErrorBoundary';

// Re-export commonly used types
export type { ErrorInfo } from 'react';
