/**
 * Admin Analytics Dashboard Component
 * 
 * Task 8.5.5: Advanced analytics dashboard with organization-wide insights,
 * predictive analytics, and cross-class/teacher comparative analysis
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
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  GraduationCap,
  Target,
  Award,
  Clock,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Search,
  Plus,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Star,
  MessageSquare,
  BookOpen,
  Globe
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
interface AnalyticsMetrics {
  student_engagement: number;
  debate_completion_rate: number;
  average_session_quality: number;
  teacher_satisfaction: number;
  platform_growth_rate: number;
  retention_rate: number;
  feature_adoption: number;
  performance_score: number;
}

interface PredictiveInsight {
  id: string;
  type: 'student_success' | 'engagement_risk' | 'performance_trend' | 'resource_need' | 'capacity_planning';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  recommendation: string;
  data_points: string[];
  created_at: Date;
}

interface CrossAnalysis {
  dimension: 'class' | 'teacher' | 'time_period' | 'topic' | 'skill';
  metrics: ComparisonMetric[];
  top_performers: PerformanceItem[];
  bottom_performers: PerformanceItem[];
  insights: string[];
}

interface ComparisonMetric {
  name: string;
  values: { [key: string]: number };
  benchmark: number;
  trend: 'up' | 'down' | 'stable';
}

interface PerformanceItem {
  id: string;
  name: string;
  value: number;
  change: number;
  details: { [key: string]: any };
}

interface AnalyticsDashboardProps {
  organizationId?: string;
  canViewAnalytics?: boolean;
  canExportData?: boolean;
  timeRange?: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

const METRIC_CARDS = [
  { key: 'student_engagement', label: 'Student Engagement', icon: Users, color: 'text-blue-600', format: 'percentage' },
  { key: 'debate_completion_rate', label: 'Debate Completion', icon: CheckCircle2, color: 'text-green-600', format: 'percentage' },
  { key: 'average_session_quality', label: 'Session Quality', icon: Star, color: 'text-purple-600', format: 'rating' },
  { key: 'teacher_satisfaction', label: 'Teacher Satisfaction', icon: GraduationCap, color: 'text-orange-600', format: 'rating' },
  { key: 'platform_growth_rate', label: 'Platform Growth', icon: TrendingUp, color: 'text-teal-600', format: 'percentage' },
  { key: 'retention_rate', label: 'Retention Rate', icon: Target, color: 'text-pink-600', format: 'percentage' },
  { key: 'feature_adoption', label: 'Feature Adoption', icon: Zap, color: 'text-indigo-600', format: 'percentage' },
  { key: 'performance_score', label: 'Performance Score', icon: Award, color: 'text-red-600', format: 'score' }
];

export function AdminAnalyticsDashboard({
  organizationId,
  canViewAnalytics = true,
  canExportData = false,
  timeRange = '30d'
}: AnalyticsDashboardProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [crossAnalysis, setCrossAnalysis] = useState<CrossAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  useEffect(() => {
    if (canViewAnalytics) {
      loadAnalyticsData();
    }
  }, [canViewAnalytics, selectedTimeRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    
    // Mock analytics data
    const mockMetrics: AnalyticsMetrics = {
      student_engagement: 87.5,
      debate_completion_rate: 92.3,
      average_session_quality: 4.2,
      teacher_satisfaction: 4.6,
      platform_growth_rate: 23.4,
      retention_rate: 94.2,
      feature_adoption: 78.9,
      performance_score: 89.1
    };

    const mockInsights: PredictiveInsight[] = [
      {
        id: 'insight_1',
        type: 'student_success',
        title: 'High Success Probability Detected',
        description: 'Students who participate in debates 3+ times per week show 85% higher academic performance',
        confidence: 92,
        impact: 'high',
        timeframe: 'Next 30 days',
        recommendation: 'Increase debate frequency for underperforming students',
        data_points: ['debate_frequency', 'academic_scores', 'engagement_metrics'],
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'insight_2',
        type: 'engagement_risk',
        title: 'Engagement Risk Identified',
        description: '12% of students show declining participation patterns',
        confidence: 78,
        impact: 'medium',
        timeframe: 'Next 14 days',
        recommendation: 'Implement targeted re-engagement campaigns',
        data_points: ['participation_trends', 'login_frequency', 'session_duration'],
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000)
      }
    ];

    const mockCrossAnalysis: CrossAnalysis = {
      dimension: 'class',
      metrics: [
        {
          name: 'Average Engagement',
          values: {
            'Class A': 89.2,
            'Class B': 76.8,
            'Class C': 94.1,
            'Class D': 82.5
          },
          benchmark: 85.0,
          trend: 'up'
        }
      ],
      top_performers: [
        { id: '1', name: 'Class C - Advanced Debate', value: 94.1, change: 5.2, details: {} },
        { id: '2', name: 'Class A - Critical Thinking', value: 89.2, change: 2.8, details: {} }
      ],
      bottom_performers: [
        { id: '3', name: 'Class B - Introduction', value: 76.8, change: -1.5, details: {} }
      ],
      insights: [
        'Advanced classes show 18% higher engagement than introductory classes',
        'Morning sessions have 12% better completion rates than afternoon sessions'
      ]
    };

    setMetrics(mockMetrics);
    setInsights(mockInsights);
    setCrossAnalysis(mockCrossAnalysis);
    setIsLoading(false);
  };

  const formatMetricValue = (value: number, format: string) => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'rating':
        return `${value.toFixed(1)}/5`;
      case 'score':
        return value.toFixed(0);
      default:
        return value.toString();
    }
  };

  const getMetricTrend = (current: number, format: string) => {
    // Simulate trend calculation
    const change = (Math.random() - 0.5) * 10;
    return {
      change: Math.abs(change),
      direction: change > 0 ? 'up' : 'down',
      isPositive: format === 'percentage' || format === 'rating' || format === 'score' ? change > 0 : change < 0
    };
  };

  if (!canViewAnalytics) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You do not have permission to view analytics data.
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
            <BarChart3 className="h-5 w-5 mr-2" />
            Advanced Analytics Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Organization-wide insights, predictive analytics, and comparative analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canExportData && (
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {METRIC_CARDS.map((card) => {
            const value = metrics[card.key as keyof AnalyticsMetrics];
            const trend = getMetricTrend(value, card.format);
            
            return (
              <Card key={card.key}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                    <div className={`flex items-center text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {trend.direction === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      <span className="ml-1">{trend.change.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-bold">{formatMetricValue(value, card.format)}</div>
                    <div className="text-xs text-muted-foreground">{card.label}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Predictive Insights</TabsTrigger>
          <TabsTrigger value="comparison">Cross Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={[
                    { date: '2024-01', engagement: 78, completion: 85 },
                    { date: '2024-02', engagement: 82, completion: 88 },
                    { date: '2024-03', engagement: 87, completion: 92 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="engagement" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="completion" stroke="#22c55e" strokeWidth={2} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Excellent', value: 35, color: '#22c55e' },
                        { name: 'Good', value: 40, color: '#3b82f6' },
                        { name: 'Average', value: 20, color: '#f59e0b' },
                        { name: 'Needs Improvement', value: 5, color: '#ef4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Excellent', value: 35, color: '#22c55e' },
                        { name: 'Good', value: 40, color: '#3b82f6' },
                        { name: 'Average', value: 20, color: '#f59e0b' },
                        { name: 'Needs Improvement', value: 5, color: '#ef4444' }
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

          <Card>
            <CardHeader>
              <CardTitle>Platform Usage Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">2,847</div>
                  <div className="text-sm text-muted-foreground">Active Students</div>
                  <div className="text-xs text-green-600 mt-1">↑ 12.3% vs last month</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">156</div>
                  <div className="text-sm text-muted-foreground">Active Teachers</div>
                  <div className="text-xs text-green-600 mt-1">↑ 8.7% vs last month</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">4,523</div>
                  <div className="text-sm text-muted-foreground">Debates Completed</div>
                  <div className="text-xs text-green-600 mt-1">↑ 23.1% vs last month</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      insight.type === 'student_success' ? 'bg-green-50 text-green-600' :
                      insight.type === 'engagement_risk' ? 'bg-red-50 text-red-600' :
                      insight.type === 'performance_trend' ? 'bg-blue-50 text-blue-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span>Confidence: {insight.confidence}%</span>
                        <Badge className={
                          insight.impact === 'high' ? 'bg-red-500' :
                          insight.impact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }>
                          {insight.impact} impact
                        </Badge>
                        <span>{insight.timeframe}</span>
                      </div>
                    </div>
                  </div>
                  <Progress value={insight.confidence} className="w-20" />
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Recommendation</h4>
                  <p className="text-sm text-blue-700">{insight.recommendation}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {crossAnalysis && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Cross-Class Performance Comparison</CardTitle>
                  <CardDescription>
                    Comparative analysis across different classes and teachers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {crossAnalysis.metrics.map((metric, index) => (
                    <div key={index} className="mb-6">
                      <h4 className="font-medium mb-3">{metric.name}</h4>
                      <div className="space-y-2">
                        {Object.entries(metric.values).map(([name, value]) => (
                          <div key={name} className="flex items-center justify-between">
                            <span className="text-sm">{name}</span>
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={(value / Math.max(...Object.values(metric.values))) * 100} 
                                className="w-24" 
                              />
                              <span className="text-sm font-medium w-12 text-right">
                                {value.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Benchmark: {metric.benchmark}%
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>Top Performers</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {crossAnalysis.top_performers.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.value.toFixed(1)}% performance
                            </div>
                          </div>
                          <div className="flex items-center text-xs text-green-600">
                            <ArrowUp className="h-3 w-3" />
                            <span className="ml-1">{item.change.toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span>Needs Attention</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {crossAnalysis.bottom_performers.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.value.toFixed(1)}% performance
                            </div>
                          </div>
                          <div className="flex items-center text-xs text-red-600">
                            <ArrowDown className="h-3 w-3" />
                            <span className="ml-1">{Math.abs(item.change).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {crossAnalysis.insights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <span className="text-sm">{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Long-term Trend Analysis</CardTitle>
              <CardDescription>
                Historical trends and pattern recognition across platform data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={[
                  { month: 'Jan', students: 2200, teachers: 120, debates: 3800 },
                  { month: 'Feb', students: 2350, teachers: 125, debates: 4100 },
                  { month: 'Mar', students: 2500, teachers: 140, debates: 4500 },
                  { month: 'Apr', students: 2650, teachers: 150, debates: 4800 },
                  { month: 'May', students: 2800, teachers: 156, debates: 5200 },
                  { month: 'Jun', students: 2847, teachers: 156, debates: 4523 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="students" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="debates" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
