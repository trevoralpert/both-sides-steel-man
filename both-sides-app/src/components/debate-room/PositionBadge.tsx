'use client';

/**
 * Phase 6 Task 6.1.2: PositionBadge Component
 * 
 * Consistent Pro/Con position badge with customizable styling
 * Includes accessibility features and visual distinction
 */

import React from 'react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DebatePosition } from '@/types/debate';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Check, 
  X,
  Plus,
  Minus
} from 'lucide-react';

export interface PositionBadgeProps {
  position: DebatePosition;
  variant?: 'default' | 'outline' | 'subtle' | 'solid';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  iconType?: 'thumbs' | 'check' | 'plus' | 'none';
  interactive?: boolean;
  selected?: boolean;
  className?: string;
  onClick?: () => void;
}

const positionConfig = {
  PRO: {
    label: 'Pro',
    fullLabel: 'Supporting',
    description: 'In favor of the proposition',
    colors: {
      default: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      outline: 'border-green-500 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/10',
      subtle: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/10 dark:text-green-400 dark:border-green-800/50',
      solid: 'bg-green-600 text-white border-green-600 hover:bg-green-700'
    },
    icons: {
      thumbs: ThumbsUp,
      check: Check,
      plus: Plus
    }
  },
  CON: {
    label: 'Con',
    fullLabel: 'Opposing',
    description: 'Against the proposition',
    colors: {
      default: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      outline: 'border-red-500 text-red-700 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/10',
      subtle: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-800/50',
      solid: 'bg-red-600 text-white border-red-600 hover:bg-red-700'
    },
    icons: {
      thumbs: ThumbsDown,
      check: X,
      plus: Minus
    }
  }
};

const sizeConfig = {
  xs: {
    text: 'text-xs',
    icon: 'h-3 w-3',
    padding: 'px-1.5 py-0.5',
    spacing: 'space-x-1'
  },
  sm: {
    text: 'text-xs',
    icon: 'h-3.5 w-3.5',
    padding: 'px-2 py-0.5',
    spacing: 'space-x-1'
  },
  md: {
    text: 'text-sm',
    icon: 'h-4 w-4',
    padding: 'px-2.5 py-1',
    spacing: 'space-x-1.5'
  },
  lg: {
    text: 'text-base',
    icon: 'h-5 w-5',
    padding: 'px-3 py-1.5',
    spacing: 'space-x-2'
  }
};

export function PositionBadge({
  position,
  variant = 'default',
  size = 'sm',
  showIcon = false,
  iconType = 'thumbs',
  interactive = false,
  selected = false,
  className,
  onClick
}: PositionBadgeProps) {
  const config = positionConfig[position];
  const sizeClasses = sizeConfig[size];
  const colorClasses = config.colors[variant];
  
  const IconComponent = iconType !== 'none' ? config.icons[iconType] : null;

  const badgeClasses = cn(
    "inline-flex items-center font-medium border transition-colors",
    sizeClasses.text,
    sizeClasses.padding,
    showIcon && IconComponent && sizeClasses.spacing,
    colorClasses,
    interactive && [
      "cursor-pointer hover:scale-105 transform transition-transform",
      "focus:outline-none focus:ring-2 focus:ring-offset-2",
      position === 'PRO' ? "focus:ring-green-500" : "focus:ring-red-500"
    ],
    selected && "ring-2 ring-offset-1 shadow-md",
    selected && position === 'PRO' && "ring-green-500",
    selected && position === 'CON' && "ring-red-500",
    className
  );

  const badgeContent = (
    <>
      {showIcon && IconComponent && (
        <IconComponent 
          className={sizeClasses.icon} 
          aria-hidden="true"
        />
      )}
      <span>{config.label}</span>
    </>
  );

  if (interactive || onClick) {
    return (
      <button
        onClick={onClick}
        className={badgeClasses}
        title={`${config.fullLabel} - ${config.description}`}
        aria-label={`${config.fullLabel} position`}
        aria-pressed={selected}
        type="button"
      >
        {badgeContent}
      </button>
    );
  }

  return (
    <Badge 
      className={badgeClasses}
      title={`${config.fullLabel} - ${config.description}`}
      aria-label={`${config.fullLabel} position`}
    >
      {badgeContent}
    </Badge>
  );
}

// Helper component for position selection
export interface PositionSelectorProps {
  selectedPosition?: DebatePosition;
  onPositionChange: (position: DebatePosition) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'subtle' | 'solid';
  showIcons?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PositionSelector({
  selectedPosition,
  onPositionChange,
  size = 'md',
  variant = 'outline',
  showIcons = true,
  disabled = false,
  className
}: PositionSelectorProps) {
  return (
    <div 
      className={cn(
        "flex items-center space-x-2",
        className
      )}
      role="radiogroup"
      aria-label="Select debate position"
    >
      <PositionBadge
        position="PRO"
        variant={variant}
        size={size}
        showIcon={showIcons}
        interactive={!disabled}
        selected={selectedPosition === 'PRO'}
        onClick={() => !disabled && onPositionChange('PRO')}
      />
      
      <PositionBadge
        position="CON"
        variant={variant}
        size={size}
        showIcon={showIcons}
        interactive={!disabled}
        selected={selectedPosition === 'CON'}
        onClick={() => !disabled && onPositionChange('CON')}
      />
    </div>
  );
}

// Helper component for comparing positions
export interface PositionComparisonProps {
  proLabel?: string;
  conLabel?: string;
  proCount?: number;
  conCount?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCounts?: boolean;
  className?: string;
}

export function PositionComparison({
  proLabel = 'Supporting',
  conLabel = 'Opposing',
  proCount,
  conCount,
  size = 'sm',
  showCounts = false,
  className
}: PositionComparisonProps) {
  return (
    <div 
      className={cn(
        "flex items-center justify-between space-x-4",
        className
      )}
      role="group"
      aria-label="Position comparison"
    >
      <div className="flex items-center space-x-2">
        <PositionBadge 
          position="PRO" 
          size={size} 
          showIcon={true}
        />
        <span className="text-sm text-muted-foreground">
          {proLabel}
          {showCounts && proCount !== undefined && (
            <span className="ml-1 font-medium">({proCount})</span>
          )}
        </span>
      </div>
      
      <div className="h-px bg-border flex-1 mx-4" />
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">
          {conLabel}
          {showCounts && conCount !== undefined && (
            <span className="ml-1 font-medium">({conCount})</span>
          )}
        </span>
        <PositionBadge 
          position="CON" 
          size={size} 
          showIcon={true}
        />
      </div>
    </div>
  );
}

export default PositionBadge;
