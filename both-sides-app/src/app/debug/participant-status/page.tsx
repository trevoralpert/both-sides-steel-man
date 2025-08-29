'use client';

/**
 * Phase 6 Task 6.1.2: Participant Status Components Demo
 * 
 * Demo page for testing all the participant status components
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ParticipantAvatar, 
  PresenceIndicator,
  TypingIndicator,
  PositionBadge,
  PositionSelector,
  PositionComparison,
  ParticipantList,
  ParticipantOverview
} from '@/components/debate-room';
import { ParticipantInfo, DebatePosition } from '@/types/debate';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const MOCK_PARTICIPANTS: ParticipantInfo[] = [
  {
    id: 'user1',
    name: 'Alex Chen',
    position: 'PRO',
    isOnline: true,
    isTyping: false,
    lastSeen: new Date()
  },
  {
    id: 'user2', 
    name: 'Maria Rodriguez',
    position: 'CON',
    isOnline: true,
    isTyping: false,
    lastSeen: new Date()
  },
  {
    id: 'user3',
    name: 'David Park',
    position: 'PRO',
    isOnline: false,
    isTyping: false,
    lastSeen: new Date(Date.now() - 300000) // 5 minutes ago
  },
  {
    id: 'user4',
    name: 'Sarah Johnson',
    position: 'CON',
    isOnline: true,
    isTyping: false,
    lastSeen: new Date()
  }
];

export default function ParticipantStatusDemo() {
  const [participants, setParticipants] = useState(MOCK_PARTICIPANTS);
  const [selectedPosition, setSelectedPosition] = useState<DebatePosition>('PRO');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Simulate typing behavior
  useEffect(() => {
    const interval = setInterval(() => {
      setParticipants(prev => prev.map(p => ({
        ...p,
        isTyping: Math.random() > 0.8 // 20% chance of typing
      })));

      // Update typing users list
      setTypingUsers(participants.filter(p => p.isTyping).map(p => p.name));
    }, 3000);

    return () => clearInterval(interval);
  }, [participants]);

  const toggleUserOnline = (userId: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === userId 
        ? { ...p, isOnline: !p.isOnline, lastSeen: new Date() }
        : p
    ));
  };

  const toggleUserTyping = (userId: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === userId 
        ? { ...p, isTyping: !p.isTyping }
        : p
    ));
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
          <div>
            <h1 className="text-2xl font-bold">Participant Status Components Demo</h1>
            <p className="text-muted-foreground">Task 6.1.2: Testing all participant status indicators</p>
          </div>
        </div>

        {/* ParticipantAvatar Demo */}
        <Card>
          <CardHeader>
            <CardTitle>ParticipantAvatar Component</CardTitle>
            <CardDescription>Avatar with presence indicators in different sizes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Different sizes */}
            <div className="space-y-4">
              <h4 className="font-medium">Sizes</h4>
              <div className="flex items-center space-x-4">
                {['xs', 'sm', 'md', 'lg', 'xl'].map(size => (
                  <div key={size} className="text-center space-y-2">
                    <ParticipantAvatar 
                      participant={participants[0]}
                      size={size as any}
                      showName={size === 'lg'}
                    />
                    <p className="text-xs text-muted-foreground">{size}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Interactive toggles */}
            <div className="space-y-4">
              <h4 className="font-medium">Interactive Controls</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {participants.map(participant => (
                  <div key={participant.id} className="space-y-3">
                    <ParticipantAvatar 
                      participant={participant}
                      size="lg"
                      showName={true}
                    />
                    <div className="space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserOnline(participant.id)}
                        className="w-full text-xs"
                      >
                        {participant.isOnline ? 'Go Offline' : 'Go Online'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserTyping(participant.id)}
                        className="w-full text-xs"
                      >
                        {participant.isTyping ? 'Stop Typing' : 'Start Typing'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PresenceIndicator Demo */}
        <Card>
          <CardHeader>
            <CardTitle>PresenceIndicator Component</CardTitle>
            <CardDescription>Different presence states and variants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-4">
              <h4 className="font-medium">Variants</h4>
              <div className="grid grid-cols-3 gap-6">
                
                {/* Dot variant */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium">Dot Variant</h5>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <PresenceIndicator status="online" variant="dot" />
                      <span className="text-sm">Online</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <PresenceIndicator status="offline" variant="dot" />
                      <span className="text-sm">Offline</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <PresenceIndicator status="typing" variant="dot" />
                      <span className="text-sm">Typing</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <PresenceIndicator status="away" variant="dot" />
                      <span className="text-sm">Away</span>
                    </div>
                  </div>
                </div>

                {/* Badge variant */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium">Badge Variant</h5>
                  <div className="space-y-2">
                    <PresenceIndicator status="online" variant="badge" showLabel={true} showIcon={true} />
                    <PresenceIndicator status="offline" variant="badge" showLabel={true} showIcon={true} />
                    <PresenceIndicator status="typing" variant="badge" showLabel={true} showIcon={true} />
                    <PresenceIndicator status="away" variant="badge" showLabel={true} showIcon={true} />
                  </div>
                </div>

                {/* Full variant */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium">Full Variant</h5>
                  <div className="space-y-2">
                    <PresenceIndicator status="online" variant="full" />
                    <PresenceIndicator status="offline" variant="full" lastSeen={new Date(Date.now() - 120000)} />
                    <PresenceIndicator status="typing" variant="full" />
                    <PresenceIndicator status="connecting" variant="full" />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Typing Indicator */}
            <div className="space-y-3">
              <h4 className="font-medium">Typing Indicator</h4>
              <TypingIndicator 
                typingUsers={participants.filter(p => p.isTyping).map(p => p.name)}
              />
            </div>
          </CardContent>
        </Card>

        {/* PositionBadge Demo */}
        <Card>
          <CardHeader>
            <CardTitle>PositionBadge Component</CardTitle>
            <CardDescription>Pro/Con position indicators with different variants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-4">
              <h4 className="font-medium">Variants & Sizes</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                
                {['default', 'outline', 'subtle', 'solid'].map(variant => (
                  <div key={variant} className="space-y-3">
                    <h5 className="text-sm font-medium capitalize">{variant}</h5>
                    <div className="space-y-2">
                      <PositionBadge position="PRO" variant={variant as any} showIcon={true} />
                      <PositionBadge position="CON" variant={variant as any} showIcon={true} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Position Selector</h4>
              <PositionSelector
                selectedPosition={selectedPosition}
                onPositionChange={setSelectedPosition}
                showIcons={true}
              />
              <p className="text-sm text-muted-foreground">
                Selected: {selectedPosition}
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Position Comparison</h4>
              <PositionComparison
                proCount={participants.filter(p => p.position === 'PRO').length}
                conCount={participants.filter(p => p.position === 'CON').length}
                showCounts={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* ParticipantList Demo */}
        <Card>
          <CardHeader>
            <CardTitle>ParticipantList Component</CardTitle>
            <CardDescription>Different layouts for participant lists</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-4">
              <h4 className="font-medium">Horizontal Layout</h4>
              <ParticipantList
                participants={participants}
                currentUserId="user1"
                layout="horizontal"
                interactive={true}
                onParticipantClick={(p) => console.log('Clicked:', p.name)}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Grid Layout</h4>
              <ParticipantList
                participants={participants}
                currentUserId="user1"
                layout="grid"
                interactive={true}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Participant Overview (Header)</h4>
              <ParticipantOverview
                participants={participants}
                currentUserId="user1"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
