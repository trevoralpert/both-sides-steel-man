import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { 
  DebateTranscript, 
  DebateMessage, 
  DebateParticipant, 
  DebateTranscriptService 
} from './debate-transcript.service';

/**
 * Base interface for analysis results
 */
export interface BaseAnalysisResult {
  conversation_id: string;
  analysis_type: string;
  confidence_score: number;
  processing_time_ms: number;
  created_at: Date;
  metadata?: Record<string, any>;
}

/**
 * Interface for text processing results
 */
export interface TextProcessingResult {
  original_text: string;
  cleaned_text: string;
  word_count: number;
  sentence_count: number;
  paragraph_count: number;
  readability_score: number;
  sentiment_score: number;
  key_phrases: string[];
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
}

/**
 * Interface for argument extraction results
 */
export interface ArgumentExtractionResult {
  claims: Array<{
    text: string;
    position: number;
    confidence: number;
    support_type: 'evidence' | 'reasoning' | 'example';
  }>;
  evidence: Array<{
    text: string;
    source_type: 'statistic' | 'expert_opinion' | 'study' | 'example' | 'personal_experience';
    credibility_score: number;
    relevance_score: number;
  }>;
  reasoning_chains: Array<{
    premises: string[];
    conclusion: string;
    logical_validity: number;
  }>;
  fallacies: Array<{
    type: string;
    text: string;
    confidence: number;
    explanation: string;
  }>;
}

/**
 * Interface for conversation flow analysis
 */
export interface ConversationFlowResult {
  turn_taking_balance: number; // 0-1, how balanced the conversation is
  response_patterns: Array<{
    participant_id: string;
    avg_response_time: number;
    response_length_variance: number;
    engagement_level: number;
  }>;
  topic_coherence: number; // 0-1, how well the conversation stays on topic
  interaction_quality: {
    questions_asked: number;
    acknowledgments: number;
    building_on_ideas: number;
    direct_rebuttals: number;
  };
  phase_transitions: Array<{
    from_phase: string;
    to_phase: string;
    transition_quality: number;
    key_moments: string[];
  }>;
}

/**
 * Abstract base class for debate analysis operations
 */
