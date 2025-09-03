/**
 * Data Export System Component
 * 
 * Task 8.5.3: Multi-format data export with bulk capabilities,
 * privacy controls, and custom query builder
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
  Download,
  Upload,
  FileText,
  Database,
  Settings,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  Shield,
  Lock,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Lightbulb,
  Zap,
  RefreshCw,
  Play,
  Pause,
  Square,
  SkipForward,
  Rewind,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Copy,
  Share2,
  Archive,
  Bookmark,
  Tag,
  Flag,
  ExternalLink,
  Target,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Mail,
  Bell,
  Save
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface ExportJob {
  id: string;
  name: string;
  description: string;
  type: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  configuration: ExportConfiguration;
  data_source: ExportDataSource;
  filters: ExportFilter[];
  privacy_settings: PrivacySettings;
  schedule?: ExportSchedule;
  metadata: ExportMetadata;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  started_at?: Date;
  completed_at?: Date;
  expires_at?: Date;
  download_url?: string;
  file_path?: string;
  error_message?: string;
}

type ExportType = 'one_time' | 'scheduled' | 'bulk' | 'custom_query' | 'template_based';
type ExportFormat = 'csv' | 'excel' | 'json' | 'xml' | 'pdf' | 'sql' | 'parquet' | 'avro';
type ExportStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'expired';

interface ExportConfiguration {
  include_headers: boolean;
  date_format: 'iso' | 'us' | 'eu' | 'custom';
  time_format: '12h' | '24h';
  timezone: string;
  encoding: 'utf8' | 'utf16' | 'ascii' | 'latin1';
  delimiter?: string;
  quote_character?: string;
  escape_character?: string;
  null_value: string;
  boolean_format: 'true_false' | '1_0' | 'yes_no';
  number_format: NumberFormat;
  compression: 'none' | 'gzip' | 'zip' | 'bz2';
  encryption: EncryptionSettings;
  chunking: ChunkingSettings;
  validation: ValidationSettings;
}

interface NumberFormat {
  decimal_places: number;
  thousand_separator: string;
  decimal_separator: string;
  currency_symbol?: string;
  percentage_format: boolean;
}

interface EncryptionSettings {
  enabled: boolean;
  algorithm: 'aes256' | 'aes128' | 'rsa';
  key_management: 'auto' | 'manual' | 'external';
  password_protected: boolean;
  certificate_based: boolean;
}

interface ChunkingSettings {
  enabled: boolean;
  max_rows_per_chunk: number;
  max_size_per_chunk: number; // MB
  naming_pattern: string;
}

interface ValidationSettings {
  enabled: boolean;
  checksum_verification: boolean;
  row_count_verification: boolean;
  schema_validation: boolean;
  data_quality_checks: boolean;
}

interface ExportDataSource {
  id: string;
  type: 'students' | 'classes' | 'debates' | 'sessions' | 'analytics' | 'users' | 'organizations' | 'audit_logs' | 'system_metrics';
  name: string;
  description: string;
  table_name?: string;
  view_name?: string;
  custom_query?: string;
  fields: ExportField[];
  relationships: DataRelationship[];
  access_requirements: AccessRequirement[];
  last_updated: Date;
  record_count: number;
  data_freshness: Date;
}

interface ExportField {
  id: string;
  name: string;
  display_name: string;
  type: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'json' | 'binary';
  description: string;
  required: boolean;
  sensitive: boolean;
  personally_identifiable: boolean;
  exportable: boolean;
  aggregatable: boolean;
  transformation?: FieldTransformation;
  validation?: FieldValidation;
}

interface FieldTransformation {
  type: 'none' | 'hash' | 'encrypt' | 'anonymize' | 'mask' | 'tokenize' | 'aggregate';
  parameters?: Record<string, any>;
  preserve_format: boolean;
}

interface FieldValidation {
  required: boolean;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  allowed_values?: any[];
  data_type_validation: boolean;
}

interface DataRelationship {
  target_source: string;
  relationship_type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  join_condition: string;
  include_related: boolean;
  related_fields: string[];
}

interface AccessRequirement {
  permission: string;
  role: string;
  organization_scope: boolean;
  approval_required: boolean;
  audit_trail: boolean;
}

interface ExportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'between' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value: any;
  value_to?: any; // for between operator
  case_sensitive: boolean;
  display_name: string;
  description: string;
}

interface PrivacySettings {
  anonymize_personal_data: boolean;
  exclude_sensitive_fields: boolean;
  data_masking: DataMaskingSettings;
  access_logging: boolean;
  retention_period: number; // days
  automatic_deletion: boolean;
  gdpr_compliant: boolean;
  ferpa_compliant: boolean;
  hipaa_compliant: boolean;
  custom_privacy_rules: PrivacyRule[];
}

interface DataMaskingSettings {
  enabled: boolean;
  mask_emails: boolean;
  mask_phone_numbers: boolean;
  mask_addresses: boolean;
  mask_names: boolean;
  mask_ids: boolean;
  mask_pattern: string;
  preserve_format: boolean;
  consistent_masking: boolean;
}

interface PrivacyRule {
  field: string;
  rule_type: 'mask' | 'exclude' | 'hash' | 'encrypt' | 'tokenize';
  parameters: Record<string, any>;
  conditions: PrivacyCondition[];
  priority: number;
}

interface PrivacyCondition {
  field: string;
  operator: string;
  value: any;
}

interface ExportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  interval: number;
  day_of_week?: number;
  day_of_month?: number;
  time: string;
  timezone: string;
  last_run?: Date;
  next_run?: Date;
  max_executions?: number;
  execution_count: number;
  failure_handling: FailureHandling;
}

interface FailureHandling {
  retry_count: number;
  retry_delay: number; // minutes
  notify_on_failure: boolean;
  fallback_action: 'skip' | 'retry_later' | 'manual_intervention';
  escalation_threshold: number;
}

interface ExportMetadata {
  total_records: number;
  exported_records: number;
  filtered_records: number;
  skipped_records: number;
  error_records: number;
  file_size: number; // bytes
  compression_ratio?: number;
  execution_time: number; // seconds
  memory_usage: number; // MB
  cpu_usage: number; // percentage
  query_execution_time: number; // seconds
  data_transfer_time: number; // seconds
  checksum?: string;
  schema_version: string;
  export_version: string;
}

interface CustomQuery {
  id: string;
  name: string;
  description: string;
  sql_query: string;
  parameters: QueryParameter[];
  validation_rules: QueryValidation[];
  security_level: 'low' | 'medium' | 'high' | 'restricted';
  created_by: string;
  created_at: Date;
  last_modified: Date;
  usage_count: number;
  approved: boolean;
  approved_by?: string;
  approved_at?: Date;
}

interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  default_value?: any;
  allowed_values?: any[];
  validation_pattern?: string;
  description: string;
}

interface QueryValidation {
  rule_type: 'syntax' | 'permissions' | 'resource_limits' | 'data_access' | 'privacy';
  rule_description: string;
  severity: 'error' | 'warning' | 'info';
  automated: boolean;
}

interface BulkExportJob {
  id: string;
  name: string;
  description: string;
  data_sources: string[];
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  individual_jobs: string[];
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  estimated_completion?: Date;
  progress_percentage: number;
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  configuration: ExportConfiguration;
  data_source: ExportDataSource;
  filters: ExportFilter[];
  privacy_settings: PrivacySettings;
  usage_count: number;
  rating: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  is_public: boolean;
  tags: string[];
}

interface DataExportSystemProps {
  organizationId?: string;
  canExportData?: boolean;
  canCreateCustomQueries?: boolean;
  canScheduleExports?: boolean;
  defaultFormat?: ExportFormat;
}

export function DataExportSystem({
  organizationId,
  canExportData = true,
  canCreateCustomQueries = false,
  canScheduleExports = false,
  defaultFormat = 'csv'
}: DataExportSystemProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('exports');
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [bulkJobs, setBulkJobs] = useState<BulkExportJob[]>([]);
  const [customQueries, setCustomQueries] = useState<CustomQuery[]>([]);
  const [exportTemplates, setExportTemplates] = useState<ExportTemplate[]>([]);
  const [dataSources, setDataSources] = useState<ExportDataSource[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExportStatus | 'all'>('all');
  const [formatFilter, setFormatFilter] = useState<ExportFormat | 'all'>('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQueryBuilderDialog, setShowQueryBuilderDialog] = useState(false);
  const [showBulkExportDialog, setShowBulkExportDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Export creation state
  const [newExportJob, setNewExportJob] = useState<Partial<ExportJob> | null>(null);
  const [selectedDataSource, setSelectedDataSource] = useState<ExportDataSource | null>(null);
  const [selectedJob, setSelectedJob] = useState<ExportJob | null>(null);
  const [customQueryBuilder, setCustomQueryBuilder] = useState<Partial<CustomQuery> | null>(null);
  
  const exportIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadExportData();
    startPolling();
    
    return () => stopPolling();
  }, []);

  const loadExportData = async () => {
    setIsLoading(true);
    
    // Mock data sources
    const mockDataSources: ExportDataSource[] = [
      {
        id: 'students',
        type: 'students',
        name: 'Student Data',
        description: 'Student profiles, performance metrics, and academic records',
        table_name: 'students',
        fields: [
          {
            id: 'id',
            name: 'id',
            display_name: 'Student ID',
            type: 'string',
            description: 'Unique student identifier',
            required: true,
            sensitive: false,
            personally_identifiable: true,
            exportable: true,
            aggregatable: false
          },
          {
            id: 'name',
            name: 'full_name',
            display_name: 'Full Name',
            type: 'string',
            description: 'Student full name',
            required: true,
            sensitive: true,
            personally_identifiable: true,
            exportable: true,
            aggregatable: false,
            transformation: {
              type: 'mask',
              parameters: { pattern: '***' },
              preserve_format: false
            }
          },
          {
            id: 'email',
            name: 'email',
            display_name: 'Email Address',
            type: 'string',
            description: 'Student email address',
            required: false,
            sensitive: true,
            personally_identifiable: true,
            exportable: true,
            aggregatable: false,
            transformation: {
              type: 'hash',
              parameters: {},
              preserve_format: false
            }
          },
          {
            id: 'performance_score',
            name: 'avg_score',
            display_name: 'Average Performance Score',
            type: 'number',
            description: 'Average performance across all debates',
            required: false,
            sensitive: false,
            personally_identifiable: false,
            exportable: true,
            aggregatable: true
          }
        ],
        relationships: [
          {
            target_source: 'classes',
            relationship_type: 'many_to_many',
            join_condition: 'student_id = students.id',
            include_related: true,
            related_fields: ['class_name', 'enrollment_date']
          }
        ],
        access_requirements: [
          {
            permission: 'read_student_data',
            role: 'teacher',
            organization_scope: true,
            approval_required: false,
            audit_trail: true
          },
          {
            permission: 'export_student_pii',
            role: 'admin',
            organization_scope: true,
            approval_required: true,
            audit_trail: true
          }
        ],
        last_updated: new Date(),
        record_count: 1247,
        data_freshness: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'debates',
        type: 'debates',
        name: 'Debate Sessions',
        description: 'Debate session data, transcripts, and analytics',
        table_name: 'debate_sessions',
        fields: [
          {
            id: 'id',
            name: 'id',
            display_name: 'Session ID',
            type: 'string',
            description: 'Unique session identifier',
            required: true,
            sensitive: false,
            personally_identifiable: false,
            exportable: true,
            aggregatable: false
          },
          {
            id: 'topic',
            name: 'topic',
            display_name: 'Debate Topic',
            type: 'string',
            description: 'Topic of the debate session',
            required: true,
            sensitive: false,
            personally_identifiable: false,
            exportable: true,
            aggregatable: false
          },
          {
            id: 'created_at',
            name: 'created_at',
            display_name: 'Session Date',
            type: 'datetime',
            description: 'Date and time when session was created',
            required: true,
            sensitive: false,
            personally_identifiable: false,
            exportable: true,
            aggregatable: false
          },
          {
            id: 'transcript',
            name: 'transcript',
            display_name: 'Full Transcript',
            type: 'string',
            description: 'Complete debate session transcript',
            required: false,
            sensitive: true,
            personally_identifiable: true,
            exportable: true,
            aggregatable: false,
            transformation: {
              type: 'anonymize',
              parameters: { remove_names: true },
              preserve_format: true
            }
          }
        ],
        relationships: [],
        access_requirements: [
          {
            permission: 'read_debate_data',
            role: 'teacher',
            organization_scope: true,
            approval_required: false,
            audit_trail: true
          }
        ],
        last_updated: new Date(),
        record_count: 523,
        data_freshness: new Date(Date.now() - 30 * 60 * 1000)
      }
    ];

    // Mock export jobs
    const mockExportJobs: ExportJob[] = [
      {
        id: 'export_1',
        name: 'Student Performance Report',
        description: 'Weekly export of student performance metrics for analysis',
        type: 'scheduled',
        format: 'excel',
        status: 'completed',
        configuration: {
          include_headers: true,
          date_format: 'iso',
          time_format: '24h',
          timezone: 'America/New_York',
          encoding: 'utf8',
          delimiter: ',',
          null_value: 'NULL',
          boolean_format: 'true_false',
          number_format: {
            decimal_places: 2,
            thousand_separator: ',',
            decimal_separator: '.',
            percentage_format: false
          },
          compression: 'gzip',
          encryption: {
            enabled: true,
            algorithm: 'aes256',
            key_management: 'auto',
            password_protected: false,
            certificate_based: false
          },
          chunking: {
            enabled: false,
            max_rows_per_chunk: 10000,
            max_size_per_chunk: 50,
            naming_pattern: 'chunk_{index}'
          },
          validation: {
            enabled: true,
            checksum_verification: true,
            row_count_verification: true,
            schema_validation: true,
            data_quality_checks: true
          }
        },
        data_source: mockDataSources[0],
        filters: [
          {
            field: 'created_at',
            operator: 'greater_equal',
            value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            case_sensitive: false,
            display_name: 'Last 7 days',
            description: 'Include only records from the last week'
          }
        ],
        privacy_settings: {
          anonymize_personal_data: false,
          exclude_sensitive_fields: false,
          data_masking: {
            enabled: true,
            mask_emails: true,
            mask_phone_numbers: true,
            mask_addresses: true,
            mask_names: false,
            mask_ids: false,
            mask_pattern: '***',
            preserve_format: true,
            consistent_masking: true
          },
          access_logging: true,
          retention_period: 30,
          automatic_deletion: true,
          gdpr_compliant: true,
          ferpa_compliant: true,
          hipaa_compliant: false,
          custom_privacy_rules: []
        },
        schedule: {
          enabled: true,
          frequency: 'weekly',
          interval: 1,
          day_of_week: 1,
          time: '09:00',
          timezone: 'America/New_York',
          next_run: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          execution_count: 12,
          failure_handling: {
            retry_count: 3,
            retry_delay: 30,
            notify_on_failure: true,
            fallback_action: 'retry_later',
            escalation_threshold: 3
          }
        },
        metadata: {
          total_records: 1247,
          exported_records: 1247,
          filtered_records: 0,
          skipped_records: 0,
          error_records: 0,
          file_size: 2048576,
          compression_ratio: 0.75,
          execution_time: 12.5,
          memory_usage: 45.6,
          cpu_usage: 23.4,
          query_execution_time: 3.2,
          data_transfer_time: 8.1,
          checksum: 'abc123def456',
          schema_version: '1.0',
          export_version: '2.1.0'
        },
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        created_by: 'teacher_1',
        started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 12500),
        expires_at: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        download_url: '/api/exports/export_1/download',
        file_path: '/exports/student_performance_20240121.xlsx.gz'
      },
      {
        id: 'export_2',
        name: 'Debate Activity Analysis',
        description: 'Monthly export of debate session data for research purposes',
        type: 'one_time',
        format: 'json',
        status: 'running',
        configuration: {
          include_headers: true,
          date_format: 'iso',
          time_format: '24h',
          timezone: 'America/New_York',
          encoding: 'utf8',
          null_value: 'null',
          boolean_format: 'true_false',
          number_format: {
            decimal_places: 4,
            thousand_separator: '',
            decimal_separator: '.',
            percentage_format: false
          },
          compression: 'none',
          encryption: {
            enabled: false,
            algorithm: 'aes256',
            key_management: 'auto',
            password_protected: false,
            certificate_based: false
          },
          chunking: {
            enabled: false,
            max_rows_per_chunk: 10000,
            max_size_per_chunk: 50,
            naming_pattern: 'chunk_{index}'
          },
          validation: {
            enabled: true,
            checksum_verification: true,
            row_count_verification: true,
            schema_validation: true,
            data_quality_checks: false
          }
        },
        data_source: mockDataSources[1],
        filters: [],
        privacy_settings: {
          anonymize_personal_data: true,
          exclude_sensitive_fields: true,
          data_masking: {
            enabled: true,
            mask_emails: true,
            mask_phone_numbers: true,
            mask_addresses: true,
            mask_names: true,
            mask_ids: true,
            mask_pattern: '***',
            preserve_format: false,
            consistent_masking: true
          },
          access_logging: true,
          retention_period: 90,
          automatic_deletion: true,
          gdpr_compliant: true,
          ferpa_compliant: true,
          hipaa_compliant: false,
          custom_privacy_rules: []
        },
        metadata: {
          total_records: 523,
          exported_records: 312,
          filtered_records: 0,
          skipped_records: 0,
          error_records: 0,
          file_size: 0,
          execution_time: 0,
          memory_usage: 0,
          cpu_usage: 0,
          query_execution_time: 0,
          data_transfer_time: 0,
          schema_version: '1.0',
          export_version: '2.1.0'
        },
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 5 * 60 * 1000),
        created_by: 'teacher_2',
        started_at: new Date(Date.now() - 30 * 60 * 1000)
      }
    ];

    setDataSources(mockDataSources);
    setExportJobs(mockExportJobs);
    setIsLoading(false);
  };

  const startPolling = () => {
    exportIntervalRef.current = setInterval(() => {
      // Update running jobs
      setExportJobs(prev => prev.map(job => {
        if (job.status === 'running') {
          const progressIncrement = Math.random() * 10;
          const newExportedRecords = Math.min(
            job.metadata.total_records,
            job.metadata.exported_records + Math.floor(progressIncrement)
          );
          
          if (newExportedRecords >= job.metadata.total_records) {
            return {
              ...job,
              status: 'completed' as ExportStatus,
              completed_at: new Date(),
              download_url: `/api/exports/${job.id}/download`,
              metadata: {
                ...job.metadata,
                exported_records: job.metadata.total_records,
                file_size: Math.floor(Math.random() * 5000000) + 1000000,
                execution_time: (Date.now() - (job.started_at?.getTime() || Date.now())) / 1000
              }
            };
          }
          
          return {
            ...job,
            metadata: {
              ...job.metadata,
              exported_records: newExportedRecords
            }
          };
        }
        return job;
      }));
    }, 2000);
  };

  const stopPolling = () => {
    if (exportIntervalRef.current) {
      clearInterval(exportIntervalRef.current);
      exportIntervalRef.current = null;
    }
  };

  const createExport = async (exportData: Partial<ExportJob>) => {
    if (!canExportData) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to export data.'
      });
      return;
    }

    const newJob: ExportJob = {
      id: `export_${Date.now()}`,
      name: exportData.name || 'Untitled Export',
      description: exportData.description || '',
      type: exportData.type || 'one_time',
      format: exportData.format || defaultFormat,
      status: 'pending',
      configuration: exportData.configuration || {
        include_headers: true,
        date_format: 'iso',
        time_format: '24h',
        timezone: 'America/New_York',
        encoding: 'utf8',
        null_value: 'NULL',
        boolean_format: 'true_false',
        number_format: {
          decimal_places: 2,
          thousand_separator: ',',
          decimal_separator: '.',
          percentage_format: false
        },
        compression: 'none',
        encryption: {
          enabled: false,
          algorithm: 'aes256',
          key_management: 'auto',
          password_protected: false,
          certificate_based: false
        },
        chunking: {
          enabled: false,
          max_rows_per_chunk: 10000,
          max_size_per_chunk: 50,
          naming_pattern: 'chunk_{index}'
        },
        validation: {
          enabled: true,
          checksum_verification: true,
          row_count_verification: true,
          schema_validation: true,
          data_quality_checks: true
        }
      },
      data_source: exportData.data_source || dataSources[0],
      filters: exportData.filters || [],
      privacy_settings: exportData.privacy_settings || {
        anonymize_personal_data: false,
        exclude_sensitive_fields: false,
        data_masking: {
          enabled: false,
          mask_emails: false,
          mask_phone_numbers: false,
          mask_addresses: false,
          mask_names: false,
          mask_ids: false,
          mask_pattern: '***',
          preserve_format: true,
          consistent_masking: true
        },
        access_logging: true,
        retention_period: 30,
        automatic_deletion: true,
        gdpr_compliant: true,
        ferpa_compliant: true,
        hipaa_compliant: false,
        custom_privacy_rules: []
      },
      metadata: {
        total_records: exportData.data_source?.record_count || 0,
        exported_records: 0,
        filtered_records: 0,
        skipped_records: 0,
        error_records: 0,
        file_size: 0,
        execution_time: 0,
        memory_usage: 0,
        cpu_usage: 0,
        query_execution_time: 0,
        data_transfer_time: 0,
        schema_version: '1.0',
        export_version: '2.1.0'
      },
      created_at: new Date(),
      updated_at: new Date(),
      created_by: user?.id || 'unknown'
    };

    setExportJobs(prev => [newJob, ...prev]);
    setShowCreateDialog(false);
    setNewExportJob(null);

    addNotification({
      type: 'success',
      title: 'Export Created',
      message: `Export job "${newJob.name}" has been created and will start shortly.`
    });

    // Start export after a short delay
    setTimeout(() => {
      setExportJobs(prev => prev.map(job => 
        job.id === newJob.id ? { ...job, status: 'running' as ExportStatus, started_at: new Date() } : job
      ));
    }, 1000);
  };

  const cancelExport = (jobId: string) => {
    setExportJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, status: 'cancelled' as ExportStatus } : job
    ));

    addNotification({
      type: 'info',
      title: 'Export Cancelled',
      message: 'The export job has been cancelled.'
    });
  };

  const downloadExport = (job: ExportJob) => {
    if (!job.download_url) {
      addNotification({
        type: 'error',
        title: 'Download Unavailable',
        message: 'This export is not ready for download yet.'
      });
      return;
    }

    addNotification({
      type: 'success',
      title: 'Download Started',
      message: `Downloading ${job.name}...`
    });

    // Simulate download
    const link = document.createElement('a');
    link.href = job.download_url;
    link.download = `${job.name}.${job.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteExport = (jobId: string) => {
    setExportJobs(prev => prev.filter(job => job.id !== jobId));
    setShowDeleteDialog(false);
    setSelectedJob(null);

    addNotification({
      type: 'success',
      title: 'Export Deleted',
      message: 'The export job has been deleted.'
    });
  };

  const getStatusBadge = (status: ExportStatus) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'running': return <Badge className="bg-blue-500 animate-pulse">Running</Badge>;
      case 'pending': return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
      case 'expired': return <Badge variant="outline">Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'csv': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'excel': return <FileText className="h-4 w-4 text-green-600" />;
      case 'json': return <FileText className="h-4 w-4 text-purple-600" />;
      case 'xml': return <FileText className="h-4 w-4 text-orange-600" />;
      case 'pdf': return <FileText className="h-4 w-4 text-red-600" />;
      case 'sql': return <Database className="h-4 w-4 text-gray-600" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const calculateProgress = (job: ExportJob) => {
    if (job.status === 'completed') return 100;
    if (job.status === 'pending' || job.metadata.total_records === 0) return 0;
    return Math.floor((job.metadata.exported_records / job.metadata.total_records) * 100);
  };

  const filteredExportJobs = exportJobs.filter(job => {
    const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesFormat = formatFilter === 'all' || job.format === formatFilter;
    
    return matchesSearch && matchesStatus && matchesFormat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Data Export System
          </h3>
          <p className="text-sm text-muted-foreground">
            Export data in multiple formats with privacy controls and scheduling
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canExportData && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Export
            </Button>
          )}
          {canCreateCustomQueries && (
            <Button variant="outline" onClick={() => setShowQueryBuilderDialog(true)}>
              <Database className="h-4 w-4 mr-2" />
              Query Builder
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowBulkExportDialog(true)}>
            <Archive className="h-4 w-4 mr-2" />
            Bulk Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search export jobs..."
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
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={formatFilter} onValueChange={(value: any) => setFormatFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Formats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Export Jobs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="exports">Export Jobs ({exportJobs.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="queries">Custom Queries</TabsTrigger>
          <TabsTrigger value="analytics">Export Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="exports" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-2 bg-muted rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredExportJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Export Jobs Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== 'all' || formatFilter !== 'all'
                    ? "No export jobs match your current filters."
                    : "You haven't created any export jobs yet."}
                </p>
                {canExportData && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Export
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredExportJobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getFormatIcon(job.format)}
                        <div>
                          <CardTitle className="text-base">{job.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {job.data_source.name} • {job.format.toUpperCase()}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(job.status)}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {job.status === 'completed' && job.download_url && (
                              <DropdownMenuItem onClick={() => downloadExport(job)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                            )}
                            {job.status === 'running' && (
                              <DropdownMenuItem onClick={() => cancelExport(job.id)}>
                                <Square className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setSelectedJob(job);
                              setShowPrivacyDialog(true);
                            }}>
                              <Shield className="h-4 w-4 mr-2" />
                              Privacy Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(job.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Job ID
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {job.description && (
                      <p className="text-sm text-muted-foreground mb-4">{job.description}</p>
                    )}
                    
                    {job.status === 'running' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progress:</span>
                          <span>{job.metadata.exported_records.toLocaleString()} / {job.metadata.total_records.toLocaleString()} records</span>
                        </div>
                        <Progress value={calculateProgress(job)} className="h-2" />
                      </div>
                    )}
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Records</div>
                        <div className="font-medium">{job.metadata.total_records.toLocaleString()}</div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground">File Size</div>
                        <div className="font-medium">
                          {job.metadata.file_size > 0 ? formatFileSize(job.metadata.file_size) : 'N/A'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground">Created</div>
                        <div className="font-medium">{job.created_at.toLocaleDateString()}</div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground">Execution Time</div>
                        <div className="font-medium">
                          {job.metadata.execution_time > 0 ? `${job.metadata.execution_time.toFixed(1)}s` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    {job.privacy_settings.anonymize_personal_data && (
                      <div className="flex items-center space-x-1 mt-3 text-xs text-blue-600">
                        <Shield className="h-3 w-3" />
                        <span>Privacy-compliant export</span>
                      </div>
                    )}
                    
                    {job.schedule?.enabled && (
                      <div className="flex items-center space-x-1 mt-2 text-xs text-purple-600">
                        <Calendar className="h-3 w-3" />
                        <span>Scheduled {job.schedule.frequency} • Next: {job.schedule.next_run?.toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-4">
                      {job.status === 'completed' && job.download_url ? (
                        <Button size="sm" onClick={() => downloadExport(job)}>
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      ) : job.status === 'running' ? (
                        <Button variant="outline" size="sm" onClick={() => cancelExport(job.id)}>
                          <Square className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      ) : (
                        <div></div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        {job.configuration.encryption.enabled && (
                          <Lock className="h-3 w-3 text-green-600" title="Encrypted" />
                        )}
                        {job.configuration.compression !== 'none' && (
                          <Archive className="h-3 w-3 text-blue-600" title="Compressed" />
                        )}
                        {job.privacy_settings.gdpr_compliant && (
                          <Shield className="h-3 w-3 text-purple-600" title="GDPR Compliant" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Export Templates</h3>
              <p className="text-muted-foreground">
                Pre-configured export templates will be available here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardContent className="text-center py-12">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Custom Queries</h3>
              <p className="text-muted-foreground">
                SQL query builder and custom query management will be available here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Export Analytics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Exports</p>
                    <p className="text-2xl font-bold">{exportJobs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{exportJobs.filter(j => j.status === 'completed').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold">{exportJobs.reduce((sum, j) => sum + j.metadata.total_records, 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Archive className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Data</p>
                    <p className="text-2xl font-bold">{formatFileSize(exportJobs.reduce((sum, j) => sum + j.metadata.file_size, 0))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Export Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Export</DialogTitle>
            <DialogDescription>
              Configure a new data export with privacy controls and formatting options
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Export Name</Label>
                <Input
                  placeholder="Enter export name"
                  value={newExportJob?.name || ''}
                  onChange={(e) => setNewExportJob(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Format</Label>
                <Select 
                  value={newExportJob?.format || defaultFormat} 
                  onValueChange={(value: ExportFormat) => setNewExportJob(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xml">XML</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Data Source</Label>
              <Select 
                value={newExportJob?.data_source?.id || dataSources[0]?.id}
                onValueChange={(value) => {
                  const source = dataSources.find(ds => ds.id === value);
                  setNewExportJob(prev => ({ ...prev, data_source: source }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <div>
                        <div className="font-medium">{source.name}</div>
                        <div className="text-xs text-muted-foreground">{source.record_count.toLocaleString()} records</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the purpose of this export"
                value={newExportJob?.description || ''}
                onChange={(e) => setNewExportJob(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="privacy"
                checked={newExportJob?.privacy_settings?.anonymize_personal_data}
                onCheckedChange={(checked) => 
                  setNewExportJob(prev => ({
                    ...prev,
                    privacy_settings: {
                      ...prev?.privacy_settings,
                      anonymize_personal_data: !!checked
                    }
                  }))
                }
              />
              <Label htmlFor="privacy" className="text-sm">
                Anonymize personal data (recommended for research exports)
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setNewExportJob(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => createExport(newExportJob || {})}
              disabled={!newExportJob?.name}
            >
              <Play className="h-4 w-4 mr-2" />
              Create & Start Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Export Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedJob?.name}"? This action cannot be undone and any downloaded files will become inaccessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedJob && deleteExport(selectedJob.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
