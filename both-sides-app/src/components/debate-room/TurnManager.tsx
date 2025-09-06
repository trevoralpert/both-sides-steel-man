'use client';

/**
 * Phase 6 Task 6.3.2: Turn Manager Component
 * 
 * Main component for speaking order management and turn-taking orchestration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase, DebatePosition } from '@/types/debate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Timer, 
  Bell, 
  Settings,
  Play,
  Pause,
  SkipForward,
  RefreshCw
} from 'lucide-react';

import { TurnNotificationManager } from './TurnNotification';
import { TurnTimer } from './TurnTimer';
import { SpeakingQueue } from './SpeakingQueue';
import { TurnIndicator } from './TurnIndicator';

export interface ParticipantInfo {
  id: string;
  name: string;
  position: DebatePosition;
  avatar?: string;
  isOnline?: boolean;
  hasSpoken?: boolean;
}

export interface TurnState {
  currentSpeakerId?: string;
  turnStartTime?: Date;
  turnDurationSeconds: number;
  isPaused: boolean;
  queueOrder: string[];
  turnCount: number;
  completedTurns: string[];
}

export interface TurnManagerProps {
  currentPhase: DebatePhase;
  participants: ParticipantInfo[];
  currentUserId: string;
  isTeacher?: boolean;
  turnState?: TurnState;
  onTurnStateChange?: (newState: Partial<TurnState>) => void;
  onTurnComplete?: (speakerId: string, turnDuration: number) => void;
  onTurnSkip?: (speakerId: string) => void;
  variant?: 'full' | 'compact';
  className?: string;
}

// Default turn durations by phase (seconds)
const DEFAULT_TURN_DURATIONS = {
  PREPARATION: 0,
  OPENING: 180, // 3 minutes
  DISCUSSION: 120, // 2 minutes (suggested)
  REBUTTAL: 90, // 1.5 minutes
  CLOSING: 180, // 3 minutes
  REFLECTION: 0,
  COMPLETED: 0
} as const;

// Notification state interface
interface NotificationState {
  id: string;
  type: 'your-turn' | 'turn-ending' | 'turn-over' | 'next-speaker';
  speakerName: string;
  speakerPosition?: DebatePosition;
  timeRemaining?: number;
  isVisible: boolean;
}

export function TurnManager({
  currentPhase,
  participants,
  currentUserId,
  isTeacher = false,
  turnState,
  onTurnStateChange,
  onTurnComplete,
  onTurnSkip,
  variant = 'full',
  className
}: TurnManagerProps) {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Default turn state
  const defaultTurnState: TurnState = useMemo(() => ({
    currentSpeakerId: undefined,
    turnStartTime: undefined,
    turnDurationSeconds: DEFAULT_TURN_DURATIONS[currentPhase],
    isPaused: false,
    queueOrder: participants
      .sort((a, b) => a.position === 'PRO' ? -1 : 1)
      .map(p => p.id),
    turnCount: 0,
    completedTurns: []
  }), [currentPhase, participants]);

  const effectiveTurnState = turnState || defaultTurnState;

  // Get current speaker
  const currentSpeaker = effectiveTurnState.currentSpeakerId ? 
    participants.find(p => p.id === effectiveTurnState.currentSpeakerId) : null;

  // Check if it's current user's turn
  const isCurrentUserTurn = effectiveTurnState.currentSpeakerId === currentUserId;

  // Get next speaker
  const getNextSpeaker = useCallback(() => {
    const currentIndex = effectiveTurnState.currentSpeakerId ? 
      effectiveTurnState.queueOrder.indexOf(effectiveTurnState.currentSpeakerId) : -1;
    const nextIndex = (currentIndex + 1) % effectiveTurnState.queueOrder.length;
    return participants.find(p => p.id === effectiveTurnState.queueOrder[nextIndex]);
  }, [effectiveTurnState.currentSpeakerId, effectiveTurnState.queueOrder, participants]);

  // Calculate turn progress
  const turnProgress = useMemo(() => {
    const totalExpectedTurns = currentPhase === 'DISCUSSION' ? 
      Math.max(4, participants.length * 2) : // Flexible for discussion
      participants.length; // One per participant for structured phases
    
    return {
      current: effectiveTurnState.completedTurns.length,
      total: totalExpectedTurns
    };
  }, [currentPhase, participants.length, effectiveTurnState.completedTurns.length]);

  // Start a turn
  const startTurn = useCallback((speakerId: string) => {
    const newState: Partial<TurnState> = {
      currentSpeakerId: speakerId,
      turnStartTime: new Date(),
      isPaused: false,
      turnCount: effectiveTurnState.turnCount + 1
    };
    
    onTurnStateChange?.(newState);

    // Show "your turn" notification if it's the current user
    if (speakerId === currentUserId) {
      const speaker = participants.find(p => p.id === speakerId);
      if (speaker) {
        addNotification({
          type: 'your-turn',
          speakerName: speaker.name,
          speakerPosition: speaker.position
        });
      }
    }
  }, [currentUserId, effectiveTurnState.turnCount, onTurnStateChange, participants]);

  // End a turn
  const endTurn = useCallback((completed: boolean = true) => {
    if (!effectiveTurnState.currentSpeakerId || !effectiveTurnState.turnStartTime) return;

    const turnDuration = Date.now() - effectiveTurnState.turnStartTime.getTime();
    
    if (completed) {
      const newCompletedTurns = [...effectiveTurnState.completedTurns, effectiveTurnState.currentSpeakerId];
      
      onTurnStateChange?.({
        currentSpeakerId: undefined,
        turnStartTime: undefined,
        completedTurns: newCompletedTurns
      });

      onTurnComplete?.(effectiveTurnState.currentSpeakerId, Math.floor(turnDuration / 1000));

      // Show next speaker notification
      const nextSpeaker = getNextSpeaker();
      if (nextSpeaker) {
        addNotification({
          type: 'next-speaker',
          speakerName: nextSpeaker.name,
          speakerPosition: nextSpeaker.position
        });
      }
    } else {
      // Turn was skipped
      onTurnSkip?.(effectiveTurnState.currentSpeakerId);
      onTurnStateChange?.({
        currentSpeakerId: undefined,
        turnStartTime: undefined
      });
    }
  }, [effectiveTurnState.currentSpeakerId, effectiveTurnState.turnStartTime, effectiveTurnState.completedTurns, onTurnStateChange, onTurnComplete, onTurnSkip, getNextSpeaker]);

  // Pause/Resume turn
  const togglePause = useCallback(() => {
    onTurnStateChange?.({
      isPaused: !effectiveTurnState.isPaused
    });
  }, [effectiveTurnState.isPaused, onTurnStateChange]);

  // Skip to next speaker
  const skipToNext = useCallback(() => {
    if (!effectiveTurnState.currentSpeakerId) return;
    
    const nextSpeaker = getNextSpeaker();
    if (nextSpeaker) {
      endTurn(false); // End current turn as skipped
      setTimeout(() => startTurn(nextSpeaker.id), 500); // Start next turn
    }
  }, [effectiveTurnState.currentSpeakerId, getNextSpeaker, endTurn, startTurn]);

  // Extend current turn
  const extendTurn = useCallback((additionalSeconds: number) => {
    onTurnStateChange?.({
      turnDurationSeconds: effectiveTurnState.turnDurationSeconds + additionalSeconds
    });
  }, [effectiveTurnState.turnDurationSeconds, onTurnStateChange]);

  // Add notification
  const addNotification = useCallback((notification: Omit<NotificationState, 'id' | 'isVisible'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newNotification: NotificationState = {
      ...notification,
      id,
      isVisible: true
    };
    
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Handle notification accept (for your-turn notifications)
  const handleNotificationAccept = useCallback((id: string) => {
    removeNotification(id);
    
    // If user accepted "your turn" notification, ensure their turn is active
    if (!effectiveTurnState.currentSpeakerId && !isCurrentUserTurn) {
      startTurn(currentUserId);
    }
  }, [removeNotification, effectiveTurnState.currentSpeakerId, isCurrentUserTurn, startTurn, currentUserId]);

  // Handle turn timer warnings
  const handleTurnWarning = useCallback((timeRemaining: number) => {
    if (!currentSpeaker) return;

    if (timeRemaining <= 15) {
      addNotification({
        type: 'turn-ending',
        speakerName: currentSpeaker.name,
        speakerPosition: currentSpeaker.position,
        timeRemaining
      });
    }
  }, [currentSpeaker, addNotification]);

  // Handle turn completion from timer
  const handleTimerComplete = useCallback(() => {
    if (currentSpeaker) {
      addNotification({
        type: 'turn-over',
        speakerName: currentSpeaker.name,
        speakerPosition: currentSpeaker.position
      });
    }
    
    // Auto-end turn after a brief delay
    setTimeout(() => {
      endTurn(true);
    }, 5000);
  }, [currentSpeaker, addNotification, endTurn]);

  // Auto-start turns for structured phases
  useEffect(() => {
    const shouldAutoStart = ['OPENING', 'REBUTTAL', 'CLOSING'].includes(currentPhase);
    
    if (shouldAutoStart && !effectiveTurnState.currentSpeakerId && effectiveTurnState.queueOrder.length > 0) {
      // Find next speaker who hasn't spoken yet
      const nextSpeaker = effectiveTurnState.queueOrder.find(id => 
        !effectiveTurnState.completedTurns.includes(id)
      );
      
      if (nextSpeaker) {
        setTimeout(() => startTurn(nextSpeaker), 1000);
      }
    }
  }, [currentPhase, effectiveTurnState.currentSpeakerId, effectiveTurnState.queueOrder, effectiveTurnState.completedTurns, startTurn]);

  // Phases that don't support turn-taking
  if (!['OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING'].includes(currentPhase)) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground text-sm">
            Turn-taking is not active during the {currentPhase.toLowerCase()} phase.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-4', className)}>
        <TurnIndicator
          currentSpeakerId={effectiveTurnState.currentSpeakerId}
          currentPhase={currentPhase}
          participants={participants}
          turnTimeRemaining={effectiveTurnState.turnStartTime ? 
            Math.max(0, effectiveTurnState.turnDurationSeconds - 
              Math.floor((Date.now() - effectiveTurnState.turnStartTime.getTime()) / 1000)
            ) : undefined
          }
          turnTimeLimit={effectiveTurnState.turnDurationSeconds}
          isCurrentUserTurn={isCurrentUserTurn}
          variant="compact"
          showTimer={true}
        />

        {effectiveTurnState.currentSpeakerId && effectiveTurnState.turnStartTime && (
          <TurnTimer
            turnStartTime={effectiveTurnState.turnStartTime}
            turnDurationSeconds={effectiveTurnState.turnDurationSeconds}
            isPaused={effectiveTurnState.isPaused}
            isActive={true}
            currentPhase={currentPhase}
            speakerName={currentSpeaker?.name}
            onTurnComplete={handleTimerComplete}
            onWarning={handleTurnWarning}
            showControls={isTeacher}
            onPause={togglePause}
            onResume={togglePause}
            onExtend={extendTurn}
            soundEnabled={soundEnabled}
            variant="compact"
          />
        )}

        <TurnNotificationManager
          notifications={notifications}
          currentPhase={currentPhase}
          onDismiss={removeNotification}
          onAccept={handleNotificationAccept}
          soundEnabled={soundEnabled}
        />
      </div>
    );
  }

  // Full variant
  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Turn Management</CardTitle>
              <CardDescription>
                Speaking order and timing for {currentPhase.toLowerCase()} phase
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {turnProgress.current}/{turnProgress.total} turns
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 p-0"
              >
                {soundEnabled ? <Bell className="h-4 w-4" /> : <Bell className="h-4 w-4 opacity-50" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="current" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current">
                <Users className="h-4 w-4 mr-2" />
                Current Turn
              </TabsTrigger>
              <TabsTrigger value="queue">
                <Timer className="h-4 w-4 mr-2" />
                Speaking Queue
              </TabsTrigger>
              {isTeacher && (
                <TabsTrigger value="controls">
                  <Settings className="h-4 w-4 mr-2" />
                  Controls
                </TabsTrigger>
              )}
            </TabsList>

            {/* Current Turn Tab */}
            <TabsContent value="current" className="space-y-4">
              <TurnIndicator
                currentSpeakerId={effectiveTurnState.currentSpeakerId}
                currentPhase={currentPhase}
                participants={participants}
                turnTimeRemaining={effectiveTurnState.turnStartTime ? 
                  Math.max(0, effectiveTurnState.turnDurationSeconds - 
                    Math.floor((Date.now() - effectiveTurnState.turnStartTime.getTime()) / 1000)
                  ) : undefined
                }
                turnTimeLimit={effectiveTurnState.turnDurationSeconds}
                isCurrentUserTurn={isCurrentUserTurn}
                variant="default"
                showTimer={true}
              />

              {effectiveTurnState.currentSpeakerId && effectiveTurnState.turnStartTime && (
                <TurnTimer
                  turnStartTime={effectiveTurnState.turnStartTime}
                  turnDurationSeconds={effectiveTurnState.turnDurationSeconds}
                  isPaused={effectiveTurnState.isPaused}
                  isActive={true}
                  currentPhase={currentPhase}
                  speakerName={currentSpeaker?.name}
                  onTurnComplete={handleTimerComplete}
                  onWarning={handleTurnWarning}
                  showControls={isTeacher}
                  onPause={togglePause}
                  onResume={togglePause}
                  onExtend={extendTurn}
                  soundEnabled={soundEnabled}
                  variant="default"
                />
              )}
            </TabsContent>

            {/* Speaking Queue Tab */}
            <TabsContent value="queue">
              <SpeakingQueue
                currentPhase={currentPhase}
                currentSpeakerId={effectiveTurnState.currentSpeakerId}
                participants={participants.map(p => ({
                  ...p,
                  hasSpoken: effectiveTurnState.completedTurns.includes(p.id)
                }))}
                queueOrder={effectiveTurnState.queueOrder}
                turnProgress={turnProgress}
                variant="default"
                showProgress={true}
              />
            </TabsContent>

            {/* Teacher Controls Tab */}
            {isTeacher && (
              <TabsContent value="controls" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={togglePause}
                    disabled={!effectiveTurnState.currentSpeakerId}
                    className="w-full"
                  >
                    {effectiveTurnState.isPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Resume Turn
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Turn
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={skipToNext}
                    disabled={!effectiveTurnState.currentSpeakerId}
                    variant="outline"
                    className="w-full"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Skip to Next
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Manual Turn Assignment</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {participants.map(participant => (
                      <Button
                        key={participant.id}
                        onClick={() => startTurn(participant.id)}
                        variant="outline"
                        disabled={effectiveTurnState.currentSpeakerId === participant.id}
                        className="justify-start"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Give turn to {participant.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <TurnNotificationManager
        notifications={notifications}
        currentPhase={currentPhase}
        onDismiss={removeNotification}
        onAccept={handleNotificationAccept}
        soundEnabled={soundEnabled}
      />
    </div>
  );
}

export default TurnManager;