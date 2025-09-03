/**
 * Comprehensive interfaces for Reflection Response Collection System
 * Supports session management, response handling, multimedia content, and teacher tools
 */

import { ReflectionStatus, LearningMetricType } from '@prisma/client';
import { QuestionType, PromptCategory } from './prompt.interfaces';

// =============================================
// Core Response Types and Enums
// =============================================

export enum ResponseType {
  TEXT = 'TEXT',
  RATING = 'RATING',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  RANKING = 'RANKING',
  MEDIA = 'MEDIA',
  COMPOSITE = 'COMPOSITE'
}

export enum ResponseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  VALIDATED = 'VALIDATED',
  FLAGGED = 'FLAGGED',
  APPROVED = 'APPROVED'
}

export enum MediaType {
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT'
}

export enum SessionState {
  INITIALIZED = 'INITIALIZED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum ValidationLevel {
  NONE = 'NONE',
  BASIC = 'BASIC',
  MODERATE = 'MODERATE',
  STRICT = 'STRICT',
  CUSTOM = 'CUSTOM'
}

// =============================================
// Response Content Interfaces
// =============================================

export interface ResponseContent {
  type: ResponseType;
  data: TextResponse | RatingResponse | MultipleChoiceResponse | RankingResponse | MediaResponse | CompositeResponse;
  metadata: ResponseMetadata;
  validation: ValidationResult;
}

export interface TextResponse {
  text: string;
  wordCount: number;
  isRichText: boolean;
  formatting?: TextFormatting;
  sentiment?: SentimentAnalysis;
}

export interface RatingResponse {
  value: number;
  scale: { min: number; max: number; step: number };
  label?: string;
  confidence?: number;
}

export interface MultipleChoiceResponse {
  selectedOptions: string[];
  allowMultiple: boolean;
  customResponse?: string;
  selectionOrder?: number[];
}

export interface RankingResponse {
  rankings: RankingItem[];
  methodology?: string;
  confidence?: number;
}

export interface RankingItem {
  itemId: string;
  rank: number;
  reasoning?: string;
}

export interface MediaResponse {
  attachments: MediaAttachment[];
  description?: string;
  transcription?: string;
  analysis?: MediaAnalysis;
}

export interface CompositeResponse {
  components: Array<{
    type: ResponseType;
    data: any;
    weight: number;
  }>;
  summary?: string;
}

export interface TextFormatting {
  bold: TextRange[];
  italic: TextRange[];
  underline: TextRange[];
  links: LinkRange[];
  emphasis: EmphasisRange[];
}

export interface TextRange {
  start: number;
  end: number;
}

export interface LinkRange extends TextRange {
  url: string;
  title?: string;
}

export interface EmphasisRange extends TextRange {
  level: 'low' | 'medium' | 'high';
}

export interface SentimentAnalysis {
  overall: number; // -1 to 1
  emotions: Record<string, number>;
  confidence: number;
  keywords: string[];
}

// =============================================
// Media and Attachment Interfaces
// =============================================

export interface MediaAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  providerKey: string;
  sha256Hash: string;
  uploadedAt: Date;
  metadata: MediaMetadata;
  analysis?: MediaAnalysis;
}

export interface MediaMetadata {
  originalName: string;
  uploadSource: 'direct' | 'drag_drop' | 'paste' | 'camera' | 'microphone';
  dimensions?: { width: number; height: number };
  duration?: number; // for audio/video in seconds
  location?: GeolocationData;
  device?: DeviceInfo;
}

export interface MediaAnalysis {
  contentType: MediaType;
  safetyScore: number; // 0-1, higher is safer
  isAppropriate: boolean;
  detectedObjects?: string[];
  textContent?: string; // OCR/transcription
  qualityScore?: number;
  thumbnailUrl?: string;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  screenResolution?: string;
}

// =============================================
// Session Management Interfaces
// =============================================

