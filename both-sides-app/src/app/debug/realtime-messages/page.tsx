'use client';

/**
 * Phase 6 Task 6.2.2: Real-time Message Display Demo
 * 
 * Comprehensive demo page for testing real-time message display,
 * optimistic UI updates, message actions, and reply functionality
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageContainer 
} from '@/components/debate-room';
import { 
  useRealtimeMessages 
} from '@/lib/hooks/useRealtimeMessages';
import { Message, DebatePhase, MessageReaction } from '@/types/debate';
import { 
  ArrowLeft, 
  Send, 
  MessageSquare, 
  Heart,
  ThumbsUp,
  Flag,
  Reply,
  Zap,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

export default function RealtimeMessagesDemo() {
  const [conversationId, setConversationId] = useState('demo-realtime-conversation');
  const [testMessage, setTestMessage] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [currentPhase, setCurrentPhase] = useState<DebatePhase>('DISCUSSION');

  // Mock participant data
  const participantMap = {
    'user-1': {
      name: 'Alice Cooper',
      avatar: undefined,
      position: 'PRO' as const
    },
    'user-2': {
      name: 'Bob Smith',  
      avatar: undefined,
      position: 'CON' as const
    },
    'current-user': {
      name: 'You',
      avatar: undefined,
      position: 'PRO' as const
    }
  };

  // Mock initial messages with various states and features
  const initialMessages: Message[] = [
    {
      id: 'msg-1',
      content: 'Welcome to the debate! This is a system message announcing the start of our discussion.',
      authorId: 'system',
      timestamp: new Date(Date.now() - 10 * 60000),
      type: 'SYSTEM',
      phase: 'PREPARATION',
      status: 'delivered'
    },
    {
      id: 'msg-2', 
      content: 'I believe **artificial intelligence regulation** is crucial for ensuring safe and ethical AI development. We need proper oversight to prevent harmful applications.',
      authorId: 'user-1',
      timestamp: new Date(Date.now() - 8 * 60000),
      type: 'USER',
      phase: 'OPENING',
      status: 'delivered',
      reactions: [
        { id: 'r1', emoji: '👍', userId: 'current-user', timestamp: new Date() },
        { id: 'r2', emoji: '🤔', userId: 'user-2', timestamp: new Date() }
      ]
    },
    {
      id: 'msg-3',
      content: 'While I understand your concern, I think excessive regulation could stifle innovation and put us at a competitive disadvantage. The tech industry is capable of self-regulation.',
      authorId: 'user-2',
      timestamp: new Date(Date.now() - 7 * 60000),
      type: 'USER',
      phase: 'OPENING',
      status: 'delivered'
    },
    {
      id: 'msg-4',
      content: 'That\'s a valid point about innovation. However, consider the **pharmaceutical industry** - FDA regulation hasn\'t stopped medical breakthroughs, it\'s ensured they\'re safe and effective.',
      authorId: 'current-user',
      timestamp: new Date(Date.now() - 5 * 60000),
      type: 'USER',
      phase: 'DISCUSSION',
      status: 'delivered',
      replyToMessageId: 'msg-3',
      replyToContent: 'I think excessive regulation could stifle innovation and put us at a competitive disadvantage.'
    },
    {
      id: 'msg-5',
      content: 'Consider exploring the balance between innovation incentives and safety requirements. Historical examples like environmental regulations show how thoughtful oversight can drive innovation rather than hinder it.',
      authorId: 'ai-coach',
      timestamp: new Date(Date.now() - 4 * 60000),
      type: 'AI_COACHING',
      phase: 'DISCUSSION',
      status: 'delivered'
    },
    {
      id: 'msg-6',
      content: 'The AI development landscape is fundamentally different from pharmaceuticals though. AI moves at internet speed, not clinical trial speed.',
      authorId: 'user-2',
      timestamp: new Date(Date.now() - 3 * 60000),
      type: 'USER',
      phase: 'DISCUSSION',
      status: 'delivered',
      reactions: [
        { id: 'r3', emoji: '❤️', userId: 'user-1', timestamp: new Date() }
      ]
    },
    {
      id: 'msg-7',
      content: 'This is a failed message example that shows retry functionality.',
      authorId: 'current-user',
      timestamp: new Date(Date.now() - 2 * 60000),
      type: 'USER',
      phase: 'DISCUSSION',
      status: 'failed'
    },
    {
      id: 'msg-8',
      content: 'This is an optimistic message that appears immediately when sent.',
      authorId: 'current-user',
      timestamp: new Date(Date.now() - 1 * 60000),
      type: 'USER',
      phase: 'DISCUSSION',
      status: 'sending',
      isOptimistic: true
    }
  ];

  // Real-time messages hook
  const realtimeMessages = useRealtimeMessages({
    conversationId,
    userId: 'current-user',
    initialMessages
  });

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    replyToMessage,
    reactToMessage,
    flagMessage,
    retryMessage,
    connection
  } = realtimeMessages;

  // Send test message
  const handleSendMessage = async () => {
    if (!testMessage.trim()) return;

    try {
      await sendMessage(testMessage, currentPhase);
      setTestMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Send reply message
  const handleSendReply = async () => {
    if (!selectedMessageId || !replyContent.trim()) return;

    try {
      const originalMessage = messages.find(m => m.id === selectedMessageId);
      await replyToMessage(selectedMessageId, replyContent, originalMessage?.content);
      setReplyContent('');
      setSelectedMessageId('');
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  };

  // Handle message reactions
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await reactToMessage(messageId, emoji);
    } catch (err) {
      console.error('Failed to react to message:', err);
    }
  };

  // Handle message flagging
  const handleFlag = async (messageId: string) => {
    try {
      await flagMessage(messageId, 'Inappropriate content');
      alert('Message has been flagged for review.');
    } catch (err) {
      console.error('Failed to flag message:', err);
    }
  };

  // Handle message retry
  const handleRetry = async (messageId: string) => {
    try {
      await retryMessage(messageId);
    } catch (err) {
      console.error('Failed to retry message:', err);
    }
  };

  // Add some test messages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every interval
        const responses = [
          'That raises an interesting point about implementation.',
          'I can see merit in both approaches we\'ve discussed.',
          'Have we considered the international perspective on this issue?',
          'The data seems to support a more nuanced view.',
          'What about the long-term implications of this policy?'
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const randomUser = Math.random() > 0.5 ? 'user-1' : 'user-2';
        
        // Simulate receiving a message
        // In real implementation, this would come via WebSocket
        console.log('Simulated message from', randomUser, ':', randomResponse);
      }
    }, 15000); // Every 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Real-time Message Display Demo</h1>
            <p className="text-muted-foreground">Task 6.2.2: Testing message display, optimistic UI, reactions, and replies</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Message Display - Main Column */}
          <div className="lg:col-span-2 space-y-4">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Real-time Message Display</span>
                </CardTitle>
                <CardDescription>
                  Live message container with all real-time features enabled
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-96 border-t">
                  <MessageContainer
                    conversationId={conversationId}
                    currentUserId="current-user"
                    participantMap={participantMap}
                    initialMessages={[]} // Let hook manage messages
                    currentPhase={currentPhase}
                    onMessageSent={(message) => {
                      console.log('Message sent:', message);
                    }}
                    onMessageReceived={(message) => {
                      console.log('Message received:', message);
                    }}
                    onReactionAdded={(messageId, emoji, userId) => {
                      console.log('Reaction added:', { messageId, emoji, userId });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Message Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Message Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{messages.length}</div>
                    <div className="text-xs text-muted-foreground">Total Messages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {messages.filter(m => m.status === 'sending' || m.isOptimistic).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Optimistic</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {messages.filter(m => m.status === 'failed').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {messages.reduce((acc, m) => acc + (m.reactions?.length || 0), 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Reactions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls - Side Column */}
          <div className="space-y-4">
            
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Connection</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status:</span>
                  <Badge variant={connection.isConnected ? 'default' : 'destructive'}>
                    {connection.connectionState}
                  </Badge>
                </div>
                {connection.latency && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Latency:</span>
                    <span className="text-sm font-mono">{Math.round(connection.latency)}ms</span>
                  </div>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Message Sending */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Send Message</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="phase">Phase</Label>
                  <select
                    value={currentPhase}
                    onChange={(e) => setCurrentPhase(e.target.value as DebatePhase)}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="PREPARATION">Preparation</option>
                    <option value="OPENING">Opening</option>
                    <option value="DISCUSSION">Discussion</option>
                    <option value="REBUTTAL">Rebuttal</option>
                    <option value="CLOSING">Closing</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="message">Message Content</Label>
                  <Textarea
                    id="message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter your message... (supports **bold** and *italic*)"
                    rows={3}
                    className="mt-1"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {testMessage.length}/2000 characters
                  </div>
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!connection.isConnected || !testMessage.trim() || isLoading}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? 'Sending...' : 'Send Message'}
                </Button>
              </CardContent>
            </Card>

            {/* Reply System */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Reply className="h-4 w-4" />
                  <span>Reply to Message</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="messageId">Message ID</Label>
                  <select
                    value={selectedMessageId}
                    onChange={(e) => setSelectedMessageId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">Select a message to reply to...</option>
                    {messages
                      .filter(m => m.type === 'USER' && m.authorId !== 'current-user')
                      .map(message => (
                        <option key={message.id} value={message.id}>
                          {message.content.substring(0, 50)}...
                        </option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <Label htmlFor="reply">Reply Content</Label>
                  <Textarea
                    id="reply"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write your reply..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleSendReply}
                  disabled={!selectedMessageId || !replyContent.trim() || !connection.isConnected}
                  size="sm"
                  className="w-full"
                >
                  Send Reply
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Quick reactions */}
                <div className="space-y-2">
                  <Label className="text-sm">React to Last Message:</Label>
                  <div className="flex space-x-2">
                    {['👍', '❤️', '🤔', '😮'].map(emoji => (
                      <Button
                        key={emoji}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const lastMessage = messages
                            .filter(m => m.type === 'USER' && m.authorId !== 'current-user')
                            .pop();
                          if (lastMessage) {
                            handleReaction(lastMessage.id, emoji);
                          }
                        }}
                        disabled={!connection.isConnected}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* System actions */}
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const failedMessage = messages.find(m => m.status === 'failed');
                      if (failedMessage) {
                        handleRetry(failedMessage.id);
                      }
                    }}
                    disabled={!messages.some(m => m.status === 'failed')}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Retry Failed Messages
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="w-full"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Reset Demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Demonstration */}
        <Card>
          <CardHeader>
            <CardTitle>Real-time Features Demonstrated</CardTitle>
            <CardDescription>All Phase 6.2.2 functionality is active in this demo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <h4 className="font-medium text-sm">Optimistic UI</h4>
                <p className="text-xs text-muted-foreground">Messages appear instantly</p>
              </div>

              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Heart className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <h4 className="font-medium text-sm">Message Reactions</h4>
                <p className="text-xs text-muted-foreground">Emoji reactions with counts</p>
              </div>

              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Reply className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <h4 className="font-medium text-sm">Reply Quoting</h4>
                <p className="text-xs text-muted-foreground">Quote original content</p>
              </div>

              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Flag className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <h4 className="font-medium text-sm">Message Actions</h4>
                <p className="text-xs text-muted-foreground">Reply, react, flag, retry</p>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
