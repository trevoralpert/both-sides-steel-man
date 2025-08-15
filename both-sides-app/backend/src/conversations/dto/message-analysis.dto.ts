/**
 * Message Analysis DTOs
 * 
 * Data structures for AI-powered real-time message analysis
 * Task 5.3.1: Real-time Message Analysis Pipeline
 */

import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsArray, Min, Max } from 'class-validator';

export interface MessageAnalysis {
  messageId: string;
  analysisResults: {
    toxicity: {
      score: number; // 0-1
      categories: string[];
      confidence: number;
    };
    quality: {
      argumentStrength: number;
      evidenceBased: boolean;
      respectfulness: number;
      constructiveness: number;
    };
    educational: {
      criticalThinking: number;
      evidenceUsage: number;
      logicalStructure: number;
    };
    metadata: {
      wordCount: number;
      readabilityScore: number;
      sentiment: number;
    };
  };
  actionRecommended: 'approve' | 'review' | 'block' | 'coach';
  processingTime: number;
}

export interface Context {
  conversationId: string;
  debatePhase: string;
  topicId?: string;
  previousMessages: Array<{
    id: string;
    content: string;
    userId: string;
    timestamp: Date;
  }>;
  participants: Array<{
    userId: string;
    position: 'PRO' | 'CON';
    skillLevel?: number;
  }>;
}

export interface AnalysisFeedback {
  messageId: string;
  analysisId: string;
  feedbackType: 'accuracy' | 'quality' | 'usefulness';
  rating: number; // 1-5
  comments?: string;
  providerId: string; // teacher or moderator ID
}

export class MessageAnalysisRequest {
  @IsString()
  messageId: string;

  @IsString()
  content: string;

  @IsString()
  userId: string;

  @IsString()
  conversationId: string;

  @IsOptional()
  context?: Context;
}

export class ToxicityScore {
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

export class QualityMetrics {
  @IsNumber()
  @Min(0)
  @Max(1)
  argumentStrength: number;

  @IsBoolean()
  evidenceBased: boolean;

  @IsNumber()
  @Min(0)
  @Max(1)
  respectfulness: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  constructiveness: number;
}

export class EducationalMetrics {
  @IsNumber()
  @Min(0)
  @Max(1)
  criticalThinking: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  evidenceUsage: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  logicalStructure: number;
}

export class MessageMetadata {
  @IsNumber()
  @Min(0)
  wordCount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  readabilityScore: number;

  @IsNumber()
  @Min(-1)
  @Max(1)
  sentiment: number;
}

export class MessageAnalysisResponse {
  @IsString()
  messageId: string;

  @IsString()
  analysisId: string;

  toxicity: ToxicityScore;
  quality: QualityMetrics;
  educational: EducationalMetrics;
  metadata: MessageMetadata;

  @IsEnum(['approve', 'review', 'block', 'coach'])
  actionRecommended: 'approve' | 'review' | 'block' | 'coach';

  @IsNumber()
  @Min(0)
  processingTime: number;

  @IsString()
  createdAt: string;
}

export interface BatchAnalysisRequest {
  messages: MessageAnalysisRequest[];
  priority?: 'high' | 'medium' | 'low';
}

export interface BatchAnalysisResponse {
  analyses: MessageAnalysisResponse[];
  totalProcessingTime: number;
  successful: number;
  failed: number;
  errors?: string[];
}
