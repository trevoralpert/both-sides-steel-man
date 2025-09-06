'use client';

/**
 * Phase 6 Task 6.1.3: TopicDisplay Component
 * 
 * Comprehensive topic presentation with context panels and preparation materials
 * Includes user position display and expandable background information
 */

import React, { useState } from 'react';

import { cn } from '@/lib/utils';
import { TopicDisplayProps } from '@/types/debate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Info,
  BookOpen
} from 'lucide-react';

import { TopicHeader } from './TopicHeader';
import { ContextPanel } from './ContextPanel';
import { PreparationAccess } from './PreparationAccess';
import { PositionBadge } from './PositionBadge';

export function TopicDisplay({
  topic,
  userPosition,
  preparationMaterials,
  showPreparationAccess = true,
  showContextPanel = true,
  onAccessPreparation,
  className
}: TopicDisplayProps) {
  const [contextExpanded, setContextExpanded] = useState(false);
  const [preparationExpanded, setPreparationExpanded] = useState(false);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <TopicHeader 
          topic={topic}
          userPosition={userPosition}
        />
      </CardHeader>

      <CardContent className="space-y-4">
        
        {/* Context Panel */}
        {showContextPanel && topic.backgroundInfo && (
          <ContextPanel
            topic={topic}
            expanded={contextExpanded}
            onToggle={() => setContextExpanded(!contextExpanded)}
          />
        )}

        {/* Preparation Materials Access */}
        {showPreparationAccess && (
          <PreparationAccess
            preparationMaterials={preparationMaterials}
            userPosition={userPosition}
            expanded={preparationExpanded}
            onToggle={() => setPreparationExpanded(!preparationExpanded)}
            onAccessPreparation={onAccessPreparation}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default TopicDisplay;
