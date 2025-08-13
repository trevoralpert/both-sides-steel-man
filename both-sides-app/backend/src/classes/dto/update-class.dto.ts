import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Length,
  Min,
  Max,
  Matches,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PartialType, ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { CreateClassDto, AcademicTerm, GradeLevel, Subject } from './create-class.dto';

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @ApiPropertyOptional({
    description: 'Class name',
    example: 'AP Government & Politics - Advanced',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Class name must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.toString().trim())
  name?: string;

  @ApiPropertyOptional({
    description: 'Class description',
    example: 'Advanced Placement Government and Politics course with enhanced debate focus',
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
    example: GradeLevel.TWELFTH,
  })
  @IsOptional()
  @IsEnum(GradeLevel, { message: 'Grade level must be valid' })
  grade_level?: GradeLevel;

  @ApiPropertyOptional({
    description: 'Academic year in YYYY format or YYYY-YYYY format',
    example: '2024-2025',
    pattern: '^\\d{4}(-\\d{4})?$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}(-\d{4})?$/, { 
    message: 'Academic year must be in YYYY or YYYY-YYYY format (e.g., "2024" or "2024-2025")' 
  })
  @Transform(({ value }) => value?.toString().trim())
  academic_year?: string;

  @ApiPropertyOptional({
    description: 'Academic term',
    enum: AcademicTerm,
    example: AcademicTerm.SPRING,
  })
  @IsOptional()
  @IsEnum(AcademicTerm, { message: 'Term must be a valid academic term' })
  term?: AcademicTerm;

  @ApiPropertyOptional({
    description: 'Maximum number of students',
    example: 35,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @IsInt({ message: 'Maximum students must be an integer' })
  @Min(1, { message: 'Class must allow at least 1 student' })
  @Max(200, { message: 'Class cannot exceed 200 students' })
  @Type(() => Number)
  max_students?: number;

  @ApiPropertyOptional({
    description: 'Whether the class is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Active status must be a boolean' })
  @Type(() => Boolean)
  is_active?: boolean;
}

// DTO for bulk class updates
export class BulkUpdateClassDto {
  @ApiProperty({
    description: 'Array of class IDs to update',
    example: ['cm1abc123def456ghi', 'cm1def456ghi789jkl'],
  })
  @IsArray()
  @IsString({ each: true })
  class_ids: string[];

  @ApiProperty({
    description: 'Updates to apply to all classes',
    type: UpdateClassDto,
  })
  @ValidateNested()
  @Type(() => UpdateClassDto)
  updates: UpdateClassDto;
}

// DTO for class status updates
export class UpdateClassStatusDto {
  @ApiProperty({
    description: 'Whether the class is active',
    example: false,
  })
  @IsBoolean({ message: 'Active status must be a boolean' })
  @Type(() => Boolean)
  is_active: boolean;

  @ApiPropertyOptional({
    description: 'Reason for status change',
    example: 'Class cancelled due to low enrollment',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Reason must be no more than 200 characters' })
  @Transform(({ value }) => value?.toString().trim())
  reason?: string;
}

// DTO for updating class capacity
export class UpdateClassCapacityDto {
  @ApiProperty({
    description: 'New maximum number of students',
    example: 40,
    minimum: 1,
    maximum: 200,
  })
  @IsInt({ message: 'Maximum students must be an integer' })
  @Min(1, { message: 'Class must allow at least 1 student' })
  @Max(200, { message: 'Class cannot exceed 200 students' })
  @Type(() => Number)
  max_students: number;

  @ApiPropertyOptional({
    description: 'Reason for capacity change',
    example: 'Larger classroom assigned',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Reason must be no more than 200 characters' })
  @Transform(({ value }) => value?.toString().trim())
  reason?: string;

  @ApiPropertyOptional({
    description: 'Whether to force the change even if current enrollment exceeds new capacity',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  force_change?: boolean = false;
}
