'use client';

/**
 * Phase 6 Task 6.1.2: PresenceIndicator Component
 * 
 * Flexible presence indicator for showing online/offline/typing states
 * with customizable display modes and animations
 */

import React from 'react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Circle, 
  Clock, 
  Wifi, 
  WifiOff,
  Loader2,
  User,
  MessageSquare
} from 'lucide-react';

export type PresenceStatus = 'online' | 'offline' | 'typing' | 'away' | 'connecting';

export interface PresenceIndicatorProps {
  status: PresenceStatus;
  lastSeen?: Date;
  showLabel?: boolean;
  showIcon?: boolean;
  variant?: 'dot' | 'badge' | 'full';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

const statusConfig = {
  online: {
    color: 'bg-green-500 text-green-500 border-green-200',
    badgeColor: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400',
    label: 'Online',
    icon: Wifi
  },
  offline: {
    color: 'bg-gray-400 text-gray-400 border-gray-200',
    badgeColor: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400',
    label: 'Offline',
    icon: WifiOff
  },
  typing: {
    color: 'bg-blue-500 text-blue-500 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
    label: 'Typing',
    icon: MessageSquare
  },
  away: {
    color: 'bg-yellow-500 text-yellow-500 border-yellow-200',
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
    label: 'Away',
    icon: Clock
  },
  connecting: {
    color: 'bg-orange-500 text-orange-500 border-orange-200',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400',
    label: 'Connecting',
    icon: Loader2
  }
};

const sizeConfig = {
  xs: {
    dot: 'h-2 w-2',
    icon: 'h-3 w-3',
    text: 'text-xs',
    badge: 'px-1.5 py-0.5 text-xs'
  },
  sm: {
    dot: 'h-2.5 w-2.5',
    icon: 'h-3.5 w-3.5',
    text: 'text-xs',
    badge: 'px-2 py-0.5 text-xs'
  },
  md: {
    dot: 'h-3 w-3',
    icon: 'h-4 w-4',
    text: 'text-sm',
    badge: 'px-2.5 py-1 text-sm'
  },
  lg: {
    dot: 'h-4 w-4',
    icon: 'h-5 w-5',
    text: 'text-base',
    badge: 'px-3 py-1.5 text-base'
  }
};

function formatLastSeen(lastSeen: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

export function PresenceIndicator({
  status,
  lastSeen,
  showLabel = false,
  showIcon = false,
  variant = 'dot',
  size = 'md',
  animate = true,
  className
}: PresenceIndicatorProps) {
  const config = statusConfig[status];
  const sizeClasses = sizeConfig[size];
  const IconComponent = config.icon;

  // Animation classes
  const getAnimationClasses = () => {
    if (!animate) return '';
    
    switch (status) {
      case 'typing':
        return 'animate-pulse';
      case 'connecting':
        return 'animate-spin';
      case 'online':
        return 'animate-pulse duration-2000';
      default:
        return '';
    }
  };

  // Dot variant - simple colored circle
  if (variant === 'dot') {
    return (
      <Circle 
        className={cn(
          "rounded-full border-2 border-background",
          config.color,
          sizeClasses.dot,
          getAnimationClasses(),
          className
        )}
        aria-label={`Status: ${config.label}`}
      />
    );
  }

  // Badge variant - colored badge with optional icon and label
  if (variant === 'badge') {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center space-x-1 border",
          config.badgeColor,
          sizeClasses.badge,
          className
        )}
        title={lastSeen && status === 'offline' ? `Last seen ${formatLastSeen(lastSeen)}` : undefined}
      >
        {showIcon && (
          <IconComponent 
            className={cn(
              sizeClasses.icon,
              getAnimationClasses()
            )} 
          />
        )}
        {showLabel && (
          <span className={sizeClasses.text}>
            {config.label}
          </span>
        )}
      </Badge>
    );
  }

  // Full variant - complete status display with icon, label, and timestamp
  if (variant === 'full') {
    return (
      <div 
        className={cn(
          "flex items-center space-x-2",
          className
        )}
        role="status"
        aria-label={`Status: ${config.label}`}
      >
        <div className="flex items-center space-x-1">
          <Circle 
            className={cn(
              "rounded-full border-2 border-background",
              config.color,
              sizeClasses.dot,
              getAnimationClasses()
            )}
          />
          <IconComponent 
            className={cn(
              config.color.replace('bg-', 'text-'),
              sizeClasses.icon,
              getAnimationClasses()
            )} 
          />
        </div>
        
        <div className="flex flex-col min-w-0">
          <span className={cn(
            "font-medium",
            sizeClasses.text,
            config.color.replace('bg-', 'text-').replace('text-', 'text-')
          )}>
            {config.label}
          </span>
          
          {lastSeen && status === 'offline' && (
            <span className={cn(
              "text-muted-foreground",
              size === 'xs' ? 'text-xs' : 'text-xs'
            )}>
              {formatLastSeen(lastSeen)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// Helper component for showing typing indicator with multiple users
export interface TypingIndicatorProps {
  typingUsers: string[];
  maxShow?: number;
  className?: string;
}

export function TypingIndicator({ 
  typingUsers, 
  maxShow = 2, 
  className 
}: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const displayUsers = typingUsers.slice(0, maxShow);
  const remainingCount = typingUsers.length - maxShow;

  const getTypingText = () => {
    if (displayUsers.length === 1) {
      return `${displayUsers[0]} is typing...`;
    }
    
    if (displayUsers.length === 2 && remainingCount === 0) {
      return `${displayUsers[0]} and ${displayUsers[1]} are typing...`;
    }
    
    if (remainingCount > 0) {
      return `${displayUsers.join(', ')} and ${remainingCount} other${remainingCount > 1 ? 's' : ''} are typing...`;
    }
    
    return `${displayUsers.join(', ')} are typing...`;
  };

  return (
    <div 
      className={cn(
        "flex items-center space-x-2 text-sm text-muted-foreground animate-pulse",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex space-x-1">
        <Circle className="h-1.5 w-1.5 fill-blue-500 animate-bounce" />
        <Circle className="h-1.5 w-1.5 fill-blue-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
        <Circle className="h-1.5 w-1.5 fill-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}

export default PresenceIndicator;
