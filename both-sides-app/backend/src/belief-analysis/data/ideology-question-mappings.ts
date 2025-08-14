/**
 * Ideology Question Mappings Database
 * 
 * Comprehensive mapping of survey questions to ideology axes based on
 * political science research and educational psychology principles.
 * Each mapping includes weights, directions, and conditional scoring.
 * 
 * Task 3.2.3: Create Ideology Axis Mapping Algorithms - Question Database
 */

import { QuestionIdeologyMapping, ResponseCondition } from '../services/ideology-mapping.service';

export interface QuestionMapping {
  questionId: string;
  questionText: string;
  questionCategory: string;
  ideologyMapping: QuestionIdeologyMapping;
  researchBasis?: string;
  educationalNotes?: string;
}

/**
 * Comprehensive question mapping database for ideology scoring
 * Based on established political science frameworks including:
 * - Political Compass methodology
 * - World Values Survey
 * - Pew Research Political Typology
 * - Academic research on political attitudes
 */
export const IDEOLOGY_QUESTION_MAPPINGS: QuestionMapping[] = [
  // Economic Policy Questions
  {
    questionId: 'econ_01',
    questionText: 'The government should reduce income inequality through taxation and redistribution',
    questionCategory: 'economic',
    ideologyMapping: {
      axes: {
        economic: { weight: 1.0, direction: 'negative' }, // Agree = more left
        social: { weight: 0.2, direction: 'negative' },   // Slight authoritarian tendency
      }
    },
    researchBasis: 'Core left-right economic distinction from political compass methodology',
    educationalNotes: 'Helps students understand the economic dimension of political beliefs'
  },

  {
    questionId: 'econ_02', 
    questionText: 'Free market competition usually leads to better outcomes than government regulation',
    questionCategory: 'economic',
    ideologyMapping: {
      axes: {
        economic: { weight: 0.9, direction: 'positive' }, // Agree = more right
        tradition: { weight: 0.3, direction: 'positive' }, // Traditional conservative view
      }
    },
    researchBasis: 'Classical liberal vs social democratic distinction',
    educationalNotes: 'Explores the role of markets vs government in economic outcomes'
  },

  {
    questionId: 'econ_03',
    questionText: 'Large corporations have too much power and should be more strictly regulated',
    questionCategory: 'economic', 
    ideologyMapping: {
      axes: {
        economic: { weight: 0.8, direction: 'negative' }, // Agree = more left
        globalism: { weight: 0.4, direction: 'negative' }, // Anti-globalization sentiment
      }
    },
    researchBasis: 'Populist vs establishment economic attitudes research',
    educationalNotes: 'Examines attitudes toward corporate power and regulation'
  },

  // Social Authority Questions
  {
    questionId: 'social_01',
    questionText: 'Schools should have strict discipline and clear rules that all students must follow',
    questionCategory: 'social',
    ideologyMapping: {
      axes: {
        social: { weight: 0.7, direction: 'negative' }, // Agree = more authoritarian
        tradition: { weight: 0.5, direction: 'positive' }, // Traditional values
      }
    },
    researchBasis: 'Authoritarian personality research (Adorno et al.)',
    educationalNotes: 'Explores attitudes toward authority and social order in educational context'
  },

  {
    questionId: 'social_02',
    questionText: 'Individual freedom is more important than social order',
    questionCategory: 'social',
    ideologyMapping: {
      axes: {
        social: { weight: 1.0, direction: 'positive' }, // Agree = more libertarian
        tradition: { weight: 0.3, direction: 'negative' }, // Less traditional
      }
    },
    researchBasis: 'Liberty vs order distinction in political theory',
    educationalNotes: 'Core tension between individual rights and collective security'
  },

  {
    questionId: 'social_03',
    questionText: 'Society works best when people follow traditional gender roles',
    questionCategory: 'social',
    ideologyMapping: {
      axes: {
        tradition: { weight: 0.9, direction: 'positive' }, // Agree = more traditional
        social: { weight: 0.4, direction: 'negative' }, // Slight authoritarian
      }
    },
    researchBasis: 'Social dominance orientation and system justification theory',
    educationalNotes: 'Examines attitudes toward social change and traditional structures'
  },

  // Environmental vs Economic Priority
  {
    questionId: 'env_01',
    questionText: 'Protecting the environment should be prioritized even if it costs jobs',
    questionCategory: 'environmental',
    ideologyMapping: {
      axes: {
        environment: { weight: 1.0, direction: 'positive' }, // Agree = pro-environment
        economic: { weight: 0.3, direction: 'negative' }, // Slight left tendency
      }
    },
    researchBasis: 'Post-materialist values research (Inglehart)',
    educationalNotes: 'Explores trade-offs between economic and environmental priorities'
  },

  {
    questionId: 'env_02',
    questionText: 'Climate change policies should not hurt economic growth',
    questionCategory: 'environmental',
    ideologyMapping: {
      axes: {
        environment: { weight: 0.8, direction: 'negative' }, // Agree = less pro-environment
        economic: { weight: 0.5, direction: 'positive' }, // Pro-growth stance
      }
    },
    researchBasis: 'Environmental-economic attitude research',
    educationalNotes: 'Examines perceived conflicts between environmental protection and economics'
  },

  // Globalism vs Nationalism
  {
    questionId: 'global_01',
    questionText: 'International cooperation and treaties are essential for solving global problems',
    questionCategory: 'political',
    ideologyMapping: {
      axes: {
        globalism: { weight: 0.9, direction: 'positive' }, // Agree = more globalist
        tradition: { weight: 0.2, direction: 'negative' }, // Less traditional nationalist
      }
    },
    researchBasis: 'Cosmopolitan vs communitarian political theory',
    educationalNotes: 'Explores attitudes toward international cooperation vs national sovereignty'
  },

  {
    questionId: 'global_02',
    questionText: 'Our country should prioritize its own citizens over helping other countries',
    questionCategory: 'political',
    ideologyMapping: {
      axes: {
        globalism: { weight: 0.8, direction: 'negative' }, // Agree = more nationalist
        tradition: { weight: 0.4, direction: 'positive' }, // Traditional nationalism
      }
    },
    researchBasis: 'Nationalism vs internationalism research',
    educationalNotes: 'Examines tension between national and global identity'
  },

  // Progressive vs Traditional Values
  {
    questionId: 'trad_01',
    questionText: 'Society has changed too quickly and we should return to traditional values',
    questionCategory: 'philosophical',
    ideologyMapping: {
      axes: {
        tradition: { weight: 1.0, direction: 'positive' }, // Agree = more traditional
        social: { weight: 0.3, direction: 'negative' }, // Slight authoritarian
      }
    },
    researchBasis: 'Conservative vs progressive worldview research',
    educationalNotes: 'Explores attitudes toward social change and tradition'
  },

  {
    questionId: 'trad_02',
    questionText: 'New ideas and ways of life should be embraced rather than feared',
    questionCategory: 'philosophical',
    ideologyMapping: {
      axes: {
        tradition: { weight: 0.9, direction: 'negative' }, // Agree = more progressive
        social: { weight: 0.2, direction: 'positive' }, // Slight libertarian
      }
    },
    researchBasis: 'Openness to experience personality research',
    educationalNotes: 'Examines attitudes toward change and innovation'
  },

  // Complex Multi-Dimensional Questions
  {
    questionId: 'complex_01',
    questionText: 'The government should ensure everyone has access to healthcare, even if it means higher taxes',
    questionCategory: 'political',
    ideologyMapping: {
      axes: {
        economic: { weight: 0.7, direction: 'negative' }, // Left economic policy
        social: { weight: 0.4, direction: 'negative' }, // Government role in society
        environment: { weight: 0.2, direction: 'positive' }, // Public health focus
      }
    },
    researchBasis: 'Welfare state attitude research',
    educationalNotes: 'Multi-dimensional question exploring role of government in social services'
  },

  {
    questionId: 'complex_02',
    questionText: 'Schools should teach students to question authority and think for themselves',
    questionCategory: 'social',
    ideologyMapping: {
      axes: {
        social: { weight: 0.8, direction: 'positive' }, // Libertarian education approach
        tradition: { weight: 0.6, direction: 'negative' }, // Progressive education
        economic: { weight: 0.2, direction: 'negative' }, // Critical thinking about systems
      }
    },
    researchBasis: 'Critical pedagogy and democratic education research',
    educationalNotes: 'Explores educational philosophy and authority relationships'
  }
];

