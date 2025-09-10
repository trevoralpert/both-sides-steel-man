/**
 * Advanced Analytics Implementation
 * Task 11.1.4: Feedback Collection & Analytics System Setup
 * 
 * User journey tracking, funnel analysis, feature usage analytics,
 * heatmaps, educational outcome measurement, and A/B testing framework.
 */

export interface UserJourney {
  id: string;
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  steps: JourneyStep[];
  outcome: 'completed' | 'abandoned' | 'in-progress';
  conversionEvents: string[];
  totalDuration?: number; // milliseconds
  metadata: {
    userAgent: string;
    device: 'desktop' | 'tablet' | 'mobile';
    referrer?: string;
    campaign?: string;
    cohort?: string;
  };
}

export interface JourneyStep {
  id: string;
  timestamp: Date;
  event: string;
  page: string;
  element?: string;
  duration: number; // time spent on this step
  data?: Record<string, any>;
  exitPoint?: boolean;
}

export interface FunnelAnalysis {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
  timeframe: { start: Date; end: Date };
  cohort?: string;
  filters?: Record<string, any>;
  results: FunnelResults;
  createdAt: Date;
}

export interface FunnelStep {
  id: string;
  name: string;
  event: string;
  conditions?: Record<string, any>;
  order: number;
}

export interface FunnelResults {
  totalUsers: number;
  stepResults: Array<{
    stepId: string;
    users: number;
    conversionRate: number;
    dropoffRate: number;
    averageTime: number;
  }>;
  overallConversionRate: number;
  bottlenecks: Array<{
    stepId: string;
    dropoffRate: number;
    commonExitPages: string[];
    suggestedImprovements: string[];
  }>;
}

export interface FeatureUsageAnalytics {
  featureId: string;
  featureName: string;
  category: 'core' | 'secondary' | 'experimental';
  usage: {
    totalUsers: number;
    activeUsers: number;
    adoptionRate: number;
    retentionRate: number;
    averageUsagePerUser: number;
    usageFrequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
  };
  performance: {
    averageLoadTime: number;
    errorRate: number;
    successRate: number;
  };
  userSegments: Array<{
    segment: string;
    adoptionRate: number;
    satisfactionScore: number;
  }>;
  trends: {
    growth: number; // percentage
    seasonality: Record<string, number>;
    predictions: Record<string, number>;
  };
}

export interface HeatmapData {
  id: string;
  page: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  viewport: { width: number; height: number };
  interactions: Array<{
    type: 'click' | 'hover' | 'scroll' | 'focus';
    x: number;
    y: number;
    element: string;
    timestamp: number; // relative to session start
    duration?: number; // for hover/focus
  }>;
  scrollDepth: number; // percentage
  timeOnPage: number; // milliseconds
  exitPoint?: { x: number; y: number };
}

export interface EducationalOutcome {
  id: string;
  userId: string;
  sessionId: string;
  topicId: string;
  measurementType: 'pre-assessment' | 'post-assessment' | 'skill-demonstration' | 'peer-evaluation';
  metrics: {
    criticalThinking: number; // 0-100
    argumentation: number; // 0-100
    evidenceUsage: number; // 0-100
    respectfulDiscourse: number; // 0-100
    perspectiveTaking: number; // 0-100
    overallScore: number; // 0-100
  };
  improvements: {
    [key: string]: {
      before: number;
      after: number;
      improvement: number;
    };
  };
  teacherAssessment?: {
    rating: number;
    comments: string;
    skillsObserved: string[];
  };
  peerFeedback?: Array<{
    fromUserId: string;
    rating: number;
    comments: string;
  }>;
  timestamp: Date;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  variants: ABTestVariant[];
  targeting: {
    userSegments: string[];
    trafficAllocation: number; // 0-1
    startDate: Date;
    endDate?: Date;
    conditions?: Record<string, any>;
  };
  metrics: {
    primary: string;
    secondary: string[];
    successCriteria: Record<string, number>;
  };
  results?: ABTestResults;
  createdAt: Date;
  updatedAt: Date;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  trafficAllocation: number; // 0-1
  config: Record<string, any>;
  isControl: boolean;
}

export interface ABTestResults {
  totalParticipants: number;
  variantResults: Array<{
    variantId: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    confidence: number;
    significance: boolean;
    metrics: Record<string, number>;
  }>;
  winner?: string;
  statisticalSignificance: boolean;
  confidenceLevel: number;
  recommendations: string[];
}

