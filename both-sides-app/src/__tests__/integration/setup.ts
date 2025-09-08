/**
 * Integration Test Setup
 * Configures test environment for API integration testing
 */

import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key';
process.env.CLERK_SECRET_KEY = 'sk_test_mock_key';

// Global test configuration
export const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3001',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  MOCK_USER_ID: 'test-user-123',
  MOCK_CONVERSATION_ID: 'test-conversation-456',
  MOCK_CLASS_ID: 'test-class-789'
};

// Mock Clerk authentication
export const mockClerkAuth = {
  userId: TEST_CONFIG.MOCK_USER_ID,
  sessionId: 'test-session-123',
  orgId: 'test-org-456',
  getToken: jest.fn().mockResolvedValue('mock-jwt-token'),
  signOut: jest.fn().mockResolvedValue(undefined),
  user: {
    id: TEST_CONFIG.MOCK_USER_ID,
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
    publicMetadata: { role: 'student' }
  }
};

// Mock API responses
export const mockApiResponses = {
  survey: {
    questions: [
      {
        id: 'q1',
        text: 'What is your stance on environmental policies?',
        type: 'MULTIPLE_CHOICE',
        category: 'ENVIRONMENTAL',
        options: ['Very Liberal', 'Liberal', 'Moderate', 'Conservative', 'Very Conservative'],
        required: true
      },
      {
        id: 'q2', 
        text: 'Rate your agreement with progressive taxation',
        type: 'SCALE',
        category: 'ECONOMIC',
        scale: { min: 1, max: 10 },
        required: true
      }
    ],
    totalQuestions: 20,
    estimatedTime: 15
  },
  beliefProfile: {
    political: 0.3,
    social: -0.2,
    economic: 0.7,
    environmental: -0.8,
    international: 0.1
  },
  matchingResults: {
    matches: [
      {
        userId: 'match-user-1',
        compatibilityScore: 0.15,
        opposingAxes: ['environmental', 'economic'],
        profile: {
          political: -0.4,
          social: 0.3,
          economic: -0.6,
          environmental: 0.9,
          international: -0.2
        }
      }
    ],
    totalCandidates: 50,
    processingTime: 120
  }
};

// Test database utilities
export class TestDatabase {
  static async setup() {
    // In a real implementation, this would set up a test database
    console.log('Setting up test database...');
  }

  static async cleanup() {
    // Clean up test data
    console.log('Cleaning up test database...');
  }

  static async seedTestData() {
    // Seed with test data
    console.log('Seeding test data...');
    return {
      testUsers: [
        { id: 'user-1', email: 'student1@test.com', role: 'student' },
        { id: 'user-2', email: 'student2@test.com', role: 'student' },
        { id: 'teacher-1', email: 'teacher@test.com', role: 'teacher' }
      ],
      testClasses: [
        { id: 'class-1', name: 'Test Debate Class', teacherId: 'teacher-1' }
      ],
      testConversations: [
        { 
          id: 'conv-1', 
          topic: 'Climate Change Policy',
          participants: ['user-1', 'user-2'],
          status: 'active'
        }
      ]
    };
  }
}

