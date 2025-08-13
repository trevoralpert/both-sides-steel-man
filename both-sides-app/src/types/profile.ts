export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export interface IdeologyScores {
  liberal?: number;
  conservative?: number;
  progressive?: number;
  libertarian?: number;
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
