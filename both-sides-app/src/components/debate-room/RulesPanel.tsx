'use client';

/**
 * Phase 6 Task 6.3.3: Debate Rules & Guidelines Display
 * 
 * RulesPanel component for contextual rules display and educational content
 */

import React, { useState, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase, DebateRules } from '@/types/debate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Clock, 
  MessageSquare, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  Flag
} from 'lucide-react';

export interface RulesPanelProps {
  currentPhase: DebatePhase;
  timeRemaining?: number;
  totalPhaseTime?: number;
  messageCount?: number;
  userMessageCount?: number;
  hasViolations?: boolean;
  onHelpRequest?: (topic: string) => void;
  className?: string;
}

// Backend phase configurations mapped from Phase 5
const phaseRulesConfig: Record<DebatePhase, DebateRules & {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  priority: 'high' | 'medium' | 'low';
}> = {
  'PREPARATION': {
    phase: 'PREPARATION',
    description: 'Preparation Phase',
    guidelines: [
      'Review the debate topic and your assigned position',
      'Prepare your opening statement and key arguments',
      'Research supporting evidence and examples',
      'Click "Ready" when prepared to begin the debate'
    ],
    tips: [
      'Take your time to understand both sides of the topic',
      'Prepare 2-3 strong main arguments',
      'Think about potential counter-arguments',
      'Practice stating your position clearly and concisely'
    ],
    timeLimit: 5, // minutes
    messageRequirements: {
      maxLength: 0, // No user messages allowed in prep
      requiredCount: 0
    },
    color: 'blue',
    icon: BookOpen,
    priority: 'high'
  },
  'OPENING': {
    phase: 'OPENING',
    description: 'Opening Statements',
    guidelines: [
      'Present your opening statement (max 2000 characters)',
      'Clearly state your position on the topic',
      'Outline your main arguments',
      'Both participants must post before advancing'
    ],
    tips: [
      'Start with a clear thesis statement',
      'Preview your main arguments',
      'Be confident but respectful',
      'Save detailed evidence for the discussion phase'
    ],
    timeLimit: 5,
    messageRequirements: {
      minLength: 100,
      maxLength: 2000,
      requiredCount: 1
    },
    color: 'green',
    icon: Flag,
    priority: 'high'
  },
  'DISCUSSION': {
    phase: 'DISCUSSION',
    description: 'Open Discussion',
    guidelines: [
      'Engage in free-form discussion about the topic',
      'Build on your arguments with evidence and examples',
      'Respond to your opponent\'s points respectfully',
      'Ask questions to understand different perspectives'
    ],
    tips: [
      'Support your arguments with credible evidence',
      'Listen actively to your opponent\'s points',
      'Ask clarifying questions when needed',
      'Stay focused on the topic at hand'
    ],
    timeLimit: 20,
    messageRequirements: {
      maxLength: 1500
    },
    color: 'amber',
    icon: MessageSquare,
    priority: 'medium'
  },
  'REBUTTAL': {
    phase: 'REBUTTAL',
    description: 'Rebuttal Round',
    guidelines: [
      'Address your opponent\'s strongest arguments',
      'Provide counter-evidence or reasoning',
      'Strengthen your own position',
      'Each participant gets up to 2 messages'
    ],
    tips: [
      'Focus on your opponent\'s strongest points',
      'Provide specific counter-evidence',
      'Acknowledge valid points while maintaining your position',
      'Be strategic with your limited messages'
    ],
    timeLimit: 10,
    messageRequirements: {
      minLength: 50,
      maxLength: 1500,
      requiredCount: 1
    },
    color: 'orange',
    icon: Target,
    priority: 'high'
  },
  'CLOSING': {
    phase: 'CLOSING',
    description: 'Closing Statements',
    guidelines: [
      'Summarize your key arguments',
      'Highlight the strongest points from the debate',
      'Make your final case (max 1000 characters)',
      'Thank your opponent for the discussion'
    ],
    tips: [
      'Summarize your strongest arguments',
      'Avoid introducing new evidence',
      'End on a compelling note',
      'Show respect for your opponent\'s participation'
    ],
    timeLimit: 5,
    messageRequirements: {
      minLength: 50,
      maxLength: 1000,
      requiredCount: 1
    },
    color: 'purple',
    icon: CheckCircle2,
    priority: 'high'
  },
  'REFLECTION': {
    phase: 'REFLECTION',
    description: 'Reflection & Learning',
    guidelines: [
      'Reflect on the debate experience',
      'Consider what you learned',
      'Identify areas for improvement',
      'Share constructive feedback'
    ],
    tips: [
      'Think about arguments that surprised you',
      'Consider how your views may have evolved',
      'Reflect on your debate techniques',
      'Appreciate the learning opportunity'
    ],
    timeLimit: 10,
    color: 'indigo',
    icon: Lightbulb,
    priority: 'low'
  },
  'COMPLETED': {
    phase: 'COMPLETED',
    description: 'Debate Complete',
    guidelines: [
      'Debate has concluded',
      'Review the conversation transcript',
      'Access learning resources',
      'Prepare for future debates'
    ],
    tips: [
      'Reflect on what you learned',
      'Consider areas for improvement',
      'Celebrate your participation',
      'Apply insights to future discussions'
    ],
    color: 'gray',
    icon: CheckCircle2,
    priority: 'low'
  }
};

