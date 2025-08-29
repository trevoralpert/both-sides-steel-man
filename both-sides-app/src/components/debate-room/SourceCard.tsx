'use client';

/**
 * Phase 6 Task 6.4.3: Source Card Component
 * 
 * Individual source display with credibility rating, verification status,
 * and quick citation/insertion functionality
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { EvidenceSource } from './EvidencePanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield, 
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Star,
  StarOff,
  Copy,
  Quote,
  Calendar,
  User,
  Globe,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Link,
  Plus,
  Eye,
  Download,
  Share
} from 'lucide-react';

export interface SourceCardProps {
  source: EvidenceSource;
  isBookmarked?: boolean;
  isExpanded?: boolean;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  onBookmarkToggle?: (sourceId: string) => void;
  onCiteSource?: (source: EvidenceSource) => void;
  onInsertReference?: (source: EvidenceSource) => void;
  onViewDetails?: (source: EvidenceSource) => void;
  className?: string;
}

// Source type configurations
const sourceTypeConfig = {
  'academic': {
    label: 'Academic',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: FileText,
    description: 'Peer-reviewed research'
  },
  'news': {
    label: 'News',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: Globe,
    description: 'News publication'
  },
  'government': {
    label: 'Government',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Shield,
    description: 'Official government source'
  },
  'organization': {
    label: 'Organization',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: User,
    description: 'Professional organization'
  },
  'expert': {
    label: 'Expert',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    icon: User,
    description: 'Expert opinion'
  },
  'book': {
    label: 'Book',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: FileText,
    description: 'Published book'
  }
} as const;

export function SourceCard({
  source,
  isBookmarked = false,
  isExpanded: initialExpanded = false,
  showActions = true,
  variant = 'default',
  onBookmarkToggle,
  onCiteSource,
  onInsertReference,
  onViewDetails,
  className
}: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [copied, setCopied] = useState(false);

  const typeConfig = sourceTypeConfig[source.sourceType];
  const TypeIcon = typeConfig.icon;

  // Handle copy citation
  const handleCopyCitation = useCallback(async () => {
    const citation = `${source.author}. (${source.publishDate.getFullYear()}). ${source.title}. ${source.publication}.`;
    
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy citation:', error);
    }
  }, [source]);

  // Get credibility color and icon
  const getCredibilityDisplay = () => {
    const score = source.credibilityScore;
    if (score >= 0.9) {
      return {
        color: 'text-green-700 bg-green-100 border-green-300',
        icon: ShieldCheck,
        label: 'Highly Credible',
        description: 'Excellent source reliability'
      };
    }
    if (score >= 0.7) {
      return {
        color: 'text-blue-700 bg-blue-100 border-blue-300',
        icon: Shield,
        label: 'Credible',
        description: 'Good source reliability'
      };
    }
    if (score >= 0.5) {
      return {
        color: 'text-amber-700 bg-amber-100 border-amber-300',
        icon: ShieldAlert,
        label: 'Moderate',
        description: 'Some reliability concerns'
      };
    }
    return {
      color: 'text-red-700 bg-red-100 border-red-300',
      icon: ShieldAlert,
      label: 'Low Credibility',
      description: 'Significant reliability concerns'
    };
  };

  const credibilityDisplay = getCredibilityDisplay();
  const CredibilityIcon = credibilityDisplay.icon;

  // Get position color
  const getPositionColor = () => {
    switch (source.position) {
      case 'PRO': return 'text-green-700 bg-green-100';
      case 'CON': return 'text-red-700 bg-red-100';
      case 'NEUTRAL': return 'text-blue-700 bg-blue-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={cn("transition-all duration-200 hover:shadow-sm", className)}>
        <CardContent className="p-3">
          <div className="flex items-start space-x-3">
            <div className={cn("p-1.5 rounded", typeConfig.color)}>
              <TypeIcon className="h-3 w-3" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-sm truncate">
                  {source.title}
                </h4>
                <Badge className={cn("text-xs", credibilityDisplay.color)}>
                  {Math.round(source.credibilityScore * 100)}%
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {source.publication} • {source.publishDate.getFullYear()}
              </p>
            </div>

            {showActions && (
              <div className="flex items-center space-x-1">
                {onCiteSource && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCiteSource(source)}
                    className="h-6 w-6 p-0"
                  >
                    <Quote className="h-3 w-3" />
                  </Button>
                )}
                
                {onBookmarkToggle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onBookmarkToggle(source.id)}
                    className="h-6 w-6 p-0"
                  >
                    {isBookmarked ? (
                      <Star className="h-3 w-3 text-amber-500 fill-current" />
                    ) : (
                      <StarOff className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default and detailed variants
  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      source.verified && "ring-1 ring-green-200",
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className={cn("p-2 rounded-lg", typeConfig.color)}>
                <TypeIcon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {typeConfig.label}
                  </Badge>
                  
                  <Badge className={cn("text-xs", getPositionColor())}>
                    {source.position}
                  </Badge>
                  
                  {source.verified && (
                    <Badge className="text-xs bg-green-100 text-green-800">
                      <CheckCircle2 className="h-2 w-2 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-base leading-tight mb-1">
                  {source.title}
                </h3>
                
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {source.author}
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <Globe className="h-3 w-3 mr-1" />
                    {source.publication}
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {source.publishDate.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {showActions && onBookmarkToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBookmarkToggle(source.id)}
                className="h-8 w-8 p-0 ml-2"
              >
                {isBookmarked ? (
                  <Star className="h-4 w-4 text-amber-500 fill-current" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Credibility and Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CredibilityIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Credibility</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Badge className={cn("text-xs", credibilityDisplay.color)}>
                    {credibilityDisplay.label}
                  </Badge>
                  <span className="text-sm font-medium">
                    {Math.round(source.credibilityScore * 100)}%
                  </span>
                </div>
                <Progress 
                  value={source.credibilityScore * 100} 
                  className="h-1.5"
                />
                <p className="text-xs text-muted-foreground">
                  {credibilityDisplay.description}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Relevance</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    Context Match
                  </Badge>
                  <span className="text-sm font-medium">
                    {Math.round(source.relevanceScore * 100)}%
                  </span>
                </div>
                <Progress 
                  value={source.relevanceScore * 100} 
                  className="h-1.5"
                />
              </div>
            </div>
          </div>

          {/* Excerpt */}
          <div className="bg-muted/30 p-3 rounded-lg border-l-2 border-blue-200">
            <Quote className="h-3 w-3 text-blue-500 mb-1" />
            <p className="text-sm leading-relaxed">
              {source.excerpt}
            </p>
          </div>

          {/* Tags */}
          {source.tags && source.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {source.tags.slice(0, 5).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {source.tags.length > 5 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  +{source.tags.length - 5} more
                </Badge>
              )}
            </div>
          )}

          {/* Expandable Details */}
          {variant === 'detailed' && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <span>More Details</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Source Type:</span>
                    <p className="text-muted-foreground">{typeConfig.description}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium">Last Verified:</span>
                    <p className="text-muted-foreground">
                      {source.lastVerified?.toLocaleDateString() || 'Not verified'}
                    </p>
                  </div>
                </div>
                
                {source.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(source.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    View Original Source
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCitation}
                  className="h-8 px-2 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {copied ? 'Copied!' : 'Copy Citation'}
                </Button>
                
                {source.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(source.url, '_blank')}
                    className="h-8 px-2 text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                )}
                
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(source)}
                    className="h-8 px-2 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {onCiteSource && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCiteSource(source)}
                    className="h-8 px-3 text-xs"
                  >
                    <Quote className="h-3 w-3 mr-1" />
                    Cite
                  </Button>
                )}
                
                {onInsertReference && (
                  <Button
                    size="sm"
                    onClick={() => onInsertReference(source)}
                    className="h-8 px-3 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Insert
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default SourceCard;
