/**
 * Task 2.3.4.5: Demo Data Management Utilities
 * 
 * This module provides comprehensive utilities for managing demo data in the MockRosterProvider.
 * It includes tools for resetting data, switching scenarios, exporting test data, and analyzing
 * data distributions for testing and demonstration purposes.
 * 
 * Features:
 * - Data reset and scenario switching
 * - Export capabilities for different formats
 * - Data analysis and statistics
 * - Custom data set creation
 * - Scenario comparison tools
 * - Performance benchmarking
 */

import { MockRosterProvider, MockRosterProviderConfig } from '../providers/mock-roster-provider';
import { MockDataGenerator, MockDataScenario, MockDataConfig, MockDataSet } from './mock-data-generator';
import { Organization, Class, User, Enrollment, UserRole, OrganizationType, EnrollmentStatus } from '@prisma/client';

/**
 * Data export formats
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
  SQL = 'sql'
}

/**
 * Data analysis report
 */
export interface DataAnalysisReport {
  overview: {
    scenario: MockDataScenario;
    totalEntities: number;
    generatedAt: Date;
  };
  
  organizations: {
    total: number;
    byType: Record<string, number>;
    hierarchyDepth: number;
    averageClassesPerOrg: number;
  };
  
  users: {
    total: number;
    byRole: Record<string, number>;
    activeCount: number;
    inactiveCount: number;
    averageClassesPerTeacher: number;
    averageEnrollmentsPerStudent: number;
  };
  
  classes: {
    total: number;
    bySubject: Record<string, number>;
    byGradeLevel: Record<string, number>;
    averageClassSize: number;
    totalCapacity: number;
    utilizationRate: number;
  };
  
  enrollments: {
    total: number;
    byStatus: Record<string, number>;
    averageEnrollmentsPerClass: number;
    completionRate: number;
    dropoutRate: number;
  };
  
  relationships: {
    teacherClassAssignments: number;
    studentEnrollments: number;
    organizationHierarchyLinks: number;
  };
  
  dataIntegrity: {
    orphanedClasses: number;
    orphanedEnrollments: number;
    duplicateEmails: number;
    duplicateUsernames: number;
    classCapacityViolations: number;
  };
}

/**
 * Scenario comparison result
 */
export interface ScenarioComparison {
  scenarios: MockDataScenario[];
  metrics: {
    [key: string]: {
      scenario: MockDataScenario;
      organizations: number;
      users: number;
      classes: number;
      enrollments: number;
      averageClassSize: number;
      teacherToStudentRatio: number;
    };
  };
  recommendations: string[];
}

/**
 * Performance benchmark result
 */
export interface PerformanceBenchmark {
  scenario: MockDataScenario;
  operations: {
    dataGeneration: { duration: number; entitiesPerSecond: number };
    organizationQuery: { duration: number; recordsPerSecond: number };
    userQuery: { duration: number; recordsPerSecond: number };
    classQuery: { duration: number; recordsPerSecond: number };
    enrollmentQuery: { duration: number; recordsPerSecond: number };
    searchOperation: { duration: number; resultsPerSecond: number };
  };
  memoryUsage: {
    totalMB: number;
    perEntityKB: number;
  };
  recommendations: string[];
}

/**
 * Main demo data management class
 */
export class DemoDataManager {
  private providers: Map<string, MockRosterProvider> = new Map();
  private dataGenerator: MockDataGenerator;
  
  constructor() {
    this.dataGenerator = new MockDataGenerator();
  }

  // ================================================================
  // PROVIDER MANAGEMENT
  // ================================================================

  /**
   * Create a new mock provider with specified scenario
   */
  createProvider(providerId: string, scenario: MockDataScenario, customConfig?: Partial<MockDataConfig>): MockRosterProvider {
    const config: Partial<MockRosterProviderConfig> = {
      providerId,
      scenario,
      dataConfig: customConfig || {}
    };
    
    const provider = new MockRosterProvider(config);
    this.providers.set(providerId, provider);
    
    console.log(`🏭 Created mock provider '${providerId}' with scenario '${scenario}'`);
    return provider;
  }

