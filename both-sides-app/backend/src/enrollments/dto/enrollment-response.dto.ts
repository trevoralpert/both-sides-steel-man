import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Expose, Transform } from 'class-transformer';
import { EnrollmentStatus } from '@prisma/client';

// Simple student info for enrollment responses
export class EnrollmentStudentDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'cm1abc123def456ghi',
  })
  @Expose()
  id: string;

  @ApiPropertyOptional({
    description: 'Student first name',
    example: 'Jane',
  })
  @Expose()
  first_name?: string;

  @ApiPropertyOptional({
    description: 'Student last name',
    example: 'Smith',
  })
  @Expose()
  last_name?: string;

  @ApiPropertyOptional({
    description: 'Student username',
    example: 'jsmith_student',
  })
  @Expose()
  username?: string;

  @ApiPropertyOptional({
    description: 'Student email',
    example: 'jane.smith@student.school.edu',
  })
  @Expose()
  email?: string;

  @ApiPropertyOptional({
    description: 'Student avatar URL',
    example: 'https://avatar.com/jsmith.jpg',
  })
  @Expose()
  avatar_url?: string;

  @ApiProperty({
    description: 'Full display name',
    example: 'Jane Smith',
  })
  @Expose()
  @Transform(({ obj }) => {
    const first = obj.first_name || '';
    const last = obj.last_name || '';
    const username = obj.username || '';
    return `${first} ${last}`.trim() || username || 'Unknown Student';
  })
  display_name: string;

  @ApiPropertyOptional({
    description: 'Whether student has completed profile',
    example: true,
  })
  @Expose()
  profile_completed?: boolean;
}

// Simple class info for enrollment responses
export class EnrollmentClassDto {
  @ApiProperty({
    description: 'Class ID',
    example: 'cm1ghi789jkl012mno',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Class name',
    example: 'AP Government & Politics',
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'Subject area',
    example: 'GOVERNMENT',
  })
  @Expose()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Grade level',
    example: '11',
  })
  @Expose()
  grade_level?: string;

  @ApiProperty({
    description: 'Academic year',
    example: '2024-2025',
  })
  @Expose()
  academic_year: string;

  @ApiPropertyOptional({
    description: 'Academic term',
    example: 'FALL',
  })
  @Expose()
  term?: string;

  @ApiProperty({
    description: 'Teacher name',
    example: 'Dr. Johnson',
  })
  @Expose()
  teacher_name: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Lincoln High School',
  })
  @Expose()
  organization_name: string;
}

// Main enrollment response DTO
export class EnrollmentResponseDto {
  @ApiProperty({
    description: 'Enrollment ID',
    example: 'cm1jkl012mno345pqr',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.ACTIVE,
  })
  @Expose()
  enrollment_status: EnrollmentStatus;

  @ApiProperty({
    description: 'Enrollment date',
    example: '2024-08-15T09:00:00.000Z',
  })
  @Expose()
  enrolled_at: Date;

  @ApiPropertyOptional({
    description: 'Completion date',
    example: '2024-12-15T16:00:00.000Z',
  })
  @Expose()
  completed_at?: Date;

  @ApiPropertyOptional({
    description: 'Drop date',
    example: '2024-10-15T14:00:00.000Z',
  })
  @Expose()
  dropped_at?: Date;

  @ApiPropertyOptional({
    description: 'Final grade',
    example: 'A-',
  })
  @Expose()
  final_grade?: string;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2024-08-15T09:00:00.000Z',
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Record last update timestamp',
    example: '2024-08-20T14:30:00.000Z',
  })
  @Expose()
  updated_at: Date;

  @ApiProperty({
    description: 'User ID',
    example: 'cm1abc123def456ghi',
  })
  @Expose()
  user_id: string;

  @ApiProperty({
    description: 'Class ID',
    example: 'cm1ghi789jkl012mno',
  })
  @Expose()
  class_id: string;

  @ApiProperty({
    description: 'Student information',
    type: EnrollmentStudentDto,
  })
  @Expose()
  @Type(() => EnrollmentStudentDto)
  student: EnrollmentStudentDto;

  @ApiProperty({
    description: 'Class information',
    type: EnrollmentClassDto,
  })
  @Expose()
  @Type(() => EnrollmentClassDto)
  class: EnrollmentClassDto;

  @ApiPropertyOptional({
    description: 'Days enrolled in class',
    example: 67,
  })
  @Expose()
  days_enrolled?: number;

  @ApiPropertyOptional({
    description: 'Whether enrollment is currently active',
    example: true,
  })
  @Expose()
  is_active: boolean;

  @ApiPropertyOptional({
    description: 'Status display text',
    example: 'Actively Enrolled',
  })
  @Expose()
  status_display: string;

  @ApiPropertyOptional({
    description: 'Progress percentage (for active enrollments)',
    example: 75.5,
  })
  @Expose()
  progress_percentage?: number;
}

