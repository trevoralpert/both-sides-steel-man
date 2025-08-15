import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageBroadcastService } from './message-broadcast.service';
import { DebatePhase, MessageContentType } from '@prisma/client';
import { MessageResponseDto } from '../dto/message-response.dto';

export interface PhaseConfig {
  phase: DebatePhase;
  durationMinutes: number;
  messageRules: {
    maxMessagesPerUser?: number;
    maxMessageLength?: number;
    allowedContentTypes: MessageContentType[];
    requireTurns?: boolean;
    minMessagesPerUser?: number;
  };
  autoAdvance: boolean;
  requireBothParticipants: boolean;
  description: string;
  instructions: string[];
}

export interface PhaseTimer {
  conversationId: string;
  currentPhase: DebatePhase;
  startTime: Date;
  endTime: Date;
  remainingSeconds: number;
  isExpired: boolean;
  canExtend: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PhaseTransition {
  fromPhase: DebatePhase;
  toPhase: DebatePhase;
  transitionedAt: Date;
  triggeredBy: 'timer' | 'manual' | 'completion';
  userId?: string;
}

@Injectable()
export class DebatePhaseService {
  private readonly logger = new Logger(DebatePhaseService.name);
  
  // Active phase timers - in production, use Redis for distributed systems
  private readonly phaseTimers = new Map<string, NodeJS.Timeout>();
  private readonly phaseStartTimes = new Map<string, Date>();
  
  // Phase configurations
  private readonly phaseConfigs: Record<DebatePhase, PhaseConfig> = {
    [DebatePhase.PREPARATION]: {
      phase: DebatePhase.PREPARATION,
      durationMinutes: 5,
      messageRules: {
        allowedContentTypes: [MessageContentType.SYSTEM],
        maxMessagesPerUser: 0, // No user messages allowed
      },
      autoAdvance: false, // Manual start when both ready
      requireBothParticipants: true,
      description: 'Preparation Phase',
      instructions: [
        'Review the debate topic and your assigned position',
        'Prepare your opening statement and key arguments',
        'Research supporting evidence and examples',
        'Click "Ready" when prepared to begin the debate'
      ]
    },
    [DebatePhase.OPENING]: {
      phase: DebatePhase.OPENING,
      durationMinutes: 5,
      messageRules: {
        allowedContentTypes: [MessageContentType.TEXT, MessageContentType.SYSTEM],
        maxMessagesPerUser: 1,
        minMessagesPerUser: 1,
        maxMessageLength: 2000,
        requireTurns: true,
      },
      autoAdvance: true,
      requireBothParticipants: true,
      description: 'Opening Statements',
      instructions: [
        'Present your opening statement (max 2000 characters)',
        'Clearly state your position on the topic',
        'Outline your main arguments',
        'Both participants must post before advancing'
      ]
    },
    [DebatePhase.DISCUSSION]: {
      phase: DebatePhase.DISCUSSION,
      durationMinutes: 20,
      messageRules: {
        allowedContentTypes: [MessageContentType.TEXT, MessageContentType.COACHING],
        maxMessageLength: 1500,
        requireTurns: false, // Free-form discussion
      },
      autoAdvance: true,
      requireBothParticipants: false,
      description: 'Open Discussion',
      instructions: [
        'Engage in free-form discussion about the topic',
        'Build on your arguments with evidence and examples',
        'Respond to your opponent\'s points respectfully',
        'Ask questions to understand different perspectives'
      ]
    },
    [DebatePhase.REBUTTAL]: {
      phase: DebatePhase.REBUTTAL,
      durationMinutes: 10,
      messageRules: {
        allowedContentTypes: [MessageContentType.TEXT, MessageContentType.SYSTEM],
        maxMessagesPerUser: 2,
        minMessagesPerUser: 1,
        maxMessageLength: 1500,
        requireTurns: true,
      },
      autoAdvance: true,
      requireBothParticipants: true,
      description: 'Rebuttal Round',
      instructions: [
        'Address your opponent\'s strongest arguments',
        'Provide counter-evidence or reasoning',
        'Strengthen your own position',
        'Each participant gets up to 2 messages'
      ]
    },
    [DebatePhase.CLOSING]: {
      phase: DebatePhase.CLOSING,
      durationMinutes: 5,
      messageRules: {
        allowedContentTypes: [MessageContentType.TEXT, MessageContentType.SYSTEM],
        maxMessagesPerUser: 1,
        minMessagesPerUser: 1,
        maxMessageLength: 1000,
        requireTurns: true,
      },
      autoAdvance: true,
      requireBothParticipants: true,
      description: 'Closing Statements',
      instructions: [
        'Summarize your key arguments',
        'Highlight the strongest points from the debate',
        'Make your final case (max 1000 characters)',
        'Thank your opponent for the discussion'
      ]
    },
    [DebatePhase.REFLECTION]: {
      phase: DebatePhase.REFLECTION,
      durationMinutes: 0, // No time limit
      messageRules: {
        allowedContentTypes: [MessageContentType.TEXT, MessageContentType.SYSTEM],
        maxMessageLength: 2000,
      },
      autoAdvance: false,
      requireBothParticipants: false,
      description: 'Post-Debate Reflection',
      instructions: [
        'Reflect on what you learned from the debate',
        'Share insights about the opposing perspective',
        'Discuss how your views may have evolved',
        'This phase is optional and untimed'
      ]
    }
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBroadcastService: MessageBroadcastService,
  ) {}

