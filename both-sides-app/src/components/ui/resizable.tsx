'use client';

import React from 'react';

import { cn } from '@/lib/utils';

interface ResizablePanelGroupProps {
  direction?: 'horizontal' | 'vertical';
  className?: string;
  children: React.ReactNode;
}

export const ResizablePanelGroup: React.FC<ResizablePanelGroupProps> = ({
  direction = 'horizontal',
  className,
  children
}) => {
  return (
    <div
      className={cn(
        'flex h-full',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
      data-direction={direction}
    >
      {children}
    </div>
  );
};

interface ResizablePanelProps {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
  children: React.ReactNode;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  defaultSize = 50,
  minSize = 10,
  maxSize = 90,
  className,
  children
}) => {
  return (
    <div
      className={cn('flex-1 overflow-hidden', className)}
      style={{
        minWidth: `${minSize}%`,
        maxWidth: `${maxSize}%`,
        flexBasis: `${defaultSize}%`
      }}
      data-min-size={minSize}
      data-max-size={maxSize}
      data-default-size={defaultSize}
    >
      {children}
    </div>
  );
};

interface ResizableHandleProps {
  className?: string;
  withHandle?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export const ResizableHandle: React.FC<ResizableHandleProps> = ({
  className,
  withHandle = false,
  orientation = 'horizontal'
}) => {
  return (
    <div
      className={cn(
        'flex-shrink-0 bg-border',
        orientation === 'horizontal' 
          ? 'w-1 cursor-col-resize hover:bg-border/80' 
          : 'h-1 cursor-row-resize hover:bg-border/80',
        withHandle && 'relative',
        className
      )}
      data-orientation={orientation}
    >
      {withHandle && (
        <div
          className={cn(
            'absolute bg-border rounded-sm',
            orientation === 'horizontal'
              ? 'left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2'
              : 'left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2'
          )}
        />
      )}
    </div>
  );
};

// Default export for easier importing
const ResizableComponents = {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
};

export default ResizableComponents;
