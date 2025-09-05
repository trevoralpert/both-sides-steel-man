/**
 * Quality Validation Interfaces
 * Comprehensive types for automated quality scoring, teacher reviews,
 * completion validation, and quality control workflows
 */

import { ReflectionStatus } from '@prisma/client';
import { PromptCategory, QuestionType } from './prompt.interfaces';
import { ResponseType, ValidationLevel } from './reflection-response.interfaces';
import { AchievementCategory } from './progress-tracking.interfaces';

// =============================================
// Core Quality Validation Types
// =============================================

export enum QualityValidationMode {
  AUTOMATED_ONLY = 'AUTOMATED_ONLY',         // AI-only validation
  TEACHER_REVIEW = 'TEACHER_REVIEW',         // Teacher review required
  HYBRID = 'HYBRID',                         // AI + Teacher review
  PEER_REVIEW = 'PEER_REVIEW',               // Student peer review
  SELF_ASSESSMENT = 'SELF_ASSESSMENT'        // Self-evaluation component
}

export enum ValidationStatus {
  PENDING = 'PENDING',                       // Waiting for validation
  IN_REVIEW = 'IN_REVIEW',                   // Under review
  VALIDATED = 'VALIDATED',                   // Approved/validated
  REQUIRES_REVISION = 'REQUIRES_REVISION',   // Needs improvement
  REJECTED = 'REJECTED',                     // Does not meet standards
  FLAGGED = 'FLAGGED',                       // Flagged for special attention
  ESCALATED = 'ESCALATED'                    // Escalated to administrator
}

export enum QualityDimension {
  DEPTH = 'DEPTH',                           // Depth of thinking
  CLARITY = 'CLARITY',                       // Clear communication
  RELEVANCE = 'RELEVANCE',                   // Relevance to topic
  ORIGINALITY = 'ORIGINALITY',               // Original thinking
  EVIDENCE = 'EVIDENCE',                     // Use of evidence
  ANALYSIS = 'ANALYSIS',                     // Analytical thinking
  SYNTHESIS = 'SYNTHESIS',                   // Integration of ideas
  REFLECTION = 'REFLECTION',                 // Self-reflection quality
  ENGAGEMENT = 'ENGAGEMENT',                 // Level of engagement
  COMPLETENESS = 'COMPLETENESS'              // Completeness of response
}

export enum ReviewerRole {
  AI_SYSTEM = 'AI_SYSTEM',
  TEACHER = 'TEACHER',
  PEER_STUDENT = 'PEER_STUDENT',
  SELF = 'SELF',
  ADMINISTRATOR = 'ADMINISTRATOR',
  EXTERNAL_EVALUATOR = 'EXTERNAL_EVALUATOR'
}

export enum QualityIssueType {
  INSUFFICIENT_DEPTH = 'INSUFFICIENT_DEPTH',
  UNCLEAR_COMMUNICATION = 'UNCLEAR_COMMUNICATION',
  OFF_TOPIC = 'OFF_TOPIC',
  LACK_OF_EVIDENCE = 'LACK_OF_EVIDENCE',
  POOR_ANALYSIS = 'POOR_ANALYSIS',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  PLAGIARISM_CONCERN = 'PLAGIARISM_CONCERN',
  LENGTH_INSUFFICIENT = 'LENGTH_INSUFFICIENT',
  TECHNICAL_ISSUES = 'TECHNICAL_ISSUES',
  OTHER = 'OTHER'
}

export enum ImprovementPriority {
  CRITICAL = 'CRITICAL',                     // Must fix before approval
  HIGH = 'HIGH',                             // Should fix for quality
  MEDIUM = 'MEDIUM',                         // Nice to fix
  LOW = 'LOW',                               // Minor suggestion
  OPTIONAL = 'OPTIONAL'                      // Enhancement opportunity
}

// =============================================
// Quality Scoring System
// =============================================

