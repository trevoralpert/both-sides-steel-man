import { z } from 'zod';

// Environment variable schema with validation
const envSchema = z.object({
  // App Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Database (Optional during development)
  DATABASE_URL: z.string().optional(),

  // Authentication (Clerk) - Optional during initial setup
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),

  // AI Services (OpenAI) - Optional during initial setup
  OPENAI_API_KEY: z.string().optional(),

  // Real-time (Ably) - Optional during initial setup
  NEXT_PUBLIC_ABLY_KEY: z.string().optional(),
  ABLY_SECRET_KEY: z.string().optional(),

  // Caching (Redis) - Optional during initial setup
  REDIS_URL: z.string().optional(),
  REDIS_TOKEN: z.string().optional(),

  // TimeBack Integration (Future)
  TIMEBACK_API_URL: z.string().optional(),
  TIMEBACK_API_KEY: z.string().optional(),
  TIMEBACK_WEBHOOK_SECRET: z.string().optional(),

  // Development & Debugging
  DEBUG: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  VERBOSE_LOGGING: z
    .string()
    .optional()
    .transform(val => val === 'true'),

  // Security (Optional during development)
  NEXTAUTH_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `❌ Invalid environment variables:\n${missingVars}\n\nPlease check your .env.local file.`
      );
    }
    throw error;
  }
};

// Export validated environment variables
export const env = parseEnv();

// Type for environment variables
export type Env = z.infer<typeof envSchema>;

// Helper function to check if required services are configured
export const checkRequiredServices = () => {
  const warnings: string[] = [];

  if (!env.DATABASE_URL) {
    warnings.push('DATABASE_URL not configured - database features disabled');
  }

  if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !env.CLERK_SECRET_KEY) {
    warnings.push('Clerk not configured - authentication features disabled');
  }

  if (!env.OPENAI_API_KEY) {
    warnings.push('OpenAI not configured - AI features disabled');
  }

  if (!env.REDIS_URL) {
    warnings.push('Redis not configured - caching features disabled');
  }

  if (warnings.length > 0 && env.DEBUG) {
    console.warn('⚠️  Service Configuration Warnings:');
    warnings.forEach(warning => console.warn(`   ${warning}`));
    console.warn('   Add credentials to .env.local to enable these features');
  }

  return warnings;
};

// Export individual environment groups for easier imports
export const appConfig = {
  nodeEnv: env.NODE_ENV,
  appUrl: env.NEXT_PUBLIC_APP_URL,
  debug: env.DEBUG,
  verboseLogging: env.VERBOSE_LOGGING,
};

export const dbConfig = {
  databaseUrl: env.DATABASE_URL,
};

export const authConfig = {
  clerkPublishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  clerkSecretKey: env.CLERK_SECRET_KEY,
  nextAuthSecret: env.NEXTAUTH_SECRET,
  jwtSecret: env.JWT_SECRET,
};

export const aiConfig = {
  openaiApiKey: env.OPENAI_API_KEY,
};

export const realtimeConfig = {
  ablyKey: env.NEXT_PUBLIC_ABLY_KEY,
  ablySecretKey: env.ABLY_SECRET_KEY,
};

export const cacheConfig = {
  redisUrl: env.REDIS_URL,
  redisToken: env.REDIS_TOKEN,
};

export const timebackConfig = {
  apiUrl: env.TIMEBACK_API_URL,
  apiKey: env.TIMEBACK_API_KEY,
  webhookSecret: env.TIMEBACK_WEBHOOK_SECRET,
};
