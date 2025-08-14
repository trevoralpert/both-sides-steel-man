import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BELIEF_MAPPING_QUESTIONS, QuestionValidator, QuestionContentValidator } from './data/belief-mapping-questions';
import { AdaptiveSurveyLogic, AdaptiveConfig, SurveySession } from './utils/adaptive-logic';
import { SurveyResponseDto, BulkSurveyResponseDto } from './dto/survey-response.dto';

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

  /**
   * Task 3.1.3.2: Save a single survey response with validation and deduplication
   */
  async saveResponse(userId: string, responseDto: SurveyResponseDto) {
    // Get user's profile
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Validate question exists and is active
    const question = await this.prisma.surveyQuestion.findUnique({
      where: { id: responseDto.question_id },
      include: { survey: true },
    });

    if (!question || !question.is_active) {
      throw new NotFoundException('Question not found or inactive');
    }

    if (!question.survey.is_active) {
      throw new BadRequestException('Survey is not active');
    }

    // Check for existing response (deduplication)
    const existingResponse = await this.prisma.surveyResponse.findFirst({
      where: {
        profile_id: profile.id,
        question_id: responseDto.question_id,
        survey_id: question.survey_id,
      },
    });

    // Validate response format based on question type
    await this.validateResponseFormat(question, responseDto.response_value);

    // Validate response quality (completion time, etc.)
    this.validateResponseQuality(responseDto, question);

    const responseData = {
      profile_id: profile.id,
      question_id: responseDto.question_id,
      survey_id: question.survey_id,
      survey_version: question.survey.version,
      response_value: responseDto.response_value,
      response_text: responseDto.response_text,
      confidence_level: responseDto.confidence_level,
      completion_time: responseDto.completion_time,
    };

    if (existingResponse) {
      // Update existing response
      return await this.prisma.surveyResponse.update({
        where: { id: existingResponse.id },
        data: responseData,
        include: { question: true },
      });
    } else {
      // Create new response
      return await this.prisma.surveyResponse.create({
        data: responseData,
        include: { question: true },
      });
    }
  }

  /**
   * Task 3.1.3.2: Bulk save survey responses with efficient batch processing
   */
  async bulkSaveResponses(userId: string, bulkDto: BulkSurveyResponseDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    const results = [];
    const errors = [];

    // Process responses in transaction for consistency
    return await this.prisma.$transaction(async (prisma) => {
      for (const [index, responseDto] of bulkDto.responses.entries()) {
        try {
          const response = await this.saveResponse(userId, responseDto);
          results.push(response);
        } catch (error) {
          errors.push({
            index,
            question_id: responseDto.question_id,
            error: error.message,
          });
        }
      }

      return {
        success_count: results.length,
        error_count: errors.length,
        responses: results,
        errors,
        session_metadata: bulkDto.session_metadata,
      };
    });
  }

  /**
   * Task 3.1.3.2: Validate response compliance and quality
   */
  async validateResponseCompliance(responseDto: SurveyResponseDto) {
    const question = await this.prisma.surveyQuestion.findUnique({
      where: { id: responseDto.question_id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const validationResults = {
      is_valid: true,
      quality_score: 100,
      issues: [] as string[],
      warnings: [] as string[],
    };

    // Validate response format
    try {
      await this.validateResponseFormat(question, responseDto.response_value);
    } catch (error) {
      validationResults.is_valid = false;
      validationResults.issues.push(error.message);
      validationResults.quality_score -= 40;
    }

    // Validate response quality
    try {
      this.validateResponseQuality(responseDto, question);
    } catch (error) {
      validationResults.warnings.push(error.message);
      validationResults.quality_score -= 20;
    }

    return validationResults;
  }

  /**
   * Task 3.1.3.2: Get survey results for profile generation
   */
  async getSurveyResults(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    const activeSurvey = await this.getActiveSurveyWithQuestions();
    const responses = await this.getUserResponses(userId, activeSurvey.id);

    // Calculate completion status
    const totalQuestions = activeSurvey.questions.filter(q => q.required).length;
    const completedQuestions = responses.length;
    const isComplete = completedQuestions >= totalQuestions;

    // Group responses by category for analysis
    const responsesByCategory = responses.reduce((acc, response) => {
      const category = response.question.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(response);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate average confidence and completion time
    const avgConfidence = responses.length > 0 
      ? responses.reduce((sum, r) => sum + (r.confidence_level || 3), 0) / responses.length
      : 0;

    const avgCompletionTime = responses.length > 0
      ? responses.reduce((sum, r) => sum + r.completion_time, 0) / responses.length
      : 0;

    return {
      user_id: userId,
      profile_id: profile.id,
      survey_id: activeSurvey.id,
      survey_version: activeSurvey.version,
      is_complete: isComplete,
      completion_percentage: totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0,
      total_questions: totalQuestions,
      completed_questions: completedQuestions,
      responses: responses,
      responses_by_category: responsesByCategory,
      quality_metrics: {
        average_confidence: avgConfidence,
        average_completion_time: avgCompletionTime,
        response_quality_score: this.calculateOverallQualityScore(responses),
      },
      last_response_at: responses.length > 0 ? responses[responses.length - 1].responded_at : null,
    };
  }

  /**
   * Task 3.1.3.4: Private helper method to validate response format based on question type
   */
  private async validateResponseFormat(question: any, responseValue: any) {
    switch (question.type) {
      case 'LIKERT_SCALE':
        if (typeof responseValue !== 'number' || responseValue < 1 || responseValue > 7) {
          throw new BadRequestException('Likert scale responses must be numbers between 1 and 7');
        }
        break;

      case 'BINARY_CHOICE':
        if (typeof responseValue !== 'boolean') {
          throw new BadRequestException('Binary choice responses must be boolean values');
        }
        break;

      case 'MULTIPLE_CHOICE':
        const options = question.options as string[];
        if (!options || !options.includes(responseValue)) {
          throw new BadRequestException('Multiple choice response must be one of the provided options');
        }
        break;

      case 'RANKING':
        if (!Array.isArray(responseValue)) {
          throw new BadRequestException('Ranking responses must be arrays');
        }
        const expectedItems = question.options as string[];
        if (responseValue.length !== expectedItems.length || 
            !expectedItems.every(item => responseValue.includes(item))) {
          throw new BadRequestException('Ranking must include all options exactly once');
        }
        break;

      case 'SLIDER':
        const scale = question.scale as { min: number; max: number };
        if (typeof responseValue !== 'number' || 
            responseValue < scale.min || 
            responseValue > scale.max) {
          throw new BadRequestException(`Slider responses must be numbers between ${scale.min} and ${scale.max}`);
        }
        break;

      case 'TEXT_RESPONSE':
        if (typeof responseValue !== 'string' || responseValue.length > 1000) {
          throw new BadRequestException('Text responses must be strings with maximum 1000 characters');
        }
        break;

      default:
        throw new BadRequestException(`Unsupported question type: ${question.type}`);
    }
  }

  /**
   * Task 3.1.3.4: Private helper method to validate response quality
   */
  private validateResponseQuality(responseDto: SurveyResponseDto, question: any) {
    // Check for suspiciously fast completion
    const minimumTime = this.calculateMinimumResponseTime(question);
    if (responseDto.completion_time < minimumTime) {
      throw new BadRequestException(
        `Response completed too quickly (${responseDto.completion_time}ms < ${minimumTime}ms minimum)`
      );
    }

    // Check for suspiciously slow completion (possible distraction/disengagement)
    const maximumTime = minimumTime * 30; // 30x minimum is reasonable upper bound
    if (responseDto.completion_time > maximumTime) {
      // Warning only, not blocking
      console.warn(`Response took unusually long: ${responseDto.completion_time}ms for question ${question.id}`);
    }

    // Additional quality checks could be added here:
    // - Pattern detection for random responses
    // - Consistency checks with previous responses
    // - Confidence level validation
  }

  /**
   * Task 3.1.3.4: Calculate minimum reasonable response time based on question complexity
   */
  private calculateMinimumResponseTime(question: any): number {
    const baseTime = 2000; // 2 seconds minimum
    const questionLength = question.question.length;
    const complexityMultiplier = {
      'BINARY_CHOICE': 1,
      'LIKERT_SCALE': 1.2,
      'MULTIPLE_CHOICE': 1.5,
      'SLIDER': 1.3,
      'RANKING': 2,
      'TEXT_RESPONSE': 3,
    }[question.type] || 1;

    // Add time based on question length (reading time)
    const readingTime = Math.max(questionLength * 50, 1000); // ~50ms per character, min 1s
    
    return Math.floor(baseTime + readingTime * complexityMultiplier);
  }

  /**
   * Task 3.1.3.4: Calculate overall quality score for a set of responses
   */
  private calculateOverallQualityScore(responses: any[]): number {
    if (responses.length === 0) return 0;

    let totalScore = 0;
    
    for (const response of responses) {
      let responseScore = 100;

      // Deduct points for missing confidence level
      if (!response.confidence_level) {
        responseScore -= 10;
      }

      // Deduct points for extremely fast responses
      const question = response.question;
      const minTime = this.calculateMinimumResponseTime(question);
      if (response.completion_time < minTime) {
        responseScore -= 30;
      }

      // Deduct points for missing text in text response questions
      if (question.type === 'TEXT_RESPONSE' && (!response.response_text || response.response_text.length < 10)) {
        responseScore -= 20;
      }

      totalScore += Math.max(responseScore, 0);
    }

    return Math.round(totalScore / responses.length);
  }

  /**
   * Task 3.1.3.4: Delete a specific response
   */
  async deleteResponse(userId: string, responseId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    const response = await this.prisma.surveyResponse.findFirst({
      where: {
        id: responseId,
        profile_id: profile.id,
      },
    });

    if (!response) {
      throw new NotFoundException('Response not found or access denied');
    }

    return await this.prisma.surveyResponse.delete({
      where: { id: responseId },
    });
  }

  /**
   * Task 3.1.3.4: Update an existing response
   */
  async updateResponse(userId: string, responseId: string, responseDto: SurveyResponseDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    const existingResponse = await this.prisma.surveyResponse.findFirst({
      where: {
        id: responseId,
        profile_id: profile.id,
      },
      include: { question: true },
    });

    if (!existingResponse) {
      throw new NotFoundException('Response not found or access denied');
    }

    // Validate the new response
    await this.validateResponseFormat(existingResponse.question, responseDto.response_value);
    this.validateResponseQuality(responseDto, existingResponse.question);

    return await this.prisma.surveyResponse.update({
      where: { id: responseId },
      data: {
        response_value: responseDto.response_value,
        response_text: responseDto.response_text,
        confidence_level: responseDto.confidence_level,
        completion_time: responseDto.completion_time,
      },
      include: { question: true },
    });
  }

  /**
   * Task 3.1.3.4: Get response analytics for administrators
   */
  async getResponseAnalytics(surveyId?: string) {
    const whereClause = surveyId ? { survey_id: surveyId } : {};
    
    const totalResponses = await this.prisma.surveyResponse.count({
      where: whereClause,
    });

    const responsesByCategory = await this.prisma.surveyResponse.groupBy({
      by: ['question'],
      where: whereClause,
      _count: true,
    });

    const avgCompletionTime = await this.prisma.surveyResponse.aggregate({
      where: whereClause,
      _avg: {
        completion_time: true,
      },
    });

    const avgConfidence = await this.prisma.surveyResponse.aggregate({
      where: whereClause,
      _avg: {
        confidence_level: true,
      },
    });

    // Get completion rates by user
    const profilesWithResponses = await this.prisma.profile.findMany({
      where: {
        survey_responses: {
          some: whereClause,
        },
      },
      include: {
        survey_responses: {
          where: whereClause,
        },
        user: true,
      },
    });

    const completionRates = profilesWithResponses.map(profile => ({
      user_id: profile.user_id,
      username: profile.user.username,
      response_count: profile.survey_responses.length,
      completion_percentage: this.calculateCompletionPercentage(profile.survey_responses.length, surveyId),
    }));

    return {
      total_responses: totalResponses,
      avg_completion_time: avgCompletionTime._avg.completion_time || 0,
      avg_confidence: avgConfidence._avg.confidence_level || 0,
      completion_rates: completionRates,
      response_distribution: responsesByCategory,
    };
  }

  /**
   * Helper method to calculate completion percentage
   */
  private async calculateCompletionPercentage(responseCount: number, surveyId?: string): Promise<number> {
    const survey = surveyId 
      ? await this.prisma.survey.findUnique({
          where: { id: surveyId },
          include: { questions: { where: { is_active: true, required: true } } },
        })
      : await this.getActiveSurveyWithQuestions();

    if (!survey) return 0;

    const totalRequiredQuestions = survey.questions.filter(q => q.required).length;
    return totalRequiredQuestions > 0 ? (responseCount / totalRequiredQuestions) * 100 : 0;
  }
}


