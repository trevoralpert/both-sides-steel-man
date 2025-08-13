import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';

export enum EnrollmentSortBy {
  ENROLLED_AT = 'enrolled_at',
  UPDATED_AT = 'updated_at',
  STUDENT_NAME = 'student_name',
  CLASS_NAME = 'class_name',
  ENROLLMENT_STATUS = 'enrollment_status',
  FINAL_GRADE = 'final_grade',
  DAYS_ENROLLED = 'days_enrolled',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum EnrollmentStatusFilter {
  ALL = 'all',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  DROPPED_WITHDRAWN = 'dropped_withdrawn',
}

export class EnrollmentSearchDto {
  @ApiPropertyOptional({
    description: 'Search query for student name, username, email, or class name',
    example: 'Jane Smith Government',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by class ID',
    example: 'cm1ghi789jkl012mno',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Class ID must be a valid UUID' })
  class_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by student user ID',
    example: 'cm1abc123def456ghi',
  })
  @IsOptional()
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by teacher ID',
    example: 'cm1def456ghi789jkl',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Teacher ID must be a valid UUID' })
  teacher_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization ID',
    example: 'cm1xyz987abc654def',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  organization_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus, { message: 'Enrollment status must be valid' })
  enrollment_status?: EnrollmentStatus;

  @ApiPropertyOptional({
    description: 'Filter by status category',
    enum: EnrollmentStatusFilter,
    example: EnrollmentStatusFilter.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatusFilter, { message: 'Status filter must be valid' })
  status_filter?: EnrollmentStatusFilter;

  @ApiPropertyOptional({
    description: 'Filter by subject area',
    example: 'GOVERNMENT',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  subject?: string;

  @ApiPropertyOptional({
    description: 'Filter by grade level',
    example: '11',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  grade_level?: string;

  @ApiPropertyOptional({
    description: 'Filter by academic year',
    example: '2024-2025',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  academic_year?: string;

  @ApiPropertyOptional({
    description: 'Filter by academic term',
    example: 'FALL',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  term?: string;

  @ApiPropertyOptional({
    description: 'Filter enrollments from this date',
    example: '2024-08-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Enrolled from date must be a valid ISO date' })
  enrolled_from?: string;

  @ApiPropertyOptional({
    description: 'Filter enrollments to this date',
    example: '2024-08-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Enrolled to date must be a valid ISO date' })
  enrolled_to?: string;

  @ApiPropertyOptional({
    description: 'Filter completions from this date',
    example: '2024-12-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Completed from date must be a valid ISO date' })
  completed_from?: string;

  @ApiPropertyOptional({
    description: 'Filter completions to this date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Completed to date must be a valid ISO date' })
  completed_to?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum final grade',
    example: 'B',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  min_grade?: string;

  @ApiPropertyOptional({
    description: 'Filter by maximum final grade',
    example: 'A+',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  max_grade?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum days enrolled',
    example: 30,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  min_days_enrolled?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum days enrolled',
    example: 180,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  max_days_enrolled?: number;

  @ApiPropertyOptional({
    description: 'Include only students with completed profiles',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  profile_completed_only?: boolean;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: EnrollmentSortBy,
    example: EnrollmentSortBy.ENROLLED_AT,
    default: EnrollmentSortBy.ENROLLED_AT,
  })
  @IsOptional()
  @IsEnum(EnrollmentSortBy, { message: 'Sort by must be a valid field' })
  sort_by?: EnrollmentSortBy = EnrollmentSortBy.ENROLLED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.DESC,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'Sort order must be asc or desc' })
  sort_order?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Include student details in response',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_student?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include class details in response',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_class?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include student profile information',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_profile?: boolean = false;

  @ApiPropertyOptional({
    description: 'Return compact response format',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  compact?: boolean = false;
}

// DTO for enrollment analytics
export class EnrollmentAnalyticsDto {
  @ApiPropertyOptional({
    description: 'Organization ID to filter analytics',
    example: 'cm1xyz987abc654def',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  organization_id?: string;

  @ApiPropertyOptional({
    description: 'Class ID to filter analytics',
    example: 'cm1ghi789jkl012mno',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Class ID must be a valid UUID' })
  class_id?: string;

  @ApiPropertyOptional({
    description: 'Teacher ID to filter analytics',
    example: 'cm1def456ghi789jkl',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Teacher ID must be a valid UUID' })
  teacher_id?: string;

  @ApiPropertyOptional({
    description: 'Academic year to filter analytics',
    example: '2024-2025',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  academic_year?: string;

  @ApiPropertyOptional({
    description: 'Academic term to filter analytics',
    example: 'FALL',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  term?: string;

  @ApiPropertyOptional({
    description: 'Include detailed breakdown by status',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_status_breakdown?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include grade distribution analysis',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_grade_distribution?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include enrollment trends over time',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_trends?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include completion rate analysis',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_completion_rates?: boolean = true;
}

// DTO for roster export
export class RosterExportDto {
  @ApiProperty({
    description: 'Class ID to export roster for',
    example: 'cm1ghi789jkl012mno',
  })
  @IsUUID('4', { message: 'Class ID must be a valid UUID' })
  class_id: string;

  @ApiPropertyOptional({
    description: 'Export format',
    enum: ['csv', 'excel', 'pdf'],
    example: 'csv',
    default: 'csv',
  })
  @IsOptional()
  @IsString()
  export_format?: 'csv' | 'excel' | 'pdf' = 'csv';

  @ApiPropertyOptional({
    description: 'Include student contact information',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_contact_info?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include enrollment history',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_history?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include profile completion status',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_profile_status?: boolean = true;

  @ApiPropertyOptional({
    description: 'Filter by enrollment status for export',
    enum: EnrollmentStatus,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus, { message: 'Enrollment status must be valid' })
  status_filter?: EnrollmentStatus;
}