export interface QualityScore {
  overall: number; // 0-1 overall quality score
  dimensions: Record<QualityDimension, DimensionScore>;
  confidence: number; // 0-1 confidence in scoring
  methodology: ScoringMethodology;
  timestamp: Date;
  reviewerId: string;
  reviewerRole: ReviewerRole;
  version: string; // Scoring algorithm version
}

export interface DimensionScore {
  score: number; // 0-1 score for this dimension
  weight: number; // Weight of this dimension in overall score
  confidence: number; // Confidence in this specific score
  evidence: ScoreEvidence[];
  suggestions: ImprovementSuggestion[];
  benchmarks: QualityBenchmark[];
}

export interface ScoreEvidence {
  type: 'text_analysis' | 'structural' | 'semantic' | 'comparative' | 'behavioral';
  description: string;
  excerpt?: string; // Relevant text excerpt
  confidence: number;
  weight: number;
}

export interface ScoringMethodology {
  algorithmName: string;
  version: string;
  models: AIModel[];
  parameters: Record<string, any>;
  calibrationData: CalibrationData;
  biasCorrections: BiasCorrection[];
}

export interface AIModel {
  modelName: string;
  modelVersion: string;
  purpose: string; // e.g., "sentiment_analysis", "coherence_scoring"
  weight: number; // Weight in ensemble
  accuracy: number; // Historical accuracy rate
}

export interface CalibrationData {
  calibrationSet: string;
  humanAgreementRate: number;
  lastCalibrated: Date;
  sampleSize: number;
  correlationCoefficient: number;
}

export interface BiasCorrection {
  biasType: string; // e.g., "length_bias", "complexity_bias"
  correctionFactor: number;
  description: string;
}

export interface QualityBenchmark {
  level: 'below_basic' | 'basic' | 'proficient' | 'advanced' | 'exceptional';
  threshold: number;
  description: string;
  examples: string[];
}

// =============================================
// Improvement and Feedback System
// =============================================

export interface ImprovementSuggestion {
  id: string;
  dimension: QualityDimension;
  priority: ImprovementPriority;
  category: 'content' | 'structure' | 'style' | 'evidence' | 'analysis';
  
  // Suggestion details
  title: string;
  description: string;
  rationale: string;
  examples: SuggestionExample[];
  
  // Implementation guidance
  actionSteps: string[];
  resources: ImprovementResource[];
  estimatedEffort: 'low' | 'medium' | 'high';
  potentialImpact: number; // 0-1 potential score improvement
  
  // Context
  applicableToResponse: string; // Response ID
  relatedSuggestions: string[]; // Related suggestion IDs
  
  // Tracking
  createdAt: Date;
  implementedAt?: Date;
  effectivenessFeedback?: number; // 0-1 how helpful was this
}

export interface SuggestionExample {
  type: 'before_after' | 'good_example' | 'step_by_step';
  title: string;
  content: string;
  explanation: string;
}

export interface ImprovementResource {
  type: 'article' | 'video' | 'exercise' | 'template' | 'checklist';
  title: string;
  description: string;
  url?: string;
  estimatedTime: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// =============================================
// Teacher Review System
// =============================================

export interface TeacherReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reflectionId: string;
  studentId: string;
  
  // Review status and workflow
  status: ValidationStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedReviewTime: number; // minutes
  
  // Review content
  overallAssessment: OverallAssessment;
  dimensionReviews: Record<QualityDimension, DimensionReview>;
  qualityScore: QualityScore;
  
  // Feedback and guidance
  publicFeedback: string; // Feedback visible to student
  privateFeedback?: string; // Internal notes for teachers
  improvementPlan: ImprovementPlan;
  
  // Review metadata
  reviewMethod: 'detailed' | 'quick' | 'spot_check' | 'comprehensive';
  timeSpent: number; // actual time spent in minutes
  reviewQuality: number; // 0-1 quality of the review itself
  
  // Collaboration
  collaborativeReview?: CollaborativeReviewData;
  reviewHistory: ReviewHistoryEntry[];
}

