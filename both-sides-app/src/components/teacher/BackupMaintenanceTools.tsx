/**
 * Backup and Maintenance Tools Component
 * 
 * Task 8.5.4: Database backup scheduling and management, system maintenance
 * mode controls with notifications, and data integrity checking and repair utilities
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Database,
  HardDrive,
  Shield,
  Clock,
  Calendar,
  Play,
  Pause,
  Square,
  RefreshCw,
  Download,
  Upload,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Activity,
  Server,
  Monitor,
  Zap,
  Bell,
  Mail,
  Users,
  FileText,
  Archive,
  Trash2,
  Edit,
  Copy,
  Eye,
  Search,
  Filter,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Wrench,
  Tool,
  Bug,
  TestTube,
  Gauge,
  HelpCircle,
  ExternalLink,
  Save,
  RotateCcw,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckSquare,
  AlertCircle,
  Clock3,
  CloudDownload,
  CloudUpload,
  HardDriveIcon
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface BackupJob {
  id: string;
  name: string;
  description: string;
  type: BackupType;
  source: BackupSource;
  destination: BackupDestination;
  schedule: BackupSchedule;
  retention: RetentionPolicy;
  compression: CompressionSettings;
  encryption: EncryptionSettings;
  status: BackupStatus;
  progress?: BackupProgress;
  history: BackupHistory[];
  created_at: Date;
  updated_at: Date;
  last_run?: Date;
  next_run?: Date;
  created_by: string;
}

type BackupType = 'full' | 'incremental' | 'differential' | 'snapshot' | 'continuous';
type BackupStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

interface BackupSource {
  type: 'database' | 'files' | 'application_data' | 'user_data' | 'system_config' | 'custom';
  includes: string[];
  excludes: string[];
  filters: BackupFilter[];
}

interface BackupFilter {
  type: 'extension' | 'size' | 'date' | 'path' | 'regex';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: string;
  action: 'include' | 'exclude';
}

interface BackupDestination {
  type: 'local' | 's3' | 'azure' | 'gcp' | 'ftp' | 'sftp' | 'custom';
  location: string;
  credentials?: BackupCredentials;
  region?: string;
  bucket?: string;
  path?: string;
  validation: boolean;
}

interface BackupCredentials {
  access_key?: string;
  secret_key?: string;
  username?: string;
  password?: string;
  token?: string;
  certificate?: string;
}

interface BackupSchedule {
  enabled: boolean;
  frequency: 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  cron_expression?: string;
  time_of_day?: string;
  days_of_week?: number[];
  days_of_month?: number[];
  timezone: string;
  max_concurrent_jobs: number;
  retry_policy: RetryPolicy;
}

interface RetryPolicy {
  max_attempts: number;
  delay_minutes: number;
  exponential_backoff: boolean;
  max_delay_minutes: number;
  retry_on_failure_types: string[];
}

interface RetentionPolicy {
  enabled: boolean;
  keep_daily: number;
  keep_weekly: number;
  keep_monthly: number;
  keep_yearly: number;
  max_backup_age_days: number;
  max_backup_count: number;
  auto_cleanup: boolean;
  storage_limit_gb?: number;
}

interface CompressionSettings {
  enabled: boolean;
  algorithm: 'gzip' | 'bzip2' | 'lz4' | 'zstd' | 'none';
  level: number; // 1-9
  parallel_compression: boolean;
  verify_integrity: boolean;
}

interface EncryptionSettings {
  enabled: boolean;
  algorithm: 'aes256' | 'aes128' | 'chacha20' | 'gpg';
  key_derivation: 'pbkdf2' | 'argon2' | 'scrypt';
  key_source: 'password' | 'keyfile' | 'hsm' | 'env_var';
  key_rotation_days?: number;
  verify_signature: boolean;
}

interface BackupProgress {
  stage: 'preparing' | 'backing_up' | 'compressing' | 'encrypting' | 'uploading' | 'verifying' | 'cleanup';
  percentage: number;
  current_file?: string;
  files_processed: number;
  files_total: number;
  bytes_processed: number;
  bytes_total: number;
  speed_mbps: number;
  eta_minutes: number;
  started_at: Date;
}

interface BackupHistory {
  id: string;
  backup_job_id: string;
  started_at: Date;
  completed_at?: Date;
  duration_minutes?: number;
  status: BackupStatus;
  size_bytes: number;
  files_count: number;
  error_message?: string;
  warning_count: number;
  destination_path: string;
  checksum?: string;
  verification_status?: 'passed' | 'failed' | 'skipped';
}

interface MaintenanceWindow {
  id: string;
  name: string;
  description: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  affected_services: string[];
  start_time: Date;
  end_time: Date;
  timezone: string;
  notification_settings: NotificationSettings;
  tasks: MaintenanceTask[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

type MaintenanceType = 'scheduled' | 'emergency' | 'routine' | 'upgrade' | 'security' | 'database';
type MaintenanceStatus = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'postponed';

interface NotificationSettings {
  enabled: boolean;
  advance_notice_hours: number[];
  notification_channels: string[];
  custom_message?: string;
  user_groups: string[];
  banner_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
}

interface MaintenanceTask {
  id: string;
  name: string;
  description: string;
  type: 'database' | 'file_system' | 'service_restart' | 'deployment' | 'configuration' | 'custom';
  order: number;
  estimated_duration_minutes: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  dependencies: string[];
}

interface IntegrityCheck {
  id: string;
  name: string;
  description: string;
  type: IntegrityCheckType;
  target: IntegrityTarget;
  schedule: CheckSchedule;
  thresholds: CheckThresholds;
  status: CheckStatus;
  last_run?: Date;
  next_run?: Date;
  results: IntegrityResult[];
  auto_repair: boolean;
  notification_settings: IntegrityNotificationSettings;
  created_at: Date;
  updated_at: Date;
}

type IntegrityCheckType = 'database' | 'file_system' | 'application' | 'configuration' | 'permissions' | 'custom';
type CheckStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'disabled';

interface IntegrityTarget {
  type: 'database_table' | 'file_path' | 'service' | 'configuration_file' | 'permission_set';
  identifiers: string[];
  inclusion_patterns: string[];
  exclusion_patterns: string[];
}

interface CheckSchedule {
  enabled: boolean;
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  cron_expression?: string;
  timezone: string;
}

interface CheckThresholds {
  error_threshold: number;
  warning_threshold: number;
  performance_threshold_ms: number;
  size_threshold_bytes?: number;
  age_threshold_days?: number;
}

interface IntegrityResult {
  id: string;
  check_id: string;
  timestamp: Date;
  status: 'passed' | 'warning' | 'failed' | 'error';
  score: number; // 0-100
  issues_found: IntegrityIssue[];
  repairs_applied: IntegrityRepair[];
  duration_ms: number;
  details: any;
}

interface IntegrityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: string;
  recommended_action: string;
  auto_repairable: boolean;
}

interface IntegrityRepair {
  issue_id: string;
  action: string;
  status: 'attempted' | 'succeeded' | 'failed';
  timestamp: Date;
  details?: string;
}

interface IntegrityNotificationSettings {
  on_failure: boolean;
  on_warning: boolean;
  on_repair: boolean;
  threshold_alerts: boolean;
  notification_channels: string[];
}

interface SystemHealth {
  overall_status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  last_updated: Date;
  uptime_percentage: number;
  backup_status: BackupHealthStatus;
  maintenance_status: MaintenanceHealthStatus;
  integrity_status: IntegrityHealthStatus;
  storage_usage: StorageUsage;
  performance_metrics: PerformanceMetrics;
}

interface BackupHealthStatus {
  last_successful_backup: Date;
  failed_backups_24h: number;
  average_backup_duration_minutes: number;
  storage_usage_gb: number;
  next_scheduled_backup: Date;
}

interface MaintenanceHealthStatus {
  maintenance_mode: boolean;
  upcoming_maintenance: MaintenanceWindow[];
  overdue_maintenance: number;
  average_maintenance_duration_hours: number;
}

interface IntegrityHealthStatus {
  issues_detected: number;
  critical_issues: number;
  last_integrity_check: Date;
  auto_repairs_applied_24h: number;
  integrity_score: number;
}

interface StorageUsage {
  backup_storage_gb: number;
  backup_storage_limit_gb: number;
  database_size_gb: number;
  file_storage_gb: number;
  temp_storage_gb: number;
  available_storage_gb: number;
}

interface PerformanceMetrics {
  backup_speed_mbps: number;
  database_response_time_ms: number;
  file_system_io_ops: number;
  memory_usage_percentage: number;
  cpu_usage_percentage: number;
}

interface BackupMaintenanceToolsProps {
  organizationId?: string;
  canManageBackups?: boolean;
  canScheduleMaintenance?: boolean;
  canRunIntegrityChecks?: boolean;
  canViewSystemHealth?: boolean;
}

export function BackupMaintenanceTools({
  organizationId,
  canManageBackups = false,
  canScheduleMaintenance = false,
  canRunIntegrityChecks = true,
  canViewSystemHealth = true
}: BackupMaintenanceToolsProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('backups');
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  const [integrityChecks, setIntegrityChecks] = useState<IntegrityCheck[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupJob | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceWindow | null>(null);
  const [selectedIntegrityCheck, setSelectedIntegrityCheck] = useState<IntegrityCheck | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [showIntegrityDialog, setShowIntegrityDialog] = useState(false);
  const [showRunBackupDialog, setShowRunBackupDialog] = useState(false);
  const [showMaintenanceModeDialog, setShowMaintenanceModeDialog] = useState(false);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      refreshSystemHealth();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    
    // Mock backup jobs
    const mockBackupJobs: BackupJob[] = [
      {
        id: 'backup_1',
        name: 'Daily Full Backup',
        description: 'Complete system backup including database and files',
        type: 'full',
        source: {
          type: 'database',
          includes: ['users', 'debates', 'sessions', 'analytics'],
          excludes: ['temp_data', 'logs'],
          filters: []
        },
        destination: {
          type: 's3',
          location: 's3://bothsides-backups/daily',
          region: 'us-east-1',
          bucket: 'bothsides-backups',
          path: '/daily',
          validation: true
        },
        schedule: {
          enabled: true,
          frequency: 'daily',
          time_of_day: '02:00',
          timezone: 'UTC',
          max_concurrent_jobs: 1,
          retry_policy: {
            max_attempts: 3,
            delay_minutes: 5,
            exponential_backoff: true,
            max_delay_minutes: 30,
            retry_on_failure_types: ['network', 'timeout']
          }
        },
        retention: {
          enabled: true,
          keep_daily: 30,
          keep_weekly: 12,
          keep_monthly: 6,
          keep_yearly: 2,
          max_backup_age_days: 365,
          max_backup_count: 100,
          auto_cleanup: true,
          storage_limit_gb: 500
        },
        compression: {
          enabled: true,
          algorithm: 'zstd',
          level: 6,
          parallel_compression: true,
          verify_integrity: true
        },
        encryption: {
          enabled: true,
          algorithm: 'aes256',
          key_derivation: 'pbkdf2',
          key_source: 'env_var',
          key_rotation_days: 90,
          verify_signature: true
        },
        status: 'completed',
        history: [
          {
            id: 'hist_1',
            backup_job_id: 'backup_1',
            started_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
            completed_at: new Date(Date.now() - 5.5 * 60 * 60 * 1000),
            duration_minutes: 28,
            status: 'completed',
            size_bytes: 2.4 * 1024 * 1024 * 1024, // 2.4 GB
            files_count: 45632,
            warning_count: 0,
            destination_path: '/daily/backup_2024-03-15_02-00.tar.zst.enc',
            checksum: 'sha256:a1b2c3d4e5f6...',
            verification_status: 'passed'
          }
        ],
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        last_run: new Date(Date.now() - 6 * 60 * 60 * 1000),
        next_run: new Date(Date.now() + 18 * 60 * 60 * 1000),
        created_by: 'admin'
      },
      {
        id: 'backup_2',
        name: 'Incremental User Data',
        description: 'Hourly incremental backup of user-generated content',
        type: 'incremental',
        source: {
          type: 'user_data',
          includes: ['uploads', 'user_profiles', 'debate_transcripts'],
          excludes: ['cache', 'thumbnails'],
          filters: [
            {
              type: 'extension',
              operator: 'equals',
              value: '.tmp',
              action: 'exclude'
            }
          ]
        },
        destination: {
          type: 's3',
          location: 's3://bothsides-backups/incremental',
          region: 'us-east-1',
          bucket: 'bothsides-backups',
          path: '/incremental',
          validation: true
        },
        schedule: {
          enabled: true,
          frequency: 'hourly',
          timezone: 'UTC',
          max_concurrent_jobs: 2,
          retry_policy: {
            max_attempts: 2,
            delay_minutes: 2,
            exponential_backoff: false,
            max_delay_minutes: 10,
            retry_on_failure_types: ['network']
          }
        },
        retention: {
          enabled: true,
          keep_daily: 7,
          keep_weekly: 4,
          keep_monthly: 3,
          keep_yearly: 1,
          max_backup_age_days: 90,
          max_backup_count: 200,
          auto_cleanup: true,
          storage_limit_gb: 100
        },
        compression: {
          enabled: true,
          algorithm: 'lz4',
          level: 3,
          parallel_compression: true,
          verify_integrity: true
        },
        encryption: {
          enabled: true,
          algorithm: 'aes256',
          key_derivation: 'pbkdf2',
          key_source: 'env_var',
          verify_signature: false
        },
        status: 'running',
        progress: {
          stage: 'backing_up',
          percentage: 67,
          current_file: '/uploads/debate_recordings/session_12345.webm',
          files_processed: 1234,
          files_total: 1845,
          bytes_processed: 456 * 1024 * 1024,
          bytes_total: 680 * 1024 * 1024,
          speed_mbps: 12.5,
          eta_minutes: 4,
          started_at: new Date(Date.now() - 8 * 60 * 1000)
        },
        history: [],
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 8 * 60 * 1000),
        last_run: new Date(Date.now() - 60 * 60 * 1000),
        next_run: new Date(Date.now() + 52 * 60 * 1000),
        created_by: 'admin'
      }
    ];

    // Mock maintenance windows
    const mockMaintenanceWindows: MaintenanceWindow[] = [
      {
        id: 'maint_1',
        name: 'Monthly System Updates',
        description: 'Apply security patches and system updates',
        type: 'routine',
        status: 'scheduled',
        impact_level: 'medium',
        affected_services: ['web_app', 'api', 'database'],
        start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        timezone: 'UTC',
        notification_settings: {
          enabled: true,
          advance_notice_hours: [72, 24, 1],
          notification_channels: ['email', 'dashboard', 'banner'],
          user_groups: ['all_users'],
          banner_enabled: true,
          email_enabled: true,
          sms_enabled: false
        },
        tasks: [
          {
            id: 'task_1',
            name: 'Enable Maintenance Mode',
            description: 'Put system in maintenance mode',
            type: 'configuration',
            order: 1,
            estimated_duration_minutes: 2,
            status: 'pending',
            dependencies: []
          },
          {
            id: 'task_2',
            name: 'Apply Security Patches',
            description: 'Install OS and application security updates',
            type: 'deployment',
            order: 2,
            estimated_duration_minutes: 45,
            status: 'pending',
            dependencies: ['task_1']
          },
          {
            id: 'task_3',
            name: 'Database Migration',
            description: 'Run pending database migrations',
            type: 'database',
            order: 3,
            estimated_duration_minutes: 15,
            status: 'pending',
            dependencies: ['task_2']
          },
          {
            id: 'task_4',
            name: 'Service Restart',
            description: 'Restart all application services',
            type: 'service_restart',
            order: 4,
            estimated_duration_minutes: 5,
            status: 'pending',
            dependencies: ['task_3']
          },
          {
            id: 'task_5',
            name: 'Disable Maintenance Mode',
            description: 'Return system to normal operation',
            type: 'configuration',
            order: 5,
            estimated_duration_minutes: 2,
            status: 'pending',
            dependencies: ['task_4']
          }
        ],
        created_by: 'admin',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'maint_2',
        name: 'Emergency Database Repair',
        description: 'Fix critical database corruption issues',
        type: 'emergency',
        status: 'completed',
        impact_level: 'critical',
        affected_services: ['database', 'api', 'web_app', 'mobile_app'],
        start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        timezone: 'UTC',
        notification_settings: {
          enabled: true,
          advance_notice_hours: [0], // Emergency
          notification_channels: ['email', 'sms', 'dashboard', 'banner'],
          user_groups: ['all_users'],
          banner_enabled: true,
          email_enabled: true,
          sms_enabled: true,
          custom_message: 'Emergency maintenance in progress to resolve database issues.'
        },
        tasks: [
          {
            id: 'task_e1',
            name: 'Emergency Maintenance Mode',
            description: 'Immediately put system in maintenance mode',
            type: 'configuration',
            order: 1,
            estimated_duration_minutes: 1,
            status: 'completed',
            started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 1000),
            dependencies: []
          },
          {
            id: 'task_e2',
            name: 'Database Corruption Repair',
            description: 'Run database repair and consistency checks',
            type: 'database',
            order: 2,
            estimated_duration_minutes: 40,
            status: 'completed',
            started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 1000),
            completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 41 * 60 * 1000),
            dependencies: ['task_e1']
          },
          {
            id: 'task_e3',
            name: 'System Recovery',
            description: 'Restore normal system operation',
            type: 'service_restart',
            order: 3,
            estimated_duration_minutes: 4,
            status: 'completed',
            started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 41 * 60 * 1000),
            completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
            dependencies: ['task_e2']
          }
        ],
        created_by: 'system',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000)
      }
    ];

    // Mock integrity checks
    const mockIntegrityChecks: IntegrityCheck[] = [
      {
        id: 'check_1',
        name: 'Database Consistency Check',
        description: 'Verify database foreign key constraints and data consistency',
        type: 'database',
        target: {
          type: 'database_table',
          identifiers: ['users', 'debates', 'sessions', 'enrollments'],
          inclusion_patterns: ['*'],
          exclusion_patterns: ['temp_*', 'cache_*']
        },
        schedule: {
          enabled: true,
          frequency: 'daily',
          cron_expression: '0 3 * * *',
          timezone: 'UTC'
        },
        thresholds: {
          error_threshold: 0,
          warning_threshold: 10,
          performance_threshold_ms: 30000
        },
        status: 'completed',
        last_run: new Date(Date.now() - 3 * 60 * 60 * 1000),
        next_run: new Date(Date.now() + 21 * 60 * 60 * 1000),
        results: [
          {
            id: 'result_1',
            check_id: 'check_1',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
            status: 'passed',
            score: 98,
            issues_found: [
              {
                type: 'orphaned_record',
                severity: 'low',
                message: '3 orphaned session records found',
                location: 'sessions table',
                recommended_action: 'Clean up orphaned records during maintenance',
                auto_repairable: true
              }
            ],
            repairs_applied: [],
            duration_ms: 12456,
            details: {
              tables_checked: 4,
              records_scanned: 1234567,
              constraints_verified: 45
            }
          }
        ],
        auto_repair: false,
        notification_settings: {
          on_failure: true,
          on_warning: false,
          on_repair: true,
          threshold_alerts: true,
          notification_channels: ['email', 'dashboard']
        },
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        id: 'check_2',
        name: 'File System Integrity',
        description: 'Check file system permissions and detect corrupted files',
        type: 'file_system',
        target: {
          type: 'file_path',
          identifiers: ['/app/uploads', '/app/data', '/app/config'],
          inclusion_patterns: ['**/*'],
          exclusion_patterns: ['**/*.tmp', '**/cache/**']
        },
        schedule: {
          enabled: true,
          frequency: 'weekly',
          cron_expression: '0 1 * * 0',
          timezone: 'UTC'
        },
        thresholds: {
          error_threshold: 5,
          warning_threshold: 20,
          performance_threshold_ms: 300000,
          size_threshold_bytes: 10 * 1024 * 1024 * 1024 // 10GB
        },
        status: 'scheduled',
        last_run: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        next_run: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        results: [
          {
            id: 'result_2',
            check_id: 'check_2',
            timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            status: 'warning',
            score: 85,
            issues_found: [
              {
                type: 'permission_issue',
                severity: 'medium',
                message: 'Incorrect permissions on 12 files',
                location: '/app/uploads/user_content/',
                recommended_action: 'Reset file permissions to 644',
                auto_repairable: true
              },
              {
                type: 'disk_space',
                severity: 'low',
                message: 'Upload directory is 78% full',
                location: '/app/uploads',
                recommended_action: 'Monitor disk usage and clean up old files',
                auto_repairable: false
              }
            ],
            repairs_applied: [
              {
                issue_id: 'perm_001',
                action: 'chmod 644',
                status: 'succeeded',
                timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
                details: 'Fixed permissions on 12 files'
              }
            ],
            duration_ms: 45620,
            details: {
              files_checked: 15432,
              directories_checked: 245,
              total_size_bytes: 8.2 * 1024 * 1024 * 1024
            }
          }
        ],
        auto_repair: true,
        notification_settings: {
          on_failure: true,
          on_warning: true,
          on_repair: true,
          threshold_alerts: true,
          notification_channels: ['email', 'dashboard']
        },
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      }
    ];

    // Mock system health
    const mockSystemHealth: SystemHealth = {
      overall_status: 'healthy',
      last_updated: new Date(),
      uptime_percentage: 99.8,
      backup_status: {
        last_successful_backup: new Date(Date.now() - 6 * 60 * 60 * 1000),
        failed_backups_24h: 0,
        average_backup_duration_minutes: 28,
        storage_usage_gb: 156.7,
        next_scheduled_backup: new Date(Date.now() + 18 * 60 * 60 * 1000)
      },
      maintenance_status: {
        maintenance_mode: false,
        upcoming_maintenance: mockMaintenanceWindows.filter(m => m.status === 'scheduled'),
        overdue_maintenance: 0,
        average_maintenance_duration_hours: 1.2
      },
      integrity_status: {
        issues_detected: 3,
        critical_issues: 0,
        last_integrity_check: new Date(Date.now() - 3 * 60 * 60 * 1000),
        auto_repairs_applied_24h: 1,
        integrity_score: 98
      },
      storage_usage: {
        backup_storage_gb: 156.7,
        backup_storage_limit_gb: 500.0,
        database_size_gb: 8.4,
        file_storage_gb: 12.3,
        temp_storage_gb: 2.1,
        available_storage_gb: 245.8
      },
      performance_metrics: {
        backup_speed_mbps: 12.5,
        database_response_time_ms: 45,
        file_system_io_ops: 1250,
        memory_usage_percentage: 67,
        cpu_usage_percentage: 23
      }
    };

    setBackupJobs(mockBackupJobs);
    setMaintenanceWindows(mockMaintenanceWindows);
    setIntegrityChecks(mockIntegrityChecks);
    setSystemHealth(mockSystemHealth);
    setIsLoading(false);
  };

  const refreshSystemHealth = async () => {
    // Simulate system health refresh
    if (systemHealth) {
      setSystemHealth({
        ...systemHealth,
        last_updated: new Date(),
        performance_metrics: {
          ...systemHealth.performance_metrics,
          database_response_time_ms: Math.floor(Math.random() * 50) + 30,
          memory_usage_percentage: Math.floor(Math.random() * 20) + 60,
          cpu_usage_percentage: Math.floor(Math.random() * 30) + 15
        }
      });
    }
  };

  const runBackup = (backupId: string) => {
    if (!canManageBackups) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to run backups.'
      });
      return;
    }

    setBackupJobs(prev => prev.map(job =>
      job.id === backupId
        ? {
            ...job,
            status: 'running',
            progress: {
              stage: 'preparing',
              percentage: 0,
              files_processed: 0,
              files_total: 1000,
              bytes_processed: 0,
              bytes_total: 1000 * 1024 * 1024,
              speed_mbps: 0,
              eta_minutes: 0,
              started_at: new Date()
            }
          }
        : job
    ));

    addNotification({
      type: 'info',
      title: 'Backup Started',
      message: 'Backup job has been started and is now running.'
    });

    // Simulate backup progress
    const progressInterval = setInterval(() => {
      setBackupJobs(prev => prev.map(job => {
        if (job.id === backupId && job.progress) {
          const newPercentage = Math.min(job.progress.percentage + 10, 100);
          if (newPercentage === 100) {
            clearInterval(progressInterval);
            return {
              ...job,
              status: 'completed',
              progress: undefined,
              last_run: new Date()
            };
          }
          return {
            ...job,
            progress: {
              ...job.progress,
              percentage: newPercentage,
              stage: newPercentage > 80 ? 'verifying' : newPercentage > 60 ? 'uploading' : 'backing_up',
              files_processed: Math.floor((newPercentage / 100) * job.progress.files_total),
              bytes_processed: Math.floor((newPercentage / 100) * job.progress.bytes_total),
              speed_mbps: 10 + Math.random() * 5,
              eta_minutes: Math.ceil((100 - newPercentage) / 10)
            }
          };
        }
        return job;
      }));
    }, 2000);
  };

  const runIntegrityCheck = (checkId: string) => {
    if (!canRunIntegrityChecks) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to run integrity checks.'
      });
      return;
    }

    setIntegrityChecks(prev => prev.map(check =>
      check.id === checkId
        ? { ...check, status: 'running' }
        : check
    ));

    addNotification({
      type: 'info',
      title: 'Integrity Check Started',
      message: 'Integrity check is now running and will complete shortly.'
    });

    // Simulate check completion
    setTimeout(() => {
      setIntegrityChecks(prev => prev.map(check => {
        if (check.id === checkId) {
          return {
            ...check,
            status: 'completed',
            last_run: new Date(),
            next_run: new Date(Date.now() + 24 * 60 * 60 * 1000)
          };
        }
        return check;
      }));

      addNotification({
        type: 'success',
        title: 'Integrity Check Complete',
        message: 'Integrity check completed successfully with no critical issues found.'
      });
    }, 3000);
  };

  const enableMaintenanceMode = () => {
    if (!canScheduleMaintenance) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to enable maintenance mode.'
      });
      return;
    }

    if (systemHealth) {
      setSystemHealth({
        ...systemHealth,
        overall_status: 'maintenance',
        maintenance_status: {
          ...systemHealth.maintenance_status,
          maintenance_mode: true
        }
      });
    }

    addNotification({
      type: 'warning',
      title: 'Maintenance Mode Enabled',
      message: 'System is now in maintenance mode. Users will see a maintenance page.'
    });
  };

  const disableMaintenanceMode = () => {
    if (!canScheduleMaintenance) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to disable maintenance mode.'
      });
      return;
    }

    if (systemHealth) {
      setSystemHealth({
        ...systemHealth,
        overall_status: 'healthy',
        maintenance_status: {
          ...systemHealth.maintenance_status,
          maintenance_mode: false
        }
      });
    }

    addNotification({
      type: 'success',
      title: 'Maintenance Mode Disabled',
      message: 'System has returned to normal operation.'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'healthy':
      case 'passed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'running':
      case 'active':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed':
      case 'error':
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'scheduled':
      case 'pending':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'passed':
        return CheckCircle2;
      case 'running':
      case 'active':
        return Activity;
      case 'warning':
        return AlertTriangle;
      case 'failed':
      case 'error':
        return XCircle;
      case 'scheduled':
      case 'pending':
        return Clock;
      default:
        return Info;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Backup & Maintenance Tools
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage system backups, maintenance windows, and data integrity checks
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={refreshSystemHealth}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          {canScheduleMaintenance && systemHealth?.maintenance_status.maintenance_mode ? (
            <Button variant="outline" onClick={disableMaintenanceMode}>
              <Play className="h-4 w-4 mr-2" />
              Disable Maintenance
            </Button>
          ) : (
            canScheduleMaintenance && (
              <Button variant="outline" onClick={() => setShowMaintenanceModeDialog(true)}>
                <Pause className="h-4 w-4 mr-2" />
                Maintenance Mode
              </Button>
            )
          )}
        </div>
      </div>

      {/* System Health Overview */}
      {canViewSystemHealth && systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${getStatusColor(systemHealth.overall_status)}`}>
                {React.createElement(getStatusIcon(systemHealth.overall_status), { className: 'h-5 w-5' })}
              </div>
              <span>System Health Overview</span>
              <Badge className={
                systemHealth.overall_status === 'healthy' ? 'bg-green-500' :
                systemHealth.overall_status === 'warning' ? 'bg-yellow-500' :
                systemHealth.overall_status === 'critical' ? 'bg-red-500' : 'bg-blue-500'
              }>
                {systemHealth.overall_status.charAt(0).toUpperCase() + systemHealth.overall_status.slice(1)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Backup Status */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  Backup Status
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Backup:</span>
                    <span className="font-medium">
                      {systemHealth.backup_status.last_successful_backup.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storage Used:</span>
                    <span className="font-medium">
                      {systemHealth.backup_status.storage_usage_gb.toFixed(1)} GB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Failures (24h):</span>
                    <span className="font-medium text-red-600">
                      {systemHealth.backup_status.failed_backups_24h}
                    </span>
                  </div>
                </div>
              </div>

              {/* Maintenance Status */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center">
                  <Wrench className="h-4 w-4 mr-2" />
                  Maintenance
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <Badge variant={systemHealth.maintenance_status.maintenance_mode ? 'destructive' : 'outline'}>
                      {systemHealth.maintenance_status.maintenance_mode ? 'Active' : 'Normal'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upcoming:</span>
                    <span className="font-medium">
                      {systemHealth.maintenance_status.upcoming_maintenance.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overdue:</span>
                    <span className="font-medium text-yellow-600">
                      {systemHealth.maintenance_status.overdue_maintenance}
                    </span>
                  </div>
                </div>
              </div>

              {/* Integrity Status */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Data Integrity
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Score:</span>
                    <span className="font-medium text-green-600">
                      {systemHealth.integrity_status.integrity_score}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issues:</span>
                    <span className="font-medium">
                      {systemHealth.integrity_status.issues_detected}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Repairs (24h):</span>
                    <span className="font-medium text-blue-600">
                      {systemHealth.integrity_status.auto_repairs_applied_24h}
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage Usage */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center">
                  <HardDrive className="h-4 w-4 mr-2" />
                  Storage Usage
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Backup Storage</span>
                      <span>{systemHealth.storage_usage.backup_storage_gb.toFixed(1)} / {systemHealth.storage_usage.backup_storage_limit_gb.toFixed(0)} GB</span>
                    </div>
                    <Progress 
                      value={(systemHealth.storage_usage.backup_storage_gb / systemHealth.storage_usage.backup_storage_limit_gb) * 100} 
                      className="h-2" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Database: {systemHealth.storage_usage.database_size_gb.toFixed(1)} GB</div>
                    <div>Files: {systemHealth.storage_usage.file_storage_gb.toFixed(1)} GB</div>
                    <div>Temp: {systemHealth.storage_usage.temp_storage_gb.toFixed(1)} GB</div>
                    <div>Available: {systemHealth.storage_usage.available_storage_gb.toFixed(1)} GB</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backups">Backups ({backupJobs.length})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({maintenanceWindows.length})</TabsTrigger>
          <TabsTrigger value="integrity">Integrity Checks ({integrityChecks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold">Backup Jobs</h4>
              <p className="text-sm text-muted-foreground">
                Automated backup schedules and manual backup operations
              </p>
            </div>
            {canManageBackups && (
              <Button onClick={() => setShowBackupDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Backup Job
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {backupJobs.map((backup) => {
              const StatusIcon = getStatusIcon(backup.status);
              
              return (
                <Card key={backup.id} className="transition-all hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getStatusColor(backup.status)}`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{backup.name}</h3>
                            <Badge variant="outline" className="capitalize">
                              {backup.type}
                            </Badge>
                            <Badge className={
                              backup.status === 'completed' ? 'bg-green-500' :
                              backup.status === 'running' ? 'bg-blue-500' :
                              backup.status === 'failed' ? 'bg-red-500' :
                              backup.status === 'scheduled' ? 'bg-gray-500' : 'bg-yellow-500'
                            }>
                              {backup.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{backup.description}</p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                            <span>Schedule: {backup.schedule.frequency}</span>
                            <span>Destination: {backup.destination.type.toUpperCase()}</span>
                            {backup.last_run && <span>Last run: {backup.last_run.toLocaleString()}</span>}
                            {backup.next_run && <span>Next run: {backup.next_run.toLocaleString()}</span>}
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canManageBackups && backup.status !== 'running' && (
                            <DropdownMenuItem onClick={() => runBackup(backup.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Run Now
                            </DropdownMenuItem>
                          )}
                          {canManageBackups && backup.status === 'running' && (
                            <DropdownMenuItem>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Job
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setSelectedBackup(backup)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {canManageBackups && (
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Job
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download Latest
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate Job
                          </DropdownMenuItem>
                          {canManageBackups && (
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Job
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Progress Bar for Running Backups */}
                    {backup.progress && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">
                            {backup.progress.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className="text-sm text-blue-700">
                            {backup.progress.percentage}%
                          </span>
                        </div>
                        <Progress value={backup.progress.percentage} className="mb-2" />
                        <div className="grid gap-2 md:grid-cols-4 text-xs text-blue-700">
                          <div>Files: {backup.progress.files_processed.toLocaleString()} / {backup.progress.files_total.toLocaleString()}</div>
                          <div>Data: {(backup.progress.bytes_processed / (1024 * 1024)).toFixed(1)} / {(backup.progress.bytes_total / (1024 * 1024)).toFixed(1)} MB</div>
                          <div>Speed: {backup.progress.speed_mbps.toFixed(1)} MB/s</div>
                          <div>ETA: {backup.progress.eta_minutes} min</div>
                        </div>
                        {backup.progress.current_file && (
                          <div className="text-xs text-blue-600 mt-1 truncate">
                            Processing: {backup.progress.current_file}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Backup Configuration Summary */}
                    <div className="grid gap-4 md:grid-cols-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {backup.retention.keep_daily}
                        </div>
                        <div className="text-xs text-muted-foreground">Daily Backups</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {backup.compression.enabled ? backup.compression.algorithm.toUpperCase() : 'None'}
                        </div>
                        <div className="text-xs text-muted-foreground">Compression</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {backup.encryption.enabled ? '🔒 Yes' : '🔓 No'}
                        </div>
                        <div className="text-xs text-muted-foreground">Encryption</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {backup.history.length > 0 ? 
                            `${(backup.history[0].size_bytes / (1024 * 1024 * 1024)).toFixed(1)} GB` : 
                            'N/A'
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">Last Size</div>
                      </div>
                    </div>

                    {/* Recent History */}
                    {backup.history.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-2">Recent History</h4>
                        <div className="space-y-2">
                          {backup.history.slice(0, 3).map((history) => (
                            <div key={history.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                {React.createElement(getStatusIcon(history.status), { 
                                  className: `h-3 w-3 ${
                                    history.status === 'completed' ? 'text-green-600' : 
                                    history.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                                  }` 
                                })}
                                <span>{history.started_at.toLocaleDateString()}</span>
                                <span className="text-muted-foreground">•</span>
                                <span>{(history.size_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
                                {history.duration_minutes && (
                                  <>
                                    <span className="text-muted-foreground">•</span>
                                    <span>{history.duration_minutes} min</span>
                                  </>
                                )}
                              </div>
                              {history.verification_status && (
                                <Badge variant={history.verification_status === 'passed' ? 'outline' : 'destructive'} className="text-xs">
                                  {history.verification_status}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-xs text-muted-foreground">
                        Created {backup.created_at.toLocaleDateString()}
                        {backup.updated_at && <span> • Updated {backup.updated_at.toLocaleDateString()}</span>}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {canManageBackups && backup.status !== 'running' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => runBackup(backup.id)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Run Now
                          </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedBackup(backup)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                        
                        {backup.history.length > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold">Maintenance Windows</h4>
              <p className="text-sm text-muted-foreground">
                Schedule and manage system maintenance activities
              </p>
            </div>
            {canScheduleMaintenance && (
              <Button onClick={() => setShowMaintenanceDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Maintenance
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {maintenanceWindows.map((maintenance) => {
              const StatusIcon = getStatusIcon(maintenance.status);
              
              return (
                <Card key={maintenance.id} className="transition-all hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getStatusColor(maintenance.status)}`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{maintenance.name}</h3>
                            <Badge variant="outline" className="capitalize">
                              {maintenance.type.replace('_', ' ')}
                            </Badge>
                            <Badge className={
                              maintenance.status === 'completed' ? 'bg-green-500' :
                              maintenance.status === 'active' ? 'bg-blue-500' :
                              maintenance.status === 'cancelled' ? 'bg-red-500' :
                              maintenance.status === 'scheduled' ? 'bg-gray-500' : 'bg-yellow-500'
                            }>
                              {maintenance.status}
                            </Badge>
                            <Badge className={
                              maintenance.impact_level === 'critical' ? 'bg-red-500' :
                              maintenance.impact_level === 'high' ? 'bg-orange-500' :
                              maintenance.impact_level === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                            }>
                              {maintenance.impact_level} impact
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{maintenance.description}</p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                            <span>Start: {maintenance.start_time.toLocaleString()}</span>
                            <span>End: {maintenance.end_time.toLocaleString()}</span>
                            <span>Duration: {Math.round((maintenance.end_time.getTime() - maintenance.start_time.getTime()) / (1000 * 60))} min</span>
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedMaintenance(maintenance)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {canScheduleMaintenance && maintenance.status === 'scheduled' && (
                            <>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Schedule
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Play className="h-4 w-4 mr-2" />
                                Start Now
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Maintenance
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Affected Services */}
                    <div className="mb-4">
                      <Label className="text-xs text-muted-foreground">Affected Services</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {maintenance.affected_services.map((service) => (
                          <Badge key={service} variant="outline" className="text-xs">
                            {service.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Maintenance Tasks */}
                    <div className="mb-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Maintenance Tasks ({maintenance.tasks.length})
                      </Label>
                      <div className="space-y-2">
                        {maintenance.tasks.slice(0, 3).map((task) => {
                          const TaskIcon = getStatusIcon(task.status);
                          return (
                            <div key={task.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                              <div className="flex items-center space-x-2">
                                <TaskIcon className={`h-3 w-3 ${
                                  task.status === 'completed' ? 'text-green-600' :
                                  task.status === 'running' ? 'text-blue-600' :
                                  task.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                                }`} />
                                <span className="font-medium">{task.name}</span>
                                <span className="text-muted-foreground">({task.estimated_duration_minutes} min)</span>
                              </div>
                              <Badge variant={
                                task.status === 'completed' ? 'default' :
                                task.status === 'running' ? 'secondary' :
                                task.status === 'failed' ? 'destructive' : 'outline'
                              } className="text-xs">
                                {task.status}
                              </Badge>
                            </div>
                          );
                        })}
                        {maintenance.tasks.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center py-1">
                            +{maintenance.tasks.length - 3} more tasks
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="mb-4">
                      <Label className="text-xs text-muted-foreground">Notifications</Label>
                      <div className="flex items-center space-x-4 mt-1 text-xs">
                        {maintenance.notification_settings.advance_notice_hours.length > 0 && (
                          <span>Advance Notice: {maintenance.notification_settings.advance_notice_hours.join(', ')}h</span>
                        )}
                        <span>Channels: {maintenance.notification_settings.notification_channels.join(', ')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-xs text-muted-foreground">
                        Created {maintenance.created_at.toLocaleDateString()}
                        • Updated {maintenance.updated_at.toLocaleDateString()}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedMaintenance(maintenance)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                        
                        {canScheduleMaintenance && maintenance.status === 'scheduled' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start Now
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="integrity" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold">Data Integrity Checks</h4>
              <p className="text-sm text-muted-foreground">
                Automated checks to ensure data consistency and system health
              </p>
            </div>
            {canRunIntegrityChecks && (
              <Button onClick={() => setShowIntegrityDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Check
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {integrityChecks.map((check) => {
              const StatusIcon = getStatusIcon(check.status);
              
              return (
                <Card key={check.id} className="transition-all hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getStatusColor(check.status)}`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{check.name}</h3>
                            <Badge variant="outline" className="capitalize">
                              {check.type.replace('_', ' ')}
                            </Badge>
                            <Badge className={
                              check.status === 'completed' ? 'bg-green-500' :
                              check.status === 'running' ? 'bg-blue-500' :
                              check.status === 'failed' ? 'bg-red-500' :
                              check.status === 'scheduled' ? 'bg-gray-500' : 'bg-yellow-500'
                            }>
                              {check.status}
                            </Badge>
                            {check.auto_repair && (
                              <Badge variant="outline" className="text-xs">
                                Auto Repair
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{check.description}</p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                            <span>Schedule: {check.schedule.frequency}</span>
                            {check.last_run && <span>Last run: {check.last_run.toLocaleString()}</span>}
                            {check.next_run && <span>Next run: {check.next_run.toLocaleString()}</span>}
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canRunIntegrityChecks && check.status !== 'running' && (
                            <DropdownMenuItem onClick={() => runIntegrityCheck(check.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Run Now
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setSelectedIntegrityCheck(check)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Results
                          </DropdownMenuItem>
                          {canRunIntegrityChecks && (
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Check
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Export Results
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {canRunIntegrityChecks && (
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Check
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Latest Results */}
                    {check.results.length > 0 && (
                      <div className="mb-4">
                        <Label className="text-xs text-muted-foreground mb-2 block">Latest Results</Label>
                        {check.results.slice(0, 1).map((result) => {
                          const ResultIcon = getStatusIcon(result.status);
                          return (
                            <div key={result.id} className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <ResultIcon className="h-4 w-4" />
                                  <span className="font-medium capitalize">{result.status}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Score: {result.score}%
                                  </Badge>
                                </div>
                                <span className="text-xs">
                                  {result.timestamp.toLocaleString()}
                                </span>
                              </div>
                              
                              {result.issues_found.length > 0 && (
                                <div className="space-y-1">
                                  <Label className="text-xs">Issues Found ({result.issues_found.length})</Label>
                                  {result.issues_found.slice(0, 2).map((issue, idx) => (
                                    <div key={idx} className="text-xs bg-background/50 p-2 rounded">
                                      <div className="flex items-center space-x-2">
                                        <Badge variant={
                                          issue.severity === 'critical' ? 'destructive' :
                                          issue.severity === 'high' ? 'destructive' :
                                          issue.severity === 'medium' ? 'default' : 'secondary'
                                        } className="text-xs">
                                          {issue.severity}
                                        </Badge>
                                        <span className="font-medium">{issue.type}</span>
                                        {issue.auto_repairable && <Badge variant="outline" className="text-xs">Auto-fix</Badge>}
                                      </div>
                                      <p className="mt-1 text-muted-foreground">{issue.message}</p>
                                    </div>
                                  ))}
                                  {result.issues_found.length > 2 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{result.issues_found.length - 2} more issues
                                    </p>
                                  )}
                                </div>
                              )}

                              {result.repairs_applied.length > 0 && (
                                <div className="mt-2">
                                  <Label className="text-xs">Auto-repairs Applied ({result.repairs_applied.length})</Label>
                                  {result.repairs_applied.slice(0, 2).map((repair, idx) => (
                                    <div key={idx} className="text-xs bg-background/50 p-2 rounded mt-1">
                                      <div className="flex items-center space-x-2">
                                        {React.createElement(getStatusIcon(repair.status), { className: 'h-3 w-3' })}
                                        <span className="font-medium">{repair.action}</span>
                                        <Badge variant={repair.status === 'succeeded' ? 'default' : 'destructive'} className="text-xs">
                                          {repair.status}
                                        </Badge>
                                      </div>
                                      {repair.details && (
                                        <p className="mt-1 text-muted-foreground">{repair.details}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Check Configuration */}
                    <div className="grid gap-4 md:grid-cols-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {check.thresholds.error_threshold}
                        </div>
                        <div className="text-xs text-muted-foreground">Error Threshold</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {check.thresholds.warning_threshold}
                        </div>
                        <div className="text-xs text-muted-foreground">Warning Threshold</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {check.schedule.frequency}
                        </div>
                        <div className="text-xs text-muted-foreground">Frequency</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {check.results.length > 0 ? `${check.results[0].score}%` : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Latest Score</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-xs text-muted-foreground">
                        Created {check.created_at.toLocaleDateString()}
                        • Updated {check.updated_at.toLocaleDateString()}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {canRunIntegrityChecks && check.status !== 'running' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => runIntegrityCheck(check.id)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Run Check
                          </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedIntegrityCheck(check)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Results
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Maintenance Mode Dialog */}
      <AlertDialog open={showMaintenanceModeDialog} onOpenChange={setShowMaintenanceModeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Maintenance Mode</AlertDialogTitle>
            <AlertDialogDescription>
              This will put the system in maintenance mode, displaying a maintenance page to all users. 
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              enableMaintenanceMode();
              setShowMaintenanceModeDialog(false);
            }}>
              Enable Maintenance Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Backup Creation Dialog */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Backup Job</DialogTitle>
            <DialogDescription>
              Configure a new automated backup job
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-12">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Backup Configuration</h3>
            <p className="text-muted-foreground">
              Backup job configuration wizard would be implemented here
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
              Cancel
            </Button>
            <Button>Create Backup Job</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
