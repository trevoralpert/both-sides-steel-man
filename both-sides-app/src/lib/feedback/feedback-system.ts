/**
 * Comprehensive Feedback Collection System
 * Task 11.1.4: Feedback Collection & Analytics System Setup
 * 
 * Multi-channel feedback collection with contextual prompts,
 * NPS scoring, feature requests, and user interview scheduling.
 */

export interface FeedbackWidget {
  id: string;
  type: 'rating' | 'nps' | 'text' | 'multiple-choice' | 'feature-request';
  title: string;
  description?: string;
  context: string; // Where/when to show the widget
  trigger: 'manual' | 'time-based' | 'event-based' | 'session-end';
  questions: FeedbackQuestion[];
  styling: {
    position: 'bottom-right' | 'bottom-left' | 'center' | 'inline';
    theme: 'light' | 'dark' | 'auto';
    size: 'compact' | 'standard' | 'expanded';
  };
  targeting: {
    userTypes: ('student' | 'teacher' | 'admin')[];
    sessionTypes?: string[];
    minSessionCount?: number;
    excludeRecentFeedback?: boolean; // Don't show if user gave feedback recently
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackQuestion {
  id: string;
  type: 'rating' | 'text' | 'select' | 'multiselect' | 'nps' | 'boolean';
  question: string;
  required: boolean;
  options?: string[]; // For select/multiselect
  scale?: { min: number; max: number; labels?: string[] }; // For rating/NPS
  placeholder?: string; // For text inputs
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface FeedbackResponse {
  id: string;
  widgetId: string;
  userId: string;
  sessionId?: string;
  responses: Record<string, any>;
  metadata: {
    userAgent: string;
    timestamp: Date;
    context: string;
    sessionDuration?: number;
    pageUrl: string;
    referrer?: string;
  };
  sentiment?: 'positive' | 'neutral' | 'negative';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'reviewed' | 'in-progress' | 'resolved' | 'archived';
  tags: string[];
  assignedTo?: string;
  followUpScheduled?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NPSResponse {
  score: number; // 0-10
  category: 'detractor' | 'passive' | 'promoter';
  comment?: string;
  followUpConsent: boolean;
}

export interface FeatureRequest {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'ui-ux' | 'functionality' | 'performance' | 'integration' | 'content';
  priority: 'low' | 'medium' | 'high';
  votes: number;
  status: 'submitted' | 'under-review' | 'planned' | 'in-development' | 'completed' | 'rejected';
  estimatedEffort?: 'small' | 'medium' | 'large';
  targetRelease?: string;
  businessValue?: 'low' | 'medium' | 'high';
  technicalComplexity?: 'low' | 'medium' | 'high';
  userImpact?: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInterview {
  id: string;
  userId: string;
  type: 'user-experience' | 'feature-feedback' | 'usability-testing' | 'general';
  status: 'requested' | 'scheduled' | 'completed' | 'cancelled';
  preferredTimes: Date[];
  scheduledTime?: Date;
  duration: number; // minutes
  format: 'video-call' | 'phone' | 'in-person' | 'async';
  topics: string[];
  interviewer?: string;
  notes?: string;
  recording?: {
    url: string;
    transcription?: string;
    keyInsights: string[];
  };
  compensation?: {
    type: 'gift-card' | 'cash' | 'platform-credits' | 'none';
    amount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class FeedbackCollectionSystem {
  private widgets: Map<string, FeedbackWidget> = new Map();
  private responses: FeedbackResponse[] = [];
  private featureRequests: FeatureRequest[] = [];
  private interviews: UserInterview[] = [];

  constructor() {
    this.initializeDefaultWidgets();
  }

  private initializeDefaultWidgets() {
    // Post-debate satisfaction survey
    this.addWidget({
      id: 'post-debate-satisfaction',
      type: 'rating',
      title: 'How was your debate experience?',
      description: 'Help us improve by sharing your thoughts',
      context: 'post-debate',
      trigger: 'event-based',
      questions: [
        {
          id: 'overall-satisfaction',
          type: 'rating',
          question: 'Overall, how satisfied were you with this debate session?',
          required: true,
          scale: { min: 1, max: 5, labels: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'] }
        },
        {
          id: 'learning-value',
          type: 'rating',
          question: 'How much did you learn from this debate?',
          required: true,
          scale: { min: 1, max: 5, labels: ['Nothing', 'A little', 'Some', 'A lot', 'Tremendous'] }
        },
        {
          id: 'engagement-level',
          type: 'rating',
          question: 'How engaged did you feel during the debate?',
          required: true,
          scale: { min: 1, max: 5, labels: ['Not at all', 'Slightly', 'Moderately', 'Very', 'Extremely'] }
        },
        {
          id: 'improvement-suggestions',
          type: 'text',
          question: 'What could we improve about the debate experience?',
          required: false,
          placeholder: 'Share your suggestions...',
          validation: { maxLength: 500 }
        }
      ],
      styling: {
        position: 'center',
        theme: 'auto',
        size: 'standard'
      },
      targeting: {
        userTypes: ['student', 'teacher'],
        sessionTypes: ['debate'],
        excludeRecentFeedback: true
      },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // NPS Survey
    this.addWidget({
      id: 'nps-survey',
      type: 'nps',
      title: 'How likely are you to recommend Both Sides to others?',
      context: 'periodic',
      trigger: 'time-based',
      questions: [
        {
          id: 'nps-score',
          type: 'nps',
          question: 'On a scale of 0-10, how likely are you to recommend Both Sides to a friend or colleague?',
          required: true,
          scale: { min: 0, max: 10 }
        },
        {
          id: 'nps-reason',
          type: 'text',
          question: 'What is the primary reason for your score?',
          required: false,
          placeholder: 'Tell us why...',
          validation: { maxLength: 300 }
        },
        {
          id: 'follow-up-consent',
          type: 'boolean',
          question: 'Would you be willing to participate in a brief follow-up interview?',
          required: false
        }
      ],
      styling: {
        position: 'bottom-right',
        theme: 'auto',
        size: 'compact'
      },
      targeting: {
        userTypes: ['student', 'teacher'],
        minSessionCount: 3,
        excludeRecentFeedback: true
      },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Feature Request Widget
    this.addWidget({
      id: 'feature-request',
      type: 'feature-request',
      title: 'Have an idea for improvement?',
      description: 'Share your feature requests and help shape the future of Both Sides',
      context: 'feature-request',
      trigger: 'manual',
      questions: [
        {
          id: 'feature-title',
          type: 'text',
          question: 'What feature would you like to see?',
          required: true,
          placeholder: 'Brief title for your feature idea...',
          validation: { minLength: 10, maxLength: 100 }
        },
        {
          id: 'feature-description',
          type: 'text',
          question: 'Describe your feature idea in detail',
          required: true,
          placeholder: 'Explain how this feature would work and why it would be valuable...',
          validation: { minLength: 50, maxLength: 1000 }
        },
        {
          id: 'feature-category',
          type: 'select',
          question: 'What category does this feature belong to?',
          required: true,
          options: ['User Interface', 'Debate Features', 'Analytics & Reporting', 'Mobile App', 'Integrations', 'Other']
        },
        {
          id: 'feature-priority',
          type: 'select',
          question: 'How important is this feature to you?',
          required: true,
          options: ['Nice to have', 'Important', 'Critical']
        }
      ],
      styling: {
        position: 'center',
        theme: 'auto',
        size: 'expanded'
      },
      targeting: {
        userTypes: ['student', 'teacher', 'admin']
      },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Bug Report Widget
    this.addWidget({
      id: 'bug-report',
      type: 'text',
      title: 'Report an Issue',
      description: 'Help us fix problems by reporting bugs or issues',
      context: 'bug-report',
      trigger: 'manual',
      questions: [
        {
          id: 'bug-summary',
          type: 'text',
          question: 'What went wrong?',
          required: true,
          placeholder: 'Brief description of the issue...',
          validation: { minLength: 10, maxLength: 200 }
        },
        {
          id: 'bug-steps',
          type: 'text',
          question: 'How can we reproduce this issue?',
          required: true,
          placeholder: 'Step 1: ...\nStep 2: ...\nStep 3: ...',
          validation: { minLength: 20, maxLength: 500 }
        },
        {
          id: 'bug-expected',
          type: 'text',
          question: 'What did you expect to happen?',
          required: false,
          placeholder: 'Describe the expected behavior...',
          validation: { maxLength: 300 }
        },
        {
          id: 'bug-severity',
          type: 'select',
          question: 'How severe is this issue?',
          required: true,
          options: ['Minor annoyance', 'Moderate problem', 'Major issue', 'Critical - prevents use']
        }
      ],
      styling: {
        position: 'center',
        theme: 'auto',
        size: 'expanded'
      },
      targeting: {
        userTypes: ['student', 'teacher', 'admin']
      },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  addWidget(widget: Omit<FeedbackWidget, 'id' | 'createdAt' | 'updatedAt'> & { id: string }): void {
    const fullWidget: FeedbackWidget = {
      ...widget,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.widgets.set(widget.id, fullWidget);
  }

  getWidget(id: string): FeedbackWidget | undefined {
    return this.widgets.get(id);
  }

  getActiveWidgets(context?: string, userType?: string): FeedbackWidget[] {
    return Array.from(this.widgets.values()).filter(widget => {
      if (!widget.active) return false;
      if (context && widget.context !== context) return false;
      if (userType && !widget.targeting.userTypes.includes(userType as any)) return false;
      return true;
    });
  }

  async submitFeedback(
    widgetId: string,
    userId: string,
    responses: Record<string, any>,
    metadata: Partial<FeedbackResponse['metadata']>
  ): Promise<FeedbackResponse> {
    const widget = this.getWidget(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    const response: FeedbackResponse = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      widgetId,
      userId,
      responses,
      metadata: {
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        context: widget.context,
        pageUrl: window.location.href,
        ...metadata
      },
      sentiment: this.analyzeSentiment(responses),
      priority: this.calculatePriority(responses, widget),
      status: 'new',
      tags: this.generateTags(responses, widget),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.responses.push(response);

    // Handle special widget types
    if (widget.type === 'nps') {
      await this.processNPSResponse(response);
    } else if (widget.type === 'feature-request') {
      await this.processFeatureRequest(response);
    }

    return response;
  }

  private analyzeSentiment(responses: Record<string, any>): 'positive' | 'neutral' | 'negative' {
    // Simple sentiment analysis based on ratings and text
    const ratings = Object.values(responses).filter(v => typeof v === 'number');
    const textResponses = Object.values(responses).filter(v => typeof v === 'string');

    if (ratings.length > 0) {
      const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      if (avgRating >= 4) return 'positive';
      if (avgRating <= 2) return 'negative';
      return 'neutral';
    }

    // Basic text sentiment analysis (would use more sophisticated NLP in production)
    const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'helpful', 'useful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'broken', 'confusing', 'frustrating'];

    const text = textResponses.join(' ').toLowerCase();
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculatePriority(responses: Record<string, any>, widget: FeedbackWidget): 'low' | 'medium' | 'high' | 'urgent' {
    // Priority calculation based on response content and widget type
    if (widget.id === 'bug-report') {
      const severity = responses['bug-severity'];
      if (severity === 'Critical - prevents use') return 'urgent';
      if (severity === 'Major issue') return 'high';
      if (severity === 'Moderate problem') return 'medium';
      return 'low';
    }

    if (widget.type === 'nps') {
      const score = responses['nps-score'];
      if (score <= 6) return 'high'; // Detractors
      if (score <= 8) return 'medium'; // Passives
      return 'low'; // Promoters
    }

    const sentiment = this.analyzeSentiment(responses);
    if (sentiment === 'negative') return 'high';
    if (sentiment === 'positive') return 'low';
    return 'medium';
  }

  private generateTags(responses: Record<string, any>, widget: FeedbackWidget): string[] {
    const tags: string[] = [widget.type, widget.context];

    // Add sentiment tag
    tags.push(this.analyzeSentiment(responses));

    // Add specific tags based on content
    if (widget.id === 'bug-report') {
      tags.push('bug', responses['bug-severity']?.toLowerCase().replace(/\s+/g, '-') || 'unknown-severity');
    }

    if (widget.type === 'feature-request') {
      tags.push('feature-request', responses['feature-category']?.toLowerCase().replace(/\s+/g, '-') || 'uncategorized');
    }

    if (widget.type === 'nps') {
      const score = responses['nps-score'];
      if (score <= 6) tags.push('detractor');
      else if (score <= 8) tags.push('passive');
      else tags.push('promoter');
    }

    return tags;
  }

  private async processNPSResponse(response: FeedbackResponse): Promise<void> {
    const score = response.responses['nps-score'];
    const comment = response.responses['nps-reason'];
    const followUpConsent = response.responses['follow-up-consent'];

    const npsResponse: NPSResponse = {
      score,
      category: score <= 6 ? 'detractor' : score <= 8 ? 'passive' : 'promoter',
      comment,
      followUpConsent
    };

    // Schedule follow-up interview if user consented and is a detractor
    if (followUpConsent && npsResponse.category === 'detractor') {
      await this.scheduleUserInterview(response.userId, 'user-experience', [
        'User satisfaction',
        'Pain points',
        'Improvement suggestions'
      ]);
    }
  }

  private async processFeatureRequest(response: FeedbackResponse): Promise<void> {
    const featureRequest: FeatureRequest = {
      id: `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: response.userId,
      title: response.responses['feature-title'],
      description: response.responses['feature-description'],
      category: response.responses['feature-category']?.toLowerCase().replace(/\s+/g, '-') as any || 'other',
      priority: response.responses['feature-priority'] === 'Critical' ? 'high' : 
                response.responses['feature-priority'] === 'Important' ? 'medium' : 'low',
      votes: 1,
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.featureRequests.push(featureRequest);
  }

  async scheduleUserInterview(
    userId: string,
    type: UserInterview['type'],
    topics: string[],
    preferredTimes?: Date[]
  ): Promise<UserInterview> {
    const interview: UserInterview = {
      id: `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      status: 'requested',
      preferredTimes: preferredTimes || [],
      duration: 30, // Default 30 minutes
      format: 'video-call',
      topics,
      compensation: {
        type: 'gift-card',
        amount: 25
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.interviews.push(interview);
    return interview;
  }

  // Analytics and reporting methods
  getFeedbackSummary(dateRange?: { start: Date; end: Date }) {
    const filteredResponses = dateRange 
      ? this.responses.filter(r => r.createdAt >= dateRange.start && r.createdAt <= dateRange.end)
      : this.responses;

    const totalResponses = filteredResponses.length;
    const sentimentBreakdown = {
      positive: filteredResponses.filter(r => r.sentiment === 'positive').length,
      neutral: filteredResponses.filter(r => r.sentiment === 'neutral').length,
      negative: filteredResponses.filter(r => r.sentiment === 'negative').length
    };

    const priorityBreakdown = {
      urgent: filteredResponses.filter(r => r.priority === 'urgent').length,
      high: filteredResponses.filter(r => r.priority === 'high').length,
      medium: filteredResponses.filter(r => r.priority === 'medium').length,
      low: filteredResponses.filter(r => r.priority === 'low').length
    };

    const widgetPerformance = Array.from(this.widgets.values()).map(widget => ({
      widgetId: widget.id,
      title: widget.title,
      responses: filteredResponses.filter(r => r.widgetId === widget.id).length,
      avgSentiment: this.calculateAverageSentiment(filteredResponses.filter(r => r.widgetId === widget.id))
    }));

    return {
      totalResponses,
      sentimentBreakdown,
      priorityBreakdown,
      widgetPerformance,
      responseRate: this.calculateResponseRate(),
      npsScore: this.calculateNPSScore(filteredResponses)
    };
  }

  private calculateAverageSentiment(responses: FeedbackResponse[]): number {
    if (responses.length === 0) return 0;
    
    const sentimentScores = responses.map(r => {
      switch (r.sentiment) {
        case 'positive': return 1;
        case 'neutral': return 0;
        case 'negative': return -1;
        default: return 0;
      }
    });

    return sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
  }

  private calculateResponseRate(): number {
    // This would be calculated based on widget impressions vs responses
    // For now, return a placeholder
    return 0.35; // 35% response rate
  }

  private calculateNPSScore(responses: FeedbackResponse[]): number | null {
    const npsResponses = responses.filter(r => r.widgetId === 'nps-survey');
    if (npsResponses.length === 0) return null;

    const scores = npsResponses.map(r => r.responses['nps-score']).filter(s => typeof s === 'number');
    if (scores.length === 0) return null;

    const promoters = scores.filter(s => s >= 9).length;
    const detractors = scores.filter(s => s <= 6).length;
    
    return ((promoters - detractors) / scores.length) * 100;
  }

  // Export data for analysis
  exportFeedbackData(format: 'json' | 'csv' = 'json') {
    const data = {
      responses: this.responses,
      featureRequests: this.featureRequests,
      interviews: this.interviews,
      summary: this.getFeedbackSummary()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV export would be implemented here
    return data;
  }
}

// Singleton instance
export const feedbackSystem = new FeedbackCollectionSystem();
