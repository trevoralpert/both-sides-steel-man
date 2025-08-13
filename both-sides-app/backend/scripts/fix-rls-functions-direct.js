const { PrismaClient } = require('@prisma/client');

async function fixRLSFunctions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing RLS Functions Directly...\n');

    // Fix current_user_id() function
    console.log('1. Fixing current_user_id() function...');
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION public.current_user_id()
      RETURNS TEXT AS $$
      DECLARE
        current_clerk_id TEXT;
        found_user_id TEXT;
      BEGIN
        current_clerk_id := public.current_user_clerk_id();
        
        IF current_clerk_id IS NULL OR current_clerk_id = '' THEN
          RETURN NULL;
        END IF;
        
        SELECT id INTO found_user_id 
        FROM "public"."users" 
        WHERE clerk_id = current_clerk_id;
        
        RETURN found_user_id;
      EXCEPTION
        WHEN others THEN
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    console.log('✅ Fixed current_user_id() function');

    // Fix current_user_role() function
    console.log('2. Fixing current_user_role() function...');
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION public.current_user_role()
      RETURNS "UserRole" AS $$
      DECLARE
        current_clerk_id TEXT;
        found_user_role "UserRole";
      BEGIN
        current_clerk_id := public.current_user_clerk_id();
        
        IF current_clerk_id IS NULL OR current_clerk_id = '' THEN
          RETURN NULL;
        END IF;
        
        SELECT role INTO found_user_role 
        FROM "public"."users" 
        WHERE clerk_id = current_clerk_id AND is_active = true;
        
        RETURN found_user_role;
      EXCEPTION
        WHEN others THEN
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    console.log('✅ Fixed current_user_role() function');

    // Test the fixed functions
    console.log('\n3. Testing fixed functions...');
    
    // Create test data
    await prisma.$queryRaw`SET app.bypass_rls = true`;
    const testUser = await prisma.user.create({
      data: {
        clerk_id: 'test_function_fix',
        email: 'test@function.com',
        role: 'STUDENT'
      }
    });
    await prisma.$queryRaw`SET app.bypass_rls = false`;

    // Test with user context
    await prisma.$queryRaw`SET app.current_user_clerk_id = 'test_function_fix'`;
    
    const functionTest = await prisma.$queryRaw`
      SELECT 
        public.current_user_clerk_id() as clerk_id,
        public.current_user_id() as user_id,
        public.current_user_role() as user_role
    `;
    
    console.log('Function test results:');
    console.table(functionTest);

    // Clean up
    await prisma.$queryRaw`SET app.bypass_rls = true`;
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$queryRaw`RESET app.current_user_clerk_id`;
    await prisma.$queryRaw`SET app.bypass_rls = false`;

    console.log('\n🎉 RLS functions fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing functions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRLSFunctions();
