'use client';

/**
 * Phase 3 Task 3.1.4.3: Survey Completion Incentives and Gamification
 * Badge system, achievements, and completion motivation
 */

import { useState, useEffect } from 'react';
import { SurveyProgress, SurveyResults } from '@/types/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Award, 
  Star, 
  Zap, 
  Target, 
  Brain,
  Users,
  Clock,
  CheckCircle,
  Sparkles,
  Medal,
  Crown,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number; // 0-100 for partially unlocked achievements
}

interface SurveyGamificationProps {
  progress: SurveyProgress;
  results?: SurveyResults;
  userStats?: any;
  className?: string;
}

export function SurveyGamification({
  progress,
  results,
  userStats,
  className = '',
}: SurveyGamificationProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    const userAchievements = calculateAchievements(progress, results, userStats);
    setAchievements(userAchievements);
    setTotalPoints(userAchievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0));
  }, [progress, results, userStats]);

  // Check for newly unlocked achievements
  useEffect(() => {
    const newlyUnlocked = achievements.filter(a => 
      a.unlocked && (!a.unlockedAt || Date.now() - new Date(a.unlockedAt).getTime() < 1000)
    );
    
    if (newlyUnlocked.length > 0) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);
    }
  }, [achievements]);

  const rarityConfig = {
    common: { color: 'bg-gray-100 text-gray-700', border: 'border-gray-300' },
    uncommon: { color: 'bg-green-100 text-green-700', border: 'border-green-300' },
    rare: { color: 'bg-blue-100 text-blue-700', border: 'border-blue-300' },
    epic: { color: 'bg-purple-100 text-purple-700', border: 'border-purple-300' },
    legendary: { color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-300' },
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Achievement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Your Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalPoints}</div>
              <div className="text-xs text-muted-foreground">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {achievements.filter(a => a.unlocked).length}
              </div>
              <div className="text-xs text-muted-foreground">Badges Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(progress.progress_percentage)}%
              </div>
              <div className="text-xs text-muted-foreground">Survey Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {getUserRank(totalPoints)}
              </div>
              <div className="text-xs text-muted-foreground">Current Rank</div>
            </div>
          </div>

          {/* Achievement Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {achievements.map((achievement) => (
              <AchievementCard 
                key={achievement.id} 
                achievement={achievement} 
                rarityConfig={rarityConfig}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Celebration Animation */}
      {showCelebration && (
        <CelebrationOverlay 
          achievements={achievements.filter(a => a.unlocked && a.unlockedAt)}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* Progress Incentives */}
      <ProgressIncentives progress={progress} achievements={achievements} />
    </div>
  );
}

