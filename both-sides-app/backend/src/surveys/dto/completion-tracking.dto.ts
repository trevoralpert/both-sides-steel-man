/**
 * Phase 3 Task 3.3.4: Completion Tracking DTOs
 * Data Transfer Objects for onboarding completion tracking and analytics
 */

import { 
  IsUUID, 
  IsEnum, 
  IsOptional, 
  IsInt, 
  IsNumber,
  IsString,
  Min, 
  Max,
  IsDate,
  ValidateNested,
  IsArray,
  IsBoolean
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MilestoneType {
  SURVEY_STARTED = 'SURVEY_STARTED',
  SECTION_COMPLETED = 'SECTION_COMPLETED',
  MILESTONE_25_PERCENT = 'MILESTONE_25_PERCENT',
  MILESTONE_50_PERCENT = 'MILESTONE_50_PERCENT', 
  MILESTONE_75_PERCENT = 'MILESTONE_75_PERCENT',
  SURVEY_COMPLETED = 'SURVEY_COMPLETED',
  PROFILE_GENERATED = 'PROFILE_GENERATED',
  PROFILE_CONFIRMED = 'PROFILE_CONFIRMED'
}

export enum NotificationType {
  COMPLETION_CELEBRATION = 'COMPLETION_CELEBRATION',
  PROGRESS_REMINDER = 'PROGRESS_REMINDER',
  TEACHER_NOTIFICATION = 'TEACHER_NOTIFICATION',
  FOLLOW_UP_SURVEY = 'FOLLOW_UP_SURVEY',
  RE_ENGAGEMENT = 'RE_ENGAGEMENT'
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED'
}

// DTO for recording milestone achievements
export class RecordMilestoneDto {
  @ApiProperty({ 
    description: 'Type of milestone achieved',
    enum: MilestoneType
  })
  @IsEnum(MilestoneType)
  milestone_type: MilestoneType;

  @ApiPropertyOptional({ description: 'Section name for section completion milestones' })
  @IsOptional()
  @IsString()
  section_name?: string;

  @ApiPropertyOptional({ description: 'Percentage for percentage milestones', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({ description: 'Quality score at milestone', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  quality_score?: number;

  @ApiPropertyOptional({ description: 'Time to reach milestone in milliseconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  completion_time?: number;

  @ApiPropertyOptional({ description: 'Additional milestone metadata' })
  @IsOptional()
  metadata?: any;
}

// DTO for class completion analytics
export class ClassCompletionAnalyticsDto {
  @ApiProperty({ description: 'Class ID to get analytics for' })
  @IsUUID()
  class_id: string;

  @ApiPropertyOptional({ description: 'Survey ID to filter by' })
  @IsOptional()
  @IsUUID()  
  survey_id?: string;

  @ApiPropertyOptional({ description: 'Include section-level breakdown' })
  @IsOptional()
  @IsBoolean()
  include_sections?: boolean;

  @ApiPropertyOptional({ description: 'Include student-level details' })
  @IsOptional()
  @IsBoolean()
  include_students?: boolean;
}

// Response DTO for class completion statistics
export class ClassCompletionStatsResponseDto {
  @ApiProperty({ description: 'Class information' })
  class_info: {
    id: string;
    name: string;
    total_students: number;
  };

  @ApiProperty({ description: 'Completion statistics' })
  completion_stats: {
    students_started: number;
    students_completed: number;
    completion_rate: number;
    avg_completion_time?: number;
    avg_quality_score?: number;
  };

  @ApiPropertyOptional({ description: 'Section-level completion breakdown' })
  section_completion?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Individual student progress details' })
  student_progress?: Array<{
    user_id: string;
    name: string;
    progress_percentage: number;
    completed_sections: number;
    total_sections: number;
    last_activity: Date;
    milestones_achieved: MilestoneType[];
  }>;

  @ApiProperty({ description: 'When statistics were last calculated' })
  calculated_at: Date;
}

// DTO for creating completion notifications
export class CreateNotificationDto {
  @ApiPropertyOptional({ description: 'Profile ID for student notifications' })
  @IsOptional()
  @IsUUID()
  profile_id?: string;

  @ApiPropertyOptional({ description: 'Teacher ID for teacher notifications' })
  @IsOptional()
  @IsUUID()
  teacher_id?: string;

  @ApiProperty({ 
    description: 'Type of notification',
    enum: NotificationType
  })
  @IsEnum(NotificationType)
  notification_type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Additional notification metadata' })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ description: 'When to send the notification' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduled_for?: Date;

  @ApiPropertyOptional({ description: 'When the notification expires' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expires_at?: Date;
}

// Response DTO for milestone achievements
export class MilestoneResponseDto {
  @ApiProperty({ description: 'Milestone ID' })
  id: string;

  @ApiProperty({ description: 'Profile ID' })
  profile_id: string;

  @ApiProperty({ 
    description: 'Milestone type',
    enum: MilestoneType
  })
  milestone_type: MilestoneType;

  @ApiProperty({ description: 'When milestone was achieved' })
  achieved_at: Date;

  @ApiPropertyOptional({ description: 'Section name for section milestones' })
  section_name?: string;

  @ApiPropertyOptional({ description: 'Percentage for percentage milestones' })
  percentage?: number;

  @ApiPropertyOptional({ description: 'Quality score at milestone' })
  quality_score?: number;

  @ApiPropertyOptional({ description: 'Time to reach milestone' })
  completion_time?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;
}

// DTO for completion analytics filters
export class CompletionAnalyticsFilterDto {
  @ApiPropertyOptional({ description: 'Filter by date range - start date' })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  start_date?: Date;

  @ApiPropertyOptional({ description: 'Filter by date range - end date' })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  end_date?: Date;

  @ApiPropertyOptional({ description: 'Filter by completion status' })
  @IsOptional()
  @IsBoolean()
  completed_only?: boolean;

  @ApiPropertyOptional({ description: 'Minimum completion percentage filter' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  min_completion_percentage?: number;
}

// Response DTO for notification
export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Profile ID for student notifications' })
  profile_id?: string;

  @ApiPropertyOptional({ description: 'Teacher ID for teacher notifications' })
  teacher_id?: string;

  @ApiProperty({ 
    description: 'Notification type',
    enum: NotificationType
  })
  notification_type: NotificationType;

  @ApiProperty({ 
    description: 'Notification status',
    enum: NotificationStatus
  })
  status: NotificationStatus;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification message' })
  message: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;

  @ApiPropertyOptional({ description: 'When notification is scheduled' })
  scheduled_for?: Date;

  @ApiPropertyOptional({ description: 'When notification was sent' })
  sent_at?: Date;

  @ApiPropertyOptional({ description: 'When notification was delivered' })
  delivered_at?: Date;

  @ApiPropertyOptional({ description: 'When notification expires' })
  expires_at?: Date;

  @ApiProperty({ description: 'When notification was created' })
  created_at: Date;

  @ApiProperty({ description: 'When notification was last updated' })
  updated_at: Date;
}

// Bulk completion stats DTO for multiple classes
export class BulkClassCompletionDto {
  @ApiProperty({ description: 'Array of class IDs to get completion stats for' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  class_ids: string[];

  @ApiPropertyOptional({ description: 'Survey ID to filter by' })
  @IsOptional()
  @IsUUID()
  survey_id?: string;
}
