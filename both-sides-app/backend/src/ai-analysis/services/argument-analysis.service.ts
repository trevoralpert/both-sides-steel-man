import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import {
  ArgumentAnalysisRequest,
  ArgumentAnalysisResult,
  DebateTranscript,
  DebateMessage,
} from '../interfaces/analysis.interfaces';

/**
 * Argument Analysis Service
 * AI-powered argument analysis for debate transcripts including
 * argument structure, evidence evaluation, fallacy detection, and quality assessment
 */
@Injectable()
export class ArgumentAnalysisService {
  private readonly logger = new Logger(ArgumentAnalysisService.name);

  constructor(private readonly openaiService: OpenAIService) {}

  /**
   * Perform comprehensive argument analysis on a debate transcript
   */
  async analyzeArguments(
    transcript: DebateTranscript,
    request: ArgumentAnalysisRequest
  ): Promise<ArgumentAnalysisResult> {
    const startTime = Date.now();
    this.logger.log(`Starting argument analysis for conversation ${transcript.conversationId}`);

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
        arguments: "array of argument objects with structure, evidence, and scoring",
        fallacies: request.detectFallacies ? "array of detected fallacies" : undefined,
        qualityMetrics: {
          overallQuality: "number",
          logicalCoherence: "number",
          evidenceStrength: "number",
          argumentDiversity: "number",
          engagementLevel: "number"
        },
        participantScores: "object with participant-specific scoring and feedback",
        insights: "array of educational insights"
      };

      // Call OpenAI for structured argument analysis
      const aiResponse = await this.openaiService.generateStructuredResponse<any>(
        systemPrompt,
        userPrompt,
        responseSchema,
        { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 4000 },
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
        `Completed argument analysis for conversation ${transcript.conversationId} in ${result.processingTime}ms`
      );

