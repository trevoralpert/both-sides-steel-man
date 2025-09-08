/**
 * Teacher Dashboard Provider
 * 
 * Task 8.1.1: Global state management context for the teacher dashboard,
 * handling shared state, notifications, and user preferences.
 */

'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

import { useUser } from '@clerk/nextjs';

// Types
interface DashboardNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  persistent?: boolean;
  actionLabel?: string;
  actionHref?: string;
}

interface DashboardPreferences {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  widgetLayout: string[];
  defaultClassView: 'grid' | 'list';
}

interface DashboardState {
  loading: boolean;
  notifications: DashboardNotification[];
  unreadCount: number;
  preferences: DashboardPreferences;
  selectedClassId: string | null;
  lastRefresh: Date | null;
  error: string | null;
}

type DashboardAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<DashboardNotification, 'id' | 'timestamp'> }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<DashboardPreferences> }
  | { type: 'SET_SELECTED_CLASS'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REFRESH_DATA' };

// Default state
const defaultPreferences: DashboardPreferences = {
  sidebarCollapsed: false,
  theme: 'system',
  notificationsEnabled: true,
  widgetLayout: ['overview', 'classes', 'recent-activity'],
  defaultClassView: 'grid'
};

const initialState: DashboardState = {
  loading: false,
  notifications: [],
  unreadCount: 0,
  preferences: defaultPreferences,
  selectedClassId: null,
  lastRefresh: null,
  error: null
};

// Reducer
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'ADD_NOTIFICATION':
      const newNotification: DashboardNotification = {
        ...action.payload,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        read: false
      };
      const updatedNotifications = [newNotification, ...state.notifications];
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length
      };
    
    case 'MARK_NOTIFICATION_READ':
      const readNotifications = state.notifications.map(n =>
        n.id === action.payload ? { ...n, read: true } : n
      );
      return {
        ...state,
        notifications: readNotifications,
        unreadCount: readNotifications.filter(n => !n.read).length
      };
    
    case 'REMOVE_NOTIFICATION':
      const filteredNotifications = state.notifications.filter(n => n.id !== action.payload);
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter(n => !n.read).length
      };
    
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload }
      };
    
    case 'SET_SELECTED_CLASS':
      return { ...state, selectedClassId: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'REFRESH_DATA':
      return { ...state, lastRefresh: new Date() };
    
    default:
      return state;
  }
}

// Context
interface DashboardContextType {
  state: DashboardState;
  addNotification: (notification: Omit<DashboardNotification, 'id' | 'timestamp'>) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  updatePreferences: (preferences: Partial<DashboardPreferences>) => void;
  setSelectedClass: (classId: string | null) => void;
  setError: (error: string | null) => void;
  refreshData: () => void;
  setLoading: (loading: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Provider
interface TeacherDashboardProviderProps {
  children: ReactNode;
}

export function TeacherDashboardProvider({ children }: TeacherDashboardProviderProps) {
  const { user } = useUser();
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Load user preferences on mount
  useEffect(() => {
    if (user?.id) {
      loadUserPreferences();
      initializeNotifications();
    }
  }, [user?.id]);

  // Save preferences when they change
  useEffect(() => {
    if (user?.id) {
      saveUserPreferences();
    }
  }, [state.preferences, user?.id]);

  const loadUserPreferences = async () => {
    try {
      const stored = localStorage.getItem(`dashboard-prefs-${user?.id}`);
      if (stored) {
        const preferences = JSON.parse(stored);
        dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  };

  const saveUserPreferences = async () => {
    try {
      localStorage.setItem(
        `dashboard-prefs-${user?.id}`,
        JSON.stringify(state.preferences)
      );
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  };

  const initializeNotifications = () => {
    // Check for any system-wide notifications or alerts
    // This would typically fetch from an API
    
    // For now, add a welcome notification for new users
    const lastLogin = localStorage.getItem(`last-login-${user?.id}`);
    if (!lastLogin) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'info',
          title: 'Welcome to the Teacher Dashboard!',
          message: 'Explore your new dashboard features and manage your classes effectively.',
          persistent: false,
          read: false
        }
      });
      localStorage.setItem(`last-login-${user?.id}`, new Date().toISOString());
    }
  };

  // Context methods
  const addNotification = (notification: Omit<DashboardNotification, 'id' | 'timestamp'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  };

  const markNotificationRead = (id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const updatePreferences = (preferences: Partial<DashboardPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
  };

  const setSelectedClass = (classId: string | null) => {
    dispatch({ type: 'SET_SELECTED_CLASS', payload: classId });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const refreshData = () => {
    dispatch({ type: 'REFRESH_DATA' });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const contextValue: DashboardContextType = {
    state,
    addNotification,
    markNotificationRead,
    removeNotification,
    updatePreferences,
    setSelectedClass,
    setError,
    refreshData,
    setLoading
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

// Hook
export function useTeacherDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useTeacherDashboard must be used within a TeacherDashboardProvider');
  }
  return context;
}

// Export types for use in other components
export type { DashboardNotification, DashboardPreferences, DashboardState };
