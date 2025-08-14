/**
 * Topic Difficulty Service
 * 
 * Service for assessing and calculating debate topic difficulty using
 * multiple factors including vocabulary complexity, conceptual depth,
 * controversiality level, and evidence requirements.
 * 
 * Phase 4 Task 4.1.3: Basic Topic Management System - Difficulty Assessment
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../common/services/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssessTopicDifficultyDto,
  DifficultyAssessmentResponseDto,
  TopicCategory
} from './dto/topics.dto';

export interface DifficultyFactors {
  vocabularyComplexity: number;      // 0-10 based on word complexity
  conceptualDepth: number;           // 0-10 based on abstract concepts
  controversialityLevel: number;     // 0-10 based on how divisive the topic is
  evidenceRequirement: number;       // 0-10 based on research/evidence needed
  argumentStructureComplexity: number; // 0-10 based on argument complexity
}

export interface DifficultyWeights {
  vocabularyComplexity: number;
  conceptualDepth: number;
  controversialityLevel: number;
  evidenceRequirement: number;
  argumentStructureComplexity: number;
}

@Injectable()
export class TopicDifficultyService {
  private readonly logger = new Logger(TopicDifficultyService.name);
  private readonly ASSESSMENT_VERSION = '1.0.0';
  private readonly CACHE_TTL = 7200000; // 2 hours

  // Default weights for difficulty factors
  private readonly DEFAULT_WEIGHTS: DifficultyWeights = {
    vocabularyComplexity: 0.15,
    conceptualDepth: 0.25,
    controversialityLevel: 0.20,
    evidenceRequirement: 0.25,
    argumentStructureComplexity: 0.15
  };

  // Category-specific adjustment factors
  private readonly CATEGORY_ADJUSTMENTS: Record<string, number> = {
    [TopicCategory.PHILOSOPHY]: 1.2,      // Philosophy tends to be more complex
    [TopicCategory.SCIENCE]: 1.15,        // Science requires technical knowledge
    [TopicCategory.ECONOMICS]: 1.1,       // Economics requires understanding of systems
    [TopicCategory.POLITICS]: 1.05,       // Politics can be complex but accessible
    [TopicCategory.ETHICS]: 1.1,          // Ethics involves abstract reasoning
    [TopicCategory.TECHNOLOGY]: 1.05,     // Technology varies in complexity
    [TopicCategory.ENVIRONMENT]: 1.0,     // Generally accessible
    [TopicCategory.EDUCATION]: 0.95,      // Often more accessible
    [TopicCategory.HEALTHCARE]: 1.05,     // Requires some technical knowledge
    [TopicCategory.SOCIAL_ISSUES]: 0.95,  // Generally accessible
    [TopicCategory.CURRENT_EVENTS]: 0.9,  // Usually accessible
    [TopicCategory.OTHER]: 1.0            // Neutral adjustment
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Assess the difficulty of a specific topic
   */
  async assessTopicDifficulty(
    assessDto: AssessTopicDifficultyDto
  ): Promise<DifficultyAssessmentResponseDto> {
    try {
      const { topicId, recalculate = false } = assessDto;
      
      this.logger.log(`Assessing difficulty for topic ${topicId}`);

      // Check cache first (unless recalculation is forced)
      if (!recalculate) {
        const cacheKey = `topic_difficulty:${topicId}`;
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Get topic from database
      const topic = await this.prismaService.debateTopic.findUnique({
        where: { id: topicId }
      });

      if (!topic) {
        throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
      }

      // Calculate difficulty factors
      const factors = await this.calculateDifficultyFactors(topic);

      // Calculate overall difficulty score
      const assessedDifficulty = this.calculateOverallDifficulty(factors, topic.category);

      // Calculate complexity score (0-100 scale)
      const complexityScore = this.calculateComplexityScore(factors);

      // Update topic with assessed difficulty
      await this.updateTopicDifficulty(topicId, assessedDifficulty, complexityScore);

      const result: DifficultyAssessmentResponseDto = {
        topicId,
        assessedDifficulty,
        complexityScore,
        assessmentFactors: factors,
        assessmentVersion: this.ASSESSMENT_VERSION,
        assessedAt: new Date().toISOString()
      };

      // Cache the result
      const cacheKey = `topic_difficulty:${topicId}`;
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

      this.logger.log(
        `Assessed topic ${topicId}: difficulty=${assessedDifficulty}, complexity=${complexityScore}`
      );

      return result;

    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to assess topic difficulty: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to assess topic difficulty',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Batch assess multiple topics
   */
  async batchAssessTopics(topicIds: string[]): Promise<DifficultyAssessmentResponseDto[]> {
    try {
      this.logger.log(`Batch assessing ${topicIds.length} topics`);

      const results = await Promise.all(
        topicIds.map(topicId => 
          this.assessTopicDifficulty({ topicId, recalculate: false })
        )
      );

      this.logger.log(`Completed batch assessment of ${results.length} topics`);

      return results;

    } catch (error) {
      this.logger.error(`Failed batch topic assessment: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed batch topic assessment',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get difficulty distribution across all topics
   */
  async getDifficultyDistribution(): Promise<Record<string, number>> {
    try {
      const cacheKey = 'difficulty_distribution';
      
      // Check cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const distribution = await this.prismaService.debateTopic.groupBy({
        by: ['difficulty_level'],
        where: { is_active: true },
        _count: { difficulty_level: true }
      });

      const result = distribution.reduce((acc, item) => {
        acc[`Level ${item.difficulty_level}`] = item._count.difficulty_level;
        return acc;
      }, {} as Record<string, number>);

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, result, 1800000);

      return result;

    } catch (error) {
      this.logger.error(`Failed to get difficulty distribution: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get difficulty distribution',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Recommend difficulty level for a user/class
   */
  async recommendDifficultyLevel(
    userExperience: number = 5,
    classLevel?: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<number> {
    try {
      let baseDifficulty = userExperience;

      // Adjust based on class level
      if (classLevel) {
        switch (classLevel) {
          case 'beginner':
            baseDifficulty = Math.min(baseDifficulty, 4);
            break;
          case 'intermediate':
            baseDifficulty = Math.max(3, Math.min(baseDifficulty, 7));
            break;
          case 'advanced':
            baseDifficulty = Math.max(6, baseDifficulty);
            break;
        }
      }

      // Ensure within valid range
      return Math.max(1, Math.min(10, Math.round(baseDifficulty)));

    } catch (error) {
      this.logger.error(`Failed to recommend difficulty level: ${error.message}`);
      return 5; // Default to moderate difficulty
    }
  }

  // Private helper methods

  private async calculateDifficultyFactors(topic: any): Promise<DifficultyFactors> {
    const title = topic.title;
    const description = topic.description;
    const category = topic.category;

    return {
      vocabularyComplexity: this.assessVocabularyComplexity(title + ' ' + description),
      conceptualDepth: this.assessConceptualDepth(title, description, category),
      controversialityLevel: this.assessControversialityLevel(title, description, category),
      evidenceRequirement: this.assessEvidenceRequirement(title, description, category),
      argumentStructureComplexity: this.assessArgumentStructureComplexity(title, description)
    };
  }

  private assessVocabularyComplexity(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    if (totalWords === 0) return 5;

    // Count complex words (more than 6 characters or contain specific patterns)
    const complexWords = words.filter(word => {
      return word.length > 6 || 
             /tion|sion|ment|ness|ity|ism|ology|graphy/.test(word) ||
             /^un|re|pre|anti|pro/.test(word);
    });

    const complexityRatio = complexWords.length / totalWords;

    // Convert to 0-10 scale
    const score = Math.min(10, Math.max(0, complexityRatio * 20));
    
    return Math.round(score * 10) / 10;
  }

  private assessConceptualDepth(title: string, description: string, category: string): number {
    const text = (title + ' ' + description).toLowerCase();
    
    // Abstract concept indicators
    const abstractIndicators = [
      'philosophy', 'ethics', 'morality', 'justice', 'freedom', 'democracy',
      'consciousness', 'existence', 'meaning', 'purpose', 'value', 'principle',
      'theory', 'concept', 'paradigm', 'framework', 'ideology', 'doctrine'
    ];

    const abstractCount = abstractIndicators.filter(indicator => 
      text.includes(indicator)
    ).length;

    let baseScore = Math.min(10, abstractCount * 2);

    // Category-specific adjustments
    if (category === TopicCategory.PHILOSOPHY) baseScore += 2;
    if (category === TopicCategory.ETHICS) baseScore += 1.5;
    if (category === TopicCategory.SCIENCE) baseScore += 1;

    return Math.min(10, Math.max(0, Math.round(baseScore * 10) / 10));
  }

  private assessControversialityLevel(title: string, description: string, category: string): number {
    const text = (title + ' ' + description).toLowerCase();
    
    // Controversial topic indicators
    const controversialIndicators = [
      'abortion', 'religion', 'politics', 'race', 'gender', 'immigration',
      'gun', 'death penalty', 'euthanasia', 'genetic', 'surveillance',
      'privacy', 'capitalism', 'socialism', 'democracy', 'dictatorship'
    ];

    const controversialCount = controversialIndicators.filter(indicator => 
      text.includes(indicator)
    ).length;

    let baseScore = Math.min(10, controversialCount * 3);

    // Category-specific adjustments
    if (category === TopicCategory.POLITICS) baseScore += 2;
    if (category === TopicCategory.ETHICS) baseScore += 1.5;
    if (category === TopicCategory.SOCIAL_ISSUES) baseScore += 1;

    return Math.min(10, Math.max(0, Math.round(baseScore * 10) / 10));
  }

  private assessEvidenceRequirement(title: string, description: string, category: string): number {
    const text = (title + ' ' + description).toLowerCase();
    
    // Evidence-heavy indicators
    const evidenceIndicators = [
      'research', 'study', 'data', 'statistics', 'evidence', 'proof',
      'scientific', 'empirical', 'analysis', 'experiment', 'survey',
      'clinical', 'trial', 'peer-reviewed', 'meta-analysis'
    ];

    const evidenceCount = evidenceIndicators.filter(indicator => 
      text.includes(indicator)
    ).length;

    let baseScore = Math.min(10, evidenceCount * 2.5);

    // Category-specific adjustments
    if (category === TopicCategory.SCIENCE) baseScore += 2;
    if (category === TopicCategory.HEALTHCARE) baseScore += 1.5;
    if (category === TopicCategory.ECONOMICS) baseScore += 1;

    // Add base requirement for all topics
    baseScore = Math.max(3, baseScore);

    return Math.min(10, Math.max(0, Math.round(baseScore * 10) / 10));
  }

  private assessArgumentStructureComplexity(title: string, description: string): number {
    const text = (title + ' ' + description).toLowerCase();
    
    // Complex argument indicators
    const complexityIndicators = [
      'multiple', 'various', 'complex', 'nuanced', 'multifaceted',
      'interdisciplinary', 'systemic', 'holistic', 'comprehensive',
      'interrelated', 'multilayered', 'sophisticated'
    ];

    const complexityCount = complexityIndicators.filter(indicator => 
      text.includes(indicator)
    ).length;

    // Base complexity on description length and structure
    const sentences = description.split(/[.!?]+/).length;
    const lengthComplexity = Math.min(5, sentences / 3);
    
    const indicatorComplexity = Math.min(5, complexityCount * 1.5);

    const totalComplexity = lengthComplexity + indicatorComplexity;

    return Math.min(10, Math.max(0, Math.round(totalComplexity * 10) / 10));
  }

  private calculateOverallDifficulty(factors: DifficultyFactors, category: string): number {
    const weights = this.DEFAULT_WEIGHTS;
    
    const weightedSum = (
      factors.vocabularyComplexity * weights.vocabularyComplexity +
      factors.conceptualDepth * weights.conceptualDepth +
      factors.controversialityLevel * weights.controversialityLevel +
      factors.evidenceRequirement * weights.evidenceRequirement +
      factors.argumentStructureComplexity * weights.argumentStructureComplexity
    );

    // Apply category adjustment
    const categoryAdjustment = this.CATEGORY_ADJUSTMENTS[category] || 1.0;
    const adjustedScore = weightedSum * categoryAdjustment;

    // Ensure score is within 1-10 range
    return Math.min(10, Math.max(1, Math.round(adjustedScore * 10) / 10));
  }

  private calculateComplexityScore(factors: DifficultyFactors): number {
    // Convert 1-10 difficulty to 0-100 complexity scale
    const averageFactor = (
      factors.vocabularyComplexity +
      factors.conceptualDepth +
      factors.controversialityLevel +
      factors.evidenceRequirement +
      factors.argumentStructureComplexity
    ) / 5;

    return Math.round((averageFactor / 10) * 100);
  }

  private async updateTopicDifficulty(
    topicId: string, 
    difficulty: number, 
    complexityScore: number
  ): Promise<void> {
    try {
      await this.prismaService.debateTopic.update({
        where: { id: topicId },
        data: {
          difficulty_level: Math.round(difficulty),
          complexity_score: complexityScore
        }
      });
    } catch (error) {
      this.logger.error(`Failed to update topic difficulty: ${error.message}`);
      // Don't throw - assessment can still return results
    }
  }
}
