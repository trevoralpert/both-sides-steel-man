/**
 * Student Risk Alerts Component
 * 
 * Task 8.2.2: Student intervention system for identifying and managing at-risk students
 */

'use client';

import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle,
  Clock,
  TrendingDown,
  UserX,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  FileText,
  Target,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Heart,
  Brain
} from 'lucide-react';

// Types
interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  grade: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  interventionsActive: number;
  lastActivity: Date;
  averageScore: number;
  completionRate: number;
  participationRate: number;
  attendanceRate: number;
  engagementLevel: 'low' | 'medium' | 'high';
  behaviorFlags: string[];
  parentEmail?: string;
  parentPhone?: string;
  teacherNotes?: string;
  currentClasses: string[];
}

interface RiskAlert {
  id: string;
  studentId: string;
  type: 'academic' | 'engagement' | 'attendance' | 'behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendedActions: string[];
  createdAt: Date;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved';
  assignedTo?: string;
  dueDate?: Date;
}

interface StudentRiskAlertsProps {
  students: StudentProfile[];
}

export function StudentRiskAlerts({ students }: StudentRiskAlertsProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Generate risk alerts based on student data
  const generateRiskAlerts = (student: StudentProfile): RiskAlert[] => {
    const alerts: RiskAlert[] = [];
    
    // Academic performance alerts
    if (student.averageScore < 65) {
      alerts.push({
        id: `${student.id}-academic-low`,
        studentId: student.id,
        type: 'academic',
        severity: student.averageScore < 50 ? 'critical' : 'high',
        title: 'Low Academic Performance',
        description: `Average score of ${student.averageScore.toFixed(1)}% is below acceptable threshold`,
        recommendedActions: [
          'Schedule one-on-one tutoring session',
          'Review learning materials and resources',
          'Contact parent/guardian for support',
          'Consider modified assignments'
        ],
        createdAt: new Date(),
        status: 'new'
      });
    }

    // Completion rate alerts
    if (student.completionRate < 70) {
      alerts.push({
        id: `${student.id}-completion-low`,
        studentId: student.id,
        type: 'academic',
        severity: student.completionRate < 50 ? 'critical' : 'medium',
        title: 'Low Assignment Completion',
        description: `Only ${student.completionRate.toFixed(1)}% of assignments completed`,
        recommendedActions: [
          'Check for understanding of assignment requirements',
          'Provide additional time or support',
          'Break assignments into smaller tasks',
          'Monitor daily progress'
        ],
        createdAt: new Date(),
        status: 'new'
      });
    }

    // Engagement alerts
    if (student.engagementLevel === 'low' || student.participationRate < 50) {
      alerts.push({
        id: `${student.id}-engagement-low`,
        studentId: student.id,
        type: 'engagement',
        severity: 'medium',
        title: 'Low Engagement',
        description: `Student showing minimal participation in class activities`,
        recommendedActions: [
          'Find topics that interest the student',
          'Vary teaching methods and activities',
          'Encourage peer collaboration',
          'Set small, achievable goals'
        ],
        createdAt: new Date(),
        status: 'new'
      });
    }

    // Attendance alerts
    if (student.attendanceRate < 85) {
      alerts.push({
        id: `${student.id}-attendance-low`,
        studentId: student.id,
        type: 'attendance',
        severity: student.attendanceRate < 70 ? 'high' : 'medium',
        title: 'Attendance Concerns',
        description: `Attendance rate of ${student.attendanceRate.toFixed(1)}% is concerning`,
        recommendedActions: [
          'Contact student and family',
          'Identify barriers to attendance',
          'Develop attendance improvement plan',
          'Consider flexible scheduling options'
        ],
        createdAt: new Date(),
        status: 'new'
      });
    }

    // Behavior alerts
    if (student.behaviorFlags.length > 0) {
      alerts.push({
        id: `${student.id}-behavior`,
        studentId: student.id,
        type: 'behavior',
        severity: 'medium',
        title: 'Behavior Concerns',
        description: `Behavior flags: ${student.behaviorFlags.join(', ')}`,
        recommendedActions: [
          'Document specific behavior incidents',
          'Implement behavior support plan',
          'Consider counseling referral',
          'Collaborate with support staff'
        ],
        createdAt: new Date(),
        status: 'new'
      });
    }

    return alerts;
  };

  // Generate all alerts for at-risk students
  const allAlerts = students.flatMap(student => 
    generateRiskAlerts(student).map(alert => ({
      ...alert,
      student
    }))
  );

  // Sort alerts by severity and date
  const sortedAlerts = allAlerts.sort((a, b) => {
    const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="bg-red-600">Critical</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'academic':
        return <Brain className="h-4 w-4" />;
      case 'engagement':
        return <Heart className="h-4 w-4" />;
      case 'attendance':
        return <Clock className="h-4 w-4" />;
      case 'behavior':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="destructive">New</Badge>;
      case 'acknowledged':
        return <Badge variant="secondary">Acknowledged</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-green-600 border-green-600">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No At-Risk Students</h3>
            <p className="text-muted-foreground">
              All students are performing well with no immediate concerns.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {sortedAlerts.filter(a => a.severity === 'critical').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {students.filter(s => s.riskLevel === 'high').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Interventions</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {students.reduce((sum, s) => sum + s.interventionsActive, 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <Users className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {students.filter(s => s.riskLevel === 'medium').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Risk Alerts ({sortedAlerts.length})
          </CardTitle>
          <CardDescription>
            Students requiring immediate attention and intervention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
              <p className="text-muted-foreground">
                All at-risk students have been addressed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedAlerts.map((alert) => (
                <Alert key={alert.id} className="border-l-4 border-l-red-500">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={alert.student.avatar} />
                        <AvatarFallback>
                          {alert.student.firstName[0]}{alert.student.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getTypeIcon(alert.type)}
                          <span className="font-semibold">
                            {alert.student.firstName} {alert.student.lastName}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            Grade {alert.student.grade}
                          </span>
                          {getSeverityBadge(alert.severity)}
                          {getStatusBadge(alert.status)}
                        </div>
                        <AlertDescription className="mb-2">
                          <strong>{alert.title}</strong>: {alert.description}
                        </AlertDescription>
                        <div className="text-sm text-muted-foreground">
                          Created {formatDate(alert.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              {alert.title} - {alert.student.firstName} {alert.student.lastName}
                            </DialogTitle>
                            <DialogDescription>
                              Detailed alert information and recommended interventions
                            </DialogDescription>
                          </DialogHeader>
                          
                          <Tabs defaultValue="details" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="details">Details</TabsTrigger>
                              <TabsTrigger value="actions">Actions</TabsTrigger>
                              <TabsTrigger value="contact">Contact</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="details" className="space-y-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <label className="font-medium text-muted-foreground">Alert Type</label>
                                  <div className="flex items-center space-x-2 mt-1">
                                    {getTypeIcon(alert.type)}
                                    <span className="capitalize">{alert.type}</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="font-medium text-muted-foreground">Severity</label>
                                  <div className="mt-1">{getSeverityBadge(alert.severity)}</div>
                                </div>
                                <div>
                                  <label className="font-medium text-muted-foreground">Status</label>
                                  <div className="mt-1">{getStatusBadge(alert.status)}</div>
                                </div>
                                <div>
                                  <label className="font-medium text-muted-foreground">Created</label>
                                  <p className="mt-1">{formatDate(alert.createdAt)}</p>
                                </div>
                              </div>
                              
                              <div>
                                <label className="font-medium text-muted-foreground">Description</label>
                                <p className="mt-1">{alert.description}</p>
                              </div>
                              
                              <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                  <label className="font-medium text-muted-foreground">Performance</label>
                                  <div className="mt-1">
                                    <div className="text-lg font-bold">{alert.student.averageScore.toFixed(1)}%</div>
                                    <Progress value={alert.student.averageScore} className="mt-1" />
                                  </div>
                                </div>
                                <div>
                                  <label className="font-medium text-muted-foreground">Completion</label>
                                  <div className="mt-1">
                                    <div className="text-lg font-bold">{alert.student.completionRate.toFixed(1)}%</div>
                                    <Progress value={alert.student.completionRate} className="mt-1" />
                                  </div>
                                </div>
                                <div>
                                  <label className="font-medium text-muted-foreground">Attendance</label>
                                  <div className="mt-1">
                                    <div className="text-lg font-bold">{alert.student.attendanceRate.toFixed(1)}%</div>
                                    <Progress value={alert.student.attendanceRate} className="mt-1" />
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="actions" className="space-y-4">
                              <div>
                                <label className="font-medium text-muted-foreground">Recommended Actions</label>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  {alert.recommendedActions.map((action, index) => (
                                    <li key={index} className="text-sm">{action}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button size="sm">
                                  <Target className="h-4 w-4 mr-2" />
                                  Create Intervention Plan
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Schedule Meeting
                                </Button>
                                <Button variant="outline" size="sm">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Add Notes
                                </Button>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="contact" className="space-y-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <label className="font-medium text-muted-foreground">Student Email</label>
                                  <p className="flex items-center mt-1">
                                    <Mail className="h-4 w-4 mr-2" />
                                    {alert.student.email}
                                  </p>
                                </div>
                                <div>
                                  <label className="font-medium text-muted-foreground">Parent Email</label>
                                  <p className="flex items-center mt-1">
                                    <Mail className="h-4 w-4 mr-2" />
                                    {alert.student.parentEmail || 'Not provided'}
                                  </p>
                                </div>
                                <div>
                                  <label className="font-medium text-muted-foreground">Parent Phone</label>
                                  <p className="flex items-center mt-1">
                                    <Phone className="h-4 w-4 mr-2" />
                                    {alert.student.parentPhone || 'Not provided'}
                                  </p>
                                </div>
                                <div>
                                  <label className="font-medium text-muted-foreground">Last Activity</label>
                                  <p className="flex items-center mt-1">
                                    <Clock className="h-4 w-4 mr-2" />
                                    {formatDate(alert.student.lastActivity)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button size="sm">
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Message Student
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Phone className="h-4 w-4 mr-2" />
                                  Call Parent
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Mail className="h-4 w-4 mr-2" />
                                  Email Parent
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </DialogContent>
                      </Dialog>
                      
                      <Button size="sm">
                        <Target className="h-4 w-4 mr-2" />
                        Intervene
                      </Button>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common intervention and support actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              Bulk Message Parents
            </Button>
            <Button variant="outline" className="justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Team Meeting
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" className="justify-start">
              <Target className="h-4 w-4 mr-2" />
              Create Support Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