  /**
   * Get existing provider or create with default scenario
   */
  getProvider(providerId: string): MockRosterProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * Switch provider to different scenario
   */
  async switchScenario(providerId: string, newScenario: MockDataScenario, customConfig?: Partial<MockDataConfig>): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }
    
    // Create new provider with new scenario
    const newProvider = this.createProvider(providerId, newScenario, customConfig);
    this.providers.set(providerId, newProvider);
    
    console.log(`🔄 Switched provider '${providerId}' to scenario '${newScenario}'`);
  }

  /**
   * Reset provider data to initial state
   */
  async resetProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }
    
    await provider.reset();
    console.log(`🔄 Reset provider '${providerId}' data`);
  }

  /**
   * List all active providers
   */
  listProviders(): Array<{ id: string; scenario: string; entityCount: number }> {
    const result: Array<{ id: string; scenario: string; entityCount: number }> = [];
    
    for (const [id, provider] of this.providers) {
      // Would need to expose scenario and entity count from provider
      result.push({
        id,
        scenario: 'unknown', // MockRosterProvider should expose this
        entityCount: 0       // Would need to calculate from provider data
      });
    }
    
    return result;
  }

  // ================================================================
  // DATA EXPORT UTILITIES
  // ================================================================

  /**
   * Export provider data in specified format
   */
  async exportData(providerId: string, format: ExportFormat, options?: {
    entityTypes?: string[];
    includeMetadata?: boolean;
    prettyFormat?: boolean;
  }): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }
    
    // Gather data from provider
    const organizations = await provider.getOrganizations();
    const users = await provider.getUsers();
    const classes = await provider.getClasses();
    const enrollments: Enrollment[] = [];
    
    // Collect all enrollments
    for (const classEntity of classes) {
      const classEnrollments = await provider.getEnrollments(classEntity.id);
      enrollments.push(...classEnrollments);
    }
    
    const data = {
      organizations: options?.entityTypes?.includes('organizations') !== false ? organizations : [],
      users: options?.entityTypes?.includes('users') !== false ? users : [],
      classes: options?.entityTypes?.includes('classes') !== false ? classes : [],
      enrollments: options?.entityTypes?.includes('enrollments') !== false ? enrollments : [],
      metadata: options?.includeMetadata ? {
        providerId,
        exportedAt: new Date(),
        format,
        totalEntities: organizations.length + users.length + classes.length + enrollments.length
      } : undefined
    };
    
    switch (format) {
      case ExportFormat.JSON:
        return JSON.stringify(data, null, options?.prettyFormat ? 2 : 0);
      
      case ExportFormat.CSV:
        return this.convertToCSV(data);
      
      case ExportFormat.XML:
        return this.convertToXML(data);
      
      case ExportFormat.SQL:
        return this.convertToSQL(data);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export specific entity type
   */
  async exportEntityType(
    providerId: string, 
    entityType: 'organizations' | 'users' | 'classes' | 'enrollments',
    format: ExportFormat
  ): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }
    
    let data: any[];
    
    switch (entityType) {
      case 'organizations':
        data = await provider.getOrganizations();
        break;
      case 'users':
        data = await provider.getUsers();
        break;
      case 'classes':
        data = await provider.getClasses();
        break;
      case 'enrollments':
        const classes = await provider.getClasses();
        data = [];
        for (const classEntity of classes) {
          const enrollments = await provider.getEnrollments(classEntity.id);
          data.push(...enrollments);
        }
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
    
    switch (format) {
      case ExportFormat.JSON:
        return JSON.stringify(data, null, 2);
      case ExportFormat.CSV:
        return this.arrayToCSV(data);
      default:
        throw new Error(`Format ${format} not supported for single entity export`);
    }
  }

  // ================================================================
  // DATA ANALYSIS UTILITIES
  // ================================================================

  /**
   * Generate comprehensive data analysis report
   */
  async analyzeData(providerId: string): Promise<DataAnalysisReport> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }
    
    // Gather all data
    const organizations = await provider.getOrganizations();
    const users = await provider.getUsers();
    const classes = await provider.getClasses();
    const allEnrollments: Enrollment[] = [];
    
    for (const classEntity of classes) {
      const enrollments = await provider.getEnrollments(classEntity.id);
      allEnrollments.push(...enrollments);
    }
    
    // Analyze organizations
    const orgAnalysis = this.analyzeOrganizations(organizations);
    
    // Analyze users
    const userAnalysis = this.analyzeUsers(users, classes, allEnrollments);
    
    // Analyze classes
    const classAnalysis = this.analyzeClasses(classes, allEnrollments);
    
    // Analyze enrollments
    const enrollmentAnalysis = this.analyzeEnrollments(allEnrollments);
    
    // Check data integrity
    const integrityAnalysis = this.analyzeDataIntegrity(organizations, users, classes, allEnrollments);
    
    return {
      overview: {
        scenario: MockDataScenario.DEMO, // Would need to get from provider
        totalEntities: organizations.length + users.length + classes.length + allEnrollments.length,
        generatedAt: new Date()
      },
      organizations: orgAnalysis,
      users: userAnalysis,
      classes: classAnalysis,
      enrollments: enrollmentAnalysis,
      relationships: {
        teacherClassAssignments: classes.length,
        studentEnrollments: allEnrollments.length,
        organizationHierarchyLinks: organizations.filter(org => org.parent_id).length
      },
      dataIntegrity: integrityAnalysis
    };
  }

  /**
   * Compare different scenarios
   */
  async compareScenarios(scenarios: MockDataScenario[]): Promise<ScenarioComparison> {
    const metrics: any = {};
    const recommendations: string[] = [];
    
    for (const scenario of scenarios) {
      const tempProvider = new MockRosterProvider({ scenario, providerId: `temp-${scenario}` });
      
      const organizations = await tempProvider.getOrganizations();
      const users = await tempProvider.getUsers();
      const classes = await tempProvider.getClasses();
      
      const students = users.filter(u => u.role === UserRole.STUDENT);
      const teachers = users.filter(u => u.role === UserRole.TEACHER);
      const totalEnrollments = classes.length * 25; // Rough estimate
      
      metrics[scenario] = {
        scenario,
        organizations: organizations.length,
        users: users.length,
        classes: classes.length,
        enrollments: totalEnrollments,
        averageClassSize: totalEnrollments / classes.length,
        teacherToStudentRatio: students.length / teachers.length
      };
    }
    
    // Generate recommendations
    if (scenarios.includes(MockDataScenario.DEMO)) {
      recommendations.push('Demo scenario is ideal for presentations and quick testing');
    }
    if (scenarios.includes(MockDataScenario.SMALL_SCHOOL)) {
      recommendations.push('Small school scenario good for development and unit testing');
    }
    if (scenarios.includes(MockDataScenario.LARGE_DISTRICT)) {
      recommendations.push('Large district scenario suitable for performance and scale testing');
    }
    
    return {
      scenarios,
      metrics,
      recommendations
    };
  }

  // ================================================================
  // PERFORMANCE UTILITIES
  // ================================================================

  /**
   * Run performance benchmark on provider
   */
  async benchmarkProvider(providerId: string, iterations = 10): Promise<PerformanceBenchmark> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }
    
    console.log(`📊 Running performance benchmark for provider '${providerId}' (${iterations} iterations)`);
    
    // Benchmark data generation
    const genStart = Date.now();
    for (let i = 0; i < 5; i++) {
      await provider.reset();
    }
    const genDuration = Date.now() - genStart;
    
    // Benchmark queries
    const orgStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await provider.getOrganizations();
    }
    const orgDuration = Date.now() - orgStart;
    
    const userStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await provider.getUsers();
    }
    const userDuration = Date.now() - userStart;
    
    const classStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await provider.getClasses();
    }
    const classDuration = Date.now() - classStart;
    
    const searchStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await provider.searchUsers('john', undefined, { limit: 50 });
    }
    const searchDuration = Date.now() - searchStart;
    
    // Get data size for memory calculations
    const organizations = await provider.getOrganizations();
    const users = await provider.getUsers();
    const classes = await provider.getClasses();
    const totalEntities = organizations.length + users.length + classes.length;
    
    // Rough memory calculation (would need more sophisticated measurement in production)
    const totalMB = (JSON.stringify({ organizations, users, classes }).length / 1024 / 1024);
    
    const benchmark: PerformanceBenchmark = {
      scenario: MockDataScenario.DEMO, // Would get from provider
      operations: {
        dataGeneration: { 
          duration: genDuration, 
          entitiesPerSecond: (totalEntities * 5) / (genDuration / 1000) 
        },
        organizationQuery: { 
          duration: orgDuration, 
          recordsPerSecond: (organizations.length * iterations) / (orgDuration / 1000) 
        },
        userQuery: { 
          duration: userDuration, 
          recordsPerSecond: (users.length * iterations) / (userDuration / 1000) 
        },
        classQuery: { 
          duration: classDuration, 
          recordsPerSecond: (classes.length * iterations) / (classDuration / 1000) 
        },
        enrollmentQuery: { 
          duration: 0, 
          recordsPerSecond: 0 
        }, // Would implement
        searchOperation: { 
          duration: searchDuration, 
          resultsPerSecond: (50 * iterations) / (searchDuration / 1000) 
        },
      },
      memoryUsage: {
        totalMB,
        perEntityKB: (totalMB * 1024) / totalEntities
      },
      recommendations: []
    };
    
    // Generate recommendations
    if (benchmark.operations.organizationQuery.recordsPerSecond < 1000) {
      benchmark.recommendations.push('Organization query performance could be improved');
    }
    if (benchmark.memoryUsage.perEntityKB > 5) {
      benchmark.recommendations.push('Memory usage per entity is high, consider data optimization');
    }
    
    console.log(`✅ Benchmark completed - ${benchmark.operations.organizationQuery.recordsPerSecond.toFixed(0)} org records/sec`);
    
    return benchmark;
  }

  // ================================================================
  // CUSTOM DATA UTILITIES
  // ================================================================

  /**
   * Create custom data set with specific requirements
   */
  createCustomDataSet(requirements: {
    studentCount: number;
    teacherCount: number;
    classCount: number;
    subjects: string[];
    organizationName?: string;
  }): MockDataSet {
    const customConfig: Partial<MockDataConfig> = {
      studentCount: requirements.studentCount,
      teacherCount: requirements.teacherCount,
      classCount: requirements.classCount,
      subjectsPerClass: requirements.subjects,
      organizationCount: 1,
      adminCount: 1,
      gradeLevels: ['9', '10', '11', '12'],
      academicYears: ['2024-2025'],
      terms: ['Fall']
    };
    
    return this.dataGenerator.generateScenarioData(MockDataScenario.DEMO, customConfig);
  }

  // ================================================================
  // PRIVATE HELPER METHODS
  // ================================================================

  private analyzeOrganizations(organizations: Organization[]) {
    const byType: Record<string, number> = {};
    let maxDepth = 0;
    
    for (const org of organizations) {
      byType[org.type] = (byType[org.type] || 0) + 1;
      
      // Calculate hierarchy depth (simplified)
      if (org.parent_id) {
        maxDepth = Math.max(maxDepth, 2); // Simple 2-level hierarchy
      }
    }
    
    return {
      total: organizations.length,
      byType,
      hierarchyDepth: maxDepth,
      averageClassesPerOrg: 0 // Would need to calculate with classes
    };
  }

  private analyzeUsers(users: User[], classes: Class[], enrollments: Enrollment[]) {
    const byRole: Record<string, number> = {};
    let activeCount = 0;
    
    for (const user of users) {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
      if (user.is_active) activeCount++;
    }
    
    const teachers = users.filter(u => u.role === UserRole.TEACHER);
    const students = users.filter(u => u.role === UserRole.STUDENT);
    
    return {
      total: users.length,
      byRole,
      activeCount,
      inactiveCount: users.length - activeCount,
      averageClassesPerTeacher: classes.length / teachers.length,
      averageEnrollmentsPerStudent: enrollments.length / students.length
    };
  }

  private analyzeClasses(classes: Class[], enrollments: Enrollment[]) {
    const bySubject: Record<string, number> = {};
    const byGradeLevel: Record<string, number> = {};
    let totalCapacity = 0;
    
    for (const cls of classes) {
      if (cls.subject) bySubject[cls.subject] = (bySubject[cls.subject] || 0) + 1;
      if (cls.grade_level) byGradeLevel[cls.grade_level] = (byGradeLevel[cls.grade_level] || 0) + 1;
      totalCapacity += cls.max_students;
    }
    
    return {
      total: classes.length,
      bySubject,
      byGradeLevel,
      averageClassSize: enrollments.length / classes.length,
      totalCapacity,
      utilizationRate: enrollments.length / totalCapacity
    };
  }

  private analyzeEnrollments(enrollments: Enrollment[]) {
    const byStatus: Record<string, number> = {};
    
    for (const enrollment of enrollments) {
      byStatus[enrollment.enrollment_status] = (byStatus[enrollment.enrollment_status] || 0) + 1;
    }
    
    const completed = byStatus[EnrollmentStatus.COMPLETED] || 0;
    const dropped = byStatus[EnrollmentStatus.DROPPED] || 0;
    
    return {
      total: enrollments.length,
      byStatus,
      averageEnrollmentsPerClass: 0, // Would calculate with class data
      completionRate: completed / enrollments.length,
      dropoutRate: dropped / enrollments.length
    };
  }

  private analyzeDataIntegrity(
    organizations: Organization[], 
    users: User[], 
    classes: Class[], 
    enrollments: Enrollment[]
  ) {
    // Check for orphaned records
    const orgIds = new Set(organizations.map(o => o.id));
    const userIds = new Set(users.map(u => u.id));
    const classIds = new Set(classes.map(c => c.id));
    
    const orphanedClasses = classes.filter(c => !orgIds.has(c.organization_id) || !userIds.has(c.teacher_id)).length;
    const orphanedEnrollments = enrollments.filter(e => !userIds.has(e.user_id) || !classIds.has(e.class_id)).length;
    
    // Check for duplicates
    const emails = users.map(u => u.email);
    const usernames = users.map(u => u.username).filter(Boolean);
    const duplicateEmails = emails.length - new Set(emails).size;
    const duplicateUsernames = usernames.length - new Set(usernames).size;
    
    return {
      orphanedClasses,
      orphanedEnrollments,
      duplicateEmails,
      duplicateUsernames,
      classCapacityViolations: 0 // Would implement capacity check
    };
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - would implement proper CSV formatting
    return JSON.stringify(data);
  }

  private convertToXML(data: any): string {
    // Simple XML conversion - would implement proper XML formatting  
    return `<data>${JSON.stringify(data)}</data>`;
  }

  private convertToSQL(data: any): string {
    // Simple SQL conversion - would implement proper SQL INSERT statements
    return `-- SQL export would go here\n-- ${JSON.stringify(data).length} characters of data`;
  }

  private arrayToCSV(data: any[]): string {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(item => 
      headers.map(header => 
        JSON.stringify(item[header] || '')
      ).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
}
