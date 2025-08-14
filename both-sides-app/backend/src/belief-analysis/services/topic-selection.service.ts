/**
 * Topic Selection Service
 * 
 * Intelligent algorithm for selecting optimal debate topics for matched users.
 * Considers user beliefs, difficulty progression, topic freshness, and 
 * educational objectives to maximize engagement and learning outcomes.
 * 
 * Phase 4 Task 4.4.2: Topic Selection Algorithm
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { TopicsService } from '../../topics/topics.service';
import { TopicDifficultyService } from '../../topics/topic-difficulty.service';
import { IdeologicalDifferenceService } from './ideological-difference.service';

export interface TopicSelectionRequest {
  user1Id: string;
  user2Id: string;
  classId?: string;
  parameters?: TopicSelectionParameters;
}

export interface TopicSelectionParameters {
  preferredCategories?: string[];
  excludedTopics?: string[];
  difficultyRange?: [number, number]; // [min, max] difficulty levels
  prioritizeVariety?: boolean;
  prioritizeEngagement?: boolean;
  maxTopicsToEvaluate?: number;
  customWeights?: TopicScoringWeights;
}

export interface TopicScoringWeights {
  beliefRelevance: number; // 0-1, how relevant to users' beliefs
  difficultyMatch: number; // 0-1, appropriate difficulty level
  interestAlignment: number; // 0-1, aligns with user interests
  freshness: number; // 0-1, topic hasn't been used recently
  categoryBalance: number; // 0-1, balances topic categories for user
  engagement: number; // 0-1, predicted engagement level
}

export interface TopicCompatibilityScore {
  topicId: string;
  topic: any; // DebateTopic from database
  overallScore: number; // 0-100 final score
  individualScores: {
    user1Score: number;
    user2Score: number;
    pairScore: number;
  };
  scoringBreakdown: {
    beliefRelevance: number;
    difficultyMatch: number;
    interestAlignment: number;
    freshness: number;
    categoryBalance: number;
    engagement: number;
  };
  metadata: {
    ideologicalPolarization: number;
    difficultyAnalysis: DifficultyAnalysis;
    freshnessAnalysis: FreshnessAnalysis;
    engagementPrediction: EngagementPrediction;
  };
}

export interface DifficultyAnalysis {
  topicDifficulty: number;
  user1Experience: number;
  user2Experience: number;
  recommendedLevel: number;
  difficultyGap: number; // How far from ideal
}

export interface FreshnessAnalysis {
  user1RecentUsage: {
    lastUsed?: Date;
    usageCount: number;
    daysSinceLastUse?: number;
  };
  user2RecentUsage: {
    lastUsed?: Date;
    usageCount: number;
    daysSinceLastUse?: number;
  };
  globalUsage: {
    recentUsageCount: number;
    popularityScore: number;
  };
  freshnessScore: number; // 0-1
}

export interface EngagementPrediction {
  user1Engagement: number; // 0-1 predicted engagement
  user2Engagement: number;
  combinedEngagement: number;
  engagementFactors: {
    topicInterest: number;
    beliefAlignment: number;
    challengeLevel: number;
    categoryPreference: number;
  };
}

export interface TopicSelectionResult {
  selectedTopic: any; // DebateTopic
  selectionReason: string;
  confidenceLevel: number; // 0-1
  alternativeTopics: TopicCompatibilityScore[];
  selectionMetadata: {
    evaluatedTopicsCount: number;
    selectionTime: number;
    topScoreThreshold: number;
    parameters: TopicSelectionParameters;
  };
}

export interface UserTopicProfile {
  userId: string;
  ideologyScores: any;
  beliefEmbedding: number[];
  debateExperience: number;
  recentTopics: Array<{
    topicId: string;
    category: string;
    usedAt: Date;
    outcome: string;
    satisfaction: number;
  }>;
  categoryPreferences: Record<string, number>; // category -> preference score
  difficultyProgression: number; // current appropriate difficulty level
  interestProfiles: Record<string, number>; // topic interests derived from behavior
}

@Injectable()
export class TopicSelectionService {
  private readonly logger = new Logger(TopicSelectionService.name);

  // Default scoring weights
  private readonly DEFAULT_WEIGHTS: TopicScoringWeights = {
    beliefRelevance: 0.30,
    difficultyMatch: 0.25,
    interestAlignment: 0.20,
    freshness: 0.15,
    categoryBalance: 0.10,
    engagement: 0.20 // Note: Weights don't have to sum to 1, normalized later
  };

  // Freshness configuration
  private readonly FRESHNESS_CONFIG = {
    optimalDaysSinceUse: 30, // Optimal time since topic was last used
    penaltyDaysCutoff: 7, // Heavy penalty if used within this many days
    maxUsageCountPenalty: 3, // Max times a topic should be used by same user
    globalUsageFactor: 0.3 // How much global usage affects freshness
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
    private readonly topicsService: TopicsService,
    private readonly topicDifficultyService: TopicDifficultyService,
    private readonly ideologicalDifferenceService: IdeologicalDifferenceService,
  ) {}

  /**
   * Select optimal topic for a matched pair of users
   */
  async selectOptimalTopic(request: TopicSelectionRequest): Promise<TopicSelectionResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Selecting optimal topic for users ${request.user1Id} and ${request.user2Id}`);

      // Get user profiles for analysis
      const [user1Profile, user2Profile] = await Promise.all([
        this.getUserTopicProfile(request.user1Id),
        this.getUserTopicProfile(request.user2Id)
      ]);

      // Get available topics
      const availableTopics = await this.getAvailableTopics(request);

      if (availableTopics.length === 0) {
        throw new HttpException('No topics available for selection', HttpStatus.NOT_FOUND);
      }

      // Score all available topics
      const scoredTopics = await this.scoreTopics(
        availableTopics,
        user1Profile,
        user2Profile,
        request.parameters || {}
      );

      // Select the best topic
      const selectedTopic = this.selectBestTopic(scoredTopics, request.parameters || {});

      // Get alternatives (top 3 other options)
      const alternatives = scoredTopics
        .filter(t => t.topicId !== selectedTopic.topicId)
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, 3);

      // Update topic usage tracking
      await this.trackTopicSelection(selectedTopic, request);

      const result: TopicSelectionResult = {
        selectedTopic: selectedTopic.topic,
        selectionReason: this.generateSelectionReason(selectedTopic),
        confidenceLevel: this.calculateConfidenceLevel(selectedTopic, scoredTopics),
        alternativeTopics: alternatives,
        selectionMetadata: {
          evaluatedTopicsCount: availableTopics.length,
          selectionTime: Date.now() - startTime,
          topScoreThreshold: Math.max(...scoredTopics.map(t => t.overallScore)),
          parameters: request.parameters || {}
        }
      };

      this.logger.log(
        `Selected topic "${selectedTopic.topic.title}" with score ${selectedTopic.overallScore.toFixed(2)} ` +
        `from ${availableTopics.length} candidates in ${Date.now() - startTime}ms`
      );

      return result;

    } catch (error) {
      this.logger.error(`Failed to select topic: ${error.message}`, error.stack);
      throw new HttpException(
        `Topic selection failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get available topics based on request parameters and constraints
   */
  private async getAvailableTopics(request: TopicSelectionRequest): Promise<any[]> {
    const searchParams = {
      isActive: true,
      categories: request.parameters?.preferredCategories,
      excludeIds: request.parameters?.excludedTopics,
      difficultyRange: request.parameters?.difficultyRange,
      limit: request.parameters?.maxTopicsToEvaluate || 50
    };

    // Use TopicsService to get topics
    const searchResult = await this.topicsService.searchTopics(searchParams);
    return searchResult.topics;
  }

  /**
   * Score all topics for compatibility with the user pair
   */
  private async scoreTopics(
    topics: any[],
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile,
    parameters: TopicSelectionParameters
  ): Promise<TopicCompatibilityScore[]> {
    const weights = { ...this.DEFAULT_WEIGHTS, ...parameters.customWeights };
    const scoredTopics: TopicCompatibilityScore[] = [];

    for (const topic of topics) {
      const score = await this.scoreTopicForPair(topic, user1Profile, user2Profile, weights);
      scoredTopics.push(score);
    }

    return scoredTopics.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Score a single topic for a pair of users
   */
  private async scoreTopicForPair(
    topic: any,
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile,
    weights: TopicScoringWeights
  ): Promise<TopicCompatibilityScore> {
    // Calculate individual scoring components
    const beliefRelevance = await this.calculateBeliefRelevance(topic, user1Profile, user2Profile);
    const difficultyMatch = await this.calculateDifficultyMatch(topic, user1Profile, user2Profile);
    const interestAlignment = this.calculateInterestAlignment(topic, user1Profile, user2Profile);
    const freshness = await this.calculateFreshness(topic, user1Profile, user2Profile);
    const categoryBalance = this.calculateCategoryBalance(topic, user1Profile, user2Profile);
    const engagement = await this.predictEngagement(topic, user1Profile, user2Profile);

    // Calculate weighted overall score
    const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normalizedWeights = Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, v / weightSum])
    ) as TopicScoringWeights;

    const overallScore = Math.round(
      beliefRelevance * normalizedWeights.beliefRelevance * 100 +
      difficultyMatch * normalizedWeights.difficultyMatch * 100 +
      interestAlignment * normalizedWeights.interestAlignment * 100 +
      freshness * normalizedWeights.freshness * 100 +
      categoryBalance * normalizedWeights.categoryBalance * 100 +
      engagement * normalizedWeights.engagement * 100
    );

    // Calculate individual user scores
    const user1Score = Math.round(
      (beliefRelevance * 0.3 + difficultyMatch * 0.3 + interestAlignment * 0.2 + 
       freshness * 0.1 + categoryBalance * 0.1) * 100
    );
    const user2Score = Math.round(
      (beliefRelevance * 0.3 + difficultyMatch * 0.3 + interestAlignment * 0.2 + 
       freshness * 0.1 + categoryBalance * 0.1) * 100
    );
    const pairScore = Math.round(
      (beliefRelevance * 0.4 + engagement * 0.6) * 100
    );

    // Generate analysis metadata
    const difficultyAnalysis = await this.analyzeDifficulty(topic, user1Profile, user2Profile);
    const freshnessAnalysis = await this.analyzeFreshness(topic, user1Profile, user2Profile);
    const engagementPrediction = await this.analyzeEngagement(topic, user1Profile, user2Profile);

    return {
      topicId: topic.id,
      topic,
      overallScore,
      individualScores: {
        user1Score,
        user2Score,
        pairScore
      },
      scoringBreakdown: {
        beliefRelevance: Number((beliefRelevance * 100).toFixed(1)),
        difficultyMatch: Number((difficultyMatch * 100).toFixed(1)),
        interestAlignment: Number((interestAlignment * 100).toFixed(1)),
        freshness: Number((freshness * 100).toFixed(1)),
        categoryBalance: Number((categoryBalance * 100).toFixed(1)),
        engagement: Number((engagement * 100).toFixed(1))
      },
      metadata: {
        ideologicalPolarization: 0, // To be calculated by belief relevance
        difficultyAnalysis,
        freshnessAnalysis,
        engagementPrediction
      }
    };
  }

  /**
   * Calculate how relevant the topic is to users' beliefs
   */
  private async calculateBeliefRelevance(
    topic: any,
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile
  ): Promise<number> {
    try {
      // Get ideological differences between users
      const ideologicalDiff = await this.ideologicalDifferenceService.calculateIdeologicalDifference(
        user1Profile.userId, user2Profile.userId
      );

      // Map topic categories to ideology dimensions for relevance scoring
      const categoryIdeologyMapping = {
        'Politics': ['liberal_conservative', 'authoritarian_libertarian'],
        'Economics': ['liberal_conservative', 'collective_individualist'],
        'Environment': ['progressive_traditional', 'globalist_nationalist'],
        'Technology': ['progressive_traditional', 'collective_individualist'],
        'Social Issues': ['liberal_conservative', 'progressive_traditional'],
        'Ethics': ['secular_religious', 'progressive_traditional'],
        'Healthcare': ['liberal_conservative', 'collective_individualist'],
        'Education': ['progressive_traditional', 'collective_individualist']
      };

      const relevantAxes = categoryIdeologyMapping[topic.category] || ['liberal_conservative'];
      
      // Calculate average difference on relevant axes
      let relevanceSum = 0;
      let relevanceCount = 0;

      for (const axis of relevantAxes) {
        const axisDifference = ideologicalDiff.axisDifferences[axis];
        if (axisDifference !== undefined) {
          // Higher difference = more relevant for debate (more to discuss)
          // But cap it so extreme differences don't dominate
          const normalizedDiff = Math.min(axisDifference / 60, 1); // Cap at 60-point difference
          relevanceSum += normalizedDiff;
          relevanceCount++;
        }
      }

      const baseRelevance = relevanceCount > 0 ? relevanceSum / relevanceCount : 0.5;

      // Boost relevance for topics where users have meaningful but not extreme differences
      const optimalDifferenceRange = [20, 50]; // Sweet spot for productive debate
      const avgDifference = ideologicalDiff.overallDifference;
      
      let relevanceBoost = 1.0;
      if (avgDifference >= optimalDifferenceRange[0] && avgDifference <= optimalDifferenceRange[1]) {
        relevanceBoost = 1.2; // 20% boost for optimal difference range
      } else if (avgDifference > optimalDifferenceRange[1]) {
        relevanceBoost = 0.8; // Slight penalty for extreme differences
      }

      return Math.min(1.0, baseRelevance * relevanceBoost);

    } catch (error) {
      this.logger.warn(`Failed to calculate belief relevance: ${error.message}`);
      return 0.5; // Default moderate relevance
    }
  }

  /**
   * Calculate how well the topic difficulty matches user experience
   */
  private async calculateDifficultyMatch(
    topic: any,
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile
  ): Promise<number> {
    const topicDifficulty = topic.difficulty_level || 5;
    
    // Calculate ideal difficulty for each user
    const user1IdealDifficulty = this.calculateIdealDifficulty(user1Profile);
    const user2IdealDifficulty = this.calculateIdealDifficulty(user2Profile);
    const avgIdealDifficulty = (user1IdealDifficulty + user2IdealDifficulty) / 2;

    // Calculate difficulty gap
    const difficultyGap = Math.abs(topicDifficulty - avgIdealDifficulty);

    // Convert gap to match score (0 gap = perfect match = 1.0)
    const maxAcceptableGap = 2.5; // Allow some difficulty variance
    const matchScore = Math.max(0, 1 - (difficultyGap / maxAcceptableGap));

    // Slight preference for topics that challenge users appropriately
    const challengeBonus = topicDifficulty > avgIdealDifficulty ? 0.1 : 0;
    
    return Math.min(1.0, matchScore + challengeBonus);
  }

  /**
   * Calculate ideal difficulty level for a user
   */
  private calculateIdealDifficulty(userProfile: UserTopicProfile): number {
    // Base difficulty on experience
    let idealDifficulty = 3 + (userProfile.debateExperience * 0.4); // Range 3-7 for experience 0-10

    // Adjust based on progression (move gradually toward higher difficulty)
    idealDifficulty = Math.min(idealDifficulty + userProfile.difficultyProgression * 0.3, 8);

    // Adjust based on recent performance (if available)
    if (userProfile.recentTopics.length > 0) {
      const avgRecentDifficulty = userProfile.recentTopics
        .slice(0, 3) // Last 3 topics
        .reduce((sum, t) => sum + (t.satisfaction > 3 ? 1 : -0.5), 0); // Positive if satisfied

      idealDifficulty += avgRecentDifficulty * 0.2;
    }

    return Math.max(2, Math.min(9, idealDifficulty));
  }

  /**
   * Calculate interest alignment based on user preferences and behavior
   */
  private calculateInterestAlignment(
    topic: any,
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile
  ): number {
    // Get category preferences
    const user1CategoryInterest = user1Profile.categoryPreferences[topic.category] || 0.5;
    const user2CategoryInterest = user2Profile.categoryPreferences[topic.category] || 0.5;

    // Average interest level
    const avgInterest = (user1CategoryInterest + user2CategoryInterest) / 2;

    // Bonus for topics where both users have high interest
    const mutualInterestBonus = Math.min(user1CategoryInterest, user2CategoryInterest) * 0.3;

    return Math.min(1.0, avgInterest + mutualInterestBonus);
  }

  /**
   * Calculate topic freshness (penalize recently used topics)
   */
  private async calculateFreshness(
    topic: any,
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile
  ): Promise<number> {
    let freshnessScore = 1.0; // Start with perfect freshness

    // Check user1's recent usage
    const user1RecentUse = user1Profile.recentTopics.find(rt => rt.topicId === topic.id);
    if (user1RecentUse) {
      const daysSince = Math.floor((Date.now() - user1RecentUse.usedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince < this.FRESHNESS_CONFIG.penaltyDaysCutoff) {
        freshnessScore -= 0.6; // Heavy penalty for very recent use
      } else if (daysSince < this.FRESHNESS_CONFIG.optimalDaysSinceUse) {
        freshnessScore -= 0.3 * (this.FRESHNESS_CONFIG.optimalDaysSinceUse - daysSince) / this.FRESHNESS_CONFIG.optimalDaysSinceUse;
      }
    }

    // Check user2's recent usage
    const user2RecentUse = user2Profile.recentTopics.find(rt => rt.topicId === topic.id);
    if (user2RecentUse) {
      const daysSince = Math.floor((Date.now() - user2RecentUse.usedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince < this.FRESHNESS_CONFIG.penaltyDaysCutoff) {
        freshnessScore -= 0.6; // Heavy penalty for very recent use
      } else if (daysSince < this.FRESHNESS_CONFIG.optimalDaysSinceUse) {
        freshnessScore -= 0.3 * (this.FRESHNESS_CONFIG.optimalDaysSinceUse - daysSince) / this.FRESHNESS_CONFIG.optimalDaysSinceUse;
      }
    }

    // Check usage count penalties
    const user1UsageCount = user1Profile.recentTopics.filter(rt => rt.topicId === topic.id).length;
    const user2UsageCount = user2Profile.recentTopics.filter(rt => rt.topicId === topic.id).length;
    
    if (user1UsageCount >= this.FRESHNESS_CONFIG.maxUsageCountPenalty) {
      freshnessScore -= 0.4;
    }
    if (user2UsageCount >= this.FRESHNESS_CONFIG.maxUsageCountPenalty) {
      freshnessScore -= 0.4;
    }

    // TODO: Factor in global usage patterns
    // This would require additional database queries to track global topic popularity

    return Math.max(0, freshnessScore);
  }

  /**
   * Calculate category balance for user variety
   */
  private calculateCategoryBalance(
    topic: any,
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile
  ): number {
    // Check if users need more variety in this category
    const user1CategoryCount = user1Profile.recentTopics.filter(rt => rt.category === topic.category).length;
    const user2CategoryCount = user2Profile.recentTopics.filter(rt => rt.category === topic.category).length;

    const user1RecentTotal = user1Profile.recentTopics.length;
    const user2RecentTotal = user2Profile.recentTopics.length;

    // Calculate category ratios
    const user1Ratio = user1RecentTotal > 0 ? user1CategoryCount / user1RecentTotal : 0;
    const user2Ratio = user2RecentTotal > 0 ? user2CategoryCount / user2RecentTotal : 0;

    // Ideal ratio is around 0.15-0.25 for good variety (assuming 4-7 categories)
    const idealRatio = 0.20;
    
    const user1Balance = 1 - Math.abs(user1Ratio - idealRatio) / idealRatio;
    const user2Balance = 1 - Math.abs(user2Ratio - idealRatio) / idealRatio;

    // Average balance, with bonus for categories both users need
    const avgBalance = (user1Balance + user2Balance) / 2;
    const needsVarietyBonus = (user1Ratio < idealRatio && user2Ratio < idealRatio) ? 0.2 : 0;

    return Math.max(0, Math.min(1.0, avgBalance + needsVarietyBonus));
  }

  /**
   * Predict engagement level for this topic
   */
  private async predictEngagement(
    topic: any,
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile
  ): Promise<number> {
    // Base engagement on interest alignment
    const interestScore = this.calculateInterestAlignment(topic, user1Profile, user2Profile);
    
    // Factor in belief relevance (more relevant = more engaging)
    const beliefRelevanceScore = await this.calculateBeliefRelevance(topic, user1Profile, user2Profile);
    
    // Factor in appropriate difficulty (not too easy, not too hard)
    const difficultyScore = await this.calculateDifficultyMatch(topic, user1Profile, user2Profile);
    
    // Weighted combination
    const engagement = (
      interestScore * 0.4 +
      beliefRelevanceScore * 0.4 +
      difficultyScore * 0.2
    );

    return Math.min(1.0, engagement);
  }

  /**
   * Get comprehensive topic profile for a user
   */
  private async getUserTopicProfile(userId: string): Promise<UserTopicProfile> {
    try {
      const cacheKey = `user_topic_profile:${userId}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get user profile with belief data
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            include: {
              belief_profile: true
            }
          }
        }
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get recent topics from matches
      const recentMatches = await this.prismaService.match.findMany({
        where: {
          OR: [
            { student1_id: userId },
            { student2_id: userId }
          ],
          status: 'COMPLETED',
          topic_id: { not: null }
        },
        include: {
          topic: true
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 15 // Last 15 topics for analysis
      });

      const recentTopics = recentMatches.map(match => ({
        topicId: match.topic_id || '',
        category: match.topic?.category || 'Other',
        usedAt: match.created_at,
        outcome: 'completed', // Could be enhanced with actual outcome
        satisfaction: 4 // Default satisfaction - could be enhanced with actual ratings
      }));

      // Calculate category preferences based on usage and satisfaction
      const categoryPreferences: Record<string, number> = {};
      const categoryUsage = recentTopics.reduce((acc, topic) => {
        acc[topic.category] = (acc[topic.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Set preferences based on usage patterns and satisfaction
      Object.entries(categoryUsage).forEach(([category, count]) => {
        // Base preference on usage frequency and satisfaction
        const avgSatisfaction = recentTopics
          .filter(t => t.category === category)
          .reduce((sum, t) => sum + t.satisfaction, 0) / count;
        
        categoryPreferences[category] = Math.min(1.0, (avgSatisfaction / 5) * (count / recentTopics.length));
      });

      // Calculate debate experience (simplified)
      const debateExperience = Math.min(10, recentMatches.length * 0.5);

      // Calculate difficulty progression
      const difficultyProgression = this.calculateDifficultyProgression(recentTopics, debateExperience);

      const profile: UserTopicProfile = {
        userId,
        ideologyScores: user.profile?.belief_profile?.ideology_scores || {},
        beliefEmbedding: user.profile?.belief_profile?.belief_embedding || [],
        debateExperience,
        recentTopics,
        categoryPreferences,
        difficultyProgression,
        interestProfiles: categoryPreferences // Simplified - could be more sophisticated
      };

      // Cache for 2 hours
      await this.cacheService.set(cacheKey, profile, 7200000);
      
      return profile;

    } catch (error) {
      this.logger.warn(`Failed to get user topic profile for ${userId}: ${error.message}`);
      
      // Return minimal profile
      return {
        userId,
        ideologyScores: {},
        beliefEmbedding: [],
        debateExperience: 0,
        recentTopics: [],
        categoryPreferences: {},
        difficultyProgression: 0,
        interestProfiles: {}
      };
    }
  }

  /**
   * Calculate difficulty progression rate for user
   */
  private calculateDifficultyProgression(recentTopics: any[], debateExperience: number): number {
    // Base progression on experience
    let progression = debateExperience * 0.1;

    // Adjust based on recent performance (if satisfaction data available)
    if (recentTopics.length >= 3) {
      const recentSatisfaction = recentTopics.slice(0, 3).reduce((sum, t) => sum + t.satisfaction, 0) / 3;
      if (recentSatisfaction > 4) {
        progression += 0.5; // Ready for more challenge
      } else if (recentSatisfaction < 3) {
        progression -= 0.3; // Need to consolidate current level
      }
    }

    return Math.max(0, Math.min(2, progression));
  }

  /**
   * Select the best topic from scored options
   */
  private selectBestTopic(
    scoredTopics: TopicCompatibilityScore[],
    parameters: TopicSelectionParameters
  ): TopicCompatibilityScore {
    if (scoredTopics.length === 0) {
      throw new Error('No topics available to select from');
    }

    // Default to highest scoring topic
    let selectedTopic = scoredTopics[0];

    // Apply selection strategies if requested
    if (parameters.prioritizeEngagement) {
      // Find topic with highest engagement prediction
      const engagementSorted = [...scoredTopics].sort((a, b) => 
        b.scoringBreakdown.engagement - a.scoringBreakdown.engagement
      );
      selectedTopic = engagementSorted[0];
    } else if (parameters.prioritizeVariety) {
      // Find topic that best addresses variety needs
      const varietySorted = [...scoredTopics].sort((a, b) => 
        b.scoringBreakdown.categoryBalance - a.scoringBreakdown.categoryBalance
      );
      selectedTopic = varietySorted[0];
    }

    // Ensure minimum quality threshold
    const minQualityThreshold = 30; // Minimum acceptable overall score
    if (selectedTopic.overallScore < minQualityThreshold) {
      this.logger.warn(`Selected topic has low quality score: ${selectedTopic.overallScore}`);
    }

    return selectedTopic;
  }

  /**
   * Generate human-readable selection reason
   */
  private generateSelectionReason(selectedTopic: TopicCompatibilityScore): string {
    const breakdown = selectedTopic.scoringBreakdown;
    const strongestFactors = Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([factor, score]) => ({ factor, score }));

    let reason = `Selected for optimal learning value (${selectedTopic.overallScore}/100). `;

    if (strongestFactors[0].score > 75) {
      const factorName = strongestFactors[0].factor.replace(/([A-Z])/g, ' $1').toLowerCase();
      reason += `Strong ${factorName} match. `;
    }

    if (breakdown.beliefRelevance > 70) {
      reason += 'High relevance to users\' belief differences. ';
    }

    if (breakdown.difficultyMatch > 80) {
      reason += 'Appropriate challenge level for both users. ';
    }

    if (breakdown.freshness > 80) {
      reason += 'Fresh topic for variety. ';
    }

    return reason.trim();
  }

  /**
   * Calculate confidence level in the selection
   */
  private calculateConfidenceLevel(
    selectedTopic: TopicCompatibilityScore,
    allTopics: TopicCompatibilityScore[]
  ): number {
    let confidence = selectedTopic.overallScore / 100; // Base confidence on score

    // Higher confidence if significantly better than alternatives
    if (allTopics.length > 1) {
      const secondBest = allTopics[1];
      const scoreGap = selectedTopic.overallScore - secondBest.overallScore;
      if (scoreGap > 20) {
        confidence += 0.2; // Clear winner
      } else if (scoreGap < 5) {
        confidence -= 0.1; // Close competition
      }
    }

    // Lower confidence if any scoring component is very low
    const minComponentScore = Math.min(...Object.values(selectedTopic.scoringBreakdown));
    if (minComponentScore < 30) {
      confidence -= 0.2;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Track topic selection for analytics and future improvement
   */
  private async trackTopicSelection(
    selectedTopic: TopicCompatibilityScore,
    request: TopicSelectionRequest
  ): Promise<void> {
    try {
      // Log selection for analytics
      const trackingData = {
        topicId: selectedTopic.topicId,
        user1Id: request.user1Id,
        user2Id: request.user2Id,
        overallScore: selectedTopic.overallScore,
        scoringBreakdown: selectedTopic.scoringBreakdown,
        timestamp: new Date().toISOString(),
        parameters: request.parameters
      };

      const trackingKey = `topic_selection:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      await this.cacheService.set(trackingKey, trackingData, 86400000 * 7); // Keep for 7 days

    } catch (error) {
      this.logger.warn(`Failed to track topic selection: ${error.message}`);
    }
  }

  /**
   * Get detailed analysis for debugging/optimization
   */
  private async analyzeDifficulty(
    topic: any,
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile
  ): Promise<DifficultyAnalysis> {
    const topicDifficulty = topic.difficulty_level || 5;
    const user1Experience = user1Profile.debateExperience;
    const user2Experience = user2Profile.debateExperience;
    const user1Ideal = this.calculateIdealDifficulty(user1Profile);
    const user2Ideal = this.calculateIdealDifficulty(user2Profile);
    const recommendedLevel = (user1Ideal + user2Ideal) / 2;
    const difficultyGap = Math.abs(topicDifficulty - recommendedLevel);

    return {
      topicDifficulty,
      user1Experience,
      user2Experience,
      recommendedLevel: Number(recommendedLevel.toFixed(1)),
      difficultyGap: Number(difficultyGap.toFixed(1))
    };
  }

  /**
   * Get detailed freshness analysis
   */
  private async analyzeFreshness(
    topic: any,
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile
  ): Promise<FreshnessAnalysis> {
    const user1Usage = user1Profile.recentTopics.filter(rt => rt.topicId === topic.id);
    const user2Usage = user2Profile.recentTopics.filter(rt => rt.topicId === topic.id);

    const user1LastUsed = user1Usage.length > 0 ? user1Usage[0].usedAt : undefined;
    const user2LastUsed = user2Usage.length > 0 ? user2Usage[0].usedAt : undefined;

    const user1RecentUsage = {
      lastUsed: user1LastUsed,
      usageCount: user1Usage.length,
      daysSinceLastUse: user1LastUsed ? Math.floor((Date.now() - user1LastUsed.getTime()) / (1000 * 60 * 60 * 24)) : undefined
    };

    const user2RecentUsage = {
      lastUsed: user2LastUsed,
      usageCount: user2Usage.length,
      daysSinceLastUse: user2LastUsed ? Math.floor((Date.now() - user2LastUsed.getTime()) / (1000 * 60 * 60 * 24)) : undefined
    };

    const freshnessScore = await this.calculateFreshness(topic, user1Profile, user2Profile);

    return {
      user1RecentUsage,
      user2RecentUsage,
      globalUsage: {
        recentUsageCount: 0, // TODO: Implement global usage tracking
        popularityScore: 0
      },
      freshnessScore: Number(freshnessScore.toFixed(2))
    };
  }

  /**
   * Get detailed engagement analysis
   */
  private async analyzeEngagement(
    topic: any,
    user1Profile: UserTopicProfile,
    user2Profile: UserTopicProfile
  ): Promise<EngagementPrediction> {
    const user1CategoryInterest = user1Profile.categoryPreferences[topic.category] || 0.5;
    const user2CategoryInterest = user2Profile.categoryPreferences[topic.category] || 0.5;
    
    const user1Engagement = user1CategoryInterest;
    const user2Engagement = user2CategoryInterest;
    const combinedEngagement = await this.predictEngagement(topic, user1Profile, user2Profile);

    return {
      user1Engagement: Number(user1Engagement.toFixed(2)),
      user2Engagement: Number(user2Engagement.toFixed(2)),
      combinedEngagement: Number(combinedEngagement.toFixed(2)),
      engagementFactors: {
        topicInterest: Number(((user1CategoryInterest + user2CategoryInterest) / 2).toFixed(2)),
        beliefAlignment: Number((await this.calculateBeliefRelevance(topic, user1Profile, user2Profile)).toFixed(2)),
        challengeLevel: Number((await this.calculateDifficultyMatch(topic, user1Profile, user2Profile)).toFixed(2)),
        categoryPreference: Number(((user1CategoryInterest + user2CategoryInterest) / 2).toFixed(2))
      }
    };
  }
}
