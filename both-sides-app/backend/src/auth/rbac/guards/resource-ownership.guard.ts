/**
 * Resource Ownership Guard for checking user access to specific resources
 * Task 2.2.7.3: Implement resource ownership checks
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { ResourceType, Permission, getAllPermissionsForRole } from '../permissions';
import { UserRole } from '@prisma/client';

// Decorator to specify resource ownership requirements
export const RESOURCE_OWNERSHIP_KEY = 'resource_ownership';

export interface ResourceOwnershipConfig {
  resourceType: ResourceType;
  resourceIdParam: string; // Parameter name containing the resource ID
  allowedPermissions?: Permission[]; // Additional permissions that grant access
}

export const RequireResourceOwnership = (config: ResourceOwnershipConfig) =>
  Reflector.createDecorator<ResourceOwnershipConfig>(RESOURCE_OWNERSHIP_KEY);

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ownershipConfig = this.reflector.getAllAndOverride<ResourceOwnershipConfig>(
      RESOURCE_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!ownershipConfig) {
      return true; // No ownership requirements
    }

    const request = context.switchToHttp().getRequest();
    const user = request.dbUser || request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const resourceId = request.params[ownershipConfig.resourceIdParam];
    if (!resourceId) {
      throw new BadRequestException(`Resource ID parameter '${ownershipConfig.resourceIdParam}' is required`);
    }

    // Check if user has admin permissions that bypass ownership
    const userPermissions = getAllPermissionsForRole(user.role as UserRole);
    
    // If user has any of the allowed permissions, grant access
    if (ownershipConfig.allowedPermissions) {
      const hasAllowedPermission = ownershipConfig.allowedPermissions.some(permission =>
        userPermissions.includes(permission)
      );
      if (hasAllowedPermission) {
        return true;
      }
    }

    // Check resource ownership based on resource type
    const hasAccess = await this.checkResourceOwnership(
      user,
      ownershipConfig.resourceType,
      resourceId
    );

    if (!hasAccess) {
      throw new ForbiddenException(`Access denied to ${ownershipConfig.resourceType}: ${resourceId}`);
    }

    return true;
  }

  private async checkResourceOwnership(
    user: any,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<boolean> {
    switch (resourceType) {
      case ResourceType.PROFILE:
        return this.checkProfileOwnership(user, resourceId);
      
      case ResourceType.USER:
        return this.checkUserOwnership(user, resourceId);
      
      case ResourceType.CLASS:
        return this.checkClassOwnership(user, resourceId);
      
      case ResourceType.ORGANIZATION:
        return this.checkOrganizationOwnership(user, resourceId);
      
      case ResourceType.ENROLLMENT:
        return this.checkEnrollmentOwnership(user, resourceId);
      
      default:
        return false;
    }
  }

  private async checkProfileOwnership(user: any, profileId: string): Promise<boolean> {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { id: profileId },
        select: { user_id: true },
      });

      return profile?.user_id === user.id;
    } catch {
      return false;
    }
  }

  private async checkUserOwnership(user: any, userId: string): Promise<boolean> {
    // User can access their own user record
    return user.id === userId;
  }

  private async checkClassOwnership(user: any, classId: string): Promise<boolean> {
    try {
      const classRecord = await this.prisma.class.findUnique({
        where: { id: classId },
        select: { 
          teacher_id: true,
          enrollments: {
            where: { user_id: user.id },
            select: { id: true }
          }
        },
      });

      if (!classRecord) return false;

      // Teacher owns the class
      if (classRecord.teacher_id === user.id) return true;

      // Student is enrolled in the class
      if (classRecord.enrollments.length > 0) return true;

      return false;
    } catch {
      return false;
    }
  }

  private async checkOrganizationOwnership(user: any, organizationId: string): Promise<boolean> {
    try {
      // Check if user is affiliated with the organization through classes
      const userClasses = await this.prisma.class.findMany({
        where: {
          organization_id: organizationId,
          OR: [
            { teacher_id: user.id },
            { 
              enrollments: {
                some: { user_id: user.id }
              }
            }
          ]
        },
        select: { id: true }
      });

      return userClasses.length > 0;
    } catch {
      return false;
    }
  }

  private async checkEnrollmentOwnership(user: any, enrollmentId: string): Promise<boolean> {
    try {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: { 
          user_id: true,
          class: {
            select: { teacher_id: true }
          }
        },
      });

      if (!enrollment) return false;

      // Student owns the enrollment
      if (enrollment.user_id === user.id) return true;

      // Teacher owns the class
      if (enrollment.class.teacher_id === user.id) return true;

      return false;
    } catch {
      return false;
    }
  }
}
