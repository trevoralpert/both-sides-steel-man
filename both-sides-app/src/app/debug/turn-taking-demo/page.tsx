'use client';

/**
 * Debug page for testing Task 6.3.2 Turn-Taking & Speaking Order
 */

import React, { useState } from 'react';
import { DebatePhase, DebatePosition } from '@/types/debate';
import { TurnIndicator } from '@/components/debate-room/TurnIndicator';
import { SpeakingQueue } from '@/components/debate-room/SpeakingQueue';
import { TurnTimer } from '@/components/debate-room/TurnTimer';
import { TurnNotificationManager } from '@/components/debate-room/TurnNotification';
import { TurnManager } from '@/components/debate-room/TurnManager';
import { useTurnManagement } from '@/lib/hooks/useTurnManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  UserCheck, 
  Users, 
  Timer, 
  Bell, 
  Settings,
  RefreshCw,
  Play,
  Pause,
  SkipForward,
  Mic,
  CheckCircle2
} from 'lucide-react';

const phases: DebatePhase[] = [
  'OPENING',
  'DISCUSSION',
  'REBUTTAL',
  'CLOSING'
];

// Mock participants
const mockParticipants = [
  {
    id: 'user1',
    name: 'Sarah Chen',
    position: 'PRO' as DebatePosition,
    avatar: '/avatars/sarah.jpg',
    isOnline: true,
    hasSpoken: false
  },
  {
    id: 'user2',
    name: 'Marcus Johnson',
    position: 'CON' as DebatePosition,
    avatar: '/avatars/marcus.jpg',
    isOnline: true,
    hasSpoken: false
  }
];

// Test scenarios for turn management
const testScenarios = [
  {
    name: 'Opening Phase - PRO\'s Turn',
    phase: 'OPENING' as DebatePhase,
    currentSpeakerId: 'user1',
    completedTurns: [],
    description: 'PRO participant presenting opening statement'
  },
  {
    name: 'Discussion - Active Exchange',
    phase: 'DISCUSSION' as DebatePhase,
    currentSpeakerId: 'user2',
    completedTurns: ['user1'],
    description: 'Natural discussion phase with turn suggestions'
  },
  {
    name: 'Rebuttal - Structured Turns',
    phase: 'REBUTTAL' as DebatePhase,
    currentSpeakerId: 'user1',
    completedTurns: ['user1', 'user2'],
    description: 'Structured rebuttal with alternating responses'
  },
  {
    name: 'Closing - Final Statements',
    phase: 'CLOSING' as DebatePhase,
    currentSpeakerId: undefined,
    completedTurns: ['user1', 'user2', 'user1', 'user2'],
    description: 'Both participants giving closing statements'
  },
  {
    name: 'No Active Speaker',
    phase: 'DISCUSSION' as DebatePhase,
    currentSpeakerId: undefined,
    completedTurns: [],
    description: 'Phase with no current speaker - ready to start'
  }
];

