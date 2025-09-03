/**
 * Documentation & Logging System Component
 * 
 * Task 8.4.2: Detailed intervention logging for accountability, session notes
 * and observations recording, and critical incident reporting with follow-up workflows
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
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  FileText,
  ClipboardList,
  AlertTriangle,
  Shield,
  Clock,
  User,
  Calendar,
  Tag,
  Edit,
  Save,
  Download,
  Upload,
  Share2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Star,
  Flag,
  CheckCircle2,
  XCircle,
  Info,
  Warning,
  Ban,
  MessageSquare,
  Mic,
  Camera,
  Activity,
  Target,
  Brain,
  Zap,
  Bell,
  Search,
  Filter,
  Plus,
  Minus,
  RefreshCw,
  Archive,
  BookOpen,
  Bookmark,
  History,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  Award,
  Lightbulb,
  Settings,
  ExternalLink,
  Copy,
  Trash2,
  MoreHorizontal
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface SessionLog {
  id: string;
  sessionId: string;
  sessionTitle: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // minutes
  teacherId: string;
  teacherName: string;
  participants: LoggedParticipant[];
  phases: PhaseLog[];
  interventions: InterventionLog[];
  observations: ObservationNote[];
  incidents: CriticalIncident[];
  adaptations: AdaptationLog[];
  outcomes: SessionOutcome[];
  metadata: {
    totalMessages: number;
    averageEngagement: number;
    technicalIssues: number;
    escalations: number;
    completionRate: number;
  };
  isLocked: boolean;
  lockReason?: string;
  lockedBy?: string;
  lockedAt?: Date;
}

interface LoggedParticipant {
  id: string;
  name: string;
  role: string;
  joinTime: Date;
  leaveTime?: Date;
  engagementScore: number;
  participationMinutes: number;
  interventionsReceived: number;
  violationCount: number;
  achievementsEarned: string[];
}

interface PhaseLog {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  plannedDuration: number; // minutes
  actualDuration?: number; // minutes
  completionStatus: 'completed' | 'skipped' | 'interrupted' | 'extended';
  participantCount: number;
  averageEngagement: number;
  adaptationsMade: string[];
  notes: string;
  objectives: ObjectiveAssessment[];
}

interface InterventionLog {
  id: string;
  timestamp: Date;
  type: 'warning' | 'restriction' | 'redirection' | 'support' | 'escalation' | 'emergency';
  participantId: string;
  participantName: string;
  reason: string;
  action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  outcome: 'successful' | 'partially_successful' | 'unsuccessful' | 'pending';
  followUpRequired: boolean;
  followUpCompleted: boolean;
  followUpNotes?: string;
  reviewedBy?: string;
  reviewTimestamp?: Date;
  relatedIncidentId?: string;
}

interface ObservationNote {
  id: string;
  timestamp: Date;
  category: 'positive' | 'concern' | 'neutral' | 'achievement' | 'improvement' | 'challenge';
  participantId?: string; // optional for general observations
  participantName?: string;
  title: string;
  content: string;
  tags: string[];
  visibility: 'teacher_only' | 'admin_visible' | 'parent_visible' | 'student_visible';
  priority: 'low' | 'medium' | 'high';
  followUpNeeded: boolean;
  followUpDate?: Date;
  attachments?: string[];
  isConfidential: boolean;
}

interface CriticalIncident {
  id: string;
  timestamp: Date;
  type: 'safety_concern' | 'harassment' | 'technical_failure' | 'policy_violation' | 'emergency_situation' | 'data_breach';
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  title: string;
  description: string;
  involvedParticipants: string[];
  immediateActions: string[];
  reportStatus: 'draft' | 'submitted' | 'under_review' | 'resolved' | 'escalated';
  reportedBy: string;
  reviewedBy?: string;
  resolution?: string;
  followUpActions: IncidentFollowUp[];
  requiresExternalReport: boolean;
  externalReportSubmitted?: boolean;
  documentationComplete: boolean;
  confidentialityLevel: 'public' | 'internal' | 'restricted' | 'confidential';
  legalImplications: boolean;
}

interface IncidentFollowUp {
  id: string;
  action: string;
  assignedTo: string;
  dueDate: Date;
  completed: boolean;
  completionDate?: Date;
  notes?: string;
  evidence?: string[];
}

interface AdaptationLog {
  id: string;
  timestamp: Date;
  type: 'difficulty_adjustment' | 'time_modification' | 'activity_change' | 'group_restructure' | 'resource_addition';
  reason: string;
  description: string;
  effectiveness: 'positive' | 'negative' | 'neutral' | 'unknown';
  participantFeedback?: string;
  measurableOutcome?: string;
  wouldRepeat: boolean;
  notes: string;
}

interface ObjectiveAssessment {
  id: string;
  objective: string;
  targetLevel: string;
  achievedLevel: string;
  evidence: string[];
  participantsAchieved: number;
  participantsTotal: number;
  notes: string;
}

interface SessionOutcome {
  id: string;
  category: 'learning_objective' | 'skill_development' | 'engagement' | 'collaboration' | 'behavior';
  description: string;
  achieved: boolean;
  evidence: string[];
  participantsAffected: string[];
  improvementAreas: string[];
  recommendations: string[];
}

interface LoggingTemplate {
  id: string;
  name: string;
  type: 'observation' | 'intervention' | 'incident';
  category: string;
  template: string;
  quickFillFields: { field: string; options: string[] }[];
  autoTags: string[];
  defaultVisibility: string;
  requiresFollowUp: boolean;
}

interface DocumentationLoggingSystemProps {
  sessionId: string;
  sessionTitle: string;
  participants: any[];
  isLiveSession: boolean;
  onLogEntry?: (entry: any) => void;
  onIncidentReport?: (incident: CriticalIncident) => void;
  onFollowUpCreate?: (followUp: IncidentFollowUp) => void;
}

export function DocumentationLoggingSystem({
  sessionId,
  sessionTitle,
  participants = [],
  isLiveSession = true,
  onLogEntry,
  onIncidentReport,
  onFollowUpCreate
}: DocumentationLoggingSystemProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [sessionLog, setSessionLog] = useState<SessionLog | null>(null);
  const [loggingTemplates, setLoggingTemplates] = useState<LoggingTemplate[]>([]);
  
  // Quick logging states
  const [quickNote, setQuickNote] = useState('');
  const [quickNoteCategory, setQuickNoteCategory] = useState<ObservationNote['category']>('neutral');
  const [quickNoteParticipant, setQuickNoteParticipant] = useState('');
  const [quickNoteVisibility, setQuickNoteVisibility] = useState<ObservationNote['visibility']>('teacher_only');
  
  // Incident reporting
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentType, setIncidentType] = useState<CriticalIncident['type']>('policy_violation');
  const [incidentSeverity, setIncidentSeverity] = useState<CriticalIncident['severity']>('minor');
  const [involvedParticipants, setInvolvedParticipants] = useState<string[]>([]);
  
  // Dialog states
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  
  // Filters and search
  const [filters, setFilters] = useState({
    category: '',
    participant: '',
    date: '',
    search: ''
  });
  
  // Settings
  const [autoLogging, setAutoLogging] = useState(true);
  const [detailLevel, setDetailLevel] = useState<'minimal' | 'standard' | 'comprehensive'>('standard');
  const [confidentialityCheck, setConfidentialityCheck] = useState(true);

  useEffect(() => {
    initializeSessionLog();
    loadLoggingTemplates();
    
    if (autoLogging && isLiveSession) {
      const interval = setInterval(autoLogActivity, 60000); // Auto-log every minute
      return () => clearInterval(interval);
    }
  }, [autoLogging, isLiveSession]);

  const initializeSessionLog = () => {
    const log: SessionLog = {
      id: `log_${sessionId}`,
      sessionId,
      sessionTitle,
      startTime: new Date(),
      duration: 0,
      teacherId: user?.id || 'teacher',
      teacherName: user?.fullName || 'Teacher',
      participants: participants.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role || 'participant',
        joinTime: new Date(),
        engagementScore: 75,
        participationMinutes: 0,
        interventionsReceived: 0,
        violationCount: 0,
        achievementsEarned: []
      })),
      phases: [],
      interventions: [],
      observations: [],
      incidents: [],
      adaptations: [],
      outcomes: [],
      metadata: {
        totalMessages: 0,
        averageEngagement: 75,
        technicalIssues: 0,
        escalations: 0,
        completionRate: 0
      },
      isLocked: false
    };

    // Add some mock data for demonstration
    log.observations = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        category: 'positive',
        participantId: participants[0]?.id,
        participantName: participants[0]?.name,
        title: 'Excellent Evidence Use',
        content: 'Student demonstrated outstanding ability to cite credible sources and explain their relevance to the argument.',
        tags: ['evidence', 'critical_thinking', 'research_skills'],
        visibility: 'parent_visible',
        priority: 'medium',
        followUpNeeded: false,
        isConfidential: false
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        category: 'concern',
        participantId: participants[1]?.id,
        participantName: participants[1]?.name,
        title: 'Difficulty with Perspective Taking',
        content: 'Student struggled to articulate opposing viewpoints fairly. May benefit from perspective-taking exercises.',
        tags: ['empathy', 'perspective_taking', 'skill_development'],
        visibility: 'teacher_only',
        priority: 'medium',
        followUpNeeded: true,
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isConfidential: false
      }
    ];

    log.interventions = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        type: 'support',
        participantId: participants[1]?.id || 'p1',
        participantName: participants[1]?.name || 'Student',
        reason: 'Student appeared confused about debate structure',
        action: 'Provided private guidance on argument organization',
        severity: 'low',
        outcome: 'successful',
        followUpRequired: false,
        followUpCompleted: false
      }
    ];

    setSessionLog(log);
  };

  const loadLoggingTemplates = () => {
    const templates: LoggingTemplate[] = [
      {
        id: '1',
        name: 'Positive Recognition',
        type: 'observation',
        category: 'positive',
        template: 'Student demonstrated [SKILL] by [SPECIFIC_EXAMPLE]. This shows growth in [AREA].',
        quickFillFields: [
          { field: 'SKILL', options: ['critical thinking', 'respectful communication', 'evidence use', 'collaboration', 'leadership'] },
          { field: 'AREA', options: ['academic skills', 'social skills', 'debate technique', 'research ability', 'confidence'] }
        ],
        autoTags: ['positive', 'achievement'],
        defaultVisibility: 'parent_visible',
        requiresFollowUp: false
      },
      {
        id: '2',
        name: 'Behavioral Concern',
        type: 'observation',
        category: 'concern',
        template: 'Observed [BEHAVIOR] during [CONTEXT]. Potential impact: [IMPACT]. Recommended action: [ACTION].',
        quickFillFields: [
          { field: 'BEHAVIOR', options: ['interrupting', 'off-topic comments', 'disrespectful language', 'lack of participation'] },
          { field: 'CONTEXT', options: ['opening statements', 'cross-examination', 'group work', 'whole class discussion'] },
          { field: 'ACTION', options: ['private conversation', 'skill practice', 'peer support', 'modified expectations'] }
        ],
        autoTags: ['concern', 'behavior'],
        defaultVisibility: 'teacher_only',
        requiresFollowUp: true
      },
      {
        id: '3',
        name: 'Safety Incident',
        type: 'incident',
        category: 'safety_concern',
        template: 'Safety incident occurred at [TIME] involving [PARTICIPANTS]. Description: [DESCRIPTION]. Immediate actions taken: [ACTIONS]. Follow-up required: [FOLLOWUP].',
        quickFillFields: [
          { field: 'ACTIONS', options: ['stopped activity', 'separated participants', 'called administration', 'provided first aid'] },
          { field: 'FOLLOWUP', options: ['parent notification', 'administrative meeting', 'counseling referral', 'policy review'] }
        ],
        autoTags: ['safety', 'critical'],
        defaultVisibility: 'internal',
        requiresFollowUp: true
      }
    ];

    setLoggingTemplates(templates);
  };

  const autoLogActivity = () => {
    if (!sessionLog || !isLiveSession) return;

    // Simulate automatic activity logging
    const activityNote: ObservationNote = {
      id: Date.now().toString(),
      timestamp: new Date(),
      category: 'neutral',
      title: 'Auto-logged Activity',
      content: `Session progressing normally. ${participants.length} participants active.`,
      tags: ['auto_logged', 'activity'],
      visibility: 'teacher_only',
      priority: 'low',
      followUpNeeded: false,
      isConfidential: false
    };

    setSessionLog(prev => prev ? {
      ...prev,
      observations: [activityNote, ...prev.observations],
      metadata: {
        ...prev.metadata,
        totalMessages: prev.metadata.totalMessages + Math.floor(Math.random() * 5)
      }
    } : prev);
  };

  const logQuickObservation = () => {
    if (!quickNote.trim()) {
      addNotification({
        type: 'error',
        title: 'Note Required',
        message: 'Please enter a note before logging.'
      });
      return;
    }

    const observation: ObservationNote = {
      id: Date.now().toString(),
      timestamp: new Date(),
      category: quickNoteCategory,
      participantId: quickNoteParticipant || undefined,
      participantName: quickNoteParticipant ? participants.find(p => p.id === quickNoteParticipant)?.name : undefined,
      title: quickNoteCategory === 'positive' ? 'Positive Observation' : 
             quickNoteCategory === 'concern' ? 'Area of Concern' : 'General Observation',
      content: quickNote,
      tags: [quickNoteCategory],
      visibility: quickNoteVisibility,
      priority: quickNoteCategory === 'concern' ? 'high' : 'medium',
      followUpNeeded: quickNoteCategory === 'concern',
      followUpDate: quickNoteCategory === 'concern' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
      isConfidential: false
    };

    setSessionLog(prev => prev ? {
      ...prev,
      observations: [observation, ...prev.observations]
    } : prev);

    onLogEntry?.(observation);

    // Clear form
    setQuickNote('');
    setQuickNoteParticipant('');
    
    addNotification({
      type: 'success',
      title: 'Observation Logged',
      message: `${quickNoteCategory} observation saved successfully.`
    });
  };

  const reportCriticalIncident = () => {
    if (!incidentTitle.trim() || !incidentDescription.trim()) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please provide both title and description for the incident.'
      });
      return;
    }

    const incident: CriticalIncident = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: incidentType,
      severity: incidentSeverity,
      title: incidentTitle,
      description: incidentDescription,
      involvedParticipants,
      immediateActions: [],
      reportStatus: 'draft',
      reportedBy: user?.id || 'teacher',
      followUpActions: [],
      requiresExternalReport: incidentSeverity === 'severe' || incidentType === 'safety_concern',
      documentationComplete: false,
      confidentialityLevel: incidentSeverity === 'severe' ? 'confidential' : 'internal',
      legalImplications: incidentType === 'harassment' || incidentType === 'safety_concern'
    };

    setSessionLog(prev => prev ? {
      ...prev,
      incidents: [incident, ...prev.incidents]
    } : prev);

    onIncidentReport?.(incident);

    // Reset form
    setIncidentTitle('');
    setIncidentDescription('');
    setInvolvedParticipants([]);
    setShowIncidentDialog(false);

    addNotification({
      type: 'warning',
      title: 'Incident Reported',
      message: 'Critical incident has been documented and flagged for review.'
    });
  };

  const logIntervention = (intervention: InterventionLog) => {
    setSessionLog(prev => prev ? {
      ...prev,
      interventions: [intervention, ...prev.interventions]
    } : prev);
  };

  const exportSessionLog = (format: 'pdf' | 'csv' | 'json') => {
    if (!sessionLog) return;

    // Mock export functionality
    const exportData = {
      session: sessionLog,
      exportedBy: user?.fullName,
      exportTime: new Date(),
      format
    };

    console.log('Exporting session log:', exportData);
    
    addNotification({
      type: 'success',
      title: 'Export Started',
      message: `Session log export in ${format.toUpperCase()} format has been queued.`
    });
  };

  const lockSessionLog = (reason: string) => {
    setSessionLog(prev => prev ? {
      ...prev,
      isLocked: true,
      lockReason: reason,
      lockedBy: user?.id,
      lockedAt: new Date()
    } : prev);

    addNotification({
      type: 'info',
      title: 'Session Log Locked',
      message: 'Session log has been locked for editing.'
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'concern':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'achievement':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'improvement':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'challenge':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'major':
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'moderate':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'student_visible':
        return <Eye className="h-4 w-4" />;
      case 'parent_visible':
        return <Users className="h-4 w-4" />;
      case 'admin_visible':
        return <Shield className="h-4 w-4" />;
      default:
        return <EyeOff className="h-4 w-4" />;
    }
  };

  if (!sessionLog) {
    return <div>Loading session log...</div>;
  }

  const filteredObservations = sessionLog.observations.filter(obs => {
    if (filters.category && obs.category !== filters.category) return false;
    if (filters.participant && obs.participantId !== filters.participant) return false;
    if (filters.search && 
        !obs.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !obs.content.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const pendingFollowUps = sessionLog.observations.filter(obs => obs.followUpNeeded && !obs.followUpDate).length +
                          sessionLog.interventions.filter(int => int.followUpRequired && !int.followUpCompleted).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Documentation & Logging System
          </h3>
          <p className="text-sm text-muted-foreground">
            Comprehensive session documentation for accountability and improvement
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            <Badge variant={autoLogging ? "default" : "secondary"}>
              {autoLogging ? 'Auto-logging On' : 'Manual Only'}
            </Badge>
            <Badge variant="outline">
              {sessionLog.observations.length} Notes
            </Badge>
            <Badge variant="outline">
              {sessionLog.incidents.length} Incidents
            </Badge>
            {pendingFollowUps > 0 && (
              <Badge variant="destructive">
                {pendingFollowUps} Follow-ups Pending
              </Badge>
            )}
            {sessionLog.isLocked && (
              <Badge variant="secondary" className="flex items-center">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowIncidentDialog(true)}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Incident
            </Button>
          </div>
        </div>
      </div>

      {/* Pending Follow-ups Alert */}
      {pendingFollowUps > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>{pendingFollowUps} follow-up action{pendingFollowUps !== 1 ? 's' : ''}</strong> require attention from recent observations and interventions.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Logging Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="h-5 w-5 mr-2" />
            Quick Observation Log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={quickNoteCategory} onValueChange={(value: any) => setQuickNoteCategory(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="concern">Concern</SelectItem>
                  <SelectItem value="neutral">General Note</SelectItem>
                  <SelectItem value="achievement">Achievement</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="challenge">Challenge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Participant (Optional)</label>
              <Select value={quickNoteParticipant} onValueChange={setQuickNoteParticipant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select participant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General observation</SelectItem>
                  {participants.map((participant) => (
                    <SelectItem key={participant.id} value={participant.id}>
                      {participant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Visibility</label>
              <Select value={quickNoteVisibility} onValueChange={(value: any) => setQuickNoteVisibility(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher_only">Teacher Only</SelectItem>
                  <SelectItem value="admin_visible">Admin Visible</SelectItem>
                  <SelectItem value="parent_visible">Parent Visible</SelectItem>
                  <SelectItem value="student_visible">Student Visible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="w-full space-y-2">
                <label className="text-sm font-medium">Auto-logging</label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={autoLogging}
                    onCheckedChange={setAutoLogging}
                    id="auto-logging"
                  />
                  <label htmlFor="auto-logging" className="text-sm">
                    Enabled
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Observation Note</label>
            <Textarea
              placeholder="Enter your observation or note about the session..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {quickNoteCategory === 'concern' && 'This will create a follow-up reminder.'}
              {quickNoteCategory === 'positive' && 'This will be visible to parents if selected.'}
            </div>
            <Button onClick={logQuickObservation} disabled={!quickNote.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Log Observation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            Session Overview
          </TabsTrigger>
          <TabsTrigger value="observations">
            Observations ({sessionLog.observations.length})
          </TabsTrigger>
          <TabsTrigger value="interventions">
            Interventions ({sessionLog.interventions.length})
          </TabsTrigger>
          <TabsTrigger value="incidents">
            Incidents ({sessionLog.incidents.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Log Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Session Summary */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Session Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div>
                    <div className="font-medium">Session ID</div>
                    <div className="text-muted-foreground">{sessionLog.sessionId}</div>
                  </div>
                  <div>
                    <div className="font-medium">Start Time</div>
                    <div className="text-muted-foreground">{sessionLog.startTime.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium">Duration</div>
                    <div className="text-muted-foreground">
                      {isLiveSession ? 'In Progress' : `${sessionLog.duration} minutes`}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Participants</div>
                    <div className="text-muted-foreground">{sessionLog.participants.length} total</div>
                  </div>
                  <div>
                    <div className="font-medium">Teacher</div>
                    <div className="text-muted-foreground">{sessionLog.teacherName}</div>
                  </div>
                  <div>
                    <div className="font-medium">Status</div>
                    <div className="text-muted-foreground">
                      {sessionLog.isLocked ? 'Locked for editing' : 'Active logging'}
                    </div>
                  </div>
                </div>

                {!sessionLog.isLocked && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => lockSessionLog('Session completed')}
                      className="w-full"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Lock Session Log
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Observations:</span>
                    <span className="font-medium">{sessionLog.observations.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Interventions:</span>
                    <span className="font-medium">{sessionLog.interventions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Critical Incidents:</span>
                    <span className="font-medium text-red-600">{sessionLog.incidents.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Adaptations:</span>
                    <span className="font-medium">{sessionLog.adaptations.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Follow-ups Pending:</span>
                    <span className="font-medium text-orange-600">{pendingFollowUps}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Avg Engagement:</span>
                    <span className="font-medium">{sessionLog.metadata.averageEngagement}%</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Quick Stats:</div>
                  <div className="grid gap-2 text-xs">
                    <div className="flex justify-between">
                      <span>Total Messages:</span>
                      <span>{sessionLog.metadata.totalMessages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Technical Issues:</span>
                      <span>{sessionLog.metadata.technicalIssues}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Escalations:</span>
                      <span>{sessionLog.metadata.escalations}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...sessionLog.observations.slice(0, 3), ...sessionLog.interventions.slice(0, 2)]
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .slice(0, 5)
                  .map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 text-sm">
                      <div className="mt-1">
                        {'category' in item ? (
                          <FileText className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Shield className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {'category' in item ? 'Observation' : 'Intervention'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {'category' in item ? item.category : item.type}
                          </Badge>
                          <span className="text-muted-foreground">
                            {item.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-1">
                          {'content' in item ? item.content : item.reason}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="observations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search observations..."
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
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="concern">Concern</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="achievement">Achievement</SelectItem>
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
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Observations
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observations List */}
          <div className="space-y-4">
            {filteredObservations.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Observations</h3>
                    <p className="text-muted-foreground">
                      {sessionLog.observations.length === 0 
                        ? "No observations have been recorded yet"
                        : "No observations match your current filters"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredObservations.map((observation) => (
                <Card key={observation.id} className={`border-l-4 ${getCategoryColor(observation.category).replace('bg-', 'border-l-').replace('-100', '-500')}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getCategoryColor(observation.category)} variant="outline">
                            {observation.category}
                          </Badge>
                          <div className="flex items-center space-x-1 text-muted-foreground">
                            {getVisibilityIcon(observation.visibility)}
                            <span className="text-xs">{observation.visibility.replace('_', ' ')}</span>
                          </div>
                          {observation.priority === 'high' && (
                            <Badge variant="destructive">High Priority</Badge>
                          )}
                          {observation.followUpNeeded && (
                            <Badge variant="secondary">Follow-up Needed</Badge>
                          )}
                          {observation.isConfidential && (
                            <Badge variant="outline" className="flex items-center">
                              <Lock className="h-3 w-3 mr-1" />
                              Confidential
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{observation.title}</h4>
                        {observation.participantName && (
                          <p className="text-sm text-muted-foreground">
                            Student: {observation.participantName}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {observation.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{observation.content}</p>
                    
                    {observation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {observation.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {observation.followUpNeeded && observation.followUpDate && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
                        <div className="font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Follow-up scheduled for: {observation.followUpDate.toLocaleDateString()}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-muted-foreground">
                        ID: {observation.id}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          {/* Interventions List */}
          <div className="space-y-4">
            {sessionLog.interventions.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Interventions</h3>
                    <p className="text-muted-foreground">
                      No interventions have been recorded for this session
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              sessionLog.interventions.map((intervention) => (
                <Card key={intervention.id} className={`border-l-4 ${getSeverityColor(intervention.severity).replace('bg-', 'border-l-').replace('-100', '-500')}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(intervention.severity)} variant="outline">
                            {intervention.severity}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {intervention.type}
                          </Badge>
                          <Badge variant={
                            intervention.outcome === 'successful' ? 'default' :
                            intervention.outcome === 'unsuccessful' ? 'destructive' :
                            intervention.outcome === 'partially_successful' ? 'secondary' : 'outline'
                          }>
                            {intervention.outcome.replace('_', ' ')}
                          </Badge>
                          {intervention.followUpRequired && (
                            <Badge variant={intervention.followUpCompleted ? 'default' : 'destructive'}>
                              Follow-up {intervention.followUpCompleted ? 'Complete' : 'Pending'}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium">Intervention: {intervention.participantName}</h4>
                        <p className="text-sm text-muted-foreground">{intervention.reason}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {intervention.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1">Action Taken:</div>
                        <p className="text-sm">{intervention.action}</p>
                      </div>
                      
                      {intervention.followUpNotes && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <div className="text-sm font-medium mb-1">Follow-up Notes:</div>
                          <p className="text-sm">{intervention.followUpNotes}</p>
                        </div>
                      )}

                      {intervention.reviewedBy && (
                        <div className="text-xs text-muted-foreground">
                          Reviewed by: {intervention.reviewedBy} at {intervention.reviewTimestamp?.toLocaleString()}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          ID: {intervention.id}
                          {intervention.relatedIncidentId && ` • Related to incident: ${intervention.relatedIncidentId}`}
                        </div>
                        <div className="flex space-x-2">
                          {intervention.followUpRequired && !intervention.followUpCompleted && (
                            <Button variant="outline" size="sm">
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Complete Follow-up
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          {/* Incidents List */}
          <div className="space-y-4">
            {sessionLog.incidents.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Critical Incidents</h3>
                    <p className="text-muted-foreground">
                      No critical incidents have been reported for this session
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              sessionLog.incidents.map((incident) => (
                <Card key={incident.id} className="border-red-200 bg-red-50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive">
                            {incident.severity}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {incident.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant={
                            incident.reportStatus === 'resolved' ? 'default' :
                            incident.reportStatus === 'under_review' ? 'secondary' :
                            incident.reportStatus === 'submitted' ? 'outline' : 'destructive'
                          }>
                            {incident.reportStatus.replace('_', ' ')}
                          </Badge>
                          {incident.requiresExternalReport && (
                            <Badge variant="destructive">External Report Required</Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-red-800">{incident.title}</h4>
                        <p className="text-sm">
                          Reported by: {incident.reportedBy} at {incident.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium mb-2">Description:</div>
                        <p className="text-sm">{incident.description}</p>
                      </div>

                      {incident.involvedParticipants.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">Involved Participants:</div>
                          <div className="flex flex-wrap gap-1">
                            {incident.involvedParticipants.map((participantId) => (
                              <Badge key={participantId} variant="outline">
                                {participants.find(p => p.id === participantId)?.name || participantId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {incident.immediateActions.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">Immediate Actions Taken:</div>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {incident.immediateActions.map((action, index) => (
                              <li key={index}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {incident.followUpActions.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">Follow-up Actions:</div>
                          <div className="space-y-2">
                            {incident.followUpActions.map((followUp) => (
                              <div key={followUp.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="text-sm">
                                  <div className="font-medium">{followUp.action}</div>
                                  <div className="text-muted-foreground">
                                    Assigned to: {followUp.assignedTo} • Due: {followUp.dueDate.toLocaleDateString()}
                                  </div>
                                </div>
                                <Badge variant={followUp.completed ? 'default' : 'destructive'}>
                                  {followUp.completed ? 'Complete' : 'Pending'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          ID: {incident.id} • Confidentiality: {incident.confidentialityLevel}
                        </div>
                        <div className="flex space-x-2">
                          {incident.legalImplications && (
                            <Badge variant="destructive" className="text-xs">Legal Review Required</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Analytics Dashboard */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Observation Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['positive', 'concern', 'neutral', 'achievement'].map(category => {
                    const count = sessionLog.observations.filter(obs => obs.category === category).length;
                    const percentage = sessionLog.observations.length > 0 ? 
                      Math.round((count / sessionLog.observations.length) * 100) : 0;
                    
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded ${getCategoryColor(category).replace('text-', 'bg-').replace('-800', '-500')}`} />
                          <span className="capitalize">{category}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{count}</span>
                          <span className="text-muted-foreground ml-1">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Intervention Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['successful', 'partially_successful', 'unsuccessful', 'pending'].map(outcome => {
                    const count = sessionLog.interventions.filter(int => int.outcome === outcome).length;
                    const percentage = sessionLog.interventions.length > 0 ? 
                      Math.round((count / sessionLog.interventions.length) * 100) : 0;
                    
                    return (
                      <div key={outcome} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded ${
                            outcome === 'successful' ? 'bg-green-500' :
                            outcome === 'unsuccessful' ? 'bg-red-500' :
                            outcome === 'partially_successful' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`} />
                          <span className="capitalize">{outcome.replace('_', ' ')}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{count}</span>
                          <span className="text-muted-foreground ml-1">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Participant Documentation Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Participant Documentation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessionLog.participants.map((participant) => {
                  const observations = sessionLog.observations.filter(obs => obs.participantId === participant.id);
                  const interventions = sessionLog.interventions.filter(int => int.participantId === participant.id);
                  
                  return (
                    <div key={participant.id} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{participant.name}</h4>
                        <Badge variant="outline">{participant.role}</Badge>
                      </div>
                      
                      <div className="grid gap-3 md:grid-cols-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Observations</div>
                          <div className="font-medium">{observations.length}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Interventions</div>
                          <div className="font-medium">{interventions.length}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Engagement</div>
                          <div className="font-medium">{participant.engagementScore}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Achievements</div>
                          <div className="font-medium">{participant.achievementsEarned.length}</div>
                        </div>
                      </div>
                      
                      {(observations.length > 0 || interventions.length > 0) && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm">
                            <span className="font-medium">Latest note:</span>
                            <span className="text-muted-foreground ml-2">
                              {observations.length > 0 
                                ? observations[0].title
                                : interventions.length > 0 
                                ? interventions[0].reason
                                : 'No recent notes'
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Critical Incident Report Dialog */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Report Critical Incident
            </DialogTitle>
            <DialogDescription>
              Document a critical incident that occurred during this session. This will create an official report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Incident Type</label>
                <Select value={incidentType} onValueChange={(value: any) => setIncidentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safety_concern">Safety Concern</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="policy_violation">Policy Violation</SelectItem>
                    <SelectItem value="technical_failure">Technical Failure</SelectItem>
                    <SelectItem value="emergency_situation">Emergency Situation</SelectItem>
                    <SelectItem value="data_breach">Data Breach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity</label>
                <Select value={incidentSeverity} onValueChange={(value: any) => setIncidentSeverity(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Incident Title</label>
              <Input
                placeholder="Brief summary of the incident"
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Detailed Description</label>
              <Textarea
                placeholder="Provide a detailed description of what happened, when it occurred, and any immediate actions taken..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Involved Participants</label>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`participant-${participant.id}`}
                      checked={involvedParticipants.includes(participant.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setInvolvedParticipants(prev => [...prev, participant.id]);
                        } else {
                          setInvolvedParticipants(prev => prev.filter(id => id !== participant.id));
                        }
                      }}
                    />
                    <label htmlFor={`participant-${participant.id}`} className="text-sm">
                      {participant.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {incidentSeverity === 'severe' || incidentType === 'safety_concern' 
                  ? 'This incident requires immediate external reporting and administrative review.'
                  : 'This incident will be logged and reviewed according to institutional policy.'
                }
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowIncidentDialog(false);
              setIncidentTitle('');
              setIncidentDescription('');
              setInvolvedParticipants([]);
            }}>
              Cancel
            </Button>
            <Button onClick={reportCriticalIncident} className="bg-red-600 hover:bg-red-700">
              <Flag className="h-4 w-4 mr-2" />
              Submit Incident Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Session Documentation</DialogTitle>
            <DialogDescription>
              Choose the format and scope for exporting session documentation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <div className="grid gap-2 md:grid-cols-3">
                <Button variant="outline" onClick={() => exportSessionLog('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF Report
                </Button>
                <Button variant="outline" onClick={() => exportSessionLog('csv')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  CSV Data
                </Button>
                <Button variant="outline" onClick={() => exportSessionLog('json')}>
                  <Download className="h-4 w-4 mr-2" />
                  JSON Archive
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Include</label>
              <div className="space-y-2">
                {['Observations', 'Interventions', 'Critical Incidents', 'Analytics', 'Participant Data'].map((item) => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox id={item} defaultChecked />
                    <label htmlFor={item} className="text-sm">{item}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
