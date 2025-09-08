/**
 * Student Data Management Component
 * 
 * Task 8.2.2: Student profile editing tools, account status management,
 * and bulk operations with safety confirmations
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
  User,
  Edit,
  Save,
  X,
  Trash2,
  Archive,
  UserCheck,
  UserX,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Settings,
  Download,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RotateCcw,
  FileText,
  Mail,
  Phone,
  Calendar,
  Tag,
  Group,
  Database
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Types
interface StudentProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  grade: string;
  studentId?: string;
  enrollmentDate: Date;
  parentEmail?: string;
  parentPhone?: string;
  emergencyContact?: string;
  overallGPA?: number;
  currentClasses: string[];
  completedDebates: number;
  averageScore: number;
  completionRate: number;
  engagementLevel: 'low' | 'medium' | 'high';
  participationRate: number;
  attendanceRate: number;
  behaviorFlags: string[];
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  strengthAreas: string[];
  improvementAreas: string[];
  skillProgression: Record<string, number>;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  interventionsActive: number;
  lastActivity: Date;
  teacherNotes?: string;
  parentCommunications: number;
  achievements: string[];
  goals: string[];
  groups: string[];
  tags: string[];
  status: 'active' | 'inactive' | 'suspended' | 'archived' | 'graduated';
  accountStatus: 'pending' | 'active' | 'suspended' | 'locked' | 'disabled';
  lastLogin?: Date;
  dataConsent: boolean;
  parentalConsent: boolean;
}

interface BulkOperation {
  id: string;
  type: 'status_change' | 'group_assignment' | 'tag_assignment' | 'archive' | 'delete' | 'export';
  selectedStudents: string[];
  parameters?: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  completedTime?: Date;
  errors?: string[];
}

interface StudentDataManagementProps {
  students?: StudentProfile[];
  onUpdateStudent?: (student: StudentProfile) => void;
  onBulkOperation?: (operation: BulkOperation) => void;
}

export function StudentDataManagement({
  students = [],
  onUpdateStudent,
  onBulkOperation
}: StudentDataManagementProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('edit');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [bulkOperations, setBulkOperations] = useState<BulkOperation[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<BulkOperation | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form state for student editing
  const [editForm, setEditForm] = useState<Partial<StudentProfile>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  
  // Bulk operation state
  const [bulkOperationType, setBulkOperationType] = useState<BulkOperation['type']>('status_change');
  const [bulkOperationParams, setBulkOperationParams] = useState<Record<string, any>>({});

  useEffect(() => {
    loadBulkOperations();
  }, [user?.id]);

  const loadBulkOperations = async () => {
    // Mock data for development
    const mockOperations: BulkOperation[] = [
      {
        id: '1',
        type: 'status_change',
        selectedStudents: ['student1', 'student2'],
        parameters: { newStatus: 'active' },
        status: 'completed',
        progress: 100,
        startTime: new Date(Date.now() - 60 * 60 * 1000),
        completedTime: new Date(Date.now() - 55 * 60 * 1000)
      },
      {
        id: '2',
        type: 'group_assignment',
        selectedStudents: ['student3', 'student4', 'student5'],
        parameters: { groupName: 'Advanced Learners' },
        status: 'in_progress',
        progress: 60,
        startTime: new Date(Date.now() - 10 * 60 * 1000)
      }
    ];
    setBulkOperations(mockOperations);
  };

  const handleEditStudent = (student: StudentProfile) => {
    setEditingStudent(student);
    setEditForm({ ...student });
    setEditErrors({});
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editForm.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!editForm.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!editForm.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      errors.email = 'Invalid email format';
    }
    if (!editForm.grade?.trim()) {
      errors.grade = 'Grade is required';
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveStudent = async () => {
    if (!validateEditForm() || !editingStudent) return;

    try {
      setLoading(true);
      const updatedStudent: StudentProfile = {
        ...editingStudent,
        ...editForm,
        firstName: editForm.firstName!,
        lastName: editForm.lastName!,
        email: editForm.email!,
        grade: editForm.grade!
      };

      onUpdateStudent?.(updatedStudent);
      setEditingStudent(null);
      setEditForm({});

      addNotification({
        type: 'success',
        title: 'Student Updated',
        message: `${updatedStudent.firstName} ${updatedStudent.lastName}'s profile has been updated.`,
        read: false
      });

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update student profile. Please try again.',
        read: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountStatusChange = async (studentId: string, newStatus: StudentProfile['accountStatus']) => {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const updatedStudent: StudentProfile = {
        ...student,
        accountStatus: newStatus
      };

      onUpdateStudent?.(updatedStudent);

      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `${student.firstName} ${student.lastName}'s account status changed to ${newStatus}.`,
        read: false
      });

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Status Change Failed',
        message: 'Failed to update account status. Please try again.',
        read: false
      });
    }
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
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const handleBulkOperation = (type: BulkOperation['type'], parameters: Record<string, any> = {}) => {
    if (selectedStudents.size === 0) {
      addNotification({
        type: 'error',
        title: 'No Selection',
        message: 'Please select students for the bulk operation.',
        read: false
      });
      return;
    }

    const operation: BulkOperation = {
      id: Date.now().toString(),
      type,
      selectedStudents: Array.from(selectedStudents),
      parameters,
      status: 'pending',
      progress: 0
    };

    setPendingOperation(operation);
    setShowConfirmDialog(true);
  };

  const confirmBulkOperation = async () => {
    if (!pendingOperation) return;

    try {
      const operation = {
        ...pendingOperation,
        status: 'in_progress' as const,
        startTime: new Date()
      };

      setBulkOperations(prev => [operation, ...prev]);
      onBulkOperation?.(operation);

      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        setBulkOperations(prev => 
          prev.map(op => 
            op.id === operation.id 
              ? { ...op, progress }
              : op
          )
        );

        if (progress >= 100) {
          clearInterval(progressInterval);
          setBulkOperations(prev => 
            prev.map(op => 
              op.id === operation.id 
                ? { 
                    ...op, 
                    status: 'completed' as const, 
                    progress: 100,
                    completedTime: new Date()
                  }
                : op
            )
          );
          
          addNotification({
            type: 'success',
            title: 'Bulk Operation Complete',
            message: `Successfully processed ${selectedStudents.size} students.`,
            read: false
          });
        }
      }, 500);

      setSelectedStudents(new Set());
      setShowConfirmDialog(false);
      setPendingOperation(null);

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Bulk Operation Failed',
        message: 'Failed to complete bulk operation. Please try again.',
        read: false
      });
    }
  };

  const getStatusColor = (status: StudentProfile['accountStatus']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'locked':
        return 'bg-orange-100 text-orange-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: StudentProfile['accountStatus']) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'suspended':
        return <UserX className="h-4 w-4" />;
      case 'locked':
        return <Lock className="h-4 w-4" />;
      case 'disabled':
        return <EyeOff className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getBulkOperationStatusColor = (status: BulkOperation['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Student Data Management</h3>
          <p className="text-sm text-muted-foreground">
            Edit student profiles, manage account status, and perform bulk operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {students.length} students
          </Badge>
          {selectedStudents.size > 0 && (
            <Badge variant="default">
              {selectedStudents.size} selected
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="edit">Profile Editing</TabsTrigger>
          <TabsTrigger value="status">Account Status</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="history">Operation History</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit className="h-5 w-5 mr-2" />
                Student Profile Editing
              </CardTitle>
              <CardDescription>
                Edit individual student profiles and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No students found</h3>
                  <p className="text-muted-foreground">
                    No students available for editing
                  </p>
                </div>
              ) : editingStudent ? (
                <div className="space-y-6">
                  {/* Student being edited */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={editingStudent.avatar} />
                        <AvatarFallback>
                          {editingStudent.firstName[0]}{editingStudent.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">
                          Editing: {editingStudent.firstName} {editingStudent.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Student ID: {editingStudent.studentId} • Grade {editingStudent.grade}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingStudent(null);
                        setEditForm({});
                        setEditErrors({});
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>

                  {/* Edit form */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">First Name *</label>
                        <Input
                          value={editForm.firstName || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                          className={editErrors.firstName ? 'border-red-500' : ''}
                        />
                        {editErrors.firstName && (
                          <p className="text-sm text-red-500">{editErrors.firstName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Last Name *</label>
                        <Input
                          value={editForm.lastName || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                          className={editErrors.lastName ? 'border-red-500' : ''}
                        />
                        {editErrors.lastName && (
                          <p className="text-sm text-red-500">{editErrors.lastName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email *</label>
                        <Input
                          type="email"
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          className={editErrors.email ? 'border-red-500' : ''}
                        />
                        {editErrors.email && (
                          <p className="text-sm text-red-500">{editErrors.email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Grade *</label>
                        <Input
                          value={editForm.grade || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, grade: e.target.value }))}
                          className={editErrors.grade ? 'border-red-500' : ''}
                        />
                        {editErrors.grade && (
                          <p className="text-sm text-red-500">{editErrors.grade}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Student ID</label>
                        <Input
                          value={editForm.studentId || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, studentId: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Parent Email</label>
                        <Input
                          type="email"
                          value={editForm.parentEmail || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, parentEmail: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Parent Phone</label>
                        <Input
                          type="tel"
                          value={editForm.parentPhone || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, parentPhone: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Emergency Contact</label>
                        <Input
                          value={editForm.emergencyContact || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, emergencyContact: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Learning Style</label>
                        <Select 
                          value={editForm.learningStyle || ''} 
                          onValueChange={(value: any) => setEditForm(prev => ({ ...prev, learningStyle: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select learning style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visual">Visual</SelectItem>
                            <SelectItem value="auditory">Auditory</SelectItem>
                            <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
                            <SelectItem value="mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Teacher Notes</label>
                        <Textarea
                          value={editForm.teacherNotes || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, teacherNotes: e.target.value }))}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Consent toggles */}
                  <div className="space-y-4">
                    <Separator />
                    <h4 className="font-medium">Consent & Permissions</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="dataConsent"
                          checked={editForm.dataConsent ?? false}
                          onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, dataConsent: checked }))}
                        />
                        <label htmlFor="dataConsent" className="text-sm font-medium">
                          Data Collection Consent
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="parentalConsent"
                          checked={editForm.parentalConsent ?? false}
                          onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, parentalConsent: checked }))}
                        />
                        <label htmlFor="parentalConsent" className="text-sm font-medium">
                          Parental Consent
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingStudent(null);
                        setEditForm({});
                        setEditErrors({});
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveStudent} disabled={loading}>
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </div>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => (
                    <Card key={student.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={student.avatar} />
                              <AvatarFallback>
                                {student.firstName[0]}{student.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium">
                                {student.firstName} {student.lastName}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {student.email} • Grade {student.grade}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge className={getStatusColor(student.accountStatus)}>
                                  {getStatusIcon(student.accountStatus)}
                                  <span className="ml-1 capitalize">{student.accountStatus}</span>
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button onClick={() => handleEditStudent(student)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Account Status Management
              </CardTitle>
              <CardDescription>
                Manage student account statuses and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {students.map((student) => (
                  <Card key={student.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={student.avatar} />
                            <AvatarFallback>
                              {student.firstName[0]}{student.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">
                              {student.firstName} {student.lastName}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Last login: {student.lastLogin?.toLocaleDateString() || 'Never'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(student.accountStatus)}>
                            {getStatusIcon(student.accountStatus)}
                            <span className="ml-1 capitalize">{student.accountStatus}</span>
                          </Badge>
                          <Select
                            value={student.accountStatus}
                            onValueChange={(value: any) => handleAccountStatusChange(student.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="locked">Locked</SelectItem>
                              <SelectItem value="disabled">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Bulk Operations
              </CardTitle>
              <CardDescription>
                Perform operations on multiple students simultaneously
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Student selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Select Students</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedStudents.size === students.length && students.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">Select All</span>
                  </div>
                </div>
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center space-x-3 p-2 border rounded">
                      <Checkbox
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={() => handleSelectStudent(student.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback className="text-xs">
                          {student.firstName[0]}{student.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.email}
                        </p>
                      </div>
                      <Badge className={getStatusColor(student.accountStatus)}>
                        {student.accountStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Bulk operation controls */}
              <div className="space-y-4">
                <h4 className="font-medium">Bulk Operations</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => handleBulkOperation('status_change', { newStatus: 'active' })}
                    disabled={selectedStudents.size === 0}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate Selected
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleBulkOperation('status_change', { newStatus: 'suspended' })}
                    disabled={selectedStudents.size === 0}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Suspend Selected
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleBulkOperation('archive')}
                    disabled={selectedStudents.size === 0}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Selected
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleBulkOperation('export')}
                    disabled={selectedStudents.size === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Operation History
              </CardTitle>
              <CardDescription>
                Track bulk operations and their progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bulkOperations.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No operations yet</h3>
                  <p className="text-muted-foreground">
                    Bulk operations will appear here once they start
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bulkOperations.map((operation) => (
                    <Card key={operation.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium capitalize">
                                {operation.type.replace('_', ' ')}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {operation.selectedStudents.length} students • Started {operation.startTime?.toLocaleString()}
                              </p>
                            </div>
                            <Badge className={getBulkOperationStatusColor(operation.status)}>
                              {operation.status}
                            </Badge>
                          </div>
                          
                          {operation.status === 'in_progress' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Progress</span>
                                <span>{operation.progress}%</span>
                              </div>
                              <Progress value={operation.progress} />
                            </div>
                          )}
                          
                          {operation.completedTime && (
                            <p className="text-sm text-muted-foreground">
                              Completed: {operation.completedTime.toLocaleString()}
                            </p>
                          )}
                          
                          {operation.errors && operation.errors.length > 0 && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                {operation.errors.length} error(s) occurred during this operation
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Operation</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingOperation && (
                <div className="space-y-2">
                  <p>
                    You are about to perform a <strong>{pendingOperation.type.replace('_', ' ')}</strong> operation
                    on <strong>{pendingOperation.selectedStudents.length}</strong> selected students.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone. Are you sure you want to continue?
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmDialog(false);
              setPendingOperation(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkOperation} className="bg-red-600 hover:bg-red-700">
              Confirm Operation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
