'use client';

/**
 * Phase 6 Task 6.3.1: Phase Progress Component
 * 
 * Visual timeline showing debate phase progression with status indicators
 */

import React, { useMemo } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase } from '@/types/debate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  PlayCircle, 
  Pause,
  FastForward,
  Timer,
  Users,
  MessageSquare,
  Target,
  FileText,
  Lightbulb
} from 'lucide-react';

export interface PhaseProgressProps {
  currentPhase: DebatePhase;
  completedPhases: DebatePhase[];
  phaseStartTime?: Date;
  phaseDurationMs?: number;
  isPaused?: boolean;
  variant?: 'full' | 'compact' | 'minimal';
  showEstimatedTime?: boolean;
  className?: string;
}

// Phase configuration with metadata
const PHASE_CONFIG = {
  PREPARATION: {
    name: 'Preparation',
    description: 'Research and organize arguments',
    icon: FileText,
    color: 'blue',
    estimatedDuration: 10, // minutes
    order: 0
  },
  OPENING: {
    name: 'Opening Statements',
    description: 'Present initial positions',
    icon: PlayCircle,
    color: 'green',
    estimatedDuration: 3,
    order: 1
  },
  DISCUSSION: {
    name: 'Main Discussion',
    description: 'Exchange arguments and evidence',
    icon: MessageSquare,
    color: 'purple',
    estimatedDuration: 15,
    order: 2
  },
  REBUTTAL: {
    name: 'Rebuttals',
    description: 'Address opposing arguments',
    icon: Target,
    color: 'orange',
    estimatedDuration: 5,
    order: 3
  },
  CLOSING: {
    name: 'Closing Statements',
    description: 'Summarize and conclude',
    icon: CheckCircle2,
    color: 'red',
    estimatedDuration: 3,
    order: 4
  },
  REFLECTION: {
    name: 'Reflection',
    description: 'Analyze and learn from debate',
    icon: Lightbulb,
    color: 'amber',
    estimatedDuration: 5,
    order: 5
  },
  COMPLETED: {
    name: 'Completed',
    description: 'Debate finished',
    icon: CheckCircle2,
    color: 'green',
    estimatedDuration: 0,
    order: 6
  }
} as const;

// Get all phases in order
const ORDERED_PHASES: DebatePhase[] = Object.entries(PHASE_CONFIG)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([phase]) => phase as DebatePhase);

export function PhaseProgress({
  currentPhase,
  completedPhases,
  phaseStartTime,
  phaseDurationMs,
  isPaused = false,
  variant = 'full',
  showEstimatedTime = true,
  className
}: PhaseProgressProps) {
  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const currentPhaseOrder = PHASE_CONFIG[currentPhase].order;
    const totalPhases = ORDERED_PHASES.length;
    
    // Base progress from completed phases
    let progress = (completedPhases.length / totalPhases) * 100;
    
    // Add progress within current phase if timing data available
    if (phaseStartTime && phaseDurationMs) {
      const elapsedMs = Date.now() - phaseStartTime.getTime();
      const phaseProgress = Math.min(1, elapsedMs / phaseDurationMs);
      const phaseWeight = 100 / totalPhases;
      progress += phaseProgress * phaseWeight;
    }
    
    return Math.min(100, Math.max(0, progress));
  }, [currentPhase, completedPhases, phaseStartTime, phaseDurationMs]);

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    const currentPhaseOrder = PHASE_CONFIG[currentPhase].order;
    const remainingPhases = ORDERED_PHASES.slice(currentPhaseOrder + 1);
    
    let totalMinutes = 0;
    
    // Add time from remaining phases
    remainingPhases.forEach(phase => {
      totalMinutes += PHASE_CONFIG[phase].estimatedDuration;
    });
    
    // Add remaining time from current phase
    if (phaseStartTime && phaseDurationMs) {
      const elapsedMs = Date.now() - phaseStartTime.getTime();
      const remainingMs = Math.max(0, phaseDurationMs - elapsedMs);
      totalMinutes += Math.ceil(remainingMs / (1000 * 60));
    } else {
      totalMinutes += PHASE_CONFIG[currentPhase].estimatedDuration;
    }
    
    return totalMinutes;
  }, [currentPhase, phaseStartTime, phaseDurationMs]);

  // Get phase status
  const getPhaseStatus = (phase: DebatePhase) => {
    if (completedPhases.includes(phase)) return 'completed';
    if (phase === currentPhase) return 'active';
    if (PHASE_CONFIG[phase].order < PHASE_CONFIG[currentPhase].order) return 'completed';
    return 'upcoming';
  };

  // Format time
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Minimal variant - just a progress bar
  if (variant === 'minimal') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{PHASE_CONFIG[currentPhase].name}</span>
          <span className="text-muted-foreground">
            {Math.round(overallProgress)}% complete
          </span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>
    );
  }

  // Compact variant - horizontal timeline
  if (variant === 'compact') {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Debate Progress</h3>
              {showEstimatedTime && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-2 w-2 mr-1" />
                  {formatTime(estimatedTimeRemaining)} remaining
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              <Progress value={overallProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedPhases.length + 1}/{ORDERED_PHASES.length} phases</span>
                <span>{Math.round(overallProgress)}% complete</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium">{PHASE_CONFIG[currentPhase].name}</p>
              <p className="text-xs text-muted-foreground">
                {PHASE_CONFIG[currentPhase].description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant - detailed timeline
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Debate Timeline</CardTitle>
            <CardDescription>
              Track progress through debate phases
            </CardDescription>
          </div>
          
          {showEstimatedTime && (
            <div className="text-right">
              <div className="text-sm font-medium">
                {formatTime(estimatedTimeRemaining)} remaining
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(overallProgress)}% complete
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Progress value={overallProgress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Phase {completedPhases.length + 1} of {ORDERED_PHASES.length}</span>
              <span>{isPaused && <Pause className="h-3 w-3 inline mr-1" />}
                {isPaused ? 'Paused' : 'In Progress'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {ORDERED_PHASES.map((phase, index) => {
              const config = PHASE_CONFIG[phase];
              const status = getPhaseStatus(phase);
              const PhaseIcon = config.icon;

              return (
                <div key={phase} className="flex items-center space-x-3">
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center',
                    status === 'completed' ? 'border-green-300 bg-green-100' :
                    status === 'active' ? 'border-blue-300 bg-blue-100' :
                    'border-gray-300 bg-gray-100'
                  )}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <PhaseIcon className={cn(
                        'h-4 w-4',
                        status === 'active' ? 'text-blue-600' :
                        'text-gray-400'
                      )} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={cn(
                        'text-sm',
                        status === 'active' ? 'font-semibold text-blue-800' :
                        status === 'completed' ? 'font-medium text-green-800' :
                        'text-gray-600'
                      )}>
                        {config.name}
                      </h3>
                      
                      <div className="flex items-center space-x-2">
                        {status === 'active' && (
                          <Badge className="text-xs bg-blue-100 text-blue-800">
                            Active
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {config.estimatedDuration}m
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PhaseProgress;
