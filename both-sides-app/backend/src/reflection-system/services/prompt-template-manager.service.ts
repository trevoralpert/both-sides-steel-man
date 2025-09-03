/**
 * Prompt Template Manager Service
 * Handles CRUD operations, versioning, A/B testing, and template analytics
 * for reflection prompt templates
 */

import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IPromptTemplateManager,
  PromptTemplate,
  PromptCategory,
  TemplateFilters,
  ABTestConfiguration,
  ABTestResult,
  VariantResult,
  PromptAnalytics,
  PromptMetrics,
  PromptInsight,
  DateRange,
  QuestionType,
  PromptDifficulty,
  AgeGroup,
  Language
} from '../interfaces/prompt.interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PromptTemplateManagerService implements IPromptTemplateManager {
  private readonly logger = new Logger(PromptTemplateManagerService.name);

  // In-memory cache for active A/B tests
  private activeABTests = new Map<string, ABTestConfiguration>();
  private templateCache = new Map<string, PromptTemplate>();

  constructor(
    private readonly prisma: PrismaService
  ) {
    this.initializeDefaultTemplates();
  }

  // =============================================
  // Template CRUD Operations
  // =============================================

  async getTemplatesByCategory(category: PromptCategory, filters?: TemplateFilters): Promise<PromptTemplate[]> {
    this.logger.log(`Fetching templates for category: ${category}`);

    try {
      // Build filter conditions
      const whereConditions: any = {
        templateType: category,
        isActive: filters?.isActive ?? true
      };

      if (filters?.ageGroup) {
        whereConditions.targetAudience = filters.ageGroup;
      }
      if (filters?.difficulty) {
        whereConditions.difficultyLevel = filters.difficulty;
      }
      if (filters?.questionType) {
        whereConditions.questionType = filters.questionType;
      }
      if (filters?.abTestGroup) {
        whereConditions.metadata = {
          path: ['abTestGroup'],
          equals: filters.abTestGroup
        };
      }

      // Query database (simulate with default templates for now)
      const templates = await this.queryTemplatesFromDatabase(whereConditions);

      // Apply language filtering if specified
      let filteredTemplates = templates;
      if (filters?.language && filters.language !== Language.ENGLISH) {
        filteredTemplates = templates.filter(t => 
          t.promptTextLocalized && t.promptTextLocalized[filters.language]
        );
      }

      this.logger.log(`Found ${filteredTemplates.length} templates for category ${category}`);
      return filteredTemplates;

    } catch (error) {
      this.logger.error(`Failed to get templates by category: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createTemplate(templateData: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptTemplate> {
    this.logger.log(`Creating new template for category: ${templateData.templateType}`);

    try {
      // Validate template data
      await this.validateTemplateData(templateData);

      const template: PromptTemplate = {
        ...templateData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in database
      await this.storeTemplateInDatabase(template);

      // Update cache
      this.templateCache.set(template.id, template);

      this.logger.log(`Created template with ID: ${template.id}`);
      return template;

    } catch (error) {
      this.logger.error(`Failed to create template: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate> {
    this.logger.log(`Updating template: ${id}`);

    try {
      const existingTemplate = await this.getTemplateById(id);
      if (!existingTemplate) {
        throw new NotFoundException(`Template not found: ${id}`);
      }

      // Create new version for significant changes
      const isSignificantChange = this.isSignificantChange(existingTemplate, updates);
      
      let updatedTemplate: PromptTemplate;
      if (isSignificantChange) {
        // Create new version
        updatedTemplate = {
          ...existingTemplate,
          ...updates,
          id: uuidv4(), // New ID for new version
          version: this.incrementVersion(existingTemplate.version),
          updatedAt: new Date()
        };
      } else {
        // Update existing version
        updatedTemplate = {
          ...existingTemplate,
          ...updates,
          updatedAt: new Date()
        };
      }

      await this.storeTemplateInDatabase(updatedTemplate);
      this.templateCache.set(updatedTemplate.id, updatedTemplate);

      this.logger.log(`Updated template: ${updatedTemplate.id}, version: ${updatedTemplate.version}`);
      return updatedTemplate;

    } catch (error) {
      this.logger.error(`Failed to update template: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    this.logger.log(`Deleting template: ${id}`);

    try {
      const template = await this.getTemplateById(id);
      if (!template) {
        throw new NotFoundException(`Template not found: ${id}`);
      }

      // Soft delete - mark as inactive instead of hard delete
      await this.updateTemplate(id, { isActive: false });
      
      // Remove from cache
      this.templateCache.delete(id);

      this.logger.log(`Deleted template: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to delete template: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTemplateVersions(templateId: string): Promise<PromptTemplate[]> {
    this.logger.log(`Getting versions for template: ${templateId}`);

    try {
      // Query all versions of this template
      const versions = await this.queryTemplateVersionsFromDatabase(templateId);
      
      // Sort by version descending (newest first)
      versions.sort((a, b) => this.compareVersions(b.version, a.version));

      this.logger.log(`Found ${versions.length} versions for template ${templateId}`);
      return versions;

    } catch (error) {
      this.logger.error(`Failed to get template versions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async activateTemplate(id: string, version?: string): Promise<PromptTemplate> {
    this.logger.log(`Activating template: ${id}, version: ${version || 'latest'}`);

    try {
      let template: PromptTemplate;
      
      if (version) {
        const versions = await this.getTemplateVersions(id);
        template = versions.find(v => v.version === version);
        if (!template) {
          throw new NotFoundException(`Template version not found: ${id}@${version}`);
        }
      } else {
        template = await this.getTemplateById(id);
        if (!template) {
          throw new NotFoundException(`Template not found: ${id}`);
        }
      }

      // Activate the template
      const activatedTemplate = await this.updateTemplate(template.id, { isActive: true });

      this.logger.log(`Activated template: ${activatedTemplate.id}`);
      return activatedTemplate;

    } catch (error) {
      this.logger.error(`Failed to activate template: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // A/B Testing Functionality
  // =============================================

  async runABTest(testConfig: ABTestConfiguration): Promise<ABTestResult> {
    this.logger.log(`Starting A/B test: ${testConfig.testName}`);

    try {
      // Validate test configuration
      this.validateABTestConfiguration(testConfig);

      // Store test configuration
      this.activeABTests.set(testConfig.testName, testConfig);

      // Initialize test tracking
      await this.initializeABTestTracking(testConfig);

      // Set up test variants with proper traffic splitting
      await this.setupABTestVariants(testConfig);

      this.logger.log(`A/B test started: ${testConfig.testName}`);

      // Return initial result (actual results will be collected over time)
      return {
        testName: testConfig.testName,
        variants: this.initializeVariantResults(testConfig),
        confidence: 0,
        recommendation: 'Test is running, results will be available after sufficient data collection'
      };

    } catch (error) {
      this.logger.error(`Failed to run A/B test: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getABTestResults(testName: string): Promise<ABTestResult> {
    this.logger.log(`Getting A/B test results: ${testName}`);

    try {
      const testConfig = this.activeABTests.get(testName);
      if (!testConfig) {
        throw new NotFoundException(`A/B test not found: ${testName}`);
      }

      // Collect results from tracking data
      const variantResults = await this.collectABTestResults(testConfig);

      // Calculate statistical significance
      const { winner, confidence } = this.calculateStatisticalSignificance(variantResults);

      // Generate recommendations
      const recommendation = this.generateABTestRecommendation(variantResults, winner, confidence);

      return {
        testName,
        variants: variantResults,
        winner,
        confidence,
        recommendation
      };

    } catch (error) {
      this.logger.error(`Failed to get A/B test results: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Analytics and Insights
  // =============================================

  async getTemplateAnalytics(templateId: string, period: DateRange): Promise<PromptAnalytics> {
    this.logger.log(`Getting analytics for template: ${templateId}`);

    try {
      // Collect metrics data
      const metrics = await this.collectTemplateMetrics(templateId, period);

      // Generate insights
      const insights = await this.generateTemplateInsights(templateId, metrics);

      // Create recommendations
      const recommendations = await this.generateTemplateRecommendations(insights);

      return {
        templateId,
        period,
        metrics,
        insights,
        recommendations
      };

    } catch (error) {
      this.logger.error(`Failed to get template analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================
  // Private Helper Methods
  // =============================================

  private async initializeDefaultTemplates(): Promise<void> {
    this.logger.log('Initializing default prompt templates');

    // Create default templates for each category
    const defaultTemplates = this.createDefaultTemplates();
    
    for (const template of defaultTemplates) {
      this.templateCache.set(template.id, template);
    }

    this.logger.log(`Initialized ${defaultTemplates.length} default templates`);
  }

  private createDefaultTemplates(): PromptTemplate[] {
    const now = new Date();
    
    return [
      // General Reflection Templates
      {
        id: 'general-reflection-basic',
        templateType: PromptCategory.GENERAL_REFLECTION,
        questionType: QuestionType.OPEN_ENDED,
        promptText: 'How do you feel about your performance in today\'s debate? What stood out to you most?',
        promptTextLocalized: {
          [Language.SPANISH]: '¿Cómo te sientes acerca de tu desempeño en el debate de hoy? ¿Qué fue lo que más te llamó la atención?',
          [Language.FRENCH]: 'Comment vous sentez-vous par rapport à votre performance dans le débat d\'aujourd\'hui? Qu\'est-ce qui vous a le plus marqué?'
        },
        targetAudience: AgeGroup.MIDDLE_SCHOOL,
        difficultyLevel: PromptDifficulty.BEGINNER,
        isActive: true,
        version: '1.0.0',
        metadata: {
          estimatedTimeMinutes: 5,
          skillFocus: ['self-awareness', 'reflection'],
          accessibilityFeatures: [
            { type: 'screen_reader', enabled: true },
            { type: 'simplified_language', enabled: true }
          ]
        },
        createdAt: now,
        updatedAt: now
      },
      
      // Argument Quality Templates
      {
        id: 'argument-quality-evidence',
        templateType: PromptCategory.ARGUMENT_QUALITY,
        questionType: QuestionType.RATING_SCALE,
        promptText: 'On a scale of 1-10, how well do you think you supported your arguments with evidence? Please explain your rating.',
        targetAudience: AgeGroup.HIGH_SCHOOL,
        difficultyLevel: PromptDifficulty.INTERMEDIATE,
        isActive: true,
        version: '1.0.0',
        metadata: {
          estimatedTimeMinutes: 7,
          skillFocus: ['evidence-evaluation', 'self-assessment'],
          adaptationRules: [
            {
              condition: 'rating < 5',
              action: 'add_followup',
              parameter: 'evidence-improvement-tips'
            }
          ]
        },
        createdAt: now,
        updatedAt: now
      },

      // Listening Skills Templates
      {
        id: 'listening-skills-comprehension',
        templateType: PromptCategory.LISTENING_SKILLS,
        questionType: QuestionType.MULTIPLE_CHOICE,
        promptText: 'Which of the following best describes how well you understood your opponent\'s main arguments?',
        targetAudience: AgeGroup.MIDDLE_SCHOOL,
        difficultyLevel: PromptDifficulty.BEGINNER,
        isActive: true,
        version: '1.0.0',
        metadata: {
          estimatedTimeMinutes: 3,
          skillFocus: ['active-listening', 'comprehension'],
          successMetrics: ['completion_rate', 'accuracy']
        },
        createdAt: now,
        updatedAt: now
      },

      // Perspective Taking Templates
      {
        id: 'perspective-taking-empathy',
        templateType: PromptCategory.PERSPECTIVE_TAKING,
        questionType: QuestionType.OPEN_ENDED,
        promptText: 'Can you think of one reason why someone might genuinely hold the opposite view from yours? Describe it with empathy.',
        targetAudience: AgeGroup.HIGH_SCHOOL,
        difficultyLevel: PromptDifficulty.ADVANCED,
        isActive: true,
        version: '1.0.0',
        metadata: {
          estimatedTimeMinutes: 10,
          skillFocus: ['empathy', 'perspective-taking', 'critical-thinking'],
          prerequisites: ['basic-argument-understanding']
        },
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  private async validateTemplateData(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!template.promptText || template.promptText.trim().length === 0) {
      throw new Error('Prompt text is required');
    }

    if (!template.metadata?.estimatedTimeMinutes || template.metadata.estimatedTimeMinutes <= 0) {
      throw new Error('Estimated time must be greater than 0');
    }

    if (template.targetAudience === AgeGroup.ELEMENTARY && template.difficultyLevel === PromptDifficulty.EXPERT) {
      throw new Error('Expert difficulty is not appropriate for elementary age group');
    }
  }

  private async queryTemplatesFromDatabase(whereConditions: any): Promise<PromptTemplate[]> {
    // For now, return from cache/defaults
    // TODO: Implement actual database query
    const allTemplates = Array.from(this.templateCache.values());
    
    return allTemplates.filter(template => {
      if (whereConditions.templateType && template.templateType !== whereConditions.templateType) {
        return false;
      }
      if (whereConditions.isActive !== undefined && template.isActive !== whereConditions.isActive) {
        return false;
      }
      if (whereConditions.targetAudience && template.targetAudience !== whereConditions.targetAudience) {
        return false;
      }
      if (whereConditions.difficultyLevel && template.difficultyLevel !== whereConditions.difficultyLevel) {
        return false;
      }
      if (whereConditions.questionType && template.questionType !== whereConditions.questionType) {
        return false;
      }
      return true;
    });
  }

  private async storeTemplateInDatabase(template: PromptTemplate): Promise<void> {
    // TODO: Implement actual database storage
    this.logger.debug(`Storing template in database: ${template.id}`);
  }

  private async getTemplateById(id: string): Promise<PromptTemplate | null> {
    return this.templateCache.get(id) || null;
  }

  private isSignificantChange(existing: PromptTemplate, updates: Partial<PromptTemplate>): boolean {
    // Determine if changes warrant a new version
    const significantFields = ['promptText', 'questionType', 'metadata'];
    return significantFields.some(field => updates[field] && updates[field] !== existing[field]);
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1; // Increment patch version
    return parts.join('.');
  }

  private async queryTemplateVersionsFromDatabase(templateId: string): Promise<PromptTemplate[]> {
    // TODO: Implement actual database query for versions
    const template = this.templateCache.get(templateId);
    return template ? [template] : [];
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      if (part1 !== part2) {
        return part1 - part2;
      }
    }
    return 0;
  }

  private validateABTestConfiguration(config: ABTestConfiguration): void {
    if (config.variants.length < 2) {
      throw new Error('A/B test must have at least 2 variants');
    }

    const totalTraffic = Object.values(config.trafficSplit).reduce((sum, split) => sum + split, 0);
    if (Math.abs(totalTraffic - 1.0) > 0.01) {
      throw new Error('Traffic split must sum to 1.0');
    }
  }

  private async initializeABTestTracking(config: ABTestConfiguration): Promise<void> {
    // TODO: Set up tracking infrastructure for A/B test
    this.logger.debug(`Initializing tracking for A/B test: ${config.testName}`);
  }

  private async setupABTestVariants(config: ABTestConfiguration): Promise<void> {
    // TODO: Configure variants for A/B testing
    this.logger.debug(`Setting up variants for A/B test: ${config.testName}`);
  }

  private initializeVariantResults(config: ABTestConfiguration): Record<string, VariantResult> {
    const results: Record<string, VariantResult> = {};
    
    config.variants.forEach((variant, index) => {
      results[`variant_${index}`] = {
        templateId: variant.id,
        exposures: 0,
        conversions: 0,
        conversionRate: 0,
        averageEngagement: 0,
        qualityScore: 0
      };
    });

    return results;
  }

  private async collectABTestResults(config: ABTestConfiguration): Promise<Record<string, VariantResult>> {
    // TODO: Collect actual results from tracking data
    return this.initializeVariantResults(config);
  }

  private calculateStatisticalSignificance(variants: Record<string, VariantResult>): { winner?: string; confidence: number } {
    // TODO: Implement statistical significance calculation
    return { confidence: 0 };
  }

  private generateABTestRecommendation(variants: Record<string, VariantResult>, winner?: string, confidence?: number): string {
    if (!winner || confidence < 0.95) {
      return 'Continue test until statistical significance is achieved';
    }
    return `Implement ${winner} as the winning variant with ${(confidence * 100).toFixed(1)}% confidence`;
  }

  private async collectTemplateMetrics(templateId: string, period: DateRange): Promise<PromptMetrics> {
    // TODO: Implement actual metrics collection
    return {
      totalExposures: 0,
      completionRate: 0,
      averageResponseTime: 0,
      engagementScore: 0,
      qualityScore: 0,
      skipRate: 0,
      adaptationTriggers: {}
    };
  }

  private async generateTemplateInsights(templateId: string, metrics: PromptMetrics): Promise<PromptInsight[]> {
    // TODO: Implement insights generation
    return [];
  }

  private async generateTemplateRecommendations(insights: PromptInsight[]): Promise<string[]> {
    // TODO: Generate actionable recommendations
    return [];
  }
}
