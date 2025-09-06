/**
 * Teacher Sessions Page
 * 
 * Task 8.3: Session Creation & Scheduling System
 * Comprehensive session management with creation wizard and scheduling tools
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  Activity, 
  Plus, 
  Search, 
  Filter,
  Clock,
  Users,
  Play,
  Pause,
  Eye,
  Edit,
  Copy,
  Archive,
  Trash2,
  MoreHorizontal,
  CalendarDays,
  BookOpen,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Zap,
  FileText,
  Download,
  Upload
} from 'lucide-react';
import { SessionCreationWizard } from '@/components/teacher/SessionCreationWizard';
import { DebateCalendarView } from '@/components/teacher/DebateCalendarView';
import { AvailabilityManager } from '@/components/teacher/AvailabilityManager';
import { SessionResourceLibrary } from '@/components/teacher/SessionResourceLibrary';
import { LoadingState } from '@/components/ui/loading-state';
import { useTeacherDashboard } from '@/components/teacher/TeacherDashboardProvider';

// Types
interface DebateSession {
  id: string;
  title: string;
  description: string;
  topic: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
  };
  format: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';
  scheduledDate: Date;
  scheduledTime: string;
  duration: number;
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: 'participant' | 'observer';
  }>;
  teacher: {
    id: string;
    name: string;
  };
  configuration: {
    format: string;
    aiCoaching: boolean;
    recording: boolean;
    scoring: boolean;
  };
  analytics?: {
    engagement: number;
    participation: number;
    completionRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface SessionFilters {
  search: string;
  status: string;
  format: string;
  dateRange: string;
}

export default function TeacherSessionsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { addNotification } = useTeacherDashboard();
  
  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<DebateSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  
  const [filters, setFilters] = useState<SessionFilters>({
    search: '',
    status: '',
    format: '',
    dateRange: ''
  });

  useEffect(() => {
    loadSessions();
  }, [user?.id]);

  useEffect(() => {
    applyFilters();
  }, [sessions, filters, activeTab]);

  const loadSessions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // const token = await user.getToken(); // Commented out for now
      const response = await fetch('/api/sessions/teacher-sessions', {
        // headers: { 'Authorization': `Bearer ${token}` } // Commented out for now
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        // Mock data for development
        const mockSessions: DebateSession[] = [
          {
            id: '1',
            title: 'Environmental Policy Debate',
            description: 'Discussing plastic pollution and policy solutions',
            topic: {
              id: 'topic1',
              title: 'Should schools ban single-use plastics?',
              category: 'Environment',
              difficulty: 'intermediate'
            },
            format: 'oxford',
            status: 'scheduled',
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            scheduledTime: '14:30',
            duration: 45,
            participants: [
              { id: '1', firstName: 'Sarah', lastName: 'Johnson', role: 'participant' },
              { id: '2', firstName: 'Michael', lastName: 'Chen', role: 'participant' },
              { id: '3', firstName: 'Emma', lastName: 'Davis', role: 'participant' },
              { id: '4', firstName: 'James', lastName: 'Wilson', role: 'participant' }
            ],
            teacher: { id: user.id, name: user.firstName + ' ' + user.lastName },
            configuration: {
              format: 'oxford',
              aiCoaching: true,
              recording: true,
              scoring: true
            },
            createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
          },
          {
            id: '2',
            title: 'AI Ethics Discussion',
            description: 'Exploring the relationship between AI and human creativity',
            topic: {
              id: 'topic2',
              title: 'Is artificial intelligence a threat to human creativity?',
              category: 'Technology',
              difficulty: 'advanced'
            },
            format: 'socratic',
            status: 'completed',
            scheduledDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
            scheduledTime: '10:00',
            duration: 50,
            participants: [
              { id: '1', firstName: 'Sarah', lastName: 'Johnson', role: 'participant' },
              { id: '2', firstName: 'Michael', lastName: 'Chen', role: 'participant' },
              { id: '5', firstName: 'Alex', lastName: 'Brown', role: 'participant' },
              { id: '6', firstName: 'Lisa', lastName: 'Taylor', role: 'participant' }
            ],
            teacher: { id: user.id, name: user.firstName + ' ' + user.lastName },
            configuration: {
              format: 'socratic',
              aiCoaching: true,
              recording: true,
              scoring: true
            },
            analytics: {
              engagement: 87.5,
              participation: 92.3,
              completionRate: 100
            },
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
          },
          {
            id: '3',
            title: 'Student Voice in Education',
            description: 'Should students have more say in their curriculum?',
            topic: {
              id: 'topic3',
              title: 'Should students have a say in their school curriculum?',
              category: 'Education',
              difficulty: 'beginner'
            },
            format: 'fishbowl',
            status: 'draft',
            scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            scheduledTime: '13:00',
            duration: 35,
            participants: [
              { id: '3', firstName: 'Emma', lastName: 'Davis', role: 'participant' },
              { id: '7', firstName: 'David', lastName: 'Kim', role: 'participant' },
              { id: '8', firstName: 'Sophie', lastName: 'Martinez', role: 'participant' }
            ],
            teacher: { id: user.id, name: user.firstName + ' ' + user.lastName },
            configuration: {
              format: 'fishbowl',
              aiCoaching: false,
              recording: false,
              scoring: false
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        setSessions(mockSessions);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Filter by tab
    const now = new Date();
    switch (activeTab) {
      case 'upcoming':
        filtered = filtered.filter(session => 
          (session.status === 'scheduled' || session.status === 'draft') && 
          new Date(session.scheduledDate) >= now
        );
        break;
      case 'live':
        filtered = filtered.filter(session => session.status === 'live');
        break;
      case 'completed':
        filtered = filtered.filter(session => session.status === 'completed');
        break;
      case 'all':
        break;
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(session =>
        session.title.toLowerCase().includes(searchLower) ||
        session.description.toLowerCase().includes(searchLower) ||
        session.topic.title.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(session => session.status === filters.status);
    }

    // Apply format filter
    if (filters.format) {
      filtered = filtered.filter(session => session.format === filters.format);
    }

    setFilteredSessions(filtered);
  };

  const handleFilterChange = (key: keyof SessionFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSessionAction = (action: string, sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    switch (action) {
      case 'view':
        router.push(`/teacher/sessions/${sessionId}`);
        break;
      case 'edit':
        router.push(`/teacher/sessions/${sessionId}/edit`);
        break;
      case 'duplicate':
        duplicateSession(sessionId);
        break;
      case 'start':
        startSession(sessionId);
        break;
      case 'monitor':
        router.push(`/teacher/sessions/${sessionId}/monitor`);
        break;
      case 'archive':
        archiveSession(sessionId);
        break;
      case 'delete':
        deleteSession(sessionId);
        break;
      default:
        break;
    }
  };

  const duplicateSession = async (sessionId: string) => {
    addNotification({
      type: 'info',
      title: 'Duplicating Session',
      message: 'Session duplication feature will be implemented in this task.',
      read: false
    });
  };

  const startSession = async (sessionId: string) => {
    addNotification({
      type: 'info',
      title: 'Starting Session',
      message: 'Live session starting will be implemented in Task 8.4.',
      read: false
    });
  };

  const archiveSession = async (sessionId: string) => {
    addNotification({
      type: 'info',
      title: 'Archiving Session',
      message: 'Session archiving feature will be implemented in this task.',
      read: false
    });
  };

  const deleteSession = async (sessionId: string) => {
    addNotification({
      type: 'info',
      title: 'Deleting Session',
      message: 'Session deletion feature will be implemented in this task.',
      read: false
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'scheduled':
        return <Badge variant="default">Scheduled</Badge>;
      case 'live':
        return <Badge variant="destructive" className="animate-pulse">Live</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFormatLabel = (format: string) => {
    const formats: Record<string, string> = {
      'oxford': 'Oxford Style',
      'lincoln-douglas': 'Lincoln-Douglas',
      'parliamentary': 'Parliamentary',
      'fishbowl': 'Fishbowl',
      'socratic': 'Socratic Seminar'
    };
    return formats[format] || format;
  };

  if (loading) {
    return <LoadingState text="Loading sessions..." />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Session Management</h1>
          <p className="text-muted-foreground">
            Create and manage debate sessions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowCreateWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {sessions.filter(s => s.status === 'live').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="all">All Sessions</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Select value={filters.format} onValueChange={(value) => handleFilterChange('format', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All formats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All formats</SelectItem>
                <SelectItem value="oxford">Oxford Style</SelectItem>
                <SelectItem value="lincoln-douglas">Lincoln-Douglas</SelectItem>
                <SelectItem value="parliamentary">Parliamentary</SelectItem>
                <SelectItem value="fishbowl">Fishbowl</SelectItem>
                <SelectItem value="socratic">Socratic Seminar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredSessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">No Sessions Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {sessions.length === 0 
                      ? "You haven't created any debate sessions yet."
                      : "No sessions match your current filters."
                    }
                  </p>
                  {sessions.length === 0 && (
                    <Button onClick={() => setShowCreateWizard(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Session
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSessions.map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{session.title}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {session.description}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleSessionAction('view', session.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {session.status === 'live' && (
                            <DropdownMenuItem onClick={() => handleSessionAction('monitor', session.id)}>
                              <Activity className="h-4 w-4 mr-2" />
                              Monitor Live
                            </DropdownMenuItem>
                          )}
                          {session.status === 'scheduled' && (
                            <DropdownMenuItem onClick={() => handleSessionAction('start', session.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Start Session
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleSessionAction('edit', session.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSessionAction('duplicate', session.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleSessionAction('archive', session.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleSessionAction('delete', session.id)}
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
                        {getStatusBadge(session.status)}
                        <Badge variant="outline">{getFormatLabel(session.format)}</Badge>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium">{session.topic.title}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">{session.topic.category}</Badge>
                          <Badge variant="outline" className="text-xs">{session.topic.difficulty}</Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {session.scheduledDate.toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {session.scheduledTime} ({session.duration}min)
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {session.participants.length} participants
                        </div>
                        {session.analytics && (
                          <div className="flex items-center">
                            <Zap className="h-3 w-3 mr-1" />
                            {Math.round(session.analytics.engagement)}% engagement
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-xs">
                        {session.configuration.aiCoaching && (
                          <Badge variant="outline" className="text-xs">
                            AI Coaching
                          </Badge>
                        )}
                        {session.configuration.recording && (
                          <Badge variant="outline" className="text-xs">
                            Recording
                          </Badge>
                        )}
                        {session.configuration.scoring && (
                          <Badge variant="outline" className="text-xs">
                            Scoring
                          </Badge>
                        )}
                      </div>
                      
                      {/* Participant Avatars */}
                      {session.participants.length > 0 && (
                        <div className="flex items-center -space-x-2">
                          {session.participants.slice(0, 4).map((participant) => (
                            <Avatar key={participant.id} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={participant.avatar} />
                              <AvatarFallback className="text-xs">
                                {participant.firstName[0]}{participant.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {session.participants.length > 4 && (
                            <div className="flex items-center justify-center h-6 w-6 bg-muted border-2 border-background rounded-full text-xs">
                              +{session.participants.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <DebateCalendarView
            events={sessions.map(session => ({
              id: session.id,
              title: session.title,
              description: session.description,
              start: new Date(`${session.scheduledDate.toDateString()} ${session.scheduledTime}`),
              end: new Date(`${session.scheduledDate.toDateString()} ${session.scheduledTime}`),
              type: 'session' as const,
              status: session.status,
              participants: session.participants,
              topic: session.topic,
              format: session.format,
              teacherId: session.teacher.id,
              classId: undefined
            }))}
            onEventClick={(event) => router.push(`/teacher/sessions/${event.id}`)}
            onEventCreate={(start, end) => {
              // Implementation for creating sessions from calendar
              setShowCreateWizard(true);
            }}
            onEventUpdate={(eventId, updates) => {
              // Implementation for updating sessions
              addNotification({
                type: 'info',
                title: 'Session Update',
                message: 'Session update functionality will be implemented in this task.',
                read: false
              });
            }}
            onEventDelete={(eventId) => {
              // Implementation for deleting sessions
              addNotification({
                type: 'info',
                title: 'Session Deletion',
                message: 'Session deletion functionality will be implemented in this task.',
                read: false
              });
            }}
          />
        </TabsContent>

        <TabsContent value="availability" className="space-y-4">
          <AvailabilityManager
            participants={[
              ...Array.from(new Set(sessions.flatMap(s => s.participants))).map(p => ({
                ...p,
                role: 'student' as const
              })),
              {
                id: user?.id || '',
                firstName: user?.firstName || '',
                lastName: user?.lastName || '',
                role: 'teacher' as const
              }
            ]}
            onAvailabilityUpdate={(patterns) => {
              addNotification({
                type: 'success',
                title: 'Availability Updated',
                message: 'Your availability patterns have been updated.',
                read: false
              });
            }}
            onOptimalTimesGenerated={(times) => {
              addNotification({
                type: 'info',
                title: 'Optimal Times Generated',
                message: `Found ${times.length} optimal time suggestions for scheduling.`,
                read: false
              });
            }}
          />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <SessionResourceLibrary
            onResourceSelect={(resource) => {
              addNotification({
                type: 'success',
                title: 'Resource Selected',
                message: `"${resource.name}" has been selected for use in sessions.`,
                read: false
              });
            }}
            onResourceAdd={(resource) => {
              addNotification({
                type: 'success',
                title: 'Resource Added',
                message: `"${resource.name}" has been added to your library.`,
                read: false
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Session Creation Wizard */}
      <SessionCreationWizard 
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
      />
    </div>
  );
}
