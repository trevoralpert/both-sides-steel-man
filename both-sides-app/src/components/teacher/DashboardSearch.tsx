/**
 * Dashboard Search Component
 * 
 * Task 8.1.2: Global search functionality with scoped fallback for classes, 
 * students, and debates when full search index is not available.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Activity
} from 'lucide-react';

// Types
interface SearchResult {
  id: string;
  type: 'class' | 'student' | 'session' | 'reflection' | 'debate';
  title: string;
  description: string;
  href: string;
  metadata?: Record<string, any>;
}

interface DashboardSearchProps {
  placeholder?: string;
  className?: string;
}

export function DashboardSearch({ 
  placeholder = "Search classes, students, debates...",
  className 
}: DashboardSearchProps) {
  const { user } = useUser();
  const router = useRouter();
  
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load recent searches on mount
  useEffect(() => {
    const stored = localStorage.getItem(`dashboard-recent-searches-${user?.id}`);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.warn('Failed to load recent searches:', error);
      }
    }
  }, [user?.id]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!user?.id || !searchQuery.trim()) return;

    try {
      setLoading(true);
      // TODO: Fix auth token handling  
      // const token = await user.getToken();
      
      // Try to use the full search API first
      const response = await fetch(`/api/search/dashboard?q=${encodeURIComponent(searchQuery)}`, {
        headers: { /* 'Authorization': `Bearer ${token}` */ }
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        // Fallback to scoped search when full index is not available
        await performScopedSearch(searchQuery);
      }
    } catch (error) {
      console.warn('Search API not available, using scoped search:', error);
      await performScopedSearch(searchQuery);
    } finally {
      setLoading(false);
    }
  };

  const performScopedSearch = async (searchQuery: string) => {
    if (!user?.id) return;

    try {
      // TODO: Fix auth token handling
      // const token = await user.getToken();
      const searchLower = searchQuery.toLowerCase();
      const scopedResults: SearchResult[] = [];

      // Search classes
      try {
        const classesResponse = await fetch('/api/classes/teacher-classes', {
          // headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (classesResponse.ok) {
          const classesData = await classesResponse.json();
          const matchingClasses = (classesData.classes || [])
            .filter((cls: any) => 
              cls.name?.toLowerCase().includes(searchLower) ||
              cls.description?.toLowerCase().includes(searchLower)
            )
            .map((cls: any) => ({
              id: cls.id,
              type: 'class' as const,
              title: cls.name,
              description: `${cls.studentCount || 0} students`,
              href: `/teacher/classes/${cls.id}`,
              metadata: { studentCount: cls.studentCount }
            }));
          
          scopedResults.push(...matchingClasses);
        }
      } catch (error) {
        console.warn('Failed to search classes:', error);
      }

      // Search students (if we have class data)
      try {
        const studentsResponse = await fetch('/api/students/teacher-students', {
          // headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json();
          const matchingStudents = (studentsData.students || [])
            .filter((student: any) => 
              student.name?.toLowerCase().includes(searchLower) ||
              student.email?.toLowerCase().includes(searchLower)
            )
            .slice(0, 10) // Limit student results
            .map((student: any) => ({
              id: student.id,
              type: 'student' as const,
              title: student.name,
              description: student.email,
              href: `/teacher/students/${student.id}`,
              metadata: { email: student.email }
            }));
          
          scopedResults.push(...matchingStudents);
        }
      } catch (error) {
        console.warn('Failed to search students:', error);
      }

      setResults(scopedResults);
    } catch (error) {
      console.error('Scoped search failed:', error);
      setResults([]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    
    // Save to recent searches
    const newRecent = [result.title, ...recentSearches.filter(s => s !== result.title)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem(`dashboard-recent-searches-${user?.id}`, JSON.stringify(newRecent));
    
    // Navigate to result
    router.push(result.href);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'class':
        return Users;
      case 'student':
        return Users;
      case 'session':
        return Calendar;
      case 'reflection':
        return MessageSquare;
      case 'debate':
        return Activity;
      default:
        return FileText;
    }
  };

  const getResultBadge = (type: SearchResult['type']) => {
    switch (type) {
      case 'class':
        return 'Class';
      case 'student':
        return 'Student';
      case 'session':
        return 'Session';
      case 'reflection':
        return 'Reflection';
      case 'debate':
        return 'Debate';
      default:
        return 'Item';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className}`}
        >
          <div className="flex items-center">
            <Search className="h-4 w-4 mr-2" />
            <span className="text-muted-foreground">{placeholder}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Searching...' : 'No results found.'}
            </CommandEmpty>
            
            {results.length > 0 && (
              <CommandGroup>
                <div className="px-2 py-2 text-sm font-medium text-gray-700">Search Results</div>
                {results.map((result) => {
                  const Icon = getResultIcon(result.type);
                  return (
                    <CommandItem
                      key={result.id}
                      onClick={() => handleSelect(result)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{result.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {getResultBadge(result.type)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {result.description}
                        </p>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {query.length === 0 && recentSearches.length > 0 && (
              <CommandGroup>
                <div className="px-2 py-2 text-sm font-medium text-gray-700">Recent Searches</div>
                {recentSearches.map((search, index) => (
                  <CommandItem
                    key={index}
                    onClick={() => setQuery(search)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {search}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
