import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { ExternalIdMappingService } from '../external-id-mapping.service';
import { DataQualityIssue } from './data-quality-monitor.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Data Reconciliation Service
 * 
 * Provides cross-system data comparison, discrepancy identification,
 * and manual correction workflows for maintaining data consistency
 * between internal systems and external integrations.
 */

export interface ReconciliationRule {
  id: string;
  name: string;
  description: string;
  entityType: 'user' | 'organization' | 'class' | 'enrollment';
  comparisonFields: string[];
  tolerances?: {
    [field: string]: {
      type: 'exact' | 'numeric' | 'date' | 'text';
      threshold?: number;
      ignoreCase?: boolean;
    };
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  automatedResolution?: {
    strategy: 'internal_wins' | 'external_wins' | 'newest_wins' | 'manual';
    requireApproval: boolean;
  };
}

export interface DataDiscrepancy {
  id: string;
  ruleId: string;
  entityType: string;
  entityId: string;
  externalId: string;
  externalSystemId: string;
  field: string;
  discrepancyType: 'missing_internal' | 'missing_external' | 'value_mismatch' | 'format_difference';
  internalValue: any;
  externalValue: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1 confidence in the discrepancy detection
  detectedAt: Date;
  lastCheckedAt: Date;
  status: 'open' | 'under_review' | 'resolved' | 'accepted' | 'ignored';
  resolution?: {
    action: 'update_internal' | 'update_external' | 'no_action' | 'manual_review';
    appliedAt?: Date;
    appliedBy?: string;
    previousValue?: any;
    notes?: string;
  };
  metadata?: {
    similarDiscrepancies?: number;
    affectedRelations?: string[];
    businessImpact?: string;
  };
}

export interface ReconciliationSession {
  id: string;
  name: string;
  description: string;
  entityTypes: string[];
  externalSystems: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  progress: {
    totalEntities: number;
    processedEntities: number;
    discrepanciesFound: number;
    discrepanciesResolved: number;
  };
  configuration: {
    rules: string[];
    batchSize: number;
    autoResolve: boolean;
    notifyOnCompletion: boolean;
  };
  results: {
    summary: {
      entitiesCompared: number;
      discrepanciesFound: number;
      autoResolved: number;
      requiresManualReview: number;
    };
    discrepanciesByType: {
      [type: string]: number;
    };
    discrepanciesBySeverity: {
      [severity: string]: number;
    };
  };
  createdBy: string;
  createdAt: Date;
}

export interface CorrectionWorkflow {
  id: string;
  discrepancyId: string;
  type: 'automated' | 'manual' | 'batch';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  steps: Array<{
    id: string;
    name: string;
    type: 'validation' | 'backup' | 'update' | 'verify' | 'notify';
    status: 'pending' | 'completed' | 'failed' | 'skipped';
    result?: any;
    error?: string;
    executedAt?: Date;
  }>;
  approvals?: Array<{
    level: number;
    approverRole: string;
    approver?: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: Date;
    comments?: string;
  }>;
  rollbackPlan?: {
    steps: Array<{
      action: string;
      parameters: any;
    }>;
    canAutoRollback: boolean;
  };
  createdAt: Date;
  completedAt?: Date;
  createdBy: string;
}

@Injectable()
export class DataReconciliationService {
  private readonly logger = new Logger(DataReconciliationService.name);
  private readonly defaultRules: ReconciliationRule[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mappingService: ExternalIdMappingService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default reconciliation rules
   */
  private initializeDefaultRules(): void {
    this.defaultRules = [
      {
        id: 'user-email-reconciliation',
        name: 'User Email Reconciliation',
        description: 'Compare user email addresses between systems',
        entityType: 'user',
        comparisonFields: ['email'],
        tolerances: {
          email: { type: 'text', ignoreCase: true },
        },
        priority: 'high',
        enabled: true,
        automatedResolution: {
          strategy: 'external_wins',
          requireApproval: false,
        },
      },
      {
        id: 'user-name-reconciliation',
        name: 'User Name Reconciliation',
        description: 'Compare user names between systems',
        entityType: 'user',
        comparisonFields: ['firstName', 'lastName'],
        tolerances: {
          firstName: { type: 'text', ignoreCase: true },
          lastName: { type: 'text', ignoreCase: true },
        },
        priority: 'medium',
        enabled: true,
        automatedResolution: {
          strategy: 'external_wins',
          requireApproval: true,
        },
      },
      {
        id: 'class-enrollment-count',
        name: 'Class Enrollment Count',
        description: 'Compare class enrollment counts between systems',
        entityType: 'class',
        comparisonFields: ['enrollmentCount'],
        tolerances: {
          enrollmentCount: { type: 'numeric', threshold: 0 },
        },
        priority: 'high',
        enabled: true,
        automatedResolution: {
          strategy: 'manual',
          requireApproval: true,
        },
      },
      {
        id: 'organization-hierarchy',
        name: 'Organization Hierarchy',
        description: 'Compare organization relationships between systems',
        entityType: 'organization',
        comparisonFields: ['parentId', 'level'],
        priority: 'critical',
        enabled: true,
        automatedResolution: {
          strategy: 'manual',
          requireApproval: true,
        },
      },
    ];
  }

  /**
   * Start comprehensive data reconciliation
   */
  async startReconciliationSession(
    name: string,
    entityTypes: string[],
    externalSystems: string[],
    createdBy: string,
    configuration?: Partial<ReconciliationSession['configuration']>
  ): Promise<ReconciliationSession> {
    this.logger.log(`Starting reconciliation session: ${name}`);

    const session: ReconciliationSession = {
      id: `reconciliation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `Reconciliation of ${entityTypes.join(', ')} across ${externalSystems.join(', ')}`,
      entityTypes,
      externalSystems,
      status: 'pending',
      progress: {
        totalEntities: 0,
        processedEntities: 0,
        discrepanciesFound: 0,
        discrepanciesResolved: 0,
      },
      configuration: {
        rules: this.getApplicableRules(entityTypes),
        batchSize: 100,
        autoResolve: false,
        notifyOnCompletion: true,
        ...configuration,
      },
      results: {
        summary: {
          entitiesCompared: 0,
          discrepanciesFound: 0,
          autoResolved: 0,
          requiresManualReview: 0,
        },
        discrepanciesByType: {},
        discrepanciesBySeverity: {},
      },
      createdBy,
      createdAt: new Date(),
    };

    try {
      // Store session
      await this.storeReconciliationSession(session);

      // Start reconciliation in background
      this.executeReconciliationSession(session.id);

      this.eventEmitter.emit('reconciliation.session.started', session);
      return session;

    } catch (error) {
      this.logger.error('Failed to start reconciliation session:', error);
      throw error;
    }
  }

  /**
   * Execute reconciliation session
   */
  private async executeReconciliationSession(sessionId: string): Promise<void> {
    const session = await this.getReconciliationSession(sessionId);
    if (!session) {
      this.logger.error(`Reconciliation session ${sessionId} not found`);
      return;
    }

    try {
      session.status = 'running';
      session.startedAt = new Date();
      await this.updateReconciliationSession(session);

      // Get entities to reconcile
      const entities = await this.getEntitiesForReconciliation(session.entityTypes, session.externalSystems);
      session.progress.totalEntities = entities.length;

      let processedCount = 0;
      const discrepancies: DataDiscrepancy[] = [];

      // Process entities in batches
      for (let i = 0; i < entities.length; i += session.configuration.batchSize) {
        const batch = entities.slice(i, i + session.configuration.batchSize);
        
        for (const entity of batch) {
          const entityDiscrepancies = await this.reconcileEntity(entity, session.configuration.rules);
          discrepancies.push(...entityDiscrepancies);
          
          processedCount++;
          session.progress.processedEntities = processedCount;
          
          // Update progress every 10 entities
          if (processedCount % 10 === 0) {
            session.progress.discrepanciesFound = discrepancies.length;
            await this.updateReconciliationSession(session);
          }
        }
      }

      // Process auto-resolutions
      let autoResolvedCount = 0;
      if (session.configuration.autoResolve) {
        for (const discrepancy of discrepancies) {
          if (await this.canAutoResolve(discrepancy)) {
            await this.autoResolveDiscrepancy(discrepancy);
            autoResolvedCount++;
          }
        }
      }

      // Update final results
      session.status = 'completed';
      session.completedAt = new Date();
      session.progress.discrepanciesFound = discrepancies.length;
      session.progress.discrepanciesResolved = autoResolvedCount;
      
      session.results = {
        summary: {
          entitiesCompared: processedCount,
          discrepanciesFound: discrepancies.length,
          autoResolved: autoResolvedCount,
          requiresManualReview: discrepancies.length - autoResolvedCount,
        },
        discrepanciesByType: this.groupDiscrepanciesByType(discrepancies),
        discrepanciesBySeverity: this.groupDiscrepanciesBySeverity(discrepancies),
      };

      await this.updateReconciliationSession(session);

      // Store discrepancies
      await this.storeDiscrepancies(discrepancies);

      // Send completion notification
      if (session.configuration.notifyOnCompletion) {
        this.eventEmitter.emit('reconciliation.session.completed', session);
      }

      this.logger.log(`Reconciliation session ${sessionId} completed: ${discrepancies.length} discrepancies found`);

    } catch (error) {
      this.logger.error(`Reconciliation session ${sessionId} failed:`, error);
      
      session.status = 'failed';
      session.completedAt = new Date();
      await this.updateReconciliationSession(session);

      this.eventEmitter.emit('reconciliation.session.failed', { session, error });
    }
  }

  /**
   * Reconcile individual entity
   */
  private async reconcileEntity(entity: any, ruleIds: string[]): Promise<DataDiscrepancy[]> {
    const discrepancies: DataDiscrepancy[] = [];
    const applicableRules = this.defaultRules.filter(rule => 
      ruleIds.includes(rule.id) && 
      rule.entityType === entity.entityType &&
      rule.enabled
    );

    for (const rule of applicableRules) {
      try {
        // Get external data for comparison
        const externalData = await this.getExternalEntityData(entity);
        if (!externalData) continue;

        // Compare fields according to rule
        const ruleDiscrepancies = await this.compareEntityFields(entity, externalData, rule);
        discrepancies.push(...ruleDiscrepancies);

      } catch (error) {
        this.logger.error(`Error reconciling entity ${entity.id} with rule ${rule.id}:`, error);
      }
    }

    return discrepancies;
  }

  /**
   * Compare entity fields according to rule
   */
  private async compareEntityFields(
    internalEntity: any,
    externalEntity: any,
    rule: ReconciliationRule
  ): Promise<DataDiscrepancy[]> {
    const discrepancies: DataDiscrepancy[] = [];

    for (const field of rule.comparisonFields) {
      const internalValue = this.getFieldValue(internalEntity, field);
      const externalValue = this.getFieldValue(externalEntity, field);

      const discrepancy = this.detectDiscrepancy(
        internalEntity,
        externalEntity,
        field,
        internalValue,
        externalValue,
        rule
      );

      if (discrepancy) {
        discrepancies.push(discrepancy);
      }
    }

    return discrepancies;
  }

  /**
   * Detect discrepancy between values
   */
  private detectDiscrepancy(
    internalEntity: any,
    externalEntity: any,
    field: string,
    internalValue: any,
    externalValue: any,
    rule: ReconciliationRule
  ): DataDiscrepancy | null {
    // Check for missing values
    if (internalValue === null || internalValue === undefined) {
      if (externalValue !== null && externalValue !== undefined) {
        return this.createDiscrepancy(
          internalEntity,
          externalEntity,
          field,
          internalValue,
          externalValue,
          rule,
          'missing_internal',
          0.9
        );
      }
      return null;
    }

    if (externalValue === null || externalValue === undefined) {
      return this.createDiscrepancy(
        internalEntity,
        externalEntity,
        field,
        internalValue,
        externalValue,
        rule,
        'missing_external',
        0.9
      );
    }

    // Apply field-specific comparison tolerance
    const tolerance = rule.tolerances?.[field];
    if (!tolerance) {
      // Default exact comparison
      if (internalValue !== externalValue) {
        return this.createDiscrepancy(
          internalEntity,
          externalEntity,
          field,
          internalValue,
          externalValue,
          rule,
          'value_mismatch',
          1.0
        );
      }
      return null;
    }

    // Apply tolerance-based comparison
    const discrepancy = this.compareWithTolerance(internalValue, externalValue, tolerance);
    if (discrepancy) {
      return this.createDiscrepancy(
        internalEntity,
        externalEntity,
        field,
        internalValue,
        externalValue,
        rule,
        'value_mismatch',
        discrepancy.confidence
      );
    }

    return null;
  }

  /**
   * Compare values with tolerance
   */
  private compareWithTolerance(
    internalValue: any,
    externalValue: any,
    tolerance: ReconciliationRule['tolerances'][string]
  ): { confidence: number } | null {
    switch (tolerance.type) {
      case 'exact':
        return internalValue !== externalValue ? { confidence: 1.0 } : null;

      case 'text':
        const internal = tolerance.ignoreCase ? String(internalValue).toLowerCase() : String(internalValue);
        const external = tolerance.ignoreCase ? String(externalValue).toLowerCase() : String(externalValue);
        return internal !== external ? { confidence: 0.8 } : null;

      case 'numeric':
        const diff = Math.abs(Number(internalValue) - Number(externalValue));
        const threshold = tolerance.threshold || 0;
        return diff > threshold ? { confidence: 0.9 } : null;

      case 'date':
        const internalDate = new Date(internalValue).getTime();
        const externalDate = new Date(externalValue).getTime();
        const dateDiff = Math.abs(internalDate - externalDate);
        const dateThreshold = tolerance.threshold || 0; // milliseconds
        return dateDiff > dateThreshold ? { confidence: 0.8 } : null;

      default:
        return internalValue !== externalValue ? { confidence: 0.7 } : null;
    }
  }

  /**
   * Create discrepancy record
   */
  private createDiscrepancy(
    internalEntity: any,
    externalEntity: any,
    field: string,
    internalValue: any,
    externalValue: any,
    rule: ReconciliationRule,
    type: DataDiscrepancy['discrepancyType'],
    confidence: number
  ): DataDiscrepancy {
    return {
      id: `discrepancy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      entityType: rule.entityType,
      entityId: internalEntity.id,
      externalId: externalEntity.id || internalEntity.external_id,
      externalSystemId: internalEntity.external_system_id || 'unknown',
      field,
      discrepancyType: type,
      internalValue,
      externalValue,
      severity: rule.priority as DataDiscrepancy['severity'],
      confidence,
      detectedAt: new Date(),
      lastCheckedAt: new Date(),
      status: 'open',
      metadata: {
        similarDiscrepancies: 0,
        affectedRelations: [],
        businessImpact: this.assessBusinessImpact(rule, type),
      },
    };
  }

  /**
   * Create correction workflow for discrepancy
   */
  async createCorrectionWorkflow(
    discrepancyId: string,
    createdBy: string,
    type: CorrectionWorkflow['type'] = 'manual'
  ): Promise<CorrectionWorkflow> {
    this.logger.log(`Creating correction workflow for discrepancy ${discrepancyId}`);

    try {
      const discrepancy = await this.getDiscrepancy(discrepancyId);
      if (!discrepancy) {
        throw new Error(`Discrepancy ${discrepancyId} not found`);
      }

      const steps = this.generateCorrectionSteps(discrepancy, type);
      const approvals = this.generateApprovalSteps(discrepancy);

      const workflow: CorrectionWorkflow = {
        id: `correction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        discrepancyId,
        type,
        status: 'pending',
        steps,
        approvals,
        rollbackPlan: this.generateRollbackPlan(discrepancy),
        createdAt: new Date(),
        createdBy,
      };

      await this.storeCorrectionWorkflow(workflow);

      // Start workflow if automated
      if (type === 'automated' && !approvals?.length) {
        await this.executeCorrectionWorkflow(workflow.id);
      }

      this.eventEmitter.emit('correction.workflow.created', workflow);
      return workflow;

    } catch (error) {
      this.logger.error('Failed to create correction workflow:', error);
      throw error;
    }
  }

  /**
   * Manual data correction workflow
   */
  async processManualCorrection(
    discrepancyId: string,
    action: 'update_internal' | 'update_external' | 'no_action' | 'accept_discrepancy',
    newValue?: any,
    notes?: string,
    approvedBy?: string
  ): Promise<void> {
    this.logger.log(`Processing manual correction for discrepancy ${discrepancyId}: ${action}`);

    try {
      const discrepancy = await this.getDiscrepancy(discrepancyId);
      if (!discrepancy) {
        throw new Error(`Discrepancy ${discrepancyId} not found`);
      }

      let previousValue = null;

      switch (action) {
        case 'update_internal':
          previousValue = discrepancy.internalValue;
          await this.updateInternalValue(discrepancy, newValue || discrepancy.externalValue);
          break;

        case 'update_external':
          previousValue = discrepancy.externalValue;
          await this.updateExternalValue(discrepancy, newValue || discrepancy.internalValue);
          break;

        case 'accept_discrepancy':
          // Mark as accepted without changes
          break;

        case 'no_action':
          // Mark as reviewed but no action taken
          break;
      }

      // Update discrepancy status
      discrepancy.status = action === 'accept_discrepancy' ? 'accepted' : 'resolved';
      discrepancy.resolution = {
        action,
        appliedAt: new Date(),
        appliedBy: approvedBy,
        previousValue,
        notes,
      };

      await this.updateDiscrepancy(discrepancy);

      this.eventEmitter.emit('discrepancy.corrected', {
        discrepancy,
        action,
        appliedBy: approvedBy,
      });

      this.logger.log(`Manual correction completed for discrepancy ${discrepancyId}`);

    } catch (error) {
      this.logger.error(`Failed to process manual correction for ${discrepancyId}:`, error);
      throw error;
    }
  }

  /**
   * Scheduled reconciliation
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledReconciliation(): Promise<void> {
    this.logger.log('Running scheduled data reconciliation');

    try {
      const session = await this.startReconciliationSession(
        'Daily Scheduled Reconciliation',
        ['user', 'organization', 'class', 'enrollment'],
        ['timeback'], // Add more systems as needed
        'system',
        {
          autoResolve: true,
          batchSize: 50,
          notifyOnCompletion: true,
        }
      );

      this.logger.log(`Started scheduled reconciliation session: ${session.id}`);

    } catch (error) {
      this.logger.error('Scheduled reconciliation failed:', error);
    }
  }

  // Private helper methods (abbreviated for space)

  private getApplicableRules(entityTypes: string[]): string[] {
    return this.defaultRules
      .filter(rule => entityTypes.includes(rule.entityType) && rule.enabled)
      .map(rule => rule.id);
  }

  private async getEntitiesForReconciliation(entityTypes: string[], externalSystems: string[]): Promise<any[]> {
    // Implementation would fetch entities that have external mappings
    // This is a placeholder - actual implementation would query database
    return [];
  }

  private async getExternalEntityData(entity: any): Promise<any> {
    // Implementation would fetch data from external system
    // This is a placeholder - actual implementation would use API clients
    return null;
  }

  private getFieldValue(entity: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], entity);
  }

  private assessBusinessImpact(rule: ReconciliationRule, type: string): string {
    const impacts = {
      user: 'May affect user authentication and access rights',
      organization: 'May affect organizational hierarchy and permissions',
      class: 'May affect class enrollment and teacher assignments',
      enrollment: 'May affect student access to class resources',
    };
    return impacts[rule.entityType] || 'Unknown business impact';
  }

  private async canAutoResolve(discrepancy: DataDiscrepancy): Promise<boolean> {
    const rule = this.defaultRules.find(r => r.id === discrepancy.ruleId);
    return rule?.automatedResolution?.strategy !== 'manual' && 
           !rule?.automatedResolution?.requireApproval &&
           discrepancy.confidence > 0.8;
  }

  private async autoResolveDiscrepancy(discrepancy: DataDiscrepancy): Promise<void> {
    const rule = this.defaultRules.find(r => r.id === discrepancy.ruleId);
    if (!rule?.automatedResolution) return;

    const strategy = rule.automatedResolution.strategy;
    let newValue: any;

    switch (strategy) {
      case 'external_wins':
        newValue = discrepancy.externalValue;
        await this.updateInternalValue(discrepancy, newValue);
        break;

      case 'internal_wins':
        newValue = discrepancy.internalValue;
        await this.updateExternalValue(discrepancy, newValue);
        break;

      case 'newest_wins':
        // Would implement timestamp comparison
        break;
    }

    discrepancy.status = 'resolved';
    discrepancy.resolution = {
      action: strategy === 'external_wins' ? 'update_internal' : 'update_external',
      appliedAt: new Date(),
      appliedBy: 'system',
      previousValue: strategy === 'external_wins' ? discrepancy.internalValue : discrepancy.externalValue,
    };

    await this.updateDiscrepancy(discrepancy);
  }

  // Storage and retrieval methods (abbreviated)
  private async storeReconciliationSession(session: ReconciliationSession): Promise<void> {
    await this.redis.setex(`reconciliation:session:${session.id}`, 7 * 24 * 60 * 60, JSON.stringify(session));
  }

  private async updateReconciliationSession(session: ReconciliationSession): Promise<void> {
    await this.storeReconciliationSession(session);
  }

  private async getReconciliationSession(sessionId: string): Promise<ReconciliationSession | null> {
    const data = await this.redis.get(`reconciliation:session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  // Additional helper methods would be implemented here...
}
