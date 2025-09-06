/**
 * Coaching & Guidance Center Component
 * 
 * Task 8.4.2: Real-time coaching message injection system, guided prompt 
 * suggestions for struggling participants, and educational moment creation
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Brain,
  Lightbulb,
  Target,
  MessageSquare,
  Send,
  Zap,
  BookOpen,
  GraduationCap,
  Users,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  HelpCircle,
  ThumbsUp,
  Eye,
  Star,
  Award,
  TrendingUp,
  Heart,
  Smile,
  MessageCircle,
  Sparkles,
  Wand2,
  Compass,
  Map,
  Flag,
  Rocket,
  Puzzle,
  Key,
  Search,
  Filter,
  Settings,
  Plus,
  Minus,
  Edit,
  Trash2,
  Copy,
  Share2,
  Download,
  Upload,
  RefreshCw,
  Play,
  Pause,
  Square,
  Volume2,
  Mic
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface SessionParticipant {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  role: 'debater_pro' | 'debater_con' | 'observer' | 'moderator';
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  learningNeeds: LearningNeed[];
  currentEngagement: {
    level: number; // 0-100
    pattern: 'rising' | 'stable' | 'declining';
    timeInCurrentLevel: number; // minutes
  };
  competencies: SkillCompetency[];
  coachingHistory: CoachingInteraction[];
}

interface LearningNeed {
  id: string;
  skill: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedActions: string[];
  lastAddressed?: Date;
  progress: number; // 0-100
}

interface SkillCompetency {
  id: string;
  name: string;
  category: 'critical_thinking' | 'communication' | 'research' | 'collaboration' | 'respectful_discourse';
  currentLevel: number; // 0-100
  targetLevel: number; // 0-100
  developmentStage: 'emerging' | 'developing' | 'proficient' | 'advanced';
  recentEvidence: string[];
  coachingOpportunities: string[];
}

interface CoachingInteraction {
  id: string;
  timestamp: Date;
  type: 'guided_prompt' | 'skill_scaffold' | 'encouragement' | 'redirection' | 'educational_moment';
  skill?: string;
  message: string;
  participantResponse?: string;
  effectiveness: 'pending' | 'helpful' | 'partially_helpful' | 'not_helpful';
  followUpNeeded: boolean;
  automated: boolean;
}

interface GuidedPrompt {
  id: string;
  name: string;
  description: string;
  category: 'engagement' | 'critical_thinking' | 'evidence' | 'respectful_discourse' | 'collaboration';
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'all';
  trigger: PromptTrigger;
  template: string;
  variations: string[];
  followUpPrompts: string[];
  adaptiveScaffolding: boolean;
  successCriteria: string[];
}

interface PromptTrigger {
  condition: 'low_engagement' | 'weak_argument' | 'missing_evidence' | 'off_topic' | 'unclear_position' | 'manual';
  threshold?: number;
  timeWindow?: number; // minutes
  contextRequired: string[];
}

interface EducationalMoment {
  id: string;
  title: string;
  description: string;
  type: 'teachable_moment' | 'skill_demonstration' | 'concept_clarification' | 'method_modeling' | 'reflection_pause';
  trigger: 'manual' | 'pattern_detected' | 'milestone_reached' | 'confusion_identified';
  targetSkills: string[];
  content: {
    explanation: string;
    examples: string[];
    practiceOpportunity?: string;
    assessmentQuestion?: string;
  };
  duration: number; // minutes
  participantGroup: 'all' | 'struggling' | 'advanced' | 'specific';
  timing: 'immediate' | 'next_phase' | 'session_end';
  materials: string[];
}

interface CoachingStrategy {
  id: string;
  name: string;
  description: string;
  targetCompetency: string;
  approach: 'scaffolding' | 'modeling' | 'guided_practice' | 'peer_learning' | 'reflection';
  steps: StrategyStep[];
  adaptations: {
    forBeginner: string[];
    forIntermediate: string[];
    forAdvanced: string[];
  };
  successIndicators: string[];
  commonChallenges: string[];
}

interface StrategyStep {
  order: number;
  instruction: string;
  duration: number; // minutes
  participantAction: string;
  teacherAction: string;
  checkPoint: string;
}

interface CoachingGuidanceCenterProps {
  sessionId: string;
  participants: SessionParticipant[];
  currentPhase: string;
  onCoachingMessage?: (participantId: string, message: string, type: string) => void;
  onEducationalMoment?: (moment: EducationalMoment) => void;
  onStrategyImplement?: (participantId: string, strategy: CoachingStrategy) => void;
}

export function CoachingGuidanceCenter({
  sessionId,
  participants = [],
  currentPhase,
  onCoachingMessage,
  onEducationalMoment,
  onStrategyImplement
}: CoachingGuidanceCenterProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [selectedParticipant, setSelectedParticipant] = useState<SessionParticipant | null>(null);
  const [activeTab, setActiveTab] = useState('coaching');
  
  // Coaching states
  const [guidedPrompts, setGuidedPrompts] = useState<GuidedPrompt[]>([]);
  const [educationalMoments, setEducationalMoments] = useState<EducationalMoment[]>([]);
  const [coachingStrategies, setCoachingStrategies] = useState<CoachingStrategy[]>([]);
  const [activeInteractions, setActiveInteractions] = useState<CoachingInteraction[]>([]);
  
  // Message composition
  const [coachingMessage, setCoachingMessage] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<GuidedPrompt | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Educational moment creation
  const [momentTitle, setMomentTitle] = useState('');
  const [momentDescription, setMomentDescription] = useState('');
  const [momentType, setMomentType] = useState<EducationalMoment['type']>('teachable_moment');
  const [momentDuration, setMomentDuration] = useState(5);
  
  // Settings
  const [autoCoachingEnabled, setAutoCoachingEnabled] = useState(true);
  const [coachingSensitivity, setCoachingSensitivity] = useState(70); // 0-100
  const [adaptiveScaffolding, setAdaptiveScaffolding] = useState(true);
  
  // Dialogs
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showMomentDialog, setShowMomentDialog] = useState(false);
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);

  useEffect(() => {
    loadGuidedPrompts();
    loadCoachingStrategies();
    loadEducationalMoments();
    
    if (autoCoachingEnabled) {
      const interval = setInterval(analyzeParticipantsForCoaching, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoCoachingEnabled]);

  const loadGuidedPrompts = () => {
    const prompts: GuidedPrompt[] = [
      {
        id: '1',
        name: 'Evidence Scaffolding',
        description: 'Help participants strengthen arguments with evidence',
        category: 'evidence',
        skillLevel: 'all',
        trigger: {
          condition: 'weak_argument',
          threshold: 50,
          contextRequired: ['argument_made', 'evidence_missing']
        },
        template: "I can see you have a strong position on this topic! What evidence or examples could you share to help others understand why you believe this? Think about research, personal experiences, or expert opinions that support your view.",
        variations: [
          "Your perspective is interesting! What sources or experiences led you to this conclusion?",
          "I'd love to hear more about what backs up your argument. What evidence comes to mind?",
          "You've made a good start - now let's strengthen it with some supporting details. What examples can you think of?"
        ],
        followUpPrompts: [
          "Great evidence! How does this specifically support your main argument?",
          "That's helpful - are there any counterarguments to this evidence you should address?",
          "Nice work citing sources! Can you explain why this source is credible?"
        ],
        adaptiveScaffolding: true,
        successCriteria: ['Evidence provided', 'Source cited', 'Relevance explained']
      },
      {
        id: '2',
        name: 'Critical Thinking Prompt',
        description: 'Encourage deeper analysis and consideration of multiple perspectives',
        category: 'critical_thinking',
        skillLevel: 'intermediate',
        trigger: {
          condition: 'unclear_position',
          timeWindow: 5,
          contextRequired: ['participation_attempted', 'position_unclear']
        },
        template: "I can tell you're thinking deeply about this issue! Let's explore different angles - what might someone who disagrees with you say? How would you respond to their concerns?",
        variations: [
          "What assumptions might you be making here? Let's examine them together.",
          "Interesting perspective! What are the strongest arguments against your position?",
          "I see you considering multiple factors - what's the most compelling reason for your stance?"
        ],
        followUpPrompts: [
          "How do these different perspectives change your original thinking?",
          "What additional information would help you feel more confident in your position?",
          "Can you find any common ground between opposing viewpoints?"
        ],
        adaptiveScaffolding: true,
        successCriteria: ['Multiple perspectives considered', 'Assumptions questioned', 'Reasoning articulated']
      },
      {
        id: '3',
        name: 'Engagement Re-activation',
        description: 'Gently encourage participation from quiet students',
        category: 'engagement',
        skillLevel: 'beginner',
        trigger: {
          condition: 'low_engagement',
          threshold: 30,
          timeWindow: 10,
          contextRequired: ['silent_period', 'others_participating']
        },
        template: "I'd love to hear your thoughts on this topic, [Name]. What stands out to you from what we've discussed so far? Even a question or initial reaction would be valuable to share.",
        variations: [
          "What's your take on what [Other Student] just said, [Name]?",
          "I notice you've been listening thoughtfully, [Name]. What questions are forming in your mind?",
          "Your perspective would really add to this discussion, [Name]. What are you thinking about right now?"
        ],
        followUpPrompts: [
          "Thank you for sharing! Can you tell us a bit more about that?",
          "That's a great observation! What makes you think that?",
          "I'm glad you brought that up - how does that relate to the main question?"
        ],
        adaptiveScaffolding: true,
        successCriteria: ['Participant responds', 'Comfort level increases', 'Follow-up engagement']
      },
      {
        id: '4',
        name: 'Respectful Discourse Redirect',
        description: 'Guide participants toward more respectful communication',
        category: 'respectful_discourse',
        skillLevel: 'all',
        trigger: {
          condition: 'off_topic',
          contextRequired: ['tension_detected', 'personal_comment']
        },
        template: "I appreciate the passion you both have for this topic! Let's refocus on the ideas rather than personal characteristics. [Name], can you reframe your point to address the argument itself?",
        variations: [
          "Great energy in this discussion! Let's channel it toward examining the evidence and reasoning.",
          "I can see this topic matters to all of you. How can we disagree respectfully while still being honest about our views?",
          "Strong feelings often mean important topics! Let's use that energy to better understand each other's reasoning."
        ],
        followUpPrompts: [
          "Much better approach! How does this perspective address the main issue?",
          "Thank you for adjusting your tone. What's the core disagreement here?",
          "I appreciate the respectful reframe. What would you say to someone who thinks differently?"
        ],
        adaptiveScaffolding: false,
        successCriteria: ['Tone improved', 'Focus on ideas', 'Respect maintained']
      },
      {
        id: '5',
        name: 'Collaboration Builder',
        description: 'Encourage collaborative exploration of ideas',
        category: 'collaboration',
        skillLevel: 'intermediate',
        trigger: {
          condition: 'manual',
          contextRequired: ['opposing_positions', 'potential_synthesis']
        },
        template: "I'm hearing some really interesting points from different perspectives. [Name] and [Name], is there any common ground in what you're both saying? Where might your ideas connect?",
        variations: [
          "What if we combined elements from both of your arguments? What would that look like?",
          "I wonder if you're both concerned about the same underlying issue, but approaching it differently?",
          "Could you help each other strengthen your positions by asking clarifying questions?"
        ],
        followUpPrompts: [
          "Excellent synthesis! How does this combined perspective address the original question?",
          "What new insights emerge when you consider both viewpoints together?",
          "How might this collaborative approach apply to other aspects of the debate?"
        ],
        adaptiveScaffolding: true,
        successCriteria: ['Common ground identified', 'Ideas synthesized', 'Collaborative tone']
      }
    ];

    setGuidedPrompts(prompts);
  };

  const loadCoachingStrategies = () => {
    const strategies: CoachingStrategy[] = [
      {
        id: '1',
        name: 'Evidence Pyramid Building',
        description: 'Scaffold evidence evaluation and integration skills',
        targetCompetency: 'research',
        approach: 'scaffolding',
        steps: [
          {
            order: 1,
            instruction: 'Identify your main claim',
            duration: 2,
            participantAction: 'State position clearly',
            teacherAction: 'Confirm clarity of position',
            checkPoint: 'Position is specific and arguable'
          },
          {
            order: 2,
            instruction: 'Find one piece of supporting evidence',
            duration: 3,
            participantAction: 'Research and identify evidence',
            teacherAction: 'Guide source evaluation',
            checkPoint: 'Evidence is relevant and credible'
          },
          {
            order: 3,
            instruction: 'Explain how evidence supports claim',
            duration: 2,
            participantAction: 'Make explicit connection',
            teacherAction: 'Ask clarifying questions',
            checkPoint: 'Connection is logical and clear'
          },
          {
            order: 4,
            instruction: 'Consider potential counterevidence',
            duration: 3,
            participantAction: 'Identify opposing evidence',
            teacherAction: 'Facilitate balanced analysis',
            checkPoint: 'Alternative perspectives acknowledged'
          }
        ],
        adaptations: {
          forBeginner: ['Provide evidence examples', 'Use simple source evaluation checklist', 'Focus on one clear connection'],
          forIntermediate: ['Encourage multiple evidence types', 'Discuss source bias', 'Practice explaining relevance'],
          forAdvanced: ['Evaluate evidence strength', 'Synthesize multiple sources', 'Address complex counterarguments']
        },
        successIndicators: ['Uses credible sources', 'Explains relevance clearly', 'Acknowledges limitations'],
        commonChallenges: ['Finding relevant sources', 'Explaining connections', 'Overcoming confirmation bias']
      },
      {
        id: '2',
        name: 'Perspective Taking Ladder',
        description: 'Develop ability to understand and articulate multiple viewpoints',
        targetCompetency: 'critical_thinking',
        approach: 'guided_practice',
        steps: [
          {
            order: 1,
            instruction: 'State your current position',
            duration: 1,
            participantAction: 'Articulate personal view',
            teacherAction: 'Record position clearly',
            checkPoint: 'Position is understood by all'
          },
          {
            order: 2,
            instruction: 'Identify someone who disagrees',
            duration: 2,
            participantAction: 'Choose opposing perspective',
            teacherAction: 'Help identify real opposition',
            checkPoint: 'Opposition is genuinely different'
          },
          {
            order: 3,
            instruction: 'Argue from their perspective',
            duration: 5,
            participantAction: 'Present opposing view fairly',
            teacherAction: 'Coach empathetic presentation',
            checkPoint: 'Opposition feels heard'
          },
          {
            order: 4,
            instruction: 'Find valid points in both positions',
            duration: 3,
            participantAction: 'Identify strengths in each',
            teacherAction: 'Guide balanced evaluation',
            checkPoint: 'Both sides have merit'
          },
          {
            order: 5,
            instruction: 'Refine your original position',
            duration: 2,
            participantAction: 'Adjust based on new understanding',
            teacherAction: 'Celebrate intellectual flexibility',
            checkPoint: 'Position shows growth'
          }
        ],
        adaptations: {
          forBeginner: ['Use familiar topics', 'Provide perspective templates', 'Focus on understanding differences'],
          forIntermediate: ['Encourage nuanced positions', 'Practice steel-manning', 'Explore underlying values'],
          forAdvanced: ['Address complex value conflicts', 'Synthesize opposing elements', 'Navigate ethical dilemmas']
        },
        successIndicators: ['Fairly represents opposition', 'Shows intellectual humility', 'Integrates new perspectives'],
        commonChallenges: ['Avoiding straw man arguments', 'Maintaining personal convictions', 'Managing cognitive dissonance']
      }
    ];

    setCoachingStrategies(strategies);
  };

  const loadEducationalMoments = () => {
    const moments: EducationalMoment[] = [
      {
        id: '1',
        title: 'Evidence vs. Opinion Recognition',
        description: 'Help students distinguish between factual evidence and personal opinions',
        type: 'concept_clarification',
        trigger: 'pattern_detected',
        targetSkills: ['critical_thinking', 'research'],
        content: {
          explanation: 'In strong debates, we need to distinguish between evidence (facts, data, expert testimony) and opinions (personal beliefs, preferences, interpretations). Both have their place, but they serve different purposes.',
          examples: [
            'Evidence: "According to NASA data, global temperatures have risen 1.1°C since 1880"',
            'Opinion: "I believe climate change is the most important issue facing humanity"',
            'Evidence: "The study included 10,000 participants over 5 years"',
            'Opinion: "This research seems convincing to me"'
          ],
          practiceOpportunity: 'Look at the last few statements made in our debate. Which were evidence and which were opinions? How can we strengthen the opinions with evidence?',
          assessmentQuestion: 'Can you give me an example of evidence that supports your position, and explain why it\'s evidence rather than opinion?'
        },
        duration: 3,
        participantGroup: 'all',
        timing: 'immediate',
        materials: ['evidence_evaluation_checklist.pdf']
      },
      {
        id: '2',
        title: 'Steel Man vs. Straw Man',
        description: 'Demonstrate the difference between fairly representing and misrepresenting opposing arguments',
        type: 'skill_demonstration',
        trigger: 'manual',
        targetSkills: ['respectful_discourse', 'critical_thinking'],
        content: {
          explanation: 'A "straw man" argument misrepresents the opponent\'s position to make it easier to attack. A "steel man" argument presents the strongest version of the opposing view. Steel manning shows intellectual honesty and leads to better discussions.',
          examples: [
            'Straw man: "My opponent just wants to waste taxpayer money on useless programs"',
            'Steel man: "My opponent believes government investment in social programs provides important safety nets for vulnerable populations"',
            'Straw man: "They want to destroy our economy with regulations"',
            'Steel man: "They believe environmental regulations are necessary to prevent long-term economic damage from climate change"'
          ],
          practiceOpportunity: 'Take the position someone just argued against you. Can you present it in its strongest form before responding to it?',
          assessmentQuestion: 'What would be a steel man version of the argument you most disagree with in this debate?'
        },
        duration: 4,
        participantGroup: 'all',
        timing: 'immediate',
        materials: ['argument_representation_guide.pdf', 'steel_man_practice_worksheet.pdf']
      }
    ];

    setEducationalMoments(moments);
  };

  const analyzeParticipantsForCoaching = () => {
    participants.forEach(participant => {
      // Check for coaching opportunities
      if (participant.currentEngagement.level < coachingSensitivity) {
        const appropriatePrompts = guidedPrompts.filter(prompt => 
          prompt.trigger.condition === 'low_engagement' &&
          (prompt.skillLevel === 'all' || prompt.skillLevel === participant.skillLevel)
        );

        if (appropriatePrompts.length > 0 && shouldSendAutomatedCoaching(participant)) {
          suggestCoachingPrompt(participant, appropriatePrompts[0]);
        }
      }

      // Check for skill development opportunities
      participant.competencies.forEach(competency => {
        if (competency.currentLevel < competency.targetLevel - 10) { // Significant gap
          const relevantStrategies = coachingStrategies.filter(strategy =>
            strategy.targetCompetency === competency.category
          );
          
          if (relevantStrategies.length > 0) {
            suggestCoachingStrategy(participant, competency, relevantStrategies[0]);
          }
        }
      });
    });
  };

  const shouldSendAutomatedCoaching = (participant: SessionParticipant): boolean => {
    const recentCoaching = participant.coachingHistory.filter(
      interaction => Date.now() - interaction.timestamp.getTime() < 10 * 60 * 1000 // Last 10 minutes
    );
    return recentCoaching.length === 0; // Don't overwhelm with coaching
  };

  const suggestCoachingPrompt = (participant: SessionParticipant, prompt: GuidedPrompt) => {
    if (!autoCoachingEnabled) return;

    addNotification({
      type: 'info',
      title: 'Coaching Opportunity',
      message: `Consider sending "${prompt.name}" to ${participant.name}`,
      read: false
    });
  };

  const suggestCoachingStrategy = (participant: SessionParticipant, competency: SkillCompetency, strategy: CoachingStrategy) => {
    addNotification({
      type: 'info',
      title: 'Strategy Suggestion',
      message: `"${strategy.name}" could help ${participant.name} develop ${competency.name}`,
      read: false
    });
  };

  const sendCoachingMessage = async (participant: SessionParticipant, prompt?: GuidedPrompt, customMessage?: string) => {
    let message = customMessage;
    
    if (prompt && !customMessage) {
      // Select appropriate variation based on participant's skill level and history
      const variations = [prompt.template, ...prompt.variations];
      const lastMessages = participant.coachingHistory.slice(-3).map(h => h.message);
      
      // Find a variation that hasn't been used recently
      message = variations.find(variation => 
        !lastMessages.some(lastMsg => lastMsg.includes(variation.substring(0, 20)))
      ) || prompt.template;
      
      // Personalize the message
      message = message.replace(/\[Name\]/g, participant.name);
    }

    if (!message) return;

    const interaction: CoachingInteraction = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: prompt?.category === 'engagement' ? 'guided_prompt' : 
            prompt?.category === 'evidence' ? 'skill_scaffold' :
            customMessage ? 'encouragement' : 'guided_prompt',
      skill: prompt?.category,
      message,
      effectiveness: 'pending',
      followUpNeeded: !!prompt?.followUpPrompts.length,
      automated: !!prompt
    };

    // Update participant coaching history
    const updatedParticipant = {
      ...participant,
      coachingHistory: [...participant.coachingHistory, interaction]
    };

    setActiveInteractions(prev => [interaction, ...prev]);
    onCoachingMessage?.(participant.id, message, interaction.type);

    addNotification({
      type: 'success',
      title: 'Coaching Message Sent',
      message: `Guidance sent to ${participant.name}`,
      read: false
    });
  };

  const createEducationalMoment = () => {
    if (!momentTitle.trim() || !momentDescription.trim()) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please provide both title and description for the educational moment.',
        read: false
      });
      return;
    }

    const moment: EducationalMoment = {
      id: Date.now().toString(),
      title: momentTitle,
      description: momentDescription,
      type: momentType,
      trigger: 'manual',
      targetSkills: ['critical_thinking'], // Could be selected from UI
      content: {
        explanation: momentDescription,
        examples: [],
        practiceOpportunity: 'Apply this concept to our current discussion.'
      },
      duration: momentDuration,
      participantGroup: 'all',
      timing: 'immediate',
      materials: []
    };

    onEducationalMoment?.(moment);
    
    // Reset form
    setMomentTitle('');
    setMomentDescription('');
    setMomentType('teachable_moment');
    setMomentDuration(5);
    setShowMomentDialog(false);

    addNotification({
      type: 'success',
      title: 'Educational Moment Created',
      message: `"${moment.title}" has been shared with participants`,
      read: false
    });
  };

  const getCompetencyColor = (level: number, target: number) => {
    const progress = (level / target) * 100;
    if (progress >= 90) return 'text-green-600';
    if (progress >= 70) return 'text-blue-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEngagementTrendIcon = (pattern: string) => {
    switch (pattern) {
      case 'rising': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <Target className="h-4 w-4 text-blue-600" />;
    }
  };

  const participantsNeedingSupport = participants.filter(p => 
    p.currentEngagement.level < 60 || 
    p.learningNeeds.some(need => need.priority === 'high' || need.priority === 'critical')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Coaching & Guidance Center
          </h3>
          <p className="text-sm text-muted-foreground">
            Real-time coaching, guided prompts, and educational moment facilitation
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status indicators */}
          <div className="flex items-center space-x-2">
            <Badge variant={autoCoachingEnabled ? "default" : "secondary"}>
              {autoCoachingEnabled ? 'Auto-coaching On' : 'Manual Only'}
            </Badge>
            <Badge variant="outline">
              {activeInteractions.length} Active Interactions
            </Badge>
            {participantsNeedingSupport.length > 0 && (
              <Badge variant="secondary">
                {participantsNeedingSupport.length} Need Support
              </Badge>
            )}
          </div>
          
          {/* Settings */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowMomentDialog(true)}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Create Moment
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Coaching Alerts */}
      {participantsNeedingSupport.length > 0 && (
        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            <strong>{participantsNeedingSupport.length} participant{participantsNeedingSupport.length !== 1 ? 's' : ''}</strong> could benefit from coaching support: {participantsNeedingSupport.map(p => p.name).join(', ')}.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="coaching">
            Individual Coaching ({participantsNeedingSupport.length})
          </TabsTrigger>
          <TabsTrigger value="prompts">
            Guided Prompts ({guidedPrompts.length})
          </TabsTrigger>
          <TabsTrigger value="moments">
            Educational Moments ({educationalMoments.length})
          </TabsTrigger>
          <TabsTrigger value="strategies">
            Coaching Strategies ({coachingStrategies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coaching" className="space-y-4">
          {/* Individual Coaching Interface */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {participants.map((participant) => (
              <Card key={participant.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback>
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{participant.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {participant.skillLevel}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {participant.role.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="flex items-center">
                        {getEngagementTrendIcon(participant.currentEngagement.pattern)}
                        <span className="ml-1 font-medium">{participant.currentEngagement.level}%</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Engagement Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Current Engagement</span>
                      <span>{participant.currentEngagement.level}%</span>
                    </div>
                    <Progress value={participant.currentEngagement.level} />
                    <div className="text-xs text-muted-foreground">
                      {participant.currentEngagement.pattern} for {participant.currentEngagement.timeInCurrentLevel}min
                    </div>
                  </div>

                  {/* Top Learning Needs */}
                  {participant.learningNeeds.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Priority Learning Needs:</div>
                      <div className="space-y-1">
                        {participant.learningNeeds.slice(0, 2).map((need) => (
                          <div key={need.id} className="flex items-center justify-between text-sm">
                            <span className="truncate">{need.skill}</span>
                            <Badge variant={
                              need.priority === 'critical' ? 'destructive' :
                              need.priority === 'high' ? 'secondary' : 'outline'
                            } className="text-xs">
                              {need.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Competency Progress */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Key Competencies:</div>
                    {participant.competencies.slice(0, 3).map((competency) => (
                      <div key={competency.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate">{competency.name}</span>
                          <span className={getCompetencyColor(competency.currentLevel, competency.targetLevel)}>
                            {competency.currentLevel}/{competency.targetLevel}
                          </span>
                        </div>
                        <Progress 
                          value={(competency.currentLevel / competency.targetLevel) * 100} 
                          className="h-1"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Recent Coaching */}
                  {participant.coachingHistory.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Recent Coaching:</div>
                      <div className="text-xs text-muted-foreground">
                        Last: {participant.coachingHistory[0].type.replace('_', ' ')} - {
                          Math.round((Date.now() - participant.coachingHistory[0].timestamp.getTime()) / 60000)
                        }min ago
                      </div>
                    </div>
                  )}

                  {/* Coaching Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedParticipant(participant);
                        setShowPromptDialog(true);
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Send Prompt
                    </Button>
                    
                    {participant.currentEngagement.level < 50 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const engagementPrompt = guidedPrompts.find(p => p.category === 'engagement');
                          if (engagementPrompt) {
                            sendCoachingMessage(participant, engagementPrompt);
                          }
                        }}
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Engage
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedParticipant(participant);
                        setShowStrategyDialog(true);
                      }}
                    >
                      <Target className="h-4 w-4 mr-1" />
                      Strategy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Custom Coaching Message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Send Custom Coaching Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Participant</label>
                  <Select 
                    value={selectedParticipant?.id || ''} 
                    onValueChange={(value) => setSelectedParticipant(participants.find(p => p.id === value) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select participant" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((participant) => (
                        <SelectItem key={participant.id} value={participant.id}>
                          {participant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Coaching Type</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="encouragement">Encouragement</SelectItem>
                      <SelectItem value="skill_scaffold">Skill Scaffolding</SelectItem>
                      <SelectItem value="guidance">General Guidance</SelectItem>
                      <SelectItem value="redirection">Gentle Redirection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Message</label>
                <Textarea
                  placeholder="Type your coaching message..."
                  value={coachingMessage}
                  onChange={(e) => setCoachingMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                onClick={() => {
                  if (selectedParticipant && coachingMessage.trim()) {
                    sendCoachingMessage(selectedParticipant, undefined, coachingMessage);
                    setCoachingMessage('');
                  }
                }}
                disabled={!selectedParticipant || !coachingMessage.trim()}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Coaching Message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          {/* Guided Prompts Library */}
          <div className="grid gap-4 md:grid-cols-2">
            {guidedPrompts.map((prompt) => (
              <Card key={prompt.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{prompt.name}</CardTitle>
                      <CardDescription>{prompt.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {prompt.category.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {prompt.skillLevel}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm bg-gray-50 p-3 rounded">
                    <div className="font-medium mb-1">Template:</div>
                    <div className="text-muted-foreground line-clamp-3">{prompt.template}</div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>{prompt.variations.length + 1} variations</span>
                    <span>{prompt.followUpPrompts.length} follow-ups</span>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPrompt(prompt);
                        setShowPromptDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedParticipant) {
                          sendCoachingMessage(selectedParticipant, prompt);
                        }
                      }}
                      disabled={!selectedParticipant}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="moments" className="space-y-4">
          {/* Educational Moments */}
          <div className="grid gap-4 md:grid-cols-2">
            {educationalMoments.map((moment) => (
              <Card key={moment.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{moment.title}</CardTitle>
                      <CardDescription>{moment.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {moment.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {moment.duration}min
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm">
                    <div className="font-medium mb-1">Skills Addressed:</div>
                    <div className="flex flex-wrap gap-1">
                      {moment.targetSkills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm bg-blue-50 p-3 rounded">
                    <div className="font-medium mb-1">Explanation:</div>
                    <div className="text-muted-foreground line-clamp-3">{moment.content.explanation}</div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span>Target: {moment.participantGroup}</span>
                    <span>{moment.content.examples.length} examples</span>
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => onEducationalMoment?.(moment)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Facilitate Moment
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          {/* Coaching Strategies */}
          <div className="space-y-4">
            {coachingStrategies.map((strategy) => (
              <Card key={strategy.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{strategy.name}</CardTitle>
                      <CardDescription>{strategy.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="capitalize">
                        {strategy.approach.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary">
                        {strategy.targetCompetency.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium mb-2">Strategy Steps ({strategy.steps.length}):</div>
                      <div className="space-y-1">
                        {strategy.steps.slice(0, 3).map((step) => (
                          <div key={step.order} className="text-sm flex items-start">
                            <span className="font-medium mr-2">{step.order}.</span>
                            <span className="text-muted-foreground">{step.instruction}</span>
                          </div>
                        ))}
                        {strategy.steps.length > 3 && (
                          <div className="text-sm text-muted-foreground">
                            +{strategy.steps.length - 3} more steps...
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium mb-2">Success Indicators:</div>
                      <div className="space-y-1">
                        {strategy.successIndicators.slice(0, 3).map((indicator, index) => (
                          <div key={index} className="text-sm flex items-start">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 mr-2 text-green-600" />
                            <span className="text-muted-foreground">{indicator}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <div className="text-sm text-muted-foreground">
                      Est. duration: {strategy.steps.reduce((total, step) => total + step.duration, 0)} minutes
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedParticipant) {
                          onStrategyImplement?.(selectedParticipant.id, strategy);
                          addNotification({
                            type: 'success',
                            title: 'Strategy Applied',
                            message: `"${strategy.name}" initiated for ${selectedParticipant.name}`,
                            read: false
                          });
                        }
                      }}
                      disabled={!selectedParticipant}
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      Apply Strategy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Coaching Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-coaching</div>
                <div className="text-sm text-muted-foreground">Automatic prompt suggestions</div>
              </div>
              <Switch
                checked={autoCoachingEnabled}
                onCheckedChange={setAutoCoachingEnabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Adaptive Scaffolding</div>
                <div className="text-sm text-muted-foreground">Adjust prompts to skill level</div>
              </div>
              <Switch
                checked={adaptiveScaffolding}
                onCheckedChange={setAdaptiveScaffolding}
              />
            </div>

            <div className="space-y-2">
              <div className="font-medium">Coaching Sensitivity</div>
              <div className="text-sm text-muted-foreground mb-2">
                Trigger threshold: {coachingSensitivity}%
              </div>
              <Slider
                value={[coachingSensitivity]}
                onValueChange={([value]) => setCoachingSensitivity(value)}
                max={100}
                min={20}
                step={10}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Educational Moment Creation Dialog */}
      <Dialog open={showMomentDialog} onOpenChange={setShowMomentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Lightbulb className="h-5 w-5 mr-2" />
              Create Educational Moment
            </DialogTitle>
            <DialogDescription>
              Create a real-time teaching opportunity for all participants
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g., Understanding Logical Fallacies"
                value={momentTitle}
                onChange={(e) => setMomentTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Teaching Content</label>
              <Textarea
                placeholder="Explain the concept or skill you want to teach..."
                value={momentDescription}
                onChange={(e) => setMomentDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Moment Type</label>
                <Select value={momentType} onValueChange={(value: any) => setMomentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teachable_moment">Teachable Moment</SelectItem>
                    <SelectItem value="skill_demonstration">Skill Demonstration</SelectItem>
                    <SelectItem value="concept_clarification">Concept Clarification</SelectItem>
                    <SelectItem value="method_modeling">Method Modeling</SelectItem>
                    <SelectItem value="reflection_pause">Reflection Pause</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMomentDuration(Math.max(1, momentDuration - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={momentDuration}
                    onChange={(e) => setMomentDuration(parseInt(e.target.value) || 1)}
                    className="text-center w-20"
                    min="1"
                    max="30"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMomentDuration(Math.min(30, momentDuration + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMomentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createEducationalMoment}>
              <Sparkles className="h-4 w-4 mr-2" />
              Create & Share Moment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
