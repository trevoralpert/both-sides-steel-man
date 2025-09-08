/**
 * API Throughput Load Testing
 * Tests API endpoint performance under various load conditions
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { apiThroughputConfig } from '../config/load-test-config.js';
import { 
  AuthHelper, 
  DataGenerator, 
  ApiTester, 
  PerformanceMonitor,
  ScenarioRunner,
  ErrorHandler
} from '../utils/test-helpers.js';

export let options = apiThroughputConfig;

export function setup() {
  console.log('🚀 Starting API Throughput Load Test');
  console.log(`Target: ${apiThroughputConfig.apiUrl}`);
  console.log(`Rate: ${apiThroughputConfig.scenarios.api_throughput.rate} requests/second`);
  console.log(`Duration: ${apiThroughputConfig.scenarios.api_throughput.duration}`);
  
  // Pre-authenticate users and prepare test data
  const testData = {
    authTokens: [],
    testUsers: [],
    testConversations: [],
    testTopics: [],
    startTime: Date.now()
  };
  
  try {
    // Authenticate test users
    const credentials = Object.values(apiThroughputConfig.testUserCredentials);
    for (const cred of credentials) {
      const auth = AuthHelper.login(cred);
      testData.authTokens.push({
        token: auth.token,
        userId: auth.userId,
        role: cred.role,
        email: cred.email
      });
    }
    
    // Generate test data
    for (let i = 0; i < 10; i++) {
      testData.testUsers.push({
        id: DataGenerator.generateUserId(),
        email: `loadtest${i}@example.com`,
        profile: DataGenerator.generateBeliefProfile()
      });
      
      testData.testConversations.push({
        id: DataGenerator.generateConversationId(),
        topic: DataGenerator.getRandomTopic(),
        participants: [
          testData.testUsers[Math.floor(Math.random() * testData.testUsers.length)]?.id,
          testData.testUsers[Math.floor(Math.random() * testData.testUsers.length)]?.id
        ]
      });
    }
    
    testData.testTopics = apiThroughputConfig.testData.topics;
    
    console.log(`✅ Setup completed:`);
    console.log(`  - ${testData.authTokens.length} authenticated users`);
    console.log(`  - ${testData.testUsers.length} test users generated`);
    console.log(`  - ${testData.testConversations.length} test conversations prepared`);
    
    return testData;
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

export default function(data) {
  const iteration = __ITER;
  const vuId = __VU;
  
  // Select random auth for this request
  const authIndex = Math.floor(Math.random() * data.authTokens.length);
  const auth = data.authTokens[authIndex];
  const apiTester = new ApiTester(auth.token);
  
  // Randomly select API endpoint to test
  const endpointType = Math.random();
  
  try {
    if (endpointType < 0.2) {
      // 20% - Profile operations
      testProfileEndpoints(apiTester, data, vuId);
    } else if (endpointType < 0.4) {
      // 20% - Survey operations
      testSurveyEndpoints(apiTester, data, vuId);
    } else if (endpointType < 0.6) {
      // 20% - Conversation operations
      testConversationEndpoints(apiTester, data, vuId);
    } else if (endpointType < 0.8) {
      // 20% - Matching operations
      testMatchingEndpoints(apiTester, data, vuId);
    } else {
      // 20% - Mixed operations (realistic user journey)
      testUserJourney(apiTester, data, vuId);
    }
  } catch (error) {
    console.error(`VU ${vuId} - API Error:`, error);
    ErrorHandler.handleApiError(error, `VU-${vuId}-Iteration-${iteration}`);
  }
  
  // Small random delay to simulate realistic usage
  sleep(Math.random() * 0.5);
}

function testProfileEndpoints(apiTester, data, vuId) {
  const startTime = PerformanceMonitor.startTimer();
  
  // Test getting profile
  const testUser = data.testUsers[Math.floor(Math.random() * data.testUsers.length)];
  const profileResult = apiTester.testGetProfile(testUser.id);
  
  check(profileResult.response, {
    'profile GET request successful': (r) => r.status === 200,
    'profile response time acceptable': () => profileResult.duration < 500
  });
  
  // Test updating profile
  const updateData = {
    preferences: {
      theme: Math.random() > 0.5 ? 'dark' : 'light',
      notifications: Math.random() > 0.5,
      aiCoaching: Math.random() > 0.3
    }
  };
  
  const updateResponse = http.put(
    `${apiThroughputConfig.apiUrl}/api/profiles/${testUser.id}`,
    JSON.stringify(updateData),
    { headers: apiTester.headers }
  );
  
  check(updateResponse, {
    'profile UPDATE request successful': (r) => r.status === 200,
    'profile update response time acceptable': (r) => r.timings.duration < 600
  });
  
  const totalTime = PerformanceMonitor.endTimer(startTime);
  PerformanceMonitor.recordCustomMetric('profile_operations_duration', totalTime);
}

function testSurveyEndpoints(apiTester, data, vuId) {
  const startTime = PerformanceMonitor.startTimer();
  
  // Test getting survey questions
  const questionsResponse = http.get(
    `${apiThroughputConfig.apiUrl}/api/survey/questions`,
    { headers: apiTester.headers }
  );
  
  check(questionsResponse, {
    'survey questions GET successful': (r) => r.status === 200,
    'survey questions response time acceptable': (r) => r.timings.duration < 300
  });
  
  // Test submitting survey response
  const surveyData = DataGenerator.generateSurveyResponse();
  const submissionResult = apiTester.testSubmitSurveyResponse(surveyData);
  
  check(submissionResult.response, {
    'survey submission successful': (r) => r.status === 200,
    'survey submission response time acceptable': () => submissionResult.duration < 1000
  });
  
  const totalTime = PerformanceMonitor.endTimer(startTime);
  PerformanceMonitor.recordCustomMetric('survey_operations_duration', totalTime);
}

function testConversationEndpoints(apiTester, data, vuId) {
  const startTime = PerformanceMonitor.startTimer();
  
  // Test creating conversation
  const topicData = {
    topic: DataGenerator.getRandomTopic(),
    participants: [
      data.testUsers[Math.floor(Math.random() * data.testUsers.length)].id,
      data.testUsers[Math.floor(Math.random() * data.testUsers.length)].id
    ],
    settings: {
      duration: 30,
      aiCoaching: Math.random() > 0.5,
      isPrivate: Math.random() > 0.7
    }
  };
  
  const creationResult = apiTester.testCreateConversation(topicData);
  
  check(creationResult.response, {
    'conversation creation successful': (r) => r.status === 201,
    'conversation creation response time acceptable': () => creationResult.duration < 800
  });
  
  // Test getting conversation details
  const testConversation = data.testConversations[Math.floor(Math.random() * data.testConversations.length)];
  const getResponse = http.get(
    `${apiThroughputConfig.apiUrl}/api/conversations/${testConversation.id}`,
    { headers: apiTester.headers }
  );
  
  check(getResponse, {
    'conversation GET successful': (r) => r.status === 200,
    'conversation GET response time acceptable': (r) => r.timings.duration < 400
  });
  
  // Test listing user conversations
  const listResponse = http.get(
    `${apiThroughputConfig.apiUrl}/api/conversations/user/${data.authTokens[0].userId}`,
    { headers: apiTester.headers }
  );
  
  check(listResponse, {
    'conversation list successful': (r) => r.status === 200,
    'conversation list response time acceptable': (r) => r.timings.duration < 500
  });
  
  const totalTime = PerformanceMonitor.endTimer(startTime);
  PerformanceMonitor.recordCustomMetric('conversation_operations_duration', totalTime);
}

function testMatchingEndpoints(apiTester, data, vuId) {
  const startTime = PerformanceMonitor.startTimer();
  
  // Test finding matches
  const testUser = data.testUsers[Math.floor(Math.random() * data.testUsers.length)];
  const matchesResult = apiTester.testGetMatches(testUser.id);
  
  check(matchesResult.response, {
    'matches GET successful': (r) => r.status === 200,
    'matches response time acceptable': () => matchesResult.duration < 1000
  });
  
  // Test belief analysis
  const analysisResponse = http.get(
    `${apiThroughputConfig.apiUrl}/api/belief-analysis/${testUser.id}`,
    { headers: apiTester.headers }
  );
  
  check(analysisResponse, {
    'belief analysis successful': (r) => r.status === 200,
    'belief analysis response time acceptable': (r) => r.timings.duration < 1500
  });
  
  // Test compatibility scoring
  const compatibilityData = {
    user1Id: testUser.id,
    user2Id: data.testUsers[Math.floor(Math.random() * data.testUsers.length)].id
  };
  
  const compatibilityResponse = http.post(
    `${apiThroughputConfig.apiUrl}/api/matching/compatibility`,
    JSON.stringify(compatibilityData),
    { headers: apiTester.headers }
  );
  
  check(compatibilityResponse, {
    'compatibility scoring successful': (r) => r.status === 200,
    'compatibility scoring response time acceptable': (r) => r.timings.duration < 800
  });
  
  const totalTime = PerformanceMonitor.endTimer(startTime);
  PerformanceMonitor.recordCustomMetric('matching_operations_duration', totalTime);
}

function testUserJourney(apiTester, data, vuId) {
  const startTime = PerformanceMonitor.startTimer();
  
  // Simulate complete user journey
  ScenarioRunner.runUserJourney(apiTester.authToken);
  
  const totalTime = PerformanceMonitor.endTimer(startTime);
  PerformanceMonitor.recordCustomMetric('user_journey_duration', totalTime);
  
  check(null, {
    'user journey completed successfully': () => totalTime < 10000,
    'user journey response time acceptable': () => totalTime < 15000
  });
}

// Specialized API stress tests
export function apiStressTest() {
  return {
    ...apiThroughputConfig,
    scenarios: {
      api_stress: {
        executor: 'ramping-arrival-rate',
        stages: [
          { duration: '1m', target: 50 },   // 50 req/s
          { duration: '2m', target: 100 },  // 100 req/s
          { duration: '2m', target: 200 },  // 200 req/s
          { duration: '1m', target: 500 },  // 500 req/s (stress)
          { duration: '1m', target: 0 }     // Ramp down
        ],
        preAllocatedVUs: 50,
        maxVUs: 200,
        tags: { scenario: 'api_stress' }
      }
    },
    thresholds: {
      ...apiThroughputConfig.thresholds,
      'http_req_duration': ['p(95)<1000'], // More lenient under stress
      'http_req_failed': ['rate<0.2'] // Allow higher failure rate under stress
    }
  };
}

export function databaseLoadTest() {
  return {
    ...apiThroughputConfig,
    scenarios: {
      database_load: {
        executor: 'constant-arrival-rate',
        rate: 75, // requests per second
        timeUnit: '1s',
        duration: '5m',
        preAllocatedVUs: 30,
        maxVUs: 100,
        tags: { scenario: 'database_load' }
      }
    },
    thresholds: {
      ...apiThroughputConfig.thresholds,
      'http_req_duration{group:::database_operations}': ['p(95)<800'],
      'database_connections': ['max<50'] // Monitor DB connection pool
    }
  };
}

export function teardown(data) {
  console.log('🧹 API Throughput Test Teardown');
  
  const testDuration = Date.now() - data.startTime;
  console.log(`Total test duration: ${testDuration}ms`);
  
  // Log performance summary
  console.log('📊 API Load Test Summary:');
  console.log(`- Test duration: ${testDuration / 1000} seconds`);
  console.log(`- Auth tokens used: ${data.authTokens.length}`);
  console.log(`- Test users: ${data.testUsers.length}`);
  console.log(`- Test conversations: ${data.testConversations.length}`);
  
  // Collect final resource metrics
  PerformanceMonitor.measureResourceUsage();
  
  console.log('✅ API Throughput Test completed successfully');
}
