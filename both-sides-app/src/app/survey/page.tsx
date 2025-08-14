/**
 * Phase 3 Task 3.3.1: Enhanced Survey Page with Onboarding
 * Main survey experience with comprehensive onboarding flow
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SurveyFlow, OnboardingFlow } from '@/components/surveys';
import { EnhancedOnboardingFlow } from '@/components/surveys/EnhancedOnboardingFlow';
import { Card, CardContent } from '@/components/ui/card';

type PageState = 'onboarding' | 'survey' | 'completed';

export default function SurveyPage() {
  const { isSignedIn } = useAuth();
  const [pageState, setPageState] = useState<PageState>('onboarding');

  const handleOnboardingComplete = () => {
    // Move directly to survey after onboarding
    setPageState('survey');
  };

  const handleStartSurvey = () => {
    // Skip directly to survey if user wants to jump in
    setPageState('survey');
  };

  const handleSurveyComplete = (results: any) => {
    console.log('Survey completed:', results);
    setPageState('completed');
    // Redirect to profile page after a moment
    setTimeout(() => {
      window.location.href = '/profile';
    }, 2000);
  };

  const handleProgress = (percentage: number) => {
    console.log('Survey progress:', percentage);
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-muted-foreground">
              Please sign in to take the belief mapping survey.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === 'onboarding') {
    return (
      <EnhancedOnboardingFlow
        onComplete={handleOnboardingComplete}
        onStartSurvey={handleStartSurvey}
        enableAutoSave={true}
        enableCrossDeviceSync={true}
      />
    );
  }

  if (pageState === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Survey Complete! 🎉
            </h2>
            <p className="text-gray-600 mb-4">
              Thank you for sharing your perspectives. Your belief profile is being generated and you'll be redirected to view it shortly.
            </p>
            <div className="text-sm text-muted-foreground">
              Redirecting to your profile...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <SurveyFlow
          onComplete={handleSurveyComplete}
          onProgress={handleProgress}
          config={{
            enableAutoSave: true,
            showProgressBar: true,
            enableBackNavigation: true,
            showConfidenceRating: true,
          }}
        />
      </div>
    </div>
  );
}
