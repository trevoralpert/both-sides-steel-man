/**
 * Incident Response Automation System
 * Automated incident detection, escalation, and response procedures
 */

export interface IncidentResponseConfig {
  detection: {
    enabled: boolean;
    autoCreateIncidents: boolean;
    severityThresholds: Record<string, number>;
    correlationWindow: number; // minutes
  };
  escalation: {
    enabled: boolean;
    policies: EscalationPolicy[];
    timeouts: Record<string, number>;
  };
  automation: {
    enabled: boolean;
    runbooks: AutomatedRunbook[];
    approvalRequired: boolean;
  };
  communication: {
    channels: CommunicationChannel[];
    templates: MessageTemplate[];
    statusPage: StatusPageConfig;
  };
  postMortem: {
    enabled: boolean;
    autoGenerate: boolean;
    template: string;
    reviewProcess: ReviewProcess;
  };
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggers: EscalationTrigger[];
  levels: EscalationLevel[];
  conditions: {
    severity: IncidentSeverity[];
    services: string[];
    timeOfDay?: { start: string; end: string };
    daysOfWeek?: number[];
  };
}

export interface EscalationTrigger {
  type: 'time_based' | 'manual' | 'metric_based' | 'status_change';
  condition: string;
  delay: number; // minutes
}

export interface EscalationLevel {
  level: number;
  name: string;
  delay: number; // minutes from previous level
  responders: Responder[];
  actions: ResponseAction[];
  timeout: number; // minutes
}

export interface Responder {
  type: 'user' | 'team' | 'oncall';
  identifier: string;
  contactMethods: ContactMethod[];
  backupResponders?: string[];
}

export interface ContactMethod {
  type: 'email' | 'sms' | 'phone' | 'slack' | 'pagerduty';
  address: string;
  priority: number;
}

export interface ResponseAction {
  type: 'notify' | 'execute_runbook' | 'scale_service' | 'rollback' | 'create_war_room' | 'update_status';
  config: Record<string, any>;
  timeout: number;
  retries: number;
  requiresApproval: boolean;
}

export interface AutomatedRunbook {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggers: string[];
  steps: RunbookStep[];
  rollbackSteps: RunbookStep[];
  metadata: {
    owner: string;
    lastTested: Date;
    successRate: number;
  };
}

export interface RunbookStep {
  id: string;
  name: string;
  description: string;
  type: 'script' | 'api_call' | 'manual' | 'approval' | 'wait';
  config: Record<string, any>;
  timeout: number;
  retries: number;
  continueOnFailure: boolean;
  rollbackOnFailure: boolean;
}

export interface CommunicationChannel {
  id: string;
  name: string;
  type: 'slack' | 'email' | 'sms' | 'webhook' | 'status_page';
  config: Record<string, any>;
  enabled: boolean;
  audiences: string[];
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'incident_created' | 'incident_updated' | 'incident_resolved' | 'escalation' | 'status_update';
  template: string;
  channels: string[];
}

export interface StatusPageConfig {
  enabled: boolean;
  url: string;
  apiKey: string;
  autoUpdate: boolean;
  components: StatusComponent[];
}

export interface StatusComponent {
  id: string;
  name: string;
  description: string;
  services: string[];
}

export interface ReviewProcess {
  enabled: boolean;
  requiredReviewers: number;
  reviewers: string[];
  timeline: number; // days
  template: string;
}

export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  priority: number;
  createdAt: Date;
  detectedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  commander: string;
  responders: string[];
  affectedServices: string[];
  rootCause?: string;
  timeline: IncidentEvent[];
  metrics: IncidentMetrics;
  communication: {
    warRoomUrl?: string;
    statusPageId?: string;
    externalCommunications: ExternalCommunication[];
  };
  automation: {
    runbooksExecuted: string[];
    actionsPerformed: string[];
    rollbacksPerformed: string[];
  };
  postMortem?: PostMortem;
}

