/**
 * Recording Analytics Component
 * 
 * Task 8.4.3: Advanced session analysis with participation patterns,
 * quality metrics, educational effectiveness tracking, and comparative insights
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { 
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Activity,
  Users,
  Clock,
  Target,
  Award,
  Brain,
  MessageSquare,
  Volume2,
  Eye,
  Star,
  Zap,
  Filter,
  Search,
  Download,
  Share2,
  RefreshCw,
  Calendar,
  Settings,
  Info,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Minus,
  MoreHorizontal,
  FileText,
  Database,
  Lightbulb,
  Flag,
  BookOpen,
  Microscope,
  Gauge,
  Radar as RadarIcon,
  ChevronUp,
  ChevronDown,
  Equal
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface AnalyticsSession {
  id: string;
  sessionTitle: string;
  date: Date;
  duration: number; // seconds
  participants: AnalyticsParticipant[];
  metrics: SessionMetrics;
  qualityScores: QualityScores;
  engagementPatterns: EngagementPattern[];
  learningOutcomes: LearningOutcome[];
  keyMoments: KeyMoment[];
  comparisonBaseline: ComparisonData;
}

interface AnalyticsParticipant {
  id: string;
  name: string;
  role: string;
  demographics?: {
    gradeLevel?: string;
    previousExperience?: 'none' | 'beginner' | 'intermediate' | 'advanced';
  };
  performance: ParticipantPerformance;
  engagement: EngagementData;
  skills: SkillAssessment;
  growth: GrowthMetrics;
}

interface SessionMetrics {
  overallEngagement: number; // 0-100
  participationBalance: number; // 0-100 (100 = perfectly balanced)
  averageSpeakingTime: number; // seconds per participant
  messageQuality: number; // 0-100
  respectfulnessScore: number; // 0-100
  evidenceUseScore: number; // 0-100
  criticalThinkingScore: number; // 0-100
  collaborationScore: number; // 0-100
  completionRate: number; // 0-100
  technicalQuality: number; // 0-100
}

interface QualityScores {
  contentDepth: number; // 0-100
  argumentStrength: number; // 0-100
  sourceCredibility: number; // 0-100
  logicalReasoning: number; // 0-100
  perspectiveTaking: number; // 0-100
  communicationClarity: number; // 0-100
  activeListening: number; // 0-100
  constructiveFeedback: number; // 0-100
  timeManagement: number; // 0-100
  rulesAdherence: number; // 0-100
}

interface EngagementPattern {
  timestamp: number;
  overallEngagement: number;
  participantEngagement: Record<string, number>;
  phase: string;
  events: string[];
  mood: 'positive' | 'neutral' | 'negative';
  energyLevel: 'low' | 'medium' | 'high';
}

interface LearningOutcome {
  objective: string;
  targetLevel: 'basic' | 'intermediate' | 'advanced' | 'mastery';
  achievedLevel: 'basic' | 'intermediate' | 'advanced' | 'mastery';
  evidence: string[];
  participants: string[]; // IDs of participants who achieved this
  assessmentMethod: 'observation' | 'rubric' | 'peer_feedback' | 'self_assessment';
  confidence: number; // 0-100
}

interface KeyMoment {
  timestamp: number;
  type: 'breakthrough' | 'misconception' | 'conflict' | 'collaboration' | 'insight' | 'skill_demo';
  title: string;
  description: string;
  participants: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  learningValue: number; // 0-100
  followUpSuggestions: string[];
}

interface ParticipantPerformance {
  speakingTime: number; // seconds
  messageCount: number;
  averageMessageLength: number; // words
  questionsAsked: number;
  questionsAnswered: number;
  evidenceCitations: number;
  argumentsPresented: number;
  rebuttalsGiven: number;
  collaborativeActions: number;
  respectfulnessViolations: number;
}

interface EngagementData {
  overallScore: number; // 0-100
  consistency: number; // 0-100
  peakEngagement: number; // 0-100
  lowEngagement: number; // 0-100
  engagementTrend: 'improving' | 'declining' | 'stable';
  attentionSpan: number; // seconds
  participationRate: number; // 0-100
}

interface SkillAssessment {
  criticalThinking: number; // 0-100
  communication: number; // 0-100
  collaboration: number; // 0-100
  research: number; // 0-100
  empathy: number; // 0-100
  creativity: number; // 0-100
  leadership: number; // 0-100
  adaptability: number; // 0-100
  timeManagement: number; // 0-100
  selfReflection: number; // 0-100
}

interface GrowthMetrics {
  previousSessions: number;
  improvementRate: number; // % improvement per session
  skillGrowthAreas: string[];
  strugglingAreas: string[];
  recommendedFocus: string[];
  nextLevelReadiness: number; // 0-100
}

interface ComparisonData {
  classAverage: Partial<SessionMetrics>;
  schoolAverage: Partial<SessionMetrics>;
  nationalBenchmark: Partial<SessionMetrics>;
  previousSessions: Partial<SessionMetrics>[];
}

interface AnalyticsFilters {
  dateRange: { start: Date; end: Date };
  participants: string[];
  sessionTypes: string[];
  subjects: string[];
  gradeLevel: string;
  minDuration: number;
  maxDuration: number;
}

interface InsightRecommendation {
  type: 'strength' | 'concern' | 'opportunity' | 'trend' | 'comparison';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  evidence: string[];
  actionItems: string[];
  expectedImpact: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short_term' | 'long_term';
}

interface RecordingAnalyticsProps {
  sessionIds?: string[];
  participantIds?: string[];
  dateRange?: { start: Date; end: Date };
  initialView?: 'overview' | 'session' | 'participant' | 'trends' | 'insights';
}

export function RecordingAnalytics({
  sessionIds = [],
  participantIds = [],
  dateRange,
  initialView = 'overview'
}: RecordingAnalyticsProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState(initialView);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSession[]>([]);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: dateRange || { 
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      end: new Date() 
    },
    participants: participantIds,
    sessionTypes: [],
    subjects: [],
    gradeLevel: '',
    minDuration: 0,
    maxDuration: 7200 // 2 hours
  });
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightRecommendation[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
    generateInsights();
  }, [filters]);

  const loadAnalyticsData = () => {
    // Generate mock analytics data
    const mockSessions: AnalyticsSession[] = [
      {
        id: 'session_1',
        sessionTitle: 'Climate Change Policy Debate',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        duration: 3600,
        participants: [
          {
            id: 'p1',
            name: 'Alice Johnson',
            role: 'Debater A',
            demographics: { gradeLevel: '10th', previousExperience: 'intermediate' },
            performance: {
              speakingTime: 1200,
              messageCount: 34,
              averageMessageLength: 45,
              questionsAsked: 8,
              questionsAnswered: 12,
              evidenceCitations: 15,
              argumentsPresented: 6,
              rebuttalsGiven: 9,
              collaborativeActions: 3,
              respectfulnessViolations: 0
            },
            engagement: {
              overallScore: 92,
              consistency: 85,
              peakEngagement: 98,
              lowEngagement: 72,
              engagementTrend: 'improving',
              attentionSpan: 280,
              participationRate: 89
            },
            skills: {
              criticalThinking: 88,
              communication: 85,
              collaboration: 78,
              research: 92,
              empathy: 82,
              creativity: 79,
              leadership: 75,
              adaptability: 83,
              timeManagement: 88,
              selfReflection: 86
            },
            growth: {
              previousSessions: 8,
              improvementRate: 12.5,
              skillGrowthAreas: ['Critical Thinking', 'Research Skills'],
              strugglingAreas: ['Time Management'],
              recommendedFocus: ['Leadership Development', 'Perspective Taking'],
              nextLevelReadiness: 78
            }
          },
          {
            id: 'p2',
            name: 'Bob Chen',
            role: 'Debater B',
            demographics: { gradeLevel: '10th', previousExperience: 'beginner' },
            performance: {
              speakingTime: 1150,
              messageCount: 29,
              averageMessageLength: 38,
              questionsAsked: 5,
              questionsAnswered: 10,
              evidenceCitations: 8,
              argumentsPresented: 5,
              rebuttalsGiven: 7,
              collaborativeActions: 5,
              respectfulnessViolations: 1
            },
            engagement: {
              overallScore: 76,
              consistency: 68,
              peakEngagement: 89,
              lowEngagement: 52,
              engagementTrend: 'stable',
              attentionSpan: 245,
              participationRate: 73
            },
            skills: {
              criticalThinking: 72,
              communication: 69,
              collaboration: 81,
              research: 65,
              empathy: 88,
              creativity: 74,
              leadership: 68,
              adaptability: 79,
              timeManagement: 71,
              selfReflection: 75
            },
            growth: {
              previousSessions: 3,
              improvementRate: 18.3,
              skillGrowthAreas: ['Communication', 'Research Skills'],
              strugglingAreas: ['Critical Thinking', 'Time Management'],
              recommendedFocus: ['Evidence Evaluation', 'Argument Structure'],
              nextLevelReadiness: 62
            }
          }
        ],
        metrics: {
          overallEngagement: 84,
          participationBalance: 92,
          averageSpeakingTime: 1175,
          messageQuality: 78,
          respectfulnessScore: 96,
          evidenceUseScore: 82,
          criticalThinkingScore: 80,
          collaborationScore: 79,
          completionRate: 98,
          technicalQuality: 94
        },
        qualityScores: {
          contentDepth: 85,
          argumentStrength: 79,
          sourceCredibility: 88,
          logicalReasoning: 82,
          perspectiveTaking: 76,
          communicationClarity: 83,
          activeListening: 81,
          constructiveFeedback: 74,
          timeManagement: 89,
          rulesAdherence: 93
        },
        engagementPatterns: generateMockEngagementPatterns(3600),
        learningOutcomes: [
          {
            objective: 'Critical Thinking',
            targetLevel: 'intermediate',
            achievedLevel: 'intermediate',
            evidence: ['Strong argument evaluation', 'Evidence synthesis'],
            participants: ['p1', 'p2'],
            assessmentMethod: 'observation',
            confidence: 85
          },
          {
            objective: 'Respectful Communication',
            targetLevel: 'advanced',
            achievedLevel: 'advanced',
            evidence: ['No interruptions', 'Constructive disagreement'],
            participants: ['p1', 'p2'],
            assessmentMethod: 'rubric',
            confidence: 92
          }
        ],
        keyMoments: [
          {
            timestamp: 1205,
            type: 'breakthrough',
            title: 'Perspective Shift Moment',
            description: 'Alice demonstrated genuine understanding of opposing economic arguments',
            participants: ['p1'],
            impact: 'high',
            learningValue: 94,
            followUpSuggestions: ['Explore economic policy further', 'Practice perspective-taking exercises']
          },
          {
            timestamp: 2180,
            type: 'collaboration',
            title: 'Constructive Building',
            description: 'Both participants built on each other\'s ideas to find common ground',
            participants: ['p1', 'p2'],
            impact: 'high',
            learningValue: 89,
            followUpSuggestions: ['Practice collaborative problem-solving', 'Explore consensus-building techniques']
          }
        ],
        comparisonBaseline: {
          classAverage: { overallEngagement: 78, respectfulnessScore: 87, criticalThinkingScore: 75 },
          schoolAverage: { overallEngagement: 72, respectfulnessScore: 84, criticalThinkingScore: 71 },
          nationalBenchmark: { overallEngagement: 68, respectfulnessScore: 79, criticalThinkingScore: 69 },
          previousSessions: [
            { overallEngagement: 76, respectfulnessScore: 89, criticalThinkingScore: 74 },
            { overallEngagement: 81, respectfulnessScore: 93, criticalThinkingScore: 77 }
          ]
        }
      },
      // Additional mock sessions would follow similar pattern...
      {
        id: 'session_2',
        sessionTitle: 'Technology and Privacy Rights',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        duration: 2700,
        participants: [
          // Abbreviated for space - would include full participant data
        ],
        metrics: {
          overallEngagement: 79,
          participationBalance: 87,
          averageSpeakingTime: 1000,
          messageQuality: 75,
          respectfulnessScore: 91,
          evidenceUseScore: 77,
          criticalThinkingScore: 74,
          collaborationScore: 82,
          completionRate: 95,
          technicalQuality: 89
        },
        qualityScores: {
          contentDepth: 78,
          argumentStrength: 73,
          sourceCredibility: 81,
          logicalReasoning: 76,
          perspectiveTaking: 79,
          communicationClarity: 80,
          activeListening: 83,
          constructiveFeedback: 77,
          timeManagement: 85,
          rulesAdherence: 88
        },
        engagementPatterns: generateMockEngagementPatterns(2700),
        learningOutcomes: [],
        keyMoments: [],
        comparisonBaseline: {
          classAverage: {},
          schoolAverage: {},
          nationalBenchmark: {},
          previousSessions: []
        }
      } as AnalyticsSession
    ];

    setAnalyticsData(mockSessions);
  };

  const generateMockEngagementPatterns = (duration: number): EngagementPattern[] => {
    const patterns: EngagementPattern[] = [];
    const intervalSeconds = 60; // One data point per minute

    for (let t = 0; t < duration; t += intervalSeconds) {
      patterns.push({
        timestamp: t,
        overallEngagement: Math.max(20, Math.min(100, 75 + Math.sin(t / 300) * 15 + (Math.random() - 0.5) * 20)),
        participantEngagement: {
          'p1': Math.max(20, Math.min(100, 80 + Math.sin(t / 400) * 12 + (Math.random() - 0.5) * 15)),
          'p2': Math.max(20, Math.min(100, 70 + Math.cos(t / 350) * 18 + (Math.random() - 0.5) * 18))
        },
        phase: t < duration * 0.3 ? 'Opening' : t < duration * 0.7 ? 'Main Discussion' : 'Closing',
        events: Math.random() > 0.8 ? ['Key Insight'] : [],
        mood: Math.random() > 0.7 ? 'positive' : Math.random() > 0.3 ? 'neutral' : 'negative',
        energyLevel: Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
      });
    }

    return patterns;
  };

  const generateInsights = () => {
    setIsGeneratingInsights(true);
    
    // Simulate AI-generated insights
    setTimeout(() => {
      const mockInsights: InsightRecommendation[] = [
        {
          type: 'strength',
          priority: 'medium',
          title: 'Excellent Participation Balance',
          description: 'Sessions show consistently balanced participation across all students, with speaking time variance under 15%.',
          evidence: [
            '92% participation balance in recent sessions',
            'No student dominated discussions',
            'Quiet students engaged meaningfully'
          ],
          actionItems: [
            'Continue current facilitation approach',
            'Document successful techniques for training',
            'Share best practices with other teachers'
          ],
          expectedImpact: 'medium',
          timeframe: 'immediate'
        },
        {
          type: 'concern',
          priority: 'high',
          title: 'Evidence Use Declining',
          description: 'Evidence citation rates have decreased 18% over the past month, with students relying more on opinion-based arguments.',
          evidence: [
            'Evidence use score dropped from 87% to 71%',
            'Average citations per student down from 12 to 8',
            'Quality of sources declining'
          ],
          actionItems: [
            'Reinforce research skills training',
            'Create evidence evaluation rubric',
            'Assign pre-debate research requirements',
            'Model effective source citation'
          ],
          expectedImpact: 'high',
          timeframe: 'short_term'
        },
        {
          type: 'opportunity',
          priority: 'medium',
          title: 'Cross-Topic Skill Transfer',
          description: 'Students showing strong critical thinking in science topics could benefit from applying these skills to humanities debates.',
          evidence: [
            'Critical thinking scores 23% higher in science debates',
            'Students excel at evidence evaluation in STEM contexts',
            'Logical reasoning strong but underutilized in other subjects'
          ],
          actionItems: [
            'Design interdisciplinary debate topics',
            'Explicitly connect thinking skills across subjects',
            'Create skill transfer exercises',
            'Collaborate with humanities teachers'
          ],
          expectedImpact: 'high',
          timeframe: 'long_term'
        },
        {
          type: 'trend',
          priority: 'low',
          title: 'Increasing Session Length Preference',
          description: 'Students show higher engagement and learning outcomes in longer sessions (45+ minutes), with diminishing returns after 75 minutes.',
          evidence: [
            'Engagement scores peak at 60-70 minute sessions',
            'Learning objective achievement 34% higher in longer sessions',
            'Satisfaction scores correlate with adequate time for depth'
          ],
          actionItems: [
            'Adjust default session length to 60 minutes',
            'Create guidelines for optimal session duration by topic complexity',
            'Monitor energy levels and provide breaks for longer sessions'
          ],
          expectedImpact: 'medium',
          timeframe: 'immediate'
        }
      ];

      setInsights(mockInsights);
      setIsGeneratingInsights(false);
      
      addNotification({
        type: 'success',
        title: 'Analytics Updated',
        message: `Generated ${mockInsights.length} insights from session data.`
      });
    }, 2000);
  };

  const exportAnalytics = (format: 'pdf' | 'csv' | 'json') => {
    addNotification({
      type: 'info',
      title: 'Export Started',
      message: `Analytics export in ${format.toUpperCase()} format is being prepared.`
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getTrendIcon = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff > 2) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (diff < -2) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getInsightIcon = (type: InsightRecommendation['type']) => {
    switch (type) {
      case 'strength': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'concern': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'opportunity': return <Lightbulb className="h-4 w-4 text-blue-600" />;
      case 'trend': return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'comparison': return <BarChart3 className="h-4 w-4 text-orange-600" />;
    }
  };

  const getPriorityBadge = (priority: InsightRecommendation['priority']) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'medium': return <Badge variant="secondary">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
    }
  };

  // Calculate aggregate metrics across all sessions
  const aggregateMetrics = analyticsData.length > 0 ? {
    totalSessions: analyticsData.length,
    totalDuration: analyticsData.reduce((sum, s) => sum + s.duration, 0),
    totalParticipants: new Set(analyticsData.flatMap(s => s.participants.map(p => p.id))).size,
    avgEngagement: Math.round(analyticsData.reduce((sum, s) => sum + s.metrics.overallEngagement, 0) / analyticsData.length),
    avgRespectfulness: Math.round(analyticsData.reduce((sum, s) => sum + s.metrics.respectfulnessScore, 0) / analyticsData.length),
    avgCriticalThinking: Math.round(analyticsData.reduce((sum, s) => sum + s.metrics.criticalThinkingScore, 0) / analyticsData.length)
  } : null;

  // Chart data preparation
  const sessionTrendData = analyticsData.map(session => ({
    name: session.sessionTitle.substring(0, 20) + '...',
    date: session.date.toLocaleDateString(),
    engagement: session.metrics.overallEngagement,
    quality: session.metrics.messageQuality,
    collaboration: session.metrics.collaborationScore,
    critical_thinking: session.metrics.criticalThinkingScore
  }));

  const skillDistributionData = aggregateMetrics ? [
    { name: 'Critical Thinking', value: aggregateMetrics.avgCriticalThinking, color: '#8884d8' },
    { name: 'Communication', value: 82, color: '#82ca9d' },
    { name: 'Collaboration', value: 79, color: '#ffc658' },
    { name: 'Research', value: 85, color: '#ff7300' },
    { name: 'Empathy', value: 78, color: '#00ff7f' },
    { name: 'Creativity', value: 76, color: '#ff69b4' }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Recording Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Deep insights into session performance and learning outcomes
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Summary Stats */}
          {aggregateMetrics && (
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{aggregateMetrics.totalSessions}</div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{aggregateMetrics.totalParticipants}</div>
                <div className="text-xs text-muted-foreground">Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatDuration(aggregateMetrics.totalDuration)}</div>
                <div className="text-xs text-muted-foreground">Total Time</div>
              </div>
            </div>
          )}
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={generateInsights} disabled={isGeneratingInsights}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isGeneratingInsights ? 'animate-spin' : ''}`} />
              {isGeneratingInsights ? 'Analyzing...' : 'Refresh Insights'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportAnalytics('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAnalytics('csv')}>
                  <Database className="h-4 w-4 mr-2" />
                  CSV Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAnalytics('json')}>
                  <Download className="h-4 w-4 mr-2" />
                  JSON Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            Analytics Overview
          </TabsTrigger>
          <TabsTrigger value="sessions">
            Session Analysis ({analyticsData.length})
          </TabsTrigger>
          <TabsTrigger value="participants">
            Student Performance
          </TabsTrigger>
          <TabsTrigger value="trends">
            Trends & Patterns
          </TabsTrigger>
          <TabsTrigger value="insights">
            AI Insights ({insights.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Overview */}
          {aggregateMetrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Activity className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Avg Engagement</p>
                      <div className="flex items-center">
                        <span className={`text-2xl font-bold ${getGradeColor(aggregateMetrics.avgEngagement)}`}>
                          {aggregateMetrics.avgEngagement}%
                        </span>
                        {getTrendIcon(aggregateMetrics.avgEngagement, 78)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Brain className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Critical Thinking</p>
                      <div className="flex items-center">
                        <span className={`text-2xl font-bold ${getGradeColor(aggregateMetrics.avgCriticalThinking)}`}>
                          {aggregateMetrics.avgCriticalThinking}%
                        </span>
                        {getTrendIcon(aggregateMetrics.avgCriticalThinking, 75)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Respectfulness</p>
                      <div className="flex items-center">
                        <span className={`text-2xl font-bold ${getGradeColor(aggregateMetrics.avgRespectfulness)}`}>
                          {aggregateMetrics.avgRespectfulness}%
                        </span>
                        {getTrendIcon(aggregateMetrics.avgRespectfulness, 91)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Award className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Overall Quality</p>
                      <div className="flex items-center">
                        <span className="text-2xl font-bold text-orange-600">A-</span>
                        <ChevronUp className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Session Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChartIcon className="h-5 w-5 mr-2" />
                Session Performance Trends
              </CardTitle>
              <CardDescription>
                Track key metrics across recent sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sessionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="engagement" stroke="#8884d8" name="Engagement" />
                    <Line type="monotone" dataKey="quality" stroke="#82ca9d" name="Message Quality" />
                    <Line type="monotone" dataKey="collaboration" stroke="#ffc658" name="Collaboration" />
                    <Line type="monotone" dataKey="critical_thinking" stroke="#ff7300" name="Critical Thinking" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Skills Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Skills Assessment Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={skillDistributionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {skillDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <RadarIcon className="h-5 w-5 mr-2" />
                  Class Competency Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={[
                      { skill: 'Critical Thinking', current: 82, target: 85 },
                      { skill: 'Communication', current: 79, target: 80 },
                      { skill: 'Collaboration', current: 85, target: 82 },
                      { skill: 'Research', current: 77, target: 85 },
                      { skill: 'Empathy', current: 83, target: 80 },
                      { skill: 'Creativity', current: 74, target: 78 }
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar name="Current Level" dataKey="current" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                      <Radar name="Target Level" dataKey="target" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.2} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {/* Session List with Analytics */}
          <div className="space-y-4">
            {analyticsData.map((session) => (
              <Card key={session.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{session.sessionTitle}</CardTitle>
                      <CardDescription>
                        {session.date.toLocaleDateString()} • {formatDuration(session.duration)} • {session.participants.length} participants
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={session.metrics.overallEngagement > 80 ? "default" : "secondary"}>
                        {session.metrics.overallEngagement}% Engaged
                      </Badge>
                      <Badge variant="outline">
                        Quality: {Math.round((session.qualityScores.contentDepth + session.qualityScores.argumentStrength) / 2)}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Metrics Summary */}
                    <div>
                      <h4 className="font-medium mb-2">Core Metrics</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Engagement:</span>
                          <span className={getGradeColor(session.metrics.overallEngagement)}>
                            {session.metrics.overallEngagement}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Participation Balance:</span>
                          <span className={getGradeColor(session.metrics.participationBalance)}>
                            {session.metrics.participationBalance}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Critical Thinking:</span>
                          <span className={getGradeColor(session.metrics.criticalThinkingScore)}>
                            {session.metrics.criticalThinkingScore}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Respectfulness:</span>
                          <span className={getGradeColor(session.metrics.respectfulnessScore)}>
                            {session.metrics.respectfulnessScore}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quality Scores */}
                    <div>
                      <h4 className="font-medium mb-2">Quality Assessment</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Content Depth:</span>
                          <span>{session.qualityScores.contentDepth}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Argument Strength:</span>
                          <span>{session.qualityScores.argumentStrength}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Source Credibility:</span>
                          <span>{session.qualityScores.sourceCredibility}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Logic & Reasoning:</span>
                          <span>{session.qualityScores.logicalReasoning}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Learning Outcomes */}
                    <div>
                      <h4 className="font-medium mb-2">Learning Outcomes</h4>
                      <div className="space-y-2">
                        {session.learningOutcomes.map((outcome, index) => (
                          <div key={index} className="text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{outcome.objective}</span>
                              <Badge variant={outcome.achievedLevel === outcome.targetLevel ? "default" : "secondary"} className="text-xs">
                                {outcome.achievedLevel}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {outcome.participants.length}/{session.participants.length} achieved • {outcome.confidence}% confidence
                            </div>
                          </div>
                        ))}
                        {session.learningOutcomes.length === 0 && (
                          <p className="text-sm text-muted-foreground">No formal learning outcomes recorded</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Key Moments */}
                  {session.keyMoments.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-2">Key Moments ({session.keyMoments.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {session.keyMoments.map((moment) => (
                          <Badge key={moment.timestamp} variant="outline" className="text-xs">
                            {moment.type.replace('_', ' ')}: {moment.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-xs text-muted-foreground">
                      Session ID: {session.id}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedSession(session.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          {/* Participant Performance Analysis */}
          <div className="space-y-4">
            {analyticsData.length > 0 && analyticsData[0].participants.map((participant) => (
              <Card key={participant.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{participant.name}</CardTitle>
                      <CardDescription>
                        {participant.role} • {participant.demographics?.gradeLevel} Grade • {participant.demographics?.previousExperience} Experience
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={participant.engagement.overallScore > 80 ? "default" : "secondary"}>
                        {participant.engagement.overallScore}% Engagement
                      </Badge>
                      <Badge variant="outline">
                        {participant.growth.previousSessions} Sessions
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-3">
                    {/* Performance Metrics */}
                    <div>
                      <h4 className="font-medium mb-2">Performance</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Speaking Time:</span>
                          <span>{formatDuration(participant.performance.speakingTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Messages:</span>
                          <span>{participant.performance.messageCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Message Length:</span>
                          <span>{participant.performance.averageMessageLength} words</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Questions Asked:</span>
                          <span>{participant.performance.questionsAsked}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Evidence Citations:</span>
                          <span>{participant.performance.evidenceCitations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Arguments Presented:</span>
                          <span>{participant.performance.argumentsPresented}</span>
                        </div>
                      </div>
                    </div>

                    {/* Skills Assessment */}
                    <div>
                      <h4 className="font-medium mb-2">Skills Assessment</h4>
                      <div className="space-y-2">
                        {Object.entries(participant.skills).slice(0, 6).map(([skill, score]) => (
                          <div key={skill} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{skill.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <span className={getGradeColor(score)}>{score}%</span>
                            </div>
                            <Progress value={score} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Growth & Development */}
                    <div>
                      <h4 className="font-medium mb-2">Growth & Development</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium">Improvement Rate</div>
                          <div className="flex items-center">
                            <span className="text-lg font-bold text-green-600">+{participant.growth.improvementRate}%</span>
                            <span className="text-sm text-muted-foreground ml-2">per session</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium mb-1">Growth Areas</div>
                          <div className="flex flex-wrap gap-1">
                            {participant.growth.skillGrowthAreas.map((area) => (
                              <Badge key={area} variant="default" className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-1">Areas for Focus</div>
                          <div className="flex flex-wrap gap-1">
                            {participant.growth.strugglingAreas.map((area) => (
                              <Badge key={area} variant="secondary" className="text-xs">
                                <Target className="h-3 w-3 mr-1" />
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium">Next Level Readiness</div>
                          <div className="flex items-center space-x-2">
                            <Progress value={participant.growth.nextLevelReadiness} className="h-2 flex-1" />
                            <span className="text-sm">{participant.growth.nextLevelReadiness}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date().toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedParticipant(participant.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Detailed View
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Engagement Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Engagement Patterns Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analyticsData[0]?.engagementPatterns.slice(0, 30) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={(value) => `${Math.floor(value/60)}m`} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip labelFormatter={(value) => `${Math.floor(Number(value)/60)}:${(Number(value)%60).toString().padStart(2, '0')}`} />
                    <Legend />
                    <Area type="monotone" dataKey="overallEngagement" fill="#8884d8" fillOpacity={0.3} stroke="#8884d8" name="Overall Engagement" />
                    <Line type="monotone" dataKey="participantEngagement.p1" stroke="#82ca9d" name="Alice" />
                    <Line type="monotone" dataKey="participantEngagement.p2" stroke="#ffc658" name="Bob" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Comparative Analysis */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Performance vs Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Class Average', engagement: aggregateMetrics?.avgEngagement || 0, critical_thinking: aggregateMetrics?.avgCriticalThinking || 0 },
                      { name: 'School Average', engagement: 72, critical_thinking: 69 },
                      { name: 'National Benchmark', engagement: 68, critical_thinking: 65 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="engagement" fill="#8884d8" name="Engagement" />
                      <Bar dataKey="critical_thinking" fill="#82ca9d" name="Critical Thinking" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Session Duration vs Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={analyticsData.map(s => ({
                      duration: s.duration / 60, // Convert to minutes
                      quality: (s.qualityScores.contentDepth + s.qualityScores.argumentStrength + s.qualityScores.logicalReasoning) / 3,
                      engagement: s.metrics.overallEngagement
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="duration" name="Duration (minutes)" />
                      <YAxis dataKey="quality" name="Quality Score" domain={[0, 100]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Sessions" dataKey="quality" fill="#8884d8" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Key Trends Identified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium text-green-600 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Positive Trends
                  </h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Engagement scores improving by 8% over last month</li>
                    <li>• Participation balance maintaining above 85%</li>
                    <li>• Respectfulness scores consistently high (90%+)</li>
                    <li>• Student confidence in debates increasing</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-orange-600 flex items-center">
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Areas for Attention
                  </h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Evidence use declining in recent sessions</li>
                    <li>• Some students showing engagement fatigue in longer sessions</li>
                    <li>• Critical thinking scores plateauing</li>
                    <li>• Time management skills need development</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {/* AI-Generated Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                AI-Generated Insights
                {isGeneratingInsights && <RefreshCw className="h-4 w-4 ml-2 animate-spin" />}
              </CardTitle>
              <CardDescription>
                Automated analysis and recommendations based on session data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isGeneratingInsights ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Analyzing session data...</p>
                  </div>
                </div>
              ) : insights.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Insights Generated</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate AI-powered insights from your session data
                  </p>
                  <Button onClick={generateInsights}>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Insights
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight, index) => (
                    <Card key={index} className={`border-l-4 ${
                      insight.type === 'strength' ? 'border-l-green-500' :
                      insight.type === 'concern' ? 'border-l-red-500' :
                      insight.type === 'opportunity' ? 'border-l-blue-500' :
                      insight.type === 'trend' ? 'border-l-purple-500' :
                      'border-l-orange-500'
                    }`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              {getInsightIcon(insight.type)}
                              <span className="font-medium capitalize">{insight.type}</span>
                              {getPriorityBadge(insight.priority)}
                              <Badge variant="outline" className="text-xs">
                                {insight.timeframe.replace('_', ' ')}
                              </Badge>
                            </div>
                            <h4 className="font-semibold">{insight.title}</h4>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-4">{insight.description}</p>
                        
                        <div className="space-y-3">
                          <div>
                            <h5 className="text-sm font-medium mb-2">Evidence:</h5>
                            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                              {insight.evidence.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium mb-2">Recommended Actions:</h5>
                            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                              {insight.actionItems.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-muted-foreground">
                          <span>Expected Impact: {insight.expectedImpact}</span>
                          <span>Timeframe: {insight.timeframe.replace('_', ' ')}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
