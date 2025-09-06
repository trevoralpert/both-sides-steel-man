'use client';

/**
 * Phase 6 Task 6.4.3: Evidence & Source Recommendations
 * 
 * Evidence suggestion panel with source verification and citation tools
 * Integrates with preparation materials and AI coaching service
 */

import React, { useState, useMemo, useCallback } from 'react';

import { cn } from '@/lib/utils';
import { DebatePhase, DebatePosition } from '@/types/debate';
import { usePreparationMaterials } from '@/lib/hooks/usePreparationMaterials';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  BookOpen, 
  ExternalLink, 
  Star, 
  StarOff,
  Shield, 
  ShieldAlert,
  ShieldCheck,
  Copy,
  Plus,
  Filter,
  TrendingUp,
  Calendar,
  User,
  Globe,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Link,
  Quote
} from 'lucide-react';

export interface EvidencePanelProps {
  topicId: string;
  currentPosition: DebatePosition;
  messageContext: string;
  currentPhase?: DebatePhase;
  userId?: string;
  onInsertEvidence: (evidence: EvidenceSuggestion) => void;
  onInsertCitation: (citation: string) => void;
  className?: string;
}

// Evidence source types
export interface EvidenceSource {
  id: string;
  title: string;
  author: string;
  publication: string;
  publishDate: Date;
  url: string;
  excerpt: string;
  credibilityScore: number; // 0-1, higher is more credible
  sourceType: 'academic' | 'news' | 'government' | 'organization' | 'expert' | 'book';
  relevanceScore: number; // 0-1, how relevant to current argument
  position: 'PRO' | 'CON' | 'NEUTRAL';
  tags: string[];
  verified: boolean;
  lastVerified?: Date;
}

// Evidence suggestions
export interface EvidenceSuggestion {
  id: string;
  type: 'statistic' | 'study' | 'quote' | 'example' | 'comparison' | 'trend';
  title: string;
  description: string;
  content: string;
  source: EvidenceSource;
  strength: 'high' | 'medium' | 'low';
  contextRelevance: number; // 0-1, how relevant to current message
  citations: string[];
  tags: string[];
  lastUpdated: Date;
}

// Research guidance
export interface ResearchGuidance {
  id: string;
  category: 'methodology' | 'evaluation' | 'citation' | 'bias';
  title: string;
  description: string;
  tips: string[];
  examples: string[];
  resources: {
    title: string;
    url: string;
    description: string;
  }[];
}

// Mock data for evidence suggestions
const mockEvidenceSources: EvidenceSource[] = [
  {
    id: 'source-1',
    title: 'Climate Change and Global Temperature Trends: A Comprehensive Analysis',
    author: 'Dr. Sarah Johnson, Dr. Michael Chen',
    publication: 'Nature Climate Change',
    publishDate: new Date('2023-08-15'),
    url: 'https://nature.com/articles/climate-analysis-2023',
    excerpt: 'Global temperatures have risen by 1.2°C since pre-industrial times, with unprecedented acceleration in the past decade. The analysis of 150 years of temperature data shows clear correlation with human activities.',
    credibilityScore: 0.95,
    sourceType: 'academic',
    relevanceScore: 0.9,
    position: 'NEUTRAL',
    tags: ['climate', 'temperature', 'data', 'research'],
    verified: true,
    lastVerified: new Date('2023-09-01')
  },
  {
    id: 'source-2',
    title: 'Economic Impact of Environmental Policies',
    author: 'World Economic Forum',
    publication: 'WEF Policy Report',
    publishDate: new Date('2023-06-20'),
    url: 'https://weforum.org/environmental-economics-2023',
    excerpt: 'Investment in green technology has created 2.3 million jobs globally while reducing carbon emissions by 15% in participating countries over the past five years.',
    credibilityScore: 0.88,
    sourceType: 'organization',
    relevanceScore: 0.85,
    position: 'PRO',
    tags: ['economy', 'jobs', 'policy', 'environment'],
    verified: true,
    lastVerified: new Date('2023-07-15')
  },
  {
    id: 'source-3',
    title: 'Renewable Energy Adoption Challenges',
    author: 'Energy Policy Institute',
    publication: 'Energy Policy Journal',
    publishDate: new Date('2023-05-10'),
    url: 'https://energypolicy.org/renewable-challenges-2023',
    excerpt: 'While renewable energy costs have decreased by 40%, infrastructure limitations and grid stability concerns present significant implementation challenges in developing regions.',
    credibilityScore: 0.82,
    sourceType: 'organization',
    relevanceScore: 0.8,
    position: 'CON',
    tags: ['renewable', 'energy', 'challenges', 'infrastructure'],
    verified: true,
    lastVerified: new Date('2023-06-01')
  }
];

