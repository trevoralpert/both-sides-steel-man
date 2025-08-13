/**
 * Role-Based Access Control (RBAC) System
 * Task 2.2.7.1: Define role hierarchy and permissions
 */

import { UserRole } from '@prisma/client';

// Define all possible permissions in the system
export enum Permission {
  // Profile permissions
  PROFILE_READ_OWN = 'profile:read:own',
  PROFILE_UPDATE_OWN = 'profile:update:own',
  PROFILE_DELETE_OWN = 'profile:delete:own',
  PROFILE_READ_ANY = 'profile:read:any',
  PROFILE_UPDATE_ANY = 'profile:update:any',
  PROFILE_DELETE_ANY = 'profile:delete:any',

  // User permissions
  USER_READ_OWN = 'user:read:own',
  USER_UPDATE_OWN = 'user:update:own',
  USER_READ_ANY = 'user:read:any',
  USER_UPDATE_ANY = 'user:update:any',
  USER_DELETE_ANY = 'user:delete:any',
  USER_MANAGE_STATUS = 'user:manage:status',
  USER_BULK_OPERATIONS = 'user:bulk:operations',

  // Class permissions
  CLASS_READ_ENROLLED = 'class:read:enrolled',
  CLASS_READ_OWN = 'class:read:own',
  CLASS_CREATE = 'class:create',
  CLASS_UPDATE_OWN = 'class:update:own',
  CLASS_DELETE_OWN = 'class:delete:own',
  CLASS_READ_ANY = 'class:read:any',
  CLASS_UPDATE_ANY = 'class:update:any',
  CLASS_DELETE_ANY = 'class:delete:any',
  CLASS_MANAGE_ENROLLMENT = 'class:manage:enrollment',

  // Organization permissions
  ORGANIZATION_READ_OWN = 'organization:read:own',
  ORGANIZATION_READ_ANY = 'organization:read:any',
  ORGANIZATION_CREATE = 'organization:create',
  ORGANIZATION_UPDATE_OWN = 'organization:update:own',
  ORGANIZATION_UPDATE_ANY = 'organization:update:any',
  ORGANIZATION_DELETE_ANY = 'organization:delete:any',

  // Enrollment permissions
  ENROLLMENT_READ_OWN = 'enrollment:read:own',
  ENROLLMENT_CREATE_OWN = 'enrollment:create:own',
  ENROLLMENT_UPDATE_OWN = 'enrollment:update:own',
  ENROLLMENT_DELETE_OWN = 'enrollment:delete:own',
  ENROLLMENT_READ_CLASS = 'enrollment:read:class', // Teachers can see their class enrollments
  ENROLLMENT_MANAGE_CLASS = 'enrollment:manage:class', // Teachers can manage their class enrollments
  ENROLLMENT_READ_ANY = 'enrollment:read:any',
  ENROLLMENT_MANAGE_ANY = 'enrollment:manage:any',

  // Debate permissions (for future phases)
  DEBATE_PARTICIPATE = 'debate:participate',
  DEBATE_MODERATE = 'debate:moderate',
  DEBATE_READ_ANY = 'debate:read:any',

  // Audit permissions
  AUDIT_READ_OWN = 'audit:read:own',
  AUDIT_READ_ANY = 'audit:read:any',
  AUDIT_DELETE = 'audit:delete',
  AUDIT_EXPORT = 'audit:export',

  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_ANALYTICS = 'system:analytics',
  SYSTEM_BACKUP = 'system:backup',
}

// Define resource types for ownership checks
export enum ResourceType {
  PROFILE = 'profile',
  USER = 'user',
  CLASS = 'class',
  ORGANIZATION = 'organization',
  ENROLLMENT = 'enrollment',
  DEBATE = 'debate',
  AUDIT_LOG = 'audit_log',
}

