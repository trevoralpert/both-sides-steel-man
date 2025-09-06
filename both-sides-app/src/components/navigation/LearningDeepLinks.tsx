/**
 * Learning Deep Links and Search
 * 
 * Task 7.5.3: Deep linking to specific reflection sessions and comprehensive
 * search functionality across learning data.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Filter, 
  Calendar,
  MessageSquare,
  BarChart3,
  Trophy,
  Target,
  Users,
  BookOpen,
  Clock,
  ArrowRight,
  ExternalLink,
  History,
  Bookmark,
  Share
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useLearningNavigation } from './LearningNavigationProvider';

interface DeepLinkConfig {
  type: 'reflection' | 'progress' | 'achievement' | 'goal' | 'analytics';
  id?: string;
  params?: Record<string, string>;
  returnUrl?: string;
}

interface SearchResult {
  id: string;
  type: 'reflection' | 'progress' | 'achievement' | 'goal' | 'student' | 'class';
  title: string;
  description: string;
  url: string;
  relevance: number;
  metadata: {
    date?: Date;
    category?: string;
    status?: string;
    tags?: string[];
  };
}

interface LearningSearchProps {
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function LearningSearch({ onSelect, placeholder = "Search learning data...", className }: LearningSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchFilters, setSearchFilters] = useState({
    type: 'all',
    dateRange: 'all',
    status: 'all'
  });

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length > 2) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchFilters]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    
    try {
      // Mock search results - in a real app, this would hit an API
      const mockResults = [
        {
          id: 'reflection-123',
          type: 'reflection',
          title: 'Climate Change Debate Reflection',
          description: 'Post-debate reflection on environmental policy discussion',
          url: '/learning/reflections/reflection-123',
          relevance: 0.95,
          metadata: {
            date: new Date(Date.now() - 24 * 60 * 60 * 1000),
            category: 'Environmental Policy',
            status: 'completed',
            tags: ['climate', 'policy', 'debate']
          }
        },
        {
          id: 'achievement-456',
          type: 'achievement',
          title: 'Critical Thinker Badge',
          description: 'Awarded for demonstrating excellent analytical skills',
          url: '/learning/achievements/achievement-456',
          relevance: 0.88,
          metadata: {
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            category: 'Skill Badge',
            status: 'earned',
            tags: ['critical thinking', 'analysis']
          }
        },
        {
          id: 'progress-789',
          type: 'progress',
          title: 'Communication Skills Progress',
          description: 'Track your improvement in communication competency',
          url: '/learning/progress/communication-skills',
          relevance: 0.82,
          metadata: {
            category: 'Skills',
            status: 'in_progress',
            tags: ['communication', 'skills', 'progress']
          }
        },
        {
          id: 'goal-101',
          type: 'goal',
          title: 'Master Research Methods',
          description: 'Learning goal to improve research and evidence evaluation',
          url: '/learning/goals/goal-101',
          relevance: 0.76,
          metadata: {
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Future date
            category: 'Learning Goal',
            status: 'active',
            tags: ['research', 'evidence', 'methods']
          }
        }
      ].filter(result => 
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.metadata.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      // Apply filters
      const filteredResults = mockResults.filter(result => {
        if (searchFilters.type !== 'all' && result.type !== searchFilters.type) {
          return false;
        }
        if (searchFilters.status !== 'all' && result.metadata.status !== searchFilters.status) {
          return false;
        }
        return true;
      });

      setResults(filteredResults.sort((a, b) => b.relevance - a.relevance) as SearchResult[]);
      
      // Save to recent searches
      if (!recentSearches.includes(searchQuery)) {
        setRecentSearches(prev => [searchQuery, ...prev.slice(0, 4)]);
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    
    if (onSelect) {
      onSelect(result);
    } else {
      window.location.assign(result.url);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'reflection': return <MessageSquare className="h-4 w-4" />;
      case 'progress': return <BarChart3 className="h-4 w-4" />;
      case 'achievement': return <Trophy className="h-4 w-4" />;
      case 'goal': return <Target className="h-4 w-4" />;
      case 'student': return <Users className="h-4 w-4" />;
      case 'class': return <BookOpen className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'earned': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-4"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
          >
            ×
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg mt-1">
          {/* Search Filters */}
          <div className="p-3 border-b bg-muted/50">
            <div className="flex space-x-2">
              <Select value={searchFilters.type} onValueChange={(value) => setSearchFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="reflection">Reflections</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="achievement">Achievements</SelectItem>
                  <SelectItem value="goal">Goals</SelectItem>
                </SelectContent>
              </Select>

              <Select value={searchFilters.status} onValueChange={(value) => setSearchFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="max-h-96">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultSelect(result)}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getResultIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm truncate">{result.title}</h3>
                          <div className="flex items-center space-x-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {result.type}
                            </Badge>
                            {result.metadata.status && (
                              <Badge className={cn("text-xs", getStatusColor(result.metadata.status))}>
                                {result.metadata.status.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {result.description}
                        </p>
                        {result.metadata.tags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.metadata.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length > 2 ? (
              <div className="p-4 text-center">
                <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search terms or filters
                </p>
              </div>
            ) : (
              <div className="p-4">
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <History className="h-4 w-4 mr-1" />
                      Recent Searches
                    </h4>
                    <div className="space-y-1">
                      {recentSearches.map((search) => (
                        <button
                          key={search}
                          onClick={() => setQuery(search)}
                          className="w-full text-left px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-center text-sm text-muted-foreground">
                  Start typing to search across all learning data...
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="p-2 border-t bg-muted/50 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeepLinkHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setDebateContext, navigateToReflection } = useLearningNavigation();

  useEffect(() => {
    handleDeepLink();
  }, [searchParams]);

  const handleDeepLink = () => {
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    const returnUrl = searchParams.get('return');

    switch (action) {
      case 'start_reflection':
        if (id) {
          setDebateContext(id);
          navigateToReflection(id);
        }
        break;
      
      case 'view_progress':
        router.push('/learning/progress');
        break;
      
      case 'view_achievement':
        if (id) {
          router.push(`/learning/achievements/${id}`);
        }
        break;
      
      case 'complete_goal':
        if (id) {
          router.push(`/learning/goals/${id}`);
        }
        break;
      
      case 'teacher_review':
        if (id) {
          router.push(`/teacher/reviews/${id}`);
        }
        break;
    }
  };

  return null; // This component doesn't render anything
}

interface ShareableLinkProps {
  type: 'reflection' | 'progress' | 'achievement' | 'goal';
  id: string;
  title: string;
  description?: string;
}

export function ShareableLink({ type, id, title, description }: ShareableLinkProps) {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareableUrl = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      action: `view_${type}`,
      id: id
    });
    return `${baseUrl}/learning?${params.toString()}`;
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareUrl = generateShareableUrl();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowShare(true)}
      >
        <Share className="h-4 w-4 mr-2" />
        Share
      </Button>

      {showShare && (
        <Dialog open onOpenChange={setShowShare}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share {title}</DialogTitle>
              <DialogDescription>
                {description || `Share this ${type} with others`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Shareable Link</label>
                <div className="flex space-x-2">
                  <Input value={shareUrl} readOnly className="font-mono text-xs" />
                  <Button onClick={() => copyToClipboard(shareUrl)}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowShare(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  copyToClipboard(shareUrl);
                  setShowShare(false);
                }}>
                  Copy & Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function LearningBookmarks() {
  const [bookmarks, setBookmarks] = useState<Array<{
    id: string;
    title: string;
    url: string;
    type: string;
    addedAt: Date;
  }>>([]);

  const addBookmark = (title: string, url: string, type: string) => {
    const newBookmark = {
      id: Date.now().toString(),
      title,
      url,
      type,
      addedAt: new Date()
    };
    
    setBookmarks(prev => [newBookmark, ...prev]);
  };

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Learning Bookmarks</h3>
      {bookmarks.length > 0 ? (
        <div className="space-y-2">
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-2">
                <Bookmark className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">{bookmark.title}</p>
                  <p className="text-xs text-muted-foreground">{bookmark.type}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button size="sm" variant="ghost" onClick={() => window.location.assign(bookmark.url)}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeBookmark(bookmark.id)}>
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No bookmarks yet</p>
      )}
    </div>
  );
}