export class AdvancedAnalyticsSystem {
  private journeys: Map<string, UserJourney> = new Map();
  private funnels: Map<string, FunnelAnalysis> = new Map();
  private featureUsage: Map<string, FeatureUsageAnalytics> = new Map();
  private heatmaps: HeatmapData[] = [];
  private educationalOutcomes: EducationalOutcome[] = [];
  private abTests: Map<string, ABTest> = new Map();
  private isTracking: boolean = true;

  constructor() {
    this.initializeDefaultFunnels();
    this.initializeDefaultABTests();
  }

  // User Journey Tracking
  startUserJourney(userId: string, sessionId: string, metadata: UserJourney['metadata']): UserJourney {
    const journey: UserJourney = {
      id: `journey-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      sessionId,
      startTime: new Date(),
      steps: [],
      outcome: 'in-progress',
      conversionEvents: [],
      metadata
    };

    this.journeys.set(journey.id, journey);
    return journey;
  }

  addJourneyStep(
    journeyId: string,
    event: string,
    page: string,
    element?: string,
    data?: Record<string, any>
  ): void {
    const journey = this.journeys.get(journeyId);
    if (!journey) return;

    const previousStep = journey.steps[journey.steps.length - 1];
    const now = new Date();
    const duration = previousStep ? now.getTime() - previousStep.timestamp.getTime() : 0;

    const step: JourneyStep = {
      id: `step-${journey.steps.length + 1}`,
      timestamp: now,
      event,
      page,
      element,
      duration,
      data
    };

    journey.steps.push(step);
    this.journeys.set(journeyId, journey);
  }

  completeUserJourney(journeyId: string, outcome: 'completed' | 'abandoned'): void {
    const journey = this.journeys.get(journeyId);
    if (!journey) return;

    journey.endTime = new Date();
    journey.outcome = outcome;
    journey.totalDuration = journey.endTime.getTime() - journey.startTime.getTime();

    this.journeys.set(journeyId, journey);
  }

  // Funnel Analysis
  private initializeDefaultFunnels(): void {
    // Student Onboarding Funnel
    this.createFunnel({
      id: 'student-onboarding',
      name: 'Student Onboarding',
      description: 'Track student progression through onboarding process',
      steps: [
        { id: 'signup', name: 'Sign Up', event: 'user_registered', order: 1 },
        { id: 'profile', name: 'Complete Profile', event: 'profile_completed', order: 2 },
        { id: 'survey', name: 'Belief Survey', event: 'survey_completed', order: 3 },
        { id: 'first-match', name: 'First Debate Match', event: 'debate_matched', order: 4 },
        { id: 'first-debate', name: 'First Debate Completed', event: 'debate_completed', order: 5 }
      ],
      timeframe: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }
    });

    // Teacher Adoption Funnel
    this.createFunnel({
      id: 'teacher-adoption',
      name: 'Teacher Adoption',
      description: 'Track teacher progression from signup to active use',
      steps: [
        { id: 'signup', name: 'Teacher Sign Up', event: 'teacher_registered', order: 1 },
        { id: 'class-setup', name: 'First Class Setup', event: 'class_created', order: 2 },
        { id: 'student-invite', name: 'Students Invited', event: 'students_invited', order: 3 },
        { id: 'first-session', name: 'First Debate Session', event: 'session_created', order: 4 },
        { id: 'active-use', name: 'Regular Usage', event: 'weekly_active', order: 5 }
      ],
      timeframe: { start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), end: new Date() }
    });
  }

  createFunnel(funnel: Omit<FunnelAnalysis, 'results' | 'createdAt'>): FunnelAnalysis {
    const completeFunnel: FunnelAnalysis = {
      ...funnel,
      results: {
        totalUsers: 0,
        stepResults: [],
        overallConversionRate: 0,
        bottlenecks: []
      },
      createdAt: new Date()
    };

    this.funnels.set(funnel.id, completeFunnel);
    return completeFunnel;
  }

  analyzeFunnel(funnelId: string): FunnelResults | null {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return null;

    // Simulate funnel analysis (in production, this would query actual data)
    const mockResults: FunnelResults = {
      totalUsers: 1000,
      stepResults: funnel.steps.map((step, index) => {
        const dropoffRate = Math.pow(0.8, index); // 20% dropoff per step
        const users = Math.floor(1000 * dropoffRate);
        return {
          stepId: step.id,
          users,
          conversionRate: index === 0 ? 100 : (users / (1000 * Math.pow(0.8, index - 1))) * 100,
          dropoffRate: index === 0 ? 0 : 20,
          averageTime: Math.floor(Math.random() * 300) + 60 // 1-5 minutes
        };
      }),
      overallConversionRate: 32.8, // 80% ^ 4 steps
      bottlenecks: [
        {
          stepId: 'survey',
          dropoffRate: 25,
          commonExitPages: ['/survey', '/profile'],
          suggestedImprovements: [
            'Simplify survey questions',
            'Add progress indicator',
            'Provide survey preview'
          ]
        }
      ]
    };

    funnel.results = mockResults;
    this.funnels.set(funnelId, funnel);
    return mockResults;
  }

  // Feature Usage Analytics
  trackFeatureUsage(
    featureId: string,
    userId: string,
    action: 'view' | 'interact' | 'complete',
    metadata?: Record<string, any>
  ): void {
    if (!this.isTracking) return;

    // Update or create feature usage analytics
    let analytics = this.featureUsage.get(featureId);
    if (!analytics) {
      analytics = this.createFeatureAnalytics(featureId);
    }

    // Update usage metrics (simplified for demo)
    analytics.usage.totalUsers += 1;
    analytics.usage.activeUsers = Math.floor(analytics.usage.totalUsers * 0.7);
    analytics.usage.adoptionRate = (analytics.usage.activeUsers / analytics.usage.totalUsers) * 100;

    this.featureUsage.set(featureId, analytics);
  }

  private createFeatureAnalytics(featureId: string): FeatureUsageAnalytics {
    return {
      featureId,
      featureName: this.getFeatureName(featureId),
      category: this.getFeatureCategory(featureId),
      usage: {
        totalUsers: 0,
        activeUsers: 0,
        adoptionRate: 0,
        retentionRate: 75,
        averageUsagePerUser: 3.2,
        usageFrequency: 'weekly'
      },
      performance: {
        averageLoadTime: Math.random() * 1000 + 500, // 500-1500ms
        errorRate: Math.random() * 5, // 0-5%
        successRate: 95 + Math.random() * 5 // 95-100%
      },
      userSegments: [
        { segment: 'students', adoptionRate: 85, satisfactionScore: 4.2 },
        { segment: 'teachers', adoptionRate: 92, satisfactionScore: 4.5 }
      ],
      trends: {
        growth: 15.3,
        seasonality: { 'Q1': 1.2, 'Q2': 0.8, 'Q3': 0.6, 'Q4': 1.4 },
        predictions: { 'next_month': 1.15, 'next_quarter': 1.25 }
      }
    };
  }

  private getFeatureName(featureId: string): string {
    const names: Record<string, string> = {
      'debate-matching': 'Debate Matching',
      'real-time-chat': 'Real-time Chat',
      'ai-coaching': 'AI Coaching',
      'progress-tracking': 'Progress Tracking',
      'teacher-dashboard': 'Teacher Dashboard'
    };
    return names[featureId] || featureId;
  }

  private getFeatureCategory(featureId: string): 'core' | 'secondary' | 'experimental' {
    const coreFeatures = ['debate-matching', 'real-time-chat'];
    const experimentalFeatures = ['ai-coaching'];
    
    if (coreFeatures.includes(featureId)) return 'core';
    if (experimentalFeatures.includes(featureId)) return 'experimental';
    return 'secondary';
  }

  // Heatmap Data Collection
  recordHeatmapData(data: Omit<HeatmapData, 'id'>): void {
    const heatmapData: HeatmapData = {
      id: `heatmap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data
    };

    this.heatmaps.push(heatmapData);

    // Keep only recent heatmap data (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.heatmaps = this.heatmaps.filter(h => h.timestamp > weekAgo);
  }

