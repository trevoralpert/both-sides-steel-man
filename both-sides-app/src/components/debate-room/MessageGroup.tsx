'use client';

/**
 * Phase 6 Task 6.1.4: MessageGroup Component
 * 
 * Groups messages by time/author for better readability and reduced visual clutter
 * Implements smart grouping logic with time-based separation
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/debate';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface MessageGroupProps {
  messages: Message[];
  currentUserId: string;
  participantMap: Record<string, {
    name: string;
    avatar?: string;
    position?: 'PRO' | 'CON';
  }>;
  showTimestamps?: boolean;
  showAvatars?: boolean;
  highlightMessageId?: string;
  className?: string;
  
  // Message action handlers
  onReply?: (messageId: string, content?: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onFlag?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
}

interface GroupedMessage {
  id: string;
  messages: Message[];
  authorId: string;
  authorInfo?: {
    name: string;
    avatar?: string;
    position?: 'PRO' | 'CON';
  };
  isSystem: boolean;
  isOwn: boolean;
  startTime: Date;
  endTime: Date;
  phase?: string;
}

// Group messages by author and time proximity
function groupMessages(
  messages: Message[], 
  currentUserId: string,
  participantMap: Record<string, any>,
  maxGroupTimeGap = 5 * 60 * 1000 // 5 minutes in milliseconds
): GroupedMessage[] {
  if (messages.length === 0) return [];

  const groups: GroupedMessage[] = [];
  let currentGroup: Message[] = [messages[0]];
  let currentAuthor = messages[0].authorId;
  let currentType = messages[0].type;

  for (let i = 1; i < messages.length; i++) {
    const message = messages[i];
    const prevMessage = messages[i - 1];
    
    const timeDiff = message.timestamp.getTime() - prevMessage.timestamp.getTime();
    const sameAuthor = message.authorId === currentAuthor;
    const sameType = message.type === currentType;
    const withinTimeGap = timeDiff <= maxGroupTimeGap;

    // Group conditions: same author, same type, and within time gap
    if (sameAuthor && sameType && withinTimeGap && currentType === 'USER') {
      currentGroup.push(message);
    } else {
      // Finalize current group
      groups.push({
        id: `group-${currentGroup[0].id}`,
        messages: currentGroup,
        authorId: currentAuthor,
        authorInfo: participantMap[currentAuthor],
        isSystem: currentType === 'SYSTEM',
        isOwn: currentAuthor === currentUserId,
        startTime: currentGroup[0].timestamp,
        endTime: currentGroup[currentGroup.length - 1].timestamp,
        phase: currentGroup[0].phase
      });

      // Start new group
      currentGroup = [message];
      currentAuthor = message.authorId;
      currentType = message.type;
    }
  }

  // Don't forget the last group
  groups.push({
    id: `group-${currentGroup[0].id}`,
    messages: currentGroup,
    authorId: currentAuthor,
    authorInfo: participantMap[currentAuthor],
    isSystem: currentType === 'SYSTEM',
    isOwn: currentAuthor === currentUserId,
    startTime: currentGroup[0].timestamp,
    endTime: currentGroup[currentGroup.length - 1].timestamp,
    phase: currentGroup[0].phase
  });

  return groups;
}

// Check if we should show a date separator
function shouldShowDateSeparator(
  currentGroup: GroupedMessage,
  previousGroup?: GroupedMessage
): boolean {
  if (!previousGroup) return false;

  const currentDate = currentGroup.startTime.toDateString();
  const previousDate = previousGroup.endTime.toDateString();

  return currentDate !== previousDate;
}

// Check if we should show a phase separator
function shouldShowPhaseSeparator(
  currentGroup: GroupedMessage,
  previousGroup?: GroupedMessage
): boolean {
  if (!previousGroup || !currentGroup.phase || !previousGroup.phase) {
    return false;
  }

  return currentGroup.phase !== previousGroup.phase;
}

interface DateSeparatorProps {
  date: Date;
  className?: string;
}

function DateSeparator({ date, className }: DateSeparatorProps) {
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = date.toDateString();
    
    if (dateStr === today.toDateString()) {
      return 'Today';
    } else if (dateStr === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  return (
    <div className={cn("flex items-center justify-center py-4", className)}>
      <div className="flex items-center space-x-4 w-full max-w-xs">
        <Separator className="flex-1" />
        <Badge variant="outline" className="bg-background text-muted-foreground text-xs">
          {formatDate(date)}
        </Badge>
        <Separator className="flex-1" />
      </div>
    </div>
  );
}

interface PhaseSeparatorProps {
  phase: string;
  className?: string;
}

function PhaseSeparator({ phase, className }: PhaseSeparatorProps) {
  const formatPhase = (phase: string) => {
    return phase.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className={cn("flex items-center justify-center py-3", className)}>
      <div className="flex items-center space-x-4 w-full max-w-sm">
        <Separator className="flex-1" />
        <Badge className="bg-primary/10 text-primary text-xs">
          {formatPhase(phase)} Phase
        </Badge>
        <Separator className="flex-1" />
      </div>
    </div>
  );
}

interface MessageGroupItemProps {
  group: GroupedMessage;
  showTimestamps: boolean;
  showAvatars: boolean;
  highlightMessageId?: string;
  className?: string;
  onReply?: (messageId: string, content?: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onFlag?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
}

function MessageGroupItem({ 
  group, 
  showTimestamps, 
  showAvatars, 
  highlightMessageId,
  className,
  onReply,
  onReact,
  onFlag,
  onRetry
}: MessageGroupItemProps) {
  // System messages are handled individually
  if (group.isSystem) {
    return (
      <div className={className}>
        {group.messages.map((message) => (
          <SystemMessage
            key={message.id}
            message={message}
            showTimestamp={showTimestamps}
            compact={group.messages.length > 1}
          />
        ))}
      </div>
    );
  }

  // User messages are grouped together
  return (
    <div className={cn("space-y-1", className)}>
      {group.messages.map((message, index) => {
        const isFirst = index === 0;
        const isLast = index === group.messages.length - 1;
        const showAvatar = showAvatars && isFirst;
        const showAuthor = isFirst;
        const showMessageTimestamp = showTimestamps && (isLast || group.messages.length === 1);

        const isHighlighted = highlightMessageId === message.id;
        
        return (
          <div 
            key={message.id}
            data-message-id={message.id}
            className={cn("relative", isHighlighted && "relative")}
          >
            {isHighlighted && (
              <div className="absolute inset-0 bg-yellow-200/20 border-2 border-yellow-400 rounded-lg animate-pulse pointer-events-none" />
            )}
            <MessageBubble
              message={message}
              isOwn={group.isOwn}
              showAvatar={showAvatar}
              showTimestamp={showMessageTimestamp}
              showAuthor={showAuthor}
              isGrouped={!isFirst}
              participantInfo={group.authorInfo}
              onReply={onReply}
              onReact={onReact}
              onFlag={onFlag}
              onRetry={onRetry}
            />
          </div>
        );
      })}
    </div>
  );
}

export function MessageGroup({
  messages,
  currentUserId,
  participantMap,
  showTimestamps = true,
  showAvatars = true,
  highlightMessageId,
  className,
  onReply,
  onReact,
  onFlag,
  onRetry
}: MessageGroupProps) {
  const groups = groupMessages(messages, currentUserId, participantMap);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-0", className)}>
      {groups.map((group, index) => {
        const previousGroup = index > 0 ? groups[index - 1] : undefined;
        const showDateSep = shouldShowDateSeparator(group, previousGroup);
        const showPhaseSep = shouldShowPhaseSeparator(group, previousGroup);

        return (
          <React.Fragment key={group.id}>
            
            {/* Date Separator */}
            {showDateSep && (
              <DateSeparator date={group.startTime} />
            )}

            {/* Phase Separator */}
            {showPhaseSep && group.phase && (
              <PhaseSeparator phase={group.phase} />
            )}

            {/* Message Group */}
            <MessageGroupItem
              group={group}
              showTimestamps={showTimestamps}
              showAvatars={showAvatars}
              highlightMessageId={highlightMessageId}
              className="mb-2"
              onReply={onReply}
              onReact={onReact}
              onFlag={onFlag}
              onRetry={onRetry}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default MessageGroup;
