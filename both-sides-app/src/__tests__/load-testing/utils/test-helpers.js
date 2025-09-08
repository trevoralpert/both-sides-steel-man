/**
 * Load Testing Utility Functions
 * Common helpers for k6 load testing scenarios
 */

import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import http from 'k6/http';
import ws from 'k6/ws';
import { loadTestConfig } from '../config/load-test-config.js';

// Custom metrics
export const messageLatency = new Trend('message_latency');
export const connectionSuccessRate = new Rate('connection_success_rate');
export const concurrentUsers = new Counter('concurrent_users');
export const messagesPerSecond = new Rate('messages_per_second');
export const websocketErrors = new Counter('websocket_errors');

// Authentication helpers
export class AuthHelper {
  static async login(credentials) {
    const response = http.post(`${loadTestConfig.apiUrl}/api/auth/login`, {
      email: credentials.email,
      password: credentials.password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const success = check(response, {
      'login successful': (r) => r.status === 200,
      'has auth token': (r) => r.json('token') !== undefined
    });

    if (success) {
      return {
        token: response.json('token'),
        userId: response.json('userId'),
        user: response.json('user')
      };
    }

    throw new Error(`Login failed: ${response.status} ${response.body}`);
  }

  static getAuthHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  static async loginRandomUser() {
    const users = Object.values(loadTestConfig.testUserCredentials);
    const randomUser = users[Math.floor(Math.random() * users.length)];
    return await this.login(randomUser);
  }
}

// Test data generators
export class DataGenerator {
  static getRandomTopic() {
    const topics = loadTestConfig.testData.topics;
    return topics[Math.floor(Math.random() * topics.length)];
  }

  static getRandomMessage() {
    const messages = loadTestConfig.testData.sampleMessages;
    return messages[Math.floor(Math.random() * messages.length)];
  }

  static generateUserId() {
    return `load_test_user_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateConversationId() {
    return `load_test_conv_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getRandomUserBehavior() {
    const behaviors = Object.keys(loadTestConfig.testData.userBehaviors);
    const randomBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
    return loadTestConfig.testData.userBehaviors[randomBehavior];
  }

  static generateSurveyResponse() {
    return {
      responses: [
        { questionId: 'q1', value: Math.floor(Math.random() * 5) + 1 },
        { questionId: 'q2', value: Math.floor(Math.random() * 5) + 1 },
        { questionId: 'q3', value: Math.floor(Math.random() * 5) + 1 },
        { questionId: 'q4', value: Math.floor(Math.random() * 5) + 1 },
        { questionId: 'q5', value: Math.floor(Math.random() * 5) + 1 }
      ]
    };
  }

  static generateBeliefProfile() {
    return {
      political: (Math.random() - 0.5) * 2,
      social: (Math.random() - 0.5) * 2,
      economic: (Math.random() - 0.5) * 2,
      environmental: (Math.random() - 0.5) * 2,
      international: (Math.random() - 0.5) * 2
    };
  }
}

// API testing helpers
export class ApiTester {
  constructor(authToken) {
    this.authToken = authToken;
    this.headers = AuthHelper.getAuthHeaders(authToken);
  }

  async testGetProfile(userId) {
    const startTime = Date.now();
    const response = http.get(`${loadTestConfig.apiUrl}/api/profiles/${userId}`, {
      headers: this.headers
    });
    
    const duration = Date.now() - startTime;
    
    check(response, {
      'profile request successful': (r) => r.status === 200,
      'profile has required fields': (r) => {
        const profile = r.json();
        return profile && profile.id && profile.email;
      }
    });

    return { response, duration };
  }

  async testCreateConversation(topicData) {
    const startTime = Date.now();
    const response = http.post(`${loadTestConfig.apiUrl}/api/conversations`, 
      JSON.stringify(topicData), 
      { headers: this.headers }
    );
    
    const duration = Date.now() - startTime;
    
    check(response, {
      'conversation creation successful': (r) => r.status === 201,
      'conversation has ID': (r) => r.json('id') !== undefined
    });

    return { response, duration };
  }

  async testSubmitSurveyResponse(surveyData) {
    const startTime = Date.now();
    const response = http.post(`${loadTestConfig.apiUrl}/api/survey/responses`,
      JSON.stringify(surveyData),
      { headers: this.headers }
    );

    const duration = Date.now() - startTime;

    check(response, {
      'survey submission successful': (r) => r.status === 200,
      'belief profile generated': (r) => r.json('beliefProfile') !== undefined
    });

    return { response, duration };
  }

  async testGetMatches(userId) {
    const startTime = Date.now();
    const response = http.get(`${loadTestConfig.apiUrl}/api/matching/opponents/${userId}`, {
      headers: this.headers
    });

    const duration = Date.now() - startTime;

    check(response, {
      'matches request successful': (r) => r.status === 200,
      'matches returned': (r) => Array.isArray(r.json('matches'))
    });

    return { response, duration };
  }
}

// WebSocket testing helpers
export class WebSocketTester {
  constructor(authToken, conversationId) {
    this.authToken = authToken;
    this.conversationId = conversationId;
    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.connectionTime = 0;
  }

  connect() {
    const startTime = Date.now();
    const wsUrl = `${loadTestConfig.wsUrl}/ws?token=${this.authToken}&conversation=${this.conversationId}`;
    
    const response = ws.connect(wsUrl, {}, (socket) => {
      this.connectionTime = Date.now() - startTime;
      connectionSuccessRate.add(1);
      concurrentUsers.add(1);

      socket.on('open', () => {
        console.log(`WebSocket connected for conversation ${this.conversationId}`);
        
        // Send periodic messages
        this.sendPeriodicMessages(socket);
      });

      socket.on('message', (data) => {
        this.messagesReceived++;
        const message = JSON.parse(data);
        
        if (message.timestamp) {
          const latency = Date.now() - new Date(message.timestamp).getTime();
          messageLatency.add(latency);
        }

        messagesPerSecond.add(1);
      });

      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        websocketErrors.add(1);
        connectionSuccessRate.add(0);
      });

      socket.on('close', () => {
        console.log('WebSocket connection closed');
      });

      // Keep connection alive for test duration
      socket.setTimeout(() => {
        socket.close();
      }, 30000); // 30 seconds
    });

    check(response, {
      'websocket connection successful': () => this.connectionTime < 1000
    });

    return response;
  }

  sendPeriodicMessages(socket) {
    const behavior = DataGenerator.getRandomUserBehavior();
    
    const messageInterval = setInterval(() => {
      if (socket.readyState === 1) { // WebSocket.OPEN
        const message = {
          type: 'message',
          content: DataGenerator.getRandomMessage(),
          timestamp: new Date().toISOString(),
          conversationId: this.conversationId
        };

        socket.send(JSON.stringify(message));
        this.messagesSent++;
      } else {
        clearInterval(messageInterval);
      }
    }, behavior.messageFrequency);

    // Clear interval after test duration
    setTimeout(() => {
      clearInterval(messageInterval);
    }, 25000);
  }

  simulateTypingIndicator(socket) {
    const typingMessage = {
      type: 'typing',
      userId: DataGenerator.generateUserId(),
      conversationId: this.conversationId,
      isTyping: true
    };

    socket.send(JSON.stringify(typingMessage));

    // Stop typing after random delay
    setTimeout(() => {
      typingMessage.isTyping = false;
      socket.send(JSON.stringify(typingMessage));
    }, Math.random() * 3000 + 1000);
  }

  simulatePresenceUpdate(socket) {
    const presenceMessage = {
      type: 'presence',
      userId: DataGenerator.generateUserId(),
      status: 'active',
      lastSeen: new Date().toISOString()
    };

    socket.send(JSON.stringify(presenceMessage));
  }
}

// Performance monitoring helpers
export class PerformanceMonitor {
  static startTimer() {
    return Date.now();
  }

