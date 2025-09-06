/**
 * Audit Log Viewer Component
 * 
 * Task 8.5.2: Comprehensive audit log management with advanced filtering,
 * real-time streaming, export functionality, and compliance reporting
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { 
  FileText,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Shield,
  Activity,
  Database,
  Server,
  Globe,
  Lock,
  Unlock,
  Key,
  Mail,
  Calendar,
  MoreHorizontal,
  Play,
  Pause,
  Square,
  SkipForward,
  Rewind,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Copy,
  ExternalLink,
  Info,
  AlertCircle,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Zap,
  Bell,
  BellOff,
  Flag,
  Tag,
  Bookmark,
  Archive,
  Trash2,
  Edit,
  Share2
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  userName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  details: AuditDetails;
  metadata: AuditMetadata;
  severity: AuditSeverity;
  category: AuditCategory;
  outcome: 'success' | 'failure' | 'partial' | 'warning';
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  organizationId: string;
  correlationId?: string;
  parentLogId?: string;
  tags: string[];
  retention: AuditRetention;
}

type AuditAction = 
  | 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'reset_password' 
  | 'change_role' | 'impersonate' | 'export_data' | 'import_data' | 'backup' 
  | 'restore' | 'configure' | 'approve' | 'reject' | 'escalate' | 'archive';

type AuditResource = 
  | 'user' | 'role' | 'organization' | 'class' | 'session' | 'debate' 
  | 'analytics' | 'report' | 'system' | 'audit_log' | 'settings' | 'integration';

type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';
type AuditCategory = 'authentication' | 'authorization' | 'data_access' | 'data_modification' 
  | 'system_admin' | 'user_admin' | 'security' | 'compliance' | 'performance' | 'error';

interface AuditDetails {
  description: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  affectedEntities?: string[];
  errorMessage?: string;
  stackTrace?: string;
  requestBody?: Record<string, any>;
  responseCode?: number;
  executionTime?: number; // milliseconds
  dataSize?: number; // bytes
}

interface AuditMetadata {
  source: 'web' | 'mobile' | 'api' | 'system' | 'batch_job' | 'webhook';
  version: string;
  environment: 'development' | 'staging' | 'production';
  region: string;
  deviceInfo?: DeviceInfo;
  geolocation?: Geolocation;
  referrer?: string;
  feature_flags?: string[];
  experiment_id?: string;
}

interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile' | 'server';
  os: string;
  browser: string;
  screenResolution?: string;
  timezone: string;
  language: string;
}

interface Geolocation {
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

interface AuditRetention {
  retentionPeriod: number; // days
  archiveDate?: Date;
  deletionDate?: Date;
  complianceCategory: 'standard' | 'sensitive' | 'regulated' | 'permanent';
}

interface AuditFilter {
  dateRange: DateRange;
  users: string[];
  actions: AuditAction[];
  resources: AuditResource[];
  severities: AuditSeverity[];
  categories: AuditCategory[];
  outcomes: ('success' | 'failure' | 'partial' | 'warning')[];
  organizations: string[];
  ipAddresses: string[];
  searchQuery: string;
  tags: string[];
  correlationId?: string;
}

interface DateRange {
  start: Date;
  end: Date;
  preset: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

interface AuditAlert {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AuditAlertCondition[];
  actions: AuditAlertAction[];
  severity: AuditSeverity;
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
  triggerCount: number;
  createdAt: Date;
  createdBy: string;
}

interface AuditAlertCondition {
  field: keyof AuditLogEntry;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  caseSensitive: boolean;
}

interface AuditAlertAction {
  type: 'email' | 'webhook' | 'slack' | 'teams' | 'sms' | 'in_app';
  config: Record<string, any>;
  enabled: boolean;
}

interface RealTimeStreamConfig {
  enabled: boolean;
  autoScroll: boolean;
  maxEntries: number;
  refreshInterval: number; // milliseconds
  showNotifications: boolean;
  soundEnabled: boolean;
  highlightSeverity: AuditSeverity[];
  pauseOnInteraction: boolean;
}

interface ExportConfig {
  format: 'csv' | 'json' | 'xml' | 'pdf' | 'excel';
  includeMetadata: boolean;
  includeDetails: boolean;
  dateFormat: string;
  compression: boolean;
  encryption: boolean;
  maxRecords: number;
  selectedFields: string[];
}

interface AuditLogViewerProps {
  organizationId?: string;
  canViewAllOrganizations?: boolean;
  canExportLogs?: boolean;
  canManageAlerts?: boolean;
  defaultFilters?: Partial<AuditFilter>;
}

export function AuditLogViewer({
  organizationId,
  canViewAllOrganizations = false,
  canExportLogs = true,
  canManageAlerts = false,
  defaultFilters
}: AuditLogViewerProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [streamConfig, setStreamConfig] = useState<RealTimeStreamConfig>({
    enabled: false,
    autoScroll: true,
    maxEntries: 1000,
    refreshInterval: 5000,
    showNotifications: true,
    soundEnabled: false,
    highlightSeverity: ['high', 'critical'],
    pauseOnInteraction: false
  });
  
  // Filters
  const [filters, setFilters] = useState<AuditFilter>({
    dateRange: { 
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
      end: new Date(), 
      preset: 'week' 
    },
    users: [],
    actions: [],
    resources: [],
    severities: [],
    categories: [],
    outcomes: [],
    organizations: organizationId ? [organizationId] : [],
    ipAddresses: [],
    searchQuery: '',
    tags: [],
    ...defaultFilters
  });
  
  // Dialog States
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  const [showStreamConfigDialog, setShowStreamConfigDialog] = useState(false);
  
  // Export and Alert States
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'csv',
    includeMetadata: true,
    includeDetails: true,
    dateFormat: 'ISO',
    compression: false,
    encryption: false,
    maxRecords: 10000,
    selectedFields: []
  });
  
  const [alerts, setAlerts] = useState<AuditAlert[]>([]);
  
  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditLogs, filters]);

  useEffect(() => {
    if (streamConfig.enabled) {
      startRealTimeStream();
    } else {
      stopRealTimeStream();
    }
    
    return () => stopRealTimeStream();
  }, [streamConfig.enabled, streamConfig.refreshInterval]);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    
    // Mock audit log data
    const mockLogs: AuditLogEntry[] = [
      {
        id: 'audit_1',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        userId: 'user_123',
        userEmail: 'admin@school.edu',
        userName: 'System Admin',
        action: 'login',
        resource: 'user',
        resourceId: 'user_123',
        details: {
          description: 'Successful admin login from web interface',
          responseCode: 200,
          executionTime: 234
        },
        metadata: {
          source: 'web',
          version: '1.0.0',
          environment: 'production',
          region: 'us-east-1',
          deviceInfo: {
            type: 'desktop',
            os: 'Windows 11',
            browser: 'Chrome 120.0.0.0',
            timezone: 'America/New_York',
            language: 'en-US'
          },
          geolocation: {
            country: 'United States',
            region: 'New York',
            city: 'New York'
          }
        },
        severity: 'low',
        category: 'authentication',
        outcome: 'success',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: 'session_abc123',
        organizationId: 'org_1',
        tags: ['login', 'admin', 'web'],
        retention: {
          retentionPeriod: 2555, // 7 years
          complianceCategory: 'regulated'
        }
      },
      {
        id: 'audit_2',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        userId: 'user_456',
        userEmail: 'teacher@school.edu',
        userName: 'Jane Smith',
        action: 'create',
        resource: 'session',
        resourceId: 'session_789',
        details: {
          description: 'Created new debate session: "Climate Change Discussion"',
          newValues: {
            topic: 'Climate Change Discussion',
            participants: 24,
            scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          affectedEntities: ['class_101', 'students_24'],
          executionTime: 456
        },
        metadata: {
          source: 'web',
          version: '1.0.0',
          environment: 'production',
          region: 'us-east-1',
          deviceInfo: {
            type: 'desktop',
            os: 'macOS 14.0',
            browser: 'Safari 17.0',
            timezone: 'America/New_York',
            language: 'en-US'
          }
        },
        severity: 'low',
        category: 'data_modification',
        outcome: 'success',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        sessionId: 'session_def456',
        organizationId: 'org_1',
        tags: ['session', 'create', 'debate'],
        retention: {
          retentionPeriod: 1825, // 5 years
          complianceCategory: 'standard'
        }
      },
      {
        id: 'audit_3',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        userId: 'user_789',
        userEmail: 'hacker@malicious.com',
        userName: 'Unknown',
        action: 'login',
        resource: 'user',
        resourceId: 'attempted_user',
        details: {
          description: 'Failed login attempt - invalid credentials',
          errorMessage: 'Authentication failed: Invalid username or password',
          responseCode: 401,
          executionTime: 123
        },
        metadata: {
          source: 'web',
          version: '1.0.0',
          environment: 'production',
          region: 'us-east-1',
          deviceInfo: {
            type: 'desktop',
            os: 'Linux',
            browser: 'Firefox 120.0',
            timezone: 'UTC',
            language: 'en-US'
          },
          geolocation: {
            country: 'Russia',
            region: 'Moscow',
            city: 'Moscow'
          }
        },
        severity: 'high',
        category: 'security',
        outcome: 'failure',
        ipAddress: '203.0.113.45',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
        sessionId: 'session_failed',
        organizationId: 'org_1',
        tags: ['failed_login', 'security', 'suspicious'],
        retention: {
          retentionPeriod: 2555, // 7 years
          complianceCategory: 'regulated'
        }
      },
      {
        id: 'audit_4',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        userId: 'system',
        userEmail: 'system@bothsides.app',
        userName: 'System',
        action: 'backup',
        resource: 'system',
        resourceId: 'database_backup',
        details: {
          description: 'Automated database backup completed successfully',
          dataSize: 2048576000, // 2GB
          executionTime: 45000,
          affectedEntities: ['users', 'sessions', 'analytics']
        },
        metadata: {
          source: 'batch_job',
          version: '1.0.0',
          environment: 'production',
          region: 'us-east-1'
        },
        severity: 'low',
        category: 'system_admin',
        outcome: 'success',
        ipAddress: '10.0.0.1',
        userAgent: 'System/1.0',
        sessionId: 'system_job_123',
        organizationId: 'org_1',
        tags: ['backup', 'automated', 'system'],
        retention: {
          retentionPeriod: 365, // 1 year
          complianceCategory: 'standard'
        }
      }
    ];

    setAuditLogs(mockLogs);
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...auditLogs];

    // Date range filter
    filtered = filtered.filter(log => {
      const logDate = log.timestamp;
      return logDate >= filters.dateRange.start && logDate <= filters.dateRange.end;
    });

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.details.description.toLowerCase().includes(query) ||
        log.userName.toLowerCase().includes(query) ||
        log.userEmail.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.resource.toLowerCase().includes(query) ||
        log.ipAddress.includes(query) ||
        log.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // User filter
    if (filters.users.length > 0) {
      filtered = filtered.filter(log => filters.users.includes(log.userId));
    }

    // Action filter
    if (filters.actions.length > 0) {
      filtered = filtered.filter(log => filters.actions.includes(log.action));
    }

    // Resource filter
    if (filters.resources.length > 0) {
      filtered = filtered.filter(log => filters.resources.includes(log.resource));
    }

    // Severity filter
    if (filters.severities.length > 0) {
      filtered = filtered.filter(log => filters.severities.includes(log.severity));
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(log => filters.categories.includes(log.category));
    }

    // Outcome filter
    if (filters.outcomes.length > 0) {
      filtered = filtered.filter(log => filters.outcomes.includes(log.outcome));
    }

    // Organization filter
    if (filters.organizations.length > 0) {
      filtered = filtered.filter(log => filters.organizations.includes(log.organizationId));
    }

    // IP address filter
    if (filters.ipAddresses.length > 0) {
      filtered = filtered.filter(log => 
        filters.ipAddresses.some(ip => log.ipAddress.includes(ip))
      );
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(log => 
        filters.tags.some(tag => log.tags.includes(tag))
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setFilteredLogs(filtered);
  };

  const startRealTimeStream = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }

    streamIntervalRef.current = setInterval(() => {
      // Simulate new log entries
      if (Math.random() > 0.7) { // 30% chance of new log
        const newLog = generateMockLogEntry();
        setAuditLogs(prev => {
          const updated = [newLog, ...prev];
          // Limit to maxEntries
          if (updated.length > streamConfig.maxEntries) {
            updated.splice(streamConfig.maxEntries);
          }
          return updated;
        });

        // Show notification for high/critical severity
        if (streamConfig.showNotifications && streamConfig.highlightSeverity.includes(newLog.severity)) {
          addNotification({
            type: newLog.severity === 'critical' ? 'error' : 'warning',
            title: `${newLog.severity.toUpperCase()} Audit Event`,
            message: `${newLog.action} on ${newLog.resource} by ${newLog.userName}`,
            read: false
          });
        }

        // Auto-scroll to top if enabled
        if (streamConfig.autoScroll && scrollRef.current) {
          scrollRef.current.scrollTop = 0;
        }
      }
    }, streamConfig.refreshInterval);
  };

  const stopRealTimeStream = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
  };

  const generateMockLogEntry = (): AuditLogEntry => {
    const actions: AuditAction[] = ['login', 'logout', 'create', 'update', 'delete', 'read'];
    const resources: AuditResource[] = ['user', 'session', 'class', 'debate', 'analytics'];
    const severities: AuditSeverity[] = ['low', 'medium', 'high', 'critical'];
    const outcomes = ['success', 'failure', 'warning'] as const;

    const action = actions[Math.floor(Math.random() * actions.length)];
    const resource = resources[Math.floor(Math.random() * resources.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    return {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      userEmail: `user${Math.floor(Math.random() * 1000)}@school.edu`,
      userName: `User ${Math.floor(Math.random() * 1000)}`,
      action,
      resource,
      resourceId: `${resource}_${Math.floor(Math.random() * 1000)}`,
      details: {
        description: `Real-time ${action} operation on ${resource}`,
        executionTime: Math.floor(Math.random() * 1000)
      },
      metadata: {
        source: 'web',
        version: '1.0.0',
        environment: 'production',
        region: 'us-east-1'
      },
      severity,
      category: 'data_access',
      outcome,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Real-time Stream)',
      sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
      organizationId: 'org_1',
      tags: [action, resource, 'real-time'],
      retention: {
        retentionPeriod: 365,
        complianceCategory: 'standard'
      }
    };
  };

  const exportLogs = () => {
    if (!canExportLogs) {
      addNotification({
        type: 'error',
        title: 'Export Denied',
        message: 'You do not have permission to export audit logs.',
        read: false
      });
      return;
    }

    const logsToExport = filteredLogs.slice(0, exportConfig.maxRecords);
    
    switch (exportConfig.format) {
      case 'csv':
        exportToCSV(logsToExport);
        break;
      case 'json':
        exportToJSON(logsToExport);
        break;
      case 'pdf':
        exportToPDF(logsToExport);
        break;
      case 'excel':
        exportToExcel(logsToExport);
        break;
      default:
        exportToJSON(logsToExport);
    }

    setShowExportDialog(false);
    addNotification({
      type: 'success',
      title: 'Export Started',
      message: `Exporting ${logsToExport.length} audit log entries as ${exportConfig.format.toUpperCase()}`,
      read: false
    });
  };

  const exportToCSV = (logs: AuditLogEntry[]) => {
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Outcome', 'Severity', 'IP Address', 'Description'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.timestamp.toISOString(),
        `"${log.userName}"`,
        log.action,
        log.resource,
        log.outcome,
        log.severity,
        log.ipAddress,
        `"${log.details.description}"`
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'audit_logs.csv', 'text/csv');
  };

  const exportToJSON = (logs: AuditLogEntry[]) => {
    const jsonContent = JSON.stringify(logs, null, 2);
    downloadFile(jsonContent, 'audit_logs.json', 'application/json');
  };

  const exportToPDF = (logs: AuditLogEntry[]) => {
    // PDF export would use a library like jsPDF
    addNotification({
      type: 'info',
      title: 'PDF Export',
      message: 'PDF export functionality would be implemented with jsPDF library',
      read: false
    });
  };

  const exportToExcel = (logs: AuditLogEntry[]) => {
    // Excel export would use a library like xlsx
    addNotification({
      type: 'info',
      title: 'Excel Export',
      message: 'Excel export functionality would be implemented with xlsx library',
      read: false
    });
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSeverityBadge = (severity: AuditSeverity) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'success': return <Badge className="bg-green-500">Success</Badge>;
      case 'failure': return <Badge variant="destructive">Failure</Badge>;
      case 'partial': return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'warning': return <Badge className="bg-orange-500">Warning</Badge>;
      default: return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  const getCategoryIcon = (category: AuditCategory) => {
    switch (category) {
      case 'authentication': return <Key className="h-4 w-4" />;
      case 'authorization': return <Shield className="h-4 w-4" />;
      case 'data_access': return <Database className="h-4 w-4" />;
      case 'data_modification': return <Edit className="h-4 w-4" />;
      case 'system_admin': return <Settings className="h-4 w-4" />;
      case 'user_admin': return <User className="h-4 w-4" />;
      case 'security': return <AlertTriangle className="h-4 w-4" />;
      case 'compliance': return <CheckCircle2 className="h-4 w-4" />;
      case 'performance': return <Activity className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Audit Log Viewer
          </h3>
          <p className="text-sm text-muted-foreground">
            Comprehensive audit log management with real-time streaming
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Summary Stats */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{auditLogs.length}</div>
              <div className="text-xs text-muted-foreground">Total Logs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{filteredLogs.length}</div>
              <div className="text-xs text-muted-foreground">Filtered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {auditLogs.filter(log => log.severity === 'critical' || log.severity === 'high').length}
              </div>
              <div className="text-xs text-muted-foreground">High Priority</div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button 
              variant={streamConfig.enabled ? "destructive" : "outline"}
              size="sm"
              onClick={() => setStreamConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            >
              {streamConfig.enabled ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Stream
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Stream
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadAuditLogs()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowStreamConfigDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Stream Status */}
      {streamConfig.enabled && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Real-time streaming active</span>
                <Badge variant="outline">{filteredLogs.length} entries</Badge>
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>Refresh every {streamConfig.refreshInterval / 1000}s</span>
                <span>•</span>
                <span>Max {streamConfig.maxEntries} entries</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs by description, user, action, IP address, or tags..."
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="pl-8"
              />
            </div>
            
            {/* Filter Controls */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <Select 
                value={filters.dateRange.preset} 
                onValueChange={(value: any) => {
                  const now = new Date();
                  let start = new Date();
                  
                  switch (value) {
                    case 'today':
                      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      break;
                    case 'yesterday':
                      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                      break;
                    case 'week':
                      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      break;
                    case 'month':
                      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      break;
                    case 'quarter':
                      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                      break;
                    case 'year':
                      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                      break;
                  }
                  
                  setFilters(prev => ({
                    ...prev,
                    dateRange: { start, end: now, preset: value }
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between">
                    Actions {filters.actions.length > 0 && `(${filters.actions.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {['login', 'logout', 'create', 'read', 'update', 'delete', 'impersonate', 'export_data'].map((action) => (
                    <DropdownMenuCheckboxItem
                      key={action}
                      checked={filters.actions.includes(action as AuditAction)}
                      onCheckedChange={(checked) => {
                        setFilters(prev => ({
                          ...prev,
                          actions: checked 
                            ? [...prev.actions, action as AuditAction]
                            : prev.actions.filter(a => a !== action)
                        }));
                      }}
                    >
                      {action.replace('_', ' ')}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between">
                    Resources {filters.resources.length > 0 && `(${filters.resources.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {['user', 'role', 'organization', 'class', 'session', 'debate', 'analytics', 'system'].map((resource) => (
                    <DropdownMenuCheckboxItem
                      key={resource}
                      checked={filters.resources.includes(resource as AuditResource)}
                      onCheckedChange={(checked) => {
                        setFilters(prev => ({
                          ...prev,
                          resources: checked 
                            ? [...prev.resources, resource as AuditResource]
                            : prev.resources.filter(r => r !== resource)
                        }));
                      }}
                    >
                      {resource}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between">
                    Severity {filters.severities.length > 0 && `(${filters.severities.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {['low', 'medium', 'high', 'critical'].map((severity) => (
                    <DropdownMenuCheckboxItem
                      key={severity}
                      checked={filters.severities.includes(severity as AuditSeverity)}
                      onCheckedChange={(checked) => {
                        setFilters(prev => ({
                          ...prev,
                          severities: checked 
                            ? [...prev.severities, severity as AuditSeverity]
                            : prev.severities.filter(s => s !== severity)
                        }));
                      }}
                    >
                      {severity}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between">
                    Outcome {filters.outcomes.length > 0 && `(${filters.outcomes.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {['success', 'failure', 'partial', 'warning'].map((outcome) => (
                    <DropdownMenuCheckboxItem
                      key={outcome}
                      checked={filters.outcomes.includes(outcome as any)}
                      onCheckedChange={(checked) => {
                        setFilters(prev => ({
                          ...prev,
                          outcomes: checked 
                            ? [...prev.outcomes, outcome as any]
                            : prev.outcomes.filter(o => o !== outcome)
                        }));
                      }}
                    >
                      {outcome}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline"
                onClick={() => setFilters({
                  dateRange: { 
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
                    end: new Date(), 
                    preset: 'week' 
                  },
                  users: [],
                  actions: [],
                  resources: [],
                  severities: [],
                  categories: [],
                  outcomes: [],
                  organizations: organizationId ? [organizationId] : [],
                  ipAddresses: [],
                  searchQuery: '',
                  tags: []
                })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Logs ({filteredLogs.length})</span>
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]" ref={scrollRef}>
            <div className="space-y-2 p-4">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id}
                  className={`border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                    streamConfig.highlightSeverity.includes(log.severity) 
                      ? 'border-orange-300 bg-orange-50' 
                      : ''
                  }`}
                  onClick={() => {
                    setSelectedLog(log);
                    setShowDetailsDialog(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        {getCategoryIcon(log.category)}
                        <span className="text-sm font-medium">{log.action}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{log.resource}</span>
                      <div className="flex items-center space-x-2">
                        {getSeverityBadge(log.severity)}
                        {getOutcomeBadge(log.outcome)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(log.timestamp)}
                    </div>
                  </div>
                  
                  <p className="text-sm mb-2">{log.details.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {log.userName}
                      </span>
                      <span className="flex items-center">
                        <Globe className="h-3 w-3 mr-1" />
                        {log.ipAddress}
                      </span>
                      {log.details.executionTime && (
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {log.details.executionTime}ms
                        </span>
                      )}
                    </div>
                    
                    {log.tags.length > 0 && (
                      <div className="flex space-x-1">
                        {log.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {log.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{log.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredLogs.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No audit logs found matching your filters</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Basic Information</Label>
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Timestamp:</span>
                      <span className="text-sm">{selectedLog.timestamp.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">User:</span>
                      <span className="text-sm">{selectedLog.userName} ({selectedLog.userEmail})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Action:</span>
                      <span className="text-sm">{selectedLog.action}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Resource:</span>
                      <span className="text-sm">{selectedLog.resource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Outcome:</span>
                      {getOutcomeBadge(selectedLog.outcome)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Severity:</span>
                      {getSeverityBadge(selectedLog.severity)}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Technical Details</Label>
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">IP Address:</span>
                      <span className="text-sm font-mono">{selectedLog.ipAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Session ID:</span>
                      <span className="text-sm font-mono">{selectedLog.sessionId}</span>
                    </div>
                    {selectedLog.details.executionTime && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Execution Time:</span>
                        <span className="text-sm">{selectedLog.details.executionTime}ms</span>
                      </div>
                    )}
                    {selectedLog.details.responseCode && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Response Code:</span>
                        <span className="text-sm">{selectedLog.details.responseCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <div className="border rounded-lg p-3">
                  <p className="text-sm">{selectedLog.details.description}</p>
                </div>
              </div>

              {selectedLog.tags.length > 0 && (
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedLog.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {(selectedLog.details.oldValues || selectedLog.details.newValues) && (
                <div className="space-y-2">
                  <Label>Data Changes</Label>
                  <div className="border rounded-lg p-3">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify({
                        oldValues: selectedLog.details.oldValues,
                        newValues: selectedLog.details.newValues
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Audit Logs</DialogTitle>
            <DialogDescription>
              Configure export settings for {filteredLogs.length} filtered log entries
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select 
                  value={exportConfig.format} 
                  onValueChange={(value: any) => setExportConfig(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Max Records</Label>
                <Input
                  type="number"
                  value={exportConfig.maxRecords}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, maxRecords: parseInt(e.target.value) || 10000 }))}
                  max={50000}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMetadata"
                  checked={exportConfig.includeMetadata}
                  onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeMetadata: !!checked }))}
                />
                <Label htmlFor="includeMetadata">Include metadata</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDetails"
                  checked={exportConfig.includeDetails}
                  onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeDetails: !!checked }))}
                />
                <Label htmlFor="includeDetails">Include detailed information</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="compression"
                  checked={exportConfig.compression}
                  onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, compression: !!checked }))}
                />
                <Label htmlFor="compression">Compress file</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stream Configuration Dialog */}
      <Dialog open={showStreamConfigDialog} onOpenChange={setShowStreamConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Real-time Stream Settings</DialogTitle>
            <DialogDescription>
              Configure real-time audit log streaming preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="autoScroll"
                checked={streamConfig.autoScroll}
                onCheckedChange={(checked) => setStreamConfig(prev => ({ ...prev, autoScroll: checked }))}
              />
              <Label htmlFor="autoScroll">Auto-scroll to newest entries</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="showNotifications"
                checked={streamConfig.showNotifications}
                onCheckedChange={(checked) => setStreamConfig(prev => ({ ...prev, showNotifications: checked }))}
              />
              <Label htmlFor="showNotifications">Show notifications for high-priority events</Label>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Refresh Interval (seconds)</Label>
                <Input
                  type="number"
                  value={streamConfig.refreshInterval / 1000}
                  onChange={(e) => setStreamConfig(prev => ({ ...prev, refreshInterval: (parseInt(e.target.value) || 5) * 1000 }))}
                  min={1}
                  max={60}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Max Entries</Label>
                <Input
                  type="number"
                  value={streamConfig.maxEntries}
                  onChange={(e) => setStreamConfig(prev => ({ ...prev, maxEntries: parseInt(e.target.value) || 1000 }))}
                  min={100}
                  max={5000}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStreamConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowStreamConfigDialog(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
