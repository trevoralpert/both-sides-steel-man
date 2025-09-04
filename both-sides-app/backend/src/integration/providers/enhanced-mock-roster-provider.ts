/**
 * Phase 9 Task 9.1.3: Enhanced MockRosterProvider Implementation
 * 
 * This is an enhanced version of the MockRosterProvider that implements the new
 * IRosterProvider interface with full integration capabilities including sync,
 * authentication, external ID mapping, and comprehensive metadata tracking.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Organization, Class, User, Enrollment, UserRole, OrganizationType, EnrollmentStatus } from '@prisma/client';
import { 
  IRosterProvider,
  IExternalSystemProvider,
  IDataSyncProvider,
  IAuthenticationProvider,
  IntegrationHealth,
  IntegrationStatus,
  ExternalSystemMetadata,
  SyncContext,
  SyncOperationResult
} from '../interfaces/core-integration.interface';
import { MockDataGenerator, MockDataConfig, MockDataScenario } from '../../roster/testing/mock-data-generator';

/**
 * Enhanced configuration for the MockRosterProvider with integration capabilities
 */
export interface EnhancedMockRosterProviderConfig {
  // Base provider configuration
  providerId: string;
  providerName: string;
  providerVersion: string;
  environment: 'sandbox' | 'production' | 'staging';
  
  // Mock data configuration
  scenario: MockDataScenario;
  dataConfig: Partial<MockDataConfig>;
  
  // Integration simulation settings
  responseDelay?: { min: number; max: number; };
  failureRate?: number;
  connectionHealth?: { healthy: boolean; responseTime: number; };
  
  // Rate limiting simulation
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit?: number;
  };
  
  // Sync simulation
  syncConfig?: {
    enableRealTime: boolean;
    enableWebhooks: boolean;
    enableIncremental: boolean;
    conflictRate: number; // Rate of conflicts to simulate
    batchSize: number;
  };
  
  // Authentication simulation
  authConfig?: {
    authType: 'oauth2' | 'api-key' | 'basic' | 'jwt' | 'custom';
    tokenExpiry: number; // seconds
    requiresRefresh: boolean;
  };
}

/**
 * Enhanced MockRosterProvider with full integration capabilities
 */
@Injectable()
export class EnhancedMockRosterProvider implements IRosterProvider {
  private readonly logger = new Logger(EnhancedMockRosterProvider.name);
  
  // Provider identification
  public readonly providerId: string;
  public readonly providerName: string;
  public readonly providerVersion: string;
  public readonly configuration: Record<string, any>;
  public readonly authType: 'oauth2' | 'api-key' | 'basic' | 'jwt' | 'custom';

  // Mock data storage
  private organizations: Array<Organization & { metadata: ExternalSystemMetadata }> = [];
  private users: Array<User & { metadata: ExternalSystemMetadata }> = [];
  private classes: Array<Class & { metadata: ExternalSystemMetadata }> = [];
  private enrollments: Array<Enrollment & { metadata: ExternalSystemMetadata }> = [];
  
  // ID mapping storage
  private externalToInternalMap = new Map<string, Map<string, string>>(); // entityType -> (externalId -> internalId)
  private internalToExternalMap = new Map<string, Map<string, string>>(); // entityType -> (internalId -> externalId)
  
  // Authentication simulation
  private authToken: string | null = null;
  private authExpiry: Date | null = null;
  private refreshToken: string | null = null;
  
  // Health tracking
  private lastHealthCheck: Date = new Date();
  private connectionStatus: IntegrationStatus = IntegrationStatus.INACTIVE;
  private errorCount: number = 0;
  private totalRequests: number = 0;
  
  // Sync tracking
  private lastFullSync: Date | null = null;
  private lastIncrementalSync: Date | null = null;
  private syncHistory: Array<{ timestamp: Date; result: any }> = [];
  
  constructor(
    private config: EnhancedMockRosterProviderConfig,
    private dataGenerator: MockDataGenerator
  ) {
    this.providerId = config.providerId;
    this.providerName = config.providerName;
    this.providerVersion = config.providerVersion;
    this.configuration = config;
    this.authType = config.authConfig?.authType || 'oauth2';
    
    this.logger.log(`Enhanced MockRosterProvider initialized: ${this.providerId}`);
  }

