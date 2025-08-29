'use client';

/**
 * Phase 6 Task 6.2.6: Link Preview Component
 * 
 * Standalone link preview component for generating automatic previews
 * of shared links with rich metadata display
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ExternalLink,
  LinkIcon,
  X,
  Globe,
  Clock,
  User,
  Eye,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';

export interface LinkPreviewProps {
  url: string;
  onRemove?: () => void;
  compact?: boolean;
  showRemoveButton?: boolean;
  showFavicon?: boolean;
  showMetadata?: boolean;
  className?: string;
  onError?: (error: string) => void;
  onLoad?: (data: LinkPreviewData) => void;
}

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  domain?: string;
  favicon?: string;
  author?: string;
  publishedTime?: string;
  type?: 'website' | 'article' | 'video' | 'image';
  isLoading: boolean;
  error?: string;
}

// Mock link preview data for different domains
const MOCK_LINK_DATA: Record<string, Partial<LinkPreviewData>> = {
  'github.com': {
    title: 'GitHub - The complete developer platform',
    description: 'GitHub is where over 94 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, and review code.',
    image: '/api/placeholder/600/315',
    siteName: 'GitHub',
    favicon: '🐙',
    type: 'website'
  },
  'youtube.com': {
    title: 'Educational Video Content',
    description: 'Watch educational videos and tutorials on various topics.',
    image: '/api/placeholder/600/315',
    siteName: 'YouTube',
    favicon: '📺',
    type: 'video'
  },
  'wikipedia.org': {
    title: 'Wikipedia Article',
    description: 'Free encyclopedia with millions of articles written collaboratively by people all around the world.',
    image: '/api/placeholder/600/315',
    siteName: 'Wikipedia',
    favicon: '📚',
    type: 'article',
    author: 'Wikipedia Contributors'
  },
  'medium.com': {
    title: 'Insightful Article on Technology',
    description: 'A comprehensive analysis of modern technological trends and their impact on society.',
    image: '/api/placeholder/600/315',
    siteName: 'Medium',
    favicon: '📝',
    type: 'article',
    author: 'Tech Writer',
    publishedTime: '2024-01-15'
  },
  'stackoverflow.com': {
    title: 'Programming Question & Answer',
    description: 'Stack Overflow is a question and answer site for professional and enthusiast programmers.',
    image: '/api/placeholder/600/315',
    siteName: 'Stack Overflow',
    favicon: '💻',
    type: 'website'
  },
  'twitter.com': {
    title: 'Social Media Post',
    description: 'Latest updates and discussions from the community.',
    siteName: 'Twitter',
    favicon: '🐦',
    type: 'website'
  },
  'linkedin.com': {
    title: 'Professional Network Post',
    description: 'Professional networking and career development discussions.',
    siteName: 'LinkedIn',
    favicon: '💼',
    type: 'website'
  }
};

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Mock fetch function for link preview data
async function fetchLinkPreview(url: string): Promise<LinkPreviewData> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  const domain = extractDomain(url);
  
  // Find matching mock data
  const mockData = Object.entries(MOCK_LINK_DATA).find(([key]) => 
    domain.includes(key)
  )?.[1];
  
  // Default fallback data
  const fallbackData: Partial<LinkPreviewData> = {
    title: domain.charAt(0).toUpperCase() + domain.slice(1),
    description: 'External link',
    siteName: domain,
    favicon: '🌐',
    type: 'website'
  };
  
  return {
    url,
    domain,
    isLoading: false,
    ...(mockData || fallbackData)
  };
}

// Format publish time
function formatPublishTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

// Get type icon
function getTypeIcon(type?: string) {
  switch (type) {
    case 'video': return '🎥';
    case 'article': return '📄';
    case 'image': return '🖼️';
    default: return '🌐';
  }
}

export function LinkPreview({
  url,
  onRemove,
  compact = false,
  showRemoveButton = true,
  showFavicon = true,
  showMetadata = true,
  className,
  onError,
  onLoad
}: LinkPreviewProps) {
  const [data, setData] = useState<LinkPreviewData>({
    url,
    isLoading: true
  });
  
  // Fetch link preview data
  useEffect(() => {
    let cancelled = false;
    
    fetchLinkPreview(url)
      .then(result => {
        if (cancelled) return;
        setData(result);
        onLoad?.(result);
      })
      .catch(error => {
        if (cancelled) return;
        const errorData: LinkPreviewData = {
          url,
          domain: extractDomain(url),
          isLoading: false,
          error: error.message
        };
        setData(errorData);
        onError?.(error.message);
      });
    
    return () => {
      cancelled = true;
    };
  }, [url, onError, onLoad]);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Allow middle click and ctrl+click to open in new tab
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // For normal clicks, ensure it opens in new tab
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);
  
  // Loading state
  if (data.isLoading) {
    return (
      <Card className={cn(
        "overflow-hidden transition-all duration-200",
        compact ? "max-w-sm" : "max-w-lg",
        className
      )}>
        <CardContent className="p-3">
          <div className="flex space-x-3">
            <Skeleton className={cn(
              "rounded flex-shrink-0",
              compact ? "w-12 h-9" : "w-16 h-12"
            )} />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-full h-3" />
              {!compact && <Skeleton className="w-2/3 h-3" />}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (data.error) {
    return (
      <Card className={cn(
        "border-orange-200 bg-orange-50 dark:bg-orange-950/20 overflow-hidden",
        className
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="text-sm text-orange-700 dark:text-orange-300 truncate">
                {data.domain || url}
              </span>
              <ExternalLink className="h-3 w-3 text-orange-500 flex-shrink-0" />
            </div>
            {showRemoveButton && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  onRemove();
                }}
                className="h-6 w-6 p-0 ml-2 flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Success state
  return (
    <Card 
      className={cn(
        "overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 border-l-blue-500 hover:border-l-blue-600",
        compact ? "max-w-sm" : "max-w-lg",
        className
      )}
    >
      <CardContent className="p-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="block hover:bg-accent/50 transition-colors"
        >
          <div className="p-3">
            <div className="flex space-x-3">
              
              {/* Image/Favicon */}
              <div className={cn(
                "flex-shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center",
                compact ? "w-12 h-9" : "w-16 h-12"
              )}>
                {data.image ? (
                  <img
                    src={data.image}
                    alt={data.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : showFavicon && data.favicon ? (
                  <span className={cn(
                    "text-center",
                    compact ? "text-lg" : "text-xl"
                  )}>
                    {data.favicon}
                  </span>
                ) : (
                  <LinkIcon className={cn(
                    "text-muted-foreground",
                    compact ? "h-4 w-4" : "h-5 w-5"
                  )} />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    
                    {/* Title */}
                    <h4 className={cn(
                      "font-medium line-clamp-2 group-hover:text-blue-600",
                      compact ? "text-sm" : "text-sm"
                    )}>
                      {data.title || data.domain || url}
                    </h4>
                    
                    {/* Description */}
                    {data.description && !compact && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {data.description}
                      </p>
                    )}
                    
                    {/* Metadata */}
                    {showMetadata && (
                      <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
                        
                        {/* Site name */}
                        <div className="flex items-center space-x-1">
                          <Globe className="h-3 w-3" />
                          <span className="truncate max-w-24">
                            {data.siteName || data.domain}
                          </span>
                        </div>
                        
                        {/* Type badge */}
                        {data.type && data.type !== 'website' && (
                          <Badge variant="secondary" className="text-xs h-4">
                            {getTypeIcon(data.type)} {data.type}
                          </Badge>
                        )}
                        
                        {/* Author */}
                        {data.author && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-20">{data.author}</span>
                          </div>
                        )}
                        
                        {/* Publish time */}
                        {data.publishedTime && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatPublishTime(data.publishedTime)}</span>
                          </div>
                        )}
                        
                      </div>
                    )}
                    
                  </div>
                  
                  {/* Remove button */}
                  {showRemoveButton && onRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove();
                      }}
                      className="h-6 w-6 p-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  
                </div>
              </div>
              
            </div>
          </div>
        </a>
        
        {/* External link indicator */}
        <div className="absolute top-2 right-2 opacity-60">
          <ExternalLink className="h-3 w-3" />
        </div>
        
      </CardContent>
    </Card>
  );
}

export default LinkPreview;
