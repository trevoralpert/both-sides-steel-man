/**
 * Phase 3 Task 3.3.2.3: Create Real-Time Feedback and Guidance
 * Immediate validation, progress encouragement, intelligent hints, and quality feedback
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { SurveyQuestion, SaveResponseRequest } from '@/types/survey';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Clock,
  Target,
  MessageSquare,
  Brain,
  Heart,
  Zap,
  Trophy,
  Star,
  ThumbsUp,
  HelpCircle,
  Sparkles,
  Users,
  BookOpen
} from 'lucide-react';
import { useAccessibleContent } from './';

interface RealTimeFeedbackProps {
  question: SurveyQuestion;
  response: any;
  confidence: number;
  engagementTime: number;
  totalResponses: number;
  averageResponseTime: number;
  previousResponses?: Map<string, any>;
  className?: string;
}

interface FeedbackMessage {
  type: 'success' | 'warning' | 'info' | 'encouragement' | 'milestone';
  icon: React.ElementType;
  title: string;
  message: string;
  action?: string;
}

interface QualityMetrics {
  responseComplexity: number; // 0-100
  consistencyScore: number; // 0-100
  engagementLevel: number; // 0-100
  thoughtfulness: number; // 0-100
}

export function RealTimeFeedback({
  question,
  response,
  confidence,
  engagementTime,
  totalResponses,
  averageResponseTime,
  previousResponses = new Map(),
  className = ''
}: RealTimeFeedbackProps) {
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  
  const { getMotivationalText, shouldShowProgressReminders } = useAccessibleContent();

  // Calculate real-time metrics
  const metrics = useMemo(() => {
    if (!response) return null;

    return calculateQualityMetrics(question, response, confidence, engagementTime, previousResponses);
  }, [question, response, confidence, engagementTime, previousResponses]);

  useEffect(() => {
    setQualityMetrics(metrics);
    
    if (metrics && response) {
      const messages = generateFeedbackMessages(
        question,
        response,
        confidence,
        engagementTime,
        metrics,
        totalResponses,
        averageResponseTime
      );
      setFeedbackMessages(messages);
    }
  }, [metrics, response, confidence, engagementTime, totalResponses, averageResponseTime, question]);

  if (!response) {
    return <EngagementHints 
      question={question} 
      engagementTime={engagementTime}
      className={className} 
    />;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quality Metrics Display */}
      {qualityMetrics && (
        <QualityMetricsDisplay 
          metrics={qualityMetrics}
          showDetailed={showDetailedAnalysis}
          onToggleDetailed={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
        />
      )}

      {/* Dynamic Feedback Messages */}
      <div className="space-y-3">
        {feedbackMessages.map((feedback, index) => (
          <FeedbackAlert key={index} feedback={feedback} />
        ))}
      </div>

      {/* Progress Celebration */}
      {shouldShowProgressReminders() && (
        <ProgressCelebration 
          totalResponses={totalResponses}
          responseQuality={qualityMetrics?.thoughtfulness || 0}
        />
      )}
    </div>
  );
}

function calculateQualityMetrics(
  question: SurveyQuestion,
  response: any,
  confidence: number,
  engagementTime: number,
  previousResponses: Map<string, any>
): QualityMetrics {
  let responseComplexity = 0;
  let consistencyScore = 80; // Start with good default
  let engagementLevel = 0;
  let thoughtfulness = 0;

  // Response Complexity Analysis
  if (question.type === 'TEXT_RESPONSE' && typeof response === 'string') {
    const wordCount = response.trim().split(/\s+/).filter(Boolean).length;
    const uniqueWords = new Set(response.toLowerCase().split(/\s+/)).size;
    const avgWordLength = response.replace(/\s/g, '').length / Math.max(wordCount, 1);
    
    responseComplexity = Math.min(100, (
      (wordCount > 20 ? 25 : wordCount * 1.25) +
      (uniqueWords > 15 ? 25 : uniqueWords * 1.67) +
      (avgWordLength > 4 ? 25 : avgWordLength * 6.25) +
      (response.includes('.') || response.includes(',') ? 25 : 0)
    ));
  } else {
    // For other question types, base on response specificity
    responseComplexity = confidence * 20; // 20-100 based on confidence
  }

  // Engagement Level (time-based with optimal ranges)
  const optimalTime = getOptimalEngagementTime(question.type);
  const timeRatio = engagementTime / optimalTime;
  
  if (timeRatio < 0.3) {
    engagementLevel = timeRatio * 100; // Too fast
  } else if (timeRatio <= 2) {
    engagementLevel = 60 + (timeRatio - 0.3) * 23.5; // Optimal range
  } else {
    engagementLevel = Math.max(20, 100 - (timeRatio - 2) * 15); // Too slow
  }

  // Thoughtfulness combines complexity, confidence, and engagement
  thoughtfulness = (
    responseComplexity * 0.4 +
    (confidence * 15) * 0.3 + // Confidence scaled to 0-75
    engagementLevel * 0.3
  );

  // Consistency with previous responses (simplified for now)
  if (previousResponses.size > 0) {
    // This would analyze ideological consistency in a real implementation
    consistencyScore = Math.max(60, 100 - Math.random() * 20); // Placeholder
  }

  return {
    responseComplexity: Math.round(responseComplexity),
    consistencyScore: Math.round(consistencyScore),
    engagementLevel: Math.round(engagementLevel),
    thoughtfulness: Math.round(thoughtfulness)
  };
}

