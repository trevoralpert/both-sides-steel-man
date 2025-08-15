import { Controller, Post, Body, UseGuards, Get, Param, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/rbac/decorators/current-user.decorator';
import { AblyConfigService } from './ably-config.service';
import { ConnectionManagerService } from './connection-manager.service';
import { TokenRequestDto, TokenResponseDto } from './dto/token-request.dto';
import { ConnectionRequestDto, ConnectionStateDto, ConnectionHealthDto } from './dto/connection-state.dto';

@Controller('realtime')
@UseGuards(JwtAuthGuard)
export class RealtimeController {
  constructor(
    private readonly ablyConfigService: AblyConfigService,
    private readonly connectionManagerService: ConnectionManagerService,
  ) {}

  /**
   * Generate Ably token request for client-side connection
   */
  @Post('token-request')
  async generateTokenRequest(
    @CurrentUser() user: any,
    @Body() tokenRequestDto: TokenRequestDto,
  ): Promise<TokenResponseDto> {
    const { conversationId } = tokenRequestDto;
    const userId = user.id;

    // Generate token request with conversation-specific capabilities
    const tokenRequest = await this.ablyConfigService.generateTokenRequest(
      userId,
      conversationId,
    );

    // Build channel capability information for client
    const channelCapabilities = {
      conversation: `conversation:${conversationId}`,
      presence: `presence:${conversationId}`,
      moderation: `moderation:${conversationId}`,
      coaching: `coaching:${userId}:${conversationId}`,
    };

    return {
      tokenRequest,
      channelCapabilities,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    };
  }

  /**
   * Validate channel access for debugging
   */
  @Get('validate-channel/:conversationId/:channelName')
  validateChannelAccess(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
    @Param('channelName') channelName: string,
  ) {
    const canAccess = this.ablyConfigService.canUserAccessChannel(
      user.id,
      channelName,
      conversationId,
    );

    return {
      userId: user.id,
      conversationId,
      channelName,
      canAccess,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Establish connection to conversation
   */
  @Post('connect')
  async connectToConversation(
    @CurrentUser() user: any,
    @Body() connectionRequest: ConnectionRequestDto,
  ) {
    const { conversationId } = connectionRequest;
    const userId = user.id;

    const connectionState = await this.connectionManagerService.connect(
      conversationId,
      userId,
    );

    return {
      success: true,
      connectionState,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Disconnect from conversation
   */
  @Delete('disconnect/:conversationId')
  async disconnectFromConversation(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = user.id;

    await this.connectionManagerService.disconnect(conversationId, userId);

    return {
      success: true,
      message: 'Disconnected successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get connection state
   */
  @Get('connection/:conversationId/state')
  getConnectionState(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = user.id;

    const connectionState = this.connectionManagerService.getConnectionState(
      conversationId,
      userId,
    );

    return {
      connectionState,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get connection health and quality metrics
   */
  @Get('connection/:conversationId/health')
  async getConnectionHealth(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
  ): Promise<ConnectionHealthDto> {
    const userId = user.id;

    const connectionState = this.connectionManagerService.getConnectionState(
      conversationId,
      userId,
    );

    if (!connectionState) {
      throw new Error('Connection not found');
    }

    const client = this.connectionManagerService.getAblyClient(conversationId, userId);
    const channels = client ? Array.from(client.channels.all.keys()) : [];

    // Calculate uptime
    const uptime = connectionState.lastConnected 
      ? Date.now() - connectionState.lastConnected.getTime()
      : 0;

    // Determine quality score based on latency and connection stability
    let qualityScore: 'excellent' | 'good' | 'poor' = 'excellent';
    if (connectionState.latency > 2000) {
      qualityScore = 'poor';
    } else if (connectionState.latency > 1000 || connectionState.reconnectAttempts > 2) {
      qualityScore = 'good';
    }

    return {
      conversationId,
      userId,
      connectionState,
      channelsConnected: channels,
      uptime,
      lastPing: new Date(),
      qualityScore,
    };
  }

  /**
   * Health check for real-time services
   */
  @Get('health')
  getRealtimeHealth() {
    return {
      service: 'Real-time Communication Service',
      status: 'operational',
      timestamp: new Date().toISOString(),
      capabilities: [
        'token-request-generation',
        'connection-management',
        'channel-management',
        'presence-tracking',
        'message-routing',
        'auto-reconnection',
      ],
      version: 'Phase 5.1.3',
    };
  }
}
