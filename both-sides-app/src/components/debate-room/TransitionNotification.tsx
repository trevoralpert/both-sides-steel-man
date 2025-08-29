'use client';

/**
 * Phase 6 Task 6.3.1: Phase Transition Notification Component
 * 
 * Animated notifications for debate phase changes and transitions
 * Provides visual and audio feedback for phase transitions
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { DebatePhase } from '@/types/debate';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X,
  ArrowRight,
  Clock,
  Play,
  Timer,
  CheckCircle2,
  BookOpen,
  AlertTriangle,
  Bell,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TransitionNotificationProps {
  fromPhase: DebatePhase;
  toPhase: DebatePhase;
  isVisible: boolean;
  onDismiss: () => void;
  onAcknowledge?: () => void;
  autoHideDelay?: number; // milliseconds
  showSoundToggle?: boolean;
  variant?: 'default' | 'compact' | 'toast' | 'modal';
  className?: string;
}

export interface PhaseTransitionEvent {
  id: string;
  fromPhase: DebatePhase;
  toPhase: DebatePhase;
  timestamp: Date;
  triggeredBy: 'timer' | 'manual' | 'completion';
  userId?: string;
  acknowledged?: boolean;
}

interface PhaseDisplayConfig {
  phase: DebatePhase;
  displayName: string;
  shortName: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

const PHASE_CONFIGS: Record<DebatePhase, PhaseDisplayConfig> = {
  PREPARATION: {
    phase: 'PREPARATION',
    displayName: 'Preparation Phase',
    shortName: 'Preparation',
    color: 'text-blue-600',
    icon: <BookOpen className="h-5 w-5" />,
    description: 'Review topic and prepare arguments'
  },
  OPENING: {
    phase: 'OPENING',
    displayName: 'Opening Statements',
    shortName: 'Opening',
    color: 'text-green-600',
    icon: <Play className="h-5 w-5" />,
    description: 'Present your initial position'
  },
  DISCUSSION: {
    phase: 'DISCUSSION',
    displayName: 'Discussion Phase',
    shortName: 'Discussion',
    color: 'text-yellow-600',
    icon: <Timer className="h-5 w-5" />,
    description: 'Exchange ideas and arguments'
  },
  REBUTTAL: {
    phase: 'REBUTTAL',
    displayName: 'Rebuttal Phase',
    shortName: 'Rebuttal',
    color: 'text-orange-600',
    icon: <ArrowRight className="h-5 w-5" />,
    description: 'Respond to opposing arguments'
  },
  CLOSING: {
    phase: 'CLOSING',
    displayName: 'Closing Statements',
    shortName: 'Closing',
    color: 'text-red-600',
    icon: <CheckCircle2 className="h-5 w-5" />,
    description: 'Summarize your position'
  },
  REFLECTION: {
    phase: 'REFLECTION',
    displayName: 'Reflection Phase',
    shortName: 'Reflection',
    color: 'text-purple-600',
    icon: <CheckCircle2 className="h-5 w-5" />,
    description: 'Reflect on the debate'
  },
  COMPLETED: {
    phase: 'COMPLETED',
    displayName: 'Debate Completed',
    shortName: 'Complete',
    color: 'text-gray-600',
    icon: <CheckCircle2 className="h-5 w-5" />,
    description: 'Debate has ended'
  }
};

/**
 * Get transition message based on phases
 */
function getTransitionMessage(fromPhase: DebatePhase, toPhase: DebatePhase): string {
  if (fromPhase === 'PREPARATION' && toPhase === 'OPENING') {
    return 'Time to begin! Present your opening statements.';
  }
  if (fromPhase === 'OPENING' && toPhase === 'DISCUSSION') {
    return 'Opening statements complete. Begin the discussion phase.';
  }
  if (fromPhase === 'DISCUSSION' && toPhase === 'REBUTTAL') {
    return 'Discussion phase over. Time for rebuttals.';
  }
  if (fromPhase === 'REBUTTAL' && toPhase === 'CLOSING') {
    return 'Rebuttal phase complete. Prepare your closing statements.';
  }
  if (fromPhase === 'CLOSING' && toPhase === 'REFLECTION') {
    return 'Debate finished! Time to reflect on your performance.';
  }
  if (toPhase === 'COMPLETED') {
    return 'Congratulations! The debate has concluded.';
  }
  
  return `Moving from ${PHASE_CONFIGS[fromPhase].shortName} to ${PHASE_CONFIGS[toPhase].shortName}`;
}

