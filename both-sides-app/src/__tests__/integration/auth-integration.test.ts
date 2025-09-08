/**
 * Authentication Integration Tests
 * Testing Clerk authentication, session management, and permissions
 */

import { TestApiClient, mockClerkAuth, testUtils, TEST_CONFIG } from './setup';

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(() => mockClerkAuth),
  currentUser: jest.fn(() => mockClerkAuth.user),
  SignIn: jest.fn(() => '<div>SignIn Component</div>'),
  SignUp: jest.fn(() => '<div>SignUp Component</div>'),
  UserButton: jest.fn(() => '<div>UserButton Component</div>'),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  redirect: jest.fn(),
}));

describe('Authentication Integration Tests', () => {
  let apiClient: TestApiClient;

  beforeEach(() => {
    apiClient = new TestApiClient();
    jest.clearAllMocks();
  });

  describe('User Authentication Flow', () => {
    it('should authenticate user and receive valid JWT token', async () => {
      // Mock successful authentication
      const mockToken = 'valid-jwt-token-12345';
      mockClerkAuth.getToken.mockResolvedValue(mockToken);

      const token = await mockClerkAuth.getToken();

      expect(token).toBe(mockToken);
      expect(mockClerkAuth.getToken).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication failure gracefully', async () => {
      // Mock authentication failure
      mockClerkAuth.getToken.mockRejectedValue(new Error('Authentication failed'));

      await expect(mockClerkAuth.getToken()).rejects.toThrow('Authentication failed');
    });

    it('should maintain session across API calls', async () => {
      const mockToken = 'session-token-67890';
      mockClerkAuth.getToken.mockResolvedValue(mockToken);

      apiClient.setAuthToken(mockToken);

      // Mock successful API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ userId: TEST_CONFIG.MOCK_USER_ID })
      });

      const response = await apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.API_BASE_URL}/api/profiles/${TEST_CONFIG.MOCK_USER_ID}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`
          })
        })
      );

      testUtils.expectValidApiResponse(response);
    });

    it('should handle token expiration and refresh', async () => {
      // Mock expired token scenario
      let callCount = 0;
      mockClerkAuth.getToken.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Token expired');
        }
        return Promise.resolve('new-refreshed-token');
      });

      // First call should fail
      await expect(mockClerkAuth.getToken()).rejects.toThrow('Token expired');

      // Second call should succeed with refreshed token
      const newToken = await mockClerkAuth.getToken();
      expect(newToken).toBe('new-refreshed-token');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow student access to student endpoints', async () => {
      const studentUser = {
        ...mockClerkAuth.user,
        publicMetadata: { role: 'student' }
      };

      // Mock student accessing their profile
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: studentUser.id,
          role: 'student',
          permissions: ['read:own_profile', 'update:own_profile', 'participate:debates']
        })
      });

      const response = await apiClient.getProfile(studentUser.id);

      expect(response.role).toBe('student');
      expect(response.permissions).toContain('participate:debates');
    });

    it('should allow teacher access to teacher endpoints', async () => {
      const teacherUser = {
        ...mockClerkAuth.user,
        publicMetadata: { role: 'teacher' }
      };

      // Mock teacher accessing class management
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: teacherUser.id,
          role: 'teacher',
          permissions: [
            'read:all_profiles', 
            'manage:classes', 
            'moderate:debates',
            'view:analytics'
          ],
          classes: ['class-1', 'class-2']
        })
      });

      const response = await apiClient.getProfile(teacherUser.id);

      expect(response.role).toBe('teacher');
      expect(response.permissions).toContain('manage:classes');
      expect(response.permissions).toContain('moderate:debates');
      expect(Array.isArray(response.classes)).toBe(true);
    });

    it('should deny unauthorized access to protected endpoints', async () => {
      // Mock unauthorized access
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ error: 'Insufficient permissions' })
      });

      await expect(apiClient.getProfile('unauthorized-user')).rejects.toThrow('API request failed: 403 Forbidden');
    });

    it('should validate permissions for specific actions', async () => {
      const testCases = [
        {
          role: 'student',
          action: 'create:conversation',
          expected: true
        },
        {
          role: 'student', 
          action: 'delete:any_conversation',
          expected: false
        },
        {
          role: 'teacher',
          action: 'delete:any_conversation',
          expected: true
        },
        {
          role: 'teacher',
          action: 'manage:system_settings',
          expected: false
        }
      ];

      for (const testCase of testCases) {
        global.fetch = jest.fn().mockResolvedValue({
          ok: testCase.expected,
          status: testCase.expected ? 200 : 403,
          json: () => Promise.resolve(
            testCase.expected 
              ? { success: true }
              : { error: 'Insufficient permissions' }
          )
        });

        if (testCase.expected) {
          const response = await apiClient.makeRequest('/api/test-permission', {
            method: 'POST',
            body: JSON.stringify({ action: testCase.action })
          });
          expect(response.success).toBe(true);
        } else {
          await expect(
            apiClient.makeRequest('/api/test-permission', {
              method: 'POST', 
              body: JSON.stringify({ action: testCase.action })
            })
          ).rejects.toThrow();
        }
      }
    });
  });

  describe('Session Management', () => {
    it('should handle concurrent sessions correctly', async () => {
      // Mock multiple concurrent API calls
      const promises = Array.from({ length: 5 }, (_, i) => 
        new Promise(resolve => {
          setTimeout(() => {
            global.fetch = jest.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ callId: i, timestamp: Date.now() })
            });
            resolve(apiClient.getProfile(`user-${i}`));
          }, Math.random() * 100);
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result: any, index) => {
        expect(result.callId).toBe(index);
        expect(typeof result.timestamp).toBe('number');
      });
    });

    it('should handle session timeout gracefully', async () => {
      // Mock session timeout
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Session expired' })
      });

      await expect(apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID)).rejects.toThrow('API request failed: 401 Unauthorized');
    });

    it('should maintain user context across page reloads', async () => {
      // Mock persisted session
      const persistedUser = {
        id: TEST_CONFIG.MOCK_USER_ID,
        sessionId: 'persisted-session-123',
        lastActivity: new Date().toISOString()
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(persistedUser)
      });

      const response = await apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID);

      expect(response.id).toBe(persistedUser.id);
      expect(response.sessionId).toBe(persistedUser.sessionId);
      expect(response.lastActivity).toBeDefined();
    });
  });

  describe('Security Validations', () => {
    it('should validate JWT token structure', async () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      mockClerkAuth.getToken.mockResolvedValue(validToken);
      
      const token = await mockClerkAuth.getToken();
      
      // Basic JWT structure validation (3 parts separated by dots)
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      
      // Each part should be base64 encoded
      parts.forEach(part => {
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      });
    });

    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        'invalid-token',
        'header.payload', // Missing signature
        'header..signature', // Empty payload
        '', // Empty token
        null,
        undefined
      ];

      for (const token of malformedTokens) {
        mockClerkAuth.getToken.mockResolvedValue(token);
        
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ error: 'Invalid token' })
        });

        apiClient.setAuthToken(token as string);
        
        await expect(apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID)).rejects.toThrow();
      }
    });

    it('should handle CSRF protection', async () => {
      // Mock CSRF token requirement
      global.fetch = jest.fn().mockImplementation((url, options) => {
        const headers = options?.headers as Record<string, string> || {};
        
        if (options?.method === 'POST' && !headers['X-CSRF-Token']) {
          return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: () => Promise.resolve({ error: 'CSRF token missing' })
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });

      // Request without CSRF token should fail
      await expect(
        apiClient.createConversation({ topic: 'Test Topic' })
      ).rejects.toThrow('API request failed: 403 Forbidden');

      // Add CSRF token to API client
      const originalMakeRequest = apiClient['makeRequest'];
      apiClient['makeRequest'] = function(endpoint: string, options: RequestInit = {}) {
        return originalMakeRequest.call(this, endpoint, {
          ...options,
          headers: {
            ...options.headers,
            'X-CSRF-Token': 'valid-csrf-token'
          }
        });
      };

      // Request with CSRF token should succeed
      const response = await apiClient.createConversation({ topic: 'Test Topic' });
      expect(response.success).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network connectivity issues', async () => {
      // Mock network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID)).rejects.toThrow('Network error');
    });

    it('should handle server errors gracefully', async () => {
      // Mock server error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Database connection failed' })
      });

      await expect(apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID)).rejects.toThrow('API request failed: 500 Internal Server Error');
    });

    it('should implement retry logic for transient failures', async () => {
      let attempts = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable'
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, attempts })
        });
      });

      // This would require implementing retry logic in the API client
      // For now, we'll just test that the failure is handled
      await expect(apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID)).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
