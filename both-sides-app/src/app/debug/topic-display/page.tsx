'use client';

/**
 * Phase 6 Task 6.1.3: Topic Display Components Demo
 * 
 * Demo page for testing topic display, context panels, and preparation access
 */

import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  TopicDisplay,
  TopicHeader,
  ContextPanel,
  PreparationAccess,
  PositionSelector
} from '@/components/debate-room';
import { DebateTopic, DebatePosition, PreparationMaterials } from '@/types/debate';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const MOCK_TOPICS: DebateTopic[] = [
  {
    id: 'topic-1',
    title: 'Should artificial intelligence be regulated by government?',
    description: 'A debate about the role of government oversight in AI development and deployment.',
    category: 'Technology',
    difficulty: 'INTERMEDIATE',
    backgroundInfo: `As AI systems become more powerful and widespread, questions about appropriate governance become increasingly important. This debate explores the balance between fostering innovation and ensuring responsible development.

Recent advances in large language models, computer vision, and autonomous systems have raised concerns about potential risks including job displacement, privacy violations, algorithmic bias, and the concentration of AI power in a few large corporations.

Proponents of regulation argue that government oversight is necessary to prevent harmful applications, ensure fairness, and protect consumer rights. Critics worry that premature or overly restrictive regulations could stifle innovation and give advantages to countries with more permissive regulatory environments.`,
    tags: ['AI Policy', 'Technology Regulation', 'Innovation vs Safety', 'Government Oversight'],
    estimatedDuration: 45,
    sources: [
      'https://www.whitehouse.gov/ostp/ai-bill-of-rights/',
      'https://www.brookings.edu/research/algorithmic-accountability-act/',
      'https://www.nature.com/articles/s41586-021-03819-2',
      'MIT Technology Review: The case for AI regulation',
      'Stanford HAI Policy Brief on AI Governance'
    ]
  },
  {
    id: 'topic-2',
    title: 'Should schools require students to learn coding?',
    description: 'Exploring whether programming should be a mandatory part of modern education.',
    category: 'Education',
    difficulty: 'BEGINNER',
    backgroundInfo: `As our world becomes increasingly digital, there's growing debate about whether coding should join reading, writing, and arithmetic as a fundamental skill taught in schools.

Supporters argue that coding literacy is essential for understanding how technology works and for preparing students for future careers. They point to the growing demand for technical skills across all industries.

Critics question whether all students need coding skills, worry about teacher training and resource requirements, and argue that time might be better spent on other subjects like critical thinking, arts, or traditional academics.`,
    tags: ['Education Policy', 'Digital Literacy', 'STEM Education', 'Curriculum Design'],
    estimatedDuration: 30,
    sources: [
      'https://code.org/promote/research',
      'Department of Education STEM statistics',
      'International comparison of computer science education'
    ]
  },
  {
    id: 'topic-3',
    title: 'Should social media platforms be held liable for user-generated content?',
    description: 'Examining platform responsibility for content moderation and harmful speech.',
    category: 'Digital Rights',
    difficulty: 'ADVANCED',
    backgroundInfo: `The question of platform liability for user content has become one of the most contentious issues in digital policy. Section 230 of the Communications Decency Act has traditionally protected platforms from liability, but growing concerns about misinformation, hate speech, and harmful content have sparked calls for reform.

This debate involves complex tradeoffs between free speech, platform innovation, content quality, and the practical challenges of moderating billions of posts daily. Different approaches exist globally, from the EU's Digital Services Act to proposals for algorithmic transparency and content labeling.`,
    tags: ['Section 230', 'Content Moderation', 'Free Speech', 'Platform Regulation'],
    estimatedDuration: 60,
    sources: [
      'https://www.eff.org/issues/cda230',
      'EU Digital Services Act',
      'Supreme Court cases on platform liability',
      'Content moderation research studies'
    ]
  }
];

