/**
 * Role Management Service
 * Task 2.2.7.5: Create role management endpoints
 */

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { UserRole } from '@prisma/client';
import { 
  Permission, 
  getAllPermissionsForRole, 
  isRoleHigherOrEqual, 
  ROLE_DESCRIPTIONS,
  PERMISSION_DESCRIPTIONS 
} from '../permissions';
import { PermissionValidationService } from './permission-validation.service';

export interface RoleChangeRequest {
  userId: string;
  newRole: UserRole;
  reason?: string;
  temporary?: boolean;
  expiresAt?: Date;
}

export interface RoleChangeResult {
  success: boolean;
  oldRole: UserRole;
  newRole: UserRole;
  permissions: {
    gained: Permission[];
    lost: Permission[];
  };
  changeId?: string;
  message: string;
}

export interface PermissionCheckRequest {
  userId: string;
  permissions: Permission[];
  resourceId?: string;
  resourceType?: string;
}

export interface PermissionCheckResult {
  userId: string;
  hasPermission: boolean;
  checkedPermissions: Permission[];
  userPermissions: Permission[];
  missingPermissions: Permission[];
  userRole: UserRole;
}

@Injectable()
export class RoleManagementService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private permissionValidation: PermissionValidationService,
  ) {}

  /**
   * Change a user's role
   */
  async changeUserRole(
    request: RoleChangeRequest,
    performedBy: string
  ): Promise<RoleChangeResult> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: request.userId },
        select: { 
          id: true, 
          role: true, 
          first_name: true, 
          last_name: true, 
          email: true,
          is_active: true 
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${request.userId} not found`);
      }

      if (!user.is_active) {
        throw new BadRequestException('Cannot change role of inactive user');
      }

      const oldRole = user.role;
      const newRole = request.newRole;

      if (oldRole === newRole) {
        throw new BadRequestException(`User is already assigned role: ${newRole}`);
      }

      // Validate role change permissions
      const performer = await this.prisma.user.findUnique({
        where: { id: performedBy },
        select: { role: true },
      });

      if (!performer) {
        throw new ForbiddenException('Performer not found');
      }

      if (!this.canChangeRole(performer.role, oldRole, newRole)) {
        throw new ForbiddenException(
          `Insufficient permissions to change role from ${oldRole} to ${newRole}`
        );
      }

      // Update the user's role
      const updatedUser = await this.prisma.user.update({
        where: { id: request.userId },
        data: { 
          role: newRole,
          updated_at: new Date()
        },
      });

      // Calculate permission changes
      const permissionChanges = this.permissionValidation.getPermissionDifference(oldRole, newRole);

      // Log the role change
      await this.auditService.logUserAction(
        performedBy,
        'role_change',
        'user',
        request.userId,
        {
          oldRole,
          newRole,
          reason: request.reason,
          temporary: request.temporary,
          expiresAt: request.expiresAt,
          permissionsGained: permissionChanges.gained.length,
          permissionsLost: permissionChanges.lost.length,
        },
        {
          actorId: performedBy,
          actorType: 'user',
          targetUserId: request.userId,
          targetUserEmail: user.email,
        }
      );

      return {
        success: true,
        oldRole,
        newRole,
        permissions: permissionChanges,
        message: `Successfully changed role from ${oldRole} to ${newRole}`,
      };

    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to change user role');
    }
  }

  /**
   * Check if a user has specific permissions
   */
  async checkUserPermissions(request: PermissionCheckRequest): Promise<PermissionCheckResult> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: request.userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${request.userId} not found`);
      }

      const userPermissions = getAllPermissionsForRole(user.role);
      const checkedPermissions = request.permissions;
      
      const hasAllPermissions = checkedPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      const missingPermissions = checkedPermissions.filter(permission =>
        !userPermissions.includes(permission)
      );

      return {
        userId: request.userId,
        hasPermission: hasAllPermissions,
        checkedPermissions,
        userPermissions,
        missingPermissions,
        userRole: user.role,
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to check user permissions');
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, first_name: true, last_name: true },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const permissions = getAllPermissionsForRole(user.role);

      return {
        userId,
        userName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.role,
        roleDescription: ROLE_DESCRIPTIONS[user.role],
        permissions: permissions.map(permission => ({
          permission,
          description: PERMISSION_DESCRIPTIONS[permission],
        })),
        totalPermissions: permissions.length,
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get user permissions');
    }
  }

  /**
   * Get available roles and their permissions
   */
  async getAvailableRoles() {
    const roles = Object.values(UserRole);
    
    return roles.map(role => ({
      role,
      description: ROLE_DESCRIPTIONS[role],
      permissions: getAllPermissionsForRole(role).map(permission => ({
        permission,
        description: PERMISSION_DESCRIPTIONS[permission],
      })),
      totalPermissions: getAllPermissionsForRole(role).length,
    }));
  }

  /**
   * Get role change history for a user
   */
  async getRoleChangeHistory(userId: string, limit: number = 50) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Get audit logs for role changes
      const auditLogs = await this.auditService.queryLogs({
        entityType: 'user',
        entityId: userId,
        action: 'role_change',
        limit,
        orderBy: 'created_at',
        orderDirection: 'desc',
      });

      return {
        userId,
        history: auditLogs.logs.map(log => ({
          changeId: log.id,
          performedBy: log.actor_id,
          performedAt: log.created_at,
          oldRole: log.old_values?.role,
          newRole: log.new_values?.role,
          reason: log.metadata?.reason,
          temporary: log.metadata?.temporary,
          expiresAt: log.metadata?.expiresAt,
        })),
        total: auditLogs.total,
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get role change history');
    }
  }

  /**
   * Bulk role changes
   */
  async bulkChangeRoles(
    requests: RoleChangeRequest[],
    performedBy: string
  ): Promise<RoleChangeResult[]> {
    if (requests.length === 0) {
      throw new BadRequestException('At least one role change request is required');
    }

    if (requests.length > 100) {
      throw new BadRequestException('Maximum 100 role changes allowed per bulk operation');
    }

    const results: RoleChangeResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.changeUserRole(request, performedBy);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          oldRole: UserRole.STUDENT, // Default fallback
          newRole: request.newRole,
          permissions: { gained: [], lost: [] },
          message: `Failed to change role for user ${request.userId}: ${error.message}`,
        });
      }
    }

    // Log bulk operation
    await this.auditService.logUserAction(
      performedBy,
      'bulk_role_change',
      'system',
      'bulk_operation',
      {
        totalRequests: requests.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
      {
        actorId: performedBy,
        actorType: 'user',
      }
    );

    return results;
  }

  /**
   * Check if a user can change roles
   */
  private canChangeRole(performerRole: UserRole, fromRole: UserRole, toRole: UserRole): boolean {
    // Only admins can change roles currently
    if (performerRole !== UserRole.ADMIN) {
      return false;
    }

    // Admins can change any role
    return true;
  }

  /**
   * Validate role change request
   */
  private validateRoleChangeRequest(request: RoleChangeRequest): void {
    if (!Object.values(UserRole).includes(request.newRole)) {
      throw new BadRequestException(`Invalid role: ${request.newRole}`);
    }

    if (request.temporary && !request.expiresAt) {
      throw new BadRequestException('Temporary role changes must have expiration date');
    }

    if (request.expiresAt && request.expiresAt <= new Date()) {
      throw new BadRequestException('Expiration date must be in the future');
    }
  }
}
