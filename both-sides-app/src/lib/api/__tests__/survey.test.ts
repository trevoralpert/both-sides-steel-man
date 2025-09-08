/**
 * Unit tests for Survey API functions
 * Testing survey validation, response processing, and belief analysis
 */

import {
  validateSurveyResponse,
  processSurveyResponse,
  calculateBeliefProfile,
  SurveyQuestion,
  SurveyResponse,
  BeliefAxis
} from '../survey';

describe('Survey API', () => {
  describe('validateSurveyResponse', () => {
    const mockQuestion: SurveyQuestion = {
      id: 'q1',
      text: 'Test question',
      type: 'MULTIPLE_CHOICE',
      category: 'POLITICAL',
      options: ['Option A', 'Option B', 'Option C'],
      required: true
    };

    it('should validate a correct multiple choice response', () => {
      const result = validateSurveyResponse(mockQuestion, 'Option A');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid multiple choice response', () => {
      const result = validateSurveyResponse(mockQuestion, 'Invalid Option');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a valid option');
    });

    it('should reject empty response for required question', () => {
      const result = validateSurveyResponse(mockQuestion, '');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('This question is required');
    });

    it('should validate scale responses', () => {
      const scaleQuestion: SurveyQuestion = {
        id: 'q2',
        text: 'Rate this',
        type: 'SCALE',
        category: 'SOCIAL',
        scale: { min: 1, max: 10 },
        required: true
      };

      const validResult = validateSurveyResponse(scaleQuestion, 5);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateSurveyResponse(scaleQuestion, 15);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Please select a value between 1 and 10');
    });

    it('should validate ranking responses', () => {
      const rankingQuestion: SurveyQuestion = {
        id: 'q3',
        text: 'Rank these options',
        type: 'RANKING',
        category: 'ECONOMIC',
        options: ['A', 'B', 'C'],
        required: true
      };

      const validResult = validateSurveyResponse(rankingQuestion, ['A', 'B', 'C']);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateSurveyResponse(rankingQuestion, ['A', 'B']);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Please rank all options');
    });
  });

  describe('processSurveyResponse', () => {
    const mockResponses: SurveyResponse[] = [
      {
        questionId: 'q1',
        value: 'Conservative',
        timestamp: new Date(),
        userId: 'user1'
      },
      {
        questionId: 'q2',
        value: 8,
        timestamp: new Date(),
        userId: 'user1'
      }
    ];

    it('should process survey responses successfully', async () => {
      const result = await processSurveyResponse('user1', mockResponses);
      expect(result.success).toBe(true);
      expect(result.beliefProfile).toBeDefined();
      expect(result.completionPercentage).toBeGreaterThan(0);
    });

    it('should handle empty responses', async () => {
      const result = await processSurveyResponse('user1', []);
      expect(result.success).toBe(true);
      expect(result.completionPercentage).toBe(0);
    });

    it('should calculate belief profile from responses', async () => {
      const result = await processSurveyResponse('user1', mockResponses);
      expect(result.beliefProfile).toMatchObject({
        political: expect.any(Number),
        social: expect.any(Number),
        economic: expect.any(Number),
        environmental: expect.any(Number),
        international: expect.any(Number)
      });
    });
  });

  describe('calculateBeliefProfile', () => {
    it('should calculate belief profile from responses', () => {
      const responses: SurveyResponse[] = [
        {
          questionId: 'political1',
          value: 'Very Conservative',
          timestamp: new Date(),
          userId: 'user1'
        },
        {
          questionId: 'social1', 
          value: 7,
          timestamp: new Date(),
          userId: 'user1'
        }
      ];

      const profile = calculateBeliefProfile(responses);
      
      expect(profile).toMatchObject({
        political: expect.any(Number),
        social: expect.any(Number),
        economic: expect.any(Number),
        environmental: expect.any(Number),
        international: expect.any(Number)
      });

      // Values should be between -1 and 1
      Object.values(profile).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should return neutral profile for empty responses', () => {
      const profile = calculateBeliefProfile([]);
      
      Object.values(profile).forEach(value => {
        expect(value).toBe(0);
      });
    });

    it('should weight responses appropriately', () => {
      const strongConservativeResponses: SurveyResponse[] = [
        {
          questionId: 'political1',
          value: 'Very Conservative',
          timestamp: new Date(),
          userId: 'user1'
        },
        {
          questionId: 'political2',
          value: 'Conservative',
          timestamp: new Date(),
          userId: 'user1'
        }
      ];

      const profile = calculateBeliefProfile(strongConservativeResponses);
      expect(profile.political).toBeGreaterThan(0); // Should lean conservative
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed responses gracefully', async () => {
      const malformedResponses = [
        {
          questionId: '',
          value: null,
          timestamp: new Date(),
          userId: 'user1'
        }
      ] as any;

      const result = await processSurveyResponse('user1', malformedResponses);
      expect(result.success).toBe(true); // Should not crash
    });

    it('should handle very large response values', () => {
      const question: SurveyQuestion = {
        id: 'q1',
        text: 'Test',
        type: 'SCALE',
        category: 'POLITICAL',
        scale: { min: 1, max: 10 },
        required: true
      };

      const result = validateSurveyResponse(question, 999999);
      expect(result.isValid).toBe(false);
    });

    it('should handle unicode and special characters in text responses', () => {
      const question: SurveyQuestion = {
        id: 'q1',
        text: 'Test',
        type: 'TEXT',
        category: 'SOCIAL',
        required: true
      };

      const result = validateSurveyResponse(question, '🎉 Test with émojis and ñ special chars');
      expect(result.isValid).toBe(true);
    });
  });
});
