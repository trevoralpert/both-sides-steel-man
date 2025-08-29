'use client';

/**
 * Phase 6 Task 6.3.2: Turn Notifications Component
 * 
 * Visual and audio notifications for turn changes and warnings
 * Provides user feedback for turn-taking events
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ParticipantInfo, DebatePosition } from '@/types/debate';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mic,
  MicOff,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  X,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TurnNotification {
  id: string;
  type: 'turn_start' | 'turn_end' | 'turn_warning' | 'turn_timeout' | 'turn_skip';
  participant: ParticipantInfo;
  isForCurrentUser: boolean;
  message: string;
  timestamp: Date;
  autoHide?: number; // milliseconds
  priority: 'low' | 'medium' | 'high';
}

export interface TurnNotificationsProps {
  notifications: TurnNotification[];
  currentUserId: string;
  onDismiss: (id: string) => void;
  onAcknowledge: (id: string) => void;
  maxVisible?: number;
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
  enableSound?: boolean;
  className?: string;
}

interface NotificationConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  soundType?: 'info' | 'warning' | 'error';
}

const NOTIFICATION_CONFIGS: Record<TurnNotification['type'], NotificationConfig> = {
  turn_start: {
    icon: <Mic className="h-4 w-4" />,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    soundType: 'info'
  },
  turn_end: {
    icon: <MicOff className="h-4 w-4" />,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    soundType: 'info'
  },
  turn_warning: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    soundType: 'warning'
  },
  turn_timeout: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    soundType: 'error'
  },
  turn_skip: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    borderColor: 'border-gray-200 dark:border-gray-800',
    soundType: 'info'
  }
};

/**
 * Sound notification hook
 */
function useNotificationSound(enabled: boolean = true) {
  const playSound = React.useCallback((type: 'info' | 'warning' | 'error') => {
    if (!enabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = {
        info: 800,
        warning: 600,
        error: 400
      };
      
      const patterns = {
        info: [{ freq: frequencies.info, duration: 0.15 }],
        warning: [
          { freq: frequencies.warning, duration: 0.1 },
          { freq: frequencies.warning * 1.2, duration: 0.1 }
        ],
        error: [
          { freq: frequencies.error, duration: 0.1 },
          { freq: frequencies.error * 0.8, duration: 0.1 },
          { freq: frequencies.error, duration: 0.1 }
        ]
      };
      
      const pattern = patterns[type];
      let currentTime = audioContext.currentTime;
      
      pattern.forEach(({ freq, duration }, index) => {
        const osc = index === 0 ? oscillator : audioContext.createOscillator();
        const gain = index === 0 ? gainNode : audioContext.createGain();
        
        if (index > 0) {
          osc.connect(gain);
          gain.connect(audioContext.destination);
        }
        
        osc.frequency.value = freq;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0, currentTime);
        gain.gain.linearRampToValueAtTime(0.2, currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);
        
        osc.start(currentTime);
        osc.stop(currentTime + duration);
        
        currentTime += duration + 0.05; // Small gap between notes
      });
    } catch (error) {
      console.warn('Unable to play notification sound:', error);
    }
  }, [enabled]);
  
  return { playSound };
}

/**
 * Individual Turn Notification Component
 */
interface TurnNotificationItemProps {
  notification: TurnNotification;
  onDismiss: () => void;
  onAcknowledge: () => void;
  playSound: (type: 'info' | 'warning' | 'error') => void;
}