export interface OverallAssessment {
  decision: 'approve' | 'approve_with_suggestions' | 'requires_minor_revision' | 'requires_major_revision' | 'reject';
  confidence: number; // 0-1 confidence in assessment
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  nextSteps: string[];
}

export interface DimensionReview {
  score: number; // 0-1
  assessment: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'unsatisfactory';
  comments: string;
  specificFeedback: SpecificFeedback[];
  suggestedResources: ImprovementResource[];
}

export interface SpecificFeedback {
  type: 'praise' | 'suggestion' | 'concern' | 'question';
  content: string;
  location?: TextLocation; // Where in the response this applies
  priority: ImprovementPriority;
}

export interface TextLocation {
  responseId: string;
  startIndex: number;
  endIndex: number;
  context: string;
}

export interface ImprovementPlan {
  goals: ImprovementGoal[];
  timeline: string;
  milestones: PlanMilestone[];
  resources: ImprovementResource[];
  followUpScheduled?: Date;
}

export interface ImprovementGoal {
  dimension: QualityDimension;
  currentScore: number;
  targetScore: number;
  description: string;
  actionItems: string[];
  priority: ImprovementPriority;
}

export interface PlanMilestone {
  description: string;
  targetDate: Date;
  successCriteria: string[];
  completed: boolean;
  completedAt?: Date;
}

export interface CollaborativeReviewData {
  otherReviewers: string[];
  reviewDiscussion: ReviewDiscussionEntry[];
  consensusReached: boolean;
  finalDecisionMaker: string;
  conflictResolution?: ConflictResolution;
}

export interface ReviewDiscussionEntry {
  reviewerId: string;
  message: string;
  timestamp: Date;
  type: 'comment' | 'question' | 'suggestion' | 'concern' | 'agreement' | 'disagreement';
}

export interface ConflictResolution {
  conflictType: string;
  resolutionMethod: 'discussion' | 'vote' | 'escalation' | 'expert_opinion';
  resolution: string;
  resolvedBy: string;
  resolvedAt: Date;
}

export interface ReviewHistoryEntry {
  action: 'assigned' | 'started' | 'paused' | 'resumed' | 'completed' | 'revised' | 'escalated';
  timestamp: Date;
  performedBy: string;
  reason?: string;
  metadata?: Record<string, any>;
}

// =============================================
// Completion Validation System
// =============================================

export interface CompletionValidation {
  id: string;
  reflectionId: string;
  studentId: string;
  
  // Validation criteria
  criteria: ValidationCriterion[];
  overallResult: ValidationResult;
  
  // Validation process
  validationMode: QualityValidationMode;
  validatedBy: ValidatedBy[];
  validationTimeline: ValidationTimelineEntry[];
  
  // Results and feedback
  qualityAssessment: QualityAssessment;
  completionCertificate?: CompletionCertificate;
  improvementRequirements?: ImprovementRequirement[];
  
  // Metadata
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  version: number;
}

export interface ValidationCriterion {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'structure' | 'quality' | 'participation' | 'timeliness';
  
  // Criterion details
  weight: number; // 0-1 weight in overall validation
  threshold: number; // 0-1 minimum score required
  mandatory: boolean;
  
  // Validation result
  result: CriterionResult;
  evidence: ValidationEvidence[];
  
  // Rubric
  rubric: CriterionRubric;
}

export interface CriterionResult {
  passed: boolean;
  score: number; // 0-1
  confidence: number; // 0-1
  assessedBy: ReviewerRole;
  assessedAt: Date;
  feedback: string;
}

export interface ValidationEvidence {
  type: 'automated_analysis' | 'teacher_assessment' | 'peer_evaluation' | 'self_assessment';
  description: string;
  data: any;
  confidence: number;
  timestamp: Date;
}

export interface CriterionRubric {
  levels: RubricLevel[];
  scoringGuide: string;
  examples: RubricExample[];
}

export interface RubricLevel {
  level: number; // 1-5 typically
  name: string; // e.g., "Exceptional", "Proficient"
  description: string;
  indicators: string[];
  scoreRange: { min: number; max: number };
}

