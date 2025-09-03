/**
 * Achievement Showcase Component
 * 
 * Task 7.5.1: Displays achievements, badges, milestones, and celebration
 * features to motivate and recognize student learning progress.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Medal, 
  Star, 
  Crown, 
  Zap, 
  Target, 
  Calendar,
  CheckCircle2,
  Gift,
  Sparkles,
  Share,
  Download,
  Lock,
  Clock,
  TrendingUp,
  Award,
  Users,
  MessageSquare,
  Brain,
  BookOpen,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  icon: string;
  points: number;
  requirements: string[];
  progress?: number; // For achievements in progress
  unlocked: boolean;
  celebrationShown?: boolean;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  progress: number;
  category: string;
  rewards: string[];
  requirements: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

interface AchievementShowcaseProps {
  achievements: Achievement[];
  milestones: Milestone[];
  className?: string;
}

export function AchievementShowcase({ achievements, milestones, className }: AchievementShowcaseProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [activeTab, setActiveTab] = useState('earned');
  const [showCelebration, setShowCelebration] = useState(false);

  // Categorize achievements
  const earnedAchievements = achievements.filter(a => a.unlocked && a.earnedAt);
  const inProgressAchievements = achievements.filter(a => a.unlocked && !a.earnedAt && (a.progress || 0) > 0);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  // Categorize milestones
  const completedMilestones = milestones.filter(m => m.completed);
  const inProgressMilestones = milestones.filter(m => !m.completed && m.progress > 0);
  const upcomingMilestones = milestones.filter(m => !m.completed && m.progress === 0);

  // Calculate total points
  const totalPoints = earnedAchievements.reduce((sum, achievement) => sum + achievement.points, 0);

  // Group by rarity
  const achievementsByRarity = useMemo(() => {
    const grouped = earnedAchievements.reduce((acc, achievement) => {
      if (!acc[achievement.rarity]) acc[achievement.rarity] = [];
      acc[achievement.rarity].push(achievement);
      return acc;
    }, {} as Record<string, Achievement[]>);

    return grouped;
  }, [earnedAchievements]);

  // Recent achievements (last 30 days)
  const recentAchievements = earnedAchievements.filter(achievement => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return achievement.earnedAt >= thirtyDaysAgo;
  });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Achievements & Milestones</h2>
            <p className="text-muted-foreground">
              Celebrate your learning journey and accomplishments
            </p>
          </div>
          <Button variant="outline">
            <Share className="h-4 w-4 mr-2" />
            Share Progress
          </Button>
        </div>

        {/* Achievement Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">{earnedAchievements.length}</div>
                  <div className="text-xs text-muted-foreground">Achievements</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{completedMilestones.length}</div>
                  <div className="text-xs text-muted-foreground">Milestones</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{recentAchievements.length}</div>
                  <div className="text-xs text-muted-foreground">This Month</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="earned">
            Earned ({earnedAchievements.length})
          </TabsTrigger>
          <TabsTrigger value="progress">
            In Progress ({inProgressAchievements.length + inProgressMilestones.length})
          </TabsTrigger>
          <TabsTrigger value="milestones">
            Milestones ({milestones.length})
          </TabsTrigger>
          <TabsTrigger value="locked">
            Locked ({lockedAchievements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earned" className="space-y-6">
          <EarnedAchievements
            achievements={earnedAchievements}
            achievementsByRarity={achievementsByRarity}
            recentAchievements={recentAchievements}
            onViewDetails={setSelectedAchievement}
          />
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <ProgressSection
            achievements={inProgressAchievements}
            milestones={inProgressMilestones}
            onViewAchievement={setSelectedAchievement}
            onViewMilestone={setSelectedMilestone}
          />
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <MilestoneSection
            completedMilestones={completedMilestones}
            inProgressMilestones={inProgressMilestones}
            upcomingMilestones={upcomingMilestones}
            onViewDetails={setSelectedMilestone}
          />
        </TabsContent>

        <TabsContent value="locked" className="space-y-6">
          <LockedAchievements
            achievements={lockedAchievements}
            onViewDetails={setSelectedAchievement}
          />
        </TabsContent>
      </Tabs>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementDetailDialog
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
        <MilestoneDetailDialog
          milestone={selectedMilestone}
          onClose={() => setSelectedMilestone(null)}
        />
      )}
    </div>
  );
}

interface EarnedAchievementsProps {
  achievements: Achievement[];
  achievementsByRarity: Record<string, Achievement[]>;
  recentAchievements: Achievement[];
  onViewDetails: (achievement: Achievement) => void;
}

function EarnedAchievements({ 
  achievements, 
  achievementsByRarity, 
  recentAchievements,
  onViewDetails 
}: EarnedAchievementsProps) {
  return (
    <div className="space-y-6">
      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <span>Recent Achievements</span>
              <Badge variant="secondary">{recentAchievements.length}</Badge>
            </CardTitle>
            <CardDescription>Your latest accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  onClick={() => onViewDetails(achievement)}
                  showGlow
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements by Rarity */}
      {Object.entries(achievementsByRarity).map(([rarity, rarityAchievements]) => (
        <Card key={rarity}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getRarityIcon(rarity)}
              <span className="capitalize">{rarity} Achievements</span>
              <Badge variant="secondary">{rarityAchievements.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rarityAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  onClick={() => onViewDetails(achievement)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {achievements.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Achievements Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start participating in debates to unlock your first achievement
            </p>
            <Button>Find Debate Partners</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ProgressSectionProps {
  achievements: Achievement[];
  milestones: Milestone[];
  onViewAchievement: (achievement: Achievement) => void;
  onViewMilestone: (milestone: Milestone) => void;
}

function ProgressSection({ achievements, milestones, onViewAchievement, onViewMilestone }: ProgressSectionProps) {
  return (
    <div className="space-y-6">
      {/* In Progress Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Achievements In Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {achievements.map((achievement) => (
                <ProgressAchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  onClick={() => onViewAchievement(achievement)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* In Progress Milestones */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Milestones In Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <ProgressMilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onClick={() => onViewMilestone(milestone)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {achievements.length === 0 && milestones.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nothing In Progress</h3>
            <p className="text-sm text-muted-foreground">
              Keep participating to unlock more achievements and milestones
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
  onClick: () => void;
  showGlow?: boolean;
  locked?: boolean;
}

function AchievementCard({ achievement, onClick, showGlow = false, locked = false }: AchievementCardProps) {
  const getRarityGradient = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500';
      case 'epic': return 'bg-gradient-to-br from-purple-400 via-pink-500 to-purple-600';
      case 'rare': return 'bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600';
      case 'common': return 'bg-gradient-to-br from-green-400 to-green-600';
      default: return 'bg-gradient-to-br from-gray-400 to-gray-600';
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
        showGlow && "ring-2 ring-yellow-400 ring-opacity-50 shadow-lg",
        locked && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !locked && onClick()}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${getRarityGradient(achievement.rarity)}`}>
            {locked ? (
              <Lock className="h-6 w-6" />
            ) : (
              <span className="text-lg">{achievement.icon || '🏆'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{achievement.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {achievement.description}
            </p>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="outline" className="text-xs capitalize">
                {achievement.rarity}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
                <Star className="h-3 w-3 mr-1" />
                {achievement.points}
              </div>
            </div>
          </div>
        </div>
        {achievement.earnedAt && (
          <div className="mt-2 text-xs text-muted-foreground">
            Earned {achievement.earnedAt.toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProgressAchievementCardProps {
  achievement: Achievement;
  onClick: () => void;
}

function ProgressAchievementCard({ achievement, onClick }: ProgressAchievementCardProps) {
  const progress = achievement.progress || 0;

  return (
    <div 
      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-lg">{achievement.icon || '🏆'}</span>
          </div>
          <div>
            <h3 className="font-medium">{achievement.title}</h3>
            <p className="text-sm text-muted-foreground">{achievement.description}</p>
          </div>
        </div>
        <Badge variant="outline" className="capitalize">
          {achievement.rarity}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <Progress value={progress * 100} className="h-2" />
      </div>

      {achievement.requirements.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium mb-1">Requirements:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {achievement.requirements.slice(0, 2).map((req, index) => (
              <li key={index}>• {req}</li>
            ))}
            {achievement.requirements.length > 2 && (
              <li>• +{achievement.requirements.length - 2} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

interface MilestoneDetailDialogProps {
  milestone: Milestone;
  onClose: () => void;
}

function MilestoneDetailDialog({ milestone, onClose }: MilestoneDetailDialogProps) {
  return (
    <Dialog open={!!milestone} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {milestone.completed ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <Target className="h-6 w-6 text-blue-500" />
            )}
            <span>{milestone.title}</span>
          </DialogTitle>
          <DialogDescription>{milestone.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!milestone.completed && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(milestone.progress * 100)}%</span>
              </div>
              <Progress value={milestone.progress * 100} className="h-3" />
            </div>
          )}

          {milestone.requirements.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Requirements</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {milestone.requirements.map((req, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {milestone.rewards.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Rewards</h4>
              <div className="flex flex-wrap gap-2">
                {milestone.rewards.map((reward, index) => (
                  <Badge key={index} variant="secondary">
                    <Gift className="h-3 w-3 mr-1" />
                    {reward}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {milestone.completed && milestone.completedAt && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Completed on {milestone.completedAt.toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {milestone.completed && (
            <Button>
              <Share className="h-4 w-4 mr-2" />
              Share Achievement
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function implementations would go here...
function getRarityIcon(rarity: string) {
  switch (rarity) {
    case 'legendary': return <Crown className="h-5 w-5 text-yellow-500" />;
    case 'epic': return <Medal className="h-5 w-5 text-purple-500" />;
    case 'rare': return <Trophy className="h-5 w-5 text-blue-500" />;
    case 'common': return <Star className="h-5 w-5 text-green-500" />;
    default: return <Award className="h-5 w-5 text-gray-500" />;
  }
}

// Additional component implementations...
function MilestoneSection({ completedMilestones, inProgressMilestones, upcomingMilestones, onViewDetails }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="font-medium mb-2">Milestone System</h3>
            <p className="text-sm text-muted-foreground">
              Complete learning challenges to unlock rewards and track your progress
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressMilestoneCard({ milestone, onClick }: any) {
  return (
    <div className="border rounded-lg p-4 cursor-pointer" onClick={onClick}>
      <h3 className="font-medium">{milestone.title}</h3>
      <Progress value={milestone.progress * 100} className="mt-2" />
    </div>
  );
}

function LockedAchievements({ achievements, onViewDetails }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="text-center py-8">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Locked Achievements</h3>
          <p className="text-sm text-muted-foreground">
            Complete more activities to unlock these achievements
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AchievementDetailDialog({ achievement, onClose }: any) {
  return (
    <Dialog open={!!achievement} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{achievement.title}</DialogTitle>
          <DialogDescription>{achievement.description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
