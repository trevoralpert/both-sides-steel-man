/**
 * Permission Validation Service
 * Task 2.2.7.4: Add permission validation utilities
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { 
  Permission, 
  ResourceType, 
  getAllPermissionsForRole, 
  roleHasPermission, 
  isRoleHigherOrEqual 
} from '../permissions';

export interface AccessCheckResult {
  hasAccess: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  requiredRole?: UserRole;
}

export interface ResourceAccessInfo {
  resourceId: string;
  resourceType: ResourceType;
  hasAccess: boolean;
  accessType: 'owner' | 'permission' | 'role' | 'denied';
  permissions: Permission[];
}

@Injectable()
export class PermissionValidationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a user has a specific permission
   */
  hasPermission(userRole: UserRole, permission: Permission): boolean {
    return roleHasPermission(userRole, permission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Get all permissions for a user role
   */
  getUserPermissions(userRole: UserRole): Permission[] {
    return getAllPermissionsForRole(userRole);
  }

  /**
   * Check if a user can access a specific resource
   */
  async canAccessResource(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    requiredPermissions: Permission[] = []
  ): Promise<AccessCheckResult> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: { include: { class: true } },
          created_classes: true,
        },
      });

      if (!user) {
        return { hasAccess: false, reason: 'User not found' };
      }

      const userPermissions = getAllPermissionsForRole(user.role);

      // Check if user has required permissions
      if (requiredPermissions.length > 0) {
        const hasRequiredPermissions = requiredPermissions.every(permission =>
          userPermissions.includes(permission)
        );

        if (hasRequiredPermissions) {
          return { hasAccess: true };
        }
      }

      // Check resource ownership
      const isOwner = await this.checkResourceOwnership(user, resourceType, resourceId);
      if (isOwner) {
        return { hasAccess: true };
      }

      return {
        hasAccess: false,
        reason: 'Insufficient permissions and not resource owner',
        requiredPermissions,
      };
    } catch (error) {
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }

  /**
   * Get all resources of a specific type that a user can access
   */
  async getAccessibleResources(
    userId: string,
    resourceType: ResourceType,
    permission?: Permission
  ): Promise<ResourceAccessInfo[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          enrollments: { include: { class: true } },
          created_classes: true,
          profile: true,
        },
      });

      if (!user) {
        return [];
      }

      const userPermissions = getAllPermissionsForRole(user.role);
      const resources: ResourceAccessInfo[] = [];

      switch (resourceType) {
        case ResourceType.PROFILE:
          return this.getAccessibleProfiles(user, userPermissions, permission);
        
        case ResourceType.CLASS:
          return this.getAccessibleClasses(user, userPermissions, permission);
        
        case ResourceType.USER:
          return this.getAccessibleUsers(user, userPermissions, permission);
        
        case ResourceType.ORGANIZATION:
          return this.getAccessibleOrganizations(user, userPermissions, permission);
        
        default:
          return [];
      }
    } catch (error) {
      return [];
    }
  }

  /**
   * Filter a list of resource IDs to only those the user can access
   */
  async filterAccessibleResources(
    userId: string,
    resourceType: ResourceType,
    resourceIds: string[],
    permission?: Permission
  ): Promise<string[]> {
    const accessibleResources = await this.getAccessibleResources(userId, resourceType, permission);
    const accessibleIds = new Set(accessibleResources.map(r => r.resourceId));
    
    return resourceIds.filter(id => accessibleIds.has(id));
  }

  /**
   * Check role hierarchy - if user role is higher or equal to required role
   */
  canAssumeRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return isRoleHigherOrEqual(userRole, requiredRole);
  }

  /**
   * Get permission diff between two roles
   */
  getPermissionDifference(fromRole: UserRole, toRole: UserRole) {
    const fromPermissions = new Set(getAllPermissionsForRole(fromRole));
    const toPermissions = new Set(getAllPermissionsForRole(toRole));

    const gained = [...toPermissions].filter(p => !fromPermissions.has(p));
    const lost = [...fromPermissions].filter(p => !toPermissions.has(p));

    return { gained, lost };
  }

  private async checkResourceOwnership(
    user: any,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<boolean> {
    switch (resourceType) {
      case ResourceType.PROFILE:
        const profile = await this.prisma.profile.findUnique({
          where: { id: resourceId },
          select: { user_id: true },
        });
        return profile?.user_id === user.id;

      case ResourceType.USER:
        return user.id === resourceId;

      case ResourceType.CLASS:
        const classRecord = await this.prisma.class.findUnique({
          where: { id: resourceId },
          select: { 
            teacher_id: true,
            enrollments: {
              where: { user_id: user.id },
              select: { id: true }
            }
          },
        });
        return classRecord?.teacher_id === user.id || 
               (classRecord?.enrollments.length || 0) > 0;

      default:
        return false;
    }
  }

  private async getAccessibleProfiles(
    user: any,
    userPermissions: Permission[],
    permission?: Permission
  ): Promise<ResourceAccessInfo[]> {
    const resources: ResourceAccessInfo[] = [];

    // Own profile
    if (user.profile) {
      resources.push({
        resourceId: user.profile.id,
        resourceType: ResourceType.PROFILE,
        hasAccess: true,
        accessType: 'owner',
        permissions: [Permission.PROFILE_READ_OWN, Permission.PROFILE_UPDATE_OWN],
      });
    }

    // If user has permission to read any profile
    if (userPermissions.includes(Permission.PROFILE_READ_ANY)) {
      const allProfiles = await this.prisma.profile.findMany({
        select: { id: true },
      });

      allProfiles.forEach(profile => {
        if (profile.id !== user.profile?.id) {
          resources.push({
            resourceId: profile.id,
            resourceType: ResourceType.PROFILE,
            hasAccess: true,
            accessType: 'permission',
            permissions: [Permission.PROFILE_READ_ANY],
          });
        }
      });
    }

    // If user is a teacher, they can access profiles of their students
    if (user.role === UserRole.TEACHER) {
      const studentProfiles = await this.prisma.profile.findMany({
        where: {
          user: {
            enrollments: {
              some: {
                class: {
                  teacher_id: user.id,
                },
              },
            },
          },
        },
        select: { id: true },
      });

      studentProfiles.forEach(profile => {
        if (!resources.some(r => r.resourceId === profile.id)) {
          resources.push({
            resourceId: profile.id,
            resourceType: ResourceType.PROFILE,
            hasAccess: true,
            accessType: 'role',
            permissions: [Permission.CLASS_READ_OWN],
          });
        }
      });
    }

    return permission ? resources.filter(r => r.permissions.includes(permission)) : resources;
  }

  private async getAccessibleClasses(
    user: any,
    userPermissions: Permission[],
    permission?: Permission
  ): Promise<ResourceAccessInfo[]> {
    const resources: ResourceAccessInfo[] = [];

    // Classes user created (teacher)
    if (user.created_classes) {
      user.created_classes.forEach((classItem: any) => {
        resources.push({
          resourceId: classItem.id,
          resourceType: ResourceType.CLASS,
          hasAccess: true,
          accessType: 'owner',
          permissions: [Permission.CLASS_READ_OWN, Permission.CLASS_UPDATE_OWN],
        });
      });
    }

    // Classes user is enrolled in
    if (user.enrollments) {
      user.enrollments.forEach((enrollment: any) => {
        resources.push({
          resourceId: enrollment.class.id,
          resourceType: ResourceType.CLASS,
          hasAccess: true,
          accessType: 'owner',
          permissions: [Permission.CLASS_READ_ENROLLED],
        });
      });
    }

    // If user can read any class
    if (userPermissions.includes(Permission.CLASS_READ_ANY)) {
      const allClasses = await this.prisma.class.findMany({
        select: { id: true },
      });

      allClasses.forEach(classItem => {
        if (!resources.some(r => r.resourceId === classItem.id)) {
          resources.push({
            resourceId: classItem.id,
            resourceType: ResourceType.CLASS,
            hasAccess: true,
            accessType: 'permission',
            permissions: [Permission.CLASS_READ_ANY],
          });
        }
      });
    }

    return permission ? resources.filter(r => r.permissions.includes(permission)) : resources;
  }

  private async getAccessibleUsers(
    user: any,
    userPermissions: Permission[],
    permission?: Permission
  ): Promise<ResourceAccessInfo[]> {
    const resources: ResourceAccessInfo[] = [];

    // Own user record
    resources.push({
      resourceId: user.id,
      resourceType: ResourceType.USER,
      hasAccess: true,
      accessType: 'owner',
      permissions: [Permission.USER_READ_OWN, Permission.USER_UPDATE_OWN],
    });

    // If user can read any user
    if (userPermissions.includes(Permission.USER_READ_ANY)) {
      const allUsers = await this.prisma.user.findMany({
        select: { id: true },
      });

      allUsers.forEach(userRecord => {
        if (userRecord.id !== user.id) {
          resources.push({
            resourceId: userRecord.id,
            resourceType: ResourceType.USER,
            hasAccess: true,
            accessType: 'permission',
            permissions: [Permission.USER_READ_ANY],
          });
        }
      });
    }

    return permission ? resources.filter(r => r.permissions.includes(permission)) : resources;
  }

  private async getAccessibleOrganizations(
    user: any,
    userPermissions: Permission[],
    permission?: Permission
  ): Promise<ResourceAccessInfo[]> {
    const resources: ResourceAccessInfo[] = [];

    // Organizations user is affiliated with through classes
    const affiliatedOrgs = await this.prisma.organization.findMany({
      where: {
        classes: {
          some: {
            OR: [
              { teacher_id: user.id },
              {
                enrollments: {
                  some: { user_id: user.id }
                }
              }
            ]
          }
        }
      },
      select: { id: true },
    });

    affiliatedOrgs.forEach(org => {
      resources.push({
        resourceId: org.id,
        resourceType: ResourceType.ORGANIZATION,
        hasAccess: true,
        accessType: 'owner',
        permissions: [Permission.ORGANIZATION_READ_OWN],
      });
    });

    // If user can read any organization
    if (userPermissions.includes(Permission.ORGANIZATION_READ_ANY)) {
      const allOrgs = await this.prisma.organization.findMany({
        select: { id: true },
      });

      allOrgs.forEach(org => {
        if (!resources.some(r => r.resourceId === org.id)) {
          resources.push({
            resourceId: org.id,
            resourceType: ResourceType.ORGANIZATION,
            hasAccess: true,
            accessType: 'permission',
            permissions: [Permission.ORGANIZATION_READ_ANY],
          });
        }
      });
    }

    return permission ? resources.filter(r => r.permissions.includes(permission)) : resources;
  }
}
