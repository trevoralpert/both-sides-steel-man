'use client';

/**
 * Phase 6 Task 6.2.4: Presence & Typing Indicators Demo
 * 
 * Test page for demonstrating real-time presence management,
 * typing indicators, and activity status features
 */

import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ParticipantInfo } from '@/types/debate';
import { PresenceIndicator, TypingIndicator } from '@/components/debate-room/PresenceIndicator';
import { ActivityIndicator } from '@/components/debate-room/ActivityIndicator';
import { usePresence } from '@/lib/hooks/usePresence';
import { 
  User, 
  Users, 
  MessageSquare, 
  Wifi,
  WifiOff,
  Clock,
  RefreshCw
} from 'lucide-react';

// Mock participants for testing
const mockParticipants: ParticipantInfo[] = [
  {
    id: 'user-1',
    name: 'Alice Johnson',
    avatar: 'AJ',
    position: 'PRO',
    isOnline: true,
    isTyping: false,
    lastSeen: new Date(Date.now() - 30000) // 30 seconds ago
  },
  {
    id: 'user-2', 
    name: 'Bob Smith',
    avatar: 'BS',
    position: 'CON',
    isOnline: true,
    isTyping: false,
    lastSeen: new Date(Date.now() - 120000) // 2 minutes ago
  },
  {
    id: 'user-3',
    name: 'Carol Davis',
    avatar: 'CD', 
    position: 'PRO',
    isOnline: false,
    isTyping: false,
    lastSeen: new Date(Date.now() - 1800000) // 30 minutes ago
  }
];

