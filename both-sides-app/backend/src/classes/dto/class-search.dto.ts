import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { AcademicTerm, GradeLevel, Subject } from './create-class.dto';

export enum ClassSortBy {
  NAME = 'name',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  ACADEMIC_YEAR = 'academic_year',
  ENROLLMENT_COUNT = 'enrollment_count',
  ENROLLMENT_PERCENTAGE = 'enrollment_percentage',
  TEACHER_NAME = 'teacher_name',
  ORGANIZATION_NAME = 'organization_name',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum EnrollmentFilter {
  ALL = 'all',
  AVAILABLE = 'available',
  FULL = 'full',
  NEAR_CAPACITY = 'near_capacity',
  LOW_ENROLLMENT = 'low_enrollment',
}

export class ClassSearchDto {
  @ApiPropertyOptional({
    description: 'Search query for class name, description, or teacher name',
    example: 'Government Politics',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization ID',
    example: 'cm1def456ghi789jkl',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  organization_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by teacher ID',
    example: 'cm1abc123def456ghi',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Teacher ID must be a valid UUID' })
  teacher_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by subject',
    enum: Subject,
    example: Subject.GOVERNMENT,
  })
  @IsOptional()
  @IsEnum(Subject, { message: 'Subject must be a valid subject area' })
  subject?: Subject;

  @ApiPropertyOptional({
    description: 'Filter by grade level',
    enum: GradeLevel,
    example: GradeLevel.ELEVENTH,
  })
  @IsOptional()
  @IsEnum(GradeLevel, { message: 'Grade level must be valid' })
  grade_level?: GradeLevel;

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
    enum: AcademicTerm,
    example: AcademicTerm.FALL,
  })
  @IsOptional()
  @IsEnum(AcademicTerm, { message: 'Term must be a valid academic term' })
  term?: AcademicTerm;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by enrollment status',
    enum: EnrollmentFilter,
    example: EnrollmentFilter.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(EnrollmentFilter, { message: 'Enrollment filter must be valid' })
  enrollment_filter?: EnrollmentFilter;

  @ApiPropertyOptional({
    description: 'Minimum enrollment count',
    example: 5,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  min_enrollment?: number;

  @ApiPropertyOptional({
    description: 'Maximum enrollment count',
    example: 25,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  max_enrollment?: number;

  @ApiPropertyOptional({
    description: 'Minimum class capacity',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  min_capacity?: number;

  @ApiPropertyOptional({
    description: 'Maximum class capacity',
    example: 40,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  max_capacity?: number;

  @ApiPropertyOptional({
    description: 'Filter by creation date (from)',
    example: '2024-08-01T00:00:00Z',
  })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  created_from?: Date;

  @ApiPropertyOptional({
    description: 'Filter by creation date (to)',
    example: '2024-08-31T23:59:59Z',
  })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  created_to?: Date;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ClassSortBy,
    example: ClassSortBy.NAME,
    default: ClassSortBy.NAME,
  })
  @IsOptional()
  @IsEnum(ClassSortBy, { message: 'Sort by must be a valid field' })
  sort_by?: ClassSortBy = ClassSortBy.NAME;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.ASC,
    default: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'Sort order must be asc or desc' })
  sort_order?: SortOrder = SortOrder.ASC;

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
    description: 'Include enrollment details in response',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_enrollment?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include teacher details in response',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_teacher?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include organization details in response',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_organization?: boolean = true;

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

// DTO for bulk class operations
export class BulkClassActionDto {
  @ApiProperty({
    description: 'Array of class IDs to process',
    example: ['cm1abc123def456ghi', 'cm1def456ghi789jkl'],
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'All class IDs must be valid UUIDs' })
  class_ids: string[];

  @ApiProperty({
    description: 'Action to perform',
    enum: ['activate', 'deactivate', 'archive', 'delete'],
    example: 'activate',
  })
  @IsEnum(['activate', 'deactivate', 'archive', 'delete'], {
    message: 'Action must be one of: activate, deactivate, archive, delete',
  })
  action: 'activate' | 'deactivate' | 'archive' | 'delete';

  @ApiPropertyOptional({
    description: 'Reason for bulk action',
    example: 'End of semester cleanup',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  reason?: string;
}

// DTO for class analytics/statistics
export class ClassAnalyticsDto {
  @ApiPropertyOptional({
    description: 'Organization ID to filter analytics',
    example: 'cm1def456ghi789jkl',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  organization_id?: string;

  @ApiPropertyOptional({
    description: 'Teacher ID to filter analytics',
    example: 'cm1abc123def456ghi',
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
    enum: AcademicTerm,
    example: AcademicTerm.FALL,
  })
  @IsOptional()
  @IsEnum(AcademicTerm, { message: 'Term must be a valid academic term' })
  term?: AcademicTerm;

  @ApiPropertyOptional({
    description: 'Include detailed breakdown by subject',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_subject_breakdown?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include detailed breakdown by grade level',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_grade_breakdown?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include enrollment trends over time',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_trends?: boolean = false;
}
