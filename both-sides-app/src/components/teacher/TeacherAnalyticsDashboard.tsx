/**
 * Teacher Analytics Dashboard
 * 
 * Task 7.5.2: Main dashboard component for teachers to monitor class performance,
 * manage student progress, and access comprehensive analytics and reporting tools.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  BarChart3, 
  Calendar, 
  Clock,
  Star,
  Target,
  MessageSquare,
  FileText,
  Download,
  Settings,
  RefreshCw,
  Filter,
  Eye,
  Bell,
  BookOpen,
  Award,
  Brain,
  Heart,
  Zap
} from 'lucide-react';

import { ClassPerformanceDashboard } from './ClassPerformanceDashboard';
import { StudentRiskAssessment } from './StudentRiskAssessment';
import { ReflectionReviewInterface } from './ReflectionReviewInterface';
import { EngagementHeatMaps } from './EngagementHeatMaps';
import { ReportGenerator } from './ReportGenerator';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';

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

interface ReflectionSummary {
  id: string;
  studentName: string;
  studentId: string;
  debateTitle: string;
  submittedAt: Date;
  reviewStatus: 'pending' | 'reviewed' | 'needs_revision';
  qualityScore: number;
  wordCount: number;
  timeSpent: number;
  teacherPriority: 'high' | 'medium' | 'low';
}

interface TeacherDashboardData {
  selectedClass: ClassOverview | null;
  availableClasses: ClassOverview[];
  students: StudentSummary[];
  pendingReflections: ReflectionSummary[];
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
    studentId?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  insights: Array<{
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
    actionable: boolean;
    students?: string[];
  }>;
}

export function TeacherAnalyticsDashboard() {
  const { user } = useUser();
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id, selectedClassId]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch teacher's classes and analytics data
      const [classesResponse, studentsResponse, reflectionsResponse] = await Promise.all([
        fetch('/api/classes/teacher-classes', {
          headers: { 'Authorization': `Bearer ${await user.getToken()}` }
        }),
        selectedClassId ? fetch(`/api/performance-analytics/class/${selectedClassId}`, {
          headers: { 'Authorization': `Bearer ${await user.getToken()}` }
        }) : Promise.resolve({ ok: true, json: () => ({ students: [] }) }),
        fetch('/api/reflections/teacher/pending', {
          headers: { 'Authorization': `Bearer ${await user.getToken()}` }
        })
      ]);

      if (!classesResponse.ok) {
        throw new Error('Failed to fetch classes');
      }

      const [classesData, studentsData, reflectionsData] = await Promise.all([
        classesResponse.json(),
        studentsResponse.ok ? studentsResponse.json() : { students: [] },
        reflectionsResponse.ok ? reflectionsResponse.json() : { reflections: [] }
      ]);

      // Transform and combine data
      const selectedClass = selectedClassId 
        ? classesData.classes?.find((c: any) => c.id === selectedClassId) || null
        : null;

      setDashboardData({
        selectedClass: selectedClass ? {
          classId: selectedClass.id,
          className: selectedClass.name,
          totalStudents: selectedClass.enrollmentCount || 0,
          activeStudents: studentsData.students?.length || 0,
          averageEngagement: 0.75, // Mock data
          completionRate: 0.82, // Mock data
          overallClassAverage: 0.78, // Mock data
          lastActivity: new Date(),
          upcomingDeadlines: 3
        } : null,
        availableClasses: classesData.classes?.map((c: any) => ({
          classId: c.id,
          className: c.name,
          totalStudents: c.enrollmentCount || 0,
          activeStudents: Math.floor((c.enrollmentCount || 0) * 0.9),
          averageEngagement: 0.75,
          completionRate: 0.82,
          overallClassAverage: 0.78,
          lastActivity: new Date(),
          upcomingDeadlines: Math.floor(Math.random() * 5)
        })) || [],
        students: generateMockStudentData(studentsData.students || []),
        pendingReflections: generateMockReflectionData(reflectionsData.reflections || []),
        recentActivity: generateMockActivityData(),
        insights: generateMockInsights()
      });

      // Auto-select first class if none selected
      if (!selectedClassId && classesData.classes?.length > 0) {
        setSelectedClassId(classesData.classes[0].id);
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const generateMockStudentData = (students: any[]): StudentSummary[] => {
    // Generate realistic mock data for demo purposes
    return Array.from({ length: 12 }, (_, i) => ({
      id: `student-${i + 1}`,
      name: `Student ${i + 1}`,
      email: `student${i + 1}@school.edu`,
      overallProgress: Math.random() * 0.6 + 0.3,
      lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      completedReflections: Math.floor(Math.random() * 8) + 2,
      averageQuality: Math.random() * 0.4 + 0.6,
      riskLevel: Math.random() > 0.8 ? 'high' : Math.random() > 0.6 ? 'medium' : 'low',
      strengths: ['Critical Thinking', 'Communication'].slice(0, Math.floor(Math.random() * 2) + 1),
      needsAttention: ['Research Skills', 'Empathy'].slice(0, Math.floor(Math.random() * 2)),
      engagementTrend: Math.random() > 0.6 ? 'improving' : Math.random() > 0.3 ? 'stable' : 'declining'
    }));
  };

  const generateMockReflectionData = (reflections: any[]): ReflectionSummary[] => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `reflection-${i + 1}`,
      studentName: `Student ${i + 1}`,
      studentId: `student-${i + 1}`,
      debateTitle: `Debate Topic ${i + 1}`,
      submittedAt: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
      reviewStatus: Math.random() > 0.7 ? 'reviewed' : Math.random() > 0.3 ? 'pending' : 'needs_revision',
      qualityScore: Math.random() * 0.4 + 0.6,
      wordCount: Math.floor(Math.random() * 500) + 200,
      timeSpent: Math.floor(Math.random() * 30) + 15,
      teacherPriority: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
    }));
  };

  const generateMockActivityData = () => {
    return Array.from({ length: 8 }, (_, i) => ({
      type: ['reflection_submitted', 'debate_completed', 'milestone_achieved'][Math.floor(Math.random() * 3)],
      description: `Student activity ${i + 1}`,
      timestamp: new Date(Date.now() - i * 2 * 60 * 60 * 1000),
      studentId: `student-${Math.floor(Math.random() * 5) + 1}`,
      priority: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
    }));
  };

  const generateMockInsights = () => {
    return [
      {
        type: 'warning' as const,
        title: 'Students Need Attention',
        description: '3 students showing declining engagement patterns',
        actionable: true,
        students: ['student-1', 'student-2', 'student-3']
      },
      {
        type: 'success' as const,
        title: 'Improved Performance',
        description: 'Class average increased by 12% this month',
        actionable: false
      },
      {
        type: 'info' as const,
        title: 'Pending Reviews',
        description: '6 reflections awaiting teacher review',
        actionable: true
      }
    ];
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchDashboardData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor student progress and class performance
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {dashboardData.availableClasses.map((classInfo) => (
                  <SelectItem key={classInfo.classId} value={classInfo.classId}>
                    {classInfo.className} ({classInfo.totalStudents} students)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Class Overview Cards */}
        {dashboardData.selectedClass && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Students"
              value={dashboardData.selectedClass.totalStudents.toString()}
              change={+2}
              icon={<Users className="h-4 w-4" />}
              description="enrolled in class"
            />
            <StatsCard
              title="Avg Performance"
              value={`${Math.round(dashboardData.selectedClass.overallClassAverage * 100)}%`}
              change={+5.2}
              icon={<BarChart3 className="h-4 w-4" />}
              description="vs last month"
            />
            <StatsCard
              title="Completion Rate"
              value={`${Math.round(dashboardData.selectedClass.completionRate * 100)}%`}
              change={+1.3}
              icon={<CheckCircle2 className="h-4 w-4" />}
              description="assignments completed"
            />
            <StatsCard
              title="Engagement"
              value={`${Math.round(dashboardData.selectedClass.averageEngagement * 100)}%`}
              change={-0.5}
              icon={<Heart className="h-4 w-4" />}
              description="average engagement"
            />
          </div>
        )}

        {/* Insights and Alerts */}
        {dashboardData.insights.length > 0 && (
          <div className="space-y-3">
            {dashboardData.insights.map((insight, index) => (
              <Alert key={index} variant={insight.type === 'warning' ? 'destructive' : 'default'}>
                {insight.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                {insight.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                {insight.type === 'info' && <Bell className="h-4 w-4" />}
                <AlertTitle>{insight.title}</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{insight.description}</span>
                  {insight.actionable && (
                    <Button variant="outline" size="sm">
                      Take Action
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="reflections">Reflections</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab dashboardData={dashboardData} />
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <StudentRiskAssessment 
              students={dashboardData.students} 
              classId={selectedClassId}
            />
          </TabsContent>

          <TabsContent value="reflections" className="space-y-6">
            <ReflectionReviewInterface 
              reflections={dashboardData.pendingReflections}
              classId={selectedClassId}
            />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <ClassPerformanceDashboard 
              classData={dashboardData.selectedClass}
              students={dashboardData.students}
            />
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <EngagementHeatMaps 
              students={dashboardData.students}
              classId={selectedClassId}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportGenerator 
              classData={dashboardData.selectedClass}
              students={dashboardData.students}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}

interface StatsCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  description: string;
}

function StatsCard({ title, value, change, icon, description }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          {change !== undefined && (
            <>
              {change > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={change > 0 ? 'text-green-500' : 'text-red-500'}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            </>
          )}
          <span>{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface OverviewTabProps {
  dashboardData: TeacherDashboardData;
}

function OverviewTab({ dashboardData }: OverviewTabProps) {
  const highRiskStudents = dashboardData.students.filter(s => s.riskLevel === 'high');
  const pendingHighPriorityReflections = dashboardData.pendingReflections.filter(r => r.teacherPriority === 'high');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Priority Items */}
      <div className="lg:col-span-2 space-y-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Latest student activities and submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border">
                    <div className={`p-2 rounded-full ${
                      activity.priority === 'high' ? 'bg-red-100 text-red-600' :
                      activity.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge variant={
                      activity.priority === 'high' ? 'destructive' :
                      activity.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {activity.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Pending High Priority Reflections */}
        {pendingHighPriorityReflections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>High Priority Reviews</span>
                <Badge variant="destructive">{pendingHighPriorityReflections.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingHighPriorityReflections.map((reflection) => (
                  <div key={reflection.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50">
                    <div>
                      <h4 className="font-medium text-sm">{reflection.studentName}</h4>
                      <p className="text-xs text-muted-foreground">{reflection.debateTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {reflection.submittedAt.toLocaleString()}
                      </p>
                    </div>
                    <Button size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Summary & Quick Actions */}
      <div className="space-y-6">
        {/* Students At Risk */}
        {highRiskStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Students At Risk</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {highRiskStudents.slice(0, 3).map((student) => (
                  <div key={student.id} className="p-3 rounded-lg border border-orange-200 bg-orange-50">
                    <h4 className="font-medium text-sm">{student.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Last active: {student.lastActivity.toLocaleDateString()}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs">Progress: {Math.round(student.overallProgress * 100)}%</span>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              Review Reflections ({dashboardData.pendingReflections.length})
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Class Settings
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </CardContent>
        </Card>

        {/* Class Performance Summary */}
        {dashboardData.selectedClass && (
          <Card>
            <CardHeader>
              <CardTitle>Class Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Average Performance</span>
                  <span>{Math.round(dashboardData.selectedClass.overallClassAverage * 100)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${dashboardData.selectedClass.overallClassAverage * 100}%` }}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-600">
                    {dashboardData.students.filter(s => s.riskLevel === 'low').length}
                  </div>
                  <div className="text-xs text-muted-foreground">On Track</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-orange-600">
                    {highRiskStudents.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Need Help</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 bg-muted rounded mb-2" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-48 bg-muted rounded" />
          <div className="h-10 w-24 bg-muted rounded" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-3 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="h-6 w-48 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 w-full bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 w-full bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper function
function getActivityIcon(type: string) {
  switch (type) {
    case 'reflection_submitted': return <MessageSquare className="h-4 w-4" />;
    case 'debate_completed': return <Users className="h-4 w-4" />;
    case 'milestone_achieved': return <Award className="h-4 w-4" />;
    default: return <Bell className="h-4 w-4" />;
  }
}
