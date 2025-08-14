export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export interface IdeologyScores {
  // Modern multi-dimensional scoring (AI-powered)
  economic?: number;        // -1 (left) to +1 (right)
  social?: number;          // -1 (authoritarian) to +1 (libertarian)  
  tradition?: number;       // -1 (progressive) to +1 (traditional)
  globalism?: number;       // -1 (nationalist) to +1 (globalist)
  environment?: number;     // -1 (economic) to +1 (environmental)
  
  // Legacy simple scoring (backwards compatibility)
  liberal?: number;
  conservative?: number;
  progressive?: number;
  libertarian?: number;
  
  // Meta-scores
  certainty?: number;       // How confident in positions (0-1)
  consistency?: number;     // Internal logical consistency (0-1)
  
  [key: string]: number | undefined;
}

export interface SurveyResponses {
  questions: string[];
  answers: string[];
  [key: string]: any;
}

export interface Profile {
  id: string;
  is_completed: boolean;
  completion_date?: Date | string;
  survey_responses?: SurveyResponses;
  belief_summary?: string;
  ideology_scores?: IdeologyScores;
  opinion_plasticity?: number;
  profile_version: number;
  last_updated: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
  user_id: string;
  user?: User;
}

export interface ProfileInsights {
  completion_percentage: number;
  personality_traits?: string[];
  recommended_debates?: string[];
  belief_strength?: number;
  consistency_score?: number;
  [key: string]: any;
}

export interface CreateProfileRequest {
  is_completed?: boolean;
  completion_date?: string;
  survey_responses?: SurveyResponses;
  belief_summary?: string;
  ideology_scores?: IdeologyScores;
  opinion_plasticity?: number;
}

export interface UpdateProfileRequest {
  is_completed?: boolean;
  completion_date?: string;
  survey_responses?: SurveyResponses;
  belief_summary?: string;
  ideology_scores?: IdeologyScores;
  opinion_plasticity?: number;
}

export interface ProfileStats {
  total_profiles: number;
  completed_profiles: number;
  completion_rate: number;
  average_plasticity: number;
  most_common_ideology?: string;
  [key: string]: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export type ProfileVariant = 'compact' | 'detailed' | 'editable';

// Belief Analysis System Types
export interface BeliefAnalysisResult {
  profileId: string;
  beliefSummary: string;
  ideologyScores: IdeologyScores;
  opinionPlasticity: number;
  confidenceScore: number;
  analysisMetadata: {
    analysisVersion: string;
    completedAt: Date;
    tokensUsed: number;
    processingTime: number;
    qualityScore: number;
  };
}

export interface SurveyResponse {
  questionId: string;
  questionText: string;
  questionCategory: string;
  responseValue: any;
  responseText?: string;
  confidenceLevel?: number;
  completionTime: number;
}

export interface ProfilePrivacySettings {
  profileVisibility: 'private' | 'class_only' | 'school_only';
  allowTeacherView: boolean;
  allowPeerComparison: boolean;
  shareForResearch: boolean;
  enableMatching: boolean;
  showInClassAnalytics: boolean;
}

export interface ResponseContribution {
  questionText: string;
  category: string;
  response: string;
  contributesToDimensions: string[];
  impact: 'high' | 'medium' | 'low';
}
