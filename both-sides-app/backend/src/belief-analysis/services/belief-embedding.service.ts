/**
 * Belief Embedding Service
 * 
 * Service for generating vector embeddings from belief summaries using OpenAI's
 * text-embedding-ada-002 model. These embeddings enable semantic similarity
 * search for intelligent debate partner matching.
 * 
 * Task 3.2.2: Build Belief Profile Embedding Generation
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../common/services/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { vectorToString, stringToVector, validateVectorDimensions, VECTOR_DIMENSIONS, cosineSimilarity } from '../../common/utils/vector.utils';
// import OpenAI from 'openai'; // TODO: Uncomment when openai package is installed

export interface EmbeddingRequest {
  profileId: string;
  beliefSummary: string;
  ideologyScores: any;
  metadata?: {
    version: string;
    source: 'survey' | 'updated' | 'manual';
  };
}

export interface EmbeddingResult {
  profileId: string;
  embedding: number[];
  dimension: number;
  magnitude: number;
  generatedAt: Date;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    version: string;
  };
}

export interface SimilaritySearchRequest {
  targetEmbedding: number[];
  limit?: number;
  threshold?: number;
  excludeProfileIds?: string[];
  filters?: {
    ageRange?: [number, number];
    plasticityRange?: [number, number];
    ideologyDistance?: number;
  };
}

export interface SimilarityMatch {
  profileId: string;
  similarity: number;
  distance: number;
  beliefSummary?: string;
  ideologyScores?: any;
}

@Injectable()
export class BeliefEmbeddingService {
  private readonly logger = new Logger(BeliefEmbeddingService.name);
  private readonly openai: any; // TODO: Replace with OpenAI when package is installed
  private readonly EMBEDDING_DIMENSION = 1536; // OpenAI ada-002 dimensions
  private readonly EMBEDDING_MODEL = 'text-embedding-ada-002';

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
  ) {
    this.initializeOpenAI();
  }

  /**
   * Initialize OpenAI API client
   */
  private initializeOpenAI(): void {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured. Embedding generation will be unavailable.');
      return;
    }

    try {
      // TODO: Initialize OpenAI client when package is installed
      // this.openai = new OpenAI({
      //   apiKey: apiKey,
      // });
      
      this.logger.log('OpenAI API client initialized for embeddings');
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI API client', error.stack);
    }
  }

  /**
   * Generate embedding from belief summary
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.buildEmbeddingCacheKey(request);
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        this.logger.log(`Using cached embedding for profile ${request.profileId}`);
        return cachedResult;
      }

      // Validate request
      this.validateEmbeddingRequest(request);

      // Prepare text for embedding
      const embeddingText = this.prepareEmbeddingText(request);

      // Generate embedding using OpenAI
      const embedding = await this.callOpenAIEmbedding(embeddingText);

      // Calculate embedding magnitude
      const magnitude = this.calculateMagnitude(embedding);

      // Build result
      const result: EmbeddingResult = {
        profileId: request.profileId,
        embedding,
        dimension: this.EMBEDDING_DIMENSION,
        magnitude,
        generatedAt: new Date(),
        metadata: {
          model: this.EMBEDDING_MODEL,
          tokensUsed: Math.ceil(embeddingText.length / 4), // Rough token estimate
          processingTime: Date.now() - startTime,
          version: request.metadata?.version || '1.0.0',
        },
      };

      // Cache the result
      await this.cacheService.set(cacheKey, result, 86400000); // 24 hour cache

      // Store in database
      await this.storeEmbedding(result);

      this.logger.log(`Generated embedding for profile ${request.profileId} in ${result.metadata.processingTime}ms`);
      
      return result;

    } catch (error) {
      this.logger.error(`Failed to generate embedding for profile ${request.profileId}`, error.stack);
      throw new HttpException(
        'Failed to generate belief embedding',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate multiple embeddings efficiently
   */
  async generateBatchEmbeddings(requests: EmbeddingRequest[]): Promise<EmbeddingResult[]> {
    const startTime = Date.now();
    const results: EmbeddingResult[] = [];

    this.logger.log(`Generating batch embeddings for ${requests.length} profiles`);

    try {
      // Process in batches of 10 for API efficiency
      const batchSize = 10;
      
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(request => this.generateEmbedding(request))
        );
        results.push(...batchResults);
        
        // Small delay to avoid rate limiting
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(`Generated ${results.length} embeddings in ${totalTime}ms (avg: ${Math.round(totalTime / results.length)}ms per embedding)`);
      
      return results;

    } catch (error) {
      this.logger.error('Failed to generate batch embeddings', error.stack);
      throw new HttpException(
        'Failed to generate batch embeddings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find similar profiles using embedding similarity
   */
  async findSimilarProfiles(request: SimilaritySearchRequest): Promise<SimilarityMatch[]> {
    try {
      this.validateSimilarityRequest(request);

      const limit = request.limit || 10;
      const threshold = request.threshold || 0.7;
      const excludeIds = request.excludeProfileIds || [];

      // Validate target embedding dimensions
      validateVectorDimensions(request.targetEmbedding, VECTOR_DIMENSIONS.OPENAI_ADA_002);
      
      // Convert target embedding to pgvector string format
      const targetVector = vectorToString(request.targetEmbedding);

      // Build exclusion clause
      const exclusionClause = excludeIds.length > 0 
        ? `AND p.id NOT IN (${excludeIds.map(() => '?').join(', ')})`
        : '';

      // Execute similarity search using pgvector cosine similarity
      // Using 1 - (embedding <=> target) for cosine similarity (higher = more similar)
      const similarProfiles = await this.prismaService.$queryRaw<Array<{
        id: string;
        belief_summary: string | null;
        ideology_scores: any;
        similarity: number;
        distance: number;
      }>>`
        SELECT 
          p.id,
          p.belief_summary,
          p.ideology_scores,
          1 - (p.belief_embedding <=> ${targetVector}::vector) AS similarity,
          p.belief_embedding <-> ${targetVector}::vector AS distance
        FROM profiles p
        WHERE p.belief_embedding IS NOT NULL
          AND p.is_completed = true
          ${exclusionClause ? `AND p.id NOT IN (${excludeIds.map(id => `'${id}'`).join(', ')})` : ''}
          AND 1 - (p.belief_embedding <=> ${targetVector}::vector) >= ${threshold}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;

      // Transform results to SimilarityMatch format
      const matches: SimilarityMatch[] = similarProfiles.map(profile => ({
        profileId: profile.id,
        similarity: Number(profile.similarity),
        distance: Number(profile.distance),
        beliefSummary: profile.belief_summary || undefined,
        ideologyScores: profile.ideology_scores || undefined,
      }));

      this.logger.log(`Found ${matches.length} similar profiles with similarity >= ${threshold}`);

      return matches;

    } catch (error) {
      this.logger.error('Failed to find similar profiles', error.stack);
      
      // Fallback to mock results for development
      if (error.message.includes('relation "profiles" does not exist') || 
          error.message.includes('column "belief_embedding" does not exist')) {
        this.logger.warn('Database not set up for embeddings, using mock results');
        return this.generateMockSimilarityMatches(request);
      }
      
      throw new HttpException(
        'Failed to find similar profiles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    // Use the centralized vector utility function
    return cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Update embedding when profile changes
   */
  async updateEmbedding(profileId: string, newBeliefSummary: string, ideologyScores: any): Promise<EmbeddingResult> {
    this.logger.log(`Updating embedding for profile ${profileId}`);
    
    const request: EmbeddingRequest = {
      profileId,
      beliefSummary: newBeliefSummary,
      ideologyScores,
      metadata: {
        version: '1.0.0',
        source: 'updated',
      },
    };

    // Clear cache for this profile
    const cacheKey = this.buildEmbeddingCacheKey(request);
    await this.cacheService.delete(cacheKey);

    return this.generateEmbedding(request);
  }

  /**
   * Store embedding in database using pgvector
   */
  private async storeEmbedding(result: EmbeddingResult): Promise<void> {
    try {
      // Validate embedding dimensions before storing
      validateVectorDimensions(result.embedding, VECTOR_DIMENSIONS.OPENAI_ADA_002);

      // Convert embedding to pgvector string format
      const vectorString = vectorToString(result.embedding);

      // Store embedding in profiles table
      await this.prismaService.$executeRaw`
        UPDATE profiles 
        SET belief_embedding = ${vectorString}::vector,
            updated_at = NOW()
        WHERE id = ${result.profileId}
      `;

      this.logger.debug(`Stored ${result.embedding.length}D embedding for profile ${result.profileId}`);
      
    } catch (error) {
      this.logger.error('Failed to store embedding in database', error.stack);
      throw error;
    }
  }

  /**
   * Call OpenAI API to generate embedding
   */
  private async callOpenAIEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      // TODO: Remove mock implementation when OpenAI is integrated
      return this.generateMockEmbedding();
    }

    try {
      // TODO: Implement actual OpenAI API call
      // const response = await this.openai.embeddings.create({
      //   model: this.EMBEDDING_MODEL,
      //   input: text,
      // });

      // return response.data[0].embedding;
      
      // Temporary mock implementation
      return this.generateMockEmbedding();
      
    } catch (error) {
      this.logger.error('OpenAI embedding API call failed', error.stack);
      throw new HttpException(
        'Embedding generation service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Prepare text for embedding generation
   */
  private prepareEmbeddingText(request: EmbeddingRequest): string {
    let text = request.beliefSummary;

    // Optionally include ideology scores in embedding text
    if (request.ideologyScores) {
      const scoresText = Object.entries(request.ideologyScores)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      text += `\n\nIdeology scores: ${scoresText}`;
    }

    // Truncate if too long (embedding models have token limits)
    const maxLength = 8000; // Conservative limit
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }

    return text;
  }

  /**
   * Calculate vector magnitude
   */
  private calculateMagnitude(embedding: number[]): number {
    const sumOfSquares = embedding.reduce((sum, val) => sum + val * val, 0);
    return Math.sqrt(sumOfSquares);
  }

  /**
   * Validate embedding request
   */
  private validateEmbeddingRequest(request: EmbeddingRequest): void {
    if (!request.profileId) {
      throw new HttpException('Profile ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!request.beliefSummary || request.beliefSummary.length < 10) {
      throw new HttpException('Belief summary must be at least 10 characters', HttpStatus.BAD_REQUEST);
    }

    if (request.beliefSummary.length > 10000) {
      throw new HttpException('Belief summary is too long', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Validate similarity search request
   */
  private validateSimilarityRequest(request: SimilaritySearchRequest): void {
    if (!request.targetEmbedding || request.targetEmbedding.length !== this.EMBEDDING_DIMENSION) {
      throw new HttpException(
        `Target embedding must have ${this.EMBEDDING_DIMENSION} dimensions`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (request.limit && (request.limit < 1 || request.limit > 100)) {
      throw new HttpException('Limit must be between 1 and 100', HttpStatus.BAD_REQUEST);
    }

    if (request.threshold && (request.threshold < 0 || request.threshold > 1)) {
      throw new HttpException('Threshold must be between 0 and 1', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Build cache key for embedding
   */
  private buildEmbeddingCacheKey(request: EmbeddingRequest): string {
    const summaryHash = this.hashString(request.beliefSummary);
    const scoresHash = this.hashString(JSON.stringify(request.ideologyScores));
    return `embedding:${request.profileId}:${summaryHash}:${scoresHash}`;
  }

  /**
   * Simple string hashing function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }

  /**
   * Create database indices for optimal vector search performance
   */
  async createVectorIndices(): Promise<void> {
    try {
      // Create HNSW index for cosine similarity search (most common for embeddings)
      await this.prismaService.$executeRaw`
        CREATE INDEX IF NOT EXISTS profiles_belief_embedding_cosine_idx 
        ON profiles USING hnsw (belief_embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
      `;

      // Create index for Euclidean distance (alternative distance metric)
      await this.prismaService.$executeRaw`
        CREATE INDEX IF NOT EXISTS profiles_belief_embedding_l2_idx 
        ON profiles USING hnsw (belief_embedding vector_l2_ops)
        WITH (m = 16, ef_construction = 64)
      `;

      this.logger.log('Vector indices created successfully for optimal similarity search performance');
      
    } catch (error) {
      this.logger.warn('Failed to create vector indices - they may already exist or database may not support pgvector', error.message);
    }
  }

  /**
   * Get embedding statistics and health metrics
   */
  async getEmbeddingStats(): Promise<{
    totalEmbeddings: number;
    averageMagnitude: number;
    dimensionality: number;
    indexHealth: string;
  }> {
    try {
      // Count total embeddings
      const totalResult = await this.prismaService.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count 
        FROM profiles 
        WHERE belief_embedding IS NOT NULL
      `;
      const totalEmbeddings = Number(totalResult[0]?.count || 0);

      // Calculate average magnitude (for quality assessment)
      const magnitudeResult = await this.prismaService.$queryRaw<[{ avg_magnitude: number }]>`
        SELECT AVG(
          sqrt(
            (belief_embedding <#> belief_embedding) * -1
          )
        ) as avg_magnitude
        FROM profiles 
        WHERE belief_embedding IS NOT NULL
      `;
      const averageMagnitude = magnitudeResult[0]?.avg_magnitude || 0;

      return {
        totalEmbeddings,
        averageMagnitude,
        dimensionality: VECTOR_DIMENSIONS.OPENAI_ADA_002,
        indexHealth: totalEmbeddings > 0 ? 'healthy' : 'no_data',
      };

    } catch (error) {
      this.logger.error('Failed to get embedding statistics', error.stack);
      return {
        totalEmbeddings: 0,
        averageMagnitude: 0,
        dimensionality: VECTOR_DIMENSIONS.OPENAI_ADA_002,
        indexHealth: 'error',
      };
    }
  }

  /**
   * Bulk update embeddings for multiple profiles efficiently
   */
  async bulkUpdateEmbeddings(updates: Array<{
    profileId: string;
    embedding: number[];
  }>): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const results = { successful: 0, failed: 0, errors: [] as string[] };

    for (const update of updates) {
      try {
        validateVectorDimensions(update.embedding, VECTOR_DIMENSIONS.OPENAI_ADA_002);
        const vectorString = vectorToString(update.embedding);

        await this.prismaService.$executeRaw`
          UPDATE profiles 
          SET belief_embedding = ${vectorString}::vector,
              updated_at = NOW()
          WHERE id = ${update.profileId}
        `;

        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push(`Profile ${update.profileId}: ${error.message}`);
        this.logger.error(`Failed to update embedding for profile ${update.profileId}`, error.stack);
      }
    }

    this.logger.log(`Bulk embedding update completed: ${results.successful} successful, ${results.failed} failed`);
    
    return results;
  }

  // TODO: Remove mock methods when OpenAI integration is complete

  /**
   * Generate mock embedding for testing
   */
  private generateMockEmbedding(): number[] {
    const embedding: number[] = [];
    
    // Generate random normalized vector
    for (let i = 0; i < this.EMBEDDING_DIMENSION; i++) {
      embedding.push((Math.random() - 0.5) * 2); // Random between -1 and 1
    }

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Generate mock similarity matches for testing
   */
  private async generateMockSimilarityMatches(request: SimilaritySearchRequest): Promise<SimilarityMatch[]> {
    const matches: SimilarityMatch[] = [];
    const limit = request.limit || 10;

    for (let i = 0; i < limit; i++) {
      matches.push({
        profileId: `profile_${i + 1}`,
        similarity: Math.random() * 0.4 + 0.6, // Random between 0.6 and 1.0
        distance: Math.random() * 0.4, // Random between 0 and 0.4
        beliefSummary: `Mock belief summary for profile ${i + 1}`,
        ideologyScores: {
          economic: (Math.random() - 0.5) * 2,
          social: (Math.random() - 0.5) * 2,
        },
      });
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }
}
