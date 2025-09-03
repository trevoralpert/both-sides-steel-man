/**
 * Moderation Override System Component
 * 
 * Task 8.4.2: Manual moderation controls that override AI decisions,
 * content flagging and removal with explanation tools, and participant warnings
 */

'use client';

import React, { useState, useEffect } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
  Shield,
  Flag,
  Ban,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Zap,
  Brain,
  Target,
  Settings,
  Bell,
  BellOff,
  RefreshCw,
  Download,
  Upload,
  FileText,
  Search,
  Filter,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  Info,
  Warning,
  Slash,
  RotateCcw,
  PlayCircle,
  PauseCircle,
  StopCircle,
  FastForward,
  Rewind,
  SkipForward,
  Archive,
  BookOpen,
  Bookmark,
  Star,
  Heart,
  MessageCircle,
  Send,
  Reply,
  Forward,
  Share2
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface ModerationDecision {
  id: string;
  timestamp: Date;
  type: 'ai_flagged' | 'manual_review' | 'participant_report' | 'teacher_flag';
  contentType: 'message' | 'voice' | 'behavior' | 'participation_pattern';
  contentId: string;
  content: {
    text?: string;
    metadata?: Record<string, any>;
    context?: string;
  };
  participantId: string;
  participantName: string;
  flagReason: string;
  aiConfidence?: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  aiRecommendation: ModerationAction;
  status: 'pending_review' | 'approved' | 'overridden' | 'escalated' | 'dismissed';
  teacherDecision?: {
    action: ModerationAction;
    reason: string;
    timestamp: Date;
    teacherId: string;
  };
  appeals?: ContentAppeal[];
}

interface ModerationAction {
  type: 'no_action' | 'warning' | 'content_removal' | 'temporary_mute' | 'session_timeout' | 'permanent_removal';
  duration?: number; // minutes for temporary actions
  explanation: string;
  publicVisible: boolean;
  notifyParticipant: boolean;
  logLevel: 'info' | 'warning' | 'violation' | 'serious_violation';
}

interface ContentAppeal {
  id: string;
  timestamp: Date;
  participantId: string;
  reason: string;
  evidence?: string;
  status: 'pending' | 'approved' | 'denied';
  reviewedBy?: string;
  reviewTimestamp?: Date;
  reviewNotes?: string;
}

interface ModerationRule {
  id: string;
  name: string;
  description: string;
  category: 'language' | 'behavior' | 'content' | 'participation' | 'technical';
  enabled: boolean;
  aiEnabled: boolean; // Allow AI to auto-moderate
  requiresTeacherReview: boolean;
  keywords?: string[];
  patterns?: string[];
  thresholds?: {
    frequency?: number; // occurrences per time period
    timeWindow?: number; // minutes
    severity?: number; // 0-100
  };
  actions: {
    firstViolation: ModerationAction;
    secondViolation: ModerationAction;
    repeatedViolations: ModerationAction;
  };
  customInstructions?: string;
}

interface ParticipantModerationStatus {
  participantId: string;
  participantName: string;
  currentRestrictions: ActiveRestriction[];
  violationHistory: ModerationDecision[];
  warningCount: number;
  lastViolation?: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trustScore: number; // 0-100, decreases with violations
  appealsPending: number;
}

interface ActiveRestriction {
  id: string;
  type: 'muted' | 'chat_disabled' | 'view_only' | 'timeout' | 'supervised';
  reason: string;
  startTime: Date;
  duration?: number; // minutes, undefined for permanent
  endTime?: Date;
  appealDeadline?: Date;
  canAppeal: boolean;
  autoExpiry: boolean;
}

interface ModerationOverrideSystemProps {
  sessionId: string;
  participants: any[];
  onModerationAction?: (decision: ModerationDecision, action: ModerationAction) => void;
  onRuleUpdate?: (rule: ModerationRule) => void;
  onContentAction?: (contentId: string, action: string, reason: string) => void;
  realTimeModeration?: boolean;
}

