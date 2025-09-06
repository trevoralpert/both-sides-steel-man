'use client';

import { useState } from 'react';

import { Profile, ProfileVariant } from '@/types/profile';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Calendar, 
  CheckCircle, 
  Edit, 
  Eye,
  MoreHorizontal,
  TrendingUp,
  Brain
} from 'lucide-react';

interface ProfileCardProps {
  profile: Profile;
  variant?: ProfileVariant;
  onEdit?: (profile: Profile) => void;
  onView?: (profile: Profile) => void;
  onDelete?: (profile: Profile) => void;
  onClick?: (profile: Profile) => void;
  className?: string;
  showActions?: boolean;
  isCurrentUser?: boolean;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(user: Profile['user']): string {
  if (!user) return '??';
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username?.[0]?.toUpperCase() || '?';
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'ADMIN': return 'bg-red-100 text-red-800';
    case 'TEACHER': return 'bg-blue-100 text-blue-800';
    case 'STUDENT': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getCompletionPercentage(profile: Profile): number {
  let completedFields = 0;
  const totalFields = 5;

  if (profile.survey_responses) completedFields++;
  if (profile.belief_summary) completedFields++;
  if (profile.ideology_scores) completedFields++;
  if (profile.opinion_plasticity !== null && profile.opinion_plasticity !== undefined) completedFields++;
  if (profile.is_completed) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
}

function getDominantIdeology(ideologyScores?: Profile['ideology_scores']): string {
  if (!ideologyScores) return 'Not assessed';
  
  let maxScore = 0;
  let dominant = 'Moderate';
  
  Object.entries(ideologyScores).forEach(([ideology, score]) => {
    if (typeof score === 'number' && score > maxScore) {
      maxScore = score;
      dominant = ideology.charAt(0).toUpperCase() + ideology.slice(1);
    }
  });
  
  return dominant;
}

export function ProfileCard({ 
  profile, 
  variant = 'compact',
  onEdit,
  onView,
  onDelete,
  onClick,
  className = '',
  showActions = true,
  isCurrentUser = false
}: ProfileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const completionPercentage = getCompletionPercentage(profile);
  const dominantIdeology = getDominantIdeology(profile.ideology_scores);

  if (variant === 'compact') {
    return (
      <Card 
        className={`hover:shadow-md transition-shadow ${className} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={() => onClick?.(profile)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.user?.avatar_url} alt={profile.user?.username} />
                <AvatarFallback>{getInitials(profile.user)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-sm font-medium">
                  {profile.user?.first_name || profile.user?.last_name 
                    ? `${profile.user.first_name || ''} ${profile.user.last_name || ''}`.trim()
                    : profile.user?.username || 'Unknown User'
                  }
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className={getRoleColor(profile.user?.role || 'STUDENT')}>
                    {profile.user?.role || 'Student'}
                  </Badge>
                  {profile.is_completed && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            </div>
            {showActions && (
              <div className="flex items-center space-x-1">
                {onView && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onView(profile)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {onEdit && (isCurrentUser || profile.user?.role !== 'ADMIN') && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onEdit(profile)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ideology</span>
              <span className="font-medium">{dominantIdeology}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card 
        className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={() => onClick?.(profile)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.user?.avatar_url} alt={profile.user?.username} />
                <AvatarFallback className="text-lg">{getInitials(profile.user)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">
                  {profile.user?.first_name || profile.user?.last_name 
                    ? `${profile.user.first_name || ''} ${profile.user.last_name || ''}`.trim()
                    : profile.user?.username || 'Unknown User'
                  }
                </CardTitle>
                <CardDescription className="mt-1">
                  {profile.user?.username && `@${profile.user.username}`}
                </CardDescription>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getRoleColor(profile.user?.role || 'STUDENT')}>
                    {profile.user?.role || 'Student'}
                  </Badge>
                  {profile.is_completed && (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {showActions && (
              <div className="flex items-center space-x-2">
                {onView && (
                  <Button variant="outline" size="sm" onClick={() => onView(profile)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                )}
                {onEdit && (isCurrentUser || profile.user?.role !== 'ADMIN') && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(profile)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Profile Completion */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Profile Completion
              </h4>
              <span className="text-sm font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {/* Belief Summary */}
          {profile.belief_summary && (
            <div>
              <h4 className="font-medium mb-2 flex items-center">
                <Brain className="h-4 w-4 mr-2" />
                Belief Summary
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {profile.belief_summary}
              </p>
            </div>
          )}

          {/* Ideology Scores */}
          {profile.ideology_scores && (
            <div>
              <h4 className="font-medium mb-2">Ideology Profile</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(profile.ideology_scores).map(([ideology, score]) => (
                  <div key={ideology} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{ideology}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(score as number) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">
                        {Math.round((score as number) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opinion Plasticity */}
          {profile.opinion_plasticity !== null && profile.opinion_plasticity !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Opinion Flexibility</h4>
                <span className="text-sm font-medium">
                  {Math.round(profile.opinion_plasticity * 100)}%
                </span>
              </div>
              <Progress value={profile.opinion_plasticity * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                How open you are to changing your views
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="text-sm text-muted-foreground">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Created {formatDate(profile.created_at)}
              </span>
              {profile.last_updated !== profile.created_at && (
                <span>Updated {formatDate(profile.last_updated)}</span>
              )}
            </div>
            <span>v{profile.profile_version}</span>
          </div>
        </CardFooter>
      </Card>
    );
  }

  // Editable variant (similar to detailed but with inline editing capabilities)
  return (
    <Card 
      className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={() => onClick?.(profile)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.user?.avatar_url} alt={profile.user?.username} />
              <AvatarFallback className="text-lg">{getInitials(profile.user)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">
                {profile.user?.first_name || profile.user?.last_name 
                  ? `${profile.user.first_name || ''} ${profile.user.last_name || ''}`.trim()
                  : profile.user?.username || 'Unknown User'
                }
              </CardTitle>
              <CardDescription className="mt-1">
                {profile.user?.username && `@${profile.user.username}`}
              </CardDescription>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={getRoleColor(profile.user?.role || 'STUDENT')}>
                  {profile.user?.role || 'Student'}
                </Badge>
                {profile.is_completed && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Profile Completion: {completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="w-32 h-2" />
          </div>
          
          {isExpanded && (
            <>
              {profile.belief_summary && (
                <div>
                  <h4 className="font-medium mb-1">Belief Summary</h4>
                  <p className="text-sm text-muted-foreground">{profile.belief_summary}</p>
                </div>
              )}
              
              {profile.ideology_scores && (
                <div>
                  <h4 className="font-medium mb-2">Ideology Scores</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(profile.ideology_scores).map(([ideology, score]) => (
                      <div key={ideology} className="flex justify-between">
                        <span className="capitalize">{ideology}:</span>
                        <span>{Math.round((score as number) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex justify-between items-center w-full">
          <span className="text-sm text-muted-foreground">
            Last updated: {formatDate(profile.last_updated)}
          </span>
          {showActions && onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(profile)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit Profile
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
