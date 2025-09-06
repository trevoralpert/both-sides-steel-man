/**
 * Intervention Control Panel Component
 * 
 * Task 8.4.2: Intervention management system with escalating response options,
 * private messaging capabilities, and session pause/redirect tools
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Shield,
  MessageSquare,
  Send,
  Pause,
  Play,
  AlertTriangle,
  Ban,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  Clock,
  RotateCcw,
  Zap,
  Target,
  Users,
  User,
  Settings,
  Bell,
  Flag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  AlertTriangle as Warning,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Heart,
  MessageCircle,
  PhoneCall,
  Mail,
  Calendar,
  FileText,
  Download,
  Upload,
  Share2,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  Minimize2,
  RefreshCw
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
interface SessionParticipant {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  email?: string;
  role: 'debater_pro' | 'debater_con' | 'observer' | 'moderator';
  status: 'online' | 'offline' | 'idle' | 'muted' | 'restricted' | 'removed';
  engagement: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    lastActivity: Date;
    concernLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };
  interventions: InterventionRecord[];
  restrictions: ParticipantRestriction[];
  messageHistory: PrivateMessage[];
}

interface InterventionRecord {
  id: string;
  type: InterventionType;
  timestamp: Date;
  reason: string;
  action: string;
  severity: 'info' | 'warning' | 'restriction' | 'removal';
  duration?: number; // minutes
  effectiveness?: 'effective' | 'partial' | 'ineffective' | 'pending';
  followUpRequired: boolean;
  performedBy: string;
  notes?: string;
  escalationLevel: number;
}

interface ParticipantRestriction {
  id: string;
  type: 'mute_audio' | 'mute_chat' | 'view_only' | 'time_out' | 'warning' | 'probation';
  reason: string;
  startTime: Date;
  duration?: number; // minutes, undefined for permanent
  endTime?: Date;
  isActive: boolean;
  canAppeal: boolean;
  appealDeadline?: Date;
}

interface PrivateMessage {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  timestamp: Date;
  type: 'private_note' | 'guidance' | 'warning' | 'encouragement' | 'instruction';
  priority: 'low' | 'medium' | 'high';
  requiresResponse: boolean;
  read: boolean;
  response?: string;
  responseTimestamp?: Date;
  automated: boolean;
}

interface InterventionTemplate {
  id: string;
  name: string;
  category: 'engagement' | 'behavior' | 'technical' | 'guidance' | 'discipline';
  type: InterventionType;
  message: string;
  severity: 'info' | 'warning' | 'restriction' | 'removal';
  requiresConfirmation: boolean;
  followUpAction?: string;
  escalatesTo?: InterventionType;
  cooldownPeriod: number; // minutes
}

type InterventionType = 
  | 'private_message' 
  | 'public_reminder' 
  | 'temporary_mute' 
  | 'chat_restriction' 
  | 'engagement_prompt' 
  | 'behavior_warning' 
  | 'timeout' 
  | 'remove_from_session' 
  | 'supervisor_alert'
  | 'technical_support'
  | 'redirect_attention'
  | 'pause_for_discussion';

interface SessionRedirect {
  id: string;
  type: 'breakout_room' | 'individual_reflection' | 'resource_review' | 'skill_practice' | 'cooling_off';
  title: string;
  description: string;
  duration: number; // minutes
  participants: string[];
  startTime: Date;
  endTime?: Date;
  autoReturn: boolean;
  supervision: 'none' | 'monitoring' | 'active_facilitation';
  resources?: string[];
}

interface InterventionControlPanelProps {
  sessionId: string;
  participants: SessionParticipant[];
  onIntervention?: (intervention: InterventionRecord) => void;
  onPrivateMessage?: (message: PrivateMessage) => void;
  onSessionRedirect?: (redirect: SessionRedirect) => void;
  onParticipantRestriction?: (participantId: string, restriction: ParticipantRestriction) => void;
}

export function InterventionControlPanel({
  sessionId,
  participants = [],
  onIntervention,
  onPrivateMessage,
  onSessionRedirect,
  onParticipantRestriction
}: InterventionControlPanelProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [selectedParticipant, setSelectedParticipant] = useState<SessionParticipant | null>(null);
  const [activeTab, setActiveTab] = useState('participants');
  const [interventionTemplates, setInterventionTemplates] = useState<InterventionTemplate[]>([]);
  const [activeInterventions, setActiveInterventions] = useState<InterventionRecord[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PrivateMessage[]>([]);
  const [sessionRedirects, setSessionRedirects] = useState<SessionRedirect[]>([]);
  
  // Message composition
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<PrivateMessage['type']>('guidance');
  const [messagePriority, setMessagePriority] = useState<PrivateMessage['priority']>('medium');
  const [requiresResponse, setRequiresResponse] = useState(false);
  
  // Intervention dialogs
  const [showInterventionDialog, setShowInterventionDialog] = useState(false);
  const [showRestrictDialog, setShowRestrictDialog] = useState(false);
  const [showRedirectDialog, setShowRedirectDialog] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionTemplate | null>(null);
  
  // Escalation settings
  const [autoEscalation, setAutoEscalation] = useState(true);
  const [escalationThreshold, setEscalationThreshold] = useState(3); // number of interventions before escalation

  useEffect(() => {
    loadInterventionTemplates();
    loadActiveInterventions();
    loadPendingMessages();
  }, [sessionId]);

  const loadInterventionTemplates = () => {
    // Mock intervention templates
    const templates: InterventionTemplate[] = [
      {
        id: '1',
        name: 'Gentle Engagement Reminder',
        category: 'engagement',
        type: 'private_message',
        message: 'I noticed you might be having trouble staying engaged. Is there anything I can help you with to better participate in the discussion?',
        severity: 'info',
        requiresConfirmation: false,
        followUpAction: 'Monitor engagement for 5 minutes',
        escalatesTo: 'engagement_prompt',
        cooldownPeriod: 10
      },
      {
        id: '2',
        name: 'Respectful Communication Reminder',
        category: 'behavior',
        type: 'private_message',
        message: 'Please remember to maintain respectful language when disagreeing with your peers. Let\'s focus on the ideas, not personal comments.',
        severity: 'warning',
        requiresConfirmation: true,
        escalatesTo: 'behavior_warning',
        cooldownPeriod: 15
      },
      {
        id: '3',
        name: 'Technical Support Offer',
        category: 'technical',
        type: 'private_message',
        message: 'I see you might be experiencing technical difficulties. Would you like me to help troubleshoot or provide an alternative way to participate?',
        severity: 'info',
        requiresConfirmation: false,
        followUpAction: 'Provide technical support resources',
        cooldownPeriod: 5
      },
      {
        id: '4',
        name: 'Temporary Chat Restriction',
        category: 'discipline',
        type: 'chat_restriction',
        message: 'Due to inappropriate behavior, your chat privileges have been temporarily restricted. You can still participate verbally.',
        severity: 'restriction',
        requiresConfirmation: true,
        escalatesTo: 'timeout',
        cooldownPeriod: 30
      },
      {
        id: '5',
        name: 'Evidence-Based Argument Guidance',
        category: 'guidance',
        type: 'private_message',
        message: 'I\'d love to see you strengthen your argument with some evidence or examples. What sources or experiences could support your point?',
        severity: 'info',
        requiresConfirmation: false,
        cooldownPeriod: 20
      },
      {
        id: '6',
        name: 'Session Timeout',
        category: 'discipline',
        type: 'timeout',
        message: 'You are being placed in a brief timeout to reflect on appropriate participation. You\'ll be able to rejoin in a few minutes.',
        severity: 'restriction',
        requiresConfirmation: true,
        escalatesTo: 'remove_from_session',
        cooldownPeriod: 60
      }
    ];

    setInterventionTemplates(templates);
  };

  const loadActiveInterventions = () => {
    // Mock active interventions
    const interventions: InterventionRecord[] = [
      {
        id: '1',
        type: 'private_message',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        reason: 'Low engagement detected',
        action: 'Sent private encouragement message',
        severity: 'info',
        effectiveness: 'effective',
        followUpRequired: false,
        performedBy: user?.id || 'teacher',
        escalationLevel: 0
      },
      {
        id: '2',
        type: 'behavior_warning',
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        reason: 'Disrespectful language toward peer',
        action: 'Issued behavior warning',
        severity: 'warning',
        effectiveness: 'partial',
        followUpRequired: true,
        performedBy: user?.id || 'teacher',
        notes: 'Student acknowledged but behavior continued at lower level',
        escalationLevel: 1
      }
    ];

    setActiveInterventions(interventions);
  };

  const loadPendingMessages = () => {
    // Mock pending private messages
    const messages: PrivateMessage[] = [
      {
        id: '1',
        fromId: user?.id || 'teacher',
        toId: 'student1',
        content: 'Great point about climate policy! Can you elaborate on the economic implications?',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        type: 'encouragement',
        priority: 'medium',
        requiresResponse: false,
        read: true,
        automated: false
      }
    ];

    setPendingMessages(messages);
  };

  const executeIntervention = async (
    participant: SessionParticipant, 
    template: InterventionTemplate,
    customMessage?: string
  ) => {
    const intervention: InterventionRecord = {
      id: Date.now().toString(),
      type: template.type,
      timestamp: new Date(),
      reason: `Applied template: ${template.name}`,
      action: customMessage || template.message,
      severity: template.severity,
      followUpRequired: !!template.followUpAction,
      performedBy: user?.id || 'teacher',
      escalationLevel: getEscalationLevel(participant.id, template.category)
    };

    // Update participant interventions
    const updatedParticipant = {
      ...participant,
      interventions: [...participant.interventions, intervention]
    };

    // Execute specific intervention type
    switch (template.type) {
      case 'private_message':
        await sendPrivateMessage(participant, customMessage || template.message, template.category);
        break;
      case 'temporary_mute':
        await applyRestriction(participant.id, {
          id: Date.now().toString(),
          type: 'mute_audio',
          reason: intervention.reason,
          startTime: new Date(),
          duration: 5, // 5 minutes default
          isActive: true,
          canAppeal: true,
          appealDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        break;
      case 'chat_restriction':
        await applyRestriction(participant.id, {
          id: Date.now().toString(),
          type: 'mute_chat',
          reason: intervention.reason,
          startTime: new Date(),
          duration: 10, // 10 minutes default
          isActive: true,
          canAppeal: true,
          appealDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
        break;
      case 'timeout':
        await initiateSessionRedirect(participant.id, {
          id: Date.now().toString(),
          type: 'cooling_off',
          title: 'Reflection Period',
          description: 'Take a moment to reflect on appropriate participation',
          duration: 5,
          participants: [participant.id],
          startTime: new Date(),
          autoReturn: true,
          supervision: 'monitoring'
        });
        break;
    }

    setActiveInterventions(prev => [...prev, intervention]);
    onIntervention?.(intervention);

    // Check for auto-escalation
    if (autoEscalation && shouldEscalate(participant, intervention)) {
      await handleEscalation(participant, intervention);
    }

    addNotification({
      type: 'success',
      title: 'Intervention Applied',
      message: `${template.name} applied to ${participant.name}`,
      read: false
    });

    setShowInterventionDialog(false);
    setSelectedIntervention(null);
  };

  const sendPrivateMessage = async (
    participant: SessionParticipant, 
    content: string,
    category: string
  ) => {
    const message: PrivateMessage = {
      id: Date.now().toString(),
      fromId: user?.id || 'teacher',
      toId: participant.id,
      content,
      timestamp: new Date(),
      type: getMessageTypeFromCategory(category),
      priority: messagePriority,
      requiresResponse,
      read: false,
      automated: false
    };

    setPendingMessages(prev => [message, ...prev]);
    onPrivateMessage?.(message);

    // Reset message form
    setMessageContent('');
    setRequiresResponse(false);
  };

  const applyRestriction = async (participantId: string, restriction: ParticipantRestriction) => {
    onParticipantRestriction?.(participantId, restriction);
    
    addNotification({
      type: 'warning',
      title: 'Restriction Applied',
      message: `Participant restriction: ${restriction.type.replace('_', ' ')}`,
      read: false
    });
  };

  const initiateSessionRedirect = async (participantId: string, redirect: SessionRedirect) => {
    setSessionRedirects(prev => [...prev, redirect]);
    onSessionRedirect?.(redirect);

    addNotification({
      type: 'info',
      title: 'Session Redirect',
      message: `Participant moved to ${redirect.title}`,
      read: false
    });
  };

  const getEscalationLevel = (participantId: string, category: string): number => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return 0;

    const categoryInterventions = participant.interventions.filter(
      i => interventionTemplates.find(t => t.id === i.type && t.category === category)
    );

    return categoryInterventions.length;
  };

  const shouldEscalate = (participant: SessionParticipant, intervention: InterventionRecord): boolean => {
    const recentInterventions = participant.interventions.filter(
      i => Date.now() - i.timestamp.getTime() < 30 * 60 * 1000 // last 30 minutes
    );

    return recentInterventions.length >= escalationThreshold;
  };

  const handleEscalation = async (participant: SessionParticipant, intervention: InterventionRecord) => {
    const template = interventionTemplates.find(t => t.id === intervention.type);
    if (!template?.escalatesTo) return;

    const escalationTemplate = interventionTemplates.find(t => t.type === template.escalatesTo);
    if (!escalationTemplate) return;

    // Automatically apply escalation
    setTimeout(() => {
      executeIntervention(participant, escalationTemplate, 
        `ESCALATED: ${escalationTemplate.message}`);
    }, 1000);
  };

  const getMessageTypeFromCategory = (category: string): PrivateMessage['type'] => {
    switch (category) {
      case 'engagement': return 'guidance';
      case 'behavior': return 'warning';
      case 'guidance': return 'instruction';
      default: return 'guidance';
    }
  };

  const getConcernLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'none': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getInterventionTypeIcon = (type: InterventionType) => {
    switch (type) {
      case 'private_message': return <MessageCircle className="h-4 w-4" />;
      case 'public_reminder': return <Bell className="h-4 w-4" />;
      case 'temporary_mute': return <MicOff className="h-4 w-4" />;
      case 'chat_restriction': return <MessageSquare className="h-4 w-4" />;
      case 'engagement_prompt': return <Zap className="h-4 w-4" />;
      case 'behavior_warning': return <AlertTriangle className="h-4 w-4" />;
      case 'timeout': return <Clock className="h-4 w-4" />;
      case 'remove_from_session': return <Ban className="h-4 w-4" />;
      case 'supervisor_alert': return <AlertCircle className="h-4 w-4" />;
      case 'technical_support': return <Settings className="h-4 w-4" />;
      case 'redirect_attention': return <Target className="h-4 w-4" />;
      case 'pause_for_discussion': return <Pause className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  const participantsWithConcerns = participants.filter(p => 
    p.engagement.concernLevel !== 'none'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Intervention Control Panel
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage participant behavior, send private messages, and redirect sessions
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {activeInterventions.length} Active Interventions
            </Badge>
            <Badge variant="outline">
              {pendingMessages.filter(m => !m.read).length} Unread Messages
            </Badge>
            {participantsWithConcerns.length > 0 && (
              <Badge variant="destructive">
                {participantsWithConcerns.length} Concerns
              </Badge>
            )}
          </div>
          
          {/* Settings */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-escalation"
                checked={autoEscalation}
                onCheckedChange={setAutoEscalation}
              />
              <label htmlFor="auto-escalation" className="text-sm font-medium">
                Auto-escalation
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* High Priority Alerts */}
      {participantsWithConcerns.filter(p => p.engagement.concernLevel === 'critical' || p.engagement.concernLevel === 'high').length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>High priority concerns detected</strong> for{' '}
            {participantsWithConcerns.filter(p => p.engagement.concernLevel === 'critical' || p.engagement.concernLevel === 'high').map(p => p.name).join(', ')}.
            Immediate intervention may be required.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="participants">
            Participants ({participantsWithConcerns.length} concerns)
          </TabsTrigger>
          <TabsTrigger value="messages">
            Messages ({pendingMessages.filter(m => !m.read).length} unread)
          </TabsTrigger>
          <TabsTrigger value="interventions">
            Interventions ({activeInterventions.length} active)
          </TabsTrigger>
          <TabsTrigger value="redirects">
            Redirects ({sessionRedirects.filter(r => !r.endTime).length} active)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-4">
          {/* Participant Intervention Interface */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {participants.map((participant) => (
              <Card key={participant.id} className={`border-l-4 ${
                participant.engagement.concernLevel === 'critical' ? 'border-l-red-500' :
                participant.engagement.concernLevel === 'high' ? 'border-l-orange-500' :
                participant.engagement.concernLevel === 'medium' ? 'border-l-yellow-500' :
                participant.engagement.concernLevel === 'low' ? 'border-l-blue-500' : 'border-l-green-500'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback>
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{participant.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {participant.role.replace('_', ' ')}
                          </Badge>
                          <Badge className={getConcernLevelColor(participant.engagement.concernLevel)} variant="outline">
                            {participant.engagement.concernLevel} concern
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">{participant.engagement.score}%</div>
                      <div className="text-muted-foreground">engagement</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Engagement Status */}
                  <div className="space-y-2">
                    <Progress value={participant.engagement.score} />
                    <div className="flex items-center justify-between text-sm">
                      <span>Last activity:</span>
                      <span>{Math.round((Date.now() - participant.engagement.lastActivity.getTime()) / 60000)}min ago</span>
                    </div>
                  </div>

                  {/* Recent Interventions */}
                  {participant.interventions.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Recent Interventions:</div>
                      <div className="flex flex-wrap gap-1">
                        {participant.interventions.slice(-3).map((intervention, index) => (
                          <Badge key={index} variant="secondary" className="text-xs flex items-center">
                            {getInterventionTypeIcon(intervention.type)}
                            <span className="ml-1">{intervention.type.replace('_', ' ')}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Restrictions */}
                  {participant.restrictions.filter(r => r.isActive).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Active Restrictions:</div>
                      {participant.restrictions.filter(r => r.isActive).map((restriction) => (
                        <Badge key={restriction.id} variant="destructive" className="text-xs">
                          {restriction.type.replace('_', ' ')}
                          {restriction.duration && (
                            <span className="ml-1">({restriction.duration}min)</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedParticipant(participant);
                        setShowInterventionDialog(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    
                    {participant.engagement.concernLevel !== 'none' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedParticipant(participant);
                          // Apply quick engagement intervention
                          const template = interventionTemplates.find(t => t.category === 'engagement');
                          if (template) {
                            executeIntervention(participant, template);
                          }
                        }}
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Engage
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedParticipant(participant);
                        setShowRestrictDialog(true);
                      }}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <Flag className="h-4 w-4 mr-1" />
                      Restrict
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          {/* Private Message Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Send Private Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recipient</label>
                  <Select 
                    value={selectedParticipant?.id || ''} 
                    onValueChange={(value) => setSelectedParticipant(participants.find(p => p.id === value) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select participant" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((participant) => (
                        <SelectItem key={participant.id} value={participant.id}>
                          {participant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message Type</label>
                  <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guidance">Guidance</SelectItem>
                      <SelectItem value="encouragement">Encouragement</SelectItem>
                      <SelectItem value="instruction">Instruction</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="private_note">Private Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Type your private message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires-response"
                      checked={requiresResponse}
                      onCheckedChange={setRequiresResponse}
                    />
                    <label htmlFor="requires-response" className="text-sm font-medium">
                      Requires response
                    </label>
                  </div>
                  <Select value={messagePriority} onValueChange={(value: any) => setMessagePriority(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={() => {
                    if (selectedParticipant && messageContent.trim()) {
                      sendPrivateMessage(selectedParticipant, messageContent, messageType);
                    }
                  }}
                  disabled={!selectedParticipant || !messageContent.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Message History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {pendingMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages sent yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingMessages.map((message) => (
                      <div key={message.id} className="border-b pb-3 last:border-b-0">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">
                                To: {participants.find(p => p.id === message.toId)?.name}
                              </span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {message.type.replace('_', ' ')}
                              </Badge>
                              <Badge variant={message.priority === 'high' ? 'destructive' : message.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                {message.priority}
                              </Badge>
                              {message.read && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Read
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs text-muted-foreground">{message.timestamp.toLocaleString()}</p>
                            {message.response && (
                              <div className="mt-2 p-2 bg-blue-50 rounded">
                                <p className="text-sm font-medium">Response:</p>
                                <p className="text-sm">{message.response}</p>
                              </div>
                            )}
                          </div>
                          {message.requiresResponse && !message.response && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Awaiting response
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          {/* Intervention Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Intervention Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {interventionTemplates.map((template) => (
                  <Card key={template.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer" 
                        onClick={() => {
                          setSelectedIntervention(template);
                          setShowInterventionDialog(true);
                        }}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <Badge variant={
                          template.severity === 'restriction' ? 'destructive' :
                          template.severity === 'warning' ? 'secondary' : 'outline'
                        } className="text-xs">
                          {template.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{template.message}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs capitalize">
                          {template.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{template.cooldownPeriod}min cooldown</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Interventions */}
          <Card>
            <CardHeader>
              <CardTitle>Active Intervention History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {activeInterventions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No interventions recorded yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeInterventions.map((intervention) => (
                      <div key={intervention.id} className="border-b pb-3 last:border-b-0">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              {getInterventionTypeIcon(intervention.type)}
                              <span className="font-medium text-sm capitalize">
                                {intervention.type.replace('_', ' ')}
                              </span>
                              <Badge variant={
                                intervention.severity === 'removal' ? 'destructive' :
                                intervention.severity === 'restriction' ? 'destructive' :
                                intervention.severity === 'warning' ? 'secondary' : 'outline'
                              } className="text-xs">
                                {intervention.severity}
                              </Badge>
                              {intervention.effectiveness && (
                                <Badge variant={
                                  intervention.effectiveness === 'effective' ? 'default' :
                                  intervention.effectiveness === 'partial' ? 'secondary' : 'destructive'
                                } className="text-xs">
                                  {intervention.effectiveness}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{intervention.reason}</p>
                            <p className="text-xs text-muted-foreground">{intervention.timestamp.toLocaleString()}</p>
                            {intervention.notes && (
                              <p className="text-xs italic text-muted-foreground">Note: {intervention.notes}</p>
                            )}
                          </div>
                          {intervention.followUpRequired && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Follow-up needed
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redirects" className="space-y-4">
          {/* Session Redirects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowRight className="h-5 w-5 mr-2" />
                Active Session Redirects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionRedirects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active session redirects
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionRedirects.map((redirect) => (
                    <Card key={redirect.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{redirect.title}</h4>
                          <Badge variant={redirect.endTime ? 'secondary' : 'default'}>
                            {redirect.endTime ? 'Completed' : 'Active'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{redirect.description}</p>
                        <div className="grid gap-2 md:grid-cols-3 text-sm">
                          <div>
                            <span className="font-medium">Duration:</span> {redirect.duration} minutes
                          </div>
                          <div>
                            <span className="font-medium">Participants:</span> {redirect.participants.length}
                          </div>
                          <div>
                            <span className="font-medium">Supervision:</span> {redirect.supervision.replace('_', ' ')}
                          </div>
                        </div>
                        {!redirect.endTime && (
                          <div className="flex justify-end space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              Monitor
                            </Button>
                            <Button size="sm">
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              Return to Main
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Intervention Dialog */}
      <Dialog open={showInterventionDialog} onOpenChange={setShowInterventionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply Intervention</DialogTitle>
            <DialogDescription>
              {selectedParticipant && `Apply intervention for ${selectedParticipant.name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedIntervention && selectedParticipant && (
            <div className="space-y-4 py-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <h4 className="font-medium">{selectedIntervention.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{selectedIntervention.message}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Message (Optional)</label>
                <Textarea
                  placeholder="Override the default message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={3}
                />
              </div>
              {selectedIntervention.requiresConfirmation && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This intervention requires confirmation. The action cannot be undone.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowInterventionDialog(false);
              setSelectedIntervention(null);
              setMessageContent('');
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedParticipant && selectedIntervention) {
                executeIntervention(selectedParticipant, selectedIntervention, messageContent || undefined);
                setMessageContent('');
              }
            }}>
              <Shield className="h-4 w-4 mr-2" />
              Apply Intervention
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restriction Dialog */}
      <AlertDialog open={showRestrictDialog} onOpenChange={setShowRestrictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Participant Restriction</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedParticipant && `Apply a restriction to ${selectedParticipant.name}. This action will be logged and the participant will be notified.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-center py-4">
            <Ban className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Restriction interface will allow selection of restriction type, duration, and reason.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-orange-600 hover:bg-orange-700">
              <Ban className="h-4 w-4 mr-2" />
              Apply Restriction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
