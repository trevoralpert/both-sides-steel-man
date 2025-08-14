/**
 * Phase 3 Task 3.1.2: Survey Types for Frontend
 * TypeScript interfaces matching backend survey schema
 */

export type SurveyQuestionCategory = 
  | 'POLITICAL' 
  | 'SOCIAL' 
  | 'ECONOMIC' 
  | 'PHILOSOPHICAL' 
  | 'PERSONAL';

export type SurveyQuestionType = 
  | 'LIKERT_SCALE' 
  | 'BINARY_CHOICE' 
  | 'MULTIPLE_CHOICE' 
  | 'RANKING' 
  | 'SLIDER' 
  | 'TEXT_RESPONSE';

export interface IdeologyAxis {
  axis: 'economic' | 'social' | 'tradition' | 'globalism' | 'environment';
  weight: number;
  direction: 'positive' | 'negative';
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  section?: string;
  order: number;
  category: SurveyQuestionCategory;
  type: SurveyQuestionType;
  question: string;
  options?: string[];
  scale?: {
    min: number;
    max: number;
    labels: string[];
  };
  weight: number;
  ideology_mapping?: IdeologyAxis[];
  required: boolean;
  randomize_within_sec: boolean;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface Survey {
  id: string;
  name: string;
  description?: string;
  version: number;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  questions: SurveyQuestion[];
}

export interface SurveyResponse {
  id: string;
  profile_id: string;
  question_id: string;
  response_value: any;
  response_text?: string;
  confidence_level?: number; // 1-5 scale
  completion_time: number; // milliseconds
  responded_at: Date | string;
  survey_id: string;
  survey_version: number;
  question?: SurveyQuestion;
}

export interface SurveyProgress {
  completed_questions: number;
  total_questions: number;
  progress_percentage: number;
  current_section?: string;
  sections_completed: number;
  total_sections: number;
}

export interface SurveyResults {
  user_id: string;
  profile_id: string;
  survey_id: string;
  survey_version: number;
  is_complete: boolean;
  completion_percentage: number;
  total_questions: number;
  completed_questions: number;
  responses: SurveyResponse[];
  responses_by_category: Record<SurveyQuestionCategory, SurveyResponse[]>;
  quality_metrics: {
    average_confidence: number;
    average_completion_time: number;
    response_quality_score: number;
  };
  last_response_at?: Date | string;
}

export interface SurveySession {
  user_id: string;
  survey_id: string;
  current_question_index: number;
  section_progress: Record<string, number>;
  started_at: Date;
  last_activity: Date;
  total_questions: number;
  completed_questions: number;
}

export interface ResponseValidation {
  is_valid: boolean;
  quality_score: number;
  issues?: string[];
  warnings?: string[];
}

// Request/Response DTOs for API calls
export interface SaveResponseRequest {
  question_id: string;
  response_value: any;
  response_text?: string;
  confidence_level?: number;
  completion_time: number;
}

export interface BulkSaveResponsesRequest {
  responses: SaveResponseRequest[];
  session_metadata?: {
    session_duration: number;
    fatigue_level: 'low' | 'medium' | 'high';
    completion_quality: number;
  };
}

export interface AdaptiveQuestionRequest {
  age?: number;
  complexity_preference?: 'basic' | 'intermediate' | 'advanced';
  max_questions?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Survey UI State Management
export interface SurveyState {
  currentQuestion: number;
  responses: Map<string, SaveResponseRequest>;
  progress: SurveyProgress;
  survey: Survey | null;
  isLoading: boolean;
  error?: string;
  startTime: Date;
  questionStartTime: Date;
}

export interface SurveyConfig {
  enableAutoSave: boolean;
  autoSaveInterval: number; // milliseconds
  enableProgress: boolean;
  enableBackNavigation: boolean;
  maxQuestionsPerSession: number;
  enableSkipLogic: boolean;
  showConfidenceRating: boolean;
  showProgressBar: boolean;
}
