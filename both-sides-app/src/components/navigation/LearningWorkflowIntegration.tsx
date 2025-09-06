/**
 * Learning Workflow Integration
 * 
 * Task 7.5.3: Seamless workflow integration that creates contextual navigation
 * flows based on user actions and learning states.
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CheckCircle2, 
  MessageSquare, 
  BarChart3, 
  Trophy, 
  Target,
  ArrowRight,
  Clock,
  Lightbulb,
  Sparkles,
  Calendar,
  Bell,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

import { useLearningNavigation } from './LearningNavigationProvider';

interface WorkflowState {
  currentStep: string;
  completedSteps: string[];
  availableActions: WorkflowAction[];
  context: Record<string, any>;
  suggestedNext: string[];
}

interface WorkflowAction {
  id: string;
  label: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
  estimatedTime?: string;
  requirements?: string[];
}

interface ContextualPrompt {
  id: string;
  trigger: 'debate_completed' | 'reflection_started' | 'goal_achieved' | 'milestone_reached';
  title: string;
  message: string;
  actions: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'outline';
  }>;
  priority: 'high' | 'medium' | 'low';
  dismissible: boolean;
  autoShowDuration?: number; // ms to auto-show
}

export function LearningWorkflowIntegration() {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    currentDebateId, 
    activeProgress, 
    setDebateContext,
    navigateToReflection,
    navigateToProgress,
    addNotification 
  } = useLearningNavigation();

  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [contextualPrompts, setContextualPrompts] = useState<ContextualPrompt[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<ContextualPrompt | null>(null);
  const [workflowProgress, setWorkflowProgress] = useState(0);

  // Initialize workflow based on current context
  useEffect(() => {
    initializeWorkflow();
  }, [pathname, currentDebateId, activeProgress]);

  // Handle contextual prompts
  useEffect(() => {
    const prompt = contextualPrompts.find(p => p.priority === 'high');
    if (prompt && !currentPrompt) {
      setCurrentPrompt(prompt);
    }
  }, [contextualPrompts, currentPrompt]);

  const initializeWorkflow = () => {
    const workflow = detectCurrentWorkflow();
    setWorkflowState(workflow);
    
    // Generate contextual prompts based on current state
    const prompts = generateContextualPrompts();
    setContextualPrompts(prompts);
  };

  const detectCurrentWorkflow = (): WorkflowState => {
    // Determine current workflow based on path and context
    if (pathname.startsWith('/debate/') && currentDebateId) {
      return createPostDebateWorkflow();
    } else if (pathname.startsWith('/learning/reflections/')) {
      return createReflectionWorkflow();
    } else if (pathname.startsWith('/learning/progress')) {
      return createProgressReviewWorkflow();
    } else if (pathname.startsWith('/learning/goals')) {
      return createGoalPlanningWorkflow();
    } else {
      return createDefaultLearningWorkflow();
    }
  };

  const createPostDebateWorkflow = (): WorkflowState => {
    return {
      currentStep: 'debate_completed',
      completedSteps: ['debate_joined', 'debate_participated'],
      availableActions: [
        {
          id: 'start_reflection',
          label: 'Start Reflection',
          description: 'Reflect on your debate experience and insights',
          url: '/learning/reflections/create',
          icon: <MessageSquare className="h-4 w-4" />,
          priority: 'high',
          estimatedTime: '10-15 minutes'
        },
        {
          id: 'view_debate_summary',
          label: 'View Debate Summary',
          description: 'See AI analysis of the debate',
          url: '/debate/summary',
          icon: <BarChart3 className="h-4 w-4" />,
          priority: 'medium',
          estimatedTime: '5 minutes'
        },
        {
          id: 'check_progress',
          label: 'Check Progress',
          description: 'See how this debate affected your learning metrics',
          url: '/learning/progress',
          icon: <TrendingUp className="h-4 w-4" />,
          priority: 'low',
          estimatedTime: '3 minutes'
        }
      ],
      context: { debateId: currentDebateId },
      suggestedNext: ['start_reflection', 'view_debate_summary']
    };
  };

  const createReflectionWorkflow = (): WorkflowState => {
    return {
      currentStep: 'reflection_in_progress',
      completedSteps: ['debate_completed'],
      availableActions: [
        {
          id: 'continue_reflection',
          label: 'Continue Reflection',
          description: 'Complete your reflection questions',
          url: '/learning/reflections/current',
          icon: <MessageSquare className="h-4 w-4" />,
          priority: 'high'
        },
        {
          id: 'save_draft',
          label: 'Save Draft',
          description: 'Save progress and continue later',
          url: '/learning/reflections/drafts',
          icon: <BookOpen className="h-4 w-4" />,
          priority: 'medium'
        }
      ],
      context: { progress: activeProgress?.progress || 0 },
      suggestedNext: ['continue_reflection']
    };
  };

  const createProgressReviewWorkflow = (): WorkflowState => {
    return {
      currentStep: 'reviewing_progress',
      completedSteps: ['reflection_completed'],
      availableActions: [
        {
          id: 'set_new_goal',
          label: 'Set New Goal',
          description: 'Create a learning objective based on your progress',
          url: '/learning/goals/create',
          icon: <Target className="h-4 w-4" />,
          priority: 'high'
        },
        {
          id: 'view_achievements',
          label: 'View Achievements',
          description: 'See badges and milestones you\'ve earned',
          url: '/learning/achievements',
          icon: <Trophy className="h-4 w-4" />,
          priority: 'medium'
        },
        {
          id: 'find_next_debate',
          label: 'Find Next Debate',
          description: 'Join another debate to continue learning',
          url: '/debates/browse',
          icon: <ArrowRight className="h-4 w-4" />,
          priority: 'medium'
        }
      ],
      context: {},
      suggestedNext: ['set_new_goal', 'find_next_debate']
    };
  };

  const createGoalPlanningWorkflow = (): WorkflowState => {
    return {
      currentStep: 'planning_goals',
      completedSteps: ['progress_reviewed'],
      availableActions: [
        {
          id: 'create_goal',
          label: 'Create Goal',
          description: 'Set a specific learning target',
          url: '/learning/goals/create',
          icon: <Target className="h-4 w-4" />,
          priority: 'high'
        },
        {
          id: 'browse_recommendations',
          label: 'Browse Recommendations',
          description: 'See AI-suggested goals based on your profile',
          url: '/learning/goals/recommendations',
          icon: <Lightbulb className="h-4 w-4" />,
          priority: 'medium'
        }
      ],
      context: {},
      suggestedNext: ['create_goal']
    };
  };

  const createDefaultLearningWorkflow = (): WorkflowState => {
    return {
      currentStep: 'exploring',
      completedSteps: [],
      availableActions: [
        {
          id: 'start_learning',
          label: 'Start Learning Journey',
          description: 'Begin with a reflection or check your progress',
          url: '/learning/dashboard',
          icon: <Sparkles className="h-4 w-4" />,
          priority: 'high'
        }
      ],
      context: {},
      suggestedNext: ['start_learning']
    };
  };

  const generateContextualPrompts = (): ContextualPrompt[] => {
    const prompts: ContextualPrompt[] = [];

    // Post-debate prompt
    if (currentDebateId && pathname.startsWith('/debate/')) {
      prompts.push({
        id: 'post-debate',
        trigger: 'debate_completed',
        title: '🎉 Great debate!',
        message: 'Ready to reflect on your experience and insights?',
        actions: [
          {
            label: 'Start Reflection',
            action: () => navigateToReflection(currentDebateId),
            variant: 'default'
          },
          {
            label: 'Later',
            action: () => dismissPrompt('post-debate'),
            variant: 'outline'
          }
        ],
        priority: 'high',
        dismissible: true,
        autoShowDuration: 3000
      });
    }

    // Reflection progress prompt
    if (activeProgress && activeProgress.type === 'reflection' && activeProgress.progress < 100) {
      prompts.push({
        id: 'reflection-progress',
        trigger: 'reflection_started',
        title: 'Reflection in Progress',
        message: `You're ${activeProgress.progress}% complete. Continue where you left off?`,
        actions: [
          {
            label: 'Continue',
            action: () => router.push(`/learning/reflections/${activeProgress.id}`),
            variant: 'default'
          },
          {
            label: 'Save for Later',
            action: () => dismissPrompt('reflection-progress'),
            variant: 'outline'
          }
        ],
        priority: 'medium',
        dismissible: true
      });
    }

    // Goal completion prompt
    if (activeProgress && activeProgress.type === 'goal' && activeProgress.progress >= 100) {
      prompts.push({
        id: 'goal-completed',
        trigger: 'goal_achieved',
        title: '🎯 Goal Achieved!',
        message: 'Congratulations! Ready to set your next learning target?',
        actions: [
          {
            label: 'Set New Goal',
            action: () => router.push('/learning/goals/create'),
            variant: 'default'
          },
          {
            label: 'View Progress',
            action: () => navigateToProgress(),
            variant: 'outline'
          }
        ],
        priority: 'high',
        dismissible: true
      });
    }

    return prompts;
  };

  const dismissPrompt = (promptId: string) => {
    setContextualPrompts(prev => prev.filter(p => p.id !== promptId));
    setCurrentPrompt(null);
  };

  const handleWorkflowAction = (action: WorkflowAction) => {
    // Track the action
    console.log('Workflow action taken:', action.id);
    
    // Navigate to the action URL
    router.push(action.url);
    
    // Update workflow state
    setWorkflowState(prev => prev ? {
      ...prev,
      completedSteps: [...prev.completedSteps, prev.currentStep],
      currentStep: action.id
    } : null);

    // Calculate progress
    if (workflowState) {
      const totalSteps = workflowState.availableActions.length + workflowState.completedSteps.length;
      const completed = workflowState.completedSteps.length + 1;
      setWorkflowProgress((completed / totalSteps) * 100);
    }

    // Show success toast
    toast({
      title: "Action Started",
      description: `${action.label} - ${action.estimatedTime || 'Unknown duration'}`,
    });
  };

  // Auto-dismiss prompts based on user navigation
  useEffect(() => {
    if (currentPrompt && pathname !== currentPrompt.trigger) {
      const timer = setTimeout(() => {
        setCurrentPrompt(null);
      }, currentPrompt.autoShowDuration || 10000);
      
      return () => clearTimeout(timer);
    }
  }, [currentPrompt, pathname]);

  if (!workflowState) return null;

  return (
    <>
      {/* Contextual Prompt Modal */}
      {currentPrompt && (
        <Dialog open onOpenChange={() => setCurrentPrompt(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentPrompt.title}</DialogTitle>
              <DialogDescription>{currentPrompt.message}</DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-end space-x-2">
              {currentPrompt.actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'default'}
                  onClick={action.action}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Workflow Progress Indicator */}
      {workflowState.completedSteps.length > 0 && (
        <WorkflowProgressIndicator 
          workflowState={workflowState}
          progress={workflowProgress}
        />
      )}

      {/* Suggested Actions */}
      {workflowState.availableActions.length > 0 && (
        <SuggestedActionsPanel 
          actions={workflowState.availableActions}
          onActionClick={handleWorkflowAction}
        />
      )}
    </>
  );
}