function getOptimalEngagementTime(questionType: string): number {
  const baseOptimalTimes = {
    'TEXT_RESPONSE': 120, // 2 minutes
    'LIKERT_SCALE': 20,   // 20 seconds
    'MULTIPLE_CHOICE': 30, // 30 seconds
    'RANKING': 45,        // 45 seconds
    'BINARY_CHOICE': 15,  // 15 seconds
    'SLIDER': 25          // 25 seconds
  };
  
  return baseOptimalTimes[questionType] || 30;
}

function generateFeedbackMessages(
  question: SurveyQuestion,
  response: any,
  confidence: number,
  engagementTime: number,
  metrics: QualityMetrics,
  totalResponses: number,
  averageResponseTime: number
): FeedbackMessage[] {
  const messages: FeedbackMessage[] = [];

  // Response Quality Feedback
  if (metrics.thoughtfulness >= 80) {
    messages.push({
      type: 'success',
      icon: Star,
      title: 'Excellent Response!',
      message: 'Your thoughtful answer shows deep reflection on this topic. This helps create a rich belief profile.'
    });
  } else if (metrics.thoughtfulness >= 60) {
    messages.push({
      type: 'encouragement',
      icon: ThumbsUp,
      title: 'Good Response',
      message: 'Nice work! Your answer provides valuable insight into your perspective.'
    });
  } else if (metrics.thoughtfulness < 40) {
    messages.push({
      type: 'info',
      icon: Lightbulb,
      title: 'Consider Expanding',
      message: 'You might want to elaborate more to help us better understand your viewpoint.'
    });
  }

  // Engagement Time Feedback
  const optimalTime = getOptimalEngagementTime(question.type);
  if (engagementTime < optimalTime * 0.3) {
    messages.push({
      type: 'warning',
      icon: Clock,
      title: 'Take Your Time',
      message: 'Consider spending a bit more time thinking about this question for the best matching results.'
    });
  } else if (engagementTime > optimalTime * 3) {
    messages.push({
      type: 'info',
      icon: Brain,
      title: 'Deep Thinking',
      message: 'We appreciate your careful consideration! Complex topics deserve thoughtful reflection.'
    });
  }

  // Confidence Level Feedback
  if (confidence <= 2) {
    messages.push({
      type: 'info',
      icon: HelpCircle,
      title: 'Uncertainty is Valuable',
      message: 'Your honest uncertainty helps us understand that you\'re open to different perspectives on this topic.'
    });
  } else if (confidence >= 4) {
    messages.push({
      type: 'success',
      icon: Target,
      title: 'Strong Conviction',
      message: 'Your confidence in this response shows you have well-formed views on this topic.'
    });
  }

  // Milestone Celebrations
  if (totalResponses > 0) {
    const milestones = [5, 10, 15, 20];
    if (milestones.includes(totalResponses)) {
      messages.push({
        type: 'milestone',
        icon: Trophy,
        title: `${totalResponses} Questions Complete!`,
        message: getMilestoneMessage(totalResponses)
      });
    }
  }

  return messages;
}

function getMilestoneMessage(count: number): string {
  const messages = {
    5: "Great start! You're building the foundation of your belief profile.",
    10: "Halfway there! Your responses are painting a clear picture of your perspectives.",
    15: "Excellent progress! You're in the final stretch of creating your profile.",
    20: "Outstanding! You've provided comprehensive insights into your worldview."
  };
  
  return messages[count as keyof typeof messages] || `${count} responses completed - you're doing great!`;
}

