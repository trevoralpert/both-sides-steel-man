import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import {
  TopicAnalysisRequest,
  TopicAnalysisResult,
  DebateTranscript,
  DebateMessage,
} from '../interfaces/analysis.interfaces';

/**
 * Topic Analysis Service
 * AI-powered topic analysis for debate transcripts including coherence,
 * drift detection, keyword extraction, and focus assessment
 */
@Injectable()
export class TopicAnalysisService {
  private readonly logger = new Logger(TopicAnalysisService.name);

  constructor(private readonly openaiService: OpenAIService) {}

  /**
   * Perform comprehensive topic analysis on a debate transcript
   */
  async analyzeTopic(
    transcript: DebateTranscript,
    request: TopicAnalysisRequest
  ): Promise<TopicAnalysisResult> {
    const startTime = Date.now();
    this.logger.log(`Starting topic analysis for conversation ${transcript.conversationId}`);

    try {
      // Validate transcript
      this.validateTranscript(transcript);

      // Build analysis prompts
      const { systemPrompt, userPrompt } = this.buildPrompts(transcript, request);

      // Generate cache key
      const cacheKey = this.openaiService.buildCacheKey(
        systemPrompt,
        userPrompt,
        { model: 'gpt-4o-mini', temperature: 0.1 }
      );

      // Define the expected JSON schema
      const responseSchema = {
        mainTopics: "array of objects with topic, relevance, coverage, participantEngagement, keywords",
        topicCoherence: {
          overall: "number",
          perPhase: "object",
          coherenceScore: "number"
        },
        topicDrift: "array of drift events",
        focus: {
          onTopic: "number",
          offtopicSegments: "array",
          focusScore: "number"
        },
        keywords: "array of keyword objects",
        insights: "array of strings"
      };

      // Call OpenAI for structured topic analysis
      const aiResponse = await this.openaiService.generateStructuredResponse<any>(
        systemPrompt,
        userPrompt,
        responseSchema,
        { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 3500 },
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
        `Completed topic analysis for conversation ${transcript.conversationId} in ${result.processingTime}ms`
      );

      return result;

    } catch (error) {
      this.logger.error(
        `Topic analysis failed for conversation ${transcript.conversationId}`,
        error.stack
      );
      
      return this.createFailedResult(transcript, request, startTime, error.message);
    }
  }

  /**
   * Validate transcript for topic analysis
   */
  private validateTranscript(transcript: DebateTranscript): void {
    if (!transcript.messages || transcript.messages.length < 5) {
      throw new Error('Insufficient messages for topic analysis (minimum 5 required)');
    }

    if (!transcript.topic?.title) {
      throw new Error('Debate topic is required for topic analysis');
    }

    const totalWordCount = transcript.messages.reduce((sum, msg) => sum + msg.wordCount, 0);
    if (totalWordCount < 100) {
      throw new Error('Insufficient content for meaningful topic analysis (minimum 100 words)');
    }
  }

  /**
   * Build system and user prompts for topic analysis
   */
  private buildPrompts(
    transcript: DebateTranscript,
    request: TopicAnalysisRequest
  ): { systemPrompt: string; userPrompt: string } {
    
    const systemPrompt = `You are an expert in discourse analysis and educational debate assessment, specializing in topic coherence and thematic analysis. Your task is to analyze how well students stayed on topic and engaged with the core themes of their debate.

**Analysis Goals:**
1. Identify main topics and themes discussed throughout the debate
2. Assess how coherently participants addressed the central topic
3. Measure participant engagement with different aspects of the topic
${request.detectDrift ? '4. Detect topic drift and analyze its impact on debate quality' : ''}
${request.extractKeywords ? '5. Extract key terms and concepts with relevance scoring' : ''}
${request.analyzeFocus ? '6. Analyze focus patterns and off-topic segments' : ''}

**Educational Context:**
- This is a structured academic debate between students
- Focus on how topic adherence contributes to learning outcomes
- Identify effective topical engagement vs. areas needing improvement
- Consider age-appropriate expectations for topic management

**Analysis Framework:**
- **Relevance Scale**: 0 (completely off-topic) to 1 (directly addresses core topic)
- **Coverage**: Percentage of debate time spent on each topic/theme
- **Coherence**: How logically connected the discussion remains to the central theme
- **Engagement**: How actively and meaningfully participants engage with topics

**Educational Assessment:**
- Recognize when topic expansion enhances understanding
- Distinguish between productive tangents and harmful drift
- Identify opportunities for better topic management
- Highlight effective topic development strategies

Return a JSON object with the exact structure specified in the schema.`;

    const userPrompt = this.buildUserPrompt(transcript, request);

    return { systemPrompt, userPrompt };
  }

