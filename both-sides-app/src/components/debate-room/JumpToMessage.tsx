'use client';

/**
 * Phase 6 Task 6.2.5: Jump to Message Component
 * 
 * Navigation component for jumping to specific messages by ID,
 * timestamp, or message index with smooth scrolling and highlighting
 */

import React, { useState } from 'react';

import { cn } from '@/lib/utils';
import { Message } from '@/types/debate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Navigation,
  Hash,
  Calendar,
  Clock,
  ArrowRight,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

export interface JumpToMessageProps {
  messages: Message[];
  currentMessageIndex?: number;
  onJumpToMessage: (messageId: string) => Promise<boolean>;
  onJumpToTimestamp: (timestamp: Date) => Promise<boolean>;
  participantMap: Record<string, {
    name: string;
    avatar?: string;
    position?: 'PRO' | 'CON';
  }>;
  className?: string;
}

interface MessagePreview {
  message: Message;
  participantName: string;
  position?: 'PRO' | 'CON';
}

// Quick message preview component
function MessagePreviewCard({ message, participantName, position, onClick }: {
  message: Message;
  participantName: string;
  position?: 'PRO' | 'CON';
  onClick: () => void;
}) {
  const preview = message.content.length > 100 
    ? message.content.substring(0, 100) + '...'
    : message.content;
  
  return (
    <Card 
      className={cn(
        "p-3 cursor-pointer hover:bg-accent/50 transition-colors border-l-4",
        position === 'PRO' ? 'border-l-green-500' : 'border-l-red-500'
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{participantName}</span>
            <Badge variant={position === 'PRO' ? 'default' : 'destructive'}>
              {position}
            </Badge>
          </div>
          <span className="text-muted-foreground">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {preview}
        </p>
      </div>
    </Card>
  );
}

export function JumpToMessage({
  messages,
  currentMessageIndex,
  onJumpToMessage,
  onJumpToTimestamp,
  participantMap,
  className
}: JumpToMessageProps) {
  const [activeTab, setActiveTab] = useState('message-id');
  const [messageIdInput, setMessageIdInput] = useState('');
  const [timestampInput, setTimestampInput] = useState('');
  const [messageIndexInput, setMessageIndexInput] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastJumpResult, setLastJumpResult] = useState<{
    success: boolean;
    method: string;
    target: string;
  } | null>(null);
  
  // Get current message info
  const currentMessage = currentMessageIndex !== undefined ? messages[currentMessageIndex] : null;
  const currentParticipant = currentMessage ? participantMap[currentMessage.authorId] : null;
  
  // Get nearby messages for context
  const nearbyMessages: MessagePreview[] = React.useMemo(() => {
    if (currentMessageIndex === undefined) return [];
    
    const radius = 2; // Show 2 messages before and after
    const start = Math.max(0, currentMessageIndex - radius);
    const end = Math.min(messages.length, currentMessageIndex + radius + 1);
    
    return messages.slice(start, end).map(message => ({
      message,
      participantName: participantMap[message.authorId]?.name || 'Unknown',
      position: participantMap[message.authorId]?.position
    }));
  }, [messages, currentMessageIndex, participantMap]);
  
  // Jump to message by ID
  const handleJumpToMessageId = async () => {
    if (!messageIdInput.trim()) return;
    
    setIsNavigating(true);
    try {
      const success = await onJumpToMessage(messageIdInput.trim());
      setLastJumpResult({
        success,
        method: 'Message ID',
        target: messageIdInput.trim()
      });
      if (success) {
        setMessageIdInput('');
      }
    } catch (error) {
      setLastJumpResult({
        success: false,
        method: 'Message ID',
        target: messageIdInput.trim()
      });
    } finally {
      setIsNavigating(false);
    }
  };
  
  // Jump to timestamp
  const handleJumpToTimestamp = async () => {
    if (!timestampInput.trim()) return;
    
    const timestamp = new Date(timestampInput);
    if (isNaN(timestamp.getTime())) {
      setLastJumpResult({
        success: false,
        method: 'Timestamp',
        target: timestampInput
      });
      return;
    }
    
    setIsNavigating(true);
    try {
      const success = await onJumpToTimestamp(timestamp);
      setLastJumpResult({
        success,
        method: 'Timestamp',
        target: timestampInput
      });
      if (success) {
        setTimestampInput('');
      }
    } catch (error) {
      setLastJumpResult({
        success: false,
        method: 'Timestamp',
        target: timestampInput
      });
    } finally {
      setIsNavigating(false);
    }
  };
  
  // Jump to message index
  const handleJumpToIndex = async () => {
    const index = parseInt(messageIndexInput);
    if (isNaN(index) || index < 0 || index >= messages.length) {
      setLastJumpResult({
        success: false,
        method: 'Message Index',
        target: messageIndexInput
      });
      return;
    }
    
    const message = messages[index];
    if (!message) return;
    
    setIsNavigating(true);
    try {
      const success = await onJumpToMessage(message.id);
      setLastJumpResult({
        success,
        method: 'Message Index',
        target: `#${index}`
      });
      if (success) {
        setMessageIndexInput('');
      }
    } catch (error) {
      setLastJumpResult({
        success: false,
        method: 'Message Index',
        target: `#${index}`
      });
    } finally {
      setIsNavigating(false);
    }
  };
  
  // Navigate to adjacent messages
  const handleNavigatePrevious = async () => {
    if (currentMessageIndex === undefined || currentMessageIndex <= 0) return;
    const prevMessage = messages[currentMessageIndex - 1];
    if (prevMessage) {
      await onJumpToMessage(prevMessage.id);
    }
  };
  
  const handleNavigateNext = async () => {
    if (currentMessageIndex === undefined || currentMessageIndex >= messages.length - 1) return;
    const nextMessage = messages[currentMessageIndex + 1];
    if (nextMessage) {
      await onJumpToMessage(nextMessage.id);
    }
  };
  
  // Jump to first/last message
  const handleJumpToFirst = async () => {
    if (messages.length > 0) {
      await onJumpToMessage(messages[0].id);
    }
  };
  
  const handleJumpToLast = async () => {
    if (messages.length > 0) {
      await onJumpToMessage(messages[messages.length - 1].id);
    }
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Position */}
      {currentMessage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Current Position</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Message {(currentMessageIndex ?? 0) + 1} of {messages.length}</span>
              <Badge variant="outline">
                {Math.round(((currentMessageIndex ?? 0) / Math.max(messages.length - 1, 1)) * 100)}%
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleJumpToFirst}
                      disabled={currentMessageIndex === 0}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>First message</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNavigatePrevious}
                      disabled={currentMessageIndex === undefined || currentMessageIndex <= 0}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Previous message</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNavigateNext}
                      disabled={currentMessageIndex === undefined || currentMessageIndex >= messages.length - 1}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Next message</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleJumpToLast}
                      disabled={currentMessageIndex === messages.length - 1}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Latest message</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Jump Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center space-x-2">
            <Navigation className="h-4 w-4" />
            <span>Jump to Message</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="message-id" className="text-xs">
                <Hash className="h-3 w-3 mr-1" />
                ID
              </TabsTrigger>
              <TabsTrigger value="timestamp" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Time
              </TabsTrigger>
              <TabsTrigger value="index" className="text-xs">
                <Search className="h-3 w-3 mr-1" />
                Index
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="message-id" className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-2 block">Message ID</label>
                <div className="flex space-x-2">
                  <Input
                    value={messageIdInput}
                    onChange={(e) => setMessageIdInput(e.target.value)}
                    placeholder="Enter message ID..."
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleJumpToMessageId()}
                  />
                  <Button
                    onClick={handleJumpToMessageId}
                    disabled={!messageIdInput.trim() || isNavigating}
                    size="sm"
                  >
                    Jump
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="timestamp" className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-2 block">Timestamp</label>
                <div className="flex space-x-2">
                  <Input
                    type="datetime-local"
                    value={timestampInput}
                    onChange={(e) => setTimestampInput(e.target.value)}
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleJumpToTimestamp()}
                  />
                  <Button
                    onClick={handleJumpToTimestamp}
                    disabled={!timestampInput.trim() || isNavigating}
                    size="sm"
                  >
                    Jump
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="index" className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-2 block">
                  Message Index (0 to {messages.length - 1})
                </label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    min="0"
                    max={messages.length - 1}
                    value={messageIndexInput}
                    onChange={(e) => setMessageIndexInput(e.target.value)}
                    placeholder="Enter index..."
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleJumpToIndex()}
                  />
                  <Button
                    onClick={handleJumpToIndex}
                    disabled={!messageIndexInput.trim() || isNavigating}
                    size="sm"
                  >
                    Jump
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Result feedback */}
          {lastJumpResult && (
            <div className={cn(
              "mt-3 p-2 rounded text-xs",
              lastJumpResult.success 
                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
            )}>
              {lastJumpResult.success 
                ? `Successfully jumped to ${lastJumpResult.target} via ${lastJumpResult.method}`
                : `Failed to find ${lastJumpResult.target} via ${lastJumpResult.method}`
              }
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Nearby Messages Context */}
      {nearbyMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Nearby Messages</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nearbyMessages.map((preview, index) => (
                <MessagePreviewCard
                  key={preview.message.id}
                  message={preview.message}
                  participantName={preview.participantName}
                  position={preview.position}
                  onClick={() => onJumpToMessage(preview.message.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default JumpToMessage;
