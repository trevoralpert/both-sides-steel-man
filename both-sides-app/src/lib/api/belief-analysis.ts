import { BeliefAnalysisResult, SurveyResponse, ProfilePrivacySettings } from '@/types/profile';

export interface GenerateBeliefAnalysisRequest {
  profileId: string;
  surveyResponses: SurveyResponse[];
  analysisParameters: {
    depth: 'basic' | 'detailed' | 'comprehensive';
    focus: string[];
    context: 'educational' | 'research' | 'matching';
  };
}

export interface ConfirmProfileRequest {
  profileId: string;
  privacySettings: ProfilePrivacySettings;
  finalConfirmation: boolean;
}

export interface UpdateResponsesRequest {
  profileId: string;
  updatedResponses: SurveyResponse[];
  regenerateProfile: boolean;
}

export interface BeliefAnalysisAPIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export class BeliefAnalysisAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'BeliefAnalysisAPIError';
  }
}

export class BeliefAnalysisAPI {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  private static async request<T>(
    endpoint: string,
    options: RequestInit,
    token: string
  ): Promise<BeliefAnalysisAPIResponse<T>> {
    const url = `${this.BASE_URL}/api/belief-analysis${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error occurred';
      let errorData: any = null;
      
      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      } catch {
        errorMessage = `HTTP ${response.status} - ${response.statusText}`;
      }
      
      throw new BeliefAnalysisAPIError(
        errorMessage,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  /**
   * Generate belief analysis from survey responses
   */
  static async generateBeliefAnalysis(
    token: string,
    request: GenerateBeliefAnalysisRequest
  ): Promise<BeliefAnalysisAPIResponse<BeliefAnalysisResult>> {
    return this.request<BeliefAnalysisResult>(
      '/generate',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      token
    );
  }

  /**
   * Get existing belief analysis for a profile
   */
  static async getBeliefAnalysis(
    token: string,
    profileId: string
  ): Promise<BeliefAnalysisAPIResponse<BeliefAnalysisResult>> {
    return this.request<BeliefAnalysisResult>(
      `/profile/${profileId}`,
      {
        method: 'GET',
      },
      token
    );
  }

  /**
   * Update survey responses and regenerate profile
   */
  static async updateResponses(
    token: string,
    request: UpdateResponsesRequest
  ): Promise<BeliefAnalysisAPIResponse<BeliefAnalysisResult>> {
    return this.request<BeliefAnalysisResult>(
      '/update-responses',
      {
        method: 'PUT',
        body: JSON.stringify(request),
      },
      token
    );
  }

  /**
   * Confirm profile and apply privacy settings
   */
  static async confirmProfile(
    token: string,
    request: ConfirmProfileRequest
  ): Promise<BeliefAnalysisAPIResponse<{ profileId: string; confirmed: boolean }>> {
    return this.request<{ profileId: string; confirmed: boolean }>(
      '/confirm',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      token
    );
  }

  /**
   * Get profile preview with analysis status
   */
  static async getProfilePreview(
    token: string,
    profileId: string
  ): Promise<BeliefAnalysisAPIResponse<{
    profile: BeliefAnalysisResult;
    surveyResponses: SurveyResponse[];
    analysisStatus: 'pending' | 'completed' | 'error';
  }>> {
    return this.request<{
      profile: BeliefAnalysisResult;
      surveyResponses: SurveyResponse[];
      analysisStatus: 'pending' | 'completed' | 'error';
    }>(
      `/preview/${profileId}`,
      {
        method: 'GET',
      },
      token
    );
  }

  /**
   * Get response contribution analysis
   */
  static async getResponseContributions(
    token: string,
    profileId: string
  ): Promise<BeliefAnalysisAPIResponse<{
    contributions: Array<{
      questionId: string;
      questionText: string;
      category: string;
      response: string;
      contributesToDimensions: string[];
      impact: 'high' | 'medium' | 'low';
      influenceScore: number;
    }>;
  }>> {
    return this.request<{
      contributions: Array<{
        questionId: string;
        questionText: string;
        category: string;
        response: string;
        contributesToDimensions: string[];
        impact: 'high' | 'medium' | 'low';
        influenceScore: number;
      }>;
    }>(
      `/contributions/${profileId}`,
      {
        method: 'GET',
      },
      token
    );
  }

  /**
   * Regenerate belief analysis (force refresh)
   */
  static async regenerateAnalysis(
    token: string,
    profileId: string,
    options?: {
      depth?: 'basic' | 'detailed' | 'comprehensive';
      focus?: string[];
    }
  ): Promise<BeliefAnalysisAPIResponse<BeliefAnalysisResult>> {
    return this.request<BeliefAnalysisResult>(
      `/regenerate/${profileId}`,
      {
        method: 'POST',
        body: JSON.stringify(options || {}),
      },
      token
    );
  }

  /**
   * Delete belief analysis data
   */
  static async deleteAnalysis(
    token: string,
    profileId: string
  ): Promise<BeliefAnalysisAPIResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>(
      `/profile/${profileId}`,
      {
        method: 'DELETE',
      },
      token
    );
  }

  /**
   * Get analysis quality assessment
   */
  static async getQualityAssessment(
    token: string,
    profileId: string
  ): Promise<BeliefAnalysisAPIResponse<{
    qualityScore: number;
    qualityFactors: {
      consistency: number;
      completeness: number;
      responseTime: number;
      confidence: number;
    };
    recommendations: string[];
    improvementAreas: string[];
  }>> {
    return this.request<{
      qualityScore: number;
      qualityFactors: {
        consistency: number;
        completeness: number;
        responseTime: number;
        confidence: number;
      };
      recommendations: string[];
      improvementAreas: string[];
    }>(
      `/quality/${profileId}`,
      {
        method: 'GET',
      },
      token
    );
  }

  /**
   * Export belief analysis data
   */
  static async exportAnalysisData(
    token: string,
    profileId: string,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<BeliefAnalysisAPIResponse<{
    downloadUrl: string;
    expiresAt: Date;
    format: string;
    fileSize: number;
  }>> {
    return this.request<{
      downloadUrl: string;
      expiresAt: Date;
      format: string;
      fileSize: number;
    }>(
      `/export/${profileId}?format=${format}`,
      {
        method: 'GET',
      },
      token
    );
  }

  /**
   * Validate survey responses for quality
   */
  static async validateResponses(
    token: string,
    responses: SurveyResponse[]
  ): Promise<BeliefAnalysisAPIResponse<{
    isValid: boolean;
    qualityScore: number;
    issues: Array<{
      questionId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }>;
    recommendations: string[];
  }>> {
    return this.request<{
      isValid: boolean;
      qualityScore: number;
      issues: Array<{
        questionId: string;
        issue: string;
        severity: 'low' | 'medium' | 'high';
        suggestion: string;
      }>;
      recommendations: string[];
    }>(
      '/validate-responses',
      {
        method: 'POST',
        body: JSON.stringify({ responses }),
      },
      token
    );
  }
}

// Helper functions for working with belief analysis data

export const getIdeologyLabel = (dimension: string, score: number): string => {
  const labels: Record<string, { negative: string; positive: string; neutral: string }> = {
    economic: { negative: 'Progressive', positive: 'Conservative', neutral: 'Moderate' },
    social: { negative: 'Authoritarian', positive: 'Libertarian', neutral: 'Balanced' },
    tradition: { negative: 'Progressive', positive: 'Traditional', neutral: 'Adaptive' },
    globalism: { negative: 'Nationalist', positive: 'Globalist', neutral: 'Pragmatic' },
    environment: { negative: 'Economy-First', positive: 'Environment-First', neutral: 'Balanced' }
  };

  const dimensionLabels = labels[dimension];
  if (!dimensionLabels) return 'Unknown';

  if (Math.abs(score) < 0.1) return dimensionLabels.neutral;
  return score < 0 ? dimensionLabels.negative : dimensionLabels.positive;
};

export const getPlasticityLevel = (plasticity: number): string => {
  if (plasticity >= 0.8) return 'Very Flexible';
  if (plasticity >= 0.6) return 'Flexible';
  if (plasticity >= 0.4) return 'Moderate';
  if (plasticity >= 0.2) return 'Firm';
  return 'Very Firm';
};

export const formatAnalysisDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const calculateProfileCompleteness = (analysis: BeliefAnalysisResult): number => {
  let completeness = 0;
  const totalFactors = 5;

  if (analysis.beliefSummary && analysis.beliefSummary.length > 100) completeness++;
  if (analysis.ideologyScores && Object.keys(analysis.ideologyScores).length >= 3) completeness++;
  if (analysis.opinionPlasticity !== null && analysis.opinionPlasticity !== undefined) completeness++;
  if (analysis.confidenceScore > 0.5) completeness++;
  if (analysis.analysisMetadata.qualityScore > 0.7) completeness++;

  return (completeness / totalFactors) * 100;
};