  /**
   * Build user prompt with transcript data
   */
  private buildUserPrompt(
    transcript: DebateTranscript,
    request: TopicAnalysisRequest
  ): string {
    let prompt = `**Debate Topic Analysis Request**

**Primary Topic:** ${transcript.topic.title}
${transcript.topic.description ? `**Topic Description:** ${transcript.topic.description}\n` : ''}
${transcript.topic.category ? `**Category:** ${transcript.topic.category}\n` : ''}

**Participants and Roles:**
${transcript.participants.map(p => `- ${p.id} (${p.role.toUpperCase()}): ${p.messageCount} messages, ${p.wordCount} words`).join('\n')}

**Debate Phases:**
${this.getPhaseBreakdown(transcript.messages)}

**Full Conversation:**
${transcript.messages.map((msg, index) => {
  const participant = transcript.participants.find(p => p.id === msg.userId);
  const timeFromStart = new Date(msg.timestamp).getTime() - new Date(transcript.metadata.startTime).getTime();
  return `[${index + 1}] ${participant?.role || 'unknown'} (${Math.floor(timeFromStart / 60000)}:${String(Math.floor((timeFromStart % 60000) / 1000)).padStart(2, '0')}): ${msg.content}`;
}).join('\n\n')}

**Analysis Instructions:**

1. **Main Topics Identification:**
   - Identify 3-5 main topics/themes discussed in relation to the primary debate topic
   - For each topic, assess: relevance to main topic (0-1), coverage percentage, participant engagement levels
   - Extract key concepts and subtopics for each main topic

2. **Topic Coherence Assessment:**
   - Rate overall coherence (0-1): How well did the debate stay focused on related themes?
   - Assess coherence by debate phase (opening, discussion, rebuttal, closing)
   - Calculate coherence score considering logical flow and thematic consistency

${request.detectDrift ? `3. **Topic Drift Detection:**
   - Identify moments where conversation drifted from the main topic
   - For each drift: timestamp, participants involved, what caused the drift, severity
   - Assess whether drifts were productive (enhanced understanding) or harmful (distracted from goals)
   - Rate drift strength (0-1): How far off-topic did the conversation go?` : ''}

${request.analyzeFocus ? `4. **Focus Analysis:**
   - Calculate percentage of debate that stayed on-topic vs. off-topic
   - Identify specific off-topic segments with timestamps and participants
   - Rate overall focus score (0-1): How well did participants maintain topic discipline?
   - Analyze focus patterns: Did focus improve or degrade over time?` : ''}

${request.extractKeywords ? `5. **Keyword Extraction:**
   - Extract 15-20 key terms/phrases most relevant to the debate
   - For each keyword: frequency, relevance to main topic (0-1), associated sentiment
   - Include context examples showing how keywords were used
   - Identify topic-specific vocabulary and academic language usage` : ''}

6. **Educational Insights:**
   - How effectively did students engage with the assigned topic?
   - What topic management skills were demonstrated or need development?
   - How did topic adherence contribute to debate quality and learning?
   - What strategies could improve topical focus in future debates?

**Metadata:**
- Total Messages: ${transcript.metadata.messageCount}
- Debate Duration: ${Math.round(transcript.metadata.duration / 60)} minutes
- Average Message Length: ${Math.round(transcript.messages.reduce((sum, msg) => sum + msg.wordCount, 0) / transcript.messages.length)} words
- Status: ${transcript.metadata.status}`;

    return prompt;
  }

  /**
   * Get breakdown of messages by debate phase
   */
  private getPhaseBreakdown(messages: DebateMessage[]): string {
    const phaseCount: Record<string, number> = {};
    messages.forEach(msg => {
      phaseCount[msg.phase] = (phaseCount[msg.phase] || 0) + 1;
    });

    return Object.entries(phaseCount)
      .map(([phase, count]) => `- ${phase}: ${count} messages`)
      .join('\n');
  }