export interface ReflectionSession {
  id: string;
  userId: string;
  debateId: string;
  promptSequenceId: string;
  state: SessionState;
  currentPromptIndex: number;
  totalPrompts: number;
  responses: SessionResponse[];
  metadata: SessionMetadata;
  timeline: SessionTimeline;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

export interface SessionResponse {
  promptId: string;
  questionType: QuestionType;
  category: PromptCategory;
  response: ResponseContent;
  responseTime: number; // seconds
  attempts: number;
  isSkipped: boolean;
  timestamp: Date;
}

export interface SessionMetadata {
  userAgent: string;
  ipAddress?: string;
  timezone: string;
  language: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  autoSaveEnabled: boolean;
  qualityTarget: ValidationLevel;
  allowedMediaTypes: MediaType[];
  maxFileSize: number;
  sessionPreferences: SessionPreferences;
}

export interface SessionPreferences {
  enableNotifications: boolean;
  autoAdvance: boolean;
  showProgress: boolean;
  allowSkipping: boolean;
  preferredFontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface SessionTimeline {
  events: SessionEvent[];
  totalTimeSpent: number;
  activeTimeSpent: number;
  idleTime: number;
  pauseCount: number;
}

export interface SessionEvent {
  type: 'start' | 'pause' | 'resume' | 'response' | 'auto_save' | 'skip' | 'complete' | 'error';
  timestamp: Date;
  data?: any;
  duration?: number;
}

// =============================================
// Validation and Quality Control
// =============================================

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-1
  level: ValidationLevel;
  checks: ValidationCheck[];
  suggestions: ValidationSuggestion[];
  autoCorrections: AutoCorrection[];
}

export interface ValidationCheck {
  type: 'length' | 'content' | 'appropriateness' | 'completeness' | 'originality' | 'media_safety';
  passed: boolean;
  score: number;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details?: any;
}

export interface ValidationSuggestion {
  type: 'improve_clarity' | 'add_details' | 'check_grammar' | 'cite_sources' | 'be_specific';
  message: string;
  example?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AutoCorrection {
  type: 'spelling' | 'grammar' | 'formatting' | 'inappropriate_content';
  original: string;
  corrected: string;
  confidence: number;
  applied: boolean;
}

// =============================================
// Progress Tracking Interfaces
// =============================================

export interface ReflectionProgress {
  sessionId: string;
  userId: string;
  completionPercentage: number;
  currentStep: number;
  totalSteps: number;
  timeSpent: number;
  estimatedTimeRemaining: number;
  quality: ProgressQuality;
  engagement: EngagementMetrics;
  milestones: ProgressMilestone[];
}

export interface ProgressQuality {
  averageResponseQuality: number;
  thoughtfulnessScore: number;
  depthScore: number;
  consistencyScore: number;
  improvementTrend: 'improving' | 'stable' | 'declining';
}

export interface EngagementMetrics {
  responseRate: number;
  averageResponseTime: number;
  skipRate: number;
  revisionCount: number;
  mediaUsage: number;
  attentionScore: number; // based on interaction patterns
}

export interface ProgressMilestone {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
  achievedAt?: Date;
  value: number;
  badge?: BadgeInfo;
}

export interface BadgeInfo {
  name: string;
  icon: string;
  color: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
}

// =============================================
// Batch Operations and Analytics
// =============================================

export interface BatchExportRequest {
  classId?: string;
  debateId?: string;
  userId?: string;
  dateRange: DateRange;
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  includeMedia: boolean;
  anonymize: boolean;
  filters: ExportFilters;
}

export interface ExportFilters {
  categories?: PromptCategory[];
  completionStatus?: ReflectionStatus[];
  qualityThreshold?: number;
  responseTypes?: ResponseType[];
  includeIncomplete?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface BatchAnalysisResult {
  summary: AnalysisSummary;
  patterns: ResponsePattern[];
  insights: AnalysisInsight[];
  recommendations: string[];
  classComparison?: ClassComparisonData;
}

export interface AnalysisSummary {
  totalResponses: number;
  averageCompletionTime: number;
  averageQualityScore: number;
  commonThemes: string[];
  sentimentDistribution: Record<string, number>;
  categoryPerformance: Record<PromptCategory, number>;
}

export interface ResponsePattern {
  pattern: string;
  frequency: number;
  examples: string[];
  significance: number;
  categories: PromptCategory[];
}

export interface AnalysisInsight {
  type: 'strength' | 'weakness' | 'trend' | 'anomaly' | 'opportunity';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  recommendations: string[];
  affectedUsers?: string[];
}

export interface ClassComparisonData {
  classAverage: number;
  userPerformance: number;
  percentile: number;
  strengths: string[];
  improvements: string[];
  peerComparison: PeerComparison[];
}

export interface PeerComparison {
  metric: string;
  userScore: number;
  peerAverage: number;
  percentile: number;
}

// =============================================
// Service Interfaces
// =============================================

export interface IReflectionResponseService {
  // Session Management
  initializeSession(userId: string, debateId: string, promptSequenceId: string): Promise<ReflectionSession>;
  getSession(sessionId: string): Promise<ReflectionSession | null>;
  pauseSession(sessionId: string): Promise<ReflectionSession>;
  resumeSession(sessionId: string): Promise<ReflectionSession>;
  completeSession(sessionId: string): Promise<ReflectionSession>;
  
