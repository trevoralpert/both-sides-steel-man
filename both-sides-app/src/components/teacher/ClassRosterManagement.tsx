/**
 * Class Roster Management Component
 * 
 * Task 8.2.1: Student enrollment controls and roster management for classes.
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
  Upload
} from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface StudentEnrollment {
  id: string;
  userId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile?: {
      avatar?: string;
      grade?: string;
      parentEmail?: string;
      parentPhone?: string;
    };
  };
  enrollmentStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'DROPPED' | 'COMPLETED';
  enrolledAt: Date;
  lastActivity?: Date;
  completionRate?: number;
  averageScore?: number;
  debatesParticipated?: number;
  engagementLevel?: 'low' | 'medium' | 'high';
}

interface ClassRosterManagementProps {
  classId: string;
}

export function ClassRosterManagement({ classId }: ClassRosterManagementProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState<StudentEnrollment[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [engagementFilter, setEngagementFilter] = useState('');
  
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState('');

  useEffect(() => {
    loadRosterData();
  }, [classId, user?.id]);

  useEffect(() => {
    applyFilters();
  }, [enrollments, searchTerm, statusFilter, engagementFilter]);

  const loadRosterData = async () => {
    if (!user?.id || !classId) return;

    try {
      setLoading(true);
      setError(null);

      // TODO: Fix auth token handling
      // const token = await user.getToken();
      const response = await fetch(`/api/enrollments/class/${classId}`, {
        // headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEnrollments(data.enrollments || []);
      } else {
        // Fallback mock data for development
        const mockEnrollments: StudentEnrollment[] = [
          {
            id: '1',
            userId: 'user1',
            student: {
              id: 'user1',
              firstName: 'Sarah',
              lastName: 'Johnson',
              email: 'sarah.johnson@student.edu',
              profile: {
                avatar: undefined,
                grade: '11',
                parentEmail: 'parent1@email.com',
                parentPhone: '(555) 123-4567'
              }
            },
            enrollmentStatus: 'ACTIVE',
            enrolledAt: new Date(2024, 8, 5),
            lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
            completionRate: 92.5,
            averageScore: 88.3,
            debatesParticipated: 10,
            engagementLevel: 'high'
          },
          {
            id: '2',
            userId: 'user2',
            student: {
              id: 'user2',
              firstName: 'Michael',
              lastName: 'Chen',
              email: 'michael.chen@student.edu',
              profile: {
                avatar: undefined,
                grade: '11',
                parentEmail: 'parent2@email.com',
                parentPhone: '(555) 234-5678'
              }
            },
            enrollmentStatus: 'ACTIVE',
            enrolledAt: new Date(2024, 8, 3),
            lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000),
            completionRate: 78.2,
            averageScore: 82.1,
            debatesParticipated: 8,
            engagementLevel: 'medium'
          },
          {
            id: '3',
            userId: 'user3',
            student: {
              id: 'user3',
              firstName: 'Emma',
              lastName: 'Davis',
              email: 'emma.davis@student.edu',
              profile: {
                avatar: undefined,
                grade: '11',
                parentEmail: 'parent3@email.com'
              }
            },
            enrollmentStatus: 'PENDING',
            enrolledAt: new Date(2024, 9, 1),
            completionRate: 0,
            averageScore: 0,
            debatesParticipated: 0,
            engagementLevel: 'low'
          }
        ];
        setEnrollments(mockEnrollments);
      }
    } catch (err) {
      console.error('Failed to load roster data:', err);
      setError('Failed to load class roster. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...enrollments];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(enrollment => 
        enrollment.student.firstName.toLowerCase().includes(searchLower) ||
        enrollment.student.lastName.toLowerCase().includes(searchLower) ||
        enrollment.student.email.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(enrollment => enrollment.enrollmentStatus === statusFilter);
    }

    if (engagementFilter) {
      filtered = filtered.filter(enrollment => enrollment.engagementLevel === engagementFilter);
    }

    setFilteredEnrollments(filtered);
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
    if (selectedStudents.size === filteredEnrollments.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredEnrollments.map(e => e.userId)));
    }
  };

  const handleStudentAction = async (action: string, studentId: string) => {
    try {
      switch (action) {
        case 'activate':
          await updateEnrollmentStatus(studentId, 'ACTIVE');
          break;
        case 'deactivate':
          await updateEnrollmentStatus(studentId, 'INACTIVE');
          break;
        case 'drop':
          await updateEnrollmentStatus(studentId, 'DROPPED');
          break;
        case 'message':
          // Implementation for messaging
          addNotification({
            type: 'info',
            title: 'Messaging',
            message: 'Student messaging feature will be implemented in Task 8.2.2.',
            read: false
          });
          break;
        default:
          break;
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Action Failed',
        message: `Failed to ${action} student. Please try again.`,
        read: false
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedStudents.size === 0) return;

    try {
      switch (action) {
        case 'activate':
          await Promise.all(Array.from(selectedStudents).map(id => updateEnrollmentStatus(id, 'ACTIVE')));
          break;
        case 'deactivate':
          await Promise.all(Array.from(selectedStudents).map(id => updateEnrollmentStatus(id, 'INACTIVE')));
          break;
        case 'export':
          await exportStudentData(Array.from(selectedStudents));
          break;
        default:
          break;
      }
      
      setSelectedStudents(new Set());
      addNotification({
        type: 'success',
        title: 'Bulk Action Complete',
        message: `Successfully ${action}d ${selectedStudents.size} students.`,
        read: false
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Bulk Action Failed',
        message: `Failed to ${action} selected students. Please try again.`,
        read: false
      });
    }
  };

  const updateEnrollmentStatus = async (studentId: string, status: string) => {
    // Implementation will connect to API
    // For now, update local state
    setEnrollments(prev => 
      prev.map(enrollment => 
        enrollment.userId === studentId 
          ? { ...enrollment, enrollmentStatus: status as any }
          : enrollment
      )
    );
  };

  const exportStudentData = async (studentIds: string[]) => {
    // Implementation will generate export
    addNotification({
      type: 'info',
      title: 'Export Started',
      message: 'Student data export feature will be implemented in a future update.',
      read: false
    });
  };

  const handleAddStudent = async () => {
    if (!newStudentEmail.trim()) return;

    try {
      // TODO: Fix auth token handling
      // const token = await user.getToken();
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          // 'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          class_id: classId,
          user_email: newStudentEmail.trim()
        })
      });

      if (response.ok) {
        addNotification({
          type: 'success',
          title: 'Student Added',
          message: `Successfully enrolled ${newStudentEmail}`,
          read: false
        });
        setNewStudentEmail('');
        setShowAddStudentDialog(false);
        loadRosterData(); // Refresh data
      } else {
        throw new Error('Failed to enroll student');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Enrollment Failed',
        message: 'Failed to enroll student. Please check the email and try again.',
        read: false
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default">Active</Badge>;
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'DROPPED':
        return <Badge variant="destructive">Dropped</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEngagementBadge = (level?: string) => {
    if (!level) return null;
    
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
    return <LoadingState text="Loading class roster..." />;
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
      {/* Header and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Class Roster</h3>
          <p className="text-muted-foreground">
            Manage student enrollments and monitor participation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => {}}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Dialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Student to Class</DialogTitle>
                <DialogDescription>
                  Enter the student's email address to send an enrollment invitation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Student Email</label>
                  <Input
                    type="email"
                    placeholder="student@example.com"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddStudentDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddStudent}>
                    Add Student
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enrollments.filter(e => e.enrollmentStatus === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enrollments.filter(e => e.enrollmentStatus === 'PENDING').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                enrollments.reduce((sum, e) => sum + (e.completionRate || 0), 0) / 
                enrollments.filter(e => e.completionRate).length || 0
              )}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="DROPPED">Dropped</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={engagementFilter} onValueChange={setEngagementFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All engagement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All engagement</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
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
                  onClick={() => handleBulkAction('activate')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Deactivate
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

      {/* Student List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Students ({filteredEnrollments.length})</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedStudents.size === filteredEnrollments.length && filteredEnrollments.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-muted-foreground mb-4">
                {enrollments.length === 0 
                  ? "No students are enrolled in this class yet." 
                  : "No students match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div className="col-span-1"></div>
                <div className="col-span-3">Student</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Engagement</div>
                <div className="col-span-2">Completion</div>
                <div className="col-span-1">Debates</div>
                <div className="col-span-1">Actions</div>
              </div>
              
              {/* Student Rows */}
              {filteredEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b hover:bg-muted/50">
                  <div className="col-span-1">
                    <Checkbox
                      checked={selectedStudents.has(enrollment.userId)}
                      onCheckedChange={() => handleSelectStudent(enrollment.userId)}
                    />
                  </div>
                  <div className="col-span-3">
                    <div>
                      <div className="font-medium">
                        {enrollment.student.firstName} {enrollment.student.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {enrollment.student.email}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    {getStatusBadge(enrollment.enrollmentStatus)}
                  </div>
                  <div className="col-span-2">
                    {getEngagementBadge(enrollment.engagementLevel)}
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm">
                      {enrollment.completionRate?.toFixed(1)}%
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="text-sm">
                      {enrollment.debatesParticipated || 0}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStudentAction('message', enrollment.userId)}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStudentAction('activate', enrollment.userId)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Activate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStudentAction('deactivate', enrollment.userId)}>
                          <UserX className="h-4 w-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStudentAction('drop', enrollment.userId)}
                          className="text-red-600"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Drop
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
    </div>
  );
}
