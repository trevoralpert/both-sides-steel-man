'use client';

/**
 * Debug page for testing Task 6.3.1 Phase Timer & Status Display
 */

import React, { useState } from 'react';
import { DebatePhase } from '@/types/debate';
import { PhaseTimer } from '@/components/debate-room/PhaseTimer';
import { PhaseProgress } from '@/components/debate-room/PhaseProgress';
import { PhaseTransition, PhaseChangeNotification } from '@/components/debate-room/PhaseTransition';
import { PhaseIndicator } from '@/components/debate-room/PhaseIndicator';
import { usePhaseManagement } from '@/lib/hooks/usePhaseManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  Play, 
  Pause, 
  Square, 
  FastForward, 
  Timer, 
  CheckCircle2,
  Settings,
  RefreshCw,
  Bell,
  TrendingUp,
  Clock
} from 'lucide-react';

const phases: DebatePhase[] = [
  'PREPARATION',
  'OPENING',
  'DISCUSSION',
  'REBUTTAL',
  'CLOSING',
  'REFLECTION'
];

// Mock scenarios for testing
const testScenarios = [
  {
    name: 'Full Debate - Beginning',
    phase: 'PREPARATION' as DebatePhase,
    startOffset: -60000, // 1 minute ago
    completed: [],
    description: 'Starting a full debate from preparation'
  },
  {
    name: 'Main Discussion - Mid Progress',
    phase: 'DISCUSSION' as DebatePhase,
    startOffset: -480000, // 8 minutes ago (out of 15)
    completed: ['PREPARATION', 'OPENING'] as DebatePhase[],
    description: 'In the middle of main discussion phase'
  },
  {
    name: 'Rebuttal - Time Warning',
    phase: 'REBUTTAL' as DebatePhase,
    startOffset: -240000, // 4 minutes ago (out of 5)
    completed: ['PREPARATION', 'OPENING', 'DISCUSSION'] as DebatePhase[],
    description: 'Rebuttal phase with time warning'
  },
  {
    name: 'Closing - Nearly Complete',
    phase: 'CLOSING' as DebatePhase,
    startOffset: -160000, // 2m40s ago (out of 3)
    completed: ['PREPARATION', 'OPENING', 'DISCUSSION', 'REBUTTAL'] as DebatePhase[],
    description: 'Closing phase nearly complete'
  },
  {
    name: 'Overtime Scenario',
    phase: 'OPENING' as DebatePhase,
    startOffset: -240000, // 4 minutes ago (should be 3)
    completed: ['PREPARATION'] as DebatePhase[],
    description: 'Opening phase running overtime'
  }
];

