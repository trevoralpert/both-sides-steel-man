'use client';

/**
 * Phase 3 Task 3.1.4.2: Survey Progress Visualization Components
 * Dynamic progress tracking with milestones and time estimation
 */

import { useState, useEffect } from 'react';
import { SurveyProgress, SurveySession } from '@/types/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  Target, 
  Award,
  TrendingUp,
  Calendar,
  Users,
  Brain,
  Zap,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SurveyProgressProps {
  progress: SurveyProgress;
  session?: SurveySession;
  showMilestones?: boolean;
  showTimeEstimate?: boolean;
  showSectionBreakdown?: boolean;
  className?: string;
}

export function SurveyProgressDisplay({
  progress,
  session,
  showMilestones = true,
  showTimeEstimate = true,
  showSectionBreakdown = true,
  className = '',
}: SurveyProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress.progress_percentage);
    }, 300);
    return () => clearTimeout(timer);
  }, [progress.progress_percentage]);

  const estimatedTimeRemaining = calculateTimeRemaining(progress, session);
  const milestones = getMilestones(progress);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Survey Progress
          </CardTitle>
          <Badge variant={progress.progress_percentage === 100 ? 'default' : 'secondary'}>
            {Math.round(progress.progress_percentage)}% Complete
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {progress.completed_questions} of {progress.total_questions} questions
            </span>
            {showTimeEstimate && estimatedTimeRemaining && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{estimatedTimeRemaining} remaining
              </span>
            )}
          </div>
          
          <Progress 
            value={animatedProgress} 
            className="h-3 transition-all duration-500 ease-out"
          />
        </div>

        {/* Section Breakdown */}
        {showSectionBreakdown && progress.total_sections > 1 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Sections Completed
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Array.from({ length: progress.total_sections }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-xs",
                    i < progress.sections_completed 
                      ? "bg-green-50 border-green-200 text-green-700"
                      : i === progress.sections_completed
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-gray-50 border-gray-200 text-gray-500"
                  )}
                >
                  {i < progress.sections_completed ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border-2" />
                  )}
                  Section {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        {showMilestones && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {milestones.map((milestone, index) => (
                <MilestoneCard key={index} milestone={milestone} />
              ))}
            </div>
          </div>
        )}

        {/* Current Section Info */}
        {progress.current_section && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Currently working on: {progress.current_section}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  achieved: boolean;
  progress: number; // 0-100
  achievedAt?: Date;
}

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
      milestone.achieved 
        ? "bg-green-50 border-green-200" 
        : "bg-gray-50 border-gray-200"
    )}>
      <div className={cn(
        "flex-shrink-0 p-2 rounded-full",
        milestone.achieved ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
      )}>
        {milestone.achieved ? <CheckCircle className="h-4 w-4" /> : milestone.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          milestone.achieved ? "text-green-700" : "text-gray-600"
        )}>
          {milestone.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {milestone.description}
        </p>
        {!milestone.achieved && milestone.progress > 0 && (
          <Progress value={milestone.progress} className="mt-1 h-1" />
        )}
      </div>
    </div>
  );
}

// Helper functions
function calculateTimeRemaining(
  progress: SurveyProgress, 
  session?: SurveySession
): string | null {
  if (!session || progress.completed_questions === 0) return null;

  const sessionDuration = Date.now() - new Date(session.started_at).getTime();
  const avgTimePerQuestion = sessionDuration / progress.completed_questions;
  const remainingQuestions = progress.total_questions - progress.completed_questions;
  const estimatedMs = remainingQuestions * avgTimePerQuestion;

  const minutes = Math.round(estimatedMs / (1000 * 60));
  
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

function getMilestones(progress: SurveyProgress): Milestone[] {
  const milestones: Milestone[] = [
    {
      id: 'started',
      title: 'Survey Started',
      description: 'Began your belief mapping journey',
      icon: <Zap className="h-4 w-4" />,
      achieved: progress.completed_questions > 0,
      progress: progress.completed_questions > 0 ? 100 : 0,
    },
    {
      id: 'quarter',
      title: 'Getting Warmed Up',
      description: 'Completed 25% of questions',
      icon: <TrendingUp className="h-4 w-4" />,
      achieved: progress.progress_percentage >= 25,
      progress: Math.min((progress.progress_percentage / 25) * 100, 100),
    },
    {
      id: 'half',
      title: 'Halfway There!',
      description: 'Reached the halfway point',
      icon: <Target className="h-4 w-4" />,
      achieved: progress.progress_percentage >= 50,
      progress: Math.min(((progress.progress_percentage - 25) / 25) * 100, 100),
    },
    {
      id: 'three_quarters',
      title: 'Almost Done',
      description: 'Only 25% remaining',
      icon: <Award className="h-4 w-4" />,
      achieved: progress.progress_percentage >= 75,
      progress: Math.min(((progress.progress_percentage - 50) / 25) * 100, 100),
    },
    {
      id: 'complete',
      title: 'Survey Master',
      description: 'Completed your belief profile',
      icon: <Trophy className="h-4 w-4" />,
      achieved: progress.progress_percentage >= 100,
      progress: Math.min(((progress.progress_percentage - 75) / 25) * 100, 100),
    },
  ];

  return milestones;
}

// Compact progress component for smaller spaces
export function SurveyProgressCompact({ 
  progress, 
  className = '' 
}: { 
  progress: SurveyProgress; 
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex-1">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{progress.completed_questions}/{progress.total_questions}</span>
          <span>{Math.round(progress.progress_percentage)}%</span>
        </div>
        <Progress value={progress.progress_percentage} className="h-2" />
      </div>
      
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <CheckCircle className="h-3 w-3" />
        <span>{progress.sections_completed}/{progress.total_sections} sections</span>
      </div>
    </div>
  );
}
