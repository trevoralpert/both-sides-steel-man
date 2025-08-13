/**
 * Task 2.3.3.4: Data Validation and Mapping Utilities
 * 
 * This module provides comprehensive utilities for validating and mapping data
 * between external roster management systems and our internal data structures.
 * 
 * Features:
 * - Schema validation with detailed error reporting
 * - External ID to internal ID mapping with caching
 * - Data transformation and normalization
 * - Conflict detection and resolution strategies
 * - Data integrity verification with checksums
 * - Support for various external system formats
 */

import { validate, ValidationError } from 'class-validator';
import { plainToClass, Transform, Type } from 'class-transformer';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  OrganizationRosterDto, 
  UserRosterDto, 
  ClassRosterDto, 
  EnrollmentRosterDto,
  ExternalIdMapping 
} from '../dto/roster-data.dto';
import { 
  DataValidationError, 
  DataConflictError, 
  ResourceNotFoundError 
} from '../errors/roster-errors';
import { UserRole, OrganizationType, EnrollmentStatus } from '@prisma/client';

/**
 * Validation result with detailed error information
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: string[];
  metadata: {
    validatedAt: Date;
    schemaVersion: string;
    sourceSystem?: string;
  };
}

/**
 * Data mapping result with transformation details
 */
export interface MappingResult<TInput, TOutput> {
  success: boolean;
  input: TInput;
  output?: TOutput;
  errors: string[];
  warnings: string[];
  transformations: Array<{
    field: string;
    from: any;
    to: any;
    reason: string;
  }>;
  metadata: {
    mappedAt: Date;
    mappingStrategy: string;
    sourceFormat: string;
  };
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolutionStrategy {
  EXTERNAL_WINS = 'external_wins',     // External data overwrites internal
  INTERNAL_WINS = 'internal_wins',     // Keep internal data, ignore external
  MERGE_LATEST = 'merge_latest',       // Use latest timestamp to decide
  MERGE_SELECTIVE = 'merge_selective', // Merge non-conflicting fields
  MANUAL_REVIEW = 'manual_review'      // Flag for manual resolution
}

/**
 * Data conflict information
 */
export interface DataConflict {
  field: string;
  internalValue: any;
  externalValue: any;
  internalTimestamp?: Date;
  externalTimestamp?: Date;
  severity: 'low' | 'medium' | 'high';
  resolutionStrategy: ConflictResolutionStrategy;
  resolvedValue?: any;
}

/**
 * Main validation and mapping service
 */
export class RosterDataValidator {
  private readonly schemaVersion = '1.0.0';
  private idMappingCache: Map<string, string> = new Map();
  
  constructor(private readonly prisma?: PrismaService) {}

  /**
   * Validate organization data from external system
   */
  async validateOrganization(data: any, sourceSystem: string): Promise<ValidationResult<OrganizationRosterDto>> {
    return this.validateData(OrganizationRosterDto, data, sourceSystem);
  }

  /**
   * Validate user data from external system
   */
  async validateUser(data: any, sourceSystem: string): Promise<ValidationResult<UserRosterDto>> {
    return this.validateData(UserRosterDto, data, sourceSystem);
  }

  /**
   * Validate class data from external system
   */
  async validateClass(data: any, sourceSystem: string): Promise<ValidationResult<ClassRosterDto>> {
    return this.validateData(ClassRosterDto, data, sourceSystem);
  }

  /**
   * Validate enrollment data from external system
   */
  async validateEnrollment(data: any, sourceSystem: string): Promise<ValidationResult<EnrollmentRosterDto>> {
    return this.validateData(EnrollmentRosterDto, data, sourceSystem);
  }

  /**
   * Generic data validation method
   */
  private async validateData<T extends object>(
    DtoClass: new () => T,
    data: any,
    sourceSystem: string
  ): Promise<ValidationResult<T>> {
    const warnings: string[] = [];
    
    try {
      // Transform plain object to class instance
      const instance = plainToClass(DtoClass, data, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
        exposeDefaultValues: true
      });

      // Run class-validator validation
      const errors = await validate(instance as object, {
        whitelist: false,
        forbidNonWhitelisted: false,
        skipMissingProperties: false,
        validationError: { target: false, value: false }
      });

      // Check for extra/unknown fields
      const knownFields = Object.keys(instance);
      const inputFields = Object.keys(data);
      const unknownFields = inputFields.filter(field => !knownFields.includes(field));
      
      if (unknownFields.length > 0) {
        warnings.push(`Unknown fields detected: ${unknownFields.join(', ')}`);
      }

      // Apply additional business logic validation
      const businessErrors = await this.validateBusinessRules(instance, DtoClass.name);
      errors.push(...businessErrors);

      const result: ValidationResult<T> = {
        isValid: errors.length === 0,
        data: errors.length === 0 ? instance : undefined,
        errors,
        warnings,
        metadata: {
          validatedAt: new Date(),
          schemaVersion: this.schemaVersion,
          sourceSystem
        }
      };

      return result;
    } catch (error) {
      const validationError = new ValidationError();
      validationError.property = 'root';
      validationError.constraints = { 
        'validation_failed': `Validation failed: ${error.message}` 
      };

      return {
        isValid: false,
        errors: [validationError],
        warnings,
        metadata: {
          validatedAt: new Date(),
          schemaVersion: this.schemaVersion,
          sourceSystem
        }
      };
    }
  }

