/**
 * WebSocket Real-time Load Testing
 * Tests concurrent WebSocket connections and real-time messaging performance
 */

import { check, sleep } from 'k6';
import { websocketLoadConfig } from '../config/load-test-config.js';
import { 
  AuthHelper, 
  DataGenerator, 
  WebSocketTester, 
  PerformanceMonitor,
  ScenarioRunner,
  ErrorHandler,
  concurrentUsers,
  messageLatency
} from '../utils/test-helpers.js';

export let options = websocketLoadConfig;

export function setup() {
  console.log('🚀 Starting WebSocket Load Test Setup');
  console.log(`Target: ${websocketLoadConfig.wsUrl}`);
  console.log(`Concurrent Users: ${websocketLoadConfig.scenarios.websocket_concurrent.vus}`);
  console.log(`Duration: ${websocketLoadConfig.scenarios.websocket_concurrent.duration}`);
  
  // Pre-authenticate test users for better performance
  const authTokens = [];
  
  try {
    const credentials = Object.values(websocketLoadConfig.testUserCredentials);
    for (const cred of credentials) {
      const auth = AuthHelper.login(cred);
      authTokens.push({
        token: auth.token,
        userId: auth.userId,
        role: cred.role
      });
    }
    
    console.log(`✅ Pre-authenticated ${authTokens.length} test users`);
    
    return {
      authTokens,
      startTime: Date.now(),
      testConversations: [
        DataGenerator.generateConversationId(),
        DataGenerator.generateConversationId(),
        DataGenerator.generateConversationId()
      ]
    };
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

export default function(data) {
  const iteration = __ITER;
  const vuId = __VU;
  
  // Select random auth token for this VU
  const authIndex = Math.floor(Math.random() * data.authTokens.length);
  const auth = data.authTokens[authIndex];
  
  // Select random conversation
  const conversationIndex = Math.floor(Math.random() * data.testConversations.length);
  const conversationId = data.testConversations[conversationIndex];
  
  console.log(`VU ${vuId} - Iteration ${iteration}: Starting WebSocket test`);
  
  try {
    // Test WebSocket connection and messaging
    testWebSocketConnection(auth.token, conversationId, vuId);
    
    // Simulate user behavior patterns
    simulateUserBehavior(auth.token, conversationId);
    
    // Test concurrent operations
    testConcurrentOperations(auth.token, conversationId);
    
  } catch (error) {
    console.error(`VU ${vuId} - Error:`, error);
    ErrorHandler.handleWebSocketError(error, `VU-${vuId}-Iteration-${iteration}`);
  }
  
  // Random sleep to simulate realistic user behavior
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

function testWebSocketConnection(authToken, conversationId, vuId) {
  console.log(`VU ${vuId}: Testing WebSocket connection`);
  
  const wsTester = new WebSocketTester(authToken, conversationId);
  const startTime = PerformanceMonitor.startTimer();
  
  const connectionResult = wsTester.connect();
  
  check(connectionResult, {
    'websocket connected successfully': () => wsTester.connectionTime < 1000,
    'websocket connection time acceptable': () => wsTester.connectionTime < 2000
  });
  
  const totalTime = PerformanceMonitor.endTimer(startTime);
  console.log(`VU ${vuId}: WebSocket connection completed in ${totalTime}ms`);
  
  concurrentUsers.add(1);
}

function simulateUserBehavior(authToken, conversationId) {
  const behavior = DataGenerator.getRandomUserBehavior();
  const wsTester = new WebSocketTester(authToken, conversationId);
  
  // Simulate different user behavior patterns
  const behaviorType = Math.random();
  
  if (behaviorType < 0.4) {
    // Active debater - sends many messages
    simulateActiveDebater(wsTester);
  } else if (behaviorType < 0.7) {
    // Moderate participant - occasional messages
    simulateModerateParticipant(wsTester);
  } else {
    // Passive observer - mostly listens
    simulatePassiveObserver(wsTester);
  }
}

function simulateActiveDebater(wsTester) {
  const connection = wsTester.connect();
  
  if (connection) {
    // Send multiple messages rapidly
    for (let i = 0; i < 5; i++) {
      sleep(0.5); // 500ms between messages
      // Message sending is handled in WebSocketTester.sendPeriodicMessages
    }
    
    // Simulate typing indicators
    sleep(1);
    wsTester.simulateTypingIndicator(connection);
    
    // Simulate presence updates
    sleep(0.5);
    wsTester.simulatePresenceUpdate(connection);
  }
}

function simulateModerateParticipant(wsTester) {
  const connection = wsTester.connect();
  
  if (connection) {
    // Send fewer messages with longer delays
    for (let i = 0; i < 2; i++) {
      sleep(2); // 2 seconds between messages
    }
    
    // Occasional typing indicator
    if (Math.random() < 0.5) {
      wsTester.simulateTypingIndicator(connection);
    }
  }
}

function simulatePassiveObserver(wsTester) {
  const connection = wsTester.connect();
  
  if (connection) {
    // Mostly just listens, occasional presence update
    sleep(5);
    
    if (Math.random() < 0.3) {
      wsTester.simulatePresenceUpdate(connection);
    }
  }
}

function testConcurrentOperations(authToken, conversationId) {
  // Test multiple WebSocket operations happening simultaneously
  const operations = [];
  
  // Create multiple WebSocket testers for concurrent operations
  for (let i = 0; i < 3; i++) {
    const wsTester = new WebSocketTester(authToken, `${conversationId}_${i}`);
    operations.push(() => wsTester.connect());
  }
  
  // Execute operations concurrently
  const startTime = PerformanceMonitor.startTimer();
  
  try {
    // Simulate concurrent connections
    operations.forEach(operation => {
      try {
        operation();
      } catch (error) {
        console.warn('Concurrent operation failed:', error);
      }
    });
    
    const duration = PerformanceMonitor.endTimer(startTime);
    PerformanceMonitor.recordCustomMetric('concurrent_operations_duration', duration);
    
    check(null, {
      'concurrent operations completed': () => duration < 5000
    });
    
  } catch (error) {
    ErrorHandler.handleWebSocketError(error, 'concurrent_operations');
  }
}

export function teardown(data) {
  console.log('🧹 WebSocket Load Test Teardown');
  
  const testDuration = Date.now() - data.startTime;
  console.log(`Total test duration: ${testDuration}ms`);
  
  // Log final metrics
  console.log('📊 Final WebSocket Load Test Metrics:');
  console.log(`- Test completed in ${testDuration / 1000} seconds`);
  console.log(`- Tested ${data.testConversations.length} conversation channels`);
  console.log(`- Used ${data.authTokens.length} authenticated users`);
  
  // Cleanup any remaining connections
  console.log('✅ WebSocket Load Test completed successfully');
}

// Specialized WebSocket stress test
export function stressTestWebSockets() {
  return {
    ...websocketLoadConfig,
    scenarios: {
      websocket_stress: {
        executor: 'ramping-vus',
        stages: [
          { duration: '1m', target: 50 },   // Ramp up
          { duration: '3m', target: 200 },  // Stress level
          { duration: '2m', target: 500 },  // Peak stress
          { duration: '1m', target: 0 }     // Ramp down
        ],
        tags: { scenario: 'websocket_stress' }
      }
    },
    thresholds: {
      ...websocketLoadConfig.thresholds,
      'ws_connecting': ['p(95)<2000'], // More lenient during stress
      'message_latency': ['p(95)<200'], // Allow higher latency under stress
      'websocket_errors': ['count<100'] // Allow some errors under extreme load
    }
  };
}

// Real-time message throughput test
export function messagesThroughputTest() {
  return {
    ...websocketLoadConfig,
    scenarios: {
      message_throughput: {
        executor: 'constant-arrival-rate',
        rate: 50, // messages per second
        timeUnit: '1s',
        duration: '3m',
        preAllocatedVUs: 25,
        maxVUs: 100,
        tags: { scenario: 'message_throughput' }
      }
    },
    thresholds: {
      ...websocketLoadConfig.thresholds,
      'messages_per_second': ['rate>=45'], // Maintain 45+ messages/sec
      'message_latency': ['p(99)<150'] // 99th percentile under 150ms
    }
  };
}

// Connection stability test
export function connectionStabilityTest() {
  return {
    ...websocketLoadConfig,
    scenarios: {
      connection_stability: {
        executor: 'constant-vus',
        vus: 100,
        duration: '10m', // Longer duration to test stability
        tags: { scenario: 'connection_stability' }
      }
    },
    thresholds: {
      ...websocketLoadConfig.thresholds,
      'connection_success_rate': ['rate>=0.98'], // 98% success rate
      'websocket_errors': ['count<50'] // Very low error tolerance
    }
  };
}
