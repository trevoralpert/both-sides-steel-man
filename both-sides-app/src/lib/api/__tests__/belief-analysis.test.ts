/**
 * Unit tests for Belief Analysis API functions
 * Testing belief profiling, compatibility scoring, and matching algorithms
 */

import {
  calculateCompatibilityScore,
  findOpposingViewpoints,
  generateBeliefInsights,
  BeliefProfile,
  CompatibilityResult
} from '../belief-analysis';

describe('Belief Analysis API', () => {
  const mockBeliefProfile1: BeliefProfile = {
    political: 0.7,    // Conservative
    social: -0.3,      // Slightly liberal
    economic: 0.8,     // Very conservative
    environmental: -0.5, // Liberal
    international: 0.2   // Slightly conservative
  };

  const mockBeliefProfile2: BeliefProfile = {
    political: -0.6,   // Liberal
    social: 0.4,       // Conservative
    economic: -0.7,    // Very liberal
    environmental: 0.3, // Slightly conservative
    international: -0.8  // Very liberal
  };

  describe('calculateCompatibilityScore', () => {
    it('should calculate compatibility score between two profiles', () => {
      const result = calculateCompatibilityScore(mockBeliefProfile1, mockBeliefProfile2);
      
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(result.axisScores).toBeDefined();
      expect(Object.keys(result.axisScores)).toHaveLength(5);
    });

    it('should return high compatibility for similar profiles', () => {
      const similarProfile: BeliefProfile = {
        political: 0.6,
        social: -0.2,
        economic: 0.7,
        environmental: -0.4,
        international: 0.1
      };

      const result = calculateCompatibilityScore(mockBeliefProfile1, similarProfile);
      expect(result.overallScore).toBeGreaterThan(0.7);
    });

    it('should return low compatibility for opposing profiles', () => {
      const result = calculateCompatibilityScore(mockBeliefProfile1, mockBeliefProfile2);
      expect(result.overallScore).toBeLessThan(0.5);
    });

    it('should handle identical profiles', () => {
      const result = calculateCompatibilityScore(mockBeliefProfile1, mockBeliefProfile1);
      expect(result.overallScore).toBe(1);
    });

    it('should calculate axis-specific scores correctly', () => {
      const result = calculateCompatibilityScore(mockBeliefProfile1, mockBeliefProfile2);
      
      // Political axis should have low compatibility (0.7 vs -0.6)
      expect(result.axisScores.political).toBeLessThan(0.3);
      
      // Economic axis should have low compatibility (0.8 vs -0.7)
      expect(result.axisScores.economic).toBeLessThan(0.2);
    });
  });

  describe('findOpposingViewpoints', () => {
    const candidateProfiles: BeliefProfile[] = [
      mockBeliefProfile2, // Should be good match (opposing)
      {
        political: 0.8,
        social: -0.2,
        economic: 0.9,
        environmental: -0.4,
        international: 0.3
      }, // Similar profile (should not match well)
      {
        political: -0.9,
        social: 0.8,
        economic: -0.8,
        environmental: 0.7,
        international: -0.7
      } // Very opposing profile
    ];

    it('should find opposing viewpoints from candidate profiles', () => {
      const matches = findOpposingViewpoints(mockBeliefProfile1, candidateProfiles, 2);
      
      expect(matches).toHaveLength(2);
      expect(matches[0].compatibilityScore).toBeLessThan(0.5); // Should be low compatibility
      expect(matches[0].opposingAxes).toContain('political');
    });

    it('should prioritize profiles with most opposing views', () => {
      const matches = findOpposingViewpoints(mockBeliefProfile1, candidateProfiles, 3);
      
      // First match should have lower compatibility than second
      expect(matches[0].compatibilityScore).toBeLessThanOrEqual(matches[1].compatibilityScore);
    });

    it('should identify specific opposing axes', () => {
      const matches = findOpposingViewpoints(mockBeliefProfile1, candidateProfiles, 1);
      
      expect(matches[0].opposingAxes).toBeDefined();
      expect(matches[0].opposingAxes.length).toBeGreaterThan(0);
      expect(matches[0].opposingAxes).toContain('political'); // Should identify political opposition
    });

    it('should handle empty candidate list', () => {
      const matches = findOpposingViewpoints(mockBeliefProfile1, [], 5);
      expect(matches).toHaveLength(0);
    });

    it('should respect the limit parameter', () => {
      const matches = findOpposingViewpoints(mockBeliefProfile1, candidateProfiles, 1);
      expect(matches).toHaveLength(1);
    });
  });

  describe('generateBeliefInsights', () => {
    it('should generate insights for a belief profile', () => {
      const insights = generateBeliefInsights(mockBeliefProfile1);
      
      expect(insights.dominantAxis).toBeDefined();
      expect(insights.strengths).toBeInstanceOf(Array);
      expect(insights.growthAreas).toBeInstanceOf(Array);
      expect(insights.summary).toBeDefined();
      expect(typeof insights.summary).toBe('string');
    });

    it('should identify dominant axis correctly', () => {
      const insights = generateBeliefInsights(mockBeliefProfile1);
      
      // Economic axis has highest absolute value (0.8)
      expect(insights.dominantAxis).toBe('economic');
    });

    it('should provide relevant strengths and growth areas', () => {
      const insights = generateBeliefInsights(mockBeliefProfile1);
      
      expect(insights.strengths.length).toBeGreaterThan(0);
      expect(insights.growthAreas.length).toBeGreaterThan(0);
      
      // Should identify strong economic views as a strength
      expect(insights.strengths).toContain('Strong economic perspectives');
    });

    it('should handle neutral profiles', () => {
      const neutralProfile: BeliefProfile = {
        political: 0,
        social: 0.1,
        economic: -0.1,
        environmental: 0,
        international: 0
      };

      const insights = generateBeliefInsights(neutralProfile);
      expect(insights.dominantAxis).toBeDefined();
      expect(insights.summary).toContain('balanced');
    });

    it('should provide meaningful summary', () => {
      const insights = generateBeliefInsights(mockBeliefProfile1);
      
      expect(insights.summary.length).toBeGreaterThan(50); // Should be substantial
      expect(insights.summary).toContain('conservative'); // Should reflect the profile
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle profiles with extreme values', () => {
      const extremeProfile: BeliefProfile = {
        political: 1,
        social: -1,
        economic: 1,
        environmental: -1,
        international: 1
      };

      const result = calculateCompatibilityScore(extremeProfile, mockBeliefProfile1);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });

    it('should handle profiles with all zero values', () => {
      const neutralProfile: BeliefProfile = {
        political: 0,
        social: 0,
        economic: 0,
        environmental: 0,
        international: 0
      };

      const result = calculateCompatibilityScore(neutralProfile, mockBeliefProfile1);
      expect(result.overallScore).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should validate belief profile values are within range', () => {
      const invalidProfile = {
        political: 2,  // Invalid: > 1
        social: -2,    // Invalid: < -1
        economic: 0.5,
        environmental: 0,
        international: 1.5  // Invalid: > 1
      } as BeliefProfile;

      // The function should handle invalid values gracefully
      expect(() => {
        calculateCompatibilityScore(invalidProfile, mockBeliefProfile1);
      }).not.toThrow();
    });

    it('should handle missing axis values', () => {
      const incompleteProfile = {
        political: 0.5,
        social: 0.2
        // Missing other axes
      } as any;

      expect(() => {
        generateBeliefInsights(incompleteProfile);
      }).not.toThrow();
    });
  });
});
