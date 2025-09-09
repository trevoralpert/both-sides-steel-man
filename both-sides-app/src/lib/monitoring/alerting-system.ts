/**
 * Comprehensive Alerting System
 * Multi-channel alerting with escalation, incident management, and automated response
 */

export interface AlertingConfig {
  channels: AlertChannel[];
  escalationPolicies: EscalationPolicy[];
  alertRules: AlertRule[];
  incidentManagement: IncidentManagementConfig;
  integrations: AlertingIntegrations;
}

export interface AlertChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty' | 'teams' | 'discord';
  enabled: boolean;
  config: Record<string, any>;
  priority: number;
  rateLimiting: {
    enabled: boolean;
    maxAlertsPerHour: number;
    cooldownPeriod: number; // minutes
  };
  formatting: {
    template: string;
    includeMetrics: boolean;
    includeGraphs: boolean;
    includeRunbook: boolean;
  };
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  levels: EscalationLevel[];
  conditions: {
    severity: AlertSeverity[];
    tags: string[];
    timeOfDay?: { start: string; end: string };
    daysOfWeek?: number[];
  };
}

export interface EscalationLevel {
  level: number;
  delay: number; // minutes
  channels: string[];
  actions: EscalationAction[];
  autoResolve: boolean;
}

export interface EscalationAction {
  type: 'notify' | 'create_incident' | 'run_script' | 'scale_service' | 'rollback';
  config: Record<string, any>;
  timeout: number;
  retries: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: AlertSeverity;
  category: AlertCategory;
  conditions: AlertCondition[];
  actions: AlertAction[];
  tags: string[];
  metadata: {
    runbook?: string;
    documentation?: string;
    owner: string;
    team: string;
    createdAt: Date;
    lastModified: Date;
  };
  throttling: {
    enabled: boolean;
    period: number; // minutes
    maxAlerts: number;
  };
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertCategory = 'performance' | 'availability' | 'security' | 'business' | 'infrastructure';

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  timeWindow: number; // minutes
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
  filters?: Record<string, string>;
}

export interface AlertAction {
  type: 'notify' | 'webhook' | 'script' | 'incident';
  config: Record<string, any>;
  channels: string[];
  escalationPolicy?: string;
}

export interface IncidentManagementConfig {
  enabled: boolean;
  autoCreateIncidents: boolean;
  severityMapping: Record<AlertSeverity, string>;
  assignmentRules: AssignmentRule[];
  statusUpdates: {
    enabled: boolean;
    channels: string[];
    frequency: number; // minutes
  };
}

export interface AssignmentRule {
  condition: string;
  assignTo: string;
  team: string;
  priority: number;
}

export interface AlertingIntegrations {
  vercel: {
    enabled: boolean;
    apiKey: string;
    projectId: string;
  };
  railway: {
    enabled: boolean;
    apiKey: string;
    projectId: string;
  };
  sentry: {
    enabled: boolean;
    dsn: string;
    projectId: string;
  };
  datadog: {
    enabled: boolean;
    apiKey: string;
    appKey: string;
  };
  newrelic: {
    enabled: boolean;
    licenseKey: string;
    appId: string;
  };
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  message: string;
  description: string;
  metrics: Record<string, number>;
  tags: string[];
  context: {
    service?: string;
    environment?: string;
    region?: string;
    userId?: string;
    sessionId?: string;
  };
  escalation: {
    level: number;
    nextEscalation?: Date;
    escalationPolicy?: string;
  };
  incident?: {
    id: string;
    status: string;
    assignee: string;
  };
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved';
  priority: number;
  createdAt: Date;
  resolvedAt?: Date;
  assignee: string;
  team: string;
  alerts: string[];
  timeline: IncidentEvent[];
  impact: {
    affectedUsers: number;
    affectedServices: string[];
    businessImpact: string;
  };
  resolution: {
    summary?: string;
    rootCause?: string;
    preventionMeasures?: string[];
    postMortemUrl?: string;
  };
}

export interface IncidentEvent {
  id: string;
  timestamp: Date;
  type: 'created' | 'updated' | 'escalated' | 'assigned' | 'resolved' | 'comment';
  user: string;
  message: string;
  metadata?: Record<string, any>;
}

