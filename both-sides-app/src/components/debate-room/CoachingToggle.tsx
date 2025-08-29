'use client';

/**
 * Phase 6 Task 6.4.1: Coaching Toggle Component
 * 
 * Show/hide toggle for the AI coaching sidebar
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  PanelRightOpen, 
  PanelRightClose,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export interface CoachingToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  hasNewSuggestions?: boolean;
  suggestionCount?: number;
  variant?: 'default' | 'compact' | 'floating';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function CoachingToggle({
  isVisible,
  onToggle,
  hasNewSuggestions = false,
  suggestionCount = 0,
  variant = 'default',
  position = 'right',
  className
}: CoachingToggleProps) {
  
  const renderToggleButton = () => {
    switch (variant) {
      case 'compact':
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "h-8 w-8 p-0 rounded-full relative",
              hasNewSuggestions && !isVisible && "ring-2 ring-purple-500 ring-offset-1",
              className
            )}
          >
            <Brain className={cn(
              "h-4 w-4",
              isVisible ? "text-purple-600" : "text-muted-foreground",
              hasNewSuggestions && !isVisible && "text-purple-500"
            )} />
            
            {hasNewSuggestions && !isVisible && suggestionCount > 0 && (
              <Badge 
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
              >
                {suggestionCount > 9 ? '9+' : suggestionCount}
              </Badge>
            )}
          </Button>
        );

      case 'floating':
        return (
          <Button
            onClick={onToggle}
            className={cn(
              "fixed z-50 h-12 w-12 rounded-full shadow-lg transition-all duration-200",
              "bg-purple-600 hover:bg-purple-700 text-white",
              position === 'right' && "right-4 top-1/2 -translate-y-1/2",
              position === 'left' && "left-4 top-1/2 -translate-y-1/2",
              position === 'top' && "top-4 left-1/2 -translate-x-1/2",
              position === 'bottom' && "bottom-4 left-1/2 -translate-x-1/2",
              hasNewSuggestions && !isVisible && "ring-4 ring-purple-300 ring-offset-2 animate-pulse",
              isVisible && "bg-gray-600 hover:bg-gray-700",
              className
            )}
          >
            {isVisible ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <>
                <Brain className="h-5 w-5" />
                {hasNewSuggestions && suggestionCount > 0 && (
                  <Badge 
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {suggestionCount > 9 ? '9+' : suggestionCount}
                  </Badge>
                )}
              </>
            )}
          </Button>
        );

      case 'default':
      default:
        return (
          <Button
            variant={isVisible ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            className={cn(
              "relative transition-all duration-200",
              hasNewSuggestions && !isVisible && "ring-2 ring-purple-500 ring-offset-1 border-purple-300",
              isVisible && "bg-purple-600 hover:bg-purple-700",
              className
            )}
          >
            <div className="flex items-center space-x-2">
              {isVisible ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <Brain className={cn(
                  "h-4 w-4",
                  hasNewSuggestions ? "text-purple-500" : "text-current"
                )} />
              )}
              
              <span className="text-sm font-medium">
                {isVisible ? 'Hide Coaching' : 'AI Coaching'}
              </span>
              
              {hasNewSuggestions && !isVisible && (
                <Sparkles className="h-3 w-3 text-purple-500" />
              )}
            </div>
            
            {hasNewSuggestions && !isVisible && suggestionCount > 0 && (
              <Badge 
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {suggestionCount > 9 ? '9+' : suggestionCount}
              </Badge>
            )}
          </Button>
        );
    }
  };

  return renderToggleButton();
}

export default CoachingToggle;
