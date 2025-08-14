/**
 * Match Quality Service
 * 
 * Service for calculating comprehensive match quality scores and ranking potential matches.
 * Combines ideological differences, constraints, plasticity, and other factors to determine
 * the educational value and success probability of user pairings for debates.
 * 
 * Phase 4 Task 4.2.3: Match Quality Scoring & Ranking
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { IdeologicalDifferenceService, IdeologicalDifferenceResult } from './ideological-difference.service';
import { MatchingConstraintsService, ConstraintValidationResult } from './matching-constraints.service';
import { VectorSimilarityService } from './vector-similarity.service';

export interface MatchQualityFactors {
  ideologicalComplementarity: number; // 0-100, from ideological difference analysis
  plasticityAlignment: number;        // 0-100, openness to learning compatibility  
  experienceBalance: number;          // 0-100, debate experience level compatibility
  personalityCompatibility: number;   // 0-100, personality traits compatibility
  topicRelevance: number;            // 0-100, relevance to both users' interests
  historicalPerformance: number;      // 0-100, past success in similar pairings
}

export interface MatchQualityResult {
  user1Id: string;
  user2Id: string;
  overallQualityScore: number;        // 0-100 final weighted score
  qualityFactors: MatchQualityFactors;
  constraintValidation: ConstraintValidationResult;
  ideologicalAnalysis: IdeologicalDifferenceResult;
  predictedSuccess: PredictionResult;
  educationalValue: number;           // 0-100 learning potential
  engagementPrediction: number;       // 0-100 user engagement likelihood
  metadata: {
    calculatedAt: Date;
    algorithmVersion: string;
    confidence: number;
  };
}

export interface RankedMatch {
  matchQuality: MatchQualityResult;
  rank: number;
  relativeScore: number; // Score relative to best match in set (0-100)
}

export interface PredictionResult {
  successProbability: number;         // 0-100, likelihood of successful debate
  completionProbability: number;     // 0-100, likelihood of finishing debate
  satisfactionPrediction: number;    // 0-100, predicted user satisfaction
  learningOutcomePrediction: number; // 0-100, predicted learning achievement
  confidenceLevel: number;           // 0-100, confidence in predictions
}

export interface MatchingParameters {
  classId?: string;
  topicId?: string;
  emphasizeEducationalValue?: boolean;
  prioritizeComplementarity?: boolean;
  minimumQualityThreshold?: number;
  maxResults?: number;
  customWeights?: Partial<QualityWeights>;
}

export interface QualityWeights {
  ideologicalComplementarity: number; // Default: 0.35
  plasticityAlignment: number;        // Default: 0.20
  experienceBalance: number;          // Default: 0.15
  personalityCompatibility: number;   // Default: 0.15
  topicRelevance: number;            // Default: 0.10
  historicalPerformance: number;      // Default: 0.05
}

export interface UserMatchingProfile {
  userId: string;
  profileId: string;
  debateExperience: number;
  personalityTraits: any;
  topicInterests: string[];
  pastPerformance: HistoricalPerformance;
  availability: any;
}

export interface HistoricalPerformance {
  totalMatches: number;
  completedMatches: number;
  averageSatisfaction: number;
  averageEngagement: number;
  improvementTrend: number;
  preferredMatchTypes: string[];
}

@Injectable()
export class MatchQualityService {
  private readonly logger = new Logger(MatchQualityService.name);
  
  // Default quality factor weights based on educational research
  private readonly DEFAULT_WEIGHTS: QualityWeights = {
    ideologicalComplementarity: 0.35, // Highest weight - core educational value
    plasticityAlignment: 0.20,        // High weight - learning readiness  
    experienceBalance: 0.15,          // Medium weight - skill compatibility
    personalityCompatibility: 0.15,   // Medium weight - interaction quality
    topicRelevance: 0.10,            // Lower weight - engagement factor
    historicalPerformance: 0.05       // Lowest weight - past success indicator
  };

  // Quality thresholds for different outcomes
  private readonly QUALITY_THRESHOLDS = {
    excellent: 85,    // Top-tier matches
    good: 70,         // Recommended matches  
    acceptable: 55,   // Viable but not ideal
    poor: 40,         // Generally not recommended
    unacceptable: 25  // Should be avoided
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
    private readonly ideologicalDifferenceService: IdeologicalDifferenceService,
    private readonly matchingConstraintsService: MatchingConstraintsService,
    private readonly vectorSimilarityService: VectorSimilarityService,
  ) {}

  /**
   * Calculate comprehensive match quality score between two users
   */
  async calculateMatchQuality(
    user1Id: string,
    user2Id: string,
    parameters: MatchingParameters = {}
  ): Promise<MatchQualityResult> {
    try {
      this.logger.log(`Calculating match quality between users ${user1Id} and ${user2Id}`);

      // Get effective weights
      const weights = { ...this.DEFAULT_WEIGHTS, ...parameters.customWeights };

      // Run comprehensive analysis
      const [
        constraintValidation,
        ideologicalAnalysis,
        user1Profile,
        user2Profile
      ] = await Promise.all([
        this.matchingConstraintsService.validateMatchingConstraints(user1Id, user2Id, parameters.classId),
        this.ideologicalDifferenceService.calculateIdeologicalDifference(user1Id, user2Id),
        this.getUserMatchingProfile(user1Id),
        this.getUserMatchingProfile(user2Id)
      ]);

      // If constraints are not met, return early with low quality score
      if (!constraintValidation.isEligible) {
        return this.createConstraintFailedResult(user1Id, user2Id, constraintValidation, ideologicalAnalysis);
      }

      // Calculate individual quality factors
      const qualityFactors = await this.calculateQualityFactors(
        user1Profile,
        user2Profile,
        ideologicalAnalysis,
        parameters
      );

      // Calculate weighted overall quality score
      const overallQualityScore = this.calculateOverallScore(qualityFactors, weights);

      // Generate predictions
      const predictedSuccess = this.predictMatchSuccess(qualityFactors, overallQualityScore, ideologicalAnalysis);

      // Calculate educational value and engagement
      const educationalValue = this.calculateEducationalValue(qualityFactors, ideologicalAnalysis);
      const engagementPrediction = this.predictEngagement(qualityFactors, user1Profile, user2Profile);

      const result: MatchQualityResult = {
        user1Id,
        user2Id,
        overallQualityScore,
        qualityFactors,
        constraintValidation,
        ideologicalAnalysis,
        predictedSuccess,
        educationalValue,
        engagementPrediction,
        metadata: {
          calculatedAt: new Date(),
          algorithmVersion: '1.0.0',
          confidence: this.calculateConfidence(qualityFactors, constraintValidation, ideologicalAnalysis)
        }
      };

      this.logger.log(
        `Match quality calculated: score=${overallQualityScore.toFixed(1)}, ` +
        `education=${educationalValue.toFixed(1)}, success=${predictedSuccess.successProbability.toFixed(1)}`
      );

      return result;

    } catch (error) {
      this.logger.error(`Failed to calculate match quality between ${user1Id} and ${user2Id}`, error.stack);
      throw new HttpException(
        'Failed to calculate match quality',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Calculate individual quality factors
   */
  private async calculateQualityFactors(
    user1Profile: UserMatchingProfile,
    user2Profile: UserMatchingProfile,
    ideologicalAnalysis: IdeologicalDifferenceResult,
    parameters: MatchingParameters
  ): Promise<MatchQualityFactors> {

    const [
      ideologicalComplementarity,
      plasticityAlignment,
      experienceBalance,
      personalityCompatibility,
      topicRelevance,
      historicalPerformance
    ] = await Promise.all([
      this.calculateIdeologicalComplementarity(ideologicalAnalysis),
      this.calculatePlasticityAlignment(user1Profile, user2Profile),
      this.calculateExperienceBalance(user1Profile, user2Profile),
      this.calculatePersonalityCompatibility(user1Profile, user2Profile),
      this.calculateTopicRelevance(user1Profile, user2Profile, parameters.topicId),
      this.calculateHistoricalPerformance(user1Profile, user2Profile)
    ]);

    return {
      ideologicalComplementarity,
      plasticityAlignment,
      experienceBalance,
      personalityCompatibility,
      topicRelevance,
      historicalPerformance
    };
  }

  /**
   * Calculate ideological complementarity score
   */
  private async calculateIdeologicalComplementarity(
    ideologicalAnalysis: IdeologicalDifferenceResult
  ): Promise<number> {
    // Convert complementarity score (0-1) to percentage (0-100)
    const baseScore = ideologicalAnalysis.complementarityScore * 100;
    
    // Boost score for optimal educational value
    const educationalBonus = ideologicalAnalysis.educationalValue * 10;
    
    return Math.min(100, baseScore + educationalBonus);
  }

  /**
   * Calculate plasticity alignment score
   */
  private async calculatePlasticityAlignment(
    user1Profile: UserMatchingProfile,
    user2Profile: UserMatchingProfile
  ): Promise<number> {
    // Use the plasticity alignment from ideological analysis
    // This is already calculated in the ideological difference service
    return 75; // Placeholder - would integrate with actual plasticity data
  }

  /**
   * Calculate experience balance score
   */
  private async calculateExperienceBalance(
    user1Profile: UserMatchingProfile,
    user2Profile: UserMatchingProfile
  ): Promise<number> {
    const exp1 = user1Profile.debateExperience || 0;
    const exp2 = user2Profile.debateExperience || 0;
    
    const avgExperience = (exp1 + exp2) / 2;
    const experienceDiff = Math.abs(exp1 - exp2);
    
    // Best balance: both moderately experienced with small difference
    const balanceScore = Math.max(0, 100 - (experienceDiff * 10));
    const experienceScore = Math.min(avgExperience * 10, 50);
    
    return (balanceScore * 0.6 + experienceScore * 0.4);
  }

  /**
   * Calculate personality compatibility score
   */
  private async calculatePersonalityCompatibility(
    user1Profile: UserMatchingProfile,
    user2Profile: UserMatchingProfile
  ): Promise<number> {
    // Placeholder for personality compatibility analysis
    // Would integrate with personality trait analysis from profiles
    return 70; // Default moderate compatibility
  }

  /**
   * Calculate topic relevance score
   */
  private async calculateTopicRelevance(
    user1Profile: UserMatchingProfile,
    user2Profile: UserMatchingProfile,
    topicId?: string
  ): Promise<number> {
    if (!topicId) {
      return 75; // Default relevance when no specific topic
    }

    try {
      // Get topic details
      const topic = await this.prismaService.debateTopic.findUnique({
        where: { id: topicId },
        select: {
          category: true,
          difficulty_level: true,
          title: true
        }
      });

      if (!topic) return 50;

      // Check if topic category matches user interests
      const user1Interest = user1Profile.topicInterests.includes(topic.category) ? 50 : 25;
      const user2Interest = user2Profile.topicInterests.includes(topic.category) ? 50 : 25;
      
      return user1Interest + user2Interest;

    } catch (error) {
      this.logger.error('Failed to calculate topic relevance', error.stack);
      return 60; // Default moderate relevance
    }
  }

  /**
   * Calculate historical performance compatibility
   */
  private async calculateHistoricalPerformance(
    user1Profile: UserMatchingProfile,
    user2Profile: UserMatchingProfile
  ): Promise<number> {
    const perf1 = user1Profile.pastPerformance;
    const perf2 = user2Profile.pastPerformance;
    
    // Factor in completion rates, satisfaction, and improvement trends
    const avgCompletion = (perf1.completedMatches / Math.max(perf1.totalMatches, 1) + 
                          perf2.completedMatches / Math.max(perf2.totalMatches, 1)) / 2;
    
    const avgSatisfaction = (perf1.averageSatisfaction + perf2.averageSatisfaction) / 2;
    const avgImprovement = (perf1.improvementTrend + perf2.improvementTrend) / 2;
    
    return (avgCompletion * 40 + avgSatisfaction * 40 + avgImprovement * 20);
  }

  /**
   * Calculate weighted overall quality score
   */
  private calculateOverallScore(factors: MatchQualityFactors, weights: QualityWeights): number {
    const weightedSum = 
      factors.ideologicalComplementarity * weights.ideologicalComplementarity +
      factors.plasticityAlignment * weights.plasticityAlignment +
      factors.experienceBalance * weights.experienceBalance +
      factors.personalityCompatibility * weights.personalityCompatibility +
      factors.topicRelevance * weights.topicRelevance +
      factors.historicalPerformance * weights.historicalPerformance;

    return Math.max(0, Math.min(100, weightedSum));
  }

  /**
   * Predict match success probability
   */
  private predictMatchSuccess(
    factors: MatchQualityFactors,
    overallScore: number,
    ideologicalAnalysis: IdeologicalDifferenceResult
  ): PredictionResult {
    
    // Success probability based on overall score with adjustments
    let successProbability = overallScore;
    
    // Adjust based on ideological difference style
    if (ideologicalAnalysis.recommendedDebateStyle === 'challenging') {
      successProbability *= 0.9; // Slightly lower success rate for challenging matches
    } else if (ideologicalAnalysis.recommendedDebateStyle === 'exploratory') {
      successProbability *= 0.95; // Slightly lower for exploratory (less engaging)
    }

    // Completion probability (typically higher than satisfaction)
    const completionProbability = Math.min(100, successProbability + 10);

    // Satisfaction prediction based on complementarity and engagement factors
    const satisfactionPrediction = (
      factors.ideologicalComplementarity * 0.4 +
      factors.personalityCompatibility * 0.3 +
      factors.experienceBalance * 0.2 +
      factors.topicRelevance * 0.1
    );

    // Learning outcome prediction
    const learningOutcomePrediction = (
      factors.ideologicalComplementarity * 0.5 +
      factors.plasticityAlignment * 0.3 +
      ideologicalAnalysis.educationalValue * 100 * 0.2
    );

    // Confidence based on data quality and consistency
    const confidenceLevel = Math.min(100,
      ideologicalAnalysis.metadata.confidenceLevel * 100 * 0.6 +
      (factors.historicalPerformance > 0 ? 30 : 10) + // More confident with historical data
      20 // Base confidence
    );

    return {
      successProbability: Math.max(0, Math.min(100, successProbability)),
      completionProbability: Math.max(0, Math.min(100, completionProbability)),
      satisfactionPrediction: Math.max(0, Math.min(100, satisfactionPrediction)),
      learningOutcomePrediction: Math.max(0, Math.min(100, learningOutcomePrediction)),
      confidenceLevel: Math.max(0, Math.min(100, confidenceLevel))
    };
  }

  /**
   * Calculate educational value
   */
  private calculateEducationalValue(
    factors: MatchQualityFactors,
    ideologicalAnalysis: IdeologicalDifferenceResult
  ): number {
    // Educational value comes from complementarity, plasticity, and ideological analysis
    return (
      factors.ideologicalComplementarity * 0.4 +
      factors.plasticityAlignment * 0.3 +
      ideologicalAnalysis.educationalValue * 100 * 0.3
    );
  }

  /**
   * Predict user engagement
   */
  private predictEngagement(
    factors: MatchQualityFactors,
    user1Profile: UserMatchingProfile,
    user2Profile: UserMatchingProfile
  ): number {
    // Engagement prediction based on topic relevance, personality compatibility, and experience
    const baseEngagement = (
      factors.topicRelevance * 0.4 +
      factors.personalityCompatibility * 0.3 +
      factors.experienceBalance * 0.3
    );

    // Boost for users with good historical engagement
    const historicalBonus = (
      user1Profile.pastPerformance.averageEngagement +
      user2Profile.pastPerformance.averageEngagement
    ) / 2 * 0.2;

    return Math.min(100, baseEngagement + historicalBonus);
  }

  /**
   * Calculate confidence in the quality assessment
   */
  private calculateConfidence(
    factors: MatchQualityFactors,
    constraints: ConstraintValidationResult,
    ideological: IdeologicalDifferenceResult
  ): number {
    const factorConfidence = Object.values(factors).reduce((sum, val) => sum + (val > 0 ? 1 : 0), 0) / 6 * 50;
    const constraintConfidence = constraints.overallScore * 0.3;
    const ideologicalConfidence = ideological.metadata.confidenceLevel * 100 * 0.2;
    
    return Math.min(100, factorConfidence + constraintConfidence + ideologicalConfidence);
  }

  /**
   * Create result for constraint-failed matches
   */
  private createConstraintFailedResult(
    user1Id: string,
    user2Id: string,
    constraintValidation: ConstraintValidationResult,
    ideologicalAnalysis: IdeologicalDifferenceResult
  ): MatchQualityResult {
    return {
      user1Id,
      user2Id,
      overallQualityScore: Math.min(25, constraintValidation.overallScore), // Very low score
      qualityFactors: {
        ideologicalComplementarity: 0,
        plasticityAlignment: 0,
        experienceBalance: 0,
        personalityCompatibility: 0,
        topicRelevance: 0,
        historicalPerformance: 0
      },
      constraintValidation,
      ideologicalAnalysis,
      predictedSuccess: {
        successProbability: 10,
        completionProbability: 20,
        satisfactionPrediction: 15,
        learningOutcomePrediction: 10,
        confidenceLevel: 90 // High confidence in failure prediction
      },
      educationalValue: 0,
      engagementPrediction: 10,
      metadata: {
        calculatedAt: new Date(),
        algorithmVersion: '1.0.0',
        confidence: 90 // High confidence that this won't work
      }
    };
  }

  /**
   * Rank and sort potential matches by quality
   */
  async rankPotentialMatches(
    targetUserId: string,
    candidateUserIds: string[],
    parameters: MatchingParameters = {}
  ): Promise<RankedMatch[]> {
    try {
      this.logger.log(`Ranking ${candidateUserIds.length} potential matches for user ${targetUserId}`);

      // Calculate quality for all candidates
      const qualityResults = await Promise.all(
        candidateUserIds.map(candidateId => 
          this.calculateMatchQuality(targetUserId, candidateId, parameters)
        )
      );

      // Filter by minimum quality threshold if specified
      const threshold = parameters.minimumQualityThreshold || 0;
      const qualifiedResults = qualityResults.filter(result => 
        result.overallQualityScore >= threshold && result.constraintValidation.isEligible
      );

      // Sort by quality score (descending)
      qualifiedResults.sort((a, b) => b.overallQualityScore - a.overallQualityScore);

      // Create ranked matches
      const rankedMatches: RankedMatch[] = qualifiedResults.map((matchQuality, index) => {
        const bestScore = qualifiedResults[0]?.overallQualityScore || 100;
        const relativeScore = bestScore > 0 ? (matchQuality.overallQualityScore / bestScore) * 100 : 0;

        return {
          matchQuality,
          rank: index + 1,
          relativeScore
        };
      });

      // Apply max results limit if specified
      const maxResults = parameters.maxResults || rankedMatches.length;
      const finalResults = rankedMatches.slice(0, maxResults);

      this.logger.log(
        `Ranked matches: ${finalResults.length} qualified out of ${candidateUserIds.length} candidates. ` +
        `Top score: ${finalResults[0]?.matchQuality.overallQualityScore.toFixed(1) || 0}`
      );

      return finalResults;

    } catch (error) {
      this.logger.error(`Failed to rank potential matches for user ${targetUserId}`, error.stack);
      throw new HttpException(
        'Failed to rank potential matches',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user's matching profile data
   */
  private async getUserMatchingProfile(userId: string): Promise<UserMatchingProfile> {
    try {
      const profile = await this.prismaService.profile.findUnique({
        where: { user_id: userId },
        select: {
          id: true,
          user_id: true,
          ideology_scores: true,
          opinion_plasticity: true,
          is_completed: true,
          completion_percentage: true,
          created_at: true
        }
      });

      if (!profile) {
        throw new Error(`Profile not found for user ${userId}`);
      }

      // Calculate debate experience (placeholder - would come from match history)
      const debateExperience = await this.calculateDebateExperience(userId);
      
      // Get past performance (placeholder - would aggregate from match history)
      const pastPerformance = await this.getPastPerformance(userId);

      return {
        userId,
        profileId: profile.id,
        debateExperience,
        personalityTraits: {}, // Placeholder for personality analysis
        topicInterests: ['politics', 'economics', 'social'], // Placeholder
        pastPerformance,
        availability: {} // Placeholder for availability data
      };

    } catch (error) {
      this.logger.error(`Failed to get matching profile for user ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate user's debate experience level
   */
  private async calculateDebateExperience(userId: string): Promise<number> {
    try {
      const matchCount = await this.prismaService.match.count({
        where: {
          OR: [
            { student1_id: userId },
            { student2_id: userId }
          ],
          status: 'COMPLETED'
        }
      });

      // Experience on 0-10 scale based on completed matches
      return Math.min(10, matchCount * 0.5);

    } catch (error) {
      this.logger.error(`Failed to calculate debate experience for user ${userId}`, error.stack);
      return 0;
    }
  }

  /**
   * Get user's past performance metrics
   */
  private async getPastPerformance(userId: string): Promise<HistoricalPerformance> {
    try {
      const matches = await this.prismaService.match.findMany({
        where: {
          OR: [
            { student1_id: userId },
            { student2_id: userId }
          ]
        },
        select: {
          status: true,
          created_at: true,
          match_history: {
            select: {
              satisfaction_rating: true,
              outcome: true
            }
          }
        }
      });

      const totalMatches = matches.length;
      const completedMatches = matches.filter(m => m.status === 'COMPLETED').length;
      
      // Calculate average satisfaction from match history
      const satisfactionRatings = matches
        .flatMap(m => m.match_history.map(h => h.satisfaction_rating))
        .filter(rating => rating !== null) as number[];
      
      const averageSatisfaction = satisfactionRatings.length > 0 
        ? satisfactionRatings.reduce((sum, rating) => sum + rating, 0) / satisfactionRatings.length * 20 // Convert 1-5 to 0-100
        : 50;

      return {
        totalMatches,
        completedMatches,
        averageSatisfaction,
        averageEngagement: 70, // Placeholder
        improvementTrend: 0,   // Placeholder
        preferredMatchTypes: ['constructive'] // Placeholder
      };

    } catch (error) {
      this.logger.error(`Failed to get past performance for user ${userId}`, error.stack);
      return {
        totalMatches: 0,
        completedMatches: 0,
        averageSatisfaction: 50,
        averageEngagement: 50,
        improvementTrend: 0,
        preferredMatchTypes: []
      };
    }
  }

  /**
   * Validate quality scoring algorithm accuracy
   */
  async validateQualityPredictions(
    completedMatches: Array<{
      user1Id: string;
      user2Id: string;
      actualOutcome: any;
      qualityPrediction: MatchQualityResult;
    }>
  ): Promise<{
    accuracy: number;
    correlations: { [key: string]: number };
    improvements: string[];
  }> {
    // Placeholder for quality prediction validation
    // Would compare predicted vs actual outcomes
    this.logger.log(`Validating quality predictions for ${completedMatches.length} completed matches`);
    
    return {
      accuracy: 75, // Placeholder accuracy percentage
      correlations: {
        'success_prediction': 0.7,
        'satisfaction_prediction': 0.65,
        'completion_prediction': 0.8
      },
      improvements: [
        'Increase weight of historical performance factor',
        'Improve personality compatibility assessment',
        'Integrate more detailed topic preference data'
      ]
    };
  }
}
