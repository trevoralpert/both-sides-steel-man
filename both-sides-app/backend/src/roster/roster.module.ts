/**
 * Roster Provider Module
 * 
 * NestJS module that organizes all roster provider system components.
 * This module provides dependency injection configuration for the roster
 * integration system including caching, validation, error handling, and
 * provider management services.
 * 
 * Task 2.3.3: Design RosterProvider Interface and Contracts - COMPLETED
 */

import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { RosterCacheService } from './services/roster-cache.service';
import { RosterDataValidator, RosterIdMapper } from './utils/validation-mapping.util';
import { RosterErrorHandler } from './errors/roster-errors';

/**
 * Main roster provider module
 * 
 * This module provides:
 * - Roster cache service for multi-level caching
 * - Data validation and mapping utilities
 * - Error handling and circuit breaker protection
 * - Integration with Redis and Prisma
 */
@Module({
  imports: [
    CommonModule,    // For shared services like RedisService
    PrismaModule,    // For database access
    RedisModule,     // For Redis caching
  ],
  providers: [
    // Core caching service
    RosterCacheService,
    
    // Data validation and mapping
    {
      provide: RosterDataValidator,
      useFactory: () => new RosterDataValidator(),
    },
    
    // ID mapping service
    {
      provide: RosterIdMapper,
      useFactory: (prismaService) => new RosterIdMapper(prismaService),
      inject: ['PrismaService'],
    },
    
    // Error handling service
    {
      provide: RosterErrorHandler,
      useFactory: () => new RosterErrorHandler(),
    },
    
    // Provider registry (for future provider implementations)
    {
      provide: 'ROSTER_PROVIDER_REGISTRY',
      useValue: new Map(),
    },
  ],
  exports: [
    // Export services for use in other modules
    RosterCacheService,
    RosterDataValidator,
    RosterIdMapper,
    RosterErrorHandler,
    'ROSTER_PROVIDER_REGISTRY',
  ],
})
export class RosterModule {
  constructor() {
    // Module initialization logging
    console.log('🏫 Roster Provider Module initialized');
    console.log('📋 Available features:');
    console.log('  - RosterProvider interface contracts');
    console.log('  - Data validation and mapping utilities');
    console.log('  - Multi-level caching with Redis backend');
    console.log('  - Circuit breaker pattern for resilience');
    console.log('  - Comprehensive error handling');
    console.log('  - External ID to internal ID mapping');
  }
}

/**
 * Configuration interface for the roster module
 */
export interface RosterModuleConfig {
  cache: {
    enabled: boolean;
    redis: {
      host: string;
      port: number;
      password?: string;
      db?: number;
    };
    memory: {
      maxSize: number;
      ttl: number;
    };
  };
  
  validation: {
    strictMode: boolean;
    businessRulesEnabled: boolean;
    customValidators?: string[];
  };
  
  errorHandling: {
    circuitBreakerEnabled: boolean;
    retryEnabled: boolean;
    maxRetries: number;
  };
  
  providers: {
    enabledProviders: string[];
    defaultProvider?: string;
    providerConfigs: Record<string, any>;
  };
}

/**
 * Default configuration for the roster module
 */
export const DEFAULT_ROSTER_CONFIG: RosterModuleConfig = {
  cache: {
    enabled: true,
    redis: {
      host: 'localhost',
      port: 6379,
      db: 1, // Use separate Redis database for roster cache
    },
    memory: {
      maxSize: 10000,
      ttl: 1800, // 30 minutes
    },
  },
  
  validation: {
    strictMode: true,
    businessRulesEnabled: true,
    customValidators: [],
  },
  
  errorHandling: {
    circuitBreakerEnabled: true,
    retryEnabled: true,
    maxRetries: 3,
  },
  
  providers: {
    enabledProviders: ['mock'], // Start with mock provider
    defaultProvider: 'mock',
    providerConfigs: {},
  },
};
