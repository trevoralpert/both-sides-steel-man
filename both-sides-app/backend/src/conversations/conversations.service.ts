import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationResponseDto } from './dto/message-response.dto';
import { ConversationStatus, DebatePhase, MatchStatus } from '@prisma/client';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new conversation from an accepted match
   */
  async createConversation(createConversationDto: CreateConversationDto): Promise<ConversationResponseDto> {
    const { matchId, conversationMetadata } = createConversationDto;

    // Verify match exists and is accepted
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        topic: true,
        student1: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
          },
        },
        student2: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== MatchStatus.ACCEPTED) {
      throw new BadRequestException('Can only create conversations from accepted matches');
    }

    // Check if conversation already exists for this match
    const existingConversation = await this.prisma.conversation.findUnique({
      where: { match_id: matchId },
    });

    if (existingConversation) {
      throw new BadRequestException('Conversation already exists for this match');
    }

    // Set default conversation metadata
    const defaultMetadata = {
      rules: {
        maxMessagesPerPhase: 50,
        maxMessageLength: 5000,
        allowReplies: true,
        moderationLevel: 'moderate',
      },
      settings: {
        autoAdvancePhases: false,
        notificationsEnabled: true,
        coachingEnabled: true,
      },
      participants: [
        {
          userId: match.student1_id,
          role: 'participant',
          position: match.student1_position,
          joinedAt: new Date(),
        },
        {
          userId: match.student2_id,
          role: 'participant',
          position: match.student2_position,
          joinedAt: new Date(),
        },
      ],
      ...conversationMetadata,
    };

    // Create the conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        match_id: matchId,
        status: ConversationStatus.PREPARING,
        debate_phase: DebatePhase.PREPARATION,
        conversation_metadata: defaultMetadata,
      },
      include: {
        match: {
          include: {
            topic: true,
            student1: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
            student2: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
        debate_sessions: true,
      },
    });

    // Create initial debate session
    await this.prisma.debateSession.create({
      data: {
        conversation_id: conversation.id,
        session_config: {
          phaseTimeouts: {
            PREPARATION: 5 * 60 * 1000, // 5 minutes
            OPENING: 10 * 60 * 1000, // 10 minutes
            DISCUSSION: 30 * 60 * 1000, // 30 minutes
            REBUTTAL: 15 * 60 * 1000, // 15 minutes
            CLOSING: 10 * 60 * 1000, // 10 minutes
            REFLECTION: 10 * 60 * 1000, // 10 minutes
          },
          rules: defaultMetadata.rules,
        },
        participant_states: {
          [match.student1_id]: {
            status: 'preparing',
            readyToStart: false,
            lastActivity: new Date(),
          },
          [match.student2_id]: {
            status: 'preparing',
            readyToStart: false,
            lastActivity: new Date(),
          },
        },
        phase_history: [],
        performance_metrics: {
          messagesCount: 0,
          participantEngagement: {},
          phaseMetrics: {},
        },
      },
    });

    return this.transformToConversationResponseDto(conversation);
  }

  /**
   * Get conversation by ID with access control
   */
  async getConversationById(conversationId: string, userId: string): Promise<ConversationResponseDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: {
          include: {
            topic: true,
            student1: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
            student2: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
        messages: {
          where: {
            status: {
              not: 'DELETED',
            },
          },
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
          take: 50, // Limit initial load
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user has access
    const isParticipant = 
      conversation.match.student1_id === userId || 
      conversation.match.student2_id === userId;

    if (!isParticipant) {
      throw new BadRequestException('Access denied: User is not a participant in this conversation');
    }

    return this.transformToConversationResponseDto(conversation);
  }

  /**
   * Get all conversations for a user
   */
  async getConversationsForUser(userId: string, limit: number = 20): Promise<ConversationResponseDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        match: {
          OR: [
            { student1_id: userId },
            { student2_id: userId },
          ],
        },
      },
      include: {
        match: {
          include: {
            topic: {
              select: {
                id: true,
                title: true,
                description: true,
                category: true,
              },
            },
            student1: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
            student2: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
        messages: {
          where: {
            status: {
              not: 'DELETED',
            },
          },
          orderBy: { created_at: 'desc' },
          take: 1, // Just get the latest message for preview
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
      take: limit,
    });

    return conversations.map(conversation => this.transformToConversationResponseDto(conversation));
  }

  /**
   * Start a conversation (move from PREPARING to ACTIVE)
   */
  async startConversation(conversationId: string, userId: string): Promise<ConversationResponseDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: true,
        debate_sessions: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = 
      conversation.match.student1_id === userId || 
      conversation.match.student2_id === userId;

    if (!isParticipant) {
      throw new BadRequestException('Access denied: User is not a participant in this conversation');
    }

    if (conversation.status !== ConversationStatus.PREPARING) {
      throw new BadRequestException('Conversation can only be started from PREPARING status');
    }

    // Check if both participants are ready (this would be tracked in debate session)
    const debateSession = conversation.debate_sessions[0];
    const participantStates = debateSession?.participant_states as any;

    if (participantStates) {
      const student1Ready = participantStates[conversation.match.student1_id]?.readyToStart;
      const student2Ready = participantStates[conversation.match.student2_id]?.readyToStart;

      if (!student1Ready || !student2Ready) {
        throw new BadRequestException('Both participants must be ready before starting the conversation');
      }
    }

    // Update conversation to active and move to opening phase
    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.ACTIVE,
        debate_phase: DebatePhase.OPENING,
        started_at: new Date(),
        phase_deadline: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes for opening
      },
      include: {
        match: {
          include: {
            topic: true,
            student1: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
            student2: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
      },
    });

    // Update debate session
    if (debateSession) {
      await this.prisma.debateSession.update({
        where: { id: debateSession.id },
        data: {
          phase_history: [
            ...(debateSession.phase_history as any[]),
            {
              phase: DebatePhase.OPENING,
              startedAt: new Date(),
              startedBy: userId,
            },
          ],
        },
      });
    }

    return this.transformToConversationResponseDto(updatedConversation);
  }

  /**
   * Mark user as ready to start
   */
  async markUserReady(conversationId: string, userId: string): Promise<{ ready: boolean; bothReady: boolean }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: true,
        debate_sessions: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = 
      conversation.match.student1_id === userId || 
      conversation.match.student2_id === userId;

    if (!isParticipant) {
      throw new BadRequestException('Access denied: User is not a participant in this conversation');
    }

    const debateSession = conversation.debate_sessions[0];
    if (!debateSession) {
      throw new BadRequestException('Debate session not found');
    }

    const participantStates = { ...debateSession.participant_states } as any;
    participantStates[userId] = {
      ...participantStates[userId],
      readyToStart: true,
      lastActivity: new Date(),
    };

    await this.prisma.debateSession.update({
      where: { id: debateSession.id },
      data: {
        participant_states: participantStates,
      },
    });

    const student1Ready = participantStates[conversation.match.student1_id]?.readyToStart;
    const student2Ready = participantStates[conversation.match.student2_id]?.readyToStart;
    const bothReady = student1Ready && student2Ready;

    return {
      ready: true,
      bothReady,
    };
  }

  private transformToConversationResponseDto(conversation: any): ConversationResponseDto {
    return {
      id: conversation.id,
      matchId: conversation.match_id,
      status: conversation.status,
      debatePhase: conversation.debate_phase,
      phaseDeadline: conversation.phase_deadline,
      startedAt: conversation.started_at,
      endedAt: conversation.ended_at,
      conversationMetadata: conversation.conversation_metadata,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      match: conversation.match ? {
        id: conversation.match.id,
        topicId: conversation.match.topic_id,
        student1Position: conversation.match.student1_position,
        student2Position: conversation.match.student2_position,
        topic: conversation.match.topic ? {
          id: conversation.match.topic.id,
          title: conversation.match.topic.title,
          description: conversation.match.topic.description,
          category: conversation.match.topic.category,
        } : undefined,
        student1: conversation.match.student1 ? {
          id: conversation.match.student1.id,
          firstName: conversation.match.student1.first_name,
          lastName: conversation.match.student1.last_name,
        } : undefined,
        student2: conversation.match.student2 ? {
          id: conversation.match.student2.id,
          firstName: conversation.match.student2.first_name,
          lastName: conversation.match.student2.last_name,
        } : undefined,
      } : undefined,
      messages: conversation.messages?.map((message: any) => ({
        id: message.id,
        conversationId: message.conversation_id,
        userId: message.user_id,
        content: message.content,
        contentType: message.content_type,
        messageMetadata: message.message_metadata,
        replyToId: message.reply_to_id,
        status: message.status,
        moderationStatus: message.moderation_status,
        createdAt: message.created_at,
        updatedAt: message.updated_at,
        editedAt: message.edited_at,
        user: message.user ? {
          id: message.user.id,
          firstName: message.user.first_name,
          lastName: message.user.last_name,
          avatarUrl: message.user.avatar_url,
        } : undefined,
      })) || [],
    };
  }
}
