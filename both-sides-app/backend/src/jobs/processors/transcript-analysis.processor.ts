import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseAIProcessor } from './base.processor';
import { 
  TranscriptAnalysisJobData,
  JobResult,
} from '../interfaces/job.interfaces';
import { DebateTranscriptService } from '../../reflection-system/services/debate-transcript.service';
import { DataValidationService } from '../../reflection-system/services/data-validation.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Result interface for transcript analysis
 */
export interface TranscriptAnalysisResult {
  conversation_id: string;
  analysis_version: string;
  sentiment_analysis: {
    overall_sentiment: number; // -1 to 1
    participant_sentiments: Record<string, number>;
    sentiment_progression: Array<{
      timestamp: string;
      sentiment: number;
      participant_id: string;
    }>;
  };
  topic_analysis: {
    main_topics: string[];
    topic_coherence: number; // 0 to 1
    topic_drift_points: Array<{
      timestamp: string;
      new_topic: string;
      relevance_score: number;
    }>;
  };
  argument_structure: {
    total_arguments: number;
    arguments_by_participant: Record<string, number>;
    argument_types: Record<string, number>;
    logical_flow_score: number; // 0 to 1
  };
  linguistic_features: {
    vocabulary_complexity: number; // 0 to 1
    sentence_complexity: number; // 0 to 1
    formality_level: number; // 0 to 1
    emotional_language_usage: number; // 0 to 1
  };
  interaction_patterns: {
    turn_taking_balance: number; // 0 to 1
    interruption_frequency: number;
    agreement_indicators: number;
    disagreement_indicators: number;
    question_frequency: number;
  };
  quality_metrics: {
    overall_quality: number; // 0 to 1
    content_depth: number; // 0 to 1
    engagement_level: number; // 0 to 1
    educational_value: number; // 0 to 1
  };
}

/**
 * Processor for analyzing debate transcripts using AI
 */
@Injectable()
export class TranscriptAnalysisProcessor extends BaseAIProcessor<
  TranscriptAnalysisJobData,
  TranscriptAnalysisResult