const MOCK_PREPARATION_MATERIALS: PreparationMaterials = {
  matchId: 'demo-match',
  userId: 'demo-user',
  position: 'PRO',
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
      summary: 'Official US government framework for AI rights and protections'
    },
    {
      title: 'Nature: The ethics of artificial intelligence',
      url: 'https://www.nature.com/articles/s41586-021-03819-2',
      credibilityScore: 0.92,
      summary: 'Peer-reviewed research on AI ethics and governance frameworks'
    },
    {
      title: 'Brookings: Algorithmic Accountability Act Analysis',
      url: 'https://www.brookings.edu/research/algorithmic-accountability-act/',
      credibilityScore: 0.88,
      summary: 'Policy analysis supporting algorithmic transparency measures'
    }
  ],
  counterArgumentPrep: {
    anticipatedArguments: [
      'Regulation will stifle innovation and slow AI progress',
      'Market forces can self-regulate AI development effectively',
      'Government lacks technical expertise to regulate AI properly'
    ],
    rebuttals: [
      'Smart regulation can actually accelerate beneficial AI development',
      'Market failures in AI safety demonstrate need for oversight',
      'Government can work with technical experts and create specialized bodies'
    ]
  },
  preparationTips: [
    'Focus on concrete examples of AI bias and harm',
    'Emphasize regulation as guidance, not stopping innovation',
    'Use analogies to successful technology regulation',
    'Address economic concerns about unregulated AI failures'
  ],
  timelineGuidance: [
    {
      phase: 'Opening Statement',
      duration: 3,
      tasks: ['Present main thesis', 'Outline key arguments', 'Establish credibility']
    },
    {
      phase: 'Argument Development',
      duration: 15,
      tasks: ['Expand bias prevention', 'Discuss consumer protection', 'Address security']
    }
  ],
  practiceQuestions: [
    'How would you respond to claims about global competitiveness?',
    'What examples of AI harm can you provide?',
    'How do you differentiate helpful from harmful regulation?'
  ],
  additionalResources: [
    'EU AI Act overview',
    'Technology regulation case studies',
    'AI safety research papers'
  ]
};

export default function TopicDisplayDemo() {
  const [selectedTopic, setSelectedTopic] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState<DebatePosition>('PRO');
  const [showPreparationMaterials, setShowPreparationMaterials] = useState(true);
  
  const currentTopic = MOCK_TOPICS[selectedTopic];
  const currentMaterials = showPreparationMaterials ? {
    ...MOCK_PREPARATION_MATERIALS,
    position: selectedPosition
  } : undefined;

  const handleAccessPreparation = () => {
    alert('Opening full preparation materials (would be a modal or new page)');
  };

  const rotateTopic = () => {
    setSelectedTopic((prev) => (prev + 1) % MOCK_TOPICS.length);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Topic Display Components Demo</h1>
            <p className="text-muted-foreground">Task 6.1.3: Testing topic presentation and preparation materials</p>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Demo Controls</CardTitle>
            <CardDescription>Adjust settings to test different scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Topic Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Topic:</label>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={rotateTopic}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Switch
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedTopic + 1} of {MOCK_TOPICS.length}
                  </span>
                </div>
              </div>

              {/* Position Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Position:</label>
                <PositionSelector
                  selectedPosition={selectedPosition}
                  onPositionChange={setSelectedPosition}
                />
              </div>

              {/* Preparation Materials Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Preparation Materials:</label>
                <Button
                  variant={showPreparationMaterials ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowPreparationMaterials(!showPreparationMaterials)}
                >
                  {showPreparationMaterials ? 'Hide' : 'Show'} Materials
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Topic Display */}
        <Card>
          <CardHeader>
            <CardTitle>Complete TopicDisplay Component</CardTitle>
            <CardDescription>
              Full integrated component with all features ({currentTopic.difficulty} level)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopicDisplay
              topic={currentTopic}
              userPosition={selectedPosition}
              preparationMaterials={currentMaterials}
              onAccessPreparation={handleAccessPreparation}
            />
          </CardContent>
        </Card>

        {/* Individual Component Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TopicHeader Component */}
          <Card>
            <CardHeader>
              <CardTitle>TopicHeader Component</CardTitle>
              <CardDescription>Standalone topic header with metadata</CardDescription>
            </CardHeader>
            <CardContent>
              <TopicHeader
                topic={currentTopic}
                userPosition={selectedPosition}
              />
            </CardContent>
          </Card>

          {/* ContextPanel Component */}
          <Card>
            <CardHeader>
              <CardTitle>ContextPanel Component</CardTitle>
              <CardDescription>Expandable background information</CardDescription>
            </CardHeader>
            <CardContent>
              <ContextPanel
                topic={currentTopic}
                expanded={true}
                onToggle={() => {}}
              />
            </CardContent>
          </Card>

          {/* PreparationAccess Component */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>PreparationAccess Component</CardTitle>
              <CardDescription>AI-generated preparation materials preview</CardDescription>
            </CardHeader>
            <CardContent>
              <PreparationAccess
                preparationMaterials={currentMaterials}
                userPosition={selectedPosition}
                expanded={true}
                onToggle={() => {}}
                onAccessPreparation={handleAccessPreparation}
              />
            </CardContent>
          </Card>
        </div>

        {/* Topic Variations */}
        <Card>
          <CardHeader>
            <CardTitle>All Available Topics</CardTitle>
            <CardDescription>Quick preview of all demo topics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {MOCK_TOPICS.map((topic, index) => (
                <div 
                  key={topic.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    index === selectedTopic ? 'border-primary bg-accent/50' : 'hover:bg-accent/30'
                  }`}
                  onClick={() => setSelectedTopic(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{topic.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs bg-accent px-2 py-1 rounded">{topic.category}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          topic.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-800' :
                          topic.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {topic.difficulty}
                        </span>
                        <span className="text-xs text-muted-foreground">{topic.estimatedDuration}min</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
