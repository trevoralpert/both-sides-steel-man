'use client';

/**
 * Phase 6 Task 6.3.3: Help Tooltips Component
 * 
 * Contextual help system for debate best practices throughout the UI
 */

import React, { useState } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase } from '@/types/debate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  Info, 
  Lightbulb, 
  MessageSquare, 
  Clock, 
  Target, 
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Users,
  ArrowRight,
  X
} from 'lucide-react';

export interface HelpTooltipProps {
  topic: string;
  currentPhase?: DebatePhase;
  variant?: 'icon' | 'button' | 'inline';
  size?: 'sm' | 'default' | 'lg';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  children?: React.ReactNode;
}

export interface HelpContent {
  id: string;
  title: string;
  description: string;
  tips?: string[];
  examples?: string[];
  relatedTopics?: string[];
  phase?: DebatePhase[];
  urgency?: 'low' | 'medium' | 'high';
  icon: React.ComponentType<{ className?: string }>;
}

// Help content database
const helpContent: Record<string, HelpContent> = {
  // Phase-specific help
  'preparation-phase': {
    id: 'preparation-phase',
    title: 'Preparation Phase',
    description: 'Use this time to research your position, prepare arguments, and get ready for the debate.',
    tips: [
      'Review the topic carefully and understand your assigned position',
      'Research credible sources and evidence to support your arguments',
      'Think about potential counter-arguments your opponent might raise',
      'Prepare your opening statement structure'
    ],
    examples: [
      'Read background materials provided for the topic',
      'Take notes on key statistics and expert opinions',
      'Practice articulating your main arguments clearly'
    ],
    icon: BookOpen,
    phase: ['PREPARATION'],
    urgency: 'medium'
  },
  
  'opening-statements': {
    id: 'opening-statements',
    title: 'Opening Statements',
    description: 'Present a clear, structured introduction to your position with your strongest arguments.',
    tips: [
      'Start with a clear thesis statement',
      'Preview your main arguments (2-3 key points)',
      'Keep within the character limit (2000 characters)',
      'End with a compelling statement'
    ],
    examples: [
      '"I firmly believe that [position] because of three compelling reasons..."',
      '"The evidence clearly supports [position] as demonstrated by..."',
      '"Today I will argue that [thesis] by examining [points]..."'
    ],
    icon: Target,
    phase: ['OPENING'],
    urgency: 'high',
    relatedTopics: ['argument-structure', 'thesis-statements']
  },
  
  'discussion-phase': {
    id: 'discussion-phase',
    title: 'Discussion Phase',
    description: 'Engage in free-form discussion while building on your arguments and responding respectfully.',
    tips: [
      'Respond to your opponent\'s points directly',
      'Support your arguments with evidence and examples',
      'Ask clarifying questions when needed',
      'Maintain a respectful tone throughout'
    ],
    examples: [
      '"That\'s an interesting point. However, the data shows..."',
      '"I understand your concern about X, but consider this evidence..."',
      '"Can you help me understand how you account for [evidence]?"'
    ],
    icon: MessageSquare,
    phase: ['DISCUSSION'],
    urgency: 'medium',
    relatedTopics: ['respectful-disagreement', 'evidence-usage']
  },
  
  'rebuttal-phase': {
    id: 'rebuttal-phase',
    title: 'Rebuttal Phase',
    description: 'Address your opponent\'s strongest arguments while reinforcing your own position.',
    tips: [
      'Focus on your opponent\'s strongest points, not weakest',
      'Provide counter-evidence or reasoning',
      'Be strategic with your limited messages (max 2)',
      'Acknowledge valid points while maintaining your position'
    ],
    examples: [
      '"While you make a valid point about X, this doesn\'t account for Y..."',
      '"The evidence you cited is interesting, but more recent studies show..."',
      '"I agree with you on [point], but the bigger picture reveals..."'
    ],
    icon: Target,
    phase: ['REBUTTAL'],
    urgency: 'high',
    relatedTopics: ['counter-arguments', 'evidence-evaluation']
  },
  
  // General debate skills
  'argument-structure': {
    id: 'argument-structure',
    title: 'Argument Structure',
    description: 'Structure your arguments logically with clear reasoning and evidence.',
    tips: [
      'Start with a clear claim or position',
      'Provide evidence to support your claim',
      'Explain how the evidence supports your position',
      'Address potential counter-arguments'
    ],
    examples: [
      'Claim → Evidence → Reasoning → Counter-argument consideration',
      '"Studies show X (evidence), which means Y (reasoning)"',
      '"Not only does Z support my position, but it also addresses the concern about..."'
    ],
    icon: Target,
    urgency: 'high'
  },
  
  'respectful-disagreement': {
    id: 'respectful-disagreement',
    title: 'Respectful Disagreement',
    description: 'Challenge ideas respectfully while maintaining a constructive discussion tone.',
    tips: [
      'Focus on ideas, not personal attacks',
      'Use respectful language even when strongly disagreeing',
      'Acknowledge good points before presenting counter-arguments',
      'Ask questions to understand rather than attack'
    ],
    examples: [
      '"I respectfully disagree because..."',
      '"That\'s a thoughtful perspective. I see it differently..."',
      '"While I understand your reasoning, I think..."'
    ],
    icon: Users,
    urgency: 'high'
  },
  
  'evidence-usage': {
    id: 'evidence-usage',
    title: 'Using Evidence Effectively',
    description: 'Support your arguments with credible sources and data.',
    tips: [
      'Use credible, recent sources',
      'Cite specific statistics and studies',
      'Explain how evidence supports your argument',
      'Quality over quantity - use your best evidence'
    ],
    examples: [
      '"According to [credible source], studies show that..."',
      '"Recent data from [organization] demonstrates..."',
      '"Research published in [journal] found that..."'
    ],
    icon: BookOpen,
    urgency: 'medium'
  },
  
  // UI help
  'message-input': {
    id: 'message-input',
    title: 'Message Input',
    description: 'Tips for composing effective debate messages.',
    tips: [
      'Check character count before sending',
      'Use preview to review your message',
      'Take time to think before responding',
      'Use formatting for clarity'
    ],
    icon: MessageSquare,
    urgency: 'low'
  },
  
  'time-management': {
    id: 'time-management',
    title: 'Time Management',
    description: 'Make the most of your debate time.',
    tips: [
      'Keep track of time remaining in each phase',
      'Don\'t rush your arguments',
      'Save time for final thoughts',
      'Use preparation phase fully'
    ],
    icon: Clock,
    urgency: 'medium'
  }
};

