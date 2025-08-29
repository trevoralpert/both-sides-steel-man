'use client';

/**
 * Phase 6 Task 6.1.3: PreparationAccess Component
 * 
 * Access panel for debate preparation materials with previews and quick access
 * Integrates with Phase 4 preparation materials system
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { PreparationMaterials, DebatePosition } from '@/types/debate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PositionBadge } from './PositionBadge';
import { 
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  Target,
  Shield,
  Lightbulb,
  FileText,
  CheckCircle2,
  ArrowRight,
  Zap,
  Users
} from 'lucide-react';

export interface PreparationAccessProps {
  preparationMaterials?: PreparationMaterials;
  userPosition: DebatePosition;
  expanded: boolean;
  onToggle: () => void;
  onAccessPreparation?: () => void;
  showPreview?: boolean;
  className?: string;
}

interface PreparationPreviewProps {
  materials: PreparationMaterials;
  className?: string;
}

function PreparationPreview({ materials, className }: PreparationPreviewProps) {
  const completionStats = {
    keyArguments: materials.keyArguments.length,
    evidenceSources: materials.evidenceSources.length,
    practiceQuestions: materials.practiceQuestions.length,
    preparationTips: materials.preparationTips.length
  };

  const totalItems = Object.values(completionStats).reduce((sum, count) => sum + count, 0);
  const completionPercentage = totalItems > 0 ? 100 : 0; // Mock completion for now

  return (
    <div className={cn("space-y-4", className)}>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-3 bg-accent/30 rounded-lg">
          <Target className="h-4 w-4 mx-auto text-blue-600 mb-1" />
          <p className="text-sm font-medium">{completionStats.keyArguments}</p>
          <p className="text-xs text-muted-foreground">Arguments</p>
        </div>
        
        <div className="text-center p-3 bg-accent/30 rounded-lg">
          <FileText className="h-4 w-4 mx-auto text-green-600 mb-1" />
          <p className="text-sm font-medium">{completionStats.evidenceSources}</p>
          <p className="text-xs text-muted-foreground">Sources</p>
        </div>
        
        <div className="text-center p-3 bg-accent/30 rounded-lg">
          <Lightbulb className="h-4 w-4 mx-auto text-yellow-600 mb-1" />
          <p className="text-sm font-medium">{completionStats.practiceQuestions}</p>
          <p className="text-xs text-muted-foreground">Questions</p>
        </div>
        
        <div className="text-center p-3 bg-accent/30 rounded-lg">
          <Zap className="h-4 w-4 mx-auto text-purple-600 mb-1" />
          <p className="text-sm font-medium">{completionStats.preparationTips}</p>
          <p className="text-xs text-muted-foreground">Tips</p>
        </div>
      </div>

      <Separator />

      {/* Key Arguments Preview */}
      {materials.keyArguments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-sm">Key Arguments Preview</h4>
          </div>
          <div className="space-y-1 pl-6">
            {materials.keyArguments.slice(0, 3).map((argument, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-xs text-muted-foreground mt-1 flex-shrink-0">
                  {index + 1}.
                </span>
                <p className="text-sm text-foreground">
                  {argument.length > 100 ? `${argument.substring(0, 100)}...` : argument}
                </p>
              </div>
            ))}
            {materials.keyArguments.length > 3 && (
              <p className="text-xs text-muted-foreground pl-4">
                +{materials.keyArguments.length - 3} more arguments available
              </p>
            )}
          </div>
        </div>
      )}

      {/* Evidence Sources Preview */}
      {materials.evidenceSources.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-sm">Top Evidence Sources</h4>
            </div>
            <div className="space-y-2 pl-6">
              {materials.evidenceSources
                .sort((a, b) => b.credibilityScore - a.credibilityScore)
                .slice(0, 3)
                .map((source, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="flex items-center space-x-1">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs px-1",
                        source.credibilityScore >= 0.8 ? "border-green-500 text-green-700" :
                        source.credibilityScore >= 0.6 ? "border-yellow-500 text-yellow-700" :
                        "border-gray-500 text-gray-700"
                      )}
                    >
                      {Math.round(source.credibilityScore * 100)}%
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{source.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {source.summary.length > 80 ? `${source.summary.substring(0, 80)}...` : source.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Preparation Timeline Preview */}
      {materials.timelineGuidance.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <h4 className="font-medium text-sm">Preparation Timeline</h4>
            </div>
            <div className="space-y-1 pl-6">
              {materials.timelineGuidance.slice(0, 3).map((phase, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <span className="text-xs font-medium">{phase.duration}min</span>
                  </div>
                  <span className="text-sm text-foreground">{phase.phase}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface EmptyStateProps {
  userPosition: DebatePosition;
  onAccessPreparation?: () => void;
  className?: string;
}

function EmptyState({ userPosition, onAccessPreparation, className }: EmptyStateProps) {
  return (
    <div className={cn("text-center py-6 space-y-3", className)}>
      <div className="mx-auto h-12 w-12 bg-accent rounded-full flex items-center justify-center">
        <BookOpen className="h-6 w-6 text-muted-foreground" />
      </div>
      
      <div className="space-y-1">
        <h4 className="font-medium">Preparation Materials</h4>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          AI-generated arguments, evidence sources, and practice questions for your{' '}
          <PositionBadge position={userPosition} size="xs" className="inline-flex" /> position.
        </p>
      </div>
      
      {onAccessPreparation && (
        <Button onClick={onAccessPreparation} className="mt-4">
          <Zap className="h-4 w-4 mr-2" />
          Generate Preparation Materials
        </Button>
      )}
    </div>
  );
}

export function PreparationAccess({
  preparationMaterials,
  userPosition,
  expanded,
  onToggle,
  onAccessPreparation,
  showPreview = true,
  className
}: PreparationAccessProps) {
  const hasMaterials = Boolean(preparationMaterials);

  return (
    <Card className={cn("border-l-4 border-l-purple-500", className)}>
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto font-medium hover:bg-accent/50"
            aria-expanded={expanded}
            aria-controls="preparation-content"
          >
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-purple-600" />
              <span>Debate Preparation Materials</span>
              <PositionBadge 
                position={userPosition} 
                size="xs" 
                variant="outline" 
              />
              {!expanded && hasMaterials && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Ready
                </Badge>
              )}
            </div>
            
            {expanded ? (
              <ChevronDown className="h-4 w-4 transition-transform" />
            ) : (
              <ChevronRight className="h-4 w-4 transition-transform" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent 
          id="preparation-content"
          className="animate-in slide-in-from-top-1 duration-200"
        >
          <CardContent className="pt-0 pb-4">
            {hasMaterials && showPreview ? (
              <div className="space-y-4">
                <PreparationPreview materials={preparationMaterials} />
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Materials ready for your {userPosition} position</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {onAccessPreparation && (
                      <Button size="sm" onClick={onAccessPreparation}>
                        <span>Open Full Materials</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggle}
                      className="text-xs"
                    >
                      Collapse
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState 
                userPosition={userPosition}
                onAccessPreparation={onAccessPreparation}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default PreparationAccess;
