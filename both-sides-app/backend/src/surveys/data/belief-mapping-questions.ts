/**
 * Phase 3 Task 3.1.1.2: Question Content and Validation System
 * Research-backed questions for belief mapping covering major ideological axes
 */

import { SurveyQuestionCategory, SurveyQuestionType } from '@prisma/client';

export interface IdeologyAxis {
  name: string;
  weight: number;
  direction: 'positive' | 'negative'; // positive = increases score, negative = decreases
}

export interface QuestionDefinition {
  id: string;
  section: string;
  order: number;
  category: SurveyQuestionCategory;
  type: SurveyQuestionType;
  question: string;
  options?: string[];
  scale?: {
    min: number;
    max: number;
    labels: string[];
  };
  weight: number;
  ideology_mapping: IdeologyAxis[];
  required: boolean;
  randomize_within_section: boolean;
  age_appropriate_min: number; // minimum age
  complexity_level: 'basic' | 'intermediate' | 'advanced';
  skip_conditions?: {
    if_previous_answer: string;
    skip_to_section?: string;
  }[];
}

/**
 * Core belief mapping questions based on political science research
 * Covers major ideological dimensions for educational debate matching
 */
export const BELIEF_MAPPING_QUESTIONS: QuestionDefinition[] = [
  // Section 1: Economic Views
  {
    id: 'econ_01',
    section: 'economic_beliefs',
    order: 1,
    category: 'ECONOMIC',
    type: 'LIKERT',
    question: 'Government should play a major role in regulating businesses to protect workers and the environment.',
    scale: {
      min: 1,
      max: 5,
      labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
    },
    weight: 0.8,
    ideology_mapping: [
      { name: 'economic', weight: 0.7, direction: 'negative' }, // left = government regulation
      { name: 'tradition', weight: 0.3, direction: 'negative' }
    ],
    required: true,
    randomize_within_section: false,
    age_appropriate_min: 14,
    complexity_level: 'basic'
  },

  {
    id: 'econ_02',
    section: 'economic_beliefs',
    order: 2,
    category: 'ECONOMIC',
    type: 'LIKERT',
    question: 'Free markets and competition, not government programs, are the best way to create jobs and prosperity.',
    scale: {
      min: 1,
      max: 5,
      labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
    },
    weight: 0.8,
    ideology_mapping: [
      { name: 'economic', weight: 0.8, direction: 'positive' }, // right = free market
    ],
    required: true,
    randomize_within_section: false,
    age_appropriate_min: 14,
    complexity_level: 'basic'
  },

  {
    id: 'econ_03',
    section: 'economic_beliefs',
    order: 3,
    category: 'ECONOMIC',
    type: 'LIKERT',
    question: 'Wealthy individuals and corporations should pay significantly higher tax rates.',
    scale: {
      min: 1,
      max: 5,
      labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
    },
    weight: 0.7,
    ideology_mapping: [
      { name: 'economic', weight: 0.7, direction: 'negative' }, // left = higher taxes
    ],
    required: true,
    randomize_within_section: true,
    age_appropriate_min: 15,
    complexity_level: 'intermediate'
  },

  // Section 2: Social Values
  {
    id: 'social_01',
    section: 'social_values',
    order: 1,
    category: 'SOCIAL',
    type: 'LIKERT',
    question: 'Society works best when people have the freedom to make their own choices, even if others disapprove.',
    scale: {
      min: 1,
      max: 5,
      labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
    },
    weight: 0.9,
    ideology_mapping: [
      { name: 'social', weight: 0.8, direction: 'positive' }, // libertarian = individual freedom
    ],
    required: true,
    randomize_within_section: false,
    age_appropriate_min: 14,
    complexity_level: 'basic'
  },

  {
    id: 'social_02',
    section: 'social_values',
    order: 2,
    category: 'SOCIAL',
    type: 'LIKERT',
    question: 'Traditional family values are important for maintaining a stable society.',
    scale: {
      min: 1,
      max: 5,
      labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
    },
    weight: 0.7,
    ideology_mapping: [
      { name: 'tradition', weight: 0.8, direction: 'positive' }, // traditional values
      { name: 'social', weight: 0.4, direction: 'negative' } // less libertarian
    ],
    required: true,
    randomize_within_section: true,
    age_appropriate_min: 15,
    complexity_level: 'intermediate'
  },

  // Section 3: Government Role
  {
    id: 'gov_01',
    section: 'government_role',
    order: 1,
    category: 'POLITICAL',
    type: 'LIKERT',
    question: 'Government should provide healthcare, education, and housing as basic rights.',
    scale: {
      min: 1,
      max: 5,
      labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
    },
    weight: 0.9,
    ideology_mapping: [
      { name: 'economic', weight: 0.6, direction: 'negative' }, // left = government services
      { name: 'social', weight: 0.4, direction: 'negative' } // less libertarian
    ],
    required: true,
    randomize_within_section: false,
    age_appropriate_min: 14,
    complexity_level: 'basic'
  },

  {
    id: 'gov_02',
    section: 'government_role',
    order: 2,
    category: 'POLITICAL',
    type: 'MULTIPLE_CHOICE',
    question: 'What should be the primary role of government?',
    options: [
      'Protect individual rights and freedoms',
      'Ensure economic equality and social welfare',
      'Maintain order and traditional values',
      'Promote national strength and security'
    ],
    weight: 0.8,
    ideology_mapping: [
      { name: 'social', weight: 0.7, direction: 'positive' }, // option 1 = libertarian
      { name: 'economic', weight: 0.7, direction: 'negative' }, // option 2 = left
      { name: 'tradition', weight: 0.7, direction: 'positive' }, // option 3 = traditional
      { name: 'globalism', weight: 0.5, direction: 'negative' } // option 4 = nationalist
    ],
    required: true,
    randomize_within_section: true,
    age_appropriate_min: 16,
    complexity_level: 'intermediate'
  },

  // Section 4: Environmental & Global Issues
  {
    id: 'env_01',
    section: 'environment_global',
    order: 1,
    category: 'PHILOSOPHICAL',
    type: 'LIKERT',
    question: 'Protecting the environment should be prioritized even if it means economic sacrifices.',
    scale: {
      min: 1,
      max: 5,
      labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
    },
    weight: 0.8,
    ideology_mapping: [
      { name: 'environment', weight: 0.9, direction: 'positive' }, // environmental priority
      { name: 'economic', weight: 0.3, direction: 'negative' } // less market-focused
    ],
    required: true,
    randomize_within_section: false,
    age_appropriate_min: 14,
    complexity_level: 'basic'
  },

  {
    id: 'global_01',
    section: 'environment_global',
    order: 2,
    category: 'POLITICAL',
    type: 'LIKERT',
    question: 'Countries should work together through international organizations to solve global problems.',
    scale: {
      min: 1,
      max: 5,
      labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
    },
    weight: 0.7,
    ideology_mapping: [
      { name: 'globalism', weight: 0.8, direction: 'positive' }, // globalist
    ],
    required: true,
    randomize_within_section: true,
    age_appropriate_min: 15,
    complexity_level: 'intermediate'
  },

  // Section 5: Personal Values & Flexibility Assessment
  {
    id: 'personal_01',
    section: 'personal_flexibility',
    order: 1,
    category: 'PERSONAL',
    type: 'LIKERT',
    question: 'I often change my mind about important issues when I learn new information.',
    scale: {
      min: 1,
      max: 5,
      labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often']
    },
    weight: 0.9,
    ideology_mapping: [
      { name: 'certainty', weight: 0.8, direction: 'negative' }, // less certain = more flexible
    ],
    required: true,
    randomize_within_section: false,
    age_appropriate_min: 13,
    complexity_level: 'basic'
  },

  {
    id: 'personal_02',
    section: 'personal_flexibility',
    order: 2,
    category: 'PERSONAL',
    type: 'MULTIPLE_CHOICE',
    question: 'When someone disagrees with my political views, I usually:',
    options: [
      'Try to understand their perspective and find common ground',
      'Defend my position but listen to their arguments',
      'Avoid discussing politics altogether',
      'Firmly argue for my beliefs without compromise'
    ],
    weight: 0.8,
    ideology_mapping: [
      { name: 'certainty', weight: 0.6, direction: 'negative' }, // option 1 = flexible
      { name: 'consistency', weight: 0.4, direction: 'positive' } // option 2 = balanced
    ],
    required: true,
    randomize_within_section: false,
    age_appropriate_min: 14,
    complexity_level: 'basic'
  },

  // Section 6: Text Response for Nuanced Views
  {
    id: 'text_01',
    section: 'open_reflection',
    order: 1,
    category: 'PHILOSOPHICAL',
    type: 'TEXT',
    question: 'Describe a political issue where you feel torn between different viewpoints, and explain why it\'s complicated for you.',
    weight: 0.6,
    ideology_mapping: [
      { name: 'certainty', weight: 0.5, direction: 'negative' }, // complexity indicates flexibility
      { name: 'consistency', weight: 0.3, direction: 'positive' }
    ],
    required: false,
    randomize_within_section: false,
    age_appropriate_min: 16,
    complexity_level: 'advanced'
  }
];

