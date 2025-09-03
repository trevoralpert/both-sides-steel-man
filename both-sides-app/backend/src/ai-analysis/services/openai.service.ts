import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CacheService } from '../../common/services/cache.service';

/**
 * OpenAI Configuration Options
 */
export interface OpenAIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

/**
 * OpenAI Response with metadata
 */
export interface AIResponse {
  content: string;
  tokensUsed: number;
  processingTime: number;
  model: string;
  cached: boolean;
}

/**
 * Core OpenAI service for Phase 7 AI Analysis Engine
 * Handles OpenAI API integration with caching, error handling, and usage tracking
 */
@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;
  private readonly apiUsageCache = new Map<string, number>();
  private readonly defaultConfig: Required<OpenAIConfig> = {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 2000,
    timeout: 60000, // 60 seconds
    retries: 3,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.initializeOpenAI();
  }

  /**
   * Initialize OpenAI API client with configuration
   */
  private initializeOpenAI(): void {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
      throw new HttpException(
        'AI analysis service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey,
        timeout: this.defaultConfig.timeout,
        maxRetries: this.defaultConfig.retries,
      });
      
      this.logger.log('OpenAI API client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI API client', error.stack);
      throw new HttpException(
        'AI analysis service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Generate AI completion using OpenAI ChatGPT
   */
  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    config: Partial<OpenAIConfig> = {},
    cacheKey?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Check cache first if cache key provided
      if (cacheKey) {
        const cachedResult = await this.getCachedResult(cacheKey);
        if (cachedResult) {
          return {
            ...cachedResult,
            cached: true,
            processingTime: Date.now() - startTime,
          };
        }
      }

      // Check API usage limits
      await this.checkApiUsageLimits();

      // Merge config with defaults
      const finalConfig = { ...this.defaultConfig, ...config };

      // Generate completion
      const completion = await this.openai.chat.completions.create({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
      });

      const result: AIResponse = {
        content: completion.choices[0].message.content || '',
        tokensUsed: completion.usage?.total_tokens || 0,
        processingTime: Date.now() - startTime,
        model: finalConfig.model,
        cached: false,
      };

      // Cache the result if cache key provided
      if (cacheKey && result.content) {
        await this.cacheResult(cacheKey, result);
      }

      // Track API usage
      this.trackApiUsage(result.tokensUsed);

      this.logger.debug(`Generated AI completion in ${result.processingTime}ms using ${result.tokensUsed} tokens`);
      
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`OpenAI API call failed after ${processingTime}ms`, error.stack);

      if (error.status === 429) {
        throw new HttpException(
          'AI service rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (error.status === 401) {
        throw new HttpException(
          'AI service authentication failed',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (error.code === 'context_length_exceeded') {
        throw new HttpException(
          'Input text too long for AI analysis',
          HttpStatus.REQUEST_ENTITY_TOO_LARGE,
        );
      }

      throw new HttpException(
        'AI analysis service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Generate structured JSON response using OpenAI
   */
  async generateStructuredResponse<T>(
    systemPrompt: string,
    userPrompt: string,
    jsonSchema: any,
    config: Partial<OpenAIConfig> = {},
    cacheKey?: string
  ): Promise<T & { metadata: { tokensUsed: number; processingTime: number; cached: boolean } }> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (cacheKey) {
        const cachedResult = await this.getCachedResult(cacheKey);
        if (cachedResult) {
          return {
            ...JSON.parse(cachedResult.content),
            metadata: {
              tokensUsed: cachedResult.tokensUsed,
              processingTime: Date.now() - startTime,
              cached: true,
            },
          };
        }
      }

      // Check API usage limits
      await this.checkApiUsageLimits();

      // Merge config with defaults
      const finalConfig = { ...this.defaultConfig, ...config };

      // Add JSON schema instructions to system prompt
      const structuredSystemPrompt = `${systemPrompt}

IMPORTANT: You must respond with a valid JSON object that matches this exact schema:
${JSON.stringify(jsonSchema, null, 2)}

Ensure your response is properly formatted JSON with no additional text or explanations.`;

      const completion = await this.openai.chat.completions.create({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: structuredSystemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content || '{}';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const processingTime = Date.now() - startTime;

      // Parse and validate JSON response
      let parsedResponse: T;
      try {
        parsedResponse = JSON.parse(content);
      } catch (parseError) {
        this.logger.error('Failed to parse JSON response from OpenAI', parseError);
        throw new HttpException(
          'AI service returned invalid response format',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const result = {
        ...parsedResponse,
        metadata: {
          tokensUsed,
          processingTime,
          cached: false,
        },
      };

      // Cache the result
      if (cacheKey) {
        await this.cacheResult(cacheKey, {
          content,
          tokensUsed,
          processingTime,
          model: finalConfig.model,
          cached: false,
        });
      }

      // Track API usage
      this.trackApiUsage(tokensUsed);

      this.logger.debug(`Generated structured AI response in ${processingTime}ms using ${tokensUsed} tokens`);
      
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Structured OpenAI API call failed after ${processingTime}ms`, error.stack);
      throw error; // Re-throw after logging
    }
  }

  /**
   * Generate embeddings for text using OpenAI
   */
  async generateEmbedding(text: string, cacheKey?: string): Promise<number[]> {
    try {
      // Check cache first
      if (cacheKey) {
        const cachedEmbedding = await this.cacheService.get(`embedding:${cacheKey}`);
        if (cachedEmbedding) {
          return cachedEmbedding;
        }
      }

      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      const embedding = response.data[0].embedding;

      // Cache the embedding
      if (cacheKey) {
        await this.cacheService.set(`embedding:${cacheKey}`, embedding, 86400000); // 24 hours
      }

      // Track usage
      this.trackApiUsage(response.usage.total_tokens);

      return embedding;

    } catch (error) {
      this.logger.error('Failed to generate embedding', error.stack);
      throw new HttpException(
        'Failed to generate text embedding',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check API usage limits
   */
  private async checkApiUsageLimits(): Promise<void> {
    const today = new Date().toDateString();
    const todayUsage = this.apiUsageCache.get(today) || 0;
    const dailyLimit = this.configService.get<number>('OPENAI_DAILY_TOKEN_LIMIT', 100000);

    if (todayUsage >= dailyLimit) {
      throw new HttpException(
        'Daily AI API usage limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Track API usage for rate limiting
   */
  private trackApiUsage(tokensUsed: number): void {
    const today = new Date().toDateString();
    const currentUsage = this.apiUsageCache.get(today) || 0;
    this.apiUsageCache.set(today, currentUsage + tokensUsed);
  }

  /**
   * Get cached result
   */
  private async getCachedResult(cacheKey: string): Promise<AIResponse | null> {
    try {
      const cached = await this.cacheService.get(`ai:${cacheKey}`);
      return cached || null;
    } catch (error) {
      this.logger.warn('Cache retrieval failed', error.message);
      return null;
    }
  }

  /**
   * Cache AI result
   */
  private async cacheResult(cacheKey: string, result: AIResponse): Promise<void> {
    try {
      // Cache for 1 hour by default
      await this.cacheService.set(`ai:${cacheKey}`, result, 3600000);
    } catch (error) {
      this.logger.warn('Failed to cache AI result', error.message);
      // Don't throw - caching is optional
    }
  }

  /**
   * Build cache key for AI requests
   */
  buildCacheKey(systemPrompt: string, userPrompt: string, config: Partial<OpenAIConfig> = {}): string {
    const combinedPrompt = `${systemPrompt}|${userPrompt}|${JSON.stringify(config)}`;
    return this.hashString(combinedPrompt);
  }

  /**
   * Hash string for cache key generation
   */
  private hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Get API usage statistics
   */
  getUsageStats(): { today: number; limit: number; remaining: number } {
    const today = new Date().toDateString();
    const todayUsage = this.apiUsageCache.get(today) || 0;
    const dailyLimit = this.configService.get<number>('OPENAI_DAILY_TOKEN_LIMIT', 100000);

    return {
      today: todayUsage,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - todayUsage),
    };
  }

  /**
   * Health check for OpenAI service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Simple test completion to verify API connectivity
      const testResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test connection. Respond with "OK".' }],
        max_tokens: 10,
        temperature: 0,
      });

      const usageStats = this.getUsageStats();

      return {
        status: 'healthy',
        details: {
          model: 'gpt-4o-mini',
          tokensUsed: testResponse.usage?.total_tokens || 0,
          usageStats,
          lastCheck: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          lastCheck: new Date().toISOString(),
        },
      };
    }
  }
}
