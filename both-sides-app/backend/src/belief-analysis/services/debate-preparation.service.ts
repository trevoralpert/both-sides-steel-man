/**
 * Debate Preparation Materials Service
 * 
 * AI-powered service for generating position-specific debate preparation materials.
 * Provides tailored arguments, evidence sources, counterargument preparation,
 * and structured timelines to enhance student debate readiness.
 * 
 * Phase 4 Task 4.4.4: Debate Preparation Materials System
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
// import OpenAI from 'openai'; // TODO: Uncomment when OpenAI package is installed

export interface PreparationRequest {
  matchId: string;
  userId: string;
  position: 'PRO' | 'CON';
  topicId: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  preparationTime: number; // hours available for preparation
  focusAreas?: string[]; // specific areas to focus on
  customInstructions?: string;
}

export interface PreparationMaterials {
  matchId: string;
  userId: string;
  position: 'PRO' | 'CON';
  positionOverview: string;
  keyArguments: Argument[];
  evidenceSources: Source[];
  counterArgumentPrep: CounterArgument[];
  preparationTips: string[];
  timelineGuidance: PrepTimeline;
  practiceQuestions: PracticeQuestion[];
  additionalResources: AdditionalResource[];
  metadata: {
    generatedAt: Date;
    totalPreparationTime: number;
    difficultyLevel: number;
    contentVersion: string;
  };
}

export interface Argument {
  id: string;
  title: string;
  description: string;
  strength: number; // 1-10 strength rating
  type: 'logical' | 'emotional' | 'ethical' | 'practical' | 'statistical';
  supportingEvidence: string[];
  potentialWeaknesses: string[];
  deliveryTips: string[];
}

export interface Source {
  id: string;
  title: string;
  url?: string;
  type: 'academic' | 'news' | 'government' | 'organization' | 'book' | 'study';
  credibility: number; // 1-10 credibility rating
  relevance: number; // 1-10 relevance rating
  summary: string;
  keyQuotes: string[];
  publicationDate?: Date;
  author?: string;
}

export interface CounterArgument {
  id: string;
  opponentArgument: string;
  responseStrategy: string;
  rebuttalPoints: string[];
  evidenceToAddress: string[];
  rhetoricalApproach: 'direct' | 'redirect' | 'concede-and-pivot' | 'question-assumptions';
  confidenceLevel: number; // 1-10
}

export interface PrepTimeline {
  totalHours: number;
  phases: PrepPhase[];
  milestones: Milestone[];
  checkpoints: Checkpoint[];
}

export interface PrepPhase {
  phase: string;
  description: string;
  duration: number; // hours
  activities: Activity[];
  priority: 'critical' | 'important' | 'beneficial';
}

export interface Activity {
  task: string;
  duration: number; // minutes
  description: string;
  resources: string[];
  outcome: string;
}

export interface Milestone {
  name: string;
  description: string;
  targetTime: number; // hours from start
  criteria: string[];
}

export interface Checkpoint {
  time: number; // hours from start
  questions: string[];
  expectedOutcomes: string[];
}

export interface PracticeQuestion {
  id: string;
  question: string;
  type: 'opening' | 'cross-examination' | 'rebuttal' | 'closing';
  difficulty: number; // 1-10
  suggestedResponse: string;
  learningObjective: string;
}

export interface AdditionalResource {
  title: string;
  type: 'video' | 'article' | 'tool' | 'template' | 'example';
  url?: string;
  description: string;
  timeToConsume: number; // minutes
  priority: 'high' | 'medium' | 'low';
}

export interface UserDebateProfile {
  userId: string;
  experienceLevel: number; // 1-10
  strengths: string[];
  areas_for_improvement: string[];
  preferred_argument_types: string[];
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  debate_history: {
    total_debates: number;
    win_rate: number;
    average_satisfaction: number;
    common_challenges: string[];
  };
}

@Injectable()
export class DebatePreparationService {
  private readonly logger = new Logger(DebatePreparationService.name);

  // private openaiClient: OpenAI | null = null;

  // Content templates and structures
  private readonly ARGUMENT_TEMPLATES = {
    logical: {
      structure: 'premise -> reasoning -> conclusion',
      keywords: ['therefore', 'because', 'since', 'given that', 'it follows'],
      strengthMarkers: ['proven', 'demonstrated', 'established', 'verified']
    },
    emotional: {
      structure: 'emotional connection -> personal impact -> call to action',
      keywords: ['imagine', 'feel', 'experience', 'heart', 'soul'],
      strengthMarkers: ['moving', 'compelling', 'touching', 'inspiring']
    },
    ethical: {
      structure: 'moral principle -> application -> consequences',
      keywords: ['should', 'ought', 'right', 'wrong', 'duty', 'responsibility'],
      strengthMarkers: ['just', 'fair', 'moral', 'ethical', 'principled']
    },
    practical: {
      structure: 'problem -> solution -> benefits',
      keywords: ['works', 'effective', 'practical', 'feasible', 'implementable'],
      strengthMarkers: ['proven', 'successful', 'effective', 'efficient']
    },
    statistical: {
      structure: 'data -> analysis -> implications',
      keywords: ['studies show', 'statistics', 'data indicates', 'research proves'],
      strengthMarkers: ['significant', 'conclusive', 'overwhelming', 'substantial']
    }
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    // this.initializeOpenAI();
  }

  /**
   * Initialize OpenAI client for AI-powered content generation
   */
  // private initializeOpenAI(): void {
  //   try {
  //     const apiKey = this.configService.get<string>('OPENAI_API_KEY');
  //     if (!apiKey) {
  //       this.logger.warn('OpenAI API key not configured - AI features will be limited');
  //       return;
  //     }
  //     this.openaiClient = new OpenAI({ apiKey });
  //     this.logger.log('OpenAI client initialized for debate preparation');
  //   } catch (error) {
  //     this.logger.error(`Failed to initialize OpenAI: ${error.message}`);
  //   }
  // }

  /**
   * Generate comprehensive preparation materials for a debate match
   */
  async generatePreparationMaterials(request: PreparationRequest): Promise<PreparationMaterials> {
    const startTime = Date.now();

    try {
      this.logger.log(`Generating preparation materials for match ${request.matchId}, user ${request.userId}, position ${request.position}`);

      // Check cache first
      const cacheKey = this.buildCacheKey(request);
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.log('Returning cached preparation materials');
        return cached;
      }

      // Get context information
      const [match, topic, userProfile] = await Promise.all([
        this.getMatchDetails(request.matchId),
        this.getTopicDetails(request.topicId),
        this.getUserDebateProfile(request.userId)
      ]);

      // Generate position overview
      const positionOverview = await this.generatePositionOverview(
        topic, request.position, userProfile, request.userLevel
      );

      // Generate key arguments
      const keyArguments = await this.generateKeyArguments(
        topic, request.position, userProfile, request.userLevel
      );

      // Find evidence sources
      const evidenceSources = await this.findEvidenceSources(
        topic, request.position, keyArguments
      );

      // Prepare counter-argument strategies
      const counterArgumentPrep = await this.generateCounterArgumentPrep(
        topic, request.position, userProfile
      );

      // Create personalized tips
      const preparationTips = await this.generatePreparationTips(
        userProfile, request.userLevel, request.position
      );

      // Build preparation timeline
      const timelineGuidance = this.createPreparationTimeline(
        request.preparationTime, request.userLevel, keyArguments.length
      );

      // Generate practice questions
      const practiceQuestions = await this.generatePracticeQuestions(
        topic, request.position, request.userLevel
      );

      // Suggest additional resources
      const additionalResources = await this.suggestAdditionalResources(
        topic, request.position, userProfile, request.userLevel
      );

      const materials: PreparationMaterials = {
        matchId: request.matchId,
        userId: request.userId,
        position: request.position,
        positionOverview,
        keyArguments,
        evidenceSources,
        counterArgumentPrep,
        preparationTips,
        timelineGuidance,
        practiceQuestions,
        additionalResources,
        metadata: {
          generatedAt: new Date(),
          totalPreparationTime: request.preparationTime,
          difficultyLevel: this.calculateDifficultyLevel(topic, request.userLevel),
          contentVersion: '1.0.0'
        }
      };

      // Cache the results for future use
      await this.cacheService.set(cacheKey, materials, 3600000 * 12); // 12 hours cache

      this.logger.log(
        `Generated preparation materials in ${Date.now() - startTime}ms: ` +
        `${keyArguments.length} arguments, ${evidenceSources.length} sources, ` +
        `${counterArgumentPrep.length} counter-arguments`
      );

      return materials;

    } catch (error) {
      this.logger.error(`Failed to generate preparation materials: ${error.message}`, error.stack);
      throw new HttpException(
        `Preparation materials generation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate position overview explaining the stance and key themes
   */
  private async generatePositionOverview(
    topic: any,
    position: 'PRO' | 'CON',
    userProfile: UserDebateProfile,
    userLevel: string
  ): Promise<string> {
    try {
      // Build overview based on topic and position
      const stance = position === 'PRO' ? 'supporting' : 'opposing';
      const topicTitle = topic.title;
      const topicDescription = topic.description || 'This important issue requires careful consideration of multiple perspectives.';

      let overview = `You will be ${stance} the position: "${topicTitle}"\n\n`;
      overview += `Context: ${topicDescription}\n\n`;

      // Add position-specific guidance
      if (position === 'PRO') {
        overview += 'Your role is to advocate for this position by:\n';
        overview += '• Presenting compelling reasons why this position is beneficial or necessary\n';
        overview += '• Providing evidence that supports the positive outcomes\n';
        overview += '• Addressing potential concerns with reasonable solutions\n';
        overview += '• Demonstrating the value and importance of this stance\n\n';
      } else {
        overview += 'Your role is to present concerns about this position by:\n';
        overview += '• Identifying potential problems or negative consequences\n';
        overview += '• Questioning assumptions and highlighting risks\n';
        overview += '• Presenting alternative viewpoints and solutions\n';
        overview += '• Demonstrating why caution or a different approach may be needed\n\n';
      }

      // Add level-specific guidance
      if (userLevel === 'beginner') {
        overview += 'Focus Strategy: Start with your strongest, clearest arguments. Don\'t worry about covering everything - depth is better than breadth.\n\n';
      } else if (userLevel === 'advanced') {
        overview += 'Strategic Considerations: Consider the nuanced aspects of this position and anticipate sophisticated counterarguments.\n\n';
      }

      // Add personalized elements based on user profile
      if (userProfile.preferred_argument_types.length > 0) {
        const preferredType = userProfile.preferred_argument_types[0];
        overview += `Based on your strengths, consider emphasizing ${preferredType} arguments in your presentation.\n\n`;
      }

      overview += 'Remember: Your goal is not just to win, but to engage in constructive dialogue that explores this important topic thoroughly.';

      return overview;

    } catch (error) {
      this.logger.warn(`Failed to generate position overview: ${error.message}`);
      return `You will be ${position === 'PRO' ? 'supporting' : 'opposing'} the position: "${topic.title}". Focus on presenting clear, evidence-based arguments that respect the complexity of this issue.`;
    }
  }

  /**
   * Generate key arguments for the specified position
   */
  private async generateKeyArguments(
    topic: any,
    position: 'PRO' | 'CON',
    userProfile: UserDebateProfile,
    userLevel: string
  ): Promise<Argument[]> {
    try {
      const arguments: Argument[] = [];

      // Determine number of arguments based on user level and preparation time
      const argCount = userLevel === 'beginner' ? 3 : userLevel === 'intermediate' ? 4 : 5;

      // Generate arguments based on topic category and position
      const argumentStrategies = await this.getArgumentStrategies(topic, position);

      for (let i = 0; i < Math.min(argCount, argumentStrategies.length); i++) {
        const strategy = argumentStrategies[i];
        const argument = await this.buildArgument(strategy, topic, position, userProfile, i + 1);
        arguments.push(argument);
      }

      return arguments;

    } catch (error) {
      this.logger.warn(`Failed to generate key arguments: ${error.message}`);
      return this.getDefaultArguments(topic, position, userLevel);
    }
  }

  /**
   * Get argument strategies based on topic and position
   */
  private async getArgumentStrategies(topic: any, position: 'PRO' | 'CON'): Promise<any[]> {
    // Topic-specific argument strategies
    const categoryStrategies = {
      'Politics': {
        'PRO': [
          { type: 'practical', focus: 'policy effectiveness', strength: 8 },
          { type: 'ethical', focus: 'democratic values', strength: 7 },
          { type: 'statistical', focus: 'historical precedent', strength: 6 }
        ],
        'CON': [
          { type: 'practical', focus: 'implementation challenges', strength: 8 },
          { type: 'ethical', focus: 'unintended consequences', strength: 7 },
          { type: 'logical', focus: 'alternative solutions', strength: 6 }
        ]
      },
      'Economics': {
        'PRO': [
          { type: 'statistical', focus: 'economic data', strength: 9 },
          { type: 'practical', focus: 'market efficiency', strength: 8 },
          { type: 'logical', focus: 'supply and demand', strength: 7 }
        ],
        'CON': [
          { type: 'statistical', focus: 'economic risks', strength: 8 },
          { type: 'ethical', focus: 'inequality concerns', strength: 7 },
          { type: 'practical', focus: 'market failures', strength: 7 }
        ]
      },
      'Technology': {
        'PRO': [
          { type: 'practical', focus: 'innovation benefits', strength: 9 },
          { type: 'statistical', focus: 'efficiency gains', strength: 8 },
          { type: 'logical', focus: 'progress necessity', strength: 7 }
        ],
        'CON': [
          { type: 'ethical', focus: 'privacy concerns', strength: 8 },
          { type: 'practical', focus: 'job displacement', strength: 8 },
          { type: 'logical', focus: 'dependency risks', strength: 7 }
        ]
      },
      'Environment': {
        'PRO': [
          { type: 'statistical', focus: 'environmental data', strength: 9 },
          { type: 'ethical', focus: 'future generations', strength: 8 },
          { type: 'practical', focus: 'sustainable solutions', strength: 7 }
        ],
        'CON': [
          { type: 'practical', focus: 'economic costs', strength: 8 },
          { type: 'logical', focus: 'alternative priorities', strength: 7 },
          { type: 'statistical', focus: 'uncertainty in projections', strength: 6 }
        ]
      }
    };

    const strategies = categoryStrategies[topic.category]?.[position] || [
      { type: 'logical', focus: 'core reasoning', strength: 7 },
      { type: 'practical', focus: 'real-world application', strength: 7 },
      { type: 'ethical', focus: 'moral considerations', strength: 6 }
    ];

    return strategies;
  }

  /**
   * Build a specific argument based on strategy
   */
  private async buildArgument(
    strategy: any,
    topic: any,
    position: 'PRO' | 'CON',
    userProfile: UserDebateProfile,
    argNumber: number
  ): Promise<Argument> {
    const template = this.ARGUMENT_TEMPLATES[strategy.type] || this.ARGUMENT_TEMPLATES.logical;
    
    const argument: Argument = {
      id: `arg-${argNumber}`,
      title: `${strategy.focus.charAt(0).toUpperCase() + strategy.focus.slice(1)} Argument`,
      description: this.generateArgumentDescription(strategy, topic, position),
      strength: strategy.strength,
      type: strategy.type,
      supportingEvidence: this.generateSupportingEvidence(strategy, topic, position),
      potentialWeaknesses: this.identifyPotentialWeaknesses(strategy, position),
      deliveryTips: this.generateDeliveryTips(strategy.type, userProfile)
    };

    return argument;
  }

  /**
   * Generate argument description
   */
  private generateArgumentDescription(strategy: any, topic: any, position: 'PRO' | 'CON'): string {
    const focus = strategy.focus;
    const stance = position === 'PRO' ? 'supports' : 'challenges';
    
    return `This ${strategy.type} argument ${stance} the position by focusing on ${focus}. ` +
           `It provides a ${strategy.type} framework for understanding why this perspective ` +
           `${position === 'PRO' ? 'should be adopted' : 'requires careful consideration'}.`;
  }

  /**
   * Generate supporting evidence suggestions
   */
  private generateSupportingEvidence(strategy: any, topic: any, position: 'PRO' | 'CON'): string[] {
    const evidenceTypes = {
      logical: ['peer-reviewed studies', 'expert analysis', 'case studies'],
      statistical: ['government data', 'research statistics', 'trend analysis'],
      ethical: ['philosophical frameworks', 'moral precedents', 'ethical guidelines'],
      practical: ['real-world examples', 'pilot programs', 'implementation data'],
      emotional: ['personal stories', 'community impact', 'human experiences']
    };

    return evidenceTypes[strategy.type] || evidenceTypes.logical;
  }

  /**
   * Identify potential weaknesses in the argument
   */
  private identifyPotentialWeaknesses(strategy: any, position: 'PRO' | 'CON'): string[] {
    const commonWeaknesses = {
      logical: ['Missing premises', 'Logical fallacies', 'Oversimplification'],
      statistical: ['Data interpretation', 'Sample size issues', 'Correlation vs causation'],
      ethical: ['Value conflicts', 'Cultural differences', 'Competing priorities'],
      practical: ['Implementation challenges', 'Resource constraints', 'Unintended consequences'],
      emotional: ['Emotional manipulation', 'Lack of objectivity', 'Anecdotal evidence']
    };

    return commonWeaknesses[strategy.type] || commonWeaknesses.logical;
  }

  /**
   * Generate delivery tips based on argument type and user profile
   */
  private generateDeliveryTips(argType: string, userProfile: UserDebateProfile): string[] {
    const baseTips = {
      logical: ['Use clear reasoning chains', 'Define key terms', 'Build step-by-step'],
      statistical: ['Cite credible sources', 'Explain significance', 'Use visual aids if possible'],
      ethical: ['Connect to shared values', 'Be respectful of differences', 'Use principled language'],
      practical: ['Provide concrete examples', 'Address feasibility', 'Show real-world impact'],
      emotional: ['Be authentic', 'Balance emotion with logic', 'Respect audience sensitivity']
    };

    const tips = baseTips[argType] || baseTips.logical;

    // Add personalized tips based on user profile
    if (userProfile.areas_for_improvement.includes('confidence')) {
      tips.push('Practice this argument multiple times to build confidence');
    }
    if (userProfile.areas_for_improvement.includes('clarity')) {
      tips.push('Use simple, clear language and avoid jargon');
    }

    return tips;
  }

  /**
   * Get default arguments when AI generation fails
   */
  private getDefaultArguments(topic: any, position: 'PRO' | 'CON', userLevel: string): Argument[] {
    const count = userLevel === 'beginner' ? 3 : 4;
    const arguments: Argument[] = [];

    for (let i = 1; i <= count; i++) {
      arguments.push({
        id: `default-arg-${i}`,
        title: `Key Argument ${i}`,
        description: `A strong ${position} argument for ${topic.title}`,
        strength: 7,
        type: 'logical',
        supportingEvidence: ['Research studies', 'Expert opinions', 'Real-world examples'],
        potentialWeaknesses: ['May need more evidence', 'Consider counterarguments'],
        deliveryTips: ['Be clear and confident', 'Use specific examples', 'Address the audience directly']
      });
    }

    return arguments;
  }

  /**
   * Find relevant evidence sources for the arguments
   */
  private async findEvidenceSources(
    topic: any,
    position: 'PRO' | 'CON',
    arguments: Argument[]
  ): Promise<Source[]> {
    try {
      const sources: Source[] = [];

      // Generate sources based on topic category
      const topicSources = this.getTopicSpecificSources(topic, position);
      sources.push(...topicSources);

      // Add argument-specific sources
      for (const arg of arguments) {
        const argSources = this.getArgumentSpecificSources(arg, topic);
        sources.push(...argSources.slice(0, 2)); // Max 2 sources per argument
      }

      // Deduplicate and sort by relevance
      const uniqueSources = sources.filter((source, index, self) => 
        index === self.findIndex(s => s.title === source.title)
      ).sort((a, b) => b.relevance - a.relevance);

      return uniqueSources.slice(0, 8); // Max 8 sources total

    } catch (error) {
      this.logger.warn(`Failed to find evidence sources: ${error.message}`);
      return this.getDefaultSources(topic, position);
    }
  }

  /**
   * Get topic-specific evidence sources
   */
  private getTopicSpecificSources(topic: any, position: 'PRO' | 'CON'): Source[] {
    // This would ideally connect to external databases or APIs
    // For now, returning structured placeholder sources
    const categorySourceTypes = {
      'Politics': ['government reports', 'policy analyses', 'legislative records'],
      'Economics': ['economic data', 'financial reports', 'market studies'],
      'Technology': ['tech reports', 'innovation studies', 'industry analyses'],
      'Environment': ['environmental data', 'climate studies', 'sustainability reports'],
      'Healthcare': ['medical studies', 'health statistics', 'clinical trials'],
      'Education': ['educational research', 'learning studies', 'academic reports']
    };

    const sourceTypes = categorySourceTypes[topic.category] || ['academic studies', 'expert reports'];
    
    return sourceTypes.map((type, index) => ({
      id: `topic-source-${index}`,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} on ${topic.title}`,
      type: 'academic' as const,
      credibility: 8,
      relevance: 9,
      summary: `Comprehensive ${type} providing evidence for the ${position} position on ${topic.title}`,
      keyQuotes: [
        `"Key finding supporting the ${position} position..."`,
        `"Important data relevant to ${topic.title}..."`
      ]
    }));
  }

  /**
   * Get argument-specific sources
   */
  private getArgumentSpecificSources(argument: Argument, topic: any): Source[] {
    return [{
      id: `arg-source-${argument.id}`,
      title: `Evidence for ${argument.title}`,
      type: argument.type === 'statistical' ? 'academic' : 'organization',
      credibility: Math.min(10, argument.strength + 1),
      relevance: argument.strength,
      summary: `Supporting evidence specifically for ${argument.title} argument`,
      keyQuotes: argument.supportingEvidence.map(evidence => `"${evidence} supports this position"`)
    }];
  }

  /**
   * Get default sources when specific sources can't be found
   */
  private getDefaultSources(topic: any, position: 'PRO' | 'CON'): Source[] {
    return [
      {
        id: 'default-1',
        title: `Research Study on ${topic.title}`,
        type: 'academic',
        credibility: 8,
        relevance: 8,
        summary: `Academic research providing evidence for the ${position} position`,
        keyQuotes: ['Key research finding...', 'Important conclusion...']
      },
      {
        id: 'default-2',
        title: `Expert Analysis of ${topic.title}`,
        type: 'organization',
        credibility: 7,
        relevance: 7,
        summary: `Expert analysis supporting the ${position} perspective`,
        keyQuotes: ['Expert opinion...', 'Professional assessment...']
      }
    ];
  }

  /**
   * Generate counter-argument preparation strategies
   */
  private async generateCounterArgumentPrep(
    topic: any,
    position: 'PRO' | 'CON',
    userProfile: UserDebateProfile
  ): Promise<CounterArgument[]> {
    try {
      const counterArgs: CounterArgument[] = [];
      const oppositePosition = position === 'PRO' ? 'CON' : 'PRO';

      // Generate likely opponent arguments
      const opponentStrategies = await this.getArgumentStrategies(topic, oppositePosition);
      
      for (let i = 0; i < Math.min(4, opponentStrategies.length); i++) {
        const opponentStrategy = opponentStrategies[i];
        const counterArg = this.buildCounterArgumentResponse(opponentStrategy, topic, position, i + 1);
        counterArgs.push(counterArg);
      }

      return counterArgs;

    } catch (error) {
      this.logger.warn(`Failed to generate counter-argument prep: ${error.message}`);
      return this.getDefaultCounterArguments(topic, position);
    }
  }

  /**
   * Build counter-argument response
   */
  private buildCounterArgumentResponse(
    opponentStrategy: any,
    topic: any,
    position: 'PRO' | 'CON',
    index: number
  ): CounterArgument {
    return {
      id: `counter-${index}`,
      opponentArgument: `Opponent may argue using ${opponentStrategy.type} reasoning focusing on ${opponentStrategy.focus}`,
      responseStrategy: this.generateResponseStrategy(opponentStrategy, position),
      rebuttalPoints: this.generateRebuttalPoints(opponentStrategy, position),
      evidenceToAddress: [`${opponentStrategy.focus} claims`, 'Supporting data', 'Underlying assumptions'],
      rhetoricalApproach: this.selectRhetoricalApproach(opponentStrategy),
      confidenceLevel: 7
    };
  }

  /**
   * Generate response strategy for counter-arguments
   */
  private generateResponseStrategy(opponentStrategy: any, position: 'PRO' | 'CON'): string {
    const strategies = {
      logical: 'Challenge the logical chain and identify missing premises',
      statistical: 'Question data sources and interpretation methods',
      ethical: 'Present alternative moral frameworks and competing values',
      practical: 'Highlight implementation challenges and alternative solutions',
      emotional: 'Acknowledge emotions while redirecting to factual analysis'
    };

    return strategies[opponentStrategy.type] || strategies.logical;
  }

  /**
   * Generate rebuttal points
   */
  private generateRebuttalPoints(opponentStrategy: any, position: 'PRO' | 'CON'): string[] {
    const rebuttalFrameworks = {
      logical: [
        'The argument assumes without evidence that...',
        'This reasoning overlooks important factors such as...',
        'A more complete analysis would consider...'
      ],
      statistical: [
        'These statistics may not represent the full picture because...',
        'Correlation in this data doesn\'t necessarily indicate causation...',
        'More recent data shows a different trend...'
      ],
      ethical: [
        'While this moral concern is valid, we must also consider...',
        'This ethical framework conflicts with other important values like...',
        'The greater good requires balancing these considerations...'
      ]
    };

    return rebuttalFrameworks[opponentStrategy.type] || rebuttalFrameworks.logical;
  }

  /**
   * Select rhetorical approach for counter-arguments
   */
  private selectRhetoricalApproach(opponentStrategy: any): CounterArgument['rhetoricalApproach'] {
    const approachMap = {
      logical: 'question-assumptions',
      statistical: 'direct',
      ethical: 'concede-and-pivot',
      practical: 'redirect',
      emotional: 'concede-and-pivot'
    };

    return approachMap[opponentStrategy.type] || 'direct';
  }

  /**
   * Get default counter-arguments
   */
  private getDefaultCounterArguments(topic: any, position: 'PRO' | 'CON'): CounterArgument[] {
    return [
      {
        id: 'default-counter-1',
        opponentArgument: `A common opposing argument to the ${position} position`,
        responseStrategy: 'Address the concern while reinforcing your position',
        rebuttalPoints: ['Point out limitations in their reasoning', 'Provide alternative perspective', 'Offer supporting evidence'],
        evidenceToAddress: ['Their key claims', 'Supporting evidence', 'Underlying assumptions'],
        rhetoricalApproach: 'direct',
        confidenceLevel: 7
      }
    ];
  }

  /**
   * Generate personalized preparation tips
   */
  private async generatePreparationTips(
    userProfile: UserDebateProfile,
    userLevel: string,
    position: 'PRO' | 'CON'
  ): Promise<string[]> {
    const tips: string[] = [];

    // Level-specific tips
    if (userLevel === 'beginner') {
      tips.push('Focus on mastering 2-3 strong arguments rather than trying to cover everything');
      tips.push('Practice your opening statement until you can deliver it confidently');
      tips.push('Prepare simple, clear responses to obvious counterarguments');
    } else if (userLevel === 'intermediate') {
      tips.push('Develop nuanced positions that acknowledge complexity while maintaining your stance');
      tips.push('Prepare multiple lines of evidence for your strongest arguments');
      tips.push('Practice transitioning smoothly between defense and offense');
    } else {
      tips.push('Consider the philosophical underpinnings of both positions');
      tips.push('Prepare sophisticated responses that demonstrate deep understanding');
      tips.push('Look for opportunities to reframe the debate on favorable terms');
    }

    // Personalized tips based on profile
    if (userProfile.areas_for_improvement.includes('confidence')) {
      tips.push('Practice in front of a mirror or record yourself to build confidence');
    }
    if (userProfile.areas_for_improvement.includes('organization')) {
      tips.push('Create a clear outline with main points and supporting details');
    }
    if (userProfile.strengths.includes('research')) {
      tips.push('Leverage your research skills to find unique and compelling evidence');
    }

    // Position-specific tips
    if (position === 'PRO') {
      tips.push('Be ready to defend the status quo or proposed changes');
      tips.push('Prepare positive examples and success stories');
    } else {
      tips.push('Focus on identifying problems and unintended consequences');
      tips.push('Prepare alternative solutions to show constructive criticism');
    }

    return tips;
  }

  /**
   * Create structured preparation timeline
   */
  private createPreparationTimeline(
    totalHours: number,
    userLevel: string,
    argumentCount: number
  ): PrepTimeline {
    const phases = this.generatePrepPhases(totalHours, userLevel, argumentCount);
    const milestones = this.generateMilestones(totalHours);
    const checkpoints = this.generateCheckpoints(totalHours);

    return {
      totalHours,
      phases,
      milestones,
      checkpoints
    };
  }

  /**
   * Generate preparation phases
   */
  private generatePrepPhases(totalHours: number, userLevel: string, argumentCount: number): PrepPhase[] {
    const phases: PrepPhase[] = [];
    const complexityMultiplier = userLevel === 'beginner' ? 1 : userLevel === 'intermediate' ? 1.2 : 1.5;

    // Research phase
    const researchHours = Math.max(1, Math.round(totalHours * 0.4));
    phases.push({
      phase: 'Research & Analysis',
      description: 'Gather information, understand the topic deeply, and identify key evidence',
      duration: researchHours,
      activities: [
        {
          task: 'Read topic materials and background information',
          duration: Math.round(researchHours * 0.3 * 60),
          description: 'Understand the context and key issues',
          resources: ['Topic description', 'Background articles'],
          outcome: 'Comprehensive topic understanding'
        },
        {
          task: 'Research supporting evidence',
          duration: Math.round(researchHours * 0.4 * 60),
          description: 'Find credible sources and evidence for your position',
          resources: ['Academic databases', 'News sources', 'Government data'],
          outcome: 'Strong evidence base'
        },
        {
          task: 'Analyze opponent position',
          duration: Math.round(researchHours * 0.3 * 60),
          description: 'Understand likely counterarguments and prepare responses',
          resources: ['Opposing viewpoint articles', 'Counter-argument guides'],
          outcome: 'Prepared for counterarguments'
        }
      ],
      priority: 'critical'
    });

    // Organization phase
    const organizationHours = Math.max(0.5, Math.round(totalHours * 0.25));
    phases.push({
      phase: 'Organization & Structure',
      description: 'Organize arguments, create outlines, and structure your case',
      duration: organizationHours,
      activities: [
        {
          task: 'Create argument outline',
          duration: Math.round(organizationHours * 0.5 * 60),
          description: 'Organize main arguments in logical order',
          resources: ['Argument templates', 'Debate structure guides'],
          outcome: 'Clear argument structure'
        },
        {
          task: 'Prepare evidence summaries',
          duration: Math.round(organizationHours * 0.5 * 60),
          description: 'Summarize key evidence for quick reference',
          resources: ['Research notes', 'Evidence sources'],
          outcome: 'Accessible evidence summaries'
        }
      ],
      priority: 'critical'
    });

    // Practice phase
    const practiceHours = Math.max(0.5, Math.round(totalHours * 0.35));
    phases.push({
      phase: 'Practice & Refinement',
      description: 'Practice delivery, refine arguments, and prepare for questions',
      duration: practiceHours,
      activities: [
        {
          task: 'Practice opening statement',
          duration: Math.round(practiceHours * 0.3 * 60),
          description: 'Perfect your opening argument delivery',
          resources: ['Opening outline', 'Timer'],
          outcome: 'Confident opening delivery'
        },
        {
          task: 'Practice responses to counterarguments',
          duration: Math.round(practiceHours * 0.4 * 60),
          description: 'Rehearse responses to likely opponent arguments',
          resources: ['Counter-argument prep', 'Response scripts'],
          outcome: 'Ready responses to challenges'
        },
        {
          task: 'Full debate run-through',
          duration: Math.round(practiceHours * 0.3 * 60),
          description: 'Practice complete debate performance',
          resources: ['Full argument set', 'Debate format guide'],
          outcome: 'Polished overall performance'
        }
      ],
      priority: 'important'
    });

    return phases;
  }

  /**
   * Generate preparation milestones
   */
  private generateMilestones(totalHours: number): Milestone[] {
    return [
      {
        name: 'Research Complete',
        description: 'All necessary research and evidence gathering finished',
        targetTime: Math.round(totalHours * 0.4),
        criteria: ['Key arguments identified', 'Supporting evidence collected', 'Counterarguments understood']
      },
      {
        name: 'Arguments Organized',
        description: 'All arguments structured and outlined clearly',
        targetTime: Math.round(totalHours * 0.65),
        criteria: ['Argument outline complete', 'Evidence organized', 'Speaking notes prepared']
      },
      {
        name: 'Debate Ready',
        description: 'Fully prepared and confident for debate performance',
        targetTime: totalHours,
        criteria: ['Opening practiced', 'Responses prepared', 'Confident delivery achieved']
      }
    ];
  }

  /**
   * Generate preparation checkpoints
   */
  private generateCheckpoints(totalHours: number): Checkpoint[] {
    const checkpoints: Checkpoint[] = [];
    const interval = Math.max(1, Math.round(totalHours / 4));

    for (let i = interval; i < totalHours; i += interval) {
      checkpoints.push({
        time: i,
        questions: [
          'Am I on track with my preparation timeline?',
          'Do I understand my position and main arguments clearly?',
          'Have I addressed potential weaknesses in my case?',
          'Am I feeling more confident about the upcoming debate?'
        ],
        expectedOutcomes: [
          'Clear progress on preparation goals',
          'Growing confidence in position and arguments',
          'Identified and addressed knowledge gaps',
          'Ready for next preparation phase'
        ]
      });
    }

    return checkpoints;
  }

  /**
   * Generate practice questions for debate preparation
   */
  private async generatePracticeQuestions(
    topic: any,
    position: 'PRO' | 'CON',
    userLevel: string
  ): Promise<PracticeQuestion[]> {
    const questions: PracticeQuestion[] = [];
    const questionCount = userLevel === 'beginner' ? 6 : userLevel === 'intermediate' ? 8 : 10;

    // Generate questions for different debate phases
    const phases = ['opening', 'cross-examination', 'rebuttal', 'closing'];
    const questionsPerPhase = Math.ceil(questionCount / phases.length);

    for (const phase of phases) {
      for (let i = 0; i < questionsPerPhase && questions.length < questionCount; i++) {
        const question = this.generatePhaseSpecificQuestion(phase, topic, position, userLevel, i + 1);
        questions.push(question);
      }
    }

    return questions;
  }

  /**
   * Generate phase-specific practice question
   */
  private generatePhaseSpecificQuestion(
    phase: string,
    topic: any,
    position: 'PRO' | 'CON',
    userLevel: string,
    index: number
  ): PracticeQuestion {
    const questionTemplates = {
      opening: [
        `What is your strongest argument for the ${position} position on ${topic.title}?`,
        `How would you introduce this topic to someone unfamiliar with the issues?`,
        `What makes your position the most reasonable approach?`
      ],
      'cross-examination': [
        `How do you respond to the claim that your position ignores...?`,
        `What evidence do you have to support your main argument?`,
        `How does your position address the concerns of...?`
      ],
      rebuttal: [
        `How would you counter the argument that...?`,
        `What are the weaknesses in the opposing position?`,
        `How do you maintain your position despite these challenges?`
      ],
      closing: [
        `Why should the audience accept your position over the alternative?`,
        `What are the most important points to remember from your case?`,
        `What would you say to someone still undecided on this issue?`
      ]
    };

    const templates = questionTemplates[phase] || questionTemplates.opening;
    const questionText = templates[index % templates.length];

    const difficulty = userLevel === 'beginner' ? 3 : userLevel === 'intermediate' ? 6 : 8;

    return {
      id: `practice-${phase}-${index}`,
      question: questionText,
      type: phase as any,
      difficulty,
      suggestedResponse: `Consider addressing this by focusing on your strongest evidence and connecting to core values`,
      learningObjective: `Master ${phase} skills and build confidence in position defense`
    };
  }

  /**
   * Suggest additional resources for preparation
   */
  private async suggestAdditionalResources(
    topic: any,
    position: 'PRO' | 'CON',
    userProfile: UserDebateProfile,
    userLevel: string
  ): Promise<AdditionalResource[]> {
    const resources: AdditionalResource[] = [];

    // Level-appropriate resources
    if (userLevel === 'beginner') {
      resources.push(
        {
          title: 'Basic Debate Structure Guide',
          type: 'article',
          description: 'Learn the fundamental structure of effective debate arguments',
          timeToConsume: 15,
          priority: 'high'
        },
        {
          title: 'Confidence Building Exercises',
          type: 'tool',
          description: 'Techniques to build confidence for public speaking and debate',
          timeToConsume: 20,
          priority: 'medium'
        }
      );
    } else if (userLevel === 'advanced') {
      resources.push(
        {
          title: 'Advanced Rhetorical Techniques',
          type: 'article',
          description: 'Sophisticated persuasion and argumentation strategies',
          timeToConsume: 30,
          priority: 'medium'
        },
        {
          title: 'Philosophical Debate Frameworks',
          type: 'article',
          description: 'Deep theoretical approaches to complex debate topics',
          timeToConsume: 45,
          priority: 'low'
        }
      );
    }

    // Topic-specific resources
    resources.push({
      title: `Expert Analysis: ${topic.title}`,
      type: 'article',
      description: `In-depth expert perspective on ${topic.title}`,
      timeToConsume: 25,
      priority: 'high'
    });

    // User-specific resources based on profile
    if (userProfile.areas_for_improvement.includes('evidence')) {
      resources.push({
        title: 'Evidence Evaluation Checklist',
        type: 'template',
        description: 'Framework for evaluating and presenting evidence effectively',
        timeToConsume: 10,
        priority: 'high'
      });
    }

    if (userProfile.learning_style === 'visual') {
      resources.push({
        title: 'Argument Mapping Tools',
        type: 'tool',
        description: 'Visual tools for organizing and mapping debate arguments',
        timeToConsume: 20,
        priority: 'medium'
      });
    }

    return resources.slice(0, 6); // Limit to 6 resources
  }

  /**
   * Helper methods
   */
  private buildCacheKey(request: PreparationRequest): string {
    return `prep_materials:${request.matchId}:${request.userId}:${request.position}:${request.userLevel}`;
  }

  private async getMatchDetails(matchId: string): Promise<any> {
    return this.prismaService.match.findUnique({
      where: { id: matchId },
      include: {
        student1: true,
        student2: true,
        topic: true
      }
    });
  }

  private async getTopicDetails(topicId: string): Promise<any> {
    return this.prismaService.debateTopic.findUnique({
      where: { id: topicId }
    });
  }

  private async getUserDebateProfile(userId: string): Promise<UserDebateProfile> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          profile: true
        }
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Build profile from available data
      // This would be enhanced with actual debate history and performance data
      return {
        userId,
        experienceLevel: 5, // Default medium experience
        strengths: ['research', 'organization'], // Could be derived from past performance
        areas_for_improvement: ['confidence', 'clarity'], // Could be derived from feedback
        preferred_argument_types: ['logical', 'statistical'], // Could be derived from patterns
        learning_style: 'reading', // Could be from user preferences
        debate_history: {
          total_debates: 0, // Would come from match history
          win_rate: 0.5, // Would be calculated from outcomes
          average_satisfaction: 4.0, // Would come from feedback
          common_challenges: ['counterarguments'] // Would be derived from patterns
        }
      };
    } catch (error) {
      this.logger.warn(`Failed to get user debate profile: ${error.message}`);
      return this.getDefaultUserProfile(userId);
    }
  }

  private getDefaultUserProfile(userId: string): UserDebateProfile {
    return {
      userId,
      experienceLevel: 3,
      strengths: ['preparation'],
      areas_for_improvement: ['confidence'],
      preferred_argument_types: ['logical'],
      learning_style: 'reading',
      debate_history: {
        total_debates: 0,
        win_rate: 0.5,
        average_satisfaction: 3.5,
        common_challenges: []
      }
    };
  }

  private calculateDifficultyLevel(topic: any, userLevel: string): number {
    const baseDifficulty = topic.difficulty_level || 5;
    const levelMultiplier = userLevel === 'beginner' ? 0.8 : userLevel === 'intermediate' ? 1.0 : 1.2;
    return Math.round(baseDifficulty * levelMultiplier);
  }
}