  /**
   * Apply business rules validation beyond basic schema validation
   */
  private async validateBusinessRules<T extends object>(
    instance: T,
    entityType: string
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    switch (entityType) {
      case 'OrganizationRosterDto':
        errors.push(...await this.validateOrganizationBusinessRules(instance as any));
        break;
      case 'UserRosterDto':
        errors.push(...await this.validateUserBusinessRules(instance as any));
        break;
      case 'ClassRosterDto':
        errors.push(...await this.validateClassBusinessRules(instance as any));
        break;
      case 'EnrollmentRosterDto':
        errors.push(...await this.validateEnrollmentBusinessRules(instance as any));
        break;
    }

    return errors;
  }

  /**
   * Organization-specific business rules
   */
  private async validateOrganizationBusinessRules(org: OrganizationRosterDto): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Validate organization hierarchy
    if (org.parentExternalId && org.externalId === org.parentExternalId) {
      const error = new ValidationError();
      error.property = 'parentExternalId';
      error.constraints = { 'circular_reference': 'Organization cannot be its own parent' };
      errors.push(error);
    }

    // Validate slug format
    if (org.slug && !/^[a-z0-9-]+$/.test(org.slug)) {
      const error = new ValidationError();
      error.property = 'slug';
      error.constraints = { 'invalid_format': 'Slug must contain only lowercase letters, numbers, and hyphens' };
      errors.push(error);
    }

    return errors;
  }

  /**
   * User-specific business rules
   */
  private async validateUserBusinessRules(user: UserRosterDto): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Validate email domain for teachers and admins
    if ((user.role === UserRole.TEACHER || user.role === UserRole.ADMIN)) {
      const emailDomain = user.email.split('@')[1];
      if (!emailDomain || emailDomain.includes('gmail.com') || emailDomain.includes('yahoo.com')) {
        const error = new ValidationError();
        error.property = 'email';
        error.constraints = { 
          'institutional_email_required': 'Teachers and admins should use institutional email addresses' 
        };
        errors.push(error);
      }
    }

    // Validate username format
    if (user.username && !/^[a-zA-Z0-9_-]{3,50}$/.test(user.username)) {
      const error = new ValidationError();
      error.property = 'username';
      error.constraints = { 
        'invalid_username': 'Username must be 3-50 characters and contain only letters, numbers, underscores, or hyphens' 
      };
      errors.push(error);
    }

    return errors;
  }

  /**
   * Class-specific business rules
   */
  private async validateClassBusinessRules(classData: ClassRosterDto): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Validate academic year format
    if (!/^\d{4}-\d{4}$/.test(classData.academicYear)) {
      const error = new ValidationError();
      error.property = 'academicYear';
      error.constraints = { 
        'invalid_academic_year': 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)' 
      };
      errors.push(error);
    }

    // Validate reasonable class size
    if (classData.maxStudents > 200) {
      const error = new ValidationError();
      error.property = 'maxStudents';
      error.constraints = { 
        'unreasonable_class_size': 'Class size over 200 students may indicate data error' 
      };
      errors.push(error);
    }

    return errors;
  }

  /**
   * Enrollment-specific business rules
   */
  private async validateEnrollmentBusinessRules(enrollment: EnrollmentRosterDto): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Validate date logic
    if (enrollment.completedAt && enrollment.droppedAt) {
      const error = new ValidationError();
      error.property = 'completedAt';
      error.constraints = { 
        'invalid_status_combination': 'Enrollment cannot be both completed and dropped' 
      };
      errors.push(error);
    }

    // Validate enrollment status consistency
    if (enrollment.enrollmentStatus === EnrollmentStatus.COMPLETED && !enrollment.completedAt) {
      const error = new ValidationError();
      error.property = 'completedAt';
      error.constraints = { 
        'missing_completion_date': 'Completed enrollments must have completion date' 
      };
      errors.push(error);
    }

    if (enrollment.enrollmentStatus === EnrollmentStatus.DROPPED && !enrollment.droppedAt) {
      const error = new ValidationError();
      error.property = 'droppedAt';
      error.constraints = { 
        'missing_drop_date': 'Dropped enrollments must have drop date' 
      };
      errors.push(error);
    }

    return errors;
  }
}

