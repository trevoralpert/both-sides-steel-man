import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditConfigService } from './audit-config.service';

export interface AuditContext {
  actorId?: string;
  actorType?: 'user' | 'system' | 'webhook';
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  additionalMetadata?: Record<string, any>;
}

export interface ChangeLog {
  field: string;
  oldValue: any;
  newValue: any;
  action: 'added' | 'updated' | 'removed';
}

export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: string;
  changes?: ChangeLog[];
  context?: AuditContext;
  sanitizedChanges?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // Sensitive fields that should be masked or excluded from audit logs
  private readonly sensitiveFields = [
    'password',
    'password_hash',
    'token',
    'refresh_token',
    'access_token',
    'api_key',
    'secret',
    'private_key',
    'ssn',
    'social_security_number',
    'credit_card',
    'bank_account'
  ];

  // Fields that should be completely excluded from audit logs
  private readonly excludeFields = [
    'password_hash',
    'refresh_token',
    'private_key'
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditConfig: AuditConfigService
  ) {}

  /**
   * Log a profile change with detailed tracking
   */
  async logProfileChange(
    profileId: string,
    action: 'create' | 'update' | 'delete' | 'deactivate',
    oldData: any = null,
    newData: any = null,
    context: AuditContext = {}
  ): Promise<void> {
    try {
      const changes = this.generateChanges(oldData, newData);
      const sanitizedChanges = this.sanitizeChanges(changes);
      
      await this.logEntry({
        entityType: 'profile',
        entityId: profileId,
        action,
        changes: sanitizedChanges,
        context
      });

      this.logger.log(`Profile ${action} logged for ID: ${profileId}`);
    } catch (error) {
      this.logger.error(`Failed to log profile ${action} for ID: ${profileId}`, error);
      // Don't throw - audit logging should not break main functionality
    }
  }

  /**
   * Log a user action with context
   */
  async logUserAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, any> = {},
    context: AuditContext = {}
  ): Promise<void> {
    try {
      await this.logEntry({
        entityType,
        entityId,
        action,
        context: {
          ...context,
          actorId: userId,
          actorType: context.actorType || 'user',
          additionalMetadata: metadata
        }
      });

      this.logger.log(`User action ${action} logged for user: ${userId}, entity: ${entityType}:${entityId}`);
    } catch (error) {
      this.logger.error(`Failed to log user action ${action} for user: ${userId}`, error);
    }
  }

  /**
   * Log bulk operations
   */
  async logBulkOperation(
    entityType: string,
    action: string,
    entityIds: string[],
    metadata: Record<string, any> = {},
    context: AuditContext = {}
  ): Promise<void> {
    try {
      const bulkLogEntries = entityIds.map(entityId => ({
        entity_type: entityType,
        entity_id: entityId,
        action: `bulk_${action}`,
        changes: null,
        metadata: {
          bulk_operation: true,
          total_entities: entityIds.length,
          ...metadata,
          ...context.additionalMetadata
        } as Prisma.JsonObject,
        actor_id: context.actorId,
        actor_type: context.actorType,
        created_at: new Date()
      }));

      await this.prisma.auditLog.createMany({
        data: bulkLogEntries
      });

      this.logger.log(`Bulk ${action} logged for ${entityIds.length} ${entityType} entities`);
    } catch (error) {
      this.logger.error(`Failed to log bulk ${action} for ${entityType}`, error);
    }
  }

  /**
   * Query audit logs with filtering and pagination
   */
  async queryLogs(filters: {
    entityType?: string;
    entityId?: string;
    action?: string;
    actorId?: string;
    actorType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'entity_type' | 'action';
    orderDirection?: 'asc' | 'desc';
  }) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.entityType) where.entity_type = filters.entityType;
    if (filters.entityId) where.entity_id = filters.entityId;
    if (filters.action) where.action = filters.action;
    if (filters.actorId) where.actor_id = filters.actorId;
    if (filters.actorType) where.actor_type = filters.actorType;
    
    if (filters.dateFrom || filters.dateTo) {
      where.created_at = {};
      if (filters.dateFrom) where.created_at.gte = filters.dateFrom;
      if (filters.dateTo) where.created_at.lte = filters.dateTo;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { [filters.orderBy || 'created_at']: filters.orderDirection || 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      data: logs,
      total,
      page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
      totalPages: Math.ceil(total / (filters.limit || 50))
    };
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(entityType: string, entityId: string, limit = 20) {
    return this.prisma.auditLog.findMany({
      where: {
        entity_type: entityType,
        entity_id: entityId
      },
      orderBy: { created_at: 'desc' },
      take: limit
    });
  }

  /**
   * Generate audit report for compliance
   */
  async generateAuditReport(
    dateFrom: Date,
    dateTo: Date,
    entityTypes?: string[],
    format: 'summary' | 'detailed' = 'summary'
  ) {
    const where: Prisma.AuditLogWhereInput = {
      created_at: {
        gte: dateFrom,
        lte: dateTo
      }
    };

    if (entityTypes && entityTypes.length > 0) {
      where.entity_type = { in: entityTypes };
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });

    const summary = {
      totalActions: logs.length,
      dateRange: { from: dateFrom, to: dateTo },
      actionBreakdown: {} as Record<string, number>,
      entityBreakdown: {} as Record<string, number>,
      userBreakdown: {} as Record<string, number>,
      timeline: format === 'detailed' ? logs : undefined
    };

    logs.forEach(log => {
      // Action breakdown
      summary.actionBreakdown[log.action] = (summary.actionBreakdown[log.action] || 0) + 1;
      
      // Entity breakdown
      summary.entityBreakdown[log.entity_type] = (summary.entityBreakdown[log.entity_type] || 0) + 1;
      
      // User breakdown
      if (log.actor_id) {
        summary.userBreakdown[log.actor_id] = (summary.userBreakdown[log.actor_id] || 0) + 1;
      }
    });

    return summary;
  }

  /**
   * Clean up old audit logs based on configuration-driven retention policies
   */
  async cleanupOldLogs(entityType?: string, actionType?: string): Promise<{
    deletedCount: number;
    retentionDays: number;
    cutoffDate: Date;
  }> {
    const retentionDays = this.auditConfig.getRetentionDays(entityType || 'system', actionType);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let whereClause: any = {
      created_at: {
        lt: cutoffDate
      }
    };

    // Add entity type filter if specified
    if (entityType) {
      whereClause.entity_type = entityType;
    }

    // Add action type filter if specified
    if (actionType) {
      whereClause.action = actionType;
    }

    const result = await this.prisma.auditLog.deleteMany({
      where: whereClause
    });

    this.logger.log(
      `Cleaned up ${result.count} audit logs older than ${retentionDays} days ` +
      `(entityType: ${entityType || 'all'}, actionType: ${actionType || 'all'})`
    );
    
    return {
      deletedCount: result.count,
      retentionDays,
      cutoffDate,
    };
  }

  /**
   * Core audit logging method
   */
  private async logEntry(entry: AuditLogEntry): Promise<void> {
    const metadata: any = {};
    
    if (entry.context?.ipAddress) metadata.ip_address = entry.context.ipAddress;
    if (entry.context?.userAgent) metadata.user_agent = entry.context.userAgent;
    if (entry.context?.sessionId) metadata.session_id = entry.context.sessionId;
    if (entry.context?.additionalMetadata) Object.assign(metadata, entry.context.additionalMetadata);

    await this.prisma.auditLog.create({
      data: {
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        action: entry.action,
        changes: entry.changes as Prisma.JsonObject || null,
        metadata: Object.keys(metadata).length > 0 ? metadata as Prisma.JsonObject : null,
        actor_id: entry.context?.actorId || null,
        actor_type: entry.context?.actorType || null
      }
    });
  }

  /**
   * Generate changes between old and new data
   */
  private generateChanges(oldData: any, newData: any): ChangeLog[] {
    const changes: ChangeLog[] = [];
    
    if (!oldData && newData) {
      // Create operation - log all new fields
      Object.entries(newData).forEach(([field, value]) => {
        if (!this.excludeFields.includes(field) && value !== null && value !== undefined) {
          changes.push({
            field,
            oldValue: null,
            newValue: value,
            action: 'added'
          });
        }
      });
    } else if (oldData && newData) {
      // Update operation - compare fields
      const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      
      allFields.forEach(field => {
        if (this.excludeFields.includes(field)) return;
        
        const oldValue = oldData[field];
        const newValue = newData[field];
        
        if (oldValue !== newValue) {
          let action: 'added' | 'updated' | 'removed';
          
          if (oldValue === null || oldValue === undefined) {
            action = 'added';
          } else if (newValue === null || newValue === undefined) {
            action = 'removed';
          } else {
            action = 'updated';
          }
          
          changes.push({
            field,
            oldValue,
            newValue,
            action
          });
        }
      });
    } else if (oldData && !newData) {
      // Delete operation - log removal
      changes.push({
        field: '_entity',
        oldValue: 'exists',
        newValue: null,
        action: 'removed'
      });
    }
    
    return changes;
  }

  /**
   * Sanitize changes to protect sensitive data using configuration-based privacy controls
   */
  private sanitizeChanges(changes: ChangeLog[]): ChangeLog[] {
    return changes.map(change => {
      // Check if field should be excluded completely
      if (this.auditConfig.isExcludedField(change.field)) {
        return {
          ...change,
          oldValue: '[EXCLUDED]',
          newValue: '[EXCLUDED]'
        };
      }
      
      // Apply appropriate masking based on field type and configuration
      const maskedOldValue = this.auditConfig.applyMasking(change.field, change.oldValue);
      const maskedNewValue = this.auditConfig.applyMasking(change.field, change.newValue);
      
      // Only modify if masking was applied
      if (maskedOldValue !== change.oldValue || maskedNewValue !== change.newValue) {
        return {
          ...change,
          oldValue: maskedOldValue,
          newValue: maskedNewValue
        };
      }
      
      return change;
    });
  }
}
