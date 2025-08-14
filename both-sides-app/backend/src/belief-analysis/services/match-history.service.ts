/**
 * Match History & Cooldown Service
 * 
 * Comprehensive service for tracking match history, enforcing cooldown periods,
 * preventing repeat matches, and analyzing historical performance patterns
 * to improve future matching outcomes.
 * 
 * Phase 4 Task 4.4.1: Match History & Cooldown Logic
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';

export interface MatchHistoryEntry {
  id: string;
  userId: string;
  matchedUserId: string;
  matchId: string;
  outcome: MatchOutcome;
  topic: {
    id: string;
    title: string;
    category: string;
  };
  position: 'PRO' | 'CON';
  matchDate: Date;
  completionDate?: Date;
  duration?: number; // minutes
  qualityScore: number;
  satisfactionRating?: number;
  learningOutcome?: LearningOutcome;
  metadata: {
    challengeLevel: number;
    engagementLevel: number;
    preparationTime: number;
  };
}

export enum MatchOutcome {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_RESPONSE = 'no_response',
  EXPIRED = 'expired',
  REJECTED = 'rejected'
}

export interface LearningOutcome {
  skillsImproved: string[];
  knowledgeGained: string[];
  confidenceChange: number; // -5 to +5
  satisfactionLevel: number; // 1-10
  wouldMatchAgain: boolean;
}

export interface CooldownStatus {
  userId: string;
  isOnCooldown: boolean;
  cooldownRules: CooldownRule[];
  nextAvailableMatch: Date;
  activeRestrictions: ActiveRestriction[];
}

export interface CooldownRule {
  type: 'user_pair' | 'daily_limit' | 'weekly_limit' | 'quality_based' | 'topic_category';
  description: string;
  duration: number; // hours
  priority: number; // 1-10, higher = more restrictive
  applies: boolean;
}

export interface ActiveRestriction {
  type: string;
  description: string;
  expiresAt: Date;
  restrictedEntity: string; // user ID, topic category, etc.
}

export interface UserMatchingStats {
  userId: string;
  totalMatches: number;
  completedMatches: number;
  completionRate: number;
  averageQualityScore: number;
  averageSatisfaction: number;
  preferredTopics: TopicPreference[];
  improvementTrend: ImprovementTrend;
  performanceMetrics: PerformanceMetrics;
  recommendedActions: string[];
}

export interface TopicPreference {
  category: string;
  frequency: number;
  averageRating: number;
  lastUsed: Date;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface ImprovementTrend {
  direction: 'improving' | 'stable' | 'declining';
  rate: number; // change per match
  confidenceLevel: number; // 0-1
  keyFactors: string[];
}

export interface PerformanceMetrics {
  engagementScore: number; // 1-100
  learningVelocity: number; // skills gained per match
  consistencyScore: number; // variance in performance
  collaborationScore: number; // partner satisfaction ratings
  growthPotential: number; // predicted improvement capacity
}

export interface CooldownConfiguration {
  userPairCooldown: number; // hours between matching same users
  dailyMatchLimit: number;
  weeklyMatchLimit: number;
  qualityThreshold: number; // minimum quality score to avoid penalty
  qualityPenaltyMultiplier: number; // cooldown multiplier for poor quality matches
  topicCategoryCooldown: number; // hours before repeating topic category
  enableAdaptiveCooldowns: boolean; // adjust cooldowns based on user behavior
}

export interface HistoryAnalysisRequest {
  userId: string;
  analysisType: 'trends' | 'patterns' | 'recommendations' | 'full';
  timeframe: 'week' | 'month' | 'quarter' | 'year' | 'all';
  includeComparisons: boolean;
}

export interface HistoryAnalysisResult {
  userId: string;
  analysisType: string;
  timeframe: string;
  summary: string;
  keyFindings: string[];
  trends: AnalysisTrend[];
  patterns: AnalysisPattern[];
  recommendations: Recommendation[];
  comparativeData?: ComparativeData;
  metadata: {
    analysisDate: Date;
    dataPoints: number;
    confidenceLevel: number;
  };
}

export interface AnalysisTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  significance: 'high' | 'medium' | 'low';
  description: string;
}

export interface AnalysisPattern {
  pattern: string;
  frequency: number;
  impact: number;
  description: string;
  examples: string[];
}

export interface Recommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  rationale: string;
  expectedBenefit: string;
}

export interface ComparativeData {
  peerAverages: Record<string, number>;
  classAverages: Record<string, number>;
  percentileRanking: Record<string, number>;
  improvementOpportunities: string[];
}

@Injectable()
export class MatchHistoryService {
  private readonly logger = new Logger(MatchHistoryService.name);

  // Default cooldown configuration
  private readonly DEFAULT_COOLDOWN_CONFIG: CooldownConfiguration = {
    userPairCooldown: 336, // 14 days in hours
    dailyMatchLimit: 1,
    weeklyMatchLimit: 3,
    qualityThreshold: 60, // out of 100
    qualityPenaltyMultiplier: 1.5,
    topicCategoryCooldown: 168, // 7 days in hours
    enableAdaptiveCooldowns: true
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Record match completion with outcome and performance data
   */
  async recordMatchCompletion(
    matchId: string,
    outcome: MatchOutcome,
    completionData?: {
      satisfactionRating?: number;
      learningOutcome?: LearningOutcome;
      duration?: number;
      qualityScore?: number;
    }
  ): Promise<void> {
    try {
      this.logger.log(`Recording match completion: ${matchId} with outcome ${outcome}`);

      // Get match details
      const match = await this.prismaService.match.findUnique({
        where: { id: matchId },
        include: {
          topic: true,
          student1: true,
          student2: true
        }
      });

      if (!match) {
        throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
      }

      // Extract metadata from match
      const matchMetadata = (match.match_metadata as any) || {};
      const positionAssignment = matchMetadata.positionAssignment || {};

      // Create history entries for both users
      const historyEntries = [
        this.createHistoryEntry(match, match.student1_id, match.student2_id, 
          positionAssignment.user1Position || 'PRO', outcome, completionData),
        this.createHistoryEntry(match, match.student2_id, match.student1_id, 
          positionAssignment.user2Position || 'CON', outcome, completionData)
      ];

      // Store in database
      await Promise.all(historyEntries.map(entry => 
        this.prismaService.matchHistory.create({
          data: {
            id: entry.id,
            user_id: entry.userId,
            matched_user_id: entry.matchedUserId,
            match_id: entry.matchId,
            outcome: entry.outcome,
            satisfaction_rating: entry.satisfactionRating,
            created_at: entry.matchDate,
            completion_data: {
              topic: entry.topic,
              position: entry.position,
              duration: entry.duration,
              qualityScore: entry.qualityScore,
              learningOutcome: entry.learningOutcome,
              metadata: entry.metadata
            }
          }
        })
      ));

      // Clear relevant caches
      await this.clearUserCaches([match.student1_id, match.student2_id]);

      // Update user statistics
      await Promise.all([
        this.updateUserStats(match.student1_id),
        this.updateUserStats(match.student2_id)
      ]);

      this.logger.log(`Match completion recorded for match ${matchId}`);

    } catch (error) {
      this.logger.error(`Failed to record match completion: ${error.message}`, error.stack);
      throw new HttpException(
        `Match completion recording failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Check if user is on cooldown for new matches
   */
  async checkUserCooldown(
    userId: string,
    potentialMatchId?: string,
    classId?: string
  ): Promise<CooldownStatus> {
    try {
      this.logger.log(`Checking cooldown status for user ${userId}`);

      // Get cooldown configuration
      const config = await this.getCooldownConfiguration(classId);

      // Get user's match history
      const history = await this.getUserMatchHistory(userId, 30); // Last 30 matches

      // Evaluate all cooldown rules
      const rules = await this.evaluateCooldownRules(userId, potentialMatchId, history, config);
      const activeRestrictions = rules.filter(rule => rule.applies);

      // Calculate next available match time
      const nextAvailableMatch = this.calculateNextAvailableMatch(activeRestrictions);

      const status: CooldownStatus = {
        userId,
        isOnCooldown: activeRestrictions.length > 0,
        cooldownRules: rules,
        nextAvailableMatch,
        activeRestrictions: activeRestrictions.map(rule => ({
          type: rule.type,
          description: rule.description,
          expiresAt: new Date(Date.now() + rule.duration * 60 * 60 * 1000),
          restrictedEntity: potentialMatchId || 'general'
        }))
      };

      return status;

    } catch (error) {
      this.logger.error(`Failed to check user cooldown: ${error.message}`, error.stack);
      
      // Return safe default (allow matching)
      return {
        userId,
        isOnCooldown: false,
        cooldownRules: [],
        nextAvailableMatch: new Date(),
        activeRestrictions: []
      };
    }
  }

  /**
   * Prevent recent rematches between same users
   */
  async preventRecentRematches(
    user1Id: string,
    user2Id: string,
    daysCooldown: number = 14
  ): Promise<boolean> {
    try {
      // Check if users have matched recently
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysCooldown);

      const recentMatch = await this.prismaService.matchHistory.findFirst({
        where: {
          AND: [
            {
              OR: [
                { user_id: user1Id, matched_user_id: user2Id },
                { user_id: user2Id, matched_user_id: user1Id }
              ]
            },
            { created_at: { gte: cutoffDate } }
          ]
        }
      });

      const canMatch = !recentMatch;
      
      if (!canMatch) {
        this.logger.log(`Preventing rematch between ${user1Id} and ${user2Id} - recent match found`);
      }

      return canMatch;

    } catch (error) {
      this.logger.warn(`Failed to check recent rematches: ${error.message}`);
      return true; // Allow matching on error
    }
  }

  /**
   * Get comprehensive user matching statistics
   */
  async calculateUserMatchingStats(userId: string): Promise<UserMatchingStats> {
    try {
      this.logger.log(`Calculating matching stats for user ${userId}`);

      // Check cache first
      const cacheKey = `user_matching_stats:${userId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get user's match history
      const history = await this.getUserMatchHistory(userId);

      if (history.length === 0) {
        return this.getEmptyUserStats(userId);
      }

      // Calculate basic statistics
      const totalMatches = history.length;
      const completedMatches = history.filter(h => h.outcome === MatchOutcome.COMPLETED).length;
      const completionRate = totalMatches > 0 ? completedMatches / totalMatches : 0;

      // Calculate average scores
      const qualityScores = history.map(h => h.qualityScore).filter(s => s > 0);
      const averageQualityScore = qualityScores.length > 0 
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
        : 0;

      const satisfactionRatings = history.map(h => h.satisfactionRating).filter(r => r !== undefined && r !== null);
      const averageSatisfaction = satisfactionRatings.length > 0
        ? satisfactionRatings.reduce((sum, rating) => sum + rating, 0) / satisfactionRatings.length
        : 0;

      // Analyze topic preferences
      const preferredTopics = this.analyzeTopicPreferences(history);

      // Calculate improvement trend
      const improvementTrend = this.calculateImprovementTrend(history);

      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(history);

      // Generate recommendations
      const recommendedActions = this.generateRecommendations(history, performanceMetrics);

      const stats: UserMatchingStats = {
        userId,
        totalMatches,
        completedMatches,
        completionRate,
        averageQualityScore,
        averageSatisfaction,
        preferredTopics,
        improvementTrend,
        performanceMetrics,
        recommendedActions
      };

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, stats, 3600000);

      return stats;

    } catch (error) {
      this.logger.error(`Failed to calculate user matching stats: ${error.message}`, error.stack);
      return this.getEmptyUserStats(userId);
    }
  }

  /**
   * Analyze historical patterns and trends for a user
   */
  async analyzeUserHistory(request: HistoryAnalysisRequest): Promise<HistoryAnalysisResult> {
    try {
      this.logger.log(`Analyzing history for user ${request.userId}, type: ${request.analysisType}`);

      // Get historical data
      const history = await this.getUserMatchHistoryByTimeframe(request.userId, request.timeframe);

      if (history.length === 0) {
        return this.getEmptyAnalysisResult(request);
      }

      // Perform analysis based on type
      const trends = this.analyzeTrends(history, request.analysisType);
      const patterns = this.analyzePatterns(history, request.analysisType);
      const recommendations = this.generateAnalysisRecommendations(history, trends, patterns);

      // Get comparative data if requested
      let comparativeData: ComparativeData | undefined;
      if (request.includeComparisons) {
        comparativeData = await this.getComparativeData(request.userId, request.timeframe);
      }

      // Generate summary
      const summary = this.generateAnalysisSummary(history, trends, patterns);

      const result: HistoryAnalysisResult = {
        userId: request.userId,
        analysisType: request.analysisType,
        timeframe: request.timeframe,
        summary,
        keyFindings: this.extractKeyFindings(trends, patterns),
        trends,
        patterns,
        recommendations,
        comparativeData,
        metadata: {
          analysisDate: new Date(),
          dataPoints: history.length,
          confidenceLevel: this.calculateAnalysisConfidence(history.length)
        }
      };

      return result;

    } catch (error) {
      this.logger.error(`Failed to analyze user history: ${error.message}`, error.stack);
      throw new HttpException(
        `History analysis failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get match history for a specific user
   */
  async getUserMatchHistory(userId: string, limit: number = 100): Promise<MatchHistoryEntry[]> {
    try {
      const records = await this.prismaService.matchHistory.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit
      });

      return records.map(record => this.transformHistoryRecord(record));
    } catch (error) {
      this.logger.warn(`Failed to get user match history: ${error.message}`);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private createHistoryEntry(
    match: any,
    userId: string,
    matchedUserId: string,
    position: 'PRO' | 'CON',
    outcome: MatchOutcome,
    completionData?: any
  ): MatchHistoryEntry {
    return {
      id: `history-${match.id}-${userId}`,
      userId,
      matchedUserId,
      matchId: match.id,
      outcome,
      topic: {
        id: match.topic_id || '',
        title: match.topic?.title || 'Unknown Topic',
        category: match.topic?.category || 'Other'
      },
      position,
      matchDate: match.created_at,
      completionDate: outcome === MatchOutcome.COMPLETED ? new Date() : undefined,
      duration: completionData?.duration,
      qualityScore: completionData?.qualityScore || match.match_quality_score || 0,
      satisfactionRating: completionData?.satisfactionRating,
      learningOutcome: completionData?.learningOutcome,
      metadata: {
        challengeLevel: 5, // Would be extracted from match metadata
        engagementLevel: 7, // Would be calculated from interaction data
        preparationTime: 120 // Would come from preparation tracking
      }
    };
  }

  private async getCooldownConfiguration(classId?: string): Promise<CooldownConfiguration> {
    // In a real implementation, this could be customized per class
    return this.DEFAULT_COOLDOWN_CONFIG;
  }

  private async evaluateCooldownRules(
    userId: string,
    potentialMatchId: string | undefined,
    history: MatchHistoryEntry[],
    config: CooldownConfiguration
  ): Promise<CooldownRule[]> {
    const rules: CooldownRule[] = [];

    // User pair cooldown
    if (potentialMatchId) {
      const lastMatchWithUser = history.find(h => h.matchedUserId === potentialMatchId);
      if (lastMatchWithUser) {
        const hoursSinceMatch = (Date.now() - lastMatchWithUser.matchDate.getTime()) / (1000 * 60 * 60);
        const applies = hoursSinceMatch < config.userPairCooldown;
        
        rules.push({
          type: 'user_pair',
          description: `Cannot match with same user for ${config.userPairCooldown} hours`,
          duration: config.userPairCooldown - hoursSinceMatch,
          priority: 10,
          applies
        });
      }
    }

    // Daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMatches = history.filter(h => h.matchDate >= today).length;
    if (todayMatches >= config.dailyMatchLimit) {
      rules.push({
        type: 'daily_limit',
        description: `Daily match limit of ${config.dailyMatchLimit} reached`,
        duration: 24, // Until tomorrow
        priority: 8,
        applies: true
      });
    }

    // Weekly limit
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyMatches = history.filter(h => h.matchDate >= weekAgo).length;
    if (weeklyMatches >= config.weeklyMatchLimit) {
      rules.push({
        type: 'weekly_limit',
        description: `Weekly match limit of ${config.weeklyMatchLimit} reached`,
        duration: 168, // 7 days
        priority: 6,
        applies: true
      });
    }

    // Quality-based cooldown
    const recentMatches = history.slice(0, 3);
    const avgQuality = recentMatches.length > 0 
      ? recentMatches.reduce((sum, m) => sum + m.qualityScore, 0) / recentMatches.length 
      : 100;
    
    if (avgQuality < config.qualityThreshold) {
      const penaltyHours = config.userPairCooldown * config.qualityPenaltyMultiplier;
      rules.push({
        type: 'quality_based',
        description: `Extended cooldown due to low match quality (${avgQuality.toFixed(1)}/100)`,
        duration: penaltyHours,
        priority: 7,
        applies: true
      });
    }

    return rules;
  }

  private calculateNextAvailableMatch(activeRestrictions: CooldownRule[]): Date {
    if (activeRestrictions.length === 0) {
      return new Date();
    }

    const maxDuration = Math.max(...activeRestrictions.map(r => r.duration));
    const nextAvailable = new Date();
    nextAvailable.setHours(nextAvailable.getHours() + maxDuration);
    
    return nextAvailable;
  }

  private analyzeTopicPreferences(history: MatchHistoryEntry[]): TopicPreference[] {
    const categoryStats = new Map<string, {
      count: number;
      ratings: number[];
      lastUsed: Date;
    }>();

    // Collect statistics by category
    history.forEach(entry => {
      const category = entry.topic.category;
      const stats = categoryStats.get(category) || {
        count: 0,
        ratings: [],
        lastUsed: new Date(0)
      };

      stats.count++;
      if (entry.satisfactionRating) {
        stats.ratings.push(entry.satisfactionRating);
      }
      if (entry.matchDate > stats.lastUsed) {
        stats.lastUsed = entry.matchDate;
      }

      categoryStats.set(category, stats);
    });

    // Convert to preferences
    const preferences: TopicPreference[] = [];
    categoryStats.forEach((stats, category) => {
      const avgRating = stats.ratings.length > 0 
        ? stats.ratings.reduce((sum, r) => sum + r, 0) / stats.ratings.length 
        : 5;

      preferences.push({
        category,
        frequency: stats.count,
        averageRating: avgRating,
        lastUsed: stats.lastUsed,
        trend: this.calculateTopicTrend(category, history)
      });
    });

    return preferences.sort((a, b) => b.frequency - a.frequency);
  }

  private calculateTopicTrend(category: string, history: MatchHistoryEntry[]): 'increasing' | 'stable' | 'decreasing' {
    const categoryMatches = history.filter(h => h.topic.category === category);
    if (categoryMatches.length < 4) return 'stable';

    // Simple trend analysis: compare first and second half frequencies
    const midpoint = Math.floor(categoryMatches.length / 2);
    const firstHalf = categoryMatches.slice(0, midpoint).length;
    const secondHalf = categoryMatches.slice(midpoint).length;

    if (secondHalf > firstHalf * 1.2) return 'increasing';
    if (secondHalf < firstHalf * 0.8) return 'decreasing';
    return 'stable';
  }

  private calculateImprovementTrend(history: MatchHistoryEntry[]): ImprovementTrend {
    if (history.length < 3) {
      return {
        direction: 'stable',
        rate: 0,
        confidenceLevel: 0,
        keyFactors: []
      };
    }

    // Analyze quality score trend
    const qualityTrend = this.calculateMetricTrend(history, 'quality');
    const satisfactionTrend = this.calculateMetricTrend(history, 'satisfaction');

    // Determine overall direction
    const avgTrend = (qualityTrend + satisfactionTrend) / 2;
    let direction: 'improving' | 'stable' | 'declining';
    
    if (avgTrend > 0.1) direction = 'improving';
    else if (avgTrend < -0.1) direction = 'declining';
    else direction = 'stable';

    return {
      direction,
      rate: Math.abs(avgTrend),
      confidenceLevel: Math.min(1, history.length / 10), // More data = higher confidence
      keyFactors: this.identifyKeyFactors(history, direction)
    };
  }

  private calculateMetricTrend(history: MatchHistoryEntry[], metric: 'quality' | 'satisfaction'): number {
    const values = metric === 'quality' 
      ? history.map(h => h.qualityScore).filter(s => s > 0)
      : history.map(h => h.satisfactionRating).filter(r => r !== undefined && r !== null);

    if (values.length < 3) return 0;

    // Simple linear regression slope
    const n = values.length;
    const xSum = (n * (n + 1)) / 2;
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, index) => sum + val * (index + 1), 0);
    const xSquareSum = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xSquareSum - xSum * xSum);
    return slope;
  }

  private identifyKeyFactors(history: MatchHistoryEntry[], direction: string): string[] {
    const factors: string[] = [];

    // Analyze patterns in high-performing vs low-performing matches
    const sortedByQuality = [...history].sort((a, b) => b.qualityScore - a.qualityScore);
    const topHalf = sortedByQuality.slice(0, Math.floor(sortedByQuality.length / 2));
    const bottomHalf = sortedByQuality.slice(Math.floor(sortedByQuality.length / 2));

    // Identify patterns
    const topCategories = topHalf.map(h => h.topic.category);
    const topPositions = topHalf.map(h => h.position);

    if (direction === 'improving') {
      factors.push('Consistent engagement in debates');
      if (topCategories.filter(c => c === topCategories[0]).length > topHalf.length * 0.6) {
        factors.push(`Strong performance in ${topCategories[0]} topics`);
      }
    } else if (direction === 'declining') {
      factors.push('May need additional preparation time');
      factors.push('Consider focusing on preferred topic areas');
    }

    return factors;
  }

  private calculatePerformanceMetrics(history: MatchHistoryEntry[]): PerformanceMetrics {
    if (history.length === 0) {
      return {
        engagementScore: 50,
        learningVelocity: 0,
        consistencyScore: 50,
        collaborationScore: 50,
        growthPotential: 50
      };
    }

    // Calculate engagement score based on completion rate and participation
    const completionRate = history.filter(h => h.outcome === MatchOutcome.COMPLETED).length / history.length;
    const engagementScore = Math.round(completionRate * 100);

    // Learning velocity: improvement rate over time
    const improvementTrend = this.calculateImprovementTrend(history);
    const learningVelocity = Math.round(improvementTrend.rate * 10);

    // Consistency: inverse of performance variance
    const qualityScores = history.map(h => h.qualityScore).filter(s => s > 0);
    const avgQuality = qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length;
    const variance = qualityScores.reduce((sum, s) => sum + Math.pow(s - avgQuality, 2), 0) / qualityScores.length;
    const consistencyScore = Math.round(Math.max(0, 100 - (variance / avgQuality) * 100));

    // Collaboration score based on partner satisfaction
    const satisfactionRatings = history.map(h => h.satisfactionRating).filter(r => r !== undefined && r !== null);
    const avgSatisfaction = satisfactionRatings.length > 0 
      ? satisfactionRatings.reduce((sum, r) => sum + r, 0) / satisfactionRatings.length 
      : 5;
    const collaborationScore = Math.round((avgSatisfaction / 5) * 100);

    // Growth potential: based on trend and consistency
    const growthPotential = Math.round((improvementTrend.confidenceLevel * 50) + (consistencyScore / 2));

    return {
      engagementScore,
      learningVelocity,
      consistencyScore,
      collaborationScore,
      growthPotential
    };
  }

  private generateRecommendations(history: MatchHistoryEntry[], metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.engagementScore < 70) {
      recommendations.push('Focus on completing more debates to build consistency');
    }

    if (metrics.consistencyScore < 60) {
      recommendations.push('Work on maintaining steady performance across different topics');
    }

    if (metrics.collaborationScore < 70) {
      recommendations.push('Consider improving preparation and active listening skills');
    }

    // Analyze topic performance
    const topicPreferences = this.analyzeTopicPreferences(history);
    const bestCategory = topicPreferences[0];
    if (bestCategory && bestCategory.averageRating > 7) {
      recommendations.push(`Continue engaging with ${bestCategory.category} topics where you excel`);
    }

    if (history.length > 5 && metrics.learningVelocity < 3) {
      recommendations.push('Try more challenging topics to accelerate learning growth');
    }

    return recommendations;
  }

  private analyzeTrends(history: MatchHistoryEntry[], analysisType: string): AnalysisTrend[] {
    const trends: AnalysisTrend[] = [];

    // Quality score trend
    const qualityTrend = this.calculateMetricTrend(history, 'quality');
    trends.push({
      metric: 'Match Quality',
      direction: qualityTrend > 0.1 ? 'up' : qualityTrend < -0.1 ? 'down' : 'stable',
      magnitude: Math.abs(qualityTrend),
      significance: Math.abs(qualityTrend) > 0.5 ? 'high' : Math.abs(qualityTrend) > 0.2 ? 'medium' : 'low',
      description: `Match quality scores are ${qualityTrend > 0 ? 'improving' : qualityTrend < 0 ? 'declining' : 'stable'}`
    });

    // Participation trend
    const recentParticipation = history.slice(0, 5).filter(h => h.outcome === MatchOutcome.COMPLETED).length;
    const olderParticipation = history.slice(5, 10).filter(h => h.outcome === MatchOutcome.COMPLETED).length;
    const participationChange = recentParticipation - olderParticipation;

    trends.push({
      metric: 'Participation',
      direction: participationChange > 0 ? 'up' : participationChange < 0 ? 'down' : 'stable',
      magnitude: Math.abs(participationChange),
      significance: Math.abs(participationChange) > 2 ? 'high' : Math.abs(participationChange) > 0 ? 'medium' : 'low',
      description: `Recent participation rate is ${participationChange > 0 ? 'increasing' : participationChange < 0 ? 'decreasing' : 'stable'}`
    });

    return trends;
  }

  private analyzePatterns(history: MatchHistoryEntry[], analysisType: string): AnalysisPattern[] {
    const patterns: AnalysisPattern[] = [];

    // Topic category patterns
    const categoryFreq = new Map<string, number>();
    history.forEach(h => {
      categoryFreq.set(h.topic.category, (categoryFreq.get(h.topic.category) || 0) + 1);
    });

    const dominantCategory = Array.from(categoryFreq.entries())
      .sort(([,a], [,b]) => b - a)[0];

    if (dominantCategory && dominantCategory[1] > history.length * 0.4) {
      patterns.push({
        pattern: 'Category Preference',
        frequency: dominantCategory[1],
        impact: 7,
        description: `Strong preference for ${dominantCategory[0]} topics`,
        examples: [`${Math.round(dominantCategory[1] / history.length * 100)}% of debates in this category`]
      });
    }

    // Position patterns
    const positionFreq = new Map<string, number>();
    history.forEach(h => {
      positionFreq.set(h.position, (positionFreq.get(h.position) || 0) + 1);
    });

    const proCount = positionFreq.get('PRO') || 0;
    const conCount = positionFreq.get('CON') || 0;
    const positionRatio = proCount / (proCount + conCount);

    if (positionRatio > 0.7 || positionRatio < 0.3) {
      patterns.push({
        pattern: 'Position Bias',
        frequency: Math.max(proCount, conCount),
        impact: 5,
        description: `Tends to argue ${positionRatio > 0.5 ? 'PRO' : 'CON'} positions more frequently`,
        examples: [`${Math.round(positionRatio * 100)}% PRO positions, ${Math.round((1-positionRatio) * 100)}% CON positions`]
      });
    }

    return patterns;
  }

  private generateAnalysisRecommendations(
    history: MatchHistoryEntry[], 
    trends: AnalysisTrend[], 
    patterns: AnalysisPattern[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Based on trends
    const qualityTrend = trends.find(t => t.metric === 'Match Quality');
    if (qualityTrend && qualityTrend.direction === 'down' && qualityTrend.significance === 'high') {
      recommendations.push({
        type: 'immediate',
        priority: 'high',
        recommendation: 'Focus on preparation quality for upcoming debates',
        rationale: 'Match quality scores have been declining significantly',
        expectedBenefit: 'Improved debate performance and learning outcomes'
      });
    }

    // Based on patterns
    const categoryPattern = patterns.find(p => p.pattern === 'Category Preference');
    if (categoryPattern) {
      recommendations.push({
        type: 'short_term',
        priority: 'medium',
        recommendation: 'Explore debates in different topic categories',
        rationale: `Heavy focus on ${categoryPattern.description} may limit learning breadth`,
        expectedBenefit: 'Broader perspective and enhanced critical thinking skills'
      });
    }

    return recommendations;
  }

  private async getUserMatchHistoryByTimeframe(userId: string, timeframe: string): Promise<MatchHistoryEntry[]> {
    const cutoffDate = new Date();
    
    switch (timeframe) {
      case 'week':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
      case 'all':
      default:
        return this.getUserMatchHistory(userId);
    }

    const allHistory = await this.getUserMatchHistory(userId);
    return allHistory.filter(h => h.matchDate >= cutoffDate);
  }

  private async getComparativeData(userId: string, timeframe: string): Promise<ComparativeData> {
    // This would involve complex queries to get peer and class averages
    // For now, returning placeholder data structure
    return {
      peerAverages: {
        qualityScore: 75,
        satisfactionRating: 7.2,
        completionRate: 0.85
      },
      classAverages: {
        qualityScore: 72,
        satisfactionRating: 6.8,
        completionRate: 0.82
      },
      percentileRanking: {
        qualityScore: 65,
        satisfactionRating: 78,
        completionRate: 88
      },
      improvementOpportunities: [
        'Consider more challenging topics',
        'Work on position variety',
        'Enhance preparation consistency'
      ]
    };
  }

  private generateAnalysisSummary(
    history: MatchHistoryEntry[], 
    trends: AnalysisTrend[], 
    patterns: AnalysisPattern[]
  ): string {
    let summary = `Analysis of ${history.length} debate matches. `;

    const qualityTrend = trends.find(t => t.metric === 'Match Quality');
    if (qualityTrend) {
      summary += `Match quality is ${qualityTrend.direction === 'stable' ? 'consistent' : qualityTrend.direction}. `;
    }

    if (patterns.length > 0) {
      summary += `Key patterns identified: ${patterns.map(p => p.pattern).join(', ')}. `;
    }

    const completionRate = history.filter(h => h.outcome === MatchOutcome.COMPLETED).length / history.length;
    summary += `Overall completion rate: ${Math.round(completionRate * 100)}%.`;

    return summary;
  }

  private extractKeyFindings(trends: AnalysisTrend[], patterns: AnalysisPattern[]): string[] {
    const findings: string[] = [];

    trends.forEach(trend => {
      if (trend.significance === 'high') {
        findings.push(`${trend.metric}: ${trend.description}`);
      }
    });

    patterns.forEach(pattern => {
      if (pattern.impact >= 7) {
        findings.push(`${pattern.pattern}: ${pattern.description}`);
      }
    });

    return findings;
  }

  private calculateAnalysisConfidence(dataPoints: number): number {
    // Confidence increases with more data points, caps at 0.95
    return Math.min(0.95, 0.3 + (dataPoints * 0.05));
  }

  private transformHistoryRecord(record: any): MatchHistoryEntry {
    const completionData = record.completion_data || {};
    
    return {
      id: record.id,
      userId: record.user_id,
      matchedUserId: record.matched_user_id,
      matchId: record.match_id,
      outcome: record.outcome as MatchOutcome,
      topic: completionData.topic || { id: '', title: 'Unknown', category: 'Other' },
      position: completionData.position || 'PRO',
      matchDate: record.created_at,
      completionDate: record.updated_at,
      duration: completionData.duration,
      qualityScore: completionData.qualityScore || 0,
      satisfactionRating: record.satisfaction_rating,
      learningOutcome: completionData.learningOutcome,
      metadata: completionData.metadata || {
        challengeLevel: 5,
        engagementLevel: 7,
        preparationTime: 120
      }
    };
  }

  private getEmptyUserStats(userId: string): UserMatchingStats {
    return {
      userId,
      totalMatches: 0,
      completedMatches: 0,
      completionRate: 0,
      averageQualityScore: 0,
      averageSatisfaction: 0,
      preferredTopics: [],
      improvementTrend: {
        direction: 'stable',
        rate: 0,
        confidenceLevel: 0,
        keyFactors: []
      },
      performanceMetrics: {
        engagementScore: 50,
        learningVelocity: 0,
        consistencyScore: 50,
        collaborationScore: 50,
        growthPotential: 50
      },
      recommendedActions: ['Complete your first debate to start tracking progress']
    };
  }

  private getEmptyAnalysisResult(request: HistoryAnalysisRequest): HistoryAnalysisResult {
    return {
      userId: request.userId,
      analysisType: request.analysisType,
      timeframe: request.timeframe,
      summary: 'No debate history available for analysis',
      keyFindings: [],
      trends: [],
      patterns: [],
      recommendations: [{
        type: 'immediate',
        priority: 'high',
        recommendation: 'Participate in your first debate match',
        rationale: 'No historical data available for analysis',
        expectedBenefit: 'Begin building debate experience and skills'
      }],
      metadata: {
        analysisDate: new Date(),
        dataPoints: 0,
        confidenceLevel: 0
      }
    };
  }

  private async clearUserCaches(userIds: string[]): Promise<void> {
    const cacheKeys = userIds.flatMap(userId => [
      `user_matching_stats:${userId}`,
      `position_history:${userId}`,
      `user_topic_profile:${userId}`
    ]);

    await Promise.all(cacheKeys.map(key => 
      this.cacheService.del(key).catch(err => 
        this.logger.warn(`Failed to clear cache key ${key}: ${err.message}`)
      )
    ));
  }

  private async updateUserStats(userId: string): Promise<void> {
    try {
      // Trigger recalculation of user stats
      await this.calculateUserMatchingStats(userId);
    } catch (error) {
      this.logger.warn(`Failed to update stats for user ${userId}: ${error.message}`);
    }
  }
}
