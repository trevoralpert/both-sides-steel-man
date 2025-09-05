import { PrismaClient } from '@prisma/client';
import { IntegrationStatus, SyncStatus, WebhookEventStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🌱 Seeding test database...');

  try {
    // Clean existing test data
    await cleanDatabase();

    // Create test integrations
    const testIntegration = await prisma.integration.create({
      data: {
        id: 'test-integration',
        name: 'Test Integration',
        type: 'timeback',
        status: IntegrationStatus.ACTIVE,
        enabled: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test integration configuration
    await prisma.integrationConfiguration.create({
      data: {
        integrationId: 'test-integration',
        key: 'test-config',
        value: JSON.stringify({
          baseUrl: 'http://localhost:3001',
          apiKey: 'test-api-key',
          schoolId: 'test-school',
          timeout: 30000,
          retryAttempts: 3,
          webhooks: {
            enabled: true,
            secret: 'test-webhook-secret',
            url: 'http://localhost:3000/webhooks/test',
          },
        }),
        encrypted: false,
        environment: 'test',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test organizations
    const organization = await prisma.organization.create({
      data: {
        id: 'org-1',
        name: 'Test Organization',
        description: 'A test organization for integration testing',
        external_id: 'ext-org-1',
        external_system_id: 'test-integration',
        sync_status: SyncStatus.SYNCED,
        last_sync_at: new Date(),
        sync_version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test users
    const users = await Promise.all([
      prisma.user.create({
        data: {
          id: 'user-1',
          clerkId: 'test_clerk_1',
          email: 'test1@example.com',
          firstName: 'Test',
          lastName: 'User One',
          role: 'student',
          organizationId: organization.id,
          external_id: 'ext-user-1',
          external_system_id: 'test-integration',
          sync_status: SyncStatus.SYNCED,
          last_sync_at: new Date(),
          sync_version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.user.create({
        data: {
          id: 'user-2',
          clerkId: 'test_clerk_2',
          email: 'test2@example.com',
          firstName: 'Test',
          lastName: 'User Two',
          role: 'teacher',
          organizationId: organization.id,
          external_id: 'ext-user-2',
          external_system_id: 'test-integration',
          sync_status: SyncStatus.SYNCED,
          last_sync_at: new Date(),
          sync_version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    ]);

    // Create test classes
    const testClass = await prisma.class.create({
      data: {
        id: 'class-1',
        name: 'Test Class',
        description: 'A test class for integration testing',
        organizationId: organization.id,
        teacherId: users[1].id, // Teacher user
        external_id: 'ext-class-1',
        external_system_id: 'test-integration',
        sync_status: SyncStatus.SYNCED,
        last_sync_at: new Date(),
        sync_version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test enrollments
    await prisma.enrollment.create({
      data: {
        id: 'enroll-1',
        userId: users[0].id, // Student user
        classId: testClass.id,
        role: 'student',
        external_id: 'ext-enroll-1',
        external_system_id: 'test-integration',
        sync_status: SyncStatus.SYNCED,
        last_sync_at: new Date(),
        sync_version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test external system mappings
    await Promise.all([
      prisma.externalSystemMapping.create({
        data: {
          externalId: 'ext-org-1',
          externalSystemId: 'test-integration',
          internalId: organization.id,
          entityType: 'organization',
          lastSyncAt: new Date(),
          syncVersion: '1.0.0',
          metadata: JSON.stringify({ source: 'test-seed' }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.externalSystemMapping.create({
        data: {
          externalId: 'ext-user-1',
          externalSystemId: 'test-integration',
          internalId: users[0].id,
          entityType: 'user',
          lastSyncAt: new Date(),
          syncVersion: '1.0.0',
          metadata: JSON.stringify({ source: 'test-seed' }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.externalSystemMapping.create({
        data: {
          externalId: 'ext-user-2',
          externalSystemId: 'test-integration',
          internalId: users[1].id,
          entityType: 'user',
          lastSyncAt: new Date(),
          syncVersion: '1.0.0',
          metadata: JSON.stringify({ source: 'test-seed' }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      prisma.externalSystemMapping.create({
        data: {
          externalId: 'ext-class-1',
          externalSystemId: 'test-integration',
          internalId: testClass.id,
          entityType: 'class',
          lastSyncAt: new Date(),
          syncVersion: '1.0.0',
          metadata: JSON.stringify({ source: 'test-seed' }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    ]);

    // Create test integration status logs
    await prisma.integrationStatusLog.create({
      data: {
        integrationId: 'test-integration',
        status: IntegrationStatus.ACTIVE,
        message: 'Integration initialized for testing',
        details: JSON.stringify({ 
          test: true,
          seeded: true,
          entities: {
            organizations: 1,
            users: 2,
            classes: 1,
            enrollments: 1,
          },
        }),
        createdAt: new Date(),
      },
    });

    // Create test webhook and events
    const webhook = await prisma.integrationWebhook.create({
      data: {
        integrationId: 'test-integration',
        url: 'http://localhost:3000/webhooks/test',
        secret: 'test-webhook-secret',
        enabled: true,
        events: ['user.created', 'user.updated', 'class.created', 'enrollment.created'],
        headers: JSON.stringify({ 'Content-Type': 'application/json' }),
        retryPolicy: JSON.stringify({ 
          maxRetries: 3, 
          backoffMultiplier: 2,
          initialDelay: 1000,
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await prisma.integrationWebhookEvent.create({
      data: {
        webhookId: webhook.id,
        eventType: 'user.created',
        status: WebhookEventStatus.SUCCESS,
        payload: JSON.stringify({
          id: 'ext-user-1',
          email: 'test1@example.com',
          firstName: 'Test',
          lastName: 'User One',
          role: 'student',
        }),
        response: JSON.stringify({ status: 200, message: 'OK' }),
        attempts: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test audit logs
    await Promise.all([
      prisma.integrationAuditLog.create({
        data: {
          integrationId: 'test-integration',
          action: 'CREATE',
          entityType: 'user',
          entityId: users[0].id,
          externalId: 'ext-user-1',
          changes: JSON.stringify({
            before: null,
            after: {
              email: 'test1@example.com',
              firstName: 'Test',
              lastName: 'User One',
              role: 'student',
            },
          }),
          userId: 'system',
          ipAddress: '127.0.0.1',
          userAgent: 'test-seed-script',
          createdAt: new Date(),
        },
      }),
      prisma.integrationAuditLog.create({
        data: {
          integrationId: 'test-integration',
          action: 'CREATE',
          entityType: 'class',
          entityId: testClass.id,
          externalId: 'ext-class-1',
          changes: JSON.stringify({
            before: null,
            after: {
              name: 'Test Class',
              description: 'A test class for integration testing',
              teacherId: users[1].id,
            },
          }),
          userId: 'system',
          ipAddress: '127.0.0.1',
          userAgent: 'test-seed-script',
          createdAt: new Date(),
        },
      }),
    ]);

    console.log('✅ Test database seeded successfully!');
    console.log('   📊 Created:');
    console.log('      • 1 Integration');
    console.log('      • 1 Organization');
    console.log('      • 2 Users (1 student, 1 teacher)');
    console.log('      • 1 Class');
    console.log('      • 1 Enrollment');
    console.log('      • 4 External System Mappings');
    console.log('      • 1 Webhook with 1 Event');
    console.log('      • 2 Audit Log entries');

  } catch (error) {
    console.error('❌ Error seeding test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanDatabase() {
  console.log('🧹 Cleaning existing test data...');

  // Delete in reverse order of dependencies
  await prisma.integrationWebhookEvent.deleteMany();
  await prisma.integrationWebhook.deleteMany();
  await prisma.integrationAuditLog.deleteMany();
  await prisma.integrationStatusLog.deleteMany();
  await prisma.externalSystemMapping.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.integrationConfiguration.deleteMany();
  await prisma.integration.deleteMany();

  console.log('   ✅ Database cleaned');
}

// Main execution
if (require.main === module) {
  seedTestData()
    .then(() => {
      console.log('🎉 Test database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test database setup failed:', error);
      process.exit(1);
    });
}

export { seedTestData, cleanDatabase };
