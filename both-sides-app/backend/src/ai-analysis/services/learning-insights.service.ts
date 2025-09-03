import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import {
  LearningInsightsRequest,
  LearningInsightsResult,
  DebateTranscript,
  SentimentAnalysisResult,
  TopicAnalysisResult,
  ArgumentAnalysisResult,
} from '../interfaces/analysis.interfaces';

/**
 * Learning Insights Service
 * AI-powered personalized learning insights generation for students
 * based on their debate performance and interaction patterns
 */
@Injectable()
export class LearningInsightsService {
  private readonly logger = new Logger(LearningInsightsService.name);

  constructor(private readonly openaiService: OpenAIService) {}

  /**
   * Generate personalized learning insights for a student
   */
  async generateLearningInsights(
    transcript: DebateTranscript,
    request: LearningInsightsRequest,
    previousAnalyses?: {
      sentiment?: SentimentAnalysisResult;
      topic?: TopicAnalysisResult;
      argument?: ArgumentAnalysisResult;
    }
  ): Promise<LearningInsightsResult> {
    const startTime = Date.now();
    this.logger.log(
      `Starting learning insights generation for user ${request.targetUserId} in conversation ${transcript.conversationId}`
    );

    try {
      // Validate request and transcript
      this.validateRequest(transcript, request);

      // Build comprehensive analysis prompts
      const { systemPrompt, userPrompt } = this.buildPrompts(
        transcript,
        request,
        previousAnalyses
      );

      // Generate cache key
      const cacheKey = this.openaiService.buildCacheKey(
        systemPrompt,
        userPrompt,
        { model: 'gpt-4o-mini', temperature: 0.2 }
      );

      // Define the expected JSON schema
      const responseSchema = {
        studentProfile: {
          strengths: "array of strength objects",
          growthAreas: "array of growth area objects",
          learningStyle: {
            preference: "string",
            characteristics: "array of strings",
            adaptations: "array of strings"
          }
        },
        skillAssessment: {
          criticalThinking: "object with score and evidence",
          communication: "object with clarity, persuasion, listening scores",
          collaboration: "object with scores and evidence",
          research: "object with evidence usage and quality scores"
        },
        behaviorInsights: {
          engagementPatterns: "object with participation metrics",
          emotionalRegulation: "object with scores and observations",
          adaptability: "object with flexibility scores"
        },
        comparisons: request.compareToClass ? "object with class comparisons" : undefined,
        recommendations: "array of actionable recommendation objects",
        insights: "array of educational insights"
      };

      // Call OpenAI for structured learning insights
      const aiResponse = await this.openaiService.generateStructuredResponse<any>(
        systemPrompt,
        userPrompt,
        responseSchema,
        { model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 4500 },
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
        `Completed learning insights generation for user ${request.targetUserId} in ${result.processingTime}ms`
      );

      return result;

    } catch (error) {
      this.logger.error(
        `Learning insights generation failed for user ${request.targetUserId}`,
        error.stack
      );
      
      return this.createFailedResult(transcript, request, startTime, error.message);
    }
  }

