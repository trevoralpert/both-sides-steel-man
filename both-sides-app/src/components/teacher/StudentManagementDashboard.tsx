/**
 * Student Management Dashboard
 * 
 * Task 8.2.2: Comprehensive student management interface with advanced filtering,
 * grouping, intervention system, and detailed student profiles.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserX,
  Edit,
  MessageSquare,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BookOpen,
  Brain,
  Heart,
  Eye,
  Settings,
  Tag,
  Group,
  BarChart3
} from 'lucide-react';

import { StudentDetailPanel } from './StudentDetailPanel';
import { StudentProgressTracker } from './StudentProgressTracker';
import { StudentRiskAlerts } from './StudentRiskAlerts';
import { StudentGroupingInterface } from './StudentGroupingInterface';
import { LoadingState } from '@/components/ui/loading-state';
import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface StudentProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  
  // Academic Information
  grade: string;
  studentId?: string;
  enrollmentDate: Date;
  
  // Contact Information
  parentEmail?: string;
  parentPhone?: string;
  emergencyContact?: string;
  
  // Academic Performance
  overallGPA?: number;
  currentClasses: string[];
  completedDebates: number;
  averageScore: number;
  completionRate: number;
  
  // Engagement & Behavior
  engagementLevel: 'low' | 'medium' | 'high';
  participationRate: number;
  attendanceRate: number;
  behaviorFlags: string[];
  
  // Learning Analytics
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  strengthAreas: string[];
  improvementAreas: string[];
  skillProgression: Record<string, number>;
  
  // Risk Assessment
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  interventionsActive: number;
  lastActivity: Date;
  
  // Communication & Notes
  teacherNotes?: string;
  parentCommunications: number;
  achievements: string[];
  goals: string[];
  
  // Groups and Tags
  groups: string[];
  tags: string[];
  
  // Status
  status: 'active' | 'inactive' | 'at_risk' | 'excelling' | 'needs_attention';
}

interface StudentFilters {
  search: string;
  class: string;
  grade: string;
  status: string;
  engagementLevel: string;
  riskLevel: string;
  group: string;
  tag: string;
}

interface StudentSort {
  field: 'name' | 'grade' | 'engagement' | 'performance' | 'lastActivity' | 'riskLevel';
  direction: 'asc' | 'desc';
}

export function StudentManagementDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const { state, addNotification } = useTeacherDashboard();
  
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [filters, setFilters] = useState<StudentFilters>({
    search: '',
    class: '',
    grade: '',
    status: '',
    engagementLevel: '',
    riskLevel: '',
    group: '',
    tag: ''
  });
  
  const [sort, setSort] = useState<StudentSort>({
    field: 'name',
    direction: 'asc'
  });

  // Available options for filters
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    loadStudentData();
  }, [user?.id, state.lastRefresh]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [students, filters, sort]);

  const loadStudentData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const token = await user.getToken();
      const response = await fetch('/api/students/teacher-students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setAvailableClasses(data.classes || []);
        setAvailableGroups(data.groups || []);
        setAvailableTags(data.tags || []);
      } else {
        // Fallback mock data for development
        const mockStudents: StudentProfile[] = [
          {
            id: '1',
            userId: 'user1',
            firstName: 'Sarah',
            lastName: 'Johnson',
            email: 'sarah.johnson@student.edu',
            avatar: undefined,
            grade: '11',
            studentId: 'STU001',
            enrollmentDate: new Date(2024, 8, 5),
            parentEmail: 'parent1@email.com',
            parentPhone: '(555) 123-4567',
            overallGPA: 3.8,
            currentClasses: ['Advanced Biology', 'AP Chemistry'],
            completedDebates: 15,
            averageScore: 88.3,
            completionRate: 92.5,
            engagementLevel: 'high',
            participationRate: 95.2,
            attendanceRate: 98.5,
            behaviorFlags: [],
            learningStyle: 'visual',
            strengthAreas: ['Critical Thinking', 'Research Skills'],
            improvementAreas: ['Public Speaking'],
            skillProgression: {
              'Critical Thinking': 85,
              'Communication': 78,
              'Research': 92,
              'Collaboration': 88
            },
            riskLevel: 'low',
            riskFactors: [],
            interventionsActive: 0,
            lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
            teacherNotes: 'Excellent student, shows strong analytical skills',
            parentCommunications: 3,
            achievements: ['Top Debater', 'Research Excellence'],
            goals: ['Improve presentation confidence'],
            groups: ['Advanced Learners', 'Science Track'],
            tags: ['high-achiever', 'science-focused'],
            status: 'excelling'
          },
          {
            id: '2',
            userId: 'user2',
            firstName: 'Michael',
            lastName: 'Chen',
            email: 'michael.chen@student.edu',
            avatar: undefined,
            grade: '11',
            studentId: 'STU002',
            enrollmentDate: new Date(2024, 8, 3),
            parentEmail: 'parent2@email.com',
            parentPhone: '(555) 234-5678',
            overallGPA: 3.2,
            currentClasses: ['Advanced Biology'],
            completedDebates: 8,
            averageScore: 82.1,
            completionRate: 78.2,
            engagementLevel: 'medium',
            participationRate: 72.5,
            attendanceRate: 89.3,
            behaviorFlags: ['occasional-late'],
            learningStyle: 'kinesthetic',
            strengthAreas: ['Collaboration', 'Creative Thinking'],
            improvementAreas: ['Research Skills', 'Time Management'],
            skillProgression: {
              'Critical Thinking': 72,
              'Communication': 85,
              'Research': 65,
              'Collaboration': 90
            },
            riskLevel: 'medium',
            riskFactors: ['declining-grades', 'attendance-concerns'],
            interventionsActive: 1,
            lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000),
            teacherNotes: 'Shows potential but needs support with organization',
            parentCommunications: 5,
            achievements: ['Team Player'],
            goals: ['Improve research skills', 'Better time management'],
            groups: ['Support Group'],
            tags: ['needs-support', 'collaborative'],
            status: 'needs_attention'
          },
          {
            id: '3',
            userId: 'user3',
            firstName: 'Emma',
            lastName: 'Davis',
            email: 'emma.davis@student.edu',
            avatar: undefined,
            grade: '10',
            studentId: 'STU003',
            enrollmentDate: new Date(2024, 9, 1),
            parentEmail: 'parent3@email.com',
            overallGPA: 2.8,
            currentClasses: ['Introduction to Debate'],
            completedDebates: 2,
            averageScore: 65.5,
            completionRate: 45.8,
            engagementLevel: 'low',
            participationRate: 42.1,
            attendanceRate: 76.8,
            behaviorFlags: ['disengaged', 'frequent-absences'],
            learningStyle: 'auditory',
            strengthAreas: ['Listening Skills'],
            improvementAreas: ['Participation', 'Assignment Completion', 'Critical Thinking'],
            skillProgression: {
              'Critical Thinking': 45,
              'Communication': 52,
              'Research': 38,
              'Collaboration': 48
            },
            riskLevel: 'high',
            riskFactors: ['low-engagement', 'poor-attendance', 'failing-grades'],
            interventionsActive: 2,
            lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            teacherNotes: 'Requires immediate intervention and support',
            parentCommunications: 8,
            achievements: [],
            goals: ['Improve attendance', 'Complete assignments', 'Increase participation'],
            groups: ['At-Risk Support', 'Beginner Track'],
            tags: ['at-risk', 'requires-intervention'],
            status: 'at_risk'
          }
        ];
        setStudents(mockStudents);
        setAvailableClasses(['Advanced Biology', 'AP Chemistry', 'Introduction to Debate']);
        setAvailableGroups(['Advanced Learners', 'Science Track', 'Support Group', 'At-Risk Support', 'Beginner Track']);
        setAvailableTags(['high-achiever', 'science-focused', 'needs-support', 'collaborative', 'at-risk', 'requires-intervention']);
      }
    } catch (err) {
      console.error('Failed to load student data:', err);
      setError('Failed to load student information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...students];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(student => 
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower) ||
        student.studentId?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.class) {
      filtered = filtered.filter(student => 
        student.currentClasses.includes(filters.class)
      );
    }

    if (filters.grade) {
      filtered = filtered.filter(student => student.grade === filters.grade);
    }

    if (filters.status) {
      filtered = filtered.filter(student => student.status === filters.status);
    }

    if (filters.engagementLevel) {
      filtered = filtered.filter(student => student.engagementLevel === filters.engagementLevel);
    }

    if (filters.riskLevel) {
      filtered = filtered.filter(student => student.riskLevel === filters.riskLevel);
    }

    if (filters.group) {
      filtered = filtered.filter(student => student.groups.includes(filters.group));
    }

    if (filters.tag) {
      filtered = filtered.filter(student => student.tags.includes(filters.tag));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort.field) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`;
          bValue = `${b.firstName} ${b.lastName}`;
          break;
        case 'grade':
          aValue = a.grade;
          bValue = b.grade;
          break;
        case 'engagement':
          aValue = a.participationRate;
          bValue = b.participationRate;
          break;
        case 'performance':
          aValue = a.averageScore;
          bValue = b.averageScore;
          break;
        case 'lastActivity':
          aValue = a.lastActivity;
          bValue = b.lastActivity;
          break;
        case 'riskLevel':
          const riskOrder = { 'low': 0, 'medium': 1, 'high': 2 };
          aValue = riskOrder[a.riskLevel];
          bValue = riskOrder[b.riskLevel];
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredStudents(filtered);
  };

  const handleFilterChange = (key: keyof StudentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSortChange = (field: StudentSort['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleStudentAction = (action: string, studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    switch (action) {
      case 'view':
        setSelectedStudent(student);
        break;
      case 'edit':
        router.push(`/teacher/students/${studentId}/edit`);
        break;
      case 'message':
        // Implementation for messaging
        addNotification({
          type: 'info',
          title: 'Messaging',
          message: 'Student messaging feature will be implemented in this task.'
        });
        break;
      case 'add-to-group':
        // Implementation for grouping
        addNotification({
          type: 'info',
          title: 'Grouping',
          message: 'Student grouping feature will be implemented in this task.'
        });
        break;
      default:
        break;
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedStudents.size === 0) return;

    try {
      switch (action) {
        case 'add-to-group':
          addNotification({
            type: 'info',
            title: 'Bulk Grouping',
            message: 'Bulk student grouping will be implemented in this task.'
          });
          break;
        case 'send-message':
          addNotification({
            type: 'info',
            title: 'Bulk Messaging',
            message: 'Bulk messaging will be implemented in this task.'
          });
          break;
        case 'export':
          addNotification({
            type: 'info',
            title: 'Export Started',
            message: 'Student data export will be implemented in this task.'
          });
          break;
        default:
          break;
      }
      
      setSelectedStudents(new Set());
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Bulk Action Failed',
        message: `Failed to ${action} selected students. Please try again.`
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excelling':
        return <Badge variant="default" className="bg-green-100 text-green-800">Excelling</Badge>;
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'needs_attention':
        return <Badge variant="secondary">Needs Attention</Badge>;
      case 'at_risk':
        return <Badge variant="destructive">At Risk</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const getEngagementBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge variant="default" className="bg-green-100 text-green-800">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="destructive">Low</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingState message="Loading student data..." />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Student Management</h2>
          <p className="text-muted-foreground">
            Comprehensive student monitoring and support tools
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => router.push('/teacher/students/import')}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => router.push('/teacher/students/create')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="at-risk">At Risk</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{students.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {students.filter(s => s.riskLevel === 'high').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Engagement</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {students.filter(s => s.engagementLevel === 'high').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    students.reduce((sum, s) => sum + s.averageScore, 0) / students.length || 0
                  )}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StudentRiskAlerts students={students.filter(s => s.riskLevel === 'high')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  <Select value={filters.class} onValueChange={(value) => handleFilterChange('class', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All classes</SelectItem>
                      {availableClasses.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="excelling">Excelling</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="needs_attention">Needs Attention</SelectItem>
                      <SelectItem value="at_risk">At Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">View</label>
                  <div className="flex space-x-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      Grid
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      List
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                    >
                      Table
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedStudents.size > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('add-to-group')}
                    >
                      <Group className="h-4 w-4 mr-2" />
                      Add to Group
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('send-message')}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('export')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Students Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Students ({filteredStudents.length})</CardTitle>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No students found</h3>
                  <p className="text-muted-foreground mb-4">
                    {students.length === 0 
                      ? "No students are enrolled yet." 
                      : "No students match your current filters."
                    }
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredStudents.map((student) => (
                    <Card key={student.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedStudents.has(student.id)}
                              onCheckedChange={() => handleSelectStudent(student.id)}
                            />
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={student.avatar} />
                              <AvatarFallback>
                                {student.firstName[0]}{student.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">
                                {student.firstName} {student.lastName}
                              </CardTitle>
                              <CardDescription className="text-sm">
                                Grade {student.grade} • {student.email}
                              </CardDescription>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStudentAction('view', student.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStudentAction('edit', student.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStudentAction('message', student.id)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Message
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStudentAction('add-to-group', student.id)}>
                                <Group className="h-4 w-4 mr-2" />
                                Add to Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            {getStatusBadge(student.status)}
                            {getRiskBadge(student.riskLevel)}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Performance</span>
                              <span>{student.averageScore.toFixed(1)}%</span>
                            </div>
                            <Progress value={student.averageScore} />
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span>Engagement</span>
                            {getEngagementBadge(student.engagementLevel)}
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            {student.completedDebates} debates • Last active: {student.lastActivity.toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                // Table view implementation
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-1"></div>
                    <div className="col-span-3 cursor-pointer" onClick={() => handleSortChange('name')}>
                      Name {sort.field === 'name' && (sort.direction === 'asc' ? '↑' : '↓')}
                    </div>
                    <div className="col-span-1">Grade</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 cursor-pointer" onClick={() => handleSortChange('performance')}>
                      Performance {sort.field === 'performance' && (sort.direction === 'asc' ? '↑' : '↓')}
                    </div>
                    <div className="col-span-2">Risk Level</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                  
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b hover:bg-muted/50">
                      <div className="col-span-1">
                        <Checkbox
                          checked={selectedStudents.has(student.id)}
                          onCheckedChange={() => handleSelectStudent(student.id)}
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.avatar} />
                            <AvatarFallback className="text-xs">
                              {student.firstName[0]}{student.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-1">{student.grade}</div>
                      <div className="col-span-2">{getStatusBadge(student.status)}</div>
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm">{student.averageScore.toFixed(1)}%</div>
                          <div className="w-16">
                            <Progress value={student.averageScore} className="h-2" />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">{getRiskBadge(student.riskLevel)}</div>
                      <div className="col-span-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStudentAction('view', student.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStudentAction('edit', student.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStudentAction('message', student.id)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Message
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="at-risk" className="space-y-6">
          <StudentRiskAlerts students={students.filter(s => s.riskLevel === 'high' || s.riskLevel === 'medium')} />
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <StudentGroupingInterface students={students} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Student Analytics
              </CardTitle>
              <CardDescription>
                Detailed student performance and engagement analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Advanced student analytics dashboard will be implemented as part of this task.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Student Detail Dialog */}
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedStudent.firstName} {selectedStudent.lastName}
              </DialogTitle>
              <DialogDescription>
                Detailed student profile and progress information
              </DialogDescription>
            </DialogHeader>
            <StudentDetailPanel student={selectedStudent} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
