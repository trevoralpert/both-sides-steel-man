/**
 * Phase 3 Task 3.1.2 & 3.1.4: Survey Components Export
 * Centralized exports for all survey-related components
 */

export { SurveyQuestionComponent } from './SurveyQuestion';
export { SurveyFlow } from './SurveyFlow';
export { SurveyProgressDisplay, SurveyProgressCompact } from './SurveyProgress';
export { SurveyGamification, SurveyLeaderboard, CompletionCertificate } from './SurveyGamification';
export { SurveyAnalyticsDashboard } from './SurveyAnalytics';

// Export custom hooks
export { useSurveyProgress } from '@/lib/hooks/useSurveyProgress';

// Re-export types for convenience
export type {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyProgress,
  SurveyResults,
  SurveyState,
  SurveyConfig,
  SaveResponseRequest,
  BulkSaveResponsesRequest,
  AdaptiveQuestionRequest,
  ResponseValidation,
  SurveyQuestionCategory,
  SurveyQuestionType,
} from '@/types/survey';
