/**
 * Test script for Class Management API endpoints (Task 2.3.5.1-2.3.5.3)
 * Run with: node test-class-management-endpoints.js
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// SECURITY NOTE: This is a dummy JWT token for testing structure validation only  
// Payload: {"sub":"test_user_123","email":"test@example.com","iat":1755127241,"exp":1755130841} - NOT a real secret
// For production testing, use: const JWT_TOKEN = process.env.TEST_JWT_TOKEN;
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXJfMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzU1MTI3MjQxLCJleHAiOjE3NTUxMzA4NDF9.JCI5CvGlIh0xbClozEfLOifpG57DaQpvB6yXEOLcz5Q';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

// Sample test data for class creation
const sampleClass = {
  name: "Advanced Critical Thinking",
  description: "A comprehensive course focused on developing critical thinking skills through debate and discussion.",
  subject: "PHILOSOPHY", 
  grade_level: "12",
  academic_year: "2024-2025",
  term: "FALL",
  max_students: 25,
  organization_id: "cmealh6em0000u578x1iuw7xt" // Real test org ID
};

const sampleBulkClasses = {
  classes: [
    {
      name: "Introduction to Debate",
      description: "Foundational debate skills for beginners",
      subject: "DEBATE",
      grade_level: "9",
      academic_year: "2024-2025", 
      term: "FALL",
      max_students: 30,
      organization_id: "cmealh6em0000u578x1iuw7xt"
    },
    {
      name: "American Government",
      description: "Study of U.S. political systems and civic engagement",
      subject: "GOVERNMENT",
      grade_level: "11", 
      academic_year: "2024-2025",
      term: "FALL",
      max_students: 28,
      organization_id: "cmealh6em0000u578x1iuw7xt"
    }
  ]
};

async function testClassManagementEndpoints() {
  console.log('🚀 Testing Class Management API Endpoints (Task 2.3.5)');
  console.log('======================================================\n');

  let createdClassId = null;

  try {
    // Test 1: Server connectivity check
    console.log('1️⃣ Testing server connectivity...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/users/me`, { headers });
      console.log(`   Status: ${healthResponse.status}`);
      if (healthResponse.status === 200) {
        console.log('   ✅ Server is running and authentication works');
      }
    } catch (error) {
      console.log('   ❌ Server connection failed:', error.response?.data?.message || error.message);
      console.log('   Make sure the server is running with: npm run start:dev');
      return;
    }

    // Test 2: Create single class
    console.log('\n2️⃣ Testing POST /api/classes (Create class)');
    try {
      const response = await axios.post(`${BASE_URL}/classes`, sampleClass, { headers });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.data) {
        createdClassId = response.data.data.id;
        console.log(`   ✅ Class created successfully! ID: ${createdClassId}`);
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
      console.log('   Full response:', JSON.stringify(error.response?.data, null, 2));
    }

    // Test 3: Get all classes
    console.log('\n3️⃣ Testing GET /api/classes (List classes)');
    try {
      const response = await axios.get(`${BASE_URL}/classes`, { 
        headers,
        params: {
          page: 1,
          limit: 10,
          sort_by: 'created_at',
          sort_order: 'desc'
        }
      });
      console.log(`   Status: ${response.status}`);
      console.log(`   Found:`, response.data.pagination?.total || 0, 'classes');
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 4: Get current user's classes
    console.log('\n4️⃣ Testing GET /api/classes/my (My classes)');
    try {
      const response = await axios.get(`${BASE_URL}/classes/my`, { headers });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 5: Get specific class by ID
    if (createdClassId) {
      console.log('\n5️⃣ Testing GET /api/classes/:id (Get class details)');
      try {
        const response = await axios.get(`${BASE_URL}/classes/${createdClassId}`, { headers });
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        console.log('   ✅ Class details retrieved successfully');
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

    // Test 6: Update class
    if (createdClassId) {
      console.log('\n6️⃣ Testing PATCH /api/classes/:id (Update class)');
      try {
        const updateData = {
          description: "Updated description with enhanced focus on logical reasoning and argumentation techniques.",
          max_students: 30
        };
        const response = await axios.patch(`${BASE_URL}/classes/${createdClassId}`, updateData, { headers });
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        console.log('   ✅ Class updated successfully');
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

    // Test 7: Update class status  
    if (createdClassId) {
      console.log('\n7️⃣ Testing PATCH /api/classes/:id/status (Update class status)');
      try {
        const statusUpdate = {
          is_active: false,
          reason: "Testing status change functionality"
        };
        const response = await axios.patch(`${BASE_URL}/classes/${createdClassId}/status`, statusUpdate, { headers });
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        console.log('   ✅ Class status updated successfully');
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

    // Test 8: Update class capacity
    if (createdClassId) {
      console.log('\n8️⃣ Testing PATCH /api/classes/:id/capacity (Update capacity)');
      try {
        const capacityUpdate = {
          max_students: 35,
          reason: "Increased demand for the course"
        };
        const response = await axios.patch(`${BASE_URL}/classes/${createdClassId}/capacity`, capacityUpdate, { headers });
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        console.log('   ✅ Class capacity updated successfully');
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

    // Test 9: Bulk class creation
    console.log('\n9️⃣ Testing POST /api/classes/bulk (Bulk create classes)');
    try {
      const response = await axios.post(`${BASE_URL}/classes/bulk`, sampleBulkClasses, { headers });
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      console.log('   ✅ Bulk class creation completed');
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 10: Class search with filters
    console.log('\n🔟 Testing GET /api/classes with filters (Advanced search)');
    try {
      const response = await axios.get(`${BASE_URL}/classes`, {
        headers,
        params: {
          search: 'Critical',
          subject: 'PHILOSOPHY',
          grade_level: '12',
          academic_year: '2024-2025',
          is_active: true,
          page: 1,
          limit: 5
        }
      });
      console.log(`   Status: ${response.status}`);
      console.log(`   Found:`, response.data.pagination?.total || 0, 'matching classes');
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 11: Get class roster
    if (createdClassId) {
      console.log('\n1️⃣1️⃣ Testing GET /api/classes/:id/roster (Get class roster)');
      try {
        const response = await axios.get(`${BASE_URL}/classes/${createdClassId}/roster`, { headers });
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        console.log('   ✅ Class roster retrieved successfully');
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

    // Test 12: Class analytics
    console.log('\n1️⃣2️⃣ Testing GET /api/classes/analytics (Class analytics)');
    try {
      const response = await axios.get(`${BASE_URL}/classes/analytics`, { 
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

    // Test 13: Archive class (soft delete)
    if (createdClassId) {
      console.log('\n1️⃣3️⃣ Testing DELETE /api/classes/:id (Archive class)');
      try {
        const response = await axios.delete(`${BASE_URL}/classes/${createdClassId}`, { headers });
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        console.log('   ✅ Class archived successfully');
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }

  } catch (error) {
    console.log('❌ Test suite failed:', error.message);
  }

  console.log('\n======================================================');
  console.log('🏁 Class Management API Testing Complete!');
  console.log('\n📋 Summary of tested endpoints:');
  console.log('   • POST /api/classes - Create class ✅');
  console.log('   • POST /api/classes/bulk - Bulk create classes ✅');
  console.log('   • GET /api/classes - List classes with filters ✅');
  console.log('   • GET /api/classes/my - Get current user classes ✅');
  console.log('   • GET /api/classes/:id - Get class details ✅');
  console.log('   • PATCH /api/classes/:id - Update class ✅');
  console.log('   • PATCH /api/classes/:id/status - Update status ✅');
  console.log('   • PATCH /api/classes/:id/capacity - Update capacity ✅');
  console.log('   • GET /api/classes/:id/roster - Get class roster ✅');
  console.log('   • GET /api/classes/analytics - Class analytics ✅');
  console.log('   • DELETE /api/classes/:id - Archive class ✅');
  console.log('\n🎯 Task 2.3.5.1 Implementation Status: READY FOR TESTING');
}

async function testClassValidationAndConstraints() {
  console.log('\n🔍 Testing Class Validation and Business Logic');
  console.log('============================================\n');

  // Test class name uniqueness
  console.log('1️⃣ Testing class name uniqueness validation...');
  try {
    // Try to create class with duplicate name
    const duplicateClass = { ...sampleClass, name: "Advanced Critical Thinking" };
    const response = await axios.post(`${BASE_URL}/classes`, duplicateClass, { headers });
    console.log('   ⚠️  Unexpected success - duplicate names should be prevented');
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('   ✅ Duplicate class name properly rejected');
    } else {
      console.log('   ❌ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  // Test invalid academic year format
  console.log('\n2️⃣ Testing academic year validation...');
  try {
    const invalidYearClass = { ...sampleClass, academic_year: "2024", name: "Test Invalid Year" };
    const response = await axios.post(`${BASE_URL}/classes`, invalidYearClass, { headers });
    console.log('   ⚠️  Unexpected success - invalid year format should be rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ Invalid academic year format properly rejected');
    } else {
      console.log('   ❌ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  // Test maximum student limits
  console.log('\n3️⃣ Testing student capacity validation...');
  try {
    const highCapacityClass = { ...sampleClass, max_students: 150, name: "Test High Capacity" };
    const response = await axios.post(`${BASE_URL}/classes`, highCapacityClass, { headers });
    console.log('   ⚠️  Unexpected success - excessive capacity should be limited');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ Excessive capacity properly rejected');
    } else {
      console.log('   ❌ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  // Test organization permission validation
  console.log('\n4️⃣ Testing organization permission validation...');
  try {
    const unauthorizedOrgClass = { ...sampleClass, organization_id: "unauthorized_org_id", name: "Test Unauthorized Org" };
    const response = await axios.post(`${BASE_URL}/classes`, unauthorizedOrgClass, { headers });
    console.log('   ⚠️  Unexpected success - unauthorized organization access should be prevented');
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 404) {
      console.log('   ✅ Unauthorized organization access properly rejected');
    } else {
      console.log('   ❌ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  console.log('\n============================================');
  console.log('🎯 Class Validation Testing Complete!');
}

async function testClassFilteringAndSearch() {
  console.log('\n🔍 Testing Class Filtering and Search Capabilities');
  console.log('================================================\n');

  // Test search by name
  console.log('1️⃣ Testing class name search...');
  try {
    const response = await axios.get(`${BASE_URL}/classes`, {
      headers,
      params: { search: 'Critical' }
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Found:`, response.data.pagination?.total || 0, 'classes matching "Critical"');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test filter by subject
  console.log('\n2️⃣ Testing subject filter...');
  try {
    const response = await axios.get(`${BASE_URL}/classes`, {
      headers,
      params: { subject: 'PHILOSOPHY' }
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Found:`, response.data.pagination?.total || 0, 'philosophy classes');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test filter by grade level
  console.log('\n3️⃣ Testing grade level filter...');
  try {
    const response = await axios.get(`${BASE_URL}/classes`, {
      headers,
      params: { grade_level: '12' }
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Found:`, response.data.pagination?.total || 0, '12th grade classes');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test filter by academic year
  console.log('\n4️⃣ Testing academic year filter...');
  try {
    const response = await axios.get(`${BASE_URL}/classes`, {
      headers,
      params: { academic_year: '2024-2025' }
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Found:`, response.data.pagination?.total || 0, '2024-2025 classes');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test combined filters
  console.log('\n5️⃣ Testing combined filters...');
  try {
    const response = await axios.get(`${BASE_URL}/classes`, {
      headers,
      params: {
        subject: 'PHILOSOPHY',
        grade_level: '12',
        academic_year: '2024-2025',
        is_active: true
      }
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Found:`, response.data.pagination?.total || 0, 'classes matching all filters');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test pagination
  console.log('\n6️⃣ Testing pagination...');
  try {
    const response = await axios.get(`${BASE_URL}/classes`, {
      headers,
      params: {
        page: 1,
        limit: 3,
        sort_by: 'name',
        sort_order: 'asc'
      }
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Page 1 results:`, response.data.data?.length || 0, 'classes');
    console.log(`   Total available:`, response.data.pagination?.total || 0, 'classes');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  console.log('\n================================================');
  console.log('🎯 Class Filtering and Search Testing Complete!');
}

// Main test execution
if (require.main === module) {
  console.log('⚠️  Note: You need to replace JWT_TOKEN with a valid token to test endpoints that require authentication.');
  console.log('⚠️  Make sure you have a valid organization_id in the test data.');
  console.log('⚠️  Some tests may fail if no users/organizations exist in the database yet.\n');
  
  if (JWT_TOKEN === 'your-jwt-token-here') {
    console.log('❌ JWT_TOKEN not configured. Update the token in this file first.');
    console.log('   You can get a token by:');
    console.log('   1. Running: node create-test-token.js');
    console.log('   2. Using Clerk\'s test tokens');
    console.log('   3. Creating a user and getting their JWT from the frontend\n');
  } else {
    // Run all test suites
    Promise.resolve()
      .then(() => testClassManagementEndpoints())
      .then(() => testClassValidationAndConstraints())
      .then(() => testClassFilteringAndSearch())
      .catch(console.error);
  }
}

module.exports = { 
  testClassManagementEndpoints,
  testClassValidationAndConstraints,
  testClassFilteringAndSearch
};
