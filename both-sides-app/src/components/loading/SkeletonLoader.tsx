'use client';

/**
 * Phase 6 Task 6.1.6: SkeletonLoader Component
 * 
 * Skeleton loading placeholders that match actual content structure
 * for better perceived performance and UX
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

// Base skeleton component
export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-muted rounded-md",
        animate && "animate-pulse",
        className
      )}
    />
  );
}

// Text skeleton variants
export function SkeletonText({ 
  lines = 1, 
  className,
  animate = true 
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
          animate={animate}
        />
      ))}
    </div>
  );
}

// Avatar skeleton
export function SkeletonAvatar({ 
  size = 'default',
  className,
  animate = true 
}: SkeletonProps & { size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl' }) {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <Skeleton
      className={cn(
        "rounded-full",
        sizeClasses[size],
        className
      )}
      animate={animate}
    />
  );
}

// Button skeleton
export function SkeletonButton({ 
  variant = 'default',
  size = 'default',
  className,
  animate = true 
}: SkeletonProps & { 
  variant?: 'default' | 'small' | 'large';
  size?: 'xs' | 'sm' | 'default' | 'lg';
}) {
  const heightClasses = {
    xs: 'h-6',
    sm: 'h-8',
    default: 'h-10',
    lg: 'h-12'
  };

  const widthClasses = {
    default: 'w-20',
    small: 'w-16',
    large: 'w-32'
  };

  return (
    <Skeleton
      className={cn(
        "rounded-md",
        heightClasses[size],
        widthClasses[variant],
        className
      )}
      animate={animate}
    />
  );
}

// Card skeleton
export function SkeletonCard({ 
  className,
  animate = true,
  children
}: SkeletonProps & { children?: React.ReactNode }) {
  return (
    <Card className={cn("p-6", className)}>
      {children || (
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" animate={animate} />
            <SkeletonText lines={2} animate={animate} />
          </div>
          <div className="flex space-x-2">
            <SkeletonButton animate={animate} />
            <SkeletonButton variant="small" animate={animate} />
          </div>
        </div>
      )}
    </Card>
  );
}

// Message skeleton for debate rooms
export function SkeletonMessage({ 
  isOwn = false,
  showAvatar = true,
  className,
  animate = true 
}: SkeletonProps & { 
  isOwn?: boolean;
  showAvatar?: boolean;
}) {
  return (
    <div className={cn(
      "flex py-3",
      isOwn ? "justify-end" : "justify-start",
      className
    )}>
      <div className={cn(
        "flex space-x-3 max-w-[75%]",
        isOwn && "flex-row-reverse space-x-reverse"
      )}>
        {showAvatar && (
          <SkeletonAvatar size="sm" animate={animate} />
        )}
        <div className="space-y-2">
          {/* Author and timestamp */}
          <div className={cn(
            "flex items-center space-x-2",
            isOwn && "justify-end"
          )}>
            <Skeleton className="h-3 w-16" animate={animate} />
            <Skeleton className="h-3 w-12" animate={animate} />
          </div>
          {/* Message bubble */}
          <Card className={cn(
            "p-3",
            isOwn ? "bg-primary/10" : "bg-muted/50"
          )}>
            <SkeletonText 
              lines={Math.floor(Math.random() * 3) + 1} 
              animate={animate} 
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