export function HelpTooltip({
  topic,
  currentPhase,
  variant = 'icon',
  size = 'default',
  position = 'top',
  className,
  children
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const content = helpContent[topic];
  if (!content) {
    return null; // No help content available for this topic
  }

  // Filter tips based on current phase if applicable
  const phaseTips = content.phase && currentPhase && !content.phase.includes(currentPhase) 
    ? []
    : content.tips || [];

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'h-3 w-3';
      case 'lg': return 'h-6 w-6';
      default: return 'h-4 w-4';
    }
  };

  const TriggerComponent = () => {
    const IconComponent = content.icon;
    
    switch (variant) {
      case 'button':
        return (
          <Button 
            variant="ghost" 
            size={size}
            className={cn("flex items-center space-x-1", className)}
          >
            <HelpCircle className={cn(getIconSize(), getUrgencyColor(content.urgency))} />
            <span>Help</span>
          </Button>
        );
      
      case 'inline':
        return (
          <span className={cn("inline-flex items-center space-x-1 cursor-help", className)}>
            <HelpCircle className={cn(getIconSize(), getUrgencyColor(content.urgency))} />
            {children}
          </span>
        );
      
      case 'icon':
      default:
        return (
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(
              "h-auto w-auto p-1 rounded-full hover:bg-muted/50",
              className
            )}
          >
            <HelpCircle className={cn(getIconSize(), getUrgencyColor(content.urgency))} />
          </Button>
        );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <TriggerComponent />
      </PopoverTrigger>
      
      <PopoverContent 
        side={position}
        className="w-80 p-0"
        sideOffset={5}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <content.icon className={cn("h-5 w-5", getUrgencyColor(content.urgency))} />
                <div>
                  <CardTitle className="text-base">{content.title}</CardTitle>
                  {content.urgency && (
                    <Badge 
                      variant={content.urgency === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs mt-1"
                    >
                      {content.urgency} priority
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <CardDescription className="text-sm">
              {content.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Tips Section */}
            {phaseTips.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center space-x-1">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span>Tips:</span>
                </h4>
                <ul className="space-y-1">
                  {phaseTips.map((tip, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Examples Section */}
            {content.examples && content.examples.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span>Examples:</span>
                </h4>
                <div className="space-y-1">
                  {content.examples.map((example, index) => (
                    <div key={index} className="text-sm text-muted-foreground italic bg-muted/50 p-2 rounded">
                      &quot;{example}&quot;
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Related Topics */}
            {content.relatedTopics && content.relatedTopics.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <h4 className="font-medium text-sm flex items-center space-x-1">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span>Related help:</span>
                </h4>
                <div className="flex flex-wrap gap-1">
                  {content.relatedTopics.map((relatedTopic) => (
                    <HelpTooltip
                      key={relatedTopic}
                      topic={relatedTopic}
                      currentPhase={currentPhase}
                      variant="button"
                      size="sm"
                    >
                      <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                        {helpContent[relatedTopic]?.title || relatedTopic}
                      </Badge>
                    </HelpTooltip>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Preset help tooltips for common UI elements
export const PhaseHelpTooltip = ({ phase, ...props }: { phase: DebatePhase } & Omit<HelpTooltipProps, 'topic'>) => (
  <HelpTooltip topic={`${phase.toLowerCase()}-phase`} currentPhase={phase} {...props} />
);

export const ArgumentHelpTooltip = (props: Omit<HelpTooltipProps, 'topic'>) => (
  <HelpTooltip topic="argument-structure" {...props} />
);

export const RespectHelpTooltip = (props: Omit<HelpTooltipProps, 'topic'>) => (
  <HelpTooltip topic="respectful-disagreement" {...props} />
);

export const EvidenceHelpTooltip = (props: Omit<HelpTooltipProps, 'topic'>) => (
  <HelpTooltip topic="evidence-usage" {...props} />
);

export const TimeHelpTooltip = (props: Omit<HelpTooltipProps, 'topic'>) => (
  <HelpTooltip topic="time-management" {...props} />
);

export default HelpTooltip;
