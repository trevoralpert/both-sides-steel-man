/**
 * Phase 3 Task 3.1.2 & 3.1.4: Survey Components Export
 * Centralized exports for all survey-related components
 */

// Core Survey Components (Phase 3.1)
export { SurveyQuestionComponent } from './SurveyQuestion';
export { EnhancedOnboardingFlow } from './EnhancedOnboardingFlow';
export { OnboardingOptimizationSystem } from './OnboardingOptimizationSystem';
export { OnboardingCompletionTracker } from './OnboardingCompletionTracker';
export { OnboardingAnalyticsDashboard } from './OnboardingAnalyticsDashboard';
export { OnboardingNotificationSystem } from './OnboardingNotificationSystem';
export { SurveyFlow } from './SurveyFlow';
export { SurveyProgressDisplay, SurveyProgressCompact } from './SurveyProgress';
export { SurveyGamification, SurveyLeaderboard, CompletionCertificate } from './SurveyGamification';
export { SurveyAnalyticsDashboard } from './SurveyAnalytics';

// Onboarding Experience (Phase 3.3.1)
export { OnboardingFlow } from './OnboardingFlow';
export { EducationalTooltip, InlineEducationalTooltip, useEducationalContent } from './EducationalTooltip';
export { AccessibilityProvider, useAccessibility, useAccessibleContent } from './AccessibilityProvider';

// Progressive Survey Components (Phase 3.3.2)
export { EnhancedSurveyQuestion } from './EnhancedSurveyQuestion';
export { SmartSurveyNavigation, useKeyboardNavigation, getOptimalNavigationPath } from './SmartSurveyNavigation';
export { RealTimeFeedback } from './RealTimeFeedback';
export { ResponseReviewSystem } from './ResponseReviewSystem';
export { 
  SurveyPersonalization, 
  analyzeUserProfile, 
  calculateEngagementLevel, 
  calculateFatigueLevel,
  type PersonalizationContext,
  type UserProfileInsights 
} from './SurveyPersonalization';

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
