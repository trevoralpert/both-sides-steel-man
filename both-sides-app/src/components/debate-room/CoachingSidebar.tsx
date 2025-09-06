'use client';

/**
 * Phase 6 Task 6.4.1: AI Coaching Sidebar Interface
 * 
 * Collapsible coaching sidebar with real-time AI suggestions
 * Integrates with existing AI coaching service from Phase 5
 */

import React, { useState, useEffect, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase, Message } from '@/types/debate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  Lightbulb, 
  Target, 
  TrendingUp, 
  MessageSquare, 
  Search,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Star,
  BookOpen
} from 'lucide-react';

import { SuggestionCard } from './SuggestionCard';
import { SuggestionDisplay } from './SuggestionDisplay';

export interface CoachingSidebarProps {
  conversationId: string;
  userId: string;
  currentPhase: DebatePhase;
  currentMessage?: string; // Draft being typed
  recentMessages: Message[];
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

// Coaching suggestion types from Phase 5 AI service
export type CoachingSuggestionType = 
  | 'argument_strength'
  | 'evidence_needed'
  | 'counter_argument'
  | 'structure'
  | 'respectfulness'
  | 'clarity'
  | 'strategy';

export type CoachingPriority = 'high' | 'medium' | 'low';

export interface CoachingSuggestion {
  id: string;
  type: CoachingSuggestionType;
  priority: CoachingPriority;
  suggestion: string;
  explanation: string;
  examples?: string[];
  resources?: {
    type: 'article' | 'video' | 'guide';
    title: string;
    description: string;
    url?: string;
  }[];
  isApplied?: boolean;
  timestamp: Date;
}

export interface CoachingCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  suggestions: CoachingSuggestion[];
  priority: CoachingPriority;
}

// Mock coaching data - will be replaced with API integration
const mockCoachingSuggestions: CoachingSuggestion[] = [
  {
    id: 'cs-1',
    type: 'argument_strength',
    priority: 'high',
    suggestion: 'Consider strengthening your argument with more specific evidence',
    explanation: 'Your main point needs supporting data or expert opinions to be more convincing.',
    examples: [
      'According to the 2023 study by Smith et al...',
      'Data from the National Institute shows that...',
      'Expert Dr. Johnson argues that...'
    ],
    resources: [
      {
        type: 'guide',
        title: 'Finding Credible Sources',
        description: 'Learn how to identify and use reliable evidence in debates'
      }
    ],
    timestamp: new Date()
  },
  {
    id: 'cs-2',
    type: 'respectfulness',
    priority: 'medium',
    suggestion: 'Great job maintaining respectful dialogue!',
    explanation: 'You\'re doing well at disagreeing respectfully while staying focused on the issues.',
    examples: [
      'Continue using phrases like "I understand your point, however..."',
      'Keep focusing on ideas rather than personal attributes'
    ],
    timestamp: new Date()
  },
  {
    id: 'cs-3',
    type: 'counter_argument',
    priority: 'high',
    suggestion: 'Address the opposing view on economic impact',
    explanation: 'Your opponent raised concerns about economic effects that should be addressed directly.',
    examples: [
      'While economic concerns are valid, research shows...',
      'The short-term costs must be weighed against long-term benefits...',
      'Studies indicate that the economic impact is actually...'
    ],
    resources: [
      {
        type: 'article',
        title: 'Effective Counter-Argument Techniques',
        description: 'Strategies for addressing opposing viewpoints constructively'
      }
    ],
    timestamp: new Date()
  },
  {
    id: 'cs-4',
    type: 'structure',
    priority: 'low',
    suggestion: 'Try organizing your points more clearly',
    explanation: 'Using a clear structure like "First, Second, Finally" helps your audience follow your logic.',
    examples: [
      'First, let me address the main concern...',
      'My second point focuses on...',
      'Finally, we must consider...'
    ],
    timestamp: new Date()
  }
];

