/**
 * Progress Charts Component
 * 
 * Task 7.5.1: Interactive data visualization components for learning progress,
 * competency development, and milestone tracking.
 */

'use client';

import React, { useState, useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Calendar,
  Filter,
  Download,
  Info,
  CheckCircle2,
  Clock,
  Star,
  Zap,
  Brain,
  MessageSquare,
  Users,
  BookOpen,
  Search
} from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  progress: number;
  category: string;
}

interface CompetencyData {
  name: string;
  current: number;
  previous?: number;
  target?: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  lastUpdated: Date;
}

interface ProgressChartsProps {
  competencyScores: Record<string, number>;
  overallProgress: number;
  milestones: Milestone[];
  className?: string;
}

export function ProgressCharts({ 
  competencyScores, 
  overallProgress, 
  milestones,
  className 
}: ProgressChartsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('3months');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Transform competency scores into visualization data
  const competencyData: CompetencyData[] = useMemo(() => {
    return Object.entries(competencyScores).map(([key, score]) => ({
      name: formatCompetencyName(key),
      current: score,
      previous: score - (Math.random() * 0.2 - 0.1), // Mock previous data
      target: Math.min(1, score + 0.2), // Mock target
      trend: Math.random() > 0.3 ? 'up' : Math.random() > 0.5 ? 'stable' : 'down',
      category: getCompetencyCategory(key),
      lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    }));
  }, [competencyScores]);

  // Filter data based on selected category
  const filteredCompetencyData = useMemo(() => {
    if (selectedCategory === 'all') return competencyData;
    return competencyData.filter(comp => comp.category === selectedCategory);
  }, [competencyData, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(competencyData.map(comp => comp.category))];
    return cats.sort();
  }, [competencyData]);

  // Calculate category averages
  const categoryAverages = useMemo(() => {
    const averages: Record<string, number> = {};
    categories.forEach(category => {
      const categoryData = competencyData.filter(comp => comp.category === category);
      const average = categoryData.reduce((sum, comp) => sum + comp.current, 0) / categoryData.length;
      averages[category] = average;
    });
    return averages;
  }, [competencyData, categories]);

  const completedMilestones = milestones.filter(m => m.completed);
  const inProgressMilestones = milestones.filter(m => !m.completed && m.progress > 0);
  const upcomingMilestones = milestones.filter(m => !m.completed && m.progress === 0);

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-fit grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="competencies">Skills</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">1 Month</SelectItem>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <OverviewCharts 
            overallProgress={overallProgress}
            categoryAverages={categoryAverages}
            competencyData={competencyData}
            milestones={milestones}
          />
        </TabsContent>

        <TabsContent value="competencies" className="space-y-6">
          <CompetencyCharts
            competencyData={filteredCompetencyData}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <MilestoneProgress
            completedMilestones={completedMilestones}
            inProgressMilestones={inProgressMilestones}
            upcomingMilestones={upcomingMilestones}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendAnalysis
            competencyData={competencyData}
            timeRange={timeRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface OverviewChartsProps {
  overallProgress: number;
  categoryAverages: Record<string, number>;
  competencyData: CompetencyData[];
  milestones: Milestone[];
}

function OverviewCharts({ overallProgress, categoryAverages, competencyData, milestones }: OverviewChartsProps) {
  const topSkills = competencyData
    .sort((a, b) => b.current - a.current)
    .slice(0, 3);

  const improvingSkills = competencyData
    .filter(comp => comp.trend === 'up')
    .sort((a, b) => (b.current - (b.previous || 0)) - (a.current - (a.previous || 0)))
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Overall Progress</span>
          </CardTitle>
          <CardDescription>Your learning journey at a glance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {Math.round(overallProgress * 100)}%
            </div>
            <Progress value={overallProgress * 100} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">
              Overall Learning Progress
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Category Performance</h4>
            {Object.entries(categoryAverages).map(([category, average]) => (
              <div key={category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{category}</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(average * 100)}%
                  </span>
                </div>
                <Progress value={average * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Strongest Skills</span>
          </CardTitle>
          <CardDescription>Your areas of excellence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topSkills.map((skill, index) => (
              <div key={skill.name} className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-500 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  'bg-amber-600 text-white'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{skill.name}</span>
                    <Badge variant="secondary">
                      {Math.round(skill.current * 100)}%
                    </Badge>
                  </div>
                  <Progress value={skill.current * 100} className="h-2 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Improvements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Recent Improvements</span>
          </CardTitle>
          <CardDescription>Skills showing positive growth</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {improvingSkills.length > 0 ? (
              improvingSkills.map((skill) => (
                <div key={skill.name} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{skill.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {skill.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      <span className="text-sm font-medium">
                        +{Math.round(((skill.current - (skill.previous || 0)) * 100))}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(skill.current * 100)}% current
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Complete more activities to see improvements
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Milestone Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Milestone Progress</span>
          </CardTitle>
          <CardDescription>Your achievement journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {milestones.filter(m => m.completed).length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {milestones.filter(m => !m.completed && m.progress > 0).length}
              </div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-500">
                {milestones.filter(m => !m.completed && m.progress === 0).length}
              </div>
              <div className="text-xs text-muted-foreground">Upcoming</div>
            </div>
          </div>

          <div className="space-y-2">
            {milestones.filter(m => !m.completed && m.progress > 0).slice(0, 2).map((milestone) => (
              <div key={milestone.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate">{milestone.title}</span>
                  <span className="text-muted-foreground">
                    {Math.round(milestone.progress * 100)}%
                  </span>
                </div>
                <Progress value={milestone.progress * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CompetencyChartsProps {
  competencyData: CompetencyData[];
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

function CompetencyCharts({ 
  competencyData, 
  categories, 
  selectedCategory, 
  onCategoryChange 
}: CompetencyChartsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {competencyData.map((competency) => (
          <CompetencyCard key={competency.name} competency={competency} />
        ))}
      </div>
    </div>
  );
}

interface CompetencyCardProps {
  competency: CompetencyData;
}

function CompetencyCard({ competency }: CompetencyCardProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down': return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      default: return <div className="h-3 w-3 rounded-full bg-gray-400" />;
    }
  };

  const change = competency.previous ? competency.current - competency.previous : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">{competency.name}</h3>
          <div className="flex items-center space-x-2">
            {getTrendIcon(competency.trend)}
            <Badge variant="secondary" className="text-xs">
              {competency.category}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Current Level</span>
              <span className="font-medium">{Math.round(competency.current * 100)}%</span>
            </div>
            <Progress value={competency.current * 100} className="h-2" />
          </div>

          {competency.target && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Target</span>
                <span className="text-muted-foreground text-xs">
                  {Math.round(competency.target * 100)}%
                </span>
              </div>
              <Progress value={competency.target * 100} className="h-1" />
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Last updated: {competency.lastUpdated.toLocaleDateString()}
            </span>
            {change !== 0 && (
              <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
                {change > 0 ? '+' : ''}{Math.round(change * 100)}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MilestoneProgressProps {
  completedMilestones: Milestone[];
  inProgressMilestones: Milestone[];
  upcomingMilestones: Milestone[];
}

function MilestoneProgress({ 
  completedMilestones, 
  inProgressMilestones, 
  upcomingMilestones 
}: MilestoneProgressProps) {
  return (
    <div className="space-y-6">
      {/* In Progress Milestones */}
      {inProgressMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>In Progress</span>
              <Badge variant="secondary">{inProgressMilestones.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inProgressMilestones.map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Milestones */}
      {completedMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>Completed</span>
              <Badge variant="secondary">{completedMilestones.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedMilestones.map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} compact />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Upcoming</span>
              <Badge variant="outline">{upcomingMilestones.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMilestones.slice(0, 4).map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} compact />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MilestoneCardProps {
  milestone: Milestone;
  compact?: boolean;
}

function MilestoneCard({ milestone, compact = false }: MilestoneCardProps) {
  return (
    <div className={`border rounded-lg p-4 ${milestone.completed ? 'bg-green-50 border-green-200' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-sm">{milestone.title}</h4>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
          )}
          <Badge variant="outline" className="text-xs mt-2">
            {milestone.category}
          </Badge>
        </div>
        <div className="flex-shrink-0 ml-2">
          {milestone.completed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <div className="text-xs text-right">
              {Math.round(milestone.progress * 100)}%
            </div>
          )}
        </div>
      </div>

      {!milestone.completed && (
        <Progress value={milestone.progress * 100} className="h-2 mt-2" />
      )}

      {milestone.completed && milestone.completedAt && (
        <p className="text-xs text-muted-foreground mt-2">
          Completed {milestone.completedAt.toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

interface TrendAnalysisProps {
  competencyData: CompetencyData[];
  timeRange: string;
}

function TrendAnalysis({ competencyData, timeRange }: TrendAnalysisProps) {
  const trendData = useMemo(() => {
    // Mock trend data - in a real app, this would come from historical data
    return competencyData.map(comp => ({
      name: comp.name,
      category: comp.category,
      dataPoints: Array.from({ length: 12 }, (_, i) => ({
        date: new Date(Date.now() - (11 - i) * 7 * 24 * 60 * 60 * 1000),
        value: Math.max(0, Math.min(1, comp.current + (Math.random() - 0.5) * 0.3))
      }))
    }));
  }, [competencyData]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Learning Trends Over Time</CardTitle>
          <CardDescription>
            Track your skill development progress over the past {timeRange}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Interactive Charts Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              Advanced trend visualization will be available in the next update
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
function formatCompetencyName(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCompetencyCategory(key: string): string {
  if (key.includes('communication')) return 'Communication';
  if (key.includes('critical') || key.includes('thinking')) return 'Critical Thinking';
  if (key.includes('research') || key.includes('evidence')) return 'Research Skills';
  if (key.includes('empathy') || key.includes('perspective')) return 'Social Skills';
  return 'General Skills';
}
