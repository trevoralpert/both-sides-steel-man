/**
 * Prompt Personalization Service
 * Handles intelligent personalization of reflection prompts based on user characteristics,
 * debate performance, belief profiles, and educational objectives
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PromptGenerationContext,
  PromptTemplate,
  PersonalizationRecord,
  AgeGroup,
  Language,
  PromptDifficulty,
  PromptCategory,
  DebatePerformanceContext,
  DebateKeyMoment
} from '../interfaces/prompt.interfaces';

interface PersonalizationStrategy {
  name: string;
  priority: number;
  apply: (text: string, context: PromptGenerationContext) => Promise<string>;
}

interface ContextualReplacement {
  placeholder: string;
  getValue: (context: PromptGenerationContext) => string | Promise<string>;
}

@Injectable()
export class PromptPersonalizationService {
  private readonly logger = new Logger(PromptPersonalizationService.name);

  // Personalization strategies ordered by priority
  private personalizationStrategies: PersonalizationStrategy[] = [];

  // Context-aware replacements for dynamic content injection
  private contextualReplacements: ContextualReplacement[] = [];

  constructor(private readonly configService: ConfigService) {
    this.initializePersonalizationStrategies();
    this.initializeContextualReplacements();
  }

  // =============================================
  // Main Personalization Methods
  // =============================================

  async personalizePrompt(
    template: PromptTemplate,
    context: PromptGenerationContext
  ): Promise<{ personalizedText: string; personalizationApplied: PersonalizationRecord[] }> {
    this.logger.log(`Personalizing prompt ${template.id} for user ${context.userId}`);

    try {
      let personalizedText = template.promptText;
      const personalizationApplied: PersonalizationRecord[] = [];

      // Apply language localization first
      if (context.userProfile.preferredLanguage !== Language.ENGLISH) {
        const { text: localizedText, applied } = await this.applyLanguageLocalization(
          personalizedText,
          template,
          context.userProfile.preferredLanguage
        );
        personalizedText = localizedText;
        if (applied) {
          personalizationApplied.push(applied);
        }
      }

      // Apply contextual replacements
      const { text: contextualText, applied: contextualApplied } = await this.applyContextualReplacements(
        personalizedText,
        context
      );
      personalizedText = contextualText;
      personalizationApplied.push(...contextualApplied);

      // Apply personalization strategies in priority order
      for (const strategy of this.personalizationStrategies) {
        const originalText = personalizedText;
        personalizedText = await strategy.apply(personalizedText, context);
        
        if (personalizedText !== originalText) {
          personalizationApplied.push({
            type: 'content_customization',
            description: `Applied ${strategy.name} personalization`,
            originalContent: originalText,
            appliedAt: new Date()
          });
        }
      }

      this.logger.log(`Applied ${personalizationApplied.length} personalizations to prompt ${template.id}`);
      return { personalizedText, personalizationApplied };

    } catch (error) {
      this.logger.error(`Failed to personalize prompt: ${error.message}`, error.stack);
      // Return original text if personalization fails
      return {
        personalizedText: template.promptText,
        personalizationApplied: []
      };
    }
  }

  async calculatePersonalizationScore(
    template: PromptTemplate,
    context: PromptGenerationContext
  ): Promise<number> {
    let score = 0;
    let maxScore = 0;

    // Age appropriateness (25% of score)
    maxScore += 25;
    if (this.isAgeAppropriate(template, context.userProfile.ageGroup)) {
      score += 25;
    } else if (this.canAgeAdapt(template, context.userProfile.ageGroup)) {
      score += 15; // Partial credit for adaptable content
    }

    // Language support (20% of score)
    maxScore += 20;
    if (context.userProfile.preferredLanguage === Language.ENGLISH) {
      score += 20;
    } else if (template.promptTextLocalized?.[context.userProfile.preferredLanguage]) {
      score += 20;
    } else if (this.canAutoTranslate(template.promptText)) {
      score += 10; // Partial credit for auto-translation capability
    }

    // Performance relevance (25% of score)
    maxScore += 25;
    score += this.calculatePerformanceRelevance(template, context.debatePerformance);

    // Educational objective alignment (20% of score)
    maxScore += 20;
    score += this.calculateObjectiveAlignment(template, context.educationalObjectives);

    // Accessibility compliance (10% of score)
    maxScore += 10;
    score += this.calculateAccessibilityScore(template, context.userProfile.accessibilityNeeds);

    return maxScore > 0 ? (score / maxScore) : 0;
  }

  async adaptPromptDifficulty(
    template: PromptTemplate,
    targetDifficulty: PromptDifficulty,
    context: PromptGenerationContext
  ): Promise<string> {
    let adaptedText = template.promptText;

    if (template.difficultyLevel === targetDifficulty) {
      return adaptedText; // No adaptation needed
    }

    const currentLevel = this.getDifficultyLevel(template.difficultyLevel);
    const targetLevel = this.getDifficultyLevel(targetDifficulty);

    if (targetLevel < currentLevel) {
      // Simplify the prompt
      adaptedText = await this.simplifyPromptText(adaptedText, targetDifficulty, context);
    } else {
      // Make the prompt more challenging
      adaptedText = await this.enhancePromptComplexity(adaptedText, targetDifficulty, context);
    }

    this.logger.log(`Adapted prompt difficulty from ${template.difficultyLevel} to ${targetDifficulty}`);
    return adaptedText;
  }

  // =============================================
  // Private Initialization Methods
  // =============================================

  private initializePersonalizationStrategies(): void {
    this.personalizationStrategies = [
      {
        name: 'Age Group Adaptation',
        priority: 1,
        apply: this.applyAgeGroupAdaptation.bind(this)
      },
      {
        name: 'Performance-Based Customization',
        priority: 2,
        apply: this.applyPerformanceCustomization.bind(this)
      },
      {
        name: 'Belief Profile Integration',
        priority: 3,
        apply: this.applyBeliefProfileIntegration.bind(this)
      },
      {
        name: 'Encouragement and Motivation',
        priority: 4,
        apply: this.applyEncouragementElements.bind(this)
      },
      {
        name: 'Educational Objective Alignment',
        priority: 5,
        apply: this.applyEducationalAlignment.bind(this)
      },
      {
        name: 'Accessibility Enhancement',
        priority: 6,
        apply: this.applyAccessibilityEnhancements.bind(this)
      }
    ].sort((a, b) => a.priority - b.priority);
  }

  private initializeContextualReplacements(): void {
    this.contextualReplacements = [
      {
        placeholder: '{{DEBATE_TOPIC}}',
        getValue: (context) => this.getDebateTopic(context)
      },
      {
        placeholder: '{{PARTICIPANT_NAME}}',
        getValue: (context) => this.getParticipantName(context)
      },
      {
        placeholder: '{{OPPONENT_POSITION}}',
        getValue: (context) => this.getOpponentPosition(context)
      },
      {
        placeholder: '{{USER_POSITION}}',
        getValue: (context) => this.getUserPosition(context)
      },
      {
        placeholder: '{{DEBATE_DURATION}}',
        getValue: (context) => this.getDebateDuration(context)
      },
      {
        placeholder: '{{STRONGEST_MOMENT}}',
        getValue: (context) => this.getStrongestMoment(context)
      },
      {
        placeholder: '{{IMPROVEMENT_AREA}}',
        getValue: (context) => this.getTopImprovementArea(context)
      }
    ];
  }

  // =============================================
  // Personalization Strategy Implementations
  // =============================================

  private async applyAgeGroupAdaptation(text: string, context: PromptGenerationContext): Promise<string> {
    const ageGroup = context.userProfile.ageGroup;
    
    switch (ageGroup) {
      case AgeGroup.ELEMENTARY:
        return this.simplifyForElementary(text);
      case AgeGroup.MIDDLE_SCHOOL:
        return this.adaptForMiddleSchool(text);
      case AgeGroup.HIGH_SCHOOL:
        return this.enhanceForHighSchool(text);
      case AgeGroup.COLLEGE:
      case AgeGroup.ADULT:
        return this.sophisticateForAdults(text);
      default:
        return text;
    }
  }

  private async applyPerformanceCustomization(text: string, context: PromptGenerationContext): Promise<string> {
    const performance = context.debatePerformance;
    let customizedText = text;

    // Inject specific performance references
    if (performance.strengths.length > 0) {
      const strength = performance.strengths[0];
      customizedText = customizedText.replace(
        /\b(your|you)\b/gi,
        `you (especially considering your strength in ${strength})`
      );
    }

    // Add context-specific follow-ups based on performance
    if (performance.argumentQualityScore < 0.5) {
      customizedText += ' Consider focusing particularly on how you could strengthen your arguments with better evidence.';
    } else if (performance.listeningScore < 0.5) {
      customizedText += ' Think especially about how well you listened to and understood your opponent\'s perspective.';
    }

    return customizedText;
  }

  private async applyBeliefProfileIntegration(text: string, context: PromptGenerationContext): Promise<string> {
    const beliefProfile = context.userProfile.beliefProfile;
    let integratedText = text;

    // For high plasticity users, encourage openness exploration
    if (beliefProfile.plasticityScore > 0.7) {
      integratedText += ' Given your openness to new perspectives, consider how this debate might have shifted your thinking.';
    }
    // For low plasticity users, focus on understanding rather than changing
    else if (beliefProfile.plasticityScore < 0.3) {
      integratedText += ' Focus on understanding different viewpoints, even if your core beliefs remain unchanged.';
    }

    // Integrate ideology-specific prompts
    if (beliefProfile.confidenceLevel < 0.5) {
      integratedText = integratedText.replace(
        /What do you think/gi,
        'What are your thoughts, even if you\'re still forming your opinion'
      );
    }

    return integratedText;
  }

  private async applyEncouragementElements(text: string, context: PromptGenerationContext): Promise<string> {
    const performance = context.debatePerformance;
    let encouragingText = text;

    // Add encouraging elements based on performance
    const encouragementPhrases = this.getAppropriateEncouragement(performance, context.userProfile.ageGroup);
    
    if (encouragementPhrases.length > 0) {
      const encouragement = encouragementPhrases[Math.floor(Math.random() * encouragementPhrases.length)];
      encouragingText = `${encouragement} ${encouragingText}`;
    }

    // Add growth-mindset language
    encouragingText = encouragingText.replace(/failed to/gi, 'had an opportunity to improve in');
    encouragingText = encouragingText.replace(/bad|poor/gi, 'developing');

    return encouragingText;
  }

  private async applyEducationalAlignment(text: string, context: PromptGenerationContext): Promise<string> {
    let alignedText = text;
    
    for (const objective of context.educationalObjectives) {
      if (objective.priority === 'high') {
        const alignmentPhrase = this.getObjectiveAlignmentPhrase(objective);
        if (alignmentPhrase) {
          alignedText += ` ${alignmentPhrase}`;
        }
      }
    }

    return alignedText;
  }

  private async applyAccessibilityEnhancements(text: string, context: PromptGenerationContext): Promise<string> {
    let enhancedText = text;
    
    for (const need of context.userProfile.accessibilityNeeds) {
      switch (need.type) {
        case 'simplified_language':
          if (need.enabled) {
            enhancedText = await this.simplifyLanguage(enhancedText);
          }
          break;
        case 'large_text':
          // This would be handled in the UI layer
          break;
        case 'screen_reader':
          if (need.enabled) {
            enhancedText = this.addScreenReaderEnhancements(enhancedText);
          }
          break;
      }
    }

    return enhancedText;
  }

  // =============================================
  // Contextual Replacement Methods
  // =============================================

  private async applyContextualReplacements(
    text: string,
    context: PromptGenerationContext
  ): Promise<{ text: string; applied: PersonalizationRecord[] }> {
    let processedText = text;
    const applied: PersonalizationRecord[] = [];

    for (const replacement of this.contextualReplacements) {
      if (processedText.includes(replacement.placeholder)) {
        try {
          const value = await replacement.getValue(context);
          const originalText = processedText;
          processedText = processedText.replace(new RegExp(replacement.placeholder, 'g'), value);
          
          if (processedText !== originalText) {
            applied.push({
              type: 'context_injection',
              description: `Replaced ${replacement.placeholder} with contextual value`,
              originalContent: replacement.placeholder,
              appliedAt: new Date()
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to replace ${replacement.placeholder}: ${error.message}`);
        }
      }
    }

    return { text: processedText, applied };
  }

  private async applyLanguageLocalization(
    text: string,
    template: PromptTemplate,
    language: Language
  ): Promise<{ text: string; applied?: PersonalizationRecord }> {
    if (template.promptTextLocalized?.[language]) {
      return {
        text: template.promptTextLocalized[language],
        applied: {
          type: 'language_adaptation',
          description: `Localized to ${language}`,
          originalContent: text,
          appliedAt: new Date()
        }
      };
    }

    // TODO: Implement auto-translation as fallback
    return { text };
  }

  // =============================================
  // Context Value Getters
  // =============================================

  private getDebateTopic(context: PromptGenerationContext): string {
    // TODO: Extract actual debate topic from context
    return 'the debate topic';
  }

  private getParticipantName(context: PromptGenerationContext): string {
    // TODO: Get actual participant name
    return 'participant';
  }

  private getOpponentPosition(context: PromptGenerationContext): string {
    // TODO: Extract opponent's position
    return 'the opposing view';
  }

  private getUserPosition(context: PromptGenerationContext): string {
    // TODO: Extract user's position
    return 'your position';
  }

  private getDebateDuration(context: PromptGenerationContext): string {
    // TODO: Calculate actual debate duration
    return 'the discussion';
  }

  private getStrongestMoment(context: PromptGenerationContext): string {
    const keyMoments = context.debatePerformance.keyMoments;
    const positivemoment = keyMoments.find(m => m.impact === 'positive');
    return positivemoment?.description || 'a particularly strong moment in your debate';
  }

  private getTopImprovementArea(context: PromptGenerationContext): string {
    const improvementAreas = context.debatePerformance.improvementAreas;
    return improvementAreas.length > 0 ? improvementAreas[0] : 'your overall debate skills';
  }

  // =============================================
  // Age-Specific Adaptation Methods
  // =============================================

  private simplifyForElementary(text: string): string {
    return text
      .replace(/analyze/gi, 'think about')
      .replace(/evaluate/gi, 'look at')
      .replace(/consider/gi, 'think about')
      .replace(/perspective/gi, 'way of thinking')
      .replace(/argument/gi, 'point')
      .replace(/evidence/gi, 'proof');
  }

  private adaptForMiddleSchool(text: string): string {
    return text
      .replace(/Furthermore/gi, 'Also')
      .replace(/Additionally/gi, 'Plus')
      .replace(/Nevertheless/gi, 'However');
  }

  private enhanceForHighSchool(text: string): string {
    // Add more sophisticated vocabulary and concepts
    return text
      .replace(/good/gi, 'effective')
      .replace(/bad/gi, 'problematic')
      .replace(/think/gi, 'analyze');
  }

  private sophisticateForAdults(text: string): string {
    // Use more advanced terminology and concepts
    return text; // TODO: Implement sophisticated enhancements
  }

  // =============================================
  // Utility Methods
  // =============================================

  private isAgeAppropriate(template: PromptTemplate, ageGroup: AgeGroup): boolean {
    return template.targetAudience === ageGroup;
  }

  private canAgeAdapt(template: PromptTemplate, ageGroup: AgeGroup): boolean {
    // Check if template can be adapted for different age groups
    return Math.abs(this.getAgeGroupLevel(template.targetAudience) - this.getAgeGroupLevel(ageGroup)) <= 1;
  }

  private canAutoTranslate(text: string): boolean {
    // Check if text is suitable for auto-translation
    return text.length > 0 && text.length < 1000;
  }

  private calculatePerformanceRelevance(template: PromptTemplate, performance: DebatePerformanceContext): number {
    let relevance = 0;
    const maxRelevance = 25;

    // Check if template category matches improvement areas
    if (template.templateType === PromptCategory.ARGUMENT_QUALITY && performance.argumentQualityScore < 0.7) {
      relevance += 25;
    } else if (template.templateType === PromptCategory.LISTENING_SKILLS && performance.listeningScore < 0.7) {
      relevance += 25;
    } else if (template.templateType === PromptCategory.EVIDENCE_USAGE && performance.evidenceUsageScore < 0.7) {
      relevance += 25;
    } else if (template.templateType === PromptCategory.GENERAL_REFLECTION) {
      relevance += 15; // General reflection is always somewhat relevant
    } else {
      relevance += 5; // Basic relevance for any template
    }

    return Math.min(relevance, maxRelevance);
  }

  private calculateObjectiveAlignment(template: PromptTemplate, objectives: any[]): number {
    const alignedObjectives = objectives.filter(obj => obj.category === template.templateType);
    const highPriorityAligned = alignedObjectives.filter(obj => obj.priority === 'high');
    
    return highPriorityAligned.length > 0 ? 20 : alignedObjectives.length > 0 ? 10 : 0;
  }

  private calculateAccessibilityScore(template: PromptTemplate, needs: any[]): number {
    if (needs.length === 0) return 10; // Full score if no special needs

    let score = 0;
    for (const need of needs) {
      const hasSupport = template.metadata.accessibilityFeatures?.some(
        feature => feature.type === need.type && feature.enabled
      );
      if (hasSupport) score += 5;
    }

    return Math.min(score, 10);
  }

  private getAgeGroupLevel(ageGroup: AgeGroup): number {
    const levels = {
      [AgeGroup.ELEMENTARY]: 1,
      [AgeGroup.MIDDLE_SCHOOL]: 2,
      [AgeGroup.HIGH_SCHOOL]: 3,
      [AgeGroup.COLLEGE]: 4,
      [AgeGroup.ADULT]: 4
    };
    return levels[ageGroup] || 2;
  }

  private getDifficultyLevel(difficulty: PromptDifficulty): number {
    const levels = {
      [PromptDifficulty.BEGINNER]: 1,
      [PromptDifficulty.INTERMEDIATE]: 2,
      [PromptDifficulty.ADVANCED]: 3,
      [PromptDifficulty.EXPERT]: 4
    };
    return levels[difficulty] || 2;
  }

  private async simplifyPromptText(text: string, targetDifficulty: PromptDifficulty, context: PromptGenerationContext): Promise<string> {
    // TODO: Implement text simplification logic
    return text;
  }

  private async enhancePromptComplexity(text: string, targetDifficulty: PromptDifficulty, context: PromptGenerationContext): Promise<string> {
    // TODO: Implement complexity enhancement logic
    return text;
  }

  private getAppropriateEncouragement(performance: DebatePerformanceContext, ageGroup: AgeGroup): string[] {
    const encouragements = [];
    
    if (performance.participationScore > 0.7) {
      encouragements.push(ageGroup === AgeGroup.ELEMENTARY ? 'Great job participating!' : 'Excellent engagement!');
    }
    
    if (performance.argumentQualityScore > 0.7) {
      encouragements.push(ageGroup === AgeGroup.ELEMENTARY ? 'You made some really good points!' : 'Your arguments were well-constructed!');
    }

    return encouragements;
  }

  private getObjectiveAlignmentPhrase(objective: any): string {
    // TODO: Generate objective-specific alignment phrases
    return `Remember to focus on ${objective.description}.`;
  }

  private async simplifyLanguage(text: string): Promise<string> {
    // TODO: Implement language simplification
    return text;
  }

  private addScreenReaderEnhancements(text: string): string {
    // Add screen reader friendly elements
    return text.replace(/\?/g, '? (Question)').replace(/!/g, '! (Emphasis)');
  }
}
