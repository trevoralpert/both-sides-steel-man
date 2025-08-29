'use client';

/**
 * Phase 6 Task 6.1.2: ParticipantAvatar Component
 * 
 * Avatar component with real-time presence indicators and typing status
 * Includes fallbacks for missing avatar images and accessibility features
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ParticipantInfo } from '@/types/debate';
import { 
  Circle, 
  Clock, 
  Wifi, 
  WifiOff,
  User
} from 'lucide-react';

export interface ParticipantAvatarProps {
  participant: ParticipantInfo;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  showTyping?: boolean;
  showName?: boolean;
  isCurrentUser?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeConfig = {
  xs: {
    avatar: 'h-6 w-6',
    text: 'text-xs',
    status: 'h-2 w-2',
    statusPosition: '-bottom-0 -right-0'
  },
  sm: {
    avatar: 'h-8 w-8',
    text: 'text-xs',
    status: 'h-2.5 w-2.5',
    statusPosition: '-bottom-0.5 -right-0.5'
  },
  md: {
    avatar: 'h-10 w-10',
    text: 'text-sm',
    status: 'h-3 w-3',
    statusPosition: '-bottom-0.5 -right-0.5'
  },
  lg: {
    avatar: 'h-12 w-12',
    text: 'text-sm',
    status: 'h-3.5 w-3.5',
    statusPosition: '-bottom-0.5 -right-0.5'
  },
  xl: {
    avatar: 'h-16 w-16',
    text: 'text-base',
    status: 'h-4 w-4',
    statusPosition: '-bottom-1 -right-1'
  }
};

interface PresenceStatusProps {
  isOnline: boolean;
  isTyping: boolean;
  lastSeen?: Date;
  size: keyof typeof sizeConfig;
  className?: string;
}

function PresenceStatus({ isOnline, isTyping, lastSeen, size, className }: PresenceStatusProps) {
  const config = sizeConfig[size];
  
  if (isTyping) {
    return (
      <div 
        className={cn(
          "absolute rounded-full bg-blue-500 border-2 border-background",
          "flex items-center justify-center animate-pulse",
          config.status,
          config.statusPosition,
          className
        )}
        title="Typing..."
        aria-label="User is typing"
      >
        <Circle className="h-1 w-1 fill-white text-white animate-bounce" />
      </div>
    );
  }

  if (isOnline) {
    return (
      <Circle 
        className={cn(
          "absolute rounded-full border-2 border-background",
          "fill-green-500 text-green-500",
          config.status,
          config.statusPosition,
          className
        )}
        title="Online"
        aria-label="User is online"
      />
    );
  }

  // Offline status
  const getOfflineTime = () => {
    if (!lastSeen) return 'Offline';
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <Circle 
      className={cn(
        "absolute rounded-full border-2 border-background",
        "fill-gray-400 text-gray-400",
        config.status,
        config.statusPosition,
        className
      )}
      title={getOfflineTime()}
      aria-label={`User was last seen ${getOfflineTime()}`}
    />
  );
}

function generateInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function getAvatarGradient(name: string): string {
  // Generate consistent gradient based on name hash
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const colors = [
    'from-blue-400 to-purple-500',
    'from-green-400 to-blue-500', 
    'from-purple-400 to-pink-500',
    'from-yellow-400 to-orange-500',
    'from-red-400 to-pink-500',
    'from-indigo-400 to-purple-500',
    'from-teal-400 to-blue-500',
    'from-orange-400 to-red-500'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

export function ParticipantAvatar({
  participant,
  size = 'md',
  showStatus = true,
  showTyping = true,
  showName = false,
  isCurrentUser = false,
  className,
  onClick
}: ParticipantAvatarProps) {
  const config = sizeConfig[size];
  const initials = generateInitials(participant.name);
  const gradient = getAvatarGradient(participant.name);

  const avatarElement = (
    <div 
      className={cn(
        "relative group",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
    >
      <Avatar className={config.avatar}>
        {participant.avatar && (
          <AvatarImage 
            src={participant.avatar} 
            alt={`${participant.name}'s avatar`}
            className="object-cover"
          />
        )}
        <AvatarFallback 
          className={cn(
            "bg-gradient-to-br text-white font-semibold",
            gradient,
            config.text
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Presence Status Indicator */}
      {showStatus && (
        <PresenceStatus
          isOnline={participant.isOnline}
          isTyping={showTyping && participant.isTyping}
          lastSeen={participant.lastSeen}
          size={size}
        />
      )}

      {/* Tooltip for hover state */}
      {onClick && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
            View {participant.name}{isCurrentUser && ' (You)'}
          </div>
        </div>
      )}
    </div>
  );

  if (showName) {
    return (
      <div className="flex items-center space-x-2">
        {avatarElement}
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium truncate", config.text)}>
            {participant.name}
            {isCurrentUser && (
              <span className="text-muted-foreground ml-1">(You)</span>
            )}
          </p>
          {showTyping && participant.isTyping && (
            <p className="text-xs text-blue-500 animate-pulse">
              typing...
            </p>
          )}
        </div>
      </div>
    );
  }

  return avatarElement;
}

export default ParticipantAvatar;
