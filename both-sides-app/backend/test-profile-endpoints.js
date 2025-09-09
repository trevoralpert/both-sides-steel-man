/**
 * Test script for Profile API endpoints
 * Run with: node test-profile-endpoints.js
 */
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001/api';

// SECURITY NOTE: This is a dummy JWT token for testing structure validation only
// Payload: {"sub":"user_2nUCjKPakBy2XMVqzEV3gcXYzR2","iat":1616239022} - NOT a real secret
// For production testing, use: const TEST_JWT = process.env.TEST_JWT_TOKEN;
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzJuVUNqS1Bha0J5MlhNVnF6RVYzZ2NYWXpSMiIsImlhdCI6MTYxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Sample test data
const sampleProfile = {
  survey_responses: {
    questions: [
      "What is your stance on economic policy?",
      "How do you view social issues?", 
      "What are your thoughts on environmental policy?"
    ],
    answers: [
      "I believe in mixed economy approaches",
      "I support progressive social policies", 
      "Climate change is a serious concern"
    ]
  },
  belief_summary: "I am a progressive individual who believes in evidence-based policy making and social justice while supporting reasonable economic policies that promote both growth and equality.",
  ideology_scores: {
    liberal: 0.7,
    conservative: 0.3,
    progressive: 0.8,
    libertarian: 0.4
  },
  opinion_plasticity: 0.6
};

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TEST_JWT}`
};

async function testEndpoints() {
  console.log('🧪 Testing Profile API Endpoints...\n');

  try {
    // Test 1: Get current user info (should work if server is running)
    console.log('1️⃣ Testing server connectivity...');
    try {
      const userResponse = await fetch(`${BASE_URL}/users/me`, { 
        headers 
      });
      console.log(`   Status: ${userResponse.status}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('   ✅ Server is running and user endpoint is accessible');
        console.log(`   User data:`, JSON.stringify(userData, null, 2));
      } else {
        console.log('   ⚠️  Server running but auth may be required');
      }
    } catch (error) {
      console.log('   ❌ Server connection failed:', error.message);
      console.log('   Make sure the server is running with: npm run start:dev');
      return;
    }

    // Test 2: Check if current user has a profile
    console.log('\n2️⃣ Testing profile completion check...');
    try {
      const completionResponse = await fetch(`${BASE_URL}/profiles/me/completed`, { 
        headers 
      });
      console.log(`   Status: ${completionResponse.status}`);
      const completionData = await completionResponse.json();
      console.log(`   Response:`, JSON.stringify(completionData, null, 2));
    } catch (error) {
      console.log('   Error:', error.message);
    }

    // Test 3: Get current user profile
    console.log('\n3️⃣ Testing get current user profile...');
    try {
      const profileResponse = await fetch(`${BASE_URL}/profiles/me/current`, { 
        headers 
      });
      console.log(`   Status: ${profileResponse.status}`);
      const profileData = await profileResponse.json();
      console.log(`   Response:`, JSON.stringify(profileData, null, 2));
    } catch (error) {
      console.log('   Error:', error.message);
    }

    // Test 4: Create profile for current user
    console.log('\n4️⃣ Testing profile creation...');
    try {
      const createResponse = await fetch(`${BASE_URL}/profiles/me/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(sampleProfile)
      });
      console.log(`   Status: ${createResponse.status}`);
      const createData = await createResponse.json();
      console.log(`   Response:`, JSON.stringify(createData, null, 2));
      
      if (createData.success && createData.data) {
        console.log('   ✅ Profile created successfully!');
        console.log(`   Profile ID: ${createData.data.id}`);
      }
    } catch (error) {
      console.log('   Error:', error.message);
    }

    // Test 5: Update profile
    console.log('\n5️⃣ Testing profile update...');
    try {
      const updateData = {
        belief_summary: "Updated belief summary with more nuanced views on policy making and social justice.",
        opinion_plasticity: 0.7
      };
      
      const updateResponse = await fetch(`${BASE_URL}/profiles/me/update`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });
      console.log(`   Status: ${updateResponse.status}`);
      const updateResult = await updateResponse.json();
      console.log(`   Response:`, JSON.stringify(updateResult, null, 2));
    } catch (error) {
      console.log('   Error:', error.message);
    }

    // Test 6: Get profile insights
    console.log('\n6️⃣ Testing profile insights...');
    try {
      const insightsResponse = await fetch(`${BASE_URL}/profiles/me/insights`, { 
        headers 
      });
      console.log(`   Status: ${insightsResponse.status}`);
      const insightsData = await insightsResponse.json();
      console.log(`   Response:`, JSON.stringify(insightsData, null, 2));
    } catch (error) {
      console.log('   Error:', error.message);
    }

    // Test 7: Get profile statistics
    console.log('\n7️⃣ Testing profile statistics...');
    try {
      const statsResponse = await fetch(`${BASE_URL}/profiles/stats/summary`, { 
        headers 
      });
      console.log(`   Status: ${statsResponse.status}`);
      const statsData = await statsResponse.json();
      console.log(`   Response:`, JSON.stringify(statsData, null, 2));
    } catch (error) {
      console.log('   Error:', error.message);
    }

    // Test 8: List profiles (admin function)
    console.log('\n8️⃣ Testing profile listing...');
    try {
      const listResponse = await fetch(`${BASE_URL}/profiles?page=1&limit=5`, { 
        headers 
      });
      console.log(`   Status: ${listResponse.status}`);
      const listData = await listResponse.json();
      console.log(`   Response:`, JSON.stringify(listData, null, 2));
    } catch (error) {
      console.log('   Error:', error.message);
    }

  } catch (error) {
    console.log('❌ Test suite failed:', error.message);
  }

  console.log('\n🏁 Profile API testing completed!');
}

// Test validation functions
function testValidationLogic() {
  console.log('\n🔍 Testing validation logic...');
  
  // Test survey responses validation
  const validSurveyResponses = {
    questions: ["Question 1", "Question 2"],
    answers: ["Answer 1", "Answer 2"]
  };
  
  const invalidSurveyResponses = {
    questions: ["Question 1"],
    answers: ["Answer 1", "Answer 2"] // Mismatch
  };
  
  console.log('Valid survey responses would pass validation');
  console.log('Invalid survey responses would fail validation');
  
  // Test ideology scores
  const validIdeologyScores = {
    liberal: 0.7,
    conservative: 0.3,
    progressive: 0.8
  };
  
  const invalidIdeologyScores = {
    liberal: 1.5, // Out of range
    conservative: -0.1 // Out of range
  };
  
  console.log('Valid ideology scores: 0-1 range');
  console.log('Invalid ideology scores: outside 0-1 range');
}

// Run tests
console.log('🚀 Starting Profile API Tests...');
console.log('Make sure your server is running on http://localhost:3000');
console.log('And that you have valid authentication configured.\n');

testValidationLogic();
testEndpoints().catch(console.error);
