/**
 * Task 2.3.3.2: Data Transfer Objects for Roster Data
 * 
 * These DTOs define the structure for data coming from external roster management systems.
 * They include external ID mapping and are designed to be flexible enough to handle
 * data from various educational management systems while maintaining type safety.
 * 
 * Each DTO includes:
 * - External ID mapping for system integration
 * - Optional internal ID for data that's already been synced
 * - Metadata for tracking sync status and data integrity
 * - Validation-ready structure for incoming data processing
 */

import { IsString, IsEmail, IsBoolean, IsOptional, IsEnum, IsInt, IsDate, IsObject, IsArray, Min, Max, Length } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UserRole, OrganizationType, EnrollmentStatus, TimeBackSyncStatus } from '@prisma/client';

/**
 * Base DTO interface for all roster entities
 * Provides common fields for external system integration
 */
export interface BaseRosterDto {
  // Internal system ID (null for new records)
  internalId?: string;
  
  // External system ID (required for sync)
  externalId: string;
  
  // External system metadata
  externalSystemName?: string;
  externalSystemVersion?: string;
  
  // Sync metadata
  lastSyncedAt?: Date;
  syncStatus?: TimeBackSyncStatus;
  syncVersion?: number;
  
  // Data integrity
  checksum?: string;
  sourceHash?: string;
}

/**
 * Organization DTO for external roster system integration
 */
export class OrganizationRosterDto implements BaseRosterDto {
  @IsOptional()
  @IsString()
  internalId?: string;

  @IsString()
  @Length(1, 255)
  externalId: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 100)
  slug: string;

  @IsEnum(OrganizationType)
  type: OrganizationType;

  @IsOptional()
  @IsString()
  parentExternalId?: string;

  @IsOptional()
  @IsString()
  parentInternalId?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsBoolean()
  isActive: boolean = true;

  @IsOptional()
  @IsString()
  subscriptionPlan?: string = 'free';

  // External system metadata
  @IsOptional()
  @IsString()
  externalSystemName?: string;

  @IsOptional()
  @IsString()
  externalSystemVersion?: string;

  // Sync metadata
  @IsOptional()
  @Type(() => Date)
  lastSyncedAt?: Date;

  @IsOptional()
  @IsEnum(TimeBackSyncStatus)
  syncStatus?: TimeBackSyncStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  syncVersion?: number;

  // Data integrity
  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsString()
  sourceHash?: string;

  // Additional external system data
  @IsOptional()
  @IsObject()
  externalMetadata?: Record<string, any>;

  // Timestamps
  @IsOptional()
  @Type(() => Date)
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  updatedAt?: Date;
}

/**
 * User DTO for external roster system integration
 */
export class UserRosterDto implements BaseRosterDto {
  @IsOptional()
  @IsString()
  internalId?: string;

  @IsString()
  @Length(1, 255)
  externalId: string;

  // Clerk integration (optional for external systems)
  @IsOptional()
  @IsString()
  clerkId?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(3, 50)
  username?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsBoolean()
  isActive: boolean = true;

  @IsOptional()
  @Type(() => Date)
  lastLoginAt?: Date;

  // Organization associations (external IDs)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organizationExternalIds?: string[];

  // External system metadata
  @IsOptional()
  @IsString()
  externalSystemName?: string;

  @IsOptional()
  @IsString()
  externalSystemVersion?: string;

  // Sync metadata
  @IsOptional()
  @Type(() => Date)
  lastSyncedAt?: Date;

  @IsOptional()
  @IsEnum(TimeBackSyncStatus)
  syncStatus?: TimeBackSyncStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  syncVersion?: number;

  // Data integrity
  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsString()
  sourceHash?: string;

  // Additional external system data
  @IsOptional()
  @IsObject()
  externalMetadata?: Record<string, any>;

  // Profile completion data (for quick sync)
  @IsOptional()
  @IsBoolean()
  hasCompletedProfile?: boolean;

