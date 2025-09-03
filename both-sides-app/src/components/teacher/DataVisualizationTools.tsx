/**
 * Data Visualization Tools Component
 * 
 * Task 8.5.3: Advanced chart generation, interactive visualizations,
 * and dashboard creation tools for data analysis
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Activity,
  Users,
  Settings,
  Download,
  Share2,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  Copy,
  Save,
  RefreshCw,
  Maximize2,
  Minimize2,
  RotateCcw,
  Palette,
  Grid3x3,
  Layers,
  Filter,
  Search,
  Calendar,
  Clock,
  Target,
  Award,
  Star,
  MessageSquare,
  BookOpen,
  Database,
  FileText,
  Image,
  Video,
  Map,
  Zap,
  Lightbulb,
  Info,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal
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
  Cell,
  ScatterChart,
  Scatter,
  Treemap,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface Visualization {
  id: string;
  name: string;
  description: string;
  type: VisualizationType;
  chart_type: ChartType;
  data_source: DataSource;
  configuration: VisualizationConfiguration;
  styling: VisualizationStyling;
  interactivity: InteractivitySettings;
  layout: LayoutSettings;
  filters: VisualizationFilter[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  shared_with: string[];
  tags: string[];
  usage_count: number;
  favorites_count: number;
}

type VisualizationType = 'chart' | 'dashboard' | 'infographic' | 'report' | 'presentation';
type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'bubble' | 'radar' | 'funnel' | 'treemap' | 'heatmap' | 'gauge' | 'waterfall' | 'sankey' | 'sunburst';

interface DataSource {
  id: string;
  name: string;
  type: 'students' | 'classes' | 'debates' | 'analytics' | 'custom_query';
  fields: DataField[];
  filters: DataFilter[];
  aggregations: DataAggregation[];
  joins: DataJoin[];
  last_updated: Date;
  record_count: number;
}

interface DataField {
  id: string;
  name: string;
  display_name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'category';
  description: string;
  is_dimension: boolean;
  is_measure: boolean;
  format?: FieldFormat;
  sample_values?: any[];
}

interface FieldFormat {
  type: 'number' | 'percentage' | 'currency' | 'date' | 'duration';
  decimal_places?: number;
  prefix?: string;
  suffix?: string;
  date_format?: string;
}

interface DataFilter {
  field: string;
  operator: string;
  value: any;
  label: string;
}

interface DataAggregation {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct_count';
  label: string;
}

interface DataJoin {
  target_source: string;
  join_type: 'inner' | 'left' | 'right' | 'full';
  condition: string;
}

interface VisualizationConfiguration {
  x_axis: AxisConfiguration;
  y_axis: AxisConfiguration;
  series: SeriesConfiguration[];
  grouping?: GroupingConfiguration;
  sorting?: SortingConfiguration;
  limits?: LimitsConfiguration;
  calculations?: CalculationConfiguration[];
}

interface AxisConfiguration {
  field?: string;
  label?: string;
  type: 'linear' | 'logarithmic' | 'time' | 'category';
  min?: number;
  max?: number;
  tick_count?: number;
  format?: FieldFormat;
  show_grid: boolean;
  show_labels: boolean;
  rotation?: number;
}

interface SeriesConfiguration {
  id: string;
  field: string;
  label: string;
  type: ChartType;
  color?: string;
  line_style?: 'solid' | 'dashed' | 'dotted';
  marker_style?: 'circle' | 'square' | 'triangle' | 'diamond';
  fill_opacity?: number;
  stack_group?: string;
}

interface GroupingConfiguration {
  field: string;
  label: string;
  limit?: number;
  sort_by?: string;
  sort_direction: 'asc' | 'desc';
}

interface SortingConfiguration {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}

interface LimitsConfiguration {
  max_records: number;
  top_n?: number;
  bottom_n?: number;
}

interface CalculationConfiguration {
  id: string;
  name: string;
  formula: string;
  type: 'running_total' | 'percentage' | 'difference' | 'moving_average' | 'custom';
  window_size?: number;
}

interface VisualizationStyling {
  theme: 'light' | 'dark' | 'custom';
  color_palette: ColorPalette;
  typography: TypographySettings;
  layout: LayoutStyling;
  animations: AnimationSettings;
  responsive: ResponsiveSettings;
}

interface ColorPalette {
  type: 'categorical' | 'sequential' | 'diverging' | 'custom';
  colors: string[];
  opacity: number;
  gradient_enabled: boolean;
}

interface TypographySettings {
  title_font: FontSettings;
  label_font: FontSettings;
  legend_font: FontSettings;
  tooltip_font: FontSettings;
}

interface FontSettings {
  family: string;
  size: number;
  weight: number;
  color: string;
  style: 'normal' | 'italic';
}

interface LayoutStyling {
  margin: MarginSettings;
  padding: PaddingSettings;
  background_color: string;
  border: BorderSettings;
  shadow: ShadowSettings;
}

interface MarginSettings {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface PaddingSettings {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface BorderSettings {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  radius: number;
}

interface ShadowSettings {
  enabled: boolean;
  x_offset: number;
  y_offset: number;
  blur: number;
  color: string;
}

interface AnimationSettings {
  enabled: boolean;
  duration: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay: number;
  entrance_animation: 'fade' | 'slide' | 'grow' | 'bounce';
}

interface ResponsiveSettings {
  breakpoints: BreakpointSettings[];
  auto_resize: boolean;
  maintain_aspect_ratio: boolean;
}

interface BreakpointSettings {
  min_width: number;
  max_width?: number;
  configuration_overrides: any;
}

interface InteractivitySettings {
  hover_effects: boolean;
  click_actions: ClickAction[];
  brush_selection: boolean;
  zoom_enabled: boolean;
  pan_enabled: boolean;
  crossfilter_enabled: boolean;
  tooltip_settings: TooltipSettings;
  legend_settings: LegendSettings;
}

interface ClickAction {
  trigger: 'click' | 'double_click' | 'right_click';
  action: 'drill_down' | 'filter' | 'navigate' | 'export' | 'custom';
  target?: string;
  parameters?: any;
}

interface TooltipSettings {
  enabled: boolean;
  format: 'simple' | 'detailed' | 'custom';
  fields: string[];
  custom_template?: string;
  position: 'follow_cursor' | 'fixed';
  animation: boolean;
}

interface LegendSettings {
  enabled: boolean;
  position: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  orientation: 'horizontal' | 'vertical';
  interactive: boolean;
  max_items?: number;
}

interface LayoutSettings {
  width: number;
  height: number;
  position: PositionSettings;
  z_index: number;
  container_settings: ContainerSettings;
}

interface PositionSettings {
  x: number;
  y: number;
  anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

interface ContainerSettings {
  padding: number;
  margin: number;
  background_color?: string;
  border_radius: number;
  shadow: boolean;
}

interface VisualizationFilter {
  id: string;
  field: string;
  label: string;
  type: 'select' | 'multi_select' | 'range' | 'date_range' | 'search' | 'toggle';
  values: FilterValue[];
  default_value?: any;
  required: boolean;
  visible: boolean;
  position: FilterPosition;
}

interface FilterValue {
  value: any;
  label: string;
  count?: number;
}

interface FilterPosition {
  area: 'header' | 'sidebar' | 'footer' | 'overlay';
  order: number;
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
  visualizations: DashboardVisualization[];
  filters: GlobalFilter[];
  styling: DashboardStyling;
  settings: DashboardSettings;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  shared_with: string[];
  tags: string[];
  is_public: boolean;
}

interface DashboardLayout {
  type: 'grid' | 'freeform' | 'template';
  columns: number;
  rows: number;
  cell_height: number;
  gap: number;
  responsive: boolean;
}

interface DashboardVisualization {
  visualization_id: string;
  position: GridPosition;
  size: GridSize;
  title_override?: string;
  filters_override?: any;
  styling_override?: any;
}

interface GridPosition {
  x: number;
  y: number;
}

interface GridSize {
  width: number;
  height: number;
}

interface GlobalFilter {
  id: string;
  field: string;
  label: string;
  type: string;
  applies_to: string[];
  position: FilterPosition;
}

interface DashboardStyling {
  theme: string;
  background_color: string;
  header_settings: HeaderSettings;
  footer_settings: FooterSettings;
}

interface HeaderSettings {
  enabled: boolean;
  height: number;
  background_color: string;
  show_title: boolean;
  show_filters: boolean;
  show_actions: boolean;
}

interface FooterSettings {
  enabled: boolean;
  height: number;
  background_color: string;
  show_timestamp: boolean;
  show_metadata: boolean;
}

interface DashboardSettings {
  auto_refresh: boolean;
  refresh_interval: number; // seconds
  lazy_loading: boolean;
  cache_duration: number;
  export_formats: string[];
  sharing_options: SharingOptions;
}

interface SharingOptions {
  public_link: boolean;
  embed_code: boolean;
  pdf_export: boolean;
  image_export: boolean;
  data_export: boolean;
}

interface ChartBuilder {
  step: number;
  data_source?: DataSource;
  chart_type?: ChartType;
  configuration: Partial<VisualizationConfiguration>;
  styling: Partial<VisualizationStyling>;
  preview_data?: any[];
}

interface DataVisualizationToolsProps {
  organizationId?: string;
  canCreateVisualizations?: boolean;
  canCreateDashboards?: boolean;
  canShareVisualizations?: boolean;
  defaultTheme?: 'light' | 'dark';
}

const CHART_TYPES = [
  { value: 'line', label: 'Line Chart', icon: LineChart, description: 'Show trends over time' },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3, description: 'Compare categories' },
  { value: 'pie', label: 'Pie Chart', icon: PieChart, description: 'Show parts of a whole' },
  { value: 'area', label: 'Area Chart', icon: Activity, description: 'Show cumulative values' },
  { value: 'scatter', label: 'Scatter Plot', icon: Target, description: 'Show correlations' },
  { value: 'radar', label: 'Radar Chart', icon: Zap, description: 'Multi-dimensional data' },
];

const COLOR_PALETTES = [
  { name: 'Default', colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'] },
  { name: 'Pastel', colors: ['#a7f3d0', '#fde68a', '#fed7d7', '#e0e7ff', '#f3e8ff', '#fef3c7'] },
  { name: 'Professional', colors: ['#1e40af', '#7c3aed', '#dc2626', '#059669', '#d97706', '#be123c'] },
  { name: 'Monochrome', colors: ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f9fafb'] },
];

const SAMPLE_DATA = {
  students: [
    { month: 'Jan', performance: 78, engagement: 85, satisfaction: 4.2 },
    { month: 'Feb', performance: 82, engagement: 88, satisfaction: 4.3 },
    { month: 'Mar', performance: 85, engagement: 91, satisfaction: 4.5 },
    { month: 'Apr', performance: 88, engagement: 89, satisfaction: 4.4 },
    { month: 'May', performance: 91, engagement: 93, satisfaction: 4.6 },
    { month: 'Jun', performance: 94, engagement: 96, satisfaction: 4.8 }
  ],
  categories: [
    { name: 'Critical Thinking', value: 345, color: '#3b82f6' },
    { name: 'Communication', value: 289, color: '#8b5cf6' },
    { name: 'Research Skills', value: 234, color: '#06b6d4' },
    { name: 'Collaboration', value: 198, color: '#22c55e' },
    { name: 'Empathy', value: 167, color: '#f59e0b' }
  ]
};

export function DataVisualizationTools({
  organizationId,
  canCreateVisualizations = true,
  canCreateDashboards = true,
  canShareVisualizations = true,
  defaultTheme = 'light'
}: DataVisualizationToolsProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('visualizations');
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedVisualization, setSelectedVisualization] = useState<Visualization | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<VisualizationType | 'all'>('all');
  
  // Dialog states
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [showDashboardDialog, setShowDashboardDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showStyleDialog, setShowStyleDialog] = useState(false);
  
  // Builder state
  const [chartBuilder, setChartBuilder] = useState<ChartBuilder>({
    step: 0,
    configuration: {},
    styling: {}
  });

  useEffect(() => {
    loadVisualizations();
  }, []);

  const loadVisualizations = async () => {
    setIsLoading(true);
    
    // Mock visualizations data
    const mockVisualizations: Visualization[] = [
      {
        id: 'viz_1',
        name: 'Student Performance Trends',
        description: 'Track student performance metrics over time with interactive trend analysis',
        type: 'chart',
        chart_type: 'line',
        data_source: {
          id: 'students',
          name: 'Student Data',
          type: 'students',
          fields: [
            {
              id: 'month',
              name: 'month',
              display_name: 'Month',
              type: 'date',
              description: 'Month of data collection',
              is_dimension: true,
              is_measure: false,
              sample_values: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            },
            {
              id: 'performance',
              name: 'performance_score',
              display_name: 'Performance Score',
              type: 'number',
              description: 'Average performance score',
              is_dimension: false,
              is_measure: true,
              format: { type: 'percentage', decimal_places: 1 },
              sample_values: [78, 82, 85, 88, 91, 94]
            }
          ],
          filters: [],
          aggregations: [],
          joins: [],
          last_updated: new Date(),
          record_count: 6
        },
        configuration: {
          x_axis: {
            field: 'month',
            label: 'Month',
            type: 'category',
            show_grid: true,
            show_labels: true
          },
          y_axis: {
            field: 'performance',
            label: 'Performance (%)',
            type: 'linear',
            min: 0,
            max: 100,
            show_grid: true,
            show_labels: true,
            format: { type: 'percentage', decimal_places: 1 }
          },
          series: [
            {
              id: 'performance',
              field: 'performance',
              label: 'Performance Score',
              type: 'line',
              color: '#3b82f6',
              line_style: 'solid',
              marker_style: 'circle'
            }
          ]
        },
        styling: {
          theme: 'light',
          color_palette: {
            type: 'categorical',
            colors: ['#3b82f6', '#8b5cf6', '#06b6d4'],
            opacity: 1,
            gradient_enabled: false
          },
          typography: {
            title_font: { family: 'Inter', size: 16, weight: 600, color: '#1f2937', style: 'normal' },
            label_font: { family: 'Inter', size: 12, weight: 400, color: '#6b7280', style: 'normal' },
            legend_font: { family: 'Inter', size: 12, weight: 400, color: '#374151', style: 'normal' },
            tooltip_font: { family: 'Inter', size: 11, weight: 400, color: '#1f2937', style: 'normal' }
          },
          layout: {
            margin: { top: 20, right: 20, bottom: 40, left: 60 },
            padding: { top: 10, right: 10, bottom: 10, left: 10 },
            background_color: '#ffffff',
            border: { width: 1, color: '#e5e7eb', style: 'solid', radius: 8 },
            shadow: { enabled: true, x_offset: 0, y_offset: 2, blur: 4, color: 'rgba(0,0,0,0.1)' }
          },
          animations: {
            enabled: true,
            duration: 1000,
            easing: 'ease-out',
            delay: 0,
            entrance_animation: 'fade'
          },
          responsive: {
            breakpoints: [],
            auto_resize: true,
            maintain_aspect_ratio: true
          }
        },
        interactivity: {
          hover_effects: true,
          click_actions: [],
          brush_selection: false,
          zoom_enabled: false,
          pan_enabled: false,
          crossfilter_enabled: false,
          tooltip_settings: {
            enabled: true,
            format: 'detailed',
            fields: ['month', 'performance'],
            position: 'follow_cursor',
            animation: true
          },
          legend_settings: {
            enabled: true,
            position: 'top',
            orientation: 'horizontal',
            interactive: true
          }
        },
        layout: {
          width: 600,
          height: 400,
          position: { x: 0, y: 0, anchor: 'top-left' },
          z_index: 1,
          container_settings: {
            padding: 16,
            margin: 0,
            border_radius: 8,
            shadow: true
          }
        },
        filters: [],
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        created_by: user?.id || 'teacher_1',
        shared_with: ['team'],
        tags: ['performance', 'trends', 'students'],
        usage_count: 45,
        favorites_count: 12
      },
      {
        id: 'viz_2',
        name: 'Skill Development Distribution',
        description: 'Visual breakdown of student skill development across different competency areas',
        type: 'chart',
        chart_type: 'pie',
        data_source: {
          id: 'categories',
          name: 'Skill Categories',
          type: 'analytics',
          fields: [
            {
              id: 'name',
              name: 'skill_name',
              display_name: 'Skill Name',
              type: 'category',
              description: 'Name of the skill category',
              is_dimension: true,
              is_measure: false,
              sample_values: ['Critical Thinking', 'Communication', 'Research Skills']
            },
            {
              id: 'value',
              name: 'student_count',
              display_name: 'Student Count',
              type: 'number',
              description: 'Number of students in this category',
              is_dimension: false,
              is_measure: true,
              sample_values: [345, 289, 234]
            }
          ],
          filters: [],
          aggregations: [],
          joins: [],
          last_updated: new Date(),
          record_count: 5
        },
        configuration: {
          x_axis: { type: 'category', show_grid: false, show_labels: false },
          y_axis: { type: 'linear', show_grid: false, show_labels: false },
          series: [
            {
              id: 'skills',
              field: 'value',
              label: 'Students',
              type: 'pie',
              color: '#8b5cf6'
            }
          ]
        },
        styling: {
          theme: 'light',
          color_palette: {
            type: 'categorical',
            colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b'],
            opacity: 1,
            gradient_enabled: false
          },
          typography: {
            title_font: { family: 'Inter', size: 16, weight: 600, color: '#1f2937', style: 'normal' },
            label_font: { family: 'Inter', size: 12, weight: 400, color: '#6b7280', style: 'normal' },
            legend_font: { family: 'Inter', size: 12, weight: 400, color: '#374151', style: 'normal' },
            tooltip_font: { family: 'Inter', size: 11, weight: 400, color: '#1f2937', style: 'normal' }
          },
          layout: {
            margin: { top: 20, right: 20, bottom: 20, left: 20 },
            padding: { top: 10, right: 10, bottom: 10, left: 10 },
            background_color: '#ffffff',
            border: { width: 1, color: '#e5e7eb', style: 'solid', radius: 8 },
            shadow: { enabled: true, x_offset: 0, y_offset: 2, blur: 4, color: 'rgba(0,0,0,0.1)' }
          },
          animations: {
            enabled: true,
            duration: 1200,
            easing: 'ease-out',
            delay: 100,
            entrance_animation: 'grow'
          },
          responsive: {
            breakpoints: [],
            auto_resize: true,
            maintain_aspect_ratio: true
          }
        },
        interactivity: {
          hover_effects: true,
          click_actions: [],
          brush_selection: false,
          zoom_enabled: false,
          pan_enabled: false,
          crossfilter_enabled: false,
          tooltip_settings: {
            enabled: true,
            format: 'detailed',
            fields: ['name', 'value'],
            position: 'follow_cursor',
            animation: true
          },
          legend_settings: {
            enabled: true,
            position: 'right',
            orientation: 'vertical',
            interactive: true
          }
        },
        layout: {
          width: 500,
          height: 400,
          position: { x: 0, y: 0, anchor: 'top-left' },
          z_index: 1,
          container_settings: {
            padding: 16,
            margin: 0,
            border_radius: 8,
            shadow: true
          }
        },
        filters: [],
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        created_by: user?.id || 'teacher_1',
        shared_with: [],
        tags: ['skills', 'distribution', 'pie-chart'],
        usage_count: 23,
        favorites_count: 8
      }
    ];

    setVisualizations(mockVisualizations);
    setIsLoading(false);
  };

  const createVisualization = () => {
    if (!canCreateVisualizations) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to create visualizations.'
      });
      return;
    }

    setChartBuilder({
      step: 0,
      configuration: {},
      styling: {}
    });
    setShowBuilderDialog(true);
  };

  const saveVisualization = (vizData: Partial<Visualization>) => {
    const newViz: Visualization = {
      id: `viz_${Date.now()}`,
      name: vizData.name || 'Untitled Visualization',
      description: vizData.description || '',
      type: vizData.type || 'chart',
      chart_type: vizData.chart_type || 'bar',
      data_source: vizData.data_source || {
        id: 'sample',
        name: 'Sample Data',
        type: 'students',
        fields: [],
        filters: [],
        aggregations: [],
        joins: [],
        last_updated: new Date(),
        record_count: 0
      },
      configuration: vizData.configuration || {
        x_axis: { type: 'category', show_grid: true, show_labels: true },
        y_axis: { type: 'linear', show_grid: true, show_labels: true },
        series: []
      },
      styling: vizData.styling || {
        theme: defaultTheme,
        color_palette: { type: 'categorical', colors: COLOR_PALETTES[0].colors, opacity: 1, gradient_enabled: false },
        typography: {
          title_font: { family: 'Inter', size: 16, weight: 600, color: '#1f2937', style: 'normal' },
          label_font: { family: 'Inter', size: 12, weight: 400, color: '#6b7280', style: 'normal' },
          legend_font: { family: 'Inter', size: 12, weight: 400, color: '#374151', style: 'normal' },
          tooltip_font: { family: 'Inter', size: 11, weight: 400, color: '#1f2937', style: 'normal' }
        },
        layout: {
          margin: { top: 20, right: 20, bottom: 40, left: 60 },
          padding: { top: 10, right: 10, bottom: 10, left: 10 },
          background_color: '#ffffff',
          border: { width: 1, color: '#e5e7eb', style: 'solid', radius: 8 },
          shadow: { enabled: false, x_offset: 0, y_offset: 0, blur: 0, color: 'transparent' }
        },
        animations: { enabled: true, duration: 1000, easing: 'ease-out', delay: 0, entrance_animation: 'fade' },
        responsive: { breakpoints: [], auto_resize: true, maintain_aspect_ratio: true }
      },
      interactivity: {
        hover_effects: true,
        click_actions: [],
        brush_selection: false,
        zoom_enabled: false,
        pan_enabled: false,
        crossfilter_enabled: false,
        tooltip_settings: { enabled: true, format: 'simple', fields: [], position: 'follow_cursor', animation: true },
        legend_settings: { enabled: true, position: 'top', orientation: 'horizontal', interactive: false }
      },
      layout: {
        width: 600,
        height: 400,
        position: { x: 0, y: 0, anchor: 'top-left' },
        z_index: 1,
        container_settings: { padding: 16, margin: 0, border_radius: 8, shadow: false }
      },
      filters: [],
      created_at: new Date(),
      updated_at: new Date(),
      created_by: user?.id || 'unknown',
      shared_with: [],
      tags: [],
      usage_count: 0,
      favorites_count: 0
    };

    setVisualizations(prev => [newViz, ...prev]);
    setShowBuilderDialog(false);

    addNotification({
      type: 'success',
      title: 'Visualization Created',
      message: `"${newViz.name}" has been created successfully.`
    });
  };

  const duplicateVisualization = (vizId: string) => {
    const viz = visualizations.find(v => v.id === vizId);
    if (!viz) return;

    const duplicate: Visualization = {
      ...viz,
      id: `viz_${Date.now()}`,
      name: `${viz.name} (Copy)`,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: user?.id || 'unknown',
      usage_count: 0,
      favorites_count: 0
    };

    setVisualizations(prev => [duplicate, ...prev]);

    addNotification({
      type: 'success',
      title: 'Visualization Duplicated',
      message: `"${duplicate.name}" has been created.`
    });
  };

  const deleteVisualization = (vizId: string) => {
    setVisualizations(prev => prev.filter(v => v.id !== vizId));
    
    addNotification({
      type: 'success',
      title: 'Visualization Deleted',
      message: 'The visualization has been deleted.'
    });
  };

  const exportVisualization = (viz: Visualization, format: 'png' | 'svg' | 'pdf') => {
    addNotification({
      type: 'info',
      title: 'Export Started',
      message: `Exporting "${viz.name}" as ${format.toUpperCase()}...`
    });

    // Simulate export
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Export Complete',
        message: `"${viz.name}" has been exported successfully.`
      });
    }, 1500);
  };

  const renderChart = (viz: Visualization) => {
    const data = viz.chart_type === 'pie' ? SAMPLE_DATA.categories : SAMPLE_DATA.students;
    
    switch (viz.chart_type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="performance" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="engagement" stroke="#8b5cf6" strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );
        
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={SAMPLE_DATA.students}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="performance" fill="#3b82f6" />
              <Bar dataKey="engagement" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={SAMPLE_DATA.categories}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {SAMPLE_DATA.categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
        
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={SAMPLE_DATA.students}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="performance" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
              <Area type="monotone" dataKey="engagement" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
            </AreaChart>
          </ResponsiveContainer>
        );
        
      default:
        return (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Chart preview not available</p>
            </div>
          </div>
        );
    }
  };

  const filteredVisualizations = visualizations.filter(viz => {
    const matchesSearch = viz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      viz.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      viz.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || viz.type === filterType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Data Visualization Tools
          </h3>
          <p className="text-sm text-muted-foreground">
            Create interactive charts, dashboards, and visual analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canCreateVisualizations && (
            <Button onClick={createVisualization}>
              <Plus className="h-4 w-4 mr-2" />
              Create Visualization
            </Button>
          )}
          {canCreateDashboards && (
            <Button variant="outline" onClick={() => setShowDashboardDialog(true)}>
              <Grid3x3 className="h-4 w-4 mr-2" />
              Create Dashboard
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
                placeholder="Search visualizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="chart">Charts</SelectItem>
                <SelectItem value="dashboard">Dashboards</SelectItem>
                <SelectItem value="infographic">Infographics</SelectItem>
                <SelectItem value="report">Reports</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Chart Type Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
          <CardDescription>
            Choose a chart type to get started quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {CHART_TYPES.map((chartType) => (
              <Card key={chartType.value} className="cursor-pointer transition-all hover:shadow-md" onClick={() => {
                setChartBuilder(prev => ({ ...prev, chart_type: chartType.value as ChartType }));
                createVisualization();
              }}>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <chartType.icon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <h4 className="font-medium text-sm">{chartType.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{chartType.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visualizations">Visualizations ({filteredVisualizations.length})</TabsTrigger>
          <TabsTrigger value="dashboards">Dashboards ({dashboards.length})</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="visualizations" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-48 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredVisualizations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Visualizations Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || filterType !== 'all'
                    ? "No visualizations match your current filters."
                    : "You haven't created any visualizations yet."}
                </p>
                {canCreateVisualizations && (
                  <Button onClick={createVisualization}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Visualization
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVisualizations.map((viz) => (
                <Card key={viz.id} className="transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base line-clamp-1">{viz.name}</CardTitle>
                        <CardDescription className="line-clamp-1">{viz.description}</CardDescription>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedVisualization(viz);
                            setShowPreviewDialog(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateVisualization(viz.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => exportVisualization(viz, 'png')}>
                            <Download className="h-4 w-4 mr-2" />
                            Export as PNG
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportVisualization(viz, 'svg')}>
                            <Download className="h-4 w-4 mr-2" />
                            Export as SVG
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportVisualization(viz, 'pdf')}>
                            <Download className="h-4 w-4 mr-2" />
                            Export as PDF
                          </DropdownMenuItem>
                          {canShareVisualizations && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => deleteVisualization(viz.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="mb-4">
                      {renderChart(viz)}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <Badge variant="outline" className="capitalize">{viz.chart_type.replace('_', ' ')}</Badge>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>{viz.usage_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3" />
                          <span>{viz.favorites_count}</span>
                        </div>
                      </div>
                    </div>
                    
                    {viz.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {viz.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {viz.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{viz.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedVisualization(viz);
                          setShowPreviewDialog(true);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => exportVisualization(viz, 'png')}
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

        <TabsContent value="dashboards" className="space-y-4">
          <Card>
            <CardContent className="text-center py-12">
              <Grid3x3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Dashboards Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create interactive dashboards by combining multiple visualizations
              </p>
              {canCreateDashboards && (
                <Button onClick={() => setShowDashboardDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          {/* Color Palettes */}
          <Card>
            <CardHeader>
              <CardTitle>Color Palettes</CardTitle>
              <CardDescription>
                Choose from pre-designed color schemes for your visualizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {COLOR_PALETTES.map((palette) => (
                  <Card key={palette.name} className="cursor-pointer transition-all hover:shadow-md">
                    <CardContent className="pt-4">
                      <div className="text-center mb-3">
                        <h4 className="font-medium">{palette.name}</h4>
                      </div>
                      <div className="flex space-x-1">
                        {palette.colors.map((color, index) => (
                          <div
                            key={index}
                            className="flex-1 h-8 rounded"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sample Charts Gallery */}
          <Card>
            <CardHeader>
              <CardTitle>Sample Visualizations</CardTitle>
              <CardDescription>
                Explore different chart types and their applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3">Student Performance Trends</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsLineChart data={SAMPLE_DATA.students}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="performance" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="engagement" stroke="#8b5cf6" strokeWidth={2} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Skill Distribution</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={SAMPLE_DATA.categories}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {SAMPLE_DATA.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chart Builder Dialog */}
      <Dialog open={showBuilderDialog} onOpenChange={setShowBuilderDialog}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Visualization Builder</DialogTitle>
            <DialogDescription>
              Create custom visualizations with our drag-and-drop builder
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <div className="text-center py-12">
              <Edit className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Visualization Builder</h3>
              <p className="text-muted-foreground">
                Interactive chart builder would be implemented here
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuilderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveVisualization({ name: 'New Visualization', type: 'chart' })}>
              Save Visualization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Visualization Preview</DialogTitle>
          </DialogHeader>
          {selectedVisualization && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg">{selectedVisualization.name}</h4>
                <p className="text-muted-foreground">{selectedVisualization.description}</p>
              </div>
              
              <div className="border rounded-lg p-4">
                {renderChart(selectedVisualization)}
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Chart Type</Label>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {selectedVisualization.chart_type.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <Label>Usage Stats</Label>
                  <div className="flex space-x-4 mt-1 text-sm">
                    <span>{selectedVisualization.usage_count} views</span>
                    <span>{selectedVisualization.favorites_count} favorites</span>
                  </div>
                </div>
              </div>
              
              {selectedVisualization.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedVisualization.tags.map((tag) => (
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
              <Edit className="h-4 w-4 mr-2" />
              Edit Visualization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
