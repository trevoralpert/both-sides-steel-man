/**
 * Phase 3 Task 3.3.1: Design Onboarding Flow UI/UX  
 * Enhanced onboarding experience that makes belief mapping accessible and engaging
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Target, 
  Users, 
  BookOpen, 
  Shield, 
  Heart,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Globe,
  Zap,
  CheckCircle2,
  Info
} from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  canSkip: boolean;
  estimatedMinutes?: number;
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onStartSurvey: () => void;
  className?: string;
}

export function OnboardingFlow({ 
  onComplete, 
  onStartSurvey,
  className = '' 
}: OnboardingFlowProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Both Sides',
      description: 'Understanding the belief mapping journey',
      canSkip: false,
      content: <WelcomeStep userName={user?.firstName || 'Student'} />
    },
    {
      id: 'purpose',
      title: 'Why Map Your Beliefs?',
      description: 'The educational power of understanding perspectives',
      canSkip: false,
      estimatedMinutes: 2,
      content: <PurposeStep />
    },
    {
      id: 'how-it-works',
      title: 'How It Works',
      description: 'Your journey from survey to meaningful debates',
      canSkip: false,
      estimatedMinutes: 3,
      content: <HowItWorksStep />
    },
    {
      id: 'privacy',
      title: 'Your Privacy & Data',
      description: 'How we protect and use your information',
      canSkip: false,
      estimatedMinutes: 2,
      content: <PrivacyStep />
    },
    {
      id: 'expectations',
      title: 'What to Expect',
      description: 'Survey structure and time commitment',
      canSkip: true,
      estimatedMinutes: 1,
      content: <ExpectationsStep />
    }
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    setCompletedSteps(prev => new Set(prev.add(currentStep)));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStepData.canSkip) {
      handleNext();
    }
  };

  const handleStartSurvey = () => {
    setCompletedSteps(prev => new Set(prev.add(currentStep)));
    onStartSurvey();
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 ${className}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header with Progress */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="text-center mb-6">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Brain className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Getting Started</h1>
            </div>
            <p className="text-muted-foreground">
              Let's prepare you for an enlightening journey of self-discovery
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center mt-6 space-x-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : completedSteps.has(index)
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-gray-900">
                    {currentStepData.title}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">
                    {currentStepData.description}
                  </p>
                </div>
                {currentStepData.estimatedMinutes && (
                  <Badge variant="secondary" className="shrink-0">
                    ~{currentStepData.estimatedMinutes} min
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {currentStepData.content}
            </CardContent>

            {/* Navigation */}
            <div className="px-6 pb-6">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex gap-3">
                  {currentStepData.canSkip && (
                    <Button
                      variant="ghost"
                      onClick={handleSkip}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Skip This Step
                    </Button>
                  )}

                  {currentStep === steps.length - 1 ? (
                    <Button
                      onClick={handleStartSurvey}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center gap-2"
                    >
                      Start Survey
                      <Zap className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      className="flex items-center gap-2"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* Step Components */

function WelcomeStep({ userName }: { userName: string }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
          <Brain className="h-10 w-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Hello, {userName}! 👋
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Welcome to Both Sides, where your unique perspectives become the foundation 
          for meaningful, educational debates that help you grow as a critical thinker.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Target className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Discover Yourself</h3>
          <p className="text-sm text-gray-600 mt-1">
            Understand your own beliefs and how they shape your worldview
          </p>
        </div>

        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Connect Meaningfully</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get matched with peers for productive, respectful discussions
          </p>
        </div>

        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
            <BookOpen className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Learn & Grow</h3>
          <p className="text-sm text-gray-600 mt-1">
            Expand your thinking through exposure to different perspectives
          </p>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Did you know?</strong> Students who engage with diverse viewpoints 
          show 40% better critical thinking skills and increased empathy for others.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function PurposeStep() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Globe className="h-16 w-16 mx-auto text-indigo-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Why Understanding Beliefs Matters
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          In our polarized world, the ability to understand and respectfully engage 
          with different viewpoints is a crucial life skill.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            For You Personally
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Gain clarity about your own values and why you hold them
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Develop confidence in expressing your viewpoints respectfully
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Learn to question assumptions and think more critically
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Build empathy by understanding different life experiences
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            For Society
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Bridge divides through respectful, informed dialogue
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Contribute to a more understanding and collaborative community
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Make more informed decisions as a citizen and leader
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Help create spaces where diverse voices are heard and valued
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          The Science Behind It
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          Research in psychology and education shows that students who engage with 
          ideologically diverse peers demonstrate improved analytical thinking, 
          better problem-solving skills, and increased tolerance for ambiguity—all 
          crucial skills for success in college, career, and civic life.
        </p>
      </div>
    </div>
  );
}

function HowItWorksStep() {
  const steps = [
    {
      number: 1,
      title: "Share Your Perspectives",
      description: "Complete a thoughtful survey about your beliefs and values",
      time: "~15 minutes",
      icon: Brain,
      color: "blue"
    },
    {
      number: 2,
      title: "AI Maps Your Profile",
      description: "Our system creates a nuanced understanding of your worldview",
      time: "Instant",
      icon: Zap,
      color: "purple"
    },
    {
      number: 3,
      title: "Get Matched",
      description: "Find debate partners who will challenge you constructively",
      time: "Automatic",
      icon: Users,
      color: "green"
    },
    {
      number: 4,
      title: "Engage & Learn",
      description: "Participate in guided discussions that expand your thinking",
      time: "Ongoing",
      icon: BookOpen,
      color: "orange"
    }
  ];

  const colorClasses = {
    blue: "from-blue-100 to-blue-200 text-blue-600",
    purple: "from-purple-100 to-purple-200 text-purple-600", 
    green: "from-green-100 to-green-200 text-green-600",
    orange: "from-orange-100 to-orange-200 text-orange-600"
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Your Journey in Four Steps
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          From understanding yourself to engaging with others—here's how Both Sides 
          creates meaningful learning experiences.
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colorClasses[step.color as keyof typeof colorClasses]} flex items-center justify-center shrink-0`}>
              <step.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {step.time}
                </Badge>
              </div>
              <p className="text-gray-600">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="absolute left-6 mt-12 w-0.5 h-6 bg-gray-200" />
            )}
          </div>
        ))}
      </div>

      <Alert className="border-indigo-200 bg-indigo-50">
        <Info className="h-4 w-4 text-indigo-600" />
        <AlertDescription className="text-indigo-800">
          <strong>Quality over Quantity:</strong> We focus on creating a few 
          high-quality matches rather than many superficial ones. This ensures 
          your debates are both challenging and rewarding.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function PrivacyStep() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Shield className="h-16 w-16 mx-auto text-green-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Your Privacy Is Our Priority
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          We take the protection of your personal beliefs and data seriously. 
          Here's exactly how we keep your information safe.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            What We Protect
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Your survey responses are encrypted and anonymized
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Individual beliefs are never shared without consent
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Debate partners only see relevant compatibility info
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              You can delete your data at any time
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            How We Use Data
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Match you with compatible debate partners
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Suggest relevant topics and resources
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Improve our matching algorithms (anonymized)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Generate class-level insights for educators
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Rights & Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">View Your Data</h4>
            <p className="text-sm text-gray-600">
              See exactly what information we have about you at any time
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Control Sharing</h4>
            <p className="text-sm text-gray-600">
              Choose what aspects of your profile are used for matching
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Delete Everything</h4>
            <p className="text-sm text-gray-600">
              Remove all your data from our systems with one click
            </p>
          </div>
        </div>
      </div>

      <Alert className="border-green-200 bg-green-50">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>FERPA Compliant:</strong> Both Sides meets all educational privacy 
          standards and is approved for classroom use by educational institutions.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function ExpectationsStep() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8 text-orange-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          What to Expect from the Survey
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          The survey is designed to be thoughtful and engaging. Here's what 
          you'll encounter and how to make the most of it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Survey Structure</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">Economic Views</span>
              <Badge variant="secondary">~3 min</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Social Values</span>
              <Badge variant="secondary">~3 min</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium">Government Role</span>
              <Badge variant="secondary">~3 min</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium">Global Issues</span>
              <Badge variant="secondary">~3 min</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium">Personal Reflection</span>
              <Badge variant="secondary">~3 min</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Helpful Tips</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>
                <strong>Be honest:</strong> There are no "right" answers—authenticity 
                leads to better matches
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>
                <strong>Take your time:</strong> Some questions are complex—it's okay 
                to think them through
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>
                <strong>Use "unsure":</strong> If you're genuinely conflicted, that's 
                valuable information too
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>
                <strong>Save & resume:</strong> You can pause anytime and return 
                later if needed
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Question Types You'll See</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Agreement Scales</h4>
            <p className="text-sm text-gray-600 mb-2">
              Rate how much you agree or disagree with statements
            </p>
            <div className="text-xs text-gray-500">
              Example: "Government should regulate big tech companies"
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Multiple Choice</h4>
            <p className="text-sm text-gray-600 mb-2">
              Choose the option that best represents your view
            </p>
            <div className="text-xs text-gray-500">
              Example: "What's the ideal role of government?"
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Priority Rankings</h4>
            <p className="text-sm text-gray-600 mb-2">
              Rank different values or policies by importance
            </p>
            <div className="text-xs text-gray-500">
              Example: Rank these social priorities 1-4
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Open Reflection</h4>
            <p className="text-sm text-gray-600 mb-2">
              Share your thoughts in your own words (optional)
            </p>
            <div className="text-xs text-gray-500">
              Example: "Describe a complex issue you find challenging"
            </div>
          </div>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Remember:</strong> This survey isn't about political parties or labels. 
          It's about understanding the deeper values and reasoning patterns that guide 
          your thinking on complex issues.
        </AlertDescription>
      </Alert>
    </div>
  );
}