function AchievementCard({ 
  achievement, 
  rarityConfig 
}: { 
  achievement: Achievement; 
  rarityConfig: any;
}) {
  const config = rarityConfig[achievement.rarity];
  
  return (
    <div className={cn(
      "p-4 rounded-lg border-2 transition-all duration-200",
      achievement.unlocked 
        ? `${config.color} ${config.border} shadow-sm`
        : "bg-gray-50 border-gray-200 opacity-60"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full",
          achievement.unlocked ? "bg-white/50" : "bg-gray-200"
        )}>
          {achievement.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{achievement.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {achievement.description}
          </p>
          
          {achievement.unlocked ? (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                +{achievement.points} pts
              </Badge>
              {achievement.unlockedAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : achievement.progress !== undefined ? (
            <div className="mt-2">
              <Progress value={achievement.progress} className="h-1" />
              <span className="text-xs text-muted-foreground">
                {Math.round(achievement.progress)}% complete
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CelebrationOverlay({ 
  achievements, 
  onClose 
}: { 
  achievements: Achievement[]; 
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">Achievement Unlocked!</h2>
          
          {achievements.map((achievement) => (
            <div key={achievement.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg mb-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                {achievement.icon}
              </div>
              <div className="text-left">
                <p className="font-medium">{achievement.title}</p>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
              </div>
              <Badge className="ml-auto">+{achievement.points}</Badge>
            </div>
          ))}
          
          <Button onClick={onClose} className="mt-4">
            Continue Survey
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressIncentives({ 
  progress, 
  achievements 
}: { 
  progress: SurveyProgress; 
  achievements: Achievement[];
}) {
  const nextMilestone = achievements.find(a => !a.unlocked && a.progress !== undefined);
  const upcomingBadges = achievements.filter(a => !a.unlocked).slice(0, 3);

  if (progress.progress_percentage >= 100) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Belief Mapping Complete! 👑</h3>
          <p className="text-muted-foreground mb-4">
            You've unlocked your complete belief profile and earned all available badges.
          </p>
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
            View Your Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          What's Next
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextMilestone && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-full">
                {nextMilestone.icon}
              </div>
              <div>
                <h4 className="font-medium">{nextMilestone.title}</h4>
                <p className="text-sm text-muted-foreground">{nextMilestone.description}</p>
              </div>
            </div>
            <Progress value={nextMilestone.progress || 0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(nextMilestone.progress || 0)}% complete
            </p>
          </div>
        )}

        {upcomingBadges.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Upcoming Badges:</h4>
            <div className="grid grid-cols-3 gap-2">
              {upcomingBadges.map((badge) => (
                <div key={badge.id} className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-gray-400 mb-1">{badge.icon}</div>
                  <p className="text-xs font-medium text-gray-600">{badge.title}</p>
                  <p className="text-xs text-gray-500">+{badge.points} pts</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions
function calculateAchievements(
  progress: SurveyProgress, 
  results?: SurveyResults,
  userStats?: any
): Achievement[] {
  const now = new Date();
  
  return [
    {
      id: 'first_response',
      title: 'First Step',
      description: 'Answered your first question',
      icon: <Zap className="h-4 w-4" />,
      rarity: 'common',
      points: 10,
      unlocked: progress.completed_questions > 0,
      unlockedAt: progress.completed_questions > 0 ? now : undefined,
    },
    {
      id: 'quick_start',
      title: 'Quick Starter',
      description: 'Completed 5 questions rapidly',
      icon: <Flame className="h-4 w-4" />,
      rarity: 'uncommon',
      points: 25,
      unlocked: progress.completed_questions >= 5,
      progress: Math.min((progress.completed_questions / 5) * 100, 100),
    },
    {
      id: 'halfway_hero',
      title: 'Halfway Hero',
      description: 'Reached 50% completion',
      icon: <Target className="h-4 w-4" />,
      rarity: 'rare',
      points: 50,
      unlocked: progress.progress_percentage >= 50,
      progress: Math.min((progress.progress_percentage / 50) * 100, 100),
    },
    {
      id: 'section_master',
      title: 'Section Master',
      description: 'Completed an entire section',
      icon: <CheckCircle className="h-4 w-4" />,
      rarity: 'uncommon',
      points: 30,
      unlocked: progress.sections_completed > 0,
      progress: progress.sections_completed > 0 ? 100 : 0,
    },
    {
      id: 'thoughtful_responder',
      title: 'Thoughtful Responder',
      description: 'High confidence in responses',
      icon: <Brain className="h-4 w-4" />,
      rarity: 'rare',
      points: 40,
      unlocked: results?.quality_metrics.average_confidence >= 4,
      progress: results ? Math.min((results.quality_metrics.average_confidence / 4) * 100, 100) : 0,
    },
    {
      id: 'survey_champion',
      title: 'Survey Champion',
      description: 'Completed the entire survey',
      icon: <Crown className="h-4 w-4" />,
      rarity: 'epic',
      points: 100,
      unlocked: progress.progress_percentage >= 100,
      progress: progress.progress_percentage,
    },
    {
      id: 'belief_explorer',
      title: 'Belief Explorer',
      description: 'Explored diverse topics thoughtfully',
      icon: <Sparkles className="h-4 w-4" />,
      rarity: 'rare',
      points: 60,
      unlocked: results?.responses_by_category && 
                Object.keys(results.responses_by_category).length >= 4,
      progress: results?.responses_by_category ? 
                (Object.keys(results.responses_by_category).length / 4) * 100 : 0,
    },
    {
      id: 'quality_contributor',
      title: 'Quality Contributor',
      description: 'Consistently high-quality responses',
      icon: <Medal className="h-4 w-4" />,
      rarity: 'epic',
      points: 75,
      unlocked: results?.quality_metrics.response_quality_score >= 85,
      progress: results ? Math.min((results.quality_metrics.response_quality_score / 85) * 100, 100) : 0,
    },
  ];
}

function getUserRank(totalPoints: number): string {
  if (totalPoints >= 300) return 'Philosopher';
  if (totalPoints >= 200) return 'Thinker';
  if (totalPoints >= 100) return 'Explorer';
  if (totalPoints >= 50) return 'Seeker';
  return 'Newcomer';
}

// Leaderboard component for class comparison
export function SurveyLeaderboard({ 
  classStats, 
  currentUserStats,
  className = '' 
}: {
  classStats?: any[];
  currentUserStats?: any;
  className?: string;
}) {
  if (!classStats || classStats.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Class Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {classStats.slice(0, 5).map((student, index) => (
            <div key={student.id} className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                index === 0 ? "bg-yellow-100 text-yellow-700" :
                index === 1 ? "bg-gray-100 text-gray-700" :
                index === 2 ? "bg-orange-100 text-orange-700" :
                "bg-blue-50 text-blue-600"
              )}>
                {index + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className={cn(
                    "font-medium text-sm",
                    student.id === currentUserStats?.id ? "text-blue-600" : ""
                  )}>
                    {student.id === currentUserStats?.id ? "You" : "Anonymous"}
                  </span>
                  <Badge variant="outline">{student.completion_percentage}%</Badge>
                </div>
                <Progress value={student.completion_percentage} className="h-1 mt-1" />
              </div>
            </div>
          ))}
        </div>
        
        {currentUserStats && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Your Position:</strong> #{classStats.findIndex(s => s.id === currentUserStats.id) + 1} 
              {' '}of {classStats.length} students
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Completion certificate component
export function CompletionCertificate({ 
  results,
  achievements,
  onDownload,
  onShare,
  className = '' 
}: {
  results: SurveyResults;
  achievements: Achievement[];
  onDownload?: () => void;
  onShare?: () => void;
  className?: string;
}) {
  const completedBadges = achievements.filter(a => a.unlocked);
  const totalPoints = completedBadges.reduce((sum, a) => sum + a.points, 0);
  const rank = getUserRank(totalPoints);

  return (
    <Card className={cn("bg-gradient-to-br from-blue-50 to-purple-50", className)}>
      <CardContent className="text-center py-8">
        <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        
        <h2 className="text-2xl font-bold mb-2">Belief Mapping Complete!</h2>
        <p className="text-muted-foreground mb-6">
          You've successfully completed your ideological profile mapping
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalPoints}</div>
            <div className="text-sm text-muted-foreground">Points Earned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedBadges.length}</div>
            <div className="text-sm text-muted-foreground">Badges Unlocked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{rank}</div>
            <div className="text-sm text-muted-foreground">Final Rank</div>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          {onDownload && (
            <Button variant="outline" onClick={onDownload}>
              Download Certificate
            </Button>
          )}
          {onShare && (
            <Button onClick={onShare}>
              Share Achievement
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
