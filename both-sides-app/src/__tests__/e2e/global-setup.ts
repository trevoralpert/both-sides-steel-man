/**
 * Global setup for Playwright E2E tests
 * Handles test database setup, user fixtures, and environment preparation
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test environment setup...');

  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.PLAYWRIGHT_CLERK_PUBLISHABLE_KEY || 'pk_test_mock_key';
  process.env.CLERK_SECRET_KEY = process.env.PLAYWRIGHT_CLERK_SECRET_KEY || 'sk_test_mock_key';
  process.env.DATABASE_URL = process.env.PLAYWRIGHT_DATABASE_URL || 'postgresql://test:test@localhost:5432/bothsides_test';

  // Create browser instance for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the app to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:3000');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Application is ready for testing');

    // Set up test data
    await setupTestDatabase();
    await createTestUsers();
    await seedTestData();

    console.log('🎯 E2E test environment setup complete!');

  } catch (error) {
    console.error('❌ Failed to set up E2E test environment:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupTestDatabase() {
  console.log('🗄️ Setting up test database...');
  
  // In a real implementation, this would:
  // 1. Connect to test database
  // 2. Run migrations
  // 3. Clear existing test data
  // 4. Set up database constraints and indexes
  
  // Mock implementation
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('✅ Test database ready');
}

async function createTestUsers() {
  console.log('👥 Creating test user fixtures...');
  
  // Test user data
  const testUsers = [
    {
      id: 'test-student-1',
      email: 'student1@test.bothsides.com',
      firstName: 'Alice',
      lastName: 'Student',
      role: 'student',
      beliefProfile: {
        political: 0.7,
        social: -0.3,
        economic: 0.5,
        environmental: -0.8,
        international: 0.2
      }
    },
    {
      id: 'test-student-2',
      email: 'student2@test.bothsides.com',
      firstName: 'Bob',
      lastName: 'Learner',
      role: 'student',
      beliefProfile: {
        political: -0.6,
        social: 0.4,
        economic: -0.7,
        environmental: 0.9,
        international: -0.3
      }
    },
    {
      id: 'test-teacher-1',
      email: 'teacher@test.bothsides.com',
      firstName: 'Carol',
      lastName: 'Educator',
      role: 'teacher',
      classes: ['test-class-1', 'test-class-2']
    },
    {
      id: 'test-admin-1',
      email: 'admin@test.bothsides.com',
      firstName: 'David',
      lastName: 'Administrator',
      role: 'admin'
    }
  ];

  // In a real implementation, this would create users in the database
  // and generate authentication tokens for bypass
  for (const user of testUsers) {
    console.log(`  - Created test user: ${user.email} (${user.role})`);
  }

  // Store test user credentials for tests
  global.testUsers = testUsers;
  
  console.log('✅ Test users created');
}

async function seedTestData() {
  console.log('🌱 Seeding test data...');
  
  // Test data structures
  const testData = {
    classes: [
      {
        id: 'test-class-1',
        name: 'Advanced Debate Techniques',
        teacherId: 'test-teacher-1',
        students: ['test-student-1', 'test-student-2'],
        subject: 'Political Science',
        gradeLevel: 11
      }
    ],
    topics: [
      {
        id: 'test-topic-1',
        title: 'Climate Change Policy Effectiveness',
        description: 'Debate the effectiveness of current climate change policies',
        category: 'environmental',
        difficulty: 'intermediate'
      },
      {
        id: 'test-topic-2',
        title: 'Universal Basic Income Implementation',
        description: 'Discuss the feasibility and impact of universal basic income',
        category: 'economic',
        difficulty: 'advanced'
      }
    ],
    conversations: [
      {
        id: 'test-conversation-1',
        topic: 'test-topic-1',
        participants: ['test-student-1', 'test-student-2'],
        status: 'scheduled',
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      }
    ]
  };

  // In a real implementation, this would populate the database
  global.testData = testData;
  
  console.log('✅ Test data seeded');
}

export default globalSetup;
