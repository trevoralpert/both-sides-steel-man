/**
 * Error Handling Integration Tests
 * Testing network failures, timeouts, invalid data scenarios, and recovery mechanisms
 */

import { TestApiClient, testUtils, TEST_CONFIG } from './setup';

describe('Error Handling Integration Tests', () => {
  let apiClient: TestApiClient;

  beforeEach(() => {
    apiClient = new TestApiClient();
    jest.clearAllMocks();
  });

  describe('Network Error Scenarios', () => {
    it('should handle connection timeout', async () => {
      // Mock timeout error
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID))
        .rejects.toThrow('Request timeout');
    });

    it('should handle network connectivity loss', async () => {
      // Mock network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

      await expect(apiClient.getSurveyQuestions())
        .rejects.toThrow('Failed to fetch');
    });

    it('should handle DNS resolution failure', async () => {
      // Mock DNS error
      global.fetch = jest.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

      await expect(apiClient.analyzeBeliefs(TEST_CONFIG.MOCK_USER_ID))
        .rejects.toThrow('getaddrinfo ENOTFOUND');
    });

    it('should handle CORS errors', async () => {
      // Mock CORS error
      global.fetch = jest.fn().mockRejectedValue(new Error('CORS policy blocked'));

      await expect(apiClient.createConversation({ topic: 'Test' }))
        .rejects.toThrow('CORS policy blocked');
    });
  });

  describe('HTTP Error Status Codes', () => {
    const errorScenarios = [
      { status: 400, statusText: 'Bad Request', description: 'Invalid request data' },
      { status: 401, statusText: 'Unauthorized', description: 'Authentication required' },
      { status: 403, statusText: 'Forbidden', description: 'Insufficient permissions' },
      { status: 404, statusText: 'Not Found', description: 'Resource not found' },
      { status: 409, statusText: 'Conflict', description: 'Resource conflict' },
      { status: 422, statusText: 'Unprocessable Entity', description: 'Validation failed' },
      { status: 429, statusText: 'Too Many Requests', description: 'Rate limit exceeded' },
      { status: 500, statusText: 'Internal Server Error', description: 'Server error' },
      { status: 502, statusText: 'Bad Gateway', description: 'Gateway error' },
      { status: 503, statusText: 'Service Unavailable', description: 'Service down' },
      { status: 504, statusText: 'Gateway Timeout', description: 'Gateway timeout' }
    ];

    errorScenarios.forEach(({ status, statusText, description }) => {
      it(`should handle ${status} ${statusText} errors`, async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status,
          statusText,
          json: () => Promise.resolve({
            error: description,
            code: status,
            timestamp: new Date().toISOString()
          })
        });

        await expect(apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID))
          .rejects.toThrow(`API request failed: ${status} ${statusText}`);
      });
    });
  });

  describe('Data Validation Errors', () => {
    it('should handle malformed JSON responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Unexpected token in JSON'))
      });

      await expect(apiClient.getSurveyQuestions())
        .rejects.toThrow('Unexpected token in JSON');
    });

    it('should handle empty response bodies', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null)
      });

      const response = await apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID);
      expect(response).toBeNull();
    });

    it('should handle missing required fields in responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          // Missing required fields like 'id', 'email', etc.
          firstName: 'John'
        })
      });

      const response = await apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID);
      
      // Response should be received but validation would happen at the application level
      expect(response.firstName).toBe('John');
      expect(response.id).toBeUndefined();
    });

    it('should handle invalid data types in responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 123, // Should be string
          email: null, // Should be string
          beliefProfile: 'invalid', // Should be object
          createdAt: 'invalid-date' // Should be valid ISO string
        })
      });

      const response = await apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID);
      
      // API client receives the response, validation happens at application level
      expect(typeof response.id).toBe('number');
      expect(response.email).toBeNull();
      expect(typeof response.beliefProfile).toBe('string');
    });
  });

  describe('Authentication and Authorization Errors', () => {
    it('should handle expired JWT tokens', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({
          error: 'JWT token expired',
          code: 'TOKEN_EXPIRED',
          expiredAt: new Date(Date.now() - 3600000).toISOString()
        })
      });

      await expect(apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID))
        .rejects.toThrow('API request failed: 401 Unauthorized');
    });

    it('should handle invalid JWT tokens', async () => {
      apiClient.setAuthToken('invalid.jwt.token');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({
          error: 'Invalid JWT token',
          code: 'INVALID_TOKEN'
        })
      });

      await expect(apiClient.analyzeBeliefs(TEST_CONFIG.MOCK_USER_ID))
        .rejects.toThrow('API request failed: 401 Unauthorized');
    });

    it('should handle missing authentication', async () => {
      apiClient.setAuthToken('');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        })
      });

      await expect(apiClient.submitSurveyResponse([]))
        .rejects.toThrow('API request failed: 401 Unauthorized');
    });

    it('should handle insufficient permissions', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: ['admin:read'],
          current: ['student:read', 'student:write']
        })
      });

      await expect(apiClient.getProfile('other-user-id'))
        .rejects.toThrow('API request failed: 403 Forbidden');
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should handle rate limit exceeded', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([
          ['Retry-After', '60'],
          ['X-RateLimit-Limit', '100'],
          ['X-RateLimit-Remaining', '0'],
          ['X-RateLimit-Reset', String(Date.now() + 60000)]
        ]),
        json: () => Promise.resolve({
          error: 'Rate limit exceeded',
          retryAfter: 60,
          limit: 100,
          window: '1h'
        })
      });

      await expect(apiClient.findMatches(TEST_CONFIG.MOCK_USER_ID))
        .rejects.toThrow('API request failed: 429 Too Many Requests');
    });

    it('should handle throttling with backoff', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            json: () => Promise.resolve({ error: 'Rate limited' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });

      // Without retry logic, this will fail on first attempt
      await expect(apiClient.getSurveyQuestions())
        .rejects.toThrow('API request failed: 429 Too Many Requests');
      
      expect(callCount).toBe(1);
    });
  });

  describe('Data Consistency Errors', () => {
    it('should handle version conflicts', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve({
          error: 'Version conflict',
          code: 'VERSION_CONFLICT',
          currentVersion: 5,
          attemptedVersion: 3,
          conflictingFields: ['preferences', 'beliefProfile']
        })
      });

      const updates = { firstName: 'Updated Name' };
      
      await expect(apiClient.updateProfile(TEST_CONFIG.MOCK_USER_ID, updates))
        .rejects.toThrow('API request failed: 409 Conflict');
    });

    it('should handle stale data scenarios', async () => {
      // First request gets data
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: TEST_CONFIG.MOCK_USER_ID,
          version: 1,
          lastModified: '2024-01-01T10:00:00Z',
          firstName: 'John'
        })
      });

      const profile = await apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID);
      expect(profile.version).toBe(1);

      // Update fails due to stale data
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve({
          error: 'Stale data',
          currentVersion: 2,
          providedVersion: 1
        })
      });

      await expect(apiClient.updateProfile(TEST_CONFIG.MOCK_USER_ID, { firstName: 'Jane' }))
        .rejects.toThrow('API request failed: 409 Conflict');
    });

    it('should handle concurrent modification errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve({
          error: 'Concurrent modification detected',
          code: 'CONCURRENT_MODIFICATION',
          lastModifiedBy: 'other-user-id',
          lastModifiedAt: new Date().toISOString()
        })
      });

      await expect(apiClient.updateProfile(TEST_CONFIG.MOCK_USER_ID, { firstName: 'Updated' }))
        .rejects.toThrow('API request failed: 409 Conflict');
    });
  });

  describe('Service Dependency Errors', () => {
    it('should handle database connection failures', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({
          error: 'Database connection failed',
          code: 'DB_CONNECTION_ERROR',
          service: 'postgresql',
          retryAfter: 30
        })
      });

      await expect(apiClient.getSurveyQuestions())
        .rejects.toThrow('API request failed: 503 Service Unavailable');
    });

    it('should handle external service failures', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.resolve({
          error: 'AI analysis service unavailable',
          code: 'EXTERNAL_SERVICE_ERROR',
          service: 'belief-analysis-ai',
          fallbackAvailable: false
        })
      });

      await expect(apiClient.analyzeBeliefs(TEST_CONFIG.MOCK_USER_ID))
        .rejects.toThrow('API request failed: 502 Bad Gateway');
    });

    it('should handle cache service failures', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({
          error: 'Cache service unavailable',
          code: 'CACHE_ERROR',
          service: 'redis',
          degradedMode: true,
          performanceImpact: 'high'
        })
      });

      await expect(apiClient.findMatches(TEST_CONFIG.MOCK_USER_ID))
        .rejects.toThrow('API request failed: 503 Service Unavailable');
    });
  });

  describe('Recovery and Resilience Patterns', () => {
    it('should handle graceful degradation', async () => {
      // AI analysis fails, but basic profile still works
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: TEST_CONFIG.MOCK_USER_ID,
          beliefProfile: null, // AI analysis failed
          basicProfile: {
            political: 0,
            social: 0,
            economic: 0,
            environmental: 0,
            international: 0
          },
          warning: 'AI analysis unavailable, showing basic profile',
          degradedMode: true
        })
      });

      const response = await apiClient.analyzeBeliefs(TEST_CONFIG.MOCK_USER_ID);
      
      expect(response.degradedMode).toBe(true);
      expect(response.basicProfile).toBeDefined();
      expect(response.warning).toContain('AI analysis unavailable');
    });

    it('should handle partial success scenarios', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          results: [
            { id: 'match-1', status: 'success', data: { score: 0.8 } },
            { id: 'match-2', status: 'failed', error: 'Profile incomplete' },
            { id: 'match-3', status: 'success', data: { score: 0.6 } }
          ],
          summary: {
            total: 3,
            successful: 2,
            failed: 1,
            warnings: ['Some matches could not be processed']
          }
        })
      });

      const response = await apiClient.findMatches(TEST_CONFIG.MOCK_USER_ID);
      
      expect(response.success).toBe(true);
      expect(response.summary.successful).toBe(2);
      expect(response.summary.failed).toBe(1);
      expect(response.summary.warnings).toHaveLength(1);
    });

    it('should provide meaningful error context', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'Survey submission failed',
          code: 'VALIDATION_ERROR',
          details: {
            invalidResponses: [
              {
                questionId: 'q1',
                value: null,
                error: 'Required field cannot be null',
                suggestion: 'Please provide a valid response'
              },
              {
                questionId: 'q5',
                value: 15,
                error: 'Value out of range',
                validRange: { min: 1, max: 10 },
                suggestion: 'Please select a value between 1 and 10'
              }
            ]
          },
          userMessage: 'Please correct the highlighted fields and try again',
          supportCode: 'ERR-SRV-001-20240101'
        })
      });

      await expect(apiClient.submitSurveyResponse([]))
        .rejects.toThrow('API request failed: 400 Bad Request');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely large responses', async () => {
      const largeResponse = {
        data: 'x'.repeat(10 * 1024 * 1024), // 10MB string
        metadata: { size: '10MB', warning: 'Large response' }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(largeResponse)
      });

      const response = await apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID);
      
      expect(response.data.length).toBe(10 * 1024 * 1024);
      expect(response.metadata.warning).toBe('Large response');
    });

    it('should handle unicode and special characters', async () => {
      const unicodeData = {
        name: '测试用户 🎭',
        bio: 'Iñtërnâtiônàlizætiøn tëst with émojis 🌍🚀',
        specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(unicodeData)
      });

      const response = await apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID);
      
      expect(response.name).toBe('测试用户 🎭');
      expect(response.bio).toContain('émojis 🌍🚀');
      expect(response.specialChars).toBe('!@#$%^&*()_+-=[]{}|;:,.<>?');
    });

    it('should handle null and undefined values gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: TEST_CONFIG.MOCK_USER_ID,
          firstName: null,
          lastName: undefined,
          email: '',
          beliefProfile: null,
          preferences: {}
        })
      });

      const response = await apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID);
      
      expect(response.id).toBe(TEST_CONFIG.MOCK_USER_ID);
      expect(response.firstName).toBeNull();
      expect(response.lastName).toBeUndefined();
      expect(response.email).toBe('');
      expect(response.beliefProfile).toBeNull();
      expect(typeof response.preferences).toBe('object');
    });
  });
});
