import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService, OpenAIConfig } from './openai.service';
import {
  SentimentAnalysisRequest,
  SentimentAnalysisResult,
  DebateTranscript,
  DebateMessage,
} from '../interfaces/analysis.interfaces';

/**
 * Sentiment Analysis Service
 * AI-powered sentiment analysis for debate transcripts
 */
@Injectable()
export class SentimentAnalysisService {
  private readonly logger = new Logger(SentimentAnalysisService.name);

  constructor(private readonly openaiService: OpenAIService) {}

  /**
   * Perform comprehensive sentiment analysis on a debate transcript
   */
  async analyzeSentiment(
    transcript: DebateTranscript,
    request: SentimentAnalysisRequest
  ): Promise<SentimentAnalysisResult> {
    const startTime = Date.now();
    this.logger.log(`Starting sentiment analysis for conversation ${transcript.conversationId}`);

    try {
      // Validate transcript
      this.validateTranscript(transcript);

      // Build analysis prompts
      const { systemPrompt, userPrompt } = this.buildPrompts(transcript, request);

      // Generate cache key
      const cacheKey = this.openaiService.buildCacheKey(
        systemPrompt,
        userPrompt,
        { model: 'gpt-4o-mini', temperature: 0.2 }
      );

      // Define the expected JSON schema
      const responseSchema = {
        overallSentiment: {
          polarity: "number", // -1 to 1
          intensity: "number", // 0 to 1
          neutrality: "number" // 0 to 1
        },
        participantSentiments: "object", // Record<string, {...}>
        emotions: request.includeEmotions ? "object" : undefined,
        sentimentShifts: "array",
        insights: "array of strings"
      };

      // Call OpenAI for structured sentiment analysis
      const aiResponse = await this.openaiService.generateStructuredResponse<any>(
        systemPrompt,
        userPrompt,
        responseSchema,
        { model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 3000 },
        request.analysisOptions?.cacheResults ? cacheKey : undefined
      );

      // Process and validate the AI response
      const result = this.processAIResponse(
        aiResponse,
        transcript,
        request,
        startTime
      );

      this.logger.log(
        `Completed sentiment analysis for conversation ${transcript.conversationId} in ${result.processingTime}ms`
      );

      return result;

    } catch (error) {
      this.logger.error(
        `Sentiment analysis failed for conversation ${transcript.conversationId}`,
        error.stack
      );
      
      // Return a failed analysis result
      return this.createFailedResult(transcript, request, startTime, error.message);
    }
  }

  /**
   * Validate transcript for sentiment analysis
   */
  private validateTranscript(transcript: DebateTranscript): void {
    if (!transcript.messages || transcript.messages.length < 3) {
      throw new Error('Insufficient messages for sentiment analysis (minimum 3 required)');
    }

    if (!transcript.participants || transcript.participants.length < 2) {
      throw new Error('Insufficient participants for sentiment analysis (minimum 2 required)');
    }

    const totalWordCount = transcript.messages.reduce((sum, msg) => sum + msg.wordCount, 0);
    if (totalWordCount < 50) {
      throw new Error('Insufficient content for meaningful sentiment analysis (minimum 50 words)');
    }
  }

  /**
   * Build system and user prompts for sentiment analysis
   */
  private buildPrompts(
    transcript: DebateTranscript,
    request: SentimentAnalysisRequest
  ): { systemPrompt: string; userPrompt: string } {
    
    const systemPrompt = `You are an expert in sentiment analysis and emotional intelligence, specializing in educational debate analysis. Your task is to analyze the sentiment patterns in a student debate conversation.

**Analysis Goals:**
1. Assess overall emotional tone and sentiment polarity
2. Track sentiment changes throughout the conversation
3. Identify emotional patterns for each participant
4. Detect significant sentiment shifts and their triggers
${request.includeEmotions ? '5. Analyze detailed emotional categories (joy, anger, fear, etc.)' : ''}
${request.trackProgression ? '6. Track sentiment progression over time' : ''}

**Context:**
- This is an educational debate between students
- Focus on constructive analysis that helps students learn
- Consider the educational value of emotional engagement
- Identify positive debate behaviors vs. areas for improvement

**Sentiment Scale:**
- Polarity: -1 (very negative) to +1 (very positive), 0 = neutral
- Intensity: 0 (low emotional intensity) to 1 (high emotional intensity)
- Neutrality: 0 (highly emotional) to 1 (completely neutral)

**Output Guidelines:**
- Provide specific evidence from the text for your assessments
- Focus on constructive insights that promote learning
- Highlight effective emotional regulation and communication
- Identify opportunities for emotional intelligence development
- Use age-appropriate language for high school students

Return a JSON object with the exact structure specified in the schema.`;

    const userPrompt = this.buildUserPrompt(transcript, request);

    return { systemPrompt, userPrompt };
  }

