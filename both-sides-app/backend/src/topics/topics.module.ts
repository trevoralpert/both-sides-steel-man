/**
 * Topics Module
 * 
 * NestJS module for debate topic management system.
 * Provides CRUD operations, categorization, search, and difficulty assessment
 * for debate topics used in the matching engine.
 * 
 * Phase 4 Task 4.1.3: Basic Topic Management System
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { TopicDifficultyService } from './topic-difficulty.service';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    PrismaModule,
  ],
  controllers: [
    TopicsController,
  ],
  providers: [
    TopicsService,
    TopicDifficultyService,
  ],
  exports: [
    TopicsService,
    TopicDifficultyService,
  ],
})
export class TopicsModule {
  constructor() {
    console.log('🎯 Topics Module initialized');
    console.log('📚 Available features:');
    console.log('  - Debate topic CRUD operations');
    console.log('  - Topic categorization and search');
    console.log('  - Difficulty assessment framework');
    console.log('  - Usage tracking and analytics');
  }
}
