'use client';

/**
 * Phase 6 Task 6.3.1: Phase Management Hook
 * 
 * Backend integration for debate phase timing and state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { DebatePhase } from '@/types/debate';

export interface PhaseManagementProps {
  conversationId: string;
  userId: string;
  isTeacher?: boolean;
  enabled?: boolean;
}

export interface PhaseState {
  currentPhase: DebatePhase;
  phaseStartTime: Date;
  phaseDurationMs: number;
  completedPhases: DebatePhase[];
  isPaused: boolean;
  isTransitioning: boolean;
  nextPhase?: DebatePhase;
}

export interface PhaseManagementState {
  phaseState: PhaseState | null;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

// Default phase durations (in minutes)
const DEFAULT_PHASE_DURATIONS = {
  PREPARATION: 10,
  OPENING: 3,
  DISCUSSION: 15,
  REBUTTAL: 5,
  CLOSING: 3,
  REFLECTION: 5
} as const;

// Phase order
const PHASE_ORDER: DebatePhase[] = [
  'PREPARATION',
  'OPENING',
  'DISCUSSION',
  'REBUTTAL',
  'CLOSING',
  'REFLECTION'
];

// Mock phase state for development
const createMockPhaseState = (phase: DebatePhase = 'DISCUSSION'): PhaseState => {
  const now = new Date();
  // Start the phase 2 minutes ago for demo purposes
  const startTime = new Date(now.getTime() - (2 * 60 * 1000));
  
  return {
    currentPhase: phase,
    phaseStartTime: startTime,
    phaseDurationMs: DEFAULT_PHASE_DURATIONS[phase] * 60 * 1000,
    completedPhases: PHASE_ORDER.slice(0, PHASE_ORDER.indexOf(phase)),
    isPaused: false,
    isTransitioning: false,
    nextPhase: getNextPhase(phase)
  };
};

// Helper function to get next phase
function getNextPhase(currentPhase: DebatePhase): DebatePhase | undefined {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  return currentIndex < PHASE_ORDER.length - 1 ? PHASE_ORDER[currentIndex + 1] : undefined;
}

export function usePhaseManagement({
  conversationId,
  userId,
  isTeacher = false,
  enabled = true
}: PhaseManagementProps) {
  const [state, setState] = useState<PhaseManagementState>({
    phaseState: null,
    isLoading: false,
    error: null,
    lastSync: null
  });
  
  const syncInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch phase state from backend
  const fetchPhaseState = useCallback(async () => {
    if (!enabled || !conversationId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Replace with actual API call to Phase 2 backend
      // const response = await fetch(`/api/conversations/${conversationId}/phase`, {
      //   method: 'GET',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}` // User auth token
      //   }
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to fetch phase state');
      // }
      
      // const phaseState = await response.json();

      // Mock implementation for development
      await new Promise(resolve => setTimeout(resolve, 300));
      const phaseState = createMockPhaseState();

      setState(prev => ({
        ...prev,
        phaseState,
        isLoading: false,
        lastSync: new Date(),
        error: null
      }));

    } catch (error) {
      console.error('Error fetching phase state:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load phase state'
      }));
    }
  }, [conversationId, enabled]);

  // Pause phase timer (teacher only)
  const pausePhase = useCallback(async () => {
    if (!isTeacher || !state.phaseState) return;

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/conversations/${conversationId}/phase/pause`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   }
      // });

      // Update local state immediately for better UX
      setState(prev => ({
        ...prev,
        phaseState: prev.phaseState ? {
          ...prev.phaseState,
          isPaused: true
        } : null
      }));

      console.log('Phase paused');
    } catch (error) {
      console.error('Error pausing phase:', error);
    }
  }, [isTeacher, state.phaseState, conversationId]);

  // Resume phase timer (teacher only)
  const resumePhase = useCallback(async () => {
    if (!isTeacher || !state.phaseState) return;

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/conversations/${conversationId}/phase/resume`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   }
      // });

      // Update local state
      setState(prev => ({
        ...prev,
        phaseState: prev.phaseState ? {
          ...prev.phaseState,
          isPaused: false
        } : null
      }));

      console.log('Phase resumed');
    } catch (error) {
      console.error('Error resuming phase:', error);
    }
  }, [isTeacher, state.phaseState, conversationId]);

  // Skip to next phase (teacher only)
  const skipPhase = useCallback(async () => {
    if (!isTeacher || !state.phaseState) return;

    const nextPhase = getNextPhase(state.phaseState.currentPhase);
    if (!nextPhase) return;

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/conversations/${conversationId}/phase/skip`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ toPhase: nextPhase })
      // });

      // Mock phase transition
      setState(prev => ({
        ...prev,
        phaseState: prev.phaseState ? {
          currentPhase: nextPhase,
          phaseStartTime: new Date(),
          phaseDurationMs: DEFAULT_PHASE_DURATIONS[nextPhase] * 60 * 1000,
          completedPhases: [...prev.phaseState.completedPhases, prev.phaseState.currentPhase],
          isPaused: false,
          isTransitioning: false,
          nextPhase: getNextPhase(nextPhase)
        } : null
      }));

      console.log(`Phase skipped to: ${nextPhase}`);
    } catch (error) {
      console.error('Error skipping phase:', error);
    }
  }, [isTeacher, state.phaseState, conversationId]);

  // Extend phase time (teacher only)
  const extendPhase = useCallback(async (additionalMs: number) => {
    if (!isTeacher || !state.phaseState) return;

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/conversations/${conversationId}/phase/extend`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ additionalMs })
      // });

      // Update local state
      setState(prev => ({
        ...prev,
        phaseState: prev.phaseState ? {
          ...prev.phaseState,
          phaseDurationMs: prev.phaseState.phaseDurationMs + additionalMs
        } : null
      }));

      console.log(`Phase extended by ${additionalMs}ms`);
    } catch (error) {
      console.error('Error extending phase:', error);
    }
  }, [isTeacher, state.phaseState, conversationId]);

  // Handle automatic phase completion
  const handlePhaseComplete = useCallback(async (completedPhase: DebatePhase) => {
    const nextPhase = getNextPhase(completedPhase);
    
    if (nextPhase) {
      try {
        // TODO: Replace with actual API call for automatic transition
        // await fetch(`/api/conversations/${conversationId}/phase/complete`, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Authorization': `Bearer ${token}`
        //   },
        //   body: JSON.stringify({ 
        //     completedPhase, 
        //     nextPhase,
        //     automatic: true 
        //   })
        // });

        // Mark as transitioning for UI feedback
        setState(prev => ({
          ...prev,
          phaseState: prev.phaseState ? {
            ...prev.phaseState,
            isTransitioning: true
          } : null
        }));

        // Simulate transition delay
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            phaseState: prev.phaseState ? {
              currentPhase: nextPhase,
              phaseStartTime: new Date(),
              phaseDurationMs: DEFAULT_PHASE_DURATIONS[nextPhase] * 60 * 1000,
              completedPhases: [...prev.phaseState.completedPhases, completedPhase],
              isPaused: false,
              isTransitioning: false,
              nextPhase: getNextPhase(nextPhase)
            } : null
          }));
        }, 3000); // 3 second transition

        console.log(`Phase completed: ${completedPhase} -> ${nextPhase}`);
      } catch (error) {
        console.error('Error completing phase:', error);
      }
    } else {
      // Debate is complete
      console.log('Debate completed!');
    }
  }, [conversationId]);

  // Auto-sync with backend
  useEffect(() => {
    if (enabled && conversationId) {
      fetchPhaseState();
      
      // Set up periodic sync (every 30 seconds)
      syncInterval.current = setInterval(() => {
        fetchPhaseState();
      }, 30000);
      
      return () => {
        if (syncInterval.current) {
          clearInterval(syncInterval.current);
        }
      };
    }
  }, [fetchPhaseState, enabled, conversationId]);

  // Calculate derived state
  const timeRemaining = state.phaseState ? 
    Math.max(0, 
      state.phaseState.phaseDurationMs - 
      (Date.now() - state.phaseState.phaseStartTime.getTime())
    ) : 0;

  const isOvertime = state.phaseState ? 
    (Date.now() - state.phaseState.phaseStartTime.getTime()) > state.phaseState.phaseDurationMs : 
    false;

  return {
    // State
    phaseState: state.phaseState,
    timeRemaining,
    isOvertime,
    isLoading: state.isLoading,
    error: state.error,
    lastSync: state.lastSync,
    
    // Teacher actions
    pausePhase,
    resumePhase,
    skipPhase,
    extendPhase,
    
    // Event handlers
    handlePhaseComplete,
    
    // Utilities
    refreshPhaseState: fetchPhaseState,
    
    // Computed values
    hasPhaseData: state.phaseState !== null,
    canControlPhase: isTeacher && state.phaseState !== null,
    progressPercent: state.phaseState ? 
      Math.min(100, 
        ((Date.now() - state.phaseState.phaseStartTime.getTime()) / state.phaseState.phaseDurationMs) * 100
      ) : 0
  };
}

export default usePhaseManagement;
