'use client';

/**
 * Phase 3 Task 3.1.2.2: Survey Navigation and Flow Management
 */

import { useState, useEffect } from 'react';

import { useAuth } from '@clerk/nextjs';
import { SurveyAPI, SurveyAPIError } from '@/lib/api/survey';
import { Survey, SurveyState, SaveResponseRequest, SurveyConfig } from '@/types/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

import { SurveyQuestionComponent } from './SurveyQuestion';

interface SurveyFlowProps {
  config?: Partial<SurveyConfig>;
  onComplete?: (results: any) => void;
  onProgress?: (progress: number) => void;
  className?: string;
}

const defaultConfig: SurveyConfig = {
  enableAutoSave: true,
  autoSaveInterval: 30000, // 30 seconds
  enableProgress: true,
  enableBackNavigation: true,
  maxQuestionsPerSession: 20,
  enableSkipLogic: true,
  showConfidenceRating: true,
  showProgressBar: true,
};

export function SurveyFlow({ 
  config = {}, 
  onComplete, 
  onProgress,
  className = '' 
}: SurveyFlowProps) {
  const { getToken } = useAuth();
  const finalConfig = { ...defaultConfig, ...config };

  const [state, setState] = useState<SurveyState>({
    currentQuestion: 0,
    responses: new Map(),
    progress: {
      completed_questions: 0,
      total_questions: 0,
      progress_percentage: 0,
      sections_completed: 0,
      total_sections: 0,
    },
    survey: null,
    isLoading: true,
    startTime: new Date(),
    questionStartTime: new Date(),
  });

  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Load survey on mount
  useEffect(() => {
    loadSurvey();
  }, []);

  // Auto-save responses
  useEffect(() => {
    if (finalConfig.enableAutoSave && state.responses.size > 0) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      
      const timer = setTimeout(() => {
        autoSaveResponses();
      }, finalConfig.autoSaveInterval);
      
      setAutoSaveTimer(timer);
      return () => clearTimeout(timer);
    }
  }, [state.responses]);

  const loadSurvey = async () => {
    try {
      // // const token = await getToken();
      const survey = await SurveyAPI.getActiveSurvey(null as any);
      const progress = await SurveyAPI.getProgress(null as any);

      setState(prev => ({
        ...prev,
        survey,
        progress,
        isLoading: false,
        currentQuestion: Math.min(progress.completed_questions, survey.questions.length - 1),
      }));

      onProgress?.(progress.progress_percentage);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof SurveyAPIError ? error.message : 'Failed to load survey',
      }));
    }
  };

  const autoSaveResponses = async () => {
    if (state.responses.size === 0) return;

    try {
      // const token = await getToken();
      const responses = Array.from(state.responses.values());
      
      await SurveyAPI.bulkSaveResponses({
        responses,
        session_metadata: {
          session_duration: Date.now() - state.startTime.getTime(),
          fatigue_level: 'low', // Could be calculated based on completion times
          completion_quality: 85, // Could be calculated based on response patterns
        },
      }, null as any);

      console.log('Auto-saved responses successfully');
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleResponse = async (response: SaveResponseRequest) => {
    setState(prev => ({
      ...prev,
      responses: new Map(prev.responses.set(response.question_id, response)),
      questionStartTime: new Date(),
    }));

    // Save response immediately
    try {
      // const token = await getToken();
      await SurveyAPI.saveResponse(response, null as any);
      
      // Move to next question
      const nextIndex = state.currentQuestion + 1;
      const newProgress = {
        ...state.progress,
        completed_questions: nextIndex,
        progress_percentage: Math.round((nextIndex / (state.survey?.questions.length || 1)) * 100),
      };

      setState(prev => ({
        ...prev,
        currentQuestion: nextIndex,
        progress: newProgress,
      }));

      onProgress?.(newProgress.progress_percentage);

      // Check if survey is complete
      if (nextIndex >= (state.survey?.questions.length || 0)) {
        const results = await SurveyAPI.getMyResponses(null as any);
        onComplete?.(results);
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof SurveyAPIError ? error.message : 'Failed to save response',
      }));
    }
  };

  const goToPreviousQuestion = () => {
    if (state.currentQuestion > 0) {
      setState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion - 1,
        questionStartTime: new Date(),
      }));
    }
  };

  const goToNextQuestion = () => {
    if (state.currentQuestion < (state.survey?.questions.length || 0) - 1) {
      setState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        questionStartTime: new Date(),
      }));
    }
  };

  if (state.isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading your personalized survey...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-12">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
          <Button onClick={loadSurvey} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!state.survey || state.currentQuestion >= state.survey.questions.length) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Survey Complete!</h2>
          <p className="text-muted-foreground">
            Thank you for completing the belief mapping survey. Your profile is being generated.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = state.survey.questions[state.currentQuestion];
  const existingResponse = state.responses.get(currentQuestion.id);

  return (
    <div className={`space-y-6 ${className}`}>
      <SurveyQuestionComponent
        question={currentQuestion}
        onResponse={handleResponse}
        initialValue={existingResponse?.response_value}
        showProgress={finalConfig.showProgressBar}
        currentIndex={state.currentQuestion}
        totalQuestions={state.survey.questions.length}
      />

      {/* Navigation Controls */}
      {finalConfig.enableBackNavigation && (
        <div className="flex justify-between max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={goToPreviousQuestion}
            disabled={state.currentQuestion === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground self-center">
            {state.progress.current_section && (
              <Badge variant="secondary">{state.progress.current_section}</Badge>
            )}
          </div>

          <Button
            variant="outline"
            onClick={goToNextQuestion}
            disabled={state.currentQuestion >= state.survey.questions.length - 1}
          >
            Skip
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
