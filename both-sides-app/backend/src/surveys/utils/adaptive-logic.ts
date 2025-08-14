/**
 * Phase 3 Task 3.1.1.5: Question Randomization and Adaptive Logic
 * Smart question ordering, skip logic, and fatigue prevention
 */

import { QuestionDefinition } from '../data/belief-mapping-questions';

export interface SurveyResponse {
  question_id: string;
  response_value: any;
  completion_time: number;
  confidence_level?: number;
}

export interface AdaptiveConfig {
  max_questions_per_session: number;
  fatigue_threshold_minutes: number;
  skip_threshold_confidence: number;
  randomization_seed?: string;
}

/**
 * Adaptive survey logic for intelligent question ordering and skip logic
 */
export class AdaptiveSurveyLogic {
  /**
   * Generate personalized question order based on previous responses
   */
  static generateQuestionOrder(
    questions: QuestionDefinition[],
    previousResponses: SurveyResponse[] = [],
    config: AdaptiveConfig
  ): QuestionDefinition[] {
    // Group questions by section
    const sections = this.groupQuestionsBySection(questions);
    const orderedQuestions: QuestionDefinition[] = [];

    // Analyze previous responses for adaptive ordering
    const responseAnalysis = this.analyzeResponses(previousResponses);

    // Order sections based on engagement and completion patterns
    const sectionOrder = this.optimizeSectionOrder(Object.keys(sections), responseAnalysis);

    sectionOrder.forEach(sectionName => {
      const sectionQuestions = sections[sectionName];
      
      // Apply section-specific ordering logic
      const orderedSectionQuestions = this.orderQuestionsInSection(
        sectionQuestions, 
        responseAnalysis,
        config
      );
      
      orderedQuestions.push(...orderedSectionQuestions);
    });

    return orderedQuestions.slice(0, config.max_questions_per_session);
  }

  /**
   * Determine which questions to skip based on previous responses
   */
  static applySkipLogic(
    questions: QuestionDefinition[],
    responses: SurveyResponse[]
  ): QuestionDefinition[] {
    const responseMap = new Map(responses.map(r => [r.question_id, r]));
    
    return questions.filter(question => {
      // Check skip conditions
      if (question.skip_conditions) {
        for (const condition of question.skip_conditions) {
          const previousResponse = responseMap.get(condition.if_previous_answer);
          if (previousResponse && this.shouldSkipBasedOnResponse(previousResponse, condition)) {
            return false;
          }
        }
      }

      // Skip if already answered with high confidence
      const existingResponse = responseMap.get(question.id);
      if (existingResponse && (existingResponse.confidence_level || 0) >= 4) {
        return false;
      }

      return true;
    });
  }

  /**
   * Detect survey fatigue and recommend break points
   */
  static assessSurveyFatigue(
    responses: SurveyResponse[],
    currentSessionStart: Date
  ): {
    fatigueLevel: 'low' | 'medium' | 'high';
    recommendBreak: boolean;
    questionsUntilBreak: number;
  } {
    const sessionDuration = Date.now() - currentSessionStart.getTime();
    const sessionMinutes = sessionDuration / (1000 * 60);

    // Analyze response patterns for fatigue indicators
    const recentResponses = responses.slice(-5);
    const avgCompletionTime = recentResponses.length > 0 
      ? recentResponses.reduce((sum, r) => sum + r.completion_time, 0) / recentResponses.length
      : 0;

    const baselineTime = 15000; // 15 seconds baseline
    const speedRatio = avgCompletionTime / baselineTime;

    let fatigueLevel: 'low' | 'medium' | 'high' = 'low';
    let recommendBreak = false;
    let questionsUntilBreak = 10;

    // Fatigue indicators
    if (sessionMinutes > 20 || speedRatio < 0.3) {
      fatigueLevel = 'high';
      recommendBreak = true;
      questionsUntilBreak = 0;
    } else if (sessionMinutes > 12 || speedRatio < 0.5) {
      fatigueLevel = 'medium';
      questionsUntilBreak = 3;
    } else if (sessionMinutes > 8) {
      fatigueLevel = 'medium';
      questionsUntilBreak = 5;
    }

    return { fatigueLevel, recommendBreak, questionsUntilBreak };
  }

  /**
   * Generate adaptive question sequence based on response patterns
   */
  static generateAdaptiveSequence(
    questions: QuestionDefinition[],
    responses: SurveyResponse[],
    userProfile: { age?: number; complexity_preference?: 'basic' | 'intermediate' | 'advanced' }
  ): QuestionDefinition[] {
    // Filter by age appropriateness
    const ageAppropriate = questions.filter(q => 
      !userProfile.age || q.age_appropriate_min <= userProfile.age
    );

    // Filter by complexity preference
    const complexityFiltered = userProfile.complexity_preference
      ? ageAppropriate.filter(q => q.complexity_level === userProfile.complexity_preference)
      : ageAppropriate;

    // Apply skip logic
    const skipFiltered = this.applySkipLogic(complexityFiltered, responses);

    // Analyze response confidence to prioritize uncertain areas
    const prioritized = this.prioritizeByUncertainty(skipFiltered, responses);

    return prioritized;
  }