export default function PhaseTimerDemoPage() {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [isTeacherMode, setIsTeacherMode] = useState(true);
  const [showTransition, setShowTransition] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [transitionFrom, setTransitionFrom] = useState<DebatePhase>('OPENING');
  const [transitionTo, setTransitionTo] = useState<DebatePhase>('DISCUSSION');
  const [manualPhase, setManualPhase] = useState<DebatePhase>('DISCUSSION');
  const [manualStartTime, setManualStartTime] = useState(new Date(Date.now() - 300000)); // 5 min ago
  const [manualCompleted, setManualCompleted] = useState<DebatePhase[]>(['PREPARATION', 'OPENING']);

  // Phase management integration
  const phaseManagement = usePhaseManagement({
    conversationId: 'phase-timer-demo',
    userId: 'demo-user',
    isTeacher: isTeacherMode,
    enabled: true
  });

  const currentScenario = testScenarios[selectedScenario];

  // Calculate demo phase start time
  const getDemoPhaseStartTime = () => {
    return new Date(Date.now() + currentScenario.startOffset);
  };

  // Get phase duration in milliseconds
  const getPhaseDurationMs = (phase: DebatePhase) => {
    const durations = {
      PREPARATION: 10 * 60 * 1000,
      OPENING: 3 * 60 * 1000,
      DISCUSSION: 15 * 60 * 1000,
      REBUTTAL: 5 * 60 * 1000,
      CLOSING: 3 * 60 * 1000,
      REFLECTION: 5 * 60 * 1000
    };
    return durations[phase];
  };

  const handlePhaseComplete = (completedPhase: DebatePhase) => {
    console.log(`Phase completed: ${completedPhase}`);
    
    // Trigger transition to next phase
    const nextPhaseIndex = phases.indexOf(completedPhase) + 1;
    if (nextPhaseIndex < phases.length) {
      setTransitionFrom(completedPhase);
      setTransitionTo(phases[nextPhaseIndex]);
      setShowTransition(true);
    }
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    setShowNotification(true);
    
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const triggerTestTransition = () => {
    setTransitionFrom('DISCUSSION');
    setTransitionTo('REBUTTAL');
    setShowTransition(true);
  };

  const triggerTestNotification = () => {
    setShowNotification(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div>
            <h1 className="text-xl font-semibold">Task 6.3.1: Phase Timer Demo</h1>
            <p className="text-sm text-muted-foreground">
              Testing phase timer, progress tracking, and transition animations
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="outline">Phase 6.3.1</Badge>
            {phaseManagement.hasPhaseData && (
              <Badge className="bg-green-100 text-green-800">
                <Timer className="h-3 w-3 mr-1" />
                Live Phase Data
              </Badge>
            )}
            <Button
              variant={isTeacherMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsTeacherMode(!isTeacherMode)}
            >
              {isTeacherMode ? 'Teacher Mode' : 'Student Mode'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Controls */}
            <ResizablePanel defaultSize={30} className="p-4">
              <div className="h-full flex flex-col space-y-4">
                {/* Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Demo Controls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Scenario Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Test Scenario:</label>
                        <Select 
                          value={selectedScenario.toString()} 
                          onValueChange={(v) => setSelectedScenario(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {testScenarios.map((scenario, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                {scenario.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {currentScenario.description}
                        </p>
                      </div>

                      {/* Manual Phase Control */}
                      <div className="space-y-2 pt-4 border-t">
                        <label className="text-sm font-medium">Manual Phase:</label>
                        <Select value={manualPhase} onValueChange={(v) => setManualPhase(v as DebatePhase)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {phases.map(phase => (
                              <SelectItem key={phase} value={phase}>
                                {phase}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Test Actions */}
                      <div className="space-y-2 pt-4 border-t">
                        <label className="text-sm font-medium">Test Actions:</label>
                        <div className="grid grid-cols-1 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={triggerTestTransition}
                            className="justify-start"
                          >
                            <FastForward className="h-3 w-3 mr-2" />
                            Test Transition
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={triggerTestNotification}
                            className="justify-start"
                          >
                            <Bell className="h-3 w-3 mr-2" />
                            Test Notification
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => phaseManagement.refreshPhaseState()}
                            className="justify-start"
                          >
                            <RefreshCw className="h-3 w-3 mr-2" />
                            Refresh Data
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Phase Management Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Backend Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <Badge variant={phaseManagement.hasPhaseData ? 'default' : 'outline'}>
                          {phaseManagement.isLoading ? 'Loading...' :
                           phaseManagement.hasPhaseData ? 'Connected' : 'No Data'}
                        </Badge>
                      </div>
                      
                      {phaseManagement.lastSync && (
                        <div className="flex items-center justify-between">
                          <span>Last Sync:</span>
                          <span className="text-muted-foreground">
                            {phaseManagement.lastSync.toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      
                      {phaseManagement.error && (
                        <div className="text-red-600 text-xs p-2 bg-red-50 rounded">
                          {phaseManagement.error}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Scenario Info */}
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle className="text-sm">Current Scenario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Phase:</strong> {currentScenario.phase}</div>
                      <div><strong>Started:</strong> {getDemoPhaseStartTime().toLocaleTimeString()}</div>
                      <div><strong>Duration:</strong> {Math.round(getPhaseDurationMs(currentScenario.phase) / 60000)}m</div>
                      <div><strong>Completed:</strong> {currentScenario.completed.join(', ') || 'None'}</div>
                      <div><strong>Teacher Mode:</strong> {isTeacherMode ? 'Yes' : 'No'}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle />

            {/* Right Panel - Components */}
            <ResizablePanel defaultSize={70}>
              <div className="h-full">
                <Tabs defaultValue="timer" className="h-full">
                  <div className="p-4 border-b">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="timer" className="text-xs">
                        <Timer className="h-3 w-3 mr-1" />
                        Phase Timer
                      </TabsTrigger>
                      <TabsTrigger value="progress" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Progress
                      </TabsTrigger>
                      <TabsTrigger value="indicator" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Indicator
                      </TabsTrigger>
                      <TabsTrigger value="integration" className="text-xs">
                        <Settings className="h-3 w-3 mr-1" />
                        Integration
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Phase Timer Tab */}
                  <TabsContent value="timer" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>PhaseTimer Component</CardTitle>
                          <CardDescription>
                            Real-time countdown with teacher controls
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <PhaseTimer
                        phase={currentScenario.phase}
                        phaseStartTime={getDemoPhaseStartTime()}
                        phaseDurationMs={getPhaseDurationMs(currentScenario.phase)}
                        isPaused={false}
                        isTeacher={isTeacherMode}
                        onPhaseComplete={handlePhaseComplete}
                        onPause={() => console.log('Phase paused')}
                        onResume={() => console.log('Phase resumed')}
                        onSkip={() => console.log('Phase skipped')}
                        onExtend={(ms) => console.log(`Phase extended by ${ms}ms`)}
                        showWarnings={true}
                        soundEnabled={false}
                      />
                    </div>
                  </TabsContent>

                  {/* Progress Tab */}
                  <TabsContent value="progress" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>PhaseProgress Component</CardTitle>
                          <CardDescription>
                            Visual timeline and progress tracking
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {/* Full variant */}
                        <div>
                          <h3 className="font-medium mb-2">Full Timeline</h3>
                          <PhaseProgress
                            currentPhase={currentScenario.phase}
                            completedPhases={currentScenario.completed}
                            phaseStartTime={getDemoPhaseStartTime()}
                            phaseDurationMs={getPhaseDurationMs(currentScenario.phase)}
                            isPaused={false}
                            variant="full"
                            showEstimatedTime={true}
                          />
                        </div>
                        
                        {/* Compact variant */}
                        <div>
                          <h3 className="font-medium mb-2">Compact View</h3>
                          <PhaseProgress
                            currentPhase={currentScenario.phase}
                            completedPhases={currentScenario.completed}
                            phaseStartTime={getDemoPhaseStartTime()}
                            phaseDurationMs={getPhaseDurationMs(currentScenario.phase)}
                            isPaused={false}
                            variant="compact"
                            showEstimatedTime={true}
                          />
                        </div>
                        
                        {/* Minimal variant */}
                        <div>
                          <h3 className="font-medium mb-2">Minimal Progress</h3>
                          <PhaseProgress
                            currentPhase={currentScenario.phase}
                            completedPhases={currentScenario.completed}
                            phaseStartTime={getDemoPhaseStartTime()}
                            phaseDurationMs={getPhaseDurationMs(currentScenario.phase)}
                            isPaused={false}
                            variant="minimal"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Indicator Tab */}
                  <TabsContent value="indicator" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Enhanced PhaseIndicator</CardTitle>
                          <CardDescription>
                            Updated component with timer integration
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {/* With Timer */}
                        <div>
                          <h3 className="font-medium mb-2">With Timer Display</h3>
                          <PhaseIndicator
                            currentPhase={manualPhase}
                            phaseStartTime={manualStartTime}
                            totalPhaseTime={getPhaseDurationMs(manualPhase)}
                            completedPhases={manualCompleted}
                            isPaused={false}
                            isTeacher={isTeacherMode}
                            variant="default"
                            showTimer={true}
                            onPhaseComplete={handlePhaseComplete}
                            onPause={() => console.log('Paused via indicator')}
                            onResume={() => console.log('Resumed via indicator')}
                          />
                        </div>
                        
                        {/* With Phase Progress */}
                        <div>
                          <h3 className="font-medium mb-2">With Phase Progress</h3>
                          <PhaseIndicator
                            currentPhase={manualPhase}
                            phaseStartTime={manualStartTime}
                            totalPhaseTime={getPhaseDurationMs(manualPhase)}
                            completedPhases={manualCompleted}
                            isPaused={false}
                            isTeacher={isTeacherMode}
                            variant="default"
                            showPhaseProgress={true}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Integration Tab */}
                  <TabsContent value="integration" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Backend Integration Test</CardTitle>
                          <CardDescription>
                            Testing usePhaseManagement hook
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      {phaseManagement.phaseState && (
                        <div className="grid grid-cols-1 gap-4">
                          <PhaseTimer
                            phase={phaseManagement.phaseState.currentPhase}
                            phaseStartTime={phaseManagement.phaseState.phaseStartTime}
                            phaseDurationMs={phaseManagement.phaseState.phaseDurationMs}
                            isPaused={phaseManagement.phaseState.isPaused}
                            isTeacher={isTeacherMode}
                            onPhaseComplete={phaseManagement.handlePhaseComplete}
                            onPause={phaseManagement.pausePhase}
                            onResume={phaseManagement.resumePhase}
                            onSkip={phaseManagement.skipPhase}
                            onExtend={phaseManagement.extendPhase}
                          />
                          
                          <PhaseProgress
                            currentPhase={phaseManagement.phaseState.currentPhase}
                            completedPhases={phaseManagement.phaseState.completedPhases}
                            phaseStartTime={phaseManagement.phaseState.phaseStartTime}
                            phaseDurationMs={phaseManagement.phaseState.phaseDurationMs}
                            isPaused={phaseManagement.phaseState.isPaused}
                            variant="compact"
                            showEstimatedTime={true}
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Footer - Success Criteria */}
        <div className="border-t bg-card p-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="font-medium mb-2">Task 6.3.1 Success Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Real-time countdown timer for debate phases</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Phase progress indicator with visual timeline</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Phase transition animations and notifications</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Timer pause/resume controls for teachers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <PhaseTransition
        fromPhase={transitionFrom}
        toPhase={transitionTo}
        isVisible={showTransition}
        duration={5000}
        showCountdown={true}
        countdownSeconds={5}
        onComplete={handleTransitionComplete}
        onDismiss={() => setShowTransition(false)}
      />
      
      <PhaseChangeNotification
        phase={transitionTo}
        isVisible={showNotification}
        duration={3000}
        position="top"
        onDismiss={() => setShowNotification(false)}
      />
    </div>
  );
}
