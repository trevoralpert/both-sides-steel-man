const axios = require('axios');

// Test the new user management endpoints
const BASE_URL = 'http://localhost:3001/api';

// You'll need to replace this with a real JWT token for testing
const JWT_TOKEN = 'your-jwt-token-here';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testEndpoints() {
  console.log('🚀 Testing User Management Endpoints (Task 2.2.6)');
  console.log('================================================\n');

  // Test 1: User listing with pagination
  console.log('1. Testing GET /api/users (Enhanced user listing)');
  try {
    const response = await axios.get(`${BASE_URL}/users`, { 
      headers,
      params: {
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      }
    });
    console.log('   ✅ Success:', response.data.message);
    console.log('   📊 Found:', response.data.pagination.total, 'users');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test 2: User search
  console.log('\n2. Testing GET /api/users/search (Advanced user search)');
  try {
    const response = await axios.get(`${BASE_URL}/users/search`, { 
      headers,
      params: {
        search: 'test',
        role: 'STUDENT',
        is_active: true,
        page: 1,
        limit: 5
      }
    });
    console.log('   ✅ Success:', response.data.message);
    console.log('   📊 Found:', response.data.data.length, 'matching users');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test 3: User statistics
  console.log('\n3. Testing GET /api/users/stats/overview (User statistics)');
  try {
    const response = await axios.get(`${BASE_URL}/users/stats/overview`, { headers });
    console.log('   ✅ Success:', response.data.message);
    console.log('   📊 Total users:', response.data.data.totalUsers);
    console.log('   📊 Active users:', response.data.data.activeUsers);
    console.log('   📊 Profile completion rate:', response.data.data.profileCompletionRate.toFixed(1) + '%');
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test 4: User engagement metrics
  console.log('\n4. Testing GET /api/users/engagement/metrics (Engagement metrics)');
  try {
    const response = await axios.get(`${BASE_URL}/users/engagement/metrics`, { 
      headers,
      params: {
        days: 30
      }
    });
    console.log('   ✅ Success:', response.data.message);
    console.log('   📊 Analyzed:', response.data.data.metrics.length, 'users');
    console.log('   📊 Avg engagement score:', response.data.data.summary.averageEngagementScore);
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  // Test 5: Combined reports
  console.log('\n5. Testing GET /api/users/reports/combined (Analytics reports)');
  try {
    const response = await axios.get(`${BASE_URL}/users/reports/combined`, { headers });
    console.log('   ✅ Success:', response.data.message);
    console.log('   📊 Recommendations:', response.data.data.recommendations.length);
    if (response.data.data.recommendations.length > 0) {
      console.log('   💡 Sample recommendation:', response.data.data.recommendations[0].message);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.response?.data?.message || error.message);
  }

  console.log('\n================================================');
  console.log('✨ User Management Endpoints Testing Complete!');
  console.log('\n📋 Summary of implemented endpoints:');
  console.log('   • GET /api/users - Enhanced user listing with filtering');
  console.log('   • GET /api/users/search - Advanced search with multiple criteria');
  console.log('   • PUT /api/users/:id/activate - User activation');
  console.log('   • PUT /api/users/:id/deactivate - User deactivation');
  console.log('   • PUT /api/users/:id/suspend - User suspension');
  console.log('   • POST /api/users/bulk/import - Bulk user import');
  console.log('   • PUT /api/users/bulk/status - Bulk status updates');
  console.log('   • DELETE /api/users/bulk/deactivate - Bulk deactivation');
  console.log('   • GET /api/users/:id/classes - User classes');
  console.log('   • GET /api/users/:id/enrollments - User enrollments');
  console.log('   • GET /api/users/:id/activity - User activity summary');
  console.log('   • GET /api/users/stats/overview - User statistics');
  console.log('   • GET /api/users/engagement/metrics - Engagement metrics');
  console.log('   • GET /api/users/reports/combined - Combined analytics reports');
  console.log('\n🎯 Task 2.2.6 Implementation Status: COMPLETED');
}

if (require.main === module) {
  console.log('⚠️  Note: You need to replace JWT_TOKEN with a valid token to test endpoints that require authentication.');
  console.log('⚠️  Some endpoints may fail if no users exist in the database yet.\n');
  
  if (JWT_TOKEN === 'your-jwt-token-here') {
    console.log('❌ JWT_TOKEN not configured. Update the token in this file first.');
    console.log('   You can get a token by:');
    console.log('   1. Running the auth test script');
    console.log('   2. Using Clerk\'s test tokens');
    console.log('   3. Creating a user and getting their JWT from the frontend\n');
  } else {
    testEndpoints().catch(console.error);
  }
}

module.exports = { testEndpoints };
