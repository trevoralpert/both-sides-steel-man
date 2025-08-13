import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  Length,
  ArrayMaxSize,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';

export class UpdateEnrollmentStatusDto {
  @ApiProperty({
    description: 'New enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.ACTIVE,
  })
  @IsEnum(EnrollmentStatus, { message: 'Enrollment status must be valid' })
  enrollment_status: EnrollmentStatus;

  @ApiPropertyOptional({
    description: 'Reason for status change',
    example: 'Student completed prerequisites',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Reason must be no more than 200 characters' })
  @Transform(({ value }) => value?.toString().trim())
  reason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the status change',
    example: 'Student showed improvement in assessment',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Notes must be no more than 500 characters' })
  @Transform(({ value }) => value?.toString().trim())
  notes?: string;

  @ApiPropertyOptional({
    description: 'Override workflow validation rules',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  force_transition?: boolean = false;
}

export class CompleteEnrollmentDto {
  @ApiPropertyOptional({
    description: 'Final grade for the student',
    example: 'A-',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @Length(1, 10, { message: 'Final grade must be between 1 and 10 characters' })
  @Transform(({ value }) => value?.toString().trim())
  final_grade?: string;

  @ApiPropertyOptional({
    description: 'Completion date (defaults to current date)',
    example: '2024-12-15T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Completion date must be a valid ISO date string' })
  completed_at?: string;

  @ApiPropertyOptional({
    description: 'Completion notes',
    example: 'Student successfully completed all course requirements',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Completion notes must be no more than 500 characters' })
  @Transform(({ value }) => value?.toString().trim())
  completion_notes?: string;
}

export class DropEnrollmentDto {
  @ApiProperty({
    description: 'Reason for dropping',
    example: 'Schedule conflict',
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200, { message: 'Drop reason is required and must be no more than 200 characters' })
  @Transform(({ value }) => value?.toString().trim())
  drop_reason: string;

  @ApiPropertyOptional({
    description: 'Drop date (defaults to current date)',
    example: '2024-10-15T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Drop date must be a valid ISO date string' })
  dropped_at?: string;

  @ApiPropertyOptional({
    description: 'Whether student can re-enroll later',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allow_re_enrollment?: boolean = true;

  @ApiPropertyOptional({
    description: 'Additional notes about dropping',
    example: 'Student may re-enroll next semester',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Drop notes must be no more than 500 characters' })
  @Transform(({ value }) => value?.toString().trim())
  drop_notes?: string;
}

export class WithdrawEnrollmentDto {
  @ApiProperty({
    description: 'Reason for withdrawal',
    example: 'Medical leave',
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200, { message: 'Withdrawal reason is required and must be no more than 200 characters' })
  @Transform(({ value }) => value?.toString().trim())
  withdrawal_reason: string;

  @ApiPropertyOptional({
    description: 'Withdrawal date (defaults to current date)',
    example: '2024-11-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Withdrawal date must be a valid ISO date string' })
  withdrew_at?: string;

  @ApiPropertyOptional({
    description: 'Whether withdrawal affects academic record',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  affects_transcript?: boolean = false;

  @ApiPropertyOptional({
    description: 'Additional notes about withdrawal',
    example: 'Student plans to return next academic year',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Withdrawal notes must be no more than 500 characters' })
  @Transform(({ value }) => value?.toString().trim())
  withdrawal_notes?: string;
}

export class BulkStatusUpdateDto {
  @ApiProperty({
    description: 'Array of enrollment IDs to update',
    example: ['cm1abc123def456ghi', 'cm1def456ghi789jkl'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100, { message: 'Cannot update more than 100 enrollments at once' })
  enrollment_ids: string[];

  @ApiProperty({
    description: 'New status to apply to all enrollments',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.ACTIVE,
  })
  @IsEnum(EnrollmentStatus, { message: 'Enrollment status must be valid' })
  new_status: EnrollmentStatus;

  @ApiPropertyOptional({
    description: 'Reason for bulk status change',
    example: 'Beginning of semester activation',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Reason must be no more than 200 characters' })
  @Transform(({ value }) => value?.toString().trim())
  reason?: string;

  @ApiPropertyOptional({
    description: 'Override workflow validation for all updates',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  force_transitions?: boolean = false;
}

export class TransferEnrollmentDto {
  @ApiProperty({
    description: 'Enrollment ID to transfer',
    example: 'cm1abc123def456ghi',
    format: 'uuid',
  })
  @IsString()
  enrollment_id: string;

  @ApiProperty({
    description: 'Target class ID',
    example: 'cm1ghi789jkl012mno',
    format: 'uuid',
  })
  @IsString()
  target_class_id: string;

  @ApiProperty({
    description: 'Reason for transfer',
    example: 'Student requested schedule change',
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200, { message: 'Transfer reason is required and must be no more than 200 characters' })
  @Transform(({ value }) => value?.toString().trim())
  transfer_reason: string;

  @ApiPropertyOptional({
    description: 'Whether to maintain enrollment status',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  maintain_status?: boolean = true;

  @ApiPropertyOptional({
    description: 'Transfer notes',
    example: 'Transfer approved by academic advisor',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Transfer notes must be no more than 500 characters' })
  @Transform(({ value }) => value?.toString().trim())
  transfer_notes?: string;
}

// Validation helper for status transitions
export const ENROLLMENT_STATUS_TRANSITIONS = {
  [EnrollmentStatus.PENDING]: [EnrollmentStatus.ACTIVE, EnrollmentStatus.DROPPED, EnrollmentStatus.WITHDRAWN],
  [EnrollmentStatus.ACTIVE]: [EnrollmentStatus.COMPLETED, EnrollmentStatus.DROPPED, EnrollmentStatus.WITHDRAWN],
  [EnrollmentStatus.COMPLETED]: [], // Terminal state
  [EnrollmentStatus.DROPPED]: [EnrollmentStatus.ACTIVE], // Re-enrollment allowed
  [EnrollmentStatus.WITHDRAWN]: [], // Terminal state
};

export function isValidStatusTransition(currentStatus: EnrollmentStatus, newStatus: EnrollmentStatus): boolean {
  return ENROLLMENT_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}

export function getValidTransitions(currentStatus: EnrollmentStatus): EnrollmentStatus[] {
  return ENROLLMENT_STATUS_TRANSITIONS[currentStatus] || [];
}
