/**
 * Student Detail Panel Component
 * 
 * Task 8.2.2: Complete academic and engagement profile for individual students
 */

'use client';

import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertTriangle,
  MessageSquare,
  Heart,
  Brain,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  FileText,
  BarChart3
} from 'lucide-react';

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
  status: 'active' | 'inactive' | 'at_risk' | 'excelling' | 'needs_attention';
}

interface StudentDetailPanelProps {
  student: StudentProfile;
}

export function StudentDetailPanel({ student }: StudentDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

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

  const getEngagementIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'medium':
        return <Target className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={student.avatar} />
            <AvatarFallback className="text-lg">
              {student.firstName[0]}{student.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">
              {student.firstName} {student.lastName}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-muted-foreground">
                Grade {student.grade} • {student.studentId}
              </span>
              {getStatusBadge(student.status)}
              {getRiskBadge(student.riskLevel)}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.averageScore.toFixed(1)}%</div>
            <Progress value={student.averageScore} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            {getEngagementIcon(student.engagementLevel)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.participationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground capitalize">
              {student.engagementLevel} engagement
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Assignment completion
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debates</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.completedDebates}</div>
            <p className="text-xs text-muted-foreground">
              Completed this semester
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="interventions">Support</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="font-medium text-muted-foreground">Email</label>
                    <p className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {student.email}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Student ID</label>
                    <p>{student.studentId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Enrolled</label>
                    <p className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(student.enrollmentDate)}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Last Activity</label>
                    <p className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {formatDate(student.lastActivity)}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <label className="font-medium text-muted-foreground">Current Classes</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {student.currentClasses.map((cls, index) => (
                      <Badge key={index} variant="outline">{cls}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="font-medium text-muted-foreground">Groups</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {student.groups.map((group, index) => (
                      <Badge key={index} variant="secondary">{group}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="font-medium text-muted-foreground">Parent Email</label>
                  <p className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {student.parentEmail || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Parent Phone</label>
                  <p className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {student.parentPhone || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Emergency Contact</label>
                  <p>{student.emergencyContact || 'Not provided'}</p>
                </div>
                
                <Separator />
                
                <div>
                  <label className="font-medium text-muted-foreground">Parent Communications</label>
                  <p className="text-2xl font-bold">{student.parentCommunications}</p>
                  <p className="text-xs text-muted-foreground">This semester</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Notes */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Achievements & Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="font-medium text-muted-foreground">Recent Achievements</label>
                  {student.achievements.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.achievements.map((achievement, index) => (
                        <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No achievements yet</p>
                  )}
                </div>
                
                <div>
                  <label className="font-medium text-muted-foreground">Current Goals</label>
                  {student.goals.length > 0 ? (
                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                      {student.goals.map((goal, index) => (
                        <li key={index}>{goal}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No goals set</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Teacher Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {student.teacherNotes ? (
                  <p className="text-sm">{student.teacherNotes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes added yet</p>
                )}
                <Button variant="outline" size="sm" className="mt-3">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Notes
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Academic Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="font-medium text-muted-foreground">Overall GPA</label>
                  <p className="text-2xl font-bold">{student.overallGPA?.toFixed(2) || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Average Score</label>
                  <p className="text-2xl font-bold">{student.averageScore.toFixed(1)}%</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Completion Rate</label>
                  <p className="text-2xl font-bold">{student.completionRate.toFixed(1)}%</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <label className="font-medium text-muted-foreground">Learning Style</label>
                <p className="capitalize">{student.learningStyle || 'Not assessed'}</p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="font-medium text-muted-foreground">Strength Areas</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {student.strengthAreas.map((area, index) => (
                      <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Improvement Areas</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {student.improvementAreas.map((area, index) => (
                      <Badge key={index} variant="secondary">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Engagement Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium">Participation Rate</label>
                    <span className="text-sm font-medium">{student.participationRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={student.participationRate} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium">Attendance Rate</label>
                    <span className="text-sm font-medium">{student.attendanceRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={student.attendanceRate} />
                </div>
              </div>
              
              <div>
                <label className="font-medium text-muted-foreground">Engagement Level</label>
                <div className="flex items-center space-x-2 mt-1">
                  {getEngagementIcon(student.engagementLevel)}
                  <span className="capitalize font-medium">{student.engagementLevel}</span>
                </div>
              </div>
              
              {student.behaviorFlags.length > 0 && (
                <div>
                  <label className="font-medium text-muted-foreground">Behavior Notes</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {student.behaviorFlags.map((flag, index) => (
                      <Badge key={index} variant="outline" className="text-orange-600 border-orange-600">
                        {flag.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Skill Development
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(student.skillProgression).map(([skill, score]) => (
                <div key={skill}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium">{skill}</label>
                    <span className="text-sm font-medium">{score}%</span>
                  </div>
                  <Progress value={score} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Support & Interventions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Risk Level</label>
                  <p className="text-sm text-muted-foreground">Current assessment</p>
                </div>
                {getRiskBadge(student.riskLevel)}
              </div>
              
              {student.riskFactors.length > 0 && (
                <div>
                  <label className="font-medium text-muted-foreground">Risk Factors</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {student.riskFactors.map((factor, index) => (
                      <Badge key={index} variant="destructive">
                        {factor.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="font-medium text-muted-foreground">Active Interventions</label>
                <p className="text-2xl font-bold">{student.interventionsActive}</p>
                <p className="text-xs text-muted-foreground">Currently receiving support</p>
              </div>
              
              <Button variant="outline" className="w-full">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Create Intervention Plan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Communication History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Communication Tools</h3>
                <p className="text-muted-foreground mb-4">
                  Student communication features will be implemented in this task.
                </p>
                <div className="flex justify-center space-x-2">
                  <Button variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline">
                    <Phone className="h-4 w-4 mr-2" />
                    Contact Parent
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
