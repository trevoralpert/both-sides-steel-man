/**
 * Customization Tools Component
 * 
 * Task 8.5.4: Branding and white-label customization options, email template
 * customization with localization, and UI theme accessibility customization
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
  Palette,
  Image,
  Type,
  Layout,
  Globe,
  Mail,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  Settings,
  Download,
  Upload,
  Save,
  RefreshCw,
  Copy,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Lightbulb,
  Zap,
  Star,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Info,
  HelpCircle,
  ExternalLink,
  Code,
  FileText,
  Camera,
  Crop,
  RotateCcw,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Sun,
  Moon,
  Contrast,
  Accessibility,
  Languages
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface BrandingSettings {
  organization_name: string;
  tagline: string;
  logo: LogoSettings;
  favicon: IconSettings;
  color_scheme: ColorScheme;
  typography: TypographySettings;
  layout_preferences: LayoutPreferences;
  custom_css?: string;
  white_label_settings: WhiteLabelSettings;
}

interface LogoSettings {
  primary_logo_url?: string;
  dark_logo_url?: string;
  favicon_url?: string;
  logo_position: 'left' | 'center' | 'right';
  logo_size: 'small' | 'medium' | 'large';
  show_organization_name: boolean;
  logo_margins: Spacing;
}

interface IconSettings {
  favicon_url?: string;
  touch_icon_url?: string;
  tile_icon_url?: string;
  manifest_icons: ManifestIcon[];
}

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface ColorScheme {
  theme_mode: 'light' | 'dark' | 'system';
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  text_muted_color: string;
  border_color: string;
  error_color: string;
  warning_color: string;
  success_color: string;
  info_color: string;
  custom_colors: { [key: string]: string };
}

interface TypographySettings {
  font_family: string;
  heading_font?: string;
  body_font?: string;
  monospace_font?: string;
  font_sizes: FontSizes;
  font_weights: FontWeights;
  line_heights: LineHeights;
  letter_spacing: LetterSpacing;
}

interface FontSizes {
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
}

interface FontWeights {
  thin: number;
  light: number;
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
  extrabold: number;
}

interface LineHeights {
  none: number;
  tight: number;
  snug: number;
  normal: number;
  relaxed: number;
  loose: number;
}

interface LetterSpacing {
  tighter: number;
  tight: number;
  normal: number;
  wide: number;
  wider: number;
  widest: number;
}

interface LayoutPreferences {
  sidebar_position: 'left' | 'right';
  content_width: 'full' | 'contained';
  border_radius: 'none' | 'small' | 'medium' | 'large' | 'full';
  spacing_scale: number;
  shadow_style: 'none' | 'subtle' | 'medium' | 'strong';
  animation_speed: 'none' | 'slow' | 'normal' | 'fast';
}

interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface WhiteLabelSettings {
  enabled: boolean;
  hide_branding: boolean;
  custom_domain?: string;
  custom_app_name: string;
  custom_support_email: string;
  custom_privacy_url?: string;
  custom_terms_url?: string;
  remove_powered_by: boolean;
  custom_meta_tags: MetaTag[];
}

interface MetaTag {
  name: string;
  content: string;
  property?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: EmailCategory;
  subject: string;
  content: string;
  variables: EmailVariable[];
  localization: EmailLocalization[];
  styling: EmailStyling;
  preview_data: { [key: string]: any };
  usage_count: number;
  last_modified: Date;
  modified_by: string;
  status: 'active' | 'draft' | 'archived';
}

type EmailCategory = 
  | 'welcome' | 'notification' | 'reminder' | 'invitation' | 'report' 
  | 'security' | 'system' | 'marketing' | 'transactional' | 'custom';

interface EmailVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  required: boolean;
  default_value?: any;
  example_value: any;
}

interface EmailLocalization {
  language: string;
  locale: string;
  subject: string;
  content: string;
  variables: { [key: string]: string };
}

interface EmailStyling {
  template_type: 'html' | 'text' | 'mixed';
  header_settings: EmailHeaderSettings;
  footer_settings: EmailFooterSettings;
  color_scheme: EmailColorScheme;
  typography: EmailTypography;
  layout: EmailLayout;
}

interface EmailHeaderSettings {
  include_logo: boolean;
  logo_position: 'left' | 'center' | 'right';
  background_color: string;
  text_color: string;
  height: number;
}

interface EmailFooterSettings {
  include_unsubscribe: boolean;
  include_social_links: boolean;
  include_contact_info: boolean;
  background_color: string;
  text_color: string;
  custom_content?: string;
}

interface EmailColorScheme {
  background_color: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  link_color: string;
  button_color: string;
  border_color: string;
}

interface EmailTypography {
  font_family: string;
  heading_size: number;
  body_size: number;
  line_height: number;
}

interface EmailLayout {
  width: number;
  padding: number;
  border_radius: number;
  shadow: boolean;
  responsive: boolean;
}

interface ThemeSettings {
  id: string;
  name: string;
  description: string;
  type: 'light' | 'dark' | 'high_contrast' | 'custom';
  colors: ColorScheme;
  typography: TypographySettings;
  accessibility: AccessibilitySettings;
  preview_image?: string;
  built_in: boolean;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

interface AccessibilitySettings {
  high_contrast_mode: boolean;
  large_text_mode: boolean;
  reduced_motion: boolean;
  focus_indicators: boolean;
  keyboard_navigation: boolean;
  screen_reader_optimized: boolean;
  color_blind_friendly: boolean;
  font_size_multiplier: number;
  line_height_multiplier: number;
  color_contrast_ratio: number;
  alternative_text_required: boolean;
}

interface CustomizationToolsProps {
  organizationId?: string;
  canCustomizeBranding?: boolean;
  canEditEmailTemplates?: boolean;
  canManageThemes?: boolean;
  canUseWhiteLabel?: boolean;
}

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter', category: 'sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'sans-serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'serif' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'serif' },
  { value: 'Source Code Pro', label: 'Source Code Pro', category: 'monospace' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono', category: 'monospace' },
];

const PRESET_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
];

const EMAIL_CATEGORIES = [
  { value: 'welcome', label: 'Welcome & Onboarding', icon: Star },
  { value: 'notification', label: 'Notifications', icon: Bell },
  { value: 'reminder', label: 'Reminders', icon: Clock },
  { value: 'invitation', label: 'Invitations', icon: Mail },
  { value: 'report', label: 'Reports', icon: FileText },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'system', label: 'System', icon: Settings },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
];

export function CustomizationTools({
  organizationId,
  canCustomizeBranding = true,
  canEditEmailTemplates = true,
  canManageThemes = true,
  canUseWhiteLabel = false
}: CustomizationToolsProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('branding');
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [themes, setThemes] = useState<ThemeSettings[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeSettings | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EmailCategory | 'all'>('all');
  
  // Dialog states
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    loadCustomizationData();
  }, []);

  const loadCustomizationData = async () => {
    setIsLoading(true);
    
    // Mock branding settings
    const mockBrandingSettings: BrandingSettings = {
      organization_name: 'Both Sides Academy',
      tagline: 'Empowering Critical Thinking Through Debate',
      logo: {
        logo_position: 'left',
        logo_size: 'medium',
        show_organization_name: true,
        logo_margins: { top: 8, right: 16, bottom: 8, left: 16 }
      },
      favicon: {
        manifest_icons: []
      },
      color_scheme: {
        theme_mode: 'light',
        primary_color: '#3b82f6',
        secondary_color: '#64748b',
        accent_color: '#8b5cf6',
        background_color: '#ffffff',
        surface_color: '#f8fafc',
        text_color: '#1e293b',
        text_muted_color: '#64748b',
        border_color: '#e2e8f0',
        error_color: '#ef4444',
        warning_color: '#f59e0b',
        success_color: '#22c55e',
        info_color: '#3b82f6',
        custom_colors: {}
      },
      typography: {
        font_family: 'Inter',
        heading_font: 'Inter',
        body_font: 'Inter',
        font_sizes: {
          xs: 12,
          sm: 14,
          base: 16,
          lg: 18,
          xl: 20,
          '2xl': 24,
          '3xl': 30,
          '4xl': 36
        },
        font_weights: {
          thin: 100,
          light: 300,
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
          extrabold: 800
        },
        line_heights: {
          none: 1,
          tight: 1.25,
          snug: 1.375,
          normal: 1.5,
          relaxed: 1.625,
          loose: 2
        },
        letter_spacing: {
          tighter: -0.05,
          tight: -0.025,
          normal: 0,
          wide: 0.025,
          wider: 0.05,
          widest: 0.1
        }
      },
      layout_preferences: {
        sidebar_position: 'left',
        content_width: 'contained',
        border_radius: 'medium',
        spacing_scale: 1,
        shadow_style: 'subtle',
        animation_speed: 'normal'
      },
      white_label_settings: {
        enabled: false,
        hide_branding: false,
        custom_app_name: 'Both Sides Academy',
        custom_support_email: 'support@bothsides.academy',
        remove_powered_by: false,
        custom_meta_tags: []
      }
    };

    // Mock email templates
    const mockEmailTemplates: EmailTemplate[] = [
      {
        id: 'template_1',
        name: 'Welcome Email',
        description: 'Welcome new users and provide getting started information',
        category: 'welcome',
        subject: 'Welcome to {{organization_name}}!',
        content: `
          <h1>Welcome to {{organization_name}}!</h1>
          <p>Hi {{user_name}},</p>
          <p>We're excited to have you join our community of critical thinkers and debaters.</p>
          <p>Here's what you can do to get started:</p>
          <ul>
            <li>Complete your profile setup</li>
            <li>Take the belief profiling survey</li>
            <li>Join your first debate</li>
          </ul>
          <p>If you have any questions, don't hesitate to reach out to our support team.</p>
          <p>Happy debating!</p>
          <p>The {{organization_name}} Team</p>
        `,
        variables: [
          {
            name: 'organization_name',
            description: 'Name of the organization',
            type: 'string',
            required: true,
            example_value: 'Both Sides Academy'
          },
          {
            name: 'user_name',
            description: 'Name of the user',
            type: 'string',
            required: true,
            example_value: 'John Doe'
          },
          {
            name: 'login_url',
            description: 'URL to login to the platform',
            type: 'string',
            required: true,
            example_value: 'https://app.bothsides.academy/login'
          }
        ],
        localization: [
          {
            language: 'en',
            locale: 'en-US',
            subject: 'Welcome to {{organization_name}}!',
            content: `
              <h1>Welcome to {{organization_name}}!</h1>
              <p>Hi {{user_name}},</p>
              <p>We're excited to have you join our community of critical thinkers and debaters.</p>
            `,
            variables: {}
          },
          {
            language: 'es',
            locale: 'es-ES',
            subject: '¡Bienvenido a {{organization_name}}!',
            content: `
              <h1>¡Bienvenido a {{organization_name}}!</h1>
              <p>Hola {{user_name}},</p>
              <p>Estamos emocionados de tenerte en nuestra comunidad de pensadores críticos y debatientes.</p>
            `,
            variables: {}
          }
        ],
        styling: {
          template_type: 'html',
          header_settings: {
            include_logo: true,
            logo_position: 'center',
            background_color: '#f8fafc',
            text_color: '#1e293b',
            height: 80
          },
          footer_settings: {
            include_unsubscribe: true,
            include_social_links: false,
            include_contact_info: true,
            background_color: '#f1f5f9',
            text_color: '#64748b'
          },
          color_scheme: {
            background_color: '#ffffff',
            primary_color: '#3b82f6',
            secondary_color: '#64748b',
            text_color: '#1e293b',
            link_color: '#3b82f6',
            button_color: '#3b82f6',
            border_color: '#e2e8f0'
          },
          typography: {
            font_family: 'Inter, sans-serif',
            heading_size: 24,
            body_size: 16,
            line_height: 1.6
          },
          layout: {
            width: 600,
            padding: 32,
            border_radius: 8,
            shadow: true,
            responsive: true
          }
        },
        preview_data: {
          organization_name: 'Both Sides Academy',
          user_name: 'John Doe',
          login_url: 'https://app.bothsides.academy/login'
        },
        usage_count: 1247,
        last_modified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        modified_by: 'admin',
        status: 'active'
      },
      {
        id: 'template_2',
        name: 'Debate Invitation',
        description: 'Invite users to participate in upcoming debates',
        category: 'invitation',
        subject: 'You\'re invited to debate: {{debate_topic}}',
        content: `
          <h1>Join the Debate!</h1>
          <p>Hi {{user_name}},</p>
          <p>You've been matched for an exciting debate on:</p>
          <h2>{{debate_topic}}</h2>
          <p>Debate Details:</p>
          <ul>
            <li>Date: {{debate_date}}</li>
            <li>Time: {{debate_time}}</li>
            <li>Your Position: {{user_position}}</li>
            <li>Opponent: {{opponent_name}}</li>
          </ul>
          <p>Click the button below to accept this invitation:</p>
          <a href="{{accept_url}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a>
          <p>Good luck and happy debating!</p>
        `,
        variables: [
          {
            name: 'user_name',
            description: 'Name of the invited user',
            type: 'string',
            required: true,
            example_value: 'Alice Johnson'
          },
          {
            name: 'debate_topic',
            description: 'Topic of the debate',
            type: 'string',
            required: true,
            example_value: 'Should social media be regulated by governments?'
          },
          {
            name: 'debate_date',
            description: 'Date of the debate',
            type: 'date',
            required: true,
            example_value: 'March 15, 2024'
          },
          {
            name: 'user_position',
            description: 'Position assigned to the user',
            type: 'string',
            required: true,
            example_value: 'Pro'
          }
        ],
        localization: [],
        styling: {
          template_type: 'html',
          header_settings: {
            include_logo: true,
            logo_position: 'left',
            background_color: '#3b82f6',
            text_color: '#ffffff',
            height: 60
          },
          footer_settings: {
            include_unsubscribe: true,
            include_social_links: true,
            include_contact_info: true,
            background_color: '#f8fafc',
            text_color: '#64748b'
          },
          color_scheme: {
            background_color: '#ffffff',
            primary_color: '#3b82f6',
            secondary_color: '#8b5cf6',
            text_color: '#1e293b',
            link_color: '#3b82f6',
            button_color: '#3b82f6',
            border_color: '#e2e8f0'
          },
          typography: {
            font_family: 'Inter, sans-serif',
            heading_size: 20,
            body_size: 16,
            line_height: 1.5
          },
          layout: {
            width: 600,
            padding: 24,
            border_radius: 8,
            shadow: false,
            responsive: true
          }
        },
        preview_data: {
          user_name: 'Alice Johnson',
          debate_topic: 'Should social media be regulated by governments?',
          debate_date: 'March 15, 2024',
          debate_time: '2:00 PM EST',
          user_position: 'Pro',
          opponent_name: 'Bob Wilson',
          accept_url: 'https://app.bothsides.academy/debates/accept/123'
        },
        usage_count: 892,
        last_modified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        modified_by: 'teacher_1',
        status: 'active'
      }
    ];

    // Mock themes
    const mockThemes: ThemeSettings[] = [
      {
        id: 'theme_light',
        name: 'Light Theme',
        description: 'Clean and bright theme for optimal readability',
        type: 'light',
        colors: {
          theme_mode: 'light',
          primary_color: '#3b82f6',
          secondary_color: '#64748b',
          accent_color: '#8b5cf6',
          background_color: '#ffffff',
          surface_color: '#f8fafc',
          text_color: '#1e293b',
          text_muted_color: '#64748b',
          border_color: '#e2e8f0',
          error_color: '#ef4444',
          warning_color: '#f59e0b',
          success_color: '#22c55e',
          info_color: '#3b82f6',
          custom_colors: {}
        },
        typography: {
          font_family: 'Inter',
          font_sizes: {
            xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36
          },
          font_weights: {
            thin: 100, light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800
          },
          line_heights: {
            none: 1, tight: 1.25, snug: 1.375, normal: 1.5, relaxed: 1.625, loose: 2
          },
          letter_spacing: {
            tighter: -0.05, tight: -0.025, normal: 0, wide: 0.025, wider: 0.05, widest: 0.1
          }
        },
        accessibility: {
          high_contrast_mode: false,
          large_text_mode: false,
          reduced_motion: false,
          focus_indicators: true,
          keyboard_navigation: true,
          screen_reader_optimized: true,
          color_blind_friendly: true,
          font_size_multiplier: 1,
          line_height_multiplier: 1,
          color_contrast_ratio: 4.5,
          alternative_text_required: true
        },
        built_in: true,
        usage_count: 1500,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15')
      },
      {
        id: 'theme_dark',
        name: 'Dark Theme',
        description: 'Easy on the eyes theme for low-light environments',
        type: 'dark',
        colors: {
          theme_mode: 'dark',
          primary_color: '#60a5fa',
          secondary_color: '#94a3b8',
          accent_color: '#a78bfa',
          background_color: '#0f172a',
          surface_color: '#1e293b',
          text_color: '#f1f5f9',
          text_muted_color: '#94a3b8',
          border_color: '#334155',
          error_color: '#f87171',
          warning_color: '#fbbf24',
          success_color: '#4ade80',
          info_color: '#60a5fa',
          custom_colors: {}
        },
        typography: {
          font_family: 'Inter',
          font_sizes: {
            xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36
          },
          font_weights: {
            thin: 100, light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800
          },
          line_heights: {
            none: 1, tight: 1.25, snug: 1.375, normal: 1.5, relaxed: 1.625, loose: 2
          },
          letter_spacing: {
            tighter: -0.05, tight: -0.025, normal: 0, wide: 0.025, wider: 0.05, widest: 0.1
          }
        },
        accessibility: {
          high_contrast_mode: false,
          large_text_mode: false,
          reduced_motion: false,
          focus_indicators: true,
          keyboard_navigation: true,
          screen_reader_optimized: true,
          color_blind_friendly: true,
          font_size_multiplier: 1,
          line_height_multiplier: 1,
          color_contrast_ratio: 7,
          alternative_text_required: true
        },
        built_in: true,
        usage_count: 890,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15')
      },
      {
        id: 'theme_high_contrast',
        name: 'High Contrast',
        description: 'Maximum accessibility with high contrast colors',
        type: 'high_contrast',
        colors: {
          theme_mode: 'light',
          primary_color: '#000000',
          secondary_color: '#666666',
          accent_color: '#0066cc',
          background_color: '#ffffff',
          surface_color: '#f5f5f5',
          text_color: '#000000',
          text_muted_color: '#333333',
          border_color: '#000000',
          error_color: '#cc0000',
          warning_color: '#ff6600',
          success_color: '#009900',
          info_color: '#0066cc',
          custom_colors: {}
        },
        typography: {
          font_family: 'Inter',
          font_sizes: {
            xs: 14, sm: 16, base: 18, lg: 20, xl: 22, '2xl': 26, '3xl': 32, '4xl': 38
          },
          font_weights: {
            thin: 400, light: 400, normal: 600, medium: 600, semibold: 700, bold: 700, extrabold: 800
          },
          line_heights: {
            none: 1.2, tight: 1.4, snug: 1.5, normal: 1.6, relaxed: 1.8, loose: 2.2
          },
          letter_spacing: {
            tighter: 0, tight: 0, normal: 0.025, wide: 0.05, wider: 0.075, widest: 0.1
          }
        },
        accessibility: {
          high_contrast_mode: true,
          large_text_mode: true,
          reduced_motion: true,
          focus_indicators: true,
          keyboard_navigation: true,
          screen_reader_optimized: true,
          color_blind_friendly: true,
          font_size_multiplier: 1.25,
          line_height_multiplier: 1.2,
          color_contrast_ratio: 7,
          alternative_text_required: true
        },
        built_in: true,
        usage_count: 156,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15')
      }
    ];

    setBrandingSettings(mockBrandingSettings);
    setEmailTemplates(mockEmailTemplates);
    setThemes(mockThemes);
    setIsLoading(false);
  };

  const updateBrandingSetting = (path: string, value: any) => {
    if (!canCustomizeBranding) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to customize branding.'
      });
      return;
    }

    setBrandingSettings(prev => {
      if (!prev) return prev;
      
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const saveBrandingSettings = () => {
    addNotification({
      type: 'success',
      title: 'Settings Saved',
      message: 'Branding settings have been updated successfully.'
    });
  };

  const previewEmailTemplate = (template: EmailTemplate, language = 'en') => {
    let content = template.content;
    const localization = template.localization.find(l => l.language === language);
    
    if (localization) {
      content = localization.content;
    }
    
    // Replace variables with preview data
    Object.entries(template.preview_data).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });
    
    return content;
  };

  const getPreviewIcon = (mode: string) => {
    switch (mode) {
      case 'desktop': return Monitor;
      case 'tablet': return Tablet;
      case 'mobile': return Smartphone;
      default: return Monitor;
    }
  };

  const filteredEmailTemplates = emailTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            Customization Tools
          </h3>
          <p className="text-sm text-muted-foreground">
            Customize branding, themes, and email templates for your organization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
            {(['desktop', 'tablet', 'mobile'] as const).map((mode) => {
              const Icon = getPreviewIcon(mode);
              return (
                <Button
                  key={mode}
                  variant={previewMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode(mode)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
          <Button onClick={() => setShowPreviewDialog(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
          <TabsTrigger value="white-label">White Label</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          {brandingSettings && (
            <>
              {/* Organization Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Organization Information</CardTitle>
                  <CardDescription>
                    Basic information displayed across your platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Organization Name</Label>
                      <Input
                        value={brandingSettings.organization_name}
                        onChange={(e) => updateBrandingSetting('organization_name', e.target.value)}
                        placeholder="Enter organization name"
                      />
                    </div>
                    <div>
                      <Label>Tagline</Label>
                      <Input
                        value={brandingSettings.tagline}
                        onChange={(e) => updateBrandingSetting('tagline', e.target.value)}
                        placeholder="Enter tagline or motto"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logo & Branding */}
              <Card>
                <CardHeader>
                  <CardTitle>Logo & Visual Identity</CardTitle>
                  <CardDescription>
                    Upload and configure your organization's visual elements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <Label>Primary Logo</Label>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                          <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">Click to upload logo</p>
                          <Button variant="outline" size="sm">
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recommended: PNG or SVG, 200x60px
                        </p>
                      </div>
                      
                      <div>
                        <Label>Dark Mode Logo</Label>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center bg-slate-900">
                          <Camera className="h-6 w-6 mx-auto text-slate-400 mb-2" />
                          <p className="text-xs text-slate-400 mb-2">Logo for dark backgrounds</p>
                          <Button variant="secondary" size="sm">
                            <Upload className="h-3 w-3 mr-1" />
                            Upload
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Logo Position</Label>
                        <Select
                          value={brandingSettings.logo.logo_position}
                          onValueChange={(value: any) => updateBrandingSetting('logo.logo_position', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Logo Size</Label>
                        <Select
                          value={brandingSettings.logo.logo_size}
                          onValueChange={(value: any) => updateBrandingSetting('logo.logo_size', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={brandingSettings.logo.show_organization_name}
                          onCheckedChange={(checked) => updateBrandingSetting('logo.show_organization_name', checked)}
                        />
                        <Label>Show organization name with logo</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Color Scheme */}
              <Card>
                <CardHeader>
                  <CardTitle>Color Scheme</CardTitle>
                  <CardDescription>
                    Define your brand colors and visual style
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label>Primary Color</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="color"
                          value={brandingSettings.color_scheme.primary_color}
                          onChange={(e) => updateBrandingSetting('color_scheme.primary_color', e.target.value)}
                          className="w-12 h-8 rounded border border-input"
                        />
                        <Input
                          value={brandingSettings.color_scheme.primary_color}
                          onChange={(e) => updateBrandingSetting('color_scheme.primary_color', e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Secondary Color</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="color"
                          value={brandingSettings.color_scheme.secondary_color}
                          onChange={(e) => updateBrandingSetting('color_scheme.secondary_color', e.target.value)}
                          className="w-12 h-8 rounded border border-input"
                        />
                        <Input
                          value={brandingSettings.color_scheme.secondary_color}
                          onChange={(e) => updateBrandingSetting('color_scheme.secondary_color', e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Accent Color</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="color"
                          value={brandingSettings.color_scheme.accent_color}
                          onChange={(e) => updateBrandingSetting('color_scheme.accent_color', e.target.value)}
                          className="w-12 h-8 rounded border border-input"
                        />
                        <Input
                          value={brandingSettings.color_scheme.accent_color}
                          onChange={(e) => updateBrandingSetting('color_scheme.accent_color', e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Success Color</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="color"
                          value={brandingSettings.color_scheme.success_color}
                          onChange={(e) => updateBrandingSetting('color_scheme.success_color', e.target.value)}
                          className="w-12 h-8 rounded border border-input"
                        />
                        <Input
                          value={brandingSettings.color_scheme.success_color}
                          onChange={(e) => updateBrandingSetting('color_scheme.success_color', e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="mb-3 block">Preset Colors</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.value}
                          className="w-10 h-10 rounded-lg border-2 border-transparent hover:border-ring transition-colors"
                          style={{ backgroundColor: color.value }}
                          onClick={() => updateBrandingSetting('color_scheme.primary_color', color.value)}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Typography */}
              <Card>
                <CardHeader>
                  <CardTitle>Typography</CardTitle>
                  <CardDescription>
                    Choose fonts and text styling for your platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Primary Font</Label>
                      <Select
                        value={brandingSettings.typography.font_family}
                        onValueChange={(value) => updateBrandingSetting('typography.font_family', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              <div style={{ fontFamily: font.value }}>
                                {font.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Heading Font</Label>
                      <Select
                        value={brandingSettings.typography.heading_font}
                        onValueChange={(value) => updateBrandingSetting('typography.heading_font', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              <div style={{ fontFamily: font.value }}>
                                {font.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Monospace Font</Label>
                      <Select
                        value={brandingSettings.typography.monospace_font}
                        onValueChange={(value) => updateBrandingSetting('typography.monospace_font', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.filter(f => f.category === 'monospace').map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              <div style={{ fontFamily: font.value }}>
                                {font.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2" style={{ fontFamily: brandingSettings.typography.heading_font }}>
                      Typography Preview
                    </h4>
                    <p className="text-sm" style={{ fontFamily: brandingSettings.typography.font_family }}>
                      This is how your text will appear with the selected fonts. 
                      The heading uses your chosen heading font, while this body text uses your primary font selection.
                    </p>
                    <code className="text-xs bg-background px-2 py-1 rounded mt-2 inline-block" style={{ fontFamily: brandingSettings.typography.monospace_font }}>
                      console.log('Monospace font example');
                    </code>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={saveBrandingSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Branding Settings
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="themes" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold">Theme Gallery</h4>
              <p className="text-sm text-muted-foreground">
                Choose from pre-built themes or create your own
              </p>
            </div>
            {canManageThemes && (
              <Button onClick={() => setShowThemeDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Theme
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <Card key={theme.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{theme.name}</CardTitle>
                      <CardDescription className="text-sm">{theme.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-1">
                      {theme.type === 'light' && <Sun className="h-4 w-4 text-yellow-500" />}
                      {theme.type === 'dark' && <Moon className="h-4 w-4 text-blue-500" />}
                      {theme.type === 'high_contrast' && <Contrast className="h-4 w-4 text-purple-500" />}
                      {theme.built_in && <Badge variant="outline" className="text-xs">Built-in</Badge>}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Color Preview */}
                  <div className="flex space-x-1 mb-3">
                    <div 
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: theme.colors.primary_color }}
                      title="Primary"
                    />
                    <div 
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: theme.colors.secondary_color }}
                      title="Secondary"
                    />
                    <div 
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: theme.colors.accent_color }}
                      title="Accent"
                    />
                    <div 
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: theme.colors.success_color }}
                      title="Success"
                    />
                  </div>
                  
                  {/* Theme Stats */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Font:</span>
                      <span className="font-medium">{theme.typography.font_family}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Usage:</span>
                      <span className="font-medium">{theme.usage_count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accessibility:</span>
                      <div className="flex items-center space-x-1">
                        {theme.accessibility.high_contrast_mode && <Contrast className="h-3 w-3" />}
                        {theme.accessibility.screen_reader_optimized && <Accessibility className="h-3 w-3" />}
                        {theme.accessibility.keyboard_navigation && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedTheme(theme);
                        addNotification({
                          type: 'success',
                          title: 'Theme Applied',
                          message: `${theme.name} has been applied to your organization.`
                        });
                      }}
                    >
                      Apply Theme
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedTheme(theme);
                        setShowPreviewDialog(true);
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    {canManageThemes && !theme.built_in && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedTheme(theme);
                          setShowThemeDialog(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="emails" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search email templates..."
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
                    {EMAIL_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Email Templates */}
          <div className="grid gap-4">
            {filteredEmailTemplates.map((template) => (
              <Card key={template.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="outline" className="capitalize">
                            {template.category.replace('_', ' ')}
                          </Badge>
                          <Badge className={template.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                            {template.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                          <span>Used {template.usage_count.toLocaleString()} times</span>
                          <span>Last modified {template.last_modified.toLocaleDateString()}</span>
                          {template.localization.length > 0 && (
                            <span>{template.localization.length + 1} languages</span>
                          )}
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
                        <DropdownMenuItem onClick={() => {
                          setSelectedTemplate(template);
                          setShowPreviewDialog(true);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        {canEditEmailTemplates && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedTemplate(template);
                            setShowTemplateDialog(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Template
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => {
                          // Duplicate template logic
                          addNotification({
                            type: 'success',
                            title: 'Template Duplicated',
                            message: `${template.name} has been duplicated.`
                          });
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Export Template
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4 mb-4">
                    <div className="text-sm font-medium mb-1">Subject</div>
                    <div className="text-sm text-muted-foreground">{template.subject}</div>
                  </div>
                  
                  {template.variables.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-2">Variables</div>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.slice(0, 6).map((variable) => (
                          <Badge key={variable.name} variant="outline" className="text-xs">
                            {variable.name}
                          </Badge>
                        ))}
                        {template.variables.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.variables.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      {template.localization.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Languages className="h-3 w-3" />
                          <span>{template.localization.length + 1} languages</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowPreviewDialog(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      {canEditEmailTemplates && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowTemplateDialog(true);
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="white-label" className="space-y-6">
          {brandingSettings && canUseWhiteLabel ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>White Label Configuration</CardTitle>
                  <CardDescription>
                    Remove branding and customize the platform for your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Enable White Label Mode</h4>
                      <p className="text-sm text-muted-foreground">
                        Hide platform branding and use your own
                      </p>
                    </div>
                    <Switch
                      checked={brandingSettings.white_label_settings.enabled}
                      onCheckedChange={(checked) => updateBrandingSetting('white_label_settings.enabled', checked)}
                    />
                  </div>
                  
                  {brandingSettings.white_label_settings.enabled && (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Custom App Name</Label>
                          <Input
                            value={brandingSettings.white_label_settings.custom_app_name}
                            onChange={(e) => updateBrandingSetting('white_label_settings.custom_app_name', e.target.value)}
                            placeholder="Your App Name"
                          />
                        </div>
                        <div>
                          <Label>Support Email</Label>
                          <Input
                            type="email"
                            value={brandingSettings.white_label_settings.custom_support_email}
                            onChange={(e) => updateBrandingSetting('white_label_settings.custom_support_email', e.target.value)}
                            placeholder="support@yourdomain.com"
                          />
                        </div>
                        <div>
                          <Label>Custom Domain</Label>
                          <Input
                            value={brandingSettings.white_label_settings.custom_domain || ''}
                            onChange={(e) => updateBrandingSetting('white_label_settings.custom_domain', e.target.value)}
                            placeholder="yourdomain.com"
                          />
                        </div>
                        <div>
                          <Label>Privacy Policy URL</Label>
                          <Input
                            value={brandingSettings.white_label_settings.custom_privacy_url || ''}
                            onChange={(e) => updateBrandingSetting('white_label_settings.custom_privacy_url', e.target.value)}
                            placeholder="https://yourdomain.com/privacy"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={brandingSettings.white_label_settings.hide_branding}
                            onCheckedChange={(checked) => updateBrandingSetting('white_label_settings.hide_branding', checked)}
                          />
                          <Label>Hide all platform branding</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={brandingSettings.white_label_settings.remove_powered_by}
                            onCheckedChange={(checked) => updateBrandingSetting('white_label_settings.remove_powered_by', checked)}
                          />
                          <Label>Remove "Powered by" attribution</Label>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">White Label Not Available</h3>
                <p className="text-muted-foreground mb-4">
                  White label customization requires an enterprise plan or special permissions.
                </p>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>
              See how your customizations will look
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <div className="text-center py-12">
              <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
              <p className="text-muted-foreground">
                Live preview of your customizations would be displayed here
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
