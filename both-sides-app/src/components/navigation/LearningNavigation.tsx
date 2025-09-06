/**
 * Learning Navigation Components
 * 
 * Task 7.5.3: Navigation menu items and contextual navigation for
 * learning analytics and reflection features.
 */

'use client';

import React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  BarChart3, 
  Trophy, 
  Target, 
  MessageSquare,
  Users,
  Calendar,
  Bell,
  ChevronRight,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useLearningNavigation } from './LearningNavigationProvider';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  description?: string;
  roles?: ('student' | 'teacher' | 'admin')[];
}

interface LearningNavMenuProps {
  role?: 'student' | 'teacher' | 'admin';
  className?: string;
}

export function LearningNavMenu({ role = 'student', className }: LearningNavMenuProps) {
  const pathname = usePathname();
  const { unreadCount, currentDebateId, activeProgress } = useLearningNavigation();

  // Define navigation items based on role
  const getNavItems = (): NavItem[] => {
    const commonItems: NavItem[] = [
      {
        label: 'Reflections',
        href: '/learning/reflections',
        icon: <MessageSquare className="h-5 w-5" />,
        badge: currentDebateId ? 'New' : undefined,
        description: 'Post-debate reflections and insights',
        roles: ['student', 'teacher']
      },
      {
        label: 'Progress',
        href: '/learning/progress',
        icon: <BarChart3 className="h-5 w-5" />,
        badge: activeProgress ? `${activeProgress.progress}%` : undefined,
        description: 'Track learning progress and analytics',
        roles: ['student', 'teacher']
      },
      {
        label: 'Achievements',
        href: '/learning/achievements',
        icon: <Trophy className="h-5 w-5" />,
        description: 'Badges, milestones, and accomplishments',
        roles: ['student']
      },
      {
        label: 'Goals',
        href: '/learning/goals',
        icon: <Target className="h-5 w-5" />,
        description: 'Learning objectives and targets',
        roles: ['student']
      }
    ];

    const teacherItems: NavItem[] = [
      {
        label: 'Class Analytics',
        href: '/teacher/analytics',
        icon: <Users className="h-5 w-5" />,
        description: 'Class performance and engagement',
        roles: ['teacher', 'admin']
      },
      {
        label: 'Review Center',
        href: '/teacher/reviews',
        icon: <MessageSquare className="h-5 w-5" />,
        badge: unreadCount || undefined,
        description: 'Student reflection reviews',
        roles: ['teacher']
      }
    ];

    const items = [...commonItems, ...teacherItems];
    return items.filter(item => !item.roles || item.roles.includes(role));
  };

  const navItems = getNavItems();

  return (
    <nav className={cn("space-y-2", className)}>
      <div className="px-3 py-2">
        <h3 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Learning Center
        </h3>
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavMenuItem 
              key={item.href} 
              item={item} 
              isActive={pathname.startsWith(item.href)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

interface NavMenuItemProps {
  item: NavItem;
  isActive: boolean;
}

function NavMenuItem({ item, isActive }: NavMenuItemProps) {
  return (
    <Link href={item.href}>
      <div className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
        isActive && "bg-accent text-accent-foreground"
      )}>
        <div className="flex items-center space-x-3">
          {item.icon}
          <span>{item.label}</span>
        </div>
        {item.badge && (
          <Badge variant={typeof item.badge === 'string' ? 'default' : 'secondary'} className="text-xs">
            {item.badge}
          </Badge>
        )}
      </div>
    </Link>
  );
}

export function LearningBreadcrumbs() {
  const { breadcrumbs } = useLearningNavigation();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
            )}
            <Link
              href={crumb.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                crumb.current 
                  ? "text-foreground" 
                  : "text-muted-foreground"
              )}
            >
              {crumb.label === 'Home' && <Home className="h-4 w-4" />}
              <span className={crumb.label === 'Home' ? 'sr-only' : ''}>
                {crumb.label}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface ContextualNavigationProps {
  context: 'post_debate' | 'reflection_progress' | 'achievement_unlocked' | 'goal_completed';
  debateId?: string;
  reflectionId?: string;
  achievementId?: string;
  goalId?: string;
}