  /**
   * Build user prompt with transcript data
   */
  private buildUserPrompt(
    transcript: DebateTranscript,
    request: SentimentAnalysisRequest
  ): string {
    let prompt = `**Debate Analysis Request**

**Topic:** ${transcript.topic.title}
${transcript.topic.description ? `**Description:** ${transcript.topic.description}\n` : ''}

**Participants:**
${transcript.participants.map(p => `- ${p.id} (${p.role.toUpperCase()}): ${p.messageCount} messages, ${p.wordCount} words`).join('\n')}

**Conversation Timeline:**
${transcript.messages.map((msg, index) => {
  const participant = transcript.participants.find(p => p.id === msg.userId);
  return `[${index + 1}] ${participant?.role || 'unknown'} (${msg.timestamp.toISOString().slice(11, 19)}): ${msg.content.slice(0, 200)}${msg.content.length > 200 ? '...' : ''}`;
}).join('\n\n')}

**Analysis Instructions:**

1. **Overall Sentiment Assessment:**
   - Analyze the general emotional tone of the entire debate
   - Calculate overall polarity, intensity, and neutrality scores
   - Consider the educational context and debate objectives

2. **Participant-Specific Analysis:**
   - For each participant, assess their average sentiment polarity
   - Track their emotional range and stability
   - Identify their sentiment progression patterns${request.trackProgression ? ' with timestamps' : ''}

${request.includeEmotions ? `3. **Emotional Categories:**
   - Analyze presence of: joy, anger, fear, sadness, disgust, surprise, trust, anticipation
   - Provide scores (0-1) for each emotion category
   - Consider how emotions impact debate quality` : ''}

4. **Sentiment Shifts:**
   - Identify significant changes in sentiment during the debate
   - Determine what triggered these shifts (arguments, rebuttals, etc.)
   - Assess whether shifts were constructive or disruptive

5. **Educational Insights:**
   - How did emotional engagement affect debate quality?
   - What emotional intelligence skills were demonstrated?
   - What areas need development for better debate participation?
   - How can participants improve emotional regulation in debates?

**Metadata:**
- Total Messages: ${transcript.metadata.messageCount}
- Duration: ${Math.round(transcript.metadata.duration / 60)} minutes
- Status: ${transcript.metadata.status}
- Average Response Time: ${transcript.participants.reduce((sum, p) => sum + p.avgResponseTime, 0) / transcript.participants.length}ms`;

    return prompt;
  }

  /**
   * Process AI response and create final result
   */
  private processAIResponse(
    aiResponse: any,
    transcript: DebateTranscript,
    request: SentimentAnalysisRequest,
    startTime: number
  ): SentimentAnalysisResult {
    
    const processingTime = Date.now() - startTime;
    
    // Validate and normalize the AI response
    const normalizedResponse = this.normalizeAIResponse(aiResponse, transcript);

    return {
      analysisId: `sentiment_${transcript.conversationId}_${Date.now()}`,
      conversationId: transcript.conversationId,
      analysisType: 'sentiment',
      version: '1.0',
      status: 'completed',
      confidence: this.calculateConfidence(normalizedResponse, transcript),
      processingTime,
      tokensUsed: aiResponse.metadata.tokensUsed,
      createdAt: new Date(),
      
      // Sentiment-specific results
      overallSentiment: {
        polarity: this.clamp(normalizedResponse.overallSentiment?.polarity || 0, -1, 1),
        intensity: this.clamp(normalizedResponse.overallSentiment?.intensity || 0.5, 0, 1),
        neutrality: this.clamp(normalizedResponse.overallSentiment?.neutrality || 0.5, 0, 1),
      },
      
      participantSentiments: this.processParticipantSentiments(
        normalizedResponse.participantSentiments || {},
        transcript,
        request.trackProgression
      ),
      
      emotions: request.includeEmotions ? this.processEmotions(normalizedResponse.emotions) : undefined,
      
      sentimentShifts: this.processSentimentShifts(
        normalizedResponse.sentimentShifts || [],
        transcript
      ),
      
      insights: Array.isArray(normalizedResponse.insights) 
        ? normalizedResponse.insights 
        : ['Sentiment analysis completed successfully'],
        
      metadata: {
        cached: aiResponse.metadata.cached,
        participantCount: transcript.participants.length,
        messageCount: transcript.messages.length,
        totalWordCount: transcript.messages.reduce((sum, msg) => sum + msg.wordCount, 0),
      },
    };
  }

  /**
   * Normalize AI response to ensure valid data
   */
  private normalizeAIResponse(aiResponse: any, transcript: DebateTranscript): any {
    // Ensure all required fields exist with defaults
    return {
      overallSentiment: aiResponse.overallSentiment || { polarity: 0, intensity: 0.5, neutrality: 0.5 },
      participantSentiments: aiResponse.participantSentiments || {},
      emotions: aiResponse.emotions || undefined,
      sentimentShifts: aiResponse.sentimentShifts || [],
      insights: aiResponse.insights || [],
    };
  }

