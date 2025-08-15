import { MessageContentType, MessageStatus, ModerationStatus } from '@prisma/client';

export class MessageResponseDto {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  contentType: MessageContentType;
  messageMetadata?: any;
  replyToId?: string;
  status: MessageStatus;
  moderationStatus: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;

  // Relations
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  replyTo?: MessageResponseDto;
  replies?: MessageResponseDto[];
}

export class ConversationResponseDto {
  id: string;
  matchId: string;
  status: string;
  debatePhase: string;
  phaseDeadline?: Date;
  startedAt?: Date;
  endedAt?: Date;
  conversationMetadata?: any;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  match?: {
    id: string;
    topicId?: string;
    student1Position?: string;
    student2Position?: string;
    topic?: {
      id: string;
      title: string;
      description: string;
      category: string;
    };
    student1?: {
      id: string;
      firstName?: string;
      lastName?: string;
    };
    student2?: {
      id: string;
      firstName?: string;
      lastName?: string;
    };
  };
  messages?: MessageResponseDto[];
}

export class MessageThreadResponseDto {
  parentMessage: MessageResponseDto;
  replies: MessageResponseDto[];
  totalReplies: number;
}
