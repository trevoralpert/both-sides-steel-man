/**
 * Rate Limiting Configuration
 * Provides rate limiting for API endpoints
 */

import { NextRequest } from 'next/server';

// Rate limit configurations
export const rateLimitConfig = {
  // API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit auth attempts
  },
  
  // Message sending
  messages: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute
  },
  
  // Survey submissions
  survey: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 survey submissions per hour
  },
};

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  config: { windowMs: number; max: number }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  let record = rateLimitStore.get(key);
  
  // Reset if window has expired
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }
  
  // Check if limit exceeded
  if (record.count >= config.max) {
    rateLimitStore.set(key, record);
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }
  
  // Increment counter
  record.count++;
  rateLimitStore.set(key, record);
  
  return {
    allowed: true,
    remaining: config.max - record.count,
    resetTime: record.resetTime,
  };
}

export function getRateLimitIdentifier(request: NextRequest): string {
  // Use IP address as identifier (consider user ID for authenticated requests)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return ip;
}

export function createRateLimitResponse(resetTime: number) {
  const resetTimeSeconds = Math.ceil((resetTime - Date.now()) / 1000);
  
  return new Response('Too Many Requests', {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': resetTimeSeconds.toString(),
      'X-RateLimit-Reset': resetTime.toString(),
    },
  });
}

export default {
  rateLimitConfig,
  checkRateLimit,
  getRateLimitIdentifier,
  createRateLimitResponse,
};