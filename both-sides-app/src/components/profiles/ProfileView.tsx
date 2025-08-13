'use client';

import { Profile } from '@/types/profile';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Calendar, 
  CheckCircle, 
  TrendingUp,
  Brain,
  Target,
  BarChart3,
  Clock,
  Shield,
  Activity
} from 'lucide-react';

interface ProfileViewProps {
  profile: Profile;
  className?: string;
  showUserInfo?: boolean;
  showActivitySummary?: boolean;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(user: Profile['user']): string {
  if (!user) return '??';
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username?.[0]?.toUpperCase() || '?';
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'ADMIN': return 'bg-red-100 text-red-800 border-red-200';
    case 'TEACHER': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'STUDENT': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getCompletionPercentage(profile: Profile): number {
  let completedFields = 0;
  let totalFields = 5;

  if (profile.survey_responses) completedFields++;
  if (profile.belief_summary) completedFields++;
  if (profile.ideology_scores) completedFields++;
  if (profile.opinion_plasticity !== null && profile.opinion_plasticity !== undefined) completedFields++;
  if (profile.is_completed) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
}

function getPlasticityLabel(plasticity: number): string {
  if (plasticity >= 0.8) return 'Very Flexible';
  if (plasticity >= 0.6) return 'Flexible';
  if (plasticity >= 0.4) return 'Moderate';
  if (plasticity >= 0.2) return 'Firm';
  return 'Very Firm';
}

export function ProfileView({ 
  profile, 
  className = '',
  showUserInfo = true,
  showActivitySummary = true
}: ProfileViewProps) {
  const completionPercentage = getCompletionPercentage(profile);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* User Header */}
      {showUserInfo && profile.user && (
        <Card>
          <CardHeader>
            <div className="flex items-start space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.user.avatar_url} alt={profile.user.username} />
                <AvatarFallback className="text-xl">{getInitials(profile.user)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">
                  {profile.user.first_name || profile.user.last_name 
                    ? `${profile.user.first_name || ''} ${profile.user.last_name || ''}`.trim()
                    : profile.user.username || 'Unknown User'
                  }
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {profile.user.username && `@${profile.user.username}`}
                </CardDescription>
                <div className="flex items-center space-x-3 mt-3">
                  <Badge variant="outline" className={getRoleColor(profile.user.role)}>
                    <User className="h-3 w-3 mr-1" />
                    {profile.user.role}
                  </Badge>
                  {profile.is_completed ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Profile Complete
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                      <Clock className="h-3 w-3 mr-1" />
                      Profile Incomplete
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Profile Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Profile Completion
          </CardTitle>
          <CardDescription>
            Track your profile setup progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-2xl font-bold text-primary">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-3" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${profile.survey_responses ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Survey Complete</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${profile.belief_summary ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Beliefs Defined</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${profile.ideology_scores ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Ideology Assessed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${profile.opinion_plasticity !== null ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Flexibility Set</span>
            </div>
          </div>

          {profile.completion_date && (
            <div className="flex items-center text-sm text-muted-foreground mt-4">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Completed on {formatDate(profile.completion_date)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Belief Summary */}
      {profile.belief_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2" />
              Belief Summary
            </CardTitle>
            <CardDescription>
              Your personal worldview and core beliefs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {profile.belief_summary}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ideology Scores */}
      {profile.ideology_scores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Ideology Profile
            </CardTitle>
            <CardDescription>
              Your political and philosophical leanings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(profile.ideology_scores).map(([ideology, score], index) => (
                <div key={ideology}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{ideology.replace('_', ' ')}</span>
                    <span className="text-sm font-medium">{Math.round((score as number) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        index % 4 === 0 ? 'bg-blue-500' :
                        index % 4 === 1 ? 'bg-green-500' :
                        index % 4 === 2 ? 'bg-purple-500' : 'bg-orange-500'
                      }`}
                      style={{ 
                        width: `${(score as number) * 100}%`,
                        animationDelay: `${index * 0.1}s`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opinion Plasticity */}
      {profile.opinion_plasticity !== null && profile.opinion_plasticity !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Opinion Flexibility
            </CardTitle>
            <CardDescription>
              How open you are to changing your mind
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Flexibility Level</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(profile.opinion_plasticity * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getPlasticityLabel(profile.opinion_plasticity)}
                  </div>
                </div>
              </div>
              <Progress value={profile.opinion_plasticity * 100} className="h-3" />
              
              <div className="grid grid-cols-5 text-xs text-center text-muted-foreground">
                <span>Very Firm</span>
                <span>Firm</span>
                <span>Moderate</span>
                <span>Flexible</span>
                <span>Very Flexible</span>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  {profile.opinion_plasticity >= 0.7 
                    ? "You're very open to new perspectives and willing to change your views when presented with compelling evidence."
                    : profile.opinion_plasticity >= 0.5 
                    ? "You have a balanced approach, considering new information while maintaining your core beliefs."
                    : profile.opinion_plasticity >= 0.3
                    ? "You tend to hold firm views but can be persuaded with strong evidence."
                    : "You have strong convictions and rarely change your fundamental beliefs."
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Survey Responses */}
      {profile.survey_responses && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Survey Responses
            </CardTitle>
            <CardDescription>
              Your detailed responses to the belief assessment survey
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.survey_responses.questions && profile.survey_responses.answers ? (
              <div className="space-y-4">
                {profile.survey_responses.questions.map((question: string, index: number) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Q{index + 1}: {question}
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {profile.survey_responses.answers[index] || 'No response provided'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Survey data is not available in a readable format.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Summary */}
      {showActivitySummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Profile Version</span>
                  <Badge variant="outline">v{profile.profile_version}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(profile.created_at)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{formatDateTime(profile.last_updated)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Profile ID</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {profile.id.slice(-8)}
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
