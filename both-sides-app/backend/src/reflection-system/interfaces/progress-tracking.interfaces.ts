/**
 * Progress Tracking Interfaces
 * Comprehensive types for monitoring reflection progress, gamification,
 * achievements, and advanced analytics
 */

import { ReflectionStatus } from '@prisma/client';
import { PromptCategory, QuestionType } from './prompt.interfaces';
import { SessionState, ResponseType } from './reflection-response.interfaces';

// =============================================
// Core Progress Tracking Types
// =============================================

export enum ProgressTrackingLevel {
  BASIC = 'BASIC',           // Simple completion tracking
  STANDARD = 'STANDARD',     // + Quality metrics
  ADVANCED = 'ADVANCED',     // + Engagement analytics
  COMPREHENSIVE = 'COMPREHENSIVE' // + Predictive insights
}

export enum ProgressEventType {
  SESSION_START = 'SESSION_START',
  QUESTION_VIEW = 'QUESTION_VIEW',
  RESPONSE_START = 'RESPONSE_START',
  RESPONSE_SAVE = 'RESPONSE_SAVE',
  RESPONSE_EDIT = 'RESPONSE_EDIT',
  SECTION_COMPLETE = 'SECTION_COMPLETE',
  SESSION_PAUSE = 'SESSION_PAUSE',
  SESSION_RESUME = 'SESSION_RESUME',
  SESSION_COMPLETE = 'SESSION_COMPLETE',
  MILESTONE_ACHIEVED = 'MILESTONE_ACHIEVED',
  BADGE_EARNED = 'BADGE_EARNED',
  STREAK_STARTED = 'STREAK_STARTED',
  STREAK_BROKEN = 'STREAK_BROKEN'
}

export enum EngagementLevel {
  DISENGAGED = 'DISENGAGED',     // < 20% engagement
  LOW = 'LOW',                   // 20-40% engagement
  MODERATE = 'MODERATE',         // 40-70% engagement
  HIGH = 'HIGH',                 // 70-90% engagement
  EXCEPTIONAL = 'EXCEPTIONAL'    // > 90% engagement
}

export enum QualityTrend {
  DECLINING = 'DECLINING',
  STABLE = 'STABLE',
  IMPROVING = 'IMPROVING',
  FLUCTUATING = 'FLUCTUATING'
}

// =============================================
// Progress Tracking Data Structures
// =============================================

export interface ProgressTrackingConfiguration {
  level: ProgressTrackingLevel;
  enableGamification: boolean;
  enablePredictiveInsights: boolean;
  enableRealTimeAlerts: boolean;
  trackingGranularity: 'question' | 'section' | 'session';
  autoSaveInterval: number; // milliseconds
  progressPersistenceTTL: number; // hours
  achievementNotifications: boolean;
  anonymousTracking: boolean;
}

export interface ReflectionProgress {
  id: string;
  sessionId: string;
  userId: string;
  debateId: string;
  trackingLevel: ProgressTrackingLevel;
  
  // Basic Progress Metrics
  completion: CompletionMetrics;
  timing: TimingMetrics;
  engagement: EngagementMetrics;
  quality: QualityMetrics;
  
  // Advanced Analytics
  patterns: ProgressPattern[];
  insights: ProgressInsight[];
  predictions: ProgressPrediction[];
  
  // Gamification
  achievements: Achievement[];
  badges: Badge[];
  streaks: Streak[];
  points: PointsBreakdown;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  configuration: ProgressTrackingConfiguration;
}

export interface CompletionMetrics {
  totalQuestions: number;
  completedQuestions: number;
  skippedQuestions: number;
  inProgressQuestions: number;
  completionPercentage: number;
  
  // Section-level completion
  sectionProgress: Record<PromptCategory, SectionProgress>;
  
  // Question-type completion
  questionTypeProgress: Record<QuestionType, number>;
  
  // Quality completion (questions meeting quality threshold)
  qualityCompletionRate: number;
}

export interface SectionProgress {
  category: PromptCategory;
  totalQuestions: number;
  completedQuestions: number;
  averageQuality: number;
  averageTime: number;
  completionRate: number;
  engagementLevel: EngagementLevel;
}

export interface TimingMetrics {
  totalTimeSpent: number; // seconds
  activeTime: number; // seconds actively responding
  idleTime: number; // seconds idle/paused
  averageQuestionTime: number;
  