function TurnNotificationItem({ 
  notification, 
  onDismiss, 
  onAcknowledge,
  playSound
}: TurnNotificationItemProps) {
  const config = NOTIFICATION_CONFIGS[notification.type];
  const [isVisible, setIsVisible] = useState(true);
  
  // Auto-hide timer
  useEffect(() => {
    if (notification.autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation
      }, notification.autoHide);
      
      return () => clearTimeout(timer);
    }
  }, [notification.autoHide, onDismiss]);
  
  // Play sound when notification appears
  useEffect(() => {
    if (config.soundType) {
      playSound(config.soundType);
    }
  }, [config.soundType, playSound]);
  
  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };
  
  const handleAcknowledge = () => {
    onAcknowledge();
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.9 }}
          className="relative"
        >
          <Card className={cn(
            "shadow-lg border-l-4 min-w-80 max-w-md",
            config.bgColor,
            config.borderColor
          )}>
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    config.bgColor,
                    config.borderColor,
                    "border"
                  )}>
                    <div className={config.color}>
                      {config.icon}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn("font-medium", config.color)}>
                        {getNotificationTitle(notification.type, notification.isForCurrentUser)}
                      </h4>
                      {notification.priority === 'high' && (
                        <Badge variant="secondary" className="text-xs">
                          Important
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0 shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Participant Info */}
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  {notification.participant.avatar ? (
                    <img 
                      src={notification.participant.avatar} 
                      alt={notification.participant.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                
                <span className="text-sm font-medium">
                  {notification.participant.name}
                </span>
                
                <Badge 
                  variant={notification.participant.position === 'PRO' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {notification.participant.position}
                </Badge>
                
                {notification.isForCurrentUser && (
                  <Badge variant="outline" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                {notification.isForCurrentUser && (
                  <Button 
                    size="sm" 
                    onClick={handleAcknowledge}
                    className="flex-1"
                  >
                    Got it
                  </Button>
                )}
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleDismiss}
                  className={cn(
                    notification.isForCurrentUser ? "" : "flex-1"
                  )}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Get notification title based on type and user
 */
function getNotificationTitle(type: TurnNotification['type'], isForCurrentUser: boolean): string {
  const titles = {
    turn_start: isForCurrentUser ? "Your Turn" : "Turn Started",
    turn_end: isForCurrentUser ? "Turn Ended" : "Turn Completed", 
    turn_warning: isForCurrentUser ? "Time Warning" : "Speaker Time Warning",
    turn_timeout: isForCurrentUser ? "Time Up" : "Turn Timeout",
    turn_skip: "Turn Skipped"
  };
  
  return titles[type];
}

/**
 * Main Turn Notifications Component
 */
export function TurnNotifications({
  notifications,
  currentUserId,
  onDismiss,
  onAcknowledge,
  maxVisible = 3,
  position = 'top-right',
  enableSound = true,
  className
}: TurnNotificationsProps) {
  const { playSound } = useNotificationSound(enableSound);
  
  // Sort notifications by priority and timestamp
  const sortedNotifications = [...notifications]
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.timestamp.getTime() - a.timestamp.getTime();
    })
    .slice(0, maxVisible);
  
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };
  
  if (sortedNotifications.length === 0) {
    return null;
  }
  
  return (
    <div className={cn(
      "fixed z-50 flex flex-col gap-3",
      positionClasses[position],
      className
    )}>
      <AnimatePresence mode="popLayout">
        {sortedNotifications.map((notification) => (
          <TurnNotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={() => onDismiss(notification.id)}
            onAcknowledge={() => onAcknowledge(notification.id)}
            playSound={playSound}
          />
        ))}
      </AnimatePresence>
      
      {/* Overflow indicator */}
      {notifications.length > maxVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Badge variant="secondary" className="text-xs">
            +{notifications.length - maxVisible} more
          </Badge>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Turn Notifications Manager Hook
 */
export function useTurnNotifications() {
  const [notifications, setNotifications] = useState<TurnNotification[]>([]);
  
  const addNotification = React.useCallback((
    type: TurnNotification['type'],
    participant: ParticipantInfo,
    currentUserId: string,
    message?: string,
    options?: {
      priority?: TurnNotification['priority'];
      autoHide?: number;
    }
  ) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    
    const notification: TurnNotification = {
      id,
      type,
      participant,
      isForCurrentUser: participant.id === currentUserId,
      message: message || getDefaultMessage(type, participant.id === currentUserId),
      timestamp: new Date(),
      priority: options?.priority || 'medium',
      autoHide: options?.autoHide
    };
    
    setNotifications(prev => [notification, ...prev]);
    return id;
  }, []);
  
  const dismissNotification = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  const acknowledgeNotification = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  const clearAll = React.useCallback(() => {
    setNotifications([]);
  }, []);
  
  return {
    notifications,
    addNotification,
    dismissNotification,
    acknowledgeNotification,
    clearAll
  };
}

/**
 * Get default message for notification type
 */
function getDefaultMessage(type: TurnNotification['type'], isForCurrentUser: boolean): string {
  const messages = {
    turn_start: isForCurrentUser 
      ? "It's now your turn to speak in the debate."
      : "is now speaking in the debate.",
    turn_end: isForCurrentUser
      ? "Your speaking turn has ended."
      : "has finished their turn.",
    turn_warning: isForCurrentUser
      ? "Your speaking time is running low. Consider wrapping up."
      : "'s speaking time is running low.",
    turn_timeout: isForCurrentUser
      ? "Your speaking time has expired."
      : "'s speaking time has expired.",
    turn_skip: "Turn has been skipped."
  };
  
  return messages[type];
}

export default TurnNotifications;
