'use client';

import { useState, useEffect } from 'react';
import { Profile, ProfileStats, User } from '@/types/profile';
import { ProfileAPI, ProfileAPIError } from '@/lib/api/profile';
import { ProfileCard } from './ProfileCard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Activity,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Brain,
  Target,
  Calendar,
  UserCheck,
  Settings
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface DashboardStats {
  totalProfiles: number;
  completedProfiles: number;
  incompleteProfiles: number;
  completionRate: number;
  averagePlasticity: number;
  recentActivity: number;
  topIdeologies: { ideology: string; count: number; percentage: number }[];
}

interface RecentActivity {
  id: string;
  type: 'profile_created' | 'profile_updated' | 'profile_completed';
  profile: Profile;
  timestamp: Date;
  description: string;
}

interface ProfileDashboardProps {
  userRole?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  currentUserId?: string;
  onCreateProfile?: () => void;
  onEditProfile?: (profile: Profile) => void;
  onViewProfile?: (profile: Profile) => void;
  className?: string;
}

export function ProfileDashboard({
  userRole = 'STUDENT',
  currentUserId,
  onCreateProfile,
  onEditProfile,
  onViewProfile,
  className = ''
}: ProfileDashboardProps) {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProfiles, setRecentProfiles] = useState<Profile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Load dashboard data
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Load profile stats (admin/teacher only)
      if (userRole === 'ADMIN' || userRole === 'TEACHER') {
        const statsResponse = await ProfileAPI.getProfileStats(token);
        setStats({
          totalProfiles: statsResponse.data.total_profiles,
          completedProfiles: statsResponse.data.completed_profiles,
          incompleteProfiles: statsResponse.data.total_profiles - statsResponse.data.completed_profiles,
          completionRate: statsResponse.data.completion_rate * 100,
          averagePlasticity: statsResponse.data.average_plasticity * 100,
          recentActivity: 0, // Would be calculated from activity logs
          topIdeologies: Object.entries(statsResponse.data.most_common_ideology || {})
            .map(([ideology, count]) => ({
              ideology,
              count: count as number,
              percentage: ((count as number) / statsResponse.data.total_profiles) * 100
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        });

        // Load recent profiles
        const profilesResponse = await ProfileAPI.listProfiles(token, {
          page: 1,
          limit: 10
        });
        setRecentProfiles(profilesResponse.data.profiles);
      }

      // Load current user profile
      const currentProfile = await ProfileAPI.getCurrentUserProfile(token);
      if (currentProfile.data) {
        setCurrentUserProfile(currentProfile.data);
      }

      // Generate mock recent activity (would come from audit logs in real implementation)
      setRecentActivity(generateMockActivity(recentProfiles.slice(0, 5)));

    } catch (err) {
      if (err instanceof ProfileAPIError) {
        setError(err.message);
      } else {
        setError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [userRole, currentUserId]);

  // Generate mock activity data
  const generateMockActivity = (profiles: Profile[]): RecentActivity[] => {
    const activities: RecentActivity[] = [];
    const now = new Date();

    profiles.forEach((profile, index) => {
      activities.push({
        id: `activity-${profile.id}-${index}`,
        type: profile.is_completed ? 'profile_completed' : 'profile_updated',
        profile,
        timestamp: new Date(now.getTime() - (index + 1) * 60 * 60 * 1000), // Hours ago
        description: profile.is_completed 
          ? `${profile.user?.first_name || profile.user?.username} completed their profile`
          : `${profile.user?.first_name || profile.user?.username} updated their profile`
      });
    });

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      const days = Math.floor(diffInMinutes / (24 * 60));
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        <span className="text-lg">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {userRole === 'ADMIN' 
              ? 'Manage and monitor all user profiles'
              : userRole === 'TEACHER' 
              ? 'Monitor student profiles in your classes'
              : 'Manage your profile and view your progress'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {onCreateProfile && (
            <Button onClick={onCreateProfile}>
              <Plus className="h-4 w-4 mr-2" />
              Create Profile
            </Button>
          )}
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Current User Profile Card */}
          {currentUserProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCheck className="h-5 w-5 mr-2" />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProfileCard
                  profile={currentUserProfile}
                  variant="detailed"
                  onEdit={onEditProfile}
                  onView={onViewProfile}
                  showActions={true}
                  isCurrentUser={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          {stats && (userRole === 'ADMIN' || userRole === 'TEACHER') && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Profiles</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProfiles}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedProfiles}</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(stats.completionRate)}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.incompleteProfiles}</div>
                  <p className="text-xs text-muted-foreground">
                    Need completion
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Flexibility</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(stats.averagePlasticity)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Opinion plasticity
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {!currentUserProfile && onCreateProfile && (
                  <Button variant="outline" className="h-24 flex-col" onClick={onCreateProfile}>
                    <Plus className="h-8 w-8 mb-2" />
                    Create Your Profile
                  </Button>
                )}
                {currentUserProfile && onEditProfile && (
                  <Button variant="outline" className="h-24 flex-col" onClick={() => onEditProfile(currentUserProfile)}>
                    <Settings className="h-8 w-8 mb-2" />
                    Edit Profile
                  </Button>
                )}
                <Button variant="outline" className="h-24 flex-col" onClick={() => setSelectedTab('profiles')}>
                  <Users className="h-8 w-8 mb-2" />
                  Browse Profiles
                </Button>
                <Button variant="outline" className="h-24 flex-col" onClick={() => setSelectedTab('analytics')}>
                  <BarChart3 className="h-8 w-8 mb-2" />
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Profiles</CardTitle>
              <CardDescription>Latest profile updates and creations</CardDescription>
            </CardHeader>
            <CardContent>
              {recentProfiles.length > 0 ? (
                <div className="space-y-4">
                  {recentProfiles.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      variant="compact"
                      onEdit={onEditProfile}
                      onView={onViewProfile}
                      showActions={userRole === 'ADMIN'}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No profiles to display.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest profile changes and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {activity.type === 'profile_completed' ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <Clock className="h-6 w-6 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onViewProfile?.(activity.profile)}
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {stats && (userRole === 'ADMIN' || userRole === 'TEACHER') ? (
            <>
              {/* Completion Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Profile Completion Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Overall Completion</span>
                        <span className="text-sm font-medium">{Math.round(stats.completionRate)}%</span>
                      </div>
                      <Progress value={stats.completionRate} className="h-3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Completed: </span>
                        <span className="font-medium">{stats.completedProfiles}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Remaining: </span>
                        <span className="font-medium">{stats.incompleteProfiles}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Ideologies */}
              {stats.topIdeologies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Brain className="h-5 w-5 mr-2" />
                      Popular Ideologies
                    </CardTitle>
                    <CardDescription>Most common political leanings among users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.topIdeologies.map((ideology, index) => (
                        <div key={ideology.ideology} className="flex items-center space-x-4">
                          <div className="flex-shrink-0 w-8">
                            <Badge variant="outline">#{index + 1}</Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium capitalize">
                                {ideology.ideology.replace('_', ' ')}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {ideology.count} users ({Math.round(ideology.percentage)}%)
                              </span>
                            </div>
                            <Progress value={ideology.percentage} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Analytics are only available for teachers and administrators.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