> {
  
  constructor(
    private readonly transcriptService: DebateTranscriptService,
    private readonly validationService: DataValidationService,
    private readonly prisma: PrismaService,
  ) {
    super('TranscriptAnalysis');
  }

  protected async validateAIPrerequisites(data: TranscriptAnalysisJobData): Promise<void> {
    // Validate conversation exists and has sufficient content
    const metadata = await this.transcriptService.getDebateMetadata(data.conversationId);
    
    if (!metadata.quality_indicators.has_substantial_content) {
      throw new Error('Insufficient content for meaningful transcript analysis');
    }

    if (metadata.status === 'CANCELLED') {
      throw new Error('Cannot analyze cancelled conversation');
    }

    // Validate analysis types
    if (!data.analysisTypes || data.analysisTypes.length === 0) {
      throw new Error('No analysis types specified');
    }

    const validAnalysisTypes = [
      'sentiment', 'topic', 'argument', 'linguistic', 'interaction', 'quality'
    ];
    
    for (const analysisType of data.analysisTypes) {
      if (!validAnalysisTypes.includes(analysisType)) {
        throw new Error(`Invalid analysis type: ${analysisType}`);
      }
    }
  }

  protected async performAIAnalysis(job: Job<TranscriptAnalysisJobData>): Promise<TranscriptAnalysisResult> {
    const { conversationId, analysisTypes, config } = job.data;
    
    // Get the full transcript
    await this.updateProgress(job, 15, 0, 1, 'fetching_data', 'Retrieving debate transcript');
    const transcript = await this.transcriptService.getDebateTranscript(conversationId);

    // Validate transcript data
    const validation = await this.validationService.validateDebateTranscript(transcript);
    if (!validation.isValid) {
      throw new Error(`Transcript validation failed: ${validation.errors.join(', ')}`);
    }

    await this.updateProgress(job, 25, 0, 1, 'analyzing', 'Starting AI analysis');

    const result: TranscriptAnalysisResult = {
      conversation_id: conversationId,
      analysis_version: '1.0',
      sentiment_analysis: {
        overall_sentiment: 0,
        participant_sentiments: {},
        sentiment_progression: [],
      },
      topic_analysis: {
        main_topics: [],
        topic_coherence: 0,
        topic_drift_points: [],
      },
      argument_structure: {
        total_arguments: 0,
        arguments_by_participant: {},
        argument_types: {},
        logical_flow_score: 0,
      },
      linguistic_features: {
        vocabulary_complexity: 0,
        sentence_complexity: 0,
        formality_level: 0,
        emotional_language_usage: 0,
      },
      interaction_patterns: {
        turn_taking_balance: 0,
        interruption_frequency: 0,
        agreement_indicators: 0,
        disagreement_indicators: 0,
        question_frequency: 0,
      },
      quality_metrics: {
        overall_quality: 0,
        content_depth: 0,
        engagement_level: 0,
        educational_value: 0,
      },
    };

    let progress = 30;
    const progressIncrement = 60 / analysisTypes.length;

    // Perform requested analyses
    for (const analysisType of analysisTypes) {
      await this.updateProgress(
        job, 
        progress, 
        0, 
        1, 
        `analyzing_${analysisType}`, 
        `Performing ${analysisType} analysis`
      );

      switch (analysisType) {
        case 'sentiment':
          result.sentiment_analysis = await this.analyzeSentiment(transcript, config);
          break;
        case 'topic':
          result.topic_analysis = await this.analyzeTopics(transcript, config);
          break;
        case 'argument':
          result.argument_structure = await this.analyzeArguments(transcript, config);
          break;
        case 'linguistic':
          result.linguistic_features = await this.analyzeLinguisticFeatures(transcript, config);
          break;
        case 'interaction':
          result.interaction_patterns = await this.analyzeInteractionPatterns(transcript, config);
          break;
        case 'quality':
          result.quality_metrics = await this.analyzeQuality(transcript, config);
          break;
      }

      progress += progressIncrement;
    }

    return result;
  }

  protected async postProcessResults(
    result: TranscriptAnalysisResult,
    data: TranscriptAnalysisJobData
  ): Promise<TranscriptAnalysisResult> {
    // Store results in database
    await this.storeAnalysisResults(result, data);
    
    // Calculate overall scores if multiple analyses were performed
    if (data.analysisTypes.length > 1) {
      result.quality_metrics.overall_quality = this.calculateOverallQuality(result);
    }

    return result;
  }

  protected getAIModel(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  protected estimateComplexity(data: TranscriptAnalysisJobData): 'low' | 'medium' | 'high' {
    const analysisCount = data.analysisTypes.length;
    const hasAdvancedAnalysis = data.analysisTypes.some(type => 
      ['argument', 'linguistic', 'quality'].includes(type)
    );

    if (analysisCount <= 2 && !hasAdvancedAnalysis) {
      return 'low';
    } else if (analysisCount <= 4 || hasAdvancedAnalysis) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  // Analysis implementation methods

  private async analyzeSentiment(transcript: any, config?: any): Promise<any> {
    // Simplified sentiment analysis implementation
    // In production, this would call OpenAI API or other sentiment analysis service
    
    const messages = transcript.messages || [];
    let overallSentiment = 0;
    const participantSentiments: Record<string, number> = {};
    const sentimentProgression: Array<any> = [];

    for (const message of messages) {
      // Simplified sentiment calculation based on message content
      const sentiment = this.calculateSimpleSentiment(message.content);
      overallSentiment += sentiment;
      
      const participantId = message.user.id;
      if (!participantSentiments[participantId]) {
        participantSentiments[participantId] = 0;
      }
      participantSentiments[participantId] += sentiment;

      sentimentProgression.push({
        timestamp: message.created_at,
        sentiment,
        participant_id: participantId,
      });
    }

    // Normalize scores
    if (messages.length > 0) {
      overallSentiment /= messages.length;
      for (const participantId in participantSentiments) {
        const participantMessages = messages.filter(m => m.user.id === participantId);
        participantSentiments[participantId] /= participantMessages.length;
      }
    }

    return {
      overall_sentiment: Math.max(-1, Math.min(1, overallSentiment)),
      participant_sentiments: participantSentiments,
      sentiment_progression: sentimentProgression,
    };
  }

  private async analyzeTopics(transcript: any, config?: any): Promise<any> {
    // Simplified topic analysis
    const messages = transcript.messages || [];
    const topicTitle = transcript.topic?.title || '';
    
    // Extract key topics from message content
    const topics = this.extractKeyTopics(messages, topicTitle);
    const coherence = this.calculateTopicCoherence(messages, topics);
    const driftPoints = this.identifyTopicDrift(messages, topics);

    return {
      main_topics: topics,
      topic_coherence: coherence,
      topic_drift_points: driftPoints,
    };
  }

  private async analyzeArguments(transcript: any, config?: any): Promise<any> {
    // Simplified argument analysis
    const messages = transcript.messages || [];
    
    let totalArguments = 0;
    const argumentsByParticipant: Record<string, number> = {};
    const argumentTypes: Record<string, number> = {
      claim: 0,
      evidence: 0,
      rebuttal: 0,
      concession: 0,
    };

    for (const message of messages) {
      const args = this.identifyArguments(message.content);
      totalArguments += args.count;
      
      const participantId = message.user.id;
      argumentsByParticipant[participantId] = (argumentsByParticipant[participantId] || 0) + args.count;
      
      for (const [type, count] of Object.entries(args.types)) {
        argumentTypes[type] = (argumentTypes[type] || 0) + count;
      }
    }

    const logicalFlowScore = this.calculateLogicalFlowScore(messages);

    return {
      total_arguments: totalArguments,
      arguments_by_participant: argumentsByParticipant,
      argument_types: argumentTypes,
      logical_flow_score: logicalFlowScore,
    };
  }

  private async analyzeLinguisticFeatures(transcript: any, config?: any): Promise<any> {
    // Simplified linguistic analysis
    const messages = transcript.messages || [];
    
    let vocabularyComplexity = 0;
    let sentenceComplexity = 0;
    let formalityLevel = 0;
    let emotionalLanguage = 0;

    for (const message of messages) {
      vocabularyComplexity += this.calculateVocabularyComplexity(message.content);
      sentenceComplexity += this.calculateSentenceComplexity(message.content);
      formalityLevel += this.calculateFormalityLevel(message.content);
      emotionalLanguage += this.calculateEmotionalLanguage(message.content);
    }

    // Normalize by message count
    const messageCount = Math.max(messages.length, 1);
    
    return {
      vocabulary_complexity: vocabularyComplexity / messageCount,
      sentence_complexity: sentenceComplexity / messageCount,
      formality_level: formalityLevel / messageCount,
      emotional_language_usage: emotionalLanguage / messageCount,
    };
  }

  private async analyzeInteractionPatterns(transcript: any, config?: any): Promise<any> {
    // Simplified interaction analysis
    const messages = transcript.messages || [];
    const participants = transcript.participants || [];
    
    // Calculate turn-taking balance
    const messagesByParticipant = messages.reduce((acc: Record<string, number>, msg: any) => {
      acc[msg.user.id] = (acc[msg.user.id] || 0) + 1;
      return acc;
    }, {});

    const messageCounts = Object.values(messagesByParticipant) as number[];
    const turnTakingBalance = messageCounts.length > 0 
      ? Math.min(...messageCounts) / Math.max(...messageCounts)
      : 1;

    // Count interaction indicators
    let agreementIndicators = 0;
    let disagreementIndicators = 0;
    let questionFrequency = 0;
    let interruptionFrequency = 0;

    for (const message of messages) {
      const content = message.content.toLowerCase();
      
      // Agreement indicators
      if (/\b(agree|yes|exactly|right|true|correct)\b/.test(content)) {
        agreementIndicators++;
      }
      
      // Disagreement indicators
      if (/\b(disagree|no|wrong|false|however|but)\b/.test(content)) {
        disagreementIndicators++;
      }
      
      // Questions
      if (content.includes('?')) {
        questionFrequency++;
      }
    }

    return {
      turn_taking_balance: Math.max(0, Math.min(1, turnTakingBalance)),
      interruption_frequency: interruptionFrequency,
      agreement_indicators: agreementIndicators,
      disagreement_indicators: disagreementIndicators,
      question_frequency: questionFrequency,
    };
  }

  private async analyzeQuality(transcript: any, config?: any): Promise<any> {
    // Simplified quality analysis
    const messages = transcript.messages || [];
    
    const contentDepth = this.calculateContentDepth(messages);
    const engagementLevel = this.calculateEngagementLevel(messages);
    const educationalValue = this.calculateEducationalValue(messages, transcript.topic);
    
    const overallQuality = (contentDepth + engagementLevel + educationalValue) / 3;

    return {
      overall_quality: Math.max(0, Math.min(1, overallQuality)),
      content_depth: Math.max(0, Math.min(1, contentDepth)),
      engagement_level: Math.max(0, Math.min(1, engagementLevel)),
      educational_value: Math.max(0, Math.min(1, educationalValue)),
    };
  }

  // Helper methods for analysis calculations

  private calculateSimpleSentiment(text: string): number {
    // Very simplified sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'agree', 'support', 'like', 'love', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'disagree', 'hate', 'dislike', 'wrong', 'horrible'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    }
    
    return Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));
  }

  private extractKeyTopics(messages: any[], debateTitle: string): string[] {
    // Simplified topic extraction
    const topics = new Set<string>();
    
    // Add debate title words as topics
    if (debateTitle) {
      const titleWords = debateTitle.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      titleWords.forEach(word => topics.add(word));
    }
    
    // Extract common significant words from messages
    const wordFreq: Record<string, number> = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    for (const message of messages) {
      const words = message.content.toLowerCase().match(/\b\w{4,}\b/g) || [];
      for (const word of words) {
        if (!stopWords.has(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      }
    }
    
    // Get top 10 most frequent words as topics
    const sortedWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
    
    sortedWords.forEach(word => topics.add(word));
    
    return Array.from(topics).slice(0, 15);
  }

  private calculateTopicCoherence(messages: any[], topics: string[]): number {
    if (topics.length === 0 || messages.length === 0) return 0;
    
    let relevantMessages = 0;
    
    for (const message of messages) {
      const content = message.content.toLowerCase();
      const hasRelevantTopic = topics.some(topic => content.includes(topic));
      if (hasRelevantTopic) relevantMessages++;
    }
    
    return relevantMessages / messages.length;
  }

  private identifyTopicDrift(messages: any[], topics: string[]): any[] {
    // Simplified topic drift detection
    const driftPoints: any[] = [];
    const windowSize = 5; // Analyze topic relevance in windows of 5 messages
    
    for (let i = windowSize; i < messages.length; i += windowSize) {
      const window = messages.slice(i - windowSize, i);
      const relevanceScore = this.calculateTopicCoherence(window, topics);
      
      if (relevanceScore < 0.3) { // Threshold for topic drift
        driftPoints.push({
          timestamp: messages[i].created_at,
          new_topic: 'off_topic',
          relevance_score: relevanceScore,
        });
      }
    }
    
    return driftPoints;
  }

  private identifyArguments(content: string): { count: number; types: Record<string, number> } {
    // Simplified argument identification
    const types: Record<string, number> = {
      claim: 0,
      evidence: 0,
      rebuttal: 0,
      concession: 0,
    };
    
    const text = content.toLowerCase();
    
    // Identify claims
    if (/\b(i believe|i think|in my opinion|clearly|obviously)\b/.test(text)) {
      types.claim++;
    }
    
    // Identify evidence
    if (/\b(research shows|studies indicate|according to|data shows|statistics)\b/.test(text)) {
      types.evidence++;
    }
    
    // Identify rebuttals
    if (/\b(however|but|on the contrary|i disagree|that's wrong)\b/.test(text)) {
      types.rebuttal++;
    }
    
    // Identify concessions
    if (/\b(you're right|i agree|that's true|fair point)\b/.test(text)) {
      types.concession++;
    }
    
    const count = Object.values(types).reduce((sum, val) => sum + val, 0);
    return { count, types };
  }

  private calculateLogicalFlowScore(messages: any[]): number {
    // Simplified logical flow calculation
    let flowScore = 0.5; // Base score
    
    for (let i = 1; i < messages.length; i++) {
      const currentMsg = messages[i].content.toLowerCase();
      const previousMsg = messages[i - 1].content.toLowerCase();
      
      // Check for logical connectors
      if (/\b(therefore|thus|because|since|as a result)\b/.test(currentMsg)) {
        flowScore += 0.1;
      }
      
      // Check for direct responses
      if (currentMsg.includes('you') || currentMsg.includes('your')) {
        flowScore += 0.05;
      }
    }
    
    return Math.max(0, Math.min(1, flowScore / messages.length));
  }

  private calculateVocabularyComplexity(text: string): number {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / Math.max(words.length, 1);
    
    const complexityScore = (uniqueWords.size / Math.max(words.length, 1)) * (avgWordLength / 10);
    return Math.max(0, Math.min(1, complexityScore));
  }

  private calculateSentenceComplexity(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, sentence) => {
      const words = sentence.trim().split(/\s+/).length;
      return sum + words;
    }, 0) / Math.max(sentences.length, 1);
    
    // Complexity increases with sentence length, normalized to 0-1 scale
    return Math.max(0, Math.min(1, (avgSentenceLength - 5) / 20));
  }

  private calculateFormalityLevel(text: string): number {
    const formalIndicators = [
      'furthermore', 'moreover', 'consequently', 'nevertheless', 'therefore',
      'additionally', 'specifically', 'particularly', 'essentially', 'ultimately'
    ];
    
    const informalIndicators = [
      'yeah', 'ok', 'gonna', 'wanna', 'kinda', 'sorta', 'dunno', 'nah'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    let formalCount = 0;
    let informalCount = 0;
    
    for (const word of words) {
      if (formalIndicators.includes(word)) formalCount++;
      if (informalIndicators.includes(word)) informalCount++;
    }
    
    const netFormality = (formalCount - informalCount) / Math.max(words.length / 10, 1);
    return Math.max(0, Math.min(1, (netFormality + 1) / 2)); // Normalize to 0-1
  }

  private calculateEmotionalLanguage(text: string): number {
    const emotionalWords = [
      'amazing', 'terrible', 'wonderful', 'awful', 'fantastic', 'horrible',
      'excited', 'angry', 'happy', 'sad', 'frustrated', 'delighted'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    const emotionalCount = words.filter(word => emotionalWords.includes(word)).length;
    
    return Math.max(0, Math.min(1, emotionalCount / Math.max(words.length / 10, 1)));
  }

  private calculateContentDepth(messages: any[]): number {
    const avgMessageLength = messages.reduce((sum, msg) => sum + (msg.word_count || 0), 0) / Math.max(messages.length, 1);
    const replyCount = messages.filter(msg => msg.reply_to_id).length;
    const replyRatio = replyCount / Math.max(messages.length, 1);
    
    // Depth based on message length and interaction depth
    const lengthScore = Math.min(1, avgMessageLength / 50); // Normalize around 50 words
    const interactionScore = Math.min(1, replyRatio * 2); // Bonus for replies
    
    return (lengthScore + interactionScore) / 2;
  }

  private calculateEngagementLevel(messages: any[]): number {
    if (messages.length === 0) return 0;
    
    const questionCount = messages.filter(msg => msg.content.includes('?')).length;
    const questionRatio = questionCount / messages.length;
    
    const participants = new Set(messages.map(msg => msg.user.id));
    const participationBalance = participants.size >= 2 ? 1 : 0.5;
    
    const avgResponseTime = this.calculateAverageResponseTime(messages);
    const responseTimeScore = Math.max(0, Math.min(1, (300 - avgResponseTime) / 300)); // Good if under 5 minutes
    
    return (questionRatio + participationBalance + responseTimeScore) / 3;
  }

  private calculateEducationalValue(messages: any[], topic?: any): number {
    const educationalKeywords = [
      'research', 'study', 'evidence', 'data', 'analysis', 'theory', 'concept',
      'example', 'explain', 'understand', 'learn', 'knowledge', 'information'
    ];
    
    let educationalContent = 0;
    
    for (const message of messages) {
      const words = message.content.toLowerCase().split(/\s+/);
      const educationalWords = words.filter(word => educationalKeywords.includes(word)).length;
      educationalContent += educationalWords;
    }
    
    const totalWords = messages.reduce((sum, msg) => sum + (msg.word_count || 0), 0);
    const educationalRatio = totalWords > 0 ? educationalContent / totalWords : 0;
    
    // Bonus for topic complexity
    const topicComplexity = topic?.difficulty_level ? (topic.difficulty_level / 10) : 0.5;
    
    return Math.max(0, Math.min(1, (educationalRatio * 10 + topicComplexity) / 2));
  }

  private calculateAverageResponseTime(messages: any[]): number {
    if (messages.length < 2) return 0;
    
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (let i = 1; i < messages.length; i++) {
      const currentMsg = messages[i];
      const previousMsg = messages[i - 1];
      
      if (currentMsg.user.id !== previousMsg.user.id) {
        const responseTime = (new Date(currentMsg.created_at).getTime() - new Date(previousMsg.created_at).getTime()) / 1000;
        totalResponseTime += responseTime;
        responseCount++;
      }
    }
    
    return responseCount > 0 ? totalResponseTime / responseCount : 0;
  }

  private calculateOverallQuality(result: TranscriptAnalysisResult): number {
    const scores = [
      result.sentiment_analysis.overall_sentiment > -0.5 ? 0.8 : 0.4, // Moderate to positive sentiment
      result.topic_analysis.topic_coherence,
      result.argument_structure.logical_flow_score,
      result.interaction_patterns.turn_taking_balance,
      result.quality_metrics.content_depth,
      result.quality_metrics.engagement_level,
      result.quality_metrics.educational_value,
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private async storeAnalysisResults(
    result: TranscriptAnalysisResult,
    data: TranscriptAnalysisJobData
  ): Promise<void> {
    try {
      await this.prisma.transcriptAnalysis.upsert({
        where: {
          conversation_id: data.conversationId,
        },
        update: {
          analysis_version: result.analysis_version,
          sentiment_data: result.sentiment_analysis as any,
          topic_data: result.topic_analysis as any,
          argument_data: result.argument_structure as any,
          linguistic_data: result.linguistic_features as any,
          interaction_data: result.interaction_patterns as any,
          quality_data: result.quality_metrics as any,
          status: 'COMPLETED',
          updated_at: new Date(),
        },
        create: {
          conversation_id: data.conversationId,
          user_id: data.userId || '',
          analysis_version: result.analysis_version,
          sentiment_data: result.sentiment_analysis as any,
          topic_data: result.topic_analysis as any,
          argument_data: result.argument_structure as any,
          linguistic_data: result.linguistic_features as any,
          interaction_data: result.interaction_patterns as any,
          quality_data: result.quality_metrics as any,
          status: 'COMPLETED',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      
      this.logger.debug(`Stored transcript analysis results for conversation: ${data.conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to store analysis results: ${error.message}`);
      // Don't throw here - we don't want to fail the job if storage fails
    }
  }
}
