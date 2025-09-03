/**
 * System Monitoring Interface Component
 * 
 * Task 8.5.2: Comprehensive system monitoring with health indicators,
 * performance metrics, resource usage monitoring, and alert management
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Activity,
  Server,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  Globe,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Monitor,
  Smartphone,
  Users,
  MessageSquare,
  Bell,
  BellOff,
  Settings,
  RefreshCw,
  Download,
  Upload,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  Target,
  Flag,
  Info,
  Warning,
  Shield,
  Lock,
  Unlock,
  Key,
  Calendar,
  Filter,
  Search,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Copy,
  Share2,
  ExternalLink
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface SystemHealth {
  overall: HealthStatus;
  services: ServiceHealth[];
  infrastructure: InfrastructureHealth;
  performance: PerformanceMetrics;
  availability: AvailabilityMetrics;
  lastUpdate: Date;
}

type HealthStatus = 'healthy' | 'warning' | 'critical' | 'maintenance' | 'unknown';

interface ServiceHealth {
  id: string;
  name: string;
  status: HealthStatus;
  uptime: number; // percentage
  responseTime: number; // milliseconds
  errorRate: number; // percentage
  lastCheck: Date;
  dependencies: string[];
  metrics: ServiceMetrics;
  alerts: ServiceAlert[];
}

interface ServiceMetrics {
  requestsPerSecond: number;
  activeConnections: number;
  queueLength: number;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  diskIO: number; // MB/s
  networkIO: number; // Mbps
}

interface ServiceAlert {
  id: string;
  type: 'performance' | 'availability' | 'error' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

interface InfrastructureHealth {
  servers: ServerHealth[];
  databases: DatabaseHealth[];
  storage: StorageHealth[];
  network: NetworkHealth;
  cdn: CDNHealth;
}

interface ServerHealth {
  id: string;
  name: string;
  region: string;
  status: HealthStatus;
  cpu: ResourceMetric;
  memory: ResourceMetric;
  disk: ResourceMetric;
  network: NetworkMetric;
  uptime: number; // hours
  load: LoadMetric;
  processes: ProcessInfo[];
}

interface ResourceMetric {
  current: number; // percentage
  average: number; // percentage over time period
  peak: number; // percentage
  threshold: ResourceThreshold;
  history: Array<{ timestamp: Date; value: number }>;
}

interface ResourceThreshold {
  warning: number; // percentage
  critical: number; // percentage
  alertEnabled: boolean;
}

interface NetworkMetric {
  inbound: number; // Mbps
  outbound: number; // Mbps
  latency: number; // ms
  packetLoss: number; // percentage
  connections: number;
}

interface LoadMetric {
  oneMinute: number;
  fiveMinute: number;
  fifteenMinute: number;
}

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number; // percentage
  memory: number; // MB
  status: 'running' | 'sleeping' | 'zombie' | 'stopped';
}

interface DatabaseHealth {
  id: string;
  type: 'postgresql' | 'redis' | 'elasticsearch';
  name: string;
  status: HealthStatus;
  connections: ConnectionMetric;
  performance: DatabasePerformance;
  storage: DatabaseStorage;
  replication: ReplicationStatus;
}

interface ConnectionMetric {
  active: number;
  idle: number;
  max: number;
  utilization: number; // percentage
}

interface DatabasePerformance {
  queryTime: number; // ms average
  slowQueries: number;
  locksWaiting: number;
  deadlocks: number;
  cacheHitRatio: number; // percentage
  throughput: number; // queries per second
}

interface DatabaseStorage {
  used: number; // GB
  total: number; // GB
  growth: number; // GB per day
  fragmentation: number; // percentage
  indexUsage: number; // percentage
}

interface ReplicationStatus {
  enabled: boolean;
  lag: number; // seconds
  replicas: number;
  syncStatus: 'synced' | 'lagging' | 'broken';
}

interface StorageHealth {
  id: string;
  type: 'local' | 's3' | 'cdn' | 'backup';
  name: string;
  status: HealthStatus;
  usage: StorageUsage;
  performance: StoragePerformance;
  reliability: StorageReliability;
}

interface StorageUsage {
  used: number; // GB
  total: number; // GB
  available: number; // GB
  files: number;
  growth: StorageGrowth;
}

interface StorageGrowth {
  daily: number; // GB
  weekly: number; // GB
  monthly: number; // GB
  trend: 'increasing' | 'stable' | 'decreasing';
}

interface StoragePerformance {
  readSpeed: number; // MB/s
  writeSpeed: number; // MB/s
  iops: number; // operations per second
  latency: number; // ms
}

interface StorageReliability {
  uptime: number; // percentage
  errors: number;
  backupStatus: 'current' | 'stale' | 'failed' | 'disabled';
  lastBackup: Date;
}

interface NetworkHealth {
  status: HealthStatus;
  bandwidth: BandwidthMetric;
  latency: LatencyMetric;
  security: NetworkSecurity;
  traffic: TrafficAnalysis;
}

interface BandwidthMetric {
  inbound: BandwidthUsage;
  outbound: BandwidthUsage;
  total: BandwidthUsage;
}

interface BandwidthUsage {
  current: number; // Mbps
  peak: number; // Mbps
  average: number; // Mbps
  limit: number; // Mbps
  utilization: number; // percentage
}

interface LatencyMetric {
  dns: number; // ms
  connect: number; // ms
  ssl: number; // ms
  response: number; // ms
  total: number; // ms
}

interface NetworkSecurity {
  ddosProtection: boolean;
  firewall: boolean;
  intrusion: SecurityMetric;
  vpn: VPNMetric;
}

interface SecurityMetric {
  blocked: number;
  flagged: number;
  false_positives: number;
}

interface VPNMetric {
  active_connections: number;
  bandwidth_usage: number; // Mbps
  authentication_failures: number;
}

interface TrafficAnalysis {
  requests: number;
  unique_visitors: number;
  geographic_distribution: Array<{ country: string; requests: number }>;
  device_types: Array<{ type: string; count: number }>;
}

interface CDNHealth {
  status: HealthStatus;
  hitRatio: number; // percentage
  bandwidth: number; // GB
  requests: number;
  edges: CDNEdge[];
}

interface CDNEdge {
  location: string;
  status: HealthStatus;
  hitRatio: number; // percentage
  latency: number; // ms
  requests: number;
}

interface PerformanceMetrics {
  response_times: ResponseTimeMetrics;
  throughput: ThroughputMetrics;
  error_rates: ErrorRateMetrics;
  user_experience: UserExperienceMetrics;
}

interface ResponseTimeMetrics {
  p50: number; // ms
  p95: number; // ms
  p99: number; // ms
  average: number; // ms
  trend: 'improving' | 'stable' | 'degrading';
}

interface ThroughputMetrics {
  requests_per_second: number;
  pages_per_second: number;
  api_calls_per_second: number;
  concurrent_users: number;
}

interface ErrorRateMetrics {
  http_4xx: number; // percentage
  http_5xx: number; // percentage
  timeouts: number; // percentage
  total: number; // percentage
}

interface UserExperienceMetrics {
  page_load_time: number; // seconds
  time_to_interactive: number; // seconds
  cumulative_layout_shift: number;
  first_contentful_paint: number; // ms
}

interface AvailabilityMetrics {
  uptime: UptimeMetrics;
  incidents: IncidentMetrics;
  maintenance: MaintenanceMetrics;
  sla: SLAMetrics;
}

interface UptimeMetrics {
  current: number; // percentage
  daily: number; // percentage
  weekly: number; // percentage
  monthly: number; // percentage
  yearly: number; // percentage
}

interface IncidentMetrics {
  total: number;
  resolved: number;
  avg_resolution_time: number; // minutes
  mttr: number; // mean time to recovery in minutes
  mtbf: number; // mean time between failures in hours
}

interface MaintenanceMetrics {
  scheduled: number;
  emergency: number;
  next_window: Date;
  avg_duration: number; // minutes
}

interface SLAMetrics {
  target: number; // percentage
  current: number; // percentage
  breaches: number;
  credits: number; // monetary value
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // minutes
  environment: 'all' | 'production' | 'staging' | 'development';
  tags: string[];
  created_by: string;
  created_at: Date;
  last_triggered?: Date;
  trigger_count: number;
}

interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  value: number;
  duration: number; // minutes
  aggregation: 'avg' | 'max' | 'min' | 'sum' | 'count';
}

interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  config: Record<string, any>;
  delay: number; // seconds
  enabled: boolean;
}

interface SystemMonitoringInterfaceProps {
  refreshInterval?: number;
  autoRefresh?: boolean;
  canManageAlerts?: boolean;
  defaultView?: 'overview' | 'infrastructure' | 'performance' | 'alerts';
}

export function SystemMonitoringInterface({
  refreshInterval = 30000,
  autoRefresh = true,
  canManageAlerts = false,
  defaultView = 'overview'
}: SystemMonitoringInterfaceProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState(defaultView);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  
  // Dialog states
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceHealth | null>(null);
  
  // Refs for auto-refresh
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSystemHealth();
    loadAlertRules();
  }, []);

  useEffect(() => {
    if (autoRefreshEnabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
    
    return () => stopAutoRefresh();
  }, [autoRefreshEnabled, refreshInterval]);

  const loadSystemHealth = async () => {
    setIsLoading(true);
    
    // Mock system health data
    const mockHealth: SystemHealth = {
      overall: 'healthy',
      services: [
        {
          id: 'api-server',
          name: 'API Server',
          status: 'healthy',
          uptime: 99.98,
          responseTime: 125,
          errorRate: 0.02,
          lastCheck: new Date(Date.now() - 30000),
          dependencies: ['database', 'redis', 'storage'],
          metrics: {
            requestsPerSecond: 45.2,
            activeConnections: 234,
            queueLength: 2,
            memoryUsage: 1250,
            cpuUsage: 23.5,
            diskIO: 5.8,
            networkIO: 12.3
          },
          alerts: []
        },
        {
          id: 'database',
          name: 'Primary Database',
          status: 'warning',
          uptime: 99.95,
          responseTime: 89,
          errorRate: 0.05,
          lastCheck: new Date(Date.now() - 45000),
          dependencies: [],
          metrics: {
            requestsPerSecond: 156.7,
            activeConnections: 45,
            queueLength: 0,
            memoryUsage: 3200,
            cpuUsage: 67.8,
            diskIO: 23.4,
            networkIO: 8.9
          },
          alerts: [
            {
              id: 'db_cpu_high',
              type: 'performance',
              severity: 'medium',
              message: 'Database CPU usage above 65% for 10 minutes',
              timestamp: new Date(Date.now() - 10 * 60 * 1000),
              acknowledged: false
            }
          ]
        },
        {
          id: 'redis',
          name: 'Redis Cache',
          status: 'healthy',
          uptime: 100.0,
          responseTime: 2,
          errorRate: 0.0,
          lastCheck: new Date(Date.now() - 15000),
          dependencies: [],
          metrics: {
            requestsPerSecond: 234.5,
            activeConnections: 12,
            queueLength: 0,
            memoryUsage: 890,
            cpuUsage: 8.2,
            diskIO: 1.2,
            networkIO: 15.6
          },
          alerts: []
        },
        {
          id: 'websocket',
          name: 'WebSocket Service',
          status: 'healthy',
          uptime: 99.97,
          responseTime: 45,
          errorRate: 0.01,
          lastCheck: new Date(Date.now() - 20000),
          dependencies: ['api-server', 'redis'],
          metrics: {
            requestsPerSecond: 12.8,
            activeConnections: 89,
            queueLength: 1,
            memoryUsage: 456,
            cpuUsage: 15.3,
            diskIO: 0.8,
            networkIO: 6.7
          },
          alerts: []
        }
      ],
      infrastructure: {
        servers: [
          {
            id: 'web-server-1',
            name: 'Web Server 1',
            region: 'us-east-1',
            status: 'healthy',
            cpu: {
              current: 34.2,
              average: 28.7,
              peak: 67.8,
              threshold: { warning: 70, critical: 90, alertEnabled: true },
              history: []
            },
            memory: {
              current: 67.3,
              average: 62.1,
              peak: 78.9,
              threshold: { warning: 80, critical: 95, alertEnabled: true },
              history: []
            },
            disk: {
              current: 45.6,
              average: 43.2,
              peak: 52.1,
              threshold: { warning: 80, critical: 95, alertEnabled: true },
              history: []
            },
            network: {
              inbound: 23.4,
              outbound: 18.7,
              latency: 12,
              packetLoss: 0.01,
              connections: 234
            },
            uptime: 336.5, // 2 weeks
            load: {
              oneMinute: 1.23,
              fiveMinute: 1.45,
              fifteenMinute: 1.67
            },
            processes: []
          }
        ],
        databases: [
          {
            id: 'postgres-primary',
            type: 'postgresql',
            name: 'Primary PostgreSQL',
            status: 'warning',
            connections: {
              active: 45,
              idle: 15,
              max: 100,
              utilization: 60
            },
            performance: {
              queryTime: 89,
              slowQueries: 3,
              locksWaiting: 2,
              deadlocks: 0,
              cacheHitRatio: 96.7,
              throughput: 156.7
            },
            storage: {
              used: 89.3,
              total: 200,
              growth: 0.5,
              fragmentation: 5.2,
              indexUsage: 87.3
            },
            replication: {
              enabled: true,
              lag: 0.2,
              replicas: 2,
              syncStatus: 'synced'
            }
          }
        ],
        storage: [
          {
            id: 'main-storage',
            type: 'local',
            name: 'Main Storage',
            status: 'healthy',
            usage: {
              used: 234.5,
              total: 500,
              available: 265.5,
              files: 125000,
              growth: {
                daily: 2.3,
                weekly: 16.1,
                monthly: 69.4,
                trend: 'increasing'
              }
            },
            performance: {
              readSpeed: 145.6,
              writeSpeed: 89.2,
              iops: 2340,
              latency: 5.6
            },
            reliability: {
              uptime: 99.99,
              errors: 0,
              backupStatus: 'current',
              lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000)
            }
          }
        ],
        network: {
          status: 'healthy',
          bandwidth: {
            inbound: { current: 56.7, peak: 123.4, average: 67.8, limit: 1000, utilization: 5.67 },
            outbound: { current: 34.2, peak: 89.1, average: 45.6, limit: 1000, utilization: 3.42 },
            total: { current: 90.9, peak: 212.5, average: 113.4, limit: 2000, utilization: 4.55 }
          },
          latency: {
            dns: 12,
            connect: 45,
            ssl: 89,
            response: 125,
            total: 271
          },
          security: {
            ddosProtection: true,
            firewall: true,
            intrusion: { blocked: 23, flagged: 5, false_positives: 1 },
            vpn: { active_connections: 12, bandwidth_usage: 15.6, authentication_failures: 0 }
          },
          traffic: {
            requests: 12500,
            unique_visitors: 3400,
            geographic_distribution: [
              { country: 'US', requests: 8750 },
              { country: 'CA', requests: 1875 },
              { country: 'UK', requests: 1250 }
            ],
            device_types: [
              { type: 'desktop', count: 6875 },
              { type: 'mobile', count: 4375 },
              { type: 'tablet', count: 1250 }
            ]
          }
        },
        cdn: {
          status: 'healthy',
          hitRatio: 87.3,
          bandwidth: 156.7,
          requests: 45000,
          edges: [
            { location: 'US East', status: 'healthy', hitRatio: 89.2, latency: 23, requests: 18000 },
            { location: 'US West', status: 'healthy', hitRatio: 85.6, latency: 34, requests: 15000 },
            { location: 'Europe', status: 'healthy', hitRatio: 87.1, latency: 45, requests: 12000 }
          ]
        }
      },
      performance: {
        response_times: {
          p50: 125,
          p95: 345,
          p99: 678,
          average: 156,
          trend: 'stable'
        },
        throughput: {
          requests_per_second: 45.2,
          pages_per_second: 12.8,
          api_calls_per_second: 32.4,
          concurrent_users: 234
        },
        error_rates: {
          http_4xx: 2.3,
          http_5xx: 0.5,
          timeouts: 0.2,
          total: 3.0
        },
        user_experience: {
          page_load_time: 2.4,
          time_to_interactive: 3.1,
          cumulative_layout_shift: 0.08,
          first_contentful_paint: 1200
        }
      },
      availability: {
        uptime: {
          current: 99.97,
          daily: 99.98,
          weekly: 99.95,
          monthly: 99.92,
          yearly: 99.87
        },
        incidents: {
          total: 12,
          resolved: 11,
          avg_resolution_time: 23.5,
          mttr: 28.7,
          mtbf: 168.3
        },
        maintenance: {
          scheduled: 4,
          emergency: 1,
          next_window: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          avg_duration: 45.2
        },
        sla: {
          target: 99.9,
          current: 99.97,
          breaches: 0,
          credits: 0
        }
      },
      lastUpdate: new Date()
    };

    setSystemHealth(mockHealth);
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  const loadAlertRules = async () => {
    const mockRules: AlertRule[] = [
      {
        id: 'rule_1',
        name: 'High CPU Usage',
        description: 'Alert when CPU usage exceeds 80% for 5 minutes',
        enabled: true,
        conditions: [
          {
            metric: 'cpu_usage',
            operator: 'gt',
            value: 80,
            duration: 5,
            aggregation: 'avg'
          }
        ],
        actions: [
          {
            type: 'email',
            config: { recipients: ['admin@school.edu'] },
            delay: 0,
            enabled: true
          }
        ],
        severity: 'high',
        cooldown: 15,
        environment: 'production',
        tags: ['performance', 'cpu'],
        created_by: 'admin',
        created_at: new Date('2024-01-01'),
        trigger_count: 0
      }
    ];

    setAlertRules(mockRules);
  };

  const startAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      loadSystemHealth();
    }, refreshInterval);
  };

  const stopAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const getHealthBadge = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-500">Healthy</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'maintenance': return <Badge className="bg-blue-500">Maintenance</Badge>;
      case 'unknown': return <Badge variant="outline">Unknown</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getHealthIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'maintenance': return <Settings className="h-4 w-4 text-blue-500" />;
      case 'unknown': return <Info className="h-4 w-4 text-gray-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes * 1024 * 1024) / Math.log(k));
    return `${parseFloat((bytes * 1024 * 1024 / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return `${days}d ${remainingHours}h`;
  };

  // Mock performance data for charts
  const performanceData = [
    { time: '00:00', cpu: 25, memory: 60, response: 120 },
    { time: '04:00', cpu: 20, memory: 58, response: 110 },
    { time: '08:00', cpu: 35, memory: 65, response: 140 },
    { time: '12:00', cpu: 45, memory: 70, response: 160 },
    { time: '16:00', cpu: 40, memory: 68, response: 150 },
    { time: '20:00', cpu: 30, memory: 62, response: 130 }
  ];

  const alertData = alertRules.filter(rule => rule.enabled).length;
  const serviceIssues = systemHealth?.services.filter(s => s.status !== 'healthy').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            System Monitoring
          </h3>
          <p className="text-sm text-muted-foreground">
            Real-time system health and performance monitoring
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status Overview */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                {systemHealth && getHealthIcon(systemHealth.overall)}
              </div>
              <div className="text-xs text-muted-foreground">System</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {systemHealth?.availability.uptime.current.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{serviceIssues}</div>
              <div className="text-xs text-muted-foreground">Issues</div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="autoRefresh"
                checked={autoRefreshEnabled}
                onCheckedChange={setAutoRefreshEnabled}
              />
              <Label htmlFor="autoRefresh" className="text-xs">Auto-refresh</Label>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadSystemHealth()}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Last Update Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
              {autoRefreshEnabled && (
                <span className="text-muted-foreground">
                  • Next refresh in {Math.ceil(refreshInterval / 1000)}s
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-muted-foreground">
              <span>{systemHealth?.services.length || 0} services monitored</span>
              <span>•</span>
              <span>{alertData} alert rules active</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Service Status Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {systemHealth?.services.map((service) => (
              <Card 
                key={service.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  service.status === 'critical' ? 'border-red-300 bg-red-50' :
                  service.status === 'warning' ? 'border-yellow-300 bg-yellow-50' : ''
                }`}
                onClick={() => {
                  setSelectedService(service);
                  setShowServiceDialog(true);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{service.name}</CardTitle>
                    {getHealthIcon(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Uptime:</span>
                      <span className="font-medium">{service.uptime.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Response:</span>
                      <span className="font-medium">{service.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>CPU:</span>
                      <span className="font-medium">{service.metrics.cpuUsage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Memory:</span>
                      <span className="font-medium">{formatBytes(service.metrics.memoryUsage / 1024 / 1024)}</span>
                    </div>
                    {service.alerts.length > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-orange-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{service.alerts.length} alert(s)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Performance Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Performance (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsLineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" />
                    <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory %" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Times (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="response" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="Response Time (ms)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Requests/sec</p>
                    <p className="text-2xl font-bold">{systemHealth?.performance.throughput.requests_per_second.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Concurrent Users</p>
                    <p className="text-2xl font-bold">{systemHealth?.performance.throughput.concurrent_users}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Response</p>
                    <p className="text-2xl font-bold">{systemHealth?.performance.response_times.average}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Error Rate</p>
                    <p className="text-2xl font-bold">{systemHealth?.performance.error_rates.total.toFixed(2)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">MTTR</p>
                    <p className="text-2xl font-bold">{systemHealth?.availability.incidents.mttr.toFixed(0)}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-6">
          {/* Server Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                Server Infrastructure
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemHealth?.infrastructure.servers.map((server) => (
                <div key={server.id} className="border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">{server.name}</h4>
                      <p className="text-sm text-muted-foreground">Region: {server.region} • Uptime: {formatDuration(server.uptime)}</p>
                    </div>
                    {getHealthBadge(server.status)}
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>CPU:</span>
                        <span>{server.cpu.current.toFixed(1)}%</span>
                      </div>
                      <Progress value={server.cpu.current} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Memory:</span>
                        <span>{server.memory.current.toFixed(1)}%</span>
                      </div>
                      <Progress value={server.memory.current} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Disk:</span>
                        <span>{server.disk.current.toFixed(1)}%</span>
                      </div>
                      <Progress value={server.disk.current} className="h-2" />
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 mt-4 text-sm">
                    <div>
                      <div className="flex justify-between">
                        <span>Network In:</span>
                        <span>{server.network.inbound.toFixed(1)} Mbps</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Network Out:</span>
                        <span>{server.network.outbound.toFixed(1)} Mbps</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between">
                        <span>Load (1m):</span>
                        <span>{server.load.oneMinute.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Connections:</span>
                        <span>{server.network.connections}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Database Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Database Systems
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemHealth?.infrastructure.databases.map((db) => (
                <div key={db.id} className="border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">{db.name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{db.type}</p>
                    </div>
                    {getHealthBadge(db.status)}
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <h5 className="font-medium mb-2">Connections</h5>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Active:</span>
                          <span>{db.connections.active}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Utilization:</span>
                          <span>{db.connections.utilization}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">Performance</h5>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Query Time:</span>
                          <span>{db.performance.queryTime}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cache Hit:</span>
                          <span>{db.performance.cacheHitRatio.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">Storage</h5>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Used:</span>
                          <span>{db.storage.used.toFixed(1)} GB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Growth:</span>
                          <span>{db.storage.growth.toFixed(2)} GB/day</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Storage Systems */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardDrive className="h-5 w-5 mr-2" />
                Storage Systems
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemHealth?.infrastructure.storage.map((storage) => (
                <div key={storage.id} className="border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">{storage.name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{storage.type}</p>
                    </div>
                    {getHealthBadge(storage.status)}
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Usage:</span>
                        <span>{((storage.usage.used / storage.usage.total) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(storage.usage.used / storage.usage.total) * 100} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{formatBytes(storage.usage.used)}</span>
                        <span>{formatBytes(storage.usage.total)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Read Speed:</span>
                        <span>{storage.performance.readSpeed.toFixed(1)} MB/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Write Speed:</span>
                        <span>{storage.performance.writeSpeed.toFixed(1)} MB/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Backup:</span>
                        <span>{new Date(storage.reliability.lastBackup).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">P95 Response Time</span>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold">{systemHealth?.performance.response_times.p95}ms</div>
                  <div className="text-xs text-green-600">↓ 12% from last week</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Throughput</span>
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold">{systemHealth?.performance.throughput.requests_per_second.toFixed(0)} RPS</div>
                  <div className="text-xs text-blue-600">↑ 5% from last week</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Error Rate</span>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold">{systemHealth?.performance.error_rates.total.toFixed(2)}%</div>
                  <div className="text-xs text-green-600">↓ 0.5% from last week</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Page Load Time</span>
                    <Clock className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold">{systemHealth?.performance.user_experience.page_load_time.toFixed(1)}s</div>
                  <div className="text-xs text-green-600">↓ 0.3s from last week</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Percentiles</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { percentile: 'P50', value: systemHealth?.performance.response_times.p50 || 0 },
                    { percentile: 'P95', value: systemHealth?.performance.response_times.p95 || 0 },
                    { percentile: 'P99', value: systemHealth?.performance.response_times.p99 || 0 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="percentile" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" name="Response Time (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: '4xx Errors', value: systemHealth?.performance.error_rates.http_4xx || 0, fill: '#f59e0b' },
                        { name: '5xx Errors', value: systemHealth?.performance.error_rates.http_5xx || 0, fill: '#ef4444' },
                        { name: 'Timeouts', value: systemHealth?.performance.error_rates.timeouts || 0, fill: '#8b5cf6' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label
                    />
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* User Experience Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>User Experience Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h5 className="font-medium mb-4">Core Web Vitals</h5>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>First Contentful Paint:</span>
                        <span>{systemHealth?.performance.user_experience.first_contentful_paint}ms</span>
                      </div>
                      <Progress value={(systemHealth?.performance.user_experience.first_contentful_paint || 0) / 30} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Time to Interactive:</span>
                        <span>{systemHealth?.performance.user_experience.time_to_interactive.toFixed(1)}s</span>
                      </div>
                      <Progress value={(systemHealth?.performance.user_experience.time_to_interactive || 0) * 20} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Cumulative Layout Shift:</span>
                        <span>{systemHealth?.performance.user_experience.cumulative_layout_shift.toFixed(3)}</span>
                      </div>
                      <Progress value={(systemHealth?.performance.user_experience.cumulative_layout_shift || 0) * 500} className="h-2" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-4">Performance Scores</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Overall Performance:</span>
                      <Badge className="bg-green-500">93/100</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Accessibility:</span>
                      <Badge className="bg-green-500">98/100</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Best Practices:</span>
                      <Badge className="bg-green-500">95/100</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>SEO:</span>
                      <Badge className="bg-green-500">92/100</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {/* Alert Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active Rules</p>
                    <p className="text-2xl font-bold">{alertRules.filter(r => r.enabled).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active Alerts</p>
                    <p className="text-2xl font-bold">
                      {systemHealth?.services.reduce((sum, service) => sum + service.alerts.length, 0) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Critical</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Resolved (24h)</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Alerts</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowAlertDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemHealth?.services.flatMap(service => 
                  service.alerts.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className={`h-5 w-5 ${
                          alert.severity === 'critical' ? 'text-red-500' :
                          alert.severity === 'high' ? 'text-orange-500' :
                          'text-yellow-500'
                        }`} />
                        <div>
                          <h5 className="font-medium">{service.name}</h5>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={alert.severity === 'critical' ? 'destructive' : 'outline'}
                          className={
                            alert.severity === 'high' ? 'bg-orange-500' :
                            alert.severity === 'medium' ? 'bg-yellow-500' : ''
                          }
                        >
                          {alert.severity}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  ))
                ) || (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">No active alerts</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alert Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Switch checked={rule.enabled} />
                      <div>
                        <h5 className="font-medium">{rule.name}</h5>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">{rule.severity}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Triggered {rule.trigger_count} times
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Service Details Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedService?.name} Details</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Service Status</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getHealthIcon(selectedService.status)}
                    {getHealthBadge(selectedService.status)}
                  </div>
                </div>
                <div>
                  <Label>Last Check</Label>
                  <p className="text-sm mt-1">{selectedService.lastCheck.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Performance Metrics</Label>
                  <div className="space-y-2 mt-2 text-sm">
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span>{selectedService.uptime.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Response Time:</span>
                      <span>{selectedService.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Error Rate:</span>
                      <span>{selectedService.errorRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Requests/sec:</span>
                      <span>{selectedService.metrics.requestsPerSecond.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Resource Usage</Label>
                  <div className="space-y-2 mt-2 text-sm">
                    <div className="flex justify-between">
                      <span>CPU:</span>
                      <span>{selectedService.metrics.cpuUsage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory:</span>
                      <span>{formatBytes(selectedService.metrics.memoryUsage / 1024 / 1024)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connections:</span>
                      <span>{selectedService.metrics.activeConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Queue Length:</span>
                      <span>{selectedService.metrics.queueLength}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedService.alerts.length > 0 && (
                <div>
                  <Label>Active Alerts</Label>
                  <div className="space-y-2 mt-2">
                    {selectedService.alerts.map((alert) => (
                      <div key={alert.id} className="p-2 border rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{alert.type}</span>
                          <Badge variant="outline">{alert.severity}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedService.dependencies.length > 0 && (
                <div>
                  <Label>Dependencies</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedService.dependencies.map((dep) => (
                      <Badge key={dep} variant="outline">{dep}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
