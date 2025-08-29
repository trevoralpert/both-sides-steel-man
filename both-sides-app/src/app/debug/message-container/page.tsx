'use client';

/**
 * Phase 6 Task 6.1.4: Message Container Components Demo
 * 
 * Demo page for testing message display, grouping, and container functionality
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  MessageContainer,
  MessageBubble,
  MessageGroup,
  SystemMessage,
  SystemMessageTemplates,
  createSystemMessage
} from '@/components/debate-room';
import { Message, DebatePosition } from '@/types/debate';
import { ArrowLeft, Plus, RefreshCw, MessageSquare, Bot, Shield } from 'lucide-react';
import Link from 'next/link';

const MOCK_PARTICIPANTS = {
  'user-pro': {
    name: 'Alex Chen',
    position: 'PRO' as DebatePosition
  },
  'user-con': {
    name: 'Maria Rodriguez', 
    position: 'CON' as DebatePosition
  },
  'ai-coach': {
    name: 'AI Coach'
  },
  'system': {
    name: 'System'
  }
};

// Generate realistic mock messages
function generateMockMessages(): Message[] {
  const messages: Message[] = [
    SystemMessageTemplates.debateStarted(),
    SystemMessageTemplates.phaseChange('PREPARATION', 5),
    
    {
      id: 'msg-1',
      content: 'Hello! I\'m excited to debate this important topic about AI regulation with you today.',
      authorId: 'user-con',
      timestamp: new Date(Date.now() - 10 * 60000),
      type: 'USER',
      phase: 'PREPARATION'
    },
    
    {
      id: 'msg-2',
      content: 'Likewise! This is such a crucial issue for our technological future. I believe proper regulation is essential.',
      authorId: 'user-pro',
      timestamp: new Date(Date.now() - 9.5 * 60000),
      type: 'USER',
      phase: 'PREPARATION'
    },

    {
      id: 'msg-3',
      content: 'I can understand that perspective, but I worry about stifling innovation.',
      authorId: 'user-con',
      timestamp: new Date(Date.now() - 9 * 60000),
      type: 'USER',
      phase: 'PREPARATION'
    },

    SystemMessageTemplates.phaseChange('OPENING', 10),

    {
      id: 'msg-4',
      content: 'Let me start with my opening statement. **Government regulation of AI is not only necessary but crucial for ensuring AI development serves humanity\'s best interests.** Without proper oversight, we risk creating powerful systems that could cause significant harm.\n\nConsider these key points:\n- *Bias and fairness issues* require regulatory oversight\n- *Safety standards* need to be established before widespread deployment\n- *Transparency requirements* help build public trust',
      authorId: 'user-pro',
      timestamp: new Date(Date.now() - 8 * 60000),
      type: 'USER',
      phase: 'OPENING'
    },

    {
      id: 'ai-coach-1',
      content: 'Great opening! Consider strengthening your argument by providing specific examples of AI bias that regulation could address, such as hiring algorithms or facial recognition systems.',
      authorId: 'ai-coach',
      timestamp: new Date(Date.now() - 7.5 * 60000),
      type: 'AI_COACHING',
      phase: 'OPENING'
    },

    {
      id: 'msg-5',
      content: 'Thank you for that thoughtful opening. However, I must respectfully disagree with the premise that government regulation is the best path forward.\n\n**The rapid pace of AI innovation requires agility that traditional regulatory frameworks simply cannot provide.** Here\'s why market-driven solutions are superior:\n\n• Innovation happens faster than regulation can adapt\n• Industry self-regulation has proven effective in other tech sectors\n• Global competition requires regulatory flexibility',
      authorId: 'user-con',
      timestamp: new Date(Date.now() - 6.5 * 60000),
      type: 'USER',
      phase: 'OPENING'
    },

    SystemMessageTemplates.phaseChange('DISCUSSION', 30),

    {
      id: 'msg-6',
      content: 'You raise valid concerns about regulatory agility, but let me address that directly. The pharmaceutical industry provides an excellent counter-example - FDA regulation hasn\'t stopped medical innovation, it\'s guided it toward safer, more effective outcomes.',
      authorId: 'user-pro',
      timestamp: new Date(Date.now() - 5 * 60000),
      type: 'USER',
      phase: 'DISCUSSION'
    },

    {
      id: 'msg-7',
      content: 'But pharmaceuticals and AI are fundamentally different! Drug development follows predictable pathways, while AI capabilities can emerge unexpectedly. Regulating something you can\'t fully predict is like trying to build a bridge to a destination that keeps moving.',
      authorId: 'user-con',
      timestamp: new Date(Date.now() - 4 * 60000),
      type: 'USER',
      phase: 'DISCUSSION'
    },

    {
      id: 'ai-coach-2',
      content: 'This is a compelling analogy! You might want to explore the concept of "adaptive regulation" - frameworks that can evolve with technology while maintaining core safety principles.',
      authorId: 'ai-coach',
      timestamp: new Date(Date.now() - 3.5 * 60000),
      type: 'AI_COACHING',
      phase: 'DISCUSSION'
    },

    {
      id: 'msg-8',
      content: 'Actually, that\'s exactly why we need regulation now - *before* AI becomes too complex to govern effectively. Think of it as preventive medicine for technology.',
      authorId: 'user-pro',
      timestamp: new Date(Date.now() - 2 * 60000),
      type: 'USER',
      phase: 'DISCUSSION'
    }
  ];

  return messages;
}

export default function MessageContainerDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('user-pro');
  const [currentPhase, setCurrentPhase] = useState<'PREPARATION' | 'OPENING' | 'DISCUSSION'>('DISCUSSION');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showAvatars, setShowAvatars] = useState(true);

  // Initialize with mock messages
  useEffect(() => {
    setMessages(generateMockMessages());
  }, []);

  // Add a new message
  const addMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      content: newMessage,
      authorId: selectedUserId,
      timestamp: new Date(),
      type: 'USER',
      phase: currentPhase
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  // Add a system message
  const addSystemMessage = (type: 'phase' | 'join' | 'leave' | 'warning') => {
    let systemMessage: Message;

    switch (type) {
      case 'phase':
        systemMessage = SystemMessageTemplates.phaseChange(currentPhase, 30);
        break;
      case 'join':
        systemMessage = SystemMessageTemplates.userJoined('New Participant');
        break;
      case 'leave':
        systemMessage = SystemMessageTemplates.userLeft('Participant');
        break;
      case 'warning':
        systemMessage = SystemMessageTemplates.warningMessage('Please keep responses respectful and on-topic');
        break;
      default:
        return;
    }

    setMessages(prev => [...prev, systemMessage]);
  };

  // Add AI coaching message
  const addAICoachingMessage = () => {
    const coachingMessages = [
      'Consider providing specific evidence to support your argument.',
      'This would be a good opportunity to address potential counterarguments.',
      'Try to acknowledge the validity in your opponent\'s point while presenting your perspective.',
      'Consider using a concrete example to illustrate this concept.'
    ];

    const message: Message = {
      id: `ai-coach-${Date.now()}`,
      content: coachingMessages[Math.floor(Math.random() * coachingMessages.length)],
      authorId: 'ai-coach',
      timestamp: new Date(),
      type: 'AI_COACHING',
      phase: currentPhase
    };

    setMessages(prev => [...prev, message]);
  };

  // Clear all messages
  const clearMessages = () => {
    setMessages([]);
  };

  // Generate more mock messages
  const addMockMessages = () => {
    const additionalMessages = generateMockMessages();
    setMessages(prev => [...prev, ...additionalMessages.slice(-3)]);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Message Container Components Demo</h1>
            <p className="text-muted-foreground">Task 6.1.4: Testing message display, grouping, and virtual scrolling</p>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Demo Controls</CardTitle>
            <CardDescription>Add messages and adjust settings to test different scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Message Controls */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addMessage();
                    }
                  }}
                />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="user-pro">Pro (Alex)</option>
                  <option value="user-con">Con (Maria)</option>
                </select>
                <Button onClick={addMessage} disabled={!newMessage.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => addSystemMessage('phase')}>
                  <Shield className="h-3 w-3 mr-1" />
                  Phase Change
                </Button>
                <Button variant="outline" size="sm" onClick={() => addSystemMessage('join')}>
                  User Joined
                </Button>
                <Button variant="outline" size="sm" onClick={() => addSystemMessage('leave')}>
                  User Left
                </Button>
                <Button variant="outline" size="sm" onClick={() => addSystemMessage('warning')}>
                  Warning
                </Button>
                <Button variant="outline" size="sm" onClick={addAICoachingMessage}>
                  <Bot className="h-3 w-3 mr-1" />
                  AI Coach
                </Button>
                <Button variant="outline" size="sm" onClick={addMockMessages}>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Add Mock
                </Button>
                <Button variant="outline" size="sm" onClick={clearMessages}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>

            <Separator />

            {/* Display Settings */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phase:</label>
                <select
                  value={currentPhase}
                  onChange={(e) => setCurrentPhase(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="PREPARATION">Preparation</option>
                  <option value="OPENING">Opening</option>
                  <option value="DISCUSSION">Discussion</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Options:</label>
                <div className="space-y-1">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                    />
                    <span>Auto-scroll</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showTimestamps}
                      onChange={(e) => setShowTimestamps(e.target.checked)}
                    />
                    <span>Show timestamps</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showAvatars}
                      onChange={(e) => setShowAvatars(e.target.checked)}
                    />
                    <span>Show avatars</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Stats:</label>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Total messages: {messages.length}</p>
                  <p>User messages: {messages.filter(m => m.type === 'USER').length}</p>
                  <p>System messages: {messages.filter(m => m.type === 'SYSTEM').length}</p>
                  <p>AI coaching: {messages.filter(m => m.type === 'AI_COACHING').length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Message Container Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Full Message Container */}
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle>MessageContainer Component</CardTitle>
              <CardDescription>
                Full container with virtual scrolling ({messages.length} messages)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-full pb-6">
              <div className="h-full border rounded-lg">
                <MessageContainer
                  messages={messages}
                  currentUserId={selectedUserId}
                  participantMap={MOCK_PARTICIPANTS}
                  autoScrollEnabled={autoScroll}
                  showTimestamps={showTimestamps}
                  showAvatars={showAvatars}
                  onLoadMore={() => {
                    console.log('Loading more messages...');
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Individual Component Tests */}
          <div className="space-y-6">
            
            {/* MessageBubble Examples */}
            <Card>
              <CardHeader>
                <CardTitle>MessageBubble Examples</CardTitle>
                <CardDescription>Individual message components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* User message (own) */}
                <div className="space-y-2">
                  <Badge variant="outline" className="text-xs">Your Message</Badge>
                  <MessageBubble
                    message={{
                      id: 'example-1',
                      content: 'This is my message with **bold text** and *italics*',
                      authorId: 'user-pro',
                      timestamp: new Date(),
                      type: 'USER',
                      phase: 'DISCUSSION'
                    }}
                    isOwn={true}
                    participantInfo={MOCK_PARTICIPANTS['user-pro']}
                    showTimestamp={true}
                  />
                </div>

                {/* User message (other) */}
                <div className="space-y-2">
                  <Badge variant="outline" className="text-xs">Opponent Message</Badge>
                  <MessageBubble
                    message={{
                      id: 'example-2',
                      content: 'This is the opponent\'s response with different styling',
                      authorId: 'user-con',
                      timestamp: new Date(),
                      type: 'USER',
                      phase: 'DISCUSSION'
                    }}
                    isOwn={false}
                    participantInfo={MOCK_PARTICIPANTS['user-con']}
                    showTimestamp={true}
                  />
                </div>

                {/* AI Coaching message */}
                <div className="space-y-2">
                  <Badge variant="outline" className="text-xs">AI Coaching</Badge>
                  <MessageBubble
                    message={{
                      id: 'example-3',
                      content: 'Consider providing specific evidence to support your argument.',
                      authorId: 'ai-coach',
                      timestamp: new Date(),
                      type: 'AI_COACHING',
                      phase: 'DISCUSSION'
                    }}
                    isOwn={false}
                    showTimestamp={true}
                  />
                </div>
              </CardContent>
            </Card>

            {/* SystemMessage Examples */}
            <Card>
              <CardHeader>
                <CardTitle>SystemMessage Examples</CardTitle>
                <CardDescription>Different system message types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SystemMessage
                  message={SystemMessageTemplates.phaseChange('DISCUSSION', 30)}
                  showTimestamp={true}
                />
                <SystemMessage
                  message={SystemMessageTemplates.userJoined('New User')}
                  showTimestamp={true}
                  compact={true}
                />
                <SystemMessage
                  message={SystemMessageTemplates.warningMessage('Please keep responses respectful')}
                  showTimestamp={true}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
