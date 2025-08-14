/**
 * Plasticity Analysis Service
 * 
 * Service for analyzing opinion plasticity - how flexible and open to change
 * a person's beliefs are. This is crucial for intelligent debate matching
 * to create productive conversations between students with different perspectives.
 * 
 * Task 3.2.4: Implement Opinion Plasticity Scoring
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlasticityAnalysisRequest {
  profileId: string;
  surveyResponses: SurveyResponseData[];
  beliefSummary?: string;
  ideologyScores?: any;
  previousAnalysis?: PlasticityAnalysis;
}

export interface SurveyResponseData {
  questionId: string;
  questionText: string;
  questionCategory: string;
  responseValue: any;
  responseText?: string;
  confidenceLevel?: number;
  completionTime: number;
  timeStamp: Date;
}

export interface PlasticityAnalysis {
  profileId: string;
  overallPlasticity: number;    // 0-1 scale, higher = more flexible
  dimensionPlasticity: {
    political: number;
    social: number;
    economic: number;
    philosophical: number;
  };
  changeIndicators: {
    uncertaintyLevel: number;        // High uncertainty = higher plasticity
    qualificationFrequency: number;  // "it depends", "usually", etc.
    contradictionTolerance: number;  // Comfort with opposing views
    nuanceRecognition: number;       // Ability to see complexity
  };
  learningReadiness: number;         // Predicted openness to new information
  debateEngagementPotential: number; // Likelihood of productive debate
  analysisMetadata: {
    analysisVersion: string;
    completedAt: Date;
    processingTime: number;
    reliabilityScore: number;
    dataPoints: number;
  };
}

export interface PlasticityFactors {
  linguisticMarkers: {
    hedgeWords: number;
    certaintyWords: number;
    qualifyingPhrases: number;
    absoluteStatements: number;
  };
  responsePatterns: {
    consistencyVariance: number;
    extremityAvoidance: number;
    complexityTolerance: number;
    timeReflection: number;
  };
  cognitiveIndicators: {
    perspectiveTaking: number;
    ambiguityTolerance: number;
    intellectual_humility: number;
    curiosity_markers: number;
  };
}

@Injectable()
export class PlasticityAnalysisService {
  private readonly logger = new Logger(PlasticityAnalysisService.name);

  // Linguistic markers for plasticity analysis
  private readonly HEDGE_WORDS = [
    'maybe', 'perhaps', 'sometimes', 'often', 'usually', 'generally',
    'it depends', 'could be', 'might', 'possibly', 'probably',
    'I think', 'I believe', 'in my opinion', 'seems like'
  ];

  private readonly CERTAINTY_WORDS = [
    'definitely', 'absolutely', 'certainly', 'always', 'never',
    'without doubt', 'completely', 'totally', 'obviously', 'clearly'
  ];

  private readonly QUALIFYING_PHRASES = [
    'on the other hand', 'however', 'but also', 'although', 'while',
    'it\'s complicated', 'both sides', 'depends on', 'context matters'
  ];

  private readonly PERSPECTIVE_MARKERS = [
    'others might think', 'I can see why', 'some people believe',
    'different viewpoints', 'understand both', 'perspective', 'viewpoint'
  ];

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Analyze opinion plasticity from survey responses
   */
  async analyzeOpinionPlasticity(request: PlasticityAnalysisRequest): Promise<PlasticityAnalysis> {
    const startTime = Date.now();

    try {
      this.validatePlasticityRequest(request);

      // Extract plasticity factors from responses
      const factors = await this.extractPlasticityFactors(request.surveyResponses);

      // Calculate dimensional plasticity scores
      const dimensionPlasticity = this.calculateDimensionalPlasticity(
        request.surveyResponses,
        factors
      );

      // Calculate change indicators
      const changeIndicators = this.calculateChangeIndicators(factors);

      // Calculate overall plasticity score
      const overallPlasticity = this.calculateOverallPlasticity(
        dimensionPlasticity,
        changeIndicators,
        factors
      );

      // Calculate learning readiness
      const learningReadiness = this.calculateLearningReadiness(factors, overallPlasticity);

      // Calculate debate engagement potential
      const debateEngagementPotential = this.calculateDebateEngagement(
        factors,
        overallPlasticity,
        changeIndicators
      );

      // Assess analysis reliability
      const reliabilityScore = this.assessAnalysisReliability(request.surveyResponses, factors);

      const analysis: PlasticityAnalysis = {
        profileId: request.profileId,
        overallPlasticity,
        dimensionPlasticity,
        changeIndicators,
        learningReadiness,
        debateEngagementPotential,
        analysisMetadata: {
          analysisVersion: '1.0.0',
          completedAt: new Date(),
          processingTime: Date.now() - startTime,
          reliabilityScore,
          dataPoints: request.surveyResponses.length,
        },
      };

      this.logger.log(`Analyzed plasticity for profile ${request.profileId}: overall=${overallPlasticity.toFixed(2)}, reliability=${reliabilityScore.toFixed(2)}`);

      return analysis;

    } catch (error) {
      this.logger.error(`Failed to analyze plasticity for profile ${request.profileId}`, error.stack);
      throw new HttpException(
        'Failed to analyze opinion plasticity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Compare plasticity between two profiles for matching optimization
   */
  async compareCompatibility(
    analysis1: PlasticityAnalysis,
    analysis2: PlasticityAnalysis
  ): Promise<{
    compatibilityScore: number;
    recommendedPairing: boolean;
    optimizationSuggestions: string[];
    expectedOutcomes: {
      productiveDebate: number;
      learningPotential: number;
      engagement: number;
    };
  }> {
    try {
      // Calculate compatibility based on complementary plasticity
      const plasticityBalance = this.calculatePlasticityBalance(
        analysis1.overallPlasticity,
        analysis2.overallPlasticity
      );

      // Analyze dimensional compatibility
      const dimensionalCompatibility = this.calculateDimensionalCompatibility(
        analysis1.dimensionPlasticity,
        analysis2.dimensionPlasticity
      );

      // Consider change indicators compatibility
      const changeCompatibility = this.calculateChangeCompatibility(
        analysis1.changeIndicators,
        analysis2.changeIndicators
      );

      // Calculate overall compatibility
      const compatibilityScore = (
        plasticityBalance * 0.4 +
        dimensionalCompatibility * 0.3 +
        changeCompatibility * 0.3
      );

      // Determine pairing recommendation
      const recommendedPairing = compatibilityScore > 0.6 &&
        (analysis1.debateEngagementPotential > 0.4 || analysis2.debateEngagementPotential > 0.4);

      // Generate optimization suggestions
      const optimizationSuggestions = this.generateOptimizationSuggestions(
        analysis1,
        analysis2,
        compatibilityScore
      );

      // Predict expected outcomes
      const expectedOutcomes = {
        productiveDebate: Math.min(0.9, compatibilityScore * 1.2),
        learningPotential: (analysis1.learningReadiness + analysis2.learningReadiness) / 2,
        engagement: (analysis1.debateEngagementPotential + analysis2.debateEngagementPotential) / 2,
      };

      return {
        compatibilityScore,
        recommendedPairing,
        optimizationSuggestions,
        expectedOutcomes,
      };

    } catch (error) {
      this.logger.error('Failed to compare plasticity compatibility', error.stack);
      throw new HttpException(
        'Failed to analyze compatibility',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extract plasticity factors from survey responses
   */
  private async extractPlasticityFactors(responses: SurveyResponseData[]): Promise<PlasticityFactors> {
    const textResponses = responses
      .filter(r => r.responseText)
      .map(r => r.responseText!.toLowerCase());

    // Analyze linguistic markers
    const linguisticMarkers = this.analyzeLinguisticMarkers(textResponses);

    // Analyze response patterns
    const responsePatterns = this.analyzeResponsePatterns(responses);

    // Analyze cognitive indicators
    const cognitiveIndicators = this.analyzeCognitiveIndicators(textResponses, responses);

    return {
      linguisticMarkers,
      responsePatterns,
      cognitiveIndicators,
    };
  }

  /**
   * Analyze linguistic markers in text responses
   */
  private analyzeLinguisticMarkers(textResponses: string[]): PlasticityFactors['linguisticMarkers'] {
    if (textResponses.length === 0) {
      return {
        hedgeWords: 0,
        certaintyWords: 0,
        qualifyingPhrases: 0,
        absoluteStatements: 0,
      };
    }

    const totalText = textResponses.join(' ');
    const wordCount = totalText.split(' ').length;

    const hedgeWords = this.countMatches(totalText, this.HEDGE_WORDS) / wordCount;
    const certaintyWords = this.countMatches(totalText, this.CERTAINTY_WORDS) / wordCount;
    const qualifyingPhrases = this.countMatches(totalText, this.QUALIFYING_PHRASES) / textResponses.length;
    
    // Count absolute statements (sentences with certainty words and no hedging)
    const absoluteStatements = textResponses.filter(text =>
      this.CERTAINTY_WORDS.some(word => text.includes(word)) &&
      !this.HEDGE_WORDS.some(word => text.includes(word))
    ).length / textResponses.length;

    return {
      hedgeWords: this.normalizeScore(hedgeWords * 100), // Convert to 0-1 scale
      certaintyWords: this.normalizeScore(certaintyWords * 100),
      qualifyingPhrases: this.normalizeScore(qualifyingPhrases),
      absoluteStatements: this.normalizeScore(absoluteStatements),
    };
  }

  /**
   * Analyze response patterns for plasticity indicators
   */
  private analyzeResponsePatterns(responses: SurveyResponseData[]): PlasticityFactors['responsePatterns'] {
    // Analyze consistency variance (how much responses vary)
    const numericResponses = responses
      .map(r => this.extractNumericValue(r.responseValue))
      .filter(v => v !== null) as number[];

    const consistencyVariance = numericResponses.length > 1
      ? this.calculateVariance(numericResponses)
      : 0;

    // Analyze extremity avoidance (tendency to choose middle options)
    const extremityAvoidance = this.calculateExtremityAvoidance(responses);

    // Analyze complexity tolerance (longer, more nuanced responses)
    const complexityTolerance = this.calculateComplexityTolerance(responses);

    // Analyze time reflection (longer thinking time)
    const timeReflection = this.calculateTimeReflection(responses);

    return {
      consistencyVariance: this.normalizeScore(consistencyVariance),
      extremityAvoidance: this.normalizeScore(extremityAvoidance),
      complexityTolerance: this.normalizeScore(complexityTolerance),
      timeReflection: this.normalizeScore(timeReflection),
    };
  }

  /**
   * Analyze cognitive indicators of plasticity
   */
  private analyzeCognitiveIndicators(
    textResponses: string[],
    responses: SurveyResponseData[]
  ): PlasticityFactors['cognitiveIndicators'] {
    const perspectiveTaking = this.analyzePerspectiveTaking(textResponses);
    const ambiguityTolerance = this.analyzeAmbiguityTolerance(textResponses);
    const intellectualHumility = this.analyzeIntellectualHumility(textResponses);
    const curiosityMarkers = this.analyzeCuriosityMarkers(textResponses);

    return {
      perspectiveTaking: this.normalizeScore(perspectiveTaking),
      ambiguityTolerance: this.normalizeScore(ambiguityTolerance),
      intellectual_humility: this.normalizeScore(intellectualHumility),
      curiosity_markers: this.normalizeScore(curiosityMarkers),
    };
  }

  /**
   * Calculate dimensional plasticity scores
   */
  private calculateDimensionalPlasticity(
    responses: SurveyResponseData[],
    factors: PlasticityFactors
  ): PlasticityAnalysis['dimensionPlasticity'] {
    const categorizedResponses = this.categorizeResponses(responses);
    
    const political = this.calculateCategoryPlasticity(categorizedResponses.political, factors);
    const social = this.calculateCategoryPlasticity(categorizedResponses.social, factors);
    const economic = this.calculateCategoryPlasticity(categorizedResponses.economic, factors);
    const philosophical = this.calculateCategoryPlasticity(categorizedResponses.philosophical, factors);

    return { political, social, economic, philosophical };
  }

  /**
   * Calculate change indicators
   */
  private calculateChangeIndicators(factors: PlasticityFactors): PlasticityAnalysis['changeIndicators'] {
    const uncertaintyLevel = (
      factors.linguisticMarkers.hedgeWords +
      (1 - factors.linguisticMarkers.certaintyWords)
    ) / 2;

    const qualificationFrequency = factors.linguisticMarkers.qualifyingPhrases;

    const contradictionTolerance = factors.cognitiveIndicators.ambiguityTolerance;

    const nuanceRecognition = (
      factors.responsePatterns.complexityTolerance +
      factors.cognitiveIndicators.perspectiveTaking
    ) / 2;

    return {
      uncertaintyLevel: this.normalizeScore(uncertaintyLevel),
      qualificationFrequency: this.normalizeScore(qualificationFrequency),
      contradictionTolerance: this.normalizeScore(contradictionTolerance),
      nuanceRecognition: this.normalizeScore(nuanceRecognition),
    };
  }

  /**
   * Calculate overall plasticity score
   */
  private calculateOverallPlasticity(
    dimensionPlasticity: PlasticityAnalysis['dimensionPlasticity'],
    changeIndicators: PlasticityAnalysis['changeIndicators'],
    factors: PlasticityFactors
  ): number {
    // Weight different components
    const dimensionalAverage = Object.values(dimensionPlasticity).reduce((sum, val) => sum + val, 0) / 4;
    const changeIndicatorAverage = Object.values(changeIndicators).reduce((sum, val) => sum + val, 0) / 4;
    const cognitiveAverage = Object.values(factors.cognitiveIndicators).reduce((sum, val) => sum + val, 0) / 4;

    const overallScore = (
      dimensionalAverage * 0.3 +
      changeIndicatorAverage * 0.4 +
      cognitiveAverage * 0.3
    );

    return this.normalizeScore(overallScore);
  }

  /**
   * Calculate learning readiness
   */
  private calculateLearningReadiness(factors: PlasticityFactors, overallPlasticity: number): number {
    const curiosity = factors.cognitiveIndicators.curiosity_markers;
    const humility = factors.cognitiveIndicators.intellectual_humility;
    const openness = factors.cognitiveIndicators.perspectiveTaking;

    const readiness = (
      curiosity * 0.3 +
      humility * 0.3 +
      openness * 0.2 +
      overallPlasticity * 0.2
    );

    return this.normalizeScore(readiness);
  }

  /**
   * Calculate debate engagement potential
   */
  private calculateDebateEngagement(
    factors: PlasticityFactors,
    overallPlasticity: number,
    changeIndicators: PlasticityAnalysis['changeIndicators']
  ): number {
    const engagement = (
      overallPlasticity * 0.3 +
      changeIndicators.nuanceRecognition * 0.25 +
      factors.cognitiveIndicators.perspectiveTaking * 0.25 +
      factors.responsePatterns.complexityTolerance * 0.2
    );

    return this.normalizeScore(engagement);
  }

  // Helper methods for plasticity calculation

  private countMatches(text: string, patterns: string[]): number {
    return patterns.reduce((count, pattern) => {
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      return count + (text.match(regex) || []).length;
    }, 0);
  }

  private extractNumericValue(responseValue: any): number | null {
    if (typeof responseValue === 'number') return responseValue;
    if (typeof responseValue === 'boolean') return responseValue ? 1 : 0;
    if (Array.isArray(responseValue) && responseValue.length > 0 && typeof responseValue[0] === 'number') {
      return responseValue[0];
    }
    return null;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private calculateExtremityAvoidance(responses: SurveyResponseData[]): number {
    const numericResponses = responses
      .map(r => this.extractNumericValue(r.responseValue))
      .filter(v => v !== null) as number[];

    if (numericResponses.length === 0) return 0.5;

    // Count responses in middle range (assuming 1-5 scale, middle is 2.5-3.5)
    const middleResponses = numericResponses.filter(val => val >= 2.5 && val <= 3.5).length;
    return middleResponses / numericResponses.length;
  }

  private calculateComplexityTolerance(responses: SurveyResponseData[]): number {
    const textResponses = responses.filter(r => r.responseText);
    if (textResponses.length === 0) return 0;

    const averageLength = textResponses.reduce((sum, r) => sum + r.responseText!.length, 0) / textResponses.length;
    return Math.min(1, averageLength / 200); // Normalize to 0-1 scale
  }

  private calculateTimeReflection(responses: SurveyResponseData[]): number {
    if (responses.length === 0) return 0;

    const averageTime = responses.reduce((sum, r) => sum + r.completionTime, 0) / responses.length;
    // Normalize time (assuming good reflection time is around 30 seconds)
    return Math.min(1, averageTime / 30000);
  }

  private analyzePerspectiveTaking(textResponses: string[]): number {
    if (textResponses.length === 0) return 0;

    const totalText = textResponses.join(' ');
    const perspectiveMarkers = this.countMatches(totalText, this.PERSPECTIVE_MARKERS);
    return perspectiveMarkers / textResponses.length;
  }

  private analyzeAmbiguityTolerance(textResponses: string[]): number {
    if (textResponses.length === 0) return 0;

    const ambiguityWords = ['complex', 'complicated', 'nuanced', 'both sides', 'depends'];
    const totalText = textResponses.join(' ');
    const ambiguityMarkers = this.countMatches(totalText, ambiguityWords);
    return ambiguityMarkers / textResponses.length;
  }

  private analyzeIntellectualHumility(textResponses: string[]): number {
    if (textResponses.length === 0) return 0;

    const humilityWords = ['I might be wrong', 'not sure', 'could be mistaken', 'still learning'];
    const totalText = textResponses.join(' ');
    const humilityMarkers = this.countMatches(totalText, humilityWords);
    return humilityMarkers / textResponses.length;
  }

  private analyzeCuriosityMarkers(textResponses: string[]): number {
    if (textResponses.length === 0) return 0;

    const curiosityWords = ['wonder', 'curious', 'interested', 'want to learn', 'questions'];
    const totalText = textResponses.join(' ');
    const curiosityMarkers = this.countMatches(totalText, curiosityWords);
    return curiosityMarkers / textResponses.length;
  }

  private categorizeResponses(responses: SurveyResponseData[]): {
    political: SurveyResponseData[];
    social: SurveyResponseData[];
    economic: SurveyResponseData[];
    philosophical: SurveyResponseData[];
  } {
    const political = responses.filter(r => r.questionCategory.toLowerCase() === 'political');
    const social = responses.filter(r => r.questionCategory.toLowerCase() === 'social');
    const economic = responses.filter(r => r.questionCategory.toLowerCase() === 'economic');
    const philosophical = responses.filter(r => r.questionCategory.toLowerCase() === 'philosophical');

    return { political, social, economic, philosophical };
  }

  private calculateCategoryPlasticity(
    categoryResponses: SurveyResponseData[],
    factors: PlasticityFactors
  ): number {
    if (categoryResponses.length === 0) return 0.5; // Default neutral

    // Use overall factors weighted by category-specific responses
    const categoryWeight = categoryResponses.length / 10; // Adjust based on response count
    const basePlasticity = (
      factors.linguisticMarkers.hedgeWords +
      factors.responsePatterns.consistencyVariance +
      factors.cognitiveIndicators.perspectiveTaking
    ) / 3;

    return this.normalizeScore(basePlasticity * Math.min(1, categoryWeight));
  }

  // Compatibility calculation methods

  private calculatePlasticityBalance(plasticity1: number, plasticity2: number): number {
    // Optimal balance: one moderately flexible, one more certain (but not completely rigid)
    const average = (plasticity1 + plasticity2) / 2;
    const difference = Math.abs(plasticity1 - plasticity2);
    
    // Ideal scenario: moderate average plasticity with some difference
    const idealAverage = 0.6;
    const idealDifference = 0.3;

    const averageScore = 1 - Math.abs(average - idealAverage);
    const differenceScore = 1 - Math.abs(difference - idealDifference);

    return (averageScore + differenceScore) / 2;
  }

  private calculateDimensionalCompatibility(
    dimensions1: PlasticityAnalysis['dimensionPlasticity'],
    dimensions2: PlasticityAnalysis['dimensionPlasticity']
  ): number {
    const compatibilityScores = Object.keys(dimensions1).map(key => {
      const val1 = dimensions1[key as keyof typeof dimensions1];
      const val2 = dimensions2[key as keyof typeof dimensions2];
      return this.calculatePlasticityBalance(val1, val2);
    });

    return compatibilityScores.reduce((sum, score) => sum + score, 0) / compatibilityScores.length;
  }

  private calculateChangeCompatibility(
    indicators1: PlasticityAnalysis['changeIndicators'],
    indicators2: PlasticityAnalysis['changeIndicators']
  ): number {
    const compatibilityScores = Object.keys(indicators1).map(key => {
      const val1 = indicators1[key as keyof typeof indicators1];
      const val2 = indicators2[key as keyof typeof indicators2];
      return 1 - Math.abs(val1 - val2); // Similar change indicators work well together
    });

    return compatibilityScores.reduce((sum, score) => sum + score, 0) / compatibilityScores.length;
  }

  private generateOptimizationSuggestions(
    analysis1: PlasticityAnalysis,
    analysis2: PlasticityAnalysis,
    compatibilityScore: number
  ): string[] {
    const suggestions: string[] = [];

    if (compatibilityScore < 0.5) {
      suggestions.push('Consider providing structured debate guidelines to support interaction');
    }

    if (analysis1.overallPlasticity < 0.3 && analysis2.overallPlasticity < 0.3) {
      suggestions.push('Both students have strong convictions - focus on finding common ground first');
    }

    if (analysis1.learningReadiness > 0.7 || analysis2.learningReadiness > 0.7) {
      suggestions.push('High learning potential - consider complex topics with multiple perspectives');
    }

    return suggestions;
  }

  private normalizeScore(score: number): number {
    return Math.max(0, Math.min(1, score));
  }

  private assessAnalysisReliability(
    responses: SurveyResponseData[],
    factors: PlasticityFactors
  ): number {
    let reliability = 0.8; // Base reliability

    // More responses = higher reliability
    if (responses.length < 10) reliability -= 0.2;
    if (responses.length > 30) reliability += 0.1;

    // Text responses add reliability
    const textCount = responses.filter(r => r.responseText).length;
    reliability += Math.min(0.1, textCount * 0.01);

    // Consistent patterns increase reliability
    const consistencySum = Object.values(factors.responsePatterns).reduce((sum, val) => sum + val, 0);
    if (consistencySum > 2) reliability += 0.1;

    return this.normalizeScore(reliability);
  }

  private validatePlasticityRequest(request: PlasticityAnalysisRequest): void {
    if (!request.profileId) {
      throw new HttpException('Profile ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!request.surveyResponses || request.surveyResponses.length === 0) {
      throw new HttpException('Survey responses are required', HttpStatus.BAD_REQUEST);
    }

    if (request.surveyResponses.length < 5) {
      throw new HttpException(
        'At least 5 survey responses required for plasticity analysis',
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
