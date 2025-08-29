'use client';

/**
 * Phase 6 Task 6.1.5: NavigationLayout Component
 * 
 * Unified navigation layout with breadcrumbs, page headers,
 * and contextual navigation controls
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Share, 
  MoreHorizontal,
  ExternalLink,
  Copy,
  Bookmark
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface NavigationAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  disabled?: boolean;
  badge?: string | number;
}

export interface NavigationLayoutProps {
  // Page content
  title?: string;
  subtitle?: string;
  description?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };

  // Navigation
  breadcrumbItems?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  backButton?: {
    href?: string;
    onClick?: () => void;
    label?: string;
  };

  // Actions
  primaryAction?: NavigationAction;
  secondaryActions?: NavigationAction[];
  
  // Sharing
  shareUrl?: string;
  shareTitle?: string;
  
  // Layout
  children?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

interface ShareMenuProps {
  url: string;
  title: string;
  className?: string;
}

function ShareMenu({ url, title, className }: ShareMenuProps) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      // In a real app, you'd show a toast notification here
      console.log('Link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const shareNatively = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url
        });
      } catch (err) {
        console.error('Native sharing failed:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Share className="h-3 w-3 mr-1" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
        {navigator.share && (
          <DropdownMenuItem onClick={shareNatively}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Share...
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => {
          // Add to bookmarks functionality
          console.log('Add to bookmarks');
        }}>
          <Bookmark className="h-4 w-4 mr-2" />
          Add to Bookmarks
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ActionsMenuProps {
  actions: NavigationAction[];
  className?: string;
}

function ActionsMenu({ actions, className }: ActionsMenuProps) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <DropdownMenuItem
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
              {action.label}
              {action.badge && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {action.badge}
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NavigationLayout({
  title,
  subtitle,
  description,
  badge,
  breadcrumbItems,
  showBreadcrumbs = true,
  backButton,
  primaryAction,
  secondaryActions = [],
  shareUrl,
  shareTitle,
  children,
  className,
  headerClassName,
  contentClassName
}: NavigationLayoutProps) {
  const handleBackClick = () => {
    if (backButton?.onClick) {
      backButton.onClick();
    } else if (backButton?.href) {
      window.location.href = backButton.href;
    } else {
      window.history.back();
    }
  };

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        headerClassName
      )}>
        <div className="container mx-auto px-4 py-4 space-y-4">
          
          {/* Top Navigation Row */}
          <div className="flex items-center justify-between">
            
            {/* Left side - Back button and breadcrumbs */}
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              {backButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackClick}
                  className="flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {backButton.label || 'Back'}
                </Button>
              )}
              
              {showBreadcrumbs && (
                <>
                  {backButton && <Separator orientation="vertical" className="h-4" />}
                  <Breadcrumb 
                    items={breadcrumbItems}
                    className="min-w-0 flex-1"
                  />
                </>
              )}
            </div>

            {/* Right side - Share and actions */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {shareUrl && shareTitle && (
                <ShareMenu url={shareUrl} title={shareTitle} />
              )}
              
              {secondaryActions.length > 0 && (
                <ActionsMenu actions={secondaryActions} />
              )}
            </div>
          </div>

          {/* Page Header */}
          {(title || subtitle || description || primaryAction) && (
            <>
              <Separator />
              <div className="flex items-start justify-between">
                
                {/* Title and description */}
                <div className="min-w-0 flex-1 space-y-2">
                  {title && (
                    <div className="flex items-center space-x-3">
                      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                      {badge && (
                        <Badge variant={badge.variant || 'default'}>
                          {badge.text}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {subtitle && (
                    <p className="text-lg text-muted-foreground">{subtitle}</p>
                  )}
                  
                  {description && (
                    <p className="text-sm text-muted-foreground max-w-3xl">
                      {description}
                    </p>
                  )}
                </div>

                {/* Primary action */}
                {primaryAction && (
                  <div className="flex-shrink-0 ml-6">
                    <Button
                      variant={primaryAction.variant || 'default'}
                      onClick={primaryAction.onClick}
                      disabled={primaryAction.disabled}
                      className="relative"
                    >
                      {primaryAction.icon && (
                        <primaryAction.icon className="h-4 w-4 mr-2" />
                      )}
                      {primaryAction.label}
                      {primaryAction.badge && (
                        <Badge 
                          variant="secondary" 
                          className="ml-2 text-xs absolute -top-1 -right-1"
                        >
                          {primaryAction.badge}
                        </Badge>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("container mx-auto px-4 py-6", contentClassName)}>
        {children}
      </main>
    </div>
  );
}

// Pre-configured layout variants
export function DebateNavigationLayout({
  conversationId,
  topicTitle,
  currentPhase,
  onShare,
  onSettings,
  children,
  ...props
}: {
  conversationId: string;
  topicTitle?: string;
  currentPhase?: string;
  onShare?: () => void;
  onSettings?: () => void;
  children?: React.ReactNode;
} & Omit<NavigationLayoutProps, 'breadcrumbItems' | 'title' | 'badge' | 'secondaryActions'>) {
  
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: ArrowLeft },
    { label: 'Debates', href: '/debate' },
    { 
      label: topicTitle || (conversationId.startsWith('demo-') ? 'Demo Room' : 'Debate Room'),
      isActive: true 
    }
  ];

  const secondaryActions: NavigationAction[] = [];
  
  if (onShare) {
    secondaryActions.push({
      label: 'Share Debate',
      icon: Share,
      onClick: onShare
    });
  }
  
  if (onSettings) {
    secondaryActions.push({
      label: 'Settings',
      onClick: onSettings
    });
  }

  return (
    <NavigationLayout
      {...props}
      breadcrumbItems={breadcrumbItems}
      title={topicTitle}
      badge={currentPhase ? {
        text: `${currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1).toLowerCase()} Phase`,
        variant: 'outline'
      } : undefined}
      secondaryActions={secondaryActions}
    >
      {children}
    </NavigationLayout>
  );
}

export default NavigationLayout;
