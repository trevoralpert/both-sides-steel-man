/**
 * Comparative Charts Component
 * 
 * Task 7.5.4: Comparative visualization tools including peer comparison,
 * class trends, and topic performance analysis.
 */

'use client';

import React, { useState, useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  Target,
  Trophy,
  BarChart3,
  Download,
  Info,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentPerformance {
  id: string;
  name: string;
  avatar?: string;
  metrics: {
    overallScore: number;
    criticalThinking: number;
    communication: number;
    research: number;
    empathy: number;
    collaboration: number;
  };
  recent: {
    debatesParticipated: number;
    reflectionsCompleted: number;
    achievementsEarned: number;
    plasticityScore: number;
  };
  trends: {
    improvement: number; // -1 to 1
    consistency: number; // 0 to 1
    engagement: number; // 0 to 1
  };
}

interface TopicPerformanceData {
  topic: string;
  category: string;
  studentPerformance: number;
  classAverage: number;
  nationalAverage?: number;
  participantCount: number;
  metrics: {
    argumentQuality: number;
    evidenceUsage: number;
    positionClarity: number;
    peerEngagement: number;
  };
  skillGrowth: Array<{
    skill: string;
    before: number;
    after: number;
    change: number;
  }>;
}

interface ClassTrendData {
  period: string;
  date: Date;
  metrics: {
    averageEngagement: number;
    averagePerformance: number;
    debateParticipation: number;
    reflectionCompletion: number;
    skillDevelopment: number;
  };
  standouts: {
    mostImproved: string;
    highestEngagement: string;
    bestCollaborator: string;
  };
}

interface ComparativeChartsProps {
  studentData?: StudentPerformance;
  peerData: StudentPerformance[];
  topicData: TopicPerformanceData[];
  classData: ClassTrendData[];
  showPersonalData?: boolean;
  className?: string;
}

export function ComparativeCharts({
  studentData,
  peerData,
  topicData,
  classData,
  showPersonalData = true,
  className
}: ComparativeChartsProps) {
  const [activeTab, setActiveTab] = useState('peer-comparison');

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Comparative Analysis</span>
          </CardTitle>
          <CardDescription>
            Compare performance with peers, track class trends, and analyze topic-specific outcomes
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="peer-comparison">Peer Comparison</TabsTrigger>
              <TabsTrigger value="class-trends">Class Trends</TabsTrigger>
              <TabsTrigger value="topic-performance">Topic Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="peer-comparison" className="space-y-6">
              <PeerComparison 
                studentData={studentData} 
                peerData={peerData}
                showPersonalData={showPersonalData}
              />
            </TabsContent>

            <TabsContent value="class-trends" className="space-y-6">
              <ClassTrends data={classData} />
            </TabsContent>

            <TabsContent value="topic-performance" className="space-y-6">
              <TopicPerformance 
                data={topicData}
                studentData={studentData}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface PeerComparisonProps {
  studentData?: StudentPerformance;
  peerData: StudentPerformance[];
  showPersonalData: boolean;
}

function PeerComparison({ studentData, peerData, showPersonalData }: PeerComparisonProps) {
  const [sortBy, setSortBy] = useState<keyof StudentPerformance['metrics']>('overallScore');
  const [showTop, setShowTop] = useState(10);

  const sortedPeers = useMemo(() => {
    return [...peerData]
      .sort((a, b) => b.metrics[sortBy] - a.metrics[sortBy])
      .slice(0, showTop);
  }, [peerData, sortBy, showTop]);

  const studentRanking = useMemo(() => {
    if (!studentData) return null;
    const allStudents = [studentData, ...peerData];
    const sorted = allStudents.sort((a, b) => b.metrics[sortBy] - a.metrics[sortBy]);
    return sorted.findIndex(s => s.id === studentData.id) + 1;
  }, [studentData, peerData, sortBy]);

  const classStats = useMemo(() => {
    const allStudents = studentData ? [studentData, ...peerData] : peerData;
    const values = allStudents.map(s => s.metrics[sortBy]);
    
    return {
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      max: Math.max(...values),
      min: Math.min(...values),
      median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
    };
  }, [studentData, peerData, sortBy]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overallScore">Overall Score</SelectItem>
              <SelectItem value="criticalThinking">Critical Thinking</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="research">Research Skills</SelectItem>
              <SelectItem value="empathy">Empathy</SelectItem>
              <SelectItem value="collaboration">Collaboration</SelectItem>
            </SelectContent>
          </Select>

          <Select value={showTop.toString()} onValueChange={(value) => setShowTop(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Student Performance Summary */}
      {showPersonalData && studentData && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-blue-900">Your Performance</h3>
              <p className="text-sm text-blue-700">
                Ranked #{studentRanking} of {peerData.length + 1} students
              </p>
            </div>
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              {Math.round(studentData.metrics[sortBy])}%
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-900">
                {Math.round(studentData.metrics[sortBy])}%
              </div>
              <div className="text-xs text-blue-600">Your Score</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-700">
                {Math.round(classStats.average)}%
              </div>
              <div className="text-xs text-gray-600">Class Average</div>
            </div>
            <div className="text-center">
              <div className={cn(
                "text-lg font-bold",
                studentData.trends.improvement > 0 ? "text-green-600" : "text-red-600"
              )}>
                {studentData.trends.improvement > 0 ? "+" : ""}
                {Math.round(studentData.trends.improvement * 100)}%
              </div>
              <div className="text-xs text-gray-600">Recent Change</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {Math.round(studentData.recent.plasticityScore * 100)}%
              </div>
              <div className="text-xs text-purple-600">Plasticity</div>
            </div>
          </div>
        </div>
      )}

      {/* Class Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold">{Math.round(classStats.average)}%</div>
          <div className="text-sm text-muted-foreground">Class Average</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{Math.round(classStats.max)}%</div>
          <div className="text-sm text-muted-foreground">Highest</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{Math.round(classStats.median)}%</div>
          <div className="text-sm text-muted-foreground">Median</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{peerData.length + (studentData ? 1 : 0)}</div>
          <div className="text-sm text-muted-foreground">Students</div>
        </div>
      </div>

      {/* Peer Rankings */}
      <div className="space-y-2">
        <h3 className="font-semibold flex items-center">
          <Trophy className="h-4 w-4 mr-2" />
          Peer Rankings - {sortBy.replace(/([A-Z])/g, ' $1')}
        </h3>
        
        {sortedPeers.map((peer, index) => (
          <div key={peer.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                index === 0 ? "bg-yellow-100 text-yellow-700" :
                index === 1 ? "bg-gray-100 text-gray-700" :
                index === 2 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
              )}>
                #{index + 1}
              </div>
              <div>
                <p className="font-medium">{peer.name}</p>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{peer.recent.debatesParticipated} debates</span>
                  <span>•</span>
                  <span>{peer.recent.reflectionsCompleted} reflections</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="font-bold">{Math.round(peer.metrics[sortBy])}%</div>
                <div className="flex items-center text-xs">
                  {peer.trends.improvement > 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={cn(
                    peer.trends.improvement > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {Math.abs(Math.round(peer.trends.improvement * 100))}%
                  </span>
                </div>
              </div>

              <div className="w-20">
                <Progress 
                  value={peer.metrics[sortBy]} 
                  className="h-2"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skill Breakdown Comparison */}
      {showPersonalData && studentData && (
        <div className="space-y-4">
          <h3 className="font-semibold">Skill Comparison</h3>
          <div className="space-y-3">
            {Object.entries(studentData.metrics).map(([skill, value]) => {
              const peerAverage = peerData.reduce((sum, peer) => sum + peer.metrics[skill as keyof typeof peer.metrics], 0) / peerData.length;
              const difference = value - peerAverage;
              
              return (
                <div key={skill} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{skill.replace(/([A-Z])/g, ' $1')}</span>
                    <span className={cn(
                      "font-medium",
                      difference > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {difference > 0 ? "+" : ""}{Math.round(difference)}% vs peers
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={Math.max(value, peerAverage)} className="h-3" />
                    <Progress 
                      value={Math.min(value, peerAverage)} 
                      className="h-3 absolute top-0 left-0"
                    />
                    <div 
                      className="absolute top-0 h-3 bg-blue-600 rounded-full"
                      style={{ 
                        width: `${Math.min(value, peerAverage)}%`,
                        backgroundColor: value > peerAverage ? '#059669' : '#dc2626'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>You: {Math.round(value)}%</span>
                    <span>Peers: {Math.round(peerAverage)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassTrends({ data }: { data: ClassTrendData[] }) {
  const [timeframe, setTimeframe] = useState('month');
  
  // Calculate trend statistics
  const trendStats = useMemo(() => {
    if (data.length < 2) return null;
    
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    return {
      engagement: {
        current: latest.metrics.averageEngagement,
        change: latest.metrics.averageEngagement - previous.metrics.averageEngagement
      },
      performance: {
        current: latest.metrics.averagePerformance,
        change: latest.metrics.averagePerformance - previous.metrics.averagePerformance
      },
      participation: {
        current: latest.metrics.debateParticipation,
        change: latest.metrics.debateParticipation - previous.metrics.debateParticipation
      }
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed rounded">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No class trend data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Summary */}
      {trendStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Engagement</span>
              <div className="flex items-center">
                {trendStats.engagement.change > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <div className="text-2xl font-bold">{Math.round(trendStats.engagement.current)}%</div>
            <div className={cn(
              "text-xs",
              trendStats.engagement.change > 0 ? "text-green-600" : "text-red-600"
            )}>
              {trendStats.engagement.change > 0 ? "+" : ""}{Math.round(trendStats.engagement.change)}% from last period
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Performance</span>
              <div className="flex items-center">
                {trendStats.performance.change > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <div className="text-2xl font-bold">{Math.round(trendStats.performance.current)}%</div>
            <div className={cn(
              "text-xs",
              trendStats.performance.change > 0 ? "text-green-600" : "text-red-600"
            )}>
              {trendStats.performance.change > 0 ? "+" : ""}{Math.round(trendStats.performance.change)}% from last period
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Participation</span>
              <div className="flex items-center">
                {trendStats.participation.change > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <div className="text-2xl font-bold">{Math.round(trendStats.participation.current)}%</div>
            <div className={cn(
              "text-xs",
              trendStats.participation.change > 0 ? "text-green-600" : "text-red-600"
            )}>
              {trendStats.participation.change > 0 ? "+" : ""}{Math.round(trendStats.participation.change)}% from last period
            </div>
          </div>
        </div>
      )}

      {/* Class Standouts */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
        <h3 className="font-semibold mb-3 flex items-center">
          <Award className="h-4 w-4 mr-2 text-purple-600" />
          Recent Standouts
        </h3>
        
        {data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <Trophy className="h-6 w-6 mx-auto text-green-500 mb-1" />
              <div className="font-medium text-sm">Most Improved</div>
              <div className="text-xs text-muted-foreground">{data[data.length - 1].standouts.mostImproved}</div>
            </div>
            <div className="text-center">
              <Zap className="h-6 w-6 mx-auto text-blue-500 mb-1" />
              <div className="font-medium text-sm">Highest Engagement</div>
              <div className="text-xs text-muted-foreground">{data[data.length - 1].standouts.highestEngagement}</div>
            </div>
            <div className="text-center">
              <Users className="h-6 w-6 mx-auto text-purple-500 mb-1" />
              <div className="font-medium text-sm">Best Collaborator</div>
              <div className="text-xs text-muted-foreground">{data[data.length - 1].standouts.bestCollaborator}</div>
            </div>
          </div>
        )}
      </div>

      {/* Trend Chart Placeholder */}
      <div className="h-64 flex items-center justify-center border-2 border-dashed rounded">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Class Trends Chart</p>
          <p className="text-xs text-muted-foreground">Interactive trend visualization coming soon</p>
        </div>
      </div>
    </div>
  );
}

function TopicPerformance({ data, studentData }: { data: TopicPerformanceData[]; studentData?: StudentPerformance }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const categories = useMemo(() => {
    const cats = new Set(data.map(d => d.category));
    return Array.from(cats).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return selectedCategory === 'all' 
      ? data 
      : data.filter(d => d.category === selectedCategory);
  }, [data, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex items-center space-x-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Topic Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredData.map((topic) => (
          <div key={topic.topic} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{topic.topic}</h3>
                <p className="text-sm text-muted-foreground">{topic.category}</p>
              </div>
              <Badge variant="outline">
                {topic.participantCount} students
              </Badge>
            </div>

            {/* Performance Comparison */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Your Performance</span>
                <span className="font-medium">{Math.round(topic.studentPerformance)}%</span>
              </div>
              <Progress value={topic.studentPerformance} className="h-2" />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Class Average: {Math.round(topic.classAverage)}%</span>
                {topic.nationalAverage && (
                  <span>National Average: {Math.round(topic.nationalAverage)}%</span>
                )}
              </div>
            </div>

            {/* Skill Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(topic.metrics).map(([metric, value]) => (
                <div key={metric} className="flex justify-between">
                  <span className="capitalize">{metric.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="font-medium">{Math.round(value * 100)}%</span>
                </div>
              ))}
            </div>

            {/* Growth Indicators */}
            {topic.skillGrowth.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs font-medium mb-2">Skill Growth</div>
                {topic.skillGrowth.slice(0, 2).map((growth) => (
                  <div key={growth.skill} className="flex items-center justify-between text-xs">
                    <span>{growth.skill}</span>
                    <div className={cn(
                      "flex items-center",
                      growth.change > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {growth.change > 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      <span>{Math.abs(Math.round(growth.change * 100))}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="h-32 flex items-center justify-center border-2 border-dashed rounded">
          <div className="text-center">
            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No topic data for this category</p>
          </div>
        </div>
      )}
    </div>
  );
}
