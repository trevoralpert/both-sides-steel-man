import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  Length,
  Min,
  Max,
  Matches,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AcademicTerm {
  FALL = 'FALL',
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  WINTER = 'WINTER',
  YEAR_ROUND = 'YEAR_ROUND',
}

export enum GradeLevel {
  K = 'K',
  FIRST = '1',
  SECOND = '2', 
  THIRD = '3',
  FOURTH = '4',
  FIFTH = '5',
  SIXTH = '6',
  SEVENTH = '7',
  EIGHTH = '8',
  NINTH = '9',
  TENTH = '10',
  ELEVENTH = '11',
  TWELFTH = '12',
  COLLEGE = 'COLLEGE',
  ADULT = 'ADULT',
  MIXED = 'MIXED',
}

export enum Subject {
  ENGLISH = 'ENGLISH',
  MATH = 'MATH',
  SCIENCE = 'SCIENCE',
  SOCIAL_STUDIES = 'SOCIAL_STUDIES',
  HISTORY = 'HISTORY',
  PHILOSOPHY = 'PHILOSOPHY',
  DEBATE = 'DEBATE',
  CIVICS = 'CIVICS',
  GOVERNMENT = 'GOVERNMENT',
  ECONOMICS = 'ECONOMICS',
  PSYCHOLOGY = 'PSYCHOLOGY',
  SOCIOLOGY = 'SOCIOLOGY',
  LITERATURE = 'LITERATURE',
  CRITICAL_THINKING = 'CRITICAL_THINKING',
  OTHER = 'OTHER',
}

export class CreateClassDto {
  @ApiProperty({
    description: 'Class name',
    example: 'AP Government & Politics',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100, { message: 'Class name must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.toString().trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Class description',
    example: 'Advanced Placement Government and Politics course focusing on critical thinking and debate',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Description must be no more than 500 characters' })
  @Transform(({ value }) => value?.toString().trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'Subject area',
    enum: Subject,
    example: Subject.GOVERNMENT,
  })
  @IsOptional()
  @IsEnum(Subject, { message: 'Subject must be a valid subject area' })
  subject?: Subject;

  @ApiPropertyOptional({
    description: 'Grade level',
    enum: GradeLevel,
    example: GradeLevel.ELEVENTH,
  })
  @IsOptional()
  @IsEnum(GradeLevel, { message: 'Grade level must be valid' })
  grade_level?: GradeLevel;

  @ApiProperty({
    description: 'Academic year in YYYY format or YYYY-YYYY format',
    example: '2024-2025',
    pattern: '^\\d{4}(-\\d{4})?$',
  })
  @IsString()
  @Matches(/^\d{4}(-\d{4})?$/, { 
    message: 'Academic year must be in YYYY or YYYY-YYYY format (e.g., "2024" or "2024-2025")' 
  })
  @Transform(({ value }) => value?.toString().trim())
  academic_year: string;

  @ApiPropertyOptional({
    description: 'Academic term',
    enum: AcademicTerm,
    example: AcademicTerm.FALL,
  })
  @IsOptional()
  @IsEnum(AcademicTerm, { message: 'Term must be a valid academic term' })
  term?: AcademicTerm;

  @ApiProperty({
    description: 'Maximum number of students',
    example: 25,
    minimum: 1,
    maximum: 200,
    default: 30,
  })
  @IsInt({ message: 'Maximum students must be an integer' })
  @Min(1, { message: 'Class must allow at least 1 student' })
  @Max(200, { message: 'Class cannot exceed 200 students' })
  @Type(() => Number)
  max_students: number = 30;

  @ApiProperty({
    description: 'Organization ID that owns this class',
    example: 'cm1abc123def456ghi',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  organization_id: string;

  @ApiPropertyOptional({
    description: 'Whether the class is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Active status must be a boolean' })
  @Type(() => Boolean)
  is_active?: boolean = true;
}

// Additional DTOs for bulk operations
export class BulkCreateClassDto {
  @ApiProperty({
    description: 'Array of classes to create',
    type: [CreateClassDto],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateClassDto)
  classes: CreateClassDto[];
}

// DTO for class capacity validation
export class ClassCapacityDto {
  @ApiProperty({
    description: 'Current enrollment count',
    example: 22,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  current_enrollment: number;

  @ApiProperty({
    description: 'Maximum students allowed',
    example: 30,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  max_students: number;

  @ApiProperty({
    description: 'Enrollment percentage',
    example: 73.33,
  })
  enrollment_percentage: number;

  @ApiProperty({
    description: 'Available spots',
    example: 8,
  })
  available_spots: number;

  @ApiProperty({
    description: 'Whether the class is full',
    example: false,
  })
  is_full: boolean;

  @ApiProperty({
    description: 'Whether the class is near capacity (>85%)',
    example: false,
  })
  is_near_capacity: boolean;
}
