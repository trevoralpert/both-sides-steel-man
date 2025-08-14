/**
 * Phase 3 Task 3.3.4: Completion Tracking Service
 * Service for tracking survey completion milestones and generating analytics
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { AuditService } from '../../common/services/audit.service';
import {
  RecordMilestoneDto,
  ClassCompletionAnalyticsDto,
  ClassCompletionStatsResponseDto,
  CreateNotificationDto,
  MilestoneResponseDto,
  NotificationResponseDto,
  CompletionAnalyticsFilterDto,
  BulkClassCompletionDto,
  MilestoneType,
  NotificationType,
  NotificationStatus
} from '../dto/completion-tracking.dto';

@Injectable()
export class CompletionTrackingService {
  private readonly logger = new Logger(CompletionTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Task 3.3.4.1: Record survey completion milestone
   */
  async recordMilestone(
    profileId: string,
    milestoneDto: RecordMilestoneDto
  ): Promise<MilestoneResponseDto> {
    try {
      // Check if this milestone already exists
      const existingMilestone = await this.prisma.surveyMilestone.findFirst({
        where: {
          profile_id: profileId,
          milestone_type: milestoneDto.milestone_type,
          section_name: milestoneDto.section_name || null,
        },
      });

      if (existingMilestone) {
        this.logger.warn(
          `Milestone ${milestoneDto.milestone_type} already exists for profile ${profileId}`
        );
        return this.mapMilestoneToResponse(existingMilestone);
      }

      // Create the milestone
      const milestone = await this.prisma.surveyMilestone.create({
        data: {
          profile_id: profileId,
          milestone_type: milestoneDto.milestone_type,
          section_name: milestoneDto.section_name,
          percentage: milestoneDto.percentage,
          quality_score: milestoneDto.quality_score,
          completion_time: milestoneDto.completion_time,
          metadata: milestoneDto.metadata || {},
        },
      });

      // Log audit event
      await this.audit.logActivity({
        entityType: 'survey_milestone',
        entityId: milestone.id,
        action: 'create',
        changes: milestoneDto,
        metadata: {
          profile_id: profileId,
          milestone_type: milestoneDto.milestone_type,
        },
      });

      // Trigger milestone celebration notification
      await this.createMilestoneNotification(profileId, milestone);

      // Update class completion stats if this is a significant milestone
      if (this.isSignificantMilestone(milestoneDto.milestone_type)) {
        await this.updateClassCompletionStats(profileId);
      }

      this.logger.log(
        `Recorded milestone ${milestoneDto.milestone_type} for profile ${profileId}`
      );

      return this.mapMilestoneToResponse(milestone);
    } catch (error) {
      this.logger.error(`Failed to record milestone: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to record milestone');
    }
  }

  /**
   * Task 3.3.4.1: Get milestones for a profile
   */
  async getProfileMilestones(profileId: string): Promise<MilestoneResponseDto[]> {
    const milestones = await this.prisma.surveyMilestone.findMany({
      where: { profile_id: profileId },
      orderBy: { achieved_at: 'asc' },
    });

    return milestones.map(this.mapMilestoneToResponse);
  }

  /**
   * Task 3.3.4.2: Get class completion analytics
   */
  async getClassCompletionAnalytics(
    analyticsDto: ClassCompletionAnalyticsDto
  ): Promise<ClassCompletionStatsResponseDto> {
    const cacheKey = `class_completion_${analyticsDto.class_id}_${analyticsDto.survey_id || 'all'}`;
    
    // Try to get from cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get class information
      const classInfo = await this.prisma.class.findUnique({
        where: { id: analyticsDto.class_id },
        include: {
          enrollments: {
            where: { enrollment_status: 'ACTIVE' },
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      });

      if (!classInfo) {
        throw new NotFoundException('Class not found');
      }

      const totalStudents = classInfo.enrollments.length;
      const studentsWithProfiles = classInfo.enrollments.filter(
        e => e.user.profile
      );

      // Calculate completion statistics
      const completionStats = await this.calculateClassCompletionStats(
        studentsWithProfiles.map(e => e.user.profile.id),
        analyticsDto.survey_id
      );

      // Get section completion if requested
      let sectionCompletion: Record<string, number> | undefined;
      if (analyticsDto.include_sections) {
        sectionCompletion = await this.calculateSectionCompletion(
          studentsWithProfiles.map(e => e.user.profile.id),
          analyticsDto.survey_id
        );
      }

      // Get student progress if requested
      let studentProgress: any[] | undefined;
      if (analyticsDto.include_students) {
        studentProgress = await this.getStudentProgressDetails(
          classInfo.enrollments,
          analyticsDto.survey_id
        );
      }

      const response: ClassCompletionStatsResponseDto = {
        class_info: {
          id: classInfo.id,
          name: classInfo.name,
          total_students: totalStudents,
        },
        completion_stats: completionStats,
        section_completion: sectionCompletion,
        student_progress: studentProgress,
        calculated_at: new Date(),
      };

      // Cache for 5 minutes
      await this.cache.set(cacheKey, response, 300);

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get class completion analytics: ${error.message}`,
        error.stack
      );
      throw new BadRequestException('Failed to get completion analytics');
    }
  }

  /**
   * Task 3.3.4.2: Get bulk completion stats for multiple classes
   */
  async getBulkClassCompletionStats(
    bulkDto: BulkClassCompletionDto
  ): Promise<ClassCompletionStatsResponseDto[]> {
    const results = await Promise.all(
      bulkDto.class_ids.map(classId =>
        this.getClassCompletionAnalytics({
          class_id: classId,
          survey_id: bulkDto.survey_id,
          include_sections: false,
          include_students: false,
        })
      )
    );

    return results;
  }

  /**
   * Task 3.3.4.3: Create completion notification
   */
  async createNotification(
    notificationDto: CreateNotificationDto
  ): Promise<NotificationResponseDto> {
    try {
      const notification = await this.prisma.completionNotification.create({
        data: {
          profile_id: notificationDto.profile_id,
          teacher_id: notificationDto.teacher_id,
          notification_type: notificationDto.notification_type,
          title: notificationDto.title,
          message: notificationDto.message,
          metadata: notificationDto.metadata || {},
          scheduled_for: notificationDto.scheduled_for || new Date(),
          expires_at: notificationDto.expires_at,
        },
      });

      // Log audit event
      await this.audit.logActivity({
        entityType: 'completion_notification',
        entityId: notification.id,
        action: 'create',
        changes: notificationDto,
      });

      this.logger.log(`Created notification ${notification.id}`);

      return this.mapNotificationToResponse(notification);
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create notification');
    }
  }

  /**
   * Task 3.3.4.3: Get notifications for a profile or teacher
   */
  async getNotifications(
    profileId?: string,
    teacherId?: string,
    status?: NotificationStatus
  ): Promise<NotificationResponseDto[]> {
    const where: any = {};
    
    if (profileId) where.profile_id = profileId;
    if (teacherId) where.teacher_id = teacherId;
    if (status) where.status = status;

    const notifications = await this.prisma.completionNotification.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return notifications.map(this.mapNotificationToResponse);
  }

  /**
   * Task 3.3.4.3: Send pending notifications
   */
  async processPendingNotifications(): Promise<void> {
    const pendingNotifications = await this.prisma.completionNotification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        scheduled_for: { lte: new Date() },
      },
    });

    for (const notification of pendingNotifications) {
      try {
        // Here you would integrate with your notification service (email, push, etc.)
        await this.sendNotification(notification);
        
        await this.prisma.completionNotification.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.SENT,
            sent_at: new Date(),
          },
        });

        this.logger.log(`Sent notification ${notification.id}`);
      } catch (error) {
        this.logger.error(`Failed to send notification ${notification.id}: ${error.message}`);
        
        await this.prisma.completionNotification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.FAILED },
        });
      }
    }
  }

  // Private helper methods

  private async calculateClassCompletionStats(
    profileIds: string[],
    surveyId?: string
  ): Promise<{
    students_started: number;
    students_completed: number;
    completion_rate: number;
    avg_completion_time?: number;
    avg_quality_score?: number;
  }> {
    if (profileIds.length === 0) {
      return {
        students_started: 0,
        students_completed: 0,
        completion_rate: 0,
      };
    }

    // Count students who started (have any responses)
    const studentsStarted = await this.prisma.profile.count({
      where: {
        id: { in: profileIds },
        survey_responses: {
          some: surveyId ? { survey_id: surveyId } : {},
        },
      },
    });

    // Count students who completed (profile marked as completed or have completion milestone)
    const studentsCompleted = await this.prisma.profile.count({
      where: {
        id: { in: profileIds },
        OR: [
          { is_completed: true },
          {
            survey_milestones: {
              some: { milestone_type: MilestoneType.SURVEY_COMPLETED },
            },
          },
        ],
      },
    });

    // Calculate average completion time and quality score
    const completionMilestones = await this.prisma.surveyMilestone.findMany({
      where: {
        profile_id: { in: profileIds },
        milestone_type: MilestoneType.SURVEY_COMPLETED,
        completion_time: { not: null },
      },
      select: {
        completion_time: true,
        quality_score: true,
      },
    });

    const avgCompletionTime = completionMilestones.length > 0
      ? completionMilestones
          .filter(m => m.completion_time !== null)
          .reduce((sum, m) => sum + m.completion_time, 0) / completionMilestones.length
      : undefined;

    const avgQualityScore = completionMilestones.length > 0
      ? completionMilestones
          .filter(m => m.quality_score !== null)
          .reduce((sum, m) => sum + m.quality_score, 0) / completionMilestones.length
      : undefined;

    return {
      students_started: studentsStarted,
      students_completed: studentsCompleted,
      completion_rate: profileIds.length > 0 ? (studentsCompleted / profileIds.length) * 100 : 0,
      avg_completion_time: avgCompletionTime ? avgCompletionTime / (1000 * 60 * 60) : undefined, // Convert to hours
      avg_quality_score: avgQualityScore,
    };
  }

  private async calculateSectionCompletion(
    profileIds: string[],
    surveyId?: string
  ): Promise<Record<string, number>> {
    const sectionMilestones = await this.prisma.surveyMilestone.findMany({
      where: {
        profile_id: { in: profileIds },
        milestone_type: MilestoneType.SECTION_COMPLETED,
        section_name: { not: null },
      },
      select: {
        section_name: true,
      },
    });

    const sectionCounts: Record<string, number> = {};
    for (const milestone of sectionMilestones) {
      if (milestone.section_name) {
        sectionCounts[milestone.section_name] = (sectionCounts[milestone.section_name] || 0) + 1;
      }
    }

    return sectionCounts;
  }

  private async getStudentProgressDetails(
    enrollments: any[],
    surveyId?: string
  ): Promise<any[]> {
    return await Promise.all(
      enrollments.map(async (enrollment) => {
        if (!enrollment.user.profile) {
          return {
            user_id: enrollment.user.id,
            name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
            progress_percentage: 0,
            completed_sections: 0,
            total_sections: 0,
            last_activity: enrollment.user.last_login_at,
            milestones_achieved: [],
          };
        }

        const progress = await this.getSurveyProgressSummary(enrollment.user.id);
        const milestones = await this.prisma.surveyMilestone.findMany({
          where: { profile_id: enrollment.user.profile.id },
          select: { milestone_type: true },
        });

        return {
          user_id: enrollment.user.id,
          name: `${enrollment.user.first_name} ${enrollment.user.last_name}`,
          progress_percentage: progress.progress_percentage,
          completed_sections: progress.sections_completed,
          total_sections: progress.total_sections,
          last_activity: enrollment.user.last_login_at,
          milestones_achieved: milestones.map(m => m.milestone_type),
        };
      })
    );
  }

  private async getSurveyProgressSummary(userId: string): Promise<any> {
    // Reuse the existing progress calculation from SurveysService
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
        total_sections: 0,
      };
    }

    const activeSurvey = await this.prisma.survey.findFirst({
      where: { is_active: true },
      include: {
        questions: {
          where: { is_active: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!activeSurvey) {
      return {
        completed_questions: 0,
        total_questions: 0,
        progress_percentage: 0,
        current_section: null,
        sections_completed: 0,
        total_sections: 0,
      };
    }

    const userResponses = await this.prisma.surveyResponse.findMany({
      where: {
        profile_id: profile.id,
        survey_id: activeSurvey.id,
      },
      orderBy: { responded_at: 'asc' },
    });

    const totalQuestions = activeSurvey.questions.length;
    const completedQuestions = userResponses.length;
    const progressPercentage = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;

    const sections = [...new Set(activeSurvey.questions.map(q => q.section))];
    const answeredQuestionIds = new Set(userResponses.map(r => r.question_id));
    const sectionsCompleted = sections.filter(section => {
      const sectionQuestions = activeSurvey.questions.filter(q => q.section === section);
      return sectionQuestions.every(q => answeredQuestionIds.has(q.id));
    }).length;

    return {
      completed_questions: completedQuestions,
      total_questions: totalQuestions,
      progress_percentage: progressPercentage,
      current_section: null,
      sections_completed: sectionsCompleted,
      total_sections: sections.length,
    };
  }

  private async updateClassCompletionStats(profileId: string): Promise<void> {
    // Find classes where this profile belongs
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        user: {
          profile: {
            id: profileId,
          },
        },
        enrollment_status: 'ACTIVE',
      },
      include: {
        class: true,
      },
    });

    for (const enrollment of enrollments) {
      // Invalidate cache for this class
      const cacheKey = `class_completion_${enrollment.class.id}_all`;
      await this.cache.del(cacheKey);
    }
  }

  private async createMilestoneNotification(
    profileId: string,
    milestone: any
  ): Promise<void> {
    const celebrationMessages = {
      [MilestoneType.SURVEY_STARTED]: {
        title: '🎉 Welcome to Both Sides!',
        message: 'Great job starting your belief mapping survey! Your journey to understanding different perspectives begins now.',
      },
      [MilestoneType.MILESTONE_25_PERCENT]: {
        title: '🌟 25% Complete!',
        message: 'You\'re making great progress! Keep going to unlock your complete belief profile.',
      },
      [MilestoneType.MILESTONE_50_PERCENT]: {
        title: '🔥 Halfway There!',
        message: 'Amazing! You\'re 50% done with your survey. Your belief profile is taking shape!',
      },
      [MilestoneType.MILESTONE_75_PERCENT]: {
        title: '🚀 75% Complete!',
        message: 'You\'re almost finished! Just a few more questions to complete your belief profile.',
      },
      [MilestoneType.SURVEY_COMPLETED]: {
        title: '🎊 Survey Complete!',
        message: 'Congratulations! You\'ve completed your belief mapping survey. Your profile is being generated.',
      },
      [MilestoneType.PROFILE_GENERATED]: {
        title: '✨ Profile Ready!',
        message: 'Your belief profile has been generated! Review it and confirm to start finding debate partners.',
      },
    };

    const messageData = celebrationMessages[milestone.milestone_type];
    if (messageData) {
      await this.createNotification({
        profile_id: profileId,
        notification_type: NotificationType.COMPLETION_CELEBRATION,
        title: messageData.title,
        message: messageData.message,
        metadata: {
          milestone_type: milestone.milestone_type,
          milestone_id: milestone.id,
        },
      });
    }
  }

  private async sendNotification(notification: any): Promise<void> {
    // This is where you would integrate with your actual notification service
    // For now, we'll just log it
    this.logger.log(`Sending notification: ${notification.title} - ${notification.message}`);
    
    // In a real implementation, you might:
    // - Send email notifications
    // - Send push notifications
    // - Send in-app notifications
    // - Integration with services like SendGrid, Firebase, etc.
  }

  private isSignificantMilestone(type: MilestoneType): boolean {
    return [
      MilestoneType.MILESTONE_25_PERCENT,
      MilestoneType.MILESTONE_50_PERCENT,
      MilestoneType.MILESTONE_75_PERCENT,
      MilestoneType.SURVEY_COMPLETED,
      MilestoneType.PROFILE_GENERATED,
    ].includes(type);
  }

  private mapMilestoneToResponse(milestone: any): MilestoneResponseDto {
    return {
      id: milestone.id,
      profile_id: milestone.profile_id,
      milestone_type: milestone.milestone_type,
      achieved_at: milestone.achieved_at,
      section_name: milestone.section_name,
      percentage: milestone.percentage,
      quality_score: milestone.quality_score,
      completion_time: milestone.completion_time,
      metadata: milestone.metadata,
    };
  }

  private mapNotificationToResponse(notification: any): NotificationResponseDto {
    return {
      id: notification.id,
      profile_id: notification.profile_id,
      teacher_id: notification.teacher_id,
      notification_type: notification.notification_type,
      status: notification.status,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      scheduled_for: notification.scheduled_for,
      sent_at: notification.sent_at,
      delivered_at: notification.delivered_at,
      expires_at: notification.expires_at,
      created_at: notification.created_at,
      updated_at: notification.updated_at,
    };
  }
}
