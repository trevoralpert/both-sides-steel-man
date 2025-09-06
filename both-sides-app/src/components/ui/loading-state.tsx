'use client';

import React from 'react';

import { cn } from '@/lib/utils';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  size = 'md', 
  className,
  text = 'Loading...'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-current border-t-transparent',
          sizeClasses[size]
        )}
      />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
};

export { LoadingState };
