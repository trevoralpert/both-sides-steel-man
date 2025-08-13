/**
 * RBAC Guard for role and permission-based route protection
 * Task 2.2.7.2: Create RBAC middleware and decorators
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission, roleHasPermission, isRoleHigherOrEqual, getAllPermissionsForRole } from '../permissions';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles and permissions from decorators
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles or permissions are required, allow access
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get user's full information from database
    const dbUser = await this.getUserFromDatabase(user.sub);
    if (!dbUser) {
      throw new UnauthorizedException('User not found in database');
    }

    // Attach full user info to request for use in controllers
    request.dbUser = dbUser;

    // Check role-based access
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => 
        isRoleHigherOrEqual(dbUser.role, role)
      );

      if (!hasRequiredRole) {
        throw new ForbiddenException(
          `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${dbUser.role}`
        );
      }
    }

    // Check permission-based access
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = getAllPermissionsForRole(dbUser.role);
      const hasRequiredPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasRequiredPermissions) {
        const missingPermissions = requiredPermissions.filter(permission =>
          !userPermissions.includes(permission)
        );

        throw new ForbiddenException(
          `Access denied. Missing permissions: ${missingPermissions.join(', ')}`
        );
      }
    }

    return true;
  }

  private async getUserFromDatabase(clerkId: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { clerk_id: clerkId },
        include: {
          profile: true,
          enrollments: {
            include: {
              class: {
                include: {
                  organization: true,
                },
              },
            },
          },
          created_classes: {
            include: {
              organization: true,
            },
          },
        },
      });
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch user information');
    }
  }
}
