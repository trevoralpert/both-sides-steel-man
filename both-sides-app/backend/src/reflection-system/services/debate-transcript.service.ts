import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationStatus, DebatePhase, MessageContentType, MessageStatus, ModerationStatus } from '@prisma/client';

/**
 * Interface for debate participant information
 */
export interface DebateParticipant {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string; // student1 or student2
  position: string | null; // PRO or CON
}

/**
 * Interface for debate message with enhanced metadata
 */
export interface DebateMessage {
  id: string;
  content: string;
  content_type: MessageContentType;
  created_at: Date;
  updated_at: Date;
  edited_at: Date | null;
  status: MessageStatus;
  moderation_status: ModerationStatus;
  message_metadata: any;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  reply_to_id: string | null;
  reply_to?: DebateMessage | null;
  // Analysis metadata
  word_count?: number;
  character_count?: number;
  reading_time_seconds?: number;
}

/**
 * Interface for complete debate transcript
 */
export interface DebateTranscript {
  id: string;
  match_id: string;
  status: ConversationStatus;
  debate_phase: DebatePhase;
  started_at: Date | null;
  ended_at: Date | null;
  duration_minutes: number | null;
  participants: DebateParticipant[];
  topic: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty_level: number;
  } | null;
  messages: DebateMessage[];
  phase_history: any[];
  metadata: {
    total_messages: number;
    messages_by_participant: Record<string, number>;
    phase_durations: Record<string, number>;
    engagement_metrics: {
      avg_message_length: number;
      total_exchanges: number;
      response_times_avg: number;
    };
  };
}

/**
 * Interface for participant-specific messages
 */
export interface ParticipantMessages {
  participant: DebateParticipant;
  messages: DebateMessage[];
  statistics: {
    total_messages: number;
    avg_message_length: number;
    total_word_count: number;
    first_message_at: Date | null;
    last_message_at: Date | null;
    response_times: number[]; // in seconds
    avg_response_time: number;
  };
}

/**
 * Interface for debate metadata
 */
export interface DebateMetadata {
  conversation_id: string;
  match_id: string;
  class_id: string;
  topic_id: string | null;
  status: ConversationStatus;
  debate_phase: DebatePhase;
  started_at: Date | null;
  ended_at: Date | null;
  duration_minutes: number | null;
  participants: DebateParticipant[];
  topic: {
    title: string;
    category: string;
    difficulty_level: number;
  } | null;
  completion_status: {
    is_completed: boolean;
    completion_percentage: number;
    phases_completed: string[];
  };
  quality_indicators: {
    message_count: number;
    participant_balance: number; // 0-1, how balanced the participation was
    avg_message_quality: number | null;
    has_substantial_content: boolean;
  };
}

