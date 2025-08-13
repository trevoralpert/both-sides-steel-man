/**
 * Task 2.3.4.1: MockRosterProvider Implementation
 * 
 * Complete mock implementation of the RosterProvider interface for testing and demo purposes.
 * This provider generates realistic educational data with proper relationships and constraints.
 * 
 * Features:
 * - Complete RosterProvider interface implementation
 * - Realistic mock data generation
 * - Configurable data scenarios
 * - Proper entity relationships
 * - Consistent data constraints
 * - Performance simulation
 */

import { Organization, Class, User, Enrollment, UserRole, OrganizationType, EnrollmentStatus } from '@prisma/client';
import {
  RosterProvider,
  SyncResult,
  SyncError,
  FetchOptions,
  ConnectionValidation,
  SyncMetadata
} from '../interfaces/roster-provider.interface';
import { MockDataGenerator, MockDataConfig, MockDataScenario } from '../testing/mock-data-generator';

/**
 * Configuration for MockRosterProvider
 */
export interface MockRosterProviderConfig {
  providerId: string;
  scenario: MockDataScenario;
  dataConfig: Partial<MockDataConfig>;
  
  // Simulation settings
  responseDelay?: {
    min: number;
    max: number;
  };
  
  failureRate?: number;  // 0.0 to 1.0 (0% to 100%)
  
  // Connection simulation
  connectionHealth?: {
    healthy: boolean;
    responseTime: number;
  };
  
  // Rate limiting simulation
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    currentCount?: number;
    resetTime?: Date;
  };
}

/**
 * Default configuration for the mock provider
 */
const DEFAULT_CONFIG: MockRosterProviderConfig = {
  providerId: 'mock-provider-v1',
  scenario: MockDataScenario.MEDIUM_SCHOOL,
  dataConfig: {},
  responseDelay: { min: 100, max: 500 },
  failureRate: 0.02, // 2% failure rate
  connectionHealth: { healthy: true, responseTime: 150 },
  rateLimits: {
    requestsPerMinute: 100,
    requestsPerHour: 5000,
    currentCount: 0,
    resetTime: new Date(Date.now() + 60000)
  }
};

/**
 * MockRosterProvider - Complete implementation of RosterProvider interface
 */
export class MockRosterProvider implements RosterProvider {
  public readonly providerName = 'Mock Educational System';
  public readonly providerVersion = '1.0.0';
  
  private readonly config: MockRosterProviderConfig;
  private readonly dataGenerator: MockDataGenerator;
  
  // Mock data storage
  private organizations: Organization[] = [];
  private users: User[] = [];
  private classes: Class[] = [];
  private enrollments: Enrollment[] = [];
  
  // Simulation state
  private requestCount = 0;
  private lastRequestTime = new Date();
  private syncHistory: Array<{ timestamp: Date; result: SyncResult }> = [];
  
  constructor(config: Partial<MockRosterProviderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataGenerator = new MockDataGenerator();
    this.initializeMockData();
  }

  // ================================================================
  // ORGANIZATION METHODS
  // ================================================================

  async getOrganizations(options?: FetchOptions): Promise<Organization[]> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    let result = [...this.organizations];
    
    // Apply filters if provided
    if (options?.filters) {
      result = this.applyOrganizationFilters(result, options.filters);
    }
    
