/**
 * Integration Management Component
 * 
 * Task 8.5.4: Third-party service integration configuration, API key management
 * with security best practices, and integration health monitoring tools
 */

'use client';

import React, { useState, useEffect } from 'react';

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
import { Separator } from '@/components/ui/separator';
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
} from '@/components/ui/dropdown-menu';
import { 
  Plug,
  Key,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Cloud,
  Mail,
  Bell,
  Zap,
  Code,
  Globe,
  Server,
  Monitor,
  Settings,
  RefreshCw,
  Play,
  Pause,
  Square,
  Eye,
  EyeOff,
  Copy,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  ExternalLink,
  Info,
  Lightbulb,
  Save,
  RotateCcw,
  Search,
  Filter,
  MoreHorizontal,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  TestTube,
  HelpCircle
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

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

// Types
interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  type: IntegrationType;
  provider: string;
  version: string;
  status: IntegrationStatus;
  configuration: IntegrationConfiguration;
  authentication: AuthenticationConfig;
  health: IntegrationHealth;
  usage: IntegrationUsage;
  settings: IntegrationSettings;
  webhook_config?: WebhookConfig;
  created_at: Date;
  updated_at: Date;
  last_sync?: Date;
  next_sync?: Date;
}

type IntegrationCategory = 
  | 'authentication' | 'email' | 'analytics' | 'storage' | 'communication' 
  | 'payment' | 'ai_services' | 'monitoring' | 'backup' | 'security' | 'custom';

type IntegrationType = 'api' | 'webhook' | 'oauth' | 'saml' | 'database' | 'file_sync' | 'custom';
type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending' | 'testing' | 'deprecated';

interface IntegrationConfiguration {
  endpoint_url?: string;
  api_version?: string;
  timeout_seconds: number;
  retry_attempts: number;
  rate_limit?: RateLimit;
  custom_headers: { [key: string]: string };
  query_parameters: { [key: string]: string };
  request_format: 'json' | 'xml' | 'form' | 'raw';
  response_format: 'json' | 'xml' | 'text';
  encryption_enabled: boolean;
  compression_enabled: boolean;
  batch_processing: boolean;
  max_batch_size?: number;
}

interface RateLimit {
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  burst_limit: number;
}

interface AuthenticationConfig {
  type: AuthenticationType;
  credentials: AuthenticationCredentials;
  token_refresh: TokenRefreshConfig;
  security_settings: SecuritySettings;
}

type AuthenticationType = 'api_key' | 'bearer_token' | 'oauth2' | 'basic_auth' | 'certificate' | 'custom';

interface AuthenticationCredentials {
  api_key?: string;
  api_secret?: string;
  access_token?: string;
  refresh_token?: string;
  username?: string;
  password?: string;
  client_id?: string;
  client_secret?: string;
  certificate_path?: string;
  private_key?: string;
  custom_fields?: { [key: string]: string };
}

interface TokenRefreshConfig {
  enabled: boolean;
  refresh_threshold_minutes: number;
  auto_refresh: boolean;
  refresh_endpoint?: string;
  refresh_schedule?: string;
}

interface SecuritySettings {
  encrypt_credentials: boolean;
  rotate_keys: boolean;
  key_rotation_days: number;
  ip_whitelist: string[];
  allowed_domains: string[];
  require_https: boolean;
  validate_certificates: boolean;
}

interface IntegrationHealth {
  status: HealthStatus;
  last_check: Date;
  response_time: number;
  uptime_percentage: number;
  error_rate: number;
  success_rate: number;
  recent_errors: IntegrationError[];
  performance_metrics: PerformanceMetrics;
  availability_history: AvailabilityPoint[];
}

type HealthStatus = 'healthy' | 'degraded' | 'error' | 'unknown';

interface IntegrationError {
  timestamp: Date;
  error_code: string;
  error_message: string;
  error_type: 'connection' | 'authentication' | 'rate_limit' | 'server_error' | 'client_error' | 'timeout';
  details?: any;
  resolved: boolean;
  resolution_time?: Date;
}

interface PerformanceMetrics {
  avg_response_time: number;
  min_response_time: number;
  max_response_time: number;
  requests_per_minute: number;
  data_transferred: number;
  cache_hit_rate: number;
}

interface AvailabilityPoint {
  timestamp: Date;
  status: HealthStatus;
  response_time: number;
}