@Injectable()
export class DebateTranscriptService {
  private readonly logger = new Logger(DebateTranscriptService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get complete debate transcript for analysis
   */
  async getDebateTranscript(conversationId: string): Promise<DebateTranscript> {
    this.logger.debug(`Getting debate transcript for conversation: ${conversationId}`);

    // Get conversation with full data
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
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        messages: {
          where: {
            status: {
              not: MessageStatus.DELETED,
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
            reply_to: {
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
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
        debate_sessions: {
          select: {
            phase_history: true,
            performance_metrics: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Debate conversation not found: ${conversationId}`);
    }

    // Build participants array
    const participants: DebateParticipant[] = [
      {
        id: conversation.match.student1.id,
        first_name: conversation.match.student1.first_name,
        last_name: conversation.match.student1.last_name,
        avatar_url: conversation.match.student1.avatar_url,
        role: 'student1',
        position: conversation.match.student1_position,
      },
      {
        id: conversation.match.student2.id,
        first_name: conversation.match.student2.first_name,
        last_name: conversation.match.student2.last_name,
        avatar_url: conversation.match.student2.avatar_url,
        role: 'student2',
        position: conversation.match.student2_position,
      },
    ];

    // Process messages with enhanced metadata
    const messages: DebateMessage[] = conversation.messages.map((msg) => {
      const content = msg.content;
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      const characterCount = content.length;
      const readingTimeSeconds = Math.max(1, Math.ceil(wordCount / 200 * 60)); // ~200 WPM

      return {
        id: msg.id,
        content: msg.content,
        content_type: msg.content_type,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        edited_at: msg.edited_at,
        status: msg.status,
        moderation_status: msg.moderation_status,
        message_metadata: msg.message_metadata,
        user: msg.user,
        reply_to_id: msg.reply_to_id,
        reply_to: msg.reply_to ? {
          id: msg.reply_to.id,
          content: msg.reply_to.content,
          content_type: msg.reply_to.content_type,
          created_at: msg.reply_to.created_at,
          updated_at: msg.reply_to.updated_at,
          edited_at: msg.reply_to.edited_at,
          status: msg.reply_to.status,
          moderation_status: msg.reply_to.moderation_status,
          message_metadata: msg.reply_to.message_metadata,
          user: msg.reply_to.user,
          reply_to_id: msg.reply_to.reply_to_id,
        } : null,
        word_count: wordCount,
        character_count: characterCount,
        reading_time_seconds: readingTimeSeconds,
      };
    });

    // Calculate duration
    const durationMinutes = conversation.started_at && conversation.ended_at
      ? Math.round((conversation.ended_at.getTime() - conversation.started_at.getTime()) / (1000 * 60))
      : null;

    // Calculate metadata
    const messagesByParticipant = messages.reduce((acc, msg) => {
      acc[msg.user.id] = (acc[msg.user.id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgMessageLength = messages.length > 0
      ? messages.reduce((sum, msg) => sum + msg.word_count!, 0) / messages.length
      : 0;

    const responseTimes = this.calculateResponseTimes(messages);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Extract phase history
    const phaseHistory = conversation.debate_sessions[0]?.phase_history || [];

    const transcript: DebateTranscript = {
      id: conversation.id,
      match_id: conversation.match_id,
      status: conversation.status,
      debate_phase: conversation.debate_phase,
      started_at: conversation.started_at,
      ended_at: conversation.ended_at,
      duration_minutes: durationMinutes,
      participants,
      topic: conversation.match.topic ? {
        id: conversation.match.topic.id,
        title: conversation.match.topic.title,
        description: conversation.match.topic.description,
        category: conversation.match.topic.category,
        difficulty_level: conversation.match.topic.difficulty_level,
      } : null,
      messages,
      phase_history: phaseHistory,
      metadata: {
        total_messages: messages.length,
        messages_by_participant: messagesByParticipant,
        phase_durations: this.extractPhaseDurations(phaseHistory),
        engagement_metrics: {
          avg_message_length: avgMessageLength,
          total_exchanges: Math.floor(messages.length / 2),
          response_times_avg: avgResponseTime,
        },
      },
    };

    this.logger.debug(`Retrieved transcript with ${messages.length} messages for conversation: ${conversationId}`);
    return transcript;
  }

  /**
   * Get messages for a specific participant
   */
  async getParticipantMessages(conversationId: string, userId: string): Promise<ParticipantMessages> {
    this.logger.debug(`Getting participant messages for user: ${userId} in conversation: ${conversationId}`);

    const transcript = await this.getDebateTranscript(conversationId);
    const participant = transcript.participants.find(p => p.id === userId);

    if (!participant) {
      throw new NotFoundException(`Participant not found in conversation: ${conversationId}`);
    }

    const participantMessages = transcript.messages.filter(msg => msg.user.id === userId);

    // Calculate participant statistics
    const totalWordCount = participantMessages.reduce((sum, msg) => sum + (msg.word_count || 0), 0);
    const avgMessageLength = participantMessages.length > 0 ? totalWordCount / participantMessages.length : 0;

    const messageTimes = participantMessages.map(msg => msg.created_at).sort();
    const firstMessageAt = messageTimes[0] || null;
    const lastMessageAt = messageTimes[messageTimes.length - 1] || null;

    const responseTimes = this.calculateParticipantResponseTimes(transcript.messages, userId);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      participant,
      messages: participantMessages,
      statistics: {
        total_messages: participantMessages.length,
        avg_message_length: avgMessageLength,
        total_word_count: totalWordCount,
        first_message_at: firstMessageAt,
        last_message_at: lastMessageAt,
        response_times: responseTimes,
        avg_response_time: avgResponseTime,
      },
    };
  }

  /**
   * Get debate metadata without full message content
   */
  async getDebateMetadata(conversationId: string): Promise<DebateMetadata> {
    this.logger.debug(`Getting debate metadata for conversation: ${conversationId}`);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: {
          include: {
            topic: {
              select: {
                id: true,
                title: true,
                category: true,
                difficulty_level: true,
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
            class: {
              select: {
                id: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                status: {
                  not: MessageStatus.DELETED,
                },
              },
            },
          },
        },
        debate_sessions: {
          select: {
            phase_history: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Debate conversation not found: ${conversationId}`);
    }

    // Build participants array
    const participants: DebateParticipant[] = [
      {
        id: conversation.match.student1.id,
        first_name: conversation.match.student1.first_name,
        last_name: conversation.match.student1.last_name,
        avatar_url: conversation.match.student1.avatar_url,
        role: 'student1',
        position: conversation.match.student1_position,
      },
      {
        id: conversation.match.student2.id,
        first_name: conversation.match.student2.first_name,
        last_name: conversation.match.student2.last_name,
        avatar_url: conversation.match.student2.avatar_url,
        role: 'student2',
        position: conversation.match.student2_position,
      },
    ];

    // Calculate duration
    const durationMinutes = conversation.started_at && conversation.ended_at
      ? Math.round((conversation.ended_at.getTime() - conversation.started_at.getTime()) / (1000 * 60))
      : null;

    // Determine completion status
    const phaseHistory = conversation.debate_sessions[0]?.phase_history || [];
    const phasesCompleted = this.extractCompletedPhases(phaseHistory);
    const isCompleted = conversation.status === ConversationStatus.COMPLETED;
    const completionPercentage = this.calculateCompletionPercentage(conversation.debate_phase, phasesCompleted);

    // Get message count for participant balance
    const messageCount = conversation._count.messages;
    
    // Calculate participant balance (would need actual message counts per participant for accuracy)
    const participantBalance = 0.5; // Placeholder - would calculate from actual message distribution

    return {
      conversation_id: conversation.id,
      match_id: conversation.match_id,
      class_id: conversation.match.class.id,
      topic_id: conversation.match.topic?.id || null,
      status: conversation.status,
      debate_phase: conversation.debate_phase,
      started_at: conversation.started_at,
      ended_at: conversation.ended_at,
      duration_minutes: durationMinutes,
      participants,
      topic: conversation.match.topic ? {
        title: conversation.match.topic.title,
        category: conversation.match.topic.category,
        difficulty_level: conversation.match.topic.difficulty_level,
      } : null,
      completion_status: {
        is_completed: isCompleted,
        completion_percentage: completionPercentage,
        phases_completed: phasesCompleted,
      },
      quality_indicators: {
        message_count: messageCount,
        participant_balance: participantBalance,
        avg_message_quality: null, // Would be calculated from message analysis
        has_substantial_content: messageCount >= 10, // Heuristic for substantial debate
      },
    };
  }

  /**
   * Calculate response times between messages
   */
  private calculateResponseTimes(messages: DebateMessage[]): number[] {
    const responseTimes: number[] = [];
    
    for (let i = 1; i < messages.length; i++) {
      const currentMsg = messages[i];
      const previousMsg = messages[i - 1];
      
      // Only calculate response time if messages are from different users
      if (currentMsg.user.id !== previousMsg.user.id) {
        const responseTime = (currentMsg.created_at.getTime() - previousMsg.created_at.getTime()) / 1000;
        responseTimes.push(responseTime);
      }
    }
    
    return responseTimes;
  }

  /**
   * Calculate response times for a specific participant
   */
  private calculateParticipantResponseTimes(messages: DebateMessage[], userId: string): number[] {
    const responseTimes: number[] = [];
    
    for (let i = 1; i < messages.length; i++) {
      const currentMsg = messages[i];
      const previousMsg = messages[i - 1];
      
      // Only calculate if current message is from the user and previous is from someone else
      if (currentMsg.user.id === userId && previousMsg.user.id !== userId) {
        const responseTime = (currentMsg.created_at.getTime() - previousMsg.created_at.getTime()) / 1000;
        responseTimes.push(responseTime);
      }
    }
    
    return responseTimes;
  }

  /**
   * Extract phase durations from phase history
   */
  private extractPhaseDurations(phaseHistory: any[]): Record<string, number> {
    const phaseDurations: Record<string, number> = {};
    
    for (let i = 0; i < phaseHistory.length - 1; i++) {
      const currentPhase = phaseHistory[i];
      const nextPhase = phaseHistory[i + 1];
      
      if (currentPhase.phase && currentPhase.timestamp && nextPhase.timestamp) {
        const duration = (new Date(nextPhase.timestamp).getTime() - new Date(currentPhase.timestamp).getTime()) / (1000 * 60);
        phaseDurations[currentPhase.phase] = duration;
      }
    }
    
    return phaseDurations;
  }

  /**
   * Extract completed phases from phase history
   */
  private extractCompletedPhases(phaseHistory: any[]): string[] {
    return phaseHistory
      .filter(entry => entry.phase && entry.completed)
      .map(entry => entry.phase);
  }

  /**
   * Calculate completion percentage based on current phase and history
   */
  private calculateCompletionPercentage(currentPhase: DebatePhase, completedPhases: string[]): number {
    const phaseOrder = [
      DebatePhase.PREPARATION,
      DebatePhase.OPENING,
      DebatePhase.DISCUSSION,
      DebatePhase.REBUTTAL,
      DebatePhase.CLOSING,
      DebatePhase.REFLECTION,
    ];

    const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
    const basePercentage = (currentPhaseIndex / phaseOrder.length) * 100;
    
    // Add bonus for completed phases
    const completedBonus = (completedPhases.length / phaseOrder.length) * 10;
    
    return Math.min(100, basePercentage + completedBonus);
  }

  /**
   * Check if a debate is ready for analysis
   */
  async isDebateReadyForAnalysis(conversationId: string): Promise<boolean> {
    const metadata = await this.getDebateMetadata(conversationId);
    
    return (
      metadata.status === ConversationStatus.COMPLETED ||
      metadata.quality_indicators.has_substantial_content
    );
  }

  /**
   * Get debates ready for analysis for a specific class
   */
  async getDebatesReadyForAnalysis(classId: string): Promise<DebateMetadata[]> {
    this.logger.debug(`Getting debates ready for analysis for class: ${classId}`);

    const conversations = await this.prisma.conversation.findMany({
      where: {
        match: {
          class_id: classId,
        },
        OR: [
          { status: ConversationStatus.COMPLETED },
          {
            AND: [
              { status: ConversationStatus.ACTIVE },
              {
                messages: {
                  some: {
                    status: {
                      not: MessageStatus.DELETED,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
      },
    });

    const debateMetadata: DebateMetadata[] = [];
    
    for (const conversation of conversations) {
      try {
        const metadata = await this.getDebateMetadata(conversation.id);
        if (metadata.quality_indicators.has_substantial_content) {
          debateMetadata.push(metadata);
        }
      } catch (error) {
        this.logger.warn(`Failed to get metadata for conversation ${conversation.id}: ${error.message}`);
      }
    }

    return debateMetadata;
  }
}
