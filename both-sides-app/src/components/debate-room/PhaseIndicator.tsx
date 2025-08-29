'use client';

/**
 * Phase 6 Task 6.3.1: Phase Indicator Component
 * 
 * Visual phase status indicator for the current debate phase
 * Shows phase progress, timing, and visual status
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { DebatePhase } from '@/types/debate';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Play, 
  Timer, 
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { HelpTooltip, PhaseHelpTooltip } from './HelpTooltips';
import { PhaseTimer } from './PhaseTimer';
import { PhaseProgress } from './PhaseProgress';

export interface PhaseIndicatorProps {
  currentPhase: DebatePhase;
  timeRemaining?: number; // milliseconds
  totalPhaseTime?: number; // milliseconds
  phaseStartTime?: Date;
  completedPhases?: DebatePhase[];
  isPaused?: boolean;
  isTeacher?: boolean;
  variant?: 'default' | 'compact' | 'minimal' | 'badge';
  showProgress?: boolean;
  showTimeRemaining?: boolean;
  showTimer?: boolean;
  showPhaseProgress?: boolean;
  onPhaseComplete?: (phase: DebatePhase) => void;
  onPause?: () => void;
  onResume?: () => void;
  onSkip?: () => void;
  onExtend?: (additionalMs: number) => void;
  className?: string;
}

interface PhaseConfig {
  phase: DebatePhase;
  displayName: string;
  shortName: string;
  description: string;
  color: {
    bg: string;
    text: string;
    border: string;
    progress: string;
  };
  icon: React.ReactNode;
}

// Phase configuration with enhanced styling
const PHASE_CONFIGS: Record<DebatePhase, PhaseConfig> = {
  PREPARATION: {
    phase: 'PREPARATION',
    displayName: 'Preparation Phase',
    shortName: 'Prep',
    description: 'Review topic and prepare arguments',
    color: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      progress: 'bg-blue-500'
    },
    icon: <BookOpen className="h-4 w-4" />
  },
  OPENING: {
    phase: 'OPENING',
    displayName: 'Opening Statements',
    shortName: 'Opening',
    description: 'Present your initial position',
    color: {
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      progress: 'bg-green-500'
    },
    icon: <Play className="h-4 w-4" />
  },
  DISCUSSION: {
    phase: 'DISCUSSION',
    displayName: 'Discussion Phase',
    shortName: 'Discussion',
    description: 'Exchange ideas and arguments',
    color: {
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
      progress: 'bg-yellow-500'
    },
    icon: <Timer className="h-4 w-4" />
  },
  REBUTTAL: {
    phase: 'REBUTTAL',
    displayName: 'Rebuttal Phase',
    shortName: 'Rebuttal',
    description: 'Respond to opposing arguments',
    color: {
      bg: 'bg-orange-50 dark:bg-orange-950',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
      progress: 'bg-orange-500'
    },
    icon: <ArrowRight className="h-4 w-4" />
  },
  CLOSING: {
    phase: 'CLOSING',
    displayName: 'Closing Statements',
    shortName: 'Closing',
    description: 'Summarize your position',
    color: {
      bg: 'bg-red-50 dark:bg-red-950',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      progress: 'bg-red-500'
    },
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  REFLECTION: {
    phase: 'REFLECTION',
    displayName: 'Reflection Phase',
    shortName: 'Reflection',
    description: 'Reflect on the debate',
    color: {
      bg: 'bg-purple-50 dark:bg-purple-950',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      progress: 'bg-purple-500'
    },
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  COMPLETED: {
    phase: 'COMPLETED',
    displayName: 'Debate Completed',
    shortName: 'Complete',
    description: 'Debate has ended',
    color: {
      bg: 'bg-gray-50 dark:bg-gray-950',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-800',
      progress: 'bg-gray-500'
    },
    icon: <CheckCircle2 className="h-4 w-4" />
  }
};

/**
 * Format time from milliseconds to human readable string
 */
