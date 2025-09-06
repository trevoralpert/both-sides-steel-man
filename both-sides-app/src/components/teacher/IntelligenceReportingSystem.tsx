/**
 * Intelligence Reporting System Component
 * 
 * Task 8.5.5: Automated insight generation with AI-powered recommendations,
 * trend analysis and pattern recognition, educational outcome correlation analysis
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Brain,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Award,
  Clock,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Info,
  Star,
  Zap,
  Users,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Globe,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
  RotateCcw,
  Save,
  Share2,
  FileText,
  BarChart3,
  LineChart,
  PieChart,
  Plus
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface AIInsight {
  id: string;
  title: string;
  description: string;
  category: InsightCategory;
  confidence_score: number;
  impact_level: 'critical' | 'high' | 'medium' | 'low';
  data_sources: string[];
  recommendations: AIRecommendation[];
  correlations: DataCorrelation[];
  generated_at: Date;
  status: 'new' | 'reviewed' | 'implemented' | 'dismissed';
  auto_generated: boolean;
  pattern_strength: number;
}

type InsightCategory = 
  | 'student_performance' | 'engagement_patterns' | 'learning_outcomes' 
  | 'teacher_effectiveness' | 'content_optimization' | 'platform_usage'
  | 'predictive_trends' | 'resource_allocation' | 'intervention_needs';

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort_required: 'low' | 'medium' | 'high';
  expected_impact: number;
  implementation_steps: string[];
  success_metrics: string[];
  timeline_weeks: number;
  dependencies: string[];
}

interface DataCorrelation {
  variable1: string;
  variable2: string;
  correlation_strength: number;
  significance_level: number;
  relationship_type: 'positive' | 'negative' | 'nonlinear';
  confidence_interval: [number, number];
  sample_size: number;
  interpretation: string;
}

interface TrendAnalysis {
  metric: string;
  time_period: string;
  trend_direction: 'increasing' | 'decreasing' | 'stable' | 'cyclical';
  trend_strength: number;
  seasonality_detected: boolean;
  forecast: ForecastPoint[];
  anomalies: AnomalyPoint[];
  key_drivers: TrendDriver[];
}

interface ForecastPoint {
  date: Date;
  predicted_value: number;
  confidence_lower: number;
  confidence_upper: number;
  factors: string[];
}

interface AnomalyPoint {
  date: Date;
  actual_value: number;
  expected_value: number;
  deviation_score: number;
  possible_causes: string[];
  impact_assessment: string;
}

interface TrendDriver {
  factor: string;
  influence_weight: number;
  direction: 'positive' | 'negative';
  explanation: string;
  statistical_significance: number;
}

interface EducationalOutcome {
  outcome_id: string;
  outcome_name: string;
  measurement_method: string;
  baseline_value: number;
  current_value: number;
  target_value: number;
  improvement_rate: number;
  contributing_factors: OutcomeFactor[];
  intervention_effects: InterventionEffect[];
  correlation_matrix: { [key: string]: number };
}

interface OutcomeFactor {
  factor_name: string;
  contribution_percentage: number;
  factor_type: 'positive' | 'negative' | 'neutral';
  controllability: 'high' | 'medium' | 'low';
  evidence_strength: number;
  recommendations: string[];
}

interface InterventionEffect {
  intervention_name: string;
  implementation_date: Date;
  effect_size: number;
  statistical_significance: number;
  duration_of_effect: number;
  cost_effectiveness: number;
  scalability_score: number;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: ReportSection[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  recipients: string[];
  delivery_settings: DeliverySettings;
  customization_options: CustomizationOption[];
}

interface ReportSection {
  section_id: string;
  title: string;
  content_type: 'insights' | 'trends' | 'correlations' | 'recommendations' | 'outcomes';
  filters: ReportFilter[];
  visualization_type: 'chart' | 'table' | 'narrative' | 'dashboard';
  include_ai_commentary: boolean;
}

interface ReportFilter {
  field: string;
  operator: string;
  value: any;
  description: string;
}

interface DeliverySettings {
  email_enabled: boolean;
  dashboard_posting: boolean;
  pdf_generation: boolean;
  interactive_mode: boolean;
  notification_preferences: NotificationPreference[];
}

interface NotificationPreference {
  event_type: string;
  notification_method: 'email' | 'dashboard' | 'sms' | 'webhook';
  urgency_threshold: number;
  recipient_groups: string[];
}

interface CustomizationOption {
  option_name: string;
  option_type: 'boolean' | 'select' | 'number' | 'text';
  default_value: any;
  possible_values?: any[];
  description: string;
}

interface IntelligenceReportingSystemProps {
  organizationId?: string;
  canViewReports?: boolean;
  canGenerateReports?: boolean;
  canConfigureAI?: boolean;
  showAdvancedFeatures?: boolean;
}

const INSIGHT_CATEGORIES = [
  { value: 'student_performance', label: 'Student Performance', icon: GraduationCap, color: 'text-blue-600' },
  { value: 'engagement_patterns', label: 'Engagement Patterns', icon: Activity, color: 'text-green-600' },
  { value: 'learning_outcomes', label: 'Learning Outcomes', icon: Target, color: 'text-purple-600' },
  { value: 'teacher_effectiveness', label: 'Teacher Effectiveness', icon: Users, color: 'text-orange-600' },
  { value: 'content_optimization', label: 'Content Optimization', icon: BookOpen, color: 'text-teal-600' },
  { value: 'platform_usage', label: 'Platform Usage', icon: Globe, color: 'text-indigo-600' },
  { value: 'predictive_trends', label: 'Predictive Trends', icon: TrendingUp, color: 'text-pink-600' },
  { value: 'resource_allocation', label: 'Resource Allocation', icon: Award, color: 'text-red-600' },
  { value: 'intervention_needs', label: 'Intervention Needs', icon: AlertTriangle, color: 'text-yellow-600' }
];

export function IntelligenceReportingSystem({
  organizationId,
  canViewReports = true,
  canGenerateReports = false,
  canConfigureAI = false,
  showAdvancedFeatures = false
}: IntelligenceReportingSystemProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('insights');
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis[]>([]);
  const [educationalOutcomes, setEducationalOutcomes] = useState<EducationalOutcome[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | 'all'>('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  
  // Dialog states
  const [showInsightDialog, setShowInsightDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    if (canViewReports) {
      loadIntelligenceData();
    }
  }, [canViewReports]);

  const loadIntelligenceData = async () => {
    setIsLoading(true);
    
    // Mock AI insights
    const mockInsights: AIInsight[] = [
      {
        id: 'insight_ai_1',
        title: 'Strong Correlation: Debate Frequency ↔ Critical Thinking Scores',
        description: 'Students who participate in debates 3+ times per week show 42% higher critical thinking assessment scores',
        category: 'learning_outcomes',
        confidence_score: 94.2,
        impact_level: 'high',
        data_sources: ['debate_participation', 'assessment_scores', 'skill_evaluations'],
        recommendations: [
          {
            id: 'rec_1',
            title: 'Increase Debate Frequency',
            description: 'Implement mandatory 3x weekly debate sessions for all students',
            priority: 'high',
            effort_required: 'medium',
            expected_impact: 85,
            implementation_steps: [
              'Schedule additional debate slots in curriculum',
              'Train teachers on increased frequency management',
              'Update assessment rubrics to reflect increased practice'
            ],
            success_metrics: ['Critical thinking score improvement', 'Student engagement rates'],
            timeline_weeks: 8,
            dependencies: ['teacher_training', 'schedule_restructuring']
          }
        ],
        correlations: [
          {
            variable1: 'debate_frequency_weekly',
            variable2: 'critical_thinking_score',
            correlation_strength: 0.847,
            significance_level: 0.001,
            relationship_type: 'positive',
            confidence_interval: [0.782, 0.894],
            sample_size: 1247,
            interpretation: 'Strong positive correlation with high statistical significance'
          }
        ],
        generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'new',
        auto_generated: true,
        pattern_strength: 89.3
      },
      {
        id: 'insight_ai_2',
        title: 'Early Warning: 18% of Students at Risk of Disengagement',
        description: 'ML model identifies 234 students showing declining participation patterns indicating potential dropout risk',
        category: 'intervention_needs',
        confidence_score: 87.6,
        impact_level: 'critical',
        data_sources: ['login_patterns', 'session_completion', 'interaction_metrics', 'response_quality'],
        recommendations: [
          {
            id: 'rec_2',
            title: 'Implement Targeted Re-engagement Program',
            description: 'Create personalized intervention strategy for at-risk students',
            priority: 'high',
            effort_required: 'high',
            expected_impact: 78,
            implementation_steps: [
              'Identify specific risk factors for each student',
              'Assign dedicated support mentors',
              'Customize content difficulty and topics',
              'Increase teacher-student interaction frequency'
            ],
            success_metrics: ['Participation recovery rate', 'Session completion improvement'],
            timeline_weeks: 4,
            dependencies: ['mentor_assignment', 'content_customization_system']
          }
        ],
        correlations: [
          {
            variable1: 'login_frequency_decline',
            variable2: 'eventual_dropout_risk',
            correlation_strength: 0.763,
            significance_level: 0.005,
            relationship_type: 'positive',
            confidence_interval: [0.698, 0.821],
            sample_size: 890,
            interpretation: 'Strong predictive correlation for dropout risk identification'
          }
        ],
        generated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'new',
        auto_generated: true,
        pattern_strength: 82.7
      }
    ];

    // Mock trend analysis
    const mockTrends: TrendAnalysis[] = [
      {
        metric: 'student_engagement_rate',
        time_period: '6_months',
        trend_direction: 'increasing',
        trend_strength: 0.745,
        seasonality_detected: true,
        forecast: [
          {
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            predicted_value: 89.2,
            confidence_lower: 85.1,
            confidence_upper: 93.8,
            factors: ['seasonal_upturn', 'new_feature_adoption']
          }
        ],
        anomalies: [
          {
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            actual_value: 76.3,
            expected_value: 84.1,
            deviation_score: -2.8,
            possible_causes: ['system_outage', 'exam_period'],
            impact_assessment: 'Temporary dip, recovery expected within 1 week'
          }
        ],
        key_drivers: [
          {
            factor: 'debate_topic_relevance',
            influence_weight: 0.342,
            direction: 'positive',
            explanation: 'Current events and trending topics increase engagement by 34%',
            statistical_significance: 0.002
          }
        ]
      }
    ];

    // Mock educational outcomes
    const mockOutcomes: EducationalOutcome[] = [
      {
        outcome_id: 'outcome_1',
        outcome_name: 'Critical Thinking Proficiency',
        measurement_method: 'Standardized Assessment + Peer Review',
        baseline_value: 72.4,
        current_value: 81.7,
        target_value: 85.0,
        improvement_rate: 12.8,
        contributing_factors: [
          {
            factor_name: 'Debate Participation Frequency',
            contribution_percentage: 45.2,
            factor_type: 'positive',
            controllability: 'high',
            evidence_strength: 0.89,
            recommendations: ['Increase minimum debate requirements', 'Incentivize voluntary participation']
          }
        ],
        intervention_effects: [
          {
            intervention_name: 'Structured Argument Framework Training',
            implementation_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            effect_size: 0.67,
            statistical_significance: 0.001,
            duration_of_effect: 120,
            cost_effectiveness: 4.2,
            scalability_score: 8.5
          }
        ],
        correlation_matrix: {
          'debate_frequency': 0.847,
          'peer_feedback_quality': 0.623,
          'teacher_guidance': 0.554
        }
      }
    ];

    setAIInsights(mockInsights);
    setTrendAnalysis(mockTrends);
    setEducationalOutcomes(mockOutcomes);
    setIsLoading(false);
  };

  const generateNewInsights = async () => {
    if (!canGenerateReports) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to generate AI insights.',
        read: false
      });
      return;
    }

    setIsGeneratingInsights(true);
    
    addNotification({
      type: 'info',
      title: 'Generating AI Insights',
      message: 'Analyzing platform data to generate new intelligent insights...',
      read: false
    });

    // Simulate AI processing time
    setTimeout(() => {
      setIsGeneratingInsights(false);
      addNotification({
        type: 'success',
        title: 'Insights Generated',
        message: '3 new AI-powered insights have been generated and are ready for review.',
        read: false
      });
      
      // Refresh data
      loadIntelligenceData();
    }, 5000);
  };

  const getInsightIcon = (category: InsightCategory) => {
    const categoryData = INSIGHT_CATEGORIES.find(c => c.value === category);
    return categoryData ? categoryData.icon : Brain;
  };

  const getInsightColor = (category: InsightCategory) => {
    const categoryData = INSIGHT_CATEGORIES.find(c => c.value === category);
    return categoryData ? categoryData.color : 'text-gray-600';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const filteredInsights = aiInsights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insight.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || insight.category === categoryFilter;
    const meetsConfidenceThreshold = insight.confidence_score >= confidenceThreshold;
    
    return matchesSearch && matchesCategory && meetsConfidenceThreshold;
  });

  if (!canViewReports) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You do not have permission to view intelligence reports.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Intelligence Reporting System
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered insights, trend analysis, and educational outcome correlation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={generateNewInsights}
            disabled={isGeneratingInsights}
          >
            {isGeneratingInsights ? (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            ) : (
              <Lightbulb className="h-4 w-4 mr-2" />
            )}
            {isGeneratingInsights ? 'Generating...' : 'Generate Insights'}
          </Button>
          {canGenerateReports && (
            <Button onClick={() => setShowReportDialog(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {INSIGHT_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Label className="text-sm whitespace-nowrap">Min Confidence:</Label>
              <div className="flex items-center space-x-2 w-32">
                <span className="text-sm w-8">{confidenceThreshold}%</span>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">AI Insights ({filteredInsights.length})</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="outcomes">Educational Outcomes</TabsTrigger>
          <TabsTrigger value="reports">Automated Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {filteredInsights.map((insight) => {
            const InsightIcon = getInsightIcon(insight.category);
            
            return (
              <Card key={insight.id} className="transition-all hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg bg-muted ${getInsightColor(insight.category)}`}>
                        <InsightIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-base">{insight.title}</h3>
                          <Badge className={getImpactColor(insight.impact_level)}>
                            {insight.impact_level}
                          </Badge>
                          {insight.auto_generated && (
                            <Badge variant="outline" className="text-xs">
                              AI Generated
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {insight.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Confidence: {insight.confidence_score.toFixed(1)}%</span>
                          <span>Pattern Strength: {insight.pattern_strength.toFixed(1)}%</span>
                          <span>Generated: {insight.generated_at.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-right mr-2">
                        <Progress value={insight.confidence_score} className="w-16 mb-1" />
                        <span className="text-xs text-muted-foreground">Confidence</span>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedInsight(insight);
                            setShowInsightDialog(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share Insight
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Export Data
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Reviewed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Quick preview of recommendations */}
                  {insight.recommendations.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Top Recommendation</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700">{insight.recommendations[0].title}</p>
                          <p className="text-xs text-blue-600 mt-1">{insight.recommendations[0].description}</p>
                        </div>
                        <div className="text-right text-xs text-blue-600">
                          <div>Impact: {insight.recommendations[0].expected_impact}%</div>
                          <div>{insight.recommendations[0].timeline_weeks} weeks</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data correlations preview */}
                  {insight.correlations.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {insight.correlations.slice(0, 2).map((correlation, index) => (
                        <div key={index} className="bg-green-50 rounded-lg p-3">
                          <h5 className="text-xs font-medium text-green-800 mb-1">Strong Correlation</h5>
                          <div className="text-xs text-green-700">
                            <div className="flex items-center justify-between mb-1">
                              <span>{correlation.variable1.replace('_', ' ')}</span>
                              <Badge variant="outline" className="text-xs">
                                {(correlation.correlation_strength * 100).toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="text-green-600">↔ {correlation.variable2.replace('_', ' ')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <div className="flex items-center space-x-2">
                      {insight.data_sources.slice(0, 3).map((source) => (
                        <Badge key={source} variant="outline" className="text-xs">
                          {source.replace('_', ' ')}
                        </Badge>
                      ))}
                      {insight.data_sources.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{insight.data_sources.length - 3} more
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedInsight(insight);
                          setShowInsightDialog(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Implement
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {trendAnalysis.map((trend, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>{trend.metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <Badge className={
                    trend.trend_direction === 'increasing' ? 'bg-green-500' :
                    trend.trend_direction === 'decreasing' ? 'bg-red-500' :
                    trend.trend_direction === 'cyclical' ? 'bg-blue-500' : 'bg-gray-500'
                  }>
                    {trend.trend_direction}
                  </Badge>
                  {trend.seasonality_detected && (
                    <Badge variant="outline" className="text-xs">
                      Seasonal Pattern
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Analysis period: {trend.time_period.replace('_', ' ')} • 
                  Trend strength: {(trend.trend_strength * 100).toFixed(0)}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Key drivers */}
                  <div>
                    <h4 className="font-medium mb-2">Key Trend Drivers</h4>
                    <div className="space-y-2">
                      {trend.key_drivers.map((driver, dIndex) => (
                        <div key={dIndex} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              driver.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <span className="text-sm font-medium">
                              {driver.factor.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(driver.influence_weight * 100).toFixed(0)}% influence
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Anomalies */}
                  {trend.anomalies.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recent Anomalies</h4>
                      <div className="space-y-2">
                        {trend.anomalies.map((anomaly, aIndex) => (
                          <div key={aIndex} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">
                                {anomaly.date.toLocaleDateString()}
                              </span>
                              <Badge variant="outline" className="text-yellow-600">
                                {anomaly.deviation_score.toFixed(1)}σ deviation
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{anomaly.impact_assessment}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {anomaly.possible_causes.map((cause, cIndex) => (
                                <Badge key={cIndex} variant="outline" className="text-xs">
                                  {cause.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-6">
          {educationalOutcomes.map((outcome) => (
            <Card key={outcome.outcome_id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span>{outcome.outcome_name}</span>
                  <Badge className={
                    outcome.current_value >= outcome.target_value ? 'bg-green-500' :
                    outcome.current_value >= outcome.baseline_value ? 'bg-blue-500' : 'bg-orange-500'
                  }>
                    {outcome.current_value >= outcome.target_value ? 'Target Met' :
                     outcome.current_value >= outcome.baseline_value ? 'Improving' : 'Needs Attention'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Measured via: {outcome.measurement_method}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Progress to Target</span>
                      <span className="text-sm font-medium">
                        {outcome.current_value.toFixed(1)} / {outcome.target_value.toFixed(1)}
                      </span>
                    </div>
                    <Progress 
                      value={(outcome.current_value / outcome.target_value) * 100} 
                      className="mb-4" 
                    />
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Baseline:</span>
                        <span>{outcome.baseline_value.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current:</span>
                        <span className="font-medium">{outcome.current_value.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Improvement:</span>
                        <span className="text-green-600 font-medium">
                          +{outcome.improvement_rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Top Contributing Factors</h4>
                    <div className="space-y-2">
                      {outcome.contributing_factors.slice(0, 3).map((factor, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              factor.factor_type === 'positive' ? 'bg-green-500' :
                              factor.factor_type === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                            }`} />
                            <span className="text-sm">{factor.factor_name}</span>
                          </div>
                          <span className="text-xs font-medium">
                            {factor.contribution_percentage.toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {outcome.intervention_effects.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="font-medium mb-3">Intervention Effects</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {outcome.intervention_effects.map((intervention, index) => (
                        <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-blue-800">
                              {intervention.intervention_name}
                            </h5>
                            <Badge variant="outline" className="text-xs text-blue-600">
                              Effect: {intervention.effect_size.toFixed(2)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                            <div>Cost-effectiveness: {intervention.cost_effectiveness.toFixed(1)}/10</div>
                            <div>Scalability: {intervention.scalability_score.toFixed(1)}/10</div>
                            <div>Duration: {intervention.duration_of_effect} days</div>
                            <div>Significance: p&lt;{intervention.statistical_significance.toFixed(3)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Automated Reporting</h3>
              <p className="text-muted-foreground mb-4">
                Configure automated intelligence reports with custom schedules and recipients
              </p>
              {canGenerateReports && (
                <Button onClick={() => setShowReportDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Automated Report
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insight Details Dialog */}
      <Dialog open={!!selectedInsight} onOpenChange={() => setSelectedInsight(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedInsight?.title}</DialogTitle>
            <DialogDescription>
              AI-generated insight with detailed analysis and recommendations
            </DialogDescription>
          </DialogHeader>
          {selectedInsight && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Confidence Score</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress value={selectedInsight.confidence_score} className="flex-1" />
                      <span className="text-sm font-medium">{selectedInsight.confidence_score.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div>
                    <Label>Impact Level</Label>
                    <Badge className={getImpactColor(selectedInsight.impact_level)}>
                      {selectedInsight.impact_level}
                    </Badge>
                  </div>
                </div>
                
                {/* Recommendations */}
                <div>
                  <Label>Recommendations</Label>
                  <div className="space-y-4 mt-2">
                    {selectedInsight.recommendations.map((rec) => (
                      <div key={rec.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{rec.title}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge className={
                              rec.priority === 'high' ? 'bg-red-500' :
                              rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }>
                              {rec.priority}
                            </Badge>
                            <Badge variant="outline">
                              {rec.expected_impact}% impact
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                        
                        <div className="grid gap-4 md:grid-cols-2 text-sm">
                          <div>
                            <Label className="text-xs">Implementation Steps</Label>
                            <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                              {rec.implementation_steps.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <Label className="text-xs">Success Metrics</Label>
                            <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                              {rec.success_metrics.map((metric, index) => (
                                <li key={index}>{metric}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                          <span>Timeline: {rec.timeline_weeks} weeks</span>
                          <span>Effort: {rec.effort_required}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Correlations */}
                <div>
                  <Label>Data Correlations</Label>
                  <div className="space-y-3 mt-2">
                    {selectedInsight.correlations.map((corr, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-green-800">
                            {corr.variable1.replace('_', ' ')} ↔ {corr.variable2.replace('_', ' ')}
                          </h5>
                          <Badge variant="outline" className="text-green-600">
                            r = {corr.correlation_strength.toFixed(3)}
                          </Badge>
                        </div>
                        <p className="text-xs text-green-700 mb-2">{corr.interpretation}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs text-green-600">
                          <div>Type: {corr.relationship_type}</div>
                          <div>p &lt; {corr.significance_level.toFixed(3)}</div>
                          <div>n = {corr.sample_size}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInsight(null)}>
              Close
            </Button>
            <Button>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Implement Recommendations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
