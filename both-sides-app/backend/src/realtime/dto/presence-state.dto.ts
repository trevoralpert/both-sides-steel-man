export interface PresenceState {
  userId: string;
  status: 'online' | 'away' | 'offline';
  isTyping: boolean;
  lastSeen: Date;
  connectionQuality: 'excellent' | 'good' | 'poor';
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    platform?: string;
  };
  metadata?: {
    conversationId?: string;
    lastActivity?: Date;
    typingTimeout?: NodeJS.Timeout;
    activityTimeout?: NodeJS.Timeout;
  };
}

export interface TypingState {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  startedAt: Date;
  timeout?: NodeJS.Timeout;
}

export interface PresenceUpdate {
  userId: string;
  conversationId: string;
  previousState: Partial<PresenceState>;
  newState: Partial<PresenceState>;
  timestamp: Date;
  updateType: 'status' | 'typing' | 'connection' | 'activity';
}

export interface ConnectionQualityMetrics {
  userId: string;
  latency: number;
  reliability: number; // 0-1 score
  packetsLost: number;
  reconnectionCount: number;
  lastMeasured: Date;
}

export interface PresenceSubscription {
  conversationId: string;
  callback: (states: PresenceState[]) => void;
  filter?: {
    includeOffline?: boolean;
    userIds?: string[];
  };
}

export interface ActivityEvent {
  userId: string;
  conversationId: string;
  activityType: 'typing' | 'mouse_move' | 'focus' | 'message_read';
  timestamp: Date;
  metadata?: any;
}