interface WorkflowProgressIndicatorProps {
  workflowState: WorkflowState;
  progress: number;
}

function WorkflowProgressIndicator({ workflowState, progress }: WorkflowProgressIndicatorProps) {
  return (
    <Card className="mb-6 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
          Learning Workflow Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{workflowState.completedSteps.length} steps completed</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          {workflowState.completedSteps.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {workflowState.completedSteps.map((step) => (
                <Badge key={step} variant="secondary" className="text-xs">
                  ✓ {step.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SuggestedActionsPanelProps {
  actions: WorkflowAction[];
  onActionClick: (action: WorkflowAction) => void;
}

function SuggestedActionsPanel({ actions, onActionClick }: SuggestedActionsPanelProps) {
  const highPriorityActions = actions.filter(a => a.priority === 'high');
  const otherActions = actions.filter(a => a.priority !== 'high');

  if (actions.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Lightbulb className="h-5 w-5 mr-2" />
          Suggested Next Steps
        </CardTitle>
        <CardDescription>
          Continue your learning journey with these recommended actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* High Priority Actions */}
          {highPriorityActions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Bell className="h-4 w-4 mr-1 text-red-500" />
                Recommended
              </h4>
              <div className="space-y-2">
                {highPriorityActions.map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    onClick={() => onActionClick(action)}
                    highlighted
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Actions */}
          {otherActions.length > 0 && (
            <div>
              {highPriorityActions.length > 0 && (
                <h4 className="text-sm font-medium mb-2 mt-4">Other Options</h4>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {otherActions.map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    onClick={() => onActionClick(action)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ActionCardProps {
  action: WorkflowAction;
  onClick: () => void;
  highlighted?: boolean;
}

function ActionCard({ action, onClick, highlighted = false }: ActionCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
        highlighted 
          ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' 
          : 'border-border hover:bg-accent'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${
            highlighted ? 'bg-blue-200' : 'bg-muted'
          }`}>
            {action.icon}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm">{action.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
            {action.estimatedTime && (
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{action.estimatedTime}</span>
              </div>
            )}
          </div>
        </div>
        <ArrowRight className={`h-4 w-4 ${highlighted ? 'text-blue-600' : 'text-muted-foreground'}`} />
      </div>
    </div>
  );
}
