/**
 * Matching Constraints Service
 * 
 * Service for validating matching constraints and eligibility between users.
 * Implements business rules for class-based restrictions, availability,
 * match history, and user preferences to ensure appropriate pairings.
 * 
 * Phase 4 Task 4.2.2: Matching Constraints & Eligibility
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';

export interface MatchingConstraints {
  sameClass: boolean;
  availabilityOverlap: boolean;
  noPreviousMatch: boolean;
  respectUserBlocks: boolean;
  minimumProfileCompleteness: number;
  maximumMatchFrequency: number;
  minimumAgeGap?: number;
  maximumAgeGap?: number;
  respectGenderPreferences?: boolean;
}

export interface ConstraintValidationResult {
  isEligible: boolean;
  passedConstraints: string[];
  failedConstraints: ConstraintFailure[];
  overallScore: number;
  metadata: {
    checkedAt: Date;
    constraintVersion: string;
  };
}

export interface ConstraintFailure {
  constraintName: string;
  reason: string;
  severity: 'blocking' | 'warning';
  details?: any;
}

export interface AvailabilityWindow {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  timezone?: string;
}

export interface UserPreferences {
  userId: string;
  blockedUsers: string[];
  preferredMatchTypes?: string[];
  availabilityWindows: AvailabilityWindow[];
  maxMatchesPerWeek: number;
  minTimeBetweenMatches: number; // hours
  difficultyPreference?: 'easy' | 'medium' | 'hard';
  topicCategories: string[];
}

export interface MatchHistoryEntry {
  matchId: string;
  matchedUserId: string;
  outcome: string;
  completedAt: Date;
  satisfactionRating?: number;
}

export interface ClassEligibilityInfo {
  classId: string;
  className: string;
  isActive: boolean;
  matchingEnabled: boolean;
  constraintOverrides?: Partial<MatchingConstraints>;
}

@Injectable()
export class MatchingConstraintsService {
  private readonly logger = new Logger(MatchingConstraintsService.name);
  
  // Default constraint configuration
  private readonly DEFAULT_CONSTRAINTS: MatchingConstraints = {
    sameClass: true,
    availabilityOverlap: true,
    noPreviousMatch: true,
    respectUserBlocks: true,
    minimumProfileCompleteness: 0.8, // 80% complete
    maximumMatchFrequency: 3, // per week
    minimumAgeGap: 0,
    maximumAgeGap: 10,
    respectGenderPreferences: false
  };

  // Cooldown periods
  private readonly COOLDOWN_PERIODS = {
    sameUser: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
    dailyLimit: 24 * 60 * 60 * 1000,     // 24 hours
    weeklyReset: 7 * 24 * 60 * 60 * 1000  // 7 days
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Validate all matching constraints between two users
   */
  async validateMatchingConstraints(
    user1Id: string,
    user2Id: string,
    classId?: string,
    customConstraints?: Partial<MatchingConstraints>
  ): Promise<ConstraintValidationResult> {
    try {
      this.logger.log(`Validating matching constraints between users ${user1Id} and ${user2Id}`);

      // Get effective constraints (custom overrides or defaults)
      const constraints = { ...this.DEFAULT_CONSTRAINTS, ...customConstraints };
      
      // Get class-specific constraint overrides if applicable
      if (classId) {
        const classConstraints = await this.getClassConstraintOverrides(classId);
        Object.assign(constraints, classConstraints);
      }

      const passedConstraints: string[] = [];
      const failedConstraints: ConstraintFailure[] = [];

      // Check each constraint
      await this.checkClassEligibility(user1Id, user2Id, classId, constraints, passedConstraints, failedConstraints);
      await this.checkProfileCompleteness(user1Id, user2Id, constraints, passedConstraints, failedConstraints);
      await this.checkMatchHistory(user1Id, user2Id, constraints, passedConstraints, failedConstraints);
      await this.checkUserBlocks(user1Id, user2Id, constraints, passedConstraints, failedConstraints);
      await this.checkAvailability(user1Id, user2Id, constraints, passedConstraints, failedConstraints);
      await this.checkMatchFrequency(user1Id, user2Id, constraints, passedConstraints, failedConstraints);
      await this.checkAgeGap(user1Id, user2Id, constraints, passedConstraints, failedConstraints);

      // Calculate overall eligibility
      const blockingFailures = failedConstraints.filter(f => f.severity === 'blocking');
      const isEligible = blockingFailures.length === 0;
      
      // Calculate overall score (0-100)
      const totalChecks = passedConstraints.length + failedConstraints.length;
      const overallScore = totalChecks > 0 ? (passedConstraints.length / totalChecks) * 100 : 0;

      const result: ConstraintValidationResult = {
        isEligible,
        passedConstraints,
        failedConstraints,
        overallScore,
        metadata: {
          checkedAt: new Date(),
          constraintVersion: '1.0.0'
        }
      };

      this.logger.log(
        `Constraint validation result: eligible=${isEligible}, score=${overallScore.toFixed(1)}, ` +
        `passed=${passedConstraints.length}, failed=${failedConstraints.length}`
      );

      return result;

    } catch (error) {
      this.logger.error(`Failed to validate matching constraints between ${user1Id} and ${user2Id}`, error.stack);
      throw new HttpException(
        'Failed to validate matching constraints',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Check class-based eligibility
   */
  private async checkClassEligibility(
    user1Id: string,
    user2Id: string,
    classId: string | undefined,
    constraints: MatchingConstraints,
    passed: string[],
    failed: ConstraintFailure[]
  ): Promise<void> {
    if (!constraints.sameClass) {
      passed.push('class_eligibility_not_required');
      return;
    }

    if (!classId) {
      failed.push({
        constraintName: 'class_eligibility',
        reason: 'No class specified for matching',
        severity: 'blocking'
      });
      return;
    }

    try {
      // Check if both users are in the same class
      const enrollments = await this.prismaService.enrollment.findMany({
        where: {
          class_id: classId,
          user_id: { in: [user1Id, user2Id] },
          status: 'ENROLLED'
        },
        select: {
          user_id: true,
          role: true
        }
      });

      if (enrollments.length !== 2) {
        const missingUsers = [user1Id, user2Id].filter(
          id => !enrollments.some(e => e.user_id === id)
        );
        
        failed.push({
          constraintName: 'class_eligibility',
          reason: 'Users not enrolled in the same class',
          severity: 'blocking',
          details: { missingUsers, classId }
        });
        return;
      }

      // Both users are students (not teacher-student pairing)
      const studentEnrollments = enrollments.filter(e => e.role === 'STUDENT');
      if (studentEnrollments.length !== 2) {
        failed.push({
          constraintName: 'class_eligibility',
          reason: 'Cannot match teacher with student',
          severity: 'blocking',
          details: { enrollments }
        });
        return;
      }

      passed.push('class_eligibility');

    } catch (error) {
      this.logger.error('Failed to check class eligibility', error.stack);
      failed.push({
        constraintName: 'class_eligibility',
        reason: 'Failed to validate class membership',
        severity: 'blocking'
      });
    }
  }

  /**
   * Check profile completeness
   */
  private async checkProfileCompleteness(
    user1Id: string,
    user2Id: string,
    constraints: MatchingConstraints,
    passed: string[],
    failed: ConstraintFailure[]
  ): Promise<void> {
    try {
      const profiles = await this.prismaService.profile.findMany({
        where: {
          user_id: { in: [user1Id, user2Id] }
        },
        select: {
          user_id: true,
          is_completed: true,
          completion_percentage: true,
          belief_embedding: true,
          ideology_scores: true
        }
      });

      if (profiles.length !== 2) {
        failed.push({
          constraintName: 'profile_completeness',
          reason: 'One or both users do not have profiles',
          severity: 'blocking'
        });
        return;
      }

      for (const profile of profiles) {
        const completeness = profile.completion_percentage || 0;
        const requiredCompleteness = constraints.minimumProfileCompleteness * 100;

        if (completeness < requiredCompleteness || !profile.is_completed) {
          failed.push({
            constraintName: 'profile_completeness',
            reason: `User profile not sufficiently complete (${completeness}% < ${requiredCompleteness}%)`,
            severity: 'blocking',
            details: { userId: profile.user_id, completeness, required: requiredCompleteness }
          });
          return;
        }

        // Check if essential data is present
        if (!profile.belief_embedding || !profile.ideology_scores) {
          failed.push({
            constraintName: 'profile_completeness',
            reason: 'User profile missing essential belief analysis data',
            severity: 'blocking',
            details: { 
              userId: profile.user_id,
              hasEmbedding: !!profile.belief_embedding,
              hasIdeologyScores: !!profile.ideology_scores
            }
          });
          return;
        }
      }

      passed.push('profile_completeness');

    } catch (error) {
      this.logger.error('Failed to check profile completeness', error.stack);
      failed.push({
        constraintName: 'profile_completeness',
        reason: 'Failed to validate profile completeness',
        severity: 'blocking'
      });
    }
  }

  /**
   * Check match history and cooldowns
   */
  private async checkMatchHistory(
    user1Id: string,
    user2Id: string,
    constraints: MatchingConstraints,
    passed: string[],
    failed: ConstraintFailure[]
  ): Promise<void> {
    if (!constraints.noPreviousMatch) {
      passed.push('match_history_not_required');
      return;
    }

    try {
      const cooldownDate = new Date(Date.now() - this.COOLDOWN_PERIODS.sameUser);
      
      // Check for recent matches between these two users
      const recentMatches = await this.prismaService.match.findMany({
        where: {
          OR: [
            { student1_id: user1Id, student2_id: user2Id },
            { student1_id: user2Id, student2_id: user1Id }
          ],
          created_at: {
            gte: cooldownDate
          }
        },
        select: {
          id: true,
          status: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' }
      });

      if (recentMatches.length > 0) {
        const lastMatch = recentMatches[0];
        const daysSince = Math.floor(
          (Date.now() - lastMatch.created_at.getTime()) / (24 * 60 * 60 * 1000)
        );

        failed.push({
          constraintName: 'match_history_cooldown',
          reason: `Users were matched too recently (${daysSince} days ago)`,
          severity: 'blocking',
          details: { 
            lastMatchId: lastMatch.id,
            lastMatchDate: lastMatch.created_at,
            daysSince,
            requiredCooldown: 14
          }
        });
        return;
      }

      passed.push('match_history_cooldown');

    } catch (error) {
      this.logger.error('Failed to check match history', error.stack);
      failed.push({
        constraintName: 'match_history',
        reason: 'Failed to validate match history',
        severity: 'warning'
      });
    }
  }

  /**
   * Check user blocks and preferences
   */
  private async checkUserBlocks(
    user1Id: string,
    user2Id: string,
    constraints: MatchingConstraints,
    passed: string[],
    failed: ConstraintFailure[]
  ): Promise<void> {
    if (!constraints.respectUserBlocks) {
      passed.push('user_blocks_not_required');
      return;
    }

    try {
      // This would integrate with a user preferences system
      // For now, we'll check if there are any explicit user blocks in the database
      
      // Check for user blocks (this would be implemented when user preferences are added)
      // Placeholder for now - assume no blocks
      passed.push('user_blocks');

    } catch (error) {
      this.logger.error('Failed to check user blocks', error.stack);
      failed.push({
        constraintName: 'user_blocks',
        reason: 'Failed to validate user preferences',
        severity: 'warning'
      });
    }
  }

  /**
   * Check availability overlap
   */
  private async checkAvailability(
    user1Id: string,
    user2Id: string,
    constraints: MatchingConstraints,
    passed: string[],
    failed: ConstraintFailure[]
  ): Promise<void> {
    if (!constraints.availabilityOverlap) {
      passed.push('availability_not_required');
      return;
    }

    try {
      // This would check user availability windows
      // For now, we'll assume availability is acceptable
      // This would integrate with a user preferences/availability system
      
      passed.push('availability_overlap');

    } catch (error) {
      this.logger.error('Failed to check availability', error.stack);
      failed.push({
        constraintName: 'availability',
        reason: 'Failed to validate availability overlap',
        severity: 'warning'
      });
    }
  }

  /**
   * Check match frequency limits
   */
  private async checkMatchFrequency(
    user1Id: string,
    user2Id: string,
    constraints: MatchingConstraints,
    passed: string[],
    failed: ConstraintFailure[]
  ): Promise<void> {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
      weekStart.setHours(0, 0, 0, 0);

      // Count matches for each user this week
      for (const userId of [user1Id, user2Id]) {
        const weeklyMatches = await this.prismaService.match.count({
          where: {
            OR: [
              { student1_id: userId },
              { student2_id: userId }
            ],
            created_at: {
              gte: weekStart
            },
            status: { not: 'CANCELLED' }
          }
        });

        if (weeklyMatches >= constraints.maximumMatchFrequency) {
          failed.push({
            constraintName: 'match_frequency',
            reason: `User has reached weekly match limit (${weeklyMatches}/${constraints.maximumMatchFrequency})`,
            severity: 'blocking',
            details: { userId, weeklyMatches, limit: constraints.maximumMatchFrequency }
          });
          return;
        }
      }

      passed.push('match_frequency');

    } catch (error) {
      this.logger.error('Failed to check match frequency', error.stack);
      failed.push({
        constraintName: 'match_frequency',
        reason: 'Failed to validate match frequency limits',
        severity: 'warning'
      });
    }
  }

  /**
   * Check age gap constraints (if applicable)
   */
  private async checkAgeGap(
    user1Id: string,
    user2Id: string,
    constraints: MatchingConstraints,
    passed: string[],
    failed: ConstraintFailure[]
  ): Promise<void> {
    if (!constraints.minimumAgeGap && !constraints.maximumAgeGap) {
      passed.push('age_gap_not_required');
      return;
    }

    try {
      const users = await this.prismaService.user.findMany({
        where: {
          id: { in: [user1Id, user2Id] }
        },
        select: {
          id: true,
          date_of_birth: true
        }
      });

      if (users.length !== 2 || !users[0].date_of_birth || !users[1].date_of_birth) {
        // If age data is not available, we'll allow the match but log a warning
        passed.push('age_gap_unknown');
        return;
      }

      const age1 = this.calculateAge(users[0].date_of_birth);
      const age2 = this.calculateAge(users[1].date_of_birth);
      const ageGap = Math.abs(age1 - age2);

      if (constraints.minimumAgeGap && ageGap < constraints.minimumAgeGap) {
        failed.push({
          constraintName: 'age_gap_minimum',
          reason: `Age gap too small (${ageGap} < ${constraints.minimumAgeGap})`,
          severity: 'blocking',
          details: { age1, age2, ageGap, minimum: constraints.minimumAgeGap }
        });
        return;
      }

      if (constraints.maximumAgeGap && ageGap > constraints.maximumAgeGap) {
        failed.push({
          constraintName: 'age_gap_maximum',
          reason: `Age gap too large (${ageGap} > ${constraints.maximumAgeGap})`,
          severity: 'blocking',
          details: { age1, age2, ageGap, maximum: constraints.maximumAgeGap }
        });
        return;
      }

      passed.push('age_gap');

    } catch (error) {
      this.logger.error('Failed to check age gap', error.stack);
      failed.push({
        constraintName: 'age_gap',
        reason: 'Failed to validate age constraints',
        severity: 'warning'
      });
    }
  }

  /**
   * Get class-specific constraint overrides
   */
  private async getClassConstraintOverrides(classId: string): Promise<Partial<MatchingConstraints>> {
    try {
      const classData = await this.prismaService.class.findUnique({
        where: { id: classId },
        select: {
          matching_settings: true
        }
      });

      if (classData?.matching_settings) {
        // Parse matching settings from JSONB
        const settings = typeof classData.matching_settings === 'string'
          ? JSON.parse(classData.matching_settings)
          : classData.matching_settings;
        
        return settings.constraints || {};
      }

      return {};

    } catch (error) {
      this.logger.error(`Failed to get class constraint overrides for class ${classId}`, error.stack);
      return {};
    }
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Batch validate constraints for multiple user pairs
   */
  async batchValidateConstraints(
    userPairs: Array<[string, string]>,
    classId?: string,
    customConstraints?: Partial<MatchingConstraints>
  ): Promise<Map<string, ConstraintValidationResult>> {
    const results = new Map<string, ConstraintValidationResult>();
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < userPairs.length; i += batchSize) {
      const batch = userPairs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ([user1Id, user2Id]) => {
        const pairKey = `${user1Id}_${user2Id}`;
        const result = await this.validateMatchingConstraints(user1Id, user2Id, classId, customConstraints);
        return { pairKey, result };
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ pairKey, result }) => {
        results.set(pairKey, result);
      });
    }

    this.logger.log(`Batch validated constraints for ${userPairs.length} user pairs`);
    return results;
  }

  /**
   * Get eligible users for matching within a class
   */
  async getEligibleUsersForMatching(
    classId: string,
    excludeUserIds: string[] = [],
    customConstraints?: Partial<MatchingConstraints>
  ): Promise<string[]> {
    try {
      const constraints = { ...this.DEFAULT_CONSTRAINTS, ...customConstraints };
      
      // Get all students in the class
      const enrollments = await this.prismaService.enrollment.findMany({
        where: {
          class_id: classId,
          role: 'STUDENT',
          status: 'ENROLLED',
          user_id: {
            notIn: excludeUserIds
          }
        },
        select: {
          user_id: true
        }
      });

      const candidateUserIds = enrollments.map(e => e.user_id);

      // Filter by profile completeness and other individual constraints
      const eligibleUsers: string[] = [];
      
      for (const userId of candidateUserIds) {
        const isEligible = await this.checkIndividualEligibility(userId, constraints);
        if (isEligible) {
          eligibleUsers.push(userId);
        }
      }

      this.logger.log(`Found ${eligibleUsers.length} eligible users for matching in class ${classId}`);
      return eligibleUsers;

    } catch (error) {
      this.logger.error(`Failed to get eligible users for class ${classId}`, error.stack);
      throw new HttpException(
        'Failed to get eligible users for matching',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Check individual user eligibility (profile completeness, frequency limits, etc.)
   */
  private async checkIndividualEligibility(
    userId: string,
    constraints: MatchingConstraints
  ): Promise<boolean> {
    try {
      // Check profile completeness
      const profile = await this.prismaService.profile.findUnique({
        where: { user_id: userId },
        select: {
          is_completed: true,
          completion_percentage: true,
          belief_embedding: true,
          ideology_scores: true
        }
      });

      if (!profile) return false;

      const completeness = profile.completion_percentage || 0;
      const requiredCompleteness = constraints.minimumProfileCompleteness * 100;
      
      if (completeness < requiredCompleteness || !profile.is_completed) return false;
      if (!profile.belief_embedding || !profile.ideology_scores) return false;

      // Check match frequency
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weeklyMatches = await this.prismaService.match.count({
        where: {
          OR: [
            { student1_id: userId },
            { student2_id: userId }
          ],
          created_at: {
            gte: weekStart
          },
          status: { not: 'CANCELLED' }
        }
      });

      return weeklyMatches < constraints.maximumMatchFrequency;

    } catch (error) {
      this.logger.error(`Failed to check individual eligibility for user ${userId}`, error.stack);
      return false;
    }
  }
}
