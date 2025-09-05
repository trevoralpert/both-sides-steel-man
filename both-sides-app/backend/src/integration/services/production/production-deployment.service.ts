import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { ProductionReadinessService } from './production-readiness.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Production Deployment Service
 * 
 * Manages production deployments with comprehensive validation,
 * rollback capabilities, and automated deployment procedures.
 * Ensures safe and reliable deployments to production environments.
 */

export interface DeploymentPlan {
  planId: string;
  name: string;
  description: string;
  version: string;
  targetEnvironment: string;
  createdBy: string;
  createdAt: Date;
  scheduledAt?: Date;
  phases: DeploymentPhase[];
  rollbackPlan: RollbackPlan;
  approvals: DeploymentApproval[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigations: string[];
  };
  estimatedDuration: number; // minutes
  dependencies: string[];
  prerequisites: string[];
  validationCriteria: string[];
  communicationPlan: {
    stakeholders: string[];
    notifications: Array<{
      phase: string;
      recipients: string[];
      template: string;
    }>;
  };
}

export interface DeploymentPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  type: 'preparation' | 'validation' | 'deployment' | 'verification' | 'cleanup';
  estimatedDuration: number; // minutes
  parallelizable: boolean;
  dependencies: string[];
  tasks: DeploymentTask[];
  rollbackTasks: DeploymentTask[];
  validationChecks: string[];
  continueOnFailure: boolean;
  manualApprovalRequired: boolean;
}

export interface DeploymentTask {
  id: string;
  name: string;
  description: string;
  type: 'automated' | 'manual' | 'validation';
  command?: string;
  script?: string;
  timeout: number; // seconds
  retryCount: number;
  rollbackCommand?: string;
  validationCommand?: string;
  dependencies: string[];
  environment: Record<string, string>;
}

export interface RollbackPlan {
  id: string;
  name: string;
  description: string;
  triggers: Array<{
    condition: string;
    automatic: boolean;
    threshold: any;
  }>;
  phases: Array<{
    id: string;
    name: string;
    tasks: DeploymentTask[];
    estimatedDuration: number;
  }>;
  dataRecovery: {
    backupRequired: boolean;
    backupLocation: string;
    recoveryProcedure: string[];
  };
  maxRollbackTime: number; // minutes
  validationChecks: string[];
}

export interface DeploymentApproval {
  id: string;
  type: 'technical' | 'business' | 'security' | 'compliance';
  approver: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
  comments?: string;
  conditions?: string[];
}

export interface DeploymentExecution {
  executionId: string;
  planId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'rolled_back';
  startedAt: Date;
  completedAt?: Date;
  currentPhase?: string;
  currentTask?: string;
  progress: {
    phasesCompleted: number;
    totalPhases: number;
    tasksCompleted: number;
    totalTasks: number;
    percentComplete: number;
  };
  phaseResults: Array<{
    phaseId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    taskResults: Array<{
      taskId: string;
      status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
      output?: string;
      error?: string;
      duration?: number;
    }>;
    validationResults: Array<{
      checkId: string;
      status: 'passed' | 'failed' | 'warning';
      message: string;
      details: any;
    }>;
  }>;
  metrics: {
    totalDuration?: number;
    deploymentSize: number; // MB
    downtime?: number; // seconds
    rollbackTime?: number; // seconds if rolled back
  };
  notifications: Array<{
    timestamp: Date;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    recipients: string[];
  }>;
  rollbackExecution?: {
    triggered: boolean;
    reason: string;
    triggeredAt: Date;
    completedAt?: Date;
    status: 'in_progress' | 'completed' | 'failed';
  };
}

export interface DeploymentEnvironment {
  name: string;
  type: 'development' | 'staging' | 'production' | 'test';
  configuration: {
    database: {
      host: string;
      port: number;
      name: string;
      ssl: boolean;
    };
    redis: {
      host: string;
      port: number;
      cluster: boolean;
    };
    monitoring: {
      enabled: boolean;
      endpoints: string[];
      alerts: boolean;
    };
    security: {
      https: boolean;
      certificateValidation: boolean;
      firewallRules: string[];
    };
  };
  resources: {
    cpu: number; // cores
    memory: number; // GB
    storage: number; // GB
    bandwidth: number; // Mbps
  };
  scalingConfig: {
    minInstances: number;
    maxInstances: number;
    autoScaling: boolean;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
  };
  healthChecks: Array<{
    name: string;
    endpoint: string;
    interval: number; // seconds
    timeout: number; // seconds
    retries: number;
  }>;
}