function formatTime(milliseconds: number): string {
  if (milliseconds <= 0) return '0:00';
  
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate progress percentage (0-100)
 */
function calculateProgress(timeRemaining: number, totalTime: number): number {
  if (totalTime <= 0) return 0;
  const elapsed = totalTime - timeRemaining;
  return Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
}

/**
 * Phase Status Indicator Component
 */
export function PhaseIndicator({
  currentPhase,
  timeRemaining,
  totalPhaseTime,
  phaseStartTime,
  completedPhases = [],
  isPaused = false,
  isTeacher = false,
  variant = 'default',
  showProgress = true,
  showTimeRemaining = true,
  showTimer = false,
  showPhaseProgress = false,
  onPhaseComplete,
  onPause,
  onResume,
  onSkip,
  onExtend,
  className
}: PhaseIndicatorProps) {
  const phaseConfig = PHASE_CONFIGS[currentPhase];
  const hasTimer = timeRemaining !== undefined && totalPhaseTime !== undefined;
  const progress = hasTimer ? calculateProgress(timeRemaining, totalPhaseTime) : 0;
  const isWarning = hasTimer && timeRemaining < 60000; // Warning if less than 1 minute
  
  // Badge variant - Simple phase badge
  if (variant === 'badge') {
    return (
      <Badge 
        className={cn(
          "gap-1 flex items-center",
          phaseConfig.color.text,
          phaseConfig.color.border,
          className
        )}
      >
        <span className="flex items-center gap-1">
          {phaseConfig.icon}
          {phaseConfig.shortName}
        </span>
      </Badge>
    );
  }
  
  // Minimal variant - Just phase name and time
  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("flex items-center gap-1", phaseConfig.color.text)}>
          {phaseConfig.icon}
          <span className="text-sm font-medium">{phaseConfig.shortName}</span>
        </div>
        {hasTimer && showTimeRemaining && (
          <span className={cn(
            "text-sm font-mono",
            isWarning ? "text-red-500" : "text-muted-foreground"
          )}>
            {formatTime(timeRemaining)}
          </span>
        )}
      </div>
    );
  }
  
  // Compact variant - Phase info in a single row
  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        phaseConfig.color.bg,
        phaseConfig.color.border,
        className
      )}>
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center", phaseConfig.color.text)}>
            {phaseConfig.icon}
          </div>
          <div>
            <h4 className={cn("font-medium text-sm", phaseConfig.color.text)}>
              {phaseConfig.displayName}
            </h4>
            <p className="text-xs text-muted-foreground">
              {phaseConfig.description}
            </p>
          </div>
        </div>
        
        {hasTimer && (
          <div className="text-right">
            {showTimeRemaining && (
              <div className={cn(
                "text-sm font-mono",
                isWarning ? "text-red-500" : phaseConfig.color.text
              )}>
                {formatTime(timeRemaining)}
              </div>
            )}
            {showProgress && (
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round(progress)}% complete
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Default variant - Full phase indicator with progress
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      phaseConfig.color.bg,
      phaseConfig.color.border,
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center", phaseConfig.color.text)}>
            {phaseConfig.icon}
          </div>
          <div>
            <h3 className={cn("font-semibold", phaseConfig.color.text)}>
              {phaseConfig.displayName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {phaseConfig.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Phase Help Tooltip */}
          <PhaseHelpTooltip 
            phase={currentPhase} 
            variant="icon" 
            size="sm"
            position="left"
          />
          
          {/* Warning indicator */}
          {isWarning && (
            <div className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Ending soon</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Timer and Progress */}
      {hasTimer && (
        <div className="space-y-2">
          {showTimeRemaining && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Time remaining
              </span>
              <span className={cn(
                "font-mono font-medium",
                isWarning ? "text-red-500" : phaseConfig.color.text
              )}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
          
          {showProgress && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="relative">
                <Progress 
                  value={progress} 
                  className="h-2"
                />
                <div 
                  className={cn(
                    "absolute top-0 left-0 h-2 rounded-full transition-all duration-300",
                    isWarning ? "bg-red-500" : phaseConfig.color.progress
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Status indicators */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-opacity-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs">
            <Clock className={cn("h-3 w-3", phaseConfig.color.text)} />
            <span className="text-muted-foreground">Active phase</span>
          </div>
        </div>
        
        {hasTimer && totalPhaseTime && (
          <div className="text-xs text-muted-foreground">
            Total: {formatTime(totalPhaseTime)}
          </div>
        )}
      </div>
      
      {/* Enhanced Timer Display */}
      {showTimer && phaseStartTime && totalPhaseTime && (
        <div className="mt-4">
          <PhaseTimer
            phase={currentPhase}
            phaseStartTime={phaseStartTime}
            phaseDurationMs={totalPhaseTime}
            isPaused={isPaused}
            isTeacher={isTeacher}
            onPhaseComplete={onPhaseComplete}
            onPause={onPause}
            onResume={onResume}
            onSkip={onSkip}
            onExtend={onExtend}
            className="w-full"
          />
        </div>
      )}
      
      {/* Phase Progress Timeline */}
      {showPhaseProgress && (
        <div className="mt-4">
          <PhaseProgress
            currentPhase={currentPhase}
            completedPhases={completedPhases}
            phaseStartTime={phaseStartTime}
            phaseDurationMs={totalPhaseTime}
            isPaused={isPaused}
            variant="compact"
            showEstimatedTime={true}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Multiple Phase Status - Shows current + upcoming phases
 */
export interface PhaseStatusProps {
  currentPhase: DebatePhase;
  timeRemaining?: number;
  totalPhaseTime?: number;
  showUpcoming?: boolean;
  className?: string;
}

export function PhaseStatus({
  currentPhase,
  timeRemaining,
  totalPhaseTime,
  showUpcoming = true,
  className
}: PhaseStatusProps) {
  const phases: DebatePhase[] = [
    'PREPARATION',
    'OPENING', 
    'DISCUSSION',
    'REBUTTAL',
    'CLOSING',
    'REFLECTION'
  ];
  
  const currentIndex = phases.indexOf(currentPhase);
  const upcomingPhases = showUpcoming ? phases.slice(currentIndex + 1, currentIndex + 3) : [];
  
  return (
    <div className={cn("space-y-3", className)}>
      {/* Current Phase */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          Current Phase
        </h4>
        <PhaseIndicator
          currentPhase={currentPhase}
          timeRemaining={timeRemaining}
          totalPhaseTime={totalPhaseTime}
          variant="compact"
        />
      </div>
      
      {/* Upcoming Phases */}
      {showUpcoming && upcomingPhases.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Coming Next
          </h4>
          <div className="space-y-2">
            {upcomingPhases.map((phase, index) => {
              const config = PHASE_CONFIGS[phase];
              return (
                <div 
                  key={phase}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs">{index + 2}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center">
                      {config.icon}
                    </span>
                    <span>{config.displayName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default PhaseIndicator;