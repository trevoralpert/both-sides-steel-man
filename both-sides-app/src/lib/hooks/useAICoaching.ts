/**
 * Phase 6 Task 6.4.1 & 6.4.2: AI Coaching Hook
 * 
 * Integration with existing AI coaching service from Phase 5
 * Enhanced with real-time typing analysis and suggestion updates
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, DebatePhase } from '@/types/debate';
import { CoachingSuggestion } from '@/components/debate-room/CoachingSidebar';

export interface AICoachingHookProps {
  conversationId: string;
  userId: string;
  currentPhase: DebatePhase;
  recentMessages: Message[];
  currentMessage?: string;
  enabled?: boolean;
  realTimeAnalysis?: boolean; // New: Enable real-time typing analysis
  analysisDelay?: number; // New: Debounce delay for real-time analysis (ms)
}

export interface AICoachingState {
  suggestions: CoachingSuggestion[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  hasNewSuggestions: boolean;
  // New: Real-time analysis state
  isAnalyzingTyping: boolean;
  typingPatterns: TypingPattern;
  realTimeSuggestions: CoachingSuggestion[];
}

// New: Typing pattern analysis
export interface TypingPattern {
  wordsPerMinute: number;
  averageWordLength: number;
  sentenceCount: number;
  questionMarks: number;
  exclamationMarks: number;
  negativeWords: string[];
  positiveWords: string[];
  evidenceKeywords: string[];
  uncertaintyIndicators: string[];
  lastAnalyzed: Date;
}

// Enhanced suggestion generation with real-time typing analysis
const generateMockSuggestions = (
  phase: DebatePhase, 
  messageCount: number, 
  currentMessage?: string,
  typingPatterns?: TypingPattern
): CoachingSuggestion[] => {
  const suggestions: CoachingSuggestion[] = [];

  // Phase-specific suggestions (existing logic)
  if (phase === 'OPENING') {
    suggestions.push({
      id: `opening-${Date.now()}-1`,
      type: 'structure',
      priority: 'high',
      suggestion: 'Start with a clear thesis statement',
      explanation: 'Your opening should immediately establish your position on the topic.',
      examples: [
        'I firmly believe that [position] because...',
        'The evidence clearly supports [stance] for three key reasons...',
        'Today I will argue that [thesis] by examining...'
      ],
      timestamp: new Date()
    });
  }

  if (phase === 'DISCUSSION' && messageCount > 2) {
    suggestions.push({
      id: `discussion-${Date.now()}-1`,
      type: 'evidence_needed',
      priority: 'medium',
      suggestion: 'Consider adding more specific evidence',
      explanation: 'Your arguments would be stronger with concrete data or expert opinions.',
      examples: [
        'According to the 2023 study by...',
        'Research from [organization] shows that...',
        'Expert [name] argues that...'
      ],
      timestamp: new Date()
    });
  }

  if (phase === 'REBUTTAL') {
    suggestions.push({
      id: `rebuttal-${Date.now()}-1`,
      type: 'counter_argument',
      priority: 'high',
      suggestion: 'Address the opposing viewpoint directly',
      explanation: 'Acknowledge your opponent\'s strongest point before presenting your counter-argument.',
      examples: [
        'While [opponent point] has merit, the evidence shows...',
        'I understand the concern about [issue], however...',
        'That\'s a valid perspective, but we must also consider...'
      ],
      timestamp: new Date()
    });
  }

  // Enhanced real-time suggestions based on current message and typing patterns
  if (currentMessage && currentMessage.length > 0) {
    const messageLength = currentMessage.length;
    const hasNegativeWords = /wrong|bad|stupid|dumb|ridiculous|nonsense/i.test(currentMessage);
    const hasUncertainty = /maybe|perhaps|might|could|possibly|I think|I guess/i.test(currentMessage);
    const hasEvidence = /study|research|data|according|shows|statistics|report/i.test(currentMessage);
    const hasQuestions = currentMessage.includes('?');
    
    // Respectfulness suggestions (real-time)
    if (hasNegativeWords) {
      suggestions.push({
        id: `realtime-respect-${Date.now()}`,
        type: 'respectfulness',
        priority: 'high',
        suggestion: 'Consider using more respectful language',
        explanation: 'Focus on critiquing ideas rather than making personal statements.',
        examples: [
          'I respectfully disagree because...',
          'I see it differently due to...',
          'That\'s an interesting point, but I think...'
        ],
        timestamp: new Date()
      });
    }

    // Evidence suggestions (real-time)
    if (messageLength > 100 && !hasEvidence && typingPatterns?.evidenceKeywords.length === 0) {
      suggestions.push({
        id: `realtime-evidence-${Date.now()}`,
        type: 'evidence_needed',
        priority: 'medium',
        suggestion: 'Strengthen your argument with evidence',
        explanation: 'Adding credible sources will make your point more convincing.',
        examples: [
          'Research shows that...',
          'According to [source]...',
          'Studies indicate that...'
        ],
        timestamp: new Date()
      });
    }

    // Clarity suggestions (real-time)
    if (hasUncertainty || (typingPatterns?.uncertaintyIndicators.length || 0) > 2) {
      suggestions.push({
        id: `realtime-clarity-${Date.now()}`,
        type: 'clarity',
        priority: 'medium',
        suggestion: 'Express your position more confidently',
        explanation: 'Reducing uncertainty words can strengthen your argument\'s impact.',
        examples: [
          'The evidence clearly demonstrates...',
          'This approach will...',
          'The data conclusively shows...'
        ],
        timestamp: new Date()
      });
    }

    // Structure suggestions (real-time)
    if (messageLength > 200 && (typingPatterns?.sentenceCount || 0) < 3) {
      suggestions.push({
        id: `realtime-structure-${Date.now()}`,
        type: 'structure',
        priority: 'low',
        suggestion: 'Consider breaking up long sentences',
        explanation: 'Shorter sentences improve clarity and readability.',
        examples: [
          'First, [point 1]. Second, [point 2]. Finally, [point 3].',
          'The main issue is X. This affects Y. Therefore, Z.',
          'Consider this evidence: [evidence]. This means [implication].'
        ],
        timestamp: new Date()
      });
    }

    // Argument strength suggestions (real-time) 
    if (messageLength > 50 && hasQuestions && phase === 'DISCUSSION') {
      suggestions.push({
        id: `realtime-argument-${Date.now()}`,
        type: 'argument_strength',
        priority: 'medium',
        suggestion: 'Balance questions with assertions',
        explanation: 'While questions engage your opponent, strong statements reinforce your position.',
        examples: [
          'While I understand your concern, the evidence shows...',
          'This raises an important question, but we know that...',
          'Consider this perspective: [strong statement]'
        ],
        timestamp: new Date()
      });
    }
  }

  // Typing pattern-based suggestions
  if (typingPatterns) {
    // Fast typing with potential errors
    if (typingPatterns.wordsPerMinute > 60 && messageCount > 0) {
      suggestions.push({
        id: `pattern-speed-${Date.now()}`,
        type: 'clarity',
        priority: 'low',
        suggestion: 'Take time to review before sending',
        explanation: 'Quick typing can lead to unclear arguments. A brief review improves quality.',
        examples: [
          'Read through your message once before sending',
          'Check that your main point is clear',
          'Ensure your reasoning flows logically'
        ],
        timestamp: new Date()
      });
    }

    // Too many negative words
    if (typingPatterns.negativeWords.length > 3) {
      suggestions.push({
        id: `pattern-negativity-${Date.now()}`,
        type: 'respectfulness',
        priority: 'medium',
        suggestion: 'Focus on constructive criticism',
        explanation: 'Balance critical points with constructive alternatives.',
        examples: [
          'Instead of [negative point], consider [alternative]',
          'A more effective approach might be...',
          'While this has challenges, we could improve it by...'
        ],
        timestamp: new Date()
      });
    }
  }

  // General quality suggestions based on engagement
  if (messageCount > 5) {
    suggestions.push({
      id: `strategy-${Date.now()}-1`,
      type: 'strategy',
      priority: 'low',
      suggestion: 'Great engagement! Consider summarizing key points',
      explanation: 'Help your audience follow your logic by occasionally summarizing your main arguments.',
      examples: [
        'To summarize my key points...',
        'The main evidence supporting my position includes...',
        'In essence, my argument rests on...'
      ],
      timestamp: new Date()
    });
  }

  return suggestions;
};

// Analyze typing patterns for real-time coaching
const analyzeTypingPatterns = (currentMessage: string, startTime: Date): TypingPattern => {
  const words = currentMessage.split(/\s+/).filter(word => word.length > 0);
  const sentences = currentMessage.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const timeElapsed = (Date.now() - startTime.getTime()) / 60000; // minutes
  
  // Negative/positive word detection
  const negativeWords = words.filter(word => 
    /wrong|bad|stupid|dumb|ridiculous|nonsense|terrible|awful|horrible/i.test(word)
  );
  const positiveWords = words.filter(word => 
    /good|great|excellent|wonderful|amazing|brilliant|perfect|outstanding/i.test(word)
  );
  
  // Evidence keywords
  const evidenceKeywords = words.filter(word => 
    /study|research|data|according|shows|statistics|report|survey|analysis/i.test(word)
  );
  
  // Uncertainty indicators
  const uncertaintyIndicators = words.filter(word => 
    /maybe|perhaps|might|could|possibly|probably|think|guess|assume|suppose/i.test(word)
  );

  return {
    wordsPerMinute: timeElapsed > 0 ? words.length / timeElapsed : 0,
    averageWordLength: words.length > 0 ? words.reduce((acc, word) => acc + word.length, 0) / words.length : 0,
    sentenceCount: sentences.length,
    questionMarks: (currentMessage.match(/\?/g) || []).length,
    exclamationMarks: (currentMessage.match(/!/g) || []).length,
    negativeWords,
    positiveWords,
    evidenceKeywords,
    uncertaintyIndicators,
    lastAnalyzed: new Date()
  };
};

export function useAICoaching({
  conversationId,
  userId,
  currentPhase,
  recentMessages,
  currentMessage,
  enabled = true,
  realTimeAnalysis = true,
  analysisDelay = 1000
}: AICoachingHookProps) {
  // Enhanced state with real-time features
  const [state, setState] = useState<AICoachingState>({
    suggestions: [],
    isLoading: false,
    error: null,
    lastRefresh: null,
    hasNewSuggestions: false,
    // New real-time state
    isAnalyzingTyping: false,
    typingPatterns: {
      wordsPerMinute: 0,
      averageWordLength: 0,
      sentenceCount: 0,
      questionMarks: 0,
      exclamationMarks: 0,
      negativeWords: [],
      positiveWords: [],
      evidenceKeywords: [],
      uncertaintyIndicators: [],
      lastAnalyzed: new Date()
    },
    realTimeSuggestions: []
  });

  // Refs for real-time analysis
  const typingStartTime = useRef<Date>(new Date());
  const analysisTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAnalyzedMessage = useRef<string>('');

  // Real-time typing analysis (debounced)
  const analyzeCurrentTyping = useCallback(async () => {
    if (!realTimeAnalysis || !currentMessage || currentMessage === lastAnalyzedMessage.current) {
      return;
    }

    lastAnalyzedMessage.current = currentMessage;
    setState(prev => ({ ...prev, isAnalyzingTyping: true }));

    try {
      // Analyze typing patterns
      const typingPatterns = analyzeTypingPatterns(currentMessage, typingStartTime.current);
      
      // Generate real-time suggestions
      const realTimeSuggestions = generateMockSuggestions(
        currentPhase, 
        recentMessages.length, 
        currentMessage, 
        typingPatterns
      ).filter(s => s.id.includes('realtime') || s.id.includes('pattern'));

      setState(prev => ({
        ...prev,
        typingPatterns,
        realTimeSuggestions,
        isAnalyzingTyping: false,
        hasNewSuggestions: realTimeSuggestions.length > 0
      }));

    } catch (error) {
      console.error('Error analyzing typing:', error);
      setState(prev => ({
        ...prev,
        isAnalyzingTyping: false,
        error: 'Failed to analyze typing patterns'
      }));
    }
  }, [realTimeAnalysis, currentMessage, currentPhase, recentMessages]);

  // Fetch coaching suggestions from backend
  const fetchSuggestions = useCallback(async () => {
    if (!enabled || !conversationId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Replace with actual API call to backend AI coaching service
      // const response = await fetch(`/api/coaching/suggestions`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     conversationId,
      //     userId,
      //     currentPhase,
      //     recentMessages: recentMessages.slice(-10), // Last 10 messages
      //     currentMessage,
      //     typingPatterns: state.typingPatterns
      //   })
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to fetch coaching suggestions');
      // }
      
      // const data = await response.json();
      // const suggestions = data.suggestions;

      // Mock implementation for development with enhanced features
      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay for better UX
      const suggestions = generateMockSuggestions(
        currentPhase, 
        recentMessages.length, 
        currentMessage, 
        state.typingPatterns
      );

      setState(prev => ({
        ...prev,
        suggestions,
        isLoading: false,
        lastRefresh: new Date(),
        hasNewSuggestions: suggestions.length > prev.suggestions.length,
        error: null
      }));

    } catch (error) {
      console.error('Error fetching coaching suggestions:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load suggestions'
      }));
    }
  }, [conversationId, userId, currentPhase, recentMessages, currentMessage, enabled, state.typingPatterns]);

  // Auto-refresh when conditions change
  useEffect(() => {
    if (enabled && conversationId) {
      fetchSuggestions();
    }
  }, [fetchSuggestions, enabled, conversationId]);

  // Refresh when new messages arrive (debounced)
  useEffect(() => {
    if (recentMessages.length > 0 && enabled) {
      const timeout = setTimeout(() => {
        fetchSuggestions();
      }, 2000); // Wait 2 seconds after last message

      return () => clearTimeout(timeout);
    }
  }, [recentMessages.length, fetchSuggestions, enabled]);

  // Real-time typing analysis with debouncing
  useEffect(() => {
    if (!realTimeAnalysis || !currentMessage) {
      // Clear real-time suggestions when message is empty
      if (!currentMessage && state.realTimeSuggestions.length > 0) {
        setState(prev => ({ ...prev, realTimeSuggestions: [] }));
      }
      return;
    }

    // Clear previous timeout
    if (analysisTimeout.current) {
      clearTimeout(analysisTimeout.current);
    }

    // Reset typing start time if this is a new typing session
    if (!lastAnalyzedMessage.current && currentMessage) {
      typingStartTime.current = new Date();
    }

    // Debounced analysis
    analysisTimeout.current = setTimeout(() => {
      analyzeCurrentTyping();
    }, analysisDelay);

    return () => {
      if (analysisTimeout.current) {
        clearTimeout(analysisTimeout.current);
      }
    };
  }, [currentMessage, realTimeAnalysis, analysisDelay, analyzeCurrentTyping, state.realTimeSuggestions.length]);

  // Reset typing timer when message is sent/cleared
  useEffect(() => {
    if (!currentMessage) {
      typingStartTime.current = new Date();
      lastAnalyzedMessage.current = '';
    }
  }, [currentMessage]);

  // Mark new suggestions as seen
  const markSuggestionsAsSeen = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasNewSuggestions: false
    }));
  }, []);

  // Submit suggestion feedback
  const submitFeedback = useCallback(async (suggestionId: string, helpful: boolean) => {
    try {
      // TODO: Integrate with backend feedback API
      // await fetch(`/api/coaching/feedback`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     suggestionId,
      //     helpful,
      //     userId,
      //     conversationId
      //   })
      // });

      console.log(`Feedback submitted for suggestion ${suggestionId}: ${helpful ? 'helpful' : 'not helpful'}`);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }, [userId, conversationId]);

  // Manual refresh
  const refreshSuggestions = useCallback(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return {
    // Existing functionality
    suggestions: state.suggestions,
    isLoading: state.isLoading,
    error: state.error,
    lastRefresh: state.lastRefresh,
    hasNewSuggestions: state.hasNewSuggestions,
    refreshSuggestions,
    markSuggestionsAsSeen,
    submitFeedback,
    
    // New real-time features
    isAnalyzingTyping: state.isAnalyzingTyping,
    typingPatterns: state.typingPatterns,
    realTimeSuggestions: state.realTimeSuggestions,
    
    // Combined suggestions (both regular and real-time)
    allSuggestions: [...state.suggestions, ...state.realTimeSuggestions],
    
    // Real-time analysis control
    analyzeCurrentTyping,
    
    // Enhanced metrics
    suggestionMetrics: {
      total: state.suggestions.length + state.realTimeSuggestions.length,
      regular: state.suggestions.length,
      realTime: state.realTimeSuggestions.length,
      hasRealTime: state.realTimeSuggestions.length > 0
    }
  };
}

export default useAICoaching;