  // Time distribution
  timeBySection: Record<PromptCategory, number>;
  timeByQuestionType: Record<QuestionType, number>;
  
  // Efficiency metrics
  timeEfficiencyScore: number; // 0-1, based on expected vs actual time
  pacingConsistency: number; // 0-1, consistency of response times
  
  // Predictions
  estimatedTimeRemaining: number;
  estimatedCompletionTime: Date;
  optimalBreakSuggestion?: Date;
}

export interface EngagementMetrics {
  overall: EngagementLevel;
  score: number; // 0-1 comprehensive engagement score
  
  // Interaction patterns
  mouseMovements: number;
  keystrokes: number;
  focusLossCount: number;
  totalFocusTime: number;
  
  // Response characteristics
  responseDepthScore: number;
  revisionCount: number;
  mediaUsageRate: number;
  
  // Behavioral indicators
  hesitationScore: number; // time before starting to type
  confidenceScore: number; // based on editing patterns
  attentionScore: number; // sustained focus indicators
  
  // Trend analysis
  engagementTrend: 'increasing' | 'decreasing' | 'stable' | 'variable';
  engagementHistory: Array<{
    timestamp: Date;
    score: number;
    context: string;
  }>;
}

export interface QualityMetrics {
  overallScore: number; // 0-1
  trend: QualityTrend;
  consistency: number; // 0-1, how consistent quality is
  
  // Quality breakdown
  qualityBySection: Record<PromptCategory, number>;
  qualityByQuestionType: Record<QuestionType, number>;
  
  // Specific quality indicators
  thoughtfulnessScore: number;
  originalityScore: number;
  depthScore: number;
  clarityScore: number;
  relevanceScore: number;
  
  // Improvement tracking
  improvementRate: number; // change over time
  qualityHistory: Array<{
    questionId: string;
    score: number;
    timestamp: Date;
    feedback: string[];
  }>;
}

// =============================================
// Progress Analytics and Insights
// =============================================

export interface ProgressPattern {
  id: string;
  type: 'time_based' | 'quality_based' | 'engagement_based' | 'behavioral';
  pattern: string;
  description: string;
  frequency: number;
  significance: number; // 0-1
  context: PatternContext;
  examples: PatternExample[];
  implications: string[];
  recommendations: string[];
}

export interface PatternContext {
  sessionPhase: 'beginning' | 'middle' | 'end';
  questionTypes: QuestionType[];
  categories: PromptCategory[];
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  dayOfWeek?: string;
  userCharacteristics: string[];
}

export interface PatternExample {
  questionId: string;
  timestamp: Date;
  value: number;
  context: string;
}

export interface ProgressInsight {
  id: string;
  type: 'strength' | 'weakness' | 'opportunity' | 'risk' | 'trend';
  title: string;
  description: string;
  category: PromptCategory | 'general';
  
  // Impact and confidence
  impact: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  urgency: 'low' | 'medium' | 'high';
  
  // Supporting data
  supportingMetrics: Record<string, number>;
  relatedPatterns: string[];
  
  // Actionable recommendations
  recommendations: InsightRecommendation[];
  
  // Tracking
  createdAt: Date;
  relevantUntil?: Date;
  acknowledged: boolean;
}

export interface InsightRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  action: string;
  expectedOutcome: string;
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-10
}

export interface ProgressPrediction {
  type: 'completion_time' | 'quality_outcome' | 'engagement_risk' | 'performance';
  prediction: string;
  confidence: number; // 0-1
  timeframe: string;
  
  // Model information
  modelType: string;
  inputFeatures: string[];
  lastUpdated: Date;
  
  // Actionable insights
  interventions: PredictiveIntervention[];
}

export interface PredictiveIntervention {
  trigger: string;
  action: string;
  expectedImprovement: number;
  confidence: number;
}

// =============================================
// Gamification System
// =============================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  type: AchievementType;
  
  // Requirements and rewards
  requirements: AchievementRequirement[];
  points: number;
  badge?: Badge;
  
  // Progress tracking
  progress: number; // 0-1
  isCompleted: boolean;
  completedAt?: Date;
  
  // Metadata
  rarity: AchievementRarity;
  isHidden: boolean;
  prerequisiteAchievements: string[];
  expiresAt?: Date;
}

