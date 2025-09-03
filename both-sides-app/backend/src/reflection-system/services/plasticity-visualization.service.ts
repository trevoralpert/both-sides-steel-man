/**
 * Plasticity Visualization Service
 * 
 * Task 7.4.1: Visualization and reporting capabilities for Opinion Plasticity Measurement
 * 
 * Generates data for charts, heat maps, timelines, and reports to help teachers
 * and researchers understand plasticity patterns.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlasticityMeasurementService } from './plasticity-measurement.service';

export interface VisualizationRequest {
  type: 'individual_timeline' | 'comparative_radar' | 'class_distribution' | 'topic_heatmap' | 'research_report';
  userId?: string;
  classId?: string;
  timeRange?: { from: Date; to: Date };
  filters?: {
    topicCategory?: string;
    difficultyLevel?: number;
    minimumReliability?: number;
  };
  options?: {
    includeConfidence?: boolean;
    groupByCategory?: boolean;
    showPredictions?: boolean;
    anonymizeData?: boolean;
  };
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  confidence?: number;
  category?: string;
  metadata?: any;
}

export interface RadarChartData {
  categories: string[];
  datasets: Array<{
    label: string;
    data: number[];
    metadata?: any;
  }>;
}

export interface HeatMapData {
  rows: string[]; // Categories or users
  columns: string[]; // Topics or time periods  
  values: number[][];
  labels?: string[][];
  colorScale?: { min: number; max: number };
}

export interface DistributionData {
  bins: Array<{
    range: string;
    count: number;
    percentage: number;
    users?: string[];
  }>;
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    skewness: number;
  };
}

export interface ResearchReport {
  reportId: string;
  generatedAt: Date;
  scope: {
    userCount: number;
    debateCount: number;
    timeSpan: string;
  };
  keyFindings: string[];
  statisticalSummary: {
    meanPlasticity: number;
    plasticityRange: { min: number; max: number };
    significantChanges: number;
    patternDistribution: Record<string, number>;
  };
  categoryAnalysis: Record<string, {
    averagePlasticity: number;
    topPerformers: number;
    commonPatterns: string[];
  }>;
  recommendations: string[];
  dataQuality: {
    completenessRating: number;
    reliabilityRating: number;
    sampleSize: string;
  };
}

@Injectable()
export class PlasticityVisualizationService {
  private readonly logger = new Logger(PlasticityVisualizationService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly plasticityMeasurementService: PlasticityMeasurementService
  ) {}

  /**
   * Generate visualization data based on request type
   */
  async generateVisualizationData(request: VisualizationRequest): Promise<any> {
    this.logger.log(`Generating ${request.type} visualization`);

    try {
      switch (request.type) {
        case 'individual_timeline':
          return this.generateIndividualTimeline(request);
        
        case 'comparative_radar':
          return this.generateComparativeRadar(request);
        
        case 'class_distribution':
          return this.generateClassDistribution(request);
        
        case 'topic_heatmap':
          return this.generateTopicHeatmap(request);
        
        case 'research_report':
          return this.generateResearchReport(request);
        
        default:
          throw new Error(`Unsupported visualization type: ${request.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to generate ${request.type} visualization`, error.stack);
      throw error;
    }
  }

  /**
   * Generate individual plasticity timeline
   */
  private async generateIndividualTimeline(request: VisualizationRequest): Promise<{
    chartData: ChartDataPoint[];
    trendLine: ChartDataPoint[];
    milestones: Array<{
      date: string;
      event: string;
      plasticityScore: number;
    }>;
    insights: string[];
  }> {
    if (!request.userId) {
      throw new Error('User ID is required for individual timeline');
    }

    // Get historical measurements
    const measurements = await this.getFilteredMeasurements({
      userId: request.userId,
      timeRange: request.timeRange,
      filters: request.filters,
    });

    // Transform to chart data
    const chartData: ChartDataPoint[] = measurements.map(m => ({
      timestamp: m.measurement_date.toISOString(),
      value: m.value,
      confidence: this.extractConfidenceFromMetadata(m.metadata),
      category: this.extractCategoryFromMetadata(m.metadata),
      metadata: {
        debateId: m.debate_id,
        reliability: this.extractReliabilityFromMetadata(m.metadata),
      },
    }));

    // Generate trend line using moving average
    const trendLine = this.calculateTrendLine(chartData);

    // Identify significant milestones
    const milestones = this.identifyPlasticityMilestones(measurements);

    // Generate insights
    const insights = this.generateTimelineInsights(chartData, trendLine, milestones);

    return {
      chartData,
      trendLine,
      milestones,
      insights,
    };
  }

  /**
   * Generate comparative radar chart
   */
  private async generateComparativeRadar(request: VisualizationRequest): Promise<RadarChartData> {
    if (!request.classId && (!request.userId || !Array.isArray(request.userId))) {
      throw new Error('Either class ID or array of user IDs is required for comparative radar');
    }

    // Define plasticity dimensions for radar
    const categories = [
      'Position Flexibility',
      'Confidence Adaptation', 
      'Reasoning Evolution',
      'Evidence Integration',
      'Perspective Taking',
      'Contextual Awareness'
    ];

    let userIds: string[];
    if (request.classId) {
      // Get all students in the class
      userIds = await this.getClassUserIds(request.classId);
    } else {
      userIds = Array.isArray(request.userId) ? request.userId : [request.userId!];
    }

    const datasets = await Promise.all(
      userIds.map(async (userId, index) => {
        const dimensionScores = await this.calculateDimensionScores(userId, request);
        
        return {
          label: request.options?.anonymizeData ? `Student ${index + 1}` : `User ${userId}`,
          data: dimensionScores,
          metadata: {
            userId: request.options?.anonymizeData ? undefined : userId,
            totalMeasurements: await this.getUserMeasurementCount(userId),
          },
        };
      })
    );

    return {
      categories,
      datasets,
    };
  }

  /**
   * Generate class plasticity distribution
   */
  private async generateClassDistribution(request: VisualizationRequest): Promise<DistributionData> {
    if (!request.classId) {
      throw new Error('Class ID is required for distribution analysis');
    }

    const userIds = await this.getClassUserIds(request.classId);
    
    // Get average plasticity for each user
    const userPlasticities = await Promise.all(
      userIds.map(async (userId) => {
        const measurements = await this.getFilteredMeasurements({
          userId,
          timeRange: request.timeRange,
          filters: request.filters,
        });
        
        if (measurements.length === 0) return 0;
        return measurements.reduce((sum, m) => sum + m.value, 0) / measurements.length;
      })
    );

    // Create distribution bins
    const binRanges = [
      { min: 0, max: 0.2, label: 'Low (0.0-0.2)' },
      { min: 0.2, max: 0.4, label: 'Low-Moderate (0.2-0.4)' },
      { min: 0.4, max: 0.6, label: 'Moderate (0.4-0.6)' },
      { min: 0.6, max: 0.8, label: 'Moderate-High (0.6-0.8)' },
      { min: 0.8, max: 1.0, label: 'High (0.8-1.0)' },
    ];

    const bins = binRanges.map(range => {
      const usersInRange = userPlasticities
        .map((plasticity, index) => ({ plasticity, userId: userIds[index] }))
        .filter(({ plasticity }) => plasticity >= range.min && plasticity < range.max);
      
      return {
        range: range.label,
        count: usersInRange.length,
        percentage: (usersInRange.length / userPlasticities.length) * 100,
        users: request.options?.anonymizeData ? undefined : usersInRange.map(u => u.userId),
      };
    });

    // Calculate statistics
    const mean = userPlasticities.reduce((sum, p) => sum + p, 0) / userPlasticities.length;
    const sortedValues = [...userPlasticities].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    const variance = userPlasticities.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / userPlasticities.length;
    const stdDev = Math.sqrt(variance);
    
    // Simple skewness calculation
    const skewness = userPlasticities.reduce((sum, p) => sum + Math.pow((p - mean) / stdDev, 3), 0) / userPlasticities.length;

    return {
      bins,
      statistics: {
        mean,
        median,
        stdDev,
        skewness,
      },
    };
  }

  /**
   * Generate topic plasticity heatmap
   */
  private async generateTopicHeatmap(request: VisualizationRequest): Promise<HeatMapData> {
    // Get all measurements in scope
    const measurements = await this.getFilteredMeasurements({
      classId: request.classId,
      timeRange: request.timeRange,
      filters: request.filters,
    });

    // Extract topics and users
    const topics = new Set<string>();
    const users = new Set<string>();
    
    measurements.forEach(m => {
      if (m.debate_id) topics.add(m.debate_id);
      users.add(m.user_id);
    });

    const topicArray = Array.from(topics);
    const userArray = Array.from(users);

    // Create matrix of plasticity values
    const values: number[][] = [];
    const labels: string[][] = [];

    for (const userId of userArray) {
      const userRow: number[] = [];
      const labelRow: string[] = [];
      
      for (const topicId of topicArray) {
        const measurement = measurements.find(m => 
          m.user_id === userId && m.debate_id === topicId
        );
        
        if (measurement) {
          userRow.push(measurement.value);
          labelRow.push(`${measurement.value.toFixed(2)}`);
        } else {
          userRow.push(0);
          labelRow.push('No data');
        }
      }
      
      values.push(userRow);
      labels.push(labelRow);
    }

    return {
      rows: request.options?.anonymizeData 
        ? userArray.map((_, index) => `Student ${index + 1}`)
        : userArray,
      columns: topicArray.map(id => `Topic ${id.slice(-4)}`), // Show last 4 chars for brevity
      values,
      labels,
      colorScale: {
        min: 0,
        max: 1,
      },
    };
  }

  /**
   * Generate academic research report
   */
  private async generateResearchReport(request: VisualizationRequest): Promise<ResearchReport> {
    const reportId = `plasticity_report_${Date.now()}`;
    
    // Gather comprehensive data
    const measurements = await this.getFilteredMeasurements({
      classId: request.classId,
      timeRange: request.timeRange,
      filters: request.filters,
    });

    // Calculate scope metrics
    const userCount = new Set(measurements.map(m => m.user_id)).size;
    const debateCount = new Set(measurements.map(m => m.debate_id)).size;
    const timeSpan = this.calculateTimeSpan(measurements);

    // Analyze patterns
    const plasticityValues = measurements.map(m => m.value);
    const meanPlasticity = plasticityValues.reduce((sum, p) => sum + p, 0) / plasticityValues.length;
    const plasticityRange = {
      min: Math.min(...plasticityValues),
      max: Math.max(...plasticityValues),
    };

    // Count significant changes (>0.3 change)
    const significantChanges = measurements.filter(m => {
      const metadata = m.metadata as any;
      return metadata?.average_magnitude > 0.3;
    }).length;

    // Analyze movement patterns
    const patternDistribution: Record<string, number> = {};
    measurements.forEach(m => {
      const metadata = m.metadata as any;
      const pattern = metadata?.movement_pattern || 'unknown';
      patternDistribution[pattern] = (patternDistribution[pattern] || 0) + 1;
    });

    // Category analysis
    const categoryAnalysis: Record<string, any> = {};
    const categories = ['political', 'social', 'economic', 'philosophical'];
    
    for (const category of categories) {
      const categoryMeasurements = measurements.filter(m => {
        const metadata = m.metadata as any;
        return metadata?.position_changes?.some((change: any) => 
          change.category === category
        );
      });
      
      if (categoryMeasurements.length > 0) {
        const avgPlasticity = categoryMeasurements.reduce((sum, m) => sum + m.value, 0) / categoryMeasurements.length;
        const topPerformers = categoryMeasurements.filter(m => m.value > avgPlasticity + 0.2).length;
        
        categoryAnalysis[category] = {
          averagePlasticity: avgPlasticity,
          topPerformers,
          commonPatterns: this.identifyCommonPatterns(categoryMeasurements),
        };
      }
    }

    // Generate key findings
    const keyFindings = this.generateKeyFindings(
      meanPlasticity,
      plasticityRange,
      significantChanges,
      patternDistribution,
      categoryAnalysis
    );

    // Generate recommendations
    const recommendations = this.generateResearchRecommendations(
      keyFindings,
      categoryAnalysis,
      userCount,
      debateCount
    );

    // Assess data quality
    const reliabilityScores = measurements
      .map(m => (m.metadata as any)?.reliability || 0.5)
      .filter(r => r > 0);
    
    const avgReliability = reliabilityScores.reduce((sum, r) => sum + r, 0) / reliabilityScores.length;
    const completeness = measurements.filter(m => {
      const metadata = m.metadata as any;
      return metadata?.data_quality?.completeness > 0.8;
    }).length / measurements.length;

    return {
      reportId,
      generatedAt: new Date(),
      scope: {
        userCount,
        debateCount,
        timeSpan,
      },
      keyFindings,
      statisticalSummary: {
        meanPlasticity,
        plasticityRange,
        significantChanges,
        patternDistribution,
      },
      categoryAnalysis,
      recommendations,
      dataQuality: {
        completenessRating: completeness,
        reliabilityRating: avgReliability,
        sampleSize: this.categorizeSampleSize(measurements.length),
      },
    };
  }

  /**
   * Export plasticity data for external research tools
   */
  async exportResearchData(request: {
    userIds?: string[];
    classId?: string;
    format: 'csv' | 'json' | 'spss';
    anonymize: boolean;
    includeMetadata?: boolean;
  }): Promise<{
    data: string;
    filename: string;
    contentType: string;
  }> {
    this.logger.log(`Exporting research data in ${request.format} format`);

    const measurements = await this.getFilteredMeasurements({
      userIds: request.userIds,
      classId: request.classId,
    });

    switch (request.format) {
      case 'csv':
        return this.exportToCSV(measurements, request.anonymize, request.includeMetadata);
      
      case 'json':
        return this.exportToJSON(measurements, request.anonymize, request.includeMetadata);
      
      case 'spss':
        return this.exportToSPSS(measurements, request.anonymize, request.includeMetadata);
      
      default:
        throw new Error(`Unsupported export format: ${request.format}`);
    }
  }

  // Private helper methods

  private async getFilteredMeasurements(filters: {
    userId?: string;
    userIds?: string[];
    classId?: string;
    timeRange?: { from: Date; to: Date };
    filters?: any;
  }): Promise<any[]> {
    const whereClause: any = {
      metric_type: 'POSITION_FLEXIBILITY'
    };

    if (filters.userId) {
      whereClause.user_id = filters.userId;
    } else if (filters.userIds) {
      whereClause.user_id = { in: filters.userIds };
    } else if (filters.classId) {
      whereClause.class_id = filters.classId;
    }

    if (filters.timeRange) {
      whereClause.measurement_date = {
        gte: filters.timeRange.from,
        lte: filters.timeRange.to,
      };
    }

    if (filters.filters?.minimumReliability) {
      // This would filter by reliability stored in metadata
      // For now, we'll include all measurements
    }

    return this.prismaService.learningAnalytics.findMany({
      where: whereClause,
      orderBy: { measurement_date: 'desc' },
    });
  }

  private async getClassUserIds(classId: string): Promise<string[]> {
    const enrollments = await this.prismaService.enrollment.findMany({
      where: { 
        class_id: classId,
        enrollment_status: 'ACTIVE'
      },
      select: { user_id: true },
    });

    return enrollments.map(e => e.user_id);
  }

  private calculateTrendLine(chartData: ChartDataPoint[]): ChartDataPoint[] {
    if (chartData.length < 3) return chartData;

    const windowSize = Math.max(3, Math.floor(chartData.length / 5));
    const trendData: ChartDataPoint[] = [];

    for (let i = windowSize - 1; i < chartData.length; i++) {
      const window = chartData.slice(i - windowSize + 1, i + 1);
      const avgValue = window.reduce((sum, point) => sum + point.value, 0) / window.length;
      
      trendData.push({
        timestamp: chartData[i].timestamp,
        value: avgValue,
        metadata: { type: 'trend', windowSize },
      });
    }

    return trendData;
  }

  private identifyPlasticityMilestones(measurements: any[]): Array<{
    date: string;
    event: string;
    plasticityScore: number;
  }> {
    const milestones: Array<{
      date: string;
      event: string;
      plasticityScore: number;
    }> = [];

    // Identify significant peaks and valleys
    for (let i = 1; i < measurements.length - 1; i++) {
      const current = measurements[i];
      const previous = measurements[i - 1];
      const next = measurements[i + 1];

      // Local maximum
      if (current.value > previous.value && current.value > next.value && current.value > 0.8) {
        milestones.push({
          date: current.measurement_date.toISOString(),
          event: 'High Plasticity Peak',
          plasticityScore: current.value,
        });
      }

      // Significant increase
      if (current.value > previous.value + 0.3) {
        milestones.push({
          date: current.measurement_date.toISOString(),
          event: 'Major Plasticity Increase',
          plasticityScore: current.value,
        });
      }
    }

    return milestones.slice(0, 10); // Limit to 10 most significant milestones
  }

  private generateTimelineInsights(
    chartData: ChartDataPoint[],
    trendLine: ChartDataPoint[],
    milestones: any[]
  ): string[] {
    const insights: string[] = [];

    if (chartData.length === 0) {
      return ['No plasticity data available for analysis'];
    }

    // Trend analysis
    const firstTrend = trendLine[0]?.value || chartData[0].value;
    const lastTrend = trendLine[trendLine.length - 1]?.value || chartData[chartData.length - 1].value;
    const overallTrend = lastTrend - firstTrend;

    if (overallTrend > 0.1) {
      insights.push('Opinion plasticity has been increasing over time');
    } else if (overallTrend < -0.1) {
      insights.push('Opinion plasticity has been decreasing over time');
    } else {
      insights.push('Opinion plasticity has remained relatively stable');
    }

    // Milestone insights
    if (milestones.length > 0) {
      insights.push(`${milestones.length} significant plasticity events identified`);
      
      const highPlasticityEvents = milestones.filter(m => m.plasticityScore > 0.8);
      if (highPlasticityEvents.length > 0) {
        insights.push(`${highPlasticityEvents.length} instances of exceptional plasticity`);
      }
    }

    // Variability insights
    const values = chartData.map(d => d.value);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - (values.reduce((s, val) => s + val, 0) / values.length), 2), 0) / values.length;
    
    if (variance > 0.1) {
      insights.push('Plasticity shows high variability across different debates');
    } else {
      insights.push('Plasticity remains consistent across different debates');
    }

    return insights;
  }

  private async calculateDimensionScores(userId: string, request: VisualizationRequest): Promise<number[]> {
    // Get user's measurements
    const measurements = await this.getFilteredMeasurements({
      userId,
      timeRange: request.timeRange,
      filters: request.filters,
    });

    if (measurements.length === 0) {
      return [0, 0, 0, 0, 0, 0]; // Six dimensions, all zero
    }

    // Calculate dimension scores from metadata
    const scores = {
      positionFlexibility: 0,
      confidenceAdaptation: 0,
      reasoningEvolution: 0,
      evidenceIntegration: 0,
      perspectiveTaking: 0,
      contextualAwareness: 0,
    };

    measurements.forEach(m => {
      const metadata = m.metadata as any;
      scores.positionFlexibility += m.value;
      scores.confidenceAdaptation += Math.abs(metadata?.confidence_change || 0);
      scores.reasoningEvolution += this.extractReasoningScore(metadata);
      scores.evidenceIntegration += this.extractEvidenceScore(metadata);
      scores.perspectiveTaking += this.extractPerspectiveScore(metadata);
      scores.contextualAwareness += this.extractContextualScore(metadata);
    });

    // Average the scores
    const count = measurements.length;
    return [
      scores.positionFlexibility / count,
      Math.min(1, scores.confidenceAdaptation / count),
      Math.min(1, scores.reasoningEvolution / count),
      Math.min(1, scores.evidenceIntegration / count),
      Math.min(1, scores.perspectiveTaking / count),
      Math.min(1, scores.contextualAwareness / count),
    ];
  }

  private async getUserMeasurementCount(userId: string): Promise<number> {
    return this.prismaService.learningAnalytics.count({
      where: {
        user_id: userId,
        metric_type: 'POSITION_FLEXIBILITY'
      }
    });
  }

  private identifyCommonPatterns(measurements: any[]): string[] {
    const patterns: Record<string, number> = {};
    
    measurements.forEach(m => {
      const metadata = m.metadata as any;
      const pattern = metadata?.movement_pattern;
      if (pattern) {
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      }
    });

    return Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([pattern]) => pattern);
  }

  private generateKeyFindings(
    meanPlasticity: number,
    plasticityRange: { min: number; max: number },
    significantChanges: number,
    patternDistribution: Record<string, number>,
    categoryAnalysis: Record<string, any>
  ): string[] {
    const findings: string[] = [];

    findings.push(`Average opinion plasticity: ${(meanPlasticity * 100).toFixed(1)}%`);
    
    if (plasticityRange.max - plasticityRange.min > 0.7) {
      findings.push('Wide range of plasticity levels observed across participants');
    }

    if (significantChanges > 0) {
      findings.push(`${significantChanges} instances of substantial opinion change identified`);
    }

    // Most common pattern
    const mostCommonPattern = Object.entries(patternDistribution)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonPattern) {
      findings.push(`Most common change pattern: ${mostCommonPattern[0]}`);
    }

    // Category insights
    const bestCategory = Object.entries(categoryAnalysis)
      .sort(([,a], [,b]) => b.averagePlasticity - a.averagePlasticity)[0];
    
    if (bestCategory) {
      findings.push(`Highest plasticity observed in ${bestCategory[0]} topics`);
    }

    return findings;
  }

  private generateResearchRecommendations(
    keyFindings: string[],
    categoryAnalysis: Record<string, any>,
    userCount: number,
    debateCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (userCount < 30) {
      recommendations.push('Consider expanding sample size for more robust statistical analysis');
    }

    if (debateCount < userCount * 3) {
      recommendations.push('Additional debate sessions would strengthen longitudinal analysis');
    }

    // Category-specific recommendations
    const lowPlasticityCategories = Object.entries(categoryAnalysis)
      .filter(([, analysis]) => analysis.averagePlasticity < 0.4)
      .map(([category]) => category);

    if (lowPlasticityCategories.length > 0) {
      recommendations.push(
        `Consider different pedagogical approaches for ${lowPlasticityCategories.join(', ')} topics`
      );
    }

    recommendations.push('Implement targeted interventions for students showing consistently low plasticity');
    recommendations.push('Use high-plasticity students as peer mentors in future debates');

    return recommendations;
  }

  private calculateTimeSpan(measurements: any[]): string {
    if (measurements.length === 0) return 'No data';

    const dates = measurements.map(m => m.measurement_date.getTime());
    const earliest = Math.min(...dates);
    const latest = Math.max(...dates);
    const spanMs = latest - earliest;
    const spanDays = spanMs / (1000 * 60 * 60 * 24);

    if (spanDays < 7) {
      return `${Math.ceil(spanDays)} days`;
    } else if (spanDays < 30) {
      return `${Math.ceil(spanDays / 7)} weeks`;
    } else {
      return `${Math.ceil(spanDays / 30)} months`;
    }
  }

  private categorizeSampleSize(count: number): string {
    if (count < 10) return 'Small (n < 10)';
    if (count < 30) return 'Moderate (10 ≤ n < 30)';
    if (count < 100) return 'Large (30 ≤ n < 100)';
    return 'Very Large (n ≥ 100)';
  }

  // Helper methods for extracting scores from metadata
  private extractConfidenceFromMetadata(metadata: any): number {
    return metadata?.confidence_change || 0;
  }

  private extractCategoryFromMetadata(metadata: any): string {
    const changes = metadata?.position_changes;
    if (changes && changes.length > 0) {
      return changes[0].category;
    }
    return 'general';
  }

  private extractReliabilityFromMetadata(metadata: any): number {
    return metadata?.reliability || 0.5;
  }

  private extractReasoningScore(metadata: any): number {
    const changes = metadata?.position_changes || [];
    const reasoningEvolutions = changes.filter((c: any) => c.reasoningEvolution);
    return reasoningEvolutions.length / Math.max(1, changes.length);
  }

  private extractEvidenceScore(metadata: any): number {
    // This would analyze evidence usage patterns from the stored metadata
    return 0.6; // Placeholder
  }

  private extractPerspectiveScore(metadata: any): number {
    // This would analyze perspective-taking indicators from the stored metadata
    return 0.7; // Placeholder
  }

  private extractContextualScore(metadata: any): number {
    const contextual = metadata?.contextual_plasticity;
    if (!contextual) return 0.5;
    
    return (
      contextual.topicDifficultyAdjusted +
      contextual.controversyAdjusted +
      contextual.peerInfluenceAdjusted
    ) / 3;
  }

  // Export methods
  private async exportToCSV(
    measurements: any[], 
    anonymize: boolean, 
    includeMetadata?: boolean
  ): Promise<{ data: string; filename: string; contentType: string }> {
    const headers = [
      'measurement_id',
      anonymize ? 'participant_id' : 'user_id',
      'debate_id',
      'measurement_date',
      'plasticity_score',
      'movement_pattern',
      'average_magnitude',
      'max_magnitude',
      'confidence_change',
      'reliability',
    ];

    if (includeMetadata) {
      headers.push('metadata');
    }

    const rows = measurements.map((m, index) => {
      const row = [
        m.id,
        anonymize ? `P${index + 1}` : m.user_id,
        m.debate_id || '',
        m.measurement_date.toISOString(),
        m.value.toString(),
        (m.metadata as any)?.movement_pattern || '',
        (m.metadata as any)?.average_magnitude?.toString() || '',
        (m.metadata as any)?.max_magnitude?.toString() || '',
        (m.metadata as any)?.confidence_change?.toString() || '',
        (m.metadata as any)?.reliability?.toString() || '',
      ];

      if (includeMetadata) {
        row.push(JSON.stringify(m.metadata));
      }

      return row;
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    return {
      data: csvContent,
      filename: `plasticity_data_${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv',
    };
  }

  private async exportToJSON(
    measurements: any[], 
    anonymize: boolean, 
    includeMetadata?: boolean
  ): Promise<{ data: string; filename: string; contentType: string }> {
    const jsonData = {
      exportInfo: {
        generatedAt: new Date().toISOString(),
        anonymized: anonymize,
        includesMetadata: includeMetadata,
        recordCount: measurements.length,
      },
      measurements: measurements.map((m, index) => ({
        measurementId: m.id,
        userId: anonymize ? `P${index + 1}` : m.user_id,
        debateId: m.debate_id,
        measurementDate: m.measurement_date.toISOString(),
        plasticityScore: m.value,
        movementPattern: (m.metadata as any)?.movement_pattern,
        averageMagnitude: (m.metadata as any)?.average_magnitude,
        maxMagnitude: (m.metadata as any)?.max_magnitude,
        confidenceChange: (m.metadata as any)?.confidence_change,
        reliability: (m.metadata as any)?.reliability,
        ...(includeMetadata && { fullMetadata: m.metadata }),
      })),
    };

    return {
      data: JSON.stringify(jsonData, null, 2),
      filename: `plasticity_data_${new Date().toISOString().split('T')[0]}.json`,
      contentType: 'application/json',
    };
  }

  private async exportToSPSS(
    measurements: any[], 
    anonymize: boolean, 
    includeMetadata?: boolean
  ): Promise<{ data: string; filename: string; contentType: string }> {
    // SPSS syntax file for importing the data
    const spssCommands = [
      'DATA LIST FREE',
      '  /measurement_id (A20)',
      `  /${anonymize ? 'participant_id' : 'user_id'} (A20)`,
      '  /debate_id (A20)',
      '  /measurement_date (A20)',
      '  /plasticity_score (F8.3)',
      '  /movement_pattern (A20)',
      '  /average_magnitude (F8.3)',
      '  /max_magnitude (F8.3)',
      '  /confidence_change (F8.3)',
      '  /reliability (F8.3).',
      '',
      'BEGIN DATA.',
    ];

    const dataRows = measurements.map((m, index) => [
      m.id,
      anonymize ? `P${index + 1}` : m.user_id,
      m.debate_id || 'NULL',
      m.measurement_date.toISOString(),
      m.value,
      (m.metadata as any)?.movement_pattern || 'NULL',
      (m.metadata as any)?.average_magnitude || 0,
      (m.metadata as any)?.max_magnitude || 0,
      (m.metadata as any)?.confidence_change || 0,
      (m.metadata as any)?.reliability || 0.5,
    ].join(' '));

    const spssContent = [
      ...spssCommands,
      ...dataRows,
      'END DATA.',
      '',
      'VARIABLE LABELS',
      '  plasticity_score "Overall Opinion Plasticity Score"',
      '  movement_pattern "Opinion Movement Pattern"',
      '  average_magnitude "Average Position Change Magnitude"',
      '  max_magnitude "Maximum Position Change"',
      '  confidence_change "Change in Confidence Level"',
      '  reliability "Measurement Reliability Score".',
      '',
      'VALUE LABELS',
      '  movement_pattern',
      '    "towards_center" "Movement Toward Center"',
      '    "away_from_center" "Movement Away from Center"',
      '    "position_swap" "Position Reversal"',
      '    "strengthening" "Position Strengthening"',
      '    "mixed" "Mixed Movement Pattern".',
    ].join('\n');

    return {
      data: spssContent,
      filename: `plasticity_analysis_${new Date().toISOString().split('T')[0]}.sps`,
      contentType: 'text/plain',
    };
  }
}