/**
 * Question validation utilities for age-appropriateness and bias-neutrality
 */
export class QuestionValidator {
  /**
   * Validates if a question is appropriate for the given age
   */
  static isAgeAppropriate(question: QuestionDefinition, userAge: number): boolean {
    return userAge >= question.age_appropriate_min;
  }

  /**
   * Validates question content for bias-neutrality
   */
  static validateBiasNeutrality(questionText: string): {
    isNeutral: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const biasIndicators = [
      { pattern: /\b(obviously|clearly|everyone knows)\b/i, issue: 'Absolutist language' },
      { pattern: /\b(stupid|ridiculous|insane)\b/i, issue: 'Inflammatory language' },
      { pattern: /\b(real americans|true patriots)\b/i, issue: 'Exclusionary language' },
      { pattern: /\b(liberals always|conservatives never)\b/i, issue: 'Overgeneralization' }
    ];

    biasIndicators.forEach(({ pattern, issue }) => {
      if (pattern.test(questionText)) {
        issues.push(issue);
      }
    });

    return {
      isNeutral: issues.length === 0,
      issues
    };
  }

  /**
   * Checks for age-appropriate language and concepts
   */
  static validateAgeAppropriateness(question: QuestionDefinition): {
    isAppropriate: boolean;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    
    // Check for complex vocabulary
    const complexTerms = ['hegemony', 'bourgeoisie', 'dialectical', 'paradigm'];
    complexTerms.forEach(term => {
      if (question.question.toLowerCase().includes(term) && question.age_appropriate_min < 16) {
        suggestions.push(`Consider simpler language than "${term}" for younger students`);
      }
    });

    // Check for sensitive topics requiring higher age
    const sensitiveConcepts = ['abortion', 'sexuality', 'religion', 'race'];
    const hasSensitiveContent = sensitiveConcepts.some(concept => 
      question.question.toLowerCase().includes(concept)
    );
    
    if (hasSensitiveContent && question.age_appropriate_min < 16) {
      suggestions.push('Sensitive topics should have minimum age of 16+');
    }

    return {
      isAppropriate: suggestions.length === 0,
      suggestions
    };
  }
}

