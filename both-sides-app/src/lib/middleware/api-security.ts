/**
 * API Security Middleware
 * Comprehensive security middleware for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { checkRateLimit, getRateLimitIdentifier, createRateLimitResponse, rateLimitConfig } from '../utils/rate-limit';
import { sanitizeInput } from '../utils/validation';

export interface SecurityConfig {
  requireAuth?: boolean;
  allowedRoles?: string[];
  rateLimit?: keyof typeof rateLimitConfig;
  validateInput?: boolean;
  logRequests?: boolean;
  allowedOrigins?: string[];
  requireHttps?: boolean;
}

export class ApiSecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    this.config = {
      requireAuth: true,
      allowedRoles: [],
      rateLimit: 'api',
      validateInput: true,
      logRequests: true,
      allowedOrigins: [],
      requireHttps: process.env.NODE_ENV === 'production',
      ...config
    };
  }

  async handle(request: NextRequest): Promise<NextResponse | null> {
    try {
      // 1. HTTPS enforcement
      if (this.config.requireHttps && !this.isHttps(request)) {
        return this.createSecurityResponse('HTTPS required', 426);
      }

      // 2. CORS validation
      if (this.config.allowedOrigins && this.config.allowedOrigins.length > 0) {
        const corsResult = this.validateCors(request);
        if (!corsResult.allowed) {
          return this.createSecurityResponse('CORS policy violation', 403);
        }
      }

      // 3. Rate limiting
      if (this.config.rateLimit) {
        const rateLimitResult = await this.applyRateLimit(request);
        if (!rateLimitResult.allowed) {
          return createRateLimitResponse(rateLimitResult.resetTime);
        }
      }

      // 4. Authentication check
      if (this.config.requireAuth) {
        const authResult = await this.validateAuthentication(request);
        if (!authResult.authenticated) {
          return this.createSecurityResponse('Authentication required', 401);
        }

        // 5. Role-based authorization
        if (this.config.allowedRoles && this.config.allowedRoles.length > 0) {
          const authzResult = this.validateAuthorization(authResult.user, this.config.allowedRoles);
          if (!authzResult.authorized) {
            return this.createSecurityResponse('Insufficient permissions', 403);
          }
        }
      }

      // 6. Input validation and sanitization
      if (this.config.validateInput && request.method !== 'GET') {
        await this.validateAndSanitizeInput(request);
      }

      // 7. Security logging
      if (this.config.logRequests) {
        this.logSecurityEvent(request, 'API_REQUEST');
      }

      // All security checks passed
      return null;

    } catch (error) {
      console.error('API Security middleware error:', error);
      this.logSecurityEvent(request, 'SECURITY_ERROR', { error: error.message });
      return this.createSecurityResponse('Security validation failed', 500);
    }
  }

  private isHttps(request: NextRequest): boolean {
    const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol;
    return protocol === 'https:';
  }

  private validateCors(request: NextRequest): { allowed: boolean; origin?: string } {
    const origin = request.headers.get('origin');
    
    if (!origin) {
      // Allow same-origin requests
      return { allowed: true };
    }

    const allowed = this.config.allowedOrigins!.includes(origin) || 
                   this.config.allowedOrigins!.includes('*');

    return { allowed, origin };
  }

  private async applyRateLimit(request: NextRequest): Promise<{ allowed: boolean; resetTime: number }> {
    const identifier = getRateLimitIdentifier(request);
    const config = rateLimitConfig[this.config.rateLimit!];
    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
      this.logSecurityEvent(request, 'RATE_LIMIT_EXCEEDED', {
        identifier,
        limit: config.max,
        window: config.windowMs
      });
    }

    return {
      allowed: result.allowed,
      resetTime: result.resetTime
    };
  }

  private async validateAuthentication(request: NextRequest): Promise<{ authenticated: boolean; user?: any }> {
    try {
      const { userId, user } = getAuth(request);
      
      if (!userId) {
        this.logSecurityEvent(request, 'AUTH_FAILED', { reason: 'No user ID' });
        return { authenticated: false };
      }

      return { authenticated: true, user: { id: userId, ...user } };
    } catch (error) {
      this.logSecurityEvent(request, 'AUTH_ERROR', { error: error.message });
      return { authenticated: false };
    }
  }

  private validateAuthorization(user: any, allowedRoles: string[]): { authorized: boolean } {
    if (!user || !user.publicMetadata || !user.publicMetadata.role) {
      return { authorized: false };
    }

    const userRole = user.publicMetadata.role;
    const authorized = allowedRoles.includes(userRole) || allowedRoles.includes('*');

    if (!authorized) {
      this.logSecurityEvent(null, 'AUTHZ_FAILED', {
        userId: user.id,
        userRole,
        requiredRoles: allowedRoles
      });
    }

    return { authorized };
  }

  private async validateAndSanitizeInput(request: NextRequest): Promise<void> {
    try {
      const contentType = request.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const body = await request.json();
        this.sanitizeObject(body);
        
        // Check for common injection patterns
        const bodyString = JSON.stringify(body);
        if (this.detectInjectionPatterns(bodyString)) {
          this.logSecurityEvent(request, 'INJECTION_ATTEMPT', { body: bodyString.substring(0, 200) });
          throw new Error('Potentially malicious input detected');
        }
      }
    } catch (error) {
      if (error.message.includes('malicious')) {
        throw error;
      }
      // Ignore JSON parsing errors for non-JSON content
    }
  }

  private sanitizeObject(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeInput(obj[key]);
      } else if (typeof obj[key] === 'object') {
        this.sanitizeObject(obj[key]);
      }
    }
  }

  private detectInjectionPatterns(input: string): boolean {
    const patterns = [
      /<script[^>]*>.*?<\/script>/gi,  // Script tags
      /javascript:/gi,                 // JavaScript protocol
      /on\w+\s*=/gi,                  // Event handlers
      /eval\s*\(/gi,                  // Eval function
      /union\s+select/gi,             // SQL injection
      /drop\s+table/gi,               // SQL injection
      /insert\s+into/gi,              // SQL injection
      /delete\s+from/gi,              // SQL injection
      /\$\{.*\}/g,                    // Template injection
      /\{\{.*\}\}/g                   // Template injection
    ];

    return patterns.some(pattern => pattern.test(input));
  }

  private logSecurityEvent(request: NextRequest | null, event: string, data: any = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ip: request ? getRateLimitIdentifier(request) : 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown',
      path: request?.nextUrl.pathname || 'unknown',
      method: request?.method || 'unknown',
      ...data
    };

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to logging service (e.g., DataDog, LogRocket, etc.)
      console.log('SECURITY_EVENT:', JSON.stringify(logEntry));
    } else {
      console.log('🛡️ Security Event:', logEntry);
    }
  }

  private createSecurityResponse(message: string, status: number): NextResponse {
    this.logSecurityEvent(null, 'SECURITY_RESPONSE', { message, status });
    
    return new NextResponse(
      JSON.stringify({ 
        error: message, 
        timestamp: new Date().toISOString() 
      }),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          'X-Security-Response': 'true'
        }
      }
    );
  }
}

// Predefined security configurations
export const securityConfigs = {
  // Public endpoints (no auth required)
  public: {
    requireAuth: false,
    rateLimit: 'api',
    validateInput: true,
    logRequests: true
  },

  // Standard authenticated endpoints
  authenticated: {
    requireAuth: true,
    rateLimit: 'api',
    validateInput: true,
    logRequests: true
  },

  // Teacher-only endpoints
  teacherOnly: {
    requireAuth: true,
    allowedRoles: ['teacher', 'admin'],
    rateLimit: 'api',
    validateInput: true,
    logRequests: true
  },

  // Admin-only endpoints
  adminOnly: {
    requireAuth: true,
    allowedRoles: ['admin'],
    rateLimit: 'api',
    validateInput: true,
    logRequests: true
  },

  // High-frequency endpoints (messages, real-time)
  realtime: {
    requireAuth: true,
    rateLimit: 'messages',
    validateInput: true,
    logRequests: false // Reduce log noise for high-frequency endpoints
  },

  // Authentication endpoints
  auth: {
    requireAuth: false,
    rateLimit: 'auth',
    validateInput: true,
    logRequests: true,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || []
  },

  // Survey endpoints
  survey: {
    requireAuth: true,
    rateLimit: 'survey',
    validateInput: true,
    logRequests: true
  }
} as const;

// Helper function to create middleware with specific config
export function createApiSecurityMiddleware(configName: keyof typeof securityConfigs) {
  return new ApiSecurityMiddleware(securityConfigs[configName]);
}

// Helper function to apply security to API route
export async function withApiSecurity(
  request: NextRequest,
  configName: keyof typeof securityConfigs,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const middleware = createApiSecurityMiddleware(configName);
  const securityResult = await middleware.handle(request);
  
  if (securityResult) {
    // Security check failed
    return securityResult;
  }
  
  // Security checks passed, continue to handler
  return handler(request);
}

export default ApiSecurityMiddleware;
