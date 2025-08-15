import { IsString, IsNotEmpty } from 'class-validator';

export class TokenRequestDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}

export class TokenResponseDto {
  tokenRequest: any; // Ably.TokenRequest
  channelCapabilities: {
    conversation: string;
    presence: string;
    moderation: string;
    coaching?: string;
  };
  expiresAt: string;
}