  /**
   * Process AI response and create final result
   */
  private processAIResponse(
    aiResponse: any,
    transcript: DebateTranscript,
    request: TopicAnalysisRequest,
    startTime: number
  ): TopicAnalysisResult {
    
    const processingTime = Date.now() - startTime;
    
    // Validate and normalize the AI response
    const normalizedResponse = this.normalizeAIResponse(aiResponse, transcript);

    return {
      analysisId: `topic_${transcript.conversationId}_${Date.now()}`,
      conversationId: transcript.conversationId,
      analysisType: 'topic',
      version: '1.0',
      status: 'completed',
      confidence: this.calculateConfidence(normalizedResponse, transcript),
      processingTime,
      tokensUsed: aiResponse.metadata.tokensUsed,
      createdAt: new Date(),
      
      // Topic-specific results
      mainTopics: this.processMainTopics(
        normalizedResponse.mainTopics || [],
        transcript
      ),
      
      topicCoherence: {
        overall: this.clamp(normalizedResponse.topicCoherence?.overall || 0.7, 0, 1),
        perPhase: this.processPhaseCoherence(
          normalizedResponse.topicCoherence?.perPhase || {},
          transcript
        ),
        coherenceScore: this.clamp(normalizedResponse.topicCoherence?.coherenceScore || 0.7, 0, 1),
      },
      
      topicDrift: request.detectDrift 
        ? this.processTopicDrift(normalizedResponse.topicDrift || [], transcript)
        : [],
      
      focus: {
        onTopic: this.clamp(normalizedResponse.focus?.onTopic || 80, 0, 100),
        offtopicSegments: request.analyzeFocus 
          ? this.processOfftopicSegments(normalizedResponse.focus?.offtopicSegments || [], transcript)
          : [],
        focusScore: this.clamp(normalizedResponse.focus?.focusScore || 0.8, 0, 1),
      },
      
      keywords: request.extractKeywords
        ? this.processKeywords(normalizedResponse.keywords || [], transcript)
        : [],
      
      insights: Array.isArray(normalizedResponse.insights) 
        ? normalizedResponse.insights.slice(0, 10) // Limit insights
        : ['Topic analysis completed successfully'],
        
      metadata: {
        cached: aiResponse.metadata.cached,
        primaryTopic: transcript.topic.title,
        messageCount: transcript.messages.length,
        totalWordCount: transcript.messages.reduce((sum, msg) => sum + msg.wordCount, 0),
        debatePhases: this.getUniquePhases(transcript.messages),
      },
    };
  }

  /**
   * Normalize AI response to ensure valid data
   */
  private normalizeAIResponse(aiResponse: any, transcript: DebateTranscript): any {
    return {
      mainTopics: Array.isArray(aiResponse.mainTopics) ? aiResponse.mainTopics : [],
      topicCoherence: aiResponse.topicCoherence || { overall: 0.7, perPhase: {}, coherenceScore: 0.7 },
      topicDrift: Array.isArray(aiResponse.topicDrift) ? aiResponse.topicDrift : [],
      focus: aiResponse.focus || { onTopic: 80, offtopicSegments: [], focusScore: 0.8 },
      keywords: Array.isArray(aiResponse.keywords) ? aiResponse.keywords : [],
      insights: Array.isArray(aiResponse.insights) ? aiResponse.insights : [],
    };
  }

  /**
   * Process main topics with validation
   */
  private processMainTopics(rawTopics: any[], transcript: DebateTranscript): any[] {
    return rawTopics
      .filter(topic => topic && typeof topic === 'object' && topic.topic)
      .slice(0, 8) // Limit to 8 main topics
      .map(topic => ({
        topic: String(topic.topic).slice(0, 200),
        relevance: this.clamp(topic.relevance || 0.5, 0, 1),
        coverage: this.clamp(topic.coverage || 10, 0, 100),
        participantEngagement: this.processParticipantEngagement(
          topic.participantEngagement || {},
          transcript.participants
        ),
        keywords: Array.isArray(topic.keywords) 
          ? topic.keywords.slice(0, 10).map(k => String(k).slice(0, 50))
          : [],
      }));
  }

  /**
   * Process participant engagement for topics
   */
  private processParticipantEngagement(
    rawEngagement: any,
    participants: any[]
  ): Record<string, number> {
    const engagement: Record<string, number> = {};
    
    participants.forEach(participant => {
      engagement[participant.id] = this.clamp(
        rawEngagement[participant.id] || 0.5,
        0,
        1
      );
    });

    return engagement;
  }

  /**
   * Process phase coherence scores
   */
  private processPhaseCoherence(rawPhases: any, transcript: DebateTranscript): Record<string, number> {
    const phases = this.getUniquePhases(transcript.messages);
    const processed: Record<string, number> = {};

    phases.forEach(phase => {
      processed[phase] = this.clamp(rawPhases[phase] || 0.7, 0, 1);
    });

    return processed;
  }

