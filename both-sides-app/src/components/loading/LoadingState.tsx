'use client';

/**
 * Phase 6 Task 6.1.6: LoadingState Component
 * 
 * Comprehensive loading indicators with different variants,
 * skeleton loaders, and contextual loading messages
 */

import React from 'react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2,
  MessageSquare,
  Users,
  BookOpen,
  Shield,
  Zap,
  Clock,
  Download,
  Upload,
  Wifi,
  Server
} from 'lucide-react';

export interface LoadingStateProps {
  variant?: 'spinner' | 'pulse' | 'skeleton' | 'progress' | 'dots' | 'bars';
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
  message?: string;
  submessage?: string;
  progress?: number; // 0-100 for progress variant
  context?: 'debate' | 'profile' | 'message' | 'auth' | 'file' | 'network' | 'general';
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Context-specific configurations
const contextConfig = {
  debate: {
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    message: 'Loading debate room...',
    submessage: 'Preparing your discussion environment'
  },
  profile: {
    icon: Users,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    message: 'Loading profile...',
    submessage: 'Fetching your information'
  },
  message: {
    icon: MessageSquare,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    message: 'Loading messages...',
    submessage: 'Retrieving conversation history'
  },
  auth: {
    icon: Shield,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    message: 'Verifying access...',
    submessage: 'Checking your permissions'
  },
  file: {
    icon: Download,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    message: 'Loading content...',
    submessage: 'Downloading resources'
  },
  network: {
    icon: Wifi,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    message: 'Connecting...',
    submessage: 'Establishing connection'
  },
  general: {
    icon: Loader2,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    message: 'Loading...',
    submessage: 'Please wait'
  }
};

// Size configurations
const sizeConfig = {
  xs: {
    icon: 'h-3 w-3',
    spinner: 'h-4 w-4',
    container: 'p-2',
    text: 'text-xs',
    card: 'p-3'
  },
  sm: {
    icon: 'h-4 w-4',
    spinner: 'h-5 w-5',
    container: 'p-3',
    text: 'text-sm',
    card: 'p-4'
  },
  default: {
    icon: 'h-5 w-5',
    spinner: 'h-6 w-6',
    container: 'p-4',
    text: 'text-base',
    card: 'p-6'
  },
  lg: {
    icon: 'h-6 w-6',
    spinner: 'h-8 w-8',
    container: 'p-6',
    text: 'text-lg',
    card: 'p-8'
  },
  xl: {
    icon: 'h-8 w-8',
    spinner: 'h-12 w-12',
    container: 'p-8',
    text: 'text-xl',
    card: 'p-12'
  }
};

// Spinner Loading Component
export function SpinnerLoading({
  size = 'default',
  message,
  submessage,
  context = 'general',
  className
}: Omit<LoadingStateProps, 'variant'>) {
  const config = contextConfig[context];
  const sizes = sizeConfig[size];
  const IconComponent = config.icon;

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-3", className)}>
      <div className={cn(
        "rounded-full flex items-center justify-center",
        config.bgColor,
        size === 'xs' ? 'h-8 w-8' :
        size === 'sm' ? 'h-10 w-10' :
        size === 'default' ? 'h-12 w-12' :
        size === 'lg' ? 'h-16 w-16' :
        'h-20 w-20'
      )}>
        <IconComponent className={cn(sizes.spinner, config.color, "animate-spin")} />
      </div>
      {(message || config.message) && (
        <div className="text-center space-y-1">
          <p className={cn("font-medium", config.color, sizes.text)}>
            {message || config.message}
          </p>
          {(submessage || config.submessage) && (
            <p className={cn("text-muted-foreground", 
              size === 'xs' ? 'text-xs' :
              size === 'sm' ? 'text-xs' :
              'text-sm'
            )}>
              {submessage || config.submessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Pulse Loading Component
export function PulseLoading({
  size = 'default',
  className
}: Pick<LoadingStateProps, 'size' | 'className'>) {
  const pulseSize = 
    size === 'xs' ? 'h-2 w-2' :
    size === 'sm' ? 'h-3 w-3' :
    size === 'default' ? 'h-4 w-4' :
    size === 'lg' ? 'h-6 w-6' :
    'h-8 w-8';

  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-primary rounded-full animate-pulse",
            pulseSize
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
}

// Dots Loading Component
export function DotsLoading({
  size = 'default',
  className
}: Pick<LoadingStateProps, 'size' | 'className'>) {
  const dotSize = 
    size === 'xs' ? 'h-1 w-1' :
    size === 'sm' ? 'h-1.5 w-1.5' :
    size === 'default' ? 'h-2 w-2' :
    size === 'lg' ? 'h-3 w-3' :
    'h-4 w-4';

  return (
    <div className={cn("flex space-x-1 items-center", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-primary rounded-full animate-bounce",
            dotSize
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );
}

// Bars Loading Component
export function BarsLoading({
  size = 'default',
  className
}: Pick<LoadingStateProps, 'size' | 'className'>) {
  const barHeight = 
    size === 'xs' ? 'h-3' :
    size === 'sm' ? 'h-4' :
    size === 'default' ? 'h-6' :
    size === 'lg' ? 'h-8' :
    'h-12';

  const barWidth =
    size === 'xs' ? 'w-0.5' :
    size === 'sm' ? 'w-1' :
    size === 'default' ? 'w-1' :
    size === 'lg' ? 'w-1.5' :
    'w-2';

  return (
    <div className={cn("flex space-x-1 items-end", className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-primary animate-pulse",
            barHeight,
            barWidth
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1.2s',
            transformOrigin: 'bottom',
            animation: `loading-bars 1.2s ease-in-out ${i * 0.1}s infinite`
          }}
        />
      ))}
      <style jsx>{`
        @keyframes loading-bars {
          0%, 40%, 100% {
            transform: scaleY(0.4);
          }
          20% {
            transform: scaleY(1.0);
          }
        }
      `}</style>
    </div>
  );
}

// Progress Loading Component
export function ProgressLoading({
  progress = 0,
  message,
  submessage,
  size = 'default',
  className
}: Pick<LoadingStateProps, 'progress' | 'message' | 'submessage' | 'size' | 'className'>) {
  const sizes = sizeConfig[size];

  return (
    <div className={cn("w-full space-y-3", className)}>
      {message && (
        <div className="text-center space-y-1">
          <p className={cn("font-medium", sizes.text)}>{message}</p>
          {submessage && (
            <p className="text-muted-foreground text-sm">{submessage}</p>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Progress value={progress} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{Math.round(progress)}%</span>
          <span>{progress < 100 ? 'Loading...' : 'Complete'}</span>
        </div>
      </div>
    </div>
  );
}

// Main LoadingState component
export function LoadingState({
  variant = 'spinner',
  size = 'default',
  message,
  submessage,
  progress,
  context = 'general',
  fullScreen = false,
  overlay = false,
  className,
  children
}: LoadingStateProps) {
  const sizes = sizeConfig[size];

  const renderLoadingContent = () => {
    switch (variant) {
      case 'spinner':
        return (
          <SpinnerLoading
            size={size}
            message={message}
            submessage={submessage}
            context={context}
          />
        );
      case 'pulse':
        return <PulseLoading size={size} />;
      case 'dots':
        return <DotsLoading size={size} />;
      case 'bars':
        return <BarsLoading size={size} />;
      case 'progress':
        return (
          <ProgressLoading
            progress={progress}
            message={message}
            submessage={submessage}
            size={size}
          />
        );
      case 'skeleton':
        // Skeleton will be handled by separate components
        return <SpinnerLoading size={size} context={context} />;
      default:
        return <SpinnerLoading size={size} context={context} />;
    }
  };

  const content = (
    <div className={cn(
      "flex items-center justify-center",
      fullScreen && "min-h-screen",
      !fullScreen && "p-4",
      className
    )}>
      {variant === 'progress' ? (
        <Card className={sizes.card}>
          <div className="w-full max-w-sm">
            {renderLoadingContent()}
          </div>
        </Card>
      ) : fullScreen ? (
        <Card className={sizes.card}>
          {renderLoadingContent()}
        </Card>
      ) : (
        renderLoadingContent()
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="relative">
        {children}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          {renderLoadingContent()}
        </div>
      </div>
    );
  }

  return content;
}

// Specialized loading components for common use cases
export function DebateRoomLoading({ className }: { className?: string }) {
  return (
    <LoadingState
      context="debate"
      size="lg"
      fullScreen
      message="Loading debate room..."
      submessage="Preparing your discussion environment"
      className={className}
    />
  );
}

export function MessageLoading({ className }: { className?: string }) {
  return (
    <LoadingState
      context="message"
      variant="dots"
      message="Loading messages..."
      className={className}
    />
  );
}

export function ProfileLoading({ className }: { className?: string }) {
  return (
    <LoadingState
      context="profile"
      size="default"
      message="Loading profile..."
      submessage="Fetching your information"
      className={className}
    />
  );
}

export function AuthLoading({ className }: { className?: string }) {
  return (
    <LoadingState
      context="auth"
      size="default"
      fullScreen
      message="Verifying access..."
      submessage="Please wait while we check your permissions"
      className={className}
    />
  );
}

// Inline loading components
export function InlineLoading({ 
  size = 'sm', 
  variant = 'spinner',
  className 
}: Pick<LoadingStateProps, 'size' | 'variant' | 'className'>) {
  switch (variant) {
    case 'dots':
      return <DotsLoading size={size} className={cn("inline-flex", className)} />;
    case 'pulse':
      return <PulseLoading size={size} className={cn("inline-flex", className)} />;
    case 'bars':
      return <BarsLoading size={size} className={cn("inline-flex", className)} />;
    default:
      return (
        <Loader2 className={cn(
          "animate-spin inline-block",
          sizeConfig[size].spinner,
          className
        )} />
      );
  }
}

// Loading overlay for existing content
export function LoadingOverlay({
  isLoading,
  children,
  message = "Loading...",
  variant = 'spinner',
  className
}: {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  variant?: LoadingStateProps['variant'];
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-md">
          <LoadingState
            variant={variant}
            message={message}
            size="default"
          />
        </div>
      )}
    </div>
  );
}

export default LoadingState;
