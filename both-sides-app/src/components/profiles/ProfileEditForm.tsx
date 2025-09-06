'use client';

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Profile, UpdateProfileRequest, IdeologyScores, SurveyResponses } from '@/types/profile';
import { ProfileAPI, ProfileAPIError } from '@/lib/api/profile';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Camera,
  Plus,
  Minus,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

// Validation schemas
const ideologyScoreSchema = z.number().min(0).max(1);

const surveyResponseSchema = z.object({
  questions: z.array(z.string().min(1)).min(1),
  answers: z.array(z.string().min(1)).min(1),
}).refine(data => data.questions.length === data.answers.length, {
  message: "Questions and answers must have the same length"
});

const profileFormSchema = z.object({
  belief_summary: z.string().max(5000).optional(),
  ideology_scores: z.record(z.string(), ideologyScoreSchema).optional(),
  opinion_plasticity: z.number().min(0).max(1).optional(),
  survey_responses: surveyResponseSchema.optional(),
  is_completed: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfileEditFormProps {
  profile?: Profile;
  onSave?: (profile: Profile) => void;
  onCancel?: () => void;
  autoSave?: boolean;
  autoSaveInterval?: number; // in milliseconds
  className?: string;
}

// Default ideology categories
const DEFAULT_IDEOLOGIES = [
  'liberal',
  'conservative', 
  'progressive',
  'libertarian',
  'socialist',
  'moderate'
];

export function ProfileEditForm({
  profile,
  onSave,
  onCancel,
  autoSave = true,
  autoSaveInterval = 30000, // 30 seconds
  className = ''
}: ProfileEditFormProps) {
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(autoSave);
  
  // Initialize form with profile data or defaults
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      belief_summary: profile?.belief_summary || '',
      ideology_scores: profile?.ideology_scores || Object.fromEntries(
        DEFAULT_IDEOLOGIES.map(ideology => [ideology, 0.5])
      ),
      opinion_plasticity: profile?.opinion_plasticity || 0.5,
      survey_responses: profile?.survey_responses || {
        questions: [''],
        answers: ['']
      },
      is_completed: profile?.is_completed || false,
    },
    mode: 'onChange'
  });

  // Watch form values for auto-save
  const watchedValues = useWatch({ 
    control: form.control 
  });

  // Auto-save logic
  const performAutoSave = useCallback(async () => {
    if (!autoSaveEnabled || !profile?.id || isSubmitting) return;
    
    try {
      const token = await getToken();
      if (!token) return;

      const values = form.getValues();
      await ProfileAPI.updateProfile(profile.id, values, token);
      setLastSaved(new Date());
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  }, [autoSaveEnabled, profile?.id, form, getToken, isSubmitting]);

  // Set up auto-save interval
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const interval = setInterval(performAutoSave, autoSaveInterval);
    return () => clearInterval(interval);
  }, [performAutoSave, autoSaveInterval, autoSaveEnabled]);

  // Manual save function
  const handleSave = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      let updatedProfile: Profile;
      
      if (profile?.id) {
        // Update existing profile
        const response = await ProfileAPI.updateProfile(profile.id, data, token);
        updatedProfile = response.data;
      } else {
        // Create new profile for current user
        const response = await ProfileAPI.createCurrentUserProfile(data, token);
        updatedProfile = response.data;
      }

      setLastSaved(new Date());
      onSave?.(updatedProfile);
    } catch (error) {
      if (error instanceof ProfileAPIError) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Failed to save profile. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Survey response handlers
  const addSurveyQuestion = () => {
    const currentResponses = form.getValues('survey_responses') || { questions: [''], answers: [''] };
    form.setValue('survey_responses', {
      questions: [...currentResponses.questions, ''],
      answers: [...currentResponses.answers, '']
    });
  };

  const removeSurveyQuestion = (index: number) => {
    const currentResponses = form.getValues('survey_responses') || { questions: [''], answers: [''] };
    if (currentResponses.questions.length > 1) {
      form.setValue('survey_responses', {
        questions: currentResponses.questions.filter((_, i) => i !== index),
        answers: currentResponses.answers.filter((_, i) => i !== index)
      });
    }
  };

  const resetIdeologyScores = () => {
    const defaultScores = Object.fromEntries(
      DEFAULT_IDEOLOGIES.map(ideology => [ideology, 0.5])
    );
    form.setValue('ideology_scores', defaultScores);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Auto-save status */}
      {autoSave && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoSaveEnabled}
                  onCheckedChange={setAutoSaveEnabled}
                />
                <span className="text-sm font-medium">Auto-save enabled</span>
              </div>
              {lastSaved && (
                <span className="text-sm text-muted-foreground">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          
          {/* Profile Completion Toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Status</CardTitle>
              <CardDescription>
                Mark your profile as complete when you've finished all sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="is_completed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Profile Completed</FormLabel>
                      <FormDescription>
                        This will mark your profile as ready for matching and debates
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Belief Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Belief Summary</CardTitle>
              <CardDescription>
                Describe your core beliefs and worldview in your own words
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="belief_summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Worldview</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your core beliefs, values, and how you see the world..."
                        className="min-h-[120px] resize-none"
                        maxLength={5000}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0}/5000 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Opinion Plasticity */}
          <Card>
            <CardHeader>
              <CardTitle>Opinion Flexibility</CardTitle>
              <CardDescription>
                How open are you to changing your mind when presented with new evidence?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="opinion_plasticity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Flexibility Level: {Math.round((field.value || 0.5) * 100)}%
                    </FormLabel>
                    <FormControl>
                      <div className="px-3">
                        <Slider
                          value={[field.value || 0.5]}
                          onValueChange={(values) => field.onChange(values[0])}
                          max={1}
                          min={0}
                          step={0.05}
                          className="w-full"
                        />
                      </div>
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Very Firm (0%)</span>
                      <span>Moderate (50%)</span>
                      <span>Very Flexible (100%)</span>
                    </div>
                    <FormDescription>
                      Higher values indicate greater openness to changing your views
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Ideology Scores */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ideology Profile</CardTitle>
                  <CardDescription>
                    Rate how much you align with different political ideologies
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetIdeologyScores}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DEFAULT_IDEOLOGIES.map((ideology) => (
                  <FormField
                    key={ideology}
                    control={form.control}
                    name={`ideology_scores.${ideology}` as any}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="capitalize">
                            {ideology} ({Math.round((field.value || 0.5) * 100)}%)
                          </FormLabel>
                        </div>
                        <FormControl>
                          <div className="px-3">
                            <Slider
                              value={[field.value || 0.5]}
                              onValueChange={(values) => field.onChange(values[0])}
                              max={1}
                              min={0}
                              step={0.05}
                              className="w-full"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Survey Responses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Survey Responses</CardTitle>
                  <CardDescription>
                    Add questions and your responses to build your belief profile
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSurveyQuestion}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {form.watch('survey_responses')?.questions?.map((_, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Question {index + 1}</h4>
                      {(form.watch('survey_responses')?.questions?.length || 0) > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSurveyQuestion(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name={`survey_responses.questions.${index}` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Question</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your question..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`survey_responses.answers.${index}` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Answer</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter your response..."
                                className="min-h-[80px] resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {form.formState.isDirty && !autoSaveEnabled && (
                    <Badge variant="outline" className="text-orange-600">
                      Unsaved changes
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || (!form.formState.isDirty && !!profile)}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {profile ? 'Update Profile' : 'Create Profile'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
