/**
 * Task 2.3.4.6: MockRosterProvider Test Suite
 * 
 * Comprehensive test suite for the MockRosterProvider implementation.
 * Tests interface compliance, data integrity, relationships, and edge cases.
 * 
 * Test Categories:
 * - Interface Compliance Tests
 * - Data Generation Tests  
 * - Relationship Integrity Tests
 * - Configuration & Scenario Tests
 * - Performance Tests
 * - Error Handling Tests
 */

import { MockRosterProvider } from '../providers/mock-roster-provider';
import { MockDataScenario, MockDataConfig } from './mock-data-generator';
import { DemoDataManager, ExportFormat } from './demo-data-manager';
import { UserRole, OrganizationType, EnrollmentStatus } from '@prisma/client';

/**
 * Test helper class for assertions and utilities
 */
class TestUtils {
  static assertValidUUID(uuid: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      throw new Error(`Invalid UUID format: ${uuid}`);
    }
  }

  static assertValidEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }
  }

  static assertDateInRange(date: Date, start: Date, end: Date): void {
    if (date < start || date > end) {
      throw new Error(`Date ${date.toISOString()} not in range ${start.toISOString()} - ${end.toISOString()}`);
    }
  }

  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  }
}

/**
 * Main test suite class
 */
export class MockRosterProviderTestSuite {
  private provider: MockRosterProvider;
  private dataManager: DemoDataManager;
  private testResults: Array<{ test: string; passed: boolean; error?: string; duration?: number }> = [];

  constructor() {
    this.provider = new MockRosterProvider();
    this.dataManager = new DemoDataManager();
  }

