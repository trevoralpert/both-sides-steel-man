/**
 * Enrollment Synchronizer Service
 * 
 * Handles synchronization of enrollment data between external systems and internal database.
 * Manages student-class relationships, enrollment status, and academic progress tracking.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExternalIdMappingService } from '../external-id-mapping.service';
import { IntegrationRegistry } from '../integration-registry.service';
import { BaseSynchronizerService, SyncContext, ValidationResult, SyncConflict } from './base-synchronizer.service';
import { EnrollmentStatus } from '@prisma/client';

// ===================================================================
// ENROLLMENT-SPECIFIC INTERFACES
// ===================================================================

export interface ExternalEnrollmentData {
  id: string;
  userId: string;
  classId: string;
  status?: string;
  enrolledAt?: string | Date;
  droppedAt?: string | Date;
  completedAt?: string | Date;
  grade?: string;
  progress?: number;
  role?: string;
  metadata?: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface InternalEnrollmentData {
  id?: string;
  user_id: string;
  class_id: string;
  status: EnrollmentStatus;
  enrolled_at?: Date;
  dropped_at?: Date;
  completed_at?: Date;
  grade?: string;
  progress?: number;
  role?: string;
  external_id?: string;
  external_system_id?: string;
  sync_status?: string;
  last_sync_at?: Date;
  sync_version?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface EnrollmentBatchOperation {
  classId: string;
  studentIds: string[];
  operation: 'enroll' | 'drop' | 'complete' | 'reactivate';
  effectiveDate?: Date;
  metadata?: Record<string, any>;
}

// ===================================================================
// ENROLLMENT SYNCHRONIZER SERVICE
// ===================================================================

@Injectable()
export class EnrollmentSynchronizerService extends BaseSynchronizerService {
  private readonly logger = new Logger(EnrollmentSynchronizerService.name);

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
    return 'enrollment';
  }

  getConflictableFields(): string[] {
    return [
      'status',
      'enrolled_at',
      'dropped_at',
      'completed_at',
      'grade',
      'progress',
      'role',
    ];
  }

  extractExternalId(data: ExternalEnrollmentData): string {
    return data.id;
  }

  extractInternalId(data: InternalEnrollmentData): string {
    return data.id!;
  }

  // ===================================================================
  // VALIDATION
  // ===================================================================

  validateExternalData(data: ExternalEnrollmentData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields
    if (!data.id?.trim()) {
      errors.push('Enrollment ID is required');
    }

    if (!data.userId?.trim()) {
      errors.push('User ID is required');
    }

    if (!data.classId?.trim()) {
      errors.push('Class ID is required');
    }

    // Validate status
    if (data.status && !this.isValidEnrollmentStatus(data.status)) {
      errors.push(`Invalid enrollment status: ${data.status}`);
    }

    // Validate dates
    if (data.enrolledAt && !this.isValidDate(data.enrolledAt)) {
      errors.push('Invalid enrollment date format');
    }

    if (data.droppedAt && !this.isValidDate(data.droppedAt)) {
      errors.push('Invalid drop date format');
    }

    if (data.completedAt && !this.isValidDate(data.completedAt)) {
      errors.push('Invalid completion date format');
    }

    // Date logic validation
    const enrolledAt = this.parseDate(data.enrolledAt);
    const droppedAt = this.parseDate(data.droppedAt);
    const completedAt = this.parseDate(data.completedAt);

    if (enrolledAt && droppedAt && enrolledAt >= droppedAt) {
      errors.push('Drop date must be after enrollment date');
    }

    if (enrolledAt && completedAt && enrolledAt >= completedAt) {
      errors.push('Completion date must be after enrollment date');
    }

    if (droppedAt && completedAt) {
      warnings.push('Enrollment has both drop and completion dates');
    }

    // Validate progress
    if (data.progress !== undefined && (data.progress < 0 || data.progress > 100)) {
      errors.push('Progress must be between 0 and 100');
    }

    // Validate grade
    if (data.grade && data.grade.length > 10) {
      warnings.push('Grade value unusually long');
    }

    // Status consistency checks
    if (data.status === 'COMPLETED' && !completedAt) {
      warnings.push('Completed status but no completion date');
    }

    if (data.status === 'DROPPED' && !droppedAt) {
      warnings.push('Dropped status but no drop date');
    }

    if (data.status === 'ACTIVE' && (droppedAt || completedAt)) {
      warnings.push('Active status but has drop/completion date');
    }

    // Suggestions
    if (!data.enrolledAt) {
      suggestions.push('Consider providing enrollment date');
    }

    if (data.status === 'ACTIVE' && data.progress === undefined) {
      suggestions.push('Consider tracking progress for active enrollments');
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
    externalData: ExternalEnrollmentData,
    context: SyncContext,
  ): Promise<InternalEnrollmentData> {
    // Map user ID
    const userId = await this.mappingService.mapExternalToInternal(
      context.integrationId,
      'user',
      externalData.userId,
    );
    
    if (!userId) {
      throw new Error(`User mapping not found for external ID: ${externalData.userId}`);
    }

    // Map class ID
    const classId = await this.mappingService.mapExternalToInternal(
      context.integrationId,
      'class',
      externalData.classId,
    );
    
    if (!classId) {
      throw new Error(`Class mapping not found for external ID: ${externalData.classId}`);
    }

    const enrollmentStatus = this.mapExternalStatus(externalData.status);

    return {
      user_id: userId,
      class_id: classId,
      status: enrollmentStatus,
      enrolled_at: this.parseDate(externalData.enrolledAt) || new Date(),
      dropped_at: this.parseDate(externalData.droppedAt),
      completed_at: this.parseDate(externalData.completedAt),
      grade: externalData.grade?.trim() || null,
      progress: externalData.progress || 0,
      role: externalData.role?.trim() || 'student',
      external_id: externalData.id,
      external_system_id: context.externalSystemId,
      sync_status: 'SYNCED',
      last_sync_at: context.startTime,
      sync_version: 1,
    };
  }

  async transformInternalToExternal(
    internalData: InternalEnrollmentData,
    context: SyncContext,
  ): Promise<ExternalEnrollmentData> {
    // Map internal IDs back to external IDs
    const userId = await this.mappingService.mapInternalToExternal(
      context.integrationId,
      'user',
      internalData.user_id,
    );

    const classId = await this.mappingService.mapInternalToExternal(
      context.integrationId,
      'class',
      internalData.class_id,
    );

    return {
      id: internalData.external_id || internalData.id!,
      userId: userId || internalData.user_id,
      classId: classId || internalData.class_id,
      status: this.mapInternalStatus(internalData.status),
      enrolledAt: internalData.enrolled_at,
      droppedAt: internalData.dropped_at || undefined,
      completedAt: internalData.completed_at || undefined,
      grade: internalData.grade || undefined,
      progress: internalData.progress || 0,
      role: internalData.role || 'student',
      createdAt: internalData.created_at,
      updatedAt: internalData.updated_at,
    };
  }

  // ===================================================================
  // CRUD OPERATIONS
  // ===================================================================

  async createEntity(data: InternalEnrollmentData, context: SyncContext): Promise<InternalEnrollmentData> {
    this.logger.log(`Creating enrollment: ${data.user_id} -> ${data.class_id}`, { syncId: context.syncId });

    const created = await this.prisma.enrollment.create({
      data: {
        user_id: data.user_id,
        class_id: data.class_id,
        status: data.status,
        enrolled_at: data.enrolled_at,
        dropped_at: data.dropped_at,
        completed_at: data.completed_at,
        grade: data.grade,
        progress: data.progress,
        role: data.role,
        external_id: data.external_id,
        external_system_id: data.external_system_id,
        sync_status: data.sync_status as any,
        last_sync_at: data.last_sync_at,
        sync_version: data.sync_version,
      },
    });

    this.logger.log(`Successfully created enrollment: ${created.id}`, {
      syncId: context.syncId,
      enrollmentId: created.id,
      userId: created.user_id,
      classId: created.class_id,
    });

    return created;
  }

  async updateEntity(
    id: string,
    data: InternalEnrollmentData,
    context: SyncContext,
  ): Promise<InternalEnrollmentData> {
    this.logger.log(`Updating enrollment: ${id}`, { syncId: context.syncId });

    const updated = await this.prisma.enrollment.update({
      where: { id },
      data: {
        status: data.status,
        enrolled_at: data.enrolled_at,
        dropped_at: data.dropped_at,
        completed_at: data.completed_at,
        grade: data.grade,
        progress: data.progress,
        role: data.role,
        external_id: data.external_id,
        external_system_id: data.external_system_id,
        sync_status: data.sync_status as any,
        last_sync_at: data.last_sync_at,
        sync_version: (data.sync_version || 0) + 1,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Successfully updated enrollment: ${updated.id}`, {
      syncId: context.syncId,
      enrollmentId: updated.id,
    });

    return updated;
  }

  async findEntityByExternalId(
    externalId: string,
    context: SyncContext,
  ): Promise<InternalEnrollmentData | null> {
    return await this.prisma.enrollment.findFirst({
      where: {
        external_id: externalId,
        external_system_id: context.externalSystemId,
      },
    });
  }

  async findEntityByInternalId(
    internalId: string,
    context: SyncContext,
  ): Promise<InternalEnrollmentData | null> {
    return await this.prisma.enrollment.findUnique({
      where: { id: internalId },
    });
  }

  // ===================================================================
  // ENROLLMENT-SPECIFIC METHODS
  // ===================================================================

  /**
   * Synchronize class roster (all enrollments for a class)
   */
  async synchronizeClassRoster(
    classExternalId: string,
    externalEnrollments: ExternalEnrollmentData[],
    context: SyncContext,
  ): Promise<{
    enrollmentResults: any[];
    rosterStatistics: {
      totalEnrollments: number;
      newEnrollments: number;
      updatedEnrollments: number;
      droppedEnrollments: number;
      errors: number;
    };
  }> {
    this.logger.log(`Synchronizing roster for class ${classExternalId} with ${externalEnrollments.length} enrollments`, {
      syncId: context.syncId,
    });

    const results = await this.synchronizeBatch(externalEnrollments, context, {
      batchSize: 20, // Smaller batch size for enrollment operations
    });

    const statistics = {
      totalEnrollments: results.length,
      newEnrollments: results.filter(r => r.action === 'created').length,
      updatedEnrollments: results.filter(r => r.action === 'updated').length,
      droppedEnrollments: results.filter(r => r.metadata?.statusChanged === true).length,
      errors: results.filter(r => r.action === 'error').length,
    };

    this.logger.log(`Roster sync completed for class ${classExternalId}`, {
      syncId: context.syncId,
      ...statistics,
    });

    return {
      enrollmentResults: results,
      rosterStatistics: statistics,
    };
  }

  /**
   * Perform bulk enrollment operations
   */
  async performBulkEnrollmentOperation(
    operation: EnrollmentBatchOperation,
    context: SyncContext,
  ): Promise<any[]> {
    const { classId: externalClassId, studentIds: externalStudentIds, operation: op } = operation;

    // Map external IDs to internal IDs
    const classId = await this.mappingService.mapExternalToInternal(
      context.integrationId,
      'class',
      externalClassId,
    );

    if (!classId) {
      throw new Error(`Class mapping not found for external ID: ${externalClassId}`);
    }

    const studentIds = [];
    for (const externalStudentId of externalStudentIds) {
      const studentId = await this.mappingService.mapExternalToInternal(
        context.integrationId,
        'user',
        externalStudentId,
      );
      
      if (studentId) {
        studentIds.push(studentId);
      } else {
        this.logger.warn(`Student mapping not found: ${externalStudentId}`, {
          syncId: context.syncId,
        });
      }
    }

    this.logger.log(`Performing bulk ${op} operation for ${studentIds.length} students in class ${classId}`, {
      syncId: context.syncId,
    });

    const results = [];
    
    for (const studentId of studentIds) {
      try {
        let result;
        
        switch (op) {
          case 'enroll':
            result = await this.enrollStudent(studentId, classId, context, operation);
            break;
          case 'drop':
            result = await this.dropStudent(studentId, classId, context, operation);
            break;
          case 'complete':
            result = await this.completeStudent(studentId, classId, context, operation);
            break;
          case 'reactivate':
            result = await this.reactivateStudent(studentId, classId, context, operation);
            break;
          default:
            throw new Error(`Unknown bulk operation: ${op}`);
        }
        
        results.push(result);
      } catch (error) {
        results.push({
          entityId: `${studentId}-${classId}`,
          entityType: 'enrollment',
          action: 'error',
          error: error.message,
          metadata: { operation: op, studentId, classId },
          processingTime: 0,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Get enrollment statistics for a class
   */
  async getClassEnrollmentStatistics(
    classExternalId: string,
    context: SyncContext,
  ): Promise<{
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    droppedEnrollments: number;
    enrollmentsByStatus: Record<string, number>;
    averageProgress: number;
    lastSyncAt: Date;
  }> {
    const classId = await this.mappingService.mapExternalToInternal(
      context.integrationId,
      'class',
      classExternalId,
    );

    if (!classId) {
      throw new Error(`Class mapping not found for external ID: ${classExternalId}`);
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        class_id: classId,
        external_system_id: context.externalSystemId,
      },
      select: {
        status: true,
        progress: true,
        last_sync_at: true,
      },
    });

    const enrollmentsByStatus: Record<string, number> = {};
    let totalProgress = 0;
    let progressCount = 0;
    let lastSyncAt = new Date(0);

    for (const enrollment of enrollments) {
      enrollmentsByStatus[enrollment.status] = (enrollmentsByStatus[enrollment.status] || 0) + 1;
      
      if (enrollment.progress != null) {
        totalProgress += enrollment.progress;
        progressCount++;
      }
      
      if (enrollment.last_sync_at && enrollment.last_sync_at > lastSyncAt) {
        lastSyncAt = enrollment.last_sync_at;
      }
    }

    return {
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollmentsByStatus[EnrollmentStatus.ACTIVE] || 0,
      completedEnrollments: enrollmentsByStatus[EnrollmentStatus.COMPLETED] || 0,
      droppedEnrollments: (enrollmentsByStatus[EnrollmentStatus.DROPPED] || 0) + (enrollmentsByStatus[EnrollmentStatus.WITHDRAWN] || 0),
      enrollmentsByStatus,
      averageProgress: progressCount > 0 ? totalProgress / progressCount : 0,
      lastSyncAt,
    };
  }

  // ===================================================================
  // INDIVIDUAL ENROLLMENT OPERATIONS
  // ===================================================================

  private async enrollStudent(
    studentId: string,
    classId: string,
    context: SyncContext,
    operation: EnrollmentBatchOperation,
  ): Promise<any> {
    // Check if enrollment already exists
    const existing = await this.prisma.enrollment.findFirst({
      where: { user_id: studentId, class_id: classId },
    });

    if (existing) {
      // Update existing enrollment to active
      const updated = await this.prisma.enrollment.update({
        where: { id: existing.id },
        data: {
          status: EnrollmentStatus.ACTIVE,
          enrolled_at: operation.effectiveDate || new Date(),
          dropped_at: null,
          completed_at: null,
          last_sync_at: context.startTime,
          sync_version: { increment: 1 },
        },
      });

      return {
        entityId: `${studentId}-${classId}`,
        entityType: 'enrollment',
        action: 'updated',
        internalId: updated.id,
        metadata: { operation: 'enroll', reactivated: true },
        processingTime: 0,
        timestamp: new Date(),
      };
    }

    // Create new enrollment
    const created = await this.prisma.enrollment.create({
      data: {
        user_id: studentId,
        class_id: classId,
        status: EnrollmentStatus.ACTIVE,
        enrolled_at: operation.effectiveDate || new Date(),
        progress: 0,
        role: 'student',
        external_system_id: context.externalSystemId,
        sync_status: 'SYNCED' as any,
        last_sync_at: context.startTime,
        sync_version: 1,
      },
    });

    return {
      entityId: `${studentId}-${classId}`,
      entityType: 'enrollment',
      action: 'created',
      internalId: created.id,
      metadata: { operation: 'enroll' },
      processingTime: 0,
      timestamp: new Date(),
    };
  }

  private async dropStudent(
    studentId: string,
    classId: string,
    context: SyncContext,
    operation: EnrollmentBatchOperation,
  ): Promise<any> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: studentId, class_id: classId },
    });

    if (!enrollment) {
      throw new Error(`Enrollment not found for student ${studentId} in class ${classId}`);
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: EnrollmentStatus.DROPPED,
        dropped_at: operation.effectiveDate || new Date(),
        last_sync_at: context.startTime,
        sync_version: { increment: 1 },
      },
    });

    return {
      entityId: `${studentId}-${classId}`,
      entityType: 'enrollment',
      action: 'updated',
      internalId: updated.id,
      metadata: { operation: 'drop', statusChanged: true },
      processingTime: 0,
      timestamp: new Date(),
    };
  }

  private async completeStudent(
    studentId: string,
    classId: string,
    context: SyncContext,
    operation: EnrollmentBatchOperation,
  ): Promise<any> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: studentId, class_id: classId },
    });

    if (!enrollment) {
      throw new Error(`Enrollment not found for student ${studentId} in class ${classId}`);
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: EnrollmentStatus.COMPLETED,
        completed_at: operation.effectiveDate || new Date(),
        progress: 100,
        last_sync_at: context.startTime,
        sync_version: { increment: 1 },
      },
    });

    return {
      entityId: `${studentId}-${classId}`,
      entityType: 'enrollment',
      action: 'updated',
      internalId: updated.id,
      metadata: { operation: 'complete', statusChanged: true },
      processingTime: 0,
      timestamp: new Date(),
    };
  }

  private async reactivateStudent(
    studentId: string,
    classId: string,
    context: SyncContext,
    operation: EnrollmentBatchOperation,
  ): Promise<any> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: studentId, class_id: classId },
    });

    if (!enrollment) {
      throw new Error(`Enrollment not found for student ${studentId} in class ${classId}`);
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: EnrollmentStatus.ACTIVE,
        dropped_at: null,
        completed_at: null,
        last_sync_at: context.startTime,
        sync_version: { increment: 1 },
      },
    });

    return {
      entityId: `${studentId}-${classId}`,
      entityType: 'enrollment',
      action: 'updated',
      internalId: updated.id,
      metadata: { operation: 'reactivate', statusChanged: true },
      processingTime: 0,
      timestamp: new Date(),
    };
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private isValidEnrollmentStatus(status: string): boolean {
    const validStatuses = ['PENDING', 'ACTIVE', 'COMPLETED', 'DROPPED', 'WITHDRAWN', 'pending', 'active', 'completed', 'dropped', 'withdrawn'];
    return validStatuses.includes(status);
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

  private mapExternalStatus(externalStatus?: string): EnrollmentStatus {
    if (!externalStatus) return EnrollmentStatus.ACTIVE;
    
    const status = externalStatus.toUpperCase();
    
    switch (status) {
      case 'PENDING':
        return EnrollmentStatus.PENDING;
      case 'ACTIVE':
      case 'ENROLLED':
        return EnrollmentStatus.ACTIVE;
      case 'COMPLETED':
      case 'FINISHED':
        return EnrollmentStatus.COMPLETED;
      case 'DROPPED':
      case 'DROPPED OUT':
        return EnrollmentStatus.DROPPED;
      case 'WITHDRAWN':
        return EnrollmentStatus.WITHDRAWN;
      default:
        this.logger.warn(`Unknown enrollment status: ${externalStatus}, defaulting to ACTIVE`);
        return EnrollmentStatus.ACTIVE;
    }
  }

  private mapInternalStatus(internalStatus: EnrollmentStatus): string {
    switch (internalStatus) {
      case EnrollmentStatus.PENDING:
        return 'pending';
      case EnrollmentStatus.ACTIVE:
        return 'active';
      case EnrollmentStatus.COMPLETED:
        return 'completed';
      case EnrollmentStatus.DROPPED:
        return 'dropped';
      case EnrollmentStatus.WITHDRAWN:
        return 'withdrawn';
      default:
        return 'active';
    }
  }

  // ===================================================================
  // CONFLICT RESOLUTION
  // ===================================================================

  protected async resolveExternalWins(conflict: SyncConflict): Promise<ExternalEnrollmentData> {
    // External data takes precedence
    const externalEnrollment = await this.findEntityByExternalId(
      conflict.externalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
    
    return externalEnrollment ? await this.transformInternalToExternal(
      externalEnrollment,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    ) : null;
  }

  protected async resolveInternalWins(conflict: SyncConflict): Promise<InternalEnrollmentData> {
    // Internal data takes precedence
    return await this.findEntityByInternalId(
      conflict.internalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
  }

  protected async resolveMerge(conflict: SyncConflict): Promise<InternalEnrollmentData> {
    const external = await this.findEntityByExternalId(
      conflict.externalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
    const internal = await this.findEntityByInternalId(
      conflict.internalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );

    if (!external || !internal) return null;

    // Merge strategy: Latest date wins for status changes, merge progress
    const latestStatusChange = this.determineLatestStatus(external, internal);
    
    return {
      ...internal,
      status: latestStatusChange.status,
      enrolled_at: external.enrolled_at || internal.enrolled_at,
      dropped_at: latestStatusChange.dropped_at,
      completed_at: latestStatusChange.completed_at,
      grade: external.grade || internal.grade,
      progress: Math.max(external.progress || 0, internal.progress || 0),
      role: external.role || internal.role,
    };
  }

  private determineLatestStatus(external: InternalEnrollmentData, internal: InternalEnrollmentData): {
    status: EnrollmentStatus;
    dropped_at: Date | null;
    completed_at: Date | null;
  } {
    // Logic to determine which status is more recent based on timestamp fields
    const externalStatusDate = external.completed_at || external.dropped_at || external.enrolled_at;
    const internalStatusDate = internal.completed_at || internal.dropped_at || internal.enrolled_at;

    if (externalStatusDate && internalStatusDate) {
      return externalStatusDate > internalStatusDate
        ? {
            status: external.status,
            dropped_at: external.dropped_at,
            completed_at: external.completed_at,
          }
        : {
            status: internal.status,
            dropped_at: internal.dropped_at,
            completed_at: internal.completed_at,
          };
    }

    // Default to external if we can't determine
    return {
      status: external.status,
      dropped_at: external.dropped_at,
      completed_at: external.completed_at,
    };
  }
}
