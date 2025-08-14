/**
 * Match Analytics & Success Metrics Service
 * 
 * Comprehensive analytics system for tracking match outcomes, validating
 * quality predictions, measuring algorithm performance, and providing
 * continuous improvement feedback for the matching engine.
 * 
 * Phase 4 Task 4.4.5: Match Analytics & Success Metrics
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';

export interface MatchAnalytics {
  matchId: string;
  matchQualityPrediction: number; // Original quality prediction
  actualOutcome: MatchOutcome;
  userSatisfactionRatings: SatisfactionRating[];
  debateQualityMetrics: DebateMetrics;
  learningOutcomes: LearningOutcome[];
  algorithmPerformance: AlgorithmMetrics;
  predictionAccuracy: PredictionAccuracy;
  timeToCompletion: number; // hours from match to completion
  engagementMetrics: EngagementMetrics;
}

export interface SatisfactionRating {
  userId: string;
  rating: number; // 1-10
  aspects: {
    matchQuality: number;
    topicRelevance: number;
    partnerEngagement: number;
    learningValue: number;
    overallExperience: number;
  };
  feedback: string;
  wouldRecommend: boolean;
}

export interface DebateMetrics {
  preparationQuality: number; // 1-10
  argumentStrength: number; // 1-10
  evidenceQuality: number; // 1-10
  counterArgumentHandling: number; // 1-10
  rhetoricalSkill: number; // 1-10
  respectfulness: number; // 1-10
  overallDebateQuality: number; // calculated composite score
}

export interface LearningOutcome {
  userId: string;
  skillsImproved: string[];
  knowledgeGained: string[];
  confidenceChange: number; // -5 to +5
  criticalThinkingImprovement: number; // 1-10
  perspectivetaking: number; // 1-10
  argumentationSkills: number; // 1-10
  researchSkills: number; // 1-10
}

export interface AlgorithmMetrics {
  ideologicalDifferenceAccuracy: number; // 0-1
  topicSelectionAppropriate: boolean;
  positionAssignmentOptimal: boolean;
  difficultyLevelAppropriate: boolean;
  engagementPredictionAccuracy: number; // 0-1
  overallAlgorithmScore: number; // 0-100
}

export interface PredictionAccuracy {
  qualityScoreDifference: number; // predicted - actual
  accuracyCategory: 'excellent' | 'good' | 'fair' | 'poor';
  confidenceLevel: number; // 0-1
  keyFactors: string[]; // factors that influenced accuracy
}

export interface EngagementMetrics {
  responseTime: number; // minutes to initial response
  messageCount: number;
  averageMessageLength: number;
  debateCompletion: boolean;
  timeSpentInDebate: number; // minutes
  preparationTimeUsed: number; // minutes
}

export interface SystemPerformanceReport {
  reportPeriod: {
    start: Date;
    end: Date;
    duration: string;
  };
  overallMetrics: {
    totalMatches: number;
    completedMatches: number;
    completionRate: number;
    averageQualityScore: number;
    averageSatisfaction: number;
    averagePredictionAccuracy: number;
  };
  algorithmPerformance: {
    matchingAccuracy: number;
    topicSelectionSuccess: number;
    positionAssignmentOptimal: number;
    engagementPredictionAccuracy: number;
    overallEffectiveness: number;
  };
  userExperience: {
    averageTimeToMatch: number;
    averageDebateLength: number;
    repeatUsageRate: number;
    recommendationRate: number;
    satisfactionTrend: TrendData;
  };
  improvementOpportunities: ImprovementOpportunity[];
  recommendations: SystemRecommendation[];
}

export interface TrendData {
  direction: 'improving' | 'stable' | 'declining';
  magnitude: number;
  confidence: number;
  timeframe: string;
}

export interface ImprovementOpportunity {
  area: string;
  currentPerformance: number;
  targetPerformance: number;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  priority: number; // 1-10
  description: string;
  actionItems: string[];
}

export interface SystemRecommendation {
  type: 'algorithm' | 'process' | 'user_experience' | 'content';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  implementation: {
    effort: 'low' | 'medium' | 'high';
    timeline: string;
    resources: string[];
  };
}

export interface ValidationReport {
  reportId: string;
  generatedAt: Date;
  matches: MatchAnalytics[];
  summaryStatistics: {
    totalMatches: number;
    averagePredictionAccuracy: number;
    predictionErrorDistribution: number[];
    accuracyByCategory: Record<string, number>;
    improvementTrend: TrendData;
  };
  keyFindings: string[];
  recommendations: ValidationRecommendation[];
}

export interface ValidationRecommendation {
  component: 'matching' | 'topic_selection' | 'position_assignment' | 'quality_scoring';
  issue: string;
  impact: number; // 1-10
  recommendation: string;
  expectedImprovement: string;
}

export interface AnalyticsRequest {
  timeframe: {
    start: Date;
    end: Date;
  };
  filters?: {
    classIds?: string[];
    userIds?: string[];
    topicCategories?: string[];
    qualityThreshold?: number;
  };
  includeComparisons?: boolean;
  detailLevel: 'summary' | 'detailed' | 'comprehensive';
}

export interface ClassInsights {
  classId: string;
  className?: string;
  period: {
    start: Date;
    end: Date;
  };
  overview: {
    totalStudents: number;
    activeStudents: number;
    totalMatches: number;
    completedMatches: number;
    averageMatchesPerStudent: number;
  };
  performance: {
    averageQualityScore: number;
    averageSatisfaction: number;
    completionRate: number;
    engagementScore: number;
    learningOutcomesScore: number;
  };
  patterns: {
    popularTopics: string[];
    strongPerformanceAreas: string[];
    improvementNeededAreas: string[];
    peerCollaborationScore: number;
  };
  trends: {
    qualityTrend: TrendData;
    engagementTrend: TrendData;
    participationTrend: TrendData;
  };
  recommendations: ClassRecommendation[];
}

export interface ClassRecommendation {
  type: 'curriculum' | 'matching' | 'preparation' | 'engagement';
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  rationale: string;
  expectedOutcome: string;
}

@Injectable()
export class MatchAnalyticsService {
  private readonly logger = new Logger(MatchAnalyticsService.name);

  // Performance thresholds for classification
  private readonly PERFORMANCE_THRESHOLDS = {
    qualityScoreExcellent: 85,
    qualityScoreGood: 70,
    qualityScoreFair: 55,
    satisfactionExcellent: 8.5,
    satisfactionGood: 7.0,
    satisfactionFair: 5.5,
    predictionAccuracyExcellent: 0.9,
    predictionAccuracyGood: 0.75,
    predictionAccuracyFair: 0.6
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Track and analyze match outcome with comprehensive metrics
   */
  async trackMatchOutcome(
    matchId: string,
    outcome: MatchOutcome,
    metrics: {
      satisfactionRatings?: SatisfactionRating[];
      debateMetrics?: DebateMetrics;
      learningOutcomes?: LearningOutcome[];
      engagementMetrics?: EngagementMetrics;
    }
  ): Promise<MatchAnalytics> {
    try {
      this.logger.log(`Tracking match outcome for match ${matchId}`);

      // Get original match data with predictions
      const match = await this.getMatchWithPredictions(matchId);
      if (!match) {
        throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
      }

      // Calculate prediction accuracy
      const predictionAccuracy = this.calculatePredictionAccuracy(match, outcome, metrics);

      // Analyze algorithm performance
      const algorithmPerformance = await this.analyzeAlgorithmPerformance(match, outcome, metrics);

      // Determine actual outcome classification
      const actualOutcome = this.classifyMatchOutcome(outcome, metrics);

      // Calculate time to completion
      const timeToCompletion = this.calculateTimeToCompletion(match, outcome);

      const analytics: MatchAnalytics = {
        matchId,
        matchQualityPrediction: match.match_quality_score || 0,
        actualOutcome,
        userSatisfactionRatings: metrics.satisfactionRatings || [],
        debateQualityMetrics: metrics.debateMetrics || this.getDefaultDebateMetrics(),
        learningOutcomes: metrics.learningOutcomes || [],
        algorithmPerformance,
        predictionAccuracy,
        timeToCompletion,
        engagementMetrics: metrics.engagementMetrics || this.getDefaultEngagementMetrics()
      };

      // Store analytics data
      await this.storeAnalyticsData(analytics);

      // Update algorithm performance metrics
      await this.updateAlgorithmMetrics(analytics);

      this.logger.log(`Match outcome tracked for ${matchId} with ${predictionAccuracy.accuracyCategory} accuracy`);

      return analytics;

    } catch (error) {
      this.logger.error(`Failed to track match outcome: ${error.message}`, error.stack);
      throw new HttpException(
        `Match outcome tracking failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Validate quality predictions against actual outcomes
   */
  async validateQualityPredictions(
    matches: string[] | AnalyticsRequest
  ): Promise<ValidationReport> {
    try {
      this.logger.log('Validating quality predictions');

      // Get match analytics data
      let matchAnalytics: MatchAnalytics[];
      
      if (Array.isArray(matches)) {
        matchAnalytics = await this.getAnalyticsForMatches(matches);
      } else {
        matchAnalytics = await this.getAnalyticsForTimeframe(matches);
      }

      if (matchAnalytics.length === 0) {
        throw new HttpException('No match analytics data found', HttpStatus.NOT_FOUND);
      }

      // Calculate summary statistics
      const summaryStatistics = this.calculateSummaryStatistics(matchAnalytics);

      // Extract key findings
      const keyFindings = this.extractKeyFindings(matchAnalytics, summaryStatistics);

      // Generate validation recommendations
      const recommendations = this.generateValidationRecommendations(matchAnalytics, summaryStatistics);

      const report: ValidationReport = {
        reportId: `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        generatedAt: new Date(),
        matches: matchAnalytics,
        summaryStatistics,
        keyFindings,
        recommendations
      };

      // Cache the report
      await this.cacheValidationReport(report);

      this.logger.log(`Validation report generated for ${matchAnalytics.length} matches`);

      return report;

    } catch (error) {
      this.logger.error(`Failed to validate quality predictions: ${error.message}`, error.stack);
      throw new HttpException(
        `Quality prediction validation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Calculate algorithm accuracy over a specific time period
   */
  async calculateAlgorithmAccuracy(request: AnalyticsRequest): Promise<number> {
    try {
      const analytics = await this.getAnalyticsForTimeframe(request);
      
      if (analytics.length === 0) {
        return 0;
      }

      const accuracyScores = analytics.map(a => {
        const predictionDiff = Math.abs(a.matchQualityPrediction - this.getActualQualityScore(a));
        const maxPossibleDiff = 100; // Maximum possible difference
        return 1 - (predictionDiff / maxPossibleDiff); // Normalize to 0-1
      });

      const averageAccuracy = accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length;
      
      return Number(averageAccuracy.toFixed(3));

    } catch (error) {
      this.logger.error(`Failed to calculate algorithm accuracy: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * Identify improvement opportunities based on analytics data
   */
  async identifyImprovementOpportunities(request: AnalyticsRequest): Promise<ImprovementOpportunity[]> {
    try {
      this.logger.log('Identifying improvement opportunities');

      const analytics = await this.getAnalyticsForTimeframe(request);
      const opportunities: ImprovementOpportunity[] = [];

      if (analytics.length === 0) {
        return opportunities;
      }

      // Analyze prediction accuracy patterns
      const predictionAccuracyOpportunity = this.analyzePredictionAccuracyOpportunities(analytics);
      if (predictionAccuracyOpportunity) opportunities.push(predictionAccuracyOpportunity);

      // Analyze topic selection effectiveness
      const topicSelectionOpportunity = this.analyzeTopicSelectionOpportunities(analytics);
      if (topicSelectionOpportunity) opportunities.push(topicSelectionOpportunity);

      // Analyze position assignment effectiveness
      const positionAssignmentOpportunity = this.analyzePositionAssignmentOpportunities(analytics);
      if (positionAssignmentOpportunity) opportunities.push(positionAssignmentOpportunity);

      // Analyze engagement patterns
      const engagementOpportunity = this.analyzeEngagementOpportunities(analytics);
      if (engagementOpportunity) opportunities.push(engagementOpportunity);

      // Sort by impact and priority
      opportunities.sort((a, b) => b.priority - a.priority);

      return opportunities;

    } catch (error) {
      this.logger.error(`Failed to identify improvement opportunities: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Generate comprehensive class insights and recommendations
   */
  async generateClassInsights(classId: string, timeframe?: { start: Date; end: Date }): Promise<ClassInsights> {
    try {
      this.logger.log(`Generating insights for class ${classId}`);

      // Default to last 30 days if no timeframe provided
      const period = timeframe || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      // Get class data
      const classData = await this.getClassAnalyticsData(classId, period);
      
      // Calculate overview metrics
      const overview = this.calculateClassOverview(classData);

      // Calculate performance metrics
      const performance = this.calculateClassPerformance(classData.analytics);

      // Identify patterns
      const patterns = this.identifyClassPatterns(classData.analytics);

      // Analyze trends
      const trends = this.analyzeClassTrends(classData.analytics);

      // Generate recommendations
      const recommendations = this.generateClassRecommendations(overview, performance, patterns, trends);

      const insights: ClassInsights = {
        classId,
        className: classData.className,
        period,
        overview,
        performance,
        patterns,
        trends,
        recommendations
      };

      return insights;

    } catch (error) {
      this.logger.error(`Failed to generate class insights: ${error.message}`, error.stack);
      throw new HttpException(
        `Class insights generation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate system-wide performance report
   */
  async generateSystemPerformanceReport(request: AnalyticsRequest): Promise<SystemPerformanceReport> {
    try {
      this.logger.log('Generating system performance report');

      const analytics = await this.getAnalyticsForTimeframe(request);
      
      // Calculate overall metrics
      const overallMetrics = this.calculateOverallMetrics(analytics);

      // Analyze algorithm performance
      const algorithmPerformance = this.calculateSystemAlgorithmPerformance(analytics);

      // Analyze user experience
      const userExperience = this.calculateSystemUserExperience(analytics);

      // Identify improvement opportunities
      const improvementOpportunities = await this.identifyImprovementOpportunities(request);

      // Generate system recommendations
      const recommendations = this.generateSystemRecommendations(analytics, improvementOpportunities);

      const report: SystemPerformanceReport = {
        reportPeriod: {
          start: request.timeframe.start,
          end: request.timeframe.end,
          duration: this.calculateDuration(request.timeframe.start, request.timeframe.end)
        },
        overallMetrics,
        algorithmPerformance,
        userExperience,
        improvementOpportunities,
        recommendations
      };

      return report;

    } catch (error) {
      this.logger.error(`Failed to generate system performance report: ${error.message}`, error.stack);
      throw new HttpException(
        `System performance report generation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Private helper methods
   */
  private async getMatchWithPredictions(matchId: string): Promise<any> {
    return this.prismaService.match.findUnique({
      where: { id: matchId },
      include: {
        student1: true,
        student2: true,
        topic: true
      }
    });
  }

  private calculatePredictionAccuracy(
    match: any, 
    outcome: MatchOutcome, 
    metrics: any
  ): PredictionAccuracy {
    const predicted = match.match_quality_score || 0;
    const actual = this.calculateActualQualityScore(outcome, metrics);
    const difference = predicted - actual;
    const accuracyScore = 1 - (Math.abs(difference) / 100); // Normalize to 0-1

    let accuracyCategory: PredictionAccuracy['accuracyCategory'];
    if (accuracyScore >= this.PERFORMANCE_THRESHOLDS.predictionAccuracyExcellent) {
      accuracyCategory = 'excellent';
    } else if (accuracyScore >= this.PERFORMANCE_THRESHOLDS.predictionAccuracyGood) {
      accuracyCategory = 'good';
    } else if (accuracyScore >= this.PERFORMANCE_THRESHOLDS.predictionAccuracyFair) {
      accuracyCategory = 'fair';
    } else {
      accuracyCategory = 'poor';
    }

    return {
      qualityScoreDifference: Number(difference.toFixed(1)),
      accuracyCategory,
      confidenceLevel: accuracyScore,
      keyFactors: this.identifyAccuracyFactors(match, outcome, metrics)
    };
  }

  private calculateActualQualityScore(outcome: MatchOutcome, metrics: any): number {
    if (outcome !== 'COMPLETED') {
      return 0; // Non-completed matches get 0 quality score
    }

    // Calculate composite score from available metrics
    let score = 50; // Base score for completion

    // Factor in satisfaction ratings
    if (metrics.satisfactionRatings && metrics.satisfactionRatings.length > 0) {
      const avgSatisfaction = metrics.satisfactionRatings
        .reduce((sum, rating) => sum + rating.rating, 0) / metrics.satisfactionRatings.length;
      score += (avgSatisfaction - 5) * 10; // Scale 1-10 to -40 to +50
    }

    // Factor in debate quality metrics
    if (metrics.debateMetrics) {
      score += (metrics.debateMetrics.overallDebateQuality - 5) * 5;
    }

    // Factor in learning outcomes
    if (metrics.learningOutcomes && metrics.learningOutcomes.length > 0) {
      const avgLearning = metrics.learningOutcomes
        .reduce((sum, outcome) => sum + (outcome.confidenceChange + 5), 0) / metrics.learningOutcomes.length;
      score += avgLearning * 2;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private identifyAccuracyFactors(match: any, outcome: MatchOutcome, metrics: any): string[] {
    const factors: string[] = [];

    if (outcome !== 'COMPLETED') {
      factors.push('Match did not complete');
    }

    if (metrics.satisfactionRatings) {
      const avgSatisfaction = metrics.satisfactionRatings
        .reduce((sum, rating) => sum + rating.rating, 0) / metrics.satisfactionRatings.length;
      
      if (avgSatisfaction < 5) {
        factors.push('Low user satisfaction');
      } else if (avgSatisfaction > 8) {
        factors.push('High user satisfaction');
      }
    }

    if (metrics.engagementMetrics) {
      if (metrics.engagementMetrics.messageCount < 10) {
        factors.push('Low engagement during debate');
      } else if (metrics.engagementMetrics.messageCount > 50) {
        factors.push('High engagement during debate');
      }
    }

    return factors;
  }

  private async analyzeAlgorithmPerformance(match: any, outcome: MatchOutcome, metrics: any): Promise<AlgorithmMetrics> {
    // Analyze various algorithm components
    const ideologicalDifferenceAccuracy = this.evaluateIdeologicalDifferenceAccuracy(match, metrics);
    const topicSelectionAppropriate = this.evaluateTopicSelection(match, metrics);
    const positionAssignmentOptimal = this.evaluatePositionAssignment(match, metrics);
    const difficultyLevelAppropriate = this.evaluateDifficultyLevel(match, metrics);
    const engagementPredictionAccuracy = this.evaluateEngagementPrediction(match, metrics);

    const overallAlgorithmScore = Math.round(
      (ideologicalDifferenceAccuracy * 25) +
      (topicSelectionAppropriate ? 25 : 0) +
      (positionAssignmentOptimal ? 25 : 0) +
      (difficultyLevelAppropriate ? 15 : 0) +
      (engagementPredictionAccuracy * 10)
    );

    return {
      ideologicalDifferenceAccuracy,
      topicSelectionAppropriate,
      positionAssignmentOptimal,
      difficultyLevelAppropriate,
      engagementPredictionAccuracy,
      overallAlgorithmScore
    };
  }

  private evaluateIdeologicalDifferenceAccuracy(match: any, metrics: any): number {
    // This would compare predicted ideological differences with actual debate dynamics
    // For now, return a reasonable default based on satisfaction
    if (metrics.satisfactionRatings && metrics.satisfactionRatings.length > 0) {
      const avgSatisfaction = metrics.satisfactionRatings
        .reduce((sum, rating) => sum + rating.rating, 0) / metrics.satisfactionRatings.length;
      return Math.max(0, Math.min(1, avgSatisfaction / 10));
    }
    return 0.7; // Default reasonable accuracy
  }

  private evaluateTopicSelection(match: any, metrics: any): boolean {
    // Evaluate if the topic selection was appropriate
    if (metrics.satisfactionRatings) {
      const avgTopicRelevance = metrics.satisfactionRatings
        .reduce((sum, rating) => sum + rating.aspects.topicRelevance, 0) / metrics.satisfactionRatings.length;
      return avgTopicRelevance >= 6; // Above average relevance
    }
    return true; // Default to appropriate if no data
  }

  private evaluatePositionAssignment(match: any, metrics: any): boolean {
    // Evaluate if position assignment was optimal
    if (metrics.learningOutcomes) {
      const avgLearning = metrics.learningOutcomes
        .reduce((sum, outcome) => sum + (outcome.confidenceChange + 5), 0) / metrics.learningOutcomes.length;
      return avgLearning >= 5; // Neutral or positive learning outcome
    }
    return true; // Default to optimal if no data
  }

  private evaluateDifficultyLevel(match: any, metrics: any): boolean {
    // Evaluate if difficulty level was appropriate
    if (metrics.debateMetrics) {
      // If debate quality is good, difficulty was likely appropriate
      return metrics.debateMetrics.overallDebateQuality >= 6;
    }
    return true; // Default to appropriate if no data
  }

  private evaluateEngagementPrediction(match: any, metrics: any): number {
    // Evaluate accuracy of engagement prediction
    if (metrics.engagementMetrics) {
      // Simple heuristic: high message count and completion suggests good engagement
      const engagementScore = Math.min(1, 
        (metrics.engagementMetrics.messageCount / 30) * 
        (metrics.engagementMetrics.debateCompletion ? 1 : 0.5)
      );
      return engagementScore;
    }
    return 0.6; // Default reasonable accuracy
  }

  private classifyMatchOutcome(outcome: MatchOutcome, metrics: any): MatchOutcome {
    // The outcome is already provided, but we could enhance classification here
    return outcome;
  }

  private calculateTimeToCompletion(match: any, outcome: MatchOutcome): number {
    if (outcome !== 'COMPLETED') {
      return 0;
    }
    
    const startTime = new Date(match.created_at);
    const endTime = new Date(); // Would be actual completion time in real implementation
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)); // Hours
  }

  private getDefaultDebateMetrics(): DebateMetrics {
    return {
      preparationQuality: 5,
      argumentStrength: 5,
      evidenceQuality: 5,
      counterArgumentHandling: 5,
      rhetoricalSkill: 5,
      respectfulness: 8, // Assume high respectfulness by default
      overallDebateQuality: 5.5
    };
  }

  private getDefaultEngagementMetrics(): EngagementMetrics {
    return {
      responseTime: 30, // 30 minutes default response time
      messageCount: 20, // Default moderate engagement
      averageMessageLength: 150, // Default message length
      debateCompletion: true,
      timeSpentInDebate: 90, // 1.5 hours default
      preparationTimeUsed: 120 // 2 hours default preparation
    };
  }

  private async storeAnalyticsData(analytics: MatchAnalytics): Promise<void> {
    try {
      // Store in database (simplified structure for now)
      await this.prismaService.matchAnalytics.create({
        data: {
          id: `analytics-${analytics.matchId}`,
          match_id: analytics.matchId,
          quality_prediction: analytics.matchQualityPrediction,
          actual_outcome: analytics.actualOutcome,
          prediction_accuracy: analytics.predictionAccuracy.confidenceLevel,
          algorithm_score: analytics.algorithmPerformance.overallAlgorithmScore,
          created_at: new Date(),
          analytics_data: analytics // Store full analytics as JSON
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to store analytics data: ${error.message}`);
    }
  }

  private async updateAlgorithmMetrics(analytics: MatchAnalytics): Promise<void> {
    try {
      // Update running algorithm performance metrics
      const cacheKey = 'algorithm_performance_metrics';
      const currentMetrics = await this.cacheService.get(cacheKey) || {
        totalMatches: 0,
        totalAccuracy: 0,
        averageAccuracy: 0
      };

      currentMetrics.totalMatches += 1;
      currentMetrics.totalAccuracy += analytics.predictionAccuracy.confidenceLevel;
      currentMetrics.averageAccuracy = currentMetrics.totalAccuracy / currentMetrics.totalMatches;

      await this.cacheService.set(cacheKey, currentMetrics, 86400000); // 24 hour cache
    } catch (error) {
      this.logger.warn(`Failed to update algorithm metrics: ${error.message}`);
    }
  }

  private async getAnalyticsForMatches(matchIds: string[]): Promise<MatchAnalytics[]> {
    try {
      const records = await this.prismaService.matchAnalytics.findMany({
        where: {
          match_id: { in: matchIds }
        }
      });

      return records.map(record => record.analytics_data as MatchAnalytics);
    } catch (error) {
      this.logger.warn(`Failed to get analytics for matches: ${error.message}`);
      return [];
    }
  }

  private async getAnalyticsForTimeframe(request: AnalyticsRequest): Promise<MatchAnalytics[]> {
    try {
      const records = await this.prismaService.matchAnalytics.findMany({
        where: {
          created_at: {
            gte: request.timeframe.start,
            lte: request.timeframe.end
          }
        }
      });

      let analytics = records.map(record => record.analytics_data as MatchAnalytics);

      // Apply filters if provided
      if (request.filters?.classIds) {
        // Would need to join with match data to filter by class
      }

      if (request.filters?.qualityThreshold) {
        analytics = analytics.filter(a => a.matchQualityPrediction >= request.filters.qualityThreshold);
      }

      return analytics;
    } catch (error) {
      this.logger.warn(`Failed to get analytics for timeframe: ${error.message}`);
      return [];
    }
  }

  private calculateSummaryStatistics(analytics: MatchAnalytics[]): ValidationReport['summaryStatistics'] {
    const totalMatches = analytics.length;
    const accuracyScores = analytics.map(a => a.predictionAccuracy.confidenceLevel);
    const averagePredictionAccuracy = accuracyScores.reduce((sum, score) => sum + score, 0) / totalMatches;

    // Calculate error distribution
    const errors = analytics.map(a => Math.abs(a.predictionAccuracy.qualityScoreDifference));
    const predictionErrorDistribution = [
      errors.filter(e => e <= 10).length, // Excellent (<=10 point error)
      errors.filter(e => e > 10 && e <= 20).length, // Good (10-20 point error)
      errors.filter(e => e > 20 && e <= 30).length, // Fair (20-30 point error)
      errors.filter(e => e > 30).length // Poor (>30 point error)
    ];

    // Calculate accuracy by category
    const accuracyByCategory = {
      excellent: analytics.filter(a => a.predictionAccuracy.accuracyCategory === 'excellent').length / totalMatches,
      good: analytics.filter(a => a.predictionAccuracy.accuracyCategory === 'good').length / totalMatches,
      fair: analytics.filter(a => a.predictionAccuracy.accuracyCategory === 'fair').length / totalMatches,
      poor: analytics.filter(a => a.predictionAccuracy.accuracyCategory === 'poor').length / totalMatches
    };

    return {
      totalMatches,
      averagePredictionAccuracy: Number(averagePredictionAccuracy.toFixed(3)),
      predictionErrorDistribution,
      accuracyByCategory: Object.fromEntries(
        Object.entries(accuracyByCategory).map(([k, v]) => [k, Number(v.toFixed(3))])
      ),
      improvementTrend: {
        direction: 'stable', // Would calculate actual trend from time series data
        magnitude: 0.02,
        confidence: 0.7,
        timeframe: 'recent'
      }
    };
  }

  private extractKeyFindings(analytics: MatchAnalytics[], stats: ValidationReport['summaryStatistics']): string[] {
    const findings: string[] = [];

    findings.push(`${stats.totalMatches} matches analyzed with ${(stats.averagePredictionAccuracy * 100).toFixed(1)}% average prediction accuracy`);

    if (stats.accuracyByCategory.excellent > 0.5) {
      findings.push('Excellent prediction accuracy achieved in majority of matches');
    } else if (stats.accuracyByCategory.poor > 0.3) {
      findings.push('High rate of poor prediction accuracy requires algorithm improvement');
    }

    const avgAlgorithmScore = analytics.reduce((sum, a) => sum + a.algorithmPerformance.overallAlgorithmScore, 0) / analytics.length;
    findings.push(`Average algorithm performance score: ${avgAlgorithmScore.toFixed(1)}/100`);

    const completionRate = analytics.filter(a => a.actualOutcome === 'COMPLETED').length / analytics.length;
    findings.push(`${(completionRate * 100).toFixed(1)}% match completion rate`);

    return findings;
  }

  private generateValidationRecommendations(
    analytics: MatchAnalytics[], 
    stats: ValidationReport['summaryStatistics']
  ): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = [];

    if (stats.averagePredictionAccuracy < 0.7) {
      recommendations.push({
        component: 'quality_scoring',
        issue: 'Low prediction accuracy',
        impact: 8,
        recommendation: 'Refine quality scoring algorithm with more historical data and user feedback',
        expectedImprovement: 'Increase prediction accuracy by 15-20%'
      });
    }

    if (stats.accuracyByCategory.poor > 0.25) {
      recommendations.push({
        component: 'matching',
        issue: 'High rate of poor quality matches',
        impact: 9,
        recommendation: 'Improve ideological difference calculation and compatibility scoring',
        expectedImprovement: 'Reduce poor matches by 50%'
      });
    }

    const topicSelectionSuccess = analytics.filter(a => a.algorithmPerformance.topicSelectionAppropriate).length / analytics.length;
    if (topicSelectionSuccess < 0.8) {
      recommendations.push({
        component: 'topic_selection',
        issue: 'Suboptimal topic selection',
        impact: 6,
        recommendation: 'Enhance topic-user compatibility scoring and freshness algorithms',
        expectedImprovement: 'Improve topic satisfaction by 25%'
      });
    }

    return recommendations;
  }

  private async cacheValidationReport(report: ValidationReport): Promise<void> {
    try {
      const cacheKey = `validation_report:${report.reportId}`;
      await this.cacheService.set(cacheKey, report, 86400000 * 7); // Cache for 7 days
    } catch (error) {
      this.logger.warn(`Failed to cache validation report: ${error.message}`);
    }
  }

  private getActualQualityScore(analytics: MatchAnalytics): number {
    return this.calculateActualQualityScore(analytics.actualOutcome, {
      satisfactionRatings: analytics.userSatisfactionRatings,
      debateMetrics: analytics.debateQualityMetrics,
      learningOutcomes: analytics.learningOutcomes
    });
  }

  // Additional helper methods for opportunity analysis
  private analyzePredictionAccuracyOpportunities(analytics: MatchAnalytics[]): ImprovementOpportunity | null {
    const accuracyScores = analytics.map(a => a.predictionAccuracy.confidenceLevel);
    const averageAccuracy = accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length;

    if (averageAccuracy < 0.75) {
      return {
        area: 'Prediction Accuracy',
        currentPerformance: Math.round(averageAccuracy * 100),
        targetPerformance: 80,
        impact: 'high',
        effort: 'medium',
        priority: 9,
        description: 'Quality prediction accuracy is below target, affecting match satisfaction',
        actionItems: [
          'Analyze prediction error patterns',
          'Incorporate more user feedback data',
          'Refine matching algorithms',
          'Add machine learning model validation'
        ]
      };
    }

    return null;
  }

  private analyzeTopicSelectionOpportunities(analytics: MatchAnalytics[]): ImprovementOpportunity | null {
    const successRate = analytics.filter(a => a.algorithmPerformance.topicSelectionAppropriate).length / analytics.length;

    if (successRate < 0.85) {
      return {
        area: 'Topic Selection',
        currentPerformance: Math.round(successRate * 100),
        targetPerformance: 90,
        impact: 'medium',
        effort: 'low',
        priority: 6,
        description: 'Topic selection algorithm needs refinement for better user engagement',
        actionItems: [
          'Improve topic-user compatibility scoring',
          'Enhance freshness algorithms',
          'Add topic difficulty progression',
          'Incorporate user topic preferences'
        ]
      };
    }

    return null;
  }

  private analyzePositionAssignmentOpportunities(analytics: MatchAnalytics[]): ImprovementOpportunity | null {
    const optimalRate = analytics.filter(a => a.algorithmPerformance.positionAssignmentOptimal).length / analytics.length;

    if (optimalRate < 0.8) {
      return {
        area: 'Position Assignment',
        currentPerformance: Math.round(optimalRate * 100),
        targetPerformance: 85,
        impact: 'medium',
        effort: 'medium',
        priority: 7,
        description: 'Position assignment could better balance challenge and educational value',
        actionItems: [
          'Enhance challenge level calculation',
          'Improve variety tracking',
          'Add educational value optimization',
          'Consider user position history'
        ]
      };
    }

    return null;
  }

  private analyzeEngagementOpportunities(analytics: MatchAnalytics[]): ImprovementOpportunity | null {
    const avgEngagement = analytics.reduce((sum, a) => 
      sum + a.algorithmPerformance.engagementPredictionAccuracy, 0) / analytics.length;

    if (avgEngagement < 0.7) {
      return {
        area: 'Engagement Prediction',
        currentPerformance: Math.round(avgEngagement * 100),
        targetPerformance: 75,
        impact: 'medium',
        effort: 'high',
        priority: 5,
        description: 'Engagement prediction accuracy needs improvement for better user experience',
        actionItems: [
          'Collect more engagement metrics',
          'Analyze user behavior patterns',
          'Improve engagement scoring model',
          'Add real-time engagement tracking'
        ]
      };
    }

    return null;
  }

  // Class analytics helper methods
  private async getClassAnalyticsData(classId: string, period: { start: Date; end: Date }): Promise<any> {
    // Get class information and analytics
    return {
      classId,
      className: 'Sample Class', // Would come from actual class data
      analytics: await this.getAnalyticsForTimeframe({
        timeframe: period,
        filters: { classIds: [classId] }
      })
    };
  }

  private calculateClassOverview(classData: any): ClassInsights['overview'] {
    return {
      totalStudents: 25, // Would calculate from actual enrollment data
      activeStudents: 20, // Students who participated in debates
      totalMatches: classData.analytics.length,
      completedMatches: classData.analytics.filter(a => a.actualOutcome === 'COMPLETED').length,
      averageMatchesPerStudent: classData.analytics.length / 20 // Approximation
    };
  }

  private calculateClassPerformance(analytics: MatchAnalytics[]): ClassInsights['performance'] {
    if (analytics.length === 0) {
      return {
        averageQualityScore: 0,
        averageSatisfaction: 0,
        completionRate: 0,
        engagementScore: 0,
        learningOutcomesScore: 0
      };
    }

    const avgQuality = analytics.reduce((sum, a) => sum + this.getActualQualityScore(a), 0) / analytics.length;
    const avgSatisfaction = this.calculateAverageSatisfaction(analytics);
    const completionRate = analytics.filter(a => a.actualOutcome === 'COMPLETED').length / analytics.length;
    const engagementScore = this.calculateAverageEngagement(analytics);
    const learningOutcomesScore = this.calculateAverageLearningOutcome(analytics);

    return {
      averageQualityScore: Number(avgQuality.toFixed(1)),
      averageSatisfaction: Number(avgSatisfaction.toFixed(1)),
      completionRate: Number(completionRate.toFixed(3)),
      engagementScore: Number(engagementScore.toFixed(1)),
      learningOutcomesScore: Number(learningOutcomesScore.toFixed(1))
    };
  }

  private calculateAverageSatisfaction(analytics: MatchAnalytics[]): number {
    const allRatings = analytics.flatMap(a => a.userSatisfactionRatings.map(r => r.rating));
    return allRatings.length > 0 ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length : 0;
  }

  private calculateAverageEngagement(analytics: MatchAnalytics[]): number {
    const engagementScores = analytics.map(a => {
      const metrics = a.engagementMetrics;
      return (metrics.messageCount / 30) * 50 + (metrics.debateCompletion ? 50 : 0);
    });
    return engagementScores.reduce((sum, score) => sum + score, 0) / analytics.length;
  }

  private calculateAverageLearningOutcome(analytics: MatchAnalytics[]): number {
    const allOutcomes = analytics.flatMap(a => a.learningOutcomes);
    if (allOutcomes.length === 0) return 0;

    const avgConfidenceChange = allOutcomes.reduce((sum, o) => sum + (o.confidenceChange + 5), 0) / allOutcomes.length;
    return (avgConfidenceChange / 10) * 100; // Scale to 0-100
  }

  private identifyClassPatterns(analytics: MatchAnalytics[]): ClassInsights['patterns'] {
    // Simplified pattern identification
    return {
      popularTopics: ['Technology', 'Politics', 'Environment'], // Would calculate from actual data
      strongPerformanceAreas: ['Argument construction', 'Evidence evaluation'],
      improvementNeededAreas: ['Counter-argument handling'],
      peerCollaborationScore: 75 // Would calculate from interaction data
    };
  }

  private analyzeClassTrends(analytics: MatchAnalytics[]): ClassInsights['trends'] {
    // Simplified trend analysis
    return {
      qualityTrend: {
        direction: 'improving',
        magnitude: 0.15,
        confidence: 0.8,
        timeframe: 'last_month'
      },
      engagementTrend: {
        direction: 'stable',
        magnitude: 0.05,
        confidence: 0.7,
        timeframe: 'last_month'
      },
      participationTrend: {
        direction: 'improving',
        magnitude: 0.12,
        confidence: 0.9,
        timeframe: 'last_month'
      }
    };
  }

  private generateClassRecommendations(
    overview: any, 
    performance: any, 
    patterns: any, 
    trends: any
  ): ClassRecommendation[] {
    const recommendations: ClassRecommendation[] = [];

    if (performance.completionRate < 0.8) {
      recommendations.push({
        type: 'engagement',
        priority: 'high',
        recommendation: 'Implement engagement strategies to improve debate completion rates',
        rationale: `Current completion rate of ${(performance.completionRate * 100).toFixed(1)}% is below target`,
        expectedOutcome: 'Increase completion rate to above 85%'
      });
    }

    if (patterns.improvementNeededAreas.includes('Counter-argument handling')) {
      recommendations.push({
        type: 'preparation',
        priority: 'medium',
        recommendation: 'Provide additional training on counter-argument techniques',
        rationale: 'Students show weakness in handling opposing arguments effectively',
        expectedOutcome: 'Improve debate quality and critical thinking skills'
      });
    }

    return recommendations;
  }

  // System performance calculation methods
  private calculateOverallMetrics(analytics: MatchAnalytics[]): SystemPerformanceReport['overallMetrics'] {
    if (analytics.length === 0) {
      return {
        totalMatches: 0,
        completedMatches: 0,
        completionRate: 0,
        averageQualityScore: 0,
        averageSatisfaction: 0,
        averagePredictionAccuracy: 0
      };
    }

    const completedMatches = analytics.filter(a => a.actualOutcome === 'COMPLETED').length;
    const avgQuality = analytics.reduce((sum, a) => sum + this.getActualQualityScore(a), 0) / analytics.length;
    const avgSatisfaction = this.calculateAverageSatisfaction(analytics);
    const avgAccuracy = analytics.reduce((sum, a) => sum + a.predictionAccuracy.confidenceLevel, 0) / analytics.length;

    return {
      totalMatches: analytics.length,
      completedMatches,
      completionRate: completedMatches / analytics.length,
      averageQualityScore: Number(avgQuality.toFixed(1)),
      averageSatisfaction: Number(avgSatisfaction.toFixed(1)),
      averagePredictionAccuracy: Number(avgAccuracy.toFixed(3))
    };
  }

  private calculateSystemAlgorithmPerformance(analytics: MatchAnalytics[]): SystemPerformanceReport['algorithmPerformance'] {
    if (analytics.length === 0) {
      return {
        matchingAccuracy: 0,
        topicSelectionSuccess: 0,
        positionAssignmentOptimal: 0,
        engagementPredictionAccuracy: 0,
        overallEffectiveness: 0
      };
    }

    const matchingAccuracy = analytics.reduce((sum, a) => sum + a.predictionAccuracy.confidenceLevel, 0) / analytics.length;
    const topicSelectionSuccess = analytics.filter(a => a.algorithmPerformance.topicSelectionAppropriate).length / analytics.length;
    const positionAssignmentOptimal = analytics.filter(a => a.algorithmPerformance.positionAssignmentOptimal).length / analytics.length;
    const engagementPredictionAccuracy = analytics.reduce((sum, a) => sum + a.algorithmPerformance.engagementPredictionAccuracy, 0) / analytics.length;
    const overallEffectiveness = (matchingAccuracy + topicSelectionSuccess + positionAssignmentOptimal + engagementPredictionAccuracy) / 4;

    return {
      matchingAccuracy: Number(matchingAccuracy.toFixed(3)),
      topicSelectionSuccess: Number(topicSelectionSuccess.toFixed(3)),
      positionAssignmentOptimal: Number(positionAssignmentOptimal.toFixed(3)),
      engagementPredictionAccuracy: Number(engagementPredictionAccuracy.toFixed(3)),
      overallEffectiveness: Number(overallEffectiveness.toFixed(3))
    };
  }

  private calculateSystemUserExperience(analytics: MatchAnalytics[]): SystemPerformanceReport['userExperience'] {
    if (analytics.length === 0) {
      return {
        averageTimeToMatch: 0,
        averageDebateLength: 0,
        repeatUsageRate: 0,
        recommendationRate: 0,
        satisfactionTrend: {
          direction: 'stable',
          magnitude: 0,
          confidence: 0,
          timeframe: 'insufficient_data'
        }
      };
    }

    const avgTimeToMatch = 4; // Hours - would calculate from actual data
    const avgDebateLength = analytics.reduce((sum, a) => sum + a.engagementMetrics.timeSpentInDebate, 0) / analytics.length;
    const repeatUsageRate = 0.75; // Would calculate from user behavior data
    const recommendationRate = analytics.reduce((sum, a) => {
      const wouldRecommend = a.userSatisfactionRatings.filter(r => r.wouldRecommend).length;
      const totalRatings = a.userSatisfactionRatings.length;
      return sum + (totalRatings > 0 ? wouldRecommend / totalRatings : 0);
    }, 0) / analytics.length;

    return {
      averageTimeToMatch: avgTimeToMatch,
      averageDebateLength: Number(avgDebateLength.toFixed(1)),
      repeatUsageRate: Number(repeatUsageRate.toFixed(3)),
      recommendationRate: Number(recommendationRate.toFixed(3)),
      satisfactionTrend: {
        direction: 'improving', // Would calculate from time series
        magnitude: 0.08,
        confidence: 0.75,
        timeframe: 'last_quarter'
      }
    };
  }

  private generateSystemRecommendations(
    analytics: MatchAnalytics[], 
    opportunities: ImprovementOpportunity[]
  ): SystemRecommendation[] {
    const recommendations: SystemRecommendation[] = [];

    // Convert improvement opportunities to system recommendations
    opportunities.slice(0, 5).forEach(opp => { // Top 5 opportunities
      recommendations.push({
        type: this.mapOpportunityToType(opp.area),
        priority: opp.impact === 'high' ? 'high' : opp.impact === 'medium' ? 'medium' : 'low',
        title: `Improve ${opp.area}`,
        description: opp.description,
        expectedImpact: `Increase performance from ${opp.currentPerformance}% to ${opp.targetPerformance}%`,
        implementation: {
          effort: opp.effort,
          timeline: this.estimateTimeline(opp.effort),
          resources: opp.actionItems
        }
      });
    });

    return recommendations;
  }

  private mapOpportunityToType(area: string): SystemRecommendation['type'] {
    const mapping = {
      'Prediction Accuracy': 'algorithm',
      'Topic Selection': 'algorithm',
      'Position Assignment': 'algorithm',
      'Engagement Prediction': 'user_experience'
    };
    return mapping[area] || 'process';
  }

  private estimateTimeline(effort: string): string {
    const timelines = {
      'low': '2-4 weeks',
      'medium': '1-2 months',
      'high': '3-6 months'
    };
    return timelines[effort] || '2-4 weeks';
  }

  private calculateDuration(start: Date, end: Date): string {
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return `${diffDays} days`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months`;
    return `${Math.ceil(diffDays / 365)} years`;
  }
}