/**
 * Get transition importance level
 */
function getTransitionImportance(fromPhase: DebatePhase, toPhase: DebatePhase): 'low' | 'medium' | 'high' {
  if (toPhase === 'COMPLETED') return 'high';
  if (fromPhase === 'PREPARATION' && toPhase === 'OPENING') return 'high';
  if (fromPhase === 'CLOSING' && toPhase === 'REFLECTION') return 'high';
  return 'medium';
}

/**
 * Sound notification hook
 */
function useTransitionSound(enabled: boolean = true) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  
  const playTransitionSound = React.useCallback(() => {
    if (!isEnabled) return;
    
    // Create a simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Unable to play transition sound:', error);
    }
  }, [isEnabled]);
  
  return { isEnabled, setIsEnabled, playTransitionSound };
}

/**
 * Toast variant notification
 */
function ToastTransitionNotification({
  fromPhase,
  toPhase,
  onDismiss,
  onAcknowledge,
  className
}: Omit<TransitionNotificationProps, 'isVisible' | 'variant'>) {
  const fromConfig = PHASE_CONFIGS[fromPhase];
  const toConfig = PHASE_CONFIGS[toPhase];
  const message = getTransitionMessage(fromPhase, toPhase);
  
  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className={cn(
        "fixed top-4 right-4 z-50 w-96",
        className
      )}
    >
      <Card className="p-4 shadow-lg border-l-4 border-l-primary">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Phase Transition</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("flex items-center gap-1", fromConfig.color)}>
            {fromConfig.icon}
            <span className="text-sm">{fromConfig.shortName}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={cn("flex items-center gap-1", toConfig.color)}>
            {toConfig.icon}
            <span className="text-sm font-medium">{toConfig.shortName}</span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">{message}</p>
        
        {onAcknowledge && (
          <div className="flex justify-end">
            <Button size="sm" onClick={onAcknowledge}>
              Got it
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

/**
 * Modal variant notification
 */
function ModalTransitionNotification({
  fromPhase,
  toPhase,
  onDismiss,
  onAcknowledge,
  showSoundToggle = false,
  className
}: Omit<TransitionNotificationProps, 'isVisible' | 'variant'>) {
  const fromConfig = PHASE_CONFIGS[fromPhase];
  const toConfig = PHASE_CONFIGS[toPhase];
  const message = getTransitionMessage(fromPhase, toPhase);
  const importance = getTransitionImportance(fromPhase, toPhase);
  const sound = useTransitionSound();
  
  React.useEffect(() => {
    sound.playTransitionSound();
  }, [sound]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onDismiss()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={cn("w-full max-w-md mx-4", className)}
      >
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-full",
                importance === 'high' ? 'bg-primary/10' : 'bg-muted'
              )}>
                <Bell className={cn(
                  "h-5 w-5",
                  importance === 'high' ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <h3 className="font-semibold">Phase Transition</h3>
                <p className="text-xs text-muted-foreground">Debate progress update</p>
              </div>
            </div>
            
            {showSoundToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sound.setIsEnabled(!sound.isEnabled)}
                className="h-8 w-8 p-0"
              >
                {sound.isEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          
          {/* Phase transition visualization */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <div className={cn(
                "p-3 rounded-full mb-2 mx-auto w-fit",
                "bg-muted border-2 border-muted"
              )}>
                <div className={fromConfig.color}>
                  {fromConfig.icon}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {fromConfig.shortName}
              </Badge>
            </div>
            
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ArrowRight className="h-6 w-6 text-primary" />
            </motion.div>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className={cn(
                "p-3 rounded-full mb-2 mx-auto w-fit",
                "bg-primary/10 border-2 border-primary/20"
              )}>
                <div className={toConfig.color}>
                  {toConfig.icon}
                </div>
              </div>
              <Badge className="text-xs">
                {toConfig.shortName}
              </Badge>
            </motion.div>
          </div>
          
          {/* Message */}
          <div className="text-center mb-6">
            <h4 className="font-medium mb-2">{toConfig.displayName}</h4>
            <p className="text-sm text-muted-foreground mb-2">
              {message}
            </p>
            <p className="text-xs text-muted-foreground">
              {toConfig.description}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onDismiss}>
              Dismiss
            </Button>
            {onAcknowledge && (
              <Button onClick={onAcknowledge}>
                Continue
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

/**
 * Main Transition Notification Component
 */
export function TransitionNotification({
  fromPhase,
  toPhase,
  isVisible,
  onDismiss,
  onAcknowledge,
  autoHideDelay = 5000,
  showSoundToggle = false,
  variant = 'default',
  className
}: TransitionNotificationProps) {
  const fromConfig = PHASE_CONFIGS[fromPhase];
  const toConfig = PHASE_CONFIGS[toPhase];
  const message = getTransitionMessage(fromPhase, toPhase);
  const importance = getTransitionImportance(fromPhase, toPhase);
  
  // Auto-hide timer
  useEffect(() => {
    if (!isVisible || !autoHideDelay || variant === 'modal') return;
    
    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideDelay);
    
    return () => clearTimeout(timer);
  }, [isVisible, autoHideDelay, onDismiss, variant]);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {variant === 'toast' && (
            <ToastTransitionNotification
              fromPhase={fromPhase}
              toPhase={toPhase}
              onDismiss={onDismiss}
              onAcknowledge={onAcknowledge}
              className={className}
            />
          )}
          
          {variant === 'modal' && (
            <ModalTransitionNotification
              fromPhase={fromPhase}
              toPhase={toPhase}
              onDismiss={onDismiss}
              onAcknowledge={onAcknowledge}
              showSoundToggle={showSoundToggle}
              className={className}
            />
          )}
          
          {(variant === 'default' || variant === 'compact') && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={cn(
                "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
                variant === 'compact' ? 'w-80' : 'w-96',
                className
              )}
            >
              <Card className={cn(
                "p-4 shadow-lg",
                importance === 'high' ? 'border-primary' : ''
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1 rounded-full",
                      importance === 'high' ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      {importance === 'high' ? (
                        <AlertTriangle className="h-4 w-4 text-primary" />
                      ) : (
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-medium text-sm">Phase Change</span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismiss}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                {variant === 'default' && (
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="text-center">
                      <div className={cn("mb-1", fromConfig.color)}>
                        {fromConfig.icon}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {fromConfig.shortName}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-center">
                      <div className={cn("mb-1", toConfig.color)}>
                        {toConfig.icon}
                      </div>
                      <span className="text-xs font-medium">
                        {toConfig.shortName}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="text-center">
                  {variant === 'compact' ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{message}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {fromConfig.shortName}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          {toConfig.shortName}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-medium mb-1">{toConfig.displayName}</h4>
                      <p className="text-sm text-muted-foreground">{message}</p>
                    </>
                  )}
                </div>
                
                {onAcknowledge && variant === 'default' && (
                  <div className="flex justify-end mt-3 pt-3 border-t">
                    <Button size="sm" onClick={onAcknowledge}>
                      Continue
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Transition Notification Manager Hook
 */
export function useTransitionNotifications() {
  const [notifications, setNotifications] = useState<PhaseTransitionEvent[]>([]);
  
  const addTransition = React.useCallback((
    fromPhase: DebatePhase,
    toPhase: DebatePhase,
    triggeredBy: 'timer' | 'manual' | 'completion' = 'timer',
    userId?: string
  ) => {
    const transition: PhaseTransitionEvent = {
      id: `transition-${Date.now()}`,
      fromPhase,
      toPhase,
      timestamp: new Date(),
      triggeredBy,
      userId,
      acknowledged: false
    };
    
    setNotifications(prev => [...prev, transition]);
    return transition.id;
  }, []);
  
  const acknowledgeTransition = React.useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(t => t.id === id ? { ...t, acknowledged: true } : t)
    );
  }, []);
  
  const removeTransition = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const clearAll = React.useCallback(() => {
    setNotifications([]);
  }, []);
  
  return {
    notifications,
    addTransition,
    acknowledgeTransition,
    removeTransition,
    clearAll
  };
}

export default TransitionNotification;
