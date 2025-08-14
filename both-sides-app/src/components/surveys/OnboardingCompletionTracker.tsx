/**
 * Phase 3 Task 3.3.4.1: Create Completion Milestone Tracking
 * Track survey section completion with timestamps, engagement patterns, and quality scores
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trophy,
  Award,
  Target,
  Clock,
  TrendingUp,
  CheckCircle2,
  Star,
  Zap,
  Calendar,
  BarChart3,
  Activity,
  Users,
  Medal,
  Gift,
  Sparkles
} from 'lucide-react';

// Completion Tracking Types
interface CompletionMilestone {
  id: string;
  name: string;
  description: string;
  type: 'section' | 'overall' | 'engagement' | 'quality';
  threshold: number; // 0-100 for percentage thresholds
  icon: React.ElementType;
  color: string;
  points: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  requirements: string[];
}

interface CompletionCertificate {
  id: string;
  userId: string;
  type: 'onboarding_complete' | 'section_master' | 'engagement_champion' | 'quality_achiever';
  title: string;
  description: string;
  issuedAt: Date;
  validUntil?: Date;
  metadata: {
    completionPercentage: number;
    timeToComplete: number; // milliseconds
    qualityScore: number; // 0-100
    engagementLevel: 'low' | 'medium' | 'high';
    sectionsCompleted: string[];
  };
}

interface UserEngagement {
  userId: string;
  sessionId: string;
  totalTimeSpent: number;
  sectionsVisited: string[];
  questionsAnswered: number;
  questionsSkipped: number;
  averageTimePerQuestion: number;
  dropoffPoints: string[];
  resumeCount: number;
  deviceSwitches: number;
  qualityMetrics: {
    responseConsistency: number; // 0-1
    thoughtfulness: number; // 0-1 based on text length and complexity
    completionSpeed: number; // 0-1 (too fast = lower score)
  };
  engagementScore: number; // 0-100 composite score
}

interface OnboardingCompletionTrackerProps {
  userId?: string;
  onMilestoneReached?: (milestone: CompletionMilestone) => void;
  onCertificateEarned?: (certificate: CompletionCertificate) => void;
  className?: string;
}

export function OnboardingCompletionTracker({
  userId,
  onMilestoneReached,
  onCertificateEarned,
  className = ''
}: OnboardingCompletionTrackerProps) {
  const { getToken, user } = useAuth();
  
  // State Management
  const [milestones, setMilestones] = useState<CompletionMilestone[]>([]);
  const [certificates, setCertificates] = useState<CompletionCertificate[]>([]);
  const [engagement, setEngagement] = useState<UserEngagement | null>(null);
  const [completionStats, setCompletionStats] = useState<{
    overallProgress: number;
    sectionsCompleted: number;
    totalSections: number;
    qualityScore: number;
    engagementLevel: string;
    timeSpent: number;
    estimatedCompletion: Date | null;
  } | null>(null);

  // Define milestone configuration
  const milestoneDefinitions: CompletionMilestone[] = [
    {
      id: 'first_step',
      name: 'First Steps',
      description: 'Started the onboarding journey',
      type: 'overall',
      threshold: 5,
      icon: Zap,
      color: 'blue',
      points: 10,
      isUnlocked: false,
      requirements: ['Complete welcome section']
    },
    {
      id: 'quarter_complete',
      name: 'Getting Started',
      description: 'Completed 25% of onboarding',
      type: 'overall',
      threshold: 25,
      icon: Target,
      color: 'green',
      points: 25,
      isUnlocked: false,
      requirements: ['Complete 25% of onboarding sections']
    },
    {
      id: 'halfway_hero',
      name: 'Halfway Hero',
      description: 'Reached the halfway point',
      type: 'overall',
      threshold: 50,
      icon: Medal,
      color: 'yellow',
      points: 50,
      isUnlocked: false,
      requirements: ['Complete 50% of onboarding sections']
    },
    {
      id: 'almost_there',
      name: 'Almost There',
      description: 'Nearly finished with onboarding',
      type: 'overall',
      threshold: 75,
      icon: Star,
      color: 'orange',
      points: 75,
      isUnlocked: false,
      requirements: ['Complete 75% of onboarding sections']
    },
    {
      id: 'completion_champion',
      name: 'Completion Champion',
      description: 'Completed the full onboarding experience',
      type: 'overall',
      threshold: 100,
      icon: Trophy,
      color: 'purple',
      points: 100,
      isUnlocked: false,
      requirements: ['Complete all onboarding sections']
    },
    {
      id: 'quality_master',
      name: 'Quality Master',
      description: 'High-quality responses throughout',
      type: 'quality',
      threshold: 85,
      icon: Award,
      color: 'indigo',
      points: 50,
      isUnlocked: false,
      requirements: ['Maintain 85%+ quality score']
    },
    {
      id: 'engagement_expert',
      name: 'Engagement Expert',
      description: 'Highly engaged throughout the process',
      type: 'engagement',
      threshold: 80,
      icon: Activity,
      color: 'pink',
      points: 40,
      isUnlocked: false,
      requirements: ['Maintain high engagement score']
    },
    {
      id: 'speed_learner',
      name: 'Speed Learner',
      description: 'Completed onboarding efficiently',
      type: 'engagement',
      threshold: 90,
      icon: Sparkles,
      color: 'cyan',
      points: 30,
      isUnlocked: false,
      requirements: ['Complete onboarding in optimal time']
    }
  ];

  useEffect(() => {
    loadCompletionData();
    setMilestones(milestoneDefinitions);
  }, [userId]);

  // Simulate completion tracking (in real app, this would come from API)
  const loadCompletionData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // Mock data - in real implementation, this would come from backend
      const mockEngagement: UserEngagement = {
        userId: user?.id || '',
        sessionId: 'session_123',
        totalTimeSpent: 380000, // ~6.3 minutes
        sectionsVisited: ['welcome', 'purpose', 'how-it-works', 'privacy'],
        questionsAnswered: 12,
        questionsSkipped: 2,
        averageTimePerQuestion: 31667, // ~32 seconds
        dropoffPoints: ['expectations'],
        resumeCount: 1,
        deviceSwitches: 0,
        qualityMetrics: {
          responseConsistency: 0.85,
          thoughtfulness: 0.78,
          completionSpeed: 0.82
        },
        engagementScore: 82
      };

      setEngagement(mockEngagement);

      // Calculate completion stats
      const stats = {
        overallProgress: 75, // 75% complete
        sectionsCompleted: 4,
        totalSections: 5,
        qualityScore: Math.round((mockEngagement.qualityMetrics.responseConsistency + 
                                mockEngagement.qualityMetrics.thoughtfulness + 
                                mockEngagement.qualityMetrics.completionSpeed) * 100 / 3),
        engagementLevel: mockEngagement.engagementScore >= 80 ? 'high' : 
                        mockEngagement.engagementScore >= 60 ? 'medium' : 'low',
        timeSpent: mockEngagement.totalTimeSpent,
        estimatedCompletion: new Date(Date.now() + 5 * 60000) // 5 minutes from now
      };

      setCompletionStats(stats);
      
      // Check for milestone unlocks
      checkMilestoneProgress(stats, mockEngagement);

    } catch (error) {
      console.error('Failed to load completion data:', error);
    }
  }, [userId, user, getToken]);

  const checkMilestoneProgress = (stats: any, engagement: UserEngagement) => {
    const updatedMilestones = milestones.map(milestone => {
      let shouldUnlock = false;
      
      switch (milestone.type) {
        case 'overall':
          shouldUnlock = stats.overallProgress >= milestone.threshold;
          break;
        case 'quality':
          shouldUnlock = stats.qualityScore >= milestone.threshold;
          break;
        case 'engagement':
          shouldUnlock = engagement.engagementScore >= milestone.threshold;
          break;
      }

      if (shouldUnlock && !milestone.isUnlocked) {
        const unlockedMilestone = {
          ...milestone,
          isUnlocked: true,
          unlockedAt: new Date()
        };
        
        onMilestoneReached?.(unlockedMilestone);
        
        // Generate certificate for major milestones
        if (milestone.id === 'completion_champion') {
          generateCompletionCertificate(stats, engagement);
        }
        
        return unlockedMilestone;
      }
      
      return milestone;
    });

    setMilestones(updatedMilestones);
  };

  const generateCompletionCertificate = (stats: any, engagement: UserEngagement) => {
    const certificate: CompletionCertificate = {
      id: `cert_${Date.now()}`,
      userId: user?.id || '',
      type: 'onboarding_complete',
      title: 'Onboarding Completion Certificate',
      description: 'Successfully completed the Both Sides onboarding experience',
      issuedAt: new Date(),
      metadata: {
        completionPercentage: stats.overallProgress,
        timeToComplete: engagement.totalTimeSpent,
        qualityScore: stats.qualityScore,
        engagementLevel: stats.engagementLevel as 'low' | 'medium' | 'high',
        sectionsCompleted: engagement.sectionsVisited
      }
    };

    setCertificates(prev => [...prev, certificate]);
    onCertificateEarned?.(certificate);
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getTotalPoints = () => {
    return milestones
      .filter(m => m.isUnlocked)
      .reduce((total, m) => total + m.points, 0);
  };

  if (!completionStats || !engagement) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse mx-auto mb-2 text-blue-600" />
          <p>Loading completion data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Completion Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Onboarding Progress
            </span>
            <Badge variant={completionStats.overallProgress === 100 ? "default" : "secondary"}>
              {completionStats.overallProgress}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={completionStats.overallProgress} className="h-3" />
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {completionStats.sectionsCompleted}/{completionStats.totalSections}
              </div>
              <p className="text-xs text-muted-foreground">Sections</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {completionStats.qualityScore}%
              </div>
              <p className="text-xs text-muted-foreground">Quality</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {engagement.engagementScore}%
              </div>
              <p className="text-xs text-muted-foreground">Engagement</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatTime(completionStats.timeSpent)}
              </div>
              <p className="text-xs text-muted-foreground">Time Spent</p>
            </div>
          </div>

          {/* Estimated Completion */}
          {completionStats.estimatedCompletion && completionStats.overallProgress < 100 && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Estimated completion:</strong> {completionStats.estimatedCompletion.toLocaleTimeString()}
                {' '}({Math.ceil((completionStats.estimatedCompletion.getTime() - Date.now()) / 60000)} minutes remaining)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Milestones & Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Achievements
            </span>
            <Badge variant="outline">
              {getTotalPoints()} Points Earned
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {milestones.map((milestone) => {
              const IconComponent = milestone.icon;
              
              return (
                <Card 
                  key={milestone.id} 
                  className={`relative transition-all ${
                    milestone.isUnlocked 
                      ? `border-${milestone.color}-300 bg-${milestone.color}-50 shadow-md` 
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                      milestone.isUnlocked 
                        ? `bg-${milestone.color}-100` 
                        : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`h-6 w-6 ${
                        milestone.isUnlocked 
                          ? `text-${milestone.color}-600` 
                          : 'text-gray-400'
                      }`} />
                    </div>
                    
                    <h4 className="font-semibold text-sm mb-1">{milestone.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {milestone.description}
                    </p>
                    
                    <Badge 
                      variant={milestone.isUnlocked ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {milestone.points} pts
                    </Badge>
                    
                    {milestone.isUnlocked && milestone.unlockedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Unlocked {milestone.unlockedAt.toLocaleDateString()}
                      </p>
                    )}

                    {milestone.isUnlocked && (
                      <div className="absolute -top-2 -right-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Certificates */}
      {certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-gold" />
              Certificates Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {certificates.map((certificate) => (
                <div key={certificate.id} className="p-4 border border-gold-200 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-amber-800">{certificate.title}</h4>
                    <Badge variant="outline" className="text-amber-700 border-amber-300">
                      {certificate.issuedAt.toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-sm text-amber-700 mb-3">{certificate.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Completion: </span>
                      <span className="font-medium">{certificate.metadata.completionPercentage}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time: </span>
                      <span className="font-medium">{formatTime(certificate.metadata.timeToComplete)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quality: </span>
                      <span className="font-medium">{certificate.metadata.qualityScore}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Engagement: </span>
                      <span className="font-medium capitalize">{certificate.metadata.engagementLevel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Engagement Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{engagement.questionsAnswered}</div>
                <p className="text-sm text-blue-700">Questions Answered</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {formatTime(engagement.averageTimePerQuestion)}
                </div>
                <p className="text-sm text-green-700">Avg. Time/Question</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{engagement.resumeCount}</div>
                <p className="text-sm text-purple-700">Resume Sessions</p>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h5 className="font-medium mb-2">Quality Breakdown</h5>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Response Consistency:</span>
                  <div className="flex items-center gap-2">
                    <Progress value={engagement.qualityMetrics.responseConsistency * 100} className="w-20 h-2" />
                    <span className="text-sm font-medium">{Math.round(engagement.qualityMetrics.responseConsistency * 100)}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Thoughtfulness:</span>
                  <div className="flex items-center gap-2">
                    <Progress value={engagement.qualityMetrics.thoughtfulness * 100} className="w-20 h-2" />
                    <span className="text-sm font-medium">{Math.round(engagement.qualityMetrics.thoughtfulness * 100)}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completion Speed:</span>
                  <div className="flex items-center gap-2">
                    <Progress value={engagement.qualityMetrics.completionSpeed * 100} className="w-20 h-2" />
                    <span className="text-sm font-medium">{Math.round(engagement.qualityMetrics.completionSpeed * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Utility function for generating completion certificates
export function generateCompletionCertificateHTML(certificate: CompletionCertificate, userName: string): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 40px; border: 3px solid #d4af37; background: linear-gradient(135deg, #fff8e1 0%, #f3e5ab 100%); text-align: center; font-family: serif;">
      <h1 style="color: #8b4513; font-size: 24px; margin-bottom: 20px;">Certificate of Completion</h1>
      <div style="margin: 20px 0;">🏆</div>
      <p style="font-size: 18px; margin-bottom: 10px;">This certifies that</p>
      <h2 style="color: #8b4513; font-size: 28px; margin: 20px 0; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">${userName}</h2>
      <p style="font-size: 16px; margin: 20px 0;">has successfully completed the Both Sides onboarding experience</p>
      <div style="margin: 30px 0; padding: 20px; background: rgba(212, 175, 55, 0.1); border-radius: 8px;">
        <p><strong>Completion:</strong> ${certificate.metadata.completionPercentage}%</p>
        <p><strong>Quality Score:</strong> ${certificate.metadata.qualityScore}%</p>
        <p><strong>Engagement Level:</strong> ${certificate.metadata.engagementLevel}</p>
      </div>
      <p style="font-size: 14px; color: #666; margin-top: 30px;">Issued on ${certificate.issuedAt.toLocaleDateString()}</p>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #d4af37;">
        <p style="font-size: 12px; color: #888;">Both Sides - Bridging Perspectives Through Education</p>
      </div>
    </div>
  `;
}
