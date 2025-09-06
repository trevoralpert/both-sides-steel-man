'use client';

/**
 * Phase 6 Task 6.1.5: RouteGuard Component
 * 
 * Route protection with authentication checks, permission validation,
 * and debate-specific access control
 */

import React, { useEffect, useState } from 'react';

import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Lock, 
  UserX, 
  AlertCircle,
  ArrowLeft,
  Shield
} from 'lucide-react';

export interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfile?: boolean;
  allowedRoles?: string[];
  debateAccess?: {
    conversationId: string;
    matchId?: string;
    requireParticipant?: boolean;
  };
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
  className?: string;
}

interface GuardState {
  isLoading: boolean;
  isAuthorized: boolean;
  error?: string;
  redirectPath?: string;
}

// Mock function to check debate access - will be replaced with real API calls
async function checkDebateAccess(
  userId: string,
  conversationId: string,
  matchId?: string
): Promise<{ authorized: boolean; error?: string }> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock validation logic
  if (!conversationId) {
    return { authorized: false, error: 'Invalid debate room' };
  }

  // For demo purposes, allow access to demo conversations
  if (conversationId.startsWith('demo')) {
    return { authorized: true };
  }

  // Mock participant check
  const isParticipant = Math.random() > 0.2; // 80% chance of being authorized
  if (!isParticipant) {
    return { 
      authorized: false, 
      error: 'You are not authorized to access this debate room' 
    };
  }

  return { authorized: true };
}

// Mock function to check user profile completion
async function checkProfileCompletion(userId: string): Promise<boolean> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Mock profile check - assume most users have completed profiles
  return Math.random() > 0.1; // 90% have completed profiles
}

function LoadingState({ loadingComponent }: { loadingComponent?: React.ReactNode }) {
  if (loadingComponent) {
    return <>{loadingComponent}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Verifying Access</h3>
            <p className="text-muted-foreground mt-1">
              Please wait while we check your permissions...
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface UnauthorizedStateProps {
  error: string;
  fallbackPath?: string;
  onRetry?: () => void;
}

function UnauthorizedState({ error, fallbackPath, onRetry }: UnauthorizedStateProps) {
  const router = useRouter();

  const getErrorIcon = () => {
    if (error.includes('not authorized') || error.includes('permission')) {
      return <Lock className="h-8 w-8 text-red-500" />;
    }
    if (error.includes('profile') || error.includes('complete')) {
      return <UserX className="h-8 w-8 text-yellow-500" />;
    }
    return <AlertCircle className="h-8 w-8 text-red-500" />;
  };

  const getErrorType = () => {
    if (error.includes('not authorized') || error.includes('permission')) {
      return { title: 'Access Denied', variant: 'destructive' as const };
    }
    if (error.includes('profile') || error.includes('complete')) {
      return { title: 'Profile Required', variant: 'default' as const };
    }
    return { title: 'Access Error', variant: 'destructive' as const };
  };

  const errorType = getErrorType();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center space-y-6">
          <div className="mx-auto h-16 w-16 bg-accent rounded-full flex items-center justify-center">
            {getErrorIcon()}
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-xl">{errorType.title}</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>

          <Alert variant={errorType.variant}>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {error.includes('profile') 
                ? 'Complete your profile to access debate rooms and participate in discussions.'
                : 'Contact support if you believe this is an error.'}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(fallbackPath || '/dashboard')}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {fallbackPath ? 'Go Back' : 'Dashboard'}
            </Button>
            
            {error.includes('profile') ? (
              <Button
                onClick={() => router.push('/profile')}
                className="flex-1"
              >
                Complete Profile
              </Button>
            ) : onRetry ? (
              <Button onClick={onRetry} className="flex-1">
                Try Again
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function RouteGuard({
  children,
  requireAuth = true,
  requireProfile = false,
  allowedRoles = [],
  debateAccess,
  fallbackPath,
  loadingComponent,
  className
}: RouteGuardProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  
  const [guardState, setGuardState] = useState<GuardState>({
    isLoading: true,
    isAuthorized: false
  });

  // Perform authorization checks
  useEffect(() => {
    async function checkAuthorization() {
      setGuardState({ isLoading: true, isAuthorized: false });

      try {
        // Wait for Clerk to load
        if (!isLoaded) {
          return;
        }

        // Check authentication requirement
        if (requireAuth && !user) {
          router.push('/sign-in?redirect=' + encodeURIComponent(pathname));
          return;
        }

        // If no auth required and no user, allow access
        if (!requireAuth && !user) {
          setGuardState({ isLoading: false, isAuthorized: true });
          return;
        }

        // Check profile completion requirement
        if (requireProfile && user) {
          const hasProfile = await checkProfileCompletion(user.id);
          if (!hasProfile) {
            setGuardState({
              isLoading: false,
              isAuthorized: false,
              error: 'Please complete your profile to access this content.'
            });
            return;
          }
        }

        // Check role-based access
        if (allowedRoles.length > 0 && user) {
          const userRole = user.publicMetadata?.role as string || 'user';
          if (!allowedRoles.includes(userRole)) {
            setGuardState({
              isLoading: false,
              isAuthorized: false,
              error: `Access restricted to: ${allowedRoles.join(', ')}`
            });
            return;
          }
        }

        // Check debate-specific access
        if (debateAccess && user) {
          const { authorized, error } = await checkDebateAccess(
            user.id,
            debateAccess.conversationId,
            debateAccess.matchId
          );

          if (!authorized) {
            setGuardState({
              isLoading: false,
              isAuthorized: false,
              error: error || 'Access to this debate room is denied'
            });
            return;
          }
        }

        // All checks passed
        setGuardState({ isLoading: false, isAuthorized: true });

      } catch (error) {
        console.error('Route guard error:', error);
        setGuardState({
          isLoading: false,
          isAuthorized: false,
          error: 'An error occurred while checking access permissions.'
        });
      }
    }

    checkAuthorization();
  }, [
    isLoaded,
    user,
    requireAuth,
    requireProfile,
    allowedRoles,
    debateAccess,
    router,
    pathname
  ]);

  // Handle retry
  const handleRetry = () => {
    setGuardState({ isLoading: true, isAuthorized: false });
    // Re-run authorization checks
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Show loading state
  if (guardState.isLoading) {
    return <LoadingState loadingComponent={loadingComponent} />;
  }

  // Show unauthorized state
  if (!guardState.isAuthorized) {
    return (
      <UnauthorizedState
        error={guardState.error || 'Access denied'}
        fallbackPath={fallbackPath}
        onRetry={handleRetry}
      />
    );
  }

  // Render protected content
  return <div className={className}>{children}</div>;
}

// Higher-order component wrapper
export function withRouteGuard<T extends {}>(
  Component: React.ComponentType<T>,
  guardOptions: Omit<RouteGuardProps, 'children'>
) {
  return function GuardedComponent(props: T) {
    return (
      <RouteGuard {...guardOptions}>
        <Component {...props} />
      </RouteGuard>
    );
  };
}

export default RouteGuard;
