/**
 * Intervention Recommendation Engine Component
 * 
 * Task 8.2.3: AI-powered suggestions for student support strategies,
 * early warning system, and success pattern identification
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  CheckCircle2,
  Clock,
  Users,
  BookOpen,
  MessageSquare,
  Calendar,
  Zap,
  Star,
  Award,
  Heart,
  Shield,
  Eye,
  BarChart3,
  Activity,
  Sparkles,
  Bot,
  Bell,
  Settings,
  Filter,
  Search,
  PlayCircle,
  PauseCircle,
  Plus,
  ArrowRight,
  Layers,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  grade: string;
  averageScore: number;
  participationRate: number;
  attendanceRate: number;
  engagementLevel: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  lastActivity: Date;
  skillProgression: Record<string, number>;
  behaviorFlags: string[];
  completionRate: number;
  interventionsActive: number;
}

interface InterventionRecommendation {
  id: string;
  studentId: string;
  studentName: string;
  type: 'academic' | 'behavioral' | 'engagement' | 'social' | 'motivation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  reasoning: string;
  suggestedActions: string[];
  expectedOutcome: string;
  timeframe: string;
  resources: string[];
  confidenceScore: number;
  appliedBefore: boolean;
  effectiveness?: 'high' | 'medium' | 'low';
  generatedAt: Date;
  status: 'pending' | 'approved' | 'implemented' | 'completed' | 'dismissed';
  implementedAt?: Date;
  completedAt?: Date;
  feedback?: {
    rating: number;
    notes: string;
  };
}

interface EarlyWarning {
  id: string;
  studentId: string;
  studentName: string;
  alertType: 'academic_decline' | 'attendance_drop' | 'engagement_low' | 'behavior_concern' | 'risk_escalation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  indicators: string[];
  threshold: number;
  currentValue: number;
  trend: 'improving' | 'stable' | 'declining';
  firstDetected: Date;
  lastUpdated: Date;
  isActive: boolean;
  dismissed: boolean;
  actionTaken?: string;
}

interface SuccessPattern {
  id: string;
  patternType: 'improvement_strategy' | 'engagement_boost' | 'skill_development' | 'behavioral_change';
  title: string;
  description: string;
  conditions: string[];
  interventions: string[];
  outcomes: string[];
  successRate: number;
  studentsApplied: number;
  avgImprovementTime: number; // days
  effectiveness: {
    academic: number;
    engagement: number;
    behavior: number;
  };
  tags: string[];
  lastUpdated: Date;
}

interface InterventionRecommendationEngineProps {
  students?: StudentProfile[];
  onRecommendationAction?: (recommendation: InterventionRecommendation, action: string) => void;
  onWarningDismiss?: (warning: EarlyWarning) => void;
}

export function InterventionRecommendationEngine({
  students = [],
  onRecommendationAction,
  onWarningDismiss
}: InterventionRecommendationEngineProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('recommendations');
  const [recommendations, setRecommendations] = useState<InterventionRecommendation[]>([]);
  const [earlyWarnings, setEarlyWarnings] = useState<EarlyWarning[]>([]);
  const [successPatterns, setSuccessPatterns] = useState<SuccessPattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(true);
  
  // Filters
  const [filters, setFilters] = useState({
    priority: '',
    type: '',
    status: '',
    search: ''
  });

  useEffect(() => {
    loadRecommendationData();
  }, [students, user?.id]);

  const loadRecommendationData = async () => {
    setLoading(true);
    try {
      // Mock data for development
      const mockRecommendations: InterventionRecommendation[] = [
        {
          id: '1',
          studentId: 'student1',
          studentName: 'Sarah Johnson',
          type: 'engagement',
          priority: 'medium',
          title: 'Increase Participation Through Peer Collaboration',
          description: 'Sarah shows strong academic performance but low verbal participation. Consider pairing with collaborative students.',
          reasoning: 'Student demonstrates high written competency (88%) but low vocal participation (45%). Historical data shows peer collaboration increases engagement by 23% for similar profiles.',
          suggestedActions: [
            'Pair with high-engagement students for group discussions',
            'Implement think-pair-share activities',
            'Use written reflection before verbal sharing',
            'Provide discussion prompts in advance'
          ],
          expectedOutcome: 'Increased participation rate by 15-25% within 3 weeks',
          timeframe: '3-4 weeks',
          resources: ['Peer collaboration guide', 'Discussion prompt templates', 'Progress tracking sheets'],
          confidenceScore: 87,
          appliedBefore: false,
          generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'pending'
        },
        {
          id: '2',
          studentId: 'student2',
          studentName: 'Michael Chen',
          type: 'academic',
          priority: 'high',
          title: 'Targeted Research Skills Development',
          description: 'Michael needs focused support in research methodology and source evaluation to improve debate preparation.',
          reasoning: 'Research skill score (65%) is significantly below class average (82%). This correlates with recent debate performance decline.',
          suggestedActions: [
            'One-on-one research skills tutorial',
            'Provide research methodology checklist',
            'Practice with guided source evaluation exercises',
            'Partner with strong research student for peer mentoring'
          ],
          expectedOutcome: 'Research skills improvement of 20+ points within 4 weeks',
          timeframe: '4-6 weeks',
          resources: ['Research skills curriculum', 'Source evaluation rubric', 'Peer mentoring program'],
          confidenceScore: 92,
          appliedBefore: true,
          effectiveness: 'high',
          generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          status: 'approved',
          implementedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
        },
        {
          id: '3',
          studentId: 'student3',
          studentName: 'Emma Davis',
          type: 'behavioral',
          priority: 'urgent',
          title: 'Comprehensive Re-engagement Strategy',
          description: 'Emma shows multiple risk factors requiring immediate, multi-faceted intervention approach.',
          reasoning: 'Multiple declining indicators: attendance (76%), engagement (42%), completion rate (45%). Early warning system triggered for risk escalation.',
          suggestedActions: [
            'Schedule immediate one-on-one check-in meeting',
            'Contact parent/guardian for collaboration',
            'Implement flexible deadline structure',
            'Provide choice in assignment topics',
            'Connect with school counseling services'
          ],
          expectedOutcome: 'Stabilize engagement and prevent further decline',
          timeframe: '2-3 weeks immediate, ongoing support',
          resources: ['Counseling referral', 'Parent communication templates', 'Flexible assignment options'],
          confidenceScore: 78,
          appliedBefore: false,
          generatedAt: new Date(Date.now() - 30 * 60 * 1000),
          status: 'pending'
        }
      ];

      const mockWarnings: EarlyWarning[] = [
        {
          id: '1',
          studentId: 'student3',
          studentName: 'Emma Davis',
          alertType: 'risk_escalation',
          severity: 'critical',
          title: 'Multiple Risk Factors Detected',
          description: 'Student showing declining trends across multiple key indicators simultaneously',
          indicators: ['Attendance below 80%', 'Engagement score dropped 25%', 'Assignment completion below 50%'],
          threshold: 70,
          currentValue: 42,
          trend: 'declining',
          firstDetected: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000),
          isActive: true,
          dismissed: false
        },
        {
          id: '2',
          studentId: 'student2',
          studentName: 'Michael Chen',
          alertType: 'academic_decline',
          severity: 'warning',
          title: 'Academic Performance Declining',
          description: 'Recent assignment scores showing downward trend',
          indicators: ['Average score dropped from 85% to 72%', 'Research skills assessment below average'],
          threshold: 80,
          currentValue: 72,
          trend: 'declining',
          firstDetected: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
          isActive: true,
          dismissed: false
        }
      ];

      const mockPatterns: SuccessPattern[] = [
        {
          id: '1',
          patternType: 'engagement_boost',
          title: 'Peer Collaboration Strategy',
          description: 'Pairing low-engagement students with high-engagement peers in structured activities',
          conditions: ['Low participation rate (<50%)', 'High written competency (>75%)', 'Social comfort with peers'],
          interventions: ['Think-pair-share activities', 'Peer mentoring', 'Group discussion roles'],
          outcomes: ['23% average participation increase', '15% engagement score improvement', '89% student satisfaction'],
          successRate: 87,
          studentsApplied: 34,
          avgImprovementTime: 21,
          effectiveness: {
            academic: 78,
            engagement: 91,
            behavior: 69
          },
          tags: ['peer-collaboration', 'engagement', 'participation'],
          lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
          id: '2',
          patternType: 'skill_development',
          title: 'Scaffolded Research Skills Program',
          description: 'Graduated research skills development with peer mentoring and guided practice',
          conditions: ['Research skills below class average', 'Motivated to improve', 'Time availability'],
          interventions: ['One-on-one tutorials', 'Peer mentoring', 'Guided practice sessions', 'Progress tracking'],
          outcomes: ['25 point average skill improvement', '92% success rate', 'Sustained improvement over semester'],
          successRate: 92,
          studentsApplied: 18,
          avgImprovementTime: 28,
          effectiveness: {
            academic: 95,
            engagement: 82,
            behavior: 74
          },
          tags: ['research-skills', 'academic-support', 'peer-mentoring'],
          lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ];

      setRecommendations(mockRecommendations);
      setEarlyWarnings(mockWarnings);
      setSuccessPatterns(mockPatterns);

    } catch (error) {
      console.error('Failed to load recommendation data:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load recommendation data. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationAction = (recommendation: InterventionRecommendation, action: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === recommendation.id 
          ? {
              ...rec,
              status: action as any,
              implementedAt: action === 'implemented' ? new Date() : rec.implementedAt,
              completedAt: action === 'completed' ? new Date() : rec.completedAt
            }
          : rec
      )
    );

    onRecommendationAction?.(recommendation, action);

    addNotification({
      type: 'success',
      title: 'Recommendation Updated',
      message: `Recommendation for ${recommendation.studentName} marked as ${action}.`
    });
  };

  const handleWarningDismiss = (warning: EarlyWarning) => {
    setEarlyWarnings(prev => 
      prev.map(w => 
        w.id === warning.id 
          ? { ...w, dismissed: true, isActive: false }
          : w
      )
    );

    onWarningDismiss?.(warning);

    addNotification({
      type: 'info',
      title: 'Warning Dismissed',
      message: `Early warning for ${warning.studentName} has been dismissed.`
    });
  };

  const generateNewRecommendations = async () => {
    setLoading(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addNotification({
        type: 'success',
        title: 'Recommendations Generated',
        message: 'New AI-powered recommendations have been generated based on current student data.'
      });
      
      // In real implementation, this would call the AI service
      await loadRecommendationData();
      
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Generation Failed',
        message: 'Failed to generate new recommendations. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'academic':
        return <BookOpen className="h-4 w-4" />;
      case 'behavioral':
        return <Users className="h-4 w-4" />;
      case 'engagement':
        return <Heart className="h-4 w-4" />;
      case 'social':
        return <MessageSquare className="h-4 w-4" />;
      case 'motivation':
        return <Target className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <Activity className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (filters.priority && rec.priority !== filters.priority) return false;
    if (filters.type && rec.type !== filters.type) return false;
    if (filters.status && rec.status !== filters.status) return false;
    if (filters.search && !rec.studentName.toLowerCase().includes(filters.search.toLowerCase()) &&
        !rec.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const activeWarnings = earlyWarnings.filter(w => w.isActive && !w.dismissed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Intervention Recommendation Engine
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered student support recommendations and early warning system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-generate"
              checked={autoGenerateEnabled}
              onCheckedChange={setAutoGenerateEnabled}
            />
            <label htmlFor="auto-generate" className="text-sm font-medium">
              Auto-generate
            </label>
          </div>
          <Button onClick={generateNewRecommendations} disabled={loading}>
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </div>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Generate Recommendations
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Active Warnings Banner */}
      {activeWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{activeWarnings.length} active warning{activeWarnings.length !== 1 ? 's' : ''}</strong> requiring attention.
            Check the Early Warnings tab for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations">
            AI Recommendations ({recommendations.length})
          </TabsTrigger>
          <TabsTrigger value="warnings">
            Early Warnings ({activeWarnings.length})
          </TabsTrigger>
          <TabsTrigger value="patterns">
            Success Patterns ({successPatterns.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search recommendations..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
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
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="motivation">Motivation</SelectItem>
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="implemented">Implemented</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <div className="space-y-4">
            {filteredRecommendations.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No recommendations found</h3>
                    <p className="text-muted-foreground mb-4">
                      {recommendations.length === 0 
                        ? "Generate AI recommendations based on student data"
                        : "No recommendations match your current filters"
                      }
                    </p>
                    {recommendations.length === 0 && (
                      <Button onClick={generateNewRecommendations}>
                        <Bot className="h-4 w-4 mr-2" />
                        Generate Recommendations
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredRecommendations.map((recommendation) => (
                <Card key={recommendation.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(recommendation.priority)}>
                            {recommendation.priority}
                          </Badge>
                          <Badge variant="outline" className="flex items-center">
                            {getTypeIcon(recommendation.type)}
                            <span className="ml-1 capitalize">{recommendation.type}</span>
                          </Badge>
                          <Badge 
                            variant={recommendation.status === 'pending' ? 'secondary' : 
                                    recommendation.status === 'completed' ? 'default' : 'outline'}
                          >
                            {recommendation.status}
                          </Badge>
                          <div className="flex items-center space-x-1">
                            <Sparkles className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-muted-foreground">
                              {recommendation.confidenceScore}% confidence
                            </span>
                          </div>
                        </div>
                        <h4 className="font-medium">{recommendation.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          For: {recommendation.studentName} • Generated: {recommendation.generatedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {recommendation.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleRecommendationAction(recommendation, 'approved')}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleRecommendationAction(recommendation, 'dismissed')}
                            >
                              Dismiss
                            </Button>
                          </>
                        )}
                        {recommendation.status === 'approved' && (
                          <Button size="sm" onClick={() => handleRecommendationAction(recommendation, 'implemented')}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Implement
                          </Button>
                        )}
                        {recommendation.status === 'implemented' && (
                          <Button size="sm" onClick={() => handleRecommendationAction(recommendation, 'completed')}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h5 className="font-medium mb-2">Description</h5>
                      <p className="text-sm">{recommendation.description}</p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">AI Reasoning</h5>
                      <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">Suggested Actions</h5>
                      <ul className="text-sm space-y-1">
                        {recommendation.suggestedActions.map((action, index) => (
                          <li key={index} className="flex items-start">
                            <ArrowRight className="h-3 w-3 mr-2 mt-1 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h5 className="font-medium mb-1">Expected Outcome</h5>
                        <p className="text-sm text-muted-foreground">{recommendation.expectedOutcome}</p>
                      </div>
                      <div>
                        <h5 className="font-medium mb-1">Timeframe</h5>
                        <p className="text-sm text-muted-foreground">{recommendation.timeframe}</p>
                      </div>
                    </div>
                    
                    {recommendation.resources.length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2">Required Resources</h5>
                        <div className="flex flex-wrap gap-1">
                          {recommendation.resources.map((resource, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {recommendation.appliedBefore && recommendation.effectiveness && (
                      <Alert>
                        <Sparkles className="h-4 w-4" />
                        <AlertDescription>
                          This intervention has been used before with <strong>{recommendation.effectiveness}</strong> effectiveness.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4">
          {activeWarnings.length === 0 ? (
            <Card>
              <CardContent className="pt-4">
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active warnings</h3>
                  <p className="text-muted-foreground">
                    All students are within normal parameters. The system will alert you if any issues are detected.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeWarnings.map((warning) => (
                <Card key={warning.id} className={`border-l-4 ${
                  warning.severity === 'critical' ? 'border-l-red-500' :
                  warning.severity === 'warning' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(warning.severity)}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {warning.severity}
                          </Badge>
                          <Badge variant="outline" className="flex items-center">
                            {getTrendIcon(warning.trend)}
                            <span className="ml-1 capitalize">{warning.trend}</span>
                          </Badge>
                        </div>
                        <h4 className="font-medium">{warning.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {warning.studentName} • First detected: {warning.firstDetected.toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleWarningDismiss(warning)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{warning.description}</p>
                    
                    <div>
                      <h5 className="font-medium mb-2">Indicators</h5>
                      <ul className="text-sm space-y-1">
                        {warning.indicators.map((indicator, index) => (
                          <li key={index} className="flex items-start">
                            <AlertTriangle className="h-3 w-3 mr-2 mt-1 flex-shrink-0 text-orange-500" />
                            {indicator}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h5 className="font-medium mb-2">Threshold vs Current</h5>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Current: {warning.currentValue}%</span>
                            <span>Threshold: {warning.threshold}%</span>
                          </div>
                          <Progress 
                            value={warning.currentValue} 
                            className={warning.currentValue < warning.threshold ? 'bg-red-100' : 'bg-green-100'}
                          />
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-1">Last Updated</h5>
                        <p className="text-sm text-muted-foreground">
                          {warning.lastUpdated.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {successPatterns.length === 0 ? (
            <Card>
              <CardContent className="pt-4">
                <div className="text-center py-8">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No success patterns identified yet</h3>
                  <p className="text-muted-foreground">
                    Success patterns will be identified as more interventions are implemented and tracked.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {successPatterns.map((pattern) => (
                <Card key={pattern.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <Badge variant="outline" className="flex items-center w-fit">
                          <Star className="h-3 w-3 mr-1" />
                          <span className="capitalize">{pattern.patternType.replace('_', ' ')}</span>
                        </Badge>
                        <h4 className="font-medium">{pattern.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {pattern.successRate}% success rate • {pattern.studentsApplied} students
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{pattern.description}</p>
                    
                    <div>
                      <h5 className="font-medium mb-2">Conditions</h5>
                      <ul className="text-sm space-y-1">
                        {pattern.conditions.map((condition, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle2 className="h-3 w-3 mr-2 mt-1 flex-shrink-0 text-green-500" />
                            {condition}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">Key Interventions</h5>
                      <div className="flex flex-wrap gap-1">
                        {pattern.interventions.map((intervention, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {intervention}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">Effectiveness Metrics</h5>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Academic Impact</span>
                          <span>{pattern.effectiveness.academic}%</span>
                        </div>
                        <Progress value={pattern.effectiveness.academic} />
                        <div className="flex items-center justify-between text-sm">
                          <span>Engagement Impact</span>
                          <span>{pattern.effectiveness.engagement}%</span>
                        </div>
                        <Progress value={pattern.effectiveness.engagement} />
                        <div className="flex items-center justify-between text-sm">
                          <span>Behavioral Impact</span>
                          <span>{pattern.effectiveness.behavior}%</span>
                        </div>
                        <Progress value={pattern.effectiveness.behavior} />
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p>Average improvement time: {pattern.avgImprovementTime} days</p>
                      <p>Last updated: {pattern.lastUpdated.toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Recommendations</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recommendations.filter(r => r.status !== 'dismissed' && r.status !== 'completed').length}</div>
                <p className="text-xs text-muted-foreground">
                  {recommendations.filter(r => r.status === 'pending').length} pending review
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Warnings</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeWarnings.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeWarnings.filter(w => w.severity === 'critical').length} critical alerts
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Patterns</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{successPatterns.length}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(successPatterns.reduce((acc, p) => acc + p.successRate, 0) / successPatterns.length || 0)}% avg success rate
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
              <CardDescription>
                AI recommendation engine performance and accuracy metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground">
                  Detailed analytics and performance metrics will be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
