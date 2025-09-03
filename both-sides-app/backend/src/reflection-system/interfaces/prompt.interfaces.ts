/**
 * Comprehensive interfaces for the Dynamic Reflection Prompt System
 * Supports personalized prompt generation, template management, and multi-language support
 */

import { ReflectionStatus, LearningMetricType } from '@prisma/client';

// =============================================
// Core Prompt Types and Enums
// =============================================

export enum QuestionType {
  OPEN_ENDED = 'OPEN_ENDED',
  RATING_SCALE = 'RATING_SCALE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  LIKERT_SCALE = 'LIKERT_SCALE',
  BINARY_CHOICE = 'BINARY_CHOICE',
  RANKING = 'RANKING',
  SLIDER = 'SLIDER'
}

export enum PromptCategory {
  GENERAL_REFLECTION = 'GENERAL_REFLECTION',
  ARGUMENT_QUALITY = 'ARGUMENT_QUALITY',
  LISTENING_SKILLS = 'LISTENING_SKILLS',
  EVIDENCE_USAGE = 'EVIDENCE_USAGE',
  EMOTIONAL_REGULATION = 'EMOTIONAL_REGULATION',
  PERSPECTIVE_TAKING = 'PERSPECTIVE_TAKING',
  COMMUNICATION_CLARITY = 'COMMUNICATION_CLARITY',
  CRITICAL_THINKING = 'CRITICAL_THINKING',
  COLLABORATION = 'COLLABORATION',
  BELIEF_EVOLUTION = 'BELIEF_EVOLUTION'
}

export enum PromptDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

export enum AgeGroup {
  ELEMENTARY = 'ELEMENTARY',    // K-5
  MIDDLE_SCHOOL = 'MIDDLE_SCHOOL', // 6-8
  HIGH_SCHOOL = 'HIGH_SCHOOL',     // 9-12
  COLLEGE = 'COLLEGE',             // 18+
  ADULT = 'ADULT'                  // General adult education
}

export enum Language {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  CHINESE = 'zh',
  JAPANESE = 'ja'
}

// =============================================
// Prompt Template Interfaces
// =============================================

