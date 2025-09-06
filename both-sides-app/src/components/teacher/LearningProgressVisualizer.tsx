/**
 * Learning Progress Visualizer Component
 * 
 * Task 8.2.3: Visualize learning progress with trend analysis and projections
 */

'use client';

import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ReferenceLine,
  ComposedChart,
  Bar
} from 'recharts';
import { 
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  BarChart3,
  Activity,
  Calendar,
  Eye,
  Filter,
  Zap,
  Award,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

// Types
interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  currentScore: number;
  trend: 'improving' | 'stable' | 'declining';
  skillScores: Record<string, number>;
  lastActivity: Date;
  completedDebates: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface LearningProgressVisualizerProps {
  students: StudentSummary[];
}

interface ProgressProjection {
  studentId: string;
  currentScore: number;
  projectedScore: number;
  confidenceLevel: number;
  timeToTarget: number; // weeks
  requiredImprovement: number;
}

interface LearningTrend {
  date: string;
  classAverage: number;
  topQuartile: number;
  bottomQuartile: number;
  median: number;
  engagementRate: number;
}

export function LearningProgressVisualizer({ students }: LearningProgressVisualizerProps) {
  const [selectedView, setSelectedView] = useState<'trends' | 'projections' | 'comparison' | 'individual'>('trends');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<'performance' | 'engagement' | 'completion'>('performance');
  const [timeRange, setTimeRange] = useState<'month' | 'semester' | 'year'>('month');

  // Generate mock learning trends
  const generateLearningTrends = (): LearningTrend[] => {
    const trends: LearningTrend[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 56); // 8 weeks ago

    for (let i = 0; i < 8; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i * 7);
      
      const baseScore = 75 + i * 1.5; // Gradual improvement
      const variance = Math.random() * 10 - 5; // ±5 variance
      
      trends.push({
        date: date.toISOString().split('T')[0],
        classAverage: Math.max(0, Math.min(100, baseScore + variance)),
        topQuartile: Math.max(0, Math.min(100, baseScore + variance + 15)),
        bottomQuartile: Math.max(0, Math.min(100, baseScore + variance - 15)),
        median: Math.max(0, Math.min(100, baseScore + variance + 2)),
        engagementRate: Math.max(0, Math.min(100, 80 + variance))
      });
    }
    
    return trends;
  };

  // Generate progress projections
  const generateProgressProjections = (): ProgressProjection[] => {
    return students.map(student => {
      const improvementRate = student.trend === 'improving' ? 2 : 
                             student.trend === 'declining' ? -1 : 0.5;
      const projectedScore = Math.min(100, student.currentScore + improvementRate * 4); // 4 weeks projection
      const targetScore = 85;
      const requiredImprovement = targetScore - student.currentScore;
      const timeToTarget = requiredImprovement > 0 ? Math.ceil(requiredImprovement / Math.abs(improvementRate)) : 0;
      
      return {
        studentId: student.id,
        currentScore: student.currentScore,
        projectedScore,
        confidenceLevel: Math.random() * 30 + 70, // 70-100% confidence
        timeToTarget: Math.min(timeToTarget, 20), // Cap at 20 weeks
        requiredImprovement
      };
    });
  };

  // Generate individual student progress
  const generateStudentProgress = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return [];

    const progress = [];
    const startScore = Math.max(40, student.currentScore - 20);
    
    for (let i = 0; i < 8; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (7 - i) * 7);
      
      const progressRatio = i / 7;
      const score = startScore + (student.currentScore - startScore) * progressRatio;
      const variance = (Math.random() - 0.5) * 8;
      
      progress.push({
        date: date.toISOString().split('T')[0],
        score: Math.max(0, Math.min(100, score + variance)),
        engagement: Math.max(0, Math.min(100, 75 + variance + i * 2)),
        completion: Math.max(0, Math.min(100, 70 + variance + i * 3))
      });
    }
    
    return progress;
  };

  const learningTrends = generateLearningTrends();
  const progressProjections = generateProgressProjections();
  const selectedStudentProgress = selectedStudent ? generateStudentProgress(selectedStudent) : [];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge variant="outline" className="text-green-600 border-green-600">Low Risk</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Risk</Badge>;
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      default:
        return null;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) return <Badge variant="default" className="bg-green-100 text-green-800">High</Badge>;
    if (confidence >= 70) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Learning Progress Visualization</h3>
          <p className="text-muted-foreground">
            Comprehensive progress tracking with trend analysis and projections
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trends">Class Trends</SelectItem>
              <SelectItem value="projections">Projections</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedView === 'individual' && (
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">1 Month</SelectItem>
              <SelectItem value="semester">Semester</SelectItem>
              <SelectItem value="year">Full Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedView === 'trends' && (
        <>
          {/* Class Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Class Performance Trends
              </CardTitle>
              <CardDescription>
                Track overall class progress with quartile analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={learningTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value as string)}
                      formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                    />
                    <Area
                      type="monotone"
                      dataKey="topQuartile"
                      stackId="1"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.3}
                      name="Top 25%"
                    />
                    <Area
                      type="monotone"
                      dataKey="classAverage"
                      stackId="2"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                      name="Class Average"
                    />
                    <Area
                      type="monotone"
                      dataKey="bottomQuartile"
                      stackId="3"
                      stroke="#ffc658"
                      fill="#ffc658"
                      fillOpacity={0.3}
                      name="Bottom 25%"
                    />
                    <Line
                      type="monotone"
                      dataKey="median"
                      stroke="#ff7300"
                      strokeWidth={2}
                      name="Median"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Trend Analysis Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                  Overall Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Improving</div>
                <p className="text-sm text-muted-foreground">
                  Class average increased by 8.2% over the past month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Student Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Above Target (85%+):</span>
                    <span className="font-medium">{students.filter(s => s.currentScore >= 85).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>At Risk (&lt; 70%):</span>
                    <span className="font-medium text-red-600">{students.filter(s => s.currentScore < 70).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Engagement Correlation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+0.82</div>
                <p className="text-sm text-muted-foreground">
                  Strong positive correlation between engagement and performance
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {selectedView === 'projections' && (
        <>
          {/* Progress Projections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Learning Progress Projections
              </CardTitle>
              <CardDescription>
                Predicted student performance based on current trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressProjections.map((projection) => {
                  const student = students.find(s => s.id === projection.studentId);
                  if (!student) return null;

                  return (
                    <div key={projection.studentId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback>
                            {student.firstName[0]}{student.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>Current: {projection.currentScore.toFixed(1)}%</span>
                            {getTrendIcon(student.trend)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Projected</div>
                          <div className="font-bold">{projection.projectedScore.toFixed(1)}%</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Confidence</div>
                          <div className="flex items-center space-x-1">
                            <span className="text-sm font-medium">{projection.confidenceLevel.toFixed(0)}%</span>
                            {getConfidenceBadge(projection.confidenceLevel)}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Time to Target</div>
                          <div className="font-medium">
                            {projection.timeToTarget > 0 ? `${projection.timeToTarget}w` : 'At target'}
                          </div>
                        </div>
                        
                        {getRiskBadge(student.riskLevel)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Projection Summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                  On Track Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {progressProjections.filter(p => p.projectedScore >= 85).length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Students projected to meet or exceed target performance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                  Need Intervention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {progressProjections.filter(p => p.projectedScore < 70).length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Students who may need additional support to reach targets
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {selectedView === 'comparison' && (
        <>
          {/* Student Performance Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Performance vs Engagement Analysis
              </CardTitle>
              <CardDescription>
                Identify correlation patterns between different metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="engagement" 
                      name="Engagement" 
                      domain={[0, 100]}
                      label={{ value: 'Engagement Rate (%)', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis 
                      dataKey="performance" 
                      name="Performance" 
                      domain={[0, 100]}
                      label={{ value: 'Performance Score (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                    />
                    <ReferenceLine x={75} stroke="#ff7300" strokeDasharray="3 3" />
                    <ReferenceLine y={75} stroke="#ff7300" strokeDasharray="3 3" />
                    <Scatter 
                      data={students.map(s => ({
                        engagement: Math.random() * 40 + 60, // Mock engagement data
                        performance: s.currentScore,
                        name: `${s.firstName} ${s.lastName}`
                      }))}
                      fill="#8884d8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Comparative Analysis */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Students in the top quartile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {students
                    .filter(s => s.currentScore >= 85)
                    .slice(0, 5)
                    .map((student, index) => (
                      <div key={student.id} className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                          {index + 1}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback className="text-xs">
                            {student.firstName[0]}{student.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {student.currentScore.toFixed(1)}% • {student.completedDebates} debates
                          </div>
                        </div>
                        {getTrendIcon(student.trend)}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Improved</CardTitle>
                <CardDescription>Students showing greatest progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {students
                    .filter(s => s.trend === 'improving')
                    .slice(0, 5)
                    .map((student, index) => (
                      <div key={student.id} className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                          {index + 1}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback className="text-xs">
                            {student.firstName[0]}{student.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {student.currentScore.toFixed(1)}% • +{(Math.random() * 10 + 5).toFixed(1)}% improvement
                          </div>
                        </div>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {selectedView === 'individual' && selectedStudent && (
        <>
          {/* Individual Student Progress */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Individual Progress Tracking
                  </CardTitle>
                  <CardDescription>
                    Detailed progress analysis for {students.find(s => s.id === selectedStudent)?.firstName} {students.find(s => s.id === selectedStudent)?.lastName}
                  </CardDescription>
                </div>
                <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="completion">Completion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={selectedStudentProgress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value as string)}
                      formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                    />
                    <Area
                      type="monotone"
                      dataKey={selectedMetric}
                      fill="#8884d8"
                      fillOpacity={0.3}
                      stroke="#8884d8"
                      strokeWidth={2}
                      name={selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
                    />
                    <ReferenceLine y={85} stroke="#ff7300" strokeDasharray="3 3" label="Target" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Individual Student Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            {['performance', 'engagement', 'completion'].map((metric) => {
              const latestValue = selectedStudentProgress[selectedStudentProgress.length - 1]?.[metric as keyof typeof selectedStudentProgress[0]] || 0;
              const previousValue = selectedStudentProgress[selectedStudentProgress.length - 2]?.[metric as keyof typeof selectedStudentProgress[0]] || 0;
              const change = latestValue - previousValue;
              
              return (
                <Card key={metric}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base capitalize flex items-center justify-between">
                      {metric}
                      {change > 0 ? 
                        <TrendingUp className="h-4 w-4 text-green-600" /> : 
                        change < 0 ? 
                        <TrendingDown className="h-4 w-4 text-red-600" /> :
                        <Target className="h-4 w-4 text-gray-600" />
                      }
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {typeof latestValue === 'number' ? latestValue.toFixed(1) : 0}%
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : ''}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}% from last week
                      </span>
                    </div>
                    <Progress value={typeof latestValue === 'number' ? latestValue : 0} className="mt-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Review
        </Button>
        <Button variant="outline">
          <Award className="h-4 w-4 mr-2" />
          Set Goals
        </Button>
        <Button>
          <BarChart3 className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>
    </div>
  );
}
