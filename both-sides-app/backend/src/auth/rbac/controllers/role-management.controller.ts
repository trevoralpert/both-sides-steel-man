/**
 * Role Management Controller
 * Task 2.2.7.5: Create role management endpoints
 */

import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { Roles } from '../decorators/roles.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import { RoleManagementService, RoleChangeRequest, PermissionCheckRequest } from '../services/role-management.service';
import { Permission } from '../permissions';

export class ChangeUserRoleDto {
  newRole: UserRole;
  reason?: string;
  temporary?: boolean;
  expiresAt?: string;
}

export class CheckPermissionsDto {
  permissions: Permission[];
  resourceId?: string;
  resourceType?: string;
}

export class BulkRoleChangeDto {
  changes: {
    userId: string;
    newRole: UserRole;
    reason?: string;
  }[];
}

@Controller('auth/roles')
@UseGuards(JwtAuthGuard, RbacGuard)
export class RoleManagementController {
  private readonly logger = new Logger(RoleManagementController.name);

  constructor(private readonly roleManagementService: RoleManagementService) {}

  /**
   * Change a user's role (Admin only)
   * PUT /auth/roles/:userId/change
   */
  @Put(':userId/change')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.SYSTEM_ADMIN)
  async changeUserRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(new ValidationPipe({ transform: true })) changeRoleDto: ChangeUserRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.log(`Changing role for user ${userId} to ${changeRoleDto.newRole} by ${currentUser.id}`);

    try {
      const request: RoleChangeRequest = {
        userId,
        newRole: changeRoleDto.newRole,
        reason: changeRoleDto.reason,
        temporary: changeRoleDto.temporary,
        expiresAt: changeRoleDto.expiresAt ? new Date(changeRoleDto.expiresAt) : undefined,
      };

      const result = await this.roleManagementService.changeUserRole(request, currentUser.id);

      return {
        success: true,
        data: result,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Failed to change user role: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if a user has specific permissions
   * POST /auth/roles/:userId/permissions/check
   */
  @Post(':userId/permissions/check')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.SYSTEM_ADMIN)
  async checkUserPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(new ValidationPipe({ transform: true })) checkDto: CheckPermissionsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.log(`Checking permissions for user ${userId} by ${currentUser.id}`);

    try {
      const request: PermissionCheckRequest = {
        userId,
        permissions: checkDto.permissions,
        resourceId: checkDto.resourceId,
        resourceType: checkDto.resourceType,
      };

      const result = await this.roleManagementService.checkUserPermissions(request);

      return {
        success: true,
        data: result,
        message: result.hasPermission 
          ? 'User has all required permissions'
          : `User is missing ${result.missingPermissions.length} permissions`,
      };
    } catch (error) {
      this.logger.error(`Failed to check user permissions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all permissions for a user
   * GET /auth/roles/:userId/permissions
   */
  @Get(':userId/permissions')
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.SYSTEM_ADMIN)
  async getUserPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.log(`Getting permissions for user ${userId} by ${currentUser.id}`);

    try {
      const result = await this.roleManagementService.getUserPermissions(userId);

      return {
        success: true,
        data: result,
        message: `Retrieved ${result.totalPermissions} permissions for user`,
      };
    } catch (error) {
      this.logger.error(`Failed to get user permissions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get current user's permissions
   * GET /auth/roles/me/permissions
   */
  @Get('me/permissions')
  async getCurrentUserPermissions(@CurrentUser() currentUser: AuthenticatedUser) {
    this.logger.log(`Getting permissions for current user ${currentUser.id}`);

    try {
      const result = await this.roleManagementService.getUserPermissions(currentUser.id);

      return {
        success: true,
        data: result,
        message: `Retrieved ${result.totalPermissions} permissions`,
      };
    } catch (error) {
      this.logger.error(`Failed to get current user permissions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get available roles and their permissions
   * GET /auth/roles/available
   */
  @Get('available')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getAvailableRoles(@CurrentUser() currentUser: AuthenticatedUser) {
    this.logger.log(`Getting available roles for ${currentUser.id}`);

    try {
      const result = await this.roleManagementService.getAvailableRoles();

      return {
        success: true,
        data: result,
        message: `Retrieved ${result.length} available roles`,
      };
    } catch (error) {
      this.logger.error(`Failed to get available roles: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get role change history for a user
   * GET /auth/roles/:userId/history
   */
  @Get(':userId/history')
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.AUDIT_READ_ANY)
  async getRoleChangeHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.log(`Getting role change history for user ${userId} by ${currentUser.id}`);

    try {
      const result = await this.roleManagementService.getRoleChangeHistory(
        userId,
        limit ? parseInt(limit) : 50
      );

      return {
        success: true,
        data: result,
        message: `Retrieved ${result.history.length} role change records`,
      };
    } catch (error) {
      this.logger.error(`Failed to get role change history: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get current user's role change history
   * GET /auth/roles/me/history
   */
  @Get('me/history')
  @Permissions(Permission.AUDIT_READ_OWN)
  async getCurrentUserRoleHistory(
    @Query('limit') limit?: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.log(`Getting role change history for current user ${currentUser.id}`);

    try {
      const result = await this.roleManagementService.getRoleChangeHistory(
        currentUser.id,
        limit ? parseInt(limit) : 50
      );

      return {
        success: true,
        data: result,
        message: `Retrieved ${result.history.length} role change records`,
      };
    } catch (error) {
      this.logger.error(`Failed to get current user role history: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk role changes (Admin only)
   * POST /auth/roles/bulk/change
   */
  @Post('bulk/change')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.SYSTEM_ADMIN)
  async bulkChangeRoles(
    @Body(new ValidationPipe({ transform: true })) bulkDto: BulkRoleChangeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.log(`Bulk changing ${bulkDto.changes.length} user roles by ${currentUser.id}`);

    try {
      const requests: RoleChangeRequest[] = bulkDto.changes.map(change => ({
        userId: change.userId,
        newRole: change.newRole,
        reason: change.reason,
      }));

      const results = await this.roleManagementService.bulkChangeRoles(requests, currentUser.id);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
          },
        },
        message: `Bulk role change completed: ${successCount} successful, ${failureCount} failed`,
      };
    } catch (error) {
      this.logger.error(`Failed to perform bulk role changes: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check current user's permissions
   * POST /auth/roles/me/permissions/check
   */
  @Post('me/permissions/check')
  @HttpCode(HttpStatus.OK)
  async checkCurrentUserPermissions(
    @Body(new ValidationPipe({ transform: true })) checkDto: CheckPermissionsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.log(`Current user ${currentUser.id} checking their own permissions`);

    try {
      const request: PermissionCheckRequest = {
        userId: currentUser.id,
        permissions: checkDto.permissions,
        resourceId: checkDto.resourceId,
        resourceType: checkDto.resourceType,
      };

      const result = await this.roleManagementService.checkUserPermissions(request);

      return {
        success: true,
        data: result,
        message: result.hasPermission 
          ? 'You have all required permissions'
          : `You are missing ${result.missingPermissions.length} permissions`,
      };
    } catch (error) {
      this.logger.error(`Failed to check current user permissions: ${error.message}`, error.stack);
      throw error;
    }
  }
}