/**
 * Ideology axis definitions with detailed educational context
 */
export const IDEOLOGY_AXIS_DEFINITIONS = {
  economic: {
    name: 'Economic Left-Right',
    description: 'Views on the role of government in the economy and wealth distribution',
    leftLabel: 'Socialist/Progressive',
    rightLabel: 'Capitalist/Conservative', 
    centerLabel: 'Mixed Economy',
    educationalExplanation: 'This axis measures beliefs about economic policy, from supporting more government intervention and wealth redistribution (left) to preferring free markets and individual economic freedom (right).',
    keyIssues: ['taxation', 'regulation', 'welfare programs', 'income inequality', 'business freedom'],
    historicalContext: 'Based on the traditional left-right political spectrum that emerged from the French Revolution'
  },

  social: {
    name: 'Social Authority',
    description: 'Views on individual freedom versus social order and authority',
    leftLabel: 'Authoritarian',
    rightLabel: 'Libertarian',
    centerLabel: 'Moderate',
    educationalExplanation: 'This axis measures beliefs about social control and individual liberty, from supporting strong social order and authority (authoritarian) to prioritizing individual freedom and choice (libertarian).',
    keyIssues: ['law and order', 'civil liberties', 'social conformity', 'personal freedom', 'government power'],
    historicalContext: 'Developed from political science research on authoritarian vs democratic personalities'
  },

  tradition: {
    name: 'Progressive-Traditional',
    description: 'Views on social change and traditional values',
    leftLabel: 'Progressive',
    rightLabel: 'Traditional',
    centerLabel: 'Pragmatic',
    educationalExplanation: 'This axis measures attitudes toward social change and traditional institutions, from embracing rapid social change and new ideas (progressive) to valuing established traditions and gradual change (traditional).',
    keyIssues: ['social change', 'family structures', 'cultural values', 'innovation', 'historical preservation'],
    historicalContext: 'Rooted in conservative vs liberal philosophical traditions about the pace of social change'
  },

  globalism: {
    name: 'Globalism-Nationalism',
    description: 'Views on international cooperation versus national sovereignty',
    leftLabel: 'Nationalist',
    rightLabel: 'Globalist',
    centerLabel: 'Balanced',
    educationalExplanation: 'This axis measures attitudes toward international cooperation and global governance, from prioritizing national sovereignty and interests (nationalist) to supporting international cooperation and global solutions (globalist).',
    keyIssues: ['international trade', 'global governance', 'national sovereignty', 'cultural identity', 'immigration'],
    historicalContext: 'Emerged from debates over globalization and international institutions in the late 20th century'
  },

  environment: {
    name: 'Environmental Priority',
    description: 'Views on environmental protection versus economic growth',
    leftLabel: 'Economic Priority',
    rightLabel: 'Environmental Priority',
    centerLabel: 'Balanced Growth',
    educationalExplanation: 'This axis measures priorities when environmental protection conflicts with economic interests, from prioritizing economic growth and jobs (economic) to prioritizing environmental protection and sustainability (environmental).',
    keyIssues: ['climate policy', 'environmental regulation', 'sustainable development', 'green technology', 'conservation'],
    historicalContext: 'Developed from research on post-materialist values and environmental movement growth since the 1970s'
  }
};

