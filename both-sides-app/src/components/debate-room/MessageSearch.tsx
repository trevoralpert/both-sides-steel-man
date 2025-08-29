'use client';

/**
 * Phase 6 Task 6.2.5: Message Search Component
 * 
 * Search within conversation with highlighting, filtering,
 * and quick navigation to search results
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/debate';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Search,
  X,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Calendar,
  User,
  Filter,
  Loader2,
  ArrowUpDown,
  Clock
} from 'lucide-react';

export interface MessageSearchProps {
  searchQuery: string;
  searchResults: Message[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onClear: () => void;
  onJumpToMessage: (messageId: string) => void;
  participantMap: Record<string, {
    name: string;
    avatar?: string;
    position?: 'PRO' | 'CON';
  }>;
  className?: string;
}

interface SearchFilters {
  author?: string;
  dateFrom?: Date;
  dateTo?: Date;
  phase?: string;
  messageType?: 'USER' | 'SYSTEM' | 'AI_COACHING';
}

interface SearchResultItemProps {
  message: Message;
  searchQuery: string;
  participantName: string;
  position?: 'PRO' | 'CON';
  onJumpTo: (messageId: string) => void;
  className?: string;
}

// Highlight search terms in text
function highlightSearchTerms(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
        {part}
      </mark>
    ) : part
  );
}

// Individual search result item
function SearchResultItem({
  message,
  searchQuery,
  participantName,
  position,
  onJumpTo,
  className
}: SearchResultItemProps) {
  const handleClick = () => {
    onJumpTo(message.id);
  };
  
  // Truncate long messages
  const maxLength = 150;
  const truncatedContent = message.content.length > maxLength 
    ? message.content.substring(0, maxLength) + '...'
    : message.content;
  
  return (
    <Card 
      className={cn(
        "p-3 cursor-pointer hover:bg-accent/50 transition-colors border-l-4",
        position === 'PRO' ? 'border-l-green-500' : 'border-l-red-500',
        className
      )}
      onClick={handleClick}
    >
      <div className="space-y-2">
        {/* Header with author and timestamp */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <User className="h-3 w-3" />
            <span className="font-medium">{participantName}</span>
            <Badge 
              variant={position === 'PRO' ? 'default' : 'destructive'}
              size="sm"
            >
              {position}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{message.timestamp.toLocaleTimeString()}</span>
          </div>
        </div>
        
        {/* Message content with highlighting */}
        <div className="text-sm leading-relaxed">
          {highlightSearchTerms(truncatedContent, searchQuery)}
        </div>
        
        {/* Message metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge variant="outline" size="sm">
            {message.phase}
          </Badge>
          {message.type !== 'USER' && (
            <Badge variant="secondary" size="sm">
              {message.type}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

export function MessageSearch({
  searchQuery,
  searchResults,
  isSearching,
  onSearch,
  onClear,
  onJumpToMessage,
  participantMap,
  className
}: MessageSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<'timestamp' | 'relevance'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Filter and sort results based on current settings
  const filteredResults = React.useMemo(() => {
    let results = [...searchResults];
    
    // Apply filters
    if (filters.author) {
      results = results.filter(msg => msg.authorId === filters.author);
    }
    
    if (filters.dateFrom) {
      results = results.filter(msg => msg.timestamp >= filters.dateFrom!);
    }
    
    if (filters.dateTo) {
      results = results.filter(msg => msg.timestamp <= filters.dateTo!);
    }
    
    if (filters.phase) {
      results = results.filter(msg => msg.phase === filters.phase);
    }
    
    if (filters.messageType) {
      results = results.filter(msg => msg.type === filters.messageType);
    }
    
    // Sort results
    results.sort((a, b) => {
      if (sortBy === 'timestamp') {
        const diff = a.timestamp.getTime() - b.timestamp.getTime();
        return sortOrder === 'asc' ? diff : -diff;
      }
      // For relevance, we could implement a scoring system
      // For now, just use timestamp
      return sortOrder === 'asc' 
        ? a.timestamp.getTime() - b.timestamp.getTime()
        : b.timestamp.getTime() - a.timestamp.getTime();
    });
    
    return results;
  }, [searchResults, filters, sortBy, sortOrder]);
  
  // Handle input changes
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onSearch(value);
    
    // Auto-expand when typing
    if (value.trim() && !isExpanded) {
      setIsExpanded(true);
    }
  };
  
  // Clear search and collapse
  const handleClear = () => {
    onClear();
    setIsExpanded(false);
    inputRef.current?.focus();
  };
  
  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (searchQuery) {
        handleClear();
      } else {
        setIsExpanded(false);
      }
    } else if (event.key === 'Enter') {
      if (filteredResults.length > 0) {
        onJumpToMessage(filteredResults[0].id);
      }
    }
  };
  
  const uniqueAuthors = Object.keys(participantMap);
  const uniquePhases = [...new Set(searchResults.map(msg => msg.phase))];
  
  return (
    <div className={cn("space-y-2", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery && setIsExpanded(true)}
            placeholder="Search messages..."
            className="pl-10 pr-20"
            aria-label="Search messages"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {searchQuery && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="h-6 w-6 p-0"
                      >
                        <Filter className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Filters</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear search</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Search Filters */}
      {showFilters && searchQuery && (
        <Card className="p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Search Filters</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({})}
                disabled={Object.keys(filters).length === 0}
              >
                Clear Filters
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Author Filter */}
              <div>
                <label className="text-xs font-medium mb-1 block">Author</label>
                <select
                  value={filters.author || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, author: e.target.value || undefined }))}
                  className="w-full text-sm border rounded px-2 py-1"
                >
                  <option value="">All authors</option>
                  {uniqueAuthors.map(authorId => (
                    <option key={authorId} value={authorId}>
                      {participantMap[authorId]?.name || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Phase Filter */}
              <div>
                <label className="text-xs font-medium mb-1 block">Phase</label>
                <select
                  value={filters.phase || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, phase: e.target.value || undefined }))}
                  className="w-full text-sm border rounded px-2 py-1"
                >
                  <option value="">All phases</option>
                  {uniquePhases.map(phase => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Search Results */}
      {searchQuery && isExpanded && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>
                  Search Results ({filteredResults.length})
                </span>
              </CardTitle>
              
              <div className="flex items-center space-x-2">
                {/* Sort Options */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sort {sortOrder === 'asc' ? 'oldest first' : 'newest first'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {filteredResults.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Found {filteredResults.length} message{filteredResults.length !== 1 ? 's' : ''} 
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="pt-0">
            {filteredResults.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages found</p>
                {searchQuery && (
                  <p className="text-xs mt-1">
                    Try a different search term or adjust your filters
                  </p>
                )}
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {filteredResults.map(message => (
                    <SearchResultItem
                      key={message.id}
                      message={message}
                      searchQuery={searchQuery}
                      participantName={participantMap[message.authorId]?.name || 'Unknown'}
                      position={participantMap[message.authorId]?.position}
                      onJumpTo={onJumpToMessage}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MessageSearch;