  // ================================================================
  // BASE INTEGRATION PROVIDER METHODS
  // ================================================================

  async initialize(config: Record<string, any>): Promise<void> {
    this.logger.log('Initializing Enhanced MockRosterProvider');
    
    // Merge configuration
    Object.assign(this.configuration, config);
    
    // Generate mock data
    await this.generateMockDataWithMetadata();
    
    // Set connection status
    this.connectionStatus = IntegrationStatus.ACTIVE;
    this.lastHealthCheck = new Date();
    
    this.logger.log(`Provider initialized with ${this.organizations.length} orgs, ${this.users.length} users, ${this.classes.length} classes, ${this.enrollments.length} enrollments`);
  }

  async testConnection(): Promise<IntegrationHealth> {
    const startTime = Date.now();
    
    // Simulate network delay
    await this.simulateDelay();
    
    const responseTime = Date.now() - startTime;
    const isHealthy = Math.random() > (this.config.failureRate || 0.02);
    
    if (isHealthy) {
      this.connectionStatus = IntegrationStatus.ACTIVE;
      this.errorCount = 0;
    } else {
      this.connectionStatus = IntegrationStatus.ERROR;
      this.errorCount++;
    }
    
    this.lastHealthCheck = new Date();
    
    return {
      status: this.connectionStatus,
      responseTime,
      lastCheck: this.lastHealthCheck,
      errorMessage: isHealthy ? undefined : 'Simulated connection error',
      capabilities: this.getCapabilities().supportedEntityTypes,
      metadata: {
        totalRequests: this.totalRequests,
        errorCount: this.errorCount,
        lastSync: this.lastFullSync,
        environment: this.config.environment
      }
    };
  }

  async getHealthStatus(): Promise<IntegrationHealth> {
    return this.testConnection(); // In mock, these are the same
  }

  getCapabilities() {
    return {
      supportsRealTime: this.config.syncConfig?.enableRealTime || false,
      supportsWebhooks: this.config.syncConfig?.enableWebhooks || false,
      supportsIncremental: this.config.syncConfig?.enableIncremental || true,
      supportedEntityTypes: ['organization', 'user', 'class', 'enrollment'],
      rateLimits: {
        requestsPerMinute: this.config.rateLimits?.requestsPerMinute || 60,
        requestsPerHour: this.config.rateLimits?.requestsPerHour || 3600,
        burstLimit: this.config.rateLimits?.burstLimit || 10
      },
      authentication: {
        methods: [this.authType],
        requiresRefresh: this.config.authConfig?.requiresRefresh || true
      }
    };
  }

  async cleanup(): Promise<void> {
    this.logger.log('Cleaning up Enhanced MockRosterProvider');
    
    // Clear authentication
    this.authToken = null;
    this.authExpiry = null;
    this.refreshToken = null;
    
    // Update connection status
    this.connectionStatus = IntegrationStatus.INACTIVE;
    
    this.logger.log('Provider cleanup completed');
  }

  // ================================================================
  // AUTHENTICATION PROVIDER METHODS
  // ================================================================

