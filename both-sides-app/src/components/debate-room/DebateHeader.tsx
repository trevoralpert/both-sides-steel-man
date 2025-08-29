'use client';

/**
 * Phase 6 Task 6.1.1 & 6.3.1: Debate Header Component
 * 
 * Displays topic, participants, and current phase information
 * with responsive design and accessibility features
 * Updated to use new Phase Management components from Task 6.3.1
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { DebateHeaderProps } from '@/types/debate';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ParticipantOverview } from './ParticipantList';
import { ConnectionStatusIndicator } from '@/components/connection';
import { PhaseIndicator } from './PhaseIndicator';

export function DebateHeader({
  topic,
  participants,
  currentPhase,
  timeRemaining,
  connection,
  className
}: DebateHeaderProps) {
  return (
    <Card className={cn("border-b rounded-none border-l-0 border-r-0 border-t-0", className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          
          {/* Topic Section */}
          <div 
            className="space-y-2"
            role="group"
            aria-labelledby="topic-title"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h1 
                  id="topic-title"
                  className="text-lg font-semibold leading-tight"
                >
                  {topic.title}
                </h1>
                
                {topic.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {topic.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <Badge variant="secondary" className="text-xs">
                  {topic.category}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    topic.difficulty === 'BEGINNER' && "border-green-200 text-green-700",
                    topic.difficulty === 'INTERMEDIATE' && "border-yellow-200 text-yellow-700", 
                    topic.difficulty === 'ADVANCED' && "border-red-200 text-red-700"
                  )}
                >
                  {topic.difficulty}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Phase, Connection, and Participants Section */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
            
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Current Phase - Using enhanced PhaseIndicator from Task 6.3.1 */}
              <div 
                role="status"
                aria-label={`Current phase: ${currentPhase}`}
              >
                <PhaseIndicator 
                  currentPhase={currentPhase} 
                  timeRemaining={timeRemaining}
                  totalPhaseTime={undefined} // Will be provided by backend integration
                  variant="minimal"
                  showProgress={false}
                  showTimeRemaining={true}
                />
              </div>

              {/* Connection Status */}
              {connection && (
                <ConnectionStatusIndicator
                  connection={{
                    isConnected: connection.isConnected,
                    connectionState: connection.connectionState as any,
                    connectionId: undefined,
                    error: undefined,
                    reconnectAttempt: 0,
                    lastConnectedAt: undefined,
                    latency: connection.latency,
                    reconnect: connection.reconnect,
                    disconnect: () => {},
                    sendMessage: async () => {},
                    subscribe: () => () => {}
                  }}
                  variant="compact"
                  showLatency={true}
                  showReconnectButton={!connection.isConnected}
                />
              )}
            </div>

            {/* Participants */}
            <ParticipantOverview
              participants={participants}
              currentUserId="" // TODO: Pass actual current user ID
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DebateHeader;