  // Timestamps
  @IsOptional()
  @Type(() => Date)
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  updatedAt?: Date;
}

/**
 * Class DTO for external roster system integration
 */
export class ClassRosterDto implements BaseRosterDto {
  @IsOptional()
  @IsString()
  internalId?: string;

  @IsString()
  @Length(1, 255)
  externalId: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  subject?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  gradeLevel?: string;

  @IsString()
  @Length(1, 20)
  academicYear: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  term?: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  maxStudents: number = 30;

  @IsBoolean()
  isActive: boolean = true;

  // External references
  @IsString()
  organizationExternalId: string;

  @IsOptional()
  @IsString()
  organizationInternalId?: string;

  @IsString()
  teacherExternalId: string;

  @IsOptional()
  @IsString()
  teacherInternalId?: string;

  // External system metadata
  @IsOptional()
  @IsString()
  externalSystemName?: string;

  @IsOptional()
  @IsString()
  externalSystemVersion?: string;

  // Sync metadata
  @IsOptional()
  @Type(() => Date)
  lastSyncedAt?: Date;

  @IsOptional()
  @IsEnum(TimeBackSyncStatus)
  syncStatus?: TimeBackSyncStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  syncVersion?: number;

  // Data integrity
  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsString()
  sourceHash?: string;

  // Class schedule and metadata (flexible JSON)
  @IsOptional()
  @IsObject()
  schedule?: {
    meetingTimes?: Array<{
      dayOfWeek: number; // 0-6 (Sunday-Saturday)
      startTime: string; // HH:mm format
      endTime: string;   // HH:mm format
      timezone?: string;
    }>;
    room?: string;
    building?: string;
    virtualMeetingUrl?: string;
  };

  // Additional external system data
  @IsOptional()
  @IsObject()
  externalMetadata?: Record<string, any>;

  // Quick stats (can be calculated on sync)
  @IsOptional()
  @IsInt()
  @Min(0)
  currentEnrollmentCount?: number;

  // Timestamps
  @IsOptional()
  @Type(() => Date)
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  updatedAt?: Date;
}

/**
 * Enrollment DTO for external roster system integration
 */
export class EnrollmentRosterDto implements BaseRosterDto {
  @IsOptional()
  @IsString()
  internalId?: string;

  @IsString()
  @Length(1, 255)
  externalId: string;

  @IsEnum(EnrollmentStatus)
  enrollmentStatus: EnrollmentStatus;

  @IsOptional()
  @Type(() => Date)
  enrolledAt?: Date;

  @IsOptional()
  @Type(() => Date)
  completedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  droppedAt?: Date;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  finalGrade?: string;

  // External references
  @IsString()
  userExternalId: string;

  @IsOptional()
  @IsString()
  userInternalId?: string;

  @IsString()
  classExternalId: string;

  @IsOptional()
  @IsString()
  classInternalId?: string;

  // External system metadata
  @IsOptional()
  @IsString()
  externalSystemName?: string;

  @IsOptional()
  @IsString()
  externalSystemVersion?: string;

  // Sync metadata
  @IsOptional()
  @Type(() => Date)
  lastSyncedAt?: Date;

  @IsOptional()
  @IsEnum(TimeBackSyncStatus)
  syncStatus?: TimeBackSyncStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  syncVersion?: number;

  // Data integrity
  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsString()
  sourceHash?: string;

  // Enrollment metadata
  @IsOptional()
  @IsObject()
  enrollmentMetadata?: {
    enrollmentMethod?: 'manual' | 'automatic' | 'bulk_import' | 'api';
    waitlistPosition?: number;
    priority?: number;
    notes?: string;
  };

  // Additional external system data
  @IsOptional()
  @IsObject()
  externalMetadata?: Record<string, any>;

  // Timestamps
  @IsOptional()
  @Type(() => Date)
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  updatedAt?: Date;
}

/**
 * Batch operation DTOs for bulk data processing
 */
