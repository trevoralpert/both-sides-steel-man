import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { ExternalIdMappingService } from '../external-id-mapping.service';
import { ChangeTrackingService } from '../change-tracking/change-tracking.service';
import { IntegrationStatus, SyncStatus, User, Organization, Class, Enrollment } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Data Quality Monitoring Service
 * 
 * Provides comprehensive data quality monitoring, validation, and reporting
 * capabilities for the integration layer. Monitors data completeness, accuracy,
 * consistency, freshness, and validity across all integrated systems.
 */

export interface DataQualityRule {
  id: string;
  name: string;
  description: string;
  entityType: 'user' | 'organization' | 'class' | 'enrollment';
  rule: 'required' | 'unique' | 'format' | 'range' | 'relationship' | 'freshness' | 'custom';
  field?: string;
  condition?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  customValidator?: (entity: any, context?: any) => boolean;
}

export interface DataQualityIssue {
  id: string;
  ruleId: string;
  entityType: string;
  entityId: string;
  externalId?: string;
  field?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue?: any;
  expectedValue?: any;
  detectedAt: Date;
  status: 'open' | 'acknowledged' | 'resolved' | 'suppressed';
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  metadata?: any;
}

export interface DataQualityReport {
  id: string;
  generatedAt: Date;
  timeframe: {
    start: Date;
    end: Date;
  };
  overallScore: number;
  scores: {
    completeness: number;
    accuracy: number;
    consistency: number;
    validity: number;
    uniqueness: number;
    freshness: number;
  };
  summary: {
    totalRecords: number;
    recordsWithIssues: number;
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  entityBreakdown: {
    [entityType: string]: {
      totalRecords: number;
      score: number;
      issues: number;
      topIssues: DataQualityIssue[];
    };
  };
  trends: {
    scoreHistory: Array<{ date: Date; score: number }>;
    issueHistory: Array<{ date: Date; count: number; severity: string }>;
  };
  recommendations: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    action: string;
    impact: string;
  }>;
}

export interface ValidationConfig {
  enabled: boolean;
  schedule: string;
  rules: DataQualityRule[];
  notifications: {
    enabled: boolean;
    channels: string[];
    thresholds: {
      criticalIssues: number;
      scoreThreshold: number;
    };
  };
  reporting: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    includeDetails: boolean;
  };
  remediation: {
    autoFix: boolean;
    fixableRules: string[];
    requireApproval: boolean;
  };
}

