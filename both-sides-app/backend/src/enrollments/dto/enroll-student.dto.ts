import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';

export class EnrollStudentDto {
  @ApiProperty({
    description: 'Student user ID',
    example: 'cm1abc123def456ghi',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  user_id: string;

  @ApiProperty({
    description: 'Class ID to enroll in',
    example: 'cm1ghi789jkl012mno',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Class ID must be a valid UUID' })
  class_id: string;

  @ApiPropertyOptional({
    description: 'Initial enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.PENDING,
    default: EnrollmentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus, { message: 'Enrollment status must be valid' })
  enrollment_status?: EnrollmentStatus = EnrollmentStatus.PENDING;

  @ApiPropertyOptional({
    description: 'Reason for enrollment or special notes',
    example: 'Student requested transfer from another class',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  enrollment_reason?: string;
}

export class BulkEnrollmentDto {
  @ApiProperty({
    description: 'Array of enrollments to create',
    type: [EnrollStudentDto],
    maxItems: 100,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnrollStudentDto)
  @ArrayMinSize(1, { message: 'At least one enrollment is required' })
  @ArrayMaxSize(100, { message: 'Cannot enroll more than 100 students at once' })
  enrollments: EnrollStudentDto[];

  @ApiPropertyOptional({
    description: 'Whether to skip capacity validation for bulk operations',
    example: false,
    default: false,
  })
  @IsOptional()
  skip_capacity_check?: boolean = false;

  @ApiPropertyOptional({
    description: 'Reason for bulk enrollment',
    example: 'Beginning of semester enrollment',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  bulk_reason?: string;
}

export class EnrollByUsernameDto {
  @ApiProperty({
    description: 'Student username',
    example: 'jdoe_student',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Class ID to enroll in',
    example: 'cm1ghi789jkl012mno',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Class ID must be a valid UUID' })
  class_id: string;

  @ApiPropertyOptional({
    description: 'Initial enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.PENDING,
    default: EnrollmentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus, { message: 'Enrollment status must be valid' })
  enrollment_status?: EnrollmentStatus = EnrollmentStatus.PENDING;

  @ApiPropertyOptional({
    description: 'Reason for enrollment',
    example: 'Teacher recommendation',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  enrollment_reason?: string;
}

export class EnrollByEmailDto {
  @ApiProperty({
    description: 'Student email address',
    example: 'john.doe@student.school.edu',
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Class ID to enroll in',
    example: 'cm1ghi789jkl012mno',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Class ID must be a valid UUID' })
  class_id: string;

  @ApiPropertyOptional({
    description: 'Initial enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.PENDING,
    default: EnrollmentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus, { message: 'Enrollment status must be valid' })
  enrollment_status?: EnrollmentStatus = EnrollmentStatus.PENDING;

  @ApiPropertyOptional({
    description: 'Reason for enrollment',
    example: 'Email invitation',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  enrollment_reason?: string;
}