export class BatchOrganizationDto {
  @IsArray()
  @Type(() => OrganizationRosterDto)
  organizations: OrganizationRosterDto[];

  @IsOptional()
  @IsObject()
  batchMetadata?: {
    batchId?: string;
    totalRecords: number;
    sourceSystem: string;
    processedAt: Date;
  };
}

export class BatchUserDto {
  @IsArray()
  @Type(() => UserRosterDto)
  users: UserRosterDto[];

  @IsOptional()
  @IsObject()
  batchMetadata?: {
    batchId?: string;
    totalRecords: number;
    sourceSystem: string;
    processedAt: Date;
  };
}

export class BatchClassDto {
  @IsArray()
  @Type(() => ClassRosterDto)
  classes: ClassRosterDto[];

  @IsOptional()
  @IsObject()
  batchMetadata?: {
    batchId?: string;
    totalRecords: number;
    sourceSystem: string;
    processedAt: Date;
  };
}

export class BatchEnrollmentDto {
  @IsArray()
  @Type(() => EnrollmentRosterDto)
  enrollments: EnrollmentRosterDto[];

  @IsOptional()
  @IsObject()
  batchMetadata?: {
    batchId?: string;
    totalRecords: number;
    sourceSystem: string;
    processedAt: Date;
  };
}

/**
 * Comprehensive batch DTO for full roster sync
 */
export class FullRosterSyncDto {
  @IsOptional()
  @Type(() => BatchOrganizationDto)
  organizations?: BatchOrganizationDto;

  @IsOptional()
  @Type(() => BatchUserDto)
  users?: BatchUserDto;

  @IsOptional()
  @Type(() => BatchClassDto)
  classes?: BatchClassDto;

  @IsOptional()
  @Type(() => BatchEnrollmentDto)
  enrollments?: BatchEnrollmentDto;

  @IsString()
  syncId: string;

  @Type(() => Date)
  syncTimestamp: Date;

  @IsString()
  sourceSystem: string;

  @IsOptional()
  @IsObject()
  syncOptions?: {
    dryRun?: boolean;
    overwriteExisting?: boolean;
    skipValidation?: boolean;
    batchSize?: number;
  };
}

/**
 * Sync response DTOs for operation results
 */
export interface EntitySyncResult {
  externalId: string;
  internalId?: string;
  operation: 'created' | 'updated' | 'skipped' | 'failed';
  message?: string;
  errors?: string[];
}

export class SyncResultDto {
  @IsBoolean()
  success: boolean;

  @IsString()
  message: string;

  @IsInt()
  @Min(0)
  recordsProcessed: number;

  @IsInt()
  @Min(0)
  recordsCreated: number;

  @IsInt()
  @Min(0)
  recordsUpdated: number;

  @IsInt()
  @Min(0)
  recordsSkipped: number;

  @IsOptional()
  @IsArray()
  errors?: string[];

  @Type(() => Date)
  syncStarted: Date;

  @Type(() => Date)
  syncCompleted: Date;

  @IsOptional()
  @IsObject()
  entityResults?: {
    organizations?: EntitySyncResult[];
    users?: EntitySyncResult[];
    classes?: EntitySyncResult[];
    enrollments?: EntitySyncResult[];
  };
}

/**
 * External system mapping utilities
 */
export interface ExternalIdMapping {
  externalId: string;
  internalId: string;
  entityType: 'organization' | 'user' | 'class' | 'enrollment';
  lastMapped: Date;
  mappingSource: string;
}

export class ExternalIdMappingDto {
  @IsString()
  externalId: string;

  @IsString()
  internalId: string;

  @IsEnum(['organization', 'user', 'class', 'enrollment'])
  entityType: 'organization' | 'user' | 'class' | 'enrollment';

  @Type(() => Date)
  lastMapped: Date;

  @IsString()
  mappingSource: string;

  @IsOptional()
  @IsObject()
  mappingMetadata?: Record<string, any>;
}