  /**
   * Validate request and transcript for learning insights
   */
  private validateRequest(transcript: DebateTranscript, request: LearningInsightsRequest): void {
    if (!request.targetUserId) {
      throw new Error('Target user ID is required for learning insights');
    }

    const targetParticipant = transcript.participants.find(p => p.id === request.targetUserId);
    if (!targetParticipant) {
      throw new Error(`Target user ${request.targetUserId} not found in conversation participants`);
    }

    const userMessages = transcript.messages.filter(msg => msg.userId === request.targetUserId);
    if (userMessages.length < 2) {
      throw new Error('Insufficient messages from target user for meaningful insights (minimum 2 required)');
    }

    const userWordCount = userMessages.reduce((sum, msg) => sum + msg.wordCount, 0);
    if (userWordCount < 50) {
      throw new Error('Insufficient content from target user for meaningful insights (minimum 50 words)');
    }

    if (!request.insightTypes || request.insightTypes.length === 0) {
      throw new Error('At least one insight type must be specified');
    }

    const validTypes = ['skills', 'knowledge', 'behavior', 'engagement', 'growth'];
    const invalidTypes = request.insightTypes.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      throw new Error(`Invalid insight types: ${invalidTypes.join(', ')}`);
    }
  }

  /**
   * Build system and user prompts for learning insights
   */
  private buildPrompts(
    transcript: DebateTranscript,
    request: LearningInsightsRequest,
    previousAnalyses?: any
  ): { systemPrompt: string; userPrompt: string } {
    
    const systemPrompt = `You are an expert educational psychologist and learning analytics specialist, focusing on personalized student development through debate performance analysis. Your task is to generate actionable, supportive insights that help a specific student improve their critical thinking, communication, and debate skills.

**Analysis Goals:**
1. Create a comprehensive learning profile for the target student
2. Assess specific skills: critical thinking, communication, collaboration, research
3. Identify behavioral patterns and learning preferences
4. Generate personalized, actionable recommendations for growth
5. Provide constructive feedback that motivates and guides improvement

**Educational Philosophy:**
- Focus on growth mindset and continuous improvement
- Celebrate effort and progress, not just achievement
- Provide specific, actionable feedback students can implement
- Consider age-appropriate expectations for high school students
- Emphasize learning as a journey, not a destination

**Insight Categories:**
${request.insightTypes.map(type => {
  switch (type) {
    case 'skills': return '- **Skills**: Critical thinking, communication, research, collaboration abilities';
    case 'knowledge': return '- **Knowledge**: Subject matter understanding, depth of engagement with topics';
    case 'behavior': return '- **Behavior**: Participation patterns, emotional regulation, adaptability';
    case 'engagement': return '- **Engagement**: Active participation, initiative, enthusiasm for learning';
    case 'growth': return '- **Growth**: Areas for development, learning trajectory, potential';
    default: return `- **${type.charAt(0).toUpperCase() + type.slice(1)}**: General analysis`;
  }
}).join('\n')}

**Assessment Framework:**
- **Strengths**: What the student does well (evidence-based)
- **Growth Areas**: Specific skills to develop (with clear next steps)
- **Learning Style**: How the student learns best
- **Recommendations**: Actionable strategies for improvement

**Personalization Level**: ${request.personalizationLevel || 'detailed'}
- Basic: General insights and recommendations
- Detailed: Specific examples and targeted feedback
- Advanced: Deep analysis with learning theory applications

**Scoring Guidelines (0-1 scale):**
- 0.9-1.0: Exceptional (exceeds grade-level expectations)
- 0.7-0.8: Proficient (meets grade-level expectations)
- 0.5-0.6: Developing (approaching grade-level expectations)
- 0.3-0.4: Emerging (below grade-level, needs support)
- 0.0-0.2: Beginning (significant support needed)

**Tone and Approach:**
- Encouraging and supportive
- Specific and actionable
- Growth-oriented
- Age-appropriate language
- Focuses on potential and improvement

Return a JSON object with the exact structure specified in the schema.`;

    const userPrompt = this.buildUserPrompt(transcript, request, previousAnalyses);

    return { systemPrompt, userPrompt };
  }

  /**
   * Build user prompt with student-specific data
   */
  private buildUserPrompt(
    transcript: DebateTranscript,
    request: LearningInsightsRequest,
    previousAnalyses?: any
  ): string {
    const targetParticipant = transcript.participants.find(p => p.id === request.targetUserId)!;
    const userMessages = transcript.messages.filter(msg => msg.userId === request.targetUserId);
    
    let prompt = `**Learning Insights Analysis Request**

**Target Student:** ${request.targetUserId}
**Debate Topic:** ${transcript.topic.title}
${transcript.topic.description ? `**Topic Description:** ${transcript.topic.description}\n` : ''}

**Student's Debate Performance:**
- **Role:** ${targetParticipant.role.toUpperCase()}
- **Messages:** ${userMessages.length} out of ${transcript.metadata.messageCount} total
- **Word Count:** ${userMessages.reduce((sum, msg) => sum + msg.wordCount, 0)} words
- **Average Response Time:** ${targetParticipant.avgResponseTime}ms
- **Message Types:** ${this.getMessageTypeBreakdown(userMessages)}

**Student's Contributions Timeline:**
${userMessages.map((msg, index) => {
  const timeFromStart = new Date(msg.timestamp).getTime() - new Date(transcript.metadata.startTime).getTime();
  const messageLabel = msg.messageType === 'argument' ? '[ARGUMENT]' : 
                      msg.messageType === 'rebuttal' ? '[REBUTTAL]' : 
                      msg.messageType === 'question' ? '[QUESTION]' : '[DISCUSSION]';
  return `[${index + 1}] ${messageLabel} (${Math.floor(timeFromStart / 60000)}:${String(Math.floor((timeFromStart % 60000) / 1000)).padStart(2, '0')}) [${msg.wordCount} words]: ${msg.content}`;
}).join('\n\n')}

**Context - Other Participants:**
${transcript.participants
  .filter(p => p.id !== request.targetUserId)
  .map(p => `- ${p.id} (${p.role}): ${p.messageCount} messages, ${p.wordCount} words`)
  .join('\n')}

**Full Conversation Context:**
${transcript.messages.map((msg, index) => {
  const participant = transcript.participants.find(p => p.id === msg.userId);
  const isTarget = msg.userId === request.targetUserId ? '>>> ' : '';
  const timeFromStart = new Date(msg.timestamp).getTime() - new Date(transcript.metadata.startTime).getTime();
  return `[${index + 1}] ${isTarget}${participant?.role || 'unknown'} (${Math.floor(timeFromStart / 60000)}:${String(Math.floor((timeFromStart % 60000) / 1000)).padStart(2, '0')}): ${msg.content.slice(0, 200)}${msg.content.length > 200 ? '...' : ''}`;
}).join('\n')}

${previousAnalyses ? this.buildPreviousAnalysesContext(previousAnalyses, request.targetUserId) : ''}

**Analysis Instructions:**

1. **Student Profile Development:**
   - Identify 3-4 key strengths with specific evidence from the debate
   - Identify 2-3 growth areas with clear development paths
   - Determine learning style preferences based on participation patterns
   - Suggest specific adaptations that would enhance their learning

2. **Skill Assessment:**
   - **Critical Thinking** (0-1): Analyze argument quality, logic, evidence evaluation
   - **Communication** - Clarity (0-1): How clearly ideas were expressed
   - **Communication** - Persuasion (0-1): Effectiveness in making compelling arguments
   - **Communication** - Listening (0-1): Response to and engagement with others' ideas
   - **Collaboration** (0-1): Respectfulness, engagement with opposing viewpoints
   - **Research** - Evidence Usage (0-1): Use of facts, data, expert opinions
   - **Research** - Source Quality (0-1): Credibility and relevance of information used

3. **Behavioral Insights:**
   - **Engagement Patterns**: Participation frequency, response timing, initiative-taking
   - **Emotional Regulation**: How well they managed emotions and stayed constructive
   - **Adaptability**: Response to challenges, ability to adjust approach

${request.compareToClass ? `4. **Class Comparisons:**
   - How does this student compare to typical performance at their level?
   - What percentile would you estimate for key skills?
   - What are their relative strengths compared to peers?
   - Where do they need the most support relative to classmates?` : ''}

5. **Personalized Recommendations:**
   - **Immediate** (next 1-2 weeks): Specific actions they can take right away
   - **Short-term** (next month): Skill-building activities and practice opportunities
   - **Long-term** (this semester): Deeper learning goals and development areas
   - Include specific resources, strategies, and practice activities

6. **Educational Insights:**
   - What learning opportunities did this debate create for the student?
   - How can they build on their demonstrated strengths?
   - What support do they need to address growth areas?
   - How can future debates be structured to maximize their learning?

**Requested Insight Types**: ${request.insightTypes.join(', ')}
**Personalization Level**: ${request.personalizationLevel || 'detailed'}
${request.includeRecommendations ? '**Include Recommendations**: Yes (provide detailed action items)' : ''}`;

    return prompt;
  }

  /**
   * Get message type breakdown for user
   */
  private getMessageTypeBreakdown(messages: any[]): string {
    const typeCount: Record<string, number> = {};
    messages.forEach(msg => {
      typeCount[msg.messageType] = (typeCount[msg.messageType] || 0) + 1;
    });

    return Object.entries(typeCount)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
  }

  /**
   * Build previous analyses context
   */
  private buildPreviousAnalysesContext(previousAnalyses: any, targetUserId: string): string {
    let context = '\n**Previous Analysis Results:**\n';

    if (previousAnalyses.sentiment) {
      const userSentiment = previousAnalyses.sentiment.participantSentiments[targetUserId];
      if (userSentiment) {
        context += `- **Sentiment**: Average polarity ${userSentiment.averagePolarity.toFixed(2)}, emotional stability ${userSentiment.emotionalStability.toFixed(2)}\n`;
      }
    }

    if (previousAnalyses.topic && previousAnalyses.topic.mainTopics) {
      context += `- **Topic Engagement**: Student engaged with topics: ${previousAnalyses.topic.mainTopics
        .filter((topic: any) => topic.participantEngagement[targetUserId] > 0.5)
        .map((topic: any) => topic.topic)
        .join(', ')}\n`;
    }

    if (previousAnalyses.argument && previousAnalyses.argument.participantScores[targetUserId]) {
      const scores = previousAnalyses.argument.participantScores[targetUserId];
      context += `- **Argument Quality**: Overall ${scores.argumentQuality.toFixed(2)}, Evidence ${scores.evidenceUsage.toFixed(2)}, Logic ${scores.logicalReasoning.toFixed(2)}\n`;
    }

    return context;
  }

  /**
   * Process AI response and create final result
   */
  private processAIResponse(
    aiResponse: any,
    transcript: DebateTranscript,
    request: LearningInsightsRequest,
    startTime: number
  ): LearningInsightsResult {
    
    const processingTime = Date.now() - startTime;
    
    // Validate and normalize the AI response
    const normalizedResponse = this.normalizeAIResponse(aiResponse, transcript, request);

    return {
      analysisId: `learning_${transcript.conversationId}_${request.targetUserId}_${Date.now()}`,
      conversationId: transcript.conversationId,
      analysisType: 'learning_insights',
      version: '1.0',
      status: 'completed',
      confidence: this.calculateConfidence(normalizedResponse, transcript, request),
      processingTime,
      tokensUsed: aiResponse.metadata.tokensUsed,
      createdAt: new Date(),
      
      // Learning insights specific results
      studentProfile: {
        strengths: this.processStrengths(normalizedResponse.studentProfile?.strengths || []),
        growthAreas: this.processGrowthAreas(normalizedResponse.studentProfile?.growthAreas || []),
        learningStyle: {
          preference: String(normalizedResponse.studentProfile?.learningStyle?.preference || 'mixed'),
          characteristics: this.processStringArray(normalizedResponse.studentProfile?.learningStyle?.characteristics || []),
          adaptations: this.processStringArray(normalizedResponse.studentProfile?.learningStyle?.adaptations || []),
        },
      },
      
      skillAssessment: {
        criticalThinking: {
          score: this.clamp(normalizedResponse.skillAssessment?.criticalThinking?.score || 0.6, 0, 1),
          evidence: this.processStringArray(normalizedResponse.skillAssessment?.criticalThinking?.evidence || []),
          nextSteps: this.processStringArray(normalizedResponse.skillAssessment?.criticalThinking?.nextSteps || []),
        },
        communication: {
          clarity: this.clamp(normalizedResponse.skillAssessment?.communication?.clarity || 0.6, 0, 1),
          persuasion: this.clamp(normalizedResponse.skillAssessment?.communication?.persuasion || 0.6, 0, 1),
          listening: this.clamp(normalizedResponse.skillAssessment?.communication?.listening || 0.6, 0, 1),
          evidence: this.processStringArray(normalizedResponse.skillAssessment?.communication?.evidence || []),
        },
        collaboration: {
          score: this.clamp(normalizedResponse.skillAssessment?.collaboration?.score || 0.6, 0, 1),
          respectfulness: this.clamp(normalizedResponse.skillAssessment?.collaboration?.respectfulness || 0.7, 0, 1),
          engagement: this.clamp(normalizedResponse.skillAssessment?.collaboration?.engagement || 0.6, 0, 1),
          evidence: this.processStringArray(normalizedResponse.skillAssessment?.collaboration?.evidence || []),
        },
        research: {
          evidenceUsage: this.clamp(normalizedResponse.skillAssessment?.research?.evidenceUsage || 0.5, 0, 1),
          sourceQuality: this.clamp(normalizedResponse.skillAssessment?.research?.sourceQuality || 0.5, 0, 1),
          factAccuracy: this.clamp(normalizedResponse.skillAssessment?.research?.factAccuracy || 0.7, 0, 1),
          evidence: this.processStringArray(normalizedResponse.skillAssessment?.research?.evidence || []),
        },
      },
      
      behaviorInsights: {
        engagementPatterns: {
          participationLevel: this.clamp(normalizedResponse.behaviorInsights?.engagementPatterns?.participationLevel || 0.6, 0, 1),
          responseLatency: Math.max(0, normalizedResponse.behaviorInsights?.engagementPatterns?.responseLatency || 30000),
          initiativeScore: this.clamp(normalizedResponse.behaviorInsights?.engagementPatterns?.initiativeScore || 0.5, 0, 1),
          patterns: this.processStringArray(normalizedResponse.behaviorInsights?.engagementPatterns?.patterns || []),
        },
        emotionalRegulation: {
          score: this.clamp(normalizedResponse.behaviorInsights?.emotionalRegulation?.score || 0.7, 0, 1),
          stressResponse: String(normalizedResponse.behaviorInsights?.emotionalRegulation?.stressResponse || 'adaptive'),
          resilience: this.clamp(normalizedResponse.behaviorInsights?.emotionalRegulation?.resilience || 0.7, 0, 1),
          observations: this.processStringArray(normalizedResponse.behaviorInsights?.emotionalRegulation?.observations || []),
        },
        adaptability: {
          score: this.clamp(normalizedResponse.behaviorInsights?.adaptability?.score || 0.6, 0, 1),
          flexibilityIndicators: this.processStringArray(normalizedResponse.behaviorInsights?.adaptability?.flexibilityIndicators || []),
          changeResponse: String(normalizedResponse.behaviorInsights?.adaptability?.changeResponse || 'moderate'),
        },
      },
      
      comparisons: request.compareToClass ? this.processComparisons(normalizedResponse.comparisons) : undefined,
      
      recommendations: this.processRecommendations(normalizedResponse.recommendations || []),
      
      insights: Array.isArray(normalizedResponse.insights) 
        ? normalizedResponse.insights.slice(0, 8)
        : ['Learning insights generated successfully'],
        
      metadata: {
        cached: aiResponse.metadata.cached,
        targetUserId: request.targetUserId,
        insightTypes: request.insightTypes,
        personalizationLevel: request.personalizationLevel || 'detailed',
        userMessageCount: transcript.messages.filter(m => m.userId === request.targetUserId).length,
        userWordCount: transcript.messages
          .filter(m => m.userId === request.targetUserId)
          .reduce((sum, m) => sum + m.wordCount, 0),
      },
    };
  }

  /**
   * Normalize AI response to ensure valid data
   */
  private normalizeAIResponse(aiResponse: any, transcript: DebateTranscript, request: LearningInsightsRequest): any {
    return {
      studentProfile: aiResponse.studentProfile || {},
      skillAssessment: aiResponse.skillAssessment || {},
      behaviorInsights: aiResponse.behaviorInsights || {},
      comparisons: aiResponse.comparisons || undefined,
      recommendations: Array.isArray(aiResponse.recommendations) ? aiResponse.recommendations : [],
      insights: Array.isArray(aiResponse.insights) ? aiResponse.insights : [],
    };
  }

  /**
   * Process strengths with validation
   */
  private processStrengths(rawStrengths: any[]): any[] {
    return rawStrengths
      .filter(strength => strength && typeof strength === 'object' && strength.skill)
      .slice(0, 5) // Limit strengths
      .map(strength => ({
        skill: String(strength.skill).slice(0, 100),
        evidence: this.processStringArray(strength.evidence || []),
        score: this.clamp(strength.score || 0.7, 0, 1),
        development: this.validateDevelopmentLevel(strength.development),
      }));
  }

  /**
   * Process growth areas with validation
   */
  private processGrowthAreas(rawGrowthAreas: any[]): any[] {
    return rawGrowthAreas
      .filter(area => area && typeof area === 'object' && area.skill)
      .slice(0, 4) // Limit growth areas
      .map(area => ({
        skill: String(area.skill).slice(0, 100),
        currentLevel: this.clamp(area.currentLevel || 0.4, 0, 1),
        targetLevel: this.clamp(area.targetLevel || 0.7, 0, 1),
        barriers: this.processStringArray(area.barriers || []),
        recommendations: this.processStringArray(area.recommendations || []),
        priority: this.validatePriority(area.priority),
      }));
  }

  /**
   * Process string arrays with validation
   */
  private processStringArray(rawArray: any[], maxItems: number = 5, maxLength: number = 200): string[] {
    if (!Array.isArray(rawArray)) return [];

    return rawArray
      .filter(item => typeof item === 'string' || typeof item === 'number')
      .slice(0, maxItems)
      .map(item => String(item).slice(0, maxLength));
  }

  /**
   * Validate development level
   */
  private validateDevelopmentLevel(level: string): 'emerging' | 'developing' | 'proficient' | 'advanced' {
    const validLevels = ['emerging', 'developing', 'proficient', 'advanced'];
    return validLevels.includes(level) ? level as any : 'developing';
  }

  /**
   * Validate priority level
   */
  private validatePriority(priority: string): 'low' | 'medium' | 'high' {
    const validPriorities = ['low', 'medium', 'high'];
    return validPriorities.includes(priority) ? priority as any : 'medium';
  }

  /**
   * Process comparisons data
   */
  private processComparisons(rawComparisons: any): any {
    if (!rawComparisons || typeof rawComparisons !== 'object') {
      return {
        classAverage: {},
        percentileRank: {},
        relativeStrengths: [],
        improvementAreas: [],
      };
    }

    return {
      classAverage: rawComparisons.classAverage || {},
      percentileRank: rawComparisons.percentileRank || {},
      relativeStrengths: this.processStringArray(rawComparisons.relativeStrengths || []),
      improvementAreas: this.processStringArray(rawComparisons.improvementAreas || []),
    };
  }

  /**
   * Process recommendations with validation
   */
  private processRecommendations(rawRecommendations: any[]): any[] {
    return rawRecommendations
      .filter(rec => rec && typeof rec === 'object' && rec.category && rec.action)
      .slice(0, 10) // Limit recommendations
      .map(rec => ({
        category: String(rec.category).slice(0, 50),
        priority: this.validateRecommendationPriority(rec.priority),
        action: String(rec.action).slice(0, 300),
        rationale: String(rec.rationale || '').slice(0, 200),
        expectedOutcome: String(rec.expectedOutcome || '').slice(0, 200),
        resources: this.processStringArray(rec.resources || [], 3, 100),
      }));
  }

  /**
   * Validate recommendation priority
   */
  private validateRecommendationPriority(priority: string): 'immediate' | 'short_term' | 'long_term' {
    const validPriorities = ['immediate', 'short_term', 'long_term'];
    return validPriorities.includes(priority) ? priority as any : 'short_term';
  }

  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidence(response: any, transcript: DebateTranscript, request: LearningInsightsRequest): number {
    let confidence = 0.7; // Base confidence

    // More messages from target user = higher confidence
    const userMessages = transcript.messages.filter(msg => msg.userId === request.targetUserId);
    if (userMessages.length >= 5) confidence += 0.1;
    if (userMessages.length >= 10) confidence += 0.1;

    // More content from user = higher confidence
    const userWordCount = userMessages.reduce((sum, msg) => sum + msg.wordCount, 0);
    if (userWordCount >= 200) confidence += 0.1;
    if (userWordCount >= 500) confidence += 0.1;

    // Multiple insight types = higher confidence
    if (request.insightTypes.length >= 3) confidence += 0.05;

    // Advanced personalization = slightly lower confidence (more complex)
    if (request.personalizationLevel === 'advanced') confidence -= 0.05;

    return this.clamp(confidence, 0, 1);
  }

  /**
   * Create failed analysis result
   */
  private createFailedResult(
    transcript: DebateTranscript,
    request: LearningInsightsRequest,
    startTime: number,
    errorMessage: string
  ): LearningInsightsResult {
    return {
      analysisId: `learning_failed_${transcript.conversationId}_${request.targetUserId}_${Date.now()}`,
      conversationId: transcript.conversationId,
      analysisType: 'learning_insights',
      version: '1.0',
      status: 'failed',
      confidence: 0,
      processingTime: Date.now() - startTime,
      tokensUsed: 0,
      createdAt: new Date(),
      studentProfile: {
        strengths: [],
        growthAreas: [],
        learningStyle: { preference: 'unknown', characteristics: [], adaptations: [] },
      },
      skillAssessment: {
        criticalThinking: { score: 0, evidence: [], nextSteps: [] },
        communication: { clarity: 0, persuasion: 0, listening: 0, evidence: [] },
        collaboration: { score: 0, respectfulness: 0, engagement: 0, evidence: [] },
        research: { evidenceUsage: 0, sourceQuality: 0, factAccuracy: 0, evidence: [] },
      },
      behaviorInsights: {
        engagementPatterns: { participationLevel: 0, responseLatency: 0, initiativeScore: 0, patterns: [] },
        emotionalRegulation: { score: 0, stressResponse: 'unknown', resilience: 0, observations: [] },
        adaptability: { score: 0, flexibilityIndicators: [], changeResponse: 'unknown' },
      },
      recommendations: [],
      insights: [`Analysis failed: ${errorMessage}`],
      metadata: { error: errorMessage, targetUserId: request.targetUserId },
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
          service: 'learning-insights',
          openaiStatus: openaiHealth.status,
          capabilities: [
            'skill_assessment',
            'personalized_recommendations',
            'behavioral_insights',
            'growth_tracking',
            'learning_style_analysis',
          ],
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          service: 'learning-insights',
          error: error.message,
        },
      };
    }
  }
}
