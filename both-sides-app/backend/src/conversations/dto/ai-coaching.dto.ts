/**
 * AI Coaching DTOs
 * 
 * Data structures for AI-powered coaching and debate suggestions
 * Task 5.3.3: AI Coaching & Suggestions
 */

import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsArray, Min, Max } from 'class-validator';

export enum CoachingSuggestionType {
  ARGUMENT_STRENGTH = 'argument_strength',
  EVIDENCE_NEEDED = 'evidence_needed',
  COUNTER_ARGUMENT = 'counter_argument',
  STRUCTURE = 'structure',
  RESPECTFULNESS = 'respectfulness',
  CLARITY = 'clarity',
  STRATEGY = 'strategy'
}

export enum CoachingPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface CoachingSuggestion {
  type: CoachingSuggestionType;
  priority: CoachingPriority;
  suggestion: string;
  explanation: string;
  examples?: string[];
  relatedResources?: Resource[];
  targetUserId: string;
  conversationId: string;
  contextMessageId?: string;
  timestamp: Date;
  expiresAt?: Date;
}

export interface Resource {
  id: string;
  type: 'article' | 'video' | 'study' | 'example' | 'definition';
  title: string;
  url?: string;
  description: string;
  relevanceScore: number;
}

export interface DebateAnalysis {
  userId: string;
  conversationId: string;
  strengths: string[];
  improvementAreas: string[];
  argumentQuality: number;
  evidenceUsage: number;
  engagementLevel: number;
  respectfulnessScore: number;
  strategicThinking: number;
  currentPhase: string;
  phaseFeedback: {
    phase: string;
    performance: number;
    suggestions: string[];
  }[];
}

export interface EvidenceSuggestion {
  claim: string;
  supportingEvidence: string[];
  sources: {
    title: string;
    url?: string;
    type: 'academic' | 'news' | 'government' | 'expert';
    credibility: number;
    relevance: number;
  }[];
  searchQueries: string[];
  relatedConcepts: string[];
}

export interface CounterArgumentSuggestion {
  originalArgument: string;
  counterPoints: {
    point: string;
    strength: number;
    approach: 'logical' | 'factual' | 'ethical' | 'practical';
    supportingEvidence?: string[];
  }[];
  strategicAdvice: string[];
  anticipatedResponses: string[];
}

export interface StrategySuggestion {
  phase: string;
  position: 'PRO' | 'CON';
  primaryStrategy: string;
  tacticalAdvice: string[];
  keyPoints: string[];
  timeManagement: {
    remainingTime: number;
    recommendedPacing: string;
    priorityActions: string[];
  };
  opponentAnalysis: {
    weaknesses: string[];
    strengths: string[];
    counterstrategies: string[];
  };
}

export class GenerateCoachingRequest {
  @IsString()
  messageId: string;

  @IsString()
  conversationId: string;

  @IsString()
  userId: string;

  @IsString()
  messageContent: string;

  @IsOptional()
  @IsArray()
  conversationHistory?: Array<{
    id: string;
    content: string;
    userId: string;
    timestamp: Date;
  }>;

  @IsOptional()
  context?: {
    debatePhase: string;
    position: 'PRO' | 'CON';
    topicId?: string;
    timeRemaining?: number;
  };
}

export class CoachingSuggestionResponse {
  @IsString()
  id: string;

  @IsEnum(CoachingSuggestionType)
  type: CoachingSuggestionType;

  @IsEnum(CoachingPriority)
  priority: CoachingPriority;

  @IsString()
  suggestion: string;

  @IsString()
  explanation: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examples?: string[];

  @IsOptional()
  @IsArray()
  relatedResources?: Resource[];

  @IsString()
  targetUserId: string;

  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  contextMessageId?: string;

  @IsString()
  createdAt: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class DebateAnalysisRequest {
  @IsString()
  userId: string;

  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  currentPhase?: string;

  @IsOptional()
  @IsNumber()
  lookbackMessages?: number; // How many recent messages to analyze
}

export class EvidenceSuggestionRequest {
  @IsString()
  claim: string;

  @IsEnum(['PRO', 'CON'])
  position: 'PRO' | 'CON';

  @IsOptional()
  @IsString()
  topicContext?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedClaims?: string[];
}

export class CounterArgumentRequest {
  @IsString()
  argument: string;

  @IsOptional()
  @IsArray()
  context?: Array<{
    messageId: string;
    content: string;
    userId: string;
  }>;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  debatePhase?: string;
}

export class StrategySuggestionRequest {
  @IsString()
  userId: string;

  @IsString()
  conversationId: string;

  @IsString()
  phase: string;

  @IsEnum(['PRO', 'CON'])
  position: 'PRO' | 'CON';

  @IsOptional()
  @IsNumber()
  timeRemainingMinutes?: number;

  @IsOptional()
  opponentAnalysis?: {
    recentMessages: string[];
    perceivedStrengths: string[];
    perceivedWeaknesses: string[];
  };
}

export class BatchCoachingRequest {
  @IsArray()
  requests: GenerateCoachingRequest[];

  @IsOptional()
  @IsString()
  priority?: 'high' | 'medium' | 'low';

  @IsOptional()
  @IsBoolean()
  realTimeDelivery?: boolean;
}

export class BatchCoachingResponse {
  @IsString()
  batchId: string;

  @IsNumber()
  totalProcessed: number;

  @IsNumber()
  suggestionsGenerated: number;

  @IsNumber()
  errors: number;

  @IsArray()
  suggestions: CoachingSuggestionResponse[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errorMessages?: string[];

  @IsNumber()
  processingTime: number;
}

export interface CoachingMetrics {
  totalSuggestions: number;
  suggestionsByType: Record<CoachingSuggestionType, number>;
  suggestionsByPriority: Record<CoachingPriority, number>;
  averageResponseTime: number;
  userEngagement: {
    suggestionsViewed: number;
    suggestionsActedUpon: number;
    engagementRate: number;
  };
  effectiveness: {
    argumentQualityImprovement: number;
    evidenceUsageIncrease: number;
    respectfulnessIncrease: number;
  };
  topicCoverage: {
    topic: string;
    suggestionsProvided: number;
    averageQuality: number;
  }[];
}

export class CoachingFeedback {
  @IsString()
  suggestionId: string;

  @IsString()
  userId: string;

  @IsEnum(['helpful', 'not_helpful', 'irrelevant', 'excellent'])
  rating: 'helpful' | 'not_helpful' | 'irrelevant' | 'excellent';

  @IsOptional()
  @IsString()
  comments?: string;

  @IsBoolean()
  wasActedUpon: boolean; // Did the user follow the suggestion?

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  qualityRating?: number; // 1-5 rating
}

export interface UserCoachingProfile {
  userId: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredSuggestionTypes: CoachingSuggestionType[];
  coachingFrequency: 'high' | 'medium' | 'low';
  strengths: string[];
  growthAreas: string[];
  learningProgress: {
    area: string;
    initialScore: number;
    currentScore: number;
    improvement: number;
    trends: 'improving' | 'stable' | 'declining';
  }[];
  adaptiveSettings: {
    suggestionsPerDebate: number;
    priorityThreshold: CoachingPriority;
    realTimeEnabled: boolean;
    evidenceLevel: 'basic' | 'detailed';
  };
}
