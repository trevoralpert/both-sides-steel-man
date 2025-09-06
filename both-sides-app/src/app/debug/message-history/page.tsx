'use client';

/**
 * Phase 6 Task 6.2.5: Message History & Pagination Demo
 * 
 * Test page for demonstrating message history, pagination, 
 * search functionality, and jump-to-message features
 */

import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { EnhancedMessageContainer } from '@/components/debate-room/EnhancedMessageContainer';
import { MessageContainer } from '@/components/debate-room/MessageContainer';
import { Message, DebatePhase, ParticipantInfo } from '@/types/debate';
import { 
  MessageSquare, 
  Search, 
  Navigation,
  Clock,
  Users,
  Hash,
  RefreshCw,
  Zap
} from 'lucide-react';

// Generate mock messages for testing
const generateMockMessages = (count: number): Message[] => {
  const phases: DebatePhase[] = ['OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING'];
  const participants = ['user-1', 'user-2'];
  const topics = [
    'I think renewable energy is essential for our future.',
    'Economic considerations are more important than environmental ones.',
    'Technology can solve most environmental problems.',
    'Government regulation is necessary for climate action.',
    'Individual actions make a real difference.',
    'Corporate responsibility is key to sustainability.',
    'Nuclear power should be part of the energy mix.',
    'Electric vehicles are the future of transportation.',
    'Carbon taxes are an effective policy tool.',
    'International cooperation is crucial for climate goals.'
  ];
  
  const messages: Message[] = [];
  const baseTime = new Date(Date.now() - (count * 60000)); // Start count minutes ago
  
  for (let i = 0; i < count; i++) {
    const authorId = participants[i % 2];
    const phase = phases[Math.floor(i / (count / phases.length)) % phases.length];
    const content = topics[i % topics.length] + ` (Message ${i + 1})`;
    
    messages.push({
      id: `message-${i + 1}`,
      content: content,
      authorId,
      timestamp: new Date(baseTime.getTime() + (i * 60000)), // 1 minute apart
      type: 'USER',
      phase,
      status: 'delivered'
    });
  }
  
  // Add some system messages
  messages.splice(10, 0, {
    id: 'system-1',
    content: 'Debate phase changed to DISCUSSION',
    authorId: 'system',
    timestamp: new Date(baseTime.getTime() + (10 * 60000)),
    type: 'SYSTEM',
    phase: 'DISCUSSION'
  });
  
  messages.splice(25, 0, {
    id: 'system-2',
    content: 'Debate phase changed to REBUTTAL',
    authorId: 'system',
    timestamp: new Date(baseTime.getTime() + (25 * 60000)),
    type: 'SYSTEM',
    phase: 'REBUTTAL'
  });
  
  return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

// Mock participant data
const mockParticipants: ParticipantInfo[] = [
  {
    id: 'user-1',
    name: 'Alice Johnson',
    avatar: 'AJ',
    position: 'PRO',
    isOnline: true,
    isTyping: false
  },
  {
    id: 'user-2',
    name: 'Bob Smith', 
    avatar: 'BS',
    position: 'CON',
    isOnline: true,
    isTyping: false
  }
];

const participantMap = Object.fromEntries(
  mockParticipants.map(p => [p.id, {
    name: p.name,
    avatar: p.avatar,
    position: p.position
  }])
);

export default function MessageHistoryDemo() {
  const [messageCount, setMessageCount] = useState(100);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId] = useState('demo-conversation-history');
  const [currentUserId] = useState('user-1');
  const [highlightMessageId, setHighlightMessageId] = useState<string>();
  const [activeTab, setActiveTab] = useState('enhanced');
  const [stats, setStats] = useState({
    totalMessages: 0,
    searchableMessages: 0,
    phases: [] as string[]
  });
  
  // Generate messages when count changes
  useEffect(() => {
    const newMessages = generateMockMessages(messageCount);
    setMessages(newMessages);
    
    setStats({
      totalMessages: newMessages.length,
      searchableMessages: newMessages.filter(m => m.type === 'USER').length,
      phases: [...new Set(newMessages.map(m => m.phase))]
    });
  }, [messageCount]);
  
  // Demo actions
  const handleJumpToRandomMessage = () => {
    if (messages.length > 0) {
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setHighlightMessageId(randomMessage.id);
      
      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightMessageId(undefined);
      }, 3000);
    }
  };
  
  const handleJumpToFirstMessage = () => {
    if (messages.length > 0) {
      setHighlightMessageId(messages[0].id);
      setTimeout(() => setHighlightMessageId(undefined), 3000);
    }
  };
  
  const handleJumpToLastMessage = () => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      setHighlightMessageId(lastMessage.id);
      setTimeout(() => setHighlightMessageId(undefined), 3000);
    }
  };
  
  const messageCountOptions = [50, 100, 250, 500, 1000, 2000];
  
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Message History & Pagination Demo</h1>
            <p className="text-muted-foreground mt-1">
              Test infinite scroll, search, and jump-to-message functionality
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Messages:</label>
              <select
                value={messageCount}
                onChange={(e) => setMessageCount(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {messageCountOptions.map(count => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleJumpToFirstMessage}>
                First
              </Button>
              <Button variant="outline" size="sm" onClick={handleJumpToRandomMessage}>
                <Zap className="h-3 w-3 mr-1" />
                Random
              </Button>
              <Button variant="outline" size="sm" onClick={handleJumpToLastMessage}>
                Last
              </Button>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center space-x-6 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <MessageSquare className="h-4 w-4" />
            <span>{stats.totalMessages} messages</span>
          </div>
          <div className="flex items-center space-x-1">
            <Search className="h-4 w-4" />
            <span>{stats.searchableMessages} searchable</span>
          </div>
          <div className="flex items-center space-x-1">
            <Hash className="h-4 w-4" />
            <span>{stats.phases.length} phases</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{mockParticipants.length} participants</span>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          
          {/* Tab Headers */}
          <div className="flex-none border-b px-6 pt-4">
            <TabsList>
              <TabsTrigger value="enhanced" className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>Enhanced Container</span>
              </TabsTrigger>
              <TabsTrigger value="original" className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Original Container</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            
            {/* Enhanced Message Container */}
            <TabsContent value="enhanced" className="h-full mt-0">
              <div className="h-full p-6">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Search className="h-5 w-5" />
                        <span>Enhanced Message Container</span>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">Search Enabled</Badge>
                        <Badge variant="default">Jump Navigation</Badge>
                        <Badge variant="secondary">Infinite Scroll</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Features message search, jump-to-message navigation, and enhanced infinite scrolling
                    </p>
                  </CardHeader>
                  <CardContent className="p-0 h-full">
                    <div className="h-[calc(100vh-16rem)]">
                      <EnhancedMessageContainer
                        conversationId={conversationId}
                        currentUserId={currentUserId}
                        participantMap={participantMap}
                        currentPhase="DISCUSSION"
                        enableSearch={true}
                        enableJumpToMessage={true}
                        enableInfiniteScroll={true}
                        highlightMessageId={highlightMessageId}
                        pageSize={50}
                        searchDebounceMs={300}
                        onMessageSent={(message: Message) => {
                          console.log('Message sent:', message);
                        }}
                        onMessageReceived={(message: Message) => {
                          console.log('Message received:', message);
                        }}
                        onReply={(messageId: string, content?: string) => {
                          console.log('Reply to:', messageId, content);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Original Message Container */}
            <TabsContent value="original" className="h-full mt-0">
              <div className="h-full p-6">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <MessageSquare className="h-5 w-5" />
                        <span>Original Message Container</span>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Basic Functionality</Badge>
                        <Badge variant="secondary">Virtual Scrolling</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Original message container with basic virtual scrolling and real-time updates
                    </p>
                  </CardHeader>
                  <CardContent className="p-0 h-full">
                    <div className="h-[calc(100vh-16rem)]">
                      <MessageContainer
                        conversationId={conversationId}
                        currentUserId={currentUserId}
                        participantMap={participantMap}
                        initialMessages={messages}
                        currentPhase="DISCUSSION"
                        onMessageSent={(message: Message) => {
                          console.log('Message sent:', message);
                        }}
                        onMessageReceived={(message: Message) => {
                          console.log('Message received:', message);
                        }}
                        onReply={(messageId: string, content?: string) => {
                          console.log('Reply to:', messageId, content);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
          </div>
        </Tabs>
      </div>
    </div>
  );
}
