/**
 * Security Event Monitoring and Alerting System
 * Real-time security monitoring, threat detection, and automated response
 */

import { auditLogger, AuditEvent, AuditSeverity } from '../audit/audit-logger';

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: AuditSeverity;
  category: SecurityCategory;
  conditions: SecurityCondition[];
  actions: SecurityAction[];
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
  triggerCount: number;
  metadata: {
    createdBy: string;
    createdAt: Date;
    lastModified: Date;
    version: string;
  };
}

export type SecurityCategory = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_exfiltration'
  | 'privilege_escalation'
  | 'suspicious_behavior'
  | 'system_integrity'
  | 'compliance_violation';

export interface SecurityCondition {
  type: 'threshold' | 'pattern' | 'anomaly' | 'time_based' | 'geo_based';
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'matches' | 'in_range';
  value: any;
  timeWindow?: number; // minutes
  aggregation?: 'count' | 'sum' | 'avg' | 'max' | 'min';
}

export interface SecurityAction {
  type: 'alert' | 'block' | 'log' | 'notify' | 'escalate' | 'quarantine';
  target: string;
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AuditSeverity;
  category: SecurityCategory;
  title: string;
  description: string;
  triggeredAt: Date;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  events: AuditEvent[];
  context: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    resource?: string;
  };
  impact: {
    affectedUsers: string[];
    affectedResources: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    businessImpact: string;
  };
  response: {
    actionsTriggered: SecurityAction[];
    responseTime: number; // milliseconds
    automaticActions: string[];
    manualActions: string[];
  };
  resolution?: {
    resolvedAt: Date;
    resolvedBy: string;
    resolution: string;
    preventionMeasures: string[];
  };
}

export interface SecurityMetrics {
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
    resolvedAlerts: number;
    averageResponseTime: number;
    falsePositiveRate: number;
  };
  trends: Array<{
    category: SecurityCategory;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
  }>;
  topThreats: Array<{
    type: string;
    count: number;
    severity: AuditSeverity;
    lastOccurrence: Date;
  }>;
  userActivity: Array<{
    userId: string;
    riskScore: number;
    alertCount: number;
    lastActivity: Date;
  }>;
}

export class SecurityMonitor {
  private rules: Map<string, SecurityRule> = new Map();
  private alerts: Map<string, SecurityAlert> = new Map();
  private eventBuffer: AuditEvent[] = [];
  private monitoringActive = false;
  private checkInterval = 30000; // 30 seconds

  constructor() {
    this.initializeSecurityMonitor();
  }

  private initializeSecurityMonitor(): void {
    console.log('🛡️ Initializing Security Monitoring System');
    
    // Load default security rules
    this.loadDefaultRules();
    
    // Start monitoring
    this.startMonitoring();
    
    // Set up alert processing
    this.startAlertProcessing();
    
    console.log('🛡️ Security monitoring active');
  }

  /**
   * Add a security rule
   */
  addRule(rule: Omit<SecurityRule, 'id' | 'triggerCount' | 'metadata'>): SecurityRule {
    const securityRule: SecurityRule = {
      ...rule,
      id: this.generateRuleId(),
      triggerCount: 0,
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        version: '1.0'
      }
    };

    this.rules.set(securityRule.id, securityRule);
    console.log(`📋 Added security rule: ${securityRule.name}`);
    
