'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { redirect, useRouter } from 'next/navigation';
import { ProfileDashboard } from '@/components/profiles';
import { Profile } from '@/types/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();


  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/sign-in');
  }

  const handleCreateProfile = () => {
    router.push('/profile');
  };

  const handleEditProfile = (profile: Profile) => {
    router.push(`/profiles/${profile.id}/edit`);
  };

  const handleViewProfile = (profile: Profile) => {
    router.push(`/profiles/${profile.id}`);
  };

  // Determine user role from Clerk metadata or default to STUDENT
  const userRole = (user.publicMetadata?.role as 'STUDENT' | 'TEACHER' | 'ADMIN') || 'STUDENT';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Both Sides Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}!
              </span>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-10 w-10"
                  }
                }}
                afterSignOutUrl="/"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">
          
          {/* Phase 6 Demo Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Debate Room (Phase 6)</span>
                </CardTitle>
                <CardDescription>
                  Test the new debate room layout and interface (Task 6.1.1)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/debate/demo-conversation-123?matchId=demo-match">
                    <span>Enter Demo Debate Room</span>
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Topic: "Should AI be regulated by government?"
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Profile System</CardTitle>
                <CardDescription>
                  Manage your belief profile and complete surveys
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/survey">Complete Survey</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/profile">View Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Component Testing</CardTitle>
                <CardDescription>
                  Test individual components and features (Phase 6 Tasks)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/debug/participant-status">
                      <span>Participant Status (6.1.2)</span>
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/debug/topic-display">
                      <span>Topic Display (6.1.3)</span>
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/debug/message-container">
                      <span>Message Container (6.1.4)</span>
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/debug/navigation">
                      <span>Navigation & Routing (6.1.5)</span>
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/debug/error-loading">
                      <span>Error & Loading States (6.1.6)</span>
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/debug/websocket-connection">
                      <span>WebSocket Connection (6.2.1)</span>
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/debug/realtime-messages">
                      <span>Real-time Messages (6.2.2)</span>
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/debug/message-input">
                      <span>Message Input & Sending (6.2.3)</span>
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Existing Profile Dashboard */}
          <ProfileDashboard
            userRole={userRole}
            currentUserId={user.id}
            onCreateProfile={handleCreateProfile}
            onEditProfile={handleEditProfile}
            onViewProfile={handleViewProfile}
          />
        </div>
      </main>
    </div>
  );
}
