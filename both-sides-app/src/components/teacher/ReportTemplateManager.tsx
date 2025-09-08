/**
 * Report Template Manager Component
 * 
 * Task 8.5.3: Report template management with pre-built templates,
 * custom creation, sharing, and community template library
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
  Star,
  Download,
  Upload,
  Edit,
  Trash2,
  Copy,
  Share2,
  Eye,
  EyeOff,
  Plus,
  Search,
  Filter,
  Settings,
  Users,
  Globe,
  Lock,
  Unlock,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
  Clock,
  Tag,
  Bookmark,
  Archive,
  ExternalLink,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Zap,
  Target,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  Mail,
  Bell,
  Flag,
  MoreHorizontal,
  Save,
  RefreshCw
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  type: TemplateType;
  version: string;
  status: TemplateStatus;
  configuration: TemplateConfiguration;
  preview: TemplatePreview;
  metadata: TemplateMetadata;
  permissions: TemplatePermissions;
  usage_analytics: UsageAnalytics;
  feedback: TemplateFeedback;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  organization_id?: string;
  tags: string[];
  dependencies: string[];
  changelog: TemplateChange[];
}

type TemplateCategory = 
  | 'student_performance' | 'class_analytics' | 'debate_activity' | 'engagement_metrics'
  | 'learning_outcomes' | 'administrative' | 'compliance' | 'financial' | 'usage_analytics'
  | 'research' | 'custom';

type TemplateType = 'system' | 'organization' | 'custom' | 'community' | 'premium';
type TemplateStatus = 'active' | 'draft' | 'deprecated' | 'archived' | 'under_review' | 'approved' | 'rejected';

interface TemplateConfiguration {
  data_sources: TemplateDataSource[];
  default_filters: TemplateFilter[];
  metrics: TemplateMetric[];
  visualizations: TemplateVisualization[];
  layout: TemplateLayout;
  formatting: TemplateFormatting;
  export_options: ExportOption[];
  customization_options: CustomizationOption[];
}

interface TemplateDataSource {
  id: string;
  type: string;
  name: string;
  required: boolean;
  default_fields: string[];
  optional_fields: string[];
  relationships: DataSourceRelationship[];
}

interface DataSourceRelationship {
  target: string;
  type: 'inner' | 'left' | 'right' | 'full';
  join_condition: string;
}

interface TemplateFilter {
  id: string;
  field: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'multi_select' | 'boolean';
  default_value?: any;
  options?: FilterOption[];
  required: boolean;
  user_configurable: boolean;
  validation_rules: ValidationRule[];
}

interface FilterOption {
  value: any;
  label: string;
  description?: string;
}

interface ValidationRule {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'range';
  value?: any;
  message: string;
}

interface TemplateMetric {
  id: string;
  name: string;
  label: string;
  type: 'count' | 'sum' | 'average' | 'min' | 'max' | 'percentage' | 'ratio' | 'custom';
  field: string;
  aggregation?: string;
  formula?: string;
  format: MetricFormat;
  display_options: MetricDisplayOptions;
}

interface MetricFormat {
  type: 'number' | 'percentage' | 'currency' | 'duration' | 'date';
  decimal_places: number;
  prefix?: string;
  suffix?: string;
  thousand_separator: boolean;
}

interface MetricDisplayOptions {
  show_trend: boolean;
  show_comparison: boolean;
  comparison_type?: 'previous_period' | 'target' | 'benchmark';
  color_coding: boolean;
  icon?: string;
  position: number;
}

interface TemplateVisualization {
  id: string;
  type: 'table' | 'chart' | 'metric_card' | 'text' | 'image' | 'separator';
  title: string;
  description?: string;
  chart_type?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'heatmap';
  data_source: string;
  configuration: VisualizationConfig;
  position: VisualizationPosition;
  styling: VisualizationStyling;
  interactivity: VisualizationInteractivity;
}

interface VisualizationConfig {
  x_axis?: string;
  y_axis?: string[];
  grouping?: string;
  aggregation?: string;
  limit?: number;
  sorting?: SortingConfig;
  filtering?: FilteringConfig;
}

interface SortingConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface FilteringConfig {
  enabled: boolean;
  default_filters: any[];
}

interface VisualizationPosition {
  row: number;
  column: number;
  width: number;
  height: number;
  z_index?: number;
}

interface VisualizationStyling {
  colors?: string[];
  theme?: 'light' | 'dark' | 'custom';
  show_legend?: boolean;
  legend_position?: 'top' | 'bottom' | 'left' | 'right';
  show_grid?: boolean;
  show_axes?: boolean;
  font_size?: number;
  border_radius?: number;
  shadow?: boolean;
}

interface VisualizationInteractivity {
  clickable: boolean;
  hoverable: boolean;
  zoomable: boolean;
  exportable: boolean;
  drill_down: boolean;
  tooltips: boolean;
}

interface TemplateLayout {
  type: 'dashboard' | 'report' | 'infographic' | 'table' | 'custom';
  columns: number;
  responsive: boolean;
  header: HeaderConfig;
  footer: FooterConfig;
  sections: LayoutSection[];
}

interface HeaderConfig {
  enabled: boolean;
  height: number;
  background_color?: string;
  logo: boolean;
  title: boolean;
  subtitle: boolean;
  date: boolean;
  organization_info: boolean;
}

interface FooterConfig {
  enabled: boolean;
  height: number;
  background_color?: string;
  page_numbers: boolean;
  timestamp: boolean;
  disclaimers: boolean;
  contact_info: boolean;
}

interface LayoutSection {
  id: string;
  name: string;
  type: 'content' | 'header' | 'footer' | 'sidebar';
  position: SectionPosition;
  styling: SectionStyling;
  content_types: string[];
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

interface TemplateFormatting {
  theme: 'light' | 'dark' | 'branded' | 'custom';
  color_scheme: ColorScheme;
  typography: Typography;
  spacing: Spacing;
  branding: Branding;
}

interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  neutral: string[];
  background: string;
  foreground: string;
}

interface Typography {
  font_family: string;
  heading_sizes: number[];
  body_size: number;
  caption_size: number;
  line_height: number;
  letter_spacing: number;
}

interface Spacing {
  base_unit: number;
  scale_ratio: number;
  margins: number[];
  padding: number[];
}

interface Branding {
  logo_url?: string;
  logo_position: 'header' | 'footer' | 'watermark';
  logo_size: 'small' | 'medium' | 'large';
  organization_name: boolean;
  custom_css?: string;
}

interface ExportOption {
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'html' | 'png' | 'svg';
  enabled: boolean;
  default: boolean;
  configuration: ExportConfiguration;
}

interface ExportConfiguration {
  page_size?: 'A4' | 'letter' | 'legal' | 'tabloid';
  orientation?: 'portrait' | 'landscape';
  quality?: 'low' | 'medium' | 'high';
  include_images?: boolean;
  include_charts?: boolean;
  watermark?: boolean;
}

interface CustomizationOption {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'boolean' | 'date' | 'file';
  description: string;
  default_value?: any;
  options?: any[];
  validation?: ValidationRule[];
  affects: string[];
}

interface TemplatePreview {
  thumbnail_url?: string;
  preview_images: string[];
  demo_data?: any;
  live_preview_url?: string;
  preview_generated: boolean;
  last_preview_update: Date;
}

interface TemplateMetadata {
  file_size: number;
  complexity_score: number;
  performance_score: number;
  compatibility: CompatibilityInfo;
  requirements: RequirementInfo;
  estimated_execution_time: number;
  estimated_memory_usage: number;
}

interface CompatibilityInfo {
  min_data_rows: number;
  max_data_rows: number;
  supported_formats: string[];
  browser_compatibility: string[];
  mobile_friendly: boolean;
  accessibility_compliant: boolean;
}

interface RequirementInfo {
  required_permissions: string[];
  required_data_sources: string[];
  optional_integrations: string[];
  minimum_version: string;
}

interface TemplatePermissions {
  is_public: boolean;
  organization_only: boolean;
  allowed_roles: string[];
  allowed_users: string[];
  can_view: string[];
  can_use: string[];
  can_edit: string[];
  can_delete: string[];
  can_share: string[];
  can_publish: string[];
  license_type: 'open' | 'restricted' | 'commercial' | 'custom';
  license_terms?: string;
}

interface UsageAnalytics {
  total_uses: number;
  unique_users: number;
  organizations_using: number;
  avg_generation_time: number;
  success_rate: number;
  error_rate: number;
  performance_metrics: PerformanceMetric[];
  usage_trend: UsageTrendPoint[];
  popular_customizations: PopularCustomization[];
}

interface PerformanceMetric {
  date: Date;
  avg_execution_time: number;
  avg_memory_usage: number;
  error_count: number;
  success_count: number;
}

interface UsageTrendPoint {
  date: Date;
  usage_count: number;
  unique_users: number;
}

interface PopularCustomization {
  option_id: string;
  option_value: any;
  usage_count: number;
  percentage: number;
}

interface TemplateFeedback {
  rating: number;
  rating_count: number;
  reviews: TemplateReview[];
  feature_requests: FeatureRequest[];
  bug_reports: BugReport[];
  satisfaction_score: number;
}

interface TemplateReview {
  id: string;
  user_id: string;
  user_name: string;
  rating: number;
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  use_case: string;
  created_at: Date;
  helpful_count: number;
  verified_user: boolean;
}

interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'completed' | 'rejected';
  votes: number;
  created_at: Date;
  updated_at: Date;
}

interface BugReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'fixed' | 'wont_fix';
  steps_to_reproduce: string[];
  created_at: Date;
  resolved_at?: Date;
}

interface TemplateChange {
  version: string;
  date: Date;
  author: string;
  type: 'feature' | 'bugfix' | 'improvement' | 'breaking' | 'security';
  description: string;
  breaking_changes: boolean;
  migration_notes?: string;
}

interface TemplateBuilder {
  template: Partial<ReportTemplate>;
  current_step: number;
  total_steps: number;
  validation_errors: ValidationError[];
  preview_data?: any;
  auto_save: boolean;
  last_saved: Date;
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestions: string[];
}

interface ReportTemplateManagerProps {
  organizationId?: string;
  canCreateTemplates?: boolean;
  canEditTemplates?: boolean;
  canPublishTemplates?: boolean;
  canDeleteTemplates?: boolean;
}

export function ReportTemplateManager({
  organizationId,
  canCreateTemplates = true,
  canEditTemplates = true,
  canPublishTemplates = false,
  canDeleteTemplates = false
}: ReportTemplateManagerProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [templateBuilder, setTemplateBuilder] = useState<TemplateBuilder | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [showCommunityTemplates, setShowCommunityTemplates] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TemplateType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'usage' | 'created' | 'updated'>('rating');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  
  // Template creation/editing
  const [newTemplate, setNewTemplate] = useState<Partial<ReportTemplate> | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    
    // Mock template data
    const mockTemplates: ReportTemplate[] = [
      {
        id: 'template_1',
        name: 'Student Performance Dashboard',
        description: 'Comprehensive dashboard showing student performance metrics, engagement levels, and learning progress across all debate activities.',
        category: 'student_performance',
        type: 'system',
        version: '2.1.0',
        status: 'active',
        configuration: {
          data_sources: [
            {
              id: 'students',
              type: 'students',
              name: 'Student Data',
              required: true,
              default_fields: ['name', 'email', 'performance_score', 'engagement_level'],
              optional_fields: ['grade_level', 'enrollment_date', 'last_activity'],
              relationships: [
                {
                  target: 'classes',
                  type: 'inner',
                  join_condition: 'student_id = students.id'
                }
              ]
            }
          ],
          default_filters: [
            {
              id: 'date_range',
              field: 'created_at',
              label: 'Date Range',
              type: 'date',
              default_value: { start: '30_days_ago', end: 'today' },
              required: false,
              user_configurable: true,
              validation_rules: []
            }
          ],
          metrics: [
            {
              id: 'avg_performance',
              name: 'average_performance',
              label: 'Average Performance',
              type: 'average',
              field: 'performance_score',
              format: {
                type: 'percentage',
                decimal_places: 1,
                thousand_separator: false
              },
              display_options: {
                show_trend: true,
                show_comparison: true,
                comparison_type: 'previous_period',
                color_coding: true,
                position: 1
              }
            }
          ],
          visualizations: [
            {
              id: 'performance_chart',
              type: 'chart',
              title: 'Performance Trends',
              chart_type: 'line',
              data_source: 'students',
              configuration: {
                x_axis: 'date',
                y_axis: ['performance_score'],
                aggregation: 'average'
              },
              position: { row: 1, column: 1, width: 6, height: 4 },
              styling: {
                colors: ['#3b82f6'],
                theme: 'light',
                show_legend: true,
                legend_position: 'bottom'
              },
              interactivity: {
                clickable: true,
                hoverable: true,
                zoomable: false,
                exportable: true,
                drill_down: false,
                tooltips: true
              }
            }
          ],
          layout: {
            type: 'dashboard',
            columns: 12,
            responsive: true,
            header: {
              enabled: true,
              height: 80,
              logo: true,
              title: true,
              subtitle: false,
              date: true,
              organization_info: true
            },
            footer: {
              enabled: true,
              height: 60,
              page_numbers: false,
              timestamp: true,
              disclaimers: true,
              contact_info: false
            },
            sections: []
          },
          formatting: {
            theme: 'light',
            color_scheme: {
              primary: '#3b82f6',
              secondary: '#64748b',
              accent: '#8b5cf6',
              success: '#22c55e',
              warning: '#f59e0b',
              error: '#ef4444',
              neutral: ['#f8fafc', '#f1f5f9', '#e2e8f0'],
              background: '#ffffff',
              foreground: '#0f172a'
            },
            typography: {
              font_family: 'Inter',
              heading_sizes: [24, 20, 18, 16, 14],
              body_size: 14,
              caption_size: 12,
              line_height: 1.5,
              letter_spacing: 0
            },
            spacing: {
              base_unit: 8,
              scale_ratio: 1.5,
              margins: [8, 16, 24, 32],
              padding: [8, 16, 24, 32]
            },
            branding: {
              logo_position: 'header',
              logo_size: 'medium',
              organization_name: true
            }
          },
          export_options: [
            {
              format: 'pdf',
              enabled: true,
              default: true,
              configuration: {
                page_size: 'A4',
                orientation: 'portrait',
                quality: 'high',
                include_images: true,
                include_charts: true
              }
            },
            {
              format: 'excel',
              enabled: true,
              default: false,
              configuration: {}
            }
          ],
          customization_options: [
            {
              id: 'title',
              name: 'dashboard_title',
              label: 'Dashboard Title',
              type: 'text',
              description: 'Custom title for the dashboard',
              default_value: 'Student Performance Dashboard',
              affects: ['header.title']
            }
          ]
        },
        preview: {
          preview_images: ['/templates/student-performance-preview.png'],
          preview_generated: true,
          last_preview_update: new Date()
        },
        metadata: {
          file_size: 45678,
          complexity_score: 75,
          performance_score: 85,
          compatibility: {
            min_data_rows: 1,
            max_data_rows: 10000,
            supported_formats: ['pdf', 'excel', 'html'],
            browser_compatibility: ['chrome', 'firefox', 'safari', 'edge'],
            mobile_friendly: true,
            accessibility_compliant: true
          },
          requirements: {
            required_permissions: ['read_student_data'],
            required_data_sources: ['students'],
            optional_integrations: ['classes', 'analytics'],
            minimum_version: '1.0.0'
          },
          estimated_execution_time: 12.5,
          estimated_memory_usage: 25.6
        },
        permissions: {
          is_public: true,
          organization_only: false,
          allowed_roles: ['teacher', 'admin', 'principal'],
          allowed_users: [],
          can_view: ['*'],
          can_use: ['teacher', 'admin', 'principal'],
          can_edit: ['admin'],
          can_delete: ['admin'],
          can_share: ['teacher', 'admin', 'principal'],
          can_publish: ['admin'],
          license_type: 'open'
        },
        usage_analytics: {
          total_uses: 1247,
          unique_users: 234,
          organizations_using: 45,
          avg_generation_time: 12.5,
          success_rate: 96.8,
          error_rate: 3.2,
          performance_metrics: [],
          usage_trend: [],
          popular_customizations: [
            {
              option_id: 'title',
              option_value: 'My Class Performance',
              usage_count: 123,
              percentage: 52.3
            }
          ]
        },
        feedback: {
          rating: 4.8,
          rating_count: 156,
          reviews: [
            {
              id: 'review_1',
              user_id: 'teacher_1',
              user_name: 'Sarah Johnson',
              rating: 5,
              title: 'Excellent dashboard for tracking student progress',
              comment: 'This template provides exactly what I need to monitor my students. The visualizations are clear and the export options are very helpful.',
              pros: ['Easy to use', 'Great visualizations', 'Multiple export formats'],
              cons: ['Could use more customization options'],
              use_case: 'Weekly student progress reports',
              created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              helpful_count: 23,
              verified_user: true
            }
          ],
          feature_requests: [],
          bug_reports: [],
          satisfaction_score: 4.6
        },
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15'),
        created_by: 'system',
        tags: ['dashboard', 'student', 'performance', 'analytics', 'popular'],
        dependencies: [],
        changelog: [
          {
            version: '2.1.0',
            date: new Date('2024-01-15'),
            author: 'System',
            type: 'feature',
            description: 'Added new engagement metrics and improved mobile responsiveness',
            breaking_changes: false
          },
          {
            version: '2.0.0',
            date: new Date('2024-01-01'),
            author: 'System',
            type: 'feature',
            description: 'Major redesign with new layout engine and enhanced customization options',
            breaking_changes: true,
            migration_notes: 'Templates created with v1.x will need to be updated to use the new layout system'
          }
        ]
      },
      {
        id: 'template_2',
        name: 'Debate Activity Summary',
        description: 'Detailed analysis of debate sessions including participation metrics, argument quality, and learning outcomes.',
        category: 'debate_activity',
        type: 'community',
        version: '1.3.2',
        status: 'active',
        configuration: {
          data_sources: [],
          default_filters: [],
          metrics: [],
          visualizations: [],
          layout: {
            type: 'report',
            columns: 1,
            responsive: true,
            header: { enabled: true, height: 80, logo: true, title: true, subtitle: true, date: true, organization_info: true },
            footer: { enabled: true, height: 60, page_numbers: true, timestamp: true, disclaimers: true, contact_info: false },
            sections: []
          },
          formatting: {
            theme: 'light',
            color_scheme: {
              primary: '#7c3aed',
              secondary: '#64748b',
              accent: '#06b6d4',
              success: '#22c55e',
              warning: '#f59e0b',
              error: '#ef4444',
              neutral: ['#f8fafc', '#f1f5f9', '#e2e8f0'],
              background: '#ffffff',
              foreground: '#0f172a'
            },
            typography: {
              font_family: 'Inter',
              heading_sizes: [24, 20, 18, 16, 14],
              body_size: 14,
              caption_size: 12,
              line_height: 1.5,
              letter_spacing: 0
            },
            spacing: {
              base_unit: 8,
              scale_ratio: 1.5,
              margins: [8, 16, 24, 32],
              padding: [8, 16, 24, 32]
            },
            branding: {
              logo_position: 'header',
              logo_size: 'medium',
              organization_name: true
            }
          },
          export_options: [],
          customization_options: []
        },
        preview: {
          preview_images: ['/templates/debate-activity-preview.png'],
          preview_generated: true,
          last_preview_update: new Date()
        },
        metadata: {
          file_size: 32145,
          complexity_score: 65,
          performance_score: 78,
          compatibility: {
            min_data_rows: 1,
            max_data_rows: 5000,
            supported_formats: ['pdf', 'html'],
            browser_compatibility: ['chrome', 'firefox', 'safari'],
            mobile_friendly: false,
            accessibility_compliant: false
          },
          requirements: {
            required_permissions: ['read_debate_data'],
            required_data_sources: ['debates', 'sessions'],
            optional_integrations: [],
            minimum_version: '1.0.0'
          },
          estimated_execution_time: 8.2,
          estimated_memory_usage: 18.4
        },
        permissions: {
          is_public: true,
          organization_only: false,
          allowed_roles: ['teacher', 'admin'],
          allowed_users: [],
          can_view: ['*'],
          can_use: ['teacher', 'admin'],
          can_edit: ['template_creator'],
          can_delete: ['template_creator'],
          can_share: ['teacher', 'admin'],
          can_publish: ['admin'],
          license_type: 'open'
        },
        usage_analytics: {
          total_uses: 523,
          unique_users: 87,
          organizations_using: 23,
          avg_generation_time: 8.2,
          success_rate: 94.2,
          error_rate: 5.8,
          performance_metrics: [],
          usage_trend: [],
          popular_customizations: []
        },
        feedback: {
          rating: 4.4,
          rating_count: 67,
          reviews: [],
          feature_requests: [],
          bug_reports: [],
          satisfaction_score: 4.2
        },
        created_at: new Date('2024-01-05'),
        updated_at: new Date('2024-01-18'),
        created_by: 'teacher_community',
        organization_id: 'lincoln_high',
        tags: ['debate', 'analysis', 'community', 'report'],
        dependencies: [],
        changelog: []
      }
    ];

    setTemplates(mockTemplates);
    setIsLoading(false);
  };

  const createTemplate = () => {
    if (!canCreateTemplates) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to create templates.',
        read: false
      });
      return;
    }

    setNewTemplate({
      name: '',
      description: '',
      category: 'student_performance',
      type: 'custom',
      status: 'draft'
    });
    setShowCreateDialog(true);
  };

  const saveTemplate = async (templateData: Partial<ReportTemplate>) => {
    const template: ReportTemplate = {
      id: `template_${Date.now()}`,
      name: templateData.name || 'Untitled Template',
      description: templateData.description || '',
      category: templateData.category || 'custom',
      type: templateData.type || 'custom',
      version: '1.0.0',
      status: templateData.status || 'draft',
      configuration: templateData.configuration || {
        data_sources: [],
        default_filters: [],
        metrics: [],
        visualizations: [],
        layout: {
          type: 'dashboard',
          columns: 12,
          responsive: true,
          header: { enabled: true, height: 80, logo: true, title: true, subtitle: false, date: true, organization_info: true },
          footer: { enabled: true, height: 60, page_numbers: false, timestamp: true, disclaimers: false, contact_info: false },
          sections: []
        },
        formatting: {
          theme: 'light',
          color_scheme: {
            primary: '#3b82f6',
            secondary: '#64748b',
            accent: '#8b5cf6',
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            neutral: ['#f8fafc', '#f1f5f9', '#e2e8f0'],
            background: '#ffffff',
            foreground: '#0f172a'
          },
          typography: {
            font_family: 'Inter',
            heading_sizes: [24, 20, 18, 16, 14],
            body_size: 14,
            caption_size: 12,
            line_height: 1.5,
            letter_spacing: 0
          },
          spacing: {
            base_unit: 8,
            scale_ratio: 1.5,
            margins: [8, 16, 24, 32],
            padding: [8, 16, 24, 32]
          },
          branding: {
            logo_position: 'header',
            logo_size: 'medium',
            organization_name: true
          }
        },
        export_options: [],
        customization_options: []
      },
      preview: {
        preview_images: [],
        preview_generated: false,
        last_preview_update: new Date()
      },
      metadata: {
        file_size: 0,
        complexity_score: 10,
        performance_score: 100,
        compatibility: {
          min_data_rows: 1,
          max_data_rows: 10000,
          supported_formats: ['pdf'],
          browser_compatibility: ['chrome', 'firefox', 'safari', 'edge'],
          mobile_friendly: true,
          accessibility_compliant: true
        },
        requirements: {
          required_permissions: [],
          required_data_sources: [],
          optional_integrations: [],
          minimum_version: '1.0.0'
        },
        estimated_execution_time: 5,
        estimated_memory_usage: 10
      },
      permissions: {
        is_public: false,
        organization_only: true,
        allowed_roles: ['teacher', 'admin'],
        allowed_users: [],
        can_view: [user?.id || ''],
        can_use: [user?.id || ''],
        can_edit: [user?.id || ''],
        can_delete: [user?.id || ''],
        can_share: [user?.id || ''],
        can_publish: [],
        license_type: 'custom'
      },
      usage_analytics: {
        total_uses: 0,
        unique_users: 0,
        organizations_using: 0,
        avg_generation_time: 0,
        success_rate: 0,
        error_rate: 0,
        performance_metrics: [],
        usage_trend: [],
        popular_customizations: []
      },
      feedback: {
        rating: 0,
        rating_count: 0,
        reviews: [],
        feature_requests: [],
        bug_reports: [],
        satisfaction_score: 0
      },
      created_at: new Date(),
      updated_at: new Date(),
      created_by: user?.id || 'unknown',
      organization_id: organizationId,
      tags: [],
      dependencies: [],
      changelog: [
        {
          version: '1.0.0',
          date: new Date(),
          author: user?.primaryEmailAddress?.emailAddress || 'User',
          type: 'feature',
          description: 'Initial template creation',
          breaking_changes: false
        }
      ]
    };

    setTemplates(prev => [template, ...prev]);
    setShowCreateDialog(false);
    setNewTemplate(null);

    addNotification({
      type: 'success',
      title: 'Template Created',
      message: `Template "${template.name}" has been created successfully.`,
      read: false
    });
  };

  const duplicateTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const duplicated: ReportTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      name: `${template.name} (Copy)`,
      version: '1.0.0',
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
      created_by: user?.id || 'unknown',
      usage_analytics: {
        total_uses: 0,
        unique_users: 0,
        organizations_using: 0,
        avg_generation_time: 0,
        success_rate: 0,
        error_rate: 0,
        performance_metrics: [],
        usage_trend: [],
        popular_customizations: []
      },
      feedback: {
        rating: 0,
        rating_count: 0,
        reviews: [],
        feature_requests: [],
        bug_reports: [],
        satisfaction_score: 0
      }
    };

    setTemplates(prev => [duplicated, ...prev]);

    addNotification({
      type: 'success',
      title: 'Template Duplicated',
      message: `Template "${duplicated.name}" has been created as a copy.`,
      read: false
    });
  };

  const shareTemplate = (template: ReportTemplate) => {
    if (!template.permissions.can_share.includes(user?.id || '')) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to share this template.',
        read: false
      });
      return;
    }

    setSelectedTemplate(template);
    setShowShareDialog(true);
  };

  const deleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    if (!template.permissions.can_delete.includes(user?.id || '')) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to delete this template.',
        read: false
      });
      return;
    }

    setTemplates(prev => prev.filter(t => t.id !== templateId));
    setShowDeleteDialog(false);
    setSelectedTemplate(null);

    addNotification({
      type: 'success',
      title: 'Template Deleted',
      message: `Template "${template.name}" has been deleted.`,
      read: false
    });
  };

  const rateTemplate = (templateId: string, rating: number) => {
    setTemplates(prev => prev.map(template => 
      template.id === templateId 
        ? {
            ...template,
            feedback: {
              ...template.feedback,
              rating: ((template.feedback.rating * template.feedback.rating_count) + rating) / (template.feedback.rating_count + 1),
              rating_count: template.feedback.rating_count + 1
            }
          }
        : template
    ));

    addNotification({
      type: 'success',
      title: 'Thank you!',
      message: 'Your rating has been submitted.',
      read: false
    });
  };

  const getStatusBadge = (status: TemplateStatus) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Active</Badge>;
      case 'draft': return <Badge variant="outline">Draft</Badge>;
      case 'deprecated': return <Badge className="bg-orange-500">Deprecated</Badge>;
      case 'archived': return <Badge variant="secondary">Archived</Badge>;
      case 'under_review': return <Badge className="bg-blue-500">Under Review</Badge>;
      case 'approved': return <Badge className="bg-green-600">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: TemplateType) => {
    switch (type) {
      case 'system': return <Badge variant="default">System</Badge>;
      case 'organization': return <Badge className="bg-blue-500">Organization</Badge>;
      case 'custom': return <Badge className="bg-purple-500">Custom</Badge>;
      case 'community': return <Badge className="bg-green-500">Community</Badge>;
      case 'premium': return <Badge className="bg-yellow-500">Premium</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getCategoryIcon = (category: TemplateCategory) => {
    switch (category) {
      case 'student_performance': return <Award className="h-4 w-4" />;
      case 'class_analytics': return <Users className="h-4 w-4" />;
      case 'debate_activity': return <MessageSquare className="h-4 w-4" />;
      case 'engagement_metrics': return <Activity className="h-4 w-4" />;
      case 'learning_outcomes': return <Target className="h-4 w-4" />;
      case 'administrative': return <Settings className="h-4 w-4" />;
      case 'compliance': return <CheckCircle2 className="h-4 w-4" />;
      case 'usage_analytics': return <BarChart3 className="h-4 w-4" />;
      case 'research': return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredTemplates = templates
    .filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
      const matchesType = typeFilter === 'all' || template.type === typeFilter;
      const matchesVisibility = showCommunityTemplates || template.type !== 'community';
      
      return matchesSearch && matchesCategory && matchesType && matchesVisibility;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.feedback.rating - a.feedback.rating;
        case 'usage':
          return b.usage_analytics.total_uses - a.usage_analytics.total_uses;
        case 'created':
          return b.created_at.getTime() - a.created_at.getTime();
        case 'updated':
          return b.updated_at.getTime() - a.updated_at.getTime();
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Report Template Manager
          </h3>
          <p className="text-sm text-muted-foreground">
            Create, manage, and share report templates with the community
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canCreateTemplates && (
            <Button onClick={createTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowBuilderDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Template Builder
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
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
                  <SelectItem value="research">Research</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="usage">Usage</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {showCommunityTemplates && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="community"
                  checked={showCommunityTemplates}
                  onCheckedChange={setShowCommunityTemplates}
                />
                <Label htmlFor="community" className="text-sm">Show community templates</Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="my-templates">My Templates ({templates.filter(t => t.created_by === user?.id).length})</TabsTrigger>
          <TabsTrigger value="analytics">Template Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
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
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || categoryFilter !== 'all' || typeFilter !== 'all'
                    ? "No templates match your current filters."
                    : "No templates available yet."}
                </p>
                {canCreateTemplates && (
                  <Button onClick={createTemplate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Template
                  </Button>
                )}
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
                          <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
                          <CardDescription className="flex items-center space-x-2 text-sm">
                            <span>v{template.version}</span>
                            <span>•</span>
                            <span>by {template.created_by}</span>
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
                          <DropdownMenuItem onClick={() => {
                            setSelectedTemplate(template);
                            setShowPreviewDialog(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateTemplate(template.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => shareTemplate(template)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          {template.permissions.can_edit.includes(user?.id || '') && (
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {template.permissions.can_delete.includes(user?.id || '') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedTemplate(template);
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
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        {getTypeBadge(template.type)}
                        {getStatusBadge(template.status)}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{template.feedback.rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({template.feedback.rating_count})
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Used:</span>
                        <span>{template.usage_analytics.total_uses.toLocaleString()} times</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Success Rate:</span>
                        <span className="text-green-600">{template.usage_analytics.success_rate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Updated:</span>
                        <span>{template.updated_at.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {template.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{template.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" className="flex-1">
                        <Download className="h-3 w-3 mr-1" />
                        Use Template
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowPreviewDialog(true);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowReviewDialog(true);
                        }}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-templates" className="space-y-4">
          {templates.filter(t => t.created_by === user?.id).length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Created</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't created any templates yet.
                </p>
                {canCreateTemplates && (
                  <Button onClick={createTemplate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates
                .filter(t => t.created_by === user?.id)
                .map((template) => (
                  <Card key={template.id} className="transition-all hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(template.category)}
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <CardDescription className="text-sm">
                              v{template.version} • {getStatusBadge(template.status)}
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
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateTemplate(template.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => shareTemplate(template)}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            {canPublishTemplates && template.status === 'draft' && (
                              <DropdownMenuItem>
                                <Upload className="h-4 w-4 mr-2" />
                                Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {template.description}
                      </p>
                      
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Used:</span>
                          <span>{template.usage_analytics.total_uses} times</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rating:</span>
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{template.feedback.rating.toFixed(1)} ({template.feedback.rating_count})</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span>Updated:</span>
                          <span>{template.updated_at.toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <BarChart3 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Template Analytics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Templates</p>
                    <p className="text-2xl font-bold">{templates.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Community Templates</p>
                    <p className="text-2xl font-bold">{templates.filter(t => t.type === 'community').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">{(templates.reduce((sum, t) => sum + t.feedback.rating, 0) / templates.length).toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Usage</p>
                    <p className="text-2xl font-bold">{templates.reduce((sum, t) => sum + t.usage_analytics.total_uses, 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a new report template that can be shared and reused
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Template Name</Label>
                <Input
                  placeholder="Enter template name"
                  value={newTemplate?.name || ''}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select 
                  value={newTemplate?.category || 'student_performance'} 
                  onValueChange={(value: TemplateCategory) => setNewTemplate(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student_performance">Student Performance</SelectItem>
                    <SelectItem value="class_analytics">Class Analytics</SelectItem>
                    <SelectItem value="debate_activity">Debate Activity</SelectItem>
                    <SelectItem value="engagement_metrics">Engagement</SelectItem>
                    <SelectItem value="learning_outcomes">Learning Outcomes</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="usage_analytics">Usage Analytics</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this template does and when to use it"
                value={newTemplate?.description || ''}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="public"
                checked={newTemplate?.permissions?.is_public}
                onCheckedChange={(checked) => 
                  setNewTemplate(prev => ({
                    ...prev,
                    permissions: {
                      ...prev?.permissions,
                      is_public: !!checked
                    }
                  } as Partial<ReportTemplate>))
                }
              />
              <Label htmlFor="public" className="text-sm">
                Make this template public (visible to all users)
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setNewTemplate(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveTemplate(newTemplate || {})}
              disabled={!newTemplate?.name}
            >
              <Save className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {getCategoryIcon(selectedTemplate.category)}
                <div>
                  <h4 className="font-semibold">{selectedTemplate.name}</h4>
                  <p className="text-sm text-muted-foreground">v{selectedTemplate.version} by {selectedTemplate.created_by}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {getTypeBadge(selectedTemplate.type)}
                  {getStatusBadge(selectedTemplate.status)}
                </div>
              </div>
              
              <p className="text-sm">{selectedTemplate.description}</p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Rating & Usage</Label>
                  <div className="space-y-2 mt-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{selectedTemplate.feedback.rating.toFixed(1)} ({selectedTemplate.feedback.rating_count} reviews)</span>
                    </div>
                    <div>Used {selectedTemplate.usage_analytics.total_uses.toLocaleString()} times by {selectedTemplate.usage_analytics.unique_users} users</div>
                    <div>Success rate: {selectedTemplate.usage_analytics.success_rate.toFixed(1)}%</div>
                  </div>
                </div>
                
                <div>
                  <Label>Requirements</Label>
                  <div className="space-y-2 mt-2 text-sm">
                    <div>Permissions: {selectedTemplate.metadata.requirements.required_permissions.join(', ') || 'None'}</div>
                    <div>Data sources: {selectedTemplate.metadata.requirements.required_data_sources.join(', ') || 'None'}</div>
                    <div>Estimated time: {selectedTemplate.metadata.estimated_execution_time.toFixed(1)}s</div>
                  </div>
                </div>
              </div>
              
              {selectedTemplate.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTemplate.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