  async authenticate(credentials: Record<string, any>): Promise<{
    success: boolean;
    token?: string;
    refreshToken?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    await this.simulateDelay();
    this.totalRequests++;
    
    // Simulate authentication based on auth type
    const isSuccess = Math.random() > 0.05; // 95% success rate
    
    if (isSuccess) {
      const expirySeconds = this.config.authConfig?.tokenExpiry || 3600;
      const expiresAt = new Date(Date.now() + (expirySeconds * 1000));
      
      this.authToken = this.generateMockToken();
      this.authExpiry = expiresAt;
      this.refreshToken = this.config.authConfig?.requiresRefresh ? this.generateMockToken() : undefined;
      
      return {
        success: true,
        token: this.authToken,
        refreshToken: this.refreshToken,
        expiresAt
      };
    } else {
      return {
        success: false,
        error: 'Simulated authentication failure'
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    token?: string;
    refreshToken?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    await this.simulateDelay();
    this.totalRequests++;
    
    if (refreshToken !== this.refreshToken) {
      return {
        success: false,
        error: 'Invalid refresh token'
      };
    }
    
    // Generate new tokens
    const expirySeconds = this.config.authConfig?.tokenExpiry || 3600;
    const expiresAt = new Date(Date.now() + (expirySeconds * 1000));
    
    this.authToken = this.generateMockToken();
    this.authExpiry = expiresAt;
    this.refreshToken = this.generateMockToken();
    
    return {
      success: true,
      token: this.authToken,
      refreshToken: this.refreshToken,
      expiresAt
    };
  }

  async validateAuthentication(token: string): Promise<{
    valid: boolean;
    expiresAt?: Date;
    userInfo?: Record<string, any>;
  }> {
    await this.simulateDelay();
    this.totalRequests++;
    
    const isValid = token === this.authToken && 
                   this.authExpiry && 
                   this.authExpiry > new Date();
    
    return {
      valid: isValid,
      expiresAt: this.authExpiry || undefined,
      userInfo: isValid ? { provider: this.providerId, authenticated: true } : undefined
    };
  }

  async revokeAuthentication(token: string): Promise<{ success: boolean }> {
    await this.simulateDelay();
    this.totalRequests++;
    
    if (token === this.authToken) {
      this.authToken = null;
      this.authExpiry = null;
      this.refreshToken = null;
      return { success: true };
    }
    
    return { success: false };
  }

  // ================================================================
  // DATA SYNC PROVIDER METHODS
  // ================================================================

  async performFullSync(context: SyncContext): Promise<{
    success: boolean;
    results: SyncOperationResult[];
    summary: {
      totalProcessed: number;
      created: number;
      updated: number;
      deleted: number;
      skipped: number;
      errors: number;
    };
  }> {
    this.logger.log(`Performing full sync for context: ${context.syncId}`);
    
    await this.simulateDelay();
    this.totalRequests++;
    
    const results: SyncOperationResult[] = [];
    const summary = { totalProcessed: 0, created: 0, updated: 0, deleted: 0, skipped: 0, errors: 0 };
    
    // Simulate syncing all entity types
    for (const entityType of ['organization', 'user', 'class', 'enrollment']) {
      const entityResults = await this.syncEntityType(entityType, context);
      results.push(...entityResults);
      
      // Update summary
      entityResults.forEach(result => {
        summary.totalProcessed++;
        summary[result.operation]++;
        if (result.error) summary.errors++;
      });
    }
    
    this.lastFullSync = new Date();
    this.syncHistory.push({ timestamp: this.lastFullSync, result: { type: 'full', summary, results } });
    
    const success = summary.errors < summary.totalProcessed * 0.1; // Success if <10% errors
    
    return { success, results, summary };
  }

  async performIncrementalSync(context: SyncContext, lastSyncTime: Date): Promise<{
    success: boolean;
    results: SyncOperationResult[];
    summary: {
      totalProcessed: number;
      created: number;
      updated: number;
      deleted: number;
      skipped: number;
      errors: number;
    };
  }> {
    this.logger.log(`Performing incremental sync since: ${lastSyncTime.toISOString()}`);
    
    await this.simulateDelay();
    this.totalRequests++;
    
    const results: SyncOperationResult[] = [];
    const summary = { totalProcessed: 0, created: 0, updated: 0, deleted: 0, skipped: 0, errors: 0 };
    
    // Simulate incremental changes (much smaller dataset)
    const changeCount = Math.floor(Math.random() * 10) + 1; // 1-10 changes
    
    for (let i = 0; i < changeCount; i++) {
      const entityType = ['organization', 'user', 'class', 'enrollment'][Math.floor(Math.random() * 4)];
      const operation = ['create', 'update', 'skip'][Math.floor(Math.random() * 3)] as 'create' | 'update' | 'delete' | 'skip';
      
      const result: SyncOperationResult = {
        success: Math.random() > 0.05, // 95% success rate
        entityType,
        operation,
        externalId: `ext_${entityType}_${Date.now()}_${i}`,
        internalId: `int_${entityType}_${Date.now()}_${i}`,
        error: Math.random() < 0.05 ? 'Simulated sync error' : undefined,
        metadata: { syncContext: context.syncId, incremental: true }
      };
      
      results.push(result);
      summary.totalProcessed++;
      summary[result.operation]++;
      if (result.error) summary.errors++;
    }
    
    this.lastIncrementalSync = new Date();
    this.syncHistory.push({ timestamp: this.lastIncrementalSync, result: { type: 'incremental', summary, results } });
    
    const success = summary.errors < summary.totalProcessed * 0.1;
    
    return { success, results, summary };
  }

  async syncEntity(entityType: string, externalId: string, context: SyncContext): Promise<SyncOperationResult> {
    await this.simulateDelay();
    this.totalRequests++;
    
    const success = Math.random() > 0.05; // 95% success rate
    const operation = Math.random() > 0.5 ? 'update' : 'create';
    
    return {
      success,
      entityType,
      operation: operation as 'create' | 'update' | 'delete' | 'skip',
      externalId,
      internalId: success ? `int_${entityType}_${Date.now()}` : undefined,
      error: success ? undefined : 'Simulated entity sync error',
      metadata: { syncContext: context.syncId, individual: true }
    };
  }

  async getSyncMetadata(): Promise<{
    lastFullSync?: Date;
    lastIncrementalSync?: Date;
    totalRecords: number;
    syncFrequency: string;
    averageSyncDuration: number;
    errorRate: number;
    supportedOperations: string[];
  }> {
    const totalRecords = this.organizations.length + this.users.length + this.classes.length + this.enrollments.length;
    
    return {
      lastFullSync: this.lastFullSync || undefined,
      lastIncrementalSync: this.lastIncrementalSync || undefined,
      totalRecords,
      syncFrequency: '15m', // Every 15 minutes
      averageSyncDuration: 5000, // 5 seconds
      errorRate: this.errorCount / Math.max(this.totalRequests, 1),
      supportedOperations: ['create', 'update', 'delete', 'sync']
    };
  }

  async detectConflicts(entityType: string, externalId?: string): Promise<{
    conflicts: Array<{
      entityType: string;
      entityId: string;
      externalData: Record<string, any>;
      internalData: Record<string, any>;
      conflictFields: string[];
      lastModified: { external: Date; internal: Date; };
    }>;
  }> {
    await this.simulateDelay();
    this.totalRequests++;
    
    const conflicts = [];
    const conflictRate = this.config.syncConfig?.conflictRate || 0.1;
    
    if (Math.random() < conflictRate) {
      // Simulate a conflict
      const now = new Date();
      conflicts.push({
        entityType: entityType || 'user',
        entityId: externalId || `ext_${entityType}_${Date.now()}`,
        externalData: { name: 'External Name', updated: now },
        internalData: { name: 'Internal Name', updated: new Date(now.getTime() - 60000) },
        conflictFields: ['name'],
        lastModified: {
          external: now,
          internal: new Date(now.getTime() - 60000)
        }
      });
    }
    
    return { conflicts };
  }

  async resolveConflict(
    conflictId: string,
    strategy: 'external-wins' | 'internal-wins' | 'manual' | 'merge',
    manualData?: Record<string, any>
  ): Promise<SyncOperationResult> {
    await this.simulateDelay();
    this.totalRequests++;
    
    const success = Math.random() > 0.05; // 95% success rate
    
    return {
      success,
      entityType: 'user', // Simulated
      operation: 'update',
      externalId: `ext_conflict_${conflictId}`,
      internalId: success ? `int_conflict_${conflictId}` : undefined,
      error: success ? undefined : 'Failed to resolve conflict',
      metadata: { conflictId, strategy, manualData }
    };
  }

  // ================================================================
  // ROSTER PROVIDER METHODS WITH METADATA
  // ================================================================

  async getOrganizationsWithMetadata(options?: {
    includeInactive?: boolean;
    since?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Array<Organization & { metadata: ExternalSystemMetadata }>> {
    await this.simulateDelay();
    this.totalRequests++;
    
    let result = [...this.organizations];
    
    // Apply filters
    if (options?.since) {
      result = result.filter(org => org.metadata.lastSyncAt && org.metadata.lastSyncAt > options.since!);
    }
    
    if (!options?.includeInactive) {
      result = result.filter(org => org.is_active);
    }
    
    // Apply pagination
    if (options?.offset) {
      result = result.slice(options.offset);
    }
    
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }
    
    return result;
  }

  async getClassesWithMetadata(
    organizationId?: string,
    options?: {
      includeInactive?: boolean;
      since?: Date;
      academicYear?: string;
      term?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<Class & { metadata: ExternalSystemMetadata }>> {
    await this.simulateDelay();
    this.totalRequests++;
    
    let result = [...this.classes];
    
    // Apply filters
    if (organizationId) {
      result = result.filter(cls => cls.organization_id === organizationId);
    }
    
    if (options?.academicYear) {
      result = result.filter(cls => cls.academic_year === options.academicYear);
    }
    
    if (options?.term) {
      result = result.filter(cls => cls.term === options.term);
    }
    
    if (options?.since) {
      result = result.filter(cls => cls.metadata.lastSyncAt && cls.metadata.lastSyncAt > options.since!);
    }
    
    if (!options?.includeInactive) {
      result = result.filter(cls => cls.is_active);
    }
    
    // Apply pagination
    if (options?.offset) {
      result = result.slice(options.offset);
    }
    
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }
    
    return result;
  }

  async getUsersWithMetadata(
    organizationId?: string,
    options?: {
      role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
      includeInactive?: boolean;
      since?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<User & { metadata: ExternalSystemMetadata }>> {
    await this.simulateDelay();
    this.totalRequests++;
    
    let result = [...this.users];
    
    // Apply filters
    if (options?.role) {
      result = result.filter(user => user.role === options.role);
    }
    
    if (options?.since) {
      result = result.filter(user => user.metadata.lastSyncAt && user.metadata.lastSyncAt > options.since!);
    }
    
    if (!options?.includeInactive) {
      result = result.filter(user => user.is_active);
    }
    
    // Apply pagination
    if (options?.offset) {
      result = result.slice(options.offset);
    }
    
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }
    
    return result;
  }

  async getEnrollmentsWithMetadata(
    classId?: string,
    options?: {
      status?: string;
      since?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<Enrollment & { metadata: ExternalSystemMetadata }>> {
    await this.simulateDelay();
    this.totalRequests++;
    
    let result = [...this.enrollments];
    
    // Apply filters
    if (classId) {
      result = result.filter(enrollment => enrollment.class_id === classId);
    }
    
    if (options?.status) {
      result = result.filter(enrollment => enrollment.enrollment_status === options.status);
    }
    
    if (options?.since) {
      result = result.filter(enrollment => enrollment.metadata.lastSyncAt && enrollment.metadata.lastSyncAt > options.since!);
    }
    
    // Apply pagination
    if (options?.offset) {
      result = result.slice(options.offset);
    }
    
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }
    
    return result;
  }

  // ================================================================
  // ID MAPPING METHODS
  // ================================================================

  async mapExternalToInternal(entityType: string, externalId: string): Promise<string | null> {
    const typeMap = this.externalToInternalMap.get(entityType);
    return typeMap?.get(externalId) || null;
  }

  async mapInternalToExternal(entityType: string, internalId: string): Promise<string | null> {
    const typeMap = this.internalToExternalMap.get(entityType);
    return typeMap?.get(internalId) || null;
  }

  async createIdMapping(
    entityType: string,
    externalId: string,
    internalId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Create external -> internal mapping
    if (!this.externalToInternalMap.has(entityType)) {
      this.externalToInternalMap.set(entityType, new Map());
    }
    this.externalToInternalMap.get(entityType)!.set(externalId, internalId);
    
    // Create internal -> external mapping
    if (!this.internalToExternalMap.has(entityType)) {
      this.internalToExternalMap.set(entityType, new Map());
    }
    this.internalToExternalMap.get(entityType)!.set(internalId, externalId);
    
    this.logger.debug(`Created ID mapping: ${entityType} ${externalId} <-> ${internalId}`);
  }

  async removeIdMapping(entityType: string, externalId: string): Promise<void> {
    const typeMap = this.externalToInternalMap.get(entityType);
    const internalId = typeMap?.get(externalId);
    
    if (internalId) {
      typeMap?.delete(externalId);
      this.internalToExternalMap.get(entityType)?.delete(internalId);
      this.logger.debug(`Removed ID mapping: ${entityType} ${externalId}`);
    }
  }

  async bulkCreateIdMappings(mappings: Array<{
    entityType: string;
    externalId: string;
    internalId: string;
    metadata?: Record<string, any>;
  }>): Promise<void> {
    for (const mapping of mappings) {
      await this.createIdMapping(mapping.entityType, mapping.externalId, mapping.internalId, mapping.metadata);
    }
    
    this.logger.log(`Bulk created ${mappings.length} ID mappings`);
  }

  // ================================================================
  // PRIVATE HELPER METHODS
  // ================================================================

  private async generateMockDataWithMetadata(): Promise<void> {
    this.logger.log('Generating mock data with integration metadata');
    
    const baseData = this.dataGenerator.generateFullDataset(this.config.scenario, this.config.dataConfig);
    const now = new Date();
    
    // Add metadata to organizations
    this.organizations = baseData.organizations.map((org, index) => ({
      ...org,
      metadata: {
        externalId: `ext_org_${index + 1}`,
        externalSystemId: this.providerId,
        lastSyncAt: now,
        syncStatus: 'synced',
        syncVersion: 1
      }
    }));
    
    // Add metadata to users
    this.users = baseData.users.map((user, index) => ({
      ...user,
      metadata: {
        externalId: `ext_user_${index + 1}`,
        externalSystemId: this.providerId,
        lastSyncAt: now,
        syncStatus: 'synced',
        syncVersion: 1
      }
    }));
    
    // Add metadata to classes
    this.classes = baseData.classes.map((cls, index) => ({
      ...cls,
      metadata: {
        externalId: `ext_class_${index + 1}`,
        externalSystemId: this.providerId,
        lastSyncAt: now,
        syncStatus: 'synced',
        syncVersion: 1
      }
    }));
    
    // Add metadata to enrollments
    this.enrollments = baseData.enrollments.map((enrollment, index) => ({
      ...enrollment,
      metadata: {
        externalId: `ext_enrollment_${index + 1}`,
        externalSystemId: this.providerId,
        lastSyncAt: now,
        syncStatus: 'synced',
        syncVersion: 1
      }
    }));
    
    // Create ID mappings
    await this.createAllIdMappings();
    
    this.logger.log(`Generated mock data with metadata: ${this.organizations.length} orgs, ${this.users.length} users, ${this.classes.length} classes, ${this.enrollments.length} enrollments`);
  }

  private async createAllIdMappings(): Promise<void> {
    const mappings = [];
    
    // Organization mappings
    for (const org of this.organizations) {
      mappings.push({
        entityType: 'organization',
        externalId: org.metadata.externalId,
        internalId: org.id
      });
    }
    
    // User mappings
    for (const user of this.users) {
      mappings.push({
        entityType: 'user',
        externalId: user.metadata.externalId,
        internalId: user.id
      });
    }
    
    // Class mappings
    for (const cls of this.classes) {
      mappings.push({
        entityType: 'class',
        externalId: cls.metadata.externalId,
        internalId: cls.id
      });
    }
    
    // Enrollment mappings
    for (const enrollment of this.enrollments) {
      mappings.push({
        entityType: 'enrollment',
        externalId: enrollment.metadata.externalId,
        internalId: enrollment.id
      });
    }
    
    await this.bulkCreateIdMappings(mappings);
  }

  private async syncEntityType(entityType: string, context: SyncContext): Promise<SyncOperationResult[]> {
    const results: SyncOperationResult[] = [];
    const batchSize = this.config.syncConfig?.batchSize || 10;
    const entityCount = Math.floor(Math.random() * batchSize) + 1;
    
    for (let i = 0; i < entityCount; i++) {
      const operation = ['create', 'update', 'skip'][Math.floor(Math.random() * 3)] as 'create' | 'update' | 'delete' | 'skip';
      const success = Math.random() > 0.05; // 95% success rate
      
      results.push({
        success,
        entityType,
        operation,
        externalId: `ext_${entityType}_${Date.now()}_${i}`,
        internalId: success ? `int_${entityType}_${Date.now()}_${i}` : undefined,
        error: success ? undefined : `Simulated ${entityType} sync error`,
        metadata: { syncContext: context.syncId, batch: true }
      });
    }
    
    return results;
  }

  private async simulateDelay(): Promise<void> {
    const delay = this.config.responseDelay;
    if (delay) {
      const ms = Math.random() * (delay.max - delay.min) + delay.min;
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  private generateMockToken(): string {
    return `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