export interface RubricExample {
  level: number;
  responseExcerpt: string;
  explanation: string;
}

export interface ValidationResult {
  isValid: boolean;
  overallScore: number; // 0-1
  confidence: number; // 0-1
  
  // Breakdown
  passedCriteria: number;
  totalCriteria: number;
  mandatoryPassed: boolean;
  
  // Assessment
  qualityLevel: 'below_basic' | 'basic' | 'proficient' | 'advanced' | 'exceptional';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  
  // Status
  status: ValidationStatus;
  reviewRequired: boolean;
  revisionRequired: boolean;
}

export interface ValidatedBy {
  role: ReviewerRole;
  userId: string;
  name?: string;
  validatedAt: Date;
  confidence: number;
  notes?: string;
}

export interface ValidationTimelineEntry {
  stage: 'initiated' | 'automated_analysis' | 'teacher_review' | 'peer_review' | 'finalized' | 'appealed';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  startTime: Date;
  endTime?: Date;
  performedBy?: string;
  notes?: string;
  result?: any;
}

export interface QualityAssessment {
  overallQuality: number; // 0-1
  dimensionScores: Record<QualityDimension, number>;
  
  // Detailed assessment
  assessmentSummary: string;
  standoutQualities: string[];
  improvementAreas: string[];
  
  // Comparative analysis
  peerComparison?: PeerQualityComparison;
  historicalComparison?: HistoricalQualityComparison;
  
  // Recognition
  achievements: QualityAchievement[];
  badges: QualityBadge[];
}

export interface PeerQualityComparison {
  classPercentile: number;
  classAverage: number;
  standingInClass: number;
  comparedStudents: number;
}

export interface HistoricalQualityComparison {
  improvementRate: number;
  consistencyScore: number;
  bestPreviousScore: number;
  trendDirection: 'improving' | 'stable' | 'declining';
}

export interface QualityAchievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  earnedFor: QualityDimension[];
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface QualityBadge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedFor: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface CompletionCertificate {
  id: string;
  studentId: string;
  studentName: string;
  reflectionTitle: string;
  debateTitle: string;
  
  // Certificate details
  issuedAt: Date;
  issuedBy: string;
  certificateType: 'participation' | 'quality' | 'excellence' | 'innovation';
  
  // Achievement data
  overallScore: number;
  achievements: string[];
  specialRecognition: string[];
  
  // Verification
  certificateHash: string;
  verificationUrl: string;
  digitalSignature: string;
  
  // Presentation
  templateId: string;
  customizations: Record<string, any>;
  downloadUrl: string;
}

export interface ImprovementRequirement {
  dimension: QualityDimension;
  currentScore: number;
  requiredScore: number;
  description: string;
  
  // Improvement guidance
  suggestions: ImprovementSuggestion[];
  resources: ImprovementResource[];
  timeline: string;
  
  // Tracking
  completed: boolean;
  completedAt?: Date;
  reassessmentScheduled?: Date;
}

// =============================================
// Batch Quality Operations
// =============================================

export interface BatchQualityRequest {
  reflectionIds: string[];
  validationMode: QualityValidationMode;
  priority: 'low' | 'medium' | 'high';
  deadline?: Date;
  assignToReviewer?: string;
  
  // Options
  options: BatchQualityOptions;
}

export interface BatchQualityOptions {
  enableParallelProcessing: boolean;
  maxConcurrentReviews: number;
  autoAssignReviewers: boolean;
  generateReports: boolean;
  notifyOnCompletion: boolean;
  includeComparativeAnalysis: boolean;
}

export interface BatchQualityResult {
  batchId: string;
  requestId: string;
  
  // Results summary
  totalReflections: number;
  completedReflections: number;
  averageQualityScore: number;
  averageReviewTime: number;
  
  // Individual results
  results: IndividualQualityResult[];
  
