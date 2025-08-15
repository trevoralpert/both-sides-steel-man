import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/rbac/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './services/messages.service';
import { MessageHistoryService } from './services/message-history.service';
import { DebatePhaseService } from './services/debate-phase.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageHistoryRequestDto, MessageSearchRequestDto, ExportRequestDto } from './dto/message-history.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly messageHistoryService: MessageHistoryService,
    private readonly debatePhaseService: DebatePhaseService,
  ) {}

  /**
   * Create a new conversation from an accepted match
   */
  @Post()
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return this.conversationsService.createConversation(createConversationDto);
  }

  /**
   * Get all conversations for the current user
   */
  @Get()
  async getConversationsForUser(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.conversationsService.getConversationsForUser(user.id, parsedLimit);
  }

  /**
   * Get a specific conversation by ID
   */
  @Get(':id')
  async getConversationById(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.getConversationById(conversationId, user.id);
  }

  /**
   * Start a conversation (move from PREPARING to ACTIVE)
   */
  @Post(':id/start')
  async startConversation(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.startConversation(conversationId, user.id);
  }

  /**
   * Mark current user as ready to start the conversation
   */
  @Post(':id/ready')
  async markUserReady(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.markUserReady(conversationId, user.id);
  }

  // =============================================================================
  // MESSAGE ENDPOINTS
  // =============================================================================

  /**
   * Send a new message to a conversation
   */
  @Post(':id/messages')
  async createMessage(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    // Ensure conversationId matches the URL parameter
    createMessageDto.conversationId = conversationId;
    return this.messagesService.createMessage(user.id, createMessageDto);
  }

  /**
   * Edit an existing message (within time limit)
   */
  @Put('messages/:messageId')
  async editMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return this.messagesService.editMessage(messageId, user.id, updateMessageDto);
  }

  /**
   * Delete a message (soft delete within time limit)
   */
  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
  ) {
    await this.messagesService.deleteMessage(messageId, user.id);
  }

  /**
   * Get message thread (parent message with all replies)
   */
  @Get('messages/:messageId/thread')
  async getMessageThread(
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
  ) {
    return this.messagesService.getMessageThread(messageId, user.id);
  }

  /**
   * React to a message with emoji
   */
  @Post('messages/:messageId/react')
  @HttpCode(HttpStatus.OK)
  async reactToMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
    @Body('emoji') emoji: string,
  ) {
    await this.messagesService.reactToMessage(messageId, user.id, emoji);
    return { success: true, message: 'Reaction updated' };
  }

  // =============================================================================
  // CONVERSATION MANAGEMENT ENDPOINTS
  // =============================================================================

  // =============================================================================
  // MESSAGE HISTORY & PAGINATION ENDPOINTS
  // =============================================================================

  /**
   * Get paginated message history for a conversation
   */
  @Get(':id/messages/history')
  async getMessageHistory(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('fromUser') fromUser?: string,
    @Query('messageTypes') messageTypes?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('searchTerm') searchTerm?: string,
  ) {
    const messageHistoryRequest: MessageHistoryRequestDto = {
      conversationId,
      limit: limit ? parseInt(limit, 10) : 50,
      cursor,
      filters: {
        fromUser,
        messageTypes: messageTypes ? messageTypes.split(',') as any : undefined,
        startDate,
        endDate,
        searchTerm,
      },
    };

    return this.messageHistoryService.getMessageHistory(user.id, messageHistoryRequest);
  }

  /**
   * Search messages in a conversation
   */
  @Get(':id/messages/search')
  async searchMessages(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('fromUser') fromUser?: string,
    @Query('messageTypes') messageTypes?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }

    const searchRequest: MessageSearchRequestDto = {
      conversationId,
      query,
      limit: limit ? parseInt(limit, 10) : 20,
      cursor,
      filters: {
        fromUser,
        messageTypes: messageTypes ? messageTypes.split(',') as any : undefined,
        startDate,
        endDate,
      },
    };

    return this.messageHistoryService.searchMessages(user.id, searchRequest);
  }

  /**
   * Get context around a specific message
   */
  @Get('messages/:messageId/context')
  async getMessageContext(
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
    @Query('contextSize') contextSize?: string,
  ) {
    const parsedContextSize = contextSize ? parseInt(contextSize, 10) : 10;
    return this.messageHistoryService.getMessageContext(messageId, user.id, parsedContextSize);
  }

  /**
   * Get conversation statistics and metrics
   */
  @Get(':id/stats')
  async getConversationStats(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ) {
    // This would return message counts, participation metrics, etc.
    // Implementation would go in conversations service
    return {
      conversationId,
      placeholder: 'Stats endpoint - to be implemented in Task 5.3.5',
    };
  }

  /**
   * Export conversation as different formats
   */
  @Get(':id/export')
  async exportConversation(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @Query('format') format: string = 'json',
    @Query('filename') filename?: string,
    @Query('includeMetadata') includeMetadata?: string,
    @Query('includeDeletedMessages') includeDeletedMessages?: string,
    @Query('fromUser') fromUser?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const exportRequest: ExportRequestDto = {
      conversationId,
      format: format as 'json' | 'txt' | 'pdf' | 'csv',
      filename,
      includeMetadata: includeMetadata === 'true',
      includeDeletedMessages: includeDeletedMessages === 'true',
      filters: {
        fromUser,
        startDate,
        endDate,
      },
    };

    return this.messageHistoryService.exportConversation(user.id, exportRequest);
  }

  // =============================================================================
  // REAL-TIME MESSAGING ENDPOINTS
  // =============================================================================

  /**
   * Send optimistic message for immediate UI feedback
   */
  @Post(':id/messages/optimistic')
  async sendOptimisticMessage(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @Body() body: { tempId: string; content: string },
  ) {
    const createMessageDto: CreateMessageDto = {
      conversationId,
      content: body.content,
    };
    
    return this.messagesService.sendOptimisticMessage(
      body.tempId,
      user.id,
      createMessageDto,
    );
  }

  /**
   * Confirm optimistic message with database-saved message
   */
  @Post('messages/:tempId/confirm')
  async confirmOptimisticMessage(
    @Param('tempId') tempId: string,
    @CurrentUser() user: any,
    @Body() body: { actualMessageId: string },
  ) {
    // Get the actual message from database
    const actualMessage = await this.messagesService.getMessageById(body.actualMessageId, user.id);
    
    await this.messagesService.confirmOptimisticMessage(tempId, actualMessage);
    
    return { success: true, tempId, actualMessageId: body.actualMessageId };
  }

  /**
   * Mark message as delivered
   */
  @Post('messages/:messageId/delivered')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markMessageDelivered(
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
  ) {
    await this.messagesService.handleDeliveryConfirmation(messageId, user.id);
  }

  /**
   * Mark message as read
   */
  @Post('messages/:messageId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markMessageRead(
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
  ) {
    await this.messagesService.handleReadConfirmation(messageId, user.id);
  }

  /**
   * Sync messages across devices
   */
  @Get(':id/messages/sync')
  async syncMessages(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @Query('lastSyncTime') lastSyncTime: string,
    @Query('deviceId') deviceId: string,
  ) {
    if (!lastSyncTime || !deviceId) {
      throw new BadRequestException('lastSyncTime and deviceId are required');
    }

    const lastSync = new Date(lastSyncTime);
    
    return this.messagesService.syncMessages(
      user.id,
      conversationId,
      lastSync,
      deviceId,
    );
  }

  // =============================================================================
  // DEBATE PHASE MANAGEMENT ENDPOINTS
  // =============================================================================

  /**
   * Get current phase information and timer
   */
  @Get(':id/phase')
  async getPhaseInfo(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ) {
    // Verify user has access to this conversation
    await this.conversationsService.getConversationById(conversationId, user.id);
    
    const timer = await this.debatePhaseService.getPhaseTimer(conversationId);
    const progress = await this.debatePhaseService.getPhaseProgress(conversationId);
    const currentConfig = this.debatePhaseService.getPhaseConfig(timer.currentPhase);

    return {
      ...timer,
      progress,
      config: currentConfig,
      allPhases: this.debatePhaseService.getAllPhaseConfigs(),
    };
  }

  /**
   * Start a specific debate phase
   */
  @Post(':id/phase/:phase/start')
  async startPhase(
    @Param('id') conversationId: string,
    @Param('phase') phase: string,
    @CurrentUser() user: any,
  ) {
    // Verify user has access to this conversation
    await this.conversationsService.getConversationById(conversationId, user.id);
    
    // Validate phase enum
    const validPhases = Object.values(['PREPARATION', 'OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING', 'REFLECTION']);
    if (!validPhases.includes(phase.toUpperCase())) {
      throw new BadRequestException(`Invalid phase: ${phase}`);
    }

    await this.debatePhaseService.startPhase(
      conversationId, 
      phase.toUpperCase() as any,
      user.id
    );

    return {
      success: true,
      phase: phase.toUpperCase(),
      message: `Phase ${phase} started successfully`,
    };
  }

  /**
   * Advance to the next phase in the debate sequence
   */
  @Post(':id/phase/advance')
  async advancePhase(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ) {
    // Verify user has access to this conversation
    await this.conversationsService.getConversationById(conversationId, user.id);

    const nextPhase = await this.debatePhaseService.advancePhase(conversationId, user.id);

    return {
      success: true,
      nextPhase,
      message: `Advanced to ${nextPhase} phase`,
    };
  }

  /**
   * Extend current phase by additional time
   */
  @Post(':id/phase/extend')
  async extendPhase(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @Body() body: { additionalMinutes: number },
  ) {
    // Verify user has access to this conversation
    await this.conversationsService.getConversationById(conversationId, user.id);

    if (!body.additionalMinutes || body.additionalMinutes <= 0 || body.additionalMinutes > 30) {
      throw new BadRequestException('additionalMinutes must be between 1 and 30');
    }

    await this.debatePhaseService.extendPhase(
      conversationId,
      body.additionalMinutes,
      user.id
    );

    return {
      success: true,
      additionalMinutes: body.additionalMinutes,
      message: `Phase extended by ${body.additionalMinutes} minutes`,
    };
  }

  /**
   * Get phase progress and requirements
   */
  @Get(':id/phase/progress')
  async getPhaseProgress(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
  ) {
    // Verify user has access to this conversation
    await this.conversationsService.getConversationById(conversationId, user.id);

    return this.debatePhaseService.getPhaseProgress(conversationId);
  }

  /**
   * Get all phase configurations
   */
  @Get('phase/configs')
  getPhaseConfigs() {
    return {
      phases: this.debatePhaseService.getAllPhaseConfigs(),
      order: ['PREPARATION', 'OPENING', 'DISCUSSION', 'REBUTTAL', 'CLOSING', 'REFLECTION'],
    };
  }

  /**
   * Validate message against current phase rules (utility endpoint)
   */
  @Post(':id/phase/validate-message')
  async validateMessageForPhase(
    @Param('id') conversationId: string,
    @CurrentUser() user: any,
    @Body() messageData: { content: string; contentType?: string },
  ) {
    // Verify user has access to this conversation
    await this.conversationsService.getConversationById(conversationId, user.id);

    const validation = await this.debatePhaseService.validateMessageForPhase(
      {
        conversationId,
        userId: user.id,
        content: messageData.content,
        contentType: messageData.contentType || 'TEXT',
      } as any,
      conversationId
    );

    return validation;
  }

  /**
   * Health check for conversations API
   */
  @Get('_health')
  getConversationsHealth() {
    return {
      service: 'Conversations API',
      status: 'operational',
      timestamp: new Date().toISOString(),
      capabilities: [
        'conversation-management',
        'message-crud-operations',
        'thread-management',
        'real-time-integration',
        'optimistic-messaging',
        'message-status-tracking',
        'cross-device-sync',
        'debate-phase-management',
        'phase-timers',
        'phase-validation',
        'automated-transitions',
        'content-validation',
        'access-control',
      ],
      version: 'Phase 5.2.5',
    };
  }
}
