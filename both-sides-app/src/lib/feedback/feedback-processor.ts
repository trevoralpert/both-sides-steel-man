/**
 * Feedback Processing Workflow
 * Task 11.1.4: Feedback Collection & Analytics System Setup
 * 
 * Automated feedback categorization, prioritization, integration with
 * project management tools, and feedback-to-feature pipeline.
 */

import { FeedbackResponse, FeatureRequest, UserInterview } from './feedback-system';

export interface FeedbackCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  autoAssign: boolean;
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  condition: string;
  action: 'assign' | 'notify' | 'escalate' | 'auto-respond';
  target: string;
  timeframe?: number; // hours
}

export interface FeedbackWorkflow {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: 'feedback_received' | 'priority_change' | 'time_elapsed' | 'status_change';
  conditions: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'categorize' | 'prioritize' | 'assign' | 'notify' | 'respond' | 'escalate';
  config: Record<string, any>;
  order: number;
  conditions?: Record<string, any>;
}

export interface ProjectIntegration {
  id: string;
  name: string;
  type: 'jira' | 'github' | 'linear' | 'asana' | 'trello';
  config: {
    apiUrl: string;
    apiKey: string;
    projectId: string;
    defaultAssignee?: string;
    labels?: string[];
  };
  mapping: {
    feedbackType: Record<string, string>; // feedback type -> project issue type
    priority: Record<string, string>; // feedback priority -> project priority
    status: Record<string, string>; // feedback status -> project status
  };
  active: boolean;
}

export interface FeedbackInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'pattern' | 'sentiment_shift';
  title: string;
  description: string;
  data: Record<string, any>;
  confidence: number; // 0-1
  actionable: boolean;
  recommendations: string[];
  createdAt: Date;
}

export interface AutoResponse {
  id: string;
  trigger: {
    feedbackType?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    keywords?: string[];
    priority?: string;
  };
  response: {
    subject: string;
    body: string;
    delay?: number; // minutes
    followUp?: {
      delay: number; // days
      message: string;
    };
  };
  active: boolean;
  metrics: {
    sent: number;
    opened: number;
    clicked: number;
    responded: number;
  };
}

export class FeedbackProcessor {
  private categories: Map<string, FeedbackCategory> = new Map();
  private workflows: Map<string, FeedbackWorkflow> = new Map();
  private integrations: Map<string, ProjectIntegration> = new Map();
  private insights: FeedbackInsight[] = [];
  private autoResponses: Map<string, AutoResponse> = new Map();
  private processingQueue: FeedbackResponse[] = [];

  constructor() {
    this.initializeDefaultCategories();
    this.initializeDefaultWorkflows();
    this.initializeAutoResponses();
    this.startProcessingLoop();
  }

  private initializeDefaultCategories(): void {
    const categories: FeedbackCategory[] = [
      {
        id: 'bug-critical',
        name: 'Critical Bug',
        description: 'System-breaking issues that prevent core functionality',
        keywords: ['crash', 'error', 'broken', 'not working', 'failed', 'critical'],
        priority: 'urgent',
        autoAssign: true,
        escalationRules: [
          {
            condition: 'priority = urgent AND time_elapsed > 2',
            action: 'escalate',
            target: 'engineering-lead',
            timeframe: 2
          }
        ]
      },
      {
        id: 'bug-minor',
        name: 'Minor Bug',
        description: 'Small issues that don\'t prevent core functionality',
        keywords: ['glitch', 'minor', 'small issue', 'cosmetic'],
        priority: 'low',
        autoAssign: false,
        escalationRules: []
      },
      {
        id: 'feature-request',
        name: 'Feature Request',
        description: 'Requests for new features or enhancements',
        keywords: ['feature', 'enhancement', 'improvement', 'add', 'new'],
        priority: 'medium',
        autoAssign: false,
        escalationRules: [
          {
            condition: 'votes > 10',
            action: 'notify',
            target: 'product-team'
          }
        ]
      },
      {
        id: 'usability',
        name: 'Usability Issue',
        description: 'User experience and interface problems',
        keywords: ['confusing', 'hard to use', 'unclear', 'difficult', 'ux', 'ui'],
        priority: 'medium',
        autoAssign: false,
        escalationRules: []
      },
      {
        id: 'performance',
        name: 'Performance Issue',
        description: 'Speed, loading, or performance related problems',
        keywords: ['slow', 'loading', 'performance', 'lag', 'timeout'],
        priority: 'high',
        autoAssign: true,
        escalationRules: [
          {
            condition: 'frequency > 5 AND time_window = 24h',
            action: 'escalate',
            target: 'performance-team'
          }
        ]
      },
      {
        id: 'positive-feedback',
        name: 'Positive Feedback',
        description: 'Compliments and positive user experiences',
        keywords: ['love', 'great', 'excellent', 'amazing', 'helpful', 'thank you'],
        priority: 'low',
        autoAssign: false,
        escalationRules: [
          {
            condition: 'sentiment = positive',
            action: 'auto-respond',
            target: 'thank-you-template'
          }
        ]
      }
    ];

    categories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }

