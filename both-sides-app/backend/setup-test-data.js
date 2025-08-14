/**
 * Setup script for creating test data for Task 2.3.5
 * This script creates test organizations, users, and classes for comprehensive testing
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupTestData() {
  console.log('🔧 Setting up test data for class management testing...\n');

  try {
    // Create test organization
    console.log('1️⃣ Creating test organization...');
    const testOrg = await prisma.organization.upsert({
      where: { slug: 'test-school-e2e' },
      update: {},
      create: {
        name: 'Test School for E2E Testing',
        slug: 'test-school-e2e',
        type: 'SCHOOL',
        billing_email: 'admin@testschool.edu',
        is_active: true,
        subscription_plan: 'professional'
      }
    });
    console.log(`   ✅ Organization created: ${testOrg.name} (ID: ${testOrg.id})`);

    // Create test teacher
    console.log('\n2️⃣ Creating test teacher...');
    const testTeacher = await prisma.user.upsert({
      where: { email: 'teacher.e2e@testschool.edu' },
      update: {},
      create: {
        clerk_id: 'test_teacher_e2e_clerk_123',
        email: 'teacher.e2e@testschool.edu',
        first_name: 'Sarah',
        last_name: 'Johnson',
        username: 'sjohnson_teacher',
        role: 'TEACHER',
        is_active: true
      }
    });
    console.log(`   ✅ Teacher created: ${testTeacher.first_name} ${testTeacher.last_name} (ID: ${testTeacher.id})`);

    // Create test admin
    console.log('\n3️⃣ Creating test admin...');
    const testAdmin = await prisma.user.upsert({
      where: { email: 'admin.e2e@testschool.edu' },
      update: {},
      create: {
        clerk_id: 'test_admin_e2e_clerk_123',
        email: 'admin.e2e@testschool.edu',
        first_name: 'Michael',
        last_name: 'Chen',
        username: 'mchen_admin',
        role: 'ADMIN',
        is_active: true
      }
    });
    console.log(`   ✅ Admin created: ${testAdmin.first_name} ${testAdmin.last_name} (ID: ${testAdmin.id})`);

    // Create test students
    console.log('\n4️⃣ Creating test students...');
    const studentData = [
      { first_name: 'Emma', last_name: 'Wilson', email: 'emma.wilson@student.testschool.edu', username: 'ewilson_student' },
      { first_name: 'James', last_name: 'Rodriguez', email: 'james.rodriguez@student.testschool.edu', username: 'jrodriguez_student' },
      { first_name: 'Ava', last_name: 'Thompson', email: 'ava.thompson@student.testschool.edu', username: 'athompson_student' },
      { first_name: 'Noah', last_name: 'Davis', email: 'noah.davis@student.testschool.edu', username: 'ndavis_student' },
      { first_name: 'Olivia', last_name: 'Martinez', email: 'olivia.martinez@student.testschool.edu', username: 'omartinez_student' },
      { first_name: 'Liam', last_name: 'Anderson', email: 'liam.anderson@student.testschool.edu', username: 'landerson_student' },
      { first_name: 'Sophia', last_name: 'Taylor', email: 'sophia.taylor@student.testschool.edu', username: 'staylor_student' },
      { first_name: 'William', last_name: 'Brown', email: 'william.brown@student.testschool.edu', username: 'wbrown_student' }
    ];

    const testStudents = [];
    for (let i = 0; i < studentData.length; i++) {
      const student = studentData[i];
      const testStudent = await prisma.user.upsert({
        where: { email: student.email },
        update: {},
        create: {
          clerk_id: `test_student_e2e_clerk_${i + 1}`,
          email: student.email,
          first_name: student.first_name,
          last_name: student.last_name,
          username: student.username,
          role: 'STUDENT',
          is_active: true
        }
      });
      testStudents.push(testStudent);
      console.log(`   ✅ Student ${i + 1}: ${testStudent.first_name} ${testStudent.last_name} (ID: ${testStudent.id})`);
    }

    // Create test class
    console.log('\n5️⃣ Creating test class...');
    // First, check if class already exists
    let testClass = await prisma.class.findFirst({
      where: {
        name: 'E2E Test Philosophy Class',
        organization_id: testOrg.id,
        academic_year: '2024-2025'
      }
    });

    if (!testClass) {
      testClass = await prisma.class.create({
        data: {
          name: 'E2E Test Philosophy Class',
          description: 'A test class for end-to-end testing of class management workflows',
          subject: 'PHILOSOPHY',
          grade_level: '12',
          academic_year: '2024-2025',
          term: 'FALL',
          max_students: 20,
          is_active: true,
          organization_id: testOrg.id,
          teacher_id: testTeacher.id
        }
      });
    }
    console.log(`   ✅ Class created: ${testClass.name} (ID: ${testClass.id})`);

    // Create some initial enrollments
    console.log('\n6️⃣ Creating initial test enrollments...');
    for (let i = 0; i < Math.min(3, testStudents.length); i++) {
      const student = testStudents[i];
      try {
        await prisma.enrollment.upsert({
          where: {
            user_id_class_id: {
              user_id: student.id,
              class_id: testClass.id
            }
          },
          update: {},
          create: {
            user_id: student.id,
            class_id: testClass.id,
            enrollment_status: i === 0 ? 'ACTIVE' : 'PENDING'
          }
        });
        console.log(`   ✅ Enrolled: ${student.first_name} ${student.last_name} (Status: ${i === 0 ? 'ACTIVE' : 'PENDING'})`);
      } catch (error) {
        console.log(`   ⚠️  Could not enroll ${student.first_name}: ${error.message}`);
      }
    }

    // Create profiles for test users
    console.log('\n7️⃣ Creating test profiles...');
    const testUsers = [testTeacher, testAdmin, ...testStudents];
    for (const user of testUsers) {
      try {
        await prisma.profile.upsert({
          where: { user_id: user.id },
          update: {},
          create: {
            user_id: user.id,
            is_completed: true,
            belief_summary: `Test belief summary for ${user.first_name} ${user.last_name}`,
            ideology_scores: {
              liberal: Math.random() * 0.5 + 0.25,
              conservative: Math.random() * 0.5 + 0.25,
              progressive: Math.random() * 0.5 + 0.25,
              libertarian: Math.random() * 0.5 + 0.25
            },
            opinion_plasticity: Math.random() * 0.4 + 0.3
          }
        });
        console.log(`   ✅ Profile created for: ${user.first_name} ${user.last_name}`);
      } catch (error) {
        console.log(`   ⚠️  Could not create profile for ${user.first_name}: ${error.message}`);
      }
    }

    console.log('\n✅ TEST DATA SETUP COMPLETE!');
    console.log('\n📋 Created test data:');
    console.log(`   🏫 Organization: ${testOrg.name} (${testOrg.id})`);
    console.log(`   👨‍🏫 Teacher: ${testTeacher.first_name} ${testTeacher.last_name} (${testTeacher.id})`);
    console.log(`   👨‍💼 Admin: ${testAdmin.first_name} ${testAdmin.last_name} (${testAdmin.id})`);
    console.log(`   👥 Students: ${testStudents.length} created`);
    console.log(`   📚 Class: ${testClass.name} (${testClass.id})`);
    console.log('\n🎯 Ready for Task 2.3.5 comprehensive testing!');

    // Export test IDs for use in test scripts
    const testConfig = {
      organizationId: testOrg.id,
      teacherId: testTeacher.id,
      adminId: testAdmin.id,
      classId: testClass.id,
      studentIds: testStudents.map(s => s.id),
      teacherEmail: testTeacher.email,
      adminEmail: testAdmin.email,
      studentEmails: testStudents.map(s => s.email)
    };

    console.log('\n📄 Test Configuration (copy to test files):');
    console.log(JSON.stringify(testConfig, null, 2));

    return testConfig;

  } catch (error) {
    console.log('❌ Test data setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...\n');

  try {
    // Delete in reverse dependency order
    await prisma.enrollment.deleteMany({
      where: {
        user: {
          email: { endsWith: '@testschool.edu' }
        }
      }
    });

    await prisma.profile.deleteMany({
      where: {
        user: {
          email: { endsWith: '@testschool.edu' }
        }
      }
    });

    await prisma.class.deleteMany({
      where: {
        organization: {
          slug: 'test-school-e2e'
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: { endsWith: '@testschool.edu' }
      }
    });

    await prisma.organization.deleteMany({
      where: {
        slug: 'test-school-e2e'
      }
    });

    console.log('✅ Test data cleanup complete');

  } catch (error) {
    console.log('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'cleanup') {
    cleanupTestData().catch(console.error);
  } else {
    setupTestData().catch(console.error);
  }
}

module.exports = { setupTestData, cleanupTestData };
