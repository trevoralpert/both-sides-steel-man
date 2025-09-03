/**
 * Plasticity Measurement Service
 * 
 * Task 7.4.1: Opinion Plasticity Measurement System
 * 
 * Sophisticated analysis for measuring belief position changes over time.
 * Compares pre-debate vs. post-debate positions and tracks longitudinal
 * plasticity evolution across multiple debates.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlasticityAnalysisService } from '../../belief-analysis/services/plasticity-analysis.service';

export interface PlasticityMeasurementRequest {
  userId: string;
  debateId: string;
  preDebatePositions?: BeliefPosition[];
  postDebatePositions: BeliefPosition[];
  reflectionData?: any;
  contextualFactors?: {
    topicCategory: string;
    difficultyLevel: number;
    controversyLevel?: number;
    peerInfluence?: number;
  };
}

export interface BeliefPosition {
  topicId: string;
  topicTitle: string;
  category: string;
  position: number; // -1 to 1 scale (strongly against to strongly for)
  confidence: number; // 0 to 1 scale
  reasoning?: string;
  evidenceSources?: string[];
  timestamp: Date;
  source: 'pre_debate' | 'post_debate' | 'ai_inferred' | 'self_reported';
  provenance?: string; // How this position was determined
}

export interface PlasticityMeasurement {
  userId: string;
  debateId: string;
  measurementId: string;
  timestamp: Date;
  
  // Core plasticity metrics
  overallPlasticityScore: number; // 0-1, higher = more opinion change
  positionChanges: PositionChange[];
  
  // Directional analysis
  movementPattern: 'towards_center' | 'away_from_center' | 'position_swap' | 'strengthening' | 'mixed';
  averageMagnitude: number; // Average absolute change
  maxMagnitude: number; // Largest single change
  
  // Confidence analysis
  confidenceChange: number; // Change in average confidence
  confidencePattern: 'increasing' | 'decreasing' | 'mixed' | 'stable';
  
  // Contextual factors
  contextualPlasticity: {
    topicDifficultyAdjusted: number;
    controversyAdjusted: number;
    peerInfluenceAdjusted: number;
  };
  
  // Longitudinal tracking (when available)
  longitudinalMetrics?: {
    previousMeasurements: number;
    plasticityTrend: 'increasing' | 'decreasing' | 'stable';
    cumulativePlasticity: number;
    consistencyScore: number; // How consistent is their plasticity pattern
  };
  
  // Quality and reliability
  reliability: number; // 0-1, confidence in measurement
  dataQuality: {
    preDebateDataSource: string;
    postDebateDataSource: string;
    completeness: number;
    timeGap?: number; // Time between pre/post measurements
  };
  
  // Educational insights
  insights: {
    plasticityLevel: 'low' | 'moderate' | 'high' | 'exceptional';
    growthIndicators: string[];
    concernAreas: string[];
    recommendations: string[];
  };
}

export interface PositionChange {
  topicId: string;
  topicTitle: string;
  category: string;
  prePosition: number;
  postPosition: number;
  positionDelta: number; // post - pre
  preConfidence: number;
  postConfidence: number;
  confidenceDelta: number;
  significanceLevel: 'minimal' | 'moderate' | 'substantial' | 'dramatic';
  changeType: 'no_change' | 'strengthening' | 'weakening' | 'reversal' | 'moderation';
  reasoningEvolution?: string;
}

export interface LongitudinalPlasticityData {
  userId: string;
  measurements: PlasticityMeasurement[];
  trends: {
    overallTrend: 'increasing' | 'decreasing' | 'stable' | 'cyclical';
    categoryTrends: Record<string, number>; // Plasticity by topic category
    timePatterns: {
      shortTermPlasticity: number; // Recent debates
      longTermPlasticity: number; // Historical average
      plasticityVolatility: number; // How much plasticity varies
    };
  };
  predictions: {
    futureEngagement: number; // Predicted debate engagement
    learningPotential: number; // Predicted learning outcomes
    optimalTopics: string[]; // Topics likely to generate good discussions
  };
}

@Injectable()
export class PlasticityMeasurementService {
  private readonly logger = new Logger(PlasticityMeasurementService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly plasticityAnalysisService: PlasticityAnalysisService,
  ) {}

  /**
   * Measure opinion plasticity from pre/post debate positions
   */
  async measureOpinionPlasticity(
    request: PlasticityMeasurementRequest
  ): Promise<PlasticityMeasurement> {
    const startTime = Date.now();
    this.logger.log(
      `Starting plasticity measurement for user ${request.userId}, debate ${request.debateId}`
    );

    try {
      // Validate request
      this.validateMeasurementRequest(request);

      // Get pre-debate positions (use AI inference if not available)
      const prePositions = await this.resolvePreDebatePositions(
        request.userId,
        request.debateId,
        request.preDebatePositions
      );

      // Analyze position changes
      const positionChanges = this.calculatePositionChanges(
        prePositions,
        request.postDebatePositions
      );

      // Calculate core plasticity metrics
      const coreMetrics = this.calculateCorePlasticityMetrics(positionChanges);

      // Analyze contextual factors
      const contextualMetrics = await this.calculateContextualPlasticity(
        coreMetrics,
        request.contextualFactors,
        request.userId
      );

      // Get longitudinal data if available
      const longitudinalMetrics = await this.calculateLongitudinalMetrics(
        request.userId,
        coreMetrics.overallPlasticityScore
      );

      // Assess reliability and data quality
      const reliability = this.assessMeasurementReliability(
        prePositions,
        request.postDebatePositions,
        request.contextualFactors
      );

      // Generate educational insights
      const insights = this.generatePlasticityInsights(
        coreMetrics,
        contextualMetrics,
        longitudinalMetrics,
        request.contextualFactors
      );

      const measurement: PlasticityMeasurement = {
        userId: request.userId,
        debateId: request.debateId,
        measurementId: `plasticity_${request.userId}_${request.debateId}_${Date.now()}`,
        timestamp: new Date(),
        overallPlasticityScore: coreMetrics.overallPlasticityScore,
        positionChanges,
        movementPattern: coreMetrics.movementPattern,
        averageMagnitude: coreMetrics.averageMagnitude,
        maxMagnitude: coreMetrics.maxMagnitude,
        confidenceChange: coreMetrics.confidenceChange,
        confidencePattern: coreMetrics.confidencePattern,
        contextualPlasticity: contextualMetrics,
        longitudinalMetrics,
        reliability,
        dataQuality: {
          preDebateDataSource: this.determineDataSource(prePositions),
          postDebateDataSource: this.determineDataSource(request.postDebatePositions),
          completeness: this.calculateCompleteness(prePositions, request.postDebatePositions),
          timeGap: this.calculateTimeGap(prePositions, request.postDebatePositions),
        },
        insights,
      };

      // Store measurement in database
      await this.storePlasticityMeasurement(measurement);

      this.logger.log(
        `Completed plasticity measurement for user ${request.userId}: ` +
        `score=${measurement.overallPlasticityScore.toFixed(3)}, ` +
        `pattern=${measurement.movementPattern}, ` +
        `reliability=${measurement.reliability.toFixed(3)} ` +
        `(${Date.now() - startTime}ms)`
      );

      return measurement;

    } catch (error) {
      this.logger.error(
        `Failed to measure plasticity for user ${request.userId}, debate ${request.debateId}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Track longitudinal plasticity over multiple debates
   */
  async buildLongitudinalPlasticityProfile(
    userId: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<LongitudinalPlasticityData> {
    this.logger.log(`Building longitudinal plasticity profile for user ${userId}`);

    try {
      // Retrieve historical measurements
      const measurements = await this.getHistoricalMeasurements(userId, timeRange);

      if (measurements.length < 2) {
        throw new Error('Insufficient historical data for longitudinal analysis');
      }

      // Analyze trends
      const trends = this.analyzePlasticityTrends(measurements);
      
      // Generate predictions
      const predictions = await this.generatePlasticityPredictions(measurements, trends);

      return {
        userId,
        measurements,
        trends,
        predictions,
      };

    } catch (error) {
      this.logger.error(`Failed to build longitudinal profile for user ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate comparative plasticity report
   */
  async generateComparativePlasticityReport(
    userIds: string[],
    classId?: string,
    topicCategory?: string
  ): Promise<{
    userComparisons: Array<{
      userId: string;
      averagePlasticity: number;
      plasticityRank: number;
      percentile: number;
      strengths: string[];
      growthAreas: string[];
    }>;
    classMetrics?: {
      averagePlasticity: number;
      plasticityDistribution: Record<string, number>;
      topPerformers: string[];
      needsSupport: string[];
    };
    insights: string[];
  }> {
    this.logger.log(`Generating comparative plasticity report for ${userIds.length} users`);

    try {
      const userMeasurements = await Promise.all(
        userIds.map(async (userId) => {
          const measurements = await this.getHistoricalMeasurements(userId);
          return {
            userId,
            measurements,
            averagePlasticity: this.calculateAveragePlasticity(measurements),
          };
        })
      );

      // Sort by average plasticity for ranking
      userMeasurements.sort((a, b) => b.averagePlasticity - a.averagePlasticity);

      const userComparisons = userMeasurements.map((user, index) => ({
        userId: user.userId,
        averagePlasticity: user.averagePlasticity,
        plasticityRank: index + 1,
        percentile: ((userMeasurements.length - index) / userMeasurements.length) * 100,
        strengths: this.identifyPlasticityStrengths(user.measurements),
        growthAreas: this.identifyGrowthAreas(user.measurements),
      }));

      // Generate class-level metrics if requested
      const classMetrics = classId ? this.calculateClassMetrics(userMeasurements) : undefined;

      // Generate insights
      const insights = this.generateComparativeInsights(userComparisons, classMetrics);

      return {
        userComparisons,
        classMetrics,
        insights,
      };

    } catch (error) {
      this.logger.error('Failed to generate comparative plasticity report', error.stack);
      throw error;
    }
  }

  // Private helper methods

  private validateMeasurementRequest(request: PlasticityMeasurementRequest): void {
    if (!request.userId || !request.debateId) {
      throw new Error('User ID and debate ID are required');
    }

    if (!request.postDebatePositions || request.postDebatePositions.length === 0) {
      throw new Error('Post-debate positions are required');
    }

    // Validate position format
    for (const position of request.postDebatePositions) {
      if (position.position < -1 || position.position > 1) {
        throw new Error(`Invalid position value: ${position.position} (must be between -1 and 1)`);
      }
      if (position.confidence < 0 || position.confidence > 1) {
        throw new Error(`Invalid confidence value: ${position.confidence} (must be between 0 and 1)`);
      }
    }
  }

  private async resolvePreDebatePositions(
    userId: string,
    debateId: string,
    providedPositions?: BeliefPosition[]
  ): Promise<BeliefPosition[]> {
    if (providedPositions && providedPositions.length > 0) {
      return providedPositions;
    }

    // Try to get from user's profile
    const profile = await this.prismaService.profile.findUnique({
      where: { user_id: userId },
      include: { survey_responses: true },
    });

    if (profile?.survey_responses) {
      // Convert survey responses to belief positions
      return this.convertSurveyToPositions(profile.survey_responses);
    }

    // As fallback, use AI to infer pre-debate positions from early debate messages
    return this.inferPreDebatePositions(userId, debateId);
  }

  private convertSurveyToPositions(surveyResponses: any[]): BeliefPosition[] {
    return surveyResponses
      .filter(response => response.response_value !== null)
      .map(response => ({
        topicId: response.question_id,
        topicTitle: response.question?.question || 'Unknown Topic',
        category: response.question?.category?.toLowerCase() || 'general',
        position: this.normalizeResponseToPosition(response.response_value),
        confidence: (response.confidence_level || 50) / 100,
        timestamp: new Date(response.responded_at),
        source: 'pre_debate' as const,
        provenance: 'survey_response',
      }));
  }

  private async inferPreDebatePositions(userId: string, debateId: string): Promise<BeliefPosition[]> {
    // Get conversation and early messages to infer initial positions
    const conversation = await this.prismaService.conversation.findFirst({
      where: { 
        match: { OR: [{ student1_id: userId }, { student2_id: userId }] }
      },
      include: {
        messages: {
          where: { user_id: userId },
          orderBy: { created_at: 'asc' },
          take: 5, // First 5 messages to infer initial stance
        },
        match: {
          include: { topic: true }
        }
      }
    });

    if (!conversation?.messages.length) {
      return [];
    }

    // Use AI to analyze early messages and infer positions
    // This would integrate with the existing AI analysis services
    const topic = conversation.match.topic;
    if (!topic) return [];

    // For now, create a placeholder position
    // In a full implementation, this would use AI analysis
    return [{
      topicId: topic.id,
      topicTitle: topic.title,
      category: topic.category.toLowerCase(),
      position: 0, // Neutral starting position
      confidence: 0.5, // Medium confidence
      timestamp: new Date(conversation.created_at),
      source: 'ai_inferred' as const,
      provenance: 'early_message_analysis',
    }];
  }

  private calculatePositionChanges(
    prePositions: BeliefPosition[],
    postPositions: BeliefPosition[]
  ): PositionChange[] {
    const changes: PositionChange[] = [];

    // Match positions by topic
    for (const postPos of postPositions) {
      const prePos = prePositions.find(p => 
        p.topicId === postPos.topicId || 
        p.topicTitle === postPos.topicTitle ||
        p.category === postPos.category
      );

      if (!prePos) continue; // Skip if no pre-debate position available

      const positionDelta = postPos.position - prePos.position;
      const confidenceDelta = postPos.confidence - prePos.confidence;

      changes.push({
        topicId: postPos.topicId,
        topicTitle: postPos.topicTitle,
        category: postPos.category,
        prePosition: prePos.position,
        postPosition: postPos.position,
        positionDelta,
        preConfidence: prePos.confidence,
        postConfidence: postPos.confidence,
        confidenceDelta,
        significanceLevel: this.classifySignificanceLevel(Math.abs(positionDelta)),
        changeType: this.classifyChangeType(prePos.position, postPos.position),
        reasoningEvolution: this.compareReasoning(prePos.reasoning, postPos.reasoning),
      });
    }

    return changes;
  }

  private calculateCorePlasticityMetrics(changes: PositionChange[]): {
    overallPlasticityScore: number;
    movementPattern: PlasticityMeasurement['movementPattern'];
    averageMagnitude: number;
    maxMagnitude: number;
    confidenceChange: number;
    confidencePattern: PlasticityMeasurement['confidencePattern'];
  } {
    if (changes.length === 0) {
      return {
        overallPlasticityScore: 0,
        movementPattern: 'mixed',
        averageMagnitude: 0,
        maxMagnitude: 0,
        confidenceChange: 0,
        confidencePattern: 'stable',
      };
    }

    const magnitudes = changes.map(c => Math.abs(c.positionDelta));
    const averageMagnitude = magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length;
    const maxMagnitude = Math.max(...magnitudes);
    
    // Overall plasticity combines magnitude with consistency
    const overallPlasticityScore = Math.min(1, averageMagnitude * 1.5);
    
    // Analyze movement pattern
    const movementPattern = this.analyzeMovementPattern(changes);
    
    // Analyze confidence changes
    const confidenceDeltas = changes.map(c => c.confidenceDelta);
    const confidenceChange = confidenceDeltas.reduce((sum, d) => sum + d, 0) / confidenceDeltas.length;
    const confidencePattern = this.analyzeConfidencePattern(confidenceDeltas);

    return {
      overallPlasticityScore,
      movementPattern,
      averageMagnitude,
      maxMagnitude,
      confidenceChange,
      confidencePattern,
    };
  }

  private async calculateContextualPlasticity(
    coreMetrics: any,
    contextualFactors: PlasticityMeasurementRequest['contextualFactors'],
    userId: string
  ): Promise<PlasticityMeasurement['contextualPlasticity']> {
    const baseScore = coreMetrics.overallPlasticityScore;
    
    let topicDifficultyAdjusted = baseScore;
    let controversyAdjusted = baseScore;
    let peerInfluenceAdjusted = baseScore;

    if (contextualFactors) {
      // Adjust for topic difficulty - harder topics should show higher plasticity value
      if (contextualFactors.difficultyLevel) {
        const difficultyMultiplier = 0.8 + (contextualFactors.difficultyLevel / 10) * 0.4;
        topicDifficultyAdjusted = Math.min(1, baseScore * difficultyMultiplier);
      }

      // Adjust for controversy level - controversial topics might naturally show more change
      if (contextualFactors.controversyLevel) {
        const controversyMultiplier = 1.1 - (contextualFactors.controversyLevel / 10) * 0.2;
        controversyAdjusted = Math.min(1, baseScore * controversyMultiplier);
      }

      // Adjust for peer influence
      if (contextualFactors.peerInfluence) {
        const peerMultiplier = 1.0 + (contextualFactors.peerInfluence - 0.5) * 0.3;
        peerInfluenceAdjusted = Math.min(1, baseScore * peerMultiplier);
      }
    }

    return {
      topicDifficultyAdjusted,
      controversyAdjusted,
      peerInfluenceAdjusted,
    };
  }

  private async calculateLongitudinalMetrics(
    userId: string,
    currentScore: number
  ): Promise<PlasticityMeasurement['longitudinalMetrics']> {
    // Get previous measurements
    const previousMeasurements = await this.prismaService.learningAnalytics.findMany({
      where: {
        user_id: userId,
        metric_type: 'POSITION_FLEXIBILITY'
      },
      orderBy: { measurement_date: 'desc' },
      take: 10
    });

    if (previousMeasurements.length === 0) {
      return undefined;
    }

    const scores = previousMeasurements.map(m => m.value);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    // Determine trend
    let plasticityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (scores.length >= 3) {
      const recentAvg = scores.slice(0, 3).reduce((sum, s) => sum + s, 0) / 3;
      const olderAvg = scores.slice(-3).reduce((sum, s) => sum + s, 0) / 3;
      
      if (recentAvg > olderAvg + 0.1) plasticityTrend = 'increasing';
      else if (recentAvg < olderAvg - 0.1) plasticityTrend = 'decreasing';
    }

    // Calculate consistency (low variance = high consistency)
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const consistencyScore = Math.max(0, 1 - variance);

    return {
      previousMeasurements: previousMeasurements.length,
      plasticityTrend,
      cumulativePlasticity: avgScore,
      consistencyScore,
    };
  }

  private assessMeasurementReliability(
    prePositions: BeliefPosition[],
    postPositions: BeliefPosition[],
    contextualFactors?: PlasticityMeasurementRequest['contextualFactors']
  ): number {
    let reliability = 0.7; // Base reliability

    // More matched positions = higher reliability
    const matchCount = this.countMatchedPositions(prePositions, postPositions);
    if (matchCount >= 5) reliability += 0.1;
    if (matchCount >= 10) reliability += 0.1;

    // Self-reported data is more reliable than inferred
    const selfReportedPre = prePositions.filter(p => p.source === 'self_reported').length;
    const selfReportedPost = postPositions.filter(p => p.source === 'self_reported').length;
    
    if (selfReportedPre > prePositions.length * 0.5) reliability += 0.1;
    if (selfReportedPost > postPositions.length * 0.5) reliability += 0.1;

    // Recent measurements are more reliable
    const avgAge = this.calculateAverageAge(postPositions);
    if (avgAge < 24 * 60 * 60 * 1000) reliability += 0.05; // Within 24 hours

    return Math.min(1, reliability);
  }

  private generatePlasticityInsights(
    coreMetrics: any,
    contextualMetrics: any,
    longitudinalMetrics: any,
    contextualFactors?: PlasticityMeasurementRequest['contextualFactors']
  ): PlasticityMeasurement['insights'] {
    const score = coreMetrics.overallPlasticityScore;
    
    let plasticityLevel: PlasticityMeasurement['insights']['plasticityLevel'];
    if (score >= 0.8) plasticityLevel = 'exceptional';
    else if (score >= 0.6) plasticityLevel = 'high';
    else if (score >= 0.3) plasticityLevel = 'moderate';
    else plasticityLevel = 'low';

    const growthIndicators: string[] = [];
    const concernAreas: string[] = [];
    const recommendations: string[] = [];

    // Analyze patterns for insights
    if (coreMetrics.movementPattern === 'towards_center') {
      growthIndicators.push('Shows willingness to moderate extreme positions');
    }
    
    if (coreMetrics.confidencePattern === 'increasing') {
      growthIndicators.push('Growing confidence in their reasoning abilities');
    }

    if (score < 0.2) {
      concernAreas.push('Very low opinion plasticity - may be overly rigid');
      recommendations.push('Encourage exposure to diverse perspectives');
    }

    if (longitudinalMetrics?.plasticityTrend === 'decreasing') {
      concernAreas.push('Plasticity appears to be decreasing over time');
      recommendations.push('Consider topics that challenge existing beliefs');
    }

    return {
      plasticityLevel,
      growthIndicators,
      concernAreas,
      recommendations,
    };
  }

  // Utility methods
  private classifySignificanceLevel(magnitude: number): PositionChange['significanceLevel'] {
    if (magnitude >= 0.8) return 'dramatic';
    if (magnitude >= 0.5) return 'substantial';
    if (magnitude >= 0.2) return 'moderate';
    return 'minimal';
  }

  private classifyChangeType(prePos: number, postPos: number): PositionChange['changeType'] {
    const delta = postPos - prePos;
    const magnitude = Math.abs(delta);
    
    if (magnitude < 0.1) return 'no_change';
    if (Math.sign(prePos) !== Math.sign(postPos) && magnitude > 0.5) return 'reversal';
    if (Math.abs(postPos) < Math.abs(prePos)) return 'moderation';
    if (delta > 0 && prePos > 0) return 'strengthening';
    if (delta < 0 && prePos < 0) return 'strengthening';
    return 'weakening';
  }

  private analyzeMovementPattern(changes: PositionChange[]): PlasticityMeasurement['movementPattern'] {
    const moderations = changes.filter(c => c.changeType === 'moderation').length;
    const reversals = changes.filter(c => c.changeType === 'reversal').length;
    const strengthenings = changes.filter(c => c.changeType === 'strengthening').length;

    if (moderations > changes.length * 0.6) return 'towards_center';
    if (reversals > changes.length * 0.3) return 'position_swap';
    if (strengthenings > changes.length * 0.6) return 'strengthening';
    if (moderations + reversals < changes.length * 0.2) return 'away_from_center';
    return 'mixed';
  }

  private analyzeConfidencePattern(confidenceDeltas: number[]): PlasticityMeasurement['confidencePattern'] {
    const avgChange = confidenceDeltas.reduce((sum, d) => sum + d, 0) / confidenceDeltas.length;
    const increasingCount = confidenceDeltas.filter(d => d > 0.1).length;
    const decreasingCount = confidenceDeltas.filter(d => d < -0.1).length;

    if (Math.abs(avgChange) < 0.05) return 'stable';
    if (increasingCount > decreasingCount * 1.5) return 'increasing';
    if (decreasingCount > increasingCount * 1.5) return 'decreasing';
    return 'mixed';
  }

  private normalizeResponseToPosition(responseValue: any): number {
    if (typeof responseValue === 'number') {
      // Assume 1-5 scale, convert to -1 to 1
      return ((responseValue - 3) / 2);
    }
    if (typeof responseValue === 'boolean') {
      return responseValue ? 1 : -1;
    }
    return 0; // Default neutral
  }

  private compareReasoning(preReasoning?: string, postReasoning?: string): string | undefined {
    if (!preReasoning || !postReasoning) return undefined;
    
    // Simple comparison - in a full implementation, this could use AI
    if (postReasoning.length > preReasoning.length * 1.5) {
      return 'Reasoning became more detailed and nuanced';
    }
    if (postReasoning.toLowerCase().includes('however') || postReasoning.toLowerCase().includes('but')) {
      return 'Added qualification and nuance to original position';
    }
    return 'Reasoning evolved during debate';
  }

  private determineDataSource(positions: BeliefPosition[]): string {
    const sources = positions.map(p => p.source);
    const selfReported = sources.filter(s => s === 'self_reported').length;
    const aiInferred = sources.filter(s => s === 'ai_inferred').length;
    
    if (selfReported > sources.length * 0.8) return 'primarily_self_reported';
    if (aiInferred > sources.length * 0.8) return 'primarily_ai_inferred';
    return 'mixed_sources';
  }

  private calculateCompleteness(prePositions: BeliefPosition[], postPositions: BeliefPosition[]): number {
    const preTopics = new Set(prePositions.map(p => p.topicId));
    const postTopics = new Set(postPositions.map(p => p.topicId));
    const intersection = new Set([...preTopics].filter(t => postTopics.has(t)));
    
    return intersection.size / Math.max(preTopics.size, postTopics.size, 1);
  }

  private calculateTimeGap(prePositions: BeliefPosition[], postPositions: BeliefPosition[]): number | undefined {
    if (prePositions.length === 0 || postPositions.length === 0) return undefined;
    
    const latestPre = Math.max(...prePositions.map(p => p.timestamp.getTime()));
    const earliestPost = Math.min(...postPositions.map(p => p.timestamp.getTime()));
    
    return Math.max(0, earliestPost - latestPre);
  }

  private countMatchedPositions(prePositions: BeliefPosition[], postPositions: BeliefPosition[]): number {
    let count = 0;
    for (const postPos of postPositions) {
      if (prePositions.find(p => 
        p.topicId === postPos.topicId || 
        p.topicTitle === postPos.topicTitle ||
        p.category === postPos.category
      )) {
        count++;
      }
    }
    return count;
  }

  private calculateAverageAge(positions: BeliefPosition[]): number {
    const now = Date.now();
    const ages = positions.map(p => now - p.timestamp.getTime());
    return ages.reduce((sum, age) => sum + age, 0) / ages.length;
  }

  private async getHistoricalMeasurements(
    userId: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<PlasticityMeasurement[]> {
    const whereClause: any = {
      user_id: userId,
      metric_type: 'POSITION_FLEXIBILITY'
    };

    if (timeRange) {
      whereClause.measurement_date = {
        gte: timeRange.from,
        lte: timeRange.to,
      };
    }

    const measurements = await this.prismaService.learningAnalytics.findMany({
      where: whereClause,
      orderBy: { measurement_date: 'desc' },
    });

    // Convert database records to PlasticityMeasurement objects
    // This is a simplified version - full implementation would deserialize stored data
    return measurements.map(m => ({
      userId: m.user_id,
      debateId: m.debate_id || 'unknown',
      measurementId: m.id,
      timestamp: m.measurement_date,
      overallPlasticityScore: m.value,
      positionChanges: [],
      movementPattern: 'mixed' as const,
      averageMagnitude: m.value * 0.8,
      maxMagnitude: m.value,
      confidenceChange: 0,
      confidencePattern: 'stable' as const,
      contextualPlasticity: {
        topicDifficultyAdjusted: m.value,
        controversyAdjusted: m.value,
        peerInfluenceAdjusted: m.value,
      },
      reliability: 0.8,
      dataQuality: {
        preDebateDataSource: 'stored',
        postDebateDataSource: 'stored',
        completeness: 1.0,
      },
      insights: {
        plasticityLevel: m.value > 0.6 ? 'high' as const : 'moderate' as const,
        growthIndicators: [],
        concernAreas: [],
        recommendations: [],
      },
    }));
  }

  private analyzePlasticityTrends(measurements: PlasticityMeasurement[]): LongitudinalPlasticityData['trends'] {
    // Simplified trend analysis - full implementation would be more sophisticated
    const scores = measurements.map(m => m.overallPlasticityScore);
    const recentScores = scores.slice(0, Math.ceil(scores.length / 3));
    const olderScores = scores.slice(-Math.ceil(scores.length / 3));
    
    const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length;
    
    let overallTrend: 'increasing' | 'decreasing' | 'stable' | 'cyclical' = 'stable';
    if (recentAvg > olderAvg + 0.1) overallTrend = 'increasing';
    else if (recentAvg < olderAvg - 0.1) overallTrend = 'decreasing';

    // Group by categories
    const categoryTrends: Record<string, number> = {};
    // This would analyze by topic categories in full implementation

    const shortTermPlasticity = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
    const longTermPlasticity = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - longTermPlasticity, 2), 0) / scores.length;

    return {
      overallTrend,
      categoryTrends,
      timePatterns: {
        shortTermPlasticity,
        longTermPlasticity,
        plasticityVolatility: Math.sqrt(variance),
      },
    };
  }

  private async generatePlasticityPredictions(
    measurements: PlasticityMeasurement[],
    trends: LongitudinalPlasticityData['trends']
  ): Promise<LongitudinalPlasticityData['predictions']> {
    const avgPlasticity = trends.timePatterns.longTermPlasticity;
    
    // Simple prediction model - full implementation would use machine learning
    const futureEngagement = Math.min(1, avgPlasticity * 1.2);
    const learningPotential = Math.min(1, avgPlasticity * 1.1);
    const optimalTopics: string[] = []; // Would analyze which topics historically generated good discussions

    return {
      futureEngagement,
      learningPotential,
      optimalTopics,
    };
  }

  private calculateAveragePlasticity(measurements: PlasticityMeasurement[]): number {
    if (measurements.length === 0) return 0;
    return measurements.reduce((sum, m) => sum + m.overallPlasticityScore, 0) / measurements.length;
  }

  private identifyPlasticityStrengths(measurements: PlasticityMeasurement[]): string[] {
    const strengths: string[] = [];
    
    const avgPlasticity = this.calculateAveragePlasticity(measurements);
    if (avgPlasticity > 0.7) strengths.push('High opinion flexibility');
    
    const consistentMeasurements = measurements.filter(m => m.reliability > 0.8);
    if (consistentMeasurements.length > measurements.length * 0.8) {
      strengths.push('Consistent engagement with reflection');
    }

    return strengths;
  }

  private identifyGrowthAreas(measurements: PlasticityMeasurement[]): string[] {
    const growthAreas: string[] = [];
    
    const avgPlasticity = this.calculateAveragePlasticity(measurements);
    if (avgPlasticity < 0.3) growthAreas.push('Could benefit from more opinion flexibility');
    
    const lowReliability = measurements.filter(m => m.reliability < 0.6);
    if (lowReliability.length > measurements.length * 0.3) {
      growthAreas.push('Needs more complete reflection responses');
    }

    return growthAreas;
  }

  private calculateClassMetrics(userMeasurements: any[]): any {
    const scores = userMeasurements.map(u => u.averagePlasticity);
    const avgPlasticity = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    const distribution = {
      high: scores.filter(s => s > 0.7).length,
      moderate: scores.filter(s => s >= 0.3 && s <= 0.7).length,
      low: scores.filter(s => s < 0.3).length,
    };

    const topPerformers = userMeasurements
      .filter(u => u.averagePlasticity > avgPlasticity + 0.2)
      .map(u => u.userId);
      
    const needsSupport = userMeasurements
      .filter(u => u.averagePlasticity < avgPlasticity - 0.2)
      .map(u => u.userId);

    return {
      averagePlasticity: avgPlasticity,
      plasticityDistribution: distribution,
      topPerformers,
      needsSupport,
    };
  }

  private generateComparativeInsights(userComparisons: any[], classMetrics?: any): string[] {
    const insights: string[] = [];
    
    if (classMetrics) {
      insights.push(`Class average plasticity: ${(classMetrics.averagePlasticity * 100).toFixed(1)}%`);
      
      if (classMetrics.plasticityDistribution.high > classMetrics.plasticityDistribution.low) {
        insights.push('Class shows strong engagement with diverse perspectives');
      }
      
      if (classMetrics.needsSupport.length > 0) {
        insights.push(`${classMetrics.needsSupport.length} students may benefit from additional support`);
      }
    }

    return insights;
  }

  private async storePlasticityMeasurement(measurement: PlasticityMeasurement): Promise<void> {
    await this.prismaService.learningAnalytics.create({
      data: {
        user_id: measurement.userId,
        metric_type: 'POSITION_FLEXIBILITY',
        value: measurement.overallPlasticityScore,
        context: {
          measurement_id: measurement.measurementId,
          movement_pattern: measurement.movementPattern,
          average_magnitude: measurement.averageMagnitude,
          max_magnitude: measurement.maxMagnitude,
          confidence_change: measurement.confidenceChange,
          confidence_pattern: measurement.confidencePattern,
        },
        debate_id: measurement.debateId,
        metadata: {
          position_changes: measurement.positionChanges,
          contextual_plasticity: measurement.contextualPlasticity,
          longitudinal_metrics: measurement.longitudinalMetrics,
          reliability: measurement.reliability,
          data_quality: measurement.dataQuality,
          insights: measurement.insights,
        },
        measurement_date: measurement.timestamp,
      },
    });
  }
}
