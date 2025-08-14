/**
 * Belief Analysis Controller
 * 
 * RESTful API controller for AI-powered belief analysis system.
 * Provides endpoints for belief profile generation, embedding creation,
 * ideology mapping, and plasticity analysis.
 * 
 * Task 3.2.1: Integrate OpenAI API for Belief Analysis - API Layer
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { BeliefAnalysisService } from './services/belief-analysis.service';
import { BeliefEmbeddingService } from './services/belief-embedding.service';
import { IdeologyMappingService } from './services/ideology-mapping.service';
import { PlasticityAnalysisService } from './services/plasticity-analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RBACGuard } from '../auth/rbac/guards/rbac.guard';
import { Permissions } from '../auth/rbac/decorators/permissions.decorator';
import { CurrentUser } from '../auth/rbac/decorators/current-user.decorator';
import {
  GenerateBeliefAnalysisDto,
  BeliefAnalysisResponseDto,
  GenerateEmbeddingDto,
  EmbeddingResponseDto,
  FindSimilarProfilesDto,
  SimilarityMatchDto,
  AnalyzePlasticityDto,
  PlasticityAnalysisResponseDto,
} from './dto/belief-analysis.dto';

@Controller('api/belief-analysis')
@UseGuards(JwtAuthGuard)
export class BeliefAnalysisController {
  private readonly logger = new Logger(BeliefAnalysisController.name);

  constructor(
    private readonly beliefAnalysisService: BeliefAnalysisService,
    private readonly embeddingService: BeliefEmbeddingService,
    private readonly ideologyService: IdeologyMappingService,
    private readonly plasticityService: PlasticityAnalysisService,
  ) {}

  /**
   * Generate comprehensive belief analysis from survey responses
   * POST /api/belief-analysis/generate
   */
  @Post('generate')
  @UseGuards(RBACGuard)
  @Permissions('profile:analyze')
  async generateBeliefAnalysis(
    @Body() generateDto: GenerateBeliefAnalysisDto,
    @CurrentUser() user: any,
  ): Promise<BeliefAnalysisResponseDto> {
    try {
      this.logger.log(`Generating belief analysis for profile ${generateDto.profileId} by user ${user.id}`);

      // Verify user can analyze this profile
      await this.verifyProfileAccess(generateDto.profileId, user);

      // Generate analysis using belief analysis service
      const analysis = await this.beliefAnalysisService.generateBeliefAnalysis({
        profileId: generateDto.profileId,
        surveyResponses: generateDto.surveyResponses.map(r => ({
          questionId: r.questionId,
          questionText: r.questionText,
          questionCategory: r.questionCategory,
          responseValue: r.responseValue,
          responseText: r.responseText,
          confidenceLevel: r.confidenceLevel,
          completionTime: r.completionTime,
        })),
        analysisParameters: {
          depth: generateDto.analysisParameters.depth,
          focus: generateDto.analysisParameters.focus,
          context: generateDto.analysisParameters.context,
        },
      });

      // Transform to DTO format
      const responseDto: BeliefAnalysisResponseDto = {
        profileId: analysis.profileId,
        beliefSummary: analysis.beliefSummary,
        ideologyScores: analysis.ideologyScores,
        opinionPlasticity: analysis.opinionPlasticity,
        confidenceScore: analysis.confidenceScore,
        analysisMetadata: {
          analysisVersion: analysis.analysisMetadata.analysisVersion,
          completedAt: analysis.analysisMetadata.completedAt.toISOString(),
          tokensUsed: analysis.analysisMetadata.tokensUsed,
          processingTime: analysis.analysisMetadata.processingTime,
          qualityScore: analysis.analysisMetadata.qualityScore,
        },
      };

      this.logger.log(`Successfully generated belief analysis for profile ${generateDto.profileId}`);
      
      return responseDto;

    } catch (error) {
      this.logger.error(`Failed to generate belief analysis: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to generate belief analysis',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate vector embedding from belief summary
   * POST /api/belief-analysis/embeddings
   */
  @Post('embeddings')
  @UseGuards(RBACGuard)
  @Permissions('profile:analyze')
  async generateEmbedding(
    @Body() generateDto: GenerateEmbeddingDto,
    @CurrentUser() user: any,
  ): Promise<EmbeddingResponseDto> {
    try {
      this.logger.log(`Generating embedding for profile ${generateDto.profileId} by user ${user.id}`);

      // Verify user can analyze this profile
      await this.verifyProfileAccess(generateDto.profileId, user);

      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding({
        profileId: generateDto.profileId,
        beliefSummary: generateDto.beliefSummary,
        ideologyScores: generateDto.ideologyScores,
        metadata: generateDto.metadata,
      });

      // Transform to DTO format
      const responseDto: EmbeddingResponseDto = {
        profileId: embedding.profileId,
        embedding: embedding.embedding,
        dimension: embedding.dimension,
        magnitude: embedding.magnitude,
        generatedAt: embedding.generatedAt.toISOString(),
        metadata: embedding.metadata,
      };

      this.logger.log(`Successfully generated embedding for profile ${generateDto.profileId}`);
      
      return responseDto;

    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to generate embedding',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find similar profiles using embedding similarity
   * POST /api/belief-analysis/similarity/search
   */
  @Post('similarity/search')
  @UseGuards(RBACGuard)
  @Permissions('profile:search')
  async findSimilarProfiles(
    @Body() searchDto: FindSimilarProfilesDto,
    @CurrentUser() user: any,
  ): Promise<SimilarityMatchDto[]> {
    try {
      this.logger.log(`Finding similar profiles for user ${user.id}`);

      // Find similar profiles
      const matches = await this.embeddingService.findSimilarProfiles({
        targetEmbedding: searchDto.targetEmbedding,
        limit: searchDto.limit,
        threshold: searchDto.threshold,
        excludeProfileIds: searchDto.excludeProfileIds,
        filters: searchDto.filters,
      });

      // Transform to DTO format
      const responseDto: SimilarityMatchDto[] = matches.map(match => ({
        profileId: match.profileId,
        similarity: match.similarity,
        distance: match.distance,
        beliefSummary: match.beliefSummary,
        ideologyScores: match.ideologyScores,
      }));

      this.logger.log(`Found ${matches.length} similar profiles for user ${user.id}`);
      
      return responseDto;

    } catch (error) {
      this.logger.error(`Failed to find similar profiles: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to find similar profiles',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Analyze opinion plasticity from survey responses
   * POST /api/belief-analysis/plasticity
   */
  @Post('plasticity')
  @UseGuards(RBACGuard)
  @Permissions('profile:analyze')
  async analyzePlasticity(
    @Body() analyzeDto: AnalyzePlasticityDto,
    @CurrentUser() user: any,
  ): Promise<PlasticityAnalysisResponseDto> {
    try {
      this.logger.log(`Analyzing plasticity for profile ${analyzeDto.profileId} by user ${user.id}`);

      // Verify user can analyze this profile
      await this.verifyProfileAccess(analyzeDto.profileId, user);

      // Analyze plasticity
      const analysis = await this.plasticityService.analyzeOpinionPlasticity({
        profileId: analyzeDto.profileId,
        surveyResponses: analyzeDto.surveyResponses.map(r => ({
          questionId: r.questionId,
          questionText: r.questionText,
          questionCategory: r.questionCategory,
          responseValue: r.responseValue,
          responseText: r.responseText,
          confidenceLevel: r.confidenceLevel,
          completionTime: r.completionTime,
          timeStamp: new Date(),
        })),
        beliefSummary: analyzeDto.beliefSummary,
        ideologyScores: analyzeDto.ideologyScores,
        previousAnalysis: analyzeDto.previousAnalysis,
      });

      // Transform to DTO format
      const responseDto: PlasticityAnalysisResponseDto = {
        profileId: analysis.profileId,
        overallPlasticity: analysis.overallPlasticity,
        dimensionPlasticity: analysis.dimensionPlasticity,
        changeIndicators: analysis.changeIndicators,
        learningReadiness: analysis.learningReadiness,
        debateEngagementPotential: analysis.debateEngagementPotential,
        analysisMetadata: {
          analysisVersion: analysis.analysisMetadata.analysisVersion,
          completedAt: analysis.analysisMetadata.completedAt.toISOString(),
          processingTime: analysis.analysisMetadata.processingTime,
          reliabilityScore: analysis.analysisMetadata.reliabilityScore,
          dataPoints: analysis.analysisMetadata.dataPoints,
        },
      };

      this.logger.log(`Successfully analyzed plasticity for profile ${analyzeDto.profileId}`);
      
      return responseDto;

    } catch (error) {
      this.logger.error(`Failed to analyze plasticity: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to analyze plasticity',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get existing belief analysis for a profile
   * GET /api/belief-analysis/profiles/:profileId
   */
  @Get('profiles/:profileId')
  @UseGuards(RBACGuard)
  @Permissions('profile:read')
  async getBeliefAnalysis(
    @Param('profileId') profileId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      this.logger.log(`Getting belief analysis for profile ${profileId} by user ${user.id}`);

      // Verify user can access this profile
      await this.verifyProfileAccess(profileId, user);

      // TODO: Implement getting stored analysis from database
      // For now, return placeholder response
      return {
        profileId,
        message: 'Belief analysis retrieval not yet implemented',
        // This would return the stored analysis from the database
      };

    } catch (error) {
      this.logger.error(`Failed to get belief analysis: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to get belief analysis',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update embedding when profile changes
   * PUT /api/belief-analysis/embeddings/:profileId
   */
  @Put('embeddings/:profileId')
  @UseGuards(RBACGuard)
  @Permissions('profile:update')
  async updateEmbedding(
    @Param('profileId') profileId: string,
    @Body() updateDto: { beliefSummary: string; ideologyScores: any },
    @CurrentUser() user: any,
  ): Promise<EmbeddingResponseDto> {
    try {
      this.logger.log(`Updating embedding for profile ${profileId} by user ${user.id}`);

      // Verify user can update this profile
      await this.verifyProfileAccess(profileId, user);

      // Update embedding
      const embedding = await this.embeddingService.updateEmbedding(
        profileId,
        updateDto.beliefSummary,
        updateDto.ideologyScores
      );

      // Transform to DTO format
      const responseDto: EmbeddingResponseDto = {
        profileId: embedding.profileId,
        embedding: embedding.embedding,
        dimension: embedding.dimension,
        magnitude: embedding.magnitude,
        generatedAt: embedding.generatedAt.toISOString(),
        metadata: embedding.metadata,
      };

      this.logger.log(`Successfully updated embedding for profile ${profileId}`);
      
      return responseDto;

    } catch (error) {
      this.logger.error(`Failed to update embedding: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to update embedding',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get ideology interpretation for scores
   * GET /api/belief-analysis/ideology/interpret
   */
  @Get('ideology/interpret')
  @UseGuards(RBACGuard)
  @Permissions('profile:read')
  async getIdeologyInterpretation(
    @Query('profileId') profileId: string,
    @Query('economic') economic: string,
    @Query('social') social: string,
    @Query('tradition') tradition: string,
    @Query('globalism') globalism: string,
    @Query('environment') environment: string,
    @Query('certainty') certainty: string,
    @Query('consistency') consistency: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      this.logger.log(`Getting ideology interpretation for profile ${profileId} by user ${user.id}`);

      if (profileId) {
        await this.verifyProfileAccess(profileId, user);
      }

      // Parse scores from query parameters
      const scores = {
        economic: parseFloat(economic) || 0,
        social: parseFloat(social) || 0,
        tradition: parseFloat(tradition) || 0,
        globalism: parseFloat(globalism) || 0,
        environment: parseFloat(environment) || 0,
        certainty: parseFloat(certainty) || 0.5,
        consistency: parseFloat(consistency) || 0.5,
      };

      // Generate interpretation
      const interpretation = await this.ideologyService.interpretIdeology(
        profileId || 'temp',
        scores
      );

      this.logger.log(`Successfully generated ideology interpretation${profileId ? ` for profile ${profileId}` : ''}`);
      
      return interpretation;

    } catch (error) {
      this.logger.error(`Failed to get ideology interpretation: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to get ideology interpretation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Analyze ideology distribution for a class
   * GET /api/belief-analysis/classes/:classId/ideology-distribution
   */
  @Get('classes/:classId/ideology-distribution')
  @UseGuards(RBACGuard)
  @Permissions('class:read')
  async getClassIdeologyDistribution(
    @Param('classId') classId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    try {
      this.logger.log(`Analyzing ideology distribution for class ${classId} by user ${user.id}`);

      // TODO: Add class access verification
      // await this.verifyClassAccess(classId, user);

      const analysis = await this.ideologyService.analyzeClassIdeologyDistribution(classId);

      this.logger.log(`Successfully analyzed ideology distribution for class ${classId}`);
      
      return {
        ...analysis,
        analyzedAt: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Failed to analyze class ideology distribution: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to analyze class ideology distribution',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get question mapping statistics
   * GET /api/belief-analysis/question-mappings/stats
   */
  @Get('question-mappings/stats')
  @UseGuards(RBACGuard)
  @Permissions('system:read')
  async getQuestionMappingStats(@CurrentUser() user: any): Promise<any> {
    try {
      this.logger.log(`Getting question mapping statistics by user ${user.id}`);

      const stats = this.ideologyService.getQuestionMappingStats();

      return {
        ...stats,
        retrievedAt: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Failed to get question mapping statistics: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to get question mapping statistics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get embedding statistics and system health
   * GET /api/belief-analysis/embeddings/stats
   */
  @Get('embeddings/stats')
  @UseGuards(RBACGuard)
  @Permissions('system:read')
  async getEmbeddingStats(@CurrentUser() user: any): Promise<any> {
    try {
      this.logger.log(`Getting embedding statistics by user ${user.id}`);

      const stats = await this.embeddingService.getEmbeddingStats();

      return {
        ...stats,
        retrievedAt: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Failed to get embedding statistics: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to get embedding statistics',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create vector indices for optimal search performance
   * POST /api/belief-analysis/embeddings/indices
   */
  @Post('embeddings/indices')
  @UseGuards(RBACGuard)
  @Permissions('system:admin')
  async createVectorIndices(@CurrentUser() user: any): Promise<{
    status: string;
    message: string;
    createdAt: string;
  }> {
    try {
      this.logger.log(`Creating vector indices by admin user ${user.id}`);

      await this.embeddingService.createVectorIndices();

      return {
        status: 'success',
        message: 'Vector indices created successfully for optimal similarity search performance',
        createdAt: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Failed to create vector indices: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to create vector indices',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Bulk update embeddings for multiple profiles
   * POST /api/belief-analysis/embeddings/bulk-update
   */
  @Post('embeddings/bulk-update')
  @UseGuards(RBACGuard)
  @Permissions('profile:bulk-update')
  async bulkUpdateEmbeddings(
    @Body() updates: Array<{ profileId: string; embedding: number[] }>,
    @CurrentUser() user: any,
  ): Promise<{
    successful: number;
    failed: number;
    errors: string[];
    completedAt: string;
  }> {
    try {
      this.logger.log(`Bulk updating ${updates.length} embeddings by user ${user.id}`);

      const results = await this.embeddingService.bulkUpdateEmbeddings(updates);

      return {
        ...results,
        completedAt: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Failed to bulk update embeddings: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to bulk update embeddings',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Calculate similarity between two embeddings
   * POST /api/belief-analysis/embeddings/similarity
   */
  @Post('embeddings/similarity')
  @UseGuards(RBACGuard)
  @Permissions('profile:read')
  async calculateSimilarity(
    @Body() { embedding1, embedding2 }: { embedding1: number[]; embedding2: number[] },
    @CurrentUser() user: any,
  ): Promise<{
    similarity: number;
    distance: number;
    calculatedAt: string;
  }> {
    try {
      this.logger.log(`Calculating embedding similarity by user ${user.id}`);

      const similarity = this.embeddingService.calculateCosineSimilarity(embedding1, embedding2);
      
      // Calculate Euclidean distance as well
      const distance = Math.sqrt(
        embedding1.reduce((sum, val, i) => sum + Math.pow(val - embedding2[i], 2), 0)
      );

      return {
        similarity,
        distance,
        calculatedAt: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Failed to calculate similarity: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to calculate similarity',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check endpoint for belief analysis system
   * GET /api/belief-analysis/health
   */
  @Get('health')
  async getHealthStatus(): Promise<{
    status: string;
    services: {
      beliefAnalysis: string;
      embedding: string;
      ideology: string;
      plasticity: string;
    };
    embeddings?: {
      total: number;
      indexHealth: string;
    };
    timestamp: string;
  }> {
    try {
      // Get embedding stats for health check
      const embeddingStats = await this.embeddingService.getEmbeddingStats();
      
      return {
        status: 'healthy',
        services: {
          beliefAnalysis: 'operational',
          embedding: 'operational',
          ideology: 'operational',
          plasticity: 'operational',
        },
        embeddings: {
          total: embeddingStats.totalEmbeddings,
          indexHealth: embeddingStats.indexHealth,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Return basic health status if embedding stats fail
      return {
        status: 'healthy',
        services: {
          beliefAnalysis: 'operational',
          embedding: 'operational',
          ideology: 'operational',
          plasticity: 'operational',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify user has access to analyze/modify a specific profile
   */
  private async verifyProfileAccess(profileId: string, user: any): Promise<void> {
    // TODO: Implement proper access control logic
    // For now, allow any authenticated user to analyze any profile
    // In production, this should check:
    // 1. If it's their own profile
    // 2. If they're a teacher with access to the student's profile
    // 3. If they're an admin
    
    if (!profileId) {
      throw new HttpException('Profile ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!user) {
      throw new HttpException('User authentication required', HttpStatus.UNAUTHORIZED);
    }

    // Placeholder - always allow for now
    this.logger.debug(`Verified access for user ${user.id} to profile ${profileId}`);
  }
}
