import { IsString, IsOptional, IsNotEmpty, IsJSON } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @IsOptional()
  @IsJSON()
  conversationMetadata?: {
    rules?: {
      maxMessagesPerPhase?: number;
      maxMessageLength?: number;
      allowReplies?: boolean;
      moderationLevel?: 'strict' | 'moderate' | 'permissive';
    };
    settings?: {
      autoAdvancePhases?: boolean;
      notificationsEnabled?: boolean;
      coachingEnabled?: boolean;
    };
    participants?: {
      userId: string;
      role: string;
      joinedAt: Date;
    }[];
  };
}
