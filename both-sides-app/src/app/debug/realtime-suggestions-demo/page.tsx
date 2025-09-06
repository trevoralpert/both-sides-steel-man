'use client';

/**
 * Debug page for testing Task 6.4.2 Real-time Suggestion Display
 */

import React, { useState } from 'react';

import { DebatePhase, Message } from '@/types/debate';
import { SuggestionDisplay } from '@/components/debate-room/SuggestionDisplay';
import { useAICoaching } from '@/lib/hooks/useAICoaching';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  Zap, 
  Brain, 
  BarChart3, 
  Timer, 
  MessageSquare,
  Target,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

const phases: DebatePhase[] = [
  'PREPARATION',
  'OPENING', 
  'DISCUSSION',
  'REBUTTAL',
  'CLOSING',
  'REFLECTION'
];

const testScenarios = [
  {
    name: 'Respectful Language',
    message: 'That argument is completely wrong and stupid. Anyone can see that.',
    description: 'Triggers respectfulness suggestions'
  },
  {
    name: 'Need Evidence',
    message: 'Climate change is a serious problem that affects everyone. We need to take action immediately to prevent disasters.',
    description: 'Triggers evidence-needed suggestions'
  },
  {
    name: 'Uncertainty Language',
    message: 'I think maybe we could possibly consider that this might be an issue, I guess.',
    description: 'Triggers clarity suggestions'
  },
  {
    name: 'Long Sentences',
    message: 'This is a very long sentence that goes on and on without proper punctuation or structure and it becomes hard to follow the main point being made because there are no clear breaks or logical divisions.',
    description: 'Triggers structure suggestions'
  },
  {
    name: 'Questions Balance',
    message: 'But what about the economic impact? How can we address this concern? What alternatives exist?',
    description: 'Triggers argument strength suggestions'
  }
];

