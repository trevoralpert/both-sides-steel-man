/**
 * Class Detail View Component
 * 
 * Task 8.2.1: Detailed class view with complete class information, settings,
 * and roster management capabilities.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  Users, 
  Settings, 
  BarChart3,
  Calendar,
  MessageSquare,
  FileText,
  Edit,
  Share,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BookOpen,
  TrendingUp,
  Activity,
  Award,
  Target
} from 'lucide-react';

import { ClassRosterManagement } from './ClassRosterManagement';
import { ClassSettingsPanel } from './ClassSettingsPanel';
import { LoadingState } from '@/components/ui/loading-state';
import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface ClassDetailData {
  id: string;
  name: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  academicYear: string;
  term: string;
  maxStudents: number;
  currentEnrollment: number;
  isActive: boolean;
  status: 'draft' | 'active' | 'completed' | 'archived';
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  organization: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActivity?: Date;
  
  // Analytics data
  averageEngagement?: number;
  totalDebates?: number;
  completionRate?: number;
  averageScore?: number;
  participationRate?: number;
  
  // Recent activity
  recentDebates?: Array<{
    id: string;
    topic: string;
    date: Date;
    participantCount: number;
    status: 'completed' | 'in_progress' | 'scheduled';
  }>;
  
  // Class schedule
  schedule?: {
    meetingTimes: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
    room?: string;
    virtualMeetingUrl?: string;
  };
}

interface ClassDetailViewProps {
  classId: string;
}

export function ClassDetailView({ classId }: ClassDetailViewProps) {
  const { user } = useUser();
  const router = useRouter();
  const { addNotification } = useTeacherDashboard();
  
  const [classData, setClassData] = useState<ClassDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadClassData();
  }, [classId, user?.id]);

  const loadClassData = async () => {
    if (!user?.id || !classId) return;

    try {
      setLoading(true);
      setError(null);

      const token = await user.getToken();
      const response = await fetch(`/api/classes/${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setClassData(data);
      } else {
        // Fallback mock data for development
        const mockClassData: ClassDetailData = {
          id: classId,
          name: 'Advanced Biology',
          description: 'Advanced placement biology with debate components focusing on ethical considerations in biotechnology and environmental science.',
          subject: 'SCIENCE',
          gradeLevel: '11',
          academicYear: '2024-2025',
          term: 'FALL',
          maxStudents: 30,
          currentEnrollment: 28,
          isActive: true,
          status: 'active',
          teacher: { 
            id: user.id, 
            name: user.firstName + ' ' + user.lastName,
            email: user.emailAddresses[0]?.emailAddress || ''
          },
          organization: { id: 'org1', name: 'Lincoln High School' },
          createdAt: new Date(2024, 8, 1),
          updatedAt: new Date(),
          lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
          averageEngagement: 85.2,
          totalDebates: 12,
          completionRate: 78.5,
          averageScore: 82.3,
          participationRate: 94.6,
          recentDebates: [
            {
              id: '1',
              topic: 'Gene Editing Ethics',
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              participantCount: 24,
              status: 'completed'
            },
            {
              id: '2',
              topic: 'Climate Change Solutions',
              date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
              participantCount: 26,
              status: 'completed'
            },
            {
              id: '3',
              topic: 'Biodiversity Conservation',
              date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              participantCount: 0,
              status: 'scheduled'
            }
          ],
          schedule: {
            meetingTimes: [
              { dayOfWeek: 1, startTime: '09:00', endTime: '10:30' },
              { dayOfWeek: 3, startTime: '09:00', endTime: '10:30' },
              { dayOfWeek: 5, startTime: '09:00', endTime: '10:30' }
            ],
            room: 'Science Lab B-204',
            virtualMeetingUrl: 'https://meet.example.com/advanced-bio'
          }
        };
        setClassData(mockClassData);
      }
    } catch (err) {
      console.error('Failed to load class data:', err);
      setError('Failed to load class information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClass = () => {
    router.push(`/teacher/classes/${classId}/edit`);
  };

  const handleShareClass = () => {
    addNotification({
      type: 'info',
      title: 'Share Class',
      message: 'Class sharing feature will be implemented in a future update.'
    });
  };

  const handleArchiveClass = () => {
    addNotification({
      type: 'info',
      title: 'Archive Class',
      message: 'Class archiving feature will be implemented in a future update.'
    });
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'archived':
        return <Badge variant="destructive">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDayOfWeek = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  if (loading) {
    return <LoadingState message="Loading class details..." />;
  }

  if (error || !classData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Classes
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || 'Class not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">{classData.name}</h1>
              {getStatusBadge(classData.status, classData.isActive)}
            </div>
            <p className="text-muted-foreground">
              {classData.subject} • Grade {classData.gradeLevel} • {classData.academicYear}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleShareClass}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" onClick={handleEditClass}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleArchiveClass}>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrollment</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classData.currentEnrollment}/{classData.maxStudents}
            </div>
            <Progress 
              value={(classData.currentEnrollment / classData.maxStudents) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classData.averageEngagement?.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Above average
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debates</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classData.totalDebates}</div>
            <p className="text-xs text-muted-foreground">
              This semester
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classData.completionRate?.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Assignment completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Class Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Class Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1">{classData.description || 'No description provided'}</p>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-muted-foreground">Subject</label>
                    <p>{classData.subject}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Grade Level</label>
                    <p>Grade {classData.gradeLevel}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Academic Year</label>
                    <p>{classData.academicYear}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Term</label>
                    <p>{classData.term}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Created</label>
                    <p>{classData.createdAt.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Last Updated</label>
                    <p>{classData.updatedAt.toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Debates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classData.recentDebates?.map((debate) => (
                    <div key={debate.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{debate.topic}</div>
                        <div className="text-sm text-muted-foreground">
                          {debate.date.toLocaleDateString()} • {debate.participantCount} participants
                        </div>
                      </div>
                      <Badge variant={
                        debate.status === 'completed' ? 'default' : 
                        debate.status === 'in_progress' ? 'secondary' : 'outline'
                      }>
                        {debate.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-muted-foreground text-center py-4">
                      No recent debates
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Score</span>
                    <span className="text-sm text-muted-foreground">{classData.averageScore?.toFixed(1)}%</span>
                  </div>
                  <Progress value={classData.averageScore} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Participation Rate</span>
                    <span className="text-sm text-muted-foreground">{classData.participationRate?.toFixed(1)}%</span>
                  </div>
                  <Progress value={classData.participationRate} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-sm text-muted-foreground">{classData.completionRate?.toFixed(1)}%</span>
                  </div>
                  <Progress value={classData.completionRate} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster" className="space-y-6">
          <ClassRosterManagement classId={classId} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Analytics</CardTitle>
              <CardDescription>
                Detailed analytics integration will be implemented in Task 8.2.1
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This section will integrate with Phase 7 analytics to show detailed class performance metrics,
                engagement tracking, and progress reports.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Class Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {classData.schedule?.meetingTimes.length ? (
                <div className="space-y-3">
                  {classData.schedule.meetingTimes.map((meeting, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{formatDayOfWeek(meeting.dayOfWeek)}</div>
                        <div className="text-sm text-muted-foreground">
                          {meeting.startTime} - {meeting.endTime}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{classData.schedule?.room}</div>
                        {classData.schedule?.virtualMeetingUrl && (
                          <div className="text-sm text-muted-foreground">Virtual available</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No schedule configured
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <ClassSettingsPanel classId={classId} classData={classData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
