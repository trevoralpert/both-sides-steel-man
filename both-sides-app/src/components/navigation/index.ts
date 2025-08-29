/**
 * Phase 6 Task 6.1.5: Navigation Components Export
 * 
 * Centralized exports for all navigation-related components and utilities
 */

// Core navigation components
export { RouteGuard, withRouteGuard } from './RouteGuard';
export type { RouteGuardProps } from './RouteGuard';

export { Breadcrumb, DebateBreadcrumb, ProfileBreadcrumb } from './Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItem } from './Breadcrumb';

export { NavigationLayout, DebateNavigationLayout } from './NavigationLayout';
export type { NavigationLayoutProps, NavigationAction } from './NavigationLayout';

// Hooks and utilities
export { default as useUrlState, useDebateUrlState, usePaginationState, useFilterState } from '@/lib/hooks/useUrlState';
export type { UrlStateOptions, DebateUrlState } from '@/lib/hooks/useUrlState';

// Deep linking utilities  
export { default as deepLinking } from '@/lib/utils/deepLinking';
export type { DeepLinkConfig, ParsedDeepLink } from '@/lib/utils/deepLinking';

// Re-export commonly used types
export type { DebatePhase } from '@/types/debate';