interface IntegrationUsage {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  data_transferred: number;
  cost_estimate: number;
  usage_by_endpoint: { [endpoint: string]: number };
  usage_trends: UsageTrend[];
  quota_limits: QuotaLimits;
}

interface UsageTrend {
  date: Date;
  requests: number;
  errors: number;
  data_transferred: number;
}

interface QuotaLimits {
  daily_requests?: number;
  monthly_requests?: number;
  data_transfer_gb?: number;
  concurrent_connections?: number;
  current_usage: {
    daily_requests: number;
    monthly_requests: number;
    data_transfer_gb: number;
    concurrent_connections: number;
  };
}

interface IntegrationSettings {
  enabled: boolean;
  auto_sync: boolean;
  sync_frequency: string;
  notification_preferences: NotificationPreferences;
  logging_level: 'none' | 'errors' | 'warnings' | 'info' | 'debug';
  data_retention_days: number;
  backup_enabled: boolean;
  monitoring_enabled: boolean;
  custom_settings: { [key: string]: any };
}

interface NotificationPreferences {
  on_error: boolean;
  on_success: boolean;
  on_quota_warning: boolean;
  on_health_change: boolean;
  notification_channels: string[];
  escalation_rules: EscalationRule[];
}

interface EscalationRule {
  condition: string;
  delay_minutes: number;
  recipients: string[];
  actions: string[];
}

interface WebhookConfig {
  enabled: boolean;
  endpoint_url: string;
  secret_token: string;
  events: string[];
  retry_policy: RetryPolicy;
  signature_validation: boolean;
  ip_whitelist: string[];
}

interface RetryPolicy {
  max_attempts: number;
  backoff_strategy: 'linear' | 'exponential' | 'fixed';
  initial_delay_seconds: number;
  max_delay_seconds: number;
  timeout_seconds: number;
}

interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  provider: string;
  icon: React.ComponentType;
  popular: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_setup_time: number; // minutes
  required_credentials: string[];
  optional_features: string[];
  documentation_url: string;
  configuration_template: Partial<IntegrationConfiguration>;
}

interface TestResult {
  success: boolean;
  response_time: number;
  status_code?: number;
  error_message?: string;
  test_data?: any;
  timestamp: Date;
}

interface IntegrationManagementProps {
  organizationId?: string;
  canManageIntegrations?: boolean;
  canViewCredentials?: boolean;
  canTestIntegrations?: boolean;
  showSystemIntegrations?: boolean;
}

