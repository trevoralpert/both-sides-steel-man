'use client';

/**
 * Phase 6 Task 6.1.3: ContextPanel Component
 * 
 * Expandable panel for displaying topic background information, sources, and context
 * Includes smooth animations and accessibility features
 */

import React from 'react';

import { cn } from '@/lib/utils';
import { DebateTopic } from '@/types/debate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight,
  Info,
  ExternalLink,
  BookOpen,
  Globe,
  FileText,
  Lightbulb,
  AlertCircle
} from 'lucide-react';

export interface ContextPanelProps {
  topic: DebateTopic;
  expanded: boolean;
  onToggle: () => void;
  showSources?: boolean;
  className?: string;
}

interface SourceListProps {
  sources: string[];
  className?: string;
}

function SourceList({ sources, className }: SourceListProps) {
  const formatUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
  };

  const isUrl = (source: string) => {
    try {
      new URL(source);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center space-x-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">Sources & References</h4>
      </div>
      
      <div className="space-y-2 pl-6">
        {sources.map((source, index) => (
          <div key={index} className="flex items-start space-x-2">
            <span className="text-xs text-muted-foreground mt-1 flex-shrink-0">
              {index + 1}.
            </span>
            
            {isUrl(source) ? (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center space-x-1 group"
              >
                <Globe className="h-3 w-3 flex-shrink-0" />
                <span className="break-all">{formatUrl(source)}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </a>
            ) : (
              <div className="flex items-start space-x-1">
                <FileText className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{source}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface BackgroundSectionProps {
  content: string;
  className?: string;
}

function BackgroundSection({ content, className }: BackgroundSectionProps) {
  // Split content into paragraphs for better formatting
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center space-x-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">Background Information</h4>
      </div>
      
      <div className="space-y-3 pl-6">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-sm text-foreground leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

interface ContextStatsProps {
  topic: DebateTopic;
  className?: string;
}

function ContextStats({ topic, className }: ContextStatsProps) {
  const stats = [
    { label: 'Category', value: topic.category, icon: FileText },
    { label: 'Difficulty', value: topic.difficulty, icon: TrendingUp },
    { 
      label: 'Sources', 
      value: topic.sources ? `${topic.sources.length} references` : 'No sources', 
      icon: BookOpen 
    },
    {
      label: 'Tags',
      value: topic.tags ? `${topic.tags.length} topics` : 'No tags',
      icon: Tag
    }
  ].filter(stat => stat.value !== 'No sources' && stat.value !== 'No tags');

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className="text-center p-2 bg-accent/30 rounded-lg">
            <IconComponent className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs font-medium">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// Import missing icons
import { TrendingUp, Tag } from 'lucide-react';

export function ContextPanel({
  topic,
  expanded,
  onToggle,
  showSources = true,
  className
}: ContextPanelProps) {
  const hasBackgroundInfo = Boolean(topic.backgroundInfo);
  const hasSources = Boolean(topic.sources && topic.sources.length > 0);
  const hasContent = hasBackgroundInfo || hasSources;

  if (!hasContent) {
    return null;
  }

  return (
    <Card className={cn("border-l-4 border-l-blue-500", className)}>
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto font-medium hover:bg-accent/50"
            aria-expanded={expanded}
            aria-controls="context-content"
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <span>Topic Context & Background</span>
              {!expanded && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {[
                    hasBackgroundInfo && 'Info',
                    hasSources && `${topic.sources?.length} sources`
                  ].filter(Boolean).join(' • ')}
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
          id="context-content"
          className="animate-in slide-in-from-top-1 duration-200"
        >
          <CardContent className="pt-0 pb-4 space-y-6">
            
            {/* Quick Stats */}
            <ContextStats topic={topic} />

            <Separator />

            {/* Background Information */}
            {hasBackgroundInfo && (
              <>
                <BackgroundSection content={topic.backgroundInfo!} />
                {hasSources && <Separator />}
              </>
            )}

            {/* Sources */}
            {showSources && hasSources && (
              <SourceList sources={topic.sources!} />
            )}

            {/* Additional Context Footer */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                <span>Use this context to inform your arguments</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="text-xs"
              >
                Collapse
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default ContextPanel;
