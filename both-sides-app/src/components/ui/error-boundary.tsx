'use client';

import * as React from 'react';

// import { cn } from '@/lib/utils'; // Removed unused import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  className?: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error; retry?: () => void }> = ({ 
  error, 
  retry 
}) => (
  <Card className="w-full max-w-md mx-auto">
    <CardHeader>
      <CardTitle className="text-destructive">Something went wrong</CardTitle>
      <CardDescription>
        An error occurred while rendering this component.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {error && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Error details</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
      {retry && (
        <Button onClick={retry} variant="outline" className="w-full">
          Try again
        </Button>
      )}
    </CardContent>
  </Card>
);

export { ErrorBoundary, DefaultErrorFallback };
export type { ErrorBoundaryProps };