// Role hierarchy and permission mappings
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.STUDENT]: [
    // Profile permissions
    Permission.PROFILE_READ_OWN,
    Permission.PROFILE_UPDATE_OWN,
    Permission.PROFILE_DELETE_OWN,

    // User permissions (own only)
    Permission.USER_READ_OWN,
    Permission.USER_UPDATE_OWN,

    // Class permissions (enrolled classes only)
    Permission.CLASS_READ_ENROLLED,

    // Enrollment permissions (own only)
    Permission.ENROLLMENT_READ_OWN,
    Permission.ENROLLMENT_CREATE_OWN,
    Permission.ENROLLMENT_UPDATE_OWN,
    Permission.ENROLLMENT_DELETE_OWN,

    // Debate permissions (future)
    Permission.DEBATE_PARTICIPATE,

    // Audit permissions (own actions only)
    Permission.AUDIT_READ_OWN,
  ],

  [UserRole.TEACHER]: [
    // Include all student permissions
    ...ROLE_PERMISSIONS[UserRole.STUDENT],

    // Additional profile permissions
    // Note: Teachers can read student profiles in their classes (handled by resource ownership)

    // Class permissions
    Permission.CLASS_READ_OWN,
    Permission.CLASS_CREATE,
    Permission.CLASS_UPDATE_OWN,
    Permission.CLASS_DELETE_OWN,
    Permission.CLASS_MANAGE_ENROLLMENT,

    // Organization permissions (read only for their organization)
    Permission.ORGANIZATION_READ_OWN,

    // Enrollment permissions for their classes
    Permission.ENROLLMENT_READ_CLASS,
    Permission.ENROLLMENT_MANAGE_CLASS,

    // Debate permissions
    Permission.DEBATE_MODERATE,

    // Limited analytics for their classes
    Permission.SYSTEM_ANALYTICS, // Will be scoped to their classes
  ],

  [UserRole.ADMIN]: [
    // Full system access - includes all permissions
    ...Object.values(Permission),
  ],
};

// Role hierarchy (higher roles inherit from lower roles)
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.STUDENT]: [], // Base role
  [UserRole.TEACHER]: [UserRole.STUDENT], // Inherits from STUDENT
  [UserRole.ADMIN]: [UserRole.TEACHER, UserRole.STUDENT], // Inherits from TEACHER and STUDENT
};

// Permission categories for easier management
export const PERMISSION_CATEGORIES = {
  PROFILE: Object.values(Permission).filter(p => p.startsWith('profile:')),
  USER: Object.values(Permission).filter(p => p.startsWith('user:')),
  CLASS: Object.values(Permission).filter(p => p.startsWith('class:')),
  ORGANIZATION: Object.values(Permission).filter(p => p.startsWith('organization:')),
  ENROLLMENT: Object.values(Permission).filter(p => p.startsWith('enrollment:')),
  DEBATE: Object.values(Permission).filter(p => p.startsWith('debate:')),
  AUDIT: Object.values(Permission).filter(p => p.startsWith('audit:')),
  SYSTEM: Object.values(Permission).filter(p => p.startsWith('system:')),
};

// Helper function to get all permissions for a role (including inherited)
export function getAllPermissionsForRole(role: UserRole): Permission[] {
  const directPermissions = ROLE_PERMISSIONS[role] || [];
  const inheritedRoles = ROLE_HIERARCHY[role] || [];
  
  const inheritedPermissions = inheritedRoles.flatMap(inheritedRole => 
    ROLE_PERMISSIONS[inheritedRole] || []
  );

  // Remove duplicates and return
  return [...new Set([...directPermissions, ...inheritedPermissions])];
}

// Helper function to check if a role has a specific permission
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const allPermissions = getAllPermissionsForRole(role);
  return allPermissions.includes(permission);
}

// Helper function to check role hierarchy
export function isRoleHigherOrEqual(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === requiredRole) return true;
  
  const hierarchy = ROLE_HIERARCHY[userRole] || [];
  return hierarchy.includes(requiredRole);
}

// Resource ownership rules
export interface ResourceOwnershipRule {
  resourceType: ResourceType;
  ownershipCheck: (userId: string, resourceId: string, context?: any) => Promise<boolean>;
  permissions: Permission[];
}

