'use client';

/**
 * Phase 6 Task 6.2.4: Activity Indicator Component
 * 
 * Shows last seen timestamps and activity status for participants
 * with smart formatting and real-time updates
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Clock, 
  Circle,
  Eye,
  Calendar,
  User
} from 'lucide-react';

export interface ActivityIndicatorProps {
  lastSeen?: Date;
  isOnline: boolean;
  variant?: 'minimal' | 'badge' | 'full' | 'tooltip';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDot?: boolean;
  updateInterval?: number; // milliseconds for live updates
  className?: string;
}

interface FormattedTime {
  text: string;
  fullText: string;
  isRecent: boolean;
}

function formatLastSeen(lastSeen?: Date): FormattedTime {
  if (!lastSeen) {
    return {
      text: 'Never',
      fullText: 'Never seen online',
      isRecent: false
    };
  }
  
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) {
    return {
      text: 'just now',
      fullText: 'Active just now',
      isRecent: true
    };
  }
  
  if (diffMins < 60) {
    return {
      text: `${diffMins}m ago`,
      fullText: `Last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`,
      isRecent: diffMins < 5
    };
  }
  
  if (diffHours < 24) {
    return {
      text: `${diffHours}h ago`,
      fullText: `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`,
      isRecent: false
    };
  }
  
  if (diffDays < 7) {
    return {
      text: `${diffDays}d ago`,
      fullText: `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`,
      isRecent: false
    };
  }
  
  return {
    text: lastSeen.toLocaleDateString(),
    fullText: `Last seen on ${lastSeen.toLocaleDateString()} at ${lastSeen.toLocaleTimeString()}`,
    isRecent: false
  };
}

const sizeConfig = {
  xs: {
    text: 'text-xs',
    icon: 'h-3 w-3',
    dot: 'h-1.5 w-1.5',
    badge: 'px-1.5 py-0.5 text-xs'
  },
  sm: {
    text: 'text-xs',
    icon: 'h-3.5 w-3.5',
    dot: 'h-2 w-2',
    badge: 'px-2 py-0.5 text-xs'
  },
  md: {
    text: 'text-sm',
    icon: 'h-4 w-4',
    dot: 'h-2.5 w-2.5',
    badge: 'px-2.5 py-1 text-sm'
  },
  lg: {
    text: 'text-base',
    icon: 'h-5 w-5',
    dot: 'h-3 w-3',
    badge: 'px-3 py-1.5 text-base'
  }
};

export function ActivityIndicator({
  lastSeen,
  isOnline,
  variant = 'minimal',
  size = 'sm',
  showIcon = true,
  showDot = true,
  updateInterval = 60000, // Update every minute
  className
}: ActivityIndicatorProps) {
  const [formattedTime, setFormattedTime] = useState<FormattedTime>(() => 
    formatLastSeen(lastSeen)
  );
  
  const sizeClasses = sizeConfig[size];
  
  // Update formatted time periodically
  useEffect(() => {
    const updateTime = () => {
      setFormattedTime(formatLastSeen(lastSeen));
    };
    
    // Update immediately
    updateTime();
    
    // Set up interval for live updates
    const interval = setInterval(updateTime, updateInterval);
    
    return () => clearInterval(interval);
  }, [lastSeen, updateInterval]);
  
  // Don't show if user is currently online (unless it's the full variant)
  if (isOnline && variant !== 'full') {
    return null;
  }
  
  const getStatusColor = () => {
    if (isOnline) return 'text-green-600 dark:text-green-400';
    if (formattedTime.isRecent) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };
  
  const getDotColor = () => {
    if (isOnline) return 'bg-green-500';
    if (formattedTime.isRecent) return 'bg-yellow-500';
    return 'bg-gray-400';
  };
  
  // Minimal variant - just the text
  if (variant === 'minimal') {
    return (
      <span 
        className={cn(
          sizeClasses.text,
          getStatusColor(),
          className
        )}
        title={formattedTime.fullText}
      >
        {isOnline ? 'Online' : formattedTime.text}
      </span>
    );
  }
  
  // Badge variant - styled badge with optional icon
  if (variant === 'badge') {
    return (
      <Badge 
        variant="outline"
        className={cn(
          "flex items-center space-x-1 border",
          sizeClasses.badge,
          isOnline 
            ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400"
            : formattedTime.isRecent
              ? "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
              : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400",
          className
        )}
        title={formattedTime.fullText}
      >
        {showDot && (
          <Circle 
            className={cn(
              sizeClasses.dot,
              "rounded-full",
              getDotColor()
            )}
          />
        )}
        {showIcon && !showDot && (
          <Clock 
            className={cn(
              sizeClasses.icon,
              getStatusColor()
            )}
          />
        )}
        <span>{isOnline ? 'Online' : formattedTime.text}</span>
      </Badge>
    );
  }
  
  // Tooltip variant - minimal display with detailed tooltip
  if (variant === 'tooltip') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center space-x-1 cursor-help",
              className
            )}>
              {showDot && (
                <Circle 
                  className={cn(
                    sizeClasses.dot,
                    "rounded-full",
                    getDotColor()
                  )}
                />
              )}
              {showIcon && (
                <Clock 
                  className={cn(
                    sizeClasses.icon,
                    getStatusColor()
                  )}
                />
              )}
              <span className={cn(
                sizeClasses.text,
                getStatusColor()
              )}>
                {isOnline ? 'Online' : formattedTime.text}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{formattedTime.fullText}</p>
            {lastSeen && (
              <p className="text-xs text-muted-foreground">
                {lastSeen.toLocaleString()}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Full variant - complete activity display with icon, status, and timestamp
  if (variant === 'full') {
    return (
      <div 
        className={cn(
          "flex items-center space-x-2",
          className
        )}
        role="status"
        aria-label={formattedTime.fullText}
      >
        <div className="flex items-center space-x-1">
          {showDot && (
            <Circle 
              className={cn(
                sizeClasses.dot,
                "rounded-full",
                getDotColor()
              )}
            />
          )}
          {showIcon && (
            <Clock 
              className={cn(
                sizeClasses.icon,
                getStatusColor()
              )}
            />
          )}
        </div>
        
        <div className="flex flex-col min-w-0">
          <span className={cn(
            "font-medium",
            sizeClasses.text,
            getStatusColor()
          )}>
            {isOnline ? 'Online' : 'Last seen'}
          </span>
          
          {!isOnline && (
            <span className={cn(
              "text-muted-foreground",
              size === 'xs' ? 'text-xs' : 'text-xs'
            )}>
              {formattedTime.text}
            </span>
          )}
        </div>
      </div>
    );
  }
  
  return null;
}

export default ActivityIndicator;
