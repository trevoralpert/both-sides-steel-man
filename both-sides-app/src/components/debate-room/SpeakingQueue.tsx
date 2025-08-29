'use client';

/**
 * Phase 6 Task 6.3.2: Speaking Queue Component
 * 
 * Turn order display and queue management for structured debate phases
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DebatePhase, DebatePosition } from '@/types/debate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight,
  Clock,
  Mic,
  MicOff,
  Users,
  Play,
  CheckCircle2,
  AlertCircle,
  Timer
} from 'lucide-react';

export interface SpeakingQueueProps {
  currentPhase: DebatePhase;
  currentSpeakerId?: string;
  participants: Array<{
    id: string;
    name: string;
    position: DebatePosition;
    avatar?: string;
    isOnline?: boolean;
    hasSpoken?: boolean;
  }>;
  queueOrder?: string[]; // Ordered list of participant IDs
  turnProgress?: {
    current: number;
    total: number;
  };
  variant?: 'default' | 'compact' | 'horizontal';
  showProgress?: boolean;
  className?: string;
}

// Phase-specific turn management rules
const PHASE_TURN_RULES = {
  PREPARATION: {
    requiresTurns: false,
    allowsQueue: false,
    description: 'No speaking during preparation'
  },
  OPENING: {
    requiresTurns: true,
    allowsQueue: true,
    description: 'Both participants present opening statements',
    pattern: 'sequential' // Both must speak once
  },
  DISCUSSION: {
    requiresTurns: false,
    allowsQueue: true,
    description: 'Open discussion with suggested turn-taking',
    pattern: 'flexible' // Natural conversation flow
  },
  REBUTTAL: {
    requiresTurns: true,
    allowsQueue: true,
    description: 'Structured rebuttals',
    pattern: 'alternating' // Strict back-and-forth
  },
  CLOSING: {
    requiresTurns: true,
    allowsQueue: true,
    description: 'Final statements from both participants',
    pattern: 'sequential' // Both must speak once
  },
  REFLECTION: {
    requiresTurns: false,
    allowsQueue: false,
    description: 'Individual reflection time'
  }
} as const;

export function SpeakingQueue({
  currentPhase,
  currentSpeakerId,
  participants,
  queueOrder,
  turnProgress,
  variant = 'default',
  showProgress = true,
  className
}: SpeakingQueueProps) {
  const phaseRules = PHASE_TURN_RULES[currentPhase];

  // Generate queue order based on phase rules
  const effectiveQueue = useMemo(() => {
    if (queueOrder) return queueOrder;
    
    // Default queue generation based on phase
    switch (phaseRules.pattern) {
      case 'sequential':
        // PRO first, then CON (for opening/closing)
        return participants
          .sort((a, b) => a.position === 'PRO' ? -1 : 1)
          .map(p => p.id);
      
      case 'alternating':
        // Alternate between positions (for rebuttal)
        const proParticipants = participants.filter(p => p.position === 'PRO');
        const conParticipants = participants.filter(p => p.position === 'CON');
        const alternating: string[] = [];
        
        const maxLength = Math.max(proParticipants.length, conParticipants.length);
        for (let i = 0; i < maxLength; i++) {
          if (proParticipants[i]) alternating.push(proParticipants[i].id);
          if (conParticipants[i]) alternating.push(conParticipants[i].id);
        }
        return alternating;
      
      case 'flexible':
      default:
        // Natural order (for discussion)
        return participants.map(p => p.id);
    }
  }, [queueOrder, participants, phaseRules.pattern]);

  // Get current speaker index
  const currentSpeakerIndex = currentSpeakerId ? 
    effectiveQueue.indexOf(currentSpeakerId) : -1;

  // Get participant by ID
  const getParticipant = (id: string) => 
    participants.find(p => p.id === id);

  // Get participant status
  const getParticipantStatus = (participantId: string) => {
    if (participantId === currentSpeakerId) return 'speaking';
    
    const participant = getParticipant(participantId);
    if (participant?.hasSpoken && phaseRules.pattern === 'sequential') return 'completed';
    
    if (currentSpeakerIndex >= 0) {
      const participantIndex = effectiveQueue.indexOf(participantId);
      if (participantIndex < currentSpeakerIndex) return 'completed';
      if (participantIndex === currentSpeakerIndex + 1) return 'next';
    }
    
    return 'waiting';
  };

  // Get status styling
  const getStatusStyling = (status: string) => {
    switch (status) {
      case 'speaking':
        return {
          containerClass: 'border-green-300 bg-green-50 ring-2 ring-green-200',
          iconClass: 'text-green-600',
          textClass: 'text-green-800 font-semibold',
          icon: Mic
        };
      case 'next':
        return {
          containerClass: 'border-blue-300 bg-blue-50',
          iconClass: 'text-blue-600',
          textClass: 'text-blue-800 font-medium',
          icon: ArrowRight
        };
      case 'completed':
        return {
          containerClass: 'border-gray-200 bg-gray-50',
          iconClass: 'text-gray-500',
          textClass: 'text-gray-700',
          icon: CheckCircle2
        };
      default:
        return {
          containerClass: 'border-gray-200 bg-white',
          iconClass: 'text-gray-400',
          textClass: 'text-gray-600',
          icon: Clock
        };
    }
  };

  // Don't show queue for phases that don't support it
  if (!phaseRules.allowsQueue) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-4 text-center">
          <MicOff className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            {phaseRules.description}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Horizontal variant - inline display
  if (variant === 'horizontal') {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Speaking Order</span>
              </div>
              
              {showProgress && turnProgress && (
                <Badge variant="outline" className="text-xs">
                  {turnProgress.current}/{turnProgress.total} turns
                </Badge>
              )}
            </div>

            {/* Queue Display */}
            <div className="flex items-center space-x-2 overflow-x-auto">
              {effectiveQueue.map((participantId, index) => {
                const participant = getParticipant(participantId);
                if (!participant) return null;
                
                const status = getParticipantStatus(participantId);
                const styling = getStatusStyling(status);
                const StatusIcon = styling.icon;
                
                return (
                  <React.Fragment key={participantId}>
                    {index > 0 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                    
                    <div className={cn(
                      'flex items-center space-x-2 p-2 rounded border-2 transition-all duration-300 min-w-0 flex-shrink-0',
                      styling.containerClass
                    )}>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="text-xs">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="min-w-0">
                        <div className={cn('text-xs truncate', styling.textClass)}>
                          {participant.name}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {participant.position}
                        </Badge>
                      </div>
                      
                      <StatusIcon className={cn('h-3 w-3', styling.iconClass)} />
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Progress Bar */}
            {showProgress && turnProgress && (
              <Progress 
                value={(turnProgress.current / turnProgress.total) * 100} 
                className="h-2"
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact variant - reduced size
  if (variant === 'compact') {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Turn Order</CardTitle>
            {showProgress && turnProgress && (
              <Badge variant="outline" className="text-xs">
                {turnProgress.current}/{turnProgress.total}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            {phaseRules.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {effectiveQueue.map((participantId, index) => {
              const participant = getParticipant(participantId);
              if (!participant) return null;
              
              const status = getParticipantStatus(participantId);
              const styling = getStatusStyling(status);
              const StatusIcon = styling.icon;
              
              return (
                <div 
                  key={participantId}
                  className={cn(
                    'flex items-center space-x-2 p-2 rounded border transition-all duration-300',
                    styling.containerClass
                  )}
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-xs font-medium text-muted-foreground w-4">
                      {index + 1}.
                    </span>
                    
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback className="text-xs">
                        {participant.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-xs font-medium truncate', styling.textClass)}>
                        {participant.name}
                      </div>
                    </div>
                    
                    <Badge variant="outline" className="text-xs">
                      {participant.position}
                    </Badge>
                  </div>
                  
                  <StatusIcon className={cn('h-3 w-3', styling.iconClass)} />
                </div>
              );
            })}
          </div>
          
          {showProgress && turnProgress && (
            <Progress 
              value={(turnProgress.current / turnProgress.total) * 100} 
              className="h-1 mt-3"
            />
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant - full featured
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Speaking Queue</CardTitle>
            <CardDescription>
              {phaseRules.description} - {phaseRules.pattern} pattern
            </CardDescription>
          </div>
          
          {showProgress && turnProgress && (
            <div className="text-right">
              <div className="text-sm font-semibold">
                {turnProgress.current}/{turnProgress.total}
              </div>
              <div className="text-xs text-muted-foreground">
                Turns completed
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Progress Overview */}
          {showProgress && turnProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Phase Progress</span>
                <span>{Math.round((turnProgress.current / turnProgress.total) * 100)}% complete</span>
              </div>
              <Progress 
                value={(turnProgress.current / turnProgress.total) * 100} 
                className="h-2"
              />
            </div>
          )}

          {/* Queue List */}
          <div className="space-y-3">
            {effectiveQueue.map((participantId, index) => {
              const participant = getParticipant(participantId);
              if (!participant) return null;
              
              const status = getParticipantStatus(participantId);
              const styling = getStatusStyling(status);
              const StatusIcon = styling.icon;
              
              return (
                <div 
                  key={participantId}
                  className={cn(
                    'flex items-center space-x-4 p-4 rounded-lg border-2 transition-all duration-300',
                    styling.containerClass
                  )}
                >
                  {/* Order Number */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-200">
                    <span className="text-sm font-bold text-gray-600">
                      {index + 1}
                    </span>
                  </div>
                  
                  {/* Participant Info */}
                  <div className="flex items-center space-x-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback>
                        {participant.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className={cn('font-medium', styling.textClass)}>
                        {participant.name}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {participant.position}
                        </Badge>
                        {participant.isOnline && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-xs text-muted-foreground">Online</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status */}
                  <div className="flex items-center space-x-2">
                    <StatusIcon className={cn('h-5 w-5', styling.iconClass)} />
                    <div className="text-right">
                      <div className={cn('text-sm font-medium capitalize', styling.textClass)}>
                        {status === 'speaking' ? 'Speaking Now' :
                         status === 'next' ? 'Up Next' :
                         status === 'completed' ? 'Completed' :
                         'Waiting'}
                      </div>
                      {status === 'speaking' && (
                        <div className="text-xs text-muted-foreground">
                          Active speaker
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phase Guidance */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Timer className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-blue-900 mb-1">
                  {currentPhase} Phase Guidelines:
                </div>
                <div className="text-sm text-blue-700">
                  {getPhaseGuidanceText(currentPhase, phaseRules.pattern)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function for phase-specific guidance
function getPhaseGuidanceText(phase: DebatePhase, pattern?: string): string {
  const baseGuidance = {
    OPENING: 'Both participants should present their opening statements. Order is typically PRO first, then CON.',
    DISCUSSION: 'Open discussion phase - speak naturally while being respectful. Feel free to respond to points as they arise.',
    REBUTTAL: 'Structured rebuttals - take turns addressing each other\'s arguments directly.',
    CLOSING: 'Final statements from both participants. This is your chance to summarize your strongest points.'
  };

  const patternGuidance = {
    sequential: ' Wait for your turn in the established order.',
    alternating: ' Take turns responding back-and-forth.',
    flexible: ' Natural conversation flow is encouraged.'
  };

  const base = baseGuidance[phase as keyof typeof baseGuidance] || '';
  const patternAdd = pattern ? patternGuidance[pattern as keyof typeof patternGuidance] || '' : '';
  
  return base + patternAdd;
}

export default SpeakingQueue;
