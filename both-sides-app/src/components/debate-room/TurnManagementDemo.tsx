'use client';

/**
 * Phase 6 Task 6.3.2: Turn Management Demo Component
 * 
 * Interactive demonstration of all turn management components
 * Useful for testing, development, and showcasing functionality
 */

import React, { useState, useEffect } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase, ParticipantInfo } from '@/types/debate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play,
  Pause,
  RotateCcw,
  Settings,
  Users,
  Timer,
  Bell,
  Shuffle
} from 'lucide-react';

import { 
  TurnManager,
  TurnTimer,
  TurnNotifications,
  useTurnNotifications
} from './index';

export interface TurnManagementDemoProps {
  className?: string;
}

// Mock participants for demo
const MOCK_PARTICIPANTS: ParticipantInfo[] = [
  {
    id: 'user1',
    name: 'Alice Johnson',
    avatar: '',
    position: 'PRO',
    isOnline: true,
    isTyping: false
  },
  {
    id: 'user2', 
    name: 'Bob Martinez',
    avatar: '',
    position: 'CON',
    isOnline: true,
    isTyping: false
  }
];

// Phase configurations for demo
const PHASE_CONFIGS = {
  OPENING: { maxTurnTime: 300, description: 'Opening Statements' },
  DISCUSSION: { maxTurnTime: 180, description: 'Free Discussion' },
  REBUTTAL: { maxTurnTime: 240, description: 'Structured Rebuttals' },
  CLOSING: { maxTurnTime: 300, description: 'Closing Statements' }
};