export interface PromptTemplate {
  id: string;
  templateType: PromptCategory;
  questionType: QuestionType;
  promptText: string;
  promptTextLocalized?: Record<Language, string>;
  targetAudience: AgeGroup;
  difficultyLevel: PromptDifficulty;
  isActive: boolean;
  version: string;
  metadata: PromptMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptMetadata {
  estimatedTimeMinutes: number;
  skillFocus: string[];
  prerequisites?: string[];
  followUpPrompts?: string[];
  adaptationRules?: AdaptationRule[];
  abTestGroup?: string;
  successMetrics?: string[];
  accessibilityFeatures?: AccessibilityFeature[];
}

export interface AdaptationRule {
  condition: string;
  action: 'skip' | 'modify' | 'add_followup' | 'change_difficulty';
  parameter?: any;
}

export interface AccessibilityFeature {
  type: 'screen_reader' | 'large_text' | 'simplified_language' | 'visual_cues';
  enabled: boolean;
  configuration?: Record<string, any>;
}

// =============================================
// Question Options and Validation
// =============================================

export interface QuestionOptions {
  ratingScale?: {
    min: number;
    max: number;
    labels?: Record<number, string>;
    step?: number;
  };
  multipleChoice?: {
    options: ChoiceOption[];
    allowMultiple: boolean;
    randomizeOrder: boolean;
  };
  openEnded?: {
    minLength: number;
    maxLength: number;
    placeholder?: string;
    suggestedWordCount?: number;
  };
  likertScale?: {
    levels: number;
    leftLabel: string;
    rightLabel: string;
    neutralOption?: boolean;
  };
  ranking?: {
    items: string[];
    maxSelections?: number;
  };
  slider?: {
    min: number;
    max: number;
    step: number;
    unit?: string;
  };
}

export interface ChoiceOption {
  id: string;
  text: string;
  value: string;
  metadata?: Record<string, any>;
}

// =============================================
// Context and Personalization
// =============================================

export interface PromptGenerationContext {
  userId: string;
  debateId: string;
  userProfile: UserContextProfile;
  debatePerformance: DebatePerformanceContext;
  educationalObjectives: EducationalObjective[];
  sessionPreferences: SessionPreferences;
  previousReflections: PreviousReflectionSummary[];
}

export interface UserContextProfile {
  ageGroup: AgeGroup;
  experienceLevel: PromptDifficulty;
  preferredLanguage: Language;
  beliefProfile: {
    ideologyScores: Record<string, number>;
    plasticityScore: number;
    confidenceLevel: number;
  };
  learningGoals: string[];
  accessibilityNeeds: AccessibilityFeature[];
}

export interface DebatePerformanceContext {
  participationScore: number;
  argumentQualityScore: number;
  listeningScore: number;
  evidenceUsageScore: number;
  emotionalRegulationScore: number;
  perspectiveTakingScore: number;
  strengths: string[];
  improvementAreas: string[];
  keyMoments: DebateKeyMoment[];
}

export interface DebateKeyMoment {
  timestamp: Date;
  type: 'strong_argument' | 'weak_argument' | 'good_listening' | 'emotional_moment' | 'perspective_shift';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface EducationalObjective {
  id: string;
  category: PromptCategory;
  description: string;
  targetMetric: LearningMetricType;
  priority: 'high' | 'medium' | 'low';
  deadline?: Date;
}

export interface SessionPreferences {
  maxQuestions: number;
  estimatedTimeMinutes: number;
  preferredQuestionTypes: QuestionType[];
  avoidCategories?: PromptCategory[];
  includeGameification: boolean;
  allowSkipping: boolean;
}

export interface PreviousReflectionSummary {
  reflectionId: string;
  completedAt: Date;
  categories: PromptCategory[];
  engagementScore: number;
  qualityScore: number;
  timeSpent: number;
  patterns: string[];
}

// =============================================
// Generated Prompt Sequence
// =============================================

export interface GeneratedPromptSequence {
  sequenceId: string;
  userId: string;
  debateId: string;
  prompts: SequencedPrompt[];
  metadata: SequenceMetadata;
  generatedAt: Date;
  expiresAt?: Date;
}

export interface SequencedPrompt {
  id: string;
  order: number;
  templateId: string;
  category: PromptCategory;
  questionType: QuestionType;
  promptText: string;
  options: QuestionOptions;
  isRequired: boolean;
  estimatedTimeMinutes: number;
  personalizationApplied: PersonalizationRecord[];
  adaptationRules: AdaptationRule[];
  metadata: Record<string, any>;
}

export interface PersonalizationRecord {
  type: 'context_injection' | 'difficulty_adjustment' | 'language_adaptation' | 'content_customization';
  description: string;
  originalContent?: string;
  appliedAt: Date;
}

export interface SequenceMetadata {
  totalEstimatedTime: number;
  difficultyDistribution: Record<PromptDifficulty, number>;
  categoryDistribution: Record<PromptCategory, number>;
  personalizationStrategy: string;
  abTestAssignments: Record<string, string>;
  adaptationHistory: string[];
}

// =============================================
// Service Interfaces
// =============================================

export interface IReflectionPromptService {
  generatePromptSequence(context: PromptGenerationContext): Promise<GeneratedPromptSequence>;
  getNextPrompt(sequenceId: string, currentPromptId?: string): Promise<SequencedPrompt | null>;
  adaptPromptBasedOnResponse(promptId: string, response: any): Promise<SequencedPrompt[]>;
  personalizePromptText(template: PromptTemplate, context: PromptGenerationContext): Promise<string>;
  validatePromptSequence(sequence: GeneratedPromptSequence): Promise<SequenceValidationResult>;
}

export interface IPromptTemplateManager {
  getTemplatesByCategory(category: PromptCategory, filters?: TemplateFilters): Promise<PromptTemplate[]>;
  createTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptTemplate>;
  updateTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate>;
  deleteTemplate(id: string): Promise<void>;
  getTemplateVersions(templateId: string): Promise<PromptTemplate[]>;
  activateTemplate(id: string, version?: string): Promise<PromptTemplate>;
  runABTest(testConfig: ABTestConfiguration): Promise<ABTestResult>;
}

export interface TemplateFilters {
  ageGroup?: AgeGroup;
  difficulty?: PromptDifficulty;
  questionType?: QuestionType;
  language?: Language;
  isActive?: boolean;
  abTestGroup?: string;
}

export interface ABTestConfiguration {
  testName: string;
  variants: PromptTemplate[];
  trafficSplit: Record<string, number>;
  successMetric: string;
  duration: number;
  targetAudience?: TemplateFilters;
}

export interface ABTestResult {
  testName: string;
  variants: Record<string, VariantResult>;
  winner?: string;
  confidence: number;
  recommendation: string;
}

export interface VariantResult {
  templateId: string;
  exposures: number;
  conversions: number;
  conversionRate: number;
  averageEngagement: number;
  qualityScore: number;
}

export interface SequenceValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  estimatedCompletionRate: number;
}

export interface ValidationError {
  type: 'missing_category' | 'difficulty_mismatch' | 'time_constraint' | 'accessibility_issue';
  message: string;
  promptId?: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface ValidationWarning {
  type: 'suboptimal_sequencing' | 'potential_fatigue' | 'limited_personalization';
  message: string;
  suggestion: string;
}

// =============================================
// Analytics and Insights
// =============================================

export interface PromptAnalytics {
  templateId: string;
  period: DateRange;
  metrics: PromptMetrics;
  insights: PromptInsight[];
  recommendations: string[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PromptMetrics {
  totalExposures: number;
  completionRate: number;
  averageResponseTime: number;
  engagementScore: number;
  qualityScore: number;
  skipRate: number;
  adaptationTriggers: Record<string, number>;
}

export interface PromptInsight {
  type: 'high_engagement' | 'low_completion' | 'difficulty_mismatch' | 'personalization_success';
  description: string;
  impact: number;
  confidence: number;
  recommendation?: string;
}

// =============================================
// Export Types for External Use
// =============================================

export type PromptGenerationRequest = PromptGenerationContext;
export type PromptSequenceResponse = GeneratedPromptSequence;
export type PromptTemplateRequest = Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>;
export type PromptTemplateResponse = PromptTemplate;
