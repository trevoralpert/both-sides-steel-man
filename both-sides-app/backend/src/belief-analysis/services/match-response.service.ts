/**
 * Match Response Service
 * 
 * Service for handling user responses to match invitations including acceptance,
 * rejection, timeout handling, and feedback collection. Manages the complete
 * user interaction workflow for match participation decisions.
 * 
 * Phase 4 Task 4.3.3: Match Acceptance/Rejection Workflow
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { MatchStatusService, MatchStatus } from './match-status.service';

export interface MatchResponse {
  matchId: string;
  userId: string;
  response: 'accept' | 'reject';
  reason?: string;
  feedback?: string;
  respondedAt: Date;
  responseTimeSeconds: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface MatchResponseRequest {
  matchId: string;
  userId: string;
  response: 'accept' | 'reject';
  reason?: string;
  feedback?: string;
  additionalContext?: any;
}

export interface MatchResponseResult {
  success: boolean;
  matchId: string;
  userId: string;
  response: string;
  matchStatus: MatchStatus;
  partnerResponse?: PartnerResponseInfo;
  nextSteps: string[];
  timeToResponse: number; // seconds
}

export interface PartnerResponseInfo {
  hasResponded: boolean;
  response?: 'accept' | 'reject';
  respondedAt?: Date;
  waitingFor?: 'partner' | 'none';
}

export interface RejectionAnalysis {
  rejectionId: string;
  matchId: string;
  userId: string;
  reason: string;
  feedback?: string;
  rejectionCategory: 'topic' | 'timing' | 'partner' | 'personal' | 'technical' | 'other';
  sentiment: 'positive' | 'neutral' | 'negative';
  improvementSuggestions: string[];
  followUpActions: string[];
}

export interface ResponseTimeAnalytics {
  matchId: string;
  userId: string;
  timeToFirstView: number; // seconds from notification to first view
  timeToResponse: number;  // seconds from notification to response
  viewCount: number;       // how many times they viewed the match
  responsePattern: 'immediate' | 'considered' | 'delayed' | 'last_minute';
}

export interface MatchDecision {
  decision: 'accepted' | 'rejected' | 'expired' | 'pending';
  bothResponded: boolean;
  acceptedBy: string[];
  rejectedBy: string[];
  pendingFrom: string[];
  finalizedAt?: Date;
  nextAction: string;
}

@Injectable()
export class MatchResponseService {
  private readonly logger = new Logger(MatchResponseService.name);
  
  // Response timeouts and configurations
  private readonly RESPONSE_CONFIG = {
    defaultTimeoutHours: 24,
    reminderIntervals: [12, 4, 1], // Hours before timeout
    responseCategories: {
      'topic': 'Topic not interesting',
      'timing': 'Bad timing',
      'partner': 'Partner preference',
      'personal': 'Personal reasons',
      'technical': 'Technical issues',
      'other': 'Other reasons'
    }
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
    private readonly matchStatusService: MatchStatusService,
  ) {}

  /**
   * Record user response to a match invitation
   */
  async recordUserResponse(request: MatchResponseRequest): Promise<MatchResponseResult> {
    try {
      this.logger.log(`Recording ${request.response} response from user ${request.userId} for match ${request.matchId}`);

      // Validate match exists and user is authorized
      const match = await this.validateMatchAndUser(request.matchId, request.userId);
      
      // Check if user already responded
      await this.checkExistingResponse(request.matchId, request.userId);

      // Record the response
      const response = await this.createResponseRecord(request, match);

      // Check if both users have responded
      const matchDecision = await this.evaluateMatchDecision(request.matchId);

      // Update match status if both responded
      let newMatchStatus = match.status as MatchStatus;
      if (matchDecision.bothResponded) {
        newMatchStatus = await this.updateMatchStatusFromResponses(request.matchId, matchDecision);
      }

      // Analyze rejection if applicable
      if (request.response === 'reject') {
        await this.analyzeRejection(request, response);
      }

      // Track response analytics
      await this.trackResponseAnalytics(response, match);

      // Get partner response info
      const partnerResponse = await this.getPartnerResponseInfo(request.matchId, request.userId);

      // Determine next steps
      const nextSteps = await this.determineNextSteps(matchDecision, request.response);

      const result: MatchResponseResult = {
        success: true,
        matchId: request.matchId,
        userId: request.userId,
        response: request.response,
        matchStatus: newMatchStatus,
        partnerResponse,
        nextSteps,
        timeToResponse: response.responseTimeSeconds
      };

      this.logger.log(
        `Response recorded: ${request.response} from ${request.userId}. ` +
        `Match status: ${newMatchStatus}. Partner responded: ${partnerResponse.hasResponded}`
      );

      return result;

    } catch (error) {
      this.logger.error(`Failed to record response for match ${request.matchId}`, error.stack);
      throw error instanceof HttpException ? error : new HttpException(
        'Failed to record match response',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get match information for user response interface
   */
  async getMatchForResponse(matchId: string, userId: string): Promise<{
    match: any;
    partner: any;
    topic?: any;
    timeRemaining: number;
    canRespond: boolean;
    existingResponse?: string;
  }> {
    try {
      const match = await this.prismaService.match.findUnique({
        where: { id: matchId },
        include: {
          student1: {
            select: {
              id: true,
              display_name: true,
              profile: {
                select: {
                  belief_summary: true,
                  grade_level: true
                }
              }
            }
          },
          student2: {
            select: {
              id: true,
              display_name: true,
              profile: {
                select: {
                  belief_summary: true,
                  grade_level: true
                }
              }
            }
          },
          topic: true,
          match_responses: {
            where: { user_id: userId }
          }
        }
      });

      if (!match) {
        throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
      }

      // Validate user is part of this match
      if (match.student1_id !== userId && match.student2_id !== userId) {
        throw new HttpException('Unauthorized access to match', HttpStatus.FORBIDDEN);
      }

      // Get partner info
      const partner = match.student1_id === userId ? match.student2 : match.student1;

      // Calculate time remaining
      const timeRemaining = match.expires_at 
        ? Math.max(0, match.expires_at.getTime() - new Date().getTime())
        : 0;

      // Check if can respond
      const canRespond = match.status === MatchStatus.PENDING && timeRemaining > 0;

      // Check existing response
      const existingResponse = match.match_responses.length > 0 
        ? match.match_responses[0].response 
        : undefined;

      return {
        match: {
          id: match.id,
          status: match.status,
          quality_score: match.match_quality_score,
          expires_at: match.expires_at,
          created_at: match.created_at,
          metadata: match.match_metadata
        },
        partner: {
          id: partner.id,
          name: partner.display_name,
          beliefSummary: partner.profile?.belief_summary,
          gradeLevel: partner.profile?.grade_level
        },
        topic: match.topic ? {
          id: match.topic.id,
          title: match.topic.title,
          description: match.topic.description,
          category: match.topic.category,
          difficulty_level: match.topic.difficulty_level
        } : undefined,
        timeRemaining,
        canRespond,
        existingResponse
      };

    } catch (error) {
      this.logger.error(`Failed to get match ${matchId} for user ${userId}`, error.stack);
      throw error instanceof HttpException ? error : new HttpException(
        'Failed to get match information',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Handle match timeout - no response from users
   */
  async handleMatchTimeout(matchId: string): Promise<void> {
    try {
      this.logger.log(`Handling timeout for match ${matchId}`);

      const match = await this.prismaService.match.findUnique({
        where: { id: matchId },
        include: {
          match_responses: true
        }
      });

      if (!match || match.status !== MatchStatus.PENDING) {
        return; // Already handled or not applicable
      }

      // Check if actually expired
      if (match.expires_at && new Date() > match.expires_at) {
        // Update status to expired
        await this.matchStatusService.updateMatchStatus({
          matchId,
          newStatus: MatchStatus.EXPIRED,
          userId: 'system',
          reason: 'Match expired - no response from users within time limit'
        });

        // Analyze non-response patterns
        await this.analyzeNonResponse(matchId, match);

        this.logger.log(`Match ${matchId} expired due to no response`);
      }

    } catch (error) {
      this.logger.error(`Failed to handle match timeout for ${matchId}`, error.stack);
    }
  }

  /**
   * Send response reminders to users
   */
  async sendResponseReminder(matchId: string, userId: string, hoursRemaining: number): Promise<void> {
    try {
      this.logger.log(`Sending response reminder to user ${userId} for match ${matchId} (${hoursRemaining}h remaining)`);

      // Get match and user information
      const match = await this.prismaService.match.findUnique({
        where: { id: matchId },
        include: {
          student1: { select: { id: true, display_name: true } },
          student2: { select: { id: true, display_name: true } },
          topic: { select: { title: true } }
        }
      });

      if (!match) return;

      const partner = match.student1_id === userId ? match.student2 : match.student1;

      // TODO: Implement notification sending
      // - Email reminder
      // - Push notification
      // - In-app notification
      
      // Log reminder sent
      this.logger.log(`Reminder sent to ${userId} for match ${matchId} with ${hoursRemaining} hours remaining`);

    } catch (error) {
      this.logger.error(`Failed to send response reminder for match ${matchId}`, error.stack);
    }
  }

  /**
   * Get rejection feedback for algorithm improvement
   */
  async getRejectionAnalytics(filters: {
    dateRange?: { start: Date; end: Date };
    userId?: string;
    classId?: string;
    rejectionReason?: string;
  } = {}): Promise<{
    totalRejections: number;
    rejectionsByCategory: Record<string, number>;
    commonReasons: Array<{ reason: string; count: number }>;
    improvementSuggestions: string[];
    trends: any;
  }> {
    try {
      // This would query a rejection analytics table in production
      // For now, return placeholder analytics
      
      const analytics = {
        totalRejections: 0,
        rejectionsByCategory: {
          'topic': 0,
          'timing': 0,
          'partner': 0,
          'personal': 0,
          'technical': 0,
          'other': 0
        },
        commonReasons: [],
        improvementSuggestions: [
          'Improve topic recommendation algorithm',
          'Better timing prediction for student availability',
          'Enhanced partner compatibility scoring'
        ],
        trends: {}
      };

      return analytics;

    } catch (error) {
      this.logger.error('Failed to get rejection analytics', error.stack);
      throw new HttpException(
        'Failed to get rejection analytics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user response patterns for personalization
   */
  async getUserResponsePatterns(userId: string): Promise<{
    totalMatchesReceived: number;
    responseRate: number;
    averageResponseTime: number;
    preferredResponseHours: number[];
    rejectionReasons: string[];
    responsePattern: 'quick' | 'deliberate' | 'procrastinator';
  }> {
    try {
      const responses = await this.prismaService.matchResponse.findMany({
        where: { user_id: userId },
        include: {
          match: {
            select: {
              created_at: true,
              expires_at: true
            }
          }
        }
      });

      const totalMatchesReceived = responses.length;
      const acceptedResponses = responses.filter(r => r.response === 'accept');
      const responseRate = totalMatchesReceived > 0 ? acceptedResponses.length / totalMatchesReceived : 0;

      // Calculate average response time
      const responseTimes = responses.map(r => {
        if (r.match.created_at) {
          return (r.responded_at.getTime() - r.match.created_at.getTime()) / 1000; // seconds
        }
        return 0;
      }).filter(t => t > 0);

      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      // Determine response pattern
      let responsePattern: 'quick' | 'deliberate' | 'procrastinator' = 'deliberate';
      if (averageResponseTime < 3600) { // Less than 1 hour
        responsePattern = 'quick';
      } else if (averageResponseTime > 20 * 3600) { // More than 20 hours
        responsePattern = 'procrastinator';
      }

      // Get preferred response hours (placeholder)
      const preferredResponseHours = [9, 10, 11, 15, 16, 17, 18, 19]; // Common active hours

      // Get rejection reasons
      const rejectionReasons = responses
        .filter(r => r.response === 'reject' && r.reason)
        .map(r => r.reason!)
        .filter((reason, index, arr) => arr.indexOf(reason) === index);

      return {
        totalMatchesReceived,
        responseRate,
        averageResponseTime,
        preferredResponseHours,
        rejectionReasons,
        responsePattern
      };

    } catch (error) {
      this.logger.error(`Failed to get response patterns for user ${userId}`, error.stack);
      throw new HttpException(
        'Failed to get user response patterns',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Private helper methods

  /**
   * Validate match exists and user is authorized
   */
  private async validateMatchAndUser(matchId: string, userId: string): Promise<any> {
    const match = await this.prismaService.match.findUnique({
      where: { id: matchId },
      include: {
        match_responses: true
      }
    });

    if (!match) {
      throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
    }

    if (match.student1_id !== userId && match.student2_id !== userId) {
      throw new HttpException('Unauthorized access to match', HttpStatus.FORBIDDEN);
    }

    if (match.status !== MatchStatus.PENDING) {
      throw new HttpException(`Cannot respond to match with status: ${match.status}`, HttpStatus.BAD_REQUEST);
    }

    if (match.expires_at && new Date() > match.expires_at) {
      throw new HttpException('Match has expired', HttpStatus.BAD_REQUEST);
    }

    return match;
  }

  /**
   * Check if user already responded
   */
  private async checkExistingResponse(matchId: string, userId: string): Promise<void> {
    const existingResponse = await this.prismaService.matchResponse.findFirst({
      where: {
        match_id: matchId,
        user_id: userId
      }
    });

    if (existingResponse) {
      throw new HttpException('User has already responded to this match', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Create response record in database
   */
  private async createResponseRecord(request: MatchResponseRequest, match: any): Promise<MatchResponse> {
    const responseTimeSeconds = match.created_at 
      ? (new Date().getTime() - match.created_at.getTime()) / 1000
      : 0;

    const responseRecord = await this.prismaService.matchResponse.create({
      data: {
        match_id: request.matchId,
        user_id: request.userId,
        response: request.response,
        reason: request.reason,
        feedback: request.feedback,
        responded_at: new Date(),
        response_metadata: {
          responseTimeSeconds,
          additionalContext: request.additionalContext
        }
      }
    });

    return {
      matchId: request.matchId,
      userId: request.userId,
      response: request.response as 'accept' | 'reject',
      reason: request.reason,
      feedback: request.feedback,
      respondedAt: responseRecord.responded_at,
      responseTimeSeconds
    };
  }

  /**
   * Evaluate match decision based on all responses
   */
  private async evaluateMatchDecision(matchId: string): Promise<MatchDecision> {
    const responses = await this.prismaService.matchResponse.findMany({
      where: { match_id: matchId }
    });

    const match = await this.prismaService.match.findUnique({
      where: { id: matchId },
      select: {
        student1_id: true,
        student2_id: true
      }
    });

    if (!match) {
      throw new Error('Match not found');
    }

    const expectedUsers = [match.student1_id, match.student2_id];
    const respondedUsers = responses.map(r => r.user_id);
    const bothResponded = expectedUsers.every(userId => respondedUsers.includes(userId));

    const acceptedBy = responses.filter(r => r.response === 'accept').map(r => r.user_id);
    const rejectedBy = responses.filter(r => r.response === 'reject').map(r => r.user_id);
    const pendingFrom = expectedUsers.filter(userId => !respondedUsers.includes(userId));

    let decision: 'accepted' | 'rejected' | 'expired' | 'pending' = 'pending';
    let nextAction = 'Wait for responses';

    if (bothResponded) {
      if (rejectedBy.length > 0) {
        decision = 'rejected';
        nextAction = 'Match rejected - find alternative matches';
      } else if (acceptedBy.length === 2) {
        decision = 'accepted';
        nextAction = 'Initialize debate room';
      }
    } else {
      nextAction = `Wait for response from ${pendingFrom.length} user(s)`;
    }

    return {
      decision,
      bothResponded,
      acceptedBy,
      rejectedBy,
      pendingFrom,
      finalizedAt: bothResponded ? new Date() : undefined,
      nextAction
    };
  }

  /**
   * Update match status based on user responses
   */
  private async updateMatchStatusFromResponses(matchId: string, decision: MatchDecision): Promise<MatchStatus> {
    let newStatus: MatchStatus;
    let reason: string;

    switch (decision.decision) {
      case 'accepted':
        newStatus = MatchStatus.ACCEPTED;
        reason = 'Both users accepted the match';
        break;
      case 'rejected':
        newStatus = MatchStatus.REJECTED;
        reason = `Match rejected by: ${decision.rejectedBy.join(', ')}`;
        break;
      default:
        return MatchStatus.PENDING; // No change needed
    }

    await this.matchStatusService.updateMatchStatus({
      matchId,
      newStatus,
      userId: 'system',
      reason
    });

    return newStatus;
  }

  /**
   * Analyze rejection for algorithm improvement
   */
  private async analyzeRejection(request: MatchResponseRequest, response: MatchResponse): Promise<void> {
    try {
      // Categorize the rejection reason
      const category = this.categorizeRejectionReason(request.reason || '');
      
      // This would store detailed rejection analysis
      // For now, just log for monitoring
      this.logger.log(
        `Rejection analysis: Match ${request.matchId}, User ${request.userId}, ` +
        `Category: ${category}, Reason: ${request.reason || 'No reason provided'}`
      );

      // TODO: Store rejection analysis for algorithm improvement
      
    } catch (error) {
      this.logger.error('Failed to analyze rejection', error.stack);
    }
  }

  /**
   * Categorize rejection reason
   */
  private categorizeRejectionReason(reason: string): string {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('topic') || lowerReason.includes('subject')) {
      return 'topic';
    } else if (lowerReason.includes('time') || lowerReason.includes('busy') || lowerReason.includes('schedule')) {
      return 'timing';
    } else if (lowerReason.includes('partner') || lowerReason.includes('person') || lowerReason.includes('student')) {
      return 'partner';
    } else if (lowerReason.includes('personal') || lowerReason.includes('not ready') || lowerReason.includes('not interested')) {
      return 'personal';
    } else if (lowerReason.includes('technical') || lowerReason.includes('problem') || lowerReason.includes('issue')) {
      return 'technical';
    } else {
      return 'other';
    }
  }

  /**
   * Track response analytics for insights
   */
  private async trackResponseAnalytics(response: MatchResponse, match: any): Promise<void> {
    try {
      // This would store detailed analytics
      const analytics: ResponseTimeAnalytics = {
        matchId: response.matchId,
        userId: response.userId,
        timeToFirstView: 0, // Would track when user first viewed the match
        timeToResponse: response.responseTimeSeconds,
        viewCount: 1, // Would track actual view count
        responsePattern: this.determineResponsePattern(response.responseTimeSeconds)
      };

      // TODO: Store analytics in database
      this.logger.log(`Response analytics: ${JSON.stringify(analytics)}`);

    } catch (error) {
      this.logger.error('Failed to track response analytics', error.stack);
    }
  }

  /**
   * Determine response pattern based on timing
   */
  private determineResponsePattern(responseTimeSeconds: number): 'immediate' | 'considered' | 'delayed' | 'last_minute' {
    const hours = responseTimeSeconds / 3600;
    
    if (hours < 1) return 'immediate';
    if (hours < 12) return 'considered';
    if (hours < 20) return 'delayed';
    return 'last_minute';
  }

  /**
   * Get partner response information
   */
  private async getPartnerResponseInfo(matchId: string, userId: string): Promise<PartnerResponseInfo> {
    const match = await this.prismaService.match.findUnique({
      where: { id: matchId },
      select: {
        student1_id: true,
        student2_id: true
      }
    });

    if (!match) {
      throw new Error('Match not found');
    }

    const partnerId = match.student1_id === userId ? match.student2_id : match.student1_id;

    const partnerResponse = await this.prismaService.matchResponse.findFirst({
      where: {
        match_id: matchId,
        user_id: partnerId
      }
    });

    return {
      hasResponded: !!partnerResponse,
      response: partnerResponse?.response as 'accept' | 'reject' || undefined,
      respondedAt: partnerResponse?.responded_at,
      waitingFor: partnerResponse ? 'none' : 'partner'
    };
  }

  /**
   * Determine next steps based on match decision
   */
  private async determineNextSteps(decision: MatchDecision, userResponse: string): Promise<string[]> {
    const steps: string[] = [];

    if (userResponse === 'accept') {
      if (decision.bothResponded) {
        if (decision.decision === 'accepted') {
          steps.push('Match accepted by both users');
          steps.push('Debate room will be initialized');
          steps.push('You will receive topic and position assignment');
        } else {
          steps.push('Your partner declined the match');
          steps.push('We will suggest alternative matches');
        }
      } else {
        steps.push('Waiting for your partner to respond');
        steps.push('You will be notified once they respond');
      }
    } else {
      steps.push('You declined this match');
      steps.push('We will suggest alternative matches based on your preferences');
      if (decision.bothResponded) {
        steps.push('Match has been cancelled');
      }
    }

    return steps;
  }

  /**
   * Analyze non-response patterns
   */
  private async analyzeNonResponse(matchId: string, match: any): Promise<void> {
    try {
      const nonRespondingUsers = [match.student1_id, match.student2_id].filter(userId => {
        return !match.match_responses.some((response: any) => response.user_id === userId);
      });

      // This would analyze patterns of non-response for algorithm improvement
      this.logger.log(`Non-response analysis: Match ${matchId}, Users: ${nonRespondingUsers.join(', ')}`);

      // TODO: Store non-response analysis
      
    } catch (error) {
      this.logger.error('Failed to analyze non-response', error.stack);
    }
  }
}
