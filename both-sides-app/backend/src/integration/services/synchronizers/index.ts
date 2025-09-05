/**
 * Integration Synchronizers Index
 * 
 * Central exports for all entity-specific synchronizers and related services.
 * This provides a convenient single import point for synchronizer services.
 */

// Base synchronizer and shared types
export { BaseSynchronizerService } from './base-synchronizer.service';
export type {
  SyncContext,
  SyncResult,
  EntitySyncOptions,
  ConflictData,
  SyncConflict,
  ValidationResult,
} from './base-synchronizer.service';

// Entity-specific synchronizers
export { UserSynchronizerService } from './user-synchronizer.service';
export type {
  ExternalUserData,
  InternalUserData,
} from './user-synchronizer.service';

export { ClassSynchronizerService } from './class-synchronizer.service';
export type {
  ExternalClassData,
  InternalClassData,
} from './class-synchronizer.service';

export { OrganizationSynchronizerService } from './organization-synchronizer.service';
export type {
  ExternalOrganizationData,
  InternalOrganizationData,
} from './organization-synchronizer.service';

export { EnrollmentSynchronizerService } from './enrollment-synchronizer.service';
export type {
  ExternalEnrollmentData,
  InternalEnrollmentData,
  EnrollmentBatchOperation,
} from './enrollment-synchronizer.service';

// Synchronizer factory and management
export { SynchronizerFactoryService } from './synchronizer-factory.service';
export type {
  EntityType,
  SynchronizerFactory,
  SynchronizerMetrics,
  SynchronizerHealthCheck,
} from './synchronizer-factory.service';

// Re-export commonly used enums from Prisma
export { UserRole, EnrollmentStatus, OrganizationType } from '@prisma/client';