  /**
   * Start a specific phase for a conversation
   */
  async startPhase(conversationId: string, phase: DebatePhase, userId?: string): Promise<void> {
    this.logger.debug(`Starting phase ${phase} for conversation ${conversationId}`);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Validate phase transition
    const canTransition = await this.canTransitionToPhase(conversationId, phase);
    if (!canTransition) {
      throw new BadRequestException(`Cannot transition to ${phase} from current state`);
    }

    const phaseConfig = this.phaseConfigs[phase];
    const now = new Date();
    
    // Update conversation phase
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        debate_phase: phase,
        phase_deadline: phaseConfig.durationMinutes > 0 
          ? new Date(now.getTime() + phaseConfig.durationMinutes * 60 * 1000)
          : null,
        conversation_metadata: {
          ...conversation.conversation_metadata as object || {},
          phaseTransitions: [
            ...(conversation.conversation_metadata as any)?.phaseTransitions || [],
            {
              fromPhase: conversation.debate_phase,
              toPhase: phase,
              transitionedAt: now,
              triggeredBy: userId ? 'manual' : 'timer',
              userId,
            } as PhaseTransition
          ],
          phaseStartTime: now,
          phaseConfig: phaseConfig,
        },
      },
    });

    // Store phase start time for timer calculations
    this.phaseStartTimes.set(conversationId, now);

    // Set up auto-advance timer if configured
    if (phaseConfig.autoAdvance && phaseConfig.durationMinutes > 0) {
      this.setupPhaseTimer(conversationId, phase, phaseConfig.durationMinutes);
    }

    // Broadcast phase change to participants
    const participantIds = [conversation.match.student1_id, conversation.match.student2_id];
    await this.broadcastPhaseChange(conversationId, phase, participantIds);

    this.logger.log(`Phase ${phase} started for conversation ${conversationId}`);
  }

  /**
   * Advance to the next phase in the debate sequence
   */
  async advancePhase(conversationId: string, userId?: string): Promise<DebatePhase> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const nextPhase = this.getNextPhase(conversation.debate_phase);
    
    if (!nextPhase) {
      throw new BadRequestException('Cannot advance phase - already at final phase');
    }

    // Check if current phase requirements are met
    const canAdvance = await this.canAdvanceFromPhase(conversationId, conversation.debate_phase);
    if (!canAdvance) {
      throw new BadRequestException('Cannot advance - current phase requirements not met');
    }

    await this.startPhase(conversationId, nextPhase, userId);
    return nextPhase;
  }

  /**
   * Validate message against current phase rules
   */
  async validateMessageForPhase(
    message: Partial<MessageResponseDto>, 
    conversationId: string
  ): Promise<ValidationResult> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return { isValid: false, errors: ['Conversation not found'], warnings: [] };
    }

    const phaseConfig = this.phaseConfigs[conversation.debate_phase];
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

    // Check allowed content types
    if (!phaseConfig.messageRules.allowedContentTypes.includes(message.contentType!)) {
      result.errors.push(`Message type ${message.contentType} not allowed in ${conversation.debate_phase} phase`);
    }

    // Check message length
    if (phaseConfig.messageRules.maxMessageLength && 
        message.content && 
        message.content.length > phaseConfig.messageRules.maxMessageLength) {
      result.errors.push(`Message exceeds maximum length of ${phaseConfig.messageRules.maxMessageLength} characters`);
    }

    // Check user message limits for this phase
    if (phaseConfig.messageRules.maxMessagesPerUser) {
      const userMessageCount = await this.getUserMessageCountInCurrentPhase(
        conversationId, 
        message.userId!,
        conversation.debate_phase
      );

      if (userMessageCount >= phaseConfig.messageRules.maxMessagesPerUser) {
        result.errors.push(`Maximum ${phaseConfig.messageRules.maxMessagesPerUser} messages allowed per user in ${conversation.debate_phase} phase`);
      }
    }

    // Check turn requirements
    if (phaseConfig.messageRules.requireTurns) {
      const isValidTurn = await this.validateTurnOrder(conversationId, message.userId!);
      if (!isValidTurn) {
        result.warnings.push('It may be your opponent\'s turn to respond');
      }
    }

    // Check if phase is still active
    const timer = await this.getPhaseTimer(conversationId);
    if (timer.isExpired) {
      result.errors.push('Phase time has expired');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Get current phase timer information
   */
  async getPhaseTimer(conversationId: string): Promise<PhaseTimer> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const phaseConfig = this.phaseConfigs[conversation.debate_phase];
    const startTime = this.phaseStartTimes.get(conversationId) || conversation.updated_at;
    const endTime = conversation.phase_deadline || new Date(startTime.getTime() + phaseConfig.durationMinutes * 60 * 1000);
    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));

    return {
      conversationId,
      currentPhase: conversation.debate_phase,
      startTime,
      endTime,
      remainingSeconds,
      isExpired: remainingSeconds === 0 && phaseConfig.durationMinutes > 0,
      canExtend: phaseConfig.durationMinutes > 0,
    };
  }

  /**
   * Extend current phase by additional minutes
   */
  async extendPhase(conversationId: string, additionalMinutes: number, userId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const phaseConfig = this.phaseConfigs[conversation.debate_phase];
    
    if (!phaseConfig.durationMinutes || additionalMinutes <= 0) {
      throw new BadRequestException('Phase cannot be extended');
    }

    const newDeadline = new Date((conversation.phase_deadline || new Date()).getTime() + additionalMinutes * 60 * 1000);

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        phase_deadline: newDeadline,
        conversation_metadata: {
          ...conversation.conversation_metadata as object || {},
          phaseExtensions: [
            ...(conversation.conversation_metadata as any)?.phaseExtensions || [],
            {
              phase: conversation.debate_phase,
              extendedBy: additionalMinutes,
              extendedAt: new Date(),
              extendedBy_userId: userId,
            }
          ],
        },
      },
    });

    // Clear existing timer and set new one
    const existingTimer = this.phaseTimers.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (phaseConfig.autoAdvance) {
      const remainingTime = Math.floor((newDeadline.getTime() - new Date().getTime()) / (60 * 1000));
      this.setupPhaseTimer(conversationId, conversation.debate_phase, remainingTime);
    }

    // Broadcast phase extension to participants
    const match = await this.prisma.match.findFirst({
      where: { conversations: { some: { id: conversationId } } },
    });

    if (match) {
      const participantIds = [match.student1_id, match.student2_id];
      await this.broadcastPhaseUpdate(conversationId, conversation.debate_phase, participantIds, {
        type: 'extension',
        additionalMinutes,
        newDeadline,
      });
    }

    this.logger.log(`Phase ${conversation.debate_phase} extended by ${additionalMinutes} minutes for conversation ${conversationId}`);
  }

  /**
   * Get phase configuration
   */
  getPhaseConfig(phase: DebatePhase): PhaseConfig {
    return this.phaseConfigs[phase];
  }

  /**
   * Get all phase configurations
   */
  getAllPhaseConfigs(): Record<DebatePhase, PhaseConfig> {
    return this.phaseConfigs;
  }

  /**
   * Get phase progress for a conversation
   */
  async getPhaseProgress(conversationId: string): Promise<{
    currentPhase: DebatePhase;
    phaseOrder: DebatePhase[];
    currentIndex: number;
    completedPhases: DebatePhase[];
    nextPhase?: DebatePhase;
    canAdvance: boolean;
    requirements: {
      met: boolean;
      details: string[];
    };
  }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const phaseOrder: DebatePhase[] = [
      DebatePhase.PREPARATION,
      DebatePhase.OPENING,
      DebatePhase.DISCUSSION,
      DebatePhase.REBUTTAL,
      DebatePhase.CLOSING,
      DebatePhase.REFLECTION,
    ];

    const currentIndex = phaseOrder.indexOf(conversation.debate_phase);
    const completedPhases = phaseOrder.slice(0, currentIndex);
    const nextPhase = phaseOrder[currentIndex + 1];
    const canAdvance = await this.canAdvanceFromPhase(conversationId, conversation.debate_phase);
    const requirements = await this.getPhaseRequirements(conversationId, conversation.debate_phase);

    return {
      currentPhase: conversation.debate_phase,
      phaseOrder,
      currentIndex,
      completedPhases,
      nextPhase,
      canAdvance,
      requirements,
    };
  }

  // Private helper methods

  private async canTransitionToPhase(conversationId: string, targetPhase: DebatePhase): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return false;

    // Can always transition to preparation
    if (targetPhase === DebatePhase.PREPARATION) return true;

    // Check if we're advancing in the correct order
    const phaseOrder: DebatePhase[] = [
      DebatePhase.PREPARATION,
      DebatePhase.OPENING,
      DebatePhase.DISCUSSION,
      DebatePhase.REBUTTAL,
      DebatePhase.CLOSING,
      DebatePhase.REFLECTION,
    ];

    const currentIndex = phaseOrder.indexOf(conversation.debate_phase);
    const targetIndex = phaseOrder.indexOf(targetPhase);

    // Can move to next phase or stay in current phase
    return targetIndex <= currentIndex + 1;
  }

  private async canAdvanceFromPhase(conversationId: string, currentPhase: DebatePhase): Promise<boolean> {
    const phaseConfig = this.phaseConfigs[currentPhase];
    
    if (!phaseConfig.requireBothParticipants) {
      return true;
    }

    // Check if minimum requirements are met
    const requirements = await this.getPhaseRequirements(conversationId, currentPhase);
    return requirements.met;
  }

  private async getPhaseRequirements(conversationId: string, phase: DebatePhase): Promise<{
    met: boolean;
    details: string[];
  }> {
    const phaseConfig = this.phaseConfigs[phase];
    const details: string[] = [];
    let met = true;

    if (phaseConfig.messageRules.minMessagesPerUser) {
      // Get participants
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { match: true },
      });

      if (conversation) {
        const participants = [conversation.match.student1_id, conversation.match.student2_id];
        
        for (const userId of participants) {
          const messageCount = await this.getUserMessageCountInCurrentPhase(conversationId, userId, phase);
          
          if (messageCount < phaseConfig.messageRules.minMessagesPerUser) {
            met = false;
            details.push(`User needs ${phaseConfig.messageRules.minMessagesPerUser - messageCount} more messages`);
          } else {
            details.push(`User has met minimum message requirement`);
          }
        }
      }
    }

    if (met && details.length === 0) {
      details.push('All requirements met');
    }

    return { met, details };
  }

  private async getUserMessageCountInCurrentPhase(
    conversationId: string, 
    userId: string, 
    phase: DebatePhase
  ): Promise<number> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return 0;

    // Get phase start time from metadata or conversation update time
    const phaseStartTime = this.phaseStartTimes.get(conversationId) || conversation.updated_at;

    const count = await this.prisma.message.count({
      where: {
        conversation_id: conversationId,
        user_id: userId,
        created_at: { gte: phaseStartTime },
        content_type: MessageContentType.TEXT,
        status: { not: 'DELETED' },
      },
    });

    return count;
  }

  private async validateTurnOrder(conversationId: string, userId: string): Promise<boolean> {
    // Get the last message in the conversation
    const lastMessage = await this.prisma.message.findFirst({
      where: {
        conversation_id: conversationId,
        content_type: MessageContentType.TEXT,
        status: { not: 'DELETED' },
      },
      orderBy: { created_at: 'desc' },
    });

    // If no messages or last message was from the other user, turn is valid
    return !lastMessage || lastMessage.user_id !== userId;
  }

  private getNextPhase(currentPhase: DebatePhase): DebatePhase | null {
    const phaseOrder: DebatePhase[] = [
      DebatePhase.PREPARATION,
      DebatePhase.OPENING,
      DebatePhase.DISCUSSION,
      DebatePhase.REBUTTAL,
      DebatePhase.CLOSING,
      DebatePhase.REFLECTION,
    ];

    const currentIndex = phaseOrder.indexOf(currentPhase);
    return currentIndex < phaseOrder.length - 1 ? phaseOrder[currentIndex + 1] : null;
  }

  private setupPhaseTimer(conversationId: string, phase: DebatePhase, durationMinutes: number): void {
    // Clear existing timer
    const existingTimer = this.phaseTimers.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        await this.handlePhaseTimeout(conversationId, phase);
      } catch (error) {
        this.logger.error(`Error handling phase timeout for ${conversationId}:`, error);
      }
    }, durationMinutes * 60 * 1000);

    this.phaseTimers.set(conversationId, timer);
    this.logger.debug(`Phase timer set for ${conversationId}: ${durationMinutes} minutes`);
  }

  private async handlePhaseTimeout(conversationId: string, phase: DebatePhase): Promise<void> {
    this.logger.log(`Phase ${phase} timed out for conversation ${conversationId}`);

    // Remove timer
    this.phaseTimers.delete(conversationId);

    // Check if we can advance to next phase
    const canAdvance = await this.canAdvanceFromPhase(conversationId, phase);
    
    if (canAdvance) {
      const nextPhase = this.getNextPhase(phase);
      if (nextPhase) {
        await this.startPhase(conversationId, nextPhase);
      }
    } else {
      // Notify participants that phase expired but couldn't advance
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { match: true },
      });

      if (conversation) {
        const participantIds = [conversation.match.student1_id, conversation.match.student2_id];
        await this.broadcastPhaseUpdate(conversationId, phase, participantIds, {
          type: 'timeout',
          message: 'Phase time expired - please complete requirements to advance',
        });
      }
    }
  }

  private async broadcastPhaseChange(
    conversationId: string,
    phase: DebatePhase,
    participantIds: string[]
  ): Promise<void> {
    const phaseConfig = this.phaseConfigs[phase];
    const timer = await this.getPhaseTimer(conversationId);

    const systemMessage = {
      id: `phase-${phase}-${Date.now()}`,
      conversationId,
      userId: 'system',
      content: `Phase changed to: ${phaseConfig.description}`,
      contentType: MessageContentType.SYSTEM,
      status: 'SENT' as const,
      createdAt: new Date(),
      messageMetadata: {
        phaseChange: {
          phase,
          config: phaseConfig,
          timer,
        },
      },
    };

    await this.messageBroadcastService.broadcastMessage(systemMessage as any, participantIds);
  }

  private async broadcastPhaseUpdate(
    conversationId: string,
    phase: DebatePhase,
    participantIds: string[],
    update: any
  ): Promise<void> {
    const systemMessage = {
      id: `phase-update-${Date.now()}`,
      conversationId,
      userId: 'system',
      content: `Phase Update: ${update.message || JSON.stringify(update)}`,
      contentType: MessageContentType.SYSTEM,
      status: 'SENT' as const,
      createdAt: new Date(),
      messageMetadata: {
        phaseUpdate: {
          phase,
          update,
        },
      },
    };

    await this.messageBroadcastService.broadcastMessage(systemMessage as any, participantIds);
  }

  // Cleanup method to clear timers when service shuts down
  onModuleDestroy() {
    for (const [conversationId, timer] of this.phaseTimers.entries()) {
      clearTimeout(timer);
      this.logger.debug(`Cleared timer for conversation ${conversationId}`);
    }
    this.phaseTimers.clear();
    this.phaseStartTimes.clear();
  }
}
