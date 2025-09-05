/**
 * TimeBack Data Mapping & Transformation Pipeline
 * 
 * Comprehensive data mapping service that transforms between TimeBack's data format
 * and our internal data models with bidirectional support, field validation,
 * relationship mapping, and customizable transformation rules.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  TimeBackUser, 
  TimeBackClass, 
  TimeBackEnrollment, 
  TimeBackOrganization 
} from '../../clients/timeback-complete-client';

// ===================================================================
// MAPPING CONFIGURATION TYPES
// ===================================================================

export interface DataMappingConfig {
  enabled: boolean;
  validation: {
    strict: boolean;
    requireAllFields: boolean;
    allowUnknownFields: boolean;
    customValidators: boolean;
  };
  transformation: {
    autoTypeConversion: boolean;
    dateTimeFormat: string;
    nullHandling: 'ignore' | 'convert' | 'error';
    stringTrimming: boolean;
  };
  relationships: {
    autoResolve: boolean;
    cascadeOperations: boolean;
    orphanHandling: 'ignore' | 'error' | 'cleanup';
  };
  caching: {
    enabled: boolean;
    ttl: number;
    invalidateOnChange: boolean;
  };
}

export interface FieldMappingRule {
  sourceField: string;
  targetField: string;
  required: boolean;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  defaultValue?: any;
  transformer?: (value: any, context?: any) => any;
  validator?: (value: any, context?: any) => boolean | string;
  conditions?: {
    when: string; // Field condition
    equals?: any;
    notEquals?: any;
    exists?: boolean;
  };
}

export interface EntityMappingSchema {
  entityType: 'user' | 'class' | 'enrollment' | 'organization';
  direction: 'timeback_to_internal' | 'internal_to_timeback' | 'bidirectional';
  fields: FieldMappingRule[];
  relationships: RelationshipMapping[];
  customTransformers: CustomTransformer[];
  validationRules: ValidationRule[];
}

export interface RelationshipMapping {
  relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_many';
  sourceEntity: string;
  sourceField: string;
  targetEntity: string;
  targetField: string;
  resolver?: (sourceValue: any, context?: any) => Promise<any>;
  cascadeDelete?: boolean;
  required?: boolean;
}

export interface CustomTransformer {
  name: string;
  description: string;
  apply: (data: any, context?: MappingContext) => any;
  validate?: (data: any) => boolean | string;
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'email' | 'url' | 'regex' | 'length' | 'range' | 'custom';
  params?: any;
  message?: string;
  severity: 'error' | 'warning';
}

export interface MappingContext {
  direction: 'to_internal' | 'to_timeback';
  entityType: string;
  sourceData: any;
  organizationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface MappingResult<T = any> {
  success: boolean;
  data?: T;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
  metadata: {
    processingTime: number;
    fieldsProcessed: number;
    transformationsApplied: string[];
    validationsPerformed: number;
  };
}

// ===================================================================
// INTERNAL DATA MODELS (Simplified representations)
// ===================================================================

export interface InternalUser {
  id: string;
  external_id: string;
  external_system_id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  status: string;
  preferences: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  last_sync_at?: Date;
  sync_status?: string;
  sync_version?: string;
}

export interface InternalClass {
  id: string;
  external_id: string;
  external_system_id: string;
  name: string;
  description?: string;
  organization_id: string;
  teacher_id: string;
  subject: string;
  grade_level?: string;
  room?: string;
  schedule: Record<string, any>;
  capacity: number;
  status: string;
  created_at: Date;
  updated_at: Date;
  last_sync_at?: Date;
  sync_status?: string;
  sync_version?: string;
}

export interface InternalEnrollment {
  id: string;
  external_id: string;
  external_system_id: string;
  class_id: string;
  user_id: string;
  role: string;
  status: string;
  enrollment_date: Date;
  completion_date?: Date;
  grades: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  last_sync_at?: Date;
  sync_status?: string;
  sync_version?: string;
}

export interface InternalOrganization {
  id: string;
  external_id: string;
  external_system_id: string;
  name: string;
  type: string;
  parent_id?: string;
  settings: Record<string, any>;
  contact_info: Record<string, any>;
  address: Record<string, any>;
  status: string;
  created_at: Date;
  updated_at: Date;
  last_sync_at?: Date;
  sync_status?: string;
  sync_version?: string;
}

// ===================================================================
// DATA MAPPER SERVICE
// ===================================================================

@Injectable()
export class TimeBackDataMapperService {
  private readonly logger = new Logger(TimeBackDataMapperService.name);
  private readonly config: DataMappingConfig;
  private readonly mappingSchemas = new Map<string, EntityMappingSchema>();
  private readonly transformCache = new Map<string, any>();

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadMappingConfig();
    this.initializeMappingSchemas();
  }

  // ===================================================================
  // USER MAPPING
  // ===================================================================

  /**
   * Map TimeBack user to internal user format
   */
  async mapUserToInternal(
    timebackUser: TimeBackUser,
    context?: Partial<MappingContext>
  ): Promise<MappingResult<InternalUser>> {
    const startTime = Date.now();
    const ctx: MappingContext = {
      direction: 'to_internal',
      entityType: 'user',
      sourceData: timebackUser,
      ...context,
    };

    try {
      const errors: MappingResult['errors'] = [];
      const warnings: MappingResult['warnings'] = [];
      const transformationsApplied: string[] = [];

      // Map basic fields
      const internalUser: InternalUser = {
        id: '', // Will be generated by our system
        external_id: timebackUser.id,
        external_system_id: 'timeback',
        email: this.validateAndTransformEmail(timebackUser.email, errors),
        username: timebackUser.username || timebackUser.email,
        first_name: timebackUser.profile.firstName,
        last_name: timebackUser.profile.lastName,
        display_name: timebackUser.profile.displayName || `${timebackUser.profile.firstName} ${timebackUser.profile.lastName}`,
        avatar_url: timebackUser.profile.avatar,
        role: this.mapUserRole(timebackUser.roles, ctx.organizationId, warnings),
        status: this.mapUserStatus(timebackUser.status),
        preferences: this.mapUserPreferences(timebackUser.preferences, transformationsApplied),
        created_at: new Date(timebackUser.createdAt),
        updated_at: new Date(timebackUser.updatedAt),
        last_sync_at: new Date(),
        sync_status: 'synced',
        sync_version: timebackUser.metadata?.version || '1.0.0',
      };

      // Apply custom transformations
      await this.applyCustomTransformations('user', internalUser, ctx, transformationsApplied);

      // Validate the mapped data
      const validationErrors = await this.validateMappedData('user', internalUser, ctx);
      errors.push(...validationErrors);

      const success = errors.filter(e => e.severity === 'error').length === 0;

      return {
        success,
        data: success ? internalUser : undefined,
        errors,
        warnings,
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: Object.keys(internalUser).length,
          transformationsApplied,
          validationsPerformed: validationErrors.length,
        },
      };

    } catch (error) {
      this.logger.error(`User mapping failed: ${error.message}`, error.stack);
      
      return {
        success: false,
        errors: [{
          field: 'general',
          message: `Mapping failed: ${error.message}`,
          severity: 'error',
          code: 'MAPPING_ERROR',
        }],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: 0,
          transformationsApplied: [],
          validationsPerformed: 0,
        },
      };
    }
  }

  /**
   * Map internal user to TimeBack user format
   */
  async mapUserToTimeBack(
    internalUser: InternalUser,
    context?: Partial<MappingContext>
  ): Promise<MappingResult<Partial<TimeBackUser>>> {
    const startTime = Date.now();
    const ctx: MappingContext = {
      direction: 'to_timeback',
      entityType: 'user',
      sourceData: internalUser,
      ...context,
    };

    try {
      const errors: MappingResult['errors'] = [];
      const warnings: MappingResult['warnings'] = [];
      const transformationsApplied: string[] = [];

      const timebackUser: Partial<TimeBackUser> = {
        id: internalUser.external_id,
        email: internalUser.email,
        username: internalUser.username,
        profile: {
          firstName: internalUser.first_name,
          lastName: internalUser.last_name,
          displayName: internalUser.display_name,
          avatar: internalUser.avatar_url,
        },
        status: this.mapInternalUserStatusToTimeBack(internalUser.status),
        preferences: this.mapInternalUserPreferencesToTimeBack(internalUser.preferences, transformationsApplied),
        metadata: {
          lastSync: internalUser.last_sync_at?.toISOString(),
          source: 'both_sides',
          version: internalUser.sync_version || '1.0.0',
        },
      };

      // Apply role mapping (complex because of organization context)
      if (ctx.organizationId) {
        timebackUser.roles = await this.mapInternalUserRoleToTimeBack(
          internalUser.role,
          ctx.organizationId,
          warnings
        );
      }

      const success = errors.filter(e => e.severity === 'error').length === 0;

      return {
        success,
        data: success ? timebackUser : undefined,
        errors,
        warnings,
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: Object.keys(timebackUser).length,
          transformationsApplied,
          validationsPerformed: 0,
        },
      };

    } catch (error) {
      this.logger.error(`User to TimeBack mapping failed: ${error.message}`, error.stack);
      
      return {
        success: false,
        errors: [{
          field: 'general',
          message: `Mapping failed: ${error.message}`,
          severity: 'error',
          code: 'MAPPING_ERROR',
        }],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: 0,
          transformationsApplied: [],
          validationsPerformed: 0,
        },
      };
    }
  }

  // ===================================================================
  // CLASS MAPPING
  // ===================================================================

  /**
   * Map TimeBack class to internal class format
   */
  async mapClassToInternal(
    timebackClass: TimeBackClass,
    context?: Partial<MappingContext>
  ): Promise<MappingResult<InternalClass>> {
    const startTime = Date.now();
    const ctx: MappingContext = {
      direction: 'to_internal',
      entityType: 'class',
      sourceData: timebackClass,
      ...context,
    };

    try {
      const errors: MappingResult['errors'] = [];
      const warnings: MappingResult['warnings'] = [];
      const transformationsApplied: string[] = [];

      const internalClass: InternalClass = {
        id: '',
        external_id: timebackClass.id,
        external_system_id: 'timeback',
        name: timebackClass.name,
        description: timebackClass.description,
        organization_id: timebackClass.organizationId,
        teacher_id: timebackClass.teacherId,
        subject: this.mapSubject(timebackClass.subject, transformationsApplied),
        grade_level: timebackClass.subject.level,
        room: this.extractRoom(timebackClass.schedule.periods),
        schedule: this.mapClassSchedule(timebackClass.schedule, transformationsApplied),
        capacity: timebackClass.enrollment.capacity,
        status: this.mapClassStatus(timebackClass.status),
        created_at: new Date(timebackClass.createdAt),
        updated_at: new Date(timebackClass.updatedAt),
        last_sync_at: new Date(),
        sync_status: 'synced',
        sync_version: timebackClass.metadata?.version || '1.0.0',
      };

      // Apply custom transformations
      await this.applyCustomTransformations('class', internalClass, ctx, transformationsApplied);

      // Validate the mapped data
      const validationErrors = await this.validateMappedData('class', internalClass, ctx);
      errors.push(...validationErrors);

      const success = errors.filter(e => e.severity === 'error').length === 0;

      return {
        success,
        data: success ? internalClass : undefined,
        errors,
        warnings,
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: Object.keys(internalClass).length,
          transformationsApplied,
          validationsPerformed: validationErrors.length,
        },
      };

    } catch (error) {
      this.logger.error(`Class mapping failed: ${error.message}`, error.stack);
      
      return {
        success: false,
        errors: [{
          field: 'general',
          message: `Mapping failed: ${error.message}`,
          severity: 'error',
          code: 'MAPPING_ERROR',
        }],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: 0,
          transformationsApplied: [],
          validationsPerformed: 0,
        },
      };
    }
  }

  /**
   * Map internal class to TimeBack class format
   */
  async mapClassToTimeBack(
    internalClass: InternalClass,
    context?: Partial<MappingContext>
  ): Promise<MappingResult<Partial<TimeBackClass>>> {
    const startTime = Date.now();
    const ctx: MappingContext = {
      direction: 'to_timeback',
      entityType: 'class',
      sourceData: internalClass,
      ...context,
    };

    try {
      const transformationsApplied: string[] = [];

      const timebackClass: Partial<TimeBackClass> = {
        id: internalClass.external_id,
        name: internalClass.name,
        description: internalClass.description,
        organizationId: internalClass.organization_id,
        teacherId: internalClass.teacher_id,
        subject: this.mapInternalSubjectToTimeBack(internalClass.subject, internalClass.grade_level),
        schedule: this.mapInternalScheduleToTimeBack(internalClass.schedule, internalClass.room, transformationsApplied),
        enrollment: {
          capacity: internalClass.capacity,
          currentCount: 0, // Would need to calculate from enrollments
          waitlistCount: 0,
          enrollmentPolicy: 'open',
        },
        status: this.mapInternalClassStatusToTimeBack(internalClass.status),
        metadata: {
          lastSync: internalClass.last_sync_at?.toISOString(),
          version: internalClass.sync_version || '1.0.0',
        },
      };

      return {
        success: true,
        data: timebackClass,
        errors: [],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: Object.keys(timebackClass).length,
          transformationsApplied,
          validationsPerformed: 0,
        },
      };

    } catch (error) {
      this.logger.error(`Class to TimeBack mapping failed: ${error.message}`, error.stack);
      
      return {
        success: false,
        errors: [{
          field: 'general',
          message: `Mapping failed: ${error.message}`,
          severity: 'error',
          code: 'MAPPING_ERROR',
        }],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: 0,
          transformationsApplied: [],
          validationsPerformed: 0,
        },
      };
    }
  }

  // ===================================================================
  // ENROLLMENT MAPPING
  // ===================================================================

  /**
   * Map TimeBack enrollment to internal enrollment format
   */
  async mapEnrollmentToInternal(
    timebackEnrollment: TimeBackEnrollment,
    context?: Partial<MappingContext>
  ): Promise<MappingResult<InternalEnrollment>> {
    const startTime = Date.now();
    
    try {
      const transformationsApplied: string[] = [];

      const internalEnrollment: InternalEnrollment = {
        id: '',
        external_id: timebackEnrollment.id,
        external_system_id: 'timeback',
        class_id: timebackEnrollment.classId,
        user_id: timebackEnrollment.userId,
        role: this.mapEnrollmentRole(timebackEnrollment.role),
        status: this.mapEnrollmentStatus(timebackEnrollment.status),
        enrollment_date: new Date(timebackEnrollment.enrollmentDate),
        completion_date: timebackEnrollment.completionDate ? new Date(timebackEnrollment.completionDate) : undefined,
        grades: this.mapEnrollmentGrades(timebackEnrollment.grades, transformationsApplied),
        created_at: new Date(timebackEnrollment.createdAt),
        updated_at: new Date(timebackEnrollment.updatedAt),
        last_sync_at: new Date(),
        sync_status: 'synced',
        sync_version: timebackEnrollment.metadata?.version || '1.0.0',
      };

      return {
        success: true,
        data: internalEnrollment,
        errors: [],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: Object.keys(internalEnrollment).length,
          transformationsApplied,
          validationsPerformed: 0,
        },
      };

    } catch (error) {
      this.logger.error(`Enrollment mapping failed: ${error.message}`, error.stack);
      
      return {
        success: false,
        errors: [{
          field: 'general',
          message: `Mapping failed: ${error.message}`,
          severity: 'error',
          code: 'MAPPING_ERROR',
        }],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: 0,
          transformationsApplied: [],
          validationsPerformed: 0,
        },
      };
    }
  }

  /**
   * Map internal enrollment to TimeBack enrollment format
   */
  async mapEnrollmentToTimeBack(
    internalEnrollment: InternalEnrollment,
    context?: Partial<MappingContext>
  ): Promise<MappingResult<Partial<TimeBackEnrollment>>> {
    const startTime = Date.now();
    
    try {
      const transformationsApplied: string[] = [];

      const timebackEnrollment: Partial<TimeBackEnrollment> = {
        id: internalEnrollment.external_id,
        classId: internalEnrollment.class_id,
        userId: internalEnrollment.user_id,
        organizationId: context?.organizationId || '',
        role: this.mapInternalEnrollmentRoleToTimeBack(internalEnrollment.role),
        status: this.mapInternalEnrollmentStatusToTimeBack(internalEnrollment.status),
        enrollmentDate: internalEnrollment.enrollment_date.toISOString(),
        completionDate: internalEnrollment.completion_date?.toISOString(),
        grades: this.mapInternalGradesToTimeBack(internalEnrollment.grades, transformationsApplied),
        metadata: {
          lastSync: internalEnrollment.last_sync_at?.toISOString(),
          version: internalEnrollment.sync_version || '1.0.0',
        },
      };

      return {
        success: true,
        data: timebackEnrollment,
        errors: [],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: Object.keys(timebackEnrollment).length,
          transformationsApplied,
          validationsPerformed: 0,
        },
      };

    } catch (error) {
      this.logger.error(`Enrollment to TimeBack mapping failed: ${error.message}`, error.stack);
      
      return {
        success: false,
        errors: [{
          field: 'general',
          message: `Mapping failed: ${error.message}`,
          severity: 'error',
          code: 'MAPPING_ERROR',
        }],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: 0,
          transformationsApplied: [],
          validationsPerformed: 0,
        },
      };
    }
  }

  // ===================================================================
  // ORGANIZATION MAPPING
  // ===================================================================

  /**
   * Map TimeBack organization to internal organization format
   */
  async mapOrganizationToInternal(
    timebackOrg: TimeBackOrganization,
    context?: Partial<MappingContext>
  ): Promise<MappingResult<InternalOrganization>> {
    const startTime = Date.now();
    
    try {
      const transformationsApplied: string[] = [];

      const internalOrg: InternalOrganization = {
        id: '',
        external_id: timebackOrg.id,
        external_system_id: 'timeback',
        name: timebackOrg.name,
        type: this.mapOrganizationType(timebackOrg.type),
        parent_id: timebackOrg.hierarchy.parentId,
        settings: this.mapOrganizationSettings(timebackOrg.settings, transformationsApplied),
        contact_info: this.mapOrganizationContact(timebackOrg.contact, transformationsApplied),
        address: this.mapOrganizationAddress(timebackOrg.address, transformationsApplied),
        status: this.mapOrganizationStatus(timebackOrg.status),
        created_at: new Date(timebackOrg.createdAt),
        updated_at: new Date(timebackOrg.updatedAt),
        last_sync_at: new Date(),
        sync_status: 'synced',
        sync_version: timebackOrg.metadata?.version || '1.0.0',
      };

      return {
        success: true,
        data: internalOrg,
        errors: [],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: Object.keys(internalOrg).length,
          transformationsApplied,
          validationsPerformed: 0,
        },
      };

    } catch (error) {
      this.logger.error(`Organization mapping failed: ${error.message}`, error.stack);
      
      return {
        success: false,
        errors: [{
          field: 'general',
          message: `Mapping failed: ${error.message}`,
          severity: 'error',
          code: 'MAPPING_ERROR',
        }],
        warnings: [],
        metadata: {
          processingTime: Date.now() - startTime,
          fieldsProcessed: 0,
          transformationsApplied: [],
          validationsPerformed: 0,
        },
      };
    }
  }

  // ===================================================================
  // BATCH MAPPING OPERATIONS
  // ===================================================================

  /**
   * Map multiple entities in batch
   */
  async mapBatch<T, R>(
    entities: T[],
    mapperFunction: (entity: T, context?: Partial<MappingContext>) => Promise<MappingResult<R>>,
    context?: Partial<MappingContext>,
    options?: {
      batchSize?: number;
      parallel?: boolean;
      continueOnError?: boolean;
    }
  ): Promise<{
    results: Array<MappingResult<R>>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      totalProcessingTime: number;
    };
  }> {
    const startTime = Date.now();
    const opts = {
      batchSize: 50,
      parallel: true,
      continueOnError: true,
      ...options,
    };

    const results: Array<MappingResult<R>> = [];
    let successful = 0;
    let failed = 0;

    try {
      if (opts.parallel) {
        // Process all entities in parallel
        const mappingPromises = entities.map(entity => 
          mapperFunction(entity, context).catch(error => ({
            success: false,
            errors: [{ field: 'general', message: error.message, severity: 'error' as const, code: 'BATCH_ERROR' }],
            warnings: [],
            metadata: { processingTime: 0, fieldsProcessed: 0, transformationsApplied: [], validationsPerformed: 0 },
          }))
        );

        const batchResults = await Promise.all(mappingPromises);
        results.push(...batchResults);
      } else {
        // Process entities sequentially in batches
        for (let i = 0; i < entities.length; i += opts.batchSize) {
          const batch = entities.slice(i, i + opts.batchSize);
          
          for (const entity of batch) {
            try {
              const result = await mapperFunction(entity, context);
              results.push(result);
              
              if (result.success) successful++;
              else failed++;
            } catch (error) {
              const errorResult: MappingResult<R> = {
                success: false,
                errors: [{ field: 'general', message: error.message, severity: 'error', code: 'BATCH_ERROR' }],
                warnings: [],
                metadata: { processingTime: 0, fieldsProcessed: 0, transformationsApplied: [], validationsPerformed: 0 },
              };
              
              results.push(errorResult);
              failed++;

              if (!opts.continueOnError) {
                break;
              }
            }
          }
        }
      }

      // Count results if parallel processing
      if (opts.parallel) {
        successful = results.filter(r => r.success).length;
        failed = results.filter(r => !r.success).length;
      }

      return {
        results,
        summary: {
          total: entities.length,
          successful,
          failed,
          totalProcessingTime: Date.now() - startTime,
        },
      };

    } catch (error) {
      this.logger.error(`Batch mapping failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===================================================================
  // HELPER METHODS FOR FIELD MAPPING
  // ===================================================================

  private validateAndTransformEmail(email: string, errors: MappingResult['errors']): string {
    if (!email || typeof email !== 'string') {
      errors.push({
        field: 'email',
        message: 'Email is required and must be a string',
        severity: 'error',
        code: 'REQUIRED_FIELD',
      });
      return '';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        severity: 'error',
        code: 'INVALID_FORMAT',
      });
      return email; // Return original for debugging
    }

    return email.toLowerCase().trim();
  }

  private mapUserRole(roles: TimeBackUser['roles'], organizationId?: string, warnings?: MappingResult['warnings']): string {
    if (!roles || roles.length === 0) {
      return 'student'; // Default role
    }

    // Find role for specific organization or use first role
    const relevantRole = organizationId 
      ? roles.find(r => r.organizationId === organizationId) || roles[0]
      : roles[0];

    const roleMapping: Record<string, string> = {
      'student': 'student',
      'teacher': 'teacher',
      'admin': 'admin',
      'staff': 'teacher',
      'parent': 'parent',
    };

    const mappedRole = roleMapping[relevantRole.roleType] || 'student';

    if (mappedRole === 'student' && relevantRole.roleType !== 'student' && warnings) {
      warnings.push({
        field: 'role',
        message: `Unknown role type '${relevantRole.roleType}' mapped to 'student'`,
        suggestion: 'Consider updating role mapping configuration',
      });
    }

    return mappedRole;
  }

  private mapUserStatus(status: TimeBackUser['status']): string {
    const statusMapping: Record<string, string> = {
      'active': 'active',
      'inactive': 'inactive',
      'pending': 'pending',
      'suspended': 'suspended',
    };

    return statusMapping[status] || 'inactive';
  }

  private mapUserPreferences(preferences: TimeBackUser['preferences'], transformationsApplied: string[]): Record<string, any> {
    transformationsApplied.push('user_preferences_mapping');
    
    return {
      language: preferences.language || 'en',
      timezone: preferences.timezone || 'UTC',
      notifications: {
        email: preferences.notifications?.email ?? true,
        push: preferences.notifications?.push ?? true,
        sms: preferences.notifications?.sms ?? false,
      },
      accessibility: preferences.accessibility || {},
    };
  }

  private mapInternalUserStatusToTimeBack(status: string): TimeBackUser['status'] {
    const statusMapping: Record<string, TimeBackUser['status']> = {
      'active': 'active',
      'inactive': 'inactive',
      'pending': 'pending',
      'suspended': 'suspended',
    };

    return statusMapping[status] || 'inactive';
  }

  private mapInternalUserPreferencesToTimeBack(preferences: Record<string, any>, transformationsApplied: string[]): TimeBackUser['preferences'] {
    transformationsApplied.push('internal_user_preferences_mapping');
    
    return {
      language: preferences.language || 'en',
      timezone: preferences.timezone || 'UTC',
      notifications: {
        email: preferences.notifications?.email ?? true,
        push: preferences.notifications?.push ?? true,
        sms: preferences.notifications?.sms ?? false,
      },
      accessibility: preferences.accessibility || {},
    };
  }

  private async mapInternalUserRoleToTimeBack(
    role: string,
    organizationId: string,
    warnings?: MappingResult['warnings']
  ): Promise<TimeBackUser['roles']> {
    const roleMapping: Record<string, TimeBackUser['roles'][0]['roleType']> = {
      'student': 'student',
      'teacher': 'teacher',
      'admin': 'admin',
      'parent': 'parent',
    };

    const roleType = roleMapping[role] || 'student';

    if (roleType === 'student' && role !== 'student' && warnings) {
      warnings.push({
        field: 'role',
        message: `Unknown internal role '${role}' mapped to 'student'`,
        suggestion: 'Consider updating role mapping configuration',
      });
    }

    return [{
      organizationId,
      roleType,
      permissions: [], // Would need to fetch from role configuration
      department: undefined,
      grade: undefined,
      subjects: undefined,
    }];
  }

  private mapSubject(subject: TimeBackClass['subject'], transformationsApplied: string[]): string {
    transformationsApplied.push('subject_mapping');
    return `${subject.area}${subject.level ? ` - ${subject.level}` : ''}`;
  }

  private extractRoom(periods: TimeBackClass['schedule']['periods']): string | undefined {
    const roomSet = new Set(periods.map(p => p.room).filter(Boolean));
    return roomSet.size === 1 ? Array.from(roomSet)[0] : undefined;
  }

  private mapClassSchedule(schedule: TimeBackClass['schedule'], transformationsApplied: string[]): Record<string, any> {
    transformationsApplied.push('class_schedule_mapping');
    
    return {
      term: schedule.term,
      startDate: schedule.dates.startDate,
      endDate: schedule.dates.endDate,
      periods: schedule.periods.map(period => ({
        dayOfWeek: period.dayOfWeek,
        startTime: period.startTime,
        endTime: period.endTime,
        room: period.room,
      })),
    };
  }

  private mapClassStatus(status: TimeBackClass['status']): string {
    const statusMapping: Record<string, string> = {
      'active': 'active',
      'archived': 'archived',
      'draft': 'draft',
    };

    return statusMapping[status] || 'active';
  }

  private mapInternalSubjectToTimeBack(subject: string, gradeLevel?: string): TimeBackClass['subject'] {
    const parts = subject.split(' - ');
    return {
      area: parts[0] || subject,
      level: gradeLevel || parts[1] || '',
      curriculum: undefined,
    };
  }

  private mapInternalScheduleToTimeBack(
    schedule: Record<string, any>,
    room?: string,
    transformationsApplied: string[] = []
  ): TimeBackClass['schedule'] {
    transformationsApplied.push('internal_schedule_mapping');
    
    return {
      term: schedule.term || 'Fall 2024',
      periods: schedule.periods?.map((period: any) => ({
        dayOfWeek: period.dayOfWeek,
        startTime: period.startTime,
        endTime: period.endTime,
        room: period.room || room,
      })) || [],
      dates: {
        startDate: schedule.startDate || new Date().toISOString(),
        endDate: schedule.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  private mapInternalClassStatusToTimeBack(status: string): TimeBackClass['status'] {
    const statusMapping: Record<string, TimeBackClass['status']> = {
      'active': 'active',
      'archived': 'archived',
      'draft': 'draft',
    };

    return statusMapping[status] || 'active';
  }

  private mapEnrollmentRole(role: TimeBackEnrollment['role']): string {
    const roleMapping: Record<string, string> = {
      'student': 'student',
      'teacher': 'teacher',
      'ta': 'teaching_assistant',
      'observer': 'observer',
    };

    return roleMapping[role] || 'student';
  }

  private mapEnrollmentStatus(status: TimeBackEnrollment['status']): string {
    const statusMapping: Record<string, string> = {
      'active': 'active',
      'inactive': 'inactive',
      'pending': 'pending',
      'completed': 'completed',
      'dropped': 'dropped',
      'waitlisted': 'waitlisted',
    };

    return statusMapping[status] || 'active';
  }

  private mapEnrollmentGrades(grades: TimeBackEnrollment['grades'], transformationsApplied: string[]): Record<string, any> {
    transformationsApplied.push('enrollment_grades_mapping');
    
    return {
      current: grades.current ? {
        score: grades.current.score,
        letter: grades.current.letter,
        percentage: grades.current.percentage,
      } : null,
      final: grades.final ? {
        score: grades.final.score,
        letter: grades.final.letter,
        percentage: grades.final.percentage,
      } : null,
      categories: grades.categories || [],
    };
  }

  private mapInternalEnrollmentRoleToTimeBack(role: string): TimeBackEnrollment['role'] {
    const roleMapping: Record<string, TimeBackEnrollment['role']> = {
      'student': 'student',
      'teacher': 'teacher',
      'teaching_assistant': 'ta',
      'observer': 'observer',
    };

    return roleMapping[role] || 'student';
  }

  private mapInternalEnrollmentStatusToTimeBack(status: string): TimeBackEnrollment['status'] {
    const statusMapping: Record<string, TimeBackEnrollment['status']> = {
      'active': 'active',
      'inactive': 'inactive',
      'pending': 'pending',
      'completed': 'completed',
      'dropped': 'dropped',
      'waitlisted': 'waitlisted',
    };

    return statusMapping[status] || 'active';
  }

  private mapInternalGradesToTimeBack(grades: Record<string, any>, transformationsApplied: string[]): TimeBackEnrollment['grades'] {
    transformationsApplied.push('internal_grades_mapping');
    
    return {
      current: grades.current ? {
        score: grades.current.score,
        letter: grades.current.letter,
        percentage: grades.current.percentage,
      } : undefined,
      final: grades.final ? {
        score: grades.final.score,
        letter: grades.final.letter,
        percentage: grades.final.percentage,
      } : undefined,
      categories: grades.categories || [],
    };
  }

  private mapOrganizationType(type: TimeBackOrganization['type']): string {
    const typeMapping: Record<string, string> = {
      'school': 'school',
      'district': 'district',
      'institution': 'institution',
    };

    return typeMapping[type] || 'school';
  }

  private mapOrganizationSettings(settings: TimeBackOrganization['settings'], transformationsApplied: string[]): Record<string, any> {
    transformationsApplied.push('organization_settings_mapping');
    
    return {
      timezone: settings.timezone,
      academicYear: settings.academicYear,
      grading: settings.grading,
    };
  }

  private mapOrganizationContact(contact: TimeBackOrganization['contact'], transformationsApplied: string[]): Record<string, any> {
    transformationsApplied.push('organization_contact_mapping');
    
    return {
      phone: contact.phone,
      email: contact.email,
      website: contact.website,
    };
  }

  private mapOrganizationAddress(address: TimeBackOrganization['address'], transformationsApplied: string[]): Record<string, any> {
    transformationsApplied.push('organization_address_mapping');
    
    return {
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
    };
  }

  private mapOrganizationStatus(status: TimeBackOrganization['status']): string {
    const statusMapping: Record<string, string> = {
      'active': 'active',
      'inactive': 'inactive',
      'suspended': 'suspended',
    };

    return statusMapping[status] || 'active';
  }

  // ===================================================================
  // VALIDATION AND TRANSFORMATION METHODS
  // ===================================================================

  private async applyCustomTransformations(
    entityType: string,
    data: any,
    context: MappingContext,
    transformationsApplied: string[]
  ): Promise<void> {
    const schema = this.mappingSchemas.get(`${entityType}_${context.direction}`);
    if (!schema) return;

    for (const transformer of schema.customTransformers) {
      try {
        if (transformer.validate && !transformer.validate(data)) {
          continue;
        }

        data = transformer.apply(data, context);
        transformationsApplied.push(transformer.name);
      } catch (error) {
        this.logger.warn(`Custom transformer '${transformer.name}' failed: ${error.message}`);
      }
    }
  }

  private async validateMappedData(
    entityType: string,
    data: any,
    context: MappingContext
  ): Promise<MappingResult['errors']> {
    const errors: MappingResult['errors'] = [];
    const schema = this.mappingSchemas.get(`${entityType}_${context.direction}`);
    
    if (!schema) return errors;

    for (const rule of schema.validationRules) {
      try {
        const isValid = await this.validateField(data, rule);
        if (!isValid) {
          errors.push({
            field: rule.field,
            message: rule.message || `Validation failed for field ${rule.field}`,
            severity: rule.severity,
            code: `VALIDATION_${rule.rule.toUpperCase()}`,
          });
        }
      } catch (error) {
        errors.push({
          field: rule.field,
          message: `Validation error: ${error.message}`,
          severity: 'error',
          code: 'VALIDATION_ERROR',
        });
      }
    }

    return errors;
  }

  private async validateField(data: any, rule: ValidationRule): Promise<boolean> {
    const value = data[rule.field];

    switch (rule.rule) {
      case 'required':
        return value !== undefined && value !== null && value !== '';
      
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      
      case 'regex':
        return rule.params && new RegExp(rule.params).test(value);
      
      case 'length':
        return rule.params && typeof value === 'string' && 
               value.length >= rule.params.min && value.length <= rule.params.max;
      
      case 'range':
        return rule.params && typeof value === 'number' && 
               value >= rule.params.min && value <= rule.params.max;
      
      case 'custom':
        return rule.params && typeof rule.params === 'function' && rule.params(value);
      
      default:
        return true;
    }
  }

  // ===================================================================
  // CONFIGURATION AND INITIALIZATION
  // ===================================================================

  private loadMappingConfig(): DataMappingConfig {
    return {
      enabled: true,
      validation: {
        strict: false,
        requireAllFields: false,
        allowUnknownFields: true,
        customValidators: true,
      },
      transformation: {
        autoTypeConversion: true,
        dateTimeFormat: 'ISO8601',
        nullHandling: 'convert',
        stringTrimming: true,
      },
      relationships: {
        autoResolve: true,
        cascadeOperations: false,
        orphanHandling: 'ignore',
      },
      caching: {
        enabled: true,
        ttl: 300000, // 5 minutes
        invalidateOnChange: true,
      },
    };
  }

  private initializeMappingSchemas(): void {
    // Initialize default mapping schemas
    // This would typically be loaded from configuration or database
    
    const userSchema: EntityMappingSchema = {
      entityType: 'user',
      direction: 'bidirectional',
      fields: [], // Would be populated with field mapping rules
      relationships: [],
      customTransformers: [],
      validationRules: [
        {
          field: 'email',
          rule: 'required',
          message: 'Email is required',
          severity: 'error',
        },
        {
          field: 'email',
          rule: 'email',
          message: 'Invalid email format',
          severity: 'error',
        },
      ],
    };

    this.mappingSchemas.set('user_to_internal', userSchema);
    this.mappingSchemas.set('user_to_timeback', userSchema);
  }

  // ===================================================================
  // PUBLIC API METHODS
  // ===================================================================

  /**
   * Get mapping configuration
   */
  getMappingConfig(): DataMappingConfig {
    return { ...this.config };
  }

  /**
   * Update mapping configuration
   */
  updateMappingConfig(updates: Partial<DataMappingConfig>): void {
    Object.assign(this.config, updates);
  }

  /**
   * Get mapping schema for entity type
   */
  getMappingSchema(entityType: string, direction: string): EntityMappingSchema | undefined {
    return this.mappingSchemas.get(`${entityType}_${direction}`);
  }

  /**
   * Register custom transformer
   */
  registerCustomTransformer(
    entityType: string,
    direction: string,
    transformer: CustomTransformer
  ): void {
    const schemaKey = `${entityType}_${direction}`;
    const schema = this.mappingSchemas.get(schemaKey);
    
    if (schema) {
      schema.customTransformers.push(transformer);
    }
  }

  /**
   * Clear mapping cache
   */
  clearMappingCache(): void {
    this.transformCache.clear();
  }
}
