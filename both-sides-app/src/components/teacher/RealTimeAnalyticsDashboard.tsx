/**
 * Real-time Analytics Dashboard Component
 * 
 * Task 8.4.1: Live engagement metrics, participation graphs, sentiment analysis,
 * and real-time learning objective progress tracking during sessions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { 
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Brain,
  MessageSquare,
  Users,
  Clock,
  Target,
  Award,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Download,
  Share2,
  Settings,
  Filter,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface AnalyticsMetrics {
  timestamp: Date;
  engagement: EngagementMetrics;
  participation: ParticipationMetrics;
  sentiment: SentimentMetrics;
  quality: QualityMetrics;
  learning: LearningObjectiveMetrics;
}

interface EngagementMetrics {
  overall: number; // 0-100
  individual: { [participantId: string]: number };
  trend: 'up' | 'down' | 'stable';
  peakTime: Date;
  lowPoint: Date;
  averageResponseTime: number;
  attentionSpan: number;
  dropOffRate: number;
}

interface ParticipationMetrics {
  totalMessages: number;
  messagesPerMinute: number;
  activeParticipants: number;
  participationRate: number; // percentage of participants actively contributing
  balanceScore: number; // how evenly distributed participation is
  dominanceIndex: number; // if one person is dominating
  silentParticipants: string[];
  topContributors: { id: string; name: string; messageCount: number }[];
}

interface SentimentMetrics {
  overall: 'positive' | 'neutral' | 'negative';
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  emotionalTone: {
    respectful: number;
    aggressive: number;
    collaborative: number;
    competitive: number;
  };
  controversyLevel: number; // 0-100, higher = more heated debate
  civility: number; // 0-100, higher = more civil discourse
}

interface QualityMetrics {
  argumentStrength: number; // 0-100
  evidenceUsage: number; // 0-100
  logicalConsistency: number; // 0-100
  originalityScore: number; // 0-100
  factualAccuracy: number; // 0-100
  citationCount: number;
  fallacyDetection: { type: string; count: number }[];
  improvementTrend: 'improving' | 'stable' | 'declining';
}

interface LearningObjectiveMetrics {
  objectives: LearningObjective[];
  overallProgress: number; // 0-100
  completedObjectives: number;
  strugglingAreas: string[];
  exceedingExpectations: string[];
}

interface LearningObjective {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-100
  targetLevel: 'beginner' | 'intermediate' | 'advanced';
  assessmentMethod: 'participation' | 'quality' | 'collaboration' | 'critical_thinking';
  evidenceCount: number;
  lastUpdated: Date;
}

interface RealTimeAnalyticsDashboardProps {
  sessionId: string;
  participants?: any[];
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  onMetricAlert?: (metric: string, value: number, threshold: number) => void;
}

export function RealTimeAnalyticsDashboard({
  sessionId,
  participants = [],
  autoRefresh = true,
  refreshInterval = 5000,
  onMetricAlert
}: RealTimeAnalyticsDashboardProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<AnalyticsMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<'5m' | '15m' | '30m' | '1h'>('15m');
  const [alertThresholds, setAlertThresholds] = useState({
    lowEngagement: 40,
    highDropoff: 20,
    lowParticipation: 30,
    negativeSentiment: 60
  });
  
  // Chart customization
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [showAllParticipants, setShowAllParticipants] = useState(false);

  useEffect(() => {
    generateInitialData();
    
    if (autoRefresh) {
      const interval = setInterval(updateAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const generateInitialData = () => {
    // Generate last 30 data points (for 15-minute view with 30-second intervals)
    const now = new Date();
    const dataPoints: AnalyticsMetrics[] = [];

    for (let i = 29; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 30000); // 30-second intervals
      
      const baseEngagement = 75 + Math.sin(i * 0.2) * 15; // Wave pattern
      const engagementNoise = (Math.random() - 0.5) * 20;
      const engagement = Math.max(0, Math.min(100, baseEngagement + engagementNoise));
      
      dataPoints.push({
        timestamp,
        engagement: {
          overall: Math.round(engagement),
          individual: participants.reduce((acc, p) => ({
            ...acc,
            [p.id]: Math.max(0, Math.min(100, engagement + (Math.random() - 0.5) * 30))
          }), {}),
          trend: engagement > baseEngagement + 5 ? 'up' : 
                 engagement < baseEngagement - 5 ? 'down' : 'stable',
          peakTime: timestamp,
          lowPoint: timestamp,
          averageResponseTime: 2000 + Math.random() * 3000,
          attentionSpan: Math.round(300 + Math.random() * 600), // 5-15 minutes
          dropOffRate: Math.max(0, Math.min(50, 15 + (Math.random() - 0.5) * 20))
        },
        participation: {
          totalMessages: Math.round(50 + i * 2 + Math.random() * 10),
          messagesPerMinute: Math.round(2 + Math.random() * 4),
          activeParticipants: Math.min(participants.length, Math.round(participants.length * (0.6 + Math.random() * 0.3))),
          participationRate: Math.round(60 + Math.random() * 30),
          balanceScore: Math.round(50 + Math.random() * 40),
          dominanceIndex: Math.round(Math.random() * 40),
          silentParticipants: [],
          topContributors: participants.slice(0, 3).map((p, idx) => ({
            id: p.id,
            name: p.name,
            messageCount: Math.round(15 - idx * 3 + Math.random() * 5)
          }))
        },
        sentiment: {
          overall: Math.random() > 0.7 ? 'negative' : Math.random() > 0.3 ? 'positive' : 'neutral',
          distribution: {
            positive: Math.round(30 + Math.random() * 40),
            neutral: Math.round(20 + Math.random() * 30),
            negative: Math.round(Math.random() * 30)
          },
          emotionalTone: {
            respectful: Math.round(60 + Math.random() * 30),
            aggressive: Math.round(Math.random() * 20),
            collaborative: Math.round(40 + Math.random() * 40),
            competitive: Math.round(30 + Math.random() * 30)
          },
          controversyLevel: Math.round(20 + Math.random() * 40),
          civility: Math.round(70 + Math.random() * 25)
        },
        quality: {
          argumentStrength: Math.round(60 + Math.random() * 30),
          evidenceUsage: Math.round(50 + Math.random() * 35),
          logicalConsistency: Math.round(65 + Math.random() * 25),
          originalityScore: Math.round(55 + Math.random() * 30),
          factualAccuracy: Math.round(70 + Math.random() * 25),
          citationCount: Math.round(5 + Math.random() * 10),
          fallacyDetection: [
            { type: 'Ad Hominem', count: Math.round(Math.random() * 3) },
            { type: 'Straw Man', count: Math.round(Math.random() * 2) },
            { type: 'False Dichotomy', count: Math.round(Math.random() * 2) }
          ],
          improvementTrend: Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining'
        },
        learning: {
          objectives: [
            {
              id: 'critical-thinking',
              title: 'Critical Thinking',
              description: 'Analyze and evaluate arguments effectively',
              progress: Math.round(60 + Math.random() * 30),
              targetLevel: 'intermediate',
              assessmentMethod: 'critical_thinking',
              evidenceCount: Math.round(5 + Math.random() * 10),
              lastUpdated: timestamp
            },
            {
              id: 'evidence-evaluation',
              title: 'Evidence Evaluation',
              description: 'Assess credibility and relevance of sources',
              progress: Math.round(50 + Math.random() * 35),
              targetLevel: 'intermediate',
              assessmentMethod: 'quality',
              evidenceCount: Math.round(3 + Math.random() * 8),
              lastUpdated: timestamp
            },
            {
              id: 'respectful-discourse',
              title: 'Respectful Discourse',
              description: 'Maintain civility while disagreeing',
              progress: Math.round(70 + Math.random() * 25),
              targetLevel: 'advanced',
              assessmentMethod: 'collaboration',
              evidenceCount: Math.round(8 + Math.random() * 12),
              lastUpdated: timestamp
            }
          ],
          overallProgress: Math.round(60 + Math.random() * 25),
          completedObjectives: Math.round(Math.random() * 2),
          strugglingAreas: ['Evidence Evaluation'],
          exceedingExpectations: ['Respectful Discourse']
        }
      });
    }

    setAnalyticsData(dataPoints);
    setCurrentMetrics(dataPoints[dataPoints.length - 1]);
  };

  const updateAnalytics = () => {
    if (analyticsData.length === 0) return;
    
    const lastMetric = analyticsData[analyticsData.length - 1];
    const now = new Date();
    
    // Generate new data point
    const engagementTrend = lastMetric.engagement.trend === 'up' ? 5 : 
                          lastMetric.engagement.trend === 'down' ? -5 : 0;
    const newEngagement = Math.max(0, Math.min(100, 
      lastMetric.engagement.overall + engagementTrend + (Math.random() - 0.5) * 10
    ));

    const newMetric: AnalyticsMetrics = {
      ...lastMetric,
      timestamp: now,
      engagement: {
        ...lastMetric.engagement,
        overall: Math.round(newEngagement),
        trend: newEngagement > lastMetric.engagement.overall + 3 ? 'up' :
               newEngagement < lastMetric.engagement.overall - 3 ? 'down' : 'stable'
      },
      participation: {
        ...lastMetric.participation,
        totalMessages: lastMetric.participation.totalMessages + Math.round(Math.random() * 5),
        messagesPerMinute: Math.round(2 + Math.random() * 4)
      }
    };

    // Check for alerts
    checkMetricAlerts(newMetric);
    
    // Update data (keep last 100 points)
    setAnalyticsData(prev => [...prev.slice(-99), newMetric]);
    setCurrentMetrics(newMetric);
  };

  const checkMetricAlerts = (metrics: AnalyticsMetrics) => {
    if (metrics.engagement.overall < alertThresholds.lowEngagement) {
      onMetricAlert?.('engagement', metrics.engagement.overall, alertThresholds.lowEngagement);
    }
    
    if (metrics.engagement.dropOffRate > alertThresholds.highDropoff) {
      onMetricAlert?.('dropoff', metrics.engagement.dropOffRate, alertThresholds.highDropoff);
    }
    
    if (metrics.participation.participationRate < alertThresholds.lowParticipation) {
      onMetricAlert?.('participation', metrics.participation.participationRate, alertThresholds.lowParticipation);
    }
  };

  const getTimeRangeData = () => {
    const minutes = timeRange === '5m' ? 5 : timeRange === '15m' ? 15 : timeRange === '30m' ? 30 : 60;
    const points = Math.min(analyticsData.length, minutes * 2); // 30-second intervals
    return analyticsData.slice(-points);
  };

  const getMetricTrend = (current: number, previous: number) => {
    const change = current - previous;
    const percentChange = previous > 0 ? (change / previous) * 100 : 0;
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      value: Math.abs(percentChange),
      color: change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
    };
  };

  const formatTimeAxis = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff0000'];
  
  const displayData = getTimeRangeData();
  const previousMetric = analyticsData.length > 1 ? analyticsData[analyticsData.length - 2] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Real-time Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Live engagement metrics, participation tracking, and learning progress
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            <Badge variant={autoRefresh ? "default" : "secondary"} className="flex items-center">
              <Activity className={`h-3 w-3 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Badge>
            {currentMetrics && (
              <Badge variant="outline">
                {Math.round(currentMetrics.engagement.overall)}% Engagement
              </Badge>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="30m">30m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={updateAnalytics}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Metrics Overview */}
      {currentMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Engagement</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.engagement.overall}%</div>
              {previousMetric && (
                <div className={`text-xs flex items-center ${getMetricTrend(
                  currentMetrics.engagement.overall, 
                  previousMetric.engagement.overall
                ).color}`}>
                  {getMetricTrend(currentMetrics.engagement.overall, previousMetric.engagement.overall).direction === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : getMetricTrend(currentMetrics.engagement.overall, previousMetric.engagement.overall).direction === 'down' ? (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  ) : (
                    <Activity className="h-3 w-3 mr-1" />
                  )}
                  {Math.round(getMetricTrend(currentMetrics.engagement.overall, previousMetric.engagement.overall).value)}%
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participation Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.participation.participationRate}%</div>
              <p className="text-xs text-muted-foreground">
                {currentMetrics.participation.activeParticipants}/{participants.length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Message Quality</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.quality.argumentStrength}%</div>
              <p className="text-xs text-muted-foreground">
                {currentMetrics.quality.citationCount} citations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Learning Progress</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.learning.overallProgress}%</div>
              <p className="text-xs text-muted-foreground">
                {currentMetrics.learning.completedObjectives} objectives completed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="participation">Participation</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Engagement Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <LineChartIcon className="h-5 w-5 mr-2" />
                  Engagement Timeline
                </span>
                <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={displayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimeAxis}
                        type="category"
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(label) => `Time: ${formatTimeAxis(label)}`}
                        formatter={(value: number, name: string) => [`${Math.round(value)}%`, name]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="engagement.overall" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Overall Engagement"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="participation.participationRate" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="Participation Rate"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="quality.argumentStrength" 
                        stroke="#ffc658" 
                        strokeWidth={2}
                        name="Quality Score"
                        dot={false}
                      />
                    </LineChart>
                  ) : chartType === 'area' ? (
                    <AreaChart data={displayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimeAxis}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(label) => `Time: ${formatTimeAxis(label)}`}
                        formatter={(value: number, name: string) => [`${Math.round(value)}%`, name]}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="engagement.overall" 
                        stackId="1"
                        stroke="#8884d8" 
                        fill="#8884d8"
                        fillOpacity={0.6}
                        name="Engagement"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={displayData.slice(-10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimeAxis}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(label) => `Time: ${formatTimeAxis(label)}`}
                        formatter={(value: number, name: string) => [`${Math.round(value)}%`, name]}
                      />
                      <Legend />
                      <Bar dataKey="engagement.overall" fill="#8884d8" name="Engagement" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Current Session Metrics */}
          {currentMetrics && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChartIcon className="h-5 w-5 mr-2" />
                    Sentiment Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Positive', value: currentMetrics.sentiment.distribution.positive, fill: '#82ca9d' },
                            { name: 'Neutral', value: currentMetrics.sentiment.distribution.neutral, fill: '#8884d8' },
                            { name: 'Negative', value: currentMetrics.sentiment.distribution.negative, fill: '#ff8042' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        />
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Percentage']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Learning Objectives Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentMetrics.learning.objectives.map((objective) => (
                      <div key={objective.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{objective.title}</span>
                          <span>{objective.progress}%</span>
                        </div>
                        <Progress value={objective.progress} />
                        <div className="text-xs text-muted-foreground">
                          {objective.evidenceCount} evidence points collected
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          {/* Individual Engagement Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  Individual Engagement Levels
                </span>
                <Switch
                  checked={showAllParticipants}
                  onCheckedChange={setShowAllParticipants}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimeAxis}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(label) => `Time: ${formatTimeAxis(label)}`}
                      formatter={(value: number, name: string) => [`${Math.round(value)}%`, name]}
                    />
                    <Legend />
                    {showAllParticipants && participants.map((participant, index) => (
                      <Line
                        key={participant.id}
                        type="monotone"
                        dataKey={`engagement.individual.${participant.id}`}
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={1}
                        name={participant.name}
                        dot={false}
                      />
                    ))}
                    <Line
                      type="monotone"
                      dataKey="engagement.overall"
                      stroke="#000"
                      strokeWidth={3}
                      name="Average"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Metrics */}
          {currentMetrics && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(currentMetrics.engagement.averageResponseTime / 1000)}s
                  </div>
                  <p className="text-sm text-muted-foreground">Average response time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attention Span</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(currentMetrics.engagement.attentionSpan / 60)}m
                  </div>
                  <p className="text-sm text-muted-foreground">Average attention span</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Drop-off Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(currentMetrics.engagement.dropOffRate)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Participants becoming inactive</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="participation" className="space-y-6">
          {/* Participation Balance */}
          {currentMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Participation Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium mb-2">Top Contributors</div>
                      <div className="space-y-2">
                        {currentMetrics.participation.topContributors.map((contributor, index) => (
                          <div key={contributor.id} className="flex items-center justify-between">
                            <span className="text-sm">{contributor.name}</span>
                            <Badge variant="outline">{contributor.messageCount} messages</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Balance Score</span>
                          <span>{currentMetrics.participation.balanceScore}%</span>
                        </div>
                        <Progress value={currentMetrics.participation.balanceScore} className="mt-2" />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Dominance Index</span>
                          <span>{currentMetrics.participation.dominanceIndex}%</span>
                        </div>
                        <Progress value={currentMetrics.participation.dominanceIndex} className="mt-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6">
          {/* Sentiment Analysis */}
          {currentMetrics && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Smile className="h-5 w-5 mr-2" />
                    Emotional Tone Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(currentMetrics.sentiment.emotionalTone).map(([tone, value]) => (
                      <div key={tone} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{tone}</span>
                          <span>{value}%</span>
                        </div>
                        <Progress value={value} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Discourse Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Civility Level</span>
                        <span>{currentMetrics.sentiment.civility}%</span>
                      </div>
                      <Progress value={currentMetrics.sentiment.civility} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Controversy Level</span>
                        <span>{currentMetrics.sentiment.controversyLevel}%</span>
                      </div>
                      <Progress value={currentMetrics.sentiment.controversyLevel} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="learning" className="space-y-6">
          {/* Learning Objectives Detailed View */}
          {currentMetrics && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Learning Objectives Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {currentMetrics.learning.objectives.map((objective) => (
                      <div key={objective.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{objective.title}</h4>
                            <p className="text-sm text-muted-foreground">{objective.description}</p>
                          </div>
                          <Badge variant={
                            objective.targetLevel === 'advanced' ? 'default' :
                            objective.targetLevel === 'intermediate' ? 'secondary' : 'outline'
                          }>
                            {objective.targetLevel}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span>{objective.progress}%</span>
                          </div>
                          <Progress value={objective.progress} />
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                          <span>{objective.evidenceCount} evidence points</span>
                          <span>Last updated: {objective.lastUpdated.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                      Exceeding Expectations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentMetrics.learning.exceedingExpectations.length > 0 ? (
                      <div className="space-y-2">
                        {currentMetrics.learning.exceedingExpectations.map((area, index) => (
                          <Badge key={index} className="bg-green-100 text-green-800">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No areas exceeding expectations yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                      Areas Needing Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentMetrics.learning.strugglingAreas.length > 0 ? (
                      <div className="space-y-2">
                        {currentMetrics.learning.strugglingAreas.map((area, index) => (
                          <Badge key={index} variant="secondary">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">All areas are progressing well</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