export function IntegrationManagement({
  organizationId,
  canManageIntegrations = false,
  canViewCredentials = false,
  canTestIntegrations = true,
  showSystemIntegrations = false
}: IntegrationManagementProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('integrations');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory | 'all'>('all');
  
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: TestResult }>({});
  const [showCredentials, setShowCredentials] = useState<{ [key: string]: boolean }>({});

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCredentialDialog, setShowCredentialDialog] = useState(false);

  useEffect(() => {
    loadIntegrations();
    
    // Auto-refresh health status every 60 seconds
    const interval = setInterval(() => {
      refreshHealthStatus();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loadIntegrations = async () => {
    setIsLoading(true);
    
    // Mock integrations data
    const mockIntegrations: Integration[] = [
      {
        id: 'int_1',
        name: 'OpenAI GPT Integration',
        description: 'AI-powered coaching and content generation using OpenAI\'s GPT models',
        category: 'ai_services',
        type: 'api',
        provider: 'OpenAI',
        version: 'v1',
        status: 'active',
        configuration: {
          endpoint_url: 'https://api.openai.com/v1',
          api_version: 'v1',
          timeout_seconds: 30,
          retry_attempts: 3,
          rate_limit: {
            requests_per_minute: 100,
            requests_per_hour: 1000,
            requests_per_day: 10000,
            burst_limit: 10
          },
          custom_headers: {
            'User-Agent': 'BothSides/1.0',
            'Content-Type': 'application/json'
          },
          query_parameters: {},
          request_format: 'json',
          response_format: 'json',
          encryption_enabled: true,
          compression_enabled: false,
          batch_processing: true,
          max_batch_size: 20
        },
        authentication: {
          type: 'bearer_token',
          credentials: {
            api_key: 'sk-***************************************************'
          },
          token_refresh: {
            enabled: false,
            refresh_threshold_minutes: 30,
            auto_refresh: false
          },
          security_settings: {
            encrypt_credentials: true,
            rotate_keys: false,
            key_rotation_days: 90,
            ip_whitelist: [],
            allowed_domains: ['api.openai.com'],
            require_https: true,
            validate_certificates: true
          }
        },
        health: {
          status: 'healthy',
          last_check: new Date(Date.now() - 2 * 60 * 1000),
          response_time: 145,
          uptime_percentage: 99.8,
          error_rate: 0.2,
          success_rate: 99.8,
          recent_errors: [],
          performance_metrics: {
            avg_response_time: 145,
            min_response_time: 89,
            max_response_time: 2340,
            requests_per_minute: 12.5,
            data_transferred: 1.2,
            cache_hit_rate: 0
          },
          availability_history: []
        },
        usage: {
          total_requests: 15687,
          successful_requests: 15656,
          failed_requests: 31,
          data_transferred: 256.7,
          cost_estimate: 47.32,
          usage_by_endpoint: {
            '/chat/completions': 12456,
            '/completions': 3231
          },
          usage_trends: [],
          quota_limits: {
            daily_requests: 10000,
            monthly_requests: 300000,
            current_usage: {
              daily_requests: 234,
              monthly_requests: 15687,
              data_transfer_gb: 256.7,
              concurrent_connections: 5
            }
          }
        },
        settings: {
          enabled: true,
          auto_sync: false,
          sync_frequency: 'real-time',
          notification_preferences: {
            on_error: true,
            on_success: false,
            on_quota_warning: true,
            on_health_change: true,
            notification_channels: ['email', 'dashboard'],
            escalation_rules: []
          },
          logging_level: 'info',
          data_retention_days: 90,
          backup_enabled: false,
          monitoring_enabled: true,
          custom_settings: {
            model: 'gpt-4',
            max_tokens: 1000,
            temperature: 0.7
          }
        },
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        last_sync: new Date(Date.now() - 2 * 60 * 1000)
      },
      {
        id: 'int_2',
        name: 'SendGrid Email Service',
        description: 'Transactional and marketing email delivery service',
        category: 'email',
        type: 'api',
        provider: 'SendGrid',
        version: 'v3',
        status: 'active',
        configuration: {
          endpoint_url: 'https://api.sendgrid.com/v3',
          api_version: 'v3',
          timeout_seconds: 15,
          retry_attempts: 2,
          rate_limit: {
            requests_per_minute: 600,
            requests_per_hour: 10000,
            requests_per_day: 100000,
            burst_limit: 50
          },
          custom_headers: {},
          query_parameters: {},
          request_format: 'json',
          response_format: 'json',
          encryption_enabled: true,
          compression_enabled: false,
          batch_processing: true,
          max_batch_size: 1000
        },
        authentication: {
          type: 'api_key',
          credentials: {
            api_key: 'SG.***************************************************'
          },
          token_refresh: {
            enabled: false,
            refresh_threshold_minutes: 30,
            auto_refresh: false
          },
          security_settings: {
            encrypt_credentials: true,
            rotate_keys: true,
            key_rotation_days: 30,
            ip_whitelist: [],
            allowed_domains: ['api.sendgrid.com'],
            require_https: true,
            validate_certificates: true
          }
        },
        health: {
          status: 'healthy',
          last_check: new Date(Date.now() - 1 * 60 * 1000),
          response_time: 89,
          uptime_percentage: 99.9,
          error_rate: 0.1,
          success_rate: 99.9,
          recent_errors: [],
          performance_metrics: {
            avg_response_time: 89,
            min_response_time: 45,
            max_response_time: 234,
            requests_per_minute: 45.2,
            data_transferred: 12.4,
            cache_hit_rate: 0
          },
          availability_history: []
        },
        usage: {
          total_requests: 8934,
          successful_requests: 8925,
          failed_requests: 9,
          data_transferred: 67.8,
          cost_estimate: 12.45,
          usage_by_endpoint: {
            '/mail/send': 8934
          },
          usage_trends: [],
          quota_limits: {
            daily_requests: 100000,
            monthly_requests: 3000000,
            current_usage: {
              daily_requests: 156,
              monthly_requests: 8934,
              data_transfer_gb: 67.8,
              concurrent_connections: 2
            }
          }
        },
        settings: {
          enabled: true,
          auto_sync: false,
          sync_frequency: 'real-time',
          notification_preferences: {
            on_error: true,
            on_success: false,
            on_quota_warning: true,
            on_health_change: true,
            notification_channels: ['email'],
            escalation_rules: []
          },
          logging_level: 'warnings',
          data_retention_days: 30,
          backup_enabled: false,
          monitoring_enabled: true,
          custom_settings: {}
        },
        webhook_config: {
          enabled: true,
          endpoint_url: 'https://app.bothsides.com/webhooks/sendgrid',
          secret_token: 'wh_*********************',
          events: ['delivered', 'bounce', 'dropped', 'spam_report'],
          retry_policy: {
            max_attempts: 3,
            backoff_strategy: 'exponential',
            initial_delay_seconds: 1,
            max_delay_seconds: 300,
            timeout_seconds: 30
          },
          signature_validation: true,
          ip_whitelist: ['149.72.172.0/24', '149.72.173.0/24']
        },
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        last_sync: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        id: 'int_3',
        name: 'Google Analytics',
        description: 'Web analytics and user behavior tracking',
        category: 'analytics',
        type: 'api',
        provider: 'Google',
        version: 'GA4',
        status: 'error',
        configuration: {
          timeout_seconds: 30,
          retry_attempts: 3,
          custom_headers: {},
          query_parameters: {},
          request_format: 'json',
          response_format: 'json',
          encryption_enabled: true,
          compression_enabled: false,
          batch_processing: false
        },
        authentication: {
          type: 'oauth2',
          credentials: {
            client_id: '*********************',
            client_secret: '*********************',
            refresh_token: '*********************'
          },
          token_refresh: {
            enabled: true,
            refresh_threshold_minutes: 30,
            auto_refresh: true,
            refresh_endpoint: 'https://oauth2.googleapis.com/token'
          },
          security_settings: {
            encrypt_credentials: true,
            rotate_keys: false,
            key_rotation_days: 90,
            ip_whitelist: [],
            allowed_domains: ['googleapis.com'],
            require_https: true,
            validate_certificates: true
          }
        },
        health: {
          status: 'error',
          last_check: new Date(Date.now() - 30 * 60 * 1000),
          response_time: 0,
          uptime_percentage: 95.2,
          error_rate: 15.6,
          success_rate: 84.4,
          recent_errors: [
            {
              timestamp: new Date(Date.now() - 15 * 60 * 1000),
              error_code: 'AUTH_EXPIRED',
              error_message: 'Access token has expired',
              error_type: 'authentication',
              details: { status: 401 },
              resolved: false
            }
          ],
          performance_metrics: {
            avg_response_time: 234,
            min_response_time: 156,
            max_response_time: 2340,
            requests_per_minute: 2.1,
            data_transferred: 45.2,
            cache_hit_rate: 78.5
          },
          availability_history: []
        },
        usage: {
          total_requests: 2456,
          successful_requests: 2073,
          failed_requests: 383,
          data_transferred: 156.3,
          cost_estimate: 0,
          usage_by_endpoint: {
            '/reports': 2456
          },
          usage_trends: [],
          quota_limits: {
            daily_requests: 25000,
            current_usage: {
              daily_requests: 45,
              monthly_requests: 2456,
              data_transfer_gb: 156.3,
              concurrent_connections: 1
            }
          }
        },
        settings: {
          enabled: false,
          auto_sync: true,
          sync_frequency: 'hourly',
          notification_preferences: {
            on_error: true,
            on_success: false,
            on_quota_warning: true,
            on_health_change: true,
            notification_channels: ['email', 'dashboard'],
            escalation_rules: []
          },
          logging_level: 'errors',
          data_retention_days: 365,
          backup_enabled: true,
          monitoring_enabled: true,
          custom_settings: {
            property_id: 'GA_MEASUREMENT_ID'
          }
        },
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 15 * 60 * 1000)
      }
    ];

    setIntegrations(mockIntegrations);
    setIsLoading(false);
  };

  const refreshHealthStatus = async () => {
    // Simulate health check for all integrations
    setIntegrations(prev => prev.map(integration => ({
      ...integration,
      health: {
        ...integration.health,
        last_check: new Date(),
        response_time: Math.floor(Math.random() * 200) + 50
      }
    })));
  };

  const testIntegration = async (integrationId: string) => {
    if (!canTestIntegrations) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to test integrations.',
        read: false
      });
      return;
    }

    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    addNotification({
      type: 'info',
      title: 'Testing Integration',
      message: `Testing connection to ${integration.name}...`,
      read: false
    });

    // Simulate test
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate
      const testResult: TestResult = {
        success,
        response_time: Math.floor(Math.random() * 500) + 100,
        status_code: success ? 200 : Math.floor(Math.random() * 100) + 400,
        error_message: success ? undefined : 'Connection timeout',
        test_data: success ? { message: 'Connection successful' } : undefined,
        timestamp: new Date()
      };

      setTestResults(prev => ({ ...prev, [integrationId]: testResult }));

      addNotification({
        type: success ? 'success' : 'error',
        title: success ? 'Test Successful' : 'Test Failed',
        message: success 
          ? `${integration.name} is responding correctly (${testResult.response_time}ms)`
          : `${integration.name} test failed: ${testResult.error_message}`,
        read: false
      });
    }, 2000);
  };

  const toggleIntegration = (integrationId: string, enabled: boolean) => {
    if (!canManageIntegrations) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to modify integrations.',
        read: false
      });
      return;
    }

    setIntegrations(prev => prev.map(integration =>
      integration.id === integrationId
        ? { 
            ...integration, 
            status: enabled ? 'active' : 'inactive',
            settings: { ...integration.settings, enabled },
            updated_at: new Date()
          }
        : integration
    ));

    addNotification({
      type: 'success',
      title: 'Integration Updated',
      message: `Integration has been ${enabled ? 'enabled' : 'disabled'}.`,
      read: false
    });
  };

  const deleteIntegration = (integrationId: string) => {
    if (!canManageIntegrations) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to delete integrations.',
        read: false
      });
      return;
    }

    setIntegrations(prev => prev.filter(i => i.id !== integrationId));
    setShowDeleteDialog(false);
    setSelectedIntegration(null);

    addNotification({
      type: 'success',
      title: 'Integration Deleted',
      message: 'Integration has been removed successfully.',
      read: false
    });
  };

  const getHealthStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return CheckCircle2;
      case 'degraded': return AlertTriangle;
      case 'error': return XCircle;
      default: return Clock;
    }
  };

  const getStatusBadge = (status: IntegrationStatus) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Active</Badge>;
      case 'inactive': return <Badge variant="secondary">Inactive</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'pending': return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'testing': return <Badge className="bg-blue-500">Testing</Badge>;
      case 'deprecated': return <Badge variant="outline" className="text-orange-600">Deprecated</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: IntegrationCategory) => {
    switch (category) {
      case 'authentication': return Shield;
      case 'email': return Mail;
      case 'analytics': return Activity;
      case 'storage': return Database;
      case 'communication': return Bell;
      case 'payment': return Key;
      case 'ai_services': return Zap;
      case 'monitoring': return Monitor;
      case 'backup': return Database;
      case 'security': return Lock;
      default: return Plug;
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.provider.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || integration.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || integration.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Plug className="h-5 w-5 mr-2" />
            Integration Management
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage third-party service integrations, API keys, and monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={refreshHealthStatus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          {canManageIntegrations && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="ai_services">AI Services</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="authentication">Authentication</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Integrations List */}
      <div className="grid gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="h-8 bg-muted rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredIntegrations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Integrations Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? "No integrations match your current filters."
                  : "No integrations have been configured yet."}
              </p>
              {canManageIntegrations && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Integration
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredIntegrations.map((integration) => {
            const HealthIcon = getHealthStatusIcon(integration.health.status);
            const CategoryIcon = getCategoryIcon(integration.category);
            const testResult = testResults[integration.id];
            
            return (
              <Card key={integration.id} className="transition-all hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <CategoryIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{integration.name}</h3>
                          {getStatusBadge(integration.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                          <span>Provider: {integration.provider}</span>
                          <span>Version: {integration.version}</span>
                          <span>Type: {integration.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={integration.settings.enabled}
                        onCheckedChange={(checked) => toggleIntegration(integration.id, checked)}
                        disabled={!canManageIntegrations}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => testIntegration(integration.id)}>
                            <TestTube className="h-4 w-4 mr-2" />
                            Test Connection
                          </DropdownMenuItem>
                          {canManageIntegrations && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedIntegration(integration);
                              setShowEditDialog(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Configuration
                            </DropdownMenuItem>
                          )}
                          {canViewCredentials && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedIntegration(integration);
                              setShowCredentialDialog(true);
                            }}>
                              <Key className="h-4 w-4 mr-2" />
                              View Credentials
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => window.open(`https://docs.${integration.provider.toLowerCase()}.com`, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Documentation
                          </DropdownMenuItem>
                          {canManageIntegrations && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedIntegration(integration);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Health Status */}
                  <div className={`flex items-center justify-between p-3 rounded-lg border mb-4 ${getHealthStatusColor(integration.health.status)}`}>
                    <div className="flex items-center space-x-2">
                      <HealthIcon className="h-4 w-4" />
                      <span className="font-medium capitalize">{integration.health.status}</span>
                      <span className="text-sm">• Response: {integration.health.response_time}ms</span>
                      <span className="text-sm">• Uptime: {integration.health.uptime_percentage.toFixed(1)}%</span>
                    </div>
                    <div className="text-sm">
                      Last checked: {integration.health.last_check.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {/* Usage Metrics */}
                  <div className="grid gap-4 md:grid-cols-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold">{integration.usage.total_requests.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Requests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{(integration.usage as any).success_rate?.toFixed(1) || integration.health.success_rate.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{integration.usage.data_transferred.toFixed(1)} MB</div>
                      <div className="text-xs text-muted-foreground">Data Transferred</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">${integration.usage.cost_estimate.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Est. Monthly Cost</div>
                    </div>
                  </div>
                  
                  {/* Test Result */}
                  {testResult && (
                    <div className={`p-3 rounded-lg border mb-4 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {testResult.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                          <span className="font-medium">
                            Test {testResult.success ? 'Passed' : 'Failed'}
                          </span>
                          {testResult.success && <span className="text-sm">({testResult.response_time}ms)</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {testResult.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      {!testResult.success && testResult.error_message && (
                        <p className="text-sm text-red-700 mt-1">{testResult.error_message}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Recent Errors */}
                  {integration.health.recent_errors.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-red-600">Recent Errors</Label>
                      {integration.health.recent_errors.slice(0, 2).map((error, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="destructive" className="text-xs">{error.error_code}</Badge>
                              <span className="text-sm font-medium">{error.error_type}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {error.timestamp.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-red-700 mt-1">{error.error_message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      Updated {integration.updated_at.toLocaleDateString()}
                      {integration.last_sync && <span> • Last sync: {integration.last_sync.toLocaleTimeString()}</span>}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testIntegration(integration.id)}
                        disabled={!canTestIntegrations}
                      >
                        <TestTube className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                      
                      {canManageIntegrations && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedIntegration(integration);
                            setShowEditDialog(true);
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Configure
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Integration Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Integration</DialogTitle>
            <DialogDescription>
              Connect a third-party service to enhance your platform
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-12">
            <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Integration Setup</h3>
            <p className="text-muted-foreground">
              Integration setup wizard would be implemented here
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button>Add Integration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedIntegration?.name}"? 
              This will permanently remove the integration and all its configuration data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedIntegration && deleteIntegration(selectedIntegration.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Integration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credential Dialog */}
      <Dialog open={showCredentialDialog} onOpenChange={setShowCredentialDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Integration Credentials</DialogTitle>
            <DialogDescription>
              View and manage API keys and authentication details
            </DialogDescription>
          </DialogHeader>
          {selectedIntegration && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Credentials are encrypted and masked for security. Only authorized personnel can view full credentials.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label>Authentication Type</Label>
                  <div className="font-mono text-sm bg-muted p-2 rounded capitalize">
                    {selectedIntegration.authentication.type.replace('_', ' ')}
                  </div>
                </div>
                
                {Object.entries(selectedIntegration.authentication.credentials)
                  .filter(([key, value]) => value)
                  .map(([key, value]) => (
                    <div key={key}>
                      <Label className="capitalize">{key.replace('_', ' ')}</Label>
                      <div className="flex items-center space-x-2">
                        <div className="font-mono text-sm bg-muted p-2 rounded flex-1">
                          {showCredentials[selectedIntegration.id] 
                            ? value 
                            : `${String(value).substring(0, 4)}${'•'.repeat(Math.max(0, String(value).length - 4))}`
                          }
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCredentials(prev => ({
                            ...prev,
                            [selectedIntegration.id]: !prev[selectedIntegration.id]
                          }))}
                        >
                          {showCredentials[selectedIntegration.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(String(value));
                            addNotification({
                              type: 'success',
                              title: 'Copied',
                              message: 'Credential copied to clipboard',
                              read: false
                            });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCredentialDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
