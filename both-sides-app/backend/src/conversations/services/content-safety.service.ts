/**
 * Content Safety Service
 * 
 * COPPA and FERPA compliance, content safety, and incident management
 * Task 5.3.4: Content Safety & Compliance
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../common/services/cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageAnalysisService } from './message-analysis.service';
import {
  SafetyCompliance,
  ContentRetentionPolicy,
  PrivacyProtection,
  IncidentReporting,
  ValidateAgeAppropriateRequest,
  SafetyResult,
  IncidentDetails,
  ReportIncidentRequest,
  IncidentResponse,
  RetentionPolicy,
  AnonymizeUserDataRequest,
  ContentDeletionRequest,
  AuditContentAccessRequest,
  ContentSafetyMetrics,
  ComplianceReportRequest,
  IncidentType,
  IncidentSeverity,
  EscalationLevel,
  RetentionStatus,
} from '../dto/content-safety.dto';

@Injectable()
export class ContentSafetyService {
  private readonly logger = new Logger(ContentSafetyService.name);
  private readonly CACHE_TTL = 3600000; // 1 hour
  private readonly MIN_AGE_FOR_DEBATES = 13; // COPPA compliance
  private readonly RETENTION_DAYS_MINOR = 30; // Shorter retention for minors
  private readonly RETENTION_DAYS_ADULT = 365 * 7; // 7 years for adults

  private safetyCompliance: SafetyCompliance;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
    private readonly messageAnalysisService: MessageAnalysisService,
  ) {
    this.initializeComplianceConfig();
  }

  /**
   * Validate if content is appropriate for user's age (COPPA compliance)
   */
  async validateAgeAppropriate(request: ValidateAgeAppropriateRequest): Promise<SafetyResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Validating age-appropriate content for user age ${request.userAge}`);

      const violations: string[] = [];
      const warnings: string[] = [];
      const suggestedModifications: string[] = [];

      // Check minimum age requirements (COPPA compliance)
      if (request.userAge < this.MIN_AGE_FOR_DEBATES) {
        violations.push('User below minimum age for platform participation');
        return {
          isAppropriate: false,
          confidenceScore: 1.0,
          violations,
          warnings,
          recommendedAction: 'BLOCK_USER_REGISTRATION',
          suggestedModifications,
        };
      }

      // Content analysis for age appropriateness
      const contentAnalysis = await this.analyzeContentForAge(request.content, request.userAge);
      
      // Check for inappropriate content based on age
      const ageAppropriateResult = this.evaluateAgeAppropriateness(
        contentAnalysis,
        request.userAge,
        violations,
        warnings,
        suggestedModifications
      );

      // Personal information detection (COPPA/FERPA compliance)
      const personalInfoViolations = await this.detectPersonalInformation(request.content);
      violations.push(...personalInfoViolations);

      // Educational context validation
      const educationalResult = this.validateEducationalContent(request.content);
      if (!educationalResult.isAppropriate) {
        violations.push(...educationalResult.violations);
        warnings.push(...educationalResult.warnings);
      }

      // Determine overall result
      const isAppropriate = violations.length === 0;
      const confidenceScore = this.calculateConfidenceScore(contentAnalysis, violations.length);
      const recommendedAction = this.determineRecommendedAction(violations, warnings, request.userAge);

      // Log safety check
      await this.auditSafetyCheck(request, isAppropriate, violations, warnings);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Age appropriateness check completed in ${processingTime}ms - Result: ${isAppropriate ? 'PASS' : 'FAIL'}`);

      return {
        isAppropriate,
        confidenceScore,
        violations,
        warnings,
        recommendedAction,
        suggestedModifications,
      };

    } catch (error) {
      this.logger.error('Age appropriateness validation failed', error.stack);
      
      // Fail safe - block content if validation fails
      return {
        isAppropriate: false,
        confidenceScore: 0.0,
        violations: ['Safety validation failed - content blocked for safety'],
        warnings: [],
        recommendedAction: 'BLOCK_CONTENT',
        suggestedModifications: [],
      };
    }
  }

  /**
   * Report and escalate safety incidents
   */
  async reportIncident(request: ReportIncidentRequest): Promise<IncidentResponse> {
    try {
      this.logger.log(`Reporting ${request.details.type} incident with ${request.details.severity} severity`);

      // Create incident record
      const incidentId = this.generateIncidentId();
      const incident = await this.createIncidentRecord(incidentId, request);

      // Determine escalation path
      const escalationPath = this.determineEscalationPath(request.details);
      
      // Execute immediate actions
      await this.executeImmediateActions(request.details);

      // Schedule escalation if required
      if (escalationPath.level !== EscalationLevel.AUTO_HANDLED) {
        await this.scheduleEscalation(incident, escalationPath);
      }

      // Send notifications
      await this.sendIncidentNotifications(incident, escalationPath);

      // Update metrics
      await this.updateSafetyMetrics(request.details.type, request.details.severity);

      this.logger.log(`Incident ${incidentId} created and escalated to ${escalationPath.level}`);

      return {
        incidentId: incident.id,
        type: request.details.type,
        severity: request.details.severity,
        status: 'REPORTED',
        assignedTo: escalationPath.recipients[0] || null,
        reportedAt: incident.createdAt,
        resolvedAt: null,
        resolution: null,
      };

    } catch (error) {
      this.logger.error('Failed to report incident', error.stack);
      throw new HttpException(
        'Failed to report safety incident',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Anonymize user data for privacy compliance
   */
  async anonymizeUserData(request: AnonymizeUserDataRequest): Promise<void> {
    try {
      this.logger.log(`Anonymizing user data for conversation ${request.conversationId}`);

      const conversation = await this.prismaService.conversation.findUnique({
        where: { id: request.conversationId },
        include: {
          messages: true,
          match: {
            include: {
              student1: true,
              student2: true,
            },
          },
        },
      });

      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      // Check if users are minors (enhanced protection)
      const users = [conversation.match.student1, conversation.match.student2];
      const hasMinors = await this.checkForMinors(users.map(u => u.id));

      // Anonymize conversation metadata
      await this.anonymizeConversationData(conversation, request.preserveEducationalValue);

      // Anonymize messages
      for (const message of conversation.messages) {
        await this.anonymizeMessageData(
          message.id,
          request.fieldsToPreserve || [],
          hasMinors
        );
      }

      // Update retention status
      await this.prismaService.conversation.update({
        where: { id: request.conversationId },
        data: {
          conversation_metadata: {
            ...conversation.conversation_metadata as any,
            anonymized: true,
            anonymizedAt: new Date(),
            retentionStatus: RetentionStatus.ANONYMIZED,
          },
        },
      });

      // Audit the anonymization
      await this.auditDataAnonymization(request.conversationId, hasMinors);

      this.logger.log(`Successfully anonymized data for conversation ${request.conversationId}`);

    } catch (error) {
      this.logger.error(`Failed to anonymize data for conversation ${request.conversationId}`, error.stack);
      throw new HttpException(
        'Failed to anonymize user data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Schedule content deletion based on retention policies
   */
  async scheduleContentDeletion(request: ContentDeletionRequest): Promise<void> {
    try {
      this.logger.log(`Scheduling deletion for ${request.contentType} content ${request.contentId}`);

      const deletionDate = request.scheduledFor || this.calculateDeletionDate(request.policy);

      // Create deletion schedule record
      await this.prismaService.contentDeletionSchedule.create({
        data: {
          id: `deletion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: request.contentId,
          contentType: request.contentType,
          policyId: request.policy.policyId,
          scheduledFor: deletionDate,
          reason: request.reason || 'Automated retention policy',
          status: 'SCHEDULED',
          createdAt: new Date(),
        },
      });

      // Update content retention status
      await this.updateContentRetentionStatus(
        request.contentId,
        request.contentType,
        RetentionStatus.SCHEDULED_DELETION
      );

      this.logger.log(`Content deletion scheduled for ${deletionDate.toISOString()}`);

    } catch (error) {
      this.logger.error(`Failed to schedule content deletion for ${request.contentId}`, error.stack);
      throw new HttpException(
        'Failed to schedule content deletion',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Audit content access for compliance tracking
   */
  async auditContentAccess(request: AuditContentAccessRequest): Promise<void> {
    try {
      // Create audit log entry
      await this.prismaService.contentAccessLog.create({
        data: {
          id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: request.userId,
          contentId: request.contentId,
          action: request.action,
          purpose: request.purpose,
          metadata: request.metadata || {},
          accessedAt: new Date(),
          ipAddress: request.metadata?.ipAddress,
          userAgent: request.metadata?.userAgent,
        },
      });

      // Check for suspicious access patterns
      await this.checkAccessPatterns(request.userId, request.contentId, request.action);

    } catch (error) {
      this.logger.error('Failed to audit content access', error.stack);
      // Don't throw - audit failures shouldn't block operations
    }
  }

  /**
   * Generate comprehensive safety metrics report
   */
  async generateSafetyMetrics(timeframe?: { from: Date; to: Date }): Promise<ContentSafetyMetrics> {
    try {
      const whereClause: any = {};
      
      if (timeframe) {
        whereClause.createdAt = {
          gte: timeframe.from,
          lte: timeframe.to,
        };
      }

      // Get safety check statistics
      const safetyChecks = await this.prismaService.safetyCheckLog.findMany({
        where: whereClause,
      });

      const totalScanned = safetyChecks.length;
      const violationsDetected = safetyChecks.filter(check => 
        check.violations && (check.violations as any[]).length > 0
      ).length;

      // Get incident statistics
      const incidents = await this.prismaService.safetyIncident.findMany({
        where: whereClause,
      });

      const incidentsReported = incidents.length;
      const averageResponseTime = this.calculateAverageResponseTime(incidents);

      // Calculate compliance rate
      const complianceRate = totalScanned > 0 ? 
        (totalScanned - violationsDetected) / totalScanned : 1.0;

      return {
        totalScanned,
        violationsDetected,
        falsePositives: 0, // Would be tracked through appeal/review system
        incidentsReported,
        averageResponseTime,
        complianceRate,
        reportPeriod: timeframe?.to || new Date(),
      };

    } catch (error) {
      this.logger.error('Failed to generate safety metrics', error.stack);
      throw new HttpException(
        'Failed to generate safety metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Initialize compliance configuration
   */
  private initializeComplianceConfig(): void {
    this.safetyCompliance = {
      contentRetention: {
        durationDays: this.RETENTION_DAYS_ADULT,
        anonymizationRules: [
          'remove_personal_identifiers',
          'mask_user_names',
          'preserve_educational_content',
          'remove_timestamps',
        ],
        deletionSchedule: '0 2 * * 0', // Weekly at 2 AM Sunday
        exemptions: ['research_approved', 'legal_hold'],
      },
      privacyProtection: {
        minorDataHandling: [
          'enhanced_anonymization',
          'shorter_retention',
          'parental_notification',
          'no_profiling',
        ],
        parentalNotification: true,
        dataExportRestrictions: [
          'no_minor_data_export',
          'approval_required_for_research',
          'anonymize_before_export',
        ],
        minimumAge: this.MIN_AGE_FOR_DEBATES,
      },
      incidentReporting: {
        severityLevels: [
          IncidentSeverity.LOW,
          IncidentSeverity.MEDIUM,
          IncidentSeverity.HIGH,
          IncidentSeverity.CRITICAL,
        ],
        escalationPaths: [
          {
            level: EscalationLevel.AUTO_HANDLED,
            recipients: ['system'],
            timeoutMinutes: 0,
          },
          {
            level: EscalationLevel.MODERATOR_REVIEW,
            recipients: ['moderation_team'],
            timeoutMinutes: 30,
          },
          {
            level: EscalationLevel.ADMIN_REVIEW,
            recipients: ['admin_team'],
            timeoutMinutes: 120,
          },
          {
            level: EscalationLevel.SCHOOL_NOTIFICATION,
            recipients: ['school_administrators'],
            timeoutMinutes: 240,
          },
          {
            level: EscalationLevel.PARENT_NOTIFICATION,
            recipients: ['parent_contacts'],
            timeoutMinutes: 60,
          },
        ],
        responseTimeRequirements: {
          [IncidentSeverity.LOW]: 24 * 60, // 24 hours
          [IncidentSeverity.MEDIUM]: 4 * 60, // 4 hours
          [IncidentSeverity.HIGH]: 60, // 1 hour
          [IncidentSeverity.CRITICAL]: 15, // 15 minutes
        },
      },
    };
  }

  // Private helper methods
  private async analyzeContentForAge(content: string, userAge: number): Promise<any> {
    // Use existing message analysis service with age-specific parameters
    const analysis = await this.messageAnalysisService.analyzeMessage({
      messageId: `temp_${Date.now()}`,
      content,
      userId: 'age_check',
      conversationId: 'age_check',
      context: {
        userAge,
        checkType: 'age_appropriateness',
      },
    });

    return analysis.analysisResults;
  }

  private evaluateAgeAppropriateness(
    analysis: any,
    userAge: number,
    violations: string[],
    warnings: string[],
    suggestions: string[]
  ): { isAppropriate: boolean } {
    // Age-based thresholds
    const toxicityThreshold = userAge < 16 ? 0.3 : 0.5;
    const complexityThreshold = userAge < 14 ? 0.7 : 0.9;

    // Check toxicity for age appropriateness
    if (analysis.toxicity.score > toxicityThreshold) {
      violations.push('Content toxicity inappropriate for user age');
    }

    // Check content complexity
    if (analysis.metadata.readabilityScore > complexityThreshold) {
      warnings.push('Content may be too complex for user age');
      suggestions.push('Consider simplifying language and concepts');
    }

    // Check for mature themes
    if (this.containsMatureThemes(analysis)) {
      violations.push('Content contains themes inappropriate for minors');
    }

    return { isAppropriate: violations.length === 0 };
  }

  private async detectPersonalInformation(content: string): Promise<string[]> {
    const violations: string[] = [];
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b\d{3}-?\d{2}-?\d{4}\b|\b\(\d{3}\)\s?\d{3}-?\d{4}\b/g,
      ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      address: /\b\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        violations.push(`Personal information detected: ${type}`);
      }
    }

    return violations;
  }

  private validateEducationalContent(content: string): { isAppropriate: boolean; violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check for educational relevance
    const educationalKeywords = ['evidence', 'research', 'study', 'analysis', 'argument', 'because'];
    const hasEducationalContent = educationalKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );

    if (!hasEducationalContent && content.length > 100) {
      warnings.push('Content may lack educational substance');
    }

    // Check for off-topic content
    const offTopicIndicators = ['off-topic', 'unrelated', 'random'];
    if (offTopicIndicators.some(indicator => content.toLowerCase().includes(indicator))) {
      violations.push('Content appears to be off-topic for educational debate');
    }

    return {
      isAppropriate: violations.length === 0,
      violations,
      warnings,
    };
  }

  private calculateConfidenceScore(analysis: any, violationCount: number): number {
    const baseScore = 1.0;
    const violationPenalty = violationCount * 0.2;
    const analysisConfidence = analysis?.toxicity?.confidence || 0.8;

    return Math.max(0, Math.min(1, (baseScore - violationPenalty) * analysisConfidence));
  }

  private determineRecommendedAction(violations: string[], warnings: string[], userAge: number): string {
    if (violations.length > 0) {
      return userAge < 16 ? 'BLOCK_AND_NOTIFY_PARENT' : 'BLOCK_CONTENT';
    }
    
    if (warnings.length > 2) {
      return 'PROVIDE_COACHING';
    }

    return 'APPROVE';
  }

  private containsMatureThemes(analysis: any): boolean {
    const matureKeywords = ['violence', 'sexual', 'adult', 'mature', 'explicit'];
    const content = analysis.metadata?.originalContent || '';
    
    return matureKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  private generateIncidentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `incident_${timestamp}_${random}`;
  }

  private async createIncidentRecord(incidentId: string, request: ReportIncidentRequest): Promise<any> {
    return await this.prismaService.safetyIncident.create({
      data: {
        id: incidentId,
        type: request.details.type,
        severity: request.details.severity,
        description: request.details.description,
        messageId: request.details.messageId,
        conversationId: request.details.conversationId,
        userId: request.details.userId,
        reportedBy: request.details.reportedBy || 'system',
        evidence: request.details.evidence || {},
        additionalContext: request.additionalContext,
        status: 'OPEN',
        occurredAt: request.details.occurredAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private determineEscalationPath(details: IncidentDetails): any {
    // Find appropriate escalation path based on severity and type
    const paths = this.safetyCompliance.incidentReporting.escalationPaths;
    
    switch (details.severity) {
      case IncidentSeverity.CRITICAL:
        return paths.find(p => p.level === EscalationLevel.ADMIN_REVIEW) || paths[0];
      case IncidentSeverity.HIGH:
        return paths.find(p => p.level === EscalationLevel.MODERATOR_REVIEW) || paths[0];
      case IncidentSeverity.MEDIUM:
        return paths.find(p => p.level === EscalationLevel.MODERATOR_REVIEW) || paths[0];
      default:
        return paths.find(p => p.level === EscalationLevel.AUTO_HANDLED) || paths[0];
    }
  }

  private async executeImmediateActions(details: IncidentDetails): Promise<void> {
    // Implement immediate actions based on incident type
    switch (details.type) {
      case IncidentType.INAPPROPRIATE_CONTENT:
      case IncidentType.HATE_SPEECH:
      case IncidentType.THREAT:
        if (details.messageId) {
          await this.blockMessageImmediate(details.messageId);
        }
        break;
      
      case IncidentType.PERSONAL_INFO_DISCLOSURE:
        if (details.messageId) {
          await this.redactPersonalInfo(details.messageId);
        }
        break;
    }
  }

  private async scheduleEscalation(incident: any, escalationPath: any): Promise<void> {
    // Schedule escalation according to path timeouts
    const escalationTime = new Date(Date.now() + escalationPath.timeoutMinutes * 60 * 1000);
    
    await this.prismaService.escalationQueue.create({
      data: {
        id: `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        incidentId: incident.id,
        level: escalationPath.level,
        recipients: escalationPath.recipients,
        scheduledFor: escalationTime,
        status: 'SCHEDULED',
        createdAt: new Date(),
      },
    });
  }

  private async sendIncidentNotifications(incident: any, escalationPath: any): Promise<void> {
    // Send notifications to appropriate recipients
    this.logger.log(`Sending incident notifications for ${incident.id} to ${escalationPath.level}`);
    
    // Implementation would integrate with notification service
    // For now, just log the action
  }

  private async updateSafetyMetrics(type: IncidentType, severity: IncidentSeverity): Promise<void> {
    // Update safety metrics counters
    const cacheKey = `safety_metrics_${new Date().toISOString().split('T')[0]}`;
    const metrics = await this.cacheService.get(cacheKey) || { incidents: {} };
    
    const key = `${type}_${severity}`;
    metrics.incidents[key] = (metrics.incidents[key] || 0) + 1;
    
    await this.cacheService.set(cacheKey, metrics, 24 * 60 * 60 * 1000); // 24 hours
  }

  private async checkForMinors(userIds: string[]): Promise<boolean> {
    // Check if any users are under 18 (enhanced protection for minors)
    const users = await this.prismaService.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, created_at: true }, // Age calculation would be more sophisticated
    });

    // Simplified age check - in production would use actual birth dates
    return users.some(user => {
      const accountAge = Date.now() - user.created_at.getTime();
      const ageInYears = accountAge / (1000 * 60 * 60 * 24 * 365);
      return ageInYears < 5; // Assume accounts less than 5 years old may be minors
    });
  }

  private async anonymizeConversationData(conversation: any, preserveEducational: boolean): Promise<void> {
    const anonymizedMetadata = {
      ...conversation.conversation_metadata as any,
      participantNames: ['Participant A', 'Participant B'],
      originalParticipants: null, // Remove identifying info
      anonymized: true,
      anonymizedAt: new Date(),
    };

    if (preserveEducational) {
      // Preserve topic and educational metadata
      anonymizedMetadata.topic = conversation.match?.topic;
      anonymizedMetadata.positions = conversation.match?.positions;
    }

    await this.prismaService.conversation.update({
      where: { id: conversation.id },
      data: { conversation_metadata: anonymizedMetadata },
    });
  }

  private async anonymizeMessageData(messageId: string, fieldsToPreserve: string[], hasMinors: boolean): Promise<void> {
    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
    });

    if (!message) return;

    const anonymizedMetadata = {
      ...message.message_metadata as any,
      originalUserId: null,
      anonymized: true,
      anonymizedAt: new Date(),
    };

    // Enhanced anonymization for minors
    if (hasMinors) {
      anonymizedMetadata.enhancedAnonymization = true;
      // Remove more identifying metadata
    }

    await this.prismaService.message.update({
      where: { id: messageId },
      data: {
        user_id: 'anonymized_user',
        message_metadata: anonymizedMetadata,
      },
    });
  }

  private calculateDeletionDate(policy: RetentionPolicy): Date {
    return new Date(Date.now() + policy.retentionDays * 24 * 60 * 60 * 1000);
  }

  private async updateContentRetentionStatus(contentId: string, contentType: string, status: RetentionStatus): Promise<void> {
    // Update retention status based on content type
    switch (contentType) {
      case 'conversation':
        await this.prismaService.conversation.update({
          where: { id: contentId },
          data: {
            conversation_metadata: {
              retentionStatus: status,
              statusUpdated: new Date(),
            },
          },
        });
        break;
      case 'message':
        await this.prismaService.message.update({
          where: { id: contentId },
          data: {
            message_metadata: {
              retentionStatus: status,
              statusUpdated: new Date(),
            },
          },
        });
        break;
    }
  }

  private async checkAccessPatterns(userId: string, contentId: string, action: string): Promise<void> {
    // Check for suspicious access patterns
    const recentAccesses = await this.prismaService.contentAccessLog.findMany({
      where: {
        userId,
        contentId,
        accessedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentAccesses.length > 100) {
      // Flag suspicious access pattern
      await this.reportIncident({
        details: {
          type: IncidentType.TECHNICAL_VIOLATION,
          severity: IncidentSeverity.MEDIUM,
          description: `Unusual access pattern detected: ${recentAccesses.length} accesses in 24 hours`,
          userId,
        },
      });
    }
  }

  private calculateAverageResponseTime(incidents: any[]): number {
    const resolvedIncidents = incidents.filter(i => i.resolvedAt);
    
    if (resolvedIncidents.length === 0) return 0;

    const totalTime = resolvedIncidents.reduce((sum, incident) => {
      const responseTime = new Date(incident.resolvedAt).getTime() - new Date(incident.createdAt).getTime();
      return sum + responseTime;
    }, 0);

    return totalTime / resolvedIncidents.length / (1000 * 60); // Return in minutes
  }

  private async auditSafetyCheck(request: ValidateAgeAppropriateRequest, result: boolean, violations: string[], warnings: string[]): Promise<void> {
    try {
      await this.prismaService.safetyCheckLog.create({
        data: {
          id: `safety_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: request.messageId || 'unknown',
          userAge: request.userAge,
          isAppropriate: result,
          violations: violations,
          warnings: warnings,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to audit safety check', error.stack);
    }
  }

  private async auditDataAnonymization(conversationId: string, hasMinors: boolean): Promise<void> {
    try {
      await this.prismaService.dataAnonymizationLog.create({
        data: {
          id: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: conversationId,
          contentType: 'conversation',
          hasMinors,
          anonymizedAt: new Date(),
          reason: 'Privacy compliance',
        },
      });
    } catch (error) {
      this.logger.error('Failed to audit data anonymization', error.stack);
    }
  }

  private async blockMessageImmediate(messageId: string): Promise<void> {
    await this.prismaService.message.update({
      where: { id: messageId },
      data: {
        moderation_status: 'BLOCKED',
        message_metadata: {
          moderation: {
            blocked: true,
            reason: 'Safety incident - immediate block',
            blockedAt: new Date(),
          },
        },
      },
    });
  }

  private async redactPersonalInfo(messageId: string): Promise<void> {
    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
    });

    if (!message) return;

    // Redact personal information patterns
    let redactedContent = message.content;
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b\d{3}-?\d{2}-?\d{4}\b|\b\(\d{3}\)\s?\d{3}-?\d{4}\b/g,
      ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    };

    for (const pattern of Object.values(patterns)) {
      redactedContent = redactedContent.replace(pattern, '[REDACTED]');
    }

    await this.prismaService.message.update({
      where: { id: messageId },
      data: {
        content: redactedContent,
        message_metadata: {
          ...message.message_metadata as any,
          redacted: true,
          redactedAt: new Date(),
          originalContent: null, // Remove original content
        },
      },
    });
  }
}
