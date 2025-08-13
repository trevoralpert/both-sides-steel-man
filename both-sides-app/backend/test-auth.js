#!/usr/bin/env node

/**
 * Test Authentication Script for Both Sides App
 * 
 * This script helps you test JWT authentication with real Clerk tokens
 */

const { default: fetch } = require('node-fetch');

// Backend API endpoints
const BACKEND_URL = 'http://localhost:3001/api';

async function testEndpoints(jwtToken) {
  console.log('🧪 Testing Both Sides Authentication...\n');
  
  try {
    // Test unprotected endpoint
    console.log('1️⃣ Testing unprotected endpoint:');
    const publicResponse = await fetch(`${BACKEND_URL}`);
    const publicData = await publicResponse.text();
    console.log(`   Status: ${publicResponse.status}`);
    console.log(`   Response: ${publicData}`);
    
    console.log('\n2️⃣ Testing protected endpoint WITHOUT token:');
    const noTokenResponse = await fetch(`${BACKEND_URL}/protected`);
    const noTokenData = await noTokenResponse.text();
    console.log(`   Status: ${noTokenResponse.status}`);
    console.log(`   Response: ${noTokenData}`);
    
    if (jwtToken) {
      console.log('\n3️⃣ Testing protected endpoint WITH JWT token:');
      const authResponse = await fetch(`${BACKEND_URL}/protected`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });
      const authData = await authResponse.text();
      console.log(`   Status: ${authResponse.status}`);
      console.log(`   Response: ${authData}`);
    } else {
      console.log('\n3️⃣ No JWT token provided - skipping authenticated test');
      console.log('\n📝 To test with a real token:');
      console.log('   node test-auth.js "your_jwt_token_here"');
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

// Get JWT token from command line argument
const jwtToken = process.argv[2];

if (jwtToken && jwtToken.length < 20) {
  console.log('⚠️  JWT token seems too short. Make sure you copied the full token.');
}

testEndpoints(jwtToken);