export interface IncidentEvent {
  id: string;
  timestamp: Date;
  type: 'created' | 'updated' | 'escalated' | 'action_taken' | 'resolved' | 'communication';
  actor: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface IncidentMetrics {
  detectionTime: number; // minutes from occurrence to detection
  responseTime: number; // minutes from detection to first response
  resolutionTime?: number; // minutes from detection to resolution
  mttr: number; // mean time to recovery
  customerImpact: {
    usersAffected: number;
    servicesDown: string[];
    revenueImpact: number;
  };
}

export interface ExternalCommunication {
  id: string;
  timestamp: Date;
  channel: string;
  audience: string;
  message: string;
  author: string;
}

export interface PostMortem {
  id: string;
  incidentId: string;
  title: string;
  summary: string;
  timeline: PostMortemEvent[];
  rootCause: {
    primary: string;
    contributing: string[];
  };
  impact: {
    duration: number;
    usersAffected: number;
    servicesAffected: string[];
    businessImpact: string;
  };
  response: {
    whatWentWell: string[];
    whatWentPoorly: string[];
    lessonsLearned: string[];
  };
  actionItems: ActionItem[];
  createdAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  status: 'draft' | 'review' | 'approved' | 'published';
}

export interface PostMortemEvent {
  timestamp: Date;
  description: string;
  source: string;
}

export interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  category: 'prevention' | 'detection' | 'response' | 'recovery';
}

export class IncidentResponseSystem {
  private config: IncidentResponseConfig;
  private activeIncidents: Map<string, Incident> = new Map();
  private incidentHistory: Incident[] = [];
  private runbooks: Map<string, AutomatedRunbook> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();

  constructor(config: IncidentResponseConfig) {
    this.config = config;
    this.initializeIncidentResponse();
  }

  private initializeIncidentResponse(): void {
    console.log('🚨 Initializing Incident Response System...');
    
    // Load runbooks
    this.config.automation.runbooks.forEach(runbook => {
      this.runbooks.set(runbook.id, runbook);
    });
    
    // Load escalation policies
    this.config.escalation.policies.forEach(policy => {
      this.escalationPolicies.set(policy.id, policy);
    });
    
    // Start incident monitoring
    this.startIncidentMonitoring();
    
    console.log(`✅ Incident Response System initialized with ${this.runbooks.size} runbooks and ${this.escalationPolicies.size} escalation policies`);
  }

  /**
   * Create a new incident
   */
  async createIncident(
    title: string,
    description: string,
    severity: IncidentSeverity,
    affectedServices: string[] = [],
    detectedBy?: string
  ): Promise<Incident> {
    const incident: Incident = {
      id: this.generateIncidentId(),
      title,
      description,
      severity,
      status: 'investigating',
      priority: this.getSeverityPriority(severity),
      createdAt: new Date(),
      detectedAt: new Date(),
      commander: detectedBy || 'system',
      responders: [],
      affectedServices,
      timeline: [{
        id: this.generateEventId(),
        timestamp: new Date(),
        type: 'created',
        actor: detectedBy || 'system',
        description: `Incident created: ${title}`
      }],
      metrics: {
        detectionTime: 0,
        responseTime: 0,
        mttr: 0,
        customerImpact: {
          usersAffected: 0,
          servicesDown: affectedServices,
          revenueImpact: 0
        }
      },
      communication: {
        externalCommunications: []
      },
      automation: {
        runbooksExecuted: [],
        actionsPerformed: [],
        rollbacksPerformed: []
      }
    };

    this.activeIncidents.set(incident.id, incident);
    this.incidentHistory.push(incident);

    console.log(`🚨 INCIDENT CREATED: ${incident.title} (${incident.severity})`);

    // Start automated response
    await this.initiateAutomatedResponse(incident);

    // Send notifications
    await this.sendIncidentNotifications(incident, 'incident_created');

    // Update status page
    if (this.config.communication.statusPage.enabled && this.config.communication.statusPage.autoUpdate) {
      await this.updateStatusPage(incident);
    }

    return incident;
  }

  /**
   * Update incident status
   */
  async updateIncident(
    incidentId: string,
    updates: Partial<Pick<Incident, 'status' | 'severity' | 'description' | 'rootCause'>>,
    updatedBy: string
  ): Promise<boolean> {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) return false;

    const oldStatus = incident.status;
    const oldSeverity = incident.severity;

