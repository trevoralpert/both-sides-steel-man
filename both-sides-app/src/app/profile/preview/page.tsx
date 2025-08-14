'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ProfileConfirmation } from '@/components/profiles/ProfileConfirmation';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { IdeologyScores } from '@/types/profile';

// Mock interfaces - these would come from your actual API
interface BeliefAnalysisResult {
  profileId: string;
  beliefSummary: string;
  ideologyScores: IdeologyScores;
  opinionPlasticity: number;
  confidenceScore: number;
  analysisMetadata: {
    analysisVersion: string;
    completedAt: Date;
    tokensUsed: number;
    processingTime: number;
    qualityScore: number;
  };
}

interface SurveyResponse {
  questionId: string;
  questionText: string;
  questionCategory: string;
  responseValue: any;
  responseText?: string;
  confidenceLevel?: number;
  completionTime: number;
}

interface ProfilePrivacySettings {
  profileVisibility: 'private' | 'class_only' | 'school_only';
  allowTeacherView: boolean;
  allowPeerComparison: boolean;
  shareForResearch: boolean;
  enableMatching: boolean;
  showInClassAnalytics: boolean;
}

// Mock data for demonstration
const MOCK_BELIEF_PROFILE: BeliefAnalysisResult = {
  profileId: 'mock-profile-id',
  beliefSummary: `Based on your survey responses, you demonstrate a moderate progressive political orientation with strong environmental consciousness. You value individual freedom and social justice, while recognizing the importance of pragmatic solutions to complex problems.

Your economic views lean toward supporting government intervention to address inequality, but you also appreciate the role of free markets in driving innovation. On social issues, you strongly support civil liberties and individual rights, believing that society benefits when people are free to make their own choices.

You show particular strength in your environmental convictions, consistently prioritizing sustainability and climate action. This environmental focus appears to influence many of your other political positions, leading to a coherent worldview that balances social progress with environmental responsibility.

Your responses indicate a thoughtful approach to political issues, often considering multiple perspectives before forming opinions. This intellectual flexibility, combined with your core values, suggests you would engage well in respectful political debates and discussions.`,
  ideologyScores: {
    economic: 0.3, // Slightly progressive
    social: 0.6,   // Libertarian-leaning
    tradition: -0.4, // Progressive
    globalism: 0.2,  // Slightly globalist
    environment: 0.8  // Strong environmental focus
  },
  opinionPlasticity: 0.65, // Moderately flexible
  confidenceScore: 0.78,   // Good confidence
  analysisMetadata: {
    analysisVersion: '1.0.0',
    completedAt: new Date(),
    tokensUsed: 1250,
    processingTime: 2400,
    qualityScore: 0.82
  }
};

const MOCK_SURVEY_RESPONSES: SurveyResponse[] = [
  {
    questionId: 'q1',
    questionText: 'Should the government provide universal healthcare?',
    questionCategory: 'ECONOMIC',
    responseValue: 'Strongly Agree',
    responseText: 'Healthcare is a human right and should be accessible to all.',
    confidenceLevel: 5,
    completionTime: 12000
  },
  {
    questionId: 'q2',
    questionText: 'How important is environmental protection vs. economic growth?',
    questionCategory: 'ENVIRONMENTAL',
    responseValue: 'Environmental protection is more important',
    responseText: 'We cannot have a healthy economy without a healthy planet.',
    confidenceLevel: 5,
    completionTime: 8000
  },
  {
    questionId: 'q3',
    questionText: 'Should same-sex marriage be legal?',
    questionCategory: 'SOCIAL',
    responseValue: 'Yes, absolutely',
    responseText: 'Love is love, and everyone deserves equal rights.',
    confidenceLevel: 5,
    completionTime: 4000
  },
  {
    questionId: 'q4',
    questionText: 'What role should government play in regulating the economy?',
    questionCategory: 'ECONOMIC',
    responseValue: 'Moderate regulation to prevent abuse',
    responseText: 'Markets work well with reasonable oversight and consumer protection.',
    confidenceLevel: 4,
    completionTime: 15000
  },
  {
    questionId: 'q5',
    questionText: 'How should a country balance national sovereignty with international cooperation?',
    questionCategory: 'POLITICAL',
    responseValue: 'Cooperation is important but not at the expense of core values',
    responseText: 'We should work with other nations while maintaining our principles.',
    confidenceLevel: 3,
    completionTime: 18000
  }
];

export default function ProfilePreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  
  const [beliefProfile, setBeliefProfile] = useState<BeliefAnalysisResult | null>(null);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!isAuthLoaded) return;

      try {
        setIsLoading(true);
        setError(null);

        // Get profile ID from URL params or use current user
        const profileId = searchParams.get('profileId');

        // In a real implementation, you would fetch from your API:
        // const token = await getToken();
        // const response = await fetch(`/api/belief-analysis/profile/${profileId}`, {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // const data = await response.json();

        // For now, use mock data
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading
        setBeliefProfile(MOCK_BELIEF_PROFILE);
        setSurveyResponses(MOCK_SURVEY_RESPONSES);

      } catch (err) {
        console.error('Error loading profile data:', err);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [isAuthLoaded, searchParams, getToken]);

  const handleConfirmProfile = async (settings: ProfilePrivacySettings) => {
    try {
      setIsConfirming(true);
      setError(null);

      // In a real implementation:
      // const token = await getToken();
      // await fetch('/api/profiles/confirm', {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}` 
      //   },
      //   body: JSON.stringify({
      //     profileId: beliefProfile?.profileId,
      //     privacySettings: settings
      //   })
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Redirect to profile or dashboard
      router.push('/profile?confirmed=true');

    } catch (err) {
      console.error('Error confirming profile:', err);
      setError('Failed to confirm profile. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEditResponses = (questionIds?: string[]) => {
    // If specific questions are provided, include them in the URL
    const editUrl = questionIds && questionIds.length > 0 
      ? `/survey?edit=true&questions=${questionIds.join(',')}`
      : '/survey?edit=true';
    
    router.push(editUrl);
  };

  const handleRetakeSection = (category: string) => {
    router.push(`/survey?retake=${category}`);
  };

  if (!isAuthLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Loading Your Profile</h3>
            <p className="text-sm text-muted-foreground">
              Analyzing your belief profile...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !beliefProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="pt-8 pb-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="mb-4">
                {error || 'Profile data could not be loaded.'}
              </AlertDescription>
            </Alert>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Survey
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <ProfileConfirmation
            beliefProfile={beliefProfile}
            surveyResponses={surveyResponses}
            onConfirmProfile={handleConfirmProfile}
            onEditResponses={handleEditResponses}
            onRetakeSection={handleRetakeSection}
            isLoading={isConfirming}
          />
        </div>
      </div>
    </div>
  );
}
