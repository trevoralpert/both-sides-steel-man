/**
 * Learning Navigation Integration - Main Export
 * 
 * Task 7.5.3: Centralized exports for all learning navigation and integration components.
 * This provides a single import point for the entire navigation system.
 */

import React from 'react';
import { LearningNavigationProvider } from './LearningNavigationProvider';
import { LearningWorkflowIntegration } from './LearningWorkflowIntegration';
import { DeepLinkHandler } from './LearningDeepLinks';

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

// Navigation Hooks and Guards
export { useDebateUrlState } from '@/lib/hooks/useUrlState';
export { deepLinking } from '@/lib/utils/deepLinking';

// Route Guards

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfile?: boolean;
  debateAccess?: {
    conversationId: string;
    requireParticipant: boolean;
  };
  fallbackPath?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, requireAuth, requireProfile, debateAccess, fallbackPath }) => {
  // For now, just return children. In a real implementation, this would handle authentication/authorization
  return <>{children}</>;
};

// Breadcrumb Components  
export const Breadcrumb: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="flex items-center space-x-2 text-sm">{children}</div>;
};

export const DebateBreadcrumb: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Breadcrumb>{children}</Breadcrumb>;
};

// Navigation Layout
export const NavigationLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="w-full">{children}</div>;
};

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