'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const Popover: React.FC<{
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}> = ({ children }) => {
  return <>{children}</>;
};

const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(className)}
    {...props}
  />
));
PopoverTrigger.displayName = 'PopoverTrigger';

const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
  }
>(({ className, side = 'bottom', align: _align = 'center', sideOffset: _sideOffset = 4, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in',
      side === 'top' && 'animate-in slide-in-from-bottom-2',
      side === 'right' && 'animate-in slide-in-from-left-2', 
      side === 'bottom' && 'animate-in slide-in-from-top-2',
      side === 'left' && 'animate-in slide-in-from-right-2',
      className
    )}
    {...props}
  />
));
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };
