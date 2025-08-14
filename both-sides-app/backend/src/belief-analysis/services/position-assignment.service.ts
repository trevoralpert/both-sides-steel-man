/**
 * Position Assignment Service
 * 
 * Advanced service for assigning debate positions with educational optimization.
 * Balances challenge levels, ensures variety, and maximizes learning outcomes
 * through strategic position assignment based on belief profiles.
 * 
 * Phase 4 Task 4.4.3: Position Assignment System
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { IdeologicalDifferenceService } from './ideological-difference.service';

export interface PositionAssignment {
  user1Position: 'PRO' | 'CON';
  user2Position: 'PRO' | 'CON';
  assignmentReason: string;
  challengeLevel: number; // 1-10 scale
  educationalValue: number; // 1-100 scale
  confidenceLevel: number; // 0-1 scale
  metadata: {
    user1Challenge: number;
    user2Challenge: number;
    topicAlignment: TopicAlignment;
    varietyScore: number;
    assignmentStrategy: AssignmentStrategy;
  };
}

export interface TopicAlignment {
  user1Alignment: number; // -1 (strongly against) to 1 (strongly for)
  user2Alignment: number;
  overallPolarization: number; // How divided they are on this topic
}

export interface AssignmentStrategy {
  primary: 'challenge_user1' | 'challenge_user2' | 'balanced_challenge' | 'comfort_zone' | 'variety_seeking';
  reasoning: string;
  alternativeConsidered: boolean;
}

export interface PositionPreferences {
  preferredPositions: ('PRO' | 'CON')[];
  avoidedTopics: string[];
  challengeLevel: 'low' | 'medium' | 'high';
  learningGoals: string[];
}

export interface PositionHistory {
  userId: string;
  recentPositions: Array<{
    position: 'PRO' | 'CON';
    topicId: string;
    topicCategory: string;
    challengeLevel: number;
    outcome: string;
    date: Date;
  }>;
  positionBalance: {
    proCount: number;
    conCount: number;
    ratio: number; // proCount / (proCount + conCount)
  };
  categoryBalance: Record<string, { pro: number; con: number }>;
  averageChallengeLevel: number;
  improvementTrend: number; // -1 to 1, based on recent performance
}

export interface User {
  id: string;
  belief_profile?: {
    ideology_scores: any;
    opinion_plasticity: number;
    belief_embedding: number[];
  };
}

export interface DebateTopic {
  id: string;
  title: string;
  category: string;
  difficulty_level: number;
  description?: string;
  pro_resources?: any;
  con_resources?: any;
}

@Injectable()
export class PositionAssignmentService {
  private readonly logger = new Logger(PositionAssignmentService.name);

  // Assignment weights for different factors
  private readonly ASSIGNMENT_WEIGHTS = {
    educational_challenge: 0.35,
    variety_balance: 0.25,
    user_preferences: 0.20,
    fairness_balance: 0.15,
    topic_alignment: 0.05
  };

  // Challenge level configuration
  private readonly CHALLENGE_CONFIG = {
    min_challenge_level: 3, // Avoid too easy assignments
    max_challenge_level: 8, // Avoid overwhelming assignments
    optimal_challenge_range: [4, 7], // Sweet spot for learning
    challenge_progression_rate: 0.2 // How much to increase challenge over time
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
    private readonly ideologicalDifferenceService: IdeologicalDifferenceService,
  ) {}

  /**
   * Assign optimal debate positions for two users on a given topic
   */
  async assignPositions(
    user1: User,
    user2: User,
    topic: DebateTopic,
    preferences?: {
      user1Preferences?: PositionPreferences;
      user2Preferences?: PositionPreferences;
      prioritizeChallenge?: boolean;
      ensureVariety?: boolean;
    }
  ): Promise<PositionAssignment> {
    try {
      this.logger.log(`Assigning positions for users ${user1.id} and ${user2.id} on topic ${topic.id}`);

      // Get position histories
      const [user1History, user2History] = await Promise.all([
        this.getPositionHistory(user1.id),
        this.getPositionHistory(user2.id)
      ]);

      // Calculate topic alignment for both users
      const topicAlignment = await this.calculateTopicAlignment(user1, user2, topic);

      // Calculate challenge levels for different position assignments
      const challengeAnalysis = await this.analyzeChallengeOptions(
        user1, user2, topic, topicAlignment
      );

      // Evaluate variety needs
      const varietyAnalysis = this.analyzeVarietyNeeds(user1History, user2History, topic);

      // Consider user preferences
      const preferenceAnalysis = this.analyzeUserPreferences(
        preferences?.user1Preferences,
        preferences?.user2Preferences,
        topicAlignment
      );

      // Determine optimal assignment strategy
      const strategy = this.selectAssignmentStrategy(
        challengeAnalysis,
        varietyAnalysis,
        preferenceAnalysis,
        preferences
      );

      // Generate final position assignment
      const assignment = this.generatePositionAssignment(
        user1, user2, topic, topicAlignment, challengeAnalysis, varietyAnalysis, strategy
      );

      // Validate assignment quality
      this.validateAssignment(assignment, challengeAnalysis);

      // Cache assignment decision for analytics
      await this.cacheAssignmentDecision(assignment, {
        challengeAnalysis,
        varietyAnalysis,
        preferenceAnalysis,
        strategy
      });

      this.logger.log(
        `Assigned positions - User1: ${assignment.user1Position}, User2: ${assignment.user2Position} ` +
        `(Challenge: ${assignment.challengeLevel}, Educational: ${assignment.educationalValue})`
      );

      return assignment;

    } catch (error) {
      this.logger.error(`Failed to assign positions: ${error.message}`, error.stack);
      throw new HttpException(
        `Position assignment failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Calculate how aligned each user is with the pro/con positions on a topic
   */
  private async calculateTopicAlignment(
    user1: User,
    user2: User,
    topic: DebateTopic
  ): Promise<TopicAlignment> {
    try {
      // Get ideology scores for both users
      const user1Ideology = user1.belief_profile?.ideology_scores || {};
      const user2Ideology = user2.belief_profile?.ideology_scores || {};

      // Calculate alignment based on topic category and ideology scores
      const user1Alignment = this.calculateUserTopicAlignment(user1Ideology, topic);
      const user2Alignment = this.calculateUserTopicAlignment(user2Ideology, topic);

      // Calculate overall polarization (how much they differ)
      const overallPolarization = Math.abs(user1Alignment - user2Alignment);

      return {
        user1Alignment,
        user2Alignment,
        overallPolarization
      };

    } catch (error) {
      this.logger.warn(`Failed to calculate topic alignment: ${error.message}`);
      // Return neutral alignment if calculation fails
      return {
        user1Alignment: 0,
        user2Alignment: 0,
        overallPolarization: 0
      };
    }
  }

  /**
   * Calculate a single user's alignment with a topic (pro = positive, con = negative)
   */
  private calculateUserTopicAlignment(ideologyScores: any, topic: DebateTopic): number {
    // Map topic categories to ideology dimensions
    const categoryMappings = {
      'Politics': ['liberal_conservative', 'authoritarian_libertarian'],
      'Economics': ['liberal_conservative', 'collective_individualist'],
      'Environment': ['progressive_traditional', 'globalist_nationalist'],
      'Technology': ['progressive_traditional', 'collective_individualist'],
      'Social Issues': ['liberal_conservative', 'progressive_traditional'],
      'Ethics': ['secular_religious', 'progressive_traditional'],
      'Education': ['liberal_conservative', 'collective_individualist'],
      'Healthcare': ['liberal_conservative', 'collective_individualist']
    };

    const relevantAxes = categoryMappings[topic.category] || ['liberal_conservative'];
    
    // Calculate weighted average alignment
    let totalAlignment = 0;
    let totalWeight = 0;

    for (const axis of relevantAxes) {
      const score = ideologyScores[axis];
      if (score !== undefined) {
        // Convert 0-100 score to -1 to 1 alignment
        const alignment = (score - 50) / 50;
        totalAlignment += alignment;
        totalWeight += 1;
      }
    }

    return totalWeight > 0 ? totalAlignment / totalWeight : 0;
  }

  /**
   * Analyze challenge levels for different position assignments
   */
  private async analyzeChallengeOptions(
    user1: User,
    user2: User,
    topic: DebateTopic,
    topicAlignment: TopicAlignment
  ): Promise<any> {
    // Option 1: User1 PRO, User2 CON
    const option1User1Challenge = this.calculatePositionChallenge(
      user1, 'PRO', topic, topicAlignment.user1Alignment
    );
    const option1User2Challenge = this.calculatePositionChallenge(
      user2, 'CON', topic, topicAlignment.user2Alignment
    );

    // Option 2: User1 CON, User2 PRO
    const option2User1Challenge = this.calculatePositionChallenge(
      user1, 'CON', topic, topicAlignment.user1Alignment
    );
    const option2User2Challenge = this.calculatePositionChallenge(
      user2, 'PRO', topic, topicAlignment.user2Alignment
    );

    return {
      option1: {
        user1Position: 'PRO',
        user2Position: 'CON',
        user1Challenge: option1User1Challenge,
        user2Challenge: option1User2Challenge,
        averageChallenge: (option1User1Challenge + option1User2Challenge) / 2,
        challengeBalance: Math.abs(option1User1Challenge - option1User2Challenge)
      },
      option2: {
        user1Position: 'CON',
        user2Position: 'PRO',
        user1Challenge: option2User1Challenge,
        user2Challenge: option2User2Challenge,
        averageChallenge: (option2User1Challenge + option2User2Challenge) / 2,
        challengeBalance: Math.abs(option2User1Challenge - option2User2Challenge)
      }
    };
  }

  /**
   * Calculate challenge level for a specific user taking a specific position
   */
  private calculatePositionChallenge(
    user: User,
    position: 'PRO' | 'CON',
    topic: DebateTopic,
    userAlignment: number
  ): number {
    // Base challenge from topic difficulty
    let challenge = topic.difficulty_level || 5;

    // Adjust based on position alignment
    if (position === 'PRO') {
      // If user is naturally pro (-1 to 1 scale), lower challenge
      // If user is naturally con, higher challenge
      challenge += (1 - userAlignment) * 2;
    } else {
      // If user is naturally con, lower challenge
      // If user is naturally pro, higher challenge
      challenge += (1 + userAlignment) * 2;
    }

    // Factor in user's opinion plasticity (more plastic = can handle more challenge)
    const plasticity = user.belief_profile?.opinion_plasticity || 50;
    const plasticityModifier = (plasticity - 50) / 50 * 1.5; // -1.5 to 1.5
    challenge += plasticityModifier;

    // Ensure challenge is within reasonable bounds
    return Math.max(1, Math.min(10, Math.round(challenge)));
  }

  /**
   * Analyze variety needs based on position history
   */
  private analyzeVarietyNeeds(
    user1History: PositionHistory,
    user2History: PositionHistory,
    topic: DebateTopic
  ): any {
    return {
      user1VarietyNeed: this.calculateVarietyNeed(user1History, topic),
      user2VarietyNeed: this.calculateVarietyNeed(user2History, topic),
      categoryBalance: {
        user1: user1History.categoryBalance[topic.category] || { pro: 0, con: 0 },
        user2: user2History.categoryBalance[topic.category] || { pro: 0, con: 0 }
      }
    };
  }

  /**
   * Calculate how much a user needs variety in position assignment
   */
  private calculateVarietyNeed(history: PositionHistory, topic: DebateTopic): number {
    let varietyNeed = 0;

    // Check overall position balance
    if (history.positionBalance.ratio > 0.7) {
      varietyNeed += 3; // Too many PRO positions
    } else if (history.positionBalance.ratio < 0.3) {
      varietyNeed += 3; // Too many CON positions
    }

    // Check category balance
    const categoryBalance = history.categoryBalance[topic.category];
    if (categoryBalance) {
      const total = categoryBalance.pro + categoryBalance.con;
      const ratio = total > 0 ? categoryBalance.pro / total : 0.5;
      
      if (ratio > 0.75 || ratio < 0.25) {
        varietyNeed += 2; // Imbalanced in this category
      }
    }

    // Check recent positions
    const recentPositions = history.recentPositions.slice(0, 3);
    const recentProCount = recentPositions.filter(p => p.position === 'PRO').length;
    const recentConCount = recentPositions.length - recentProCount;
    
    if (recentPositions.length >= 2) {
      if (recentProCount === recentPositions.length) {
        varietyNeed += 4; // All recent positions were PRO
      } else if (recentConCount === recentPositions.length) {
        varietyNeed += 4; // All recent positions were CON
      }
    }

    return Math.min(10, varietyNeed);
  }

  /**
   * Analyze user preferences and constraints
   */
  private analyzeUserPreferences(
    user1Preferences?: PositionPreferences,
    user2Preferences?: PositionPreferences,
    topicAlignment?: TopicAlignment
  ): any {
    return {
      user1: {
        hasPreferences: !!user1Preferences,
        preferredPositions: user1Preferences?.preferredPositions || [],
        challengeLevel: user1Preferences?.challengeLevel || 'medium',
        constraints: user1Preferences?.avoidedTopics?.length || 0
      },
      user2: {
        hasPreferences: !!user2Preferences,
        preferredPositions: user2Preferences?.preferredPositions || [],
        challengeLevel: user2Preferences?.challengeLevel || 'medium',
        constraints: user2Preferences?.avoidedTopics?.length || 0
      }
    };
  }

  /**
   * Select the optimal assignment strategy
   */
  private selectAssignmentStrategy(
    challengeAnalysis: any,
    varietyAnalysis: any,
    preferenceAnalysis: any,
    options?: any
  ): AssignmentStrategy {
    let strategy: AssignmentStrategy['primary'] = 'balanced_challenge';
    let reasoning = '';

    // Prioritize variety if users need it
    if (varietyAnalysis.user1VarietyNeed > 6 || varietyAnalysis.user2VarietyNeed > 6) {
      strategy = 'variety_seeking';
      reasoning = 'Users need position variety for balanced learning experience';
    }
    // Challenge-focused assignment if requested
    else if (options?.prioritizeChallenge) {
      const option1Avg = challengeAnalysis.option1.averageChallenge;
      const option2Avg = challengeAnalysis.option2.averageChallenge;
      
      if (Math.abs(option1Avg - option2Avg) > 1) {
        strategy = option1Avg > option2Avg ? 'challenge_user1' : 'challenge_user2';
        reasoning = 'Prioritizing educational challenge as requested';
      }
    }
    // Default to balanced approach
    else {
      strategy = 'balanced_challenge';
      reasoning = 'Balancing educational value, fairness, and user engagement';
    }

    return {
      primary: strategy,
      reasoning,
      alternativeConsidered: true
    };
  }

  /**
   * Generate the final position assignment
   */
  private generatePositionAssignment(
    user1: User,
    user2: User,
    topic: DebateTopic,
    topicAlignment: TopicAlignment,
    challengeAnalysis: any,
    varietyAnalysis: any,
    strategy: AssignmentStrategy
  ): PositionAssignment {
    let selectedOption = challengeAnalysis.option1; // Default

    // Apply strategy to select option
    switch (strategy.primary) {
      case 'variety_seeking':
        selectedOption = this.selectForVariety(challengeAnalysis, varietyAnalysis);
        break;
      case 'challenge_user1':
        selectedOption = challengeAnalysis.option1.user1Challenge > challengeAnalysis.option2.user1Challenge 
          ? challengeAnalysis.option1 : challengeAnalysis.option2;
        break;
      case 'challenge_user2':
        selectedOption = challengeAnalysis.option1.user2Challenge > challengeAnalysis.option2.user2Challenge 
          ? challengeAnalysis.option1 : challengeAnalysis.option2;
        break;
      case 'balanced_challenge':
        selectedOption = challengeAnalysis.option1.challengeBalance < challengeAnalysis.option2.challengeBalance
          ? challengeAnalysis.option1 : challengeAnalysis.option2;
        break;
    }

    // Calculate educational value
    const educationalValue = this.calculateEducationalValue(
      selectedOption, topicAlignment, varietyAnalysis
    );

    // Calculate confidence in assignment
    const confidenceLevel = this.calculateConfidenceLevel(
      selectedOption, challengeAnalysis, varietyAnalysis
    );

    return {
      user1Position: selectedOption.user1Position,
      user2Position: selectedOption.user2Position,
      assignmentReason: strategy.reasoning,
      challengeLevel: Math.round(selectedOption.averageChallenge),
      educationalValue: Math.round(educationalValue),
      confidenceLevel: Number(confidenceLevel.toFixed(2)),
      metadata: {
        user1Challenge: selectedOption.user1Challenge,
        user2Challenge: selectedOption.user2Challenge,
        topicAlignment,
        varietyScore: (varietyAnalysis.user1VarietyNeed + varietyAnalysis.user2VarietyNeed) / 2,
        assignmentStrategy: strategy
      }
    };
  }

  /**
   * Select assignment option that maximizes variety
   */
  private selectForVariety(challengeAnalysis: any, varietyAnalysis: any): any {
    // Logic to select based on variety needs
    // This is a simplified version - could be more sophisticated
    return varietyAnalysis.user1VarietyNeed > varietyAnalysis.user2VarietyNeed 
      ? challengeAnalysis.option1 
      : challengeAnalysis.option2;
  }

  /**
   * Calculate educational value of the assignment
   */
  private calculateEducationalValue(
    selectedOption: any,
    topicAlignment: TopicAlignment,
    varietyAnalysis: any
  ): number {
    let value = 50; // Base value

    // Higher challenge increases educational value (up to a point)
    const avgChallenge = selectedOption.averageChallenge;
    if (avgChallenge >= 4 && avgChallenge <= 7) {
      value += 20; // Optimal challenge range
    } else if (avgChallenge >= 3 && avgChallenge <= 8) {
      value += 10; // Good challenge range
    }

    // Balance between users increases value
    if (selectedOption.challengeBalance < 2) {
      value += 15; // Well-balanced challenge
    }

    // Variety contributes to educational value
    const avgVarietyNeed = (varietyAnalysis.user1VarietyNeed + varietyAnalysis.user2VarietyNeed) / 2;
    if (avgVarietyNeed > 5) {
      value += 10; // Addressing variety needs
    }

    // Polarization can be educational if managed well
    if (topicAlignment.overallPolarization > 0.3 && topicAlignment.overallPolarization < 0.8) {
      value += 10; // Good level of disagreement
    }

    return Math.min(100, Math.max(0, value));
  }

  /**
   * Calculate confidence level in the assignment
   */
  private calculateConfidenceLevel(
    selectedOption: any,
    challengeAnalysis: any,
    varietyAnalysis: any
  ): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence if challenges are in optimal range
    if (selectedOption.averageChallenge >= 4 && selectedOption.averageChallenge <= 7) {
      confidence += 0.2;
    }

    // Higher confidence if well-balanced
    if (selectedOption.challengeBalance < 1.5) {
      confidence += 0.1;
    }

    // Lower confidence if extreme variety needs
    const avgVarietyNeed = (varietyAnalysis.user1VarietyNeed + varietyAnalysis.user2VarietyNeed) / 2;
    if (avgVarietyNeed > 8) {
      confidence -= 0.2;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Get position history for a user
   */
  private async getPositionHistory(userId: string): Promise<PositionHistory> {
    try {
      const cacheKey = `position_history:${userId}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get recent matches for this user
      const matches = await this.prismaService.match.findMany({
        where: {
          OR: [
            { student1_id: userId },
            { student2_id: userId }
          ],
          status: 'COMPLETED'
        },
        include: {
          topic: true
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 20 // Last 20 matches for history analysis
      });

      const recentPositions = matches.map(match => {
        const position = match.student1_id === userId ? match.student1_position : match.student2_position;
        return {
          position: position as 'PRO' | 'CON',
          topicId: match.topic_id || '',
          topicCategory: match.topic?.category || 'Other',
          challengeLevel: this.extractChallengeFromMetadata(match.match_metadata, userId),
          outcome: 'completed', // Could be enhanced with actual outcome data
          date: match.created_at
        };
      }).filter(p => p.position); // Filter out null positions

      // Calculate position balance
      const proCount = recentPositions.filter(p => p.position === 'PRO').length;
      const conCount = recentPositions.filter(p => p.position === 'CON').length;
      const total = proCount + conCount;

      // Calculate category balance
      const categoryBalance: Record<string, { pro: number; con: number }> = {};
      recentPositions.forEach(pos => {
        if (!categoryBalance[pos.topicCategory]) {
          categoryBalance[pos.topicCategory] = { pro: 0, con: 0 };
        }
        categoryBalance[pos.topicCategory][pos.position.toLowerCase() as 'pro' | 'con']++;
      });

      // Calculate average challenge level
      const avgChallengeLevel = recentPositions.length > 0 
        ? recentPositions.reduce((sum, pos) => sum + pos.challengeLevel, 0) / recentPositions.length
        : 5;

      const history: PositionHistory = {
        userId,
        recentPositions,
        positionBalance: {
          proCount,
          conCount,
          ratio: total > 0 ? proCount / total : 0.5
        },
        categoryBalance,
        averageChallengeLevel: avgChallengeLevel,
        improvementTrend: 0 // TODO: Calculate based on performance metrics
      };

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, history, 3600000);
      
      return history;

    } catch (error) {
      this.logger.warn(`Failed to get position history for user ${userId}: ${error.message}`);
      
      // Return empty history
      return {
        userId,
        recentPositions: [],
        positionBalance: { proCount: 0, conCount: 0, ratio: 0.5 },
        categoryBalance: {},
        averageChallengeLevel: 5,
        improvementTrend: 0
      };
    }
  }

  /**
   * Extract challenge level from match metadata
   */
  private extractChallengeFromMetadata(metadata: any, userId: string): number {
    try {
      if (!metadata) return 5;
      
      const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      const positionAssignment = meta.positionAssignment;
      
      if (positionAssignment?.metadata?.user1Challenge && meta.student1_id === userId) {
        return positionAssignment.metadata.user1Challenge;
      }
      if (positionAssignment?.metadata?.user2Challenge && meta.student2_id === userId) {
        return positionAssignment.metadata.user2Challenge;
      }
      
      return 5; // Default challenge level
    } catch {
      return 5;
    }
  }

  /**
   * Validate assignment quality
   */
  private validateAssignment(assignment: PositionAssignment, challengeAnalysis: any): void {
    // Ensure challenge levels are reasonable
    if (assignment.challengeLevel < 1 || assignment.challengeLevel > 10) {
      throw new Error('Challenge level out of valid range');
    }

    // Ensure educational value is reasonable
    if (assignment.educationalValue < 0 || assignment.educationalValue > 100) {
      throw new Error('Educational value out of valid range');
    }

    // Ensure positions are assigned
    if (!assignment.user1Position || !assignment.user2Position) {
      throw new Error('Positions not properly assigned');
    }

    // Ensure positions are different
    if (assignment.user1Position === assignment.user2Position) {
      throw new Error('Both users cannot have the same position');
    }
  }

  /**
   * Cache assignment decision for analytics
   */
  private async cacheAssignmentDecision(assignment: PositionAssignment, analysisData: any): Promise<void> {
    try {
      const cacheKey = `assignment_decision:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      const data = {
        assignment,
        analysisData,
        timestamp: new Date().toISOString()
      };
      
      // Cache for 24 hours for analytics purposes
      await this.cacheService.set(cacheKey, data, 86400000);
    } catch (error) {
      this.logger.warn(`Failed to cache assignment decision: ${error.message}`);
    }
  }

  /**
   * Get assignment statistics for analytics
   */
  async getAssignmentStats(userId?: string, classId?: string): Promise<any> {
    try {
      // This would be used by the analytics service
      // Implementation would query assignment patterns, success rates, etc.
      return {
        totalAssignments: 0,
        averageChallengeLevel: 0,
        positionBalance: { pro: 0, con: 0 },
        categoryDistribution: {},
        successRate: 0
      };
    } catch (error) {
      this.logger.error(`Failed to get assignment stats: ${error.message}`);
      throw error;
    }
  }
}