@Injectable()
export class ProductionDeploymentService {
  private readonly logger = new Logger(ProductionDeploymentService.name);
  private readonly activeDeployments = new Map<string, DeploymentExecution>();
  private readonly deploymentHistory: DeploymentExecution[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly readinessService: ProductionReadinessService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create deployment plan
   */
  async createDeploymentPlan(planData: Partial<DeploymentPlan>): Promise<DeploymentPlan> {
    const planId = `deploy-plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const plan: DeploymentPlan = {
      planId,
      name: planData.name || 'Production Deployment',
      description: planData.description || 'Integration layer production deployment',
      version: planData.version || '1.0.0',
      targetEnvironment: planData.targetEnvironment || 'production',
      createdBy: planData.createdBy || 'system',
      createdAt: new Date(),
      scheduledAt: planData.scheduledAt,
      phases: await this.generateDeploymentPhases(planData.targetEnvironment || 'production'),
      rollbackPlan: await this.generateRollbackPlan(),
      approvals: await this.generateRequiredApprovals(),
      riskAssessment: await this.assessDeploymentRisks(planData.version || '1.0.0'),
      estimatedDuration: 0, // Will be calculated
      dependencies: planData.dependencies || [],
      prerequisites: await this.generatePrerequisites(),
      validationCriteria: await this.generateValidationCriteria(),
      communicationPlan: await this.generateCommunicationPlan(),
    };

    // Calculate estimated duration
    plan.estimatedDuration = plan.phases.reduce((sum, phase) => sum + phase.estimatedDuration, 0);

    // Store deployment plan
    await this.storeDeploymentPlan(plan);

    this.logger.log(`Deployment plan created: ${planId}`);
    return plan;
  }

  /**
   * Execute deployment plan
   */
  async executeDeployment(planId: string, options: { dryRun?: boolean; skipApprovals?: boolean } = {}): Promise<DeploymentExecution> {
    const plan = await this.getDeploymentPlan(planId);
    if (!plan) {
      throw new Error(`Deployment plan not found: ${planId}`);
    }

    // Verify approvals unless skipped
    if (!options.skipApprovals) {
      const approvalStatus = this.checkApprovals(plan);
      if (!approvalStatus.approved) {
        throw new Error(`Deployment approvals not complete: ${approvalStatus.missing.join(', ')}`);
      }
    }

    // Verify readiness unless dry run
    if (!options.dryRun) {
      const readinessReport = await this.readinessService.executeReadinessAssessment(plan.targetEnvironment);
      if (readinessReport.readinessStatus === 'critical_issues') {
        throw new Error(`Environment not ready for deployment: ${readinessReport.criticalBlockers.join(', ')}`);
      }
    }

    const executionId = `deploy-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: DeploymentExecution = {
      executionId,
      planId,
      status: 'pending',
      startedAt: new Date(),
      progress: {
        phasesCompleted: 0,
        totalPhases: plan.phases.length,
        tasksCompleted: 0,
        totalTasks: plan.phases.reduce((sum, phase) => sum + phase.tasks.length, 0),
        percentComplete: 0,
      },
      phaseResults: plan.phases.map(phase => ({
        phaseId: phase.id,
        status: 'pending',
        taskResults: phase.tasks.map(task => ({
          taskId: task.id,
          status: 'pending',
        })),
        validationResults: [],
      })),
      metrics: {
        deploymentSize: 0, // Would calculate actual size
      },
      notifications: [],
    };

    // Store active deployment
    this.activeDeployments.set(executionId, execution);

    try {
      // Start deployment execution
      this.logger.log(`Starting deployment execution: ${executionId} (Plan: ${planId})`);
      
      execution.status = 'in_progress';
      
      // Execute phases in order
      for (const phase of plan.phases) {
        if (execution.status === 'cancelled') {
          break;
        }

        await this.executeDeploymentPhase(execution, plan, phase, options.dryRun || false);
        
        execution.progress.phasesCompleted++;
        execution.progress.percentComplete = Math.round(
          (execution.progress.phasesCompleted / execution.progress.totalPhases) * 100
        );

        // Update stored execution
        await this.updateDeploymentExecution(execution);

        // Emit progress event
        this.eventEmitter.emit('deployment.progress', {
          executionId,
          phase: phase.name,
          progress: execution.progress,
        });
      }

      // Complete deployment
      if (execution.status !== 'cancelled' && execution.status !== 'failed') {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.metrics.totalDuration = execution.completedAt.getTime() - execution.startedAt.getTime();
        
        this.logger.log(`Deployment completed successfully: ${executionId}`);
        
        // Emit completion event
        this.eventEmitter.emit('deployment.completed', execution);
      }

    } catch (error) {
      this.logger.error(`Deployment failed: ${executionId}`, error);
      
      execution.status = 'failed';
      execution.completedAt = new Date();
      
      // Check if automatic rollback should be triggered
      const shouldRollback = this.shouldTriggerAutomaticRollback(plan, error);
      if (shouldRollback && !options.dryRun) {
        await this.executeRollback(execution, plan, `Deployment failed: ${error.message}`);
      }

      // Emit failure event
      this.eventEmitter.emit('deployment.failed', { execution, error: error.message });
      
      throw error;

    } finally {
      // Move to history and cleanup
      this.deploymentHistory.unshift(execution);
      if (this.deploymentHistory.length > 100) {
        this.deploymentHistory.pop(); // Keep only last 100 deployments
      }
      
      this.activeDeployments.delete(executionId);
      await this.updateDeploymentExecution(execution);
    }

    return execution;
  }

  /**
   * Execute rollback
   */
  async executeRollback(execution: DeploymentExecution, plan: DeploymentPlan, reason: string): Promise<void> {
    this.logger.log(`Initiating rollback for deployment: ${execution.executionId} - Reason: ${reason}`);

    execution.rollbackExecution = {
      triggered: true,
      reason,
      triggeredAt: new Date(),
      status: 'in_progress',
    };

    try {
      // Execute rollback phases
      for (const rollbackPhase of plan.rollbackPlan.phases) {
        for (const task of rollbackPhase.tasks) {
          await this.executeDeploymentTask(task, true); // dryRun = true for safety
        }
      }

      execution.rollbackExecution.status = 'completed';
      execution.rollbackExecution.completedAt = new Date();
      execution.status = 'rolled_back';

      if (execution.rollbackExecution.completedAt) {
        execution.metrics.rollbackTime = execution.rollbackExecution.completedAt.getTime() - 
          execution.rollbackExecution.triggeredAt.getTime();
      }

      this.logger.log(`Rollback completed for deployment: ${execution.executionId}`);

      // Emit rollback completion event
      this.eventEmitter.emit('deployment.rollback.completed', execution);

    } catch (rollbackError) {
      this.logger.error(`Rollback failed for deployment: ${execution.executionId}`, rollbackError);
      
      execution.rollbackExecution!.status = 'failed';
      
      // Emit critical alert for rollback failure
      this.eventEmitter.emit('deployment.rollback.failed', {
        execution,
        error: rollbackError.message,
      });
      
      throw rollbackError;
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(executionId: string): Promise<DeploymentExecution | null> {
    // Check active deployments first
    const activeDeployment = this.activeDeployments.get(executionId);
    if (activeDeployment) {
      return activeDeployment;
    }

    // Check deployment history
    const historicalDeployment = this.deploymentHistory.find(d => d.executionId === executionId);
    if (historicalDeployment) {
      return historicalDeployment;
    }

    // Try to load from storage
    return await this.loadDeploymentExecution(executionId);
  }

  /**
   * Get deployment dashboard
   */
  async getDeploymentDashboard(): Promise<any> {
    const activeDeployments = Array.from(this.activeDeployments.values());
    const recentDeployments = this.deploymentHistory.slice(0, 10);

    return {
      timestamp: new Date(),
      active: {
        count: activeDeployments.length,
        deployments: activeDeployments.map(d => ({
          executionId: d.executionId,
          planId: d.planId,
          status: d.status,
          progress: d.progress,
          currentPhase: d.currentPhase,
          startedAt: d.startedAt,
        })),
      },
      recent: {
        count: recentDeployments.length,
        deployments: recentDeployments.map(d => ({
          executionId: d.executionId,
          planId: d.planId,
          status: d.status,
          startedAt: d.startedAt,
          completedAt: d.completedAt,
          duration: d.metrics.totalDuration,
        })),
      },
      statistics: {
        totalDeployments: this.deploymentHistory.length + activeDeployments.length,
        successRate: this.calculateSuccessRate(),
        averageDuration: this.calculateAverageDuration(),
        lastDeployment: recentDeployments[0]?.startedAt,
      },
      health: {
        activeIssues: activeDeployments.filter(d => d.status === 'failed').length,
        rollbacksTriggered: recentDeployments.filter(d => d.rollbackExecution?.triggered).length,
        systemStatus: activeDeployments.length > 0 ? 'deploying' : 'stable',
      },
    };
  }

  // Private helper methods

  private async generateDeploymentPhases(environment: string): Promise<DeploymentPhase[]> {
    return [
      {
        id: 'phase-preparation',
        name: 'Preparation',
        description: 'Pre-deployment preparation and validation',
        order: 1,
        type: 'preparation',
        estimatedDuration: 15,
        parallelizable: false,
        dependencies: [],
        tasks: [
          {
            id: 'task-backup-database',
            name: 'Backup Database',
            description: 'Create full database backup',
            type: 'automated',
            command: 'npm run db:backup',
            timeout: 600,
            retryCount: 2,
            rollbackCommand: 'npm run db:restore',
            dependencies: [],
            environment: { ENVIRONMENT: environment },
          },
          {
            id: 'task-enable-maintenance',
            name: 'Enable Maintenance Mode',
            description: 'Enable maintenance mode to prevent user access',
            type: 'automated',
            command: 'npm run maintenance:enable',
            timeout: 30,
            retryCount: 1,
            rollbackCommand: 'npm run maintenance:disable',
            dependencies: [],
            environment: { ENVIRONMENT: environment },
          },
        ],
        rollbackTasks: [
          {
            id: 'rollback-disable-maintenance',
            name: 'Disable Maintenance Mode',
            description: 'Disable maintenance mode to restore access',
            type: 'automated',
            command: 'npm run maintenance:disable',
            timeout: 30,
            retryCount: 1,
            dependencies: [],
            environment: { ENVIRONMENT: environment },
          },
        ],
        validationChecks: ['backup-integrity', 'maintenance-mode-active'],
        continueOnFailure: false,
        manualApprovalRequired: false,
      },
      {
        id: 'phase-deployment',
        name: 'Deployment',
        description: 'Deploy application to production environment',
        order: 2,
        type: 'deployment',
        estimatedDuration: 30,
        parallelizable: false,
        dependencies: ['phase-preparation'],
        tasks: [
          {
            id: 'task-deploy-application',
            name: 'Deploy Application',
            description: 'Deploy new application version',
            type: 'automated',
            command: 'npm run deploy:production',
            timeout: 1800,
            retryCount: 1,
            rollbackCommand: 'npm run deploy:rollback',
            dependencies: ['task-backup-database'],
            environment: { ENVIRONMENT: environment },
          },
          {
            id: 'task-migrate-database',
            name: 'Migrate Database',
            description: 'Apply database migrations',
            type: 'automated',
            command: 'npm run db:migrate:deploy',
            timeout: 300,
            retryCount: 0, // No retries for migrations
            dependencies: ['task-deploy-application'],
            environment: { ENVIRONMENT: environment },
          },
        ],
        rollbackTasks: [
          {
            id: 'rollback-deploy-previous',
            name: 'Deploy Previous Version',
            description: 'Deploy previous application version',
            type: 'automated',
            command: 'npm run deploy:rollback',
            timeout: 1800,
            retryCount: 1,
            dependencies: [],
            environment: { ENVIRONMENT: environment },
          },
        ],
        validationChecks: ['application-deployed', 'migrations-applied'],
        continueOnFailure: false,
        manualApprovalRequired: false,
      },
      {
        id: 'phase-verification',
        name: 'Verification',
        description: 'Verify deployment success and system health',
        order: 3,
        type: 'verification',
        estimatedDuration: 20,
        parallelizable: true,
        dependencies: ['phase-deployment'],
        tasks: [
          {
            id: 'task-health-check',
            name: 'Health Check',
            description: 'Verify application health endpoints',
            type: 'automated',
            command: 'npm run health:check',
            timeout: 120,
            retryCount: 3,
            validationCommand: 'npm run health:validate',
            dependencies: ['task-deploy-application'],
            environment: { ENVIRONMENT: environment },
          },
          {
            id: 'task-smoke-tests',
            name: 'Smoke Tests',
            description: 'Execute smoke test suite',
            type: 'automated',
            command: 'npm run test:smoke',
            timeout: 600,
            retryCount: 1,
            dependencies: ['task-health-check'],
            environment: { ENVIRONMENT: environment },
          },
        ],
        rollbackTasks: [],
        validationChecks: ['health-endpoints-responding', 'smoke-tests-passing'],
        continueOnFailure: false,
        manualApprovalRequired: false,
      },
      {
        id: 'phase-finalization',
        name: 'Finalization',
        description: 'Complete deployment and restore normal operations',
        order: 4,
        type: 'cleanup',
        estimatedDuration: 10,
        parallelizable: false,
        dependencies: ['phase-verification'],
        tasks: [
          {
            id: 'task-disable-maintenance',
            name: 'Disable Maintenance Mode',
            description: 'Disable maintenance mode and restore user access',
            type: 'automated',
            command: 'npm run maintenance:disable',
            timeout: 30,
            retryCount: 1,
            dependencies: ['task-smoke-tests'],
            environment: { ENVIRONMENT: environment },
          },
          {
            id: 'task-notify-completion',
            name: 'Notify Completion',
            description: 'Send deployment completion notifications',
            type: 'automated',
            command: 'npm run notify:deployment-complete',
            timeout: 60,
            retryCount: 2,
            dependencies: ['task-disable-maintenance'],
            environment: { ENVIRONMENT: environment },
          },
        ],
        rollbackTasks: [],
        validationChecks: ['maintenance-mode-disabled', 'notifications-sent'],
        continueOnFailure: true,
        manualApprovalRequired: false,
      },
    ];
  }

  private async generateRollbackPlan(): Promise<RollbackPlan> {
    return {
      id: `rollback-${Date.now()}`,
      name: 'Production Rollback Plan',
      description: 'Automated rollback procedure for production deployments',
      triggers: [
        {
          condition: 'deployment_failure',
          automatic: true,
          threshold: { failedTasks: 1, criticalPhase: true },
        },
        {
          condition: 'health_check_failure',
          automatic: true,
          threshold: { consecutiveFailures: 3 },
        },
        {
          condition: 'manual_trigger',
          automatic: false,
          threshold: {},
        },
      ],
      phases: [
        {
          id: 'rollback-phase-1',
          name: 'Stop Traffic',
          tasks: [
            {
              id: 'task-enable-maintenance-rollback',
              name: 'Enable Maintenance Mode',
              description: 'Stop incoming traffic during rollback',
              type: 'automated',
              command: 'npm run maintenance:enable',
              timeout: 30,
              retryCount: 1,
              dependencies: [],
              environment: {},
            },
          ],
          estimatedDuration: 2,
        },
        {
          id: 'rollback-phase-2',
          name: 'Restore Application',
          tasks: [
            {
              id: 'task-deploy-previous-version',
              name: 'Deploy Previous Version',
              description: 'Deploy the last known good version',
              type: 'automated',
              command: 'npm run deploy:rollback',
              timeout: 1200,
              retryCount: 1,
              dependencies: ['task-enable-maintenance-rollback'],
              environment: {},
            },
          ],
          estimatedDuration: 15,
        },
        {
          id: 'rollback-phase-3',
          name: 'Restore Service',
          tasks: [
            {
              id: 'task-disable-maintenance-rollback',
              name: 'Disable Maintenance Mode',
              description: 'Restore user access after rollback',
              type: 'automated',
              command: 'npm run maintenance:disable',
              timeout: 30,
              retryCount: 1,
              dependencies: ['task-deploy-previous-version'],
              environment: {},
            },
          ],
          estimatedDuration: 2,
        },
      ],
      dataRecovery: {
        backupRequired: true,
        backupLocation: 'production-backups/',
        recoveryProcedure: [
          'Identify data corruption scope',
          'Restore from latest backup',
          'Apply incremental changes if available',
          'Validate data integrity',
        ],
      },
      maxRollbackTime: 20,
      validationChecks: [
        'previous-version-deployed',
        'health-checks-passing',
        'maintenance-mode-disabled',
      ],
    };
  }

  private async generateRequiredApprovals(): Promise<DeploymentApproval[]> {
    return [
      {
        id: 'approval-technical',
        type: 'technical',
        approver: 'tech-lead',
        status: 'pending',
      },
      {
        id: 'approval-security',
        type: 'security',
        approver: 'security-team',
        status: 'pending',
      },
    ];
  }

  private async assessDeploymentRisks(version: string): Promise<any> {
    return {
      level: 'medium',
      factors: [
        'Database migrations included',
        'External service integrations affected',
        'Performance optimizations implemented',
      ],
      mitigations: [
        'Comprehensive testing completed',
        'Rollback plan validated',
        'Monitoring enhanced',
      ],
    };
  }

  private async generatePrerequisites(): Promise<string[]> {
    return [
      'Production readiness assessment completed',
      'All required approvals obtained',
      'Backup and rollback procedures verified',
      'Monitoring and alerting configured',
      'Communication plan activated',
    ];
  }

  private async generateValidationCriteria(): Promise<string[]> {
    return [
      'All health checks passing',
      'Response times within acceptable limits',
      'Error rates below threshold',
      'Core functionality verified',
      'External integrations functional',
    ];
  }

  private async generateCommunicationPlan(): Promise<any> {
    return {
      stakeholders: [
        'development-team',
        'operations-team',
        'product-management',
        'customer-support',
      ],
      notifications: [
        {
          phase: 'start',
          recipients: ['development-team', 'operations-team'],
          template: 'deployment-started',
        },
        {
          phase: 'completion',
          recipients: ['all-stakeholders'],
          template: 'deployment-completed',
        },
        {
          phase: 'failure',
          recipients: ['development-team', 'operations-team'],
          template: 'deployment-failed',
        },
      ],
    };
  }

  private async executeDeploymentPhase(
    execution: DeploymentExecution,
    plan: DeploymentPlan,
    phase: DeploymentPhase,
    dryRun: boolean
  ): Promise<void> {
    this.logger.log(`Executing deployment phase: ${phase.name} (${execution.executionId})`);

    execution.currentPhase = phase.id;
    const phaseResult = execution.phaseResults.find(r => r.phaseId === phase.id);
    
    if (!phaseResult) {
      throw new Error(`Phase result not found: ${phase.id}`);
    }

    phaseResult.status = 'in_progress';
    phaseResult.startedAt = new Date();

    try {
      // Execute tasks
      for (const task of phase.tasks) {
        execution.currentTask = task.id;
        
        const taskResult = phaseResult.taskResults.find(t => t.taskId === task.id);
        if (!taskResult) continue;

        taskResult.status = 'in_progress';
        
        try {
          const output = await this.executeDeploymentTask(task, dryRun);
          
          taskResult.status = 'completed';
          taskResult.output = output;
          taskResult.duration = Date.now() - (phaseResult.startedAt?.getTime() || 0);
          
          execution.progress.tasksCompleted++;

        } catch (taskError) {
          this.logger.error(`Task failed: ${task.name}`, taskError);
          
          taskResult.status = 'failed';
          taskResult.error = taskError.message;
          
          if (!phase.continueOnFailure) {
            throw taskError;
          }
        }
      }

      // Execute validation checks
      for (const checkId of phase.validationChecks) {
        try {
          const validationResult = await this.executeValidationCheck(checkId, dryRun);
          phaseResult.validationResults.push(validationResult);
          
          if (validationResult.status === 'failed' && !phase.continueOnFailure) {
            throw new Error(`Validation failed: ${validationResult.message}`);
          }
        } catch (validationError) {
          this.logger.error(`Validation check failed: ${checkId}`, validationError);
          
          phaseResult.validationResults.push({
            checkId,
            status: 'failed',
            message: validationError.message,
            details: { error: validationError.stack },
          });
          
          if (!phase.continueOnFailure) {
            throw validationError;
          }
        }
      }

      phaseResult.status = 'completed';
      phaseResult.completedAt = new Date();

      this.logger.log(`Phase completed successfully: ${phase.name}`);

    } catch (phaseError) {
      this.logger.error(`Phase failed: ${phase.name}`, phaseError);
      
      phaseResult.status = 'failed';
      phaseResult.completedAt = new Date();
      
      execution.status = 'failed';
      
      throw phaseError;
    }
  }

  private async executeDeploymentTask(task: DeploymentTask, dryRun: boolean): Promise<string> {
    this.logger.debug(`Executing task: ${task.name} (dry run: ${dryRun})`);

    if (dryRun) {
      // Simulate task execution for dry run
      await new Promise(resolve => setTimeout(resolve, 100));
      return `Dry run completed for task: ${task.name}`;
    }

    if (task.type === 'manual') {
      return `Manual task completed: ${task.name}`;
    }

    // For automated tasks, would execute the actual command
    // This is a mock implementation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    
    return `Task completed: ${task.name}`;
  }

  private async executeValidationCheck(checkId: string, dryRun: boolean): Promise<any> {
    this.logger.debug(`Executing validation check: ${checkId} (dry run: ${dryRun})`);

    // Mock validation check execution
    const success = Math.random() > 0.1; // 90% success rate for mock

    return {
      checkId,
      status: success ? 'passed' : 'failed',
      message: success ? `Validation passed: ${checkId}` : `Validation failed: ${checkId}`,
      details: { dryRun, timestamp: new Date() },
    };
  }

  private checkApprovals(plan: DeploymentPlan): { approved: boolean; missing: string[] } {
    const missing = plan.approvals
      .filter(approval => approval.status !== 'approved')
      .map(approval => approval.type);

    return {
      approved: missing.length === 0,
      missing,
    };
  }

  private shouldTriggerAutomaticRollback(plan: DeploymentPlan, error: Error): boolean {
    return plan.rollbackPlan.triggers.some(trigger => 
      trigger.automatic && (
        trigger.condition === 'deployment_failure' ||
        (trigger.condition === 'health_check_failure' && error.message.includes('health'))
      )
    );
  }

  private calculateSuccessRate(): number {
    if (this.deploymentHistory.length === 0) return 100;
    
    const successful = this.deploymentHistory.filter(d => d.status === 'completed').length;
    return Math.round((successful / this.deploymentHistory.length) * 100);
  }

  private calculateAverageDuration(): number {
    const completed = this.deploymentHistory.filter(d => d.status === 'completed' && d.metrics.totalDuration);
    
    if (completed.length === 0) return 0;
    
    const totalDuration = completed.reduce((sum, d) => sum + (d.metrics.totalDuration || 0), 0);
    return Math.round(totalDuration / completed.length / 1000 / 60); // Convert to minutes
  }

  // Storage methods

  private async storeDeploymentPlan(plan: DeploymentPlan): Promise<void> {
    try {
      await this.redis.setex(
        `deployment:plan:${plan.planId}`,
        30 * 24 * 60 * 60, // 30 days
        JSON.stringify(plan)
      );
    } catch (error) {
      this.logger.error('Failed to store deployment plan:', error);
    }
  }

  private async getDeploymentPlan(planId: string): Promise<DeploymentPlan | null> {
    try {
      const data = await this.redis.get(`deployment:plan:${planId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error('Failed to get deployment plan:', error);
      return null;
    }
  }

  private async updateDeploymentExecution(execution: DeploymentExecution): Promise<void> {
    try {
      await this.redis.setex(
        `deployment:execution:${execution.executionId}`,
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify(execution)
      );
    } catch (error) {
      this.logger.error('Failed to update deployment execution:', error);
    }
  }

  private async loadDeploymentExecution(executionId: string): Promise<DeploymentExecution | null> {
    try {
      const data = await this.redis.get(`deployment:execution:${executionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error('Failed to load deployment execution:', error);
      return null;
    }
  }
}
