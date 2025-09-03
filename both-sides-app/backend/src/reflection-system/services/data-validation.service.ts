import { Injectable, Logger } from '@nestjs/common';
import { 
  DebateTranscript, 
  DebateMessage, 
  DebateParticipant,
  DebateMetadata 
} from './debate-transcript.service';
import { ConversationStatus, DebatePhase, MessageContentType, MessageStatus, ModerationStatus } from '@prisma/client';

/**
 * Interface for validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
  qualityScore: number; // 0-1
  metadata: {
    validation_timestamp: Date;
    validation_version: string;
    checks_performed: string[];
  };
}

/**
 * Interface for content sanitization result
 */
export interface SanitizationResult {
  original: string;
  sanitized: string;
  removed_elements: string[];
  safety_score: number; // 0-1, higher is safer
  contains_pii: boolean;
  educational_appropriateness: number; // 0-1
}

/**
 * Interface for quality assessment
 */
export interface QualityAssessment {
  overall_score: number; // 0-1
  completeness: number; // 0-1
  coherence: number; // 0-1
  educational_value: number; // 0-1
  participant_engagement: number; // 0-1
  content_depth: number; // 0-1
  issues: Array<{
    type: 'critical' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }>;
}

/**
 * Service for validating and sanitizing debate transcript data
 */
@Injectable()
export class DataValidationService {
  private readonly logger = new Logger(DataValidationService.name);

  private readonly VALIDATION_VERSION = '1.0';
  private readonly MIN_MESSAGE_LENGTH = 5;
  private readonly MAX_MESSAGE_LENGTH = 5000;
  private readonly MIN_DEBATE_MESSAGES = 4; // At least 2 messages per participant
  private readonly MIN_SUBSTANTIAL_MESSAGES = 10;