  static endTimer(startTime) {
    return Date.now() - startTime;
  }

  static recordCustomMetric(name, value) {
    if (!this.customMetrics) {
      this.customMetrics = {};
    }
    
    if (!this.customMetrics[name]) {
      this.customMetrics[name] = new Trend(name);
    }
    
    this.customMetrics[name].add(value);
  }

  static async measureResourceUsage() {
    try {
      const response = http.get(`${loadTestConfig.apiUrl}/api/health/system`);
      
      if (response.status === 200) {
        const metrics = response.json();
        
        if (metrics.memory) {
          this.recordCustomMetric('memory_usage', metrics.memory.used);
        }
        
        if (metrics.cpu) {
          this.recordCustomMetric('cpu_usage', metrics.cpu.percentage);
        }
        
        if (metrics.connections) {
          this.recordCustomMetric('active_connections', metrics.connections.active);
        }
      }
    } catch (error) {
      console.warn('Failed to collect resource metrics:', error);
    }
  }

  static logTestProgress(iteration, totalIterations) {
    if (iteration % 10 === 0 || iteration === totalIterations) {
      console.log(`Progress: ${iteration}/${totalIterations} iterations completed`);
    }
  }
}

// Scenario helpers
export class ScenarioRunner {
  static async runUserJourney(authToken) {
    const apiTester = new ApiTester(authToken);
    const userId = DataGenerator.generateUserId();
    
    // 1. Get user profile
    await apiTester.testGetProfile(userId);
    sleep(0.5);
    
    // 2. Submit survey
    const surveyData = DataGenerator.generateSurveyResponse();
    await apiTester.testSubmitSurveyResponse(surveyData);
    sleep(1);
    
    // 3. Find matches
    await apiTester.testGetMatches(userId);
    sleep(0.5);
    
    // 4. Create conversation
    const topicData = {
      topic: DataGenerator.getRandomTopic(),
      participants: [userId, DataGenerator.generateUserId()]
    };
    await apiTester.testCreateConversation(topicData);
  }

