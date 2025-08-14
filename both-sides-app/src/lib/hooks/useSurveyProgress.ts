/**
 * Phase 3 Task 3.1.4.1: Survey Progress Persistence Hook
 * Manages survey progress state with auto-save and resume capabilities
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SurveyAPI } from '@/lib/api/survey';
import { 
  SurveyProgress, 
  SurveySession, 
  SaveResponseRequest,
  SurveyState 
} from '@/types/survey';

interface UseSurveyProgressOptions {
  autoSaveInterval?: number;
  enableCrossPlatformSync?: boolean;
  enableOfflineMode?: boolean;
}

export function useSurveyProgress(options: UseSurveyProgressOptions = {}) {
  const { getToken } = useAuth();
  const {
    autoSaveInterval = 30000, // 30 seconds
    enableCrossPlatformSync = true,
    enableOfflineMode = true,
  } = options;

  const [progress, setProgress] = useState<SurveyProgress | null>(null);
  const [session, setSession] = useState<SurveySession | null>(null);
  const [pendingResponses, setPendingResponses] = useState<SaveResponseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Local storage keys
  const STORAGE_KEYS = {
    progress: 'survey_progress',
    session: 'survey_session',
    responses: 'pending_responses',
    lastSync: 'last_sync_time',
  };

  /**
   * Load progress from both API and local storage
   */
  const loadProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      // Try to load from API first
      const token = await getToken();
      if (token) {
        try {
          const apiProgress = await SurveyAPI.getProgress(token);
          setProgress(apiProgress);
          
          // Update local storage with latest from API
          if (enableCrossPlatformSync) {
            localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(apiProgress));
            localStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());
            setLastSyncTime(new Date());
          }
        } catch (apiError) {
          console.warn('Failed to load progress from API, trying local storage:', apiError);
          
          // Fallback to local storage
          if (enableOfflineMode) {
            const localProgress = localStorage.getItem(STORAGE_KEYS.progress);
            if (localProgress) {
              setProgress(JSON.parse(localProgress));
            }
          }
        }
      }

      // Load session data from local storage
      const sessionData = localStorage.getItem(STORAGE_KEYS.session);
      if (sessionData) {
        setSession(JSON.parse(sessionData));
      }

      // Load pending responses
      const pendingData = localStorage.getItem(STORAGE_KEYS.responses);
      if (pendingData) {
        setPendingResponses(JSON.parse(pendingData));
      }

    } catch (error) {
      setError('Failed to load survey progress');
      console.error('Progress load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, enableCrossPlatformSync, enableOfflineMode]);

  /**
   * Save progress to local storage and sync to API
   */
  const saveProgress = useCallback(async (
    newProgress: Partial<SurveyProgress>,
    responses: SaveResponseRequest[] = []
  ) => {
    try {
      // Update local state
      const updatedProgress = { ...progress, ...newProgress } as SurveyProgress;
      setProgress(updatedProgress);

      // Save to local storage immediately
      localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(updatedProgress));
      
      // Add responses to pending queue
      if (responses.length > 0) {
        const newPending = [...pendingResponses, ...responses];
        setPendingResponses(newPending);
        localStorage.setItem(STORAGE_KEYS.responses, JSON.stringify(newPending));
      }

      // Update session info
      const updatedSession: SurveySession = {
        ...session,
        user_id: session?.user_id || '',
        survey_id: session?.survey_id || '',
        current_question_index: newProgress.completed_questions || 0,
        last_activity: new Date(),
        completed_questions: newProgress.completed_questions || 0,
        total_questions: newProgress.total_questions || 0,
        section_progress: session?.section_progress || {},
        started_at: session?.started_at || new Date(),
      };
      setSession(updatedSession);
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(updatedSession));

    } catch (error) {
      console.error('Failed to save progress locally:', error);
    }
  }, [progress, session, pendingResponses]);

  /**
   * Sync pending responses to API
   */
  const syncToAPI = useCallback(async () => {
    if (pendingResponses.length === 0) return;

    try {
      const token = await getToken();
      if (!token) return;

      // Sync responses in batches
      await SurveyAPI.bulkSaveResponses({
        responses: pendingResponses,
        session_metadata: {
          session_duration: session ? Date.now() - new Date(session.started_at).getTime() : 0,
          fatigue_level: calculateFatigueLevel(),
          completion_quality: calculateCompletionQuality(),
        },
      }, token);

      // Clear pending responses after successful sync
      setPendingResponses([]);
      localStorage.removeItem(STORAGE_KEYS.responses);
      
      // Update sync time
      const syncTime = new Date();
      setLastSyncTime(syncTime);
      localStorage.setItem(STORAGE_KEYS.lastSync, syncTime.toISOString());

      console.log(`Successfully synced ${pendingResponses.length} responses`);

    } catch (error) {
      console.error('Failed to sync responses to API:', error);
      // Keep responses in pending queue for retry
    }
  }, [pendingResponses, session, getToken]);

  /**
   * Auto-save functionality
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingResponses.length > 0) {
        syncToAPI();
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [pendingResponses, syncToAPI, autoSaveInterval]);

  /**
   * Initialize progress on mount
   */
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  /**
   * Handle browser refresh/close
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingResponses.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved responses. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingResponses]);

  /**
   * Resume survey from last position
   */
  const resumeSurvey = useCallback(() => {
    if (!progress || !session) return 0;
    
    // Resume from the next uncompleted question
    return Math.min(progress.completed_questions, progress.total_questions - 1);
  }, [progress, session]);

  /**
   * Calculate fatigue level based on session duration and responses
   */
  const calculateFatigueLevel = (): 'low' | 'medium' | 'high' => {
    if (!session) return 'low';
    
    const sessionDuration = Date.now() - new Date(session.started_at).getTime();
    const averageTimePerQuestion = session.completed_questions > 0 
      ? sessionDuration / session.completed_questions 
      : 0;

    // High fatigue: >30 min session or >3 min per question
    if (sessionDuration > 30 * 60 * 1000 || averageTimePerQuestion > 3 * 60 * 1000) {
      return 'high';
    }
    
    // Medium fatigue: >15 min session or >90s per question
    if (sessionDuration > 15 * 60 * 1000 || averageTimePerQuestion > 90 * 1000) {
      return 'medium';
    }
    
    return 'low';
  };

  /**
   * Calculate completion quality score
   */
  const calculateCompletionQuality = (): number => {
    if (!session || session.completed_questions === 0) return 100;
    
    let qualityScore = 100;
    
    // Deduct points for very fast completion (possible rushing)
    const avgTimePerQuestion = session.completed_questions > 0 
      ? (Date.now() - new Date(session.started_at).getTime()) / session.completed_questions 
      : 0;
    
    if (avgTimePerQuestion < 10000) { // Less than 10 seconds per question
      qualityScore -= 30;
    } else if (avgTimePerQuestion < 20000) { // Less than 20 seconds
      qualityScore -= 15;
    }
    
    return Math.max(qualityScore, 0);
  };

  /**
   * Clear all progress data (for starting fresh)
   */
  const clearProgress = useCallback(() => {
    setProgress(null);
    setSession(null);
    setPendingResponses([]);
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }, []);

  return {
    // State
    progress,
    session,
    pendingResponses,
    isLoading,
    error,
    lastSyncTime,
    
    // Actions
    saveProgress,
    syncToAPI,
    loadProgress,
    resumeSurvey,
    clearProgress,
    
    // Computed values
    hasUnsavedData: pendingResponses.length > 0,
    fatigueLevel: calculateFatigueLevel(),
    completionQuality: calculateCompletionQuality(),
    isOffline: !navigator.onLine,
  };
}