const mockEvidenceSuggestions: EvidenceSuggestion[] = [
  {
    id: 'evidence-1',
    type: 'statistic',
    title: 'Global Temperature Increase',
    description: 'Statistical evidence showing temperature rise',
    content: 'According to Nature Climate Change, global temperatures have risen by 1.2°C since pre-industrial times.',
    source: mockEvidenceSources[0],
    strength: 'high',
    contextRelevance: 0.95,
    citations: ['Johnson, S. & Chen, M. (2023). Climate Change Analysis. Nature Climate Change.'],
    tags: ['climate', 'statistics', 'temperature'],
    lastUpdated: new Date('2023-08-15')
  },
  {
    id: 'evidence-2',
    type: 'example',
    title: 'Green Job Creation',
    description: 'Real-world example of environmental policy benefits',
    content: 'The World Economic Forum reports that investment in green technology has created 2.3 million jobs globally.',
    source: mockEvidenceSources[1],
    strength: 'high',
    contextRelevance: 0.85,
    citations: ['World Economic Forum. (2023). Environmental Economics Report.'],
    tags: ['economy', 'jobs', 'example'],
    lastUpdated: new Date('2023-06-20')
  },
  {
    id: 'evidence-3',
    type: 'comparison',
    title: 'Renewable Energy Cost Reduction',
    description: 'Comparison showing cost improvements',
    content: 'Despite 40% cost reduction in renewable energy, infrastructure challenges remain significant in developing regions.',
    source: mockEvidenceSources[2],
    strength: 'medium',
    contextRelevance: 0.8,
    citations: ['Energy Policy Institute. (2023). Renewable Challenges. Energy Policy Journal.'],
    tags: ['renewable', 'costs', 'comparison'],
    lastUpdated: new Date('2023-05-10')
  }
];

const mockResearchGuidance: ResearchGuidance[] = [
  {
    id: 'guide-1',
    category: 'evaluation',
    title: 'Evaluating Source Credibility',
    description: 'Learn how to assess the reliability and credibility of sources',
    tips: [
      'Check the author\'s credentials and expertise',
      'Look for peer-reviewed publications',
      'Verify publication date and relevance',
      'Cross-reference with multiple sources'
    ],
    examples: [
      'Academic journals (Nature, Science) are highly credible',
      'Government statistical agencies provide reliable data',
      'News sources should be fact-checked and cross-referenced'
    ],
    resources: [
      {
        title: 'Source Evaluation Checklist',
        url: '/resources/source-evaluation',
        description: 'Step-by-step guide for evaluating sources'
      }
    ]
  },
  {
    id: 'guide-2',
    category: 'citation',
    title: 'Proper Citation Format',
    description: 'Learn how to cite sources effectively in debates',
    tips: [
      'Include author, publication, and date',
      'Mention the source\'s credibility indicators',
      'Provide context for statistics and quotes',
      'Use signal phrases to introduce evidence'
    ],
    examples: [
      '"According to Dr. Smith from Harvard Medical School..."',
      '"A 2023 study published in Nature found that..."',
      '"Government data from the EPA shows..."'
    ],
    resources: [
      {
        title: 'Citation Style Guide',
        url: '/resources/citation-guide',
        description: 'Templates for citing different source types'
      }
    ]
  }
];

