/**
 * Belief Analysis Functions
 * Functions for belief profiling, compatibility scoring, and matching algorithms
 */

export interface BeliefProfile {
  political: number;
  social: number;
  economic: number;
  environmental: number;
  international: number;
}

export interface CompatibilityResult {
  overallScore: number;
  axisScores: {
    political: number;
    social: number;
    economic: number;
    environmental: number;
    international: number;
  };
}

export interface MatchResult {
  profile: BeliefProfile;
  compatibilityScore: number;
  opposingAxes: string[];
}

export interface BeliefInsights {
  dominantAxis: keyof BeliefProfile;
  strengths: string[];
  growthAreas: string[];
  summary: string;
}

export function calculateCompatibilityScore(profile1: BeliefProfile, profile2: BeliefProfile): CompatibilityResult {
  const axes: (keyof BeliefProfile)[] = ['political', 'social', 'economic', 'environmental', 'international'];
  
  const axisScores: CompatibilityResult['axisScores'] = {
    political: 0,
    social: 0,
    economic: 0,
    environmental: 0,
    international: 0
  };

  let totalScore = 0;

  axes.forEach(axis => {
    const diff = Math.abs(profile1[axis] - profile2[axis]);
    const score = 1 - (diff / 2); // Convert difference to compatibility score (0-1)
    axisScores[axis] = Math.max(0, score);
    totalScore += axisScores[axis];
  });

  return {
    overallScore: totalScore / axes.length,
    axisScores
  };
}

export function findOpposingViewpoints(
  userProfile: BeliefProfile, 
  candidateProfiles: BeliefProfile[], 
  limit: number
): MatchResult[] {
  if (candidateProfiles.length === 0) {
    return [];
  }

  const matches: MatchResult[] = candidateProfiles.map(profile => {
    const compatibility = calculateCompatibilityScore(userProfile, profile);
    const opposingAxes: string[] = [];

    // Find axes where profiles significantly oppose each other
    Object.entries(compatibility.axisScores).forEach(([axis, score]) => {
      if (score < 0.4) { // Threshold for opposing views
        opposingAxes.push(axis);
      }
    });

    return {
      profile,
      compatibilityScore: compatibility.overallScore,
      opposingAxes
    };
  });

  // Sort by compatibility score (ascending - lower scores mean more opposing views)
  matches.sort((a, b) => a.compatibilityScore - b.compatibilityScore);

  return matches.slice(0, limit);
}

export function generateBeliefInsights(profile: BeliefProfile): BeliefInsights {
  const axes: (keyof BeliefProfile)[] = ['political', 'social', 'economic', 'environmental', 'international'];
  
  // Find dominant axis (highest absolute value)
  let dominantAxis: keyof BeliefProfile = 'political';
  let maxAbsValue = 0;

  axes.forEach(axis => {
    const absValue = Math.abs(profile[axis]);
    if (absValue > maxAbsValue) {
      maxAbsValue = absValue;
      dominantAxis = axis;
    }
  });

  // Generate strengths based on strong beliefs
  const strengths: string[] = [];
  axes.forEach(axis => {
    const value = profile[axis];
    if (Math.abs(value) > 0.6) {
      if (axis === 'economic') {
        strengths.push('Strong economic perspectives');
      } else if (axis === 'political') {
        strengths.push('Clear political viewpoints');
      } else if (axis === 'social') {
        strengths.push('Well-defined social values');
      } else if (axis === 'environmental') {
        strengths.push('Environmental consciousness');
      } else if (axis === 'international') {
        strengths.push('Global perspective');
      }
    }
  });

  // Generate growth areas based on neutral beliefs
  const growthAreas: string[] = [];
  axes.forEach(axis => {
    const value = profile[axis];
    if (Math.abs(value) < 0.3) {
      growthAreas.push(`Explore ${axis} perspectives more deeply`);
    }
  });

  // Generate summary
  const isBalanced = axes.every(axis => Math.abs(profile[axis]) < 0.4);
  const dominantValue = profile[dominantAxis];
  const dominantDirection = dominantValue > 0 ? 'conservative' : 'liberal';

  let summary: string;
  if (isBalanced) {
    summary = 'You have a balanced perspective across different belief dimensions, showing openness to various viewpoints.';
  } else {
    summary = `Your beliefs are most strongly defined in the ${dominantAxis} dimension, leaning ${dominantDirection}. ` +
              `This suggests you have well-formed opinions in this area while remaining more flexible in others.`;
  }

  return {
    dominantAxis,
    strengths: strengths.length > 0 ? strengths : ['Balanced perspective'],
    growthAreas: growthAreas.length > 0 ? growthAreas : ['Continue developing nuanced views'],
    summary
  };
}
