'use client';

/**
 * Phase 6 Task 6.3.1: Phase Timer & Status Display
 * 
 * Real-time countdown timer for debate phases with teacher controls
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase } from '@/types/debate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Timer, 
  AlertTriangle,
  CheckCircle2,
  FastForward,
  Rewind,
  Settings,
  Bell,
  Volume2,
  VolumeX
} from 'lucide-react';

export interface PhaseTimerProps {
  phase: DebatePhase;
  phaseStartTime: Date;
  phaseDurationMs: number;
  isPaused?: boolean;
  isTeacher?: boolean;
  onPhaseComplete?: (phase: DebatePhase) => void;
  onPause?: () => void;
  onResume?: () => void;
  onSkip?: () => void;
  onExtend?: (additionalMs: number) => void;
  showWarnings?: boolean;
  soundEnabled?: boolean;
  className?: string;
}

// Phase duration configurations (in minutes)
export const PHASE_DURATIONS = {
  PREPARATION: 10,
  OPENING: 3,
  DISCUSSION: 15,
  REBUTTAL: 5,
  CLOSING: 3,
  REFLECTION: 5
} as const;

// Warning thresholds
const WARNING_THRESHOLDS = {
  URGENT: 30000, // 30 seconds
  WARNING: 120000, // 2 minutes
  INFO: 300000 // 5 minutes
} as const;

export function PhaseTimer({
  phase,
  phaseStartTime,
  phaseDurationMs,
  isPaused = false,
  isTeacher = false,
  onPhaseComplete,
  onPause,
  onResume,
  onSkip,
  onExtend,
  showWarnings = true,
  soundEnabled = true,
  className
}: PhaseTimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasWarned, setHasWarned] = useState(false);
  const [hasUrgentWarned, setHasUrgentWarned] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calculate time remaining
  const elapsedMs = currentTime.getTime() - phaseStartTime.getTime();
  const remainingMs = Math.max(0, phaseDurationMs - elapsedMs);
  const progressPercent = Math.min(100, (elapsedMs / phaseDurationMs) * 100);
  const isComplete = remainingMs === 0;
  const isOvertime = elapsedMs > phaseDurationMs;

  // Format time display
  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Get warning level
  const getWarningLevel = useCallback(() => {
    if (isOvertime) return 'overtime';
    if (remainingMs <= WARNING_THRESHOLDS.URGENT) return 'urgent';
    if (remainingMs <= WARNING_THRESHOLDS.WARNING) return 'warning';
    if (remainingMs <= WARNING_THRESHOLDS.INFO) return 'info';
    return 'normal';
  }, [remainingMs, isOvertime]);

  // Play notification sound
  const playNotificationSound = useCallback((type: 'warning' | 'urgent' | 'complete') => {
    if (!soundEnabled || !audioRef.current) return;
    
    // Create different tones for different notifications
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set frequency based on notification type
    switch (type) {
      case 'warning':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        break;
      case 'urgent':
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        break;
      case 'complete':
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        break;
    }
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }, [soundEnabled]);

  // Handle timer tick
  useEffect(() => {
    if (isPaused || isComplete) {
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
  }, [isPaused, isComplete]);

  // Handle warnings and completion
  useEffect(() => {
    const warningLevel = getWarningLevel();
    
    // Emit warnings
    if (showWarnings) {
      if (warningLevel === 'urgent' && !hasUrgentWarned) {
        setHasUrgentWarned(true);
        playNotificationSound('urgent');
      } else if (warningLevel === 'warning' && !hasWarned) {
        setHasWarned(true);
        playNotificationSound('warning');
      }
    }

    // Handle phase completion
    if (isComplete && !isOvertime && onPhaseComplete) {
      playNotificationSound('complete');
      onPhaseComplete(phase);
    }
  }, [getWarningLevel, hasWarned, hasUrgentWarned, isComplete, isOvertime, onPhaseComplete, phase, playNotificationSound, showWarnings]);

  // Teacher controls
  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      onResume?.();
    } else {
      onPause?.();
    }
  }, [isPaused, onPause, onResume]);

  const handleSkip = useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  const handleExtend = useCallback((minutes: number) => {
    onExtend?.(minutes * 60 * 1000);
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
          icon: AlertTriangle,
          iconClass: 'text-red-600 animate-bounce'
        };
      case 'urgent':
        return {
          containerClass: 'border-red-300 bg-red-50',
          timeClass: 'text-red-600 font-semibold animate-pulse',
          progressClass: 'bg-red-400',
          icon: AlertTriangle,
          iconClass: 'text-red-500'
        };
      case 'warning':
        return {
          containerClass: 'border-amber-300 bg-amber-50',
          timeClass: 'text-amber-700 font-semibold',
          progressClass: 'bg-amber-400',
          icon: Clock,
          iconClass: 'text-amber-600'
        };
      case 'info':
        return {
          containerClass: 'border-blue-300 bg-blue-50',
          timeClass: 'text-blue-700',
          progressClass: 'bg-blue-400',
          icon: Timer,
          iconClass: 'text-blue-500'
        };
      default:
        return {
          containerClass: 'border-green-300 bg-green-50',
          timeClass: 'text-green-700',
          progressClass: 'bg-green-400',
          icon: CheckCircle2,
          iconClass: 'text-green-500'
        };
    }
  };

  const styling = getDisplayStyling();
  const DisplayIcon = styling.icon;

  return (
    <Card className={cn('transition-all duration-300', styling.containerClass, className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Timer Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DisplayIcon className={cn('h-5 w-5', styling.iconClass)} />
              
              <div>
                <div className={cn('text-2xl font-mono tabular-nums', styling.timeClass)}>
                  {formatTime(remainingMs)}
                </div>
                {isOvertime && (
                  <div className="text-xs text-red-600 font-medium">
                    +{formatTime(elapsedMs - phaseDurationMs)} overtime
                  </div>
                )}
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex items-center space-x-2">
              {isPaused && (
                <Badge variant="outline" className="text-xs">
                  <Pause className="h-2 w-2 mr-1" />
                  Paused
                </Badge>
              )}
              
              {isComplete && (
                <Badge className="text-xs bg-green-100 text-green-800">
                  <CheckCircle2 className="h-2 w-2 mr-1" />
                  Complete
                </Badge>
              )}
              
              {getWarningLevel() === 'urgent' && !isOvertime && (
                <Badge className="text-xs bg-red-100 text-red-800 animate-pulse">
                  <AlertTriangle className="h-2 w-2 mr-1" />
                  Urgent
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={progressPercent} 
              className="h-3 transition-all duration-1000"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Started: {phaseStartTime.toLocaleTimeString()}</span>
              <span>
                {Math.round(progressPercent)}% • {formatTime(phaseDurationMs)} total
              </span>
            </div>
          </div>

          {/* Teacher Controls */}
          {isTeacher && (
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePauseResume}
                  disabled={isComplete}
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
                  onClick={handleSkip}
                  className="h-8 text-xs"
                >
                  <FastForward className="h-3 w-3 mr-1" />
                  Skip Phase
                </Button>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExtend(1)}
                  className="h-8 px-2 text-xs"
                >
                  +1m
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExtend(2)}
                  className="h-8 px-2 text-xs"
                >
                  +2m
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExtend(5)}
                  className="h-8 px-2 text-xs"
                >
                  +5m
                </Button>
              </div>
            </div>
          )}

          {/* Phase Information */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Phase: {phase}</span>
            <span>
              {isOvertime ? 'Overtime' : 
               getWarningLevel() === 'urgent' ? 'Final moments' :
               getWarningLevel() === 'warning' ? 'Time running low' :
               'Time remaining'}
            </span>
          </div>
        </div>
      </CardContent>
      
      {/* Hidden audio element for sound effects */}
      <audio ref={audioRef} preload="none" />
    </Card>
  );
}

export default PhaseTimer;