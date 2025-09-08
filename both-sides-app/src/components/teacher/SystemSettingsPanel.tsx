/**
 * System Settings Panel Component
 * 
 * Task 8.5.4: Comprehensive system configuration interface with categorized options,
 * feature toggle management, and system-wide defaults with organization overrides
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
import { Slider } from '@/components/ui/slider';
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
  Settings,
  ToggleLeft,
  ToggleRight,
  Globe,
  Users,
  Shield,
  Database,
  Mail,
  Bell,
  Palette,
  Layout,
  Code,
  Server,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Lightbulb,
  Zap,
  Save,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  HelpCircle,
  ExternalLink,
  FileText,
  Lock,
  Unlock,
  Key,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  MoreHorizontal
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
interface SystemSetting {
  id: string;
  category: SettingCategory;
  key: string;
  name: string;
  description: string;
  type: SettingType;
  value: any;
  default_value: any;
  organization_override?: any;
  validation: SettingValidation;
  access_level: AccessLevel;
  feature_flag?: string;
  environment_specific: boolean;
  restart_required: boolean;
  last_modified: Date;
  modified_by: string;
  change_history: SettingChange[];
  metadata: SettingMetadata;
}

type SettingCategory = 
  | 'general' | 'security' | 'performance' | 'notifications' | 'integrations' 
  | 'ui_customization' | 'data_retention' | 'backup' | 'monitoring' | 'compliance'
  | 'email' | 'authentication' | 'api' | 'features' | 'advanced';

type SettingType = 
  | 'boolean' | 'string' | 'number' | 'select' | 'multi_select' | 'json' 
  | 'password' | 'url' | 'email' | 'color' | 'file' | 'datetime' | 'duration';

type AccessLevel = 'system' | 'organization' | 'user' | 'public';

interface SettingValidation {
  required: boolean;
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  allowed_values?: any[];
  custom_validator?: string;
  error_message?: string;
}

interface SettingChange {
  timestamp: Date;
  user_id: string;
  user_name: string;
  old_value: any;
  new_value: any;
  reason?: string;
  ip_address?: string;
}

interface SettingMetadata {
  tags: string[];
  documentation_url?: string;
  help_text?: string;
  examples?: any[];
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  rollback_supported: boolean;
  preview_supported: boolean;
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  key: string;
  enabled: boolean;
  rollout_percentage: number;
  target_groups: string[];
  conditions: FeatureFlagCondition[];
  schedule?: FeatureFlagSchedule;
  metrics: FeatureFlagMetrics;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  status: FeatureFlagStatus;
}

interface FeatureFlagCondition {
  type: 'user_id' | 'organization_id' | 'role' | 'plan' | 'country' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with';
  value: any;
}

interface FeatureFlagSchedule {
  start_date?: Date;
  end_date?: Date;
  timezone: string;
  recurring: boolean;
  rollout_schedule?: RolloutStep[];
}

interface RolloutStep {
  percentage: number;
  date: Date;
  duration_hours: number;
  success_criteria?: string[];
}

interface FeatureFlagMetrics {
  adoption_rate: number;
  error_rate: number;
  performance_impact: number;
  user_satisfaction: number;
  rollback_count: number;
  last_rollback?: Date;
}

type FeatureFlagStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived' | 'error';

interface ConfigurationGroup {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  settings: SystemSetting[];
  access_level: AccessLevel;
  requires_restart: boolean;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error' | 'maintenance';
  uptime: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_connections: number;
  response_time: number;
  error_rate: number;
  last_backup: Date;
  pending_updates: number;
  maintenance_window?: MaintenanceWindow;
}

interface MaintenanceWindow {
  start: Date;
  end: Date;
  description: string;
  impact_level: 'low' | 'medium' | 'high';
  affected_services: string[];
}

interface SystemSettingsPanelProps {
  organizationId?: string;
  canModifySystemSettings?: boolean;
  canManageFeatureFlags?: boolean;
  canViewSystemHealth?: boolean;
  currentUserRole?: string;
}

export function SystemSettingsPanel({
  organizationId,
  canModifySystemSettings = false,
  canManageFeatureFlags = false,
  canViewSystemHealth = true,
  currentUserRole = 'user'
}: SystemSettingsPanelProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SettingCategory | 'all'>('all');
  
  const [isLoading, setIsLoading] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState<{ [key: string]: any }>({});
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Dialog states
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);

  useEffect(() => {
    loadSystemSettings();
    loadFeatureFlags();
    loadSystemHealth();
    
    // Auto-refresh system health every 30 seconds
    const interval = setInterval(loadSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemSettings = async () => {
    setIsLoading(true);
    
    // Mock system settings
    const mockSettings: SystemSetting[] = [
      {
        id: 'setting_1',
        category: 'general',
        key: 'site_name',
        name: 'Site Name',
        description: 'The name of your organization displayed throughout the application',
        type: 'string',
        value: 'Both Sides Academy',
        default_value: 'Both Sides',
        validation: {
          required: true,
          min_length: 1,
          max_length: 100
        },
        access_level: 'organization',
        environment_specific: false,
        restart_required: false,
        last_modified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        modified_by: 'admin',
        change_history: [
          {
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            user_id: 'admin_1',
            user_name: 'System Admin',
            old_value: 'Both Sides',
            new_value: 'Both Sides Academy',
            reason: 'Updated branding'
          }
        ],
        metadata: {
          tags: ['branding', 'display'],
          help_text: 'This name appears in the header, emails, and reports',
          impact_level: 'low',
          rollback_supported: true,
          preview_supported: true
        }
      },
      {
        id: 'setting_2',
        category: 'security',
        key: 'session_timeout',
        name: 'Session Timeout',
        description: 'How long user sessions remain active (in minutes)',
        type: 'number',
        value: 480,
        default_value: 240,
        validation: {
          required: true,
          min_value: 15,
          max_value: 1440,
          error_message: 'Session timeout must be between 15 minutes and 24 hours'
        },
        access_level: 'system',
        environment_specific: false,
        restart_required: false,
        last_modified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        modified_by: 'admin',
        change_history: [],
        metadata: {
          tags: ['security', 'authentication'],
          help_text: 'Longer sessions improve user experience but may pose security risks',
          impact_level: 'medium',
          rollback_supported: true,
          preview_supported: false
        }
      },
      {
        id: 'setting_3',
        category: 'features',
        key: 'enable_ai_coaching',
        name: 'AI Coaching',
        description: 'Enable AI-powered coaching and suggestions during debates',
        type: 'boolean',
        value: true,
        default_value: false,
        validation: {
          required: true
        },
        access_level: 'organization',
        feature_flag: 'ai_coaching_v2',
        environment_specific: false,
        restart_required: false,
        last_modified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        modified_by: 'teacher_1',
        change_history: [],
        metadata: {
          tags: ['ai', 'features', 'education'],
          help_text: 'AI coaching provides real-time suggestions to help students improve their debate skills',
          impact_level: 'high',
          rollback_supported: true,
          preview_supported: true
        }
      },
      {
        id: 'setting_4',
        category: 'performance',
        key: 'max_concurrent_sessions',
        name: 'Max Concurrent Sessions',
        description: 'Maximum number of concurrent debate sessions allowed',
        type: 'number',
        value: 50,
        default_value: 25,
        validation: {
          required: true,
          min_value: 1,
          max_value: 500
        },
        access_level: 'system',
        environment_specific: true,
        restart_required: true,
        last_modified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        modified_by: 'admin',
        change_history: [],
        metadata: {
          tags: ['performance', 'scaling', 'limits'],
          help_text: 'Higher limits require more server resources. Monitor system performance carefully.',
          impact_level: 'critical',
          rollback_supported: true,
          preview_supported: false
        }
      },
      {
        id: 'setting_5',
        category: 'notifications',
        key: 'email_notifications_enabled',
        name: 'Email Notifications',
        description: 'Send email notifications for important events',
        type: 'boolean',
        value: true,
        default_value: true,
        validation: {
          required: true
        },
        access_level: 'organization',
        environment_specific: false,
        restart_required: false,
        last_modified: new Date(),
        modified_by: 'admin',
        change_history: [],
        metadata: {
          tags: ['notifications', 'email'],
          help_text: 'Users can still control individual notification preferences',
          impact_level: 'low',
          rollback_supported: true,
          preview_supported: false
        }
      },
      {
        id: 'setting_6',
        category: 'ui_customization',
        key: 'primary_color',
        name: 'Primary Color',
        description: 'Primary brand color used throughout the interface',
        type: 'color',
        value: '#3b82f6',
        default_value: '#3b82f6',
        validation: {
          required: true,
          pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
        },
        access_level: 'organization',
        environment_specific: false,
        restart_required: false,
        last_modified: new Date(),
        modified_by: 'admin',
        change_history: [],
        metadata: {
          tags: ['ui', 'branding', 'color'],
          help_text: 'This color will be used for buttons, links, and accents',
          impact_level: 'low',
          rollback_supported: true,
          preview_supported: true
        }
      }
    ];

    setSettings(mockSettings);
    setIsLoading(false);
  };

  const loadFeatureFlags = async () => {
    // Mock feature flags
    const mockFeatureFlags: FeatureFlag[] = [
      {
        id: 'flag_1',
        name: 'AI Coaching v2',
        description: 'Enhanced AI coaching with advanced natural language processing',
        key: 'ai_coaching_v2',
        enabled: true,
        rollout_percentage: 75,
        target_groups: ['teachers', 'premium_users'],
        conditions: [
          {
            type: 'role',
            operator: 'in',
            value: ['teacher', 'admin']
          }
        ],
        schedule: {
          start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          timezone: 'UTC',
          recurring: false,
          rollout_schedule: [
            {
              percentage: 25,
              date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              duration_hours: 24
            },
            {
              percentage: 50,
              date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              duration_hours: 24
            },
            {
              percentage: 75,
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              duration_hours: 72
            }
          ]
        },
        metrics: {
          adoption_rate: 68.4,
          error_rate: 0.2,
          performance_impact: -3.1,
          user_satisfaction: 4.7,
          rollback_count: 0
        },
        created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        created_by: 'product_manager',
        status: 'active'
      },
      {
        id: 'flag_2',
        name: 'Advanced Analytics Dashboard',
        description: 'New analytics dashboard with machine learning insights',
        key: 'advanced_analytics',
        enabled: false,
        rollout_percentage: 0,
        target_groups: ['admins', 'data_analysts'],
        conditions: [
          {
            type: 'role',
            operator: 'equals',
            value: 'admin'
          },
          {
            type: 'plan',
            operator: 'in',
            value: ['enterprise', 'premium']
          }
        ],
        metrics: {
          adoption_rate: 0,
          error_rate: 0,
          performance_impact: 0,
          user_satisfaction: 0,
          rollback_count: 0
        },
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        created_by: 'product_manager',
        status: 'draft'
      }
    ];

    setFeatureFlags(mockFeatureFlags);
  };

  const loadSystemHealth = async () => {
    // Mock system health data
    const mockHealth: SystemHealth = {
      status: 'healthy',
      uptime: 99.7,
      cpu_usage: 23.4,
      memory_usage: 67.8,
      disk_usage: 45.2,
      active_connections: 1247,
      response_time: 145,
      error_rate: 0.08,
      last_backup: new Date(Date.now() - 6 * 60 * 60 * 1000),
      pending_updates: 3
    };

    setSystemHealth(mockHealth);
  };

  const handleSettingChange = (settingId: string, newValue: any) => {
    if (!canModifySystemSettings) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to modify system settings.',
        read: false
      });
      return;
    }

    setUnsavedChanges(prev => ({
      ...prev,
      [settingId]: newValue
    }));

    // Temporary update for preview
    setSettings(prev => prev.map(setting => 
      setting.id === settingId ? { ...setting, value: newValue } : setting
    ));
  };

  const saveSettings = async () => {
    if (Object.keys(unsavedChanges).length === 0) {
      addNotification({
        type: 'info',
        title: 'No Changes',
        message: 'No settings have been modified.',
        read: false
      });
      return;
    }

    const settingsRequiringRestart = settings.filter(s => 
      Object.keys(unsavedChanges).includes(s.id) && s.restart_required
    );

    if (settingsRequiringRestart.length > 0) {
      setShowRestartDialog(true);
      return;
    }

    // Save settings
    setSettings(prev => prev.map(setting => {
      if (Object.keys(unsavedChanges).includes(setting.id)) {
        return {
          ...setting,
          value: unsavedChanges[setting.id],
          last_modified: new Date(),
          modified_by: user?.id || 'unknown',
          change_history: [
            {
              timestamp: new Date(),
              user_id: user?.id || 'unknown',
              user_name: user?.primaryEmailAddress?.emailAddress || 'Unknown User',
              old_value: setting.value,
              new_value: unsavedChanges[setting.id],
              reason: 'Updated via settings panel'
            },
            ...setting.change_history
          ]
        };
      }
      return setting;
    }));

    setUnsavedChanges({});

    addNotification({
      type: 'success',
      title: 'Settings Saved',
      message: `${Object.keys(unsavedChanges).length} settings have been updated successfully.`,
      read: false
    });
  };

  const resetToDefaults = () => {
    setSettings(prev => prev.map(setting => ({
      ...setting,
      value: setting.default_value
    })));
    setUnsavedChanges({});
    setShowResetDialog(false);

    addNotification({
      type: 'info',
      title: 'Settings Reset',
      message: 'All settings have been reset to their default values.',
      read: false
    });
  };

  const toggleFeatureFlag = async (flagId: string, enabled: boolean) => {
    if (!canManageFeatureFlags) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to manage feature flags.',
        read: false
      });
      return;
    }

    setFeatureFlags(prev => prev.map(flag => 
      flag.id === flagId ? { ...flag, enabled, updated_at: new Date() } : flag
    ));

    addNotification({
      type: 'success',
      title: 'Feature Flag Updated',
      message: `Feature flag has been ${enabled ? 'enabled' : 'disabled'}.`,
      read: false
    });
  };

  const getHealthStatus = (status: SystemHealth['status']) => {
    switch (status) {
      case 'healthy':
        return { color: 'text-green-600', icon: CheckCircle2, label: 'Healthy' };
      case 'warning':
        return { color: 'text-yellow-600', icon: AlertTriangle, label: 'Warning' };
      case 'error':
        return { color: 'text-red-600', icon: XCircle, label: 'Error' };
      case 'maintenance':
        return { color: 'text-blue-600', icon: Settings, label: 'Maintenance' };
      default:
        return { color: 'text-gray-600', icon: Info, label: 'Unknown' };
    }
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const currentValue = unsavedChanges[setting.id] !== undefined 
      ? unsavedChanges[setting.id] 
      : setting.value;

    switch (setting.type) {
      case 'boolean':
        return (
          <Switch
            checked={currentValue}
            onCheckedChange={(checked) => handleSettingChange(setting.id, checked)}
            disabled={!canModifySystemSettings}
          />
        );

      case 'string':
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => handleSettingChange(setting.id, e.target.value)}
            placeholder={setting.default_value}
            disabled={!canModifySystemSettings}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={currentValue || 0}
            onChange={(e) => handleSettingChange(setting.id, parseInt(e.target.value) || 0)}
            min={setting.validation.min_value}
            max={setting.validation.max_value}
            disabled={!canModifySystemSettings}
          />
        );

      case 'select':
        return (
          <Select
            value={currentValue}
            onValueChange={(value) => handleSettingChange(setting.id, value)}
            disabled={!canModifySystemSettings}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {setting.validation.allowed_values?.map((value) => (
                <SelectItem key={value} value={value}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'color':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={currentValue}
              onChange={(e) => handleSettingChange(setting.id, e.target.value)}
              className="w-12 h-8 rounded border border-input"
              disabled={!canModifySystemSettings}
            />
            <Input
              value={currentValue}
              onChange={(e) => handleSettingChange(setting.id, e.target.value)}
              placeholder="#000000"
              className="font-mono text-sm"
              disabled={!canModifySystemSettings}
            />
          </div>
        );

      case 'password':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="password"
              value={currentValue ? '••••••••' : ''}
              placeholder="Enter new password"
              disabled={!canModifySystemSettings}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Generate new password functionality
                const newPassword = Math.random().toString(36).substring(2, 15);
                handleSettingChange(setting.id, newPassword);
              }}
              disabled={!canModifySystemSettings}
            >
              Generate
            </Button>
          </div>
        );

      default:
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => handleSettingChange(setting.id, e.target.value)}
            disabled={!canModifySystemSettings}
          />
        );
    }
  };

  const configurationGroups: ConfigurationGroup[] = [
    {
      id: 'general',
      name: 'General',
      description: 'Basic system configuration and branding',
      icon: Settings,
      settings: settings.filter(s => s.category === 'general'),
      access_level: 'organization',
      requires_restart: false
    },
    {
      id: 'security',
      name: 'Security',
      description: 'Authentication, authorization, and security policies',
      icon: Shield,
      settings: settings.filter(s => s.category === 'security'),
      access_level: 'system',
      requires_restart: false
    },
    {
      id: 'performance',
      name: 'Performance',
      description: 'System performance and resource management',
      icon: Activity,
      settings: settings.filter(s => s.category === 'performance'),
      access_level: 'system',
      requires_restart: true
    },
    {
      id: 'features',
      name: 'Features',
      description: 'Feature toggles and experimental functionality',
      icon: ToggleLeft,
      settings: settings.filter(s => s.category === 'features'),
      access_level: 'organization',
      requires_restart: false
    },
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'Email, SMS, and push notification settings',
      icon: Bell,
      settings: settings.filter(s => s.category === 'notifications'),
      access_level: 'organization',
      requires_restart: false
    },
    {
      id: 'ui_customization',
      name: 'UI Customization',
      description: 'Interface themes, colors, and branding',
      icon: Palette,
      settings: settings.filter(s => s.category === 'ui_customization'),
      access_level: 'organization',
      requires_restart: false
    }
  ];

  const filteredGroups = configurationGroups.filter(group => {
    if (selectedCategory !== 'all' && !group.settings.some(s => s.category === selectedCategory)) {
      return false;
    }

    if (searchQuery) {
      return group.settings.some(setting => 
        setting.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        setting.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        setting.key.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            System Settings
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure system-wide settings, feature flags, and customizations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {Object.keys(unsavedChanges).length > 0 && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              {Object.keys(unsavedChanges).length} unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={saveSettings} disabled={Object.keys(unsavedChanges).length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      {canViewSystemHealth && systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {React.createElement(getHealthStatus(systemHealth.status).icon, { 
                className: `h-5 w-5 ${getHealthStatus(systemHealth.status).color}` 
              })}
              <span>System Health</span>
              <Badge className={
                systemHealth.status === 'healthy' ? 'bg-green-500' :
                systemHealth.status === 'warning' ? 'bg-yellow-500' :
                systemHealth.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
              }>
                {getHealthStatus(systemHealth.status).label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uptime</span>
                  <span className="font-medium">{systemHealth.uptime}%</span>
                </div>
                <Progress value={systemHealth.uptime} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>CPU Usage</span>
                  <span className="font-medium">{systemHealth.cpu_usage}%</span>
                </div>
                <Progress value={systemHealth.cpu_usage} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memory Usage</span>
                  <span className="font-medium">{systemHealth.memory_usage}%</span>
                </div>
                <Progress value={systemHealth.memory_usage} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Disk Usage</span>
                  <span className="font-medium">{systemHealth.disk_usage}%</span>
                </div>
                <Progress value={systemHealth.disk_usage} className="h-2" />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{systemHealth.active_connections.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Active Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{systemHealth.response_time}ms</div>
                <div className="text-xs text-muted-foreground">Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{systemHealth.error_rate}%</div>
                <div className="text-xs text-muted-foreground">Error Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{systemHealth.pending_updates}</div>
                <div className="text-xs text-muted-foreground">Pending Updates</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="features">Features</SelectItem>
                <SelectItem value="notifications">Notifications</SelectItem>
                <SelectItem value="ui_customization">UI Customization</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              {showAdvancedSettings ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showAdvancedSettings ? 'Hide Advanced' : 'Show Advanced'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Configuration</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <group.icon className="h-5 w-5" />
                    <span>{group.name}</span>
                    {group.requires_restart && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Restart Required
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {group.settings
                      .filter(setting => showAdvancedSettings || setting.access_level !== 'system')
                      .filter(setting => {
                        if (!searchQuery) return true;
                        return setting.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               setting.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               setting.key.toLowerCase().includes(searchQuery.toLowerCase());
                      })
                      .map((setting) => (
                        <div key={setting.id} className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center space-x-2">
                              <Label className="font-medium">{setting.name}</Label>
                              {setting.restart_required && (
                                <Badge variant="outline" className="text-xs text-orange-600">Restart</Badge>
                              )}
                              {setting.feature_flag && (
                                <Badge variant="outline" className="text-xs text-blue-600">Feature Flag</Badge>
                              )}
                              {unsavedChanges[setting.id] !== undefined && (
                                <Badge variant="outline" className="text-xs text-yellow-600">Modified</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{setting.description}</p>
                            {setting.metadata.help_text && (
                              <p className="text-xs text-muted-foreground italic">
                                💡 {setting.metadata.help_text}
                              </p>
                            )}
                            {setting.change_history.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Last changed {setting.last_modified.toLocaleDateString()} by {setting.modified_by}
                              </p>
                            )}
                          </div>
                          
                          <div className="w-64">
                            {renderSettingInput(setting)}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSetting(setting)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            
                            {setting.metadata.rollback_supported && setting.change_history.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const lastChange = setting.change_history[0];
                                  handleSettingChange(setting.id, lastChange.old_value);
                                }}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Control feature rollouts and experimental functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {featureFlags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{flag.name}</h4>
                        <Badge className={
                          flag.status === 'active' ? 'bg-green-500' :
                          flag.status === 'draft' ? 'bg-gray-500' :
                          flag.status === 'paused' ? 'bg-yellow-500' :
                          flag.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                        }>
                          {flag.status}
                        </Badge>
                        <Badge variant="outline">
                          {flag.rollout_percentage}% rollout
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Adoption: {flag.metrics.adoption_rate.toFixed(1)}%</span>
                        <span>Error Rate: {flag.metrics.error_rate}%</span>
                        <span>Satisfaction: {flag.metrics.user_satisfaction.toFixed(1)}/5</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Updated {flag.updated_at.toLocaleDateString()}
                        </div>
                      </div>
                      
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={(checked) => toggleFeatureFlag(flag.id, checked)}
                        disabled={!canManageFeatureFlags}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced System Controls</CardTitle>
              <CardDescription>
                Advanced system management and maintenance tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Button variant="outline" onClick={() => setShowBackupDialog(true)}>
                  <Database className="h-4 w-4 mr-2" />
                  Create Backup
                </Button>
                
                <Button variant="outline" onClick={() => loadSystemHealth()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Health
                </Button>
                
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Settings
                </Button>
                
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Settings
                </Button>
                
                <Button variant="outline">
                  <Activity className="h-4 w-4 mr-2" />
                  System Logs
                </Button>
                
                <Button variant="outline">
                  <Server className="h-4 w-4 mr-2" />
                  Maintenance Mode
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Restart Required Dialog */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>System Restart Required</AlertDialogTitle>
            <AlertDialogDescription>
              Some of the settings you've changed require a system restart to take effect. 
              Would you like to save these changes and schedule a restart?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              saveSettings();
              setShowRestartDialog(false);
              addNotification({
                type: 'info',
                title: 'Restart Scheduled',
                message: 'System restart has been scheduled for the next maintenance window.',
                read: false
              });
            }}>
              Save & Schedule Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Settings</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset all settings to their default values? 
              This action cannot be undone and may require a system restart.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetToDefaults} className="bg-red-600 hover:bg-red-700">
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Setting Details Dialog */}
      <Dialog open={!!selectedSetting} onOpenChange={() => setSelectedSetting(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Setting Details</DialogTitle>
          </DialogHeader>
          {selectedSetting && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg">{selectedSetting.name}</h4>
                <p className="text-muted-foreground">{selectedSetting.description}</p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Key</Label>
                  <div className="font-mono text-sm bg-muted p-2 rounded">{selectedSetting.key}</div>
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge variant="outline" className="capitalize">{selectedSetting.type}</Badge>
                </div>
                <div>
                  <Label>Access Level</Label>
                  <Badge variant="outline" className="capitalize">{selectedSetting.access_level}</Badge>
                </div>
                <div>
                  <Label>Impact Level</Label>
                  <Badge className={
                    selectedSetting.metadata.impact_level === 'critical' ? 'bg-red-500' :
                    selectedSetting.metadata.impact_level === 'high' ? 'bg-orange-500' :
                    selectedSetting.metadata.impact_level === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }>
                    {selectedSetting.metadata.impact_level}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>Current Value</Label>
                <div className="font-mono text-sm bg-muted p-2 rounded">
                  {JSON.stringify(selectedSetting.value)}
                </div>
              </div>
              
              <div>
                <Label>Default Value</Label>
                <div className="font-mono text-sm bg-muted p-2 rounded">
                  {JSON.stringify(selectedSetting.default_value)}
                </div>
              </div>
              
              {selectedSetting.change_history.length > 0 && (
                <div>
                  <Label>Change History</Label>
                  <div className="space-y-2 mt-2">
                    {selectedSetting.change_history.slice(0, 5).map((change, index) => (
                      <div key={index} className="text-sm border-l-2 border-blue-200 pl-3">
                        <div className="flex justify-between">
                          <span className="font-medium">{change.user_name}</span>
                          <span className="text-muted-foreground">{change.timestamp.toLocaleString()}</span>
                        </div>
                        <div className="text-muted-foreground">
                          Changed from <code>{JSON.stringify(change.old_value)}</code> to <code>{JSON.stringify(change.new_value)}</code>
                        </div>
                        {change.reason && (
                          <div className="text-xs text-muted-foreground italic">{change.reason}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSetting(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
