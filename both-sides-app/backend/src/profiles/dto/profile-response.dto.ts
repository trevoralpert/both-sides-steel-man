import { Exclude, Expose, Type } from 'class-transformer';

export class ProfileResponseDto {
  @Expose()
  id: string;

  @Expose()
  is_completed: boolean;

  @Expose()
  completion_date?: Date;

  @Expose()
  survey_responses?: any;

  @Expose()
  belief_summary?: string;

  @Expose()
  ideology_scores?: any;

  @Expose()
  opinion_plasticity?: number;

  @Expose()
  profile_version: number;

  @Expose()
  last_updated: Date;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;

  @Expose()
  user_id: string;

  // Optional user information (when profile includes user relation)
  @Expose()
  @Type(() => UserBasicDto)
  user?: UserBasicDto;
}

class UserBasicDto {
  @Expose()
  id: string;

  @Expose()
  first_name?: string;

  @Expose()
  last_name?: string;

  @Expose()
  username?: string;

  @Expose()
  avatar_url?: string;

  @Expose()
  role: string;

  @Exclude()
  clerk_id: string;

  @Exclude()
  email: string;
}
