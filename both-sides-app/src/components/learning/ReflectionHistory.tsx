/**
 * Reflection History Component
 * 
 * Task 7.5.1: Displays and manages student reflection history with search,
 * filtering, and detailed view capabilities.
 */

'use client';

import React, { useState, useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Filter, 
  Calendar, 
  MessageSquare, 
  Clock, 
  Star,
  TrendingUp,
  TrendingDown,
  Eye,
  Download,
  BookOpen,
  Lightbulb,
  Target,
  CheckCircle2,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReflectionSummary {
  id: string;
  debateTitle: string;
  debateId: string;
  completedAt: Date;
  qualityScore: number;
  completionStatus: 'completed' | 'in_progress' | 'pending';
  keyInsights: string[];
  topicCategory: string;
  wordCount: number;
  timeSpent: number; // minutes
  competenciesImproved: string[];
  emotionalJourney: Array<{
    phase: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }>;
  learningOutcomes: string[];
  personalGrowth: {
    plasticityScore: number;
    empathyGrowth: number;
    criticalThinkingGrowth: number;
  };
}

interface ReflectionHistoryProps {
  reflections: ReflectionSummary[];
  className?: string;
}

export function ReflectionHistory({ reflections, className }: ReflectionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTimeframe, setFilterTimeframe] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [selectedReflection, setSelectedReflection] = useState<ReflectionSummary | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(reflections.map(r => r.topicCategory))];
    return cats.sort();
  }, [reflections]);

  // Filter and search reflections
  const filteredReflections = useMemo(() => {
    let filtered = reflections;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(reflection =>
        reflection.debateTitle.toLowerCase().includes(search) ||
        reflection.keyInsights.some(insight => insight.toLowerCase().includes(search)) ||
        reflection.topicCategory.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(r => r.topicCategory === filterCategory);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.completionStatus === filterStatus);
    }

    // Timeframe filter
    if (filterTimeframe !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filterTimeframe) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'semester':
          filterDate.setMonth(now.getMonth() - 4);
          break;
      }
      
      filtered = filtered.filter(r => r.completedAt >= filterDate);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.completedAt.getTime() - a.completedAt.getTime();
        case 'quality':
          return b.qualityScore - a.qualityScore;
        case 'title':
          return a.debateTitle.localeCompare(b.debateTitle);
        case 'category':
          return a.topicCategory.localeCompare(b.topicCategory);
        default:
          return 0;
      }
    });

    return filtered;
  }, [reflections, searchTerm, filterCategory, filterStatus, filterTimeframe, sortBy]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    const completed = reflections.filter(r => r.completionStatus === 'completed');
    const avgQuality = completed.length > 0 
      ? completed.reduce((sum, r) => sum + r.qualityScore, 0) / completed.length 
      : 0;
    const totalWordCount = completed.reduce((sum, r) => sum + r.wordCount, 0);
    const totalTimeSpent = completed.reduce((sum, r) => sum + r.timeSpent, 0);

    return {
      totalCompleted: completed.length,
      avgQuality,
      totalWordCount,
      totalTimeSpent,
      inProgress: reflections.filter(r => r.completionStatus === 'in_progress').length,
      pending: reflections.filter(r => r.completionStatus === 'pending').length
    };
  }, [reflections]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header and Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Reflection History</h2>
            <p className="text-muted-foreground">
              Review your learning journey and insights
            </p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export History
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalCompleted}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {Math.round(stats.avgQuality * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Quality</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {(stats.totalWordCount / 1000).toFixed(1)}k
                  </div>
                  <div className="text-xs text-muted-foreground">Words Written</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {Math.round(stats.totalTimeSpent / 60)}h
                  </div>
                  <div className="text-xs text-muted-foreground">Time Reflecting</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Find Reflections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reflections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="semester">This Semester</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="quality">Quality Score</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reflections List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Reflections</span>
            <Badge variant="secondary">{filteredReflections.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReflections.length > 0 ? (
            <div className="space-y-4">
              {filteredReflections.map((reflection) => (
                <ReflectionCard
                  key={reflection.id}
                  reflection={reflection}
                  onViewDetails={() => setSelectedReflection(reflection)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Reflections Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || filterCategory !== 'all' || filterStatus !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'Start your first debate to begin reflecting'
                }
              </p>
              {searchTerm || filterCategory !== 'all' || filterStatus !== 'all' ? (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterCategory('all');
                    setFilterStatus('all');
                    setFilterTimeframe('all');
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button>Find Debate Partners</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reflection Detail Modal */}
      {selectedReflection && (
        <ReflectionDetailDialog
          reflection={selectedReflection}
          onClose={() => setSelectedReflection(null)}
        />
      )}
    </div>
  );
}

interface ReflectionCardProps {
  reflection: ReflectionSummary;
  onViewDetails: () => void;
}

function ReflectionCard({ reflection, onViewDetails }: ReflectionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'in_progress': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'pending': return 'bg-gray-100 border-gray-300 text-gray-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-lg mb-1">{reflection.debateTitle}</h3>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
            <Calendar className="h-4 w-4" />
            <span>{reflection.completedAt.toLocaleDateString()}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>{reflection.topicCategory}</span>
            <Separator orientation="vertical" className="h-4" />
            <Clock className="h-4 w-4" />
            <span>{reflection.timeSpent} min</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <div className={`font-medium ${getQualityColor(reflection.qualityScore)}`}>
              {Math.round(reflection.qualityScore * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Quality</div>
          </div>
          <Badge className={getStatusColor(reflection.completionStatus)}>
            {reflection.completionStatus.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Key Insights Preview */}
      {reflection.keyInsights.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Key Insights</span>
          </div>
          <div className="space-y-1">
            {reflection.keyInsights.slice(0, 2).map((insight, index) => (
              <p key={index} className="text-sm text-muted-foreground line-clamp-1">
                • {insight}
              </p>
            ))}
            {reflection.keyInsights.length > 2 && (
              <p className="text-xs text-muted-foreground">
                +{reflection.keyInsights.length - 2} more insights
              </p>
            )}
          </div>
        </div>
      )}

      {/* Competencies Improved */}
      {reflection.competenciesImproved.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Skills Improved</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {reflection.competenciesImproved.slice(0, 3).map((competency) => (
              <Badge key={competency} variant="secondary" className="text-xs">
                {competency.replace('_', ' ')}
              </Badge>
            ))}
            {reflection.competenciesImproved.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{reflection.competenciesImproved.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Personal Growth Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="text-center">
          <div className="text-sm font-medium">
            {Math.round(reflection.personalGrowth.plasticityScore * 100)}%
          </div>
          <div className="text-xs text-muted-foreground">Openness</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium">
            {Math.round(reflection.personalGrowth.empathyGrowth * 100)}%
          </div>
          <div className="text-xs text-muted-foreground">Empathy</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium">
            {Math.round(reflection.personalGrowth.criticalThinkingGrowth * 100)}%
          </div>
          <div className="text-xs text-muted-foreground">Critical Thinking</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {reflection.wordCount.toLocaleString()} words written
        </div>
        <Button size="sm" onClick={onViewDetails}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </div>
    </div>
  );
}

interface ReflectionDetailDialogProps {
  reflection: ReflectionSummary;
  onClose: () => void;
}

function ReflectionDetailDialog({ reflection, onClose }: ReflectionDetailDialogProps) {
  return (
    <Dialog open={!!reflection} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{reflection.debateTitle}</DialogTitle>
          <DialogDescription>
            Detailed reflection analysis from {reflection.completedAt.toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <Star className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                <div className="font-semibold">{Math.round(reflection.qualityScore * 100)}%</div>
                <div className="text-xs text-muted-foreground">Quality Score</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <div className="font-semibold">{reflection.timeSpent} min</div>
                <div className="text-xs text-muted-foreground">Time Spent</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <MessageSquare className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <div className="font-semibold">{reflection.wordCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Words</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-1 text-purple-500" />
                <div className="font-semibold">{reflection.competenciesImproved.length}</div>
                <div className="text-xs text-muted-foreground">Skills Improved</div>
              </div>
            </div>

            <Separator />

            {/* Key Insights */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                Key Insights
              </h3>
              <div className="space-y-2">
                {reflection.keyInsights.map((insight, index) => (
                  <div key={index} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Personal Growth */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                Personal Growth
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Opinion Plasticity</span>
                    <span>{Math.round(reflection.personalGrowth.plasticityScore * 100)}%</span>
                  </div>
                  <Progress value={reflection.personalGrowth.plasticityScore * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Empathy Growth</span>
                    <span>{Math.round(reflection.personalGrowth.empathyGrowth * 100)}%</span>
                  </div>
                  <Progress value={reflection.personalGrowth.empathyGrowth * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Critical Thinking Growth</span>
                    <span>{Math.round(reflection.personalGrowth.criticalThinkingGrowth * 100)}%</span>
                  </div>
                  <Progress value={reflection.personalGrowth.criticalThinkingGrowth * 100} className="h-2" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Learning Outcomes */}
            {reflection.learningOutcomes.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-purple-500" />
                  Learning Outcomes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reflection.learningOutcomes.map((outcome, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 border rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reflection.learningOutcomes.length > 0 && <Separator />}

            {/* Emotional Journey */}
            {reflection.emotionalJourney.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                  Emotional Journey
                </h3>
                <div className="space-y-2">
                  {reflection.emotionalJourney.map((phase, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border">
                      <span className="font-medium text-sm">{phase.phase}</span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          phase.sentiment === 'positive' ? 'bg-green-500' :
                          phase.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <span className="text-sm">{Math.round(phase.score * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Reflection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
