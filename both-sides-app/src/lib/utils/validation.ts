/**
 * Input Validation Utilities
 * Provides secure input validation and sanitization
 */

import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*d)(?=.*[@$!%*?&])[A-Za-zd@$!%*?&]/, 
    'Password must contain uppercase, lowercase, number, and special character');

export const userIdSchema = z.string().uuid('Invalid user ID format');
export const conversationIdSchema = z.string().min(1, 'Conversation ID required');

// Survey validation schemas
export const surveyResponseSchema = z.object({
  questionId: z.string().min(1, 'Question ID required'),
  value: z.number().int().min(1).max(5, 'Response must be 1-5'),
});

export const surveySubmissionSchema = z.object({
  responses: z.array(surveyResponseSchema).min(1, 'At least one response required'),
});

// Debate message validation
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message content required')
    .max(1000, 'Message too long')
    .refine(content => !/<script/i.test(content), 'Script tags not allowed'),
  conversationId: conversationIdSchema,
  type: z.enum(['message', 'typing', 'presence']),
});

// Sanitization functions
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[\0\x08\x09\x1a\n\r"'\\%_]/g, '');
}

// Rate limiting helpers
export function createRateLimitKey(identifier: string, action: string): string {
  return `rate_limit:${identifier}:${action}`;
}

// Validation middleware helper
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
}

export default {
  emailSchema,
  passwordSchema,
  userIdSchema,
  conversationIdSchema,
  surveyResponseSchema,
  surveySubmissionSchema,
  messageSchema,
  sanitizeHtml,
  sanitizeInput,
  createRateLimitKey,
  validateRequest,
};