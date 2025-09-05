/**
 * User Synchronizer Service
 * 
 * Handles synchronization of user data between external systems and internal database.
 * Manages user profiles, roles, and authentication state.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExternalIdMappingService } from '../external-id-mapping.service';
import { IntegrationRegistry } from '../integration-registry.service';
import { BaseSynchronizerService, SyncContext, ValidationResult, SyncConflict } from './base-synchronizer.service';
import { UserRole } from '@prisma/client';

// ===================================================================
// USER-SPECIFIC INTERFACES
// ===================================================================

export interface ExternalUserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive?: boolean;
  lastLogin?: string | Date;
  organizationId?: string;
  classIds?: string[];
  metadata?: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface InternalUserData {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  is_active?: boolean;
  last_login?: Date;
  external_id?: string;
  external_system_id?: string;
  sync_status?: string;
  last_sync_at?: Date;
  sync_version?: number;
  created_at?: Date;
  updated_at?: Date;
}

// ===================================================================
// USER SYNCHRONIZER SERVICE
// ===================================================================

@Injectable()
export class UserSynchronizerService extends BaseSynchronizerService {
  private readonly logger = new Logger(UserSynchronizerService.name);

  constructor(
    prisma: PrismaService,
    mappingService: ExternalIdMappingService,
    integrationRegistry: IntegrationRegistry,
  ) {
    super(prisma, mappingService, integrationRegistry);
  }

  // ===================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================================================================

  getEntityType(): string {
    return 'user';
  }

  getConflictableFields(): string[] {
    return [
      'email',
      'first_name',
      'last_name', 
      'role',
      'is_active',
      'last_login',
    ];
  }

  extractExternalId(data: ExternalUserData): string {
    return data.id;
  }

  extractInternalId(data: InternalUserData): string {
    return data.id!;
  }

  // ===================================================================
  // VALIDATION
  // ===================================================================

  validateExternalData(data: ExternalUserData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields
    if (!data.id?.trim()) {
      errors.push('User ID is required');
    }

    if (!data.email?.trim()) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (!data.role?.trim()) {
      errors.push('User role is required');
    } else if (!this.isValidRole(data.role)) {
      errors.push(`Invalid role: ${data.role}. Must be STUDENT, TEACHER, or ADMIN`);
    }

    // Optional field validation
    if (data.firstName && data.firstName.length > 100) {
      errors.push('First name too long (max 100 characters)');
    }

    if (data.lastName && data.lastName.length > 100) {
      errors.push('Last name too long (max 100 characters)');
    }

    if (data.lastLogin && !this.isValidDate(data.lastLogin)) {
      warnings.push('Invalid last login date format');
    }

    // Suggestions
    if (!data.firstName && !data.lastName) {
      suggestions.push('Consider providing user first and last name for better user experience');
    }

    if (data.isActive === undefined) {
      suggestions.push('Consider explicitly setting user active status');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  // ===================================================================
  // DATA TRANSFORMATION
  // ===================================================================

  async transformExternalToInternal(
    externalData: ExternalUserData,
    context: SyncContext,
  ): Promise<InternalUserData> {
    const role = this.mapExternalRole(externalData.role);
    
    return {
      email: externalData.email.toLowerCase().trim(),
      first_name: externalData.firstName?.trim() || null,
      last_name: externalData.lastName?.trim() || null,
      role,
      is_active: externalData.isActive ?? true,
      last_login: this.parseDate(externalData.lastLogin),
      external_id: externalData.id,
      external_system_id: context.externalSystemId,
      sync_status: 'SYNCED',
      last_sync_at: context.startTime,
      sync_version: 1,
    };
  }

  async transformInternalToExternal(
    internalData: InternalUserData,
    context: SyncContext,
  ): Promise<ExternalUserData> {
    return {
      id: internalData.external_id || internalData.id!,
      email: internalData.email,
      firstName: internalData.first_name || undefined,
      lastName: internalData.last_name || undefined,
      role: this.mapInternalRole(internalData.role),
      isActive: internalData.is_active,
      lastLogin: internalData.last_login,
      createdAt: internalData.created_at,
      updatedAt: internalData.updated_at,
    };
  }

  // ===================================================================
  // CRUD OPERATIONS
  // ===================================================================

  async createEntity(data: InternalUserData, context: SyncContext): Promise<InternalUserData> {
    this.logger.log(`Creating user: ${data.email}`, { syncId: context.syncId });

    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        is_active: data.is_active,
        last_login: data.last_login,
        external_id: data.external_id,
        external_system_id: data.external_system_id,
        sync_status: data.sync_status as any,
        last_sync_at: data.last_sync_at,
        sync_version: data.sync_version,
      },
    });

    this.logger.log(`Successfully created user: ${created.id}`, {
      syncId: context.syncId,
      userId: created.id,
      email: created.email,
    });

    return created;
  }

  async updateEntity(
    id: string,
    data: InternalUserData,
    context: SyncContext,
  ): Promise<InternalUserData> {
    this.logger.log(`Updating user: ${id}`, { syncId: context.syncId });

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        is_active: data.is_active,
        last_login: data.last_login,
        external_id: data.external_id,
        external_system_id: data.external_system_id,
        sync_status: data.sync_status as any,
        last_sync_at: data.last_sync_at,
        sync_version: (data.sync_version || 0) + 1,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Successfully updated user: ${updated.id}`, {
      syncId: context.syncId,
      userId: updated.id,
    });

    return updated;
  }

  async findEntityByExternalId(
    externalId: string,
    context: SyncContext,
  ): Promise<InternalUserData | null> {
    return await this.prisma.user.findFirst({
      where: {
        external_id: externalId,
        external_system_id: context.externalSystemId,
      },
    });
  }

  async findEntityByInternalId(
    internalId: string,
    context: SyncContext,
  ): Promise<InternalUserData | null> {
    return await this.prisma.user.findUnique({
      where: { id: internalId },
    });
  }

  // ===================================================================
  // USER-SPECIFIC METHODS
  // ===================================================================

  /**
   * Synchronize user with their enrollments
   */
  async synchronizeUserWithEnrollments(
    externalData: ExternalUserData,
    context: SyncContext,
  ): Promise<{
    userResult: any;
    enrollmentResults: any[];
  }> {
    // First sync the user
    const userResult = await this.synchronizeEntity(externalData, context);
    
    if (userResult.action === 'error') {
      return {
        userResult,
        enrollmentResults: [],
      };
    }

    // Then sync enrollments if provided
    const enrollmentResults = [];
    if (externalData.classIds && externalData.classIds.length > 0) {
      for (const classId of externalData.classIds) {
        try {
          // This would typically call the EnrollmentSynchronizer
          // For now, we'll create a placeholder result
          enrollmentResults.push({
            entityId: `${userResult.internalId}-${classId}`,
            entityType: 'enrollment',
            action: 'deferred',
            metadata: { userId: userResult.internalId, classId },
          });
        } catch (error) {
          enrollmentResults.push({
            entityId: `${userResult.internalId}-${classId}`,
            entityType: 'enrollment',
            action: 'error',
            error: error.message,
          });
        }
      }
    }

    return {
      userResult,
      enrollmentResults,
    };
  }

  /**
   * Bulk synchronize users with role filtering
   */
  async synchronizeUsersByRole(
    externalUsers: ExternalUserData[],
    role: UserRole,
    context: SyncContext,
  ): Promise<any[]> {
    const filteredUsers = externalUsers.filter(user => 
      this.mapExternalRole(user.role) === role
    );

    this.logger.log(`Synchronizing ${filteredUsers.length} ${role} users`, {
      syncId: context.syncId,
    });

    return await this.synchronizeBatch(filteredUsers, context);
  }

  /**
   * Handle user deactivation/reactivation
   */
  async synchronizeUserStatus(
    externalData: ExternalUserData,
    context: SyncContext,
  ): Promise<any> {
    const existingInternalId = await this.mappingService.mapExternalToInternal(
      context.integrationId,
      'user',
      externalData.id,
    );

    if (!existingInternalId) {
      // User doesn't exist, create if active
      if (externalData.isActive !== false) {
        return await this.synchronizeEntity(externalData, context);
      }
      return null;
    }

    // Update user active status
    const updated = await this.prisma.user.update({
      where: { id: existingInternalId },
      data: {
        is_active: externalData.isActive ?? true,
        last_sync_at: context.startTime,
        sync_version: { increment: 1 },
      },
    });

    return {
      entityId: externalData.id,
      entityType: 'user',
      action: 'updated',
      externalId: externalData.id,
      internalId: existingInternalId,
      metadata: { statusChanged: true, isActive: updated.is_active },
      processingTime: 0,
      timestamp: new Date(),
    };
  }

  // ===================================================================
  // CONFLICT RESOLUTION
  // ===================================================================

  protected async resolveExternalWins(conflict: SyncConflict): Promise<ExternalUserData> {
    // External data takes precedence
    const externalUser = await this.findEntityByExternalId(
      conflict.externalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
    
    return externalUser ? await this.transformInternalToExternal(
      externalUser,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    ) : null;
  }

  protected async resolveInternalWins(conflict: SyncConflict): Promise<InternalUserData> {
    // Internal data takes precedence
    return await this.findEntityByInternalId(
      conflict.internalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
  }

  protected async resolveMerge(conflict: SyncConflict): Promise<InternalUserData> {
    const external = await this.findEntityByExternalId(
      conflict.externalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
    const internal = await this.findEntityByInternalId(
      conflict.internalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );

    if (!external || !internal) return null;

    // Merge strategy: External wins for contact info, internal wins for system fields
    return {
      ...internal,
      email: external.email, // External email takes precedence
      first_name: external.first_name || internal.first_name,
      last_name: external.last_name || internal.last_name,
      role: internal.role, // Internal role takes precedence (security)
      is_active: external.is_active ?? internal.is_active,
      last_login: external.last_login && external.last_login > (internal.last_login || new Date(0)) 
        ? external.last_login 
        : internal.last_login,
    };
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidRole(role: string): boolean {
    const validRoles = ['STUDENT', 'TEACHER', 'ADMIN', 'student', 'teacher', 'admin'];
    return validRoles.includes(role);
  }

  private isValidDate(date: string | Date | undefined): boolean {
    if (!date) return false;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }

  private parseDate(date: string | Date | undefined): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;
    
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private mapExternalRole(externalRole: string): UserRole {
    const role = externalRole.toUpperCase();
    
    switch (role) {
      case 'STUDENT':
      case 'LEARNER':
        return UserRole.STUDENT;
      case 'TEACHER':
      case 'INSTRUCTOR':
      case 'EDUCATOR':
        return UserRole.TEACHER;
      case 'ADMIN':
      case 'ADMINISTRATOR':
      case 'MANAGER':
        return UserRole.ADMIN;
      default:
        this.logger.warn(`Unknown role mapping: ${externalRole}, defaulting to STUDENT`);
        return UserRole.STUDENT;
    }
  }

  private mapInternalRole(internalRole: UserRole): string {
    switch (internalRole) {
      case UserRole.STUDENT:
        return 'student';
      case UserRole.TEACHER:
        return 'teacher';
      case UserRole.ADMIN:
        return 'admin';
      default:
        return 'student';
    }
  }
}
