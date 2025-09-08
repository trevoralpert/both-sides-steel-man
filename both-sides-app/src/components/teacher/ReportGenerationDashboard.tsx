/**
 * Report Generation Dashboard Component
 * 
 * Task 8.5.3: Comprehensive reporting interface with template selection,
 * scheduled report generation, and interactive report builder
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
  Download,
  Upload,
  Calendar,
  Clock,
  Settings,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Copy,
  Share2,
  Eye,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Users,
  BookOpen,
  GraduationCap,
  Target,
  Award,
  Activity,
  MessageSquare,
  Star,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Play,
  Pause,
  Square,
  SkipForward,
  Rewind,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Info,
  Lightbulb,
  Zap,
  Mail,
  Bell,
  Archive,
  Bookmark,
  Tag,
  Flag,
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
interface Report {
  id: string;
  name: string;
  description: string;
  templateId: string;
  templateName: string;
  category: ReportCategory;
  format: ReportFormat;
  status: ReportStatus;
  configuration: ReportConfiguration;
  schedule?: ReportSchedule;
  metadata: ReportMetadata;
  permissions: ReportPermissions;
  created_at: Date;
  updated_at: Date;
  last_generated?: Date;
  next_generation?: Date;
  created_by: string;
  shared_with: string[];
  tags: string[];
}

type ReportCategory = 
  | 'student_performance' | 'class_analytics' | 'debate_activity' | 'engagement_metrics'
  | 'learning_outcomes' | 'administrative' | 'compliance' | 'financial' | 'usage_analytics'
  | 'custom';

type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html' | 'powerpoint';
type ReportStatus = 'draft' | 'active' | 'generating' | 'completed' | 'failed' | 'archived';

interface ReportConfiguration {
  data_sources: DataSource[];
  filters: ReportFilter[];
  metrics: ReportMetric[];
  grouping: ReportGrouping[];
  sorting: ReportSorting[];
  formatting: ReportFormatting;
  charts: ChartConfiguration[];
  layout: LayoutConfiguration;
}

interface DataSource {
  id: string;
  type: 'students' | 'classes' | 'debates' | 'sessions' | 'analytics' | 'users' | 'organizations';
  name: string;
  description: string;
  fields: DataField[];
  relationships: DataRelationship[];
  access_level: 'public' | 'restricted' | 'confidential';
  last_updated: Date;
}

interface DataField {
  id: string;
  name: string;
  display_name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  sensitive: boolean;
  aggregatable: boolean;
  filterable: boolean;
  sortable: boolean;
}

interface DataRelationship {
  target_source: string;
  relationship_type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  join_field: string;
  target_field: string;
}

interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  display_name: string;
  user_configurable: boolean;
}

interface ReportMetric {
  id: string;
  name: string;
  display_name: string;
  type: 'count' | 'sum' | 'average' | 'min' | 'max' | 'percentage' | 'ratio';
  field: string;
  aggregation: string;
  format: MetricFormat;
  comparison?: MetricComparison;
  target?: number;
  threshold?: MetricThreshold;
}

interface MetricFormat {
  type: 'number' | 'percentage' | 'currency' | 'duration' | 'date';
  decimal_places: number;
  prefix?: string;
  suffix?: string;
  thousand_separator: boolean;
}

interface MetricComparison {
  type: 'previous_period' | 'target' | 'benchmark' | 'cohort_average';
  label: string;
  show_change: boolean;
  show_percentage_change: boolean;
}

interface MetricThreshold {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  colors: {
    excellent: string;
    good: string;
    fair: string;
    poor: string;
  };
}

interface ReportGrouping {
  field: string;
  display_name: string;
  level: number;
  show_totals: boolean;
  collapse_by_default: boolean;
}

interface ReportSorting {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}

interface ReportFormatting {
  theme: 'light' | 'dark' | 'branded';
  colors: ColorScheme;
  fonts: FontConfiguration;
  layout: 'portrait' | 'landscape';
  page_size: 'A4' | 'letter' | 'legal' | 'tabloid';
  margins: MarginConfiguration;
  header: HeaderConfiguration;
  footer: FooterConfiguration;
}

interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  neutral: string[];
}

interface FontConfiguration {
  heading: FontStyle;
  body: FontStyle;
  caption: FontStyle;
}

interface FontStyle {
  family: string;
  size: number;
  weight: number;
  color: string;
}

interface MarginConfiguration {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface HeaderConfiguration {
  enabled: boolean;
  logo: boolean;
  title: boolean;
  subtitle: boolean;
  date: boolean;
  page_numbers: boolean;
  custom_text?: string;
}

interface FooterConfiguration {
  enabled: boolean;
  page_numbers: boolean;
  timestamp: boolean;
  organization_info: boolean;
  disclaimers: boolean;
  custom_text?: string;
}

interface ChartConfiguration {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'heatmap' | 'treemap';
  title: string;
  description: string;
  data_source: string;
  x_axis: string;
  y_axis: string[];
  grouping?: string;
  aggregation: string;
  styling: ChartStyling;
  interactivity: ChartInteractivity;
  position: ChartPosition;
}

interface ChartStyling {
  colors: string[];
  show_legend: boolean;
  legend_position: 'top' | 'bottom' | 'left' | 'right';
  show_grid: boolean;
  show_axes: boolean;
  axis_labels: boolean;
  data_labels: boolean;
}

interface ChartInteractivity {
  clickable: boolean;
  hoverable: boolean;
  zoomable: boolean;
  exportable: boolean;
  drill_down: boolean;
}

interface ChartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
}

interface LayoutConfiguration {
  type: 'table' | 'cards' | 'dashboard' | 'infographic' | 'custom';
  columns: number;
  responsive: boolean;
  sections: LayoutSection[];
}

interface LayoutSection {
  id: string;
  title: string;
  type: 'data_table' | 'chart' | 'metric_cards' | 'text' | 'image' | 'spacer';
  position: SectionPosition;
  styling: SectionStyling;
  content: any;
}

interface SectionPosition {
  row: number;
  column: number;
  row_span: number;
  column_span: number;
}

interface SectionStyling {
  background_color?: string;
  border?: boolean;
  border_color?: string;
  border_radius?: number;
  padding?: number;
  margin?: number;
  shadow?: boolean;
}

interface ReportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  interval: number;
  day_of_week?: number;
  day_of_month?: number;
  time: string;
  timezone: string;
  recipients: ScheduleRecipient[];
  delivery_method: 'email' | 'dashboard' | 'api' | 'file_share';
  auto_archive: boolean;
  retention_period: number;
  last_run?: Date;
  next_run?: Date;
}

interface ScheduleRecipient {
  type: 'user' | 'role' | 'group' | 'external_email';
  identifier: string;
  name: string;
  preferences: RecipientPreferences;
}

interface RecipientPreferences {
  format: ReportFormat;
  summary_only: boolean;
  include_attachments: boolean;
  notification_settings: NotificationSettings;
}

interface NotificationSettings {
  on_generation: boolean;
  on_failure: boolean;
  digest_frequency: 'immediate' | 'daily' | 'weekly';
}

interface ReportMetadata {
  size: number;
  rows: number;
  generation_time: number;
  data_freshness: Date;
  version: string;
  checksum: string;
  dependencies: string[];
  performance_metrics: PerformanceMetrics;
}

interface PerformanceMetrics {
  query_time: number;
  render_time: number;
  export_time: number;
  memory_usage: number;
  cpu_usage: number;
}

interface ReportPermissions {
  view: string[];
  edit: string[];
  delete: string[];
  share: string[];
  schedule: string[];
  export: string[];
  public: boolean;
  organization_only: boolean;
  expiry_date?: Date;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  type: 'system' | 'custom' | 'community';
  popularity: number;
  rating: number;
  usage_count: number;
  author: string;
  organization?: string;
  configuration: ReportConfiguration;
  preview_image?: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  version: string;
  changelog: TemplateChange[];
}

interface TemplateChange {
  version: string;
  date: Date;
  author: string;
  description: string;
  breaking_changes: boolean;
}

interface ReportBuilder {
  components: BuilderComponent[];
  layout: BuilderLayout;
  data_sources: DataSource[];
  current_step: number;
  validation_errors: ValidationError[];
  preview_data?: any;
}

interface BuilderComponent {
  id: string;
  type: 'data_source' | 'filter' | 'metric' | 'chart' | 'table' | 'text' | 'image';
  name: string;
  configuration: any;
  position: ComponentPosition;
  dependencies: string[];
  validation_status: 'valid' | 'warning' | 'error';
  validation_messages: string[];
}

interface ComponentPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BuilderLayout {
  grid_size: number;
  snap_to_grid: boolean;
  show_grid: boolean;
  canvas_width: number;
  canvas_height: number;
}

interface ValidationError {
  component_id: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggested_fix?: string;
}

interface ReportGenerationDashboardProps {
  organizationId?: string;
  canCreateReports?: boolean;
  canScheduleReports?: boolean;
  canShareReports?: boolean;
  defaultCategory?: ReportCategory;
}

export function ReportGenerationDashboard({
  organizationId,
  canCreateReports = true,
  canScheduleReports = false,
  canShareReports = false,
  defaultCategory = 'student_performance'
}: ReportGenerationDashboardProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  
  // Report builder state
  const [reportBuilder, setReportBuilder] = useState<ReportBuilder | null>(null);
  const [builderStep, setBuilderStep] = useState(0);
  
  useEffect(() => {
    loadReports();
    loadReportTemplates();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    
    // Mock reports data
    const mockReports: Report[] = [
      {
        id: 'report_1',
        name: 'Student Performance Summary',
        description: 'Comprehensive overview of student performance across all debate sessions',
        templateId: 'template_1',
        templateName: 'Performance Dashboard',
        category: 'student_performance',
        format: 'pdf',
        status: 'active',
        configuration: {
          data_sources: [
            {
              id: 'students',
              type: 'students',
              name: 'Student Data',
              description: 'Student profiles and performance metrics',
              fields: [
                {
                  id: 'name',
                  name: 'name',
                  display_name: 'Student Name',
                  type: 'string',
                  description: 'Full name of the student',
                  required: true,
                  sensitive: false,
                  aggregatable: false,
                  filterable: true,
                  sortable: true
                }
              ],
              relationships: [],
              access_level: 'restricted',
              last_updated: new Date()
            }
          ],
          filters: [],
          metrics: [
            {
              id: 'avg_score',
              name: 'average_score',
              display_name: 'Average Score',
              type: 'average',
              field: 'scores',
              aggregation: 'avg',
              format: {
                type: 'number',
                decimal_places: 2,
                thousand_separator: true
              }
            }
          ],
          grouping: [],
          sorting: [],
          formatting: {
            theme: 'light',
            colors: {
              primary: '#3b82f6',
              secondary: '#64748b',
              accent: '#8b5cf6',
              success: '#22c55e',
              warning: '#f59e0b',
              error: '#ef4444',
              neutral: ['#f8fafc', '#f1f5f9', '#e2e8f0']
            },
            fonts: {
              heading: { family: 'Inter', size: 18, weight: 600, color: '#1e293b' },
              body: { family: 'Inter', size: 14, weight: 400, color: '#475569' },
              caption: { family: 'Inter', size: 12, weight: 400, color: '#64748b' }
            },
            layout: 'portrait',
            page_size: 'A4',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            header: {
              enabled: true,
              logo: true,
              title: true,
              subtitle: false,
              date: true,
              page_numbers: true
            },
            footer: {
              enabled: true,
              page_numbers: true,
              timestamp: true,
              organization_info: true,
              disclaimers: false
            }
          },
          charts: [],
          layout: {
            type: 'dashboard',
            columns: 2,
            responsive: true,
            sections: []
          }
        },
        schedule: {
          enabled: true,
          frequency: 'weekly',
          interval: 1,
          day_of_week: 1,
          time: '09:00',
          timezone: 'America/New_York',
          recipients: [
            {
              type: 'user',
              identifier: 'teacher_1',
              name: 'John Doe',
              preferences: {
                format: 'pdf',
                summary_only: false,
                include_attachments: true,
                notification_settings: {
                  on_generation: true,
                  on_failure: true,
                  digest_frequency: 'immediate'
                }
              }
            }
          ],
          delivery_method: 'email',
          auto_archive: true,
          retention_period: 90,
          next_run: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        metadata: {
          size: 2048576,
          rows: 150,
          generation_time: 12.5,
          data_freshness: new Date(Date.now() - 2 * 60 * 60 * 1000),
          version: '1.0',
          checksum: 'abc123def456',
          dependencies: ['students', 'debates', 'analytics'],
          performance_metrics: {
            query_time: 3.2,
            render_time: 8.1,
            export_time: 1.2,
            memory_usage: 45.6,
            cpu_usage: 23.4
          }
        },
        permissions: {
          view: ['teacher', 'admin'],
          edit: ['admin'],
          delete: ['admin'],
          share: ['teacher', 'admin'],
          schedule: ['admin'],
          export: ['teacher', 'admin'],
          public: false,
          organization_only: true
        },
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        last_generated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        next_generation: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        created_by: 'teacher_1',
        shared_with: ['teacher_2', 'admin_1'],
        tags: ['performance', 'weekly', 'students']
      },
      {
        id: 'report_2',
        name: 'Class Engagement Analysis',
        description: 'Detailed analysis of student engagement and participation patterns',
        templateId: 'template_2',
        templateName: 'Engagement Analytics',
        category: 'engagement_metrics',
        format: 'excel',
        status: 'generating',
        configuration: {
          data_sources: [],
          filters: [],
          metrics: [],
          grouping: [],
          sorting: [],
          formatting: {
            theme: 'light',
            colors: {
              primary: '#3b82f6',
              secondary: '#64748b',
              accent: '#8b5cf6',
              success: '#22c55e',
              warning: '#f59e0b',
              error: '#ef4444',
              neutral: ['#f8fafc', '#f1f5f9', '#e2e8f0']
            },
            fonts: {
              heading: { family: 'Inter', size: 18, weight: 600, color: '#1e293b' },
              body: { family: 'Inter', size: 14, weight: 400, color: '#475569' },
              caption: { family: 'Inter', size: 12, weight: 400, color: '#64748b' }
            },
            layout: 'landscape',
            page_size: 'A4',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            header: {
              enabled: true,
              logo: true,
              title: true,
              subtitle: false,
              date: true,
              page_numbers: true
            },
            footer: {
              enabled: true,
              page_numbers: true,
              timestamp: true,
              organization_info: true,
              disclaimers: false
            }
          },
          charts: [],
          layout: {
            type: 'table',
            columns: 1,
            responsive: true,
            sections: []
          }
        },
        metadata: {
          size: 0,
          rows: 0,
          generation_time: 0,
          data_freshness: new Date(),
          version: '1.0',
          checksum: '',
          dependencies: ['students', 'sessions', 'engagement'],
          performance_metrics: {
            query_time: 0,
            render_time: 0,
            export_time: 0,
            memory_usage: 0,
            cpu_usage: 0
          }
        },
        permissions: {
          view: ['teacher'],
          edit: ['teacher'],
          delete: ['teacher'],
          share: ['teacher'],
          schedule: ['teacher'],
          export: ['teacher'],
          public: false,
          organization_only: true
        },
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        created_by: 'teacher_2',
        shared_with: [],
        tags: ['engagement', 'analysis', 'class']
      }
    ];

    setReports(mockReports);
    setIsLoading(false);
  };

  const loadReportTemplates = async () => {
    // Mock report templates
    const mockTemplates: ReportTemplate[] = [
      {
        id: 'template_1',
        name: 'Student Performance Dashboard',
        description: 'Comprehensive student performance tracking with analytics and insights',
        category: 'student_performance',
        type: 'system',
        popularity: 95,
        rating: 4.8,
        usage_count: 1250,
        author: 'System',
        configuration: {
          data_sources: [],
          filters: [],
          metrics: [],
          grouping: [],
          sorting: [],
          formatting: {
            theme: 'light',
            colors: {
              primary: '#3b82f6',
              secondary: '#64748b',
              accent: '#8b5cf6',
              success: '#22c55e',
              warning: '#f59e0b',
              error: '#ef4444',
              neutral: ['#f8fafc', '#f1f5f9', '#e2e8f0']
            },
            fonts: {
              heading: { family: 'Inter', size: 18, weight: 600, color: '#1e293b' },
              body: { family: 'Inter', size: 14, weight: 400, color: '#475569' },
              caption: { family: 'Inter', size: 12, weight: 400, color: '#64748b' }
            },
            layout: 'portrait',
            page_size: 'A4',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            header: {
              enabled: true,
              logo: true,
              title: true,
              subtitle: false,
              date: true,
              page_numbers: true
            },
            footer: {
              enabled: true,
              page_numbers: true,
              timestamp: true,
              organization_info: true,
              disclaimers: false
            }
          },
          charts: [],
          layout: {
            type: 'dashboard',
            columns: 2,
            responsive: true,
            sections: []
          }
        },
        preview_image: '/templates/performance-dashboard.png',
        tags: ['student', 'performance', 'analytics', 'dashboard'],
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15'),
        version: '2.1.0',
        changelog: [
          {
            version: '2.1.0',
            date: new Date('2024-01-15'),
            author: 'System',
            description: 'Added new engagement metrics and improved visualizations',
            breaking_changes: false
          },
          {
            version: '2.0.0',
            date: new Date('2024-01-01'),
            author: 'System',
            description: 'Major redesign with improved performance and new features',
            breaking_changes: true
          }
        ]
      },
      {
        id: 'template_2',
        name: 'Class Engagement Report',
        description: 'Detailed analysis of student participation and engagement patterns',
        category: 'engagement_metrics',
        type: 'system',
        popularity: 87,
        rating: 4.6,
        usage_count: 890,
        author: 'System',
        configuration: {
          data_sources: [],
          filters: [],
          metrics: [],
          grouping: [],
          sorting: [],
          formatting: {
            theme: 'light',
            colors: {
              primary: '#3b82f6',
              secondary: '#64748b',
              accent: '#8b5cf6',
              success: '#22c55e',
              warning: '#f59e0b',
              error: '#ef4444',
              neutral: ['#f8fafc', '#f1f5f9', '#e2e8f0']
            },
            fonts: {
              heading: { family: 'Inter', size: 18, weight: 600, color: '#1e293b' },
              body: { family: 'Inter', size: 14, weight: 400, color: '#475569' },
              caption: { family: 'Inter', size: 12, weight: 400, color: '#64748b' }
            },
            layout: 'landscape',
            page_size: 'A4',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            header: {
              enabled: true,
              logo: true,
              title: true,
              subtitle: false,
              date: true,
              page_numbers: true
            },
            footer: {
              enabled: true,
              page_numbers: true,
              timestamp: true,
              organization_info: true,
              disclaimers: false
            }
          },
          charts: [],
          layout: {
            type: 'table',
            columns: 1,
            responsive: true,
            sections: []
          }
        },
        preview_image: '/templates/engagement-report.png',
        tags: ['engagement', 'participation', 'analysis', 'class'],
        created_at: new Date('2024-01-10'),
        updated_at: new Date('2024-01-20'),
        version: '1.3.2',
        changelog: []
      },
      {
        id: 'template_3',
        name: 'Debate Analytics Summary',
        description: 'Comprehensive analysis of debate sessions with quality metrics and insights',
        category: 'debate_activity',
        type: 'community',
        popularity: 76,
        rating: 4.4,
        usage_count: 523,
        author: 'Jane Teacher',
        organization: 'Lincoln High School',
        configuration: {
          data_sources: [],
          filters: [],
          metrics: [],
          grouping: [],
          sorting: [],
          formatting: {
            theme: 'branded',
            colors: {
              primary: '#7c3aed',
              secondary: '#64748b',
              accent: '#06b6d4',
              success: '#22c55e',
              warning: '#f59e0b',
              error: '#ef4444',
              neutral: ['#f8fafc', '#f1f5f9', '#e2e8f0']
            },
            fonts: {
              heading: { family: 'Inter', size: 18, weight: 600, color: '#1e293b' },
              body: { family: 'Inter', size: 14, weight: 400, color: '#475569' },
              caption: { family: 'Inter', size: 12, weight: 400, color: '#64748b' }
            },
            layout: 'portrait',
            page_size: 'A4',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            header: {
              enabled: true,
              logo: true,
              title: true,
              subtitle: true,
              date: true,
              page_numbers: true
            },
            footer: {
              enabled: true,
              page_numbers: true,
              timestamp: true,
              organization_info: true,
              disclaimers: true
            }
          },
          charts: [],
          layout: {
            type: 'infographic',
            columns: 1,
            responsive: true,
            sections: []
          }
        },
        preview_image: '/templates/debate-analytics.png',
        tags: ['debate', 'analytics', 'quality', 'summary'],
        created_at: new Date('2024-01-05'),
        updated_at: new Date('2024-01-18'),
        version: '1.2.1',
        changelog: []
      }
    ];

    setReportTemplates(mockTemplates);
  };

  const createReport = (templateId?: string) => {
    if (!canCreateReports) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to create reports.',
        read: false
      });
      return;
    }

    if (templateId) {
      const template = reportTemplates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        setShowBuilderDialog(true);
        initializeReportBuilder(template);
      }
    } else {
      setShowCreateDialog(true);
    }
  };

  const initializeReportBuilder = (template: ReportTemplate) => {
    const builder: ReportBuilder = {
      components: [],
      layout: {
        grid_size: 10,
        snap_to_grid: true,
        show_grid: true,
        canvas_width: 800,
        canvas_height: 1000
      },
      data_sources: [],
      current_step: 0,
      validation_errors: [],
      preview_data: null
    };

    setReportBuilder(builder);
    setBuilderStep(0);
  };

  const generateReport = async (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    // Update report status to generating
    setReports(prev => prev.map(r => 
      r.id === reportId ? { ...r, status: 'generating' as ReportStatus } : r
    ));

    addNotification({
      type: 'info',
      title: 'Report Generation Started',
      message: `Generating "${report.name}" report...`,
      read: false
    });

    // Simulate report generation
    setTimeout(() => {
      setReports(prev => prev.map(r => 
        r.id === reportId ? { 
          ...r, 
          status: 'completed' as ReportStatus,
          last_generated: new Date(),
          metadata: {
            ...r.metadata,
            generation_time: Math.random() * 20 + 5
          }
        } : r
      ));

      addNotification({
        type: 'success',
        title: 'Report Generated',
        message: `"${report.name}" has been generated successfully.`,
        read: false
      });
    }, 3000 + Math.random() * 2000);
  };

  const exportReport = (report: Report) => {
    addNotification({
      type: 'info',
      title: 'Export Started',
      message: `Exporting "${report.name}" as ${report.format.toUpperCase()}...`,
      read: false
    });

    // Simulate export
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Export Complete',
        message: `"${report.name}" has been exported successfully.`,
        read: false
      });
    }, 1500);
  };

  const scheduleReport = (report: Report) => {
    if (!canScheduleReports) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to schedule reports.',
        read: false
      });
      return;
    }

    setSelectedReport(report);
    setShowScheduleDialog(true);
  };

  const shareReport = (report: Report) => {
    if (!canShareReports) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to share reports.',
        read: false
      });
      return;
    }

    addNotification({
      type: 'info',
      title: 'Share Report',
      message: 'Report sharing functionality would be implemented here.',
      read: false
    });
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Active</Badge>;
      case 'generating': return <Badge className="bg-blue-500 animate-pulse">Generating</Badge>;
      case 'completed': return <Badge className="bg-green-600">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'draft': return <Badge variant="outline">Draft</Badge>;
      case 'archived': return <Badge variant="secondary">Archived</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: ReportCategory) => {
    switch (category) {
      case 'student_performance': return <GraduationCap className="h-4 w-4" />;
      case 'class_analytics': return <Users className="h-4 w-4" />;
      case 'debate_activity': return <MessageSquare className="h-4 w-4" />;
      case 'engagement_metrics': return <Activity className="h-4 w-4" />;
      case 'learning_outcomes': return <Target className="h-4 w-4" />;
      case 'administrative': return <Settings className="h-4 w-4" />;
      case 'compliance': return <CheckCircle2 className="h-4 w-4" />;
      case 'usage_analytics': return <BarChart3 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getFormatIcon = (format: ReportFormat) => {
    switch (format) {
      case 'pdf': return <FileText className="h-4 w-4 text-red-600" />;
      case 'excel': return <FileText className="h-4 w-4 text-green-600" />;
      case 'csv': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'json': return <FileText className="h-4 w-4 text-purple-600" />;
      case 'html': return <FileText className="h-4 w-4 text-orange-600" />;
      case 'powerpoint': return <FileText className="h-4 w-4 text-orange-700" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredTemplates = reportTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Report Generation Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Create, schedule, and manage comprehensive reports and analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canCreateReports && (
            <Button onClick={() => createReport()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowBuilderDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Report Builder
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
                placeholder="Search reports and templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="student_performance">Student Performance</SelectItem>
                <SelectItem value="class_analytics">Class Analytics</SelectItem>
                <SelectItem value="debate_activity">Debate Activity</SelectItem>
                <SelectItem value="engagement_metrics">Engagement</SelectItem>
                <SelectItem value="learning_outcomes">Learning Outcomes</SelectItem>
                <SelectItem value="administrative">Administrative</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="usage_analytics">Usage Analytics</SelectItem>
              </SelectContent>
            </Select>
            
            {activeTab === 'reports' && (
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="generating">Generating</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">My Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({reportTemplates.length})</TabsTrigger>
          <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-8 bg-muted rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? "No reports match your current filters."
                    : "You haven't created any reports yet."}
                </p>
                {canCreateReports && (
                  <Button onClick={() => createReport()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Report
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredReports.map((report) => (
                <Card key={report.id} className="transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(report.category)}
                        <div>
                          <CardTitle className="text-base">{report.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {report.templateName}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => generateReport(report.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Generate Now
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportReport(report)}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                          {canScheduleReports && (
                            <DropdownMenuItem onClick={() => scheduleReport(report)}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule
                            </DropdownMenuItem>
                          )}
                          {canShareReports && (
                            <DropdownMenuItem onClick={() => shareReport(report)}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {report.description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      {getStatusBadge(report.status)}
                      <div className="flex items-center space-x-1">
                        {getFormatIcon(report.format)}
                        <span className="text-xs text-muted-foreground uppercase">
                          {report.format}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      {report.last_generated && (
                        <div className="flex justify-between">
                          <span>Last Generated:</span>
                          <span>{report.last_generated.toLocaleDateString()}</span>
                        </div>
                      )}
                      {report.schedule?.enabled && report.next_generation && (
                        <div className="flex justify-between">
                          <span>Next Scheduled:</span>
                          <span>{report.next_generation.toLocaleDateString()}</span>
                        </div>
                      )}
                      {report.metadata.rows > 0 && (
                        <div className="flex justify-between">
                          <span>Data Rows:</span>
                          <span>{report.metadata.rows.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {report.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {report.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {report.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{report.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex space-x-2 mt-4">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => generateReport(report.id)}
                        disabled={report.status === 'generating'}
                      >
                        {report.status === 'generating' ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Generate
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportReport(report)}
                        disabled={report.status !== 'completed'}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
                <p className="text-muted-foreground">
                  No report templates match your current search criteria.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(template.category)}
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription className="flex items-center space-x-2 text-sm">
                            <span>by {template.author}</span>
                            {template.type === 'system' && (
                              <Badge variant="outline" className="text-xs">System</Badge>
                            )}
                            {template.type === 'community' && (
                              <Badge variant="outline" className="text-xs">Community</Badge>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-1 mb-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{template.rating}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {template.usage_count.toLocaleString()} uses
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="capitalize">
                        {template.category.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>{template.popularity}% popularity</span>
                      </div>
                    </div>
                    
                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 4 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{template.tags.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => createReport(template.id)}
                        disabled={!canCreateReports}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Use Template
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowTemplateDialog(true);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Usage Analytics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Reports</p>
                    <p className="text-2xl font-bold">{reports.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Generated This Month</p>
                    <p className="text-2xl font-bold">{reports.filter(r => r.last_generated && r.last_generated > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Scheduled Reports</p>
                    <p className="text-2xl font-bold">{reports.filter(r => r.schedule?.enabled).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Template Rating</p>
                    <p className="text-2xl font-bold">{(reportTemplates.reduce((sum, t) => sum + t.rating, 0) / reportTemplates.length).toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Report Generation Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsLineChart data={[
                    { month: 'Jan', reports: 12, templates: 3 },
                    { month: 'Feb', reports: 18, templates: 5 },
                    { month: 'Mar', reports: 25, templates: 4 },
                    { month: 'Apr', reports: 22, templates: 7 },
                    { month: 'May', reports: 28, templates: 6 },
                    { month: 'Jun', reports: 32, templates: 8 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="reports" stroke="#3b82f6" name="Reports Generated" />
                    <Line type="monotone" dataKey="templates" stroke="#8b5cf6" name="Templates Created" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Student Performance', value: 35, fill: '#3b82f6' },
                        { name: 'Engagement', value: 25, fill: '#8b5cf6' },
                        { name: 'Debate Activity', value: 20, fill: '#06b6d4' },
                        { name: 'Class Analytics', value: 15, fill: '#22c55e' },
                        { name: 'Other', value: 5, fill: '#f59e0b' }
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
        </TabsContent>
      </Tabs>

      {/* Template Preview Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {getCategoryIcon(selectedTemplate.category)}
                <div>
                  <h4 className="font-semibold">{selectedTemplate.name}</h4>
                  <p className="text-sm text-muted-foreground">by {selectedTemplate.author}</p>
                </div>
              </div>
              
              <p className="text-sm">{selectedTemplate.description}</p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Category</Label>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {selectedTemplate.category.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <Label>Rating</Label>
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{selectedTemplate.rating} ({selectedTemplate.usage_count.toLocaleString()} uses)</span>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTemplate.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
              
              {selectedTemplate.changelog.length > 0 && (
                <div>
                  <Label>Recent Changes</Label>
                  <div className="space-y-2 mt-2">
                    {selectedTemplate.changelog.slice(0, 3).map((change) => (
                      <div key={change.version} className="text-sm">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">v{change.version}</Badge>
                          <span className="text-muted-foreground">{change.date.toLocaleDateString()}</span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">{change.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Close
            </Button>
            {canCreateReports && selectedTemplate && (
              <Button onClick={() => {
                setShowTemplateDialog(false);
                createReport(selectedTemplate.id);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Builder Dialog */}
      <Dialog open={showBuilderDialog} onOpenChange={setShowBuilderDialog}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Interactive Report Builder</DialogTitle>
            <DialogDescription>
              Create custom reports with drag-and-drop components
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <div className="text-center py-12">
              <Edit className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Report Builder</h3>
              <p className="text-muted-foreground">
                Interactive drag-and-drop report builder would be implemented here
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuilderDialog(false)}>
              Close
            </Button>
            <Button>
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
