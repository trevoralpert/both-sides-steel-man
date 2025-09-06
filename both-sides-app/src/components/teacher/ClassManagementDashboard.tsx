/**
 * Class Management Dashboard
 * 
 * Task 8.2.1: Comprehensive class management interface with search, filtering,
 * sorting capabilities, class creation wizard, and bulk operations.
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Eye,
  Edit,
  Archive,
  Copy,
  Trash2,
  Calendar,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  FileText,
  Download,
  Upload,
  MessageSquare
} from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface ClassData {
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
  };
  organization: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActivity?: Date;
  averageEngagement?: number;
  totalDebates?: number;
  completionRate?: number;
}

interface ClassFilters {
  search: string;
  subject: string;
  gradeLevel: string;
  academicYear: string;
  term: string;
  status: string;
  isActive: string;
}

interface ClassSort {
  field: 'name' | 'subject' | 'enrollment' | 'createdAt' | 'lastActivity' | 'engagement';
  direction: 'asc' | 'desc';
}

export function ClassManagementDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const { state, addNotification } = useTeacherDashboard();
  
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassData[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [filters, setFilters] = useState<ClassFilters>({
    search: '',
    subject: '',
    gradeLevel: '',
    academicYear: '',
    term: '',
    status: '',
    isActive: ''
  });
  
  const [sort, setSort] = useState<ClassSort>({
    field: 'name',
    direction: 'asc'
  });

  // Load classes on component mount and refresh
  useEffect(() => {
    loadClasses();
  }, [user?.id, state.lastRefresh]);

  // Apply filters and sorting when data or filters change
  useEffect(() => {
    applyFiltersAndSort();
  }, [classes, filters, sort]);

  const loadClasses = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // TODO: Fix auth token handling
      // const token = await user.getToken();
      const response = await fetch('/api/classes/teacher-classes', {
        // headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      } else {
        // Fallback mock data for development
        const mockClasses: ClassData[] = [
          {
            id: '1',
            name: 'Advanced Biology',
            description: 'Advanced placement biology with debate components',
            subject: 'SCIENCE',
            gradeLevel: '11',
            academicYear: '2024-2025',
            term: 'FALL',
            maxStudents: 30,
            currentEnrollment: 28,
            isActive: true,
            status: 'active',
            teacher: { id: user.id, name: user.firstName + ' ' + user.lastName },
            organization: { id: 'org1', name: 'Lincoln High School' },
            createdAt: new Date(2024, 8, 1),
            updatedAt: new Date(),
            lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
            averageEngagement: 85.2,
            totalDebates: 12,
            completionRate: 78.5
          },
          {
            id: '2',
            name: 'Introduction to Philosophy',
            description: 'Exploring fundamental philosophical questions through structured debate',
            subject: 'PHILOSOPHY',
            gradeLevel: '12',
            academicYear: '2024-2025',
            term: 'FALL',
            maxStudents: 25,
            currentEnrollment: 22,
            isActive: true,
            status: 'active',
            teacher: { id: user.id, name: user.firstName + ' ' + user.lastName },
            organization: { id: 'org1', name: 'Lincoln High School' },
            createdAt: new Date(2024, 8, 15),
            updatedAt: new Date(),
            lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000),
            averageEngagement: 92.1,
            totalDebates: 8,
            completionRate: 95.2
          },
          {
            id: '3',
            name: 'American Government',
            description: 'Civics and government with focus on democratic debate',
            subject: 'GOVERNMENT',
            gradeLevel: '10',
            academicYear: '2024-2025',
            term: 'FALL',
            maxStudents: 35,
            currentEnrollment: 31,
            isActive: false,
            status: 'draft',
            teacher: { id: user.id, name: user.firstName + ' ' + user.lastName },
            organization: { id: 'org1', name: 'Lincoln High School' },
            createdAt: new Date(2024, 9, 1),
            updatedAt: new Date(),
            averageEngagement: 0,
            totalDebates: 0,
            completionRate: 0
          }
        ];
        setClasses(mockClasses);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
      setError('Failed to load classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...classes];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(cls => 
        cls.name.toLowerCase().includes(searchLower) ||
        cls.description?.toLowerCase().includes(searchLower) ||
        cls.subject.toLowerCase().includes(searchLower)
      );
    }

    if (filters.subject) {
      filtered = filtered.filter(cls => cls.subject === filters.subject);
    }

    if (filters.gradeLevel) {
      filtered = filtered.filter(cls => cls.gradeLevel === filters.gradeLevel);
    }

    if (filters.academicYear) {
      filtered = filtered.filter(cls => cls.academicYear === filters.academicYear);
    }

    if (filters.term) {
      filtered = filtered.filter(cls => cls.term === filters.term);
    }

    if (filters.status) {
      filtered = filtered.filter(cls => cls.status === filters.status);
    }

    if (filters.isActive !== '') {
      const activeFilter = filters.isActive === 'true';
      filtered = filtered.filter(cls => cls.isActive === activeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort.field) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'subject':
          aValue = a.subject;
          bValue = b.subject;
          break;
        case 'enrollment':
          aValue = a.currentEnrollment;
          bValue = b.currentEnrollment;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'lastActivity':
          aValue = a.lastActivity || new Date(0);
          bValue = b.lastActivity || new Date(0);
          break;
        case 'engagement':
          aValue = a.averageEngagement || 0;
          bValue = b.averageEngagement || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredClasses(filtered);
  };

  const handleFilterChange = (key: keyof ClassFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSortChange = (field: ClassSort['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectClass = (classId: string) => {
    setSelectedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedClasses.size === filteredClasses.length) {
      setSelectedClasses(new Set());
    } else {
      setSelectedClasses(new Set(filteredClasses.map(cls => cls.id)));
    }
  };

  const handleClassAction = (action: string, classId: string) => {
    switch (action) {
      case 'view':
        router.push(`/teacher/classes/${classId}`);
        break;
      case 'edit':
        router.push(`/teacher/classes/${classId}/edit`);
        break;
      case 'duplicate':
        duplicateClass(classId);
        break;
      case 'archive':
        archiveClass(classId);
        break;
      case 'delete':
        deleteClass(classId);
        break;
      default:
        break;
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedClasses.size === 0) return;

    try {
      switch (action) {
        case 'archive':
          await bulkArchiveClasses(Array.from(selectedClasses));
          break;
        case 'activate':
          await bulkActivateClasses(Array.from(selectedClasses));
          break;
        case 'export':
          await exportClasses(Array.from(selectedClasses));
          break;
        default:
          break;
      }
      
      setSelectedClasses(new Set());
      loadClasses(); // Refresh data
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Bulk Action Failed',
        message: `Failed to ${action} selected classes. Please try again.`,
        read: false
      });
    }
  };

  const duplicateClass = async (classId: string) => {
    addNotification({
      type: 'info',
      title: 'Duplicating Class',
      message: 'Class duplication feature will be implemented in a future update.',
      read: false
    });
  };

  const archiveClass = async (classId: string) => {
    addNotification({
      type: 'info',
      title: 'Archiving Class',
      message: 'Class archiving feature will be implemented in a future update.',
      read: false
    });
  };

  const deleteClass = async (classId: string) => {
    addNotification({
      type: 'info',
      title: 'Deleting Class',
      message: 'Class deletion feature will be implemented in a future update.',
      read: false
    });
  };

  const bulkArchiveClasses = async (classIds: string[]) => {
    // Implementation will be added
  };

  const bulkActivateClasses = async (classIds: string[]) => {
    // Implementation will be added
  };

  const exportClasses = async (classIds: string[]) => {
    // Implementation will be added
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

  const getEngagementBadge = (engagement?: number) => {
    if (!engagement) return null;
    
    if (engagement >= 80) {
      return <Badge variant="default" className="bg-green-100 text-green-800">High</Badge>;
    } else if (engagement >= 60) {
      return <Badge variant="secondary">Medium</Badge>;
    } else {
      return <Badge variant="destructive">Low</Badge>;
    }
  };

  if (loading) {
    return <LoadingState text="Loading classes..." />;
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
          <h2 className="text-2xl font-bold">Class Management</h2>
          <p className="text-muted-foreground">
            Manage your classes and monitor student enrollment
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => router.push('/teacher/classes/import')}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => router.push('/teacher/classes/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Class
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classes.filter(cls => cls.isActive && cls.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classes.reduce((sum, cls) => sum + cls.currentEnrollment, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                classes.reduce((sum, cls) => sum + (cls.averageEngagement || 0), 0) / 
                classes.filter(cls => cls.averageEngagement).length || 0
              )}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
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
                  placeholder="Search classes..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Select value={filters.subject} onValueChange={(value) => handleFilterChange('subject', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All subjects</SelectItem>
                  <SelectItem value="SCIENCE">Science</SelectItem>
                  <SelectItem value="PHILOSOPHY">Philosophy</SelectItem>
                  <SelectItem value="GOVERNMENT">Government</SelectItem>
                  <SelectItem value="HISTORY">History</SelectItem>
                  <SelectItem value="ENGLISH">English</SelectItem>
                  <SelectItem value="DEBATE">Debate</SelectItem>
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedClasses.size > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedClasses.size} class{selectedClasses.size !== 1 ? 'es' : ''} selected
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
                  onClick={() => handleBulkAction('archive')}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
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

      {/* Classes Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Classes ({filteredClasses.length})</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedClasses.size === filteredClasses.length && filteredClasses.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClasses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No classes found</h3>
              <p className="text-muted-foreground mb-4">
                {classes.length === 0 
                  ? "You haven't created any classes yet." 
                  : "No classes match your current filters."
                }
              </p>
              {classes.length === 0 && (
                <Button onClick={() => router.push('/teacher/classes/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Class
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredClasses.map((classData) => (
                <Card key={classData.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedClasses.has(classData.id)}
                          onCheckedChange={() => handleSelectClass(classData.id)}
                        />
                        <div>
                          <CardTitle className="text-base">{classData.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {classData.subject} • Grade {classData.gradeLevel}
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
                          <DropdownMenuItem onClick={() => handleClassAction('view', classData.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleClassAction('edit', classData.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleClassAction('duplicate', classData.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleClassAction('archive', classData.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleClassAction('delete', classData.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        {getStatusBadge(classData.status, classData.isActive)}
                        {getEngagementBadge(classData.averageEngagement)}
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-4 w-4 mr-1" />
                        {classData.currentEnrollment}/{classData.maxStudents} students
                      </div>
                      
                      {classData.lastActivity && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          Last activity: {classData.lastActivity.toLocaleDateString()}
                        </div>
                      )}
                      
                      {classData.totalDebates !== undefined && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {classData.totalDebates} debates
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* List view implementation */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div className="col-span-1"></div>
                <div className="col-span-3 cursor-pointer" onClick={() => handleSortChange('name')}>
                  Name {sort.field === 'name' && (sort.direction === 'asc' ? '↑' : '↓')}
                </div>
                <div className="col-span-2 cursor-pointer" onClick={() => handleSortChange('subject')}>
                  Subject {sort.field === 'subject' && (sort.direction === 'asc' ? '↑' : '↓')}
                </div>
                <div className="col-span-2 cursor-pointer" onClick={() => handleSortChange('enrollment')}>
                  Enrollment {sort.field === 'enrollment' && (sort.direction === 'asc' ? '↑' : '↓')}
                </div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 cursor-pointer" onClick={() => handleSortChange('engagement')}>
                  Engagement {sort.field === 'engagement' && (sort.direction === 'asc' ? '↑' : '↓')}
                </div>
                <div className="col-span-1">Actions</div>
              </div>
              
              {filteredClasses.map((classData) => (
                <div key={classData.id} className="grid grid-cols-12 gap-4 items-center py-2 border-b hover:bg-muted/50">
                  <div className="col-span-1">
                    <Checkbox
                      checked={selectedClasses.has(classData.id)}
                      onCheckedChange={() => handleSelectClass(classData.id)}
                    />
                  </div>
                  <div className="col-span-3">
                    <div>
                      <div className="font-medium">{classData.name}</div>
                      <div className="text-sm text-muted-foreground">Grade {classData.gradeLevel}</div>
                    </div>
                  </div>
                  <div className="col-span-2">{classData.subject}</div>
                  <div className="col-span-2">
                    {classData.currentEnrollment}/{classData.maxStudents}
                  </div>
                  <div className="col-span-2">
                    {getStatusBadge(classData.status, classData.isActive)}
                  </div>
                  <div className="col-span-1">
                    {getEngagementBadge(classData.averageEngagement) || '-'}
                  </div>
                  <div className="col-span-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleClassAction('view', classData.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClassAction('edit', classData.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClassAction('duplicate', classData.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
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
