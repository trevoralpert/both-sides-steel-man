'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { Profile } from '@/types/profile';
import { ProfileAPI, ProfileAPIError } from '@/lib/api/profile';
import { ProfileCard } from './ProfileCard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Search, 
  Filter, 
  X, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  Users,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface SearchFilters {
  query: string;
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'ALL';
  completed?: boolean | 'ALL';
  ideology?: string;
  plasticityMin?: number;
  plasticityMax?: number;
  sortBy?: 'name' | 'created' | 'updated' | 'completion';
  sortOrder?: 'asc' | 'desc';
}

interface ProfileSearchProps {
  onProfileSelect?: (profile: Profile) => void;
  onProfileEdit?: (profile: Profile) => void;
  onProfileView?: (profile: Profile) => void;
  variant?: 'compact' | 'detailed';
  showActions?: boolean;
  maxResults?: number;
  className?: string;
  allowExport?: boolean;
}

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  role: 'ALL',
  completed: 'ALL',
  sortBy: 'name',
  sortOrder: 'asc'
};

const IDEOLOGY_OPTIONS = [
  'liberal',
  'conservative',
  'progressive',
  'libertarian',
  'socialist',
  'moderate'
];

export function ProfileSearch({
  onProfileSelect,
  onProfileEdit,
  onProfileView,
  variant = 'compact',
  showActions = true,
  maxResults = 50,
  className = '',
  allowExport = false
}: ProfileSearchProps) {
  const { getToken } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounce search query
  const [debouncedQuery] = useDebounce(filters.query, 500);

  // Search function
  const performSearch = useCallback(async (searchFilters: SearchFilters, page: number = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const searchParams = {
        page,
        limit: maxResults,
        search: searchFilters.query || undefined,
        role: searchFilters.role !== 'ALL' ? searchFilters.role : undefined,
        completed: searchFilters.completed !== 'ALL' ? searchFilters.completed : undefined,
      };

      const response = await ProfileAPI.listProfiles(token, searchParams);
      
      let filteredProfiles = response.data.profiles;

      // Client-side filtering for advanced filters
      if (searchFilters.ideology) {
        filteredProfiles = filteredProfiles.filter(profile => 
          profile.ideology_scores && 
          profile.ideology_scores[searchFilters.ideology] && 
          profile.ideology_scores[searchFilters.ideology] > 0.5
        );
      }

      if (searchFilters.plasticityMin !== undefined) {
        filteredProfiles = filteredProfiles.filter(profile => 
          profile.opinion_plasticity !== null && 
          profile.opinion_plasticity >= searchFilters.plasticityMin!
        );
      }

      if (searchFilters.plasticityMax !== undefined) {
        filteredProfiles = filteredProfiles.filter(profile => 
          profile.opinion_plasticity !== null && 
          profile.opinion_plasticity <= searchFilters.plasticityMax!
        );
      }

      // Client-side sorting
      filteredProfiles.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (searchFilters.sortBy) {
          case 'name':
            aValue = a.user?.first_name || a.user?.username || '';
            bValue = b.user?.first_name || b.user?.username || '';
            break;
          case 'created':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          case 'updated':
            aValue = new Date(a.last_updated);
            bValue = new Date(b.last_updated);
            break;
          case 'completion':
            aValue = a.is_completed ? 1 : 0;
            bValue = b.is_completed ? 1 : 0;
            break;
          default:
            return 0;
        }

        if (searchFilters.sortOrder === 'desc') {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      });

      setProfiles(page === 1 ? filteredProfiles : [...profiles, ...filteredProfiles]);
      setTotalResults(response.data.total);
      setCurrentPage(page);
      setHasSearched(true);
    } catch (err) {
      if (err instanceof ProfileAPIError) {
        setError(err.message);
      } else {
        setError('Failed to search profiles. Please try again.');
      }
      setProfiles([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, maxResults, profiles]);

  // Effect for automatic search when query changes
  useEffect(() => {
    if (debouncedQuery !== filters.query) return;
    
    const searchFilters = { ...filters, query: debouncedQuery };
    performSearch(searchFilters);
  }, [debouncedQuery, filters, performSearch]);

  // Update filter functions
  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
    setProfiles([]);
    setTotalResults(0);
    setHasSearched(false);
  };

  const loadMore = () => {
    performSearch(filters, currentPage + 1);
  };

  // Export functionality
  const exportResults = () => {
    const csvContent = [
      ['Name', 'Username', 'Role', 'Completed', 'Created', 'Belief Summary'],
      ...profiles.map(profile => [
        `${profile.user?.first_name || ''} ${profile.user?.last_name || ''}`.trim(),
        profile.user?.username || '',
        profile.user?.role || '',
        profile.is_completed ? 'Yes' : 'No',
        new Date(profile.created_at).toLocaleDateString(),
        (profile.belief_summary || '').replace(/,/g, ';') // Escape commas
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-search-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.role !== 'ALL') count++;
    if (filters.completed !== 'ALL') count++;
    if (filters.ideology) count++;
    if (filters.plasticityMin !== undefined || filters.plasticityMax !== undefined) count++;
    return count;
  }, [filters]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Profile Search
          </CardTitle>
          <CardDescription>
            Find and filter user profiles across the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, username, or belief content..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFiltersCount}
                    </Badge>
                  )}
                  {filtersExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  {/* Role Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">User Role</label>
                    <Select 
                      value={filters.role} 
                      onValueChange={(value) => updateFilter('role', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Roles</SelectItem>
                        <SelectItem value="STUDENT">Students</SelectItem>
                        <SelectItem value="TEACHER">Teachers</SelectItem>
                        <SelectItem value="ADMIN">Administrators</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Completion Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Profile Status</label>
                    <Select 
                      value={filters.completed?.toString() || 'ALL'} 
                      onValueChange={(value) => updateFilter('completed', value === 'ALL' ? 'ALL' : value === 'true')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Profiles</SelectItem>
                        <SelectItem value="true">Completed Only</SelectItem>
                        <SelectItem value="false">Incomplete Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dominant Ideology */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Ideology</label>
                    <Select 
                      value={filters.ideology || ''} 
                      onValueChange={(value) => updateFilter('ideology', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any ideology" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any Ideology</SelectItem>
                        {IDEOLOGY_OPTIONS.map(ideology => (
                          <SelectItem key={ideology} value={ideology}>
                            {ideology.charAt(0).toUpperCase() + ideology.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Options */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <Select 
                      value={filters.sortBy} 
                      onValueChange={(value) => updateFilter('sortBy', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="created">Date Created</SelectItem>
                        <SelectItem value="updated">Last Updated</SelectItem>
                        <SelectItem value="completion">Completion Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Order */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort Order</label>
                    <Select 
                      value={filters.sortOrder} 
                      onValueChange={(value) => updateFilter('sortOrder', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center space-x-2">
              {allowExport && profiles.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportResults}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => performSearch(filters)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Search Results
              {totalResults > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {profiles.length} of {totalResults}
                </Badge>
              )}
            </CardTitle>
          </div>
          {hasSearched && (
            <CardDescription>
              {profiles.length === 0 
                ? 'No profiles match your search criteria' 
                : `Showing ${profiles.length} profile${profiles.length === 1 ? '' : 's'}`
              }
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && profiles.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Searching profiles...</span>
            </div>
          ) : profiles.length === 0 && hasSearched ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No profiles found matching your criteria.</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear filters and try again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile Results */}
              <div className="grid gap-4">
                {profiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    variant={variant}
                    onEdit={onProfileEdit}
                    onView={onProfileView}
                    showActions={showActions}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onProfileSelect?.(profile)}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {profiles.length < totalResults && (
                <div className="flex justify-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={loadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${totalResults - profiles.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
