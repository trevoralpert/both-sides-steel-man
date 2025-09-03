/**
 * System Documentation Component
 * 
 * Task 8.5.4: Auto-generated system configuration documentation, change log tracking
 * for all system modifications, and help system integration with contextual assistance
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
  BookOpen,
  FileText,
  HelpCircle,
  History,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Settings,
  RefreshCw,
  Save,
  RotateCcw,
  ExternalLink,
  Code,
  Database,
  Server,
  Globe,
  Shield,
  Users,
  Mail,
  Bell,
  Activity,
  Clock,
  Calendar,
  Tag,
  Star,
  Heart,
  Lightbulb,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  Image,
  Video,
  Archive,
  Link,
  Bookmark,
  Navigation,
  Map,
  Compass,
  Target,
  Zap,
  Wrench,
  Tool,
  Bug,
  TestTube,
  Gauge,
  Monitor,
  Smartphone,
  Tablet,
  Laptop
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface DocumentationSection {
  id: string;
  title: string;
  description: string;
  category: DocumentationCategory;
  type: DocumentationType;
  content: string;
  metadata: DocumentationMetadata;
  auto_generated: boolean;
  last_updated: Date;
  version: string;
  author: string;
  tags: string[];
  attachments: DocumentationAttachment[];
  related_sections: string[];
  change_history: DocumentationChange[];
  status: DocumentationStatus;
  access_level: AccessLevel;
}

type DocumentationCategory = 
  | 'configuration' | 'api_reference' | 'user_guide' | 'admin_guide' | 'troubleshooting' 
  | 'integration' | 'security' | 'deployment' | 'architecture' | 'changelog' | 'faq' | 'tutorials';

type DocumentationType = 'markdown' | 'html' | 'pdf' | 'video' | 'interactive' | 'code_sample' | 'diagram';
type DocumentationStatus = 'draft' | 'review' | 'published' | 'archived' | 'deprecated';
type AccessLevel = 'public' | 'internal' | 'admin' | 'developer' | 'restricted';

interface DocumentationMetadata {
  reading_time_minutes: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  prerequisites: string[];
  target_audience: string[];
  keywords: string[];
  external_references: ExternalReference[];
  last_reviewed: Date;
  review_due: Date;
  accuracy_score: number;
  completeness_score: number;
}

interface ExternalReference {
  title: string;
  url: string;
  type: 'documentation' | 'tutorial' | 'video' | 'blog' | 'forum' | 'github';
  description?: string;
}

interface DocumentationAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'code' | 'diagram' | 'archive';
  url: string;
  size_bytes: number;
  description?: string;
  alt_text?: string;
}

interface DocumentationChange {
  id: string;
  timestamp: Date;
  user_id: string;
  user_name: string;
  action: 'created' | 'updated' | 'deleted' | 'published' | 'archived' | 'moved' | 'merged';
  description: string;
  changes_summary: ChangesSummary;
  version_before?: string;
  version_after: string;
  affected_sections: string[];
}

interface ChangesSummary {
  lines_added: number;
  lines_removed: number;
  lines_modified: number;
  sections_added: string[];
  sections_removed: string[];
  sections_modified: string[];
}

interface ChangelogEntry {
  id: string;
  version: string;
  release_date: Date;
  type: ReleaseType;
  title: string;
  description: string;
  changes: ChangelogChange[];
  breaking_changes: BreakingChange[];
  migration_guide?: string;
  author: string;
  tags: string[];
  related_issues: string[];
  rollback_instructions?: string;
}

type ReleaseType = 'major' | 'minor' | 'patch' | 'hotfix' | 'security' | 'beta' | 'alpha';

interface ChangelogChange {
  category: ChangeCategory;
  description: string;
  impact: 'high' | 'medium' | 'low';
  component?: string;
  ticket_id?: string;
}

type ChangeCategory = 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';

interface BreakingChange {
  description: string;
  impact: string;
  migration_steps: string[];
  deadline?: Date;
  alternatives?: string[];
}

interface HelpSystem {
  contextual_help: ContextualHelp[];
  guided_tours: GuidedTour[];
  knowledge_base: KnowledgeBaseArticle[];
  support_channels: SupportChannel[];
  feedback_system: FeedbackSystem;
}

interface ContextualHelp {
  id: string;
  page_path: string;
  element_selector?: string;
  trigger_type: 'hover' | 'click' | 'focus' | 'page_load' | 'first_visit';
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  priority: number;
  conditions: HelpCondition[];
  analytics: HelpAnalytics;
}

interface HelpCondition {
  type: 'user_role' | 'feature_flag' | 'user_property' | 'page_state' | 'time_based';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

interface HelpAnalytics {
  views: number;
  interactions: number;
  dismissals: number;
  effectiveness_score: number;
  user_feedback: number;
}

interface GuidedTour {
  id: string;
  title: string;
  description: string;
  target_audience: string[];
  steps: TourStep[];
  completion_rate: number;
  average_duration_minutes: number;
  user_feedback_score: number;
  enabled: boolean;
  triggers: TourTrigger[];
}

interface TourStep {
  id: string;
  title: string;
  content: string;
  element_selector?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action_required?: TourAction;
  skip_allowed: boolean;
  duration_seconds?: number;
}

interface TourAction {
  type: 'click' | 'input' | 'select' | 'wait' | 'navigate';
  target?: string;
  value?: string;
  timeout_seconds: number;
}

interface TourTrigger {
  type: 'manual' | 'first_login' | 'feature_first_use' | 'page_visit_count' | 'time_based';
  condition?: any;
  delay_seconds: number;
}

interface KnowledgeBaseArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  author: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
  status: 'draft' | 'review' | 'published' | 'archived';
  view_count: number;
  helpful_votes: number;
  unhelpful_votes: number;
  related_articles: string[];
  attachments: DocumentationAttachment[];
  search_keywords: string[];
}

interface SupportChannel {
  id: string;
  name: string;
  type: 'chat' | 'email' | 'phone' | 'forum' | 'documentation' | 'video_call';
  description: string;
  availability: AvailabilitySchedule;
  response_time: ResponseTimeInfo;
  contact_info: ContactInfo;
  enabled: boolean;
  priority_order: number;
}

interface AvailabilitySchedule {
  timezone: string;
  business_hours: BusinessHours[];
  holidays: Date[];
  maintenance_windows: MaintenanceWindow[];
}

interface BusinessHours {
  day_of_week: number; // 0-6, Sunday-Saturday
  start_time: string; // HH:MM
  end_time: string; // HH:MM
}

interface MaintenanceWindow {
  start_time: Date;
  end_time: Date;
  description: string;
}

interface ResponseTimeInfo {
  typical_response_minutes: number;
  max_response_hours: number;
  sla_percentage: number;
  current_queue_length: number;
}

interface ContactInfo {
  email?: string;
  phone?: string;
  chat_url?: string;
  forum_url?: string;
  calendar_url?: string;
}

interface FeedbackSystem {
  enabled: boolean;
  feedback_types: FeedbackType[];
  collection_methods: FeedbackMethod[];
  analytics: FeedbackAnalytics;
}

interface FeedbackType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  follow_up_questions: string[];
}

interface FeedbackMethod {
  type: 'inline_widget' | 'modal' | 'sidebar' | 'page_exit' | 'email_survey';
  trigger_conditions: HelpCondition[];
  targeting: FeedbackTargeting;
  settings: FeedbackSettings;
}

interface FeedbackTargeting {
  pages: string[];
  user_segments: string[];
  feature_flags: string[];
  sampling_rate: number;
}

interface FeedbackSettings {
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  delay_seconds: number;
  max_displays_per_user: number;
  dismiss_timeout_seconds?: number;
  required_fields: string[];
}

interface FeedbackAnalytics {
  total_responses: number;
  response_rate: number;
  average_rating: number;
  sentiment_score: number;
  top_issues: FeedbackIssue[];
  improvement_suggestions: string[];
}

interface FeedbackIssue {
  category: string;
  description: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
}

interface DocumentationStats {
  total_sections: number;
  published_sections: number;
  draft_sections: number;
  auto_generated_sections: number;
  average_reading_time: number;
  total_views: number;
  search_queries: number;
  user_feedback_score: number;
  content_freshness_score: number;
  coverage_percentage: number;
}

interface SystemDocumentationProps {
  organizationId?: string;
  canEditDocumentation?: boolean;
  canViewSystemDocs?: boolean;
  canManageHelpSystem?: boolean;
  showAdvancedFeatures?: boolean;
}

const DOCUMENTATION_CATEGORIES = [
  { value: 'configuration', label: 'Configuration', icon: Settings, color: 'text-blue-600' },
  { value: 'api_reference', label: 'API Reference', icon: Code, color: 'text-green-600' },
  { value: 'user_guide', label: 'User Guide', icon: BookOpen, color: 'text-purple-600' },
  { value: 'admin_guide', label: 'Admin Guide', icon: Shield, color: 'text-red-600' },
  { value: 'troubleshooting', label: 'Troubleshooting', icon: Wrench, color: 'text-orange-600' },
  { value: 'integration', label: 'Integration', icon: Globe, color: 'text-teal-600' },
  { value: 'security', label: 'Security', icon: Shield, color: 'text-red-600' },
  { value: 'deployment', label: 'Deployment', icon: Server, color: 'text-gray-600' },
  { value: 'architecture', label: 'Architecture', icon: Database, color: 'text-indigo-600' },
  { value: 'changelog', label: 'Changelog', icon: History, color: 'text-yellow-600' },
  { value: 'faq', label: 'FAQ', icon: HelpCircle, color: 'text-pink-600' },
  { value: 'tutorials', label: 'Tutorials', icon: Navigation, color: 'text-cyan-600' }
];

const CHANGE_CATEGORIES = [
  { value: 'added', label: 'Added', color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'changed', label: 'Changed', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'deprecated', label: 'Deprecated', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'removed', label: 'Removed', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'fixed', label: 'Fixed', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'security', label: 'Security', color: 'text-red-600 bg-red-50 border-red-200' }
];

export function SystemDocumentation({
  organizationId,
  canEditDocumentation = false,
  canViewSystemDocs = true,
  canManageHelpSystem = false,
  showAdvancedFeatures = false
}: SystemDocumentationProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('documentation');
  const [documentationSections, setDocumentationSections] = useState<DocumentationSection[]>([]);
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>([]);
  const [helpSystem, setHelpSystem] = useState<HelpSystem | null>(null);
  const [documentationStats, setDocumentationStats] = useState<DocumentationStats | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DocumentationCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentationStatus | 'all'>('all');
  
  const [selectedSection, setSelectedSection] = useState<DocumentationSection | null>(null);
  const [selectedChangelog, setSelectedChangelog] = useState<ChangelogEntry | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showChangelogDialog, setShowChangelogDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  useEffect(() => {
    loadDocumentationData();
  }, []);

  const loadDocumentationData = async () => {
    setIsLoading(true);
    
    // Mock documentation sections
    const mockSections: DocumentationSection[] = [
      {
        id: 'doc_1',
        title: 'System Configuration Overview',
        description: 'Complete guide to system configuration settings and options',
        category: 'configuration',
        type: 'markdown',
        content: `
# System Configuration Overview

This document provides a comprehensive overview of all system configuration options available in Both Sides Academy.

## Core Configuration Areas

### 1. Authentication & Security
- User authentication settings
- Session management
- Password policies
- Two-factor authentication
- IP whitelisting
- Rate limiting

### 2. Database Configuration
- Connection settings
- Performance tuning
- Backup schedules
- Monitoring thresholds

### 3. Integration Settings
- Third-party API configurations
- Webhook endpoints
- External service credentials
- Rate limiting policies

### 4. User Interface Customization
- Branding settings
- Theme configurations
- Layout preferences
- Accessibility options

## Best Practices

1. **Regular Review**: Review configuration settings monthly
2. **Change Control**: Document all configuration changes
3. **Testing**: Test configuration changes in staging first
4. **Backup**: Backup configurations before major changes
5. **Monitoring**: Monitor system after configuration changes

## Configuration Files

The system configuration is stored in the following locations:

\`\`\`
/app/config/
├── database.yml
├── redis.yml
├── integrations.yml
├── features.yml
└── security.yml
\`\`\`

## Environment Variables

Key environment variables:

- \`DATABASE_URL\`: Primary database connection
- \`REDIS_URL\`: Redis cache connection
- \`SECRET_KEY\`: Application secret key
- \`API_KEYS\`: External service API keys
- \`LOG_LEVEL\`: Application logging level

## Troubleshooting

Common configuration issues and solutions:

### Database Connection Issues
1. Verify connection string format
2. Check firewall settings
3. Confirm database server status
4. Review authentication credentials

### Integration Failures
1. Validate API keys
2. Check rate limiting
3. Review webhook configurations
4. Test network connectivity

For additional support, contact the system administration team.
        `,
        metadata: {
          reading_time_minutes: 8,
          difficulty_level: 'intermediate',
          prerequisites: ['System Administration Basics', 'YAML Configuration'],
          target_audience: ['administrators', 'developers'],
          keywords: ['configuration', 'setup', 'system', 'admin', 'settings'],
          external_references: [
            {
              title: 'YAML Configuration Best Practices',
              url: 'https://docs.example.com/yaml-best-practices',
              type: 'documentation',
              description: 'Industry best practices for YAML configuration'
            }
          ],
          last_reviewed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          review_due: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
          accuracy_score: 95,
          completeness_score: 88
        },
        auto_generated: true,
        last_updated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        version: '2.1.0',
        author: 'System Documentation Generator',
        tags: ['configuration', 'admin', 'setup', 'system'],
        attachments: [
          {
            id: 'att_1',
            name: 'system-architecture-diagram.png',
            type: 'image',
            url: '/docs/attachments/system-architecture-diagram.png',
            size_bytes: 245760,
            description: 'High-level system architecture diagram',
            alt_text: 'System architecture showing main components and data flow'
          }
        ],
        related_sections: ['doc_2', 'doc_3'],
        change_history: [
          {
            id: 'change_1',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            user_id: 'system',
            user_name: 'Auto-Generator',
            action: 'updated',
            description: 'Updated configuration examples and added troubleshooting section',
            changes_summary: {
              lines_added: 25,
              lines_removed: 5,
              lines_modified: 12,
              sections_added: ['Troubleshooting'],
              sections_removed: [],
              sections_modified: ['Configuration Files', 'Best Practices']
            },
            version_before: '2.0.3',
            version_after: '2.1.0',
            affected_sections: ['troubleshooting', 'configuration']
          }
        ],
        status: 'published',
        access_level: 'admin'
      },
      {
        id: 'doc_2',
        title: 'API Reference Guide',
        description: 'Complete API reference with endpoints, parameters, and examples',
        category: 'api_reference',
        type: 'markdown',
        content: `
# API Reference Guide

## Authentication

All API requests require authentication using a Bearer token:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.bothsides.academy/v1/
\`\`\`

## Base URL

\`https://api.bothsides.academy/v1\`

## Rate Limiting

- 1000 requests per hour for authenticated users
- 100 requests per hour for unauthenticated users
- Rate limit headers included in responses

## Endpoints

### Users

#### GET /users
Get list of users

**Parameters:**
- \`page\` (integer): Page number (default: 1)
- \`limit\` (integer): Items per page (default: 20, max: 100)
- \`search\` (string): Search term for user name or email

**Response:**
\`\`\`json
{
  "data": [
    {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
\`\`\`

#### POST /users
Create a new user

**Request Body:**
\`\`\`json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "student",
  "password": "secure_password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "id": "user_124",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "student",
  "created_at": "2024-03-15T14:20:00Z"
}
\`\`\`

### Debates

#### GET /debates
Get list of debates

#### POST /debates
Create a new debate

#### GET /debates/{id}
Get specific debate details

#### PUT /debates/{id}
Update debate information

#### DELETE /debates/{id}
Delete a debate

## Error Handling

API errors use standard HTTP status codes:

- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

Error response format:
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "email",
        "message": "Email format is invalid"
      }
    ]
  }
}
\`\`\`

## SDKs and Libraries

Official SDKs available for:
- JavaScript/Node.js
- Python
- Ruby
- PHP
- Go

## Webhooks

Configure webhooks to receive real-time updates:

Supported events:
- \`user.created\`
- \`user.updated\`
- \`debate.started\`
- \`debate.completed\`
- \`session.ended\`

## Changelog

See the [API Changelog](/docs/api-changelog) for version updates.
        `,
        metadata: {
          reading_time_minutes: 12,
          difficulty_level: 'intermediate',
          prerequisites: ['REST API Concepts', 'HTTP Authentication'],
          target_audience: ['developers', 'integrators'],
          keywords: ['api', 'rest', 'endpoints', 'authentication', 'webhooks'],
          external_references: [
            {
              title: 'REST API Design Best Practices',
              url: 'https://restfulapi.net/',
              type: 'documentation'
            }
          ],
          last_reviewed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          review_due: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
          accuracy_score: 98,
          completeness_score: 92
        },
        auto_generated: false,
        last_updated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        version: '3.2.1',
        author: 'dev_team',
        tags: ['api', 'reference', 'endpoints', 'developers'],
        attachments: [],
        related_sections: ['doc_4', 'doc_5'],
        change_history: [
          {
            id: 'change_2',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            user_id: 'dev_1',
            user_name: 'Sarah Developer',
            action: 'updated',
            description: 'Added webhook documentation and updated error handling examples',
            changes_summary: {
              lines_added: 45,
              lines_removed: 8,
              lines_modified: 15,
              sections_added: ['Webhooks'],
              sections_removed: [],
              sections_modified: ['Error Handling', 'SDKs and Libraries']
            },
            version_before: '3.2.0',
            version_after: '3.2.1',
            affected_sections: ['api_reference']
          }
        ],
        status: 'published',
        access_level: 'developer'
      },
      {
        id: 'doc_3',
        title: 'Troubleshooting Common Issues',
        description: 'Solutions for frequently encountered problems and error messages',
        category: 'troubleshooting',
        type: 'markdown',
        content: `
# Troubleshooting Common Issues

## Login and Authentication Issues

### Issue: "Invalid credentials" error
**Symptoms:** Users unable to log in with correct credentials
**Possible Causes:**
1. Account locked due to multiple failed attempts
2. Password reset required
3. Two-factor authentication configuration issue

**Solutions:**
1. Check account status in admin panel
2. Reset user password
3. Verify 2FA setup and backup codes

### Issue: "Session expired" appearing frequently
**Symptoms:** Users logged out unexpectedly
**Possible Causes:**
1. Session timeout too short
2. Clock synchronization issues
3. Load balancer configuration

**Solutions:**
1. Adjust session timeout in configuration
2. Verify server time synchronization
3. Review load balancer session affinity

## Database Connection Issues

### Issue: "Database connection failed"
**Symptoms:** Application cannot connect to database
**Diagnostic Steps:**
1. Check database server status
2. Verify connection string
3. Test network connectivity
4. Review authentication credentials

**Solutions:**
1. Restart database service if needed
2. Update connection parameters
3. Configure firewall rules
4. Rotate database credentials

### Issue: Slow query performance
**Symptoms:** Pages loading slowly, timeout errors
**Diagnostic Steps:**
1. Review slow query log
2. Check database indexes
3. Analyze query execution plans
4. Monitor resource usage

**Solutions:**
1. Optimize problematic queries
2. Add missing database indexes
3. Update table statistics
4. Consider query caching

## Integration Issues

### Issue: Third-party API failures
**Symptoms:** External service features not working
**Diagnostic Steps:**
1. Check API service status
2. Verify API credentials
3. Review rate limiting
4. Test API endpoints manually

**Solutions:**
1. Contact API provider for status
2. Rotate API keys
3. Implement exponential backoff
4. Add error handling and fallbacks

## Email Delivery Issues

### Issue: Emails not being delivered
**Symptoms:** Users not receiving notifications
**Diagnostic Steps:**
1. Check email service logs
2. Verify SMTP configuration
3. Review spam folder
4. Test email deliverability

**Solutions:**
1. Configure SPF/DKIM records
2. Review email content for spam triggers
3. Use reputable email service
4. Implement email bounced handling

## Performance Issues

### Issue: Application running slowly
**Symptoms:** High response times, timeout errors
**Diagnostic Steps:**
1. Monitor CPU and memory usage
2. Review application logs
3. Analyze database performance
4. Check network latency

**Solutions:**
1. Scale server resources
2. Optimize application code
3. Implement caching
4. Use CDN for static assets

## File Upload Issues

### Issue: File uploads failing
**Symptoms:** Upload errors, timeouts
**Diagnostic Steps:**
1. Check file size limits
2. Verify disk space
3. Review upload timeout settings
4. Test different file types

**Solutions:**
1. Increase upload limits
2. Clean up temporary files
3. Configure nginx/apache timeouts
4. Implement file validation

## Monitoring and Logging

### Enable Debug Logging
To enable detailed logging for troubleshooting:

1. Update log level in configuration:
   \`LOG_LEVEL=debug\`

2. Restart application services

3. Monitor log files:
   \`tail -f /app/logs/application.log\`

### Health Check Endpoints
Monitor system health using these endpoints:

- \`/health\` - Basic health check
- \`/health/database\` - Database connectivity
- \`/health/redis\` - Cache connectivity
- \`/health/integrations\` - External services

## Getting Help

If these solutions don't resolve your issue:

1. Check the knowledge base for additional articles
2. Review system logs for error details
3. Contact support with specific error messages
4. Include steps to reproduce the issue

### Support Channels
- Email: support@bothsides.academy
- Slack: #technical-support
- Documentation: docs.bothsides.academy
- Status Page: status.bothsides.academy
        `,
        metadata: {
          reading_time_minutes: 15,
          difficulty_level: 'intermediate',
          prerequisites: ['System Administration', 'Log Analysis'],
          target_audience: ['administrators', 'support', 'developers'],
          keywords: ['troubleshooting', 'errors', 'debugging', 'issues', 'solutions'],
          external_references: [],
          last_reviewed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          review_due: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000),
          accuracy_score: 92,
          completeness_score: 95
        },
        auto_generated: false,
        last_updated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        version: '1.4.2',
        author: 'support_team',
        tags: ['troubleshooting', 'support', 'debugging', 'issues'],
        attachments: [],
        related_sections: ['doc_1', 'doc_2'],
        change_history: [
          {
            id: 'change_3',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            user_id: 'support_1',
            user_name: 'Mike Support',
            action: 'updated',
            description: 'Added new troubleshooting section for file upload issues',
            changes_summary: {
              lines_added: 30,
              lines_removed: 2,
              lines_modified: 8,
              sections_added: ['File Upload Issues'],
              sections_removed: [],
              sections_modified: ['Getting Help']
            },
            version_before: '1.4.1',
            version_after: '1.4.2',
            affected_sections: ['troubleshooting']
          }
        ],
        status: 'published',
        access_level: 'internal'
      }
    ];

    // Mock changelog entries
    const mockChangelog: ChangelogEntry[] = [
      {
        id: 'changelog_1',
        version: '2.4.0',
        release_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        type: 'minor',
        title: 'Enhanced User Management and Performance Improvements',
        description: 'This release introduces enhanced user management features, performance optimizations, and several bug fixes.',
        changes: [
          {
            category: 'added',
            description: 'Advanced user role management with custom permissions',
            impact: 'medium',
            component: 'User Management',
            ticket_id: 'TASK-1234'
          },
          {
            category: 'added',
            description: 'Bulk user import/export functionality',
            impact: 'low',
            component: 'User Management',
            ticket_id: 'TASK-1235'
          },
          {
            category: 'changed',
            description: 'Improved database query performance by 40%',
            impact: 'high',
            component: 'Database',
            ticket_id: 'TASK-1240'
          },
          {
            category: 'fixed',
            description: 'Resolved session timeout issues in Safari browser',
            impact: 'medium',
            component: 'Authentication',
            ticket_id: 'BUG-567'
          },
          {
            category: 'fixed',
            description: 'Fixed email notification delivery delays',
            impact: 'medium',
            component: 'Email System',
            ticket_id: 'BUG-568'
          }
        ],
        breaking_changes: [],
        author: 'Release Team',
        tags: ['user-management', 'performance', 'bug-fixes'],
        related_issues: ['TASK-1234', 'TASK-1235', 'TASK-1240', 'BUG-567', 'BUG-568']
      },
      {
        id: 'changelog_2',
        version: '2.3.1',
        release_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        type: 'patch',
        title: 'Security Update and Bug Fixes',
        description: 'Critical security update addressing authentication vulnerabilities and several important bug fixes.',
        changes: [
          {
            category: 'security',
            description: 'Fixed SQL injection vulnerability in user search',
            impact: 'high',
            component: 'User Search',
            ticket_id: 'SEC-101'
          },
          {
            category: 'security',
            description: 'Enhanced password validation and strength requirements',
            impact: 'medium',
            component: 'Authentication',
            ticket_id: 'SEC-102'
          },
          {
            category: 'fixed',
            description: 'Corrected debate timer synchronization issues',
            impact: 'high',
            component: 'Debate Engine',
            ticket_id: 'BUG-543'
          },
          {
            category: 'fixed',
            description: 'Resolved file upload size validation errors',
            impact: 'low',
            component: 'File Upload',
            ticket_id: 'BUG-544'
          }
        ],
        breaking_changes: [
          {
            description: 'Password policy now requires minimum 12 characters with special characters',
            impact: 'Existing users will be prompted to update passwords on next login',
            migration_steps: [
              'Update password policy configuration',
              'Notify users of new requirements',
              'Provide password update workflow'
            ],
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        ],
        migration_guide: `
## Migration Guide for v2.3.1

### Password Policy Changes
The new version introduces stricter password requirements:

1. **Immediate Action Required:**
   - Update system configuration for new password policy
   - Prepare user communication about password changes

2. **User Impact:**
   - Users with weak passwords will be prompted to update on next login
   - New registration will require stronger passwords

3. **Timeline:**
   - All users must update passwords within 30 days
   - System will enforce policy starting immediately for new accounts
        `,
        author: 'Security Team',
        tags: ['security', 'authentication', 'bug-fixes'],
        related_issues: ['SEC-101', 'SEC-102', 'BUG-543', 'BUG-544'],
        rollback_instructions: `
## Rollback Instructions

If rollback is necessary:

1. Stop application services
2. Restore database backup from before upgrade
3. Deploy previous version (v2.3.0)
4. Update configuration to previous settings
5. Restart services
6. Verify system functionality

**Note:** Rollback will lose any data changes made after upgrade.
        `
      },
      {
        id: 'changelog_3',
        version: '2.2.0',
        release_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        type: 'minor',
        title: 'New Analytics Dashboard and Mobile Improvements',
        description: 'Introduction of comprehensive analytics dashboard and enhanced mobile experience.',
        changes: [
          {
            category: 'added',
            description: 'Comprehensive analytics dashboard with real-time metrics',
            impact: 'high',
            component: 'Analytics',
            ticket_id: 'FEAT-890'
          },
          {
            category: 'added',
            description: 'Mobile app push notifications',
            impact: 'medium',
            component: 'Mobile App',
            ticket_id: 'FEAT-891'
          },
          {
            category: 'changed',
            description: 'Redesigned mobile interface for better usability',
            impact: 'medium',
            component: 'Mobile App',
            ticket_id: 'TASK-892'
          },
          {
            category: 'deprecated',
            description: 'Legacy report generation API (v1)',
            impact: 'low',
            component: 'API',
            ticket_id: 'DEPRECATE-100'
          }
        ],
        breaking_changes: [],
        author: 'Product Team',
        tags: ['analytics', 'mobile', 'dashboard'],
        related_issues: ['FEAT-890', 'FEAT-891', 'TASK-892', 'DEPRECATE-100']
      }
    ];

    // Mock help system
    const mockHelpSystem: HelpSystem = {
      contextual_help: [
        {
          id: 'help_1',
          page_path: '/dashboard',
          element_selector: '.user-menu',
          trigger_type: 'hover',
          content: 'Click here to access your account settings, profile, and logout options.',
          position: 'bottom',
          priority: 1,
          conditions: [
            {
              type: 'user_role',
              operator: 'equals',
              value: 'new_user'
            }
          ],
          analytics: {
            views: 1234,
            interactions: 456,
            dismissals: 123,
            effectiveness_score: 78,
            user_feedback: 4.2
          }
        }
      ],
      guided_tours: [
        {
          id: 'tour_1',
          title: 'Welcome to Both Sides Academy',
          description: 'Get started with your first debate and explore key features',
          target_audience: ['new_users', 'students'],
          steps: [
            {
              id: 'step_1',
              title: 'Welcome!',
              content: 'Welcome to Both Sides Academy! Let\'s take a quick tour of the platform.',
              position: 'center',
              skip_allowed: true,
              duration_seconds: 5
            },
            {
              id: 'step_2',
              title: 'Your Dashboard',
              content: 'This is your dashboard where you can see upcoming debates and track your progress.',
              element_selector: '.dashboard-main',
              position: 'center',
              skip_allowed: true,
              duration_seconds: 8
            }
          ],
          completion_rate: 67,
          average_duration_minutes: 3.5,
          user_feedback_score: 4.1,
          enabled: true,
          triggers: [
            {
              type: 'first_login',
              delay_seconds: 2
            }
          ]
        }
      ],
      knowledge_base: [
        {
          id: 'kb_1',
          title: 'How to Create Your First Debate',
          summary: 'Step-by-step guide to creating and scheduling your first debate session',
          content: 'Detailed instructions for debate creation...',
          category: 'Getting Started',
          tags: ['debate', 'creation', 'tutorial'],
          author: 'Support Team',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          published_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          status: 'published',
          view_count: 2456,
          helpful_votes: 234,
          unhelpful_votes: 12,
          related_articles: ['kb_2', 'kb_3'],
          attachments: [],
          search_keywords: ['debate', 'create', 'first', 'tutorial', 'guide']
        }
      ],
      support_channels: [
        {
          id: 'support_1',
          name: 'Email Support',
          type: 'email',
          description: 'Get help via email for non-urgent issues',
          availability: {
            timezone: 'UTC',
            business_hours: [
              { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
              { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
              { day_of_week: 3, start_time: '09:00', end_time: '17:00' },
              { day_of_week: 4, start_time: '09:00', end_time: '17:00' },
              { day_of_week: 5, start_time: '09:00', end_time: '17:00' }
            ],
            holidays: [],
            maintenance_windows: []
          },
          response_time: {
            typical_response_minutes: 240,
            max_response_hours: 24,
            sla_percentage: 95,
            current_queue_length: 5
          },
          contact_info: {
            email: 'support@bothsides.academy'
          },
          enabled: true,
          priority_order: 2
        },
        {
          id: 'support_2',
          name: 'Live Chat',
          type: 'chat',
          description: 'Get immediate help through live chat',
          availability: {
            timezone: 'UTC',
            business_hours: [
              { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
              { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
              { day_of_week: 3, start_time: '09:00', end_time: '17:00' },
              { day_of_week: 4, start_time: '09:00', end_time: '17:00' },
              { day_of_week: 5, start_time: '09:00', end_time: '17:00' }
            ],
            holidays: [],
            maintenance_windows: []
          },
          response_time: {
            typical_response_minutes: 2,
            max_response_hours: 1,
            sla_percentage: 98,
            current_queue_length: 1
          },
          contact_info: {
            chat_url: 'https://chat.bothsides.academy'
          },
          enabled: true,
          priority_order: 1
        }
      ],
      feedback_system: {
        enabled: true,
        feedback_types: [
          {
            id: 'feedback_1',
            name: 'Bug Report',
            description: 'Report a bug or technical issue',
            icon: 'bug',
            color: 'red',
            follow_up_questions: ['What steps led to this issue?', 'What browser are you using?']
          },
          {
            id: 'feedback_2',
            name: 'Feature Request',
            description: 'Suggest a new feature or improvement',
            icon: 'lightbulb',
            color: 'blue',
            follow_up_questions: ['How would this help you?', 'What\'s your current workaround?']
          }
        ],
        collection_methods: [
          {
            type: 'inline_widget',
            trigger_conditions: [],
            targeting: {
              pages: ['*'],
              user_segments: ['all'],
              feature_flags: [],
              sampling_rate: 0.1
            },
            settings: {
              position: 'bottom',
              delay_seconds: 30,
              max_displays_per_user: 1,
              dismiss_timeout_seconds: 10,
              required_fields: ['message']
            }
          }
        ],
        analytics: {
          total_responses: 1234,
          response_rate: 12.5,
          average_rating: 4.2,
          sentiment_score: 0.65,
          top_issues: [
            {
              category: 'Performance',
              description: 'Page loading speed issues',
              frequency: 45,
              severity: 'medium',
              status: 'in_progress'
            }
          ],
          improvement_suggestions: [
            'Improve mobile navigation',
            'Add keyboard shortcuts',
            'Better search functionality'
          ]
        }
      }
    };

    // Mock documentation stats
    const mockStats: DocumentationStats = {
      total_sections: 45,
      published_sections: 38,
      draft_sections: 5,
      auto_generated_sections: 12,
      average_reading_time: 7.5,
      total_views: 12456,
      search_queries: 2345,
      user_feedback_score: 4.3,
      content_freshness_score: 85,
      coverage_percentage: 78
    };

    setDocumentationSections(mockSections);
    setChangelogEntries(mockChangelog);
    setHelpSystem(mockHelpSystem);
    setDocumentationStats(mockStats);
    setIsLoading(false);
  };

  const generateDocumentation = () => {
    if (!canEditDocumentation) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to generate documentation.'
      });
      return;
    }

    addNotification({
      type: 'info',
      title: 'Documentation Generation Started',
      message: 'Auto-generating documentation based on current system configuration...'
    });

    // Simulate generation process
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Documentation Generated',
        message: 'System documentation has been successfully updated with latest configuration.'
      });

      // Update stats
      if (documentationStats) {
        setDocumentationStats({
          ...documentationStats,
          auto_generated_sections: documentationStats.auto_generated_sections + 3,
          total_sections: documentationStats.total_sections + 3,
          content_freshness_score: 95
        });
      }
    }, 3000);
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const getCategoryIcon = (category: DocumentationCategory) => {
    const categoryData = DOCUMENTATION_CATEGORIES.find(c => c.value === category);
    return categoryData ? categoryData.icon : FileText;
  };

  const getCategoryColor = (category: DocumentationCategory) => {
    const categoryData = DOCUMENTATION_CATEGORIES.find(c => c.value === category);
    return categoryData ? categoryData.color : 'text-gray-600';
  };

  const getChangeColor = (category: ChangeCategory) => {
    const changeData = CHANGE_CATEGORIES.find(c => c.value === category);
    return changeData ? changeData.color : 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const filteredSections = documentationSections.filter(section => {
    const matchesSearch = section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || section.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || section.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            System Documentation
          </h3>
          <p className="text-sm text-muted-foreground">
            Auto-generated documentation, changelogs, and integrated help system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowGenerateDialog(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Docs
          </Button>
          {canEditDocumentation && (
            <Button onClick={() => setShowSectionDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          )}
        </div>
      </div>

      {/* Documentation Stats */}
      {documentationStats && (
        <Card>
          <CardHeader>
            <CardTitle>Documentation Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{documentationStats.total_sections}</div>
                <div className="text-xs text-muted-foreground">Total Sections</div>
                <div className="text-xs text-green-600 mt-1">
                  {documentationStats.published_sections} published
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">{documentationStats.coverage_percentage}%</div>
                <div className="text-xs text-muted-foreground">Coverage</div>
                <Progress value={documentationStats.coverage_percentage} className="h-1 mt-2" />
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">{documentationStats.total_views.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Views</div>
                <div className="text-xs text-blue-600 mt-1">
                  {documentationStats.search_queries.toLocaleString()} searches
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">{documentationStats.user_feedback_score.toFixed(1)}/5</div>
                <div className="text-xs text-muted-foreground">User Rating</div>
                <div className="text-xs text-purple-600 mt-1">
                  {documentationStats.content_freshness_score}% fresh
                </div>
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
                placeholder="Search documentation..."
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
                {DOCUMENTATION_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documentation">Documentation ({filteredSections.length})</TabsTrigger>
          <TabsTrigger value="changelog">Changelog ({changelogEntries.length})</TabsTrigger>
          <TabsTrigger value="help">Help System</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="documentation" className="space-y-4">
          {/* Documentation Sections */}
          <div className="space-y-4">
            {filteredSections.map((section) => {
              const CategoryIcon = getCategoryIcon(section.category);
              const isExpanded = expandedSections.has(section.id);
              
              return (
                <Card key={section.id} className="transition-all hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={`p-2 rounded-lg bg-muted ${getCategoryColor(section.category)}`}>
                          <CategoryIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold">{section.title}</h3>
                            <Badge variant="outline" className="capitalize">
                              {section.category.replace('_', ' ')}
                            </Badge>
                            <Badge className={
                              section.status === 'published' ? 'bg-green-500' :
                              section.status === 'draft' ? 'bg-gray-500' :
                              section.status === 'review' ? 'bg-yellow-500' : 'bg-red-500'
                            }>
                              {section.status}
                            </Badge>
                            {section.auto_generated && (
                              <Badge variant="outline" className="text-xs">
                                Auto-generated
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{section.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Version: {section.version}</span>
                            <span>Reading time: {section.metadata.reading_time_minutes} min</span>
                            <span>Difficulty: {section.metadata.difficulty_level}</span>
                            <span>Updated: {section.last_updated.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSectionExpansion(section.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedSection(section)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Full Content
                            </DropdownMenuItem>
                            {canEditDocumentation && (
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Section
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                            {section.metadata.external_references.length > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>External References</DropdownMenuLabel>
                                {section.metadata.external_references.slice(0, 3).map((ref) => (
                                  <DropdownMenuItem key={ref.url} onClick={() => window.open(ref.url, '_blank')}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    {ref.title}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Tags */}
                    {section.tags.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {section.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="grid gap-4 md:grid-cols-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">{section.metadata.accuracy_score}%</div>
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{section.metadata.completeness_score}%</div>
                        <div className="text-xs text-muted-foreground">Completeness</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{section.related_sections.length}</div>
                        <div className="text-xs text-muted-foreground">Related Sections</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{section.change_history.length}</div>
                        <div className="text-xs text-muted-foreground">Revisions</div>
                      </div>
                    </div>

                    {/* Expanded Content Preview */}
                    {isExpanded && (
                      <div className="border-t pt-4">
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Content Preview</h4>
                          <div className="bg-muted rounded-lg p-4 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                            {section.content.substring(0, 500)}
                            {section.content.length > 500 && '...'}
                          </div>
                        </div>
                        
                        {section.change_history.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Recent Changes</h4>
                            <div className="space-y-2">
                              {section.change_history.slice(0, 3).map((change) => (
                                <div key={change.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="capitalize text-xs">
                                      {change.action}
                                    </Badge>
                                    <span>{change.description}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <span>{change.user_name}</span>
                                    <span>{change.timestamp.toLocaleDateString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-xs text-muted-foreground">
                        By {section.author} • Review due: {section.metadata.review_due.toLocaleDateString()}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedSection(section)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        
                        {canEditDocumentation && (
                          <Button 
                            size="sm" 
                            variant="outline"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        )}
                        
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

        <TabsContent value="changelog" className="space-y-4">
          {changelogEntries.map((entry) => (
            <Card key={entry.id} className="transition-all hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-xl font-semibold">v{entry.version}</h3>
                      <Badge className={
                        entry.type === 'major' ? 'bg-red-500' :
                        entry.type === 'minor' ? 'bg-blue-500' :
                        entry.type === 'patch' ? 'bg-green-500' :
                        entry.type === 'security' ? 'bg-purple-500' : 'bg-gray-500'
                      }>
                        {entry.type}
                      </Badge>
                      {entry.breaking_changes.length > 0 && (
                        <Badge variant="destructive">Breaking Changes</Badge>
                      )}
                    </div>
                    <h4 className="text-lg font-medium mb-1">{entry.title}</h4>
                    <p className="text-muted-foreground mb-2">{entry.description}</p>
                    <div className="text-xs text-muted-foreground">
                      Released {entry.release_date.toLocaleDateString()} by {entry.author}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedChangelog(entry)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Changes */}
                <div className="space-y-3 mb-4">
                  {entry.changes.map((change, index) => (
                    <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg border ${getChangeColor(change.category)}`}>
                      <Badge variant="outline" className={`capitalize text-xs ${getChangeColor(change.category)}`}>
                        {change.category}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm">{change.description}</p>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                          {change.component && <span>Component: {change.component}</span>}
                          {change.ticket_id && <span>Ticket: {change.ticket_id}</span>}
                          <Badge variant="outline" className={`text-xs ${
                            change.impact === 'high' ? 'border-red-500 text-red-600' :
                            change.impact === 'medium' ? 'border-orange-500 text-orange-600' :
                            'border-green-500 text-green-600'
                          }`}>
                            {change.impact} impact
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Breaking Changes */}
                {entry.breaking_changes.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-red-600 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Breaking Changes
                    </h5>
                    <div className="space-y-2">
                      {entry.breaking_changes.map((breakingChange, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-red-800 mb-1">{breakingChange.description}</p>
                          <p className="text-xs text-red-700 mb-2">{breakingChange.impact}</p>
                          {breakingChange.deadline && (
                            <p className="text-xs text-red-600">
                              Deadline: {breakingChange.deadline.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-4 border-t">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="help" className="space-y-6">
          {helpSystem && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Help System Overview</CardTitle>
                  <CardDescription>
                    Contextual help, guided tours, and support channels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{helpSystem.contextual_help.length}</div>
                      <div className="text-xs text-muted-foreground">Help Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{helpSystem.guided_tours.length}</div>
                      <div className="text-xs text-muted-foreground">Guided Tours</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{helpSystem.knowledge_base.length}</div>
                      <div className="text-xs text-muted-foreground">KB Articles</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{helpSystem.support_channels.length}</div>
                      <div className="text-xs text-muted-foreground">Support Channels</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Support Channels */}
              <Card>
                <CardHeader>
                  <CardTitle>Support Channels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {helpSystem.support_channels.map((channel) => (
                      <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${channel.enabled ? 'bg-green-50' : 'bg-gray-50'}`}>
                            {channel.type === 'email' && <Mail className={`h-5 w-5 ${channel.enabled ? 'text-green-600' : 'text-gray-400'}`} />}
                            {channel.type === 'chat' && <Bell className={`h-5 w-5 ${channel.enabled ? 'text-green-600' : 'text-gray-400'}`} />}
                            {channel.type === 'phone' && <Bell className={`h-5 w-5 ${channel.enabled ? 'text-green-600' : 'text-gray-400'}`} />}
                          </div>
                          <div>
                            <h4 className="font-medium">{channel.name}</h4>
                            <p className="text-sm text-muted-foreground">{channel.description}</p>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                              <span>Response: {channel.response_time.typical_response_minutes}min avg</span>
                              <span>SLA: {channel.response_time.sla_percentage}%</span>
                              <span>Queue: {channel.response_time.current_queue_length}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant={channel.enabled ? 'default' : 'secondary'}>
                            {channel.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                          {canManageHelpSystem && (
                            <Switch checked={channel.enabled} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentation Analytics</CardTitle>
              <CardDescription>
                Usage metrics, feedback, and content performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground">
                  Detailed analytics and reporting would be implemented here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Documentation Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate System Documentation</DialogTitle>
            <DialogDescription>
              Automatically generate documentation based on current system configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Label>Documentation Types</Label>
                {['Configuration Reference', 'API Documentation', 'Troubleshooting Guide', 'Architecture Overview'].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <Label className="text-sm">{type}</Label>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3">
                <Label>Output Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <Label className="text-sm">Include code examples</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <Label className="text-sm">Auto-update on config changes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <Label className="text-sm">Generate PDF exports</Label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium mb-2">Preview</h4>
              <p className="text-sm text-muted-foreground">
                This will generate approximately 15-20 documentation sections covering:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                <li>Current system configuration settings</li>
                <li>API endpoints and authentication</li>
                <li>Common troubleshooting scenarios</li>
                <li>Integration setup guides</li>
                <li>Performance optimization tips</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              generateDocumentation();
              setShowGenerateDialog(false);
            }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate Documentation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Details Dialog */}
      <Dialog open={!!selectedSection} onOpenChange={() => setSelectedSection(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedSection?.title}</DialogTitle>
            <DialogDescription>
              {selectedSection?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedSection && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Category</Label>
                    <Badge variant="outline" className="capitalize mt-1 block w-fit">
                      {selectedSection.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <Label>Version</Label>
                    <div className="text-sm font-mono mt-1">{selectedSection.version}</div>
                  </div>
                  <div>
                    <Label>Reading Time</Label>
                    <div className="text-sm mt-1">{selectedSection.metadata.reading_time_minutes} minutes</div>
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Badge variant="outline" className="capitalize mt-1 block w-fit">
                      {selectedSection.metadata.difficulty_level}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label>Content</Label>
                  <div className="bg-muted rounded-lg p-4 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96 mt-2">
                    {selectedSection.content}
                  </div>
                </div>
                
                {selectedSection.metadata.external_references.length > 0 && (
                  <div>
                    <Label>External References</Label>
                    <div className="space-y-2 mt-2">
                      {selectedSection.metadata.external_references.map((ref, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <ExternalLink className="h-4 w-4 text-blue-600" />
                          <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {ref.title}
                          </a>
                          {ref.description && (
                            <span className="text-muted-foreground">- {ref.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSection(null)}>
              Close
            </Button>
            {canEditDocumentation && (
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Section
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
