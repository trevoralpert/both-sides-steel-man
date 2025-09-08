/**
 * Session Creation Wizard Component
 * 
 * Task 8.3.1: Step-by-step guided setup for creating debate sessions
 * with topic selection, participant selection, configuration, and validation.
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  Settings, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  Filter,
  Search,
  Star,
  Target,
  Brain,
  MessageSquare,
  FileText,
  Info,
  Lightbulb,
  Shield,
  Zap,
  Award,
  Eye,
  RefreshCw,
  Plus
} from 'lucide-react';
import { LoadingState } from '@/components/loading/LoadingState';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface SessionWizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isComplete: boolean;
}

interface DebateTopic {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  tags: string[];
  estimatedDuration: number;
  preparationMaterials?: string[];
  learningObjectives: string[];
  appropriateness: {
    minGrade: number;
    maxGrade: number;
    contentWarnings: string[];
  };
}

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  grade: string;
  classId: string;
  skillLevel: Record<string, number>;
  debateHistory: {
    totalDebates: number;
    winRate: number;
    averageScore: number;
    preferredTopics: string[];
  };
  availability: string[];
  preferences: {
    partnerPreferences: string[];
    topicInterests: string[];
    learningStyle: string;
  };
}

interface SessionConfiguration {
  format: 'oxford' | 'lincoln-douglas' | 'parliamentary' | 'fishbowl' | 'socratic';
  duration: number;
  phases: {
    preparation: number;
    opening: number;
    rebuttal: number;
    closing: number;
    reflection: number;
  };
  moderation: {
    aiCoaching: boolean;
    interventionLevel: 'minimal' | 'moderate' | 'active';
    realTimeFeedback: boolean;
    contentFiltering: boolean;
  };
  scoring: {
    enabled: boolean;
    criteria: string[];
    peerEvaluation: boolean;
    selfReflection: boolean;
  };
}

interface SessionData {
  title: string;
  description: string;
  topic: DebateTopic | null;
  participants: StudentProfile[];
  scheduledDate: Date | null;
  scheduledTime: string;
  configuration: SessionConfiguration;
  template: string | null;
  preparations: {
    materials: string[];
    instructions: string;
    notifications: boolean;
  };
}

const DEBATE_FORMATS = [
  {
    id: 'oxford',
    name: 'Oxford Style',
    description: 'Traditional formal debate with opening statements, rebuttals, and closing arguments',
    duration: 45,
    participants: { min: 6, max: 8 },
    difficulty: 'intermediate'
  },
  {
    id: 'lincoln-douglas',
    name: 'Lincoln-Douglas',
    description: 'One-on-one debate format focusing on values and philosophy',
    duration: 30,
    participants: { min: 2, max: 2 },
    difficulty: 'advanced'
  },
  {
    id: 'parliamentary',
    name: 'Parliamentary',
    description: 'Government vs Opposition style with multiple speakers',
    duration: 40,
    participants: { min: 4, max: 6 },
    difficulty: 'advanced'
  },
  {
    id: 'fishbowl',
    name: 'Fishbowl Discussion',
    description: 'Inner circle debates while outer circle observes and rotates in',
    duration: 35,
    participants: { min: 8, max: 16 },
    difficulty: 'beginner'
  },
  {
    id: 'socratic',
    name: 'Socratic Seminar',
    description: 'Question-driven discussion exploring ideas through inquiry',
    duration: 50,
    participants: { min: 6, max: 12 },
    difficulty: 'intermediate'
  }
];

const WIZARD_STEPS: SessionWizardStep[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Session title, description, and basic settings',
    icon: FileText,
    isComplete: false
  },
  {
    id: 'topic-selection',
    title: 'Topic Selection',
    description: 'Choose debate topic with difficulty and appropriateness filtering',
    icon: BookOpen,
    isComplete: false
  },
  {
    id: 'participant-selection',
    title: 'Participants',
    description: 'Select students with automatic matching suggestions',
    icon: Users,
    isComplete: false
  },
  {
    id: 'configuration',
    title: 'Configuration',
    description: 'Debate format, timing, and moderation settings',
    icon: Settings,
    isComplete: false
  },
  {
    id: 'preparation',
    title: 'Preparation',
    description: 'Materials, instructions, and notifications setup',
    icon: Lightbulb,
    isComplete: false
  },
  {
    id: 'review',
    title: 'Review & Schedule',
    description: 'Final review and session scheduling',
    icon: CheckCircle2,
    isComplete: false
  }
];

interface SessionCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  classId?: string;
  templateId?: string;
}

export function SessionCreationWizard({ 
  isOpen, 
  onClose, 
  classId,
  templateId 
}: SessionCreationWizardProps) {
  const { getToken, userId } = useAuth();
  const router = useRouter();
  const { addNotification } = useTeacherDashboard();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<DebateTopic[]>([]);
  const [availableStudents, setAvailableStudents] = useState<StudentProfile[]>([]);
  const [sessionData, setSessionData] = useState<SessionData>({
    title: '',
    description: '',
    topic: null,
    participants: [],
    scheduledDate: null,
    scheduledTime: '',
    configuration: {
      format: 'oxford',
      duration: 45,
      phases: {
        preparation: 10,
        opening: 8,
        rebuttal: 15,
        closing: 8,
        reflection: 4
      },
      moderation: {
        aiCoaching: true,
        interventionLevel: 'moderate',
        realTimeFeedback: true,
        contentFiltering: true
      },
      scoring: {
        enabled: true,
        criteria: ['argument_quality', 'evidence_use', 'presentation'],
        peerEvaluation: true,
        selfReflection: true
      }
    },
    template: templateId || null,
    preparations: {
      materials: [],
      instructions: '',
      notifications: true
    }
  });

  // Topic filtering state
  const [topicFilters, setTopicFilters] = useState({
    difficulty: '',
    category: '',
    search: '',
    grade: ''
  });

  // Participant selection state
  const [participantFilters, setParticipantFilters] = useState({
    class: classId || '',
    skillLevel: '',
    search: ''
  });
  const [suggestedPairings, setSuggestedPairings] = useState<Array<{
    students: StudentProfile[];
    score: number;
    reasoning: string;
  }>>([]);

  const [steps, setSteps] = useState<SessionWizardStep[]>(WIZARD_STEPS);

  useEffect(() => {
    if (isOpen) {
      loadWizardData();
    }
  }, [isOpen, userId]);

  const loadWizardData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      const token = await getToken({ template: 'default' });
      
      // Load topics and students in parallel
      const [topicsResponse, studentsResponse] = await Promise.all([
        fetch('/api/topics/available', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/students/teacher-students${classId ? `?classId=${classId}` : ''}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        })
      ]);

      if (topicsResponse.ok && studentsResponse.ok) {
        const topicsData = await topicsResponse.json();
        const studentsData = await studentsResponse.json();
        
        setAvailableTopics(topicsData.topics || []);
        setAvailableStudents(studentsData.students || []);
      } else {
        // Mock data for development
        setAvailableTopics(generateMockTopics());
        setAvailableStudents(generateMockStudents());
      }
    } catch (error) {
      console.error('Failed to load wizard data:', error);
      setAvailableTopics(generateMockTopics());
      setAvailableStudents(generateMockStudents());
    } finally {
      setLoading(false);
    }
  };

  const generateMockTopics = (): DebateTopic[] => [
    {
      id: '1',
      title: 'Should schools ban single-use plastics?',
      description: 'Debate the environmental and practical implications of banning single-use plastics in educational institutions.',
      difficulty: 'intermediate',
      category: 'Environment',
      tags: ['sustainability', 'policy', 'health'],
      estimatedDuration: 45,
      preparationMaterials: ['environmental_impact_study.pdf', 'plastic_alternatives_guide.pdf'],
      learningObjectives: ['Analyze environmental policies', 'Evaluate cost-benefit trade-offs', 'Present evidence-based arguments'],
      appropriateness: {
        minGrade: 6,
        maxGrade: 12,
        contentWarnings: []
      }
    },
    {
      id: '2',
      title: 'Is artificial intelligence a threat to human creativity?',
      description: 'Explore the relationship between AI advancement and human creative expression.',
      difficulty: 'advanced',
      category: 'Technology',
      tags: ['AI', 'creativity', 'future', 'ethics'],
      estimatedDuration: 50,
      preparationMaterials: ['ai_creativity_research.pdf', 'human_vs_ai_art.pdf'],
      learningObjectives: ['Understand AI capabilities', 'Analyze creative processes', 'Discuss ethical implications'],
      appropriateness: {
        minGrade: 9,
        maxGrade: 12,
        contentWarnings: []
      }
    },
    {
      id: '3',
      title: 'Should students have a say in their school curriculum?',
      description: 'Debate student autonomy and educational decision-making in schools.',
      difficulty: 'beginner',
      category: 'Education',
      tags: ['democracy', 'education', 'youth-voice'],
      estimatedDuration: 35,
      preparationMaterials: ['student_voice_research.pdf'],
      learningObjectives: ['Understand democratic participation', 'Explore educational philosophy', 'Practice civic engagement'],
      appropriateness: {
        minGrade: 6,
        maxGrade: 10,
        contentWarnings: []
      }
    }
  ];

  const generateMockStudents = (): StudentProfile[] => [
    {
      id: '1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@school.edu',
      grade: '11',
      classId: 'class1',
      skillLevel: { 'critical_thinking': 85, 'communication': 88, 'research': 92 },
      debateHistory: {
        totalDebates: 15,
        winRate: 73,
        averageScore: 86,
        preferredTopics: ['Environment', 'Technology']
      },
      availability: ['monday_pm', 'tuesday_am', 'thursday_pm'],
      preferences: {
        partnerPreferences: [],
        topicInterests: ['sustainability', 'AI', 'policy'],
        learningStyle: 'visual'
      }
    },
    {
      id: '2',
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.chen@school.edu',
      grade: '11',
      classId: 'class1',
      skillLevel: { 'critical_thinking': 78, 'communication': 82, 'research': 75 },
      debateHistory: {
        totalDebates: 12,
        winRate: 58,
        averageScore: 79,
        preferredTopics: ['Technology', 'Education']
      },
      availability: ['monday_am', 'wednesday_pm', 'friday_am'],
      preferences: {
        partnerPreferences: [],
        topicInterests: ['technology', 'education', 'ethics'],
        learningStyle: 'auditory'
      }
    },
    {
      id: '3',
      firstName: 'Emma',
      lastName: 'Davis',
      email: 'emma.davis@school.edu',
      grade: '10',
      classId: 'class1',
      skillLevel: { 'critical_thinking': 65, 'communication': 70, 'research': 68 },
      debateHistory: {
        totalDebates: 6,
        winRate: 33,
        averageScore: 68,
        preferredTopics: ['Education']
      },
      availability: ['tuesday_pm', 'thursday_am', 'friday_pm'],
      preferences: {
        partnerPreferences: [],
        topicInterests: ['education', 'democracy'],
        learningStyle: 'kinesthetic'
      }
    }
  ];

  const updateSessionData = (key: keyof SessionData, value: any) => {
    setSessionData(prev => ({ ...prev, [key]: value }));
  };

  const updateConfiguration = (key: keyof SessionConfiguration, value: any) => {
    setSessionData(prev => ({
      ...prev,
      configuration: { ...prev.configuration, [key]: value }
    }));
  };

  const validateStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Basic Info
        return !!(sessionData.title.trim() && sessionData.description.trim());
      case 1: // Topic Selection
        return !!sessionData.topic;
      case 2: // Participants
        const format = DEBATE_FORMATS.find(f => f.id === sessionData.configuration.format);
        return sessionData.participants.length >= (format?.participants.min || 2) &&
               sessionData.participants.length <= (format?.participants.max || 8);
      case 3: // Configuration
        return sessionData.configuration.duration > 0;
      case 4: // Preparation
        return true; // Optional step
      case 5: // Review
        return !!(sessionData.scheduledDate && sessionData.scheduledTime);
      default:
        return false;
    }
  };

  const updateStepCompletion = () => {
    setSteps(prev => prev.map((step, index) => ({
      ...step,
      isComplete: validateStep(index)
    })));
  };

  useEffect(() => {
    updateStepCompletion();
  }, [sessionData]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const generateMatchingSuggestions = () => {
    // Simple matching algorithm based on skill levels and topic interests
    const suggestions = [];
    const format = DEBATE_FORMATS.find(f => f.id === sessionData.configuration.format);
    const targetSize = format?.participants.min || 2;
    
    if (availableStudents.length >= targetSize && sessionData.topic) {
      // Filter students by topic interest and skill level compatibility
      const interestedStudents = availableStudents.filter(student =>
        student.preferences.topicInterests.some(interest =>
          sessionData.topic?.tags.includes(interest) || 
          sessionData.topic?.category.toLowerCase().includes(interest.toLowerCase())
        )
      );

      if (interestedStudents.length >= targetSize) {
        suggestions.push({
          students: interestedStudents.slice(0, targetSize),
          score: 95,
          reasoning: 'Students with strong topic interest and balanced skill levels'
        });
      }

      // Balanced skill pairing
      const sortedBySkill = [...availableStudents].sort((a, b) => {
        const aAvg = Object.values(a.skillLevel).reduce((sum, val) => sum + val, 0) / Object.values(a.skillLevel).length;
        const bAvg = Object.values(b.skillLevel).reduce((sum, val) => sum + val, 0) / Object.values(b.skillLevel).length;
        return Math.abs(aAvg - 75) - Math.abs(bAvg - 75); // Prefer students near average
      });

      if (sortedBySkill.length >= targetSize) {
        suggestions.push({
          students: sortedBySkill.slice(0, targetSize),
          score: 85,
          reasoning: 'Balanced skill levels for fair and challenging debate'
        });
      }
    }

    setSuggestedPairings(suggestions);
  };

  useEffect(() => {
    if (sessionData.topic && availableStudents.length > 0) {
      generateMatchingSuggestions();
    }
  }, [sessionData.topic, sessionData.configuration.format, availableStudents]);

  const handleTopicSelect = (topic: DebateTopic) => {
    updateSessionData('topic', topic);
    
    // Update configuration based on topic
    const suggestedDuration = topic.estimatedDuration;
    updateConfiguration('duration', suggestedDuration);
    
    // Clear participants when topic changes
    updateSessionData('participants', []);
  };

  const handleParticipantToggle = (student: StudentProfile) => {
    const isSelected = sessionData.participants.some(p => p.id === student.id);
    const format = DEBATE_FORMATS.find(f => f.id === sessionData.configuration.format);
    const maxParticipants = format?.participants.max || 8;

    if (isSelected) {
      updateSessionData('participants', sessionData.participants.filter(p => p.id !== student.id));
    } else if (sessionData.participants.length < maxParticipants) {
      updateSessionData('participants', [...sessionData.participants, student]);
    } else {
      addNotification({
        type: 'warning',
        title: 'Maximum Participants Reached',
        message: `This debate format supports maximum ${maxParticipants} participants.`,
        read: false
      });
    }
  };

  const handleCreateSession = async () => {
    try {
      setLoading(true);
      
      const token = await getToken({ template: 'default' });
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...sessionData,
          teacherId: userId
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        addNotification({
          type: 'success',
          title: 'Session Created Successfully',
          message: `Debate session "${sessionData.title}" has been scheduled.`,
          read: false
        });
        
        onClose();
        router.push(`/teacher/sessions/${result.sessionId}`);
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error('Session creation error:', error);
      addNotification({
        type: 'error',
        title: 'Session Creation Failed',
        message: 'Unable to create the debate session. Please try again.',
        read: false
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = availableTopics.filter(topic => {
    const matchesSearch = !topicFilters.search || 
      topic.title.toLowerCase().includes(topicFilters.search.toLowerCase()) ||
      topic.description.toLowerCase().includes(topicFilters.search.toLowerCase());
    
    const matchesDifficulty = !topicFilters.difficulty || topic.difficulty === topicFilters.difficulty;
    const matchesCategory = !topicFilters.category || topic.category === topicFilters.category;
    
    return matchesSearch && matchesDifficulty && matchesCategory;
  });

  const filteredStudents = availableStudents.filter(student => {
    const matchesSearch = !participantFilters.search ||
      student.firstName.toLowerCase().includes(participantFilters.search.toLowerCase()) ||
      student.lastName.toLowerCase().includes(participantFilters.search.toLowerCase());
    
    const matchesClass = !participantFilters.class || student.classId === participantFilters.class;
    
    return matchesSearch && matchesClass;
  });

  const currentStepData = steps[currentStep];
  const canProceed = validateStep(currentStep);
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Session Title *</Label>
              <Input
                id="title"
                value={sessionData.title}
                onChange={(e) => updateSessionData('title', e.target.value)}
                placeholder="Enter a descriptive title for your debate session"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={sessionData.description}
                onChange={(e) => updateSessionData('description', e.target.value)}
                placeholder="Provide a brief description of the session's goals and context"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="format">Debate Format</Label>
              <Select 
                value={sessionData.configuration.format} 
                onValueChange={(value) => updateConfiguration('format', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEBATE_FORMATS.map(format => (
                    <SelectItem key={format.id} value={format.id}>
                      <div>
                        <div className="font-medium">{format.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {format.participants.min}-{format.participants.max} participants • {format.duration}min • {format.difficulty}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {DEBATE_FORMATS.find(f => f.id === sessionData.configuration.format)?.description}
              </p>
            </div>
          </div>
        );

      case 1: // Topic Selection
        return (
          <div className="space-y-6">
            {/* Topic Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Search</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search topics..."
                        value={topicFilters.search}
                        onChange={(e) => setTopicFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Difficulty</Label>
                    <Select 
                      value={topicFilters.difficulty} 
                      onValueChange={(value) => setTopicFilters(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All difficulties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All difficulties</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Category</Label>
                    <Select 
                      value={topicFilters.category} 
                      onValueChange={(value) => setTopicFilters(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All categories</SelectItem>
                        <SelectItem value="Environment">Environment</SelectItem>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Ethics">Ethics</SelectItem>
                        <SelectItem value="Policy">Policy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Topics */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Available Topics ({filteredTopics.length})</h3>
              <div className="grid gap-3">
                {filteredTopics.map(topic => (
                  <Card 
                    key={topic.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      sessionData.topic?.id === topic.id ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleTopicSelect(topic)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{topic.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                          
                          <div className="flex items-center space-x-2 mt-3">
                            <Badge variant={
                              topic.difficulty === 'beginner' ? 'secondary' :
                              topic.difficulty === 'intermediate' ? 'default' : 'destructive'
                            }>
                              {topic.difficulty}
                            </Badge>
                            <Badge variant="outline">{topic.category}</Badge>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {topic.estimatedDuration}min
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Target className="h-3 w-3 mr-1" />
                              Grades {topic.appropriateness.minGrade}-{topic.appropriateness.maxGrade}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {topic.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {topic.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{topic.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {sessionData.topic?.id === topic.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary ml-3" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredTopics.length === 0 && (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Topics Found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters to see more topics.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2: // Participant Selection
        const selectedFormat = DEBATE_FORMATS.find(f => f.id === sessionData.configuration.format);
        return (
          <div className="space-y-6">
            {/* Format Requirements */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedFormat?.name}</strong> requires {selectedFormat?.participants.min}-{selectedFormat?.participants.max} participants.
                Currently selected: {sessionData.participants.length}
              </AlertDescription>
            </Alert>

            {/* Suggested Pairings */}
            {suggestedPairings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Suggested Pairings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {suggestedPairings.map((suggestion, index) => (
                      <div 
                        key={index}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => updateSessionData('participants', suggestion.students)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="default">Match Score: {suggestion.score}%</Badge>
                            <Button variant="outline" size="sm">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Use This Pairing
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{suggestion.reasoning}</p>
                        <div className="flex flex-wrap gap-2">
                          {suggestion.students.map(student => (
                            <div key={student.id} className="flex items-center space-x-2 bg-background p-2 rounded border">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={student.avatar} />
                                <AvatarFallback className="text-xs">
                                  {student.firstName[0]}{student.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{student.firstName} {student.lastName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Student Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Users className="h-4 w-4 mr-2" />
                  Select Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Participant Filters */}
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div>
                    <Label>Search Students</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name..."
                        value={participantFilters.search}
                        onChange={(e) => setParticipantFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Skill Level</Label>
                    <Select 
                      value={participantFilters.skillLevel} 
                      onValueChange={(value) => setParticipantFilters(prev => ({ ...prev, skillLevel: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All skill levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All skill levels</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Available Students */}
                <div className="space-y-2">
                  {filteredStudents.map(student => {
                    const isSelected = sessionData.participants.some(p => p.id === student.id);
                    const avgSkill = Object.values(student.skillLevel).reduce((sum, val) => sum + val, 0) / Object.values(student.skillLevel).length;
                    
                    return (
                      <div 
                        key={student.id} 
                        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                          isSelected ? 'bg-primary/5 border-primary' : ''
                        }`}
                        onClick={() => handleParticipantToggle(student)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onChange={() => {}} // Controlled by parent click
                        />
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback>
                            {student.firstName[0]}{student.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Grade {student.grade} • {student.debateHistory.totalDebates} debates • Avg Score: {Math.round(avgSkill)}%
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {student.preferences.topicInterests.slice(0, 2).map(interest => (
                              <Badge key={interest} variant="outline" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {sessionData.topic && student.preferences.topicInterests.some(interest =>
                          sessionData.topic?.tags.includes(interest) || 
                          sessionData.topic?.category.toLowerCase().includes(interest.toLowerCase())
                        ) && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <Star className="h-3 w-3 mr-1" />
                            Interested
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  
                  {filteredStudents.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Students Found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3: // Configuration
        return (
          <div className="space-y-6">
            {/* Timer Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Clock className="h-4 w-4 mr-2" />
                  Timing Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Total Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={sessionData.configuration.duration}
                      onChange={(e) => updateConfiguration('duration', parseInt(e.target.value) || 0)}
                      className="mt-1"
                      min="10"
                      max="120"
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(sessionData.configuration.phases).map(([phase, duration]) => (
                      <div key={phase}>
                        <Label>{phase.charAt(0).toUpperCase() + phase.slice(1)} (min)</Label>
                        <Input
                          type="number"
                          value={duration}
                          onChange={(e) => {
                            const newPhases = { ...sessionData.configuration.phases };
                            newPhases[phase as keyof typeof newPhases] = parseInt(e.target.value) || 0;
                            updateConfiguration('phases', newPhases);
                          }}
                          className="mt-1"
                          min="0"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Total phase time: {Object.values(sessionData.configuration.phases).reduce((sum, time) => sum + time, 0)} minutes
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Moderation Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Shield className="h-4 w-4 mr-2" />
                  Moderation & AI Coaching
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={sessionData.configuration.moderation.aiCoaching}
                      onCheckedChange={(checked) => {
                        const newModeration = { ...sessionData.configuration.moderation };
                        newModeration.aiCoaching = checked as boolean;
                        updateConfiguration('moderation', newModeration);
                      }}
                    />
                    <Label>Enable AI Coaching</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={sessionData.configuration.moderation.realTimeFeedback}
                      onCheckedChange={(checked) => {
                        const newModeration = { ...sessionData.configuration.moderation };
                        newModeration.realTimeFeedback = checked as boolean;
                        updateConfiguration('moderation', newModeration);
                      }}
                    />
                    <Label>Real-time Feedback</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={sessionData.configuration.moderation.contentFiltering}
                      onCheckedChange={(checked) => {
                        const newModeration = { ...sessionData.configuration.moderation };
                        newModeration.contentFiltering = checked as boolean;
                        updateConfiguration('moderation', newModeration);
                      }}
                    />
                    <Label>Content Filtering</Label>
                  </div>
                  
                  <div>
                    <Label>Intervention Level</Label>
                    <RadioGroup
                      value={sessionData.configuration.moderation.interventionLevel}
                      onValueChange={(value) => {
                        const newModeration = { ...sessionData.configuration.moderation };
                        newModeration.interventionLevel = value as 'minimal' | 'moderate' | 'active';
                        updateConfiguration('moderation', newModeration);
                      }}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="minimal" id="minimal" />
                        <Label htmlFor="minimal">Minimal - Only for serious issues</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="moderate" id="moderate" />
                        <Label htmlFor="moderate">Moderate - Balanced guidance</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="active" id="active" />
                        <Label htmlFor="active">Active - Frequent coaching</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scoring Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Award className="h-4 w-4 mr-2" />
                  Scoring & Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={sessionData.configuration.scoring.enabled}
                      onCheckedChange={(checked) => {
                        const newScoring = { ...sessionData.configuration.scoring };
                        newScoring.enabled = checked as boolean;
                        updateConfiguration('scoring', newScoring);
                      }}
                    />
                    <Label>Enable Scoring</Label>
                  </div>
                  
                  {sessionData.configuration.scoring.enabled && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={sessionData.configuration.scoring.peerEvaluation}
                          onCheckedChange={(checked) => {
                            const newScoring = { ...sessionData.configuration.scoring };
                            newScoring.peerEvaluation = checked as boolean;
                            updateConfiguration('scoring', newScoring);
                          }}
                        />
                        <Label>Peer Evaluation</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={sessionData.configuration.scoring.selfReflection}
                          onCheckedChange={(checked) => {
                            const newScoring = { ...sessionData.configuration.scoring };
                            newScoring.selfReflection = checked as boolean;
                            updateConfiguration('scoring', newScoring);
                          }}
                        />
                        <Label>Self-Reflection</Label>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4: // Preparation
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Pre-Session Preparation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Preparation Instructions</Label>
                    <Textarea
                      value={sessionData.preparations.instructions}
                      onChange={(e) => {
                        const newPreparations = { ...sessionData.preparations };
                        newPreparations.instructions = e.target.value;
                        updateSessionData('preparations', newPreparations);
                      }}
                      placeholder="Provide students with preparation instructions, research guidelines, or specific tasks to complete before the debate..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label>Preparation Materials</Label>
                    {sessionData.topic?.preparationMaterials && sessionData.topic.preparationMaterials.length > 0 && (
                      <div className="mt-2 mb-3">
                        <p className="text-sm text-muted-foreground mb-2">Available materials for this topic:</p>
                        <div className="flex flex-wrap gap-2">
                          {sessionData.topic.preparationMaterials.map(material => (
                            <Badge key={material} variant="outline" className="cursor-pointer">
                              <FileText className="h-3 w-3 mr-1" />
                              {material}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="mt-1">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Materials
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={sessionData.preparations.notifications}
                      onCheckedChange={(checked) => {
                        const newPreparations = { ...sessionData.preparations };
                        newPreparations.notifications = checked as boolean;
                        updateSessionData('preparations', newPreparations);
                      }}
                    />
                    <Label>Send preparation reminders to participants</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5: // Review & Schedule
        return (
          <div className="space-y-6">
            {/* Session Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Session Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Basic Information</h4>
                    <p className="text-sm text-muted-foreground">Title: {sessionData.title}</p>
                    <p className="text-sm text-muted-foreground">Format: {DEBATE_FORMATS.find(f => f.id === sessionData.configuration.format)?.name}</p>
                    <p className="text-sm text-muted-foreground">Duration: {sessionData.configuration.duration} minutes</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium">Topic</h4>
                    <p className="text-sm">{sessionData.topic?.title}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">{sessionData.topic?.difficulty}</Badge>
                      <Badge variant="outline">{sessionData.topic?.category}</Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium">Participants ({sessionData.participants.length})</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {sessionData.participants.map(participant => (
                        <div key={participant.id} className="flex items-center space-x-2 bg-muted p-2 rounded">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback className="text-xs">
                              {participant.firstName[0]}{participant.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{participant.firstName} {participant.lastName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={sessionData.scheduledDate ? sessionData.scheduledDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => updateSessionData('scheduledDate', e.target.value ? new Date(e.target.value) : null)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={sessionData.scheduledTime}
                      onChange={(e) => updateSessionData('scheduledTime', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading && !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create Debate Session</DialogTitle>
          <DialogDescription>
            Set up a new debate session with guided configuration
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState message="Loading wizard..." />
        ) : (
          <div className="flex flex-col h-[600px]">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Step {currentStep + 1} of {steps.length}: {currentStepData.title}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}% complete
                </span>
              </div>
              <Progress value={progressPercentage} />
            </div>

            {/* Step Navigation */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-2">
                {steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                        index < currentStep 
                          ? 'bg-primary text-primary-foreground' 
                          : index === currentStep 
                            ? 'bg-primary/20 border-2 border-primary text-primary' 
                            : 'bg-muted text-muted-foreground'
                      }`}
                      onClick={() => setCurrentStep(index)}
                    >
                      {index < currentStep ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div 
                        className={`w-8 h-0.5 ${
                          index < currentStep ? 'bg-primary' : 'bg-muted'
                        }`} 
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <currentStepData.icon className="h-5 w-5 mr-2" />
                  {currentStepData.title}
                </h3>
                <p className="text-muted-foreground">{currentStepData.description}</p>
              </div>
              
              {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={previousStep}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                
                {currentStep < steps.length - 1 ? (
                  <Button
                    onClick={nextStep}
                    disabled={!canProceed}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreateSession}
                    disabled={!canProceed || loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Create Session
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
