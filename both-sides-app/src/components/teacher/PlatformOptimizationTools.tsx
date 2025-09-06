/**
 * Platform Optimization Tools Component
 * 
 * Task 8.5.5: Performance optimization recommendations, feature usage analysis,
 * and user experience optimization based on behavior patterns
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
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Clock,
  Target,
  Award,
  Settings,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  Copy,
  Share2,
  FileText,
  BarChart3,
  LineChart,
  PieChart,
  MousePointer,
  Navigation,
  Layers,
  Cpu,
  HardDrive,
  Wifi,
  Battery,
  Gauge,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Star,
  Heart,
  ThumbsUp,
  MessageSquare
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  TreeMap
} from 'recharts';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface PerformanceMetric {
  id: string;
  name: string;
  category: MetricCategory;
  current_value: number;
  baseline_value: number;
  target_value: number;
  unit: string;
  trend: 'improving' | 'declining' | 'stable';
  impact_score: number;
  recommendations: OptimizationRecommendation[];
  last_updated: Date;
}

type MetricCategory = 'performance' | 'engagement' | 'usability' | 'accessibility' | 'conversion' | 'retention';

interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort_required: 'low' | 'medium' | 'high';
  expected_impact: number;
  implementation_time: string;
  technical_complexity: number;
  business_value: number;
  implementation_steps: string[];
  success_metrics: string[];
  risks: string[];
  dependencies: string[];
  status: 'identified' | 'planned' | 'in_progress' | 'completed' | 'dismissed';
}

type RecommendationCategory = 'performance' | 'ux' | 'accessibility' | 'feature_optimization' | 'content' | 'technical';

interface FeatureUsage {
  feature_id: string;
  feature_name: string;
  category: FeatureCategory;
  usage_metrics: UsageMetrics;
  user_segments: SegmentUsage[];
  performance_impact: PerformanceImpact;
  user_feedback: UserFeedback;
  optimization_opportunities: FeatureOptimization[];
  lifecycle_stage: LifecycleStage;
}

type FeatureCategory = 'core' | 'secondary' | 'experimental' | 'deprecated' | 'premium';
type LifecycleStage = 'introduction' | 'growth' | 'maturity' | 'decline' | 'sunset';

interface UsageMetrics {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  usage_frequency: number;
  adoption_rate: number;
  retention_rate: number;
  engagement_score: number;
  completion_rate: number;
  error_rate: number;
  load_time_p95: number;
}

interface SegmentUsage {
  segment_name: string;
  user_count: number;
  usage_rate: number;
  engagement_level: 'high' | 'medium' | 'low';
  satisfaction_score: number;
  behavior_patterns: BehaviorPattern[];
}

interface BehaviorPattern {
  pattern_name: string;
  frequency: number;
  context: string;
  outcome: 'positive' | 'neutral' | 'negative';
  insights: string[];
}

interface PerformanceImpact {
  cpu_usage: number;
  memory_usage: number;
  network_usage: number;
  load_time_impact: number;
  resource_efficiency: number;
  scalability_concerns: string[];
}

interface UserFeedback {
  satisfaction_score: number;
  nps_score: number;
  feedback_volume: number;
  common_complaints: string[];
  feature_requests: string[];
  positive_mentions: string[];
}

interface FeatureOptimization {
  optimization_type: 'performance' | 'ux' | 'functionality' | 'accessibility';
  description: string;
  estimated_impact: number;
  implementation_effort: number;
  risk_level: 'low' | 'medium' | 'high';
}

interface UXOptimization {
  id: string;
  page_path: string;
  optimization_type: UXOptimizationType;
  current_metrics: UXMetrics;
  proposed_changes: ProposedChange[];
  a_b_test_results?: ABTestResult;
  user_journey_impact: JourneyImpact;
  accessibility_improvements: AccessibilityImprovement[];
  mobile_optimizations: MobileOptimization[];
}

type UXOptimizationType = 'navigation' | 'layout' | 'content' | 'interaction' | 'visual_design' | 'accessibility';

interface UXMetrics {
  bounce_rate: number;
  time_on_page: number;
  conversion_rate: number;
  user_satisfaction: number;
  task_completion_rate: number;
  error_rate: number;
  click_through_rate: number;
  scroll_depth: number;
}

interface ProposedChange {
  change_id: string;
  element: string;
  current_state: string;
  proposed_state: string;
  rationale: string;
  expected_improvement: number;
  implementation_complexity: number;
}

interface ABTestResult {
  test_id: string;
  variant_performance: { [key: string]: number };
  statistical_significance: boolean;
  confidence_level: number;
  recommendation: string;
}

interface JourneyImpact {
  journey_stage: string;
  impact_type: 'positive' | 'neutral' | 'negative';
  affected_flows: string[];
  downstream_effects: string[];
}

interface AccessibilityImprovement {
  wcag_guideline: string;
  current_compliance: 'pass' | 'fail' | 'partial';
  improvement_description: string;
  implementation_effort: 'low' | 'medium' | 'high';
  impact_on_users: string;
}

interface MobileOptimization {
  optimization_area: 'touch_targets' | 'viewport' | 'performance' | 'navigation' | 'content';
  current_issue: string;
  proposed_solution: string;
  expected_improvement: string;
}

interface PlatformOptimizationToolsProps {
  organizationId?: string;
  canViewMetrics?: boolean;
  canImplementChanges?: boolean;
  canRunTests?: boolean;
  showAdvancedFeatures?: boolean;
}

const METRIC_CATEGORIES = [
  { value: 'performance', label: 'Performance', icon: Zap, color: 'text-yellow-600' },
  { value: 'engagement', label: 'Engagement', icon: Users, color: 'text-blue-600' },
  { value: 'usability', label: 'Usability', icon: MousePointer, color: 'text-green-600' },
  { value: 'accessibility', label: 'Accessibility', icon: Eye, color: 'text-purple-600' },
  { value: 'conversion', label: 'Conversion', icon: Target, color: 'text-red-600' },
  { value: 'retention', label: 'Retention', icon: Heart, color: 'text-pink-600' }
];

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

export function PlatformOptimizationTools({
  organizationId,
  canViewMetrics = true,
  canImplementChanges = false,
  canRunTests = false,
  showAdvancedFeatures = false
}: PlatformOptimizationToolsProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('performance');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [uxOptimizations, setUXOptimizations] = useState<UXOptimization[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Dialog states
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<OptimizationRecommendation | null>(null);

  useEffect(() => {
    if (canViewMetrics) {
      loadOptimizationData();
    }
  }, [canViewMetrics]);

  const loadOptimizationData = async () => {
    setIsLoading(true);
    
    // Mock performance metrics
    const mockMetrics: PerformanceMetric[] = [
      {
        id: 'metric_1',
        name: 'Page Load Time (P95)',
        category: 'performance',
        current_value: 2.8,
        baseline_value: 3.2,
        target_value: 2.0,
        unit: 'seconds',
        trend: 'improving',
        impact_score: 8.7,
        recommendations: [
          {
            id: 'rec_1',
            title: 'Implement Resource Preloading',
            description: 'Preload critical resources to reduce load times by estimated 0.5 seconds',
            category: 'performance',
            priority: 'high',
            effort_required: 'medium',
            expected_impact: 15,
            implementation_time: '2-3 days',
            technical_complexity: 6,
            business_value: 9,
            implementation_steps: [
              'Identify critical resources for preloading',
              'Implement preload hints in HTML head',
              'Test and validate performance improvements'
            ],
            success_metrics: ['Page load time reduction', 'Core Web Vitals improvement'],
            risks: ['Potential increase in initial page weight'],
            dependencies: ['Frontend development team'],
            status: 'identified'
          }
        ],
        last_updated: new Date()
      },
      {
        id: 'metric_2',
        name: 'User Engagement Score',
        category: 'engagement',
        current_value: 7.2,
        baseline_value: 6.8,
        target_value: 8.0,
        unit: 'score',
        trend: 'improving',
        impact_score: 9.1,
        recommendations: [
          {
            id: 'rec_2',
            title: 'Personalize Debate Recommendations',
            description: 'Use ML to suggest debates based on user interests and past participation',
            category: 'ux',
            priority: 'high',
            effort_required: 'high',
            expected_impact: 20,
            implementation_time: '2-3 weeks',
            technical_complexity: 8,
            business_value: 9,
            implementation_steps: [
              'Develop recommendation algorithm',
              'Implement user preference tracking',
              'A/B test recommendation system'
            ],
            success_metrics: ['Engagement score increase', 'Session duration improvement'],
            risks: ['Algorithm bias', 'Privacy concerns'],
            dependencies: ['Data science team', 'ML infrastructure'],
            status: 'planned'
          }
        ],
        last_updated: new Date()
      }
    ];

    // Mock feature usage data
    const mockFeatureUsage: FeatureUsage[] = [
      {
        feature_id: 'debate_creation',
        feature_name: 'Debate Creation Tool',
        category: 'core',
        usage_metrics: {
          total_users: 1247,
          active_users_7d: 234,
          active_users_30d: 567,
          usage_frequency: 3.2,
          adoption_rate: 78.5,
          retention_rate: 84.2,
          engagement_score: 8.1,
          completion_rate: 92.3,
          error_rate: 2.1,
          load_time_p95: 1.8
        },
        user_segments: [
          {
            segment_name: 'Teachers',
            user_count: 156,
            usage_rate: 94.2,
            engagement_level: 'high',
            satisfaction_score: 8.7,
            behavior_patterns: [
              {
                pattern_name: 'Batch Debate Creation',
                frequency: 67,
                context: 'Preparing for upcoming classes',
                outcome: 'positive',
                insights: ['Teachers prefer creating multiple debates at once', 'Template usage is high']
              }
            ]
          }
        ],
        performance_impact: {
          cpu_usage: 12.3,
          memory_usage: 45.6,
          network_usage: 23.1,
          load_time_impact: 0.4,
          resource_efficiency: 7.8,
          scalability_concerns: ['Database query optimization needed']
        },
        user_feedback: {
          satisfaction_score: 8.1,
          nps_score: 67,
          feedback_volume: 89,
          common_complaints: ['Loading time', 'Complex interface'],
          feature_requests: ['Template library', 'Bulk operations'],
          positive_mentions: ['Intuitive design', 'Powerful features']
        },
        optimization_opportunities: [
          {
            optimization_type: 'performance',
            description: 'Optimize database queries for debate creation',
            estimated_impact: 25,
            implementation_effort: 5,
            risk_level: 'low'
          }
        ],
        lifecycle_stage: 'maturity'
      }
    ];

    // Mock UX optimizations
    const mockUXOptimizations: UXOptimization[] = [
      {
        id: 'ux_1',
        page_path: '/dashboard',
        optimization_type: 'navigation',
        current_metrics: {
          bounce_rate: 23.4,
          time_on_page: 245,
          conversion_rate: 67.8,
          user_satisfaction: 7.2,
          task_completion_rate: 84.5,
          error_rate: 3.2,
          click_through_rate: 45.6,
          scroll_depth: 67.3
        },
        proposed_changes: [
          {
            change_id: 'change_1',
            element: 'Primary Navigation',
            current_state: 'Horizontal menu with 8 items',
            proposed_state: 'Reorganized menu with 5 main categories',
            rationale: 'Reduce cognitive load and improve findability',
            expected_improvement: 15,
            implementation_complexity: 4
          }
        ],
        user_journey_impact: {
          journey_stage: 'Discovery',
          impact_type: 'positive',
          affected_flows: ['Feature discovery', 'Task completion'],
          downstream_effects: ['Increased feature adoption', 'Reduced support tickets']
        },
        accessibility_improvements: [
          {
            wcag_guideline: '2.4.3 Focus Order',
            current_compliance: 'partial',
            improvement_description: 'Implement logical focus order for keyboard navigation',
            implementation_effort: 'medium',
            impact_on_users: 'Improves usability for keyboard and screen reader users'
          }
        ],
        mobile_optimizations: [
          {
            optimization_area: 'navigation',
            current_issue: 'Navigation menu difficult to use on mobile',
            proposed_solution: 'Implement hamburger menu with improved touch targets',
            expected_improvement: 'Increased mobile task completion by 20%'
          }
        ]
      }
    ];

    setPerformanceMetrics(mockMetrics);
    setFeatureUsage(mockFeatureUsage);
    setUXOptimizations(mockUXOptimizations);
    setIsLoading(false);
  };

  const implementRecommendation = (recommendation: OptimizationRecommendation) => {
    if (!canImplementChanges) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to implement optimization changes.'
      });
      return;
    }

    // Update recommendation status
    setPerformanceMetrics(prev => prev.map(metric => ({
      ...metric,
      recommendations: metric.recommendations.map(rec =>
        rec.id === recommendation.id
          ? { ...rec, status: 'in_progress' as const }
          : rec
      )
    })));

    addNotification({
      type: 'success',
      title: 'Implementation Started',
      message: `${recommendation.title} has been scheduled for implementation.`
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <Activity className="h-4 w-4 text-gray-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!canViewMetrics) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You do not have permission to view platform optimization tools.
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
            <Zap className="h-5 w-5 mr-2" />
            Platform Optimization Tools
          </h3>
          <p className="text-sm text-muted-foreground">
            Performance optimization, feature usage analysis, and UX improvements
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadOptimizationData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button onClick={() => setShowOptimizationDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">2.8s</div>
                <div className="text-xs text-muted-foreground">Avg Load Time</div>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600 ml-1">-12.5% vs last month</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                <Zap className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">94.2%</div>
                <div className="text-xs text-muted-foreground">Feature Adoption</div>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600 ml-1">+5.7% vs last month</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">8.1/10</div>
                <div className="text-xs text-muted-foreground">UX Score</div>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600 ml-1">+0.3 vs last month</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <MousePointer className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">12</div>
                <div className="text-xs text-muted-foreground">Active Optimizations</div>
                <div className="flex items-center mt-1">
                  <Clock className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-600 ml-1">3 high priority</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Target className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search optimizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {METRIC_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="features">Feature Usage</TabsTrigger>
          <TabsTrigger value="ux">UX Optimization</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={[
                    { month: 'Jan', load_time: 3.2, bounce_rate: 28, satisfaction: 6.8 },
                    { month: 'Feb', load_time: 3.0, bounce_rate: 26, satisfaction: 7.1 },
                    { month: 'Mar', load_time: 2.8, bounce_rate: 23, satisfaction: 7.2 },
                    { month: 'Apr', load_time: 2.7, bounce_rate: 22, satisfaction: 7.4 },
                    { month: 'May', load_time: 2.8, bounce_rate: 23, satisfaction: 7.2 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="load_time" stroke="#f59e0b" name="Load Time (s)" />
                    <Line type="monotone" dataKey="satisfaction" stroke="#3b82f6" name="User Satisfaction" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Impact Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'JavaScript Loading', value: 35, color: '#ef4444' },
                        { name: 'Image Optimization', value: 25, color: '#f59e0b' },
                        { name: 'API Response Time', value: 20, color: '#3b82f6' },
                        { name: 'CSS/Styling', value: 12, color: '#22c55e' },
                        { name: 'Other', value: 8, color: '#8b5cf6' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'JavaScript Loading', value: 35, color: '#ef4444' },
                        { name: 'Image Optimization', value: 25, color: '#f59e0b' },
                        { name: 'API Response Time', value: 20, color: '#3b82f6' },
                        { name: 'CSS/Styling', value: 12, color: '#22c55e' },
                        { name: 'Other', value: 8, color: '#8b5cf6' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics List */}
          <div className="space-y-4">
            {performanceMetrics.map((metric) => (
              <Card key={metric.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-muted ${
                        METRIC_CATEGORIES.find(c => c.value === metric.category)?.color || 'text-gray-600'
                      }`}>
                        {React.createElement(
                          METRIC_CATEGORIES.find(c => c.value === metric.category)?.icon || Activity,
                          { className: 'h-5 w-5' }
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{metric.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Current: {metric.current_value}{metric.unit}</span>
                          <span>Target: {metric.target_value}{metric.unit}</span>
                          <span>Impact: {metric.impact_score.toFixed(1)}/10</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(metric.trend)}
                      <Progress 
                        value={Math.min((metric.current_value / metric.target_value) * 100, 100)} 
                        className="w-24" 
                      />
                    </div>
                  </div>

                  {/* Recommendations */}
                  {metric.recommendations.length > 0 && (
                    <div className="space-y-2">
                      {metric.recommendations.map((rec) => (
                        <div key={rec.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Lightbulb className="h-4 w-4 text-blue-600" />
                            <div>
                              <h4 className="text-sm font-medium text-blue-800">{rec.title}</h4>
                              <p className="text-xs text-blue-600">{rec.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rec.expected_impact}% impact
                            </Badge>
                            {canImplementChanges && (
                              <Button 
                                size="sm" 
                                onClick={() => implementRecommendation(rec)}
                                disabled={rec.status === 'in_progress' || rec.status === 'completed'}
                              >
                                {rec.status === 'in_progress' ? 'In Progress' : 
                                 rec.status === 'completed' ? 'Completed' : 'Implement'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          {featureUsage.map((feature) => (
            <Card key={feature.feature_id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      feature.category === 'core' ? 'bg-blue-50 text-blue-600' :
                      feature.category === 'secondary' ? 'bg-green-50 text-green-600' :
                      feature.category === 'experimental' ? 'bg-purple-50 text-purple-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{feature.feature_name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <Badge variant="outline" className="capitalize">{feature.category}</Badge>
                        <Badge variant="outline" className="capitalize">{feature.lifecycle_stage}</Badge>
                        <span>Users: {feature.usage_metrics.total_users.toLocaleString()}</span>
                        <span>Adoption: {feature.usage_metrics.adoption_rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Usage Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{feature.usage_metrics.engagement_score.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Engagement Score</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{feature.usage_metrics.completion_rate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Completion Rate</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{feature.usage_metrics.retention_rate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Retention Rate</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{feature.usage_metrics.error_rate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Error Rate</div>
                  </div>
                </div>

                {/* User Feedback */}
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 mb-2">User Feedback Summary</h4>
                  <div className="grid gap-2 md:grid-cols-3 text-xs text-green-700">
                    <div>Satisfaction: {feature.user_feedback.satisfaction_score.toFixed(1)}/10</div>
                    <div>NPS Score: {feature.user_feedback.nps_score}</div>
                    <div>Feedback Volume: {feature.user_feedback.feedback_volume}</div>
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <div>
                      <Label className="text-xs text-green-800">Top Requests:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {feature.user_feedback.feature_requests.slice(0, 3).map((request, index) => (
                          <Badge key={index} variant="outline" className="text-xs text-green-600">
                            {request}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optimization Opportunities */}
                {feature.optimization_opportunities.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {feature.optimization_opportunities.map((opportunity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Target className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800 capitalize">
                            {opportunity.optimization_type} Optimization
                          </span>
                          <span className="text-xs text-yellow-600">
                            {opportunity.description}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs text-yellow-600">
                            {opportunity.estimated_impact}% impact
                          </Badge>
                          <Badge className={
                            opportunity.risk_level === 'high' ? 'bg-red-500' :
                            opportunity.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }>
                            {opportunity.risk_level} risk
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ux" className="space-y-6">
          {uxOptimizations.map((ux) => (
            <Card key={ux.id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MousePointer className="h-5 w-5 text-green-600" />
                  <span>UX Optimization - {ux.page_path}</span>
                  <Badge variant="outline" className="capitalize">{ux.optimization_type.replace('_', ' ')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{ux.current_metrics.bounce_rate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Bounce Rate</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{ux.current_metrics.time_on_page}s</div>
                    <div className="text-xs text-muted-foreground">Time on Page</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{ux.current_metrics.conversion_rate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Conversion Rate</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{ux.current_metrics.user_satisfaction.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Satisfaction Score</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {ux.proposed_changes.map((change) => (
                    <div key={change.change_id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{change.element}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            +{change.expected_improvement}% improvement
                          </Badge>
                          <Badge className={
                            change.implementation_complexity > 7 ? 'bg-red-500' :
                            change.implementation_complexity > 4 ? 'bg-yellow-500' : 'bg-green-500'
                          }>
                            {change.implementation_complexity > 7 ? 'High' :
                             change.implementation_complexity > 4 ? 'Medium' : 'Low'} complexity
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid gap-3 md:grid-cols-2 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Current State</Label>
                          <p className="text-gray-700">{change.current_state}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Proposed State</Label>
                          <p className="text-green-700">{change.proposed_state}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                        <strong>Rationale:</strong> {change.rationale}
                      </div>
                    </div>
                  ))}
                </div>

                {ux.accessibility_improvements.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Accessibility Improvements
                    </h4>
                    <div className="space-y-2">
                      {ux.accessibility_improvements.map((improvement, index) => (
                        <div key={index} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-800">
                              {improvement.wcag_guideline}
                            </span>
                            <Badge className={
                              improvement.current_compliance === 'pass' ? 'bg-green-500' :
                              improvement.current_compliance === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                            }>
                              {improvement.current_compliance}
                            </Badge>
                          </div>
                          <p className="text-xs text-purple-700 mb-2">{improvement.improvement_description}</p>
                          <p className="text-xs text-purple-600">{improvement.impact_on_users}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Recommendations</h3>
            <p className="text-muted-foreground">
              Consolidated view of all optimization recommendations across the platform
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <Dialog open={showOptimizationDialog} onOpenChange={setShowOptimizationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Optimization Report</DialogTitle>
            <DialogDescription>
              Generate a comprehensive optimization report
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-12">
            <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Report Generation</h3>
            <p className="text-muted-foreground">
              Export functionality would be implemented here
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOptimizationDialog(false)}>
              Cancel
            </Button>
            <Button>Generate Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
