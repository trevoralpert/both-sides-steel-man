'use client';

/**
 * Phase 6 Task 6.1.3: TopicHeader Component
 * 
 * Main topic display with title, description, metadata, and user position
 * Clean visual hierarchy with proper spacing and accessibility
 */

import React from 'react';

import { cn } from '@/lib/utils';
import { DebateTopic, DebatePosition } from '@/types/debate';
import { CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Tag, 
  BookOpen, 
  TrendingUp,
  Shield,
  Target,
  User
} from 'lucide-react';

import { PositionBadge } from './PositionBadge';

export interface TopicHeaderProps {
  topic: DebateTopic;
  userPosition: DebatePosition;
  showMetadata?: boolean;
  className?: string;
}

interface DifficultyIndicatorProps {
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  className?: string;
}

function DifficultyIndicator({ difficulty, className }: DifficultyIndicatorProps) {
  const config = {
    BEGINNER: {
      color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400',
      icon: Shield,
      label: 'Beginner Friendly'
    },
    INTERMEDIATE: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
      icon: Target,
      label: 'Intermediate Level'
    },
    ADVANCED: {
      color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400',
      icon: TrendingUp,
      label: 'Advanced Topic'
    }
  };

  const { color, icon: IconComponent, label } = config[difficulty];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center space-x-1",
        color,
        className
      )}
      title={label}
    >
      <IconComponent className="h-3 w-3" />
      <span>{difficulty}</span>
    </Badge>
  );
}

interface UserPositionDisplayProps {
  position: DebatePosition;
  className?: string;
}

function UserPositionDisplay({ position, className }: UserPositionDisplayProps) {
  const positionText = position === 'PRO' ? 'Supporting' : 'Opposing';
  const description = position === 'PRO' 
    ? 'You will argue in favor of this proposition'
    : 'You will argue against this proposition';

  return (
    <div 
      className={cn("flex items-center space-x-3", className)}
      role="group"
      aria-label={`Your assigned position: ${positionText}`}
    >
      <div className="flex items-center space-x-1.5">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Your Position:</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <PositionBadge 
          position={position}
          variant="default"
          size="sm"
          showIcon={true}
        />
        <span className="text-sm text-muted-foreground">
          {positionText}
        </span>
      </div>
    </div>
  );
}

interface TopicMetadataProps {
  topic: DebateTopic;
  className?: string;
}

function TopicMetadata({ topic, className }: TopicMetadataProps) {
  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Variable';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  return (
    <div 
      className={cn(
        "flex flex-wrap items-center gap-4 text-sm text-muted-foreground",
        className
      )}
    >
      {/* Category */}
      <div className="flex items-center space-x-1">
        <Tag className="h-3.5 w-3.5" />
        <span>{topic.category}</span>
      </div>

      {/* Duration */}
      {topic.estimatedDuration && (
        <div className="flex items-center space-x-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDuration(topic.estimatedDuration)} debate</span>
        </div>
      )}

      {/* Sources count */}
      {topic.sources && topic.sources.length > 0 && (
        <div className="flex items-center space-x-1">
          <BookOpen className="h-3.5 w-3.5" />
          <span>{topic.sources.length} source{topic.sources.length > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}

export function TopicHeader({
  topic,
  userPosition,
  showMetadata = true,
  className
}: TopicHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      
      {/* Main Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle 
              className="text-xl sm:text-2xl leading-tight"
              id="topic-title"
            >
              {topic.title}
            </CardTitle>
            
            {topic.description && (
              <p className="text-muted-foreground mt-2 leading-relaxed">
                {topic.description}
              </p>
            )}
          </div>

          {/* Difficulty Badge */}
          <DifficultyIndicator 
            difficulty={topic.difficulty}
            className="flex-shrink-0"
          />
        </div>

        {/* Tags */}
        {topic.tags && topic.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topic.tags.map((tag, index) => (
              <Badge 
                key={index}
                variant="secondary" 
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      {showMetadata && (
        <>
          <Separator />
          <TopicMetadata topic={topic} />
        </>
      )}

      {/* User Position */}
      <div className="bg-accent/50 rounded-lg p-4 border">
        <UserPositionDisplay position={userPosition} />
      </div>
    </div>
  );
}

export default TopicHeader;
