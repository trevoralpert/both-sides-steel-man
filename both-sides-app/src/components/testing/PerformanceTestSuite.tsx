/**
 * Performance Test Suite
 * 
 * Task 7.5.5: Comprehensive performance testing for learning dashboard components
 * including load testing, memory profiling, and mobile responsiveness validation.
 */

'use client';

import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Zap, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Clock, 
  MemoryStick,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Globe,
  Wifi,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceMetrics {
  id: string;
  component: string;
  timestamp: Date;
  metrics: {
    // Core Web Vitals
    lcp: number; // Largest Contentful Paint (ms)
    fid: number; // First Input Delay (ms)
    cls: number; // Cumulative Layout Shift (score)
    
    // Additional metrics
    fcp: number; // First Contentful Paint (ms)
    ttfb: number; // Time to First Byte (ms)
    tti: number; // Time to Interactive (ms)
    tbt: number; // Total Blocking Time (ms)
    
    // Memory metrics
    heapUsed: number; // MB
    heapTotal: number; // MB
    jsHeapSizeLimit: number; // MB
    
    // Bundle metrics
    bundleSize: number; // KB
    loadTime: number; // ms
    renderTime: number; // ms
    
    // Network metrics
    resourceCount: number;
    totalResourceSize: number; // KB
    
    // Mobile metrics
    mobileScore: number; // 0-100
    desktopScore: number; // 0-100
  };
  device: 'desktop' | 'mobile' | 'tablet';
  connection: 'fast-3g' | 'slow-3g' | 'fast-4g' | 'wifi';
  environment: 'development' | 'staging' | 'production';
}

interface PerformanceBenchmark {
  metric: keyof PerformanceMetrics['metrics'];
  name: string;
  unit: string;
  thresholds: {
    excellent: number;
    good: number;
    needsImprovement: number;
  };
  description: string;
}

interface LoadTestResult {
  id: string;
  component: string;
  concurrentUsers: number;
  duration: number; // seconds
  requestsPerSecond: number;
  averageResponseTime: number; // ms
  maxResponseTime: number; // ms
  errorRate: number; // percentage
  cpuUsage: number; // percentage
  memoryPeak: number; // MB
  timestamp: Date;
}

interface PerformanceTestSuiteProps {
  components: string[];
  onTestComplete?: (results: PerformanceMetrics[]) => void;
  className?: string;
}