export function EvidencePanel({
  topicId,
  currentPosition,
  messageContext,
  currentPhase,
  userId = 'demo-user',
  onInsertEvidence,
  onInsertCitation,
  className
}: EvidencePanelProps) {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'PRO' | 'CON' | 'NEUTRAL'>('all');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('all');
  const [bookmarkedSources, setBookmarkedSources] = useState<Set<string>>(new Set());

  // Integration with preparation materials from Phase 4
  const preparationMaterials = usePreparationMaterials({
    topicId,
    userId,
    enabled: true
  });

  // Filter evidence suggestions based on current context
  const filteredSuggestions = useMemo(() => {
    // Combine mock suggestions with preparation materials
    const preparationSuggestions = preparationMaterials.materials.flatMap(material => 
      preparationMaterials.convertToEvidenceSuggestion(material)
    );
    
    let suggestions = [...mockEvidenceSuggestions, ...preparationSuggestions];

    // Filter by search query
    if (searchQuery) {
      suggestions = suggestions.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by position
    if (selectedFilter !== 'all') {
      suggestions = suggestions.filter(s => s.source.position === selectedFilter);
    }

    // Filter by source type
    if (selectedSourceType !== 'all') {
      suggestions = suggestions.filter(s => s.source.sourceType === selectedSourceType);
    }

    // Sort by relevance and strength
    return suggestions.sort((a, b) => {
      const aScore = a.contextRelevance * 0.6 + (a.strength === 'high' ? 0.4 : a.strength === 'medium' ? 0.2 : 0);
      const bScore = b.contextRelevance * 0.6 + (b.strength === 'high' ? 0.4 : b.strength === 'medium' ? 0.2 : 0);
      return bScore - aScore;
    });
  }, [searchQuery, selectedFilter, selectedSourceType, preparationMaterials.materials]);

  // Handle evidence insertion
  const handleInsertEvidence = useCallback((evidence: EvidenceSuggestion) => {
    onInsertEvidence(evidence);
  }, [onInsertEvidence]);

  // Handle citation insertion
  const handleInsertCitation = useCallback((citation: string) => {
    onInsertCitation(citation);
  }, [onInsertCitation]);

  // Handle bookmark toggle
  const handleToggleBookmark = useCallback((sourceId: string) => {
    setBookmarkedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  }, []);

  // Get credibility color
  const getCredibilityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-700 bg-green-100 border-green-300';
    if (score >= 0.7) return 'text-blue-700 bg-blue-100 border-blue-300';
    if (score >= 0.5) return 'text-amber-700 bg-amber-100 border-amber-300';
    return 'text-red-700 bg-red-100 border-red-300';
  };

  // Get credibility icon
  const getCredibilityIcon = (score: number) => {
    if (score >= 0.9) return ShieldCheck;
    if (score >= 0.7) return Shield;
    return ShieldAlert;
  };

  // Get strength color
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'high': return 'text-green-700 bg-green-100';
      case 'medium': return 'text-amber-700 bg-amber-100';
      case 'low': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Evidence & Sources</h3>
          <Badge variant="outline" className="text-xs">
            {filteredSuggestions.length} suggestions
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Filter className="h-3 w-3 mr-1" />
            Filter
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for evidence, statistics, studies..."
                className="pl-8"
              />
            </div>
            
            {/* Quick Filters */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">Position:</span>
              {['all', 'PRO', 'CON', 'NEUTRAL'].map((filter) => (
                <Button
                  key={filter}
                  variant={selectedFilter === filter ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedFilter(filter as any)}
                  className="h-7 px-2 text-xs"
                >
                  {filter === 'all' ? 'All' : filter}
                </Button>
              ))}
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">Type:</span>
              {['all', 'academic', 'news', 'government', 'organization'].map((type) => (
                <Button
                  key={type}
                  variant={selectedSourceType === type ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedSourceType(type)}
                  className="h-7 px-2 text-xs capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suggestions" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="guidance" className="text-xs">
            <User className="h-3 w-3 mr-1" />
            Guidance
          </TabsTrigger>
        </TabsList>

        {/* Evidence Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-3">
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {filteredSuggestions.map((evidence) => (
                <EvidenceCard
                  key={evidence.id}
                  evidence={evidence}
                  isBookmarked={bookmarkedSources.has(evidence.source.id)}
                  onInsert={() => handleInsertEvidence(evidence)}
                  onToggleBookmark={() => handleToggleBookmark(evidence.source.id)}
                  onInsertCitation={() => handleInsertCitation(evidence.citations[0])}
                />
              ))}
              
              {filteredSuggestions.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      No evidence found matching your criteria
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedFilter('all');
                        setSelectedSourceType('all');
                      }}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources">
          <SourceLibrary 
            sources={mockEvidenceSources}
            bookmarkedSources={bookmarkedSources}
            onToggleBookmark={handleToggleBookmark}
            onInsertCitation={handleInsertCitation}
          />
        </TabsContent>

        {/* Research Guidance Tab */}
        <TabsContent value="guidance">
          <ResearchGuidanceSection guidance={mockResearchGuidance} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Evidence Card Component
interface EvidenceCardProps {
  evidence: EvidenceSuggestion;
  isBookmarked: boolean;
  onInsert: () => void;
  onToggleBookmark: () => void;
  onInsertCitation: () => void;
}

function EvidenceCard({
  evidence,
  isBookmarked,
  onInsert,
  onToggleBookmark,
  onInsertCitation
}: EvidenceCardProps) {
  const CredibilityIcon = getCredibilityIcon(evidence.source.credibilityScore);
  
  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {evidence.type}
                </Badge>
                <Badge 
                  className={cn("text-xs", getStrengthColor(evidence.strength))}
                >
                  {evidence.strength} strength
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getCredibilityColor(evidence.source.credibilityScore))}
                >
                  <CredibilityIcon className="h-2 w-2 mr-1" />
                  {Math.round(evidence.source.credibilityScore * 100)}% credible
                </Badge>
              </div>
              
              <h4 className="font-medium text-sm leading-tight">
                {evidence.title}
              </h4>
              
              <p className="text-xs text-muted-foreground mt-1">
                {evidence.description}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleBookmark}
              className="h-8 w-8 p-0 ml-2 flex-shrink-0"
            >
              {isBookmarked ? (
                <Star className="h-4 w-4 text-amber-500 fill-current" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Content */}
          <div className="bg-muted/30 p-3 rounded text-sm">
            <Quote className="h-3 w-3 text-muted-foreground mb-1" />
            {evidence.content}
          </div>

          {/* Source Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Globe className="h-3 w-3" />
              <span>{evidence.source.publication}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>{evidence.source.publishDate.toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <span>{Math.round(evidence.contextRelevance * 100)}% relevant</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-1">
              {evidence.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onInsertCitation}
                className="h-7 px-2 text-xs"
              >
                <Link className="h-3 w-3 mr-1" />
                Cite
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onInsert}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Insert
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
const getCredibilityColor = (score: number) => {
  if (score >= 0.9) return 'text-green-700 bg-green-100 border-green-300';
  if (score >= 0.7) return 'text-blue-700 bg-blue-100 border-blue-300';
  if (score >= 0.5) return 'text-amber-700 bg-amber-100 border-amber-300';
  return 'text-red-700 bg-red-100 border-red-300';
};

const getCredibilityIcon = (score: number) => {
  if (score >= 0.9) return ShieldCheck;
  if (score >= 0.7) return Shield;
  return ShieldAlert;
};

const getStrengthColor = (strength: string) => {
  switch (strength) {
    case 'high': return 'text-green-700 bg-green-100';
    case 'medium': return 'text-amber-700 bg-amber-100';
    case 'low': return 'text-red-700 bg-red-100';
    default: return 'text-gray-700 bg-gray-100';
  }
};

// Source Library Component (placeholder for now)
function SourceLibrary({ 
  sources, 
  bookmarkedSources, 
  onToggleBookmark, 
  onInsertCitation 
}: {
  sources: EvidenceSource[];
  bookmarkedSources: Set<string>;
  onToggleBookmark: (id: string) => void;
  onInsertCitation: (citation: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Source library with detailed source information and management
      </p>
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            Detailed source library coming in next iteration
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Research Guidance Section Component (placeholder for now)
function ResearchGuidanceSection({ guidance }: { guidance: ResearchGuidance[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Research guidance and educational content for better evidence usage
      </p>
      <Card>
        <CardContent className="p-8 text-center">
          <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            Research guidance and tutorials coming in next iteration
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default EvidencePanel;
