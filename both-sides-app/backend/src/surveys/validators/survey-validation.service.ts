/**
 * Phase 3 Task 3.1.5.1: Comprehensive Survey Response Validation
 * Advanced validation logic for all question types and quality assurance
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SurveyResponseDto } from '../dto/survey-response.dto';
import { SurveyQuestion, SurveyQuestionType } from '@prisma/client';

export interface ValidationResult {
  isValid: boolean;
  qualityScore: number; // 0-100
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  flags: ValidationFlag[];
}

export interface ValidationIssue {
  type: 'format' | 'content' | 'timing' | 'consistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  field?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'quality' | 'pattern' | 'timing';
  message: string;
  impact: 'minor' | 'moderate';
}

export interface ValidationFlag {
  type: 'suspicious_timing' | 'pattern_detected' | 'inconsistent' | 'inappropriate';
  confidence: number; // 0-1
  reason: string;
}

@Injectable()
export class SurveyValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Task 3.1.5.1: Comprehensive response validation
   */
  async validateResponse(
    response: SurveyResponseDto,
    question: SurveyQuestion,
    userHistory?: any[]
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      qualityScore: 100,
      issues: [],
      warnings: [],
      flags: [],
    };

    // 1. Format validation
    this.validateResponseFormat(response, question, result);
    
    // 2. Content appropriateness validation
    this.validateContentAppropriateness(response, question, result);
    
    // 3. Response time validation
    this.validateResponseTiming(response, question, result);
    
    // 4. Consistency validation (if user history available)
    if (userHistory) {
      await this.validateResponseConsistency(response, question, userHistory, result);
    }

    // 5. Pattern detection
    this.detectSuspiciousPatterns(response, question, result);

    // Final validation status
    result.isValid = result.issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0;

    return result;
  }

  /**
   * Validate response format based on question type
   */
  private validateResponseFormat(
    response: SurveyResponseDto,
    question: SurveyQuestion,
    result: ValidationResult
  ): void {
    try {
      switch (question.type) {
        case 'LIKERT_SCALE':
          this.validateLikertResponse(response, question, result);
          break;
        case 'BINARY_CHOICE':
          this.validateBinaryResponse(response, question, result);
          break;
        case 'MULTIPLE_CHOICE':
          this.validateMultipleChoiceResponse(response, question, result);
          break;
        case 'RANKING':
          this.validateRankingResponse(response, question, result);
          break;
        case 'SLIDER':
          this.validateSliderResponse(response, question, result);
          break;
        case 'TEXT_RESPONSE':
          this.validateTextResponse(response, question, result);
          break;
        default:
          result.issues.push({
            type: 'format',
            severity: 'critical',
            message: `Unsupported question type: ${question.type}`,
            field: 'type',
          });
      }
    } catch (error) {
      result.issues.push({
        type: 'format',
        severity: 'critical',
        message: 'Response format validation failed',
        field: 'response_value',
      });
      result.qualityScore -= 50;
    }
  }

  private validateLikertResponse(response: SurveyResponseDto, question: SurveyQuestion, result: ValidationResult): void {
    const value = response.response_value;
    
    if (typeof value !== 'number') {
      result.issues.push({
        type: 'format',
        severity: 'critical',
        message: 'Likert scale response must be a number',
        field: 'response_value',
        suggestion: 'Select a number between 1 and 7',
      });
      return;
    }

    if (value < 1 || value > 7 || !Number.isInteger(value)) {
      result.issues.push({
        type: 'format',
        severity: 'high',
        message: 'Likert scale value must be an integer between 1 and 7',
        field: 'response_value',
        suggestion: 'Choose from the provided scale options',
      });
      result.qualityScore -= 20;
    }

    // Check for neutral bias (always choosing middle values)
    if (value === 4) {
      result.warnings.push({
        type: 'pattern',
        message: 'Neutral response - consider if you have a stronger opinion',
        impact: 'minor',
      });
      result.qualityScore -= 5;
    }
  }

  private validateBinaryResponse(response: SurveyResponseDto, question: SurveyQuestion, result: ValidationResult): void {
    const value = response.response_value;
    
    if (typeof value !== 'boolean') {
      result.issues.push({
        type: 'format',
        severity: 'critical',
        message: 'Binary choice response must be true or false',
        field: 'response_value',
        suggestion: 'Select either "Yes" or "No"',
      });
    }
  }

  private validateMultipleChoiceResponse(response: SurveyResponseDto, question: SurveyQuestion, result: ValidationResult): void {
    const value = response.response_value;
    const options = question.options as string[];
    
    if (typeof value !== 'string') {
      result.issues.push({
        type: 'format',
        severity: 'critical',
        message: 'Multiple choice response must be a string',
        field: 'response_value',
      });
      return;
    }

    if (!options || !options.includes(value)) {
      result.issues.push({
        type: 'format',
        severity: 'high',
        message: 'Response must be one of the provided options',
        field: 'response_value',
        suggestion: 'Select from the available choices',
      });
      result.qualityScore -= 30;
    }

    // Check for "Other" or "I don't know" overuse
    if (value.toLowerCase().includes('other') || value.toLowerCase().includes("don't know")) {
      result.warnings.push({
        type: 'pattern',
        message: 'Consider if one of the specific options better represents your view',
        impact: 'minor',
      });
      result.qualityScore -= 3;
    }
  }

  private validateRankingResponse(response: SurveyResponseDto, question: SurveyQuestion, result: ValidationResult): void {
    const value = response.response_value;
    const options = question.options as string[];
    
    if (!Array.isArray(value)) {
      result.issues.push({
        type: 'format',
        severity: 'critical',
        message: 'Ranking response must be an array',
        field: 'response_value',
      });
      return;
    }

    if (!options || value.length !== options.length) {
      result.issues.push({
        type: 'format',
        severity: 'high',
        message: 'Ranking must include all options exactly once',
        field: 'response_value',
        suggestion: 'Rank all provided options',
      });
      result.qualityScore -= 25;
      return;
    }

    // Check if all options are included and unique
    const missingOptions = options.filter(opt => !value.includes(opt));
    const duplicateOptions = value.filter((item, index) => value.indexOf(item) !== index);
    
    if (missingOptions.length > 0 || duplicateOptions.length > 0) {
      result.issues.push({
        type: 'format',
        severity: 'high',
        message: 'All options must be ranked exactly once',
        field: 'response_value',
      });
      result.qualityScore -= 25;
    }
  }

  private validateSliderResponse(response: SurveyResponseDto, question: SurveyQuestion, result: ValidationResult): void {
    const value = response.response_value;
    const scale = question.scale as { min: number; max: number };
    
    if (typeof value !== 'number') {
      result.issues.push({
        type: 'format',
        severity: 'critical',
        message: 'Slider response must be a number',
        field: 'response_value',
      });
      return;
    }

    if (!scale || value < scale.min || value > scale.max) {
      result.issues.push({
        type: 'format',
        severity: 'high',
        message: `Slider value must be between ${scale?.min || 0} and ${scale?.max || 100}`,
        field: 'response_value',
      });
      result.qualityScore -= 20;
    }

    // Check for extreme values without confidence
    if ((value === scale?.min || value === scale?.max) && 
        response.confidence_level && response.confidence_level < 4) {
      result.warnings.push({
        type: 'quality',
        message: 'Extreme values with low confidence may indicate uncertainty',
        impact: 'moderate',
      });
      result.qualityScore -= 8;
    }
  }

  private validateTextResponse(response: SurveyResponseDto, question: SurveyQuestion, result: ValidationResult): void {
    const value = response.response_value;
    
    if (typeof value !== 'string') {
      result.issues.push({
        type: 'format',
        severity: 'critical',
        message: 'Text response must be a string',
        field: 'response_value',
      });
      return;
    }

    if (value.length === 0) {
      result.issues.push({
        type: 'format',
        severity: 'high',
        message: 'Text response cannot be empty',
        field: 'response_value',
        suggestion: 'Please provide a thoughtful response',
      });
      result.qualityScore -= 40;
      return;
    }

    if (value.length > 1000) {
      result.issues.push({
        type: 'format',
        severity: 'medium',
        message: 'Text response exceeds maximum length (1000 characters)',
        field: 'response_value',
        suggestion: 'Please shorten your response',
      });
      result.qualityScore -= 15;
    }

    // Quality checks for text responses
    this.validateTextQuality(value, result);
  }

  private validateTextQuality(text: string, result: ValidationResult): void {
    const wordCount = text.trim().split(/\s+/).length;
    
    // Too short
    if (wordCount < 3) {
      result.warnings.push({
        type: 'quality',
        message: 'Consider providing a more detailed response',
        impact: 'moderate',
      });
      result.qualityScore -= 10;
    }
    
    // Check for inappropriate content patterns
    const inappropriatePatterns = [
      /\b(hate|kill|die|stupid|idiot)\b/gi,
      /(.)\1{4,}/g, // Repeated characters
      /\b(test|testing|asdf|qwerty)\b/gi,
    ];
    
    let inappropriateCount = 0;
    inappropriatePatterns.forEach(pattern => {
      if (pattern.test(text)) {
        inappropriateCount++;
      }
    });
    
    if (inappropriateCount > 0) {
      result.flags.push({
        type: 'inappropriate',
        confidence: Math.min(inappropriateCount * 0.3, 1),
        reason: 'Response contains potentially inappropriate content',
      });
      result.qualityScore -= inappropriateCount * 15;
    }

    // Check for copy-paste or AI-generated content
    if (this.detectCopyPaste(text)) {
      result.flags.push({
        type: 'suspicious_timing',
        confidence: 0.7,
        reason: 'Response may be copy-pasted or AI-generated',
      });
      result.qualityScore -= 20;
    }
  }

  /**
   * Validate response timing for suspicious patterns
   */
  private validateResponseTiming(response: SurveyResponseDto, question: SurveyQuestion, result: ValidationResult): void {
    const completionTime = response.completion_time;
    const minTime = this.calculateMinimumResponseTime(question);
    const maxTime = minTime * 30; // 30x minimum is reasonable upper bound
    
    // Too fast (suspicious)
    if (completionTime < minTime) {
      const severity = completionTime < minTime * 0.3 ? 'high' : 'medium';
      result.issues.push({
        type: 'timing',
        severity,
        message: `Response completed unusually quickly (${completionTime}ms < ${minTime}ms expected minimum)`,
        field: 'completion_time',
        suggestion: 'Take time to carefully consider each question',
      });
      
      result.flags.push({
        type: 'suspicious_timing',
        confidence: Math.min((minTime - completionTime) / minTime, 1),
        reason: 'Response completed too quickly for thorough consideration',
      });
      
      result.qualityScore -= severity === 'high' ? 40 : 25;
    }
    
    // Too slow (possible distraction)
    if (completionTime > maxTime) {
      result.warnings.push({
        type: 'timing',
        message: `Response took unusually long (${Math.round(completionTime / 1000)}s) - consider if you were distracted`,
        impact: 'minor',
      });
      result.qualityScore -= 10;
    }
  }

  /**
   * Validate consistency with previous responses
   */
  private async validateResponseConsistency(
    response: SurveyResponseDto,
    question: SurveyQuestion,
    userHistory: any[],
    result: ValidationResult
  ): Promise<void> {
    // Find related questions (same category or ideology mapping)
    const relatedResponses = userHistory.filter(r => 
      r.question.category === question.category ||
      this.hasOverlappingIdeologyMapping(r.question.ideology_mapping, question.ideology_mapping)
    );
    
    if (relatedResponses.length === 0) return;
    
    // Check for logical consistency
    const inconsistencies = this.detectInconsistencies(response, question, relatedResponses);
    
    inconsistencies.forEach(inconsistency => {
      result.flags.push({
        type: 'inconsistent',
        confidence: inconsistency.confidence,
        reason: inconsistency.reason,
      });
      
      result.warnings.push({
        type: 'pattern',
        message: `Response may be inconsistent with previous answers: ${inconsistency.reason}`,
        impact: 'moderate',
      });
      
      result.qualityScore -= inconsistency.confidence * 15;
    });
  }

  /**
   * Detect suspicious response patterns
   */
  private detectSuspiciousPatterns(response: SurveyResponseDto, question: SurveyQuestion, result: ValidationResult): void {
    // Pattern 1: Always choosing extreme values
    if (question.type === 'LIKERT_SCALE' && (response.response_value === 1 || response.response_value === 7)) {
      result.flags.push({
        type: 'pattern_detected',
        confidence: 0.3,
        reason: 'Extreme value selected - check for response bias',
      });
    }
    
    // Pattern 2: Low confidence with definitive answers
    if (response.confidence_level && response.confidence_level <= 2) {
      if (question.type === 'BINARY_CHOICE' || 
          (question.type === 'LIKERT_SCALE' && (response.response_value <= 2 || response.response_value >= 6))) {
        result.warnings.push({
          type: 'pattern',
          message: 'Low confidence with definitive answer - consider if you\'re uncertain',
          impact: 'minor',
        });
        result.qualityScore -= 5;
      }
    }
    
    // Pattern 3: No text for text questions requiring elaboration
    if (question.type === 'TEXT_RESPONSE' && (!response.response_text || response.response_text.length < 10)) {
      result.warnings.push({
        type: 'quality',
        message: 'Consider providing more detailed explanation',
        impact: 'moderate',
      });
      result.qualityScore -= 12;
    }
  }

  // Helper methods
  private calculateMinimumResponseTime(question: SurveyQuestion): number {
    const baseTime = 2000; // 2 seconds minimum
    const questionLength = question.question.length;
    const complexityMultiplier = {
      'BINARY_CHOICE': 1,
      'LIKERT_SCALE': 1.2,
      'MULTIPLE_CHOICE': 1.5,
      'SLIDER': 1.3,
      'RANKING': 2,
      'TEXT_RESPONSE': 3,
    }[question.type] || 1;

    const readingTime = Math.max(questionLength * 50, 1000); // ~50ms per character, min 1s
    return Math.floor(baseTime + readingTime * complexityMultiplier);
  }

  private hasOverlappingIdeologyMapping(mapping1: any, mapping2: any): boolean {
    if (!mapping1 || !mapping2) return false;
    // Simple check for overlapping ideology axes
    const axes1 = mapping1.map((m: any) => m.axis);
    const axes2 = mapping2.map((m: any) => m.axis);
    return axes1.some((axis: string) => axes2.includes(axis));
  }

  private detectInconsistencies(response: SurveyResponseDto, question: SurveyQuestion, relatedResponses: any[]): Array<{confidence: number, reason: string}> {
    const inconsistencies: Array<{confidence: number, reason: string}> = [];
    
    // Example: Liberal economic views but conservative social views might be flagged for review
    // This is a simplified example - real implementation would be more sophisticated
    
    return inconsistencies;
  }

  private detectCopyPaste(text: string): boolean {
    // Simple heuristics for copy-paste detection
    const indicators = [
      text.includes('©'), // Copyright symbols
      text.includes('http'), // URLs
      /[A-Z]{3,}/.test(text), // Multiple consecutive capitals
      text.length > 500 && !/[.!?]/.test(text), // Long text without punctuation
    ];
    
    return indicators.filter(Boolean).length >= 2;
  }

  /**
   * Batch validate multiple responses
   */
  async validateResponseBatch(responses: SurveyResponseDto[], userId: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    for (const response of responses) {
      const question = await this.prisma.surveyQuestion.findUnique({
        where: { id: response.question_id },
      });
      
      if (!question) {
        results.push({
          isValid: false,
          qualityScore: 0,
          issues: [{
            type: 'format',
            severity: 'critical',
            message: 'Question not found',
            field: 'question_id',
          }],
          warnings: [],
          flags: [],
        });
        continue;
      }
      
      const result = await this.validateResponse(response, question);
      results.push(result);
    }
    
    return results;
  }
}