export default function PresenceTypingDemo() {
  const [conversationId] = useState('demo-conversation-123');
  const [currentUserId, setCurrentUserId] = useState('user-1');
  const [participants, setParticipants] = useState<ParticipantInfo[]>(mockParticipants);
  const [typingText, setTypingText] = useState('');
  const [isTypingManually, setIsTypingManually] = useState(false);
  
  // Initialize presence hook
  const presence = usePresence({
    conversationId,
    participants,
    typingTimeoutMs: 3000,
    presenceHeartbeatMs: 5000
  });
  
  // Update participants with real presence data
  const participantsWithPresence = participants.map(participant => {
    const presenceData = presence.getParticipantPresence(participant.id);
    return {
      ...participant,
      isOnline: presenceData.isOnline,
      isTyping: presenceData.isTyping,
      lastSeen: presenceData.lastSeen || participant.lastSeen
    };
  });
  
  // Simulate typing
  const handleTypingChange = (value: string) => {
    setTypingText(value);
    
    if (value.trim() && !isTypingManually) {
      setIsTypingManually(true);
      presence.updateTyping(true);
    } else if (!value.trim() && isTypingManually) {
      setIsTypingManually(false);
      presence.updateTyping(false);
    }
  };
  
  // Manual typing toggle
  const toggleTyping = () => {
    const newTyping = !isTypingManually;
    setIsTypingManually(newTyping);
    presence.updateTyping(newTyping);
  };
  
  // Toggle online status
  const toggleOnlineStatus = () => {
    const currentUser = participantsWithPresence.find(p => p.id === currentUserId);
    if (currentUser) {
      presence.updatePresence(!currentUser.isOnline);
    }
  };
  
  // Switch current user
  const switchUser = (userId: string) => {
    if (currentUserId !== userId) {
      // Stop typing as current user
      presence.updateTyping(false);
      setIsTypingManually(false);
      
      // Switch to new user
      setCurrentUserId(userId);
    }
  };
  
  // Simulate other users typing
  const simulateOtherUserTyping = (userId: string) => {
    const participant = participants.find(p => p.id === userId);
    if (participant && userId !== currentUserId) {
      setParticipants(prev => 
        prev.map(p => 
          p.id === userId ? { ...p, isTyping: !p.isTyping } : p
        )
      );
    }
  };
  
  const currentUser = participantsWithPresence.find(p => p.id === currentUserId);
  const otherUsers = participantsWithPresence.filter(p => p.id !== currentUserId);
  const typingUsers = presence.getTypingUsers();
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Presence & Typing Indicators Demo</h1>
        <p className="text-muted-foreground">
          Test real-time presence management, typing indicators, and activity status features
        </p>
      </div>
      
      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="h-5 w-5" />
            <span>Connection Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Badge 
              variant={presence.isConnected ? "default" : "destructive"}
              className="flex items-center space-x-1"
            >
              {presence.isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span>{presence.isConnected ? 'Connected' : 'Disconnected'}</span>
            </Badge>
            
            <span className="text-sm text-muted-foreground">
              Conversation: {conversationId}
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Current User Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Current User: {currentUser?.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Switcher */}
            <div>
              <label className="text-sm font-medium mb-2 block">Switch User</label>
              <div className="flex gap-2">
                {participants.map(user => (
                  <Button
                    key={user.id}
                    variant={currentUserId === user.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => switchUser(user.id)}
                  >
                    {user.name}
                  </Button>
                ))}
              </div>
            </div>
            
            <Separator />
            
            {/* Presence Controls */}
            <div>
              <label className="text-sm font-medium mb-2 block">Presence Status</label>
              <div className="flex items-center space-x-4">
                <PresenceIndicator
                  status={currentUser?.isOnline ? 'online' : 'offline'}
                  lastSeen={currentUser?.lastSeen}
                  variant="badge"
                  showIcon={true}
                  showLabel={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleOnlineStatus}
                >
                  Toggle {currentUser?.isOnline ? 'Offline' : 'Online'}
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {/* Typing Controls */}
            <div>
              <label className="text-sm font-medium mb-2 block">Typing Simulation</label>
              <div className="space-y-2">
                <Input
                  value={typingText}
                  onChange={(e) => handleTypingChange(e.target.value)}
                  placeholder="Type here to trigger typing indicators..."
                  className="w-full"
                />
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={isTypingManually ? "default" : "outline"}
                    className="flex items-center space-x-1"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>{isTypingManually ? 'Typing...' : 'Not Typing'}</span>
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTyping}
                  >
                    Toggle Typing
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Typing Indicators Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Typing Indicators</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Live Typing Display */}
            <div>
              <label className="text-sm font-medium mb-2 block">Live Typing Status</label>
              <div className="min-h-[2rem] flex items-center">
                <TypingIndicator 
                  typingUsers={typingUsers}
                  maxShow={3}
                  className="text-sm"
                />
                {typingUsers.length === 0 && (
                  <span className="text-muted-foreground text-sm">No one is typing</span>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Simulate Other Users */}
            <div>
              <label className="text-sm font-medium mb-2 block">Simulate Other Users Typing</label>
              <div className="space-y-2">
                {otherUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between">
                    <span className="text-sm">{user.name}</span>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={user.isTyping ? "default" : "outline"}
                      >
                        {user.isTyping ? 'Typing' : 'Not Typing'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => simulateOtherUserTyping(user.id)}
                      >
                        Toggle
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Participants Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Participants Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participantsWithPresence.map(participant => (
              <Card key={participant.id} className={cn(
                "p-4",
                participant.id === currentUserId && "ring-2 ring-primary"
              )}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{participant.name}</h4>
                    <Badge variant={participant.position === 'PRO' ? 'default' : 'destructive'}>
                      {participant.position}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Status:</span>
                      <PresenceIndicator
                        status={participant.isOnline ? 'online' : 'offline'}
                        variant="badge"
                        size="xs"
                        showIcon={true}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>Typing:</span>
                      <Badge 
                        variant={participant.isTyping ? "default" : "outline"}
                      >
                        {participant.isTyping ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>Activity:</span>
                      <ActivityIndicator
                        lastSeen={participant.lastSeen}
                        isOnline={participant.isOnline}
                        variant="minimal"
                        size="xs"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Component Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>Component Variants</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Presence Indicator Variants */}
            <div>
              <h4 className="font-medium mb-3">Presence Indicator Variants</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Dot</p>
                  <PresenceIndicator status="online" variant="dot" />
                  <PresenceIndicator status="offline" variant="dot" lastSeen={new Date(Date.now() - 300000)} />
                  <PresenceIndicator status="typing" variant="dot" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Badge</p>
                  <PresenceIndicator status="online" variant="badge" showIcon={true} showLabel={true} />
                  <PresenceIndicator status="offline" variant="badge" showIcon={true} showLabel={true} />
                  <PresenceIndicator status="typing" variant="badge" showIcon={true} showLabel={true} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Tooltip</p>
                  <PresenceIndicator status="online" variant="full" showIcon={true} />
                  <PresenceIndicator status="offline" variant="full" showIcon={true} lastSeen={new Date(Date.now() - 1800000)} />
                  <PresenceIndicator status="typing" variant="full" showIcon={true} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Full</p>
                  <PresenceIndicator status="online" variant="full" showIcon={true} />
                  <PresenceIndicator status="offline" variant="full" showIcon={true} lastSeen={new Date(Date.now() - 3600000)} />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Activity Indicator Variants */}
            <div>
              <h4 className="font-medium mb-3">Activity Indicator Variants</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Minimal</p>
                  <ActivityIndicator isOnline={true} variant="minimal" />
                  <ActivityIndicator isOnline={false} lastSeen={new Date(Date.now() - 300000)} variant="minimal" />
                  <ActivityIndicator isOnline={false} lastSeen={new Date(Date.now() - 86400000)} variant="minimal" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Badge</p>
                  <ActivityIndicator isOnline={true} variant="badge" showDot={true} />
                  <ActivityIndicator isOnline={false} lastSeen={new Date(Date.now() - 1800000)} variant="badge" showIcon={true} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Tooltip</p>
                  <ActivityIndicator isOnline={false} lastSeen={new Date(Date.now() - 7200000)} variant="tooltip" showIcon={true} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Full</p>
                  <ActivityIndicator isOnline={false} lastSeen={new Date(Date.now() - 3600000)} variant="full" showIcon={true} showDot={true} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | undefined | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}