export enum AchievementCategory {
  COMPLETION = 'COMPLETION',
  QUALITY = 'QUALITY',
  ENGAGEMENT = 'ENGAGEMENT',
  CONSISTENCY = 'CONSISTENCY',
  IMPROVEMENT = 'IMPROVEMENT',
  CREATIVITY = 'CREATIVITY',
  COLLABORATION = 'COLLABORATION',
  MILESTONE = 'MILESTONE',
  SPECIAL = 'SPECIAL'
}

export enum AchievementType {
  SINGLE = 'SINGLE',           // One-time achievement
  PROGRESSIVE = 'PROGRESSIVE', // Multiple levels (Bronze, Silver, Gold)
  STREAK = 'STREAK',          // Consecutive actions
  CUMULATIVE = 'CUMULATIVE',  // Total over time
  CONDITIONAL = 'CONDITIONAL'  // Context-dependent
}

export enum AchievementRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY'
}

export interface AchievementRequirement {
  type: 'completion' | 'quality' | 'time' | 'streak' | 'custom';
  condition: string;
  target: number;
  currentValue: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  color: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  earnedAt: Date;
  displayOrder: number;
}

export interface Streak {
  id: string;
  type: 'daily' | 'weekly' | 'quality' | 'completion' | 'custom';
  name: string;
  description: string;
  
  // Streak tracking
  currentStreak: number;
  maxStreak: number;
  streakTarget: number;
  
  // Dates
  startedAt: Date;
  lastActivityAt: Date;
  expiresAt?: Date;
  
  // Rewards
  rewards: StreakReward[];
  nextRewardAt: number; // streak length for next reward
}

export interface StreakReward {
  streakLength: number;
  points: number;
  badge?: Badge;
  title?: string;
  description: string;
}

export interface PointsBreakdown {
  total: number;
  sources: PointsSource[];
  level: StudentLevel;
  
  // Points by category
  completionPoints: number;
  qualityPoints: number;
  engagementPoints: number;
  improvementPoints: number;
  achievementPoints: number;
  bonusPoints: number;
}

export interface PointsSource {
  source: string;
  points: number;
  timestamp: Date;
  description: string;
  category: AchievementCategory;
}

export interface StudentLevel {
  currentLevel: number;
  currentXP: number;
  xpForNextLevel: number;
  totalXPRequired: number;
  levelName: string;
  levelDescription: string;
  levelBenefits: string[];
}

// =============================================
// Progress Persistence and Recovery
// =============================================

export interface ProgressSnapshot {
  id: string;
  sessionId: string;
  userId: string;
  
  // Snapshot data
  progressData: ReflectionProgress;
  sessionData: any; // Current session state
  responseData: any[]; // Current responses
  
  // Metadata
  snapshotType: 'auto' | 'manual' | 'milestone';
  reason: string;
  createdAt: Date;
  expiresAt: Date;
  
  // Recovery information
  isRecoverable: boolean;
  recoveryData: RecoveryData;
}

export interface RecoveryData {
  canRecover: boolean;
  recoverySuggestion: string;
  conflictsFound: RecoveryConflict[];
  dataIntegrity: 'complete' | 'partial' | 'corrupted';
  lastSyncedAt: Date;
}

export interface RecoveryConflict {
  type: 'response_mismatch' | 'time_conflict' | 'progress_mismatch';
  description: string;
  resolutionOptions: RecoveryOption[];
  severity: 'low' | 'medium' | 'high';
}

export interface RecoveryOption {
  option: string;
  description: string;
  dataLoss: 'none' | 'minimal' | 'significant';
  recommended: boolean;
}

// =============================================
// Analytics and Reporting
// =============================================

export interface ProgressAnalyticsReport {
  id: string;
  sessionId: string;
  userId: string;
  generatedAt: Date;
  
  // Executive summary
  summary: ProgressSummary;
  
  // Detailed metrics
  completion: DetailedCompletionAnalysis;
  engagement: DetailedEngagementAnalysis;
  quality: DetailedQualityAnalysis;
  timing: DetailedTimingAnalysis;
  
  // Comparisons
  peerComparison?: PeerProgressComparison;
  historicalComparison?: HistoricalProgressComparison;
  
