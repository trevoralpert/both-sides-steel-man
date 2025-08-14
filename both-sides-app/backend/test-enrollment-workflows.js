/**
 * Test script for Enrollment Management workflows (Task 2.3.5.3)
 * Run with: node test-enrollment-workflows.js
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// You'll need to replace this with a real JWT token for testing
const JWT_TOKEN = 'your-jwt-token-here';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

// Sample test data
const sampleEnrollment = {
  user_id: "student_test_12345", // Will need real student ID
  class_id: "class_test_12345",  // Will need real class ID
  enrollment_status: "PENDING"
};

const sampleBulkEnrollments = {
  enrollments: [
    {
      user_id: "student_test_1",
      class_id: "class_test_12345",
      enrollment_status: "PENDING"
    },
    {
      user_id: "student_test_2", 
      class_id: "class_test_12345",
      enrollment_status: "PENDING"
    },
    {
      user_id: "student_test_3",
      class_id: "class_test_12345",
      enrollment_status: "ACTIVE"
    }
  ]
};

async function testEnrollmentWorkflows() {
  console.log('🚀 Testing Enrollment Management Workflows (Task 2.3.5.3)');
  console.log('========================================================\n');

  let createdEnrollmentId = null;

  try {
    // Test 1: Server connectivity and auth
    console.log('1️⃣ Testing server connectivity...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/users/me`, { headers });
      console.log(`   Status: ${healthResponse.status}`);
      if (healthResponse.status === 200) {
        console.log('   ✅ Server is running and authentication works');
      }
    } catch (error) {
      console.log('   ❌ Server connection failed:', error.response?.data?.message || error.message);
      return;
    }

    // Test 2: Create enrollment 
    console.log('\n2️⃣ Testing POST /api/enrollments (Enroll student)');
    try {
      const response = await axios.post(`${BASE_URL}/enrollments`, sampleEnrollment, { headers });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.data) {
        createdEnrollmentId = response.data.data.id;
        console.log(`   ✅ Enrollment created successfully! ID: ${createdEnrollmentId}`);
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
      console.log('   Full response:', JSON.stringify(error.response?.data, null, 2));
    }

    // Test 3: Enroll by username
    console.log('\n3️⃣ Testing POST /api/enrollments/by-username (Enroll by username)');
    try {
      const usernameEnrollment = {
        username: "test_student",
        class_id: "class_test_12345"
      };
      const response = await axios.post(`${BASE_URL}/enrollments/by-username`, usernameEnrollment, { headers });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 4: Enroll by email
    console.log('\n4️⃣ Testing POST /api/enrollments/by-email (Enroll by email)');
    try {
      const emailEnrollment = {
        email: "student@example.com",
        class_id: "class_test_12345"
      };
      const response = await axios.post(`${BASE_URL}/enrollments/by-email`, emailEnrollment, { headers });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 5: Bulk enrollment
    console.log('\n5️⃣ Testing POST /api/enrollments/bulk (Bulk enrollment)');
    try {
      const response = await axios.post(`${BASE_URL}/enrollments/bulk`, sampleBulkEnrollments, { headers });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      console.log('   ✅ Bulk enrollment completed');
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 6: Get all enrollments
    console.log('\n6️⃣ Testing GET /api/enrollments (List enrollments)');
    try {
      const response = await axios.get(`${BASE_URL}/enrollments`, {
        headers,
        params: {
          page: 1,
          limit: 10,
          enrollment_status: 'PENDING'
        }
      });
      console.log(`   Status: ${response.status}`);
      console.log(`   Found:`, response.data.pagination?.total || 0, 'enrollments');
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 7: Get current user enrollments
    console.log('\n7️⃣ Testing GET /api/enrollments/my (My enrollments)');
    try {
      const response = await axios.get(`${BASE_URL}/enrollments/my`, { headers });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 8: Get specific enrollment
    if (createdEnrollmentId) {
      console.log('\n8️⃣ Testing GET /api/enrollments/:id (Get enrollment details)');
      try {
        const response = await axios.get(`${BASE_URL}/enrollments/${createdEnrollmentId}`, { headers });
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        console.log('   ✅ Enrollment details retrieved successfully');
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

    // Test 9: Update enrollment status
    if (createdEnrollmentId) {
      console.log('\n9️⃣ Testing PATCH /api/enrollments/:id/status (Update status)');
      try {
        const statusUpdate = {
          enrollment_status: "ACTIVE",
          status_change_reason: "Student attended first class"
        };
        const response = await axios.patch(`${BASE_URL}/enrollments/${createdEnrollmentId}/status`, statusUpdate, { headers });
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        console.log('   ✅ Enrollment status updated successfully');
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

    // Test 10: Complete enrollment
    if (createdEnrollmentId) {
      console.log('\n🔟 Testing PATCH /api/enrollments/:id/complete (Complete enrollment)');
      try {
        const completionData = {
          final_grade: "A",
          completion_notes: "Excellent participation and critical thinking skills demonstrated"
        };
        const response = await axios.patch(`${BASE_URL}/enrollments/${createdEnrollmentId}/complete`, completionData, { headers });
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        console.log('   ✅ Enrollment completed successfully');
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

    // Test 11: Get class roster
    console.log('\n1️⃣1️⃣ Testing GET /api/enrollments/class/:classId/roster (Class roster)');
    try {
      const response = await axios.get(`${BASE_URL}/enrollments/class/class_test_12345/roster`, { headers });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 12: Export class roster
    console.log('\n1️⃣2️⃣ Testing GET /api/enrollments/class/:classId/export (Export roster)');
    try {
      const response = await axios.get(`${BASE_URL}/enrollments/class/class_test_12345/export`, {
        headers,
        params: { export_format: 'CSV' }
      });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.log('❌ Test suite failed:', error.message);
  }

  console.log('\n========================================================');
  console.log('🏁 Enrollment Workflow Testing Complete!');
}

async function testEnrollmentStatusTransitions() {
  console.log('\n🔄 Testing Enrollment Status Transition Workflows');
  console.log('================================================\n');

  const testEnrollmentId = "enrollment_test_12345"; // Will need real enrollment ID

  // Test valid status transitions
  const validTransitions = [
    { from: 'PENDING', to: 'ACTIVE', endpoint: 'status' },
    { from: 'ACTIVE', to: 'COMPLETED', endpoint: 'complete' },
    { from: 'ACTIVE', to: 'DROPPED', endpoint: 'drop' },
    { from: 'ACTIVE', to: 'WITHDRAWN', endpoint: 'withdraw' }
  ];

  for (let i = 0; i < validTransitions.length; i++) {
    const transition = validTransitions[i];
    console.log(`${i + 1}️⃣ Testing ${transition.from} → ${transition.to} transition...`);
    
    try {
      let url, data;
      
      if (transition.endpoint === 'status') {
        url = `${BASE_URL}/enrollments/${testEnrollmentId}/status`;
        data = { 
          enrollment_status: transition.to,
          status_change_reason: `Testing ${transition.from} to ${transition.to} transition`
        };
      } else if (transition.endpoint === 'complete') {
        url = `${BASE_URL}/enrollments/${testEnrollmentId}/complete`;
        data = {
          final_grade: "B+",
          completion_notes: "Successfully completed course requirements"
        };
      } else if (transition.endpoint === 'drop') {
        url = `${BASE_URL}/enrollments/${testEnrollmentId}/drop`;
        data = {
          drop_reason: "Student requested to drop course",
          allow_re_enrollment: true
        };
      } else if (transition.endpoint === 'withdraw') {
        url = `${BASE_URL}/enrollments/${testEnrollmentId}/withdraw`;
        data = {
          withdrawal_reason: "Student transferred schools",
          is_permanent: true
        };
      }

      const response = await axios.patch(url, data, { headers });
      console.log(`   Status: ${response.status}`);
      console.log(`   ✅ ${transition.from} → ${transition.to} transition successful`);
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ⚠️  Enrollment not found (expected with test ID)`);
      } else if (error.response?.status === 400) {
        console.log(`   ❌ Invalid transition rejected properly`);
      } else {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }
  }

  // Test invalid status transitions
  console.log('\n📋 Testing invalid status transitions...');
  const invalidTransitions = [
    { from: 'COMPLETED', to: 'PENDING' },
    { from: 'WITHDRAWN', to: 'ACTIVE' },
    { from: 'DROPPED', to: 'COMPLETED' }
  ];

  for (const transition of invalidTransitions) {
    console.log(`Testing invalid ${transition.from} → ${transition.to}...`);
    try {
      const response = await axios.patch(`${BASE_URL}/enrollments/${testEnrollmentId}/status`, {
        enrollment_status: transition.to,
        status_change_reason: `Testing invalid ${transition.from} to ${transition.to}`
      }, { headers });
      console.log(`   ⚠️  Unexpected success - this transition should be invalid`);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(`   ✅ Invalid transition properly rejected`);
      } else {
        console.log('   ❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }
  }

  console.log('\n================================================');
  console.log('🎯 Enrollment Status Transition Testing Complete!');
}

async function testEnrollmentConstraintsAndValidation() {
  console.log('\n🔍 Testing Enrollment Constraints and Validation');
  console.log('==============================================\n');

  // Test 1: Duplicate enrollment prevention
  console.log('1️⃣ Testing duplicate enrollment prevention...');
  try {
    const response = await axios.post(`${BASE_URL}/enrollments`, sampleEnrollment, { headers });
    console.log(`   First enrollment status: ${response.status}`);
    
    // Try to enroll the same student again
    const duplicateResponse = await axios.post(`${BASE_URL}/enrollments`, sampleEnrollment, { headers });
    console.log('   ⚠️  Unexpected success - duplicate enrollments should be prevented');
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('   ✅ Duplicate enrollment properly rejected');
    } else {
      console.log('   ❌ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  // Test 2: Class capacity limits
  console.log('\n2️⃣ Testing class capacity enforcement...');
  try {
    // This would require a class with max_students=1 and trying to enroll 2 students
    const capacityTest = {
      user_id: "capacity_test_student",
      class_id: "small_class_test"
    };
    const response = await axios.post(`${BASE_URL}/enrollments`, capacityTest, { headers });
    console.log('   ⚠️  Note: Capacity testing requires specific test data setup');
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message?.includes('capacity')) {
      console.log('   ✅ Class capacity properly enforced');
    } else {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }
  }

  // Test 3: Student role validation
  console.log('\n3️⃣ Testing student role validation...');
  try {
    const teacherEnrollment = {
      user_id: "teacher_test_12345", // Should be a teacher, not student
      class_id: "class_test_12345"
    };
    const response = await axios.post(`${BASE_URL}/enrollments`, teacherEnrollment, { headers });
    console.log('   ⚠️  Unexpected success - non-students should not be enrollable');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ Non-student role properly rejected');
    } else {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }
  }

  // Test 4: Inactive class enrollment prevention
  console.log('\n4️⃣ Testing inactive class enrollment prevention...');
  try {
    const inactiveClassEnrollment = {
      user_id: "student_test_12345",
      class_id: "inactive_class_test"
    };
    const response = await axios.post(`${BASE_URL}/enrollments`, inactiveClassEnrollment, { headers });
    console.log('   ⚠️  Unexpected success - enrollment in inactive classes should be prevented');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ Inactive class enrollment properly rejected');
    } else {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }
  }

  console.log('\n==============================================');
  console.log('🎯 Enrollment Constraints Testing Complete!');
}

async function testEnrollmentReportsAndAnalytics() {
  console.log('\n📊 Testing Enrollment Reports and Analytics');
  console.log('==========================================\n');

  // Test 1: Enrollment analytics
  console.log('1️⃣ Testing GET /api/enrollments/analytics (Enrollment analytics)');
  try {
    const response = await axios.get(`${BASE_URL}/enrollments/analytics`, {
      headers,
      params: {
        time_period: '30_days',
        organization_id: 'org_test_12345'
      }
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test 2: Student enrollment history
  console.log('\n2️⃣ Testing GET /api/enrollments/student/:studentId (Student history)');
  try {
    const response = await axios.get(`${BASE_URL}/enrollments/student/student_test_12345`, { headers });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test 3: Teacher enrollment overview
  console.log('\n3️⃣ Testing GET /api/enrollments/teacher/:teacherId (Teacher overview)');
  try {
    const response = await axios.get(`${BASE_URL}/enrollments/teacher/teacher_test_12345`, { headers });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test 4: Organization enrollment summary
  console.log('\n4️⃣ Testing GET /api/enrollments/organization/:orgId (Organization summary)');
  try {
    const response = await axios.get(`${BASE_URL}/enrollments/organization/org_test_12345`, { headers });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  console.log('\n==========================================');
  console.log('🎯 Enrollment Analytics Testing Complete!');
}

async function testAdvancedEnrollmentOperations() {
  console.log('\n⚡ Testing Advanced Enrollment Operations');
  console.log('=======================================\n');

  // Test 1: Bulk status updates
  console.log('1️⃣ Testing POST /api/enrollments/bulk-status (Bulk status update)');
  try {
    const bulkStatusUpdate = {
      enrollment_ids: ["enrollment_1", "enrollment_2", "enrollment_3"],
      new_status: "ACTIVE",
      status_change_reason: "Semester started - activating all pending enrollments"
    };
    const response = await axios.post(`${BASE_URL}/enrollments/bulk-status`, bulkStatusUpdate, { headers });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test 2: Transfer enrollment
  console.log('\n2️⃣ Testing POST /api/enrollments/transfer (Transfer enrollment)');
  try {
    const transferData = {
      enrollment_id: "enrollment_test_12345",
      target_class_id: "new_class_test_12345",
      transfer_reason: "Student requested section change"
    };
    const response = await axios.post(`${BASE_URL}/enrollments/transfer`, transferData, { headers });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test 3: Drop enrollment
  console.log('\n3️⃣ Testing PATCH /api/enrollments/:id/drop (Drop enrollment)');
  try {
    const dropData = {
      drop_reason: "Course too challenging for current level",
      allow_re_enrollment: true
    };
    const response = await axios.patch(`${BASE_URL}/enrollments/enrollment_test_12345/drop`, dropData, { headers });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test 4: Withdraw enrollment
  console.log('\n4️⃣ Testing PATCH /api/enrollments/:id/withdraw (Withdraw enrollment)');
  try {
    const withdrawData = {
      withdrawal_reason: "Student transferred to different school",
      is_permanent: true
    };
    const response = await axios.patch(`${BASE_URL}/enrollments/enrollment_test_12345/withdraw`, withdrawData, { headers });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  console.log('\n=======================================');
  console.log('🎯 Advanced Enrollment Operations Testing Complete!');
}

// Main test execution
if (require.main === module) {
  console.log('⚠️  Note: You need to replace JWT_TOKEN with a valid token and update test IDs.');
  console.log('⚠️  Make sure you have valid user_id, class_id, and organization_id values.');
  console.log('⚠️  Some tests may fail if no test data exists in the database yet.\n');
  
  if (JWT_TOKEN === 'your-jwt-token-here') {
    console.log('❌ JWT_TOKEN not configured. Update the token in this file first.');
    console.log('   You can get a token by:');
    console.log('   1. Running: node create-test-token.js');
    console.log('   2. Using Clerk\'s test tokens');
    console.log('   3. Creating a user and getting their JWT from the frontend\n');
  } else {
    // Run all test suites in sequence
    Promise.resolve()
      .then(() => testEnrollmentWorkflows())
      .then(() => testEnrollmentStatusTransitions())
      .then(() => testEnrollmentConstraintsAndValidation())
      .then(() => testEnrollmentReportsAndAnalytics())
      .then(() => testAdvancedEnrollmentOperations())
      .catch(console.error);
  }
}

module.exports = {
  testEnrollmentWorkflows,
  testEnrollmentStatusTransitions,
  testEnrollmentConstraintsAndValidation,
  testEnrollmentReportsAndAnalytics,
  testAdvancedEnrollmentOperations
};
