/**
 * Phase 3 Task 3.1.2: Survey Page Integration
 * Main survey experience for belief mapping
 */

'use client';

import { useAuth } from '@clerk/nextjs';
import { SurveyFlow } from '@/components/surveys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, Users } from 'lucide-react';

export default function SurveyPage() {
  const { isSignedIn } = useAuth();

  const handleSurveyComplete = (results: any) => {
    console.log('Survey completed:', results);
    // Redirect to profile or results page
    window.location.href = '/profile';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Survey Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Belief Mapping Survey</h1>
          </div>
          
          <p className="text-lg text-gray-600 mb-4 max-w-2xl mx-auto">
            Help us understand your perspectives and values so we can match you with 
            engaging debate partners for meaningful discussions.
          </p>

          <div className="flex justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <span>Personalized matching</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Better debates</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span>Learn about yourself</span>
            </div>
          </div>
        </div>

        {/* Survey Flow */}
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

        {/* Survey Info */}
        <div className="max-w-2xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" />
                About This Survey
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <Badge variant="outline">~15 minutes</Badge>
                  <p className="mt-2 text-muted-foreground">Estimated completion time</p>
                </div>
                <div className="text-center">
                  <Badge variant="outline">Research-backed</Badge>
                  <p className="mt-2 text-muted-foreground">Scientifically validated questions</p>
                </div>
                <div className="text-center">
                  <Badge variant="outline">Privacy-first</Badge>
                  <p className="mt-2 text-muted-foreground">Your data stays secure</p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                This survey helps create your belief profile for educational debate matching. 
                Your responses are private and used only for improving your learning experience.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