  private initializeDefaultWorkflows(): void {
    // Bug Report Workflow
    this.createWorkflow({
      id: 'bug-report-workflow',
      name: 'Bug Report Processing',
      description: 'Automated workflow for processing bug reports',
      triggers: [
        {
          type: 'feedback_received',
          conditions: { type: 'bug-report' }
        }
      ],
      steps: [
        {
          id: 'categorize',
          name: 'Auto-categorize',
          type: 'categorize',
          config: { useML: true, confidence_threshold: 0.8 },
          order: 1
        },
        {
          id: 'prioritize',
          name: 'Set Priority',
          type: 'prioritize',
          config: { factors: ['severity', 'frequency', 'user_impact'] },
          order: 2
        },
        {
          id: 'assign',
          name: 'Auto-assign',
          type: 'assign',
          config: { team: 'engineering', load_balance: true },
          order: 3,
          conditions: { priority: ['high', 'urgent'] }
        },
        {
          id: 'create-ticket',
          name: 'Create Project Ticket',
          type: 'notify',
          config: { integration: 'github', template: 'bug-report' },
          order: 4
        },
        {
          id: 'acknowledge',
          name: 'Send Acknowledgment',
          type: 'respond',
          config: { template: 'bug-acknowledgment', delay: 5 },
          order: 5
        }
      ],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Feature Request Workflow
    this.createWorkflow({
      id: 'feature-request-workflow',
      name: 'Feature Request Processing',
      description: 'Workflow for evaluating and tracking feature requests',
      triggers: [
        {
          type: 'feedback_received',
          conditions: { type: 'feature-request' }
        }
      ],
      steps: [
        {
          id: 'categorize',
          name: 'Categorize Request',
          type: 'categorize',
          config: { categories: ['ui-ux', 'functionality', 'integration'] },
          order: 1
        },
        {
          id: 'duplicate-check',
          name: 'Check for Duplicates',
          type: 'categorize',
          config: { similarity_threshold: 0.85 },
          order: 2
        },
        {
          id: 'impact-assessment',
          name: 'Assess Impact',
          type: 'prioritize',
          config: { factors: ['user_votes', 'business_value', 'technical_complexity'] },
          order: 3
        },
        {
          id: 'product-review',
          name: 'Product Team Review',
          type: 'assign',
          config: { team: 'product', review_required: true },
          order: 4
        },
        {
          id: 'user-notification',
          name: 'Notify User',
          type: 'respond',
          config: { template: 'feature-received', include_timeline: true },
          order: 5
        }
      ],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private initializeAutoResponses(): void {
    const responses: AutoResponse[] = [
      {
        id: 'thank-you-positive',
        trigger: {
          sentiment: 'positive'
        },
        response: {
          subject: 'Thank you for your feedback!',
          body: `Hi there!

Thank you so much for taking the time to share your positive feedback with us. It really means a lot to our team to hear that Both Sides is making a positive impact on your learning experience.

Your encouragement motivates us to keep improving and building features that help students engage in meaningful debates and develop critical thinking skills.

If you have any suggestions for how we can make the platform even better, we'd love to hear them!

Best regards,
The Both Sides Team`,
          delay: 10
        },
        active: true,
        metrics: { sent: 0, opened: 0, clicked: 0, responded: 0 }
      },
      {
        id: 'bug-acknowledgment',
        trigger: {
          feedbackType: 'bug-report'
        },
        response: {
          subject: 'We\'ve received your bug report',
          body: `Hello,

Thank you for reporting this issue. We've received your bug report and our engineering team has been notified.

Here's what happens next:
1. Our team will review and prioritize your report
2. We'll investigate the issue and work on a fix
3. You'll receive updates on our progress

If this is a critical issue preventing you from using the platform, please don't hesitate to reach out to us directly at support@bothsides.app.

We appreciate your patience and for helping us improve Both Sides.

Best regards,
The Both Sides Support Team`,
          delay: 15,
          followUp: {
            delay: 3,
            message: 'We wanted to follow up on the bug report you submitted. Our team is actively working on a fix and we expect to have it resolved soon.'
          }
        },
        active: true,
        metrics: { sent: 0, opened: 0, clicked: 0, responded: 0 }
      },
      {
        id: 'feature-received',
        trigger: {
          feedbackType: 'feature-request'
        },
        response: {
          subject: 'Your feature request has been received',
          body: `Hi!

Thanks for sharing your feature idea with us. We love hearing from our users about how we can make Both Sides even better.

Your request has been added to our product backlog where our team will:
- Review the suggestion for feasibility and impact
- Consider how it fits with our product roadmap
- Evaluate user demand and priority

While we can't implement every suggestion, we carefully consider all feedback when planning new features. You can track the status of feature requests and vote on others in our community forum.

Keep the great ideas coming!

The Both Sides Product Team`,
          delay: 30
        },
        active: true,
        metrics: { sent: 0, opened: 0, clicked: 0, responded: 0 }
      }
    ];

    responses.forEach(response => {
      this.autoResponses.set(response.id, response);
    });
  }

  // Main processing methods
  async processFeedback(feedback: FeedbackResponse): Promise<void> {
    console.log(`🔄 Processing feedback: ${feedback.id}`);

    try {
      // Step 1: Categorize feedback
      const category = await this.categorizeFeedback(feedback);
      feedback.tags = [...feedback.tags, category.id];

      // Step 2: Update priority based on category
      if (category.priority !== feedback.priority) {
        feedback.priority = category.priority;
        feedback.updatedAt = new Date();
      }

      // Step 3: Execute applicable workflows
      await this.executeWorkflows(feedback);

      // Step 4: Check for auto-response triggers
      await this.checkAutoResponses(feedback);

      // Step 5: Create project integration tickets if needed
      await this.createProjectTickets(feedback);

      // Step 6: Update insights and analytics
      await this.updateInsights(feedback);

      console.log(`✅ Feedback processed: ${feedback.id} (${category.name})`);
    } catch (error) {
      console.error(`❌ Error processing feedback ${feedback.id}:`, error);
    }
  }

  private async categorizeFeedback(feedback: FeedbackResponse): Promise<FeedbackCategory> {
    // Simple keyword-based categorization (in production, would use ML)
    const text = Object.values(feedback.responses).join(' ').toLowerCase();
    
    for (const category of this.categories.values()) {
      const matchCount = category.keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      ).length;
      
      if (matchCount > 0) {
        return category;
      }
    }

    // Default category
    return this.categories.get('general') || {
      id: 'general',
      name: 'General Feedback',
      description: 'Uncategorized feedback',
      keywords: [],
      priority: 'medium',
      autoAssign: false,
      escalationRules: []
    };
  }

  private async executeWorkflows(feedback: FeedbackResponse): Promise<void> {
    for (const workflow of this.workflows.values()) {
      if (!workflow.active) continue;

      // Check if workflow should be triggered
      const shouldTrigger = workflow.triggers.some(trigger => 
        this.evaluateTrigger(trigger, feedback)
      );

      if (shouldTrigger) {
        await this.executeWorkflow(workflow, feedback);
      }
    }
  }

  private evaluateTrigger(trigger: WorkflowTrigger, feedback: FeedbackResponse): boolean {
    switch (trigger.type) {
      case 'feedback_received':
        return this.matchesConditions(trigger.conditions, feedback);
      default:
        return false;
    }
  }

  private matchesConditions(conditions: Record<string, any>, feedback: FeedbackResponse): boolean {
    return Object.entries(conditions).every(([key, value]) => {
      switch (key) {
        case 'type':
          return feedback.tags.includes(value);
        case 'priority':
          return feedback.priority === value;
        case 'sentiment':
          return feedback.sentiment === value;
        default:
          return true;
      }
    });
  }

  private async executeWorkflow(workflow: FeedbackWorkflow, feedback: FeedbackResponse): Promise<void> {
    console.log(`🔄 Executing workflow: ${workflow.name} for feedback ${feedback.id}`);

    for (const step of workflow.steps.sort((a, b) => a.order - b.order)) {
      // Check step conditions
      if (step.conditions && !this.matchesConditions(step.conditions, feedback)) {
        continue;
      }

      await this.executeWorkflowStep(step, feedback);
    }
  }

  private async executeWorkflowStep(step: WorkflowStep, feedback: FeedbackResponse): Promise<void> {
    switch (step.type) {
      case 'categorize':
        // Already done in main processing
        break;
      case 'prioritize':
        await this.updatePriority(feedback, step.config);
        break;
      case 'assign':
        await this.assignFeedback(feedback, step.config);
        break;
      case 'notify':
        await this.sendNotification(feedback, step.config);
        break;
      case 'respond':
        await this.sendResponse(feedback, step.config);
        break;
      case 'escalate':
        await this.escalateFeedback(feedback, step.config);
        break;
    }
  }

  private async updatePriority(feedback: FeedbackResponse, config: Record<string, any>): Promise<void> {
    // Implement priority calculation based on factors
    const factors = config.factors || [];
    let priorityScore = 0;

    if (factors.includes('severity') && feedback.tags.includes('critical')) {
      priorityScore += 3;
    }
    if (factors.includes('frequency')) {
      // Would check frequency in production
      priorityScore += 1;
    }
    if (factors.includes('user_impact')) {
      // Would assess user impact in production
      priorityScore += 1;
    }

    if (priorityScore >= 3) feedback.priority = 'urgent';
    else if (priorityScore >= 2) feedback.priority = 'high';
    else if (priorityScore >= 1) feedback.priority = 'medium';
    else feedback.priority = 'low';
  }

  private async assignFeedback(feedback: FeedbackResponse, config: Record<string, any>): Promise<void> {
    const team = config.team || 'general';
    feedback.assignedTo = `${team}-team`;
    console.log(`👤 Assigned feedback ${feedback.id} to ${feedback.assignedTo}`);
  }

  private async sendNotification(feedback: FeedbackResponse, config: Record<string, any>): Promise<void> {
    const target = config.target || 'default';
    console.log(`📧 Sending notification about feedback ${feedback.id} to ${target}`);
  }

  private async sendResponse(feedback: FeedbackResponse, config: Record<string, any>): Promise<void> {
    const template = config.template || 'default';
    const delay = config.delay || 0;

    setTimeout(() => {
      console.log(`📨 Sending response to user for feedback ${feedback.id} using template ${template}`);
    }, delay * 60 * 1000); // Convert minutes to milliseconds
  }

  private async escalateFeedback(feedback: FeedbackResponse, config: Record<string, any>): Promise<void> {
    feedback.priority = 'urgent';
    feedback.assignedTo = config.escalateTo || 'management';
    console.log(`🚨 Escalated feedback ${feedback.id} to ${feedback.assignedTo}`);
  }

  private async checkAutoResponses(feedback: FeedbackResponse): Promise<void> {
    for (const autoResponse of this.autoResponses.values()) {
      if (!autoResponse.active) continue;

      if (this.matchesAutoResponseTrigger(autoResponse.trigger, feedback)) {
        await this.sendAutoResponse(autoResponse, feedback);
      }
    }
  }

  private matchesAutoResponseTrigger(trigger: AutoResponse['trigger'], feedback: FeedbackResponse): boolean {
    if (trigger.sentiment && feedback.sentiment !== trigger.sentiment) return false;
    if (trigger.priority && feedback.priority !== trigger.priority) return false;
    if (trigger.feedbackType && !feedback.tags.includes(trigger.feedbackType)) return false;
    
    if (trigger.keywords) {
      const text = Object.values(feedback.responses).join(' ').toLowerCase();
      const hasKeyword = trigger.keywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    return true;
  }

  private async sendAutoResponse(autoResponse: AutoResponse, feedback: FeedbackResponse): Promise<void> {
    const delay = autoResponse.response.delay || 0;

    setTimeout(() => {
      console.log(`🤖 Sending auto-response "${autoResponse.response.subject}" for feedback ${feedback.id}`);
      autoResponse.metrics.sent++;
    }, delay * 60 * 1000);

    // Schedule follow-up if configured
    if (autoResponse.response.followUp) {
      const followUpDelay = autoResponse.response.followUp.delay * 24 * 60 * 60 * 1000; // Convert days to ms
      setTimeout(() => {
        console.log(`📅 Sending follow-up message for feedback ${feedback.id}`);
      }, followUpDelay);
    }
  }

  private async createProjectTickets(feedback: FeedbackResponse): Promise<void> {
    // Create tickets in integrated project management systems
    for (const integration of this.integrations.values()) {
      if (!integration.active) continue;

      if (this.shouldCreateTicket(feedback, integration)) {
        await this.createTicket(feedback, integration);
      }
    }
  }

  private shouldCreateTicket(feedback: FeedbackResponse, integration: ProjectIntegration): boolean {
    // Create tickets for high priority items or specific types
    return feedback.priority === 'urgent' || 
           feedback.priority === 'high' ||
           feedback.tags.includes('bug-report');
  }

  private async createTicket(feedback: FeedbackResponse, integration: ProjectIntegration): Promise<void> {
    console.log(`🎫 Creating ticket in ${integration.name} for feedback ${feedback.id}`);
    
    // In production, this would make API calls to the project management system
    const ticketData = {
      title: `User Feedback: ${Object.values(feedback.responses)[0]}`,
      description: this.formatTicketDescription(feedback),
      priority: integration.mapping.priority[feedback.priority] || 'medium',
      labels: integration.config.labels || [],
      assignee: integration.config.defaultAssignee
    };

    console.log(`📋 Ticket created:`, ticketData);
  }

  private formatTicketDescription(feedback: FeedbackResponse): string {
    return `
**User Feedback Report**

**Feedback ID:** ${feedback.id}
**User:** ${feedback.userId}
**Priority:** ${feedback.priority}
**Sentiment:** ${feedback.sentiment}
**Tags:** ${feedback.tags.join(', ')}

**Feedback Details:**
${Object.entries(feedback.responses).map(([key, value]) => 
  `**${key}:** ${value}`
).join('\n')}

**Context:**
- Page: ${feedback.metadata.pageUrl}
- User Agent: ${feedback.metadata.userAgent}
- Timestamp: ${feedback.metadata.timestamp}

**Next Steps:**
- [ ] Review and assess impact
- [ ] Assign to appropriate team member
- [ ] Implement solution
- [ ] Follow up with user
    `.trim();
  }

  private async updateInsights(feedback: FeedbackResponse): Promise<void> {
    // Generate insights from feedback patterns
    // This would be more sophisticated in production
    
    if (feedback.sentiment === 'negative' && feedback.priority === 'high') {
      const insight: FeedbackInsight = {
        id: `insight-${Date.now()}`,
        type: 'anomaly',
        title: 'High Priority Negative Feedback Detected',
        description: `Received high-priority negative feedback about ${feedback.tags.join(', ')}`,
        data: { feedbackId: feedback.id, priority: feedback.priority },
        confidence: 0.8,
        actionable: true,
        recommendations: [
          'Review similar feedback patterns',
          'Prioritize fixes for this area',
          'Consider user communication'
        ],
        createdAt: new Date()
      };

      this.insights.push(insight);
    }
  }

  // Workflow management
  createWorkflow(workflow: Omit<FeedbackWorkflow, 'createdAt' | 'updatedAt'>): FeedbackWorkflow {
    const fullWorkflow: FeedbackWorkflow = {
      ...workflow,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflows.set(workflow.id, fullWorkflow);
    return fullWorkflow;
  }

  // Integration management
  addProjectIntegration(integration: ProjectIntegration): void {
    this.integrations.set(integration.id, integration);
  }

  // Processing loop
  private startProcessingLoop(): void {
    setInterval(() => {
      if (this.processingQueue.length > 0) {
        const feedback = this.processingQueue.shift();
        if (feedback) {
          this.processFeedback(feedback);
        }
      }
    }, 5000); // Process every 5 seconds
  }

  // Public interface
  queueFeedback(feedback: FeedbackResponse): void {
    this.processingQueue.push(feedback);
  }

  getInsights(limit: number = 10): FeedbackInsight[] {
    return this.insights
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getProcessingStats() {
    return {
      queueLength: this.processingQueue.length,
      totalCategories: this.categories.size,
      activeWorkflows: Array.from(this.workflows.values()).filter(w => w.active).length,
      activeIntegrations: Array.from(this.integrations.values()).filter(i => i.active).length,
      totalInsights: this.insights.length,
      autoResponsesSent: Array.from(this.autoResponses.values())
        .reduce((sum, ar) => sum + ar.metrics.sent, 0)
    };
  }
}

// Singleton instance
export const feedbackProcessor = new FeedbackProcessor();