  // Private helper methods
  private static groupQuestionsBySection(questions: QuestionDefinition[]): Record<string, QuestionDefinition[]> {
    return questions.reduce((groups, question) => {
      const section = question.section;
      if (!groups[section]) groups[section] = [];
      groups[section].push(question);
      return groups;
    }, {} as Record<string, QuestionDefinition[]>);
  }

  private static analyzeResponses(responses: SurveyResponse[]): {
    avgConfidence: number;
    avgCompletionTime: number;
    strongOpinionAreas: string[];
    uncertainAreas: string[];
  } {
    if (responses.length === 0) {
      return {
        avgConfidence: 0,
        avgCompletionTime: 0,
        strongOpinionAreas: [],
        uncertainAreas: []
      };
    }

    const avgConfidence = responses.reduce((sum, r) => sum + (r.confidence_level || 3), 0) / responses.length;
    const avgCompletionTime = responses.reduce((sum, r) => sum + r.completion_time, 0) / responses.length;

    // Identify patterns - simplified for now
    const strongOpinionAreas: string[] = [];
    const uncertainAreas: string[] = [];

    return {
      avgConfidence,
      avgCompletionTime,
      strongOpinionAreas,
      uncertainAreas
    };
  }

  private static optimizeSectionOrder(
    sections: string[],
    analysis: { avgConfidence: number; strongOpinionAreas: string[]; uncertainAreas: string[] }
  ): string[] {
    // Default educational order - start with easier concepts
    const defaultOrder = [
      'personal_flexibility',
      'economic_beliefs', 
      'social_values',
      'government_role',
      'environment_global',
      'open_reflection'
    ];

    // Filter to only include sections that exist
    return defaultOrder.filter(section => sections.includes(section));
  }

  private static orderQuestionsInSection(
    questions: QuestionDefinition[],
    analysis: any,
    config: AdaptiveConfig
  ): QuestionDefinition[] {
    // Clone and sort by order
    const orderedQuestions = [...questions].sort((a, b) => a.order - b.order);

    // Apply randomization within sections where specified
    const randomizable = orderedQuestions.filter(q => q.randomize_within_section);
    const fixed = orderedQuestions.filter(q => !q.randomize_within_section);

    // Simple randomization (in production, would use seeded random)
    const shuffled = this.shuffleArray([...randomizable]);

    // Merge back maintaining relative order of fixed questions
    const result: QuestionDefinition[] = [];
    let randomIndex = 0;
    let fixedIndex = 0;

    orderedQuestions.forEach(original => {
      if (original.randomize_within_section) {
        result.push(shuffled[randomIndex++]);
      } else {
        result.push(fixed[fixedIndex++]);
      }
    });

    return result;
  }

  private static shouldSkipBasedOnResponse(
    response: SurveyResponse,
    condition: { if_previous_answer: string; skip_to_section?: string }
  ): boolean {
    // Simplified skip logic - would be more sophisticated in production
    return false;
  }

  private static prioritizeByUncertainty(
    questions: QuestionDefinition[],
    responses: SurveyResponse[]
  ): QuestionDefinition[] {
    // For now, return as-is. In production, would reorder based on confidence patterns
    return questions;
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

/**
 * Survey session management for progress and state
 */
export interface SurveySession {
  user_id: string;
  survey_id: string;
  current_question_index: number;
  section_progress: Record<string, number>;
  started_at: Date;
  last_activity: Date;
  total_questions: number;
  completed_questions: number;
}

export class SurveySessionManager {
  /**
   * Calculate progress percentage and section breakdown
   */
  static calculateProgress(session: SurveySession): {
    overall_percentage: number;
    section_percentages: Record<string, number>;
    estimated_time_remaining: number;
  } {
    const overall_percentage = session.total_questions > 0 
      ? (session.completed_questions / session.total_questions) * 100 
      : 0;

    // Estimate remaining time based on average completion time
    const avgTimePerQuestion = 20000; // 20 seconds baseline
    const remainingQuestions = session.total_questions - session.completed_questions;
    const estimated_time_remaining = remainingQuestions * avgTimePerQuestion;

    return {
      overall_percentage,
      section_percentages: session.section_progress,
      estimated_time_remaining
    };
  }

  /**
   * Determine optimal break points to prevent fatigue
   */
  static getBreakRecommendation(session: SurveySession): {
    should_break: boolean;
    break_message: string;
    questions_until_next_break: number;
  } {
    const sessionDuration = Date.now() - session.started_at.getTime();
    const minutes = sessionDuration / (1000 * 60);

    if (minutes > 15) {
      return {
        should_break: true,
        break_message: "You've been working hard! Take a 5-minute break and come back refreshed.",
        questions_until_next_break: 0
      };
    }

    if (minutes > 10) {
      return {
        should_break: false,
        break_message: "Great progress! Consider taking a break after a few more questions.",
        questions_until_next_break: 3
      };
    }

    return {
      should_break: false,
      break_message: "",
      questions_until_next_break: 10
    };
  }
}
