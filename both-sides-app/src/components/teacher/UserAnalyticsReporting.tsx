/**
 * User Analytics & Reporting Component
 * 
 * Task 8.5.1: User activity tracking, engagement analytics, and usage patterns
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, TrendingUp, Users, Clock, Activity, Target, Search, 
  Filter, Download, RefreshCw, GraduationCap, Award, AlertTriangle, 
  ArrowUp, ArrowDown
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { useTeacherDashboard } from './TeacherDashboardProvider';

interface UserAnalytics {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  lastActive: Date;
  totalSessions: number;
  totalTimeSpent: number;
  engagementScore: number;
  performanceRating: number;
  learningProgress: number;
  satisfactionScore: number;
  riskFactors: string[];
}

export function UserAnalyticsReporting({ organizationId, canViewAllUsers = false }: { organizationId?: string; canViewAllUsers?: boolean }) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('engagement');

  useEffect(() => {
    loadUserAnalytics();
  }, []);

  const loadUserAnalytics = () => {
    const mockData: UserAnalytics[] = [
      {
        userId: '1', userName: 'Emma Johnson', userEmail: 'emma@school.edu', role: 'student',
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), totalSessions: 89,
        totalTimeSpent: 2340, engagementScore: 87, performanceRating: 8.4,
        learningProgress: 83, satisfactionScore: 8.6, riskFactors: []
      },
      {
        userId: '2', userName: 'Marcus Chen', userEmail: 'marcus@school.edu', role: 'student',
        lastActive: new Date(Date.now() - 5 * 60 * 60 * 1000), totalSessions: 67,
        totalTimeSpent: 1890, engagementScore: 72, performanceRating: 7.1,
        learningProgress: 76, satisfactionScore: 7.8, riskFactors: ['engagement_decline']
      },
      {
        userId: '3', userName: 'Sarah Rodriguez', userEmail: 'sarah@school.edu', role: 'teacher',
        lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000), totalSessions: 234,
        totalTimeSpent: 4560, engagementScore: 94, performanceRating: 9.2,
        learningProgress: 92, satisfactionScore: 9.1, riskFactors: []
      }
    ];
    setUserAnalytics(mockData);
  };

  const filteredUsers = userAnalytics.filter(u => 
    u.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const getValue = (user: UserAnalytics) => {
      switch (sortBy) {
        case 'name': return user.userName;
        case 'engagement': return user.engagementScore;
        case 'performance': return user.performanceRating;
        default: return user.engagementScore;
      }
    };
    return getValue(b) > getValue(a) ? 1 : -1;
  });

  const getEngagementBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 80) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const selectedUserData = selectedUser ? userAnalytics.find(u => u.userId === selectedUser) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            User Analytics & Reporting
          </h3>
          <p className="text-sm text-muted-foreground">
            Track user activity, engagement, and learning progress
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{userAnalytics.length}</div>
              <div className="text-xs text-muted-foreground">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round(userAnalytics.reduce((sum, u) => sum + u.engagementScore, 0) / userAnalytics.length)}%
              </div>
              <div className="text-xs text-muted-foreground">Avg Engagement</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="individual">Individual Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedUsers.map((userAnalytic) => (
              <Card 
                key={userAnalytic.userId}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedUser(userAnalytic.userId);
                  setActiveTab('individual');
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{userAnalytic.userName}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{userAnalytic.role}</p>
                      </div>
                    </div>
                    {getEngagementBadge(userAnalytic.engagementScore)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Sessions</div>
                        <div className="font-semibold">{userAnalytic.totalSessions}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Time</div>
                        <div className="font-semibold">{formatDuration(userAnalytic.totalTimeSpent)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Performance</div>
                        <div className="font-semibold">{userAnalytic.performanceRating.toFixed(1)}/10</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Last Active</div>
                        <div className="font-semibold">{formatTimeAgo(userAnalytic.lastActive)}</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Engagement</span>
                        <span>{userAnalytic.engagementScore}%</span>
                      </div>
                      <Progress value={userAnalytic.engagementScore} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Learning Progress</span>
                        <span>{userAnalytic.learningProgress}%</span>
                      </div>
                      <Progress value={userAnalytic.learningProgress} className="h-2" />
                    </div>

                    {userAnalytic.riskFactors.length > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-orange-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{userAnalytic.riskFactors.length} risk factor(s)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          {selectedUserData ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold">{selectedUserData.userName}</h4>
                        <p className="text-muted-foreground">{selectedUserData.userEmail}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="capitalize">{selectedUserData.role}</Badge>
                          {getEngagementBadge(selectedUserData.engagementScore)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Engagement Score</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedUserData.engagementScore}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Performance</p>
                        <p className="text-2xl font-bold">{selectedUserData.performanceRating.toFixed(1)}/10</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Time</p>
                        <p className="text-2xl font-bold">{formatDuration(selectedUserData.totalTimeSpent)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Learning Progress</p>
                        <p className="text-2xl font-bold">{selectedUserData.learningProgress}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h5 className="font-medium mb-3">Summary</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Sessions:</span>
                          <span className="font-semibold">{selectedUserData.totalSessions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Satisfaction Score:</span>
                          <span className="font-semibold">{selectedUserData.satisfactionScore.toFixed(1)}/10</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-3">Risk Assessment</h5>
                      {selectedUserData.riskFactors.length > 0 ? (
                        <div className="space-y-2">
                          {selectedUserData.riskFactors.map((factor, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              <span className="capitalize">{factor.replace('_', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-green-600 flex items-center space-x-2">
                          <Activity className="h-4 w-4" />
                          <span>No risk factors identified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a user from the overview to view detailed analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { range: '90-100%', count: userAnalytics.filter(u => u.engagementScore >= 90).length },
                    { range: '80-89%', count: userAnalytics.filter(u => u.engagementScore >= 80 && u.engagementScore < 90).length },
                    { range: '70-79%', count: userAnalytics.filter(u => u.engagementScore >= 70 && u.engagementScore < 80).length },
                    { range: '<70%', count: userAnalytics.filter(u => u.engagementScore < 70).length }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { range: '9-10', count: userAnalytics.filter(u => u.performanceRating >= 9).length },
                    { range: '8-8.9', count: userAnalytics.filter(u => u.performanceRating >= 8 && u.performanceRating < 9).length },
                    { range: '7-7.9', count: userAnalytics.filter(u => u.performanceRating >= 7 && u.performanceRating < 8).length },
                    { range: '<7', count: userAnalytics.filter(u => u.performanceRating < 7).length }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
              <CardDescription>Automated insights and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Top Performers</h4>
                      <p className="text-sm text-green-700">
                        {userAnalytics.filter(u => u.engagementScore >= 90).length} users show exceptional engagement (90%+).
                        Consider them for peer mentoring opportunities.
                      </p>
                    </div>
                  </div>
                </div>

                {userAnalytics.filter(u => u.riskFactors.length > 0).length > 0 && (
                  <div className="border rounded-lg p-4 bg-orange-50">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-800">Users Needing Attention</h4>
                        <p className="text-sm text-orange-700">
                          {userAnalytics.filter(u => u.riskFactors.length > 0).length} users show risk factors.
                          Consider targeted interventions and additional support.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-start space-x-3">
                    <BarChart3 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Overall Performance</h4>
                      <p className="text-sm text-blue-700">
                        Average engagement score is {Math.round(userAnalytics.reduce((sum, u) => sum + u.engagementScore, 0) / userAnalytics.length)}%.
                        Most users are actively participating in learning activities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
