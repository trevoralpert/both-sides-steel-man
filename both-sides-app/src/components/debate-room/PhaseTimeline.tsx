'use client';

/**
 * Phase 6 Task 6.3.1: Phase Timeline Component
 * 
 * Visual timeline overview of all debate phases with progress tracking
 * Shows past, current, and future phases with timing information
 */

import React from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase } from '@/types/debate';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Play, 
  Timer, 
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Circle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface PhaseTimelineProps {
  currentPhase: DebatePhase;
  timeRemaining?: number;
  totalPhaseTime?: number;
  phaseHistory?: PhaseHistoryItem[];
  variant?: 'default' | 'compact' | 'horizontal';
  showTimestamps?: boolean;
  showDurations?: boolean;
  isCollapsible?: boolean;
  onPhaseClick?: (phase: DebatePhase) => void;
  className?: string;
}

export interface PhaseHistoryItem {
  phase: DebatePhase;
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // milliseconds
  completedSuccessfully: boolean;
}

interface PhaseTimelineConfig {
  phase: DebatePhase;
  displayName: string;
  shortName: string;
  description: string;
  estimatedDuration: number; // minutes
  color: {
    primary: string;
    background: string;
    text: string;
    border: string;
  };
  icon: React.ReactNode;
  requirements?: string[];
}

// Enhanced phase configuration for timeline
const PHASE_TIMELINE_CONFIGS: Record<DebatePhase, PhaseTimelineConfig> = {
  PREPARATION: {
    phase: 'PREPARATION',
    displayName: 'Preparation',
    shortName: 'Prep',
    description: 'Review topic and prepare arguments',
    estimatedDuration: 5,
    color: {
      primary: 'bg-blue-500',
      background: 'bg-blue-50 dark:bg-blue-950',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800'
    },
    icon: <BookOpen className="h-4 w-4" />,
    requirements: ['Review debate topic', 'Research key points', 'Prepare opening arguments']
  },
  OPENING: {
    phase: 'OPENING',
    displayName: 'Opening Statements',
    shortName: 'Opening',
    description: 'Present your initial position',
    estimatedDuration: 10,
    color: {
      primary: 'bg-green-500',
      background: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800'
    },
    icon: <Play className="h-4 w-4" />,
    requirements: ['State your position clearly', 'Present main arguments', 'Set debate foundation']
  },
  DISCUSSION: {
    phase: 'DISCUSSION',
    displayName: 'Discussion',
    shortName: 'Discussion',
    description: 'Exchange ideas and arguments',
    estimatedDuration: 30,
    color: {
      primary: 'bg-yellow-500',
      background: 'bg-yellow-50 dark:bg-yellow-950',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800'
    },
    icon: <Timer className="h-4 w-4" />,
    requirements: ['Engage with opposing views', 'Build on arguments', 'Ask clarifying questions']
  },
  REBUTTAL: {
    phase: 'REBUTTAL',
    displayName: 'Rebuttal',
    shortName: 'Rebuttal',
    description: 'Respond to opposing arguments',
    estimatedDuration: 15,
    color: {
      primary: 'bg-orange-500',
      background: 'bg-orange-50 dark:bg-orange-950',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800'
    },
    icon: <ArrowRight className="h-4 w-4" />,
    requirements: ['Address counter-arguments', 'Strengthen your position', 'Challenge weak points']
  },
  CLOSING: {
    phase: 'CLOSING',
    displayName: 'Closing Statements',
    shortName: 'Closing',
    description: 'Summarize your position',
    estimatedDuration: 10,
    color: {
      primary: 'bg-red-500',
      background: 'bg-red-50 dark:bg-red-950',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800'
    },
    icon: <CheckCircle2 className="h-4 w-4" />,
    requirements: ['Summarize key arguments', 'Reinforce main points', 'Final persuasive appeal']
  },
  REFLECTION: {
    phase: 'REFLECTION',
    displayName: 'Reflection',
    shortName: 'Reflection',
    description: 'Reflect on the debate',
    estimatedDuration: 10,
    color: {
      primary: 'bg-purple-500',
      background: 'bg-purple-50 dark:bg-purple-950',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800'
    },
    icon: <CheckCircle2 className="h-4 w-4" />,
    requirements: ['Evaluate debate performance', 'Identify learning points', 'Consider other perspectives']
  },
  COMPLETED: {
    phase: 'COMPLETED',
    displayName: 'Completed',
    shortName: 'Complete',
    description: 'Debate has ended',
    estimatedDuration: 0,
    color: {
      primary: 'bg-gray-500',
      background: 'bg-gray-50 dark:bg-gray-950',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-800'
    },
    icon: <CheckCircle2 className="h-4 w-4" />,
    requirements: []
  }
};