  /**
   * Process participant sentiments with validation
   */
  private processParticipantSentiments(
    rawData: any,
    transcript: DebateTranscript,
    trackProgression: boolean = false
  ): Record<string, any> {
    const processed: Record<string, any> = {};

    for (const participant of transcript.participants) {
      const participantData = rawData[participant.id] || {};
      
      processed[participant.id] = {
        averagePolarity: this.clamp(participantData.averagePolarity || 0, -1, 1),
        polarityRange: [
          this.clamp(participantData.polarityRange?.[0] || -0.2, -1, 1),
          this.clamp(participantData.polarityRange?.[1] || 0.2, -1, 1),
        ],
        emotionalStability: this.clamp(participantData.emotionalStability || 0.7, 0, 1),
        sentimentProgression: trackProgression ? (participantData.sentimentProgression || []) : [],
      };
    }

    return processed;
  }

  /**
   * Process emotions with validation
   */
  private processEmotions(rawEmotions: any): any {
    if (!rawEmotions || typeof rawEmotions !== 'object') {
      return {
        joy: 0.3,
        anger: 0.1,
        fear: 0.1,
        sadness: 0.1,
        disgust: 0.1,
        surprise: 0.2,
        trust: 0.4,
        anticipation: 0.3,
      };
    }

    return {
      joy: this.clamp(rawEmotions.joy || 0, 0, 1),
      anger: this.clamp(rawEmotions.anger || 0, 0, 1),
      fear: this.clamp(rawEmotions.fear || 0, 0, 1),
      sadness: this.clamp(rawEmotions.sadness || 0, 0, 1),
      disgust: this.clamp(rawEmotions.disgust || 0, 0, 1),
      surprise: this.clamp(rawEmotions.surprise || 0, 0, 1),
      trust: this.clamp(rawEmotions.trust || 0, 0, 1),
      anticipation: this.clamp(rawEmotions.anticipation || 0, 0, 1),
    };
  }

  /**
   * Process sentiment shifts with validation
   */
  private processSentimentShifts(rawShifts: any[], transcript: DebateTranscript): any[] {
    if (!Array.isArray(rawShifts)) {
      return [];
    }

    return rawShifts
      .filter(shift => shift && typeof shift === 'object')
      .map(shift => ({
        timestamp: shift.timestamp ? new Date(shift.timestamp) : new Date(),
        participantId: shift.participantId || 'unknown',
        previousSentiment: this.clamp(shift.previousSentiment || 0, -1, 1),
        newSentiment: this.clamp(shift.newSentiment || 0, -1, 1),
        trigger: shift.trigger || 'Unknown trigger',
      }))
      .slice(0, 10); // Limit to 10 most significant shifts
  }

  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidence(response: any, transcript: DebateTranscript): number {
    let confidence = 0.7; // Base confidence

    // More messages = higher confidence
    if (transcript.messages.length >= 10) confidence += 0.1;
    if (transcript.messages.length >= 20) confidence += 0.1;

    // Longer content = higher confidence
    const totalWordCount = transcript.messages.reduce((sum, msg) => sum + msg.wordCount, 0);
    if (totalWordCount >= 500) confidence += 0.1;
    if (totalWordCount >= 1000) confidence += 0.1;

    // Multiple participants = higher confidence
    if (transcript.participants.length >= 3) confidence += 0.05;

    return this.clamp(confidence, 0, 1);
  }

  /**
   * Create failed analysis result
   */
  private createFailedResult(
    transcript: DebateTranscript,
    request: SentimentAnalysisRequest,
    startTime: number,
    errorMessage: string
  ): SentimentAnalysisResult {
    return {
      analysisId: `sentiment_failed_${transcript.conversationId}_${Date.now()}`,
      conversationId: transcript.conversationId,
      analysisType: 'sentiment',
      version: '1.0',
      status: 'failed',
      confidence: 0,
      processingTime: Date.now() - startTime,
      tokensUsed: 0,
      createdAt: new Date(),
      overallSentiment: { polarity: 0, intensity: 0, neutrality: 1 },
      participantSentiments: {},
      sentimentShifts: [],
      insights: [`Analysis failed: ${errorMessage}`],
      metadata: { error: errorMessage },
    };
  }

  /**
   * Clamp value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{ status: string; details: any }> {
    try {
      const openaiHealth = await this.openaiService.healthCheck();
      return {
        status: openaiHealth.status === 'healthy' ? 'ready' : 'degraded',
        details: {
          service: 'sentiment-analysis',
          openaiStatus: openaiHealth.status,
          capabilities: [
            'basic_sentiment',
            'emotion_analysis',
            'progression_tracking',
            'participant_analysis',
            'shift_detection',
          ],
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          service: 'sentiment-analysis',
          error: error.message,
        },
      };
    }
  }
}