export function CoachingSidebar({
  conversationId,
  userId,
  currentPhase,
  currentMessage,
  recentMessages,
  isVisible,
  onToggle,
  className
}: CoachingSidebarProps) {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  // Group suggestions by category
  const coachingCategories = useMemo((): CoachingCategory[] => {
    const categories: CoachingCategory[] = [
      {
        id: 'argument',
        name: 'Argument Strength',
        icon: Target,
        description: 'Improve your reasoning and evidence',
        suggestions: mockCoachingSuggestions.filter(s => 
          ['argument_strength', 'evidence_needed', 'structure'].includes(s.type)
        ),
        priority: 'high'
      },
      {
        id: 'response',
        name: 'Response Strategy',
        icon: Shield,
        description: 'Handle opposing views effectively',
        suggestions: mockCoachingSuggestions.filter(s => 
          ['counter_argument', 'strategy'].includes(s.type)
        ),
        priority: 'high'
      },
      {
        id: 'communication',
        name: 'Communication',
        icon: MessageSquare,
        description: 'Enhance clarity and respectfulness',
        suggestions: mockCoachingSuggestions.filter(s => 
          ['respectfulness', 'clarity'].includes(s.type)
        ),
        priority: 'medium'
      }
    ];

    return categories.filter(category => category.suggestions.length > 0);
  }, []);

  // Handle suggestion application
  const handleApplySuggestion = (suggestionId: string) => {
    setAppliedSuggestions(prev => new Set(prev).add(suggestionId));
    // TODO: Integrate with message input component to apply suggestion
    console.log('Applying suggestion:', suggestionId);
  };

  // Handle suggestion refresh
  const handleRefreshSuggestions = async () => {
    setIsLoading(true);
    try {
      // TODO: Integrate with backend AI coaching service
      // await fetchCoachingSuggestions(conversationId, userId, recentMessages);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh suggestions when new messages arrive
  useEffect(() => {
    if (recentMessages.length > 0 && isVisible) {
      // Debounced refresh when new messages arrive
      const timeout = setTimeout(() => {
        handleRefreshSuggestions();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [recentMessages.length, isVisible]);

  const getPriorityColor = (priority: CoachingPriority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getPriorityIcon = (priority: CoachingPriority) => {
    switch (priority) {
      case 'high': return AlertCircle;
      case 'medium': return Lightbulb;
      case 'low': return BookOpen;
    }
  };

  if (!isVisible) {
    return null;
  }

  // Mobile responsive behavior
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn(
      "h-full flex flex-col bg-background",
      // Mobile: Full screen overlay, Desktop: Sidebar with border
      isMobile ? "fixed inset-0 z-40" : "border-l",
      className
    )}>
      {/* Mobile Backdrop */}
      {isMobile && (
        <div 
          className="absolute inset-0 bg-black/50 z-0"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar Content */}
      <div className={cn(
        "h-full flex flex-col bg-background relative z-10",
        isMobile ? "w-full max-w-sm ml-auto shadow-xl" : "w-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-sm">AI Coaching</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshSuggestions}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="p-4 border-b">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="suggestions" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Suggestions
              </TabsTrigger>
              <TabsTrigger value="progress" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Progress
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Phase-specific guidance */}
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span>{currentPhase} Phase Focus</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      {currentPhase === 'OPENING' && 'Present your strongest arguments clearly and concisely.'}
                      {currentPhase === 'DISCUSSION' && 'Engage with your opponent\'s points while building your case.'}
                      {currentPhase === 'REBUTTAL' && 'Address the strongest opposing arguments directly.'}
                      {currentPhase === 'CLOSING' && 'Summarize your key points and end with impact.'}
                      {!['OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING'].includes(currentPhase) && 'Follow the phase guidelines for best results.'}
                    </p>
                  </CardContent>
                </Card>

                {/* Enhanced Suggestion Display */}
                <SuggestionDisplay
                  suggestions={mockCoachingSuggestions}
                  onImplementSuggestion={(suggestion) => handleApplySuggestion(suggestion.id)}
                  onDismissSuggestion={(suggestionId) => {
                    // TODO: Implement dismissal logic
                    console.log('Dismissed suggestion:', suggestionId);
                  }}
                  onFeedback={(suggestionId, helpful) => {
                    console.log(`Feedback for ${suggestionId}:`, helpful ? 'helpful' : 'not helpful');
                  }}
                  currentMessage={currentMessage}
                  implementedSuggestions={appliedSuggestions}
                  dismissedSuggestions={new Set()} // TODO: Track dismissed suggestions
                  showProgress={true}
                  enableRealTimeUpdates={true}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="h-full mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Applied Suggestions Counter */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Coaching Progress</CardTitle>
                    <CardDescription className="text-xs">
                      Suggestions applied in this debate
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm">
                      <span>Applied: {appliedSuggestions.size}</span>
                      <span>Available: {mockCoachingSuggestions.length}</span>
                    </div>
                    <Progress 
                      value={(appliedSuggestions.size / Math.max(mockCoachingSuggestions.length, 1)) * 100} 
                      className="mt-2 h-2"
                    />
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recent Coaching</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        <span>Analyzing {recentMessages.length} recent messages</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}

// Individual coaching category component
interface CoachingCategoryComponentProps {
  category: CoachingCategory;
  onApplySuggestion: (suggestionId: string) => void;
  appliedSuggestions: Set<string>;
}

function CoachingCategoryComponent({ 
  category, 
  onApplySuggestion, 
  appliedSuggestions 
}: CoachingCategoryComponentProps) {
  const [isExpanded, setIsExpanded] = useState(category.priority === 'high');
  const IconComponent = category.icon;
  
  const unappliedSuggestions = category.suggestions.filter(s => !appliedSuggestions.has(s.id));
  const hasHighPriority = category.suggestions.some(s => s.priority === 'high');

  return (
    <Card className={cn(
      hasHighPriority && "ring-1 ring-red-200 bg-red-50/30"
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <IconComponent className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm">{category.name}</CardTitle>
                {unappliedSuggestions.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {unappliedSuggestions.length}
                  </Badge>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
            <CardDescription className="text-xs">
              {category.description}
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {category.suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                isApplied={appliedSuggestions.has(suggestion.id)}
                onApply={() => onApplySuggestion(suggestion.id)}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default CoachingSidebar;
