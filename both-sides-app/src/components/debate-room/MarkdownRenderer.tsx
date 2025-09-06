'use client';

/**
 * Phase 6 Task 6.2.6: Markdown Renderer Component
 * 
 * Advanced markdown rendering with syntax highlighting, link previews,
 * and consistent formatting for debate messages
 */

import React, { useState, useEffect, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Link as LinkIcon, 
  ExternalLink,
  Code,
  Quote,
  List,
  Type,
  Eye,
  Copy,
  Check
} from 'lucide-react';

export interface MarkdownRendererProps {
  content: string;
  enableLinkPreviews?: boolean;
  enableCodeHighlighting?: boolean;
  maxLinkPreviews?: number;
  className?: string;
  compact?: boolean;
  onLinkClick?: (url: string) => void;
}

interface ParsedContent {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link' | 'quote' | 'list' | 'heading' | 'linebreak';
  content: string;
  url?: string;
  level?: number;
  items?: string[];
}

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
  isLoading: boolean;
  error?: string;
}

// Simple markdown parser
function parseMarkdown(text: string): ParsedContent[] {
  const elements: ParsedContent[] = [];
  const lines = text.split('\n');
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    
    // Empty line
    if (line.trim() === '') {
      if (lineIndex < lines.length - 1) {
        elements.push({ type: 'linebreak', content: '\n' });
      }
      continue;
    }
    
    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      elements.push({
        type: 'heading',
        content: headingMatch[2],
        level: headingMatch[1].length
      });
      continue;
    }
    
    // Block quotes
    if (line.startsWith('> ')) {
      const quoteLines = [];
      let currentLine = lineIndex;
      
      while (currentLine < lines.length && lines[currentLine].startsWith('> ')) {
        quoteLines.push(lines[currentLine].substring(2));
        currentLine++;
      }
      
      elements.push({
        type: 'quote',
        content: quoteLines.join('\n')
      });
      
      lineIndex = currentLine - 1;
      continue;
    }
    
    // Lists
    const listMatch = line.match(/^[\-\*\+]\s+(.+)$/);
    if (listMatch) {
      const listItems = [];
      let currentLine = lineIndex;
      
      while (currentLine < lines.length) {
        const itemMatch = lines[currentLine].match(/^[\-\*\+]\s+(.+)$/);
        if (itemMatch) {
          listItems.push(itemMatch[1]);
          currentLine++;
        } else {
          break;
        }
      }
      
      elements.push({
        type: 'list',
        content: '',
        items: listItems
      });
      
      lineIndex = currentLine - 1;
      continue;
    }
    
    // Parse inline elements within the line
    parseInlineElements(line, elements);
    
    // Add line break if not last line
    if (lineIndex < lines.length - 1) {
      elements.push({ type: 'linebreak', content: '\n' });
    }
  }
  
  return elements;
}

function parseInlineElements(text: string, elements: ParsedContent[]) {
  let currentIndex = 0;
  
  while (currentIndex < text.length) {
    // Bold text **text**
    const boldMatch = text.substring(currentIndex).match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      elements.push({
        type: 'bold',
        content: boldMatch[1]
      });
      currentIndex += boldMatch[0].length;
      continue;
    }
    
    // Italic text *text*
    const italicMatch = text.substring(currentIndex).match(/^\*([^*]+)\*/);
    if (italicMatch) {
      elements.push({
        type: 'italic',
        content: italicMatch[1]
      });
      currentIndex += italicMatch[0].length;
      continue;
    }
    
    // Code `code`
    const codeMatch = text.substring(currentIndex).match(/^`([^`]+)`/);
    if (codeMatch) {
      elements.push({
        type: 'code',
        content: codeMatch[1]
      });
      currentIndex += codeMatch[0].length;
      continue;
    }
    
    // Links [text](url) or bare URLs
    const linkMatch = text.substring(currentIndex).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      elements.push({
        type: 'link',
        content: linkMatch[1],
        url: linkMatch[2]
      });
      currentIndex += linkMatch[0].length;
      continue;
    }
    
    // Bare URLs
    const urlMatch = text.substring(currentIndex).match(/^(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      elements.push({
        type: 'link',
        content: urlMatch[1],
        url: urlMatch[1]
      });
      currentIndex += urlMatch[0].length;
      continue;
    }
    
    // Regular text - find next special character
    let textEnd = currentIndex + 1;
    while (textEnd < text.length) {
      const nextChar = text[textEnd];
      if (nextChar === '*' || nextChar === '`' || nextChar === '[' || 
          (nextChar === 'h' && text.substring(textEnd).startsWith('http'))) {
        break;
      }
      textEnd++;
    }
    
    if (textEnd > currentIndex) {
      elements.push({
        type: 'text',
        content: text.substring(currentIndex, textEnd)
      });
      currentIndex = textEnd;
    } else {
      currentIndex++;
    }
  }
}

// Mock link preview fetcher (in real app, this would call an API)
async function fetchLinkPreview(url: string): Promise<LinkPreviewData> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Mock data based on URL
  const domain = new URL(url).hostname;
  
  const mockPreviews: Record<string, Partial<LinkPreviewData>> = {
    'github.com': {
      title: 'GitHub Repository',
      description: 'Code repository and collaboration platform',
      image: '/api/placeholder/300/150'
    },
    'youtube.com': {
      title: 'YouTube Video',
      description: 'Watch this video on YouTube',
      image: '/api/placeholder/300/150'
    },
    'wikipedia.org': {
      title: 'Wikipedia Article',
      description: 'Free encyclopedia article',
      image: '/api/placeholder/300/150'
    }
  };
  
  const mockData = Object.entries(mockPreviews).find(([key]) => domain.includes(key))?.[1] || {
    title: 'Link Preview',
    description: 'External link content'
  };
  
  return {
    url,
    domain,
    isLoading: false,
    ...mockData
  };
}

