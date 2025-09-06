/**
 * Phase 3 Task 3.3.4.2: Implement Completion Analytics for Educators
 * Class-level onboarding completion dashboard and student progress monitoring
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users,
  TrendingUp,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Search,
  Eye,
  MessageSquare,
  Bell,
  BookOpen,
  Award,
  Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// Analytics Types
interface StudentProgress {
  userId: string;
  userName: string;
  userEmail: string;
  classId: string;
  className: string;
  onboardingStatus: 'not_started' | 'in_progress' | 'completed' | 'stalled';
  progressPercentage: number;
  sectionsCompleted: number;
  totalSections: number;
  timeSpent: number;
  qualityScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
  lastActivity: Date;
  startDate: Date;
  completionDate?: Date;
  dropoffPoint?: string;
  needsSupport: boolean;
  certificatesEarned: number;
  currentStreak: number; // Days of consistent activity
}

interface ClassAnalytics {
  classId: string;
  className: string;
  teacherName: string;
  totalStudents: number;
  studentsStarted: number;
  studentsCompleted: number;
  averageProgress: number;
  averageQualityScore: number;
  averageCompletionTime: number;
  completionRate: number;
  dropoffRate: number;
  commonDropoffPoints: { section: string; count: number; percentage: number }[];
  engagementDistribution: { level: string; count: number; percentage: number }[];
  weeklyProgress: { week: string; completions: number; started: number }[];
  studentsNeedingSupport: number;
}

interface OnboardingAnalyticsDashboardProps {
  userRole: 'TEACHER' | 'ADMIN';
  classIds?: string[];
  onStudentSupportNeeded?: (student: StudentProgress) => void;
  className?: string;
}

export function OnboardingAnalyticsDashboard({
  userRole,
  classIds,
  onStudentSupportNeeded,
  className = ''
}: OnboardingAnalyticsDashboardProps) {
  const { getToken } = useAuth();
  
  // State Management
  const [classAnalytics, setClassAnalytics] = useState<ClassAnalytics[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [userRole, classIds]);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      // Mock data - in real implementation, this would come from backend APIs
      const mockClassAnalytics: ClassAnalytics[] = [
        {
          classId: 'class_1',
          className: 'AP Government & Politics',
          teacherName: 'Ms. Johnson',
          totalStudents: 28,
          studentsStarted: 26,
          studentsCompleted: 19,
          averageProgress: 78.5,
          averageQualityScore: 84.2,
          averageCompletionTime: 420000, // ~7 minutes
          completionRate: 67.9,
          dropoffRate: 25.0,
          commonDropoffPoints: [
            { section: 'expectations', count: 4, percentage: 15.4 },
            { section: 'how-it-works', count: 3, percentage: 11.5 },
            { section: 'privacy', count: 2, percentage: 7.7 }
          ],
          engagementDistribution: [
            { level: 'high', count: 12, percentage: 42.9 },
            { level: 'medium', count: 10, percentage: 35.7 },
            { level: 'low', count: 6, percentage: 21.4 }
          ],
          weeklyProgress: [
            { week: 'Week 1', completions: 8, started: 12 },
            { week: 'Week 2', completions: 6, started: 8 },
            { week: 'Week 3', completions: 5, started: 6 }
          ],
          studentsNeedingSupport: 4
        },
        {
          classId: 'class_2',
          className: 'Civics & Democracy',
          teacherName: 'Mr. Chen',
          totalStudents: 22,
          studentsStarted: 20,
          studentsCompleted: 17,
          averageProgress: 85.3,
          averageQualityScore: 79.8,
          averageCompletionTime: 380000, // ~6.3 minutes
          completionRate: 77.3,
          dropoffRate: 15.0,
          commonDropoffPoints: [
            { section: 'expectations', count: 2, percentage: 10.0 },
            { section: 'how-it-works', count: 1, percentage: 5.0 }
          ],
          engagementDistribution: [
            { level: 'high', count: 9, percentage: 40.9 },
            { level: 'medium', count: 8, percentage: 36.4 },
            { level: 'low', count: 5, percentage: 22.7 }
          ],
          weeklyProgress: [
            { week: 'Week 1', completions: 7, started: 10 },
            { week: 'Week 2', completions: 6, started: 6 },
            { week: 'Week 3', completions: 4, started: 4 }
          ],
          studentsNeedingSupport: 2
        }
      ];

      const mockStudentProgress: StudentProgress[] = [
        {
          userId: 'student_1',
          userName: 'Emma Rodriguez',
          userEmail: 'emma.rodriguez@school.edu',
          classId: 'class_1',
          className: 'AP Government & Politics',
          onboardingStatus: 'completed',
          progressPercentage: 100,
          sectionsCompleted: 5,
          totalSections: 5,
          timeSpent: 420000,
          qualityScore: 92,
          engagementLevel: 'high',
          lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          completionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          needsSupport: false,
          certificatesEarned: 3,
          currentStreak: 5
        },
        {
          userId: 'student_2',
          userName: 'Marcus Johnson',
          userEmail: 'marcus.johnson@school.edu',
          classId: 'class_1',
          className: 'AP Government & Politics',
          onboardingStatus: 'stalled',
          progressPercentage: 40,
          sectionsCompleted: 2,
          totalSections: 5,
          timeSpent: 180000,
          qualityScore: 65,
          engagementLevel: 'low',
          lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          dropoffPoint: 'how-it-works',
          needsSupport: true,
          certificatesEarned: 1,
          currentStreak: 0
        },
        {
          userId: 'student_3',
          userName: 'Sarah Kim',
          userEmail: 'sarah.kim@school.edu',
          classId: 'class_1',
          className: 'AP Government & Politics',
          onboardingStatus: 'in_progress',
          progressPercentage: 75,
          sectionsCompleted: 4,
          totalSections: 5,
          timeSpent: 340000,
          qualityScore: 88,
          engagementLevel: 'high',
          lastActivity: new Date(Date.now() - 6 * 60 * 60 * 1000),
          startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          needsSupport: false,
          certificatesEarned: 2,
          currentStreak: 3
        }
        // Add more mock students as needed
      ];

      setClassAnalytics(mockClassAnalytics);
      setStudentProgress(mockStudentProgress);

    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, userRole, classIds]);

  // Filter and search functions
  const filteredStudents = studentProgress.filter(student => {
    const matchesClass = selectedClass === 'all' || student.classId === selectedClass;
    const matchesStatus = filterStatus === 'all' || student.onboardingStatus === filterStatus;
    const matchesSearch = searchTerm === '' || 
      student.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesClass && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'stalled':
        return <Badge className="bg-red-100 text-red-800">Needs Support</Badge>;
      case 'not_started':
        return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const exportData = () => {
    // In real implementation, this would generate CSV/Excel export
    console.log('Exporting analytics data...', { classAnalytics, studentProgress });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <BarChart3 className="h-12 w-12 animate-pulse mx-auto text-blue-600" />
          <h3 className="text-lg font-semibold">Loading Analytics</h3>
          <p className="text-muted-foreground">Gathering student progress data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Onboarding Analytics</h2>
          <p className="text-muted-foreground">Monitor student progress and engagement</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={loadAnalyticsData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Class-Level Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {classAnalytics.map((analytics) => (
              <Card key={analytics.classId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{analytics.className}</CardTitle>
                  <p className="text-sm text-muted-foreground">{analytics.teacherName}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium ml-1">{analytics.totalStudents}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Started:</span>
                      <span className="font-medium ml-1">{analytics.studentsStarted}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="font-medium ml-1 text-green-600">{analytics.studentsCompleted}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Need Help:</span>
                      <span className="font-medium ml-1 text-red-600">{analytics.studentsNeedingSupport}</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completion Rate</span>
                      <span className="font-medium">{analytics.completionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={analytics.completionRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Avg. Progress</span>
                      <span className="font-medium">{analytics.averageProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={analytics.averageProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Weekly Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Weekly Progress Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classAnalytics[0] && (
                <div className="space-y-4">
                  {classAnalytics[0].weeklyProgress.map((week, index) => (
                    <div key={week.week} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{week.week}</span>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">Started: {week.started}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm">Completed: {week.completions}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-md bg-white"
                >
                  <option value="all">All Classes</option>
                  {classAnalytics.map((cls) => (
                    <option key={cls.classId} value={cls.classId}>
                      {cls.className}
                    </option>
                  ))}
                </select>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-md bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="stalled">Needs Support</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle>Student Progress ({filteredStudents.length} students)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div key={student.userId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{student.userName}</h4>
                        {getStatusBadge(student.onboardingStatus)}
                        {student.needsSupport && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Needs Support
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Progress: </span>
                          <span className="font-medium">{student.progressPercentage}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quality: </span>
                          <span className="font-medium">{student.qualityScore}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Engagement: </span>
                          <span className={`font-medium capitalize ${getEngagementColor(student.engagementLevel)}`}>
                            {student.engagementLevel}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time: </span>
                          <span className="font-medium">{formatTime(student.timeSpent)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <Progress value={student.progressPercentage} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {student.needsSupport && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onStudentSupportNeeded?.(student)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          {classAnalytics[0] && (
            <>
              {/* Common Dropoff Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Common Dropoff Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {classAnalytics[0].commonDropoffPoints.map((point, index) => (
                      <div key={point.section} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <div>
                          <h5 className="font-medium capitalize">{point.section.replace('-', ' ')}</h5>
                          <p className="text-sm text-muted-foreground">
                            {point.count} students dropped off here
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-amber-600">{point.percentage}%</div>
                          <Progress value={point.percentage} className="w-20 h-2 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Engagement Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classAnalytics[0].engagementDistribution.map((level) => (
                      <div key={level.level} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${
                            level.level === 'high' ? 'bg-green-500' :
                            level.level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span className="capitalize font-medium">{level.level} Engagement</span>
                          <span className="text-muted-foreground">({level.count} students)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={level.percentage} className="w-24 h-2" />
                          <span className="font-medium">{level.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-500" />
                Students Needing Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredStudents.filter(s => s.needsSupport).map((student) => (
                  <Alert key={student.userId} className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-red-800">{student.userName}</strong>
                          <p className="text-red-700 mt-1">
                            Stalled at {student.progressPercentage}% - Last active {' '}
                            {Math.ceil((Date.now() - student.lastActivity.getTime()) / (24 * 60 * 60 * 1000))} days ago
                            {student.dropoffPoint && ` (dropped off at: ${student.dropoffPoint})`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => onStudentSupportNeeded?.(student)}>
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Message
                          </Button>
                          <Button size="sm" variant="outline">
                            <Bell className="h-4 w-4 mr-1" />
                            Remind
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
                
                {filteredStudents.filter(s => s.needsSupport).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Great! No students currently need support.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
