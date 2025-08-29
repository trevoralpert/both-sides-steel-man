'use client';

/**
 * Phase 6 Task 6.1.6: FallbackUI Components
 * 
 * Fallback UI components for empty states, no data, network issues,
 * and other non-error scenarios that need graceful handling
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare,
  Users,
  Wifi,
  WifiOff,
  Search,
  FileX,
  Inbox,
  Plus,
  RefreshCw,
  ArrowLeft,
  BookOpen,
  Zap,
  Clock,
  Eye,
  UserX,
  Globe
} from 'lucide-react';
import Link from 'next/link';

export interface FallbackUIProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  image?: string;
  actions?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

// Base fallback UI component
export function FallbackUI({
  title,
  description,
  icon: IconComponent = FileX,
  image,
  actions = [],
  className,
  size = 'default'
}: FallbackUIProps) {
  const sizeClasses = {
    sm: {
      container: 'p-6',
      icon: 'h-8 w-8',
      iconContainer: 'h-16 w-16',
      title: 'text-lg',
      description: 'text-sm'
    },
    default: {
      container: 'p-8',
      icon: 'h-12 w-12',
      iconContainer: 'h-24 w-24',
      title: 'text-xl',
      description: 'text-base'
    },
    lg: {
      container: 'p-12',
      icon: 'h-16 w-16',
      iconContainer: 'h-32 w-32',
      title: 'text-2xl',
      description: 'text-lg'
    }
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn(
      "flex items-center justify-center w-full",
      size === 'lg' ? 'min-h-[400px]' : 'min-h-[300px]',
      className
    )}>
      <Card className={cn("max-w-md w-full", sizes.container)}>
        <div className="text-center space-y-6">
          
          {/* Icon or Image */}
          {image ? (
            <div className={cn("mx-auto", sizes.iconContainer)}>
              <img 
                src={image} 
                alt={title}
                className="w-full h-full object-contain opacity-50"
              />
            </div>
          ) : (
            <div className={cn(
              "mx-auto rounded-full bg-accent flex items-center justify-center",
              sizes.iconContainer
            )}>
              <IconComponent className={cn(sizes.icon, "text-muted-foreground")} />
            </div>
          )}

          {/* Title and Description */}
          <div className="space-y-2">
            <h3 className={cn("font-semibold", sizes.title)}>{title}</h3>
            {description && (
              <p className={cn("text-muted-foreground leading-relaxed", sizes.description)}>
                {description}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              {actions.map((action, index) => {
                const ActionIcon = action.icon;
                const button = (
                  <Button
                    key={index}
                    variant={action.variant || 'default'}
                    onClick={action.onClick}
                    className="flex-1"
                  >
                    {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                    {action.label}
                  </Button>
                );

                return action.href ? (
                  <Link key={index} href={action.href} className="flex-1">
                    {button}
                  </Link>
                ) : button;
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Empty states for specific contexts
export function EmptyMessages({ 
  onStartConversation,
  className 
}: { 
  onStartConversation?: () => void;
  className?: string;
}) {
  return (
    <FallbackUI
      title="No messages yet"
      description="Be the first to share your thoughts and start the debate!"
      icon={MessageSquare}
      actions={onStartConversation ? [
        {
          label: 'Start the Discussion',
          onClick: onStartConversation,
          icon: Plus,
          variant: 'default'
        }
      ] : []}
      className={className}
    />
  );
}

export function EmptyParticipants({ 
  onInviteUsers,
  className 
}: { 
  onInviteUsers?: () => void;
  className?: string;
}) {
  return (
    <FallbackUI
      title="No participants yet"
      description="Invite others to join this debate and share their perspectives."
      icon={Users}
      actions={onInviteUsers ? [
        {
          label: 'Invite Participants',
          onClick: onInviteUsers,
          icon: Plus,
          variant: 'default'
        }
      ] : []}
      size="sm"
      className={className}
    />
  );
}

export function EmptySearchResults({ 
  searchQuery,
  onClearSearch,
  className 
}: { 
  searchQuery?: string;
  onClearSearch?: () => void;
  className?: string;
}) {
  return (
    <FallbackUI
      title="No results found"
      description={searchQuery ? 
        `No results found for "${searchQuery}". Try adjusting your search terms.` :
        "No results found. Try a different search query."
      }
      icon={Search}
      actions={onClearSearch ? [
        {
          label: 'Clear Search',
          onClick: onClearSearch,
          variant: 'outline'
        }
      ] : []}
      size="sm"
      className={className}
    />
  );
}

export function EmptyProfile({ 
  onCompleteProfile,
  className 
}: { 
  onCompleteProfile?: () => void;
  className?: string;
}) {
  return (
    <FallbackUI
      title="Complete Your Profile"
      description="Set up your profile to participate in debates and connect with other users."
      icon={UserX}
      actions={onCompleteProfile ? [
        {
          label: 'Complete Profile',
          onClick: onCompleteProfile,
          icon: Plus,
          variant: 'default'
        }
      ] : []}
      className={className}
    />
  );
}

// Network and connectivity states
export function NetworkOffline({ 
  onRetry,
  className 
}: { 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <FallbackUI
      title="You're offline"
      description="Check your internet connection and try again."
      icon={WifiOff}
      actions={[
        ...(onRetry ? [{
          label: 'Try Again',
          onClick: onRetry,
          icon: RefreshCw,
          variant: 'default' as const
        }] : []),
        {
          label: 'Refresh Page',
          onClick: () => window.location.reload(),
          icon: RefreshCw,
          variant: 'outline' as const
        }
      ]}
      className={className}
    />
  );
}

export function ServerMaintenance({ 
  estimatedTime,
  className 
}: { 
  estimatedTime?: string;
  className?: string;
}) {
  return (
    <FallbackUI
      title="System Maintenance"
      description={`We're currently performing maintenance to improve your experience. ${
        estimatedTime ? `Expected completion: ${estimatedTime}` : 'Please check back soon.'
      }`}
      icon={Clock}
      actions={[
        {
          label: 'Go to Dashboard',
          href: '/dashboard',
          variant: 'outline'
        }
      ]}
      className={className}
    />
  );
}

// Access and permission states
export function AccessDenied({ 
  reason,
  onRequestAccess,
  className 
}: { 
  reason?: string;
  onRequestAccess?: () => void;
  className?: string;
}) {
  return (
    <FallbackUI
      title="Access Restricted"
      description={reason || "You don't have permission to view this content."}
      icon={Eye}
      actions={[
        ...(onRequestAccess ? [{
          label: 'Request Access',
          onClick: onRequestAccess,
          variant: 'default' as const
        }] : []),
        {
          label: 'Go Back',
          onClick: () => window.history.back(),
          variant: 'outline' as const,
          icon: ArrowLeft
        }
      ]}
      className={className}
    />
  );
}

export function DebateNotFound({ 
  debateId,
  className 
}: { 
  debateId?: string;
  className?: string;
}) {
  return (
    <FallbackUI
      title="Debate Not Found"
      description={`The debate ${debateId ? `"${debateId}"` : ''} could not be found. It may have been removed or you may not have access to it.`}
      icon={MessageSquare}
      actions={[
        {
          label: 'Browse Debates',
          href: '/debates',
          variant: 'default'
        },
        {
          label: 'Go to Dashboard',
          href: '/dashboard',
          variant: 'outline'
        }
      ]}
      className={className}
    />
  );
}

// Feature-specific empty states
export function NoPreparationMaterials({ 
  onGenerateMaterials,
  className 
}: { 
  onGenerateMaterials?: () => void;
  className?: string;
}) {
  return (
    <FallbackUI
      title="No Preparation Materials"
      description="AI-generated preparation materials will help you organize your arguments and evidence."
      icon={BookOpen}
      actions={onGenerateMaterials ? [
        {
          label: 'Generate Materials',
          onClick: onGenerateMaterials,
          icon: Zap,
          variant: 'default'
        }
      ] : []}
      size="sm"
      className={className}
    />
  );
}

export function DebateEnded({ 
  onViewResults,
  onStartNew,
  className 
}: { 
  onViewResults?: () => void;
  onStartNew?: () => void;
  className?: string;
}) {
  return (
    <FallbackUI
      title="Debate Complete"
      description="This debate has ended. Review the discussion or start a new debate on a different topic."
      icon={MessageSquare}
      actions={[
        ...(onViewResults ? [{
          label: 'View Results',
          onClick: onViewResults,
          variant: 'default' as const
        }] : []),
        ...(onStartNew ? [{
          label: 'Start New Debate',
          onClick: onStartNew,
          variant: 'outline' as const,
          icon: Plus
        }] : [])
      ]}
      className={className}
    />
  );
}

// Coming soon / under development
export function ComingSoon({ 
  feature,
  description,
  estimatedRelease,
  onNotifyMe,
  className 
}: { 
  feature: string;
  description?: string;
  estimatedRelease?: string;
  onNotifyMe?: () => void;
  className?: string;
}) {
  return (
    <FallbackUI
      title={`${feature} Coming Soon`}
      description={description || `We're working hard to bring you ${feature}. ${
        estimatedRelease ? `Expected release: ${estimatedRelease}` : 'Stay tuned for updates!'
      }`}
      icon={Clock}
      actions={onNotifyMe ? [
        {
          label: 'Notify Me',
          onClick: onNotifyMe,
          variant: 'outline'
        }
      ] : []}
      className={className}
    />
  );
}

// Inline fallbacks for smaller components
export function InlineFallback({ 
  message = "No data available",
  action,
  className 
}: {
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  return (
    <div className={cn(
      "flex items-center justify-center p-4 text-center",
      className
    )}>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{message}</p>
        {action && (
          <Button
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            className="h-auto p-1 underline"
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Alert-style fallbacks
export function AlertFallback({
  variant = 'default',
  title,
  description,
  action,
  className
}: {
  variant?: 'default' | 'destructive';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  return (
    <Alert variant={variant} className={className}>
      <FileX className="h-4 w-4" />
      <div className="space-y-2">
        <div className="font-medium">{title}</div>
        <AlertDescription>
          {description}
          {action && (
            <Button
              variant="ghost"
              size="sm"
              onClick={action.onClick}
              className="ml-2 h-auto p-1 underline"
            >
              {action.label}
            </Button>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}

export default FallbackUI;
