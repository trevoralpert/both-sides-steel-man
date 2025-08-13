const { PrismaClient } = require('@prisma/client');

async function debugRLSPolicies() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🐛 Debugging RLS Policies...\n');

    // Check all current policies
    console.log('Current RLS Policies:');
    const policies = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE schemaname = 'public'
        AND tablename = 'users'
      ORDER BY tablename, policyname
    `;
    console.table(policies);

    // Test function behavior
    console.log('\nTesting functions without user context:');
    await prisma.$queryRaw`RESET app.current_user_clerk_id`;
    const noContext = await prisma.$queryRaw`
      SELECT 
        public.current_user_clerk_id() as clerk_id,
        public.current_user_id() as user_id,
        public.current_user_role() as user_role,
        public.is_service_account() as is_service
    `;
    console.table(noContext);

    // Create minimal test data
    console.log('\nCreating minimal test data...');
    await prisma.$queryRaw`SET app.bypass_rls = true`;
    
    const testStudent = await prisma.user.create({
      data: {
        clerk_id: 'debug_student',
        email: 'debug@student.com',
        role: 'STUDENT'
      }
    });

    const testTeacher = await prisma.user.create({
      data: {
        clerk_id: 'debug_teacher',
        email: 'debug@teacher.com',
        role: 'TEACHER'
      }
    });

    await prisma.$queryRaw`SET app.bypass_rls = false`;

    // Test student context step by step
    console.log('\n🧑‍🎓 Setting student context...');
    await prisma.$queryRaw`SET app.current_user_clerk_id = 'debug_student'`;
    
    console.log('Functions with student context:');
    const studentContext = await prisma.$queryRaw`
      SELECT 
        public.current_user_clerk_id() as clerk_id,
        public.current_user_id() as user_id,
        public.current_user_role() as user_role,
        public.is_service_account() as is_service
    `;
    console.table(studentContext);

    // Try individual policy tests
    console.log('\nTesting individual policies for student:');
    
    // Test users_view_own
    console.log('1. Testing users_view_own policy:');
    try {
      const ownUser = await prisma.$queryRaw`
        SELECT id, clerk_id, role 
        FROM "public"."users" 
        WHERE clerk_id = public.current_user_clerk_id()
      `;
      console.log('Own user:', ownUser);
    } catch (error) {
      console.log('Error:', error.message);
    }

    // Test all users visible to student
    console.log('\n2. All users visible to student:');
    try {
      const allUsers = await prisma.$queryRaw`
        SELECT id, clerk_id, role 
        FROM "public"."users"
      `;
      console.log('All users visible:', allUsers);
    } catch (error) {
      console.log('Error:', error.message);
    }

    // Check which policies are allowing access
    console.log('\n3. Testing specific policy conditions:');
    
    // Test admin condition
    const isAdmin = await prisma.$queryRaw`
      SELECT (public.current_user_role() = 'ADMIN') as is_admin_role
    `;
    console.log('Is admin role:', isAdmin);

    // Test service account condition  
    const isService = await prisma.$queryRaw`
      SELECT public.is_service_account() as is_service
    `;
    console.log('Is service account:', isService);

    // Clean up
    await prisma.$queryRaw`SET app.bypass_rls = true`;
    await prisma.user.deleteMany({
      where: {
        clerk_id: { in: ['debug_student', 'debug_teacher'] }
      }
    });
    await prisma.$queryRaw`RESET app.current_user_clerk_id`;
    await prisma.$queryRaw`SET app.bypass_rls = false`;

    console.log('\n✅ Debug completed');

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRLSPolicies();
