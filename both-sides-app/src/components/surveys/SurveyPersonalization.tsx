/**
 * Phase 3 Task 3.3.2.5: Add Survey Personalization and Engagement
 * Dynamic content, personalized ordering, engagement tracking, and motivational messaging
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { SurveyQuestion, SaveResponseRequest } from '@/types/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain,
  Heart,
  TrendingUp,
  Users,
  Lightbulb,
  Target,
  Zap,
  Coffee,
  Moon,
  Sun,
  MessageSquare,
  Sparkles,
  Trophy,
  Clock,
  BookOpen
} from 'lucide-react';
import { useAccessibleContent } from './';

interface SurveyPersonalizationProps {
  questions: SurveyQuestion[];
  responses: Map<string, SaveResponseRequest>;
  currentIndex: number;
  userName?: string;
  startTime: Date;
  sessionDuration: number; // in seconds
  averageResponseTime: number; // in seconds
  className?: string;
}

interface PersonalizationContext {
  userProfile: UserProfileInsights;
  engagementLevel: 'high' | 'medium' | 'low';
  fatigueLevel: 'none' | 'mild' | 'moderate' | 'high';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  sessionPhase: 'warmup' | 'focus' | 'deepthink' | 'wrapup';
  preferredPacing: 'fast' | 'moderate' | 'thoughtful';
}

interface UserProfileInsights {
  dominantIdeology?: 'liberal' | 'conservative' | 'libertarian' | 'progressive' | 'moderate';
  certaintyLevel: 'uncertain' | 'moderate' | 'confident';
  thoughtfulnessScore: number; // 0-100
  consistencyPattern: 'consistent' | 'exploring' | 'conflicted';
  engagementStyle: 'analytical' | 'intuitive' | 'collaborative';
  topicInterests: string[];
}

export function SurveyPersonalization({
  questions,
  responses,
  currentIndex,
  userName = 'Student',
  startTime,
  sessionDuration,
  averageResponseTime,
  className = ''
}: SurveyPersonalizationProps) {
  const [personalizationContext, setPersonalizationContext] = useState<PersonalizationContext | null>(null);
  const [personalizedContent, setPersonalizedContent] = useState<any>(null);
  
  const { getMotivationalText } = useAccessibleContent();

  // Generate personalization context based on current state
  const context = useMemo(() => {
    const userProfile = analyzeUserProfile(responses, questions);
    const engagementLevel = calculateEngagementLevel(sessionDuration, averageResponseTime, responses.size);
    const fatigueLevel = calculateFatigueLevel(sessionDuration, responses.size, userProfile);
    const timeOfDay = getTimeOfDay();
    const sessionPhase = getSessionPhase(currentIndex, questions.length);
    const preferredPacing = inferPreferredPacing(averageResponseTime, userProfile);

    return {
      userProfile,
      engagementLevel,
      fatigueLevel,
      timeOfDay,
      sessionPhase,
      preferredPacing
    };
  }, [responses, questions, sessionDuration, averageResponseTime, currentIndex]);

  useEffect(() => {
    setPersonalizationContext(context);
    
    // Generate personalized content based on context
    if (context && questions[currentIndex]) {
      const content = generatePersonalizedContent(
        questions[currentIndex],
        context,
        userName,
        responses
      );
      setPersonalizedContent(content);
    }
  }, [context, currentIndex, questions, userName, responses]);

  if (!personalizationContext || !personalizedContent) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Personalized Welcome/Context */}
      <PersonalizedHeader 
        context={personalizationContext}
        userName={userName}
        currentQuestion={questions[currentIndex]}
        progress={(currentIndex / questions.length) * 100}
      />

      {/* Adaptive Hints and Guidance */}
      {personalizedContent.hints && (
        <AdaptiveHints 
          hints={personalizedContent.hints}
          context={personalizationContext}
          question={questions[currentIndex]}
        />
      )}

      {/* Engagement Boosters */}
      {personalizedContent.engagement && (
        <EngagementBoosters 
          content={personalizedContent.engagement}
          context={personalizationContext}
        />
      )}

      {/* Fatigue Management */}
      {personalizationContext.fatigueLevel !== 'none' && (
        <FatigueManager 
          fatigueLevel={personalizationContext.fatigueLevel}
          sessionDuration={sessionDuration}
          questionsRemaining={questions.length - currentIndex - 1}
        />
      )}
    </div>
  );
}