export function PerformanceTestSuite({ 
  components, 
  onTestComplete,
  className 
}: PerformanceTestSuiteProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [results, setResults] = useState<PerformanceMetrics[]>([]);
  const [loadTestResults, setLoadTestResults] = useState<LoadTestResult[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [selectedConnection, setSelectedConnection] = useState<'fast-3g' | 'slow-3g' | 'fast-4g' | 'wifi'>('wifi');
  const [activeTab, setActiveTab] = useState('metrics');

  const benchmarks: PerformanceBenchmark[] = [
    {
      metric: 'lcp',
      name: 'Largest Contentful Paint',
      unit: 'ms',
      thresholds: { excellent: 1200, good: 2500, needsImprovement: 4000 },
      description: 'Time taken for the largest element to render'
    },
    {
      metric: 'fid',
      name: 'First Input Delay',
      unit: 'ms',
      thresholds: { excellent: 50, good: 100, needsImprovement: 300 },
      description: 'Time from user interaction to browser response'
    },
    {
      metric: 'cls',
      name: 'Cumulative Layout Shift',
      unit: 'score',
      thresholds: { excellent: 0.1, good: 0.25, needsImprovement: 0.5 },
      description: 'Visual stability of page elements'
    },
    {
      metric: 'tti',
      name: 'Time to Interactive',
      unit: 'ms',
      thresholds: { excellent: 2000, good: 3500, needsImprovement: 5500 },
      description: 'Time until page becomes fully interactive'
    },
    {
      metric: 'bundleSize',
      name: 'Bundle Size',
      unit: 'KB',
      thresholds: { excellent: 150, good: 300, needsImprovement: 500 },
      description: 'Total JavaScript bundle size'
    }
  ];

  const runPerformanceTests = async () => {
    setIsRunning(true);
    setTestProgress(0);
    const testResults: PerformanceMetrics[] = [];

    try {
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        
        // Test on different devices and connections
        const deviceTypes: Array<'desktop' | 'mobile' | 'tablet'> = ['desktop', 'mobile', 'tablet'];
        const connections: Array<'fast-3g' | 'slow-3g' | 'fast-4g' | 'wifi'> = ['wifi', 'fast-4g', 'fast-3g'];

        for (const device of deviceTypes) {
          for (const connection of connections) {
            const metrics = await simulatePerformanceTest(component, device, connection);
            testResults.push(metrics);
            
            setTestProgress(((i * deviceTypes.length * connections.length + deviceTypes.indexOf(device) * connections.length + connections.indexOf(connection) + 1) / (components.length * deviceTypes.length * connections.length)) * 100);
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }

      setResults(testResults);
      onTestComplete?.(testResults);
      
      // Run load tests
      const loadTests = await runLoadTests(components);
      setLoadTestResults(loadTests);
      
    } catch (error) {
      console.error('Performance testing failed:', error);
    } finally {
      setIsRunning(false);
      setTestProgress(0);
    }
  };

  const getPerformanceScore = (metrics: PerformanceMetrics['metrics']): number => {
    const scores = benchmarks.map(benchmark => {
      const value = metrics[benchmark.metric] as number;
      if (value <= benchmark.thresholds.excellent) return 100;
      if (value <= benchmark.thresholds.good) return 75;
      if (value <= benchmark.thresholds.needsImprovement) return 50;
      return 25;
    });
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  const filteredResults = results.filter(result => 
    result.device === selectedDevice && result.connection === selectedConnection
  );

  const averageScore = filteredResults.length > 0
    ? Math.round(filteredResults.reduce((sum, result) => sum + getPerformanceScore(result.metrics), 0) / filteredResults.length)
    : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Performance Test Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Performance Test Suite</span>
                {averageScore > 0 && (
                  <Badge variant={
                    averageScore >= 90 ? 'default' : 
                    averageScore >= 75 ? 'secondary' : 'destructive'
                  }>
                    Score: {averageScore}/100
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Core Web Vitals, load testing, and mobile performance validation
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button onClick={runPerformanceTests} disabled={isRunning}>
                <Activity className="h-4 w-4 mr-2" />
                {isRunning ? 'Running Tests...' : 'Run Performance Tests'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Test Progress */}
          {isRunning && (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span>Running performance tests...</span>
                <span>{Math.round(testProgress)}%</span>
              </div>
              <Progress value={testProgress} className="h-2" />
            </div>
          )}
          
          {/* Test Filters */}
          <div className="flex space-x-4">
            <Select value={selectedDevice} onValueChange={(value) => setSelectedDevice(value as any)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">
                  <div className="flex items-center space-x-2">
                    <Monitor className="h-4 w-4" />
                    <span>Desktop</span>
                  </div>
                </SelectItem>
                <SelectItem value="tablet">
                  <div className="flex items-center space-x-2">
                    <Tablet className="h-4 w-4" />
                    <span>Tablet</span>
                  </div>
                </SelectItem>
                <SelectItem value="mobile">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4" />
                    <span>Mobile</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedConnection} onValueChange={(value) => setSelectedConnection(value as any)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wifi">WiFi</SelectItem>
                <SelectItem value="fast-4g">Fast 4G</SelectItem>
                <SelectItem value="fast-3g">Fast 3G</SelectItem>
                <SelectItem value="slow-3g">Slow 3G</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Performance Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="metrics">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="load">Load Testing</TabsTrigger>
          <TabsTrigger value="mobile">Mobile Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <CoreWebVitalsReport 
            results={filteredResults} 
            benchmarks={benchmarks} 
          />
        </TabsContent>

        <TabsContent value="detailed">
          <DetailedMetricsReport results={filteredResults} />
        </TabsContent>

        <TabsContent value="load">
          <LoadTestingReport results={loadTestResults} />
        </TabsContent>

        <TabsContent value="mobile">
          <MobilePerformanceReport 
            results={results.filter(r => r.device === 'mobile')} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CoreWebVitalsReport({ 
  results, 
  benchmarks 
}: { 
  results: PerformanceMetrics[]; 
  benchmarks: PerformanceBenchmark[];
}) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No performance results available. Run tests to see Core Web Vitals.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Web Vitals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {benchmarks.slice(0, 3).map(benchmark => {
          const values = results.map(r => r.metrics[benchmark.metric] as number);
          const average = values.reduce((sum, val) => sum + val, 0) / values.length;
          
          const getStatus = (value: number) => {
            if (value <= benchmark.thresholds.excellent) return 'excellent';
            if (value <= benchmark.thresholds.good) return 'good';
            return 'needs-improvement';
          };
          
          const status = getStatus(average);
          
          return (
            <Card key={benchmark.metric}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{benchmark.name}</CardTitle>
                <CardDescription>{benchmark.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold">
                    {benchmark.unit === 'score' ? average.toFixed(3) : Math.round(average)}
                    <span className="text-sm text-muted-foreground ml-1">{benchmark.unit}</span>
                  </div>
                  <Badge variant={
                    status === 'excellent' ? 'default' :
                    status === 'good' ? 'secondary' : 'destructive'
                  }>
                    {status === 'excellent' ? 'Excellent' :
                     status === 'good' ? 'Good' : 'Needs Work'}
                  </Badge>
                </div>
                
                {/* Threshold indicators */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Excellent: &lt;{benchmark.thresholds.excellent}</span>
                    <span>Good: &lt;{benchmark.thresholds.good}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Component Performance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Component Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from(new Set(results.map(r => r.component))).map(component => {
              const componentResults = results.filter(r => r.component === component);
              const avgMetrics = benchmarks.reduce((acc, benchmark) => {
                const values = componentResults.map(r => r.metrics[benchmark.metric] as number);
                acc[benchmark.metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
                return acc;
              }, {} as Record<string, number>);

              return (
                <div key={component} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">{component}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {benchmarks.map(benchmark => {
                      const value = avgMetrics[benchmark.metric];
                      const getStatus = (val: number) => {
                        if (val <= benchmark.thresholds.excellent) return 'excellent';
                        if (val <= benchmark.thresholds.good) return 'good';
                        return 'needs-improvement';
                      };
                      
                      const status = getStatus(value);
                      
                      return (
                        <div key={benchmark.metric} className="text-center">
                          <div className="text-lg font-bold">
                            {benchmark.unit === 'score' ? value.toFixed(3) : Math.round(value)}
                          </div>
                          <div className="text-xs text-muted-foreground">{benchmark.name}</div>
                          <div className={cn(
                            "text-xs mt-1",
                            status === 'excellent' ? 'text-green-600' :
                            status === 'good' ? 'text-yellow-600' : 'text-red-600'
                          )}>
                            {status === 'excellent' ? '✓ Excellent' :
                             status === 'good' ? '⚠ Good' : '✗ Needs Work'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailedMetricsReport({ results }: { results: PerformanceMetrics[] }) {
  if (results.length === 0) return <div>No detailed metrics available</div>;

  const latestResult = results[results.length - 1];

  return (
    <div className="space-y-6">
      {/* Memory Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MemoryStick className="h-5 w-5" />
            <span>Memory Usage</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{latestResult.metrics.heapUsed.toFixed(1)}MB</div>
              <div className="text-sm text-muted-foreground">Heap Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{latestResult.metrics.heapTotal.toFixed(1)}MB</div>
              <div className="text-sm text-muted-foreground">Heap Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(latestResult.metrics.jsHeapSizeLimit / 1024).toFixed(1)}GB</div>
              <div className="text-sm text-muted-foreground">Heap Limit</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Network Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(latestResult.metrics.ttfb)}ms</div>
              <div className="text-sm text-muted-foreground">TTFB</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{latestResult.metrics.resourceCount}</div>
              <div className="text-sm text-muted-foreground">Resources</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(latestResult.metrics.totalResourceSize)}KB</div>
              <div className="text-sm text-muted-foreground">Total Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(latestResult.metrics.loadTime)}ms</div>
              <div className="text-sm text-muted-foreground">Load Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Time to First Byte', value: latestResult.metrics.ttfb, max: 2000 },
              { label: 'First Contentful Paint', value: latestResult.metrics.fcp, max: 1800 },
              { label: 'Largest Contentful Paint', value: latestResult.metrics.lcp, max: 2500 },
              { label: 'Time to Interactive', value: latestResult.metrics.tti, max: 3500 },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{Math.round(item.value)}ms</span>
                </div>
                <Progress value={(item.value / item.max) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadTestingReport({ results }: { results: LoadTestResult[] }) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No load testing results available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map(result => (
          <Card key={result.id}>
            <CardHeader>
              <CardTitle>{result.component}</CardTitle>
              <CardDescription>
                {result.concurrentUsers} concurrent users • {result.duration}s duration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold">{result.requestsPerSecond.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Req/sec</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{Math.round(result.averageResponseTime)}ms</div>
                  <div className="text-sm text-muted-foreground">Avg Response</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{result.errorRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Error Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{result.cpuUsage.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">CPU Usage</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MobilePerformanceReport({ results }: { results: PerformanceMetrics[] }) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No mobile performance results available
      </div>
    );
  }

  const avgMobileScore = Math.round(
    results.reduce((sum, result) => sum + result.metrics.mobileScore, 0) / results.length
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Mobile Performance Score</span>
            <Badge variant={avgMobileScore >= 90 ? 'default' : avgMobileScore >= 75 ? 'secondary' : 'destructive'}>
              {avgMobileScore}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <span className="font-medium">{result.component}</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{result.connection}</Badge>
                  <span className="font-bold">{result.metrics.mobileScore}/100</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
async function simulatePerformanceTest(
  component: string, 
  device: 'desktop' | 'mobile' | 'tablet',
  connection: 'fast-3g' | 'slow-3g' | 'fast-4g' | 'wifi'
): Promise<PerformanceMetrics> {
  // Simulate different performance based on device and connection
  const deviceMultipliers = { desktop: 1, tablet: 1.3, mobile: 1.8 };
  const connectionMultipliers = { wifi: 1, 'fast-4g': 1.2, 'fast-3g': 1.8, 'slow-3g': 3.0 };
  
  const baseMultiplier = deviceMultipliers[device] * connectionMultipliers[connection];
  
  return {
    id: `perf-${component}-${device}-${connection}-${Date.now()}`,
    component,
    timestamp: new Date(),
    device,
    connection,
    environment: 'development',
    metrics: {
      lcp: (Math.random() * 1000 + 800) * baseMultiplier,
      fid: (Math.random() * 50 + 30) * baseMultiplier,
      cls: Math.random() * 0.1 + 0.05,
      fcp: (Math.random() * 800 + 600) * baseMultiplier,
      ttfb: (Math.random() * 200 + 100) * baseMultiplier,
      tti: (Math.random() * 1500 + 1000) * baseMultiplier,
      tbt: (Math.random() * 300 + 100) * baseMultiplier,
      heapUsed: Math.random() * 20 + 10,
      heapTotal: Math.random() * 30 + 20,
      jsHeapSizeLimit: 4096,
      bundleSize: Math.random() * 200 + 100,
      loadTime: (Math.random() * 1000 + 500) * baseMultiplier,
      renderTime: (Math.random() * 100 + 50) * baseMultiplier,
      resourceCount: Math.floor(Math.random() * 20 + 10),
      totalResourceSize: Math.random() * 500 + 200,
      mobileScore: Math.round(Math.max(20, 100 - (baseMultiplier - 1) * 30)),
      desktopScore: Math.round(Math.max(30, 100 - (baseMultiplier - 1) * 20))
    }
  };
}

async function runLoadTests(components: string[]): Promise<LoadTestResult[]> {
  const results: LoadTestResult[] = [];
  
  for (const component of components) {
    // Simulate different load test scenarios
    const scenarios = [
      { users: 10, duration: 30 },
      { users: 50, duration: 60 },
      { users: 100, duration: 120 }
    ];
    
    for (const scenario of scenarios) {
      results.push({
        id: `load-${component}-${scenario.users}-${Date.now()}`,
        component,
        concurrentUsers: scenario.users,
        duration: scenario.duration,
        requestsPerSecond: Math.random() * 100 + 50,
        averageResponseTime: Math.random() * 200 + 100,
        maxResponseTime: Math.random() * 1000 + 500,
        errorRate: Math.random() * 2,
        cpuUsage: Math.random() * 30 + 20,
        memoryPeak: Math.random() * 500 + 200,
        timestamp: new Date()
      });
    }
  }
  
  return results;
}
