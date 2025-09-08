/**
 * Plasticity Map Component
 * 
 * Task 7.5.4: Visual representation of belief evolution and opinion plasticity
 * over time with interactive heat maps and trajectory visualization.
 */

'use client';

import React, { useState, useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { 
  Brain, 
  TrendingUp, 
  RotateCcw, 
  Download, 
  Info,
  Calendar,
  Target,
  Zap,
  Eye,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeliefPosition {
  id: string;
  topic: string;
  axis: string; // e.g., 'liberal-conservative', 'authoritarian-libertarian'
  value: number; // -1 to 1 scale
  confidence: number; // 0 to 1 scale
  timestamp: Date;
  context?: {
    debateId?: string;
    evidenceCount?: number;
    sourcesViewed?: number;
    timeSpent?: number; // minutes
  };
}

interface PlasticityEvent {
  id: string;
  timestamp: Date;
  type: 'debate_completed' | 'reflection_submitted' | 'evidence_reviewed' | 'peer_interaction';
  magnitude: number; // 0-1, how much change occurred
  topics: string[];
  description: string;
}

interface PlasticityMapProps {
  beliefHistory: BeliefPosition[];
  plasticityEvents: PlasticityEvent[];
  timeRange?: 'week' | 'month' | 'semester' | 'year';
  showTrajectory?: boolean;
  showEvents?: boolean;
  showHeatMap?: boolean;
  interactive?: boolean;
  className?: string;
}

export function PlasticityMap({
  beliefHistory,
  plasticityEvents,
  timeRange = 'month',
  showTrajectory = true,
  showEvents = true,
  showHeatMap = false,
  interactive = true,
  className
}: PlasticityMapProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedAxis, setSelectedAxis] = useState<string>('all');
  const [currentShowHeatMap, setShowHeatMap] = useState(showHeatMap);
  const [timeFilter, setTimeFilter] = useState(timeRange);
  const [showConfidence, setShowConfidence] = useState(true);
  const [plasticityThreshold, setPlasticityThreshold] = useState([0.1]);

  // Get unique topics and axes
  const { topics, axes } = useMemo(() => {
    const topicSet = new Set(beliefHistory.map(b => b.topic));
    const axisSet = new Set(beliefHistory.map(b => b.axis));
    return {
      topics: Array.from(topicSet).sort(),
      axes: Array.from(axisSet).sort()
    };
  }, [beliefHistory]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    const days = { week: 7, month: 30, semester: 120, year: 365 }[timeFilter];
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filteredBeliefs = beliefHistory.filter(belief => {
      const matchesTime = belief.timestamp >= cutoffDate;
      const matchesTopic = selectedTopic === 'all' || belief.topic === selectedTopic;
      const matchesAxis = selectedAxis === 'all' || belief.axis === selectedAxis;
      return matchesTime && matchesTopic && matchesAxis;
    });

    const filteredEvents = plasticityEvents.filter(event => {
      const matchesTime = event.timestamp >= cutoffDate;
      const matchesThreshold = event.magnitude >= plasticityThreshold[0];
      return matchesTime && matchesThreshold;
    });

    return { beliefs: filteredBeliefs, events: filteredEvents };
  }, [beliefHistory, plasticityEvents, timeFilter, selectedTopic, selectedAxis, plasticityThreshold]);

  // Calculate plasticity metrics
  const plasticityMetrics = useMemo(() => {
    const { beliefs } = filteredData;
    if (beliefs.length < 2) return null;

    // Group by topic-axis combination
    const grouped = beliefs.reduce((acc, belief) => {
      const key = `${belief.topic}-${belief.axis}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(belief);
      return acc;
    }, {} as Record<string, BeliefPosition[]>);

    // Calculate metrics for each group
    const metrics = Object.entries(grouped).map(([key, positions]) => {
      const sorted = positions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const changes = sorted.slice(1).map((pos, i) => 
        Math.abs(pos.value - sorted[i].value)
      );
      
      const totalChange = changes.reduce((sum, change) => sum + change, 0);
      const avgChange = changes.length > 0 ? totalChange / changes.length : 0;
      const maxChange = Math.max(...changes, 0);
      
      const [topic, axis] = key.split('-');
      
      return {
        topic,
        axis,
        totalChange,
        avgChange,
        maxChange,
        changeCount: changes.length,
        plasticityScore: Math.min(1, avgChange * 2), // Normalize to 0-1
        positions: sorted
      };
    });

    const overallScore = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.plasticityScore, 0) / metrics.length
      : 0;

    return { overall: overallScore, byTopic: metrics };
  }, [filteredData]);

  const exportData = () => {
    const exportData = {
      beliefs: filteredData.beliefs,
      events: filteredData.events,
      metrics: plasticityMetrics,
      filters: { topic: selectedTopic, axis: selectedAxis, timeFilter }
    };
    console.log('Exporting plasticity data:', exportData);
    // In a real app, this would generate a downloadable file
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Opinion Plasticity Map</span>
                {plasticityMetrics && (
                  <Badge variant="outline">
                    Plasticity: {Math.round(plasticityMetrics.overall * 100)}%
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Track how your beliefs and positions evolve over time through debates and learning
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="h-4 w-4" />
              </Button>
              <Tooltip>
                <TooltipTrigger>
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2">
                    <p className="font-medium">Understanding Plasticity</p>
                    <p className="text-sm">Higher plasticity indicates greater openness to changing views when presented with new evidence.</p>
                    <p className="text-sm">Healthy plasticity shows intellectual flexibility while maintaining core values.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger>
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map(topic => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedAxis} onValueChange={setSelectedAxis}>
              <SelectTrigger>
                <SelectValue placeholder="All Axes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dimensions</SelectItem>
                {axes.map(axis => (
                  <SelectItem key={axis} value={axis}>{axis}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="semester">Semester</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch 
                checked={currentShowHeatMap} 
                onCheckedChange={setShowHeatMap}
                id="heatmap"
              />
              <label htmlFor="heatmap" className="text-sm">Heat Map</label>
            </div>
          </div>

          {/* Plasticity Threshold */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Plasticity Sensitivity: {plasticityThreshold[0].toFixed(2)}
            </label>
            <Slider
              value={plasticityThreshold}
              onValueChange={setPlasticityThreshold}
              max={1}
              min={0.01}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Adjust to show more or fewer belief changes
            </p>
          </div>

          {/* Main Visualization */}
          {showHeatMap ? (
            <PlasticityHeatMap
              beliefs={filteredData.beliefs}
              events={filteredData.events}
              metrics={plasticityMetrics}
            />
          ) : (
            <PlasticityTrajectory
              beliefs={filteredData.beliefs}
              events={filteredData.events}
              showTrajectory={showTrajectory}
              showEvents={showEvents}
              showConfidence={showConfidence}
            />
          )}

          {/* Metrics Summary */}
          {plasticityMetrics && (
            <PlasticityMetrics metrics={plasticityMetrics} />
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface PlasticityTrajectoryProps {
  beliefs: BeliefPosition[];
  events: PlasticityEvent[];
  showTrajectory: boolean;
  showEvents: boolean;
  showConfidence: boolean;
}

function PlasticityTrajectory({ 
  beliefs, 
  events, 
  showTrajectory, 
  showEvents, 
  showConfidence 
}: PlasticityTrajectoryProps) {
  if (beliefs.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border-2 border-dashed rounded">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No belief data to display</p>
          <p className="text-xs text-muted-foreground">Participate in debates to track your plasticity</p>
        </div>
      </div>
    );
  }

  // Group beliefs by topic for trajectory lines
  const beliefsByTopic = beliefs.reduce((acc, belief) => {
    const key = `${belief.topic}-${belief.axis}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(belief);
    return acc;
  }, {} as Record<string, BeliefPosition[]>);

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ];

  return (
    <div className="relative h-96">
      <svg width="100%" height="100%" className="border rounded">
        {/* Grid */}
        <defs>
          <pattern id="plasticity-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#plasticity-grid)" />

        {/* Center line (neutral position) */}
        <line 
          x1="50%" 
          y1="0" 
          x2="50%" 
          y2="100%" 
          stroke="#94a3b8" 
          strokeWidth="2" 
          strokeDasharray="5,5" 
          opacity="0.5"
        />

        {/* Axis labels */}
        <text x="10%" y="20" className="text-xs fill-muted-foreground" textAnchor="middle">
          Strong Disagree
        </text>
        <text x="90%" y="20" className="text-xs fill-muted-foreground" textAnchor="middle">
          Strong Agree
        </text>

        {/* Belief trajectories */}
        {showTrajectory && Object.entries(beliefsByTopic).map(([key, topicBeliefs], index) => {
          const color = colors[index % colors.length];
          const sorted = topicBeliefs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          // Calculate positions
          const points = sorted.map(belief => ({
            x: ((belief.value + 1) / 2) * 80 + 10, // Convert -1,1 to 10,90 percentage
            y: 20 + (index * 30) + Math.random() * 20, // Vertical spacing with some jitter
            belief
          }));

          return (
            <g key={key}>
              {/* Trajectory line */}
              <polyline
                points={points.map(p => `${p.x}%,${p.y}%`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
                opacity="0.7"
              />
              
              {/* Belief points */}
              {points.map((point, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger>
                    <circle
                      cx={`${point.x}%`}
                      cy={`${point.y}%`}
                      r={showConfidence ? point.belief.confidence * 8 + 2 : 4}
                      fill={color}
                      className="cursor-pointer hover:opacity-100"
                      opacity={0.8}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-semibold">{point.belief.topic}</p>
                      <p className="text-sm">{point.belief.axis}</p>
                      <p className="text-sm">Position: {point.belief.value.toFixed(2)}</p>
                      <p className="text-sm">Confidence: {Math.round(point.belief.confidence * 100)}%</p>
                      <p className="text-xs">{point.belief.timestamp.toLocaleDateString()}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </g>
          );
        })}

        {/* Plasticity events */}
        {showEvents && events.map((event, index) => {
          const x = Math.random() * 80 + 10; // Random x position
          const y = 10 + (index * 5); // Stagger vertically
          
          return (
            <Tooltip key={event.id}>
              <TooltipTrigger>
                <g>
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r={event.magnitude * 6 + 2}
                    fill="#f59e0b"
                    stroke="#92400e"
                    strokeWidth="1"
                    className="cursor-pointer"
                    opacity="0.7"
                  />
                  <text
                    x={`${x}%`}
                    y={`${y + 1}%`}
                    textAnchor="middle"
                    className="text-xs fill-white font-medium"
                  >
                    !
                  </text>
                </g>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">{event.type.replace('_', ' ')}</p>
                  <p className="text-sm">{event.description}</p>
                  <p className="text-sm">Magnitude: {Math.round(event.magnitude * 100)}%</p>
                  <p className="text-xs">{event.timestamp.toLocaleDateString()}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.keys(beliefsByTopic).map((key, index) => {
          const color = colors[index % colors.length];
          const [topic, axis] = key.split('-');
          
          return (
            <div key={key} className="flex items-center space-x-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{topic} - {axis}</span>
            </div>
          );
        })}
        {showEvents && (
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Plasticity Events</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PlasticityHeatMap({ beliefs, events, metrics }: any) {
  return (
    <div className="h-64 flex items-center justify-center border-2 border-dashed rounded">
      <div className="text-center">
        <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Heat Map View</p>
        <p className="text-xs text-muted-foreground">Interactive heat map visualization coming soon</p>
      </div>
    </div>
  );
}

function PlasticityMetrics({ metrics }: any) {
  if (!metrics || metrics.byTopic.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Plasticity Analysis</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(metrics.overall * 100)}%
          </div>
          <div className="text-sm text-muted-foreground">Overall Plasticity</div>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {metrics.byTopic.length}
          </div>
          <div className="text-sm text-muted-foreground">Topics Tracked</div>
        </div>
        
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(Math.max(...metrics.byTopic.map((m: any) => m.maxChange)) * 100)}%
          </div>
          <div className="text-sm text-muted-foreground">Max Change</div>
        </div>
      </div>

      <div className="space-y-2">
        {metrics.byTopic.map((metric: any, index: number) => (
          <div key={`${metric.topic}-${metric.axis}`} className="flex items-center justify-between p-2 border rounded">
            <div>
              <span className="font-medium text-sm">{metric.topic}</span>
              <span className="text-xs text-muted-foreground ml-2">({metric.axis})</span>
            </div>
            <div className="text-right">
              <div className="font-medium">{Math.round(metric.plasticityScore * 100)}%</div>
              <div className="text-xs text-muted-foreground">{metric.changeCount} changes</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
