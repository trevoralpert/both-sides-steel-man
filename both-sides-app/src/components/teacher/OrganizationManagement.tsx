/**
 * Organization Management Component
 * 
 * Task 8.5.1: Multi-tenant organization management with structure configuration,
 * settings management, collaboration controls, and cross-organizational features
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/components/ui/dropdown-menu';
import { 
  Building2,
  Settings,
  Plus,
  Edit,
  Copy,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  Users,
  School,
  Globe,
  Shield,
  Link,
  Unlink,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Star,
  Award,
  Target,
  Activity,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Download,
  Upload,
  FileText,
  Database,
  Palette,
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  UserCog,
  Zap,
  Lightbulb,
  Flag,
  Tag,
  Layers,
  TreePine,
  Network,
  GitBranch,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  Image,
  FileImage,
  Lock,
  Unlock,
  Key,
  Cpu,
  HardDrive,
  Wifi,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Server,
  Cloud,
  CloudCheck,
  MessageSquare,
  Bell,
  Volume2,
  VolumeX,
  Share2,
  UserCheck,
  UserX,
  Users2,
  Building,
  Home,
  GraduationCap,
  BookOpen
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
interface Organization {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: OrganizationType;
  status: 'active' | 'inactive' | 'suspended' | 'archived';
  tier: 'basic' | 'premium' | 'enterprise' | 'custom';
  parentId?: string;
  childOrganizations: string[];
  settings: OrganizationSettings;
  branding: OrganizationBranding;
  policies: OrganizationPolicies;
  collaboration: CollaborationSettings;
  analytics: OrganizationAnalytics;
  metadata: OrganizationMetadata;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface OrganizationType {
  category: 'k12' | 'higher_ed' | 'corporate' | 'nonprofit' | 'government' | 'other';
  subtype: string; // e.g., 'elementary_school', 'university', 'training_center'
  size: 'small' | 'medium' | 'large' | 'enterprise';
  region: string;
  timezone: string;
}

interface OrganizationSettings {
  general: GeneralSettings;
  features: FeatureSettings;
  integrations: IntegrationSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  resources: ResourceSettings;
}

interface GeneralSettings {
  defaultLanguage: string;
  dateFormat: string;
  timeFormat: string;
  defaultTimezone: string;
  sessionDuration: number; // minutes
  maxParticipants: number;
  allowGuests: boolean;
  publicDirectory: boolean;
  contactEmail: string;
  supportEmail: string;
  phoneNumber?: string;
  address?: OrganizationAddress;
}

interface OrganizationAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface FeatureSettings {
  debates: boolean;
  analytics: boolean;
  recordings: boolean;
  aiAssistance: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  ssoIntegration: boolean;
  advancedReporting: boolean;
  bulkOperations: boolean;
  customRoles: boolean;
  multiLanguage: boolean;
  mobileApp: boolean;
}

interface IntegrationSettings {
  lms: LMSIntegration[];
  sso: SSOIntegration[];
  calendar: CalendarIntegration[];
  communication: CommunicationIntegration[];
  storage: StorageIntegration[];
  analytics: AnalyticsIntegration[];
}

interface LMSIntegration {
  type: 'canvas' | 'blackboard' | 'moodle' | 'schoology' | 'google_classroom' | 'other';
  enabled: boolean;
  config: Record<string, any>;
  lastSync: Date;
  status: 'connected' | 'disconnected' | 'error';
}

interface SSOIntegration {
  type: 'saml' | 'oauth2' | 'ldap' | 'ad' | 'google' | 'microsoft';
  enabled: boolean;
  config: Record<string, any>;
  status: 'active' | 'inactive' | 'error';
}

interface CalendarIntegration {
  type: 'google' | 'outlook' | 'ical' | 'other';
  enabled: boolean;
  syncEvents: boolean;
  config: Record<string, any>;
}

interface CommunicationIntegration {
  type: 'slack' | 'teams' | 'discord' | 'email' | 'sms';
  enabled: boolean;
  config: Record<string, any>;
}

interface StorageIntegration {
  type: 'google_drive' | 'onedrive' | 'dropbox' | 's3' | 'local';
  enabled: boolean;
  config: Record<string, any>;
  usage: StorageUsage;
}

interface StorageUsage {
  used: number; // bytes
  limit: number; // bytes
  percentage: number;
}

interface AnalyticsIntegration {
  type: 'google_analytics' | 'mixpanel' | 'amplitude' | 'custom';
  enabled: boolean;
  config: Record<string, any>;
}

interface NotificationSettings {
  email: EmailNotificationSettings;
  push: PushNotificationSettings;
  inApp: InAppNotificationSettings;
  sms: SMSNotificationSettings;
}

interface EmailNotificationSettings {
  enabled: boolean;
  sessionReminders: boolean;
  weeklyDigests: boolean;
  systemUpdates: boolean;
  securityAlerts: boolean;
  template: string;
}

interface PushNotificationSettings {
  enabled: boolean;
  sessionStart: boolean;
  mentions: boolean;
  achievements: boolean;
  urgent: boolean;
}

interface InAppNotificationSettings {
  enabled: boolean;
  sound: boolean;
  badges: boolean;
  popups: boolean;
  duration: number; // seconds
}

interface SMSNotificationSettings {
  enabled: boolean;
  urgent: boolean;
  reminders: boolean;
  phoneNumbers: string[];
}

interface PrivacySettings {
  dataRetention: number; // days
  anonymizeData: boolean;
  shareWithParent: boolean;
  allowRecording: boolean;
  recordingConsent: 'explicit' | 'implicit' | 'disabled';
  dataExport: boolean;
  rightToDelete: boolean;
  consentTracking: boolean;
  minAge: number;
  parentalConsent: boolean;
}

interface ResourceSettings {
  storage: ResourceStorageSettings;
  bandwidth: ResourceBandwidthSettings;
  processing: ResourceProcessingSettings;
  concurrent: ResourceConcurrentSettings;
}

interface ResourceStorageSettings {
  limit: number; // GB
  recordings: number; // GB
  files: number; // GB
  backups: number; // GB
  autoCleanup: boolean;
  cleanupDays: number;
}

interface ResourceBandwidthSettings {
  limit: number; // Mbps
  videoQuality: 'low' | 'medium' | 'high' | 'adaptive';
  audioQuality: 'low' | 'medium' | 'high';
  throttling: boolean;
}

interface ResourceProcessingSettings {
  transcription: boolean;
  aiAnalysis: boolean;
  videoProcessing: boolean;
  concurrent: number;
  priority: 'low' | 'normal' | 'high';
}

interface ResourceConcurrentSettings {
  sessions: number;
  participants: number;
  recordings: number;
  uploads: number;
}

interface OrganizationBranding {
  logo: BrandingAsset;
  favicon: BrandingAsset;
  colors: BrandingColors;
  fonts: BrandingFonts;
  customCSS?: string;
  emailTemplates: Record<string, string>;
  loginPage: CustomLoginPage;
  dashboard: CustomDashboard;
}

interface BrandingAsset {
  url?: string;
  fileName?: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
  updatedAt?: Date;
}

interface BrandingColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  success: string;
  warning: string;
  error: string;
}

interface BrandingFonts {
  heading: string;
  body: string;
  monospace: string;
}

interface CustomLoginPage {
  enabled: boolean;
  title: string;
  subtitle: string;
  backgroundImage?: BrandingAsset;
  welcomeMessage: string;
}

interface CustomDashboard {
  enabled: boolean;
  layout: 'standard' | 'compact' | 'custom';
  widgets: DashboardWidget[];
  welcomeMessage: string;
}

interface DashboardWidget {
  id: string;
  type: 'sessions' | 'analytics' | 'announcements' | 'calendar' | 'quick_actions';
  enabled: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
}

interface OrganizationPolicies {
  terms: PolicyDocument;
  privacy: PolicyDocument;
  conduct: PolicyDocument;
  accessibility: PolicyDocument;
  custom: PolicyDocument[];
}

interface PolicyDocument {
  id: string;
  title: string;
  content: string;
  version: string;
  effectiveDate: Date;
  requiresAcceptance: boolean;
  acceptanceTracking: boolean;
  lastUpdated: Date;
  updatedBy: string;
}

interface CollaborationSettings {
  crossOrg: CrossOrgSettings;
  sharing: SharingSettings;
  partnerships: Partnership[];
  networks: OrganizationNetwork[];
}

interface CrossOrgSettings {
  enabled: boolean;
  allowInvitations: boolean;
  allowSharedSessions: boolean;
  allowResourceSharing: boolean;
  allowUserSharing: boolean;
  requireApproval: boolean;
  approvalWorkflow: ApprovalWorkflow[];
}

interface ApprovalWorkflow {
  step: number;
  role: string;
  required: boolean;
  timeout: number; // hours
  escalation: string;
}

interface SharingSettings {
  publicSessions: boolean;
  sessionRecordings: boolean;
  resources: boolean;
  templates: boolean;
  analytics: boolean;
  userProfiles: boolean;
  defaultPermissions: SharingPermissions;
}

interface SharingPermissions {
  view: boolean;
  participate: boolean;
  download: boolean;
  share: boolean;
  modify: boolean;
}

interface Partnership {
  id: string;
  partnerOrgId: string;
  partnerOrgName: string;
  type: 'bilateral' | 'provider' | 'consumer' | 'network';
  status: 'pending' | 'active' | 'suspended' | 'terminated';
  permissions: PartnershipPermissions;
  resources: SharedResource[];
  analytics: PartnershipAnalytics;
  agreementDate: Date;
  expiryDate?: Date;
  createdBy: string;
}

interface PartnershipPermissions {
  sessions: SharingPermissions;
  users: SharingPermissions;
  resources: SharingPermissions;
  analytics: SharingPermissions;
  branding: boolean;
  integration: boolean;
}

interface SharedResource {
  id: string;
  type: 'session_template' | 'user_account' | 'content' | 'report';
  resourceId: string;
  permissions: SharingPermissions;
  usage: ResourceUsageStats;
  sharedDate: Date;
  expiryDate?: Date;
}

interface ResourceUsageStats {
  views: number;
  downloads: number;
  shares: number;
  participants: number;
  lastAccessed: Date;
}

interface PartnershipAnalytics {
  totalSessions: number;
  sharedResources: number;
  crossOrgUsers: number;
  engagementScore: number;
  satisfactionRating: number;
  issues: number;
  resolvedIssues: number;
}

interface OrganizationNetwork {
  id: string;
  name: string;
  description: string;
  type: 'district' | 'consortium' | 'alliance' | 'federation';
  members: NetworkMember[];
  coordinator: string;
  settings: NetworkSettings;
  analytics: NetworkAnalytics;
  createdAt: Date;
}

interface NetworkMember {
  orgId: string;
  orgName: string;
  role: 'coordinator' | 'member' | 'observer';
  permissions: NetworkPermissions;
  joinedAt: Date;
  status: 'active' | 'inactive' | 'pending';
}

interface NetworkPermissions {
  canInvite: boolean;
  canManage: boolean;
  canViewAll: boolean;
  canShareResources: boolean;
  canCreateSessions: boolean;
}

interface NetworkSettings {
  autoApprove: boolean;
  shareAnalytics: boolean;
  uniformBranding: boolean;
  centralizedReporting: boolean;
  collaborativeScheduling: boolean;
}

interface NetworkAnalytics {
  totalMembers: number;
  activeMembers: number;
  sharedSessions: number;
  crossOrgEngagement: number;
  resourceUtilization: number;
  satisfactionScore: number;
}

interface OrganizationAnalytics {
  users: UserAnalytics;
  sessions: SessionAnalytics;
  resources: ResourceAnalytics;
  collaboration: CollaborationAnalytics;
  performance: PerformanceAnalytics;
  financial: FinancialAnalytics;
}

interface UserAnalytics {
  total: number;
  active: number;
  newThisMonth: number;
  retention: number; // percentage
  engagementScore: number;
  topRoles: Array<{ role: string; count: number }>;
  activityTrends: Array<{ date: Date; active: number }>;
}

interface SessionAnalytics {
  total: number;
  thisMonth: number;
  avgDuration: number; // minutes
  completionRate: number; // percentage
  avgParticipants: number;
  topTopics: Array<{ topic: string; count: number }>;
  qualityScores: Array<{ date: Date; score: number }>;
}

interface ResourceAnalytics {
  storage: StorageUsage;
  bandwidth: BandwidthUsage;
  processing: ProcessingUsage;
  costOptimization: CostOptimization;
}

interface BandwidthUsage {
  used: number; // GB
  limit: number; // GB
  peak: number; // Mbps
  average: number; // Mbps
  trends: Array<{ date: Date; usage: number }>;
}

interface ProcessingUsage {
  transcription: number; // minutes
  aiAnalysis: number; // sessions
  videoProcessing: number; // minutes
  concurrentPeak: number;
  queueTimes: number[]; // seconds
}

interface CostOptimization {
  currentSpend: number; // monthly
  projectedSpend: number;
  savings: number;
  recommendations: OptimizationRecommendation[];
}

interface OptimizationRecommendation {
  type: 'storage' | 'bandwidth' | 'processing' | 'features';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  savings: number; // monthly
  effort: 'easy' | 'moderate' | 'complex';
}

interface CollaborationAnalytics {
  partnerships: number;
  sharedSessions: number;
  crossOrgUsers: number;
  networkParticipation: number;
  collaborationScore: number;
  issueResolution: number; // percentage
}

interface PerformanceAnalytics {
  uptime: number; // percentage
  responseTime: number; // ms
  errorRate: number; // percentage
  userSatisfaction: number; // rating
  systemHealth: SystemHealthMetrics;
}

interface SystemHealthMetrics {
  cpu: number; // percentage
  memory: number; // percentage
  storage: number; // percentage
  network: number; // Mbps
  lastChecked: Date;
}

interface FinancialAnalytics {
  subscription: SubscriptionInfo;
  usage: UsageCharges;
  forecast: FinancialForecast;
  roi: ROIAnalytics;
}

interface SubscriptionInfo {
  tier: string;
  monthlyFee: number;
  annualDiscount: number;
  nextBilling: Date;
  status: 'active' | 'past_due' | 'cancelled' | 'suspended';
}

interface UsageCharges {
  storage: number;
  bandwidth: number;
  processing: number;
  support: number;
  total: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

interface FinancialForecast {
  nextMonth: number;
  nextQuarter: number;
  annual: number;
  confidence: number; // percentage
}

interface ROIAnalytics {
  timeToValue: number; // days
  productivityGains: number; // percentage
  costSavings: number; // monthly
  userSatisfactionImpact: number; // rating
}

interface OrganizationMetadata {
  founded: Date;
  primaryContact: ContactInfo;
  technicalContact: ContactInfo;
  billingContact: ContactInfo;
  complianceFlags: string[];
  certifications: Certification[];
  lastAudit: Date;
  nextReview: Date;
  riskScore: number;
  healthScore: number;
}

interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
}

interface Certification {
  type: 'soc2' | 'ferpa' | 'gdpr' | 'hipaa' | 'iso27001' | 'other';
  status: 'active' | 'expired' | 'pending' | 'not_applicable';
  validUntil?: Date;
  auditDate?: Date;
  certificateUrl?: string;
}

interface OrganizationManagementProps {
  currentOrgId?: string;
  canManageOrganizations?: boolean;
  onOrganizationCreate?: (org: Organization) => void;
  onOrganizationUpdate?: (orgId: string, updates: Partial<Organization>) => void;
  onOrganizationDelete?: (orgId: string) => void;
}

export function OrganizationManagement({
  currentOrgId,
  canManageOrganizations = false,
  onOrganizationCreate,
  onOrganizationUpdate,
  onOrganizationDelete
}: OrganizationManagementProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [networks, setNetworks] = useState<OrganizationNetwork[]>([]);
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  
  // Dialog States
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [showEditOrgDialog, setShowEditOrgDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showBrandingDialog, setShowBrandingDialog] = useState(false);
  const [showCollaborationDialog, setShowCollaborationDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form States
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);

  // Organization Creation State
  const [orgName, setOrgName] = useState('');
  const [orgDisplayName, setOrgDisplayName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgType, setOrgType] = useState<'k12' | 'higher_ed' | 'corporate' | 'nonprofit' | 'government' | 'other'>('k12');
  const [orgSubtype, setOrgSubtype] = useState('');
  const [orgSize, setOrgSize] = useState<'small' | 'medium' | 'large' | 'enterprise'>('medium');
  const [orgTier, setOrgTier] = useState<'basic' | 'premium' | 'enterprise' | 'custom'>('basic');
  const [parentOrgId, setParentOrgId] = useState<string>('');

  useEffect(() => {
    loadOrganizations();
    loadPartnerships();
    loadNetworks();
  }, [currentOrgId]);

  const loadOrganizations = () => {
    // Mock organizations data
    const mockOrgs: Organization[] = [
      {
        id: 'org_1',
        name: 'lincoln_high',
        displayName: 'Lincoln High School',
        description: 'Public high school with 1,200 students focusing on debate and critical thinking',
        type: {
          category: 'k12',
          subtype: 'high_school',
          size: 'large',
          region: 'north_america',
          timezone: 'America/New_York'
        },
        status: 'active',
        tier: 'premium',
        childOrganizations: ['dept_1', 'dept_2'],
        settings: {} as OrganizationSettings, // Abbreviated for space
        branding: {} as OrganizationBranding,
        policies: {} as OrganizationPolicies,
        collaboration: {} as CollaborationSettings,
        analytics: {
          users: {
            total: 1247,
            active: 892,
            newThisMonth: 34,
            retention: 87.3,
            engagementScore: 78.2,
            topRoles: [
              { role: 'Student', count: 1124 },
              { role: 'Teacher', count: 89 },
              { role: 'Administrator', count: 34 }
            ],
            activityTrends: []
          },
          sessions: {
            total: 456,
            thisMonth: 67,
            avgDuration: 45.2,
            completionRate: 89.4,
            avgParticipants: 18.7,
            topTopics: [
              { topic: 'Climate Change', count: 45 },
              { topic: 'Technology Ethics', count: 38 },
              { topic: 'Healthcare Policy', count: 32 }
            ],
            qualityScores: []
          },
          resources: {
            storage: { used: 45000000000, limit: 100000000000, percentage: 45 },
            bandwidth: {
              used: 234.5,
              limit: 1000,
              peak: 156.7,
              average: 67.3,
              trends: []
            },
            processing: {
              transcription: 234.5,
              aiAnalysis: 67,
              videoProcessing: 123.4,
              concurrentPeak: 12,
              queueTimes: [2.3, 1.8, 3.1, 2.7]
            },
            costOptimization: {
              currentSpend: 2340,
              projectedSpend: 2520,
              savings: 180,
              recommendations: []
            }
          },
          collaboration: {
            partnerships: 3,
            sharedSessions: 23,
            crossOrgUsers: 45,
            networkParticipation: 2,
            collaborationScore: 82.4,
            issueResolution: 94.2
          },
          performance: {
            uptime: 99.7,
            responseTime: 245,
            errorRate: 0.3,
            userSatisfaction: 4.6,
            systemHealth: {
              cpu: 67,
              memory: 78,
              storage: 45,
              network: 156.7,
              lastChecked: new Date()
            }
          },
          financial: {
            subscription: {
              tier: 'Premium',
              monthlyFee: 1999,
              annualDiscount: 15,
              nextBilling: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
              status: 'active'
            },
            usage: {
              storage: 123,
              bandwidth: 89,
              processing: 234,
              support: 67,
              total: 513,
              trend: 'stable'
            },
            forecast: {
              nextMonth: 2340,
              nextQuarter: 7020,
              annual: 28080,
              confidence: 87
            },
            roi: {
              timeToValue: 45,
              productivityGains: 23.4,
              costSavings: 890,
              userSatisfactionImpact: 4.2
            }
          }
        },
        metadata: {
          founded: new Date('2019-08-15'),
          primaryContact: {
            name: 'Dr. Sarah Johnson',
            email: 'sjohnson@lincolnhigh.edu',
            phone: '+1-555-0123',
            role: 'Principal',
            department: 'Administration'
          },
          technicalContact: {
            name: 'Michael Chen',
            email: 'mchen@lincolnhigh.edu',
            role: 'IT Director',
            department: 'Technology'
          },
          billingContact: {
            name: 'Lisa Rodriguez',
            email: 'lrodriguez@lincolnhigh.edu',
            role: 'Budget Manager',
            department: 'Finance'
          },
          complianceFlags: ['FERPA_COMPLIANT', 'STUDENT_DATA_PROTECTED'],
          certifications: [
            {
              type: 'ferpa',
              status: 'active',
              validUntil: new Date('2024-12-31'),
              auditDate: new Date('2023-11-15')
            }
          ],
          lastAudit: new Date('2023-11-15'),
          nextReview: new Date('2024-05-15'),
          riskScore: 23,
          healthScore: 87
        },
        createdAt: new Date('2019-08-15'),
        updatedAt: new Date('2024-01-10'),
        createdBy: 'system'
      }
      // Additional mock organizations would follow similar structure
    ];

    setOrganizations(mockOrgs);
  };

  const loadPartnerships = () => {
    const mockPartnerships: Partnership[] = [
      {
        id: 'partnership_1',
        partnerOrgId: 'org_2',
        partnerOrgName: 'Washington Middle School',
        type: 'bilateral',
        status: 'active',
        permissions: {
          sessions: { view: true, participate: true, download: false, share: true, modify: false },
          users: { view: true, participate: false, download: false, share: false, modify: false },
          resources: { view: true, participate: false, download: true, share: true, modify: false },
          analytics: { view: false, participate: false, download: false, share: false, modify: false },
          branding: false,
          integration: false
        },
        resources: [],
        analytics: {
          totalSessions: 23,
          sharedResources: 15,
          crossOrgUsers: 45,
          engagementScore: 82.4,
          satisfactionRating: 4.3,
          issues: 2,
          resolvedIssues: 2
        },
        agreementDate: new Date('2023-09-15'),
        expiryDate: new Date('2024-09-15'),
        createdBy: 'admin_1'
      }
    ];

    setPartnerships(mockPartnerships);
  };

  const loadNetworks = () => {
    const mockNetworks: OrganizationNetwork[] = [
      {
        id: 'network_1',
        name: 'Metro Education Alliance',
        description: 'Collaborative network of schools in the metropolitan area',
        type: 'alliance',
        members: [
          {
            orgId: 'org_1',
            orgName: 'Lincoln High School',
            role: 'member',
            permissions: {
              canInvite: false,
              canManage: false,
              canViewAll: true,
              canShareResources: true,
              canCreateSessions: true
            },
            joinedAt: new Date('2023-01-15'),
            status: 'active'
          }
        ],
        coordinator: 'admin_network',
        settings: {
          autoApprove: false,
          shareAnalytics: true,
          uniformBranding: false,
          centralizedReporting: true,
          collaborativeScheduling: true
        },
        analytics: {
          totalMembers: 12,
          activeMembers: 9,
          sharedSessions: 156,
          crossOrgEngagement: 78.3,
          resourceUtilization: 82.1,
          satisfactionScore: 4.4
        },
        createdAt: new Date('2022-08-01')
      }
    ];

    setNetworks(mockNetworks);
  };

  const createOrganization = () => {
    if (!orgName.trim() || !orgDisplayName.trim()) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please provide organization name and display name.',
        read: false
      });
      return;
    }

    const newOrg: Organization = {
      id: `org_${Date.now()}`,
      name: orgName,
      displayName: orgDisplayName,
      description: orgDescription,
      type: {
        category: orgType,
        subtype: orgSubtype,
        size: orgSize,
        region: 'north_america',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      status: 'active',
      tier: orgTier,
      parentId: parentOrgId || undefined,
      childOrganizations: [],
      settings: generateDefaultSettings(),
      branding: generateDefaultBranding(),
      policies: generateDefaultPolicies(),
      collaboration: generateDefaultCollaboration(),
      analytics: generateEmptyAnalytics(),
      metadata: generateDefaultMetadata(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user?.id || 'admin'
    };

    setOrganizations(prev => [...prev, newOrg]);
    onOrganizationCreate?.(newOrg);

    resetOrgForm();
    setShowCreateOrgDialog(false);

    addNotification({
      type: 'success',
      title: 'Organization Created',
      message: `Organization "${orgDisplayName}" has been created successfully.`,
      read: false
    });
  };

  const generateDefaultSettings = (): OrganizationSettings => ({
    general: {
      defaultLanguage: 'en',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sessionDuration: 60,
      maxParticipants: 30,
      allowGuests: false,
      publicDirectory: false,
      contactEmail: '',
      supportEmail: ''
    },
    features: {
      debates: true,
      analytics: true,
      recordings: orgTier !== 'basic',
      aiAssistance: orgTier === 'enterprise' || orgTier === 'custom',
      customBranding: orgTier !== 'basic',
      apiAccess: orgTier === 'enterprise' || orgTier === 'custom',
      ssoIntegration: orgTier !== 'basic',
      advancedReporting: orgTier === 'premium' || orgTier === 'enterprise' || orgTier === 'custom',
      bulkOperations: orgTier !== 'basic',
      customRoles: orgTier !== 'basic',
      multiLanguage: orgTier === 'enterprise' || orgTier === 'custom',
      mobileApp: true
    },
    integrations: {
      lms: [],
      sso: [],
      calendar: [],
      communication: [],
      storage: [],
      analytics: []
    },
    notifications: {
      email: {
        enabled: true,
        sessionReminders: true,
        weeklyDigests: false,
        systemUpdates: true,
        securityAlerts: true,
        template: 'default'
      },
      push: {
        enabled: true,
        sessionStart: true,
        mentions: true,
        achievements: false,
        urgent: true
      },
      inApp: {
        enabled: true,
        sound: true,
        badges: true,
        popups: false,
        duration: 5
      },
      sms: {
        enabled: false,
        urgent: false,
        reminders: false,
        phoneNumbers: []
      }
    },
    privacy: {
      dataRetention: 365,
      anonymizeData: false,
      shareWithParent: true,
      allowRecording: true,
      recordingConsent: 'explicit',
      dataExport: true,
      rightToDelete: true,
      consentTracking: true,
      minAge: 13,
      parentalConsent: true
    },
    resources: {
      storage: {
        limit: orgTier === 'basic' ? 10 : orgTier === 'premium' ? 100 : 500,
        recordings: 5,
        files: 3,
        backups: 2,
        autoCleanup: true,
        cleanupDays: 90
      },
      bandwidth: {
        limit: orgTier === 'basic' ? 100 : orgTier === 'premium' ? 500 : 2000,
        videoQuality: orgTier === 'basic' ? 'medium' : 'high',
        audioQuality: 'high',
        throttling: orgTier === 'basic'
      },
      processing: {
        transcription: orgTier !== 'basic',
        aiAnalysis: orgTier === 'enterprise' || orgTier === 'custom',
        videoProcessing: true,
        concurrent: orgTier === 'basic' ? 2 : orgTier === 'premium' ? 5 : 20,
        priority: orgTier === 'basic' ? 'low' : orgTier === 'premium' ? 'normal' : 'high'
      },
      concurrent: {
        sessions: orgTier === 'basic' ? 5 : orgTier === 'premium' ? 20 : 100,
        participants: orgTier === 'basic' ? 50 : orgTier === 'premium' ? 200 : 1000,
        recordings: orgTier === 'basic' ? 2 : orgTier === 'premium' ? 10 : 50,
        uploads: orgTier === 'basic' ? 5 : orgTier === 'premium' ? 20 : 100
      }
    }
  });

  const generateDefaultBranding = (): OrganizationBranding => ({
    logo: {},
    favicon: {},
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#10b981',
      background: '#ffffff',
      text: '#1f2937',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
      monospace: 'JetBrains Mono'
    },
    emailTemplates: {},
    loginPage: {
      enabled: false,
      title: 'Welcome',
      subtitle: 'Sign in to continue',
      welcomeMessage: 'Welcome to our debate platform'
    },
    dashboard: {
      enabled: false,
      layout: 'standard',
      widgets: [],
      welcomeMessage: 'Welcome to your dashboard'
    }
  });

  const generateDefaultPolicies = (): OrganizationPolicies => ({
    terms: {
      id: 'terms_1',
      title: 'Terms of Service',
      content: 'Default terms of service content...',
      version: '1.0',
      effectiveDate: new Date(),
      requiresAcceptance: true,
      acceptanceTracking: true,
      lastUpdated: new Date(),
      updatedBy: 'system'
    },
    privacy: {
      id: 'privacy_1',
      title: 'Privacy Policy',
      content: 'Default privacy policy content...',
      version: '1.0',
      effectiveDate: new Date(),
      requiresAcceptance: true,
      acceptanceTracking: true,
      lastUpdated: new Date(),
      updatedBy: 'system'
    },
    conduct: {
      id: 'conduct_1',
      title: 'Code of Conduct',
      content: 'Default code of conduct content...',
      version: '1.0',
      effectiveDate: new Date(),
      requiresAcceptance: true,
      acceptanceTracking: true,
      lastUpdated: new Date(),
      updatedBy: 'system'
    },
    accessibility: {
      id: 'accessibility_1',
      title: 'Accessibility Statement',
      content: 'Default accessibility statement content...',
      version: '1.0',
      effectiveDate: new Date(),
      requiresAcceptance: false,
      acceptanceTracking: false,
      lastUpdated: new Date(),
      updatedBy: 'system'
    },
    custom: []
  });

  const generateDefaultCollaboration = (): CollaborationSettings => ({
    crossOrg: {
      enabled: false,
      allowInvitations: false,
      allowSharedSessions: false,
      allowResourceSharing: false,
      allowUserSharing: false,
      requireApproval: true,
      approvalWorkflow: []
    },
    sharing: {
      publicSessions: false,
      sessionRecordings: false,
      resources: false,
      templates: false,
      analytics: false,
      userProfiles: false,
      defaultPermissions: {
        view: true,
        participate: false,
        download: false,
        share: false,
        modify: false
      }
    },
    partnerships: [],
    networks: []
  });

  const generateEmptyAnalytics = (): OrganizationAnalytics => ({
    users: {
      total: 0,
      active: 0,
      newThisMonth: 0,
      retention: 0,
      engagementScore: 0,
      topRoles: [],
      activityTrends: []
    },
    sessions: {
      total: 0,
      thisMonth: 0,
      avgDuration: 0,
      completionRate: 0,
      avgParticipants: 0,
      topTopics: [],
      qualityScores: []
    },
    resources: {
      storage: { used: 0, limit: 0, percentage: 0 },
      bandwidth: { used: 0, limit: 0, peak: 0, average: 0, trends: [] },
      processing: {
        transcription: 0,
        aiAnalysis: 0,
        videoProcessing: 0,
        concurrentPeak: 0,
        queueTimes: []
      },
      costOptimization: {
        currentSpend: 0,
        projectedSpend: 0,
        savings: 0,
        recommendations: []
      }
    },
    collaboration: {
      partnerships: 0,
      sharedSessions: 0,
      crossOrgUsers: 0,
      networkParticipation: 0,
      collaborationScore: 0,
      issueResolution: 0
    },
    performance: {
      uptime: 0,
      responseTime: 0,
      errorRate: 0,
      userSatisfaction: 0,
      systemHealth: {
        cpu: 0,
        memory: 0,
        storage: 0,
        network: 0,
        lastChecked: new Date()
      }
    },
    financial: {
      subscription: {
        tier: 'Basic',
        monthlyFee: 0,
        annualDiscount: 0,
        nextBilling: new Date(),
        status: 'active'
      },
      usage: {
        storage: 0,
        bandwidth: 0,
        processing: 0,
        support: 0,
        total: 0,
        trend: 'stable'
      },
      forecast: {
        nextMonth: 0,
        nextQuarter: 0,
        annual: 0,
        confidence: 0
      },
      roi: {
        timeToValue: 0,
        productivityGains: 0,
        costSavings: 0,
        userSatisfactionImpact: 0
      }
    }
  });

  const generateDefaultMetadata = (): OrganizationMetadata => ({
    founded: new Date(),
    primaryContact: {
      name: '',
      email: '',
      role: 'Administrator'
    },
    technicalContact: {
      name: '',
      email: '',
      role: 'IT Administrator'
    },
    billingContact: {
      name: '',
      email: '',
      role: 'Finance Manager'
    },
    complianceFlags: [],
    certifications: [],
    lastAudit: new Date(),
    nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    riskScore: 50,
    healthScore: 75
  });

  const resetOrgForm = () => {
    setOrgName('');
    setOrgDisplayName('');
    setOrgDescription('');
    setOrgType('k12');
    setOrgSubtype('');
    setOrgSize('medium');
    setOrgTier('basic');
    setParentOrgId('');
  };

  const deleteOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return;

    // Check if org has child organizations or active users
    if (org.childOrganizations.length > 0) {
      addNotification({
        type: 'error',
        title: 'Cannot Delete Organization',
        message: `Organization "${org.displayName}" has ${org.childOrganizations.length} child organizations. Remove them first.`,
        read: false
      });
      return;
    }

    if (org.analytics.users.active > 0) {
      addNotification({
        type: 'error',
        title: 'Cannot Delete Organization',
        message: `Organization "${org.displayName}" has ${org.analytics.users.active} active users. Transfer or deactivate users first.`,
        read: false
      });
      return;
    }

    setOrganizations(prev => prev.filter(o => o.id !== orgId));
    onOrganizationDelete?.(orgId);
    setShowDeleteDialog(false);
    setDeleteOrgId(null);

    addNotification({
      type: 'success',
      title: 'Organization Deleted',
      message: `Organization "${org.displayName}" has been deleted.`,
      read: false
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Active</Badge>;
      case 'inactive': return <Badge variant="secondary">Inactive</Badge>;
      case 'suspended': return <Badge className="bg-orange-500">Suspended</Badge>;
      case 'archived': return <Badge variant="outline">Archived</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'basic': return <Badge variant="outline">Basic</Badge>;
      case 'premium': return <Badge className="bg-blue-500">Premium</Badge>;
      case 'enterprise': return <Badge className="bg-purple-500">Enterprise</Badge>;
      case 'custom': return <Badge className="bg-gold-500">Custom</Badge>;
      default: return <Badge variant="outline">{tier}</Badge>;
    }
  };

  const getHealthScore = (score: number) => {
    if (score >= 90) return { color: 'text-green-600', label: 'Excellent' };
    if (score >= 80) return { color: 'text-blue-600', label: 'Good' };
    if (score >= 70) return { color: 'text-yellow-600', label: 'Fair' };
    return { color: 'text-red-600', label: 'Poor' };
  };

  const filteredOrganizations = organizations.filter(org => {
    if (searchQuery && !org.displayName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !org.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (typeFilter !== 'all' && org.type.category !== typeFilter) return false;
    if (statusFilter !== 'all' && org.status !== statusFilter) return false;
    if (tierFilter !== 'all' && org.tier !== tierFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Organization Management
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage multi-tenant organizations, settings, and collaboration
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Summary Stats */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{organizations.length}</div>
              <div className="text-xs text-muted-foreground">Organizations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{organizations.filter(o => o.status === 'active').length}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{partnerships.length}</div>
              <div className="text-xs text-muted-foreground">Partnerships</div>
            </div>
          </div>
          
          {/* Controls */}
          {canManageOrganizations && (
            <Button onClick={() => setShowCreateOrgDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organizations">
            Organizations ({organizations.length})
          </TabsTrigger>
          <TabsTrigger value="partnerships">
            Partnerships ({partnerships.length})
          </TabsTrigger>
          <TabsTrigger value="networks">
            Networks ({networks.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="k12">K-12 Education</SelectItem>
                    <SelectItem value="higher_ed">Higher Education</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="nonprofit">Nonprofit</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setTierFilter('all');
                }}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Organizations List */}
          <div className="space-y-4">
            {filteredOrganizations.map((org) => {
              const healthScore = getHealthScore(org.metadata.healthScore);
              
              return (
                <Card key={org.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{org.displayName}</h4>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(org.status)}
                              {getTierBadge(org.tier)}
                              <Badge variant="outline" className="capitalize">
                                {org.type.category.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {org.type.size}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{org.description}</p>
                      </div>
                      
                      {canManageOrganizations && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Organization Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrg(org);
                              setShowEditOrgDialog(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrg(org);
                              setShowSettingsDialog(true);
                            }}>
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrg(org);
                              setShowBrandingDialog(true);
                            }}>
                              <Palette className="h-4 w-4 mr-2" />
                              Branding
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrg(org);
                              setShowCollaborationDialog(true);
                            }}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Collaboration
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                setDeleteOrgId(org.id);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Organization
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 lg:grid-cols-4">
                      {/* Usage Stats */}
                      <div>
                        <h5 className="font-medium mb-3">Usage</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Users:</span>
                            <span>{org.analytics.users.total.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Active Users:</span>
                            <span>{org.analytics.users.active.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sessions:</span>
                            <span>{org.analytics.sessions.total.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>This Month:</span>
                            <span>{org.analytics.sessions.thisMonth}</span>
                          </div>
                        </div>
                      </div>

                      {/* Resources */}
                      <div>
                        <h5 className="font-medium mb-3">Resources</h5>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Storage:</span>
                              <span>{org.analytics.resources.storage.percentage}%</span>
                            </div>
                            <Progress value={org.analytics.resources.storage.percentage} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Bandwidth:</span>
                              <span>{Math.round((org.analytics.resources.bandwidth.used / org.analytics.resources.bandwidth.limit) * 100)}%</span>
                            </div>
                            <Progress value={(org.analytics.resources.bandwidth.used / org.analytics.resources.bandwidth.limit) * 100} className="h-2" />
                          </div>
                        </div>
                      </div>

                      {/* Performance */}
                      <div>
                        <h5 className="font-medium mb-3">Performance</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Health Score:</span>
                            <span className={healthScore.color}>
                              {org.metadata.healthScore}% ({healthScore.label})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uptime:</span>
                            <span>{org.analytics.performance.uptime}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Response Time:</span>
                            <span>{org.analytics.performance.responseTime}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Satisfaction:</span>
                            <span>{org.analytics.performance.userSatisfaction}/5</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial */}
                      <div>
                        <h5 className="font-medium mb-3">Financial</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Monthly Fee:</span>
                            <span>${org.analytics.financial.subscription.monthlyFee}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Usage Charges:</span>
                            <span>${org.analytics.financial.usage.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Next Billing:</span>
                            <span>{org.analytics.financial.subscription.nextBilling.toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <span className={
                              org.analytics.financial.subscription.status === 'active' ? 'text-green-600' :
                              org.analytics.financial.subscription.status === 'past_due' ? 'text-red-600' : 
                              'text-yellow-600'
                            }>
                              {org.analytics.financial.subscription.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Collaboration & Networks */}
                    {(org.analytics.collaboration.partnerships > 0 || org.analytics.collaboration.networkParticipation > 0) && (
                      <div className="mt-6 pt-4 border-t">
                        <h5 className="font-medium mb-3">Collaboration</h5>
                        <div className="flex flex-wrap gap-4 text-sm">
                          {org.analytics.collaboration.partnerships > 0 && (
                            <div className="flex items-center space-x-1">
                              <Link className="h-4 w-4 text-blue-600" />
                              <span>{org.analytics.collaboration.partnerships} partnerships</span>
                            </div>
                          )}
                          {org.analytics.collaboration.networkParticipation > 0 && (
                            <div className="flex items-center space-x-1">
                              <Network className="h-4 w-4 text-green-600" />
                              <span>{org.analytics.collaboration.networkParticipation} networks</span>
                            </div>
                          )}
                          {org.analytics.collaboration.sharedSessions > 0 && (
                            <div className="flex items-center space-x-1">
                              <Share2 className="h-4 w-4 text-purple-600" />
                              <span>{org.analytics.collaboration.sharedSessions} shared sessions</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="partnerships" className="space-y-4">
          {/* Partnerships content */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Partnerships</CardTitle>
              <CardDescription>
                Manage collaborative relationships with other organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Partnership management interface would be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="networks" className="space-y-4">
          {/* Networks content */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Networks</CardTitle>
              <CardDescription>
                Participate in educational networks and consortiums
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Network management interface would be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Analytics overview for all organizations */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organizations.reduce((sum, org) => sum + org.analytics.users.total, 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {organizations.reduce((sum, org) => sum + org.analytics.users.active, 0).toLocaleString()} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organizations.reduce((sum, org) => sum + org.analytics.sessions.total, 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {organizations.reduce((sum, org) => sum + org.analytics.sessions.thisMonth, 0)} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(organizations.reduce((sum, org) => sum + org.metadata.healthScore, 0) / organizations.length)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Across all organizations
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Organization Dialog */}
      <Dialog open={showCreateOrgDialog} onOpenChange={setShowCreateOrgDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Set up a new organization with default configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  placeholder="e.g., lincoln_high"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="e.g., Lincoln High School"
                  value={orgDisplayName}
                  onChange={(e) => setOrgDisplayName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the organization"
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Organization Type</Label>
                <Select value={orgType} onValueChange={(value: any) => setOrgType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="k12">K-12 Education</SelectItem>
                    <SelectItem value="higher_ed">Higher Education</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="nonprofit">Nonprofit</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Organization Size</Label>
                <Select value={orgSize} onValueChange={(value: any) => setOrgSize(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (&lt;100 users)</SelectItem>
                    <SelectItem value="medium">Medium (100-1000 users)</SelectItem>
                    <SelectItem value="large">Large (1000-10,000 users)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (&gt;10,000 users)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subscription Tier</Label>
                <Select value={orgTier} onValueChange={(value: any) => setOrgTier(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Parent Organization (Optional)</Label>
              <Select value={parentOrgId} onValueChange={setParentOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="None (Root Organization)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Root Organization)</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateOrgDialog(false);
              resetOrgForm();
            }}>
              Cancel
            </Button>
            <Button onClick={createOrganization} disabled={!orgName.trim() || !orgDisplayName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The organization and all its data will be permanently deleted.
              Make sure all users have been transferred and no child organizations exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteOrgId && deleteOrganization(deleteOrgId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Additional dialogs for settings, branding, and collaboration would be implemented here */}
      {/* These are abbreviated for space but would follow similar patterns */}
    </div>
  );
}
