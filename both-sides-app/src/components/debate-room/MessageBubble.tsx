'use client';

/**
 * Phase 6 Task 6.1.4: MessageBubble Component
 * 
 * Individual message display with proper styling, timestamps, and status indicators
 * Supports user messages, system messages, and AI coaching messages
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/debate';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ParticipantAvatar } from './ParticipantAvatar';
import { PositionBadge } from './PositionBadge';
import { 
  Clock, 
  Check, 
  CheckCheck,
  AlertCircle,
  Bot,
  Shield,
  MessageSquare,
  MoreHorizontal,
  Reply,
  Heart,
  Flag,
  Edit,
  Trash2,
  Copy
} from 'lucide-react';

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  showAuthor?: boolean;
  isGrouped?: boolean;
  participantInfo?: {
    name: string;
    avatar?: string;
    position?: 'PRO' | 'CON';
  };
  className?: string;
  onReply?: (messageId: string, content?: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onFlag?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
}

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  showTimestamp?: boolean;
  isOptimistic?: boolean;
  onRetry?: () => void;
  className?: string;
}

function MessageStatus({ 
  status, 
  timestamp, 
  showTimestamp = true, 
  isOptimistic = false, 
  onRetry,
  className 
}: MessageStatusProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const statusConfig = {
    sending: { icon: Clock, color: 'text-muted-foreground', label: 'Sending...' },
    sent: { icon: Check, color: 'text-muted-foreground', label: 'Sent' },
    delivered: { icon: CheckCheck, color: 'text-blue-500', label: 'Delivered' },
    read: { icon: CheckCheck, color: 'text-blue-600', label: 'Read' },
    failed: { icon: AlertCircle, color: 'text-red-500', label: 'Failed to send' }
  };

  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <div className={cn("flex items-center space-x-1 text-xs", className)}>
      <IconComponent 
        className={cn(
          "h-3 w-3", 
          config.color,
          status === 'sending' && "animate-pulse",
          isOptimistic && "opacity-60"
        )}
        title={config.label}
      />
      {showTimestamp && (
        <span className={cn(
          "text-muted-foreground",
          isOptimistic && "opacity-60"
        )}>
          {formatTime(timestamp)}
        </span>
      )}
      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="text-red-500 hover:text-red-600 underline ml-1"
          title="Retry sending"
        >
          Retry
        </button>
      )}
    </div>
  );
}

interface MessageContentProps {
  content: string;
  type: Message['type'];
  className?: string;
}

interface ReplyContentProps {
  replyToContent: string;
  className?: string;
}

function ReplyContent({ replyToContent, className }: ReplyContentProps) {
  // Truncate long reply content
  const truncatedContent = replyToContent.length > 100 
    ? replyToContent.substring(0, 100) + '...'
    : replyToContent;

  return (
    <div className={cn(
      "border-l-2 border-muted pl-3 mb-2 text-xs text-muted-foreground bg-muted/30 rounded-r-md p-2",
      className
    )}>
      <div className="flex items-center space-x-1 mb-1">
        <Reply className="h-3 w-3" />
        <span className="font-medium">Replying to:</span>
      </div>
      <div className="italic">"{truncatedContent}"</div>
    </div>
  );
}

interface MessageActionsProps {
  messageId: string;
  isOwn: boolean;
  onReply?: (messageId: string, content?: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onFlag?: (messageId: string) => void;
  className?: string;
}

function MessageActions({ 
  messageId, 
  isOwn, 
  onReply, 
  onReact, 
  onFlag,
  className 
}: MessageActionsProps) {
  const [showActions, setShowActions] = useState(false);

  const handleReaction = (emoji: string) => {
    onReact?.(messageId, emoji);
    setShowActions(false);
  };

  const handleReply = () => {
    onReply?.(messageId);
    setShowActions(false);
  };

  const handleFlag = () => {
    onFlag?.(messageId);
    setShowActions(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setShowActions(!showActions)}
        className="p-1 rounded hover:bg-accent transition-colors"
        title="Message actions"
      >
        <MoreHorizontal className="h-3 w-3" />
      </button>

      {showActions && (
        <div className="absolute right-0 top-6 bg-popover border rounded-md shadow-lg z-10 py-1 min-w-[120px]">
          {onReply && (
            <button
              onClick={handleReply}
              className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Reply className="h-3 w-3" />
              <span>Reply</span>
            </button>
          )}
          
          {onReact && (
            <>
              <button
                onClick={() => handleReaction('👍')}
                className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm hover:bg-accent"
              >
                <span>👍</span>
                <span>Like</span>
              </button>
              <button
                onClick={() => handleReaction('❤️')}
                className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm hover:bg-accent"
              >
                <span>❤️</span>
                <span>Love</span>
              </button>
              <button
                onClick={() => handleReaction('🤔')}
                className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm hover:bg-accent"
              >
                <span>🤔</span>
                <span>Think</span>
              </button>
            </>
          )}
          
          {onFlag && !isOwn && (
            <button
              onClick={handleFlag}
              className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-red-600"
            >
              <Flag className="h-3 w-3" />
              <span>Report</span>
            </button>
          )}
        </div>
      )}

      {/* Close overlay */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
}