// System message skeleton
export function SkeletonSystemMessage({ 
  className,
  animate = true 
}: SkeletonProps) {
  return (
    <div className={cn("flex justify-center py-2", className)}>
      <div className="max-w-md">
        <Card className="p-3 bg-accent/50 border-dashed">
          <div className="flex items-center justify-center space-x-2">
            <Skeleton className="h-4 w-4 rounded-full" animate={animate} />
            <Skeleton className="h-4 w-32" animate={animate} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// Debate header skeleton
export function SkeletonDebateHeader({ 
  className,
  animate = true 
}: SkeletonProps) {
  return (
    <Card className={cn("rounded-none border-x-0 border-t-0", className)}>
      <div className="py-4 px-6">
        <div className="flex items-center justify-between">
          {/* Topic info */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" animate={animate} />
            <div className="flex space-x-2">
              <Skeleton className="h-4 w-16" animate={animate} />
              <Skeleton className="h-4 w-20" animate={animate} />
            </div>
          </div>
          
          {/* Participants and phase */}
          <div className="flex items-center space-x-4">
            <Skeleton className="h-5 w-24" animate={animate} />
            <div className="flex space-x-1">
              <SkeletonAvatar size="xs" animate={animate} />
              <SkeletonAvatar size="xs" animate={animate} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Participant list skeleton
export function SkeletonParticipantList({ 
  count = 3,
  layout = 'vertical',
  className,
  animate = true 
}: SkeletonProps & { 
  count?: number;
  layout?: 'vertical' | 'horizontal';
}) {
  return (
    <div className={cn(
      layout === 'vertical' ? "space-y-3" : "flex space-x-4",
      className
    )}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <SkeletonAvatar animate={animate} />
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" animate={animate} />
            <Skeleton className="h-3 w-12" animate={animate} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Topic display skeleton
export function SkeletonTopicDisplay({ 
  className,
  animate = true 
}: SkeletonProps) {
  return (
    <Card className={cn("w-full", className)}>
      <div className="p-6 space-y-6">
        {/* Topic header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-3/4" animate={animate} />
              <SkeletonText lines={2} animate={animate} />
            </div>
            <Skeleton className="h-6 w-20 ml-4" animate={animate} />
          </div>
          
          {/* Tags */}
          <div className="flex space-x-2">
            <Skeleton className="h-5 w-16" animate={animate} />
            <Skeleton className="h-5 w-20" animate={animate} />
            <Skeleton className="h-5 w-14" animate={animate} />
          </div>
        </div>

        <Separator />

        {/* Metadata */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Skeleton className="h-4 w-4" animate={animate} />
            <Skeleton className="h-4 w-20" animate={animate} />
          </div>
          <div className="flex items-center space-x-1">
            <Skeleton className="h-4 w-4" animate={animate} />
            <Skeleton className="h-4 w-16" animate={animate} />
          </div>
        </div>

        {/* Context panel skeleton */}
        <Card className="border-l-4 border-l-blue-500">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" animate={animate} />
                <Skeleton className="h-4 w-32" animate={animate} />
              </div>
              <Skeleton className="h-4 w-4" animate={animate} />
            </div>
          </div>
        </Card>
      </div>
    </Card>
  );
}

// Message container skeleton
export function SkeletonMessageContainer({ 
  messageCount = 5,
  className,
  animate = true 
}: SkeletonProps & { messageCount?: number }) {
  const messages = Array.from({ length: messageCount }, (_, i) => ({
    isOwn: Math.random() > 0.5,
    isSystem: i % 4 === 0, // Every 4th message is system
    showAvatar: i === 0 || Math.random() > 0.7
  }));

  return (
    <div className={cn("space-y-4 p-4", className)}>
      {messages.map((msg, i) => (
        msg.isSystem ? (
          <SkeletonSystemMessage key={i} animate={animate} />
        ) : (
          <SkeletonMessage
            key={i}
            isOwn={msg.isOwn}
            showAvatar={msg.showAvatar}
            animate={animate}
          />
        )
      ))}
    </div>
  );
}

// Breadcrumb skeleton
export function SkeletonBreadcrumb({ 
  itemCount = 3,
  className,
  animate = true 
}: SkeletonProps & { itemCount?: number }) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {Array.from({ length: itemCount }, (_, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center space-x-1">
            <Skeleton className="h-4 w-4" animate={animate} />
            <Skeleton className="h-4 w-16" animate={animate} />
          </div>
          {i < itemCount - 1 && (
            <Skeleton className="h-3 w-3" animate={animate} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Complete debate room skeleton
export function SkeletonDebateRoom({ 
  className,
  animate = true 
}: SkeletonProps) {
  return (
    <div className={cn("h-screen flex flex-col", className)}>
      {/* Header */}
      <SkeletonDebateHeader animate={animate} />
      
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <SkeletonMessageContainer animate={animate} />
        </div>
        
        {/* Sidebar */}
        <div className="w-1/3 border-l p-4 space-y-4">
          <div className="flex space-x-2 border-b pb-2">
            <Skeleton className="h-8 w-16" animate={animate} />
            <Skeleton className="h-8 w-20" animate={animate} />
          </div>
          <SkeletonTopicDisplay animate={animate} />
        </div>
      </div>
      
      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="flex-1 h-10" animate={animate} />
          <SkeletonButton animate={animate} />
        </div>
      </div>
    </div>
  );
}

// Profile skeleton
export function SkeletonProfile({ 
  className,
  animate = true 
}: SkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Profile header */}
      <Card className="p-6">
        <div className="flex items-start space-x-4">
          <SkeletonAvatar size="xl" animate={animate} />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-32" animate={animate} />
            <Skeleton className="h-4 w-48" animate={animate} />
            <div className="flex space-x-2 pt-2">
              <Skeleton className="h-5 w-16" animate={animate} />
              <Skeleton className="h-5 w-20" animate={animate} />
            </div>
          </div>
        </div>
      </Card>

      {/* Profile sections */}
      {Array.from({ length: 3 }, (_, i) => (
        <SkeletonCard key={i} animate={animate} />
      ))}
    </div>
  );
}

export default Skeleton;
