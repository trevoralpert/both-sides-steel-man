'use client';

/**
 * Phase 3 Task 3.1.2.1: Flexible Survey Question Rendering Components
 */

import { useState, useEffect } from 'react';
import { SurveyQuestion, SurveyQuestionType, SaveResponseRequest } from '@/types/survey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SurveyHelpers } from '@/lib/api/survey';

interface SurveyQuestionProps {
  question: SurveyQuestion;
  onResponse: (response: SaveResponseRequest) => void;
  initialValue?: any;
  showProgress?: boolean;
  currentIndex: number;
  totalQuestions: number;
  isLoading?: boolean;
}

export function SurveyQuestionComponent({
  question,
  onResponse,
  initialValue,
  showProgress = true,
  currentIndex,
  totalQuestions,
  isLoading = false,
}: SurveyQuestionProps) {
  const [response, setResponse] = useState<any>(initialValue);
  const [confidence, setConfidence] = useState<number>(3);
  const [startTime] = useState<Date>(new Date());
  const [error, setError] = useState<string>('');

  const handleSubmit = () => {
    const validation = SurveyHelpers.validateResponseLocally(question, response);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid response');
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

  const renderQuestionInput = () => {
    switch (question.type) {
      case 'LIKERT_SCALE':
        return <LikertScaleInput question={question} value={response} onChange={setResponse} />;
      
      case 'BINARY_CHOICE':
        return <BinaryChoiceInput question={question} value={response} onChange={setResponse} />;
      
      case 'MULTIPLE_CHOICE':
        return <MultipleChoiceInput question={question} value={response} onChange={setResponse} />;
      
      case 'RANKING':
        return <RankingInput question={question} value={response} onChange={setResponse} />;
      
      case 'SLIDER':
        return <SliderInput question={question} value={response} onChange={setResponse} />;
      
      case 'TEXT_RESPONSE':
        return <TextResponseInput question={question} value={response} onChange={setResponse} />;
      
      default:
        return <div>Unsupported question type: {question.type}</div>;
    }
  };

  const progress = SurveyHelpers.calculateProgress(currentIndex, totalQuestions);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      {showProgress && (
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <Badge variant="outline">
              {SurveyHelpers.getCategoryLabel(question.category)}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-lg leading-relaxed">
          {question.question}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {renderQuestionInput()}

        {/* Confidence Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium">How confident are you in this response?</label>
          <div className="flex items-center space-x-4">
            <span className="text-xs">Not sure</span>
            <Slider
              value={[confidence]}
              onValueChange={(value) => setConfidence(value[0])}
              max={5}
              min={1}
              step={1}
              className="flex-1"
            />
            <span className="text-xs">Very sure</span>
          </div>
          <div className="text-center text-xs text-muted-foreground">
            {['Not sure', 'Somewhat unsure', 'Neutral', 'Fairly sure', 'Very sure'][confidence - 1]}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-between">
          <div className="text-xs text-muted-foreground">
            {question.required && '* Required question'}
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || (question.required && !response)}
          >
            {isLoading ? 'Saving...' : 'Next Question'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Individual question type components
function LikertScaleInput({ question, value, onChange }) {
  const labels = ['Strongly Disagree', 'Disagree', 'Somewhat Disagree', 'Neutral', 'Somewhat Agree', 'Agree', 'Strongly Agree'];
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {labels.map((label, index) => (
          <Button
            key={index}
            variant={value === index + 1 ? 'default' : 'outline'}
            onClick={() => onChange(index + 1)}
            className="h-auto py-3 text-xs"
          >
            <div className="text-center">
              <div className="font-medium">{index + 1}</div>
              <div className="mt-1">{label}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}

function BinaryChoiceInput({ question, value, onChange }) {
  return (
    <div className="flex gap-4">
      <Button
        variant={value === true ? 'default' : 'outline'}
        onClick={() => onChange(true)}
        className="flex-1 h-16"
      >
        Yes
      </Button>
      <Button
        variant={value === false ? 'default' : 'outline'}
        onClick={() => onChange(false)}
        className="flex-1 h-16"
      >
        No
      </Button>
    </div>
  );
}

function MultipleChoiceInput({ question, value, onChange }) {
  return (
    <div className="space-y-2">
      {question.options?.map((option, index) => (
        <Button
          key={index}
          variant={value === option ? 'default' : 'outline'}
          onClick={() => onChange(option)}
          className="w-full h-auto py-3 text-left justify-start"
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

function RankingInput({ question, value = [], onChange }) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleDragStart = (item: string) => setDraggedItem(item);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (dropIndex: number) => {
    if (!draggedItem) return;
    
    const newOrder = [...(value || question.options || [])];
    const dragIndex = newOrder.indexOf(draggedItem);
    
    if (dragIndex !== -1) {
      newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, draggedItem);
      onChange(newOrder);
    }
    
    setDraggedItem(null);
  };

  const items = value?.length > 0 ? value : question.options || [];

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Drag and drop to rank in order of preference:</p>
      {items.map((item, index) => (
        <div
          key={item}
          draggable
          onDragStart={() => handleDragStart(item)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(index)}
          className="flex items-center gap-3 p-3 border rounded cursor-move hover:bg-muted"
        >
          <Badge variant="outline">{index + 1}</Badge>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function SliderInput({ question, value, onChange }) {
  const scale = question.scale || { min: 0, max: 100, labels: ['Low', 'High'] };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{scale.labels?.[0] || scale.min}</span>
        <span>{scale.labels?.[1] || scale.max}</span>
      </div>
      <Slider
        value={[value || scale.min]}
        onValueChange={(newValue) => onChange(newValue[0])}
        max={scale.max}
        min={scale.min}
        step={1}
        className="w-full"
      />
      <div className="text-center text-sm font-medium">
        Selected: {value || scale.min}
      </div>
    </div>
  );
}

function TextResponseInput({ question, value, onChange }) {
  return (
    <div className="space-y-2">
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Please share your thoughts..."
        className="min-h-24"
        maxLength={1000}
      />
      <div className="text-right text-xs text-muted-foreground">
        {(value || '').length}/1000 characters
      </div>
    </div>
  );
}
