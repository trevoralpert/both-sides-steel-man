'use client';

/**
 * Phase 6 Task 6.3.3: Best Practices Tips Component
 * 
 * Educational coaching content and debate improvement suggestions
 */

import React, { useState, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase, DebatePosition } from '@/types/debate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  Target, 
  Shield, 
  MessageSquare, 
  Search, 
  BookOpen,
  Star,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

export interface BestPracticesTipsProps {
  currentPhase: DebatePhase;
  userPosition?: DebatePosition;
  messageCount?: number;
  recentMessageAnalysis?: {
    argumentStrength?: number;
    respectfulness?: number;
    evidenceBased?: boolean;
    suggestions?: string[];
  };
  onApplyTip?: (tipId: string) => void;
  className?: string;
}

interface PracticeTip {
  id: string;
  title: string;
  description: string;
  category: 'strategy' | 'communication' | 'evidence' | 'respect';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  phase?: DebatePhase[];
  position?: DebatePosition[];
  icon: React.ComponentType<{ className?: string }>;
  actionable?: boolean;
  examples?: string[];
}

const practiceTips: PracticeTip[] = [
  // Strategic Tips
  {
    id: 'opening-structure',
    title: 'Structure Your Opening',
    description: 'Start with a clear thesis, preview your main points, and end with a strong statement.',
    category: 'strategy',
    difficulty: 'beginner',
    phase: ['OPENING'],
    icon: Target,
    actionable: true,
    examples: [
      'I believe [position] because of three key reasons...',
      'Today I will argue that [thesis] by examining [point 1], [point 2], and [point 3]',
      'My position is clear: [statement] for the following compelling reasons...'
    ]
  },
  {
    id: 'counter-argument-prep',
    title: 'Anticipate Counter-Arguments',
    description: 'Think ahead about what your opponent might say and prepare thoughtful responses.',
    category: 'strategy',
    difficulty: 'intermediate',
    phase: ['PREPARATION', 'DISCUSSION'],
    icon: Shield,
    actionable: true,
    examples: [
      'While some might argue [counter-point], the evidence shows...',
      'I understand the concern about [issue], however...',
      'This viewpoint addresses [counter-argument] by...'
    ]
  },
  {
    id: 'evidence-integration',
    title: 'Weave in Evidence',
    description: 'Support your arguments with credible sources, statistics, and expert opinions.',
    category: 'evidence',
    difficulty: 'intermediate',
    phase: ['DISCUSSION', 'REBUTTAL'],
    icon: Search,
    actionable: true,
    examples: [
      'According to [source], the data shows...',
      'Research by [expert] demonstrates that...',
      'A recent study found that [statistic]...'
    ]
  },
  {
    id: 'respectful-disagreement',
    title: 'Disagree Respectfully',
    description: 'Challenge ideas, not people. Use respectful language even when strongly disagreeing.',
    category: 'respect',
    difficulty: 'beginner',
    phase: ['DISCUSSION', 'REBUTTAL'],
    icon: MessageSquare,
    actionable: true,
    examples: [
      'I respectfully disagree because...',
      'While I understand your point, I see it differently...',
      'That\'s an interesting perspective. I\'d like to offer another view...'
    ]
  },
  {
    id: 'active-listening',
    title: 'Listen and Acknowledge',
    description: 'Show you understand your opponent\'s points before responding with your own.',
    category: 'communication',
    difficulty: 'intermediate',
    phase: ['DISCUSSION', 'REBUTTAL'],
    icon: BookOpen,
    actionable: true,
    examples: [
      'I hear you saying [summarize their point]. My concern is...',
      'You make a valid point about [acknowledgment], and I think...',
      'I appreciate that perspective. Here\'s how I see it...'
    ]
  },
  {
    id: 'closing-summary',
    title: 'Powerful Closing',
    description: 'Summarize your strongest points and end with a memorable, compelling statement.',
    category: 'strategy',
    difficulty: 'beginner',
    phase: ['CLOSING'],
    icon: Star,
    actionable: true,
    examples: [
      'In conclusion, the evidence clearly shows [main thesis]...',
      'Today we\'ve seen three compelling reasons why [position]...',
      'The facts speak for themselves: [final argument]'
    ]
  },
  // Advanced Tips
  {
    id: 'question-technique',
    title: 'Strategic Questioning',
    description: 'Ask thoughtful questions to explore your opponent\'s reasoning and find common ground.',
    category: 'communication',
    difficulty: 'advanced',
    phase: ['DISCUSSION'],
    icon: MessageSquare,
    actionable: true,
    examples: [
      'How do you account for [contradictory evidence]?',
      'What would change your mind about this position?',
      'Can you help me understand [specific point]?'
    ]
  },
  {
    id: 'concession-strength',
    title: 'Strategic Concessions',
    description: 'Acknowledge valid points from your opponent while maintaining your core position.',
    category: 'strategy',
    difficulty: 'advanced',
    phase: ['DISCUSSION', 'REBUTTAL'],
    icon: TrendingUp,
    actionable: true,
    examples: [
      'You\'re absolutely right that [concession], but this doesn\'t change [core argument]',
      'I agree with you on [point]. Where we differ is [main disagreement]',
      'That\'s a fair point. However, the bigger picture shows...'
    ]
  }
];