/**
 * External ID to Internal ID mapping service
 */
export class RosterIdMapper {
  private mappingCache: Map<string, ExternalIdMapping> = new Map();
  private readonly cacheExpireMs = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Map external organization ID to internal ID
   */
  async mapOrganizationId(externalId: string, sourceSystem: string): Promise<string | null> {
    return this.mapExternalId('organization', externalId, sourceSystem);
  }

  /**
   * Map external user ID to internal ID
   */
  async mapUserId(externalId: string, sourceSystem: string): Promise<string | null> {
    return this.mapExternalId('user', externalId, sourceSystem);
  }

  /**
   * Map external class ID to internal ID
   */
  async mapClassId(externalId: string, sourceSystem: string): Promise<string | null> {
    return this.mapExternalId('class', externalId, sourceSystem);
  }

  /**
   * Map external enrollment ID to internal ID
   */
  async mapEnrollmentId(externalId: string, sourceSystem: string): Promise<string | null> {
    return this.mapExternalId('enrollment', externalId, sourceSystem);
  }

  /**
   * Generic external ID mapping
   */
  private async mapExternalId(
    entityType: 'organization' | 'user' | 'class' | 'enrollment',
    externalId: string,
    sourceSystem: string
  ): Promise<string | null> {
    const cacheKey = `${entityType}:${externalId}:${sourceSystem}`;
    
    // Check cache first
    const cached = this.mappingCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.lastMapped)) {
      return cached.internalId;
    }

    // Query database based on entity type
    let internalId: string | null = null;

    try {
      switch (entityType) {
        case 'organization':
          const org = await this.prisma.organization.findFirst({
            where: { timeback_org_id: externalId },
            select: { id: true }
          });
          internalId = org?.id || null;
          break;

        case 'user':
          const user = await this.prisma.user.findFirst({
            where: { timeback_user_id: externalId },
            select: { id: true }
          });
          internalId = user?.id || null;
          break;

        case 'class':
          const classEntity = await this.prisma.class.findFirst({
            where: { timeback_class_id: externalId },
            select: { id: true }
          });
          internalId = classEntity?.id || null;
          break;

        case 'enrollment':
          // Enrollments don't have direct external IDs, would need composite key
          internalId = null;
          break;
      }

      // Cache the result
      if (internalId) {
        this.mappingCache.set(cacheKey, {
          externalId,
          internalId,
          entityType,
          lastMapped: new Date(),
          mappingSource: sourceSystem
        });
      }

      return internalId;
    } catch (error) {
      console.error(`Failed to map ${entityType} ID ${externalId}:`, error);
      return null;
    }
  }

  /**
   * Create new mapping between external and internal IDs
   */
  async createMapping(
    entityType: 'organization' | 'user' | 'class' | 'enrollment',
    externalId: string,
    internalId: string,
    sourceSystem: string
  ): Promise<void> {
    const cacheKey = `${entityType}:${externalId}:${sourceSystem}`;
    
    this.mappingCache.set(cacheKey, {
      externalId,
      internalId,
      entityType,
      lastMapped: new Date(),
      mappingSource: sourceSystem
    });

    // Also update the database entity with the external ID
    try {
      switch (entityType) {
        case 'organization':
          await this.prisma.organization.update({
            where: { id: internalId },
            data: { timeback_org_id: externalId }
          });
          break;

        case 'user':
          await this.prisma.user.update({
            where: { id: internalId },
            data: { timeback_user_id: externalId }
          });
          break;

        case 'class':
          await this.prisma.class.update({
            where: { id: internalId },
            data: { timeback_class_id: externalId }
          });
          break;
      }
    } catch (error) {
      console.error(`Failed to create mapping for ${entityType}:`, error);
    }
  }

  /**
   * Check if cached mapping is still valid
   */
  private isCacheValid(lastMapped: Date): boolean {
    return (Date.now() - lastMapped.getTime()) < this.cacheExpireMs;
  }

  /**
   * Clear all cached mappings
   */
  clearCache(): void {
    this.mappingCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; entries: string[] } {
    return {
      size: this.mappingCache.size,
      hitRate: 0, // Would need to track hits/misses for real calculation
      entries: Array.from(this.mappingCache.keys())
    };
  }
}

/**
 * Data transformation utilities
 */