  getHeatmapData(page: string, timeframe?: { start: Date; end: Date }): HeatmapData[] {
    let data = this.heatmaps.filter(h => h.page === page);
    
    if (timeframe) {
      data = data.filter(h => h.timestamp >= timeframe.start && h.timestamp <= timeframe.end);
    }

    return data;
  }

  // Educational Outcome Measurement
  recordEducationalOutcome(outcome: Omit<EducationalOutcome, 'id'>): EducationalOutcome {
    const fullOutcome: EducationalOutcome = {
      id: `outcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...outcome
    };

    this.educationalOutcomes.push(fullOutcome);
    return fullOutcome;
  }

  analyzeEducationalProgress(userId: string, timeframe?: { start: Date; end: Date }): {
    overallImprovement: number;
    skillBreakdown: Record<string, { current: number; improvement: number }>;
    trends: Record<string, number[]>;
    recommendations: string[];
  } {
    let outcomes = this.educationalOutcomes.filter(o => o.userId === userId);
    
    if (timeframe) {
      outcomes = outcomes.filter(o => o.timestamp >= timeframe.start && o.timestamp <= timeframe.end);
    }

    if (outcomes.length === 0) {
      return {
        overallImprovement: 0,
        skillBreakdown: {},
        trends: {},
        recommendations: ['Complete more debate sessions to track progress']
      };
    }

    // Calculate improvements
    const skills = ['criticalThinking', 'argumentation', 'evidenceUsage', 'respectfulDiscourse', 'perspectiveTaking'];
    const skillBreakdown: Record<string, { current: number; improvement: number }> = {};
    
    skills.forEach(skill => {
      const skillOutcomes = outcomes.map(o => o.metrics[skill as keyof typeof o.metrics]).filter(Boolean);
      if (skillOutcomes.length > 0) {
        const current = skillOutcomes[skillOutcomes.length - 1];
        const initial = skillOutcomes[0];
        skillBreakdown[skill] = {
          current,
          improvement: skillOutcomes.length > 1 ? current - initial : 0
        };
      }
    });

    const overallImprovement = Object.values(skillBreakdown)
      .reduce((sum, skill) => sum + skill.improvement, 0) / Object.keys(skillBreakdown).length;

    return {
      overallImprovement,
      skillBreakdown,
      trends: this.calculateSkillTrends(outcomes),
      recommendations: this.generateRecommendations(skillBreakdown)
    };
  }

  private calculateSkillTrends(outcomes: EducationalOutcome[]): Record<string, number[]> {
    const skills = ['criticalThinking', 'argumentation', 'evidenceUsage', 'respectfulDiscourse', 'perspectiveTaking'];
    const trends: Record<string, number[]> = {};

    skills.forEach(skill => {
      trends[skill] = outcomes.map(o => o.metrics[skill as keyof typeof o.metrics]).filter(Boolean);
    });

    return trends;
  }

  private generateRecommendations(skillBreakdown: Record<string, { current: number; improvement: number }>): string[] {
    const recommendations: string[] = [];

    Object.entries(skillBreakdown).forEach(([skill, data]) => {
      if (data.current < 70) {
        switch (skill) {
          case 'criticalThinking':
            recommendations.push('Focus on analyzing evidence and identifying logical fallacies');
            break;
          case 'argumentation':
            recommendations.push('Practice structuring arguments with clear premises and conclusions');
            break;
          case 'evidenceUsage':
            recommendations.push('Incorporate more credible sources and data in your arguments');
            break;
          case 'respectfulDiscourse':
            recommendations.push('Work on acknowledging opposing viewpoints respectfully');
            break;
          case 'perspectiveTaking':
            recommendations.push('Try to understand and articulate different perspectives on issues');
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Great progress! Continue participating in diverse debate topics');
    }

    return recommendations;
  }

  // A/B Testing Framework
  private initializeDefaultABTests(): void {
    this.createABTest({
      id: 'onboarding-flow-v2',
      name: 'Simplified Onboarding Flow',
      description: 'Test a simplified onboarding process with fewer steps',
      hypothesis: 'Reducing onboarding steps will increase completion rate',
      status: 'running',
      variants: [
        {
          id: 'control',
          name: 'Current Onboarding',
          description: 'Existing 5-step onboarding process',
          trafficAllocation: 0.5,
          config: { steps: 5, survey_length: 'full' },
          isControl: true
        },
        {
          id: 'simplified',
          name: 'Simplified Onboarding',
          description: 'Streamlined 3-step onboarding process',
          trafficAllocation: 0.5,
          config: { steps: 3, survey_length: 'short' },
          isControl: false
        }
      ],
      targeting: {
        userSegments: ['new_users'],
        trafficAllocation: 1.0,
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
        conditions: { user_type: 'student' }
      },
      metrics: {
        primary: 'onboarding_completion_rate',
        secondary: ['time_to_first_debate', 'user_satisfaction', 'retention_rate'],
        successCriteria: { onboarding_completion_rate: 0.8 }
      }
    });
  }

  createABTest(test: Omit<ABTest, 'createdAt' | 'updatedAt'>): ABTest {
    const fullTest: ABTest = {
      ...test,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.abTests.set(test.id, fullTest);
    return fullTest;
  }

  getABTestVariant(testId: string, userId: string): ABTestVariant | null {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') return null;

    // Simple hash-based assignment for consistent user experience
    const hash = this.hashUserId(userId + testId);
    const random = hash / 2147483647; // Normalize to 0-1

    let cumulativeAllocation = 0;
    for (const variant of test.variants) {
      cumulativeAllocation += variant.trafficAllocation;
      if (random <= cumulativeAllocation) {
        return variant;
      }
    }

    return test.variants[0]; // Fallback to first variant
  }

  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  recordABTestConversion(testId: string, userId: string, metric: string, value: number = 1): void {
    const test = this.abTests.get(testId);
    if (!test) return;

    const variant = this.getABTestVariant(testId, userId);
    if (!variant) return;

    // In production, this would update the test results in a database
    console.log(`📊 A/B Test Conversion: ${testId} (${variant.id}) - ${metric}: ${value}`);
  }

  analyzeABTest(testId: string): ABTestResults | null {
    const test = this.abTests.get(testId);
    if (!test) return null;

    // Simulate A/B test results (in production, this would calculate from actual data)
    const mockResults: ABTestResults = {
      totalParticipants: 2000,
      variantResults: test.variants.map(variant => ({
        variantId: variant.id,
        participants: Math.floor(2000 * variant.trafficAllocation),
        conversions: Math.floor(2000 * variant.trafficAllocation * (variant.isControl ? 0.65 : 0.78)),
        conversionRate: variant.isControl ? 65 : 78,
        confidence: 95,
        significance: !variant.isControl,
        metrics: {
          onboarding_completion_rate: variant.isControl ? 0.65 : 0.78,
          time_to_first_debate: variant.isControl ? 1200 : 900, // seconds
          user_satisfaction: variant.isControl ? 4.2 : 4.5
        }
      })),
      winner: 'simplified',
      statisticalSignificance: true,
      confidenceLevel: 95,
      recommendations: [
        'Deploy simplified onboarding to all users',
        'Monitor long-term retention impact',
        'Consider further simplification opportunities'
      ]
    };

    test.results = mockResults;
    this.abTests.set(testId, test);
    return mockResults;
  }

  // Analytics Dashboard Data
  getDashboardData(timeframe: { start: Date; end: Date }) {
    return {
      userJourneys: {
        total: this.journeys.size,
        completed: Array.from(this.journeys.values()).filter(j => j.outcome === 'completed').length,
        abandoned: Array.from(this.journeys.values()).filter(j => j.outcome === 'abandoned').length,
        averageDuration: this.calculateAverageJourneyDuration()
      },
      funnelPerformance: Array.from(this.funnels.values()).map(f => ({
        id: f.id,
        name: f.name,
        conversionRate: f.results.overallConversionRate,
        bottlenecks: f.results.bottlenecks.length
      })),
      featureAdoption: Array.from(this.featureUsage.values()).map(f => ({
        feature: f.featureName,
        adoptionRate: f.usage.adoptionRate,
        satisfactionScore: f.userSegments.reduce((sum, s) => sum + s.satisfactionScore, 0) / f.userSegments.length
      })),
      educationalImpact: {
        totalOutcomes: this.educationalOutcomes.length,
        averageImprovement: this.calculateAverageImprovement(),
        topSkills: this.getTopImprovingSkills()
      },
      activeTests: Array.from(this.abTests.values()).filter(t => t.status === 'running').length
    };
  }

  private calculateAverageJourneyDuration(): number {
    const completedJourneys = Array.from(this.journeys.values()).filter(j => j.totalDuration);
    if (completedJourneys.length === 0) return 0;
    
    const totalDuration = completedJourneys.reduce((sum, j) => sum + (j.totalDuration || 0), 0);
    return totalDuration / completedJourneys.length;
  }

  private calculateAverageImprovement(): number {
    if (this.educationalOutcomes.length === 0) return 0;
    
    const improvements = this.educationalOutcomes.map(o => o.metrics.overallScore);
    return improvements.reduce((sum, score) => sum + score, 0) / improvements.length;
  }

  private getTopImprovingSkills(): Array<{ skill: string; improvement: number }> {
    const skills = ['criticalThinking', 'argumentation', 'evidenceUsage', 'respectfulDiscourse', 'perspectiveTaking'];
    
    return skills.map(skill => ({
      skill,
      improvement: Math.random() * 20 + 5 // Mock 5-25% improvement
    })).sort((a, b) => b.improvement - a.improvement);
  }

  // Export analytics data
  exportAnalyticsData(format: 'json' | 'csv' = 'json') {
    const data = {
      userJourneys: Array.from(this.journeys.values()),
      funnelAnalyses: Array.from(this.funnels.values()),
      featureUsage: Array.from(this.featureUsage.values()),
      heatmaps: this.heatmaps,
      educationalOutcomes: this.educationalOutcomes,
      abTests: Array.from(this.abTests.values()),
      dashboardSummary: this.getDashboardData({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      })
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV export would be implemented here
    return data;
  }
}

// Singleton instance
export const advancedAnalytics = new AdvancedAnalyticsSystem();