  /**
   * Process topic drift events
   */
  private processTopicDrift(rawDrift: any[], transcript: DebateTranscript): any[] {
    if (!Array.isArray(rawDrift)) return [];

    return rawDrift
      .filter(drift => drift && typeof drift === 'object')
      .slice(0, 15) // Limit drift events
      .map(drift => ({
        timestamp: drift.timestamp ? new Date(drift.timestamp) : new Date(),
        fromTopic: String(drift.fromTopic || 'Unknown').slice(0, 100),
        toTopic: String(drift.toTopic || 'Unknown').slice(0, 100),
        driftStrength: this.clamp(drift.driftStrength || 0.5, 0, 1),
        participant: drift.participant || 'Unknown',
        reason: String(drift.reason || 'Unspecified').slice(0, 200),
      }));
  }

  /**
   * Process off-topic segments
   */
  private processOfftopicSegments(rawSegments: any[], transcript: DebateTranscript): any[] {
    if (!Array.isArray(rawSegments)) return [];

    return rawSegments
      .filter(segment => segment && typeof segment === 'object')
      .slice(0, 10) // Limit segments
      .map(segment => ({
        startTime: segment.startTime ? new Date(segment.startTime) : new Date(),
        endTime: segment.endTime ? new Date(segment.endTime) : new Date(),
        content: String(segment.content || '').slice(0, 300),
        participantId: segment.participantId || 'Unknown',
      }));
  }

  /**
   * Process keywords with validation
   */
  private processKeywords(rawKeywords: any[], transcript: DebateTranscript): any[] {
    if (!Array.isArray(rawKeywords)) return [];

    return rawKeywords
      .filter(keyword => keyword && typeof keyword === 'object' && keyword.word)
      .slice(0, 25) // Limit keywords
      .map(keyword => ({
        word: String(keyword.word).slice(0, 50),
        frequency: Math.max(0, parseInt(keyword.frequency) || 1),
        relevance: this.clamp(keyword.relevance || 0.5, 0, 1),
        sentiment: this.clamp(keyword.sentiment || 0, -1, 1),
        context: Array.isArray(keyword.context) 
          ? keyword.context.slice(0, 3).map((c: any) => String(c).slice(0, 100))
          : [],
      }));
  }

  /**
   * Get unique debate phases from messages
   */
  private getUniquePhases(messages: DebateMessage[]): string[] {
    const phases = new Set(messages.map(msg => msg.phase));
    return Array.from(phases);
  }

  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidence(response: any, transcript: DebateTranscript): number {
    let confidence = 0.7; // Base confidence

    // More messages = higher confidence
    if (transcript.messages.length >= 15) confidence += 0.1;
    if (transcript.messages.length >= 30) confidence += 0.1;

    // Longer content = higher confidence
    const totalWordCount = transcript.messages.reduce((sum, msg) => sum + msg.wordCount, 0);
    if (totalWordCount >= 800) confidence += 0.1;

    // Clear topic definition = higher confidence
    if (transcript.topic.description) confidence += 0.05;

    // Multiple phases = higher confidence
    const uniquePhases = this.getUniquePhases(transcript.messages);
    if (uniquePhases.length >= 3) confidence += 0.05;

    return this.clamp(confidence, 0, 1);
  }

  /**
   * Create failed analysis result
   */
  private createFailedResult(
    transcript: DebateTranscript,
    request: TopicAnalysisRequest,
    startTime: number,
    errorMessage: string
  ): TopicAnalysisResult {
    return {
      analysisId: `topic_failed_${transcript.conversationId}_${Date.now()}`,
      conversationId: transcript.conversationId,
      analysisType: 'topic',
      version: '1.0',
      status: 'failed',
      confidence: 0,
      processingTime: Date.now() - startTime,
      tokensUsed: 0,
      createdAt: new Date(),
      mainTopics: [],
      topicCoherence: { overall: 0, perPhase: {}, coherenceScore: 0 },
      topicDrift: [],
      focus: { onTopic: 0, offtopicSegments: [], focusScore: 0 },
      keywords: [],
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
          service: 'topic-analysis',
          openaiStatus: openaiHealth.status,
          capabilities: [
            'topic_identification',
            'coherence_analysis',
            'drift_detection',
            'keyword_extraction',
            'focus_assessment',
          ],
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          service: 'topic-analysis',
          error: error.message,
        },
      };
    }
  }
}