  // Recommendations
  recommendations: ProgressRecommendation[];
}

export interface ProgressSummary {
  overallScore: number; // 0-1
  strengths: string[];
  areasForImprovement: string[];
  keyInsights: string[];
  nextSteps: string[];
}

export interface DetailedCompletionAnalysis {
  completionRate: number;
  qualityCompletionRate: number;
  sectionPerformance: Record<PromptCategory, SectionAnalysis>;
  bottlenecks: CompletionBottleneck[];
  predictions: CompletionPrediction[];
}

export interface SectionAnalysis {
  category: PromptCategory;
  completionRate: number;
  averageQuality: number;
  engagementLevel: EngagementLevel;
  timeEfficiency: number;
  challenges: string[];
  recommendations: string[];
}

export interface CompletionBottleneck {
  location: string; // question ID or section
  type: 'time' | 'quality' | 'engagement' | 'technical';
  impact: 'low' | 'medium' | 'high';
  description: string;
  suggestedFixes: string[];
}

export interface CompletionPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  timeframe: string;
}

export interface DetailedEngagementAnalysis {
  overallEngagement: EngagementLevel;
  engagementTrends: EngagementTrendPoint[];
  peakEngagementPeriods: EngagementPeriod[];
  engagementFactors: EngagementFactor[];
  disengagementRisks: DisengagementRisk[];
}

export interface EngagementTrendPoint {
  timestamp: Date;
  engagementScore: number;
  context: string;
  factors: string[];
}

export interface EngagementPeriod {
  startTime: Date;
  endTime: Date;
  averageEngagement: number;
  peakEngagement: number;
  context: string;
}

export interface EngagementFactor {
  factor: string;
  impact: number; // -1 to 1
  confidence: number;
  examples: string[];
}

export interface DisengagementRisk {
  riskLevel: 'low' | 'medium' | 'high';
  indicators: string[];
  interventions: string[];
  timeline: string;
}

export interface DetailedQualityAnalysis {
  overallQuality: number;
  qualityTrend: QualityTrend;
  qualityDistribution: Record<string, number>;
  qualityFactors: QualityFactor[];
  improvementOpportunities: ImprovementOpportunity[];
}

export interface QualityFactor {
  factor: string;
  contribution: number; // 0-1
  trend: 'improving' | 'stable' | 'declining';
  examples: QualityExample[];
}

export interface QualityExample {
  questionId: string;
  score: number;
  reasoning: string;
  timestamp: Date;
}

export interface ImprovementOpportunity {
  area: string;
  currentScore: number;
  potentialScore: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface DetailedTimingAnalysis {
  efficiency: TimingEfficiency;
  pacing: PacingAnalysis;
  patterns: TimingPattern[];
  optimization: TimingOptimization;
}

export interface TimingEfficiency {
  overallEfficiency: number; // 0-1
  timeWasted: number; // seconds
  optimalTimeEstimate: number; // seconds
  actualTime: number; // seconds
  inefficiencies: TimingInefficiency[];
}

export interface TimingInefficiency {
  type: 'idle' | 'revision' | 'hesitation' | 'distraction';
  timeWasted: number;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  suggestions: string[];
}

export interface PacingAnalysis {
  consistency: number; // 0-1
  optimalPace: number; // questions per hour
  actualPace: number;
  paceVariations: PaceVariation[];
  recommendations: string[];
}

export interface PaceVariation {
  period: string;
  expectedPace: number;
  actualPace: number;
  variation: number;
  factors: string[];
}

export interface TimingPattern {
  pattern: string;
  frequency: number;
  impact: string;
  recommendations: string[];
}

export interface TimingOptimization {
  potentialTimeSavings: number; // seconds
  optimizationStrategies: OptimizationStrategy[];
  schedulingRecommendations: string[];
}

export interface OptimizationStrategy {
  strategy: string;
  timeSavings: number; // seconds
  effort: 'low' | 'medium' | 'high';
  feasibility: 'low' | 'medium' | 'high';
  priority: number; // 1-10
}

export interface PeerProgressComparison {
  userPercentile: number;
  peerAverage: number;
  userScore: number;
  
  // Detailed comparisons
  completionComparison: ComparisonMetric;
  qualityComparison: ComparisonMetric;
  engagementComparison: ComparisonMetric;
  timingComparison: ComparisonMetric;
  
