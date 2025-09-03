/**
 * AI Analysis Engine Interfaces
 * Comprehensive type definitions for Phase 7 AI-powered analysis
 */

/**
 * Base interface for all analysis operations
 */
export interface BaseAnalysisRequest {
  conversationId: string;
  userId?: string;
  classId?: string;
  analysisOptions?: {
    cacheResults?: boolean;
    includeConfidence?: boolean;
    detailLevel?: 'basic' | 'detailed' | 'comprehensive';
    customPrompts?: Record<string, string>;
  };
}

/**
 * Base interface for all analysis results
 */
export interface BaseAnalysisResult {
  analysisId: string;
  conversationId: string;
  analysisType: string;
  version: string;
  status: 'completed' | 'partial' | 'failed';
  confidence: number;
  processingTime: number;
  tokensUsed: number;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Debate transcript structure for analysis
 */
export interface DebateTranscript {
  conversationId: string;
  participants: ParticipantInfo[];
  messages: DebateMessage[];
  topic: {
    title: string;
    description?: string;
    category?: string;
  };
  metadata: {
    duration: number;
    messageCount: number;
    participantCount: number;
    status: string;
    startTime: Date;
    endTime?: Date;
  };
}

/**
 * Participant information
 */
export interface ParticipantInfo {
  id: string;
  role: 'pro' | 'con' | 'moderator';
  messageCount: number;
  wordCount: number;
  avgResponseTime: number;
}

/**
 * Debate message structure
 */
export interface DebateMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  wordCount: number;
  responseToId?: string;
  messageType: 'argument' | 'question' | 'clarification' | 'rebuttal';
  phase: 'opening' | 'discussion' | 'rebuttal' | 'closing';
}

// ==================== SENTIMENT ANALYSIS ====================

/**
 * Sentiment Analysis Request
 */
export interface SentimentAnalysisRequest extends BaseAnalysisRequest {
  includeEmotions?: boolean;
  trackProgression?: boolean;
}

/**
 * Sentiment Analysis Result
 */
export interface SentimentAnalysisResult extends BaseAnalysisResult {
  overallSentiment: {
    polarity: number; // -1 (negative) to +1 (positive)
    intensity: number; // 0 to 1
    neutrality: number; // 0 to 1
  };
  participantSentiments: Record<string, {
    averagePolarity: number;
    polarityRange: [number, number];
    emotionalStability: number;
    sentimentProgression: Array<{
      timestamp: Date;
      polarity: number;
      intensity: number;
    }>;
  }>;
  emotions?: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    disgust: number;
    surprise: number;
    trust: number;
    anticipation: number;
  };
  sentimentShifts: Array<{
    timestamp: Date;
    participantId: string;
    previousSentiment: number;
    newSentiment: number;
    trigger?: string;
  }>;
  insights: string[];
}

// ==================== TOPIC ANALYSIS ====================

/**
 * Topic Analysis Request
 */
export interface TopicAnalysisRequest extends BaseAnalysisRequest {
  detectDrift?: boolean;
  extractKeywords?: boolean;
  analyzeFocus?: boolean;
}

/**
 * Topic Analysis Result
 */
export interface TopicAnalysisResult extends BaseAnalysisResult {
  mainTopics: Array<{
    topic: string;
    relevance: number; // 0 to 1
    coverage: number; // percentage of debate
    participantEngagement: Record<string, number>;
    keywords: string[];
  }>;
  topicCoherence: {
    overall: number; // 0 to 1
    perPhase: Record<string, number>;
    coherenceScore: number;
  };
  topicDrift: Array<{
    timestamp: Date;
    fromTopic: string;
    toTopic: string;
    driftStrength: number;
    participant?: string;
    reason?: string;
  }>;
  focus: {
    onTopic: number; // percentage
    offtopicSegments: Array<{
      startTime: Date;
      endTime: Date;
      content: string;
      participantId: string;
    }>;
    focusScore: number;
  };
  keywords: Array<{
    word: string;
    frequency: number;
    relevance: number;
    sentiment: number;
    context: string[];
  }>;
  insights: string[];
}

