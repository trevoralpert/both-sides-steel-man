'use client';

/**
 * Phase 6 Task 6.1.6: Error Boundaries & Loading States Demo
 * 
 * Comprehensive demo page for testing error boundaries, loading states,
 * skeleton loaders, and fallback UI components
 */

import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ErrorBoundary,
  DefaultErrorFallback,
  DebateErrorFallback,
  MessageErrorFallback,
  withErrorBoundary
} from '@/components/error';
import {
  LoadingState,
  DebateRoomLoading,
  MessageLoading,
  ProfileLoading,
  AuthLoading,
  InlineLoading,
  LoadingOverlay,
  SkeletonMessageContainer,
  SkeletonDebateRoom,
  SkeletonProfile,
  SkeletonTopicDisplay,
  SkeletonParticipantList
} from '@/components/loading';
import {
  FallbackUI,
  EmptyMessages,
  EmptyParticipants,
  NetworkOffline,
  DebateNotFound,
  AccessDenied,
  ComingSoon,
  InlineFallback,
  AlertFallback
} from '@/components/fallback';
import { ArrowLeft, Zap, AlertTriangle, Wifi, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';

// Test components that intentionally throw errors
function ErrorThrowingComponent({ errorType }: { errorType: string }) {
  const throwError = () => {
    switch (errorType) {
      case 'runtime':
        throw new Error('This is a runtime error for testing');
      case 'network':
        throw new Error('Network connection failed');
      case 'auth':
        throw new Error('Unauthorized access token expired');
      case 'permission':
        throw new Error('Permission denied - access forbidden');
      case 'chunk':
        throw new Error('Chunk loading failed');
      case 'validation':
        throw new Error('Validation failed - invalid data provided');
      default:
        throw new Error('Unknown error occurred');
    }
  };

  React.useEffect(() => {
    // Throw error after component mounts
    const timer = setTimeout(throwError, 100);
    return () => clearTimeout(timer);
  }, [errorType]);

  return <div>Loading component...</div>;
}

// Wrapped error-throwing component for testing
const ProtectedErrorComponent = withErrorBoundary(ErrorThrowingComponent, {
  context: 'general',
  level: 'component'
});

export default function ErrorLoadingDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'debate' | 'message' | 'profile' | 'auth'>('debate');
  const [selectedErrorType, setSelectedErrorType] = useState<string>('runtime');
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulate loading with progress
  const simulateLoading = () => {
    setIsLoading(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsLoading(false);
          return 0;
        }
        return prev + 10;
      });
    }, 300);
  };

  // Simulate overlay loading
  const simulateOverlay = () => {
    setShowOverlay(true);
    setTimeout(() => setShowOverlay(false), 3000);
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
            <h1 className="text-2xl font-bold">Error Boundaries & Loading States Demo</h1>
            <p className="text-muted-foreground">Task 6.1.6: Testing error handling, loading states, and fallback UIs</p>
          </div>
        </div>

        <Tabs defaultValue="error-boundaries" className="w-full">
          
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="error-boundaries">Error Boundaries</TabsTrigger>
            <TabsTrigger value="loading-states">Loading States</TabsTrigger>
            <TabsTrigger value="skeleton-loaders">Skeleton Loaders</TabsTrigger>
            <TabsTrigger value="fallback-ui">Fallback UI</TabsTrigger>
          </TabsList>

          {/* Error Boundaries Tab */}
          <TabsContent value="error-boundaries" className="space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Error Boundary Testing</CardTitle>
                <CardDescription>Test different error types and boundary behaviors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Error Type Selector */}
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium">Error Type:</label>
                  <select
                    value={selectedErrorType}
                    onChange={(e) => setSelectedErrorType(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="runtime">Runtime Error</option>
                    <option value="network">Network Error</option>
                    <option value="auth">Authentication Error</option>
                    <option value="permission">Permission Error</option>
                    <option value="chunk">Chunk Loading Error</option>
                    <option value="validation">Validation Error</option>
                  </select>
                </div>

                <Separator />

                {/* Error Boundary Examples */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Default Error Boundary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ErrorBoundary
                        fallback={DefaultErrorFallback}
                        context="general"
                        level="component"
                        key={selectedErrorType + '-default'}
                      >
                        <ErrorThrowingComponent errorType={selectedErrorType} />
                      </ErrorBoundary>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Debate Error Boundary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ErrorBoundary
                        fallback={DebateErrorFallback}
                        context="debate"
                        level="component"
                        key={selectedErrorType + '-debate'}
                      >
                        <ErrorThrowingComponent errorType={selectedErrorType} />
                      </ErrorBoundary>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Message Error Boundary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ErrorBoundary
                        fallback={MessageErrorFallback}
                        context="message"
                        level="component"
                        key={selectedErrorType + '-message'}
                      >
                        <ErrorThrowingComponent errorType={selectedErrorType} />
                      </ErrorBoundary>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* HOC Example */}
                <div>
                  <h4 className="font-medium mb-2">Higher-Order Component (withErrorBoundary)</h4>
                  <Card className="p-4">
                    <ProtectedErrorComponent 
                      errorType={selectedErrorType}
                      key={selectedErrorType + '-hoc'}
                    />
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loading States Tab */}
          <TabsContent value="loading-states" className="space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Loading State Variants</CardTitle>
                <CardDescription>Different loading indicators and their use cases</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Controls */}
                <div className="flex items-center space-x-4">
                  <Button onClick={simulateLoading}>Start Loading Simulation</Button>
                  <Button onClick={simulateOverlay} variant="outline">Test Overlay</Button>
                  <Badge variant="secondary">Progress: {progress}%</Badge>
                </div>

                <Separator />

                {/* Loading Variants */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Spinner Loading</CardTitle>
                    </CardHeader>
                    <CardContent className="h-32 flex items-center justify-center">
                      <LoadingState variant="spinner" context="general" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Dots Loading</CardTitle>
                    </CardHeader>
                    <CardContent className="h-32 flex items-center justify-center">
                      <LoadingState variant="dots" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Bars Loading</CardTitle>
                    </CardHeader>
                    <CardContent className="h-32 flex items-center justify-center">
                      <LoadingState variant="bars" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Pulse Loading</CardTitle>
                    </CardHeader>
                    <CardContent className="h-32 flex items-center justify-center">
                      <LoadingState variant="pulse" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Progress Loading</CardTitle>
                    </CardHeader>
                    <CardContent className="h-32 flex items-center justify-center">
                      <LoadingState 
                        variant="progress" 
                        progress={progress}
                        message="Loading content..."
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Context-Aware Loading</CardTitle>
                    </CardHeader>
                    <CardContent className="h-32 flex items-center justify-center">
                      <LoadingState context={loadingType} />
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Specialized Loading Components */}
                <div className="space-y-4">
                  <h4 className="font-medium">Specialized Loading Components</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Message Loading</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MessageLoading />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Profile Loading</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ProfileLoading />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* Overlay Example */}
                <div className="space-y-4">
                  <h4 className="font-medium">Loading Overlay</h4>
                  <LoadingOverlay isLoading={showOverlay}>
                    <Card className="p-8">
                      <div className="text-center space-y-4">
                        <h3 className="text-lg font-semibold">Sample Content</h3>
                        <p className="text-muted-foreground">
                          This content will be overlaid with a loading indicator when the overlay is active.
                        </p>
                        <Button onClick={simulateOverlay}>
                          Trigger Overlay Loading
                        </Button>
                      </div>
                    </Card>
                  </LoadingOverlay>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skeleton Loaders Tab */}
          <TabsContent value="skeleton-loaders" className="space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Skeleton Loading Placeholders</CardTitle>
                <CardDescription>Content-aware skeleton loaders for better perceived performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Message Container Skeleton</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-hidden border rounded-md">
                        <SkeletonMessageContainer messageCount={4} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Topic Display Skeleton</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SkeletonTopicDisplay />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Participant List Skeleton</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SkeletonParticipantList count={4} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Profile Skeleton</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-hidden">
                        <SkeletonProfile />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-4">Complete Debate Room Skeleton</h4>
                  <Card className="p-4">
                    <div className="h-96 overflow-hidden border rounded-md">
                      <SkeletonDebateRoom />
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fallback UI Tab */}
          <TabsContent value="fallback-ui" className="space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Fallback UI Components</CardTitle>
                <CardDescription>Empty states, error states, and other fallback scenarios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Empty States */}
                <div className="space-y-4">
                  <h4 className="font-medium">Empty States</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Empty Messages</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <EmptyMessages />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Empty Participants</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <EmptyParticipants />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* Network States */}
                <div className="space-y-4">
                  <h4 className="font-medium">Network & Connection States</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Network Offline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <NetworkOffline />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Debate Not Found</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <DebateNotFound debateId="example-123" />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* Access States */}
                <div className="space-y-4">
                  <h4 className="font-medium">Access & Permission States</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Access Denied</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AccessDenied reason="This debate is restricted to invited participants only." />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Coming Soon</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ComingSoon 
                          feature="Advanced Analytics"
                          description="Detailed debate analytics and performance insights"
                          estimatedRelease="Q2 2024"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* Inline Fallbacks */}
                <div className="space-y-4">
                  <h4 className="font-medium">Inline Fallbacks</h4>
                  <div className="space-y-4">
                    
                    <Card className="p-4">
                      <InlineFallback 
                        message="No recent activity"
                        action={{
                          label: 'Refresh',
                          onClick: () => alert('Refreshing...')
                        }}
                      />
                    </Card>

                    <AlertFallback
                      title="Feature Unavailable"
                      description="This feature is temporarily unavailable due to maintenance."
                      action={{
                        label: 'Try Again',
                        onClick: () => alert('Retrying...')
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
