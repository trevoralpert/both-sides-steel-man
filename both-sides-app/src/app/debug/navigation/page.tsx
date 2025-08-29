'use client';

/**
 * Phase 6 Task 6.1.5: Navigation Components Demo
 * 
 * Demo page for testing routing, breadcrumbs, URL state, and deep linking
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Breadcrumb,
  DebateBreadcrumb,
  NavigationLayout,
  DebateNavigationLayout,
  RouteGuard,
  useDebateUrlState,
  deepLinking
} from '@/components/navigation';
import { ArrowLeft, Copy, ExternalLink, MessageSquare, Settings, Share, Home, User, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NavigationDemo() {
  const router = useRouter();
  const [testUrl, setTestUrl] = useState('');
  const [deepLinkResult, setDeepLinkResult] = useState<any>(null);
  const [conversationId, setConversationId] = useState('demo-conversation-123');
  
  // Test URL state management
  const {
    phase,
    tab,
    messageId,
    setPhase,
    setTab,
    navigateToMessage,
    getShareableLink
  } = useDebateUrlState(conversationId);

  // Test deep link generation
  const generateTestLinks = () => {
    const links = {
      basic: deepLinking.generateDeepLink({ conversationId }),
      withPhase: deepLinking.generateDeepLink({ conversationId, phase: 'DISCUSSION' }),
      withMessage: deepLinking.generateDeepLink({ 
        conversationId, 
        messageId: 'msg-123', 
        timestamp: Date.now() 
      }),
      withTab: deepLinking.generateDeepLink({ conversationId, tab: 'coaching' }),
      complex: deepLinking.generateDeepLink({
        conversationId,
        phase: 'OPENING',
        tab: 'topic',
        messageId: 'msg-456',
        timestamp: Date.now()
      })
    };
    return links;
  };

  const testLinks = generateTestLinks();

  const handleDeepLinkTest = () => {
    if (!testUrl) return;
    
    const result = deepLinking.parseDeepLink(testUrl);
    setDeepLinkResult(result);
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      console.log('Link copied!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const navigateToUrl = (url: string) => {
    const urlObj = new URL(url);
    router.push(urlObj.pathname + urlObj.search);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Using NavigationLayout for demo */}
      <NavigationLayout
        title="Navigation Components Demo"
        subtitle="Task 6.1.5: Testing routing, breadcrumbs, URL state, and deep linking"
        description="Comprehensive testing environment for all navigation features implemented in Phase 6"
        badge={{ text: 'Development', variant: 'outline' }}
        backButton={{
          href: '/dashboard',
          label: 'Back to Dashboard'
        }}
        shareUrl={typeof window !== 'undefined' ? window.location.href : ''}
        shareTitle="Navigation Components Demo"
        primaryAction={{
          label: 'View Source',
          icon: ExternalLink,
          onClick: () => console.log('View source code'),
          variant: 'outline'
        }}
        secondaryActions={[
          {
            label: 'Reset Demo',
            onClick: () => window.location.reload(),
            icon: ArrowLeft
          },
          {
            label: 'Settings',
            onClick: () => console.log('Open settings'),
            icon: Settings
          }
        ]}
      >
        <div className="space-y-8">

          {/* Breadcrumb Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Breadcrumb Components</CardTitle>
              <CardDescription>Different breadcrumb configurations and styles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-3">
                <h4 className="font-medium">Auto-generated from current path:</h4>
                <div className="p-3 bg-muted rounded-md">
                  <Breadcrumb />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Debate-specific breadcrumb:</h4>
                <div className="p-3 bg-muted rounded-md">
                  <DebateBreadcrumb 
                    conversationId={conversationId}
                    topicTitle="Should AI be regulated by government?"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Custom breadcrumb with icons:</h4>
                <div className="p-3 bg-muted rounded-md">
                  <Breadcrumb
                    items={[
                      { label: 'Dashboard', href: '/dashboard', icon: Home },
                      { label: 'Profile', href: '/profile', icon: User },
                      { label: 'Surveys', href: '/survey', icon: BookOpen },
                      { label: 'Current Survey', isActive: true }
                    ]}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Small Size</h4>
                  <div className="p-2 bg-muted rounded-md">
                    <Breadcrumb size="sm" maxItems={3} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Default Size</h4>
                  <div className="p-2 bg-muted rounded-md">
                    <Breadcrumb size="default" maxItems={3} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Large Size</h4>
                  <div className="p-2 bg-muted rounded-md">
                    <Breadcrumb size="lg" maxItems={3} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* URL State Management */}
          <Card>
            <CardHeader>
              <CardTitle>URL State Management</CardTitle>
              <CardDescription>Testing useDebateUrlState hook and URL synchronization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Current State */}
                <div className="space-y-3">
                  <h4 className="font-medium">Current URL State:</h4>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    <div><strong>Phase:</strong> {phase || 'None'}</div>
                    <div><strong>Tab:</strong> {tab}</div>
                    <div><strong>Message ID:</strong> {messageId || 'None'}</div>
                  </div>
                </div>

                {/* Controls */}
                <div className="space-y-3">
                  <h4 className="font-medium">Test Controls:</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setPhase('PREPARATION')}>
                        Preparation
                      </Button>
                      <Button size="sm" onClick={() => setPhase('DISCUSSION')}>
                        Discussion
                      </Button>
                      <Button size="sm" onClick={() => setPhase('CLOSING')}>
                        Closing
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setTab('topic')}>
                        Topic Tab
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setTab('coaching')}>
                        Coaching Tab
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => navigateToMessage('msg-123')}>
                        Navigate to Message
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => copyLink(getShareableLink())}>
                        Copy Shareable Link
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deep Linking */}
          <Card>
            <CardHeader>
              <CardTitle>Deep Linking System</CardTitle>
              <CardDescription>Test deep link generation and parsing</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="generate" className="w-full">
                
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="generate">Generate Links</TabsTrigger>
                  <TabsTrigger value="parse">Parse Links</TabsTrigger>
                </TabsList>

                <TabsContent value="generate" className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Generated Deep Links:</h4>
                    
                    {Object.entries(testLinks).map(([type, url]) => (
                      <div key={type} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm capitalize">{type.replace(/([A-Z])/g, ' $1')}</div>
                          <div className="text-xs text-muted-foreground truncate">{url}</div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" variant="outline" onClick={() => copyLink(url)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="sm" onClick={() => navigateToUrl(url)}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="parse" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter URL to parse..."
                        value={testUrl}
                        onChange={(e) => setTestUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleDeepLinkTest}>Parse</Button>
                    </div>

                    {deepLinkResult && (
                      <div className="p-4 bg-muted rounded-md">
                        <h4 className="font-medium mb-2">Parse Result:</h4>
                        <div className="space-y-2 text-sm">
                          <div><strong>Valid:</strong> {deepLinkResult.isValid ? 'Yes' : 'No'}</div>
                          {deepLinkResult.error && (
                            <div className="text-red-600"><strong>Error:</strong> {deepLinkResult.error}</div>
                          )}
                          {deepLinkResult.config && (
                            <div className="mt-3">
                              <strong>Configuration:</strong>
                              <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto">
                                {JSON.stringify(deepLinkResult.config, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>

          {/* Route Guard Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Route Guard Demo</CardTitle>
              <CardDescription>Test route protection and access control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Public Route */}
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Public Route</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    No authentication required
                  </p>
                  <RouteGuard requireAuth={false}>
                    <div className="p-3 bg-green-50 text-green-800 rounded-md text-sm">
                      ✅ Access granted - No auth required
                    </div>
                  </RouteGuard>
                </Card>

                {/* Protected Route */}
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Protected Route</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Authentication required
                  </p>
                  <RouteGuard requireAuth={true}>
                    <div className="p-3 bg-green-50 text-green-800 rounded-md text-sm">
                      ✅ Access granted - User authenticated
                    </div>
                  </RouteGuard>
                </Card>

                {/* Debate Room Access */}
                <Card className="p-4 md:col-span-2">
                  <h4 className="font-medium mb-2">Debate Room Access</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Authentication + profile + debate participation required
                  </p>
                  <RouteGuard
                    requireAuth={true}
                    requireProfile={true}
                    debateAccess={{
                      conversationId: 'demo-conversation-123',
                      requireParticipant: true
                    }}
                  >
                    <div className="p-3 bg-green-50 text-green-800 rounded-md text-sm">
                      ✅ Access granted - All requirements met
                    </div>
                  </RouteGuard>
                </Card>
              </div>
            </CardContent>
          </Card>

        </div>
      </NavigationLayout>
    </div>
  );
}
