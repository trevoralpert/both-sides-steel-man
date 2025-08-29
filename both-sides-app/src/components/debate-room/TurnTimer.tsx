'use client';

/**
 * Phase 6 Task 6.3.2: Turn Timer Component
 * 
 * Individual turn countdown with warnings for long responses
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { DebatePhase } from '@/types/debate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Timer, 
  Clock, 
  AlertTriangle,
  Play,
  Pause,
  Square,
  Bell,
  Volume2,
  VolumeX
} from 'lucide-react';

export interface TurnTimerProps {
  turnStartTime: Date;
  turnDurationSeconds: number;
  isPaused?: boolean;
  isActive?: boolean; // Whether this is the current speaker's timer
  currentPhase: DebatePhase;
  speakerName?: string;
  onTurnComplete?: () => void;
  onWarning?: (timeRemaining: number) => void;
  showControls?: boolean; // For teachers/moderators
  onPause?: () => void;
  onResume?: () => void;
  onExtend?: (additionalSeconds: number) => void;
  soundEnabled?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
}

// Turn duration configurations by phase (in seconds)
const DEFAULT_TURN_DURATIONS = {
  PREPARATION: 0, // No individual turns
  OPENING: 180, // 3 minutes
  DISCUSSION: 120, // 2 minutes suggested
  REBUTTAL: 90, // 1.5 minutes
  CLOSING: 180, // 3 minutes
  REFLECTION: 0 // No individual turns
} as const;

// Warning thresholds (in seconds)
const WARNING_THRESHOLDS = {
  URGENT: 15, // 15 seconds
  WARNING: 30, // 30 seconds
  INFO: 60 // 1 minute
} as const;

export function TurnTimer({
  turnStartTime,
  turnDurationSeconds,
  isPaused = false,
  isActive = true,
  currentPhase,
  speakerName,
  onTurnComplete,
  onWarning,
  showControls = false,
  onPause,
  onResume,
  onExtend,
  soundEnabled = true,
  variant = 'default',
  className
}: TurnTimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasWarned, setHasWarned] = useState(false);
  const [hasUrgentWarned, setHasUrgentWarned] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate time remaining
  const elapsedMs = currentTime.getTime() - turnStartTime.getTime();
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds = Math.max(0, turnDurationSeconds - elapsedSeconds);
  const progressPercent = Math.min(100, (elapsedSeconds / turnDurationSeconds) * 100);
  const isComplete = remainingSeconds === 0;
  const isOvertime = elapsedSeconds > turnDurationSeconds;

  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get warning level
  const getWarningLevel = useCallback(() => {
    if (isOvertime) return 'overtime';
    if (remainingSeconds <= WARNING_THRESHOLDS.URGENT) return 'urgent';
    if (remainingSeconds <= WARNING_THRESHOLDS.WARNING) return 'warning';
    if (remainingSeconds <= WARNING_THRESHOLDS.INFO) return 'info';
    return 'normal';
  }, [remainingSeconds, isOvertime]);

  // Play notification sound
  const playNotificationSound = useCallback((type: 'warning' | 'urgent' | 'complete') => {
    if (!soundEnabled) return;
    
    // Create different tones for different notifications
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set frequency based on notification type
      switch (type) {
        case 'warning':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          break;
        case 'urgent':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          break;
      }
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Audio notification failed:', error);
    }
  }, [soundEnabled]);

  // Handle timer tick
  useEffect(() => {
    if (isPaused || !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, isActive]);

  // Handle warnings and completion
  useEffect(() => {
    const warningLevel = getWarningLevel();
    
    // Emit warnings
    if (remainingSeconds > 0) {
      if (warningLevel === 'urgent' && !hasUrgentWarned) {
        setHasUrgentWarned(true);
        playNotificationSound('urgent');
        onWarning?.(remainingSeconds);
      } else if (warningLevel === 'warning' && !hasWarned) {
        setHasWarned(true);
        playNotificationSound('warning');
        onWarning?.(remainingSeconds);
      }
    }

    // Handle turn completion
    if (isComplete && !isOvertime && onTurnComplete) {
      playNotificationSound('complete');
      onTurnComplete();
    }
  }, [getWarningLevel, hasWarned, hasUrgentWarned, isComplete, isOvertime, onTurnComplete, onWarning, playNotificationSound, remainingSeconds]);

  // Control handlers
  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      onResume?.();
    } else {
      onPause?.();
    }
  }, [isPaused, onPause, onResume]);

  const handleExtend = useCallback((seconds: number) => {
    onExtend?.(seconds);
  }, [onExtend]);

  // Get display styling based on warning level
  const getDisplayStyling = () => {
    const warningLevel = getWarningLevel();
    
    switch (warningLevel) {
      case 'overtime':
        return {
          containerClass: 'border-red-500 bg-red-50 animate-pulse',
          timeClass: 'text-red-700 font-bold',
          progressClass: 'bg-red-500',
          iconClass: 'text-red-600'
        };
      case 'urgent':
        return {
          containerClass: 'border-red-300 bg-red-50',
          timeClass: 'text-red-600 font-semibold animate-pulse',
          progressClass: 'bg-red-400',
          iconClass: 'text-red-500'
        };
      case 'warning':
        return {
          containerClass: 'border-amber-300 bg-amber-50',
          timeClass: 'text-amber-700 font-semibold',
          progressClass: 'bg-amber-400',
          iconClass: 'text-amber-600'
        };
      case 'info':
        return {
          containerClass: 'border-blue-300 bg-blue-50',
          timeClass: 'text-blue-700',
          progressClass: 'bg-blue-400',
          iconClass: 'text-blue-500'
        };
      default:
        return {
          containerClass: 'border-green-300 bg-green-50',
          timeClass: 'text-green-700',
          progressClass: 'bg-green-400',
          iconClass: 'text-green-500'
        };
    }
  };

  const styling = getDisplayStyling();

  // Minimal variant - just time display
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Timer className={cn('h-4 w-4', styling.iconClass)} />
        <span className={cn('font-mono tabular-nums', styling.timeClass)}>
          {isOvertime ? 
            `+${formatTime(elapsedSeconds - turnDurationSeconds)}` : 
            formatTime(remainingSeconds)
          }
        </span>
        {isPaused && (
          <Badge variant="outline" className="text-xs">
            Paused
          </Badge>
        )}
      </div>
    );
  }

  // Compact variant - reduced size card
  if (variant === 'compact') {
    return (
      <Card className={cn('transition-all duration-300', styling.containerClass, className)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Timer className={cn('h-4 w-4', styling.iconClass)} />
              <div>
                <div className={cn('text-lg font-mono tabular-nums', styling.timeClass)}>
                  {isOvertime ? 
                    `+${formatTime(elapsedSeconds - turnDurationSeconds)}` : 
                    formatTime(remainingSeconds)
                  }
                </div>
                {speakerName && (
                  <div className="text-xs text-muted-foreground truncate">
                    {speakerName}'s turn
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isPaused && (
                <Badge variant="outline" className="text-xs">
                  <Pause className="h-2 w-2 mr-1" />
                  Paused
                </Badge>
              )}
              
              {isOvertime && (
                <Badge className="text-xs bg-red-100 text-red-800">
                  Overtime
                </Badge>
              )}
            </div>
          </div>

          <Progress 
            value={progressPercent} 
            className="h-1 mt-2"
          />
        </CardContent>
      </Card>
    );
  }

  // Default variant - full featured
  return (
    <Card className={cn('transition-all duration-300', styling.containerClass, className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Timer className={cn('h-5 w-5', styling.iconClass)} />
              <span className="font-medium text-sm">
                Turn Timer{speakerName ? ` - ${speakerName}` : ''}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isActive && (
                <Badge variant="outline" className="text-xs">
                  Inactive
                </Badge>
              )}
              
              {isPaused && (
                <Badge variant="outline" className="text-xs">
                  <Pause className="h-2 w-2 mr-1" />
                  Paused
                </Badge>
              )}
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-center">
            <div className={cn('text-4xl font-mono tabular-nums', styling.timeClass)}>
              {isOvertime ? 
                `+${formatTime(elapsedSeconds - turnDurationSeconds)}` : 
                formatTime(remainingSeconds)
              }
            </div>
            
            <div className="text-sm text-muted-foreground mt-1">
              {isOvertime ? 
                `${formatTime(turnDurationSeconds)} exceeded` : 
                `of ${formatTime(turnDurationSeconds)}`
              }
            </div>
            
            {isOvertime && (
              <Badge className="text-xs bg-red-100 text-red-800 mt-2">
                <AlertTriangle className="h-2 w-2 mr-1" />
                Overtime: Please wrap up
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={progressPercent} 
              className="h-3 transition-all duration-1000"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Started: {turnStartTime.toLocaleTimeString()}</span>
              <span>{Math.round(progressPercent)}% elapsed</span>
            </div>
          </div>

          {/* Warning Messages */}
          {getWarningLevel() === 'urgent' && !isOvertime && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mx-auto mb-1" />
              <p className="text-xs text-red-700 font-medium">
                Final 15 seconds - please conclude your point
              </p>
            </div>
          )}

          {getWarningLevel() === 'warning' && !isOvertime && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-center">
              <Clock className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <p className="text-xs text-amber-700">
                30 seconds remaining - start wrapping up
              </p>
            </div>
          )}

          {/* Controls */}
          {showControls && (
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePauseResume}
                  disabled={!isActive}
                  className="h-8"
                >
                  {isPaused ? (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTurnComplete?.()}
                  disabled={!isActive}
                  className="h-8 text-xs"
                >
                  <Square className="h-3 w-3 mr-1" />
                  End Turn
                </Button>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExtend(30)}
                  disabled={!isActive}
                  className="h-8 px-2 text-xs"
                >
                  +30s
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExtend(60)}
                  disabled={!isActive}
                  className="h-8 px-2 text-xs"
                >
                  +1m
                </Button>
              </div>
            </div>
          )}

          {/* Phase Context */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Phase: {currentPhase}</span>
            <span>
              {getWarningLevel() === 'urgent' ? 'Wrap up now!' :
               getWarningLevel() === 'warning' ? 'Time running low' :
               getWarningLevel() === 'overtime' ? 'Over time limit' :
               isActive ? 'Speaking time' : 'Timer inactive'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TurnTimer;