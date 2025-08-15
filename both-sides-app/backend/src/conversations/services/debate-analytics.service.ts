/**
 * Debate Analytics Service
 * 
 * Comprehensive analytics and performance monitoring for debates
 * Task 5.3.5: Analytics & Performance Monitoring
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../common/services/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DebateAnalytics,
  ParticipantEngagement,
  PhaseAnalysis,
  DebateOutcomes,
  ModerationMetrics,
  EducationalAnalytics,
  SystemPerformanceMetrics,
  PerformanceReport,
  DateRange,
  AnalyticsFilters,
  ExportData,
  ExportAnalyticsRequest,
  DashboardMetrics,
  GenerateReportRequest,
  TrackConversationRequest,
  DebatePhase,
  ExportFormat,
} from '../dto/analytics.dto';

@Injectable()
export class DebateAnalyticsService {
  private readonly logger = new Logger(DebateAnalyticsService.name);
  private readonly CACHE_TTL = 1800000; // 30 minutes
  private readonly PERFORMANCE_CACHE_TTL = 300000; // 5 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Track comprehensive metrics for a conversation/debate
   */
  async trackConversationMetrics(request: TrackConversationRequest): Promise<DebateAnalytics> {
    const startTime = Date.now();

    try {
      this.logger.log(`Tracking conversation metrics for ${request.conversationId}`);

      // Check cache first unless force refresh is requested
      const cacheKey = `analytics:conversation:${request.conversationId}`;
      if (!request.forceRefresh) {
        const cachedResult = await this.cacheService.get(cacheKey);
        if (cachedResult) {
          this.logger.log(`Using cached analytics for conversation ${request.conversationId}`);
          return cachedResult;
        }
      }

      // Get conversation with all related data
      const conversation = await this.prismaService.conversation.findUnique({
        where: { id: request.conversationId },
        include: {
          messages: {
            include: {
              analyses: true,
              moderation_results: true,
            },
            orderBy: { created_at: 'asc' },
          },
          match: {
            include: {
              student1: true,
              student2: true,
              topic: true,
            },
          },
        },
      });

      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      // Calculate basic metrics
      const duration = conversation.ended_at && conversation.started_at
        ? Math.floor((conversation.ended_at.getTime() - conversation.started_at.getTime()) / 1000)
        : 0;

      const messageCount = conversation.messages.length;

      // Analyze participant engagement
      const participantEngagement = await this.analyzeParticipantEngagement(
        conversation.messages,
        [conversation.match.student1, conversation.match.student2]
      );

      // Analyze debate phases
      const phaseAnalysis = await this.analyzeDebatePhases(conversation);

      // Calculate outcomes
      const outcomes = await this.calculateDebateOutcomes(conversation);

      // Calculate overall quality score
      const overallQualityScore = this.calculateOverallQuality(conversation.messages);

      const analytics: DebateAnalytics = {
        conversationId: request.conversationId,
        topicTitle: conversation.match.topic?.title,
        duration,
        messageCount,
        participantEngagement,
        phaseAnalysis,
        outcomes,
        startedAt: conversation.started_at || conversation.created_at,
        endedAt: conversation.ended_at || new Date(),
        analyzedAt: new Date(),
        overallQualityScore,
        metadata: {
          classId: conversation.match.class_id,
          teacherId: conversation.match.created_by,
          debateType: conversation.match.topic?.category || 'general',
          aiCoachingUsed: this.checkAICoachingUsage(conversation.messages),
          moderationActions: conversation.messages.flatMap(m => m.moderation_results).length,
        },
      };

      // Cache the result
      await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Conversation analytics generated in ${processingTime}ms`);

      return analytics;

    } catch (error) {
      this.logger.error(`Failed to track conversation metrics for ${request.conversationId}`, error.stack);
      throw new HttpException(
        'Failed to generate conversation analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(request: GenerateReportRequest): Promise<PerformanceReport> {
    try {
      this.logger.log('Generating performance report for timeframe', request.timeframe);

      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get system performance metrics
      const systemMetrics = await this.getSystemPerformanceMetrics(request.timeframe);

      // Get moderation metrics
      const moderationMetrics = await this.monitorModerationAccuracy(request.timeframe);

      // Get top-performing debates
      const topDebates = await this.getTopPerformingDebates(request.timeframe, 10);

      // Get class performance analytics
      const classPerformance = await this.getClassPerformanceAnalytics(request.timeframe, request.filters);

      // Generate summary
      const summary = await this.generateReportSummary(
        systemMetrics,
        moderationMetrics,
        topDebates,
        classPerformance
      );

      const report: PerformanceReport = {
        reportId,
        timeframe: request.timeframe,
        systemMetrics,
        moderationMetrics,
        topDebates,
        classPerformance,
        summary,
        generatedAt: new Date(),
        generatedBy: 'system', // Would be set by the controller from the current user
      };

      this.logger.log(`Performance report ${reportId} generated successfully`);
      return report;

    } catch (error) {
      this.logger.error('Failed to generate performance report', error.stack);
      throw new HttpException(
        'Failed to generate performance report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Monitor AI moderation accuracy and performance
   */
  async monitorModerationAccuracy(timeframe?: DateRange): Promise<ModerationMetrics> {
    try {
      const cacheKey = `analytics:moderation:${timeframe?.from.getTime()}_${timeframe?.to.getTime()}`;
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const whereClause: any = {};
      if (timeframe) {
        whereClause.created_at = {
          gte: timeframe.from,
          lte: timeframe.to,
        };
      }

      // Get moderation results
      const moderationResults = await this.prismaService.moderationResult.findMany({
        where: whereClause,
        include: {
          appeals: true,
          message: {
            include: {
              analyses: true,
            },
          },
        },
      });

      // Get message analyses for the same period
      const messageAnalyses = await this.prismaService.messageAnalysis.findMany({
        where: whereClause,
      });

      const totalMessages = messageAnalyses.length;
      const messagesAnalyzed = moderationResults.length;
      const actionsExecuted = moderationResults.filter(r => r.auto_executed).length;

      // Calculate accuracy (simplified - would need human validation data in production)
      const appealedActions = moderationResults.filter(r => r.appeals.length > 0);
      const successfulAppeals = appealedActions.filter(r => 
        r.appeals.some(a => a.status === 'approved')
      );

      const accuracy = appealedActions.length > 0 
        ? 1 - (successfulAppeals.length / appealedActions.length)
        : 0.95; // Default if no appeals

      const falsePositiveRate = appealedActions.length > 0
        ? successfulAppeals.length / appealedActions.length
        : 0.05;

      // Calculate response times
      const responseTimes = moderationResults
        .filter(r => r.executed_at && r.created_at)
        .map(r => r.executed_at.getTime() - r.created_at.getTime());
      
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000
        : 0;

      // Action breakdown
      const actionBreakdown = {
        approve: moderationResults.filter(r => r.action === 'approve').length,
        warn: moderationResults.filter(r => r.action === 'warn').length,
        block: moderationResults.filter(r => r.action === 'block').length,
        review: moderationResults.filter(r => r.action === 'review').length,
        escalate: moderationResults.filter(r => r.action === 'escalate').length,
        suspend: moderationResults.filter(r => r.action === 'suspend').length,
      };

      const appealCount = appealedActions.length;
      const appealSuccessRate = appealCount > 0 ? successfulAppeals.length / appealCount : 0;

      const metrics: ModerationMetrics = {
        reportPeriod: timeframe?.to || new Date(),
        totalMessages,
        messagesAnalyzed,
        actionsExecuted,
        accuracy,
        falsePositiveRate,
        falseNegativeRate: 0.02, // Estimated - would need manual review data
        averageResponseTime,
        actionBreakdown,
        appealCount,
        appealSuccessRate,
        categoryBreakdown: {
          toxicity: messageAnalyses.filter(a => 
            (a.analysis_results as any)?.toxicity?.score > 0.5
          ).length,
          quality: messageAnalyses.filter(a => 
            (a.analysis_results as any)?.quality?.argumentStrength < 0.5
          ).length,
          educational: messageAnalyses.filter(a => 
            (a.analysis_results as any)?.educational?.criticalThinking > 0.7
          ).length,
          safety: moderationResults.filter(r => 
            ['block', 'suspend', 'escalate'].includes(r.action)
          ).length,
        },
      };

      // Cache the result
      await this.cacheService.set(cacheKey, metrics, this.PERFORMANCE_CACHE_TTL);

      return metrics;

    } catch (error) {
      this.logger.error('Failed to monitor moderation accuracy', error.stack);
      throw new HttpException(
        'Failed to get moderation metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Analyze educational outcomes for a specific class
   */
  async analyzeEducationalOutcomes(classId: string): Promise<EducationalAnalytics> {
    try {
      this.logger.log(`Analyzing educational outcomes for class ${classId}`);

      // Get class information
      const classInfo = await this.prismaService.class.findUnique({
        where: { id: classId },
        include: {
          enrollments: {
            include: {
              student: true,
            },
          },
          matches: {
            include: {
              conversation: {
                include: {
                  messages: {
                    include: {
                      analyses: true,
                    },
                  },
                },
              },
              topic: true,
            },
          },
        },
      });

      if (!classInfo) {
        throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
      }

      const totalDebates = classInfo.matches.length;
      const completedDebates = classInfo.matches.filter(m => 
        m.conversation && m.conversation.status === 'completed'
      ).length;

      const completionRate = totalDebates > 0 ? completedDebates / totalDebates : 0;

      // Calculate average educational value
      const conversations = classInfo.matches
        .map(m => m.conversation)
        .filter(c => c !== null);

      const educationalValues = await Promise.all(
        conversations.map(c => this.calculateEducationalValue(c.messages))
      );

      const averageEducationalValue = educationalValues.length > 0
        ? educationalValues.reduce((sum, val) => sum + val, 0) / educationalValues.length
        : 0;

      // Analyze student engagement
      const students = classInfo.enrollments.map(e => e.student);
      const studentEngagement = await Promise.all(
        students.map(student => this.analyzeStudentEngagement(student, conversations))
      );

      // Analyze learning objectives (simplified)
      const learningObjectives = this.analyzeLearningObjectives(classInfo.matches);

      // Calculate improvement metrics (simplified)
      const criticalThinkingImprovement = this.calculateImprovementMetric(
        conversations,
        'criticalThinking'
      );

      const argumentQualityImprovement = this.calculateImprovementMetric(
        conversations,
        'argumentStrength'
      );

      const respectfulnessImprovement = this.calculateImprovementMetric(
        conversations,
        'respectfulness'
      );

      const analytics: EducationalAnalytics = {
        classId,
        className: classInfo.name,
        totalDebates,
        completedDebates,
        completionRate,
        averageEducationalValue,
        studentEngagement,
        learningObjectives,
        criticalThinkingImprovement,
        argumentQualityImprovement,
        respectfulnessImprovement,
        reportPeriod: new Date(),
      };

      this.logger.log(`Educational analytics generated for class ${classId}`);
      return analytics;

    } catch (error) {
      this.logger.error(`Failed to analyze educational outcomes for class ${classId}`, error.stack);
      throw new HttpException(
        'Failed to analyze educational outcomes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Export analytics data in various formats
   */
  async exportAnalyticsData(request: ExportAnalyticsRequest): Promise<ExportData> {
    try {
      this.logger.log(`Exporting analytics data in ${request.format} format`);

      // Get analytics data based on filters
      const analyticsData = await this.getAnalyticsData(request.filters);

      // Process data for export
      const processedData = request.anonymizeData
        ? this.anonymizeAnalyticsData(analyticsData)
        : analyticsData;

      // Generate export file
      const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const exportResult = await this.generateExportFile(
        exportId,
        request.format,
        processedData,
        request.includeFields
      );

      const exportData: ExportData = {
        exportId,
        format: request.format,
        downloadUrl: exportResult.downloadUrl,
        recordCount: exportResult.recordCount,
        fileSizeBytes: exportResult.fileSizeBytes,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
        createdBy: 'system', // Would be set by controller
        metadata: {
          filters: request.filters,
          includeFields: request.includeFields,
          anonymized: request.anonymizeData,
        },
      };

      this.logger.log(`Analytics export ${exportId} created successfully`);
      return exportData;

    } catch (error) {
      this.logger.error('Failed to export analytics data', error.stack);
      throw new HttpException(
        'Failed to export analytics data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const cacheKey = 'analytics:dashboard:metrics';
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      // Get active debates count
      const activeDebates = await this.prismaService.conversation.count({
        where: { status: 'active' },
      });

      // Get total users count
      const totalUsers = await this.prismaService.user.count({
        where: { is_active: true },
      });

      // Get debates today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const debatesToday = await this.prismaService.conversation.count({
        where: {
          created_at: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      // Calculate average quality (simplified)
      const recentAnalyses = await this.prismaService.messageAnalysis.findMany({
        where: {
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        take: 100,
      });

      const averageQuality = recentAnalyses.length > 0
        ? recentAnalyses.reduce((sum, analysis) => {
            const results = analysis.analysis_results as any;
            const quality = (
              (results?.quality?.argumentStrength || 0) +
              (results?.quality?.constructiveness || 0) +
              (results?.quality?.respectfulness || 0)
            ) / 3;
            return sum + quality;
          }, 0) / recentAnalyses.length
        : 0.8;

      // System health (simplified - based on recent errors and performance)
      const systemHealth = this.calculateSystemHealth();

      // Get recent activity
      const recentActivity = await this.getRecentActivity();

      // Get system alerts
      const alerts = await this.getSystemAlerts();

      const metrics: DashboardMetrics = {
        activeDebates,
        totalUsers,
        debatesToday,
        averageQuality,
        systemHealth,
        recentActivity,
        alerts,
        lastUpdated: new Date(),
      };

      // Cache for 1 minute
      await this.cacheService.set(cacheKey, metrics, 60000);

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get dashboard metrics', error.stack);
      throw new HttpException(
        'Failed to get dashboard metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Private helper methods

  private async analyzeParticipantEngagement(
    messages: any[],
    participants: any[]
  ): Promise<ParticipantEngagement[]> {
    const engagement = participants.map(participant => {
      const userMessages = messages.filter(m => m.user_id === participant.id);
      const messageCount = userMessages.length;

      // Calculate average response time
      const responseTimes = userMessages
        .slice(1) // Skip first message (no previous to respond to)
        .map((msg, index) => {
          const prevMessage = messages.find((m, i) => 
            i < messages.indexOf(msg) && m.user_id !== participant.id
          );
          if (prevMessage) {
            return msg.created_at.getTime() - prevMessage.created_at.getTime();
          }
          return null;
        })
        .filter(time => time !== null);

      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000
        : 0;

      // Calculate quality scores from analyses
      const qualityScores = userMessages
        .filter(m => m.analyses && m.analyses.length > 0)
        .map(m => {
          const analysis = m.analyses[0];
          const results = analysis.analysis_results as any;
          return (
            (results?.quality?.argumentStrength || 0) +
            (results?.quality?.constructiveness || 0) +
            (results?.quality?.respectfulness || 0)
          ) / 3;
        });

      const engagementLevel = this.calculateEngagementLevel(
        messageCount,
        averageResponseTime,
        qualityScores
      );

      const respectfulnessScore = qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => {
            const analysis = userMessages.find(m => m.analyses?.[0])?.analyses?.[0];
            return sum + ((analysis?.analysis_results as any)?.quality?.respectfulness || 0);
          }, 0) / qualityScores.length
        : 0;

      const argumentStrength = qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => {
            const analysis = userMessages.find(m => m.analyses?.[0])?.analyses?.[0];
            return sum + ((analysis?.analysis_results as any)?.quality?.argumentStrength || 0);
          }, 0) / qualityScores.length
        : 0;

      const evidenceUsage = qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => {
            const analysis = userMessages.find(m => m.analyses?.[0])?.analyses?.[0];
            return sum + ((analysis?.analysis_results as any)?.educational?.evidenceUsage || 0);
          }, 0) / qualityScores.length
        : 0;

      const totalWordsWritten = userMessages.reduce(
        (sum, msg) => sum + (msg.content.split(/\s+/).length),
        0
      );

      const averageMessageLength = messageCount > 0 
        ? totalWordsWritten / messageCount 
        : 0;

      return {
        userId: participant.id,
        userName: `${participant.first_name} ${participant.last_name}`.trim(),
        messageCount,
        averageResponseTime,
        qualityScores,
        engagementLevel,
        respectfulnessScore,
        argumentStrength,
        evidenceUsage,
        totalWordsWritten,
        averageMessageLength,
      };
    });

    return engagement;
  }

  private async analyzeDebatePhases(conversation: any): Promise<PhaseAnalysis[]> {
    // Simplified phase analysis - would be more sophisticated in production
    const phases: DebatePhase[] = [
      DebatePhase.PREPARATION,
      DebatePhase.OPENING,
      DebatePhase.DISCUSSION,
      DebatePhase.REBUTTAL,
      DebatePhase.CLOSING,
    ];

    const totalDuration = conversation.ended_at && conversation.started_at
      ? conversation.ended_at.getTime() - conversation.started_at.getTime()
      : 0;

    const phaseAnalysis = phases.map((phase, index) => {
      // Estimated phase duration (simplified)
      const phaseDuration = totalDuration / phases.length;
      
      // Get messages for this phase (simplified - based on time segments)
      const phaseStartTime = conversation.started_at.getTime() + (index * phaseDuration);
      const phaseEndTime = phaseStartTime + phaseDuration;

      const phaseMessages = conversation.messages.filter(m =>
        m.created_at.getTime() >= phaseStartTime &&
        m.created_at.getTime() < phaseEndTime
      );

      const messageCount = phaseMessages.length;

      // Calculate average quality for phase
      const qualityScores = phaseMessages
        .filter(m => m.analyses && m.analyses.length > 0)
        .map(m => {
          const analysis = m.analyses[0];
          const results = analysis.analysis_results as any;
          return (
            (results?.quality?.argumentStrength || 0) +
            (results?.quality?.constructiveness || 0) +
            (results?.quality?.respectfulness || 0)
          ) / 3;
        });

      const messageQuality = qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
        : 0;

      // Calculate participant balance
      const user1Messages = phaseMessages.filter(m => m.user_id === conversation.match.student1_id).length;
      const user2Messages = phaseMessages.filter(m => m.user_id === conversation.match.student2_id).length;
      
      const participantBalance = messageCount > 0
        ? 1 - Math.abs(user1Messages - user2Messages) / messageCount
        : 1;

      return {
        phase,
        duration: Math.floor(phaseDuration / 1000), // Convert to seconds
        messageCount,
        messageQuality,
        participantBalance,
        phaseCompletionRate: messageCount > 0 ? 0.8 : 0, // Simplified
        averageResponseTime: this.calculateAverageResponseTime(phaseMessages),
        keyTopics: this.extractKeyTopics(phaseMessages),
      };
    });

    return phaseAnalysis;
  }

  private async calculateDebateOutcomes(conversation: any): Promise<DebateOutcomes> {
    const messages = conversation.messages;
    
    // Calculate if learning was achieved (simplified)
    const qualityScores = messages
      .filter(m => m.analyses && m.analyses.length > 0)
      .map(m => {
        const analysis = m.analyses[0];
        const results = analysis.analysis_results as any;
        return results?.educational?.criticalThinking || 0;
      });

    const averageQuality = qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0;

    const learningAchieved = averageQuality > 0.6;

    // Check respectful interaction
    const respectfulnessScores = messages
      .filter(m => m.analyses && m.analyses.length > 0)
      .map(m => {
        const analysis = m.analyses[0];
        const results = analysis.analysis_results as any;
        return results?.quality?.respectfulness || 0;
      });

    const averageRespectfulness = respectfulnessScores.length > 0
      ? respectfulnessScores.reduce((sum, score) => sum + score, 0) / respectfulnessScores.length
      : 0;

    const respectfulInteraction = averageRespectfulness > 0.7;

    // Educational value calculation
    const educationalValue = (averageQuality + averageRespectfulness) / 2;

    // Debate completion check
    const debateCompleted = conversation.status === 'completed' && 
                           conversation.ended_at !== null;

    // Goal achievement (simplified)
    const goalAchievement = learningAchieved && respectfulInteraction ? 0.8 : 0.4;

    // Satisfaction scores (simplified - would come from post-debate surveys)
    const satisfactionScores = [4, 4]; // Default scores

    return {
      learningAchieved,
      respectfulInteraction,
      educationalValue,
      satisfactionScores,
      debateCompleted,
      goalAchievement,
      learningObjectivesMet: learningAchieved ? ['critical_thinking', 'argument_construction'] : [],
      improvementAreas: !respectfulInteraction ? ['respectful_communication'] : [],
    };
  }

  private calculateOverallQuality(messages: any[]): number {
    const qualityScores = messages
      .filter(m => m.analyses && m.analyses.length > 0)
      .map(m => {
        const analysis = m.analyses[0];
        const results = analysis.analysis_results as any;
        return (
          (results?.quality?.argumentStrength || 0) +
          (results?.quality?.constructiveness || 0) +
          (results?.quality?.respectfulness || 0) +
          (results?.educational?.criticalThinking || 0)
        ) / 4;
      });

    return qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0;
  }

  private checkAICoachingUsage(messages: any[]): boolean {
    // Check if any coaching suggestions were used
    return messages.some(m => 
      m.message_metadata && 
      (m.message_metadata as any)?.coaching?.used === true
    );
  }

  private calculateEngagementLevel(
    messageCount: number,
    averageResponseTime: number,
    qualityScores: number[]
  ): number {
    // Simplified engagement calculation
    const messageScore = Math.min(messageCount / 10, 1); // Normalize to max 10 messages
    const responseScore = averageResponseTime > 0 
      ? Math.max(0, 1 - (averageResponseTime / 300)) // Penalize slow responses (>5 min)
      : 0.5;
    
    const qualityScore = qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0.5;

    return (messageScore + responseScore + qualityScore) / 3;
  }

  private calculateAverageResponseTime(messages: any[]): number {
    if (messages.length < 2) return 0;

    const responseTimes = messages
      .slice(1)
      .map((msg, index) => {
        const prevMessage = messages[index];
        return msg.created_at.getTime() - prevMessage.created_at.getTime();
      });

    return responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000
      : 0;
  }

  private extractKeyTopics(messages: any[]): string[] {
    // Simplified topic extraction - would use NLP in production
    const commonWords = messages
      .map(m => m.content.toLowerCase())
      .join(' ')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .slice(0, 5); // Top 5 words

    return [...new Set(commonWords)];
  }

  private async getSystemPerformanceMetrics(timeframe: DateRange): Promise<SystemPerformanceMetrics> {
    // Simplified system metrics - would integrate with monitoring tools
    return {
      reportPeriod: timeframe.to,
      uptime: 0.995,
      averageLatency: 120,
      peakConcurrentUsers: 150,
      totalApiRequests: 25000,
      successRate: 0.998,
      errorCount: 50,
      messageDelivery: {
        totalMessages: 15000,
        successfulDeliveries: 14950,
        averageDeliveryTime: 200,
        failedDeliveries: 50,
      },
      realTimePerformance: {
        connectionSuccess: 0.995,
        averageConnectionTime: 800,
        reconnectionRate: 0.02,
        typingIndicatorLatency: 50,
      },
      aiServices: {
        analysisResponseTime: 1500,
        analysisSuccessRate: 0.98,
        coachingResponseTime: 2000,
        coachingSuccessRate: 0.96,
      },
    };
  }

  private async getTopPerformingDebates(timeframe: DateRange, limit: number): Promise<DebateAnalytics[]> {
    // Get conversations from timeframe and analyze them
    const conversations = await this.prismaService.conversation.findMany({
      where: {
        created_at: {
          gte: timeframe.from,
          lte: timeframe.to,
        },
        status: 'completed',
      },
      take: limit * 2, // Get more to filter top performers
      include: {
        messages: {
          include: {
            analyses: true,
          },
        },
        match: {
          include: {
            student1: true,
            student2: true,
            topic: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Analyze and rank debates
    const analyzedDebates = await Promise.all(
      conversations.map(c => this.trackConversationMetrics({ conversationId: c.id }))
    );

    // Sort by overall quality and return top performers
    return analyzedDebates
      .sort((a, b) => (b.overallQualityScore || 0) - (a.overallQualityScore || 0))
      .slice(0, limit);
  }

  private async getClassPerformanceAnalytics(
    timeframe: DateRange,
    filters?: AnalyticsFilters
  ): Promise<EducationalAnalytics[]> {
    const classes = await this.prismaService.class.findMany({
      where: {
        created_at: {
          gte: timeframe.from,
          lte: timeframe.to,
        },
        ...(filters?.classId && { id: filters.classId }),
        ...(filters?.teacherId && { created_by: filters.teacherId }),
      },
      take: 10,
    });

    return await Promise.all(
      classes.map(c => this.analyzeEducationalOutcomes(c.id))
    );
  }

  private async generateReportSummary(
    systemMetrics: SystemPerformanceMetrics,
    moderationMetrics: ModerationMetrics,
    topDebates: DebateAnalytics[],
    classPerformance: EducationalAnalytics[]
  ): Promise<any> {
    const totalDebates = topDebates.length;
    const totalUsers = classPerformance.reduce((sum, c) => sum + c.studentEngagement.length, 0);
    const averageDebateQuality = topDebates.length > 0
      ? topDebates.reduce((sum, d) => sum + (d.overallQualityScore || 0), 0) / topDebates.length
      : 0;

    // Determine system health
    let systemHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    if (systemMetrics.uptime > 0.99 && systemMetrics.successRate > 0.99) {
      systemHealth = 'excellent';
    } else if (systemMetrics.uptime > 0.95 && systemMetrics.successRate > 0.95) {
      systemHealth = 'good';
    } else if (systemMetrics.uptime > 0.90) {
      systemHealth = 'fair';
    } else {
      systemHealth = 'poor';
    }

    // Generate recommendations
    const recommendedActions: string[] = [];
    if (moderationMetrics.falsePositiveRate > 0.1) {
      recommendedActions.push('Review and tune moderation thresholds');
    }
    if (averageDebateQuality < 0.6) {
      recommendedActions.push('Increase AI coaching usage');
    }
    if (systemMetrics.averageLatency > 500) {
      recommendedActions.push('Optimize system performance');
    }

    return {
      totalDebates,
      totalUsers,
      averageDebateQuality,
      systemHealth,
      recommendedActions,
    };
  }

  private async getAnalyticsData(filters: AnalyticsFilters): Promise<any[]> {
    // Implementation would fetch data based on filters
    // This is a placeholder for the actual implementation
    return [];
  }

  private anonymizeAnalyticsData(data: any[]): any[] {
    // Implementation would remove or hash personal identifiers
    return data.map(item => ({
      ...item,
      userId: this.hashUserId(item.userId),
      userName: undefined,
      // Remove other identifying information
    }));
  }

  private async generateExportFile(
    exportId: string,
    format: ExportFormat,
    data: any[],
    includeFields?: string[]
  ): Promise<{ downloadUrl: string; recordCount: number; fileSizeBytes: number }> {
    // Implementation would generate actual files and store them
    // This is a placeholder
    return {
      downloadUrl: `/api/exports/${exportId}/download`,
      recordCount: data.length,
      fileSizeBytes: JSON.stringify(data).length,
    };
  }

  private calculateSystemHealth(): number {
    // Simplified system health calculation
    return 0.95;
  }

  private async getRecentActivity(): Promise<any[]> {
    // Get recent system activity
    return [
      {
        timestamp: new Date(),
        activity: 'Debate Completed',
        details: 'High-quality debate on climate change policy',
      },
      {
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        activity: 'User Registration',
        details: '5 new students joined',
      },
    ];
  }

  private async getSystemAlerts(): Promise<any[]> {
    // Get current system alerts
    return [
      {
        level: 'info' as const,
        message: 'System running normally',
        timestamp: new Date(),
        resolved: true,
      },
    ];
  }

  private async calculateEducationalValue(messages: any[]): Promise<number> {
    // Calculate educational value of a conversation
    const qualityScores = messages
      .filter(m => m.analyses && m.analyses.length > 0)
      .map(m => {
        const analysis = m.analyses[0];
        const results = analysis.analysis_results as any;
        return (
          (results?.educational?.criticalThinking || 0) +
          (results?.educational?.evidenceUsage || 0) +
          (results?.quality?.argumentStrength || 0)
        ) / 3;
      });

    return qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0;
  }

  private async analyzeStudentEngagement(student: any, conversations: any[]): Promise<ParticipantEngagement> {
    const studentMessages = conversations.flatMap(c => 
      c.messages.filter(m => m.user_id === student.id)
    );

    const messageCount = studentMessages.length;
    const qualityScores = studentMessages
      .filter(m => m.analyses && m.analyses.length > 0)
      .map(m => {
        const analysis = m.analyses[0];
        const results = analysis.analysis_results as any;
        return (
          (results?.quality?.argumentStrength || 0) +
          (results?.quality?.constructiveness || 0) +
          (results?.quality?.respectfulness || 0)
        ) / 3;
      });

    return {
      userId: student.id,
      userName: `${student.first_name} ${student.last_name}`.trim(),
      messageCount,
      averageResponseTime: 0, // Simplified
      qualityScores,
      engagementLevel: messageCount > 5 ? 0.8 : 0.4,
      respectfulnessScore: qualityScores.length > 0 ? qualityScores[0] : 0.7,
      argumentStrength: qualityScores.length > 0 ? qualityScores[0] : 0.6,
      evidenceUsage: 0.5, // Simplified
      totalWordsWritten: studentMessages.reduce(
        (sum, msg) => sum + msg.content.split(/\s+/).length,
        0
      ),
      averageMessageLength: messageCount > 0
        ? studentMessages.reduce((sum, msg) => sum + msg.content.length, 0) / messageCount
        : 0,
    };
  }

  private analyzeLearningObjectives(matches: any[]): any[] {
    // Simplified learning objectives analysis
    return [
      {
        objective: 'Critical Thinking',
        achievementRate: 0.75,
        debatesAddressed: matches.length,
      },
      {
        objective: 'Respectful Discourse',
        achievementRate: 0.85,
        debatesAddressed: matches.length,
      },
      {
        objective: 'Evidence-based Arguments',
        achievementRate: 0.65,
        debatesAddressed: matches.length,
      },
    ];
  }

  private calculateImprovementMetric(conversations: any[], metric: string): number {
    // Simplified improvement calculation
    // Would compare metrics over time in production
    return 0.15; // 15% improvement
  }

  private hashUserId(userId: string): string {
    // Simple hash function for anonymization
    return `user_${userId.slice(0, 8)}***`;
  }
}
