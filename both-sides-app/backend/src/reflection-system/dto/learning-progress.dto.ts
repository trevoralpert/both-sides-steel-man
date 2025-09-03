/**
 * Learning Progress DTOs
 * 
 * Task 7.4.2: Data Transfer Objects for Learning Progress Tracking System
 */

import { IsString, IsArray, IsNumber, IsOptional, IsEnum, IsBoolean, ValidateNested, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CompetencyTypeDto {
  CRITICAL_THINKING = 'critical_thinking',
  COMMUNICATION_CLARITY = 'communication_clarity',
  COMMUNICATION_PERSUASION = 'communication_persuasion',
  COMMUNICATION_LISTENING = 'communication_listening',
  RESEARCH_SKILLS = 'research_skills',
  EVIDENCE_EVALUATION = 'evidence_evaluation',
  EMPATHY = 'empathy',
  PERSPECTIVE_TAKING = 'perspective_taking',
  COLLABORATION = 'collaboration',
  EMOTIONAL_REGULATION = 'emotional_regulation',
  INTELLECTUAL_HUMILITY = 'intellectual_humility',
  CURIOSITY = 'curiosity',
  ARGUMENTATION_STRUCTURE = 'argumentation_structure',
  FACT_CHECKING = 'fact_checking',
  SOURCE_CREDIBILITY = 'source_credibility',
}

export class CompetencyAssessmentDto {
  @ApiProperty({ 
    enum: CompetencyTypeDto,
    description: 'Type of competency being assessed'
  })
  @IsEnum(CompetencyTypeDto)
  competencyType: CompetencyTypeDto;

  @ApiProperty({ 
    description: 'Assessment score (0-1 scale)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({ description: 'Evidence supporting this assessment' })
  @IsArray()
  @IsString({ each: true })
  evidence: string[];

  @ApiProperty({ description: 'Change since last assessment' })
  @IsNumber()
  improvement: number;

  @ApiProperty({ description: 'Detailed breakdown by sub-skills' })
  subSkills: Record<string, number>;

  @ApiPropertyOptional({ description: 'Additional contextual notes' })
  @IsOptional()
  @IsString()
  contextualNotes?: string;

  @ApiProperty({ description: 'When this assessment was measured' })
  @IsDateString()
  measuredAt: string;

  @ApiProperty({ 
    enum: ['ai_analysis', 'self_assessment', 'peer_assessment', 'teacher_evaluation', 'reflection_analysis'],
    description: 'Source of the assessment data'
  })
  @IsEnum(['ai_analysis', 'self_assessment', 'peer_assessment', 'teacher_evaluation', 'reflection_analysis'])
  dataSource: 'ai_analysis' | 'self_assessment' | 'peer_assessment' | 'teacher_evaluation' | 'reflection_analysis';

  @ApiProperty({ 
    description: 'Confidence in the assessment (0-1 scale)', 
    minimum: 0, 
    maximum: 1 
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

export class ContextualFactorsDto {
  @ApiProperty({ 
    description: 'Difficulty level of the topic (1-10)', 
    minimum: 1, 
    maximum: 10 
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  topicDifficulty: number;

  @ApiProperty({ 
    description: 'Peer skill level (1-10)', 
    minimum: 1, 
    maximum: 10 
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  peerLevel: number;

  @ApiProperty({ description: 'Whether scaffolding/support was provided' })
  @IsBoolean()
  scaffoldingProvided: boolean;
}

export class LearningProgressRequestDto {
  @ApiProperty({ description: 'User ID to track progress for' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Specific debate ID (if tracking debate-specific progress)' })
  @IsOptional()
  @IsString()
  debateId?: string;

  @ApiProperty({ 
    description: 'Assessment data for competencies',
    type: [CompetencyAssessmentDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetencyAssessmentDto)
  assessmentData: CompetencyAssessmentDto[];

  @ApiPropertyOptional({ 
    description: 'Contextual factors affecting assessment',
    type: ContextualFactorsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContextualFactorsDto)
  contextualFactors?: ContextualFactorsDto;

  @ApiPropertyOptional({ 
    enum: ['single_debate', 'weekly', 'monthly', 'semester'],
    description: 'Timeframe for progress tracking'
  })
  @IsOptional()
  @IsEnum(['single_debate', 'weekly', 'monthly', 'semester'])
  timeframe?: 'single_debate' | 'weekly' | 'monthly' | 'semester';
}

export class HistoricalScoreDto {
  @ApiProperty({ description: 'Score value' })
  @IsNumber()
  score: number;

  @ApiProperty({ description: 'Date of measurement' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Context of the measurement' })
  @IsString()
  context: string;
}

export class CompetencyProgressDto {
  @ApiProperty({ description: 'Current competency score' })
  @IsNumber()
  currentScore: number;

  @ApiProperty({ 
    enum: ['improving', 'stable', 'declining'],
    description: 'Current trend direction'
  })
  @IsEnum(['improving', 'stable', 'declining'])
  trend: 'improving' | 'stable' | 'declining';

  @ApiProperty({ 
    description: 'Historical score progression',
    type: [HistoricalScoreDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoricalScoreDto)
  historicalScores: HistoricalScoreDto[];

  @ApiProperty({ description: 'Breakdown of sub-skill scores' })
  subSkillBreakdown: Record<string, number>;

  @ApiProperty({ description: 'Areas where the student excels' })
  @IsArray()
  @IsString({ each: true })
  strengthAreas: string[];

  @ApiProperty({ description: 'Areas needing improvement' })
  @IsArray()
  @IsString({ each: true })
  developmentAreas: string[];

  @ApiProperty({ description: 'Date of last assessment' })
  @IsDateString()
  lastAssessment: string;

  @ApiProperty({ description: 'Total number of assessments' })
  @IsNumber()
  assessmentCount: number;

  @ApiProperty({ description: 'Reliability of measurements (0-1 scale)' })
  @IsNumber()
  reliability: number;
}

export class LearningVelocityDto {
  @ApiProperty({ description: 'Overall learning velocity (score change per day)' })
  @IsNumber()
  overall: number;

  @ApiProperty({ description: 'Learning velocity by competency type' })
  byCompetency: Record<string, number>;

  @ApiProperty({ description: 'Whether learning is accelerating' })
  @IsBoolean()
  accelerating: boolean;
}

export class LearningMilestoneDto {
  @ApiProperty({ description: 'Unique milestone identifier' })
  @IsString()
  milestoneId: string;

  @ApiProperty({ 
    enum: CompetencyTypeDto,
    description: 'Associated competency type'
  })
  @IsEnum(CompetencyTypeDto)
  competencyType: CompetencyTypeDto;

  @ApiProperty({ 
    enum: ['beginner', 'developing', 'proficient', 'advanced', 'expert'],
    description: 'Skill level represented by this milestone'
  })
  @IsEnum(['beginner', 'developing', 'proficient', 'advanced', 'expert'])
  level: 'beginner' | 'developing' | 'proficient' | 'advanced' | 'expert';

  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Criteria for achievement' })
  @IsArray()
  @IsString({ each: true })
  criteria: string[];

  @ApiProperty({ description: 'Whether milestone has been achieved' })
  @IsBoolean()
  achieved: boolean;

  @ApiPropertyOptional({ description: 'Date achieved (if applicable)' })
  @IsOptional()
  @IsDateString()
  achievedAt?: string;

  @ApiProperty({ description: 'Progress toward achievement (0-1 scale)' })
  @IsNumber()
  progress: number;

  @ApiPropertyOptional({ description: 'Estimated days to complete' })
  @IsOptional()
  @IsNumber()
  estimatedTimeToComplete?: number;

  @ApiProperty({ description: 'Prerequisites for this milestone' })
  @IsArray()
  @IsString({ each: true })
  prerequisites: string[];

  @ApiPropertyOptional({ description: 'Rewards for achievement' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rewards?: string[];
}

export class LearningResourceDto {
  @ApiProperty({ description: 'Type of resource' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Resource title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'URL to resource' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ description: 'Resource description' })
  @IsString()
  description: string;
}

export class LearningRecommendationDto {
  @ApiProperty({ description: 'Unique recommendation identifier' })
  @IsString()
  recommendationId: string;

  @ApiProperty({ 
    enum: ['skill_focus', 'practice_activity', 'resource', 'peer_interaction', 'challenge_level'],
    description: 'Type of recommendation'
  })
  @IsEnum(['skill_focus', 'practice_activity', 'resource', 'peer_interaction', 'challenge_level'])
  type: 'skill_focus' | 'practice_activity' | 'resource' | 'peer_interaction' | 'challenge_level';

  @ApiProperty({ 
    enum: ['high', 'medium', 'low'],
    description: 'Priority level'
  })
  @IsEnum(['high', 'medium', 'low'])
  priority: 'high' | 'medium' | 'low';

  @ApiProperty({ description: 'Recommendation title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  @IsString()
  description: string;

  @ApiProperty({ 
    description: 'Target competencies',
    enum: CompetencyTypeDto,
    isArray: true
  })
  @IsArray()
  @IsEnum(CompetencyTypeDto, { each: true })
  targetCompetencies: CompetencyTypeDto[];

  @ApiProperty({ description: 'Specific action items' })
  @IsArray()
  @IsString({ each: true })
  actionItems: string[];

  @ApiProperty({ description: 'Expected outcome' })
  @IsString()
  expectedOutcome: string;

  @ApiProperty({ description: 'Recommended timeframe' })
  @IsString()
  timeframe: string;

  @ApiProperty({ 
    description: 'Associated learning resources',
    type: [LearningResourceDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningResourceDto)
  resources: LearningResourceDto[];
}

export class EngagementPatternsDto {
  @ApiProperty({ description: 'Peak engagement time (minutes into session)' })
  @IsNumber()
  peakEngagementTime: number;

  @ApiProperty({ description: 'Attention span (minutes)' })
  @IsNumber()
  attentionSpan: number;

  @ApiProperty({ description: 'Preferred interaction style' })
  @IsString()
  preferredInteractionStyle: string;
}

export class LearningStyleProfileDto {
  @ApiProperty({ description: 'Preferred learning modes' })
  @IsArray()
  @IsString({ each: true })
  preferredLearningModes: string[];

  @ApiProperty({ 
    description: 'Engagement patterns',
    type: EngagementPatternsDto
  })
  @ValidateNested()
  @Type(() => EngagementPatternsDto)
  engagementPatterns: EngagementPatternsDto;

  @ApiProperty({ description: 'Motivation factors' })
  @IsArray()
  @IsString({ each: true })
  motivationFactors: string[];

  @ApiProperty({ 
    enum: ['gradual', 'moderate', 'steep'],
    description: 'Challenge preference'
  })
  @IsEnum(['gradual', 'moderate', 'steep'])
  challengePreference: 'gradual' | 'moderate' | 'steep';

  @ApiProperty({ 
    enum: ['immediate', 'delayed', 'summary'],
    description: 'Feedback preference'
  })
  @IsEnum(['immediate', 'delayed', 'summary'])
  feedbackPreference: 'immediate' | 'delayed' | 'summary';
}

export class PeerComparisonDto {
  @ApiProperty({ description: 'Percentile rank within class' })
  @IsNumber()
  percentileRank: number;

  @ApiProperty({ 
    description: 'Competencies where student is stronger',
    enum: CompetencyTypeDto,
    isArray: true
  })
  @IsArray()
  @IsEnum(CompetencyTypeDto, { each: true })
  strongerAreas: CompetencyTypeDto[];

  @ApiProperty({ 
    description: 'Competencies needing development',
    enum: CompetencyTypeDto,
    isArray: true
  })
  @IsArray()
  @IsEnum(CompetencyTypeDto, { each: true })
  developmentAreas: CompetencyTypeDto[];

  @ApiProperty({ description: 'Class average score' })
  @IsNumber()
  classAverage: number;
}

export class ProjectionsDto {
  @ApiProperty({ description: 'Predicted scores for next assessment' })
  nextAssessmentPrediction: Record<string, number>;

  @ApiProperty({ description: 'Days until next milestone achievement' })
  @IsNumber()
  timeToNextMilestone: number;

  @ApiProperty({ description: 'Identified risk factors' })
  @IsArray()
  @IsString({ each: true })
  riskFactors: string[];

  @ApiProperty({ description: 'Identified strengths' })
  @IsArray()
  @IsString({ each: true })
  strengths: string[];
}

export class LearningProgressProfileDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Unique profile identifier' })
  @IsString()
  profileId: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  lastUpdated: string;

  @ApiProperty({ description: 'Overall progress score (0-1 scale)' })
  @IsNumber()
  overallProgress: number;

  @ApiProperty({ description: 'Progress by competency type' })
  competencies: Record<string, CompetencyProgressDto>;

  @ApiProperty({ 
    description: 'Learning velocity analysis',
    type: LearningVelocityDto
  })
  @ValidateNested()
  @Type(() => LearningVelocityDto)
  learningVelocity: LearningVelocityDto;

  @ApiProperty({ 
    description: 'Achieved milestones',
    type: [LearningMilestoneDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningMilestoneDto)
  milestones: LearningMilestoneDto[];

  @ApiProperty({ 
    description: 'Upcoming milestones',
    type: [LearningMilestoneDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningMilestoneDto)
  nextMilestones: LearningMilestoneDto[];

  @ApiProperty({ 
    description: 'Personalized recommendations',
    type: [LearningRecommendationDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningRecommendationDto)
  recommendations: LearningRecommendationDto[];

  @ApiProperty({ description: 'Optimal challenge level (0-1 scale)' })
  @IsNumber()
  optimalChallengeLevel: number;

  @ApiProperty({ 
    description: 'Learning style profile',
    type: LearningStyleProfileDto
  })
  @ValidateNested()
  @Type(() => LearningStyleProfileDto)
  learningStyle: LearningStyleProfileDto;

  @ApiPropertyOptional({ 
    description: 'Peer comparison data',
    type: PeerComparisonDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PeerComparisonDto)
  peerComparison?: PeerComparisonDto;

  @ApiProperty({ 
    description: 'Predictive insights',
    type: ProjectionsDto
  })
  @ValidateNested()
  @Type(() => ProjectionsDto)
  projections: ProjectionsDto;
}

export class SkillDevelopmentPreferencesDto {
  @ApiPropertyOptional({ 
    description: 'Specific competencies to focus on',
    enum: CompetencyTypeDto,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(CompetencyTypeDto, { each: true })
  focusAreas?: CompetencyTypeDto[];

  @ApiPropertyOptional({ description: 'Development timeframe in days' })
  @IsOptional()
  @IsNumber()
  timeframe?: number;

  @ApiPropertyOptional({ 
    enum: ['light', 'moderate', 'intensive'],
    description: 'Intensity level for development'
  })
  @IsOptional()
  @IsEnum(['light', 'moderate', 'intensive'])
  intensityLevel?: 'light' | 'moderate' | 'intensive';

  @ApiPropertyOptional({ description: 'Learning preferences' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningPreferences?: string[];
}

export class ShortTermGoalDto {
  @ApiProperty({ enum: CompetencyTypeDto, description: 'Target competency' })
  @IsEnum(CompetencyTypeDto)
  competency: CompetencyTypeDto;

  @ApiProperty({ description: 'Target score to achieve' })
  @IsNumber()
  targetScore: number;

  @ApiProperty({ description: 'Timeframe in days' })
  @IsNumber()
  timeframe: number;

  @ApiProperty({ description: 'Strategies to employ' })
  @IsArray()
  @IsString({ each: true })
  strategies: string[];
}

export class LongTermGoalDto {
  @ApiProperty({ enum: CompetencyTypeDto, description: 'Target competency' })
  @IsEnum(CompetencyTypeDto)
  competency: CompetencyTypeDto;

  @ApiProperty({ description: 'Target score to achieve' })
  @IsNumber()
  targetScore: number;

  @ApiProperty({ description: 'Timeframe in days' })
  @IsNumber()
  timeframe: number;

  @ApiProperty({ description: 'Associated milestones' })
  @IsArray()
  @IsString({ each: true })
  milestones: string[];
}

export class LearningPhaseDto {
  @ApiProperty({ description: 'Phase number' })
  @IsNumber()
  phase: number;

  @ApiProperty({ 
    description: 'Competencies to focus on',
    enum: CompetencyTypeDto,
    isArray: true
  })
  @IsArray()
  @IsEnum(CompetencyTypeDto, { each: true })
  focus: CompetencyTypeDto[];

  @ApiProperty({ description: 'Learning activities' })
  @IsArray()
  @IsString({ each: true })
  activities: string[];

  @ApiProperty({ description: 'Estimated duration in days' })
  @IsNumber()
  estimatedDuration: number;

  @ApiProperty({ description: 'Success criteria' })
  @IsArray()
  @IsString({ each: true })
  successCriteria: string[];
}

export class ProgressDto {
  @ApiProperty({ description: 'Overall completion percentage' })
  @IsNumber()
  overallCompletion: number;

  @ApiProperty({ description: 'Completion percentage by phase' })
  @IsArray()
  @IsNumber({}, { each: true })
  phaseCompletions: number[];

  @ApiProperty({ description: 'Number of goals achieved' })
  @IsNumber()
  goalsAchieved: number;

  @ApiProperty({ description: 'Total number of goals' })
  @IsNumber()
  totalGoals: number;
}

export class PlanAdjustmentDto {
  @ApiProperty({ description: 'Date of adjustment' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Changes made' })
  @IsArray()
  @IsString({ each: true })
  changes: string[];

  @ApiProperty({ description: 'Expected impact' })
  @IsString()
  impact: string;
}

export class SkillDevelopmentPlanDto {
  @ApiProperty({ description: 'Unique plan identifier' })
  @IsString()
  planId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Creation date' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  @IsDateString()
  updatedAt: string;

  @ApiProperty({ 
    description: 'Short-term goals (1-4 weeks)',
    type: [ShortTermGoalDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShortTermGoalDto)
  shortTermGoals: ShortTermGoalDto[];

  @ApiProperty({ 
    description: 'Long-term goals (1-6 months)',
    type: [LongTermGoalDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LongTermGoalDto)
  longTermGoals: LongTermGoalDto[];

  @ApiProperty({ 
    description: 'Structured learning path',
    type: [LearningPhaseDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningPhaseDto)
  learningPath: LearningPhaseDto[];

  @ApiProperty({ 
    description: 'Progress tracking',
    type: ProgressDto
  })
  @ValidateNested()
  @Type(() => ProgressDto)
  progress: ProgressDto;

  @ApiProperty({ 
    description: 'Plan adjustments history',
    type: [PlanAdjustmentDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanAdjustmentDto)
  adjustments: PlanAdjustmentDto[];
}

export class CompetencyInsightsDto {
  @ApiProperty({ description: 'Current competency level' })
  @IsString()
  currentLevel: string;

  @ApiProperty({ description: 'Progress summary' })
  @IsString()
  progressSummary: string;

  @ApiProperty({ description: 'Specific strengths' })
  @IsArray()
  @IsString({ each: true })
  specificStrengths: string[];

  @ApiProperty({ description: 'Areas for improvement' })
  @IsArray()
  @IsString({ each: true })
  improvementAreas: string[];

  @ApiProperty({ description: 'Recommended practice activities' })
  practiceActivities: Array<{
    activity: string;
    description: string;
    difficulty: string;
    estimatedTime: string;
  }>;

  @ApiProperty({ 
    description: 'Learning resources',
    type: [LearningResourceDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningResourceDto)
  resources: LearningResourceDto[];
}

export class MilestoneTrackingDto {
  @ApiProperty({ 
    description: 'Recently achieved milestones',
    type: [LearningMilestoneDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningMilestoneDto)
  recentAchievements: LearningMilestoneDto[];

  @ApiProperty({ description: 'Progress updates for upcoming milestones' })
  progressUpdates: Array<{
    milestone: LearningMilestoneDto;
    previousProgress: number;
    currentProgress: number;
  }>;

  @ApiProperty({ description: 'Celebration events for achievements' })
  celebrationEvents: Array<{
    type: string;
    message: string;
    milestone: LearningMilestoneDto;
  }>;
}
