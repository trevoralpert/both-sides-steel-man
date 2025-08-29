'use client';

/**
 * Phase 6 Task 6.4.2: Real-time Suggestion Display
 * 
 * Enhanced suggestion display with real-time updates, prioritization, 
 * visual feedback, and progress tracking
 */

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CoachingSuggestion, CoachingPriority } from './CoachingSidebar';
import { SuggestionCard } from './SuggestionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  Target,
  History,
  Filter,
  SortAsc,
  Eye,
  EyeOff,
  Zap,
  Timer,
  BarChart3
} from 'lucide-react';

export interface SuggestionDisplayProps {
  suggestions: CoachingSuggestion[];
  onImplementSuggestion: (suggestion: CoachingSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onFeedback?: (suggestionId: string, helpful: boolean) => void;
  currentMessage?: string;
  implementedSuggestions?: Set<string>;
  dismissedSuggestions?: Set<string>;
  showProgress?: boolean;
  enableRealTimeUpdates?: boolean;
  className?: string;
}

// Enhanced suggestion with scoring and metadata
export interface EnhancedSuggestion extends CoachingSuggestion {
  relevanceScore: number; // 0-1, how relevant to current message
  urgencyScore: number; // 0-1, how urgent the suggestion is
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  estimatedImpact: 'low' | 'medium' | 'high';
  isRealTime?: boolean; // Generated from current typing
  lastUpdated: Date;
  viewCount: number;
  implementationRate: number; // 0-1, how often this type is implemented
}

// Suggestion history entry
export interface SuggestionHistoryEntry {
  suggestion: EnhancedSuggestion;
  action: 'viewed' | 'implemented' | 'dismissed' | 'feedback';
  timestamp: Date;
  context: {
    messageLength: number;
    phase: string;
    sessionTime: number;
  };
}

export function SuggestionDisplay({
  suggestions,
  onImplementSuggestion,
  onDismissSuggestion,
  onFeedback,
  currentMessage = '',
  implementedSuggestions = new Set(),
  dismissedSuggestions = new Set(),
  showProgress = true,
  enableRealTimeUpdates = true,
  className
}: SuggestionDisplayProps) {
  const [activeView, setActiveView] = useState<'live' | 'history' | 'analytics'>('live');
  const [sortBy, setSortBy] = useState<'relevance' | 'priority' | 'recency'>('relevance');
  const [filterBy, setFilterBy] = useState<'all' | CoachingPriority>('all');
  const [showDismissed, setShowDismissed] = useState(false);
  const [suggestionHistory, setSuggestionHistory] = useState<SuggestionHistoryEntry[]>([]);

  // Enhanced suggestions with scoring
  const enhancedSuggestions = useMemo((): EnhancedSuggestion[] => {
    return suggestions.map(suggestion => {
      const enhanced: EnhancedSuggestion = {
        ...suggestion,
        relevanceScore: calculateRelevanceScore(suggestion, currentMessage),
        urgencyScore: calculateUrgencyScore(suggestion),
        implementationDifficulty: getImplementationDifficulty(suggestion.type),
        estimatedImpact: getEstimatedImpact(suggestion.type, suggestion.priority),
        isRealTime: suggestion.timestamp.getTime() > Date.now() - 5000, // Last 5 seconds
        lastUpdated: suggestion.timestamp,
        viewCount: 0, // Would be tracked from analytics
        implementationRate: getImplementationRate(suggestion.type)
      };
      return enhanced;
    });
  }, [suggestions, currentMessage]);

  // Filtered and sorted suggestions
  const filteredSuggestions = useMemo(() => {
    let filtered = enhancedSuggestions.filter(suggestion => {
      // Filter by dismissed status
      if (!showDismissed && dismissedSuggestions.has(suggestion.id)) return false;
      
      // Filter by priority
      if (filterBy !== 'all' && suggestion.priority !== filterBy) return false;
      
      return true;
    });

    // Sort suggestions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'recency':
          return b.timestamp.getTime() - a.timestamp.getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [enhancedSuggestions, showDismissed, dismissedSuggestions, filterBy, sortBy]);

  // Real-time suggestions (based on current typing)
  const realTimeSuggestions = useMemo(() => {
    return filteredSuggestions.filter(s => s.isRealTime);
  }, [filteredSuggestions]);

  // Progress metrics
  const progressMetrics = useMemo(() => {
    const total = suggestions.length;
    const implemented = suggestions.filter(s => implementedSuggestions.has(s.id)).length;
    const dismissed = suggestions.filter(s => dismissedSuggestions.has(s.id)).length;
    const pending = total - implemented - dismissed;

    return {
      total,
      implemented,
      dismissed,
      pending,
      implementationRate: total > 0 ? (implemented / total) * 100 : 0,
      dismissalRate: total > 0 ? (dismissed / total) * 100 : 0
    };
  }, [suggestions, implementedSuggestions, dismissedSuggestions]);

  // Handle suggestion implementation with tracking
  const handleImplementSuggestion = useCallback((suggestion: CoachingSuggestion) => {
    onImplementSuggestion(suggestion);
    
    // Track in history
    const historyEntry: SuggestionHistoryEntry = {
      suggestion: enhancedSuggestions.find(s => s.id === suggestion.id)!,
      action: 'implemented',
      timestamp: new Date(),
      context: {
        messageLength: currentMessage.length,
        phase: 'current', // Would get from props
        sessionTime: Date.now() // Would calculate session duration
      }
    };
    setSuggestionHistory(prev => [historyEntry, ...prev]);
  }, [onImplementSuggestion, enhancedSuggestions, currentMessage]);

  // Handle suggestion dismissal with tracking
  const handleDismissSuggestion = useCallback((suggestionId: string) => {
    onDismissSuggestion(suggestionId);
    
    // Track in history
    const suggestion = enhancedSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      const historyEntry: SuggestionHistoryEntry = {
        suggestion,
        action: 'dismissed',
        timestamp: new Date(),
        context: {
          messageLength: currentMessage.length,
          phase: 'current',
          sessionTime: Date.now()
        }
      };
      setSuggestionHistory(prev => [historyEntry, ...prev]);
    }
  }, [onDismissSuggestion, enhancedSuggestions, currentMessage]);

  // Handle feedback with tracking
  const handleFeedback = useCallback((suggestionId: string, helpful: boolean) => {
    onFeedback?.(suggestionId, helpful);
    
    // Track in history
    const suggestion = enhancedSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      const historyEntry: SuggestionHistoryEntry = {
        suggestion,
        action: 'feedback',
        timestamp: new Date(),
        context: {
          messageLength: currentMessage.length,
          phase: 'current',
          sessionTime: Date.now()
        }
      };
      setSuggestionHistory(prev => [historyEntry, ...prev]);
    }
  }, [onFeedback, enhancedSuggestions, currentMessage]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with metrics and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="font-semibold">AI Suggestions</h3>
          {enableRealTimeUpdates && realTimeSuggestions.length > 0 && (
            <Badge variant="outline" className="animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              {realTimeSuggestions.length} Live
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Sort controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy(sortBy === 'relevance' ? 'priority' : 
                                   sortBy === 'priority' ? 'recency' : 'relevance')}
            className="h-8 px-2"
          >
            <SortAsc className="h-3 w-3 mr-1" />
            <span className="text-xs capitalize">{sortBy}</span>
          </Button>
          
          {/* Filter controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterBy(filterBy === 'all' ? 'high' :
                                     filterBy === 'high' ? 'medium' :
                                     filterBy === 'medium' ? 'low' : 'all')}
            className="h-8 px-2"
          >
            <Filter className="h-3 w-3 mr-1" />
            <span className="text-xs capitalize">{filterBy}</span>
          </Button>
        </div>
      </div>

      {/* Progress overview */}
      {showProgress && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Implementation Progress</span>
                <span>{progressMetrics.implemented}/{progressMetrics.total}</span>
              </div>
              
              <Progress 
                value={progressMetrics.implementationRate} 
                className="h-2"
              />
              
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>{progressMetrics.implemented} Applied</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-amber-500" />
                  <span>{progressMetrics.pending} Pending</span>
                </div>
                <div className="flex items-center space-x-1">
                  <EyeOff className="h-3 w-3 text-gray-500" />
                  <span>{progressMetrics.dismissed} Dismissed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Live ({filteredSuggestions.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <History className="h-3 w-3 mr-1" />
            History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">
            <BarChart3 className="h-3 w-3 mr-1" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Live suggestions */}
        <TabsContent value="live" className="space-y-3">
          {/* Real-time suggestions priority section */}
          {enableRealTimeUpdates && realTimeSuggestions.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span>Real-time Suggestions</span>
                  <Badge variant="outline" className="text-xs">
                    Based on current typing
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {realTimeSuggestions.map((suggestion) => (
                      <SuggestionCard
                        key={`realtime-${suggestion.id}`}
                        suggestion={suggestion}
                        isApplied={implementedSuggestions.has(suggestion.id)}
                        onApply={() => handleImplementSuggestion(suggestion)}
                        onFeedback={handleFeedback}
                        compact={true}
                        className="border-amber-200"
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* All suggestions */}
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {filteredSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="relative">
                  {/* Relevance indicator */}
                  <div className="absolute -left-2 top-1 bottom-1 w-1 rounded-full bg-gradient-to-b from-green-500 via-amber-500 to-red-500 opacity-60">
                    <div 
                      className="w-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ height: `${suggestion.relevanceScore * 100}%` }}
                    />
                  </div>
                  
                  <SuggestionCard
                    suggestion={suggestion}
                    isApplied={implementedSuggestions.has(suggestion.id)}
                    onApply={() => handleImplementSuggestion(suggestion)}
                    onFeedback={handleFeedback}
                    className={cn(
                      "ml-2",
                      suggestion.isRealTime && "ring-1 ring-amber-300",
                      dismissedSuggestions.has(suggestion.id) && "opacity-60"
                    )}
                  />
                  
                  {/* Enhanced metadata */}
                  <div className="ml-2 mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(suggestion.relevanceScore * 100)}% relevant
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.estimatedImpact} impact
                    </Badge>
                    {suggestion.isRealTime && (
                      <Badge className="text-xs bg-amber-100 text-amber-800">
                        <Timer className="h-2 w-2 mr-1" />
                        Live
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredSuggestions.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      No suggestions match your current filters
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history">
          <SuggestionHistoryView history={suggestionHistory} />
        </TabsContent>

        {/* Analytics tab */}
        <TabsContent value="analytics">
          <SuggestionAnalyticsView 
            suggestions={enhancedSuggestions}
            metrics={progressMetrics}
            history={suggestionHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions for scoring and classification
function calculateRelevanceScore(suggestion: CoachingSuggestion, currentMessage: string): number {
  // Simple relevance scoring based on message content and suggestion type
  let score = 0.5; // Base score
  
  if (!currentMessage) return score;
  
  const messageLength = currentMessage.length;
  const hasQuestions = currentMessage.includes('?');
  const hasNegativeWords = /wrong|bad|stupid|dumb/i.test(currentMessage);
  const hasEvidence = /study|research|data|according|shows/i.test(currentMessage);
  
  switch (suggestion.type) {
    case 'respectfulness':
      if (hasNegativeWords) score += 0.4;
      break;
    case 'evidence_needed':
      if (messageLength > 100 && !hasEvidence) score += 0.3;
      break;
    case 'structure':
      if (messageLength > 200) score += 0.2;
      break;
    case 'clarity':
      if (messageLength > 300) score += 0.25;
      break;
    case 'argument_strength':
      if (messageLength > 50) score += 0.2;
      break;
  }
  
  return Math.min(1, score);
}

function calculateUrgencyScore(suggestion: CoachingSuggestion): number {
  const priorityScores = { high: 0.9, medium: 0.6, low: 0.3 };
  return priorityScores[suggestion.priority];
}

function getImplementationDifficulty(type: string): 'easy' | 'medium' | 'hard' {
  const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
    'respectfulness': 'easy',
    'structure': 'medium',
    'evidence_needed': 'hard',
    'argument_strength': 'medium',
    'counter_argument': 'hard',
    'clarity': 'medium',
    'strategy': 'hard'
  };
  return difficultyMap[type] || 'medium';
}

function getEstimatedImpact(type: string, priority: CoachingPriority): 'low' | 'medium' | 'high' {
  if (priority === 'high') return 'high';
  if (priority === 'low') return 'low';
  
  const impactMap: Record<string, 'low' | 'medium' | 'high'> = {
    'argument_strength': 'high',
    'evidence_needed': 'high',
    'respectfulness': 'medium',
    'structure': 'medium',
    'clarity': 'medium',
    'counter_argument': 'high',
    'strategy': 'medium'
  };
  return impactMap[type] || 'medium';
}

function getImplementationRate(type: string): number {
  // Mock implementation rates - would come from analytics
  const rates: Record<string, number> = {
    'respectfulness': 0.8,
    'structure': 0.4,
    'evidence_needed': 0.3,
    'argument_strength': 0.6,
    'counter_argument': 0.5,
    'clarity': 0.7,
    'strategy': 0.2
  };
  return rates[type] || 0.5;
}

// History view component
function SuggestionHistoryView({ history }: { history: SuggestionHistoryEntry[] }) {
  return (
    <ScrollArea className="h-96">
      <div className="space-y-3">
        {history.map((entry, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{entry.suggestion.suggestion}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge 
                    variant={entry.action === 'implemented' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {entry.action}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {history.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                No suggestion history yet
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}

// Analytics view component
function SuggestionAnalyticsView({ 
  suggestions, 
  metrics, 
  history 
}: { 
  suggestions: EnhancedSuggestion[];
  metrics: any;
  history: SuggestionHistoryEntry[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Implementation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(metrics.implementationRate)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.implemented} of {metrics.total} suggestions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Relevance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((suggestions.reduce((acc, s) => acc + s.relevanceScore, 0) / suggestions.length) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {suggestions.length} suggestions
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Suggestion Types Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {['respectfulness', 'structure', 'evidence_needed', 'argument_strength'].map(type => {
              const typesuggestions = suggestions.filter(s => s.type === type);
              const rate = typesuggestions.length > 0 ? 
                typesuggestions.reduce((acc, s) => acc + s.implementationRate, 0) / typesuggestions.length : 0;
              
              return (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-xs capitalize">{type.replace('_', ' ')}</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={rate * 100} className="w-16 h-2" />
                    <span className="text-xs w-8">{Math.round(rate * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SuggestionDisplay;
