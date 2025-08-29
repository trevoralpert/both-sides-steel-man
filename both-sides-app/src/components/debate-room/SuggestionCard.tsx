'use client';

/**
 * Phase 6 Task 6.4.1: Suggestion Card Component
 * 
 * Individual coaching suggestion display with actions and examples
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CoachingSuggestion, CoachingPriority } from './CoachingSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Lightbulb, 
  Target, 
  Shield, 
  MessageSquare, 
  Search,
  BookOpen,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

export interface SuggestionCardProps {
  suggestion: CoachingSuggestion;
  isApplied: boolean;
  onApply: () => void;
  onFeedback?: (suggestionId: string, helpful: boolean) => void;
  compact?: boolean;
  className?: string;
}

// Type-specific styling and icons
const suggestionTypeConfig = {
  'argument_strength': {
    icon: Target,
    color: 'text-red-600 bg-red-50 border-red-200',
    label: 'Argument'
  },
  'evidence_needed': {
    icon: Search,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    label: 'Evidence'
  },
  'counter_argument': {
    icon: Shield,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    label: 'Counter-Argument'
  },
  'structure': {
    icon: BookOpen,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    label: 'Structure'
  },
  'respectfulness': {
    icon: MessageSquare,
    color: 'text-green-600 bg-green-50 border-green-200',
    label: 'Tone'
  },
  'clarity': {
    icon: Lightbulb,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    label: 'Clarity'
  },
  'strategy': {
    icon: Sparkles,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    label: 'Strategy'
  }
};

export function SuggestionCard({
  suggestion,
  isApplied,
  onApply,
  onFeedback,
  compact = false,
  className
}: SuggestionCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  
  const typeConfig = suggestionTypeConfig[suggestion.type];
  const IconComponent = typeConfig.icon;

  const getPriorityConfig = (priority: CoachingPriority) => {
    switch (priority) {
      case 'high': 
        return { 
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: AlertCircle,
          label: 'High Priority'
        };
      case 'medium': 
        return { 
          color: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: Clock,
          label: 'Medium Priority'
        };
      case 'low': 
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: Lightbulb,
          label: 'Low Priority'
        };
    }
  };

  const priorityConfig = getPriorityConfig(suggestion.priority);
  const PriorityIcon = priorityConfig.icon;

  const handleCopyExample = async (example: string) => {
    try {
      await navigator.clipboard.writeText(example);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy example:', error);
    }
  };

  if (compact) {
    return (
      <div className={cn(
        "p-3 rounded-lg border-l-4 bg-card",
        typeConfig.color.includes('red') && "border-l-red-500",
        typeConfig.color.includes('orange') && "border-l-orange-500",
        typeConfig.color.includes('purple') && "border-l-purple-500",
        typeConfig.color.includes('blue') && "border-l-blue-500",
        typeConfig.color.includes('green') && "border-l-green-500",
        typeConfig.color.includes('amber') && "border-l-amber-500",
        typeConfig.color.includes('indigo') && "border-l-indigo-500",
        isApplied && "opacity-60 bg-muted",
        className
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <IconComponent className="h-3 w-3 flex-shrink-0" />
              <Badge variant="outline" className={cn("text-xs", priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
            </div>
            <p className="text-sm font-medium">{suggestion.suggestion}</p>
            {suggestion.explanation && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {suggestion.explanation}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            {isApplied ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Button variant="ghost" size="sm" onClick={onApply} className="h-6 px-2 text-xs">
                Apply
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isApplied && "opacity-75 bg-muted/50",
      className
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1">
            <div className={cn(
              "p-2 rounded-lg border",
              typeConfig.color
            )}>
              <IconComponent className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {typeConfig.label}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", priorityConfig.color)}
                >
                  <PriorityIcon className="h-3 w-3 mr-1" />
                  {priorityConfig.label}
                </Badge>
              </div>
              
              <h4 className="font-medium text-sm leading-tight">
                {suggestion.suggestion}
              </h4>
              
              {suggestion.explanation && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {suggestion.explanation}
                </p>
              )}
            </div>
          </div>

          {/* Apply Button */}
          <div className="ml-2 flex-shrink-0">
            {isApplied ? (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Applied</span>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={onApply}>
                <Sparkles className="h-3 w-3 mr-1" />
                Apply
              </Button>
            )}
          </div>
        </div>

        {/* Examples Section */}
        {suggestion.examples && suggestion.examples.length > 0 && (
          <Collapsible open={showExamples} onOpenChange={setShowExamples}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between h-8 px-2 mb-2"
              >
                <span className="text-xs font-medium">
                  Example Phrases ({suggestion.examples.length})
                </span>
                {showExamples ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="space-y-2 mb-3">
                {suggestion.examples.map((example, index) => (
                  <div 
                    key={index} 
                    className="flex items-start justify-between p-2 bg-muted/50 rounded text-xs group"
                  >
                    <span className="italic text-muted-foreground flex-1 pr-2">
                      &quot;{example}&quot;
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyExample(example)}
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Resources Section */}
        {suggestion.resources && suggestion.resources.length > 0 && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between h-8 px-2 mb-2"
              >
                <span className="text-xs font-medium">
                  Learning Resources ({suggestion.resources.length})
                </span>
                {showDetails ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="space-y-2 mb-3">
                {suggestion.resources.map((resource, index) => (
                  <div 
                    key={index} 
                    className="flex items-start space-x-2 p-2 bg-muted/30 rounded"
                  >
                    <BookOpen className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {resource.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {resource.description}
                      </p>
                    </div>
                    {resource.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 flex-shrink-0"
                        title="Open resource"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Feedback Section */}
        {onFeedback && !isApplied && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Was this helpful?</span>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFeedback(suggestion.id, true)}
                className="h-6 px-2"
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFeedback(suggestion.id, false)}
                className="h-6 px-2"
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Suggested {suggestion.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SuggestionCard;
