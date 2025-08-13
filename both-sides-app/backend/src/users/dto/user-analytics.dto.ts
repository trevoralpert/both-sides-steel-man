import { IsOptional, IsString, IsDateString, IsEnum, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UserAnalyticsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  groupBy?: string = 'daily';

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsEnum(['STUDENT', 'TEACHER', 'ADMIN'])
  role?: string;
}

export class UserEngagementDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  days?: number = 30;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsEnum(['login_frequency', 'profile_completion', 'debate_participation', 'class_activity'])
  metric?: string;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  usersByRole: {
    students: number;
    teachers: number;
    admins: number;
  };
  usersByStatus: {
    active: number;
    inactive: number;
    suspended: number;
  };
  recentRegistrations: number;
  profileCompletionRate: number;
  engagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageLoginFrequency: number;
  };
}

export interface UserEngagementMetrics {
  userId: string;
  userName: string;
  loginFrequency: number;
  lastLoginAt: Date | null;
  profileCompleteness: number;
  debateParticipation: number;
  classActivity: number;
  engagementScore: number;
}
