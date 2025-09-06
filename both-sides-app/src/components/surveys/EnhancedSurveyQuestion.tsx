/**
 * Phase 3 Task 3.3.2.1: Create Question Component Library
 * Sophisticated, engaging question components with visual feedback and explanatory content
 */

'use client';

import { useState, useEffect, useRef } from 'react';

import { SurveyQuestion, SurveyQuestionType, SaveResponseRequest } from '@/types/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Heart,
  Brain,
  Users,
  Move,
  GripVertical,
  Info,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { SurveyHelpers } from '@/lib/api/survey';

import { EducationalTooltip, useAccessibleContent } from './';

interface EnhancedSurveyQuestionProps {
  question: SurveyQuestion;
  onResponse: (response: SaveResponseRequest) => void;
  initialValue?: any;
  showProgress?: boolean;
  currentIndex: number;
  totalQuestions: number;
  isLoading?: boolean;
  previousResponses?: Map<string, any>; // For personalization
  showHints?: boolean;
  showEncouragement?: boolean;
}

export function EnhancedSurveyQuestion({
  question,
  onResponse,
  initialValue,
  showProgress = true,
  currentIndex,
  totalQuestions,
  isLoading = false,
  previousResponses = new Map(),
  showHints = true,
  showEncouragement = true,
}: EnhancedSurveyQuestionProps) {
  const [response, setResponse] = useState<any>(initialValue);
  const [confidence, setConfidence] = useState<number>(3);
  const [startTime] = useState<Date>(new Date());
  const [error, setError] = useState<string>('');
  const [showValidation, setShowValidation] = useState(false);
  const [engagementTime, setEngagementTime] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [responseChanged, setResponseChanged] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { getAccessibleText, getMotivationalText, shouldShowProgressReminders } = useAccessibleContent();

  // Track engagement time
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setEngagementTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Show hint after extended thinking time
  useEffect(() => {
    if (engagementTime > 30 && !response && showHints) {
      setShowHint(true);
    }
  }, [engagementTime, response, showHints]);

  const handleResponseChange = (newValue: any) => {
    setResponse(newValue);
    setError('');
    setShowValidation(false);
    setResponseChanged(true);
    
    // Real-time validation feedback
    if (newValue) {
      const validation = SurveyHelpers.validateResponseLocally(question, newValue);
      if (validation.isValid) {
        setShowValidation(true);
      }
    }
  };

  const handleSubmit = () => {
    const validation = SurveyHelpers.validateResponseLocally(question, response);
    if (!validation.isValid) {
      setError(validation.error || 'Please provide a valid response');
      return;
    }

    setError('');
    const completionTime = Date.now() - startTime.getTime();
    
    onResponse({
      question_id: question.id,
      response_value: response,
      confidence_level: confidence,
      completion_time: completionTime,
    });
  };

  const getPersonalizedHint = () => {
    // Generate hints based on previous responses and question type
    if (question.type === 'LIKERT_SCALE') {
      return getAccessibleText({
        simple: "Think about how you personally feel about this topic.",
        detailed: "Consider your own experiences and values when rating your agreement.",
        comprehensive: "Reflect on how this statement aligns with your personal experiences, values, and observations of the world around you."
      });
    }

    if (question.type === 'TEXT_RESPONSE') {
      return getAccessibleText({
        simple: "Share what comes to mind - there's no wrong answer.",
        detailed: "Take your time to express your genuine thoughts and feelings about this topic.",
        comprehensive: "This is your space to share authentic reflections. Consider specific examples or experiences that shaped your perspective."
      });
    }

    return "Take your time to think about this question. Your honest response helps create better matches.";
  };

  const getEncouragementMessage = () => {
    const progress = (currentIndex / totalQuestions) * 100;
    
    if (progress < 25) {
      return getMotivationalText({
        encouraging: "Great start! You're building the foundation of your belief profile. 🌟",
        neutral: "Progress: Building your belief profile foundation.",
        minimal: `${Math.round(progress)}% complete`
      });
    }
    
    if (progress < 50) {
      return getMotivationalText({
        encouraging: "You're doing wonderfully! Each response helps us understand you better. 💪",
        neutral: "Halfway through the core questions. Keep going.",
        minimal: `${Math.round(progress)}% complete`
      });
    }
    
    if (progress < 75) {
      return getMotivationalText({
        encouraging: "Excellent progress! Your thoughtful responses are creating a rich profile. 🎯",
        neutral: "Moving through the final sections now.",
        minimal: `${Math.round(progress)}% complete`
      });
    }
    
    return getMotivationalText({
      encouraging: "Almost there! You're doing an amazing job sharing your perspectives. 🏁",
      neutral: "Final questions - nearly complete.",
      minimal: `${Math.round(progress)}% complete`
    });
  };

  const renderQuestionInput = () => {
    switch (question.type) {
      case 'LIKERT_SCALE':
        return (
          <EnhancedLikertScale 
            question={question} 
            value={response} 
            onChange={handleResponseChange}
            showValidation={showValidation}
          />
        );
      
      case 'BINARY_CHOICE':
        return (
          <EnhancedBinaryChoice 
            question={question} 
            value={response} 
            onChange={handleResponseChange}
            showValidation={showValidation}
          />
        );
      
      case 'MULTIPLE_CHOICE':
        return (
          <EnhancedMultipleChoice 
            question={question} 
            value={response} 
            onChange={handleResponseChange}
            showValidation={showValidation}
          />
        );
      
      case 'RANKING':
        return (
          <EnhancedRanking 
            question={question} 
            value={response} 
            onChange={handleResponseChange}
            showValidation={showValidation}
          />
        );
      
      case 'SLIDER':
        return (
          <EnhancedSlider 
            question={question} 
            value={response} 
            onChange={handleResponseChange}
            showValidation={showValidation}
          />
        );
      
      case 'TEXT_RESPONSE':
        return (
          <EnhancedTextResponse 
            question={question} 
            value={response} 
            onChange={handleResponseChange}
            showValidation={showValidation}
          />
        );
      
      default:
        return <div>Unsupported question type: {question.type}</div>;
    }
  };

  const progress = SurveyHelpers.calculateProgress(currentIndex, totalQuestions);

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-0 overflow-hidden">
      {/* Enhanced Progress Header */}
      {showProgress && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">
                Question {currentIndex + 1} of {totalQuestions}
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                {SurveyHelpers.getCategoryLabel(question.category)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </div>
          </div>
          
          <Progress value={progress} className="h-3 mb-2" />
          
          {showEncouragement && shouldShowProgressReminders() && (
            <div className="text-sm text-blue-700 flex items-center gap-2 mt-2">
              <Sparkles className="h-4 w-4" />
              {getEncouragementMessage()}
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-xl leading-relaxed flex items-start gap-3">
          <div className="flex-1">
            {question.question}
          </div>
          {/* Educational tooltip for complex concepts */}
          <EducationalTooltip
            term={question.question.split(' ')[0]} // Extract key term
            definition="Click for explanation"
            className="shrink-0"
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Question Input */}
        <div className="relative">
          {renderQuestionInput()}
          
          {/* Success Validation */}
          {showValidation && response && (
            <div className="absolute -top-2 right-0">
              <div className="bg-green-100 text-green-800 rounded-full p-1">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>

        {/* Confidence Rating with Enhanced UI */}
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            <label className="text-sm font-medium">How confident are you in this response?</label>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs text-muted-foreground">Not sure</span>
            <div className="flex-1 relative">
              <Slider
                value={[confidence]}
                onValueChange={(value) => setConfidence(value[0])}
                max={5}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Very sure</span>
          </div>
          
          <div className="text-center">
            <Badge variant="secondary" className="text-xs">
              {['Not sure', 'Somewhat unsure', 'Neutral', 'Fairly sure', 'Very sure'][confidence - 1]}
            </Badge>
          </div>
        </div>

        {/* Intelligent Hint System */}
        {showHint && !response && (
          <Alert className="border-blue-200 bg-blue-50">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Need some guidance?</strong> {getPersonalizedHint()}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Action Bar */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {question.required && (
              <span className="flex items-center gap-1">
                <span className="text-red-500">*</span>
                Required question
              </span>
            )}
            {responseChanged && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Response saved
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {response && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResponse(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
            
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || (question.required && !response)}
              className="px-6"
            >
              {isLoading ? (
                <>Loading...</>
              ) : currentIndex === totalQuestions - 1 ? (
                <>Complete Survey</>
              ) : (
                <>Continue</>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Question Components

function EnhancedLikertScale({ question, value, onChange, showValidation }: any) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  
  const labels = [
    { short: 'SD', full: 'Strongly Disagree', color: 'bg-red-100 hover:bg-red-200 text-red-800' },
    { short: 'D', full: 'Disagree', color: 'bg-orange-100 hover:bg-orange-200 text-orange-800' },
    { short: 'N', full: 'Neutral', color: 'bg-gray-100 hover:bg-gray-200 text-gray-800' },
    { short: 'A', full: 'Agree', color: 'bg-blue-100 hover:bg-blue-200 text-blue-800' },
    { short: 'SA', full: 'Strongly Agree', color: 'bg-green-100 hover:bg-green-200 text-green-800' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {labels.map((label, index) => {
          const isSelected = value === index + 1;
          const isHovered = hoverValue === index + 1;
          
          return (
            <Button
              key={index}
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => onChange(index + 1)}
              onMouseEnter={() => setHoverValue(index + 1)}
              onMouseLeave={() => setHoverValue(null)}
              className={`h-auto py-4 text-center transition-all duration-200 ${
                !isSelected ? label.color : ''
              } ${isHovered ? 'scale-105 shadow-md' : ''}`}
            >
              <div>
                <div className="font-bold text-lg mb-1">{index + 1}</div>
                <div className="text-xs hidden md:block">{label.short}</div>
                <div className="text-xs md:text-sm font-medium">{label.full}</div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Visual feedback for selection */}
      {value && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-full text-sm">
            <TrendingUp className="h-4 w-4" />
            You selected: <strong>{labels[value - 1].full}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function EnhancedBinaryChoice({ question, value, onChange, showValidation }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          variant={value === true ? 'default' : 'outline'}
          onClick={() => onChange(true)}
          className="h-20 text-lg relative overflow-hidden group"
        >
          <div className="flex items-center justify-center gap-3">
            <CheckCircle2 className="h-6 w-6" />
            <span>Yes</span>
          </div>
          {value === true && (
            <div className="absolute inset-0 bg-green-100 opacity-20 animate-pulse" />
          )}
        </Button>
        
        <Button
          variant={value === false ? 'default' : 'outline'}
          onClick={() => onChange(false)}
          className="h-20 text-lg relative overflow-hidden group"
        >
          <div className="flex items-center justify-center gap-3">
            <AlertCircle className="h-6 w-6" />
            <span>No</span>
          </div>
          {value === false && (
            <div className="absolute inset-0 bg-blue-100 opacity-20 animate-pulse" />
          )}
        </Button>
      </div>
      
      {/* Explanatory content based on selection */}
      {value !== undefined && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-700">
              {value 
                ? "Your 'Yes' response indicates agreement with this perspective. This helps us understand areas where you have strong positive positions."
                : "Your 'No' response indicates disagreement with this perspective. This helps us understand areas where you hold alternative viewpoints."
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EnhancedMultipleChoice({ question, value, onChange, showValidation }: any) {
  const [expandedOption, setExpandedOption] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {question.options?.map((option: string, index: number) => {
        const isSelected = value === option;
        
        return (
          <div key={index} className="relative">
            <Button
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => onChange(option)}
              className="w-full h-auto py-4 text-left justify-start relative group"
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <span className="flex-1 text-left">{option}</span>
              </div>
              {isSelected && (
                <div className="absolute inset-0 bg-blue-50 opacity-30 rounded-md" />
              )}
            </Button>
          </div>
        );
      })}
      
      {value && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Brain className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>You selected:</strong> "{value}"
              <br />
              <span className="text-xs mt-1">
                This choice reflects your perspective and will help create meaningful debate matches.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EnhancedRanking({ question, value = [], onChange, showValidation }: any) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const items = value?.length > 0 ? value : question.options || [];

  const handleDragStart = (item: string) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (dropIndex: number) => {
    if (!draggedItem) return;
    
    const newOrder = [...items];
    const dragIndex = newOrder.indexOf(draggedItem);
    
    if (dragIndex !== -1) {
      newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, draggedItem);
      onChange(newOrder);
    }
    
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Move className="h-4 w-4" />
        <span>Drag and drop to rank in order of preference (1 = highest priority)</span>
      </div>
      
      <div className="space-y-2">
        {items.map((item: string, index: number) => (
          <div
            key={item}
            draggable
            onDragStart={() => handleDragStart(item)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            className={`flex items-center gap-3 p-4 border rounded-lg cursor-move transition-all duration-200 ${
              draggedItem === item ? 'opacity-50 scale-95' : ''
            } ${
              dragOverIndex === index ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <Badge variant={index < 3 ? 'default' : 'secondary'} className="mt-1 min-w-[24px]">
                  {index + 1}
                </Badge>
              </div>
              <span className="flex-1">{item}</span>
              {index < 3 && (
                <Badge variant="outline" className="text-xs">
                  {index === 0 ? 'Top Priority' : index === 1 ? 'High' : 'Medium'}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {value?.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div className="text-sm text-green-800">
              <strong>Your ranking is set!</strong> This shows your priority order and helps us understand what matters most to you.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EnhancedSlider({ question, value, onChange, showValidation }: any) {
  const scale = question.scale || { min: 0, max: 100, labels: ['Low', 'High'] };
  const [isActive, setIsActive] = useState(false);

  const getSliderColor = () => {
    if (value === undefined) return 'bg-gray-200';
    const percentage = ((value - scale.min) / (scale.max - scale.min)) * 100;
    if (percentage < 25) return 'bg-red-400';
    if (percentage < 50) return 'bg-orange-400';
    if (percentage < 75) return 'bg-blue-400';
    return 'bg-green-400';
  };

  return (
    <div className="space-y-6">
      <div className="relative p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
        <div className="flex justify-between text-sm font-medium text-gray-700 mb-4">
          <span className="flex items-center gap-2">
            📉 {scale.labels?.[0] || scale.min}
          </span>
          <span className="flex items-center gap-2">
            📈 {scale.labels?.[1] || scale.max}
          </span>
        </div>
        
        <div className="relative">
          <Slider
            value={[value || scale.min]}
            onValueChange={(newValue) => {
              onChange(newValue[0]);
              setIsActive(true);
            }}
            max={scale.max}
            min={scale.min}
            step={1}
            className="w-full"
          />
          
          {/* Visual indicator */}
          {value !== undefined && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
              <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getSliderColor()}`}>
                {value}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{scale.min}</span>
          <span>{Math.round((scale.min + scale.max) / 2)}</span>
          <span>{scale.max}</span>
        </div>
      </div>

      {value !== undefined && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-full text-sm">
            <TrendingUp className="h-4 w-4" />
            Your position: <strong>{value}</strong> out of {scale.max}
          </div>
        </div>
      )}
    </div>
  );
}

function EnhancedTextResponse({ question, value, onChange, showValidation }: any) {
  const [wordCount, setWordCount] = useState(0);
  const [showGuidance, setShowGuidance] = useState(false);

  useEffect(() => {
    if (value) {
      setWordCount(value.trim().split(/\s+/).filter(Boolean).length);
    } else {
      setWordCount(0);
    }
  }, [value]);

  const getGuidedPrompts = () => [
    "💭 What's your first reaction to this question?",
    "🤔 Can you think of a specific example?",
    "⚖️ What factors make this topic complicated?",
    "🌟 How do your personal experiences influence this view?"
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Share your thoughts... there's no wrong answer here."
          className="min-h-32 text-base leading-relaxed resize-none"
          maxLength={1000}
          onFocus={() => setShowGuidance(true)}
        />
        
        <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{(value || '').length}/1000 characters</span>
        </div>
      </div>

      {/* Guided prompts */}
      {showGuidance && !value && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 font-medium">
              Need some inspiration? Try thinking about:
            </div>
          </div>
          <div className="space-y-2">
            {getGuidedPrompts().map((prompt, index) => (
              <div key={index} className="text-sm text-blue-700 pl-4">
                {prompt}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response feedback */}
      {value && value.length > 20 && (
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div className="text-sm text-green-800">
              <strong>Great response!</strong> Your thoughtful reflection helps create a richer belief profile.
              {wordCount > 50 && " Your detailed answer shows deep thinking about this topic."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