export function ContextualNavigation({ 
  context, 
  debateId, 
  reflectionId, 
  achievementId, 
  goalId 
}: ContextualNavigationProps) {
  const { navigateToReflection, navigateToProgress, navigateToAnalytics } = useLearningNavigation();

  const getContextualActions = () => {
    switch (context) {
      case 'post_debate':
        return {
          title: "Great Debate!",
          description: "Ready to reflect on your experience?",
          primaryAction: {
            label: "Start Reflection",
            onClick: () => debateId && navigateToReflection(debateId)
          },
          secondaryAction: {
            label: "View Progress",
            onClick: () => navigateToProgress()
          }
        };
      
      case 'reflection_progress':
        return {
          title: "Reflection in Progress",
          description: "Continue where you left off",
          primaryAction: {
            label: "Continue Reflection",
            onClick: () => reflectionId && window.location.assign(`/learning/reflections/${reflectionId}`)
          },
          secondaryAction: {
            label: "Save for Later",
            onClick: () => navigateToProgress()
          }
        };
      
      case 'achievement_unlocked':
        return {
          title: "Achievement Unlocked!",
          description: "You've earned a new badge",
          primaryAction: {
            label: "View Achievement",
            onClick: () => window.location.assign('/learning/achievements')
          },
          secondaryAction: {
            label: "See All Progress",
            onClick: () => navigateToProgress()
          }
        };
      
      case 'goal_completed':
        return {
          title: "Goal Completed!",
          description: "Congratulations on reaching your target",
          primaryAction: {
            label: "Set New Goal",
            onClick: () => window.location.assign('/learning/goals')
          },
          secondaryAction: {
            label: "View Progress",
            onClick: () => navigateToProgress()
          }
        };
      
      default:
        return null;
    }
  };

  const actions = getContextualActions();
  if (!actions) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-blue-900">{actions.title}</h3>
          <p className="text-sm text-blue-700">{actions.description}</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={actions.secondaryAction.onClick}
          >
            {actions.secondaryAction.label}
          </Button>
          <Button 
            size="sm"
            onClick={actions.primaryAction.onClick}
          >
            {actions.primaryAction.label}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QuickAccessToolbar() {
  const { 
    currentDebateId, 
    activeProgress, 
    unreadCount,
    navigateToReflection,
    navigateToProgress 
  } = useLearningNavigation();

  const quickActions = [
    {
      label: "New Reflection",
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: () => currentDebateId && navigateToReflection(currentDebateId),
      badge: currentDebateId ? 'Ready' : undefined,
      disabled: !currentDebateId
    },
    {
      label: "View Progress",
      icon: <BarChart3 className="h-4 w-4" />,
      onClick: () => navigateToProgress(),
      badge: activeProgress ? `${activeProgress.progress}%` : undefined
    },
    {
      label: "Achievements",
      icon: <Trophy className="h-4 w-4" />,
      onClick: () => window.location.assign('/learning/achievements')
    },
    {
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
      onClick: () => window.location.assign('/learning/notifications'),
      badge: unreadCount || undefined
    }
  ];

  return (
    <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-lg">
      {quickActions.map((action) => (
        <Button
          key={action.label}
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
          className="relative"
        >
          {action.icon}
          <span className="ml-2 hidden sm:inline">{action.label}</span>
          {action.badge && (
            <Badge 
              variant="secondary" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {typeof action.badge === 'number' && action.badge > 99 ? '99+' : action.badge}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}

interface LearningWidgetProps {
  variant: 'compact' | 'detailed';
  className?: string;
}

export function LearningWidget({ variant = 'compact', className }: LearningWidgetProps) {
  const { 
    activeProgress, 
    unreadCount, 
    currentDebateId,
    navigateToReflection,
    navigateToProgress 
  } = useLearningNavigation();

  if (variant === 'compact') {
    return (
      <div className={cn("bg-card border rounded-lg p-4", className)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Learning Center</h3>
          <Badge variant="outline">{unreadCount || 0}</Badge>
        </div>
        <div className="space-y-2">
          {currentDebateId && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigateToReflection(currentDebateId)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Reflection
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => navigateToProgress()}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Progress
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border rounded-lg p-6", className)}>
      <h3 className="font-semibold mb-4">Learning Progress</h3>
      
      {activeProgress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Current {activeProgress.type}</span>
            <span>{activeProgress.progress}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${activeProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="flex flex-col items-center p-4 h-auto"
          onClick={() => navigateToProgress()}
        >
          <BarChart3 className="h-6 w-6 mb-2" />
          <span className="text-sm">Progress</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex flex-col items-center p-4 h-auto"
          onClick={() => window.location.assign('/learning/achievements')}
        >
          <Trophy className="h-6 w-6 mb-2" />
          <span className="text-sm">Achievements</span>
        </Button>
      </div>
    </div>
  );
}
