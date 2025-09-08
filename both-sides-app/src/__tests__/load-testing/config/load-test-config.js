/**
 * Load Testing Configuration
 * Central configuration for all load testing scenarios
 */

export const loadTestConfig = {
  // Base configuration
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  apiUrl: __ENV.API_URL || 'http://localhost:3001',
  wsUrl: __ENV.WS_URL || 'ws://localhost:3001',
  
  // Test environment settings
  environment: __ENV.ENVIRONMENT || 'test',
  
  // Authentication
  testUserCredentials: {
    student1: {
      email: 'student1@test.bothsides.com',
      password: 'TestPassword123!',
      role: 'student'
    },
    student2: {
      email: 'student2@test.bothsides.com', 
      password: 'TestPassword123!',
      role: 'student'
    },
    teacher: {
      email: 'teacher@test.bothsides.com',
      password: 'TestPassword123!',
      role: 'teacher'
    }
  },
  
  // Load testing scenarios configuration
  scenarios: {
    // Light load - normal usage
    light: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      tags: { scenario: 'light' }
    },
    
    // Medium load - busy periods
    medium: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      tags: { scenario: 'medium' }
    },
    
    // Heavy load - peak usage
    heavy: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
      tags: { scenario: 'heavy' }
    },
    
    // Stress test - beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 }
      ],
      tags: { scenario: 'stress' }
    },
    
    // Spike test - sudden traffic increases
    spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '30s', target: 200 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 300 },
        { duration: '1m', target: 10 }
      ],
      tags: { scenario: 'spike' }
    },
    
    // WebSocket-specific scenarios
    websocket_concurrent: {
      executor: 'constant-vus',
      vus: 100,
      duration: '3m',
      tags: { scenario: 'websocket_concurrent' }
    },
    
    // API-specific scenarios  
    api_throughput: {
      executor: 'constant-arrival-rate',
      rate: 100, // requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      tags: { scenario: 'api_throughput' }
    }
  },
  
  // Performance thresholds
  thresholds: {
    // HTTP request metrics
    'http_req_duration': ['p(95)<500'], // 95% of requests under 500ms
    'http_req_duration{scenario:light}': ['p(95)<300'],
    'http_req_duration{scenario:medium}': ['p(95)<500'],
    'http_req_duration{scenario:heavy}': ['p(95)<800'],
    
    // HTTP request success rate
    'http_req_failed': ['rate<0.1'], // Less than 10% failure rate
    
    // WebSocket metrics
    'ws_connecting': ['p(95)<1000'], // WebSocket connection time
    'ws_msgs_received': ['count>0'], // Ensure messages are received
    
    // Custom metrics
    'message_latency': ['p(95)<100'], // Real-time message latency
    'connection_success_rate': ['rate>0.95'], // 95% connection success
    'concurrent_users': ['max>=100'], // Support at least 100 concurrent users
    
    // Resource utilization (when available)
    'memory_usage': ['max<1000'], // Memory usage in MB
    'cpu_usage': ['avg<80'] // CPU usage percentage
  },
  
  // Test data configuration
  testData: {
    // Debate topics for testing
    topics: [
      'Climate Change Policy Effectiveness',
      'Universal Basic Income Implementation', 
      'AI Ethics in Education',
      'Social Media Regulation',
      'Remote Work vs Office Culture',
      'Renewable Energy Transition',
      'Healthcare System Reform',
      'Digital Privacy Rights'
    ],
    
    // Sample messages for load testing
    sampleMessages: [
      'I believe this approach would be most effective because...',
      'However, we must consider the counterargument that...',
      'The evidence suggests that...',
      'From a different perspective...',
      'Building on the previous point...',
      'This raises an important question about...',
      'The data shows that...',
      'We should also examine...'
    ],
    
    // User behavior patterns
    userBehaviors: {
      activeDebater: {
        messageFrequency: 2000, // ms between messages
        typingIndicatorDelay: 500,
        reactionProbability: 0.3
      },
      passiveObserver: {
        messageFrequency: 10000,
        typingIndicatorDelay: 1000,
        reactionProbability: 0.1
      },
      moderateParticipant: {
        messageFrequency: 5000,
        typingIndicatorDelay: 750,
        reactionProbability: 0.2
      }
    }
  },
  
  // Monitoring and reporting
  monitoring: {
    enableDetailedLogs: __ENV.DETAILED_LOGS === 'true',
    enableMetricsCollection: __ENV.COLLECT_METRICS !== 'false',
    reportInterval: '10s',
    
    // External monitoring endpoints
    metricsEndpoint: __ENV.METRICS_ENDPOINT,
    alertingWebhook: __ENV.ALERTING_WEBHOOK
  },
  
  // Database configuration for load testing
  database: {
    testDbUrl: __ENV.TEST_DB_URL || 'postgresql://test:test@localhost:5432/bothsides_load_test',
    poolSize: 20,
    connectionTimeout: 5000
  },
  
  // Redis configuration
  redis: {
    testRedisUrl: __ENV.TEST_REDIS_URL || 'redis://localhost:6379/1',
    keyPrefix: 'load_test:',
    ttl: 3600 // 1 hour
  }
};

// Export individual configurations for specific test types
export const lightLoadConfig = {
  ...loadTestConfig,
  scenarios: { light: loadTestConfig.scenarios.light }
};

export const stressTestConfig = {
  ...loadTestConfig,
  scenarios: { stress: loadTestConfig.scenarios.stress }
};

export const websocketLoadConfig = {
  ...loadTestConfig,
  scenarios: { websocket_concurrent: loadTestConfig.scenarios.websocket_concurrent }
};

export const apiThroughputConfig = {
  ...loadTestConfig,
  scenarios: { api_throughput: loadTestConfig.scenarios.api_throughput }
};

// Helper functions for test configuration
export function getScenarioConfig(scenarioName) {
  return {
    ...loadTestConfig,
    scenarios: { [scenarioName]: loadTestConfig.scenarios[scenarioName] }
  };
}

export function createCustomScenario(name, config) {
  return {
    ...loadTestConfig,
    scenarios: { [name]: config }
  };
}

// Environment-specific overrides
if (loadTestConfig.environment === 'production') {
  // Production-specific settings
  loadTestConfig.thresholds['http_req_duration'] = ['p(95)<200'];
  loadTestConfig.scenarios.heavy.vus = 50; // Reduce load for production
}

if (loadTestConfig.environment === 'staging') {
  // Staging-specific settings
  loadTestConfig.thresholds['http_req_failed'] = ['rate<0.05'];
}

export default loadTestConfig;