  // Batch analytics
  qualityDistribution: Record<string, number>;
  commonIssues: QualityIssuePattern[];
  recommendations: BatchRecommendation[];
  
  // Process data
  startedAt: Date;
  completedAt?: Date;
  totalTimeSpent: number;
  reviewersInvolved: string[];
}

export interface IndividualQualityResult {
  reflectionId: string;
  studentId: string;
  validationResult: ValidationResult;
  qualityScore: QualityScore;
  teacherReview?: TeacherReview;
  processingTime: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: QualityIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: TextLocation;
  suggestion: string;
  autoFixAvailable: boolean;
}

export interface QualityIssuePattern {
  issueType: QualityIssueType;
  frequency: number;
  affectedStudents: number;
  averageSeverity: string;
  commonCause: string;
  recommendedIntervention: string;
}

export interface BatchRecommendation {
  type: 'class_instruction' | 'individual_support' | 'resource_development' | 'policy_change';
  priority: 'low' | 'medium' | 'high';
  description: string;
  affectedStudents: string[];
  implementationEffort: 'low' | 'medium' | 'high';
  expectedImpact: string;
}

// =============================================
// Service Interfaces
// =============================================

export interface IQualityValidationService {
  // Core quality scoring
  scoreReflectionQuality(reflectionId: string, options?: QualityScoringOptions): Promise<QualityScore>;
  validateReflectionCompletion(reflectionId: string, criteria: ValidationCriterion[]): Promise<CompletionValidation>;
  
  // Improvement and feedback
  generateImprovementSuggestions(reflectionId: string, qualityScore: QualityScore): Promise<ImprovementSuggestion[]>;
  createImprovementPlan(studentId: string, assessments: QualityScore[]): Promise<ImprovementPlan>;
  
  // Batch operations
  processBatchQuality(request: BatchQualityRequest): Promise<BatchQualityResult>;
  
  // Quality analytics
  analyzeQualityTrends(studentId: string, timeframe: string): Promise<QualityTrendAnalysis>;
  compareQualityMetrics(reflectionIds: string[]): Promise<QualityComparisonResult>;
}

export interface ITeacherReviewService {
  // Review management
  assignReview(reflectionId: string, teacherId: string, priority?: string): Promise<TeacherReview>;
  getReviewQueue(teacherId: string, filters?: ReviewQueueFilters): Promise<TeacherReview[]>;
  startReview(reviewId: string): Promise<TeacherReview>;
  completeReview(reviewId: string, assessment: OverallAssessment): Promise<TeacherReview>;
  
  // Review workflow
  requestRevision(reviewId: string, requirements: ImprovementRequirement[]): Promise<TeacherReview>;
  approveReflection(reviewId: string, certificate?: CompletionCertificate): Promise<TeacherReview>;
  escalateReview(reviewId: string, reason: string): Promise<TeacherReview>;
  
  // Collaboration
  addCollaborativeReviewer(reviewId: string, reviewerId: string): Promise<TeacherReview>;
  facilitateReviewDiscussion(reviewId: string, message: string): Promise<ReviewDiscussionEntry>;
  
  // Analytics
  getReviewAnalytics(teacherId: string, timeframe: string): Promise<ReviewAnalytics>;
  getClassQualityOverview(classId: string): Promise<ClassQualityOverview>;
}

export interface QualityScoringOptions {
  includeDimensionBreakdown: boolean;
  includeEvidence: boolean;
  includeSuggestions: boolean;
  compareToPeers: boolean;
  compareToHistory: boolean;
  generateCertificate: boolean;
}

export interface ReviewQueueFilters {
  priority?: string[];
  status?: ValidationStatus[];
  assignedDateRange?: { start: Date; end: Date };
  studentIds?: string[];
  classIds?: string[];
  sortBy?: 'priority' | 'assigned_date' | 'due_date' | 'student_name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface QualityTrendAnalysis {
  studentId: string;
  timeframe: string;
  overallTrend: 'improving' | 'stable' | 'declining' | 'variable';
  dimensionTrends: Record<QualityDimension, QualityDimensionTrend>;
  milestones: QualityMilestone[];
  predictions: QualityPrediction[];
}

