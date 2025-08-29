'use client';

/**
 * Phase 6 Task 6.1.6: ErrorBoundary Component
 * 
 * Comprehensive error boundary system with different fallback UIs,
 * error reporting, recovery mechanisms, and contextual error handling
 */

import React from 'react';
import { ErrorInfo } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  Bug,
  Wifi,
  Server,
  Shield,
  MessageSquare,
  FileX,
  Zap
} from 'lucide-react';

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  maxRetries?: number;
  context?: 'debate' | 'profile' | 'navigation' | 'message' | 'general';
  level?: 'page' | 'component' | 'feature';
  className?: string;
}

export interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  retryCount: number;
  context: string;
  level: string;
  errorId: string;
}

// Generate unique error ID
function generateErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Categorize errors for better handling
function categorizeError(error: Error): {
  type: 'network' | 'auth' | 'permission' | 'validation' | 'chunk' | 'runtime' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
} {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return { type: 'network', severity: 'medium', recoverable: true };
  }

  // Authentication errors
  if (message.includes('unauthorized') || message.includes('auth') || message.includes('token')) {
    return { type: 'auth', severity: 'high', recoverable: true };
  }

  // Permission errors
  if (message.includes('permission') || message.includes('access') || message.includes('forbidden')) {
    return { type: 'permission', severity: 'high', recoverable: false };
  }

  // Chunk loading errors (Next.js)
  if (message.includes('chunk') || message.includes('loading') || stack.includes('chunk')) {
    return { type: 'chunk', severity: 'medium', recoverable: true };
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return { type: 'validation', severity: 'low', recoverable: true };
  }

  // Runtime errors
  if (message.includes('undefined') || message.includes('null') || message.includes('cannot read')) {
    return { type: 'runtime', severity: 'medium', recoverable: true };
  }

  return { type: 'unknown', severity: 'medium', recoverable: true };
}

