'use client';

/**
 * Phase 6 Task 6.1.5: Breadcrumb Component
 * 
 * Navigation breadcrumbs with dynamic path generation,
 * debate-specific context, and accessibility features
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Home, 
  ChevronRight, 
  MessageSquare,
  Users,
  Settings,
  User,
  BookOpen,
  Shield,
  MoreHorizontal
} from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  maxItems?: number;
  separator?: 'chevron' | 'slash' | 'pipe';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

// Path-to-breadcrumb mapping for common routes
const ROUTE_MAPPINGS: Record<string, Partial<BreadcrumbItem>> = {
  '/': { label: 'Home', icon: Home },
  '/dashboard': { label: 'Dashboard', icon: Home },
  '/profile': { label: 'Profile', icon: User },
  '/survey': { label: 'Survey', icon: BookOpen },
  '/admin': { label: 'Admin', icon: Shield },
  '/settings': { label: 'Settings', icon: Settings },
  '/debate': { label: 'Debates', icon: MessageSquare },
  '/participants': { label: 'Participants', icon: Users }
};

// Generate breadcrumb items from pathname
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Add home/dashboard
  breadcrumbs.push({
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home
  });

  // Build path progressively
  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Check if this is a dynamic route parameter (starts with certain patterns)
    const isDynamicId = /^[a-f0-9-]{8,}$|^demo-/.test(segment);
    
    let breadcrumbItem: BreadcrumbItem;

    // Handle known static routes
    if (ROUTE_MAPPINGS[currentPath]) {
      breadcrumbItem = {
        ...ROUTE_MAPPINGS[currentPath],
        label: ROUTE_MAPPINGS[currentPath].label!,
        href: currentPath
      };
    }
    // Handle dynamic routes
    else if (isDynamicId) {
      const previousSegment = segments[i - 1];
      
      if (previousSegment === 'debate') {
        breadcrumbItem = {
          label: segment.startsWith('demo-') ? 'Demo Room' : 'Debate Room',
          href: currentPath,
          icon: MessageSquare,
          metadata: { conversationId: segment }
        };
      } else {
        breadcrumbItem = {
          label: segment.substring(0, 8) + '...',
          href: currentPath
        };
      }
    }
    // Handle other segments
    else {
      // Capitalize and clean up segment
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbItem = {
        label,
        href: currentPath,
        icon: ROUTE_MAPPINGS[`/${segment}`]?.icon
      };
    }

    breadcrumbs.push(breadcrumbItem);
  }

  // Mark the last item as active
  if (breadcrumbs.length > 0) {
    breadcrumbs[breadcrumbs.length - 1].isActive = true;
    breadcrumbs[breadcrumbs.length - 1].href = undefined; // Remove href for active item
  }

  return breadcrumbs;
}

interface BreadcrumbSeparatorProps {
  type: 'chevron' | 'slash' | 'pipe';
  className?: string;
}

function BreadcrumbSeparator({ type, className }: BreadcrumbSeparatorProps) {
  const separatorMap = {
    chevron: <ChevronRight className={cn("h-3 w-3", className)} />,
    slash: <span className={cn("text-muted-foreground", className)}>/</span>,
    pipe: <span className={cn("text-muted-foreground", className)}>|</span>
  };

  return <span className="flex items-center">{separatorMap[type]}</span>;
}

interface CollapsedBreadcrumbsProps {
  items: BreadcrumbItem[];
  maxVisible: number;
  separator: 'chevron' | 'slash' | 'pipe';
  size: 'sm' | 'default' | 'lg';
}

function CollapsedBreadcrumbs({ 
  items, 
  maxVisible, 
  separator, 
  size 
}: CollapsedBreadcrumbsProps) {
  const [showAll, setShowAll] = React.useState(false);
  
  if (items.length <= maxVisible) {
    return null;
  }

  const visibleItems = showAll 
    ? items 
    : [...items.slice(0, 1), ...items.slice(-(maxVisible - 2))];
  
  const hiddenCount = items.length - maxVisible;

  const sizeClasses = {
    sm: 'text-xs px-1 py-0.5',
    default: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <div className="flex items-center space-x-1">
      {!showAll && (
        <>
          {/* First item */}
          <BreadcrumbItem item={visibleItems[0]} size={size} />
          
          {/* Collapsed indicator */}
          <BreadcrumbSeparator type={separator} />
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-auto p-1 text-muted-foreground hover:text-foreground", sizeClasses[size])}
            onClick={() => setShowAll(true)}
            title={`Show ${hiddenCount} hidden items`}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
          <BreadcrumbSeparator type={separator} />
          
          {/* Last few items */}
          {visibleItems.slice(1).map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem item={item} size={size} />
              {index < visibleItems.slice(1).length - 1 && (
                <BreadcrumbSeparator type={separator} />
              )}
            </React.Fragment>
          ))}
        </>
      )}

      {showAll && (
        <>
          {visibleItems.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem item={item} size={size} />
              {index < visibleItems.length - 1 && (
                <BreadcrumbSeparator type={separator} />
              )}
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  );
}

interface BreadcrumbItemProps {
  item: BreadcrumbItem;
  size: 'sm' | 'default' | 'lg';
}

function BreadcrumbItem({ item, size }: BreadcrumbItemProps) {
  const sizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
    lg: 'text-base'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const IconComponent = item.icon;

  const content = (
    <span 
      className={cn(
        "flex items-center space-x-1.5 transition-colors",
        item.isActive 
          ? "text-foreground font-medium" 
          : "text-muted-foreground hover:text-foreground",
        sizeClasses[size]
      )}
    >
      {IconComponent && (
        <IconComponent className={cn(iconSizeClasses[size], "flex-shrink-0")} />
      )}
      <span className="truncate max-w-[120px] sm:max-w-[200px]">
        {item.label}
      </span>
    </span>
  );

  if (item.href && !item.isActive) {
    return (
      <Link 
        href={item.href} 
        className="inline-flex items-center hover:underline transition-colors"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export function Breadcrumb({
  items,
  showHome = true,
  maxItems = 4,
  separator = 'chevron',
  size = 'default',
  className
}: BreadcrumbProps) {
  const pathname = usePathname();
  
  // Use provided items or generate from pathname
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);
  
  // Filter out home if not showing
  const displayItems = showHome 
    ? breadcrumbItems 
    : breadcrumbItems.filter(item => item.href !== '/dashboard');

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center space-x-1", className)}
      role="navigation"
    >
      {displayItems.length <= maxItems ? (
        // Show all items
        displayItems.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem item={item} size={size} />
            {index < displayItems.length - 1 && (
              <BreadcrumbSeparator type={separator} className="mx-2" />
            )}
          </React.Fragment>
        ))
      ) : (
        // Show collapsed version
        <CollapsedBreadcrumbs
          items={displayItems}
          maxVisible={maxItems}
          separator={separator}
          size={size}
        />
      )}
    </nav>
  );
}

// Pre-configured breadcrumb variants
export function DebateBreadcrumb({ 
  conversationId, 
  topicTitle,
  className 
}: { 
  conversationId: string;
  topicTitle?: string;
  className?: string;
}) {
  const items: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Debates', href: '/debate', icon: MessageSquare },
    { 
      label: topicTitle || (conversationId.startsWith('demo-') ? 'Demo Room' : 'Debate Room'),
      isActive: true,
      icon: MessageSquare,
      metadata: { conversationId }
    }
  ];

  return <Breadcrumb items={items} className={className} />;
}

export function ProfileBreadcrumb({ section, className }: { section?: string; className?: string }) {
  const items: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Profile', href: '/profile', icon: User },
    ...(section ? [{ label: section, isActive: true }] : [])
  ];

  return <Breadcrumb items={items} className={className} />;
}

export default Breadcrumb;
