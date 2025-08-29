'use client';

/**
 * Phase 6 Task 6.1.1: Debate Room Layout & Navigation
 * 
 * Responsive debate room layout component with mobile optimization
 * and accessibility compliance (WCAG 2.1 AA)
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { DebateRoomLayoutProps } from '@/types/debate';
import { DebateHeader } from './DebateHeader';
import { DebateFooter } from './DebateFooter';
import { ResponsiveLayout } from './ResponsiveLayout';
import { TopicDisplay } from './TopicDisplay';
import { MessageContainer } from './MessageContainer';
import { SystemMessageTemplates } from './SystemMessage';
import { Message } from '@/types/debate';
import { Card } from '@/components/ui/card';
import { ErrorBoundary, DebateErrorFallback } from '@/components/error';
import { DebateRoomLoading, SkeletonDebateRoom } from '@/components/loading';
import { DebateNotFound } from '@/components/fallback';
import { useConversationConnection, ConnectionErrorAlert } from '@/components/connection';
import { useMessageInput } from '@/lib/hooks/useMessageInput';
import { TypingIndicator } from './PresenceIndicator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sidebar, MessageSquare, Users, Info, BookOpen, Target, Scale, HelpCircle, FileText, UserCheck } from 'lucide-react';
import { RulesPanel } from './RulesPanel';
import { BestPracticesTips } from './BestPracticesTips';
import { HelpTooltip, PhaseHelpTooltip, TimeHelpTooltip } from './HelpTooltips';
import { CoachingSidebar } from './CoachingSidebar';
import { CoachingToggle } from './CoachingToggle';
import { EvidencePanel } from './EvidencePanel';
import { FactCheck } from './FactCheck';
import { TurnManager } from './TurnManager';
import { useAICoaching } from '@/lib/hooks/useAICoaching';

interface DebateRoomContainerProps extends DebateRoomLayoutProps {
  children?: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function DebateRoomContainer({
  conversationId,
  matchId,
  userId,
  currentPhase,
  participants,
  topic,
  preparationMaterials,
  children,
  sidebar,
  className
}: DebateRoomContainerProps) {
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Enhanced message input management with real-time features
  const messageInput = useMessageInput({
    conversationId,
    userId,
    initialMessages: [],
    participantMap: Object.fromEntries(
      mockParticipants.map(p => [p.id, {
        name: p.name,
        avatar: p.avatar,
        position: p.position
      }])
    ),
    participants: mockParticipants,
    currentPhase,
    enableTypingIndicators: true
  });

  // Destructure message input functionality
  const { 
    messages, 
    isLoading, 
    error, 
    connection, 
    sendMessage,
    replyToMessage,
    setReplyToMessage,
    cancelReply,
    handleTypingStart,
    handleTypingStop,
    presence
  } = messageInput;

  // Handle message sending with enhanced features
  const handleSendMessage = async (content: string) => {
    await sendMessage(content, currentPhase);
  };

  const handleReplyToMessage = (messageId: string, content?: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      const participant = mockParticipants.find(p => p.id === message.authorId);
      setReplyToMessage({
        id: message.id,
        content: message.content,
        authorName: participant?.name || 'Unknown User'
      });
    }
  };

  // Toggle sidebar visibility
  const handleToggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  // Mock data for development - will be replaced with real data in subsequent tasks
  const mockTopic = topic || {
    id: 'mock-topic',
    title: 'Should schools require students to learn coding?',
    description: 'A debate about mandatory programming education in schools',
    category: 'Education',
    difficulty: 'INTERMEDIATE' as const,
    backgroundInfo: 'In an increasingly digital world, programming skills are becoming more valuable across many industries.'
  };

  const mockParticipants = participants.length > 0 ? participants : [
    {
      id: userId,
      name: 'You',
      position: 'PRO' as const,
      isOnline: true,
      isTyping: false
    },
    {
      id: 'opponent',
      name: 'Opponent',
      position: 'CON' as const,
      isOnline: true,
      isTyping: false
    }
  ];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => setError(undefined)}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "min-h-screen bg-background flex flex-col",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      role="main"
      aria-label="Debate Room"
    >
      {/* Header */}
      <DebateHeader 
        topic={mockTopic}
        participants={mockParticipants}
        currentPhase={currentPhase}
        timeRemaining={300000} // 5 minutes for demo
        connection={{
          isConnected: connection.isConnected,
          connectionState: connection.connectionState,
          latency: connection.latency,
          reconnect: connection.reconnect
        }}
        className="flex-none"
      />

      {/* Connection Error Alert */}
      <ConnectionErrorAlert
        connection={connection}
        onRetry={connection.reconnect}
        className="flex-none mx-4 mt-2"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ResponsiveLayout
          sidebar={sidebar}
          sidebarVisible={sidebarVisible}
          onToggleSidebar={handleToggleSidebar}
          className="flex-1"
        >
          {/* Message Area */}
          <div 
            className="flex-1 flex flex-col overflow-hidden"
            role="region" 
            aria-label="Debate Messages"
          >
            {/* Message Container */}
            <MessageContainer
              conversationId={conversationId}
              currentUserId={userId}
              participantMap={Object.fromEntries(
                mockParticipants.map(p => [p.id, {
                  name: p.name,
                  avatar: p.avatar,
                  position: p.position
                }])
              )}
              initialMessages={[]} // Using real-time messages from hook
              currentPhase={currentPhase}
              onMessageSent={(message) => {
                console.log('Message sent:', message);
              }}
              onMessageReceived={(message) => {
                console.log('Message received:', message);
              }}
              onReactionAdded={(messageId, emoji, userId) => {
                console.log('Reaction added:', messageId, emoji, userId);
              }}
              onReply={handleReplyToMessage}
            />
            
            {/* Typing Indicators */}
            <div className="px-4 py-2">
              <TypingIndicator 
                typingUsers={presence.getTypingUsers()}
                maxShow={2}
                className="text-sm"
              />
            </div>
          </div>
        </ResponsiveLayout>
      </div>

      {/* Footer */}
      <DebateFooter 
        onSendMessage={handleSendMessage}
        placeholder={`Share your ${mockParticipants.find(p => p.id === userId)?.position} perspective...`}
        connectionState={connection.connectionState}
        replyToMessage={replyToMessage}
        onCancelReply={cancelReply}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        enableAdvancedFeatures={true}
        className="flex-none"
      />
    </div>
  );
}