// ==================== ARGUMENT ANALYSIS ====================

/**
 * Argument Analysis Request
 */
export interface ArgumentAnalysisRequest extends BaseAnalysisRequest {
  detectFallacies?: boolean;
  analyzeEvidence?: boolean;
  assessQuality?: boolean;
  includeStrengthsWeaknesses?: boolean;
}

/**
 * Argument Analysis Result
 */
export interface ArgumentAnalysisResult extends BaseAnalysisResult {
  arguments: Array<{
    id: string;
    participantId: string;
    type: 'claim' | 'evidence' | 'warrant' | 'rebuttal' | 'concession';
    content: string;
    position: 'pro' | 'con';
    strength: number; // 0 to 1
    evidenceQuality: number; // 0 to 1
    logicalStructure: number; // 0 to 1
    originalityScore: number; // 0 to 1
    supportingEvidence: Array<{
      type: 'statistical' | 'expert_opinion' | 'case_study' | 'logical' | 'anecdotal';
      strength: number;
      reliability: number;
      relevance: number;
      source?: string;
    }>;
    rebuttals: Array<{
      participantId: string;
      strength: number;
      effectiveness: number;
      content: string;
    }>;
  }>;
  fallacies: Array<{
    type: string;
    description: string;
    participantId: string;
    messageId: string;
    severity: 'low' | 'medium' | 'high';
    explanation: string;
    suggestion: string;
  }>;
  qualityMetrics: {
    overallQuality: number;
    logicalCoherence: number;
    evidenceStrength: number;
    argumentDiversity: number;
    engagementLevel: number;
  };
  participantScores: Record<string, {
    argumentQuality: number;
    evidenceUsage: number;
    logicalReasoning: number;
    rebuttalSkill: number;
    originalThinking: number;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
  }>;
  insights: string[];
}

// ==================== LEARNING INSIGHTS ====================

/**
 * Learning Insights Request
 */
export interface LearningInsightsRequest extends BaseAnalysisRequest {
  targetUserId: string;
  insightTypes: Array<'skills' | 'knowledge' | 'behavior' | 'engagement' | 'growth'>;
  compareToClass?: boolean;
  includeRecommendations?: boolean;
  personalizationLevel?: 'basic' | 'detailed' | 'advanced';
}

/**
 * Learning Insights Result
 */
export interface LearningInsightsResult extends BaseAnalysisResult {
  studentProfile: {
    strengths: Array<{
      skill: string;
      evidence: string[];
      score: number;
      development: 'emerging' | 'developing' | 'proficient' | 'advanced';
    }>;
    growthAreas: Array<{
      skill: string;
      currentLevel: number;
      targetLevel: number;
      barriers: string[];
      recommendations: string[];
      priority: 'low' | 'medium' | 'high';
    }>;
    learningStyle: {
      preference: string;
      characteristics: string[];
      adaptations: string[];
    };
  };
  skillAssessment: {
    criticalThinking: {
      score: number;
      evidence: string[];
      nextSteps: string[];
    };
    communication: {
      clarity: number;
      persuasion: number;
      listening: number;
      evidence: string[];
    };
    collaboration: {
      score: number;
      respectfulness: number;
      engagement: number;
      evidence: string[];
    };
    research: {
      evidenceUsage: number;
      sourceQuality: number;
      factAccuracy: number;
      evidence: string[];
    };
  };
  behaviorInsights: {
    engagementPatterns: {
      participationLevel: number;
      responseLatency: number;
      initiativeScore: number;
      patterns: string[];
    };
    emotionalRegulation: {
      score: number;
      stressResponse: string;
      resilience: number;
      observations: string[];
    };
    adaptability: {
      score: number;
      flexibilityIndicators: string[];
      changeResponse: string;
    };
  };
  comparisons?: {
    classAverage: Record<string, number>;
    percentileRank: Record<string, number>;
    relativeStrengths: string[];
    improvementAreas: string[];
  };
  recommendations: Array<{
    category: string;
    priority: 'immediate' | 'short_term' | 'long_term';
    action: string;
    rationale: string;
    expectedOutcome: string;
    resources?: string[];
  }>;
  insights: string[];
}

