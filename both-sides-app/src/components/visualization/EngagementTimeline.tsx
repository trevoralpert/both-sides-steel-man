/**
 * Engagement Timeline Component
 * 
 * Task 7.5.4: Interactive timeline showing engagement patterns,
 * debate-by-debate analysis, and activity correlation visualization.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { 
  Activity, 
  Clock, 
  MessageSquare, 
  Users, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  Play,
  Pause,
  Eye,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

interface EngagementPoint {
  timestamp: Date;
  value: number; // 0-100 engagement score
  activity: {
    debateParticipation: number;
    messageCount: number;
    qualityScore: number;
    interactionTime: number; // minutes
    peerConnections: number;
  };
  context?: {
    debateId?: string;
    debateTitle?: string;
    topic?: string;
    phase?: 'opening' | 'main' | 'closing' | 'reflection';
    participantCount?: number;
  };
  events?: Array<{
    type: 'message_sent' | 'evidence_shared' | 'question_asked' | 'position_changed';
    timestamp: Date;
    impact: number;
  }>;
}

interface DebateSession {
  id: string;
  title: string;
  topic: string;
  startTime: Date;
  endTime: Date;
  engagementScore: number;
  participantCount: number;
  messageCount: number;
  qualityMetrics: {
    argumentStrength: number;
    evidenceUsage: number;
    civility: number;
    participation: number;
  };
  outcomes: {
    positionChanged: boolean;
    skillsImproved: string[];
    insightsGained: string[];
  };
}

interface EngagementTimelineProps {
  data: EngagementPoint[];
  debates: DebateSession[];
  timeRange?: 'day' | 'week' | 'month' | 'semester';
  showDebates?: boolean;
  showActivities?: boolean;
  showTrends?: boolean;
  interactive?: boolean;
  className?: string;
}

export function EngagementTimeline({
  data,
  debates,
  timeRange = 'week',
  showDebates = true,
  showActivities = true,
  showTrends = true,
  interactive = true,
  className
}: EngagementTimelineProps) {
  const [selectedDebate, setSelectedDebate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'heatmap' | 'correlation'>('timeline');
  const [metricFilter, setMetricFilter] = useState('engagement');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    const days = { day: 1, week: 7, month: 30, semester: 120 }[timeRange];
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filteredPoints = data.filter(point => point.timestamp >= cutoffDate);
    const filteredDebates = debates.filter(debate => debate.startTime >= cutoffDate);

    return { points: filteredPoints, debates: filteredDebates };
  }, [data, debates, timeRange]);

  // Calculate engagement statistics
  const engagementStats = useMemo(() => {
    if (filteredData.points.length === 0) return null;

    const values = filteredData.points.map(p => p.value);
    const avgEngagement = values.reduce((sum, val) => sum + val, 0) / values.length;
    const maxEngagement = Math.max(...values);
    const minEngagement = Math.min(...values);
    
    // Calculate trend
    const recent = values.slice(-5);
    const earlier = values.slice(-10, -5);
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;
    const trend = recentAvg > earlierAvg ? 'up' : recentAvg < earlierAvg ? 'down' : 'stable';

    return {
      average: avgEngagement,
      max: maxEngagement,
      min: minEngagement,
      trend,
      totalDebates: filteredData.debates.length,
      totalActivities: filteredData.points.reduce((sum, p) => sum + (p.events?.length || 0), 0)
    };
  }, [filteredData]);

  const exportData = () => {
    const exportPayload = {
      engagementData: filteredData.points,
      debates: filteredData.debates,
      statistics: engagementStats,
      timeRange,
      generatedAt: new Date()
    };
    console.log('Exporting engagement timeline:', exportPayload);
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Engagement Timeline</span>
                {engagementStats && (
                  <Badge variant={
                    engagementStats.trend === 'up' ? 'default' : 
                    engagementStats.trend === 'down' ? 'destructive' : 'secondary'
                  }>
                    {engagementStats.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : engagementStats.trend === 'down' ? (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    ) : null}
                    {Math.round(engagementStats.average)}% avg
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Track engagement patterns across debates and learning activities
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAnimating(!isAnimating)}
              >
                {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timeline">Timeline View</SelectItem>
                <SelectItem value="heatmap">Heat Map</SelectItem>
                <SelectItem value="correlation">Activity Correlation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={metricFilter} onValueChange={setMetricFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engagement">Overall Engagement</SelectItem>
                <SelectItem value="participation">Debate Participation</SelectItem>
                <SelectItem value="quality">Message Quality</SelectItem>
                <SelectItem value="interaction">Peer Interaction</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Past 24 Hours</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="semester">Semester</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch 
                checked={showDebates} 
                onCheckedChange={setShowDebates}
                id="show-debates"
              />
              <label htmlFor="show-debates" className="text-sm">Show Debates</label>
            </div>
          </div>

          {/* Statistics Summary */}
          {engagementStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(engagementStats.average)}%</div>
                <div className="text-xs text-muted-foreground">Average</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Math.round(engagementStats.max)}%</div>
                <div className="text-xs text-muted-foreground">Peak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{engagementStats.totalDebates}</div>
                <div className="text-xs text-muted-foreground">Debates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{engagementStats.totalActivities}</div>
                <div className="text-xs text-muted-foreground">Activities</div>
              </div>
            </div>
          )}

          {/* Main Visualization */}
          <div className="space-y-4">
            {viewMode === 'timeline' && (
              <TimelineView
                data={filteredData.points}
                debates={filteredData.debates}
                metricFilter={metricFilter}
                showDebates={showDebates}
                showActivities={showActivities}
                isAnimating={isAnimating}
                onDebateSelect={setSelectedDebate}
              />
            )}

            {viewMode === 'heatmap' && (
              <HeatMapView
                data={filteredData.points}
                timeRange={timeRange}
              />
            )}

            {viewMode === 'correlation' && (
              <CorrelationView
                data={filteredData.points}
                debates={filteredData.debates}
              />
            )}
          </div>

          {/* Debate Details */}
          {selectedDebate && (
            <DebateDetailPanel
              debate={filteredData.debates.find(d => d.id === selectedDebate)!}
              onClose={() => setSelectedDebate(null)}
            />
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface TimelineViewProps {
  data: EngagementPoint[];
  debates: DebateSession[];
  metricFilter: string;
  showDebates: boolean;
  showActivities: boolean;
  isAnimating: boolean;
  onDebateSelect: (debateId: string) => void;
}

function TimelineView({
  data,
  debates,
  metricFilter,
  showDebates,
  showActivities,
  isAnimating,
  onDebateSelect
}: TimelineViewProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed rounded">
        <div className="text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No engagement data available</p>
          <p className="text-xs text-muted-foreground">Start participating to see your timeline</p>
        </div>
      </div>
    );
  }

  const getMetricValue = (point: EngagementPoint): number => {
    switch (metricFilter) {
      case 'participation': return point.activity.debateParticipation;
      case 'quality': return point.activity.qualityScore;
      case 'interaction': return point.activity.peerConnections * 10; // Scale for visibility
      default: return point.value;
    }
  };

  // Calculate timeline bounds
  const minDate = Math.min(...data.map(p => p.timestamp.getTime()));
  const maxDate = Math.max(...data.map(p => p.timestamp.getTime()));
  const timeSpan = maxDate - minDate;

  const normalizeX = (date: Date, width: number) => {
    return ((date.getTime() - minDate) / timeSpan) * (width - 60) + 30;
  };

  const normalizeY = (value: number, height: number) => {
    return height - 40 - ((value / 100) * (height - 80));
  };

  return (
    <div className="relative h-96">
      <svg width="100%" height="100%" className="border rounded">
        {/* Grid */}
        <defs>
          <pattern id="timeline-grid" width="40" height="30" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#timeline-grid)" />

        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map(value => (
          <g key={value}>
            <line
              x1={25}
              y1={normalizeY(value, 384)}
              x2={30}
              y2={normalizeY(value, 384)}
              stroke="#6b7280"
              strokeWidth={1}
            />
            <text
              x={20}
              y={normalizeY(value, 384) + 4}
              textAnchor="end"
              className="text-xs fill-muted-foreground"
            >
              {value}%
            </text>
          </g>
        ))}

        {/* Engagement line */}
        <path
          d={data.map((point, i) => 
            `${i === 0 ? 'M' : 'L'} ${normalizeX(point.timestamp, window.innerWidth * 0.8)} ${normalizeY(getMetricValue(point), 384)}`
          ).join(' ')}
          stroke="#3b82f6"
          strokeWidth={2}
          fill="none"
          className={isAnimating ? 'animate-pulse' : ''}
        />

        {/* Engagement points */}
        {data.map((point, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <circle
                cx={normalizeX(point.timestamp, window.innerWidth * 0.8)}
                cy={normalizeY(getMetricValue(point), 384)}
                r={4 + (point.activity.messageCount / 10)}
                fill="#3b82f6"
                className="cursor-pointer hover:opacity-80"
                opacity={0.7}
              />
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-semibold">Engagement: {Math.round(point.value)}%</p>
                <p className="text-sm">Messages: {point.activity.messageCount}</p>
                <p className="text-sm">Quality: {Math.round(point.activity.qualityScore)}%</p>
                <p className="text-sm">Time: {point.activity.interactionTime}min</p>
                <p className="text-xs">{format(point.timestamp, 'PPp')}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Debate markers */}
        {showDebates && debates.map((debate, index) => (
          <Tooltip key={debate.id}>
            <TooltipTrigger asChild>
              <g
                className="cursor-pointer"
                onClick={() => onDebateSelect(debate.id)}
              >
                <rect
                  x={normalizeX(debate.startTime, window.innerWidth * 0.8) - 15}
                  y={20}
                  width={30}
                  height={344}
                  fill="#f59e0b"
                  fillOpacity={0.1}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                />
                <text
                  x={normalizeX(debate.startTime, window.innerWidth * 0.8)}
                  y={35}
                  textAnchor="middle"
                  className="text-xs font-medium fill-amber-700"
                >
                  {debate.title.substring(0, 10)}...
                </text>
              </g>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-semibold">{debate.title}</p>
                <p className="text-sm">Topic: {debate.topic}</p>
                <p className="text-sm">Engagement: {Math.round(debate.engagementScore)}%</p>
                <p className="text-sm">Participants: {debate.participantCount}</p>
                <p className="text-xs">{format(debate.startTime, 'PPp')}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Activity events */}
        {showActivities && data.flatMap(point => 
          (point.events || []).map((event, eventIndex) => {
            const x = normalizeX(event.timestamp, window.innerWidth * 0.8);
            const y = normalizeY(getMetricValue(point), 384) - 15;
            
            return (
              <Tooltip key={`${point.timestamp.getTime()}-${eventIndex}`}>
                <TooltipTrigger asChild>
                  <circle
                    cx={x}
                    cy={y}
                    r={3 + event.impact * 2}
                    fill="#10b981"
                    className="cursor-pointer"
                    opacity={0.7}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-semibold">{event.type.replace('_', ' ')}</p>
                    <p className="text-sm">Impact: {Math.round(event.impact * 100)}%</p>
                    <p className="text-xs">{format(event.timestamp, 'pp')}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })
        )}

        {/* Time axis labels */}
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map(point => (
          <text
            key={point.timestamp.getTime()}
            x={normalizeX(point.timestamp, window.innerWidth * 0.8)}
            y={375}
            textAnchor="middle"
            className="text-xs fill-muted-foreground"
          >
            {format(point.timestamp, 'MMM d')}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-0.5 bg-blue-500" />
          <span>Engagement Level</span>
        </div>
        {showDebates && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 border-2 border-dashed border-amber-500 bg-amber-100" />
            <span>Debate Sessions</span>
          </div>
        )}
        {showActivities && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Activity Events</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HeatMapView({ data, timeRange }: { data: EngagementPoint[]; timeRange: string }) {
  return (
    <div className="h-64 flex items-center justify-center border-2 border-dashed rounded">
      <div className="text-center">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Heat Map View</p>
        <p className="text-xs text-muted-foreground">Engagement heat map visualization coming soon</p>
      </div>
    </div>
  );
}

function CorrelationView({ data, debates }: { data: EngagementPoint[]; debates: DebateSession[] }) {
  return (
    <div className="h-64 flex items-center justify-center border-2 border-dashed rounded">
      <div className="text-center">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Activity Correlation</p>
        <p className="text-xs text-muted-foreground">Correlation analysis visualization coming soon</p>
      </div>
    </div>
  );
}

function DebateDetailPanel({ debate, onClose }: { debate: DebateSession; onClose: () => void }) {
  return (
    <div className="p-4 border rounded-lg bg-muted/20">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold">{debate.title}</h3>
          <p className="text-sm text-muted-foreground">{debate.topic}</p>
          <p className="text-xs text-muted-foreground">
            {format(debate.startTime, 'PPp')} - {format(debate.endTime, 'p')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold">{Math.round(debate.engagementScore)}%</div>
          <div className="text-xs text-muted-foreground">Engagement</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold">{debate.participantCount}</div>
          <div className="text-xs text-muted-foreground">Participants</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold">{debate.messageCount}</div>
          <div className="text-xs text-muted-foreground">Messages</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold">
            {Math.round((debate.endTime.getTime() - debate.startTime.getTime()) / 60000)}
          </div>
          <div className="text-xs text-muted-foreground">Minutes</div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="space-y-2 mb-4">
        <h4 className="font-medium text-sm">Quality Metrics</h4>
        {Object.entries(debate.qualityMetrics).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-muted rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${value * 100}%` }}
                />
              </div>
              <span className="w-8 text-xs">{Math.round(value * 100)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Outcomes */}
      {debate.outcomes.skillsImproved.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-2">Skills Improved</h4>
          <div className="flex flex-wrap gap-1">
            {debate.outcomes.skillsImproved.map(skill => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