@Injectable()
export abstract class DebateAnalysisService {
  protected readonly logger = new Logger(DebateAnalysisService.name);
  
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
    protected readonly transcriptService: DebateTranscriptService,
  ) {}

  /**
   * Abstract method for performing specific analysis
   */
  abstract performAnalysis(transcript: DebateTranscript): Promise<BaseAnalysisResult>;

  /**
   * Get analysis cache key
   */
  protected getCacheKey(conversationId: string, analysisType: string, version = '1.0'): string {
    return `debate_analysis:${analysisType}:${conversationId}:${version}`;
  }

  /**
   * Cache analysis results
   */
  protected async cacheAnalysisResult(
    cacheKey: string, 
    result: BaseAnalysisResult, 
    ttlSeconds = 3600
  ): Promise<void> {
    try {
      await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(result));
      this.logger.debug(`Cached analysis result: ${cacheKey}`);
    } catch (error) {
      this.logger.warn(`Failed to cache analysis result: ${error.message}`);
    }
  }

  /**
   * Get cached analysis result
   */
  protected async getCachedAnalysisResult(cacheKey: string): Promise<BaseAnalysisResult | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Retrieved cached analysis result: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Failed to retrieve cached analysis: ${error.message}`);
    }
    return null;
  }

  /**
   * Clean and preprocess text content for analysis
   */
  protected preprocessText(text: string): TextProcessingResult {
    // Remove extra whitespace and normalize
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[^\w\s\.\!\?\,\;\:\-\(\)]/g, '');

    // Basic text statistics
    const words = cleanedText.split(/\s+/).filter(word => word.length > 0);
    const sentences = cleanedText.split(/[\.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    // Simple readability score (Flesch-Kincaid approximation)
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = this.estimateAverageSyllables(words);
    const readabilityScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    // Simple sentiment analysis (placeholder - would use actual NLP library)
    const sentimentScore = this.calculateSimpleSentiment(cleanedText);

    // Extract key phrases (simplified)
    const keyPhrases = this.extractKeyPhrases(cleanedText);

    // Extract entities (simplified)
    const entities = this.extractSimpleEntities(cleanedText);

    return {
      original_text: text,
      cleaned_text: cleanedText,
      word_count: words.length,
      sentence_count: sentences.length,
      paragraph_count: paragraphs.length,
      readability_score: Math.max(0, Math.min(100, readabilityScore)),
      sentiment_score: sentimentScore,
      key_phrases: keyPhrases,
      entities: entities,
    };
  }

  /**
   * Extract arguments from message content
   */
  protected extractArguments(messages: DebateMessage[]): ArgumentExtractionResult {
    const claims: ArgumentExtractionResult['claims'] = [];
    const evidence: ArgumentExtractionResult['evidence'] = [];
    const reasoningChains: ArgumentExtractionResult['reasoning_chains'] = [];
    const fallacies: ArgumentExtractionResult['fallacies'] = [];

    for (const message of messages) {
      const processed = this.preprocessText(message.content);
      
      // Extract claims (simplified heuristic)
      const messageClaims = this.extractClaimsFromText(processed.cleaned_text);
      claims.push(...messageClaims);

      // Extract evidence markers
      const messageEvidence = this.extractEvidenceFromText(processed.cleaned_text);
      evidence.push(...messageEvidence);

      // Detect logical fallacies (simplified)
      const messageFallacies = this.detectFallacies(processed.cleaned_text);
      fallacies.push(...messageFallacies);
    }

    // Build reasoning chains from claims and evidence
    const messageReasoningChains = this.buildReasoningChains(claims, evidence);
    reasoningChains.push(...messageReasoningChains);

    return {
      claims,
      evidence,
      reasoning_chains: reasoningChains,
      fallacies,
    };
  }

  /**
   * Analyze conversation flow patterns
   */
  protected analyzeConversationFlow(
    transcript: DebateTranscript,
    messages: DebateMessage[]
  ): ConversationFlowResult {
    // Calculate turn-taking balance
    const messagesByParticipant = messages.reduce((acc, msg) => {
      acc[msg.user.id] = (acc[msg.user.id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const participantCounts = Object.values(messagesByParticipant);
    const maxMessages = Math.max(...participantCounts);
    const minMessages = Math.min(...participantCounts);
    const turnTakingBalance = maxMessages > 0 ? minMessages / maxMessages : 1;

    // Analyze response patterns
    const responsePatterns = transcript.participants.map(participant => {
      const participantMessages = messages.filter(msg => msg.user.id === participant.id);
      const responseTimes = this.calculateResponseTimesForParticipant(messages, participant.id);
      
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      const messageLengths = participantMessages.map(msg => msg.word_count || 0);
      const avgLength = messageLengths.length > 0 
        ? messageLengths.reduce((sum, len) => sum + len, 0) / messageLengths.length 
        : 0;

      const lengthVariance = this.calculateVariance(messageLengths);
      const engagementLevel = this.calculateEngagementLevel(participantMessages);

      return {
        participant_id: participant.id,
        avg_response_time: avgResponseTime,
        response_length_variance: lengthVariance,
        engagement_level: engagementLevel,
      };
    });

    // Calculate topic coherence
    const topicCoherence = this.calculateTopicCoherence(messages, transcript.topic?.title);

    // Analyze interaction quality
    const interactionQuality = this.analyzeInteractionQuality(messages);

    // Analyze phase transitions
    const phaseTransitions = this.analyzePhaseTransitions(transcript.phase_history);

    return {
      turn_taking_balance: turnTakingBalance,
      response_patterns: responsePatterns,
      topic_coherence: topicCoherence,
      interaction_quality: interactionQuality,
      phase_transitions: phaseTransitions,
    };
  }

  /**
   * Validate analysis input data
   */
  protected validateAnalysisInput(transcript: DebateTranscript): void {
    if (!transcript.id) {
      throw new Error('Invalid transcript: missing conversation ID');
    }

    if (transcript.messages.length === 0) {
      throw new Error('Cannot analyze debate with no messages');
    }

    if (transcript.participants.length !== 2) {
      throw new Error('Debate analysis requires exactly 2 participants');
    }

    // Check for minimum content requirements
    const totalWordCount = transcript.messages.reduce((sum, msg) => sum + (msg.word_count || 0), 0);
    if (totalWordCount < 50) {
      throw new Error('Insufficient content for meaningful analysis');
    }
  }

  /**
   * Create analysis metadata
   */
  protected createAnalysisMetadata(
    transcript: DebateTranscript,
    analysisType: string,
    additionalMetadata: Record<string, any> = {}
  ): Record<string, any> {
    return {
      conversation_id: transcript.id,
      analysis_type: analysisType,
      analysis_version: '1.0',
      participant_count: transcript.participants.length,
      message_count: transcript.messages.length,
      debate_status: transcript.status,
      debate_phase: transcript.debate_phase,
      topic_category: transcript.topic?.category,
      topic_difficulty: transcript.topic?.difficulty_level,
      duration_minutes: transcript.duration_minutes,
      ...additionalMetadata,
    };
  }

  // Helper methods for text analysis (simplified implementations)

  private estimateAverageSyllables(words: string[]): number {
    if (words.length === 0) return 1;
    
    let totalSyllables = 0;
    for (const word of words) {
      totalSyllables += this.countSyllables(word);
    }
    
    return totalSyllables / words.length;
  }

  private countSyllables(word: string): number {
    if (word.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let syllables = 0;
    let prevWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i].toLowerCase());
      if (isVowel && !prevWasVowel) {
        syllables++;
      }
      prevWasVowel = isVowel;
    }
    
    // Adjust for silent e
    if (word.toLowerCase().endsWith('e') && syllables > 1) {
      syllables--;
    }
    
    return Math.max(1, syllables);
  }

  private calculateSimpleSentiment(text: string): number {
    // Very simple sentiment analysis - would use actual NLP library in production
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive', 'agree', 'support'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'negative', 'disagree', 'oppose', 'wrong'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    }
    
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));
  }

  private extractKeyPhrases(text: string): string[] {
    // Simple key phrase extraction - would use actual NLP library
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
    
    const significantWords = words.filter(word => 
      word.length > 3 && 
      !stopWords.has(word) &&
      /^[a-zA-Z]+$/.test(word)
    );
    
    // Find word frequencies
    const wordFreq = significantWords.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Return top phrases
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractSimpleEntities(text: string): Array<{ text: string; type: string; confidence: number }> {
    const entities: Array<{ text: string; type: string; confidence: number }> = [];
    
    // Simple pattern matching for common entity types
    const patterns = [
      { regex: /\b\d{4}\b/g, type: 'DATE' },
      { regex: /\b\d+%\b/g, type: 'PERCENTAGE' },
      { regex: /\$\d+(?:,\d{3})*(?:\.\d{2})?\b/g, type: 'MONEY' },
      { regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, type: 'PERSON' },
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern.regex);
      if (matches) {
        for (const match of matches) {
          entities.push({
            text: match,
            type: pattern.type,
            confidence: 0.8,
          });
        }
      }
    }
    
    return entities;
  }

  // Additional helper methods for argument and flow analysis

  private extractClaimsFromText(text: string): ArgumentExtractionResult['claims'] {
    // Simplified claim detection based on linguistic patterns
    const claimPatterns = [
      /\b(?:I believe|I think|In my opinion|It is clear that|Obviously|Clearly)\s+([^.!?]+)/gi,
      /\b(?:The fact is|The truth is|Research shows|Studies indicate)\s+([^.!?]+)/gi,
    ];
    
    const claims: ArgumentExtractionResult['claims'] = [];
    
    for (const pattern of claimPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        claims.push({
          text: match[1].trim(),
          position: match.index || 0,
          confidence: 0.7,
          support_type: 'reasoning',
        });
      }
    }
    
    return claims;
  }

  private extractEvidenceFromText(text: string): ArgumentExtractionResult['evidence'] {
    // Simplified evidence detection
    const evidencePatterns = [
      { regex: /\b(?:according to|research shows|study found|statistics show|data indicates)\s+([^.!?]+)/gi, type: 'study' },
      { regex: /\b(?:for example|such as|including)\s+([^.!?]+)/gi, type: 'example' },
      { regex: /\b\d+%\s+(?:of|show|indicate)([^.!?]+)/gi, type: 'statistic' },
    ];
    
    const evidence: ArgumentExtractionResult['evidence'] = [];
    
    for (const pattern of evidencePatterns) {
      const matches = [...text.matchAll(pattern.regex)];
      for (const match of matches) {
        evidence.push({
          text: match[0],
          source_type: pattern.type as any,
          credibility_score: 0.6,
          relevance_score: 0.7,
        });
      }
    }
    
    return evidence;
  }

  private detectFallacies(text: string): ArgumentExtractionResult['fallacies'] {
    // Simplified fallacy detection
    const fallacyPatterns = [
      { pattern: /\b(?:always|never|everyone|no one)\b/gi, type: 'hasty_generalization', explanation: 'Uses absolute terms that may overgeneralize' },
      { pattern: /\b(?:because|since)\s+\w+\s+(?:is|are)\s+\w+,\s+\w+\s+(?:must|should)\b/gi, type: 'false_cause', explanation: 'May imply causation without sufficient evidence' },
    ];
    
    const fallacies: ArgumentExtractionResult['fallacies'] = [];
    
    for (const fallacyPattern of fallacyPatterns) {
      const matches = [...text.matchAll(fallacyPattern.pattern)];
      for (const match of matches) {
        fallacies.push({
          type: fallacyPattern.type,
          text: match[0],
          confidence: 0.5,
          explanation: fallacyPattern.explanation,
        });
      }
    }
    
    return fallacies;
  }

  private buildReasoningChains(
    claims: ArgumentExtractionResult['claims'],
    evidence: ArgumentExtractionResult['evidence']
  ): ArgumentExtractionResult['reasoning_chains'] {
    // Simplified reasoning chain construction
    const chains: ArgumentExtractionResult['reasoning_chains'] = [];
    
    for (const claim of claims) {
      const relatedEvidence = evidence.filter(ev => 
        this.calculateTextSimilarity(claim.text, ev.text) > 0.3
      );
      
      if (relatedEvidence.length > 0) {
        chains.push({
          premises: relatedEvidence.map(ev => ev.text),
          conclusion: claim.text,
          logical_validity: 0.6,
        });
      }
    }
    
    return chains;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Very simple text similarity - would use proper algorithm in production
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private calculateResponseTimesForParticipant(messages: DebateMessage[], participantId: string): number[] {
    const responseTimes: number[] = [];
    
    for (let i = 1; i < messages.length; i++) {
      const currentMsg = messages[i];
      const previousMsg = messages[i - 1];
      
      if (currentMsg.user.id === participantId && previousMsg.user.id !== participantId) {
        const responseTime = (currentMsg.created_at.getTime() - previousMsg.created_at.getTime()) / 1000;
        responseTimes.push(responseTime);
      }
    }
    
    return responseTimes;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  private calculateEngagementLevel(messages: DebateMessage[]): number {
    // Simple engagement calculation based on message patterns
    if (messages.length === 0) return 0;
    
    let engagementScore = 0;
    
    for (const message of messages) {
      // Longer messages indicate more engagement
      engagementScore += Math.min(1, (message.word_count || 0) / 50);
      
      // Questions indicate engagement
      if (message.content.includes('?')) {
        engagementScore += 0.2;
      }
      
      // Replies indicate engagement
      if (message.reply_to_id) {
        engagementScore += 0.3;
      }
    }
    
    return Math.min(1, engagementScore / messages.length);
  }

  private calculateTopicCoherence(messages: DebateMessage[], topicTitle?: string): number {
    if (!topicTitle || messages.length === 0) return 0.5;
    
    const topicKeywords = topicTitle.toLowerCase().split(/\s+/);
    let coherenceScore = 0;
    
    for (const message of messages) {
      const messageWords = message.content.toLowerCase().split(/\s+/);
      const matchCount = topicKeywords.filter(keyword => 
        messageWords.some(word => word.includes(keyword))
      ).length;
      
      coherenceScore += matchCount / topicKeywords.length;
    }
    
    return Math.min(1, coherenceScore / messages.length);
  }

  private analyzeInteractionQuality(messages: DebateMessage[]): ConversationFlowResult['interaction_quality'] {
    let questionsAsked = 0;
    let acknowledgments = 0;
    let buildingOnIdeas = 0;
    let directRebuttals = 0;
    
    for (const message of messages) {
      const content = message.content.toLowerCase();
      
      // Count questions
      questionsAsked += (content.match(/\?/g) || []).length;
      
      // Count acknowledgments
      if (/\b(?:i see|i understand|that's interesting|good point|you're right)\b/.test(content)) {
        acknowledgments++;
      }
      
      // Count building on ideas
      if (/\b(?:building on|adding to|expanding on|yes, and)\b/.test(content)) {
        buildingOnIdeas++;
      }
      
      // Count direct rebuttals
      if (/\b(?:however|but|on the contrary|i disagree|that's not correct)\b/.test(content)) {
        directRebuttals++;
      }
    }
    
    return {
      questions_asked: questionsAsked,
      acknowledgments: acknowledgments,
      building_on_ideas: buildingOnIdeas,
      direct_rebuttals: directRebuttals,
    };
  }

  private analyzePhaseTransitions(phaseHistory: any[]): ConversationFlowResult['phase_transitions'] {
    const transitions: ConversationFlowResult['phase_transitions'] = [];
    
    for (let i = 1; i < phaseHistory.length; i++) {
      const fromPhase = phaseHistory[i - 1];
      const toPhase = phaseHistory[i];
      
      if (fromPhase.phase && toPhase.phase) {
        transitions.push({
          from_phase: fromPhase.phase,
          to_phase: toPhase.phase,
          transition_quality: 0.7, // Would calculate based on actual transition smoothness
          key_moments: [], // Would extract from actual conversation analysis
        });
      }
    }
    
    return transitions;
  }
}
