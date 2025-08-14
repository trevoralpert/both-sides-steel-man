/**
 * Match Creation Service
 * 
 * Service for creating and assigning matches between students using the core matching logic.
 * Supports both automated matching algorithms and manual teacher-initiated pairings
 * with comprehensive notification and assignment systems.
 * 
 * Phase 4 Task 4.3.1: Match Creation & Assignment APIs
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { IdeologicalDifferenceService } from './ideological-difference.service';
import { MatchingConstraintsService } from './matching-constraints.service';
import { MatchQualityService, RankedMatch } from './match-quality.service';

export interface MatchingParameters {
  classId: string;
  targetUserId?: string; // For targeted matching
  topicId?: string;
  maxMatches?: number;
  minQualityThreshold?: number;
  prioritizeComplementarity?: boolean;
  excludeUserIds?: string[];
  customConstraints?: any;
}

export interface AutomaticMatchRequest {
  classId: string;
  parameters: MatchingParameters;
  createdBy: string; // Teacher/admin ID
  scheduledFor?: Date;
  notificationSettings?: NotificationSettings;
}

export interface ManualMatchRequest {
  classId: string;
  student1Id: string;
  student2Id: string;
  topicId?: string;
  createdBy: string; // Teacher ID
  overrideConstraints?: boolean;
  customMessage?: string;
  notificationSettings?: NotificationSettings;
}

export interface NotificationSettings {
  sendEmail: boolean;
  sendInApp: boolean;
  customMessage?: string;
  scheduledFor?: Date;
  reminderSettings?: ReminderSettings;
}

export interface ReminderSettings {
  enabled: boolean;
  intervals: number[]; // Hours before expiration
  maxReminders: number;
}

export interface MatchCreationResult {
  matchId: string;
  student1Id: string;
  student2Id: string;
  matchQuality: number;
  status: string;
  expiresAt: Date;
  notificationsSent: boolean;
  createdAt: Date;
  metadata: {
    creationType: 'automatic' | 'manual';
    algorithm: string;
    qualityFactors: any;
    constraintValidation: any;
  };
}

export interface OptimalMatchSet {
  classId: string;
  matches: MatchCreationResult[];
  totalEligibleStudents: number;
  matchedStudents: number;
  averageQuality: number;
  unmatchedStudents: string[];
  algorithmMetadata: {
    executionTime: number;
    version: string;
    parameters: MatchingParameters;
  };
}

export interface PositionAssignment {
  student1Position: 'PRO' | 'CON';
  student2Position: 'PRO' | 'CON';
  assignmentReason: string;
  confidenceLevel: number;
}

@Injectable()
export class MatchCreationService {
  private readonly logger = new Logger(MatchCreationService.name);
  
  // Default match configuration
  private readonly DEFAULT_MATCH_CONFIG = {
    expirationHours: 24,
    minQualityThreshold: 55,
    maxMatchesPerRun: 50,
    notificationDelayMinutes: 5,
    defaultReminderIntervals: [12, 4, 1] // Hours before expiration
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
    private readonly ideologicalDifferenceService: IdeologicalDifferenceService,
    private readonly matchingConstraintsService: MatchingConstraintsService,
    private readonly matchQualityService: MatchQualityService,
  ) {}

  /**
   * Create automatic matches for a class using the matching algorithm
   */
  async createAutomaticMatches(request: AutomaticMatchRequest): Promise<OptimalMatchSet> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Creating automatic matches for class ${request.classId}`);
      
      // Validate class and permissions
      await this.validateClassAccess(request.classId, request.createdBy);
      
      // Get eligible students
      const eligibleStudents = await this.matchingConstraintsService.getEligibleUsersForMatching(
        request.classId,
        request.parameters.excludeUserIds
      );

      if (eligibleStudents.length < 2) {
        throw new HttpException(
          'Insufficient eligible students for matching',
          HttpStatus.BAD_REQUEST
        );
      }

      // Generate optimal matches
      const optimalMatches = await this.generateOptimalMatches(
        eligibleStudents,
        request.parameters
      );

      // Create match records in database
      const createdMatches: MatchCreationResult[] = [];
      const matchedStudents = new Set<string>();

      for (const match of optimalMatches) {
        // Skip if either student is already matched in this run
        if (matchedStudents.has(match.matchQuality.user1Id) || 
            matchedStudents.has(match.matchQuality.user2Id)) {
          continue;
        }

        // Create the match
        const matchResult = await this.createMatchRecord({
          classId: request.classId,
          student1Id: match.matchQuality.user1Id,
          student2Id: match.matchQuality.user2Id,
          topicId: request.parameters.topicId,
          createdBy: request.createdBy,
          matchQuality: match.matchQuality,
          creationType: 'automatic'
        });

        createdMatches.push(matchResult);
        matchedStudents.add(match.matchQuality.user1Id);
        matchedStudents.add(match.matchQuality.user2Id);

        // Send notifications if configured
        if (request.notificationSettings) {
          await this.sendMatchNotifications(matchResult.matchId, request.notificationSettings);
        }
      }

      // Calculate statistics
      const averageQuality = createdMatches.length > 0 
        ? createdMatches.reduce((sum, match) => sum + match.matchQuality, 0) / createdMatches.length
        : 0;

      const unmatchedStudents = eligibleStudents.filter(id => !matchedStudents.has(id));

      const result: OptimalMatchSet = {
        classId: request.classId,
        matches: createdMatches,
        totalEligibleStudents: eligibleStudents.length,
        matchedStudents: matchedStudents.size,
        averageQuality,
        unmatchedStudents,
        algorithmMetadata: {
          executionTime: Date.now() - startTime,
          version: '1.0.0',
          parameters: request.parameters
        }
      };

      this.logger.log(
        `Created ${createdMatches.length} automatic matches for class ${request.classId}. ` +
        `Average quality: ${averageQuality.toFixed(1)}, Unmatched: ${unmatchedStudents.length}`
      );

      return result;

    } catch (error) {
      this.logger.error(`Failed to create automatic matches for class ${request.classId}`, error.stack);
      throw new HttpException(
        'Failed to create automatic matches',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create a manual match between two specific students
   */
  async createManualMatch(request: ManualMatchRequest): Promise<MatchCreationResult> {
    try {
      this.logger.log(`Creating manual match between ${request.student1Id} and ${request.student2Id}`);

      // Validate class and permissions
      await this.validateClassAccess(request.classId, request.createdBy);

      // Validate students are in the class
      await this.validateStudentsInClass(request.classId, [request.student1Id, request.student2Id]);

      // Check constraints unless override is specified
      if (!request.overrideConstraints) {
        const constraintValidation = await this.matchingConstraintsService.validateMatchingConstraints(
          request.student1Id,
          request.student2Id,
          request.classId
        );

        if (!constraintValidation.isEligible) {
          const failures = constraintValidation.failedConstraints
            .filter(f => f.severity === 'blocking')
            .map(f => f.reason)
            .join(', ');
          
          throw new HttpException(
            `Manual match blocked by constraints: ${failures}`,
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Calculate match quality for metadata
      const matchQuality = await this.matchQualityService.calculateMatchQuality(
        request.student1Id,
        request.student2Id,
        { classId: request.classId, topicId: request.topicId }
      );

      // Create the match record
      const matchResult = await this.createMatchRecord({
        classId: request.classId,
        student1Id: request.student1Id,
        student2Id: request.student2Id,
        topicId: request.topicId,
        createdBy: request.createdBy,
        matchQuality,
        creationType: 'manual',
        customMessage: request.customMessage
      });

      // Send notifications
      if (request.notificationSettings) {
        await this.sendMatchNotifications(matchResult.matchId, request.notificationSettings);
      }

      this.logger.log(`Created manual match ${matchResult.matchId} with quality ${matchResult.matchQuality.toFixed(1)}`);
      
      return matchResult;

    } catch (error) {
      this.logger.error(`Failed to create manual match between ${request.student1Id} and ${request.student2Id}`, error.stack);
      throw error instanceof HttpException ? error : new HttpException(
        'Failed to create manual match',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Assign debate positions for a match
   */
  async assignDebatePositions(
    matchId: string,
    topicId: string,
    createdBy: string
  ): Promise<PositionAssignment> {
    try {
      this.logger.log(`Assigning debate positions for match ${matchId} on topic ${topicId}`);

      // Get match details
      const match = await this.prismaService.match.findUnique({
        where: { id: matchId },
        include: {
          student1: true,
          student2: true,
          topic: true
        }
      });

      if (!match) {
        throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
      }

      // Get ideology profiles for both students
      const [student1Profile, student2Profile] = await Promise.all([
        this.getStudentIdeologyProfile(match.student1_id),
        this.getStudentIdeologyProfile(match.student2_id)
      ]);

      // Get topic details
      const topic = await this.prismaService.debateTopic.findUnique({
        where: { id: topicId }
      });

      if (!topic) {
        throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
      }

      // Assign positions based on ideological alignment with topic
      const positionAssignment = this.calculateOptimalPositions(
        student1Profile,
        student2Profile,
        topic
      );

      // Update the match with positions and topic
      await this.prismaService.match.update({
        where: { id: matchId },
        data: {
          topic_id: topicId,
          student1_position: positionAssignment.student1Position,
          student2_position: positionAssignment.student2Position,
          match_metadata: {
            ...match.match_metadata as any,
            positionAssignment,
            assignedBy: createdBy,
            assignedAt: new Date().toISOString()
          }
        }
      });

      this.logger.log(
        `Assigned positions for match ${matchId}: ${match.student1_id}=${positionAssignment.student1Position}, ` +
        `${match.student2_id}=${positionAssignment.student2Position}`
      );

      return positionAssignment;

    } catch (error) {
      this.logger.error(`Failed to assign debate positions for match ${matchId}`, error.stack);
      throw error instanceof HttpException ? error : new HttpException(
        'Failed to assign debate positions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get suggested matches for a specific user
   */
  async getSuggestedMatches(
    userId: string,
    classId: string,
    limit: number = 10
  ): Promise<RankedMatch[]> {
    try {
      this.logger.log(`Getting suggested matches for user ${userId} in class ${classId}`);

      // Get eligible candidates
      const eligibleStudents = await this.matchingConstraintsService.getEligibleUsersForMatching(
        classId,
        [userId] // Exclude the target user
      );

      if (eligibleStudents.length === 0) {
        return [];
      }

      // Rank potential matches
      const rankedMatches = await this.matchQualityService.rankPotentialMatches(
        userId,
        eligibleStudents,
        { classId, maxResults: limit, minimumQualityThreshold: this.DEFAULT_MATCH_CONFIG.minQualityThreshold }
      );

      this.logger.log(`Found ${rankedMatches.length} suggested matches for user ${userId}`);
      
      return rankedMatches;

    } catch (error) {
      this.logger.error(`Failed to get suggested matches for user ${userId}`, error.stack);
      throw new HttpException(
        'Failed to get suggested matches',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Private helper methods

  /**
   * Generate optimal matches using the matching algorithm
   */
  private async generateOptimalMatches(
    eligibleStudents: string[],
    parameters: MatchingParameters
  ): Promise<RankedMatch[]> {
    const allMatches: RankedMatch[] = [];
    const processed = new Set<string>();

    // Generate all possible match combinations and rank them
    for (let i = 0; i < eligibleStudents.length; i++) {
      const student1Id = eligibleStudents[i];
      if (processed.has(student1Id)) continue;

      const candidates = eligibleStudents
        .filter(id => id !== student1Id && !processed.has(id))
        .slice(0, Math.min(20, eligibleStudents.length)); // Limit candidates for performance

      if (candidates.length === 0) continue;

      const rankedMatches = await this.matchQualityService.rankPotentialMatches(
        student1Id,
        candidates,
        {
          classId: parameters.classId,
          topicId: parameters.topicId,
          minimumQualityThreshold: parameters.minQualityThreshold || this.DEFAULT_MATCH_CONFIG.minQualityThreshold,
          maxResults: 1 // Get only the best match for this student
        }
      );

      if (rankedMatches.length > 0) {
        allMatches.push(...rankedMatches);
      }
    }

    // Sort all matches by quality and return the best ones
    const sortedMatches = allMatches.sort((a, b) => 
      b.matchQuality.overallQualityScore - a.matchQuality.overallQualityScore
    );

    const maxMatches = parameters.maxMatches || this.DEFAULT_MATCH_CONFIG.maxMatchesPerRun;
    return sortedMatches.slice(0, maxMatches);
  }

  /**
   * Create a match record in the database
   */
  private async createMatchRecord(data: {
    classId: string;
    student1Id: string;
    student2Id: string;
    topicId?: string;
    createdBy: string;
    matchQuality: any;
    creationType: 'automatic' | 'manual';
    customMessage?: string;
  }): Promise<MatchCreationResult> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.DEFAULT_MATCH_CONFIG.expirationHours);

    const matchRecord = await this.prismaService.match.create({
      data: {
        class_id: data.classId,
        student1_id: data.student1Id,
        student2_id: data.student2Id,
        topic_id: data.topicId,
        status: 'PENDING',
        match_quality_score: data.matchQuality.overallQualityScore,
        expires_at: expiresAt,
        match_metadata: {
          creationType: data.creationType,
          algorithm: 'match-quality-v1.0.0',
          qualityFactors: data.matchQuality.qualityFactors,
          constraintValidation: data.matchQuality.constraintValidation,
          ideologicalAnalysis: data.matchQuality.ideologicalAnalysis,
          predictedSuccess: data.matchQuality.predictedSuccess,
          educationalValue: data.matchQuality.educationalValue,
          createdBy: data.createdBy,
          customMessage: data.customMessage
        }
      }
    });

    return {
      matchId: matchRecord.id,
      student1Id: matchRecord.student1_id,
      student2Id: matchRecord.student2_id,
      matchQuality: matchRecord.match_quality_score || 0,
      status: matchRecord.status,
      expiresAt: matchRecord.expires_at || expiresAt,
      notificationsSent: false,
      createdAt: matchRecord.created_at,
      metadata: {
        creationType: data.creationType,
        algorithm: 'match-quality-v1.0.0',
        qualityFactors: data.matchQuality.qualityFactors,
        constraintValidation: data.matchQuality.constraintValidation
      }
    };
  }

  /**
   * Send match notifications to students
   */
  private async sendMatchNotifications(
    matchId: string,
    settings: NotificationSettings
  ): Promise<void> {
    try {
      // This would integrate with a notification service
      // For now, we'll log the notification intent
      this.logger.log(`Sending match notifications for match ${matchId}`);
      
      // TODO: Implement actual notification sending
      // - Email notifications
      // - In-app notifications
      // - Push notifications
      // - Reminder scheduling
      
      // Update match record to indicate notifications were sent
      await this.prismaService.match.update({
        where: { id: matchId },
        data: {
          match_metadata: {
            notificationsSent: true,
            notificationSettings: settings,
            notificationSentAt: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      this.logger.error(`Failed to send notifications for match ${matchId}`, error.stack);
      // Don't throw - notifications failure shouldn't break match creation
    }
  }

  /**
   * Calculate optimal debate positions for students
   */
  private calculateOptimalPositions(
    student1Profile: any,
    student2Profile: any,
    topic: any
  ): PositionAssignment {
    // Simplified position assignment logic
    // In a full implementation, this would analyze ideological alignment with the topic
    
    // For now, assign positions to create educational challenge
    // Student with more traditional views gets the challenging position
    const student1Traditional = student1Profile?.ideologyScores?.tradition || 0;
    const student2Traditional = student2Profile?.ideologyScores?.tradition || 0;
    
    const student1Position: 'PRO' | 'CON' = student1Traditional > student2Traditional ? 'CON' : 'PRO';
    const student2Position: 'PRO' | 'CON' = student1Position === 'PRO' ? 'CON' : 'PRO';
    
    return {
      student1Position,
      student2Position,
      assignmentReason: 'Optimized for educational challenge based on ideological profiles',
      confidenceLevel: 75
    };
  }

  /**
   * Get student ideology profile
   */
  private async getStudentIdeologyProfile(userId: string): Promise<any> {
    const profile = await this.prismaService.profile.findUnique({
      where: { user_id: userId },
      select: {
        ideology_scores: true,
        opinion_plasticity: true
      }
    });

    return profile ? {
      ideologyScores: typeof profile.ideology_scores === 'string' 
        ? JSON.parse(profile.ideology_scores)
        : profile.ideology_scores,
      opinionPlasticity: profile.opinion_plasticity
    } : null;
  }

  /**
   * Validate class access for the requesting user
   */
  private async validateClassAccess(classId: string, userId: string): Promise<void> {
    const enrollment = await this.prismaService.enrollment.findFirst({
      where: {
        class_id: classId,
        user_id: userId,
        role: 'TEACHER',
        status: 'ENROLLED'
      }
    });

    if (!enrollment) {
      throw new HttpException(
        'Unauthorized: Only teachers can create matches for their classes',
        HttpStatus.FORBIDDEN
      );
    }
  }

  /**
   * Validate students are enrolled in the class
   */
  private async validateStudentsInClass(classId: string, studentIds: string[]): Promise<void> {
    const enrollments = await this.prismaService.enrollment.findMany({
      where: {
        class_id: classId,
        user_id: { in: studentIds },
        role: 'STUDENT',
        status: 'ENROLLED'
      }
    });

    if (enrollments.length !== studentIds.length) {
      const enrolledIds = enrollments.map(e => e.user_id);
      const missingIds = studentIds.filter(id => !enrolledIds.includes(id));
      
      throw new HttpException(
        `Students not enrolled in class: ${missingIds.join(', ')}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
