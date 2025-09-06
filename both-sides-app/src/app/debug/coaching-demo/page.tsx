'use client';

/**
 * Debug page for testing Task 6.4.1 AI Coaching Sidebar
 */

import React, { useState } from 'react';

import { DebatePhase, Message } from '@/types/debate';
import { CoachingSidebar } from '@/components/debate-room/CoachingSidebar';
import { CoachingToggle } from '@/components/debate-room/CoachingToggle';
import { useAICoaching } from '@/lib/hooks/useAICoaching';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const phases: DebatePhase[] = [
  'PREPARATION',
  'OPENING', 
  'DISCUSSION',
  'REBUTTAL',
  'CLOSING',
  'REFLECTION'
];

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    content: 'I think we should implement this policy because it will help everyone.',
    authorId: 'user-1',
    timestamp: new Date(Date.now() - 60000),
    type: 'USER',
    phase: 'DISCUSSION'
  },
  {
    id: 'msg-2', 
    content: 'That argument is completely wrong and makes no sense.',
    authorId: 'user-2',
    timestamp: new Date(Date.now() - 30000),
    type: 'USER',
    phase: 'DISCUSSION'
  },
  {
    id: 'msg-3',
    content: 'Actually, there are several studies that show...',
    authorId: 'user-1',
    timestamp: new Date(Date.now() - 15000),
    type: 'USER',
    phase: 'DISCUSSION'
  }
];

export default function CoachingDemoPage() {
  const [currentPhase, setCurrentPhase] = useState<DebatePhase>('DISCUSSION');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  // AI Coaching hook
  const aiCoaching = useAICoaching({
    conversationId: 'demo-conversation',
    userId: 'demo-user',
    currentPhase,
    recentMessages: messages,
    currentMessage,
    enabled: true
  });

  const handlePhaseChange = (phase: DebatePhase) => {
    setCurrentPhase(phase);
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
    }
  };

  const handleApplySuggestion = (suggestionId: string) => {
    setAppliedSuggestions(prev => new Set(prev).add(suggestionId));
    console.log('Applied suggestion:', suggestionId);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div>
            <h1 className="text-xl font-semibold">Task 6.4.1: AI Coaching Demo</h1>
            <p className="text-sm text-muted-foreground">
              Testing AI coaching sidebar with real-time suggestions
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="outline">Phase 6.4.1</Badge>
            <CoachingToggle
              isVisible={sidebarVisible}
              onToggle={() => setSidebarVisible(!sidebarVisible)}
              hasNewSuggestions={aiCoaching.hasNewSuggestions}
              suggestionCount={aiCoaching.suggestions.length}
              variant="default"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Controls & Chat */}
            <ResizablePanel defaultSize={sidebarVisible ? 60 : 80} className="p-4">
              <div className="h-full flex flex-col space-y-4">
                {/* Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Demo Controls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      {/* AI Coaching Status */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">AI Coaching Status:</label>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${
                              aiCoaching.isLoading ? 'bg-amber-500' : 
                              aiCoaching.error ? 'bg-red-500' : 'bg-green-500'
                            }`} />
                            <span>
                              {aiCoaching.isLoading ? 'Loading...' :
                               aiCoaching.error ? 'Error' : 'Active'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {aiCoaching.suggestions.length} suggestions available
                          </p>
                          {aiCoaching.lastRefresh && (
                            <p className="text-xs text-muted-foreground">
                              Last refresh: {aiCoaching.lastRefresh.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mock Chat Interface */}
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle className="text-lg">Mock Debate Messages</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add messages to trigger AI coaching suggestions
                    </p>
                  </CardHeader>
                  <CardContent className="h-full flex flex-col">
                    {/* Messages Display */}
                    <div className="flex-1 border rounded-lg p-4 mb-4 overflow-y-auto bg-muted/20">
                      <div className="space-y-3">
                        {messages.map((message) => (
                          <div key={message.id} className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {message.authorId}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="bg-background p-3 rounded border">
                              <p className="text-sm">{message.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                      <Textarea
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        placeholder="Type a message to test AI coaching suggestions..."
                        className="resize-none"
                        rows={3}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {currentMessage.length} characters
                        </span>
                        <Button 
                          onClick={handleAddMessage}
                          disabled={!currentMessage.trim()}
                          size="sm"
                        >
                          Add Message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            {sidebarVisible && <ResizableHandle />}

            {/* Right Panel - AI Coaching Sidebar */}
            {sidebarVisible && (
              <ResizablePanel defaultSize={40} minSize={30} maxSize={50}>
                <CoachingSidebar
                  conversationId="demo-conversation"
                  userId="demo-user"
                  currentPhase={currentPhase}
                  currentMessage={currentMessage}
                  recentMessages={messages}
                  isVisible={true}
                  onToggle={() => setSidebarVisible(false)}
                />
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Footer - Success Criteria */}
        <div className="border-t bg-card p-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="font-medium mb-2">Task 6.4.1 Success Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Smooth sidebar animation and responsive design</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Clear categorization of coaching suggestions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Non-disruptive integration with main debate flow</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Easy toggle between coaching and full-screen debate</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
