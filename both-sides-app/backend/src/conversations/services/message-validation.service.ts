import { Injectable } from '@nestjs/common';
import { MessageContentType } from '@prisma/client';
import { ValidationResult } from '../dto/validation-result.dto';

@Injectable()
export class MessageValidationService {
  private readonly profanityWords: string[] = [
    // Basic profanity list - would be expanded in production
    'damn', 'hell', // Add more as needed
  ];

  private readonly personalInfoPatterns = [
    /\b\d{3}-?\d{2}-?\d{4}\b/g, // SSN pattern
    /\b\d{10,11}\b/g, // Phone number pattern
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email pattern
  ];

  /**
   * Validate message content based on type and context
   */
  validateMessageContent(
    content: string,
    contentType: MessageContentType,
    conversationContext?: any,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic content validation
    if (!content || content.trim().length === 0) {
      errors.push('Message content cannot be empty');
      return ValidationResult.invalid(errors);
    }

    // Length validation
    if (content.length > 5000) {
      errors.push('Message content exceeds maximum length of 5000 characters');
    }

    // Content type specific validation
    switch (contentType) {
      case MessageContentType.TEXT:
        this.validateTextContent(content, errors, warnings);
        break;
      case MessageContentType.SYSTEM:
        // System messages have different validation rules
        break;
      case MessageContentType.MODERATION:
        // Moderation messages are pre-validated
        break;
      case MessageContentType.COACHING:
        // Coaching messages have specific formatting requirements
        break;
    }

    // Check for profanity
    const profanityCheck = this.checkProfanity(content);
    if (profanityCheck.containsProfanity) {
      warnings.push('Message contains potentially inappropriate language');
    }

    // Check for personal information
    const personalInfoCheck = this.checkPersonalInformation(content);
    if (personalInfoCheck.containsPersonalInfo) {
      errors.push('Message contains personal information which is not allowed');
    }

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(content);

    // Create validation result
    const isValid = errors.length === 0;
    const result = new ValidationResult(isValid, errors, warnings);
    
    result.metadata = {
      wordCount: content.trim().split(/\s+/).length,
      characterCount: content.length,
      readabilityScore: this.calculateReadabilityScore(content),
      containsProfanity: profanityCheck.containsProfanity,
      containsPersonalInfo: personalInfoCheck.containsPersonalInfo,
      qualityScore: qualityMetrics.overall,
    };

    return result;
  }

  /**
   * Validate reply relationships
   */
  validateReplyStructure(
    replyToId: string | undefined,
    conversationId: string,
  ): ValidationResult {
    // This would typically check database to ensure:
    // 1. Reply target exists
    // 2. Reply target is in same conversation
    // 3. Reply depth doesn't exceed limits
    // For now, just basic validation
    
    if (replyToId && replyToId.trim().length === 0) {
      return ValidationResult.invalid(['Invalid reply target ID']);
    }

    return ValidationResult.valid();
  }

  /**
   * Validate message metadata
   */
  validateMessageMetadata(metadata: any): ValidationResult {
    if (!metadata) {
      return ValidationResult.valid();
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate formatting options
    if (metadata.formatting) {
      // Check for excessive formatting
      const formatCount = Object.values(metadata.formatting).filter(Boolean).length;
      if (formatCount > 5) {
        warnings.push('Excessive text formatting detected');
      }
    }

    // Validate attachments
    if (metadata.attachments && Array.isArray(metadata.attachments)) {
      for (const attachment of metadata.attachments) {
        if (!attachment.url || !attachment.type) {
          errors.push('Invalid attachment structure');
        }
        
        if (attachment.size && attachment.size > 10 * 1024 * 1024) { // 10MB
          errors.push('Attachment size exceeds 10MB limit');
        }
      }

      if (metadata.attachments.length > 5) {
        errors.push('Maximum 5 attachments allowed per message');
      }
    }

    return errors.length === 0 
      ? ValidationResult.valid(warnings) 
      : ValidationResult.invalid(errors, warnings);
  }

  private validateTextContent(content: string, errors: string[], warnings: string[]): void {
    // Check for excessive capitalization
    const capitalRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capitalRatio > 0.7 && content.length > 20) {
      warnings.push('Message appears to be in all caps');
    }

    // Check for spam patterns
    const repeatedChars = /(.)\1{4,}/g;
    if (repeatedChars.test(content)) {
      warnings.push('Message contains repeated characters');
    }

    // Check for minimum meaningful content
    const words = content.trim().split(/\s+/);
    if (words.length < 2 && content.length < 10) {
      warnings.push('Message may be too short to be meaningful');
    }
  }

  private checkProfanity(content: string): { containsProfanity: boolean; matches: string[] } {
    const lowerContent = content.toLowerCase();
    const matches: string[] = [];

    for (const word of this.profanityWords) {
      if (lowerContent.includes(word)) {
        matches.push(word);
      }
    }

    return {
      containsProfanity: matches.length > 0,
      matches,
    };
  }

  private checkPersonalInformation(content: string): { containsPersonalInfo: boolean; patterns: string[] } {
    const matches: string[] = [];

    for (const pattern of this.personalInfoPatterns) {
      const patternMatches = content.match(pattern);
      if (patternMatches) {
        matches.push(...patternMatches);
      }
    }

    return {
      containsPersonalInfo: matches.length > 0,
      patterns: matches,
    };
  }

  private calculateQualityMetrics(content: string): { overall: number; factors: any } {
    const words = content.trim().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const factors = {
      length: Math.min(words.length / 20, 1), // Optimal around 20 words
      complexity: sentences.length > 0 ? words.length / sentences.length : 0, // Words per sentence
      punctuation: (content.match(/[.!?,:;]/g) || []).length / words.length,
    };

    // Simple weighted average
    const overall = (
      factors.length * 0.4 +
      Math.min(factors.complexity / 15, 1) * 0.3 +
      Math.min(factors.punctuation * 5, 1) * 0.3
    );

    return {
      overall: Math.max(0, Math.min(1, overall)),
      factors,
    };
  }

  private calculateReadabilityScore(content: string): number {
    const words = content.trim().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    // Simplified Flesch Reading Ease
    const score = 206.835 - (1.015 * (words.length / sentences.length)) - (84.6 * (syllables / words.length));
    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    if (word.endsWith('e')) count--;
    return Math.max(1, count);
  }
}
