'use client';

/**
 * Phase 6 Task 6.3.2: Turn Indicator Component
 * 
 * Visual indicator for whose turn it is to speak in the debate
 */

import React from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase, DebatePosition } from '@/types/debate';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mic, 
  MicOff, 
  Clock, 
  ArrowRight,
  Users,
  MessageSquare,
  Play,
  Target,
  CheckCircle2
} from 'lucide-react';

export interface TurnIndicatorProps {
  currentSpeakerId?: string;
  currentPhase: DebatePhase;
  participants: Array<{
    id: string;
    name: string;
    position: DebatePosition;
    avatar?: string;
    isOnline?: boolean;
  }>;
  turnTimeRemaining?: number; // in seconds
  turnTimeLimit?: number; // in seconds
  isCurrentUserTurn?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  showAvatar?: boolean;
  showTimer?: boolean;
  className?: string;
}

// Phase-specific turn rules and messaging
const PHASE_TURN_CONFIG = {
  PREPARATION: {
    allowsSpeaking: false,
    message: 'Research and prepare your arguments',
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  OPENING: {
    allowsSpeaking: true,
    message: 'Opening statements - both participants present',
    icon: Play,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  DISCUSSION: {
    allowsSpeaking: true,
    message: 'Open discussion - speak when ready',
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  REBUTTAL: {
    allowsSpeaking: true,
    message: 'Address opposing arguments',
    icon: Target,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  CLOSING: {
    allowsSpeaking: true,
    message: 'Present closing statements',
    icon: CheckCircle2,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  REFLECTION: {
    allowsSpeaking: false,
    message: 'Reflect on the debate experience',
    icon: Clock,
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  COMPLETED: {
    allowsSpeaking: false,
    message: 'Debate finished',
    icon: CheckCircle2,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
} as const;

export function TurnIndicator({
  currentSpeakerId,
  currentPhase,
  participants,
  turnTimeRemaining,
  turnTimeLimit,
  isCurrentUserTurn = false,
  variant = 'default',
  showAvatar = true,
  showTimer = true,
  className
}: TurnIndicatorProps) {
  const phaseConfig = PHASE_TURN_CONFIG[currentPhase];
  const PhaseIcon = phaseConfig.icon;
  
  // Find current speaker
  const currentSpeaker = currentSpeakerId ? 
    participants.find(p => p.id === currentSpeakerId) : null;
  
  // Get other participant
  const otherParticipant = participants.find(p => p.id !== currentSpeakerId);
  
  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer styling based on time remaining
  const getTimerStyling = () => {
    if (!turnTimeRemaining || !turnTimeLimit) return 'text-gray-600';
    
    const percentRemaining = (turnTimeRemaining / turnTimeLimit) * 100;
    
    if (percentRemaining <= 20) return 'text-red-600 animate-pulse';
    if (percentRemaining <= 50) return 'text-amber-600';
    return 'text-green-600';
  };

  // Minimal variant - just a small indicator
  if (variant === 'minimal') {
    if (!phaseConfig.allowsSpeaking || !currentSpeaker) {
      return (
        <div className={cn('flex items-center space-x-2', className)}>
          <PhaseIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {phaseConfig.message}
          </span>
        </div>
      );
    }

    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="flex items-center space-x-1">
          <Mic className={cn('h-4 w-4', isCurrentUserTurn ? 'text-green-600' : 'text-blue-600')} />
          <span className="text-sm font-medium">
            {isCurrentUserTurn ? 'Your turn' : `${currentSpeaker.name}'s turn`}
          </span>
        </div>
        
        {showTimer && turnTimeRemaining && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-2 w-2 mr-1" />
            {formatTime(turnTimeRemaining)}
          </Badge>
        )}
      </div>
    );
  }

  // Compact variant - reduced size card
  if (variant === 'compact') {
    return (
      <Card className={cn('border-2', phaseConfig.color, className)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PhaseIcon className="h-4 w-4" />
              
              {phaseConfig.allowsSpeaking && currentSpeaker ? (
                <div className="flex items-center space-x-2">
                  {showAvatar && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={currentSpeaker.avatar} />
                      <AvatarFallback className="text-xs">
                        {currentSpeaker.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div>
                    <div className="text-sm font-medium">
                      {isCurrentUserTurn ? 'Your turn to speak' : `${currentSpeaker.name} is speaking`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currentSpeaker.position} position
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm">{phaseConfig.message}</div>
              )}
            </div>
            
            {showTimer && turnTimeRemaining && phaseConfig.allowsSpeaking && (
              <Badge className={cn('text-xs', getTimerStyling())}>
                <Clock className="h-2 w-2 mr-1" />
                {formatTime(turnTimeRemaining)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant - full featured card
  return (
    <Card className={cn(
      'border-2 transition-all duration-300',
      phaseConfig.color,
      isCurrentUserTurn && 'ring-2 ring-blue-300 shadow-lg',
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PhaseIcon className="h-5 w-5" />
              <span className="font-medium text-sm">
                Speaking Turn - {currentPhase}
              </span>
            </div>
            
            {phaseConfig.allowsSpeaking && (
              <Badge className="text-xs">
                <Users className="h-2 w-2 mr-1" />
                Active Phase
              </Badge>
            )}
          </div>

          {/* Speaking Status */}
          {phaseConfig.allowsSpeaking && currentSpeaker ? (
            <div className="space-y-3">
              {/* Current Speaker */}
              <div className={cn(
                'flex items-center space-x-3 p-3 rounded-lg border',
                isCurrentUserTurn ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              )}>
                {showAvatar && (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={currentSpeaker.avatar} />
                    <AvatarFallback>
                      {currentSpeaker.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Mic className={cn(
                      'h-4 w-4', 
                      isCurrentUserTurn ? 'text-blue-600 animate-pulse' : 'text-green-600'
                    )} />
                    <span className="font-medium">
                      {isCurrentUserTurn ? 'Your Turn' : `${currentSpeaker.name} Speaking`}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {currentSpeaker.position}
                    </Badge>
                    {currentSpeaker.isOnline && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs text-muted-foreground">Online</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {showTimer && turnTimeRemaining && (
                  <div className="text-right">
                    <div className={cn('text-lg font-mono font-bold', getTimerStyling())}>
                      {formatTime(turnTimeRemaining)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {turnTimeLimit ? formatTime(turnTimeLimit) : '∞'}
                    </div>
                  </div>
                )}
              </div>

              {/* Next Speaker Indicator */}
              {otherParticipant && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Next:</span>
                  <div className="flex items-center space-x-2">
                    {showAvatar && (
                      <Avatar className="h-6 w-6 opacity-60">
                        <AvatarImage src={otherParticipant.avatar} />
                        <AvatarFallback className="text-xs">
                          {otherParticipant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span>{otherParticipant.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {otherParticipant.position}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Turn Guidance */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">
                      {isCurrentUserTurn ? 'Your Turn Guidelines:' : 'Current Speaker Guidelines:'}
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      {phaseConfig.message}. {getPhaseSpecificGuidance(currentPhase)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* No Active Speaking */
            <div className="text-center py-6">
              <MicOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-2">
                {phaseConfig.message}
              </p>
              {currentPhase === 'PREPARATION' && (
                <p className="text-xs text-blue-600">
                  Speaking will begin in the Opening phase
                </p>
              )}
              {currentPhase === 'REFLECTION' && (
                <p className="text-xs text-green-600">
                  Great debate! Time to reflect on what you learned
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function for phase-specific guidance
function getPhaseSpecificGuidance(phase: DebatePhase): string {
  switch (phase) {
    case 'OPENING':
      return 'Present your main position clearly and concisely.';
    case 'DISCUSSION':
      return 'Share evidence and engage with your opponent\'s points respectfully.';
    case 'REBUTTAL':
      return 'Focus on addressing your opponent\'s strongest arguments.';
    case 'CLOSING':
      return 'Summarize your key points and make a compelling final argument.';
    default:
      return 'Follow the debate structure and be respectful.';
  }
}

export default TurnIndicator;
