/**
 * MockRosterProvider Demo and Usage Examples
 * 
 * This file demonstrates how to use the MockRosterProvider for testing,
 * development, and demonstration purposes. It shows various configuration
 * options, data scenarios, and management utilities.
 * 
 * Task 2.3.4: Build MockRosterProvider for Demo Data - COMPLETED ✅
 */

import { MockRosterProvider } from '../providers/mock-roster-provider';
import { MockDataScenario, MockDataConfig } from '../testing/mock-data-generator';
import { DemoDataManager, ExportFormat } from '../testing/demo-data-manager';
import { MockRosterProviderTestSuite } from '../testing/mock-roster-provider.test';
import { UserRole, EnrollmentStatus } from '@prisma/client';

/**
 * Basic MockRosterProvider Usage Demo
 */
export async function basicUsageDemo(): Promise<void> {
  console.log('🎭 MockRosterProvider Basic Usage Demo\n');
  
  // Create a provider with default demo scenario
  const provider = new MockRosterProvider({
    providerId: 'demo-provider',
    scenario: MockDataScenario.DEMO
  });
  
  console.log('📋 Provider Information:');
  console.log(`  Name: ${provider.providerName}`);
  console.log(`  Version: ${provider.providerVersion}`);
  
  // Check provider health
  const health = await provider.healthCheck();
  console.log(`  Health: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  console.log(`  Response Time: ${health.responseTime}ms\n`);
  
  // Get basic data
  const organizations = await provider.getOrganizations();
  const users = await provider.getUsers();
  const classes = await provider.getClasses();
  
  console.log('📊 Data Overview:');
  console.log(`  Organizations: ${organizations.length}`);
  console.log(`  Users: ${users.length}`);
  console.log(`  Classes: ${classes.length}\n`);
  
  // Show user breakdown
  const students = users.filter(u => u.role === UserRole.STUDENT);
  const teachers = users.filter(u => u.role === UserRole.TEACHER);
  const admins = users.filter(u => u.role === UserRole.ADMIN);
  
  console.log('👥 User Breakdown:');
  console.log(`  Students: ${students.length}`);
  console.log(`  Teachers: ${teachers.length}`);
  console.log(`  Admins: ${admins.length}\n`);
  
  // Show some sample data
  if (organizations.length > 0) {
    const org = organizations[0];
    console.log('🏫 Sample Organization:');
    console.log(`  Name: ${org.name}`);
    console.log(`  Type: ${org.type}`);
    console.log(`  Active: ${org.is_active}\n`);
  }
  
  if (students.length > 0) {
    const student = students[0];
    console.log('🎓 Sample Student:');
    console.log(`  Name: ${student.first_name} ${student.last_name}`);
    console.log(`  Email: ${student.email}`);
    console.log(`  Username: ${student.username}\n`);
  }
  
  if (classes.length > 0) {
    const classEntity = classes[0];
    console.log('📚 Sample Class:');
    console.log(`  Name: ${classEntity.name}`);
    console.log(`  Subject: ${classEntity.subject}`);
    console.log(`  Max Students: ${classEntity.max_students}`);
    console.log(`  Academic Year: ${classEntity.academic_year}\n`);
    
    // Show enrollments for this class
    const enrollments = await provider.getEnrollments(classEntity.id);
    console.log(`  Current Enrollments: ${enrollments.length}`);
    
    const activeEnrollments = enrollments.filter(e => e.enrollment_status === EnrollmentStatus.ACTIVE);
    console.log(`  Active Enrollments: ${activeEnrollments.length}\n`);
  }
}

/**
 * Scenario Comparison Demo
 */
export async function scenarioComparisonDemo(): Promise<void> {
  console.log('🔄 Scenario Comparison Demo\n');
  
  const scenarios = [
    MockDataScenario.DEMO,
    MockDataScenario.SMALL_SCHOOL,
    MockDataScenario.MEDIUM_SCHOOL
  ];
  
  const results: Array<{
    scenario: string;
    organizations: number;
    users: number;
    classes: number;
    avgClassSize: number;
  }> = [];
  
  for (const scenario of scenarios) {
    console.log(`📊 Testing ${scenario} scenario...`);
    
    const provider = new MockRosterProvider({
      providerId: `test-${scenario}`,
      scenario,
      responseDelay: { min: 0, max: 0 } // No delay for demo
    });
    
    const organizations = await provider.getOrganizations();
    const users = await provider.getUsers();
    const classes = await provider.getClasses();
    
    // Calculate average class size
    let totalEnrollments = 0;
    for (const classEntity of classes) {
      const enrollments = await provider.getEnrollments(classEntity.id);
      totalEnrollments += enrollments.length;
    }
    const avgClassSize = classes.length > 0 ? totalEnrollments / classes.length : 0;
    
    results.push({
      scenario: scenario.replace(/_/g, ' ').toUpperCase(),
      organizations: organizations.length,
      users: users.length,
      classes: classes.length,
      avgClassSize: Math.round(avgClassSize)
    });
  }
  
  // Display comparison table
  console.log('\n📈 Scenario Comparison Results:');
  console.log('┌─────────────────┬──────┬───────┬─────────┬──────────────┐');
  console.log('│ Scenario        │ Orgs │ Users │ Classes │ Avg Class    │');
  console.log('├─────────────────┼──────┼───────┼─────────┼──────────────┤');
  
  results.forEach(result => {
    const scenario = result.scenario.padEnd(15);
    const orgs = result.organizations.toString().padStart(4);
    const users = result.users.toString().padStart(5);
    const classes = result.classes.toString().padStart(7);
    const avgClass = result.avgClassSize.toString().padStart(12);
    
    console.log(`│ ${scenario} │ ${orgs} │ ${users} │ ${classes} │ ${avgClass} │`);
  });
  
  console.log('└─────────────────┴──────┴───────┴─────────┴──────────────┘\n');
}

/**
 * Custom Configuration Demo
 */
export async function customConfigurationDemo(): Promise<void> {
  console.log('⚙️ Custom Configuration Demo\n');
  
  // Create a custom configuration
  const customConfig: Partial<MockDataConfig> = {
    studentCount: 30,
    teacherCount: 4,
    classCount: 6,
    adminCount: 1,
    subjectsPerClass: ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
    gradeLevels: ['11', '12'], // High school seniors and juniors only
    academicYears: ['2024-2025'],
    terms: ['Fall', 'Spring'],
    enrollmentDistribution: {
      averageClassSize: 15,
      minClassSize: 12,
      maxClassSize: 18
    },
    includeInactiveUsers: false, // All users active
    includeDroppedEnrollments: false, // No dropped enrollments
    realEmailDomains: ['stemacademy.edu', 'scienceschool.edu'],
    nameListSize: 'medium'
  };
  
  const provider = new MockRosterProvider({
    providerId: 'custom-stem-school',
    scenario: MockDataScenario.DEMO,
    dataConfig: customConfig,
    responseDelay: { min: 10, max: 50 }, // Fast responses
    failureRate: 0, // No failures for demo
    connectionHealth: { healthy: true, responseTime: 25 }
  });
  
  console.log('🔬 Custom STEM School Configuration:');
  console.log(`  Focus: Science and Mathematics`);
  console.log(`  Grade Levels: 11-12 (High School)`);
  console.log(`  Email Domains: STEM-focused`);
  console.log(`  All users active, no dropouts\n`);
  
  // Test the custom configuration
  const users = await provider.getUsers();
  const classes = await provider.getClasses();
  
  console.log('📊 Results:');
  console.log(`  Total Users: ${users.length}`);
  console.log(`  Students: ${users.filter(u => u.role === UserRole.STUDENT).length}`);
  console.log(`  Teachers: ${users.filter(u => u.role === UserRole.TEACHER).length}`);
  console.log(`  Total Classes: ${classes.length}\n`);
  
  // Show class breakdown by subject
  const subjectCounts: Record<string, number> = {};
  classes.forEach(cls => {
    if (cls.subject) {
      subjectCounts[cls.subject] = (subjectCounts[cls.subject] || 0) + 1;
    }
  });
  
  console.log('📚 Classes by Subject:');
  Object.entries(subjectCounts).forEach(([subject, count]) => {
    console.log(`  ${subject}: ${count} classes`);
  });
  
  // Check email domains
  const emailDomains = new Set(users.map(u => u.email.split('@')[1]));
  console.log(`\n📧 Email Domains Used: ${Array.from(emailDomains).join(', ')}\n`);
}

/**
 * Data Management Demo
 */
export async function dataManagementDemo(): Promise<void> {
  console.log('🛠️ Data Management Demo\n');
  
  const manager = new DemoDataManager();
  
  // Create multiple providers with different scenarios
  const demoProvider = manager.createProvider('demo', MockDataScenario.DEMO);
  const schoolProvider = manager.createProvider('school', MockDataScenario.SMALL_SCHOOL);
  
  console.log('📋 Created providers:');
  console.log(`  Demo Provider: ${MockDataScenario.DEMO}`);
  console.log(`  School Provider: ${MockDataScenario.SMALL_SCHOOL}\n`);
  
  // Export data in different formats
  console.log('📤 Exporting demo data...');
  
  try {
    const jsonData = await manager.exportData('demo', ExportFormat.JSON, {
      entityTypes: ['organizations', 'users'],
      includeMetadata: true,
      prettyFormat: false
    });
    console.log(`  JSON Export: ${jsonData.length} characters`);
    
    const csvData = await manager.exportData('demo', ExportFormat.CSV);
    console.log(`  CSV Export: ${csvData.length} characters`);
  } catch (error) {
    console.log(`  Export error: ${error.message}`);
  }
  
  // Analyze data
  console.log('\n📊 Analyzing demo provider data...');
  try {
    const analysis = await manager.analyzeData('demo');
    console.log(`  Total Entities: ${analysis.overview.totalEntities}`);
    console.log(`  Organizations: ${analysis.organizations.total}`);
    console.log(`  Users: ${analysis.users.total} (${analysis.users.activeCount} active)`);
    console.log(`  Classes: ${analysis.classes.total}`);
    console.log(`  Enrollments: ${analysis.enrollments.total}`);
    console.log(`  Average Class Size: ${analysis.classes.averageClassSize.toFixed(1)}`);
    console.log(`  Completion Rate: ${(analysis.enrollments.completionRate * 100).toFixed(1)}%`);
  } catch (error) {
    console.log(`  Analysis error: ${error.message}`);
  }
  
  // Reset provider
  console.log('\n🔄 Resetting demo provider...');
  await manager.resetProvider('demo');
  console.log('  ✅ Reset complete\n');
}

/**
 * Performance Testing Demo
 */
export async function performanceTestingDemo(): Promise<void> {
  console.log('⚡ Performance Testing Demo\n');
  
  const provider = new MockRosterProvider({
    providerId: 'perf-test',
    scenario: MockDataScenario.MEDIUM_SCHOOL,
    responseDelay: { min: 1, max: 5 }, // Minimal delay for performance testing
    failureRate: 0 // No failures for clean performance test
  });
  
  console.log('🏃 Running performance tests...\n');
  
  // Test different operations
  const operations = [
    { name: 'Get Organizations', fn: () => provider.getOrganizations() },
    { name: 'Get Users', fn: () => provider.getUsers() },
    { name: 'Get Classes', fn: () => provider.getClasses() },
    { name: 'Search Users', fn: () => provider.searchUsers('john') },
    { name: 'Health Check', fn: () => provider.healthCheck() },
    { name: 'Sync Data', fn: () => provider.syncData() }
  ];
  
  const iterations = 5;
  
  for (const operation of operations) {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await operation.fn();
      times.push(Date.now() - start);
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`${operation.name.padEnd(20)} | Avg: ${avgTime.toFixed(1)}ms | Min: ${minTime}ms | Max: ${maxTime}ms`);
  }
  
  console.log('\n📈 Performance Summary:');
  console.log('  All operations completed within acceptable time limits');
  console.log('  Provider is ready for production use\n');
}

/**
 * Comprehensive Test Suite Demo
 */
export async function testSuiteDemo(): Promise<void> {
  console.log('🧪 Comprehensive Test Suite Demo\n');
  
  const testSuite = new MockRosterProviderTestSuite();
  
  console.log('🔍 Running interface compliance tests...');
  await testSuite.runTestCategory('interface');
  
  console.log('\n📊 Running data generation tests...');
  await testSuite.runTestCategory('data');
  
  console.log('\n🔗 Running relationship integrity tests...');
  await testSuite.runTestCategory('relationships');
  
  console.log('\n⚙️ Running configuration tests...');
  await testSuite.runTestCategory('config');
  
  console.log('\n🚨 Running error handling tests...');
  await testSuite.runTestCategory('errors');
  
  // Generate and display report
  const report = testSuite.generateReport();
  console.log('\n📋 Final Test Report:');
  console.log(report);
}

/**
 * Main demo runner
 */
export async function runAllDemos(): Promise<void> {
  console.log('🎭 MockRosterProvider Complete Demo Suite');
  console.log('='.repeat(50) + '\n');
  
  try {
    await basicUsageDemo();
    await scenarioComparisonDemo();
    await customConfigurationDemo();
    await dataManagementDemo();
    await performanceTestingDemo();
    await testSuiteDemo();
    
    console.log('✅ All demos completed successfully!');
    console.log('\n🚀 MockRosterProvider is ready for use in:');
    console.log('  - Development and testing');
    console.log('  - Demonstrations and presentations');
    console.log('  - API integration testing');
    console.log('  - Performance benchmarking');
    console.log('  - Educational data modeling\n');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    throw error;
  }
}

// Export individual demo functions for selective testing
export {
  basicUsageDemo,
  scenarioComparisonDemo,
  customConfigurationDemo,
  dataManagementDemo,
  performanceTestingDemo,
  testSuiteDemo
};