// Default error fallback component
export function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  retryCount,
  context,
  level,
  errorId
}: ErrorFallbackProps) {
  const errorCategory = error ? categorizeError(error) : null;
  const isProductionMode = process.env.NODE_ENV === 'production';

  const getErrorIcon = () => {
    if (!errorCategory) return AlertTriangle;
    
    switch (errorCategory.type) {
      case 'network': return Wifi;
      case 'auth': return Shield;
      case 'permission': return Shield;
      case 'chunk': return Server;
      case 'validation': return FileX;
      case 'runtime': return Bug;
      default: return AlertTriangle;
    }
  };

  const getErrorTitle = () => {
    if (!errorCategory) return 'Something went wrong';
    
    switch (errorCategory.type) {
      case 'network': return 'Connection Error';
      case 'auth': return 'Authentication Error';
      case 'permission': return 'Access Denied';
      case 'chunk': return 'Loading Error';
      case 'validation': return 'Invalid Data';
      case 'runtime': return 'Application Error';
      default: return 'Something went wrong';
    }
  };

  const getErrorMessage = () => {
    if (!errorCategory) return 'An unexpected error occurred. Please try again.';
    
    switch (errorCategory.type) {
      case 'network': 
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'auth': 
        return 'Your session has expired or authentication failed. Please sign in again.';
      case 'permission': 
        return 'You do not have permission to access this content.';
      case 'chunk': 
        return 'Failed to load application resources. Please refresh the page.';
      case 'validation': 
        return 'The data provided is invalid or incomplete.';
      case 'runtime': 
        return 'An application error occurred. Our team has been notified.';
      default: 
        return 'An unexpected error occurred. Please try again.';
    }
  };

  const getRecoveryActions = () => {
    if (!errorCategory) return [];
    
    const actions = [];
    
    if (errorCategory.recoverable && retryCount < 3) {
      actions.push({
        label: 'Try Again',
        action: resetError,
        variant: 'default' as const,
        icon: RefreshCw
      });
    }

    switch (errorCategory.type) {
      case 'network':
        actions.push({
          label: 'Check Connection',
          action: () => window.location.reload(),
          variant: 'outline' as const,
          icon: Wifi
        });
        break;
      case 'auth':
        actions.push({
          label: 'Sign In Again',
          action: () => window.location.href = '/sign-in',
          variant: 'default' as const,
          icon: Shield
        });
        break;
      case 'chunk':
        actions.push({
          label: 'Refresh Page',
          action: () => window.location.reload(),
          variant: 'default' as const,
          icon: RefreshCw
        });
        break;
    }

    // Always provide home option for high-level errors
    if (level === 'page') {
      actions.push({
        label: 'Go Home',
        action: () => window.location.href = '/',
        variant: 'outline' as const,
        icon: Home
      });
    }

    return actions;
  };

  const ErrorIcon = getErrorIcon();
  const recoveryActions = getRecoveryActions();

  return (
    <div className={cn(
      "flex items-center justify-center p-4",
      level === 'page' ? "min-h-screen" : "min-h-[200px]"
    )}>
      <Card className="w-full max-w-md">
        <div className="p-6 text-center space-y-4">
          
          {/* Error Icon */}
          <div className={cn(
            "mx-auto rounded-full flex items-center justify-center",
            "h-12 w-12",
            errorCategory?.severity === 'critical' ? "bg-red-100 text-red-600" :
            errorCategory?.severity === 'high' ? "bg-orange-100 text-orange-600" :
            "bg-yellow-100 text-yellow-600"
          )}>
            <ErrorIcon className="h-6 w-6" />
          </div>

          {/* Error Title and Message */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{getErrorTitle()}</h3>
            <p className="text-muted-foreground text-sm">{getErrorMessage()}</p>
          </div>

          {/* Error Details (Development only) */}
          {!isProductionMode && error && (
            <Alert variant="destructive">
              <Bug className="h-4 w-4" />
              <AlertTitle>Development Details</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="text-xs font-mono">
                  <div><strong>Error:</strong> {error.message}</div>
                  <div><strong>Context:</strong> {context}</div>
                  <div><strong>Level:</strong> {level}</div>
                  <div><strong>ID:</strong> {errorId}</div>
                  {retryCount > 0 && <div><strong>Retries:</strong> {retryCount}</div>}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Recovery Actions */}
          {recoveryActions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {recoveryActions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={index}
                    variant={action.variant}
                    onClick={action.action}
                    className="flex-1"
                    disabled={action.label === 'Try Again' && retryCount >= 3}
                  >
                    <ActionIcon className="h-4 w-4 mr-2" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Retry Limit Message */}
          {retryCount >= 3 && errorCategory?.recoverable && (
            <p className="text-xs text-muted-foreground">
              Maximum retry attempts reached. Please refresh the page or contact support.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

// Specialized error fallbacks for different contexts
export function DebateErrorFallback(props: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-lg">
        <div className="p-6 text-center space-y-4">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-xl">Debate Room Error</h3>
            <p className="text-muted-foreground mt-2">
              We're having trouble loading the debate room. This could be due to a connection issue 
              or the debate may no longer be available.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={props.resetError} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function MessageErrorFallback(props: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-4 min-h-[100px]">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Message Error</AlertTitle>
        <AlertDescription className="mt-2">
          Failed to load messages. 
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={props.resetError}
            className="ml-2 h-auto p-1 underline"
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Main ErrorBoundary class component
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || generateErrorId();
    
    this.setState({
      errorInfo,
      errorId
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary: ${errorId}`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', this.props.context);
      console.error('Level:', this.props.level);
      console.groupEnd();
    }

    // Report error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // In a real app, send to error tracking service
      console.error('Error boundary caught error:', {
        error: error.message,
        stack: error.stack,
        errorInfo,
        context: this.props.context,
        level: this.props.level,
        errorId
      });
    }
  }

  resetError = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: prevState.retryCount + 1
    }));

    // Auto-reset retry count after successful render
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ retryCount: 0 });
    }, 30000); // Reset retry count after 30 seconds
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback: CustomFallback, context = 'general', level = 'component' } = this.props;
      const FallbackComponent = CustomFallback || DefaultErrorFallback;

      return (
        <div className={this.props.className}>
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
            retryCount={this.state.retryCount}
            context={context}
            level={level}
            errorId={this.state.errorId}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC wrapper for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default ErrorBoundary;