  // PII patterns to detect and sanitize
  private readonly PII_PATTERNS = [
    { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
    { name: 'phone', pattern: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g },
    { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
    { name: 'address', pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi },
  ];

  // Inappropriate content patterns
  private readonly INAPPROPRIATE_PATTERNS = [
    { name: 'profanity', pattern: /\b(?:damn|hell|crap)\b/gi, severity: 'low' },
    { name: 'harassment', pattern: /\b(?:stupid|idiot|moron|dumb)\b/gi, severity: 'medium' },
    { name: 'hate_speech', pattern: /\b(?:hate|despise)\s+(?:you|them|him|her)\b/gi, severity: 'high' },
  ];

  /**
   * Validate complete debate transcript
   */
  async validateDebateTranscript(transcript: DebateTranscript): Promise<ValidationResult> {
    this.logger.debug(`Validating debate transcript: ${transcript.id}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const checksPerformed: string[] = [];

    // Basic structure validation
    const structureValidation = this.validateTranscriptStructure(transcript);
    errors.push(...structureValidation.errors);
    warnings.push(...structureValidation.warnings);
    checksPerformed.push('structure_validation');

    // Participant validation
    const participantValidation = this.validateParticipants(transcript.participants);
    errors.push(...participantValidation.errors);
    warnings.push(...participantValidation.warnings);
    checksPerformed.push('participant_validation');

    // Message validation
    const messageValidation = this.validateMessages(transcript.messages);
    errors.push(...messageValidation.errors);
    warnings.push(...messageValidation.warnings);
    checksPerformed.push('message_validation');

    // Content appropriateness validation
    const contentValidation = this.validateContentAppropriateness(transcript.messages);
    errors.push(...contentValidation.errors);
    warnings.push(...contentValidation.warnings);
    checksPerformed.push('content_validation');

    // Quality assessment
    const qualityAssessment = this.assessTranscriptQuality(transcript);
    if (qualityAssessment.overall_score < 0.3) {
      errors.push(`Low quality transcript (score: ${qualityAssessment.overall_score.toFixed(2)})`);
    }
    checksPerformed.push('quality_assessment');

    // Sanitize the transcript data
    const sanitizedTranscript = this.sanitizeTranscript(transcript);
    checksPerformed.push('data_sanitization');

    const isValid = errors.length === 0;
    const qualityScore = qualityAssessment.overall_score;

    return {
      isValid,
      errors,
      warnings,
      sanitizedData: sanitizedTranscript,
      qualityScore,
      metadata: {
        validation_timestamp: new Date(),
        validation_version: this.VALIDATION_VERSION,
        checks_performed: checksPerformed,
      },
    };
  }

  /**
   * Validate individual debate message
   */
  validateDebateMessage(message: DebateMessage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checksPerformed: string[] = [];

    // Basic message structure
    if (!message.id || !message.content || !message.user) {
      errors.push('Message missing required fields');
    }
    checksPerformed.push('structure_check');

    // Content length validation
    if (message.content.length < this.MIN_MESSAGE_LENGTH) {
      warnings.push(`Message too short (${message.content.length} chars)`);
    }
    if (message.content.length > this.MAX_MESSAGE_LENGTH) {
      errors.push(`Message too long (${message.content.length} chars)`);
    }
    checksPerformed.push('length_check');

    // Status validation
    if (message.status === MessageStatus.DELETED) {
      errors.push('Cannot process deleted message');
    }
    if (message.moderation_status === ModerationStatus.BLOCKED) {
      errors.push('Cannot process blocked message');
    }
    checksPerformed.push('status_check');

    // Content type validation
    if (message.content_type !== MessageContentType.TEXT) {
      warnings.push(`Non-text content type: ${message.content_type}`);
    }
    checksPerformed.push('content_type_check');

    // Content sanitization
    const sanitized = this.sanitizeMessageContent(message.content);
    checksPerformed.push('content_sanitization');

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: {
        ...message,
        content: sanitized.sanitized,
        _sanitization_info: sanitized,
      },
      qualityScore: this.calculateMessageQualityScore(message),
      metadata: {
        validation_timestamp: new Date(),
        validation_version: this.VALIDATION_VERSION,
        checks_performed: checksPerformed,
      },
    };
  }

  /**
   * Validate debate metadata
   */
  validateDebateMetadata(metadata: DebateMetadata): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!metadata.conversation_id || !metadata.match_id) {
      errors.push('Missing required metadata identifiers');
    }

    // Status validation
    if (metadata.status === ConversationStatus.CANCELLED) {
      warnings.push('Debate was cancelled');
    }

    // Completion validation
    if (!metadata.completion_status.is_completed && metadata.quality_indicators.message_count < this.MIN_SUBSTANTIAL_MESSAGES) {
      warnings.push('Incomplete debate with insufficient content');
    }

    // Quality indicators
    if (metadata.quality_indicators.participant_balance < 0.3) {
      warnings.push('Highly unbalanced participation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore: this.calculateMetadataQualityScore(metadata),
      metadata: {
        validation_timestamp: new Date(),
        validation_version: this.VALIDATION_VERSION,
        checks_performed: ['metadata_validation'],
      },
    };
  }

  /**
   * Sanitize message content for AI processing
   */
  sanitizeMessageContent(content: string): SanitizationResult {
    let sanitized = content;
    const removedElements: string[] = [];
    let containsPii = false;

    // Remove PII
    for (const piiPattern of this.PII_PATTERNS) {
      const matches = sanitized.match(piiPattern.pattern);
      if (matches) {
        containsPii = true;
        sanitized = sanitized.replace(piiPattern.pattern, `[${piiPattern.name.toUpperCase()}_REDACTED]`);
        removedElements.push(`${piiPattern.name}: ${matches.length} instances`);
      }
    }

    // Clean inappropriate content
    let inappropriateScore = 1.0;
    for (const pattern of this.INAPPROPRIATE_PATTERNS) {
      const matches = sanitized.match(pattern.pattern);
      if (matches) {
        removedElements.push(`${pattern.name}: ${matches.length} instances`);
        if (pattern.severity === 'high') {
          inappropriateScore -= 0.4;
          sanitized = sanitized.replace(pattern.pattern, '[INAPPROPRIATE_CONTENT_REMOVED]');
        } else if (pattern.severity === 'medium') {
          inappropriateScore -= 0.2;
          sanitized = sanitized.replace(pattern.pattern, '[CONTENT_FILTERED]');
        } else {
          inappropriateScore -= 0.1;
        }
      }
    }

    // Clean formatting and normalize whitespace
    sanitized = sanitized
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.\!\?\,\;\:\-\(\)]/g, '')
      .trim();

    // Calculate educational appropriateness
    const educationalAppropriatenesss = this.calculateEducationalAppropriateness(sanitized);

    return {
      original: content,
      sanitized,
      removed_elements: removedElements,
      safety_score: Math.max(0, inappropriateScore),
      contains_pii: containsPii,
      educational_appropriateness: educationalAppropriatenesss,
    };
  }

  /**
   * Assess overall transcript quality
   */
  assessTranscriptQuality(transcript: DebateTranscript): QualityAssessment {
    const issues: QualityAssessment['issues'] = [];

    // Completeness assessment
    const completeness = this.assessCompleteness(transcript, issues);

    // Coherence assessment
    const coherence = this.assessCoherence(transcript, issues);

    // Educational value assessment
    const educationalValue = this.assessEducationalValue(transcript, issues);

    // Participant engagement assessment
    const participantEngagement = this.assessParticipantEngagement(transcript, issues);

    // Content depth assessment
    const contentDepth = this.assessContentDepth(transcript, issues);

    // Calculate overall score
    const overallScore = (
      completeness * 0.2 +
      coherence * 0.2 +
      educationalValue * 0.25 +
      participantEngagement * 0.2 +
      contentDepth * 0.15
    );

    return {
      overall_score: overallScore,
      completeness,
      coherence,
      educational_value: educationalValue,
      participant_engagement: participantEngagement,
      content_depth: contentDepth,
      issues,
    };
  }

  // Private helper methods

  private validateTranscriptStructure(transcript: DebateTranscript): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!transcript.id) errors.push('Missing conversation ID');
    if (!transcript.match_id) errors.push('Missing match ID');
    if (!transcript.participants || transcript.participants.length !== 2) {
      errors.push('Invalid participant count');
    }
    if (!transcript.messages || transcript.messages.length === 0) {
      errors.push('No messages found');
    }

    if (transcript.status === ConversationStatus.CANCELLED) {
      warnings.push('Debate was cancelled');
    }

    if (!transcript.topic) {
      warnings.push('No topic information available');
    }

    return { errors, warnings };
  }

  private validateParticipants(participants: DebateParticipant[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (participants.length !== 2) {
      errors.push(`Expected 2 participants, found ${participants.length}`);
    }

    for (const participant of participants) {
      if (!participant.id) {
        errors.push('Participant missing ID');
      }
      if (!participant.first_name && !participant.last_name) {
        warnings.push(`Participant ${participant.id} has no name information`);
      }
      if (!participant.position) {
        warnings.push(`Participant ${participant.id} has no debate position assigned`);
      }
    }

    // Check for duplicate participants
    const participantIds = participants.map(p => p.id);
    if (new Set(participantIds).size !== participantIds.length) {
      errors.push('Duplicate participants found');
    }

    return { errors, warnings };
  }

  private validateMessages(messages: DebateMessage[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (messages.length < this.MIN_DEBATE_MESSAGES) {
      errors.push(`Too few messages for meaningful analysis (${messages.length} < ${this.MIN_DEBATE_MESSAGES})`);
    }

    const messagesByUser = messages.reduce((acc, msg) => {
      acc[msg.user.id] = (acc[msg.user.id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check participation balance
    const messageCounts = Object.values(messagesByUser);
    if (messageCounts.length > 0) {
      const maxMessages = Math.max(...messageCounts);
      const minMessages = Math.min(...messageCounts);
      const balance = minMessages / maxMessages;
      
      if (balance < 0.2) {
        warnings.push('Severely unbalanced participation detected');
      }
    }

    // Validate individual messages
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      if (!message.content || message.content.length < this.MIN_MESSAGE_LENGTH) {
        warnings.push(`Message ${i + 1} is too short or empty`);
      }

      if (message.status === MessageStatus.DELETED) {
        warnings.push(`Message ${i + 1} is deleted`);
      }

      if (message.moderation_status === ModerationStatus.BLOCKED) {
        warnings.push(`Message ${i + 1} was blocked by moderation`);
      }
    }

    return { errors, warnings };
  }

  private validateContentAppropriateness(messages: DebateMessage[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    let inappropriateContentCount = 0;
    let piiCount = 0;

    for (const message of messages) {
      const sanitization = this.sanitizeMessageContent(message.content);
      
      if (sanitization.contains_pii) {
        piiCount++;
      }

      if (sanitization.safety_score < 0.7) {
        inappropriateContentCount++;
      }

      if (sanitization.educational_appropriateness < 0.5) {
        warnings.push('Message contains content of low educational value');
      }
    }

    if (inappropriateContentCount > messages.length * 0.1) {
      warnings.push(`High proportion of inappropriate content (${inappropriateContentCount}/${messages.length})`);
    }

    if (piiCount > 0) {
      warnings.push(`Personal information detected in ${piiCount} messages`);
    }

    return { errors, warnings };
  }

  private sanitizeTranscript(transcript: DebateTranscript): DebateTranscript {
    const sanitizedMessages = transcript.messages.map(message => {
      const sanitized = this.sanitizeMessageContent(message.content);
      return {
        ...message,
        content: sanitized.sanitized,
        _original_content: message.content,
        _sanitization_info: sanitized,
      };
    });

    return {
      ...transcript,
      messages: sanitizedMessages,
    };
  }

  private calculateMessageQualityScore(message: DebateMessage): number {
    let score = 1.0;

    // Length factor
    const wordCount = message.word_count || 0;
    if (wordCount < 10) score -= 0.3;
    else if (wordCount > 100) score += 0.1;

    // Content type factor
    if (message.content_type !== MessageContentType.TEXT) score -= 0.2;

    // Status factors
    if (message.status === MessageStatus.DELETED) score = 0;
    if (message.moderation_status === ModerationStatus.BLOCKED) score = 0;
    if (message.moderation_status === ModerationStatus.FLAGGED) score -= 0.2;

    // Reply factor (engagement)
    if (message.reply_to_id) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private calculateMetadataQualityScore(metadata: DebateMetadata): number {
    let score = 0.5; // Base score

    // Completion factor
    if (metadata.completion_status.is_completed) score += 0.2;
    score += metadata.completion_status.completion_percentage * 0.1;

    // Message count factor
    const messageScore = Math.min(1, metadata.quality_indicators.message_count / 20) * 0.2;
    score += messageScore;

    // Participation balance factor
    score += metadata.quality_indicators.participant_balance * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private calculateEducationalAppropriateness(content: string): number {
    let score = 1.0;

    // Check for educational indicators
    const educationalTerms = ['because', 'evidence', 'research', 'study', 'data', 'analysis', 'conclusion', 'argument'];
    const words = content.toLowerCase().split(/\s+/);
    const educationalTermCount = words.filter(word => educationalTerms.includes(word)).length;
    
    if (educationalTermCount > 0) {
      score += Math.min(0.2, educationalTermCount * 0.05);
    }

    // Penalize very short or simplistic content
    if (words.length < 10) score -= 0.2;
    if (words.length < 5) score -= 0.3;

    return Math.max(0, Math.min(1, score));
  }

  private assessCompleteness(transcript: DebateTranscript, issues: QualityAssessment['issues']): number {
    let score = 0;

    // Basic information completeness
    if (transcript.topic) score += 0.3;
    if (transcript.started_at && transcript.ended_at) score += 0.2;
    if (transcript.participants.length === 2) score += 0.2;

    // Message completeness
    if (transcript.messages.length >= this.MIN_SUBSTANTIAL_MESSAGES) score += 0.3;

    if (score < 0.5) {
      issues.push({
        type: 'warning',
        message: 'Debate appears incomplete',
        suggestion: 'Consider whether this debate has sufficient content for analysis',
      });
    }

    return score;
  }

  private assessCoherence(transcript: DebateTranscript, issues: QualityAssessment['issues']): number {
    // Simple coherence assessment based on topic relevance and flow
    let score = 0.7; // Base assumption of reasonable coherence

    if (transcript.topic) {
      // Would analyze how well messages stay on topic
      score += 0.2;
    }

    // Check for proper conversation flow (alternating speakers)
    let alternationScore = 0;
    for (let i = 1; i < transcript.messages.length; i++) {
      const current = transcript.messages[i];
      const previous = transcript.messages[i - 1];
      if (current.user.id !== previous.user.id) {
        alternationScore++;
      }
    }

    if (transcript.messages.length > 0) {
      const alternationRatio = alternationScore / (transcript.messages.length - 1);
      score += alternationRatio * 0.1;
    }

    if (score < 0.6) {
      issues.push({
        type: 'info',
        message: 'Debate coherence could be improved',
        suggestion: 'Messages may not follow expected conversation flow',
      });
    }

    return Math.min(1, score);
  }

  private assessEducationalValue(transcript: DebateTranscript, issues: QualityAssessment['issues']): number {
    let score = 0.5;

    // Topic complexity contributes to educational value
    if (transcript.topic && transcript.topic.difficulty_level >= 5) score += 0.2;

    // Message depth and quality
    const avgMessageQuality = transcript.messages.length > 0
      ? transcript.messages.reduce((sum, msg) => sum + this.calculateMessageQualityScore(msg), 0) / transcript.messages.length
      : 0;

    score += avgMessageQuality * 0.3;

    if (score < 0.4) {
      issues.push({
        type: 'warning',
        message: 'Low educational value detected',
        suggestion: 'Consider whether this debate provides sufficient learning opportunities',
      });
    }

    return Math.min(1, score);
  }

  private assessParticipantEngagement(transcript: DebateTranscript, issues: QualityAssessment['issues']): number {
    if (transcript.messages.length === 0) return 0;

    const messagesByParticipant = transcript.messages.reduce((acc, msg) => {
      acc[msg.user.id] = (acc[msg.user.id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const messageCounts = Object.values(messagesByParticipant);
    const maxMessages = Math.max(...messageCounts);
    const minMessages = Math.min(...messageCounts);
    
    const balance = maxMessages > 0 ? minMessages / maxMessages : 1;
    const totalMessages = transcript.messages.length;
    
    // Score based on balance and total participation
    let score = balance * 0.6; // Balance factor
    score += Math.min(1, totalMessages / 20) * 0.4; // Volume factor

    if (balance < 0.3) {
      issues.push({
        type: 'warning',
        message: 'Unbalanced participation detected',
        suggestion: 'One participant may be dominating the conversation',
      });
    }

    return score;
  }

  private assessContentDepth(transcript: DebateTranscript, issues: QualityAssessment['issues']): number {
    if (transcript.messages.length === 0) return 0;

    const totalWords = transcript.messages.reduce((sum, msg) => sum + (msg.word_count || 0), 0);
    const avgWordsPerMessage = totalWords / transcript.messages.length;

    let score = 0;

    // Average message length indicates depth
    if (avgWordsPerMessage >= 30) score += 0.4;
    else if (avgWordsPerMessage >= 15) score += 0.2;

    // Replies indicate deeper engagement
    const replyCount = transcript.messages.filter(msg => msg.reply_to_id).length;
    const replyRatio = replyCount / transcript.messages.length;
    score += replyRatio * 0.3;

    // Duration indicates sustained engagement
    if (transcript.duration_minutes && transcript.duration_minutes >= 30) {
      score += 0.3;
    }

    if (score < 0.3) {
      issues.push({
        type: 'info',
        message: 'Content depth appears limited',
        suggestion: 'Messages may be shorter or less detailed than optimal',
      });
    }

    return Math.min(1, score);
  }
}
