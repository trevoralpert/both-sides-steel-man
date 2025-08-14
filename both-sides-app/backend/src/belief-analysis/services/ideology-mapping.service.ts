/**
 * Ideology Mapping Service
 * 
 * Service for mapping survey responses to multi-dimensional ideology scores.
 * Implements sophisticated algorithms for scoring political and social beliefs
 * across multiple axes with educational context and age-appropriate interpretation.
 * 
 * Task 3.2.3: Create Ideology Axis Mapping Algorithms
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  IDEOLOGY_QUESTION_MAPPINGS, 
  IDEOLOGY_AXIS_DEFINITIONS, 
  getIdeologyMapping,
  getMappingsByCategory 
} from '../data/ideology-question-mappings';

export interface IdeologyMappingRequest {
  profileId: string;
  surveyResponses: SurveyResponseData[];
  beliefSummary?: string;
  previousScores?: IdeologyScores;
}

export interface SurveyResponseData {
  questionId: string;
  questionText: string;
  questionCategory: string;
  responseValue: any;
  responseText?: string;
  confidenceLevel?: number;
  ideologyMapping?: QuestionIdeologyMapping;
}

export interface QuestionIdeologyMapping {
  axes: {
    [axisName: string]: {
      weight: number;
      direction: 'positive' | 'negative';
      conditions?: ResponseCondition[];
    };
  };
}

export interface ResponseCondition {
  responseValue: any;
  multiplier: number;
  description?: string;
}

export interface IdeologyScores {
  economic: number;        // -1 (left/socialist) to +1 (right/capitalist)
  social: number;          // -1 (authoritarian) to +1 (libertarian)
  tradition: number;       // -1 (progressive) to +1 (traditional)
  globalism: number;       // -1 (nationalist) to +1 (globalist)
  environment: number;     // -1 (economic priority) to +1 (environmental priority)
  certainty: number;       // 0 (uncertain) to 1 (very certain)
  consistency: number;     // 0 (inconsistent) to 1 (very consistent)
}

export interface IdeologyInterpretation {
  profileId: string;
  scores: IdeologyScores;
  labels: {
    primary: string;
    secondary?: string;
    description: string;
  };
  quadrant: {
    economic: 'left' | 'center' | 'right';
    social: 'authoritarian' | 'moderate' | 'libertarian';
    overall: string;
  };
  educationalContext: {
    strengths: string[];
    growthAreas: string[];
    debateTopics: string[];
    matchingConsiderations: string[];
  };
  comparisons: {
    peers: string;
    historical: string[];
    contemporary: string[];
  };
}

@Injectable()
export class IdeologyMappingService {
  private readonly logger = new Logger(IdeologyMappingService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Map survey responses to ideology scores
   */
  async mapIdeologyScores(request: IdeologyMappingRequest): Promise<IdeologyScores> {
    try {
      this.validateMappingRequest(request);

      // Initialize scores
      const rawScores = this.initializeScores();

      // Process each survey response
      for (const response of request.surveyResponses) {
        this.processResponse(response, rawScores);
      }

      // Normalize and calibrate scores
      const normalizedScores = this.normalizeScores(rawScores);

      // Calculate meta-scores (certainty and consistency)
      const metaScores = this.calculateMetaScores(request.surveyResponses, normalizedScores);

      // Combine all scores
      const finalScores: IdeologyScores = {
        ...normalizedScores,
        ...metaScores,
      };

      // Apply age and educational context adjustments
      const adjustedScores = this.applyEducationalAdjustments(finalScores, request);

      // Validate final scores
      this.validateScores(adjustedScores);

      this.logger.log(`Generated ideology scores for profile ${request.profileId}`);
      
      return adjustedScores;

    } catch (error) {
      this.logger.error(`Failed to map ideology scores for profile ${request.profileId}`, error.stack);
      throw new HttpException(
        'Failed to generate ideology mapping',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate comprehensive ideology interpretation
   */
  async interpretIdeology(
    profileId: string, 
    scores: IdeologyScores,
    additionalContext?: any
  ): Promise<IdeologyInterpretation> {
    try {
      // Determine primary and secondary labels
      const labels = this.generateIdeologyLabels(scores);

      // Determine quadrant positioning
      const quadrant = this.determineQuadrant(scores);

      // Generate educational context
      const educationalContext = this.generateEducationalContext(scores);

      // Generate comparisons
      const comparisons = await this.generateComparisons(scores, additionalContext);

      const interpretation: IdeologyInterpretation = {
        profileId,
        scores,
        labels,
        quadrant,
        educationalContext,
        comparisons,
      };

      this.logger.log(`Generated ideology interpretation for profile ${profileId}`);
      
      return interpretation;

    } catch (error) {
      this.logger.error(`Failed to interpret ideology for profile ${profileId}`, error.stack);
      throw new HttpException(
        'Failed to generate ideology interpretation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate ideology consistency across responses
   */
  async validateConsistency(
    responses: SurveyResponseData[], 
    scores: IdeologyScores
  ): Promise<{
    isConsistent: boolean;
    warnings: string[];
    suggestions: string[];
    reliabilityScore: number;
  }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let reliabilityScore = 1.0;

    // Check for contradictory positions
    const contradictions = this.detectContradictions(responses, scores);
    if (contradictions.length > 0) {
      warnings.push(...contradictions);
      reliabilityScore -= contradictions.length * 0.1;
    }

    // Check response patterns
    const patterns = this.analyzeResponsePatterns(responses);
    if (patterns.suspiciousPatterns.length > 0) {
      warnings.push(...patterns.suspiciousPatterns);
      reliabilityScore -= patterns.suspiciousPatterns.length * 0.05;
    }

    // Check confidence levels consistency
    const confidenceAnalysis = this.analyzeConfidenceLevels(responses);
    if (confidenceAnalysis.inconsistent) {
      warnings.push('Confidence levels vary significantly across similar topics');
      suggestions.push('Consider reviewing responses where confidence levels seem inconsistent');
      reliabilityScore -= 0.1;
    }

    // Generate improvement suggestions
    suggestions.push(...this.generateConsistencyImprovements(scores, responses));

    const isConsistent = warnings.length === 0 && reliabilityScore > 0.7;

    return {
      isConsistent,
      warnings,
      suggestions,
      reliabilityScore: Math.max(0, Math.min(1, reliabilityScore)),
    };
  }

  /**
   * Initialize raw ideology scores
   */
  private initializeScores(): Record<string, { total: number; count: number; weights: number }> {
    return {
      economic: { total: 0, count: 0, weights: 0 },
      social: { total: 0, count: 0, weights: 0 },
      tradition: { total: 0, count: 0, weights: 0 },
      globalism: { total: 0, count: 0, weights: 0 },
      environment: { total: 0, count: 0, weights: 0 },
    };
  }

  /**
   * Process individual survey response with enhanced mapping
   */
  private processResponse(
    response: SurveyResponseData, 
    rawScores: Record<string, { total: number; count: number; weights: number }>
  ): void {
    // Try to get mapping from our comprehensive database first
    let ideologyMapping = getIdeologyMapping(response.questionId);
    
    if (!ideologyMapping) {
      // Fall back to provided mapping or generate default
      if (!response.ideologyMapping) {
        response.ideologyMapping = this.generateDefaultMapping(response);
      }
    } else {
      // Use the research-backed mapping from our database
      response.ideologyMapping = ideologyMapping.ideologyMapping;
      this.logger.debug(`Using research-backed mapping for question ${response.questionId}`);
    }

    const responseWeight = this.calculateResponseWeight(response);
    
    // Apply mapping to each axis with enhanced scoring
    Object.entries(response.ideologyMapping.axes).forEach(([axis, mapping]) => {
      if (rawScores[axis]) {
        const scoreContribution = this.calculateAdvancedScoreContribution(
          response,
          mapping,
          responseWeight
        );

        rawScores[axis].total += scoreContribution;
        rawScores[axis].count += 1;
        rawScores[axis].weights += mapping.weight;
      }
    });
  }

  /**
   * Generate default ideology mapping for questions without explicit mapping
   */
  private generateDefaultMapping(response: SurveyResponseData): QuestionIdeologyMapping {
    const category = response.questionCategory.toLowerCase();
    const defaultMapping: QuestionIdeologyMapping = { axes: {} };

    switch (category) {
      case 'economic':
        defaultMapping.axes.economic = { weight: 1.0, direction: 'positive' };
        break;
      
      case 'social':
        defaultMapping.axes.social = { weight: 1.0, direction: 'positive' };
        break;
      
      case 'political':
        defaultMapping.axes.economic = { weight: 0.6, direction: 'positive' };
        defaultMapping.axes.social = { weight: 0.4, direction: 'positive' };
        break;
      
      case 'philosophical':
        defaultMapping.axes.tradition = { weight: 0.7, direction: 'positive' };
        defaultMapping.axes.social = { weight: 0.3, direction: 'positive' };
        break;
      
      default:
        // Generic mapping for personal or unspecified categories
        defaultMapping.axes.social = { weight: 0.5, direction: 'positive' };
        break;
    }

    return defaultMapping;
  }

  /**
   * Calculate response weight based on confidence and quality
   */
  private calculateResponseWeight(response: SurveyResponseData): number {
    let weight = 1.0;

    // Adjust for confidence level
    if (response.confidenceLevel) {
      weight *= (response.confidenceLevel / 5.0);
    }

    // Adjust for response quality (text responses add weight)
    if (response.responseText && response.responseText.length > 10) {
      weight *= 1.2;
    }

    return Math.max(0.1, Math.min(2.0, weight));
  }

  /**
   * Calculate advanced score contribution with conditional logic
   */
  private calculateAdvancedScoreContribution(
    response: SurveyResponseData,
    mapping: any,
    weight: number
  ): number {
    let baseScore = this.calculateBaseScore(response.responseValue);
    
    // Apply conditional logic if present
    if (mapping.conditions) {
      const matchingCondition = mapping.conditions.find((condition: any) =>
        this.matchesCondition(response.responseValue, condition.responseValue)
      );
      
      if (matchingCondition) {
        baseScore *= matchingCondition.multiplier;
        this.logger.debug(`Applied conditional multiplier ${matchingCondition.multiplier} for response`);
      }
    }

    // Consider response text for additional context
    if (response.responseText) {
      const textModifier = this.analyzeResponseText(response.responseText, mapping);
      baseScore += textModifier;
    }

    // Apply direction multiplier
    if (mapping.direction === 'negative') {
      baseScore *= -1;
    }

    // Apply mapping weight and response weight
    const finalScore = baseScore * mapping.weight * weight;
    
    // Ensure score stays within reasonable bounds
    return Math.max(-2, Math.min(2, finalScore));
  }

  /**
   * Calculate base score from response value
   */
  private calculateBaseScore(responseValue: any): number {
    let baseScore = 0;

    // Handle different response types with enhanced logic
    if (typeof responseValue === 'number') {
      // Likert scales (1-5, 1-7, etc.)
      if (responseValue >= 1 && responseValue <= 5) {
        baseScore = ((responseValue - 3) / 2); // -1 to +1 scale
      } else if (responseValue >= 1 && responseValue <= 7) {
        baseScore = ((responseValue - 4) / 3); // -1 to +1 scale
      } else if (responseValue >= 0 && responseValue <= 100) {
        // Slider scale 0-100 to -1 to +1
        baseScore = ((responseValue - 50) / 50);
      } else if (responseValue >= 0 && responseValue <= 10) {
        // 0-10 scale to -1 to +1
        baseScore = ((responseValue - 5) / 5);
      }
    } else if (typeof responseValue === 'boolean') {
      // Binary responses
      baseScore = responseValue ? 1 : -1;
    } else if (Array.isArray(responseValue)) {
      // Multiple choice or ranking responses
      baseScore = this.processArrayResponse(responseValue);
    } else if (typeof responseValue === 'string') {
      // Handle string responses (e.g., "strongly_agree")
      baseScore = this.processStringResponse(responseValue);
    }

    return baseScore;
  }

  /**
   * Analyze response text for ideological indicators
   */
  private analyzeResponseText(responseText: string, mapping: any): number {
    if (!responseText || responseText.length < 10) return 0;
    
    const lowerText = responseText.toLowerCase();
    let textModifier = 0;

    // Look for ideological keywords and phrases
    const ideologicalMarkers = {
      economic: {
        left: ['equality', 'redistribution', 'social justice', 'workers', 'inequality'],
        right: ['freedom', 'individual', 'market', 'competition', 'entrepreneurship']
      },
      social: {
        authoritarian: ['order', 'discipline', 'traditional', 'authority', 'stability'],
        libertarian: ['choice', 'freedom', 'individual', 'liberty', 'personal']
      },
      environment: {
        priority: ['climate', 'sustainable', 'future generations', 'planet', 'green'],
        economic: ['jobs', 'growth', 'economy', 'practical', 'realistic']
      }
    };

    // Apply text analysis based on axis type
    // This is a simplified version - could be much more sophisticated
    const relevantMarkers = ideologicalMarkers[mapping.axis as keyof typeof ideologicalMarkers];
    if (relevantMarkers) {
      Object.entries(relevantMarkers).forEach(([direction, keywords]) => {
        const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
        if (matches > 0) {
          const modifier = matches * 0.1; // Small boost for ideological language
          textModifier += direction === 'left' || direction === 'authoritarian' || direction === 'priority' 
            ? -modifier : modifier;
        }
      });
    }

    return Math.max(-0.3, Math.min(0.3, textModifier)); // Limit text influence
  }

  /**
   * Process string responses (e.g., "strongly_agree", "somewhat_disagree")
   */
  private processStringResponse(responseValue: string): number {
    const lowerValue = responseValue.toLowerCase();
    
    // Handle common Likert-style string responses
    const likertMappings: Record<string, number> = {
      'strongly_disagree': -1,
      'disagree': -0.5,
      'somewhat_disagree': -0.25,
      'neutral': 0,
      'neither': 0,
      'somewhat_agree': 0.25,
      'agree': 0.5,
      'strongly_agree': 1,
      'yes': 1,
      'no': -1,
      'true': 1,
      'false': -1
    };

    return likertMappings[lowerValue] || 0;
  }

  /**
   * Check if response matches a condition
   */
  private matchesCondition(responseValue: any, conditionValue: any): boolean {
    if (typeof responseValue === typeof conditionValue) {
      return responseValue === conditionValue;
    }
    
    // Handle type mismatches (e.g., string "5" vs number 5)
    return String(responseValue) === String(conditionValue);
  }

  /**
   * Process array responses (multiple choice, rankings)
   */
  private processArrayResponse(responseValue: any[]): number {
    if (responseValue.length === 0) return 0;
    
    // Handle different array response types
    if (responseValue.every(val => typeof val === 'number')) {
      // Numeric array - calculate weighted average
      const sum = responseValue.reduce((acc, val, index) => {
        // Weight earlier items more heavily for rankings
        const weight = responseValue.length - index;
        return acc + (val * weight);
      }, 0);
      
      const totalWeight = responseValue.reduce((acc, _, index) => 
        acc + (responseValue.length - index), 0
      );
      
      const average = sum / totalWeight;
      return this.normalizeToRange(average, -1, 1);
      
    } else if (responseValue.every(val => typeof val === 'string')) {
      // String array - look for ideological indicators
      const textScore = responseValue.reduce((acc, text) => {
        return acc + this.processStringResponse(text);
      }, 0) / responseValue.length;
      
      return textScore;
      
    } else {
      // Mixed array - process each element and average
      const scores = responseValue.map(val => {
        if (typeof val === 'number') return this.normalizeToRange(val, -1, 1);
        if (typeof val === 'string') return this.processStringResponse(val);
        if (typeof val === 'boolean') return val ? 1 : -1;
        return 0;
      });
      
      return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
  }

  /**
   * Normalize scores to -1 to +1 range
   */
  private normalizeScores(
    rawScores: Record<string, { total: number; count: number; weights: number }>
  ): Omit<IdeologyScores, 'certainty' | 'consistency'> {
    const normalized: any = {};

    Object.entries(rawScores).forEach(([axis, data]) => {
      if (data.count > 0 && data.weights > 0) {
        // Calculate weighted average
        const average = data.total / data.weights;
        // Normalize to -1 to +1 range
        normalized[axis] = this.normalizeToRange(average, -1, 1);
      } else {
        normalized[axis] = 0; // Default to neutral
      }
    });

    return normalized;
  }

  /**
   * Calculate meta-scores (certainty and consistency)
   */
  private calculateMetaScores(
    responses: SurveyResponseData[], 
    scores: Omit<IdeologyScores, 'certainty' | 'consistency'>
  ): { certainty: number; consistency: number } {
    // Calculate certainty from confidence levels
    const confidenceLevels = responses
      .filter(r => r.confidenceLevel !== undefined)
      .map(r => r.confidenceLevel!);

    const certainty = confidenceLevels.length > 0 
      ? confidenceLevels.reduce((sum, conf) => sum + conf, 0) / confidenceLevels.length / 5.0
      : 0.5;

    // Calculate consistency from score variance
    const scoreValues = Object.values(scores);
    const consistency = scoreValues.length > 0 
      ? 1 - this.calculateVariance(scoreValues)
      : 0.5;

    return {
      certainty: Math.max(0, Math.min(1, certainty)),
      consistency: Math.max(0, Math.min(1, consistency)),
    };
  }

  /**
   * Apply educational context adjustments
   */
  private applyEducationalAdjustments(
    scores: IdeologyScores, 
    request: IdeologyMappingRequest
  ): IdeologyScores {
    // For educational context, moderate extreme scores slightly
    const adjusted = { ...scores };

    Object.keys(adjusted).forEach(key => {
      if (key !== 'certainty' && key !== 'consistency') {
        const value = adjusted[key as keyof IdeologyScores] as number;
        // Apply 10% moderation towards center for educational context
        adjusted[key as keyof IdeologyScores] = value * 0.9;
      }
    });

    return adjusted;
  }

  /**
   * Generate ideology labels and descriptions using axis definitions
   */
  private generateIdeologyLabels(scores: IdeologyScores): IdeologyInterpretation['labels'] {
    // Use the comprehensive axis definitions for better labeling
    const economicAxis = IDEOLOGY_AXIS_DEFINITIONS.economic;
    const socialAxis = IDEOLOGY_AXIS_DEFINITIONS.social;
    const traditionAxis = IDEOLOGY_AXIS_DEFINITIONS.tradition;
    const environmentAxis = IDEOLOGY_AXIS_DEFINITIONS.environment;
    
    // Determine primary label based on strongest dimensions
    const strongestDimensions = this.findStrongestDimensions(scores);
    let primary = this.generatePrimaryLabel(scores, strongestDimensions);
    let secondary = this.generateSecondaryLabel(scores, strongestDimensions);

    const description = this.generateAdvancedDescription(scores);

    return { primary, secondary, description };
  }

  /**
   * Find the strongest ideological dimensions for this profile
   */
  private findStrongestDimensions(scores: IdeologyScores): string[] {
    const dimensionStrengths = [
      { axis: 'economic', strength: Math.abs(scores.economic) },
      { axis: 'social', strength: Math.abs(scores.social) },
      { axis: 'tradition', strength: Math.abs(scores.tradition) },
      { axis: 'globalism', strength: Math.abs(scores.globalism) },
      { axis: 'environment', strength: Math.abs(scores.environment) }
    ];

    return dimensionStrengths
      .filter(d => d.strength > 0.2) // Only consider meaningful positions
      .sort((a, b) => b.strength - a.strength) // Sort by strength
      .slice(0, 2) // Take top 2
      .map(d => d.axis);
  }

  /**
   * Generate primary ideological label
   */
  private generatePrimaryLabel(scores: IdeologyScores, strongestDimensions: string[]): string {
    if (strongestDimensions.length === 0) {
      return 'Moderate Centrist';
    }

    const [primary, secondary] = strongestDimensions;
    
    // Build descriptive label based on strongest dimensions
    let label = '';
    
    if (primary === 'economic') {
      label = scores.economic > 0 ? 'Market-Oriented' : 'Social Democratic';
    } else if (primary === 'social') {
      label = scores.social > 0 ? 'Civil Libertarian' : 'Social Conservative';  
    } else if (primary === 'tradition') {
      label = scores.tradition > 0 ? 'Traditional Conservative' : 'Progressive Liberal';
    } else if (primary === 'environment') {
      label = scores.environment > 0 ? 'Environmental Progressive' : 'Economic Pragmatist';
    } else if (primary === 'globalism') {
      label = scores.globalism > 0 ? 'Internationalist' : 'Nationalist';
    }

    // Add secondary characteristic if present
    if (secondary) {
      if (secondary === 'social' && primary !== 'social') {
        label += scores.social > 0 ? ' Libertarian' : ' Authoritarian';
      } else if (secondary === 'economic' && primary !== 'economic') {
        label += scores.economic > 0 ? ' Conservative' : ' Progressive';
      }
    }

    return label || 'Independent';
  }

  /**
   * Generate secondary ideological characteristic
   */
  private generateSecondaryLabel(scores: IdeologyScores, strongestDimensions: string[]): string | undefined {
    // Look for notable secondary characteristics not covered in primary
    const unusedDimensions = ['economic', 'social', 'tradition', 'globalism', 'environment']
      .filter(axis => !strongestDimensions.includes(axis));

    for (const axis of unusedDimensions) {
      const score = scores[axis as keyof IdeologyScores] as number;
      if (Math.abs(score) > 0.4) {
        switch (axis) {
          case 'tradition':
            return score > 0 ? 'Traditional Values' : 'Progressive Values';
          case 'environment':
            return score > 0 ? 'Environmentally Conscious' : 'Growth-Focused';
          case 'globalism':
            return score > 0 ? 'Globally Minded' : 'Nationally Focused';
        }
      }
    }

    return undefined;
  }

  /**
   * Generate advanced ideological description
   */
  private generateAdvancedDescription(scores: IdeologyScores): string {
    const certaintyLevel = scores.certainty > 0.7 ? 'strong' : scores.certainty < 0.4 ? 'developing' : 'moderate';
    const consistencyLevel = scores.consistency > 0.8 ? 'highly consistent' : scores.consistency < 0.6 ? 'evolving' : 'generally consistent';
    
    let description = `A thoughtful individual with ${certaintyLevel} convictions and ${consistencyLevel} beliefs across political and social issues.`;
    
    // Add specific insights based on scores
    const insights: string[] = [];
    
    if (scores.certainty > 0.8) {
      insights.push('demonstrates confident positions on political issues');
    } else if (scores.certainty < 0.4) {
      insights.push('shows openness to exploring different political perspectives');
    }
    
    if (scores.consistency > 0.8) {
      insights.push('maintains logical coherence across different policy areas');
    } else if (scores.consistency < 0.6) {
      insights.push('exhibits some complexity and nuance in political thinking that may appear contradictory but reflects real-world trade-offs');
    }

    if (insights.length > 0) {
      description += ` This person ${insights.join(' and ')}.`;
    }

    return description;
  }

  /**
   * Determine political quadrant
   */
  private determineQuadrant(scores: IdeologyScores): IdeologyInterpretation['quadrant'] {
    const economic = scores.economic > 0.2 ? 'right' : scores.economic < -0.2 ? 'left' : 'center';
    const social = scores.social > 0.2 ? 'libertarian' : scores.social < -0.2 ? 'authoritarian' : 'moderate';
    
    let overall = '';
    if (economic === 'left' && social === 'libertarian') overall = 'Libertarian Left';
    else if (economic === 'right' && social === 'libertarian') overall = 'Libertarian Right';
    else if (economic === 'left' && social === 'authoritarian') overall = 'Authoritarian Left';
    else if (economic === 'right' && social === 'authoritarian') overall = 'Authoritarian Right';
    else overall = 'Moderate';

    return { economic, social, overall };
  }

  /**
   * Generate educational context and recommendations
   */
  private generateEducationalContext(scores: IdeologyScores): IdeologyInterpretation['educationalContext'] {
    const strengths: string[] = [];
    const growthAreas: string[] = [];
    const debateTopics: string[] = [];
    const matchingConsiderations: string[] = [];

    // Analyze certainty
    if (scores.certainty > 0.7) {
      strengths.push('Strong conviction in beliefs');
      matchingConsiderations.push('Would benefit from exposure to different viewpoints');
    } else if (scores.certainty < 0.4) {
      growthAreas.push('Could develop stronger positions on key issues');
      matchingConsiderations.push('Good candidate for exploratory debates');
    }

    // Analyze consistency
    if (scores.consistency > 0.8) {
      strengths.push('Logically consistent worldview');
    } else if (scores.consistency < 0.6) {
      growthAreas.push('Some areas of belief could be more aligned');
    }

    // Suggest debate topics based on strongest scores
    if (Math.abs(scores.economic) > 0.4) {
      debateTopics.push('Economic policy and inequality');
    }
    if (Math.abs(scores.social) > 0.4) {
      debateTopics.push('Individual rights vs. collective security');
    }
    if (Math.abs(scores.environment) > 0.4) {
      debateTopics.push('Environmental policy and economic impact');
    }

    return { strengths, growthAreas, debateTopics, matchingConsiderations };
  }

  /**
   * Generate comparisons with other groups
   */
  private async generateComparisons(
    scores: IdeologyScores,
    additionalContext?: any
  ): Promise<IdeologyInterpretation['comparisons']> {
    // TODO: Implement actual peer comparison based on database
    const peers = "Similar to other students who value both individual freedom and social responsibility";
    
    const historical = this.getHistoricalComparisons(scores);
    const contemporary = this.getContemporaryComparisons(scores);

    return { peers, historical, contemporary };
  }

  // Utility methods
  
  private getEconomicLabel(score: number): string {
    if (score > 0.4) return 'Conservative';
    if (score < -0.4) return 'Progressive';
    return 'Moderate';
  }

  private getSocialLabel(score: number): string {
    if (score > 0.4) return 'Libertarian';
    if (score < -0.4) return 'Communitarian';
    return 'Balanced';
  }

  private generateIdeologyDescription(scores: IdeologyScores): string {
    return `A thoughtful individual with ${scores.certainty > 0.6 ? 'strong' : 'developing'} convictions and ${scores.consistency > 0.7 ? 'consistent' : 'evolving'} beliefs across political and social issues.`;
  }

  private getHistoricalComparisons(scores: IdeologyScores): string[] {
    const comparisons: string[] = [];
    
    // Add historical figures based on ideology scores
    // This would be expanded with actual historical mapping
    if (scores.economic > 0.3 && scores.social > 0.3) {
      comparisons.push('Classical liberals like John Stuart Mill');
    }
    
    return comparisons;
  }

  private getContemporaryComparisons(scores: IdeologyScores): string[] {
    const comparisons: string[] = [];
    
    // Add contemporary references appropriate for students
    // This would be expanded with actual contemporary mapping
    comparisons.push('Independent voters who value both freedom and responsibility');
    
    return comparisons;
  }

  private detectContradictions(responses: SurveyResponseData[], scores: IdeologyScores): string[] {
    // TODO: Implement contradiction detection logic
    return [];
  }

  private analyzeResponsePatterns(responses: SurveyResponseData[]): { suspiciousPatterns: string[] } {
    const patterns: string[] = [];
    
    // Check for response time patterns
    const avgTime = responses.reduce((sum, r) => sum + (r.confidenceLevel || 0), 0) / responses.length;
    if (avgTime < 2) {
      patterns.push('Very quick response times might indicate insufficient consideration');
    }
    
    return { suspiciousPatterns: patterns };
  }

  private analyzeConfidenceLevels(responses: SurveyResponseData[]): { inconsistent: boolean } {
    const confidenceLevels = responses
      .filter(r => r.confidenceLevel !== undefined)
      .map(r => r.confidenceLevel!);

    if (confidenceLevels.length < 3) return { inconsistent: false };
    
    const variance = this.calculateVariance(confidenceLevels);
    return { inconsistent: variance > 2.0 };
  }

  private generateConsistencyImprovements(scores: IdeologyScores, responses: SurveyResponseData[]): string[] {
    const suggestions: string[] = [];
    
    if (scores.consistency < 0.7) {
      suggestions.push('Consider how your beliefs connect across different areas');
      suggestions.push('Reflect on any apparent contradictions in your responses');
    }
    
    return suggestions;
  }

  private normalizeToRange(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private validateMappingRequest(request: IdeologyMappingRequest): void {
    if (!request.profileId) {
      throw new HttpException('Profile ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!request.surveyResponses || request.surveyResponses.length === 0) {
      throw new HttpException('Survey responses are required', HttpStatus.BAD_REQUEST);
    }
  }

  private validateScores(scores: IdeologyScores): void {
    Object.entries(scores).forEach(([key, value]) => {
      if (typeof value !== 'number' || isNaN(value)) {
        throw new HttpException(`Invalid ${key} score: must be a number`, HttpStatus.BAD_REQUEST);
      }
      
      if (key === 'certainty' || key === 'consistency') {
        if (value < 0 || value > 1) {
          throw new HttpException(`${key} must be between 0 and 1`, HttpStatus.BAD_REQUEST);
        }
      } else {
        if (value < -1 || value > 1) {
          throw new HttpException(`${key} must be between -1 and 1`, HttpStatus.BAD_REQUEST);
        }
      }
    });
  }

  /**
   * Analyze ideology distribution across a class or group
   */
  async analyzeClassIdeologyDistribution(classId: string): Promise<{
    classId: string;
    totalStudents: number;
    completedProfiles: number;
    diversityIndex: number;
    averageScores: IdeologyScores;
    recommendedDebateTopics: string[];
    educationalInsights: string[];
  }> {
    try {
      // Get all student profiles for this class
      const profiles = await this.prismaService.profile.findMany({
        where: {
          user: {
            enrollments: {
              some: {
                class_id: classId,
                enrollment_status: 'ACTIVE'
              }
            }
          },
          is_completed: true,
          ideology_scores: { not: null }
        },
        select: {
          ideology_scores: true
        }
      });

      const totalStudents = await this.prismaService.enrollment.count({
        where: {
          class_id: classId,
          enrollment_status: 'ACTIVE'
        }
      });

      if (profiles.length === 0) {
        throw new HttpException('No completed ideology profiles found for this class', HttpStatus.NOT_FOUND);
      }

      // Parse ideology scores
      const ideologyScores: IdeologyScores[] = profiles.map(p => p.ideology_scores as IdeologyScores);

      // Calculate diversity index and average scores
      const diversityIndex = this.calculateIdeologyDiversity(ideologyScores);
      const averageScores = this.calculateAverageScores(ideologyScores);

      // Generate insights
      const recommendedDebateTopics = this.generateDebateTopics(averageScores);
      const educationalInsights = this.generateEducationalInsights(diversityIndex, averageScores);

      this.logger.log(`Analyzed ideology distribution for class ${classId}: ${profiles.length} profiles`);

      return {
        classId,
        totalStudents,
        completedProfiles: profiles.length,
        diversityIndex,
        averageScores,
        recommendedDebateTopics,
        educationalInsights
      };

    } catch (error) {
      this.logger.error(`Failed to analyze class ideology distribution for ${classId}`, error.stack);
      throw new HttpException(
        'Failed to analyze class ideology distribution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Calculate ideology diversity index for a class
   */
  private calculateIdeologyDiversity(scores: IdeologyScores[]): number {
    if (scores.length <= 1) return 0;

    const dimensions = ['economic', 'social', 'tradition', 'globalism', 'environment'];
    let totalDiversity = 0;

    dimensions.forEach(dim => {
      const values = scores.map(s => s[dim as keyof IdeologyScores] as number);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const standardDeviation = Math.sqrt(variance);
      
      totalDiversity += standardDeviation;
    });

    return Math.min(1, totalDiversity / dimensions.length);
  }

  /**
   * Calculate average ideology scores for a class
   */
  private calculateAverageScores(scores: IdeologyScores[]): IdeologyScores {
    if (scores.length === 0) {
      return {
        economic: 0, social: 0, tradition: 0, globalism: 0, environment: 0,
        certainty: 0.5, consistency: 0.5
      };
    }

    const totals = scores.reduce((acc, score) => ({
      economic: acc.economic + score.economic,
      social: acc.social + score.social,
      tradition: acc.tradition + score.tradition,
      globalism: acc.globalism + score.globalism,
      environment: acc.environment + score.environment,
      certainty: acc.certainty + score.certainty,
      consistency: acc.consistency + score.consistency
    }), {
      economic: 0, social: 0, tradition: 0, globalism: 0, environment: 0,
      certainty: 0, consistency: 0
    });

    return {
      economic: totals.economic / scores.length,
      social: totals.social / scores.length,
      tradition: totals.tradition / scores.length,
      globalism: totals.globalism / scores.length,
      environment: totals.environment / scores.length,
      certainty: totals.certainty / scores.length,
      consistency: totals.consistency / scores.length
    };
  }

  /**
   * Generate debate topics based on class characteristics
   */
  private generateDebateTopics(averageScores: IdeologyScores): string[] {
    const topics: string[] = [];

    if (Math.abs(averageScores.economic) < 0.3) {
      topics.push('Economic inequality and government intervention');
      topics.push('Universal healthcare vs. private insurance');
    }

    if (Math.abs(averageScores.social) < 0.3) {
      topics.push('Privacy rights vs. national security');
      topics.push('Individual freedom vs. collective responsibility');
    }

    if (Math.abs(averageScores.environment) < 0.3) {
      topics.push('Climate action vs. economic growth');
      topics.push('Environmental regulations and business innovation');
    }

    return topics.length > 0 ? topics : ['Democratic institutions and civic engagement'];
  }

  /**
   * Generate educational insights for teachers
   */
  private generateEducationalInsights(diversityIndex: number, averageScores: IdeologyScores): string[] {
    const insights: string[] = [];

    if (diversityIndex > 0.7) {
      insights.push('High ideological diversity - excellent for comprehensive debates');
    } else if (diversityIndex < 0.3) {
      insights.push('Lower diversity - consider introducing varied perspectives');
    }

    if (averageScores.certainty > 0.7) {
      insights.push('Students show high confidence - encourage questioning assumptions');
    } else if (averageScores.certainty < 0.4) {
      insights.push('Students show uncertainty - great opportunity for exploration');
    }

    if (averageScores.consistency < 0.6) {
      insights.push('Some belief inconsistency - explore how values interact in complex situations');
    }

    return insights;
  }

  /**
   * Get question mapping statistics
   */
  getQuestionMappingStats(): {
    totalQuestions: number;
    categoryCounts: Record<string, number>;
    researchBacked: number;
  } {
    const totalQuestions = IDEOLOGY_QUESTION_MAPPINGS.length;
    const categoryCounts: Record<string, number> = {};
    let researchBacked = 0;

    IDEOLOGY_QUESTION_MAPPINGS.forEach(mapping => {
      categoryCounts[mapping.questionCategory] = (categoryCounts[mapping.questionCategory] || 0) + 1;
      if (mapping.researchBasis) researchBacked++;
    });

    return {
      totalQuestions,
      categoryCounts,
      researchBacked
    };
  }
}