    // Apply pagination
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || result.length;
      result = result.slice(offset, offset + limit);
    }
    
    return result;
  }

  async getOrganization(externalId: string): Promise<Organization | null> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    return this.organizations.find(org => org.id === externalId) || null;
  }

  async getOrganizationHierarchy(rootOrgId?: string): Promise<Organization[]> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    if (rootOrgId) {
      const rootOrg = await this.getOrganization(rootOrgId);
      if (!rootOrg) return [];
      return this.buildOrganizationHierarchy(rootOrg);
    }
    
    return this.organizations;
  }

  // ================================================================
  // CLASS METHODS
  // ================================================================

  async getClasses(organizationId?: string, options?: FetchOptions): Promise<Class[]> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    let result = [...this.classes];
    
    // Filter by organization if specified
    if (organizationId) {
      result = result.filter(cls => cls.organization_id === organizationId);
    }
    
    // Apply additional filters
    if (options?.filters) {
      result = this.applyClassFilters(result, options.filters);
    }
    
    // Apply pagination
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || result.length;
      result = result.slice(offset, offset + limit);
    }
    
    return result;
  }

  async getClass(externalId: string): Promise<Class | null> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    return this.classes.find(cls => cls.id === externalId) || null;
  }

  async getClassesByTeacher(teacherExternalId: string, options?: FetchOptions): Promise<Class[]> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    let result = this.classes.filter(cls => cls.teacher_id === teacherExternalId);
    
    // Apply filters and pagination
    if (options?.filters) {
      result = this.applyClassFilters(result, options.filters);
    }
    
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || result.length;
      result = result.slice(offset, offset + limit);
    }
    
    return result;
  }

  async getClassesByAcademicPeriod(
    academicYear: string, 
    term?: string, 
    options?: FetchOptions
  ): Promise<Class[]> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    let result = this.classes.filter(cls => cls.academic_year === academicYear);
    
    if (term) {
      result = result.filter(cls => cls.term === term);
    }
    
    // Apply additional filters and pagination
    if (options?.filters) {
      result = this.applyClassFilters(result, options.filters);
    }
    
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || result.length;
      result = result.slice(offset, offset + limit);
    }
    
    return result;
  }

  // ================================================================
  // USER METHODS
  // ================================================================

  async getUsers(organizationId?: string, options?: FetchOptions): Promise<User[]> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    let result = [...this.users];
    
    // Filter by organization if specified (via enrollments or class assignments)
    if (organizationId) {
      const orgClasses = this.classes.filter(cls => cls.organization_id === organizationId);
      const orgClassIds = orgClasses.map(cls => cls.id);
      const orgTeacherIds = orgClasses.map(cls => cls.teacher_id);
      const orgEnrollments = this.enrollments.filter(enr => orgClassIds.includes(enr.class_id));
      const orgStudentIds = orgEnrollments.map(enr => enr.user_id);
      const orgUserIds = [...new Set([...orgTeacherIds, ...orgStudentIds])];
      
      result = result.filter(user => orgUserIds.includes(user.id));
    }
    
    // Apply additional filters
    if (options?.filters) {
      result = this.applyUserFilters(result, options.filters);
    }
    
    // Apply pagination
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || result.length;
      result = result.slice(offset, offset + limit);
    }
    
    return result;
  }

  async getUser(externalId: string): Promise<User | null> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    return this.users.find(user => user.id === externalId) || null;
  }

  async getUsersByRole(
    role: 'STUDENT' | 'TEACHER' | 'ADMIN', 
    organizationId?: string, 
    options?: FetchOptions
  ): Promise<User[]> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    let result = this.users.filter(user => user.role === role);
    
    // Filter by organization if specified
    if (organizationId) {
      const orgUsers = await this.getUsers(organizationId, options);
      const orgUserIds = orgUsers.map(user => user.id);
      result = result.filter(user => orgUserIds.includes(user.id));
    }
    
    // Apply additional filters and pagination
    if (options?.filters) {
      result = this.applyUserFilters(result, options.filters);
    }
    
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || result.length;
      result = result.slice(offset, offset + limit);
    }
    
    return result;
  }

  async searchUsers(
    searchTerm: string, 
    organizationId?: string, 
    options?: FetchOptions
  ): Promise<User[]> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    let result = this.users.filter(user => 
      (user.first_name?.toLowerCase().includes(lowerSearchTerm)) ||
      (user.last_name?.toLowerCase().includes(lowerSearchTerm)) ||
      (user.email.toLowerCase().includes(lowerSearchTerm)) ||
      (user.username?.toLowerCase().includes(lowerSearchTerm))
    );
    
    // Filter by organization if specified
    if (organizationId) {
      const orgUsers = await this.getUsers(organizationId);
      const orgUserIds = orgUsers.map(user => user.id);
      result = result.filter(user => orgUserIds.includes(user.id));
    }
    
    // Apply pagination
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || result.length;
      result = result.slice(offset, offset + limit);
    }
    
    return result;
  }

  // ================================================================
  // ENROLLMENT METHODS
  // ================================================================

  async getEnrollments(classExternalId: string, options?: FetchOptions): Promise<Enrollment[]> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    let result = this.enrollments.filter(enr => enr.class_id === classExternalId);
    
    // Apply filters
    if (options?.filters) {
      result = this.applyEnrollmentFilters(result, options.filters);
    }
    
    // Apply pagination
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || result.length;
      result = result.slice(offset, offset + limit);
    }
    
    return result;
  }

  async getStudentEnrollments(studentExternalId: string, options?: FetchOptions): Promise<Enrollment[]> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    let result = this.enrollments.filter(enr => enr.user_id === studentExternalId);
    
    // Apply filters and pagination
    if (options?.filters) {
      result = this.applyEnrollmentFilters(result, options.filters);
    }
    
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || result.length;
      result = result.slice(offset, offset + limit);
    }
    
    return result;
  }

  async getEnrollmentStats(
    entityExternalId: string, 
    entityType: 'organization' | 'class'
  ): Promise<{
    totalStudents: number;
    activeEnrollments: number;
    pendingEnrollments: number;
    completedEnrollments: number;
    droppedEnrollments: number;
  }> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    let enrollments: Enrollment[];
    
    if (entityType === 'class') {
      enrollments = this.enrollments.filter(enr => enr.class_id === entityExternalId);
    } else { // organization
      const orgClasses = this.classes.filter(cls => cls.organization_id === entityExternalId);
      const orgClassIds = orgClasses.map(cls => cls.id);
      enrollments = this.enrollments.filter(enr => orgClassIds.includes(enr.class_id));
    }
    
    return {
      totalStudents: new Set(enrollments.map(enr => enr.user_id)).size,
      activeEnrollments: enrollments.filter(enr => enr.enrollment_status === EnrollmentStatus.ACTIVE).length,
      pendingEnrollments: enrollments.filter(enr => enr.enrollment_status === EnrollmentStatus.PENDING).length,
      completedEnrollments: enrollments.filter(enr => enr.enrollment_status === EnrollmentStatus.COMPLETED).length,
      droppedEnrollments: enrollments.filter(enr => enr.enrollment_status === EnrollmentStatus.DROPPED).length,
    };
  }

  // ================================================================
  // SYNCHRONIZATION METHODS
  // ================================================================

  async syncData(options?: {
    lastSync?: Date;
    entityTypes?: string[];
    organizationFilter?: string;
    dryRun?: boolean;
  }): Promise<SyncResult> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    const startTime = new Date();
    const errors: SyncError[] = [];
    
    // Simulate occasional sync errors
    if (Math.random() < this.config.failureRate!) {
      errors.push({
        code: 'MOCK_SYNC_ERROR',
        message: 'Simulated sync error for testing',
        entityType: 'organization',
        entityId: 'mock-org-1'
      });
    }
    
    // Calculate records processed
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;
    
    const entityTypes = options?.entityTypes || ['organization', 'user', 'class', 'enrollment'];
    
    if (entityTypes.includes('organization')) {
      recordsProcessed += this.organizations.length;
      recordsUpdated += this.organizations.length;
    }
    
    if (entityTypes.includes('user')) {
      recordsProcessed += this.users.length;
      recordsUpdated += this.users.length;
    }
    
    if (entityTypes.includes('class')) {
      recordsProcessed += this.classes.length;
      recordsUpdated += this.classes.length;
    }
    
    if (entityTypes.includes('enrollment')) {
      recordsProcessed += this.enrollments.length;
      recordsUpdated += this.enrollments.length;
    }
    
    const result: SyncResult = {
      success: errors.length === 0,
      message: errors.length === 0 ? 'Mock sync completed successfully' : `Mock sync completed with ${errors.length} errors`,
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
      recordsSkipped,
      errors,
      lastSyncTimestamp: startTime,
      nextSyncRecommended: new Date(startTime.getTime() + 3600000) // 1 hour from now
    };
    
    // Store sync history
    this.syncHistory.push({ timestamp: startTime, result });
    
    return result;
  }

  async syncIncremental(lastSyncTime: Date, options?: FetchOptions): Promise<SyncResult> {
    await this.simulateDelay();
    this.checkRateLimit();
    
    // For mock purposes, simulate incremental sync with fewer records
    const fullSyncResult = await this.syncData({
      lastSync: lastSyncTime,
      entityTypes: options?.filters?.entityTypes as string[]
    });
    
    // Reduce numbers to simulate incremental
    return {
      ...fullSyncResult,
      recordsProcessed: Math.floor(fullSyncResult.recordsProcessed * 0.1),
      recordsCreated: Math.floor(fullSyncResult.recordsCreated * 0.1),
      recordsUpdated: Math.floor(fullSyncResult.recordsUpdated * 0.1),
      message: 'Mock incremental sync completed'
    };
  }

  async getSyncMetadata(): Promise<SyncMetadata> {
    await this.simulateDelay();
    
    return {
      lastFullSync: this.syncHistory.length > 0 
        ? this.syncHistory[this.syncHistory.length - 1].timestamp 
        : undefined,
      lastIncrementalSync: new Date(Date.now() - 1800000), // 30 minutes ago
      totalRecords: this.organizations.length + this.users.length + this.classes.length + this.enrollments.length,
      syncFrequency: '1 hour',
      averageSyncDuration: 45000, // 45 seconds
      errorRate: this.config.failureRate! * 100
    };
  }

  // ================================================================
  // CONNECTION & HEALTH METHODS
  // ================================================================

  async validateConnection(includeCapabilityTest?: boolean): Promise<ConnectionValidation> {
    await this.simulateDelay();
    
    const isHealthy = this.config.connectionHealth!.healthy;
    
    return {
      isValid: isHealthy,
      message: isHealthy ? 'Mock connection is healthy' : 'Mock connection is experiencing issues',
      providerInfo: {
        name: this.providerName,
        version: this.providerVersion,
        capabilities: [
          'organizations',
          'users', 
          'classes',
          'enrollments',
          'search',
          'sync',
          'health_check'
        ]
      },
      lastConnectionTest: new Date()
    };
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    message: string;
    timestamp: Date;
  }> {
    const startTime = Date.now();
    await this.simulateDelay();
    const responseTime = Date.now() - startTime;
    
    const healthy = this.config.connectionHealth!.healthy;
    
    return {
      healthy,
      responseTime,
      message: healthy ? 'Mock provider is healthy' : 'Mock provider is experiencing issues',
      timestamp: new Date()
    };
  }

  getCapabilities(): {
    supportsIncremental: boolean;
    supportsRealtime: boolean;
    supportsWebhooks: boolean;
    maxBatchSize: number;
    rateLimits: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    supportedEntityTypes: string[];
  } {
    return {
      supportsIncremental: true,
      supportsRealtime: false,
      supportsWebhooks: false,
      maxBatchSize: 1000,
      rateLimits: {
        requestsPerMinute: this.config.rateLimits!.requestsPerMinute,
        requestsPerHour: this.config.rateLimits!.requestsPerHour
      },
      supportedEntityTypes: ['organization', 'user', 'class', 'enrollment']
    };
  }

  // ================================================================
  // CLEANUP & MAINTENANCE METHODS
  // ================================================================

  async cleanup(): Promise<void> {
    // Reset any temporary state
    this.requestCount = 0;
    this.lastRequestTime = new Date();
  }

  async reset(): Promise<void> {
    // Reset all data to initial state
    this.organizations = [];
    this.users = [];
    this.classes = [];
    this.enrollments = [];
    this.syncHistory = [];
    
    // Regenerate mock data
    this.initializeMockData();
  }

  // ================================================================
  // PRIVATE HELPER METHODS
  // ================================================================

  private initializeMockData(): void {
    const data = this.dataGenerator.generateScenarioData(this.config.scenario, this.config.dataConfig);
    
    this.organizations = data.organizations;
    this.users = data.users;
    this.classes = data.classes;
    this.enrollments = data.enrollments;
    
    console.log(`🎭 Mock data initialized:`, {
      organizations: this.organizations.length,
      users: this.users.length,
      classes: this.classes.length,
      enrollments: this.enrollments.length,
      scenario: this.config.scenario
    });
  }

  private async simulateDelay(): Promise<void> {
    if (this.config.responseDelay) {
      const delay = Math.random() * (this.config.responseDelay.max - this.config.responseDelay.min) + this.config.responseDelay.min;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private checkRateLimit(): void {
    const now = new Date();
    
    if (!this.config.rateLimits!.resetTime || now > this.config.rateLimits!.resetTime) {
      this.config.rateLimits!.currentCount = 0;
      this.config.rateLimits!.resetTime = new Date(now.getTime() + 60000); // Reset every minute
    }
    
    this.config.rateLimits!.currentCount = (this.config.rateLimits!.currentCount || 0) + 1;
    
    if (this.config.rateLimits!.currentCount > this.config.rateLimits!.requestsPerMinute) {
      throw new Error(`Rate limit exceeded: ${this.config.rateLimits!.requestsPerMinute} requests per minute`);
    }
  }

  private buildOrganizationHierarchy(rootOrg: Organization): Organization[] {
    const result = [rootOrg];
    const children = this.organizations.filter(org => org.parent_id === rootOrg.id);
    
    for (const child of children) {
      result.push(...this.buildOrganizationHierarchy(child));
    }
    
    return result;
  }

  private applyOrganizationFilters(orgs: Organization[], filters: Record<string, any>): Organization[] {
    let result = orgs;
    
    if (filters.type) {
      result = result.filter(org => org.type === filters.type);
    }
    
    if (filters.is_active !== undefined) {
      result = result.filter(org => org.is_active === filters.is_active);
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(org => org.name.toLowerCase().includes(searchTerm));
    }
    
    return result;
  }

  private applyUserFilters(users: User[], filters: Record<string, any>): User[] {
    let result = users;
    
    if (filters.role) {
      result = result.filter(user => user.role === filters.role);
    }
    
    if (filters.is_active !== undefined) {
      result = result.filter(user => user.is_active === filters.is_active);
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(user =>
        user.first_name?.toLowerCase().includes(searchTerm) ||
        user.last_name?.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }
    
    return result;
  }

  private applyClassFilters(classes: Class[], filters: Record<string, any>): Class[] {
    let result = classes;
    
    if (filters.academic_year) {
      result = result.filter(cls => cls.academic_year === filters.academic_year);
    }
    
    if (filters.subject) {
      result = result.filter(cls => cls.subject === filters.subject);
    }
    
    if (filters.is_active !== undefined) {
      result = result.filter(cls => cls.is_active === filters.is_active);
    }
    
    return result;
  }

  private applyEnrollmentFilters(enrollments: Enrollment[], filters: Record<string, any>): Enrollment[] {
    let result = enrollments;
    
    if (filters.enrollment_status) {
      result = result.filter(enr => enr.enrollment_status === filters.enrollment_status);
    }
    
    return result;
  }
}