/**
 * Get ideology mapping for a specific question
 */
export function getIdeologyMapping(questionId: string): QuestionMapping | null {
  return IDEOLOGY_QUESTION_MAPPINGS.find(mapping => mapping.questionId === questionId) || null;
}

/**
 * Get mappings by category
 */
export function getMappingsByCategory(category: string): QuestionMapping[] {
  return IDEOLOGY_QUESTION_MAPPINGS.filter(mapping => 
    mapping.questionCategory.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get all available question categories
 */
export function getAvailableCategories(): string[] {
  const categories = new Set(IDEOLOGY_QUESTION_MAPPINGS.map(m => m.questionCategory));
  return Array.from(categories);
}

/**
 * Validate that a question has appropriate ideology mapping
 */
export function validateQuestionMapping(mapping: QuestionMapping): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!mapping.questionId) errors.push('Question ID is required');
  if (!mapping.questionText) errors.push('Question text is required');
  if (!mapping.questionCategory) errors.push('Question category is required');
  if (!mapping.ideologyMapping || !mapping.ideologyMapping.axes) {
    errors.push('Ideology mapping with axes is required');
  }

  // Validate axes
  if (mapping.ideologyMapping?.axes) {
    const validAxes = Object.keys(IDEOLOGY_AXIS_DEFINITIONS);
    Object.entries(mapping.ideologyMapping.axes).forEach(([axis, config]) => {
      if (!validAxes.includes(axis)) {
        errors.push(`Invalid axis: ${axis}`);
      }
      
      if (config.weight < 0 || config.weight > 1) {
        errors.push(`Weight for ${axis} must be between 0 and 1`);
      }
      
      if (!['positive', 'negative'].includes(config.direction)) {
        errors.push(`Direction for ${axis} must be 'positive' or 'negative'`);
      }
    });
  }

  // Check for research basis (warning if missing)
  if (!mapping.researchBasis) {
    warnings.push('Research basis not provided - consider adding for academic credibility');
  }

  // Check for educational notes
  if (!mapping.educationalNotes) {
    warnings.push('Educational notes not provided - consider adding for student understanding');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
