import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BELIEF_MAPPING_QUESTIONS, QuestionValidator, QuestionContentValidator } from './data/belief-mapping-questions';
import { AdaptiveSurveyLogic, AdaptiveConfig, SurveySession } from './utils/adaptive-logic';

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get active survey with adaptive question ordering
   */
  async getActiveSurveyWithQuestions(userId?: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { is_active: true },
      orderBy: { version: 'desc' },
      include: {
        questions: {
          where: { is_active: true },
          orderBy: [{ section: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!survey) {
      throw new NotFoundException('No active survey found');
    }

    // If user provided, apply adaptive logic
    if (userId) {
      const userResponses = await this.getUserResponses(userId, survey.id);
      // Apply adaptive ordering and skip logic here
      // For now, return basic survey structure
    }

    return survey;
  }

  /**
   * Get user's survey responses for progress tracking
   */
  async getUserResponses(userId: string, surveyId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      return [];
    }

    return this.prisma.surveyResponse.findMany({
      where: {
        profile_id: profile.id,
        survey_id: surveyId,
      },
      include: {
        question: true,
      },
      orderBy: { responded_at: 'asc' },
    });
  }

  /**
   * Calculate survey progress for a user
   */
  async getProgressSummary(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      return {
        completed_questions: 0,
        total_questions: 0,
        progress_percentage: 0,
        current_section: null,
        sections_completed: 0,
      };
    }

    const activeSurvey = await this.getActiveSurveyWithQuestions();
    const userResponses = await this.getUserResponses(userId, activeSurvey.id);

    const totalQuestions = activeSurvey.questions.length;
    const completedQuestions = userResponses.length;
    const progressPercentage = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;

    // Determine current section
    const answeredQuestionIds = new Set(userResponses.map(r => r.question_id));
    const nextQuestion = activeSurvey.questions.find(q => !answeredQuestionIds.has(q.id));
    const currentSection = nextQuestion?.section || null;

    // Count completed sections
    const sections = [...new Set(activeSurvey.questions.map(q => q.section))];
    const sectionsCompleted = sections.filter(section => {
      const sectionQuestions = activeSurvey.questions.filter(q => q.section === section);
      return sectionQuestions.every(q => answeredQuestionIds.has(q.id));
    }).length;

    return {
      completed_questions: completedQuestions,
      total_questions: totalQuestions,
      progress_percentage: progressPercentage,
      current_section: currentSection,
      sections_completed: sectionsCompleted,
      total_sections: sections.length,
    };
  }

  /**
   * Validate question content quality
   */
  validateQuestionContent(questionId: string) {
    const question = BELIEF_MAPPING_QUESTIONS.find(q => q.id === questionId);
    if (!question) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    return QuestionContentValidator.validateQuestion(question);
  }

  /**
   * Validate entire question set for balance and coverage
   */
  validateQuestionSet() {
    return QuestionContentValidator.validateQuestionSet(BELIEF_MAPPING_QUESTIONS);
  }

  /**
   * Get questions appropriate for user's age and preferences
   */
  getAdaptiveQuestions(
    userId: string,
    userAge: number,
    complexityPreference: 'basic' | 'intermediate' | 'advanced' = 'basic'
  ) {
    const userResponses: any[] = []; // Would fetch from database
    
    return AdaptiveSurveyLogic.generateAdaptiveSequence(
      BELIEF_MAPPING_QUESTIONS,
      userResponses,
      { age: userAge, complexity_preference: complexityPreference }
    );
  }
}