    // Apply updates
    Object.assign(incident, updates);

    // Add timeline event
    incident.timeline.push({
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'updated',
      actor: updatedBy,
      description: `Incident updated: ${JSON.stringify(updates)}`
    });

    console.log(`📝 Incident updated: ${incident.title} by ${updatedBy}`);

    // Check for status changes that trigger actions
    if (updates.status && updates.status !== oldStatus) {
      await this.handleStatusChange(incident, oldStatus, updates.status);
    }

    // Check for severity changes that trigger escalation
    if (updates.severity && updates.severity !== oldSeverity) {
      await this.handleSeverityChange(incident, oldSeverity, updates.severity);
    }

    // Send update notifications
    await this.sendIncidentNotifications(incident, 'incident_updated');

    return true;
  }

  /**
   * Resolve incident
   */
  async resolveIncident(
    incidentId: string,
    resolution: string,
    resolvedBy: string
  ): Promise<boolean> {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) return false;

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.metrics.resolutionTime = Math.floor(
      (incident.resolvedAt.getTime() - incident.detectedAt.getTime()) / (1000 * 60)
    );

    // Add resolution event
    incident.timeline.push({
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'resolved',
      actor: resolvedBy,
      description: `Incident resolved: ${resolution}`
    });

    console.log(`✅ INCIDENT RESOLVED: ${incident.title} by ${resolvedBy}`);

    // Remove from active incidents
    this.activeIncidents.delete(incidentId);

    // Send resolution notifications
    await this.sendIncidentNotifications(incident, 'incident_resolved');

    // Update status page
    if (this.config.communication.statusPage.enabled) {
      await this.resolveStatusPageIncident(incident);
    }

    // Generate post-mortem if required
    if (this.config.postMortem.enabled && this.shouldGeneratePostMortem(incident)) {
      await this.generatePostMortem(incident);
    }

    return true;
  }

  /**
   * Execute automated runbook
   */
  async executeRunbook(
    runbookId: string,
    incidentId: string,
    executedBy: string,
    parameters: Record<string, any> = {}
  ): Promise<{ success: boolean; results: any[]; errors: string[] }> {
    const runbook = this.runbooks.get(runbookId);
    const incident = this.activeIncidents.get(incidentId);
    
    if (!runbook || !incident) {
      return { success: false, results: [], errors: ['Runbook or incident not found'] };
    }

    console.log(`🔧 Executing runbook: ${runbook.name} for incident ${incident.title}`);

    const results: any[] = [];
    const errors: string[] = [];
    let success = true;

    // Add to incident automation tracking
    incident.automation.runbooksExecuted.push(runbookId);

    // Add timeline event
    incident.timeline.push({
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'action_taken',
      actor: executedBy,
      description: `Executing runbook: ${runbook.name}`
    });

    try {
      for (const step of runbook.steps) {
        try {
          const stepResult = await this.executeRunbookStep(step, incident, parameters);
          results.push({ stepId: step.id, result: stepResult });
          
          console.log(`  ✅ Step completed: ${step.name}`);
        } catch (error) {
          const errorMessage = `Step failed: ${step.name} - ${error}`;
          errors.push(errorMessage);
          console.error(`  ❌ ${errorMessage}`);
          
          if (!step.continueOnFailure) {
            success = false;
            
            // Execute rollback if configured
            if (step.rollbackOnFailure) {
              await this.executeRollback(runbook, incident, executedBy);
            }
            
            break;
          }
        }
      }
    } catch (error) {
      success = false;
      errors.push(`Runbook execution failed: ${error}`);
    }

    // Update incident with results
    incident.timeline.push({
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'action_taken',
      actor: executedBy,
      description: `Runbook ${success ? 'completed' : 'failed'}: ${runbook.name}`,
      metadata: { results, errors }
    });

    console.log(`${success ? '✅' : '❌'} Runbook execution ${success ? 'completed' : 'failed'}: ${runbook.name}`);

    return { success, results, errors };
  }

  /**
   * Start escalation for incident
   */
  async startEscalation(incidentId: string, policyId: string): Promise<boolean> {
    const incident = this.activeIncidents.get(incidentId);
    const policy = this.escalationPolicies.get(policyId);
    
    if (!incident || !policy || !policy.enabled) return false;

    // Check if policy conditions match
    if (!this.matchesEscalationConditions(incident, policy)) return false;

    console.log(`⬆️ Starting escalation for incident: ${incident.title} using policy: ${policy.name}`);

    // Execute first escalation level
    const firstLevel = policy.levels[0];
    if (firstLevel) {
      setTimeout(() => {
        this.executeEscalationLevel(incident, policy, 0);
      }, firstLevel.delay * 60000);
    }

    // Add timeline event
    incident.timeline.push({
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'escalated',
      actor: 'system',
      description: `Escalation started: ${policy.name}`
    });

    return true;
  }

  /**
   * Generate post-mortem
   */
  async generatePostMortem(incident: Incident): Promise<PostMortem> {
    console.log(`📝 Generating post-mortem for incident: ${incident.title}`);

    const postMortem: PostMortem = {
      id: this.generatePostMortemId(),
      incidentId: incident.id,
      title: `Post-Mortem: ${incident.title}`,
      summary: `Analysis of incident ${incident.id} that occurred on ${incident.createdAt.toLocaleDateString()}`,
      timeline: incident.timeline.map(event => ({
        timestamp: event.timestamp,
        description: event.description,
        source: event.actor
      })),
      rootCause: {
        primary: incident.rootCause || 'To be determined',
        contributing: []
      },
      impact: {
        duration: incident.metrics.resolutionTime || 0,
        usersAffected: incident.metrics.customerImpact.usersAffected,
        servicesAffected: incident.affectedServices,
        businessImpact: this.calculateBusinessImpact(incident)
      },
      response: {
        whatWentWell: [
          'Incident was detected automatically',
          'Response team was notified promptly',
          'Automated runbooks executed successfully'
        ],
        whatWentPoorly: [
          'Root cause identification took longer than expected'
        ],
        lessonsLearned: [
          'Need better monitoring for early detection',
          'Improve runbook documentation'
        ]
      },
      actionItems: [
        {
          id: this.generateActionItemId(),
          description: 'Improve monitoring alerting for similar issues',
          assignee: 'platform-team',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
          priority: 'high',
          status: 'open',
          category: 'prevention'
        }
      ],
      createdAt: new Date(),
      status: 'draft'
    };

    incident.postMortem = postMortem;

    console.log(`✅ Post-mortem generated: ${postMortem.id}`);
    return postMortem;
  }

  // Private helper methods
  private async initiateAutomatedResponse(incident: Incident): Promise<void> {
    if (!this.config.automation.enabled) return;

    // Find applicable runbooks
    const applicableRunbooks = Array.from(this.runbooks.values())
      .filter(runbook => 
        runbook.enabled && 
        runbook.triggers.some(trigger => 
          incident.affectedServices.includes(trigger) || 
          incident.severity === trigger
        )
      );

    // Execute applicable runbooks
    for (const runbook of applicableRunbooks) {
      if (!this.config.automation.approvalRequired || incident.severity === 'sev1') {
        await this.executeRunbook(runbook.id, incident.id, 'system');
      }
    }

    // Start escalation if configured
    const escalationPolicy = this.findApplicableEscalationPolicy(incident);
    if (escalationPolicy) {
      await this.startEscalation(incident.id, escalationPolicy.id);
    }
  }

  private async executeRunbookStep(
    step: RunbookStep,
    incident: Incident,
    parameters: Record<string, any>
  ): Promise<any> {
    switch (step.type) {
      case 'script':
        return await this.executeScript(step.config, parameters);
      case 'api_call':
        return await this.makeApiCall(step.config, parameters);
      case 'manual':
        return await this.requestManualAction(step, incident);
      case 'approval':
        return await this.requestApproval(step, incident);
      case 'wait':
        return await this.wait(step.config.duration || 60);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeScript(config: any, parameters: Record<string, any>): Promise<any> {
    console.log(`🔧 Executing script: ${config.script}`);
    // Implementation would execute actual script
    return { success: true, output: 'Script executed successfully' };
  }

  private async makeApiCall(config: any, parameters: Record<string, any>): Promise<any> {
    console.log(`🌐 Making API call: ${config.method} ${config.url}`);
    // Implementation would make actual API call
    return { success: true, response: 'API call completed' };
  }

  private async requestManualAction(step: RunbookStep, incident: Incident): Promise<any> {
    console.log(`👤 Manual action required: ${step.description}`);
    // Implementation would notify responders of manual action needed
    return { success: true, status: 'manual_action_requested' };
  }

  private async requestApproval(step: RunbookStep, incident: Incident): Promise<any> {
    console.log(`✋ Approval required: ${step.description}`);
    // Implementation would request approval from incident commander
    return { success: true, status: 'approval_requested' };
  }

  private async wait(duration: number): Promise<any> {
    console.log(`⏳ Waiting ${duration} seconds...`);
    await new Promise(resolve => setTimeout(resolve, duration * 1000));
    return { success: true, waited: duration };
  }

  private async executeRollback(
    runbook: AutomatedRunbook,
    incident: Incident,
    executedBy: string
  ): Promise<void> {
    console.log(`🔄 Executing rollback for runbook: ${runbook.name}`);
    
    incident.automation.rollbacksPerformed.push(runbook.id);
    
    for (const step of runbook.rollbackSteps) {
      try {
        await this.executeRunbookStep(step, incident, {});
        console.log(`  ✅ Rollback step completed: ${step.name}`);
      } catch (error) {
        console.error(`  ❌ Rollback step failed: ${step.name} - ${error}`);
      }
    }
  }

  private async handleStatusChange(
    incident: Incident,
    oldStatus: IncidentStatus,
    newStatus: IncidentStatus
  ): Promise<void> {
    console.log(`📊 Status changed: ${oldStatus} → ${newStatus} for incident ${incident.title}`);
    
    // Trigger status-specific actions
    switch (newStatus) {
      case 'identified':
        // Root cause identified, may trigger specific runbooks
        break;
      case 'monitoring':
        // Issue is being monitored, may reduce escalation
        break;
      case 'resolved':
        // Incident resolved, cleanup actions
        break;
    }
  }

  private async handleSeverityChange(
    incident: Incident,
    oldSeverity: IncidentSeverity,
    newSeverity: IncidentSeverity
  ): Promise<void> {
    console.log(`📈 Severity changed: ${oldSeverity} → ${newSeverity} for incident ${incident.title}`);
    
    // If severity increased, may trigger additional escalation
    if (this.getSeverityPriority(newSeverity) < this.getSeverityPriority(oldSeverity)) {
      const escalationPolicy = this.findApplicableEscalationPolicy(incident);
      if (escalationPolicy) {
        await this.startEscalation(incident.id, escalationPolicy.id);
      }
    }
  }

  private async executeEscalationLevel(
    incident: Incident,
    policy: EscalationPolicy,
    levelIndex: number
  ): Promise<void> {
    // Skip if incident is resolved
    if (incident.status === 'resolved') return;

    const level = policy.levels[levelIndex];
    if (!level) return;

    console.log(`⬆️ Executing escalation level ${levelIndex + 1}: ${level.name} for incident ${incident.title}`);

    // Notify responders
    for (const responder of level.responders) {
      await this.notifyResponder(responder, incident);
    }

    // Execute escalation actions
    for (const action of level.actions) {
      await this.executeResponseAction(action, incident);
    }

    // Schedule next escalation level
    const nextLevel = policy.levels[levelIndex + 1];
    if (nextLevel && incident.status !== 'resolved') {
      setTimeout(() => {
        this.executeEscalationLevel(incident, policy, levelIndex + 1);
      }, nextLevel.delay * 60000);
    }
  }

  private async notifyResponder(responder: Responder, incident: Incident): Promise<void> {
    console.log(`📞 Notifying responder: ${responder.identifier} for incident ${incident.title}`);
    
    for (const contactMethod of responder.contactMethods.sort((a, b) => a.priority - b.priority)) {
      try {
        await this.sendNotification(contactMethod, incident);
        break; // Stop after first successful notification
      } catch (error) {
        console.error(`❌ Failed to notify via ${contactMethod.type}: ${error}`);
      }
    }
  }

  private async executeResponseAction(action: ResponseAction, incident: Incident): Promise<void> {
    console.log(`⚡ Executing response action: ${action.type} for incident ${incident.title}`);
    
    switch (action.type) {
      case 'notify':
        // Additional notifications
        break;
      case 'execute_runbook':
        await this.executeRunbook(action.config.runbookId, incident.id, 'system');
        break;
      case 'scale_service':
        await this.scaleService(action.config);
        break;
      case 'rollback':
        await this.initiateRollback(action.config);
        break;
      case 'create_war_room':
        await this.createWarRoom(incident);
        break;
      case 'update_status':
        await this.updateStatusPage(incident);
        break;
    }
  }

  private async sendIncidentNotifications(
    incident: Incident,
    templateType: MessageTemplate['type']
  ): Promise<void> {
    const template = this.config.communication.templates.find(t => t.type === templateType);
    if (!template) return;

    const message = this.formatMessage(template.template, incident);

    for (const channelId of template.channels) {
      const channel = this.config.communication.channels.find(c => c.id === channelId);
      if (channel && channel.enabled) {
        await this.sendToChannel(channel, message, incident);
      }
    }
  }

  private async sendNotification(contactMethod: ContactMethod, incident: Incident): Promise<void> {
    // Implementation would send actual notifications
    console.log(`📧 Sending ${contactMethod.type} notification to ${contactMethod.address}`);
  }

  private async sendToChannel(
    channel: CommunicationChannel,
    message: string,
    incident: Incident
  ): Promise<void> {
    console.log(`📢 Sending to ${channel.type} channel: ${channel.name}`);
    // Implementation would send to actual channels
  }

  private formatMessage(template: string, incident: Incident): string {
    return template
      .replace('{title}', incident.title)
      .replace('{severity}', incident.severity)
      .replace('{status}', incident.status)
      .replace('{id}', incident.id)
      .replace('{description}', incident.description)
      .replace('{timestamp}', incident.createdAt.toISOString());
  }

  private async updateStatusPage(incident: Incident): Promise<void> {
    if (!this.config.communication.statusPage.enabled) return;
    
    console.log(`📊 Updating status page for incident: ${incident.title}`);
    // Implementation would update actual status page
  }

  private async resolveStatusPageIncident(incident: Incident): Promise<void> {
    if (!this.config.communication.statusPage.enabled) return;
    
    console.log(`✅ Resolving status page incident: ${incident.title}`);
    // Implementation would resolve status page incident
  }

  private async createWarRoom(incident: Incident): Promise<void> {
    console.log(`🏠 Creating war room for incident: ${incident.title}`);
    // Implementation would create actual war room (Slack channel, Zoom room, etc.)
    incident.communication.warRoomUrl = `https://bothsides.slack.com/channels/incident-${incident.id}`;
  }

  private async scaleService(config: any): Promise<void> {
    console.log(`📈 Scaling service: ${config.service} to ${config.instances} instances`);
    // Implementation would scale actual service
  }

  private async initiateRollback(config: any): Promise<void> {
    console.log(`🔄 Initiating rollback to version: ${config.version}`);
    // Implementation would initiate actual rollback
  }

  private matchesEscalationConditions(incident: Incident, policy: EscalationPolicy): boolean {
    // Check severity
    if (!policy.conditions.severity.includes(incident.severity)) return false;
    
    // Check services
    if (policy.conditions.services.length > 0) {
      const hasMatchingService = policy.conditions.services.some(service => 
        incident.affectedServices.includes(service)
      );
      if (!hasMatchingService) return false;
    }
    
    // Check time conditions
    const now = new Date();
    if (policy.conditions.timeOfDay) {
      // Implementation would check time range
    }
    
    if (policy.conditions.daysOfWeek) {
      if (!policy.conditions.daysOfWeek.includes(now.getDay())) return false;
    }
    
    return true;
  }

  private findApplicableEscalationPolicy(incident: Incident): EscalationPolicy | undefined {
    return Array.from(this.escalationPolicies.values())
      .find(policy => policy.enabled && this.matchesEscalationConditions(incident, policy));
  }

  private shouldGeneratePostMortem(incident: Incident): boolean {
    // Generate post-mortem for sev1 and sev2 incidents, or incidents lasting > 1 hour
    return incident.severity === 'sev1' || 
           incident.severity === 'sev2' || 
           (incident.metrics.resolutionTime || 0) > 60;
  }

  private calculateBusinessImpact(incident: Incident): string {
    const impact = incident.metrics.customerImpact;
    
    if (impact.usersAffected > 1000) return 'High business impact';
    if (impact.usersAffected > 100) return 'Medium business impact';
    return 'Low business impact';
  }

  private getSeverityPriority(severity: IncidentSeverity): number {
    const priorities = { sev1: 1, sev2: 2, sev3: 3, sev4: 4 };
    return priorities[severity];
  }

  private startIncidentMonitoring(): void {
    // Start background monitoring for incident lifecycle
    setInterval(() => {
      this.monitorActiveIncidents();
    }, 60000); // Monitor every minute
  }

  private monitorActiveIncidents(): void {
    console.log(`🔍 Monitoring ${this.activeIncidents.size} active incidents`);
    
    // Check for incidents that need attention
    for (const incident of this.activeIncidents.values()) {
      // Check for stale incidents
      const ageMinutes = (Date.now() - incident.createdAt.getTime()) / (1000 * 60);
      
      if (ageMinutes > 60 && incident.status === 'investigating') {
        console.warn(`⚠️ Stale incident detected: ${incident.title} (${ageMinutes} minutes old)`);
      }
    }
  }

  private generateIncidentId(): string {
    return `INC-${Date.now().toString(36).toUpperCase()}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generatePostMortemId(): string {
    return `pm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateActionItemId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get incident response system status
   */
  getSystemStatus(): {
    activeIncidents: number;
    totalIncidents: number;
    averageResolutionTime: number;
    runbooksAvailable: number;
    escalationPolicies: number;
  } {
    const resolvedIncidents = this.incidentHistory.filter(i => i.status === 'resolved');
    const avgResolutionTime = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.metrics.resolutionTime || 0), 0) / resolvedIncidents.length
      : 0;

    return {
      activeIncidents: this.activeIncidents.size,
      totalIncidents: this.incidentHistory.length,
      averageResolutionTime: avgResolutionTime,
      runbooksAvailable: this.runbooks.size,
      escalationPolicies: this.escalationPolicies.size
    };
  }
}

