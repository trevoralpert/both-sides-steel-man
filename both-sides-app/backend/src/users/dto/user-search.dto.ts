import { IsOptional, IsString, IsEnum, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class UserSearchDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsEnum(['first_name', 'last_name', 'email', 'username', 'created_at', 'last_login_at', 'role'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';
}

export class UserListDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsEnum(['first_name', 'last_name', 'email', 'username', 'created_at', 'last_login_at', 'role'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';
}
