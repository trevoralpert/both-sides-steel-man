import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Expose, Transform } from 'class-transformer';
import { AcademicTerm, GradeLevel, Subject, ClassCapacityDto } from './create-class.dto';

// Simple user info for class responses
export class ClassTeacherDto {
  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm1abc123def456ghi',
  })
  @Expose()
  id: string;

  @ApiPropertyOptional({
    description: 'Teacher first name',
    example: 'John',
  })
  @Expose()
  first_name?: string;

  @ApiPropertyOptional({
    description: 'Teacher last name',
    example: 'Doe',
  })
  @Expose()
  last_name?: string;

  @ApiPropertyOptional({
    description: 'Teacher username',
    example: 'jdoe',
  })
  @Expose()
  username?: string;

  @ApiPropertyOptional({
    description: 'Teacher email',
    example: 'john.doe@school.edu',
  })
  @Expose()
  email?: string;

  @ApiPropertyOptional({
    description: 'Teacher avatar URL',
    example: 'https://avatar.com/jdoe.jpg',
  })
  @Expose()
  avatar_url?: string;

  @ApiProperty({
    description: 'Full display name',
    example: 'John Doe',
  })
  @Expose()
  @Transform(({ obj }) => {
    const first = obj.first_name || '';
    const last = obj.last_name || '';
    const username = obj.username || '';
    return `${first} ${last}`.trim() || username || 'Unknown Teacher';
  })
  display_name: string;
}

// Simple organization info for class responses
export class ClassOrganizationDto {
  @ApiProperty({
    description: 'Organization ID',
    example: 'cm1def456ghi789jkl',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Lincoln High School',
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'Organization slug',
    example: 'lincoln-high-school',
  })
  @Expose()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Organization type',
    example: 'SCHOOL',
  })
  @Expose()
  type?: string;
}

// Enrollment summary for class responses
export class ClassEnrollmentSummaryDto {
  @ApiProperty({
    description: 'Current enrollment count',
    example: 23,
  })
  @Expose()
  current_count: number;

  @ApiProperty({
    description: 'Maximum students allowed',
    example: 30,
  })
  @Expose()
  max_students: number;

  @ApiProperty({
    description: 'Available spots',
    example: 7,
  })
  @Expose()
  available_spots: number;

  @ApiProperty({
    description: 'Enrollment percentage',
    example: 76.67,
  })
  @Expose()
  enrollment_percentage: number;

  @ApiProperty({
    description: 'Whether the class is full',
    example: false,
  })
  @Expose()
  is_full: boolean;

  @ApiProperty({
    description: 'Whether the class is near capacity (>85%)',
    example: false,
  })
  @Expose()
  is_near_capacity: boolean;

  @ApiProperty({
    description: 'Enrollment status counts',
    example: {
      PENDING: 2,
      ACTIVE: 21,
      COMPLETED: 0,
      DROPPED: 3,
      WITHDRAWN: 1,
    },
  })
  @Expose()
  status_counts: {
    PENDING: number;
    ACTIVE: number;
    COMPLETED: number;
    DROPPED: number;
    WITHDRAWN: number;
  };
}

// Main class response DTO
export class ClassResponseDto {
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
    description: 'Class description',
    example: 'Advanced Placement Government and Politics course',
  })
  @Expose()
  description?: string;

  @ApiPropertyOptional({
    description: 'Subject area',
    enum: Subject,
    example: Subject.GOVERNMENT,
  })
  @Expose()
  subject?: Subject;

  @ApiPropertyOptional({
    description: 'Grade level',
    enum: GradeLevel,
    example: GradeLevel.ELEVENTH,
  })
  @Expose()
  grade_level?: GradeLevel;

  @ApiProperty({
    description: 'Academic year',
    example: '2024-2025',
  })
  @Expose()
  academic_year: string;

  @ApiPropertyOptional({
    description: 'Academic term',
    enum: AcademicTerm,
    example: AcademicTerm.FALL,
  })
  @Expose()
  term?: AcademicTerm;

  @ApiProperty({
    description: 'Maximum number of students',
    example: 30,
  })
  @Expose()
  max_students: number;

  @ApiProperty({
    description: 'Whether the class is active',
    example: true,
  })
  @Expose()
  is_active: boolean;

  @ApiProperty({
    description: 'Class creation timestamp',
    example: '2024-08-15T09:00:00.000Z',
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Class last update timestamp',
    example: '2024-08-20T14:30:00.000Z',
  })
  @Expose()
  updated_at: Date;

  @ApiProperty({
    description: 'Organization ID',
    example: 'cm1def456ghi789jkl',
  })
  @Expose()
  organization_id: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm1abc123def456ghi',
  })
  @Expose()
  teacher_id: string;

  @ApiProperty({
    description: 'Teacher information',
    type: ClassTeacherDto,
  })
  @Expose()
  @Type(() => ClassTeacherDto)
  teacher: ClassTeacherDto;

  @ApiProperty({
    description: 'Organization information',
    type: ClassOrganizationDto,
  })
  @Expose()
  @Type(() => ClassOrganizationDto)
  organization: ClassOrganizationDto;

  @ApiProperty({
    description: 'Enrollment summary',
    type: ClassEnrollmentSummaryDto,
  })
  @Expose()
  @Type(() => ClassEnrollmentSummaryDto)
  enrollment_summary: ClassEnrollmentSummaryDto;

  @ApiPropertyOptional({
    description: 'TimeBack integration ID',
    example: 'tb_class_12345',
  })
  @Expose()
  timeback_class_id?: string;

  @ApiPropertyOptional({
    description: 'TimeBack sync status',
    example: 'SYNCED',
  })
  @Expose()
  timeback_sync_status?: string;

  @ApiPropertyOptional({
    description: 'TimeBack last sync timestamp',
    example: '2024-08-20T15:00:00.000Z',
  })
  @Expose()
  timeback_synced_at?: Date;
}

// Compact class response for lists
export class ClassCompactResponseDto {
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
    enum: Subject,
    example: Subject.GOVERNMENT,
  })
  @Expose()
  subject?: Subject;

  @ApiPropertyOptional({
    description: 'Grade level',
    enum: GradeLevel,
    example: GradeLevel.ELEVENTH,
  })
  @Expose()
  grade_level?: GradeLevel;

  @ApiProperty({
    description: 'Academic year',
    example: '2024-2025',
  })
  @Expose()
  academic_year: string;

  @ApiPropertyOptional({
    description: 'Academic term',
    enum: AcademicTerm,
    example: AcademicTerm.FALL,
  })
  @Expose()
  term?: AcademicTerm;

  @ApiProperty({
    description: 'Whether the class is active',
    example: true,
  })
  @Expose()
  is_active: boolean;

  @ApiProperty({
    description: 'Teacher display name',
    example: 'John Doe',
  })
  @Expose()
  teacher_name: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Lincoln High School',
  })
  @Expose()
  organization_name: string;

  @ApiProperty({
    description: 'Current enrollment / Max students',
    example: '23/30',
  })
  @Expose()
  enrollment_status: string;

  @ApiProperty({
    description: 'Enrollment percentage',
    example: 76.67,
  })
  @Expose()
  enrollment_percentage: number;

  @ApiProperty({
    description: 'Whether the class is full',
    example: false,
  })
  @Expose()
  is_full: boolean;
}

// Paginated response DTO
export class PaginatedClassResponseDto {
  @ApiProperty({
    description: 'Array of classes',
    type: [ClassResponseDto],
  })
  @Type(() => ClassResponseDto)
  classes: ClassResponseDto[];

  @ApiProperty({
    description: 'Total number of classes',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of classes per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
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
