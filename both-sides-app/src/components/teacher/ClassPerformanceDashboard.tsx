/**
 * Class Performance Dashboard
 * 
 * Task 7.5.2: Comprehensive class performance analytics with trend analysis,
 * student comparisons, and detailed metrics visualization for teachers.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  BarChart3,
  Calendar,
  Star,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Brain,
  MessageSquare,
  Heart,
  BookOpen,
  Zap,
  Filter,
  Download,
  Eye
} from 'lucide-react';

interface ClassOverview {
  classId: string;
  className: string;
  totalStudents: number;
  activeStudents: number;
  averageEngagement: number;
  completionRate: number;
  overallClassAverage: number;
  lastActivity: Date;
  upcomingDeadlines: number;
}

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  overallProgress: number;
  lastActivity: Date;
  completedReflections: number;
  averageQuality: number;
  riskLevel: 'low' | 'medium' | 'high';
  strengths: string[];
  needsAttention: string[];
  engagementTrend: 'improving' | 'stable' | 'declining';
}

interface ClassPerformanceDashboardProps {
  classData: ClassOverview | null;
  students: StudentSummary[];
}

export function ClassPerformanceDashboard({ classData, students }: ClassPerformanceDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState('overall_progress');
  const [timeframe, setTimeframe] = useState('month');
  const [sortBy, setSortBy] = useState('performance');
  const [filterBy, setFilterBy] = useState('all');

  // Calculate class statistics
  const classStats = useMemo(() => {
    if (students.length === 0) return null;

    const totalProgress = students.reduce((sum, student) => sum + student.overallProgress, 0);
    const totalQuality = students.reduce((sum, student) => sum + student.averageQuality, 0);
    const totalReflections = students.reduce((sum, student) => sum + student.completedReflections, 0);
    
    const highPerformers = students.filter(s => s.overallProgress >= 0.8).length;
    const atRiskStudents = students.filter(s => s.riskLevel === 'high').length;
    const improvingStudents = students.filter(s => s.engagementTrend === 'improving').length;
    
    return {
      averageProgress: totalProgress / students.length,
      averageQuality: totalQuality / students.length,
      averageReflections: totalReflections / students.length,
      highPerformers,
      atRiskStudents,
      improvingStudents,
      totalStudents: students.length
    };
  }, [students]);

  // Filter students based on criteria
  const filteredStudents = useMemo(() => {
    let filtered = [...students];

    switch (filterBy) {
      case 'high_performers':
        filtered = filtered.filter(s => s.overallProgress >= 0.8);
        break;
      case 'at_risk':
        filtered = filtered.filter(s => s.riskLevel === 'high');
        break;
      case 'improving':
        filtered = filtered.filter(s => s.engagementTrend === 'improving');
        break;
      case 'declining':
        filtered = filtered.filter(s => s.engagementTrend === 'declining');
        break;
      default:
        // 'all' - no filtering
        break;
    }

    // Sort students
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return b.overallProgress - a.overallProgress;
        case 'quality':
          return b.averageQuality - a.averageQuality;
        case 'reflections':
          return b.completedReflections - a.completedReflections;
        case 'recent_activity':
          return b.lastActivity.getTime() - a.lastActivity.getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [students, filterBy, sortBy]);

  // Generate performance trends data (mock data for demo)
  const performanceTrends = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      period: `Week ${i + 1}`,
      classAverage: Math.random() * 0.3 + 0.6,
      engagement: Math.random() * 0.3 + 0.7,
      completionRate: Math.random() * 0.2 + 0.8
    }));
  }, []);

  if (!classData) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Class Selected</h3>
          <p className="text-sm text-muted-foreground">
            Please select a class to view performance analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{classData.className} Performance</h2>
          <p className="text-muted-foreground">
            Detailed analytics and insights for class performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="semester">Semester</SelectItem>
              <SelectItem value="year">Academic Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Class Overview Stats */}
      {classStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Class Average</p>
                  <p className="text-2xl font-bold">
                    {Math.round(classStats.averageProgress * 100)}%
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-2">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+3.2%</span>
                <span>from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">High Performers</p>
                  <p className="text-2xl font-bold">{classStats.highPerformers}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {Math.round((classStats.highPerformers / classStats.totalStudents) * 100)}% of class
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">At Risk</p>
                  <p className="text-2xl font-bold">{classStats.atRiskStudents}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Need immediate attention
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Improving</p>
                  <p className="text-2xl font-bold">{classStats.improvingStudents}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Positive growth trend
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Student Details</TabsTrigger>
          <TabsTrigger value="competencies">Competencies</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab classStats={classStats} students={students} />
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <StudentDetailsTab 
            filteredStudents={filteredStudents}
            filterBy={filterBy}
            setFilterBy={setFilterBy}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </TabsContent>

        <TabsContent value="competencies" className="space-y-6">
          <CompetenciesTab students={students} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendsTab performanceTrends={performanceTrends} timeframe={timeframe} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface OverviewTabProps {
  classStats: any;
  students: StudentSummary[];
}

function OverviewTab({ classStats, students }: OverviewTabProps) {
  if (!classStats) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Distribution</CardTitle>
          <CardDescription>How students are performing across different ranges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <PerformanceBar 
              label="Excellent (90-100%)"
              count={students.filter(s => s.overallProgress >= 0.9).length}
              total={students.length}
              color="bg-green-500"
            />
            <PerformanceBar 
              label="Good (80-89%)"
              count={students.filter(s => s.overallProgress >= 0.8 && s.overallProgress < 0.9).length}
              total={students.length}
              color="bg-blue-500"
            />
            <PerformanceBar 
              label="Average (70-79%)"
              count={students.filter(s => s.overallProgress >= 0.7 && s.overallProgress < 0.8).length}
              total={students.length}
              color="bg-yellow-500"
            />
            <PerformanceBar 
              label="Below Average (<70%)"
              count={students.filter(s => s.overallProgress < 0.7).length}
              total={students.length}
              color="bg-red-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
          <CardDescription>Recent student engagement and participation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Reflections Completed</span>
              </div>
              <span className="font-semibold">
                {students.reduce((sum, s) => sum + s.completedReflections, 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-sm">Active in Last Week</span>
              </div>
              <span className="font-semibold">
                {students.filter(s => {
                  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  return s.lastActivity >= weekAgo;
                }).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Showing Improvement</span>
              </div>
              <span className="font-semibold">
                {students.filter(s => s.engagementTrend === 'improving').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Need Attention</span>
              </div>
              <span className="font-semibold">
                {students.filter(s => s.riskLevel === 'high').length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
          <CardDescription>Students leading the class</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {students
              .sort((a, b) => b.overallProgress - a.overallProgress)
              .slice(0, 5)
              .map((student, index) => (
                <div key={student.id} className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-amber-600 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.completedReflections} reflections
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {Math.round(student.overallProgress * 100)}%
                    </p>
                    <div className="flex items-center">
                      {student.engagementTrend === 'improving' ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : student.engagementTrend === 'declining' ? (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      ) : (
                        <div className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Class Strengths & Challenges */}
      <Card>
        <CardHeader>
          <CardTitle>Class Analysis</CardTitle>
          <CardDescription>Strengths and areas for improvement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-green-700 mb-2">Class Strengths</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">Critical Thinking</Badge>
                <Badge variant="secondary">Communication</Badge>
                <Badge variant="secondary">Engagement</Badge>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium text-sm text-orange-700 mb-2">Areas for Growth</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">Research Skills</Badge>
                <Badge variant="outline">Evidence Evaluation</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StudentDetailsTabProps {
  filteredStudents: StudentSummary[];
  filterBy: string;
  setFilterBy: (filter: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

function StudentDetailsTab({ 
  filteredStudents, 
  filterBy, 
  setFilterBy, 
  sortBy, 
  setSortBy 
}: StudentDetailsTabProps) {
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center space-x-4">
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students</SelectItem>
            <SelectItem value="high_performers">High Performers</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="improving">Improving</SelectItem>
            <SelectItem value="declining">Declining</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="quality">Quality Score</SelectItem>
            <SelectItem value="reflections">Reflections Count</SelectItem>
            <SelectItem value="recent_activity">Recent Activity</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary">
          {filteredStudents.length} students
        </Badge>
      </div>

      {/* Student List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredStudents.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
    </div>
  );
}

interface StudentCardProps {
  student: StudentSummary;
}

function StudentCard({ student }: StudentCardProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <div className="w-4 h-4" />;
    }
  };

  return (
    <Card className={getRiskColor(student.riskLevel)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium">{student.name}</h3>
            <p className="text-xs text-muted-foreground">{student.email}</p>
            <p className="text-xs text-muted-foreground">
              Last active: {student.lastActivity.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getTrendIcon(student.engagementTrend)}
            <Badge 
              variant={student.riskLevel === 'high' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {student.riskLevel} risk
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{Math.round(student.overallProgress * 100)}%</span>
          </div>
          <Progress value={student.overallProgress * 100} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
          <div>
            <span className="text-muted-foreground">Reflections</span>
            <p className="font-medium">{student.completedReflections}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Quality</span>
            <p className="font-medium">{Math.round(student.averageQuality * 100)}%</p>
          </div>
        </div>

        {student.strengths.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-green-700 mb-1">Strengths:</p>
            <div className="flex flex-wrap gap-1">
              {student.strengths.map((strength, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {student.needsAttention.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-orange-700 mb-1">Needs Work:</p>
            <div className="flex flex-wrap gap-1">
              {student.needsAttention.map((area, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          {student.riskLevel === 'high' && (
            <Button size="sm" variant="destructive">
              Take Action
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface PerformanceBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function PerformanceBar({ label, count, total, color }: PerformanceBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{count} ({Math.round(percentage)}%)</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Placeholder components for other tabs
function CompetenciesTab({ students }: { students: StudentSummary[] }) {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Competency Analysis</h3>
        <p className="text-sm text-muted-foreground">
          Detailed competency breakdown coming soon
        </p>
      </CardContent>
    </Card>
  );
}

function TrendsTab({ performanceTrends, timeframe }: { performanceTrends: any[]; timeframe: string }) {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Performance Trends</h3>
        <p className="text-sm text-muted-foreground">
          Interactive trend charts will be available in the next update
        </p>
      </CardContent>
    </Card>
  );
}
