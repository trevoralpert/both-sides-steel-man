'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const TooltipProvider: React.FC<{
  children: React.ReactNode;
  delayDuration?: number;
}> = ({ children, delayDuration: _delayDuration = 700 }) => {
  return <>{children}</>;
};

interface TooltipProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  return <>{children}</>;
};

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(className)}
    {...props}
  />
));
TooltipTrigger.displayName = 'TooltipTrigger';

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
  }
>(({ className, side = 'top', align: _align = 'center', sideOffset: _sideOffset = 4, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
      side === 'top' && 'animate-in slide-in-from-bottom-2',
      side === 'right' && 'animate-in slide-in-from-left-2',
      side === 'bottom' && 'animate-in slide-in-from-top-2',
      side === 'left' && 'animate-in slide-in-from-right-2',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