// General debate tips that apply across phases
const generalTips = [
  'Stay calm and composed, even during heated exchanges',
  'Focus on the strongest version of your opponent\'s argument',
  'Use specific examples to illustrate abstract concepts',
  'Maintain eye contact (or screen presence) to show engagement',
  'Take brief pauses to think before responding',
  'Acknowledge good points made by your opponent',
  'Keep track of time and pace your arguments accordingly',
  'End each point clearly before moving to the next'
];

export function BestPracticesTips({
  currentPhase,
  userPosition,
  messageCount = 0,
  recentMessageAnalysis,
  onApplyTip,
  className
}: BestPracticesTipsProps) {
  const [activeTab, setActiveTab] = useState('phase-specific');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter tips based on current context
  const relevantTips = useMemo(() => {
    return practiceTips.filter(tip => {
      const phaseMatch = !tip.phase || tip.phase.includes(currentPhase);
      const positionMatch = !tip.position || !userPosition || tip.position.includes(userPosition);
      const categoryMatch = selectedCategory === 'all' || tip.category === selectedCategory;
      
      return phaseMatch && positionMatch && categoryMatch;
    });
  }, [currentPhase, userPosition, selectedCategory]);

  // Get contextual suggestions based on message analysis
  const contextualSuggestions = useMemo(() => {
    if (!recentMessageAnalysis) return [];
    
    const suggestions: string[] = [];
    
    if (recentMessageAnalysis.argumentStrength && recentMessageAnalysis.argumentStrength < 0.6) {
      suggestions.push('Consider strengthening your arguments with more evidence');
    }
    
    if (recentMessageAnalysis.respectfulness && recentMessageAnalysis.respectfulness < 0.8) {
      suggestions.push('Try using more respectful language when disagreeing');
    }
    
    if (!recentMessageAnalysis.evidenceBased) {
      suggestions.push('Back up your claims with credible sources and data');
    }
    
    return suggestions.concat(recentMessageAnalysis.suggestions || []);
  }, [recentMessageAnalysis]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'strategy': return Target;
      case 'communication': return MessageSquare;
      case 'evidence': return Search;
      case 'respect': return Shield;
      default: return Lightbulb;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-amber-100 text-amber-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <span>Best Practices & Tips</span>
          </CardTitle>
          <CardDescription>
            Improve your debate skills with these educational tips and strategies
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="phase-specific" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                Current Phase
              </TabsTrigger>
              <TabsTrigger value="general" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                General Tips
              </TabsTrigger>
              <TabsTrigger value="personalized" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                For You
              </TabsTrigger>
            </TabsList>

            {/* Phase-Specific Tips */}
            <TabsContent value="phase-specific" className="mt-4 space-y-4">
              {/* Category Filter */}
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">Category:</span>
                <div className="flex space-x-1">
                  {['all', 'strategy', 'communication', 'evidence', 'respect'].map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="text-xs h-7"
                    >
                      {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tips List */}
              <div className="space-y-3">
                {relevantTips.map((tip) => {
                  const IconComponent = tip.icon;
                  
                  return (
                    <Card key={tip.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <IconComponent className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-sm">{tip.title}</h4>
                                <Badge 
                                  variant="secondary" 
                                  className={cn("text-xs", getDifficultyColor(tip.difficulty))}
                                >
                                  {tip.difficulty}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {tip.description}
                              </p>
                              
                              {tip.examples && tip.examples.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Example phrases:
                                  </p>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    {tip.examples.slice(0, 2).map((example, index) => (
                                      <li key={index} className="italic">
                                        &quot;{example}&quot;
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {tip.actionable && onApplyTip && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onApplyTip(tip.id)}
                              className="text-xs ml-2 flex-shrink-0"
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {relevantTips.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No specific tips for the current phase and filters.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* General Tips */}
            <TabsContent value="general" className="mt-4">
              <div className="space-y-2">
                {generalTips.map((tip, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Personalized Suggestions */}
            <TabsContent value="personalized" className="mt-4 space-y-4">
              {contextualSuggestions.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span>Based on your recent messages:</span>
                  </div>
                  
                  {contextualSuggestions.map((suggestion, index) => (
                    <Card key={index} className="border-l-4 border-l-amber-500">
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Send a few messages to get personalized suggestions!</p>
                </div>
              )}
              
              {/* Message Count Milestone */}
              {messageCount > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Messages sent: {messageCount}</span>
                    </div>
                    {messageCount >= 5 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Great engagement! You&apos;re actively participating in the debate.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default BestPracticesTips;