// ==================== COMPREHENSIVE DEBATE ANALYSIS ====================

/**
 * Comprehensive Debate Analysis Request (combines all analyses)
 */
export interface ComprehensiveAnalysisRequest extends BaseAnalysisRequest {
  includeSentiment?: boolean;
  includeTopic?: boolean;
  includeArgument?: boolean;
  includeLearning?: boolean;
  targetUserId?: string;
}

/**
 * Comprehensive Debate Analysis Result
 */
export interface ComprehensiveAnalysisResult extends BaseAnalysisResult {
  summary: {
    overallQuality: number;
    educationalValue: number;
    engagementLevel: number;
    keyInsights: string[];
  };
  sentiment?: SentimentAnalysisResult;
  topic?: TopicAnalysisResult;
  argument?: ArgumentAnalysisResult;
  learning?: LearningInsightsResult;
  synthesis: {
    strengths: string[];
    improvements: string[];
    lessons: string[];
    nextSteps: string[];
  };
}

// ==================== ANALYSIS ORCHESTRATION ====================

/**
 * Analysis Job Configuration
 */
export interface AnalysisJobConfig {
  analysisTypes: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduling: {
    immediate?: boolean;
    delay?: number;
    batchWith?: string[];
  };
  notification: {
    onComplete?: boolean;
    onError?: boolean;
    recipients?: string[];
  };
  storage: {
    persistResults?: boolean;
    cacheResults?: boolean;
    retentionDays?: number;
  };
}

/**
 * Analysis Progress Tracking
 */
export interface AnalysisProgress {
  jobId: string;
  conversationId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 to 100
  currentStage: string;
  estimatedCompletion?: Date;
  completedAnalyses: string[];
  errors?: Array<{
    analysisType: string;
    error: string;
    recoverable: boolean;
  }>;
}

/**
 * Analysis Configuration Presets
 */
export const ANALYSIS_PRESETS = {
  BASIC: {
    sentiment: { detailLevel: 'basic' },
    topic: { detectDrift: false, extractKeywords: true },
  },
  DETAILED: {
    sentiment: { detailLevel: 'detailed', includeEmotions: true, trackProgression: true },
    topic: { detailLevel: 'detailed', detectDrift: true, extractKeywords: true, analyzeFocus: true },
    argument: { detailLevel: 'detailed', detectFallacies: true, analyzeEvidence: true },
  },
  COMPREHENSIVE: {
    sentiment: { detailLevel: 'comprehensive', includeEmotions: true, trackProgression: true },
    topic: { detailLevel: 'comprehensive', detectDrift: true, extractKeywords: true, analyzeFocus: true },
    argument: { detailLevel: 'comprehensive', detectFallacies: true, analyzeEvidence: true, assessQuality: true, includeStrengthsWeaknesses: true },
    learning: { detailLevel: 'comprehensive', insightTypes: ['skills', 'knowledge', 'behavior', 'engagement', 'growth'], includeRecommendations: true, personalizationLevel: 'advanced' },
  },
} as const;

/**
 * Analysis validation schemas
 */
export interface AnalysisValidationSchema {
  minMessageCount: number;
  minParticipants: number;
  maxProcessingTime: number;
  requiredFields: string[];
  supportedLanguages: string[];
}

export const DEFAULT_VALIDATION: AnalysisValidationSchema = {
  minMessageCount: 5,
  minParticipants: 2,
  maxProcessingTime: 300000, // 5 minutes
  requiredFields: ['conversationId', 'messages', 'participants'],
  supportedLanguages: ['en'],
};