// Link preview component
function LinkPreview({ url, onError }: { url: string; onError?: (error: string) => void }) {
  const [preview, setPreview] = useState<LinkPreviewData>({
    url,
    isLoading: true
  });
  
  useEffect(() => {
    fetchLinkPreview(url)
      .then(data => setPreview(data))
      .catch(err => {
        setPreview(prev => ({
          ...prev,
          isLoading: false,
          error: err.message
        }));
        onError?.(err.message);
      });
  }, [url, onError]);
  
  if (preview.isLoading) {
    return (
      <Card className="p-3 animate-pulse">
        <div className="flex space-x-3">
          <div className="w-16 h-12 bg-muted rounded" />
          <div className="flex-1 space-y-2">
            <div className="w-3/4 h-3 bg-muted rounded" />
            <div className="w-1/2 h-2 bg-muted rounded" />
          </div>
        </div>
      </Card>
    );
  }
  
  if (preview.error) {
    return (
      <Card className="p-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <div className="flex items-center space-x-2 text-sm text-orange-600">
          <LinkIcon className="h-4 w-4" />
          <span className="truncate">{preview.url}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-3 hover:bg-accent/50 transition-colors cursor-pointer border-l-4 border-l-blue-500">
      <a 
        href={preview.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block"
      >
        <div className="flex space-x-3">
          {preview.image && (
            <img 
              src={preview.image} 
              alt={preview.title} 
              className="w-16 h-12 object-cover rounded flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-sm truncate">
                {preview.title || preview.url}
              </h4>
              <ExternalLink className="h-3 w-3 text-muted-foreground ml-2 flex-shrink-0" />
            </div>
            {preview.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {preview.description}
              </p>
            )}
            {preview.domain && (
              <p className="text-xs text-muted-foreground mt-1">
                {preview.domain}
              </p>
            )}
          </div>
        </div>
      </a>
    </Card>
  );
}

// Code block with copy functionality
function CodeBlock({ code, language, compact }: { code: string; language?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };
  
  if (compact) {
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
        {code}
      </code>
    );
  }
  
  return (
    <Card className="relative">
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center space-x-2">
          <Code className="h-3 w-3" />
          {language && (
            <Badge variant="secondary">
              {language}
            </Badge>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{copied ? 'Copied!' : 'Copy code'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <pre className="p-3 overflow-x-auto text-sm">
        <code className="font-mono">{code}</code>
      </pre>
    </Card>
  );
}

export function MarkdownRenderer({
  content,
  enableLinkPreviews = true,
  enableCodeHighlighting = true,
  maxLinkPreviews = 3,
  className,
  compact = false,
  onLinkClick
}: MarkdownRendererProps) {
  const parsedContent = useMemo(() => parseMarkdown(content), [content]);
  
  // Extract links for preview
  const links = useMemo(() => {
    return parsedContent
      .filter(item => item.type === 'link' && item.url)
      .map(item => item.url!)
      .slice(0, maxLinkPreviews);
  }, [parsedContent, maxLinkPreviews]);
  
  const handleLinkClick = (url: string, event: React.MouseEvent) => {
    if (onLinkClick) {
      event.preventDefault();
      onLinkClick(url);
    }
  };
  
  const renderElement = (element: ParsedContent, index: number) => {
    switch (element.type) {
      case 'text':
        return <span key={index}>{element.content}</span>;
        
      case 'bold':
        return <strong key={index} className="font-semibold">{element.content}</strong>;
        
      case 'italic':
        return <em key={index} className="italic">{element.content}</em>;
        
      case 'code':
        return <CodeBlock key={index} code={element.content} compact={true} />;
        
      case 'link':
        return (
          <a
            key={index}
            href={element.url}
            onClick={(e) => element.url && handleLinkClick(element.url, e)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline decoration-dotted underline-offset-2"
          >
            {element.content}
          </a>
        );
        
      case 'quote':
        return (
          <Card key={index} className="border-l-4 border-l-muted-foreground/30 bg-muted/20">
            <div className="p-3">
              <div className="flex items-start space-x-2">
                <Quote className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-muted-foreground">
                  {element.content.split('\n').map((line, lineIndex) => (
                    <p key={lineIndex}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );
        
      case 'list':
        return (
          <div key={index} className="my-2">
            <ul className="list-disc list-inside space-y-1">
              {element.items?.map((item, itemIndex) => (
                <li key={itemIndex} className="text-sm">{item}</li>
              ))}
            </ul>
          </div>
        );
        
      case 'heading':
        const HeadingTag = `h${Math.min(element.level || 1, 6)}` as any;
        const headingClasses = {
          1: 'text-2xl font-bold',
          2: 'text-xl font-semibold', 
          3: 'text-lg font-semibold',
          4: 'text-base font-semibold',
          5: 'text-sm font-semibold',
          6: 'text-sm font-medium'
        }[element.level || 1] || 'text-base font-medium';
        
        return (
          <HeadingTag key={index} className={cn("my-2", headingClasses)}>
            {element.content}
          </HeadingTag>
        );
        
      case 'linebreak':
        return <br key={index} />;
        
      default:
        return null;
    }
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      
      {/* Rendered content */}
      <div className={cn(
        "leading-relaxed",
        compact ? "text-sm" : "text-base"
      )}>
        {parsedContent.map(renderElement)}
      </div>
      
      {/* Link previews */}
      {enableLinkPreviews && !compact && links.length > 0 && (
        <div className="space-y-2 mt-3">
          {links.map((url, index) => (
            <LinkPreview 
              key={`${url}-${index}`} 
              url={url}
              onError={(error) => console.warn('Link preview error:', error)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MarkdownRenderer;
