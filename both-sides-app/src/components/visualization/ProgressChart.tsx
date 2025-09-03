/**
 * Progress Chart Component
 * 
 * Task 7.5.4: Interactive progress visualization with multiple metrics,
 * time ranges, and drill-down capabilities for learning analytics.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Info,
  Calendar,
  Target,
  Zap,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: Date;
  value: number;
  label?: string;
  category?: string;
  metadata?: Record<string, any>;
}

interface ChartSeries {
  id: string;
  name: string;
  data: DataPoint[];
  color: string;
  type: 'line' | 'bar' | 'area';
  visible: boolean;
}

interface ProgressChartProps {
  title: string;
  description?: string;
  series: ChartSeries[];
  timeRange?: 'week' | 'month' | 'semester' | 'year';
  showComparison?: boolean;
  showTrend?: boolean;
  onDataPointClick?: (point: DataPoint, series: ChartSeries) => void;
  className?: string;
  height?: number;
}

export function ProgressChart({
  title,
  description,
  series,
  timeRange = 'month',
  showComparison = false,
  showTrend = false,
  onDataPointClick,
  className,
  height = 300
}: ProgressChartProps) {
  const [selectedSeries, setSelectedSeries] = useState<string[]>(
    series.filter(s => s.visible).map(s => s.id)
  );
  const [viewType, setViewType] = useState<'line' | 'bar' | 'area'>('line');
  const [timeFilter, setTimeFilter] = useState(timeRange);

  // Filter data based on time range
  const filteredSeries = useMemo(() => {
    const days = {
      week: 7,
      month: 30,
      semester: 120,
      year: 365
    }[timeFilter];

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return series.map(s => ({
      ...s,
      data: s.data.filter(point => point.date >= cutoffDate)
    }));
  }, [series, timeFilter]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const visibleSeries = filteredSeries.filter(s => selectedSeries.includes(s.id));
    if (visibleSeries.length === 0) return null;

    const allValues = visibleSeries.flatMap(s => s.data.map(d => d.value));
    const latest = visibleSeries.map(s => s.data[s.data.length - 1]?.value || 0);
    const previous = visibleSeries.map(s => s.data[Math.max(0, s.data.length - 2)]?.value || 0);
    
    return {
      current: latest.reduce((sum, val) => sum + val, 0) / latest.length,
      previous: previous.reduce((sum, val) => sum + val, 0) / previous.length,
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      trend: latest[0] > previous[0] ? 'up' : latest[0] < previous[0] ? 'down' : 'stable'
    };
  }, [filteredSeries, selectedSeries]);

  const toggleSeries = (seriesId: string) => {
    setSelectedSeries(prev => 
      prev.includes(seriesId) 
        ? prev.filter(id => id !== seriesId)
        : [...prev, seriesId]
    );
  };

  const exportChart = () => {
    // In a real app, this would generate and download the chart
    console.log('Exporting chart data:', { series: filteredSeries, timeFilter, viewType });
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>{title}</span>
                {statistics && showTrend && (
                  <Badge variant={statistics.trend === 'up' ? 'default' : 'secondary'}>
                    {statistics.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : statistics.trend === 'down' ? (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    ) : null}
                    {statistics.trend}
                  </Badge>
                )}
              </CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            
            <div className="flex items-center space-x-2">
              <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                  <SelectItem value="year">Past Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={viewType} onValueChange={(value) => setViewType(value as any)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={exportChart}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Statistics Summary */}
            {statistics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Math.round(statistics.current)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Current</div>
                </div>
                <div className="text-center">
                  <div className={cn(
                    "text-lg font-semibold",
                    statistics.trend === 'up' ? 'text-green-600' : 
                    statistics.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                  )}>
                    {statistics.trend === 'up' ? '+' : statistics.trend === 'down' ? '-' : '±'}
                    {Math.abs(Math.round(statistics.current - statistics.previous))}%
                  </div>
                  <div className="text-xs text-muted-foreground">Change</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {Math.round(statistics.max)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Peak</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {Math.round((statistics.current / statistics.max) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">of Peak</div>
                </div>
              </div>
            )}

            {/* Chart Area */}
            <div className="relative" style={{ height: `${height}px` }}>
              <ChartCanvas
                series={filteredSeries.filter(s => selectedSeries.includes(s.id))}
                viewType={viewType}
                height={height}
                onDataPointClick={onDataPointClick}
              />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2">
              {series.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSeries(s.id)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1 rounded-full border transition-colors",
                    selectedSeries.includes(s.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-border"
                  )}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-sm">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface ChartCanvasProps {
  series: ChartSeries[];
  viewType: 'line' | 'bar' | 'area';
  height: number;
  onDataPointClick?: (point: DataPoint, series: ChartSeries) => void;
}

function ChartCanvas({ series, viewType, height, onDataPointClick }: ChartCanvasProps) {
  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20 rounded border-2 border-dashed">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No data to display</p>
          <p className="text-xs text-muted-foreground">Select a data series to view the chart</p>
        </div>
      </div>
    );
  }

  // Create mock SVG chart (in a real app, you'd use a library like Recharts or Chart.js)
  const allDataPoints = series.flatMap(s => s.data.map(d => d.value));
  const minValue = Math.min(...allDataPoints);
  const maxValue = Math.max(...allDataPoints);
  const valueRange = maxValue - minValue || 1;

  // Get date range
  const allDates = series.flatMap(s => s.data.map(d => d.date));
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const timeRange = maxDate.getTime() - minDate.getTime() || 1;

  const normalizeY = (value: number) => {
    return ((maxValue - value) / valueRange) * (height - 60) + 30;
  };

  const normalizeX = (date: Date, width: number) => {
    return ((date.getTime() - minDate.getTime()) / timeRange) * (width - 60) + 30;
  };

  return (
    <div className="relative w-full h-full">
      <svg width="100%" height="100%" className="absolute inset-0">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Chart series */}
        {series.map((s, seriesIndex) => {
          const points = s.data.map((point, index) => ({
            x: normalizeX(point.date, window.innerWidth * 0.8),
            y: normalizeY(point.value),
            point,
            index
          }));

          if (viewType === 'line' || viewType === 'area') {
            const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            
            return (
              <g key={s.id}>
                {viewType === 'area' && (
                  <path
                    d={`${pathData} L ${points[points.length - 1]?.x || 0} ${height - 30} L ${points[0]?.x || 0} ${height - 30} Z`}
                    fill={s.color}
                    fillOpacity={0.1}
                  />
                )}
                <path
                  d={pathData}
                  stroke={s.color}
                  strokeWidth={2}
                  fill="none"
                />
                {points.map((p, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={4}
                        fill={s.color}
                        className="cursor-pointer hover:r-6 transition-all"
                        onClick={() => onDataPointClick?.(p.point, s)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-semibold">{s.name}</p>
                        <p>{p.point.value}%</p>
                        <p className="text-xs">{p.point.date.toLocaleDateString()}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </g>
            );
          } else {
            // Bar chart
            const barWidth = Math.min(20, (window.innerWidth * 0.8 - 60) / points.length - 2);
            
            return (
              <g key={s.id}>
                {points.map((p, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <rect
                        x={p.x - barWidth / 2}
                        y={p.y}
                        width={barWidth}
                        height={height - 30 - p.y}
                        fill={s.color}
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => onDataPointClick?.(p.point, s)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-semibold">{s.name}</p>
                        <p>{p.point.value}%</p>
                        <p className="text-xs">{p.point.date.toLocaleDateString()}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </g>
            );
          }
        })}

        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map(value => (
          <g key={value}>
            <line
              x1={25}
              y1={normalizeY(value)}
              x2={30}
              y2={normalizeY(value)}
              stroke="#6b7280"
              strokeWidth={1}
            />
            <text
              x={20}
              y={normalizeY(value) + 4}
              textAnchor="end"
              className="text-xs fill-muted-foreground"
            >
              {value}%
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {series[0]?.data.filter((_, i) => i % Math.ceil(series[0].data.length / 5) === 0).map((point) => (
          <g key={point.date.getTime()}>
            <line
              x1={normalizeX(point.date, window.innerWidth * 0.8)}
              y1={height - 30}
              x2={normalizeX(point.date, window.innerWidth * 0.8)}
              y2={height - 25}
              stroke="#6b7280"
              strokeWidth={1}
            />
            <text
              x={normalizeX(point.date, window.innerWidth * 0.8)}
              y={height - 10}
              textAnchor="middle"
              className="text-xs fill-muted-foreground"
            >
              {point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Multi-metric progress chart for comprehensive analytics
export function MultiMetricProgressChart({ 
  metrics, 
  className 
}: { 
  metrics: Array<{
    id: string;
    name: string;
    data: Array<{ date: Date; value: number; }>;
    target?: number;
    color: string;
  }>;
  className?: string;
}) {
  const series: ChartSeries[] = metrics.map(metric => ({
    id: metric.id,
    name: metric.name,
    data: metric.data,
    color: metric.color,
    type: 'line' as const,
    visible: true
  }));

  return (
    <ProgressChart
      title="Learning Progress Overview"
      description="Track multiple competencies and skills over time"
      series={series}
      showComparison
      showTrend
      className={className}
      height={400}
    />
  );
}

// Compact progress chart for dashboard widgets
export function CompactProgressChart({
  data,
  title,
  color = '#3b82f6',
  className
}: {
  data: Array<{ date: Date; value: number; }>;
  title: string;
  color?: string;
  className?: string;
}) {
  const series: ChartSeries[] = [{
    id: 'progress',
    name: title,
    data,
    color,
    type: 'area' as const,
    visible: true
  }];

  return (
    <ProgressChart
      title={title}
      series={series}
      showTrend
      className={className}
      height={150}
    />
  );
}