export function RulesPanel({
  currentPhase,
  timeRemaining,
  totalPhaseTime,
  messageCount = 0,
  userMessageCount = 0,
  hasViolations = false,
  onHelpRequest,
  className
}: RulesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('current');

  // Get current phase configuration
  const currentRules = phaseRulesConfig[currentPhase];
  const IconComponent = currentRules.icon;

  // Calculate progress metrics
  const timeProgress = useMemo(() => {
    if (!timeRemaining || !totalPhaseTime) return 0;
    return ((totalPhaseTime - timeRemaining) / totalPhaseTime) * 100;
  }, [timeRemaining, totalPhaseTime]);

  const messageProgress = useMemo(() => {
    const required = currentRules.messageRequirements?.requiredCount || 0;
    if (required === 0) return 100;
    return Math.min((userMessageCount / required) * 100, 100);
  }, [userMessageCount, currentRules.messageRequirements?.requiredCount]);

  // Format time remaining
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Phase Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "p-2 rounded-lg",
                currentRules.color === 'blue' && "bg-blue-100 text-blue-700",
                currentRules.color === 'green' && "bg-green-100 text-green-700",
                currentRules.color === 'amber' && "bg-amber-100 text-amber-700",
                currentRules.color === 'orange' && "bg-orange-100 text-orange-700",
                currentRules.color === 'purple' && "bg-purple-100 text-purple-700",
                currentRules.color === 'indigo' && "bg-indigo-100 text-indigo-700",
                currentRules.color === 'gray' && "bg-gray-100 text-gray-700"
              )}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{currentRules.description}</CardTitle>
                <CardDescription className="flex items-center space-x-4">
                  {timeRemaining && (
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(timeRemaining)} remaining</span>
                    </span>
                  )}
                  {currentRules.messageRequirements?.requiredCount && (
                    <span className="flex items-center space-x-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{userMessageCount}/{currentRules.messageRequirements.requiredCount} messages</span>
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            
            {hasViolations && (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
          </div>

          {/* Progress Indicators */}
          {(timeRemaining || currentRules.messageRequirements?.requiredCount) && (
            <div className="space-y-2 mt-4">
              {timeRemaining && (
                <div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Time Progress</span>
                    <span>{Math.round(timeProgress)}%</span>
                  </div>
                  <Progress value={timeProgress} className="h-2" />
                </div>
              )}
              
              {currentRules.messageRequirements?.requiredCount && (
                <div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Message Requirements</span>
                    <span>{Math.round(messageProgress)}%</span>
                  </div>
                  <Progress 
                    value={messageProgress} 
                    className={cn(
                      "h-2",
                      messageProgress >= 100 ? "bg-green-100" : "bg-amber-100"
                    )}
                  />
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Rules Content */}
      <Card>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Debate Guidelines</CardTitle>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="current" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    Current Phase
                  </TabsTrigger>
                  <TabsTrigger value="tips" className="text-xs">
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Tips
                  </TabsTrigger>
                  <TabsTrigger value="requirements" className="text-xs">
                    <Flag className="h-3 w-3 mr-1" />
                    Requirements
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="current" className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Phase Guidelines:</h4>
                    <ul className="space-y-1">
                      {currentRules.guidelines.map((guideline, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{guideline}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="tips" className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Best Practices:</h4>
                    <ul className="space-y-1">
                      {currentRules.tips.map((tip, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm">
                          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="requirements" className="mt-4 space-y-3">
                  <div className="space-y-3">
                    {currentRules.timeLimit && (
                      <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">Time Limit:</span>
                        <Badge variant="outline">{currentRules.timeLimit} minutes</Badge>
                      </div>
                    )}
                    
                    {currentRules.messageRequirements && (
                      <div className="space-y-2">
                        {currentRules.messageRequirements.minLength && (
                          <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                            <span className="text-sm font-medium">Minimum Length:</span>
                            <Badge variant="outline">{currentRules.messageRequirements.minLength} characters</Badge>
                          </div>
                        )}
                        
                        {currentRules.messageRequirements.maxLength && (
                          <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                            <span className="text-sm font-medium">Maximum Length:</span>
                            <Badge variant="outline">{currentRules.messageRequirements.maxLength} characters</Badge>
                          </div>
                        )}
                        
                        {currentRules.messageRequirements.requiredCount && (
                          <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                            <span className="text-sm font-medium">Required Messages:</span>
                            <Badge variant="outline">{currentRules.messageRequirements.requiredCount}</Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Help Actions */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Need help?</span>
                  {onHelpRequest && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onHelpRequest(currentPhase)}
                      className="text-xs"
                    >
                      <HelpCircle className="h-3 w-3 mr-1" />
                      Get Help
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}

export default RulesPanel;
