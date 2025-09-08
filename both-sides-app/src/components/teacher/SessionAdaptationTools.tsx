/**
 * Session Adaptation Tools Component
 * 
 * Task 8.4.2: Dynamic session modification based on participant needs,
 * difficulty adjustment for topics or time constraints, and alternative activities
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Compass,
  Settings,
  Zap,
  Target,
  Brain,
  Lightbulb,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Shuffle,
  RefreshCw,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  FastForward,
  Rewind,
  Activity,
  Gauge,
  Sliders,
  Layers,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Edit,
  Copy,
  Share2,
  BookOpen,
  GraduationCap,
  Award,
  Star,
  CheckCircle2,
  AlertTriangle,
  Info,
  HelpCircle,
  MessageSquare,
  Mic,
  Volume2,
  Camera,
  Eye,
  Headphones,
  Puzzle,
  Key,
  Map,
  Route,
  Navigation,
  Filter,
  Search,
  Download,
  Upload,
  Save,
  Undo,
  Redo
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface SessionConfiguration {
  id: string;
  name: string;
  description: string;
  currentDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  phases: SessionPhase[];
  adaptiveSettings: AdaptiveSettings;
  participantGroups: ParticipantGroup[];
  alternatives: AlternativeActivity[];
  modificationHistory: SessionModification[];
}

interface SessionPhase {
  id: string;
  name: string;
  description: string;
  type: 'discussion' | 'research' | 'argument' | 'reflection' | 'collaboration' | 'presentation';
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  requirements: string[];
  adaptations: PhaseAdaptation[];
  isActive: boolean;
  isCompleted: boolean;
  canSkip: boolean;
  canModify: boolean;
}

interface PhaseAdaptation {
  trigger: 'difficulty_too_high' | 'difficulty_too_low' | 'time_pressure' | 'engagement_low' | 'skill_gap' | 'manual';
  modification: 'extend_time' | 'reduce_complexity' | 'add_scaffolding' | 'change_format' | 'provide_resources' | 'split_groups';
  description: string;
  estimatedImpact: 'minor' | 'moderate' | 'significant';
  implementationTime: number; // minutes
}

interface AdaptiveSettings {
  autoAdjustment: boolean;
  difficultyRange: {
    min: 'beginner' | 'intermediate';
    max: 'intermediate' | 'advanced';
  };
  timeFlexibility: number; // percentage (0-50%)
  groupSizeFlexibility: boolean;
  contentSubstitution: boolean;
  emergencyAlternatives: boolean;
  participantFeedbackTriggers: boolean;
}

interface ParticipantGroup {
  id: string;
  name: string;
  type: 'skill_based' | 'mixed' | 'interest_based' | 'random' | 'support_needed';
  participants: string[];
  currentActivity: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  adaptations: GroupAdaptation[];
  performance: GroupPerformance;
}

interface GroupAdaptation {
  id: string;
  type: 'scaffolding' | 'acceleration' | 'peer_support' | 'individual_attention' | 'alternative_format';
  description: string;
  appliedAt: Date;
  effectiveness: 'effective' | 'partial' | 'ineffective' | 'pending';
  notes: string;
}

interface GroupPerformance {
  averageEngagement: number; // 0-100
  skillDemonstration: number; // 0-100
  collaborationQuality: number; // 0-100
  needsSupport: boolean;
  readyForChallenge: boolean;
  suggestedAdaptations: string[];
}

interface AlternativeActivity {
  id: string;
  name: string;
  description: string;
  purpose: string;
  duration: number; // minutes
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'any';
  participantRange: {
    min: number;
    max: number;
  };
  materials: string[];
  instructions: string[];
  objectives: string[];
  assessmentCriteria: string[];
  whenToUse: string[];
  category: 'engagement_boost' | 'skill_building' | 'problem_solving' | 'collaboration' | 'reflection' | 'energy_management';
}

interface SessionModification {
  id: string;
  timestamp: Date;
  type: 'difficulty_adjustment' | 'time_modification' | 'phase_change' | 'group_restructure' | 'activity_substitution' | 'emergency_adaptation';
  description: string;
  reason: string;
  trigger: 'manual' | 'automatic' | 'participant_feedback' | 'performance_data';
  affectedElements: string[];
  beforeState: any;
  afterState: any;
  effectiveness?: 'positive' | 'negative' | 'neutral' | 'pending';
  participantFeedback?: string;
  teacherNotes?: string;
}

interface SessionAdaptationToolsProps {
  sessionId: string;
  participants: any[];
  currentPhase: string;
  sessionConfig: SessionConfiguration;
  onConfigurationChange?: (config: SessionConfiguration) => void;
  onPhaseModification?: (phaseId: string, modification: any) => void;
  onActivitySubstitution?: (originalActivity: string, newActivity: AlternativeActivity) => void;
}

export function SessionAdaptationTools({
  sessionId,
  participants = [],
  currentPhase,
  sessionConfig,
  onConfigurationChange,
  onPhaseModification,
  onActivitySubstitution
}: SessionAdaptationToolsProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [sessionState, setSessionState] = useState<SessionConfiguration>(sessionConfig || {
    id: sessionId,
    name: 'Climate Policy Debate',
    description: 'Structured debate on climate change policy solutions',
    currentDifficulty: 'intermediate',
    phases: [],
    adaptiveSettings: {
      autoAdjustment: true,
      difficultyRange: { min: 'beginner', max: 'advanced' },
      timeFlexibility: 25,
      groupSizeFlexibility: true,
      contentSubstitution: true,
      emergencyAlternatives: true,
      participantFeedbackTriggers: true
    },
    participantGroups: [],
    alternatives: [],
    modificationHistory: []
  });

  const [adaptationSuggestions, setAdaptationSuggestions] = useState<any[]>([]);
  const [alternativeActivities, setAlternativeActivities] = useState<AlternativeActivity[]>([]);
  const [showAdaptDialog, setShowAdaptDialog] = useState(false);
  const [showAlternativeDialog, setShowAlternativeDialog] = useState(false);
  const [selectedAdaptation, setSelectedAdaptation] = useState<any>(null);
  const [selectedAlternative, setSelectedAlternative] = useState<AlternativeActivity | null>(null);
  
  // Modification states
  const [difficultyAdjustment, setDifficultyAdjustment] = useState(0); // -2 to +2
  const [timeAdjustment, setTimeAdjustment] = useState(0); // percentage change
  const [customModification, setCustomModification] = useState({
    description: '',
    reason: '',
    affectedElements: [] as string[]
  });

  useEffect(() => {
    initializeSessionData();
    loadAlternativeActivities();
    
    // Auto-analyze every 30 seconds if enabled
    if (sessionState.adaptiveSettings.autoAdjustment) {
      const interval = setInterval(analyzeSessionForAdaptations, 30000);
      return () => clearInterval(interval);
    }
  }, [sessionState.adaptiveSettings.autoAdjustment]);

  const initializeSessionData = () => {
    // Mock session phases
    const phases: SessionPhase[] = [
      {
        id: '1',
        name: 'Opening Statements',
        description: 'Present initial positions on climate policy',
        type: 'presentation',
        duration: 15,
        difficulty: 'intermediate',
        requirements: ['Clear position', 'Evidence support', 'Time management'],
        adaptations: [
          {
            trigger: 'difficulty_too_high',
            modification: 'add_scaffolding',
            description: 'Provide statement templates and examples',
            estimatedImpact: 'moderate',
            implementationTime: 2
          },
          {
            trigger: 'time_pressure',
            modification: 'extend_time',
            description: 'Add 5 minutes for preparation',
            estimatedImpact: 'minor',
            implementationTime: 1
          }
        ],
        isActive: true,
        isCompleted: false,
        canSkip: false,
        canModify: true
      },
      {
        id: '2',
        name: 'Cross-Examination',
        description: 'Question and challenge opposing positions',
        type: 'discussion',
        duration: 20,
        difficulty: 'advanced',
        requirements: ['Active listening', 'Critical questioning', 'Respectful challenge'],
        adaptations: [
          {
            trigger: 'difficulty_too_high',
            modification: 'reduce_complexity',
            description: 'Provide question stems and examples',
            estimatedImpact: 'moderate',
            implementationTime: 3
          },
          {
            trigger: 'engagement_low',
            modification: 'change_format',
            description: 'Switch to structured Q&A rounds',
            estimatedImpact: 'significant',
            implementationTime: 5
          }
        ],
        isActive: false,
        isCompleted: false,
        canSkip: true,
        canModify: true
      },
      {
        id: '3',
        name: 'Collaborative Solution Building',
        description: 'Work together to find common ground solutions',
        type: 'collaboration',
        duration: 25,
        difficulty: 'advanced',
        requirements: ['Synthesis skills', 'Compromise', 'Creative thinking'],
        adaptations: [
          {
            trigger: 'skill_gap',
            modification: 'split_groups',
            description: 'Create mixed-skill collaboration groups',
            estimatedImpact: 'significant',
            implementationTime: 4
          }
        ],
        isActive: false,
        isCompleted: false,
        canSkip: false,
        canModify: true
      }
    ];

    // Mock participant groups
    const groups: ParticipantGroup[] = [
      {
        id: '1',
        name: 'Pro-Policy Group',
        type: 'mixed',
        participants: participants.slice(0, Math.ceil(participants.length / 2)).map(p => p.id),
        currentActivity: 'Opening Statements',
        difficultyLevel: 'intermediate',
        adaptations: [],
        performance: {
          averageEngagement: 85,
          skillDemonstration: 78,
          collaborationQuality: 82,
          needsSupport: false,
          readyForChallenge: true,
          suggestedAdaptations: ['Increase complexity', 'Add leadership roles']
        }
      },
      {
        id: '2',
        name: 'Con-Policy Group',
        type: 'mixed',
        participants: participants.slice(Math.ceil(participants.length / 2)).map(p => p.id),
        currentActivity: 'Opening Statements',
        difficultyLevel: 'intermediate',
        adaptations: [],
        performance: {
          averageEngagement: 65,
          skillDemonstration: 58,
          collaborationQuality: 72,
          needsSupport: true,
          readyForChallenge: false,
          suggestedAdaptations: ['Provide scaffolding', 'Add peer support', 'Simplify requirements']
        }
      }
    ];

    setSessionState(prev => ({
      ...prev,
      phases,
      participantGroups: groups
    }));
  };

  const loadAlternativeActivities = () => {
    const alternatives: AlternativeActivity[] = [
      {
        id: '1',
        name: 'Evidence Gallery Walk',
        description: 'Participants review and discuss evidence stations around the room',
        purpose: 'Build evidence evaluation skills and increase engagement',
        duration: 15,
        skillLevel: 'any',
        participantRange: { min: 4, max: 20 },
        materials: ['Evidence cards', 'Sticky notes', 'Chart paper'],
        instructions: [
          'Set up evidence stations around the room',
          'Participants rotate through stations in pairs',
          'At each station, evaluate evidence quality and relevance',
          'Leave feedback on sticky notes',
          'Debrief strongest and weakest evidence found'
        ],
        objectives: ['Evaluate source credibility', 'Identify relevant evidence', 'Practice peer feedback'],
        assessmentCriteria: ['Quality of evidence evaluation', 'Constructive feedback', 'Participation'],
        whenToUse: ['Low engagement', 'Need evidence skills', 'Energy boost needed'],
        category: 'skill_building'
      },
      {
        id: '2',
        name: 'Perspective Swap Challenge',
        description: 'Participants temporarily argue for the opposite position',
        purpose: 'Develop empathy and understanding of multiple viewpoints',
        duration: 20,
        skillLevel: 'intermediate',
        participantRange: { min: 6, max: 12 },
        materials: ['Position cards', 'Timer', 'Reflection sheets'],
        instructions: [
          'Assign participants to argue opposite their original position',
          'Give 5 minutes to prepare strongest opposing arguments',
          'Conduct mini-debates with swapped positions',
          'Reflect on what they learned about the other side',
          'Return to original positions with new insights'
        ],
        objectives: ['Understand opposing viewpoints', 'Practice intellectual flexibility', 'Build empathy'],
        assessmentCriteria: ['Quality of opposing arguments', 'Thoughtful reflection', 'Integration of new perspectives'],
        whenToUse: ['Polarized discussion', 'Need perspective-taking', 'Stubbornness detected'],
        category: 'problem_solving'
      },
      {
        id: '3',
        name: 'Collaborative Solution Matrix',
        description: 'Create a visual matrix of problems and potential solutions',
        purpose: 'Organize thinking and find creative compromise solutions',
        duration: 25,
        skillLevel: 'advanced',
        participantRange: { min: 4, max: 16 },
        materials: ['Large grid paper', 'Colored markers', 'Solution cards'],
        instructions: [
          'Create matrix with problems on Y-axis, solutions on X-axis',
          'Fill in cells with feasibility scores (1-5)',
          'Identify highest-scoring solution combinations',
          'Develop implementation plans for top solutions',
          'Present matrix and recommendations to class'
        ],
        objectives: ['Systematic problem analysis', 'Creative solution generation', 'Collaborative decision making'],
        assessmentCriteria: ['Thoroughness of analysis', 'Creativity of solutions', 'Quality of collaboration'],
        whenToUse: ['Need systematic approach', 'Multiple complex solutions', 'Synthesis challenge'],
        category: 'collaboration'
      },
      {
        id: '4',
        name: 'One-Minute Elevator Pitch',
        description: 'Rapid-fire practice of persuasive communication',
        purpose: 'Build confidence and concise communication skills',
        duration: 10,
        skillLevel: 'beginner',
        participantRange: { min: 3, max: 15 },
        materials: ['Timer', 'Topic cards', 'Feedback forms'],
        instructions: [
          'Each participant gets a different aspect of the topic',
          'One minute to prepare elevator pitch',
          'Present 60-second pitch to convince "investor"',
          'Audience provides immediate thumbs up/down feedback',
          'Quick debrief on most persuasive techniques'
        ],
        objectives: ['Concise communication', 'Persuasive techniques', 'Confidence building'],
        assessmentCriteria: ['Clarity of message', 'Persuasive impact', 'Time management'],
        whenToUse: ['Low confidence', 'Need communication practice', 'Energy boost'],
        category: 'engagement_boost'
      },
      {
        id: '5',
        name: 'Mindful Reflection Circle',
        description: 'Structured reflection on learning and emotional responses',
        purpose: 'Process emotions and consolidate learning',
        duration: 15,
        skillLevel: 'any',
        participantRange: { min: 5, max: 20 },
        materials: ['Reflection prompts', 'Optional: soft music', 'Talking stick'],
        instructions: [
          'Sit in circle with talking stick or similar object',
          'Each person shares response to reflection prompt',
          'Listen without judgment or immediate response',
          'Pass talking stick to next person',
          'End with collective appreciation or insight'
        ],
        objectives: ['Self-awareness', 'Emotional processing', 'Learning consolidation'],
        assessmentCriteria: ['Thoughtful reflection', 'Respectful listening', 'Authentic sharing'],
        whenToUse: ['High tension', 'Need processing time', 'End of difficult topic'],
        category: 'reflection'
      }
    ];

    setAlternativeActivities(alternatives);
  };

  const analyzeSessionForAdaptations = () => {
    const suggestions: any[] = [];

    // Analyze participant groups for adaptation needs
    sessionState.participantGroups.forEach(group => {
      if (group.performance.needsSupport) {
        suggestions.push({
          id: `adapt_${Date.now()}_${group.id}`,
          type: 'group_support',
          priority: 'high',
          title: `${group.name} needs additional support`,
          description: `Group showing signs of struggle with average engagement at ${group.performance.averageEngagement}%`,
          suggestedAction: 'Provide scaffolding or reduce complexity',
          affectedElements: [group.id],
          estimatedTime: 3,
          autoApplicable: true
        });
      }

      if (group.performance.readyForChallenge && group.performance.averageEngagement > 90) {
        suggestions.push({
          id: `challenge_${Date.now()}_${group.id}`,
          type: 'increase_challenge',
          priority: 'medium',
          title: `${group.name} ready for increased challenge`,
          description: `High-performing group could benefit from advanced activities`,
          suggestedAction: 'Increase difficulty or add leadership roles',
          affectedElements: [group.id],
          estimatedTime: 2,
          autoApplicable: false
        });
      }
    });

    // Analyze phase progression
    const activePhase = sessionState.phases.find(p => p.isActive);
    if (activePhase && activePhase.difficulty === 'advanced') {
      const strugglingGroups = sessionState.participantGroups.filter(g => g.performance.needsSupport);
      if (strugglingGroups.length > 0) {
        suggestions.push({
          id: `phase_${Date.now()}_difficulty`,
          type: 'difficulty_adjustment',
          priority: 'high',
          title: 'Consider reducing phase difficulty',
          description: `${strugglingGroups.length} group(s) struggling with advanced content`,
          suggestedAction: 'Apply scaffolding adaptations or reduce complexity',
          affectedElements: [activePhase.id],
          estimatedTime: 5,
          autoApplicable: false
        });
      }
    }

    // Check for timing issues
    const averageEngagement = sessionState.participantGroups.reduce(
      (sum, group) => sum + group.performance.averageEngagement, 0
    ) / sessionState.participantGroups.length;

    if (averageEngagement < 60) {
      suggestions.push({
        id: `engagement_${Date.now()}`,
        type: 'engagement_boost',
        priority: 'high',
        title: 'Low overall engagement detected',
        description: `Average engagement at ${Math.round(averageEngagement)}%`,
        suggestedAction: 'Consider alternative activity or format change',
        affectedElements: ['current_phase'],
        estimatedTime: 10,
        autoApplicable: false
      });
    }

    setAdaptationSuggestions(suggestions);

    // Notify teacher of high-priority suggestions
    const highPriority = suggestions.filter(s => s.priority === 'high');
    if (highPriority.length > 0) {
      addNotification({
        type: 'warning',
        title: 'Session Adaptation Suggested',
        message: `${highPriority.length} high-priority adaptation(s) recommended`,
        read: false
      });
    }
  };

  const applyDifficultyAdjustment = (adjustment: number, reason: string) => {
    const currentPhase = sessionState.phases.find(p => p.isActive);
    if (!currentPhase) return;

    const difficultyLevels = ['beginner', 'intermediate', 'advanced'];
    const currentIndex = difficultyLevels.indexOf(currentPhase.difficulty);
    const newIndex = Math.max(0, Math.min(2, currentIndex + adjustment));
    const newDifficulty = difficultyLevels[newIndex] as 'beginner' | 'intermediate' | 'advanced';

    const modification: SessionModification = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'difficulty_adjustment',
      description: `Adjusted difficulty from ${currentPhase.difficulty} to ${newDifficulty}`,
      reason,
      trigger: 'manual',
      affectedElements: [currentPhase.id],
      beforeState: { difficulty: currentPhase.difficulty },
      afterState: { difficulty: newDifficulty }
    };

    // Update phase difficulty
    const updatedPhases = sessionState.phases.map(phase =>
      phase.id === currentPhase.id ? { ...phase, difficulty: newDifficulty } : phase
    );

    const updatedConfig = {
      ...sessionState,
      phases: updatedPhases,
      currentDifficulty: newDifficulty,
      modificationHistory: [...sessionState.modificationHistory, modification]
    };

    setSessionState(updatedConfig);
    onConfigurationChange?.(updatedConfig);

    addNotification({
      type: 'success',
      title: 'Difficulty Adjusted',
      message: `Phase difficulty changed to ${newDifficulty}`,
      read: false
    });
  };

  const applyTimeAdjustment = (percentage: number, reason: string) => {
    const currentPhase = sessionState.phases.find(p => p.isActive);
    if (!currentPhase) return;

    const originalDuration = currentPhase.duration;
    const newDuration = Math.round(originalDuration * (1 + percentage / 100));

    const modification: SessionModification = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'time_modification',
      description: `Adjusted phase duration from ${originalDuration} to ${newDuration} minutes`,
      reason,
      trigger: 'manual',
      affectedElements: [currentPhase.id],
      beforeState: { duration: originalDuration },
      afterState: { duration: newDuration }
    };

    const updatedPhases = sessionState.phases.map(phase =>
      phase.id === currentPhase.id ? { ...phase, duration: newDuration } : phase
    );

    const updatedConfig = {
      ...sessionState,
      phases: updatedPhases,
      modificationHistory: [...sessionState.modificationHistory, modification]
    };

    setSessionState(updatedConfig);
    onConfigurationChange?.(updatedConfig);

    addNotification({
      type: 'success',
      title: 'Time Adjusted',
      message: `Phase duration ${percentage > 0 ? 'increased' : 'decreased'} to ${newDuration} minutes`,
      read: false
    });
  };

  const applyAlternativeActivity = (alternative: AlternativeActivity, reason: string) => {
    const modification: SessionModification = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'activity_substitution',
      description: `Substituted current activity with "${alternative.name}"`,
      reason,
      trigger: 'manual',
      affectedElements: ['current_activity'],
      beforeState: { activity: 'original_activity' },
      afterState: { activity: alternative.name }
    };

    const updatedConfig = {
      ...sessionState,
      modificationHistory: [...sessionState.modificationHistory, modification]
    };

    setSessionState(updatedConfig);
    onActivitySubstitution?.(currentPhase, alternative);

    addNotification({
      type: 'success',
      title: 'Activity Substituted',
      message: `Switched to "${alternative.name}" (${alternative.duration} min)`,
      read: false
    });

    setShowAlternativeDialog(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Compass className="h-5 w-5 mr-2" />
            Session Adaptation Tools
          </h3>
          <p className="text-sm text-muted-foreground">
            Dynamic session modification based on participant needs and performance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            <Badge className={getDifficultyColor(sessionState.currentDifficulty)} variant="outline">
              {sessionState.currentDifficulty}
            </Badge>
            <Badge variant={sessionState.adaptiveSettings.autoAdjustment ? "default" : "secondary"}>
              {sessionState.adaptiveSettings.autoAdjustment ? 'Auto-adapt On' : 'Manual Only'}
            </Badge>
            {adaptationSuggestions.length > 0 && (
              <Badge variant="destructive">
                {adaptationSuggestions.length} Suggestions
              </Badge>
            )}
          </div>
          
          {/* Quick actions */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowAlternativeDialog(true)}>
              <Shuffle className="h-4 w-4 mr-2" />
              Alternative Activities
            </Button>
          </div>
        </div>
      </div>

      {/* Adaptation Suggestions Alert */}
      {adaptationSuggestions.filter(s => s.priority === 'high').length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{adaptationSuggestions.filter(s => s.priority === 'high').length} high priority adaptations</strong> recommended based on current session performance.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            Session Overview
          </TabsTrigger>
          <TabsTrigger value="adaptations">
            Quick Adaptations ({adaptationSuggestions.length})
          </TabsTrigger>
          <TabsTrigger value="alternatives">
            Alternative Activities ({alternativeActivities.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Modification History ({sessionState.modificationHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Session Status */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Current Session Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium">Overall Difficulty</div>
                    <Badge className={getDifficultyColor(sessionState.currentDifficulty)} variant="outline">
                      {sessionState.currentDifficulty}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Active Phase</div>
                    <div className="text-sm">
                      {sessionState.phases.find(p => p.isActive)?.name || 'No active phase'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Participants</div>
                    <div className="text-sm">{participants.length} total, {sessionState.participantGroups.length} groups</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Modifications Made</div>
                    <div className="text-sm">{sessionState.modificationHistory.length} changes</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Quick Adjustments</h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Card className="p-3">
                      <div className="text-center space-y-2">
                        <div className="text-sm font-medium">Difficulty</div>
                        <div className="flex justify-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => applyDifficultyAdjustment(-1, 'Manual difficulty reduction')}
                            disabled={sessionState.currentDifficulty === 'beginner'}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => applyDifficultyAdjustment(1, 'Manual difficulty increase')}
                            disabled={sessionState.currentDifficulty === 'advanced'}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-3">
                      <div className="text-center space-y-2">
                        <div className="text-sm font-medium">Time</div>
                        <div className="flex justify-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => applyTimeAdjustment(-20, 'Manual time reduction')}
                          >
                            <Clock className="h-4 w-4" />
                            -20%
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => applyTimeAdjustment(25, 'Manual time extension')}
                          >
                            <Clock className="h-4 w-4" />
                            +25%
                          </Button>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-3">
                      <div className="text-center space-y-2">
                        <div className="text-sm font-medium">Activity</div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setShowAlternativeDialog(true)}
                        >
                          <Shuffle className="h-4 w-4" />
                          Switch
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Group Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sessionState.participantGroups.map((group) => (
                  <div key={group.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{group.name}</h4>
                      <Badge className={getDifficultyColor(group.difficultyLevel)} variant="outline">
                        {group.difficultyLevel}
                      </Badge>
                    </div>
                    
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Engagement</div>
                        <div className={getPerformanceColor(group.performance.averageEngagement)}>
                          {group.performance.averageEngagement}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Skills</div>
                        <div className={getPerformanceColor(group.performance.skillDemonstration)}>
                          {group.performance.skillDemonstration}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Collaboration</div>
                        <div className={getPerformanceColor(group.performance.collaborationQuality)}>
                          {group.performance.collaborationQuality}%
                        </div>
                      </div>
                    </div>

                    {(group.performance.needsSupport || group.performance.readyForChallenge) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {group.performance.needsSupport && (
                          <Badge variant="destructive" className="text-xs">Needs Support</Badge>
                        )}
                        {group.performance.readyForChallenge && (
                          <Badge variant="default" className="text-xs">Ready for Challenge</Badge>
                        )}
                      </div>
                    )}

                    {group.performance.suggestedAdaptations.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Suggested: {group.performance.suggestedAdaptations.slice(0, 2).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Phase Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Layers className="h-5 w-5 mr-2" />
                Session Phases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessionState.phases.map((phase, index) => (
                  <div key={phase.id} className={`border rounded p-4 ${
                    phase.isActive ? 'border-blue-300 bg-blue-50' : 
                    phase.isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{phase.name}</span>
                          <Badge className={getDifficultyColor(phase.difficulty)} variant="outline">
                            {phase.difficulty}
                          </Badge>
                          <Badge variant="outline">{phase.duration}min</Badge>
                          {phase.isActive && <Badge variant="default">Active</Badge>}
                          {phase.isCompleted && <Badge className="bg-green-100 text-green-800">Completed</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{phase.description}</p>
                        <div className="text-xs text-muted-foreground">
                          Requirements: {phase.requirements.join(', ')}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {phase.adaptations.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {phase.adaptations.length} adaptations available
                          </Badge>
                        )}
                        {phase.canModify && (
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adaptations" className="space-y-4">
          {/* Adaptation Suggestions */}
          <div className="space-y-4">
            {adaptationSuggestions.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Adaptations Needed</h3>
                    <p className="text-muted-foreground">
                      Session is running smoothly. Adaptations will appear here if needed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              adaptationSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className={`border-l-4 ${
                  suggestion.priority === 'high' ? 'border-l-red-500' :
                  suggestion.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(suggestion.priority)} variant="outline">
                            {suggestion.priority} priority
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {suggestion.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <h4 className="font-medium">{suggestion.title}</h4>
                        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        ~{suggestion.estimatedTime}min
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 rounded">
                        <div className="text-sm font-medium mb-1">Suggested Action:</div>
                        <div className="text-sm">{suggestion.suggestedAction}</div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Affects: {suggestion.affectedElements.join(', ')}
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => {
                              // Apply the suggested adaptation
                              if (suggestion.type === 'difficulty_adjustment') {
                                applyDifficultyAdjustment(-1, suggestion.title);
                              } else if (suggestion.type === 'engagement_boost') {
                                setShowAlternativeDialog(true);
                              }
                              
                              // Remove from suggestions
                              setAdaptationSuggestions(prev => 
                                prev.filter(s => s.id !== suggestion.id)
                              );
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="alternatives" className="space-y-4">
          {/* Alternative Activities */}
          <div className="grid gap-4 md:grid-cols-2">
            {alternativeActivities.map((activity) => (
              <Card key={activity.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{activity.name}</CardTitle>
                      <CardDescription>{activity.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getDifficultyColor(activity.skillLevel)} variant="outline">
                        {activity.skillLevel}
                      </Badge>
                      <Badge variant="secondary">{activity.duration}min</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm">
                    <div className="font-medium mb-1">Purpose:</div>
                    <div className="text-muted-foreground">{activity.purpose}</div>
                  </div>

                  <div className="text-sm">
                    <div className="font-medium mb-1">When to Use:</div>
                    <div className="flex flex-wrap gap-1">
                      {activity.whenToUse.slice(0, 3).map((use, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {use}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 text-sm">
                    <div>
                      <span className="font-medium">Participants:</span> {activity.participantRange.min}-{activity.participantRange.max}
                    </div>
                    <div>
                      <span className="font-medium">Materials:</span> {activity.materials.length} items
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedAlternative(activity);
                        setShowAdaptDialog(true);
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Use Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Modification History */}
          <div className="space-y-4">
            {sessionState.modificationHistory.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Modifications Yet</h3>
                    <p className="text-muted-foreground">
                      Session adaptations and modifications will be logged here
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              sessionState.modificationHistory.map((modification) => (
                <Card key={modification.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="capitalize">
                            {modification.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary">
                            {modification.trigger}
                          </Badge>
                          {modification.effectiveness && (
                            <Badge variant={
                              modification.effectiveness === 'positive' ? 'default' :
                              modification.effectiveness === 'negative' ? 'destructive' : 'secondary'
                            } className="text-xs">
                              {modification.effectiveness}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{modification.description}</h4>
                        <p className="text-sm text-muted-foreground">{modification.reason}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {modification.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="font-medium">Affected:</span> {modification.affectedElements.join(', ')}
                      </div>
                      {modification.teacherNotes && (
                        <div className="p-2 bg-gray-50 rounded">
                          <span className="font-medium">Notes:</span> {modification.teacherNotes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Adaptation Dialog */}
      <Dialog open={showAdaptDialog} onOpenChange={setShowAdaptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply Alternative Activity</DialogTitle>
            <DialogDescription>
              {selectedAlternative && `Switch to "${selectedAlternative.name}" for the current phase`}
            </DialogDescription>
          </DialogHeader>
          {selectedAlternative && (
            <div className="space-y-4 py-4">
              <div className="p-4 border rounded bg-blue-50">
                <h4 className="font-medium mb-2">{selectedAlternative.name}</h4>
                <p className="text-sm mb-2">{selectedAlternative.description}</p>
                <div className="grid gap-2 md:grid-cols-2 text-sm">
                  <div><strong>Duration:</strong> {selectedAlternative.duration} minutes</div>
                  <div><strong>Skill Level:</strong> {selectedAlternative.skillLevel}</div>
                  <div><strong>Participants:</strong> {selectedAlternative.participantRange.min}-{selectedAlternative.participantRange.max}</div>
                  <div><strong>Materials:</strong> {selectedAlternative.materials.length} items</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for Switch</label>
                <Textarea
                  placeholder="Why are you switching to this activity?"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAdaptDialog(false);
              setSelectedAlternative(null);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedAlternative) {
                applyAlternativeActivity(selectedAlternative, 'Manual activity substitution');
              }
            }}>
              <Shuffle className="h-4 w-4 mr-2" />
              Switch Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alternative Activities Dialog */}
      <Dialog open={showAlternativeDialog} onOpenChange={setShowAlternativeDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Alternative Activities Library</DialogTitle>
            <DialogDescription>
              Choose from research-backed activities designed for different learning needs
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[60vh]">
              <div className="grid gap-4 md:grid-cols-2">
                {alternativeActivities.map((activity) => (
                  <Card key={activity.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{activity.name}</CardTitle>
                        <CardDescription>{activity.purpose}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <Badge className={getDifficultyColor(activity.skillLevel)} variant="outline">
                          {activity.skillLevel}
                        </Badge>
                        <span>{activity.duration} minutes</span>
                      </div>
                      
                      <div className="text-sm">
                        <div className="font-medium mb-1">Best for:</div>
                        <div className="text-muted-foreground">
                          {activity.whenToUse.slice(0, 2).join(', ')}
                        </div>
                      </div>

                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setSelectedAlternative(activity);
                          setShowAlternativeDialog(false);
                          setShowAdaptDialog(true);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Use This Activity
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