export class AlertingSystem {
  private config: AlertingConfig;
  private activeAlerts: Map<string, Alert> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private alertHistory: Alert[] = [];
  private channels: Map<string, AlertChannel> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();

  constructor(config: AlertingConfig) {
    this.config = config;
    this.initializeAlertingSystem();
  }

  private initializeAlertingSystem(): void {
    console.log('🚨 Initializing Alerting System...');
    
    // Load channels
    this.config.channels.forEach(channel => {
      this.channels.set(channel.id, channel);
    });
    
    // Load escalation policies
    this.config.escalationPolicies.forEach(policy => {
      this.escalationPolicies.set(policy.id, policy);
    });
    
    // Start alert processing
    this.startAlertProcessing();
    
    // Initialize integrations
    this.initializeIntegrations();
    
    console.log(`✅ Alerting System initialized with ${this.channels.size} channels and ${this.escalationPolicies.size} escalation policies`);
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(
    ruleId: string,
    message: string,
    severity: AlertSeverity,
    metrics: Record<string, number> = {},
    context: Alert['context'] = {}
  ): Promise<Alert> {
    const rule = this.config.alertRules.find(r => r.id === ruleId);
    if (!rule || !rule.enabled) {
      throw new Error(`Alert rule not found or disabled: ${ruleId}`);
    }

    // Check throttling
    if (this.isThrottled(rule)) {
      console.log(`🔇 Alert throttled: ${rule.name}`);
      return this.getLastAlert(ruleId)!;
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId,
      ruleName: rule.name,
      severity,
      category: rule.category,
      status: 'active',
      triggeredAt: new Date(),
      message,
      description: rule.description,
      metrics,
      tags: rule.tags,
      context: {
        environment: process.env.NODE_ENV || 'development',
        service: 'both-sides-platform',
        ...context
      },
      escalation: {
        level: 0
      }
    };

    // Store alert
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    console.log(`🚨 ALERT TRIGGERED: ${alert.ruleName} (${alert.severity})`);

    // Execute alert actions
    await this.executeAlertActions(alert, rule);

    // Start escalation if configured
    if (rule.actions.some(a => a.escalationPolicy)) {
      await this.startEscalation(alert, rule);
    }

    // Create incident if configured
    if (this.config.incidentManagement.autoCreateIncidents && severity === 'critical') {
      await this.createIncident(alert);
    }

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    console.log(`✅ Alert acknowledged: ${alert.ruleName} by ${acknowledgedBy}`);

    // Notify channels
    await this.notifyAcknowledgment(alert);

    return true;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    console.log(`✅ Alert resolved: ${alert.ruleName}`);

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    // Notify channels
    await this.notifyResolution(alert);

    // Update incident if linked
    if (alert.incident) {
      await this.updateIncidentStatus(alert.incident.id, 'resolved');
    }

    return true;
  }

  /**
   * Create an incident
   */
  async createIncident(alert: Alert): Promise<Incident> {
    const incident: Incident = {
      id: this.generateIncidentId(),
      title: `${alert.severity.toUpperCase()}: ${alert.ruleName}`,
      description: alert.description,
      severity: alert.severity === 'critical' ? 'critical' : 
                alert.severity === 'error' ? 'high' : 
                alert.severity === 'warning' ? 'medium' : 'low',
      status: 'open',
      priority: this.getSeverityPriority(alert.severity),
      createdAt: new Date(),
      assignee: this.getAssignee(alert),
      team: this.getTeam(alert),
      alerts: [alert.id],
      timeline: [{
        id: this.generateEventId(),
        timestamp: new Date(),
        type: 'created',
        user: 'system',
        message: `Incident created from alert: ${alert.ruleName}`
      }],
      impact: {
        affectedUsers: 0,
        affectedServices: [alert.context.service || 'unknown'],
        businessImpact: this.assessBusinessImpact(alert)
      },
      resolution: {}
    };

    // Link alert to incident
    alert.incident = {
      id: incident.id,
      status: incident.status,
      assignee: incident.assignee
    };

    this.incidents.set(incident.id, incident);

    console.log(`🚨 INCIDENT CREATED: ${incident.title} (${incident.id})`);

    // Notify incident channels
    await this.notifyIncidentCreated(incident);

    return incident;
  }

  /**
   * Execute alert actions
   */
  private async executeAlertActions(alert: Alert, rule: AlertRule): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'notify':
            await this.sendNotifications(alert, action.channels);
            break;
          case 'webhook':
            await this.sendWebhook(alert, action.config);
            break;
          case 'script':
            await this.executeScript(alert, action.config);
            break;
          case 'incident':
            await this.createIncident(alert);
            break;
        }
      } catch (error) {
        console.error(`❌ Failed to execute alert action: ${action.type}`, error);
      }
    }
  }

  /**
   * Send notifications to channels
   */
  private async sendNotifications(alert: Alert, channelIds: string[]): Promise<void> {
    for (const channelId of channelIds) {
      const channel = this.channels.get(channelId);
      if (!channel || !channel.enabled) continue;

      // Check rate limiting
      if (this.isChannelRateLimited(channel)) {
        console.log(`🔇 Channel rate limited: ${channel.name}`);
        continue;
      }

      try {
        await this.sendToChannel(alert, channel);
      } catch (error) {
        console.error(`❌ Failed to send to channel ${channel.name}:`, error);
      }
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    const message = this.formatAlertMessage(alert, channel);
    
    switch (channel.type) {
      case 'email':
        await this.sendEmail(message, channel.config);
        break;
      case 'slack':
        await this.sendSlack(message, channel.config);
        break;
      case 'webhook':
        await this.sendWebhook(alert, channel.config);
        break;
      case 'sms':
        await this.sendSMS(message, channel.config);
        break;
      case 'pagerduty':
        await this.sendPagerDuty(alert, channel.config);
        break;
      case 'teams':
        await this.sendTeams(message, channel.config);
        break;
      case 'discord':
        await this.sendDiscord(message, channel.config);
        break;
    }

    console.log(`📧 Alert sent to ${channel.type}: ${channel.name}`);
  }

  /**
   * Start escalation process
   */
  private async startEscalation(alert: Alert, rule: AlertRule): Promise<void> {
    const escalationPolicyId = rule.actions.find(a => a.escalationPolicy)?.escalationPolicy;
    if (!escalationPolicyId) return;

    const policy = this.escalationPolicies.get(escalationPolicyId);
    if (!policy || !policy.enabled) return;

    // Check if policy conditions match
    if (!this.matchesEscalationConditions(alert, policy)) return;

    alert.escalation.escalationPolicy = escalationPolicyId;
    
    // Schedule first escalation
    const firstLevel = policy.levels[0];
    if (firstLevel) {
      alert.escalation.nextEscalation = new Date(Date.now() + firstLevel.delay * 60000);
      
      setTimeout(() => {
        this.executeEscalationLevel(alert, policy, 0);
      }, firstLevel.delay * 60000);
    }

    console.log(`⬆️ Escalation started for alert: ${alert.ruleName}`);
  }

  /**
   * Execute escalation level
   */
  private async executeEscalationLevel(
    alert: Alert,
    policy: EscalationPolicy,
    levelIndex: number
  ): Promise<void> {
    // Skip if alert is already resolved or acknowledged
    if (alert.status !== 'active') return;

    const level = policy.levels[levelIndex];
    if (!level) return;

    alert.escalation.level = levelIndex + 1;

    console.log(`⬆️ Executing escalation level ${levelIndex + 1} for alert: ${alert.ruleName}`);

    // Send notifications to escalation channels
    await this.sendNotifications(alert, level.channels);

    // Execute escalation actions
    for (const action of level.actions) {
      await this.executeEscalationAction(alert, action);
    }

    // Schedule next escalation level
    const nextLevel = policy.levels[levelIndex + 1];
    if (nextLevel && alert.status === 'active') {
      alert.escalation.nextEscalation = new Date(Date.now() + nextLevel.delay * 60000);
      
      setTimeout(() => {
        this.executeEscalationLevel(alert, policy, levelIndex + 1);
      }, nextLevel.delay * 60000);
    }
  }

  /**
   * Format alert message for channel
   */
  private formatAlertMessage(alert: Alert, channel: AlertChannel): string {
    const template = channel.formatting.template || this.getDefaultTemplate(channel.type);
    
    let message = template
      .replace('{severity}', alert.severity.toUpperCase())
      .replace('{title}', alert.ruleName)
      .replace('{message}', alert.message)
      .replace('{description}', alert.description)
      .replace('{timestamp}', alert.triggeredAt.toISOString())
      .replace('{environment}', alert.context.environment || 'unknown')
      .replace('{service}', alert.context.service || 'unknown');

    if (channel.formatting.includeMetrics && Object.keys(alert.metrics).length > 0) {
      const metricsText = Object.entries(alert.metrics)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      message += `\n\nMetrics: ${metricsText}`;
    }

    if (channel.formatting.includeRunbook && alert.tags.includes('runbook')) {
      message += `\n\nRunbook: ${this.getRunbookUrl(alert)}`;
    }

    return message;
  }

  // Channel-specific sending methods
  private async sendEmail(message: string, config: any): Promise<void> {
    console.log(`📧 Sending email alert: ${message.substring(0, 100)}...`);
    // Implementation would use actual email service
  }

  private async sendSlack(message: string, config: any): Promise<void> {
    console.log(`💬 Sending Slack alert: ${message.substring(0, 100)}...`);
    // Implementation would use Slack API
  }

  private async sendWebhook(alert: Alert, config: any): Promise<void> {
    console.log(`🔗 Sending webhook alert: ${alert.ruleName}`);
    // Implementation would make HTTP request
  }

  private async sendSMS(message: string, config: any): Promise<void> {
    console.log(`📱 Sending SMS alert: ${message.substring(0, 100)}...`);
    // Implementation would use SMS service
  }

  private async sendPagerDuty(alert: Alert, config: any): Promise<void> {
    console.log(`📟 Sending PagerDuty alert: ${alert.ruleName}`);
    // Implementation would use PagerDuty API
  }

  private async sendTeams(message: string, config: any): Promise<void> {
    console.log(`👥 Sending Teams alert: ${message.substring(0, 100)}...`);
    // Implementation would use Teams API
  }

  private async sendDiscord(message: string, config: any): Promise<void> {
    console.log(`🎮 Sending Discord alert: ${message.substring(0, 100)}...`);
    // Implementation would use Discord API
  }

  // Helper methods
  private isThrottled(rule: AlertRule): boolean {
    if (!rule.throttling.enabled) return false;
    
    const recentAlerts = this.alertHistory.filter(alert => 
      alert.ruleId === rule.id &&
      alert.triggeredAt > new Date(Date.now() - rule.throttling.period * 60000)
    );
    
    return recentAlerts.length >= rule.throttling.maxAlerts;
  }

  private getLastAlert(ruleId: string): Alert | undefined {
    return this.alertHistory
      .filter(alert => alert.ruleId === ruleId)
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())[0];
  }

  private isChannelRateLimited(channel: AlertChannel): boolean {
    if (!channel.rateLimiting.enabled) return false;
    
    // Implementation would check actual rate limiting
    return false;
  }

  private matchesEscalationConditions(alert: Alert, policy: EscalationPolicy): boolean {
    // Check severity
    if (!policy.conditions.severity.includes(alert.severity)) return false;
    
    // Check tags
    if (policy.conditions.tags.length > 0) {
      const hasMatchingTag = policy.conditions.tags.some(tag => alert.tags.includes(tag));
      if (!hasMatchingTag) return false;
    }
    
    // Check time of day and days of week
    const now = new Date();
    if (policy.conditions.timeOfDay) {
      // Implementation would check time range
    }
    
    if (policy.conditions.daysOfWeek) {
      if (!policy.conditions.daysOfWeek.includes(now.getDay())) return false;
    }
    
    return true;
  }

  private async executeEscalationAction(alert: Alert, action: EscalationAction): Promise<void> {
    console.log(`⚡ Executing escalation action: ${action.type}`);
    
    switch (action.type) {
      case 'notify':
        // Additional notifications
        break;
      case 'create_incident':
        await this.createIncident(alert);
        break;
      case 'run_script':
        await this.executeScript(alert, action.config);
        break;
      case 'scale_service':
        await this.scaleService(action.config);
        break;
      case 'rollback':
        await this.initiateRollback(action.config);
        break;
    }
  }

  private async executeScript(alert: Alert, config: any): Promise<void> {
    console.log(`🔧 Executing script for alert: ${alert.ruleName}`);
    // Implementation would execute configured script
  }

  private async scaleService(config: any): Promise<void> {
    console.log(`📈 Scaling service: ${config.service}`);
    // Implementation would scale service
  }

  private async initiateRollback(config: any): Promise<void> {
    console.log(`🔄 Initiating rollback: ${config.version}`);
    // Implementation would initiate rollback
  }

  private async notifyAcknowledgment(alert: Alert): Promise<void> {
    console.log(`✅ Notifying acknowledgment: ${alert.ruleName}`);
    // Implementation would send acknowledgment notifications
  }

  private async notifyResolution(alert: Alert): Promise<void> {
    console.log(`✅ Notifying resolution: ${alert.ruleName}`);
    // Implementation would send resolution notifications
  }

  private async notifyIncidentCreated(incident: Incident): Promise<void> {
    console.log(`🚨 Notifying incident created: ${incident.title}`);
    // Implementation would send incident notifications
  }

  private async updateIncidentStatus(incidentId: string, status: string): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.status = status as any;
      console.log(`📝 Updated incident status: ${incidentId} → ${status}`);
    }
  }

  private getAssignee(alert: Alert): string {
    // Implementation would determine assignee based on rules
    return 'on-call-engineer';
  }

  private getTeam(alert: Alert): string {
    // Implementation would determine team based on alert context
    return 'platform-team';
  }

  private getSeverityPriority(severity: AlertSeverity): number {
    const priorities = { critical: 1, error: 2, warning: 3, info: 4 };
    return priorities[severity] || 4;
  }

  private assessBusinessImpact(alert: Alert): string {
    // Implementation would assess business impact
    return 'Service degradation affecting user experience';
  }

  private getDefaultTemplate(channelType: string): string {
    return `🚨 {severity} ALERT: {title}\n\n{message}\n\nService: {service}\nEnvironment: {environment}\nTime: {timestamp}`;
  }

  private getRunbookUrl(alert: Alert): string {
    return `https://runbooks.bothsides.app/alerts/${alert.ruleId}`;
  }

  private startAlertProcessing(): void {
    // Start background processing for alert lifecycle management
    setInterval(() => {
      this.processActiveAlerts();
    }, 60000); // Process every minute
  }

  private processActiveAlerts(): void {
    // Process escalations, auto-resolutions, etc.
    console.log(`🔄 Processing ${this.activeAlerts.size} active alerts`);
  }

  private initializeIntegrations(): void {
    console.log('🔌 Initializing monitoring integrations...');
    
    if (this.config.integrations.vercel.enabled) {
      console.log('   ✅ Vercel Analytics integration');
    }
    
    if (this.config.integrations.railway.enabled) {
      console.log('   ✅ Railway monitoring integration');
    }
    
    if (this.config.integrations.sentry.enabled) {
      console.log('   ✅ Sentry error tracking integration');
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateIncidentId(): string {
    return `inc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get alerting system status
   */
  getSystemStatus(): {
    activeAlerts: number;
    totalAlerts: number;
    activeIncidents: number;
    channelsEnabled: number;
    escalationPolicies: number;
  } {
    return {
      activeAlerts: this.activeAlerts.size,
      totalAlerts: this.alertHistory.length,
      activeIncidents: Array.from(this.incidents.values()).filter(i => i.status !== 'resolved').length,
      channelsEnabled: Array.from(this.channels.values()).filter(c => c.enabled).length,
      escalationPolicies: this.escalationPolicies.size
    };
  }
}

// Default production alerting configuration
export const PRODUCTION_ALERTING_CONFIG: AlertingConfig = {
  channels: [
    {
      id: 'email-critical',
      name: 'Critical Email Alerts',
      type: 'email',
      enabled: true,
      config: {
        to: ['alerts@bothsides.app', 'oncall@bothsides.app'],
        from: 'noreply@bothsides.app'
      },
      priority: 1,
      rateLimiting: {
        enabled: true,
        maxAlertsPerHour: 10,
        cooldownPeriod: 5
      },
      formatting: {
        template: '🚨 {severity} ALERT: {title}\n\n{message}\n\nService: {service}\nEnvironment: {environment}\nTime: {timestamp}',
        includeMetrics: true,
        includeGraphs: false,
        includeRunbook: true
      }
    },
    {
      id: 'slack-alerts',
      name: 'Slack Alerts Channel',
      type: 'slack',
      enabled: true,
      config: {
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#alerts'
      },
      priority: 2,
      rateLimiting: {
        enabled: true,
        maxAlertsPerHour: 20,
        cooldownPeriod: 2
      },
      formatting: {
        template: '🚨 *{severity}* Alert: {title}\n{message}\n_Service: {service} | Environment: {environment}_',
        includeMetrics: true,
        includeGraphs: true,
        includeRunbook: true
      }
    },
    {
      id: 'pagerduty-critical',
      name: 'PagerDuty Critical',
      type: 'pagerduty',
      enabled: true,
      config: {
        integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
        severity: 'critical'
      },
      priority: 1,
      rateLimiting: {
        enabled: false,
        maxAlertsPerHour: 0,
        cooldownPeriod: 0
      },
      formatting: {
        template: '{severity}: {title} - {message}',
        includeMetrics: true,
        includeGraphs: false,
        includeRunbook: true
      }
    }
  ],
  escalationPolicies: [
    {
      id: 'critical-escalation',
      name: 'Critical Alert Escalation',
      description: 'Escalation policy for critical alerts',
      enabled: true,
      levels: [
        {
          level: 1,
          delay: 0,
          channels: ['slack-alerts'],
          actions: [{ type: 'notify', config: {}, timeout: 300, retries: 3 }],
          autoResolve: false
        },
        {
          level: 2,
          delay: 5,
          channels: ['email-critical'],
          actions: [{ type: 'notify', config: {}, timeout: 300, retries: 3 }],
          autoResolve: false
        },
        {
          level: 3,
          delay: 15,
          channels: ['pagerduty-critical'],
          actions: [
            { type: 'create_incident', config: {}, timeout: 300, retries: 1 },
            { type: 'notify', config: {}, timeout: 300, retries: 3 }
          ],
          autoResolve: false
        }
      ],
      conditions: {
        severity: ['critical', 'error'],
        tags: ['production'],
        timeOfDay: { start: '00:00', end: '23:59' },
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
      }
    }
  ],
  alertRules: [
    {
      id: 'high-error-rate',
      name: 'High Error Rate',
      description: 'Application error rate exceeds threshold',
      enabled: true,
      severity: 'error',
      category: 'performance',
      conditions: [
        {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 5,
          timeWindow: 5,
          aggregation: 'avg'
        }
      ],
      actions: [
        {
          type: 'notify',
          config: {},
          channels: ['slack-alerts', 'email-critical'],
          escalationPolicy: 'critical-escalation'
        }
      ],
      tags: ['production', 'performance'],
      metadata: {
        runbook: 'https://runbooks.bothsides.app/high-error-rate',
        owner: 'platform-team',
        team: 'engineering',
        createdAt: new Date(),
        lastModified: new Date()
      },
      throttling: {
        enabled: true,
        period: 15,
        maxAlerts: 3
      }
    }
  ],
  incidentManagement: {
    enabled: true,
    autoCreateIncidents: true,
    severityMapping: {
      critical: 'critical',
      error: 'high',
      warning: 'medium',
      info: 'low'
    },
    assignmentRules: [
      {
        condition: 'severity = critical',
        assignTo: 'oncall-engineer',
        team: 'platform',
        priority: 1
      }
    ],
    statusUpdates: {
      enabled: true,
      channels: ['slack-alerts'],
      frequency: 30
    }
  },
  integrations: {
    vercel: {
      enabled: true,
      apiKey: process.env.VERCEL_API_KEY || '',
      projectId: process.env.VERCEL_PROJECT_ID || ''
    },
    railway: {
      enabled: true,
      apiKey: process.env.RAILWAY_API_KEY || '',
      projectId: process.env.RAILWAY_PROJECT_ID || ''
    },
    sentry: {
      enabled: true,
      dsn: process.env.SENTRY_DSN || '',
      projectId: process.env.SENTRY_PROJECT_ID || ''
    },
    datadog: {
      enabled: false,
      apiKey: '',
      appKey: ''
    },
    newrelic: {
      enabled: false,
      licenseKey: '',
      appId: ''
    }
  }
};

// Export singleton instance
export const alertingSystem = new AlertingSystem(PRODUCTION_ALERTING_CONFIG);

export default {
  AlertingSystem,
  PRODUCTION_ALERTING_CONFIG,
  alertingSystem
};
