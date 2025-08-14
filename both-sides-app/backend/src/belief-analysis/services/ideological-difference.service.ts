/**
 * Ideological Difference Service
 * 
 * Service for calculating ideological differences between users for the matching engine.
 * Implements multi-axis scoring, weighted differences, and complementarity analysis
 * to create meaningful educational pairings for debates.
 * 
 * Phase 4 Task 4.2.1: Ideological Difference Scoring System
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { IdeologyScores } from './ideology-mapping.service';

export interface AxisDifference {
  axisName: string;
  user1Score: number;
  user2Score: number;
  absoluteDifference: number;
  normalizedDifference: number;
  educationalValue: number;
  weight: number;
}

export interface IdeologicalDifferenceResult {
  user1Id: string;
  user2Id: string;
  overallDifference: number;
  complementarityScore: number;
  educationalValue: number;
  axisDifferences: AxisDifference[];
  recommendedDebateStyle: 'constructive' | 'challenging' | 'exploratory';
  plasticityAlignment: number;
  metadata: {
    calculatedAt: Date;
    algorithmVersion: string;
    confidenceLevel: number;
  };
}

export interface ComplementarityFactors {
  ideologicalDistance: number;
  plasticityBalance: number;
  certaintyBalance: number;
  consistencyBalance: number;
  diversityValue: number;
}

export interface DifferenceCalculationOptions {
  emphasizeEducationalValue?: boolean;
  minimumDifferenceThreshold?: number;
  maximumDifferenceThreshold?: number;
  plasticityWeightingEnabled?: boolean;
  axisWeightOverrides?: Partial<AxisWeights>;
}

export interface AxisWeights {
  economic: number;
  social: number;
  tradition: number;
  globalism: number;
  environment: number;
  certainty: number;
  consistency: number;
}

@Injectable()
export class IdeologicalDifferenceService {
  private readonly logger = new Logger(IdeologicalDifferenceService.name);
  
  // Default axis weights for educational value
  private readonly DEFAULT_AXIS_WEIGHTS: AxisWeights = {
    economic: 0.25,        // High weight - fundamental worldview differences
    social: 0.20,          // High weight - authority vs freedom perspectives
    tradition: 0.20,       // High weight - change vs stability perspectives  
    globalism: 0.15,       // Medium weight - national vs international focus
    environment: 0.10,     // Medium weight - economic vs environmental priorities
    certainty: 0.05,       // Low weight - meta-cognitive factor
    consistency: 0.05      // Low weight - meta-cognitive factor
  };

  // Thresholds for complementarity assessment
  private readonly DIFFERENCE_THRESHOLDS = {
    minimal: 0.2,          // Too similar for productive debate
    optimal: 0.4,          // Sweet spot for educational value
    excessive: 0.8,        // May be too challenging for constructive dialogue
    maximum: 1.0           // Maximum possible difference
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Calculate comprehensive ideological differences between two users
   */
  async calculateIdeologicalDifference(
    user1Id: string,
    user2Id: string,
    options: DifferenceCalculationOptions = {}
  ): Promise<IdeologicalDifferenceResult> {
    try {
      this.logger.log(`Calculating ideological difference between users ${user1Id} and ${user2Id}`);

      // Get ideology scores for both users
      const [user1Profile, user2Profile] = await Promise.all([
        this.getUserIdeologyProfile(user1Id),
        this.getUserIdeologyProfile(user2Id)
      ]);

      if (!user1Profile || !user2Profile) {
        throw new Error('One or both user profiles not found or incomplete');
      }

      // Calculate axis-by-axis differences
      const axisDifferences = this.calculateAxisDifferences(
        user1Profile.ideologyScores,
        user2Profile.ideologyScores,
        options
      );

      // Calculate overall metrics
      const overallDifference = this.calculateOverallDifference(axisDifferences);
      const complementarityScore = await this.calculateComplementarityScore(
        user1Profile,
        user2Profile,
        axisDifferences
      );

      // Assess educational value
      const educationalValue = this.assessEducationalValue(
        axisDifferences,
        complementarityScore
      );

      // Apply plasticity weighting if enabled
      const plasticityAlignment = this.calculatePlasticityAlignment(
        user1Profile.ideologyScores,
        user2Profile.ideologyScores
      );

      // Determine recommended debate style
      const recommendedDebateStyle = this.determineDebateStyle(
        overallDifference,
        complementarityScore,
        plasticityAlignment
      );

      const result: IdeologicalDifferenceResult = {
        user1Id,
        user2Id,
        overallDifference,
        complementarityScore,
        educationalValue,
        axisDifferences,
        recommendedDebateStyle,
        plasticityAlignment,
        metadata: {
          calculatedAt: new Date(),
          algorithmVersion: '1.0.0',
          confidenceLevel: this.calculateConfidenceLevel(user1Profile.ideologyScores, user2Profile.ideologyScores)
        }
      };

      this.logger.log(
        `Calculated ideological difference: overall=${overallDifference.toFixed(3)}, ` +
        `complementarity=${complementarityScore.toFixed(3)}, education=${educationalValue.toFixed(3)}`
      );

      return result;

    } catch (error) {
      this.logger.error(`Failed to calculate ideological difference between ${user1Id} and ${user2Id}`, error.stack);
      throw new HttpException(
        'Failed to calculate ideological difference',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Calculate differences for each ideology axis
   */
  private calculateAxisDifferences(
    scores1: IdeologyScores,
    scores2: IdeologyScores,
    options: DifferenceCalculationOptions
  ): AxisDifference[] {
    const axisWeights = { ...this.DEFAULT_AXIS_WEIGHTS, ...options.axisWeightOverrides };
    const differences: AxisDifference[] = [];

    // Calculate for each axis
    Object.keys(axisWeights).forEach(axisName => {
      const score1 = scores1[axisName as keyof IdeologyScores];
      const score2 = scores2[axisName as keyof IdeologyScores];

      if (typeof score1 === 'number' && typeof score2 === 'number') {
        const absoluteDifference = Math.abs(score1 - score2);
        const normalizedDifference = this.normalizeAxisDifference(absoluteDifference, axisName);
        
        const axisDifference: AxisDifference = {
          axisName,
          user1Score: score1,
          user2Score: score2,
          absoluteDifference,
          normalizedDifference,
          educationalValue: this.calculateAxisEducationalValue(absoluteDifference, axisName),
          weight: axisWeights[axisName as keyof AxisWeights]
        };

        differences.push(axisDifference);
      }
    });

    return differences;
  }

  /**
   * Calculate overall weighted difference score
   */
  private calculateOverallDifference(axisDifferences: AxisDifference[]): number {
    const weightedSum = axisDifferences.reduce((sum, axis) => {
      return sum + (axis.normalizedDifference * axis.weight);
    }, 0);

    const totalWeight = axisDifferences.reduce((sum, axis) => sum + axis.weight, 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Calculate complementarity score for educational pairing
   */
  private async calculateComplementarityScore(
    user1Profile: any,
    user2Profile: any,
    axisDifferences: AxisDifference[]
  ): Promise<number> {
    const factors: ComplementarityFactors = {
      // Ideological distance - sweet spot around 0.4-0.6 difference
      ideologicalDistance: this.calculateOptimalDistanceScore(axisDifferences),
      
      // Plasticity balance - both users should be open to learning
      plasticityBalance: this.calculatePlasticityBalance(
        user1Profile.ideologyScores,
        user2Profile.ideologyScores
      ),
      
      // Certainty balance - mix of confident and uncertain creates good dialogue
      certaintyBalance: this.calculateCertaintyBalance(
        user1Profile.ideologyScores,
        user2Profile.ideologyScores
      ),
      
      // Consistency balance - consistent users can defend positions well
      consistencyBalance: this.calculateConsistencyBalance(
        user1Profile.ideologyScores,
        user2Profile.ideologyScores
      ),
      
      // Diversity value - how much they can learn from each other
      diversityValue: this.calculateDiversityValue(axisDifferences)
    };

    // Weighted combination of factors
    const complementarityScore = 
      factors.ideologicalDistance * 0.35 +
      factors.plasticityBalance * 0.25 +
      factors.diversityValue * 0.20 +
      factors.certaintyBalance * 0.10 +
      factors.consistencyBalance * 0.10;

    return Math.max(0, Math.min(1, complementarityScore));
  }

  /**
   * Calculate educational value of the pairing
   */
  private assessEducationalValue(
    axisDifferences: AxisDifference[],
    complementarityScore: number
  ): number {
    // Educational value comes from meaningful differences that promote learning
    const significantDifferences = axisDifferences.filter(
      axis => axis.absoluteDifference >= this.DIFFERENCE_THRESHOLDS.minimal
    );

    const diversityScore = significantDifferences.length / axisDifferences.length;
    const averageEducationalValue = axisDifferences.reduce(
      (sum, axis) => sum + axis.educationalValue, 0
    ) / axisDifferences.length;

    // Combine diversity, average educational value, and complementarity
    return (diversityScore * 0.4 + averageEducationalValue * 0.4 + complementarityScore * 0.2);
  }

  /**
   * Calculate plasticity alignment between users
   */
  private calculatePlasticityAlignment(scores1: IdeologyScores, scores2: IdeologyScores): number {
    // Higher plasticity (lower certainty) indicates more openness to change
    const plasticity1 = 1 - scores1.certainty;
    const plasticity2 = 1 - scores2.certainty;
    
    // Optimal when both users have moderate to high plasticity
    const averagePlasticity = (plasticity1 + plasticity2) / 2;
    const plasticityBalance = 1 - Math.abs(plasticity1 - plasticity2);
    
    return (averagePlasticity * 0.6 + plasticityBalance * 0.4);
  }

  /**
   * Determine recommended debate style based on differences
   */
  private determineDebateStyle(
    overallDifference: number,
    complementarityScore: number,
    plasticityAlignment: number
  ): 'constructive' | 'challenging' | 'exploratory' {
    if (overallDifference < this.DIFFERENCE_THRESHOLDS.minimal) {
      return 'exploratory'; // Similar views, focus on nuanced exploration
    } else if (overallDifference > this.DIFFERENCE_THRESHOLDS.excessive) {
      return 'challenging'; // Very different, need structured challenge
    } else {
      return 'constructive'; // Optimal difference for constructive debate
    }
  }

  /**
   * Calculate confidence level in the difference calculation
   */
  private calculateConfidenceLevel(scores1: IdeologyScores, scores2: IdeologyScores): number {
    // Confidence based on certainty and consistency of both profiles
    const avgCertainty = (scores1.certainty + scores2.certainty) / 2;
    const avgConsistency = (scores1.consistency + scores2.consistency) / 2;
    
    return (avgCertainty * 0.6 + avgConsistency * 0.4);
  }

  // Helper methods for specific calculations

  private normalizeAxisDifference(difference: number, axisName: string): number {
    // Different axes may have different scales, normalize to 0-1
    const maxDifference = this.getMaxAxisDifference(axisName);
    return Math.min(difference / maxDifference, 1.0);
  }

  private getMaxAxisDifference(axisName: string): number {
    // Most axes range from -1 to 1, so max difference is 2
    // Certainty and consistency range from 0 to 1, so max difference is 1
    return ['certainty', 'consistency'].includes(axisName) ? 1.0 : 2.0;
  }

  private calculateAxisEducationalValue(difference: number, axisName: string): number {
    // Educational value peaks at moderate differences
    const normalizedDiff = this.normalizeAxisDifference(difference, axisName);
    
    if (normalizedDiff < 0.2) return 0.2; // Too similar
    if (normalizedDiff > 0.8) return 0.6; // Too different, but still valuable
    
    // Peak educational value around 0.4-0.6 difference
    return 0.8 + 0.2 * Math.sin(normalizedDiff * Math.PI);
  }

  private calculateOptimalDistanceScore(axisDifferences: AxisDifference[]): number {
    const overallDiff = this.calculateOverallDifference(axisDifferences);
    
    // Score peaks around optimal difference threshold
    if (overallDiff < this.DIFFERENCE_THRESHOLDS.minimal) {
      return 0.3; // Too similar
    } else if (overallDiff > this.DIFFERENCE_THRESHOLDS.excessive) {
      return 0.5; // Too different but still valuable
    } else {
      // Optimal range - score based on proximity to ideal
      const distanceFromOptimal = Math.abs(overallDiff - this.DIFFERENCE_THRESHOLDS.optimal);
      return 1.0 - (distanceFromOptimal / this.DIFFERENCE_THRESHOLDS.optimal);
    }
  }

  private calculatePlasticityBalance(scores1: IdeologyScores, scores2: IdeologyScores): number {
    const plasticity1 = 1 - scores1.certainty;
    const plasticity2 = 1 - scores2.certainty;
    
    // Both should have reasonable plasticity
    const minPlasticity = Math.min(plasticity1, plasticity2);
    const balance = 1 - Math.abs(plasticity1 - plasticity2);
    
    return minPlasticity * 0.7 + balance * 0.3;
  }

  private calculateCertaintyBalance(scores1: IdeologyScores, scores2: IdeologyScores): number {
    // Mix of certainty levels creates good dynamics
    const avgCertainty = (scores1.certainty + scores2.certainty) / 2;
    const certaintyDiff = Math.abs(scores1.certainty - scores2.certainty);
    
    // Moderate average certainty with some difference is ideal
    return (1 - Math.abs(avgCertainty - 0.6)) * 0.7 + Math.min(certaintyDiff, 0.5) * 0.3;
  }

  private calculateConsistencyBalance(scores1: IdeologyScores, scores2: IdeologyScores): number {
    // Both users should be reasonably consistent
    const avgConsistency = (scores1.consistency + scores2.consistency) / 2;
    return avgConsistency;
  }

  private calculateDiversityValue(axisDifferences: AxisDifference[]): number {
    // Value comes from having differences across multiple important axes
    const significantDiffs = axisDifferences.filter(
      axis => axis.normalizedDifference >= 0.3
    );
    
    const diversityRatio = significantDiffs.length / axisDifferences.length;
    const weightedDiversity = significantDiffs.reduce(
      (sum, axis) => sum + (axis.normalizedDifference * axis.weight), 0
    );
    
    return diversityRatio * 0.5 + Math.min(weightedDiversity, 1.0) * 0.5;
  }

  /**
   * Get user's ideology profile from database
   */
  private async getUserIdeologyProfile(userId: string): Promise<any> {
    try {
      const profile = await this.prismaService.profile.findUnique({
        where: { user_id: userId },
        select: {
          id: true,
          user_id: true,
          ideology_scores: true,
          is_completed: true,
          opinion_plasticity: true,
          updated_at: true
        }
      });

      if (!profile?.is_completed || !profile.ideology_scores) {
        return null;
      }

      // Parse ideology scores from JSONB
      const ideologyScores = typeof profile.ideology_scores === 'string' 
        ? JSON.parse(profile.ideology_scores)
        : profile.ideology_scores;

      return {
        profileId: profile.id,
        userId: profile.user_id,
        ideologyScores: ideologyScores as IdeologyScores,
        opinionPlasticity: profile.opinion_plasticity,
        lastUpdated: profile.updated_at
      };

    } catch (error) {
      this.logger.error(`Failed to get ideology profile for user ${userId}`, error.stack);
      return null;
    }
  }

  /**
   * Batch calculate differences for multiple user pairs
   */
  async batchCalculateIdeologicalDifferences(
    userPairs: Array<[string, string]>,
    options: DifferenceCalculationOptions = {}
  ): Promise<IdeologicalDifferenceResult[]> {
    const results: IdeologicalDifferenceResult[] = [];
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < userPairs.length; i += batchSize) {
      const batch = userPairs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(([user1Id, user2Id]) =>
        this.calculateIdeologicalDifference(user1Id, user2Id, options)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    this.logger.log(`Batch calculated ideological differences for ${userPairs.length} pairs`);
    return results;
  }
}
