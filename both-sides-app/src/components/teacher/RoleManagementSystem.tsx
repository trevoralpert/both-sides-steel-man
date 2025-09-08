/**
 * Role Management System Component
 * 
 * Task 8.5.1: Comprehensive role and permission management with role configuration,
 * permission matrix interface, role templates, and hierarchical permission inheritance
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
  Shield,
  Settings,
  Plus,
  Edit,
  Copy,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  Users,
  Crown,
  Key,
  Lock,
  Unlock,
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
  Globe,
  Building,
  School,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Calendar,
  Clock,
  Mail,
  Phone,
  Briefcase,
  UserCog,
  UserCheck,
  UserX,
  Users2,
  ShieldCheck,
  ShieldX,
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
  ChevronDown
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
interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: 'system' | 'organization' | 'custom';
  level: number; // 1-10, hierarchy level
  color: string;
  icon: string;
  permissions: Permission[];
  parentRole?: string;
  childRoles: string[];
  isDefault: boolean;
  isActive: boolean;
  metadata: RoleMetadata;
  analytics: RoleAnalytics;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: PermissionCategory;
  scope: PermissionScope;
  resource: string;
  action: PermissionAction;
  conditions?: PermissionCondition[];
  inherited: boolean;
  required: boolean;
  dangerous: boolean;
}

interface PermissionCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

interface PermissionScope {
  level: 'global' | 'organization' | 'class' | 'session' | 'self';
  restrictions?: string[];
}

interface PermissionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  description: string;
}

type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'approve' | 'moderate';

interface RoleMetadata {
  usageCount: number;
  lastUsed: Date;
  organizationSpecific: boolean;
  inheritanceLevel: number;
  templateSource?: string;
  customizations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceFlags: string[];
}

interface RoleAnalytics {
  totalUsers: number;
  activeUsers: number;
  avgSessionsPerUser: number;
  avgEngagementScore: number;
  permissionUsageStats: Record<string, number>;
  escalationRequests: number;
  securityIncidents: number;
  effectivenessScore: number;
  satisfactionRating: number;
}

interface RoleTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'educational' | 'administrative' | 'technical' | 'custom';
  targetAudience: string[];
  permissions: string[];
  level: number;
  color: string;
  icon: string;
  usageCount: number;
  rating: number;
  isRecommended: boolean;
  organizationType: 'k12' | 'higher_ed' | 'corporate' | 'any';
  lastUpdated: Date;
}

interface PermissionMatrix {
  roles: Role[];
  permissions: Permission[];
  matrix: Record<string, Record<string, boolean>>; // roleId -> permissionId -> hasPermission
  conflicts: PermissionConflict[];
  recommendations: PermissionRecommendation[];
}

interface PermissionConflict {
  type: 'hierarchy_violation' | 'circular_dependency' | 'privilege_escalation' | 'resource_conflict';
  severity: 'warning' | 'error' | 'critical';
  roles: string[];
  permissions: string[];
  description: string;
  recommendation: string;
}

interface PermissionRecommendation {
  type: 'grant' | 'revoke' | 'restructure' | 'split_role';
  role: string;
  permission?: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
}

interface RoleManagementSystemProps {
  organizationId?: string;
  canManageSystemRoles?: boolean;
  onRoleCreate?: (role: Role) => void;
  onRoleUpdate?: (roleId: string, updates: Partial<Role>) => void;
  onRoleDelete?: (roleId: string) => void;
}

export function RoleManagementSystem({
  organizationId,
  canManageSystemRoles = false,
  onRoleCreate,
  onRoleUpdate,
  onRoleDelete
}: RoleManagementSystemProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionCategories, setPermissionCategories] = useState<PermissionCategory[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix | null>(null);
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog States
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [showPermissionMatrixDialog, setShowPermissionMatrixDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form States
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | null>(null);
  
  // Role Creation/Edit State
  const [roleName, setRoleName] = useState('');
  const [roleDisplayName, setRoleDisplayName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleType, setRoleType] = useState<'system' | 'organization' | 'custom'>('custom');
  const [roleLevel, setRoleLevel] = useState(5);
  const [roleColor, setRoleColor] = useState('#3b82f6');
  const [roleIcon, setRoleIcon] = useState('Users');
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [roleParent, setRoleParent] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadPermissionCategories();
    loadRoleTemplates();
    generatePermissionMatrix();
  }, [organizationId]);

  const loadRoles = () => {
    const mockRoles: Role[] = [
      {
        id: 'system_admin',
        name: 'system_admin',
        displayName: 'System Administrator',
        description: 'Full system access with all administrative privileges',
        type: 'system',
        level: 10,
        color: '#dc2626',
        icon: 'Crown',
        permissions: [],
        childRoles: ['org_admin', 'support_staff'],
        isDefault: false,
        isActive: true,
        metadata: {
          usageCount: 3,
          lastUsed: new Date(),
          organizationSpecific: false,
          inheritanceLevel: 0,
          customizations: [],
          riskLevel: 'critical',
          complianceFlags: ['ADMIN_ACCESS', 'DATA_ACCESS']
        },
        analytics: {
          totalUsers: 3,
          activeUsers: 2,
          avgSessionsPerUser: 15.7,
          avgEngagementScore: 89,
          permissionUsageStats: {},
          escalationRequests: 0,
          securityIncidents: 0,
          effectivenessScore: 95,
          satisfactionRating: 4.8
        },
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        createdBy: 'system'
      },
      {
        id: 'org_admin',
        name: 'org_admin',
        displayName: 'Organization Administrator',
        description: 'Administrative access within organization scope',
        type: 'organization',
        level: 8,
        color: '#ea580c',
        icon: 'Building',
        permissions: [],
        parentRole: 'system_admin',
        childRoles: ['teacher', 'support_staff'],
        isDefault: true,
        isActive: true,
        metadata: {
          usageCount: 15,
          lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
          organizationSpecific: true,
          inheritanceLevel: 1,
          customizations: ['custom_reporting', 'extended_user_mgmt'],
          riskLevel: 'high',
          complianceFlags: ['ORG_ADMIN', 'USER_DATA_ACCESS']
        },
        analytics: {
          totalUsers: 15,
          activeUsers: 12,
          avgSessionsPerUser: 8.3,
          avgEngagementScore: 84,
          permissionUsageStats: { 'user_management': 95, 'reporting': 78, 'system_config': 42 },
          escalationRequests: 3,
          securityIncidents: 0,
          effectivenessScore: 87,
          satisfactionRating: 4.3
        },
        createdAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        createdBy: 'system_admin'
      },
      {
        id: 'teacher',
        name: 'teacher',
        displayName: 'Teacher',
        description: 'Classroom teacher with session management and student analytics',
        type: 'system',
        level: 5,
        color: '#3b82f6',
        icon: 'GraduationCap',
        permissions: [],
        parentRole: 'org_admin',
        childRoles: ['student'],
        isDefault: true,
        isActive: true,
        metadata: {
          usageCount: 89,
          lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000),
          organizationSpecific: false,
          inheritanceLevel: 2,
          customizations: ['grade_specific_tools'],
          riskLevel: 'medium',
          complianceFlags: ['STUDENT_DATA_ACCESS', 'EDUCATIONAL_CONTENT']
        },
        analytics: {
          totalUsers: 89,
          activeUsers: 74,
          avgSessionsPerUser: 12.8,
          avgEngagementScore: 91,
          permissionUsageStats: { 'session_create': 98, 'student_analytics': 85, 'content_management': 67 },
          escalationRequests: 12,
          securityIncidents: 1,
          effectivenessScore: 92,
          satisfactionRating: 4.6
        },
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        createdBy: 'system'
      },
      {
        id: 'student',
        name: 'student',
        displayName: 'Student',
        description: 'Student participant with basic debate and learning features',
        type: 'system',
        level: 2,
        color: '#10b981',
        icon: 'BookOpen',
        permissions: [],
        parentRole: 'teacher',
        childRoles: [],
        isDefault: true,
        isActive: true,
        metadata: {
          usageCount: 1247,
          lastUsed: new Date(Date.now() - 15 * 60 * 1000),
          organizationSpecific: false,
          inheritanceLevel: 3,
          customizations: [],
          riskLevel: 'low',
          complianceFlags: ['STUDENT_PRIVACY', 'LIMITED_ACCESS']
        },
        analytics: {
          totalUsers: 1247,
          activeUsers: 892,
          avgSessionsPerUser: 4.2,
          avgEngagementScore: 78,
          permissionUsageStats: { 'participate_debate': 95, 'view_own_progress': 72, 'peer_collaboration': 58 },
          escalationRequests: 45,
          securityIncidents: 2,
          effectivenessScore: 88,
          satisfactionRating: 4.1
        },
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        createdBy: 'system'
      },
      {
        id: 'support_staff',
        name: 'support_staff',
        displayName: 'Support Staff',
        description: 'Technical support with user assistance and system maintenance',
        type: 'organization',
        level: 6,
        color: '#f59e0b',
        icon: 'Briefcase',
        permissions: [],
        parentRole: 'org_admin',
        childRoles: [],
        isDefault: false,
        isActive: true,
        metadata: {
          usageCount: 7,
          lastUsed: new Date(Date.now() - 4 * 60 * 60 * 1000),
          organizationSpecific: true,
          inheritanceLevel: 2,
          customizations: ['support_ticketing', 'user_impersonation'],
          riskLevel: 'medium',
          complianceFlags: ['SUPPORT_ACCESS', 'USER_DATA_VIEW']
        },
        analytics: {
          totalUsers: 7,
          activeUsers: 5,
          avgSessionsPerUser: 6.8,
          avgEngagementScore: 82,
          permissionUsageStats: { 'user_support': 88, 'system_monitoring': 65, 'data_export': 34 },
          escalationRequests: 2,
          securityIncidents: 0,
          effectivenessScore: 79,
          satisfactionRating: 4.0
        },
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdBy: 'org_admin'
      }
    ];

    setRoles(mockRoles);
  };

  const loadPermissions = () => {
    const mockPermissions: Permission[] = [
      // User Management
      { id: 'user_create', name: 'user_create', displayName: 'Create Users', description: 'Create new user accounts', category: { id: 'user_mgmt', name: 'user_mgmt', displayName: 'User Management', description: 'User account operations', icon: 'Users', color: '#3b82f6', order: 1 }, scope: { level: 'organization' }, resource: 'user', action: 'create', inherited: false, required: false, dangerous: false },
      { id: 'user_read', name: 'user_read', displayName: 'View Users', description: 'View user profiles and information', category: { id: 'user_mgmt', name: 'user_mgmt', displayName: 'User Management', description: 'User account operations', icon: 'Users', color: '#3b82f6', order: 1 }, scope: { level: 'organization' }, resource: 'user', action: 'read', inherited: false, required: false, dangerous: false },
      { id: 'user_update', name: 'user_update', displayName: 'Update Users', description: 'Modify user profiles and settings', category: { id: 'user_mgmt', name: 'user_mgmt', displayName: 'User Management', description: 'User account operations', icon: 'Users', color: '#3b82f6', order: 1 }, scope: { level: 'organization' }, resource: 'user', action: 'update', inherited: false, required: false, dangerous: false },
      { id: 'user_delete', name: 'user_delete', displayName: 'Delete Users', description: 'Delete user accounts permanently', category: { id: 'user_mgmt', name: 'user_mgmt', displayName: 'User Management', description: 'User account operations', icon: 'Users', color: '#3b82f6', order: 1 }, scope: { level: 'organization' }, resource: 'user', action: 'delete', inherited: false, required: false, dangerous: true },
      
      // Session Management  
      { id: 'session_create', name: 'session_create', displayName: 'Create Sessions', description: 'Create and configure debate sessions', category: { id: 'session_mgmt', name: 'session_mgmt', displayName: 'Session Management', description: 'Debate session operations', icon: 'MessageSquare', color: '#10b981', order: 2 }, scope: { level: 'class' }, resource: 'session', action: 'create', inherited: false, required: false, dangerous: false },
      { id: 'session_moderate', name: 'session_moderate', displayName: 'Moderate Sessions', description: 'Moderate and control active sessions', category: { id: 'session_mgmt', name: 'session_mgmt', displayName: 'Session Management', description: 'Debate session operations', icon: 'MessageSquare', color: '#10b981', order: 2 }, scope: { level: 'session' }, resource: 'session', action: 'moderate', inherited: false, required: false, dangerous: false },
      { id: 'session_participate', name: 'session_participate', displayName: 'Participate in Sessions', description: 'Join and participate in debate sessions', category: { id: 'session_mgmt', name: 'session_mgmt', displayName: 'Session Management', description: 'Debate session operations', icon: 'MessageSquare', color: '#10b981', order: 2 }, scope: { level: 'session' }, resource: 'session', action: 'execute', inherited: false, required: false, dangerous: false },
      
      // Analytics
      { id: 'analytics_view', name: 'analytics_view', displayName: 'View Analytics', description: 'Access analytics and reports', category: { id: 'analytics', name: 'analytics', displayName: 'Analytics & Reporting', description: 'Data analysis and reporting', icon: 'BarChart3', color: '#8b5cf6', order: 3 }, scope: { level: 'class' }, resource: 'analytics', action: 'read', inherited: false, required: false, dangerous: false },
      { id: 'analytics_export', name: 'analytics_export', displayName: 'Export Analytics', description: 'Export analytics data and reports', category: { id: 'analytics', name: 'analytics', displayName: 'Analytics & Reporting', description: 'Data analysis and reporting', icon: 'BarChart3', color: '#8b5cf6', order: 3 }, scope: { level: 'organization' }, resource: 'analytics', action: 'execute', inherited: false, required: false, dangerous: false },
      
      // System Administration
      { id: 'system_config', name: 'system_config', displayName: 'System Configuration', description: 'Configure system settings and features', category: { id: 'system_admin', name: 'system_admin', displayName: 'System Administration', description: 'System-level operations', icon: 'Settings', color: '#dc2626', order: 4 }, scope: { level: 'global' }, resource: 'system', action: 'update', inherited: false, required: false, dangerous: true },
      { id: 'role_manage', name: 'role_manage', displayName: 'Manage Roles', description: 'Create and modify user roles and permissions', category: { id: 'system_admin', name: 'system_admin', displayName: 'System Administration', description: 'System-level operations', icon: 'Settings', color: '#dc2626', order: 4 }, scope: { level: 'organization' }, resource: 'role', action: 'update', inherited: false, required: false, dangerous: true },
      { id: 'audit_view', name: 'audit_view', displayName: 'View Audit Logs', description: 'Access system audit logs and security information', category: { id: 'system_admin', name: 'system_admin', displayName: 'System Administration', description: 'System-level operations', icon: 'Settings', color: '#dc2626', order: 4 }, scope: { level: 'organization' }, resource: 'audit', action: 'read', inherited: false, required: false, dangerous: false }
    ];

    setPermissions(mockPermissions);
  };

  const loadPermissionCategories = () => {
    const mockCategories: PermissionCategory[] = [
      { id: 'user_mgmt', name: 'user_mgmt', displayName: 'User Management', description: 'User account operations', icon: 'Users', color: '#3b82f6', order: 1 },
      { id: 'session_mgmt', name: 'session_mgmt', displayName: 'Session Management', description: 'Debate session operations', icon: 'MessageSquare', color: '#10b981', order: 2 },
      { id: 'analytics', name: 'analytics', displayName: 'Analytics & Reporting', description: 'Data analysis and reporting', icon: 'BarChart3', color: '#8b5cf6', order: 3 },
      { id: 'system_admin', name: 'system_admin', displayName: 'System Administration', description: 'System-level operations', icon: 'Settings', color: '#dc2626', order: 4 }
    ];

    setPermissionCategories(mockCategories);
  };

  const loadRoleTemplates = () => {
    const mockTemplates: RoleTemplate[] = [
      {
        id: 'template_k12_teacher',
        name: 'k12_teacher',
        displayName: 'K-12 Teacher',
        description: 'Standard permissions for K-12 classroom teachers',
        category: 'educational',
        targetAudience: ['elementary', 'middle_school', 'high_school'],
        permissions: ['session_create', 'session_moderate', 'user_read', 'analytics_view'],
        level: 5,
        color: '#3b82f6',
        icon: 'GraduationCap',
        usageCount: 156,
        rating: 4.7,
        isRecommended: true,
        organizationType: 'k12',
        lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'template_department_head',
        name: 'department_head',
        displayName: 'Department Head',
        description: 'Enhanced permissions for department heads and lead teachers',
        category: 'administrative',
        targetAudience: ['department_leads', 'senior_teachers'],
        permissions: ['session_create', 'session_moderate', 'user_read', 'user_update', 'analytics_view', 'analytics_export'],
        level: 7,
        color: '#ea580c',
        icon: 'Crown',
        usageCount: 34,
        rating: 4.5,
        isRecommended: true,
        organizationType: 'k12',
        lastUpdated: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'template_tech_support',
        name: 'tech_support',
        displayName: 'Technical Support',
        description: 'Support staff with user assistance permissions',
        category: 'technical',
        targetAudience: ['support_staff', 'it_team'],
        permissions: ['user_read', 'user_update', 'analytics_view', 'audit_view'],
        level: 6,
        color: '#f59e0b',
        icon: 'Briefcase',
        usageCount: 23,
        rating: 4.2,
        isRecommended: false,
        organizationType: 'any',
        lastUpdated: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'template_student_basic',
        name: 'student_basic',
        displayName: 'Basic Student',
        description: 'Standard student permissions for debate participation',
        category: 'educational',
        targetAudience: ['students', 'learners'],
        permissions: ['session_participate'],
        level: 2,
        color: '#10b981',
        icon: 'BookOpen',
        usageCount: 892,
        rating: 4.3,
        isRecommended: true,
        organizationType: 'any',
        lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      }
    ];

    setRoleTemplates(mockTemplates);
  };

  const generatePermissionMatrix = () => {
    // This would generate the full permission matrix with conflict detection
    const matrix: Record<string, Record<string, boolean>> = {};
    const conflicts: PermissionConflict[] = [];
    const recommendations: PermissionRecommendation[] = [];

    // Mock conflict detection
    conflicts.push({
      type: 'privilege_escalation',
      severity: 'warning',
      roles: ['student', 'teacher'],
      permissions: ['user_delete'],
      description: 'Student role should not have delete permissions that exceed teacher level',
      recommendation: 'Remove dangerous permissions from lower-level roles'
    });

    setPermissionMatrix({ roles, permissions, matrix, conflicts, recommendations });
  };

  const createRole = () => {
    if (!roleName.trim() || !roleDisplayName.trim()) {
      addNotification({
        type: 'error',
        title: 'Missing Information',
        message: 'Please provide role name and display name.',
        read: false
      });
      return;
    }

    const newRole: Role = {
      id: `role_${Date.now()}`,
      name: roleName,
      displayName: roleDisplayName,
      description: roleDescription,
      type: roleType,
      level: roleLevel,
      color: roleColor,
      icon: roleIcon,
      permissions: permissions.filter(p => rolePermissions.has(p.id)),
      parentRole: roleParent || undefined,
      childRoles: [],
      isDefault: false,
      isActive: true,
      metadata: {
        usageCount: 0,
        lastUsed: new Date(),
        organizationSpecific: roleType === 'organization',
        inheritanceLevel: roleParent ? (roles.find(r => r.id === roleParent)?.metadata.inheritanceLevel || 0) + 1 : 0,
        customizations: [],
        riskLevel: rolePermissions.size > 10 ? 'high' : rolePermissions.size > 5 ? 'medium' : 'low',
        complianceFlags: []
      },
      analytics: {
        totalUsers: 0,
        activeUsers: 0,
        avgSessionsPerUser: 0,
        avgEngagementScore: 0,
        permissionUsageStats: {},
        escalationRequests: 0,
        securityIncidents: 0,
        effectivenessScore: 0,
        satisfactionRating: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user?.id || 'admin'
    };

    setRoles(prev => [...prev, newRole]);
    onRoleCreate?.(newRole);

    // Reset form
    resetRoleForm();
    setShowCreateRoleDialog(false);

    addNotification({
      type: 'success',
      title: 'Role Created',
      message: `Role "${roleDisplayName}" has been created with ${rolePermissions.size} permissions.`,
      read: false
    });
  };

  const updateRole = () => {
    if (!selectedRole) return;

    const updatedRole: Role = {
      ...selectedRole,
      name: roleName,
      displayName: roleDisplayName,
      description: roleDescription,
      type: roleType,
      level: roleLevel,
      color: roleColor,
      icon: roleIcon,
      permissions: permissions.filter(p => rolePermissions.has(p.id)),
      parentRole: roleParent || undefined,
      updatedAt: new Date(),
      metadata: {
        ...selectedRole.metadata,
        riskLevel: rolePermissions.size > 10 ? 'high' : rolePermissions.size > 5 ? 'medium' : 'low'
      }
    };

    setRoles(prev => prev.map(role => 
      role.id === selectedRole.id ? updatedRole : role
    ));
    onRoleUpdate?.(selectedRole.id, updatedRole);

    resetRoleForm();
    setSelectedRole(null);
    setShowEditRoleDialog(false);
    setIsEditMode(false);

    addNotification({
      type: 'success',
      title: 'Role Updated',
      message: `Role "${roleDisplayName}" has been updated.`,
      read: false
    });
  };

  const deleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    // Check if role has users
    if (role.analytics.totalUsers > 0) {
      addNotification({
        type: 'error',
        title: 'Cannot Delete Role',
        message: `Role "${role.displayName}" has ${role.analytics.totalUsers} assigned users. Reassign users before deleting.`,
        read: false
      });
      return;
    }

    setRoles(prev => prev.filter(r => r.id !== roleId));
    onRoleDelete?.(roleId);
    setShowDeleteDialog(false);
    setDeleteRoleId(null);

    addNotification({
      type: 'success',
      title: 'Role Deleted',
      message: `Role "${role.displayName}" has been deleted.`,
      read: false
    });
  };

  const duplicateRole = (sourceRole: Role) => {
    const newRole: Role = {
      ...sourceRole,
      id: `role_${Date.now()}`,
      name: `${sourceRole.name}_copy`,
      displayName: `${sourceRole.displayName} (Copy)`,
      isDefault: false,
      metadata: {
        ...sourceRole.metadata,
        usageCount: 0,
        templateSource: sourceRole.id
      },
      analytics: {
        totalUsers: 0,
        activeUsers: 0,
        avgSessionsPerUser: 0,
        avgEngagementScore: 0,
        permissionUsageStats: {},
        escalationRequests: 0,
        securityIncidents: 0,
        effectivenessScore: 0,
        satisfactionRating: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user?.id || 'admin'
    };

    setRoles(prev => [...prev, newRole]);
    onRoleCreate?.(newRole);

    addNotification({
      type: 'success',
      title: 'Role Duplicated',
      message: `Created copy of "${sourceRole.displayName}".`,
      read: false
    });
  };

  const applyTemplate = (template: RoleTemplate) => {
    setRoleName(template.name);
    setRoleDisplayName(template.displayName);
    setRoleDescription(template.description);
    setRoleLevel(template.level);
    setRoleColor(template.color);
    setRoleIcon(template.icon);
    setRolePermissions(new Set(template.permissions));
    setSelectedTemplate(template);
    setShowTemplateDialog(false);
    setShowCreateRoleDialog(true);
  };

  const resetRoleForm = () => {
    setRoleName('');
    setRoleDisplayName('');
    setRoleDescription('');
    setRoleType('custom');
    setRoleLevel(5);
    setRoleColor('#3b82f6');
    setRoleIcon('Users');
    setRolePermissions(new Set());
    setRoleParent('');
  };

  const editRole = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDisplayName(role.displayName);
    setRoleDescription(role.description);
    setRoleType(role.type);
    setRoleLevel(role.level);
    setRoleColor(role.color);
    setRoleIcon(role.icon);
    setRolePermissions(new Set(role.permissions.map(p => p.id)));
    setRoleParent(role.parentRole || '');
    setIsEditMode(true);
    setShowEditRoleDialog(true);
  };

  const getRoleIcon = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      Crown, Users, GraduationCap, BookOpen, Briefcase, Building, Settings, Shield
    };
    const IconComponent = iconMap[iconName] || Users;
    return <IconComponent className="h-4 w-4" />;
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500">High Risk</Badge>;
      case 'medium': return <Badge variant="secondary">Medium Risk</Badge>;
      case 'low': return <Badge variant="outline">Low Risk</Badge>;
      default: return <Badge variant="outline">{risk}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'system': return <Badge className="bg-blue-500">System</Badge>;
      case 'organization': return <Badge className="bg-green-500">Organization</Badge>;
      case 'custom': return <Badge variant="outline">Custom</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredRoles = roles.filter(role => {
    if (searchQuery && !role.displayName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !role.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (roleTypeFilter !== 'all' && role.type !== roleTypeFilter) return false;
    if (levelFilter !== 'all') {
      const level = parseInt(levelFilter);
      if (role.level !== level) return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !role.isActive) return false;
      if (statusFilter === 'inactive' && role.isActive) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Role Management System
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure roles, permissions, and access control hierarchies
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Summary Stats */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{roles.length}</div>
              <div className="text-xs text-muted-foreground">Total Roles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{roles.filter(r => r.isActive).length}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{roleTemplates.length}</div>
              <div className="text-xs text-muted-foreground">Templates</div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
              <Star className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button variant="outline" onClick={() => setShowPermissionMatrixDialog(true)}>
              <Network className="h-4 w-4 mr-2" />
              Permission Matrix
            </Button>
            <Button onClick={() => setShowCreateRoleDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles">
            Roles ({roles.length})
          </TabsTrigger>
          <TabsTrigger value="permissions">
            Permissions ({permissions.length})
          </TabsTrigger>
          <TabsTrigger value="hierarchy">
            Role Hierarchy
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Role Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={roleTypeFilter} onValueChange={setRoleTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="10">Level 10 (Admin)</SelectItem>
                    <SelectItem value="8">Level 8 (Manager)</SelectItem>
                    <SelectItem value="5">Level 5 (Teacher)</SelectItem>
                    <SelectItem value="2">Level 2 (Student)</SelectItem>
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
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setRoleTypeFilter('all');
                  setLevelFilter('all');
                  setStatusFilter('all');
                }}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Roles List */}
          <div className="space-y-4">
            {filteredRoles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: role.color }}
                        >
                          {getRoleIcon(role.icon)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{role.displayName}</h4>
                          <div className="flex items-center space-x-2">
                            {getTypeBadge(role.type)}
                            <Badge variant="outline">Level {role.level}</Badge>
                            {getRiskBadge(role.metadata.riskLevel)}
                            {role.isDefault && <Badge>Default</Badge>}
                            {!role.isActive && <Badge variant="destructive">Inactive</Badge>}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Role Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => editRole(role)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateRole(role)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            setDeleteRoleId(role.id);
                            setShowDeleteDialog(true);
                          }}
                          disabled={role.analytics.totalUsers > 0}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    {/* Usage Stats */}
                    <div>
                      <h5 className="font-medium mb-2">Usage</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Users:</span>
                          <span>{role.analytics.totalUsers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active:</span>
                          <span>{role.analytics.activeUsers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Effectiveness:</span>
                          <span>{role.analytics.effectivenessScore}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div>
                      <h5 className="font-medium mb-2">Permissions</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span>{role.permissions.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dangerous:</span>
                          <span className="text-red-600">{role.permissions.filter(p => p.dangerous).length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Inherited:</span>
                          <span>{role.permissions.filter(p => p.inherited).length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hierarchy */}
                    <div>
                      <h5 className="font-medium mb-2">Hierarchy</h5>
                      <div className="space-y-1 text-sm">
                        {role.parentRole && (
                          <div className="flex items-center space-x-1">
                            <ArrowUp className="h-3 w-3" />
                            <span>Parent: {roles.find(r => r.id === role.parentRole)?.displayName}</span>
                          </div>
                        )}
                        {role.childRoles.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <ArrowDown className="h-3 w-3" />
                            <span>Children: {role.childRoles.length}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Level:</span>
                          <span>{role.metadata.inheritanceLevel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div>
                      <h5 className="font-medium mb-2">Details</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Created:</span>
                          <span>{role.createdAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Updated:</span>
                          <span>{role.updatedAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Customizations:</span>
                          <span>{role.metadata.customizations.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Permissions Preview */}
                  {role.permissions.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 8).map((permission) => (
                          <Badge key={permission.id} variant="outline" className={`text-xs ${permission.dangerous ? 'border-red-500 text-red-600' : ''}`}>
                            {permission.displayName}
                          </Badge>
                        ))}
                        {role.permissions.length > 8 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 8} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          {/* Permissions by Category */}
          {permissionCategories.sort((a, b) => a.order - b.order).map((category) => {
            const categoryPermissions = permissions.filter(p => p.category.id === category.id);
            
            return (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: category.color }}
                    >
                      {getRoleIcon(category.icon)}
                    </div>
                    <span>{category.displayName}</span>
                    <Badge variant="outline">{categoryPermissions.length} permissions</Badge>
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {categoryPermissions.map((permission) => (
                      <div key={permission.id} className={`p-3 border rounded-lg ${permission.dangerous ? 'border-red-200 bg-red-50' : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-medium">{permission.displayName}</h5>
                            <p className="text-sm text-muted-foreground">{permission.description}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {permission.scope.level}
                            </Badge>
                            {permission.dangerous && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Dangerous
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="capitalize">{permission.action}</span> • {permission.resource}
                          {permission.required && <span> • Required</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GitBranch className="h-5 w-5 mr-2" />
                Role Hierarchy
              </CardTitle>
              <CardDescription>
                Visual representation of role inheritance and permission flow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Render hierarchy tree */}
                {roles.filter(r => !r.parentRole).map(rootRole => (
                  <div key={rootRole.id} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm"
                        style={{ backgroundColor: rootRole.color }}
                      >
                        {getRoleIcon(rootRole.icon)}
                      </div>
                      <span className="font-medium">{rootRole.displayName}</span>
                      <Badge variant="outline">Level {rootRole.level}</Badge>
                      <Badge variant="outline">{rootRole.analytics.totalUsers} users</Badge>
                    </div>
                    
                    {/* Render child roles */}
                    {rootRole.childRoles.length > 0 && (
                      <div className="ml-6 space-y-2">
                        {rootRole.childRoles.map(childRoleId => {
                          const childRole = roles.find(r => r.id === childRoleId);
                          if (!childRole) return null;
                          
                          return (
                            <div key={childRole.id} className="flex items-center space-x-3 border-l-2 border-muted pl-4">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              <div 
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                                style={{ backgroundColor: childRole.color }}
                              >
                                {getRoleIcon(childRole.icon)}
                              </div>
                              <span>{childRole.displayName}</span>
                              <Badge variant="outline">Level {childRole.level}</Badge>
                              <Badge variant="outline">{childRole.analytics.totalUsers} users</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Role Usage Analytics */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Role Usage Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="text-sm">{role.displayName}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right text-sm">
                          <div>{role.analytics.totalUsers} users</div>
                          <div className="text-muted-foreground">{role.analytics.activeUsers} active</div>
                        </div>
                        <div className="w-24">
                          <Progress 
                            value={(role.analytics.totalUsers / Math.max(...roles.map(r => r.analytics.totalUsers))) * 100} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Effectiveness Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roles.filter(r => r.analytics.effectivenessScore > 0).map((role) => (
                    <div key={role.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{role.displayName}:</span>
                        <span className={
                          role.analytics.effectivenessScore >= 90 ? 'text-green-600' :
                          role.analytics.effectivenessScore >= 80 ? 'text-blue-600' :
                          role.analytics.effectivenessScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }>
                          {role.analytics.effectivenessScore}%
                        </span>
                      </div>
                      <Progress value={role.analytics.effectivenessScore} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Permission Usage Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Permission Usage Insights</CardTitle>
              <CardDescription>
                Most and least used permissions across all roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3 text-green-600">Most Used Permissions</h4>
                  <div className="space-y-2">
                    {['session_create', 'analytics_view', 'user_read', 'session_participate'].map((permId, index) => {
                      const perm = permissions.find(p => p.id === permId);
                      if (!perm) return null;
                      return (
                        <div key={permId} className="flex items-center justify-between text-sm">
                          <span>{perm.displayName}</span>
                          <Badge variant="outline">{95 - index * 10}% usage</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-orange-600">Underused Permissions</h4>
                  <div className="space-y-2">
                    {['audit_view', 'system_config', 'role_manage'].map((permId, index) => {
                      const perm = permissions.find(p => p.id === permId);
                      if (!perm) return null;
                      return (
                        <div key={permId} className="flex items-center justify-between text-sm">
                          <span>{perm.displayName}</span>
                          <Badge variant="outline">{25 - index * 5}% usage</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Role Dialog */}
      <Dialog open={showCreateRoleDialog} onOpenChange={setShowCreateRoleDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role with specific permissions and access levels
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input
                  placeholder="e.g., department_head"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="e.g., Department Head"
                  value={roleDisplayName}
                  onChange={(e) => setRoleDisplayName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the role's purpose and responsibilities"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Role Type</Label>
                <Select value={roleType} onValueChange={(value: any) => setRoleType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    {canManageSystemRoles && <SelectItem value="system">System</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Access Level (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={roleLevel}
                  onChange={(e) => setRoleLevel(parseInt(e.target.value) || 5)}
                />
              </div>
              <div className="space-y-2">
                <Label>Parent Role</Label>
                <Select value={roleParent} onValueChange={setRoleParent}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (Root Role)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Root Role)</SelectItem>
                    {roles.filter(r => r.level > roleLevel).map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.displayName} (Level {role.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex space-x-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'].map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${roleColor === color ? 'border-primary' : 'border-muted'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setRoleColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={roleIcon} onValueChange={setRoleIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Users">Users</SelectItem>
                    <SelectItem value="Crown">Crown</SelectItem>
                    <SelectItem value="GraduationCap">Graduation Cap</SelectItem>
                    <SelectItem value="BookOpen">Book Open</SelectItem>
                    <SelectItem value="Briefcase">Briefcase</SelectItem>
                    <SelectItem value="Building">Building</SelectItem>
                    <SelectItem value="Settings">Settings</SelectItem>
                    <SelectItem value="Shield">Shield</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permissions Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Permissions ({rolePermissions.size} selected)</Label>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setRolePermissions(new Set(permissions.map(p => p.id)))}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setRolePermissions(new Set())}>
                    Clear All
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                {permissionCategories.sort((a, b) => a.order - b.order).map((category) => {
                  const categoryPermissions = permissions.filter(p => p.category.id === category.id);
                  
                  return (
                    <div key={category.id} className="mb-6">
                      <div className="flex items-center space-x-2 mb-3">
                        <div 
                          className="w-4 h-4 rounded flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: category.color }}
                        >
                          {getRoleIcon(category.icon)}
                        </div>
                        <h4 className="font-medium">{category.displayName}</h4>
                      </div>
                      
                      <div className="grid gap-2 ml-6">
                        {categoryPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={rolePermissions.has(permission.id)}
                              onCheckedChange={(checked) => {
                                const newPermissions = new Set(rolePermissions);
                                if (checked) {
                                  newPermissions.add(permission.id);
                                } else {
                                  newPermissions.delete(permission.id);
                                }
                                setRolePermissions(newPermissions);
                              }}
                            />
                            <Label htmlFor={permission.id} className="text-sm">
                              {permission.displayName}
                              {permission.dangerous && (
                                <AlertTriangle className="inline h-3 w-3 ml-1 text-red-500" />
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateRoleDialog(false);
              resetRoleForm();
            }}>
              Cancel
            </Button>
            <Button onClick={createRole} disabled={!roleName.trim() || !roleDisplayName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog (Similar to Create but with update logic) */}
      <Dialog open={showEditRoleDialog} onOpenChange={setShowEditRoleDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Modify role permissions and settings
            </DialogDescription>
          </DialogHeader>
          {/* Same form content as create dialog */}
          <div className="space-y-4 py-4">
            {/* Abbreviated for space - same form fields as create dialog */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={roleDisplayName}
                  onChange={(e) => setRoleDisplayName(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditRoleDialog(false);
              resetRoleForm();
              setSelectedRole(null);
              setIsEditMode(false);
            }}>
              Cancel
            </Button>
            <Button onClick={updateRole}>
              <Edit className="h-4 w-4 mr-2" />
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Templates Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Role Templates</DialogTitle>
            <DialogDescription>
              Choose from pre-configured role templates to get started quickly
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 py-4">
            {roleTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: template.color }}
                        >
                          {getRoleIcon(template.icon)}
                        </div>
                        <h4 className="font-semibold">{template.displayName}</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">{template.category}</Badge>
                        <Badge variant="outline">Level {template.level}</Badge>
                        {template.isRecommended && <Badge>Recommended</Badge>}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Permissions:</span>
                      <span>{template.permissions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Usage:</span>
                      <span>{template.usageCount} times</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rating:</span>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                        <span>{template.rating}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => applyTemplate(template)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The role will be permanently deleted. 
              Make sure no users are currently assigned to this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteRoleId && deleteRole(deleteRoleId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