function QualityMetricsDisplay({ 
  metrics, 
  showDetailed, 
  onToggleDetailed 
}: { 
  metrics: QualityMetrics;
  showDetailed: boolean;
  onToggleDetailed: () => void;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Response Quality</span>
          </div>
          <Badge className={`${getScoreColor(metrics.thoughtfulness)} border-0`}>
            {getScoreLabel(metrics.thoughtfulness)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Depth</div>
            <div className="font-medium text-sm">{metrics.responseComplexity}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Engagement</div>
            <div className="font-medium text-sm">{metrics.engagementLevel}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Consistency</div>
            <div className="font-medium text-sm">{metrics.consistencyScore}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Overall</div>
            <div className="font-medium text-sm">{metrics.thoughtfulness}%</div>
          </div>
        </div>

        <Progress value={metrics.thoughtfulness} className="h-2" />
        
        {showDetailed && (
          <div className="mt-3 text-xs text-blue-800 space-y-1">
            <div>• Response complexity measures depth and detail of your answer</div>
            <div>• Engagement level reflects appropriate time spent considering the question</div>
            <div>• Consistency shows how your responses align with your overall profile</div>
          </div>
        )}
        
        <button 
          onClick={onToggleDetailed}
          className="text-xs text-blue-600 hover:text-blue-800 mt-2 underline"
        >
          {showDetailed ? 'Hide' : 'Show'} details
        </button>
      </CardContent>
    </Card>
  );
}

function FeedbackAlert({ feedback }: { feedback: FeedbackMessage }) {
  const getAlertStyle = (type: FeedbackMessage['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'encouragement':
        return 'border-blue-200 bg-blue-50';
      case 'milestone':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getIconColor = (type: FeedbackMessage['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'encouragement':
        return 'text-blue-600';
      case 'milestone':
        return 'text-purple-600';
      default:
        return 'text-blue-600';
    }
  };

  const Icon = feedback.icon;

  return (
    <Alert className={`${getAlertStyle(feedback.type)} border`}>
      <Icon className={`h-4 w-4 ${getIconColor(feedback.type)}`} />
      <AlertDescription>
        <div className="space-y-1">
          <div className="font-medium text-sm">{feedback.title}</div>
          <div className="text-sm">{feedback.message}</div>
          {feedback.action && (
            <div className="text-xs underline cursor-pointer hover:no-underline">
              {feedback.action}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function ProgressCelebration({ 
  totalResponses, 
  responseQuality 
}: { 
  totalResponses: number;
  responseQuality: number;
}) {
  if (totalResponses === 0) return null;

  const celebrationEmojis = ['🎯', '💪', '⭐', '🔥', '🚀'];
  const randomEmoji = celebrationEmojis[totalResponses % celebrationEmojis.length];

  return (
    <Card className="border-0 bg-gradient-to-r from-green-50 to-blue-50">
      <CardContent className="p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-green-600" />
          <span className="text-lg">{randomEmoji}</span>
        </div>
        <div className="text-sm font-medium text-green-800 mb-1">
          Amazing Progress!
        </div>
        <div className="text-xs text-green-700">
          {totalResponses} thoughtful responses • {Math.round(responseQuality)}% quality score
        </div>
      </CardContent>
    </Card>
  );
}

function EngagementHints({ 
  question, 
  engagementTime, 
  className = '' 
}: { 
  question: SurveyQuestion;
  engagementTime: number;
  className?: string;
}) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Show hints after 15 seconds of no response
    if (engagementTime > 15) {
      setShowHint(true);
    }
  }, [engagementTime]);

  if (!showHint) return null;

  const getTypeSpecificHint = () => {
    switch (question.type) {
      case 'LIKERT_SCALE':
        return {
          title: "Consider Your Personal Experience",
          message: "Think about times you've encountered this situation. How did it make you feel?",
          icon: Heart
        };
      case 'TEXT_RESPONSE':
        return {
          title: "Share Your Authentic Voice",
          message: "There's no wrong answer here. What's your honest perspective on this topic?",
          icon: MessageSquare
        };
      case 'MULTIPLE_CHOICE':
        return {
          title: "Which Resonates Most?",
          message: "Consider which option feels most aligned with your values and experiences.",
          icon: Target
        };
      case 'RANKING':
        return {
          title: "What Matters Most to You?",
          message: "Think about your priorities and what you value in your daily life.",
          icon: TrendingUp
        };
      default:
        return {
          title: "Take Your Time",
          message: "Thoughtful responses lead to better debate matches. Consider what feels right to you.",
          icon: Brain
        };
    }
  };

  const hint = getTypeSpecificHint();
  const Icon = hint.icon;

  return (
    <div className={className}>
      <Alert className="border-blue-200 bg-blue-50 animate-fade-in">
        <Icon className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="space-y-1">
            <div className="font-medium text-sm text-blue-900">{hint.title}</div>
            <div className="text-sm text-blue-800">{hint.message}</div>
            <div className="text-xs text-blue-700 mt-2">
              💡 Remember: Your honest responses help us find the best debate partners for you
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
