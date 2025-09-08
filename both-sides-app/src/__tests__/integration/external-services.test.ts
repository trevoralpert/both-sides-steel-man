/**
 * External Services Integration Tests
 * Tests for Redis, OpenAI, Ably, and TimeBack integrations
 */

import { TestApiClient, TestDatabase, testUtils } from './setup';

describe('External Services Integration', () => {
  let apiClient: TestApiClient;

  beforeAll(async () => {
    await TestDatabase.setup();
    apiClient = new TestApiClient();
  });

  afterAll(async () => {
    await TestDatabase.cleanup();
  });

  beforeEach(async () => {
    // Reset test data before each test
    await TestDatabase.seedTestData();
  });

  describe('Integration Layer Provider Switching', () => {
    test('should switch from Mock to TimeBack provider', async () => {
      // Test provider switching functionality
      const mockResponse = await apiClient.get('/api/integration/provider/status');
      expect(mockResponse.status).toBe(200);
      expect(mockResponse.data).toHaveProperty('currentProvider');

      // Switch to TimeBack provider
      const switchResponse = await apiClient.post('/api/integration/provider/switch', {
        provider: 'timeback',
        config: {
          apiKey: 'test-timeback-key',
          endpoint: 'https://api.timeback.test'
        }
      });

      expect(switchResponse.status).toBe(200);
      expect(switchResponse.data.provider).toBe('timeback');
      expect(switchResponse.data.status).toBe('active');
    });

    test('should handle provider switching failures gracefully', async () => {
      // Test with invalid provider
      const invalidResponse = await apiClient.post('/api/integration/provider/switch', {
        provider: 'invalid-provider'
      });

      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse.data.error).toContain('Invalid provider');

      // Test with missing credentials
      const missingCredsResponse = await apiClient.post('/api/integration/provider/switch', {
        provider: 'timeback'
        // Missing config
      });

      expect(missingCredsResponse.status).toBe(400);
      expect(missingCredsResponse.data.error).toContain('Missing configuration');
    });

    test('should fall back to Mock provider on TimeBack failure', async () => {
      // Simulate TimeBack API failure
      const fallbackResponse = await apiClient.post('/api/integration/provider/test', {
        provider: 'timeback',
        simulateFailure: true
      });

      expect(fallbackResponse.status).toBe(200);
      expect(fallbackResponse.data.fallbackUsed).toBe(true);
      expect(fallbackResponse.data.activeProvider).toBe('mock');
    });

    test('should maintain provider state across requests', async () => {
      // Switch to TimeBack
      await apiClient.post('/api/integration/provider/switch', {
        provider: 'timeback',
        config: { apiKey: 'test-key' }
      });

      // Verify state persistence
      const status1 = await apiClient.get('/api/integration/provider/status');
      expect(status1.data.currentProvider).toBe('timeback');

      // Make another request
      const status2 = await apiClient.get('/api/integration/provider/status');
      expect(status2.data.currentProvider).toBe('timeback');
    });
  });

  describe('Redis Caching and Session Management', () => {
    test('should cache user sessions in Redis', async () => {
      const userId = 'test-user-redis-1';
      
      // Create session
      const sessionResponse = await apiClient.post('/api/auth/session', {
        userId,
        metadata: { role: 'student', preferences: { theme: 'dark' } }
      });

      expect(sessionResponse.status).toBe(201);
      expect(sessionResponse.data.sessionId).toBeDefined();

      // Verify session cached in Redis
      const cacheResponse = await apiClient.get(`/api/cache/session/${sessionResponse.data.sessionId}`);
      expect(cacheResponse.status).toBe(200);
      expect(cacheResponse.data.userId).toBe(userId);
      expect(cacheResponse.data.metadata.role).toBe('student');
    });

    test('should handle Redis cache invalidation', async () => {
      const userId = 'test-user-redis-2';
      
      // Create and cache session
      const sessionResponse = await apiClient.post('/api/auth/session', {
        userId,
        metadata: { role: 'teacher' }
      });

      const sessionId = sessionResponse.data.sessionId;

      // Verify cached
      const cachedResponse = await apiClient.get(`/api/cache/session/${sessionId}`);
      expect(cachedResponse.status).toBe(200);

      // Invalidate cache
      const invalidateResponse = await apiClient.delete(`/api/cache/session/${sessionId}`);
      expect(invalidateResponse.status).toBe(200);

      // Verify cache miss
      const missResponse = await apiClient.get(`/api/cache/session/${sessionId}`);
      expect(missResponse.status).toBe(404);
    });

    test('should handle Redis connection failures', async () => {
      // Simulate Redis connection failure
      const failureResponse = await apiClient.post('/api/cache/test', {
        simulateRedisFailure: true
      });

      expect(failureResponse.status).toBe(200);
      expect(failureResponse.data.redisAvailable).toBe(false);
      expect(failureResponse.data.fallbackUsed).toBe(true);
    });

    test('should maintain session consistency across Redis operations', async () => {
      const userId = 'test-user-redis-3';
      
      // Create multiple sessions
      const sessions = await Promise.all([
        apiClient.post('/api/auth/session', { userId, metadata: { device: 'mobile' } }),
        apiClient.post('/api/auth/session', { userId, metadata: { device: 'desktop' } }),
        apiClient.post('/api/auth/session', { userId, metadata: { device: 'tablet' } })
      ]);

      // Verify all sessions cached
      for (const session of sessions) {
        const cacheResponse = await apiClient.get(`/api/cache/session/${session.data.sessionId}`);
        expect(cacheResponse.status).toBe(200);
        expect(cacheResponse.data.userId).toBe(userId);
      }

      // Bulk invalidate user sessions
      const bulkInvalidateResponse = await apiClient.delete(`/api/cache/user/${userId}/sessions`);
      expect(bulkInvalidateResponse.status).toBe(200);

      // Verify all sessions invalidated
      for (const session of sessions) {
        const missResponse = await apiClient.get(`/api/cache/session/${session.data.sessionId}`);
        expect(missResponse.status).toBe(404);
      }
    });
  });

  describe('OpenAI API Integration and Fallback', () => {
    test('should generate AI coaching suggestions', async () => {
      const coachingRequest = {
        conversationId: 'test-conversation-1',
        userId: 'test-user-ai-1',
        context: {
          topic: 'Climate Change Policy',
          userPosition: 'pro',
          currentPhase: 'discussion',
          messageHistory: [
            'I believe renewable energy is the key to addressing climate change.',
            'Solar and wind power have become increasingly cost-effective.'
          ]
        }
      };

      const coachingResponse = await apiClient.post('/api/ai/coaching/suggest', coachingRequest);

      expect(coachingResponse.status).toBe(200);
      expect(coachingResponse.data.suggestions).toBeDefined();
      expect(Array.isArray(coachingResponse.data.suggestions)).toBe(true);
      expect(coachingResponse.data.suggestions.length).toBeGreaterThan(0);

      const suggestion = coachingResponse.data.suggestions[0];
      expect(suggestion).toHaveProperty('text');
      expect(suggestion).toHaveProperty('type');
      expect(suggestion).toHaveProperty('confidence');
      expect(suggestion.confidence).toBeGreaterThan(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(1);
    });

    test('should handle OpenAI API rate limiting', async () => {
      // Simulate rate limiting by making many rapid requests
      const rapidRequests = Array.from({ length: 10 }, (_, i) => 
        apiClient.post('/api/ai/coaching/suggest', {
          conversationId: `test-conversation-${i}`,
          userId: 'test-user-ai-2',
          context: { topic: 'Test Topic', userPosition: 'pro', currentPhase: 'discussion' }
        })
      );

      const responses = await Promise.allSettled(rapidRequests);
      
      // Some requests should succeed, others might be rate limited
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);

      expect(successful.length + rateLimited.length).toBe(10);
      
      if (rateLimited.length > 0) {
        // Verify rate limit response structure
        const rateLimitResponse = (rateLimited[0] as any).value;
        expect(rateLimitResponse.data.error).toContain('rate limit');
        expect(rateLimitResponse.data.retryAfter).toBeDefined();
      }
    });

    test('should fall back to cached suggestions when OpenAI is unavailable', async () => {
      const fallbackRequest = {
        conversationId: 'test-conversation-fallback',
        userId: 'test-user-ai-3',
        context: { topic: 'Universal Basic Income', userPosition: 'con', currentPhase: 'rebuttal' },
        simulateOpenAIFailure: true
      };

      const fallbackResponse = await apiClient.post('/api/ai/coaching/suggest', fallbackRequest);

      expect(fallbackResponse.status).toBe(200);
      expect(fallbackResponse.data.fallbackUsed).toBe(true);
      expect(fallbackResponse.data.suggestions).toBeDefined();
      expect(fallbackResponse.data.suggestions.length).toBeGreaterThan(0);
    });

    test('should validate AI response content safety', async () => {
      const safetyRequest = {
        conversationId: 'test-conversation-safety',
        userId: 'test-user-ai-4',
        context: {
          topic: 'Controversial Topic',
          userPosition: 'pro',
          currentPhase: 'discussion',
          messageHistory: ['This is a test message for safety validation.']
        }
      };

      const safetyResponse = await apiClient.post('/api/ai/coaching/suggest', safetyRequest);

      expect(safetyResponse.status).toBe(200);
      expect(safetyResponse.data.safetyCheck).toBeDefined();
      expect(safetyResponse.data.safetyCheck.passed).toBe(true);
      
      // Verify suggestions don't contain inappropriate content
      const suggestions = safetyResponse.data.suggestions;
      for (const suggestion of suggestions) {
        expect(suggestion.text).not.toMatch(/\b(inappropriate|offensive|harmful)\b/i);
        expect(suggestion.safetyScore).toBeGreaterThan(0.7); // High safety threshold
      }
    });
  });

  describe('Ably Real-time Service Integration', () => {
    test('should establish WebSocket connection to Ably', async () => {
      const connectionRequest = {
        userId: 'test-user-ably-1',
        conversationId: 'test-conversation-ably-1',
        capabilities: ['messages', 'presence', 'typing']
      };

      const connectionResponse = await apiClient.post('/api/realtime/connect', connectionRequest);

      expect(connectionResponse.status).toBe(200);
      expect(connectionResponse.data.connectionId).toBeDefined();
      expect(connectionResponse.data.channel).toBeDefined();
      expect(connectionResponse.data.authToken).toBeDefined();
      expect(connectionResponse.data.status).toBe('connected');
    });

    test('should handle real-time message delivery', async () => {
      const userId1 = 'test-user-ably-2';
      const userId2 = 'test-user-ably-3';
      const conversationId = 'test-conversation-ably-2';

      // Connect both users
      const connection1 = await apiClient.post('/api/realtime/connect', {
        userId: userId1,
        conversationId
      });

      const connection2 = await apiClient.post('/api/realtime/connect', {
        userId: userId2,
        conversationId
      });

      expect(connection1.status).toBe(200);
      expect(connection2.status).toBe(200);

      // Send message from user1
      const messageResponse = await apiClient.post('/api/realtime/message', {
        connectionId: connection1.data.connectionId,
        conversationId,
        message: {
          text: 'Hello from user 1!',
          timestamp: new Date().toISOString()
        }
      });

      expect(messageResponse.status).toBe(200);
      expect(messageResponse.data.messageId).toBeDefined();
      expect(messageResponse.data.delivered).toBe(true);

      // Verify message received by user2 (simulate polling)
      const messagesResponse = await apiClient.get(`/api/realtime/messages/${conversationId}`, {
        params: { since: new Date(Date.now() - 5000).toISOString() }
      });

      expect(messagesResponse.status).toBe(200);
      expect(messagesResponse.data.messages).toBeDefined();
      expect(messagesResponse.data.messages.length).toBeGreaterThan(0);
      
      const receivedMessage = messagesResponse.data.messages.find(
        m => m.text === 'Hello from user 1!'
      );
      expect(receivedMessage).toBeDefined();
    });

    test('should handle presence updates', async () => {
      const userId = 'test-user-ably-4';
      const conversationId = 'test-conversation-ably-3';

      // Connect user
      const connection = await apiClient.post('/api/realtime/connect', {
        userId,
        conversationId
      });

      // Update presence
      const presenceResponse = await apiClient.post('/api/realtime/presence', {
        connectionId: connection.data.connectionId,
        conversationId,
        presence: {
          status: 'active',
          typing: false,
          lastSeen: new Date().toISOString()
        }
      });

      expect(presenceResponse.status).toBe(200);
      expect(presenceResponse.data.updated).toBe(true);

      // Get conversation presence
      const presenceListResponse = await apiClient.get(`/api/realtime/presence/${conversationId}`);

      expect(presenceListResponse.status).toBe(200);
      expect(presenceListResponse.data.participants).toBeDefined();
      
      const userPresence = presenceListResponse.data.participants.find(p => p.userId === userId);
      expect(userPresence).toBeDefined();
      expect(userPresence.status).toBe('active');
    });

    test('should handle Ably service failures gracefully', async () => {
      const failureRequest = {
        userId: 'test-user-ably-5',
        conversationId: 'test-conversation-ably-4',
        simulateAblyFailure: true
      };

      const failureResponse = await apiClient.post('/api/realtime/connect', failureRequest);

      // Should fall back to polling or alternative mechanism
      expect(failureResponse.status).toBe(200);
      expect(failureResponse.data.fallbackMode).toBe(true);
      expect(failureResponse.data.connectionType).toBe('polling');
    });

    test('should maintain connection state and handle reconnection', async () => {
      const userId = 'test-user-ably-6';
      const conversationId = 'test-conversation-ably-5';

      // Initial connection
      const connection = await apiClient.post('/api/realtime/connect', {
        userId,
        conversationId
      });

      const connectionId = connection.data.connectionId;

      // Simulate connection drop
      const disconnectResponse = await apiClient.post('/api/realtime/disconnect', {
        connectionId,
        reason: 'network_interruption'
      });

      expect(disconnectResponse.status).toBe(200);

      // Reconnect
      const reconnectResponse = await apiClient.post('/api/realtime/reconnect', {
        connectionId,
        userId,
        conversationId
      });

      expect(reconnectResponse.status).toBe(200);
      expect(reconnectResponse.data.reconnected).toBe(true);
      expect(reconnectResponse.data.connectionId).toBe(connectionId);
      expect(reconnectResponse.data.status).toBe('connected');
    });
  });

  describe('Cross-Service Integration Scenarios', () => {
    test('should handle Redis cache + OpenAI + Ably integration', async () => {
      const userId = 'test-user-cross-1';
      const conversationId = 'test-conversation-cross-1';

      // 1. Create cached session
      const sessionResponse = await apiClient.post('/api/auth/session', {
        userId,
        metadata: { role: 'student', preferences: { aiCoaching: true } }
      });

      // 2. Connect to Ably
      const realtimeConnection = await apiClient.post('/api/realtime/connect', {
        userId,
        conversationId
      });

      // 3. Request AI coaching (should use cached session)
      const coachingResponse = await apiClient.post('/api/ai/coaching/suggest', {
        conversationId,
        userId,
        context: { topic: 'Integration Test', userPosition: 'pro', currentPhase: 'discussion' }
      });

      // 4. Broadcast AI suggestion via Ably
      const broadcastResponse = await apiClient.post('/api/realtime/message', {
        connectionId: realtimeConnection.data.connectionId,
        conversationId,
        message: {
          type: 'ai_suggestion',
          data: coachingResponse.data.suggestions[0],
          timestamp: new Date().toISOString()
        }
      });

      // Verify all services worked together
      expect(sessionResponse.status).toBe(201);
      expect(realtimeConnection.status).toBe(200);
      expect(coachingResponse.status).toBe(200);
      expect(broadcastResponse.status).toBe(200);

      expect(coachingResponse.data.sessionCacheUsed).toBe(true);
      expect(broadcastResponse.data.delivered).toBe(true);
    });

    test('should handle service cascade failures gracefully', async () => {
      const userId = 'test-user-cascade-1';
      const conversationId = 'test-conversation-cascade-1';

      // Simulate multiple service failures
      const cascadeRequest = {
        userId,
        conversationId,
        simulateFailures: {
          redis: true,
          openai: true,
          ably: false // Keep Ably working
        }
      };

      const cascadeResponse = await apiClient.post('/api/integration/test-cascade', cascadeRequest);

      expect(cascadeResponse.status).toBe(200);
      expect(cascadeResponse.data.redisStatus).toBe('failed');
      expect(cascadeResponse.data.openaiStatus).toBe('failed');
      expect(cascadeResponse.data.ablyStatus).toBe('connected');
      
      // Should still provide basic functionality
      expect(cascadeResponse.data.fallbacksUsed).toEqual(['memory_cache', 'cached_suggestions']);
      expect(cascadeResponse.data.operationalFeatures).toContain('realtime_messaging');
    });

    test('should maintain data consistency across service boundaries', async () => {
      const userId = 'test-user-consistency-1';
      const conversationId = 'test-conversation-consistency-1';

      // Create conversation with multiple service interactions
      const conversationResponse = await apiClient.post('/api/conversations', {
        topic: 'Data Consistency Test',
        participants: [userId, 'test-user-consistency-2'],
        settings: { aiCoaching: true, realtime: true }
      });

      const createdConversationId = conversationResponse.data.id;

      // Verify consistency across services
      const consistencyChecks = await Promise.all([
        apiClient.get(`/api/cache/conversation/${createdConversationId}`), // Redis
        apiClient.get(`/api/realtime/channel/${createdConversationId}`),   // Ably
        apiClient.get(`/api/ai/context/${createdConversationId}`)          // OpenAI context
      ]);

      // All services should have consistent conversation data
      for (const check of consistencyChecks) {
        expect(check.status).toBe(200);
        expect(check.data.conversationId).toBe(createdConversationId);
        expect(check.data.participants).toContain(userId);
      }

      // Verify data sync timestamps are within acceptable range
      const timestamps = consistencyChecks.map(c => new Date(c.data.lastUpdated).getTime());
      const maxTimeDiff = Math.max(...timestamps) - Math.min(...timestamps);
      expect(maxTimeDiff).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe('Service Health and Monitoring', () => {
    test('should provide health status for all external services', async () => {
      const healthResponse = await apiClient.get('/api/health/external');

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.data.services).toBeDefined();

      const services = healthResponse.data.services;
      expect(services).toHaveProperty('redis');
      expect(services).toHaveProperty('openai');
      expect(services).toHaveProperty('ably');
      expect(services).toHaveProperty('timeback');

      // Each service should have status and response time
      for (const [serviceName, serviceData] of Object.entries(services)) {
        expect(serviceData).toHaveProperty('status');
        expect(serviceData).toHaveProperty('responseTime');
        expect(['healthy', 'degraded', 'unhealthy']).toContain((serviceData as any).status);
        expect(typeof (serviceData as any).responseTime).toBe('number');
      }
    });

    test('should provide service performance metrics', async () => {
      const metricsResponse = await apiClient.get('/api/metrics/external');

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.data.metrics).toBeDefined();

      const metrics = metricsResponse.data.metrics;
      
      // Should include throughput, error rates, and latency
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('serviceBreakdown');

      expect(typeof metrics.throughput).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(typeof metrics.averageLatency).toBe('number');
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeLessThanOrEqual(1);
    });
  });
});
