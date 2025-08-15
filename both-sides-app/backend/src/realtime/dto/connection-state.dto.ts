import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected', 
  DISCONNECTED = 'disconnected',
  FAILED = 'failed'
}

export class ConnectionRequestDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}

export class ConnectionStateDto {
  @IsEnum(ConnectionStatus)
  status: ConnectionStatus;

  @IsOptional()
  lastConnected: Date | null;

  reconnectAttempts: number;

  latency: number;

  @IsString()
  conversationId: string;

  @IsString()
  userId: string;

  @IsOptional()
  connectionId?: string;

  @IsOptional() 
  clientId?: string;
}

export class ConnectionHealthDto {
  @IsString()
  conversationId: string;

  @IsString()
  userId: string;

  connectionState: ConnectionStateDto;

  channelsConnected: string[];

  uptime: number;

  lastPing: Date;

  qualityScore: 'excellent' | 'good' | 'poor';
}
