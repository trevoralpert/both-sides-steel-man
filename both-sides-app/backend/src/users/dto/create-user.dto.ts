import { IsEmail, IsOptional, IsString, IsEnum, IsUrl, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { 
  IsValidUsername, 
  IsValidEmailDetailed, 
  IsValidName,
  SanitizeText,
  SanitizeUrl
} from '../../profiles/validators/profile-validation.util';

export class CreateUserDto {
  @IsString()
  @SanitizeText({ stripHtml: true, normalizeWhitespace: true, maxLength: 255 })
  clerk_id: string;

  @IsEmail()
  @IsValidEmailDetailed()
  @SanitizeText({ stripHtml: true, normalizeWhitespace: true, maxLength: 255 })
  @Transform(({ value }) => value?.toLowerCase?.())
  email: string;

  @IsOptional()
  @IsString()
  @IsValidName('First name')
  @SanitizeText({ stripHtml: true, normalizeWhitespace: true, maxLength: 100 })
  @Length(1, 100, { message: 'First name must be between 1 and 100 characters' })
  first_name?: string;

  @IsOptional()
  @IsString()
  @IsValidName('Last name')
  @SanitizeText({ stripHtml: true, normalizeWhitespace: true, maxLength: 100 })
  @Length(1, 100, { message: 'Last name must be between 1 and 100 characters' })
  last_name?: string;

  @IsOptional()
  @IsString()
  @IsValidUsername()
  @SanitizeText({ stripHtml: true, normalizeWhitespace: true, maxLength: 50 })
  @Transform(({ value }) => value?.toLowerCase?.())
  @Length(3, 50, { message: 'Username must be between 3 and 50 characters' })
  username?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  @SanitizeUrl()
  avatar_url?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be one of: STUDENT, TEACHER, ADMIN' })
  role?: UserRole;
}