/**
 * Format duration from milliseconds
 */
function formatDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  
  if (minutes === 0) {
    return `${seconds}s`;
  }
  if (seconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

/**
 * Format time to readable format
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Get phase status based on current phase and history
 */
function getPhaseStatus(
  phase: DebatePhase, 
  currentPhase: DebatePhase, 
  phaseHistory?: PhaseHistoryItem[]
): 'completed' | 'current' | 'upcoming' | 'skipped' {
  const phases: DebatePhase[] = [
    'PREPARATION', 
    'OPENING', 
    'DISCUSSION', 
    'REBUTTAL', 
    'CLOSING', 
    'REFLECTION'
  ];
  
  const currentIndex = phases.indexOf(currentPhase);
  const phaseIndex = phases.indexOf(phase);
  
  // Check if phase was completed
  const historyItem = phaseHistory?.find(h => h.phase === phase);
  if (historyItem?.completedSuccessfully) {
    return 'completed';
  }
  
  if (phase === currentPhase) {
    return 'current';
  }
  
  if (phaseIndex < currentIndex) {
    return historyItem ? 'completed' : 'skipped';
  }
  
  return 'upcoming';
}

/**
 * Individual Phase Timeline Item
 */
interface PhaseTimelineItemProps {
  phase: DebatePhase;
  status: 'completed' | 'current' | 'upcoming' | 'skipped';
  config: PhaseTimelineConfig;
  historyItem?: PhaseHistoryItem;
  timeRemaining?: number;
  showTimestamps?: boolean;
  showDurations?: boolean;
  showRequirements?: boolean;
  onClick?: () => void;
  className?: string;
}

function PhaseTimelineItem({
  phase,
  status,
  config,
  historyItem,
  timeRemaining,
  showTimestamps = true,
  showDurations = true,
  showRequirements = false,
  onClick,
  className
}: PhaseTimelineItemProps) {
  const isInteractive = !!onClick;
  
  const statusConfig = {
    completed: {
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
      connector: 'bg-green-500'
    },
    current: {
      icon: config.icon,
      iconColor: config.color.text,
      bgColor: config.color.background,
      borderColor: config.color.border,
      connector: config.color.primary.replace('bg-', 'bg-')
    },
    upcoming: {
      icon: Circle,
      iconColor: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
      borderColor: 'border-muted',
      connector: 'bg-muted'
    },
    skipped: {
      icon: Circle,
      iconColor: 'text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800',
      connector: 'bg-red-300'
    }
  };
  
  const currentConfig = statusConfig[status];
  const IconComponent = currentConfig.icon;
  
  return (
    <div 
      className={cn(
        "relative flex items-start gap-4 pb-6",
        isInteractive && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Timeline connector line */}
      <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
      
      {/* Phase icon */}
      <div className={cn(
        "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2",
        currentConfig.bgColor,
        currentConfig.borderColor
      )}>
        {React.isValidElement(IconComponent) ? 
          <div className={cn("h-5 w-5", currentConfig.iconColor)}>{IconComponent}</div> :
          React.createElement(IconComponent as React.ComponentType<any>, { 
            className: cn("h-5 w-5", currentConfig.iconColor) 
          })
        }
        
        {status === 'current' && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full opacity-30",
              config.color.primary
            )}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}
      </div>
      
      {/* Phase content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h4 className={cn(
              "font-medium",
              status === 'current' ? config.color.text : "text-foreground"
            )}>
              {config.displayName}
            </h4>
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
          </div>
          
          <div className="text-right text-sm">
            <Badge variant={status === 'current' ? 'default' : 'secondary'}>
              {status === 'current' ? 'Active' : 
               status === 'completed' ? 'Done' :
               status === 'skipped' ? 'Skipped' : 'Upcoming'}
            </Badge>
          </div>
        </div>
        
        {/* Timing information */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>~{config.estimatedDuration}min</span>
          </div>
          
          {status === 'current' && timeRemaining && (
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              <span>{formatDuration(timeRemaining)} left</span>
            </div>
          )}
          
          {showTimestamps && historyItem && (
            <>
              {historyItem.startedAt && (
                <div>Started: {formatTime(historyItem.startedAt)}</div>
              )}
              {historyItem.endedAt && (
                <div>Ended: {formatTime(historyItem.endedAt)}</div>
              )}
            </>
          )}
          
          {showDurations && historyItem?.duration && (
            <div>Duration: {formatDuration(historyItem.duration)}</div>
          )}
        </div>
        
        {/* Requirements */}
        {showRequirements && config.requirements && config.requirements.length > 0 && (
          <div className="mt-2">
            <ul className="text-xs text-muted-foreground space-y-1">
              {config.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main Phase Timeline Component
 */
export function PhaseTimeline({
  currentPhase,
  timeRemaining,
  totalPhaseTime,
  phaseHistory = [],
  variant = 'default',
  showTimestamps = true,
  showDurations = true,
  isCollapsible = false,
  onPhaseClick,
  className
}: PhaseTimelineProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  const phases: DebatePhase[] = [
    'PREPARATION',
    'OPENING', 
    'DISCUSSION',
    'REBUTTAL',
    'CLOSING',
    'REFLECTION'
  ];
  
  // Calculate overall progress
  const currentIndex = phases.indexOf(currentPhase);
  const overallProgress = currentPhase === 'COMPLETED' ? 100 : ((currentIndex + 1) / phases.length) * 100;
  
  // Horizontal compact variant
  if (variant === 'horizontal') {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Debate Progress</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <div className="flex items-center gap-2">
            {phases.map((phase, index) => {
              const config = PHASE_TIMELINE_CONFIGS[phase];
              const status = getPhaseStatus(phase, currentPhase, phaseHistory);
              const isActive = status === 'current';
              const isCompleted = status === 'completed';
              
              return (
                <React.Fragment key={phase}>
                  <div 
                    className={cn(
                      "flex-1 h-2 rounded-full transition-colors",
                      isCompleted ? config.color.primary :
                      isActive ? config.color.primary + '/50' :
                      "bg-muted"
                    )}
                  />
                  {index < phases.length - 1 && (
                    <div className="w-2 h-2 rounded-full bg-border" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        
        {/* Current phase info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={PHASE_TIMELINE_CONFIGS[currentPhase].color.text}>
              {PHASE_TIMELINE_CONFIGS[currentPhase].icon}
            </div>
            <span className="font-medium">
              {PHASE_TIMELINE_CONFIGS[currentPhase].displayName}
            </span>
          </div>
          {timeRemaining && (
            <span className="text-sm text-muted-foreground font-mono">
              {formatDuration(timeRemaining)}
            </span>
          )}
        </div>
      </div>
    );
  }
  
  // Compact variant
  if (variant === 'compact') {
    const visiblePhases = isCollapsed 
      ? phases.filter(p => getPhaseStatus(p, currentPhase, phaseHistory) === 'current')
      : phases;
    
    return (
      <Card className={cn("p-4", className)}>
        {isCollapsible && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Debate Timeline</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="gap-1"
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
              {isCollapsed ? 'Show All' : 'Collapse'}
            </Button>
          </div>
        )}
        
        <div className="space-y-3">
          {visiblePhases.map((phase) => {
            const config = PHASE_TIMELINE_CONFIGS[phase];
            const status = getPhaseStatus(phase, currentPhase, phaseHistory);
            const historyItem = phaseHistory.find(h => h.phase === phase);
            const phaseTimeRemaining = phase === currentPhase ? timeRemaining : undefined;
            
            return (
              <PhaseTimelineItem
                key={phase}
                phase={phase}
                status={status}
                config={config}
                historyItem={historyItem}
                timeRemaining={phaseTimeRemaining}
                showTimestamps={showTimestamps}
                showDurations={showDurations}
                showRequirements={false}
                onClick={onPhaseClick ? () => onPhaseClick(phase) : undefined}
              />
            );
          })}
        </div>
      </Card>
    );
  }
  
  // Default variant - Full timeline
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Debate Timeline</h3>
          <Badge variant="outline">
            {Math.round(overallProgress)}% Complete
          </Badge>
        </div>
        
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Overall Progress</span>
            <span>{currentIndex + 1} of {phases.length} phases</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
      
      {/* Phase timeline */}
      <div className="relative">
        {phases.map((phase) => {
          const config = PHASE_TIMELINE_CONFIGS[phase];
          const status = getPhaseStatus(phase, currentPhase, phaseHistory);
          const historyItem = phaseHistory.find(h => h.phase === phase);
          const phaseTimeRemaining = phase === currentPhase ? timeRemaining : undefined;
          
          return (
            <PhaseTimelineItem
              key={phase}
              phase={phase}
              status={status}
              config={config}
              historyItem={historyItem}
              timeRemaining={phaseTimeRemaining}
              showTimestamps={showTimestamps}
              showDurations={showDurations}
              showRequirements={true}
              onClick={onPhaseClick ? () => onPhaseClick(phase) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

export default PhaseTimeline;
