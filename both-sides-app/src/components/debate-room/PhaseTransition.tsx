'use client';

/**
 * Phase 6 Task 6.3.1: Phase Transition Component
 * 
 * Animated transitions and notifications for debate phase changes
 */

import React, { useState, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase } from '@/types/debate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight,
  CheckCircle2,
  Clock,
  PlayCircle,
  Target,
  MessageSquare,
  FileText,
  Lightbulb,
  Bell,
  Volume2,
  X,
  Sparkles,
  Timer
} from 'lucide-react';

export interface PhaseTransitionProps {
  fromPhase: DebatePhase;
  toPhase: DebatePhase;
  isVisible: boolean;
  duration?: number; // Transition display duration in ms
  showCountdown?: boolean;
  countdownSeconds?: number;
  onComplete?: () => void;
  onDismiss?: () => void;
  className?: string;
}

// Phase configuration for transitions
const PHASE_CONFIG = {
  PREPARATION: {
    name: 'Preparation',
    description: 'Research and organize arguments',
    icon: FileText,
    color: 'bg-blue-500',
    nextInstruction: 'Get ready to present your opening statement!'
  },
  OPENING: {
    name: 'Opening Statements',
    description: 'Present initial positions',
    icon: PlayCircle,
    color: 'bg-green-500',
    nextInstruction: 'Begin the main discussion phase!'
  },
  DISCUSSION: {
    name: 'Main Discussion',
    description: 'Exchange arguments and evidence',
    icon: MessageSquare,
    color: 'bg-purple-500',
    nextInstruction: 'Time for rebuttals - address opposing points!'
  },
  REBUTTAL: {
    name: 'Rebuttals',
    description: 'Address opposing arguments',
    icon: Target,
    color: 'bg-orange-500',
    nextInstruction: 'Present your closing statements!'
  },
  CLOSING: {
    name: 'Closing Statements',
    description: 'Summarize and conclude',
    icon: CheckCircle2,
    color: 'bg-red-500',
    nextInstruction: 'Time for reflection and learning!'
  },
  REFLECTION: {
    name: 'Reflection',
    description: 'Analyze and learn from debate',
    icon: Lightbulb,
    color: 'bg-amber-500',
    nextInstruction: 'Debate complete!'
  },
  COMPLETED: {
    name: 'Completed',
    description: 'Debate finished',
    icon: CheckCircle2,
    color: 'bg-green-500',
    nextInstruction: 'All done!'
  }
} as const;

export function PhaseTransition({
  fromPhase,
  toPhase,
  isVisible,
  duration = 5000,
  showCountdown = true,
  countdownSeconds = 5,
  onComplete,
  onDismiss,
  className
}: PhaseTransitionProps) {
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fromConfig = PHASE_CONFIG[fromPhase];
  const toConfig = PHASE_CONFIG[toPhase];
  const FromIcon = fromConfig.icon;
  const ToIcon = toConfig.icon;

  // Handle visibility and animation
  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setCountdown(countdownSeconds);
      setIsAnimating(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    setIsAnimating(true);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const increment = 100 / (duration / 100);
        return Math.min(100, prev + increment);
      });
    }, 100);

    // Countdown timer
    let countdownInterval: NodeJS.Timeout | null = null;
    if (showCountdown) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownInterval) clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Auto-complete
    const completeTimeout = setTimeout(() => {
      onComplete?.();
    }, duration);

    intervalRef.current = progressInterval;
    timeoutRef.current = completeTimeout;

    return () => {
      clearInterval(progressInterval);
      if (countdownInterval) clearInterval(countdownInterval);
      clearTimeout(completeTimeout);
    };
  }, [isVisible, duration, showCountdown, countdownSeconds, onComplete]);

  // Handle manual dismiss
  const handleDismiss = () => {
    onDismiss?.();
  };

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm',
      'animate-in fade-in duration-300',
      className
    )}>
      <Card className={cn(
        'w-full max-w-md mx-4 shadow-2xl border-2',
        'animate-in slide-in-from-top-4 duration-500',
        isAnimating && 'animate-pulse'
      )}>
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Phase Transition</h2>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Transition Animation */}
          <div className="flex items-center justify-center space-x-4 py-6">
            {/* From Phase */}
            <div className="text-center space-y-2">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-1000',
                fromConfig.color,
                'animate-pulse'
              )}>
                <FromIcon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-medium">{fromConfig.name}</p>
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="h-2 w-2 mr-1" />
                  Complete
                </Badge>
              </div>
            </div>

            {/* Arrow Animation */}
            <div className="flex flex-col items-center space-y-2">
              <ArrowRight className={cn(
                'h-8 w-8 text-blue-500 transition-all duration-1000',
                'animate-bounce'
              )} />
              {showCountdown && countdown > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 tabular-nums">
                    {countdown}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    seconds
                  </div>
                </div>
              )}
            </div>

            {/* To Phase */}
            <div className="text-center space-y-2">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-1000',
                toConfig.color,
                'animate-pulse scale-110'
              )}>
                <ToIcon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-medium">{toConfig.name}</p>
                <Badge className="text-xs bg-blue-100 text-blue-800">
                  <Sparkles className="h-2 w-2 mr-1" />
                  Starting
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={progress} 
              className="h-3 transition-all duration-300"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Transitioning...</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Phase Information */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">
                Welcome to {toConfig.name}!
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {toConfig.description}
              </p>
              
              {/* Next Steps */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <h4 className="font-medium text-blue-900 text-sm">
                      What's Next?
                    </h4>
                    <p className="text-blue-700 text-sm mt-1">
                      {toConfig.nextInstruction}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" />
              <span>Auto-starting in {countdown}s</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {onDismiss && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleDismiss}
                >
                  Skip
                </Button>
              )}
              
              <Button 
                size="sm"
                onClick={onComplete}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <PlayCircle className="h-3 w-3 mr-1" />
                Start Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Notification component for phase changes
export interface PhaseChangeNotificationProps {
  phase: DebatePhase;
  isVisible: boolean;
  duration?: number;
  position?: 'top' | 'bottom' | 'center';
  onDismiss?: () => void;
  className?: string;
}

export function PhaseChangeNotification({
  phase,
  isVisible,
  duration = 3000,
  position = 'top',
  onDismiss,
  className
}: PhaseChangeNotificationProps) {
  const [progress, setProgress] = useState(100);
  const config = PHASE_CONFIG[phase];
  const PhaseIcon = config.icon;

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const decrement = 100 / (duration / 100);
        const newProgress = prev - decrement;
        if (newProgress <= 0) {
          onDismiss?.();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    const timeout = setTimeout(() => {
      onDismiss?.();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isVisible, duration, onDismiss]);

  if (!isVisible) return null;

  const positionClasses = {
    top: 'top-4 left-1/2 transform -translate-x-1/2',
    bottom: 'bottom-4 left-1/2 transform -translate-x-1/2',
    center: 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
  };

  return (
    <div className={cn(
      'fixed z-40 animate-in slide-in-from-top-2 duration-300',
      positionClasses[position],
      className
    )}>
      <Card className="shadow-lg border-2 min-w-[300px]">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-white',
              config.color
            )}>
              <PhaseIcon className="h-5 w-5" />
            </div>
            
            <div className="flex-1">
              <h4 className="font-semibold text-sm">
                Now in {config.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>
            </div>
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Progress bar for auto-dismiss */}
          <Progress 
            value={progress} 
            className="h-1 mt-3 opacity-50"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default PhaseTransition;
