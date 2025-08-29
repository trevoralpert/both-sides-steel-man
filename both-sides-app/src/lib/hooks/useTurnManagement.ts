'use client';

/**
 * Phase 6 Task 6.3.2: Turn Management Hook
 * 
 * Backend integration for debate turn-taking and speaking order management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DebatePhase, DebatePosition } from '@/types/debate';

export interface ParticipantInfo {
  id: string;
  name: string;
  position: DebatePosition;
  avatar?: string;
  isOnline?: boolean;
  hasSpoken?: boolean;
}

export interface TurnState {
  currentSpeakerId?: string;
  turnStartTime?: Date;
  turnDurationSeconds: number;
  isPaused: boolean;
  queueOrder: string[];
  turnCount: number;
  completedTurns: string[];
}

export interface TurnManagementProps {
  conversationId: string;
  userId: string;
  currentPhase: DebatePhase;
  participants: ParticipantInfo[];
  isTeacher?: boolean;
  enabled?: boolean;
}

export interface TurnManagementState {
  turnState: TurnState | null;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

// Default turn durations by phase (seconds)
const DEFAULT_TURN_DURATIONS = {
  PREPARATION: 0,
  OPENING: 180, // 3 minutes
  DISCUSSION: 120, // 2 minutes (suggested)
  REBUTTAL: 90, // 1.5 minutes
  CLOSING: 180, // 3 minutes
  REFLECTION: 0
} as const;

// Generate default turn state
const createDefaultTurnState = (phase: DebatePhase, participants: ParticipantInfo[]): TurnState => {
  // Generate queue order based on phase
  let queueOrder: string[];
  
  switch (phase) {
    case 'OPENING':
    case 'CLOSING':
      // PRO speaks first, then CON
      queueOrder = participants
        .sort((a, b) => a.position === 'PRO' ? -1 : 1)
        .map(p => p.id);
      break;
    
    case 'REBUTTAL':
      // Alternate between positions
      const proParticipants = participants.filter(p => p.position === 'PRO');
      const conParticipants = participants.filter(p => p.position === 'CON');
      queueOrder = [];
      
      const maxLength = Math.max(proParticipants.length, conParticipants.length);
      for (let i = 0; i < maxLength; i++) {
        if (proParticipants[i]) queueOrder.push(proParticipants[i].id);
        if (conParticipants[i]) queueOrder.push(conParticipants[i].id);
      }
      break;
    
    case 'DISCUSSION':
    default:
      // Natural order for discussion
      queueOrder = participants.map(p => p.id);
      break;
  }

  return {
    currentSpeakerId: undefined,
    turnStartTime: undefined,
    turnDurationSeconds: DEFAULT_TURN_DURATIONS[phase],
    isPaused: false,
    queueOrder,
    turnCount: 0,
    completedTurns: []
  };
};

// Create mock turn state for development
const createMockTurnState = (phase: DebatePhase, participants: ParticipantInfo[]): TurnState => {
  const baseState = createDefaultTurnState(phase, participants);
  
  // For demo purposes, simulate a turn in progress for certain phases
  if (['OPENING', 'DISCUSSION', 'REBUTTAL'].includes(phase) && participants.length > 0) {
    const firstParticipant = participants[0];
    return {
      ...baseState,
      currentSpeakerId: firstParticipant.id,
      turnStartTime: new Date(Date.now() - 30000), // 30 seconds ago
      turnCount: 1
    };
  }
  
  return baseState;
};

export function useTurnManagement({
  conversationId,
  userId,
  currentPhase,
  participants,
  isTeacher = false,
  enabled = true
}: TurnManagementProps) {
  const [state, setState] = useState<TurnManagementState>({
    turnState: null,
    isLoading: false,
    error: null,
    lastSync: null
  });
  
  const syncInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch turn state from backend
  const fetchTurnState = useCallback(async () => {
    if (!enabled || !conversationId || !['OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING'].includes(currentPhase)) {
      setState(prev => ({ ...prev, turnState: null, isLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Replace with actual API call to Phase 2 backend
      // const response = await fetch(`/api/conversations/${conversationId}/turns`, {
      //   method: 'GET',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   }
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to fetch turn state');
      // }
      
      // const turnState = await response.json();

      // Mock implementation for development
      await new Promise(resolve => setTimeout(resolve, 200));
      const turnState = createMockTurnState(currentPhase, participants);

      setState(prev => ({
        ...prev,
        turnState,
        isLoading: false,
        lastSync: new Date(),
        error: null
      }));

    } catch (error) {
      console.error('Error fetching turn state:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load turn state'
      }));
    }
  }, [conversationId, enabled, currentPhase, participants]);

  // Start a turn
  const startTurn = useCallback(async (speakerId: string) => {
    if (!state.turnState) return;

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/conversations/${conversationId}/turns/start`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ speakerId })
      // });

      // Update local state immediately for better UX
      setState(prev => ({
        ...prev,
        turnState: prev.turnState ? {
          ...prev.turnState,
          currentSpeakerId: speakerId,
          turnStartTime: new Date(),
          isPaused: false,
          turnCount: prev.turnState.turnCount + 1
        } : null
      }));

      console.log('Turn started for:', speakerId);
    } catch (error) {
      console.error('Error starting turn:', error);
    }
  }, [conversationId, state.turnState]);

  // End a turn
  const endTurn = useCallback(async (completed: boolean = true) => {
    if (!state.turnState?.currentSpeakerId) return;

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/conversations/${conversationId}/turns/end`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ 
      //     speakerId: state.turnState.currentSpeakerId,
      //     completed 
      //   })
      // });

      // Update local state
      setState(prev => ({
        ...prev,
        turnState: prev.turnState ? {
          ...prev.turnState,
          currentSpeakerId: undefined,
          turnStartTime: undefined,
          completedTurns: completed ? 
            [...prev.turnState.completedTurns, prev.turnState.currentSpeakerId!] :
            prev.turnState.completedTurns
        } : null
      }));

      console.log(`Turn ${completed ? 'completed' : 'skipped'} for:`, state.turnState.currentSpeakerId);
    } catch (error) {
      console.error('Error ending turn:', error);
    }
  }, [conversationId, state.turnState]);

  // Pause/Resume turn
  const pauseTurn = useCallback(async () => {
    if (!isTeacher || !state.turnState) return;

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/conversations/${conversationId}/turns/pause`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   }
      // });

      setState(prev => ({
        ...prev,
        turnState: prev.turnState ? {
          ...prev.turnState,
          isPaused: true
        } : null
      }));

      console.log('Turn paused');
    } catch (error) {
      console.error('Error pausing turn:', error);
    }
  }, [isTeacher, conversationId, state.turnState]);

  const resumeTurn = useCallback(async () => {
    if (!isTeacher || !state.turnState) return;

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/conversations/${conversationId}/turns/resume`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   }
      // });

      setState(prev => ({
        ...prev,
        turnState: prev.turnState ? {
          ...prev.turnState,
          isPaused: false
        } : null
      }));

      console.log('Turn resumed');
    } catch (error) {
      console.error('Error resuming turn:', error);
    }
  }, [isTeacher, conversationId, state.turnState]);

  // Skip to next speaker
  const skipToNextSpeaker = useCallback(async () => {
    if (!isTeacher || !state.turnState?.currentSpeakerId) return;

    const currentIndex = state.turnState.queueOrder.indexOf(state.turnState.currentSpeakerId);
    const nextIndex = (currentIndex + 1) % state.turnState.queueOrder.length;
    const nextSpeakerId = state.turnState.queueOrder[nextIndex];

    try {
      // End current turn and start next
      await endTurn(false); // Skip current
      setTimeout(() => startTurn(nextSpeakerId), 500);

      console.log('Skipped to next speaker:', nextSpeakerId);
    } catch (error) {
      console.error('Error skipping to next speaker:', error);
    }
  }, [isTeacher, state.turnState, endTurn, startTurn]);

  // Extend turn duration
  const extendTurn = useCallback(async (additionalSeconds: number) => {
    if (!isTeacher || !state.turnState) return;

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/conversations/${conversationId}/turns/extend`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ additionalSeconds })
      // });

      setState(prev => ({
        ...prev,
        turnState: prev.turnState ? {
          ...prev.turnState,
          turnDurationSeconds: prev.turnState.turnDurationSeconds + additionalSeconds
        } : null
      }));

      console.log(`Turn extended by ${additionalSeconds} seconds`);
    } catch (error) {
      console.error('Error extending turn:', error);
    }
  }, [isTeacher, conversationId, state.turnState]);

  // Update turn state
  const updateTurnState = useCallback((updates: Partial<TurnState>) => {
    setState(prev => ({
      ...prev,
      turnState: prev.turnState ? { ...prev.turnState, ...updates } : null
    }));
  }, []);

  // Auto-sync with backend
  useEffect(() => {
    if (enabled && conversationId && participants.length > 0) {
      fetchTurnState();
      
      // Set up periodic sync (every 15 seconds for turn state)
      syncInterval.current = setInterval(() => {
        fetchTurnState();
      }, 15000);
      
      return () => {
        if (syncInterval.current) {
          clearInterval(syncInterval.current);
        }
      };
    }
  }, [fetchTurnState, enabled, conversationId, participants.length, currentPhase]);

  // Calculate derived state
  const timeRemaining = state.turnState?.turnStartTime ? 
    Math.max(0, 
      state.turnState.turnDurationSeconds - 
      Math.floor((Date.now() - state.turnState.turnStartTime.getTime()) / 1000)
    ) : 0;

  const isOvertime = state.turnState?.turnStartTime ? 
    (Date.now() - state.turnState.turnStartTime.getTime()) / 1000 > state.turnState.turnDurationSeconds : 
    false;

  const currentSpeaker = state.turnState?.currentSpeakerId ? 
    participants.find(p => p.id === state.turnState.currentSpeakerId) : null;

  const isCurrentUserTurn = state.turnState?.currentSpeakerId === userId;

  return {
    // State
    turnState: state.turnState,
    currentSpeaker,
    isCurrentUserTurn,
    timeRemaining,
    isOvertime,
    isLoading: state.isLoading,
    error: state.error,
    lastSync: state.lastSync,
    
    // Actions
    startTurn,
    endTurn,
    pauseTurn,
    resumeTurn,
    skipToNextSpeaker,
    extendTurn,
    updateTurnState,
    
    // Utilities
    refreshTurnState: fetchTurnState,
    
    // Computed values
    hasTurnData: state.turnState !== null,
    canControlTurn: isTeacher && state.turnState !== null,
    supportsTurns: ['OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING'].includes(currentPhase)
  };
}

export default useTurnManagement;
