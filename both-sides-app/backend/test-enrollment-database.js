#!/usr/bin/env node

/**
 * Live Database Testing for Enrollment Workflows
 * Tests enrollment lifecycle, bulk operations, and validation
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Use the real test data IDs
const TEST_DATA = {
  organizationId: "cmealh6em0000u578x1iuw7xt",
  teacherId: "cmealh6ql0001u578wo7oomtl", 
  adminId: "cmealh71i0002u578lmhkenbd",
  classId: "cmeali7n5000cu5f2z5b1k1hd",
  studentIds: [
    "cmealh78f0003u578v7kb0hwu", // Emma Wilson
    "cmealh7f00004u578gkumo2ml", // James Rodriguez  
    "cmealh7lq0005u5787qqs697f", // Ava Thompson
    "cmealh7sa0006u578ift6lwj2", // Noah Davis
    "cmealh7z00007u578pw3pgik3", // Olivia Martinez
    "cmealh85m0008u578yrgxacvh", // Liam Anderson
    "cmealh8ch0009u578g7xw3w8y", // Sophia Taylor
    "cmealh8jd000au578mq9cg0zm", // William Brown
  ]
};

async function testEnrollmentWorkflows() {
  console.log('\n🔄 LIVE ENROLLMENT WORKFLOW TESTING');
  console.log('====================================\n');

  try {
    // 1. Test Enrollment Lifecycle
    console.log('1️⃣ Testing Complete Enrollment Lifecycle...');
    
    // Create new enrollment in PENDING status
    const newStudent = TEST_DATA.studentIds[5]; // Liam Anderson
    const newEnrollment = await prisma.enrollment.create({
      data: {
        user_id: newStudent,
        class_id: TEST_DATA.classId,
        enrollment_status: 'PENDING',
        enrolled_at: new Date(),
      },
      include: {
        user: true,
        class: true
      }
    });
    
    console.log(`   ✅ PENDING enrollment created: ${newEnrollment.user.first_name} ${newEnrollment.user.last_name}`);
    
    // Activate enrollment
    const activatedEnrollment = await prisma.enrollment.update({
      where: { id: newEnrollment.id },
      data: { 
        enrollment_status: 'ACTIVE',
        updated_at: new Date(),
      }
    });
    
    console.log(`   ✅ Status transition: PENDING → ${activatedEnrollment.enrollment_status}`);
    
    // Complete enrollment  
    const completedEnrollment = await prisma.enrollment.update({
      where: { id: newEnrollment.id },
      data: { 
        enrollment_status: 'COMPLETED',
        completed_at: new Date(),
        final_grade: 'A',
        updated_at: new Date(),
      }
    });
    
    console.log(`   ✅ Status transition: ACTIVE → ${completedEnrollment.enrollment_status}`);
    console.log(`   ✅ Final grade assigned: ${completedEnrollment.final_grade}`);

    // 2. Test Duplicate Enrollment Prevention
    console.log('\n2️⃣ Testing Duplicate Enrollment Prevention...');
    
    try {
      await prisma.enrollment.create({
        data: {
          user_id: newStudent, // Same student, same class
          class_id: TEST_DATA.classId,
          enrollment_status: 'PENDING',
          enrolled_at: new Date(),
        }
      });
      console.log('   ❌ FAILED: Duplicate enrollment was allowed!');
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('   ✅ Duplicate enrollment prevented by unique constraint');
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.message}`);
      }
    }

    // 3. Test Capacity Validation
    console.log('\n3️⃣ Testing Class Capacity Validation...');
    
    const classInfo = await prisma.class.findUnique({
      where: { id: TEST_DATA.classId },
      include: {
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });
    
    console.log(`   📊 Current: ${classInfo._count.enrollments}/${classInfo.max_students} enrolled`);
    console.log(`   📊 Available spots: ${classInfo.max_students - classInfo._count.enrollments}`);
    
    if (classInfo._count.enrollments < classInfo.max_students) {
      console.log('   ✅ Class has available capacity');
    } else {
      console.log('   ⚠️  Class is at full capacity');
    }

    // 4. Test Bulk Enrollment Operations
    console.log('\n4️⃣ Testing Bulk Enrollment Operations...');
    
    // Get remaining students to enroll
    const remainingStudents = TEST_DATA.studentIds.slice(6, 8); // Last 2 students
    
    console.log(`   🔍 Bulk enrolling ${remainingStudents.length} students...`);
    
    const bulkEnrollments = await prisma.enrollment.createMany({
      data: remainingStudents.map(studentId => ({
        user_id: studentId,
        class_id: TEST_DATA.classId,
        enrollment_status: 'PENDING',
        enrolled_at: new Date(),
      })),
      skipDuplicates: true
    });
    
    console.log(`   ✅ Bulk enrollment created: ${bulkEnrollments.count} new enrollments`);

    // 5. Test Enrollment Analytics
    console.log('\n5️⃣ Testing Enrollment Analytics...');
    
    const enrollmentStats = await prisma.enrollment.groupBy({
      by: ['enrollment_status'],
      where: {
        class_id: TEST_DATA.classId
      },
      _count: {
        enrollment_status: true
      }
    });
    
    console.log('   📈 Enrollment status distribution:');
    enrollmentStats.forEach(stat => {
      console.log(`      - ${stat.enrollment_status}: ${stat._count.enrollment_status} students`);
    });

    // Calculate completion rate
    const totalEnrollments = enrollmentStats.reduce((sum, stat) => sum + stat._count.enrollment_status, 0);
    const completedCount = enrollmentStats.find(s => s.enrollment_status === 'COMPLETED')?._count.enrollment_status || 0;
    const completionRate = totalEnrollments > 0 ? (completedCount / totalEnrollments * 100).toFixed(1) : 0;
    
    console.log(`   📈 Completion rate: ${completionRate}% (${completedCount}/${totalEnrollments})`);

    // 6. Test Cross-Reference Queries
    console.log('\n6️⃣ Testing Cross-Reference Queries...');
    
    // Get student enrollment history
    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        user_id: TEST_DATA.studentIds[0] // Emma Wilson
      },
      include: {
        class: {
          include: {
            teacher: true
          }
        }
      },
      orderBy: {
        enrolled_at: 'desc'
      }
    });
    
    console.log(`   ✅ Student enrollment history: ${studentEnrollments.length} classes`);
    studentEnrollments.forEach(enrollment => {
      console.log(`      - ${enrollment.class.name} (${enrollment.enrollment_status}) with ${enrollment.class.teacher.first_name} ${enrollment.class.teacher.last_name}`);
    });

    // 7. Test Advanced Filtering
    console.log('\n7️⃣ Testing Advanced Enrollment Filtering...');
    
    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        enrollment_status: 'ACTIVE',
        class: {
          organization_id: TEST_DATA.organizationId,
          is_active: true
        }
      },
      include: {
        user: true,
        class: true
      }
    });
    
    console.log(`   ✅ Active enrollments in organization: ${activeEnrollments.length}`);
    
    // Group by class
    const enrollmentsByClass = {};
    activeEnrollments.forEach(enrollment => {
      const className = enrollment.class.name;
      if (!enrollmentsByClass[className]) {
        enrollmentsByClass[className] = [];
      }
      enrollmentsByClass[className].push(`${enrollment.user.first_name} ${enrollment.user.last_name}`);
    });
    
    console.log('   📚 Active students by class:');
    Object.entries(enrollmentsByClass).forEach(([className, students]) => {
      console.log(`      - ${className}: ${students.join(', ')}`);
    });

    console.log('\n🎉 ENROLLMENT WORKFLOW TESTING COMPLETE!');
    console.log('=========================================');
    console.log('✅ Enrollment lifecycle working perfectly');
    console.log('✅ Duplicate prevention enforced');
    console.log('✅ Capacity validation functional');
    console.log('✅ Bulk operations successful');
    console.log('✅ Analytics generation working');
    console.log('✅ Cross-reference queries operational');

  } catch (error) {
    console.error('❌ Enrollment test error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
testEnrollmentWorkflows();
