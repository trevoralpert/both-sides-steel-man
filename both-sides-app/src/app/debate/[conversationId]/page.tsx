'use client';

/**
 * Phase 6 Task 6.1.1: Debate Room Page
 * 
 * Next.js page component for debate rooms with parameter handling
 * This implements the routing structure from the roadmap
 */

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { DebateRoomLayout } from '@/components/debate-room';
import { RouteGuard, useDebateUrlState, DebateBreadcrumb } from '@/components/navigation';
import { deepLinking } from '@/lib/utils/deepLinking';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

interface DebateRoomPageProps {
  params: { conversationId: string };
}

function DebateRoomPageContent({ params }: DebateRoomPageProps) {
  const { conversationId } = params;
  const searchParams = useSearchParams();
  const { user, isLoaded } = useAuth();
  
  const matchId = searchParams.get('matchId') || 'demo-match';
  
  // URL state management for debate room
  const {
    phase: urlPhase,
    tab,
    messageId,
    setPhase,
    setTab,
    navigateToMessage,
    getShareableLink
  } = useDebateUrlState(conversationId);
  
  // Handle deep link effects
  React.useEffect(() => {
    const currentUrl = window.location.href;
    const parsedLink = deepLinking.parseDeepLink(currentUrl);
    
    if (parsedLink.isValid && parsedLink.config) {
      deepLinking.handleDeepLinkEffects(parsedLink.config, {
        onPhaseChange: (phase) => console.log('Navigate to phase:', phase),
        onMessageScroll: (messageId) => console.log('Scroll to message:', messageId),
        onTabChange: (tab) => console.log('Switch to tab:', tab),
        onTextHighlight: (text) => console.log('Highlight text:', text)
      });
    }
  }, []);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading debate room...</p>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>Please sign in to access the debate room.</p>
            <div className="flex space-x-2">
              <Button asChild size="sm">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button variant="outline" asChild size="sm">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Home
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Parameter validation
  if (!conversationId || conversationId.length < 3) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>Invalid conversation ID provided.</p>
            <Button variant="outline" asChild size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Mock participants for development with demo typing behavior
  const [opponentTyping, setOpponentTyping] = React.useState(false);
  const [userTyping, setUserTyping] = React.useState(false);

  // Demo typing behavior - simulate opponent typing randomly
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setOpponentTyping(true);
        setTimeout(() => setOpponentTyping(false), 2000 + Math.random() * 3000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const mockParticipants = [
    {
      id: user.id,
      name: user.firstName || 'You',
      avatar: user.imageUrl,
      position: 'PRO' as const,
      isOnline: true,
      isTyping: userTyping,
      lastSeen: new Date()
    },
    {
      id: 'opponent-demo',
      name: 'Alex Chen',
      position: 'CON' as const, 
      isOnline: true,
      isTyping: opponentTyping,
      lastSeen: new Date(Date.now() - 30000) // 30 seconds ago
    }
  ];

  // Mock topic for development with enhanced metadata
  const mockTopic = {
    id: 'demo-topic-1',
    title: 'Should artificial intelligence be regulated by government?',
    description: 'A debate about the role of government oversight in AI development and deployment, considering both innovation and safety concerns.',
    category: 'Technology',
    difficulty: 'INTERMEDIATE' as const,
    backgroundInfo: `As AI systems become more powerful and widespread, questions about appropriate governance become increasingly important. This debate explores the balance between fostering innovation and ensuring responsible development.

Recent advances in large language models, computer vision, and autonomous systems have raised concerns about potential risks including job displacement, privacy violations, algorithmic bias, and the concentration of AI power in a few large corporations.

Proponents of regulation argue that government oversight is necessary to prevent harmful applications, ensure fairness, and protect consumer rights. Critics worry that premature or overly restrictive regulations could stifle innovation and give advantages to countries with more permissive regulatory environments.`,
    tags: ['AI Policy', 'Technology Regulation', 'Innovation vs Safety', 'Government Oversight'],
    estimatedDuration: 45, // minutes
    sources: [
      'https://www.whitehouse.gov/ostp/ai-bill-of-rights/',
      'https://www.brookings.edu/research/algorithmic-accountability-act/',
      'https://www.nature.com/articles/s41586-021-03819-2',
      'MIT Technology Review: The case for AI regulation',
      'Stanford HAI Policy Brief on AI Governance'
    ]
  };

  // Mock preparation materials
  const mockPreparationMaterials = {
    matchId: matchId,
    userId: user.id,
    position: 'PRO' as const,
    positionOverview: `As the PRO side, you will argue that government regulation of AI is necessary and beneficial. Your position supports the idea that appropriate regulatory frameworks can help maximize AI's benefits while minimizing risks to society.`,
    keyArguments: [
      'AI systems can perpetuate and amplify existing biases, requiring regulatory oversight to ensure fairness',
      'Rapid AI advancement outpaces current legal frameworks, creating regulatory gaps that need to be filled',
      'Consumer protection requires clear standards for AI system transparency and accountability',
      'National security concerns justify government involvement in AI development and deployment',
      'Historical precedent shows successful regulation of emerging technologies (internet, pharmaceuticals, aviation)'
    ],
    evidenceSources: [
      {
        title: 'White House AI Bill of Rights',
        url: 'https://www.whitehouse.gov/ostp/ai-bill-of-rights/',
        credibilityScore: 0.95,
        summary: 'Official US government framework for AI rights and protections, emphasizing the need for safeguards in AI systems'
      },
      {
        title: 'Nature: The ethics of artificial intelligence',
        url: 'https://www.nature.com/articles/s41586-021-03819-2',
        credibilityScore: 0.92,
        summary: 'Peer-reviewed research on AI ethics and the need for governance frameworks to address societal impacts'
      },
      {
        title: 'Brookings: Algorithmic Accountability Act Analysis',
        url: 'https://www.brookings.edu/research/algorithmic-accountability-act/',
        credibilityScore: 0.88,
        summary: 'Policy analysis supporting the need for algorithmic transparency and accountability measures'
      }
    ],
    counterArgumentPrep: {
      anticipatedArguments: [
        'Regulation will stifle innovation and slow AI progress',
        'Market forces can self-regulate AI development effectively',
        'Government lacks technical expertise to regulate AI properly',
        'International competition requires minimal regulation to maintain advantage'
      ],
      rebuttals: [
        'Smart regulation can actually accelerate beneficial AI development by providing clear guidelines',
        'Market failures in AI safety and bias demonstrate need for external oversight',
        'Government can work with technical experts and create specialized regulatory bodies',
        'International cooperation on AI standards benefits everyone, including competitive advantage'
      ]
    },
    preparationTips: [
      'Focus on concrete examples of AI bias and harm that could be prevented by regulation',
      'Emphasize that regulation doesn\'t mean stopping innovation, but guiding it responsibly',
      'Use analogies to successful regulation of other technologies like aviation or pharmaceuticals',
      'Address economic concerns by highlighting the costs of unregulated AI failures'
    ],
    timelineGuidance: [
      {
        phase: 'Opening Statement',
        duration: 3,
        tasks: ['Present your main thesis', 'Outline 2-3 key arguments', 'Establish credibility with evidence']
      },
      {
        phase: 'Argument Development',
        duration: 15,
        tasks: ['Expand on bias prevention argument', 'Discuss consumer protection needs', 'Address national security aspects']
      },
      {
        phase: 'Counter-Argument Response',
        duration: 10,
        tasks: ['Refute innovation stifling claims', 'Address market failure examples', 'Defend government competence']
      }
    ],
    practiceQuestions: [
      'How would you respond to claims that AI regulation will make the US less competitive globally?',
      'What specific examples can you provide of AI systems that have caused harm without regulation?',
      'How do you differentiate between helpful and harmful AI regulation?',
      'What role should technical experts play in AI governance?'
    ],
    additionalResources: [
      'EU AI Act overview and analysis',
      'Case studies of successful technology regulation',
      'AI safety research papers and findings',
      'Economic impact studies of AI regulation proposals'
    ]
  };

  return (
    <DebateRoomLayout
      conversationId={conversationId}
      matchId={matchId}
      userId={user.id}
      currentPhase="PREPARATION"
      participants={mockParticipants}
      topic={mockTopic}
      preparationMaterials={mockPreparationMaterials}
    />
  );
}

// Export protected page with route guard
export default function DebateRoomPage(props: DebateRoomPageProps) {
  return (
    <RouteGuard
      requireAuth={true}
      requireProfile={true}
      debateAccess={{
        conversationId: props.params.conversationId,
        requireParticipant: true
      }}
      fallbackPath="/dashboard"
    >
      <DebateRoomPageContent {...props} />
    </RouteGuard>
  );
}

// Export metadata for Next.js
export const metadata = {
  title: 'Debate Room - Both Sides',
  description: 'Engage in structured AI-moderated debates'
};