export interface QualityDimensionTrend {
  dimension: QualityDimension;
  currentScore: number;
  trendDirection: 'up' | 'down' | 'stable';
  changeRate: number; // per reflection
  consistency: number; // 0-1
  recentScores: Array<{ reflectionId: string; score: number; date: Date }>;
}

export interface QualityMilestone {
  type: 'improvement' | 'consistency' | 'achievement' | 'breakthrough';
  description: string;
  achievedAt: Date;
  significance: 'minor' | 'moderate' | 'major';
  relatedDimensions: QualityDimension[];
}

export interface QualityPrediction {
  dimension: QualityDimension;
  predictedScore: number;
  confidence: number;
  timeframe: string;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  factor: string;
  impact: number; // -1 to 1
  confidence: number;
}

export interface QualityComparisonResult {
  reflectionIds: string[];
  comparisonType: 'peer_group' | 'historical' | 'cross_class' | 'benchmark';
  
  // Comparative metrics
  averageScores: Record<QualityDimension, number>;
  scoreDistribution: Record<QualityDimension, number[]>;
  outliers: QualityOutlier[];
  
  // Analysis
  insights: ComparisonInsight[];
  recommendations: string[];
  significantDifferences: SignificantDifference[];
}

export interface QualityOutlier {
  reflectionId: string;
  studentId: string;
  dimension: QualityDimension;
  score: number;
  deviationFromMean: number;
  type: 'exceptionally_high' | 'exceptionally_low';
  possibleReasons: string[];
}

export interface ComparisonInsight {
  type: 'strength' | 'weakness' | 'pattern' | 'anomaly';
  description: string;
  affectedReflections: string[];
  confidence: number;
  recommendations: string[];
}

export interface SignificantDifference {
  dimension: QualityDimension;
  difference: number;
  significance: number; // statistical significance
  description: string;
  implications: string[];
}

export interface ReviewAnalytics {
  teacherId: string;
  timeframe: string;
  
  // Review performance
  reviewsCompleted: number;
  averageReviewTime: number;
  reviewAccuracy: number; // agreement with other reviewers
  
  // Quality insights
  averageQualityScored: number;
  qualityTrendSpotted: number;
  improvementPlansCreated: number;
  
  // Student outcomes
  studentsHelped: number;
  averageImprovementAchieved: number;
  certificatesIssued: number;
  
  // Efficiency metrics
  reviewBacklog: number;
  averageResponseTime: number;
  studentSatisfactionRating: number;
}

export interface ClassQualityOverview {
  classId: string;
  className: string;
  timeframe: string;
  
  // Class performance
  totalReflections: number;
  averageQualityScore: number;
  qualityDistribution: Record<string, number>;
  
  // Student progress
  studentsImproving: number;
  studentsNeedingSupport: number;
  topPerformers: Array<{ studentId: string; score: number }>;
  strugglingStudents: Array<{ studentId: string; issues: QualityIssueType[] }>;
  
  // Common patterns
  commonStrengths: string[];
  commonWeaknesses: string[];
  recommendedInterventions: string[];
  
  // Trends
  qualityTrend: 'improving' | 'stable' | 'declining';
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  participationRate: number;
}

// =============================================
// Export Types for External Use
// =============================================

export type QualityValidationRequest = Pick<CompletionValidation, 'reflectionId' | 'studentId' | 'validationMode'> & { criteria?: ValidationCriterion[] };
export type TeacherReviewRequest = Pick<TeacherReview, 'reflectionId' | 'studentId'> & { priority?: string; deadline?: Date };
export type ImprovementPlanRequest = { studentId: string; assessments: QualityScore[]; timeline?: string };
export type QualityComparisonRequest = { reflectionIds: string[]; comparisonType: string; includeInsights?: boolean };

export { ReflectionStatus } from '@prisma/client';
