/**
 * Phase 6 Task 6.1.1: Debate Room Types
 * TypeScript interfaces for debate room components and data structures
 */

export type DebatePhase = 
  | 'PREPARATION'
  | 'OPENING'
  | 'DISCUSSION' 
  | 'REBUTTAL'
  | 'CLOSING'
  | 'REFLECTION'
  | 'COMPLETED';

export type DebatePosition = 'PRO' | 'CON';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface ParticipantInfo {
  id: string;
  name: string;
  avatar?: string;
  position: DebatePosition;
  isOnline: boolean;
  isTyping: boolean;
  lastSeen?: Date;
}

export interface DebateTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  backgroundInfo?: string;
  tags?: string[];
  estimatedDuration?: number; // minutes
  sources?: string[];
}

export interface PreparationMaterials {
  matchId: string;
  userId: string;
  position: DebatePosition;
  positionOverview: string;
  keyArguments: string[];
  evidenceSources: {
    title: string;
    url: string;
    credibilityScore: number;
    summary: string;
  }[];
  counterArgumentPrep: {
    anticipatedArguments: string[];
    rebuttals: string[];
  };
  preparationTips: string[];
  timelineGuidance: {
    phase: string;
    duration: number;
    tasks: string[];
  }[];
  practiceQuestions: string[];
  additionalResources: string[];
}

export interface Message {
  id: string;
  content: string;
  authorId: string;
  timestamp: Date;
  type: 'USER' | 'SYSTEM' | 'AI_COACHING';
  phase: DebatePhase;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyToMessageId?: string;
  replyToContent?: string; // For reply quoting
  isEdited?: boolean;
  editedAt?: Date;
  reactions?: MessageReaction[];
  isFlagged?: boolean;
  isOptimistic?: boolean; // For optimistic UI updates
  analysis?: MessageAnalysis;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface MessageAction {
  type: 'reply' | 'react' | 'flag' | 'edit' | 'delete';
  messageId: string;
  data?: any;
}



export interface MessageAnalysis {
  messageId: string;
  analysisResults: {
    toxicity: {
      score: number;
      categories: string[];
      confidence: number;
    };
    quality: {
      argumentStrength: number;
      evidenceBased: boolean;
      respectfulness: number;
      constructiveness: number;
    };
    educational: {
      criticalThinking: number;
      evidenceUsage: number;
      logicalStructure: number;
    };
    metadata: {
      wordCount: number;
      readabilityScore: number;
      sentiment: number;
    };
  };
  actionRecommended: 'approve' | 'review' | 'block' | 'coach';
  processingTime: number;
}

export interface DebateSession {
  id: string;
  conversationId: string;
  currentPhase: DebatePhase;
  timeRemaining: number; // milliseconds
  totalPhaseTime: number;
  participants: ParticipantInfo[];
  topic: DebateTopic;
  rules: DebateRules;
  isActive: boolean;
}

export interface DebateRules {
  phase: DebatePhase;
  description: string;
  guidelines: string[];
  tips: string[];
  timeLimit?: number;
  messageRequirements?: {
    minLength?: number;
    maxLength?: number;
    requiredCount?: number;
  };
}

export interface DebateState {
  session?: DebateSession;
  messages: Message[];
  connectionState: ConnectionState;
  isLoading: boolean;
  error?: string;
  currentUserId: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ConversationResponse {
  id: string;
  match_id: string;
  participant_ids: string[];
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  created_at: string;
  topic: DebateTopic;
  participants: ParticipantInfo[];
  current_phase: DebatePhase;
}

// Component Props Interfaces
export interface DebateRoomLayoutProps {
  conversationId: string;
  matchId: string;
  userId: string;
  currentPhase: DebatePhase;
  participants: ParticipantInfo[];
  topic?: DebateTopic;
  preparationMaterials?: PreparationMaterials;
  className?: string;
}

export interface DebateHeaderProps {
  topic: DebateTopic;
  participants: ParticipantInfo[];
  currentPhase: DebatePhase;
  timeRemaining?: number;
  connection?: {
    isConnected: boolean;
    connectionState: string;
    latency?: number;
    reconnect: () => void;
  };
  className?: string;
}

export interface DebateFooterProps {
  onSendMessage: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  connectionState: ConnectionState;
  className?: string;
  
  // Enhanced features for 6.2.3
  replyToMessage?: {
    id: string;
    content: string;
    authorName: string;
  };
  onCancelReply?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  enableAdvancedFeatures?: boolean;
}

export interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarVisible?: boolean;
  onToggleSidebar?: () => void;
  className?: string;
}

export interface TopicDisplayProps {
  topic: DebateTopic;
  userPosition: DebatePosition;
  preparationMaterials?: PreparationMaterials;
  showPreparationAccess?: boolean;
  showContextPanel?: boolean;
  onAccessPreparation?: () => void;
  className?: string;
}

export interface PositionBadgeProps {
  position: DebatePosition;
  variant?: 'default' | 'outline' | 'subtle' | 'solid';
  size?: 'xs' | 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  className?: string;
}
