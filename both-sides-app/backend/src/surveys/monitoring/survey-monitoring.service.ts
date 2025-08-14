/**
 * Phase 3 Task 3.1.5.4: Survey Administration and Monitoring
 * Real-time monitoring, quality dashboards, and optimization tools
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SurveyQualityService } from '../validators/survey-quality.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface SurveyHealthMetrics {
  overall_health: 'healthy' | 'warning' | 'critical';
  completion_rate: number;
  average_quality_score: number;
  response_rate_trend: 'increasing' | 'stable' | 'decreasing';
  error_rate: number;
  flagged_responses_count: number;
  active_users: number;
  system_performance: SystemPerformance;
  recommendations: HealthRecommendation[];
}

export interface SystemPerformance {
  api_response_time: number;
  database_query_time: number;
  error_frequency: number;
  concurrent_users: number;
  memory_usage: number;
  cpu_usage: number;
}

export interface HealthRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'quality' | 'user_experience' | 'technical';
  title: string;
  description: string;
  action_items: string[];
  estimated_impact: string;
}

export interface FlaggedResponse {
  id: string;
  user_id: string;
  question_id: string;
  response_data: any;
  flags: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    reason: string;
    confidence: number;
    auto_generated: boolean;
  }>;
  flagged_at: Date;
  reviewed: boolean;
  reviewer_id?: string;
  reviewer_action?: 'approved' | 'rejected' | 'modified';
  reviewer_notes?: string;
}

export interface SurveyOptimization {
  survey_id: string;
  optimization_type: 'question_order' | 'content_clarity' | 'response_options' | 'timing';
  current_performance: number;
  suggested_changes: OptimizationSuggestion[];
  expected_improvement: number;
  confidence: number;
}

export interface OptimizationSuggestion {
  type: 'modify' | 'reorder' | 'remove' | 'add';
  target: string;
  current_state: any;
  suggested_state: any;
  reason: string;
  impact_estimate: string;
}

@Injectable()
export class SurveyMonitoringService {
  private readonly logger = new Logger(SurveyMonitoringService.name);
  private healthMetricsCache: SurveyHealthMetrics | null = null;
  private lastHealthCheck: Date | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly qualityService: SurveyQualityService
  ) {}

  /**
   * Get real-time survey health metrics
   */
  async getSurveyHealthMetrics(surveyId?: string, forceRefresh = false): Promise<SurveyHealthMetrics> {
    // Use cache if recent and not forcing refresh
    if (!forceRefresh && this.healthMetricsCache && this.lastHealthCheck) {
      const cacheAge = Date.now() - this.lastHealthCheck.getTime();
      if (cacheAge < 5 * 60 * 1000) { // 5 minutes cache
        return this.healthMetricsCache;
      }
    }

    const metrics = await this.calculateHealthMetrics(surveyId);
    
    // Update cache
    this.healthMetricsCache = metrics;
    this.lastHealthCheck = new Date();
    
    return metrics;
  }

  /**
   * Get flagged responses for admin review
   */
  async getFlaggedResponses(
    filters: {
      severity?: 'low' | 'medium' | 'high';
      reviewed?: boolean;
      flagType?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{ responses: FlaggedResponse[]; total: number; hasMore: boolean }> {
    
    const where: any = {};
    
    if (filters.reviewed !== undefined) {
      where.reviewed = filters.reviewed;
    }
    
    if (filters.dateFrom || filters.dateTo) {
      where.flagged_at = {};
      if (filters.dateFrom) where.flagged_at.gte = filters.dateFrom;
      if (filters.dateTo) where.flagged_at.lte = filters.dateTo;
    }

    const [flaggedResponses, total] = await Promise.all([
      this.prisma.surveyResponseFlag.findMany({
        where,
        include: {
          response: {
            include: {
              question: true,
              profile: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: { flagged_at: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.surveyResponseFlag.count({ where }),
    ]);

    const formattedResponses: FlaggedResponse[] = flaggedResponses.map(flag => ({
      id: flag.id,
      user_id: flag.response.profile.user_id,
      question_id: flag.response.question_id,
      response_data: {
        value: flag.response.response_value,
        text: flag.response.response_text,
        confidence: flag.response.confidence_level,
        completion_time: flag.response.completion_time,
      },
      flags: [
        {
          type: flag.flag_type,
          severity: flag.severity as 'low' | 'medium' | 'high',
          reason: flag.reason,
          confidence: flag.confidence,
          auto_generated: flag.auto_generated,
        },
      ],
      flagged_at: flag.flagged_at,
      reviewed: flag.reviewed,
      reviewer_id: flag.reviewer_id,
      reviewer_action: flag.reviewer_action as 'approved' | 'rejected' | 'modified',
      reviewer_notes: flag.reviewer_notes,
    }));

    return {
      responses: formattedResponses,
      total,
      hasMore: pagination.page * pagination.limit < total,
    };
  }

  /**
   * Review a flagged response
   */
  async reviewFlaggedResponse(
    flaggedResponseId: string,
    reviewerId: string,
    action: 'approved' | 'rejected' | 'modified',
    notes?: string,
    modifications?: any
  ): Promise<void> {
    await this.prisma.surveyResponseFlag.update({
      where: { id: flaggedResponseId },
      data: {
        reviewed: true,
        reviewer_id: reviewerId,
        reviewer_action: action,
        reviewer_notes: notes,
        reviewed_at: new Date(),
      },
    });

    // If modifications were made, update the response
    if (action === 'modified' && modifications) {
      const flag = await this.prisma.surveyResponseFlag.findUnique({
        where: { id: flaggedResponseId },
        include: { response: true },
      });

      if (flag) {
        await this.prisma.surveyResponse.update({
          where: { id: flag.response_id },
          data: modifications,
        });
      }
    }

    this.logger.log(`Flagged response ${flaggedResponseId} reviewed by ${reviewerId}: ${action}`);
  }

  /**
   * Generate survey optimization recommendations
   */
  async generateOptimizationRecommendations(surveyId: string): Promise<SurveyOptimization[]> {
    const optimizations: SurveyOptimization[] = [];

    // Analyze question performance
    const questionAnalysis = await this.analyzeQuestionPerformance(surveyId);
    
    // Suggest question order optimization
    const orderOptimization = this.suggestQuestionOrderOptimization(questionAnalysis);
    if (orderOptimization.suggestions.length > 0) {
      optimizations.push(orderOptimization);
    }

    // Suggest content clarity improvements
    const clarityOptimization = this.suggestContentClarityImprovements(questionAnalysis);
    if (clarityOptimization.suggestions.length > 0) {
      optimizations.push(clarityOptimization);
    }

    // Suggest timing improvements
    const timingOptimization = this.suggestTimingOptimizations(questionAnalysis);
    if (timingOptimization.suggestions.length > 0) {
      optimizations.push(timingOptimization);
    }

    return optimizations;
  }

  /**
   * Scheduled health check that runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledHealthCheck(): Promise<void> {
    try {
      const metrics = await this.getSurveyHealthMetrics(undefined, true);
      
      // Alert on critical issues
      if (metrics.overall_health === 'critical') {
        await this.sendCriticalHealthAlert(metrics);
      }
      
      // Log health status
      this.logger.log(`Survey health check: ${metrics.overall_health}`, {
        completion_rate: metrics.completion_rate,
        error_rate: metrics.error_rate,
        flagged_responses: metrics.flagged_responses_count,
      });
      
    } catch (error) {
      this.logger.error('Health check failed', error);
    }
  }

  /**
   * Scheduled cleanup of old data
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledDataCleanup(): Promise<void> {
    try {
      // Clean up old error logs
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days
      
      await this.prisma.surveyErrorLog.deleteMany({
        where: {
          created_at: {
            lt: cutoffDate,
          },
        },
      });

      // Archive old flagged responses that have been reviewed
      await this.prisma.surveyResponseFlag.updateMany({
        where: {
          reviewed: true,
          reviewed_at: {
            lt: cutoffDate,
          },
        },
        data: {
          archived: true,
        },
      });

      this.logger.log('Data cleanup completed');
    } catch (error) {
      this.logger.error('Data cleanup failed', error);
    }
  }

  // Private helper methods
  private async calculateHealthMetrics(surveyId?: string): Promise<SurveyHealthMetrics> {
    const whereClause = surveyId ? { survey_id: surveyId } : {};

    // Calculate completion rate
    const [totalProfiles, profilesWithResponses] = await Promise.all([
      this.prisma.profile.count(),
      this.prisma.profile.count({
        where: {
          survey_responses: {
            some: whereClause,
          },
        },
      }),
    ]);

    const completionRate = totalProfiles > 0 ? (profilesWithResponses / totalProfiles) * 100 : 0;

    // Calculate average quality score
    const avgQualityScore = await this.calculateAverageQualityScore(surveyId);

    // Calculate error rate
    const errorRate = await this.calculateErrorRate();

    // Count flagged responses
    const flaggedResponsesCount = await this.prisma.surveyResponseFlag.count({
      where: {
        reviewed: false,
        ...whereClause,
      },
    });

    // Count active users (responses in last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const activeUsers = await this.prisma.surveyResponse.findMany({
      where: {
        responded_at: {
          gte: yesterday,
        },
        ...whereClause,
      },
      distinct: ['profile_id'],
    }).then(responses => responses.length);

    // System performance metrics
    const systemPerformance = await this.getSystemPerformanceMetrics();

    // Determine overall health
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (completionRate < 30 || errorRate > 5 || flaggedResponsesCount > 50) {
      overallHealth = 'critical';
    } else if (completionRate < 50 || errorRate > 2 || flaggedResponsesCount > 20) {
      overallHealth = 'warning';
    }

    // Generate recommendations
    const recommendations = this.generateHealthRecommendations({
      completionRate,
      errorRate,
      flaggedResponsesCount,
      avgQualityScore,
      systemPerformance,
    });

    return {
      overall_health: overallHealth,
      completion_rate: completionRate,
      average_quality_score: avgQualityScore,
      response_rate_trend: 'stable', // Would calculate trend from historical data
      error_rate: errorRate,
      flagged_responses_count: flaggedResponsesCount,
      active_users: activeUsers,
      system_performance: systemPerformance,
      recommendations,
    };
  }

  private async calculateAverageQualityScore(surveyId?: string): Promise<number> {
    // This would integrate with the quality service to get quality scores
    // For now, return a placeholder
    return 75;
  }

  private async calculateErrorRate(): Promise<number> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const [totalRequests, errorCount] = await Promise.all([
      this.prisma.surveyResponse.count({
        where: {
          responded_at: {
            gte: oneDayAgo,
          },
        },
      }),
      this.prisma.surveyErrorLog.count({
        where: {
          created_at: {
            gte: oneDayAgo,
          },
        },
      }),
    ]);

    return totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
  }

  private async getSystemPerformanceMetrics(): Promise<SystemPerformance> {
    // In a real implementation, this would collect actual performance metrics
    // For now, return mock data
    return {
      api_response_time: 150, // ms
      database_query_time: 25, // ms
      error_frequency: 0.5, // errors per minute
      concurrent_users: 45,
      memory_usage: 68, // percentage
      cpu_usage: 35, // percentage
    };
  }

  private generateHealthRecommendations(metrics: {
    completionRate: number;
    errorRate: number;
    flaggedResponsesCount: number;
    avgQualityScore: number;
    systemPerformance: SystemPerformance;
  }): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = [];

    // Low completion rate
    if (metrics.completionRate < 50) {
      recommendations.push({
        priority: 'high',
        category: 'user_experience',
        title: 'Improve Survey Completion Rate',
        description: `Current completion rate is ${metrics.completionRate.toFixed(1)}%, which is below the recommended 60%`,
        action_items: [
          'Review survey length and consider reducing question count',
          'Improve question clarity and reduce cognitive load',
          'Add progress indicators and motivation elements',
          'Analyze drop-off points to identify problematic questions',
        ],
        estimated_impact: 'Could increase completion rate by 15-25%',
      });
    }

    // High error rate
    if (metrics.errorRate > 2) {
      recommendations.push({
        priority: 'critical',
        category: 'technical',
        title: 'Reduce Error Rate',
        description: `Current error rate is ${metrics.errorRate.toFixed(1)}%, which indicates system reliability issues`,
        action_items: [
          'Investigate and fix common error sources',
          'Improve error handling and recovery mechanisms',
          'Enhance input validation to prevent invalid submissions',
          'Monitor database performance and optimize slow queries',
        ],
        estimated_impact: 'Critical for user experience and data quality',
      });
    }

    // Many flagged responses
    if (metrics.flaggedResponsesCount > 20) {
      recommendations.push({
        priority: 'medium',
        category: 'quality',
        title: 'Review Flagged Responses',
        description: `There are ${metrics.flaggedResponsesCount} flagged responses awaiting review`,
        action_items: [
          'Review flagged responses to identify patterns',
          'Adjust automatic flagging sensitivity if needed',
          'Provide additional guidance for problematic question types',
          'Consider implementing real-time response validation',
        ],
        estimated_impact: 'Improves data quality and user guidance',
      });
    }

    // Low quality score
    if (metrics.avgQualityScore < 60) {
      recommendations.push({
        priority: 'high',
        category: 'quality',
        title: 'Improve Response Quality',
        description: `Average quality score is ${metrics.avgQualityScore}, indicating potential issues with response thoughtfulness`,
        action_items: [
          'Review questions for clarity and engagement',
          'Add examples or clarifications to complex questions',
          'Implement better progress feedback and motivation',
          'Consider gamification elements to increase engagement',
        ],
        estimated_impact: 'Higher quality responses lead to better belief profiling',
      });
    }

    // High system load
    if (metrics.systemPerformance.cpu_usage > 80 || metrics.systemPerformance.memory_usage > 85) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: 'Optimize System Performance',
        description: 'System resource usage is high and may impact user experience',
        action_items: [
          'Review and optimize database queries',
          'Implement or improve caching strategies',
          'Consider scaling infrastructure resources',
          'Profile application performance for bottlenecks',
        ],
        estimated_impact: 'Faster response times and better user experience',
      });
    }

    return recommendations;
  }

  private async sendCriticalHealthAlert(metrics: SurveyHealthMetrics): Promise<void> {
    // In a real implementation, this would send alerts via email, Slack, etc.
    this.logger.error('CRITICAL: Survey health degraded', {
      completion_rate: metrics.completion_rate,
      error_rate: metrics.error_rate,
      flagged_responses: metrics.flagged_responses_count,
      recommendations: metrics.recommendations.map(r => r.title),
    });
  }

  private async analyzeQuestionPerformance(surveyId: string): Promise<any> {
    // Analyze each question's performance metrics
    const questions = await this.prisma.surveyQuestion.findMany({
      where: { survey_id: surveyId },
      include: {
        responses: {
          include: {
            profile: true,
          },
        },
      },
    });

    return questions.map(question => ({
      id: question.id,
      type: question.type,
      category: question.category,
      question: question.question,
      response_count: question.responses.length,
      avg_completion_time: question.responses.length > 0 
        ? question.responses.reduce((sum, r) => sum + r.completion_time, 0) / question.responses.length
        : 0,
      skip_rate: 0, // Would calculate from drop-off data
      quality_score: 75, // Would calculate from quality metrics
    }));
  }

  private suggestQuestionOrderOptimization(questionAnalysis: any[]): SurveyOptimization {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Find questions with high completion times that might benefit from reordering
    const slowQuestions = questionAnalysis.filter(q => q.avg_completion_time > 60000); // > 1 minute
    
    if (slowQuestions.length > 0) {
      suggestions.push({
        type: 'reorder',
        target: 'question_sequence',
        current_state: 'Complex questions at beginning',
        suggested_state: 'Easy questions first, complex questions later',
        reason: 'Reduce early survey abandonment',
        impact_estimate: 'Could improve completion rate by 10-15%',
      });
    }

    return {
      survey_id: questionAnalysis[0]?.survey_id || '',
      optimization_type: 'question_order',
      current_performance: 70,
      suggested_changes: suggestions,
      expected_improvement: 15,
      confidence: 0.8,
    };
  }

  private suggestContentClarityImprovements(questionAnalysis: any[]): SurveyOptimization {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Find questions with low quality scores
    const unclearQuestions = questionAnalysis.filter(q => q.quality_score < 60);
    
    unclearQuestions.forEach(question => {
      suggestions.push({
        type: 'modify',
        target: question.id,
        current_state: question.question,
        suggested_state: 'Add examples or clarify wording',
        reason: 'Low response quality indicates confusion',
        impact_estimate: 'Improve response quality by 20%',
      });
    });

    return {
      survey_id: questionAnalysis[0]?.survey_id || '',
      optimization_type: 'content_clarity',
      current_performance: 65,
      suggested_changes: suggestions,
      expected_improvement: 20,
      confidence: 0.7,
    };
  }

  private suggestTimingOptimizations(questionAnalysis: any[]): SurveyOptimization {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Suggest breaking up long surveys
    const totalQuestions = questionAnalysis.length;
    if (totalQuestions > 20) {
      suggestions.push({
        type: 'modify',
        target: 'survey_structure',
        current_state: `${totalQuestions} questions in single session`,
        suggested_state: 'Break into multiple shorter sessions',
        reason: 'Long surveys cause fatigue and reduced quality',
        impact_estimate: 'Reduce abandonment by 25%',
      });
    }

    return {
      survey_id: questionAnalysis[0]?.survey_id || '',
      optimization_type: 'timing',
      current_performance: 60,
      suggested_changes: suggestions,
      expected_improvement: 25,
      confidence: 0.9,
    };
  }
}
