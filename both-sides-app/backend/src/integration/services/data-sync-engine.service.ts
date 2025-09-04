/**
 * Phase 9 Task 9.2.2: Data Synchronization Engine
 * 
 * This service orchestrates sync operations across different entity types,
 * managing sync jobs, priorities, rate limiting, and real-time webhook processing.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ExternalIdMappingService } from './external-id-mapping.service';
import { IntegrationRegistry } from './integration-registry.service';
import { 
  IRosterProvider,
  SyncContext,
  SyncOperationResult,
  IWebhookProvider
} from '../interfaces/core-integration.interface';
import { SyncStatus, IntegrationStatus } from '@prisma/client';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';

/**
 * Sync strategy types
 */
export enum SyncStrategy {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  REAL_TIME = 'real_time',
  MANUAL = 'manual',
}

/**
 * Sync priority levels
 */
export enum SyncPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Sync job configuration
 */
export interface SyncJobConfig {
  integrationId: string;
  strategy: SyncStrategy;
  entityTypes: string[];
  priority: SyncPriority;
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
  scheduleDelayMs?: number;
  metadata?: Record<string, any>;
}

/**
 * Sync job result
 */
export interface SyncJobResult {
  jobId: string;
  integrationId: string;
  strategy: SyncStrategy;
  entityTypes: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  results: SyncOperationResult[];
  summary: {
    totalProcessed: number;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: number;
  };
  errors: string[];
  metadata?: Record<string, any>;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  maxBackoffDelay: number;
}

/**
 * Webhook event for real-time sync
 */
export interface WebhookEvent {
  id: string;
  integrationId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: Record<string, any>;
  headers?: Record<string, string>;
  signature?: string;
  receivedAt: Date;
}

/**
 * Change detection result
 */
export interface ChangeDetectionResult {
  hasChanges: boolean;
  changedEntities: Array<{
    entityType: string;
    entityId: string;
    changeType: 'create' | 'update' | 'delete';
    lastModified: Date;
    checksum?: string;
  }>;
  totalChecked: number;
  lastCheckTime: Date;
}

/**
 * Data Synchronization Engine
 */
@Injectable()
export class DataSyncEngine {
  private readonly logger = new Logger(DataSyncEngine.name);
  
  // Rate limiting tracking
  private rateLimitTracker = new Map<string, {
    minuteCount: number;
    hourCount: number;
    lastMinute: number;
    lastHour: number;
    nextAvailableTime: Date;
  }>();
  
