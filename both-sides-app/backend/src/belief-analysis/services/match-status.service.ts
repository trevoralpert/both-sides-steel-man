/**
 * Match Status Service
 * 
 * Service for managing match status transitions, lifecycle tracking, and automated
 * status updates. Handles the complete match workflow from creation to completion
 * with comprehensive event logging and state validation.
 * 
 * Phase 4 Task 4.3.2: Match Status Tracking & Lifecycle
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export enum MatchStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED', 
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface StatusTransition {
  fromStatus: MatchStatus;
  toStatus: MatchStatus;
  userId?: string; // User who initiated the transition
  reason?: string;
  timestamp: Date;
  metadata?: any;
}

export interface StatusEvent {
  id: string;
  matchId: string;
  eventType: 'status_change' | 'reminder_sent' | 'notification_sent' | 'expiration_warning';
  details: any;
  timestamp: Date;
  userId?: string;
}

export interface MatchLifecycleInfo {
  matchId: string;
  currentStatus: MatchStatus;
  statusHistory: StatusTransition[];
  timeline: StatusEvent[];
  nextScheduledEvent?: ScheduledEvent;
  expirationInfo: ExpirationInfo;
  participationStatus: ParticipationStatus;
}

export interface ScheduledEvent {
  eventType: 'expiration' | 'reminder' | 'followup';
  scheduledFor: Date;
  eventData: any;
}

export interface ExpirationInfo {
  expiresAt: Date;
  timeRemaining: number; // milliseconds
  isExpired: boolean;
  warningsSent: number;
  finalWarning: boolean;
}

export interface ParticipationStatus {
  student1Response?: 'accepted' | 'rejected' | 'pending';
  student2Response?: 'accepted' | 'rejected' | 'pending';
  student1ResponseTime?: Date;
  student2ResponseTime?: Date;
  bothResponded: boolean;
}

export interface StatusUpdateRequest {
  matchId: string;
  newStatus: MatchStatus;
  userId: string;
  reason?: string;
  metadata?: any;
  skipValidation?: boolean;
}

export interface StatusUpdateResult {
  success: boolean;
  previousStatus: MatchStatus;
  newStatus: MatchStatus;
  transition: StatusTransition;
  warnings?: string[];
  nextActions?: string[];
}

@Injectable()
export class MatchStatusService {
  private readonly logger = new Logger(MatchStatusService.name);
  
  // Valid status transitions map
  private readonly VALID_TRANSITIONS: Map<MatchStatus, MatchStatus[]> = new Map([
    [MatchStatus.PENDING, [MatchStatus.ACCEPTED, MatchStatus.REJECTED, MatchStatus.EXPIRED, MatchStatus.CANCELLED]],
    [MatchStatus.ACCEPTED, [MatchStatus.IN_PROGRESS, MatchStatus.CANCELLED, MatchStatus.EXPIRED]],
    [MatchStatus.REJECTED, [MatchStatus.CANCELLED]], // Allow cleanup
    [MatchStatus.IN_PROGRESS, [MatchStatus.COMPLETED, MatchStatus.CANCELLED]],
    [MatchStatus.COMPLETED, []], // Terminal state
    [MatchStatus.CANCELLED, []], // Terminal state
    [MatchStatus.EXPIRED, [MatchStatus.CANCELLED]] // Allow cleanup
  ]);

  // Expiration configuration
  private readonly EXPIRATION_CONFIG = {
    defaultExpirationHours: 24,
    warningIntervals: [12, 4, 1], // Hours before expiration
    finalWarningMinutes: 15,
    cleanupDelayHours: 48 // Time before expired matches are cleaned up
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Update match status with validation and logging
   */
  async updateMatchStatus(request: StatusUpdateRequest): Promise<StatusUpdateResult> {
    try {
      this.logger.log(`Updating match ${request.matchId} status to ${request.newStatus}`);

      // Get current match state
      const match = await this.prismaService.match.findUnique({
        where: { id: request.matchId },
        include: {
          match_responses: true
        }
      });

      if (!match) {
        throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
      }

      const currentStatus = match.status as MatchStatus;

      // Skip validation if explicitly requested (for system operations)
      if (!request.skipValidation) {
        this.validateStatusTransition(currentStatus, request.newStatus);
      }

      // Create status transition record
      const transition: StatusTransition = {
        fromStatus: currentStatus,
        toStatus: request.newStatus,
        userId: request.userId,
        reason: request.reason,
        timestamp: new Date(),
        metadata: request.metadata
      };

      // Update match status and add transition to history
      const currentMetadata = match.match_metadata as any || {};
      const statusHistory = currentMetadata.statusHistory || [];
      statusHistory.push(transition);

      const updatedMatch = await this.prismaService.match.update({
        where: { id: request.matchId },
        data: {
          status: request.newStatus,
          updated_at: new Date(),
          match_metadata: {
            ...currentMetadata,
            statusHistory,
            lastStatusUpdate: transition
          }
        }
      });

      // Log status event
      await this.logStatusEvent({
        matchId: request.matchId,
        eventType: 'status_change',
        details: {
          fromStatus: currentStatus,
          toStatus: request.newStatus,
          reason: request.reason,
          metadata: request.metadata
        },
        timestamp: new Date(),
        userId: request.userId
      });

      // Handle post-transition actions
      const nextActions = await this.handlePostTransitionActions(
        request.matchId,
        currentStatus,
        request.newStatus
      );

      const result: StatusUpdateResult = {
        success: true,
        previousStatus: currentStatus,
        newStatus: request.newStatus,
        transition,
        nextActions
      };

      this.logger.log(
        `Successfully updated match ${request.matchId} from ${currentStatus} to ${request.newStatus}`
      );

      return result;

    } catch (error) {
      this.logger.error(`Failed to update match status for ${request.matchId}`, error.stack);
      throw error instanceof HttpException ? error : new HttpException(
        'Failed to update match status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get complete lifecycle information for a match
   */
  async getMatchLifecycle(matchId: string): Promise<MatchLifecycleInfo> {
    try {
      const match = await this.prismaService.match.findUnique({
        where: { id: matchId },
        include: {
          match_responses: {
            select: {
              user_id: true,
              response: true,
              responded_at: true
            }
          }
        }
      });

      if (!match) {
        throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
      }

      const metadata = match.match_metadata as any || {};
      const statusHistory: StatusTransition[] = metadata.statusHistory || [];

      // Get timeline of events (this would come from a separate events table in production)
      const timeline: StatusEvent[] = await this.getMatchTimeline(matchId);

      // Calculate expiration info
      const expirationInfo = this.calculateExpirationInfo(match);

      // Calculate participation status
      const participationStatus = this.calculateParticipationStatus(match);

      // Determine next scheduled event
      const nextScheduledEvent = await this.getNextScheduledEvent(matchId, match);

      const lifecycle: MatchLifecycleInfo = {
        matchId,
        currentStatus: match.status as MatchStatus,
        statusHistory,
        timeline,
        nextScheduledEvent,
        expirationInfo,
        participationStatus
      };

      return lifecycle;

    } catch (error) {
      this.logger.error(`Failed to get match lifecycle for ${matchId}`, error.stack);
      throw error instanceof HttpException ? error : new HttpException(
        'Failed to get match lifecycle',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Check if both users have responded to a match
   */
  async checkBothResponses(matchId: string): Promise<{
    bothResponded: boolean;
    responses: Array<{ userId: string; response: string; timestamp: Date }>;
    finalDecision: 'accepted' | 'rejected' | 'pending';
  }> {
    try {
      const match = await this.prismaService.match.findUnique({
        where: { id: matchId },
        include: {
          match_responses: true
        }
      });

      if (!match) {
        throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
      }

      const responses = match.match_responses.map(response => ({
        userId: response.user_id,
        response: response.response,
        timestamp: response.responded_at
      }));

      const expectedResponses = [match.student1_id, match.student2_id];
      const receivedResponses = responses.map(r => r.userId);
      
      const bothResponded = expectedResponses.every(userId => 
        receivedResponses.includes(userId)
      );

      let finalDecision: 'accepted' | 'rejected' | 'pending' = 'pending';
      
      if (bothResponded) {
        const hasRejection = responses.some(r => r.response === 'reject');
        const allAccepted = responses.every(r => r.response === 'accept');
        
        finalDecision = hasRejection ? 'rejected' : allAccepted ? 'accepted' : 'pending';
      }

      return {
        bothResponded,
        responses,
        finalDecision
      };

    } catch (error) {
      this.logger.error(`Failed to check responses for match ${matchId}`, error.stack);
      throw new HttpException(
        'Failed to check match responses',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Handle match expiration automatically
   */
  async handleMatchExpiration(matchId: string): Promise<void> {
    try {
      this.logger.log(`Handling expiration for match ${matchId}`);

      const match = await this.prismaService.match.findUnique({
        where: { id: matchId }
      });

      if (!match || match.status !== MatchStatus.PENDING) {
        return; // Already handled or not applicable
      }

      // Check if actually expired
      if (match.expires_at && new Date() > match.expires_at) {
        await this.updateMatchStatus({
          matchId,
          newStatus: MatchStatus.EXPIRED,
          userId: 'system',
          reason: 'Match expired - no response within time limit',
          skipValidation: false
        });

        // Log expiration event
        await this.logStatusEvent({
          matchId,
          eventType: 'status_change',
          details: {
            fromStatus: match.status,
            toStatus: MatchStatus.EXPIRED,
            reason: 'Automatic expiration',
            expiredAt: new Date()
          },
          timestamp: new Date()
        });
      }

    } catch (error) {
      this.logger.error(`Failed to handle match expiration for ${matchId}`, error.stack);
    }
  }

  /**
   * Send expiration warnings
   */
  async sendExpirationWarning(matchId: string, hoursUntilExpiration: number): Promise<void> {
    try {
      this.logger.log(`Sending expiration warning for match ${matchId} (${hoursUntilExpiration}h remaining)`);

      // Log warning event
      await this.logStatusEvent({
        matchId,
        eventType: 'expiration_warning',
        details: {
          hoursRemaining: hoursUntilExpiration,
          sentAt: new Date()
        },
        timestamp: new Date()
      });

      // TODO: Integrate with notification service
      // - Send email/push notifications to both students
      // - Include match details and response deadline
      // - Provide direct links to accept/reject

    } catch (error) {
      this.logger.error(`Failed to send expiration warning for match ${matchId}`, error.stack);
    }
  }

  /**
   * Scheduled job to process match expirations and warnings
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async processScheduledMatchEvents(): Promise<void> {
    try {
      this.logger.log('Processing scheduled match events...');

      // Get pending matches approaching expiration
      const now = new Date();
      const warningTimes = this.EXPIRATION_CONFIG.warningIntervals.map(hours => {
        const warningTime = new Date(now);
        warningTime.setHours(warningTime.getHours() + hours);
        return warningTime;
      });

      const pendingMatches = await this.prismaService.match.findMany({
        where: {
          status: MatchStatus.PENDING,
          expires_at: {
            lte: Math.max(...warningTimes.map(t => t.getTime())) // Within warning window
          }
        },
        select: {
          id: true,
          expires_at: true,
          match_metadata: true
        }
      });

      for (const match of pendingMatches) {
        if (!match.expires_at) continue;

        const timeUntilExpiration = match.expires_at.getTime() - now.getTime();
        const hoursUntilExpiration = timeUntilExpiration / (1000 * 60 * 60);

        // Check if expired
        if (timeUntilExpiration <= 0) {
          await this.handleMatchExpiration(match.id);
          continue;
        }

        // Check if warning needed
        const metadata = match.match_metadata as any || {};
        const warningsSent = metadata.warningsSent || [];

        for (const warningHours of this.EXPIRATION_CONFIG.warningIntervals) {
          if (hoursUntilExpiration <= warningHours && !warningsSent.includes(warningHours)) {
            await this.sendExpirationWarning(match.id, warningHours);
            
            // Update warnings sent
            warningsSent.push(warningHours);
            await this.prismaService.match.update({
              where: { id: match.id },
              data: {
                match_metadata: {
                  ...metadata,
                  warningsSent
                }
              }
            });
            break;
          }
        }
      }

      this.logger.log(`Processed scheduled events for ${pendingMatches.length} pending matches`);

    } catch (error) {
      this.logger.error('Failed to process scheduled match events', error.stack);
    }
  }

  /**
   * Get matches requiring attention (expired, warnings needed, etc.)
   */
  async getMatchesRequiringAttention(): Promise<Array<{
    matchId: string;
    status: MatchStatus;
    issue: string;
    urgency: 'low' | 'medium' | 'high';
    actionRequired: string;
  }>> {
    try {
      const now = new Date();
      const issues: Array<any> = [];

      // Find expired matches still pending
      const expiredMatches = await this.prismaService.match.findMany({
        where: {
          status: MatchStatus.PENDING,
          expires_at: { lt: now }
        },
        select: { id: true, expires_at: true }
      });

      expiredMatches.forEach(match => {
        issues.push({
          matchId: match.id,
          status: MatchStatus.PENDING,
          issue: 'Match has expired but status not updated',
          urgency: 'high' as const,
          actionRequired: 'Update status to EXPIRED'
        });
      });

      // Find matches in progress too long
      const longInProgress = await this.prismaService.match.findMany({
        where: {
          status: MatchStatus.IN_PROGRESS,
          updated_at: {
            lt: new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)) // 7 days ago
          }
        },
        select: { id: true, updated_at: true }
      });

      longInProgress.forEach(match => {
        issues.push({
          matchId: match.id,
          status: MatchStatus.IN_PROGRESS,
          issue: 'Match has been in progress for over 7 days',
          urgency: 'medium' as const,
          actionRequired: 'Check match progress and consider intervention'
        });
      });

      return issues;

    } catch (error) {
      this.logger.error('Failed to get matches requiring attention', error.stack);
      return [];
    }
  }

  // Private helper methods

  /**
   * Validate if a status transition is allowed
   */
  private validateStatusTransition(from: MatchStatus, to: MatchStatus): void {
    const validTransitions = this.VALID_TRANSITIONS.get(from) || [];
    
    if (!validTransitions.includes(to)) {
      throw new HttpException(
        `Invalid status transition from ${from} to ${to}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Handle actions that should occur after a status transition
   */
  private async handlePostTransitionActions(
    matchId: string,
    fromStatus: MatchStatus,
    toStatus: MatchStatus
  ): Promise<string[]> {
    const actions: string[] = [];

    try {
      // Handle specific transition scenarios
      if (fromStatus === MatchStatus.PENDING && toStatus === MatchStatus.ACCEPTED) {
        actions.push('Match accepted - ready for debate initialization');
        // TODO: Trigger debate room setup
      }

      if (toStatus === MatchStatus.COMPLETED) {
        actions.push('Match completed - trigger reflection and feedback collection');
        // TODO: Schedule reflection prompts
        // TODO: Update user statistics
      }

      if (toStatus === MatchStatus.REJECTED || toStatus === MatchStatus.EXPIRED) {
        actions.push('Match ended - update matching eligibility');
        // TODO: Clear cooldown restrictions if applicable
        // TODO: Suggest alternative matches
      }

      if (toStatus === MatchStatus.CANCELLED) {
        actions.push('Match cancelled - log reason and update preferences');
        // TODO: Analysis cancellation patterns for algorithm improvement
      }

    } catch (error) {
      this.logger.error(`Failed to handle post-transition actions for match ${matchId}`, error.stack);
    }

    return actions;
  }

  /**
   * Log status events for audit trail
   */
  private async logStatusEvent(event: StatusEvent): Promise<void> {
    try {
      // In a production system, this would write to a dedicated events table
      // For now, we'll add it to the match metadata
      this.logger.log(`Status event for match ${event.matchId}: ${event.eventType}`);
      
      // TODO: Implement proper event logging to database table
      
    } catch (error) {
      this.logger.error('Failed to log status event', error.stack);
    }
  }

  /**
   * Get timeline of events for a match
   */
  private async getMatchTimeline(matchId: string): Promise<StatusEvent[]> {
    // Placeholder - in production this would query an events table
    return [];
  }

  /**
   * Calculate expiration information
   */
  private calculateExpirationInfo(match: any): ExpirationInfo {
    if (!match.expires_at) {
      return {
        expiresAt: new Date(),
        timeRemaining: 0,
        isExpired: false,
        warningsSent: 0,
        finalWarning: false
      };
    }

    const now = new Date();
    const expiresAt = match.expires_at;
    const timeRemaining = expiresAt.getTime() - now.getTime();
    const isExpired = timeRemaining <= 0;
    
    const metadata = match.match_metadata as any || {};
    const warningsSent = metadata.warningsSent?.length || 0;
    
    // Final warning if less than 15 minutes remaining
    const finalWarning = timeRemaining > 0 && timeRemaining <= (15 * 60 * 1000);

    return {
      expiresAt,
      timeRemaining,
      isExpired,
      warningsSent,
      finalWarning
    };
  }

  /**
   * Calculate participation status from responses
   */
  private calculateParticipationStatus(match: any): ParticipationStatus {
    const responses = match.match_responses || [];
    
    const student1Response = responses.find((r: any) => r.user_id === match.student1_id);
    const student2Response = responses.find((r: any) => r.user_id === match.student2_id);
    
    return {
      student1Response: student1Response?.response || 'pending',
      student2Response: student2Response?.response || 'pending',
      student1ResponseTime: student1Response?.responded_at,
      student2ResponseTime: student2Response?.responded_at,
      bothResponded: !!student1Response && !!student2Response
    };
  }

  /**
   * Get next scheduled event for a match
   */
  private async getNextScheduledEvent(matchId: string, match: any): Promise<ScheduledEvent | undefined> {
    if (match.status === MatchStatus.PENDING && match.expires_at) {
      const now = new Date();
      const timeUntilExpiration = match.expires_at.getTime() - now.getTime();
      
      if (timeUntilExpiration > 0) {
        // Find next warning that hasn't been sent
        const metadata = match.match_metadata as any || {};
        const warningsSent = metadata.warningsSent || [];
        
        for (const warningHours of this.EXPIRATION_CONFIG.warningIntervals) {
          if (!warningsSent.includes(warningHours)) {
            const warningTime = new Date(match.expires_at.getTime() - (warningHours * 60 * 60 * 1000));
            if (warningTime > now) {
              return {
                eventType: 'reminder',
                scheduledFor: warningTime,
                eventData: { warningHours }
              };
            }
          }
        }

        // Next event is expiration
        return {
          eventType: 'expiration',
          scheduledFor: match.expires_at,
          eventData: { reason: 'Match expiration' }
        };
      }
    }

    return undefined;
  }
}
