'use client';

/**
 * Phase 6 Task 6.1.2: ParticipantList Component
 * 
 * Compact overview of debate participants with status indicators,
 * positions, and interactive features
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ParticipantInfo } from '@/types/debate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ParticipantAvatar } from './ParticipantAvatar';
import { PositionBadge } from './PositionBadge';
import { PresenceIndicator, TypingIndicator } from './PresenceIndicator';
import { 
  Users, 
  Crown, 
  Shield, 
  Mic,
  MicOff,
  MoreHorizontal
} from 'lucide-react';

export interface ParticipantListProps {
  participants: ParticipantInfo[];
  currentUserId: string;
  layout?: 'horizontal' | 'vertical' | 'grid';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showPositions?: boolean;
  showPresence?: boolean;
  showTyping?: boolean;
  interactive?: boolean;
  maxVisible?: number;
  className?: string;
  onParticipantClick?: (participant: ParticipantInfo) => void;
}

interface ParticipantItemProps {
  participant: ParticipantInfo;
  isCurrentUser: boolean;
  size: 'xs' | 'sm' | 'md' | 'lg';
  showPosition: boolean;
  showPresence: boolean;
  showTyping: boolean;
  interactive: boolean;
  layout: 'horizontal' | 'vertical' | 'grid';
  onClick?: (participant: ParticipantInfo) => void;
}

function ParticipantItem({
  participant,
  isCurrentUser,
  size,
  showPosition,
  showPresence,
  showTyping,
  interactive,
  layout,
  onClick
}: ParticipantItemProps) {
  const handleClick = () => {
    if (interactive && onClick) {
      onClick(participant);
    }
  };

  if (layout === 'horizontal') {
    return (
      <div 
        className={cn(
          "flex items-center space-x-3 p-2 rounded-lg transition-colors",
          interactive && "hover:bg-accent/50 cursor-pointer",
          isCurrentUser && "bg-accent/30"
        )}
        onClick={handleClick}
      >
        <ParticipantAvatar
          participant={participant}
          size={size}
          showStatus={showPresence}
          showTyping={showTyping}
          isCurrentUser={isCurrentUser}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className={cn(
              "font-medium truncate",
              size === 'xs' ? 'text-xs' : 'text-sm'
            )}>
              {participant.name}
              {isCurrentUser && (
                <span className="text-muted-foreground ml-1">(You)</span>
              )}
            </p>
            
            {showPosition && (
              <PositionBadge 
                position={participant.position}
                size={size === 'lg' ? 'sm' : 'xs'}
                showIcon={true}
              />
            )}
          </div>
          
          {showTyping && participant.isTyping && (
            <p className="text-xs text-blue-500 animate-pulse mt-0.5">
              typing...
            </p>
          )}
        </div>

        {interactive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement participant menu in later tasks
            }}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div 
        className={cn(
          "flex flex-col items-center space-y-2 p-3 rounded-lg transition-colors",
          interactive && "hover:bg-accent/50 cursor-pointer",
          isCurrentUser && "bg-accent/30"
        )}
        onClick={handleClick}
      >
        <ParticipantAvatar
          participant={participant}
          size={size}
          showStatus={showPresence}
          showTyping={showTyping}
          isCurrentUser={isCurrentUser}
        />
        
        <div className="text-center">
          <p className={cn(
            "font-medium truncate",
            size === 'xs' ? 'text-xs' : 'text-sm'
          )}>
            {participant.name}
            {isCurrentUser && (
              <span className="text-muted-foreground block text-xs">(You)</span>
            )}
          </p>
          
          {showPosition && (
            <div className="mt-1">
              <PositionBadge 
                position={participant.position}
                size="xs"
                showIcon={true}
              />
            </div>
          )}
          
          {showTyping && participant.isTyping && (
            <p className="text-xs text-blue-500 animate-pulse mt-1">
              typing...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Grid layout (default)
  return (
    <Card 
      className={cn(
        "transition-colors",
        interactive && "hover:bg-accent/50 cursor-pointer hover:shadow-md",
        isCurrentUser && "bg-accent/30 border-primary/20"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          <ParticipantAvatar
            participant={participant}
            size={size}
            showStatus={showPresence}
            showTyping={showTyping}
            isCurrentUser={isCurrentUser}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className={cn(
                "font-medium truncate",
                size === 'xs' ? 'text-xs' : 'text-sm'
              )}>
                {participant.name}
              </p>
              
              {isCurrentUser && (
                <Crown className="h-3 w-3 text-primary" title="You" />
              )}
            </div>
            
            <div className="flex items-center justify-between mt-1">
              {showPosition && (
                <PositionBadge 
                  position={participant.position}
                  size="xs"
                  showIcon={true}
                />
              )}
              
              {showPresence && (
                <PresenceIndicator
                  status={participant.isOnline ? 'online' : 'offline'}
                  lastSeen={participant.lastSeen}
                  variant="dot"
                  size="xs"
                />
              )}
            </div>
            
            {showTyping && participant.isTyping && (
              <p className="text-xs text-blue-500 animate-pulse mt-1">
                typing...
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ParticipantList({
  participants,
  currentUserId,
  layout = 'horizontal',
  size = 'md',
  showPositions = true,
  showPresence = true,
  showTyping = true,
  interactive = false,
  maxVisible,
  className,
  onParticipantClick
}: ParticipantListProps) {
  const visibleParticipants = maxVisible 
    ? participants.slice(0, maxVisible)
    : participants;
  
  const hiddenCount = maxVisible 
    ? Math.max(0, participants.length - maxVisible)
    : 0;

  const typingUsers = participants
    .filter(p => p.isTyping)
    .map(p => p.name);

  const onlineCount = participants.filter(p => p.isOnline).length;
  const proCount = participants.filter(p => p.position === 'PRO').length;
  const conCount = participants.filter(p => p.position === 'CON').length;

  const containerClasses = cn(
    layout === 'horizontal' && "space-y-1",
    layout === 'vertical' && "grid grid-cols-2 gap-2",
    layout === 'grid' && "grid grid-cols-1 md:grid-cols-2 gap-3",
    className
  );

  return (
    <div className="space-y-4">
      
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Participants ({participants.length})
          </span>
        </div>
        
        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
          <span className="flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>{onlineCount} online</span>
          </span>
          
          {showPositions && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-green-600">Pro: {proCount}</span>
              <span className="text-red-600">Con: {conCount}</span>
            </>
          )}
        </div>
      </div>

      {/* Participant List */}
      <div className={containerClasses}>
        {visibleParticipants.map((participant) => (
          <ParticipantItem
            key={participant.id}
            participant={participant}
            isCurrentUser={participant.id === currentUserId}
            size={size}
            showPosition={showPositions}
            showPresence={showPresence}
            showTyping={showTyping}
            interactive={interactive}
            layout={layout}
            onClick={onParticipantClick}
          />
        ))}
        
        {/* Show hidden count */}
        {hiddenCount > 0 && (
          <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
            +{hiddenCount} more participant{hiddenCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Typing Indicator */}
      {showTyping && typingUsers.length > 0 && (
        <div className="border-t pt-3">
          <TypingIndicator typingUsers={typingUsers} />
        </div>
      )}
    </div>
  );
}

// Simplified version for headers/footers
export function ParticipantOverview({
  participants,
  currentUserId,
  className
}: Pick<ParticipantListProps, 'participants' | 'currentUserId' | 'className'>) {
  const onlineCount = participants.filter(p => p.isOnline).length;
  const typingCount = participants.filter(p => p.isTyping).length;

  return (
    <div className={cn("flex items-center space-x-4", className)}>
      {/* Avatar stack */}
      <div className="flex -space-x-2">
        {participants.slice(0, 3).map((participant, index) => (
          <ParticipantAvatar
            key={participant.id}
            participant={participant}
            size="sm"
            showStatus={false}
            className={cn(
              "border-2 border-background",
              index > 0 && "z-10"
            )}
            style={{ zIndex: participants.length - index }}
          />
        ))}
        {participants.length > 3 && (
          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground z-0">
            +{participants.length - 3}
          </div>
        )}
      </div>

      {/* Status summary */}
      <div className="text-sm text-muted-foreground">
        <span className="font-medium">{onlineCount}</span> online
        {typingCount > 0 && (
          <span className="ml-2 text-blue-500">
            {typingCount} typing
          </span>
        )}
      </div>
    </div>
  );
}

export default ParticipantList;
