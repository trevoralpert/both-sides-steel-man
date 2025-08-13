const { PrismaClient } = require('@prisma/client');

async function testRLSStatus() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing RLS Status...\n');

    // Test 1: Check if RLS is enabled on tables
    console.log('1. Checking if RLS is enabled on tables:');
    const rlsStatus = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('users', 'profiles', 'classes', 'enrollments', 'organizations', 'audit_logs')
    `;
    console.table(rlsStatus);

    // Test 2: List RLS policies
    console.log('\n2. Checking RLS policies:');
    const policies = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        cmd
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `;
    console.table(policies);

    // Test 3: Check if custom functions exist
    console.log('\n3. Checking custom functions:');
    const functions = await prisma.$queryRaw`
      SELECT 
        routine_name, 
        routine_type,
        routine_schema
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name IN ('current_user_clerk_id', 'current_user_id', 'current_user_role', 'is_service_account')
      ORDER BY routine_name
    `;
    console.table(functions);

    // Test 4: Try calling functions (should return NULL when no context set)
    console.log('\n4. Testing function calls (should return NULL/false without user context):');
    try {
      const functionTest = await prisma.$queryRaw`
        SELECT 
          public.current_user_clerk_id() as clerk_id,
          public.current_user_id() as user_id,
          public.current_user_role() as user_role,
          public.is_service_account() as is_service
      `;
      console.table(functionTest);
    } catch (error) {
      console.log('❌ Function test failed:', error.message);
    }

    console.log('\n✅ RLS status check completed!');

  } catch (error) {
    console.error('❌ Error testing RLS status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRLSStatus();
