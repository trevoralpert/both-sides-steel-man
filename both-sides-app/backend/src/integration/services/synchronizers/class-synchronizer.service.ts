/**
 * Class Synchronizer Service
 * 
 * Handles synchronization of class data between external systems and internal database.
 * Manages class metadata, enrollment relationships, and academic schedules.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExternalIdMappingService } from '../external-id-mapping.service';
import { IntegrationRegistry } from '../integration-registry.service';
import { BaseSynchronizerService, SyncContext, ValidationResult, SyncConflict } from './base-synchronizer.service';

// ===================================================================
// CLASS-SPECIFIC INTERFACES
// ===================================================================

export interface ExternalClassData {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  grade?: string;
  academicYear?: string;
  semester?: string;
  organizationId?: string;
  teacherId?: string;
  teacherIds?: string[];
  maxStudents?: number;
  isActive?: boolean;
  schedule?: {
    startTime?: string;
    endTime?: string;
    daysOfWeek?: string[];
    timezone?: string;
  };
  metadata?: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface InternalClassData {
  id?: string;
  name: string;
  description?: string;
  subject?: string;
  grade?: string;
  academic_year?: string;
  semester?: string;
  organization_id?: string;
  teacher_id?: string;
  max_students?: number;
  is_active?: boolean;
  schedule_data?: Record<string, any>;
  external_id?: string;
  external_system_id?: string;
  sync_status?: string;
  last_sync_at?: Date;
  sync_version?: number;
  created_at?: Date;
  updated_at?: Date;
}

// ===================================================================
// CLASS SYNCHRONIZER SERVICE
// ===================================================================

@Injectable()
export class ClassSynchronizerService extends BaseSynchronizerService {
  private readonly logger = new Logger(ClassSynchronizerService.name);

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
    return 'class';
  }

  getConflictableFields(): string[] {
    return [
      'name',
      'description',
      'subject',
      'grade',
      'academic_year',
      'semester',
      'teacher_id',
      'max_students',
      'is_active',
      'schedule_data',
    ];
  }

  extractExternalId(data: ExternalClassData): string {
    return data.id;
  }

  extractInternalId(data: InternalClassData): string {
    return data.id!;
  }

  // ===================================================================
  // VALIDATION
  // ===================================================================

  validateExternalData(data: ExternalClassData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields
    if (!data.id?.trim()) {
      errors.push('Class ID is required');
    }

    if (!data.name?.trim()) {
      errors.push('Class name is required');
    } else if (data.name.length > 200) {
      errors.push('Class name too long (max 200 characters)');
    }

    // Validate organization reference
    if (data.organizationId && !data.organizationId.trim()) {
      warnings.push('Empty organization ID provided');
    }

    // Validate teacher references
    if (data.teacherId && !data.teacherId.trim()) {
      warnings.push('Empty teacher ID provided');
    }

    if (data.teacherIds && data.teacherIds.some(id => !id?.trim())) {
      warnings.push('Some teacher IDs are empty');
    }

    if (data.teacherId && data.teacherIds && data.teacherIds.length > 0) {
      if (!data.teacherIds.includes(data.teacherId)) {
        warnings.push('Primary teacher ID not found in teacher IDs list');
      }
    }

    // Validate optional fields
    if (data.description && data.description.length > 1000) {
      errors.push('Class description too long (max 1000 characters)');
    }

    if (data.maxStudents && (data.maxStudents < 1 || data.maxStudents > 1000)) {
      errors.push('Invalid max students count (must be between 1 and 1000)');
    }

    if (data.grade && !/^(K|[1-9]|1[0-2]|PK)$/.test(data.grade)) {
      warnings.push('Non-standard grade format');
    }

    // Validate schedule
    if (data.schedule) {
      const scheduleValidation = this.validateSchedule(data.schedule);
      errors.push(...scheduleValidation.errors);
      warnings.push(...scheduleValidation.warnings);
    }

    // Suggestions
    if (!data.subject) {
      suggestions.push('Consider providing subject for better categorization');
    }

    if (!data.description) {
      suggestions.push('Consider providing class description for students');
    }

    if (!data.schedule) {
      suggestions.push('Consider providing schedule information');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  private validateSchedule(schedule: ExternalClassData['schedule']): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (schedule?.startTime && !this.isValidTime(schedule.startTime)) {
      errors.push('Invalid start time format');
    }

    if (schedule?.endTime && !this.isValidTime(schedule.endTime)) {
      errors.push('Invalid end time format');
    }

    if (schedule?.startTime && schedule?.endTime) {
      const start = this.parseTime(schedule.startTime);
      const end = this.parseTime(schedule.endTime);
      
      if (start && end && start >= end) {
        errors.push('Start time must be before end time');
      }
    }

    if (schedule?.daysOfWeek && schedule.daysOfWeek.length === 0) {
      warnings.push('No days of week specified in schedule');
    }

    if (schedule?.timezone && !this.isValidTimezone(schedule.timezone)) {
      warnings.push('Invalid timezone format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: [],
    };
  }

  // ===================================================================
  // DATA TRANSFORMATION
  // ===================================================================

  async transformExternalToInternal(
    externalData: ExternalClassData,
    context: SyncContext,
  ): Promise<InternalClassData> {
    // Map organization ID
    let organizationId = null;
    if (externalData.organizationId) {
      organizationId = await this.mappingService.mapExternalToInternal(
        context.integrationId,
        'organization',
        externalData.organizationId,
      );
      
      if (!organizationId) {
        this.logger.warn(`Organization mapping not found: ${externalData.organizationId}`, {
          syncId: context.syncId,
          classId: externalData.id,
        });
      }
    }

    // Map teacher ID
    let teacherId = null;
    if (externalData.teacherId) {
      teacherId = await this.mappingService.mapExternalToInternal(
        context.integrationId,
        'user',
        externalData.teacherId,
      );
      
      if (!teacherId) {
        this.logger.warn(`Teacher mapping not found: ${externalData.teacherId}`, {
          syncId: context.syncId,
          classId: externalData.id,
        });
      }
    }

    return {
      name: externalData.name.trim(),
      description: externalData.description?.trim() || null,
      subject: externalData.subject?.trim() || null,
      grade: externalData.grade?.trim() || null,
      academic_year: externalData.academicYear?.trim() || null,
      semester: externalData.semester?.trim() || null,
      organization_id: organizationId,
      teacher_id: teacherId,
      max_students: externalData.maxStudents || null,
      is_active: externalData.isActive ?? true,
      schedule_data: externalData.schedule ? {
        startTime: externalData.schedule.startTime,
        endTime: externalData.schedule.endTime,
        daysOfWeek: externalData.schedule.daysOfWeek || [],
        timezone: externalData.schedule.timezone || 'UTC',
      } : null,
      external_id: externalData.id,
      external_system_id: context.externalSystemId,
      sync_status: 'SYNCED',
      last_sync_at: context.startTime,
      sync_version: 1,
    };
  }

  async transformInternalToExternal(
    internalData: InternalClassData,
    context: SyncContext,
  ): Promise<ExternalClassData> {
    // Map internal IDs back to external IDs
    let organizationId = undefined;
    if (internalData.organization_id) {
      organizationId = await this.mappingService.mapInternalToExternal(
        context.integrationId,
        'organization',
        internalData.organization_id,
      );
    }

    let teacherId = undefined;
    if (internalData.teacher_id) {
      teacherId = await this.mappingService.mapInternalToExternal(
        context.integrationId,
        'user',
        internalData.teacher_id,
      );
    }

    return {
      id: internalData.external_id || internalData.id!,
      name: internalData.name,
      description: internalData.description || undefined,
      subject: internalData.subject || undefined,
      grade: internalData.grade || undefined,
      academicYear: internalData.academic_year || undefined,
      semester: internalData.semester || undefined,
      organizationId,
      teacherId,
      maxStudents: internalData.max_students || undefined,
      isActive: internalData.is_active,
      schedule: internalData.schedule_data ? {
        startTime: internalData.schedule_data.startTime,
        endTime: internalData.schedule_data.endTime,
        daysOfWeek: internalData.schedule_data.daysOfWeek,
        timezone: internalData.schedule_data.timezone,
      } : undefined,
      createdAt: internalData.created_at,
      updatedAt: internalData.updated_at,
    };
  }

  // ===================================================================
  // CRUD OPERATIONS
  // ===================================================================

  async createEntity(data: InternalClassData, context: SyncContext): Promise<InternalClassData> {
    this.logger.log(`Creating class: ${data.name}`, { syncId: context.syncId });

    const created = await this.prisma.class.create({
      data: {
        name: data.name,
        description: data.description,
        subject: data.subject,
        grade: data.grade,
        academic_year: data.academic_year,
        semester: data.semester,
        organization_id: data.organization_id,
        teacher_id: data.teacher_id,
        max_students: data.max_students,
        is_active: data.is_active,
        schedule_data: data.schedule_data,
        external_id: data.external_id,
        external_system_id: data.external_system_id,
        sync_status: data.sync_status as any,
        last_sync_at: data.last_sync_at,
        sync_version: data.sync_version,
      },
    });

    this.logger.log(`Successfully created class: ${created.id}`, {
      syncId: context.syncId,
      classId: created.id,
      className: created.name,
    });

    return created;
  }

  async updateEntity(
    id: string,
    data: InternalClassData,
    context: SyncContext,
  ): Promise<InternalClassData> {
    this.logger.log(`Updating class: ${id}`, { syncId: context.syncId });

    const updated = await this.prisma.class.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        subject: data.subject,
        grade: data.grade,
        academic_year: data.academic_year,
        semester: data.semester,
        organization_id: data.organization_id,
        teacher_id: data.teacher_id,
        max_students: data.max_students,
        is_active: data.is_active,
        schedule_data: data.schedule_data,
        external_id: data.external_id,
        external_system_id: data.external_system_id,
        sync_status: data.sync_status as any,
        last_sync_at: data.last_sync_at,
        sync_version: (data.sync_version || 0) + 1,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Successfully updated class: ${updated.id}`, {
      syncId: context.syncId,
      classId: updated.id,
    });

    return updated;
  }

  async findEntityByExternalId(
    externalId: string,
    context: SyncContext,
  ): Promise<InternalClassData | null> {
    return await this.prisma.class.findFirst({
      where: {
        external_id: externalId,
        external_system_id: context.externalSystemId,
      },
    });
  }

  async findEntityByInternalId(
    internalId: string,
    context: SyncContext,
  ): Promise<InternalClassData | null> {
    return await this.prisma.class.findUnique({
      where: { id: internalId },
    });
  }

  // ===================================================================
  // CLASS-SPECIFIC METHODS
  // ===================================================================

  /**
   * Synchronize class with enrollment data
   */
  async synchronizeClassWithEnrollments(
    externalData: ExternalClassData,
    studentIds: string[],
    context: SyncContext,
  ): Promise<{
    classResult: any;
    enrollmentResults: any[];
  }> {
    // First sync the class
    const classResult = await this.synchronizeEntity(externalData, context);
    
    if (classResult.action === 'error') {
      return {
        classResult,
        enrollmentResults: [],
      };
    }

    // Then handle enrollments
    const enrollmentResults = [];
    for (const studentId of studentIds) {
      try {
        // This would typically call the EnrollmentSynchronizer
        // For now, we'll create a placeholder result
        enrollmentResults.push({
          entityId: `${classResult.internalId}-${studentId}`,
          entityType: 'enrollment',
          action: 'deferred',
          metadata: { classId: classResult.internalId, studentId },
        });
      } catch (error) {
        enrollmentResults.push({
          entityId: `${classResult.internalId}-${studentId}`,
          entityType: 'enrollment',
          action: 'error',
          error: error.message,
        });
      }
    }

    return {
      classResult,
      enrollmentResults,
    };
  }

  /**
   * Synchronize classes by academic year
   */
  async synchronizeClassesByAcademicYear(
    externalClasses: ExternalClassData[],
    academicYear: string,
    context: SyncContext,
  ): Promise<any[]> {
    const filteredClasses = externalClasses.filter(cls => 
      cls.academicYear === academicYear
    );

    this.logger.log(`Synchronizing ${filteredClasses.length} classes for academic year ${academicYear}`, {
      syncId: context.syncId,
    });

    return await this.synchronizeBatch(filteredClasses, context, {
      batchSize: 5, // Smaller batch size for classes
    });
  }

  /**
   * Handle class archive/unarchive
   */
  async synchronizeClassStatus(
    externalData: ExternalClassData,
    context: SyncContext,
  ): Promise<any> {
    const existingInternalId = await this.mappingService.mapExternalToInternal(
      context.integrationId,
      'class',
      externalData.id,
    );

    if (!existingInternalId) {
      // Class doesn't exist, create if active
      if (externalData.isActive !== false) {
        return await this.synchronizeEntity(externalData, context);
      }
      return null;
    }

    // Update class active status
    const updated = await this.prisma.class.update({
      where: { id: existingInternalId },
      data: {
        is_active: externalData.isActive ?? true,
        last_sync_at: context.startTime,
        sync_version: { increment: 1 },
      },
    });

    return {
      entityId: externalData.id,
      entityType: 'class',
      action: 'updated',
      externalId: externalData.id,
      internalId: existingInternalId,
      metadata: { statusChanged: true, isActive: updated.is_active },
      processingTime: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Get class statistics for sync reporting
   */
  async getClassSyncStatistics(context: SyncContext): Promise<{
    totalClasses: number;
    activeClasses: number;
    classesBySubject: Record<string, number>;
    classesByGrade: Record<string, number>;
    lastSyncAt: Date;
  }> {
    const classes = await this.prisma.class.findMany({
      where: {
        external_system_id: context.externalSystemId,
      },
      select: {
        is_active: true,
        subject: true,
        grade: true,
        last_sync_at: true,
      },
    });

    const classesBySubject: Record<string, number> = {};
    const classesByGrade: Record<string, number> = {};
    let lastSyncAt = new Date(0);

    for (const cls of classes) {
      if (cls.subject) {
        classesBySubject[cls.subject] = (classesBySubject[cls.subject] || 0) + 1;
      }
      
      if (cls.grade) {
        classesByGrade[cls.grade] = (classesByGrade[cls.grade] || 0) + 1;
      }
      
      if (cls.last_sync_at && cls.last_sync_at > lastSyncAt) {
        lastSyncAt = cls.last_sync_at;
      }
    }

    return {
      totalClasses: classes.length,
      activeClasses: classes.filter(c => c.is_active).length,
      classesBySubject,
      classesByGrade,
      lastSyncAt,
    };
  }

  // ===================================================================
  // CONFLICT RESOLUTION
  // ===================================================================

  protected async resolveExternalWins(conflict: SyncConflict): Promise<ExternalClassData> {
    // External data takes precedence
    const externalClass = await this.findEntityByExternalId(
      conflict.externalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
    
    return externalClass ? await this.transformInternalToExternal(
      externalClass,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    ) : null;
  }

  protected async resolveInternalWins(conflict: SyncConflict): Promise<InternalClassData> {
    // Internal data takes precedence
    return await this.findEntityByInternalId(
      conflict.internalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
  }

  protected async resolveMerge(conflict: SyncConflict): Promise<InternalClassData> {
    const external = await this.findEntityByExternalId(
      conflict.externalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
    const internal = await this.findEntityByInternalId(
      conflict.internalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );

    if (!external || !internal) return null;

    // Merge strategy: External wins for descriptive data, internal wins for relationships
    return {
      ...internal,
      name: external.name, // External name takes precedence
      description: external.description || internal.description,
      subject: external.subject || internal.subject,
      grade: external.grade || internal.grade,
      academic_year: external.academic_year || internal.academic_year,
      semester: external.semester || internal.semester,
      max_students: external.max_students ?? internal.max_students,
      is_active: external.is_active ?? internal.is_active,
      schedule_data: external.schedule_data || internal.schedule_data,
      // Keep internal relationships
      organization_id: internal.organization_id,
      teacher_id: internal.teacher_id,
    };
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private isValidTime(timeString: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  }

  private parseTime(timeString: string): Date | null {
    if (!this.isValidTime(timeString)) return null;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}