// Default permission descriptions for UI
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [Permission.PROFILE_READ_OWN]: 'View your own profile',
  [Permission.PROFILE_UPDATE_OWN]: 'Update your own profile',
  [Permission.PROFILE_DELETE_OWN]: 'Delete your own profile',
  [Permission.PROFILE_READ_ANY]: 'View any user profile',
  [Permission.PROFILE_UPDATE_ANY]: 'Update any user profile',
  [Permission.PROFILE_DELETE_ANY]: 'Delete any user profile',

  [Permission.USER_READ_OWN]: 'View your own user account',
  [Permission.USER_UPDATE_OWN]: 'Update your own user account',
  [Permission.USER_READ_ANY]: 'View any user account',
  [Permission.USER_UPDATE_ANY]: 'Update any user account',
  [Permission.USER_DELETE_ANY]: 'Delete any user account',
  [Permission.USER_MANAGE_STATUS]: 'Activate/deactivate user accounts',
  [Permission.USER_BULK_OPERATIONS]: 'Perform bulk user operations',

  [Permission.CLASS_READ_ENROLLED]: 'View classes you are enrolled in',
  [Permission.CLASS_READ_OWN]: 'View classes you created',
  [Permission.CLASS_CREATE]: 'Create new classes',
  [Permission.CLASS_UPDATE_OWN]: 'Update classes you created',
  [Permission.CLASS_DELETE_OWN]: 'Delete classes you created',
  [Permission.CLASS_READ_ANY]: 'View any class',
  [Permission.CLASS_UPDATE_ANY]: 'Update any class',
  [Permission.CLASS_DELETE_ANY]: 'Delete any class',
  [Permission.CLASS_MANAGE_ENROLLMENT]: 'Manage class enrollments',

  [Permission.ORGANIZATION_READ_OWN]: 'View your organization',
  [Permission.ORGANIZATION_READ_ANY]: 'View any organization',
  [Permission.ORGANIZATION_CREATE]: 'Create organizations',
  [Permission.ORGANIZATION_UPDATE_OWN]: 'Update your organization',
  [Permission.ORGANIZATION_UPDATE_ANY]: 'Update any organization',
  [Permission.ORGANIZATION_DELETE_ANY]: 'Delete any organization',

  [Permission.ENROLLMENT_READ_OWN]: 'View your enrollments',
  [Permission.ENROLLMENT_CREATE_OWN]: 'Enroll in classes',
  [Permission.ENROLLMENT_UPDATE_OWN]: 'Update your enrollments',
  [Permission.ENROLLMENT_DELETE_OWN]: 'Withdraw from classes',
  [Permission.ENROLLMENT_READ_CLASS]: 'View class enrollments',
  [Permission.ENROLLMENT_MANAGE_CLASS]: 'Manage class enrollments',
  [Permission.ENROLLMENT_READ_ANY]: 'View any enrollment',
  [Permission.ENROLLMENT_MANAGE_ANY]: 'Manage any enrollment',

  [Permission.DEBATE_PARTICIPATE]: 'Participate in debates',
  [Permission.DEBATE_MODERATE]: 'Moderate debates',
  [Permission.DEBATE_READ_ANY]: 'View any debate',

  [Permission.AUDIT_READ_OWN]: 'View your audit logs',
  [Permission.AUDIT_READ_ANY]: 'View any audit logs',
  [Permission.AUDIT_DELETE]: 'Delete audit logs',
  [Permission.AUDIT_EXPORT]: 'Export audit logs',

  [Permission.SYSTEM_ADMIN]: 'Full system administration',
  [Permission.SYSTEM_ANALYTICS]: 'View system analytics',
  [Permission.SYSTEM_BACKUP]: 'Create system backups',
};

// Role descriptions for UI
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.STUDENT]: 'Student - Can participate in debates and manage their own profile',
  [UserRole.TEACHER]: 'Teacher - Can create and manage classes, moderate debates, and view student progress',
  [UserRole.ADMIN]: 'Administrator - Full system access including user management and system configuration',
};
