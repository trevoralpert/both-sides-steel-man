'use client';

/**
 * Phase 6 Task 6.3.1: Phase Management Demo Component
 * 
 * Demonstrates all phase management components working together
 * Useful for testing, development, and showcasing functionality
 */

import React, { useState, useEffect } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase } from '@/types/debate';
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
  Eye,
  ArrowRight
} from 'lucide-react';

import { 
  PhaseTimer,
  PhaseIndicator, 
  PhaseStatus,
  PhaseTimeline,
  TransitionNotification,
  useTransitionNotifications
} from './index';

export interface PhaseManagementDemoProps {
  className?: string;
}

// Mock phase configuration matching backend
const MOCK_PHASE_CONFIG = {
  PREPARATION: { duration: 5 * 60 * 1000 }, // 5 minutes
  OPENING: { duration: 10 * 60 * 1000 },    // 10 minutes  
  DISCUSSION: { duration: 30 * 60 * 1000 },  // 30 minutes
  REBUTTAL: { duration: 15 * 60 * 1000 },    // 15 minutes
  CLOSING: { duration: 10 * 60 * 1000 },     // 10 minutes
  REFLECTION: { duration: 10 * 60 * 1000 },  // 10 minutes
  COMPLETED: { duration: 0 }
};

export function PhaseManagementDemo({ className }: PhaseManagementDemoProps) {
  // Demo state management
  const [currentPhase, setCurrentPhase] = useState<DebatePhase>('PREPARATION');
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(MOCK_PHASE_CONFIG.PREPARATION.duration);
  const [totalPhaseTime, setTotalPhaseTime] = useState(MOCK_PHASE_CONFIG.PREPARATION.duration);
  const [demoVariant, setDemoVariant] = useState<'timer' | 'indicator' | 'timeline' | 'notifications'>('timer');
  
  // Transition notifications
  const notifications = useTransitionNotifications();
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [currentTransition, setCurrentTransition] = useState<{ from: DebatePhase; to: DebatePhase } | null>(null);
  
  // Mock phase history for timeline demo
  const [phaseHistory, setPhaseHistory] = useState([
    {
      phase: 'PREPARATION' as DebatePhase,
      startedAt: new Date(Date.now() - 10 * 60 * 1000),
      endedAt: new Date(Date.now() - 5 * 60 * 1000),
      duration: 5 * 60 * 1000,
      completedSuccessfully: true
    }
  ]);
  
  // Timer effect
  useEffect(() => {
    if (!isTimerActive || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1000);
        
        // Auto-transition when time reaches 0
        if (newTime <= 0) {
          handlePhaseTransition();
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTimerActive, timeRemaining]);
  
  // Handle phase transitions
  const handlePhaseTransition = () => {
    const phases: DebatePhase[] = [
      'PREPARATION', 'OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING', 'REFLECTION', 'COMPLETED'
    ];
    
    const currentIndex = phases.indexOf(currentPhase);
    const nextPhase = currentIndex < phases.length - 1 ? phases[currentIndex + 1] : 'COMPLETED';
    
    // Add to history
    const now = new Date();
    setPhaseHistory(prev => [...prev, {
      phase: currentPhase,
      startedAt: new Date(now.getTime() - (totalPhaseTime - timeRemaining)),
      endedAt: now,
      duration: totalPhaseTime - timeRemaining,
      completedSuccessfully: true
    }]);
    
    // Set up transition notification
    setCurrentTransition({ from: currentPhase, to: nextPhase });
    setShowTransitionModal(true);
    
    // Transition to next phase
    setCurrentPhase(nextPhase);
    
    if (nextPhase !== 'COMPLETED') {
      const newDuration = MOCK_PHASE_CONFIG[nextPhase].duration;
      setTimeRemaining(newDuration);
      setTotalPhaseTime(newDuration);
    } else {
      setIsTimerActive(false);
      setTimeRemaining(0);
      setTotalPhaseTime(0);
    }
    
    // Add to notification system
    notifications.addTransition(currentPhase, nextPhase, 'timer');
  };
  
  // Control functions
  const handleStartPause = () => {
    setIsTimerActive(!isTimerActive);
  };
  
  const handleReset = () => {
    setIsTimerActive(false);
    const duration = MOCK_PHASE_CONFIG[currentPhase].duration;
    setTimeRemaining(duration);
    setTotalPhaseTime(duration);
  };
  
  const handlePhaseChange = (phase: DebatePhase) => {
    setCurrentPhase(phase);
    const duration = MOCK_PHASE_CONFIG[phase].duration;
    setTimeRemaining(duration);
    setTotalPhaseTime(duration);
    setIsTimerActive(false);
  };
  
  const handleManualTransition = (toPhase: DebatePhase) => {
    if (toPhase !== currentPhase) {
      setCurrentTransition({ from: currentPhase, to: toPhase });
      setShowTransitionModal(true);
      notifications.addTransition(currentPhase, toPhase, 'manual');
      handlePhaseChange(toPhase);
    }
  };
  
  return (
    <div className={cn("space-y-6 p-6 max-w-6xl mx-auto", className)}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Phase Management System Demo</h1>
        <p className="text-muted-foreground">
          Interactive demonstration of debate phase management components from Task 6.3.1
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
              Reset
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Quick Phase Selection */}
            <div className="flex flex-wrap gap-1">
              {(['PREPARATION', 'OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING', 'REFLECTION'] as DebatePhase[]).map((phase) => (
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
          </div>
          
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Current: {currentPhase}</Badge>
                <Badge variant={isTimerActive ? "default" : "secondary"}>
                  {isTimerActive ? 'Active' : 'Paused'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Time: {Math.floor(timeRemaining / 60000)}:{((timeRemaining % 60000) / 1000).toFixed(0).padStart(2, '0')} remaining
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTransitionModal(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Test Transition
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Component Demos */}
      <Tabs value={demoVariant} onValueChange={(v) => setDemoVariant(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timer">Phase Timer</TabsTrigger>
          <TabsTrigger value="indicator">Phase Indicator</TabsTrigger>
          <TabsTrigger value="timeline">Phase Timeline</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        {/* Phase Timer Demo */}
        <TabsContent value="timer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                PhaseTimer Component Variants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Default Timer */}
                <div className="space-y-3">
                  <h4 className="font-medium">Default Variant</h4>
                  <PhaseTimer
                    phase={currentPhase}
                    phaseStartTime={new Date(Date.now() - (totalPhaseTime - timeRemaining))}
                    phaseDurationMs={totalPhaseTime}
                    onPhaseComplete={() => handleManualTransition(currentPhase)}
                    isPaused={!isTimerActive}
                  />
                </div>
                
                {/* Compact Timer */}
                <div className="space-y-3">
                  <h4 className="font-medium">Compact Variant</h4>
                  <PhaseTimer
                    phase={currentPhase}
                    phaseStartTime={new Date(Date.now() - (totalPhaseTime - timeRemaining))}
                    phaseDurationMs={totalPhaseTime}
                    isPaused={!isTimerActive}
                  />
                </div>
              </div>
              
              {/* Minimal Timer */}
              <div className="space-y-3">
                <h4 className="font-medium">Minimal Variant</h4>
                <PhaseTimer
                  phase={currentPhase}
                  phaseStartTime={new Date(Date.now() - (totalPhaseTime - timeRemaining))}
                  phaseDurationMs={totalPhaseTime}
                  isPaused={!isTimerActive}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Phase Indicator Demo */}
        <TabsContent value="indicator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                PhaseIndicator Component Variants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Default Indicator */}
                <div className="space-y-3">
                  <h4 className="font-medium">Default Variant</h4>
                  <PhaseIndicator
                    currentPhase={currentPhase}
                    timeRemaining={timeRemaining}
                    totalPhaseTime={totalPhaseTime}
                    variant="default"
                    showProgress={true}
                    showTimeRemaining={true}
                  />
                </div>
                
                {/* Compact Indicator */}
                <div className="space-y-3">
                  <h4 className="font-medium">Compact Variant</h4>
                  <PhaseIndicator
                    currentPhase={currentPhase}
                    timeRemaining={timeRemaining}
                    totalPhaseTime={totalPhaseTime}
                    variant="compact"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Minimal Indicator */}
                <div className="space-y-3">
                  <h4 className="font-medium">Minimal Variant</h4>
                  <PhaseIndicator
                    currentPhase={currentPhase}
                    timeRemaining={timeRemaining}
                    variant="minimal"
                  />
                </div>
                
                {/* Badge Indicator */}
                <div className="space-y-3">
                  <h4 className="font-medium">Badge Variant</h4>
                  <PhaseIndicator
                    currentPhase={currentPhase}
                    variant="badge"
                  />
                </div>
              </div>
              
              {/* Phase Status */}
              <div className="space-y-3">
                <h4 className="font-medium">Phase Status with Upcoming</h4>
                <PhaseStatus
                  currentPhase={currentPhase}
                  timeRemaining={timeRemaining}
                  totalPhaseTime={totalPhaseTime}
                  showUpcoming={true}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Timeline Demo */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Full Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Default Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <PhaseTimeline
                  currentPhase={currentPhase}
                  timeRemaining={timeRemaining}
                  totalPhaseTime={totalPhaseTime}
                  phaseHistory={phaseHistory}
                  variant="default"
                  showTimestamps={true}
                  showDurations={true}
                  onPhaseClick={handlePhaseChange}
                />
              </CardContent>
            </Card>
            
            {/* Compact Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Compact Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <PhaseTimeline
                  currentPhase={currentPhase}
                  timeRemaining={timeRemaining}
                  phaseHistory={phaseHistory}
                  variant="compact"
                  isCollapsible={true}
                  onPhaseClick={handlePhaseChange}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Horizontal Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Horizontal Progress Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <PhaseTimeline
                currentPhase={currentPhase}
                timeRemaining={timeRemaining}
                variant="horizontal"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notifications Demo */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transition Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const phases: DebatePhase[] = ['OPENING', 'DISCUSSION', 'REBUTTAL'];
                    const randomPhase = phases[Math.floor(Math.random() * phases.length)];
                    setCurrentTransition({ from: currentPhase, to: randomPhase });
                    setShowTransitionModal(true);
                  }}
                >
                  Test Modal Notification
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    notifications.addTransition(currentPhase, 'DISCUSSION', 'manual');
                  }}
                >
                  Test Toast Notification
                </Button>
              </div>
              
              {/* Active Notifications */}
              <div className="space-y-2">
                <h4 className="font-medium">Active Notifications:</h4>
                {notifications.notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active notifications</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span>{notification.fromPhase}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{notification.toPhase}</span>
                          <Badge variant="outline" className="text-xs">
                            {notification.triggeredBy}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => notifications.removeTransition(notification.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Transition Modal */}
      {currentTransition && (
        <TransitionNotification
          fromPhase={currentTransition.from}
          toPhase={currentTransition.to}
          isVisible={showTransitionModal}
          onDismiss={() => {
            setShowTransitionModal(false);
            setCurrentTransition(null);
          }}
          onAcknowledge={() => {
            setShowTransitionModal(false);
            setCurrentTransition(null);
          }}
          variant="modal"
          showSoundToggle={true}
        />
      )}
    </div>
  );
}

export default PhaseManagementDemo;
