/**
 * API Endpoints Integration Tests
 * Testing survey submission, profile management, and belief analysis endpoints
 */

import { TestApiClient, mockApiResponses, testUtils, TEST_CONFIG } from './setup';

describe('API Endpoints Integration Tests', () => {
  let apiClient: TestApiClient;

  beforeEach(() => {
    apiClient = new TestApiClient();
    jest.clearAllMocks();
  });

  describe('Survey API Integration', () => {
    it('should fetch survey questions successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.survey)
      });

      const response = await apiClient.getSurveyQuestions();

      expect(global.fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.API_BASE_URL}/api/survey/questions`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      );

      testUtils.expectValidApiResponse(response);
      expect(Array.isArray(response.questions)).toBe(true);
      expect(response.questions.length).toBeGreaterThan(0);
      expect(response.totalQuestions).toBe(20);
      expect(response.estimatedTime).toBe(15);

      // Validate question structure
      const question = response.questions[0];
      expect(question.id).toBeDefined();
      expect(question.text).toBeDefined();
      expect(question.type).toBeDefined();
      expect(question.category).toBeDefined();
      expect(typeof question.required).toBe('boolean');
    });

    it('should submit survey responses successfully', async () => {
      const testResponses = testUtils.generateTestSurveyResponses();
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          responseId: 'response-123',
          completionPercentage: 15,
          beliefProfile: mockApiResponses.beliefProfile,
          nextQuestions: ['q4', 'q5', 'q6']
        })
      });

      const response = await apiClient.submitSurveyResponse(testResponses);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.API_BASE_URL}/api/survey/responses`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          }),
          body: JSON.stringify({ responses: testResponses })
        })
      );

      testUtils.expectValidApiResponse(response);
      expect(response.success).toBe(true);
      expect(response.responseId).toBeDefined();
      expect(typeof response.completionPercentage).toBe('number');
      testUtils.expectValidBeliefProfile(response.beliefProfile);
      expect(Array.isArray(response.nextQuestions)).toBe(true);
    });

    it('should handle invalid survey responses', async () => {
      const invalidResponses = [
        { questionId: '', value: null }, // Invalid question ID and value
        { questionId: 'q1' }, // Missing value
        { value: 'test' } // Missing question ID
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'Invalid survey responses',
          details: [
            'Question ID is required',
            'Response value is required',
            'Invalid question ID format'
          ]
        })
      });

      await expect(apiClient.submitSurveyResponse(invalidResponses))
        .rejects.toThrow('API request failed: 400 Bad Request');
    });

    it('should handle adaptive questioning flow', async () => {
      // First submission
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          adaptiveQuestions: [
            {
              id: 'adaptive-q1',
              text: 'Based on your previous responses, how do you feel about renewable energy subsidies?',
              type: 'SCALE',
              category: 'ENVIRONMENTAL',
              scale: { min: 1, max: 10 },
              reasoning: 'Your environmental stance suggests this topic is relevant'
            }
          ]
        })
      });

      const initialResponses = [
        { questionId: 'q1', value: 'Very Liberal', timestamp: new Date() }
      ];

      const adaptiveResponse = await apiClient.submitSurveyResponse(initialResponses);
      
      expect(adaptiveResponse.adaptiveQuestions).toBeDefined();
      expect(adaptiveResponse.adaptiveQuestions[0].reasoning).toBeDefined();
    });
  });

  describe('Profile Management API Integration', () => {
    it('should retrieve user profile successfully', async () => {
      const mockProfile = {
        id: TEST_CONFIG.MOCK_USER_ID,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
        beliefProfile: mockApiResponses.beliefProfile,
        surveyProgress: {
          completed: 15,
          total: 20,
          lastUpdated: new Date().toISOString()
        },
        preferences: {
          debateNotifications: true,
          matchingOptIn: true,
          dataSharing: 'anonymous'
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProfile)
      });

      const response = await apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.API_BASE_URL}/api/profiles/${TEST_CONFIG.MOCK_USER_ID}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      );

      testUtils.expectValidApiResponse(response);
      expect(response.id).toBe(TEST_CONFIG.MOCK_USER_ID);
      expect(response.email).toBe('test@example.com');
      expect(response.role).toBe('student');
      testUtils.expectValidBeliefProfile(response.beliefProfile);
      expect(response.surveyProgress).toBeDefined();
      expect(response.preferences).toBeDefined();
    });

    it('should update user profile successfully', async () => {
      const updates = {
        firstName: 'Updated',
        preferences: {
          debateNotifications: false,
          matchingOptIn: true,
          dataSharing: 'minimal'
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          updatedFields: Object.keys(updates),
          profile: {
            id: TEST_CONFIG.MOCK_USER_ID,
            firstName: 'Updated',
            preferences: updates.preferences,
            lastModified: new Date().toISOString()
          }
        })
      });

      const response = await apiClient.updateProfile(TEST_CONFIG.MOCK_USER_ID, updates);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.API_BASE_URL}/api/profiles/${TEST_CONFIG.MOCK_USER_ID}`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          }),
          body: JSON.stringify(updates)
        })
      );

      testUtils.expectValidApiResponse(response);
      expect(response.success).toBe(true);
      expect(response.updatedFields).toEqual(expect.arrayContaining(['firstName', 'preferences']));
      expect(response.profile.firstName).toBe('Updated');
    });

    it('should handle profile validation errors', async () => {
      const invalidUpdates = {
        email: 'invalid-email', // Invalid email format
        role: 'invalid-role', // Invalid role
        preferences: {
          dataSharing: 'invalid-option' // Invalid preference value
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'Profile validation failed',
          validationErrors: {
            email: 'Invalid email format',
            role: 'Role must be one of: student, teacher, admin',
            'preferences.dataSharing': 'Must be one of: full, anonymous, minimal'
          }
        })
      });

      await expect(apiClient.updateProfile(TEST_CONFIG.MOCK_USER_ID, invalidUpdates))
        .rejects.toThrow('API request failed: 400 Bad Request');
    });
  });

  describe('Belief Analysis API Integration', () => {
    it('should analyze user beliefs successfully', async () => {
      const mockAnalysis = {
        userId: TEST_CONFIG.MOCK_USER_ID,
        beliefProfile: mockApiResponses.beliefProfile,
        insights: {
          dominantAxis: 'environmental',
          strengths: ['Strong environmental consciousness', 'Clear economic perspectives'],
          growthAreas: ['Explore international perspectives more deeply'],
          summary: 'You have strong environmental beliefs with moderate economic conservatism.'
        },
        confidence: 0.87,
        basedOnResponses: 15,
        lastUpdated: new Date().toISOString()
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalysis)
      });

      const response = await apiClient.analyzeBeliefs(TEST_CONFIG.MOCK_USER_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.API_BASE_URL}/api/belief-analysis/${TEST_CONFIG.MOCK_USER_ID}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      );

      testUtils.expectValidApiResponse(response);
      testUtils.expectValidBeliefProfile(response.beliefProfile);
      expect(response.insights).toBeDefined();
      expect(response.insights.dominantAxis).toBe('environmental');
      expect(Array.isArray(response.insights.strengths)).toBe(true);
      expect(Array.isArray(response.insights.growthAreas)).toBe(true);
      expect(typeof response.insights.summary).toBe('string');
      expect(typeof response.confidence).toBe('number');
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
    });

    it('should find compatible debate opponents', async () => {
      const preferences = {
        maxOpponents: 3,
        minOpposition: 0.3,
        preferredTopics: ['environmental', 'economic'],
        excludeUsers: ['blocked-user-1']
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.matchingResults)
      });

      const response = await apiClient.findMatches(TEST_CONFIG.MOCK_USER_ID, preferences);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.API_BASE_URL}/api/matching/find-opponents`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          }),
          body: JSON.stringify({ userId: TEST_CONFIG.MOCK_USER_ID, preferences })
        })
      );

      testUtils.expectValidApiResponse(response);
      expect(Array.isArray(response.matches)).toBe(true);
      expect(response.matches.length).toBeGreaterThan(0);
      expect(response.totalCandidates).toBe(50);
      expect(typeof response.processingTime).toBe('number');

      // Validate match structure
      const match = response.matches[0];
      testUtils.expectValidMatchResult(match);
    });

    it('should handle insufficient data for analysis', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: () => Promise.resolve({
          error: 'Insufficient data for belief analysis',
          details: {
            responsesRequired: 10,
            responsesProvided: 3,
            missingCategories: ['political', 'social', 'international']
          }
        })
      });

      await expect(apiClient.analyzeBeliefs('incomplete-user'))
        .rejects.toThrow('API request failed: 422 Unprocessable Entity');
    });
  });

  describe('Conversation Management API Integration', () => {
    it('should create new conversation successfully', async () => {
      const conversationData = {
        topic: 'Climate Change Policy Effectiveness',
        participants: ['user-1', 'user-2'],
        settings: {
          duration: 30,
          phases: ['PREPARATION', 'OPENING', 'DISCUSSION', 'CLOSING'],
          moderationLevel: 'standard'
        }
      };

      const mockConversation = {
        id: 'conv-12345',
        ...conversationData,
        status: 'created',
        createdAt: new Date().toISOString(),
        createdBy: TEST_CONFIG.MOCK_USER_ID
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConversation)
      });

      const response = await apiClient.createConversation(conversationData);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.API_BASE_URL}/api/conversations`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          }),
          body: JSON.stringify(conversationData)
        })
      );

      testUtils.expectValidApiResponse(response);
      expect(response.id).toBeDefined();
      expect(response.topic).toBe(conversationData.topic);
      expect(response.participants).toEqual(conversationData.participants);
      expect(response.status).toBe('created');
      expect(response.createdBy).toBe(TEST_CONFIG.MOCK_USER_ID);
    });

    it('should retrieve conversation details', async () => {
      const mockConversation = {
        id: TEST_CONFIG.MOCK_CONVERSATION_ID,
        topic: 'Environmental Policy Debate',
        participants: [
          {
            userId: 'user-1',
            position: 'pro',
            beliefAlignment: 0.8
          },
          {
            userId: 'user-2', 
            position: 'con',
            beliefAlignment: -0.6
          }
        ],
        currentPhase: 'DISCUSSION',
        phaseStartTime: new Date().toISOString(),
        messages: [
          {
            id: 'msg-1',
            userId: 'user-1',
            content: 'I believe renewable energy subsidies are essential...',
            timestamp: new Date().toISOString(),
            phase: 'OPENING'
          }
        ],
        analytics: {
          engagementScore: 0.92,
          argumentQuality: 0.78,
          respectfulnessScore: 0.95
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConversation)
      });

      const response = await apiClient.getConversation(TEST_CONFIG.MOCK_CONVERSATION_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.API_BASE_URL}/api/conversations/${TEST_CONFIG.MOCK_CONVERSATION_ID}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      );

      testUtils.expectValidApiResponse(response);
      expect(response.id).toBe(TEST_CONFIG.MOCK_CONVERSATION_ID);
      expect(response.topic).toBeDefined();
      expect(Array.isArray(response.participants)).toBe(true);
      expect(response.currentPhase).toBeDefined();
      expect(Array.isArray(response.messages)).toBe(true);
      expect(response.analytics).toBeDefined();
    });

    it('should handle conversation not found', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({
          error: 'Conversation not found',
          conversationId: 'non-existent-id'
        })
      });

      await expect(apiClient.getConversation('non-existent-id'))
        .rejects.toThrow('API request failed: 404 Not Found');
    });
  });

  describe('Cross-API Data Flow', () => {
    it('should complete full user onboarding flow', async () => {
      // Step 1: Get survey questions
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.survey)
      });

      const surveyQuestions = await apiClient.getSurveyQuestions();
      expect(surveyQuestions.questions).toBeDefined();

      // Step 2: Submit survey responses
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          beliefProfile: mockApiResponses.beliefProfile,
          completionPercentage: 100
        })
      });

      const surveyResponse = await apiClient.submitSurveyResponse(
        testUtils.generateTestSurveyResponses()
      );
      expect(surveyResponse.success).toBe(true);
      expect(surveyResponse.completionPercentage).toBe(100);

      // Step 3: Analyze beliefs
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          beliefProfile: mockApiResponses.beliefProfile,
          insights: {
            dominantAxis: 'environmental',
            summary: 'Strong environmental beliefs'
          }
        })
      });

      const analysis = await apiClient.analyzeBeliefs(TEST_CONFIG.MOCK_USER_ID);
      testUtils.expectValidBeliefProfile(analysis.beliefProfile);

      // Step 4: Find matches
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.matchingResults)
      });

      const matches = await apiClient.findMatches(TEST_CONFIG.MOCK_USER_ID);
      expect(matches.matches.length).toBeGreaterThan(0);

      // Verify data consistency across APIs
      expect(analysis.beliefProfile).toEqual(surveyResponse.beliefProfile);
    });

    it('should handle partial failures gracefully', async () => {
      // Survey succeeds
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await apiClient.submitSurveyResponse(testUtils.generateTestSurveyResponses());

      // Analysis fails
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(apiClient.analyzeBeliefs(TEST_CONFIG.MOCK_USER_ID))
        .rejects.toThrow('API request failed: 500 Internal Server Error');

      // Should be able to retry analysis later
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          beliefProfile: mockApiResponses.beliefProfile,
          insights: { summary: 'Analysis completed' }
        })
      });

      const retryResponse = await apiClient.analyzeBeliefs(TEST_CONFIG.MOCK_USER_ID);
      expect(retryResponse.insights.summary).toBe('Analysis completed');
    });
  });
});
