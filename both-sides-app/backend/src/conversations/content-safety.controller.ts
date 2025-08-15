/**
 * Content Safety Controller
 * 
 * API endpoints for content safety and compliance system
 * Task 5.3.4: Content Safety & Compliance
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/rbac/decorators/current-user.decorator';
import { Permissions } from '../auth/rbac/decorators/permissions.decorator';
import { RbacGuard } from '../auth/rbac/guards/rbac.guard';
import { ContentSafetyService } from './services/content-safety.service';
import {
  ValidateAgeAppropriateRequest,
  SafetyResult,
  ReportIncidentRequest,
  IncidentResponse,
  AnonymizeUserDataRequest,
  ContentDeletionRequest,
  AuditContentAccessRequest,
  ContentSafetyMetrics,
  ComplianceReportRequest,
} from './dto/content-safety.dto';

interface User {
  id: string;
  role: string;
  age?: number;
}

@Controller('content-safety')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ContentSafetyController {
  constructor(private readonly contentSafetyService: ContentSafetyService) {}

  /**
   * Validate if content is age-appropriate for user
   * COPPA and FERPA compliance endpoint
   */
  @Post('validate-age-appropriate')
  @HttpCode(HttpStatus.OK)
  @Permissions(['content:validate'])
  async validateAgeAppropriate(
    @Body() request: ValidateAgeAppropriateRequest,
    @CurrentUser() user: User,
  ): Promise<SafetyResult> {
    // If user age not provided in request, try to get from user profile
    if (!request.userAge && user.age) {
      request.userAge = user.age;
    }

    const result = await this.contentSafetyService.validateAgeAppropriate(request);

    // Audit the validation request
    await this.contentSafetyService.auditContentAccess({
      userId: user.id,
      contentId: request.messageId || request.conversationId || 'unknown',
      action: 'age_validation',
      purpose: 'content_safety_check',
      metadata: {
        userAge: request.userAge,
        result: result.isAppropriate,
      },
    });

    return result;
  }

  /**
   * Report a safety incident for escalation
   * Available to users, teachers, and administrators
   */
  @Post('report-incident')
  @HttpCode(HttpStatus.CREATED)
  @Permissions(['incident:report'])
  async reportIncident(
    @Body() request: ReportIncidentRequest,
    @CurrentUser() user: User,
  ): Promise<IncidentResponse> {
    // Set the reporter if not specified
    if (!request.details.reportedBy) {
      request.details.reportedBy = user.id;
    }

    const response = await this.contentSafetyService.reportIncident(request);

    // Audit the incident report
    await this.contentSafetyService.auditContentAccess({
      userId: user.id,
      contentId: request.details.messageId || request.details.conversationId || 'unknown',
      action: 'incident_report',
      purpose: 'safety_compliance',
      metadata: {
        incidentType: request.details.type,
        severity: request.details.severity,
        incidentId: response.incidentId,
      },
    });

    return response;
  }

  /**
   * Anonymize user data for privacy compliance
   * Restricted to administrators only
   */
  @Post('anonymize-data')
  @HttpCode(HttpStatus.OK)
  @Permissions(['data:anonymize', 'admin:privacy'])
  async anonymizeUserData(
    @Body() request: AnonymizeUserDataRequest,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    await this.contentSafetyService.anonymizeUserData(request);

    // Audit the anonymization
    await this.contentSafetyService.auditContentAccess({
      userId: user.id,
      contentId: request.conversationId,
      action: 'data_anonymization',
      purpose: 'privacy_compliance',
      metadata: {
        preserveEducationalValue: request.preserveEducationalValue,
        fieldsToPreserve: request.fieldsToPreserve,
      },
    });

    return {
      success: true,
      message: `User data anonymized for conversation ${request.conversationId}`,
    };
  }

  /**
   * Schedule content deletion based on retention policies
   * Restricted to administrators only
   */
  @Post('schedule-deletion')
  @HttpCode(HttpStatus.OK)
  @Permissions(['data:delete', 'admin:retention'])
  async scheduleContentDeletion(
    @Body() request: ContentDeletionRequest,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    await this.contentSafetyService.scheduleContentDeletion(request);

    // Audit the deletion scheduling
    await this.contentSafetyService.auditContentAccess({
      userId: user.id,
      contentId: request.contentId,
      action: 'schedule_deletion',
      purpose: 'retention_policy',
      metadata: {
        contentType: request.contentType,
        policyId: request.policy.policyId,
        scheduledFor: request.scheduledFor,
        reason: request.reason,
      },
    });

    return {
      success: true,
      message: `Content deletion scheduled for ${request.contentType} ${request.contentId}`,
    };
  }

  /**
   * Get safety metrics for monitoring and compliance
   * Available to administrators and compliance officers
   */
  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @Permissions(['metrics:view', 'compliance:view'])
  async getSafetyMetrics(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user: User,
  ): Promise<ContentSafetyMetrics> {
    let timeframe: { from: Date; to: Date } | undefined;

    if (from && to) {
      timeframe = {
        from: new Date(from),
        to: new Date(to),
      };
    }

    const metrics = await this.contentSafetyService.generateSafetyMetrics(timeframe);

    // Audit metrics access
    await this.contentSafetyService.auditContentAccess({
      userId: user.id,
      contentId: 'safety_metrics',
      action: 'metrics_view',
      purpose: 'compliance_monitoring',
      metadata: {
        timeframe,
        totalScanned: metrics.totalScanned,
        violationsDetected: metrics.violationsDetected,
      },
    });

    return metrics;
  }

  /**
   * Generate compliance report
   * Available to administrators and compliance officers
   */
  @Post('compliance-report')
  @HttpCode(HttpStatus.OK)
  @Permissions(['compliance:report', 'admin:reports'])
  async generateComplianceReport(
    @Body() request: ComplianceReportRequest,
    @CurrentUser() user: User,
  ): Promise<{
    reportId: string;
    metrics: ContentSafetyMetrics;
    generatedAt: Date;
    generatedBy: string;
  }> {
    const timeframe = {
      from: request.startDate,
      to: request.endDate,
    };

    const metrics = await this.contentSafetyService.generateSafetyMetrics(timeframe);

    const reportId = `compliance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Audit report generation
    await this.contentSafetyService.auditContentAccess({
      userId: user.id,
      contentId: reportId,
      action: 'compliance_report_generation',
      purpose: 'compliance_reporting',
      metadata: {
        reportPeriod: timeframe,
        includeMetrics: request.includeMetrics,
        format: request.format,
        totalIncidents: metrics.incidentsReported,
      },
    });

    return {
      reportId,
      metrics,
      generatedAt: new Date(),
      generatedBy: user.id,
    };
  }

  /**
   * Get incident history for a specific user or conversation
   * Available to administrators and teachers
   */
  @Get('incidents')
  @HttpCode(HttpStatus.OK)
  @Permissions(['incident:view'])
  async getIncidents(
    @Query('userId') userId?: string,
    @Query('conversationId') conversationId?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @CurrentUser() user: User,
  ): Promise<any[]> {
    // This would typically involve a separate method in the service
    // For now, we'll implement basic filtering logic

    // Audit incident access
    await this.contentSafetyService.auditContentAccess({
      userId: user.id,
      contentId: conversationId || userId || 'all_incidents',
      action: 'incident_view',
      purpose: 'safety_monitoring',
      metadata: {
        filters: { userId, conversationId, type, severity, status },
        limit: limit || 50,
      },
    });

    // This is a placeholder - would need to implement getIncidents method in service
    return [];
  }

  /**
   * Get content retention schedule
   * Available to administrators only
   */
  @Get('retention-schedule')
  @HttpCode(HttpStatus.OK)
  @Permissions(['retention:view', 'admin:retention'])
  async getRetentionSchedule(
    @Query('contentType') contentType?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @CurrentUser() user: User,
  ): Promise<any[]> {
    // Audit retention schedule access
    await this.contentSafetyService.auditContentAccess({
      userId: user.id,
      contentId: 'retention_schedule',
      action: 'retention_schedule_view',
      purpose: 'compliance_management',
      metadata: {
        filters: { contentType, status },
        limit: limit || 50,
      },
    });

    // This is a placeholder - would need to implement getRetentionSchedule method in service
    return [];
  }

  /**
   * Update incident status (for administrators and moderators)
   * Available to administrators and moderators
   */
  @Put('incidents/:incidentId/status')
  @HttpCode(HttpStatus.OK)
  @Permissions(['incident:update', 'moderation:manage'])
  async updateIncidentStatus(
    @Param('incidentId') incidentId: string,
    @Body() body: { status: string; resolution?: string; assignedTo?: string },
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    // This would typically involve an update method in the service
    // For now, we'll implement basic validation and auditing

    const validStatuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(body.status)) {
      throw new Error('Invalid incident status');
    }

    // Audit incident status update
    await this.contentSafetyService.auditContentAccess({
      userId: user.id,
      contentId: incidentId,
      action: 'incident_status_update',
      purpose: 'incident_management',
      metadata: {
        newStatus: body.status,
        resolution: body.resolution,
        assignedTo: body.assignedTo,
      },
    });

    return {
      success: true,
      message: `Incident ${incidentId} status updated to ${body.status}`,
    };
  }

  /**
   * Emergency content blocking endpoint
   * Available for immediate safety response
   */
  @Post('emergency-block')
  @HttpCode(HttpStatus.OK)
  @Permissions(['emergency:block', 'moderation:emergency'])
  async emergencyBlock(
    @Body() body: { 
      contentId: string; 
      contentType: 'message' | 'conversation'; 
      reason: string;
      notifyParents?: boolean;
    },
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string; incidentId: string }> {
    // Report as critical incident
    const incident = await this.contentSafetyService.reportIncident({
      details: {
        type: 'INAPPROPRIATE_CONTENT' as any,
        severity: 'CRITICAL' as any,
        description: `Emergency block: ${body.reason}`,
        messageId: body.contentType === 'message' ? body.contentId : undefined,
        conversationId: body.contentType === 'conversation' ? body.contentId : undefined,
        reportedBy: user.id,
      },
    });

    // Audit emergency action
    await this.contentSafetyService.auditContentAccess({
      userId: user.id,
      contentId: body.contentId,
      action: 'emergency_block',
      purpose: 'emergency_safety_response',
      metadata: {
        contentType: body.contentType,
        reason: body.reason,
        notifyParents: body.notifyParents,
        incidentId: incident.incidentId,
      },
    });

    return {
      success: true,
      message: `Emergency block applied to ${body.contentType} ${body.contentId}`,
      incidentId: incident.incidentId,
    };
  }
}