function PersonalizedHeader({ 
  context, 
  userName, 
  currentQuestion, 
  progress 
}: {
  context: PersonalizationContext;
  userName: string;
  currentQuestion: SurveyQuestion;
  progress: number;
}) {
  const getPersonalizedGreeting = () => {
    const { timeOfDay, sessionPhase, userProfile } = context;
    
    if (sessionPhase === 'warmup') {
      const greetings = {
        morning: `Good morning, ${userName}! Ready to explore your perspectives? ☀️`,
        afternoon: `Hello ${userName}! Let's dive into some thought-provoking questions. 🌅`,
        evening: `Good evening, ${userName}! Perfect time for some reflection. 🌆`,
        night: `Hey ${userName}! Thanks for taking time for this survey tonight. 🌙`
      };
      return greetings[timeOfDay];
    }
    
    if (sessionPhase === 'focus') {
      if (userProfile.engagementStyle === 'analytical') {
        return `Great analysis so far, ${userName}! Let's examine this next topic. 🧠`;
      } else if (userProfile.engagementStyle === 'intuitive') {
        return `Your instincts are showing through, ${userName}. What does this question feel like? 💭`;
      } else {
        return `You're building a rich profile, ${userName}. This question connects to your previous thoughts. 🔗`;
      }
    }
    
    if (sessionPhase === 'wrapup') {
      return `Almost there, ${userName}! These final questions will round out your profile perfectly. 🎯`;
    }
    
    return `Keep going, ${userName}! Your thoughtful responses are creating something unique. ✨`;
  };

  const getProgressMessage = () => {
    if (progress < 25) return "Building your foundation";
    if (progress < 50) return "Exploring your core beliefs";
    if (progress < 75) return "Diving deeper into your values";
    return "Putting the finishing touches on your profile";
  };

  return (
    <Card className="border-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium text-purple-800 mb-1">
              {getPersonalizedGreeting()}
            </div>
            <div className="text-xs text-purple-600">
              {getProgressMessage()} • {Math.round(progress)}% complete
            </div>
          </div>
          <div className="flex items-center gap-2">
            {context.userProfile.dominantIdeology && (
              <Badge variant="secondary" className="text-xs">
                {context.userProfile.dominantIdeology} tendencies
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {context.userProfile.engagementStyle} style
            </Badge>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function AdaptiveHints({ 
  hints, 
  context, 
  question 
}: {
  hints: any;
  context: PersonalizationContext;
  question: SurveyQuestion;
}) {
  if (!hints.show) return null;

  const getHintIcon = () => {
    switch (context.userProfile.engagementStyle) {
      case 'analytical': return Brain;
      case 'intuitive': return Heart;
      case 'collaborative': return Users;
      default: return Lightbulb;
    }
  };

  const Icon = getHintIcon();

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Icon className="h-4 w-4 text-blue-600" />
      <AlertDescription>
        <div className="space-y-2">
          <div className="text-sm font-medium text-blue-900">{hints.title}</div>
          <div className="text-sm text-blue-800">{hints.message}</div>
          {hints.examples && (
            <div className="text-xs text-blue-700">
              <strong>Consider:</strong> {hints.examples.join(' • ')}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function EngagementBoosters({ 
  content, 
  context 
}: {
  content: any;
  context: PersonalizationContext;
}) {
  if (!content.show) return null;

  const getBoosterStyle = () => {
    switch (context.engagementLevel) {
      case 'high':
        return 'border-green-200 bg-green-50';
      case 'medium':
        return 'border-blue-200 bg-blue-50';
      case 'low':
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  const getBoosterIcon = () => {
    switch (content.type) {
      case 'achievement': return Trophy;
      case 'insight': return Sparkles;
      case 'connection': return Users;
      case 'progress': return TrendingUp;
      default: return Zap;
    }
  };

  const Icon = getBoosterIcon();

  return (
    <Alert className={`border ${getBoosterStyle()}`}>
      <Icon className="h-4 w-4 text-blue-600" />
      <AlertDescription>
        <div className="space-y-1">
          <div className="text-sm font-medium">{content.title}</div>
          <div className="text-sm">{content.message}</div>
          {content.impact && (
            <div className="text-xs text-muted-foreground">
              💡 {content.impact}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function FatigueManager({ 
  fatigueLevel, 
  sessionDuration, 
  questionsRemaining 
}: {
  fatigueLevel: PersonalizationContext['fatigueLevel'];
  sessionDuration: number;
  questionsRemaining: number;
}) {
  const getFatigueMessage = () => {
    const minutes = Math.floor(sessionDuration / 60);
    
    switch (fatigueLevel) {
      case 'mild':
        return {
          title: "You're doing great!",
          message: `${minutes} minutes of thoughtful engagement. Consider taking a short break if needed.`,
          suggestion: "Stretch, hydrate, and come back refreshed!",
          icon: Coffee
        };
      case 'moderate':
        return {
          title: "Impressive dedication!",
          message: `${minutes} minutes of deep thinking. You might benefit from a brief pause.`,
          suggestion: `Only ${questionsRemaining} questions left - you're almost there!`,
          icon: Clock
        };
      case 'high':
        return {
          title: "Take a well-deserved break",
          message: `After ${minutes} minutes of intense reflection, your brain deserves a rest.`,
          suggestion: "Save your progress and return when you're refreshed. Quality over speed!",
          icon: Moon
        };
      default:
        return null;
    }
  };

  const fatigueInfo = getFatigueMessage();
  if (!fatigueInfo) return null;

  const Icon = fatigueInfo.icon;

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <Icon className="h-4 w-4 text-orange-600" />
      <AlertDescription>
        <div className="space-y-2">
          <div className="text-sm font-medium text-orange-900">{fatigueInfo.title}</div>
          <div className="text-sm text-orange-800">{fatigueInfo.message}</div>
          <div className="text-xs text-orange-700">
            💡 {fatigueInfo.suggestion}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Helper functions
function analyzeUserProfile(
  responses: Map<string, SaveResponseRequest>,
  questions: SurveyQuestion[]
): UserProfileInsights {
  const confidenceLevels = Array.from(responses.values())
    .map(r => r.confidence_level || 3);
  const avgConfidence = confidenceLevels.reduce((sum, c) => sum + c, 0) / Math.max(confidenceLevels.length, 1);
  
  const responseTimes = Array.from(responses.values())
    .map(r => r.completion_time);
  const avgResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / Math.max(responseTimes.length, 1);
  
  // Analyze thoughtfulness based on text responses
  const textResponses = Array.from(responses.entries())
    .filter(([questionId, _]) => {
      const question = questions.find(q => q.id === questionId);
      return question?.type === 'TEXT_RESPONSE';
    })
    .map(([_, response]) => response.response_value);
  
  const thoughtfulnessScore = calculateThoughtfulnessScore(textResponses, avgResponseTime);
  
  return {
    certaintyLevel: avgConfidence >= 4 ? 'confident' : avgConfidence >= 2.5 ? 'moderate' : 'uncertain',
    thoughtfulnessScore,
    consistencyPattern: 'exploring', // Simplified for now
    engagementStyle: inferEngagementStyle(textResponses, avgResponseTime, avgConfidence),
    topicInterests: [] // Would be derived from response patterns
  };
}

function calculateEngagementLevel(
  sessionDuration: number,
  averageResponseTime: number,
  totalResponses: number
): PersonalizationContext['engagementLevel'] {
  const engagementScore = (
    (sessionDuration > 600 ? 40 : sessionDuration / 15) + // Time investment
    (averageResponseTime > 20 ? 30 : averageResponseTime * 1.5) + // Thoughtful pacing
    (totalResponses * 2) // Response quantity
  );
  
  if (engagementScore >= 80) return 'high';
  if (engagementScore >= 50) return 'medium';
  return 'low';
}

function calculateFatigueLevel(
  sessionDuration: number,
  totalResponses: number,
  userProfile: UserProfileInsights
): PersonalizationContext['fatigueLevel'] {
  const minutes = sessionDuration / 60;
  
  // Adjust for engagement style
  const fatigueMultiplier = userProfile.engagementStyle === 'analytical' ? 1.2 : 
                           userProfile.engagementStyle === 'intuitive' ? 0.8 : 1.0;
  
  const fatigueScore = (minutes * fatigueMultiplier) + (totalResponses * 0.5);
  
  if (fatigueScore >= 25) return 'high';
  if (fatigueScore >= 15) return 'moderate';
  if (fatigueScore >= 8) return 'mild';
  return 'none';
}

function getTimeOfDay(): PersonalizationContext['timeOfDay'] {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function getSessionPhase(
  currentIndex: number, 
  totalQuestions: number
): PersonalizationContext['sessionPhase'] {
  const progress = currentIndex / totalQuestions;
  if (progress < 0.2) return 'warmup';
  if (progress < 0.7) return 'focus';
  if (progress < 0.9) return 'deepthink';
  return 'wrapup';
}

function inferPreferredPacing(
  averageResponseTime: number,
  userProfile: UserProfileInsights
): PersonalizationContext['preferredPacing'] {
  if (averageResponseTime < 15) return 'fast';
  if (averageResponseTime > 45) return 'thoughtful';
  return 'moderate';
}

function calculateThoughtfulnessScore(
  textResponses: string[],
  averageResponseTime: number
): number {
  if (textResponses.length === 0) return 50;
  
  const avgLength = textResponses.reduce((sum, response) => {
    return sum + (typeof response === 'string' ? response.length : 0);
  }, 0) / textResponses.length;
  
  const lengthScore = Math.min(50, avgLength / 4); // Up to 50 points for length
  const timeScore = Math.min(30, averageResponseTime / 2); // Up to 30 points for time
  const complexityScore = 20; // Placeholder for complexity analysis
  
  return Math.round(lengthScore + timeScore + complexityScore);
}

function inferEngagementStyle(
  textResponses: string[],
  averageResponseTime: number,
  averageConfidence: number
): UserProfileInsights['engagementStyle'] {
  if (averageResponseTime > 40 && averageConfidence >= 3.5) {
    return 'analytical';
  }
  
  if (averageResponseTime < 25 && textResponses.some(r => 
    typeof r === 'string' && r.toLowerCase().includes('feel')
  )) {
    return 'intuitive';
  }
  
  return 'collaborative';
}

function generatePersonalizedContent(
  question: SurveyQuestion,
  context: PersonalizationContext,
  userName: string,
  responses: Map<string, SaveResponseRequest>
) {
  const content: any = {};
  
  // Generate hints based on user profile and question type
  if (context.sessionPhase === 'focus' && context.userProfile.certaintyLevel === 'uncertain') {
    content.hints = {
      show: true,
      title: "Embrace the uncertainty",
      message: "It's perfectly okay to be unsure. Honest uncertainty is valuable for finding good debate partners.",
      examples: ["Think about your gut reaction", "Consider both sides", "What feels most authentic to you?"]
    };
  }
  
  // Generate engagement boosters
  if (responses.size > 0 && responses.size % 5 === 0) {
    content.engagement = {
      show: true,
      type: 'achievement',
      title: `${responses.size} responses completed! 🎉`,
      message: `You're building a rich belief profile, ${userName}. Each response helps us find better matches.`,
      impact: "Your thoughtful answers will lead to more meaningful debates."
    };
  }
  
  return content;
}

// Export utility functions for other components
export {
  analyzeUserProfile,
  calculateEngagementLevel,
  calculateFatigueLevel,
  type PersonalizationContext,
  type UserProfileInsights
};