@Injectable()
export class DataQualityMonitorService {
  private readonly logger = new Logger(DataQualityMonitorService.name);
  private readonly defaultRules: DataQualityRule[] = [];
  private config: ValidationConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mappingService: ExternalIdMappingService,
    private readonly changeTrackingService: ChangeTrackingService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultRules();
    this.loadConfiguration();
  }

  /**
   * Initialize default data quality rules
   */
  private initializeDefaultRules(): void {
    this.defaultRules = [
      // User validation rules
      {
        id: 'user-email-required',
        name: 'User Email Required',
        description: 'Users must have a valid email address',
        entityType: 'user',
        rule: 'required',
        field: 'email',
        severity: 'critical',
        enabled: true,
      },
      {
        id: 'user-email-unique',
        name: 'User Email Unique',
        description: 'User email addresses must be unique',
        entityType: 'user',
        rule: 'unique',
        field: 'email',
        severity: 'high',
        enabled: true,
      },
      {
        id: 'user-email-format',
        name: 'User Email Format',
        description: 'User email addresses must be valid format',
        entityType: 'user',
        rule: 'format',
        field: 'email',
        condition: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        severity: 'high',
        enabled: true,
      },
      {
        id: 'user-name-required',
        name: 'User Name Required',
        description: 'Users must have both first and last names',
        entityType: 'user',
        rule: 'custom',
        severity: 'medium',
        enabled: true,
        customValidator: (user: User) => !!(user.firstName && user.lastName),
      },
      {
        id: 'user-sync-freshness',
        name: 'User Sync Freshness',
        description: 'User data should be synced within 24 hours',
        entityType: 'user',
        rule: 'freshness',
        field: 'last_sync_at',
        condition: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
        severity: 'medium',
        enabled: true,
      },

      // Organization validation rules
      {
        id: 'org-name-required',
        name: 'Organization Name Required',
        description: 'Organizations must have a name',
        entityType: 'organization',
        rule: 'required',
        field: 'name',
        severity: 'critical',
        enabled: true,
      },
      {
        id: 'org-name-unique',
        name: 'Organization Name Unique',
        description: 'Organization names should be unique per external system',
        entityType: 'organization',
        rule: 'unique',
        field: 'name',
        severity: 'medium',
        enabled: true,
      },

      // Class validation rules
      {
        id: 'class-name-required',
        name: 'Class Name Required',
        description: 'Classes must have a name',
        entityType: 'class',
        rule: 'required',
        field: 'name',
        severity: 'critical',
        enabled: true,
      },
      {
        id: 'class-teacher-relationship',
        name: 'Class Teacher Relationship',
        description: 'Classes must have a valid teacher assignment',
        entityType: 'class',
        rule: 'relationship',
        field: 'teacherId',
        condition: { relatedEntity: 'user', relatedRole: 'teacher' },
        severity: 'high',
        enabled: true,
      },
      {
        id: 'class-org-relationship',
        name: 'Class Organization Relationship',
        description: 'Classes must belong to a valid organization',
        entityType: 'class',
        rule: 'relationship',
        field: 'organizationId',
        condition: { relatedEntity: 'organization' },
        severity: 'critical',
        enabled: true,
      },

      // Enrollment validation rules
      {
        id: 'enrollment-user-relationship',
        name: 'Enrollment User Relationship',
        description: 'Enrollments must reference a valid user',
        entityType: 'enrollment',
        rule: 'relationship',
        field: 'userId',
        condition: { relatedEntity: 'user' },
        severity: 'critical',
        enabled: true,
      },
      {
        id: 'enrollment-class-relationship',
        name: 'Enrollment Class Relationship',
        description: 'Enrollments must reference a valid class',
        entityType: 'enrollment',
        rule: 'relationship',
        field: 'classId',
        condition: { relatedEntity: 'class' },
        severity: 'critical',
        enabled: true,
      },
      {
        id: 'enrollment-unique',
        name: 'Enrollment Unique',
        description: 'User should not be enrolled in the same class multiple times',
        entityType: 'enrollment',
        rule: 'unique',
        field: 'userId,classId',
        severity: 'high',
        enabled: true,
      },
    ];
  }

  /**
   * Load configuration from database or use defaults
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const configRecord = await this.prisma.integrationConfiguration.findUnique({
        where: {
          integrationId_key: {
            integrationId: 'system',
            key: 'data-quality-config',
          },
        },
      });

      if (configRecord?.value) {
        this.config = JSON.parse(configRecord.value);
      } else {
        this.config = {
          enabled: true,
          schedule: '0 */6 * * *', // Every 6 hours
          rules: this.defaultRules,
          notifications: {
            enabled: true,
            channels: ['email', 'webhook'],
            thresholds: {
              criticalIssues: 5,
              scoreThreshold: 80,
            },
          },
          reporting: {
            enabled: true,
            frequency: 'daily',
            recipients: [],
            includeDetails: false,
          },
          remediation: {
            autoFix: false,
            fixableRules: ['user-email-format'],
            requireApproval: true,
          },
        };
      }
    } catch (error) {
      this.logger.error('Failed to load data quality configuration:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Run comprehensive data quality validation
   */
  async runDataQualityValidation(): Promise<DataQualityReport> {
    this.logger.log('Starting comprehensive data quality validation');

    const startTime = Date.now();
    const timeframe = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date(),
    };

    try {
      // Run validation for each entity type
      const [userResults, orgResults, classResults, enrollmentResults] = await Promise.all([
        this.validateEntityType('user'),
        this.validateEntityType('organization'),
        this.validateEntityType('class'),
        this.validateEntityType('enrollment'),
      ]);

      // Compile comprehensive report
      const report = await this.generateQualityReport(
        timeframe,
        [userResults, orgResults, classResults, enrollmentResults]
      );

      // Store report
      await this.storeQualityReport(report);

      // Send notifications if needed
      await this.processNotifications(report);

      // Emit quality report event
      this.eventEmitter.emit('data.quality.report.generated', report);

      this.logger.log(`Data quality validation completed in ${Date.now() - startTime}ms`);
      return report;

    } catch (error) {
      this.logger.error('Data quality validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate specific entity type against rules
   */
  private async validateEntityType(entityType: string): Promise<{
    entityType: string;
    totalRecords: number;
    issues: DataQualityIssue[];
    score: number;
  }> {
    const rules = this.config.rules.filter(r => r.entityType === entityType && r.enabled);
    const issues: DataQualityIssue[] = [];
    let totalRecords = 0;

    // Get entities to validate
    const entities = await this.getEntitiesForValidation(entityType);
    totalRecords = entities.length;

    // Apply each rule to entities
    for (const rule of rules) {
      const ruleIssues = await this.applyRule(rule, entities);
      issues.push(...ruleIssues);
    }

    // Calculate quality score
    const score = this.calculateQualityScore(totalRecords, issues);

    return {
      entityType,
      totalRecords,
      issues,
      score,
    };
  }

  /**
   * Apply a specific rule to entities
   */
  private async applyRule(rule: DataQualityRule, entities: any[]): Promise<DataQualityIssue[]> {
    const issues: DataQualityIssue[] = [];

    for (const entity of entities) {
      const violation = await this.checkRuleViolation(rule, entity);
      if (violation) {
        issues.push({
          id: `${rule.id}-${entity.id}-${Date.now()}`,
          ruleId: rule.id,
          entityType: rule.entityType,
          entityId: entity.id,
          externalId: entity.external_id,
          field: rule.field,
          severity: rule.severity,
          message: violation.message,
          currentValue: violation.currentValue,
          expectedValue: violation.expectedValue,
          detectedAt: new Date(),
          status: 'open',
          metadata: violation.metadata,
        });
      }
    }

    return issues;
  }

  /**
   * Check if an entity violates a specific rule
   */
  private async checkRuleViolation(rule: DataQualityRule, entity: any): Promise<{
    message: string;
    currentValue?: any;
    expectedValue?: any;
    metadata?: any;
  } | null> {
    try {
      switch (rule.rule) {
        case 'required':
          return this.checkRequiredField(rule, entity);
        
        case 'unique':
          return await this.checkUniqueConstraint(rule, entity);
        
        case 'format':
          return this.checkFormatValidation(rule, entity);
        
        case 'range':
          return this.checkRangeValidation(rule, entity);
        
        case 'relationship':
          return await this.checkRelationshipIntegrity(rule, entity);
        
        case 'freshness':
          return this.checkDataFreshness(rule, entity);
        
        case 'custom':
          return this.checkCustomRule(rule, entity);
        
        default:
          return null;
      }
    } catch (error) {
      this.logger.error(`Error checking rule ${rule.id}:`, error);
      return null;
    }
  }

  /**
   * Check required field rule
   */
  private checkRequiredField(rule: DataQualityRule, entity: any) {
    const fieldValue = this.getFieldValue(entity, rule.field!);
    
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      return {
        message: `Required field '${rule.field}' is missing or empty`,
        currentValue: fieldValue,
        expectedValue: 'non-empty value',
      };
    }
    
    return null;
  }

  /**
   * Check unique constraint rule
   */
  private async checkUniqueConstraint(rule: DataQualityRule, entity: any) {
    const fields = rule.field!.split(',');
    const whereClause: any = {};
    
    // Build where clause for uniqueness check
    for (const field of fields) {
      whereClause[field] = this.getFieldValue(entity, field);
    }
    
    // Exclude current entity from check
    whereClause.id = { not: entity.id };

    const tableName = this.getTableName(rule.entityType);
    const duplicates = await (this.prisma as any)[tableName].count({ where: whereClause });
    
    if (duplicates > 0) {
      return {
        message: `Duplicate values found for fields: ${fields.join(', ')}`,
        currentValue: fields.map(f => this.getFieldValue(entity, f)).join(', '),
        expectedValue: 'unique value',
        metadata: { duplicateCount: duplicates },
      };
    }
    
    return null;
  }

  /**
   * Check format validation rule
   */
  private checkFormatValidation(rule: DataQualityRule, entity: any) {
    const fieldValue = this.getFieldValue(entity, rule.field!);
    
    if (!fieldValue) return null; // Skip validation for empty values
    
    const pattern = rule.condition?.pattern;
    if (pattern && !pattern.test(fieldValue)) {
      return {
        message: `Field '${rule.field}' has invalid format`,
        currentValue: fieldValue,
        expectedValue: `value matching ${pattern}`,
      };
    }
    
    return null;
  }

  /**
   * Check range validation rule
   */
  private checkRangeValidation(rule: DataQualityRule, entity: any) {
    const fieldValue = this.getFieldValue(entity, rule.field!);
    
    if (fieldValue === null || fieldValue === undefined) return null;
    
    const { min, max } = rule.condition || {};
    
    if (min !== undefined && fieldValue < min) {
      return {
        message: `Field '${rule.field}' is below minimum value`,
        currentValue: fieldValue,
        expectedValue: `>= ${min}`,
      };
    }
    
    if (max !== undefined && fieldValue > max) {
      return {
        message: `Field '${rule.field}' exceeds maximum value`,
        currentValue: fieldValue,
        expectedValue: `<= ${max}`,
      };
    }
    
    return null;
  }

  /**
   * Check relationship integrity rule
   */
  private async checkRelationshipIntegrity(rule: DataQualityRule, entity: any) {
    const relatedId = this.getFieldValue(entity, rule.field!);
    
    if (!relatedId) return null;
    
    const relatedEntity = rule.condition?.relatedEntity;
    const relatedRole = rule.condition?.relatedRole;
    
    if (!relatedEntity) return null;
    
    const relatedTableName = this.getTableName(relatedEntity);
    const whereClause: any = { id: relatedId };
    
    // Add role constraint if specified
    if (relatedRole) {
      whereClause.role = relatedRole;
    }
    
    const relatedRecord = await (this.prisma as any)[relatedTableName].findUnique({
      where: whereClause,
    });
    
    if (!relatedRecord) {
      return {
        message: `Related ${relatedEntity} not found for field '${rule.field}'`,
        currentValue: relatedId,
        expectedValue: `valid ${relatedEntity} ID`,
        metadata: { relatedEntity, relatedRole },
      };
    }
    
    return null;
  }

  /**
   * Check data freshness rule
   */
  private checkDataFreshness(rule: DataQualityRule, entity: any) {
    const timestampValue = this.getFieldValue(entity, rule.field!);
    
    if (!timestampValue) {
      return {
        message: `Timestamp field '${rule.field}' is missing`,
        currentValue: timestampValue,
        expectedValue: 'valid timestamp',
      };
    }
    
    const maxAge = rule.condition?.maxAge || 24 * 60 * 60 * 1000; // Default 24 hours
    const age = Date.now() - new Date(timestampValue).getTime();
    
    if (age > maxAge) {
      return {
        message: `Data is stale (${Math.round(age / (60 * 60 * 1000))} hours old)`,
        currentValue: timestampValue,
        expectedValue: `within ${maxAge / (60 * 60 * 1000)} hours`,
        metadata: { ageHours: age / (60 * 60 * 1000) },
      };
    }
    
    return null;
  }

  /**
   * Check custom rule
   */
  private checkCustomRule(rule: DataQualityRule, entity: any) {
    if (!rule.customValidator) return null;
    
    try {
      const isValid = rule.customValidator(entity);
      
      if (!isValid) {
        return {
          message: rule.description,
          currentValue: 'validation failed',
          expectedValue: 'validation passed',
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Custom validation error for rule ${rule.id}:`, error);
      return {
        message: `Custom validation failed: ${error.message}`,
        currentValue: 'error',
        expectedValue: 'successful validation',
      };
    }
  }

  /**
   * Generate comprehensive quality report
   */
  private async generateQualityReport(
    timeframe: { start: Date; end: Date },
    entityResults: Array<{
      entityType: string;
      totalRecords: number;
      issues: DataQualityIssue[];
      score: number;
    }>
  ): Promise<DataQualityReport> {
    // Calculate overall metrics
    const totalRecords = entityResults.reduce((sum, r) => sum + r.totalRecords, 0);
    const allIssues = entityResults.flatMap(r => r.issues);
    const recordsWithIssues = new Set(allIssues.map(i => i.entityId)).size;
    
    // Calculate severity breakdown
    const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    const highIssues = allIssues.filter(i => i.severity === 'high').length;
    const mediumIssues = allIssues.filter(i => i.severity === 'medium').length;
    const lowIssues = allIssues.filter(i => i.severity === 'low').length;

    // Calculate overall quality score
    const overallScore = entityResults.length > 0
      ? entityResults.reduce((sum, r) => sum + r.score, 0) / entityResults.length
      : 100;

    // Build entity breakdown
    const entityBreakdown: any = {};
    for (const result of entityResults) {
      entityBreakdown[result.entityType] = {
        totalRecords: result.totalRecords,
        score: result.score,
        issues: result.issues.length,
        topIssues: result.issues
          .sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity))
          .slice(0, 5),
      };
    }

    // Get historical trends
    const trends = await this.getQualityTrends(timeframe);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(allIssues, overallScore);

    return {
      id: `quality-report-${Date.now()}`,
      generatedAt: new Date(),
      timeframe,
      overallScore,
      scores: {
        completeness: this.calculateCompletenessScore(allIssues),
        accuracy: this.calculateAccuracyScore(allIssues),
        consistency: this.calculateConsistencyScore(allIssues),
        validity: this.calculateValidityScore(allIssues),
        uniqueness: this.calculateUniquenessScore(allIssues),
        freshness: this.calculateFreshnessScore(allIssues),
      },
      summary: {
        totalRecords,
        recordsWithIssues,
        totalIssues: allIssues.length,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
      },
      entityBreakdown,
      trends,
      recommendations,
    };
  }

  /**
   * Calculate quality score based on issues
   */
  private calculateQualityScore(totalRecords: number, issues: DataQualityIssue[]): number {
    if (totalRecords === 0) return 100;

    let penalty = 0;
    for (const issue of issues) {
      penalty += this.getSeverityWeight(issue.severity);
    }

    const maxPenalty = totalRecords * 10; // Maximum possible penalty
    const score = Math.max(0, 100 - (penalty / maxPenalty) * 100);
    
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get severity weight for scoring
   */
  private getSeverityWeight(severity: string): number {
    const weights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1,
    };
    return weights[severity] || 1;
  }

  // Additional helper methods would continue here...
  // (Due to length constraints, I'll continue with the key remaining methods)

  /**
   * Scheduled data quality validation
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledQualityValidation(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      this.logger.log('Running scheduled data quality validation');
      await this.runDataQualityValidation();
    } catch (error) {
      this.logger.error('Scheduled data quality validation failed:', error);
    }
  }

  /**
   * Get entities for validation
   */
  private async getEntitiesForValidation(entityType: string): Promise<any[]> {
    const tableName = this.getTableName(entityType);
    return await (this.prisma as any)[tableName].findMany({
      where: {
        // Only validate synced or active entities
        OR: [
          { sync_status: SyncStatus.SYNCED },
          { sync_status: { not: SyncStatus.ERROR } },
        ],
      },
      take: 10000, // Limit for performance
    });
  }

  /**
   * Get table name for entity type
   */
  private getTableName(entityType: string): string {
    const mapping = {
      user: 'user',
      organization: 'organization',
      class: 'class',
      enrollment: 'enrollment',
    };
    return mapping[entityType] || entityType;
  }

  /**
   * Get field value with dot notation support
   */
  private getFieldValue(entity: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], entity);
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): ValidationConfig {
    return {
      enabled: true,
      schedule: '0 */6 * * *',
      rules: this.defaultRules,
      notifications: {
        enabled: true,
        channels: ['log'],
        thresholds: {
          criticalIssues: 5,
          scoreThreshold: 80,
        },
      },
      reporting: {
        enabled: true,
        frequency: 'daily',
        recipients: [],
        includeDetails: false,
      },
      remediation: {
        autoFix: false,
        fixableRules: [],
        requireApproval: true,
      },
    };
  }

  // Score calculation methods
  private calculateCompletenessScore(issues: DataQualityIssue[]): number {
    const completenessIssues = issues.filter(i => 
      i.ruleId.includes('required') || i.message.includes('missing')
    );
    return Math.max(0, 100 - completenessIssues.length * 2);
  }

  private calculateAccuracyScore(issues: DataQualityIssue[]): number {
    const accuracyIssues = issues.filter(i => 
      i.ruleId.includes('format') || i.ruleId.includes('range')
    );
    return Math.max(0, 100 - accuracyIssues.length * 3);
  }

  private calculateConsistencyScore(issues: DataQualityIssue[]): number {
    const consistencyIssues = issues.filter(i => 
      i.ruleId.includes('relationship') || i.message.includes('inconsistent')
    );
    return Math.max(0, 100 - consistencyIssues.length * 4);
  }

  private calculateValidityScore(issues: DataQualityIssue[]): number {
    const validityIssues = issues.filter(i => 
      i.ruleId.includes('format') || i.ruleId.includes('custom')
    );
    return Math.max(0, 100 - validityIssues.length * 3);
  }

  private calculateUniquenessScore(issues: DataQualityIssue[]): number {
    const uniquenessIssues = issues.filter(i => i.ruleId.includes('unique'));
    return Math.max(0, 100 - uniquenessIssues.length * 5);
  }

  private calculateFreshnessScore(issues: DataQualityIssue[]): number {
    const freshnessIssues = issues.filter(i => i.ruleId.includes('freshness'));
    return Math.max(0, 100 - freshnessIssues.length * 2);
  }

  /**
   * Store quality report in database
   */
  private async storeQualityReport(report: DataQualityReport): Promise<void> {
    try {
      await this.redis.setex(
        `data-quality:report:${report.id}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(report)
      );

      // Also store latest report reference
      await this.redis.setex(
        'data-quality:latest-report',
        24 * 60 * 60,
        report.id
      );
    } catch (error) {
      this.logger.error('Failed to store quality report:', error);
    }
  }

  /**
   * Get quality trends
   */
  private async getQualityTrends(timeframe: { start: Date; end: Date }): Promise<any> {
    // Placeholder - would implement historical data retrieval
    return {
      scoreHistory: [],
      issueHistory: [],
    };
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(issues: DataQualityIssue[], score: number): Promise<any[]> {
    const recommendations = [];

    // Critical issues recommendation
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push({
        type: 'critical_issues',
        priority: 'critical',
        message: `${criticalIssues.length} critical data quality issues detected`,
        action: 'Immediately review and fix critical issues',
        impact: 'May cause integration failures or data corruption',
      });
    }

    // Score-based recommendations
    if (score < 80) {
      recommendations.push({
        type: 'low_quality_score',
        priority: 'high',
        message: `Data quality score is below threshold (${score}%)`,
        action: 'Review validation rules and implement data cleanup',
        impact: 'May affect system reliability and user experience',
      });
    }

    return recommendations;
  }

  /**
   * Process notifications
   */
  private async processNotifications(report: DataQualityReport): Promise<void> {
    if (!this.config.notifications.enabled) return;

    const { criticalIssues } = report.summary;
    const { scoreThreshold, criticalIssues: criticalThreshold } = this.config.notifications.thresholds;

    const shouldNotify = 
      criticalIssues >= criticalThreshold || 
      report.overallScore < scoreThreshold;

    if (shouldNotify) {
      this.eventEmitter.emit('data.quality.alert', {
        report,
        severity: criticalIssues > 0 ? 'critical' : 'warning',
        message: `Data quality alert: ${criticalIssues} critical issues, score: ${report.overallScore}%`,
      });
    }
  }
}