// Export default configuration and system
export const PRODUCTION_INCIDENT_RESPONSE_CONFIG: IncidentResponseConfig = {
  detection: {
    enabled: true,
    autoCreateIncidents: true,
    severityThresholds: {
      'error_rate': 5,
      'response_time': 5000,
      'availability': 99
    },
    correlationWindow: 15
  },
  escalation: {
    enabled: true,
    policies: [], // Would be populated with actual policies
    timeouts: {
      'sev1': 15,
      'sev2': 30,
      'sev3': 60,
      'sev4': 120
    }
  },
  automation: {
    enabled: true,
    runbooks: [], // Would be populated with actual runbooks
    approvalRequired: false
  },
  communication: {
    channels: [], // Would be populated with actual channels
    templates: [], // Would be populated with actual templates
    statusPage: {
      enabled: true,
      url: 'https://status.bothsides.app',
      apiKey: process.env.STATUS_PAGE_API_KEY || '',
      autoUpdate: true,
      components: []
    }
  },
  postMortem: {
    enabled: true,
    autoGenerate: true,
    template: 'standard_postmortem',
    reviewProcess: {
      enabled: true,
      requiredReviewers: 2,
      reviewers: ['engineering-lead', 'product-lead'],
      timeline: 7,
      template: 'postmortem_review'
    }
  }
};

export const incidentResponseSystem = new IncidentResponseSystem(PRODUCTION_INCIDENT_RESPONSE_CONFIG);

export default {
  IncidentResponseSystem,
  PRODUCTION_INCIDENT_RESPONSE_CONFIG,
  incidentResponseSystem
};