  // Active sync jobs tracking
  private activeSyncJobs = new Map<string, {
    jobId: string;
    integrationId: string;
    strategy: SyncStrategy;
    startTime: Date;
    entityTypes: string[];
  }>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mappingService: ExternalIdMappingService,
    private integrationRegistry: IntegrationRegistry,
    @InjectQueue('sync-jobs') private syncQueue: Queue
  ) {
    this.initializeSyncQueue();
    this.logger.log('Data Synchronization Engine initialized');
  }

  /**
   * Initialize sync job queue with processors
   */
  private initializeSyncQueue(): void {
    // Register sync job processors
    this.syncQueue.process('full-sync', 3, this.processFullSyncJob.bind(this));
    this.syncQueue.process('incremental-sync', 5, this.processIncrementalSyncJob.bind(this));
    this.syncQueue.process('real-time-sync', 10, this.processRealtimeSyncJob.bind(this));
    this.syncQueue.process('manual-sync', 2, this.processManualSyncJob.bind(this));

    // Set up event handlers
    this.syncQueue.on('completed', this.onJobCompleted.bind(this));
    this.syncQueue.on('failed', this.onJobFailed.bind(this));
    this.syncQueue.on('stalled', this.onJobStalled.bind(this));

    this.logger.log('Sync job queue initialized with processors');
  }

  // ================================================================
  // SYNC JOB MANAGEMENT
  // ================================================================

  /**
   * Schedule a sync job
   */
  async scheduleSyncJob(config: SyncJobConfig): Promise<string> {
    const jobId = `sync_${config.integrationId}_${config.strategy}_${Date.now()}`;
    
    this.logger.log(`Scheduling ${config.strategy} sync job for integration: ${config.integrationId}`);
    
    // Check if integration is active
    const integration = await this.prisma.integration.findUnique({
      where: { provider_id: config.integrationId },
    });
    
    if (!integration || !integration.enabled || integration.status !== IntegrationStatus.ACTIVE) {
      throw new Error(`Integration ${config.integrationId} is not active or enabled`);
    }
    
    // Check rate limits
    if (!await this.checkRateLimit(config.integrationId)) {
      const nextAvailable = this.rateLimitTracker.get(config.integrationId)?.nextAvailableTime;
      throw new Error(`Rate limit exceeded for integration ${config.integrationId}. Next available: ${nextAvailable?.toISOString()}`);
    }
    
    // Create sync context
    const context: SyncContext = {
      syncId: jobId,
      externalSystemId: config.integrationId,
      startTime: new Date(),
      metadata: {
        ...config.metadata,
        strategy: config.strategy,
        entityTypes: config.entityTypes,
        priority: config.priority,
      },
    };
    
    // Determine job priority weight
    const priorityWeights = {
      [SyncPriority.LOW]: 10,
      [SyncPriority.NORMAL]: 5,
      [SyncPriority.HIGH]: 2,
      [SyncPriority.CRITICAL]: 1,
    };
    
    // Schedule job in queue
    const job = await this.syncQueue.add(
      `${config.strategy}-sync`,
      {
        ...config,
        context,
      },
      {
        priority: priorityWeights[config.priority],
        delay: config.scheduleDelayMs || 0,
        attempts: config.maxRetries || 3,
        timeout: config.timeout || 300000, // 5 minutes default
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );
    
    // Track active job
    this.activeSyncJobs.set(jobId, {
      jobId,
      integrationId: config.integrationId,
      strategy: config.strategy,
      startTime: new Date(),
      entityTypes: config.entityTypes,
    });
    
    // Log sync job to audit
    await this.logSyncJob(jobId, config, 'scheduled');
    
    this.logger.log(`Scheduled sync job: ${jobId} with priority: ${config.priority}`);
    return jobId;
  }

  /**
   * Cancel a sync job
   */
  async cancelSyncJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.syncQueue.getJob(jobId);
      if (!job) {
        return false;
      }
      
      await job.remove();
      this.activeSyncJobs.delete(jobId);
      
      await this.logSyncJob(jobId, null, 'cancelled');
      this.logger.log(`Cancelled sync job: ${jobId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel sync job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get sync job status
   */
  async getSyncJobStatus(jobId: string): Promise<{
    id: string;
    state: string;
    progress: number;
    data?: any;
    result?: SyncJobResult;
    error?: string;
  } | null> {
    try {
      const job = await this.syncQueue.getJob(jobId);
      if (!job) {
        return null;
      }
      
      return {
        id: job.id.toString(),
        state: await job.getState(),
        progress: job.progress(),
        data: job.data,
        result: job.returnvalue,
        error: job.failedReason,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status for ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Get active sync jobs for an integration
   */
  getActiveSyncJobs(integrationId: string): Array<{
    jobId: string;
    strategy: SyncStrategy;
    startTime: Date;
    entityTypes: string[];
  }> {
    return Array.from(this.activeSyncJobs.values())
      .filter(job => job.integrationId === integrationId);
  }

  // ================================================================
  // SYNC JOB PROCESSORS
  // ================================================================

  /**
   * Process full sync job
   */
  private async processFullSyncJob(job: Job<SyncJobConfig & { context: SyncContext }>): Promise<SyncJobResult> {
    const { integrationId, entityTypes, context } = job.data;
    const startTime = new Date();
    
    this.logger.log(`Processing full sync job: ${job.id} for integration: ${integrationId}`);
    
    try {
      // Get provider
      const provider = await this.integrationRegistry.getProviderWithCapability<IRosterProvider>(
        integrationId,
        'roster'
      );
      
      if (!provider) {
        throw new Error(`No roster provider found for integration: ${integrationId}`);
      }
      
      // Perform full sync
      const syncResult = await provider.performFullSync(context);
      
      // Update job progress
      job.progress(100);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const result: SyncJobResult = {
        jobId: job.id.toString(),
        integrationId,
        strategy: SyncStrategy.FULL,
        entityTypes,
        startTime,
        endTime,
        duration,
        success: syncResult.success,
        results: syncResult.results,
        summary: syncResult.summary,
        errors: syncResult.success ? [] : ['Full sync failed'],
      };
      
      await this.logSyncJob(job.id.toString(), job.data, 'completed', result);
      return result;
      
    } catch (error) {
      this.logger.error(`Full sync job ${job.id} failed:`, error);
      
      const endTime = new Date();
      const result: SyncJobResult = {
        jobId: job.id.toString(),
        integrationId,
        strategy: SyncStrategy.FULL,
        entityTypes,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: false,
        results: [],
        summary: { totalProcessed: 0, created: 0, updated: 0, deleted: 0, skipped: 0, errors: 1 },
        errors: [error.message],
      };
      
      await this.logSyncJob(job.id.toString(), job.data, 'failed', result);
      throw error;
    }
  }

  /**
   * Process incremental sync job
   */
  private async processIncrementalSyncJob(job: Job<SyncJobConfig & { context: SyncContext }>): Promise<SyncJobResult> {
    const { integrationId, entityTypes, context } = job.data;
    const startTime = new Date();
    
    this.logger.log(`Processing incremental sync job: ${job.id} for integration: ${integrationId}`);
    
    try {
      // Get provider
      const provider = await this.integrationRegistry.getProviderWithCapability<IRosterProvider>(
        integrationId,
        'roster'
      );
      
      if (!provider) {
        throw new Error(`No roster provider found for integration: ${integrationId}`);
      }
      
      // Get last sync time
      const integration = await this.prisma.integration.findUnique({
        where: { provider_id: integrationId },
      });
      
      const lastSyncTime = integration?.last_successful_sync || new Date(0);
      
      // Perform incremental sync
      const syncResult = await provider.performIncrementalSync(context, lastSyncTime);
      
      // Update last sync time if successful
      if (syncResult.success) {
        await this.prisma.integration.update({
          where: { provider_id: integrationId },
          data: {
            last_successful_sync: startTime,
          },
        });
      }
      
      job.progress(100);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const result: SyncJobResult = {
        jobId: job.id.toString(),
        integrationId,
        strategy: SyncStrategy.INCREMENTAL,
        entityTypes,
        startTime,
        endTime,
        duration,
        success: syncResult.success,
        results: syncResult.results,
        summary: syncResult.summary,
        errors: syncResult.success ? [] : ['Incremental sync failed'],
      };
      
      await this.logSyncJob(job.id.toString(), job.data, 'completed', result);
      return result;
      
    } catch (error) {
      this.logger.error(`Incremental sync job ${job.id} failed:`, error);
      
      const endTime = new Date();
      const result: SyncJobResult = {
        jobId: job.id.toString(),
        integrationId,
        strategy: SyncStrategy.INCREMENTAL,
        entityTypes,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: false,
        results: [],
        summary: { totalProcessed: 0, created: 0, updated: 0, deleted: 0, skipped: 0, errors: 1 },
        errors: [error.message],
      };
      
      await this.logSyncJob(job.id.toString(), job.data, 'failed', result);
      throw error;
    }
  }

  /**
   * Process real-time sync job (from webhook)
   */
  private async processRealtimeSyncJob(job: Job<SyncJobConfig & { context: SyncContext; webhookEvent: WebhookEvent }>): Promise<SyncJobResult> {
    const { integrationId, entityTypes, context, webhookEvent } = job.data;
    const startTime = new Date();
    
    this.logger.log(`Processing real-time sync job: ${job.id} for webhook event: ${webhookEvent.eventType}`);
    
    try {
      // Get provider
      const provider = await this.integrationRegistry.getProviderWithCapability<IRosterProvider>(
        integrationId,
        'roster'
      );
      
      if (!provider) {
        throw new Error(`No roster provider found for integration: ${integrationId}`);
      }
      
      // Sync specific entity from webhook
      const syncResult = await provider.syncEntity(
        webhookEvent.entityType,
        webhookEvent.entityId,
        context
      );
      
      job.progress(100);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const result: SyncJobResult = {
        jobId: job.id.toString(),
        integrationId,
        strategy: SyncStrategy.REAL_TIME,
        entityTypes: [webhookEvent.entityType],
        startTime,
        endTime,
        duration,
        success: syncResult.success,
        results: [syncResult],
        summary: {
          totalProcessed: 1,
          created: syncResult.operation === 'create' ? 1 : 0,
          updated: syncResult.operation === 'update' ? 1 : 0,
          deleted: syncResult.operation === 'delete' ? 1 : 0,
          skipped: syncResult.operation === 'skip' ? 1 : 0,
          errors: syncResult.success ? 0 : 1,
        },
        errors: syncResult.success ? [] : [syncResult.error || 'Real-time sync failed'],
        metadata: {
          webhookEventId: webhookEvent.id,
          webhookEventType: webhookEvent.eventType,
        },
      };
      
      await this.logSyncJob(job.id.toString(), job.data, 'completed', result);
      return result;
      
    } catch (error) {
      this.logger.error(`Real-time sync job ${job.id} failed:`, error);
      
      const endTime = new Date();
      const result: SyncJobResult = {
        jobId: job.id.toString(),
        integrationId,
        strategy: SyncStrategy.REAL_TIME,
        entityTypes: [webhookEvent.entityType],
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: false,
        results: [],
        summary: { totalProcessed: 0, created: 0, updated: 0, deleted: 0, skipped: 0, errors: 1 },
        errors: [error.message],
        metadata: {
          webhookEventId: webhookEvent.id,
          webhookEventType: webhookEvent.eventType,
        },
      };
      
      await this.logSyncJob(job.id.toString(), job.data, 'failed', result);
      throw error;
    }
  }

  /**
   * Process manual sync job
   */
  private async processManualSyncJob(job: Job<SyncJobConfig & { context: SyncContext }>): Promise<SyncJobResult> {
    // Similar implementation to full sync but with different logging and metadata
    return this.processFullSyncJob(job);
  }

  // ================================================================
  // WEBHOOK PROCESSING
  // ================================================================

  /**
   * Process incoming webhook for real-time sync
   */
  async processWebhook(webhookEvent: WebhookEvent): Promise<string> {
    this.logger.log(`Processing webhook event: ${webhookEvent.eventType} for entity: ${webhookEvent.entityType}:${webhookEvent.entityId}`);
    
    // Validate webhook event
    if (!this.isValidWebhookEvent(webhookEvent)) {
      throw new Error('Invalid webhook event');
    }
    
    // Create sync job config for real-time sync
    const config: SyncJobConfig = {
      integrationId: webhookEvent.integrationId,
      strategy: SyncStrategy.REAL_TIME,
      entityTypes: [webhookEvent.entityType],
      priority: SyncPriority.HIGH, // Real-time events get high priority
      batchSize: 1,
      maxRetries: 2,
      timeout: 30000, // 30 seconds for real-time
      metadata: {
        webhookEventId: webhookEvent.id,
        webhookEventType: webhookEvent.eventType,
        webhookAction: webhookEvent.action,
      },
    };
    
    // Schedule immediately
    const jobId = await this.scheduleSyncJob(config);
    
    // Store webhook event
    await this.storeWebhookEvent(webhookEvent, jobId);
    
    return jobId;
  }

  /**
   * Validate webhook event
   */
  private isValidWebhookEvent(event: WebhookEvent): boolean {
    return !!(
      event.id &&
      event.integrationId &&
      event.eventType &&
      event.entityType &&
      event.entityId &&
      event.action &&
      ['create', 'update', 'delete'].includes(event.action)
    );
  }

  /**
   * Store webhook event in database
   */
  private async storeWebhookEvent(event: WebhookEvent, jobId: string): Promise<void> {
    try {
      await this.prisma.integrationWebhookEvent.create({
        data: {
          webhook_id: `webhook_${event.integrationId}`, // This would come from webhook registration
          event_type: event.eventType,
          event_id: event.id,
          payload: event.payload,
          headers: event.headers,
          signature: event.signature,
          received_at: event.receivedAt,
          idempotency_key: `${event.integrationId}_${event.id}_${event.receivedAt.getTime()}`,
        },
      });
    } catch (error) {
      this.logger.error('Failed to store webhook event:', error);
      // Don't fail the sync job if we can't store the webhook event
    }
  }

  // ================================================================
  // RATE LIMITING
  // ================================================================

  /**
   * Check rate limit for integration
   */
  private async checkRateLimit(integrationId: string): Promise<boolean> {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    const currentHour = Math.floor(now / 3600000);
    
    // Get rate limit configuration for integration
    const rateLimits = await this.getRateLimits(integrationId);
    if (!rateLimits) {
      return true; // No rate limits configured
    }
    
    // Get or create rate limit tracker
    let tracker = this.rateLimitTracker.get(integrationId);
    if (!tracker) {
      tracker = {
        minuteCount: 0,
        hourCount: 0,
        lastMinute: currentMinute,
        lastHour: currentHour,
        nextAvailableTime: new Date(),
      };
      this.rateLimitTracker.set(integrationId, tracker);
    }
    
    // Reset counters if time periods have changed
    if (tracker.lastMinute !== currentMinute) {
      tracker.minuteCount = 0;
      tracker.lastMinute = currentMinute;
    }
    
    if (tracker.lastHour !== currentHour) {
      tracker.hourCount = 0;
      tracker.lastHour = currentHour;
    }
    
    // Check limits
    if (tracker.minuteCount >= rateLimits.requestsPerMinute) {
      tracker.nextAvailableTime = new Date((currentMinute + 1) * 60000);
      return false;
    }
    
    if (tracker.hourCount >= rateLimits.requestsPerHour) {
      tracker.nextAvailableTime = new Date((currentHour + 1) * 3600000);
      return false;
    }
    
    // Increment counters
    tracker.minuteCount++;
    tracker.hourCount++;
    
    return true;
  }

  /**
   * Get rate limits for integration
   */
  private async getRateLimits(integrationId: string): Promise<RateLimitConfig | null> {
    try {
      // This would normally come from integration configuration
      // For now, return default limits
      return {
        requestsPerMinute: 60,
        requestsPerHour: 3600,
        burstLimit: 10,
        backoffStrategy: 'exponential',
        maxBackoffDelay: 60000,
      };
    } catch (error) {
      this.logger.error(`Failed to get rate limits for ${integrationId}:`, error);
      return null;
    }
  }

  // ================================================================
  // EVENT HANDLERS
  // ================================================================

  /**
   * Handle job completion
   */
  private async onJobCompleted(job: Job, result: SyncJobResult): Promise<void> {
    this.logger.log(`Sync job completed: ${job.id} in ${result.duration}ms`);
    this.activeSyncJobs.delete(job.id.toString());
    
    // Update integration last sync time if successful
    if (result.success) {
      await this.prisma.integration.update({
        where: { provider_id: result.integrationId },
        data: {
          last_successful_sync: result.endTime,
          error_count: 0,
        },
      });
    }
  }

  /**
   * Handle job failure
   */
  private async onJobFailed(job: Job, err: Error): Promise<void> {
    this.logger.error(`Sync job failed: ${job.id} - ${err.message}`);
    this.activeSyncJobs.delete(job.id.toString());
    
    // Update integration error count
    if (job.data.integrationId) {
      await this.prisma.integration.update({
        where: { provider_id: job.data.integrationId },
        data: {
          last_error: err.message,
          error_count: { increment: 1 },
        },
      });
    }
  }

  /**
   * Handle job stalled
   */
  private async onJobStalled(job: Job): Promise<void> {
    this.logger.warn(`Sync job stalled: ${job.id}`);
  }

  // ================================================================
  // LOGGING & MONITORING
  // ================================================================

  /**
   * Log sync job to audit trail
   */
  private async logSyncJob(
    jobId: string,
    config: SyncJobConfig | null,
    status: string,
    result?: SyncJobResult
  ): Promise<void> {
    try {
      if (!config) {
        return; // Can't log without config (e.g., during cancellation)
      }
      
      await this.prisma.integrationAuditLog.create({
        data: {
          integration_id: await this.getIntegrationDbId(config.integrationId),
          event_type: 'sync',
          event_category: 'operation',
          severity: result?.success === false ? 'error' : 'info',
          description: `Sync job ${status}: ${config.strategy} sync for ${config.entityTypes.join(', ')}`,
          details: {
            jobId,
            strategy: config.strategy,
            entityTypes: config.entityTypes,
            priority: config.priority,
            status,
            result: result ? {
              success: result.success,
              duration: result.duration,
              summary: result.summary,
              errors: result.errors,
            } : undefined,
          },
          correlation_id: jobId,
          duration_ms: result?.duration,
          error_message: result?.errors?.[0],
        },
      });
    } catch (error) {
      this.logger.error('Failed to log sync job to audit trail:', error);
    }
  }

  /**
   * Get integration database ID from provider ID
   */
  private async getIntegrationDbId(providerId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: { provider_id: providerId },
    });
    return integration?.id || 'unknown';
  }

  /**
   * Get sync engine statistics
   */
  async getSyncEngineStats(): Promise<{
    activeJobs: number;
    totalJobsProcessed: number;
    jobsByStrategy: Record<SyncStrategy, number>;
    jobsByPriority: Record<SyncPriority, number>;
    averageJobDuration: number;
    successRate: number;
    rateLimitStatus: Record<string, any>;
  }> {
    const queueStats = await this.syncQueue.getJobCounts();
    
    return {
      activeJobs: this.activeSyncJobs.size,
      totalJobsProcessed: queueStats.completed + queueStats.failed,
      jobsByStrategy: {
        [SyncStrategy.FULL]: 0, // Would need to track these
        [SyncStrategy.INCREMENTAL]: 0,
        [SyncStrategy.REAL_TIME]: 0,
        [SyncStrategy.MANUAL]: 0,
      },
      jobsByPriority: {
        [SyncPriority.LOW]: 0,
        [SyncPriority.NORMAL]: 0,
        [SyncPriority.HIGH]: 0,
        [SyncPriority.CRITICAL]: 0,
      },
      averageJobDuration: 0, // Would calculate from completed jobs
      successRate: queueStats.completed > 0 ? 
        (queueStats.completed / (queueStats.completed + queueStats.failed)) * 100 : 0,
      rateLimitStatus: Object.fromEntries(this.rateLimitTracker),
    };
  }
}