export default function RealtimeSuggestionsDemoPage() {
  const [currentPhase, setCurrentPhase] = useState<DebatePhase>('DISCUSSION');
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);

  // Enhanced AI Coaching with real-time features
  const aiCoaching = useAICoaching({
    conversationId: 'realtime-demo-conversation',
    userId: 'demo-user',
    currentPhase,
    recentMessages: messages,
    currentMessage,
    enabled: true,
    realTimeAnalysis: true,
    analysisDelay: 800 // Faster for demo
  });

  const handlePhaseChange = (phase: DebatePhase) => {
    setCurrentPhase(phase);
  };

  const handleImplementSuggestion = (suggestion: any) => {
    setAppliedSuggestions(prev => new Set(prev).add(suggestion.id));
    console.log('Applied suggestion:', suggestion);
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(suggestionId));
    console.log('Dismissed suggestion:', suggestionId);
  };

  const handleSuggestionFeedback = (suggestionId: string, helpful: boolean) => {
    console.log(`Feedback for ${suggestionId}:`, helpful ? 'helpful' : 'not helpful');
  };

  const loadTestScenario = (scenario: typeof testScenarios[0], index: number) => {
    setCurrentMessage(scenario.message);
    setSelectedScenario(index);
  };

  const handleAddMessage = () => {
    if (currentMessage.trim()) {
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        content: currentMessage,
        authorId: 'demo-user',
        timestamp: new Date(),
        type: 'USER',
        phase: currentPhase
      };
      
      setMessages(prev => [...prev, newMessage]);
      setCurrentMessage('');
      setSelectedScenario(null);
    }
  };

  const clearAll = () => {
    setCurrentMessage('');
    setMessages([]);
    setAppliedSuggestions(new Set());
    setDismissedSuggestions(new Set());
    setSelectedScenario(null);
  };

  // Calculate typing metrics for display
  const typingMetrics = {
    wpm: Math.round(aiCoaching.typingPatterns.wordsPerMinute),
    avgWordLength: Math.round(aiCoaching.typingPatterns.averageWordLength * 10) / 10,
    sentences: aiCoaching.typingPatterns.sentenceCount,
    negativeWords: aiCoaching.typingPatterns.negativeWords.length,
    uncertaintyWords: aiCoaching.typingPatterns.uncertaintyIndicators.length,
    evidenceWords: aiCoaching.typingPatterns.evidenceKeywords.length
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div>
            <h1 className="text-xl font-semibold">Task 6.4.2: Real-time Suggestion Demo</h1>
            <p className="text-sm text-muted-foreground">
              Testing real-time coaching suggestions with live typing analysis
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="outline">Phase 6.4.2</Badge>
            {aiCoaching.isAnalyzingTyping && (
              <Badge className="animate-pulse bg-amber-100 text-amber-800">
                <Brain className="h-3 w-3 mr-1" />
                Analyzing
              </Badge>
            )}
            {aiCoaching.suggestionMetrics.hasRealTime && (
              <Badge className="bg-green-100 text-green-800">
                <Zap className="h-3 w-3 mr-1" />
                {aiCoaching.suggestionMetrics.realTime} Live
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Controls & Input */}
            <ResizablePanel defaultSize={45} className="p-4">
              <div className="h-full flex flex-col space-y-4">
                {/* Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Demo Controls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Phase Selector */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Current Phase:</label>
                        <div className="flex flex-wrap gap-2">
                          {phases.map((phase) => (
                            <Button
                              key={phase}
                              variant={currentPhase === phase ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handlePhaseChange(phase)}
                              className="text-xs"
                            >
                              {phase}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Test Scenarios */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Test Scenarios:</label>
                        <div className="grid grid-cols-1 gap-2">
                          {testScenarios.map((scenario, index) => (
                            <Button
                              key={index}
                              variant={selectedScenario === index ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => loadTestScenario(scenario, index)}
                              className="justify-start text-xs h-auto p-2"
                            >
                              <div className="text-left">
                                <div className="font-medium">{scenario.name}</div>
                                <div className="text-xs opacity-75">{scenario.description}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Button onClick={handleAddMessage} disabled={!currentMessage.trim()} size="sm">
                          Add Message
                        </Button>
                        <Button onClick={clearAll} variant="outline" size="sm">
                          Clear All
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Real-time Message Input */}
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle className="text-lg">Live Message Input</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Type to see real-time coaching suggestions
                    </p>
                  </CardHeader>
                  <CardContent className="h-full flex flex-col">
                    <Textarea
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="Start typing to get real-time coaching suggestions..."
                      className="flex-1 resize-none"
                      rows={8}
                    />
                    
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{currentMessage.length} characters</span>
                        {aiCoaching.isAnalyzingTyping && (
                          <span className="text-amber-600 flex items-center">
                            <Timer className="h-3 w-3 mr-1" />
                            Analyzing...
                          </span>
                        )}
                      </div>
                      
                      {/* Typing Metrics */}
                      {currentMessage.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3 text-blue-500" />
                            <span>{typingMetrics.wpm} WPM</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="h-3 w-3 text-green-500" />
                            <span>{typingMetrics.sentences} sentences</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span>{typingMetrics.negativeWords} negative</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Messages History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Message History ({messages.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-32 overflow-y-auto">
                    <div className="space-y-2">
                      {messages.map((message) => (
                        <div key={message.id} className="text-xs border rounded p-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {message.phase}
                            </Badge>
                            <span className="text-muted-foreground">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p>{message.content}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle />

            {/* Right Panel - Enhanced Suggestion Display */}
            <ResizablePanel defaultSize={55}>
              <div className="h-full border-l">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Real-time Coaching Suggestions</h2>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {aiCoaching.suggestionMetrics.total} total
                      </Badge>
                      {aiCoaching.suggestionMetrics.hasRealTime && (
                        <Badge className="bg-green-100 text-green-800">
                          {aiCoaching.suggestionMetrics.realTime} live
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 h-full overflow-hidden">
                  <SuggestionDisplay
                    suggestions={aiCoaching.allSuggestions}
                    onImplementSuggestion={handleImplementSuggestion}
                    onDismissSuggestion={handleDismissSuggestion}
                    onFeedback={handleSuggestionFeedback}
                    currentMessage={currentMessage}
                    implementedSuggestions={appliedSuggestions}
                    dismissedSuggestions={dismissedSuggestions}
                    showProgress={true}
                    enableRealTimeUpdates={true}
                  />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Footer - Success Criteria */}
        <div className="border-t bg-card p-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="font-medium mb-2">Task 6.4.2 Success Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Relevant, timely suggestions based on message content</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Clear action buttons for implementing suggestions</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Visual feedback when suggestions are used</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Learning from user feedback to improve suggestions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
