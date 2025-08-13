import { IsEnum, IsOptional, IsString, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE', 
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED'
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkUserStatusDto {
  @IsArray()
  @IsUUID('4', { each: true })
  user_ids: string[];

  @IsEnum(UserStatus)
  status: UserStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkUpdateUserDto {
  @IsArray()
  @IsUUID('4', { each: true })
  user_ids: string[];

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkImportUserDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBulkUserDto)
  users: CreateBulkUserDto[];
}

export class CreateBulkUserDto {
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEnum(['STUDENT', 'TEACHER', 'ADMIN'])
  role?: string;

  @IsOptional()
  @IsString()
  organization_id?: string;
}
