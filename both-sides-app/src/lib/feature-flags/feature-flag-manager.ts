/**
 * Feature Flag Management System
 * Comprehensive feature flag system for controlled rollouts, A/B testing, and configuration management
 */

export interface FeatureFlagConfig {
  provider: 'local' | 'launchdarkly' | 'split' | 'flagsmith' | 'configcat';
  environment: string;
  apiKey?: string;
  refreshInterval: number; // seconds
  fallbackMode: 'conservative' | 'optimistic';
  caching: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number;
  };
  analytics: {
    enabled: boolean;
    trackEvaluations: boolean;
    trackExposures: boolean;
  };
  targeting: {
    enabled: boolean;
    rules: TargetingRule[];
  };
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  type: FlagType;
  defaultValue: FlagValue;
  variations: FlagVariation[];
  targeting: FlagTargeting;
  rollout: RolloutConfig;
  metadata: FlagMetadata;
  status: FlagStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type FlagType = 'boolean' | 'string' | 'number' | 'json';
export type FlagValue = boolean | string | number | object;
export type FlagStatus = 'active' | 'inactive' | 'archived' | 'deprecated';

export interface FlagVariation {
  id: string;
  name: string;
  description: string;
  value: FlagValue;
  weight?: number; // for percentage rollouts
}

export interface FlagTargeting {
  enabled: boolean;
  rules: TargetingRule[];
  fallthrough: FallthroughConfig;
}

export interface TargetingRule {
  id: string;
  description: string;
  conditions: TargetingCondition[];
  variation: string;
  rollout?: RolloutConfig;
}

export interface TargetingCondition {
  attribute: string;
  operator: ConditionOperator;
  values: string[];
  negate?: boolean;
}

export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'starts_with' 
  | 'ends_with' 
  | 'matches_regex' 
  | 'in' 
  | 'not_in' 
  | 'greater_than' 
  | 'less_than' 
  | 'greater_equal' 
  | 'less_equal' 
  | 'exists' 
  | 'not_exists';

export interface FallthroughConfig {
  variation?: string;
  rollout?: RolloutConfig;
}

export interface RolloutConfig {
  type: 'percentage' | 'user_hash' | 'custom';
  variations: Array<{
    variation: string;
    weight: number;
  }>;
  bucketBy?: string; // attribute to bucket by (e.g., 'userId', 'sessionId')
}

export interface FlagMetadata {
  owner: string;
  team: string;
  tags: string[];
  category: string;
  purpose: string;
  deprecationDate?: Date;
  migrationInstructions?: string;
}

export interface UserContext {
  userId?: string;
  sessionId?: string;
  email?: string;
  userType?: 'student' | 'teacher' | 'admin';
  schoolId?: string;
  grade?: string;
  country?: string;
  language?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  customAttributes?: Record<string, any>;
}

export interface FlagEvaluation {
  flagKey: string;
  value: FlagValue;
  variation: string;
  reason: EvaluationReason;
  ruleId?: string;
  timestamp: Date;
  context: UserContext;
}

export interface EvaluationReason {
  kind: 'OFF' | 'FALLTHROUGH' | 'TARGET_MATCH' | 'RULE_MATCH' | 'PREREQUISITE_FAILED' | 'ERROR';
  ruleIndex?: number;
  ruleId?: string;
  prerequisiteKey?: string;
  errorKind?: string;
}