function MessageContent({ content, type, className }: MessageContentProps) {
  // For system and AI coaching messages, use simpler formatting
  if (type === 'SYSTEM' || type === 'AI_COACHING') {
    return (
      <div 
        className={cn(
          "text-sm leading-relaxed whitespace-pre-wrap break-words",
          type === 'SYSTEM' && "text-center text-muted-foreground",
          type === 'AI_COACHING' && "text-blue-900 dark:text-blue-100",
          className
        )}
      >
        {content}
      </div>
    );
  }

  // For user messages, use full markdown rendering
  return (
    <div className={cn("text-sm", className)}>
      <MarkdownRenderer 
        content={content}
        compact={true}
        enableLinkPreviews={true}
        enableCodeHighlighting={true}
        maxLinkPreviews={2}
      />
    </div>
  );
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
  showTimestamp = true,
  showAuthor = false,
  isGrouped = false,
  participantInfo,
  className,
  onReply,
  onReact,
  onFlag,
  onRetry
}: MessageBubbleProps) {
  const isSystem = message.type === 'SYSTEM';
  const isAICoaching = message.type === 'AI_COACHING';
  const isUser = message.type === 'USER';

  // System message layout
  if (isSystem) {
    return (
      <div className={cn("flex justify-center py-2", className)}>
        <div className="max-w-md">
          <Card className="bg-accent/50 border-dashed">
            <div className="p-3 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">
                  System
                </Badge>
              </div>
              <MessageContent content={message.content} type={message.type} />
              {showTimestamp && (
                <div className="mt-2">
                  <MessageStatus 
                    status={message.status || "delivered"} 
                    timestamp={message.timestamp}
                    showTimestamp={true}
                    isOptimistic={message.isOptimistic}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // AI Coaching message layout
  if (isAICoaching) {
    return (
      <div className={cn("flex justify-start py-1", className)}>
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 mt-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              {showAuthor && (
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium text-blue-600">AI Coach</span>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    Suggestion
                  </Badge>
                </div>
              )}
              
              <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <div className="p-3">
                  <MessageContent content={message.content} type={message.type} />
                  {showTimestamp && (
                    <div className="mt-2">
                      <MessageStatus 
                        status={message.status || "delivered"} 
                        timestamp={message.timestamp}
                        showTimestamp={true}
                        isOptimistic={message.isOptimistic}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User message layout
  return (
    <div 
      className={cn(
        "flex py-1",
        isOwn ? "justify-end" : "justify-start",
        className
      )}
    >
      <div className={cn(
        "max-w-[85%] sm:max-w-[75%]",
        isOwn && "ml-auto"
      )}>
        <div className={cn(
          "flex items-start space-x-2",
          isOwn && "flex-row-reverse space-x-reverse"
        )}>
          
          {/* Avatar */}
          {showAvatar && !isGrouped && participantInfo && (
            <div className="flex-shrink-0 mt-1">
              <ParticipantAvatar
                userId={message.authorId}
                src={participantInfo.avatar}
                alt={participantInfo.name}
                isOnline={true}
                isTyping={false}
                size="sm"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            
            {/* Author and timestamp header */}
            {showAuthor && !isGrouped && participantInfo && (
              <div className={cn(
                "flex items-center space-x-2 mb-1",
                isOwn && "justify-end"
              )}>
                <span className="text-xs font-medium">
                  {isOwn ? 'You' : participantInfo.name}
                </span>
                {participantInfo.position && (
                  <PositionBadge 
                    position={participantInfo.position}
                    size="xs"
                    variant="outline"
                  />
                )}
                {showTimestamp && (
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}

            {/* Message bubble */}
            <Card className={cn(
              "group relative",
              isOwn ? [
                "bg-primary text-primary-foreground",
                "border-primary"
              ] : [
                "bg-card",
                "hover:bg-accent/50"
              ],
              message.isOptimistic && "opacity-70 animate-pulse",
              message.status === 'failed' && "border-red-200 bg-red-50 dark:bg-red-950/20",
              "transition-all duration-200"
            )}>
              <div className="p-3">
                
                {/* Reply content if this is a reply */}
                {message.replyToContent && (
                  <ReplyContent 
                    replyToContent={message.replyToContent}
                    className={isOwn ? "border-l-primary-foreground/20" : ""}
                  />
                )}

                <MessageContent 
                  content={message.content} 
                  type={message.type}
                  className={isOwn ? "text-primary-foreground" : ""}
                />

                {/* Message reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {message.reactions.reduce((acc, reaction) => {
                      const existing = acc.find(r => r.emoji === reaction.emoji);
                      if (existing) {
                        existing.count++;
                        existing.userIds.push(reaction.userId);
                      } else {
                        acc.push({
                          emoji: reaction.emoji,
                          count: 1,
                          userIds: [reaction.userId]
                        });
                      }
                      return acc;
                    }, [] as { emoji: string; count: number; userIds: string[] }[]).map((reactionGroup, index) => (
                      <button
                        key={index}
                        className={cn(
                          "inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs border",
                          "hover:bg-accent transition-colors",
                          isOwn ? "border-primary-foreground/20 hover:bg-primary-foreground/10" : ""
                        )}
                        title={`${reactionGroup.userIds.length} reaction${reactionGroup.userIds.length !== 1 ? 's' : ''}`}
                      >
                        <span>{reactionGroup.emoji}</span>
                        <span>{reactionGroup.count}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Message footer with status/timestamp/actions */}
                <div className={cn(
                  "flex items-center justify-between mt-2",
                  isOwn ? "justify-end" : "justify-start"
                )}>
                  {showTimestamp && (
                    <MessageStatus 
                      status={message.status || (isOwn ? "delivered" : "read")}
                      timestamp={message.timestamp}
                      showTimestamp={isGrouped}
                      isOptimistic={message.isOptimistic}
                      onRetry={message.status === 'failed' ? () => onRetry?.(message.id) : undefined}
                      className={isOwn ? "text-primary-foreground/70" : ""}
                    />
                  )}
                  
                  {/* Message actions (hidden until hover) */}
                  {(onReply || onReact || onFlag) && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <MessageActions
                        messageId={message.id}
                        isOwn={isOwn}
                        onReply={(messageId) => onReply?.(messageId, message.content)}
                        onReact={onReact}
                        onFlag={onFlag}
                        className={isOwn ? "text-primary-foreground" : ""}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
