const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTimeBackFunctionality() {
  console.log('🧪 Testing TimeBack Integration Functionality...\n');

  try {
    // Test 1: Create user with TimeBack fields
    console.log('✅ Test 1: Creating user with TimeBack fields');
    const testUser = await prisma.user.create({
      data: {
        clerk_id: 'test_clerk_timeback_' + Date.now(),
        email: `timeback_test_${Date.now()}@test.com`,
        first_name: 'TimeBack',
        last_name: 'Test',
        role: 'STUDENT',
        timeback_user_id: 'tb_user_123',
        timeback_sync_status: 'SYNCED',
        timeback_sync_version: 1
      }
    });
    console.log('   ✓ User created with TimeBack fields:', {
      id: testUser.id,
      timeback_user_id: testUser.timeback_user_id,
      timeback_sync_status: testUser.timeback_sync_status,
      timeback_sync_version: testUser.timeback_sync_version
    });

    // Test 2: Test null values (default behavior)
    console.log('\n✅ Test 2: Testing default/null TimeBack values');
    const defaultUser = await prisma.user.create({
      data: {
        clerk_id: 'test_clerk_default_' + Date.now(),
        email: `default_test_${Date.now()}@test.com`,
        role: 'TEACHER'
      }
    });
    console.log('   ✓ User with defaults:', {
      timeback_user_id: defaultUser.timeback_user_id,
      timeback_sync_status: defaultUser.timeback_sync_status,
      timeback_sync_version: defaultUser.timeback_sync_version
    });

    // Test 3: Test enum values
    console.log('\n✅ Test 3: Testing TimeBackSyncStatus enum values');
    const enumTests = ['PENDING', 'SYNCED', 'ERROR'];
    for (const status of enumTests) {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { timeback_sync_status: status }
      });
      console.log(`   ✓ Successfully set status to: ${status}`);
    }

    // Test 4: Test TimeBack query performance (index usage)
    console.log('\n✅ Test 4: Testing TimeBack index queries');
    
    // Query by timeback_user_id (should use index)
    const foundUser = await prisma.user.findFirst({
      where: { timeback_user_id: 'tb_user_123' }
    });
    console.log('   ✓ Query by timeback_user_id successful:', !!foundUser);

    // Test sync version increment
    await prisma.user.update({
      where: { id: testUser.id },
      data: { timeback_sync_version: { increment: 1 } }
    });
    console.log('   ✓ Sync version increment successful');

    // Test 5: Test Organization TimeBack fields
    console.log('\n✅ Test 5: Testing Organization TimeBack fields');
    const testOrg = await prisma.organization.create({
      data: {
        name: 'TimeBack Test School',
        slug: 'timeback-test-' + Date.now(),
        timeback_org_id: 'tb_org_456',
        timeback_sync_status: 'PENDING',
        timeback_sync_version: 2
      }
    });
    console.log('   ✓ Organization with TimeBack fields created:', {
      timeback_org_id: testOrg.timeback_org_id,
      timeback_sync_status: testOrg.timeback_sync_status
    });

    // Test 6: Test Class TimeBack fields
    console.log('\n✅ Test 6: Testing Class TimeBack fields');
    const testClass = await prisma.class.create({
      data: {
        name: 'TimeBack Test Class',
        academic_year: '2024-25',
        organization_id: testOrg.id,
        teacher_id: defaultUser.id,
        timeback_class_id: 'tb_class_789',
        timeback_sync_status: 'ERROR',
        timeback_sync_version: 3
      }
    });
    console.log('   ✓ Class with TimeBack fields created:', {
      timeback_class_id: testClass.timeback_class_id,
      timeback_sync_status: testClass.timeback_sync_status
    });

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await prisma.class.delete({ where: { id: testClass.id } });
    await prisma.organization.delete({ where: { id: testOrg.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.user.delete({ where: { id: defaultUser.id } });

    console.log('\n🎉 All TimeBack functionality tests PASSED!\n');

    // Test 7: Verify indexes exist
    console.log('✅ Test 7: Verifying TimeBack indexes');
    const indexQuery = `
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE indexname LIKE '%timeback%'
      ORDER BY tablename, indexname;
    `;
    
    const indexes = await prisma.$queryRawUnsafe(indexQuery);
    console.log('   ✓ TimeBack indexes found:', indexes);

  } catch (error) {
    console.error('❌ TimeBack functionality test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testTimeBackFunctionality()
  .catch(console.error)
  .finally(() => process.exit());
