/**
 * Engagement Heat Maps Component
 * 
 * Task 7.5.2: Visual engagement pattern analysis with heat maps showing
 * student activity, participation trends, and temporal engagement data.
 */

'use client';

import React, { useState, useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  Clock, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Eye,
  Filter,
  Download,
  Zap,
  Heart,
  MessageSquare
} from 'lucide-react';

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  overallProgress: number;
  lastActivity: Date;
  completedReflections: number;
  averageQuality: number;
  riskLevel: 'low' | 'medium' | 'high';
  strengths: string[];
  needsAttention: string[];
  engagementTrend: 'improving' | 'stable' | 'declining';
}

interface EngagementData {
  studentId: string;
  date: Date;
  engagementScore: number; // 0-100
  activities: {
    debateParticipation: number;
    reflectionActivity: number;
    peerInteraction: number;
    resourceAccess: number;
  };
  timeSpent: number; // minutes
  qualityMetrics: {
    messageQuality: number;
    responseDepth: number;
    collaborationScore: number;
  };
}

interface EngagementHeatMapsProps {
  students: StudentSummary[];
  classId: string;
}

export function EngagementHeatMaps({ students, classId }: EngagementHeatMapsProps) {
  const [timeframe, setTimeframe] = useState('month');
  const [viewType, setViewType] = useState('heatmap');
  const [selectedMetric, setSelectedMetric] = useState('overall_engagement');

  // Generate mock engagement data
  const engagementData = useMemo(() => {
    const data: EngagementData[] = [];
    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
    
    students.forEach(student => {
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Generate realistic engagement patterns
        const baseEngagement = student.riskLevel === 'high' ? 30 : 
                              student.riskLevel === 'medium' ? 60 : 80;
        const randomVariation = (Math.random() - 0.5) * 40;
        const engagementScore = Math.max(0, Math.min(100, baseEngagement + randomVariation));
        
        data.push({
          studentId: student.id,
          date,
          engagementScore,
          activities: {
            debateParticipation: Math.random() * 100,
            reflectionActivity: Math.random() * 100,
            peerInteraction: Math.random() * 100,
            resourceAccess: Math.random() * 100
          },
          timeSpent: Math.floor(Math.random() * 120) + 15,
          qualityMetrics: {
            messageQuality: Math.random() * 100,
            responseDepth: Math.random() * 100,
            collaborationScore: Math.random() * 100
          }
        });
      }
    });
    
    return data;
  }, [students, timeframe]);

  // Calculate engagement patterns
  const engagementPatterns = useMemo(() => {
    const patterns = {
      highEngagement: students.filter(s => s.riskLevel === 'low').length,
      mediumEngagement: students.filter(s => s.riskLevel === 'medium').length,
      lowEngagement: students.filter(s => s.riskLevel === 'high').length,
      improving: students.filter(s => s.engagementTrend === 'improving').length,
      declining: students.filter(s => s.engagementTrend === 'declining').length
    };
    
    return patterns;
  }, [students]);

  // Get peak engagement times (mock data)
  const peakTimes = useMemo(() => [
    { time: '10:00 AM', score: 85, activity: 'Morning debates' },
    { time: '2:00 PM', score: 78, activity: 'Afternoon reflections' },
    { time: '4:00 PM', score: 65, activity: 'Peer discussions' }
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Engagement Analytics</h2>
          <p className="text-muted-foreground">
            Visual analysis of student engagement patterns and trends
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="semester">Semester</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Engagement Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">High Engagement</p>
                <p className="text-2xl font-bold text-green-600">{engagementPatterns.highEngagement}</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Consistently active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Medium Engagement</p>
                <p className="text-2xl font-bold text-yellow-600">{engagementPatterns.mediumEngagement}</p>
              </div>
              <Activity className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Moderate participation
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Low Engagement</p>
                <p className="text-2xl font-bold text-red-600">{engagementPatterns.lowEngagement}</p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Need attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Improving</p>
                <p className="text-2xl font-bold text-blue-600">{engagementPatterns.improving}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Positive trend
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Declining</p>
                <p className="text-2xl font-bold text-orange-600">{engagementPatterns.declining}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Needs intervention
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="heatmap" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="heatmap">Heat Map View</TabsTrigger>
            <TabsTrigger value="patterns">Activity Patterns</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overall_engagement">Overall Engagement</SelectItem>
              <SelectItem value="debate_participation">Debate Participation</SelectItem>
              <SelectItem value="reflection_activity">Reflection Activity</SelectItem>
              <SelectItem value="peer_interaction">Peer Interaction</SelectItem>
              <SelectItem value="time_spent">Time Spent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="heatmap" className="space-y-6">
          <EngagementHeatMapView 
            students={students}
            engagementData={engagementData}
            metric={selectedMetric}
            timeframe={timeframe}
          />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <ActivityPatternsView 
            students={students}
            engagementData={engagementData}
            peakTimes={peakTimes}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <EngagementInsightsView 
            students={students}
            patterns={engagementPatterns}
            peakTimes={peakTimes}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface EngagementHeatMapViewProps {
  students: StudentSummary[];
  engagementData: EngagementData[];
  metric: string;
  timeframe: string;
}

function EngagementHeatMapView({ students, engagementData, metric, timeframe }: EngagementHeatMapViewProps) {
  // Generate heat map data
  const heatMapData = useMemo(() => {
    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
    const data: Array<{ student: string; day: number; value: number; date: Date }> = [];
    
    students.forEach((student, studentIndex) => {
      for (let day = 0; day < Math.min(days, 30); day++) { // Limit display to 30 days for readability
        const engagementEntry = engagementData.find(
          d => d.studentId === student.id && 
          Math.floor((Date.now() - d.date.getTime()) / (1000 * 60 * 60 * 24)) === day
        );
        
        let value = 0;
        if (engagementEntry) {
          switch (metric) {
            case 'overall_engagement':
              value = engagementEntry.engagementScore;
              break;
            case 'debate_participation':
              value = engagementEntry.activities.debateParticipation;
              break;
            case 'reflection_activity':
              value = engagementEntry.activities.reflectionActivity;
              break;
            case 'peer_interaction':
              value = engagementEntry.activities.peerInteraction;
              break;
            case 'time_spent':
              value = (engagementEntry.timeSpent / 120) * 100; // Normalize to 0-100
              break;
            default:
              value = engagementEntry.engagementScore;
          }
        }
        
        const date = new Date();
        date.setDate(date.getDate() - day);
        
        data.push({
          student: student.name,
          day,
          value,
          date
        });
      }
    });
    
    return data;
  }, [students, engagementData, metric, timeframe]);

  const getHeatMapColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-green-400';
    if (value >= 40) return 'bg-yellow-400';
    if (value >= 20) return 'bg-orange-400';
    if (value > 0) return 'bg-red-400';
    return 'bg-gray-200';
  };

  const maxDays = timeframe === 'week' ? 7 : 30;
  const dayLabels = Array.from({ length: maxDays }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }).reverse();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Engagement Heat Map</span>
          </CardTitle>
          <CardDescription>
            Visual representation of {metric.replace('_', ' ')} over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-200 rounded"></div>
                <span>No Activity</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span>Low (1-20)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-400 rounded"></div>
                <span>Medium (21-40)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                <span>Good (41-60)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span>High (61-80)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Excellent (81-100)</span>
              </div>
            </div>

            {/* Heat Map Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Day labels */}
                <div className="flex mb-2">
                  <div className="w-32 flex-shrink-0"></div>
                  {dayLabels.map((label, index) => (
                    <div key={index} className="w-8 text-xs text-center text-muted-foreground">
                      {label.split(' ')[1]}
                    </div>
                  ))}
                </div>

                {/* Student rows */}
                {students.map((student, studentIndex) => (
                  <div key={student.id} className="flex mb-1">
                    <div className="w-32 flex-shrink-0 text-sm font-medium truncate pr-2 py-1">
                      {student.name}
                    </div>
                    {Array.from({ length: maxDays }, (_, dayIndex) => {
                      const dataPoint = heatMapData.find(
                        d => d.student === student.name && d.day === (maxDays - 1 - dayIndex)
                      );
                      return (
                        <div
                          key={dayIndex}
                          className={`w-8 h-6 mr-1 rounded-sm ${getHeatMapColor(dataPoint?.value || 0)}`}
                          title={`${student.name} - ${dayLabels[dayIndex]}: ${Math.round(dataPoint?.value || 0)}%`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityPatternsView({ students, engagementData, peakTimes }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Peak Activity Times</CardTitle>
          <CardDescription>When students are most engaged</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {peakTimes.map((peak: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">{peak.time}</div>
                  <div className="text-sm text-muted-foreground">{peak.activity}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{peak.score}%</div>
                  <div className="text-xs text-muted-foreground">Engagement</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Patterns</CardTitle>
          <CardDescription>Activity trends by day of week</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Pattern Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Weekly engagement pattern visualization coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function EngagementInsightsView({ students, patterns, peakTimes }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>AI-powered engagement analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Positive Trends</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• {patterns.improving} students showing improvement in engagement</li>
                <li>• Peak engagement occurs during morning debate sessions</li>
                <li>• Class participation has increased 15% this month</li>
              </ul>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2">Areas for Attention</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• {patterns.declining} students showing declining engagement</li>
                <li>• Afternoon sessions have lower participation rates</li>
                <li>• {patterns.lowEngagement} students need immediate intervention</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Recommendations</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Schedule high-stakes debates in the morning</li>
                <li>• Implement peer mentoring for low-engagement students</li>
                <li>• Consider gamification elements to boost participation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