/**
 * Multi-language support preparation
 */
export interface QuestionTranslation {
  language: string;
  question: string;
  options?: string[];
  scale_labels?: string[];
}

export const QUESTION_TRANSLATIONS: Record<string, QuestionTranslation[]> = {
  'econ_01': [
    {
      language: 'es',
      question: 'El gobierno debería desempeñar un papel importante en la regulación de las empresas para proteger a los trabajadores y el medio ambiente.',
      scale_labels: ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo']
    },
    {
      language: 'fr',
      question: 'Le gouvernement devrait jouer un rôle majeur dans la réglementation des entreprises pour protéger les travailleurs et l\'environnement.',
      scale_labels: ['Pas du tout d\'accord', 'Pas d\'accord', 'Neutre', 'D\'accord', 'Tout à fait d\'accord']
    }
  ],
  // Additional translations would be added for all questions
};

/**
 * Question content validation and quality scoring
 */
export class QuestionContentValidator {
  /**
   * Comprehensive validation of question content
   */
  static validateQuestion(question: QuestionDefinition): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    score: number; // 0-100 quality score
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Required field validation
    if (!question.question || question.question.trim().length < 10) {
      errors.push('Question text must be at least 10 characters');
      score -= 20;
    }

    if (!question.ideology_mapping || question.ideology_mapping.length === 0) {
      errors.push('Question must map to at least one ideology axis');
      score -= 15;
    }

    // Type-specific validation
    if (question.type === 'MULTIPLE_CHOICE' && (!question.options || question.options.length < 2)) {
      errors.push('Multiple choice questions must have at least 2 options');
      score -= 15;
    }

    if (question.type === 'LIKERT' && !question.scale) {
      errors.push('Likert scale questions must define scale parameters');
      score -= 15;
    }

    // Content quality checks
    const biasCheck = QuestionValidator.validateBiasNeutrality(question.question);
    if (!biasCheck.isNeutral) {
      warnings.push(`Potential bias detected: ${biasCheck.issues.join(', ')}`);
      score -= 5 * biasCheck.issues.length;
    }

    const ageCheck = QuestionValidator.validateAgeAppropriateness(question);
    if (!ageCheck.isAppropriate) {
      warnings.push(`Age appropriateness concerns: ${ageCheck.suggestions.join(', ')}`);
      score -= 3 * ageCheck.suggestions.length;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score)
    };
  }

  /**
   * Validate entire question set for coverage and balance
   */
  static validateQuestionSet(questions: QuestionDefinition[]): {
    isBalanced: boolean;
    coverage: Record<string, number>;
    recommendations: string[];
  } {
    const coverage: Record<string, number> = {};
    const recommendations: string[] = [];

    // Count questions by category
    questions.forEach(q => {
      coverage[q.category] = (coverage[q.category] || 0) + 1;
    });

    // Check for balanced coverage
    const categories = Object.keys(coverage);
    const minPerCategory = 2;
    const isBalanced = categories.every(cat => coverage[cat] >= minPerCategory);

    if (!isBalanced) {
      categories.forEach(cat => {
        if (coverage[cat] < minPerCategory) {
          recommendations.push(`Add more ${cat.toLowerCase()} questions (current: ${coverage[cat]}, recommended: ${minPerCategory}+)`);
        }
      });
    }

    // Check ideology axis coverage
    const axisCoverage: Record<string, number> = {};
    questions.forEach(q => {
      q.ideology_mapping.forEach(axis => {
        axisCoverage[axis.name] = (axisCoverage[axis.name] || 0) + 1;
      });
    });

    const requiredAxes = ['economic', 'social', 'tradition'];
    requiredAxes.forEach(axis => {
      if ((axisCoverage[axis] || 0) < 3) {
        recommendations.push(`Add more questions mapping to ${axis} axis`);
      }
    });

    return {
      isBalanced,
      coverage,
      recommendations
    };
  }
}
