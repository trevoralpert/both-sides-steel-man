/**
 * Student Progress Tracker Component
 * 
 * Task 8.2.2: Individual learning journey tracking and progress monitoring
 */

'use client';

import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Calendar,
  BarChart3,
  Activity,
  CheckCircle2,
  Clock,
  Brain,
  MessageSquare
} from 'lucide-react';

// Types
interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  skillProgression: Record<string, number>;
  completedDebates: number;
  averageScore: number;
  completionRate: number;
  engagementLevel: 'low' | 'medium' | 'high';
  participationRate: number;
  achievements: string[];
  goals: string[];
}

interface ProgressDataPoint {
  date: string;
  score: number;
  engagement: number;
  participation: number;
}

interface SkillAssessment {
  skill: string;
  current: number;
  target: number;
  improvement: number;
  trend: 'up' | 'down' | 'stable';
}

interface StudentProgressTrackerProps {
  student: StudentProfile;
}

export function StudentProgressTracker({ student }: StudentProgressTrackerProps) {
  const [timeRange, setTimeRange] = useState('month');
  const [viewType, setViewType] = useState('overview');

  // Mock progress data - would come from API
  const progressData: ProgressDataPoint[] = [
    { date: '2024-09-01', score: 75, engagement: 68, participation: 72 },
    { date: '2024-09-08', score: 78, engagement: 72, participation: 75 },
    { date: '2024-09-15', score: 82, engagement: 78, participation: 80 },
    { date: '2024-09-22', score: 85, engagement: 82, participation: 85 },
    { date: '2024-09-29', score: 88, engagement: 85, participation: 88 },
    { date: '2024-10-06', score: 86, engagement: 88, participation: 90 },
    { date: '2024-10-13', score: 89, engagement: 90, participation: 92 },
    { date: '2024-10-20', score: 91, engagement: 88, participation: 94 }
  ];

  // Transform skill progression into assessments
  const skillAssessments: SkillAssessment[] = Object.entries(student.skillProgression).map(([skill, current]) => ({
    skill,
    current,
    target: Math.min(current + 15, 100), // Target 15% improvement
    improvement: Math.random() * 10 - 5, // Mock improvement rate
    trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.25 ? 'stable' : 'down'
  }));

  const milestoneData = [
    { name: 'Debates Completed', value: student.completedDebates, target: 20, color: '#8884d8' },
    { name: 'Skills Mastered', value: skillAssessments.filter(s => s.current >= 80).length, target: 6, color: '#82ca9d' },
    { name: 'Achievements Earned', value: student.achievements.length, target: 5, color: '#ffc658' },
    { name: 'Goals Completed', value: Math.floor(student.goals.length * 0.6), target: student.goals.length, color: '#ff7300' }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
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
          <h3 className="text-lg font-semibold">
            Progress Tracking - {student.firstName} {student.lastName}
          </h3>
          <p className="text-muted-foreground">
            Individual learning journey and skill development
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="semester">Semester</SelectItem>
              <SelectItem value="year">Full Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={viewType} onValueChange={setViewType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="skills">Skills</SelectItem>
              <SelectItem value="milestones">Milestones</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewType === 'overview' && (
        <>
          {/* Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Performance Trends
              </CardTitle>
              <CardDescription>
                Track performance, engagement, and participation over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value as string)}
                      formatter={(value: number, name: string) => [`${value}%`, name]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Performance Score"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="engagement" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Engagement"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="participation" 
                      stroke="#ffc658" 
                      strokeWidth={2}
                      name="Participation"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Current Status Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Performance</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{student.averageScore.toFixed(1)}%</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                  +3.2% from last month
                </div>
                <Progress value={student.averageScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Level</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{student.engagementLevel}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                  Improving trend
                </div>
                <Progress value={student.participationRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{student.completionRate.toFixed(1)}%</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  On track with goals
                </div>
                <Progress value={student.completionRate} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {viewType === 'skills' && (
        <>
          {/* Skills Development */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Skill Development Progress
              </CardTitle>
              <CardDescription>
                Track improvement across key learning competencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {skillAssessments.map((assessment) => (
                  <div key={assessment.skill} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{assessment.skill}</span>
                        {getTrendIcon(assessment.trend)}
                        <span className={`text-sm ${getTrendColor(assessment.trend)}`}>
                          {assessment.improvement > 0 ? '+' : ''}{assessment.improvement.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {assessment.current}% / {assessment.target}%
                      </div>
                    </div>
                    <div className="relative">
                      <Progress value={assessment.current} className="h-3" />
                      <div 
                        className="absolute top-0 h-3 w-1 bg-gray-400 rounded"
                        style={{ left: `${assessment.target}%` }}
                        title={`Target: ${assessment.target}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Skills Overview</CardTitle>
              <CardDescription>
                Current skill levels across all competencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillAssessments}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="skill" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Current Level']} />
                    <Bar dataKey="current" fill="#8884d8" />
                    <Bar dataKey="target" fill="#82ca9d" opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {viewType === 'milestones' && (
        <>
          {/* Milestone Progress */}
          <div className="grid gap-4 md:grid-cols-2">
            {milestoneData.map((milestone) => (
              <Card key={milestone.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{milestone.name}</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {milestone.value} / {milestone.target}
                  </div>
                  <Progress 
                    value={(milestone.value / milestone.target) * 100} 
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((milestone.value / milestone.target) * 100)}% completed
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Achievement Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Recent Achievements
              </CardTitle>
              <CardDescription>
                Milestones and accomplishments over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {student.achievements.length > 0 ? (
                <div className="space-y-4">
                  {student.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Award className="h-5 w-5 text-yellow-600" />
                      <div className="flex-1">
                        <div className="font-medium">{achievement}</div>
                        <div className="text-sm text-muted-foreground">
                          Earned {new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                        Achievement
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No achievements yet</h3>
                  <p className="text-muted-foreground">
                    Keep working towards your goals to earn achievements!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goals Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Learning Goals
              </CardTitle>
              <CardDescription>
                Current goals and progress tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {student.goals.length > 0 ? (
                <div className="space-y-4">
                  {student.goals.map((goal, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Target className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <div className="font-medium">{goal}</div>
                        <Progress value={Math.random() * 100} className="mt-2" />
                      </div>
                      <Badge variant="outline">
                        In Progress
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No goals set</h3>
                  <p className="text-muted-foreground">
                    Work with your teacher to set learning goals.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline">
          <MessageSquare className="h-4 w-4 mr-2" />
          Discuss Progress
        </Button>
        <Button variant="outline">
          <Target className="h-4 w-4 mr-2" />
          Set New Goals
        </Button>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Check-in
        </Button>
      </div>
    </div>
  );
}
