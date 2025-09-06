/**
 * Performance Analytics Component
 * 
 * Task 8.5.2: System performance analytics with trend analysis,
 * bottleneck identification, and optimization recommendations
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

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
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Target,
  Zap,
  Clock,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Database,
  Server,
  Globe,
  Users,
  MessageSquare,
  Eye,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Lightbulb,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Calendar,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  Flag,
  Star,
  Award,
  ThumbsUp,
  ThumbsDown
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
  ComposedChart,
  RadialBarChart,
  RadialBar
} from 'recharts';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface PerformanceMetrics {
  overview: PerformanceOverview;
  trends: PerformanceTrends;
  bottlenecks: PerformanceBottleneck[];
  recommendations: OptimizationRecommendation[];
  benchmarks: PerformanceBenchmark[];
  alerts: PerformanceAlert[];
  forecasts: PerformanceForecast[];
}

interface PerformanceOverview {
  overallScore: number; // 0-100
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  keyMetrics: KeyMetric[];
  improvement: number; // percentage change
  trend: 'improving' | 'stable' | 'declining';
  lastUpdate: Date;
}

interface KeyMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  target?: number;
  threshold: MetricThreshold;
  trend: TrendData[];
  status: 'optimal' | 'warning' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
}

interface MetricThreshold {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

interface TrendData {
  timestamp: Date;
  value: number;
  context?: string;
}

interface PerformanceTrends {
  timeRange: TimeRange;
  metrics: TrendMetric[];
  correlations: MetricCorrelation[];
  seasonality: SeasonalityAnalysis;
  anomalies: PerformanceAnomaly[];
}

interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

interface TrendMetric {
  id: string;
  name: string;
  category: MetricCategory;
  data: TrendData[];
  regression: RegressionAnalysis;
  volatility: number; // 0-100
  predictability: number; // 0-100
}

type MetricCategory = 
  | 'response_time' | 'throughput' | 'error_rate' | 'resource_usage' 
  | 'user_experience' | 'database' | 'network' | 'business';

interface RegressionAnalysis {
  slope: number;
  rSquared: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  significance: number; // 0-100
  forecast: number[];
}

interface MetricCorrelation {
  metric1: string;
  metric2: string;
  coefficient: number; // -1 to 1
  strength: 'weak' | 'moderate' | 'strong';
  significance: number; // 0-100
  interpretation: string;
}

interface SeasonalityAnalysis {
  hasSeasonality: boolean;
  periods: SeasonalPeriod[];
  strength: number; // 0-100
  patterns: SeasonalPattern[];
}

interface SeasonalPeriod {
  type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  strength: number;
  peaks: number[];
  troughs: number[];
}

interface SeasonalPattern {
  pattern: string;
  description: string;
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high';
}

interface PerformanceAnomaly {
  id: string;
  timestamp: Date;
  metric: string;
  expected: number;
  actual: number;
  deviation: number; // percentage
  severity: 'low' | 'medium' | 'high' | 'critical';
  cause?: string;
  impact: string;
  duration: number; // minutes
  resolved: boolean;
}

interface PerformanceBottleneck {
  id: string;
  name: string;
  category: BottleneckCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: BottleneckImpact;
  root_cause: RootCause;
  affected_metrics: string[];
  detection_time: Date;
  first_seen: Date;
  last_seen: Date;
  frequency: number; // occurrences per day
  confidence: number; // 0-100
  status: 'active' | 'mitigated' | 'resolved' | 'investigating';
}

type BottleneckCategory = 
  | 'database' | 'api' | 'network' | 'storage' | 'cpu' | 'memory' 
  | 'application' | 'external_service' | 'infrastructure';

interface BottleneckImpact {
  performance_degradation: number; // percentage
  affected_users: number;
  revenue_impact?: number; // monetary value
  sla_breach: boolean;
  cascade_effects: string[];
  estimated_cost: number; // per hour
}

interface RootCause {
  primary_cause: string;
  contributing_factors: string[];
  evidence: Evidence[];
  analysis: string;
  certainty: number; // 0-100
}

interface Evidence {
  type: 'metric' | 'log' | 'trace' | 'user_report' | 'monitoring';
  description: string;
  data: Record<string, any>;
  timestamp: Date;
  relevance: number; // 0-100
}

interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'minimal' | 'low' | 'medium' | 'high' | 'extensive';
  impact: RecommendationImpact;
  implementation: ImplementationGuide;
  risks: Risk[];
  prerequisites: string[];
  timeline: RecommendationTimeline;
  roi: ROIAnalysis;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
}

type RecommendationCategory = 
  | 'infrastructure' | 'database' | 'application' | 'caching' | 'cdn' 
  | 'monitoring' | 'architecture' | 'configuration' | 'process';

interface RecommendationImpact {
  performance_improvement: number; // percentage
  cost_reduction?: number; // monetary value per month
  reliability_improvement: number; // percentage
  user_experience_improvement: number; // percentage
  maintenance_reduction: number; // percentage
  scalability_improvement: number; // percentage
}

interface ImplementationGuide {
  steps: ImplementationStep[];
  resources_needed: string[];
  tools_required: string[];
  rollback_plan: string[];
  testing_strategy: string[];
  deployment_strategy: 'immediate' | 'phased' | 'canary' | 'blue_green';
}

interface ImplementationStep {
  order: number;
  title: string;
  description: string;
  estimated_time: number; // hours
  dependencies: string[];
  risks: string[];
  validation: string[];
}

interface Risk {
  description: string;
  probability: number; // 0-100
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

interface RecommendationTimeline {
  preparation: number; // days
  implementation: number; // days
  validation: number; // days
  total: number; // days
  phases: TimelinePhase[];
}

interface TimelinePhase {
  name: string;
  duration: number; // days
  deliverables: string[];
  milestones: string[];
}

interface ROIAnalysis {
  investment: number; // monetary value
  monthly_savings: number;
  payback_period: number; // months
  three_year_roi: number; // percentage
  confidence: number; // 0-100
}

interface PerformanceBenchmark {
  id: string;
  name: string;
  category: string;
  current_value: number;
  benchmark_value: number;
  unit: string;
  comparison: 'better' | 'worse' | 'equal';
  percentile: number; // 0-100
  source: 'industry' | 'peer' | 'internal' | 'target';
  last_updated: Date;
}

interface PerformanceAlert {
  id: string;
  metric: string;
  threshold: number;
  current_value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  triggered_at: Date;
  acknowledged_at?: Date;
  resolved_at?: Date;
  message: string;
  actions_taken: string[];
}

interface PerformanceForecast {
  metric: string;
  current_value: number;
  forecasts: ForecastPrediction[];
  methodology: string;
  confidence_interval: number; // 0-100
  factors: ForecastFactor[];
  scenarios: ForecastScenario[];
}

interface ForecastPrediction {
  timeframe: string; // "1 week", "1 month", "3 months", "1 year"
  predicted_value: number;
  confidence: number; // 0-100
  range_min: number;
  range_max: number;
}

interface ForecastFactor {
  factor: string;
  influence: number; // -100 to 100
  description: string;
}

interface ForecastScenario {
  name: string;
  description: string;
  probability: number; // 0-100
  predicted_outcome: number;
  impact: 'positive' | 'negative' | 'neutral';
}

interface PerformanceAnalyticsProps {
  organizationId?: string;
  refreshInterval?: number;
  canOptimize?: boolean;
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export function PerformanceAnalytics({
  organizationId,
  refreshInterval = 60000,
  canOptimize = false,
  timeRange = 'day'
}: PerformanceAnalyticsProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [selectedBottleneck, setSelectedBottleneck] = useState<PerformanceBottleneck | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<OptimizationRecommendation | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  
  // Dialog states
  const [showBottleneckDialog, setShowBottleneckDialog] = useState(false);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPerformanceMetrics();
  }, [selectedTimeRange]);

  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
    
    return () => stopAutoRefresh();
  }, [autoRefresh, refreshInterval]);

  const loadPerformanceMetrics = async () => {
    setIsLoading(true);
    
    // Generate mock performance data based on time range
    const now = new Date();
    const timeRanges = {
      hour: { start: new Date(now.getTime() - 60 * 60 * 1000), granularity: 'minute' as const },
      day: { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), granularity: 'hour' as const },
      week: { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), granularity: 'hour' as const },
      month: { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), granularity: 'day' as const },
      quarter: { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), granularity: 'day' as const },
      year: { start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), granularity: 'week' as const }
    };
    
    const range = timeRanges[selectedTimeRange];
    
    const mockMetrics: PerformanceMetrics = {
      overview: {
        overallScore: 87,
        healthStatus: 'good',
        keyMetrics: [
          {
            id: 'response_time',
            name: 'Average Response Time',
            value: 245,
            unit: 'ms',
            target: 200,
            threshold: { excellent: 150, good: 250, fair: 400, poor: 600 },
            trend: generateTrendData(range.start, now, 200, 50),
            status: 'warning',
            impact: 'high'
          },
          {
            id: 'throughput',
            name: 'Requests per Second',
            value: 156.7,
            unit: 'req/s',
            target: 200,
            threshold: { excellent: 200, good: 150, fair: 100, poor: 50 },
            trend: generateTrendData(range.start, now, 150, 30),
            status: 'good',
            impact: 'high'
          },
          {
            id: 'error_rate',
            name: 'Error Rate',
            value: 2.3,
            unit: '%',
            target: 1.0,
            threshold: { excellent: 0.5, good: 1.0, fair: 2.0, poor: 5.0 },
            trend: generateTrendData(range.start, now, 1.5, 1),
            status: 'warning',
            impact: 'critical'
          },
          {
            id: 'cpu_usage',
            name: 'CPU Usage',
            value: 67.8,
            unit: '%',
            target: 70,
            threshold: { excellent: 50, good: 70, fair: 85, poor: 95 },
            trend: generateTrendData(range.start, now, 65, 15),
            status: 'good',
            impact: 'medium'
          }
        ],
        improvement: 12.5,
        trend: 'improving',
        lastUpdate: now
      },
      trends: {
        timeRange: { start: range.start, end: now, granularity: range.granularity },
        metrics: [
          {
            id: 'response_time',
            name: 'Response Time',
            category: 'response_time',
            data: generateTrendData(range.start, now, 245, 50),
            regression: {
              slope: -0.5,
              rSquared: 0.75,
              trend: 'decreasing',
              significance: 85,
              forecast: [240, 235, 230, 225, 220]
            },
            volatility: 35,
            predictability: 78
          }
        ],
        correlations: [
          {
            metric1: 'cpu_usage',
            metric2: 'response_time',
            coefficient: 0.73,
            strength: 'strong',
            significance: 92,
            interpretation: 'Higher CPU usage strongly correlates with slower response times'
          }
        ],
        seasonality: {
          hasSeasonality: true,
          periods: [
            {
              type: 'daily',
              strength: 65,
              peaks: [14, 15, 16], // 2-4pm
              troughs: [2, 3, 4] // 2-4am
            }
          ],
          strength: 65,
          patterns: [
            {
              pattern: 'Business hours peak',
              description: 'Higher load during typical business hours (9am-5pm)',
              confidence: 87,
              impact: 'high'
            }
          ]
        },
        anomalies: [
          {
            id: 'anomaly_1',
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            metric: 'response_time',
            expected: 245,
            actual: 890,
            deviation: 263.3,
            severity: 'high',
            cause: 'Database connection pool exhaustion',
            impact: 'Degraded user experience for 15 minutes',
            duration: 15,
            resolved: true
          }
        ]
      },
      bottlenecks: [
        {
          id: 'bottleneck_1',
          name: 'Database Connection Pool Saturation',
          category: 'database',
          severity: 'high',
          impact: {
            performance_degradation: 45,
            affected_users: 234,
            sla_breach: true,
            cascade_effects: ['Increased response times', 'Higher error rates', 'Connection timeouts'],
            estimated_cost: 1250
          },
          root_cause: {
            primary_cause: 'Insufficient database connection pool size for peak traffic',
            contributing_factors: [
              'Long-running queries not being optimized',
              'Connection leaks in legacy code',
              'Lack of connection pooling monitoring'
            ],
            evidence: [
              {
                type: 'metric',
                description: 'Connection pool utilization at 98% for 30+ minutes',
                data: { max_connections: 50, active_connections: 49, queue_length: 23 },
                timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                relevance: 95
              }
            ],
            analysis: 'Peak traffic overwhelmed the database connection pool, causing cascading failures',
            certainty: 92
          },
          affected_metrics: ['response_time', 'error_rate', 'database_performance'],
          detection_time: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          first_seen: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          last_seen: new Date(now.getTime() - 30 * 60 * 1000),
          frequency: 2.3,
          confidence: 92,
          status: 'active'
        },
        {
          id: 'bottleneck_2',
          name: 'Unoptimized API Endpoints',
          category: 'api',
          severity: 'medium',
          impact: {
            performance_degradation: 25,
            affected_users: 145,
            sla_breach: false,
            cascade_effects: ['Slower page loads', 'Increased mobile app crashes'],
            estimated_cost: 680
          },
          root_cause: {
            primary_cause: 'N+1 query problem in user analytics endpoints',
            contributing_factors: [
              'Lack of query optimization',
              'Missing database indices',
              'Inefficient data serialization'
            ],
            evidence: [
              {
                type: 'trace',
                description: 'API traces show 50+ database queries per request',
                data: { avg_queries: 52, endpoint: '/api/user-analytics', response_time: 1200 },
                timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
                relevance: 88
              }
            ],
            analysis: 'Inefficient query patterns causing excessive database load',
            certainty: 85
          },
          affected_metrics: ['api_response_time', 'database_load'],
          detection_time: new Date(now.getTime() - 4 * 60 * 60 * 1000),
          first_seen: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
          last_seen: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          frequency: 1.8,
          confidence: 85,
          status: 'investigating'
        }
      ],
      recommendations: [
        {
          id: 'rec_1',
          title: 'Increase Database Connection Pool Size',
          description: 'Scale database connection pool from 50 to 100 connections to handle peak traffic',
          category: 'database',
          priority: 'high',
          effort: 'low',
          impact: {
            performance_improvement: 35,
            cost_reduction: 2500,
            reliability_improvement: 40,
            user_experience_improvement: 30,
            maintenance_reduction: 15,
            scalability_improvement: 50
          },
          implementation: {
            steps: [
              {
                order: 1,
                title: 'Update database configuration',
                description: 'Modify max_connections parameter in database settings',
                estimated_time: 2,
                dependencies: [],
                risks: ['Temporary connection interruption'],
                validation: ['Monitor connection utilization', 'Check for memory impact']
              },
              {
                order: 2,
                title: 'Update application pool settings',
                description: 'Increase connection pool size in application configuration',
                estimated_time: 1,
                dependencies: ['Database configuration update'],
                risks: ['Application restart required'],
                validation: ['Test connection stability', 'Monitor performance metrics']
              }
            ],
            resources_needed: ['Database administrator', 'DevOps engineer'],
            tools_required: ['Database management console', 'Application configuration'],
            rollback_plan: ['Revert configuration changes', 'Restart services if needed'],
            testing_strategy: ['Load testing with increased traffic', 'Monitor for 24 hours'],
            deployment_strategy: 'phased'
          },
          risks: [
            {
              description: 'Increased memory usage on database server',
              probability: 70,
              impact: 'low',
              mitigation: 'Monitor memory usage and adjust if needed'
            }
          ],
          prerequisites: ['Database server capacity check', 'Change approval'],
          timeline: {
            preparation: 1,
            implementation: 1,
            validation: 2,
            total: 4,
            phases: [
              {
                name: 'Planning',
                duration: 1,
                deliverables: ['Implementation plan', 'Risk assessment'],
                milestones: ['Plan approved']
              },
              {
                name: 'Implementation',
                duration: 1,
                deliverables: ['Configuration changes', 'Application updates'],
                milestones: ['Changes deployed']
              },
              {
                name: 'Validation',
                duration: 2,
                deliverables: ['Performance report', 'Stability confirmation'],
                milestones: ['Validation complete']
              }
            ]
          },
          roi: {
            investment: 500,
            monthly_savings: 2500,
            payback_period: 0.2,
            three_year_roi: 1800,
            confidence: 85
          },
          status: 'approved'
        },
        {
          id: 'rec_2',
          title: 'Implement API Response Caching',
          description: 'Add Redis caching layer for frequently accessed API endpoints',
          category: 'caching',
          priority: 'medium',
          effort: 'medium',
          impact: {
            performance_improvement: 60,
            cost_reduction: 1800,
            reliability_improvement: 25,
            user_experience_improvement: 50,
            maintenance_reduction: 10,
            scalability_improvement: 70
          },
          implementation: {
            steps: [
              {
                order: 1,
                title: 'Set up Redis infrastructure',
                description: 'Deploy Redis cluster for caching',
                estimated_time: 8,
                dependencies: [],
                risks: ['Infrastructure dependency', 'Additional monitoring needed'],
                validation: ['Redis health checks', 'Performance benchmarks']
              },
              {
                order: 2,
                title: 'Implement caching logic',
                description: 'Add caching to high-traffic API endpoints',
                estimated_time: 16,
                dependencies: ['Redis infrastructure'],
                risks: ['Cache invalidation complexity', 'Data consistency'],
                validation: ['Cache hit rate monitoring', 'Data integrity tests']
              }
            ],
            resources_needed: ['Backend developer', 'Infrastructure engineer'],
            tools_required: ['Redis', 'Caching libraries', 'Monitoring tools'],
            rollback_plan: ['Disable caching', 'Direct database fallback'],
            testing_strategy: ['Cache hit rate validation', 'Load testing', 'Data consistency checks'],
            deployment_strategy: 'canary'
          },
          risks: [
            {
              description: 'Cache invalidation bugs leading to stale data',
              probability: 40,
              impact: 'medium',
              mitigation: 'Implement comprehensive cache invalidation strategy'
            }
          ],
          prerequisites: ['Redis infrastructure capacity', 'Caching strategy document'],
          timeline: {
            preparation: 3,
            implementation: 5,
            validation: 2,
            total: 10,
            phases: [
              {
                name: 'Infrastructure Setup',
                duration: 3,
                deliverables: ['Redis deployment', 'Monitoring setup'],
                milestones: ['Redis operational']
              },
              {
                name: 'Development',
                duration: 5,
                deliverables: ['Caching implementation', 'Testing suite'],
                milestones: ['Code review complete']
              },
              {
                name: 'Deployment',
                duration: 2,
                deliverables: ['Production rollout', 'Performance validation'],
                milestones: ['Caching live']
              }
            ]
          },
          roi: {
            investment: 8000,
            monthly_savings: 1800,
            payback_period: 4.4,
            three_year_roi: 675,
            confidence: 75
          },
          status: 'pending'
        }
      ],
      benchmarks: [
        {
          id: 'bench_1',
          name: 'API Response Time',
          category: 'Performance',
          current_value: 245,
          benchmark_value: 200,
          unit: 'ms',
          comparison: 'worse',
          percentile: 65,
          source: 'industry',
          last_updated: now
        },
        {
          id: 'bench_2',
          name: 'Error Rate',
          category: 'Reliability',
          current_value: 2.3,
          benchmark_value: 1.0,
          unit: '%',
          comparison: 'worse',
          percentile: 40,
          source: 'industry',
          last_updated: now
        },
        {
          id: 'bench_3',
          name: 'Uptime',
          category: 'Availability',
          current_value: 99.95,
          benchmark_value: 99.9,
          unit: '%',
          comparison: 'better',
          percentile: 85,
          source: 'industry',
          last_updated: now
        }
      ],
      alerts: [
        {
          id: 'alert_1',
          metric: 'response_time',
          threshold: 500,
          current_value: 245,
          severity: 'medium',
          status: 'resolved',
          triggered_at: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          resolved_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          message: 'Response time exceeded threshold',
          actions_taken: ['Database connection pool increased', 'Query optimization applied']
        }
      ],
      forecasts: [
        {
          metric: 'response_time',
          current_value: 245,
          forecasts: [
            { timeframe: '1 week', predicted_value: 235, confidence: 85, range_min: 220, range_max: 250 },
            { timeframe: '1 month', predicted_value: 220, confidence: 78, range_min: 200, range_max: 240 },
            { timeframe: '3 months', predicted_value: 200, confidence: 65, range_min: 180, range_max: 220 }
          ],
          methodology: 'Linear regression with seasonal adjustment',
          confidence_interval: 85,
          factors: [
            { factor: 'Database optimization', influence: -15, description: 'Ongoing optimization efforts' },
            { factor: 'Traffic growth', influence: 8, description: 'Expected 5% monthly traffic increase' },
            { factor: 'Infrastructure scaling', influence: -10, description: 'Planned server upgrades' }
          ],
          scenarios: [
            {
              name: 'Optimistic',
              description: 'All optimizations successful, minimal traffic growth',
              probability: 30,
              predicted_outcome: 180,
              impact: 'positive'
            },
            {
              name: 'Realistic',
              description: 'Some optimizations successful, normal traffic growth',
              probability: 50,
              predicted_outcome: 220,
              impact: 'positive'
            },
            {
              name: 'Pessimistic',
              description: 'Limited optimization success, high traffic growth',
              probability: 20,
              predicted_outcome: 260,
              impact: 'negative'
            }
          ]
        }
      ]
    };

    setPerformanceMetrics(mockMetrics);
    setIsLoading(false);
  };

  const generateTrendData = (start: Date, end: Date, baseValue: number, variance: number): TrendData[] => {
    const data: TrendData[] = [];
    const points = 20;
    const interval = (end.getTime() - start.getTime()) / points;
    
    for (let i = 0; i <= points; i++) {
      const timestamp = new Date(start.getTime() + i * interval);
      const randomVariation = (Math.random() - 0.5) * variance * 2;
      const value = Math.max(0, baseValue + randomVariation);
      data.push({ timestamp, value });
    }
    
    return data;
  };

  const startAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      loadPerformanceMetrics();
    }, refreshInterval);
  };

  const stopAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent': return <Badge className="bg-green-500">Excellent</Badge>;
      case 'good': return <Badge className="bg-blue-500">Good</Badge>;
      case 'fair': return <Badge className="bg-yellow-500">Fair</Badge>;
      case 'poor': return <Badge className="bg-orange-500">Poor</Badge>;
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMetricStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-red-500">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getEffortBadge = (effort: string) => {
    switch (effort) {
      case 'minimal': return <Badge className="bg-green-500">Minimal</Badge>;
      case 'low': return <Badge className="bg-blue-500">Low</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'extensive': return <Badge variant="destructive">Extensive</Badge>;
      default: return <Badge variant="outline">{effort}</Badge>;
    }
  };

  const formatNumber = (value: number, unit: string) => {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (unit === 'req/s') return `${value.toFixed(1)} req/s`;
    return `${value.toFixed(1)} ${unit}`;
  };

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Performance Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            System trends, bottleneck identification, and optimization recommendations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Performance Overview */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                {performanceMetrics && getHealthStatusBadge(performanceMetrics.overview.healthStatus)}
              </div>
              <div className="text-xs text-muted-foreground">Health</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {performanceMetrics?.overview.overallScore}
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                {performanceMetrics?.overview.improvement.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Improvement</div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Last Hour</SelectItem>
                <SelectItem value="day">Last Day</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoRefresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="autoRefresh" className="text-xs">Auto-refresh</Label>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadPerformanceMetrics()}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends & Analysis</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {performanceMetrics?.overview.keyMetrics.map((metric) => (
              <Card key={metric.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getMetricStatusIcon(metric.status)}
                      <span className="text-sm font-medium">{metric.name}</span>
                    </div>
                    <Badge variant="outline" className={`text-xs ${
                      metric.impact === 'critical' ? 'border-red-500 text-red-600' :
                      metric.impact === 'high' ? 'border-orange-500 text-orange-600' :
                      metric.impact === 'medium' ? 'border-yellow-500 text-yellow-600' : ''
                    }`}>
                      {metric.impact}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {formatNumber(metric.value, metric.unit)}
                    </div>
                    
                    {metric.target && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Target: {formatNumber(metric.target, metric.unit)}</span>
                          <span className={
                            metric.value <= metric.target ? 'text-green-600' : 'text-red-600'
                          }>
                            {metric.value <= metric.target ? '✓ On target' : '⚠ Above target'}
                          </span>
                        </div>
                        <Progress 
                          value={(metric.value / metric.target) * 100} 
                          className={`h-2 ${metric.value > metric.target ? 'bg-red-100' : ''}`}
                        />
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground flex items-center">
                      {metric.trend.length > 1 && (
                        <>
                          {metric.trend[metric.trend.length - 1].value > metric.trend[0].value ? (
                            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                          )}
                          <span>
                            {Math.abs(((metric.trend[metric.trend.length - 1].value - metric.trend[0].value) / metric.trend[0].value) * 100).toFixed(1)}% 
                            {metric.trend[metric.trend.length - 1].value > metric.trend[0].value ? ' increase' : ' decrease'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Performance Score Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke={
                            (performanceMetrics?.overview.overallScore || 0) >= 90 ? '#22c55e' :
                            (performanceMetrics?.overview.overallScore || 0) >= 80 ? '#3b82f6' :
                            (performanceMetrics?.overview.overallScore || 0) >= 70 ? '#f59e0b' : '#ef4444'
                          }
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${((performanceMetrics?.overview.overallScore || 0) / 100) * 351.858} 351.858`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{performanceMetrics?.overview.overallScore}</div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold mb-2">
                      Overall Health: {getHealthStatusBadge(performanceMetrics?.overview.healthStatus || 'unknown')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {performanceMetrics?.overview.improvement && performanceMetrics.overview.improvement > 0 && (
                        <span className="text-green-600">
                          ↑ {performanceMetrics.overview.improvement.toFixed(1)}% improvement over last period
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-4">Key Performance Indicators</h5>
                  <div className="space-y-3">
                    {performanceMetrics?.overview.keyMetrics.slice(0, 4).map((metric) => (
                      <div key={metric.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getMetricStatusIcon(metric.status)}
                          <span className="text-sm">{metric.name}:</span>
                        </div>
                        <div className="text-sm font-medium">
                          {formatNumber(metric.value, metric.unit)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benchmarks */}
          <Card>
            <CardHeader>
              <CardTitle>Industry Benchmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceMetrics?.benchmarks.map((benchmark) => (
                  <div key={benchmark.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h5 className="font-medium">{benchmark.name}</h5>
                      <p className="text-sm text-muted-foreground">{benchmark.category}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">
                          Current: {formatNumber(benchmark.current_value, benchmark.unit)}
                        </span>
                        <span className="text-sm text-muted-foreground">vs</span>
                        <span className="text-sm">
                          Benchmark: {formatNumber(benchmark.benchmark_value, benchmark.unit)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={benchmark.comparison === 'better' ? 'default' : 'destructive'}
                          className={benchmark.comparison === 'better' ? 'bg-green-500' : ''}
                        >
                          {benchmark.comparison === 'better' ? 'Above' : 'Below'} Benchmark
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {benchmark.percentile}th percentile
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Performance Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Analyze performance patterns over time ({selectedTimeRange})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RechartsLineChart data={performanceMetrics?.trends.metrics[0]?.data.map(d => ({
                  time: d.timestamp.toLocaleTimeString(),
                  value: d.value
                })) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Response Time (ms)"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Correlations */}
          <Card>
            <CardHeader>
              <CardTitle>Metric Correlations</CardTitle>
              <CardDescription>
                Understanding relationships between performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performanceMetrics?.trends.correlations.map((correlation) => (
                <div key={`${correlation.metric1}-${correlation.metric2}`} className="p-3 border rounded-lg mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">
                      {correlation.metric1} ↔ {correlation.metric2}
                    </h5>
                    <Badge variant="outline">{correlation.strength}</Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Correlation Strength</div>
                      <div className="flex items-center space-x-2">
                        <Progress value={Math.abs(correlation.coefficient) * 100} className="h-2 flex-1" />
                        <span className="text-sm font-medium">
                          {(correlation.coefficient * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Statistical Significance</div>
                      <div className="text-sm font-medium">{correlation.significance}%</div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">{correlation.interpretation}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Seasonality Analysis */}
          {performanceMetrics?.trends.seasonality.hasSeasonality && (
            <Card>
              <CardHeader>
                <CardTitle>Seasonality Patterns</CardTitle>
                <CardDescription>
                  Recurring patterns in performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics.trends.seasonality.patterns.map((pattern, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{pattern.pattern}</h5>
                        <Badge variant="outline">{pattern.confidence}% confidence</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{pattern.description}</p>
                      <div className="mt-2">
                        <Badge 
                          variant="outline"
                          className={`text-xs ${
                            pattern.impact === 'high' ? 'border-red-500 text-red-600' :
                            pattern.impact === 'medium' ? 'border-yellow-500 text-yellow-600' : ''
                          }`}
                        >
                          {pattern.impact} impact
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anomalies */}
          {performanceMetrics?.trends.anomalies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Anomalies</CardTitle>
                <CardDescription>
                  Unusual patterns detected in the data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceMetrics.trends.anomalies.map((anomaly) => (
                    <div key={anomaly.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className={`h-4 w-4 ${
                            anomaly.severity === 'critical' ? 'text-red-500' :
                            anomaly.severity === 'high' ? 'text-orange-500' :
                            'text-yellow-500'
                          }`} />
                          <span className="font-medium">{anomaly.metric}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getSeverityBadge(anomaly.severity)}
                          <Badge variant={anomaly.resolved ? 'default' : 'destructive'} className={anomaly.resolved ? 'bg-green-500' : ''}>
                            {anomaly.resolved ? 'Resolved' : 'Active'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Expected vs Actual</div>
                          <div>
                            {anomaly.expected.toFixed(1)} → {anomaly.actual.toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Deviation</div>
                          <div className="text-red-600">+{anomaly.deviation.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Duration</div>
                          <div>{anomaly.duration} minutes</div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-sm text-muted-foreground">Impact: {anomaly.impact}</div>
                        {anomaly.cause && (
                          <div className="text-sm text-muted-foreground">Cause: {anomaly.cause}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Bottlenecks</CardTitle>
              <CardDescription>
                Identified performance constraints and their impact analysis
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            {performanceMetrics?.bottlenecks.map((bottleneck) => (
              <Card 
                key={bottleneck.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  bottleneck.severity === 'critical' ? 'border-red-300 bg-red-50' :
                  bottleneck.severity === 'high' ? 'border-orange-300 bg-orange-50' : ''
                }`}
                onClick={() => {
                  setSelectedBottleneck(bottleneck);
                  setShowBottleneckDialog(true);
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold mb-2">{bottleneck.name}</h4>
                      <div className="flex items-center space-x-2 mb-2">
                        {getSeverityBadge(bottleneck.severity)}
                        <Badge variant="outline" className="capitalize">{bottleneck.category}</Badge>
                        <Badge variant="outline" className="capitalize">{bottleneck.status}</Badge>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">Confidence</div>
                      <div className="font-semibold">{bottleneck.confidence}%</div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <h5 className="font-medium mb-2">Performance Impact</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Degradation:</span>
                          <span className="text-red-600">{bottleneck.impact.performance_degradation}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Affected Users:</span>
                          <span>{bottleneck.impact.affected_users.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SLA Breach:</span>
                          <Badge variant={bottleneck.impact.sla_breach ? 'destructive' : 'outline'} className="text-xs">
                            {bottleneck.impact.sla_breach ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Root Cause</h5>
                      <div className="text-sm">
                        <div className="text-muted-foreground mb-1">Primary:</div>
                        <div>{bottleneck.root_cause.primary_cause}</div>
                        <div className="text-muted-foreground mt-2">Certainty: {bottleneck.root_cause.certainty}%</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Occurrence</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Frequency:</span>
                          <span>{bottleneck.frequency.toFixed(1)}/day</span>
                        </div>
                        <div className="flex justify-between">
                          <span>First Seen:</span>
                          <span>{bottleneck.first_seen.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost Impact:</span>
                          <span>${bottleneck.impact.estimated_cost}/hr</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {bottleneck.impact.cascade_effects.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Cascade Effects</h5>
                      <div className="flex flex-wrap gap-1">
                        {bottleneck.impact.cascade_effects.slice(0, 3).map((effect, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {effect}
                          </Badge>
                        ))}
                        {bottleneck.impact.cascade_effects.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{bottleneck.impact.cascade_effects.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {performanceMetrics?.recommendations.map((recommendation) => (
              <Card 
                key={recommendation.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  recommendation.priority === 'critical' ? 'border-red-300 bg-red-50' :
                  recommendation.priority === 'high' ? 'border-orange-300 bg-orange-50' : ''
                }`}
                onClick={() => {
                  setSelectedRecommendation(recommendation);
                  setShowRecommendationDialog(true);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{recommendation.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        {getPriorityBadge(recommendation.priority)}
                        {getEffortBadge(recommendation.effort)}
                        <Badge variant="outline" className="capitalize">{recommendation.category}</Badge>
                      </div>
                    </div>
                    
                    <Badge 
                      variant={
                        recommendation.status === 'approved' ? 'default' :
                        recommendation.status === 'in_progress' ? 'outline' :
                        recommendation.status === 'completed' ? 'default' :
                        recommendation.status === 'rejected' ? 'destructive' : 'secondary'
                      }
                      className={
                        recommendation.status === 'approved' ? 'bg-blue-500' :
                        recommendation.status === 'completed' ? 'bg-green-500' : ''
                      }
                    >
                      {recommendation.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{recommendation.description}</p>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h5 className="font-medium mb-2">Expected Impact</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Performance:</span>
                          <span className="text-green-600">+{recommendation.impact.performance_improvement}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>User Experience:</span>
                          <span className="text-green-600">+{recommendation.impact.user_experience_improvement}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Scalability:</span>
                          <span className="text-green-600">+{recommendation.impact.scalability_improvement}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">ROI Analysis</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Investment:</span>
                          <span>${recommendation.roi.investment.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Monthly Savings:</span>
                          <span className="text-green-600">${recommendation.roi.monthly_savings.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payback Period:</span>
                          <span>{recommendation.roi.payback_period.toFixed(1)} months</span>
                        </div>
                        <div className="flex justify-between">
                          <span>3-Year ROI:</span>
                          <span className="text-green-600">{recommendation.roi.three_year_roi}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Implementation Timeline:</span>
                      <span className="font-medium">{recommendation.timeline.total} days</span>
                    </div>
                    <Progress value={(recommendation.timeline.total / 30) * 100} className="h-2 mt-1" />
                  </div>
                  
                  {recommendation.risks.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm text-orange-600 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {recommendation.risks.length} risk(s) identified
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="forecasts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Forecasts</CardTitle>
              <CardDescription>
                Predictive analysis of system performance trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performanceMetrics?.forecasts.map((forecast) => (
                <div key={forecast.metric} className="border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h5 className="font-semibold capitalize">{forecast.metric.replace('_', ' ')}</h5>
                      <p className="text-sm text-muted-foreground">
                        Current: {formatNumber(forecast.current_value, 'ms')} • 
                        Method: {forecast.methodology}
                      </p>
                    </div>
                    <Badge variant="outline">{forecast.confidence_interval}% confidence</Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3 mb-4">
                    {forecast.forecasts.map((prediction) => (
                      <div key={prediction.timeframe} className="text-center p-3 border rounded">
                        <div className="text-lg font-semibold">
                          {formatNumber(prediction.predicted_value, 'ms')}
                        </div>
                        <div className="text-sm text-muted-foreground">{prediction.timeframe}</div>
                        <div className="text-xs text-muted-foreground">
                          {prediction.confidence}% confidence
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Range: {formatNumber(prediction.range_min, 'ms')} - {formatNumber(prediction.range_max, 'ms')}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h6 className="font-medium mb-2">Influencing Factors</h6>
                      <div className="space-y-2">
                        {forecast.factors.map((factor, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{factor.factor}:</span>
                            <div className="flex items-center space-x-2">
                              <span className={factor.influence > 0 ? 'text-red-600' : 'text-green-600'}>
                                {factor.influence > 0 ? '+' : ''}{factor.influence}%
                              </span>
                              {factor.influence > 0 ? (
                                <ArrowUp className="h-3 w-3 text-red-600" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-green-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h6 className="font-medium mb-2">Scenarios</h6>
                      <div className="space-y-2">
                        {forecast.scenarios.map((scenario, index) => (
                          <div key={index} className="p-2 border rounded text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{scenario.name}:</span>
                              <span>{scenario.probability}%</span>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatNumber(scenario.predicted_outcome, 'ms')} • {scenario.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottleneck Details Dialog */}
      <Dialog open={showBottleneckDialog} onOpenChange={setShowBottleneckDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Bottleneck Analysis</DialogTitle>
          </DialogHeader>
          {selectedBottleneck && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h4 className="text-lg font-semibold">{selectedBottleneck.name}</h4>
                {getSeverityBadge(selectedBottleneck.severity)}
                <Badge variant="outline" className="capitalize">{selectedBottleneck.category}</Badge>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Root Cause Analysis</Label>
                  <div className="border rounded-lg p-3 mt-2 space-y-2">
                    <div>
                      <span className="font-medium">Primary Cause:</span>
                      <p className="text-sm">{selectedBottleneck.root_cause.primary_cause}</p>
                    </div>
                    <div>
                      <span className="font-medium">Certainty:</span>
                      <span className="text-sm ml-2">{selectedBottleneck.root_cause.certainty}%</span>
                    </div>
                    <div>
                      <span className="font-medium">Contributing Factors:</span>
                      <ul className="text-sm mt-1">
                        {selectedBottleneck.root_cause.contributing_factors.map((factor, index) => (
                          <li key={index} className="ml-4">• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Impact Analysis</Label>
                  <div className="border rounded-lg p-3 mt-2 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Performance Degradation:</span>
                      <span className="text-red-600">{selectedBottleneck.impact.performance_degradation}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Affected Users:</span>
                      <span>{selectedBottleneck.impact.affected_users.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Cost:</span>
                      <span>${selectedBottleneck.impact.estimated_cost}/hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SLA Breach:</span>
                      <Badge variant={selectedBottleneck.impact.sla_breach ? 'destructive' : 'outline'} className="text-xs">
                        {selectedBottleneck.impact.sla_breach ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBottleneckDialog(false)}>
              Close
            </Button>
            {canOptimize && (
              <Button>
                Create Optimization Plan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recommendation Details Dialog */}
      <Dialog open={showRecommendationDialog} onOpenChange={setShowRecommendationDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Optimization Recommendation</DialogTitle>
          </DialogHeader>
          {selectedRecommendation && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="text-lg font-semibold">{selectedRecommendation.title}</h4>
                  {getPriorityBadge(selectedRecommendation.priority)}
                  {getEffortBadge(selectedRecommendation.effort)}
                </div>
                <p className="text-sm text-muted-foreground">{selectedRecommendation.description}</p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label>Expected Impact</Label>
                  <div className="border rounded-lg p-3 mt-2 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Performance Improvement:</span>
                      <span className="text-green-600">+{selectedRecommendation.impact.performance_improvement}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost Reduction:</span>
                      <span className="text-green-600">${selectedRecommendation.impact.cost_reduction?.toLocaleString()}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span>User Experience:</span>
                      <span className="text-green-600">+{selectedRecommendation.impact.user_experience_improvement}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Scalability:</span>
                      <span className="text-green-600">+{selectedRecommendation.impact.scalability_improvement}%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>ROI Analysis</Label>
                  <div className="border rounded-lg p-3 mt-2 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Investment:</span>
                      <span>${selectedRecommendation.roi.investment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly Savings:</span>
                      <span className="text-green-600">${selectedRecommendation.roi.monthly_savings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payback Period:</span>
                      <span>{selectedRecommendation.roi.payback_period.toFixed(1)} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3-Year ROI:</span>
                      <span className="text-green-600">{selectedRecommendation.roi.three_year_roi}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Implementation Timeline ({selectedRecommendation.timeline.total} days)</Label>
                <div className="border rounded-lg p-3 mt-2">
                  <div className="space-y-3">
                    {selectedRecommendation.timeline.phases.map((phase, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{phase.name}</span>
                          <div className="text-xs text-muted-foreground">
                            {phase.deliverables.join(', ')}
                          </div>
                        </div>
                        <Badge variant="outline">{phase.duration} days</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {selectedRecommendation.risks.length > 0 && (
                <div>
                  <Label>Risks & Mitigation</Label>
                  <div className="border rounded-lg p-3 mt-2 space-y-2">
                    {selectedRecommendation.risks.map((risk, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{risk.description}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">{risk.probability}%</Badge>
                            <Badge variant="outline" className="text-xs capitalize">{risk.impact}</Badge>
                          </div>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Mitigation: {risk.mitigation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecommendationDialog(false)}>
              Close
            </Button>
            {canOptimize && selectedRecommendation?.status === 'pending' && (
              <Button>
                Approve Recommendation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