export interface FlagAnalytics {
  flagKey: string;
  evaluations: number;
  uniqueUsers: number;
  variationCounts: Record<string, number>;
  conversionRates?: Record<string, number>;
  performanceImpact?: {
    averageLatency: number;
    errorRate: number;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  flagKey: string;
  hypothesis: string;
  successMetrics: string[];
  trafficAllocation: number; // percentage of users to include
  variations: ABTestVariation[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  results?: ABTestResults;
}

export interface ABTestVariation {
  id: string;
  name: string;
  description: string;
  allocation: number; // percentage of test traffic
  flagValue: FlagValue;
}

export interface ABTestResults {
  totalParticipants: number;
  conversionRates: Record<string, number>;
  statisticalSignificance: number;
  confidenceInterval: Record<string, [number, number]>;
  winner?: string;
  recommendation: string;
}

export class FeatureFlagManager {
  private config: FeatureFlagConfig;
  private flags: Map<string, FeatureFlag> = new Map();
  private cache: Map<string, { value: FlagValue; timestamp: number }> = new Map();
  private evaluationHistory: FlagEvaluation[] = [];
  private abTests: Map<string, ABTestConfig> = new Map();

  constructor(config: FeatureFlagConfig) {
    this.config = config;
    this.initializeFeatureFlags();
  }

  private initializeFeatureFlags(): void {
    console.log('🚩 Initializing Feature Flag Manager...');
    
    // Load initial flags
    this.loadFeatureFlags();
    
    // Start refresh interval
    if (this.config.refreshInterval > 0) {
      setInterval(() => {
        this.refreshFlags();
      }, this.config.refreshInterval * 1000);
    }
    
    // Initialize analytics
    if (this.config.analytics.enabled) {
      this.initializeAnalytics();
    }
    
    console.log(`✅ Feature Flag Manager initialized with ${this.flags.size} flags`);
  }

  /**
   * Evaluate a feature flag for a user
   */
  async evaluateFlag(
    flagKey: string,
    context: UserContext,
    defaultValue?: FlagValue
  ): Promise<FlagEvaluation> {
    const flag = this.flags.get(flagKey);
    
    if (!flag) {
      const evaluation: FlagEvaluation = {
        flagKey,
        value: defaultValue ?? false,
        variation: 'default',
        reason: { kind: 'ERROR', errorKind: 'FLAG_NOT_FOUND' },
        timestamp: new Date(),
        context
      };
      
      this.trackEvaluation(evaluation);
      return evaluation;
    }

    // Check if flag is enabled
    if (!flag.enabled || flag.status !== 'active') {
      const evaluation: FlagEvaluation = {
        flagKey,
        value: flag.defaultValue,
        variation: 'default',
        reason: { kind: 'OFF' },
        timestamp: new Date(),
        context
      };
      
      this.trackEvaluation(evaluation);
      return evaluation;
    }

    // Check cache first
    const cached = this.getCachedValue(flagKey, context);
    if (cached) {
      const evaluation: FlagEvaluation = {
        flagKey,
        value: cached.value,
        variation: 'cached',
        reason: { kind: 'FALLTHROUGH' },
        timestamp: new Date(),
        context
      };
      
      return evaluation;
    }

    // Evaluate targeting rules
    const evaluation = await this.evaluateTargeting(flag, context);
    
    // Cache the result
    this.cacheValue(flagKey, context, evaluation.value);
    
    // Track evaluation
    this.trackEvaluation(evaluation);
    
    return evaluation;
  }

  /**
   * Get boolean flag value
   */
  async getBooleanFlag(
    flagKey: string,
    context: UserContext,
    defaultValue: boolean = false
  ): Promise<boolean> {
    const evaluation = await this.evaluateFlag(flagKey, context, defaultValue);
    return Boolean(evaluation.value);
  }

  /**
   * Get string flag value
   */
  async getStringFlag(
    flagKey: string,
    context: UserContext,
    defaultValue: string = ''
  ): Promise<string> {
    const evaluation = await this.evaluateFlag(flagKey, context, defaultValue);
    return String(evaluation.value);
  }

  /**
   * Get number flag value
   */
  async getNumberFlag(
    flagKey: string,
    context: UserContext,
    defaultValue: number = 0
  ): Promise<number> {
    const evaluation = await this.evaluateFlag(flagKey, context, defaultValue);
    return Number(evaluation.value);
  }

  /**
   * Get JSON flag value
   */
  async getJSONFlag<T = any>(
    flagKey: string,
    context: UserContext,
    defaultValue: T
  ): Promise<T> {
    const evaluation = await this.evaluateFlag(flagKey, context, defaultValue);
    return evaluation.value as T;
  }

  /**
   * Create or update a feature flag
   */
  async setFlag(flag: Partial<FeatureFlag> & { key: string }): Promise<void> {
    const existingFlag = this.flags.get(flag.key);
    
    const updatedFlag: FeatureFlag = {
      key: flag.key,
      name: flag.name || flag.key,
      description: flag.description || '',
      enabled: flag.enabled ?? true,
      type: flag.type || 'boolean',
      defaultValue: flag.defaultValue ?? false,
      variations: flag.variations || [
        { id: 'true', name: 'True', description: 'Flag is on', value: true },
        { id: 'false', name: 'False', description: 'Flag is off', value: false }
      ],
      targeting: flag.targeting || { enabled: false, rules: [], fallthrough: {} },
      rollout: flag.rollout || { type: 'percentage', variations: [] },
      metadata: flag.metadata || {
        owner: 'system',
        team: 'engineering',
        tags: [],
        category: 'feature',
        purpose: 'Feature toggle'
      },
      status: flag.status || 'active',
      createdAt: existingFlag?.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    this.flags.set(flag.key, updatedFlag);
    
    // Clear cache for this flag
    this.clearFlagCache(flag.key);
    
    console.log(`🚩 Flag ${flag.enabled ? 'enabled' : 'disabled'}: ${flag.key}`);
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(flagKey: string): Promise<boolean> {
    const deleted = this.flags.delete(flagKey);
    if (deleted) {
      this.clearFlagCache(flagKey);
      console.log(`🗑️ Flag deleted: ${flagKey}`);
    }
    return deleted;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get flags by category or tag
   */
  getFlagsByFilter(filter: {
    category?: string;
    tag?: string;
    owner?: string;
    status?: FlagStatus;
  }): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => {
      if (filter.category && flag.metadata.category !== filter.category) return false;
      if (filter.tag && !flag.metadata.tags.includes(filter.tag)) return false;
      if (filter.owner && flag.metadata.owner !== filter.owner) return false;
      if (filter.status && flag.status !== filter.status) return false;
      return true;
    });
  }

  /**
   * Create an A/B test
   */
  async createABTest(testConfig: Omit<ABTestConfig, 'id'>): Promise<ABTestConfig> {
    const test: ABTestConfig = {
      id: this.generateTestId(),
      ...testConfig,
      status: 'draft'
    };
    
    this.abTests.set(test.id, test);
    
    // Create corresponding feature flag
    await this.setFlag({
      key: test.flagKey,
      name: `AB Test: ${test.name}`,
      description: test.description,
      type: 'string',
      defaultValue: test.variations[0].flagValue,
      variations: test.variations.map(v => ({
        id: v.id,
        name: v.name,
        description: v.description,
        value: v.flagValue,
        weight: v.allocation
      })),
      targeting: {
        enabled: true,
        rules: [],
        fallthrough: {
          rollout: {
            type: 'percentage',
            variations: test.variations.map(v => ({
              variation: v.id,
              weight: v.allocation
            }))
          }
        }
      },
      metadata: {
        owner: 'product',
        team: 'growth',
        tags: ['ab-test', 'experiment'],
        category: 'experiment',
        purpose: `A/B test: ${test.hypothesis}`
      }
    });
    
    console.log(`🧪 A/B test created: ${test.name} (${test.id})`);
    return test;
  }

  /**
   * Start an A/B test
   */
  async startABTest(testId: string): Promise<boolean> {
    const test = this.abTests.get(testId);
    if (!test) return false;
    
    test.status = 'running';
    test.startDate = new Date();
    
    console.log(`▶️ A/B test started: ${test.name}`);
    return true;
  }

  /**
   * Stop an A/B test
   */
  async stopABTest(testId: string): Promise<boolean> {
    const test = this.abTests.get(testId);
    if (!test) return false;
    
    test.status = 'completed';
    test.endDate = new Date();
    
    // Generate results
    test.results = await this.generateABTestResults(test);
    
    console.log(`⏹️ A/B test completed: ${test.name}`);
    return true;
  }

  /**
   * Get flag analytics
   */
  async getFlagAnalytics(
    flagKey: string,
    timeRange: { start: Date; end: Date }
  ): Promise<FlagAnalytics> {
    const evaluations = this.evaluationHistory.filter(
      e => e.flagKey === flagKey && 
           e.timestamp >= timeRange.start && 
           e.timestamp <= timeRange.end
    );
    
    const uniqueUsers = new Set(evaluations.map(e => e.context.userId).filter(Boolean)).size;
    const variationCounts: Record<string, number> = {};
    
    evaluations.forEach(e => {
      variationCounts[e.variation] = (variationCounts[e.variation] || 0) + 1;
    });
    
    return {
      flagKey,
      evaluations: evaluations.length,
      uniqueUsers,
      variationCounts,
      timeRange
    };
  }

  // Private helper methods
  private async evaluateTargeting(flag: FeatureFlag, context: UserContext): Promise<FlagEvaluation> {
    if (!flag.targeting.enabled) {
      return this.evaluateFallthrough(flag, context);
    }
    
    // Evaluate targeting rules in order
    for (let i = 0; i < flag.targeting.rules.length; i++) {
      const rule = flag.targeting.rules[i];
      
      if (await this.evaluateRule(rule, context)) {
        const variation = flag.variations.find(v => v.id === rule.variation);
        
        return {
          flagKey: flag.key,
          value: variation?.value ?? flag.defaultValue,
          variation: rule.variation,
          reason: { kind: 'RULE_MATCH', ruleIndex: i, ruleId: rule.id },
          timestamp: new Date(),
          context
        };
      }
    }
    
    // No rules matched, use fallthrough
    return this.evaluateFallthrough(flag, context);
  }

  private async evaluateRule(rule: TargetingRule, context: UserContext): Promise<boolean> {
    // All conditions must be true for rule to match
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    
    return true;
  }

  private evaluateCondition(condition: TargetingCondition, context: UserContext): boolean {
    const attributeValue = this.getAttributeValue(condition.attribute, context);
    let result = false;
    
    switch (condition.operator) {
      case 'equals':
        result = condition.values.includes(String(attributeValue));
        break;
      case 'not_equals':
        result = !condition.values.includes(String(attributeValue));
        break;
      case 'contains':
        result = condition.values.some(v => String(attributeValue).includes(v));
        break;
      case 'not_contains':
        result = !condition.values.some(v => String(attributeValue).includes(v));
        break;
      case 'starts_with':
        result = condition.values.some(v => String(attributeValue).startsWith(v));
        break;
      case 'ends_with':
        result = condition.values.some(v => String(attributeValue).endsWith(v));
        break;
      case 'matches_regex':
        result = condition.values.some(v => new RegExp(v).test(String(attributeValue)));
        break;
      case 'in':
        result = condition.values.includes(String(attributeValue));
        break;
      case 'not_in':
        result = !condition.values.includes(String(attributeValue));
        break;
      case 'greater_than':
        result = Number(attributeValue) > Number(condition.values[0]);
        break;
      case 'less_than':
        result = Number(attributeValue) < Number(condition.values[0]);
        break;
      case 'greater_equal':
        result = Number(attributeValue) >= Number(condition.values[0]);
        break;
      case 'less_equal':
        result = Number(attributeValue) <= Number(condition.values[0]);
        break;
      case 'exists':
        result = attributeValue !== undefined && attributeValue !== null;
        break;
      case 'not_exists':
        result = attributeValue === undefined || attributeValue === null;
        break;
    }
    
    return condition.negate ? !result : result;
  }

  private getAttributeValue(attribute: string, context: UserContext): any {
    const attributeMap: Record<string, any> = {
      userId: context.userId,
      sessionId: context.sessionId,
      email: context.email,
      userType: context.userType,
      schoolId: context.schoolId,
      grade: context.grade,
      country: context.country,
      language: context.language,
      deviceType: context.deviceType,
      browser: context.browser,
      ...context.customAttributes
    };
    
    return attributeMap[attribute];
  }

  private async evaluateFallthrough(flag: FeatureFlag, context: UserContext): Promise<FlagEvaluation> {
    const fallthrough = flag.targeting.fallthrough;
    
    if (fallthrough.variation) {
      const variation = flag.variations.find(v => v.id === fallthrough.variation);
      return {
        flagKey: flag.key,
        value: variation?.value ?? flag.defaultValue,
        variation: fallthrough.variation,
        reason: { kind: 'FALLTHROUGH' },
        timestamp: new Date(),
        context
      };
    }
    
    if (fallthrough.rollout) {
      const selectedVariation = this.evaluateRollout(fallthrough.rollout, context);
      const variation = flag.variations.find(v => v.id === selectedVariation);
      
      return {
        flagKey: flag.key,
        value: variation?.value ?? flag.defaultValue,
        variation: selectedVariation,
        reason: { kind: 'FALLTHROUGH' },
        timestamp: new Date(),
        context
      };
    }
    
    // Default fallback
    return {
      flagKey: flag.key,
      value: flag.defaultValue,
      variation: 'default',
      reason: { kind: 'FALLTHROUGH' },
      timestamp: new Date(),
      context
    };
  }

  private evaluateRollout(rollout: RolloutConfig, context: UserContext): string {
    const bucketBy = rollout.bucketBy || 'userId';
    const bucketValue = this.getAttributeValue(bucketBy, context) || 'anonymous';
    
    // Create a hash of the bucket value for consistent bucketing
    const hash = this.hashString(String(bucketValue));
    const bucket = hash % 100000; // 0-99999
    
    let cumulativeWeight = 0;
    for (const variation of rollout.variations) {
      cumulativeWeight += variation.weight;
      if (bucket < (cumulativeWeight * 1000)) { // Convert percentage to 0-99999 scale
        return variation.variation;
      }
    }
    
    // Fallback to first variation
    return rollout.variations[0]?.variation || 'default';
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getCachedValue(flagKey: string, context: UserContext): { value: FlagValue } | null {
    if (!this.config.caching.enabled) return null;
    
    const cacheKey = `${flagKey}:${context.userId || 'anonymous'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < (this.config.caching.ttl * 1000)) {
      return { value: cached.value };
    }
    
    return null;
  }

  private cacheValue(flagKey: string, context: UserContext, value: FlagValue): void {
    if (!this.config.caching.enabled) return;
    
    const cacheKey = `${flagKey}:${context.userId || 'anonymous'}`;
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.caching.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(cacheKey, {
      value,
      timestamp: Date.now()
    });
  }

  private clearFlagCache(flagKey: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${flagKey}:`));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private trackEvaluation(evaluation: FlagEvaluation): void {
    if (!this.config.analytics.trackEvaluations) return;
    
    this.evaluationHistory.push(evaluation);
    
    // Keep only last 10000 evaluations
    if (this.evaluationHistory.length > 10000) {
      this.evaluationHistory.shift();
    }
  }

  private async loadFeatureFlags(): Promise<void> {
    // Load default flags for the Both Sides platform
    await this.loadDefaultFlags();
    
    // In a real implementation, this would load from external provider
    console.log(`📥 Loaded ${this.flags.size} feature flags`);
  }

  private async loadDefaultFlags(): Promise<void> {
    const defaultFlags: Partial<FeatureFlag>[] = [
      {
        key: 'ai_coaching_enabled',
        name: 'AI Coaching',
        description: 'Enable AI-powered coaching during debates',
        type: 'boolean',
        defaultValue: true,
        metadata: {
          owner: 'product',
          team: 'ai',
          tags: ['ai', 'coaching'],
          category: 'feature',
          purpose: 'Enable AI coaching functionality'
        }
      },
      {
        key: 'new_dashboard_enabled',
        name: 'New Dashboard',
        description: 'Enable the new teacher dashboard interface',
        type: 'boolean',
        defaultValue: false,
        metadata: {
          owner: 'product',
          team: 'frontend',
          tags: ['ui', 'dashboard'],
          category: 'feature',
          purpose: 'Gradual rollout of new dashboard'
        }
      },
      {
        key: 'max_debate_participants',
        name: 'Max Debate Participants',
        description: 'Maximum number of participants allowed in a debate',
        type: 'number',
        defaultValue: 4,
        metadata: {
          owner: 'product',
          team: 'backend',
          tags: ['limits', 'performance'],
          category: 'configuration',
          purpose: 'Control debate size for performance'
        }
      },
      {
        key: 'debate_themes',
        name: 'Available Debate Themes',
        description: 'List of available debate themes and topics',
        type: 'json',
        defaultValue: {
          themes: ['education', 'environment', 'technology', 'social-issues'],
          featured: 'technology'
        },
        metadata: {
          owner: 'content',
          team: 'curriculum',
          tags: ['content', 'themes'],
          category: 'configuration',
          purpose: 'Manage available debate content'
        }
      }
    ];
    
    for (const flag of defaultFlags) {
      await this.setFlag(flag as Partial<FeatureFlag> & { key: string });
    }
  }

  private async refreshFlags(): Promise<void> {
    // In a real implementation, this would fetch from external provider
    console.log('🔄 Refreshing feature flags...');
  }

  private initializeAnalytics(): void {
    console.log('📊 Initializing feature flag analytics...');
    
    // Start periodic analytics reporting
    setInterval(() => {
      this.reportAnalytics();
    }, 300000); // Report every 5 minutes
  }

  private reportAnalytics(): void {
    if (this.evaluationHistory.length === 0) return;
    
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    const recentEvaluations = this.evaluationHistory.filter(e => e.timestamp >= last5Minutes);
    
    console.log(`📊 Feature flag evaluations in last 5 minutes: ${recentEvaluations.length}`);
  }

  private async generateABTestResults(test: ABTestConfig): Promise<ABTestResults> {
    // In a real implementation, this would calculate actual statistical results
    const totalParticipants = Math.floor(Math.random() * 1000) + 500;
    const conversionRates: Record<string, number> = {};
    
    test.variations.forEach(variation => {
      conversionRates[variation.id] = Math.random() * 0.3 + 0.1; // 10-40% conversion
    });
    
    return {
      totalParticipants,
      conversionRates,
      statisticalSignificance: 0.95,
      confidenceInterval: {},
      recommendation: 'Continue monitoring for more data'
    };
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    totalFlags: number;
    activeFlags: number;
    cacheSize: number;
    evaluationsToday: number;
    activeTests: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const evaluationsToday = this.evaluationHistory.filter(e => e.timestamp >= today).length;
    const activeTests = Array.from(this.abTests.values()).filter(t => t.status === 'running').length;
    
    return {
      totalFlags: this.flags.size,
      activeFlags: Array.from(this.flags.values()).filter(f => f.enabled && f.status === 'active').length,
      cacheSize: this.cache.size,
      evaluationsToday,
      activeTests
    };
  }
}

// Default production feature flag configuration
export const PRODUCTION_FEATURE_FLAG_CONFIG: FeatureFlagConfig = {
  provider: 'local',
  environment: process.env.NODE_ENV || 'development',
  refreshInterval: 300, // 5 minutes
  fallbackMode: 'conservative',
  caching: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 10000
  },
  analytics: {
    enabled: true,
    trackEvaluations: true,
    trackExposures: true
  },
  targeting: {
    enabled: true,
    rules: []
  }
};

// Export singleton instance
export const featureFlagManager = new FeatureFlagManager(PRODUCTION_FEATURE_FLAG_CONFIG);

export default {
  FeatureFlagManager,
  PRODUCTION_FEATURE_FLAG_CONFIG,
  featureFlagManager
};
