/**
 * Learning Navigation Integration - Main Export
 * 
 * Task 7.5.3: Centralized exports for all learning navigation and integration components.
 * This provides a single import point for the entire navigation system.
 */

// Core Navigation Provider
export { 
  LearningNavigationProvider, 
  useLearningNavigation 
} from './LearningNavigationProvider';

// Navigation Components
export { 
  LearningNavMenu,
  LearningBreadcrumbs,
  ContextualNavigation,
  QuickAccessToolbar,
  LearningWidget
} from './LearningNavigation';

// Notification System
export { 
  NotificationCenter,
  LearningNotificationToast
} from './LearningNotifications';

// Deep Links and Search
export { 
  LearningSearch,
  DeepLinkHandler,
  ShareableLink,
  LearningBookmarks
} from './LearningDeepLinks';

// Workflow Integration
export { 
  LearningWorkflowIntegration
} from './LearningWorkflowIntegration';

// Type definitions for external use
export interface LearningNavigationConfig {
  enableWorkflowIntegration?: boolean;
  enableNotifications?: boolean;
  enableDeepLinking?: boolean;
  defaultRole?: 'student' | 'teacher' | 'admin';
  customBreadcrumbs?: boolean;
}

export interface LearningIntegrationProps {
  config?: LearningNavigationConfig;
  children: React.ReactNode;
}

/**
 * Main Learning Integration Wrapper Component
 * 
 * This component provides the complete learning navigation integration
 * with all features enabled by default. Use this as the main wrapper
 * for sections of your app that need learning navigation features.
 */
export function LearningIntegration({ 
  config = {}, 
  children 
}: LearningIntegrationProps) {
  const {
    enableWorkflowIntegration = true,
    enableNotifications = true,
    enableDeepLinking = true,
    customBreadcrumbs = true
  } = config;

  return (
    <LearningNavigationProvider>
      {enableDeepLinking && <DeepLinkHandler />}
      {enableWorkflowIntegration && <LearningWorkflowIntegration />}
      {children}
    </LearningNavigationProvider>
  );
}