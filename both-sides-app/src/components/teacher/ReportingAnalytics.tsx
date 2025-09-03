/**
 * Reporting Analytics Component
 * 
 * Task 8.5.3: Advanced analytics for report usage, effectiveness measurement,
 * and automated optimization suggestions
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Clock,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Star,
  Download,
  Share2,
  Filter,
  Calendar,
  RefreshCw,
  Settings,
  Eye,
  FileText,
  Database,
  MessageSquare,
  Award,
  ThumbsUp,
  ThumbsDown,
  Mail,
  Bell,
  ExternalLink,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  Treemap,
  ComposedChart
} from 'recharts';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface ReportAnalytics {
  report_id: string;
  report_name: string;
  template_id?: string;
  template_name?: string;
  category: string;
  usage_metrics: UsageMetrics;
  performance_metrics: PerformanceMetrics;
  effectiveness_metrics: EffectivenessMetrics;
  user_engagement: UserEngagement;
  optimization_scores: OptimizationScores;
  feedback_analytics: FeedbackAnalytics;
  trend_analysis: TrendAnalysis;
  created_at: Date;
  updated_at: Date;
}

interface UsageMetrics {
  total_generations: number;
  unique_users: number;
  total_downloads: number;
  avg_generations_per_user: number;
  popular_formats: FormatUsage[];
  usage_by_time: TimeUsage[];
  usage_by_organization: OrganizationUsage[];
  usage_frequency: FrequencyMetrics;
  retention_metrics: RetentionMetrics;
}

interface FormatUsage {
  format: string;
  count: number;
  percentage: number;
  avg_file_size: number;
  success_rate: number;
}

interface TimeUsage {
  period: Date;
  period_type: 'hour' | 'day' | 'week' | 'month';
  generations: number;
  unique_users: number;
  success_rate: number;
  avg_generation_time: number;
}

interface OrganizationUsage {
  organization_id: string;
  organization_name: string;
  total_usage: number;
  unique_users: number;
  success_rate: number;
  avg_satisfaction: number;
}

interface FrequencyMetrics {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  power_users: number; // Users with >10 generations
  occasional_users: number; // Users with 1-10 generations
  one_time_users: number; // Users with exactly 1 generation
}

interface RetentionMetrics {
  day_1_retention: number;
  day_7_retention: number;
  day_30_retention: number;
  avg_time_to_second_use: number; // hours
  churn_rate: number;
  reactivation_rate: number;
}

interface PerformanceMetrics {
  avg_generation_time: number;
  median_generation_time: number;
  p95_generation_time: number;
  success_rate: number;
  error_rate: number;
  timeout_rate: number;
  avg_file_size: number;
  memory_usage: MemoryUsage;
  cpu_usage: CpuUsage;
  database_performance: DatabasePerformance;
  bottleneck_analysis: BottleneckAnalysis[];
}

interface MemoryUsage {
  avg_memory_mb: number;
  peak_memory_mb: number;
  memory_efficiency_score: number;
}

interface CpuUsage {
  avg_cpu_percent: number;
  peak_cpu_percent: number;
  cpu_efficiency_score: number;
}

interface DatabasePerformance {
  avg_query_time: number;
  slow_queries_count: number;
  query_efficiency_score: number;
  index_usage_rate: number;
}

interface BottleneckAnalysis {
  component: string;
  bottleneck_type: 'cpu' | 'memory' | 'database' | 'network' | 'disk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact_percentage: number;
  description: string;
  suggested_fix: string;
}

interface EffectivenessMetrics {
  user_satisfaction: number;
  task_completion_rate: number;
  time_to_insight: number; // minutes
  report_accuracy: number;
  actionability_score: number;
  business_value_score: number;
  adoption_rate: number;
  feature_utilization: FeatureUtilization[];
  outcome_tracking: OutcomeTracking;
}

interface FeatureUtilization {
  feature_name: string;
  usage_percentage: number;
  user_satisfaction: number;
  abandonment_rate: number;
  feature_value_score: number;
}

interface OutcomeTracking {
  decisions_influenced: number;
  actions_taken: number;
  policy_changes: number;
  time_saved_hours: number;
  cost_savings_estimated: number;
  student_outcomes_improved: number;
}

interface UserEngagement {
  interaction_patterns: InteractionPattern[];
  session_analytics: SessionAnalytics;
  user_journey: UserJourney[];
  drop_off_points: DropOffPoint[];
  feature_adoption: FeatureAdoption[];
  user_segments: UserSegment[];
}

interface InteractionPattern {
  action_type: string;
  frequency: number;
  avg_time_spent: number;
  success_rate: number;
  user_satisfaction: number;
  next_actions: NextAction[];
}

interface NextAction {
  action: string;
  probability: number;
  avg_time_to_action: number;
}

interface SessionAnalytics {
  avg_session_duration: number;
  median_session_duration: number;
  sessions_per_user: number;
  bounce_rate: number;
  page_views_per_session: number;
  conversion_rate: number;
}

interface UserJourney {
  step_name: string;
  step_order: number;
  completion_rate: number;
  avg_time_spent: number;
  drop_off_rate: number;
  satisfaction_score: number;
}

interface DropOffPoint {
  location: string;
  drop_off_rate: number;
  common_reasons: string[];
  recovery_rate: number;
  suggested_improvements: string[];
}

interface FeatureAdoption {
  feature_name: string;
  adoption_rate: number;
  time_to_adoption: number; // days
  user_satisfaction: number;
  feature_stickiness: number; // percentage of users who continue using after first try
}

interface UserSegment {
  segment_name: string;
  user_count: number;
  avg_usage_frequency: number;
  avg_satisfaction: number;
  key_behaviors: string[];
  pain_points: string[];
  opportunities: string[];
}

interface OptimizationScores {
  overall_score: number;
  performance_score: number;
  usability_score: number;
  reliability_score: number;
  scalability_score: number;
  maintainability_score: number;
  security_score: number;
  recommendations: OptimizationRecommendation[];
  improvement_opportunities: ImprovementOpportunity[];
}

interface OptimizationRecommendation {
  id: string;
  category: 'performance' | 'usability' | 'reliability' | 'scalability' | 'maintainability' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expected_impact: number; // percentage improvement expected
  implementation_effort: 'low' | 'medium' | 'high';
  estimated_timeline: string;
  success_metrics: string[];
  prerequisites: string[];
  resources_needed: string[];
}

interface ImprovementOpportunity {
  area: string;
  current_score: number;
  potential_score: number;
  improvement_percentage: number;
  actions_required: string[];
  business_impact: string;
  technical_complexity: 'low' | 'medium' | 'high';
}

interface FeedbackAnalytics {
  overall_rating: number;
  rating_distribution: RatingDistribution[];
  sentiment_analysis: SentimentAnalysis;
  common_themes: FeedbackTheme[];
  feature_requests: FeatureRequestAnalysis[];
  bug_reports: BugReportAnalysis[];
  user_testimonials: UserTestimonial[];
}

interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

interface SentimentAnalysis {
  positive_percentage: number;
  neutral_percentage: number;
  negative_percentage: number;
  sentiment_trends: SentimentTrend[];
  emotion_analysis: EmotionAnalysis[];
}

interface SentimentTrend {
  date: Date;
  positive_score: number;
  neutral_score: number;
  negative_score: number;
}

interface EmotionAnalysis {
  emotion: 'joy' | 'trust' | 'fear' | 'surprise' | 'sadness' | 'disgust' | 'anger' | 'anticipation';
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface FeedbackTheme {
  theme: string;
  frequency: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  subcategories: string[];
  example_quotes: string[];
  actionable_insights: string[];
}

interface FeatureRequestAnalysis {
  feature: string;
  request_count: number;
  user_votes: number;
  feasibility_score: number;
  business_value_score: number;
  implementation_effort: string;
  similar_requests: string[];
}

interface BugReportAnalysis {
  bug_category: string;
  report_count: number;
  severity_distribution: { [key: string]: number };
  resolution_rate: number;
  avg_resolution_time: number;
  user_impact_score: number;
}

interface UserTestimonial {
  id: string;
  user_role: string;
  organization_type: string;
  quote: string;
  use_case: string;
  business_impact: string;
  credibility_score: number;
}

interface TrendAnalysis {
  usage_trends: UsageTrend[];
  performance_trends: PerformanceTrend[];
  satisfaction_trends: SatisfactionTrend[];
  predictive_analytics: PredictiveAnalytics;
  anomaly_detection: AnomalyDetection[];
  seasonal_patterns: SeasonalPattern[];
}

interface UsageTrend {
  metric: string;
  time_series: TimeSeriesPoint[];
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  growth_rate: number; // percentage
  seasonality: boolean;
  forecast: ForecastPoint[];
}

interface PerformanceTrend {
  metric: string;
  time_series: TimeSeriesPoint[];
  performance_baseline: number;
  current_performance: number;
  performance_change: number;
  trend_stability: number;
}

interface SatisfactionTrend {
  period: Date;
  satisfaction_score: number;
  response_count: number;
  key_drivers: string[];
  improvement_areas: string[];
}

interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  confidence_interval?: [number, number];
}

interface ForecastPoint {
  timestamp: Date;
  predicted_value: number;
  confidence_lower: number;
  confidence_upper: number;
  prediction_quality: number;
}

interface PredictiveAnalytics {
  usage_forecast: UsageForecast;
  performance_predictions: PerformancePrediction[];
  user_behavior_predictions: UserBehaviorPrediction[];
  capacity_planning: CapacityPrediction[];
}

interface UsageForecast {
  next_7_days: number;
  next_30_days: number;
  next_quarter: number;
  confidence_level: number;
  influencing_factors: string[];
}

interface PerformancePrediction {
  metric: string;
  predicted_value: number;
  prediction_date: Date;
  confidence: number;
  risk_factors: string[];
}

interface UserBehaviorPrediction {
  behavior_type: string;
  likelihood: number;
  timeframe: string;
  user_segment: string;
  triggers: string[];
}

interface CapacityPrediction {
  resource_type: string;
  current_capacity: number;
  predicted_demand: number;
  capacity_utilization: number;
  scaling_recommendations: string[];
}

interface AnomalyDetection {
  detected_at: Date;
  anomaly_type: 'spike' | 'drop' | 'outlier' | 'trend_break';
  affected_metric: string;
  severity: 'low' | 'medium' | 'high';
  deviation_percentage: number;
  possible_causes: string[];
  impact_assessment: string;
  recommended_actions: string[];
}

interface SeasonalPattern {
  pattern_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  metric: string;
  pattern_strength: number;
  peak_periods: string[];
  low_periods: string[];
  business_implications: string[];
}

interface ReportingAnalyticsProps {
  organizationId?: string;
  reportId?: string;
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  showPredictions?: boolean;
  showOptimizations?: boolean;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

export function ReportingAnalytics({
  organizationId,
  reportId,
  timeRange = 'month',
  showPredictions = true,
  showOptimizations = true
}: ReportingAnalyticsProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [reportAnalytics, setReportAnalytics] = useState<ReportAnalytics[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportAnalytics | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    loadReportingAnalytics();
  }, [selectedTimeRange, organizationId, reportId]);

  const loadReportingAnalytics = async () => {
    setIsLoading(true);
    
    // Mock analytics data
    const mockAnalytics: ReportAnalytics[] = [
      {
        report_id: 'report_1',
        report_name: 'Student Performance Dashboard',
        template_id: 'template_1',
        template_name: 'Performance Template',
        category: 'student_performance',
        usage_metrics: {
          total_generations: 1247,
          unique_users: 234,
          total_downloads: 892,
          avg_generations_per_user: 5.3,
          popular_formats: [
            { format: 'PDF', count: 645, percentage: 51.7, avg_file_size: 2048576, success_rate: 98.2 },
            { format: 'Excel', count: 423, percentage: 33.9, avg_file_size: 1234567, success_rate: 97.8 },
            { format: 'CSV', count: 179, percentage: 14.4, avg_file_size: 456789, success_rate: 99.1 }
          ],
          usage_by_time: [],
          usage_by_organization: [],
          usage_frequency: {
            daily_active_users: 45,
            weekly_active_users: 156,
            monthly_active_users: 234,
            power_users: 23,
            occasional_users: 156,
            one_time_users: 55
          },
          retention_metrics: {
            day_1_retention: 78.5,
            day_7_retention: 62.3,
            day_30_retention: 45.7,
            avg_time_to_second_use: 4.2,
            churn_rate: 12.3,
            reactivation_rate: 8.9
          }
        },
        performance_metrics: {
          avg_generation_time: 12.5,
          median_generation_time: 8.3,
          p95_generation_time: 28.7,
          success_rate: 96.8,
          error_rate: 3.2,
          timeout_rate: 0.8,
          avg_file_size: 1.8,
          memory_usage: {
            avg_memory_mb: 245.6,
            peak_memory_mb: 512.3,
            memory_efficiency_score: 82.5
          },
          cpu_usage: {
            avg_cpu_percent: 23.4,
            peak_cpu_percent: 67.8,
            cpu_efficiency_score: 78.9
          },
          database_performance: {
            avg_query_time: 145.2,
            slow_queries_count: 3,
            query_efficiency_score: 89.4,
            index_usage_rate: 94.2
          },
          bottleneck_analysis: [
            {
              component: 'Data Processing',
              bottleneck_type: 'cpu',
              severity: 'medium',
              impact_percentage: 15.2,
              description: 'High CPU usage during large data aggregation',
              suggested_fix: 'Implement data chunking and parallel processing'
            },
            {
              component: 'PDF Generation',
              bottleneck_type: 'memory',
              severity: 'low',
              impact_percentage: 8.7,
              description: 'Memory spikes during complex report rendering',
              suggested_fix: 'Use streaming PDF generation with memory pools'
            }
          ]
        },
        effectiveness_metrics: {
          user_satisfaction: 4.6,
          task_completion_rate: 89.3,
          time_to_insight: 3.2,
          report_accuracy: 96.7,
          actionability_score: 87.4,
          business_value_score: 82.1,
          adoption_rate: 78.9,
          feature_utilization: [
            {
              feature_name: 'Interactive Charts',
              usage_percentage: 78.4,
              user_satisfaction: 4.7,
              abandonment_rate: 3.2,
              feature_value_score: 89.6
            },
            {
              feature_name: 'Export Options',
              usage_percentage: 92.1,
              user_satisfaction: 4.4,
              abandonment_rate: 1.8,
              feature_value_score: 94.3
            }
          ],
          outcome_tracking: {
            decisions_influenced: 156,
            actions_taken: 89,
            policy_changes: 12,
            time_saved_hours: 1245.6,
            cost_savings_estimated: 15600,
            student_outcomes_improved: 234
          }
        },
        user_engagement: {
          interaction_patterns: [],
          session_analytics: {
            avg_session_duration: 18.5,
            median_session_duration: 12.3,
            sessions_per_user: 3.4,
            bounce_rate: 12.7,
            page_views_per_session: 5.6,
            conversion_rate: 67.8
          },
          user_journey: [],
          drop_off_points: [],
          feature_adoption: [],
          user_segments: []
        },
        optimization_scores: {
          overall_score: 78.4,
          performance_score: 82.1,
          usability_score: 88.3,
          reliability_score: 94.7,
          scalability_score: 69.2,
          maintainability_score: 75.8,
          security_score: 91.5,
          recommendations: [
            {
              id: 'rec_1',
              category: 'performance',
              priority: 'high',
              title: 'Optimize Data Query Performance',
              description: 'Implement query optimization and caching to reduce average generation time by 25%',
              expected_impact: 25.3,
              implementation_effort: 'medium',
              estimated_timeline: '2-3 weeks',
              success_metrics: ['Reduce avg generation time to <10s', 'Improve user satisfaction by 0.3 points'],
              prerequisites: ['Database performance analysis', 'Caching infrastructure setup'],
              resources_needed: ['Backend developer', 'Database administrator']
            },
            {
              id: 'rec_2',
              category: 'usability',
              priority: 'medium',
              title: 'Enhance Mobile Experience',
              description: 'Improve responsive design and mobile-specific features for better mobile usage',
              expected_impact: 15.6,
              implementation_effort: 'medium',
              estimated_timeline: '3-4 weeks',
              success_metrics: ['Increase mobile user satisfaction by 0.5 points', 'Reduce mobile bounce rate by 20%'],
              prerequisites: ['Mobile usage pattern analysis', 'Design system updates'],
              resources_needed: ['Frontend developer', 'UX designer']
            }
          ],
          improvement_opportunities: [
            {
              area: 'Scalability',
              current_score: 69.2,
              potential_score: 85.6,
              improvement_percentage: 23.7,
              actions_required: ['Implement horizontal scaling', 'Add load balancing', 'Optimize database queries'],
              business_impact: 'Support 3x more concurrent users without performance degradation',
              technical_complexity: 'high'
            }
          ]
        },
        feedback_analytics: {
          overall_rating: 4.6,
          rating_distribution: [
            { rating: 5, count: 98, percentage: 56.3 },
            { rating: 4, count: 52, percentage: 29.9 },
            { rating: 3, count: 18, percentage: 10.3 },
            { rating: 2, count: 4, percentage: 2.3 },
            { rating: 1, count: 2, percentage: 1.1 }
          ],
          sentiment_analysis: {
            positive_percentage: 78.4,
            neutral_percentage: 16.7,
            negative_percentage: 4.9,
            sentiment_trends: [],
            emotion_analysis: [
              { emotion: 'joy', percentage: 34.2, trend: 'increasing' },
              { emotion: 'trust', percentage: 28.9, trend: 'stable' },
              { emotion: 'surprise', percentage: 12.4, trend: 'decreasing' },
              { emotion: 'anticipation', percentage: 15.6, trend: 'increasing' }
            ]
          },
          common_themes: [
            {
              theme: 'Easy to Use',
              frequency: 89,
              sentiment: 'positive',
              subcategories: ['Intuitive Interface', 'Clear Navigation', 'Quick Setup'],
              example_quotes: ['Very intuitive and easy to set up', 'Love how simple it is to generate reports'],
              actionable_insights: ['Continue focusing on simplicity', 'Expand ease-of-use to advanced features']
            },
            {
              theme: 'Performance Issues',
              frequency: 23,
              sentiment: 'negative',
              subcategories: ['Slow Loading', 'Timeouts', 'Large Files'],
              example_quotes: ['Sometimes takes too long to generate', 'Had a few timeouts with large datasets'],
              actionable_insights: ['Prioritize performance optimization', 'Add progress indicators for long operations']
            }
          ],
          feature_requests: [],
          bug_reports: [],
          user_testimonials: []
        },
        trend_analysis: {
          usage_trends: [
            {
              metric: 'Total Generations',
              time_series: [],
              trend_direction: 'increasing',
              growth_rate: 15.6,
              seasonality: true,
              forecast: []
            }
          ],
          performance_trends: [],
          satisfaction_trends: [],
          predictive_analytics: {
            usage_forecast: {
              next_7_days: 287,
              next_30_days: 1543,
              next_quarter: 4789,
              confidence_level: 78.4,
              influencing_factors: ['Back to school season', 'New feature releases', 'Training sessions']
            },
            performance_predictions: [],
            user_behavior_predictions: [],
            capacity_planning: []
          },
          anomaly_detection: [
            {
              detected_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              anomaly_type: 'spike',
              affected_metric: 'Daily Generations',
              severity: 'medium',
              deviation_percentage: 45.2,
              possible_causes: ['New user onboarding event', 'System promotion', 'Seasonal demand'],
              impact_assessment: 'Positive - increased user engagement',
              recommended_actions: ['Monitor system capacity', 'Prepare for sustained higher usage']
            }
          ],
          seasonal_patterns: []
        },
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updated_at: new Date()
      }
    ];

    setReportAnalytics(mockAnalytics);
    setSelectedReport(mockAnalytics[0]);
    setIsLoading(false);
  };

  // Computed metrics
  const overallMetrics = useMemo(() => {
    if (reportAnalytics.length === 0) return null;
    
    const totalGenerations = reportAnalytics.reduce((sum, r) => sum + r.usage_metrics.total_generations, 0);
    const totalUsers = reportAnalytics.reduce((sum, r) => sum + r.usage_metrics.unique_users, 0);
    const avgSatisfaction = reportAnalytics.reduce((sum, r) => sum + r.feedback_analytics.overall_rating, 0) / reportAnalytics.length;
    const avgPerformance = reportAnalytics.reduce((sum, r) => sum + r.optimization_scores.performance_score, 0) / reportAnalytics.length;
    
    return {
      totalGenerations,
      totalUsers,
      avgSatisfaction,
      avgPerformance,
      totalReports: reportAnalytics.length,
      successRate: reportAnalytics.reduce((sum, r) => sum + r.performance_metrics.success_rate, 0) / reportAnalytics.length
    };
  }, [reportAnalytics]);

  const exportAnalytics = () => {
    addNotification({
      type: 'info',
      title: 'Export Started',
      message: 'Analytics data export has been started. You will receive a download link shortly.'
    });
  };

  const shareInsights = () => {
    addNotification({
      type: 'info',
      title: 'Insights Shared',
      message: 'Analytics insights have been shared with the team.'
    });
  };

  const formatNumber = (num: number, decimals: number = 1): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(decimals)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(decimals)}K`;
    }
    return num.toLocaleString();
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
      return `${(seconds / 60).toFixed(1)}m`;
    }
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const getTrendIcon = (direction: 'increasing' | 'decreasing' | 'stable') => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge className="bg-blue-500">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Reporting Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Advanced analytics and optimization insights for reporting system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" onClick={shareInsights}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Insights
          </Button>
          
          <Button variant="outline" onClick={() => loadReportingAnalytics()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      {overallMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Reports</p>
                  <p className="text-2xl font-bold">{overallMetrics.totalReports}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Generations</p>
                  <p className="text-2xl font-bold">{formatNumber(overallMetrics.totalGenerations)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{formatNumber(overallMetrics.totalUsers)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Satisfaction</p>
                  <p className="text-2xl font-bold">{overallMetrics.avgSatisfaction.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Performance</p>
                  <p className="text-2xl font-bold">{overallMetrics.avgPerformance.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{overallMetrics.successRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {selectedReport && (
            <>
              {/* Usage Overview */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsLineChart data={[
                        { month: 'Jan', generations: 156, users: 23 },
                        { month: 'Feb', generations: 234, users: 34 },
                        { month: 'Mar', generations: 345, users: 45 },
                        { month: 'Apr', generations: 423, users: 56 },
                        { month: 'May', generations: 567, users: 67 },
                        { month: 'Jun', generations: 689, users: 78 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="generations" stroke="#3b82f6" name="Generations" />
                        <Line yAxisId="right" type="monotone" dataKey="users" stroke="#8b5cf6" name="Users" />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Format Popularity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={selectedReport.usage_metrics.popular_formats}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="count"
                          nameKey="format"
                          label={({ format, percentage }) => `${format} (${percentage.toFixed(1)}%)`}
                        >
                          {selectedReport.usage_metrics.popular_formats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Task Completion</p>
                        <p className="text-2xl font-bold">{selectedReport.effectiveness_metrics.task_completion_rate.toFixed(1)}%</p>
                      </div>
                      <Target className="h-5 w-5 text-green-600" />
                    </div>
                    <Progress value={selectedReport.effectiveness_metrics.task_completion_rate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Time to Insight</p>
                        <p className="text-2xl font-bold">{selectedReport.effectiveness_metrics.time_to_insight.toFixed(1)}m</p>
                      </div>
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">User Retention (30d)</p>
                        <p className="text-2xl font-bold">{selectedReport.usage_metrics.retention_metrics.day_30_retention.toFixed(1)}%</p>
                      </div>
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <Progress value={selectedReport.usage_metrics.retention_metrics.day_30_retention} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Business Value</p>
                        <p className="text-2xl font-bold">{selectedReport.effectiveness_metrics.business_value_score.toFixed(0)}</p>
                      </div>
                      <Award className="h-5 w-5 text-yellow-600" />
                    </div>
                    <Progress value={selectedReport.effectiveness_metrics.business_value_score} className="mt-2" />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {selectedReport && (
            <>
              {/* Performance Overview */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Avg Generation Time</p>
                        <p className="text-2xl font-bold">{formatDuration(selectedReport.performance_metrics.avg_generation_time)}</p>
                      </div>
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      P95: {formatDuration(selectedReport.performance_metrics.p95_generation_time)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">{selectedReport.performance_metrics.success_rate.toFixed(1)}%</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Error rate: {selectedReport.performance_metrics.error_rate.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Memory Usage</p>
                        <p className="text-2xl font-bold">{selectedReport.performance_metrics.memory_usage.avg_memory_mb.toFixed(0)}MB</p>
                      </div>
                      <Activity className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Peak: {selectedReport.performance_metrics.memory_usage.peak_memory_mb.toFixed(0)}MB
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">CPU Usage</p>
                        <p className="text-2xl font-bold">{selectedReport.performance_metrics.cpu_usage.avg_cpu_percent.toFixed(1)}%</p>
                      </div>
                      <Zap className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Peak: {selectedReport.performance_metrics.cpu_usage.peak_cpu_percent.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Bottleneck Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Bottleneck Analysis</CardTitle>
                  <CardDescription>
                    Identified performance bottlenecks and optimization recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedReport.performance_metrics.bottleneck_analysis.map((bottleneck, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={
                              bottleneck.severity === 'critical' ? 'bg-red-500' :
                              bottleneck.severity === 'high' ? 'bg-orange-500' :
                              bottleneck.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                            }>
                              {bottleneck.severity}
                            </Badge>
                            <span className="font-medium">{bottleneck.component}</span>
                            <Badge variant="outline">{bottleneck.bottleneck_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{bottleneck.description}</p>
                          <p className="text-sm font-medium text-blue-600">{bottleneck.suggested_fix}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold">{bottleneck.impact_percentage.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Impact</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          {selectedReport && (
            <>
              {/* User Segments */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Power Users</p>
                        <p className="text-2xl font-bold">{selectedReport.usage_metrics.usage_frequency.power_users}</p>
                      </div>
                      <Star className="h-5 w-5 text-yellow-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">10+ generations</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Regular Users</p>
                        <p className="text-2xl font-bold">{selectedReport.usage_metrics.usage_frequency.occasional_users}</p>
                      </div>
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">2-10 generations</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">New Users</p>
                        <p className="text-2xl font-bold">{selectedReport.usage_metrics.usage_frequency.one_time_users}</p>
                      </div>
                      <Plus className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">1 generation</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Monthly Active</p>
                        <p className="text-2xl font-bold">{selectedReport.usage_metrics.usage_frequency.monthly_active_users}</p>
                      </div>
                      <Activity className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Active this month</p>
                  </CardContent>
                </Card>
              </div>

              {/* Session Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Avg Session Duration</span>
                        <span className="text-sm">{formatDuration(selectedReport.user_engagement.session_analytics.avg_session_duration * 60)}</span>
                      </div>
                      <Progress value={(selectedReport.user_engagement.session_analytics.avg_session_duration / 30) * 100} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Sessions per User</span>
                        <span className="text-sm">{selectedReport.user_engagement.session_analytics.sessions_per_user.toFixed(1)}</span>
                      </div>
                      <Progress value={(selectedReport.user_engagement.session_analytics.sessions_per_user / 10) * 100} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Conversion Rate</span>
                        <span className="text-sm">{selectedReport.user_engagement.session_analytics.conversion_rate.toFixed(1)}%</span>
                      </div>
                      <Progress value={selectedReport.user_engagement.session_analytics.conversion_rate} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          {selectedReport && (
            <>
              {/* Rating Overview */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Rating Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedReport.feedback_analytics.rating_distribution.map((rating) => (
                        <div key={rating.rating} className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1 w-16">
                            <span className="text-sm">{rating.rating}</span>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          </div>
                          <div className="flex-1">
                            <Progress value={rating.percentage} />
                          </div>
                          <div className="w-16 text-right">
                            <span className="text-xs text-muted-foreground">
                              {rating.count} ({rating.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 text-center">
                      <div className="text-3xl font-bold">{selectedReport.feedback_analytics.overall_rating.toFixed(1)}</div>
                      <div className="flex items-center justify-center space-x-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`h-4 w-4 ${
                            star <= selectedReport.feedback_analytics.overall_rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on {selectedReport.feedback_analytics.rating_distribution.reduce((sum, r) => sum + r.count, 0)} reviews
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sentiment Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <ThumbsUp className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium">Positive</span>
                        <div className="flex-1">
                          <Progress value={selectedReport.feedback_analytics.sentiment_analysis.positive_percentage} className="h-2" />
                        </div>
                        <span className="text-sm">{selectedReport.feedback_analytics.sentiment_analysis.positive_percentage.toFixed(1)}%</span>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Minus className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium">Neutral</span>
                        <div className="flex-1">
                          <Progress value={selectedReport.feedback_analytics.sentiment_analysis.neutral_percentage} className="h-2" />
                        </div>
                        <span className="text-sm">{selectedReport.feedback_analytics.sentiment_analysis.neutral_percentage.toFixed(1)}%</span>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <ThumbsDown className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium">Negative</span>
                        <div className="flex-1">
                          <Progress value={selectedReport.feedback_analytics.sentiment_analysis.negative_percentage} className="h-2" />
                        </div>
                        <span className="text-sm">{selectedReport.feedback_analytics.sentiment_analysis.negative_percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">Emotion Analysis</h4>
                      <div className="grid gap-2 grid-cols-2">
                        {selectedReport.feedback_analytics.sentiment_analysis.emotion_analysis.map((emotion) => (
                          <div key={emotion.emotion} className="flex items-center justify-between text-sm">
                            <span className="capitalize">{emotion.emotion}</span>
                            <div className="flex items-center space-x-2">
                              <span>{emotion.percentage.toFixed(1)}%</span>
                              {getTrendIcon(emotion.trend)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Common Themes */}
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Themes</CardTitle>
                  <CardDescription>
                    Common themes and insights from user feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedReport.feedback_analytics.common_themes.map((theme, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{theme.theme}</h4>
                            <Badge className={
                              theme.sentiment === 'positive' ? 'bg-green-500' :
                              theme.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                            }>
                              {theme.sentiment}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">{theme.frequency} mentions</span>
                        </div>
                        
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <h5 className="text-sm font-medium mb-2">Example feedback:</h5>
                            <div className="space-y-1">
                              {theme.example_quotes.slice(0, 2).map((quote, i) => (
                                <p key={i} className="text-sm text-muted-foreground italic">"{quote}"</p>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium mb-2">Actionable insights:</h5>
                            <ul className="space-y-1">
                              {theme.actionable_insights.map((insight, i) => (
                                <li key={i} className="text-sm text-muted-foreground">• {insight}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          {selectedReport && (
            <>
              {/* Optimization Scores */}
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Scores</CardTitle>
                  <CardDescription>
                    Overall system health and optimization opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">{selectedReport.optimization_scores.overall_score.toFixed(0)}</div>
                      <div className="text-sm text-muted-foreground">Overall Score</div>
                      <Progress value={selectedReport.optimization_scores.overall_score} className="mt-2" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Performance</span>
                        <span className="text-sm font-medium">{selectedReport.optimization_scores.performance_score.toFixed(0)}%</span>
                      </div>
                      <Progress value={selectedReport.optimization_scores.performance_score} className="h-2" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Usability</span>
                        <span className="text-sm font-medium">{selectedReport.optimization_scores.usability_score.toFixed(0)}%</span>
                      </div>
                      <Progress value={selectedReport.optimization_scores.usability_score} className="h-2" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Reliability</span>
                        <span className="text-sm font-medium">{selectedReport.optimization_scores.reliability_score.toFixed(0)}%</span>
                      </div>
                      <Progress value={selectedReport.optimization_scores.reliability_score} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Recommendations</CardTitle>
                  <CardDescription>
                    AI-generated recommendations for system improvements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedReport.optimization_scores.recommendations.map((rec) => (
                      <div key={rec.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{rec.title}</h4>
                            {getPriorityBadge(rec.priority)}
                            <Badge variant="outline">{rec.category}</Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">+{rec.expected_impact.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Expected Impact</div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                        
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1">EFFORT & TIMELINE</h5>
                            <div className="text-sm">
                              <div>Effort: {rec.implementation_effort}</div>
                              <div>Timeline: {rec.estimated_timeline}</div>
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1">SUCCESS METRICS</h5>
                            <ul className="text-sm space-y-1">
                              {rec.success_metrics.slice(0, 2).map((metric, i) => (
                                <li key={i}>• {metric}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1">RESOURCES NEEDED</h5>
                            <div className="flex flex-wrap gap-1">
                              {rec.resources_needed.map((resource, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{resource}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Improvement Opportunities */}
              <Card>
                <CardHeader>
                  <CardTitle>Improvement Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedReport.optimization_scores.improvement_opportunities.map((opp, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{opp.area}</h4>
                            <Badge variant="outline">{opp.technical_complexity} complexity</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{opp.business_impact}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span>Current: {opp.current_score.toFixed(0)}%</span>
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                            <span>Potential: {opp.potential_score.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-green-600">+{opp.improvement_percentage.toFixed(0)}%</div>
                          <div className="text-xs text-muted-foreground">Improvement</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          {selectedReport && showPredictions && (
            <>
              {/* Usage Forecast */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage Forecast</CardTitle>
                  <CardDescription>
                    Predicted usage patterns and capacity planning insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{selectedReport.trend_analysis.predictive_analytics.usage_forecast.next_7_days}</div>
                          <div className="text-sm text-muted-foreground">Next 7 days</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatNumber(selectedReport.trend_analysis.predictive_analytics.usage_forecast.next_30_days)}</div>
                          <div className="text-sm text-muted-foreground">Next 30 days</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatNumber(selectedReport.trend_analysis.predictive_analytics.usage_forecast.next_quarter)}</div>
                          <div className="text-sm text-muted-foreground">Next quarter</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{selectedReport.trend_analysis.predictive_analytics.usage_forecast.confidence_level.toFixed(0)}%</div>
                          <div className="text-sm text-muted-foreground">Confidence</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Key Influencing Factors:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedReport.trend_analysis.predictive_analytics.usage_forecast.influencing_factors.map((factor, i) => (
                        <Badge key={i} variant="outline">{factor}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Anomaly Detection */}
              <Card>
                <CardHeader>
                  <CardTitle>Anomaly Detection</CardTitle>
                  <CardDescription>
                    Recently detected anomalies and unusual patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedReport.trend_analysis.anomaly_detection.map((anomaly, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className={`h-5 w-5 ${
                              anomaly.severity === 'high' ? 'text-red-600' :
                              anomaly.severity === 'medium' ? 'text-orange-600' : 'text-yellow-600'
                            }`} />
                            <div>
                              <h4 className="font-medium">{anomaly.affected_metric} {anomaly.anomaly_type}</h4>
                              <p className="text-sm text-muted-foreground">
                                Detected {anomaly.detected_at.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{anomaly.deviation_percentage.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Deviation</div>
                          </div>
                        </div>
                        
                        <p className="text-sm mb-3">{anomaly.impact_assessment}</p>
                        
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1">POSSIBLE CAUSES</h5>
                            <ul className="text-sm space-y-1">
                              {anomaly.possible_causes.map((cause, i) => (
                                <li key={i}>• {cause}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1">RECOMMENDED ACTIONS</h5>
                            <ul className="text-sm space-y-1">
                              {anomaly.recommended_actions.map((action, i) => (
                                <li key={i}>• {action}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