export function ModerationOverrideSystem({
  sessionId,
  participants = [],
  onModerationAction,
  onRuleUpdate,
  onContentAction,
  realTimeModeration = true
}: ModerationOverrideSystemProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('pending');
  
  // Moderation states
  const [pendingDecisions, setPendingDecisions] = useState<ModerationDecision[]>([]);
  const [moderationRules, setModerationRules] = useState<ModerationRule[]>([]);
  const [participantStatuses, setParticipantStatuses] = useState<ParticipantModerationStatus[]>([]);
  const [contentHistory, setContentHistory] = useState<ModerationDecision[]>([]);
  
  // Filter and search
  const [filters, setFilters] = useState({
    severity: '',
    type: '',
    status: '',
    participant: '',
    search: ''
  });
  
  // Action states
  const [selectedDecision, setSelectedDecision] = useState<ModerationDecision | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [customAction, setCustomAction] = useState<ModerationAction | null>(null);
  const [bulkActionIds, setBulkActionIds] = useState<string[]>([]);
  
  // Settings
  const [aiModerationEnabled, setAiModerationEnabled] = useState(true);
  const [autoApprovalThreshold, setAutoApprovalThreshold] = useState(95); // AI confidence threshold
  const [strictMode, setStrictMode] = useState(false);
  
  // Dialogs
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [showAppealDialog, setShowAppealDialog] = useState(false);

  useEffect(() => {
    loadModerationData();
    
    if (realTimeModeration) {
      const interval = setInterval(checkForNewModerationItems, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [realTimeModeration]);

  const loadModerationData = () => {
    // Mock pending moderation decisions
    const decisions: ModerationDecision[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        type: 'ai_flagged',
        contentType: 'message',
        contentId: 'msg_123',
        content: {
          text: 'Your argument is completely ridiculous and shows how ignorant you are about this topic.',
          context: 'Response to climate change discussion'
        },
        participantId: 'p1',
        participantName: 'Alex Thompson',
        flagReason: 'Personal attack and disrespectful language',
        aiConfidence: 92,
        severity: 'high',
        aiRecommendation: {
          type: 'warning',
          explanation: 'Message contains personal attack. First warning appropriate.',
          publicVisible: false,
          notifyParticipant: true,
          logLevel: 'violation'
        },
        status: 'pending_review'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        type: 'ai_flagged',
        contentType: 'message',
        contentId: 'msg_124',
        content: {
          text: 'I disagree with your perspective, but I can see why you might think that way given your background.',
          context: 'Immigration policy debate'
        },
        participantId: 'p2',
        participantName: 'Sarah Johnson',
        flagReason: 'Potential bias-related comment',
        aiConfidence: 67,
        severity: 'low',
        aiRecommendation: {
          type: 'no_action',
          explanation: 'Low confidence flag. Message appears to be respectful disagreement.',
          publicVisible: false,
          notifyParticipant: false,
          logLevel: 'info'
        },
        status: 'pending_review'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
        type: 'participant_report',
        contentType: 'behavior',
        contentId: 'behavior_001',
        content: {
          metadata: { interruptions: 5, speakingTime: 180000 },
          context: 'Participant repeatedly interrupting others during debate'
        },
        participantId: 'p3',
        participantName: 'Michael Chen',
        flagReason: 'Excessive interruptions and dominating conversation',
        severity: 'medium',
        aiRecommendation: {
          type: 'temporary_mute',
          duration: 5,
          explanation: 'Pattern of disruptive behavior. Brief mute to reset participation dynamics.',
          publicVisible: true,
          notifyParticipant: true,
          logLevel: 'warning'
        },
        status: 'pending_review'
      }
    ];

    setPendingDecisions(decisions);

    // Mock moderation rules
    const rules: ModerationRule[] = [
      {
        id: '1',
        name: 'Personal Attacks',
        description: 'Detect and prevent personal attacks or ad hominem arguments',
        category: 'language',
        enabled: true,
        aiEnabled: true,
        requiresTeacherReview: true,
        keywords: ['stupid', 'ignorant', 'ridiculous', 'pathetic'],
        patterns: ['you are .*(stupid|dumb|ignorant)', 'that\'s (ridiculous|absurd|idiotic)'],
        thresholds: {
          frequency: 1, // One occurrence triggers review
          severity: 70
        },
        actions: {
          firstViolation: {
            type: 'warning',
            explanation: 'Please focus on addressing the argument, not the person making it.',
            publicVisible: false,
            notifyParticipant: true,
            logLevel: 'warning'
          },
          secondViolation: {
            type: 'temporary_mute',
            duration: 5,
            explanation: 'Continued personal attacks. 5-minute reflection period.',
            publicVisible: true,
            notifyParticipant: true,
            logLevel: 'violation'
          },
          repeatedViolations: {
            type: 'session_timeout',
            duration: 15,
            explanation: 'Multiple violations of respectful discourse policy.',
            publicVisible: true,
            notifyParticipant: true,
            logLevel: 'serious_violation'
          }
        }
      },
      {
        id: '2',
        name: 'Off-Topic Content',
        description: 'Identify content that strays significantly from the debate topic',
        category: 'content',
        enabled: true,
        aiEnabled: false, // Teacher review only
        requiresTeacherReview: true,
        actions: {
          firstViolation: {
            type: 'no_action',
            explanation: 'Gentle reminder to stay on topic sent privately.',
            publicVisible: false,
            notifyParticipant: false,
            logLevel: 'info'
          },
          secondViolation: {
            type: 'warning',
            explanation: 'Please focus on the current debate topic.',
            publicVisible: false,
            notifyParticipant: true,
            logLevel: 'warning'
          },
          repeatedViolations: {
            type: 'temporary_mute',
            duration: 3,
            explanation: 'Repeated off-topic comments. Brief pause to refocus.',
            publicVisible: false,
            notifyParticipant: true,
            logLevel: 'violation'
          }
        }
      },
      {
        id: '3',
        name: 'Excessive Participation',
        description: 'Monitor for participants dominating the conversation',
        category: 'participation',
        enabled: true,
        aiEnabled: true,
        requiresTeacherReview: false,
        thresholds: {
          frequency: 10, // 10+ messages in time window
          timeWindow: 5, // 5 minutes
          severity: 80
        },
        actions: {
          firstViolation: {
            type: 'no_action',
            explanation: 'Private encouragement to let others participate sent.',
            publicVisible: false,
            notifyParticipant: false,
            logLevel: 'info'
          },
          secondViolation: {
            type: 'temporary_mute',
            duration: 2,
            explanation: 'Please give others a chance to contribute to the discussion.',
            publicVisible: false,
            notifyParticipant: true,
            logLevel: 'warning'
          },
          repeatedViolations: {
            type: 'temporary_mute',
            duration: 5,
            explanation: 'Extended pause to ensure balanced participation.',
            publicVisible: true,
            notifyParticipant: true,
            logLevel: 'violation'
          }
        }
      }
    ];

    setModerationRules(rules);

    // Mock participant moderation statuses
    const statuses: ParticipantModerationStatus[] = participants.map(p => ({
      participantId: p.id,
      participantName: p.name,
      currentRestrictions: [],
      violationHistory: [],
      warningCount: 0,
      riskLevel: 'low',
      trustScore: 100,
      appealsPending: 0
    }));

    setParticipantStatuses(statuses);
  };

  const checkForNewModerationItems = () => {
    // Simulate new moderation items arriving
    if (Math.random() > 0.95) { // 5% chance each check
      const newDecision: ModerationDecision = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'ai_flagged',
        contentType: 'message',
        contentId: `msg_${Date.now()}`,
        content: {
          text: 'Simulated new content that needs review...',
          context: 'Ongoing debate discussion'
        },
        participantId: participants[Math.floor(Math.random() * participants.length)]?.id || 'p1',
        participantName: participants[Math.floor(Math.random() * participants.length)]?.name || 'Participant',
        flagReason: 'AI detected potential concern',
        aiConfidence: Math.floor(Math.random() * 40) + 60, // 60-100%
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
        aiRecommendation: {
          type: 'warning',
          explanation: 'AI recommended action based on content analysis.',
          publicVisible: false,
          notifyParticipant: true,
          logLevel: 'warning'
        },
        status: 'pending_review'
      };

      setPendingDecisions(prev => [newDecision, ...prev]);
      
      addNotification({
        type: 'warning',
        title: 'New Moderation Alert',
        message: `Content from ${newDecision.participantName} flagged for review`
      });
    }
  };

  const handleModerationDecision = async (
    decision: ModerationDecision, 
    action: 'approve' | 'override' | 'escalate' | 'dismiss',
    customAction?: ModerationAction,
    reason?: string
  ) => {
    const updatedDecision = {
      ...decision,
      status: action === 'approve' ? 'approved' : 
              action === 'override' ? 'overridden' :
              action === 'escalate' ? 'escalated' : 'dismissed',
      teacherDecision: {
        action: action === 'approve' ? decision.aiRecommendation : 
                customAction || decision.aiRecommendation,
        reason: reason || `Teacher ${action} AI recommendation`,
        timestamp: new Date(),
        teacherId: user?.id || 'teacher'
      }
    } as ModerationDecision;

    // Update pending decisions
    setPendingDecisions(prev => prev.filter(d => d.id !== decision.id));
    
    // Add to history
    setContentHistory(prev => [updatedDecision, ...prev]);

    // Execute the moderation action
    const finalAction = action === 'approve' ? decision.aiRecommendation : customAction || decision.aiRecommendation;
    await executeModerationAction(decision, finalAction);

    // Callback
    onModerationAction?.(updatedDecision, finalAction);

    addNotification({
      type: 'success',
      title: 'Moderation Decision Applied',
      message: `${action.charAt(0).toUpperCase() + action.slice(1)} action for ${decision.participantName}`
    });

    setShowOverrideDialog(false);
    setSelectedDecision(null);
    setOverrideReason('');
    setCustomAction(null);
  };

  const executeModerationAction = async (decision: ModerationDecision, action: ModerationAction) => {
    switch (action.type) {
      case 'warning':
        // Send warning to participant
        break;
      case 'content_removal':
        onContentAction?.(decision.contentId, 'remove', action.explanation);
        break;
      case 'temporary_mute':
        // Apply temporary mute
        addRestriction(decision.participantId, {
          id: Date.now().toString(),
          type: 'muted',
          reason: action.explanation,
          startTime: new Date(),
          duration: action.duration,
          endTime: action.duration ? new Date(Date.now() + action.duration * 60 * 1000) : undefined,
          canAppeal: true,
          appealDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          autoExpiry: true
        });
        break;
      case 'session_timeout':
        // Remove from session temporarily
        break;
      case 'permanent_removal':
        // Remove from session permanently
        break;
    }
  };

  const addRestriction = (participantId: string, restriction: ActiveRestriction) => {
    setParticipantStatuses(prev => prev.map(status =>
      status.participantId === participantId
        ? {
            ...status,
            currentRestrictions: [...status.currentRestrictions, restriction],
            trustScore: Math.max(0, status.trustScore - 10)
          }
        : status
    ));
  };

  const handleBulkAction = async (action: string, reason: string) => {
    const affectedDecisions = pendingDecisions.filter(d => bulkActionIds.includes(d.id));
    
    for (const decision of affectedDecisions) {
      await handleModerationDecision(decision, action as any, undefined, reason);
    }

    setBulkActionIds([]);
    setShowBulkActionDialog(false);
    
    addNotification({
      type: 'success',
      title: 'Bulk Action Applied',
      message: `${action} applied to ${affectedDecisions.length} items`
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'overridden': return 'bg-blue-100 text-blue-800';
      case 'escalated': return 'bg-purple-100 text-purple-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'content_removal': return <Trash2 className="h-4 w-4" />;
      case 'temporary_mute': return <MicOff className="h-4 w-4" />;
      case 'session_timeout': return <Clock className="h-4 w-4" />;
      case 'permanent_removal': return <Ban className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const filteredDecisions = pendingDecisions.filter(decision => {
    if (filters.severity && decision.severity !== filters.severity) return false;
    if (filters.type && decision.type !== filters.type) return false;
    if (filters.participant && decision.participantId !== filters.participant) return false;
    if (filters.search && 
        !decision.content.text?.toLowerCase().includes(filters.search.toLowerCase()) &&
        !decision.flagReason.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const criticalCount = pendingDecisions.filter(d => d.severity === 'critical').length;
  const highCount = pendingDecisions.filter(d => d.severity === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Moderation Override System
          </h3>
          <p className="text-sm text-muted-foreground">
            Manual review and override of AI moderation decisions
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            <Badge variant={aiModerationEnabled ? "default" : "secondary"}>
              {aiModerationEnabled ? 'AI Enabled' : 'Manual Only'}
            </Badge>
            <Badge variant="outline">
              {pendingDecisions.length} Pending Review
            </Badge>
            {(criticalCount > 0 || highCount > 0) && (
              <Badge variant="destructive">
                {criticalCount + highCount} High Priority
              </Badge>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Switch
              checked={aiModerationEnabled}
              onCheckedChange={setAiModerationEnabled}
              id="ai-moderation"
            />
            <label htmlFor="ai-moderation" className="text-sm font-medium">
              AI Moderation
            </label>
            <Button variant="outline" size="sm" onClick={() => setShowRuleEditor(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Rules
            </Button>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {(criticalCount > 0 || highCount > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalCount + highCount} high priority moderation items</strong> require immediate attention.
            {criticalCount > 0 && ` ${criticalCount} critical issues detected.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={filters.severity} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="ai_flagged">AI Flagged</SelectItem>
                  <SelectItem value="participant_report">Participant Report</SelectItem>
                  <SelectItem value="teacher_flag">Teacher Flag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Participant</label>
              <Select value={filters.participant} onValueChange={(value) => setFilters(prev => ({ ...prev, participant: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All participants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All participants</SelectItem>
                  {participants.map((participant) => (
                    <SelectItem key={participant.id} value={participant.id}>
                      {participant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant={bulkActionIds.length > 0 ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => setShowBulkActionDialog(true)}
                disabled={bulkActionIds.length === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Bulk Actions ({bulkActionIds.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            Pending Review ({filteredDecisions.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({contentHistory.length})
          </TabsTrigger>
          <TabsTrigger value="participants">
            Participant Status ({participantStatuses.length})
          </TabsTrigger>
          <TabsTrigger value="rules">
            Moderation Rules ({moderationRules.filter(r => r.enabled).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Pending Moderation Decisions */}
          <div className="space-y-4">
            {filteredDecisions.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Pending Reviews</h3>
                    <p className="text-muted-foreground">
                      {pendingDecisions.length === 0 
                        ? "All moderation items have been reviewed"
                        : "No items match your current filters"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredDecisions.map((decision) => (
                <Card key={decision.id} className={`border-l-4 ${
                  decision.severity === 'critical' ? 'border-l-red-500' :
                  decision.severity === 'high' ? 'border-l-orange-500' :
                  decision.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={bulkActionIds.includes(decision.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setBulkActionIds(prev => [...prev, decision.id]);
                              } else {
                                setBulkActionIds(prev => prev.filter(id => id !== decision.id));
                              }
                            }}
                          />
                          <Badge className={getSeverityColor(decision.severity)} variant="outline">
                            {decision.severity}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {decision.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary" className="capitalize">
                            {decision.contentType.replace('_', ' ')}
                          </Badge>
                          {decision.aiConfidence && (
                            <Badge variant="outline">
                              AI: {decision.aiConfidence}%
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{decision.participantName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {decision.timestamp.toLocaleString()} • {decision.flagReason}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {Math.round((Date.now() - decision.timestamp.getTime()) / 60000)}min ago
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Content Display */}
                    {decision.content.text && (
                      <div className="p-3 bg-gray-50 rounded border-l-4 border-l-gray-300">
                        <div className="text-sm font-medium mb-1">Flagged Content:</div>
                        <div className="text-sm">{decision.content.text}</div>
                        {decision.content.context && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Context: {decision.content.context}
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI Recommendation */}
                    <div className="p-3 bg-blue-50 rounded border-l-4 border-l-blue-300">
                      <div className="text-sm font-medium mb-1 flex items-center">
                        <Brain className="h-4 w-4 mr-2" />
                        AI Recommendation:
                      </div>
                      <div className="flex items-center space-x-2 mb-1">
                        {getActionTypeIcon(decision.aiRecommendation.type)}
                        <span className="text-sm font-medium capitalize">
                          {decision.aiRecommendation.type.replace('_', ' ')}
                        </span>
                        {decision.aiRecommendation.duration && (
                          <Badge variant="outline" className="text-xs">
                            {decision.aiRecommendation.duration}min
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm">{decision.aiRecommendation.explanation}</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        ID: {decision.id} • Content: {decision.contentId}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModerationDecision(decision, 'dismiss', undefined, 'No action needed')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDecision(decision);
                            setCustomAction(decision.aiRecommendation);
                            setShowOverrideDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Override
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleModerationDecision(decision, 'approve', undefined, 'AI recommendation approved')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve AI
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Moderation History */}
          <div className="space-y-4">
            {contentHistory.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No History Yet</h3>
                    <p className="text-muted-foreground">
                      Completed moderation decisions will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              contentHistory.map((decision) => (
                <Card key={decision.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(decision.status)} variant="outline">
                            {decision.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getSeverityColor(decision.severity)} variant="outline">
                            {decision.severity}
                          </Badge>
                          <span className="font-medium">{decision.participantName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{decision.flagReason}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {decision.teacherDecision?.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {decision.teacherDecision && (
                      <div className="p-3 bg-green-50 rounded">
                        <div className="text-sm font-medium mb-1">Teacher Decision:</div>
                        <div className="flex items-center space-x-2 mb-1">
                          {getActionTypeIcon(decision.teacherDecision.action.type)}
                          <span className="text-sm capitalize">
                            {decision.teacherDecision.action.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm">{decision.teacherDecision.reason}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          {/* Participant Moderation Status */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {participantStatuses.map((status) => (
              <Card key={status.participantId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{status.participantName}</h4>
                    <Badge variant={
                      status.riskLevel === 'critical' ? 'destructive' :
                      status.riskLevel === 'high' ? 'secondary' : 'outline'
                    }>
                      {status.riskLevel} risk
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Trust Score</div>
                      <div className="flex items-center space-x-2">
                        <Progress value={status.trustScore} className="flex-1" />
                        <span>{status.trustScore}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Warnings</div>
                      <div>{status.warningCount}</div>
                    </div>
                  </div>

                  {status.currentRestrictions.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Active Restrictions:</div>
                      {status.currentRestrictions.map((restriction) => (
                        <Badge key={restriction.id} variant="destructive" className="text-xs">
                          {restriction.type} 
                          {restriction.duration && ` (${restriction.duration}min)`}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {status.appealsPending > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {status.appealsPending} appeal{status.appealsPending !== 1 ? 's' : ''} pending review
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          {/* Moderation Rules */}
          <div className="space-y-4">
            {moderationRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(enabled) => {
                            const updatedRule = { ...rule, enabled };
                            setModerationRules(prev => prev.map(r => r.id === rule.id ? updatedRule : r));
                            onRuleUpdate?.(updatedRule);
                          }}
                        />
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge variant="outline" className="capitalize">
                          {rule.category}
                        </Badge>
                        {rule.aiEnabled && <Badge variant="secondary">AI Enabled</Badge>}
                        {rule.requiresTeacherReview && <Badge variant="outline">Teacher Review</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 text-sm">
                    <div>
                      <div className="font-medium mb-1">First Violation:</div>
                      <div className="flex items-center space-x-1">
                        {getActionTypeIcon(rule.actions.firstViolation.type)}
                        <span className="capitalize">{rule.actions.firstViolation.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Second Violation:</div>
                      <div className="flex items-center space-x-1">
                        {getActionTypeIcon(rule.actions.secondViolation.type)}
                        <span className="capitalize">{rule.actions.secondViolation.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Repeated Violations:</div>
                      <div className="flex items-center space-x-1">
                        {getActionTypeIcon(rule.actions.repeatedViolations.type)}
                        <span className="capitalize">{rule.actions.repeatedViolations.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Override AI Moderation Decision</DialogTitle>
            <DialogDescription>
              {selectedDecision && `Review and modify the action for ${selectedDecision.participantName}`}
            </DialogDescription>
          </DialogHeader>
          {selectedDecision && customAction && (
            <div className="space-y-4 py-4">
              <div className="p-4 border rounded bg-gray-50">
                <h4 className="font-medium mb-2">Original Content:</h4>
                <p className="text-sm">{selectedDecision.content.text || 'No text content'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reason: {selectedDecision.flagReason}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Action Type</label>
                  <Select 
                    value={customAction.type} 
                    onValueChange={(value: any) => setCustomAction(prev => ({ ...prev!, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_action">No Action</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="content_removal">Remove Content</SelectItem>
                      <SelectItem value="temporary_mute">Temporary Mute</SelectItem>
                      <SelectItem value="session_timeout">Session Timeout</SelectItem>
                      <SelectItem value="permanent_removal">Permanent Removal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(customAction.type === 'temporary_mute' || customAction.type === 'session_timeout') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration (minutes)</label>
                    <Input
                      type="number"
                      value={customAction.duration || 5}
                      onChange={(e) => setCustomAction(prev => ({ 
                        ...prev!, 
                        duration: parseInt(e.target.value) || 5 
                      }))}
                      min="1"
                      max="60"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Explanation to Participant</label>
                  <Textarea
                    value={customAction.explanation}
                    onChange={(e) => setCustomAction(prev => ({ 
                      ...prev!, 
                      explanation: e.target.value 
                    }))}
                    rows={3}
                    placeholder="Explain the reason for this action..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Override Reason (Internal)</label>
                  <Textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    rows={2}
                    placeholder="Why are you overriding the AI recommendation?"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify-participant"
                      checked={customAction.notifyParticipant}
                      onCheckedChange={(checked) => setCustomAction(prev => ({ 
                        ...prev!, 
                        notifyParticipant: !!checked 
                      }))}
                    />
                    <label htmlFor="notify-participant" className="text-sm">
                      Notify participant
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="public-visible"
                      checked={customAction.publicVisible}
                      onCheckedChange={(checked) => setCustomAction(prev => ({ 
                        ...prev!, 
                        publicVisible: !!checked 
                      }))}
                    />
                    <label htmlFor="public-visible" className="text-sm">
                      Publicly visible
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowOverrideDialog(false);
              setSelectedDecision(null);
              setOverrideReason('');
              setCustomAction(null);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedDecision && customAction) {
                handleModerationDecision(selectedDecision, 'override', customAction, overrideReason);
              }
            }}>
              <Shield className="h-4 w-4 mr-2" />
              Apply Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <AlertDialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Moderation Action</AlertDialogTitle>
            <AlertDialogDescription>
              Apply the same action to {bulkActionIds.length} selected moderation items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <Select onValueChange={(value) => console.log('Selected:', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">Approve All</SelectItem>
                <SelectItem value="dismiss">Dismiss All</SelectItem>
                <SelectItem value="escalate">Escalate All</SelectItem>
              </SelectContent>
            </Select>
            <Textarea 
              placeholder="Reason for bulk action..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkActionIds([])}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBulkAction('approve', 'Bulk approval')}>
              Apply to {bulkActionIds.length} Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
