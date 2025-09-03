/**
 * Learning Navigation Provider
 * 
 * Task 7.5.3: Provides contextual navigation and workflow integration
 * for learning analytics and reflection features throughout the app.
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

interface LearningNavigationState {
  // Current learning context
  currentDebateId?: string;
  pendingReflectionId?: string;
  activeProgress?: {
    type: 'reflection' | 'assessment' | 'goal';
    id: string;
    progress: number;
  };
  
  // Navigation state
  lastViewedDashboard?: 'student' | 'teacher';
  breadcrumbs: Array<{
    label: string;
    href: string;
    current?: boolean;
  }>;
  
  // Notification state
  notifications: LearningNotification[];
  unreadCount: number;
}

interface LearningNotification {
  id: string;
  type: 'reflection_due' | 'feedback_received' | 'milestone_achieved' | 'assessment_ready';
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface LearningNavigationContextType extends LearningNavigationState {
  // Navigation actions
  navigateToReflection: (debateId: string) => void;
  navigateToProgress: (studentId?: string) => void;
  navigateToAnalytics: (view?: 'class' | 'student') => void;
  
  // Context management
  setDebateContext: (debateId: string) => void;
  clearContext: () => void;
  updateProgress: (type: string, id: string, progress: number) => void;
  
  // Notification management
  markNotificationRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
  addNotification: (notification: Omit<LearningNotification, 'id' | 'createdAt' | 'read'>) => void;
  
  // Breadcrumb management
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; href: string; current?: boolean }>) => void;
  addBreadcrumb: (breadcrumb: { label: string; href: string }) => void;
}

const LearningNavigationContext = createContext<LearningNavigationContextType | undefined>(undefined);

interface LearningNavigationProviderProps {
  children: React.ReactNode;
}

export function LearningNavigationProvider({ children }: LearningNavigationProviderProps) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  
  const [state, setState] = useState<LearningNavigationState>({
    breadcrumbs: [],
    notifications: [],
    unreadCount: 0
  });

  // Initialize notifications when user is loaded
  useEffect(() => {
    if (user?.id && state.notifications.length === 0) {
      initializeNotifications();
    }
  }, [user?.id]);

  // Update breadcrumbs based on current path
  useEffect(() => {
    updateBreadcrumbsFromPath();
  }, [pathname]);

  const initializeNotifications = async () => {
    // In a real app, fetch from API
    const mockNotifications: LearningNotification[] = [
      {
        id: '1',
        type: 'reflection_due',
        title: 'Reflection Due Soon',
        message: 'Your reflection for the Climate Change debate is due in 2 hours',
        actionUrl: '/learning/reflections/pending',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        read: false,
        priority: 'high'
      },
      {
        id: '2',
        type: 'feedback_received',
        title: 'New Feedback Available',
        message: 'Your teacher has provided feedback on your latest reflection',
        actionUrl: '/learning/reflections/reviewed',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        read: false,
        priority: 'medium'
      },
      {
        id: '3',
        type: 'milestone_achieved',
        title: 'Milestone Achieved!',
        message: 'Congratulations! You completed 10 reflections',
        actionUrl: '/learning/achievements',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        read: false,
        priority: 'low'
      }
    ];

    setState(prev => ({
      ...prev,
      notifications: mockNotifications,
      unreadCount: mockNotifications.filter(n => !n.read).length
    }));
  };

  const updateBreadcrumbsFromPath = () => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: Array<{ label: string; href: string; current?: boolean }> = [];

    // Always start with home
    breadcrumbs.push({ label: 'Home', href: '/' });

    // Build breadcrumbs based on path
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      let label = segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Custom labels for known routes
      switch (segment) {
        case 'learning':
          label = 'Learning Center';
          break;
        case 'reflections':
          label = 'Reflections';
          break;
        case 'progress':
          label = 'Progress';
          break;
        case 'achievements':
          label = 'Achievements';
          break;
        case 'analytics':
          label = 'Analytics';
          break;
        case 'dashboard':
          label = 'Dashboard';
          break;
      }

      breadcrumbs.push({
        label,
        href: currentPath,
        current: isLast
      });
    });

    setState(prev => ({ ...prev, breadcrumbs }));
  };

  const navigateToReflection = (debateId: string) => {
    setState(prev => ({ ...prev, currentDebateId: debateId }));
    
    // Check if user has a pending reflection for this debate
    checkPendingReflection(debateId).then(reflectionId => {
      if (reflectionId) {
        router.push(`/learning/reflections/${reflectionId}`);
      } else {
        router.push(`/learning/reflections/create?debateId=${debateId}`);
      }
    });
  };

  const navigateToProgress = (studentId?: string) => {
    setState(prev => ({ ...prev, lastViewedDashboard: 'student' }));
    
    if (studentId) {
      router.push(`/learning/progress/student/${studentId}`);
    } else {
      router.push('/learning/progress');
    }
  };

  const navigateToAnalytics = (view: 'class' | 'student' = 'class') => {
    setState(prev => ({ ...prev, lastViewedDashboard: view === 'class' ? 'teacher' : 'student' }));
    
    if (view === 'class') {
      router.push('/teacher/analytics');
    } else {
      router.push('/learning/dashboard');
    }
  };

  const setDebateContext = (debateId: string) => {
    setState(prev => ({ ...prev, currentDebateId: debateId }));
    
    // Show contextual prompt for reflection
    toast({
      title: "Debate Completed!",
      description: "Ready to reflect on your debate experience?",
      action: (
        <button 
          onClick={() => navigateToReflection(debateId)}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
        >
          Start Reflection
        </button>
      ),
    });
  };

  const clearContext = () => {
    setState(prev => ({
      ...prev,
      currentDebateId: undefined,
      pendingReflectionId: undefined,
      activeProgress: undefined
    }));
  };

  const updateProgress = (type: string, id: string, progress: number) => {
    setState(prev => ({
      ...prev,
      activeProgress: { type: type as any, id, progress }
    }));

    // Show progress notifications at key milestones
    if (progress === 50) {
      toast({
        title: "Halfway There!",
        description: `You're 50% complete with your ${type}`,
      });
    } else if (progress === 100) {
      toast({
        title: "Completed!",
        description: `Great job completing your ${type}`,
      });
    }
  };

  const markNotificationRead = (notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1)
    }));
  };

  const clearAllNotifications = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
  };

  const addNotification = (notification: Omit<LearningNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: LearningNotification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      read: false
    };

    setState(prev => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications].slice(0, 50), // Keep only 50 most recent
      unreadCount: prev.unreadCount + 1
    }));

    // Show toast for high priority notifications
    if (notification.priority === 'high') {
      toast({
        title: notification.title,
        description: notification.message,
        action: notification.actionUrl ? (
          <button 
            onClick={() => router.push(notification.actionUrl!)}
            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
          >
            View
          </button>
        ) : undefined,
      });
    }
  };

  const setBreadcrumbs = (breadcrumbs: Array<{ label: string; href: string; current?: boolean }>) => {
    setState(prev => ({ ...prev, breadcrumbs }));
  };

  const addBreadcrumb = (breadcrumb: { label: string; href: string }) => {
    setState(prev => ({
      ...prev,
      breadcrumbs: [
        ...prev.breadcrumbs.map(b => ({ ...b, current: false })),
        { ...breadcrumb, current: true }
      ]
    }));
  };

  const contextValue: LearningNavigationContextType = {
    ...state,
    navigateToReflection,
    navigateToProgress,
    navigateToAnalytics,
    setDebateContext,
    clearContext,
    updateProgress,
    markNotificationRead,
    clearAllNotifications,
    addNotification,
    setBreadcrumbs,
    addBreadcrumb
  };

  return (
    <LearningNavigationContext.Provider value={contextValue}>
      {children}
    </LearningNavigationContext.Provider>
  );
}

export function useLearningNavigation() {
  const context = useContext(LearningNavigationContext);
  if (context === undefined) {
    throw new Error('useLearningNavigation must be used within a LearningNavigationProvider');
  }
  return context;
}

// Helper functions
async function checkPendingReflection(debateId: string): Promise<string | null> {
  // In a real app, this would make an API call
  // For now, simulate checking for pending reflection
  return Math.random() > 0.5 ? `reflection-${debateId}` : null;
}