  // Insights
  relativePsstrengths: string[];
  relativeWeaknesses: string[];
  improvementOpportunities: string[];
}

export interface ComparisonMetric {
  userValue: number;
  peerAverage: number;
  percentile: number;
  rank?: number;
  totalPeers: number;
}

export interface HistoricalProgressComparison {
  timeframe: string;
  overallImprovement: number; // -1 to 1
  
  // Metric improvements
  completionImprovement: number;
  qualityImprovement: number;
  engagementImprovement: number;
  efficiencyImprovement: number;
  
  // Trend analysis
  trends: HistoricalTrend[];
  milestones: HistoricalMilestone[];
  regressions: HistoricalRegression[];
}

export interface HistoricalTrend {
  metric: string;
  trend: 'improving' | 'stable' | 'declining';
  changeRate: number;
  significance: number; // 0-1
  startDate: Date;
  endDate: Date;
}

export interface HistoricalMilestone {
  milestone: string;
  achievedAt: Date;
  value: number;
  significance: 'minor' | 'major' | 'breakthrough';
}

export interface HistoricalRegression {
  metric: string;
  regressionStart: Date;
  regressionEnd?: Date;
  impact: 'minor' | 'moderate' | 'severe';
  possibleCauses: string[];
  recoveryRecommendations: string[];
}

export interface ProgressRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  category: 'completion' | 'quality' | 'engagement' | 'efficiency';
  priority: 'low' | 'medium' | 'high';
  
  title: string;
  description: string;
  expectedOutcome: string;
  effort: 'low' | 'medium' | 'high';
  
  // Implementation guidance
  actionSteps: string[];
  resources: RecommendationResource[];
  successMetrics: string[];
  timeline: string;
}

export interface RecommendationResource {
  type: 'article' | 'video' | 'exercise' | 'tool';
  title: string;
  description: string;
  url?: string;
  estimatedTime?: number; // minutes
}

// =============================================
// Service Interfaces
// =============================================

export interface IProgressTrackingService {
  // Core progress tracking
  initializeProgressTracking(sessionId: string, config: ProgressTrackingConfiguration): Promise<ReflectionProgress>;
  updateProgress(sessionId: string, event: ProgressEvent): Promise<ReflectionProgress>;
  getProgress(sessionId: string): Promise<ReflectionProgress | null>;
  
  // Analytics and insights
  generateProgressInsights(sessionId: string): Promise<ProgressInsight[]>;
  generateProgressReport(sessionId: string): Promise<ProgressAnalyticsReport>;
  
  // Predictions and interventions
  predictOutcomes(sessionId: string): Promise<ProgressPrediction[]>;
  suggestInterventions(sessionId: string): Promise<PredictiveIntervention[]>;
  
  // Progress persistence
  createProgressSnapshot(sessionId: string, type: 'auto' | 'manual' | 'milestone'): Promise<ProgressSnapshot>;
  recoverProgress(sessionId: string, snapshotId?: string): Promise<RecoveryData>;
  
  // Gamification
  checkAchievements(sessionId: string): Promise<Achievement[]>;
  updatePoints(sessionId: string, source: PointsSource): Promise<PointsBreakdown>;
  updateStreaks(sessionId: string, activity: string): Promise<Streak[]>;
}

export interface ProgressEvent {
  type: ProgressEventType;
  timestamp: Date;
  sessionId: string;
  questionId?: string;
  data?: Record<string, any>;
  context?: EventContext;
}

export interface EventContext {
  userAgent?: string;
  viewport?: { width: number; height: number };
  focusTime?: number;
  interactionCount?: number;
  previousActivity?: string;
  sessionPhase?: 'beginning' | 'middle' | 'end';
}

// =============================================
// Export Types for External Use
// =============================================

export type ProgressTrackingRequest = Pick<ReflectionProgress, 'sessionId' | 'userId' | 'debateId'> & { configuration: ProgressTrackingConfiguration };
export type ProgressUpdateRequest = ProgressEvent;
export type ProgressReportRequest = { sessionId: string; includeComparisons?: boolean; includePredictions?: boolean };
export type RecoveryRequest = { sessionId: string; snapshotId?: string; autoResolve?: boolean };

export { ReflectionStatus } from '@prisma/client';
