/**
 * Student Learning Dashboard
 * 
 * Task 7.5.1: Main dashboard component for students to access their learning analytics,
 * reflection history, progress tracking, and personalized insights.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  BookOpen, 
  BarChart3, 
  Calendar,
  Clock,
  Star,
  Zap,
  Brain,
  MessageSquare,
  Users,
  Trophy,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

import { PersonalizedInsights } from './PersonalizedInsights';
import { ProgressCharts } from './ProgressCharts';
import { LearningGoals } from './LearningGoals';
import { ReflectionHistory } from './ReflectionHistory';
import { AchievementShowcase } from './AchievementShowcase';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface LearningDashboardData {
  overallProgress: number;
  recentReflections: ReflectionSummary[];
  achievements: Achievement[];
  learningGoals: LearningGoal[];
  recommendations: Recommendation[];
  competencyScores: Record<string, number>;
  milestones: Milestone[];
  streaks: Streak[];
  upcomingDeadlines: Deadline[];
}

interface ReflectionSummary {
  id: string;
  debateTitle: string;
  completedAt: Date;
  qualityScore: number;
  completionStatus: 'completed' | 'in_progress' | 'pending';
  keyInsights: string[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  icon: string;
}

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number;
  competency: string;
  milestones: string[];
}

interface Recommendation {
  id: string;
  type: 'skill_focus' | 'practice' | 'resource' | 'challenge';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  expectedImpact: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  progress: number;
  category: string;
}

interface Streak {
  type: string;
  current: number;
  best: number;
  description: string;
  icon: string;
}

interface Deadline {
  id: string;
  title: string;
  dueDate: Date;
  type: 'reflection' | 'assignment' | 'milestone';
  priority: 'high' | 'medium' | 'low';
}

export function StudentLearningDashboard() {
  const { user } = useUser();
  const [dashboardData, setDashboardData] = useState<LearningDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data from multiple endpoints
      const [progressResponse, reflectionsResponse, achievementsResponse] = await Promise.all([
        fetch(`/api/learning-progress/profile/${user.id}`, {
          headers: { 'Authorization': `Bearer ${await user.getToken()}` }
        }),
        fetch(`/api/reflections/user/${user.id}/summary`, {
          headers: { 'Authorization': `Bearer ${await user.getToken()}` }
        }),
        fetch(`/api/achievements/${user.id}`, {
          headers: { 'Authorization': `Bearer ${await user.getToken()}` }
        })
      ]);

      if (!progressResponse.ok) {
        throw new Error('Failed to fetch progress data');
      }

      const [progressData, reflectionsData, achievementsData] = await Promise.all([
        progressResponse.json(),
        reflectionsResponse.ok ? reflectionsResponse.json() : { reflections: [] },
        achievementsResponse.ok ? achievementsResponse.json() : { achievements: [] }
      ]);

      // Transform and combine data
      setDashboardData({
        overallProgress: progressData.overallProgress || 0,
        recentReflections: reflectionsData.reflections?.slice(0, 5) || [],
        achievements: achievementsData.achievements?.slice(0, 10) || [],
        learningGoals: progressData.recommendations?.slice(0, 3) || [],
        recommendations: progressData.recommendations || [],
        competencyScores: progressData.competencies || {},
        milestones: progressData.milestones || [],
        streaks: generateStreakData(),
        upcomingDeadlines: generateDeadlines(),
      });

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const generateStreakData = (): Streak[] => {
    return [
      {
        type: 'reflection_completion',
        current: 7,
        best: 12,
        description: 'Days completing reflections',
        icon: '🔥'
      },
      {
        type: 'debate_participation',
        current: 3,
        best: 8,
        description: 'Consecutive debates participated',
        icon: '⚡'
      }
    ];
  };

  const generateDeadlines = (): Deadline[] => {
    return [
      {
        id: '1',
        title: 'Complete reflection for Climate Change debate',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        type: 'reflection',
        priority: 'high'
      }
    ];
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={fetchDashboardData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Learning Dashboard</h1>
            <p className="text-muted-foreground">
              Track your progress, insights, and achievements
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Overall Progress"
            value={`${Math.round(dashboardData.overallProgress * 100)}%`}
            change={+5.2}
            icon={<TrendingUp className="h-4 w-4" />}
            description="vs last month"
          />
          <StatsCard
            title="Reflections"
            value={dashboardData.recentReflections.length.toString()}
            change={+2}
            icon={<MessageSquare className="h-4 w-4" />}
            description="completed this week"
          />
          <StatsCard
            title="Achievements"
            value={dashboardData.achievements.length.toString()}
            change={+1}
            icon={<Trophy className="h-4 w-4" />}
            description="earned this month"
          />
          <StatsCard
            title="Learning Streak"
            value={`${dashboardData.streaks[0]?.current || 0} days`}
            icon={<Zap className="h-4 w-4" />}
            description="current streak"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="reflections">Reflections</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab dashboardData={dashboardData} />
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <ProgressCharts 
              competencyScores={dashboardData.competencyScores}
              overallProgress={dashboardData.overallProgress}
              milestones={dashboardData.milestones}
            />
          </TabsContent>

          <TabsContent value="reflections" className="space-y-6">
            <ReflectionHistory reflections={dashboardData.recentReflections} />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <AchievementShowcase 
              achievements={dashboardData.achievements}
              milestones={dashboardData.milestones}
            />
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <LearningGoals 
              goals={dashboardData.learningGoals}
              recommendations={dashboardData.recommendations}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}

interface StatsCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  description: string;
}

function StatsCard({ title, value, change, icon, description }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          {change !== undefined && (
            <>
              {change > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={change > 0 ? 'text-green-500' : 'text-red-500'}>
                {change > 0 ? '+' : ''}{change}
              </span>
            </>
          )}
          <span>{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface OverviewTabProps {
  dashboardData: LearningDashboardData;
}

function OverviewTab({ dashboardData }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Recent Activity */}
      <div className="lg:col-span-2 space-y-6">
        {/* Personalized Insights */}
        <PersonalizedInsights recommendations={dashboardData.recommendations} />

        {/* Recent Reflections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Recent Reflections</span>
            </CardTitle>
            <CardDescription>
              Your latest debate reflections and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentReflections.length > 0 ? (
                dashboardData.recentReflections.slice(0, 3).map((reflection) => (
                  <div key={reflection.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <h4 className="font-medium">{reflection.debateTitle}</h4>
                      <p className="text-sm text-muted-foreground">
                        Completed {new Date(reflection.completedAt).toLocaleDateString()}
                      </p>
                      {reflection.keyInsights.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {reflection.keyInsights[0]}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getReflectionBadgeVariant(reflection.qualityScore)}>
                        {Math.round(reflection.qualityScore * 100)}%
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No reflections yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete your first debate to start reflecting and learning
                  </p>
                  <Button>Start Reflecting</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        {dashboardData.upcomingDeadlines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Upcoming Deadlines</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <h4 className="font-medium">{deadline.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Due {new Date(deadline.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={getDeadlineBadgeVariant(deadline.priority)}>
                      {deadline.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Progress & Achievements */}
      <div className="space-y-6">
        {/* Learning Streaks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Learning Streaks</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.streaks.map((streak, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{streak.description}</span>
                  <span className="text-lg font-bold">{streak.icon} {streak.current}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (streak.current / streak.best) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Best: {streak.best} days
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Recent Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.achievements.length > 0 ? (
                dashboardData.achievements.slice(0, 3).map((achievement) => (
                  <div key={achievement.id} className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getRarityColor(achievement.rarity)}`}>
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(achievement.earnedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Trophy className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No achievements yet
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="h-4 w-4 mr-2" />
              Start New Reflection
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Detailed Progress
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="h-4 w-4 mr-2" />
              Find Debate Partner
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getReflectionBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 0.8) return "default";
  if (score >= 0.6) return "secondary";
  return "outline";
}

function getDeadlineBadgeVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case 'high': return "destructive";
    case 'medium': return "default";
    case 'low': return "secondary";
    default: return "outline";
  }
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-orange-500';
    case 'epic': return 'bg-gradient-to-r from-purple-400 to-pink-500';
    case 'rare': return 'bg-gradient-to-r from-blue-400 to-cyan-500';
    default: return 'bg-secondary';
  }
}
