/**
 * User Management Dashboard Component
 * 
 * Task 8.5.1: Advanced user management interface with search, filtering, bulk operations,
 * user creation wizard, and comprehensive account lifecycle management
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
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  MoreHorizontal,
  Settings,
  Shield,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Calendar,
  Clock,
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
  Star,
  Award,
  Target,
  Flag,
  Tag,
  Globe,
  MapPin,
  Building,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Bell,
  Lock,
  Unlock,
  Key,
  UserCog,
  Crown,
  Briefcase,
  School,
  Users2,
  UserMinus,
  Copy,
  ExternalLink,
  FileText,
  Archive,
  RotateCcw,
  Ban,
  PlayCircle,
  PauseCircle,
  StopCircle
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
interface PlatformUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
  organizationName: string;
  profile: UserProfile;
  activity: UserActivity;
  permissions: UserPermissions;
  preferences: UserPreferences;
  analytics: UserAnalytics;
  audit: AuditTrail[];
  createdAt: Date;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  emailVerified: boolean;
  mfaEnabled: boolean;
  accountLocked: boolean;
  passwordLastChanged?: Date;
}

interface UserRole {
  id: string;
  name: string;
  displayName: string;
  type: 'system' | 'organization' | 'custom';
  level: number; // 1-10, higher = more permissions
  description: string;
  permissions: string[];
  color: string;
  icon: string;
  isDefault: boolean;
}

interface UserProfile {
  gradeLevel?: string;
  subject?: string;
  yearsExperience?: number;
  schoolDistrict?: string;
  department?: string;
  bio?: string;
  phoneNumber?: string;
  timezone: string;
  language: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  demographics?: {
    ageGroup: string;
    location: string;
    institution: string;
  };
}

interface UserActivity {
  sessionsCompleted: number;
  totalDebateTime: number; // minutes
  lastSessionDate?: Date;
  averageSessionDuration: number; // minutes
  engagementScore: number; // 0-100
  skillsImproved: string[];
  achievements: Achievement[];
  streakDays: number;
  favoriteTopics: string[];
  collaborationScore: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
  category: 'debate' | 'engagement' | 'learning' | 'collaboration' | 'leadership';
}

interface UserPermissions {
  canCreateSessions: boolean;
  canModerateDebates: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canAccessReports: boolean;
  canConfigureSystem: boolean;
  canManageOrganization: boolean;
  maxConcurrentSessions: number;
  maxStudentsPerSession: number;
  storageQuotaGB: number;
  canExportData: boolean;
  canInviteUsers: boolean;
  canViewAuditLogs: boolean;
}

interface UserPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  browserNotifications: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: 'US' | 'EU' | 'ISO';
  autoSaveInterval: number; // minutes
  defaultSessionLength: number; // minutes
  preferredDebateFormat: string;
}

interface UserAnalytics {
  loginFrequency: LoginPattern;
  featureUsage: FeatureUsageStats;
  performanceMetrics: PerformanceMetrics;
  engagementTrends: EngagementData[];
  riskFactors: RiskFactor[];
  successMetrics: SuccessMetric[];
}

interface LoginPattern {
  totalLogins: number;
  averageSessionLength: number; // minutes
  mostActiveTimeOfDay: string;
  mostActiveDay: string;
  deviceTypes: Record<string, number>;
  locations: Record<string, number>;
  loginTrend: 'increasing' | 'stable' | 'decreasing';
}

interface FeatureUsageStats {
  debateParticipation: number;
  analyticsViewing: number;
  userManagement: number;
  reportGeneration: number;
  settingsAccess: number;
  supportRequests: number;
  mostUsedFeatures: string[];
  leastUsedFeatures: string[];
}

interface PerformanceMetrics {
  averageResponseTime: number; // ms
  errorRate: number; // percentage
  satisfactionScore: number; // 1-5
  completionRate: number; // percentage
  efficiencyScore: number; // 0-100
  qualityScore: number; // 0-100
}

interface EngagementData {
  date: Date;
  score: number; // 0-100
  sessionsParticipated: number;
  timeSpent: number; // minutes
  interactionsCount: number;
}

interface RiskFactor {
  type: 'security' | 'engagement' | 'performance' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolved: boolean;
  actionTaken?: string;
}

interface SuccessMetric {
  metric: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  achievedAt?: Date;
}

interface AuditTrail {
  id: string;
  action: string;
  description: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  resource?: string;
  oldValue?: any;
  newValue?: any;
  severity: 'info' | 'warning' | 'error';
}

type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';

interface BulkAction {
  type: 'activate' | 'deactivate' | 'suspend' | 'delete' | 'change_role' | 'send_email' | 'export' | 'assign_organization';
  userIds: string[];
  parameters?: Record<string, any>;
}

interface UserManagementDashboardProps {
  organizationId?: string;
  canManageAllUsers?: boolean;
  onUserCreate?: (user: PlatformUser) => void;
  onUserUpdate?: (userId: string, updates: Partial<PlatformUser>) => void;
  onUserDelete?: (userId: string) => void;
}

export function UserManagementDashboard({
  organizationId,
  canManageAllUsers = false,
  onUserCreate,
  onUserUpdate,
  onUserDelete
}: UserManagementDashboardProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<PlatformUser[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  
  // Selection for Bulk Operations
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Dialog States
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form States
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [suspendUserId, setSuspendUserId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [bulkActionType, setBulkActionType] = useState<BulkAction['type']>('activate');
  
  // New User Creation
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserOrganization, setNewUserOrganization] = useState('');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [organizationId]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, statusFilter, roleFilter, organizationFilter, activityFilter]);

  const loadUsers = () => {
    // Mock user data
    const mockUsers: PlatformUser[] = [
      {
        id: 'user_1',
        email: 'sarah.johnson@school.edu',
        firstName: 'Sarah',
        lastName: 'Johnson',
        displayName: 'Sarah Johnson',
        avatar: '/api/placeholder/32/32',
        role: {
          id: 'teacher',
          name: 'teacher',
          displayName: 'Teacher',
          type: 'system',
          level: 5,
          description: 'Classroom teacher with full session management',
          permissions: ['create_sessions', 'moderate_debates', 'view_analytics'],
          color: '#3b82f6',
          icon: 'GraduationCap',
          isDefault: true
        },
        status: 'active',
        organizationId: 'org_1',
        organizationName: 'Lincoln High School',
        profile: {
          gradeLevel: '9-12',
          subject: 'History',
          yearsExperience: 8,
          department: 'Social Studies',
          phoneNumber: '+1 (555) 123-4567',
          timezone: 'America/New_York',
          language: 'en-US',
          bio: 'Passionate about engaging students in critical thinking through debate'
        },
        activity: {
          sessionsCompleted: 47,
          totalDebateTime: 2840, // minutes
          lastSessionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          averageSessionDuration: 60,
          engagementScore: 92,
          skillsImproved: ['Critical Thinking', 'Public Speaking', 'Research'],
          achievements: [
            {
              id: 'ach_1',
              name: 'Debate Master',
              description: 'Completed 50+ debate sessions',
              icon: 'Award',
              rarity: 'epic',
              earnedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              category: 'debate'
            }
          ],
          streakDays: 15,
          favoriteTopics: ['Climate Change', 'Technology Ethics', 'History'],
          collaborationScore: 88
        },
        permissions: {
          canCreateSessions: true,
          canModerateDebates: true,
          canViewAnalytics: true,
          canManageUsers: false,
          canAccessReports: true,
          canConfigureSystem: false,
          canManageOrganization: false,
          maxConcurrentSessions: 5,
          maxStudentsPerSession: 30,
          storageQuotaGB: 10,
          canExportData: true,
          canInviteUsers: true,
          canViewAuditLogs: false
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          browserNotifications: true,
          weeklyDigest: true,
          marketingEmails: false,
          theme: 'light',
          language: 'en-US',
          timezone: 'America/New_York',
          dateFormat: 'US',
          autoSaveInterval: 5,
          defaultSessionLength: 45,
          preferredDebateFormat: 'oxford'
        },
        analytics: {
          loginFrequency: {
            totalLogins: 156,
            averageSessionLength: 75,
            mostActiveTimeOfDay: '2:00 PM',
            mostActiveDay: 'Wednesday',
            deviceTypes: { 'Desktop': 120, 'Mobile': 25, 'Tablet': 11 },
            locations: { 'School': 140, 'Home': 16 },
            loginTrend: 'stable'
          },
          featureUsage: {
            debateParticipation: 89,
            analyticsViewing: 67,
            userManagement: 12,
            reportGeneration: 34,
            settingsAccess: 23,
            supportRequests: 3,
            mostUsedFeatures: ['Session Creation', 'Analytics Dashboard', 'Student Management'],
            leastUsedFeatures: ['Advanced Settings', 'API Access', 'Bulk Operations']
          },
          performanceMetrics: {
            averageResponseTime: 245,
            errorRate: 0.8,
            satisfactionScore: 4.7,
            completionRate: 94.2,
            efficiencyScore: 87,
            qualityScore: 91
          },
          engagementTrends: [],
          riskFactors: [],
          successMetrics: [
            {
              metric: 'Student Engagement',
              value: 92,
              target: 85,
              unit: '%',
              trend: 'up',
              achievedAt: new Date()
            }
          ]
        },
        audit: [],
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        emailVerified: true,
        mfaEnabled: true,
        accountLocked: false,
        passwordLastChanged: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'user_2',
        email: 'mike.chen@school.edu',
        firstName: 'Mike',
        lastName: 'Chen',
        displayName: 'Mike Chen',
        role: {
          id: 'admin',
          name: 'admin',
          displayName: 'Administrator',
          type: 'system',
          level: 9,
          description: 'School administrator with full platform access',
          permissions: ['*'], // All permissions
          color: '#dc2626',
          icon: 'Crown',
          isDefault: false
        },
        status: 'active',
        organizationId: 'org_1',
        organizationName: 'Lincoln High School',
        profile: {
          department: 'Administration',
          yearsExperience: 12,
          phoneNumber: '+1 (555) 987-6543',
          timezone: 'America/New_York',
          language: 'en-US',
          bio: 'Dedicated to educational technology and student success'
        },
        activity: {
          sessionsCompleted: 23,
          totalDebateTime: 920,
          lastSessionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          averageSessionDuration: 40,
          engagementScore: 78,
          skillsImproved: ['Leadership', 'Technology Integration'],
          achievements: [],
          streakDays: 5,
          favoriteTopics: ['Educational Policy', 'Technology'],
          collaborationScore: 85
        },
        permissions: {
          canCreateSessions: true,
          canModerateDebates: true,
          canViewAnalytics: true,
          canManageUsers: true,
          canAccessReports: true,
          canConfigureSystem: true,
          canManageOrganization: true,
          maxConcurrentSessions: 10,
          maxStudentsPerSession: 50,
          storageQuotaGB: 100,
          canExportData: true,
          canInviteUsers: true,
          canViewAuditLogs: true
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          browserNotifications: true,
          weeklyDigest: true,
          marketingEmails: true,
          theme: 'dark',
          language: 'en-US',
          timezone: 'America/New_York',
          dateFormat: 'US',
          autoSaveInterval: 3,
          defaultSessionLength: 60,
          preferredDebateFormat: 'parliamentary'
        },
        analytics: {
          loginFrequency: {
            totalLogins: 89,
            averageSessionLength: 45,
            mostActiveTimeOfDay: '9:00 AM',
            mostActiveDay: 'Monday',
            deviceTypes: { 'Desktop': 85, 'Mobile': 4 },
            locations: { 'School': 89 },
            loginTrend: 'increasing'
          },
          featureUsage: {
            debateParticipation: 25,
            analyticsViewing: 95,
            userManagement: 88,
            reportGeneration: 92,
            settingsAccess: 78,
            supportRequests: 12,
            mostUsedFeatures: ['User Management', 'Analytics', 'System Settings'],
            leastUsedFeatures: ['Direct Debate Participation']
          },
          performanceMetrics: {
            averageResponseTime: 180,
            errorRate: 0.3,
            satisfactionScore: 4.9,
            completionRate: 98.5,
            efficiencyScore: 95,
            qualityScore: 96
          },
          engagementTrends: [],
          riskFactors: [],
          successMetrics: []
        },
        audit: [],
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        lastActiveAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        emailVerified: true,
        mfaEnabled: true,
        accountLocked: false,
        passwordLastChanged: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'user_3',
        email: 'alex.student@email.com',
        firstName: 'Alex',
        lastName: 'Rivera',
        displayName: 'Alex Rivera',
        role: {
          id: 'student',
          name: 'student',
          displayName: 'Student',
          type: 'system',
          level: 2,
          description: 'Student participant in debate sessions',
          permissions: ['participate_debates', 'view_own_analytics'],
          color: '#10b981',
          icon: 'BookOpen',
          isDefault: true
        },
        status: 'active',
        organizationId: 'org_1',
        organizationName: 'Lincoln High School',
        profile: {
          gradeLevel: '11th',
          timezone: 'America/New_York',
          language: 'en-US'
        },
        activity: {
          sessionsCompleted: 18,
          totalDebateTime: 720,
          lastSessionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          averageSessionDuration: 40,
          engagementScore: 84,
          skillsImproved: ['Critical Thinking', 'Public Speaking'],
          achievements: [
            {
              id: 'ach_2',
              name: 'Rising Star',
              description: 'Completed 15+ debate sessions',
              icon: 'Star',
              rarity: 'uncommon',
              earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
              category: 'engagement'
            }
          ],
          streakDays: 8,
          favoriteTopics: ['Technology', 'Environment'],
          collaborationScore: 79
        },
        permissions: {
          canCreateSessions: false,
          canModerateDebates: false,
          canViewAnalytics: false,
          canManageUsers: false,
          canAccessReports: false,
          canConfigureSystem: false,
          canManageOrganization: false,
          maxConcurrentSessions: 1,
          maxStudentsPerSession: 0,
          storageQuotaGB: 1,
          canExportData: false,
          canInviteUsers: false,
          canViewAuditLogs: false
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          browserNotifications: true,
          weeklyDigest: false,
          marketingEmails: false,
          theme: 'system',
          language: 'en-US',
          timezone: 'America/New_York',
          dateFormat: 'US',
          autoSaveInterval: 10,
          defaultSessionLength: 30,
          preferredDebateFormat: 'fishbowl'
        },
        analytics: {
          loginFrequency: {
            totalLogins: 42,
            averageSessionLength: 35,
            mostActiveTimeOfDay: '3:30 PM',
            mostActiveDay: 'Thursday',
            deviceTypes: { 'Mobile': 28, 'Desktop': 14 },
            locations: { 'Home': 30, 'School': 12 },
            loginTrend: 'increasing'
          },
          featureUsage: {
            debateParticipation: 95,
            analyticsViewing: 15,
            userManagement: 0,
            reportGeneration: 0,
            settingsAccess: 8,
            supportRequests: 1,
            mostUsedFeatures: ['Debate Participation', 'Profile Settings'],
            leastUsedFeatures: ['Advanced Features', 'Administrative Tools']
          },
          performanceMetrics: {
            averageResponseTime: 320,
            errorRate: 1.2,
            satisfactionScore: 4.3,
            completionRate: 87.5,
            efficiencyScore: 76,
            qualityScore: 82
          },
          engagementTrends: [],
          riskFactors: [],
          successMetrics: []
        },
        audit: [],
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        lastActiveAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        emailVerified: true,
        mfaEnabled: false,
        accountLocked: false,
        passwordLastChanged: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      }
    ];

    setUsers(mockUsers);
  };

  const loadRoles = () => {
    const mockRoles: UserRole[] = [
      {
        id: 'student',
        name: 'student',
        displayName: 'Student',
        type: 'system',
        level: 2,
        description: 'Student participant in debate sessions',
        permissions: ['participate_debates', 'view_own_analytics'],
        color: '#10b981',
        icon: 'BookOpen',
        isDefault: true
      },
      {
        id: 'teacher',
        name: 'teacher',
        displayName: 'Teacher',
        type: 'system',
        level: 5,
        description: 'Classroom teacher with session management',
        permissions: ['create_sessions', 'moderate_debates', 'view_analytics', 'manage_students'],
        color: '#3b82f6',
        icon: 'GraduationCap',
        isDefault: true
      },
      {
        id: 'admin',
        name: 'admin',
        displayName: 'Administrator',
        type: 'system',
        level: 9,
        description: 'School administrator with full platform access',
        permissions: ['*'],
        color: '#dc2626',
        icon: 'Crown',
        isDefault: false
      },
      {
        id: 'support',
        name: 'support',
        displayName: 'Support Staff',
        type: 'organization',
        level: 6,
        description: 'Technical support with user assistance permissions',
        permissions: ['view_analytics', 'manage_users', 'access_support'],
        color: '#f59e0b',
        icon: 'Briefcase',
        isDefault: false
      }
    ];

    setRoles(mockRoles);
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query) ||
        user.organizationName.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role.id === roleFilter);
    }

    // Organization filter
    if (organizationFilter !== 'all') {
      filtered = filtered.filter(user => user.organizationId === organizationFilter);
    }

    // Activity filter
    if (activityFilter !== 'all') {
      const now = new Date();
      switch (activityFilter) {
        case 'active_today':
          filtered = filtered.filter(user => 
            user.lastActiveAt && 
            (now.getTime() - user.lastActiveAt.getTime()) < 24 * 60 * 60 * 1000
          );
          break;
        case 'active_week':
          filtered = filtered.filter(user => 
            user.lastActiveAt && 
            (now.getTime() - user.lastActiveAt.getTime()) < 7 * 24 * 60 * 60 * 1000
          );
          break;
        case 'inactive_month':
          filtered = filtered.filter(user => 
            !user.lastActiveAt || 
            (now.getTime() - user.lastActiveAt.getTime()) > 30 * 24 * 60 * 60 * 1000
          );
          break;
      }
    }

    setFilteredUsers(filtered);
  };

  const createUser = async () => {
    if (!newUserEmail.trim() || !newUserFirstName.trim() || !newUserLastName.trim() || !newUserRole) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please fill in all required fields.',
        read: false
      });
      return;
    }

    const selectedRole = roles.find(r => r.id === newUserRole);
    if (!selectedRole) return;

    const newUser: PlatformUser = {
      id: `user_${Date.now()}`,
      email: newUserEmail,
      firstName: newUserFirstName,
      lastName: newUserLastName,
      displayName: `${newUserFirstName} ${newUserLastName}`,
      role: selectedRole,
      status: 'pending',
      organizationId: newUserOrganization || organizationId || 'org_1',
      organizationName: 'Lincoln High School',
      profile: {
        timezone: 'America/New_York',
        language: 'en-US'
      },
      activity: {
        sessionsCompleted: 0,
        totalDebateTime: 0,
        averageSessionDuration: 0,
        engagementScore: 0,
        skillsImproved: [],
        achievements: [],
        streakDays: 0,
        favoriteTopics: [],
        collaborationScore: 0
      },
      permissions: {
        canCreateSessions: selectedRole.level >= 5,
        canModerateDebates: selectedRole.level >= 5,
        canViewAnalytics: selectedRole.level >= 3,
        canManageUsers: selectedRole.level >= 8,
        canAccessReports: selectedRole.level >= 4,
        canConfigureSystem: selectedRole.level >= 9,
        canManageOrganization: selectedRole.level >= 8,
        maxConcurrentSessions: selectedRole.level >= 5 ? 5 : 1,
        maxStudentsPerSession: selectedRole.level >= 5 ? 30 : 0,
        storageQuotaGB: selectedRole.level >= 5 ? 10 : 1,
        canExportData: selectedRole.level >= 4,
        canInviteUsers: selectedRole.level >= 5,
        canViewAuditLogs: selectedRole.level >= 8
      },
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        browserNotifications: true,
        weeklyDigest: true,
        marketingEmails: false,
        theme: 'system',
        language: 'en-US',
        timezone: 'America/New_York',
        dateFormat: 'US',
        autoSaveInterval: 5,
        defaultSessionLength: 45,
        preferredDebateFormat: 'oxford'
      },
      analytics: {
        loginFrequency: {
          totalLogins: 0,
          averageSessionLength: 0,
          mostActiveTimeOfDay: '',
          mostActiveDay: '',
          deviceTypes: {},
          locations: {},
          loginTrend: 'stable'
        },
        featureUsage: {
          debateParticipation: 0,
          analyticsViewing: 0,
          userManagement: 0,
          reportGeneration: 0,
          settingsAccess: 0,
          supportRequests: 0,
          mostUsedFeatures: [],
          leastUsedFeatures: []
        },
        performanceMetrics: {
          averageResponseTime: 0,
          errorRate: 0,
          satisfactionScore: 0,
          completionRate: 0,
          efficiencyScore: 0,
          qualityScore: 0
        },
        engagementTrends: [],
        riskFactors: [],
        successMetrics: []
      },
      audit: [],
      createdAt: new Date(),
      emailVerified: false,
      mfaEnabled: false,
      accountLocked: false
    };

    setUsers(prev => [...prev, newUser]);
    onUserCreate?.(newUser);

    // Reset form
    setNewUserEmail('');
    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserRole('');
    setNewUserOrganization('');
    setSendWelcomeEmail(true);
    setShowCreateUserDialog(false);

    addNotification({
      type: 'success',
      title: 'User Created',
      message: `User ${newUser.displayName} has been created${sendWelcomeEmail ? ' and invited via email' : ''}.`,
      read: false
    });
  };

  const suspendUser = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: 'suspended' as const, accountLocked: true }
        : user
    ));

    onUserUpdate?.(userId, { status: 'suspended', accountLocked: true });
    setShowSuspendDialog(false);
    setSuspendUserId(null);

    addNotification({
      type: 'warning',
      title: 'User Suspended',
      message: 'User account has been suspended and access revoked.',
      read: false
    });
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
    onUserDelete?.(userId);
    setShowDeleteDialog(false);
    setDeleteUserId(null);

    addNotification({
      type: 'success',
      title: 'User Deleted',
      message: 'User account has been permanently deleted.',
      read: false
    });
  };

  const performBulkAction = () => {
    const selectedUsersList = Array.from(selectedUsers);
    
    switch (bulkActionType) {
      case 'activate':
        setUsers(prev => prev.map(user => 
          selectedUsers.has(user.id) 
            ? { ...user, status: 'active' as const, accountLocked: false }
            : user
        ));
        break;
      case 'suspend':
        setUsers(prev => prev.map(user => 
          selectedUsers.has(user.id) 
            ? { ...user, status: 'suspended' as const, accountLocked: true }
            : user
        ));
        break;
      case 'deactivate':
        setUsers(prev => prev.map(user => 
          selectedUsers.has(user.id) 
            ? { ...user, status: 'inactive' as const }
            : user
        ));
        break;
    }

    setSelectedUsers(new Set());
    setSelectAll(false);
    setShowBulkActionDialog(false);

    addNotification({
      type: 'success',
      title: 'Bulk Action Completed',
      message: `${bulkActionType} applied to ${selectedUsersList.length} users.`,
      read: false
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleUserSelect = (userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUsers);
    if (checked) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    setSelectedUsers(newSelection);
    setSelectAll(newSelection.size === filteredUsers.length);
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    return (
      <Badge 
        variant="outline" 
        style={{ borderColor: role.color, color: role.color }}
      >
        {role.displayName}
      </Badge>
    );
  };

  const formatLastActivity = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffMinutes = Math.floor(diffMs / (60 * 1000));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2" />
            User Management Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Comprehensive user administration and account lifecycle management
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Summary Stats */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-xs text-muted-foreground">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{users.filter(u => u.lastActiveAt && (new Date().getTime() - u.lastActiveAt.getTime()) < 24 * 60 * 60 * 1000).length}</div>
              <div className="text-xs text-muted-foreground">Active Today</div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setShowBulkActionDialog(true)} disabled={selectedUsers.size === 0}>
              <Settings className="h-4 w-4 mr-2" />
              Bulk Actions ({selectedUsers.size})
            </Button>
            <Button onClick={() => setShowCreateUserDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                <SelectItem value="org_1">Lincoln High School</SelectItem>
                <SelectItem value="org_2">Roosevelt Middle School</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="active_today">Active Today</SelectItem>
                <SelectItem value="active_week">Active This Week</SelectItem>
                <SelectItem value="inactive_month">Inactive 30+ Days</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setRoleFilter('all');
                setOrganizationFilter('all');
                setActivityFilter('all');
              }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm">Select All</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className={`border rounded-lg p-4 ${selectedUsers.has(user.id) ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={(checked) => handleUserSelect(user.id, checked as boolean)}
                    />
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.displayName} className="w-10 h-10 rounded-full" />
                      ) : (
                        <Users className="h-5 w-5" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{user.displayName}</h4>
                        {getStatusBadge(user.status)}
                        {getRoleBadge(user.role)}
                        {user.mfaEnabled && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            MFA
                          </Badge>
                        )}
                        {user.emailVerified && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </span>
                          <span className="flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            {user.organizationName}
                          </span>
                          {user.profile.department && (
                            <span className="flex items-center">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {user.profile.department}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <span>Last active: {formatLastActivity(user.lastActiveAt)}</span>
                          <span>Created: {user.createdAt.toLocaleDateString()}</span>
                          {user.activity.sessionsCompleted > 0 && (
                            <span>{user.activity.sessionsCompleted} sessions completed</span>
                          )}
                        </div>
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
                      <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user);
                        setShowUserDetailsDialog(true);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Key className="h-4 w-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.status === 'active' ? (
                        <DropdownMenuItem onClick={() => {
                          setSuspendUserId(user.id);
                          setShowSuspendDialog(true);
                        }}>
                          <Ban className="h-4 w-4 mr-2" />
                          Suspend Account
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => {
                          setUsers(prev => prev.map(u => 
                            u.id === user.id ? { ...u, status: 'active' as const, accountLocked: false } : u
                          ));
                        }}>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Activate Account
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => {
                          setDeleteUserId(user.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Quick Stats */}
                {user.activity.sessionsCompleted > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid gap-4 md:grid-cols-4 text-sm">
                      <div>
                        <div className="font-medium">Engagement Score</div>
                        <div className="flex items-center space-x-2">
                          <Progress value={user.activity.engagementScore} className="h-2 w-16" />
                          <span className="text-muted-foreground">{user.activity.engagementScore}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Sessions</div>
                        <div className="text-muted-foreground">{user.activity.sessionsCompleted} completed</div>
                      </div>
                      <div>
                        <div className="font-medium">Total Debate Time</div>
                        <div className="text-muted-foreground">{Math.round(user.activity.totalDebateTime / 60)} hours</div>
                      </div>
                      <div>
                        <div className="font-medium">Streak</div>
                        <div className="text-muted-foreground">{user.activity.streakDays} days</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the platform and assign their role and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  placeholder="Enter first name"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  placeholder="Enter last name"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <span>{role.displayName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={newUserOrganization} onValueChange={setNewUserOrganization}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_1">Lincoln High School</SelectItem>
                  <SelectItem value="org_2">Roosevelt Middle School</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="send-welcome">Send Welcome Email</Label>
              <Switch
                id="send-welcome"
                checked={sendWelcomeEmail}
                onCheckedChange={setSendWelcomeEmail}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Action</DialogTitle>
            <DialogDescription>
              Perform actions on {selectedUsers.size} selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={bulkActionType} onValueChange={(value: any) => setBulkActionType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activate">Activate Accounts</SelectItem>
                  <SelectItem value="deactivate">Deactivate Accounts</SelectItem>
                  <SelectItem value="suspend">Suspend Accounts</SelectItem>
                  <SelectItem value="send_email">Send Email</SelectItem>
                  <SelectItem value="change_role">Change Role</SelectItem>
                  <SelectItem value="export">Export Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-1">Selected Users ({selectedUsers.size})</div>
              <div className="text-sm text-muted-foreground max-h-20 overflow-y-auto">
                {Array.from(selectedUsers).map(userId => {
                  const user = users.find(u => u.id === userId);
                  return user ? user.displayName : userId;
                }).join(', ')}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={performBulkAction}>
              Apply Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={showUserDetailsDialog} onOpenChange={setShowUserDetailsDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <span>{selectedUser.displayName}</span>
                {getStatusBadge(selectedUser.status)}
              </DialogTitle>
              <DialogDescription>
                Detailed user information and activity analytics
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span>{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Role:</span>
                        <span>{selectedUser.role.displayName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Organization:</span>
                        <span>{selectedUser.organizationName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{selectedUser.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      {selectedUser.profile.phoneNumber && (
                        <div className="flex justify-between">
                          <span>Phone:</span>
                          <span>{selectedUser.profile.phoneNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Timezone:</span>
                        <span>{selectedUser.profile.timezone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Language:</span>
                        <span>{selectedUser.profile.language}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="activity" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="font-medium mb-2">Session Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sessions:</span>
                        <span>{selectedUser.activity.sessionsCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Time:</span>
                        <span>{Math.round(selectedUser.activity.totalDebateTime / 60)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Duration:</span>
                        <span>{selectedUser.activity.averageSessionDuration}m</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Engagement</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Score:</span>
                        <span>{selectedUser.activity.engagementScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Streak:</span>
                        <span>{selectedUser.activity.streakDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Collaboration:</span>
                        <span>{selectedUser.activity.collaborationScore}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Achievements</h4>
                    <div className="space-y-1">
                      {selectedUser.activity.achievements.map((achievement) => (
                        <Badge key={achievement.id} variant="outline" className="text-xs">
                          {achievement.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="permissions" className="space-y-4">
                <div className="grid gap-2 md:grid-cols-3 text-sm">
                  {Object.entries(selectedUser.permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      {typeof value === 'boolean' ? (
                        value ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <span>{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Login Patterns</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Logins:</span>
                        <span>{selectedUser.analytics.loginFrequency.totalLogins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Session:</span>
                        <span>{selectedUser.analytics.loginFrequency.averageSessionLength}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Most Active:</span>
                        <span>{selectedUser.analytics.loginFrequency.mostActiveTimeOfDay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Trend:</span>
                        <span className="capitalize">{selectedUser.analytics.loginFrequency.loginTrend}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Satisfaction:</span>
                        <span>{selectedUser.analytics.performanceMetrics.satisfactionScore}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completion Rate:</span>
                        <span>{selectedUser.analytics.performanceMetrics.completionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Efficiency:</span>
                        <span>{selectedUser.analytics.performanceMetrics.efficiencyScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quality Score:</span>
                        <span>{selectedUser.analytics.performanceMetrics.qualityScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Suspend User Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will suspend the user account and revoke all access. The user will not be able to log in until the account is reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => suspendUserId && suspendUser(suspendUserId)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Suspend Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user account and all associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteUserId && deleteUser(deleteUserId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