export default function TurnTakingDemoPage() {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [selectedPhase, setSelectedPhase] = useState<DebatePhase>('DISCUSSION');
  const [currentUserId, setCurrentUserId] = useState('user1');
  const [isTeacherMode, setIsTeacherMode] = useState(true);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'your-turn' | 'turn-ending' | 'turn-over' | 'next-speaker';
    speakerName: string;
    speakerPosition?: DebatePosition;
    timeRemaining?: number;
    isVisible: boolean;
  }>>([]);

  // Turn management integration
  const turnManagement = useTurnManagement({
    conversationId: 'turn-demo',
    userId: currentUserId,
    currentPhase: selectedPhase,
    participants: mockParticipants,
    isTeacher: isTeacherMode,
    enabled: true
  });

  const currentScenario = testScenarios[selectedScenario];

  // Mock turn state for scenarios
  const getMockTurnState = () => {
    const scenario = currentScenario;
    const turnStartTime = scenario.currentSpeakerId ? 
      new Date(Date.now() - 45000) : // 45 seconds ago
      undefined;
    
    return {
      currentSpeakerId: scenario.currentSpeakerId,
      turnStartTime,
      turnDurationSeconds: selectedPhase === 'OPENING' ? 180 :
                          selectedPhase === 'DISCUSSION' ? 120 :
                          selectedPhase === 'REBUTTAL' ? 90 :
                          180, // CLOSING
      isPaused: false,
      queueOrder: selectedPhase === 'REBUTTAL' ? 
        ['user1', 'user2', 'user1', 'user2'] : // Alternating
        ['user1', 'user2'], // Sequential
      turnCount: scenario.completedTurns.length + (scenario.currentSpeakerId ? 1 : 0),
      completedTurns: scenario.completedTurns
    };
  };

  // Get current speaker for scenario
  const getCurrentSpeaker = () => {
    return mockParticipants.find(p => p.id === currentScenario.currentSpeakerId);
  };

  // Handle mock turn actions
  const handleStartTurn = (speakerId: string) => {
    console.log('Starting turn for:', speakerId);
    // In real implementation, this would call turnManagement.startTurn
  };

  const handleEndTurn = () => {
    console.log('Ending current turn');
    // In real implementation, this would call turnManagement.endTurn
  };

  const handleSkipTurn = () => {
    console.log('Skipping to next speaker');
    // In real implementation, this would call turnManagement.skipToNextSpeaker
  };

  const handlePauseResume = () => {
    console.log('Toggling pause state');
    // In real implementation, this would call turnManagement.pauseTurn/resumeTurn
  };

  // Add test notification
  const addTestNotification = (type: 'your-turn' | 'turn-ending' | 'turn-over' | 'next-speaker') => {
    const speaker = mockParticipants.find(p => p.id === currentUserId) || mockParticipants[0];
    const id = `${Date.now()}-${Math.random()}`;
    
    const notification = {
      id,
      type,
      speakerName: type === 'your-turn' ? 'You' : speaker.name,
      speakerPosition: speaker.position,
      timeRemaining: type === 'turn-ending' ? 15 : undefined,
      isVisible: true
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after delay
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, type === 'your-turn' ? 10000 : 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationAccept = (id: string) => {
    removeNotification(id);
    console.log('Notification accepted:', id);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div>
            <h1 className="text-xl font-semibold">Task 6.3.2: Turn-Taking & Speaking Order Demo</h1>
            <p className="text-sm text-muted-foreground">
              Testing turn management, speaking queue, and turn notifications
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="outline">Phase 6.3.2</Badge>
            {turnManagement.hasTurnData && (
              <Badge className="bg-green-100 text-green-800">
                <Timer className="h-3 w-3 mr-1" />
                Live Turn Data
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

                      {/* Phase Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Debate Phase:</label>
                        <Select value={selectedPhase} onValueChange={(v) => setSelectedPhase(v as DebatePhase)}>
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

                      {/* User Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Current User:</label>
                        <Select value={currentUserId} onValueChange={setCurrentUserId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {mockParticipants.map(participant => (
                              <SelectItem key={participant.id} value={participant.id}>
                                {participant.name} ({participant.position})
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
                            onClick={handleStartTurn}
                            className="justify-start"
                          >
                            <Play className="h-3 w-3 mr-2" />
                            Start Turn
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePauseResume}
                            className="justify-start"
                          >
                            <Pause className="h-3 w-3 mr-2" />
                            Pause/Resume
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSkipTurn}
                            className="justify-start"
                          >
                            <SkipForward className="h-3 w-3 mr-2" />
                            Skip Turn
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => turnManagement.refreshTurnState()}
                            className="justify-start"
                          >
                            <RefreshCw className="h-3 w-3 mr-2" />
                            Refresh
                          </Button>
                        </div>
                      </div>

                      {/* Notification Tests */}
                      <div className="space-y-2 pt-4 border-t">
                        <label className="text-sm font-medium">Test Notifications:</label>
                        <div className="grid grid-cols-1 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addTestNotification('your-turn')}
                            className="justify-start text-xs h-8"
                          >
                            <Mic className="h-3 w-3 mr-2" />
                            Your Turn
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addTestNotification('turn-ending')}
                            className="justify-start text-xs h-8"
                          >
                            <Timer className="h-3 w-3 mr-2" />
                            Time Warning
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addTestNotification('turn-over')}
                            className="justify-start text-xs h-8"
                          >
                            <Bell className="h-3 w-3 mr-2" />
                            Time Up
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Backend Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Backend Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <Badge variant={turnManagement.hasTurnData ? 'default' : 'outline'}>
                          {turnManagement.isLoading ? 'Loading...' :
                           turnManagement.hasTurnData ? 'Connected' : 'No Data'}
                        </Badge>
                      </div>
                      
                      {turnManagement.lastSync && (
                        <div className="flex items-center justify-between">
                          <span>Last Sync:</span>
                          <span className="text-muted-foreground">
                            {turnManagement.lastSync.toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span>Supports Turns:</span>
                        <Badge variant={turnManagement.supportsTurns ? 'default' : 'secondary'}>
                          {turnManagement.supportsTurns ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      
                      {turnManagement.error && (
                        <div className="text-red-600 text-xs p-2 bg-red-50 rounded">
                          {turnManagement.error}
                        </div>
                      )}
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
                <Tabs defaultValue="manager" className="h-full">
                  <div className="p-4 border-b">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="manager" className="text-xs">
                        <Settings className="h-3 w-3 mr-1" />
                        Manager
                      </TabsTrigger>
                      <TabsTrigger value="indicator" className="text-xs">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Indicator
                      </TabsTrigger>
                      <TabsTrigger value="queue" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        Queue
                      </TabsTrigger>
                      <TabsTrigger value="timer" className="text-xs">
                        <Timer className="h-3 w-3 mr-1" />
                        Timer
                      </TabsTrigger>
                      <TabsTrigger value="integration" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Live
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Turn Manager Tab */}
                  <TabsContent value="manager" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>TurnManager Component</CardTitle>
                          <CardDescription>
                            Complete turn management with controls and notifications
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <TurnManager
                        currentPhase={selectedPhase}
                        participants={mockParticipants}
                        currentUserId={currentUserId}
                        isTeacher={isTeacherMode}
                        turnState={getMockTurnState()}
                        onTurnStateChange={(newState) => {
                          console.log('Turn state changed:', newState);
                        }}
                        onTurnComplete={(speakerId, duration) => {
                          console.log('Turn completed:', speakerId, duration);
                        }}
                        onTurnSkip={(speakerId) => {
                          console.log('Turn skipped:', speakerId);
                        }}
                        variant="full"
                      />
                    </div>
                  </TabsContent>

                  {/* Turn Indicator Tab */}
                  <TabsContent value="indicator" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>TurnIndicator Component</CardTitle>
                          <CardDescription>
                            Visual indicators for current speaker
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {/* Default variant */}
                        <div>
                          <h3 className="font-medium mb-2">Default View</h3>
                          <TurnIndicator
                            currentSpeakerId={currentScenario.currentSpeakerId}
                            currentPhase={selectedPhase}
                            participants={mockParticipants}
                            turnTimeRemaining={currentScenario.currentSpeakerId ? 135 : undefined}
                            turnTimeLimit={180}
                            isCurrentUserTurn={currentScenario.currentSpeakerId === currentUserId}
                            variant="default"
                            showAvatar={true}
                            showTimer={true}
                          />
                        </div>
                        
                        {/* Compact variant */}
                        <div>
                          <h3 className="font-medium mb-2">Compact View</h3>
                          <TurnIndicator
                            currentSpeakerId={currentScenario.currentSpeakerId}
                            currentPhase={selectedPhase}
                            participants={mockParticipants}
                            turnTimeRemaining={currentScenario.currentSpeakerId ? 135 : undefined}
                            turnTimeLimit={180}
                            isCurrentUserTurn={currentScenario.currentSpeakerId === currentUserId}
                            variant="compact"
                            showAvatar={true}
                            showTimer={true}
                          />
                        </div>
                        
                        {/* Minimal variant */}
                        <div>
                          <h3 className="font-medium mb-2">Minimal View</h3>
                          <TurnIndicator
                            currentSpeakerId={currentScenario.currentSpeakerId}
                            currentPhase={selectedPhase}
                            participants={mockParticipants}
                            turnTimeRemaining={currentScenario.currentSpeakerId ? 135 : undefined}
                            turnTimeLimit={180}
                            isCurrentUserTurn={currentScenario.currentSpeakerId === currentUserId}
                            variant="minimal"
                            showTimer={true}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Speaking Queue Tab */}
                  <TabsContent value="queue" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>SpeakingQueue Component</CardTitle>
                          <CardDescription>
                            Turn order display with progress tracking
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {/* Default variant */}
                        <div>
                          <h3 className="font-medium mb-2">Full Queue</h3>
                          <SpeakingQueue
                            currentPhase={selectedPhase}
                            currentSpeakerId={currentScenario.currentSpeakerId}
                            participants={mockParticipants.map(p => ({
                              ...p,
                              hasSpoken: currentScenario.completedTurns.includes(p.id)
                            }))}
                            queueOrder={getMockTurnState().queueOrder}
                            turnProgress={{
                              current: currentScenario.completedTurns.length,
                              total: selectedPhase === 'DISCUSSION' ? 4 : 2
                            }}
                            variant="default"
                            showProgress={true}
                          />
                        </div>
                        
                        {/* Horizontal variant */}
                        <div>
                          <h3 className="font-medium mb-2">Horizontal Layout</h3>
                          <SpeakingQueue
                            currentPhase={selectedPhase}
                            currentSpeakerId={currentScenario.currentSpeakerId}
                            participants={mockParticipants.map(p => ({
                              ...p,
                              hasSpoken: currentScenario.completedTurns.includes(p.id)
                            }))}
                            queueOrder={getMockTurnState().queueOrder}
                            turnProgress={{
                              current: currentScenario.completedTurns.length,
                              total: selectedPhase === 'DISCUSSION' ? 4 : 2
                            }}
                            variant="horizontal"
                            showProgress={true}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Turn Timer Tab */}
                  <TabsContent value="timer" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>TurnTimer Component</CardTitle>
                          <CardDescription>
                            Individual turn countdown with controls
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {currentScenario.currentSpeakerId ? (
                          <>
                            {/* Default timer */}
                            <div>
                              <h3 className="font-medium mb-2">Full Timer</h3>
                              <TurnTimer
                                turnStartTime={new Date(Date.now() - 45000)}
                                turnDurationSeconds={180}
                                isPaused={false}
                                isActive={true}
                                currentPhase={selectedPhase}
                                speakerName={getCurrentSpeaker()?.name}
                                onTurnComplete={() => console.log('Turn completed')}
                                onWarning={(timeRemaining) => console.log('Warning:', timeRemaining)}
                                showControls={isTeacherMode}
                                onPause={() => console.log('Pause')}
                                onResume={() => console.log('Resume')}
                                onExtend={(seconds) => console.log('Extend:', seconds)}
                                soundEnabled={false}
                                variant="default"
                              />
                            </div>
                            
                            {/* Compact timer */}
                            <div>
                              <h3 className="font-medium mb-2">Compact Timer</h3>
                              <TurnTimer
                                turnStartTime={new Date(Date.now() - 45000)}
                                turnDurationSeconds={180}
                                isPaused={false}
                                isActive={true}
                                currentPhase={selectedPhase}
                                speakerName={getCurrentSpeaker()?.name}
                                onTurnComplete={() => console.log('Turn completed')}
                                soundEnabled={false}
                                variant="compact"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No active turn in current scenario</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Live Integration Tab */}
                  <TabsContent value="integration" className="h-full p-4 mt-0">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Live Backend Integration</CardTitle>
                          <CardDescription>
                            Testing with useTurnManagement hook
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      
                      {turnManagement.hasTurnData && turnManagement.turnState ? (
                        <TurnManager
                          currentPhase={selectedPhase}
                          participants={mockParticipants}
                          currentUserId={currentUserId}
                          isTeacher={isTeacherMode}
                          turnState={turnManagement.turnState}
                          onTurnStateChange={turnManagement.updateTurnState}
                          onTurnComplete={(speakerId, duration) => {
                            console.log('Live turn completed:', speakerId, duration);
                          }}
                          onTurnSkip={(speakerId) => {
                            console.log('Live turn skipped:', speakerId);
                          }}
                          variant="compact"
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No live turn data available</p>
                          <p className="text-xs mt-1">
                            {turnManagement.supportsTurns ? 
                              'Turn management system ready' : 
                              'Phase does not support turns'
                            }
                          </p>
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
            <h3 className="font-medium mb-2">Task 6.3.2 Success Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Clear visual indication of current speaker</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Appropriate turn-taking for each phase</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Helpful prompts without being restrictive</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Smooth transitions between speakers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Manager */}
      <TurnNotificationManager
        notifications={notifications}
        currentPhase={selectedPhase}
        onDismiss={removeNotification}
        onAccept={handleNotificationAccept}
        soundEnabled={false}
      />
    </div>
  );
}
