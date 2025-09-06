/**
 * Session Control Panel Component
 * 
 * Task 8.4.1: Session control features with phase advancement controls,
 * timer adjustment and pause/resume, and emergency procedures
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  RotateCcw,
  Timer,
  Clock,
  FastForward,
  Rewind,
  AlertTriangle,
  Shield,
  StopCircle,
  PlayCircle,
  PauseCircle,
  Settings,
  Zap,
  Users,
  MessageSquare,
  Bell,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Wifi,
  WifiOff,
  RefreshCw,
  Save,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Calendar,
  Target,
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Types
interface SessionPhase {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  allowParticipantSpeaking: boolean;
  allowChatting: boolean;
  moderationLevel: 'strict' | 'moderate' | 'lenient';
  timerVisible: boolean;
  required: boolean;
}

interface SessionState {
  id: string;
  title: string;
  status: 'preparing' | 'active' | 'paused' | 'completed' | 'cancelled' | 'emergency_stopped';
  currentPhaseIndex: number;
  phases: SessionPhase[];
  startTime: Date;
  pausedTime?: Date;
  totalPausedDuration: number; // milliseconds
  phaseTimeRemaining: number; // milliseconds
  totalElapsedTime: number; // milliseconds
  participantCount: number;
  emergencyStopReason?: string;
  lastControlAction?: {
    action: string;
    timestamp: Date;
    reason?: string;
    performedBy: string;
  };
}

interface TimerAdjustment {
  type: 'add' | 'subtract' | 'set';
  amount: number; // minutes
  reason: string;
  applyTo: 'current_phase' | 'all_remaining' | 'specific_phase';
  targetPhaseId?: string;
}

interface EmergencyAction {
  type: 'stop_session' | 'remove_participant' | 'mute_all' | 'pause_indefinite' | 'technical_break';
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  requiresConfirmation: boolean;
  notifyParticipants: boolean;
  logIncident: boolean;
}

interface SessionControlPanelProps {
  sessionId: string;
  sessionState?: SessionState;
  onPhaseAdvance?: (direction: 'next' | 'previous') => void;
  onTimerAdjust?: (adjustment: TimerAdjustment) => void;
  onSessionControl?: (action: string, data?: any) => void;
  onEmergencyAction?: (action: EmergencyAction) => void;
  isLiveSession?: boolean;
}

export function SessionControlPanel({
  sessionId,
  sessionState,
  onPhaseAdvance,
  onTimerAdjust,
  onSessionControl,
  onEmergencyAction,
  isLiveSession = false
}: SessionControlPanelProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [showTimerAdjust, setShowTimerAdjust] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [showPhaseSkipDialog, setShowPhaseSkipDialog] = useState(false);
  const [emergencyAction, setEmergencyAction] = useState<EmergencyAction | null>(null);
  const [timerAdjustment, setTimerAdjustment] = useState<TimerAdjustment>({
    type: 'add',
    amount: 5,
    reason: '',
    applyTo: 'current_phase'
  });
  
  // Local state for immediate UI updates
  const [localSessionState, setLocalSessionState] = useState<SessionState>(
    sessionState || {
      id: sessionId,
      title: 'Sample Debate Session',
      status: 'active',
      currentPhaseIndex: 2,
      phases: [
        {
          id: '1',
          name: 'Opening Statements',
          description: 'Initial position presentations',
          duration: 15,
          allowParticipantSpeaking: true,
          allowChatting: false,
          moderationLevel: 'moderate',
          timerVisible: true,
          required: true
        },
        {
          id: '2',
          name: 'Preparation Time',
          description: 'Research and prepare rebuttals',
          duration: 10,
          allowParticipantSpeaking: false,
          allowChatting: true,
          moderationLevel: 'lenient',
          timerVisible: true,
          required: true
        },
        {
          id: '3',
          name: 'Cross-Examination',
          description: 'Question opposing arguments',
          duration: 20,
          allowParticipantSpeaking: true,
          allowChatting: false,
          moderationLevel: 'strict',
          timerVisible: true,
          required: true
        },
        {
          id: '4',
          name: 'Rebuttal Period',
          description: 'Respond to challenges',
          duration: 15,
          allowParticipantSpeaking: true,
          allowChatting: false,
          moderationLevel: 'moderate',
          timerVisible: true,
          required: true
        },
        {
          id: '5',
          name: 'Final Arguments',
          description: 'Closing statements',
          duration: 10,
          allowParticipantSpeaking: true,
          allowChatting: false,
          moderationLevel: 'moderate',
          timerVisible: true,
          required: true
        },
        {
          id: '6',
          name: 'Reflection',
          description: 'Post-debate discussion',
          duration: 15,
          allowParticipantSpeaking: true,
          allowChatting: true,
          moderationLevel: 'lenient',
          timerVisible: false,
          required: false
        }
      ],
      startTime: new Date(Date.now() - 45 * 60 * 1000), // Started 45 minutes ago
      totalPausedDuration: 0,
      phaseTimeRemaining: 12 * 60 * 1000, // 12 minutes remaining in current phase
      totalElapsedTime: 45 * 60 * 1000,
      participantCount: 4
    }
  );

  // Timer update effect
  useEffect(() => {
    if (!isLiveSession || localSessionState.status !== 'active') return;

    const interval = setInterval(() => {
      setLocalSessionState(prev => ({
        ...prev,
        phaseTimeRemaining: Math.max(0, prev.phaseTimeRemaining - 1000),
        totalElapsedTime: prev.totalElapsedTime + 1000
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isLiveSession, localSessionState.status]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getCurrentPhase = (): SessionPhase | null => {
    return localSessionState.phases[localSessionState.currentPhaseIndex] || null;
  };

  const getPhaseProgress = (): number => {
    const currentPhase = getCurrentPhase();
    if (!currentPhase) return 0;
    
    const totalDuration = currentPhase.duration * 60 * 1000;
    const elapsed = totalDuration - localSessionState.phaseTimeRemaining;
    return Math.min(100, (elapsed / totalDuration) * 100);
  };

  const handleSessionControl = (action: string, data?: any) => {
    const newStatus = 
      action === 'pause' ? 'paused' :
      action === 'resume' ? 'active' :
      action === 'stop' ? 'completed' : localSessionState.status;

    setLocalSessionState(prev => ({
      ...prev,
      status: newStatus,
      pausedTime: action === 'pause' ? new Date() : undefined,
      lastControlAction: {
        action,
        timestamp: new Date(),
        reason: data?.reason,
        performedBy: user?.id || 'system'
      }
    }));

    onSessionControl?.(action, data);
    
    addNotification({
      type: 'success',
      title: 'Session Control',
      message: `Session ${action} executed successfully.`
    });
  };

  const handlePhaseAdvance = (direction: 'next' | 'previous') => {
    const currentIndex = localSessionState.currentPhaseIndex;
    const newIndex = direction === 'next' 
      ? Math.min(currentIndex + 1, localSessionState.phases.length - 1)
      : Math.max(currentIndex - 1, 0);

    if (newIndex === currentIndex) {
      addNotification({
        type: 'warning',
        title: 'Phase Navigation',
        message: `Already at the ${direction === 'next' ? 'last' : 'first'} phase.`
      });
      return;
    }

    const newPhase = localSessionState.phases[newIndex];
    setLocalSessionState(prev => ({
      ...prev,
      currentPhaseIndex: newIndex,
      phaseTimeRemaining: newPhase.duration * 60 * 1000,
      lastControlAction: {
        action: `advance_phase_${direction}`,
        timestamp: new Date(),
        performedBy: user?.id || 'system'
      }
    }));

    onPhaseAdvance?.(direction);
    
    addNotification({
      type: 'success',
      title: 'Phase Advanced',
      message: `Moved to "${newPhase.name}" phase.`
    });
  };

  const handleTimerAdjustment = () => {
    if (!timerAdjustment.reason.trim()) {
      addNotification({
        type: 'error',
        title: 'Timer Adjustment',
        message: 'Please provide a reason for the timer adjustment.'
      });
      return;
    }

    const adjustmentMs = timerAdjustment.amount * 60 * 1000;
    let newTimeRemaining = localSessionState.phaseTimeRemaining;

    switch (timerAdjustment.type) {
      case 'add':
        newTimeRemaining += adjustmentMs;
        break;
      case 'subtract':
        newTimeRemaining = Math.max(0, newTimeRemaining - adjustmentMs);
        break;
      case 'set':
        newTimeRemaining = adjustmentMs;
        break;
    }

    setLocalSessionState(prev => ({
      ...prev,
      phaseTimeRemaining: newTimeRemaining,
      lastControlAction: {
        action: 'timer_adjust',
        timestamp: new Date(),
        reason: timerAdjustment.reason,
        performedBy: user?.id || 'system'
      }
    }));

    onTimerAdjust?.(timerAdjustment);
    setShowTimerAdjust(false);
    
    addNotification({
      type: 'success',
      title: 'Timer Adjusted',
      message: `Phase timer ${timerAdjustment.type === 'add' ? 'increased' : timerAdjustment.type === 'subtract' ? 'decreased' : 'set'} by ${timerAdjustment.amount} minutes.`
    });
  };

  const handleEmergencyAction = () => {
    if (!emergencyAction) return;

    if (emergencyAction.type === 'stop_session') {
      setLocalSessionState(prev => ({
        ...prev,
        status: 'emergency_stopped',
        emergencyStopReason: emergencyAction.reason,
        lastControlAction: {
          action: 'emergency_stop',
          timestamp: new Date(),
          reason: emergencyAction.reason,
          performedBy: user?.id || 'system'
        }
      }));
    }

    onEmergencyAction?.(emergencyAction);
    setShowEmergencyDialog(false);
    setEmergencyAction(null);
    
    addNotification({
      type: 'warning',
      title: 'Emergency Action',
      message: `Emergency action "${emergencyAction.type.replace('_', ' ')}" executed.`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'emergency_stopped':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'preparing':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <PlayCircle className="h-4 w-4" />;
      case 'paused':
        return <PauseCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'emergency_stopped':
        return <StopCircle className="h-4 w-4" />;
      case 'preparing':
        return <Clock className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const currentPhase = getCurrentPhase();
  const phaseProgress = getPhaseProgress();
  const canAdvanceNext = localSessionState.currentPhaseIndex < localSessionState.phases.length - 1;
  const canAdvancePrevious = localSessionState.currentPhaseIndex > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Session Control Panel
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage session flow, timing, and emergency procedures
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(localSessionState.status)}>
            {getStatusIcon(localSessionState.status)}
            <span className="ml-1 capitalize">{localSessionState.status.replace('_', ' ')}</span>
          </Badge>
          {isLiveSession && (
            <Badge variant="outline" className="flex items-center">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              Live
            </Badge>
          )}
        </div>
      </div>

      {/* Emergency Stop Banner */}
      {localSessionState.status === 'emergency_stopped' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Emergency Stop Active:</strong> {localSessionState.emergencyStopReason}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Control Interface */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Session Status & Timer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Timer className="h-5 w-5 mr-2" />
              Session Status & Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Phase */}
            {currentPhase && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{currentPhase.name}</h4>
                    <p className="text-sm text-muted-foreground">{currentPhase.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono">
                      {formatTime(localSessionState.phaseTimeRemaining)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Phase {localSessionState.currentPhaseIndex + 1} of {localSessionState.phases.length}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Phase Progress</span>
                    <span>{Math.round(phaseProgress)}%</span>
                  </div>
                  <Progress value={phaseProgress} />
                </div>
              </div>
            )}

            {/* Session Stats */}
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Total Elapsed</div>
                <div className="text-muted-foreground">
                  {formatTime(localSessionState.totalElapsedTime)}
                </div>
              </div>
              <div>
                <div className="font-medium">Participants</div>
                <div className="text-muted-foreground">
                  {localSessionState.participantCount} active
                </div>
              </div>
            </div>

            {/* Timer Controls */}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {localSessionState.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSessionControl('pause')}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                {localSessionState.status === 'paused' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSessionControl('resume')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTimerAdjust(true)}
                  disabled={localSessionState.status === 'completed' || localSessionState.status === 'emergency_stopped'}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Adjust Timer
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowEmergencyDialog(true)}
                disabled={localSessionState.status === 'completed' || localSessionState.status === 'emergency_stopped'}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Phase Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowRight className="h-5 w-5 mr-2" />
              Phase Navigation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phase Overview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Session Progress</span>
                <span>{localSessionState.currentPhaseIndex + 1}/{localSessionState.phases.length}</span>
              </div>
              <Progress value={((localSessionState.currentPhaseIndex + 1) / localSessionState.phases.length) * 100} />
            </div>

            {/* Phase List */}
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {localSessionState.phases.map((phase, index) => (
                  <div
                    key={phase.id}
                    className={`flex items-center justify-between p-2 rounded border ${
                      index === localSessionState.currentPhaseIndex
                        ? 'bg-blue-50 border-blue-300'
                        : index < localSessionState.currentPhaseIndex
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {index < localSessionState.currentPhaseIndex ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : index === localSessionState.currentPhaseIndex ? (
                        <PlayCircle className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <div className="text-sm font-medium">{phase.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDuration(phase.duration)}
                        </div>
                      </div>
                    </div>
                    {!phase.required && (
                      <Badge variant="outline" className="text-xs">
                        Optional
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Navigation Controls */}
            <Separator />
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePhaseAdvance('previous')}
                disabled={!canAdvancePrevious || localSessionState.status === 'completed'}
              >
                <SkipBack className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPhaseSkipDialog(true)}
                  disabled={localSessionState.status === 'completed'}
                >
                  Skip Phase
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePhaseAdvance('next')}
                  disabled={!canAdvanceNext || localSessionState.status === 'completed'}
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Session Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Controls */}
            <div className="grid grid-cols-2 gap-3">
              {localSessionState.status === 'preparing' && (
                <Button
                  className="w-full"
                  onClick={() => handleSessionControl('start')}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Session
                </Button>
              )}
              
              {localSessionState.status === 'active' && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSessionControl('pause')}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSessionControl('stop')}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                </>
              )}

              {localSessionState.status === 'paused' && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => handleSessionControl('resume')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSessionControl('stop')}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                </>
              )}
            </div>

            {/* Advanced Controls */}
            <Separator />
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Advanced Controls</h5>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <Volume2 className="h-4 w-4 mr-2" />
                  Audio Controls
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat Controls
                </Button>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Emergency Actions */}
            <Separator />
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-red-600">Emergency Actions</h5>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setShowEmergencyDialog(true)}
                disabled={localSessionState.status === 'completed' || localSessionState.status === 'emergency_stopped'}
              >
                <Shield className="h-4 w-4 mr-2" />
                Emergency Stop
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Control History & Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Control History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {localSessionState.lastControlAction ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Last Action:</span>
                  <span className="capitalize">{localSessionState.lastControlAction.action.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Time:</span>
                  <span>{localSessionState.lastControlAction.timestamp.toLocaleTimeString()}</span>
                </div>
                {localSessionState.lastControlAction.reason && (
                  <div className="text-sm">
                    <span className="font-medium">Reason:</span>
                    <p className="text-muted-foreground">{localSessionState.lastControlAction.reason}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No control actions recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timer Adjustment Dialog */}
      <Dialog open={showTimerAdjust} onOpenChange={setShowTimerAdjust}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Phase Timer</DialogTitle>
            <DialogDescription>
              Modify the current phase duration with a reason for the change
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Action</label>
                <Select value={timerAdjustment.type} onValueChange={(value: any) => setTimerAdjustment(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Time</SelectItem>
                    <SelectItem value="subtract">Subtract Time</SelectItem>
                    <SelectItem value="set">Set Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (minutes)</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimerAdjustment(prev => ({ ...prev, amount: Math.max(1, prev.amount - 1) }))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={timerAdjustment.amount}
                    onChange={(e) => setTimerAdjustment(prev => ({ ...prev, amount: parseInt(e.target.value) || 1 }))}
                    className="text-center"
                    min="1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimerAdjustment(prev => ({ ...prev, amount: prev.amount + 1 }))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Apply To</label>
              <Select value={timerAdjustment.applyTo} onValueChange={(value: any) => setTimerAdjustment(prev => ({ ...prev, applyTo: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_phase">Current Phase Only</SelectItem>
                  <SelectItem value="all_remaining">All Remaining Phases</SelectItem>
                  <SelectItem value="specific_phase">Specific Phase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason *</label>
              <Textarea
                placeholder="Explain why this adjustment is needed..."
                value={timerAdjustment.reason}
                onChange={(e) => setTimerAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Current phase time remaining: {formatTime(localSessionState.phaseTimeRemaining)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimerAdjust(false)}>
              Cancel
            </Button>
            <Button onClick={handleTimerAdjustment}>
              <Clock className="h-4 w-4 mr-2" />
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Action Dialog */}
      <AlertDialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Emergency Action Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select an emergency action to take. This will be logged and all participants will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Emergency Action</label>
              <Select onValueChange={(value) => {
                const actions: Record<string, EmergencyAction> = {
                  'stop_session': {
                    type: 'stop_session',
                    reason: '',
                    severity: 'critical',
                    requiresConfirmation: true,
                    notifyParticipants: true,
                    logIncident: true
                  },
                  'technical_break': {
                    type: 'technical_break',
                    reason: '',
                    severity: 'medium',
                    requiresConfirmation: false,
                    notifyParticipants: true,
                    logIncident: true
                  },
                  'mute_all': {
                    type: 'mute_all',
                    reason: '',
                    severity: 'high',
                    requiresConfirmation: false,
                    notifyParticipants: true,
                    logIncident: true
                  }
                };
                setEmergencyAction(actions[value] || null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select emergency action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stop_session">Emergency Stop Session</SelectItem>
                  <SelectItem value="technical_break">Technical Break</SelectItem>
                  <SelectItem value="mute_all">Mute All Participants</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {emergencyAction && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason *</label>
                <Textarea
                  placeholder="Explain the reason for this emergency action..."
                  value={emergencyAction.reason}
                  onChange={(e) => setEmergencyAction(prev => prev ? { ...prev, reason: e.target.value } : null)}
                  rows={3}
                />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmergencyAction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmergencyAction}
              disabled={!emergencyAction?.reason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              <Shield className="h-4 w-4 mr-2" />
              Execute Emergency Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
