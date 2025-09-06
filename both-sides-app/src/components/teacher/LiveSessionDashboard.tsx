/**
 * Live Session Dashboard Component
 * 
 * Task 8.4.1: Real-time session monitoring dashboard with participant status,
 * multiple session monitoring, and live performance metrics
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Activity,
  Play,
  Pause,
  Square,
  Users,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Eye,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Heart,
  Brain,
  Target,
  Zap,
  Bell,
  BellOff,
  Settings,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  RefreshCw,
  Filter,
  Search,
  ExternalLink,
  PlayCircle,
  PauseCircle,
  StopCircle,
  BarChart3,
  LineChart,
  PieChart,
  Radio,
  Timer,
  UserCheck,
  UserX,
  MessageCircle,
  Flag,
  Shield,
  Headphones
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface LiveSession {
  id: string;
  title: string;
  topic: string;
  format: string;
  status: 'waiting' | 'active' | 'paused' | 'completed' | 'cancelled';
  startTime: Date;
  duration: number; // minutes
  elapsedTime: number; // milliseconds
  currentPhase: string;
  totalPhases: number;
  currentPhaseIndex: number;
  phaseTimeRemaining: number; // milliseconds
  participants: SessionParticipant[];
  moderatorId: string;
  createdBy: string;
  settings: SessionSettings;
  health: SessionHealth;
  metrics: SessionMetrics;
  alerts: SessionAlert[];
}

interface SessionParticipant {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  role: 'debater_pro' | 'debater_con' | 'observer' | 'moderator';
  status: 'online' | 'offline' | 'idle' | 'disconnected';
  connection: ConnectionStatus;
  engagement: EngagementMetrics;
  performance: ParticipantPerformance;
  interventions: string[];
  lastActivity: Date;
}

interface ConnectionStatus {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number; // milliseconds
  packetLoss: number; // percentage
  bandwidth: number; // kbps
  reconnections: number;
}

interface EngagementMetrics {
  participationScore: number; // 0-100
  messageCount: number;
  avgResponseTime: number; // milliseconds
  qualityScore: number; // 0-100
  attentionLevel: 'high' | 'medium' | 'low';
  timeActive: number; // milliseconds
  timeIdle: number; // milliseconds
}

interface ParticipantPerformance {
  argumentQuality: number; // 0-100
  respectfulness: number; // 0-100
  evidenceUse: number; // 0-100
  logicalConsistency: number; // 0-100
  collaborationScore: number; // 0-100
  improvementTrend: 'improving' | 'stable' | 'declining';
}

interface SessionSettings {
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  realTimeModeration: boolean;
  aiCoachingEnabled: boolean;
  allowSpectators: boolean;
  maxParticipants: number;
  pauseBetweenPhases: boolean;
  notificationsEnabled: boolean;
}

interface SessionHealth {
  overall: 'healthy' | 'warning' | 'critical';
  participantConnection: number; // percentage of stable connections
  engagementLevel: number; // average engagement score
  technicalIssues: number; // count of active issues
  moderationAlerts: number; // count of moderation alerts
  lastHealthCheck: Date;
}

interface SessionMetrics {
  totalMessages: number;
  averageResponseTime: number;
  participationRate: number;
  qualityScore: number;
  engagementTrend: 'up' | 'down' | 'stable';
  peakConcurrency: number;
  phaseCompletionRate: number;
}

interface SessionAlert {
  id: string;
  type: 'technical' | 'moderation' | 'engagement' | 'performance' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  participantId?: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  actionRequired: boolean;
}

interface LiveSessionDashboardProps {
  onSessionSelect?: (sessionId: string) => void;
  onSessionControl?: (sessionId: string, action: string) => void;
  onParticipantAction?: (sessionId: string, participantId: string, action: string) => void;
}

export function LiveSessionDashboard({
  onSessionSelect,
  onSessionControl,
  onParticipantAction
}: LiveSessionDashboardProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'single' | 'split'>('grid');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    health: '',
    search: ''
  });
  
  // Real-time update refs
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date>(new Date());

  useEffect(() => {
    loadLiveSessions();
    
    if (autoRefresh) {
      updateIntervalRef.current = setInterval(() => {
        updateSessionData();
      }, refreshInterval);
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const loadLiveSessions = async () => {
    try {
      // Mock data for development
      const mockSessions: LiveSession[] = [
        {
          id: '1',
          title: 'Climate Change Policy Debate',
          topic: 'Should governments implement carbon taxes to combat climate change?',
          format: 'Oxford Style',
          status: 'active',
          startTime: new Date(Date.now() - 45 * 60 * 1000), // Started 45 minutes ago
          duration: 90,
          elapsedTime: 45 * 60 * 1000,
          currentPhase: 'Cross-Examination',
          totalPhases: 6,
          currentPhaseIndex: 3,
          phaseTimeRemaining: 8 * 60 * 1000, // 8 minutes left
          participants: [
            {
              id: 'p1',
              userId: 'user1',
              name: 'Sarah Johnson',
              role: 'debater_pro',
              status: 'online',
              connection: {
                quality: 'excellent',
                latency: 35,
                packetLoss: 0,
                bandwidth: 1200,
                reconnections: 0
              },
              engagement: {
                participationScore: 92,
                messageCount: 18,
                avgResponseTime: 2400,
                qualityScore: 88,
                attentionLevel: 'high',
                timeActive: 42 * 60 * 1000,
                timeIdle: 3 * 60 * 1000
              },
              performance: {
                argumentQuality: 85,
                respectfulness: 96,
                evidenceUse: 89,
                logicalConsistency: 87,
                collaborationScore: 91,
                improvementTrend: 'improving'
              },
              interventions: [],
              lastActivity: new Date(Date.now() - 2 * 60 * 1000)
            },
            {
              id: 'p2',
              userId: 'user2',
              name: 'Michael Chen',
              role: 'debater_con',
              status: 'online',
              connection: {
                quality: 'good',
                latency: 58,
                packetLoss: 0.2,
                bandwidth: 980,
                reconnections: 1
              },
              engagement: {
                participationScore: 76,
                messageCount: 14,
                avgResponseTime: 3200,
                qualityScore: 82,
                attentionLevel: 'medium',
                timeActive: 38 * 60 * 1000,
                timeIdle: 7 * 60 * 1000
              },
              performance: {
                argumentQuality: 78,
                respectfulness: 85,
                evidenceUse: 74,
                logicalConsistency: 81,
                collaborationScore: 79,
                improvementTrend: 'stable'
              },
              interventions: ['engagement_prompt'],
              lastActivity: new Date(Date.now() - 1 * 60 * 1000)
            },
            {
              id: 'p3',
              userId: 'user3',
              name: 'Emma Davis',
              role: 'observer',
              status: 'idle',
              connection: {
                quality: 'fair',
                latency: 145,
                packetLoss: 1.5,
                bandwidth: 650,
                reconnections: 3
              },
              engagement: {
                participationScore: 45,
                messageCount: 3,
                avgResponseTime: 8500,
                qualityScore: 62,
                attentionLevel: 'low',
                timeActive: 28 * 60 * 1000,
                timeIdle: 17 * 60 * 1000
              },
              performance: {
                argumentQuality: 65,
                respectfulness: 88,
                evidenceUse: 52,
                logicalConsistency: 58,
                collaborationScore: 43,
                improvementTrend: 'declining'
              },
              interventions: ['attention_alert', 'engagement_prompt'],
              lastActivity: new Date(Date.now() - 8 * 60 * 1000)
            }
          ],
          moderatorId: 'teacher1',
          createdBy: 'teacher1',
          settings: {
            recordingEnabled: true,
            transcriptionEnabled: true,
            realTimeModeration: true,
            aiCoachingEnabled: true,
            allowSpectators: true,
            maxParticipants: 8,
            pauseBetweenPhases: false,
            notificationsEnabled: true
          },
          health: {
            overall: 'warning',
            participantConnection: 85,
            engagementLevel: 71,
            technicalIssues: 1,
            moderationAlerts: 0,
            lastHealthCheck: new Date()
          },
          metrics: {
            totalMessages: 35,
            averageResponseTime: 2800,
            participationRate: 76,
            qualityScore: 82,
            engagementTrend: 'stable',
            peakConcurrency: 3,
            phaseCompletionRate: 100
          },
          alerts: [
            {
              id: 'alert1',
              type: 'engagement',
              severity: 'medium',
              title: 'Low Engagement Detected',
              message: 'Emma Davis has been idle for 8 minutes with minimal participation',
              participantId: 'p3',
              timestamp: new Date(Date.now() - 3 * 60 * 1000),
              acknowledged: false,
              resolved: false,
              actionRequired: true
            }
          ]
        },
        {
          id: '2',
          title: 'Economic Policy Discussion',
          topic: 'Universal Basic Income Implementation',
          format: 'Parliamentary',
          status: 'paused',
          startTime: new Date(Date.now() - 25 * 60 * 1000),
          duration: 60,
          elapsedTime: 25 * 60 * 1000,
          currentPhase: 'Opening Statements',
          totalPhases: 4,
          currentPhaseIndex: 1,
          phaseTimeRemaining: 15 * 60 * 1000,
          participants: [
            {
              id: 'p4',
              userId: 'user4',
              name: 'Alex Thompson',
              role: 'debater_pro',
              status: 'online',
              connection: {
                quality: 'excellent',
                latency: 28,
                packetLoss: 0,
                bandwidth: 1400,
                reconnections: 0
              },
              engagement: {
                participationScore: 88,
                messageCount: 12,
                avgResponseTime: 2100,
                qualityScore: 91,
                attentionLevel: 'high',
                timeActive: 24 * 60 * 1000,
                timeIdle: 1 * 60 * 1000
              },
              performance: {
                argumentQuality: 92,
                respectfulness: 89,
                evidenceUse: 87,
                logicalConsistency: 94,
                collaborationScore: 85,
                improvementTrend: 'improving'
              },
              interventions: [],
              lastActivity: new Date()
            }
          ],
          moderatorId: 'teacher1',
          createdBy: 'teacher1',
          settings: {
            recordingEnabled: false,
            transcriptionEnabled: true,
            realTimeModeration: false,
            aiCoachingEnabled: false,
            allowSpectators: false,
            maxParticipants: 4,
            pauseBetweenPhases: true,
            notificationsEnabled: true
          },
          health: {
            overall: 'healthy',
            participantConnection: 100,
            engagementLevel: 88,
            technicalIssues: 0,
            moderationAlerts: 0,
            lastHealthCheck: new Date()
          },
          metrics: {
            totalMessages: 12,
            averageResponseTime: 2100,
            participationRate: 88,
            qualityScore: 91,
            engagementTrend: 'up',
            peakConcurrency: 1,
            phaseCompletionRate: 100
          },
          alerts: []
        }
      ];

      setLiveSessions(mockSessions);
      if (!selectedSessionId && mockSessions.length > 0) {
        setSelectedSessionId(mockSessions[0].id);
      }

    } catch (error) {
      console.error('Failed to load live sessions:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load live session data. Please try again.'
      });
    }
  };

  const updateSessionData = () => {
    // Simulate real-time updates
    setLiveSessions(prev => prev.map(session => ({
      ...session,
      elapsedTime: session.status === 'active' 
        ? Date.now() - session.startTime.getTime()
        : session.elapsedTime,
      phaseTimeRemaining: session.status === 'active'
        ? Math.max(0, session.phaseTimeRemaining - refreshInterval)
        : session.phaseTimeRemaining,
      participants: session.participants.map(participant => ({
        ...participant,
        lastActivity: Math.random() > 0.7 ? new Date() : participant.lastActivity,
        engagement: {
          ...participant.engagement,
          participationScore: Math.max(0, Math.min(100, 
            participant.engagement.participationScore + (Math.random() - 0.5) * 5
          ))
        }
      })),
      metrics: {
        ...session.metrics,
        totalMessages: session.metrics.totalMessages + Math.floor(Math.random() * 3)
      }
    })));

    lastUpdateRef.current = new Date();
  };

  const handleSessionControl = (sessionId: string, action: string) => {
    setLiveSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? {
            ...session,
            status: action === 'pause' ? 'paused' : 
                   action === 'resume' ? 'active' :
                   action === 'stop' ? 'completed' : session.status
          }
        : session
    ));

    onSessionControl?.(sessionId, action);
    
    addNotification({
      type: 'success',
      title: 'Session Control',
      message: `Session ${action} command executed successfully.`
    });
  };

  const handleParticipantAction = (sessionId: string, participantId: string, action: string) => {
    onParticipantAction?.(sessionId, participantId, action);
    
    addNotification({
      type: 'info',
      title: 'Participant Action',
      message: `${action} action applied to participant.`
    });
  };

  const acknowledgeAlert = (sessionId: string, alertId: string) => {
    setLiveSessions(prev => prev.map(session =>
      session.id === sessionId
        ? {
            ...session,
            alerts: session.alerts.map(alert =>
              alert.id === alertId
                ? { ...alert, acknowledged: true }
                : alert
            )
          }
        : session
    ));
  };

  const getStatusColor = (status: LiveSession['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'waiting':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionIcon = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'good':
        return <Wifi className="h-4 w-4 text-blue-600" />;
      case 'fair':
        return <Wifi className="h-4 w-4 text-yellow-600" />;
      case 'poor':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEngagementIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'medium':
        return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const filteredSessions = liveSessions.filter(session => {
    if (filters.status && session.status !== filters.status) return false;
    if (filters.health && session.health.overall !== filters.health) return false;
    if (filters.search && 
        !session.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !session.topic.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const selectedSession = selectedSessionId 
    ? liveSessions.find(s => s.id === selectedSessionId) 
    : null;

  const activeAlerts = liveSessions.reduce((total, session) => 
    total + session.alerts.filter(alert => !alert.acknowledged).length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Radio className="h-6 w-6 mr-2 text-green-600" />
            Live Session Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor active debate sessions in real-time
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center">
              <Circle className={`h-2 w-2 mr-1 ${autoRefresh ? 'fill-green-600' : 'fill-gray-400'}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Badge>
            <Badge variant="outline">
              {liveSessions.filter(s => s.status === 'active').length} Active
            </Badge>
            {activeAlerts > 0 && (
              <Badge variant="destructive" className="flex items-center">
                <Bell className="h-3 w-3 mr-1" />
                {activeAlerts} Alerts
              </Badge>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <label htmlFor="auto-refresh" className="text-sm font-medium">
                Auto-refresh
              </label>
            </div>
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid View</SelectItem>
                <SelectItem value="single">Single View</SelectItem>
                <SelectItem value="split">Split View</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={updateSessionData}
              disabled={autoRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {activeAlerts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>{activeAlerts} active alert{activeAlerts !== 1 ? 's' : ''}</strong> requiring attention across your live sessions.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAlertsEnabled(!alertsEnabled)}
            >
              {alertsEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Health</label>
              <Select value={filters.health} onValueChange={(value) => setFilters(prev => ({ ...prev, health: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All health levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All health levels</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Updated</label>
              <p className="text-sm text-muted-foreground">
                {lastUpdateRef.current.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {viewMode === 'grid' && (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredSessions.length === 0 ? (
            <div className="col-span-2">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No live sessions</h3>
                    <p className="text-muted-foreground">
                      {liveSessions.length === 0 
                        ? "No sessions are currently active"
                        : "No sessions match your current filters"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(session.status)}>
                          {session.status === 'active' && <PlayCircle className="h-3 w-3 mr-1" />}
                          {session.status === 'paused' && <PauseCircle className="h-3 w-3 mr-1" />}
                          {session.status === 'waiting' && <Clock className="h-3 w-3 mr-1" />}
                          {session.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {session.status}
                        </Badge>
                        <Badge className={getHealthColor(session.health.overall)}>
                          {session.health.overall}
                        </Badge>
                        {session.alerts.filter(a => !a.acknowledged).length > 0 && (
                          <Badge variant="destructive">
                            <Bell className="h-3 w-3 mr-1" />
                            {session.alerts.filter(a => !a.acknowledged).length}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{session.title}</CardTitle>
                      <CardDescription>
                        {session.format} • {formatTime(session.elapsedTime)} elapsed
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedSessionId(session.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {session.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleSessionControl(session.id, 'pause')}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Session
                          </DropdownMenuItem>
                        )}
                        {session.status === 'paused' && (
                          <DropdownMenuItem onClick={() => handleSessionControl(session.id, 'resume')}>
                            <Play className="h-4 w-4 mr-2" />
                            Resume Session
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleSessionControl(session.id, 'stop')}>
                          <Square className="h-4 w-4 mr-2" />
                          End Session
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Phase Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Phase: {session.currentPhase}</span>
                      <span>{session.currentPhaseIndex + 1}/{session.totalPhases}</span>
                    </div>
                    <Progress value={((session.currentPhaseIndex + 1) / session.totalPhases) * 100} />
                    <div className="text-xs text-muted-foreground">
                      {formatTime(session.phaseTimeRemaining)} remaining in phase
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Participants ({session.participants.length})
                    </h4>
                    <div className="space-y-2">
                      {session.participants.slice(0, 3).map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={participant.avatar} />
                              <AvatarFallback className="text-xs">
                                {participant.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{participant.name}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {participant.role.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getConnectionIcon(participant.connection.quality)}
                            {getEngagementIcon(participant.engagement.attentionLevel)}
                            <div className={`h-2 w-2 rounded-full ${
                              participant.status === 'online' ? 'bg-green-500' :
                              participant.status === 'idle' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                          </div>
                        </div>
                      ))}
                      {session.participants.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{session.participants.length - 3} more participants
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick metrics */}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">{session.metrics.participationRate}%</div>
                      <div className="text-muted-foreground text-xs">Participation</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{session.metrics.qualityScore}%</div>
                      <div className="text-muted-foreground text-xs">Quality</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{session.metrics.totalMessages}</div>
                      <div className="text-muted-foreground text-xs">Messages</div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSessionId(session.id)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Monitor
                    </Button>
                    <div className="flex space-x-1">
                      {session.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSessionControl(session.id, 'pause')}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {session.status === 'paused' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSessionControl(session.id, 'resume')}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSessionControl(session.id, 'stop')}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Alerts */}
                  {session.alerts.filter(a => !a.acknowledged).length > 0 && (
                    <div className="space-y-2">
                      <Separator />
                      {session.alerts.filter(a => !a.acknowledged).slice(0, 2).map((alert) => (
                        <Alert key={alert.id} variant={alert.severity === 'high' || alert.severity === 'critical' ? 'destructive' : 'default'}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{alert.title}</div>
                              <div className="text-sm">{alert.message}</div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acknowledgeAlert(session.id, alert.id)}
                            >
                              Acknowledge
                            </Button>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Single session detailed view */}
      {viewMode === 'single' && selectedSession && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{selectedSession.title}</CardTitle>
                <CardDescription className="mt-1">
                  {selectedSession.topic}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(selectedSession.status)}>
                  {selectedSession.status}
                </Badge>
                <Badge className={getHealthColor(selectedSession.health.overall)}>
                  {selectedSession.health.overall}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Detailed Session View</h3>
              <p className="text-muted-foreground">
                Detailed monitoring interface will be displayed here with real-time participant tracking,
                performance analytics, and intervention controls.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
