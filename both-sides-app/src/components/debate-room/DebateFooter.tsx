'use client';

/**
 * Phase 6 Task 6.1.1: Debate Footer Component
 * 
 * Message input area with controls, character counting, and connection status
 * Includes accessibility features and responsive design
 */

import React, { useState } from 'react';

import { cn } from '@/lib/utils';
import { DebateFooterProps, ConnectionState } from '@/types/debate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  RotateCcw,
  Loader2
} from 'lucide-react';

import { MessageInput } from './MessageInput';

interface ConnectionStatusProps {
  state: ConnectionState;
  className?: string;
}

function ConnectionStatus({ state, className }: ConnectionStatusProps) {
  const config = {
    connecting: {
      icon: Loader2,
      label: 'Connecting',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
      animate: true
    },
    connected: {
      icon: Wifi,
      label: 'Connected',
      color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400',
      animate: false
    },
    disconnected: {
      icon: WifiOff,
      label: 'Disconnected',
      color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400',
      animate: false
    },
    failed: {
      icon: AlertCircle,
      label: 'Connection Failed',
      color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400',
      animate: false
    }
  };

  const { icon: IconComponent, label, color, animate } = config[state];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center space-x-1 text-xs",
        color,
        className
      )}
      role="status"
      aria-label={`Connection status: ${label}`}
    >
      <IconComponent 
        className={cn(
          "h-3 w-3",
          animate && "animate-spin"
        )} 
      />
      <span>{label}</span>
    </Badge>
  );
}



export function DebateFooter({
  onSendMessage,
  disabled = false,
  placeholder,
  maxLength = 2000,
  connectionState,
  className,
  replyToMessage,
  onCancelReply,
  onTypingStart,
  onTypingStop,
  enableAdvancedFeatures = true
}: DebateFooterProps) {
  const [message, setMessage] = useState('');

  const handleSendMessage = async (content: string) => {
    await onSendMessage(content);
  };

  const isInputDisabled = disabled || connectionState !== 'connected';
  const isConnected = connectionState === 'connected';

  return (
    <Card className={cn(
      "border-t border-l-0 border-r-0 border-b-0 rounded-none",
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          
          {/* Connection Status and Controls */}
          <div className="flex items-center justify-between">
            <ConnectionStatus state={connectionState} />
            
            {connectionState === 'failed' && (
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={() => {
                  // TODO: Implement reconnection logic from Task 6.2.1
                  console.log('Attempting reconnection...');
                  window.location.reload();
                }}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>

          {/* Enhanced Message Input */}
          <MessageInput
            value={message}
            onChange={setMessage}
            onSend={handleSendMessage}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={isInputDisabled}
            isConnected={isConnected}
            replyToMessage={replyToMessage}
            onCancelReply={onCancelReply}
            onTypingStart={onTypingStart}
            onTypingStop={onTypingStop}
            enableRealTimeValidation={enableAdvancedFeatures}
            enableMarkdownShortcuts={enableAdvancedFeatures}
            enableFormattingToolbar={enableAdvancedFeatures}
            showPreview={false}
          />

          {/* Connection Warning */}
          {connectionState !== 'connected' && (
            <div className="text-xs text-muted-foreground text-center py-2">
              {connectionState === 'connecting' && (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Establishing connection...</span>
                </div>
              )}
              {connectionState === 'disconnected' && (
                <div className="flex items-center justify-center space-x-2">
                  <WifiOff className="h-3 w-3" />
                  <span>Connection lost. Messages will be sent when reconnected.</span>
                </div>
              )}
              {connectionState === 'failed' && (
                <div className="flex items-center justify-center space-x-2">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span>Unable to connect. Please check your internet connection.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DebateFooter;
