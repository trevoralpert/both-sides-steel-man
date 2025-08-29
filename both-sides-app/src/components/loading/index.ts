/**
 * Phase 6 Task 6.1.6: Loading Components Export
 * 
 * Centralized exports for loading states and skeleton components
 */

// Main loading components
export { 
  LoadingState,
  SpinnerLoading,
  PulseLoading,
  DotsLoading,
  BarsLoading,
  ProgressLoading,
  InlineLoading,
  LoadingOverlay
} from './LoadingState';

// Specialized loading components
export {
  DebateRoomLoading,
  MessageLoading,
  ProfileLoading,
  AuthLoading
} from './LoadingState';

export type { LoadingStateProps } from './LoadingState';

// Skeleton components
export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonMessage,
  SkeletonSystemMessage,
  SkeletonDebateHeader,
  SkeletonParticipantList,
  SkeletonTopicDisplay,
  SkeletonMessageContainer,
  SkeletonBreadcrumb,
  SkeletonDebateRoom,
  SkeletonProfile
} from './SkeletonLoader';

export type { SkeletonProps } from './SkeletonLoader';
