'use client';

/**
 * Phase 6 Task 6.1.4: SystemMessage Component
 * 
 * Special styling for system messages like phase changes, user joins/leaves,
 * and other automated notifications
 */

import React from 'react';

import { cn } from '@/lib/utils';
import { Message, DebatePhase } from '@/types/debate';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Clock, 
  Users, 
  UserPlus,
  UserMinus,
  Play,
  Pause,
  StopCircle,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  MessageSquare
} from 'lucide-react';

export interface SystemMessageProps {
  message: Message;
  showTimestamp?: boolean;
  compact?: boolean;
  className?: string;
}

interface SystemMessageType {
  type: 'phase_change' | 'user_joined' | 'user_left' | 'debate_started' | 'debate_paused' | 'debate_ended' | 'notification' | 'warning' | 'info';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Parse system message content to determine type and extract data
function parseSystemMessage(content: string): {
  type: SystemMessageType['type'];
  data?: Record<string, any>;
} {
  const lowercaseContent = content.toLowerCase();

  if (lowercaseContent.includes('phase') || lowercaseContent.includes('opening') || 
      lowercaseContent.includes('discussion') || lowercaseContent.includes('rebuttal') ||
      lowercaseContent.includes('closing') || lowercaseContent.includes('preparation')) {
    return { type: 'phase_change' };
  }

  if (lowercaseContent.includes('joined') || lowercaseContent.includes('entered')) {
    return { type: 'user_joined' };
  }

  if (lowercaseContent.includes('left') || lowercaseContent.includes('disconnected')) {
    return { type: 'user_left' };
  }

  if (lowercaseContent.includes('debate started') || lowercaseContent.includes('beginning')) {
    return { type: 'debate_started' };
  }

  if (lowercaseContent.includes('paused') || lowercaseContent.includes('suspended')) {
    return { type: 'debate_paused' };
  }

  if (lowercaseContent.includes('ended') || lowercaseContent.includes('completed')) {
    return { type: 'debate_ended' };
  }

  if (lowercaseContent.includes('warning') || lowercaseContent.includes('violation')) {
    return { type: 'warning' };
  }

  if (lowercaseContent.includes('notification') || lowercaseContent.includes('reminder')) {
    return { type: 'notification' };
  }

  return { type: 'info' };
}

const systemMessageTypes: Record<SystemMessageType['type'], SystemMessageType> = {
  phase_change: {
    type: 'phase_change',
    icon: Clock,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  user_joined: {
    type: 'user_joined',
    icon: UserPlus,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  user_left: {
    type: 'user_left',
    icon: UserMinus,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  debate_started: {
    type: 'debate_started',
    icon: Play,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  debate_paused: {
    type: 'debate_paused',
    icon: Pause,
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  debate_ended: {
    type: 'debate_ended',
    icon: StopCircle,
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-950/30',
    borderColor: 'border-gray-200 dark:border-gray-800'
  },
  warning: {
    type: 'warning',
    icon: AlertCircle,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  notification: {
    type: 'notification',
    icon: Info,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  info: {
    type: 'info',
    icon: Info,
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-950/30',
    borderColor: 'border-gray-200 dark:border-gray-800'
  }
};

interface CompactSystemMessageProps extends SystemMessageProps {
  messageType: SystemMessageType;
}

function CompactSystemMessage({ 
  message, 
  messageType, 
  showTimestamp, 
  className 
}: CompactSystemMessageProps) {
  const IconComponent = messageType.icon;
  
  return (
    <div className={cn("flex items-center justify-center py-1", className)}>
      <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-accent/50">
        <IconComponent className={cn("h-3 w-3", messageType.color)} />
        <span className="text-xs text-muted-foreground">
          {message.content}
        </span>
        {showTimestamp && (
          <span className="text-xs text-muted-foreground/70">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

interface FullSystemMessageProps extends SystemMessageProps {
  messageType: SystemMessageType;
}

function FullSystemMessage({ 
  message, 
  messageType, 
  showTimestamp, 
  className 
}: FullSystemMessageProps) {
  const IconComponent = messageType.icon;
  
  return (
    <div className={cn("flex justify-center py-2", className)}>
      <div className="max-w-md w-full">
        <Card className={cn(
          "border-l-4 shadow-sm",
          messageType.bgColor,
          messageType.borderColor
        )}>
          <div className="p-4">
            <div className="flex items-start space-x-3">
              
              {/* Icon */}
              <div className={cn(
                "flex-shrink-0 p-2 rounded-full",
                messageType.bgColor
              )}>
                <IconComponent className={cn("h-4 w-4", messageType.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs capitalize",
                      messageType.color,
                      messageType.borderColor
                    )}
                  >
                    {messageType.type.replace('_', ' ')}
                  </Badge>
                  
                  {showTimestamp && (
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  )}
                </div>

                <p className={cn(
                  "mt-2 text-sm leading-relaxed",
                  messageType.color
                )}>
                  {message.content}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function SystemMessage({
  message,
  showTimestamp = true,
  compact = false,
  className
}: SystemMessageProps) {
  const { type } = parseSystemMessage(message.content);
  const messageType = systemMessageTypes[type];

  if (compact) {
    return (
      <CompactSystemMessage
        message={message}
        messageType={messageType}
        showTimestamp={showTimestamp}
        className={className}
      />
    );
  }

  return (
    <FullSystemMessage
      message={message}
      messageType={messageType}
      showTimestamp={showTimestamp}
      className={className}
    />
  );
}

// Helper function to create system messages
export function createSystemMessage(
  content: string, 
  phase?: DebatePhase,
  id?: string
): Message {
  return {
    id: id || `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    authorId: 'system',
    timestamp: new Date(),
    type: 'SYSTEM',
    phase: phase || 'PREPARATION'
  };
}

// Common system message templates
export const SystemMessageTemplates = {
  phaseChange: (newPhase: DebatePhase, timeLimit?: number) => 
    createSystemMessage(
      timeLimit 
        ? `The debate has moved to the ${newPhase.toLowerCase()} phase. You have ${timeLimit} minutes for this phase.`
        : `The debate has moved to the ${newPhase.toLowerCase()} phase.`,
      newPhase
    ),
    
  userJoined: (userName: string) => 
    createSystemMessage(`${userName} has joined the debate.`),
    
  userLeft: (userName: string) => 
    createSystemMessage(`${userName} has left the debate.`),
    
  debateStarted: () => 
    createSystemMessage('The debate has officially started. Good luck to both participants!'),
    
  debateEnded: () => 
    createSystemMessage('The debate has ended. Thank you for participating!'),
    
  warningMessage: (reason: string) => 
    createSystemMessage(`Warning: ${reason}`),
    
  reminderMessage: (reminder: string) => 
    createSystemMessage(`Reminder: ${reminder}`)
};

export default SystemMessage;
