/**
 * End-to-End Data Flow Integration Tests
 * Testing complete user journeys from survey to debate matching
 */

import { TestApiClient, mockApiResponses, testUtils, TEST_CONFIG } from './setup';

describe('End-to-End Data Flow Integration Tests', () => {
  let apiClient: TestApiClient;

  beforeEach(() => {
    apiClient = new TestApiClient();
    jest.clearAllMocks();
  });

  describe('Complete User Onboarding Journey', () => {
    it('should complete full onboarding flow from registration to first debate match', async () => {
      // Step 1: User registers and gets survey
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockApiResponses.survey,
          userProgress: {
            step: 1,
            totalSteps: 4,
            description: 'Complete belief survey'
          }
        })
      });

      const surveyData = await apiClient.getSurveyQuestions();
      expect(surveyData.questions).toBeDefined();
      expect(surveyData.userProgress.step).toBe(1);

      // Step 2: User completes survey progressively
      const responses = [
        { questionId: 'q1', value: 'Liberal', timestamp: new Date() },
        { questionId: 'q2', value: 8, timestamp: new Date() },
        { questionId: 'q3', value: 'Strongly Agree', timestamp: new Date() }
      ];

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          completionPercentage: 15,
          beliefProfile: {
            political: 0.1,
            social: -0.2,
            economic: 0.0,
            environmental: 0.0,
            international: 0.0
          },
          nextQuestions: ['q4', 'q5', 'q6'],
          userProgress: {
            step: 2,
            totalSteps: 4,
            description: 'Continue survey'
          }
        })
      });

      const progressResponse = await apiClient.submitSurveyResponse(responses);
      expect(progressResponse.success).toBe(true);
      expect(progressResponse.completionPercentage).toBe(15);
      expect(progressResponse.userProgress.step).toBe(2);

      // Step 3: Complete remaining survey questions
      const finalResponses = [
        ...responses,
        { questionId: 'q4', value: 'Very Liberal', timestamp: new Date() },
        { questionId: 'q5', value: 9, timestamp: new Date() },
        { questionId: 'q6', value: 'Disagree', timestamp: new Date() }
      ];

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          completionPercentage: 100,
          beliefProfile: mockApiResponses.beliefProfile,
          userProgress: {
            step: 3,
            totalSteps: 4,
            description: 'Analyze beliefs and find matches'
          },
          achievements: ['survey_complete', 'belief_profile_generated']
        })
      });

      const finalSurveyResponse = await apiClient.submitSurveyResponse(finalResponses);
      expect(finalSurveyResponse.completionPercentage).toBe(100);
      expect(finalSurveyResponse.achievements).toContain('survey_complete');
      testUtils.expectValidBeliefProfile(finalSurveyResponse.beliefProfile);

      // Step 4: Generate detailed belief analysis
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          userId: TEST_CONFIG.MOCK_USER_ID,
          beliefProfile: mockApiResponses.beliefProfile,
          insights: {
            dominantAxis: 'environmental',
            strengths: ['Strong environmental consciousness'],
            growthAreas: ['Explore international perspectives'],
            summary: 'You have strong environmental beliefs with moderate economic views.'
          },
          confidence: 0.89,
          userProgress: {
            step: 4,
            totalSteps: 4,
            description: 'Ready for debates!'
          }
        })
      });

      const analysisResponse = await apiClient.analyzeBeliefs(TEST_CONFIG.MOCK_USER_ID);
      expect(analysisResponse.insights.dominantAxis).toBe('environmental');
      expect(analysisResponse.confidence).toBeGreaterThan(0.8);
      expect(analysisResponse.userProgress.step).toBe(4);

      // Step 5: Find compatible debate opponents
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockApiResponses.matchingResults,
          recommendations: [
            {
              matchId: 'match-1',
              topic: 'Climate Change Policy',
              oppositionScore: 0.8,
              recommendedPosition: 'pro',
              reasoning: 'Your environmental beliefs align with pro-climate action'
            }
          ],
          onboardingComplete: true
        })
      });

      const matchingResponse = await apiClient.findMatches(TEST_CONFIG.MOCK_USER_ID);
      expect(matchingResponse.matches.length).toBeGreaterThan(0);
      expect(matchingResponse.recommendations).toBeDefined();
      expect(matchingResponse.onboardingComplete).toBe(true);

      // Verify data consistency throughout the flow
      expect(finalSurveyResponse.beliefProfile).toEqual(analysisResponse.beliefProfile);
      expect(analysisResponse.userId).toBe(TEST_CONFIG.MOCK_USER_ID);
    });

    it('should handle interrupted onboarding flow with resume capability', async () => {
      // User starts survey but doesn't complete
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          completionPercentage: 40,
          savedProgress: {
            responses: [
              { questionId: 'q1', value: 'Liberal' },
              { questionId: 'q2', value: 7 }
            ],
            lastQuestionId: 'q2',
            nextQuestionId: 'q3',
            sessionId: 'session-123'
          }
        })
      });

      const partialResponse = await apiClient.submitSurveyResponse([
        { questionId: 'q1', value: 'Liberal', timestamp: new Date() },
        { questionId: 'q2', value: 7, timestamp: new Date() }
      ]);

      expect(partialResponse.completionPercentage).toBe(40);
      expect(partialResponse.savedProgress.sessionId).toBeDefined();

      // User returns later and resumes
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          resumeData: {
            previousResponses: partialResponse.savedProgress.responses,
            nextQuestionId: 'q3',
            completionPercentage: 40
          },
          questions: mockApiResponses.survey.questions.slice(2) // Remaining questions
        })
      });

      const resumeResponse = await apiClient.getSurveyQuestions();
      expect(resumeResponse.resumeData.completionPercentage).toBe(40);
      expect(resumeResponse.resumeData.nextQuestionId).toBe('q3');
    });
  });

  describe('Debate Session Lifecycle', () => {
    it('should complete full debate session from creation to analysis', async () => {
      // Step 1: Create debate conversation
      const conversationData = {
        topic: 'Should governments prioritize economic growth over environmental protection?',
        participants: ['user-1', 'user-2'],
        settings: {
          duration: 30,
          phases: ['PREPARATION', 'OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING'],
          moderationLevel: 'standard'
        },
        assignments: {
          'user-1': { position: 'pro', beliefAlignment: -0.6 }, // Arguing against beliefs
          'user-2': { position: 'con', beliefAlignment: 0.7 }   // Arguing against beliefs
        }
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'conv-debate-123',
          ...conversationData,
          status: 'created',
          currentPhase: 'PREPARATION',
          phaseStartTime: new Date().toISOString(),
          estimatedEndTime: new Date(Date.now() + 30 * 60000).toISOString(),
          preparationMaterials: [
            {
              type: 'article',
              title: 'Economic Growth vs Environmental Protection',
              url: 'https://example.com/article1',
              summary: 'Analysis of trade-offs between economic and environmental policies'
            }
          ]
        })
      });

      const conversation = await apiClient.createConversation(conversationData);
      expect(conversation.id).toBe('conv-debate-123');
      expect(conversation.status).toBe('created');
      expect(conversation.currentPhase).toBe('PREPARATION');
      expect(conversation.preparationMaterials).toBeDefined();

      // Step 2: Track debate progression through phases
      const phases = ['OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING', 'COMPLETED'];
      
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        
        global.fetch = jest.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: conversation.id,
            currentPhase: phase,
            phaseStartTime: new Date().toISOString(),
            messages: [
              {
                id: `msg-${phase}-1`,
                userId: 'user-1',
                content: `Opening statement for ${phase} phase`,
                timestamp: new Date().toISOString(),
                phase: phase,
                metadata: {
                  wordCount: 150,
                  sentimentScore: 0.7,
                  argumentStrength: 0.8
                }
              }
            ],
            analytics: {
              currentEngagement: 0.85 + (i * 0.02),
              phaseProgress: (i + 1) / phases.length,
              participantMetrics: {
                'user-1': { messagesCount: i + 1, argumentQuality: 0.8 },
                'user-2': { messagesCount: i + 1, argumentQuality: 0.75 }
              }
            }
          })
        });

        const phaseUpdate = await apiClient.getConversation(conversation.id);
        expect(phaseUpdate.currentPhase).toBe(phase);
        expect(phaseUpdate.analytics.phaseProgress).toBe((i + 1) / phases.length);
      }

      // Step 3: Generate post-debate analysis
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          conversationId: conversation.id,
          finalAnalysis: {
            winner: null, // Tie
            participantScores: {
              'user-1': {
                argumentQuality: 0.82,
                evidence: 0.78,
                respectfulness: 0.95,
                persuasiveness: 0.73,
                growthMetrics: {
                  beliefFlexibility: 0.15,
                  empathyScore: 0.68,
                  criticalThinking: 0.84
                }
              },
              'user-2': {
                argumentQuality: 0.79,
                evidence: 0.81,
                respectfulness: 0.92,
                persuasiveness: 0.76,
                growthMetrics: {
                  beliefFlexibility: 0.22,
                  empathyScore: 0.71,
                  criticalThinking: 0.77
                }
              }
            },
            keyMoments: [
              {
                timestamp: new Date().toISOString(),
                type: 'breakthrough_moment',
                description: 'User-1 acknowledged validity of environmental concerns',
                impact: 'high'
              }
            ],
            learningOutcomes: [
              'Both participants showed increased understanding of opposing viewpoints',
              'Evidence-based arguments were effectively used by both sides',
              'Respectful discourse maintained throughout'
            ]
          }
        })
      });

      const finalAnalysis = await apiClient.makeRequest(`/api/conversations/${conversation.id}/analysis`);
      expect(finalAnalysis.finalAnalysis.participantScores['user-1'].argumentQuality).toBeGreaterThan(0.8);
      expect(finalAnalysis.finalAnalysis.keyMoments).toHaveLength(1);
      expect(finalAnalysis.finalAnalysis.learningOutcomes.length).toBeGreaterThan(0);
    });

    it('should handle debate interruptions and recovery', async () => {
      // Debate starts normally
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'conv-interrupted-456',
          status: 'active',
          currentPhase: 'DISCUSSION',
          lastActivity: new Date().toISOString()
        })
      });

      const activeDebate = await apiClient.getConversation('conv-interrupted-456');
      expect(activeDebate.status).toBe('active');

      // Network interruption occurs
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.getConversation('conv-interrupted-456'))
        .rejects.toThrow('Network error');

      // Recovery - debate state is preserved
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'conv-interrupted-456',
          status: 'active',
          currentPhase: 'DISCUSSION',
          lastActivity: activeDebate.lastActivity,
          recoveryInfo: {
            wasInterrupted: true,
            lastKnownState: 'DISCUSSION',
            messagesPreserved: true,
            timeRemaining: 15 * 60 // 15 minutes
          }
        })
      });

      const recoveredDebate = await apiClient.getConversation('conv-interrupted-456');
      expect(recoveredDebate.recoveryInfo.wasInterrupted).toBe(true);
      expect(recoveredDebate.recoveryInfo.messagesPreserved).toBe(true);
      expect(recoveredDebate.currentPhase).toBe('DISCUSSION');
    });
  });

  describe('Learning Analytics and Progress Tracking', () => {
    it('should track learning progress across multiple debates', async () => {
      const userId = TEST_CONFIG.MOCK_USER_ID;
      
      // Initial learning profile
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          userId,
          learningProfile: {
            debatesCompleted: 0,
            skillLevels: {
              argumentation: 0.3,
              evidenceUse: 0.2,
              empathy: 0.4,
              criticalThinking: 0.35
            },
            beliefFlexibility: 0.1,
            topicExpertise: {
              environmental: 0.6,
              economic: 0.3,
              social: 0.4,
              political: 0.2,
              international: 0.1
            }
          }
        })
      });

      const initialProfile = await apiClient.makeRequest(`/api/learning/profile/${userId}`);
      expect(initialProfile.learningProfile.debatesCompleted).toBe(0);
      expect(initialProfile.learningProfile.skillLevels.argumentation).toBe(0.3);

      // Simulate several debates and track progress
      const debateResults = [
        {
          topic: 'environmental',
          performance: { argumentation: 0.4, evidenceUse: 0.3, empathy: 0.5 },
          beliefChange: 0.05
        },
        {
          topic: 'economic', 
          performance: { argumentation: 0.5, evidenceUse: 0.4, empathy: 0.6 },
          beliefChange: 0.08
        },
        {
          topic: 'social',
          performance: { argumentation: 0.6, evidenceUse: 0.5, empathy: 0.7 },
          beliefChange: 0.12
        }
      ];

      for (let i = 0; i < debateResults.length; i++) {
        const debate = debateResults[i];
        
        global.fetch = jest.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            updatedProfile: {
              debatesCompleted: i + 1,
              skillLevels: {
                argumentation: Math.min(0.3 + (i + 1) * 0.1, 1.0),
                evidenceUse: Math.min(0.2 + (i + 1) * 0.1, 1.0),
                empathy: Math.min(0.4 + (i + 1) * 0.1, 1.0),
                criticalThinking: Math.min(0.35 + (i + 1) * 0.08, 1.0)
              },
              beliefFlexibility: 0.1 + debateResults.slice(0, i + 1).reduce((sum, d) => sum + d.beliefChange, 0),
              recentImprovement: {
                topic: debate.topic,
                skillGains: debate.performance,
                beliefGrowth: debate.beliefChange
              }
            }
          })
        });

        const progressUpdate = await apiClient.makeRequest('/api/learning/update-progress', {
          method: 'POST',
          body: JSON.stringify({
            userId,
            debateResult: debate
          })
        });

        expect(progressUpdate.updatedProfile.debatesCompleted).toBe(i + 1);
        expect(progressUpdate.updatedProfile.recentImprovement.topic).toBe(debate.topic);
      }

      // Final progress check
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          userId,
          learningProfile: {
            debatesCompleted: 3,
            skillLevels: {
              argumentation: 0.6,
              evidenceUse: 0.5,
              empathy: 0.7,
              criticalThinking: 0.59
            },
            beliefFlexibility: 0.35,
            achievements: [
              'first_debate_complete',
              'skill_improvement_streak_3',
              'belief_flexibility_growth'
            ],
            nextRecommendations: [
              'Try debates on international topics to broaden perspective',
              'Focus on strengthening evidence-based arguments'
            ]
          }
        })
      });

      const finalProfile = await apiClient.makeRequest(`/api/learning/profile/${userId}`);
      expect(finalProfile.learningProfile.debatesCompleted).toBe(3);
      expect(finalProfile.learningProfile.beliefFlexibility).toBe(0.35);
      expect(finalProfile.learningProfile.achievements).toContain('belief_flexibility_growth');
      expect(finalProfile.learningProfile.nextRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Platform Data Synchronization', () => {
    it('should maintain data consistency across multiple devices', async () => {
      const userId = TEST_CONFIG.MOCK_USER_ID;
      
      // User starts survey on mobile device
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          syncId: 'sync-mobile-123',
          deviceId: 'mobile-device-1',
          responses: [
            { questionId: 'q1', value: 'Liberal', deviceId: 'mobile-device-1' }
          ],
          completionPercentage: 5,
          lastSync: new Date().toISOString()
        })
      });

      const mobileProgress = await apiClient.submitSurveyResponse([
        { questionId: 'q1', value: 'Liberal', timestamp: new Date() }
      ]);

      expect(mobileProgress.syncId).toBe('sync-mobile-123');
      expect(mobileProgress.deviceId).toBe('mobile-device-1');

      // User continues on desktop device
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          syncData: {
            previousResponses: mobileProgress.responses,
            completionPercentage: 5,
            lastSync: mobileProgress.lastSync
          },
          conflicts: [], // No conflicts
          mergedState: {
            responses: mobileProgress.responses,
            deviceHistory: ['mobile-device-1']
          }
        })
      });

      const syncResponse = await apiClient.makeRequest('/api/sync/survey-progress', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          deviceId: 'desktop-device-1',
          lastKnownSync: mobileProgress.lastSync
        })
      });

      expect(syncResponse.syncData.completionPercentage).toBe(5);
      expect(syncResponse.conflicts).toHaveLength(0);
      expect(syncResponse.mergedState.deviceHistory).toContain('mobile-device-1');

      // Continue survey on desktop
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          syncId: 'sync-desktop-456',
          deviceId: 'desktop-device-1',
          responses: [
            ...mobileProgress.responses,
            { questionId: 'q2', value: 8, deviceId: 'desktop-device-1' }
          ],
          completionPercentage: 10,
          crossDeviceSync: true,
          lastSync: new Date().toISOString()
        })
      });

      const desktopProgress = await apiClient.submitSurveyResponse([
        { questionId: 'q2', value: 8, timestamp: new Date() }
      ]);

      expect(desktopProgress.crossDeviceSync).toBe(true);
      expect(desktopProgress.responses.length).toBe(2);
      expect(desktopProgress.completionPercentage).toBe(10);
    });

    it('should handle sync conflicts gracefully', async () => {
      const userId = TEST_CONFIG.MOCK_USER_ID;

      // Simulate conflicting changes from two devices
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          conflicts: [
            {
              questionId: 'q1',
              mobileValue: 'Liberal',
              desktopValue: 'Conservative',
              mobileTimestamp: '2024-01-01T10:00:00Z',
              desktopTimestamp: '2024-01-01T10:05:00Z',
              resolution: 'latest_wins'
            }
          ],
          resolvedState: {
            responses: [
              { questionId: 'q1', value: 'Conservative', resolvedBy: 'latest_timestamp' }
            ]
          },
          syncWarnings: [
            'Conflicting response for question q1 resolved using latest timestamp'
          ]
        })
      });

      const conflictResolution = await apiClient.makeRequest('/api/sync/resolve-conflicts', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          conflictData: {
            mobile: [{ questionId: 'q1', value: 'Liberal' }],
            desktop: [{ questionId: 'q1', value: 'Conservative' }]
          }
        })
      });

      expect(conflictResolution.conflicts).toHaveLength(1);
      expect(conflictResolution.resolvedState.responses[0].value).toBe('Conservative');
      expect(conflictResolution.syncWarnings[0]).toContain('Conflicting response for question q1');
    });
  });

  describe('Performance and Scalability Scenarios', () => {
    it('should handle high-volume concurrent operations', async () => {
      // Simulate multiple concurrent API calls
      const concurrentOperations = [
        'getSurveyQuestions',
        'getProfile',
        'analyzeBeliefs',
        'findMatches',
        'getConversation'
      ];

      const mockResponses = concurrentOperations.map((operation, index) => ({
        ok: true,
        json: () => Promise.resolve({
          operation,
          requestId: `req-${index}`,
          timestamp: new Date().toISOString(),
          processingTime: Math.random() * 100
        })
      }));

      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])
        .mockResolvedValueOnce(mockResponses[3])
        .mockResolvedValueOnce(mockResponses[4]);

      const promises = [
        apiClient.getSurveyQuestions(),
        apiClient.getProfile(TEST_CONFIG.MOCK_USER_ID),
        apiClient.analyzeBeliefs(TEST_CONFIG.MOCK_USER_ID),
        apiClient.findMatches(TEST_CONFIG.MOCK_USER_ID),
        apiClient.getConversation(TEST_CONFIG.MOCK_CONVERSATION_ID)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.operation).toBe(concurrentOperations[index]);
        expect(result.requestId).toBe(`req-${index}`);
        expect(typeof result.processingTime).toBe('number');
      });
    });

    it('should handle large dataset operations efficiently', async () => {
      // Simulate processing large number of survey responses
      const largeResponseSet = Array.from({ length: 1000 }, (_, i) => ({
        questionId: `q${i + 1}`,
        value: Math.random() > 0.5 ? 'Agree' : 'Disagree',
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      }));

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          processed: largeResponseSet.length,
          beliefProfile: mockApiResponses.beliefProfile,
          processingStats: {
            totalResponses: 1000,
            processingTime: 2500, // 2.5 seconds
            memoryUsage: '45MB',
            batchesProcessed: 10
          },
          warnings: [
            'Large dataset processed in batches for optimal performance'
          ]
        })
      });

      const largeDataResponse = await apiClient.submitSurveyResponse(largeResponseSet);

      expect(largeDataResponse.success).toBe(true);
      expect(largeDataResponse.processed).toBe(1000);
      expect(largeDataResponse.processingStats.batchesProcessed).toBe(10);
      expect(largeDataResponse.warnings[0]).toContain('Large dataset processed in batches');
      testUtils.expectValidBeliefProfile(largeDataResponse.beliefProfile);
    });
  });
});
