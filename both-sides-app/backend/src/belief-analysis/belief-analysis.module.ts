/**
 * Belief Analysis Module
 * 
 * NestJS module for AI-powered belief profile generation and analysis.
 * This module handles OpenAI integration, belief summary generation,
 * ideology scoring, and opinion plasticity analysis.
 * 
 * Task 3.2.1: Integrate OpenAI API for Belief Analysis
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BeliefAnalysisController } from './belief-analysis.controller';
import { BeliefAnalysisService } from './services/belief-analysis.service';
import { BeliefEmbeddingService } from './services/belief-embedding.service';
import { IdeologyMappingService } from './services/ideology-mapping.service';
import { PlasticityAnalysisService } from './services/plasticity-analysis.service';
import { VectorSimilarityService } from './services/vector-similarity.service';
import { IdeologicalDifferenceService } from './services/ideological-difference.service';
import { MatchingConstraintsService } from './services/matching-constraints.service';
import { MatchQualityService } from './services/match-quality.service';
import { MatchCreationService } from './services/match-creation.service';
import { MatchStatusService } from './services/match-status.service';
import { MatchResponseService } from './services/match-response.service';
import { PositionAssignmentService } from './services/position-assignment.service';
import { TopicSelectionService } from './services/topic-selection.service';
import { DebatePreparationService } from './services/debate-preparation.service';
import { MatchHistoryService } from './services/match-history.service';
import { MatchAnalyticsService } from './services/match-analytics.service';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TopicsModule } from '../topics/topics.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    PrismaModule,
    TopicsModule,
  ],
  controllers: [
    BeliefAnalysisController,
  ],
  providers: [
    BeliefAnalysisService,
    BeliefEmbeddingService,
    IdeologyMappingService,
    PlasticityAnalysisService,
    VectorSimilarityService,
    IdeologicalDifferenceService,
    MatchingConstraintsService,
    MatchQualityService,
    MatchCreationService,
    MatchStatusService,
    MatchResponseService,
    PositionAssignmentService,
    TopicSelectionService,
    DebatePreparationService,
    MatchHistoryService,
    MatchAnalyticsService,
  ],
  exports: [
    BeliefAnalysisService,
    BeliefEmbeddingService,
    IdeologyMappingService,
    PlasticityAnalysisService,
    VectorSimilarityService,
    IdeologicalDifferenceService,
    MatchingConstraintsService,
    MatchQualityService,
    MatchCreationService,
    MatchStatusService,
    MatchResponseService,
    PositionAssignmentService,
    TopicSelectionService,
    DebatePreparationService,
    MatchHistoryService,
    MatchAnalyticsService,
  ],
})
export class BeliefAnalysisModule {
  constructor() {
    console.log('🧠 Belief Analysis Module initialized');
    console.log('📊 Available features:');
    console.log('  - OpenAI API integration for belief analysis');
    console.log('  - AI-generated belief summaries');
    console.log('  - Multi-dimensional ideology mapping');
    console.log('  - Opinion plasticity scoring');
    console.log('  - Vector embedding generation');
    console.log('  - High-performance vector similarity calculations');
  }
}
