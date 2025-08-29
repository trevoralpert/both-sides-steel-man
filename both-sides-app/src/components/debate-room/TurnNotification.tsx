'use client';

/**
 * Phase 6 Task 6.3.2: Turn Notification Component
 * 
 * "Your turn" alerts and turn transition notifications
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { DebatePhase, DebatePosition } from '@/types/debate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  Bell, 
  Clock, 
  ArrowRight,
  X,
  Volume2,
  VolumeX,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Timer
} from 'lucide-react';

export interface TurnNotificationProps {
  isVisible: boolean;
  notificationType: 'your-turn' | 'turn-ending' | 'turn-over' | 'next-speaker';
  currentPhase: DebatePhase;
  speakerName: string;
  speakerPosition?: DebatePosition;
  timeRemaining?: number; // For turn-ending notifications
  duration?: number; // Auto-dismiss duration in ms
  position?: 'top' | 'bottom' | 'center';
  onDismiss?: () => void;
  onAccept?: () => void; // For your-turn notifications
  soundEnabled?: boolean;
  className?: string;
}

// Notification configurations
const NOTIFICATION_CONFIG = {
  'your-turn': {
    title: 'Your Turn to Speak',
    icon: Mic,
    color: 'bg-blue-100 border-blue-300 text-blue-900',
    iconColor: 'text-blue-600',
    showAccept: true,
    defaultDuration: 10000 // 10 seconds
  },
  'turn-ending': {
    title: 'Turn Ending Soon',
    icon: Clock,
    color: 'bg-amber-100 border-amber-300 text-amber-900',
    iconColor: 'text-amber-600',
    showAccept: false,
    defaultDuration: 5000 // 5 seconds
  },
  'turn-over': {
    title: 'Turn Time Expired',
    icon: AlertTriangle,
    color: 'bg-red-100 border-red-300 text-red-900',
    iconColor: 'text-red-600',
    showAccept: false,
    defaultDuration: 7000 // 7 seconds
  },
  'next-speaker': {
    title: 'Next Speaker',
    icon: ArrowRight,
    color: 'bg-green-100 border-green-300 text-green-900',
    iconColor: 'text-green-600',
    showAccept: false,
    defaultDuration: 5000 // 5 seconds
  }
} as const;

// Position styling
const POSITION_CLASSES = {
  top: 'top-4 left-1/2 transform -translate-x-1/2',
  bottom: 'bottom-4 left-1/2 transform -translate-x-1/2',
  center: 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
};

export function TurnNotification({
  isVisible,
  notificationType,
  currentPhase,
  speakerName,
  speakerPosition,
  timeRemaining,
  duration,
  position = 'top',
  onDismiss,
  onAccept,
  soundEnabled = true,
  className
}: TurnNotificationProps) {
  const [progress, setProgress] = useState(100);
  const [isAnimating, setIsAnimating] = useState(false);

  const config = NOTIFICATION_CONFIG[notificationType];
  const NotificationIcon = config.icon;
  const effectiveDuration = duration || config.defaultDuration;

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get phase-specific message
  const getPhaseMessage = () => {
    switch (notificationType) {
      case 'your-turn':
        return getYourTurnMessage(currentPhase);
      case 'turn-ending':
        return `You have ${timeRemaining ? formatTime(timeRemaining) : 'little time'} remaining to conclude your point.`;
      case 'turn-over':
        return 'Your speaking time has expired. Please wrap up your current thought.';
      case 'next-speaker':
        return `${speakerName} will speak next in the ${currentPhase.toLowerCase()} phase.`;
      default:
        return '';
    }
  };

  // Play notification sound
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different tones for different notification types
      switch (notificationType) {
        case 'your-turn':
          // Pleasant ascending chime
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
          break;
        case 'turn-ending':
          // Warning tone
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
          break;
        case 'turn-over':
          // Urgent tone
          oscillator.frequency.setValueAtTime(1047, audioContext.currentTime); // C6
          break;
        case 'next-speaker':
          // Neutral notification
          oscillator.frequency.setValueAtTime(698, audioContext.currentTime); // F5
          break;
      }
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (error) {
      console.warn('Notification sound failed:', error);
    }
  };

  // Handle visibility changes and auto-dismiss
  useEffect(() => {
    if (!isVisible) {
      setProgress(100);
      setIsAnimating(false);
      return;
    }

    // Play sound when notification appears
    playNotificationSound();
    setIsAnimating(true);

    // Progress countdown
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const decrement = 100 / (effectiveDuration / 100);
        const newProgress = prev - decrement;
        if (newProgress <= 0) {
          onDismiss?.();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    // Auto-dismiss timeout
    const dismissTimeout = setTimeout(() => {
      onDismiss?.();
    }, effectiveDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(dismissTimeout);
    };
  }, [isVisible, effectiveDuration, onDismiss, soundEnabled, notificationType]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      'fixed z-50 animate-in slide-in-from-top-2 duration-300',
      POSITION_CLASSES[position],
      className
    )}>
      <Card className={cn(
        'shadow-2xl border-2 min-w-[350px] max-w-md',
        config.color,
        isAnimating && notificationType === 'your-turn' && 'animate-pulse'
      )}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  'p-2 rounded-full',
                  notificationType === 'your-turn' ? 'bg-blue-200' :
                  notificationType === 'turn-ending' ? 'bg-amber-200' :
                  notificationType === 'turn-over' ? 'bg-red-200' :
                  'bg-green-200'
                )}>
                  <NotificationIcon className={cn('h-5 w-5', config.iconColor)} />
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm">
                    {config.title}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {currentPhase}
                    </Badge>
                    {speakerPosition && (
                      <Badge variant="outline" className="text-xs">
                        {speakerPosition}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {speakerName && notificationType !== 'your-turn' ? `${speakerName}: ` : ''}
                {getPhaseMessage()}
              </p>
              
              {/* Time remaining display for turn-ending */}
              {notificationType === 'turn-ending' && timeRemaining && (
                <div className="flex items-center space-x-2 p-2 bg-white bg-opacity-50 rounded">
                  <Timer className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-mono font-bold text-amber-800">
                    {formatTime(timeRemaining)} remaining
                  </span>
                </div>
              )}

              {/* Guidelines for your-turn notifications */}
              {notificationType === 'your-turn' && (
                <div className="text-xs text-blue-700 bg-blue-50 rounded p-2">
                  <strong>Remember:</strong> {getPhaseGuidelines(currentPhase)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              {/* Progress indicator */}
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Progress value={progress} className="h-1 w-16" />
                <span>Auto-dismiss</span>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                {config.showAccept && onAccept && (
                  <Button
                    size="sm"
                    onClick={onAccept}
                    className="h-8"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Start Speaking
                  </Button>
                )}
                
                {onDismiss && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDismiss}
                    className="h-8"
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function for your-turn messages
function getYourTurnMessage(phase: DebatePhase): string {
  switch (phase) {
    case 'OPENING':
      return 'Time to present your opening statement. Share your main position clearly.';
    case 'DISCUSSION':
      return 'Join the discussion! Share your thoughts and respond to your opponent.';
    case 'REBUTTAL':
      return 'Present your rebuttal. Address your opponent\'s strongest arguments.';
    case 'CLOSING':
      return 'Give your closing statement. Summarize your key points and make your final argument.';
    default:
      return 'It\'s your turn to speak in the debate.';
  }
}

// Helper function for phase guidelines
function getPhaseGuidelines(phase: DebatePhase): string {
  switch (phase) {
    case 'OPENING':
      return 'State your position, provide key evidence, and outline your main arguments.';
    case 'DISCUSSION':
      return 'Build on points, ask clarifying questions, and engage respectfully with opposing views.';
    case 'REBUTTAL':
      return 'Focus on your opponent\'s arguments, provide counter-evidence, and strengthen your position.';
    case 'CLOSING':
      return 'Synthesize your arguments, address key counterpoints, and make a compelling conclusion.';
    default:
      return 'Speak clearly, be respectful, and support your points with evidence.';
  }
}

// Compound component for multiple notification types
export interface TurnNotificationManagerProps {
  notifications: Array<{
    id: string;
    type: TurnNotificationProps['notificationType'];
    speakerName: string;
    speakerPosition?: DebatePosition;
    timeRemaining?: number;
    isVisible: boolean;
  }>;
  currentPhase: DebatePhase;
  onDismiss: (id: string) => void;
  onAccept?: (id: string) => void;
  soundEnabled?: boolean;
  className?: string;
}

export function TurnNotificationManager({
  notifications,
  currentPhase,
  onDismiss,
  onAccept,
  soundEnabled = true,
  className
}: TurnNotificationManagerProps) {
  // Stack notifications with slight offset
  return (
    <div className={className}>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            zIndex: 50 - index,
            transform: `translateY(${index * 8}px)`,
          }}
        >
          <TurnNotification
            isVisible={notification.isVisible}
            notificationType={notification.type}
            currentPhase={currentPhase}
            speakerName={notification.speakerName}
            speakerPosition={notification.speakerPosition}
            timeRemaining={notification.timeRemaining}
            onDismiss={() => onDismiss(notification.id)}
            onAccept={onAccept ? () => onAccept(notification.id) : undefined}
            soundEnabled={soundEnabled}
            position="top"
          />
        </div>
      ))}
    </div>
  );
}

export default TurnNotification;
