/**
 * Phase 3 Task 3.3.5.1: Implement Partial Profile Functionality
 * Allows limited system access with incomplete profiles and progressive feature disclosure
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Profile } from '@/types/profile';
import { ProfileAPI } from '@/lib/api/profile';
import { SurveyAPI } from '@/lib/api/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Lightbulb,
  Users,
  MessageCircle,
  Brain,
  Target,
  Lock,
  Unlock,
  Star,
  TrendingUp,
  Gift
} from 'lucide-react';

interface PartialProfileFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  requiredCompletion: number; // 0-100
  isUnlocked: boolean;
  benefits: string[];
}

interface ProfileCompletion {
  overall: number;
  onboardingCompleted: boolean;
  surveyProgress: number;
  profileGenerated: boolean;
  beliefAnalysisComplete: boolean;
  embeddingGenerated: boolean;
  sections: {
    basic_info: number;
    survey_responses: number;
    belief_analysis: number;
    matching_preferences: number;
  };
}

interface PartialProfileManagerProps {
  profile: Profile | null;
  onCompleteOnboarding: () => void;
  onResumeSurvey: () => void;
  onEditProfile: () => void;
  className?: string;
}

export function PartialProfileManager({
  profile,
  onCompleteOnboarding,
  onResumeSurvey,
  onEditProfile,
  className = ''
}: PartialProfileManagerProps) {
  const { getToken } = useAuth();
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [features, setFeatures] = useState<PartialProfileFeature[]>([]);
  const [showIncentives, setShowIncentives] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Define available features based on profile completion
  const featureDefinitions: PartialProfileFeature[] = [
    {
      id: 'basic_access',
      name: 'Basic Profile View',
      description: 'View your profile and basic information',
      icon: Users,
      requiredCompletion: 0,
      isUnlocked: true,
      benefits: ['Access your profile page', 'View basic account settings']
    },
    {
      id: 'partial_matching',
      name: 'Limited Matching',
      description: 'Basic matching with simplified criteria',
      icon: Target,
      requiredCompletion: 25,
      isUnlocked: false,
      benefits: ['Match with others in your class', 'Join basic discussions', 'Limited to simple topics']
    },
    {
      id: 'belief_insights',
      name: 'Belief Insights',
      description: 'View preliminary analysis of your beliefs',
      icon: Brain,
      requiredCompletion: 50,
      isUnlocked: false,
      benefits: ['See belief tendency charts', 'Compare with class averages', 'Basic personality insights']
    },
    {
      id: 'advanced_matching',
      name: 'Smart Matching',
      description: 'AI-powered matching with detailed compatibility',
      icon: Star,
      requiredCompletion: 75,
      isUnlocked: false,
      benefits: ['Advanced debate matching', 'Detailed compatibility scores', 'Topic-specific pairings']
    },
    {
      id: 'full_debates',
      name: 'Complete Debate System',
      description: 'Access to all debate features and topics',
      icon: MessageCircle,
      requiredCompletion: 90,
      isUnlocked: false,
      benefits: ['All debate topics unlocked', 'Advanced debate tools', 'Performance analytics', 'Teacher feedback']
    },
    {
      id: 'premium_analytics',
      name: 'Advanced Analytics',
      description: 'Detailed insights and growth tracking',
      icon: TrendingUp,
      requiredCompletion: 100,
      isUnlocked: false,
      benefits: ['Growth tracking over time', 'Detailed skill analysis', 'Personal improvement suggestions', 'Peer comparison insights']
    }
  ];

  useEffect(() => {
    loadProfileCompletion();
  }, [profile]);

  useEffect(() => {
    if (completion) {
      updateFeatures();
      // Show incentives if completion is low but user has been active
      if (completion.overall < 50 && completion.sections.basic_info > 0) {
        setShowIncentives(true);
      }
    }
  }, [completion]);

  const loadProfileCompletion = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      // Get survey progress
      const surveyProgress = await SurveyAPI.getProgress(token);
      
      // Calculate completion percentages
      const completion: ProfileCompletion = {
        overall: 0,
        onboardingCompleted: profile?.is_completed || false,
        surveyProgress: surveyProgress.progress_percentage,
        profileGenerated: !!profile?.belief_summary,
        beliefAnalysisComplete: !!profile?.ideology_scores,
        embeddingGenerated: !!profile?.belief_embedding,
        sections: {
          basic_info: profile ? 100 : 0,
          survey_responses: surveyProgress.progress_percentage,
          belief_analysis: profile?.belief_summary ? 100 : 0,
          matching_preferences: profile?.privacy_settings ? 100 : 50 // Partial if basic settings exist
        }
      };

      // Calculate overall completion
      const sectionWeights = {
        basic_info: 0.2,
        survey_responses: 0.4,
        belief_analysis: 0.3,
        matching_preferences: 0.1
      };

      completion.overall = Object.entries(completion.sections)
        .reduce((total, [section, percentage]) => {
          const weight = sectionWeights[section as keyof typeof sectionWeights];
          return total + (percentage * weight);
        }, 0);

      setCompletion(completion);
    } catch (error) {
      console.error('Failed to load profile completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFeatures = () => {
    const updatedFeatures = featureDefinitions.map(feature => ({
      ...feature,
      isUnlocked: (completion?.overall || 0) >= feature.requiredCompletion
    }));
    setFeatures(updatedFeatures);
  };

  const getNextMilestone = () => {
    if (!completion) return null;
    return features.find(feature => !feature.isUnlocked);
  };

  const getCompletionRewards = (currentCompletion: number) => {
    const rewards = [];
    
    if (currentCompletion >= 25 && currentCompletion < 50) {
      rewards.push("🎉 Partial matching unlocked!");
    }
    if (currentCompletion >= 50 && currentCompletion < 75) {
      rewards.push("🧠 Belief insights now available!");
    }
    if (currentCompletion >= 75 && currentCompletion < 90) {
      rewards.push("⭐ Smart matching enabled!");
    }
    if (currentCompletion >= 90) {
      rewards.push("🚀 Full system access granted!");
    }
    
    return rewards;
  };

  const renderProgressIncentive = () => {
    if (!completion || completion.overall >= 90) return null;
    
    const nextMilestone = getNextMilestone();
    if (!nextMilestone) return null;
    
    const progressNeeded = nextMilestone.requiredCompletion - completion.overall;
    
    return (
      <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <Gift className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <strong>Almost there!</strong> Complete {Math.ceil(progressNeeded)}% more to unlock{' '}
              <strong>{nextMilestone.name}</strong>
            </div>
            <Button size="sm" onClick={onResumeSurvey} className="ml-4">
              Continue Survey
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="h-6 w-6 animate-spin mr-2" />
        <span>Loading profile status...</span>
      </div>
    );
  }

  if (!completion) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Completion Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Profile Completion</span>
            <Badge variant={completion.overall >= 90 ? "default" : "secondary"}>
              {Math.round(completion.overall)}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={completion.overall} className="h-3" />
            
            {/* Section Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Basic Info</span>
                  <span className="font-medium">{completion.sections.basic_info}%</span>
                </div>
                <Progress value={completion.sections.basic_info} className="h-1" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Survey</span>
                  <span className="font-medium">{completion.sections.survey_responses}%</span>
                </div>
                <Progress value={completion.sections.survey_responses} className="h-1" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Analysis</span>
                  <span className="font-medium">{completion.sections.belief_analysis}%</span>
                </div>
                <Progress value={completion.sections.belief_analysis} className="h-1" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Preferences</span>
                  <span className="font-medium">{completion.sections.matching_preferences}%</span>
                </div>
                <Progress value={completion.sections.matching_preferences} className="h-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Incentive */}
      {renderProgressIncentive()}

      {/* Feature Availability */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => {
          const IconComponent = feature.icon;
          
          return (
            <Card 
              key={feature.id} 
              className={`transition-all hover:shadow-md ${
                feature.isUnlocked 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      feature.isUnlocked ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`h-5 w-5 ${
                        feature.isUnlocked ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{feature.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <div>
                    {feature.isUnlocked ? (
                      <Unlock className="h-5 w-5 text-green-500" />
                    ) : (
                      <Lock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Requires {feature.requiredCompletion}% completion
                    </span>
                    <span className={`font-medium ${
                      feature.isUnlocked ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {feature.isUnlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                  
                  {/* Benefits List */}
                  <ul className="text-xs space-y-1">
                    {feature.benefits.map((benefit, index) => (
                      <li key={index} className={`flex items-center gap-2 ${
                        feature.isUnlocked ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        <CheckCircle2 className="h-3 w-3" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  
                  {!feature.isUnlocked && (
                    <div className="mt-3 pt-3 border-t">
                      <Progress 
                        value={(completion.overall / feature.requiredCompletion) * 100} 
                        className="h-1 mb-2" 
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        {Math.max(0, feature.requiredCompletion - completion.overall)}% more needed
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion Rewards */}
      {completion.overall > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Your Progress Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getCompletionRewards(completion.overall).map((reward, index) => (
                <div key={index} className="text-amber-700 font-medium">
                  {reward}
                </div>
              ))}
              {getCompletionRewards(completion.overall).length === 0 && (
                <p className="text-amber-700">
                  Keep going! Your first reward unlocks at 25% completion.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {completion.overall < 100 && (
          <Button onClick={onResumeSurvey} className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Continue Survey ({Math.round(100 - completion.overall)}% remaining)
          </Button>
        )}
        {completion.sections.basic_info < 100 && (
          <Button variant="outline" onClick={onCompleteOnboarding}>
            Complete Onboarding
          </Button>
        )}
        {profile && (
          <Button variant="outline" onClick={onEditProfile}>
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
}