// API client for integration tests
export class TestApiClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl = TEST_CONFIG.API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.authToken = 'mock-jwt-token';
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Generic HTTP methods
  async get(endpoint: string, options: RequestInit = {}) {
    // Mock response for external service tests
    return {
      status: 200,
      data: this.getMockResponse(endpoint)
    };
  }

  async post(endpoint: string, data?: any, options: RequestInit = {}) {
    // Mock response for external service tests
    return {
      status: 200,
      data: this.getMockResponse(endpoint, data)
    };
  }

  async put(endpoint: string, data?: any, options: RequestInit = {}) {
    return {
      status: 200,
      data: this.getMockResponse(endpoint, data)
    };
  }

  async delete(endpoint: string, options: RequestInit = {}) {
    return {
      status: 200,
      data: { success: true }
    };
  }

  private getMockResponse(endpoint: string, data?: any): any {
    // Mock responses for different endpoints
    if (endpoint.includes('/provider/status')) {
      return { currentProvider: 'mock', status: 'active' };
    }
    
    if (endpoint.includes('/provider/switch')) {
      return { provider: data?.provider || 'timeback', status: 'active' };
    }

    if (endpoint.includes('/auth/session')) {
      return { sessionId: `session-${Date.now()}`, userId: data?.userId };
    }

    if (endpoint.includes('/cache/session')) {
      return data?.userId ? { userId: data.userId, metadata: data.metadata } : null;
    }

    if (endpoint.includes('/ai/coaching/suggest')) {
      return {
        suggestions: [
          { text: 'Consider strengthening your argument with evidence', type: 'improvement', confidence: 0.85 },
          { text: 'Address potential counterarguments', type: 'strategy', confidence: 0.78 }
        ],
        safetyCheck: { passed: true },
        sessionCacheUsed: true
      };
    }

    if (endpoint.includes('/realtime/connect')) {
      return { 
        connectionId: `conn-${Date.now()}`, 
        channel: `channel-${Date.now()}`, 
        authToken: 'mock-token',
        status: 'connected',
        fallbackMode: data?.simulateAblyFailure || false,
        connectionType: data?.simulateAblyFailure ? 'polling' : 'websocket'
      };
    }

    if (endpoint.includes('/realtime/message')) {
      return { messageId: `msg-${Date.now()}`, delivered: true };
    }

    if (endpoint.includes('/health/external')) {
      return {
        services: {
          redis: { status: 'healthy', responseTime: 50 },
          openai: { status: 'healthy', responseTime: 200 },
          ably: { status: 'healthy', responseTime: 30 },
          timeback: { status: 'healthy', responseTime: 100 }
        }
      };
    }

    if (endpoint.includes('/metrics/external')) {
      return {
        metrics: {
          throughput: 1500,
          errorRate: 0.02,
          averageLatency: 85,
          serviceBreakdown: {
            redis: { requests: 500, avgLatency: 5 },
            openai: { requests: 200, avgLatency: 180 },
            ably: { requests: 800, avgLatency: 25 }
          }
        }
      };
    }

    // Default mock response
    return { success: true, timestamp: new Date().toISOString(), data };
  }

  async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Survey API methods
  async getSurveyQuestions() {
    return this.makeRequest('/api/survey/questions');
  }

  async submitSurveyResponse(responses: any[]) {
    return this.makeRequest('/api/survey/responses', {
      method: 'POST',
      body: JSON.stringify({ responses })
    });
  }

  // Profile API methods
  async getProfile(userId: string) {
    return this.makeRequest(`/api/profiles/${userId}`);
  }

  async updateProfile(userId: string, updates: any) {
    return this.makeRequest(`/api/profiles/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // Belief Analysis API methods
  async analyzeBeliefs(userId: string) {
    return this.makeRequest(`/api/belief-analysis/${userId}`);
  }

  async findMatches(userId: string, preferences: any = {}) {
    return this.makeRequest('/api/matching/find-opponents', {
      method: 'POST',
      body: JSON.stringify({ userId, preferences })
    });
  }

  // Conversation API methods
  async createConversation(data: any) {
    return this.makeRequest('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getConversation(conversationId: string) {
    return this.makeRequest(`/api/conversations/${conversationId}`);
  }
}

// Test utilities
export const testUtils = {
  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test data
  generateTestUser: (overrides: any = {}) => ({
    id: `test-user-${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'student',
    ...overrides
  }),

  generateTestSurveyResponses: () => [
    { questionId: 'q1', value: 'Liberal', timestamp: new Date() },
    { questionId: 'q2', value: 7, timestamp: new Date() },
    { questionId: 'q3', value: 'Agree', timestamp: new Date() }
  ],

  // Assertion helpers
  expectValidApiResponse: (response: any) => {
    expect(response).toBeDefined();
    expect(typeof response).toBe('object');
    expect(response.error).toBeUndefined();
  },

  expectValidBeliefProfile: (profile: any) => {
    expect(profile).toBeDefined();
    expect(typeof profile.political).toBe('number');
    expect(typeof profile.social).toBe('number');
    expect(typeof profile.economic).toBe('number');
    expect(typeof profile.environmental).toBe('number');
    expect(typeof profile.international).toBe('number');
    
    // Values should be between -1 and 1
    Object.values(profile).forEach(value => {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    });
  },

  expectValidMatchResult: (match: any) => {
    expect(match).toBeDefined();
    expect(typeof match.userId).toBe('string');
    expect(typeof match.compatibilityScore).toBe('number');
    expect(Array.isArray(match.opposingAxes)).toBe(true);
    expect(match.profile).toBeDefined();
  }
};

// Setup and teardown utilities for test files
export const setupIntegrationTests = async () => {
  await TestDatabase.setup();
  await TestDatabase.seedTestData();
};

export const cleanupIntegrationTests = async () => {
  await TestDatabase.cleanup();
};

export { mockClerkAuth, mockApiResponses, TestApiClient };
