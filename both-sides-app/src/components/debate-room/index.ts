/**
 * Phase 6 Task 6.1.1 & 6.3.1: Debate Room Components Index
 * 
 * Exports all debate room components for easy importing
 */

export { DebateRoomLayout, DebateRoomContainer } from './DebateRoomLayout';
export { DebateHeader } from './DebateHeader';

// Phase Management Components (Task 6.3.1)
export { PhaseTimer } from './PhaseTimer';
export { PhaseIndicator, PhaseStatus } from './PhaseIndicator';
export { PhaseTimeline } from './PhaseTimeline';
export { TransitionNotification, useTransitionNotifications } from './TransitionNotification';
export { PhaseManagementDemo } from './PhaseManagementDemo';

// Turn Management Components (Task 6.3.2)
export { TurnManager } from './TurnManager';
export { TurnTimer } from './TurnTimer';
export { TurnNotifications, useTurnNotifications } from './TurnNotifications';
export { TurnManagementDemo } from './TurnManagementDemo';
export { DebateFooter } from './DebateFooter';
export { ResponsiveLayout } from './ResponsiveLayout';

// Task 6.1.2: Participant Status Components
export { ParticipantAvatar } from './ParticipantAvatar';
export { PresenceIndicator, TypingIndicator } from './PresenceIndicator';
export { PositionBadge, PositionSelector, PositionComparison } from './PositionBadge';
export { ParticipantList, ParticipantOverview } from './ParticipantList';

// Task 6.1.3: Topic & Context Display Components
export { TopicDisplay } from './TopicDisplay';
export { TopicHeader } from './TopicHeader';
export { ContextPanel } from './ContextPanel';
export { PreparationAccess } from './PreparationAccess';

// Task 6.1.4: Message Container Components
export { MessageContainer } from './MessageContainer';
export { MessageBubble } from './MessageBubble';
export { MessageGroup } from './MessageGroup';
export { SystemMessage, SystemMessageTemplates, createSystemMessage } from './SystemMessage';
export { default as useScrollManager } from './hooks/useScrollManager';

// Re-export error handling and loading components for convenience
export { ErrorBoundary, DebateErrorFallback, MessageErrorFallback } from '@/components/error';
export { LoadingState, SkeletonMessageContainer, SkeletonDebateRoom } from '@/components/loading';
export { EmptyMessages, EmptyParticipants, DebateNotFound } from '@/components/fallback';

// Re-export types for convenience
export type {
  DebateRoomLayoutProps,
  DebateHeaderProps, 
  DebateFooterProps,
  ResponsiveLayoutProps,
  DebatePhase,
  DebatePosition,
  ParticipantInfo,
  DebateTopic,
  Message,
  ConnectionState
} from '@/types/debate';