  /**
   * Run complete test suite
   */
  async runAllTests(): Promise<{ passed: number; failed: number; results: any[] }> {
    console.log('🧪 Starting MockRosterProvider test suite...\n');
    
    this.testResults = [];
    
    // Run test categories
    await this.runInterfaceComplianceTests();
    await this.runDataGenerationTests();
    await this.runRelationshipIntegrityTests();
    await this.runConfigurationTests();
    await this.runPerformanceTests();
    await this.runErrorHandlingTests();
    
    // Calculate results
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    
    console.log(`\n📊 Test Results Summary:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.testResults.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.test}: ${result.error}`);
      });
    }
    
    return { passed, failed, results: this.testResults };
  }

  // ================================================================
  // INTERFACE COMPLIANCE TESTS
  // ================================================================

  private async runInterfaceComplianceTests(): Promise<void> {
    console.log('🔍 Running Interface Compliance Tests...');
    
    await this.runTest('Provider Info Properties', async () => {
      if (!this.provider.providerName || typeof this.provider.providerName !== 'string') {
        throw new Error('Provider name is missing or invalid');
      }
      if (!this.provider.providerVersion || typeof this.provider.providerVersion !== 'string') {
        throw new Error('Provider version is missing or invalid');
      }
    });

    await this.runTest('Organization Methods', async () => {
      const orgs = await this.provider.getOrganizations();
      if (!Array.isArray(orgs)) throw new Error('getOrganizations should return array');
      
      if (orgs.length > 0) {
        const org = await this.provider.getOrganization(orgs[0].id);
        if (!org || org.id !== orgs[0].id) throw new Error('getOrganization failed');
        
        const hierarchy = await this.provider.getOrganizationHierarchy();
        if (!Array.isArray(hierarchy)) throw new Error('getOrganizationHierarchy should return array');
      }
    });

    await this.runTest('User Methods', async () => {
      const users = await this.provider.getUsers();
      if (!Array.isArray(users)) throw new Error('getUsers should return array');
      
      if (users.length > 0) {
        const user = await this.provider.getUser(users[0].id);
        if (!user || user.id !== users[0].id) throw new Error('getUser failed');
        
        const studentUsers = await this.provider.getUsersByRole('STUDENT');
        if (!Array.isArray(studentUsers)) throw new Error('getUsersByRole should return array');
        
        const searchResults = await this.provider.searchUsers('test');
        if (!Array.isArray(searchResults)) throw new Error('searchUsers should return array');
      }
    });

    await this.runTest('Class Methods', async () => {
      const classes = await this.provider.getClasses();
      if (!Array.isArray(classes)) throw new Error('getClasses should return array');
      
      if (classes.length > 0) {
        const classEntity = await this.provider.getClass(classes[0].id);
        if (!classEntity || classEntity.id !== classes[0].id) throw new Error('getClass failed');
        
        const teacherClasses = await this.provider.getClassesByTeacher(classes[0].teacher_id);
        if (!Array.isArray(teacherClasses)) throw new Error('getClassesByTeacher should return array');
        
        const yearClasses = await this.provider.getClassesByAcademicPeriod('2024-2025');
        if (!Array.isArray(yearClasses)) throw new Error('getClassesByAcademicPeriod should return array');
      }
    });

    await this.runTest('Enrollment Methods', async () => {
      const classes = await this.provider.getClasses();
      if (classes.length > 0) {
        const enrollments = await this.provider.getEnrollments(classes[0].id);
        if (!Array.isArray(enrollments)) throw new Error('getEnrollments should return array');
        
        if (enrollments.length > 0) {
          const studentEnrollments = await this.provider.getStudentEnrollments(enrollments[0].user_id);
          if (!Array.isArray(studentEnrollments)) throw new Error('getStudentEnrollments should return array');
        }
        
        const stats = await this.provider.getEnrollmentStats(classes[0].id, 'class');
        if (typeof stats.totalStudents !== 'number') throw new Error('getEnrollmentStats should return valid stats');
      }
    });

    await this.runTest('Sync Methods', async () => {
      const syncResult = await this.provider.syncData();
      if (!syncResult || typeof syncResult.success !== 'boolean') {
        throw new Error('syncData should return valid SyncResult');
      }
      
      const incrementalResult = await this.provider.syncIncremental(new Date());
      if (!incrementalResult || typeof incrementalResult.success !== 'boolean') {
        throw new Error('syncIncremental should return valid SyncResult');
      }
      
      const metadata = await this.provider.getSyncMetadata();
      if (!metadata || typeof metadata.totalRecords !== 'number') {
        throw new Error('getSyncMetadata should return valid metadata');
      }
    });

    await this.runTest('Health Check Methods', async () => {
      const validation = await this.provider.validateConnection();
      if (!validation || typeof validation.isValid !== 'boolean') {
        throw new Error('validateConnection should return valid ConnectionValidation');
      }
      
      const health = await this.provider.healthCheck();
      if (!health || typeof health.healthy !== 'boolean') {
        throw new Error('healthCheck should return valid health status');
      }
      
      const capabilities = this.provider.getCapabilities();
      if (!capabilities || typeof capabilities.supportsIncremental !== 'boolean') {
        throw new Error('getCapabilities should return valid capabilities');
      }
    });
  }

  // ================================================================
  // DATA GENERATION TESTS
  // ================================================================

  private async runDataGenerationTests(): Promise<void> {
    console.log('📊 Running Data Generation Tests...');
    
    await this.runTest('Organization Data Integrity', async () => {
      const orgs = await this.provider.getOrganizations();
      
      for (const org of orgs) {
        TestUtils.assertValidUUID(org.id);
        if (!org.name || org.name.trim().length === 0) {
          throw new Error('Organization name cannot be empty');
        }
        if (!org.slug || org.slug.trim().length === 0) {
          throw new Error('Organization slug cannot be empty');
        }
        if (!Object.values(OrganizationType).includes(org.type)) {
          throw new Error(`Invalid organization type: ${org.type}`);
        }
      }
    });

    await this.runTest('User Data Integrity', async () => {
      const users = await this.provider.getUsers();
      const emails = new Set<string>();
      const usernames = new Set<string>();
      
      for (const user of users) {
        TestUtils.assertValidUUID(user.id);
        TestUtils.assertValidEmail(user.email);
        
        if (emails.has(user.email)) {
          throw new Error(`Duplicate email found: ${user.email}`);
        }
        emails.add(user.email);
        
        if (user.username) {
          if (usernames.has(user.username)) {
            throw new Error(`Duplicate username found: ${user.username}`);
          }
          usernames.add(user.username);
        }
        
        if (!Object.values(UserRole).includes(user.role)) {
          throw new Error(`Invalid user role: ${user.role}`);
        }
        
        if (user.first_name && user.first_name.trim().length === 0) {
          throw new Error('First name cannot be empty string');
        }
        
        if (user.last_name && user.last_name.trim().length === 0) {
          throw new Error('Last name cannot be empty string');
        }
      }
    });

    await this.runTest('Class Data Integrity', async () => {
      const classes = await this.provider.getClasses();
      const users = await this.provider.getUsers();
      const orgs = await this.provider.getOrganizations();
      
      const userIds = new Set(users.map(u => u.id));
      const orgIds = new Set(orgs.map(o => o.id));
      
      for (const classEntity of classes) {
        TestUtils.assertValidUUID(classEntity.id);
        
        if (!classEntity.name || classEntity.name.trim().length === 0) {
          throw new Error('Class name cannot be empty');
        }
        
        if (!userIds.has(classEntity.teacher_id)) {
          throw new Error(`Class references non-existent teacher: ${classEntity.teacher_id}`);
        }
        
        if (!orgIds.has(classEntity.organization_id)) {
          throw new Error(`Class references non-existent organization: ${classEntity.organization_id}`);
        }
        
        if (classEntity.max_students <= 0) {
          throw new Error('Class max_students must be positive');
        }
        
        if (!classEntity.academic_year || !/^\d{4}-\d{4}$/.test(classEntity.academic_year)) {
          throw new Error(`Invalid academic year format: ${classEntity.academic_year}`);
        }
      }
    });

    await this.runTest('Enrollment Data Integrity', async () => {
      const classes = await this.provider.getClasses();
      const users = await this.provider.getUsers();
      
      const userIds = new Set(users.map(u => u.id));
      const classIds = new Set(classes.map(c => c.id));
      
      for (const classEntity of classes) {
        const enrollments = await this.provider.getEnrollments(classEntity.id);
        
        for (const enrollment of enrollments) {
          TestUtils.assertValidUUID(enrollment.id);
          
          if (!userIds.has(enrollment.user_id)) {
            throw new Error(`Enrollment references non-existent user: ${enrollment.user_id}`);
          }
          
          if (!classIds.has(enrollment.class_id)) {
            throw new Error(`Enrollment references non-existent class: ${enrollment.class_id}`);
          }
          
          if (!Object.values(EnrollmentStatus).includes(enrollment.enrollment_status)) {
            throw new Error(`Invalid enrollment status: ${enrollment.enrollment_status}`);
          }
          
          // Check date logic
          if (enrollment.completed_at && enrollment.dropped_at) {
            throw new Error('Enrollment cannot be both completed and dropped');
          }
          
          if (enrollment.enrollment_status === EnrollmentStatus.COMPLETED && !enrollment.completed_at) {
            throw new Error('Completed enrollment must have completion date');
          }
          
          if (enrollment.enrollment_status === EnrollmentStatus.DROPPED && !enrollment.dropped_at) {
            throw new Error('Dropped enrollment must have drop date');
          }
        }
      }
    });
  }

  // ================================================================
  // RELATIONSHIP INTEGRITY TESTS
  // ================================================================

  private async runRelationshipIntegrityTests(): Promise<void> {
    console.log('🔗 Running Relationship Integrity Tests...');
    
    await this.runTest('Teacher-Class Relationships', async () => {
      const classes = await this.provider.getClasses();
      const users = await this.provider.getUsers();
      const teachers = users.filter(u => u.role === UserRole.TEACHER);
      
      const teacherIds = new Set(teachers.map(t => t.id));
      
      for (const classEntity of classes) {
        if (!teacherIds.has(classEntity.teacher_id)) {
          throw new Error(`Class assigned to non-teacher user: ${classEntity.teacher_id}`);
        }
      }
      
      // Test reverse relationship
      for (const teacher of teachers) {
        const teacherClasses = await this.provider.getClassesByTeacher(teacher.id);
        const expectedClasses = classes.filter(c => c.teacher_id === teacher.id);
        
        if (teacherClasses.length !== expectedClasses.length) {
          throw new Error(`Teacher class count mismatch for teacher ${teacher.id}`);
        }
      }
    });

    await this.runTest('Organization-Class Relationships', async () => {
      const classes = await this.provider.getClasses();
      const organizations = await this.provider.getOrganizations();
      
      const orgIds = new Set(organizations.map(o => o.id));
      
      for (const classEntity of classes) {
        if (!orgIds.has(classEntity.organization_id)) {
          throw new Error(`Class assigned to non-existent organization: ${classEntity.organization_id}`);
        }
      }
      
      // Test reverse relationship
      for (const org of organizations) {
        const orgClasses = await this.provider.getClasses(org.id);
        const expectedClasses = classes.filter(c => c.organization_id === org.id);
        
        if (orgClasses.length !== expectedClasses.length) {
          throw new Error(`Organization class count mismatch for org ${org.id}`);
        }
      }
    });

    await this.runTest('Student-Class Enrollment Relationships', async () => {
      const classes = await this.provider.getClasses();
      const users = await this.provider.getUsers();
      const students = users.filter(u => u.role === UserRole.STUDENT);
      
      let totalEnrollments = 0;
      const studentEnrollmentCounts = new Map<string, number>();
      
      for (const classEntity of classes) {
        const enrollments = await this.provider.getEnrollments(classEntity.id);
        totalEnrollments += enrollments.length;
        
        for (const enrollment of enrollments) {
          const student = students.find(s => s.id === enrollment.user_id);
          if (!student) {
            throw new Error(`Enrollment for non-student user: ${enrollment.user_id}`);
          }
          
          studentEnrollmentCounts.set(student.id, (studentEnrollmentCounts.get(student.id) || 0) + 1);
        }
      }
      
      // Test reverse relationships
      for (const student of students) {
        const studentEnrollments = await this.provider.getStudentEnrollments(student.id);
        const expectedCount = studentEnrollmentCounts.get(student.id) || 0;
        
        if (studentEnrollments.length !== expectedCount) {
          throw new Error(`Student enrollment count mismatch for student ${student.id}`);
        }
      }
    });

    await this.runTest('Organization Hierarchy Relationships', async () => {
      const organizations = await this.provider.getOrganizations();
      const hierarchy = await this.provider.getOrganizationHierarchy();
      
      // Check for circular references
      for (const org of organizations) {
        if (org.parent_id === org.id) {
          throw new Error(`Organization has circular reference: ${org.id}`);
        }
        
        if (org.parent_id) {
          const parent = organizations.find(o => o.id === org.parent_id);
          if (!parent) {
            throw new Error(`Organization references non-existent parent: ${org.parent_id}`);
          }
        }
      }
      
      // Verify hierarchy contains all organizations
      if (hierarchy.length !== organizations.length) {
        throw new Error('Organization hierarchy missing organizations');
      }
    });
  }

  // ================================================================
  // CONFIGURATION TESTS
  // ================================================================

  private async runConfigurationTests(): Promise<void> {
    console.log('⚙️ Running Configuration Tests...');
    
    await this.runTest('Demo Scenario Configuration', async () => {
      const demoProvider = new MockRosterProvider({ 
        scenario: MockDataScenario.DEMO,
        providerId: 'test-demo'
      });
      
      const orgs = await demoProvider.getOrganizations();
      const users = await demoProvider.getUsers();
      const classes = await demoProvider.getClasses();
      
      // Demo should have small, manageable data set
      if (orgs.length === 0) throw new Error('Demo scenario should have organizations');
      if (users.length === 0) throw new Error('Demo scenario should have users');
      if (classes.length === 0) throw new Error('Demo scenario should have classes');
      
      if (users.length > 100) throw new Error('Demo scenario should have reasonable user count');
      if (classes.length > 20) throw new Error('Demo scenario should have reasonable class count');
    });

    await this.runTest('Large School Scenario Configuration', async () => {
      const largeProvider = new MockRosterProvider({ 
        scenario: MockDataScenario.LARGE_SCHOOL,
        providerId: 'test-large'
      });
      
      const users = await largeProvider.getUsers();
      const classes = await largeProvider.getClasses();
      
      const students = users.filter(u => u.role === UserRole.STUDENT);
      const teachers = users.filter(u => u.role === UserRole.TEACHER);
      
      // Large school should have significant numbers
      if (students.length < 800) throw new Error('Large school should have many students');
      if (teachers.length < 50) throw new Error('Large school should have many teachers');
      if (classes.length < 80) throw new Error('Large school should have many classes');
      
      // Reasonable ratios
      const studentTeacherRatio = students.length / teachers.length;
      if (studentTeacherRatio < 10 || studentTeacherRatio > 30) {
        throw new Error('Student-teacher ratio should be reasonable');
      }
    });

    await this.runTest('Custom Configuration Override', async () => {
      const customConfig: Partial<MockDataConfig> = {
        studentCount: 25,
        teacherCount: 3,
        classCount: 5,
        subjectsPerClass: ['Math', 'Science'],
        adminCount: 1
      };
      
      const customProvider = new MockRosterProvider({
        scenario: MockDataScenario.DEMO,
        dataConfig: customConfig,
        providerId: 'test-custom'
      });
      
      const users = await customProvider.getUsers();
      const classes = await customProvider.getClasses();
      
      const students = users.filter(u => u.role === UserRole.STUDENT);
      const teachers = users.filter(u => u.role === UserRole.TEACHER);
      const admins = users.filter(u => u.role === UserRole.ADMIN);
      
      if (students.length !== 25) throw new Error('Custom student count not respected');
      if (teachers.length !== 3) throw new Error('Custom teacher count not respected');
      if (admins.length !== 1) throw new Error('Custom admin count not respected');
      if (classes.length !== 5) throw new Error('Custom class count not respected');
    });

    await this.runTest('Response Delay Configuration', async () => {
      const delayProvider = new MockRosterProvider({
        scenario: MockDataScenario.DEMO,
        responseDelay: { min: 200, max: 400 },
        providerId: 'test-delay'
      });
      
      const { duration } = await TestUtils.measureExecutionTime(async () => {
        await delayProvider.getOrganizations();
      });
      
      if (duration < 180) throw new Error('Response delay not applied');
      if (duration > 500) throw new Error('Response delay too long');
    });
  }

  // ================================================================
  // PERFORMANCE TESTS
  // ================================================================

  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running Performance Tests...');
    
    await this.runTest('Organization Query Performance', async () => {
      const iterations = 10;
      const { duration } = await TestUtils.measureExecutionTime(async () => {
        for (let i = 0; i < iterations; i++) {
          await this.provider.getOrganizations();
        }
      });
      
      const avgDuration = duration / iterations;
      if (avgDuration > 100) { // 100ms per query
        throw new Error(`Organization queries too slow: ${avgDuration}ms average`);
      }
    });

    await this.runTest('User Search Performance', async () => {
      const searchTerms = ['john', 'smith', 'teacher', 'student'];
      const { duration } = await TestUtils.measureExecutionTime(async () => {
        for (const term of searchTerms) {
          await this.provider.searchUsers(term);
        }
      });
      
      const avgDuration = duration / searchTerms.length;
      if (avgDuration > 50) { // 50ms per search
        throw new Error(`User search too slow: ${avgDuration}ms average`);
      }
    });

    await this.runTest('Bulk Data Operations Performance', async () => {
      const { duration } = await TestUtils.measureExecutionTime(async () => {
        const [orgs, users, classes] = await Promise.all([
          this.provider.getOrganizations(),
          this.provider.getUsers(),
          this.provider.getClasses()
        ]);
        
        if (orgs.length === 0 || users.length === 0 || classes.length === 0) {
          throw new Error('Bulk operations returned empty data');
        }
      });
      
      if (duration > 200) { // 200ms for parallel bulk operations
        throw new Error(`Bulk operations too slow: ${duration}ms`);
      }
    });

    await this.runTest('Memory Usage Estimation', async () => {
      const orgs = await this.provider.getOrganizations();
      const users = await this.provider.getUsers();
      const classes = await this.provider.getClasses();
      
      const dataSize = JSON.stringify({ orgs, users, classes }).length;
      const entityCount = orgs.length + users.length + classes.length;
      const bytesPerEntity = dataSize / entityCount;
      
      // Reasonable memory usage per entity
      if (bytesPerEntity > 5000) { // 5KB per entity
        throw new Error(`Memory usage too high: ${bytesPerEntity.toFixed(0)} bytes per entity`);
      }
    });
  }

  // ================================================================
  // ERROR HANDLING TESTS
  // ================================================================

  private async runErrorHandlingTests(): Promise<void> {
    console.log('🚨 Running Error Handling Tests...');
    
    await this.runTest('Invalid ID Handling', async () => {
      const result = await this.provider.getOrganization('non-existent-id');
      if (result !== null) {
        throw new Error('Should return null for non-existent organization');
      }
      
      const userResult = await this.provider.getUser('invalid-user-id');
      if (userResult !== null) {
        throw new Error('Should return null for non-existent user');
      }
      
      const classResult = await this.provider.getClass('invalid-class-id');
      if (classResult !== null) {
        throw new Error('Should return null for non-existent class');
      }
    });

    await this.runTest('Rate Limiting Simulation', async () => {
      const rateLimitProvider = new MockRosterProvider({
        scenario: MockDataScenario.DEMO,
        rateLimits: { requestsPerMinute: 5, requestsPerHour: 100 },
        providerId: 'test-rate-limit'
      });
      
      let errorThrown = false;
      
      try {
        // Make requests beyond rate limit
        for (let i = 0; i < 10; i++) {
          await rateLimitProvider.getOrganizations();
        }
      } catch (error) {
        if (error.message.includes('Rate limit exceeded')) {
          errorThrown = true;
        }
      }
      
      if (!errorThrown) {
        throw new Error('Rate limiting not enforced');
      }
    });

    await this.runTest('Connection Health Simulation', async () => {
      const unhealthyProvider = new MockRosterProvider({
        scenario: MockDataScenario.DEMO,
        connectionHealth: { healthy: false, responseTime: 5000 },
        providerId: 'test-unhealthy'
      });
      
      const health = await unhealthyProvider.healthCheck();
      if (health.healthy) {
        throw new Error('Provider should report unhealthy status');
      }
      
      const validation = await unhealthyProvider.validateConnection();
      if (validation.isValid) {
        throw new Error('Provider should report invalid connection');
      }
    });

    await this.runTest('Data Reset and Cleanup', async () => {
      const testProvider = new MockRosterProvider({
        scenario: MockDataScenario.DEMO,
        providerId: 'test-reset'
      });
      
      const originalOrgs = await testProvider.getOrganizations();
      if (originalOrgs.length === 0) {
        throw new Error('Provider should have initial data');
      }
      
      await testProvider.reset();
      
      const resetOrgs = await testProvider.getOrganizations();
      if (resetOrgs.length === 0) {
        throw new Error('Provider should have data after reset');
      }
      
      await testProvider.cleanup();
      // Cleanup should not affect data, just internal state
    });
  }

  // ================================================================
  // TEST INFRASTRUCTURE
  // ================================================================

  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    try {
      const { duration } = await TestUtils.measureExecutionTime(testFunction);
      this.testResults.push({ test: testName, passed: true, duration });
      console.log(`  ✅ ${testName} (${duration}ms)`);
    } catch (error) {
      this.testResults.push({ 
        test: testName, 
        passed: false, 
        error: error.message 
      });
      console.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  /**
   * Run specific test category
   */
  async runTestCategory(category: 'interface' | 'data' | 'relationships' | 'config' | 'performance' | 'errors'): Promise<void> {
    switch (category) {
      case 'interface':
        await this.runInterfaceComplianceTests();
        break;
      case 'data':
        await this.runDataGenerationTests();
        break;
      case 'relationships':
        await this.runRelationshipIntegrityTests();
        break;
      case 'config':
        await this.runConfigurationTests();
        break;
      case 'performance':
        await this.runPerformanceTests();
        break;
      case 'errors':
        await this.runErrorHandlingTests();
        break;
    }
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;
    
    let report = `# MockRosterProvider Test Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Total Tests**: ${total}\n`;
    report += `**Passed**: ${passed}\n`;
    report += `**Failed**: ${failed}\n`;
    report += `**Success Rate**: ${((passed / total) * 100).toFixed(1)}%\n\n`;
    
    if (failed > 0) {
      report += `## Failed Tests\n\n`;
      this.testResults.filter(r => !r.passed).forEach(result => {
        report += `- **${result.test}**: ${result.error}\n`;
      });
      report += `\n`;
    }
    
    report += `## All Test Results\n\n`;
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      report += `- ${status} ${result.test}${duration}\n`;
    });
    
    return report;
  }
}

/**
 * Export standalone test runner function
 */
export async function runMockRosterProviderTests(): Promise<void> {
  const testSuite = new MockRosterProviderTestSuite();
  const results = await testSuite.runAllTests();
  
  if (results.failed > 0) {
    throw new Error(`${results.failed} tests failed`);
  }
}

/**
 * Quick validation function for development
 */
export async function validateMockProvider(provider: MockRosterProvider): Promise<boolean> {
  try {
    // Quick smoke tests
    const orgs = await provider.getOrganizations();
    const users = await provider.getUsers();
    const classes = await provider.getClasses();
    const health = await provider.healthCheck();
    
    return orgs.length > 0 && users.length > 0 && classes.length > 0 && health.healthy;
  } catch (error) {
    console.error('Mock provider validation failed:', error);
    return false;
  }
}
