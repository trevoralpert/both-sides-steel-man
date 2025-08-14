/**
 * Phase 3 Task 3.3.4.3: Completion Scheduler Service
 * Scheduled tasks for completion notifications and re-engagement campaigns
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CompletionTrackingService } from './completion-tracking.service';
import {
  NotificationType,
  NotificationStatus,
  MilestoneType,
} from '../dto/completion-tracking.dto';

@Injectable()
export class CompletionSchedulerService {
  private readonly logger = new Logger(CompletionSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly completionTrackingService: CompletionTrackingService,
  ) {}

  /**
   * Process pending notifications every 15 minutes
   */
  @Cron(CronExpression.EVERY_15_MINUTES)
  async processPendingNotifications(): Promise<void> {
    this.logger.log('Processing pending completion notifications...');
    
    try {
      await this.completionTrackingService.processPendingNotifications();
      this.logger.log('Completed processing pending notifications');
    } catch (error) {
      this.logger.error(`Error processing pending notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * Send progress reminders daily at 9 AM
   */
  @Cron('0 9 * * *') // Every day at 9:00 AM
  async sendProgressReminders(): Promise<void> {
    this.logger.log('Sending daily progress reminders...');
    
    try {
      // Find profiles that haven't been active in 2+ days but have started the survey
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const inactiveProfiles = await this.prisma.profile.findMany({
        where: {
          is_completed: false,
          last_updated: {
            lt: twoDaysAgo,
          },
          // Has some responses (started survey)
          survey_responses: {
            some: {},
          },
          // Don't spam - only if no reminder sent in last 24 hours
          completion_notifications: {
            none: {
              notification_type: NotificationType.PROGRESS_REMINDER,
              created_at: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          },
        },
        include: {
          user: true,
          survey_responses: true,
        },
      });

      for (const profile of inactiveProfiles) {
        await this.sendProgressReminder(profile);
      }

      this.logger.log(`Sent progress reminders to ${inactiveProfiles.length} users`);
    } catch (error) {
      this.logger.error(`Error sending progress reminders: ${error.message}`, error.stack);
    }
  }

  /**
   * Send teacher notifications about class progress every Monday at 8 AM
   */
  @Cron('0 8 * * 1') // Every Monday at 8:00 AM
  async sendTeacherProgressNotifications(): Promise<void> {
    this.logger.log('Sending weekly teacher progress notifications...');
    
    try {
      // Get all active teachers with classes
      const teachers = await this.prisma.user.findMany({
        where: {
          role: 'TEACHER',
          is_active: true,
          created_classes: {
            some: {
              is_active: true,
            },
          },
        },
        include: {
          created_classes: {
            where: { is_active: true },
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
          },
        },
      });

      for (const teacher of teachers) {
        await this.sendTeacherProgressSummary(teacher);
      }

      this.logger.log(`Sent teacher notifications to ${teachers.length} teachers`);
    } catch (error) {
      this.logger.error(`Error sending teacher notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * Re-engagement campaign for users who haven't completed after 1 week
   */
  @Cron('0 10 * * 3') // Every Wednesday at 10:00 AM
  async sendReEngagementCampaign(): Promise<void> {
    this.logger.log('Running re-engagement campaign...');
    
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Find profiles that started but haven't completed in over a week
      const staleProfiles = await this.prisma.profile.findMany({
        where: {
          is_completed: false,
          created_at: {
            lt: oneWeekAgo,
          },
          // Has some progress
          survey_responses: {
            some: {},
          },
          // Don't re-engage too often
          completion_notifications: {
            none: {
              notification_type: NotificationType.RE_ENGAGEMENT,
              created_at: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              },
            },
          },
        },
        include: {
          user: true,
          survey_responses: true,
        },
      });

      for (const profile of staleProfiles) {
        await this.sendReEngagementNotification(profile);
      }

      this.logger.log(`Sent re-engagement notifications to ${staleProfiles.length} users`);
    } catch (error) {
      this.logger.error(`Error in re-engagement campaign: ${error.message}`, error.stack);
    }
  }

  /**
   * Follow-up survey for completed profiles (1 week after completion)
   */
  @Cron('0 11 * * 2') // Every Tuesday at 11:00 AM
  async sendFollowUpSurveys(): Promise<void> {
    this.logger.log('Sending follow-up surveys to completed profiles...');
    
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Find profiles completed about a week ago
      const completedProfiles = await this.prisma.profile.findMany({
        where: {
          is_completed: true,
          completion_date: {
            gte: twoWeeksAgo,
            lt: oneWeekAgo,
          },
          // Haven't sent follow-up yet
          completion_notifications: {
            none: {
              notification_type: NotificationType.FOLLOW_UP_SURVEY,
            },
          },
        },
        include: {
          user: true,
        },
      });

      for (const profile of completedProfiles) {
        await this.sendFollowUpSurvey(profile);
      }

      this.logger.log(`Sent follow-up surveys to ${completedProfiles.length} users`);
    } catch (error) {
      this.logger.error(`Error sending follow-up surveys: ${error.message}`, error.stack);
    }
  }

  /**
   * Clean up expired notifications daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredNotifications(): Promise<void> {
    this.logger.log('Cleaning up expired notifications...');
    
    try {
      const result = await this.prisma.completionNotification.updateMany({
        where: {
          status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
          expires_at: {
            lt: new Date(),
          },
        },
        data: {
          status: NotificationStatus.EXPIRED,
        },
      });

      this.logger.log(`Marked ${result.count} notifications as expired`);
    } catch (error) {
      this.logger.error(`Error cleaning up notifications: ${error.message}`, error.stack);
    }
  }

  // Private helper methods

  private async sendProgressReminder(profile: any): Promise<void> {
    const responseCount = profile.survey_responses.length;
    
    // Calculate approximate progress percentage
    const totalQuestions = await this.getActiveSurveyQuestionCount();
    const progressPercentage = totalQuestions > 0 ? Math.round((responseCount / totalQuestions) * 100) : 0;

    const messages = {
      low: {
        title: '📚 Continue Your Belief Profile',
        message: `You've answered ${responseCount} questions (${progressPercentage}% complete). Continue building your profile to unlock debate matching!`,
      },
      medium: {
        title: '⚡ You\'re Making Progress!',
        message: `You're ${progressPercentage}% done with your survey. Just a bit more to complete your belief profile and start debating!`,
      },
      high: {
        title: '🎯 Almost There!',
        message: `You're so close! Complete the remaining ${Math.max(0, totalQuestions - responseCount)} questions to finish your profile.`,
      },
    };

    let messageType = 'low';
    if (progressPercentage >= 70) messageType = 'high';
    else if (progressPercentage >= 30) messageType = 'medium';

    const messageData = messages[messageType];

    await this.completionTrackingService.createNotification({
      profile_id: profile.id,
      notification_type: NotificationType.PROGRESS_REMINDER,
      title: messageData.title,
      message: messageData.message,
      metadata: {
        progress_percentage: progressPercentage,
        responses_count: responseCount,
        total_questions: totalQuestions,
      },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
    });
  }

  private async sendTeacherProgressSummary(teacher: any): Promise<void> {
    const classStats = [];
    let totalStudents = 0;
    let totalCompleted = 0;

    for (const classData of teacher.created_classes) {
      const studentsWithProfiles = classData.enrollments.filter(e => e.user.profile);
      const completedStudents = studentsWithProfiles.filter(e => e.user.profile.is_completed);
      
      classStats.push({
        class_name: classData.name,
        total_students: studentsWithProfiles.length,
        completed_students: completedStudents.length,
        completion_rate: studentsWithProfiles.length > 0 
          ? Math.round((completedStudents.length / studentsWithProfiles.length) * 100)
          : 0,
      });

      totalStudents += studentsWithProfiles.length;
      totalCompleted += completedStudents.length;
    }

    const overallCompletionRate = totalStudents > 0 ? Math.round((totalCompleted / totalStudents) * 100) : 0;

    const summary = classStats.map(stat => 
      `• ${stat.class_name}: ${stat.completed_students}/${stat.total_students} (${stat.completion_rate}%)`
    ).join('\n');

    await this.completionTrackingService.createNotification({
      teacher_id: teacher.id,
      notification_type: NotificationType.TEACHER_NOTIFICATION,
      title: '📊 Weekly Class Progress Summary',
      message: `Here's your weekly survey completion update:\n\n${summary}\n\nOverall: ${totalCompleted}/${totalStudents} students completed (${overallCompletionRate}%)`,
      metadata: {
        class_stats: classStats,
        total_students: totalStudents,
        total_completed: totalCompleted,
        overall_completion_rate: overallCompletionRate,
      },
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Expires in 14 days
    });
  }

  private async sendReEngagementNotification(profile: any): Promise<void> {
    const responseCount = profile.survey_responses.length;
    const totalQuestions = await this.getActiveSurveyQuestionCount();
    const progressPercentage = totalQuestions > 0 ? Math.round((responseCount / totalQuestions) * 100) : 0;

    const messages = [
      {
        title: '🔄 Your Belief Profile is Waiting',
        message: `Don't let your progress go to waste! You've completed ${progressPercentage}% of your survey. Finish it to discover your unique perspective and find great debate partners.`,
      },
      {
        title: '🌟 Unlock Your Debate Potential',
        message: `You started something important - understanding your own beliefs! Complete your remaining ${Math.max(0, totalQuestions - responseCount)} questions and join thought-provoking discussions.`,
      },
      {
        title: '💡 Your Voice Matters in Debates',
        message: `The Both Sides community needs diverse perspectives like yours! Finish your ${progressPercentage}% completed profile and contribute to meaningful conversations.`,
      },
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    await this.completionTrackingService.createNotification({
      profile_id: profile.id,
      notification_type: NotificationType.RE_ENGAGEMENT,
      title: randomMessage.title,
      message: randomMessage.message,
      metadata: {
        progress_percentage: progressPercentage,
        responses_count: responseCount,
        total_questions: totalQuestions,
        days_since_creation: Math.floor((Date.now() - profile.created_at.getTime()) / (1000 * 60 * 60 * 24)),
      },
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Expires in 14 days
    });
  }

  private async sendFollowUpSurvey(profile: any): Promise<void> {
    await this.completionTrackingService.createNotification({
      profile_id: profile.id,
      notification_type: NotificationType.FOLLOW_UP_SURVEY,
      title: '🎊 How was your Both Sides experience?',
      message: 'Congratulations on completing your belief profile! We\'d love your feedback on the onboarding experience. Your insights help us improve for future students.',
      metadata: {
        completion_date: profile.completion_date,
        days_since_completion: Math.floor((Date.now() - profile.completion_date.getTime()) / (1000 * 60 * 60 * 24)),
        survey_type: 'experience_feedback',
      },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
    });
  }

  private async getActiveSurveyQuestionCount(): Promise<number> {
    const activeSurvey = await this.prisma.survey.findFirst({
      where: { is_active: true },
      include: {
        questions: {
          where: { is_active: true },
        },
      },
    });

    return activeSurvey?.questions.length || 0;
  }
}