// Internal debate room component (wrapped by error boundary)
function DebateRoomLayoutInternal(props: DebateRoomLayoutProps) {
  const [activeTab, setActiveTab] = useState('topic');
  
  // Get user's position from participants
  const userParticipant = props.participants.find(p => p.id === props.userId);
  const userPosition = userParticipant?.position || 'PRO';

  // Mock current message state for demo (in real app, this comes from message input)
  const [currentMessage, setCurrentMessage] = useState('');
  
  // Enhanced AI Coaching integration with real-time features
  const aiCoaching = useAICoaching({
    conversationId: props.conversationId,
    userId: props.userId,
    currentPhase: props.currentPhase,
    recentMessages: [], // Will be connected to real messages from message input hook
    currentMessage, // Pass current typing for real-time analysis
    enabled: true,
    realTimeAnalysis: true, // Enable real-time typing analysis
    analysisDelay: 1000 // 1 second debounce for real-time analysis
  });

  const sidebar = (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <div className="p-4 border-b">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="topic" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              Topic
            </TabsTrigger>
            <TabsTrigger value="turns" className="text-xs">
              <UserCheck className="h-3 w-3 mr-1" />
              Turns
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">
              <Scale className="h-3 w-3 mr-1" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="coaching" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Coaching
            </TabsTrigger>
            <TabsTrigger value="evidence" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Evidence
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="topic" className="h-full p-4 mt-0">
          {props.topic ? (
            <TopicDisplay
              topic={props.topic}
              userPosition={userPosition}
              preparationMaterials={props.preparationMaterials}
              onAccessPreparation={() => {
                console.log('Opening preparation materials...');
                // TODO: Implement preparation materials modal in later tasks
              }}
            />
          ) : (
            <Card className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <Info className="h-8 w-8 mx-auto opacity-50" />
                <p className="text-sm">Topic information loading...</p>
              </div>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="turns" className="h-full mt-0">
          <div className="h-full overflow-y-auto p-4">
            <TurnManager
              currentPhase={props.currentPhase}
              participants={props.participants.map(p => ({
                id: p.id,
                name: p.name,
                position: p.position,
                avatar: p.avatar,
                isOnline: p.isOnline ?? true,
                hasSpoken: false // Will be managed by turn state
              }))}
              currentUserId={props.userId}
              isTeacher={false} // TODO: Connect to user role system
              turnState={undefined} // Will connect to backend in next task
              onTurnStateChange={(newState) => {
                console.log('Turn state changed:', newState);
                // TODO: Send to backend
              }}
              onTurnComplete={(speakerId, duration) => {
                console.log('Turn completed:', speakerId, duration);
                // TODO: Track turn completion
              }}
              onTurnSkip={(speakerId) => {
                console.log('Turn skipped:', speakerId);
                // TODO: Handle turn skip
              }}
              variant="compact"
              className="space-y-4"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="rules" className="h-full overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Phase Help Tooltip */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Debate Guidelines</h3>
              <PhaseHelpTooltip 
                phase={props.currentPhase} 
                variant="icon" 
                size="sm" 
              />
            </div>
            
            {/* Rules Panel */}
            <RulesPanel
              currentPhase={props.currentPhase}
              timeRemaining={undefined} // Will be connected to real timer in Task 6.3.1
              totalPhaseTime={undefined}
              messageCount={0} // Will be connected to real message count
              userMessageCount={0}
              hasViolations={false}
              onHelpRequest={(topic) => {
                console.log('Help requested for:', topic);
                // TODO: Implement help modal in future task
              }}
            />
            
            {/* Best Practices Tips */}
            <BestPracticesTips
              currentPhase={props.currentPhase}
              userPosition={userPosition}
              messageCount={0}
              onApplyTip={(tipId) => {
                console.log('Applying tip:', tipId);
                // TODO: Implement tip application in future task
              }}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="coaching" className="h-full mt-0">
          <div className="h-full">
            <CoachingSidebar
              conversationId={props.conversationId}
              userId={props.userId}
              currentPhase={props.currentPhase}
              currentMessage={currentMessage}
              recentMessages={[]} // Will connect to real messages
              isVisible={true}
              onToggle={() => {
                // Toggle handled by tab switching
                console.log('Coaching sidebar toggled');
              }}
            />
            
            {/* Demo: Mock message input for testing real-time features */}
            <div className="p-4 border-t">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type here to test real-time coaching suggestions..."
                className="w-full p-2 text-xs border rounded resize-none"
                rows={2}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{currentMessage.length} characters</span>
                {aiCoaching.isAnalyzingTyping && (
                  <span className="text-amber-600">Analyzing...</span>
                )}
                {aiCoaching.suggestionMetrics.hasRealTime && (
                  <span className="text-green-600">
                    {aiCoaching.suggestionMetrics.realTime} real-time tips
                  </span>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="evidence" className="h-full mt-0">
          <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Fact Check Section */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Real-time Fact Check</h3>
                <FactCheck 
                  messageContent={currentMessage}
                  realTimeEnabled={true}
                />
              </div>
              
              {/* Evidence Panel */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Research & Sources</h3>
                <EvidencePanel
                  topicId={props.topic?.id || 'demo-topic'}
                  currentPosition={userPosition}
                  messageContext={currentMessage}
                  currentPhase={props.currentPhase}
                  userId={props.userId}
                  onInsertEvidence={(evidence) => {
                    // TODO: Insert evidence into message
                    console.log('Insert evidence:', evidence);
                  }}
                  onInsertCitation={(citation) => {
                    // TODO: Insert citation into message
                    console.log('Insert citation:', citation);
                  }}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <DebateRoomContainer {...props} sidebar={sidebar} />
  );
}

// Main export with error boundary protection
export function DebateRoomLayout(props: DebateRoomLayoutProps) {
  return (
    <ErrorBoundary
      fallback={DebateErrorFallback}
      context="debate"
      level="page"
      onError={(error, errorInfo, errorId) => {
        console.error('DebateRoomLayout error:', { error, errorInfo, errorId });
        // In production, report to error tracking service
      }}
    >
      <DebateRoomLayoutInternal {...props} />
    </ErrorBoundary>
  );
}

export default DebateRoomLayout;