    return securityRule;
  }

  /**
   * Process audit event for security monitoring
   */
  async processEvent(event: AuditEvent): Promise<SecurityAlert[]> {
    const triggeredAlerts: SecurityAlert[] = [];

    // Check each rule against the event
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown period
      if (rule.lastTriggered && this.isInCooldown(rule)) {
        continue;
      }

      // Evaluate rule conditions
      if (await this.evaluateRule(rule, event)) {
        const alert = await this.createAlert(rule, event);
        triggeredAlerts.push(alert);
        
        // Update rule trigger info
        rule.lastTriggered = new Date();
        rule.triggerCount++;
        
        // Execute rule actions
        await this.executeActions(rule.actions, alert);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Get security alerts
   */
  getAlerts(
    filters: {
      status?: SecurityAlert['status'];
      severity?: AuditSeverity;
      category?: SecurityCategory;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): SecurityAlert[] {
    let alerts = Array.from(this.alerts.values());

    // Apply filters
    if (filters.status) {
      alerts = alerts.filter(alert => alert.status === filters.status);
    }
    if (filters.severity) {
      alerts = alerts.filter(alert => alert.severity === filters.severity);
    }
    if (filters.category) {
      alerts = alerts.filter(alert => alert.category === filters.category);
    }
    if (filters.startDate) {
      alerts = alerts.filter(alert => alert.triggeredAt >= filters.startDate!);
    }
    if (filters.endDate) {
      alerts = alerts.filter(alert => alert.triggeredAt <= filters.endDate!);
    }

    // Sort by trigger time (newest first)
    alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    // Apply limit
    if (filters.limit) {
      alerts = alerts.slice(0, filters.limit);
    }

    return alerts;
  }

  /**
   * Resolve security alert
   */
  async resolveAlert(
    alertId: string,
    resolution: {
      resolvedBy: string;
      resolution: string;
      preventionMeasures: string[];
    }
  ): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.resolution = {
      resolvedAt: new Date(),
      ...resolution
    };

    console.log(`✅ Resolved security alert: ${alert.title}`);
    return true;
  }

  /**
   * Generate security metrics
   */
  generateMetrics(timeRange: { start: Date; end: Date }): SecurityMetrics {
    const alerts = this.getAlerts({
      startDate: timeRange.start,
      endDate: timeRange.end
    });

    const summary = {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      highAlerts: alerts.filter(a => a.severity === 'high').length,
      mediumAlerts: alerts.filter(a => a.severity === 'medium').length,
      lowAlerts: alerts.filter(a => a.severity === 'low').length,
      resolvedAlerts: alerts.filter(a => a.status === 'resolved').length,
      averageResponseTime: this.calculateAverageResponseTime(alerts),
      falsePositiveRate: this.calculateFalsePositiveRate(alerts)
    };

    const trends = this.calculateTrends(alerts, timeRange);
    const topThreats = this.identifyTopThreats(alerts);
    const userActivity = this.analyzeUserActivity(alerts);

    return {
      timeRange,
      summary,
      trends,
      topThreats,
      userActivity
    };
  }

  /**
   * Monitor for failed authentication attempts
   */
  private async monitorFailedLogins(): Promise<void> {
    const rule: SecurityRule = {
      id: 'failed_login_threshold',
      name: 'Multiple Failed Login Attempts',
      description: 'Detects multiple failed login attempts from the same IP or user',
      enabled: true,
      severity: 'high',
      category: 'authentication',
      conditions: [
        {
          type: 'threshold',
          field: 'action',
          operator: 'equals',
          value: 'login_failed',
          timeWindow: 15,
          aggregation: 'count'
        }
      ],
      actions: [
        {
          type: 'alert',
          target: 'security_team',
          parameters: { channel: 'email', urgency: 'high' },
          priority: 'high'
        },
        {
          type: 'block',
          target: 'ip_address',
          parameters: { duration: 30, unit: 'minutes' },
          priority: 'high'
        }
      ],
      cooldownPeriod: 5,
      triggerCount: 0,
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        version: '1.0'
      }
    };

    this.rules.set(rule.id, rule);
  }

  /**
   * Monitor for unusual data access patterns
   */
  private async monitorDataAccess(): Promise<void> {
    const rule: SecurityRule = {
      id: 'unusual_data_access',
      name: 'Unusual Data Access Pattern',
      description: 'Detects unusual patterns in data access behavior',
      enabled: true,
      severity: 'medium',
      category: 'data_access',
      conditions: [
        {
          type: 'anomaly',
          field: 'resource.type',
          operator: 'greater_than',
          value: 'baseline',
          timeWindow: 60,
          aggregation: 'count'
        }
      ],
      actions: [
        {
          type: 'alert',
          target: 'data_protection_team',
          parameters: { channel: 'slack', urgency: 'medium' },
          priority: 'medium'
        },
        {
          type: 'log',
          target: 'audit_system',
          parameters: { level: 'warning' },
          priority: 'low'
        }
      ],
      cooldownPeriod: 30,
      triggerCount: 0,
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        version: '1.0'
      }
    };

    this.rules.set(rule.id, rule);
  }

  /**
   * Monitor for privilege escalation attempts
   */
  private async monitorPrivilegeEscalation(): Promise<void> {
    const rule: SecurityRule = {
      id: 'privilege_escalation',
      name: 'Privilege Escalation Attempt',
      description: 'Detects attempts to escalate user privileges',
      enabled: true,
      severity: 'critical',
      category: 'privilege_escalation',
      conditions: [
        {
          type: 'pattern',
          field: 'action',
          operator: 'matches',
          value: '(admin|root|sudo|elevate)',
          timeWindow: 5
        }
      ],
      actions: [
        {
          type: 'alert',
          target: 'security_team',
          parameters: { channel: 'phone', urgency: 'critical' },
          priority: 'critical'
        },
        {
          type: 'block',
          target: 'user_session',
          parameters: { immediate: true },
          priority: 'critical'
        },
        {
          type: 'escalate',
          target: 'incident_response',
          parameters: { level: 'security_incident' },
          priority: 'critical'
        }
      ],
      cooldownPeriod: 1,
      triggerCount: 0,
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        version: '1.0'
      }
    };

    this.rules.set(rule.id, rule);
  }

  // Helper methods
  private async evaluateRule(rule: SecurityRule, event: AuditEvent): Promise<boolean> {
    for (const condition of rule.conditions) {
      if (!await this.evaluateCondition(condition, event)) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(condition: SecurityCondition, event: AuditEvent): Promise<boolean> {
    const fieldValue = this.getFieldValue(event, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'matches':
        return new RegExp(String(condition.value), 'i').test(String(fieldValue));
      default:
        return false;
    }
  }

  private getFieldValue(event: AuditEvent, field: string): any {
    const parts = field.split('.');
    let value: any = event;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  private async createAlert(rule: SecurityRule, event: AuditEvent): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      category: rule.category,
      title: `Security Alert: ${rule.name}`,
      description: rule.description,
      triggeredAt: new Date(),
      status: 'open',
      events: [event],
      context: {
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        sessionId: event.sessionId,
        resource: event.resource.type
      },
      impact: {
        affectedUsers: event.userId ? [event.userId] : [],
        affectedResources: [event.resource.type],
        riskLevel: this.mapSeverityToRisk(rule.severity),
        businessImpact: this.assessBusinessImpact(rule.category, rule.severity)
      },
      response: {
        actionsTriggered: rule.actions,
        responseTime: 0,
        automaticActions: [],
        manualActions: []
      }
    };

    this.alerts.set(alert.id, alert);
    console.log(`🚨 Security Alert Created: ${alert.title} (${alert.severity})`);
    
    return alert;
  }

  private async executeActions(actions: SecurityAction[], alert: SecurityAlert): Promise<void> {
    const startTime = Date.now();
    
    for (const action of actions) {
      try {
        await this.executeAction(action, alert);
        alert.response.automaticActions.push(`${action.type}: ${action.target}`);
      } catch (error) {
        console.error(`❌ Failed to execute security action: ${action.type}`, error);
      }
    }
    
    alert.response.responseTime = Date.now() - startTime;
  }

  private async executeAction(action: SecurityAction, alert: SecurityAlert): Promise<void> {
    switch (action.type) {
      case 'alert':
        await this.sendAlert(alert, action);
        break;
      case 'block':
        await this.blockAccess(alert, action);
        break;
      case 'log':
        await this.logSecurityEvent(alert, action);
        break;
      case 'notify':
        await this.sendNotification(alert, action);
        break;
      case 'escalate':
        await this.escalateIncident(alert, action);
        break;
      case 'quarantine':
        await this.quarantineResource(alert, action);
        break;
    }
  }

  private async sendAlert(alert: SecurityAlert, action: SecurityAction): Promise<void> {
    console.log(`📧 Sending security alert: ${alert.title} via ${action.parameters.channel}`);
    // Implementation would send actual alerts
  }

  private async blockAccess(alert: SecurityAlert, action: SecurityAction): Promise<void> {
    console.log(`🚫 Blocking access: ${action.target} for ${action.parameters.duration} ${action.parameters.unit}`);
    // Implementation would block access
  }

  private async logSecurityEvent(alert: SecurityAlert, action: SecurityAction): Promise<void> {
    await auditLogger.logSecurityEvent(
      `security_alert_${alert.category}`,
      alert.severity,
      {
        alertId: alert.id,
        ruleName: alert.ruleName,
        context: alert.context
      },
      {
        userId: alert.context.userId,
        ipAddress: alert.context.ipAddress || 'unknown',
        userAgent: alert.context.userAgent || 'unknown'
      }
    );
  }

  private async sendNotification(alert: SecurityAlert, action: SecurityAction): Promise<void> {
    console.log(`🔔 Sending notification: ${alert.title}`);
    // Implementation would send notifications
  }

  private async escalateIncident(alert: SecurityAlert, action: SecurityAction): Promise<void> {
    console.log(`⬆️ Escalating incident: ${alert.title} to ${action.parameters.level}`);
    // Implementation would escalate to incident response
  }

  private async quarantineResource(alert: SecurityAlert, action: SecurityAction): Promise<void> {
    console.log(`🔒 Quarantining resource: ${action.target}`);
    // Implementation would quarantine resources
  }

  private isInCooldown(rule: SecurityRule): boolean {
    if (!rule.lastTriggered) return false;
    
    const cooldownMs = rule.cooldownPeriod * 60 * 1000;
    return Date.now() - rule.lastTriggered.getTime() < cooldownMs;
  }

  private mapSeverityToRisk(severity: AuditSeverity): SecurityAlert['impact']['riskLevel'] {
    const mapping: Record<AuditSeverity, SecurityAlert['impact']['riskLevel']> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical'
    };
    return mapping[severity];
  }

  private assessBusinessImpact(category: SecurityCategory, severity: AuditSeverity): string {
    const impacts: Record<SecurityCategory, Record<AuditSeverity, string>> = {
      'authentication': {
        'low': 'Minimal impact on user access',
        'medium': 'Potential unauthorized access attempts',
        'high': 'Multiple failed authentication attempts detected',
        'critical': 'Possible account compromise or brute force attack'
      },
      'data_access': {
        'low': 'Normal data access patterns',
        'medium': 'Unusual data access detected',
        'high': 'Potential data breach or unauthorized access',
        'critical': 'Confirmed data breach or massive data exfiltration'
      },
      'privilege_escalation': {
        'low': 'Minor privilege request',
        'medium': 'Unusual privilege access attempt',
        'high': 'Potential privilege escalation attack',
        'critical': 'Confirmed privilege escalation or system compromise'
      },
      'system_integrity': {
        'low': 'Minor system anomaly',
        'medium': 'System integrity concern',
        'high': 'Potential system compromise',
        'critical': 'Confirmed system breach or malware detection'
      },
      'compliance_violation': {
        'low': 'Minor compliance deviation',
        'medium': 'Compliance policy violation',
        'high': 'Significant compliance breach',
        'critical': 'Major regulatory compliance violation'
      },
      'data_exfiltration': {
        'low': 'Normal data export',
        'medium': 'Unusual data export pattern',
        'high': 'Potential data theft',
        'critical': 'Confirmed data exfiltration'
      },
      'authorization': {
        'low': 'Normal authorization check',
        'medium': 'Authorization anomaly',
        'high': 'Authorization bypass attempt',
        'critical': 'Confirmed authorization breach'
      },
      'suspicious_behavior': {
        'low': 'Minor behavioral anomaly',
        'medium': 'Suspicious user behavior',
        'high': 'Highly suspicious activity',
        'critical': 'Confirmed malicious behavior'
      }
    };

    return impacts[category]?.[severity] || 'Unknown business impact';
  }

  private calculateAverageResponseTime(alerts: SecurityAlert[]): number {
    if (alerts.length === 0) return 0;
    
    const totalResponseTime = alerts.reduce((sum, alert) => sum + alert.response.responseTime, 0);
    return totalResponseTime / alerts.length;
  }

  private calculateFalsePositiveRate(alerts: SecurityAlert[]): number {
    if (alerts.length === 0) return 0;
    
    const falsePositives = alerts.filter(alert => alert.status === 'false_positive').length;
    return falsePositives / alerts.length;
  }

  private calculateTrends(alerts: SecurityAlert[], timeRange: { start: Date; end: Date }): SecurityMetrics['trends'] {
    // Implementation would calculate actual trends
    return [];
  }

  private identifyTopThreats(alerts: SecurityAlert[]): SecurityMetrics['topThreats'] {
    const threatCounts: Record<string, { count: number; severity: AuditSeverity; lastOccurrence: Date }> = {};
    
    alerts.forEach(alert => {
      const key = alert.category;
      if (!threatCounts[key]) {
        threatCounts[key] = { count: 0, severity: alert.severity, lastOccurrence: alert.triggeredAt };
      }
      threatCounts[key].count++;
      if (alert.triggeredAt > threatCounts[key].lastOccurrence) {
        threatCounts[key].lastOccurrence = alert.triggeredAt;
      }
    });

    return Object.entries(threatCounts)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private analyzeUserActivity(alerts: SecurityAlert[]): SecurityMetrics['userActivity'] {
    const userActivity: Record<string, { alertCount: number; lastActivity: Date; riskScore: number }> = {};
    
    alerts.forEach(alert => {
      if (alert.context.userId) {
        const userId = alert.context.userId;
        if (!userActivity[userId]) {
          userActivity[userId] = { alertCount: 0, lastActivity: alert.triggeredAt, riskScore: 0 };
        }
        userActivity[userId].alertCount++;
        if (alert.triggeredAt > userActivity[userId].lastActivity) {
          userActivity[userId].lastActivity = alert.triggeredAt;
        }
        // Simple risk score calculation
        const severityScore = { low: 1, medium: 2, high: 3, critical: 4 }[alert.severity];
        userActivity[userId].riskScore += severityScore;
      }
    });

    return Object.entries(userActivity)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);
  }

  private loadDefaultRules(): void {
    this.monitorFailedLogins();
    this.monitorDataAccess();
    this.monitorPrivilegeEscalation();
  }

  private startMonitoring(): void {
    this.monitoringActive = true;
    console.log('🔍 Security monitoring started');
  }

  private startAlertProcessing(): void {
    setInterval(() => {
      this.processAlertQueue();
    }, this.checkInterval);
  }

  private processAlertQueue(): void {
    // Process any queued events or alerts
    console.log('🔄 Processing security alert queue...');
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

export default {
  SecurityMonitor,
  securityMonitor
};
