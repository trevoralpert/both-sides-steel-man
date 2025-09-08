/**
 * Phase 3 Task 3.1.2: Survey API Client
 * Client functions for interacting with survey backend APIs
 */

import { 
  Survey, 
  SurveyProgress, 
  SurveyResults, 
  SaveResponseRequest,
  BulkSaveResponsesRequest,
  AdaptiveQuestionRequest,
  ResponseValidation,
  ApiResponse,
  SurveyQuestionType,
  SurveyQuestionCategory
} from '@/types/survey';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class SurveyAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public apiError?: any
  ) {
    super(message);
    this.name = 'SurveyAPIError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/surveys${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SurveyAPIError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof SurveyAPIError) {
      throw error;
    }
    throw new SurveyAPIError(
      error instanceof Error ? error.message : 'Unknown API error'
    );
  }
}

export const SurveyAPI = {
  /**
   * Get the active survey with all questions
   */
  async getActiveSurvey(token?: string): Promise<Survey> {
    const response = await apiRequest<Survey>('/active', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Get adaptive questions personalized for the user
   */
  async getAdaptiveQuestions(
    request: AdaptiveQuestionRequest,
    token?: string
  ): Promise<{ questions: any[]; total_available: number; personalization_applied: boolean }> {
    const params = new URLSearchParams();
    if (request.age) params.append('age', request.age.toString());
    if (request.complexity_preference) params.append('complexity', request.complexity_preference);
    if (request.max_questions) params.append('maxQuestions', request.max_questions.toString());

    const response = await apiRequest<any>(`/adaptive?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Save a single survey response
   */
  async saveResponse(
    responseData: SaveResponseRequest,
    token?: string
  ): Promise<any> {
    const response = await apiRequest<any>('/responses', {
      method: 'POST',
      body: JSON.stringify(responseData),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Bulk save multiple survey responses
   */
  async bulkSaveResponses(
    bulkData: BulkSaveResponsesRequest,
    token?: string
  ): Promise<any> {
    const response = await apiRequest<any>('/responses/bulk', {
      method: 'POST',
      body: JSON.stringify(bulkData),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Get survey progress for current user
   */
  async getProgress(token?: string): Promise<SurveyProgress> {
    const response = await apiRequest<SurveyProgress>('/progress', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Get user's survey responses and results
   */
  async getMyResponses(token?: string): Promise<SurveyResults> {
    const response = await apiRequest<SurveyResults>('/responses/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Update an existing response
   */
  async updateResponse(
    responseId: string,
    responseData: SaveResponseRequest,
    token?: string
  ): Promise<any> {
    const response = await apiRequest<any>(`/responses/${responseId}`, {
      method: 'PUT',
      body: JSON.stringify(responseData),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Delete a response
   */
  async deleteResponse(responseId: string, token?: string): Promise<void> {
    await apiRequest<void>(`/responses/${responseId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  /**
   * Validate a response before saving
   */
  async validateResponse(
    responseData: SaveResponseRequest,
    token?: string
  ): Promise<ResponseValidation> {
    const response = await apiRequest<ResponseValidation>('/responses/validate', {
      method: 'POST',
      body: JSON.stringify(responseData),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Get survey analytics (for teachers/admins)
   */
  async getAnalytics(surveyId?: string, token?: string): Promise<any> {
    const params = surveyId ? `?surveyId=${surveyId}` : '';
    const response = await apiRequest<any>(`/analytics${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },
};

// Helper functions for frontend state management
export const SurveyHelpers = {
  /**
   * Calculate progress percentage
   */
  calculateProgress(completedQuestions: number, totalQuestions: number): number {
    return totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;
  },

  /**
   * Format completion time for display
   */
  formatCompletionTime(milliseconds: number): string {
    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  },

  /**
   * Validate response locally before API call
   */
  validateResponseLocally(
    question: any, 
    responseValue: any
  ): { isValid: boolean; error?: string } {
    switch (question.type) {
      case 'LIKERT_SCALE':
        if (typeof responseValue !== 'number' || responseValue < 1 || responseValue > 7) {
          return { isValid: false, error: 'Please select a rating between 1 and 7' };
        }
        break;

      case 'BINARY_CHOICE':
        if (typeof responseValue !== 'boolean') {
          return { isValid: false, error: 'Please select either option' };
        }
        break;

      case 'MULTIPLE_CHOICE':
        if (!question.options?.includes(responseValue)) {
          return { isValid: false, error: 'Please select one of the available options' };
        }
        break;

      case 'RANKING':
        if (!Array.isArray(responseValue) || 
            responseValue.length !== question.options?.length ||
            !question.options?.every(opt => responseValue.includes(opt))) {
          return { isValid: false, error: 'Please rank all options' };
        }
        break;

      case 'SLIDER':
        const scale = question.scale;
        if (typeof responseValue !== 'number' || 
            responseValue < scale?.min || 
            responseValue > scale?.max) {
          return { isValid: false, error: `Please select a value between ${scale?.min} and ${scale?.max}` };
        }
        break;

      case 'TEXT_RESPONSE':
        if (typeof responseValue !== 'string' || responseValue.trim().length === 0) {
          return { isValid: false, error: 'Please provide a text response' };
        }
        if (responseValue.length > 1000) {
          return { isValid: false, error: 'Response must be less than 1000 characters' };
        }
        break;

      default:
        return { isValid: false, error: 'Unknown question type' };
    }

    return { isValid: true };
  },

  /**
   * Get question type display name
   */
  getQuestionTypeLabel(type: SurveyQuestionType): string {
    switch (type) {
      case 'LIKERT_SCALE': return 'Rating Scale';
      case 'BINARY_CHOICE': return 'Yes/No';
      case 'MULTIPLE_CHOICE': return 'Multiple Choice';
      case 'RANKING': return 'Ranking';
      case 'SLIDER': return 'Scale';
      case 'TEXT_RESPONSE': return 'Text Response';
      default: return 'Unknown';
    }
  },

  /**
   * Get category display name
   */
  getCategoryLabel(category: SurveyQuestionCategory): string {
    switch (category) {
      case 'POLITICAL': return 'Political Views';
      case 'SOCIAL': return 'Social Issues';
      case 'ECONOMIC': return 'Economic Policy';
      case 'PHILOSOPHICAL': return 'Philosophy';
      case 'PERSONAL': return 'Personal Values';
      default: return 'General';
    }
  },

  /**
   * Estimate reading time for a question
   */
  estimateReadingTime(question: string): number {
    // ~200 words per minute reading speed
    const wordsPerMinute = 200;
    const words = question.split(' ').length;
    const minutes = words / wordsPerMinute;
    return Math.max(minutes * 60 * 1000, 3000); // minimum 3 seconds
  },
};
