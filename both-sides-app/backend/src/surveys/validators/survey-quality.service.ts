/**
 * Phase 3 Task 3.1.5.2: Survey Quality Scoring System
 * Advanced algorithms for measuring response quality and consistency
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface QualityMetrics {
  overallScore: number; // 0-100
  consistencyScore: number; // 0-100
  engagementScore: number; // 0-100
  honestyScore: number; // 0-100
  thoughtfulnessScore: number; // 0-100
  completionQuality: number; // 0-100
  flags: QualityFlag[];
  recommendations: string[];
}

export interface QualityFlag {
  type: 'pattern' | 'inconsistency' | 'engagement' | 'timing';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedQuestions: string[];
  confidence: number; // 0-1
}

export interface ResponsePattern {
  patternType: 'straight_line' | 'alternating' | 'extreme_bias' | 'neutral_bias' | 'random';
  strength: number; // 0-1
  questionCount: number;
  examples: string[];
}

@Injectable()
export class SurveyQualityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate comprehensive quality metrics for a user's survey responses
   */
  async calculateQualityMetrics(userId: string, surveyId?: string): Promise<QualityMetrics> {
    const responses = await this.getUserResponses(userId, surveyId);
    
    if (responses.length === 0) {
      return this.getEmptyQualityMetrics();
    }

    const consistencyScore = this.calculateConsistencyScore(responses);
    const engagementScore = this.calculateEngagementScore(responses);
    const honestyScore = this.calculateHonestyScore(responses);
    const thoughtfulnessScore = this.calculateThoughtfulnessScore(responses);
    const completionQuality = this.calculateCompletionQuality(responses);
    
    const overallScore = this.calculateOverallScore({
      consistencyScore,
      engagementScore,
      honestyScore,
      thoughtfulnessScore,
      completionQuality,
    });

    const flags = this.detectQualityFlags(responses);
    const recommendations = this.generateRecommendations(flags, {
      consistencyScore,
      engagementScore,
      honestyScore,
      thoughtfulnessScore,
      completionQuality,
    });

    return {
      overallScore,
      consistencyScore,
      engagementScore,
      honestyScore,
      thoughtfulnessScore,
      completionQuality,
      flags,
      recommendations,
    };
  }

  /**
   * Calculate consistency score based on logical coherence across related questions
   */
  private calculateConsistencyScore(responses: any[]): number {
    if (responses.length < 2) return 100;

    let consistencyPoints = 100;
    const inconsistencies = [];

    // Group responses by category for consistency checking
    const categorizedResponses = this.groupResponsesByCategory(responses);
    
    Object.entries(categorizedResponses).forEach(([category, categoryResponses]) => {
      if (categoryResponses.length < 2) return;
      
      // Check for ideological consistency within category
      const categoryInconsistencies = this.findCategoryInconsistencies(categoryResponses, category);
      inconsistencies.push(...categoryInconsistencies);
    });

    // Check for cross-category consistency
    const crossCategoryInconsistencies = this.findCrossCategoryInconsistencies(categorizedResponses);
    inconsistencies.push(...crossCategoryInconsistencies);

    // Deduct points for each inconsistency
    inconsistencies.forEach(inconsistency => {
      consistencyPoints -= inconsistency.severity * 10;
    });

    return Math.max(consistencyPoints, 0);
  }

  /**
   * Calculate engagement score based on response patterns and effort indicators
   */
  private calculateEngagementScore(responses: any[]): number {
    if (responses.length === 0) return 0;

    let engagementScore = 100;
    const patterns = this.detectResponsePatterns(responses);
    
    patterns.forEach(pattern => {
      switch (pattern.patternType) {
        case 'straight_line':
          // User selecting same response repeatedly
          engagementScore -= pattern.strength * 30;
          break;
        case 'alternating':
          // User alternating between responses without thought
          engagementScore -= pattern.strength * 25;
          break;
        case 'extreme_bias':
          // User always selecting extremes
          engagementScore -= pattern.strength * 15;
          break;
        case 'neutral_bias':
          // User always selecting neutral/middle options
          engagementScore -= pattern.strength * 20;
          break;
        case 'random':
          // Completely random pattern
          engagementScore -= pattern.strength * 40;
          break;
      }
    });

    // Check confidence levels
    const avgConfidence = this.calculateAverageConfidence(responses);
    if (avgConfidence < 2) {
      engagementScore -= 20; // Very low confidence suggests disengagement
    } else if (avgConfidence > 4.5) {
      engagementScore += 5; // High confidence suggests engagement
    }

    // Check response times
    const timingScore = this.calculateTimingScore(responses);
    engagementScore = (engagementScore + timingScore) / 2;

    return Math.max(Math.min(engagementScore, 100), 0);
  }

  /**
   * Calculate honesty score based on indicators of truthful responses
   */
  private calculateHonestyScore(responses: any[]): number {
    if (responses.length === 0) return 100;

    let honestyScore = 100;

    // Check for socially desirable responding
    const socialDesirabilityBias = this.detectSocialDesirabilityBias(responses);
    honestyScore -= socialDesirabilityBias * 20;

    // Check for extreme responding without nuance
    const extremeResponding = this.detectExtremeResponding(responses);
    honestyScore -= extremeResponding * 15;

    // Check for acquiescence bias (always agreeing)
    const acquiescenceBias = this.detectAcquiescenceBias(responses);
    honestyScore -= acquiescenceBias * 25;

    // Check response time consistency with content complexity
    const timingConsistency = this.calculateTimingConsistency(responses);
    honestyScore = (honestyScore + timingConsistency) / 2;

    return Math.max(honestyScore, 0);
  }

  /**
   * Calculate thoughtfulness score based on depth of consideration
   */
  private calculateThoughtfulnessScore(responses: any[]): number {
    if (responses.length === 0) return 0;

    let thoughtfulnessScore = 0;

    // Text response quality
    const textResponses = responses.filter(r => r.question.type === 'TEXT_RESPONSE');
    if (textResponses.length > 0) {
      const textQuality = this.evaluateTextQuality(textResponses);
      thoughtfulnessScore += textQuality * 0.4;
    }

    // Response time appropriateness
    const timingThoughtfulness = this.evaluateTimingThoughtfulness(responses);
    thoughtfulnessScore += timingThoughtfulness * 0.3;

    // Use of confidence levels
    const confidenceUsage = this.evaluateConfidenceUsage(responses);
    thoughtfulnessScore += confidenceUsage * 0.2;

    // Complexity of ranking responses
    const rankingResponses = responses.filter(r => r.question.type === 'RANKING');
    if (rankingResponses.length > 0) {
      const rankingQuality = this.evaluateRankingQuality(rankingResponses);
      thoughtfulnessScore += rankingQuality * 0.1;
    }

    return Math.max(Math.min(thoughtfulnessScore, 100), 0);
  }

  /**
   * Calculate completion quality based on survey completion patterns
   */
  private calculateCompletionQuality(responses: any[]): number {
    if (responses.length === 0) return 0;

    let qualityScore = 100;

    // Check completion rate
    const totalQuestions = responses[0]?.question?.survey?.questions?.length || responses.length;
    const completionRate = (responses.length / totalQuestions) * 100;
    
    if (completionRate < 50) {
      qualityScore -= 40;
    } else if (completionRate < 75) {
      qualityScore -= 20;
    }

    // Check for completion patterns (did they rush at the end?)
    const completionPattern = this.analyzeCompletionPattern(responses);
    qualityScore -= completionPattern.rushingPenalty;

    // Check for missing confidence levels or text responses
    const missingDataPenalty = this.calculateMissingDataPenalty(responses);
    qualityScore -= missingDataPenalty;

    return Math.max(qualityScore, 0);
  }

  /**
   * Detect quality flags that indicate potential issues
   */
  private detectQualityFlags(responses: any[]): QualityFlag[] {
    const flags: QualityFlag[] = [];

    // Pattern detection
    const patterns = this.detectResponsePatterns(responses);
    patterns.forEach(pattern => {
      if (pattern.strength > 0.6) {
        flags.push({
          type: 'pattern',
          severity: pattern.strength > 0.8 ? 'high' : 'medium',
          description: `Detected ${pattern.patternType} response pattern`,
          affectedQuestions: pattern.examples,
          confidence: pattern.strength,
        });
      }
    });

    // Timing flags
    const suspiciousTiming = this.detectSuspiciousTiming(responses);
    if (suspiciousTiming.confidence > 0.7) {
      flags.push({
        type: 'timing',
        severity: 'medium',
        description: 'Suspicious response timing patterns detected',
        affectedQuestions: suspiciousTiming.questionIds,
        confidence: suspiciousTiming.confidence,
      });
    }

    // Engagement flags
    const lowEngagement = this.detectLowEngagement(responses);
    if (lowEngagement.detected) {
      flags.push({
        type: 'engagement',
        severity: 'medium',
        description: 'Low engagement indicators detected',
        affectedQuestions: lowEngagement.questionIds,
        confidence: lowEngagement.confidence,
      });
    }

    return flags;
  }

  // Helper methods for calculations
  private groupResponsesByCategory(responses: any[]): Record<string, any[]> {
    return responses.reduce((acc, response) => {
      const category = response.question.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(response);
      return acc;
    }, {});
  }

  private findCategoryInconsistencies(responses: any[], category: string): Array<{severity: number, description: string}> {
    // Simplified consistency checking - would be more sophisticated in practice
    const inconsistencies = [];
    
    // Check for contradictory positions within the same category
    const likertResponses = responses.filter(r => r.question.type === 'LIKERT_SCALE');
    if (likertResponses.length >= 2) {
      // Look for responses that are logically inconsistent
      // This is a simplified example
      const positions = likertResponses.map(r => r.response_value);
      const variance = this.calculateVariance(positions);
      
      if (variance > 4) { // High variance might indicate inconsistency
        inconsistencies.push({
          severity: 0.5,
          description: `High variance in ${category} responses`,
        });
      }
    }
    
    return inconsistencies;
  }

  private findCrossCategoryInconsistencies(categorizedResponses: Record<string, any[]>): Array<{severity: number, description: string}> {
    // Check for inconsistencies across different categories
    return [];
  }

  private detectResponsePatterns(responses: any[]): ResponsePattern[] {
    const patterns: ResponsePattern[] = [];
    
    // Detect straight-line responding
    const straightLinePattern = this.detectStraightLinePattern(responses);
    if (straightLinePattern.strength > 0.3) {
      patterns.push(straightLinePattern);
    }
    
    return patterns;
  }

  private detectStraightLinePattern(responses: any[]): ResponsePattern {
    const likertResponses = responses.filter(r => r.question.type === 'LIKERT_SCALE');
    if (likertResponses.length < 3) {
      return { patternType: 'straight_line', strength: 0, questionCount: 0, examples: [] };
    }
    
    // Check how often the same response is given
    const responseCounts = likertResponses.reduce((acc, r) => {
      acc[r.response_value] = (acc[r.response_value] || 0) + 1;
      return acc;
    }, {});
    
    const maxCount = Math.max(...Object.values(responseCounts));
    const strength = maxCount / likertResponses.length;
    
    return {
      patternType: 'straight_line',
      strength,
      questionCount: likertResponses.length,
      examples: likertResponses.slice(0, 3).map(r => r.question_id),
    };
  }

  private calculateAverageConfidence(responses: any[]): number {
    const confidenceResponses = responses.filter(r => r.confidence_level);
    if (confidenceResponses.length === 0) return 3; // Default neutral
    
    return confidenceResponses.reduce((sum, r) => sum + r.confidence_level, 0) / confidenceResponses.length;
  }

  private calculateTimingScore(responses: any[]): number {
    // Analyze response times for appropriate pacing
    let score = 100;
    
    responses.forEach(response => {
      const expectedTime = this.calculateExpectedTime(response.question);
      const actualTime = response.completion_time;
      
      if (actualTime < expectedTime * 0.3) {
        score -= 15; // Too fast
      } else if (actualTime > expectedTime * 5) {
        score -= 10; // Too slow
      }
    });
    
    return Math.max(score, 0);
  }

  private calculateExpectedTime(question: any): number {
    const baseTime = 3000; // 3 seconds
    const typeMultiplier = {
      'BINARY_CHOICE': 1,
      'LIKERT_SCALE': 1.2,
      'MULTIPLE_CHOICE': 1.5,
      'SLIDER': 1.3,
      'RANKING': 2.5,
      'TEXT_RESPONSE': 4,
    }[question.type] || 1;
    
    return baseTime * typeMultiplier;
  }

  private detectSocialDesirabilityBias(responses: any[]): number {
    // Simplified - look for patterns indicating socially desirable responses
    return 0.2; // Placeholder
  }

  private detectExtremeResponding(responses: any[]): number {
    const likertResponses = responses.filter(r => r.question.type === 'LIKERT_SCALE');
    if (likertResponses.length === 0) return 0;
    
    const extremeCount = likertResponses.filter(r => r.response_value === 1 || r.response_value === 7).length;
    return extremeCount / likertResponses.length;
  }

  private detectAcquiescenceBias(responses: any[]): number {
    // Look for tendency to always agree/select higher values
    const likertResponses = responses.filter(r => r.question.type === 'LIKERT_SCALE');
    if (likertResponses.length === 0) return 0;
    
    const highResponses = likertResponses.filter(r => r.response_value >= 5).length;
    return highResponses / likertResponses.length > 0.8 ? 0.7 : 0;
  }

  private calculateTimingConsistency(responses: any[]): number {
    // Check if timing is consistent with response complexity
    return 75; // Placeholder
  }

  private evaluateTextQuality(textResponses: any[]): number {
    let qualityScore = 0;
    
    textResponses.forEach(response => {
      const text = response.response_value;
      const wordCount = text.split(/\s+/).length;
      
      // Length quality
      if (wordCount >= 10) qualityScore += 20;
      else if (wordCount >= 5) qualityScore += 10;
      
      // Complexity indicators
      if (text.includes('.') && text.includes(',')) qualityScore += 10; // Punctuation
      if (text.match(/\b(because|however|although|therefore)\b/gi)) qualityScore += 15; // Complex reasoning
    });
    
    return Math.min(qualityScore / textResponses.length, 100);
  }

  private evaluateTimingThoughtfulness(responses: any[]): number {
    // Users who take appropriate time show thoughtfulness
    let score = 0;
    
    responses.forEach(response => {
      const expectedTime = this.calculateExpectedTime(response.question);
      const actualTime = response.completion_time;
      
      if (actualTime >= expectedTime * 0.8 && actualTime <= expectedTime * 3) {
        score += 100 / responses.length;
      }
    });
    
    return score;
  }

  private evaluateConfidenceUsage(responses: any[]): number {
    const confidenceResponses = responses.filter(r => r.confidence_level);
    if (confidenceResponses.length === 0) return 50;
    
    // Good confidence usage shows variation (not all 5s or all 1s)
    const confidenceLevels = confidenceResponses.map(r => r.confidence_level);
    const variance = this.calculateVariance(confidenceLevels);
    
    return Math.min(variance * 30, 100); // Higher variance = more thoughtful confidence usage
  }

  private evaluateRankingQuality(rankingResponses: any[]): number {
    // Quality ranking shows thoughtful ordering, not just random
    return 70; // Placeholder
  }

  private analyzeCompletionPattern(responses: any[]): {rushingPenalty: number} {
    // Check if user rushed through questions at the end
    const sortedByTime = responses.sort((a, b) => new Date(a.responded_at).getTime() - new Date(b.responded_at).getTime());
    
    if (sortedByTime.length < 5) return {rushingPenalty: 0};
    
    const lastFiveAvgTime = sortedByTime.slice(-5).reduce((sum, r) => sum + r.completion_time, 0) / 5;
    const firstFiveAvgTime = sortedByTime.slice(0, 5).reduce((sum, r) => sum + r.completion_time, 0) / 5;
    
    const rushingPenalty = firstFiveAvgTime > lastFiveAvgTime * 2 ? 15 : 0;
    
    return {rushingPenalty};
  }

  private calculateMissingDataPenalty(responses: any[]): number {
    let penalty = 0;
    
    responses.forEach(response => {
      if (!response.confidence_level) penalty += 2;
      if (response.question.type === 'TEXT_RESPONSE' && 
          (!response.response_text || response.response_text.length < 10)) {
        penalty += 5;
      }
    });
    
    return Math.min(penalty, 30);
  }

  private detectSuspiciousTiming(responses: any[]): {confidence: number, questionIds: string[]} {
    const suspiciousResponses = responses.filter(r => {
      const expectedTime = this.calculateExpectedTime(r.question);
      return r.completion_time < expectedTime * 0.2;
    });
    
    return {
      confidence: suspiciousResponses.length / responses.length,
      questionIds: suspiciousResponses.map(r => r.question_id),
    };
  }

  private detectLowEngagement(responses: any[]): {detected: boolean, confidence: number, questionIds: string[]} {
    const indicators = [];
    
    // Low confidence across the board
    const avgConfidence = this.calculateAverageConfidence(responses);
    if (avgConfidence < 2.5) indicators.push('low_confidence');
    
    // Straight-line responding
    const straightLine = this.detectStraightLinePattern(responses);
    if (straightLine.strength > 0.6) indicators.push('straight_line');
    
    return {
      detected: indicators.length > 0,
      confidence: indicators.length / 2,
      questionIds: responses.slice(0, 3).map(r => r.question_id),
    };
  }

  private calculateOverallScore(scores: {
    consistencyScore: number,
    engagementScore: number,
    honestyScore: number,
    thoughtfulnessScore: number,
    completionQuality: number,
  }): number {
    // Weighted average of all quality dimensions
    return Math.round(
      scores.consistencyScore * 0.25 +
      scores.engagementScore * 0.25 +
      scores.honestyScore * 0.2 +
      scores.thoughtfulnessScore * 0.15 +
      scores.completionQuality * 0.15
    );
  }

  private generateRecommendations(flags: QualityFlag[], scores: any): string[] {
    const recommendations: string[] = [];
    
    if (scores.consistencyScore < 70) {
      recommendations.push('Review responses for logical consistency across related questions');
    }
    
    if (scores.engagementScore < 60) {
      recommendations.push('Take more time to carefully consider each question');
    }
    
    if (scores.thoughtfulnessScore < 50) {
      recommendations.push('Provide more detailed explanations for text response questions');
    }
    
    flags.forEach(flag => {
      if (flag.type === 'pattern' && flag.severity === 'high') {
        recommendations.push('Vary responses based on question content rather than using patterns');
      }
    });
    
    return recommendations;
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length;
  }

  private async getUserResponses(userId: string, surveyId?: string): Promise<any[]> {
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) return [];

    return await this.prisma.surveyResponse.findMany({
      where: {
        profile_id: profile.id,
        ...(surveyId && { survey_id: surveyId }),
      },
      include: {
        question: {
          include: {
            survey: true,
          },
        },
      },
      orderBy: { responded_at: 'asc' },
    });
  }

  private getEmptyQualityMetrics(): QualityMetrics {
    return {
      overallScore: 0,
      consistencyScore: 0,
      engagementScore: 0,
      honestyScore: 0,
      thoughtfulnessScore: 0,
      completionQuality: 0,
      flags: [],
      recommendations: ['Complete the survey to receive quality feedback'],
    };
  }
}