      return result;

    } catch (error) {
      this.logger.error(
        `Argument analysis failed for conversation ${transcript.conversationId}`,
        error.stack
      );
      
      return this.createFailedResult(transcript, request, startTime, error.message);
    }
  }

  /**
   * Validate transcript for argument analysis
   */
  private validateTranscript(transcript: DebateTranscript): void {
    if (!transcript.messages || transcript.messages.length < 4) {
      throw new Error('Insufficient messages for argument analysis (minimum 4 required)');
    }

    const argumentMessages = transcript.messages.filter(msg => 
      msg.messageType === 'argument' || msg.messageType === 'rebuttal'
    );

    if (argumentMessages.length < 2) {
      throw new Error('Insufficient argumentative content for analysis');
    }

    const totalWordCount = transcript.messages.reduce((sum, msg) => sum + msg.wordCount, 0);
    if (totalWordCount < 200) {
      throw new Error('Insufficient content for meaningful argument analysis (minimum 200 words)');
    }
  }

  /**
   * Build system and user prompts for argument analysis
   */
  private buildPrompts(
    transcript: DebateTranscript,
    request: ArgumentAnalysisRequest
  ): { systemPrompt: string; userPrompt: string } {
    
    const systemPrompt = `You are an expert in critical thinking, argumentation theory, and educational assessment, specializing in analyzing student debate arguments. Your task is to evaluate the logical structure, evidence quality, and reasoning skills demonstrated in a student debate.

**Analysis Goals:**
1. Identify and categorize arguments (claims, evidence, warrants, rebuttals, concessions)
2. Assess argument quality, strength, and logical structure
3. Evaluate evidence usage and credibility
${request.detectFallacies ? '4. Detect logical fallacies and reasoning errors' : ''}
${request.analyzeEvidence ? '5. Analyze evidence types, quality, and integration' : ''}
${request.assessQuality ? '6. Provide comprehensive quality assessment and scoring' : ''}
${request.includeStrengthsWeaknesses ? '7. Identify specific strengths and areas for improvement' : ''}

**Educational Framework:**
- Focus on constructive feedback that promotes learning
- Recognize age-appropriate argumentation skills for high school students
- Identify effective critical thinking demonstrations
- Highlight opportunities for skill development
- Consider the educational context and learning objectives

**Argument Assessment Criteria:**
- **Claim Quality**: Clear, specific, and relevant to the topic
- **Evidence Strength**: Credible, relevant, and sufficient support
- **Warrant/Reasoning**: Logical connection between claim and evidence
- **Structure**: Organized presentation and logical flow
- **Originality**: Creative thinking and unique perspectives

**Scoring Scale (0-1):**
- 0.9-1.0: Exceptional (college-level argumentation)
- 0.7-0.8: Proficient (strong high school level)
- 0.5-0.6: Developing (typical high school level)
- 0.3-0.4: Emerging (needs significant development)
- 0.0-0.2: Inadequate (major skill gaps)

**Educational Focus:**
- Celebrate successful reasoning and evidence use
- Provide specific, actionable feedback for improvement
- Identify teachable moments and skill-building opportunities
- Recognize effort and growth potential

Return a JSON object with the exact structure specified in the schema.`;

    const userPrompt = this.buildUserPrompt(transcript, request);

    return { systemPrompt, userPrompt };
  }

  /**
   * Build user prompt with transcript data
   */
  private buildUserPrompt(
    transcript: DebateTranscript,
    request: ArgumentAnalysisRequest
  ): string {
    let prompt = `**Argument Analysis Request**

**Debate Topic:** ${transcript.topic.title}
${transcript.topic.description ? `**Topic Description:** ${transcript.topic.description}\n` : ''}

**Participants:**
${transcript.participants.map(p => {
  const argumentCount = transcript.messages.filter(m => 
    m.userId === p.id && (m.messageType === 'argument' || m.messageType === 'rebuttal')
  ).length;
  return `- ${p.id} (${p.role.toUpperCase()}): ${p.messageCount} total messages, ~${argumentCount} argumentative messages`;
}).join('\n')}

**Argument Timeline:**
${transcript.messages.map((msg, index) => {
  const participant = transcript.participants.find(p => p.id === msg.userId);
  const timeFromStart = new Date(msg.timestamp).getTime() - new Date(transcript.metadata.startTime).getTime();
  const messageLabel = msg.messageType === 'argument' ? '[ARG]' : 
                      msg.messageType === 'rebuttal' ? '[REB]' : 
                      msg.messageType === 'question' ? '[Q]' : '[CHAT]';
  return `[${index + 1}] ${messageLabel} ${participant?.role || 'unknown'} (${Math.floor(timeFromStart / 60000)}:${String(Math.floor((timeFromStart % 60000) / 1000)).padStart(2, '0')}): ${msg.content}`;
}).join('\n\n')}

**Analysis Instructions:**

1. **Argument Identification and Structure:**
   - Identify individual arguments made by each participant
   - Categorize each as: claim, evidence, warrant, rebuttal, or concession
   - Assess the logical structure and organization of each argument
   - Rate argument strength (0-1), evidence quality (0-1), and logical structure (0-1)
   - Evaluate originality and creative thinking (0-1)

2. **Evidence Analysis:** ${request.analyzeEvidence ? `
   - Categorize evidence types: statistical, expert_opinion, case_study, logical, anecdotal
   - Rate evidence strength, reliability, and relevance (0-1 each)
   - Assess how well evidence supports the claims
   - Identify missing or weak evidence that could strengthen arguments` : '(Not requested)'}

3. **Argument Interactions:**
   - Track rebuttals and how effectively they address opposing arguments
   - Assess the quality and effectiveness of counter-arguments
   - Identify concessions and acknowledgment of opponent strengths
   - Evaluate engagement with opposing viewpoints

${request.detectFallacies ? `4. **Logical Fallacy Detection:**
   - Identify common fallacies: ad hominem, straw man, false dilemma, appeal to emotion, etc.
   - Rate fallacy severity: low (minor logical gaps), medium (significant errors), high (major reasoning failures)
   - Provide educational explanations for each fallacy detected
   - Suggest improvements to avoid similar errors` : ''}

5. **Quality Assessment:** ${request.assessQuality ? `
   - Overall argument quality (0-1): Considering all aspects of argumentation
   - Logical coherence (0-1): How well arguments flow and connect
   - Evidence strength (0-1): Quality and integration of supporting evidence
   - Argument diversity (0-1): Range and variety of argument approaches
   - Engagement level (0-1): Depth of interaction with the topic and opponents` : '(Basic assessment only)'}

6. **Participant-Specific Analysis:** ${request.includeStrengthsWeaknesses ? `
   - For each participant, assess: argument quality, evidence usage, logical reasoning, rebuttal skill, original thinking
   - Identify 2-3 specific strengths demonstrated
   - Identify 2-3 areas for improvement with specific suggestions
   - Provide actionable recommendations for skill development` : '(Basic scoring only)'}

7. **Educational Insights:**
   - What argumentation skills were demonstrated effectively?
   - What critical thinking abilities need development?
   - How could participants improve their reasoning and evidence use?
   - What teaching opportunities emerged from this debate?

**Debate Metadata:**
- Total Messages: ${transcript.metadata.messageCount}
- Argument Messages: ${transcript.messages.filter(m => m.messageType === 'argument' || m.messageType === 'rebuttal').length}
- Debate Duration: ${Math.round(transcript.metadata.duration / 60)} minutes
- Average Message Length: ${Math.round(transcript.messages.reduce((sum, msg) => sum + msg.wordCount, 0) / transcript.messages.length)} words`;

    return prompt;
  }

  /**
   * Process AI response and create final result
   */
  private processAIResponse(
    aiResponse: any,
    transcript: DebateTranscript,
    request: ArgumentAnalysisRequest,
    startTime: number
  ): ArgumentAnalysisResult {
    
    const processingTime = Date.now() - startTime;
    
    // Validate and normalize the AI response
    const normalizedResponse = this.normalizeAIResponse(aiResponse, transcript);

    return {
      analysisId: `argument_${transcript.conversationId}_${Date.now()}`,
      conversationId: transcript.conversationId,
      analysisType: 'argument',
      version: '1.0',
      status: 'completed',
      confidence: this.calculateConfidence(normalizedResponse, transcript),
      processingTime,
      tokensUsed: aiResponse.metadata.tokensUsed,
      createdAt: new Date(),
      
      // Argument-specific results
      arguments: this.processArguments(
        normalizedResponse.arguments || [],
        transcript
      ),
      
      fallacies: request.detectFallacies 
        ? this.processFallacies(normalizedResponse.fallacies || [], transcript)
        : [],
      
      qualityMetrics: {
        overallQuality: this.clamp(normalizedResponse.qualityMetrics?.overallQuality || 0.6, 0, 1),
        logicalCoherence: this.clamp(normalizedResponse.qualityMetrics?.logicalCoherence || 0.6, 0, 1),
        evidenceStrength: this.clamp(normalizedResponse.qualityMetrics?.evidenceStrength || 0.5, 0, 1),
        argumentDiversity: this.clamp(normalizedResponse.qualityMetrics?.argumentDiversity || 0.5, 0, 1),
        engagementLevel: this.clamp(normalizedResponse.qualityMetrics?.engagementLevel || 0.7, 0, 1),
      },
      
      participantScores: this.processParticipantScores(
        normalizedResponse.participantScores || {},
        transcript.participants,
        request.includeStrengthsWeaknesses
      ),
      
      insights: Array.isArray(normalizedResponse.insights) 
        ? normalizedResponse.insights.slice(0, 10)
        : ['Argument analysis completed successfully'],
        
      metadata: {
        cached: aiResponse.metadata.cached,
        argumentCount: this.countArguments(transcript.messages),
        rebuttalCount: this.countRebuttals(transcript.messages),
        evidenceTypes: this.identifyEvidenceTypes(transcript.messages),
      },
    };
  }

  /**
   * Normalize AI response to ensure valid data
   */
  private normalizeAIResponse(aiResponse: any, transcript: DebateTranscript): any {
    return {
      arguments: Array.isArray(aiResponse.arguments) ? aiResponse.arguments : [],
      fallacies: Array.isArray(aiResponse.fallacies) ? aiResponse.fallacies : [],
      qualityMetrics: aiResponse.qualityMetrics || {},
      participantScores: aiResponse.participantScores || {},
      insights: Array.isArray(aiResponse.insights) ? aiResponse.insights : [],
    };
  }

  /**
   * Process arguments with validation
   */
  private processArguments(rawArguments: any[], transcript: DebateTranscript): any[] {
    return rawArguments
      .filter(arg => arg && typeof arg === 'object' && arg.content)
      .slice(0, 20) // Limit to 20 arguments
      .map((arg, index) => ({
        id: arg.id || `arg_${index}`,
        participantId: this.validateParticipantId(arg.participantId, transcript.participants),
        type: this.validateArgumentType(arg.type),
        content: String(arg.content).slice(0, 500),
        position: this.validatePosition(arg.position),
        strength: this.clamp(arg.strength || 0.5, 0, 1),
        evidenceQuality: this.clamp(arg.evidenceQuality || 0.5, 0, 1),
        logicalStructure: this.clamp(arg.logicalStructure || 0.5, 0, 1),
        originalityScore: this.clamp(arg.originalityScore || 0.5, 0, 1),
        supportingEvidence: this.processSupportingEvidence(arg.supportingEvidence || []),
        rebuttals: this.processRebuttals(arg.rebuttals || [], transcript.participants),
      }));
  }

  /**
   * Validate argument type
   */
  private validateArgumentType(type: string): string {
    const validTypes = ['claim', 'evidence', 'warrant', 'rebuttal', 'concession'];
    return validTypes.includes(type) ? type : 'claim';
  }

  /**
   * Validate participant ID
   */
  private validateParticipantId(participantId: string, participants: any[]): string {
    return participants.some(p => p.id === participantId) ? participantId : 'unknown';
  }

  /**
   * Validate position
   */
  private validatePosition(position: string): 'pro' | 'con' {
    return position === 'con' ? 'con' : 'pro';
  }

  /**
   * Process supporting evidence
   */
  private processSupportingEvidence(rawEvidence: any[]): any[] {
    if (!Array.isArray(rawEvidence)) return [];

    return rawEvidence
      .filter(ev => ev && typeof ev === 'object')
      .slice(0, 5) // Limit evidence per argument
      .map(ev => ({
        type: this.validateEvidenceType(ev.type),
        strength: this.clamp(ev.strength || 0.5, 0, 1),
        reliability: this.clamp(ev.reliability || 0.5, 0, 1),
        relevance: this.clamp(ev.relevance || 0.5, 0, 1),
        source: ev.source ? String(ev.source).slice(0, 100) : undefined,
      }));
  }

  /**
   * Validate evidence type
   */
  private validateEvidenceType(type: string): string {
    const validTypes = ['statistical', 'expert_opinion', 'case_study', 'logical', 'anecdotal'];
    return validTypes.includes(type) ? type : 'logical';
  }

  /**
   * Process rebuttals
   */
  private processRebuttals(rawRebuttals: any[], participants: any[]): any[] {
    if (!Array.isArray(rawRebuttals)) return [];

    return rawRebuttals
      .filter(reb => reb && typeof reb === 'object')
      .slice(0, 3) // Limit rebuttals per argument
      .map(reb => ({
        participantId: this.validateParticipantId(reb.participantId, participants),
        strength: this.clamp(reb.strength || 0.5, 0, 1),
        effectiveness: this.clamp(reb.effectiveness || 0.5, 0, 1),
        content: String(reb.content || '').slice(0, 200),
      }));
  }

  /**
   * Process fallacies
   */
  private processFallacies(rawFallacies: any[], transcript: DebateTranscript): any[] {
    if (!Array.isArray(rawFallacies)) return [];

    return rawFallacies
      .filter(fallacy => fallacy && typeof fallacy === 'object' && fallacy.type)
      .slice(0, 15) // Limit fallacies
      .map(fallacy => ({
        type: String(fallacy.type).slice(0, 50),
        description: String(fallacy.description || '').slice(0, 200),
        participantId: this.validateParticipantId(fallacy.participantId, transcript.participants),
        messageId: fallacy.messageId || 'unknown',
        severity: this.validateSeverity(fallacy.severity),
        explanation: String(fallacy.explanation || '').slice(0, 300),
        suggestion: String(fallacy.suggestion || '').slice(0, 200),
      }));
  }

  /**
   * Validate fallacy severity
   */
  private validateSeverity(severity: string): 'low' | 'medium' | 'high' {
    const validSeverities = ['low', 'medium', 'high'];
    return validSeverities.includes(severity) ? severity as any : 'medium';
  }

  /**
   * Process participant scores
   */
  private processParticipantScores(
    rawScores: any,
    participants: any[],
    includeStrengthsWeaknesses: boolean = false
  ): Record<string, any> {
    const processed: Record<string, any> = {};

    participants.forEach(participant => {
      const participantData = rawScores[participant.id] || {};
      
      processed[participant.id] = {
        argumentQuality: this.clamp(participantData.argumentQuality || 0.6, 0, 1),
        evidenceUsage: this.clamp(participantData.evidenceUsage || 0.5, 0, 1),
        logicalReasoning: this.clamp(participantData.logicalReasoning || 0.6, 0, 1),
        rebuttalSkill: this.clamp(participantData.rebuttalSkill || 0.5, 0, 1),
        originalThinking: this.clamp(participantData.originalThinking || 0.5, 0, 1),
      };

      if (includeStrengthsWeaknesses) {
        processed[participant.id].strengths = Array.isArray(participantData.strengths)
          ? participantData.strengths.slice(0, 3).map((s: any) => String(s).slice(0, 150))
          : ['Effective participation in debate'];

        processed[participant.id].weaknesses = Array.isArray(participantData.weaknesses)
          ? participantData.weaknesses.slice(0, 3).map((w: any) => String(w).slice(0, 150))
          : ['Areas for continued development'];

        processed[participant.id].improvements = Array.isArray(participantData.improvements)
          ? participantData.improvements.slice(0, 3).map((i: any) => String(i).slice(0, 200))
          : ['Continue practicing argumentation skills'];
      }
    });

    return processed;
  }

  /**
   * Count arguments in messages
   */
  private countArguments(messages: DebateMessage[]): number {
    return messages.filter(msg => msg.messageType === 'argument').length;
  }

  /**
   * Count rebuttals in messages
   */
  private countRebuttals(messages: DebateMessage[]): number {
    return messages.filter(msg => msg.messageType === 'rebuttal').length;
  }

  /**
   * Identify evidence types used
   */
  private identifyEvidenceTypes(messages: DebateMessage[]): string[] {
    // Simple heuristic to identify likely evidence types
    const evidenceTypes: Set<string> = new Set();
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      if (content.includes('study') || content.includes('research') || content.includes('data')) {
        evidenceTypes.add('statistical');
      }
      if (content.includes('expert') || content.includes('professor') || content.includes('according to')) {
        evidenceTypes.add('expert_opinion');
      }
      if (content.includes('example') || content.includes('case') || content.includes('instance')) {
        evidenceTypes.add('case_study');
      }
      if (content.includes('experience') || content.includes('story') || content.includes('happened')) {
        evidenceTypes.add('anecdotal');
      }
    });

    return Array.from(evidenceTypes);
  }

  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidence(response: any, transcript: DebateTranscript): number {
    let confidence = 0.7; // Base confidence

    // More arguments = higher confidence
    const argumentCount = this.countArguments(transcript.messages);
    if (argumentCount >= 5) confidence += 0.1;
    if (argumentCount >= 10) confidence += 0.1;

    // More content = higher confidence
    const totalWordCount = transcript.messages.reduce((sum, msg) => sum + msg.wordCount, 0);
    if (totalWordCount >= 1000) confidence += 0.1;

    // Multiple participants with arguments = higher confidence
    const participantsWithArgs = new Set(
      transcript.messages
        .filter(msg => msg.messageType === 'argument' || msg.messageType === 'rebuttal')
        .map(msg => msg.userId)
    );
    if (participantsWithArgs.size >= 2) confidence += 0.1;

    return this.clamp(confidence, 0, 1);
  }

  /**
   * Create failed analysis result
   */
  private createFailedResult(
    transcript: DebateTranscript,
    request: ArgumentAnalysisRequest,
    startTime: number,
    errorMessage: string
  ): ArgumentAnalysisResult {
    return {
      analysisId: `argument_failed_${transcript.conversationId}_${Date.now()}`,
      conversationId: transcript.conversationId,
      analysisType: 'argument',
      version: '1.0',
      status: 'failed',
      confidence: 0,
      processingTime: Date.now() - startTime,
      tokensUsed: 0,
      createdAt: new Date(),
      arguments: [],
      fallacies: [],
      qualityMetrics: {
        overallQuality: 0,
        logicalCoherence: 0,
        evidenceStrength: 0,
        argumentDiversity: 0,
        engagementLevel: 0,
      },
      participantScores: {},
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
          service: 'argument-analysis',
          openaiStatus: openaiHealth.status,
          capabilities: [
            'argument_identification',
            'evidence_evaluation',
            'fallacy_detection',
            'quality_assessment',
            'participant_scoring',
          ],
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          service: 'argument-analysis',
          error: error.message,
        },
      };
    }
  }
}
