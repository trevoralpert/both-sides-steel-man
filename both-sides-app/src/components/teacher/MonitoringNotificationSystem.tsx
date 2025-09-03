/**
 * Monitoring Notification System Component
 * 
 * Task 8.4.1: Configurable alerts for session events, escalation procedures 
 * for moderation issues, and milestone notifications during live sessions
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Bell,
  BellOff,
  BellRing,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  MessageSquare,
  Shield,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Mail,
  Settings,
  Filter,
  Search,
  Plus,
  Minus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  Download,
  Upload,
  Copy,
  Share2
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface NotificationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'engagement' | 'technical' | 'behavioral' | 'performance' | 'milestone' | 'system';
  trigger: NotificationTrigger;
  conditions: NotificationCondition[];
  actions: NotificationAction[];
  escalation?: EscalationRule;
  cooldown: number; // minutes between same notifications
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  lastTriggered?: Date;
}

interface NotificationTrigger {
  type: 'threshold' | 'pattern' | 'event' | 'time_based' | 'composite';
  metric: string; // e.g., 'engagement_score', 'participation_rate'
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne' | 'change' | 'trend';
  value: number;
  timeWindow?: number; // minutes
  persistence?: number; // how long condition must persist
}

interface NotificationCondition {
  field: string;
  operator: 'and' | 'or';
  value: any;
  required: boolean;
}

interface NotificationAction {
  type: 'alert' | 'email' | 'sms' | 'popup' | 'sound' | 'intervention' | 'log' | 'webhook';
  target?: string; // email address, webhook URL, etc.
  template?: string;
  delay?: number; // seconds
  data?: Record<string, any>;
}

interface EscalationRule {
  enabled: boolean;
  levels: EscalationLevel[];
  timeouts: number[]; // minutes before each escalation
  resetAfter: number; // minutes after which escalation resets
}

interface EscalationLevel {
  level: number;
  name: string;
  actions: NotificationAction[];
  recipients: string[];
  requiresAcknowledgment: boolean;
  autoResolve: boolean;
}

interface ActiveNotification {
  id: string;
  ruleId: string;
  ruleName: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  sessionId: string;
  participantId?: string;
  metricValue?: number;
  threshold?: number;
  acknowledged: boolean;
  resolved: boolean;
  escalationLevel: number;
  nextEscalation?: Date;
  actions: NotificationAction[];
  data?: Record<string, any>;
}

interface SessionMilestone {
  id: string;
  type: 'phase_complete' | 'time_milestone' | 'participation_goal' | 'quality_threshold' | 'custom';
  title: string;
  description: string;
  achieved: boolean;
  achievedAt?: Date;
  targetValue?: number;
  currentValue?: number;
  celebrationLevel: 'minimal' | 'standard' | 'celebration';
}

interface MonitoringNotificationSystemProps {
  sessionId?: string;
  onNotificationTrigger?: (notification: ActiveNotification) => void;
  onEscalationTrigger?: (notification: ActiveNotification, level: number) => void;
  onMilestoneAchieved?: (milestone: SessionMilestone) => void;
}

export function MonitoringNotificationSystem({
  sessionId,
  onNotificationTrigger,
  onEscalationTrigger,
  onMilestoneAchieved
}: MonitoringNotificationSystemProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [activeNotifications, setActiveNotifications] = useState<ActiveNotification[]>([]);
  const [sessionMilestones, setSessionMilestones] = useState<SessionMilestone[]>([]);
  const [globalSettings, setGlobalSettings] = useState({
    enabled: true,
    soundEnabled: true,
    popupEnabled: true,
    emailEnabled: false,
    autoAcknowledge: false,
    maxActiveNotifications: 20,
    defaultCooldown: 5 // minutes
  });
  
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [showEscalationDialog, setShowEscalationDialog] = useState(false);
  const [escalatingNotification, setEscalatingNotification] = useState<ActiveNotification | null>(null);
  
  const [activeTab, setActiveTab] = useState('notifications');
  const [filters, setFilters] = useState({
    category: '',
    priority: '',
    status: '',
    search: ''
  });

  // Audio context for notification sounds
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    loadNotificationRules();
    loadActiveMilestones();
    
    // Simulate real-time monitoring
    const interval = setInterval(checkNotificationRules, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadNotificationRules = () => {
    // Mock notification rules
    const mockRules: NotificationRule[] = [
      {
        id: '1',
        name: 'Low Engagement Alert',
        description: 'Alert when overall engagement falls below threshold',
        enabled: true,
        category: 'engagement',
        trigger: {
          type: 'threshold',
          metric: 'engagement_score',
          operator: 'lt',
          value: 40,
          timeWindow: 5,
          persistence: 2
        },
        conditions: [],
        actions: [
          { type: 'alert' },
          { type: 'popup' },
          { type: 'intervention', data: { type: 'engagement_prompt' } }
        ],
        escalation: {
          enabled: true,
          levels: [
            {
              level: 1,
              name: 'First Alert',
              actions: [{ type: 'alert' }],
              recipients: ['teacher'],
              requiresAcknowledgment: false,
              autoResolve: false
            },
            {
              level: 2,
              name: 'Supervisor Alert',
              actions: [{ type: 'email', target: 'supervisor@school.edu' }],
              recipients: ['supervisor'],
              requiresAcknowledgment: true,
              autoResolve: false
            }
          ],
          timeouts: [5, 15], // escalate after 5 minutes, then 15 minutes
          resetAfter: 30
        },
        cooldown: 5,
        priority: 'medium',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        name: 'Technical Issues Detection',
        description: 'Alert for connection problems or technical difficulties',
        enabled: true,
        category: 'technical',
        trigger: {
          type: 'threshold',
          metric: 'connection_issues',
          operator: 'gt',
          value: 2,
          timeWindow: 2
        },
        conditions: [],
        actions: [
          { type: 'alert' },
          { type: 'sound' },
          { type: 'log', data: { category: 'technical' } }
        ],
        cooldown: 3,
        priority: 'high',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        id: '3',
        name: 'Behavioral Concern',
        description: 'Alert for disruptive or inappropriate behavior',
        enabled: true,
        category: 'behavioral',
        trigger: {
          type: 'event',
          metric: 'moderation_flag',
          operator: 'gt',
          value: 0
        },
        conditions: [],
        actions: [
          { type: 'alert' },
          { type: 'popup' },
          { type: 'intervention', data: { type: 'behavior_warning' } }
        ],
        escalation: {
          enabled: true,
          levels: [
            {
              level: 1,
              name: 'Immediate Alert',
              actions: [{ type: 'alert' }],
              recipients: ['teacher'],
              requiresAcknowledgment: true,
              autoResolve: false
            }
          ],
          timeouts: [0], // immediate escalation
          resetAfter: 60
        },
        cooldown: 1,
        priority: 'critical',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        id: '4',
        name: 'Milestone Achievement',
        description: 'Celebrate when learning objectives are met',
        enabled: true,
        category: 'milestone',
        trigger: {
          type: 'threshold',
          metric: 'learning_objective_progress',
          operator: 'gte',
          value: 80
        },
        conditions: [],
        actions: [
          { type: 'popup', data: { celebration: true } },
          { type: 'log', data: { category: 'achievement' } }
        ],
        cooldown: 60,
        priority: 'low',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    setNotificationRules(mockRules);
  };

  const loadActiveMilestones = () => {
    const mockMilestones: SessionMilestone[] = [
      {
        id: '1',
        type: 'phase_complete',
        title: 'Opening Statements Complete',
        description: 'All participants completed their opening statements',
        achieved: true,
        achievedAt: new Date(Date.now() - 30 * 60 * 1000),
        celebrationLevel: 'standard'
      },
      {
        id: '2',
        type: 'participation_goal',
        title: '80% Participation Rate',
        description: 'Reached target participation level',
        achieved: false,
        targetValue: 80,
        currentValue: 67,
        celebrationLevel: 'celebration'
      },
      {
        id: '3',
        type: 'quality_threshold',
        title: 'High-Quality Discourse',
        description: 'Maintained argument quality above 85%',
        achieved: false,
        targetValue: 85,
        currentValue: 78,
        celebrationLevel: 'standard'
      }
    ];

    setSessionMilestones(mockMilestones);
  };

  const checkNotificationRules = () => {
    // Simulate checking rules against current session data
    const mockSessionData = {
      engagement_score: Math.random() * 100,
      participation_rate: Math.random() * 100,
      connection_issues: Math.floor(Math.random() * 5),
      moderation_flag: Math.random() > 0.95 ? 1 : 0,
      learning_objective_progress: Math.random() * 100
    };

    notificationRules.forEach(rule => {
      if (!rule.enabled) return;
      
      const shouldTrigger = evaluateRule(rule, mockSessionData);
      
      if (shouldTrigger && canTriggerRule(rule)) {
        triggerNotification(rule, mockSessionData);
      }
    });
  };

  const evaluateRule = (rule: NotificationRule, data: Record<string, number>): boolean => {
    const { trigger } = rule;
    const metricValue = data[trigger.metric];
    
    if (metricValue === undefined) return false;
    
    switch (trigger.operator) {
      case 'lt':
        return metricValue < trigger.value;
      case 'lte':
        return metricValue <= trigger.value;
      case 'gt':
        return metricValue > trigger.value;
      case 'gte':
        return metricValue >= trigger.value;
      case 'eq':
        return metricValue === trigger.value;
      case 'ne':
        return metricValue !== trigger.value;
      default:
        return false;
    }
  };

  const canTriggerRule = (rule: NotificationRule): boolean => {
    if (!rule.lastTriggered) return true;
    
    const cooldownMs = rule.cooldown * 60 * 1000;
    return Date.now() - rule.lastTriggered.getTime() > cooldownMs;
  };

  const triggerNotification = (rule: NotificationRule, data: Record<string, number>) => {
    const notification: ActiveNotification = {
      id: Date.now().toString(),
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      priority: rule.priority,
      title: rule.name,
      message: `${rule.description} (Value: ${data[rule.trigger.metric]}, Threshold: ${rule.trigger.value})`,
      timestamp: new Date(),
      sessionId: sessionId || 'current',
      metricValue: data[rule.trigger.metric],
      threshold: rule.trigger.value,
      acknowledged: false,
      resolved: false,
      escalationLevel: 0,
      actions: rule.actions,
      data: { originalData: data }
    };

    if (rule.escalation?.enabled && rule.escalation.timeouts.length > 0) {
      notification.nextEscalation = new Date(Date.now() + rule.escalation.timeouts[0] * 60 * 1000);
    }

    // Update rule last triggered time
    setNotificationRules(prev => prev.map(r => 
      r.id === rule.id ? { ...r, lastTriggered: new Date() } : r
    ));

    // Add to active notifications
    setActiveNotifications(prev => {
      const updated = [notification, ...prev];
      return updated.slice(0, globalSettings.maxActiveNotifications);
    });

    // Execute notification actions
    executeNotificationActions(notification);
    
    onNotificationTrigger?.(notification);
  };

  const executeNotificationActions = (notification: ActiveNotification) => {
    notification.actions.forEach(action => {
      switch (action.type) {
        case 'alert':
          addNotification({
            type: notification.priority === 'critical' ? 'error' : 
                  notification.priority === 'high' ? 'error' :
                  notification.priority === 'medium' ? 'warning' : 'info',
            title: notification.title,
            message: notification.message
          });
          break;
        
        case 'sound':
          if (globalSettings.soundEnabled) {
            playNotificationSound(notification.priority);
          }
          break;
        
        case 'popup':
          if (globalSettings.popupEnabled) {
            // Browser notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/icon-192x192.png'
              });
            }
          }
          break;
          
        case 'intervention':
          // Trigger automatic intervention
          console.log('Triggering intervention:', action.data);
          break;
          
        case 'log':
          console.log('Notification logged:', notification);
          break;
      }
    });
  };

  const playNotificationSound = (priority: string) => {
    // Create audio context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Different tones for different priorities
    const frequency = priority === 'critical' ? 800 : 
                     priority === 'high' ? 600 :
                     priority === 'medium' ? 400 : 300;

    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  };

  const acknowledgeNotification = (notificationId: string) => {
    setActiveNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, acknowledged: true }
        : notification
    ));
  };

  const resolveNotification = (notificationId: string) => {
    setActiveNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, resolved: true, acknowledged: true }
        : notification
    ));
  };

  const dismissNotification = (notificationId: string) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleEscalation = (notification: ActiveNotification) => {
    const rule = notificationRules.find(r => r.id === notification.ruleId);
    if (!rule?.escalation?.enabled) return;

    const nextLevel = notification.escalationLevel + 1;
    if (nextLevel >= rule.escalation.levels.length) return;

    const escalationLevel = rule.escalation.levels[nextLevel];
    
    setActiveNotifications(prev => prev.map(n => 
      n.id === notification.id 
        ? {
            ...n,
            escalationLevel: nextLevel,
            nextEscalation: nextLevel < rule.escalation!.timeouts.length - 1 
              ? new Date(Date.now() + rule.escalation!.timeouts[nextLevel + 1] * 60 * 1000)
              : undefined
          }
        : n
    ));

    // Execute escalation actions
    escalationLevel.actions.forEach(action => {
      executeNotificationActions({
        ...notification,
        actions: [action],
        title: `ESCALATED: ${notification.title}`,
        message: `${notification.message} (Escalation Level: ${nextLevel + 1})`
      });
    });

    onEscalationTrigger?.(notification, nextLevel);
  };

  const toggleRule = (ruleId: string) => {
    setNotificationRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'engagement':
        return <TrendingDown className="h-4 w-4" />;
      case 'technical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'behavioral':
        return <Shield className="h-4 w-4" />;
      case 'performance':
        return <Target className="h-4 w-4" />;
      case 'milestone':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const filteredNotifications = activeNotifications.filter(notification => {
    if (filters.category && notification.category !== filters.category) return false;
    if (filters.priority && notification.priority !== filters.priority) return false;
    if (filters.status === 'acknowledged' && !notification.acknowledged) return false;
    if (filters.status === 'unacknowledged' && notification.acknowledged) return false;
    if (filters.status === 'resolved' && !notification.resolved) return false;
    if (filters.search && 
        !notification.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !notification.message.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const activeCount = activeNotifications.filter(n => !n.resolved).length;
  const criticalCount = activeNotifications.filter(n => n.priority === 'critical' && !n.resolved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <BellRing className="h-5 w-5 mr-2" />
            Monitoring & Notifications
          </h3>
          <p className="text-sm text-muted-foreground">
            Automated alerts, escalation procedures, and session milestones
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            <Badge variant={globalSettings.enabled ? "default" : "secondary"} className="flex items-center">
              {globalSettings.enabled ? <Bell className="h-3 w-3 mr-1" /> : <BellOff className="h-3 w-3 mr-1" />}
              {globalSettings.enabled ? 'Active' : 'Disabled'}
            </Badge>
            {activeCount > 0 && (
              <Badge variant="outline">
                {activeCount} Active
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge variant="destructive">
                {criticalCount} Critical
              </Badge>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Switch
              checked={globalSettings.enabled}
              onCheckedChange={(enabled) => setGlobalSettings(prev => ({ ...prev, enabled }))}
            />
            <Button variant="outline" size="sm" onClick={() => setShowRuleEditor(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalCount} critical alert{criticalCount !== 1 ? 's' : ''}</strong> requiring immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications">
            Active Alerts ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="rules">
            Notification Rules ({notificationRules.length})
          </TabsTrigger>
          <TabsTrigger value="milestones">
            Milestones ({sessionMilestones.filter(m => m.achieved).length}/{sessionMilestones.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notifications..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Notifications */}
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Active Notifications</h3>
                    <p className="text-muted-foreground">
                      {activeNotifications.length === 0 
                        ? "All systems are running smoothly"
                        : "No notifications match your current filters"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card key={notification.id} className={`border-l-4 ${
                  notification.priority === 'critical' ? 'border-l-red-500' :
                  notification.priority === 'high' ? 'border-l-orange-500' :
                  notification.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <Badge variant="outline" className="flex items-center">
                            {getCategoryIcon(notification.category)}
                            <span className="ml-1 capitalize">{notification.category}</span>
                          </Badge>
                          {notification.acknowledged && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Acknowledged
                            </Badge>
                          )}
                          {notification.resolved && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                          {notification.escalationLevel > 0 && (
                            <Badge variant="destructive">
                              Escalated (L{notification.escalationLevel + 1})
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {notification.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {!notification.acknowledged && (
                          <Button
                            size="sm"
                            onClick={() => acknowledgeNotification(notification.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Acknowledge
                          </Button>
                        )}
                        {notification.acknowledged && !notification.resolved && (
                          <Button
                            size="sm"
                            onClick={() => resolveNotification(notification.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Resolve
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dismissNotification(notification.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{notification.message}</p>
                    
                    {(notification.metricValue !== undefined && notification.threshold !== undefined) && (
                      <div className="mt-3 text-sm">
                        <div className="flex justify-between">
                          <span>Current Value:</span>
                          <span className="font-medium">{Math.round(notification.metricValue * 100) / 100}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Threshold:</span>
                          <span className="font-medium">{notification.threshold}</span>
                        </div>
                      </div>
                    )}

                    {notification.nextEscalation && (
                      <div className="mt-3">
                        <div className="flex items-center text-sm text-orange-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>
                            Next escalation: {notification.nextEscalation.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          {/* Notification Rules */}
          <div className="space-y-4">
            {notificationRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRule(rule.id)}
                        />
                        <Badge className={getPriorityColor(rule.priority)}>
                          {rule.priority}
                        </Badge>
                        <Badge variant="outline" className="flex items-center">
                          {getCategoryIcon(rule.category)}
                          <span className="ml-1 capitalize">{rule.category}</span>
                        </Badge>
                        {rule.lastTriggered && (
                          <Badge variant="secondary" className="text-xs">
                            Last: {rule.lastTriggered.toLocaleTimeString()}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium">{rule.name}</h4>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule);
                          setShowRuleEditor(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Trigger:</span>
                      <span>
                        {rule.trigger.metric} {rule.trigger.operator} {rule.trigger.value}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cooldown:</span>
                      <span>{rule.cooldown} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actions:</span>
                      <span>{rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}</span>
                    </div>
                    {rule.escalation?.enabled && (
                      <div className="flex justify-between">
                        <span>Escalation:</span>
                        <span>{rule.escalation.levels.length} level{rule.escalation.levels.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          {/* Session Milestones */}
          <div className="grid gap-4 md:grid-cols-2">
            {sessionMilestones.map((milestone) => (
              <Card key={milestone.id} className={`${
                milestone.achieved ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {milestone.achieved ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                        <Badge variant="outline" className="capitalize">
                          {milestone.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <h4 className="font-medium">{milestone.title}</h4>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!milestone.achieved && milestone.targetValue && milestone.currentValue && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{milestone.currentValue}/{milestone.targetValue}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (milestone.currentValue / milestone.targetValue) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {milestone.achieved && milestone.achievedAt && (
                    <div className="text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4 inline mr-2" />
                      Achieved: {milestone.achievedAt.toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Global Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Global Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Sound Notifications</div>
                    <div className="text-sm text-muted-foreground">Play sounds for alerts</div>
                  </div>
                  <Switch
                    checked={globalSettings.soundEnabled}
                    onCheckedChange={(enabled) => setGlobalSettings(prev => ({ ...prev, soundEnabled: enabled }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Popup Notifications</div>
                    <div className="text-sm text-muted-foreground">Show browser notifications</div>
                  </div>
                  <Switch
                    checked={globalSettings.popupEnabled}
                    onCheckedChange={(enabled) => setGlobalSettings(prev => ({ ...prev, popupEnabled: enabled }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-muted-foreground">Send email alerts</div>
                  </div>
                  <Switch
                    checked={globalSettings.emailEnabled}
                    onCheckedChange={(enabled) => setGlobalSettings(prev => ({ ...prev, emailEnabled: enabled }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto Acknowledge</div>
                    <div className="text-sm text-muted-foreground">Auto-acknowledge low priority alerts</div>
                  </div>
                  <Switch
                    checked={globalSettings.autoAcknowledge}
                    onCheckedChange={(enabled) => setGlobalSettings(prev => ({ ...prev, autoAcknowledge: enabled }))}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Max Active Notifications</label>
                  <div className="mt-2">
                    <Slider
                      value={[globalSettings.maxActiveNotifications]}
                      onValueChange={([value]) => setGlobalSettings(prev => ({ ...prev, maxActiveNotifications: value }))}
                      max={50}
                      min={5}
                      step={5}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>5</span>
                      <span>{globalSettings.maxActiveNotifications}</span>
                      <span>50</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Default Cooldown (minutes)</label>
                  <div className="mt-2">
                    <Slider
                      value={[globalSettings.defaultCooldown]}
                      onValueChange={([value]) => setGlobalSettings(prev => ({ ...prev, defaultCooldown: value }))}
                      max={60}
                      min={1}
                      step={1}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>1 min</span>
                      <span>{globalSettings.defaultCooldown} min</span>
                      <span>60 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rule Editor Dialog */}
      <Dialog open={showRuleEditor} onOpenChange={setShowRuleEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Notification Rule' : 'Create Notification Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure automated alerts and escalation procedures
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Rule Configuration</h3>
            <p className="text-muted-foreground">
              Advanced rule editor interface will be implemented here for creating and modifying notification rules with triggers, conditions, and escalation procedures.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRuleEditor(false);
              setEditingRule(null);
            }}>
              Cancel
            </Button>
            <Button>
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
