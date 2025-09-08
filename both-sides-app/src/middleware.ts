import { checkRateLimit, getRateLimitIdentifier, createRateLimitResponse, rateLimitConfig } from './lib/utils/rate-limit';
import { sanitizeInput } from './lib/utils/validation';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/debates(.*)',
  '/onboarding(.*)',
]);

// Define public routes that are accessible without authentication
  const _isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)', // Allow webhook endpoints
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  // Security middleware
  const identifier = getRateLimitIdentifier(request);
  const path = request.nextUrl.pathname;
  
  // Apply rate limiting based on path
  let rateLimitResult;
  
  if (path.startsWith('/api/auth')) {
    rateLimitResult = checkRateLimit(identifier, rateLimitConfig.auth);
  } else if (path.startsWith('/api/messages')) {
    rateLimitResult = checkRateLimit(identifier, rateLimitConfig.messages);
  } else if (path.startsWith('/api/survey')) {
    rateLimitResult = checkRateLimit(identifier, rateLimitConfig.survey);
  } else if (path.startsWith('/api/')) {
    rateLimitResult = checkRateLimit(identifier, rateLimitConfig.api);
  }
  
  if (rateLimitResult && !rateLimitResult.allowed) {
    console.warn(`Rate limit exceeded for ${identifier} on ${path}`);
    return createRateLimitResponse(rateLimitResult.resetTime);
  }
  
  // Log security events
  if (path.startsWith('/api/')) {
    console.log(`API Request: ${request.method} ${path} from ${identifier}`);
  }

  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