  static async runDebateSession(authToken) {
    const conversationId = DataGenerator.generateConversationId();
    const wsTester = new WebSocketTester(authToken, conversationId);
    
    // Connect to WebSocket and simulate debate
    wsTester.connect();
    
    // Simulate user activity
    sleep(Math.random() * 5 + 5); // 5-10 seconds of activity
  }

  static async runConcurrentDebates(authToken, numDebates = 3) {
    const promises = [];
    
    for (let i = 0; i < numDebates; i++) {
      promises.push(this.runDebateSession(authToken));
      sleep(0.1); // Small delay between connections
    }
    
    await Promise.all(promises);
  }
}

// Error handling and recovery
export class ErrorHandler {
  static handleApiError(response, context) {
    if (response.status >= 400) {
      console.error(`API Error in ${context}: ${response.status} ${response.body}`);
      return false;
    }
    return true;
  }

  static handleWebSocketError(error, context) {
    console.error(`WebSocket Error in ${context}:`, error);
    websocketErrors.add(1);
    return false;
  }

  static retryOperation(operation, maxRetries = 3, delay = 1000) {
    return new Promise(async (resolve, reject) => {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await operation();
          resolve(result);
          return;
        } catch (error) {
          lastError = error;
          console.warn(`Attempt ${attempt} failed:`, error.message);
          
          if (attempt < maxRetries) {
            sleep(delay / 1000); // k6 sleep expects seconds
          }
        }
      }
      
      reject(lastError);
    });
  }
}

export default {
  AuthHelper,
  DataGenerator,
  ApiTester,
  WebSocketTester,
  PerformanceMonitor,
  ScenarioRunner,
  ErrorHandler,
  messageLatency,
  connectionSuccessRate,
  concurrentUsers,
  messagesPerSecond,
  websocketErrors
};