  // Response Handling
  saveResponse(sessionId: string, promptId: string, response: ResponseContent): Promise<SessionResponse>;
  getResponses(sessionId: string): Promise<SessionResponse[]>;
  updateResponse(sessionId: string, responseId: string, updates: Partial<ResponseContent>): Promise<SessionResponse>;
  deleteResponse(sessionId: string, responseId: string): Promise<void>;
  
  // Auto-save and Recovery
  autoSave(sessionId: string, partialData: any): Promise<void>;
  recoverSession(userId: string, debateId: string): Promise<ReflectionSession | null>;
  
  // Validation and Quality
  validateResponse(response: ResponseContent, rules: ValidationRule[]): Promise<ValidationResult>;
  improveResponseQuality(response: ResponseContent, context: any): Promise<ValidationSuggestion[]>;
}

export interface IMediaService {
  uploadMedia(file: File, metadata: MediaMetadata): Promise<MediaAttachment>;
  getSignedUploadUrl(filename: string, mimeType: string, size: number): Promise<SignedUploadUrl>;
  getSignedDownloadUrl(attachmentId: string): Promise<string>;
  deleteMedia(attachmentId: string): Promise<void>;
  analyzeMedia(attachmentId: string): Promise<MediaAnalysis>;
  generateThumbnail(attachmentId: string): Promise<string>;
}

export interface IBatchOperationsService {
  exportReflections(request: BatchExportRequest): Promise<ExportResult>;
  analyzeClassReflections(classId: string, filters: ExportFilters): Promise<BatchAnalysisResult>;
  generateClassReport(classId: string, options: ReportOptions): Promise<ClassReport>;
  anonymizeData(data: any[], level: 'basic' | 'advanced'): Promise<any[]>;
}

export interface ValidationRule {
  type: string;
  parameters: any;
  weight: number;
  required: boolean;
}

export interface SignedUploadUrl {
  url: string;
  fields: Record<string, string>;
  expiresAt: Date;
  maxSize: number;
}

export interface File {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface ExportResult {
  id: string;
  downloadUrl: string;
  format: string;
  size: number;
  recordCount: number;
  expiresAt: Date;
}

export interface ReportOptions {
  includeCharts: boolean;
  includeRecommendations: boolean;
  anonymize: boolean;
  language: string;
  format: 'pdf' | 'html' | 'docx';
}

export interface ClassReport {
  id: string;
  classId: string;
  generatedAt: Date;
  summary: AnalysisSummary;
  studentProgress: StudentProgress[];
  recommendations: string[];
  downloadUrl: string;
}

export interface StudentProgress {
  userId: string;
  userName?: string; // null if anonymized
  progress: ReflectionProgress;
  insights: AnalysisInsight[];
  recommendations: string[];
}

// =============================================
// Response Metadata Interface
// =============================================

export interface ResponseMetadata {
  submittedAt: Date;
  responseTime: number;
  editCount: number;
  sourceInfo: {
    userAgent: string;
    ipAddress?: string;
    location?: GeolocationData;
    referrer?: string;
  };
  qualityMetrics: {
    readabilityScore?: number;
    originalityScore?: number;
    relevanceScore?: number;
    depthScore?: number;
  };
  flags: ResponseFlag[];
  tags: string[];
}

export interface ResponseFlag {
  type: 'inappropriate' | 'low_quality' | 'plagiarism' | 'off_topic' | 'needs_review';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  automated: boolean;
  reviewerId?: string;
  createdAt: Date;
}

// =============================================
// Export Types for External Use
// =============================================

export type SessionInitRequest = Pick<ReflectionSession, 'userId' | 'debateId' | 'promptSequenceId'>;
export type ResponseSubmission = Pick<ResponseContent, 'type' | 'data'> & { promptId: string };
export type SessionUpdateRequest = Partial<Pick<ReflectionSession, 'state' | 'metadata'>>;
export type MediaUploadRequest = Pick<MediaAttachment, 'filename' | 'mimeType' | 'size'> & { file: Buffer };

export { ReflectionStatus, LearningMetricType } from '@prisma/client';
