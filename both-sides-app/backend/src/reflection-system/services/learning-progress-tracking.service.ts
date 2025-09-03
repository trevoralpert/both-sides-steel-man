/**
 * Learning Progress Tracking Service
 * 
 * Task 7.4.2: Learning Progress Tracking System
 * 
 * Comprehensive tracking for skill development across key competencies:
 * - Critical thinking and argumentation skills
 * - Communication clarity, persuasion, and active listening
 * - Research and evidence evaluation abilities
 * - Empathy and perspective-taking skills
 * - Collaboration and respectful engagement
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LearningProgressRequest {
  userId: string;
  debateId?: string;
  assessmentData: CompetencyAssessment[];
  contextualFactors?: {
    topicDifficulty: number;
    peerLevel: number;
    scaffoldingProvided: boolean;
  };
  timeframe?: 'single_debate' | 'weekly' | 'monthly' | 'semester';
}

export interface CompetencyAssessment {
  competencyType: CompetencyType;
  score: number; // 0-1 scale
  evidence: string[];
  improvement: number; // Change since last assessment
  subSkills: Record<string, number>; // Detailed breakdown
  contextualNotes?: string;
  measuredAt: Date;
  dataSource: 'ai_analysis' | 'self_assessment' | 'peer_assessment' | 'teacher_evaluation' | 'reflection_analysis';
  confidence: number; // Confidence in the assessment
}

export type CompetencyType = 
  | 'critical_thinking'
  | 'communication_clarity' 
  | 'communication_persuasion'
  | 'communication_listening'
  | 'research_skills'
  | 'evidence_evaluation'
  | 'empathy'
  | 'perspective_taking'
  | 'collaboration'
  | 'emotional_regulation'
  | 'intellectual_humility'
  | 'curiosity'
  | 'argumentation_structure'
  | 'fact_checking'
  | 'source_credibility';

export interface LearningProgressProfile {
  userId: string;
  profileId: string;
  lastUpdated: Date;
  overallProgress: number; // 0-1 aggregate score
  
  // Core competencies with detailed tracking
  competencies: Record<CompetencyType, CompetencyProgress>;
  
  // Learning trajectory analysis
  learningVelocity: {
    overall: number; // Rate of improvement
    byCompetency: Record<CompetencyType, number>;
    accelerating: boolean; // Is learning rate increasing?
  };
  
  // Milestone tracking
  milestones: LearningMilestone[];
  nextMilestones: LearningMilestone[];
  
  // Adaptive learning insights
  recommendations: LearningRecommendation[];
  optimalChallengeLevel: number; // Sweet spot difficulty
  learningStyle: LearningStyleProfile;
  
  // Comparative context
  peerComparison?: {
    percentileRank: number;
    strongerAreas: CompetencyType[];
    developmentAreas: CompetencyType[];
    classAverage: number;
  };
  
  // Predictive insights
  projections: {
    nextAssessmentPrediction: Record<CompetencyType, number>;
    timeToNextMilestone: number; // days
    riskFactors: string[];
    strengths: string[];
  };
}

export interface CompetencyProgress {
  currentScore: number;
  trend: 'improving' | 'stable' | 'declining';
  historicalScores: Array<{
    score: number;
    date: Date;
    context: string;
  }>;
  subSkillBreakdown: Record<string, number>;
  strengthAreas: string[];
  developmentAreas: string[];
  lastAssessment: Date;
  assessmentCount: number;
  reliability: number; // How consistent are the measurements
}

export interface LearningMilestone {
  milestoneId: string;
  competencyType: CompetencyType;
  level: 'beginner' | 'developing' | 'proficient' | 'advanced' | 'expert';
  title: string;
  description: string;
  criteria: string[];
  achieved: boolean;
  achievedAt?: Date;
  progress: number; // 0-1 toward achievement
  estimatedTimeToComplete?: number; // days
  prerequisites: string[];
  rewards?: string[];
}

export interface LearningRecommendation {
  recommendationId: string;
  type: 'skill_focus' | 'practice_activity' | 'resource' | 'peer_interaction' | 'challenge_level';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  targetCompetencies: CompetencyType[];
  actionItems: string[];
  expectedOutcome: string;
  timeframe: string;
  resources: Array<{
    type: string;
    title: string;
    url?: string;
    description: string;
  }>;
}

export interface LearningStyleProfile {
  preferredLearningModes: string[]; // visual, auditory, kinesthetic, reading
  engagementPatterns: {
    peakEngagementTime: number; // minutes into debate
    attentionSpan: number;
    preferredInteractionStyle: string;
  };
  motivationFactors: string[];
  challengePreference: 'gradual' | 'moderate' | 'steep';
  feedbackPreference: 'immediate' | 'delayed' | 'summary';
}

export interface SkillDevelopmentPlan {
  planId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Goal setting
  shortTermGoals: Array<{
    competency: CompetencyType;
    targetScore: number;
    timeframe: number; // days
    strategies: string[];
  }>;
  
  longTermGoals: Array<{
    competency: CompetencyType;
    targetScore: number;
    timeframe: number; // days
    milestones: string[];
  }>;
  
  // Personalized learning path
  learningPath: Array<{
    phase: number;
    focus: CompetencyType[];
    activities: string[];
    estimatedDuration: number;
    successCriteria: string[];
  }>;
  
  // Progress tracking
  progress: {
    overallCompletion: number;
    phaseCompletions: number[];
    goalsAchieved: number;
    totalGoals: number;
  };
  
  // Adaptive adjustments
  adjustments: Array<{
    date: Date;
    reason: string;
    changes: string[];
    impact: string;
  }>;
}

@Injectable()
export class LearningProgressTrackingService {
  private readonly logger = new Logger(LearningProgressTrackingService.name);

  constructor(
    private readonly prismaService: PrismaService
  ) {}

  /**
   * Update learning progress based on new assessment data
   */
  async updateLearningProgress(request: LearningProgressRequest): Promise<LearningProgressProfile> {
    const startTime = Date.now();
    this.logger.log(`Updating learning progress for user ${request.userId}`);

    try {
      this.validateProgressRequest(request);

      // Get existing progress profile or create new one
      const existingProfile = await this.getExistingProgress(request.userId);
      
      // Process new assessment data
      const updatedCompetencies = await this.processAssessmentData(
        request.assessmentData,
        existingProfile?.competencies || {}
      );

      // Calculate learning velocity and trends
      const learningVelocity = this.calculateLearningVelocity(
        updatedCompetencies,
        existingProfile?.competencies || {}
      );

      // Update milestones
      const milestones = await this.updateMilestones(
        request.userId,
        updatedCompetencies,
        existingProfile?.milestones || []
      );

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        request.userId,
        updatedCompetencies,
        learningVelocity,
        request.contextualFactors
      );

      // Analyze learning style
      const learningStyle = await this.analyzeLearningStyle(
        request.userId,
        updatedCompetencies,
        existingProfile?.learningStyle
      );

      // Get peer comparison if available
      const peerComparison = await this.calculatePeerComparison(request.userId, updatedCompetencies);

      // Generate projections
      const projections = this.generateProjections(
        updatedCompetencies,
        learningVelocity,
        milestones
      );

      // Calculate overall progress
      const overallProgress = this.calculateOverallProgress(updatedCompetencies);

      const progressProfile: LearningProgressProfile = {
        userId: request.userId,
        profileId: existingProfile?.profileId || `progress_${request.userId}_${Date.now()}`,
        lastUpdated: new Date(),
        overallProgress,
        competencies: updatedCompetencies,
        learningVelocity,
        milestones: milestones.achieved,
        nextMilestones: milestones.upcoming,
        recommendations,
        optimalChallengeLevel: this.calculateOptimalChallengeLevel(updatedCompetencies, learningVelocity),
        learningStyle,
        peerComparison,
        projections,
      };

      // Store updated progress
      await this.storeProgressProfile(progressProfile);

      this.logger.log(
        `Updated learning progress for user ${request.userId}: ` +
        `overall=${overallProgress.toFixed(3)}, velocity=${learningVelocity.overall.toFixed(3)} ` +
        `(${Date.now() - startTime}ms)`
      );

      return progressProfile;

    } catch (error) {
      this.logger.error(`Failed to update learning progress for user ${request.userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate personalized skill development plan
   */
  async generateSkillDevelopmentPlan(
    userId: string,
    preferences?: {
      focusAreas?: CompetencyType[];
      timeframe?: number; // days
      intensityLevel?: 'light' | 'moderate' | 'intensive';
      learningPreferences?: string[];
    }
  ): Promise<SkillDevelopmentPlan> {
    this.logger.log(`Generating skill development plan for user ${userId}`);

    try {
      // Get current progress profile
      const progressProfile = await this.getExistingProgress(userId);
      if (!progressProfile) {
        throw new Error('No progress data available for skill development planning');
      }

      // Identify priority development areas
      const developmentPriorities = this.identifyDevelopmentPriorities(
        progressProfile.competencies,
        preferences?.focusAreas
      );

      // Generate short-term goals (1-4 weeks)
      const shortTermGoals = this.generateShortTermGoals(
        developmentPriorities,
        progressProfile.learningVelocity,
        preferences?.timeframe || 28
      );

      // Generate long-term goals (1-6 months)
      const longTermGoals = this.generateLongTermGoals(
        developmentPriorities,
        progressProfile.milestones,
        preferences?.timeframe || 120
      );

      // Create personalized learning path
      const learningPath = this.createLearningPath(
        shortTermGoals,
        longTermGoals,
        progressProfile.learningStyle,
        preferences
      );

      const developmentPlan: SkillDevelopmentPlan = {
        planId: `plan_${userId}_${Date.now()}`,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        shortTermGoals,
        longTermGoals,
        learningPath,
        progress: {
          overallCompletion: 0,
          phaseCompletions: learningPath.map(() => 0),
          goalsAchieved: 0,
          totalGoals: shortTermGoals.length + longTermGoals.length,
        },
        adjustments: [],
      };

      // Store the development plan
      await this.storeDevelopmentPlan(developmentPlan);

      return developmentPlan;

    } catch (error) {
      this.logger.error(`Failed to generate skill development plan for user ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Track milestone achievements and update progress
   */
  async trackMilestoneProgress(userId: string): Promise<{
    recentAchievements: LearningMilestone[];
    progressUpdates: Array<{
      milestone: LearningMilestone;
      previousProgress: number;
      currentProgress: number;
    }>;
    celebrationEvents: Array<{
      type: string;
      message: string;
      milestone: LearningMilestone;
    }>;
  }> {
    this.logger.log(`Tracking milestone progress for user ${userId}`);

    try {
      const progressProfile = await this.getExistingProgress(userId);
      if (!progressProfile) {
        return { recentAchievements: [], progressUpdates: [], celebrationEvents: [] };
      }

      // Check for newly achieved milestones
      const recentAchievements = this.checkForNewAchievements(
        progressProfile.competencies,
        progressProfile.milestones,
        progressProfile.nextMilestones
      );

      // Calculate progress updates for upcoming milestones
      const progressUpdates = this.calculateMilestoneProgress(
        progressProfile.competencies,
        progressProfile.nextMilestones
      );

      // Generate celebration events for achievements
      const celebrationEvents = this.generateCelebrationEvents(recentAchievements);

      // Update milestone data
      if (recentAchievements.length > 0) {
        await this.updateMilestoneAchievements(userId, recentAchievements);
      }

      return {
        recentAchievements,
        progressUpdates,
        celebrationEvents,
      };

    } catch (error) {
      this.logger.error(`Failed to track milestone progress for user ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Get competency-specific insights and recommendations
   */
  async getCompetencyInsights(
    userId: string,
    competencyType: CompetencyType
  ): Promise<{
    currentLevel: string;
    progressSummary: string;
    specificStrengths: string[];
    improvementAreas: string[];
    practiceActivities: Array<{
      activity: string;
      description: string;
      difficulty: string;
      estimatedTime: string;
    }>;
    resources: Array<{
      type: string;
      title: string;
      description: string;
      url?: string;
    }>;
  }> {
    this.logger.log(`Getting competency insights for user ${userId}, competency ${competencyType}`);

    try {
      const progressProfile = await this.getExistingProgress(userId);
      if (!progressProfile || !progressProfile.competencies[competencyType]) {
        throw new Error(`No progress data available for competency: ${competencyType}`);
      }

      const competencyProgress = progressProfile.competencies[competencyType];
      
      // Determine current level
      const currentLevel = this.determineCompetencyLevel(competencyProgress.currentScore);
      
      // Generate progress summary
      const progressSummary = this.generateProgressSummary(competencyProgress, competencyType);
      
      // Get practice activities for this competency
      const practiceActivities = this.getPracticeActivities(competencyType, currentLevel);
      
      // Get learning resources
      const resources = this.getLearningResources(competencyType, currentLevel);

      return {
        currentLevel,
        progressSummary,
        specificStrengths: competencyProgress.strengthAreas,
        improvementAreas: competencyProgress.developmentAreas,
        practiceActivities,
        resources,
      };

    } catch (error) {
      this.logger.error(
        `Failed to get competency insights for user ${userId}, competency ${competencyType}`,
        error.stack
      );
      throw error;
    }
  }

  // Private helper methods

  private validateProgressRequest(request: LearningProgressRequest): void {
    if (!request.userId) {
      throw new Error('User ID is required');
    }

    if (!request.assessmentData || request.assessmentData.length === 0) {
      throw new Error('Assessment data is required');
    }

    // Validate assessment scores
    for (const assessment of request.assessmentData) {
      if (assessment.score < 0 || assessment.score > 1) {
        throw new Error(`Invalid score ${assessment.score} for competency ${assessment.competencyType}`);
      }
      if (assessment.confidence < 0 || assessment.confidence > 1) {
        throw new Error(`Invalid confidence ${assessment.confidence} for competency ${assessment.competencyType}`);
      }
    }
  }

  private async getExistingProgress(userId: string): Promise<LearningProgressProfile | null> {
    // Query the database for existing progress profile
    // For now, we'll return null indicating no existing profile
    return null;
  }

  private async processAssessmentData(
    assessmentData: CompetencyAssessment[],
    existingCompetencies: Record<CompetencyType, CompetencyProgress>
  ): Promise<Record<CompetencyType, CompetencyProgress>> {
    const updatedCompetencies: Record<CompetencyType, CompetencyProgress> = { ...existingCompetencies };

    for (const assessment of assessmentData) {
      const existing = existingCompetencies[assessment.competencyType];
      const historicalScores = existing?.historicalScores || [];
      
      // Add new score to history
      historicalScores.push({
        score: assessment.score,
        date: assessment.measuredAt,
        context: `Assessment via ${assessment.dataSource}`,
      });

      // Calculate trend
      const trend = this.calculateCompetencyTrend(historicalScores);
      
      // Update competency progress
      updatedCompetencies[assessment.competencyType] = {
        currentScore: assessment.score,
        trend,
        historicalScores: historicalScores.slice(-10), // Keep last 10 measurements
        subSkillBreakdown: assessment.subSkills,
        strengthAreas: this.identifyStrengthAreas(assessment),
        developmentAreas: this.identifyDevelopmentAreas(assessment),
        lastAssessment: assessment.measuredAt,
        assessmentCount: (existing?.assessmentCount || 0) + 1,
        reliability: this.calculateReliability(historicalScores, assessment.confidence),
      };
    }

    return updatedCompetencies;
  }

  private calculateLearningVelocity(
    currentCompetencies: Record<CompetencyType, CompetencyProgress>,
    previousCompetencies: Record<CompetencyType, CompetencyProgress>
  ): LearningProgressProfile['learningVelocity'] {
    const velocities: Record<CompetencyType, number> = {} as any;
    let totalVelocity = 0;
    let competencyCount = 0;

    for (const [competencyType, progress] of Object.entries(currentCompetencies)) {
      const previous = previousCompetencies[competencyType as CompetencyType];
      let velocity = 0;

      if (previous && progress.historicalScores.length >= 2) {
        const recent = progress.historicalScores.slice(-2);
        const timeDiff = recent[1].date.getTime() - recent[0].date.getTime();
        const scoreDiff = recent[1].score - recent[0].score;
        
        // Velocity = score change per day
        velocity = scoreDiff / (timeDiff / (1000 * 60 * 60 * 24));
      }

      velocities[competencyType as CompetencyType] = velocity;
      totalVelocity += velocity;
      competencyCount++;
    }

    const overallVelocity = competencyCount > 0 ? totalVelocity / competencyCount : 0;
    
    // Determine if learning is accelerating
    const accelerating = overallVelocity > 0.001; // Positive velocity threshold

    return {
      overall: overallVelocity,
      byCompetency: velocities,
      accelerating,
    };
  }

  private async updateMilestones(
    userId: string,
    competencies: Record<CompetencyType, CompetencyProgress>,
    existingMilestones: LearningMilestone[]
  ): Promise<{
    achieved: LearningMilestone[];
    upcoming: LearningMilestone[];
  }> {
    // Generate standard milestones for each competency
    const allMilestones = this.generateStandardMilestones(competencies);
    
    const achieved: LearningMilestone[] = [];
    const upcoming: LearningMilestone[] = [];

    for (const milestone of allMilestones) {
      const competencyProgress = competencies[milestone.competencyType];
      const progress = this.calculateMilestoneProgress(competencyProgress, milestone);
      
      milestone.progress = progress;
      
      if (progress >= 1.0 && !milestone.achieved) {
        milestone.achieved = true;
        milestone.achievedAt = new Date();
        achieved.push(milestone);
      } else if (progress < 1.0) {
        milestone.estimatedTimeToComplete = this.estimateTimeToMilestone(
          competencyProgress,
          milestone
        );
        upcoming.push(milestone);
      } else {
        achieved.push(milestone);
      }
    }

    return { achieved, upcoming };
  }

  private async generateRecommendations(
    userId: string,
    competencies: Record<CompetencyType, CompetencyProgress>,
    velocity: LearningProgressProfile['learningVelocity'],
    contextualFactors?: LearningProgressRequest['contextualFactors']
  ): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = [];

    // Identify competencies that need attention
    const developmentAreas = Object.entries(competencies)
      .filter(([, progress]) => progress.currentScore < 0.6 || progress.trend === 'declining')
      .map(([competencyType]) => competencyType as CompetencyType);

    for (const competencyType of developmentAreas) {
      const progress = competencies[competencyType];
      
      recommendations.push({
        recommendationId: `rec_${competencyType}_${Date.now()}`,
        type: 'skill_focus',
        priority: progress.currentScore < 0.4 ? 'high' : 'medium',
        title: `Strengthen ${this.formatCompetencyName(competencyType)}`,
        description: `Focus on improving ${this.formatCompetencyName(competencyType)} through targeted practice`,
        targetCompetencies: [competencyType],
        actionItems: this.getActionItems(competencyType, progress.currentScore),
        expectedOutcome: `Improve ${this.formatCompetencyName(competencyType)} by 10-20%`,
        timeframe: '2-4 weeks',
        resources: this.getLearningResources(competencyType, this.determineCompetencyLevel(progress.currentScore)),
      });
    }

    // Add practice activity recommendations
    if (velocity.overall < 0.001) { // Slow progress
      recommendations.push({
        recommendationId: `rec_practice_${Date.now()}`,
        type: 'practice_activity',
        priority: 'medium',
        title: 'Increase Practice Frequency',
        description: 'Regular practice sessions to accelerate skill development',
        targetCompetencies: developmentAreas,
        actionItems: [
          'Participate in practice debates weekly',
          'Complete reflection exercises after each session',
          'Seek feedback from peers and teachers',
        ],
        expectedOutcome: 'Accelerate learning velocity and skill improvement',
        timeframe: '1-2 weeks',
        resources: [],
      });
    }

    return recommendations;
  }

  private async analyzeLearningStyle(
    userId: string,
    competencies: Record<CompetencyType, CompetencyProgress>,
    existingStyle?: LearningStyleProfile
  ): Promise<LearningStyleProfile> {
    // Analyze patterns in competency development to infer learning style
    const visualCompetencies = ['research_skills', 'evidence_evaluation'];
    const auditoryCompetencies = ['communication_listening', 'communication_clarity'];
    const interactiveCompetencies = ['collaboration', 'perspective_taking'];

    const visualScore = this.calculateCategoryScore(competencies, visualCompetencies);
    const auditoryScore = this.calculateCategoryScore(competencies, auditoryCompetencies);
    const interactiveScore = this.calculateCategoryScore(competencies, interactiveCompetencies);

    const preferredModes: string[] = [];
    if (visualScore > 0.6) preferredModes.push('visual');
    if (auditoryScore > 0.6) preferredModes.push('auditory');
    if (interactiveScore > 0.6) preferredModes.push('interactive');

    return {
      preferredLearningModes: preferredModes.length > 0 ? preferredModes : ['mixed'],
      engagementPatterns: {
        peakEngagementTime: 15, // Default to 15 minutes
        attentionSpan: 20,
        preferredInteractionStyle: interactiveScore > 0.6 ? 'collaborative' : 'individual',
      },
      motivationFactors: this.identifyMotivationFactors(competencies),
      challengePreference: 'moderate',
      feedbackPreference: 'immediate',
    };
  }

  private async calculatePeerComparison(
    userId: string,
    competencies: Record<CompetencyType, CompetencyProgress>
  ): Promise<LearningProgressProfile['peerComparison']> {
    // This would query peer data from the database
    // For now, return a placeholder
    return {
      percentileRank: 65,
      strongerAreas: ['critical_thinking', 'research_skills'],
      developmentAreas: ['empathy', 'perspective_taking'],
      classAverage: 0.68,
    };
  }

  private generateProjections(
    competencies: Record<CompetencyType, CompetencyProgress>,
    velocity: LearningProgressProfile['learningVelocity'],
    milestones: LearningMilestone[]
  ): LearningProgressProfile['projections'] {
    const nextAssessmentPrediction: Record<CompetencyType, number> = {} as any;
    
    for (const [competencyType, progress] of Object.entries(competencies)) {
      const currentVelocity = velocity.byCompetency[competencyType as CompetencyType];
      const predictedScore = Math.min(1, progress.currentScore + (currentVelocity * 7)); // 7 days ahead
      nextAssessmentPrediction[competencyType as CompetencyType] = predictedScore;
    }

    const nextMilestone = milestones.find(m => !m.achieved);
    const timeToNextMilestone = nextMilestone?.estimatedTimeToComplete || 30;

    return {
      nextAssessmentPrediction,
      timeToNextMilestone,
      riskFactors: this.identifyRiskFactors(competencies, velocity),
      strengths: this.identifyStrengthFactors(competencies, velocity),
    };
  }

  private calculateOverallProgress(competencies: Record<CompetencyType, CompetencyProgress>): number {
    const scores = Object.values(competencies).map(c => c.currentScore);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  private calculateOptimalChallengeLevel(
    competencies: Record<CompetencyType, CompetencyProgress>,
    velocity: LearningProgressProfile['learningVelocity']
  ): number {
    const averageScore = this.calculateOverallProgress(competencies);
    const averageVelocity = velocity.overall;

    // Optimal challenge is slightly above current ability
    if (averageVelocity > 0.002) { // Fast learner
      return Math.min(1, averageScore + 0.2);
    } else if (averageVelocity > 0.001) { // Moderate learner  
      return Math.min(1, averageScore + 0.15);
    } else { // Slow learner
      return Math.min(1, averageScore + 0.1);
    }
  }

  // Additional helper methods

  private calculateCompetencyTrend(historicalScores: Array<{score: number; date: Date}>): 'improving' | 'stable' | 'declining' {
    if (historicalScores.length < 2) return 'stable';
    
    const recent = historicalScores.slice(-3);
    const trend = recent[recent.length - 1].score - recent[0].score;
    
    if (trend > 0.05) return 'improving';
    if (trend < -0.05) return 'declining';
    return 'stable';
  }

  private identifyStrengthAreas(assessment: CompetencyAssessment): string[] {
    return Object.entries(assessment.subSkills)
      .filter(([, score]) => score > 0.7)
      .map(([skill]) => skill);
  }

  private identifyDevelopmentAreas(assessment: CompetencyAssessment): string[] {
    return Object.entries(assessment.subSkills)
      .filter(([, score]) => score < 0.6)
      .map(([skill]) => skill);
  }

  private calculateReliability(
    historicalScores: Array<{score: number}>,
    confidence: number
  ): number {
    if (historicalScores.length < 2) return confidence;
    
    // Calculate consistency (lower variance = higher reliability)
    const scores = historicalScores.map(h => h.score);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const consistency = Math.max(0, 1 - variance * 2);
    
    // Combine confidence and consistency
    return (confidence + consistency) / 2;
  }

  private determineCompetencyLevel(score: number): string {
    if (score >= 0.9) return 'expert';
    if (score >= 0.8) return 'advanced';
    if (score >= 0.6) return 'proficient';
    if (score >= 0.4) return 'developing';
    return 'beginner';
  }

  private formatCompetencyName(competencyType: CompetencyType): string {
    return competencyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getActionItems(competencyType: CompetencyType, currentScore: number): string[] {
    // Return specific action items based on competency and current level
    const baseActions: Record<CompetencyType, string[]> = {
      critical_thinking: [
        'Practice identifying assumptions in arguments',
        'Analyze argument structure and logic',
        'Question evidence and sources',
      ],
      communication_clarity: [
        'Use clear, concise language',
        'Structure thoughts before speaking',
        'Practice explaining complex ideas simply',
      ],
      research_skills: [
        'Learn to evaluate source credibility',
        'Practice systematic information gathering',
        'Develop fact-checking habits',
      ],
      // Add more competency-specific actions
    } as any;

    return baseActions[competencyType] || ['Focus on skill development', 'Seek feedback regularly'];
  }

  private getLearningResources(competencyType: CompetencyType, level: string): Array<{
    type: string;
    title: string;
    description: string;
    url?: string;
  }> {
    // Return relevant learning resources
    return [
      {
        type: 'article',
        title: `${this.formatCompetencyName(competencyType)} Guide`,
        description: `Comprehensive guide for ${level} level learners`,
      },
      {
        type: 'video',
        title: `${this.formatCompetencyName(competencyType)} Tutorial`,
        description: `Interactive tutorial for skill development`,
      },
    ];
  }

  private calculateCategoryScore(
    competencies: Record<CompetencyType, CompetencyProgress>,
    categoryCompetencies: string[]
  ): number {
    const relevantScores = categoryCompetencies
      .map(c => competencies[c as CompetencyType]?.currentScore || 0)
      .filter(s => s > 0);
    
    return relevantScores.length > 0 
      ? relevantScores.reduce((sum, score) => sum + score, 0) / relevantScores.length 
      : 0;
  }

  private identifyMotivationFactors(competencies: Record<CompetencyType, CompetencyProgress>): string[] {
    const factors: string[] = [];
    
    const socialCompetencies = ['collaboration', 'empathy', 'perspective_taking'];
    const analyticalCompetencies = ['critical_thinking', 'research_skills', 'evidence_evaluation'];
    
    if (this.calculateCategoryScore(competencies, socialCompetencies) > 0.7) {
      factors.push('social_learning', 'peer_interaction');
    }
    
    if (this.calculateCategoryScore(competencies, analyticalCompetencies) > 0.7) {
      factors.push('intellectual_challenge', 'problem_solving');
    }
    
    return factors.length > 0 ? factors : ['achievement', 'recognition'];
  }

  private identifyRiskFactors(
    competencies: Record<CompetencyType, CompetencyProgress>,
    velocity: LearningProgressProfile['learningVelocity']
  ): string[] {
    const risks: string[] = [];
    
    if (velocity.overall < 0) {
      risks.push('Declining overall performance');
    }
    
    const lowScores = Object.entries(competencies)
      .filter(([, progress]) => progress.currentScore < 0.4)
      .map(([competencyType]) => competencyType);
    
    if (lowScores.length > 0) {
      risks.push(`Low performance in: ${lowScores.join(', ')}`);
    }
    
    return risks;
  }

  private identifyStrengthFactors(
    competencies: Record<CompetencyType, CompetencyProgress>,
    velocity: LearningProgressProfile['learningVelocity']
  ): string[] {
    const strengths: string[] = [];
    
    if (velocity.overall > 0.002) {
      strengths.push('Rapid skill development');
    }
    
    const highScores = Object.entries(competencies)
      .filter(([, progress]) => progress.currentScore > 0.8)
      .map(([competencyType]) => this.formatCompetencyName(competencyType as CompetencyType));
    
    if (highScores.length > 0) {
      strengths.push(`Strong performance in: ${highScores.join(', ')}`);
    }
    
    return strengths;
  }

  // Placeholder implementations for methods referenced but not defined
  private generateStandardMilestones(competencies: Record<CompetencyType, CompetencyProgress>): LearningMilestone[] {
    // Generate standard milestones for each competency level
    return [];
  }

  private calculateMilestoneProgress(progress: CompetencyProgress, milestone: LearningMilestone): number {
    // Calculate how close the student is to achieving this milestone
    return Math.min(1, progress.currentScore / 0.8); // Assumes milestone at 80% proficiency
  }

  private estimateTimeToMilestone(progress: CompetencyProgress, milestone: LearningMilestone): number {
    // Estimate days to complete milestone based on current velocity
    return 30; // Placeholder
  }

  private identifyDevelopmentPriorities(
    competencies: Record<CompetencyType, CompetencyProgress>,
    focusAreas?: CompetencyType[]
  ): CompetencyType[] {
    // Identify which competencies should be prioritized for development
    return focusAreas || [];
  }

  private generateShortTermGoals(priorities: CompetencyType[], velocity: any, timeframe: number): any[] {
    // Generate achievable short-term goals
    return [];
  }

  private generateLongTermGoals(priorities: CompetencyType[], milestones: LearningMilestone[], timeframe: number): any[] {
    // Generate aspirational long-term goals
    return [];
  }

  private createLearningPath(shortTermGoals: any[], longTermGoals: any[], learningStyle: LearningStyleProfile, preferences?: any): any[] {
    // Create a structured learning path
    return [];
  }

  private checkForNewAchievements(competencies: any, milestones: LearningMilestone[], nextMilestones: LearningMilestone[]): LearningMilestone[] {
    // Check if any milestones were recently achieved
    return [];
  }

  private calculateMilestoneProgress(competencies: any, nextMilestones: LearningMilestone[]): any[] {
    // Calculate progress toward upcoming milestones
    return [];
  }

  private generateCelebrationEvents(achievements: LearningMilestone[]): any[] {
    // Generate celebration events for achievements
    return [];
  }

  private generateProgressSummary(competencyProgress: CompetencyProgress, competencyType: CompetencyType): string {
    // Generate a human-readable progress summary
    return `${this.formatCompetencyName(competencyType)} is ${competencyProgress.trend}`;
  }

  private getPracticeActivities(competencyType: CompetencyType, level: string): any[] {
    // Get specific practice activities
    return [];
  }

  // Storage methods
  private async storeProgressProfile(profile: LearningProgressProfile): Promise<void> {
    await this.prismaService.learningAnalytics.upsert({
      where: { 
        user_id_metric_type: {
          user_id: profile.userId,
          metric_type: 'OVERALL_PROGRESS'
        }
      },
      update: {
        value: profile.overallProgress,
        metadata: {
          profileId: profile.profileId,
          competencies: profile.competencies,
          learningVelocity: profile.learningVelocity,
          milestones: profile.milestones,
          recommendations: profile.recommendations,
          learningStyle: profile.learningStyle,
          projections: profile.projections,
        },
        measurement_date: profile.lastUpdated,
      },
      create: {
        user_id: profile.userId,
        metric_type: 'OVERALL_PROGRESS',
        value: profile.overallProgress,
        metadata: {
          profileId: profile.profileId,
          competencies: profile.competencies,
          learningVelocity: profile.learningVelocity,
          milestones: profile.milestones,
          recommendations: profile.recommendations,
          learningStyle: profile.learningStyle,
          projections: profile.projections,
        },
        measurement_date: profile.lastUpdated,
      },
    });
  }

  private async storeDevelopmentPlan(plan: SkillDevelopmentPlan): Promise<void> {
    // Store development plan in database
    // Implementation would store in a dedicated table or as metadata
  }

  private async updateMilestoneAchievements(userId: string, achievements: LearningMilestone[]): Promise<void> {
    // Update milestone achievements in database
    // Implementation would track achievements in a dedicated table
  }
}