export class RosterDataTransformer {
  /**
   * Normalize organization data from various external formats
   */
  static normalizeOrganization(data: any, sourceFormat: string): Partial<OrganizationRosterDto> {
    const normalized: Partial<OrganizationRosterDto> = {};

    switch (sourceFormat) {
      case 'google_classroom':
        normalized.externalId = data.courseId || data.id;
        normalized.name = data.name || data.courseName;
        normalized.type = OrganizationType.SCHOOL; // Default for Google Classroom
        normalized.isActive = data.courseState === 'ACTIVE';
        break;

      case 'canvas':
        normalized.externalId = data.id?.toString();
        normalized.name = data.name;
        normalized.type = OrganizationType.SCHOOL;
        normalized.isActive = data.workflow_state === 'available';
        break;

      case 'powerschool':
        normalized.externalId = data.school_id?.toString();
        normalized.name = data.school_name;
        normalized.type = data.school_type === 'district' ? OrganizationType.DISTRICT : OrganizationType.SCHOOL;
        normalized.isActive = data.active === 1;
        break;

      default:
        // Generic transformation
        normalized.externalId = data.id?.toString() || data.external_id;
        normalized.name = data.name || data.title;
        normalized.type = OrganizationType.SCHOOL;
        normalized.isActive = data.active !== false;
    }

    return normalized;
  }

  /**
   * Normalize user data from various external formats
   */
  static normalizeUser(data: any, sourceFormat: string): Partial<UserRosterDto> {
    const normalized: Partial<UserRosterDto> = {};

    switch (sourceFormat) {
      case 'google_classroom':
        normalized.externalId = data.userId || data.profile?.id;
        normalized.email = data.profile?.emailAddress;
        normalized.firstName = data.profile?.name?.givenName;
        normalized.lastName = data.profile?.name?.familyName;
        normalized.role = data.profile?.permissions?.includes('TEACHER') ? UserRole.TEACHER : UserRole.STUDENT;
        break;

      case 'canvas':
        normalized.externalId = data.id?.toString();
        normalized.email = data.email || data.login_id;
        normalized.firstName = data.first_name;
        normalized.lastName = data.last_name;
        normalized.role = data.enrollments?.[0]?.role === 'teacher' ? UserRole.TEACHER : UserRole.STUDENT;
        break;

      case 'powerschool':
        normalized.externalId = data.student_id?.toString() || data.teacher_id?.toString();
        normalized.email = data.email;
        normalized.firstName = data.first_name;
        normalized.lastName = data.last_name;
        normalized.role = data.teacher_id ? UserRole.TEACHER : UserRole.STUDENT;
        break;

      default:
        normalized.externalId = data.id?.toString() || data.external_id;
        normalized.email = data.email;
        normalized.firstName = data.first_name || data.firstName;
        normalized.lastName = data.last_name || data.lastName;
        normalized.role = data.role === 'teacher' ? UserRole.TEACHER : UserRole.STUDENT;
    }

    return normalized;
  }

  /**
   * Generate data checksum for integrity verification
   */
  static generateChecksum(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Detect and resolve data conflicts
   */
  static detectConflicts<T extends Record<string, any>>(
    internalData: T,
    externalData: T,
    sensitiveFields: string[] = []
  ): DataConflict[] {
    const conflicts: DataConflict[] = [];

    for (const field in externalData) {
      if (field in internalData && internalData[field] !== externalData[field]) {
        const severity = sensitiveFields.includes(field) ? 'high' : 'medium';
        
        conflicts.push({
          field,
          internalValue: internalData[field],
          externalValue: externalData[field],
          severity,
          resolutionStrategy: severity === 'high' 
            ? ConflictResolutionStrategy.MANUAL_REVIEW 
            : ConflictResolutionStrategy.EXTERNAL_WINS
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve data conflicts based on strategy
   */
  static resolveConflicts<T extends Record<string, any>>(
    internalData: T,
    externalData: T,
    conflicts: DataConflict[],
    defaultStrategy: ConflictResolutionStrategy = ConflictResolutionStrategy.EXTERNAL_WINS
  ): T {
    const resolved = { ...internalData };

    for (const conflict of conflicts) {
      const strategy = conflict.resolutionStrategy || defaultStrategy;
      
      switch (strategy) {
        case ConflictResolutionStrategy.EXTERNAL_WINS:
          resolved[conflict.field] = conflict.externalValue;
          break;
        case ConflictResolutionStrategy.INTERNAL_WINS:
          // Keep internal value (no change needed)
          break;
        case ConflictResolutionStrategy.MERGE_LATEST:
          // Would need timestamp comparison logic
          resolved[conflict.field] = conflict.externalValue;
          break;
        case ConflictResolutionStrategy.MANUAL_REVIEW:
          // Flag for manual review (could set special value or log)
          console.warn(`Manual review required for field: ${conflict.field}`);
          break;
      }
    }

    return resolved;
  }
}