export function TurnManagementDemo({ className }: TurnManagementDemoProps) {
  // Demo state
  const [currentPhase, setCurrentPhase] = useState<DebatePhase>('OPENING');
  const [currentTurn, setCurrentTurn] = useState(MOCK_PARTICIPANTS[0].id);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState(300); // 5 minutes
  const [demoVariant, setDemoVariant] = useState<'manager' | 'timer' | 'notifications'>('manager');
  
  // Turn notifications
  const notifications = useTurnNotifications();
  
  const currentParticipant = MOCK_PARTICIPANTS.find(p => p.id === currentTurn);
  const phaseConfig = PHASE_CONFIGS[currentPhase as keyof typeof PHASE_CONFIGS];
  const maxTurnTime = phaseConfig?.maxTurnTime || 300;
  
  // Timer effect
  useEffect(() => {
    if (!isTimerActive || turnTimeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTurnTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1);
        
        // Trigger warnings
        if (newTime === 30) {
          if (currentParticipant) {
            notifications.addNotification(
              'turn_warning',
              currentParticipant,
              'user1', // Mock current user
              '30 seconds remaining in your turn',
              { priority: 'medium', autoHide: 5000 }
            );
          }
        }
        
        if (newTime === 10) {
          if (currentParticipant) {
            notifications.addNotification(
              'turn_warning',
              currentParticipant,
              'user1',
              '10 seconds remaining!',
              { priority: 'high' }
            );
          }
        }
        
        // Auto switch turns when time is up
        if (newTime <= 0) {
          handleTurnComplete();
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTimerActive, turnTimeRemaining, currentParticipant, notifications]);
  
  // Control functions
  const handleStartPause = () => {
    setIsTimerActive(!isTimerActive);
  };
  
  const handleReset = () => {
    setIsTimerActive(false);
    setTurnTimeRemaining(maxTurnTime);
  };
  
  const handleTurnComplete = () => {
    const currentIndex = MOCK_PARTICIPANTS.findIndex(p => p.id === currentTurn);
    const nextParticipant = MOCK_PARTICIPANTS[(currentIndex + 1) % MOCK_PARTICIPANTS.length];
    
    // Add completion notification for current participant
    if (currentParticipant) {
      notifications.addNotification(
        'turn_end',
        currentParticipant,
        'user1',
        `${currentParticipant.name} has completed their turn`,
        { priority: 'low', autoHide: 3000 }
      );
    }
    
    // Switch turns
    setCurrentTurn(nextParticipant.id);
    setTurnTimeRemaining(maxTurnTime);
    
    // Add start notification for next participant
    notifications.addNotification(
      'turn_start',
      nextParticipant,
      'user1',
      `${nextParticipant.name} is now speaking`,
      { priority: 'medium', autoHide: 4000 }
    );
  };
  
  const handleTurnSkip = () => {
    if (currentParticipant) {
      notifications.addNotification(
        'turn_skip',
        currentParticipant,
        'user1',
        `${currentParticipant.name}'s turn was skipped`,
        { priority: 'medium', autoHide: 3000 }
      );
    }
    handleTurnComplete();
  };
  
  const handlePhaseChange = (phase: DebatePhase) => {
    setCurrentPhase(phase);
    const config = PHASE_CONFIGS[phase as keyof typeof PHASE_CONFIGS];
    if (config) {
      setTurnTimeRemaining(config.maxTurnTime);
      setIsTimerActive(false);
    }
  };
  
  const handleRandomTurn = () => {
    const otherParticipants = MOCK_PARTICIPANTS.filter(p => p.id !== currentTurn);
    const randomParticipant = otherParticipants[Math.floor(Math.random() * otherParticipants.length)];
    
    if (currentParticipant) {
      notifications.addNotification(
        'turn_end',
        currentParticipant,
        'user1',
        undefined,
        { priority: 'low', autoHide: 2000 }
      );
    }
    
    setCurrentTurn(randomParticipant.id);
    setTurnTimeRemaining(maxTurnTime);
    
    notifications.addNotification(
      'turn_start',
      randomParticipant,
      'user1',
      undefined,
      { priority: 'medium', autoHide: 3000 }
    );
  };
  
  const handleTestNotification = () => {
    const types = ['turn_warning', 'turn_timeout'] as const;
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    if (currentParticipant) {
      notifications.addNotification(
        randomType,
        currentParticipant,
        'user1',
        `Test ${randomType} notification`,
        { priority: 'high' }
      );
    }
  };
  
  return (
    <div className={cn("space-y-6 p-6 max-w-6xl mx-auto", className)}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Turn Management System Demo</h1>
        <p className="text-muted-foreground">
          Interactive demonstration of turn-taking and speaking order components from Task 6.3.2
        </p>
      </div>
      
      {/* Demo Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Demo Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isTimerActive ? "default" : "outline"}
              size="sm"
              onClick={handleStartPause}
              className="gap-2"
            >
              {isTimerActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isTimerActive ? 'Pause' : 'Start'} Timer
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Timer
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleTurnComplete}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Complete Turn
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomTurn}
              className="gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Random Turn
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Test Alert
            </Button>
          </div>
          
          {/* Phase Selection */}
          <div className="flex flex-wrap gap-1">
            <span className="text-sm text-muted-foreground mr-2">Phase:</span>
            {(['OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING'] as const).map((phase) => (
              <Button
                key={phase}
                variant={phase === currentPhase ? "default" : "outline"}
                size="sm"
                onClick={() => handlePhaseChange(phase)}
                className="text-xs"
              >
                {phase}
              </Button>
            ))}
          </div>
          
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Current: {currentParticipant?.name} ({currentParticipant?.position})
                </Badge>
                <Badge variant={isTimerActive ? "default" : "secondary"}>
                  {isTimerActive ? 'Speaking' : 'Paused'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Time: {Math.floor(turnTimeRemaining / 60)}:{(turnTimeRemaining % 60).toString().padStart(2, '0')} remaining
              </p>
            </div>
            
            <div className="text-right text-sm text-muted-foreground">
              <div>Phase: {currentPhase}</div>
              <div>Max: {Math.floor(maxTurnTime / 60)} minutes</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Component Demos */}
      <Tabs value={demoVariant} onValueChange={(v) => setDemoVariant(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manager">Turn Manager</TabsTrigger>
          <TabsTrigger value="timer">Turn Timer</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        {/* Turn Manager Demo */}
        <TabsContent value="manager" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                TurnManager Component
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TurnManager
                currentPhase={currentPhase}
                participants={MOCK_PARTICIPANTS}
                currentUserId="current-user"
                onTurnComplete={handleTurnComplete}
                onTurnSkip={handleTurnSkip}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Turn Timer Demo */}
        <TabsContent value="timer" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Default Timer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Default Timer</CardTitle>
              </CardHeader>
              <CardContent>
                <TurnTimer
                  turnStartTime={new Date(Date.now() - (maxTurnTime - turnTimeRemaining) * 1000)}
                  turnDurationSeconds={maxTurnTime}
                  currentPhase={currentPhase}
                  isActive={isTimerActive}
                  onTurnComplete={() => console.log('Time up!')}
                  onWarning={(time) => console.log(`Warning: ${time}s remaining`)}
                  variant="default"
                  showControls={true}
                  soundEnabled={true}
                />
              </CardContent>
            </Card>
            
            {/* Compact Timer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compact Timer</CardTitle>
              </CardHeader>
              <CardContent>
                <TurnTimer
                  turnStartTime={new Date(Date.now() - (maxTurnTime - turnTimeRemaining) * 1000)}
                  turnDurationSeconds={maxTurnTime}
                  currentPhase={currentPhase}
                  isActive={isTimerActive}
                  variant="compact"
                  soundEnabled={false}
                />
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Minimal Timer</h4>
                  <TurnTimer
                    turnStartTime={new Date(Date.now() - (maxTurnTime - turnTimeRemaining) * 1000)}
                    turnDurationSeconds={maxTurnTime}
                    currentPhase={currentPhase}
                    isActive={isTimerActive}
                    variant="minimal"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Notifications Demo */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Turn Notifications System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    if (currentParticipant) {
                      notifications.addNotification(
                        'turn_start',
                        currentParticipant,
                        'user1',
                        'Your turn has started! You can now speak.',
                        { priority: 'medium' }
                      );
                    }
                  }}
                >
                  Turn Start
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentParticipant) {
                      notifications.addNotification(
                        'turn_warning',
                        currentParticipant,
                        'user1',
                        'Time is running low! Please wrap up soon.',
                        { priority: 'high' }
                      );
                    }
                  }}
                >
                  Time Warning
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentParticipant) {
                      notifications.addNotification(
                        'turn_timeout',
                        currentParticipant,
                        'user1',
                        'Your speaking time has expired.',
                        { priority: 'high' }
                      );
                    }
                  }}
                >
                  Time Timeout
                </Button>
                
                <Button
                  variant="outline"
                  onClick={notifications.clearAll}
                >
                  Clear All
                </Button>
              </div>
              
              {/* Active Notifications */}
              <div className="space-y-2">
                <h4 className="font-medium">Active Notifications ({notifications.notifications.length}):</h4>
                {notifications.notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active notifications</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.notifications.slice(0, 3).map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm"
                      >
                        <div>
                          <span className="font-medium">{notification.type}</span>
                          <span className="text-muted-foreground ml-2">
                            {notification.participant.name}
                          </span>
                        </div>
                        <Badge variant={notification.priority === 'high' ? 'destructive' : 'secondary'}>
                          {notification.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Notification Container */}
      <TurnNotifications
        notifications={notifications.notifications}
        currentUserId="user1"
        onDismiss={notifications.dismissNotification}
        onAcknowledge={notifications.acknowledgeNotification}
        maxVisible={3}
        position="top-right"
        enableSound={true}
      />
    </div>
  );
}

export default TurnManagementDemo;