// Compact enrollment response for lists
export class EnrollmentCompactResponseDto {
  @ApiProperty({
    description: 'Enrollment ID',
    example: 'cm1jkl012mno345pqr',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Student name',
    example: 'Jane Smith',
  })
  @Expose()
  student_name: string;

  @ApiProperty({
    description: 'Class name',
    example: 'AP Government & Politics',
  })
  @Expose()
  class_name: string;

  @ApiProperty({
    description: 'Enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.ACTIVE,
  })
  @Expose()
  enrollment_status: EnrollmentStatus;

  @ApiProperty({
    description: 'Enrollment date',
    example: '2024-08-15',
  })
  @Expose()
  enrolled_date: string;

  @ApiPropertyOptional({
    description: 'Final grade',
    example: 'A-',
  })
  @Expose()
  final_grade?: string;

  @ApiProperty({
    description: 'Days enrolled',
    example: 67,
  })
  @Expose()
  days_enrolled: number;

  @ApiProperty({
    description: 'Status display',
    example: 'Actively Enrolled',
  })
  @Expose()
  status_display: string;
}

// Paginated response DTO
export class PaginatedEnrollmentResponseDto {
  @ApiProperty({
    description: 'Array of enrollments',
    type: [EnrollmentResponseDto],
  })
  @Type(() => EnrollmentResponseDto)
  enrollments: EnrollmentResponseDto[];

  @ApiProperty({
    description: 'Total number of enrollments',
    example: 145,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of enrollments per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevPage: boolean;
}

// Enrollment statistics DTO
export class EnrollmentStatsDto {
  @ApiProperty({
    description: 'Total enrollments',
    example: 1250,
  })
  total_enrollments: number;

  @ApiProperty({
    description: 'Active enrollments',
    example: 980,
  })
  active_enrollments: number;

  @ApiProperty({
    description: 'Pending enrollments',
    example: 45,
  })
  pending_enrollments: number;

  @ApiProperty({
    description: 'Completed enrollments',
    example: 180,
  })
  completed_enrollments: number;

  @ApiProperty({
    description: 'Dropped enrollments',
    example: 35,
  })
  dropped_enrollments: number;

  @ApiProperty({
    description: 'Withdrawn enrollments',
    example: 10,
  })
  withdrawn_enrollments: number;

  @ApiProperty({
    description: 'Enrollment status breakdown',
    example: {
      PENDING: 45,
      ACTIVE: 980,
      COMPLETED: 180,
      DROPPED: 35,
      WITHDRAWN: 10,
    },
  })
  status_breakdown: Record<string, number>;

  @ApiProperty({
    description: 'Average enrollment duration in days',
    example: 128.5,
  })
  average_duration_days: number;

  @ApiProperty({
    description: 'Completion rate percentage',
    example: 85.7,
  })
  completion_rate: number;

  @ApiProperty({
    description: 'Drop rate percentage',
    example: 3.2,
  })
  drop_rate: number;
}

// Class roster response DTO
export class ClassRosterResponseDto {
  @ApiProperty({
    description: 'Class information',
    type: EnrollmentClassDto,
  })
  class: EnrollmentClassDto;

  @ApiProperty({
    description: 'Total enrolled students',
    example: 28,
  })
  total_enrolled: number;

  @ApiProperty({
    description: 'Active students',
    example: 26,
  })
  active_students: number;

  @ApiProperty({
    description: 'Class capacity',
    example: 30,
  })
  class_capacity: number;

  @ApiProperty({
    description: 'Available spots',
    example: 2,
  })
  available_spots: number;

  @ApiProperty({
    description: 'Enrollment percentage',
    example: 93.33,
  })
  enrollment_percentage: number;

  @ApiProperty({
    description: 'Student enrollments',
    type: [EnrollmentResponseDto],
  })
  @Type(() => EnrollmentResponseDto)
  enrollments: EnrollmentResponseDto[];

  @ApiProperty({
    description: 'Enrollment statistics',
    type: EnrollmentStatsDto,
  })
  @Type(() => EnrollmentStatsDto)
  statistics: EnrollmentStatsDto;
}
