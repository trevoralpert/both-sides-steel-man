const { PrismaClient } = require('@prisma/client');

async function testRLSEnforcement() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔒 Testing RLS Policy Enforcement...\n');

    // Test 1: Service account bypass (should work without context)
    console.log('1. Testing Service Account Bypass:');
    try {
      await prisma.$queryRaw`SET app.bypass_rls = true`;
      const users = await prisma.user.findMany({ take: 5 });
      console.log(`✅ Service bypass works - found ${users.length} users with bypass enabled`);
      await prisma.$queryRaw`SET app.bypass_rls = false`;
    } catch (error) {
      console.log('❌ Service bypass failed:', error.message);
    }

    // Test 2: No user context (should return empty results)
    console.log('\n2. Testing No User Context (should return no data):');
    try {
      const users = await prisma.user.findMany();
      console.log(`Result: Found ${users.length} users (should be 0)`);
      
      const classes = await prisma.class.findMany();
      console.log(`Result: Found ${classes.length} classes (should be 0)`);
      
      const profiles = await prisma.profile.findMany();
      console.log(`Result: Found ${profiles.length} profiles (should be 0)`);
      
      if (users.length === 0 && classes.length === 0 && profiles.length === 0) {
        console.log('✅ RLS correctly blocks access without user context');
      } else {
        console.log('❌ RLS may not be working - data accessible without context');
      }
    } catch (error) {
      console.log('❌ No context test error:', error.message);
    }

    // Test 3: Create test data with service account
    console.log('\n3. Creating test data with service account:');
    await prisma.$queryRaw`SET app.bypass_rls = true`;
    
    // Create test organization
    const testOrg = await prisma.organization.create({
      data: {
        name: 'Test RLS School',
        slug: 'test-rls-school',
        type: 'SCHOOL'
      }
    });

    // Create test users
    const testStudent = await prisma.user.create({
      data: {
        clerk_id: 'test_student_clerk_id',
        email: 'student@test.com',
        first_name: 'Test',
        last_name: 'Student',
        role: 'STUDENT'
      }
    });

    const testTeacher = await prisma.user.create({
      data: {
        clerk_id: 'test_teacher_clerk_id',
        email: 'teacher@test.com',
        first_name: 'Test',
        last_name: 'Teacher', 
        role: 'TEACHER'
      }
    });

    const testAdmin = await prisma.user.create({
      data: {
        clerk_id: 'test_admin_clerk_id',
        email: 'admin@test.com',
        first_name: 'Test',
        last_name: 'Admin',
        role: 'ADMIN'
      }
    });

    // Create test class
    const testClass = await prisma.class.create({
      data: {
        name: 'Test RLS Class',
        academic_year: '2024-2025',
        organization_id: testOrg.id,
        teacher_id: testTeacher.id
      }
    });

    // Create test enrollment
    await prisma.enrollment.create({
      data: {
        user_id: testStudent.id,
        class_id: testClass.id,
        enrollment_status: 'ACTIVE'
      }
    });

    // Create test profiles
    await prisma.profile.create({
      data: {
        user_id: testStudent.id,
        is_completed: true
      }
    });

    await prisma.profile.create({
      data: {
        user_id: testTeacher.id,
        is_completed: true
      }
    });

    console.log('✅ Test data created successfully');
    await prisma.$queryRaw`SET app.bypass_rls = false`;

    // Test 4: Student context - should only see own data
    console.log('\n4. Testing Student Context:');
    await prisma.$queryRaw`SET app.current_user_clerk_id = 'test_student_clerk_id'`;
    
    const studentUsers = await prisma.user.findMany();
    console.log(`Student sees ${studentUsers.length} user(s) (should be 1 - themselves)`);
    
    const studentClasses = await prisma.class.findMany();
    console.log(`Student sees ${studentClasses.length} class(es) (should be 1 - enrolled class)`);
    
    const studentProfiles = await prisma.profile.findMany();
    console.log(`Student sees ${studentProfiles.length} profile(s) (should be 1 - own profile)`);

    const studentEnrollments = await prisma.enrollment.findMany();
    console.log(`Student sees ${studentEnrollments.length} enrollment(s) (should be 1 - own enrollment)`);

    // Test 5: Teacher context - should see own data + enrolled students
    console.log('\n5. Testing Teacher Context:');
    await prisma.$queryRaw`SET app.current_user_clerk_id = 'test_teacher_clerk_id'`;
    
    const teacherUsers = await prisma.user.findMany();
    console.log(`Teacher sees ${teacherUsers.length} user(s) (should be 2 - self + enrolled student)`);
    
    const teacherClasses = await prisma.class.findMany();
    console.log(`Teacher sees ${teacherClasses.length} class(es) (should be 1 - own class)`);
    
    const teacherProfiles = await prisma.profile.findMany();
    console.log(`Teacher sees ${teacherProfiles.length} profile(s) (should be 2 - self + student)`);

    const teacherEnrollments = await prisma.enrollment.findMany();
    console.log(`Teacher sees ${teacherEnrollments.length} enrollment(s) (should be 1 - class enrollment)`);

    // Test 6: Admin context - should see all data
    console.log('\n6. Testing Admin Context:');
    await prisma.$queryRaw`SET app.current_user_clerk_id = 'test_admin_clerk_id'`;
    
    const adminUsers = await prisma.user.findMany();
    console.log(`Admin sees ${adminUsers.length} user(s) (should see all)`);
    
    const adminClasses = await prisma.class.findMany();
    console.log(`Admin sees ${adminClasses.length} class(es) (should see all)`);

    // Test 7: Test user update permissions
    console.log('\n7. Testing Update Permissions:');
    
    // Student should only update own profile
    await prisma.$queryRaw`SET app.current_user_clerk_id = 'test_student_clerk_id'`;
    try {
      await prisma.user.update({
        where: { id: testStudent.id },
        data: { first_name: 'Updated Student' }
      });
      console.log('✅ Student can update own profile');
    } catch (error) {
      console.log('❌ Student cannot update own profile:', error.message);
    }

    // Student should NOT update other user
    try {
      await prisma.user.update({
        where: { id: testTeacher.id },
        data: { first_name: 'Hacked Teacher' }
      });
      console.log('❌ SECURITY ISSUE: Student can update teacher profile!');
    } catch (error) {
      console.log('✅ Student correctly blocked from updating teacher profile');
    }

    console.log('\n8. Cleaning up test data...');
    await prisma.$queryRaw`SET app.bypass_rls = true`;
    
    // Clean up test data
    await prisma.enrollment.deleteMany({ where: { user_id: testStudent.id } });
    await prisma.profile.deleteMany({ where: { user_id: { in: [testStudent.id, testTeacher.id] } } });
    await prisma.class.deleteMany({ where: { id: testClass.id } });
    await prisma.user.deleteMany({ 
      where: { 
        clerk_id: { 
          in: ['test_student_clerk_id', 'test_teacher_clerk_id', 'test_admin_clerk_id'] 
        } 
      } 
    });
    await prisma.organization.deleteMany({ where: { id: testOrg.id } });
    
    await prisma.$queryRaw`RESET app.current_user_clerk_id`;
    await prisma.$queryRaw`SET app.bypass_rls = false`;
    
    console.log('✅ Test data cleaned up');
    console.log('\n🎉 RLS enforcement testing completed!');
    
  } catch (error) {
    console.error('❌ Error during RLS testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRLSEnforcement();
