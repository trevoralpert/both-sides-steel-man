/**
 * Phase 6 Task 6.1.6: Fallback Components Export
 * 
 * Centralized exports for fallback UI components
 */

// Main fallback component
export { FallbackUI } from './FallbackUI';

// Empty state components
export {
  EmptyMessages,
  EmptyParticipants,
  EmptySearchResults,
  EmptyProfile,
  NoPreparationMaterials
} from './FallbackUI';

// Network and connectivity
export {
  NetworkOffline,
  ServerMaintenance
} from './FallbackUI';

// Access and permission states
export {
  AccessDenied,
  DebateNotFound
} from './FallbackUI';

// Feature states
export {
  DebateEnded,
  ComingSoon
} from './FallbackUI';

// Inline fallbacks
export {
  InlineFallback,
  AlertFallback
} from './FallbackUI';

export type { FallbackUIProps } from './FallbackUI';
